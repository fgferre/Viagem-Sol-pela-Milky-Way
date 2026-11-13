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
  LOCAL_ARM_EXTERNAL_WEIGHT,
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

/**
 * ?galaxia=particulas — CÉLULAS DO NÍVEL DE DETALHE. A grade é quadrada no
 * plano galáctico (z não se divide), 1 kpc de lado em ±20 kpc; quem cai
 * fora vai para a célula da borda. Estrela jovem resolvida, nó H II,
 * aglomerado (tipos 3–5), halo e anã (6) são indivíduos ou esparsos: ficam
 * num intervalo global no FIM do buffer, a chave CELULAS_DA_GRADE. O
 * aglomerado nuclear (8) também: 500 pontos num só pixel.
 * O BOJO E A BARRA (2) são a única população de fato 3D: na coluna do disco
 * a densidade média da célula valia para o plano, e acima dele o bojo saía
 * podado como se fosse tão denso quanto o miolo — grãos soltos de raspão.
 * Ele tem células próprias, a mesma grade em fatias de z de 200 pc. O disco
 * espesso (1) é o outro 3D (hz 0,6–1 kpc) e saía em pontos laranja soltos
 * acima do plano pelo mesmo motivo: células de 2 kpc em fatias de 500 pc
 * (grossas para o plano de cada quadro seguir barato).
 */
export const LADO_DA_CELULA_PC = 1000;
export const CELULAS_POR_LADO = 40;
export const CELULAS_DA_GRADE = CELULAS_POR_LADO * CELULAS_POR_LADO;
const FATIA_DO_BOJO_PC = 200;
const FATIAS_DO_BOJO = 13; // ±6 fatias; quem passa fica na última
const BASE_DO_ESPESSO = CELULAS_DA_GRADE + 1 + CELULAS_DA_GRADE * FATIAS_DO_BOJO;
const FATIA_DO_ESPESSO_PC = 500;
const FATIAS_DO_ESPESSO = 7;
const CHAVES_DAS_CELULAS =
  BASE_DO_ESPESSO + (CELULAS_DA_GRADE / 4) * FATIAS_DO_ESPESSO;
/** lado no plano (pc) da célula de uma chave */
export const ladoDaChave = (chave: number) =>
  chave >= BASE_DO_ESPESSO ? 2 * LADO_DA_CELULA_PC : LADO_DA_CELULA_PC;
export function celulaDaParticula(bright: Float32Array, i: number): number {
  const o = i * 8;
  const tipo = Math.floor(bright[o + 6] * 0.001);
  if ((tipo >= 3 && tipo <= 6) || tipo === 8) return CELULAS_DA_GRADE;
  const qx = bright[o] - GAL.GC_POS.x;
  const qy = bright[o + 1] - GAL.GC_POS.y;
  const qz = bright[o + 2] - GAL.GC_POS.z;
  const meio = CELULAS_POR_LADO / 2;
  const ix = Math.min(CELULAS_POR_LADO - 1, Math.max(0,
    Math.floor((qx * EX.x + qy * EX.y + qz * EX.z) / LADO_DA_CELULA_PC + meio)));
  const iy = Math.min(CELULAS_POR_LADO - 1, Math.max(0,
    Math.floor((qx * EY.x + qy * EY.y + qz * EY.z) / LADO_DA_CELULA_PC + meio)));
  if (tipo !== 2 && tipo !== 1) return iy * CELULAS_POR_LADO + ix;
  const z = qx * EZ.x + qy * EZ.y + qz * EZ.z;
  const fatia = (n: number, passo: number) =>
    Math.min(n - 1, Math.max(0, Math.round(z / passo) + (n - 1) / 2));
  if (tipo === 1) {
    const meio2 = CELULAS_POR_LADO / 2;
    return BASE_DO_ESPESSO +
      ((iy >> 1) * meio2 + (ix >> 1)) * FATIAS_DO_ESPESSO +
      fatia(FATIAS_DO_ESPESSO, FATIA_DO_ESPESSO_PC);
  }
  return CELULAS_DA_GRADE + 1 + (iy * CELULAS_POR_LADO + ix) * FATIAS_DO_BOJO +
    fatia(FATIAS_DO_BOJO, FATIA_DO_BOJO_PC);
}

/**
 * Ordena o buffer por célula, ESTÁVEL: o embaralhamento de antes fica
 * dentro de cada célula, então qualquer prefixo dela é subamostra sem viés.
 * Contagem + permutação no lugar (sem cópia de 128 MiB).
 */
function ordenarPorCelula(bright: Float32Array, n: number) {
  const chave = new Uint16Array(n);
  const contagem = new Uint32Array(CHAVES_DAS_CELULAS + 1);
  for (let i = 0; i < n; i++) {
    chave[i] = celulaDaParticula(bright, i);
    contagem[chave[i] + 1]++;
  }
  for (let c = 1; c < contagem.length; c++) contagem[c] += contagem[c - 1];
  const destino = new Uint32Array(n);
  for (let i = 0; i < n; i++) destino[i] = contagem[chave[i]]++;
  for (let i = 0; i < n; i++) {
    while (destino[i] !== i) {
      const j = destino[i];
      const oi = i * 8;
      const oj = j * 8;
      for (let k = 0; k < 8; k++) {
        const tmp = bright[oi + k];
        bright[oi + k] = bright[oj + k];
        bright[oj + k] = tmp;
      }
      destino[i] = destino[j];
      destino[j] = j;
    }
  }
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
  // Medido (cinema, em Y): bojo + barra + núcleo 3,7 % → 11 % → 15 % (massa
  // publicada 15–30 %, luz no infravermelho ~20 %, menos no visível), nós
  // H II 3 % (K_HII_FLUXO, o fluxo médio de um nó; K_HII fica só nos
  // aglomerados), e o disco (tipos 0, 1, 3) fecha o fluxo TOTAL das
  // partículas igual ao de sempre — o GANHO_DAS_LAMINAS (galaxy.ts) vale.
  const K_BOJO = 4.53;
  const K_DISCO = 1.0834;
  const K_HII = 2.92;
  const K_HII_FLUXO = 235;
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

  // Só-partículas: o TIPO da partícula viaja no milhar do tamanho (o
  // tamanho em pc fica abaixo de 1000; o shader separa os dois). Cada tipo
  // é desenhado como o que é: fundo não resolvido (núcleo mínimo) ou
  // objeto resolvido (ponto nítido). Ver GALAXY_VERT.
  // 0 disco fino (fundo) · 1 disco espesso · 2 bojo/barra · 3 estrela
  // jovem de braço resolvida · 4 nó H II · 5 aglomerado jovem · 6 halo e
  // anã · 7 esporão
  const put = (
    lx: number, ly: number, lz: number,
    cr: number, cg: number, cb: number,
    size: number, alpha: number, tipo = 0
  ) => {
    const o = b * 8;
    localToWorld(lx, ly, lz, bright, o);
    bright[o + 3] = cr;
    bright[o + 4] = cg;
    bright[o + 5] = cb;
    bright[o + 6] = P ? size + 1000 * tipo : size;
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
  // fração jovem do disco fino = JOVEM_0 + JOVEM_1·outward (ver a cor)
  const JOVEM_0 = 0.1;
  const JOVEM_1 = 0.45;
  const JOVEM_NO_BRACO = 0.8;
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
    // Só-partículas: A LUZ JOVEM MORA NOS BRAÇOS. A fração jovem do disco
    // fino (contagem = luz: toda população tem o mesmo fluxo médio por
    // partícula) cresce para fora como antes, mas não cai igual em braço e
    // interbraço: JOVEM_NO_BRACO dela é o excesso do braço, e o velho fica
    // quase liso (o braço da luz velha é fraco: contraste K de 1,2–2 em
    // espirais tardias, contra o Hα e o UV quase só nos braços). Gigantes
    // seguem 20 % em todo lugar; o espesso é só velho. Medido no ensaio 6:
    // jovens 30 % da luz do disco (eram 19 %, a inclinação 0,25 + o espesso
    // e a barra só velhos), braço mais azul que o interbraço.
    let jovem: boolean;
    if (!P) jovem = p < 0.07 + 0.55 * outward;
    else if (espesso || !somaDoBraco) jovem = false;
    else {
      const fJ = JOVEM_0 + JOVEM_1 * outward;
      const a =
        FRACAO_NO_BRACO *
        Math.min(1, somaDoBraco[Math.min(nTabela - 1, Math.round(r / PASSO_TABELA))] / SOMA_PLENA);
      const noBraco = Math.min(0.8, (fJ * JOVEM_NO_BRACO) / Math.max(a, 1e-6));
      jovem = p < (inArm ? noBraco : Math.max(0, (fJ - a * noBraco) / (1 - a)));
    }
    if (espesso) [cr, cg, cb] = p < 0.7 ? POP_OLD : POP_GIANT;
    else if (jovem) [cr, cg, cb] = POP_YOUNG;
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
    // Só-partículas: CADA TIPO COM A LUZ DO QUE É. A partícula de fundo
    // (disco velho, espesso, jovem fora do braço) soma milhares de estrelas
    // não resolvidas, e a soma não tem a loteria de brilho de uma estrela
    // só: brilho fixo na média da lei de cima (1,6748). A estrela jovem de
    // BRAÇO segue u^-0,75 (teto 100; dN/dL ≈ L^-1,75, a função de
    // luminosidade de aglomerados): os 5 % mais brilhantes viram objetos
    // RESOLVIDOS com 37 % da luz jovem do braço (a lei de cima põe 15 %);
    // os outros 95 % ficam no fundo com a média deles (2,2195), sem o meio
    // da cauda que só fazia areia. 0,4994 = 1,6748 ÷ 3,3537 (as médias): o
    // fluxo médio por partícula é o de antes, em todo tipo.
    const uLum = Math.max(rnd(), 1e-4);
    const resolvida = P && jovem && inArm && uLum < 0.05;
    const lum = !P
      ? Math.min(7, Math.pow(uLum, -0.42)) / 1.72
      : jovem && inArm
        ? ((resolvida ? Math.min(100, Math.pow(uLum, -0.75)) : 2.2195) * 0.4994) / 1.72
        : 1.6748 / 1.72;
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
          : 1),
      espesso ? 1 : resolvida ? 3 : 0
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
        (0.62 + effectiveYoungResponseAt(lx, ly) * 0.38),
      7
    );
  }

  // ---- bojo + barra longa, inclinada ~29° ------------------
  const barAng = GALACTIC_MODEL.barAngleRad;
  const cosB = Math.cos(barAng);
  const sinB = Math.sin(barAng);
  // Só-partículas: o NÚCLEO sai de um gerador à parte, para o sorteio
  // principal (e com ele H II, halo, anã e o embaralhamento) seguir o mesmo.
  const rndN = P ? mulberry32(seed ^ 0x2545f491) : rnd;
  // Disco estelar nuclear (Launhardt, Zylka & Mezger 2002, de memória:
  // ~1,4e9 M☉, ρ ∝ R^−0,1 até 120 pc, R^−3,5 até 220 pc e R^−10 depois,
  // altura de escala 45 pc) e aglomerado nuclear (Schödel 2014; Neumayer
  // 2020, de memória: 2,5e7 M☉, r_eff 4,2 pc, achatado 0,71). Com ~2e10 M☉
  // de barra + bojo (Portail 2017, de memória) são 5 % e 0,13 % da luz
  // deles, tirados do bojo boxy (mesmo M/L): sem eles o centro era o miolo
  // chato de uma gaussiana de 900 pc — o mais claro ficava a 500 pc.
  const FRACAO_NSD = 0.05 / FRACAO_BP;
  const FRACAO_NSC = 0.0013 / FRACAO_BP;
  const perfilNSD = (r: number) =>
    r < 120 ? Math.pow(Math.max(r, 1) / 120, -0.1)
      : r < 220 ? Math.pow(r / 120, -3.5)
        : Math.pow(220 / 120, -3.5) * Math.pow(r / 220, -10);
  // ALTURA DE ESCALA AO LONGO DA BARRA (bojo b/p e barra longa: uma
  // estrutura só). Wegg, Gerhard & Portail 2015 (arXiv 1504.01401, fig. 9,
  // exponencial das gigantes do ramo vermelho): curta no eixo menor, sobe a
  // um pico perto do fim do b/p (5,5° em l ≈ 7°, ~640 pc a ~1,8 kpc do
  // centro pela geometria da barra a 27°) e cai pela barra longa (~2,3° em
  // l = 12°, ~240 pc a 2,7 kpc; 180 pc a 5,2 kpc de nós, ~3,8 kpc do
  // centro). No eixo menor, 180 pc (Wegg & Gerhard 2013, arXiv 1308.0593:
  // exponenciais 0,70 : 0,44 : 0,18 kpc; X a partir de ~400 pc). Era 194 pc
  // no bojo com lobos 1,8× a 1,75 kpc e σz 180 gaussiano na barra longa: de
  // lado, a 1,5 kpc do centro a luz caía com ~120 pc, um quinto do medido.
  const alturaNaBarra = (x: number) => {
    const d = (Math.abs(x) - 1800) / (Math.abs(x) < 1800 ? 1000 : 650);
    return 180 + 460 * Math.exp(-d * d);
  };
  const zExponencial = (h: number) =>
    (rndN() < 0.5 ? -h : h) * Math.log(1 / Math.max(rndN(), 1e-9));
  for (let i = 0; i < N_BULGE; i++) {
    let lx: number;
    let ly: number;
    let lz: number;
    let tipoB = 2;
    if (P) {
      // Só-partículas (σ abaixo são VERDADEIROS, ×G no gauss).
      if (rnd() < FRACAO_BP) {
        // Bojo boxy/peanut: x:y = 1:0,63 (Wegg & Gerhard 2013), σx 900 pc.
        lx = gauss(rnd) * G * 900;
        ly = gauss(rnd) * G * 900 * 0.63;
        gauss(rnd); // o z de antes, só para o sorteio principal seguir igual
        lz = zExponencial(alturaNaBarra(lx));
        const v = rndN();
        if (v < FRACAO_NSC) {
          tipoB = 8;
          lx = gauss(rndN) * G * 3.6;
          ly = gauss(rndN) * G * 3.6;
          lz = gauss(rndN) * G * 3.6 * 0.71;
        } else if (v < FRACAO_NSC + FRACAO_NSD) {
          // R ∝ R·Σ(R) por rejeição (Σ com a forma de ρ: o disco é fino)
          let r = 0;
          for (;;) {
            r = rndN() * 400;
            if (rndN() < (r / 120) * perfilNSD(r)) break;
          }
          const a = rndN() * 2 * Math.PI;
          lx = r * Math.cos(a);
          ly = r * Math.sin(a);
          const w = Math.max(rndN(), 1e-9);
          lz = (rndN() < 0.5 ? -45 : 45) * Math.log(w);
        }
      } else {
        // Barra longa (Wegg 2015): meia-largura 5 kpc com ponta macia,
        // σ 764 pc de través (a barra das lâminas) estreitando nas pontas,
        // e a altura de escala da barra (acima): alta onde ela atravessa o
        // b/p, 180 pc exponencial na parte longa.
        const sign = rnd() < 0.5 ? -1 : 1;
        lx =
          sign * GALACTIC_MODEL.barHalfLengthPc * Math.pow(rnd(), 1.25) +
          gauss(rnd) * G * 250;
        const end = Math.min(1, Math.abs(lx) / GALACTIC_MODEL.barHalfLengthPc);
        ly = gauss(rnd) * G * 764 * (1 - 0.25 * end * end);
        gauss(rnd); // o z de antes, só para o sorteio principal seguir igual
        lz = zExponencial(alturaNaBarra(lx));
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
    const uDim = rnd();
    const uTam = rnd();
    const uAlfa = rnd();
    // Só-partículas: o bojo é a população mais velha e menos resolvida —
    // cada partícula é a soma de milhares de estrelas, sem loteria de
    // brilho. As médias de antes (cor 0,75, tamanho² 63, alpha 0,055): o
    // fluxo médio por partícula fica, a variância de 1,6× some.
    const dim = P ? 0.75 : 0.5 + 0.5 * uDim;
    put(
      lx,
      ly,
      lz,
      1.0 * dim,
      0.72 * dim,
      0.46 * dim,
      P ? Math.sqrt(63) : 3 + uTam * 9,
      (P ? 0.055 : 0.025 + uAlfa * 0.06) * innerDim(Math.hypot(lx, ly)) *
        (P ? (K_BOJO * N_BOJO_REF) / N_BULGE : 1),
      tipoB
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
      if (P) {
        // Só-partículas: POUCOS E FORTES. Luminosidade dN/dL ∝ L^−2 (a
        // função de luminosidade Hα das H II de espirais, Kennicutt 1989),
        // três décadas (1–1000, média 1 + ln 1000): os ~3 % acima de 30
        // levam metade da luz e são os nós que se veem de fora. Raio de
        // Strömgren ∝ L^⅓ (10–100 pc). O fluxo é alpha·tamanho², então
        // alpha = L/tamanho²: o nó ganha luz por ser luminoso, não grande.
        const L = Math.min(1000, 1 / Math.max(rnd(), 0.001));
        const tam = 10 * Math.cbrt(L);
        put(
          lx, ly, lz,
          POP_HII[0], POP_HII[1], POP_HII[2],
          tam,
          ((K_HII_FLUXO * L) / (7.9078 * tam * tam)) * armWeight *
            (1 - THREE.MathUtils.smoothstep(r, 14_100, 16_800)),
          4
        );
      } else {
        put(
          lx, ly, lz,
          POP_HII[0], POP_HII[1], POP_HII[2],
          30 + rnd() * 110,
          // De 33 kpc um nó de 70 pc tem ~2,7 px: para LER como ponto
          // vermelho precisa de contraste, não de tamanho — aumentar o
          // raio só o dissolveria no fundo.
          (0.05 + rnd() * 0.115) * armWeight * 0.459,
          4
        );
      }
    } else {
      put(
        lx, ly, lz,
        POP_YOUNG[0], POP_YOUNG[1], POP_YOUNG[2],
        P ? 10 + rnd() * 30 : 30 + rnd() * 110,
        (0.05 + rnd() * 0.11) * armWeight * 0.716 * (P ? K_HII * (1 - THREE.MathUtils.smoothstep(r, 14_100, 16_800)) : 1),
        5
      );
    }
  }

  // ---- halo estelar esparso ----
  for (let i = 0; i < N_HALO; i++) {
    const r = 4000 + 18000 * Math.pow(rnd(), 1.7);
    const a = rnd() * Math.PI * 2;
    const u = rnd() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    put(r * s * Math.cos(a), r * s * Math.sin(a), r * u, 0.9, 0.85, 0.8, 3 + rnd() * 9, 0.055, 6);
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
      0.018 + rnd() * 0.045,
      6
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
  // só-partículas: o embaralhamento acima vira a ordem DENTRO de cada célula
  if (P) ordenarPorCelula(bright, brightCount);

  return { bright, brightCount };
}

// ============================================================
// ?galaxia=particulas — A POEIRA COMO POPULAÇÃO DE NUVENS.
// Cada nuvem é uma partícula (centro no plano, elipse gaussiana, massa de
// gás). Elas não são desenhadas como luz: `tauDasNuvens` as soma vistas de
// cima no mapa τ⊥ que a extinção por partícula já lê (GALAXY_VERT). O perfil
// vertical é o da camada do shader, no warp: gaussiana σ 58 pc com flare para
// o molecular, fendas e CMZ; sech² de 134 pc com flare para o atômico
// (POEIRA_ATOMICA, galaxyShaders.ts). É a distribuição em z das nuvens por
// construção, então não se guarda z.
//
// Fontes (de memória da literatura, salvo onde diz o arquivo):
// · κ: N_H/A_V = 1,87e21 cm⁻² (Bohlin 1978, R_V 3,1) ⇒ τ_V = 0,045 por
//   M☉/pc² de gás total (com hélio ×1,36), escalado pelo gradiente de
//   metalicidade −0,05 dex/kpc (Luck & Lambert 2011), plano dentro de 4 kpc.
// · Gás molecular: anel de 3–6 kpc e queda para fora (Heyer & Dame 2015;
//   Nakanishi & Sofue 2006); quase vazio dentro da barra, salvo as fendas
//   da barra e a CMZ (Sormani & Barnes 2019; Molinari 2011, ~3e7 M☉).
// · Nuvens: dN/dM ∝ M^−1,7 (Solomon 1987; Rice 2016; Miville-Deschênes
//   2017), Σ ≈ 40 M☉/pc² por nuvem (Heyer 2009; Miville-Deschênes 2017).
// · Fenda na borda INTERNA do braço (choque de densidade, Roberts 1969),
//   que fecha perto da corrotação das espirais, ~10–11 kpc (Gerhard 2011).
// · O gás traça os QUATRO braços; as estrelas velhas, o par dominante
//   (Drimmel 2000; Churchwell 2009) — por isso aqui não há peso de par.
// · Fendas da barra no bordo que AVANÇA (Athanassoula 1992). A galáxia gira
//   para θ decrescente nesta base (o Sol, em +X, anda para −Y).
// ============================================================
export interface NuvensDePoeira {
  n: number;
  /** stride 6: x, y (pc, plano galactocêntrico), σ maior, σ menor (pc),
   *  ângulo do eixo maior (rad), massa de gás (M☉) */
  dados: Float32Array;
  /** massa por componente (M☉), para medir */
  massas: Record<string, number>;
  /** [início, fim) das nuvens do gás atômico difuso — a camada espessa */
  atomicas: [number, number];
}

/** τ_V por M☉/pc² de gás total no raio R (ver as fontes acima) */
export const kappaDaPoeira = (r: number) =>
  0.045 * Math.pow(10, -0.05 * (Math.max(r, 4000) - 8150) / 1000);

const SIGMA_DA_NUVEM = 40; // M☉/pc²
const CORROTACAO_INI = 8000;
const CORROTACAO_FIM = 12000;

export function gerarNuvensDePoeira(seed = 20260737): NuvensDePoeira {
  const rnd = mulberry32(seed);
  const ss = THREE.MathUtils.smoothstep;
  const nor = () => {
    const u = Math.max(rnd(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  };
  const lista: number[] = [];
  const massas: Record<string, number> = {};
  const massaDoEspectro = (mMin: number, mMax: number) => {
    const a = -0.7; // 1 − 1,7
    const lo = Math.pow(mMin, a), hi = Math.pow(mMax, a);
    return Math.pow(lo + rnd() * (hi - lo), 1 / a);
  };
  // nuvem de massa M: raio pela Σ da nuvem, gaussiana de mesma área a meia
  // altura, alongada q:1 na direção φ
  const por = (
    comp: string, x: number, y: number, m: number, phi: number, q: number, sMin = 0,
    sigmaNuvem = SIGMA_DA_NUVEM
  ) => {
    const s = Math.max(0.7 * Math.sqrt(m / (Math.PI * sigmaNuvem)), sMin);
    lista.push(x, y, s * Math.sqrt(q), s / Math.sqrt(q), phi, m);
    massas[comp] = (massas[comp] ?? 0) + m;
  };

  // Σ de gás (M☉/pc², média azimutal). Molecular: anel + exponencial, buraco
  // dentro da barra. Atômico: plano até 13 kpc, raso na barra.
  // O anel começa em 3 kpc (patamar 3–5,5, meia altura ~2,5 kpc); as fendas
  // da barra seguem visíveis por dentro. SIGMA_AT não é o HI medido (~6 com
  // hélio): é o τ_V entre braços de pares de galáxias que se ocultam (Keel &
  // White) e de modelos de M33, 0,1–0,2 — mediana de τ⊥ em 3–8 kpc 0,41 → 0,15
  // (mapa 1024², as fendas como estavam).
  const SIGMA_MOL = 8.5; // em 5 kpc, com hélio
  const forma = (r: number) =>
    ss(r, 2000, 3000) *
    (Math.exp(-(r - 4000) / 4000) + 0.6 * Math.exp(-0.5 * ((r - 5000) / 1000) ** 2));
  const sigmaMol = (r: number) => (SIGMA_MOL / forma(5000)) * forma(r);
  const SIGMA_AT = 2.0;
  const sigmaAt = (r: number) =>
    SIGMA_AT * (0.2 + 0.8 * ss(r, 2000, 3500)) *
    (r < 13000 ? 1 : Math.exp(-(r - 13000) / 3000));
  const R_MAX = 16000;
  // massa total de um perfil Σ(R) e sorteio de R ∝ Σ·R (rejeição)
  const massaDoPerfil = (sig: (r: number) => number) => {
    let s = 0;
    for (let r = 25; r < R_MAX; r += 50) s += sig(r) * 2 * Math.PI * r * 50;
    return s;
  };
  const picoDoPerfil = (sig: (r: number) => number) => {
    let p = 0;
    for (let r = 25; r < R_MAX; r += 50) p = Math.max(p, sig(r) * r);
    return p;
  };
  const sortearR = (sig: (r: number) => number, pico: number) => {
    for (;;) {
      const r = rnd() * R_MAX;
      if (rnd() * pico < sig(r) * r) return r;
    }
  };

  // os braços do gás: as quatro famílias com peso igual, os de 3 kpc e o
  // esporão Local
  const loc = LOCAL_ARM;
  const atividadeLocal = (r: number) =>
    ss(r, loc.gate.risePc[0], loc.gate.risePc[1]) *
    (1 - ss(r, loc.gate.fallPc[0], loc.gate.fallPc[1]));
  const NB = ALL_ARMS.length + 1;
  const thetaDe = (r: number, k: number) =>
    k < ALL_ARMS.length ? armThetaAtRadius(r, ALL_ARMS[k]) : localArmThetaAtRadius(r);
  const pesoDe = (r: number, k: number) =>
    k < ALL_ARMS.length
      ? armActivityAtRadius(r, ALL_ARMS[k]) * (ALL_ARMS[k].symIndex === undefined ? 0.6 : 1)
      : atividadeLocal(r) * LOCAL_ARM_EXTERNAL_WEIGHT;
  const pesos = new Float64Array(NB);
  const sortearBraco = (r: number) => {
    let s = 0;
    for (let k = 0; k < NB; k++) s += pesos[k] = pesoDe(r, k);
    if (s < 0.05) return -1;
    let t = rnd() * s, k = 0;
    while (k < NB - 1 && (t -= pesos[k]) > 0) k++;
    return k;
  };
  // ponto da crista do braço k em r, tangente e normal para DENTRO
  const crista = (r: number, k: number) => {
    const th = thetaDe(r, k);
    const dth = (thetaDe(r + 25, k) - thetaDe(r - 25, k)) / 50;
    const c = Math.cos(th), s = Math.sin(th);
    let tx = c - r * s * dth, ty = s + r * c * dth;
    const tl = Math.hypot(tx, ty);
    tx /= tl; ty /= tl;
    // (−ty, tx)·r̂ = −r·θ' < 0: aponta para dentro (θ cresce com R)
    return { x: r * c, y: r * s, tx, ty, nx: -ty, ny: tx };
  };

  // ---- 1. gás molecular dos braços: fenda + espalhado + entre-braços ----
  const massaMol = massaDoPerfil(sigmaMol);
  const picoMol = picoDoPerfil(sigmaMol);
  const FRACAO_FENDA = 0.6;
  const FRACAO_ESPALHADO = 0.25; // o resto (0,15) entre os braços
  for (let acc = 0; acc < massaMol; ) {
    const r = sortearR(sigmaMol, picoMol);
    const u = rnd();
    const w = armWidthPc(r);
    let k = -1;
    if (u < FRACAO_FENDA + FRACAO_ESPALHADO) k = sortearBraco(r);
    if (k < 0) {
      // entre os braços (ou raio sem braço): nuvens menores, giro qualquer
      const m = massaDoEspectro(1e4, 3e5);
      const th = rnd() * 2 * Math.PI;
      por('molEntre', r * Math.cos(th), r * Math.sin(th), m, rnd() * Math.PI, 1 + rnd());
      acc += m;
      continue;
    }
    const cr = crista(r, k);
    // a fenda fica ~1 largura de Reid para dentro da crista estelar e fecha
    // na corrotação; o espalhado sai da fenda rio abaixo, pela crista
    const desloc = w * (1 - ss(r, CORROTACAO_INI, CORROTACAO_FIM));
    const fenda = u < FRACAO_FENDA;
    const n = fenda ? desloc + nor() * 0.5 * w : desloc - Math.abs(nor()) * 1.2 * w;
    const along = nor() * 0.5 * w; // o sorteio em r já espalha ao longo
    const x = cr.x + cr.nx * n + cr.tx * along;
    const y = cr.y + cr.ny * n + cr.ty * along;
    const m = massaDoEspectro(3e4, 5e6);
    // alongadas ao longo do braço, q 1,5–4 (mais que isso a fenda vira fio
    // de 1 texel e some na vista de cima)
    const phi = Math.atan2(cr.ty, cr.tx) + nor() * (fenda ? 0.15 : 0.3);
    por(fenda ? 'molFenda' : 'molBraco', x, y, m, phi, 1.5 + 2.5 * rnd());
    acc += m;
  }

  // ---- 2. gás atômico difuso: nuvens largas e ralas; 30 % nos braços ----
  const iniAt = lista.length / 6;
  const massaAt = massaDoPerfil(sigmaAt);
  const picoAt = picoDoPerfil(sigmaAt);
  for (let acc = 0; acc < massaAt; ) {
    const r = sortearR(sigmaAt, picoAt);
    const k = rnd() < 0.3 ? sortearBraco(r) : -1;
    let x: number, y: number, phi: number;
    if (k >= 0) {
      const cr = crista(r, k);
      const n = nor() * 1.5 * armWidthPc(r);
      x = cr.x + cr.nx * n;
      y = cr.y + cr.ny * n;
      phi = Math.atan2(cr.ty, cr.tx);
    } else {
      const th = rnd() * 2 * Math.PI;
      x = r * Math.cos(th);
      y = r * Math.sin(th);
      phi = th + Math.PI / 2;
    }
    // σ 120–480 pc (log-uniforme), cada uma com ~¼ da Σ local (um meio
    // morno quase contínuo: ~4 nuvens se sobrepõem), dispersão de fator ~1,6
    const s = 120 * Math.pow(4, rnd());
    const m = 0.5 * Math.PI * s * s * sigmaAt(r) * Math.exp(0.5 * nor() - 0.125);
    por('atomico', x, y, m, phi, 1 + rnd(), s);
    acc += m;
  }

  const fimAt = lista.length / 6;

  // ---- 3. fendas da barra e CMZ (no referencial da barra) ----
  const cb = Math.cos(GALACTIC_MODEL.barAngleRad), sb = Math.sin(GALACTIC_MODEL.barAngleRad);
  const daBarra = (bx: number, by: number) => [bx * cb - by * sb, bx * sb + by * cb];
  const MASSA_FENDAS_BARRA = 6e7;
  // paralelas ao eixo no bordo da barra estelar (σ de través 764 pc, acima)
  // e curvando para dentro até a borda da CMZ (~250 pc) no primeiro terço
  const L0 = 300, L1 = 4000, D0 = 250, D1 = 850;
  for (let acc = 0; acc < MASSA_FENDAS_BARRA; ) {
    const lado = rnd() < 0.5 ? -1 : 1;
    const t = rnd();
    const ax = L0 + (L1 - L0) * t;
    if (rnd() > ss(t, 0, 0.08) * (1 - ss(t, 0.8, 1))) continue;
    // o bordo que avança: −y' na ponta +x' (a barra gira para θ decrescente)
    const d = D0 + (D1 - D0) * ss(t, 0, 0.35) + nor() * 80;
    const [x, y] = daBarra(lado * ax, -lado * d);
    const dd = ((D1 - D0) * (ss(t + 0.01, 0, 0.35) - ss(t - 0.01, 0, 0.35))) / 0.02;
    const inclin = Math.atan2(-lado * dd, lado * (L1 - L0));
    const [tx, ty] = daBarra(Math.cos(inclin), Math.sin(inclin));
    const m = massaDoEspectro(1e4, 2e6);
    por('barra', x, y, m, Math.atan2(ty, tx), 2 + 2 * rnd());
    acc += m;
  }
  // A CMZ é um ANEL fino no plano, não uma tampa: o anel de 100 pc de
  // Molinari 2011 (semieixos ~100 × 60 pc, órbitas x2 alongadas ⊥ à barra)
  // com ~¾ da massa, e o resto num anel mais largo (~250 × 150 pc) onde as
  // fendas da barra entregam o gás (Sormani & Barnes 2019; Kruijssen 2015).
  // Nuvens densas: Σ ~ 1e3 M☉/pc² (Kauffmann 2017), não os 40 do disco —
  // com 40 as nuvens de 1e6 M☉ tinham σ ~90 pc e fechavam o miolo inteiro
  // (τ⊥ 4,4 no núcleo, que de cima virava um buraco preto). Tudo de memória.
  const MASSA_CMZ = 3e7;
  for (let acc = 0; acc < MASSA_CMZ; ) {
    const a = rnd() * 2 * Math.PI;
    const anel = rnd() < 0.75;
    const [ax, ay] = anel ? [60, 100] : [150, 250];
    const larg = anel ? 10 : 30;
    const [x, y] = daBarra(ax * Math.cos(a) + nor() * larg, ay * Math.sin(a) + nor() * larg);
    const m = massaDoEspectro(1e4, 2e6);
    // alongadas ao longo do anel
    const phi = Math.atan2(ay * Math.cos(a), -ax * Math.sin(a)) + GALACTIC_MODEL.barAngleRad;
    por('cmz', x, y, m, phi, 1.5 + rnd(), 0, 1000);
    acc += m;
  }

  const dados = new Float32Array(lista);
  return { n: dados.length / 6, dados, massas, atomicas: [iniAt, fimAt] };
}

/**
 * O MAPA τ⊥ DAS NUVENS: cada nuvem soma, vista de cima, a gaussiana dela com
 * a integral κ·M exata (pesos normalizados por nuvem; a pegada do texel entra
 * na largura, então nuvem menor que o texel não some nem estoura). Mesma
 * convenção do mapa pintado: texel (i, j) em ((i + ½)/N − ½)·2·meia.
 *
 * DUAS CAMADAS, dois canais (RG intercalados, N·N·2): R a poeira fina do gás
 * molecular, das fendas da barra e da CMZ; G a do gás atômico difuso, que
 * mora numa camada mais espessa (POEIRA_ATOMICA, galaxyShaders.ts).
 */
export function tauDasNuvens(nuvens: NuvensDePoeira, N: number, meia: number): Float32Array {
  const tau = new Float32Array(N * N * 2);
  const [iniAt, fimAt] = nuvens.atomicas;
  const passo = (2 * meia) / N;
  const pe2 = (0.4 * passo) ** 2;
  const d = nuvens.dados;
  const pesos: number[] = [];
  for (let c = 0; c < nuvens.n; c++) {
    const o = c * 6;
    const cx = d[o], cy = d[o + 1];
    const a2 = d[o + 2] * d[o + 2] + pe2, b2 = d[o + 3] * d[o + 3] + pe2;
    const co = Math.cos(d[o + 4]), si = Math.sin(d[o + 4]);
    const ext = 3 * Math.sqrt(a2);
    const i0 = Math.max(1, Math.floor((cx - ext + meia) / passo));
    const i1 = Math.min(N - 2, Math.ceil((cx + ext + meia) / passo));
    const j0 = Math.max(1, Math.floor((cy - ext + meia) / passo));
    const j1 = Math.min(N - 2, Math.ceil((cy + ext + meia) / passo));
    if (i0 > i1 || j0 > j1) continue;
    pesos.length = 0;
    let soma = 0;
    for (let j = j0; j <= j1; j++) {
      const dy = (j + 0.5) * passo - meia - cy;
      for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * passo - meia - cx;
        const du = dx * co + dy * si, dv = -dx * si + dy * co;
        const w = Math.exp(-0.5 * (du * du / a2 + dv * dv / b2));
        pesos.push(w);
        soma += w;
      }
    }
    if (soma <= 0) continue;
    const kM = kappaDaPoeira(Math.hypot(cx, cy)) * d[o + 5];
    const canal = c >= iniAt && c < fimAt ? 1 : 0;
    const k = kM / (passo * passo * soma);
    // NUVEM ESPESSA MENOR QUE O TEXEL (só as da CMZ, Σ ~ 1e3 M☉/pc²: as do
    // disco têm τ no miolo ~2–3 e ficam como estão). Média de τ no texel não
    // é τ médio da luz: uma nuvem opaca tapa só a área dela. Por texel, a
    // fração coberta f = τ̄/τc e o τ efetivo −ln(1 − f·(1 − e^−τc))
    // (megagrão, Natta & Panagia 1984); nuvem maior que o texel (f → 1) volta
    // a τc. Sem isso o anel de 100 pc virava um disco opaco de 33 pc/texel.
    const tauC = kM / (2 * Math.PI * d[o + 2] * d[o + 3]);
    let p = 0;
    if (tauC <= 5) {
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) tau[(j * N + i) * 2 + canal] += pesos[p++] * k;
      continue;
    }
    const cobre = 1 - Math.exp(-tauC);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const f = Math.min((pesos[p++] * k) / tauC, 1);
        tau[(j * N + i) * 2 + canal] += -Math.log(Math.max(1 - f * cobre, 1e-30));
      }
  }
  return tau;
}

/** o lado (texels) do mapa τ⊥ das nuvens — o mesmo nos dois motores */
export const LADO_DO_TAU_DAS_NUVENS = 1024;

/**
 * O MAPA τ⊥ DAS NUVENS PRONTO PARA A GPU: RG em meia precisão, como os dois
 * motores (WebGL e WebGPU) o leem. Feito UMA vez, no trabalhador da carga
 * (13/11/2026): até aqui cada motor o refazia na thread, ~0,4 s cada.
 */
export function tauDasNuvensEmMeia(): Uint16Array {
  const tau = tauDasNuvens(gerarNuvensDePoeira(), LADO_DO_TAU_DAS_NUVENS, GAL.DISK_RADIUS);
  const meia = new Uint16Array(tau.length);
  for (let k = 0; k < tau.length; k++) meia[k] = THREE.DataUtils.toHalfFloat(tau[k]);
  return meia;
}
