// ============================================================
// O GERADOR da Via Láctea procedural — buildGalaxy inteiro.
//
// As populações por temperatura, a anã de Sagitário, o RNG semeado
// (mulberry32/gauss), os knobs ?tune e a montagem dos buffers.
// Morava em galaxy.ts; a CLASSE que desenha (Galaxy) ficou lá e
// consome o contrato GalaxyBuffers daqui.
// ============================================================
import * as THREE from 'three';
import {
  GALACTIC_MODEL,
  LOCAL_ARM,
  ALL_ARMS,
  armActivityAtRadius,
  armBreakGain,
  armPairDepth,
  armThetaAtRadius,
  armWidthPc,
  flareAtRadius,
  localArmThetaAtRadius,
  warpHeightPc,
} from '../cartography/galacticModel';
import { POP_HII } from '../shaders/common';
import { blackbodyLinear } from '../luzDaCasa';
import { GAL, EX, EY, EZ } from './baseGalactica';

// As três populações do disco, por temperatura efetiva. Y ≈ 1 nas três, então
// a escolha de população muda MATIZ e não brilho — brilho é a lei de
// luminosidade em potência, mais abaixo.
const POP_YOUNG = blackbodyLinear(20_000); // O/B nos braços
const POP_OLD = blackbodyLinear(4_800); // K/G, o corpo do disco
const POP_GIANT = blackbodyLinear(3_500); // gigantes M do ramo

// ---- Geometria galáctica real no referencial da cena (pc) ----
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
export const SGR_DWARF_POS = SGR_DIR.clone().multiplyScalar(26_000);

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

export interface GalaxyBuffers {
  bright: Float32Array; // stride 8: x,y,z,r,g,b,size,alpha
  brightCount: number;
}

/** Campos CPU iguais aos usados no bake emissivo do disco. */
export interface StructureField {
  gasResponse: Float32Array;
  gasSupport: Float32Array;
  youngResponse: Float32Array;
  youngSupport: Float32Array;
  size: number;
  halfExtentPc: number;
}

// Knobs de varredura por query (?cnt=1.5&idim=0.6&ir0=3500&hzs=1.2&glowgain=0.8):
// medir perfis sem editar código entre capturas (rodada 18). Ausentes, os
// defaults são identidades exatas — geração e glow saem bit a bit iguais.
const TUNE_Q = new URLSearchParams(window.location.search);
export const tune = (k: string, d: number) => {
  const v = parseFloat(TUNE_Q.get(k) ?? '');
  return Number.isFinite(v) ? v : d;
};

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
  populationScale = 1,
  /**
   * ?galaxia=particulas (ensaio): as partículas carregam a galáxia inteira
   * — barra e bojo, braços largos com o par dominante, disco espesso e
   * borda que se apaga — porque de fora não há lâmina pintada por baixo.
   * Falso = o caminho de sempre, com a MESMA sequência do RNG e o mesmo
   * buffer bit a bit: todo ramo novo abaixo só existe com P.
   */
  soParticulas = false
): GalaxyBuffers {
  const P = soParticulas;
  // 1,5 e RBIAS 3 andam JUNTOS (rodada 28): sozinha, densidade estoura o
  // grão do miolo para baixo (1,6× → 0,061, 2,5× → 0,053, alvo 0,068) porque
  // adensa onde já estava certo; com o viés radial tirando partícula do
  // miolo, 1,5× repõe exatamente o que ele levou. Os dois grãos cravam:
  // miolo 0,0667 (alvo 0,0679) e borda 0,1278 (alvo 0,1236).
  // Custo: +1,3 M vértices ≈ +0,4 ms pela medida de ?nogal (320 k = 0,1 ms).
  // ?cnt=1&rbias=1 recupera o estado anterior à rodada.
  populationScale *= tune('cnt', 1.5);
  const IDIM = tune('idim', 0);
  const IR0 = Math.max(tune('ir0', 3000), 1);
  // escurecimento interno: gaussiana em r — 1 no disco externo, 1−idim no centro
  const innerDim = (r: number) => 1 - IDIM * Math.exp(-(r * r) / (2 * IR0 * IR0));
  const HZS = tune('hzs', 1);
  // textura da população: fração colada em complexos e alongamento do
  // complexo pelo cisalhamento (σ_θ/σ_R). Defaults = identidade exata.
  const CLUMP = tune('clump', 0.72);
  const SHEAR = tune('shear', 1);
  // AMOSTRAGEM ≠ MASSA: sortear partículas COM o perfil de massa deixa a
  // borda com poucas por pixel, cada uma forte demais — o disco externo lia
  // como pincelada gorda e espaçada em vez do tapete fino do alvo. 3 é o
  // joelho medido (3,5× e 4× pioram harmônicas e grão sem ganhar borda).
  const RBIAS = Math.max(tune('rbias', 3), 1);
  // Constantes do viés radial de sorteio (ver o bloco no laço do disco).
  // ∫₀^Rmax r·e^(−r/a) dr = a²·[1 − (1+x)·e^(−x)], x = Rmax/a.
  const RD_SAMPLE = GALACTIC_MODEL.stellarScaleLengthPc * RBIAS;
  const gammaZ = (a: number) => {
    const x = GALACTIC_MODEL.diskRadiusPc / a;
    return a * a * (1 - (1 + x) * Math.exp(-x));
  };
  const W0 = gammaZ(RD_SAMPLE) / gammaZ(GALACTIC_MODEL.stellarScaleLengthPc);
  const INV_DR = 1 / GALACTIC_MODEL.stellarScaleLengthPc - 1 / RD_SAMPLE;
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
  // Só-partículas: a barra e o bojo levavam 0,8 % da luz contra os 11,5 %
  // que núcleo + barra tinham nas lâminas. A luz sobe em CONTAGEM (pontos
  // tirados do disco, total igual) e não só em peso: com 85 mil pontos
  // fortes o bojo de perto viraria granizo. Mesmo fluxo por partícula
  // que o disco ⇒ o núcleo de densidade fica tão liso lá quanto aqui.
  const N_BOJO_EXTRA = P ? Math.round(200_000 * populationScale) : 0;
  const N_DISK = Math.round(2_600_000 * populationScale) - N_BOJO_EXTRA;
  const N_BULGE = 85000 + N_BOJO_EXTRA;
  // Só-partículas: fração da barra+bojo que é o bojo boxy/peanut (o resto
  // é a barra longa) e os três pesos que fecham as parcelas de luz (fluxo
  // ∝ alpha·tamanho²: medidos no gerador com populationScale do cinema).
  // N_BOJO_REF/N_BULGE deixa a luz do bojo igual em qualquer qualidade.
  const FRACAO_BP = 0.45;
  const N_BOJO_REF = 385_000;
  // Medido (cinema): bojo 3,7 % → 11 % (núcleo + barra das lâminas: 11,5 %),
  // H II 1,1 % → 3 %, e o disco fecha o fluxo TOTAL das partículas igual
  // ao de sempre — o GANHO_DAS_LAMINAS (galaxy.ts) continua valendo.
  const K_BOJO = 3.31;
  const K_DISCO = 1.161;
  const K_HII = 2.92;
  const N_LOCAL = 14000;
  // Preenchimento inferido só completa o lado sem catálogo. O layer
  // observado já contém 1.413 regiões WISE; milhares de nós sintéticos
  // desenhavam os braços como pontilhados perfeitamente contínuos.
  // O alvo mostra centenas de nós H II vermelhos ao longo dos braços; com
  // 900 sujeitos a um peso que os apagava, sobrava nenhum visível.
  const N_HII = 9000;
  const N_HALO = 5000;
  const N_SAGITTARIUS_DWARF = 6500;
  const brightCount =
    N_DISK + N_LOCAL + N_BULGE + N_HII + N_HALO + N_SAGITTARIUS_DWARF;
  const bright = new Float32Array(brightCount * 8);
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
  // ---- só-partículas: constantes do disco (P) ----
  // gauss() tem σ = 0,408 e não 0,5: G converte um σ VERDADEIRO em pc no
  // literal que multiplica gauss().
  const G = 1 / 0.40825;
  // Disco espesso: o LUT_DISK pondera 0,105 no plano com hz 610→1080 pc,
  // ~30 % da coluna; aqui 10 % das partículas, só velhas, sem braço.
  const FRACAO_ESPESSO = 0.1;
  // Braço estelar 1,5× Reid (o braço das estrelas velhas das lâminas e de
  // Drimmel), 35 % do disco fino no braço onde os quatro estão ativos:
  // 0,5 dava contraste braço/interbraço 2,7–3,8 de 5 a 11 kpc; 0,35 dá 2,0–2,6.
  // σ verdadeiro no plano, em unidades de w(R) de Reid.
  const LARGURA_BRACO = 1.5;
  const FRACAO_NO_BRACO = 0.35;
  // Buraco do disco dentro da barra (Freudenreich 1998, COBE/DIRBE; López-
  // Corredoira 2004): dentro de ~3 kpc a luz do "disco" é a barra. Sem
  // ele o miolo exponencial (Rd 2,6 kpc) enterrava a barra num disco
  // redondo tão claro quanto ela. Fica 30 % no centro.
  const buracoDoDisco = (r: number) =>
    1 - 0.7 * (1 - THREE.MathUtils.smoothstep(r, 1_500, 4_000));
  // Complexos: metade aglutinada (era 0,72), σ verdadeiro 49–253 pc (era
  // até 416) e esticados 2,5× no sentido do giro — feixes ao longo do
  // braço, não bolas de algodão; somem além de 11–14 kpc, onde 9 mil
  // sementes distam 1 kpc e viravam ilhas.
  const CLUMP_P = 0.5;
  const SHEAR_P = 2.5;
  // Escolha do braço ∝ atividade × peso do par no raio sorteado: o par
  // fraco dentro de 7,6 kpc deixa de receber partícula em vez de recebê-la
  // com alpha 0. Tabela radial (50 pc) para não pagar 6 portas por ponto.
  const PASSO_TABELA = 50;
  const nTabela = Math.ceil(GALACTIC_MODEL.diskRadiusPc / PASSO_TABELA) + 1;
  const pesoDoBraco = P ? new Float32Array(nTabela * ALL_ARMS.length) : null;
  const somaDoBraco = P ? new Float32Array(nTabela) : null;
  if (pesoDoBraco && somaDoBraco) {
    for (let j = 0; j < nTabela; j++) {
      const rr = j * PASSO_TABELA;
      let s = 0;
      for (let a = 0; a < ALL_ARMS.length; a++) {
        const arm = ALL_ARMS[a];
        const pw =
          arm.pairSign !== undefined
            ? 0.42 * (1 + armPairDepth(rr) * arm.pairSign)
            : arm.renderWeight ?? arm.weight;
        s += armActivityAtRadius(rr, arm) * pw;
        pesoDoBraco[j * ALL_ARMS.length + a] = s;
      }
      somaDoBraco[j] = s;
    }
  }
  // 1,68 = os quatro braços plenos (0,42·2 por par): ali metade no braço
  const SOMA_PLENA = 1.68;
  const seedArm = P ? new Uint8Array(N_SEED) : null;
  const sementesDeBraco = P ? new Int32Array(N_SEED) : null;
  const sementesFora = P ? new Int32Array(N_SEED) : null;
  let nSementesDeBraco = 0;
  let nSementesFora = 0;
  for (let i = 0; i < N_DISK; i++) {
    // Disco exponencial (Rd ≈ 2,6 kpc) truncado sem acumular uma
    // borda artificial. O raio de 16,8 kpc inclui a revisão de 2026
    // que desloca os braços externos cerca de 10% para fora.
    // Em uma superfície exponencial Σ∝e^(-R/Rd), a distribuição
    // radial é R·e^(-R/Rd): uma Gamma(k=2). Isso preenche o disco
    // inteiro em vez de colapsar quase todas as estrelas no núcleo.
    // AMOSTRAGEM ≠ MASSA (RBIAS): a massa segue Rd = 2,6 kpc, mas sortear
    // partículas COM esse perfil deixa a borda com poucas partículas por
    // pixel — cada uma forte demais, e o disco externo lê como pontinhos
    // gordos e espaçados em vez do tapete fino do alvo. Medido: granulação
    // do anel externo 0,179 contra 0,124. Subir cnt conserta lá mas estoura
    // o grão do miolo (0,070 → 0,053, alvo 0,068), porque adensa onde já
    // estava certo. Aqui o SORTEIO usa uma escala mais longa e o peso de
    // cada partícula devolve a razão massa/sorteio — importance sampling
    // clássico: mais amostras onde falta resolução, fluxo total intacto.
    let r = 0;
    do {
      r = -RD_SAMPLE * Math.log(Math.max(rnd() * rnd(), 1e-7));
    } while (r > GALACTIC_MODEL.diskRadiusPc);
    let k: number;
    let espesso = false;
    let inArm: boolean;
    if (!pesoDoBraco || !somaDoBraco) {
      k = pickArm();
      const activity = armActivityAtRadius(r, ALL_ARMS[k]);
      inArm = rnd() < 0.40 * activity;
    } else {
      espesso = rnd() < FRACAO_ESPESSO;
      const j = Math.min(nTabela - 1, Math.round(r / PASSO_TABELA));
      const soma = somaDoBraco[j];
      inArm =
        !espesso && rnd() < FRACAO_NO_BRACO * Math.min(1, soma / SOMA_PLENA);
      const t = rnd() * soma;
      k = 0;
      while (k < ALL_ARMS.length - 1 && pesoDoBraco[j * ALL_ARMS.length + k] < t) k++;
    }
    let arm = ALL_ARMS[k];
    const sigmaPerp = armWidthPc(r);
    // 2,8σ deixava a população estelar 2× mais estreita que o braço das
    // lâminas: uma fita brilhante dentro de um brilho largo. No alvo o
    // braço estelar é largo e a fenda de poeira é que é fina.
    const theta = !inArm
      ? rnd() * Math.PI * 2
      : P
        ? armThetaAtRadius(r, arm)
        : armThetaAtRadius(r, arm) +
          (gauss(rnd) * sigmaPerp * 11.0) / Math.max(r, 180);
    const flare = flareAtRadius(r);
    // A população jovem começa em σz≈20 pc; a velha produz o
    // componente fino de ~200 pc e ambos abrem no disco externo.
    // O espesso (P) é o hzThick do LUT_DISK, 610→1080 pc com o flare.
    const hz = espesso
      ? ((610 + flare * 470) * G) * HZS
      : (inArm ? 50 + flare * 210 : 510 + flare * 670) * HZS;
    let lx = r * Math.cos(theta);
    let ly = r * Math.sin(theta);
    if (P && inArm) {
      // desvio no PLANO, não em azimute: o jitter angular vira largura
      // r·Δθ·sen(pitch), que nos braços quase circulares de 3 kpc é zero
      // — eram os arames finos perto do centro.
      lx += gauss(rnd) * G * LARGURA_BRACO * sigmaPerp;
      ly += gauss(rnd) * G * LARGURA_BRACO * sigmaPerp;
    }
    let lz = warpHeightPc(r, theta) + gauss(rnd) * hz;

    if (seedCount < N_SEED && !espesso) {
      seedX[seedCount] = lx;
      seedY[seedCount] = ly;
      seedZ[seedCount] = lz;
      seedR[seedCount] = r;
      if (seedArm && sementesDeBraco && sementesFora) {
        seedArm[seedCount] = k;
        if (inArm) sementesDeBraco[nSementesDeBraco++] = seedCount;
        else sementesFora[nSementesFora++] = seedCount;
      }
      seedCount++;
    } else if (
      P
        ? !espesso &&
          rnd() < CLUMP_P * (1 - THREE.MathUtils.smoothstep(r, 11_000, 14_000))
        : rnd() < CLUMP
    ) {
      // Complexo: σ 120 pc–1 kpc, a escala das associações OB, das nuvens
      // gigantes e dos complexos que o alvo mostra como manchas. Com σ até
      // 420 pc as nuvens ficavam abaixo da resolução do quadro externo.
      // A semente já está distribuída por ρ, então aglutinar em volta dela
      // não desloca o perfil radial nem o desenho dos braços.
      //
      // CLUMP era 0,72 fixo, e as 9.000 sementes seguem o mesmo disco
      // exponencial: a 3 kpc elas distam 122 pc e se encavalam numa pasta
      // lisa; a 14 kpc distam 1.008 pc contra σ ~420 e viram ILHAS com
      // vazio entre elas. Medido no anel externo: agrupamento em escala
      // grande 0,400 contra 0,316 do alvo, granulação 0,179 contra 0,124.
      // Não é falta de amostra — cnt 1,6×/2,5× deixou o termo em
      // 0,406/0,417 (subiu) e ainda pagou harmonicError. É estrutura.
      // Só-partículas: a partícula de braço vai para uma semente de braço
      // (e herda o braço dela), a de fora para uma de fora — o grumo não
      // tira luz do braço para jogá-la no interbraço.
      let s: number;
      if (seedArm && sementesDeBraco && sementesFora) {
        s = inArm
          ? sementesDeBraco[(rnd() * nSementesDeBraco) | 0]
          : sementesFora[(rnd() * nSementesFora) | 0];
        if (inArm) arm = ALL_ARMS[seedArm[s]];
      } else {
        s = (rnd() * seedCount) | 0;
      }
      const sigma = 120 + rnd() * rnd() * (P ? 500 : 900);
      const g1 = gauss(rnd);
      const g2 = gauss(rnd);
      const g3 = gauss(rnd);
      const SHEAR_AQUI = P ? SHEAR_P : SHEAR;
      if (SHEAR_AQUI === 1) {
        lx = seedX[s] + g1 * sigma;
        ly = seedY[s] + g2 * sigma;
      } else {
        // Rotação diferencial: com curva plana (v ≈ 220 km/s) a borda de
        // dentro do complexo corre mais que a de fora, e um grumo de 400 pc
        // é esticado em ~640 pc a cada 100 Ma. Bola redonda só é honesta
        // abaixo de ~50 Ma. SHEAR = σ_θ/σ_R estica no sentido do giro.
        const inv = 1 / Math.max(seedR[s], 1);
        const ct = seedX[s] * inv;
        const st = seedY[s] * inv;
        const dR = g1 * sigma;
        const dT = g2 * sigma * SHEAR_AQUI;
        lx = seedX[s] + dR * ct - dT * st;
        ly = seedY[s] + dR * st + dT * ct;
      }
      lz = seedZ[s] + g3 * sigma * 0.45;
      r = seedR[s];
    }

    // p_massa/p_sorteio para a Gamma(k=2): a parte em r se cancela, sobra a
    // exponencial vezes a razão das NORMALIZAÇÕES (Z fecha em elementar
    // porque a Gamma é truncada em diskRadiusPc). DEPOIS da aglutinação de
    // propósito: 72% das partículas terminam no raio da SEMENTE, e pesar
    // pelo raio sorteado descorrelacionava peso e posição — o disco perdia
    // fluxo e a granulação da borda SUBIA (0,179 → 0,256), com cara de
    // "a ideia não paga". A ideia pagava; a conta é que estava no lugar errado.
    const rWeight = RBIAS === 1 ? 1 : W0 * Math.exp(-r * INV_DR);

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
    // Cor por TEMPERATURA, não por tripleto pintado. As três cores antigas
    // eram (0,72 0,83 1,00), (0,96 0,89 0,82) e (1,00 0,66 0,45), com purp
    // +0,030 / −0,000 / +0,065 — o alvo do anel externo é +0,317, fora do
    // que qualquer mistura delas alcança. O corpo negro real a 20000 K tem
    // purp +0,164, cinco vezes o azul pintado, porque um espectro quente de
    // verdade tem o verde bem abaixo da média de R e B.
    // Elas também carregavam brilho escondido (Y de 0,717 a 0,900): quem
    // decide brilho é `lum` logo abaixo, não a escolha de cor. blackbodyLinear
    // é Y ≈ 1 por construção, então isso some junto.
    // Só-partículas: inclinação 0,25 (as lâminas pesam ~30 % de jovens
    // na borda; 0,55 dava 62 % e ilhas azuis); o espesso é só velho.
    if (espesso) [cr, cg, cb] = p < 0.7 ? POP_OLD : POP_GIANT;
    else if (p < 0.07 + (P ? 0.25 : 0.55) * outward) [cr, cg, cb] = POP_YOUNG;
    else if (p < 0.80) [cr, cg, cb] = POP_OLD;
    else [cr, cg, cb] = POP_GIANT;
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
    // O braço DOMINANTE tem de ser mais brilhante que o interbraço — mas
    // por pouco (contraste 2–4 do alvo; calibrado na era dos 4 braços).
    // Desde a rodada 12 o par fraco (Sgr-Car, Norma) tinha renderWeight 0
    // em TODO raio: as partículas sorteadas para ele nasciam com alpha 0
    // (modelo Drimmel 2 braços; o gás é quem os desenha). Na rodada 30 a
    // profundidade da modulação passou a cair no disco externo — mesma
    // lei das lâminas, `armPairDepth` — e essas partículas voltam a
    // existir além de ~9 kpc, onde a população evoluída já não impõe os
    // dois braços. Deixar partícula e lâmina com leis diferentes seria
    // pincelada em dois braços sobre luz de quatro.
    // Rodada 15, medido e revertido: subir o interbraço para 0,76 não
    // moveu m=4 e piorou m=1 e grain — o m=4 residual não é vale de
    // partícula.
    const pairWeight =
      arm.pairSign !== undefined
        ? 0.42 * (1 + armPairDepth(r) * arm.pairSign)
        : arm.renderWeight ?? arm.weight;
    // Rodada 31: a crista é SEGMENTADA. A mesma lei das lâminas —
    // partícula e lâmina sob o mesmo contrato, como na rodada 30 — só
    // que aqui o ganho pesa o brilho da partícula de braço em vez da
    // densidade da lâmina. Fora do braço não há crista para quebrar.
    // Só-partículas: o par já pesou na ESCOLHA do braço, não no alpha.
    const armWeight = inArm
      ? (P ? 1 : pairWeight) *
        (0.72 + youngResponse * 0.38) *
        armBreakGain(r, Math.atan2(ly, lx))
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
      (0.094 / populationScale) * rWeight * lum * armWeight * (1 + 2.1 * outward) *
        innerDim(r) *
        // borda das lâminas (14,1–16,8 kpc) e a normalização do fluxo
        (P
          ? (1 - THREE.MathUtils.smoothstep(r, 14_100, 16_800)) *
            buracoDoDisco(r) *
            K_DISCO
          : 1)
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
    const theta = P
      ? localArmThetaAtRadius(r)
      : localArmThetaAtRadius(r) + (gauss(rnd) * armWidthPc(r) * 1.35) / r;
    const flare = flareAtRadius(r);
    let lx = r * Math.cos(theta);
    let ly = r * Math.sin(theta);
    if (P) {
      // Só-partículas: largura de Reid no plano (σ = w). O jitter angular
      // dava ~0,1 w de través e o esporão era o arame claro perto do Sol.
      lx += gauss(rnd) * G * armWidthPc(r);
      ly += gauss(rnd) * G * armWidthPc(r);
    }
    const lz =
      warpHeightPc(r, theta) + gauss(rnd) * (48 + flare * 100) * HZS;
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
    if (P) {
      // Só-partículas (σ abaixo são VERDADEIROS, ×G no gauss).
      if (rnd() < FRACAO_BP) {
        // Bojo boxy/peanut: x:y:z = 1:0,63:0,26 (Wegg & Gerhard 2013),
        // σx 900 pc; os dois lobos de sempre (|x| ≈ 1,75 kpc) dobram a
        // espessura fora do centro — o X do bojo de raspão.
        lx = gauss(rnd) * G * 900;
        ly = gauss(rnd) * G * 900 * 0.63;
        const peanutX = (Math.abs(lx) - 1750) / 980;
        lz =
          gauss(rnd) * G * 900 * 0.26 *
          (0.8 + 1.2 * Math.exp(-peanutX * peanutX));
      } else {
        // Barra longa (Wegg 2015): meia-largura 5 kpc com ponta macia,
        // σ 764 pc de través (a barra das lâminas) estreitando nas pontas,
        // e fina — σz 180 pc.
        const sign = rnd() < 0.5 ? -1 : 1;
        lx =
          sign * GALACTIC_MODEL.barHalfLengthPc * Math.pow(rnd(), 1.25) +
          gauss(rnd) * G * 250;
        const end = Math.min(1, Math.abs(lx) / GALACTIC_MODEL.barHalfLengthPc);
        ly = gauss(rnd) * G * 764 * (1 - 0.25 * end * end);
        lz = gauss(rnd) * G * 180;
      }
    } else if (rnd() < 0.74) {
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
      (0.025 + rnd() * 0.06) * innerDim(Math.hypot(lx, ly)) *
        (P ? (K_BOJO * N_BOJO_REF) / N_BULGE : 1)
    );
  }

  // ---- regiões HII — nós rosados/azuis colados nos braços ----
  for (let i = 0; i < N_HII; i++) {
    const inLocalArm = i < N_HII * 0.16;
    let arm: (typeof ALL_ARMS)[number];
    let r: number;
    // Só-partículas: o nó segue o MESMO peso de par das estrelas —
    // sorteio rejeitado pelo peso, não alpha 0 (o par fraco dentro de
    // 7,6 kpc fica sem nó, como fica sem estrela de braço).
    for (;;) {
      arm = ALL_ARMS[pickArm()];
      r = inLocalArm
        ? THREE.MathUtils.lerp(LOCAL_ARM.minRadiusPc, LOCAL_ARM.maxRadiusPc, rnd())
        : // uniforme em ÁREA. pow(rnd, 0.88) empilhava os nós no raio
          // máximo de cada braço e desenhava um arco rosado na borda.
          Math.sqrt(
            arm.minRadiusPc * arm.minRadiusPc +
              rnd() *
                (arm.maxRadiusPc * arm.maxRadiusPc -
                  arm.minRadiusPc * arm.minRadiusPc)
          );
      if (!P || inLocalArm || arm.pairSign === undefined) break;
      if (rnd() < (1 + armPairDepth(r) * arm.pairSign) / 2) break;
    }
    const sigmaPerp = armWidthPc(r);
    const theta = inLocalArm
      // 0,9σ contra os 11σ da população estelar: os nós saíam como uma
      // FITA rosa fina na crista, não como pontos espalhados pelo braço.
      ? P
        ? localArmThetaAtRadius(r)
        : localArmThetaAtRadius(r) + (gauss(rnd) * sigmaPerp * 3.2) / r
      : P
        ? armThetaAtRadius(r, arm)
        : armThetaAtRadius(r, arm) + (gauss(rnd) * sigmaPerp * 3.8) / r;
    let lx = r * Math.cos(theta);
    let ly = r * Math.sin(theta);
    if (P) {
      // Só-partículas: a largura de Reid inteira, no plano (σ = w) —
      // contas espalhadas pelo braço, não um fio.
      lx += gauss(rnd) * G * sigmaPerp;
      ly += gauss(rnd) * G * sigmaPerp;
    }
    const lz =
      warpHeightPc(r, theta) + gauss(rnd) * (46 + flareAtRadius(r) * 105) * HZS;
    const youngSupport = youngSupportAt(lx, ly);
    const youngResponse = effectiveYoungResponseAt(lx, ly);
    // 0,82 uniforme, não renderWeight: nós H II são GÁS ionizado e o gás
    // carrega 4 braços parecidos (Drimmel) — a dominância de 2 braços é
    // da emissão estelar evoluída, não da formação estelar. O par de
    // 3 kpc NÃO entra no 0,82: fica no peso do envelope de gás (0,43),
    // como nas variantes uniformes dos mapas — são braços de gás sem
    // formação estelar, e 0,82 ali devolveria ao anel interno o m=4 que
    // o ajuste 0,51→0,43 removeu.
    const armWeight =
      (inLocalArm
        ? LOCAL_ARM.weight
        : arm.symIndex === undefined
          ? arm.weight
          : 0.82) *
      // A supressão por youngSupport evita contar duas vezes com as 1.413
      // regiões WISE de starForges — mas essas são heliocêntricas, só do
      // nosso lado. O piso (0,45) ainda amarrava o resto do disco ao
      // catálogo: onde ele cala, o nó sumia. Mesma inversão do resto —
      // o braço define que HÁ formação estelar, o catálogo modula quanta.
      (1 - youngSupport * 0.55) *
      (0.85 + youngResponse * 0.30);
    // Nós compactos (25–120 pc) leem como pontos vermelhos/azuis nos
    // braços; 35–175 pc viravam manchas difusas que sumiam no fundo.
    // O nó ionizado e o aglomerado que o ioniza, cada um com o espectro que
    // tem. Eram (1,00 0,30 0,44) e (0,55 0,74 1,00): o primeiro com purp
    // +0,420 — mais púrpura que a física — mas Y = 0,459, ou seja ESCURO,
    // e o segundo com purp +0,035, um "azul jovem" quase neutro que puxava
    // a média para baixo. Trocados pelas populações de verdade, o nó perde
    // um pouco de matiz e ganha 2,2× de fluxo (Y = 1), e o aglomerado sobe
    // de +0,035 para +0,164. O peso da cor na média do anel é o fluxo.
    // Os fatores 0,459 e 0,716 são os Y das cores antigas: as populações têm
    // Y = 1, então trocar a cor sozinha multiplicava o fluxo destes nós por
    // 2,2× e 1,4×. Como eles moram sobre os braços, isso é contraste de braço
    // disfarçado de mudança de cor — medido na rodada 06: m=1, m=3, m=5 e m=6
    // pioraram JUNTOS, que é a assinatura de intermodulação que
    // VISUAL_TARGETS.md já registra como beco. Cor decide matiz, alpha decide
    // fluxo, e nunca os dois na mesma medição.
    if (rnd() < 0.62) {
      put(
        lx, ly, lz,
        POP_HII[0], POP_HII[1], POP_HII[2],
        P ? 10 + rnd() * 30 : 30 + rnd() * 110,
        // De 33 kpc um nó de 70 pc tem ~2,7 px: para LER como ponto
        // vermelho precisa de contraste, não de tamanho — aumentar o
        // raio só o dissolveria no fundo.
        (0.05 + rnd() * 0.115) * armWeight * 0.459 * (P ? K_HII * (1 - THREE.MathUtils.smoothstep(r, 14_100, 16_800)) : 1)
      );
    } else {
      put(
        lx, ly, lz,
        POP_YOUNG[0], POP_YOUNG[1], POP_YOUNG[2],
        P ? 10 + rnd() * 30 : 30 + rnd() * 110,
        (0.05 + rnd() * 0.11) * armWeight * 0.716 * (P ? K_HII * (1 - THREE.MathUtils.smoothstep(r, 14_100, 16_800)) : 1)
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

  // EMBARALHA O BUFFER UMA VEZ (item 149). As populações nascem em
  // SEQUÊNCIA (disco, esporão local, bojo, HII, halo, anã de Sagitário):
  // um PREFIXO cru teria só disco, nunca bojo nem HII. O ajuste
  // "Partículas da galáxia" desenha só um prefixo (`Galaxy.
  // setFracaoDeParticulas`, `drawRange`) para cortar o custo de vértice
  // mantendo o fluxo total — e para o prefixo ser amostra REPRESENTATIVA
  // de TODAS as populações, e não só do disco, embaralhamos o buffer
  // inteiro uma vez, com o MESMO RNG semeado (Fisher–Yates):
  // determinístico, sem outro gerador e sem custo extra de memória.
  for (let i = brightCount - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    if (j === i) continue;
    const oi = i * 8;
    const oj = j * 8;
    for (let k = 0; k < 8; k++) {
      const tmp = bright[oi + k];
      bright[oi + k] = bright[oj + k];
      bright[oj + k] = tmp;
    }
  }

  return { bright, brightCount };
}
