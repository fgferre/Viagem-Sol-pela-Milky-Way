// ============================================================
// A Via Láctea — modelo 3D galactocêntrico real: bojo + barra,
// 4 braços espirais logarítmicos, regiões HII, halo e poeira.
// O Sol fica na borda interna do braço de Perseu (esporão de
// Órion), a 8,15 kpc do centro — coordenadas reais convertidas
// para o referencial heliocêntrico equatorial da cena local.
// ============================================================
import * as THREE from 'three';
import {
  GALAXY_VERT,
  GALAXY_FRAG,
  GALAXY_DUST_FRAG,
  GALAXY_DUST_SCATTER_FRAG,
  GLOW_VERT,
  GLOW_FRAG,
  DISC_VERT,
  DISC_FRAG,
  DISC_BAKE_VERT,
  DISC_BAKED_FRAG,
} from '../shaders/galaxyShaders';
import {
  GALACTIC_MODEL,
  LOCAL_ARM,
  ALL_ARMS,
  armActivityAtRadius,
  armThetaAtRadius,
  armWidthPc,
  flareAtRadius,
  localArmThetaAtRadius,
  warpHeightPc,
} from '../cartography/galacticModel';

// ---- Geometria galáctica real no referencial da cena (pc) ----
export const GAL = {
  /** direção Sol → centro galáctico (Sgr A*, equatorial) */
  DIR_GC: new THREE.Vector3(-0.0548755604, -0.8734370902, -0.4838350155),
  /** polo galáctico norte (equatorial) */
  NGP: new THREE.Vector3(-0.867666149, -0.1980763734, 0.4559837762),
  /** distância Sol → centro (pc) */
  R_SUN: GALACTIC_MODEL.sunRadiusPc,
  /** raio do disco estelar procedural (pc) */
  DISK_RADIUS: GALACTIC_MODEL.diskRadiusPc,
  /** posição do centro galáctico na cena */
  GC_POS: new THREE.Vector3(),
};
GAL.GC_POS
  .copy(GAL.DIR_GC)
  .multiplyScalar(GAL.R_SUN)
  .addScaledVector(GAL.NGP, -GALACTIC_MODEL.sunHeightPc);

// base galactocêntrica: X aponta do centro para o Sol, Z é o polo norte.
// Exportada porque é o ÚNICO caminho válido binário→cena: os ativos de
// public/data/galaxy usam exatamente esta base (+Y → l=270°).
export const EZ = GAL.NGP.clone().normalize();
export const EX = GAL.DIR_GC.clone().negate().addScaledVector(EZ, GAL.DIR_GC.dot(EZ)).normalize();
export const EY = new THREE.Vector3().crossVectors(EZ, EX).normalize();

/** Converte coordenadas galactocêntricas do projeto (pc) para a cena. */
export function galactocentricToScene(
  lx: number,
  ly: number,
  lz: number,
  out: THREE.Vector3
): THREE.Vector3 {
  return out.set(
    GAL.GC_POS.x + EX.x * lx + EY.x * ly + EZ.x * lz,
    GAL.GC_POS.y + EX.y * lx + EY.y * ly + EZ.y * lz,
    GAL.GC_POS.z + EX.z * lx + EY.z * ly + EZ.z * lz
  );
}

const SGR_L = THREE.MathUtils.degToRad(5.6);
const SGR_B = THREE.MathUtils.degToRad(-14.2);
// direção heliocêntrica de (l, b): +EY aponta para l=270°, logo o
// coeficiente de EY é NEGATIVO — mesma convenção do builder dos
// binários (galactic.mjs: y = −d·cos b·sin l).
const SGR_DIR = EX.clone()
  .multiplyScalar(-Math.cos(SGR_B) * Math.cos(SGR_L))
  .addScaledVector(EY, -Math.cos(SGR_B) * Math.sin(SGR_L))
  .addScaledVector(EZ, Math.sin(SGR_B))
  .normalize();
const SGR_DWARF_POS = SGR_DIR.clone().multiplyScalar(26_000);

function localToWorld(lx: number, ly: number, lz: number, out: Float32Array, o: number) {
  out[o] = GAL.GC_POS.x + EX.x * lx + EY.x * ly + EZ.x * lz;
  out[o + 1] = GAL.GC_POS.y + EX.y * lx + EY.y * ly + EZ.y * lz;
  out[o + 2] = GAL.GC_POS.z + EX.z * lx + EY.z * ly + EZ.z * lz;
}

// RNG determinístico — a galáxia é idêntica em toda visita
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd: () => number) {
  return (rnd() + rnd() + rnd() - 1.5) * 0.8165; // ~N(0, 1/2²) prático
}

interface GalaxyBuffers {
  bright: Float32Array; // stride 8: x,y,z,r,g,b,size,alpha
  brightCount: number;
  dust: Float32Array; // stride 8
  dustCount: number;
}

/** Campos CPU iguais aos usados no bake emissivo do disco. */
interface StructureField {
  gasResponse: Float32Array;
  gasSupport: Float32Array;
  youngResponse: Float32Array;
  youngSupport: Float32Array;
  size: number;
  halfExtentPc: number;
}

export function buildGalaxy(
  seed = 20260730,
  structure?: StructureField,
  /**
   * Fração da população do disco. 1 = cinema/alta. O buffer de 2,6 M
   * partículas custa 83 MB e uma passada de vértices por frame; em
   * `performance` (mobile) isso não cabe. Decidido no build e não muda
   * com troca de qualidade em runtime — regerar 2,6 M no meio da viagem
   * seria pior que a diferença visual.
   */
  populationScale = 1
): GalaxyBuffers {
  const rnd = mulberry32(seed);
  const sampleAt = (
    field: Float32Array | undefined,
    lx: number,
    ly: number
  ): number => {
    if (!structure || !field) return 0;
    const s = structure.size;
    const ix = Math.floor((lx / (2 * structure.halfExtentPc) + 0.5) * s);
    const iy = Math.floor((ly / (2 * structure.halfExtentPc) + 0.5) * s);
    if (ix < 0 || ix >= s || iy < 0 || iy >= s) return 0;
    return field[iy * s + ix];
  };
  const gasSupportAt = (lx: number, ly: number) =>
    sampleAt(structure?.gasSupport, lx, ly);
  const gasResponseAt = (lx: number, ly: number) =>
    sampleAt(structure?.gasResponse, lx, ly);
  const youngResponseAt = (lx: number, ly: number) =>
    sampleAt(structure?.youngResponse, lx, ly);
  const youngSupportAt = (lx: number, ly: number) =>
    sampleAt(structure?.youngSupport, lx, ly);
  const effectiveYoungResponseAt = (lx: number, ly: number) => {
    const support = youngSupportAt(lx, ly);
    const gasSupport = gasSupportAt(lx, ly);
    const young = youngResponseAt(lx, ly) * (0.55 + support * 0.45);
    const gasDerived =
      gasResponseAt(lx, ly) * (0.24 + gasSupport * 0.34);
    return Math.max(young, gasDerived);
  };

  // A granulação é a assinatura do alvo: um mar de pontos sub-pixel, não
  // uma névoa analítica. 170k davam ~0,2 ponto/px² no disco de 1000 px.
  const N_DISK = Math.round(2_600_000 * populationScale);
  const N_BULGE = 85000;
  const N_LOCAL = 14000;
  // Preenchimento inferido só completa o lado sem catálogo. O layer
  // observado já contém 1.413 regiões WISE; milhares de nós sintéticos
  // desenhavam os braços como pontilhados perfeitamente contínuos.
  // O alvo mostra centenas de nós H II vermelhos ao longo dos braços; com
  // 900 sujeitos a um peso que os apagava, sobrava nenhum visível.
  const N_HII = 9000;
  const N_HALO = 5000;
  const N_SAGITTARIUS_DWARF = 6500;
  // A poeira do alvo é uma REDE de muitas nuvens pequenas somando coluna,
  // não poucas nuvens escuras. Com 200k sobre 16 kpc de disco a cobertura
  // é rala, e subir τ escurece em vez de adensar. 600k com τ menor em
  // cada dá a mesma extinção total com cobertura 3× maior.
  const N_DUST = Math.round(430_000 * populationScale);

  const brightCount =
    N_DISK + N_LOCAL + N_BULGE + N_HII + N_HALO + N_SAGITTARIUS_DWARF;
  const bright = new Float32Array(brightCount * 8);
  const dust = new Float32Array(N_DUST * 8);
  let b = 0;

  // Sorteio de braço proporcional à ÁREA do segmento (extensão radial ×
  // raio médio). Com sorteio uniforme os braços de 3 kpc — curtos e
  // internos — recebiam 1/6 de toda a poeira dentro de um anel minúsculo
  // e apareciam como arcos pretos sólidos em vez de faixas.
  const armArea = ALL_ARMS.map(
    (a) =>
      (a.maxRadiusPc - a.minRadiusPc) * (a.maxRadiusPc + a.minRadiusPc) * 0.5
  );
  const armAreaTotal = armArea.reduce((s, v) => s + v, 0);
  const pickArm = () => {
    let t = rnd() * armAreaTotal;
    for (let i = 0; i < armArea.length; i++) {
      t -= armArea[i];
      if (t <= 0) return i;
    }
    return armArea.length - 1;
  };

  const put = (
    lx: number, ly: number, lz: number,
    cr: number, cg: number, cb: number,
    size: number, alpha: number
  ) => {
    const o = b * 8;
    localToWorld(lx, ly, lz, bright, o);
    bright[o + 3] = cr;
    bright[o + 4] = cg;
    bright[o + 5] = cb;
    bright[o + 6] = size;
    bright[o + 7] = alpha;
    b++;
  };

  // ---- disco fino com braços ----
  // Estrelas não são sorteio uniforme: nascem em complexos e os complexos
  // se agrupam. Sem isso o disco é um creme liso — a granulação medida
  // ficava em 0,048 contra 0,075 do alvo, e AUMENTAR a contagem só alisava
  // mais. As N_SEED primeiras partículas viram sementes; o resto se
  // aglutina em volta delas, mantendo a mesma distribuição ρ(R,θ).
  const N_SEED = Math.round(9_000 * populationScale);
  const seedX = new Float32Array(N_SEED);
  const seedY = new Float32Array(N_SEED);
  const seedZ = new Float32Array(N_SEED);
  const seedR = new Float32Array(N_SEED);
  let seedCount = 0;
  for (let i = 0; i < N_DISK; i++) {
    // Disco exponencial (Rd ≈ 2,6 kpc) truncado sem acumular uma
    // borda artificial. O raio de 16,8 kpc inclui a revisão de 2026
    // que desloca os braços externos cerca de 10% para fora.
    // Em uma superfície exponencial Σ∝e^(-R/Rd), a distribuição
    // radial é R·e^(-R/Rd): uma Gamma(k=2). Isso preenche o disco
    // inteiro em vez de colapsar quase todas as estrelas no núcleo.
    let r = 0;
    do {
      r =
        -GALACTIC_MODEL.stellarScaleLengthPc *
        Math.log(Math.max(rnd() * rnd(), 1e-7));
    } while (r > GALACTIC_MODEL.diskRadiusPc);
    const k = pickArm();
    const arm = ALL_ARMS[k];
    const activity = armActivityAtRadius(r, arm);
    const inArm = rnd() < 0.40 * activity;
    const sigmaPerp = armWidthPc(r);
    // 2,8σ deixava a população estelar 2× mais estreita que o braço das
    // lâminas: uma fita brilhante dentro de um brilho largo. No alvo o
    // braço estelar é largo e a fenda de poeira é que é fina.
    const theta = inArm
      ? armThetaAtRadius(r, arm) +
        (gauss(rnd) * sigmaPerp * 11.0) / Math.max(r, 180)
      : rnd() * Math.PI * 2;
    const flare = flareAtRadius(r);
    // A população jovem começa em σz≈20 pc; a velha produz o
    // componente fino de ~200 pc e ambos abrem no disco externo.
    const hz = inArm ? 50 + flare * 210 : 510 + flare * 670;
    let lx = r * Math.cos(theta);
    let ly = r * Math.sin(theta);
    let lz = warpHeightPc(r, theta) + gauss(rnd) * hz;

    if (seedCount < N_SEED) {
      seedX[seedCount] = lx;
      seedY[seedCount] = ly;
      seedZ[seedCount] = lz;
      seedR[seedCount] = r;
      seedCount++;
    } else if (rnd() < 0.72) {
      // Complexo: σ 120 pc–1 kpc, a escala das associações OB, das nuvens
      // gigantes e dos complexos que o alvo mostra como manchas. Com σ até
      // 420 pc as nuvens ficavam abaixo da resolução do quadro externo.
      // A semente já está distribuída por ρ, então aglutinar em volta dela
      // não desloca o perfil radial nem o desenho dos braços.
      const s = (rnd() * seedCount) | 0;
      const sigma = 120 + rnd() * rnd() * 900;
      lx = seedX[s] + gauss(rnd) * sigma;
      ly = seedY[s] + gauss(rnd) * sigma;
      lz = seedZ[s] + gauss(rnd) * sigma * 0.45;
      r = seedR[s];
    }

    // Gradiente de população: a cor medida do alvo vai de (R−B)/(R+B)
    // ≈ +0,35 no disco interno a ≈ −0,05 na borda. Com 25% de azuis em
    // TODO raio a nossa curva ficava chapada em +0,14. A fração jovem
    // cresce para fora, como o gradiente de idade/metalicidade real.
    const outward = Math.min(1, Math.max(0, (r - 3_000) / 7_500));
    const p = rnd();
    let cr: number, cg: number, cb: number;
    // O disco externo do alvo é um halo azul-lavanda nítido, e a nossa
    // borda saía cinza-escura. Fisicamente o disco externo é mais JOVEM
    // e tem razão luz/massa maior: mais fração azul e mais brilho por
    // partícula, com a massa ainda seguindo Rd = 2,6 kpc.
    if (p < 0.07 + 0.55 * outward) [cr, cg, cb] = [0.72, 0.83, 1.0];
    else if (p < 0.80) [cr, cg, cb] = [0.96, 0.89, 0.82];
    else [cr, cg, cb] = [1.0, 0.66, 0.45];
    if (inArm) {
      cr = cr * 0.82 + arm.tint[0] * 0.18;
      cg = cg * 0.82 + arm.tint[1] * 0.18;
      cb = cb * 0.76 + arm.tint[2] * 0.24;
    }
    // Função de luminosidade em lei de potência. Todas as partículas com
    // brilho parecido dão um creme liso: a granulação medida ficava em
    // 0,051 contra 0,075 do alvo, e MAIS partículas só alisavam mais. O
    // alvo é um mar de pontos fracos com algumas estrelas resolvidas.
    // u^-0.55 tem média 2,22; dividir por ela conserva o fluxo total.
    const lum = Math.min(7, Math.pow(Math.max(rnd(), 1e-4), -0.42)) / 1.72;
    const dim = 0.35 + 0.65 * rnd() * rnd();
    const youngResponse = effectiveYoungResponseAt(lx, ly);
    // O braço tem de ser MAIS brilhante que o interbraço — mas por pouco.
    // Com (0.16 + young·0.58) contra 0.72 fixo a partícula de braço saía
    // entre 0,19× e 0,89× do campo: o desenho espiral apagado. Com 0.14
    // no interbraço ia ao outro extremo (contraste medido 10–44 contra
    // 2–4 do alvo). O catálogo modula dentro do braço, não o cria.
    const armWeight = inArm
      ? (arm.renderWeight ?? arm.weight) * (0.72 + youngResponse * 0.38)
      : 0.70;
    put(
      lx, ly, lz,
      cr * dim, cg * dim, cb * dim,
      4 + rnd() * 16,
      // (1 + 1.2·outward): as partículas seguem Rd = 2,6 kpc (massa), mas
      // o perfil de LUZ do alvo é mais raso — o disco externo é mais jovem
      // e brilha mais por unidade de massa. Mesmo gradiente que já governa
      // a cor; sem ele o meio do disco saía 25% escuro demais.
      // /populationScale: menos partículas, cada uma mais forte — o fluxo
      // total do disco não pode depender do preset de qualidade
      (0.094 / populationScale) * lum * armWeight * (1 + 2.1 * outward)
    );
  }

  // ---- Esporão Local / braço de Órion -----------------------
  // É um segmento próprio, não um dos quatro braços principais.
  // O Sol fica junto à sua borda interna, como nas cartografias
  // WISE e maser-parallax.
  for (let i = 0; i < N_LOCAL; i++) {
    const r = THREE.MathUtils.lerp(
      LOCAL_ARM.minRadiusPc,
      LOCAL_ARM.maxRadiusPc,
      rnd()
    );
    const theta =
      localArmThetaAtRadius(r) +
      (gauss(rnd) * armWidthPc(r) * 1.35) / r;
    const flare = flareAtRadius(r);
    const lx = r * Math.cos(theta);
    const ly = r * Math.sin(theta);
    const lz =
      warpHeightPc(r, theta) + gauss(rnd) * (48 + flare * 100);
    const dim = 0.4 + 0.6 * rnd() * rnd();
    put(
      lx,
      ly,
      lz,
      0.70 * dim,
      0.80 * dim,
      1.0 * dim,
      4 + rnd() * 15,
      (0.045 + rnd() * 0.105) *
        LOCAL_ARM.weight *
        (0.62 + effectiveYoungResponseAt(lx, ly) * 0.38)
    );
  }

  // ---- bojo + barra longa, inclinada ~29° ------------------
  const barAng = GALACTIC_MODEL.barAngleRad;
  const cosB = Math.cos(barAng);
  const sinB = Math.sin(barAng);
  for (let i = 0; i < N_BULGE; i++) {
    let lx: number;
    let ly: number;
    let lz: number;
    if (rnd() < 0.74) {
      const sign = rnd() < 0.5 ? -1 : 1;
      // O ramo 0.72 empurrava um quarto das partículas para as pontas da
      // barra a 5 kpc, engordando o bojo medido. A barra existe, mas a
      // massa mora perto do centro.
      const along =
        GALACTIC_MODEL.barHalfLengthPc *
        Math.pow(rnd(), rnd() < 0.72 ? 1.9 : 1.05);
      lx = sign * along;
      const end = Math.abs(lx) / GALACTIC_MODEL.barHalfLengthPc;
      ly = gauss(rnd) * (730 - end * 310);
      // Espessura box/peanut: dois lobos verticais fora do centro.
      const peanutX = (Math.abs(lx) - 1750) / 980;
      lz =
        gauss(rnd) *
        (250 + 920 * Math.exp(-peanutX * peanutX));
    } else {
      const r = Math.min(
        1200 * Math.sqrt(-2 * Math.log(1 - rnd() * 0.982)),
        2600
      );
      const a = rnd() * Math.PI * 2;
      lx = r * Math.cos(a);
      ly = r * Math.sin(a) * 0.76;
      lz = gauss(rnd) * Math.min(1250, 430 + r * 0.36);
    }
    const rx = lx * cosB - ly * sinB;
    const ry = lx * sinB + ly * cosB;
    lx = rx;
    ly = ry;
    const dim = 0.5 + 0.5 * rnd();
    put(
      lx,
      ly,
      lz,
      1.0 * dim,
      0.72 * dim,
      0.46 * dim,
      3 + rnd() * 9,
      0.025 + rnd() * 0.06
    );
  }

  // ---- regiões HII — nós rosados/azuis colados nos braços ----
  for (let i = 0; i < N_HII; i++) {
    const inLocalArm = i < N_HII * 0.16;
    const k = pickArm();
    const arm = ALL_ARMS[k];
    const r = inLocalArm
      ? THREE.MathUtils.lerp(LOCAL_ARM.minRadiusPc, LOCAL_ARM.maxRadiusPc, rnd())
      : // uniforme em ÁREA. pow(rnd, 0.88) empilhava os nós no raio
        // máximo de cada braço e desenhava um arco rosado na borda.
        Math.sqrt(
          arm.minRadiusPc * arm.minRadiusPc +
            rnd() *
              (arm.maxRadiusPc * arm.maxRadiusPc -
                arm.minRadiusPc * arm.minRadiusPc)
        );
    const sigmaPerp = armWidthPc(r);
    const theta = inLocalArm
      // 0,9σ contra os 11σ da população estelar: os nós saíam como uma
      // FITA rosa fina na crista, não como pontos espalhados pelo braço.
      ? localArmThetaAtRadius(r) + (gauss(rnd) * sigmaPerp * 3.2) / r
      : armThetaAtRadius(r, arm) + (gauss(rnd) * sigmaPerp * 3.8) / r;
    const lx = r * Math.cos(theta);
    const ly = r * Math.sin(theta);
    const lz =
      warpHeightPc(r, theta) + gauss(rnd) * (46 + flareAtRadius(r) * 105);
    const youngSupport = youngSupportAt(lx, ly);
    const youngResponse = effectiveYoungResponseAt(lx, ly);
    const armWeight =
      (inLocalArm ? LOCAL_ARM.weight : arm.renderWeight ?? arm.weight) *
      // A supressão por youngSupport evita contar duas vezes com as 1.413
      // regiões WISE de starForges — mas essas são heliocêntricas, só do
      // nosso lado. O piso (0,45) ainda amarrava o resto do disco ao
      // catálogo: onde ele cala, o nó sumia. Mesma inversão do resto —
      // o braço define que HÁ formação estelar, o catálogo modula quanta.
      (1 - youngSupport * 0.55) *
      (0.85 + youngResponse * 0.30);
    // Nós compactos (25–120 pc) leem como pontos vermelhos/azuis nos
    // braços; 35–175 pc viravam manchas difusas que sumiam no fundo.
    if (rnd() < 0.62) {
      put(
        lx, ly, lz,
        1.0, 0.30, 0.44,
        30 + rnd() * 110,
        // De 33 kpc um nó de 70 pc tem ~2,7 px: para LER como ponto
        // vermelho precisa de contraste, não de tamanho — aumentar o
        // raio só o dissolveria no fundo.
        (0.05 + rnd() * 0.115) * armWeight
      );
    } else {
      put(
        lx, ly, lz,
        0.55, 0.74, 1.0,
        30 + rnd() * 110,
        (0.05 + rnd() * 0.11) * armWeight
      );
    }
  }

  // ---- halo estelar esparso ----
  for (let i = 0; i < N_HALO; i++) {
    const r = 4000 + 18000 * Math.pow(rnd(), 1.7);
    const a = rnd() * Math.PI * 2;
    const u = rnd() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    put(r * s * Math.cos(a), r * s * Math.sin(a), r * u, 0.9, 0.85, 0.8, 3 + rnd() * 9, 0.055);
  }

  // ---- Galáxia Anã Elíptica de Sagitário -------------------
  // Centro aproximado: l=5,6°, b=-14,2°, d=26 kpc. É tênue e
  // alongada verticalmente pelas marés da Via Láctea.
  const sgrDir = SGR_DIR;
  const sgrCenter = SGR_DWARF_POS;
  const sgrAcross = new THREE.Vector3().crossVectors(EZ, sgrDir).normalize();
  for (let i = 0; i < N_SAGITTARIUS_DWARF; i++) {
    const along = gauss(rnd) * 3_800;
    const across = gauss(rnd) * 1_550;
    const depth = gauss(rnd) * 1_100;
    const p = sgrCenter
      .clone()
      .addScaledVector(EZ, along)
      .addScaledVector(sgrAcross, across)
      .addScaledVector(sgrDir, depth);
    const dim = 0.35 + rnd() * 0.55;
    // p já está no referencial heliocêntrico; convertemos de volta à
    // base local para reutilizar o único caminho de gravação.
    const q = p.clone().sub(GAL.GC_POS);
    put(
      q.dot(EX),
      q.dot(EY),
      q.dot(EZ),
      0.95 * dim,
      0.74 * dim,
      0.56 * dim,
      3 + rnd() * 8,
      0.018 + rnd() * 0.045
    );
  }

  // ---- poeira — faixas escuras na borda interna dos braços ----
  let dN = 0;
  const putDust = (lx: number, ly: number, lz: number, size: number, alpha: number) => {
    const o = dN * 8;
    localToWorld(lx, ly, lz, dust, o);
    // Cor do ESPALHAMENTO (a extinção usa uniform e ignora isto). Mesma
    // mistura do raymarch interno em nebulaShaders: azul-violeta
    // (0.30,0.43,0.78) longe do bojo, quente (1.00,0.72,0.42) perto. Sem
    // este termo a poeira vista de fora só podia ser dourada, e o disco
    // púrpura que aparece nos voos por dentro não tinha contraparte.
    // A INTENSIDADE do espalhamento é densidade × campo de radiação
    // local; o campo cai com o raio como a luz do disco. Sem isso a
    // poeira do disco externo — que é a maioria — devolvia tanto quanto
    // a do miolo e virava um véu azul cobrindo a borda.
    // Espalhamento = (cor do campo de radiação que ilumina o grão)
    //              × (eficiência de espalhamento, que sobe para o azul)
    //              × (intensidade do campo local).
    // A eficiência ∝ λ^−1,3 para grão interestelar é a razão pela qual
    // uma nebulosa de reflexão é MAIS AZUL que a estrela que a ilumina —
    // e é o que faz a poeira devolver púrpura mesmo iluminada por um
    // disco amarelado.
    const rPc = Math.hypot(lx, ly);
    const towardCenter = Math.exp(-rPc / 2_600);
    const field = 0.08 + 0.92 * Math.exp(-rPc / 4_500);
    // AUTO-BLINDAGEM: o interior de uma nuvem densa não recebe luz, então
    // o espalhamento emergente é g·exp(−g·2,2) — cresce com a coluna e
    // depois cai. É por isso que nebulosa de reflexão é fenômeno de
    // BORDA. Sem esse termo o espalhamento saturava em manchas azul-aço
    // justamente onde a poeira é mais densa (disco interno).
    const g = gasResponseAt(lx, ly);
    const shield = g * Math.exp(-g * 2.2) * 2.72;
    const fr = 0.3 + 0.7 * towardCenter;
    const fg = 0.43 + 0.29 * towardCenter;
    const fb = 0.78 - 0.36 * towardCenter;
    dust[o + 3] = fr * field * shield * 0.72;
    dust[o + 4] = fg * field * shield * 1.0;
    dust[o + 5] = fb * field * shield * 1.34;
    dust[o + 6] = size;
    // 0.8 apagava a poeira justo onde o survey a MEDIU — existia para não
    // contar duas vezes com observedClouds, que na vista externa está em
    // fade 0. Sobrava só perda.
    dust[o + 7] = alpha * (1 - gasSupportAt(lx, ly) * 0.35);
    dN++;
  };
  for (let i = 0; i < N_DUST; i++) {
    if (rnd() < 0.09) {
      // Poeira da barra. Alpha PRÓPRIO: com o ganho externo em 7,0 os
      // mesmos 0,008–0,026 de antes empilhavam num risco preto sólido
      // atravessando o bojo (visível em t=176).
      const lx =
        (rnd() * 2 - 1) * GALACTIC_MODEL.barHalfLengthPc * 0.88;
      const ly = gauss(rnd) * 430;
      const rx = lx * cosB - ly * sinB;
      const ry = lx * sinB + ly * cosB;
      putDust(
        rx,
        ry,
        gauss(rnd) * 125,
        65 + rnd() * 145,
        0.0028 + rnd() * 0.0062
      );
    } else if (structure) {
      // Amostragem por REJEIÇÃO no campo de gás 2-D.
      //
      // Antes a poeira era sorteada AO LONGO da espinha do braço, com um
      // desvio gaussiano perpendicular. Uma curva só sabe desenhar arco:
      // saíam riscos longos e lisos concêntricos, nada parecido com a
      // rede de filamentos curtos e ramificados do alvo. O campo
      // `gasResponse` já é bidimensional e turbulento (nuvens observadas
      // + preenchimento fragmentado por fbm seguindo os braços) — usá-lo
      // como densidade de probabilidade dá a rede de graça, e a poeira
      // passa a morar onde o gás está em vez de onde a fórmula está.
      let lx = 0;
      let ly = 0;
      let accepted = false;
      for (let tries = 0; tries < 28 && !accepted; tries++) {
        // O gás molecular da Via Láctea NÃO é uniforme em área: tem um
        // anel em R ~ 4 kpc e cai rápido para fora. Amostrando uniforme,
        // só ~1,5% da poeira caía dentro de 4 kpc e o terço interno —
        // onde o alvo é mais denso e mais marrom — ficava limpo.
        // Gamma(k=2) com escala 4,2 kpc: pico em 4,2, cauda até a borda.
        // REAMOSTRA em vez de clampar: Math.max(1400, …) empilhava toda a
        // cauda interna exatamente em 1,4 kpc e desenhava um anel delta
        // (aparecia como arco duro junto ao bojo). Clamp em amostragem é
        // sempre uma delta na borda.
        let rr = 0;
        do {
          rr = -4_200 * Math.log(Math.max(rnd() * rnd(), 1e-7));
        } while (rr < 1_400 || rr > 16_500);
        // ÂNGULO por distribuição perpendicular, não por sorteio uniforme
        // filtrado pelo campo.
        //
        // Rejeição pura no campo prendia a poeira a UMA linha por braço:
        // o campo tem seu máximo na crista, e nem alargar o braço nem
        // baixar o limiar mudava isso — o sorteio uniforme só encontra
        // material onde o campo já é alto. Agora a largura vem da
        // distribuição (±2,4σ da largura de Reid, com o centro deslocado
        // −0,5σ para a borda côncava, que é onde a poeira mora) e o campo
        // entra como PESO da probabilidade, dando a subestrutura sem
        // decidir a geometria. Mesma inversão de sempre.
        const arm = ALL_ARMS[pickArm()];
        const sigmaPerp = armWidthPc(rr);
        // A poeira usa a MESMA fase do braço estelar (espinha + correção de
        // maser). Testado desacoplá-la para a espinha pura, achando que a
        // correção de um lado só pusesse m=1 na absorção: piorou muito
        // (m=5 0,095→0,126, erro total 0,086→0,151). Poeira e luz têm de
        // compartilhar a geometria; separá-las quebra o alinhamento
        // fenda-ao-lado-da-crista.
        // escala comparável à da população estelar (sigmaPerp * 11): com
        // 2,4 a poeira ficava 13× mais estreita que o braço e voltava a
        // ler como linha. O −1,8 desloca o centro para a borda côncava.
        // POSITIVO é a borda côncava — mesma convenção do offset de
        // dustArms em structureMap. Os dois precisam ficar do MESMO lado:
        // estavam opostos e se anulavam, sobrando poeira em cima da crista.
        //
        // DUAS componentes: a poeira não SOME no lado convexo, só é menos
        // densa. Uma gaussiana só de um lado dá um perfil azimutal
        // dente-de-serra, e dente-de-serra é rico em harmônicos ímpares
        // por construção — candidato ao m=1/m=3 que sobrou.
        const lane =
          (rnd() < 0.66 ? 4.8 : -3.6) + gauss(rnd) * 5.6;
        const th = armThetaAtRadius(rr, arm) + (lane * sigmaPerp) / rr;
        lx = rr * Math.cos(th);
        ly = rr * Math.sin(th);
        const g = gasResponseAt(lx, ly);
        // Testado g² com piso baixo para concentrar a coluna nas fendas:
        // piorou (m=2 0,207→0,189, m=4 0,202→0,180). A crista do gás
        // COINCIDE com a do braço, então concentrar nela escurece
        // justamente o que deveria brilhar. Linear é melhor aqui.
        accepted = rnd() < 0.22 + 0.78 * g;
      }
      if (!accepted) continue;
      const r = Math.hypot(lx, ly);
      const theta = Math.atan2(ly, lx);
      const clumpAlpha = rnd() < 0.52 ? 1 : 0.18;
      putDust(
        lx,
        ly,
        warpHeightPc(r, theta) +
          gauss(rnd) * (58 + flareAtRadius(r) * 120),
        65 + rnd() * 155,
        (0.018 + rnd() * 0.048) * clumpAlpha
      );
    }
  }

  return { bright, brightCount, dust, dustCount: dN };
}

export type CartographyMode = 'blend' | 'off' | 'observed';

export class Galaxy {
  readonly group = new THREE.Group();
  private brightMat: THREE.ShaderMaterial;
  private dustMat: THREE.ShaderMaterial;
  private glowMat: THREE.ShaderMaterial; // bojo
  private dwarfMat: THREE.ShaderMaterial; // anã de Sagitário
  private markerMat: THREE.ShaderMaterial; // Sol ("você está aqui")
  private discMats: THREE.ShaderMaterial[] = [];
  private discMeshes: THREE.Mesh[] = [];
  private discBaseAlphas: number[] = [];
  private discRTs: THREE.WebGLRenderTarget[] = [];
  private markerMesh!: THREE.Mesh;
  private dustMap: THREE.Texture;
  private structureMap: THREE.Texture;
  private dustPts!: THREE.Points;
  private dustScatterMat: THREE.ShaderMaterial;
  private dustScatterPts!: THREE.Points;
  private glowMesh!: THREE.Mesh;
  private dwarfMesh!: THREE.Mesh;
  private static scratch = new THREE.Vector3();
  private static dbg = new URLSearchParams(window.location.search);
  // flags lidos UMA vez — URLSearchParams.has() por frame é lixo evitável
  private showGDust = !Galaxy.dbg.has('nogdust');
  private showGlow = !Galaxy.dbg.has('noglow');
  /** ?nodisc=1 — só as partículas, para medir a divisão de fluxo */
  private showDisc = !Galaxy.dbg.has('nodisc');

  /** 1×1 sem cobertura (A=128: warp neutro) — 100% procedural. */
  static emptyDustMap(): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 128]),
      1,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    return texture;
  }

  private ownsDustMap: boolean;

  constructor(
    buffers: GalaxyBuffers,
    dustMap: THREE.Texture,
    structureMap: THREE.Texture
  ) {
    this.ownsDustMap = !dustMap;
    this.dustMap = dustMap ?? Galaxy.emptyDustMap();
    this.structureMap = structureMap;
    // --- partículas brilhantes (aditivas) ---
    const geo = new THREE.BufferGeometry();
    const bd = buffers.bright;
    const brightBuffer = new THREE.InterleavedBuffer(bd, 8);
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(brightBuffer, 3, 0));
    geo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(brightBuffer, 3, 3));
    geo.setAttribute('aSize', new THREE.InterleavedBufferAttribute(brightBuffer, 1, 6));
    geo.setAttribute('aAlpha', new THREE.InterleavedBufferAttribute(brightBuffer, 1, 7));
    geo.boundingSphere = new THREE.Sphere(GAL.GC_POS.clone(), 40000);

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_FRAG,
      uniforms: this.sharedUniforms(20),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const brightPts = new THREE.Points(geo, this.brightMat);
    brightPts.frustumCulled = false;
    brightPts.renderOrder = 2;
    this.group.add(brightPts);

    // --- emissão contínua dos braços em três lâminas 3D ---
    this.createDiscLayers();

    // --- brilho contínuo do bojo ---
    this.glowMat = this.makeGlow(new THREE.Vector3(1.0, 0.62, 0.32), 2700, 0.5);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.glowMat);
    glow.position.copy(GAL.GC_POS);
    glow.frustumCulled = false;
    glow.renderOrder = 3;
    this.group.add(glow);
    this.glowMesh = glow;

    // --- brilho integrado da galáxia anã de Sagitário --------
    this.dwarfMat = this.makeGlow(
      new THREE.Vector3(0.78, 0.55, 0.38),
      1_150,
      0
    );
    const dwarf = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dwarfMat);
    dwarf.position.copy(SGR_DWARF_POS);
    dwarf.frustumCulled = false;
    dwarf.renderOrder = 3;
    this.group.add(dwarf);
    this.dwarfMesh = dwarf;

    // --- poeira multiplicativa (depois de toda a luz) ---
    const dGeo = new THREE.BufferGeometry();
    const dd = buffers.dust;
    const dustBuffer = new THREE.InterleavedBuffer(dd, 8);
    dGeo.setAttribute('position', new THREE.InterleavedBufferAttribute(dustBuffer, 3, 0));
    dGeo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(dustBuffer, 3, 3));
    dGeo.setAttribute('aSize', new THREE.InterleavedBufferAttribute(dustBuffer, 1, 6));
    dGeo.setAttribute('aAlpha', new THREE.InterleavedBufferAttribute(dustBuffer, 1, 7));
    dGeo.boundingSphere = new THREE.Sphere(GAL.GC_POS.clone(), 40000);

    this.dustMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_DUST_FRAG,
      uniforms: {
        ...this.sharedUniforms(10),
        uTau: { value: 1.15 },
      },
      blending: THREE.MultiplyBlending,
      depthWrite: false,
      transparent: true,
      premultipliedAlpha: true,
    });
    const dustPts = new THREE.Points(dGeo, this.dustMat);
    dustPts.frustumCulled = false;
    dustPts.renderOrder = 5;
    this.group.add(dustPts);
    this.dustPts = dustPts;

    // --- espalhamento da poeira (aditivo, DEPOIS da extinção) ---
    // Mesma geometria, segundo draw: um único blend mode não faz
    // multiplicativo e aditivo ao mesmo tempo, e a poeira precisa dos
    // dois — absorve o que passa e devolve azul espalhado.
    this.dustScatterMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_DUST_SCATTER_FRAG,
      uniforms: this.sharedUniforms(10),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const scatterPts = new THREE.Points(dGeo, this.dustScatterMat);
    scatterPts.frustumCulled = false;
    scatterPts.renderOrder = 6;
    this.group.add(scatterPts);
    this.dustScatterPts = scatterPts;

    // --- marcador do Sol ---
    this.markerMat = this.makeGlow(new THREE.Vector3(1.0, 0.9, 0.7), 125, 1);
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.markerMat);
    marker.position.set(0, 0, 0);
    marker.frustumCulled = false;
    marker.renderOrder = 6;
    this.group.add(marker);
    this.markerMesh = marker;
  }

  private sharedUniforms(maxPx: number) {
    return {
      uCamPos: { value: new THREE.Vector3() },
      uScreenH: { value: 1080 },
      uTanHalfFov: { value: 0.55 },
      uFade: { value: 0 },
      uMaxPx: { value: maxPx },
    };
  }

  private makeGlow(color: THREE.Vector3, size: number, pulse: number) {
    return new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: {
        uColor: { value: color },
        uSize: { value: size },
        uTime: { value: 0 },
        uFade: { value: 0 },
        uPulse: { value: pulse },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
  }

  private createDiscLayers() {
    const root = new THREE.Group();
    const basis = new THREE.Matrix4().makeBasis(EX, EY, EZ);
    root.position.copy(GAL.GC_POS);
    root.quaternion.setFromRotationMatrix(basis);

    // Subdivisões são necessárias para que o vertex shader curve a
    // lâmina no warp — 72² resolve o warp (feições de ~4 kpc) com
    // 1/4 dos vértices de 144².
    const geometry = new THREE.PlaneGeometry(2, 2, 72, 72);
    const layers: Array<[number, number, number]> = [
      [-340, 0.1, 2.1],
      [-190, 0.22, 3.7],
      [-75, 0.4, 7.9],
      [0, 0.64, 11.3],
      [85, 0.35, 17.7],
      [205, 0.2, 23.9],
      [380, 0.08, 31.1],
    ];
    for (const [height, alpha, seed] of layers) {
      const material = new THREE.ShaderMaterial({
        vertexShader: DISC_VERT,
        fragmentShader: DISC_FRAG,
        uniforms: {
          uFade: { value: 0 },
          uSeed: { value: seed },
          uLayerAlpha: { value: alpha },
          uDiskRadius: { value: GAL.DISK_RADIUS },
          uDustMap: { value: this.dustMap },
          uStructureMap: { value: this.structureMap },
          uCartBlend: { value: 1 },
          uInferenceGain: { value: 0.55 },
          uBackgroundGain: { value: 1 },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        // sem isto o hemisfério sul da galáxia não existe: vista por
        // baixo, cada lâmina era descartada por backface culling
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = height;
      mesh.scale.set(GAL.DISK_RADIUS, GAL.DISK_RADIUS, 1);
      mesh.renderOrder = 1;
      root.add(mesh);
      this.discMats.push(material);
      this.discMeshes.push(mesh);
      this.discBaseAlphas.push(alpha);
    }
    this.group.add(root);
  }

  /**
   * off: só procedural · blend: observado condiciona o procedural ·
   * observed: realça o medido dimando a emissão inferida (debug A/B).
   * Chamar ANTES de bakeDiscLayers — o modo é congelado no bake.
   */
  setCartography(mode: CartographyMode) {
    this.discMats.forEach((material, index) => {
      if (material.uniforms.uCartBlend) {
        material.uniforms.uCartBlend.value = mode === 'off' ? 0 : 1;
      }
      if (material.uniforms.uInferenceGain) {
        material.uniforms.uInferenceGain.value =
          mode === 'observed' ? 0.12 : 0.55;
      }
      if (material.uniforms.uBackgroundGain) {
        material.uniforms.uBackgroundGain.value =
          mode === 'observed' ? 0.24 : 1;
      }
      material.uniforms.uLayerAlpha.value = this.discBaseAlphas[index];
    });
  }

  /**
   * Congela cada lâmina do disco numa textura 1024² (33 pc/texel —
   * acima da frequência útil do FBM). O conteúdo é 100% estático:
   * por frame sobra um fetch × uLayerAlpha × uFade, em vez de
   * 2×fbm2(5 oitavas) + 10 galArm por fragmento × 7 lâminas
   * (~400 M hash/frame no Ato III). Roda uma vez no init.
   */
  bakeDiscLayers(renderer: THREE.WebGLRenderer) {
    const bakeScene = new THREE.Scene();
    const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    bakeScene.add(quad);
    const prev = renderer.getRenderTarget();

    for (let i = 0; i < this.discMats.length; i++) {
      const analytic = this.discMats[i];
      const savedFade = analytic.uniforms.uFade.value as number;
      const savedAlpha = analytic.uniforms.uLayerAlpha.value as number;
      analytic.uniforms.uFade.value = 1;
      analytic.uniforms.uLayerAlpha.value = 1;

      const bakeMat = new THREE.ShaderMaterial({
        vertexShader: DISC_BAKE_VERT,
        fragmentShader: DISC_FRAG,
        uniforms: analytic.uniforms, // mesmas refs (uDustMap, uSeed…)
      });
      quad.material = bakeMat;

      const rt = new THREE.WebGLRenderTarget(1024, 1024, {
        type: THREE.HalfFloatType,
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
      renderer.setRenderTarget(rt);
      renderer.render(bakeScene, bakeCam);
      bakeMat.dispose();
      analytic.uniforms.uFade.value = savedFade;
      analytic.uniforms.uLayerAlpha.value = savedAlpha;

      const baked = new THREE.ShaderMaterial({
        vertexShader: DISC_VERT,
        fragmentShader: DISC_BAKED_FRAG,
        uniforms: {
          uBaked: { value: rt.texture },
          uFade: { value: savedFade },
          uLayerAlpha: { value: savedAlpha },
          uDiskRadius: { value: GAL.DISK_RADIUS },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        side: THREE.DoubleSide,
      });
      this.discMeshes[i].material = baked;
      analytic.dispose();
      this.discMats[i] = baked;
      this.discRTs.push(rt);
    }

    quad.geometry.dispose();
    renderer.setRenderTarget(prev);
  }

  /**
   * externalFade revela a galáxia vista de fora; localBandFade reutiliza
   * somente suas partículas e poeira quando a câmera ainda está dentro
   * do disco. Assim a faixa celeste é geometria 3D real, nunca um skybox.
   */
  update(
    camPos: THREE.Vector3,
    screenH: number,
    tanHalfFov: number,
    time: number,
    externalFade: number,
    markerFade: number,
    localBandFade: number
  ) {
    this.group.visible =
      externalFade > 0.001 || markerFade > 0.001 || localBandFade > 0.001;
    if (!this.group.visible) return;

    const brightFade = Math.max(externalFade, localBandFade);
    // A extinção das lâminas só apaga a luz da PRÓPRIA lâmina (blend
    // aditivo) — nunca chega às faixas escuras do alvo. Os sprites de
    // poeira são multiplicativos e escurecem tudo que está atrás, então
    // valem na vista externa também.
    // De 33 kpc cada sprite vira ~5 px e a conservação de fluxo derruba
    // vAlpha para ~0,003: invisível. De dentro os mesmos sprites cobrem
    // dezenas de px e 0,72 é o certo. O ganho externo compensa a razão —
    // menor de perfil, onde a visada já atravessa o disco inteiro.
    // openness: 1 = de cima, 0 = no plano.
    const toCam = Galaxy.scratch.copy(camPos).sub(GAL.GC_POS);
    const openness = Math.abs(toCam.dot(EZ)) / Math.max(toCam.length(), 1);
    // 5,5 aplicava um véu marrom sobre o disco INTEIRO — medido com
    // ?nogdust=1, era ele que achatava a textura estelar. A poeira tem de
    // ser fenda, não filtro: menos ganho global, mais concentração.
    const dustFade = Math.max(
      externalFade * THREE.MathUtils.lerp(2.0, 3.4, openness),
      localBandFade * 0.72
    );
    // Sete planos achatados descrevem o disco visto de CIMA. De raspão
    // eles viram sete listras horizontais; ali quem tem estrutura em z
    // são as partículas. Cede entre ~3° e ~17° acima do plano — só o
    // suficiente para as listras ficarem abaixo do granulado.
    const discFade =
      externalFade * THREE.MathUtils.smoothstep(openness, 0.05, 0.30);
    for (const [m, layerFade] of [
      [this.brightMat, brightFade],
      [this.dustMat, dustFade],
      // o espalhamento é mais fraco que a extinção: 1/3 do fluxo
      [this.dustScatterMat, dustFade * 0.34],
    ] as const) {
      const u = m.uniforms;
      (u.uCamPos.value as THREE.Vector3).copy(camPos);
      u.uScreenH.value = screenH;
      u.uTanHalfFov.value = tanHalfFov;
      u.uFade.value = layerFade;
    }
    // As lâminas contínuas só entram na vista externa. De dentro
    // seriam planos infinitos; a faixa local vem das partículas 3D.
    // Com fade 0 os meshes ficam invisíveis: cada lâmina de 33,6 kpc
    // custa milhões de fragmentos de FBM que somariam exatamente zero.
    const discVisible = discFade > 0.001 && this.showDisc;
    for (const material of this.discMats) {
      material.uniforms.uFade.value = discFade;
    }
    for (const mesh of this.discMeshes) {
      mesh.visible = discVisible;
    }
    this.markerMesh.visible = markerFade > 0.001;
    // o brilho contínuo do bojo só aparece de longe — perto ele
    // cobriria a tela inteira de branco
    const dGC = camPos.distanceTo(GAL.GC_POS);
    const glowGate = THREE.MathUtils.smoothstep(dGC, 5000, 13000);
    this.glowMat.uniforms.uTime.value = time;
    this.glowMat.uniforms.uFade.value = Math.max(
      externalFade * glowGate * 0.32,
      localBandFade * 0.11
    );
    this.dwarfMat.uniforms.uTime.value = time;
    this.dwarfMat.uniforms.uFade.value = externalFade * 0.11;
    this.markerMat.uniforms.uTime.value = time;
    this.markerMat.uniforms.uFade.value = markerFade;
    this.dustPts.visible = this.showGDust;
    this.dustScatterPts.visible = this.showGDust;
    this.glowMesh.visible = this.showGlow;
    this.dwarfMesh.visible = this.showGlow;
  }

  dispose() {
    this.brightMat.dispose();
    this.dustMat.dispose();
    this.dustScatterMat.dispose();
    this.glowMat.dispose();
    this.dwarfMat.dispose();
    this.markerMat.dispose();
    this.discMats.forEach((material) => material.dispose());
    this.discRTs.forEach((rt) => rt.dispose());
    if (this.ownsDustMap) this.dustMap.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
    });
  }
}
