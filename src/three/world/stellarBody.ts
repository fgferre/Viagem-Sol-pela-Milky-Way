// ============================================================
// StellarBody — o corpo estelar procedural da casa, e o Sol é a
// instância 1. Nasceu como `novoSol.ts`: o Sol transplantado de
// Novo-Sol-Fable-3d (projeto irmão do mesmo autor; three 0.185, zero
// dependências). A Onda 3 não o reescreveu — promoveu a
// `StellarParams` os literais que eram DA INSTÂNCIA, com defaults
// (`SOL_PARAMS`) que reconstroem o objeto de antes byte a byte. O
// `git mv` preservou a história; o diff é o que mudou de fato.
//
// O núcleo vive VENDORIZADO VERBATIM em ./sol/ — fábricas
// createX(ctx) sem side-effects de import, exatamente como no
// original, e a Onda 3 não tocou nenhum dos 14 (M3: portam-se
// pixels). Este arquivo é (a) o adaptador de contexto que o
// main.js de lá provia, e (b) a orquestração por frame portada
// do animate() original (sim fatiada, bake da cromosfera a 8 Hz
// em 8 fatias, ciclo de 11 anos, flares, proeminências, loops,
// coroa). O que NÃO viaja: pipeline de pós deles (bloom/ACES
// próprios — aqui o Sol atravessa o NOSSO composer), céu, UI,
// câmera, museu. Fase 2 FEITA: coroa volumétrica (sampler3D) e CME
// (transform feedback) — as três pontes de escala estão no NORTE.
//
// ESCALA: o núcleo trabalha em "unidades de doador" (raio 2.2);
// o group leva scale = params.radiusPc/2.2 e o uCamDist é alimentado
// em unidades de doador CORRIGIDAS por fov (o LOD do disco de
// lá foi calibrado a fov 42° — sem a correção, o enquadramento
// da parede de fogo a fov 26° leria como "longe").
//
// TEMPO: são DOIS relógios, e a distinção é a lei desta casa desde
// 21/08 (item 5). O RÁPIDO é `update(time)` — o relógio VISUAL do
// director (0 sob ?shot=) — e move granulação, rotação, coroa, flares,
// proeminências: tempo de TELA, que acumula. O LENTO é a DATA SIMULADA,
// que chega por `escreverCiclo` e move a fase do ciclo, as regiões
// ativas e os grupos de manchas: ele NÃO acumula, é função pura do
// calendário, e por isso anda para trás de graça. Misturar os dois foi
// o defeito: o Sol do Atlas ficava congelado no máximo e duas entradas
// no mesmo instante davam dois Sóis.
// delta<=0 congela o relógio rápido — por isso o construtor faz um
// PRIME síncrono (semente do sim + N passos + um bake completo):
// sem ele, captura em t=0 fotografaria o disco sem cromosfera. E quando
// a DATA anda o bastante, um re-bake FATIADO (mesma semente, mesma
// contagem) refaz o retrato na fase nova sem bloquear a thread.
//
// LOD: este arquivo NÃO TEM MAIS LOD, e isso é o que a F3 da onda do Sol
// real entregou. Até ela, o corpo se atenuava por DISTÂNCIA — duas
// rampas em parsec (`solWorldFade`) escurecendo fotosfera, espículas,
// raias e halo, mais um corte duro de custo. As duas rampas existiam
// pela mesma razão: o disco da cena era 487.441× maior que o Sol, e um
// corpo desse tamanho precisava ser dissolvido à mão nas duas pontas
// (afastando-se ele engolia o céu; aproximando-se ele engolia o sistema
// solar). Com raio FÍSICO nada disso acontece — a perspectiva já faz o
// trabalho. Quem decide se o Sol é desenhado como CORPO é a régua do
// palco (4 px de diâmetro aparente, `corpos.ts`), aplicada pelo
// Director, exatamente como em Terra e Lua; aqui só se lê
// `group.visible`.
// ============================================================
import * as THREE from 'three';
import { CAMADA_DOS_OCULTADORES } from '../core/post';
import { RAIO_ARTISTICO_DO_SOL_PC, RAIO_DO_SOL_NA_CENA } from '../escala';
import {
  RADIANCIA_DA_FOTOSFERA,
  TEFF_SOL_K,
  blackbodyLinear,
  radianciaDeTela,
  radianciaVisivelDeCorpoNegro,
} from '../luzDaCasa';
import type { Achatamento } from '../../lib/atlas/estrelasVisitaveis';
import {
  BORDA_DA_MANCHA_FRIA,
  C2_UM_K,
  LAMBDA_DOS_CANAIS_UM,
  TIO_DA_FORJA,
  pesoDoTiO,
  BORDA_FORA_DO_DISCO,
  BORDA_PELAS_CELULAS,
  CELULA_PROFUNDA_EM_RAIOS,
  CORDA_SEM_MANCHA,
  LARGURA_DA_MANCHA_MAIOR_EM_RAIOS,
  TEFF_SEM_FILTRO_K,
  type EscurecimentoDoMotor,
  type ManchaNaBanda,
  pesoDaLisa,
  pesoDasCelulasQuentes,
  regraDaForja,
  type RegraDaForja,
} from './forjaDaEstrela';
import { perfilDeELR, wDaRazaoDosRaios } from './giroDaEstrela';
import {
  BRACOS_DO_VENTO,
  CAUDA_DO_DISCO,
  normalDosBracos,
  PERFIL_DO_VENTO,
  GANHO_DO_GAS,
  PISO_DO_INSTRUMENTO,
  fluxoDoDisco,
  type GasDoMotor,
} from './ventoDaEstrela';
import type { EstadoDaEstrela, FaseDoCiclo } from '../estrela';
import { UNIDADES_POR_CICLO, tempoDoCiclo } from '../estrela';
import { GLSL_COMPRESSAO } from '../shaders/common';
// o β vem do módulo DONO da curva na emissão, nunca de uma segunda
// leitura da URL: `starShaders.ts` já resolve `?bemis=` uma vez e os
// três materiais de ponto estelar bebem de lá. A malha é o quarto.
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import { porCurva, type QualityLevel } from '../core/engine';
import { EPOCA_JD_TDB } from './planetas/retrato2026';
import { NOISE_GLSL } from './sol/common.js';
import { createGranulation } from './sol/granulation.js';
import { createPIL } from './sol/pil.js';
import { createActivity } from './sol/activity.js';
import { createChromo } from './sol/chromo.js';
import { createSunBase, createSunUniforms, createSunMesh } from './sol/sun.js';
import { createFlares } from './sol/flares.js';
import { createCoronaRays } from './sol/coronaRays.js';
import { createSpicules } from './sol/spicules.js';
import { createProminences } from './sol/prominences.js';
import { createLoops } from './sol/loops.js';
import { createCoronaVolume } from './sol/coronaVolume.js';
import { createCME } from './sol/cme.js';

const DONOR_RADIUS = 2.2; // SUN_RADIUS do projeto original
const DONOR_FIT = 6.59; // fitDist de lá (fov 42°, landscape)
const DONOR_HALF_FOV = Math.tan((42 * Math.PI) / 360);
const MACRO_SLOW = 0.15;
const SIM_DT = 0.6 * MACRO_SLOW;

// Tiers do original (renderer.js) — só os campos que o núcleo lê.
// cinema→high, alta→mid, performance→low; ultra fica para depois.
const TIERS = {
  low: { fbm: 4, seg: 96, simW: 384, simH: 192, simStep: 1 / 16, prom: 4, chromo: 512, granFreq: 22.0, lic7: false, loops: 8, larc: 5, lseg: 28, cstep: 0, cmestep: 0, cmen: 0 },
  mid: { fbm: 5, seg: 128, simW: 768, simH: 384, simStep: 1 / 22, prom: 6, chromo: 1024, granFreq: 30.0, lic7: true, loops: 12, larc: 7, lseg: 36, cstep: 22, cmestep: 16, cmen: 1024 },
  high: { fbm: 5, seg: 128, simW: 768, simH: 384, simStep: 1 / 26, prom: 7, chromo: 2048, granFreq: 34.0, lic7: true, loops: 16, larc: 9, lseg: 44, cstep: 36, cmestep: 24, cmen: 2048 },
} as const;
/**
 * SEGMENTOS DA ESFERA DA FOTOSFERA NO PIOR TIER — a única grandeza do
 * `TIERS` que alguém de fora precisa saber, e por um motivo geométrico: a
 * silhueta de uma esfera TESSELADA é o polígono INSCRITO, e o oclusor da
 * nebulosa (`world/nebula.ts`, `sunCone`) tem de encolher o raio por
 * `cos(π/N)` usando o N do pior caso. Era 96 redigitado lá, com o tier
 * citado só no comentário ao lado — e comentário não muda quando o tier
 * muda: baixar `low.seg` sem mexer na cópia faria o oclusor apagar pixel
 * visível, calado.
 */
export const SEGMENTOS_DA_FOTOSFERA_NO_PIOR_TIER = TIERS.low.seg;

const TIER_FOR: Record<QualityLevel, keyof typeof TIERS> = {
  cinema: 'high',
  alta: 'mid',
  performance: 'low',
};

// Defaults de fábrica do modo normal de lá (CONTROL_SCHEMA) — os knobs
// que o NÚCLEO lê. Congelados: o painel/URL de lá não viaja.
const SOL_KNOBS: Record<string, number> = {
  spots: 1, cycle: 1, lapse: 0, speed: 1, pmode: 0,
  plageglow: 0.35, halo: 0.55, ray: 0.9, cact: 0.5,
  // cme 1,4 (doador: 0,9): a casca foi calibrada contra a exposição
  // 0,418 do pipeline de lá; no nosso ACES ela compete com a coroa
  // mais clara — 0,9 mal aparecia, 1,4 lê a estrutura de 3 partes
  loops: 0.55, fprom: 0.55, cvol: 0.5, cme: 1.4, edu: 0,
};

/**
 * O SOL FORA DO ACES (R1b da régua única; o dono, 09/10: *"Adotar o tom
 * novo"*). A paleta H-alfa e a coroa foram afinadas a olho sobre o ACES,
 * que dessatura os altos e esmaga o pé: sob o Neutral da Khronos o mesmo
 * Sol saía laranja forte, de borda rosada, com um halo largo e opaco até
 * ~3 raios (o sprite da coroa externa, que o pé do ACES apagava). O ACES
 * guarda os de antes (`porCurva`: `?tone=aces` sai bit a bit a foto
 * aprovada); as outras curvas recebem estes, medidos contra essa foto em
 * L*a*b* por região — disco, borda, anel interno e brilho externo, no
 * Atlas a 10/18/27 raios e no filme solar (`capturas/regua-r1/r1b-sol/`).
 * A rampa abre (ponta fria mais vermelha, quente mais creme) porque o ACES
 * aprofunda os fracos e desbota os fortes, e o Neutral guarda a matiz. O
 * resto que a rampa de duas pontas não alcança: as manchas saem um pouco
 * menos vermelhas que no ACES (a* ~15 contra 20–25).
 */
export const SOL_NO_ACES = {
  ganho: new THREE.Vector3(1, 1, 1),
  corFria: new THREE.Vector3(1.0, 0.34, 0.06),
  corQuente: new THREE.Vector3(1.0, 0.62, 0.24),
  limbo: new THREE.Vector3(1.0, 0.3, 0.1),
  coroaExterna: new THREE.Color(1, 1, 1),
};
export const SOL_FORA_DO_ACES = {
  /** ganho por canal da cor final da fotosfera */
  paleta: new THREE.Vector3(0.76, 1.02, 1.36),
  /** as duas pontas da rampa H-alfa da fotosfera (`sol/sun.js`), antes do ganho acima */
  corFria: new THREE.Vector3(1.18, 0.39, 0.058),
  corQuente: new THREE.Vector3(0.64, 0.5, 0.235),
  /** a cromosfera do limbo (`sol/sun.js`), antes do ganho acima */
  limbo: new THREE.Vector3(0.75, 0.36, 0.11),
  /** a tinta da absorção dos filamentos no disco (`sol/prominences.js`):
   *  o cinza escurecia a fotosfera recalibrada para oliva; tirar menos
   *  vermelho devolve o marrom-alaranjado que o ACES dava. No ACES o
   *  material é o de sempre, sem tinta (`porCurva` escolhe o material) */
  absorcao: new THREE.Vector3(0.67, 0.93, 0.93),
  /** ganho por canal da coroa: o plano de raias e o volume */
  coroa: new THREE.Vector3(0.9, 1.0, 1.5),
  /** a cor do sprite da coroa externa: o ganho da coroa × 0,22 de dose */
  coroaExterna: new THREE.Color(0.198, 0.22, 0.33),
};

// ------------------------------------------------------------
// StellarParams — o que é DA INSTÂNCIA (Onda 3, decisão D5)
// ------------------------------------------------------------
//
// A regra da promoção: sobe a parâmetro o literal que (a) descreve a
// ESTRELA, não o motor, e (b) sobe sem tocar em `sol/*.js`. Os 14
// módulos vendorizados ficam intocados, e o que não passou por esse
// filtro está NOMEADO aqui em vez de escondido:
//
//  1. `DONOR_RADIUS = 2.2`. O mesmo número vive DE NOVO, como literal
//     independente, em `sol/sun.js:13` (`var SUN_RADIUS = 2.2`), de
//     onde é publicado em `ctx.SUN_RADIUS` e lido por 7 dos 14 módulos
//     (sun, coronaRays, coronaVolume, prominences, spicules, loops,
//     cme). Promovê-lo exigiria editar `sol/*.js`. Não é perda: o
//     parâmetro REAL da instância é `radiusPc` (o raio em pc no mundo);
//     2.2 é só a régua interna do doador. Mas os dois lados têm de
//     continuar concordando À MÃO — se um mudar sem o outro, quebra em
//     silêncio. Onda 7.
//  2. A PALETA H-alfa: ~17 tripletos `vec3()` inline em 8 dos
//     `sol/*.js`, nenhum nomeado. É OVERRIDE DECLARADO da instância Sol
//     (decisão D4) — a lei de cor por classe espectral é da Onda 7, e é
//     ela que vai precisar de `teffK`.
//  3. `sol/cme.js:10` captura `ctx.camera` NA CRIAÇÃO, não por frame.
//     Uma segunda instância construída antes de a câmera real existir
//     pegaria a errada, sem erro nenhum. Onda 7.
//  4. `DONOR_FIT`/`DONOR_HALF_FOV` e a janela do limbo (35/25 em
//     unidades de doador): calibração de LENTE e de REGIME do doador,
//     não física da estrela.
//  5. `TIERS`: custo, não estrela — e nem chega a ser da instância,
//     porque nenhuma camada estelar responde a troca de qualidade
//     (decisão D8).

/** Período de rotação do Sol — sideral médio de Carrington, em dias. */
export const SOL_ROT_PERIOD_DAYS = 25.38;
/**
 * O `ROT_SPEED` do doador para o Sol: rad por segundo DE TELA. É taxa
 * artística — o doador nunca modelou período nenhum.
 */
const SOL_ROT_SPEED = 0.042;

/**
 * Período (dias) → rad/s de tela. A âncora é a RELAÇÃO, não o número:
 * o Sol devolve exatamente o 0,042 de sempre porque `25.38 / 25.38` é
 * 1 sem resto em IEEE754 e `0.042 * 1` é o mesmo bit. A promoção não
 * podia custar um ULP — o gate de md5 desta fase pegaria.
 * A razão embutida é a COMPRESSÃO DE TEMPO do filme: uma volta em
 * 2π/0,042 ≈ 149,6 s de tela para 25,38 dias ⇒ ~5,9 s por dia solar.
 * Guarda: período inválido devolve 0 (estrela não gira), nunca NaN.
 */
export function rotSpeedFromPeriod(periodDays: number): number {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return 0;
  return SOL_ROT_SPEED * (SOL_ROT_PERIOD_DAYS / periodDays);
}

/**
 * O ÂNGULO DO GIRO (rad, em torno do eixo próprio) — UMA função para os
 * dois regimes (F4 do filme solar).
 *
 * COM RELÓGIO DE CENA (`jdDaCena`, a data do filme em cartaz): o ângulo é
 * o da DATA, ω·(JD − JD0)·86400 com ω = 2π/(P·86400) o giro sideral de
 * verdade e JD0 a época do retrato da casa (`EPOCA_JD_TDB`, fase zero —
 * o ângulo de nascença do corpo, que é a data da abertura do galáctico).
 * Reproduzível por construção: o mesmo instante do filme mostra a mesma
 * face, tenha a sessão começado quando for. Até a F4 o giro somava tempo
 * de tela desde o carregamento, e as manchas do prólogo eram outras a
 * cada sessão. A data de um ato é parada, então o Sol do filme também
 * fica: em 33 s o Sol real gira 1,5e-5 rad.
 *
 * SEM RELÓGIO DE CENA (Atlas, voo livre, fim): o de sempre — o ângulo
 * anterior mais o passo de tela, `rotSpeed·delta`, bit a bit.
 *
 * Guardas: data inválida cai no ramo sem relógio; período inválido não
 * gira (o mesmo contrato de `rotSpeedFromPeriod`).
 */
export function anguloDoGiro(
  anterior: number,
  rotSpeed: number,
  delta: number,
  jdDaCena: number | null,
  periodoDias: number
): number {
  if (jdDaCena === null || !Number.isFinite(jdDaCena)) return anterior + rotSpeed * delta;
  if (!Number.isFinite(periodoDias) || periodoDias <= 0) return anterior;
  const voltas = (jdDaCena - EPOCA_JD_TDB) / periodoDias;
  return 2 * Math.PI * (voltas - Math.floor(voltas));
}

/**
 * A regra da Forja para esta instância, ou `null` (o caminho de hoje): só com
 * `logG` e sem dínamo — o Sol e as de dínamo nunca. Nem a
 * estrela quente: sem granulação pela regra (contraste zero acima de
 * ~9.300 K, a reta de Steffen 2005) ela fica com o desenho de hoje.
 */
export function forjaDe(p: StellarParams): RegraDaForja | null {
  if (p.logG === undefined || p.dinamo) return null;
  const regra = regraDaForja(p.teffK, p.logG, p.radiusPc / RAIO_DO_SOL_NA_CENA, p.manchaQuente);
  return regra.contraste > 0 ? regra : null;
}

/**
 * As cirurgias da fotosfera de OUTRA estrela, puras: o fragment, o vertex e
 * o fator do relevo fbm (`uDispScale`); `null` sem nada a fazer (o Sol).
 * Com a Forja (`forja` ≠ null) o calor H-alfa fica PLANO (contraste 0), o
 * assado é o da convecção (`cirurgiaDoAssado`) e a fotosfera o lê no lugar
 * das células gigantes e da granulação viva, vista pelo MESMO instrumento do
 * Sol (a rampa de cor e brilho do filtro, com o peso de `pesoDoFiltro`, como
 * sem a Forja), e SEM relevo
 * (nem o da convecção, nem o fbm de `uDispScale`): a estrela brilha por si,
 * e o relevo entortava a normal e fazia da lei de borda uma luz rasante — o
 * claro-escuro vem só da temperatura. Sem a Forja, o caminho de antes, texto
 * a texto.
 */
export function cirurgiasDaFotosfera(
  fragment: string,
  vertex: string,
  p: StellarParams,
  forja: RegraDaForja | null
): { fragment: string; vertex: string; relevo: number } | null {
  const a = p.achatamento;
  const lisa = (p.pesoDoPico ?? 0) > 0 ? pesoDaLisa(p.teffK) : 0;
  const o = {
    contraste: forja ? 0 : p.contrasteRelativoAoSol,
    bordaU: p.bordaU,
    semDinamo: !p.dinamo,
    gravidade: Boolean(a),
    avermelhamento: pesoDoFiltro(p.teffK),
    teffK: p.teffK,
    continuo: 1 - pesoDoFiltro(p.teffK),
    ...(forja ? { forja } : {}),
    // a mancha fria de um escurecimento: só na temperatura local da Forja
    ...(forja && p.escurecimento ? { manchaFria: true } : {}),
    // a ponta do pico (`PONTA_DO_PICO`): só quem tem peso do pico, e com o
    // peso da rampa em que a rede de convecção sai (`pesoDaLisa`) — a ponta
    // inteira sobre a rede a lavava (Fomalhaut: 0,89 % → 0,33 % na tela)
    ...(lisa > 0 ? { pontaDoPico: { peso: lisa, lumPolo: a ? lumDoPolo(p.teffK, a) : 1 } } : {}),
  };
  if (
    (o.contraste === undefined || o.contraste === 1) &&
    (o.bordaU === undefined || o.bordaU === 0.3) &&
    !o.semDinamo &&
    !a &&
    o.avermelhamento === 1
  ) {
    return null;
  }
  // o RELEVO da fotosfera (o fbm do vertex, `uDispScale`) é o da mesma
  // convecção: escala com o contraste dela (A: quase liso)
  const relevo = forja ? 0 : o.contraste !== undefined && o.contraste !== 1 ? Math.max(0, o.contraste) : 1;
  return { fragment: cirurgiaDaEstrela(fragment, o), vertex: a ? cirurgiaDaForma(vertex) : vertex, relevo };
}

/** O que descreve UMA estrela procedural desta casa. */
export interface StellarParams {
  /** Nome da instância — diagnóstico e registro, só. */
  readonly nome: string;
  /** Raio VISUAL em pc (escala artística: o real seria invisível). */
  readonly radiusPc: number;
  /** Período de rotação em dias → `rotSpeedFromPeriod`. */
  readonly rotPeriodDays: number;
  /** Inclinação do eixo, em rad. */
  readonly tiltRad: number;
  /**
   * Escala global de atividade magnética: multiplica os knobs `spots` e
   * `cycle` do doador ANTES do override de URL (a URL segue sendo a
   * fonte de verdade). Só esses dois — `cact`/`cvol`/`fprom` são DOSE DE
   * RENDER da coroa, calibrada contra o nosso ACES, e enfiá-los aqui
   * seria promoção falsa.
   */
  readonly activityLevel: number;
  /**
   * Temperatura efetiva, em K. Ganhou o primeiro consumidor no M1 da Lei
   * da Estrela: `estadoDaLei` a declara no estado lógico e `repartir`
   * deriva dela radiância e cor. A paleta H-alfa dos `sol/*.js` continua
   * sendo o override declarado da instância 1 (`overrideExpoente`).
   */
  readonly teffK: number;
  /**
   * O DÍNAMO DE TIPO SOLAR — o portão da atmosfera magnética (12/11). Sem
   * ele não há manchas, ciclo, laços, proeminências, espículas, erupções,
   * CME nem coroa quente: essas camadas nem nascem, o retrato da superfície
   * é o mínimo (`TIER_SEM_DINAMO`) e a cirurgia `cirurgiaDaEstrela` apaga
   * fibrilas, plage, filamentos e o fio do limbo. Quem não o tem: estrelas
   * sem envelope convectivo (A, anãs brancas) e as gigantes frias além da
   * linha de Linsky & Haisch (Betelgeuse) — a lei é `temDinamoSolar`.
   */
  readonly dinamo: boolean;
  /**
   * A GRAVIDADE DA SUPERFÍCIE, log₁₀ g (cgs; omitido no Sol). Só a Forja
   * (`forjaDe`) a lê: a convecção de quem não tem dínamo.
   */
  readonly logG?: number;
  /**
   * A MANCHA QUENTE MEDIDA (razão sobre o brilho médio numa banda, µm), que
   * vence a regra no pico das células quentes (`manchaQuenteDe`); omitida, a
   * regra (`MANCHA_DE_HAUBOIS`). Só a Forja a lê.
   */
  readonly manchaQuente?: ManchaNaBanda;
  /*
   * (A DRAMATURGIA POR TORÇÃO DE FASE morreu em 21/08 — item 5. Eram
   * quatro números aqui — as fases do arranque e do pico, mais a janela
   * em segundos de viagem — que faziam o corpo trocar a fase do ciclo
   * pelo tempo de VIAGEM. A fase agora é da DATA (`faseDoCiclo`, a lei
   * da estrela) e o filme atenua a OCUPAÇÃO por uma dose declarada, que
   * mora com quem dirige o filme — `director/doseDoSol.ts`. Um corpo
   * estelar não tem por que conhecer o roteiro.)
   */
  /** Semente-mãe dos streams determinísticos da instância. */
  readonly seed: number;
  /** Prefixo dos knobs por URL (`?solcvol=0`). Por instância. */
  readonly knobPrefix: string;
  /** Defaults de fábrica dos knobs que o NÚCLEO lê. */
  readonly knobs: Readonly<Record<string, number>>;
  /**
   * O GRÂNULO NA TELA relativo ao do Sol (1 = o Sol; omitido = 1). A
   * frequência da convecção do tier (`granFreq`, lida pela fotosfera e pela
   * cromosfera) é DIVIDIDA por ele: grânulo menor, frequência maior. Quem o
   * calcula é a lei física dos dados (`granuloNaTelaEmRaios`, Hp ∝ T·R/M).
   */
  readonly granuloRelativoAoSol?: number;
  /**
   * A instância mora FORA DA ORIGEM (uma estrela do catálogo, a 1,3–150 pc).
   * Liga a cirurgia do REFERENCIAL LOCAL (`cirurgiaDoReferencialLocal`): em
   * float32 a 1,3 pc um ULP de posição (1,2e-7 pc) é maior que a estrela
   * inteira, e as camadas vendorizadas sombreiam em espaço de MUNDO
   * (`modelMatrix`, `viewMatrix`, `cameraPosition`, `normalize(vWPos)` com o
   * centro na origem). O Sol, na origem, não a recebe: sai bit a bit.
   */
  readonly foraDaOrigem?: boolean;
  /**
   * O CONTRASTE DA TEXTURA QUIETA relativo ao do Sol (1 = o Sol; omitido =
   * 1): multiplica o desvio do calor em torno do meio (a disciplina tonal de
   * `sol/sun.js`) e as fibrilas — manchas, plage, filamentos e erupções
   * ficam de fora (são atividade, não convecção). A lei é dos dados:
   * `contrasteGranulos / 0,15` (o rms do Sol).
   */
  readonly contrasteRelativoAoSol?: number;
  /** O u da lei linear de borda (omitido = o 0,30 de `sol/sun.js`). */
  readonly bordaU?: number;
  /**
   * ROTADORA RÁPIDA (omitido = esfera): a superfície de Roche EXATA por
   * vértice (`formaDeRoche`: o raio e a normal no deslocamento do vertex);
   * e o escurecimento gravitacional, a Teff local de von Zeipel
   * (`rocheDe`) na cor e no brilho de cada ponto. `radiusPc` é o raio
   * EQUATORIAL.
   */
  readonly achatamento?: Achatamento;
  /**
   * O EIXO DE ROTAÇÃO na base da cena (unitário). Omitido: o +Y do motor
   * inclinado por `tiltRad` (o Sol). Entra POR MALHA (quaternion), nunca no
   * `group` — as coroas são billboards no referencial do group.
   */
  readonly eixoNaCena?: readonly [number, number, number];
  /**
   * O VÉU de uma fotosfera mais radiante que o Sol (omitido ou 0 = nenhum):
   * a fração da radiância que a exposição da visita não põe no disco
   * (1 − ganho), espalhada em volta dele (`criarABordaDifusa`).
   */
  readonly veu?: number;
  /**
   * O PESO DA REGRA DO PICO das quentes (`pesoDoPico` do diretor; omitido ou
   * 0 = nenhuma): liga a ponta do pico na fotosfera, a asa longa e o tom do
   * véu (`PONTA_DO_PICO`, `VEU_POR_STOP`, `TOM_DO_VEU`).
   */
  readonly pesoDoPico?: number;
  /** os STOPS que a regra do pico tirou do disco (ln do ganho de sempre sobre o da visita; omitido = 0) */
  readonly stopsDoPico?: number;
  /**
   * O GÁS em volta da estrela, em números de desenho (`gasDaEstrela`,
   * `ventoDaEstrela.ts`): o vento e/ou o disco de uma Be, vistos na linha
   * Hα (`O GÁS DAS QUENTES`). Omitido = o texto da casca de antes.
   */
  readonly gas?: GasDoMotor;
  /**
   * UM ESCURECIMENTO POR ÉPOCA (`EscurecimentoDoMotor`; Betelgeuse em
   * 2019–20): a fotosfera da Forja ganha a mancha fria, que o director
   * escreve pela data (`escreverManchaFria`). Omitido = o texto de antes.
   */
  readonly escurecimento?: EscurecimentoDoMotor;
}

/**
 * A FORMA E A TEMPERATURA DE UMA ROTADORA RÁPIDA — modelo de Roche com
 * rotação rígida (massa central, Rp = 1, GM = 1). A razão Re/Rp medida
 * fixa Ω² = 2(1 − Rp/Re)/Re²; a superfície r(θ) sai de
 * 1/r + ½Ω²r²sin²θ = 1 (Newton), e g_eff é o gradiente do potencial.
 *
 * A temperatura, por duas leis conforme a origem do achatamento:
 *  · MODELO MEDIDO (com `betaGravidade`): a lei do próprio artigo, von
 *    Zeipel, T ∝ g_eff^β, NORMALIZADA nas duas pontas medidas — em Vega o β
 *    efetivo que faz isso com esta forma é 0,2307 contra os 0,231
 *    publicados (0,1 %), porque o modelo do artigo também ajusta a lei de
 *    escurecimento de borda;
 *  · DERIVADO do giro (sem `betaGravidade`): Espinosa Lara & Rieutord 2011,
 *    sem expoente livre — a equação implícita deles em cada latitude
 *    (`perfilDeELR`), sobre a temperatura do equador.
 * (Mora aqui desde que o motor do Sol desenha Vega.)
 */
export interface Roche {
  /** raio em unidades do raio EQUATORIAL (1 no equador) */
  raio: number;
  teffK: number;
  /** normal externa em (radial, colatitude) — para a normal da malha */
  nr: number;
  nt: number;
}

export function rocheDe(colatRad: number, a: Achatamento): Roche {
  const re = a.raioEquatorialRsol.v / a.raioPolarRsol.v;
  const w2 = (2 * (1 - 1 / re)) / (re * re);
  const s = Math.sin(colatRad);
  const c = Math.cos(colatRad);
  let r = 1;
  for (let i = 0; i < 30; i++) {
    const f = 1 / r + 0.5 * w2 * r * r * s * s - 1;
    const df = -1 / (r * r) + w2 * r * s * s;
    const passo = f / df;
    r -= passo;
    if (Math.abs(passo) < 1e-14) break;
  }
  // ∂Φ/∂r e (1/r)∂Φ/∂θ de Φ = −1/r − ½Ω²r²sin²θ: o vetor aponta para FORA
  const gr = 1 / (r * r) - w2 * r * s * s;
  const gt = -w2 * r * s * c;
  const g = Math.hypot(gr, gt);
  let teffK: number;
  if (a.betaGravidade) {
    const gEq = 1 / (re * re) - w2 * re;
    const tp = a.teffPoloK.v;
    teffK = tp * Math.pow(g, Math.log(a.teffEquadorK.v / tp) / Math.log(gEq));
  } else {
    // T0 pela ponta do equador: Te = T0·(1 − w²)^(1/12), com w² = 2(Re/Rp − 1)
    const w = wDaRazaoDosRaios(re);
    const t0 = a.teffEquadorK.v / Math.pow(1 - w * w, 1 / 12);
    teffK = t0 * perfilDeELR(w, colatRad, r / re);
  }
  return { raio: r / re, teffK, nr: gr / g, nt: gt / g };
}

/**
 * A SUPERFÍCIE DE ROCHE num ponto da malha (x, y, z no objeto, eixo +Y):
 * o raio relativo ao EQUATORIAL (`rocheDe`), a Teff local e a normal
 * externa no objeto, nr·û + nt·θ̂, com θ̂ = (cosθ·x/ρ, −senθ, cosθ·z/ρ) e
 * ρ = √(x² + z²). No eixo (ρ = 0) θ̂ não existe, mas lá nt = 0 e a normal
 * é a radial. Substitui o termo P20 de antes, gordo demais nas latitudes
 * médias (1 % do raio em Vega, 3 % em Altair, 5 % em Regulus).
 */
export function formaDeRoche(
  x: number,
  y: number,
  z: number,
  a: Achatamento
): { raio: number; teffK: number; normal: [number, number, number] } {
  const rho = Math.hypot(x, z);
  const len = Math.hypot(rho, y);
  const R = rocheDe(Math.atan2(rho, y), a);
  const ux = x / len;
  const uy = y / len;
  const uz = z / len;
  if (!(rho > 0)) return { raio: R.raio, teffK: R.teffK, normal: [R.nr * ux, R.nr * uy, R.nr * uz] };
  const s = rho / len;
  return {
    raio: R.raio,
    teffK: R.teffK,
    normal: [
      R.nr * ux + R.nt * uy * (x / rho),
      R.nr * uy - R.nt * s,
      R.nr * uz + R.nt * uy * (z / rho),
    ],
  };
}

/** O tier de uma estrela SEM DÍNAMO: o menor retrato que ainda desenha uma
 *  fotosfera limpa (a textura quieta dela é quase plana). Custo, não física. */
const TIER_SEM_DINAMO = { chromo: 256, simW: 192, simH: 96 } as const;

/** Teto do multiplicador de laços pela atividade (o regime saturado de
 *  Wright 2011 chega a ~8× o Sol no `nivel`) — artístico, declarado. */
const TETO_DOS_LACOS_PELA_ATIVIDADE = 2;
/** Teto da frequência relativa das erupções: o regime saturado (nivel² ~68)
 *  seria uma erupção a cada fração de segundo — artístico, declarado. Acima
 *  de Proxima (~4,2×), que fica como estava. */
const TETO_DA_TAXA_DE_ERUPCOES = 6;

interface Tier {
  fbm: number;
  seg: number;
  simW: number;
  simH: number;
  simStep: number;
  prom: number;
  chromo: number;
  granFreq: number;
  lic7: boolean;
  loops: number;
  larc: number;
  lseg: number;
  cstep: number;
  cmestep: number;
  cmen: number;
}

/**
 * O TIER DA ESTRELA sobre o do aparelho. No Sol devolve O MESMO objeto
 * (nenhuma chave nova). Outra estrela: a frequência da convecção dividida
 * pelo grânulo relativo (`granuloRelativoAoSol`); os laços ambientes pela
 * atividade (até `TETO_DOS_LACOS_PELA_ATIVIDADE`×); sem dínamo, o retrato
 * mínimo (`TIER_SEM_DINAMO`); com a Forja, o assado na largura da regra
 * (`larguraDoAssado`).
 */
export function tierDaEstrela(tier: Tier, p: StellarParams, forja: RegraDaForja | null = null): Tier {
  const g = p.granuloRelativoAoSol;
  const granulo = g !== undefined && g !== 1 && g > 0 && Number.isFinite(g);
  const lacos =
    p.dinamo && p.activityLevel !== 1
      ? Math.min(Math.max(p.activityLevel, 0), TETO_DOS_LACOS_PELA_ATIVIDADE)
      : 1;
  if (!granulo && p.dinamo && lacos === 1) return tier;
  return {
    ...tier,
    ...(granulo ? { granFreq: tier.granFreq / g } : {}),
    ...(!p.dinamo ? TIER_SEM_DINAMO : lacos !== 1 ? { loops: Math.max(1, Math.round(tier.loops * lacos)) } : {}),
    // o assado pela célula, com o teto do nível de qualidade (o do Sol)
    ...(forja ? { chromo: Math.min(forja.assado, tier.chromo) } : {}),
  };
}

/**
 * A FREQUÊNCIA DAS ERUPÇÕES relativa ao Sol pela atividade (`activityLevel`
 * = (L_X/L_bol relativa)^0,3): nivel² = razão^0,6, até
 * `TETO_DA_TAXA_DE_ERUPCOES`. Proxima (razão ~11) sai ~4× mais frequente que
 * o Sol — uma COMPRESSÃO ARTÍSTICA declarada (a taxa real de erupções de uma
 * anã M ativa passa de 10× a do Sol). 1 no Sol.
 */
export function taxaDeErupcoesPelaAtividade(nivel: number): number {
  return Number.isFinite(nivel) && nivel > 0 ? Math.min(nivel * nivel, TETO_DA_TAXA_DE_ERUPCOES) : 0;
}

/** uma troca de texto com âncora ÚNICA — ausente ou repetida LANÇA */
function trocarUma(texto: string, ancora: string, novo: string, quem: string): string {
  const i = texto.indexOf(ancora);
  if (i < 0 || texto.indexOf(ancora, i + 1) >= 0) {
    throw new Error(`${quem}: a âncora \`${ancora.trim()}\` sumiu ou se repetiu no vendorizado (sol/sun.js)`);
  }
  return texto.slice(0, i) + novo + texto.slice(i + ancora.length);
}

/**
 * A FOTOSFERA DE OUTRA ESTRELA, por cirurgia de texto no fragment de
 * `sol/sun.js` (molde de `cirurgiaDaFotosfera`; cada âncora lança se sumir).
 * Só entra o que a instância pede — o Sol não passa por aqui:
 *  · `contraste` (≠ 1): a textura quieta (o achatamento tonal e as fibrilas);
 *  · `bordaU` (≠ 0,30): o coeficiente da lei linear de borda;
 *  · `semDinamo`: sem campo não há fibrilas, plage, filamentos nem o fio
 *    cromosférico do limbo — a estrela sem dínamo de tipo solar; no lugar
 *    das fibrilas, a convecção que sobra (`GLSL_GRANULACAO_VIVA`);
 *  · `gravidade`: a cor × brilho da Teff local (`aGravidade`, por vértice);
 *  · `avermelhamento` (≠ 1): o avermelhamento do limbo da receita H-alfa
 *    (g × 0,7 e b × 0,5 na borda) é parte do FILTRO fotográfico do Sol, e
 *    esmaece com ele (`pesoDoFiltro`): a estrela quente fica azul até a borda;
 *  · `forja`: a convecção da Forja, lida do assado (`glslDaForjaNaFotosfera`),
 *    como temperatura, no lugar da granulação viva, sem a
 *    fervura por ruído, vista pelo instrumento do Sol (`GANHO_DO_INSTRUMENTO`);
 *  · `continuo` (peso > 0): a borda do CONTÍNUO — a atmosfera cinza de
 *    Eddington, T(μ)⁴ ∝ μ + ⅔, pela lei de Planck por canal — no lugar da
 *    lei linear, com o peso que o filtro H-alfa do Sol deixa (1 − w): zero
 *    no Sol e nas mais frias, inteira nas quentes.
 */
export function cirurgiaDaEstrela(
  fragment: string,
  o: {
    contraste?: number;
    bordaU?: number;
    semDinamo?: boolean;
    gravidade?: boolean;
    avermelhamento?: number;
    /** a Teff média (K): a régua de Planck da Forja e do contínuo */
    teffK?: number;
    /** o peso da borda do contínuo (1 − `pesoDoFiltro`) */
    continuo?: number;
    /** a convecção da Forja (`glslDaForjaNaFotosfera`): a regra da estrela */
    forja?: RegraDaForja;
    /** a ponta do pico (`PONTA_DO_PICO`): o peso do pico e a luminância de `vGravidade` no polo */
    pontaDoPico?: { peso: number; lumPolo: number };
    /** a mancha fria de um escurecimento (`uManchaFria`, `uManchaFriaK`): só com a Forja */
    manchaFria?: boolean;
  }
): string {
  const quem = 'cirurgiaDaEstrela';
  let f = fragment;
  let granulacao = '';
  if (o.contraste !== undefined && o.contraste !== 1) {
    const k = literalGlsl(Math.max(0, o.contraste));
    f = trocarUma(
      f,
      '  heat = 0.50 + (heat - 0.52)*(mix(0.31, 0.26, close) + uMaxK*mix(0.39, 0.20, close));',
      `  heat = 0.50 + (heat - 0.52)*(mix(0.31, 0.26, close) + uMaxK*mix(0.39, 0.20, close))*${k};`,
      quem
    );
    f = trocarUma(
      f,
      '  heat += fibC * mix(0.055, 0.12, close) * (0.65 + 0.70*st.r);',
      `  heat += fibC * mix(0.055, 0.12, close) * (0.65 + 0.70*st.r) * ${k};`,
      quem
    );
    f = trocarUma(f, '    heat += close * fibF * 0.16;', `    heat += close * fibF * 0.16 * ${k};`, quem);
    f = trocarUma(
      f,
      '      heat += closer * licFibril(sp, fdir, uGranFreq*7.0, 0.08, t*1.6) * 0.20;',
      `      heat += closer * licFibril(sp, fdir, uGranFreq*7.0, 0.08, t*1.6) * 0.20 * ${k};`,
      quem
    );
  }
  if (o.bordaU !== undefined && o.bordaU !== 0.3) {
    f = trocarUma(f, '  float limbU = 0.30;', `  float limbU = ${literalGlsl(o.bordaU)};`, quem);
  }
  if (o.semDinamo) {
    // sem campo, a textura que sobra é a da CONVECÇÃO: a granulação viva
    // (`GLSL_GRANULACAO_VIVA`) no lugar das fibrilas, na frequência da
    // estrela (`uGranFreq`) e no contraste dela
    const ag = o.forja ? 0 : GRANULACAO_VIVA * Math.max(0, o.contraste ?? 1);
    f = trocarUma(
      f,
      '  float fibC = st.a*2.0 - 1.0;',
      ag > 0 ? `  float fibC = 0.0;\n  heat += ${literalGlsl(ag)} * granulacaoViva(sp * uGranFreq, t, mu);` : '  float fibC = 0.0;',
      quem
    );
    if (ag > 0) granulacao = GLSL_GRANULACAO_VIVA;
    f = trocarUma(f, '  if (close > 0.003){', '  if (false){', quem);
    f = trocarUma(f, '  float plage = st.b * (', '  float plage = 0.0 * st.b * (', quem);
    f = trocarUma(f, '  float fil = st.g * ', '  float fil = 0.0 * st.g * ', quem);
    f = trocarUma(
      f,
      '  color += uCorDoLimbo * pow(1.0-mu, 3.5)',
      '  color += 0.0 * uCorDoLimbo * pow(1.0-mu, 3.5)',
      quem
    );
  }
  if (o.gravidade) {
    f = 'varying vec3 vGravidade;\n' + trocarUma(f, '  color *= uPaleta;', '  color *= vGravidade;\n  color *= uPaleta;', quem);
  }
  if (o.avermelhamento !== undefined && o.avermelhamento !== 1) {
    const w = literalGlsl(Math.max(0, o.avermelhamento));
    f = trocarUma(f, '  color.g *= 1.0 - edge*0.30;', `  color.g *= 1.0 - edge*0.30*${w};`, quem);
    f = trocarUma(f, '  color.b *= 1.0 - edge*0.50;', `  color.b *= 1.0 - edge*0.50*${w};`, quem);
    f = trocarUma(f, '  color *= 1.0 - edge*0.15;', `  color *= 1.0 - edge*0.15*${w};`, quem);
  }
  const teff = o.teffK ?? TEFF_SOL_K;
  const planck =
    (o.forja && pesoDoFiltro(teff) < 1) || (o.continuo ?? 0) > 0 ? GLSL_RAZAO_DE_PLANCK : '';
  if (o.forja) {
    // a temperatura local da convecção da Forja, contraste ∝ μ para a borda.
    // A BORDA MACIA (`bordaEmMu`): a intensidade cai a zero na espessura da
    // fotosfera, com um piso de ~1,5 px (em ρ: μ = √(3·pixel)) só para não
    // serrilhar — a forma (smoothstep) é ARTÍSTICA, a largura é a física. Não
    // cai a zero onde há atmosfera estendida: lá a linha de visada rente
    // ainda cruza a metade da frente da casca (`frenteDaAtmosfera`), e o
    // zero abria um anel escuro entre o disco e a casca
    //
    // A convecção vem do ASSADO (`cirurgiaDoAssado`): duas leituras com a
    // troca suave, sem a fervura por ruído do domínio (o assado já anda). A
    // temperatura vira imagem pelo INSTRUMENTO do Sol com o peso do filtro
    // (`pesoDoFiltro`): nas frias, o calor da rampa H-alfa (cor e brilho, o
    // creme no topo); nas quentes, a razão de Planck do contínuo, como antes
    const d = o.forja.contrasteNaTela / 4;
    const wF = pesoDoFiltro(teff);
    // A REGIÃO FRIA (`EscurecimentoDoMotor`): além da borda (`uManchaFria.w`)
    // na direção do lado escuro no céu da Terra (`uManchaFria.xyz`, na base da
    // cena, como a normal N), larga (`BORDA_DA_MANCHA_FRIA`) e deslocada pelo
    // campo das células (`BORDA_PELAS_CELULAS`); dentro, o brilho das células
    // cede (`brilhoDasCelulasNaRegiaoFria`) e a razão das temperaturas
    // (`rFria`) entra depois, pela lei de Planck e pelo TiO — a rampa do
    // instrumento vê só a convecção. Só com `MANCHA_FRIA` definido
    // (`escreverManchaFria`, dentro da janela): fora dela o programa é o de
    // antes, bit a bit — um fator 1 exato no texto compilado ainda mudava
    // pixels em 1 nível (o compilador reassocia)
    // a régua σ da região fria nunca é zero: uma estrela lisa (contraste 0)
    // com escurecimento daria 0/0 no shader (um NaN + bloom branqueia a tela);
    // com dForja = 0 o piso não muda nada
    const D = literalGlsl(Math.max(d, 1e-4));
    const manchaFria = o.manchaFria
      ? '#ifdef MANCHA_FRIA\n' +
        '  float dForja = rForja - 1.0;\n' +
        `  float mFria = smoothstep(uManchaFria.w - ${literalGlsl(BORDA_DA_MANCHA_FRIA)}, uManchaFria.w + ${literalGlsl(BORDA_DA_MANCHA_FRIA)}, dot(N, uManchaFria.xyz) + ${literalGlsl(BORDA_PELAS_CELULAS)}*clamp(dForja / ${D}, -2.0, 2.0));\n` +
        `  rForja = 1.0 + mix(dForja, dForja > 0.0 ? dForja / (1.0 + 2.0 * dForja / ${D}) : dForja, mFria);\n` +
        '  float rFria = mix(1.0, uManchaFriaK, mFria);\n' +
        '#endif\n'
      : '';
    // a razão das temperaturas na cor e no brilho: Planck por canal e o TiO
    // na temperatura local da região (a diferença sobre o TiO de antes)
    const manchaFriaNaCor = o.manchaFria
      ? '#ifdef MANCHA_FRIA\n' +
        `  float xTiOAntes = clamp((4000.0 - ${literalGlsl(teff)}*rForja) / 1000.0, 0.0, 1.0);\n` +
        `  float xTiOFria = clamp((4000.0 - ${literalGlsl(teff)}*rFria*rForja) / 1000.0, 0.0, 1.0);\n` +
        `  color *= exp(-${literalGlsl(TIO_DA_FORJA)} * (xTiOFria * (2.0 - xTiOFria) - xTiOAntes * (2.0 - xTiOAntes)) * vec3(0.0, 1.0, 1.0));\n` +
        `  color *= razaoDePlanck(${xDePlanckGlsl(teff)}, rFria);\n` +
        '#endif\n'
      : '';
    if (o.manchaFria) {
      f =
        '#ifdef MANCHA_FRIA\nuniform vec4 uManchaFria;\nuniform float uManchaFriaK;\n' +
        (planck ? '' : GLSL_RAZAO_DE_PLANCK) +
        '#endif\n' +
        f;
    }
    f = trocarUma(
      f,
      '  heat = clamp(heat, 0.0, 1.24);',
      `  float rForja = max(0.5, 1.0 + ${literalGlsl(d)}*mu*conveccaoDoAssado(st, sp, t));\n` +
        manchaFria +
        `  float calorDaForja = heat + ${literalGlsl(wF * GANHO_DO_INSTRUMENTO)}*(rForja - 1.0);\n` +
        '  heat = clamp(calorDaForja, 0.0, 1.24);',
      quem
    );
    // o creme do Sol (o da plage, que sem campo é 0) pelas regiões mais
    // quentes; e, onde há células quentes enormes, a ponta HDR da rampa
    // (`PONTA_DAS_CELULAS_QUENTES`)
    const ponta = PONTA_DAS_CELULAS_QUENTES.ganho * wF * pesoDasCelulasQuentes(o.forja);
    f = trocarUma(
      f,
      '  color = mix(color, vec3(1.0, 0.86, 0.62), 0.55 * smoothstep(0.55, 1.0, clamp(plage, 0.0, 1.0)) * smoothstep(0.72, 1.12, heat));',
      `  color = mix(color, vec3(1.0, 0.86, 0.62), ${literalGlsl(0.55 * wF)} * smoothstep(0.72, 1.12, heat));` +
        (ponta > 0
          ? `\n  color *= 1.0 + ${literalGlsl(ponta)} * smoothstep(${literalGlsl(PONTA_DAS_CELULAS_QUENTES.de)}, ${literalGlsl(PONTA_DAS_CELULAS_QUENTES.ate)}, calorDaForja);`
          : ''),
      quem
    );
    const planckDaForja =
      (wF >= 1 ? '' : `  color *= mix(razaoDePlanck(${xDePlanckGlsl(teff)}, rForja), vec3(1.0), ${literalGlsl(wF)});\n`) +
      glslDoTiONaForja(teff, d) +
      manchaFriaNaCor;
    const frente = frenteDaAtmosfera(o.forja.atmosferaEmRaios);
    // o piso de 1,5 px em μ² (`pisoDaBorda`) e a FUNDURA da queda: onde a
    // borda de verdade é mais fina que o piso, a queda desenhada é mais larga
    // que a real e por isso mais rasa na mesma proporção (largura real /
    // largura desenhada, em ρ: μw²/piso) — o pixel mostra a média. Sem isso a
    // anã quente, de borda mil vezes mais fina que o pixel, ganhava um
    // contorno preto de 1,5 px entre o disco e o véu (Fomalhaut, 16/11)
    const mw2 = o.forja.bordaEmMu * o.forja.bordaEmMu;
    const pisoDaBorda = '  float pisoDaBorda = 3.0*fwidth(sqrt(max(0.0, 1.0 - mu*mu)));\n';
    const fundo = `max(${literalGlsl(frente)}, 1.0 - min(1.0, ${literalGlsl(mw2)}/max(pisoDaBorda, 1e-9)))`;
    const borda = `smoothstep(0.0, max(${literalGlsl(o.forja.bordaEmMu)}, sqrt(pisoDaBorda)), mu)`;
    f = trocarUma(
      f,
      '  vec2 buv = vec2(fract(vUvV.x + boil.x*0.0035), clamp(vUvV.y + boil.y*0.0035, 0.0, 1.0));',
      '  vec2 buv = vUvV;',
      quem
    );
    f = trocarUma(
      f,
      '  vec4 st = mix(mix(texture2D(uChromoFarP, buv), texture2D(uChromoTexP, buv), kNear),',
      '  vec4 st = mix(texture2D(uChromoFarP, buv), texture2D(uChromoFar, buv), uBakeMix);',
      quem
    );
    f = trocarUma(f, '                mix(texture2D(uChromoFar,  buv), texture2D(uChromoTex,  buv), kNear), uBakeMix);', '', quem);
    f = trocarUma(
      f,
      '  color *= (1.0-limbU) + limbU*mu;',
      planckDaForja +
        '  color *= (1.0-limbU) + limbU*mu;\n' +
        pisoDaBorda +
        `  color *= mix(${fundo}, 1.0, ${borda});`,
      quem
    );
    // a leitura do assado usa o `snoise` do vendorizado: entra antes do main
    const i = f.lastIndexOf('void main(){');
    if (i < 0) throw new Error(`${quem}: a âncora \`void main(){\` sumiu do vendorizado (sol/sun.js)`);
    f = f.slice(0, i) + glslDaForjaNaFotosfera(o.forja, calibracaoDaForja(o.forja.fracaoEscura, o.forja.desordem)) + f.slice(i);
  }
  if ((o.continuo ?? 0) > 0) {
    // a temperatura no centro do disco (μ = 1) é a régua: o centro sai como
    // antes e a borda esfria pela lei, em cada canal
    const t1 = teff * Math.pow(1.25, 0.25);
    f = trocarUma(
      f,
      '  color *= (1.0-limbU) + limbU*mu;',
      `  color *= mix(vec3((1.0-limbU) + limbU*mu), razaoDePlanck(${xDePlanckGlsl(t1)}, pow((mu + 0.6666667)/1.6666667, 0.25)), ${literalGlsl(Math.min(1, o.continuo!))});`,
      quem
    );
  }
  if (o.pontaDoPico) {
    // a PONTA DO PICO (`PONTA_DO_PICO`): o sensor que estoura
    const q = o.pontaDoPico.peso;
    const g = o.gravidade
      ? `max(0.0, dot(vGravidade, vec3(0.2126, 0.7152, 0.0722)) / ${literalGlsl(o.pontaDoPico.lumPolo)})`
      : '1.0';
    f = trocarUma(
      f,
      '  color *= uPaleta;',
      `  float gDoPico = ${g};\n  float gDoPico2 = gDoPico*gDoPico;\n` +
        '  float lDoPico = 0.4 + 0.6*mu;\n  float lDoPico2 = lDoPico*lDoPico;\n' +
        '  float quenteDoPico = gDoPico2*gDoPico2*gDoPico2 * lDoPico2*lDoPico2;\n' +
        `  color *= 1.0 + ${literalGlsl(PONTA_DO_PICO.ganho * q)} * quenteDoPico;\n` +
        `  color = mix(color, vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), min(1.0, ${literalGlsl(PONTA_DO_PICO.branco * q)} * quenteDoPico));\n` +
        '  color *= uPaleta;',
      quem
    );
  }
  return planck + granulacao + f;
}

/** a luminância de `aGravidade` no polo (a mesma conta de `operarAFotosfera`) */
function lumDoPolo(teffK: number, a: Achatamento): number {
  const tp = rocheDe(0, a).teffK;
  const cp = corpoNegroUnitario(tp);
  const cm = corpoNegroUnitario(teffK);
  const b = radianciaVisivelDeCorpoNegro(tp) / radianciaVisivelDeCorpoNegro(teffK);
  return (0.2126 * cp[0]) / cm[0] * b + (0.7152 * cp[1]) / cm[1] * b + (0.0722 * cp[2]) / cm[2] * b;
}

/**
 * A GRANULAÇÃO VIVA de uma estrela sem dínamo — a convecção da fotosfera em
 * luz branca, que no Sol fica por baixo da textura H-alfa e sem campo é o
 * que sobra: um MOSQUEADO MOLE de subidas claras (uma gaussiana por célula,
 * σ = 0,4 célula, peso de 0,5 a 1,5, centros que derivam devagar), sem a
 * aresta de F2 − F1 — a faixa de descida desenhada lia como uma rede de
 * favo (Vega, 12/11). Nas estrelas que ficaram sem dínamo (as A e a
 * supergigante) a convecção é rasa ou coberta, e as simulações dão células
 * de contorno difuso (Tremblay et al. 2013; Kallinger & Matthews 2010).
 * Normalizada a média 0 e desvio 1 (Monte Carlo na esfera, 2·10⁵ amostras:
 * média 0,355, desvio 0,31). Duas atenuações, nenhuma de gosto:
 *  · o ESCORÇO: o contraste cai ∝ μ para a borda, onde a linha de visada
 *    atravessa camadas mais altas, de flutuação menor (no Sol o contraste
 *    da granulação cai para o limbo) — ARTÍSTICO na forma, declarado;
 *  · o PIXEL: célula menor que ~2 px é a média dela (0), não um serrilhado —
 *    o filtro da própria tela (`fwidth`), que também apaga o adensamento do
 *    escorço rente à borda.
 * O ganho em `heat` por contraste relativo ao Sol (`GRANULACAO_VIVA`) põe o
 * rms do Sol (0,15) em ~15 % de brilho no meio do disco.
 */
const GRANULACAO_VIVA = 0.09;
const GLSL_GRANULACAO_VIVA = /* glsl */ `
vec3 hashDoGranulo(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
float granulacaoViva(vec3 p, float t, float mu) {
  // o tamanho do pixel em células, antes da torção (ela é suave)
  float px = length(fwidth(p));
  float filtro = 1.0 - smoothstep(0.25, 0.6, px);
  if (filtro <= 0.0) return 0.0;
  // domínio torcido: grânulo é célula de fluido, não poliedro
  p += 0.32 * sin(p.yzx * 0.9 + t * 0.05) + 0.12 * sin(p.zxy * 2.7 + 4.1);
  vec3 c = floor(p);
  vec3 f = p - c;
  float G = 0.0;
  for (int i = -1; i <= 1; i++)
  for (int j = -1; j <= 1; j++)
  for (int l = -1; l <= 1; l++) {
    vec3 o = vec3(float(i), float(j), float(l));
    vec3 h = hashDoGranulo(c + o);
    vec3 q = o + 0.5 + 0.4 * sin(6.2831853 * h + t * 0.3 * (0.5 + h)) - f;
    G += (0.5 + h.x) * exp(-dot(q, q) / 0.16);
  }
  return (G - 0.355) / 0.31 * filtro * mu;
}
`;

/**
 * A CONVECÇÃO DA FORJA (docs/LEI-DA-ESTRELA.md §10), ASSADA: o
 * assado que o motor do Sol já tem (`sol/chromo.js`: equirretangular, em
 * fatias por quadro, três conjuntos e a troca suave `uBakeMix`) pinta a
 * convecção no lugar da cromosfera (`cirurgiaDoAssado`), sem a passagem
 * smear, e a fotosfera só o lê (`glslDaForjaNaFotosfera`). Os canais:
 * R o miolo (o brilho da célula sem a faixa; as células quentes e a
 * turbulência fina já entram nele em unidades de z × s), G e B o VETOR
 * ATÉ A BORDA da célula no plano tangente (leste, norte; em células) e A a
 * escuridão da faixa. O vetor passa por zero linearmente na borda, dos dois
 * lados, então a leitura bilinear o reconstrói sem pontilhado; a FAIXA é
 * desenhada POR PIXEL do comprimento dele, como uma letra por campo de
 * distância: fina e nítida em qualquer distância com a textura a ~8 texels
 * por célula (`larguraDoAssado`). A forma é ARTÍSTICA, declarada; cada traço tem nome:
 *  · ADVECÇÃO: o domínio é levado, em dois passos, pelo escoamento da
 *    simulação de `sol/granulation.js` — o rotacional do campo que ela
 *    transporta, no retrato do mesmo ciclo (`snapshotBakeInputs`): as células
 *    se torcem e se enrolam com o fluxo, no relógio do próprio assado; o
 *    passo some com cos(latitude) perto dos polos, onde a simulação
 *    equirretangular se espreme num leque;
 *  · TAMANHOS DE LARGA DISTRIBUIÇÃO: a lente (célula de 0,77× a 2×) e o peso
 *    de cada célula (0,85 a 1,15) num Worley 3D de 27 vizinhas;
 *  · CÉLULA CLARA DE BORDA NÍTIDA: o domo e a faixa fina
 *    (`MEIA_FAIXA_DA_FORJA`); as maiores um pouco mais claras (Magic & Asplund 2014);
 *  · FAIXA FINA E RAMIFICADA: mais estreita que a do Sol (Ludwig & Kučinskas
 *    2012), de largura e escuridão que variam ao longo do contorno (um ruído
 *    da posição, o mesmo dos dois lados), com trechos que somem — células
 *    que se fundem ou se partem;
 *  · ESTRUTURA INTERNA: cristas claras e dobras escuras por dentro da célula
 *    (a "Giant" de Trampedach), ruído em crista que some perto da faixa;
 *  · DESORDEM (o Mach pela gravidade, `desordemDaConveccao`): só uma torção
 *    média e branda do domínio e um passo maior da advecção (a torção forte
 *    da volta 3 virou fumaça);
 *  · SUPERGIGANTE (`pesoProfundo` > 0): seis células quentes enormes, de
 *    0,25 a 0,375 rad de raio, platô até a metade e meio-brilho a ~0,9
 *    raio (5 % a 11 % do disco cada, de frente; a mancha de Haubois, 6 %;
 *    a escala profunda de 0,5 R de diâmetro; de uma a três no disco), menos
 *    as duas opostas de g0, as MAIORES, de 1 R a meio brilho e pico inteiro
 *    (`LARGURA_DA_MANCHA_MAIOR_EM_RAIOS`, Montargès et al. 2016: de qualquer
 *    lado uma delas está no disco), no pico `picoQuente` (o da mancha medida
 *    da estrela ou a regra de Haubois et al. 2009), com 60 % menos contraste
 *    das células comuns por dentro na proporção do pico sobre o da regra
 *    (`picoDaRegra`), levadas pelo
 *    mesmo escoamento, e uma turbulência fina enrolada por cima (Antares do
 *    ESO, eso1726) com desvio de ~0,5 em z.
 * O σ do domo e a largura das faixas saem de UM botão `k`,
 * calibrado pela FRAÇÃO ESCURA da regra (`fracaoEscura`) em
 * `calibracaoDaForja`.
 */
/**
 * O PASSO DA ADVECÇÃO, em células por unidade do rotacional do campo da
 * simulação (medido: 0,77 por radiano em média, desvio 0,38), × (0,5 +
 * desordem), com TETO de 0,1 rad: o rotacional, lido a ±6 texels da
 * simulação, muda numa escala de ~0,15 rad, e um passo maior dobra o domínio
 * sobre si (vira ruído). ARTÍSTICO, declarado.
 */
const ADVECCAO_DA_FORJA = 1;
const TETO_DA_ADVECCAO = 0.025;
/** o desvio da turbulência fina das supergigantes, em z — ARTÍSTICO */
const TURBULENCIA_DAS_SUPERGIGANTES = 0.5;
/** a média de (1 − |n|)³ do ruído simplex, para centrar a turbulência (medida) */
const MEDIA_DA_TURBULENCIA = 0.42;

const GLSL_RUIDO_DA_FORJA = /* glsl */ `
vec3 hashDaForja(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
// três campos suaves de valor (0 a 1)
vec3 valorDaForja(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  vec3 r = vec3(0.0);
  for (int a = 0; a <= 1; a++)
  for (int b = 0; b <= 1; b++)
  for (int c = 0; c <= 1; c++) {
    vec3 o = vec3(float(a), float(b), float(c));
    vec3 w = mix(1.0 - f, f, o);
    r += w.x * w.y * w.z * hashDaForja(i + o);
  }
  return r;
}
`;

/** O fragment do assado da Forja: as funções e o `main` (ver acima). */
export function glslDoAssadoDaForja(
  forja: RegraDaForja,
  cal: CalibracaoDaForja = calibracaoDaForja(forja.fracaoEscura, forja.desordem),
  manchaFria = false
): string {
  const { sigma, espalhamento } = perfilDaForja(cal.k);
  const D = Math.min(1, Math.max(0, forja.desordem));
  const w = Math.min(1, Math.max(0, forja.pesoProfundo));
  const L = (x: number) => literalGlsl(x);
  const cel = forja.celulaNaTelaEmRaios;
  const delta = forja.contrasteNaTela / 4;
  const zQuente = delta > 0 ? forja.picoQuente / delta : 0;
  // o acabamento por dentro (as células comuns que perdem contraste) na
  // proporção do pico sobre o da regra, onde ele foi acertado: uma mancha
  // medida fraca (Antares) não alisa o que não aquece
  const alisa = forja.picoDaRegra > 0 ? Math.min(1, Math.max(0, forja.picoQuente / forja.picoDaRegra)) : 0;
  // o peso das células quentes: a mancha medida inteira; a da regra pelo
  // peso da escala profunda, que também leva o alisamento (sem degrau em log g 1)
  const wq = pesoDasCelulasQuentes(forja);
  const passo = Math.min(TETO_DA_ADVECCAO, ADVECCAO_DA_FORJA * cel * (0.5 + D));
  const quentes =
    wq > 0
      ? `
  // as células quentes enormes, levadas pelo mesmo escoamento
  // nos seis vértices de um octaedro girado: de qualquer lado, uma a três no disco
  float quente = 0.0;
  vec3 g0 = normalize(vec3(0.62, 0.35, -0.70));
  vec3 g1 = normalize(cross(g0, vec3(0.0, 1.0, 0.0)));
  vec3 g2 = cross(g0, g1);
  for (int i = 0; i < 6; i++) {
    vec3 h = hashDaForja(vec3(float(i) * 7.13 + 3.31, 1.73, 9.21));
    vec3 e = i < 2 ? g0 : (i < 4 ? g1 : g2);
    vec3 dir = (mod(float(i), 2.0) < 0.5 ? e : -e);
    // o meio-brilho em ~0,9 raio: cada uma cobre 5 % a 11 % do disco de
    // frente (a mancha de Haubois, 6 %), com um platô no pico; a MAIOR, nos
    // dois polos de g0 (de qualquer lado, uma no disco), tem 1 R a meio
    // brilho e o pico inteiro (Montargès 2016)
    bool maior = i < 2;
    float raio = maior ? ${L(LARGURA_DA_MANCHA_MAIOR_EM_RAIOS / 1.8)} : ${L(0.5 * CELULA_PROFUNDA_EM_RAIOS)} + ${L(0.25 * CELULA_PROFUNDA_EM_RAIOS)} * h.x;
    quente = max(quente, (maior ? 1.0 : 0.7 + 0.3 * h.y) * (1.0 - smoothstep(0.5 * raio, 1.3 * raio, length(q - dir))));
  }
  // a turbulência fina, enrolada por um domínio torcido
  vec3 tq = q * ${L(1.2 / cel)} + 5.0;
  tq += 0.9 * vec3(snoise(tq * 0.45 + 1.3), snoise(tq * 0.45 + 7.9), snoise(tq * 0.45 + 4.6));
  float tb = max(0.0, 1.0 - abs(snoise(tq * 1.6 + vec3(0.0, 0.0, t * 0.03))));
  tb = tb * tb * tb - ${L(MEDIA_DA_TURBULENCIA)};
  // dentro da célula quente as células comuns perdem parte do contraste
  // (ela sobe inteira): a mancha lê como UMA região clara, não como
  // células mais claras${
    manchaFria
      ? `
#ifdef MANCHA_FRIA
  // na REGIÃO FRIA de um escurecimento não há célula quente: nem o pico nem o
  // alisamento por dentro — a rede comum de antes volta (uManchaFriaAssado:
  // o lado escuro no referencial deste assado e a borda, como na fotosfera)
  quente *= 1.0 - smoothstep(uManchaFriaAssado.w - ${L(BORDA_DA_MANCHA_FRIA)}, uManchaFriaAssado.w + ${L(BORDA_DA_MANCHA_FRIA)}, dot(sp, uManchaFriaAssado.xyz));
#endif`
      : ''
  }
  a.x = mix(a.x, ${L(cal.m)}, ${L(0.6 * alisa * wq)} * quente) + ${L(cal.s)} * (${L(zQuente * wq)} * quente + ${L(TURBULENCIA_DAS_SUPERGIGANTES * w * 3)} * tb);
  a.w *= 1.0 - ${L(0.85 * alisa * wq)} * quente;`
      : '';
  return (
    (manchaFria && wq > 0 ? '#ifdef MANCHA_FRIA\nuniform vec4 uManchaFriaAssado;\n#endif\n' : '') +
    GLSL_RUIDO_DA_FORJA +
    /* glsl */ `
// a lente: o domínio aumentado (célula maior) ou encolhido de lugar para lugar
vec3 lenteDaForja(vec3 p) {
  vec3 q = p / 3.0;
  vec3 b0 = floor(q - 0.5);
  vec3 desl = vec3(0.0);
  for (int i = 0; i <= 1; i++)
  for (int j = 0; j <= 1; j++)
  for (int l = 0; l <= 1; l++) {
    vec3 cc = b0 + vec3(float(i), float(j), float(l));
    vec3 r = q - (cc + 0.5 + 0.5 * (hashDaForja(cc + 13.1) - 0.5));
    float s = dot(r, r) / 0.5625;
    if (s < 1.0) desl += r * (0.8 * hashDaForja(cc + 71.3).x - 0.3) * (1.0 - s) * (1.0 - s);
  }
  return p - 3.0 * desl;
}
// o campo que a simulação transporta, numa direção (a convenção do assado)
float simDaForja(vec3 d) {
  return texture2D(uSimTex, vec2(fract(atan(d.z, d.x) / 6.28318530718), asin(clamp(d.y, -1.0, 1.0)) / 3.14159265359 + 0.5)).r;
}
// o escoamento: o rotacional do campo transportado, tangente à esfera
vec3 escoamentoDaForja(vec3 p) {
  vec3 e = normalize(vec3(p.z, 0.0, -p.x) + vec3(1e-4, 0.0, 0.0));
  vec3 n = cross(p, e);
  float h = 50.2654825 * uSimTexel.x;
  vec3 g = e * (simDaForja(normalize(p + h * e)) - simDaForja(normalize(p - h * e)))
         + n * (simDaForja(normalize(p + h * n)) - simDaForja(normalize(p - h * n)));
  return cross(p, g) / (2.0 * h);
}
// x: o miolo; y: φ = F2 − F1; w: a escuridão da faixa; gF: o gradiente de φ
vec4 celulaDaForja(vec3 p, float t, out vec3 gF) {
  p = lenteDaForja(p);
  p += 0.42 * sin(p.yzx * 0.9 + t * 0.05) + 0.16 * sin(p.zxy * 2.1 + 4.1) + 0.04 * sin(p.yzx * 4.9 + 1.3);
  p += ${L(0.12 + 0.25 * D)} * (valorDaForja(p * 1.13 + vec3(2.1, 8.4, 4.6) + t * 0.01) - 0.5);
  vec3 c = floor(p);
  vec3 f = p - c;
  float d1 = 8.0;
  float d2 = 8.0;
  vec3 h1 = vec3(0.5);
  // ∇F de cada uma das duas mais perto (F = |q|/peso, q = centro − p)
  vec3 g1 = vec3(0.0);
  vec3 g2 = vec3(0.0);
  for (int i = -1; i <= 1; i++)
  for (int j = -1; j <= 1; j++)
  for (int l = -1; l <= 1; l++) {
    vec3 o = vec3(float(i), float(j), float(l));
    vec3 h = hashDaForja(c + o);
    vec3 q = o + 0.5 + 0.4 * sin(6.2831853 * h + t * 0.3 * (0.5 + h)) - f;
    float pe = 0.85 + 0.3 * h.y;
    float d = length(q) / pe;
    vec3 g = -q / max(length(q) * pe, 1e-6);
    if (d < d1) { d2 = d1; g2 = g1; d1 = d; g1 = g; h1 = h; }
    else if (d < d2) { d2 = d; g2 = g; }
  }
  gF = g2 - g1;
  float tam = 0.85 + 0.3 * h1.y;
  float u = (d2 - d1) / max(d2 + d1, 1e-6);
  float domo = exp(-(d1 * d1) / ${L(sigma * sigma)});
  vec3 nn = valorDaForja(p * 0.6 + 3.7);
  float n1 = clamp(0.5 + 1.6 * (nn.x - 0.5), 0.0, 1.0);
  float n2 = clamp(0.5 + 1.6 * (nn.y - 0.5), 0.0, 1.0);
  // trechos da faixa que somem: células que se fundem ou se partem
  float seg = smoothstep(0.12, 0.42, nn.z);
  float esc = (0.6 + 0.4 * n1) * (0.8 + 0.2 * n2) * seg;
  float pico = 1.0 + ${L(espalhamento)} * (0.25 * (tam - 1.0) + 0.15 * (h1.x - 0.5));
  // o miolo; a faixa é desenhada por pixel
  float v = pico * domo;
  // por dentro: cristas claras e dobras escuras, que somem perto da faixa
  float dentro = smoothstep(0.06, 0.3, u);
  float crista = max(0.0, 1.0 - abs(snoise(p * 1.7 + vec3(0.0, 0.0, t * 0.02))));
  float dobra = max(0.0, 1.0 - abs(snoise(p * 3.1 + vec3(5.1, 2.3, t * 0.03))));
  dobra *= dobra;
  v += dentro * (0.1 * crista * crista * crista - 0.08 * dobra * dobra * dobra);
  return vec4(v, d2 - d1, 0.0, esc);
}
void main(){
  float lon = vUv.x * 6.28318530718;
  float lat = (vUv.y - 0.5) * 3.14159265359;
  vec3 sp = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  float t = uTime;
  // perto dos polos a simulação (equirretangular) se espreme num leque: o
  // passo some com cos(latitude), de 37° a 84°
  float passo = ${L(passo)} * smoothstep(0.1, 0.8, cos(lat));
  vec3 q = normalize(sp + passo * escoamentoDaForja(sp));
  q = normalize(q + passo * escoamentoDaForja(q));
  vec3 gF;
  vec4 a = celulaDaForja(q / ${L(cel)} + 17.0, t * ${L(forja.ritmo)}, gF);${quentes}
  // o VETOR ATÉ A BORDA, no plano tangente (leste, norte), em células:
  // −φ∇φ/|∇φ|². Dos dois lados da borda ele aponta para ela e passa por
  // zero linearmente, então a leitura bilinear (e a troca suave entre dois
  // assados) o reconstrói sem o pontilhado de |distância|
  vec2 gT = vec2(dot(gF, vec3(-sin(lon), 0.0, cos(lon))), dot(gF, vec3(-sin(lat) * cos(lon), cos(lat), -sin(lat) * sin(lon))));
  vec2 vb = -a.y * gT / max(dot(gT, gT), 1e-4);
  vb *= min(1.0, 1.0 / max(length(vb), 1e-6));
  gl_FragColor = vec4(a.x, vb, min(1.0, a.w));
}
`
  );
}

/**
 * A CIRURGIA DO ASSADO, pura: o `main` do assado da cromosfera
 * (`sol/chromo.js`) dá lugar ao da convecção (`glslDoAssadoDaForja`); o que
 * vem antes (ruídos, uniforms, o retrato da simulação) fica.
 */
export function cirurgiaDoAssado(fragment: string, forja: RegraDaForja, manchaFria = false): string {
  const i = fragment.lastIndexOf('void main(){');
  if (i < 0) throw new Error('cirurgiaDoAssado: a âncora `void main(){` sumiu de sol/chromo.js');
  return fragment.slice(0, i) + glslDoAssadoDaForja(forja, undefined, manchaFria);
}

/** Sem a passagem smear na Forja: o `main` dela vira uma cópia (só compila; não roda). */
export function cirurgiaDoSmear(fragment: string): string {
  const i = fragment.lastIndexOf('void main(){');
  if (i < 0) throw new Error('cirurgiaDoSmear: a âncora `void main(){` sumiu de sol/chromo.js');
  return fragment.slice(0, i) + 'void main(){ gl_FragColor = texture2D(uSrc, vUv); }\n';
}

/**
 * A LARGURA DA FAIXA, meia largura em células, pela escuridão dela (a
 * descida mais forte é a mais larga — ARTÍSTICO): de 0,02 a 0,055 × o
 * botão `faixa` do perfil, uma faixa inteira (a meia altura) de ~4 % a ~10 %
 * da célula, mais estreita que a do Sol (Ludwig & Kučinskas 2012).
 */
export const MEIA_FAIXA_DA_FORJA = { base: 0.02, porEscuridao: 0.035 } as const;

/**
 * A convecção na fotosfera, POR PIXEL, a partir do assado (`st`, as duas
 * leituras com a troca suave): a distância à borda é o comprimento do vetor
 * até ela (G, B), e a faixa sai dela com a largura da escuridão (A), com
 * largura mínima de ~0,6 pixel, clareando na proporção (antisserrilhado);
 * z normalizado pela calibração; de perto (a célula acima de ~8 px) uma
 * oitava fina por cima, que some pelo pixel; de longe (célula abaixo de
 * ~2 px), a média (0).
 */
function glslDaForjaNaFotosfera(forja: RegraDaForja, cal: CalibracaoDaForja): string {
  const L = (x: number) => literalGlsl(x);
  const cel = forja.celulaNaTelaEmRaios;
  const fx = perfilDaForja(cal.k).faixa;
  return /* glsl */ `
float conveccaoDoAssado(vec4 a, vec3 sp, float t) {
  // as derivadas antes de qualquer desvio (fora dele são indefinidas)
  float pxCel = length(fwidth(sp)) / ${L(cel)};
  // onde a segunda célula mais perto troca dentro de uma célula, os vetores
  // dos dois lados apontam para bordas opostas e a leitura bilinear passa
  // por zero sem borda nenhuma: lá o vetor muda ~2·distância por texel, numa
  // borda de verdade ~1 por célula — a faixa só onde a taxa é a de uma borda
  float taxa = length(fwidth(a.yz)) / max(pxCel, 1e-6);
  float filtro = 1.0 - smoothstep(0.25, 0.5, pxCel);
  if (filtro <= 0.0) return 0.0;
  float hw = ${L(fx * MEIA_FAIXA_DA_FORJA.base)} + ${L(fx * MEIA_FAIXA_DA_FORJA.porEscuridao)} * a.w;
  float hwE = max(hw, 0.6 * pxCel);
  float x = length(a.yz) / hwE;
  float x2 = x * x;
  float faixa = hw / hwE * exp(-x2 - x2 * x2) * (1.0 - smoothstep(3.0, 6.0, taxa));
  float v = a.x * (1.0 - a.w * faixa);
  float perto = 1.0 - smoothstep(0.0625, 0.125, pxCel);
  if (perto > 0.0) {
    v += perto * (1.0 - smoothstep(0.1, 0.2, pxCel * 2.5)) * ${L(0.06)} * (1.0 - faixa)
      * snoise(sp * ${L(2.5 / cel)} + vec3(0.0, 0.0, t * 0.02));
  }
  return filtro * (v - ${L(cal.m)}) / ${L(cal.s)};
}
`;
}

/**
 * A CALIBRAÇÃO DA FORJA, MEDIDA NO PRÓPRIO ASSADO (16/11, na GPU: o assado
 * de Arcturus, 1024 × 512, lido de volta em 3 × 3 pontos bilineares por
 * texel e pesado pela área, cos lat, com a faixa fina da fotosfera sem o
 * filtro do pixel): para cada `k`, a
 * fração da área abaixo da média e a normalização (média m, desvio s) com
 * desordem 0, ½ e 1 (a desordem quase não muda a estatística). A fração vai
 * de 0,502 (k = 0, domo estreito: o miolo cai até a borda) a 0,338 (k = 1,2,
 * células chapadas e só a rede escura abaixo da média): 0,5 nas frias e
 * 0,34 a 8.000 K (Steffen 2005) caem dentro.
 */
const TABELA_DA_FORJA = [
  { k: 1.2, fracao: 0.3376, m: [0.8736, 0.8738, 0.8741], s: [0.1692, 0.1689, 0.1685] },
  { k: 0.9, fracao: 0.3479, m: [0.831, 0.8313, 0.8316], s: [0.1862, 0.1859, 0.1855] },
  { k: 0.75, fracao: 0.3615, m: [0.8038, 0.8041, 0.8044], s: [0.1942, 0.1939, 0.1936] },
  { k: 0.6, fracao: 0.38, m: [0.7707, 0.771, 0.7714], s: [0.2021, 0.2019, 0.2016] },
  { k: 0.45, fracao: 0.4032, m: [0.7293, 0.7297, 0.73], s: [0.2104, 0.2102, 0.2099] },
  { k: 0.3, fracao: 0.4311, m: [0.6761, 0.6765, 0.6768], s: [0.2195, 0.2192, 0.219] },
  { k: 0.15, fracao: 0.4637, m: [0.6059, 0.6063, 0.6067], s: [0.2294, 0.2292, 0.229] },
  { k: 0, fracao: 0.5021, m: [0.512, 0.5123, 0.5127], s: [0.239, 0.2389, 0.2388] },
] as const;

export type CalibracaoDaForja = { k: number; m: number; s: number };

/**
 * o perfil de um `k`: a largura do domo (σ, em células), a escala da largura
 * das faixas e o espalhamento do brilho por
 * célula (1 até k = 1,5, depois mais estreito)
 */
export function perfilDaForja(k: number): { sigma: number; faixa: number; espalhamento: number } {
  return {
    sigma: 0.66 + 0.9 * k,
    faixa: Math.max(0.3, 1.3 - 0.5 * k),
    espalhamento: k <= 1.5 ? 1 : Math.max(0, 1 - 0.5 * (k - 1.5)),
  };
}

/**
 * a linha da tabela para uma fração escura (o `k`, pela coluna sem
 * desordem) e a normalização daquele `k` na desordem dada — tudo
 * interpolado, limitado às pontas
 */
export function calibracaoDaForja(fracao: number, desordem: number = 0): CalibracaoDaForja {
  const T = TABELA_DA_FORJA;
  let i = 1;
  while (i < T.length - 1 && fracao > T[i]!.fracao) i++;
  const a = T[i - 1]!;
  const b = T[i]!;
  const x = Math.min(1, Math.max(0, (fracao - a.fracao) / (b.fracao - a.fracao)));
  const m = (u: number, v: number) => u + x * (v - u);
  const d = 2 * Math.min(1, Math.max(0, desordem));
  const j = Math.min(1, Math.floor(d));
  const y = d - j;
  const col = (c: readonly number[]) => c[j]! + y * (c[j + 1]! - c[j]!);
  return { k: m(a.k, b.k), m: m(col(a.m), col(b.m)), s: m(col(a.s), col(b.s)) };
}

/**
 * A EXPOSIÇÃO ACOMPANHA O TiO: a absorção no centro do disco (na Teff) é
 * dividida de volta na luminância da tela, onde o verde e o azul pesam ~0,7
 * numa gigante fria (Antares da volta 5: 0,7152·106 + 0,0722·30 contra
 * 0,2126·161) — o disco guarda o brilho de antes e muda a cor, como uma
 * foto exposta pelo disco. ARTÍSTICO, declarado.
 */
const VERDE_DA_LUMINANCIA_FRIA = 0.7;

/** o TiO por pixel (`pesoDoTiO`, `TIO_DA_FORJA`), só onde algum pixel pode cair abaixo de 4.000 K */
function glslDoTiONaForja(teffK: number, d: number): string {
  // r ≥ 1 − 6δ (a descida mais funda do assado normalizado) e r ≥ 0,5
  if (teffK * Math.max(0.5, 1 - 6 * d) >= 4000) return '';
  const fTeff = Math.exp(-TIO_DA_FORJA * pesoDoTiO(teffK));
  const exposicao = 1 / (1 - VERDE_DA_LUMINANCIA_FRIA + VERDE_DA_LUMINANCIA_FRIA * fTeff);
  return (
    `  float xTiO = clamp((4000.0 - ${literalGlsl(teffK)}*rForja) / 1000.0, 0.0, 1.0);\n` +
    `  color *= ${literalGlsl(exposicao)} * exp(-${literalGlsl(TIO_DA_FORJA)} * xTiO * (2.0 - xTiO) * vec3(0.0, 1.0, 1.0));\n`
  );
}

/**
 * A PONTA HDR DA RAMPA, só onde há células quentes enormes (peso da escala
 * profunda > 0): a rampa do instrumento satura no creme (calor 1,24), e a
 * mancha de Haubois (δ ≈ 0,15, ~2,6× o brilho médio no visível) passa do
 * topo; ali o calor sem o teto vira brilho a mais (×(1 + g·w·s), w o peso
 * profundo, s = smoothstep(de, ate, calor)), como a plage e o máximo do Sol
 * viram fonte HDR para o bloom da casa (limiar 0,82 de luma linear,
 * `Post.setWarp`). Medido no assado (16/11): o calor das células comuns
 * fica abaixo de ~1,0 em 99,9 % do disco, o miolo das manchas chega a
 * 1,08 (Antares, então pela regra) e 1,19 (Betelgeuse) — só ele cruza o
 * limiar; a mancha medida de Antares (δ ≈ 0,017) fica abaixo dele. ARTÍSTICO
 * (instrumento).
 */
export const PONTA_DAS_CELULAS_QUENTES = { de: 1.0, ate: 1.16, ganho: 1.8 } as const;


/** x = c₂/(λT) por canal, como `vec3` GLSL — a régua de `razaoDePlanck` */
export function xDePlanckGlsl(T: number): string {
  return `vec3(${LAMBDA_DOS_CANAIS_UM.map((l) => literalGlsl(C2_UM_K / (l * T))).join(', ')})`;
}

/**
 * B(r·T₀)/B(T₀) por canal, com x₀ = c₂/(λT₀): o brilho e a cor de um ponto
 * a r vezes a temperatura da régua. r > 0 por contrato (quem chama limita);
 * x limitado a 60 (exp cabe no float32).
 */
const GLSL_RAZAO_DE_PLANCK = /* glsl */ `
vec3 razaoDePlanck(vec3 x0, float r) {
  vec3 a = min(x0, vec3(60.0));
  vec3 x = min(a / r, vec3(60.0));
  return (exp(a) - 1.0) / (exp(x) - 1.0);
}
`;

/**
 * O GANHO DO INSTRUMENTO da Forja: calor = 0,5 + G·(T/Teff − 1) na rampa
 * de cor e brilho do filtro do Sol (imagem de banda estreita colorizada,
 * como toda foto de telescópio solar; o mesmo para todas). Escolha de
 * instrumento, ARTÍSTICA, como a exposição de uma foto: a faixa útil da
 * rampa (calor 0 a 1,05, do pé vermelho-escuro ao topo creme) cobre δ de
 * −0,10 a +0,11, ±2,3σ da flutuação de temperatura de uma gigante (4,5 %,
 * Ludwig & Kučinskas 2012) — as faixas frias chegam ao pé, e a mancha
 * quente de Haubois (δ ≈ 0,148) passa do topo e satura no creme, como a
 * plage no Sol. (G = 3,5, a mancha bem no topo, deixava as faixas no marrom.)
 */
export const GANHO_DO_INSTRUMENTO = 5;

/**
 * A FORMA DE UMA ROTADORA RÁPIDA no vertex de `sol/sun.js`: a superfície de
 * Roche exata, por vértice (`formaDeRoche`, escrita na CPU em
 * `operarAFotosfera`): o raio relativo ao equatorial (`aRaioDeRoche`) entra
 * no MESMO deslocamento ao longo da normal que os modos p usam, e a normal
 * passa a ser a da forma (`aNormalDeRoche`, no objeto). O eixo é o +Y do
 * objeto (o do giro). Leva junto o fator da gravidade (`aGravidade`).
 */
export function cirurgiaDaForma(vertex: string): string {
  const quem = 'cirurgiaDaForma';
  let v = trocarUma(
    vertex,
    '  vec3 displaced = position + normal * (n * uDispScale + pmSum * 0.008 * length(position));',
    [
      '  vGravidade = aGravidade;',
      '  vec3 displaced = position + normal * ((aRaioDeRoche - 1.0) * length(position) + n * uDispScale + pmSum * 0.008 * length(position));',
    ].join('\n'),
    quem
  );
  v = trocarUma(
    v,
    '  vNormalW = normalize(mat3(modelMatrix) * normal);',
    '  vNormalW = normalize(mat3(modelMatrix) * aNormalDeRoche);',
    quem
  );
  return 'attribute vec3 aGravidade;\nattribute float aRaioDeRoche;\nattribute vec3 aNormalDeRoche;\nvarying vec3 vGravidade;\n' + v;
}

// ============================================================
// UM MOTOR, QUALQUER ESTRELA (12/11/2026) — o que a instância de outra
// estrela pede, e que no Sol vale exatamente "nada":
//  · COR pela temperatura (`pelaTemperatura`, na CPU): só quando
//    `teffK` ≠ 5.772 K;
//  · BRILHO da fotosfera pela radiância visível × exposição da visita
//    (`uBrilhoDaEstrela`, cirurgia só fora dos 5.772 K);
//  · GRANULAÇÃO pela frequência relativa (`granuloRelativoAoSol`, 1 no Sol);
//  · REFERENCIAL LOCAL (`foraDaOrigem`, ausente no Sol).
// ============================================================

export { TEFF_SEM_FILTRO_K };

const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

function corpoNegroUnitario(T: number): [number, number, number] {
  const [r, g, b] = blackbodyLinear(T).map((x) => Math.max(x, 1e-4));
  const y = r * LUMA_R + g * LUMA_G + b * LUMA_B;
  return [r / y, g / y, b / y];
}

/**
 * O PESO DO FILTRO FOTOGRÁFICO DO SOL numa estrela de temperatura T: 1 até
 * 5.772 K (e abaixo), caindo suave a 0 em `TEFF_SEM_FILTRO_K` — artístico,
 * declarado (senão as quentes sairiam laranja).
 */
export function pesoDoFiltro(T: number): number {
  const t = Math.min(1, Math.max(0, (T - TEFF_SOL_K) / (TEFF_SEM_FILTRO_K - TEFF_SOL_K)));
  return 1 - t * t * (3 - 2 * t);
}

/**
 * A COR DA ESTRELA: cor(T) = corpoNegro(T) × (C / corpoNegro(5772))^w(T),
 * com a luminância de C preservada; w = `pesoDoFiltro(T)`. Escreve em `out`
 * (pode ser o próprio C).
 */
export function pelaTemperatura(C: THREE.Vector3, T: number, out: THREE.Vector3): THREE.Vector3 {
  const Y = Math.max(C.x * LUMA_R + C.y * LUMA_G + C.z * LUMA_B, 1e-6);
  const sol = corpoNegroUnitario(TEFF_SOL_K);
  const bb = corpoNegroUnitario(T);
  const w = pesoDoFiltro(T);
  const c = [C.x, C.y, C.z].map((v, i) => bb[i] * Math.pow(Math.max(v / (Y * sol[i]), 1e-4), w));
  const yc = Math.max(c[0] * LUMA_R + c[1] * LUMA_G + c[2] * LUMA_B, 1e-6);
  return out.set((Y * c[0]) / yc, (Y * c[1]) / yc, (Y * c[2]) / yc);
}

/** smoothstep(0,15; 1,05; 0,5): onde a rampa da paleta de `sol/sun.js` está
 *  no calor 0,5, o centro da disciplina tonal (o meio do disco) */
const CALOR_DO_MEIO_DO_DISCO = ((x: number) => x * x * (3 - 2 * x))((0.5 - 0.15) / 0.9);

/** a matiz de uma cor C por T, como fator por canal (C' = C ⊙ fator) */
function matizDe(C: THREE.Vector3, T: number, out: THREE.Vector3): THREE.Vector3 {
  pelaTemperatura(C, T, out);
  return out.set(
    C.x > 0 ? out.x / C.x : 1,
    C.y > 0 ? out.y / C.y : 1,
    C.z > 0 ? out.z / C.z : 1
  );
}

/**
 * O REFERENCIAL LOCAL, por cirurgia de texto (molde de `cirurgiaDaFotosfera`).
 * Três macros trocam, no texto de um material vendorizado, as grandezas de
 * MUNDO pelas da estrela com origem no centro dela, compostas em float64 na
 * CPU (`escreverReferencialLocal`):
 *   viewMatrix     → V·T(o)            (vista com a estrela na origem)
 *   cameraPosition → c − o
 *   modelMatrix    → (V·T(o))⁻¹ · modelViewMatrix   (só no vertex)
 * O produto `projectionMatrix * viewMatrix * (modelMatrix * p)` volta a ser
 * exatamente `projectionMatrix * modelViewMatrix * p` (a mesma profundidade
 * que os outros objetos), e tudo que o shader faz "em mundo" passa a ser
 * feito num mundo do tamanho da estrela. Aplicar duas vezes LANÇA.
 */
const MARCA_DO_REFERENCIAL = 'uVistaLocal';
const UNIFORMES_DO_REFERENCIAL = 'uniform mat4 uVistaLocal;\nuniform mat4 uVistaLocalInv;\nuniform vec3 uCameraLocal;\n';
export function cirurgiaDoReferencialLocal(texto: string, vertex: boolean): string {
  if (texto.includes(MARCA_DO_REFERENCIAL)) {
    throw new Error('cirurgiaDoReferencialLocal: o referencial local já foi aplicado neste texto');
  }
  return (
    UNIFORMES_DO_REFERENCIAL +
    '#define viewMatrix uVistaLocal\n#define cameraPosition uCameraLocal\n' +
    (vertex ? '#define modelMatrix (uVistaLocalInv * modelViewMatrix)\n' : '') +
    texto
  );
}

/**
 * A MATIZ DE UMA CAMADA EMISSIVA de cor embutida (espículas, proeminências,
 * laços, CME): multiplica a cor final pela matiz da temperatura. A âncora é
 * o `}` que fecha o `main` — o último do texto (conferido: em todas elas o
 * `main` é a última função).
 */
export function cirurgiaDaMatiz(fragment: string): string {
  const fim = fragment.lastIndexOf('}');
  if (fim < 0 || fragment.lastIndexOf('void main') < 0 || fragment.includes('uMatizDaCamada')) {
    throw new Error('cirurgiaDaMatiz: fragment sem `main` ou já com a matiz');
  }
  // GLSL3 (as partículas da CME) escreve num `out vec4`, não no gl_FragColor
  const saida = /\bout\s+(?:(?:highp|mediump|lowp)\s+)?vec4\s+(\w+)\s*;/.exec(fragment)?.[1] ?? 'gl_FragColor';
  return (
    'uniform vec3 uMatizDaCamada;\n' +
    fragment.slice(0, fim) +
    `  ${saida}.rgb *= uMatizDaCamada;\n` +
    fragment.slice(fim)
  );
}

/**
 * O PESO DA LEI NUMA CAMADA EMISSIVA (coroa, CME, proeminências, laços):
 * multiplica a cor final por `uPesoDasCamadas`, o mesmo `wResolvido·wMalha`
 * que a fotosfera recebe em `uWorldFade`. Sem ele a coroa entrava inteira
 * no quadro em que o gate do palco arma (4 px), por cima do ponto que
 * ainda carregava toda a luz — a dupla-luz da troca. Mesma âncora e mesmo
 * contrato de `cirurgiaDaMatiz` (o `}` final do `main`; GLSL3 pelo `out`).
 */
export function cirurgiaDoPeso(fragment: string): string {
  const fim = fragment.lastIndexOf('}');
  if (fim < 0 || fragment.lastIndexOf('void main') < 0 || fragment.includes('uPesoDasCamadas')) {
    throw new Error('cirurgiaDoPeso: fragment sem `main` ou já com o peso');
  }
  const saida = /\bout\s+(?:(?:highp|mediump|lowp)\s+)?vec4\s+(\w+)\s*;/.exec(fragment)?.[1] ?? 'gl_FragColor';
  return (
    'uniform float uPesoDasCamadas;\n' +
    fragment.slice(0, fim) +
    `  ${saida}.rgb *= uPesoDasCamadas;\n` +
    fragment.slice(fim)
  );
}

// ============================================================
// AS DUAS PONTES DE ESCALA PARA O GLSL (F1 da onda do Sol real).
//
// Os dois raymarches vendorizados (`sol/coronaVolume.js`, `sol/cme.js`)
// escrevem o raio DENTRO do texto do shader, e o fazem com dois números
// que só funcionam na escala artística. Com o raio físico do Sol
// (2,2567e-8 pc) os dois QUEBRAM EM SILÊNCIO — sem erro de compilação,
// sem uma linha de console, sem nada na tela além da ausência:
//
//  1. `(2.2567e-8).toFixed(6)` devolve literalmente a string
//     `"0.000000"`. O `#define SUN_R` vira ZERO, o `1.0/SUN_R` de
//     `cme.js` vira infinito, e a coroa e a ejeção de massa somem.
//  2. O guarda de segmento degenerado usa `1e-4` ABSOLUTO em unidade de
//     mundo. A travessia inteira do volume de coroa do Sol real mede
//     1,30e-7 pc — 769× menor que esse limiar: todo raio desiste antes
//     de começar.
//
// As duas pontes moram AQUI, na casa, e não nos arquivos vendorizados:
// lá dentro muda uma linha cada, que só lê o que este adaptador manda
// (`ctx.SUN_R_GLSL`, `ctx.SEG_EPS_GLSL`), com o caminho antigo intacto
// no `||` para quem construir o ctx sem elas. É a menor cirurgia
// possível sobre a promessa de não abrir o núcleo (cabeçalho deste
// arquivo), e ela é o oposto de silenciosa: `stellarBody.test.ts` tem
// teste-agulha que reprova se o raio voltar a virar `"0.000000"`.
// ============================================================

/**
 * Um literal float de GLSL que sobrevive a raio pequeno — e que devolve
 * EXATAMENTE a string de sempre para o raio artístico, que é o que
 * mantém as 24 vistas oficiais bit-idênticas com a porta desligada.
 *
 * A regra: usa-se a forma fixa de 6 casas (a herdada) SE ela voltar ao
 * mesmo float de 32 bits; senão, notação exponencial de 9 casas, que o
 * GLSL ES 3.0 aceita (tem ponto decimal e expoente). `Math.fround`
 * porque é em float32 que o shader vai viver — comparar em double
 * reprovaria formas que a GPU não distingue.
 */
export function literalGlsl(v: number): string {
  const fixo = v.toFixed(6);
  return Math.fround(Number(fixo)) === Math.fround(v) ? fixo : v.toExponential(9);
}

/**
 * O limiar de "segmento curto demais para marchar", como texto de GLSL.
 *
 * O valor herdado (`1e-4`) é ABSOLUTO e foi calibrado quando o raio da
 * cena era o artístico; o certo é ele ser PROPORCIONAL ao raio, que é o
 * que o torna portátil para qualquer instância (a mesma lição da régua
 * por ângulo de `lodStellar.ts`).
 *
 * O RAMO LITERAL PARA O RAIO ARTÍSTICO MORREU NA F3, como este
 * comentário prometia por escrito desde a F1 ("quando a F3 tirar o raio
 * artístico de cena, este ramo morre junto com ele"). Sobra a lei
 * proporcional, e ela é a mesma conta que o ramo morto fazia: o epsilon
 * vale **0,909% do raio do corpo** — `1e-4` de mundo sobre os 0,011 pc
 * em que foi calibrado. A âncora continua sendo o raio artístico porque
 * é dele que o 1e-4 nasceu; trocá-la pelo raio real mudaria o número
 * fingindo que a calibração foi refeita, que é a mentira de procedência
 * que o cadastro de escala existe para impedir.
 */
export function epsilonDeSegmentoGlsl(raioPc: number): string {
  return literalGlsl(raioPc * (1e-4 / RAIO_ARTISTICO_DO_SOL_PC));
}

// ============================================================
// F2 — A FOTOSFERA NA UNIDADE DA CASA, por cirurgia de texto.
//
// A malha emite ~1 e a lei do ponto deposita ~2,7e10 para a MESMA
// superfície: são ~26 magnitudes entre dois desenhos do mesmo objeto,
// e é a dívida que `escala.ts` declara em `fatorDeBrilho` e que o
// `it.fails` de `luzDaCasa.test.ts` cobra sem afrouxar. A F2 é o
// pagamento: a malha passa a emitir a radiância verdadeira, e como o
// composer é half-float ela só pode fazer isso COMPRIMIDA — pela mesma
// `β·asinh(x/β)` que o ponto estelar já aplica.
//
// POR QUE CIRURGIA DE TEXTO, e não um uniform novo. Abrir os 14
// vendorizados é a coisa que o cabeçalho deste arquivo promete não
// fazer, e `stellarBody.test.ts` pina o texto deles por linha. O molde
// é o de `core/post.ts` (`domarOBloom`), que reescreve o passa-alta do
// `UnrealBloomPass` sem tocar no arquivo do vendor: âncora exata, erro
// ALTO se ela sumir, `needsUpdate` no fim. Um shader que muda de forma
// tem de quebrar a suíte, nunca calar a tela.
//
// ------------------------------------------------------------
// O FILTRO SOLAR DECLARADO, que é a segunda metade da F2 e não um
// enfeite dela. A F2 crua foi MEDIDA e REPROVADA pelo dono em 15/08: a
// 1 UA a estrela verdadeira é linda, mas na aproximação a radiância
// verdadeira cega a tela (a 0,027 UA o quadro é 100% branco) — "de
// repente vira um clarão que ocupa a tela toda e não se vê mais nada".
// A resposta é a que a Lei da Estrela §E3 já autorizava por escrito: a
// paleta H-alfa continua, "como OVERRIDE DECLARADO da instância nº 1".
// Este arquivo é onde esse override deixa de ser frase.
//
// COMO: a emissão exibida desce EM STOPS da radiância verdadeira (g=1)
// para a paleta autorada (g=0), e quem manda no g é a lei: o
// `overrideExpoente` de `repartir` (`estrela.ts`), que lê a FRAÇÃO DO
// QUADRO que o disco ocupa (`filtroPeloQuadro`, smoothstep em log na
// janela `JANELA_DO_QUADRO`: disco de 1/20 a 1/10 da altura). Longe, o
// disco é pequeno no quadro: g = 1, e a estrela é a verdadeira. Perto,
// g = 0, e o que se vê é a superfície autorada, com granulação, manchas
// e proeminências — que é o que a aproximação existe para mostrar. A
// soltura do clarão é a MESMA rampa: o clarão sai de cima do disco na
// janela em que o filtro completa. `?solquadro=hoje` volta à régua de px
// de antes (filtro de 4 a 10 px de disco).
//
// ISTO NÃO É PUPILA, e a distinção é a que separa assistência declarada
// de teto de brilho (o que o NORTE proíbe). Uma pupila mede o QUADRO e
// reage a ele; esta lei não mede nada — lê tamanho aparente, que é
// geometria fixa, o mesmo número que o LOD já usa. Nada aqui depende de
// FOCO, de exposição, de histograma ou do que mais estiver na tela: a
// mesma distância dá o mesmo g em qualquer viagem, e as capturas
// continuam reproduzíveis. E o que muda são SÓ os pixels do disco do
// Sol: nenhuma estrela, nebulosa ou planeta esmaece junto — a cena
// nunca escurece para o Sol caber, que é exatamente o defeito que um
// teto global teria.
// ============================================================

/**
 * A âncora: a escrita final do fragment do Sol (`sol/sun.js`, a última
 * linha antes do `}` do main). É o único `gl_FragColor` do arquivo com
 * esta forma, e o teste-agulha o confere contra o vendorizado REAL.
 */
const ESCRITA_FINAL_DO_SOL = 'gl_FragColor = vec4(color * uWorldFade, 1.0);';

/**
 * A declaração do FILTRO SOLAR, injetada junto com a curva. Um uniform,
 * não um literal, porque este é o único número da cirurgia que muda por
 * QUADRO — e o director é quem o escreve (ver `escreverFiltroSolar`).
 */
const UNIFORME_DO_FILTRO = 'uniform float uFiltroSolar;\nuniform vec3 uTransmitancia;\n';

/**
 * O fragment do Sol reescrito para emitir a radiância VERDADEIRA da
 * fotosfera, comprimida por `β·asinh(x/β)` e descida em STOPS pelo
 * filtro solar. Pura: recebe texto e devolve texto, para poder ser
 * provada sem subir GPU.
 *
 * O FILTRO ENTRA COMO EXPOENTE (`pow(fator, uFiltroSolar)`), e o lugar
 * dele no texto é a decisão inteira. Com `g = 1` o expoente é 1 e a
 * emissão é a radiância verdadeira, bit a bit o que a F2 crua fazia; com
 * `g = 0` o `pow` vale 1 EXATO e sobra `comprimir3(color, β)` — a paleta
 * H-alfa autorada de volta, e volta INTACTA, não "parecida": a cor sai
 * da paleta entre ~1 e ~2,4, e nessa faixa `β·asinh(x/β)` com o β da
 * bancada (300) é identidade a 1,1e-5 de erro relativo. Nada de ramo,
 * nada de `if`: a mesma linha atende às duas pontas.
 *
 * POR QUE POW E NÃO UM `mix` LINEAR, e a conta é o argumento inteiro. A
 * distância entre as duas pontas é de **26,09 magnitudes**. Num `mix`
 * linear o MEIO da rampa vale 1,37e10 — a 0,75 mag do topo: 25 das 26
 * magnitudes seriam gastas na última fração de por cento do caminho (a
 * emissão só desce à casa do milhar em g ≈ 3,7e-8), e a tela ficaria
 * branca em TODO o trecho que o dono reprovou, com o clarão morrendo de
 * um quadro para o outro no fim. `pow` interpola em STOPS — linear no
 * LOG: meia rampa é a raiz do fator, 1,655e5, exatamente 13,05 mag de
 * cada ponta. É a régua do olho e a do pós-processo, não a do buffer.
 *
 * A COMPRESSÃO VEM ANTES DO FADE, e a ordem não é gosto. `uWorldFade` é
 * o crossfade disco→estrela: ele não muda o brilho da estrela, muda
 * QUEM a desenha. Comprimir depois dele faria o joelho da curva andar
 * durante a transição — a mesma superfície entraria em pedaços
 * diferentes da curva conforme o wrapper baixasse o fade, e a troca
 * deixaria de conservar fluxo justamente onde ela precisa conservar. O
 * que a curva tem de ver é a radiância da superfície, que é invariante
 * com a distância (item 3 da Lei); o fade continua sendo cessão de
 * representação, aplicada depois, por fora.
 *
 * O β É O DOS PONTOS, o mesmo símbolo (`BETA_DA_EMISSAO`), não um β da
 * malha. Disco e ponto desenham o MESMO objeto nos dois lados da troca:
 * duas curvas diferentes fariam o Sol mudar de brilho no instante em que
 * mudasse de representação, que é o defeito que a Lei nomeia.
 *
 * A DUPLICATA REPROVA. Depois da cirurgia a âncora não existe mais no
 * texto, então uma segunda passada cai no mesmo erro alto de âncora
 * ausente — e isso é a resposta certa, não um efeito colateral: aplicar
 * o fator duas vezes elevaria a emissão ao quadrado, e uma função que
 * engolisse a segunda chamada em silêncio esconderia exatamente esse
 * estrago.
 */
export function cirurgiaDaFotosfera(
  fragmentShader: string,
  fator: number,
  beta: number
): string {
  if (!fragmentShader.includes(ESCRITA_FINAL_DO_SOL)) {
    throw new Error(
      'cirurgiaDaFotosfera: a escrita final do fragment do Sol não está mais lá ' +
        `(esperado \`${ESCRITA_FINAL_DO_SOL}\`, de sol/sun.js) — ou o vendorizado ` +
        'mudou de forma, ou a cirurgia já foi aplicada neste material'
    );
  }
  // a curva e a declaração do filtro entram ANTES de tudo, por prepend: o
  // fragment do Sol começa com o `NOISE_GLSL` (funções soltas, sem
  // `#version`, sem `#extension` e sem `precision` — quem prefixa precisão
  // é o three), então não há âncora frágil a inventar aqui. Uma vez só, e
  // o teste conta.
  return (
    UNIFORME_DO_FILTRO +
    GLSL_COMPRESSAO +
    fragmentShader.replace(
      ESCRITA_FINAL_DO_SOL,
      `gl_FragColor = vec4(comprimir3(color * pow(${literalGlsl(fator)}, uFiltroSolar) * uTransmitancia, ` +
        `${literalGlsl(beta)}) * uWorldFade, 1.0);`
    )
  );
}

// ============================================================
// F4 — A COROA ATRÁS DE UM CORPO, por cirurgia de texto.
//
// Os três planos da coroa (`sol/coronaRays.js`, `sol/coronaVolume.js`,
// `sol/cme.js`) são billboards aditivos PELO CENTRO do Sol, e por isso
// nasceram com `depthTest: false`: com o teste ligado no centro, a
// metade da frente da fotosfera apagaria o halo que eles pintam sobre a
// borda do disco (e, de perto, sobre o disco). O preço era o oposto: sem
// teste nenhum, a coroa passava por cima de QUALQUER corpo na frente —
// no último plano do filme solar (`mesmaLuz`, o Sol nascendo atrás da
// Terra) o anel laranja aparecia pintado sobre a Terra que tapava o Sol.
//
// O CONSERTO move só a PROFUNDIDADE: x, y e w do vértice ficam intocados
// (mesmo pixel, mesmos varyings, bit a bit), e o z passa a ser o de um
// ponto NA MESMA DIREÇÃO, mais perto da câmera — a receita da sonda de
// oclusão do clarão (`world/clarao.ts`, medida em 23/09): a METADE do
// caminho até o centro, e nunca a menos de quatro degraus do fundo do
// depth de 24 bits. Longe do Sol, o depth já não distingue a fotosfera do
// fundo, e um plano posto rente a ela empatava ou perdia por arredondamento
// (medido: o anel do limbo sumia em 148 px a 1 UA). De perto (centro a
// menos de 2,1 raios no eixo da vista) a metade cairia DENTRO do Sol: aí
// vale o plano tangente à frente dele, `zCentro − 1,05·raio`, à frente de
// todo ponto da fotosfera (o relevo do vertex dela sobe no máximo ~1,3 %
// do raio). Com o teste ligado, a fotosfera nunca corta a coroa e um globo
// entre a câmera e a metade do caminho, sim — a mesma promessa da sonda.
// Plano de frente atrás do near (rente ao Sol, olhando de lado): o z vai à
// frente de tudo, o mesmo que o teste desligado de antes. Vértice já fora
// do near/far: fica onde estava, o recorte de antes não muda.
// ============================================================

/** a folga da frente, em raios do corpo — maior que o relevo da fotosfera
 *  (`uDispScale` 0,4 % + modos p 0,9 %, `sol/sun.js`) */
const FOLGA_DA_FRENTE_DA_COROA = 1.05;

/** a marca da cirurgia — e o detector de aplicação dupla */
const MARCA_DA_COROA_OCULTAVEL = 'zCoroaFrente';

/**
 * Reescreve o vertex de um plano da coroa para a profundidade da frente do
 * corpo de raio `raioPc`. A âncora é o ÚNICO `gl_Position = …;` do texto;
 * âncora ausente, repetida ou cirurgia já aplicada LANÇA (o mesmo contrato
 * de `cirurgiaDaFotosfera`: nunca no-op silencioso).
 */
export function cirurgiaDaCoroaOcultavel(vertexShader: string, raioPc: number): string {
  const escritas = vertexShader.match(/gl_Position\s*=[^;]*;/g) ?? [];
  if (escritas.length !== 1 || vertexShader.includes(MARCA_DA_COROA_OCULTAVEL)) {
    throw new Error(
      'cirurgiaDaCoroaOcultavel: o vertex do plano da coroa não tem UMA escrita de ' +
        '`gl_Position` (sol/coronaRays.js, sol/coronaVolume.js, sol/cme.js) — ou o ' +
        'vendorizado mudou de forma, ou a cirurgia já foi aplicada neste material'
    );
  }
  const raioDaFrente = literalGlsl(raioPc * FOLGA_DA_FRENTE_DA_COROA);
  return vertexShader.replace(
    escritas[0],
    `${escritas[0]}
  {
    float zCoroaCentro = -(viewMatrix * vec4(modelMatrix[3].xyz, 1.0)).z;
    float ${MARCA_DA_COROA_OCULTAVEL} = min(0.5 * zCoroaCentro, zCoroaCentro - ${raioDaFrente});
    float zCoroaAntes = gl_Position.z / gl_Position.w;
    if (gl_Position.w > 0.0 && zCoroaAntes >= -1.0 && zCoroaAntes <= 1.0) {
      vec4 cCoroaFrente = projectionMatrix * vec4(0.0, 0.0, -${MARCA_DA_COROA_OCULTAVEL}, 1.0);
      float zCoroaDepois = ${MARCA_DA_COROA_OCULTAVEL} > 0.0 ? cCoroaFrente.z / cCoroaFrente.w : -1.0;
      zCoroaDepois = min(zCoroaDepois, 1.0 - 4.8e-7);
      gl_Position.z = clamp(zCoroaDepois, -1.0, zCoroaAntes) * gl_Position.w;
    }
  }`
  );
}

// ============================================================
// AS FITAS DOS LAÇOS NA RÉGUA DO DOADOR, por cirurgia de texto.
//
// As duas fitas de `sol/loops.js` (emissão e absorção) medem a largura em
// px com números do doador, onde o raio era 2,2 unidades de MUNDO: o piso
// `max(clip.w, 0.01)`, a meia-largura `uLoopW` (0,0132) e o `aTan` — os
// dois últimos em unidades de OBJETO. Aqui o grupo leva a escala do raio em
// parsec (Sol ~1,03e-8, Proxima ~1,6e-9) e o `w` de um laço vale ~1e-8 a
// 1e-7: o piso pega SEMPRE. Medido (Sol a 3 raios, 1600×813, P11 1,80):
// `rawPx` = 0,0132·733/0,01 ≈ 970 → teto de 14 px, e o rumo da fita na tela
// (`dS`, também dividido pelo piso) cai a ~0 → `nrm` fixo em (0, 1): toda
// fita expande na VERTICAL da tela, 14 px — os blocos "quadrados" na borda,
// no Sol e em toda estrela. Na conta certa a mesma fita tem ~1,2 px.
//
// O CONSERTO põe o clip das duas pontas na régua do doador, dividindo-o
// pela escala do grupo logo depois de calculado. Clip é homogêneo: x, y, z
// e w divididos pelo mesmo número positivo são o MESMO ponto (mesmo pixel,
// mesma profundidade z/w, mesmo recorte, a mesma interpolação), e o `w`
// passa a estar na unidade de `uLoopW`, de `aTan` e do piso — o shader do
// doador inteiro volta a valer como foi escrito, em qualquer estrela.
// ============================================================

/** a marca da cirurgia — e o detector de aplicação dupla */
const MARCA_DAS_FITAS = 'fitasNaReguaDoDoador';
const ANCORA_DAS_FITAS = '  vec4 clipB = projectionMatrix * modelViewMatrix * vec4(position + aTan, 1.0);\n';

/**
 * Reescreve o vertex de uma fita de `sol/loops.js` para a régua do doador:
 * `escala` é a do grupo (raio em pc / 2,2). Âncora ausente, repetida ou
 * cirurgia já aplicada LANÇA (nunca no-op silencioso).
 */
export function cirurgiaDasFitas(vertexShader: string, escala: number): string {
  if (vertexShader.includes(MARCA_DAS_FITAS)) {
    throw new Error('cirurgiaDasFitas: a régua do doador já foi aplicada neste material');
  }
  return trocarUma(
    vertexShader,
    ANCORA_DAS_FITAS,
    `${ANCORA_DAS_FITAS}  float ${MARCA_DAS_FITAS} = ${literalGlsl(1 / escala)};\n` +
      `  clipA *= ${MARCA_DAS_FITAS}; clipB *= ${MARCA_DAS_FITAS};\n`,
    'cirurgiaDasFitas'
  );
}

/**
 * A NORMAL DA CASCA DAS ESPÍCULAS NUMA ESTRELA ACHATADA: `sol/spicules.js`
 * leva a normal ao mundo por `mat3(modelMatrix)`, certo só com escala
 * uniforme. Com a casca escalada por `k` = Rp/Re no +Y (ver
 * `criarAAtmosfera`), a normal certa é a inversa-transposta: R·S⁻¹·n =
 * (R·S)·(S⁻²·n), isto é, o y da normal ÷ k² antes da mesma matriz. Sem
 * isso o μ da franja errava até ~0,03 nas latitudes médias de Capella Ab.
 * Âncora ausente ou repetida LANÇA.
 */
const ANCORA_DA_NORMAL_DAS_ESPICULAS = '  vNormalW = normalize(mat3(modelMatrix) * normal);';
export function cirurgiaDaNormalDasEspiculas(vertexShader: string, k: number): string {
  return trocarUma(
    vertexShader,
    ANCORA_DA_NORMAL_DAS_ESPICULAS,
    `  vNormalW = normalize(mat3(modelMatrix) * (normal * vec3(1.0, ${literalGlsl(1 / (k * k))}, 1.0)));`,
    'cirurgiaDaNormalDasEspiculas'
  );
}

// ============================================================
// AS PARTÍCULAS DA EJEÇÃO NA RÉGUA DO DOADOR, por cirurgia de texto.
//
// O mesmo piso das fitas, no rastro das partículas de `sol/cme.js`: o rumo
// e o comprimento do risco na tela saem de `c1.xy/max(abs(c1.w), 1e-4)`, e
// aqui o `w` vale ~1e-8 a 1e-7 pc. Medido (Sol a 3 raios, 4 s de ejeção,
// 2.033 partículas vivas, w mediano 6,7e-8): estiramento mediano 5,5e-4
// contra 0,90 na conta certa (~1.600× menor), e 415 delas com o rumo preso
// em (1, 0) — a ejeção saía em pontos redondos, no Sol e em toda estrela.
// O CONSERTO é o das fitas: o clip das duas pontas (a partícula e a
// partícula adiantada) vai à régua do doador antes do piso. Homogêneo: o
// mesmo pixel e a mesma profundidade; só o piso volta a valer como foi
// escrito.
// ============================================================

/** a marca da cirurgia — e o detector de aplicação dupla */
const MARCA_DAS_PARTICULAS = 'particulasNaReguaDoDoador';
const ANCORA_DAS_PARTICULAS = '  vec4 c1 = projectionMatrix * mv2;\n';

/**
 * Reescreve o vertex das partículas de `sol/cme.js` para a régua do
 * doador: `escala` é a do grupo (raio em pc / 2,2). Âncora ausente,
 * repetida ou cirurgia já aplicada LANÇA (nunca no-op silencioso).
 */
export function cirurgiaDasParticulas(vertexShader: string, escala: number): string {
  if (vertexShader.includes(MARCA_DAS_PARTICULAS)) {
    throw new Error('cirurgiaDasParticulas: a régua do doador já foi aplicada neste material');
  }
  return trocarUma(
    vertexShader,
    ANCORA_DAS_PARTICULAS,
    `${ANCORA_DAS_PARTICULAS}  float ${MARCA_DAS_PARTICULAS} = ${literalGlsl(1 / escala)};\n` +
      `  gl_Position *= ${MARCA_DAS_PARTICULAS}; c1 *= ${MARCA_DAS_PARTICULAS};\n`,
    'cirurgiaDasParticulas'
  );
}

/**
 * Liga a oclusão num plano da coroa: a cirurgia da profundidade e o
 * `depthTest`. O resto do material fica como veio — aditivo, transparente
 * (desenha DEPOIS da fila opaca, quando o depth dos globos já está escrito)
 * e sem escrever depth (o plano não tapa nada). A ordem na fila
 * transparente (`renderOrder`) é do vendorizado e não muda.
 */
export function coroaOcultavel(material: THREE.ShaderMaterial, raioPc: number): void {
  material.vertexShader = cirurgiaDaCoroaOcultavel(material.vertexShader, raioPc);
  material.depthTest = true;
  material.needsUpdate = true;
}

/**
 * A instância 1. Todo campo aqui reproduz o literal que estava solto no
 * módulo antes da Onda 3: a promoção é de ENDEREÇO, não de valor, e o
 * gate de md5 desta fase é a prova.
 *
 * Dramaturgia do arranque (pedido do dono): o Sol acorda com o disco
 * quase limpo na parede de fogo e ganha atividade até o fim da hélice.
 * A partir de 21/08 isso é uma DOSE DE OCUPAÇÃO — quanta atividade da
 * data aparece —, e não uma fase inventada: quem manda na fase é o
 * calendário. A dose mora com quem dirige o filme
 * (`director/doseDoSol.ts`) e se declara no selo; aqui só entra o que é
 * da ESTRELA.
 */
/** a ESCALA DE ALTURA das plumas da atmosfera estendida, × o excesso medido
 *  (o raio da atmosfera − 1), de uma direção a outra — ARTÍSTICO, declarado:
 *  o raio medido fica no meio */
const PLUMA_MIN = 0.3;
const PLUMA_MAX = 1.6;
/** até quantas escalas de altura (da pluma mais longa) a casca vai: lá o
 *  perfil já caiu a e⁻³ e a cauda o leva a zero sem degrau */
const ALCANCE_DA_ATMOSFERA = 3;
/** a escala da camada rente (raios), mais densa, por cima das plumas */
const ESCALA_DA_CAMADA_RENTE = 0.08;
/** o brilho da atmosfera estendida rente à borda (b = 1), sobre a luz da
 *  borda do disco — ARTÍSTICO, declarado: a MOLsphere e a poeira espalham a
 *  luz da estrela, e a câmera as vê como névoa luminosa; metade na pluma
 *  média, para que a borda do disco continue sendo a borda */
const BRILHO_DA_ATMOSFERA = 1.2;
/**
 * A COLUNA DA ATMOSFERA: o brilho acima vale para a camada de uma
 * supergigante (excesso de 0,3 R, Betelgeuse); uma camada mais rasa tem menos
 * gás na linha de visada e brilha na proporção do excesso (Arcturus, 0,04 R:
 * 13 %). Sem isto a casca rasa saía mais clara que a borda escurecida do disco
 * e a borda lia como um anel escuro. Proporção ARTÍSTICA, declarada; com
 * excesso ≥ 0,3 é 1 (a Betelgeuse aprovada não muda).
 */
const EXCESSO_DA_ATMOSFERA_PLENA = 0.3;
/**
 * A CASCA DA FORJA: gás mais fraco e liso, nas extensões medidas (camada
 * molecular de Betelgeuse a 1,2–1,5 R, Antares 1,2–1,4 R): a casca acaba em
 * ~1,7 R numa supergigante (excesso de 0,3 × 1,2 × 1,9), as plumas variam
 * menos de uma direção a outra (0,6 a 1,2 × o excesso, brilho de 0,8 a 1,2),
 * as estrias são mais finas e mais fracas, e o brilho total é ~60 % do de
 * hoje. Números ARTÍSTICOS, declarados; sem a Forja, a casca de hoje.
 */
const CASCA_DA_FORJA = { plumaMin: 0.6, plumaMax: 1.2, alcance: 1.9, brilho: 0.7 } as const;
/**
 * A CASCA DA FORJA RENTE à borda, em frações da borda do disco: o brilho
 * dela em b = 1 (com a camada rente, 1 + 0,6), preso em 1. É o piso da borda
 * macia da fotosfera: o disco desce até onde a casca começa, e os dois perfis
 * se encontram sem vale (a metade, só o gás da frente, deixava uma fresta
 * escura de 1–2 px entre o disco e a casca). Zero sem atmosfera estendida.
 */
export function frenteDaAtmosfera(atmosferaEmRaios: number): number {
  const excesso = atmosferaEmRaios - 1;
  if (excesso <= 0) return 0;
  return Math.min(1, CASCA_DA_FORJA.brilho * Math.min(1, excesso / EXCESSO_DA_ATMOSFERA_PLENA) * 1.6);
}
/**
 * O VÉU (`criarABordaDifusa`) — ARTÍSTICO, declarado. A luz que sobra é a de
 * uma câmera diante de uma fonte ofuscante (o espalhamento da óptica sobre o
 * que o sensor REGISTROU): por isso é uma fração da borda do disco já
 * COMPRIMIDA, como a tela a mostra, e não da radiância — uma fração da
 * radiância de uma anã branca, comprimida depois, lavava o quadro inteiro.
 * O perfil abraça o disco: um halo rente (escala `VEU_RENTE` raio) e uma asa
 * (escala `VEU_ASA` raio) que a cauda leva a zero em `RAIO_DO_VEU`. A força
 * é `veu` comprimido (`forcaDoVeu`): satura em `VEU_TETO`, e nenhuma estrela,
 * por mais quente, passa disso.
 */
const RAIO_DO_VEU = 2;
const VEU_RENTE = 0.06;
const VEU_ASA = 0.3;
const VEU_PESO_RENTE = 0.6;
const VEU_PESO_ASA = 0.4;
const VEU_TETO = 0.5;
/** a força do véu, `veu` comprimido: VEU_TETO·(1 − e^(−veu/VEU_TETO)) —
 *  linear no começo (0 no Sol, exato), teto em `VEU_TETO` */
export function forcaDoVeu(veu: number): number {
  return veu > 0 ? VEU_TETO * (1 - Math.exp(-veu / VEU_TETO)) : 0;
}

/**
 * O OFUSCAMENTO DAS QUENTES (17/11) — a regra do pico (`pesoDoPico`, no
 * diretor) põe o ponto mais quente do disco num nível só, e a luz que ela tira
 * do disco sumia: a estrela quente lia como uma bola fosca. Três peças, todas
 * só de quem tem peso do pico (sem os campos, o texto sai o de antes):
 *  · A ASA LONGA DO VÉU: os STOPS que a regra do pico tirou do disco
 *    (`stopsDoPico`, ln do ganho de sempre sobre o da visita) voltam em volta
 *    dele, na asa (escala `VEU_ASA_LONGA`, cauda a zero em
 *    `RAIO_DO_VEU_QUENTE`), como `VEU_POR_STOP` × stops × a luz do véu de
 *    sempre, integrada em b (peso b db). O rente fica como está: véu rente
 *    mais claro que a borda faz a estrela lisa parecer fora de foco. Em stops
 *    porque a tela é logarítmica; a luz total na tela volta à de antes da
 *    regra (±7 %). ARTÍSTICO: a escala, o raio e a luz por stop;
 *  · A PONTA DO PICO, na fotosfera (`cirurgiaDaEstrela`), com o peso q da
 *    rampa em que a rede de convecção sai (`pesoDaLisa`: sobre a rede
 *    inteira ela a lavava): um sensor que estoura. Com o calor local h = (g/g_polo)⁶ · (0,4 + 0,6μ)⁴ — g o brilho
 *    de von Zeipel (`vGravidade`, 1 numa redonda), a borda cinza de Eddington
 *    —, a emissão vai a 1 + `ganho`·q·h e a cor desce ao branco de mesma
 *    luminância na fração min(1, `branco`·q·h): o polo (ou o centro) estoura
 *    para o branco e o equador e a borda guardam o azul. O expoente alto na
 *    gravidade segue o polo mesmo quando ele está perto da borda (Achernar a
 *    29°); sem degrau (um smoothstep abria anel). ARTÍSTICO: os números;
 *  · O TOM DO VÉU: o espalhamento de Rayleigh, (550/λ)⁴ em 610/550/465 nm,
 *    elevado a k × o peso do pico (o tom cresce com a regra, sem degrau nos
 *    8.000 K) e normalizado à luminância 1 — k = 1 até `inteiroAte` e
 *    descendo suave até `piso` em `pisoDesde`: nas mais quentes, que já são
 *    azuis, o tom cede à cor da própria estrela (o miolo estoura para o
 *    branco, o que sobra em volta guarda a cor da estrela, como numa imagem
 *    de instrumento colorizada), e o azul do véu na tela tem teto (~3,5 em
 *    azul/vermelho, o de Régulo). ARTÍSTICO, declarado.
 */
const VEU_POR_STOP = 1.2;
const VEU_ASA_LONGA = 0.35;
const RAIO_DO_VEU_QUENTE = 2.2;
const PONTA_DO_PICO = { ganho: 3.5, branco: 1.5 } as const;
const COR_DO_ESPALHAMENTO = [0.661, 1.0, 1.957] as const;
/** o fator tonal da casca sem a Forja (`criarABordaDifusa`) */
const TOM_DA_CASCA_LISA = 'mix(0.16, 1.42, smoothstep(0.04, 1.08, 0.5))';
const TOM_DO_VEU = { inteiroAte: 12800, pisoDesde: 15500, piso: 0.52 } as const;
function caudaDoVeu(b: number, raio: number): number {
  const t = Math.min(1, Math.max(0, (b - 0.5 * (raio + 1)) / (raio - 0.5 * (raio + 1))));
  return 1 - t * t * (3 - 2 * t);
}
/** o peso da asa longa (relativo à força do véu) para os stops que a regra do pico tirou do disco */
export function pesoDaAsaLonga(stopsDoPico: number): number {
  if (!(stopsDoPico > 0)) return 0;
  let deSempre = 0;
  let asa = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) {
    const b = 1 + ((i + 0.5) / n) * (RAIO_DO_VEU_QUENTE - 1);
    const x = b - 1;
    deSempre +=
      (VEU_PESO_RENTE * Math.exp(-x / VEU_RENTE) + VEU_PESO_ASA * Math.exp(-x / VEU_ASA)) * caudaDoVeu(b, RAIO_DO_VEU) * b;
    asa += Math.exp(-x / VEU_ASA_LONGA) * caudaDoVeu(b, RAIO_DO_VEU_QUENTE) * b;
  }
  return (VEU_POR_STOP * stopsDoPico * deSempre) / asa;
}
/** o tom do véu de uma quente (luminância 1): Rayleigh^(k·peso do pico), k
 *  contínuo na Teff, com piso; peso 0 = sem tom (1, 1, 1): cresce com o pico */
export function tomDoVeu(teffK: number, pesoDoPico: number): [number, number, number] {
  const u = Math.min(1, Math.max(0, (teffK - TOM_DO_VEU.inteiroAte) / (TOM_DO_VEU.pisoDesde - TOM_DO_VEU.inteiroAte)));
  const k = (1 - (1 - TOM_DO_VEU.piso) * u * u * (3 - 2 * u)) * Math.min(1, Math.max(0, pesoDoPico));
  const t = COR_DO_ESPALHAMENTO.map((x) => Math.pow(x, k));
  const y = LUMA_R * t[0] + LUMA_G * t[1] + LUMA_B * t[2];
  return [t[0] / y, t[1] / y, t[2] / y];
}

/**
 * O GÁS DAS QUENTES (17/11) — o vento das supergigantes azuis e o disco de
 * uma Be como um instrumento os vê na linha Hα (`ventoDaEstrela.ts`: a
 * física, os números e as fontes). Na casca (`criarABordaDifusa`), só de
 * quem tem `gas`: a emissão de recombinação ∝ ρ² integrada na linha de
 * visada em `PASSOS_DO_GAS` segmentos (`PASSOS_DO_DISCO` quando só há o
 * disco), mais densos perto do ponto de maior aproximação (t = meia·s|s|),
 * no referencial da estrela (gira com ela). O vento LISO pela emissividade
 * no meio de cada segmento, com a cauda que o leva ao piso no raio da linha
 * (`PERFIL_DO_VENTO`, `fimDaCauda`); os BRAÇOS só com giro medido
 * (`BRACOS_DO_VENTO`). O disco, fino demais para a marcha, pela gaussiana
 * em z integrada exata no segmento (erf) com o raio do ponto em que a linha
 * cruza o plano. A linha que bate na estrela para nela; o DISCO de gás na
 * frente da estrela vai numa malha própria (`criarOGasDaFrente`), o vento ali
 * não (Hα de um vento é absorção sobre o disco). No fim, o PISO DO
 * INSTRUMENTO (`joelhoDoPiso`). A luz é a fração do fluxo do disco que a
 * regra dá (G·X/X_Rigel no vento, G × a fase no disco), sobre o centro do
 * disco já COMPRIMIDO, como a tela o mostra (a mesma razão do véu: uma
 * fração da radiância de uma estrela quente lavava o quadro inteiro). A COR
 * é a do hidrogênio (`COR_DO_HIDROGENIO`, `GLSL_ROSA_DO_GAS`).
 */
const PASSOS_DO_GAS = 12;
const PASSOS_DO_DISCO = 8;
/** o oclusor do gás, × o esferoide: a superfície de Roche fica por dentro
 *  dele (até 2,5 %); a linha que bate na estrela de verdade já é apagada
 *  pela profundidade da fotosfera, então encolher não acende nada a mais */
const OCLUSOR_DO_GAS = 0.95;
/**
 * A COR DO HIDROGÊNIO QUE BRILHA — a mesma no vento e no disco. Hα (656,28
 * nm) e Hβ (486,14 nm) na razão de recombinação do caso B a 10⁴ K, 2,86 em
 * energia (Osterbrock & Ferland 2006, valor de livro, NÃO aberto nesta
 * rodada), pelas funções CIE 1931 de 2° (interpoladas da tabela de 5 nm),
 * em sRGB linear (IEC 61966-2-1), normalizada à luminância 1.
 * O GAMUT: Hα sozinha cai fora do sRGB (o verde sai negativo); a cor é
 * trazida para dentro DESSATURANDO PARA O CINZA DE MESMA LUMINÂNCIA, na reta
 * que liga a cor ao branco (preserva o comprimento de onda dominante e a
 * luminância) — nunca cortando o canal negativo. A mistura das duas linhas
 * na razão 2,86 já cai dentro do gamut, e a conta não mexe nela: o rosa
 * dela é azulado de verdade (o Hβ pesa no azul), e na tela de Rigel mede
 * ~1 : 0,3 : 0,77 (vermelho : verde : azul).
 */
const CIE_H_ALFA = [0.20493, 0.07633, 0] as const;
const CIE_H_BETA = [0.05204, 0.17813, 0.58177] as const;
export const DECREMENTO_DE_BALMER = 2.86;
/** XYZ → sRGB linear (D65) */
function xyzParaSrgbLinear(x: number, y: number, z: number): [number, number, number] {
  return [
    3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
    0.0557 * x - 0.204 * y + 1.057 * z,
  ];
}
/** a cor de uma mistura de linhas em sRGB linear, trazida para o gamut pelo cinza de mesma luminância, à luminância 1 */
export function corDeLinhas(pesos: readonly number[], cies: readonly (readonly [number, number, number])[]): [number, number, number] {
  let x = 0;
  let y = 0;
  let z = 0;
  pesos.forEach((w, i) => {
    x += w * cies[i][0];
    y += w * cies[i][1];
    z += w * cies[i][2];
  });
  const c = xyzParaSrgbLinear(x / y, 1, z / y);
  // o menor t que tira o canal negativo: (1 − t)·c + t·1 ≥ 0
  const t = Math.max(0, ...c.map((k) => (k < 0 ? -k / (1 - k) : 0)));
  return c.map((k) => (1 - t) * k + t) as [number, number, number];
}
export const COR_DO_HIDROGENIO = corDeLinhas([DECREMENTO_DE_BALMER, 1], [CIE_H_ALFA, CIE_H_BETA]);
/**
 * ONDE O GÁS É MUITO BRILHANTE ele clareia para o rosa-claro, como um sensor
 * que estoura (a mesma ideia da ponta do pico do disco): o vermelho não passa
 * de `TETO_DO_VERMELHO_DO_GAS` na cena; acima, a cor anda para o cinza de
 * mesma luminância — t = (R − teto)/(R − Y), o menor que segura o vermelho.
 * A mistura tem teto (`BRANCO_MAXIMO_DO_GAS`): o mais brilhante fica
 * rosa-claro, nunca branco. Contínua, sem NaN (R − Y > 0: o vermelho do rosa
 * é > 1 × a luminância). ARTÍSTICO: o teto e o máximo da mistura.
 */
const TETO_DO_VERMELHO_DO_GAS = 0.6;
/** o máximo da mistura para o cinza: o mais brilhante fica rosa-claro, nunca branco */
const BRANCO_MAXIMO_DO_GAS = 0.7;
const GLSL_ROSA_DO_GAS = /* glsl */ `
        vec3 rosaDoGas(float y) {
          vec3 c = vec3(${COR_DO_HIDROGENIO.map((x) => literalGlsl(x)).join(', ')}) * y;
          float t = clamp((c.r - ${literalGlsl(TETO_DO_VERMELHO_DO_GAS)}) / max(c.r - y, 1e-6), 0.0, ${literalGlsl(BRANCO_MAXIMO_DO_GAS)});
          return mix(c, vec3(y), t);
        }`;
/** o raio (em raios equatoriais) até onde o gás vai: o vento até o fim da cauda, o disco até a cauda e a abertura */
export function raioDoGas(gas: GasDoMotor | undefined): number {
  if (!gas) return 1;
  const d = gas.disco;
  return Math.max(
    gas.vento ? gas.vento.fim : 1,
    d ? Math.hypot(CAUDA_DO_DISCO.ate * d.raioExterno, 4 * d.h0 * (CAUDA_DO_DISCO.ate * d.raioExterno) ** 1.5) : 1
  );
}
/**
 * AS ASAS DO VÉU COM GÁS (17/11, a cor): as asas do véu — a de sempre
 * (`VEU_ASA`) e a longa das quentes (`VEU_POR_STOP`) — são AZUIS (o tom do
 * véu) e devolvem em volta do disco a luz que a óptica espalha. Onde a
 * estrela tem gás desenhado, a luz do gás é parte desse mesmo orçamento: o
 * gás TOMA O LUGAR das asas, na mesma luz — elas ficam com o que sobra,
 * max(0, 1 − luz do gás ÷ luz das asas). O halo rente (`VEU_RENTE`) fica:
 * sem ele a borda lisa parece fora de foco. Sem isso o azul somava por cima
 * do rosa e a tela media violeta (112, 51, 121; e, com o halo curto, ainda
 * 1 : 0,45 : 0,95 em Rigel só com a asa longa tirada). As luzes na unidade
 * do centro do disco comprimido, a borda tomada como (1 − u) dele
 * (aproximação declarada); a do gás é a fração da regra × o fluxo do disco
 * (o vento, e o disco pela fase).
 */
export function asaComGas(gas: GasDoMotor, forcaDoVeu: number, asaLonga: number, bordaU: number, faseDoDisco: number): number {
  if (!(forcaDoVeu > 0)) return 1;
  let asa = 0;
  const n = 2000;
  const fim = Math.max(RAIO_DO_VEU, RAIO_DO_VEU_QUENTE);
  for (let i = 0; i < n; i++) {
    const b = 1 + ((i + 0.5) / n) * (fim - 1);
    asa +=
      (VEU_PESO_ASA * Math.exp(-(b - 1) / VEU_ASA) * caudaDoVeu(b, RAIO_DO_VEU) +
        asaLonga * Math.exp(-(b - 1) / VEU_ASA_LONGA) * caudaDoVeu(b, RAIO_DO_VEU_QUENTE)) *
      2 *
      Math.PI *
      b;
  }
  asa *= (forcaDoVeu * (1 - bordaU) * (fim - 1)) / n;
  const luzDoGas = ((gas.vento?.fracao ?? 0) + (gas.disco ? GANHO_DO_GAS * faseDoDisco : 0)) * fluxoDoDisco(bordaU);
  return Math.max(0, 1 - luzDoGas / asa);
}
/**
 * o GLSL do gás: soma em `gas` a luz dele na linha de visada (unidades da
 * intensidade do centro do disco) e aplica o piso do instrumento. `frente`:
 * só o disco de gás, só a parte da linha ANTES da estrela, e só onde a linha
 * bate nela (a malha da frente, `criarOGasDaFrente`).
 */
function glslDoGas(gas: GasDoMotor, rGas: number, kAch: number, frente = false): string {
  const v = frente ? undefined : gas.vento;
  const d = gas.disco;
  const n = v ? PASSOS_DO_GAS : PASSOS_DO_DISCO;
  const piso = d ? 'uPisoDoGas' : literalGlsl(PISO_DO_INSTRUMENTO * (v?.pico ?? 0));
  return `
          // O GÁS (\`O GÁS DAS QUENTES\`): no referencial da estrela, em raios
          mat3 gR = uSunInvRot * transpose(mat3(viewMatrix));
          vec3 gO = gR * (-vCentroV / uRaio);
          vec3 gD = normalize(gR * d);
          float gTc = -dot(gO, gD);
          float gB2 = max(dot(gO, gO) - gTc * gTc, 0.0);
          float gMeia = sqrt(max(${literalGlsl(rGas * rGas)} - gB2, 0.0));
          float gIni = max(gTc - gMeia, 0.0);
          // a linha que bate na estrela para nela: o esferoide (Re, Rp), que
          // esticado ao longo do eixo por Re/Rp é a esfera unitária, encolhido
          // (\`OCLUSOR_DO_GAS\`) para a superfície de Roche não deixar fresta
          float gFim = gTc + gMeia;
          vec3 gOE = vec3(gO.x, gO.y * ${literalGlsl(kAch)}, gO.z);
          vec3 gDE = vec3(gD.x, gD.y * ${literalGlsl(kAch)}, gD.z);
          float gA = dot(gDE, gDE);
          float gBq = dot(gOE, gDE);
          float gDisc = gBq * gBq - gA * (dot(gOE, gOE) - ${literalGlsl(frente ? 1 : OCLUSOR_DO_GAS * OCLUSOR_DO_GAS)});${
            frente
              ? `
          // a frente: só onde a linha bate na estrela (o resto é da casca de trás)
          if (gDisc <= 0.0) discard;`
              : ''
          }
          if (gDisc > 0.0) gFim = min(gFim, max((-gBq - sqrt(gDisc)) / gA, 0.0));
          float gas = 0.0;
          for (int i = 0; i < ${n}; i++) {${
            frente
              ? `
            // a frente: do gás de fora até a estrela, mais denso rente a ela (onde a emissão se concentra)
            float s0 = ${literalGlsl(1 / n)} * float(i);
            float s1 = s0 + ${literalGlsl(1 / n)};
            float ta = max(gFim - (gFim - gIni) * s1 * s1, gIni);
            float tb = gFim - (gFim - gIni) * s0 * s0;`
              : `
            float s0 = -1.0 + ${literalGlsl(2 / n)} * float(i);
            float s1 = s0 + ${literalGlsl(2 / n)};
            float ta = clamp(gTc + gMeia * s0 * abs(s0), gIni, gFim);
            float tb = clamp(gTc + gMeia * s1 * abs(s1), gIni, gFim);`
          }
            float dt = tb - ta;
            if (dt <= 0.0) continue;${
              v
                ? `
            vec3 pm = gO + gD * (0.5 * (ta + tb));
            float rr = max(length(pm), 1e-4);
            float r = max(rr, 1.0);
            float w = max(pow(max(1.0 - 1.0 / r, 1e-6), ${literalGlsl(PERFIL_DO_VENTO.beta)}), ${literalGlsl(PERFIL_DO_VENTO.piso)});${
              v.enrolamento !== undefined
                ? `
            // os BRAÇOS (\`BRACOS_DO_VENTO\`, só com giro medido): dois, a 180°, enrolados para trás do giro
            vec3 dr = pm / rr;
            float bS = exp(${literalGlsl(BRACOS_DO_VENTO.concentracao)} * (cos(2.0 * (atan(pm.z, pm.x + 1e-7) - ${literalGlsl(v.enrolamento)} * (r - 1.0))) - 1.0)
              - dr.y * dr.y * ${literalGlsl(1 / BRACOS_DO_VENTO.latitude)});
            float bD = 1.0 + ${literalGlsl(BRACOS_DO_VENTO.contraste - 1)} * bS;
            gas += ${literalGlsl(v.normal * normalDosBracos())} * bD * bD`
                : `
            gas += ${literalGlsl(v.normal)}`
            }
              * (1.0 - smoothstep(1.0, ${literalGlsl(v.fim)}, r))
              / (r * r * r * r * w * w) * dt;`
                : ''
            }${
              d
                ? `
            float za = gO.y + gD.y * ta;
            float zb = gO.y + gD.y * tb;
            float tm = 0.5 * (ta + tb);
            float tz = abs(gD.y) > 1e-6 ? clamp(-gO.y / gD.y, ta, tb) : tm;
            vec3 pz = gO + gD * tz;
            float rc = max(length(pz.xz), 1.0);
            float hz = ${literalGlsl(d.h0)} * rc * sqrt(rc);
            // a linha que corta o plano: a gaussiana exata no segmento, no raio do cruzamento;
            // a rasante (quase no plano): no meio do segmento — o cruzamento ali é mal definido
            // e, preso a uma ponta, caía fora da cauda e apagava a frente vista de lado
            bool gCorta = abs(gD.y) * dt > 0.05 * hz;
            if (!gCorta) {
              pz = gO + gD * tm;
              rc = max(length(pz.xz), 1.0);
              hz = ${literalGlsl(d.h0)} * rc * sqrt(rc);
            }
            float col = gCorta
              ? hz * 0.8862269 / abs(gD.y) * abs(erfDoGas(zb / hz) - erfDoGas(za / hz))
              : exp(-pz.y * pz.y / (hz * hz)) * dt;
            gas += uLuzDoDisco * exp2(${literalGlsl(-2 * d.expoente)} * log2(rc))
              * (1.0 - smoothstep(${literalGlsl(CAUDA_DO_DISCO.de * d.raioExterno)}, ${literalGlsl(CAUDA_DO_DISCO.ate * d.raioExterno)}, rc)) * col;`
                : ''
            }
          }
          // o PISO DO INSTRUMENTO (\`joelhoDoPiso\`): preto abaixo de 1 % do pico
          {
            float gP = max(${piso}, 1e-9);
            float gX = gas - gP;
            gas = gX <= 0.0 ? 0.0 : (gX < 2.0 * gP ? gX * gX / (4.0 * gP) : gX - gP);
          }`;
}
/**
 * a malha do gás da frente, × o raio equatorial: por fora do esferoide, rente
 * a ele. A câmera nunca entra nela: o piso do zoom numa estrela é 2 raios
 * (`K_MIN_RAIOS`, `atlasRig.ts`), e de dentro a face da frente sumiria.
 */
export const RAIO_DA_FRENTE_DO_GAS = 1.02;
/** erf aproximada (Winitzki, a = 0,147), sem NaN: o argumento do sqrt é ≥ 0 */
const GLSL_ERF_DO_GAS = /* glsl */ `
        float erfDoGas(float x) {
          float x2 = x * x;
          return sign(x) * sqrt(max(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)), 0.0));
        }`;
/** os uniforms do disco de gás (a luz e o piso pela fase) e a erf */
const UNIFORMS_DO_DISCO = '\n        uniform float uLuzDoDisco;\n        uniform float uPisoDoGas;' + GLSL_ERF_DO_GAS;

export const SOL_PARAMS: StellarParams = {
  nome: 'Sol',
  // O RAIO FÍSICO DA FOTOSFERA (F3), pela fonte única do cadastro — não
  // um 2,2567e-8 redigitado, e não mais o `WORLD.sunRadius` artístico
  // que ficou aqui da Onda 3 até 2026-08-13. É esta linha que faz o
  // fator do cadastro sair 1: `RAIO_DO_SOL_NA_CENA` é o MESMO símbolo
  // que `escala.ts` divide por `RAIO_SOL_PC` para acusar quem infla.
  radiusPc: RAIO_DO_SOL_NA_CENA,
  rotPeriodDays: SOL_ROT_PERIOD_DAYS,
  // inclinação real do eixo solar (~7,25°), como no original
  tiltRad: 0.1265,
  activityLevel: 1,
  teffK: 5772,
  dinamo: true,
  seed: 20260803,
  knobPrefix: 'sol',
  knobs: SOL_KNOBS,
};

/**
 * AS FAMÍLIAS DE VIDA. Cada linhagem de estrutura efêmera do corpo tem um
 * tempero próprio na semente, para que o sorteio de uma não desloque o da
 * outra — regiões ativas e grupos de manchas nascem no mesmo instante e
 * têm de ser independentes.
 */
const EIXO_Y = new THREE.Vector3(0, 1, 0);

const FAMILIAS_DA_VIDA: Record<string, number> = { regiao: 1, mancha: 2 };

/**
 * QUANTO A DATA PRECISA ANDAR PARA O RETRATO SER OUTRO — em unidades do
 * ciclo (1800 por ciclo, ~2,24 dias cada). 7,2 unidades ≈ 16 dias: abaixo
 * disso a fase move a atividade menos que o ruído da granulação, e re-assar
 * seria pagar por nada. No filme o instante é fixo (a troca da coda anda
 * 0,667 dia ≈ 0,3 unidade), então o filme não paga NENHUM re-bake; no
 * degrau de 10⁷ s/s do Atlas o limiar é cruzado ~7×/s e a máquina pousa a
 * cada meio segundo — que é honesto, porque ali o Sol está mesmo mudando.
 */
const LIMIAR_DE_REASSAR = 7.2;

/**
 * Os passos de relaxamento do Br que estabelecem um retrato — os mesmos
 * no `prime` síncrono e no re-bake fatiado, porque é a IGUALDADE da
 * contagem que garante a mesma chegada por qualquer caminho.
 */
const PRIME_STEPS = 320;

/** Passos de simulação por quadro durante o re-bake fatiado. */
const PASSOS_DO_REASSAR_POR_QUADRO = 16;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class StellarBody {
  readonly group = new THREE.Group();
  readonly params: StellarParams;
  /** rad/s de tela, derivado de `params.rotPeriodDays` no construtor */
  private readonly rotSpeed: number;
  private ctx: any;
  private lastTime = -1;
  private simAccum = 0;
  private chromoAccum = 0;
  private scale: number;
  private camDirN = new THREE.Vector3(0, 0, 1);
  private limboFade = 1;
  private kn: Record<string, number>;
  private sunRotM4 = new THREE.Matrix4();
  private camRightTmp = new THREE.Vector3();
  private camUpTmp = new THREE.Vector3();
  private promNormal = new THREE.Vector3();
  private promWorldTmp = new THREE.Vector3();
  /** a cirurgia da F2 foi aplicada NESTA instância (as duas portas) */
  private filtroSolarLigado = false;
  /** peso da representação resolvida (M1) — o director escreve; o
   *  `update` o entrega a `uWorldFade`. Nasce 1: sem director escrevendo
   *  (testes de unidade do corpo), o comportamento é o de sempre. */
  private pesoDaLei = 1;
  /** o mesmo peso, para as camadas emissivas de fora da fotosfera
   *  (`cirurgiaDoPeso`) — um objeto só, partilhado pelos materiais */
  private readonly pesoDasCamadas = { value: 1 };
  /** cache do último `uFiltroSolar` escrito — nasce no valor do uniform */
  private filtroSolarAnterior = 1;
  /** o brilho da estrela no nível da visita (g = 0): o da casca em volta do
   *  disco, que não recebe o filtro (`escreverBrilho`, `criarABordaDifusa`) */
  private readonly brilhoDaVisita = { value: 1 };
  /** a luz do disco de gás (normal × a fase da data, `escreverDisco`) */
  private readonly luzDoDisco = { value: 0 };
  /** a mancha fria pela data (`escreverManchaFria`): a direção do lado escuro e a corda; a razão das temperaturas */
  private readonly manchaFria = {
    uManchaFria: { value: new THREE.Vector4(0, 0, 1, CORDA_SEM_MANCHA) },
    uManchaFriaK: { value: 1 },
    /** o lado escuro no referencial do ASSADO (o do objeto com x trocado: a esfera do three) e a borda */
    uManchaFriaAssado: { value: new THREE.Vector4(0, 0, 1, CORDA_SEM_MANCHA) },
  };
  /** o material do assado com a região fria (`makeFullscreenScene`), ou null */
  private assadoComManchaFria: THREE.ShaderMaterial | null = null;
  /** a região fria mudou desde o último assado: com o relógio parado, re-assar (`passoDoReassar`) */
  private assadoDaManchaSujo = false;
  private readonly manchaAssada = new THREE.Vector4(0, 0, 1, CORDA_SEM_MANCHA);
  private readonly qManchaTmp = new THREE.Quaternion();
  private readonly dManchaTmp = new THREE.Vector3();
  /** o piso do instrumento em unidades do gás (`PISO_DO_INSTRUMENTO` × o pico do vento + o do disco pela fase) */
  private readonly pisoDoGas = { value: 0 };
  /** o que sobra das asas do véu com o gás (`asaComGas`), pela fase do disco */
  private readonly asaDoGas = { value: 1 };
  /** a força do véu e o peso da asa longa desta estrela (`forcaDoVeu`, `pesoDaAsaLonga`), para `asaComGas` */
  private forcaDoVeuComGas = 0;
  private asaLongaComGas = 0;
  /** a fase do ciclo VIVA (a da data), escrita pelo director por quadro */
  private faseDoCicloViva: FaseDoCiclo;
  /** a data do filme em cartaz (JD TDB) ou null — o relógio do giro
   *  (`anguloDoGiro`); nasce null: sem director, o giro de sempre */
  private jdDaCena: number | null = null;
  /** o T em que o retrato publicado foi assado — a régua do re-bake */
  private cicloAssado = 0;
  /**
   * O RE-BAKE FATIADO. Quando a data anda o bastante, o retrato da
   * cromosfera (e, com o relógio parado, o campo da granulação) precisa
   * ser refeito NA FASE NOVA — e isso só é preciso com o relógio VISUAL
   * PARADO. Com ele andando, o bake estrutural de 8 Hz já refaz o retrato
   * com as cargas de agora e a granulação já relaxa rumo a elas: a data
   * é seguida de graça, e as duas máquinas escrevem no MESMO conjunto de
   * alvos — deixá-las correr juntas rasgaria o retrato ao meio.
   *
   * Fatiado por quadro e COALESCIDO: um re-bake em curso nunca se
   * reinicia nem se enfileira, ele POUSA, e só então a data pode disparar
   * o próximo. O retrato velho continua publicado até o fim, então não há
   * véu nem meia cromosfera em quadro.
   */
  private reassar: { passos: number; fatia: number } | null = null;
  /** as geometrias das cenas de quad (`makeFullscreenScene`) — elas não
   *  moram no `group`, então só esta lista as leva ao `dispose()` */
  private readonly geoDosQuads: THREE.PlaneGeometry[] = [];
  /** a câmera relativa ao centro DESTA estrela (o Sol: a própria posição) */
  private readonly camRel = new THREE.Vector3();
  /** outra cor que não a do Sol (`teffK` ≠ 5.772 K): a matiz por quadro */
  private readonly outraCor: boolean;
  private readonly matizTmp = new THREE.Vector3();
  private readonly corTmp = new THREE.Vector3();
  /** a matiz das camadas emissivas de cor embutida (`cirurgiaDaMatiz`) */
  private readonly matizDaCamada = { value: new THREE.Vector3(1, 1, 1) };
  /** o referencial local (`foraDaOrigem`), composto em float64 por quadro */
  private readonly referencial = {
    uVistaLocal: { value: new THREE.Matrix4() },
    uVistaLocalInv: { value: new THREE.Matrix4() },
    uCameraLocal: { value: new THREE.Vector3() },
  };
  /**
   * SEM DÍNAMO (`dinamo: false`): nada de
   * manchas, ciclo, laços, proeminências, espículas, erupções, CME nem
   * coroa quente — essas camadas nem nascem. Sobra a fotosfera.
   */
  private readonly semDinamo: boolean;
  /** a regra da Forja (`forjaDe`), ou null: o caminho de antes */
  private readonly forja: RegraDaForja | null;
  /** o raio da atmosfera estendida (o da Forja, ou 1) */
  private readonly raioDaBordaDifusa: number;
  /** a frequência das erupções relativa ao Sol (1 = a do Sol, pulada) */
  private readonly taxaDeErupcoes: number;
  /** o eixo na base da cena (`eixoNaCena`) e o giro em torno dele */
  private readonly qEixo: THREE.Quaternion | null = null;
  private readonly qGiro = new THREE.Quaternion();
  private giro = 0;

  constructor(
    params: StellarParams,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    quality: QualityLevel,
    /**
     * A FASE DO CICLO NO NASCIMENTO — a data que o mundo já conhece. Não
     * é conforto: o `prime` do construtor assa um retrato completo, e
     * assá-lo na fase errada obrigaria um re-bake no primeiro quadro de
     * TODA sessão. Quem sabe a data é o director; o corpo obedece.
     */
    cicloInicial: FaseDoCiclo = { fase01: 0, ciclo: 0 }
  ) {
    this.params = params;
    this.faseDoCicloViva = cicloInicial;
    this.rotSpeed = rotSpeedFromPeriod(params.rotPeriodDays);
    this.outraCor = params.teffK !== TEFF_SOL_K;
    this.semDinamo = !params.dinamo;
    this.forja = forjaDe(params);
    this.raioDaBordaDifusa = this.forja ? this.forja.atmosferaEmRaios : 1;
    this.taxaDeErupcoes =
      !this.semDinamo && params.activityLevel !== 1 ? taxaDeErupcoesPelaAtividade(params.activityLevel) : 1;
    if (params.eixoNaCena) {
      const [ex, ey, ez] = params.eixoNaCena;
      this.qEixo = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(ex, ey, ez).normalize()
      );
    }
    this.scale = params.radiusPc / DONOR_RADIUS;
    this.group.scale.setScalar(this.scale);

    // o tier DA ESTRELA: no Sol é o objeto de sempre (nenhuma chave nova)
    const tier = tierDaEstrela(TIERS[TIER_FOR[quality]], params, this.forja);
    const srand = mulberry32(params.seed);
    // knobs por URL (?solcvol=0 etc.) — a URL é a fonte de verdade,
    // como no resto do app; sem query, os defaults de fábrica valem.
    // `activityLevel` escala os dois knobs de atividade ANTES da URL:
    // no Sol ele é 1, e `1 * x` é o mesmo bit que x — a instância 1 sai
    // idêntica à de antes da parametrização.
    const kn: Record<string, number> = { ...params.knobs };
    kn.spots *= params.activityLevel;
    kn.cycle *= params.activityLevel;
    const q = new URLSearchParams(window.location.search);
    for (const k of Object.keys(kn)) {
      const v = Number.parseFloat(q.get(params.knobPrefix + k) ?? '');
      if (Number.isFinite(v)) kn[k] = v;
    }
    this.kn = kn;
    const ctx: any = {
      renderer,
      // as fábricas fazem ctx.scene.add(mesh) — um Group serve
      scene: this.group,
      // o CME captura ctx.camera na CRIAÇÃO (cme.js:10) — tem de ser a real
      camera,
      // raio em unidades de MUNDO para os raymarches de cvol/cme
      // (cameraPosition/vWorld são parsec — ver patches "transplante:")
      SUN_RADIUS_WORLD: params.radiusPc,
      // as duas pontes de escala para o texto do GLSL (F1) — sem elas o
      // raio físico vira "0.000000" e o guarda de segmento mata todo
      // raio antes do primeiro passo. Ver o bloco acima de SOL_PARAMS.
      SUN_R_GLSL: literalGlsl(params.radiusPc),
      SEG_EPS_GLSL: epsilonDeSegmentoGlsl(params.radiusPc),
      // o tier DA ESTRELA (`tierDaEstrela`): no Sol, o objeto de sempre
      TP: tier,
      TIER: TIER_FOR[quality],
      FBM_OCTAVES: tier.fbm,
      SPHERE_SEG: tier.seg,
      SIM_W: tier.simW,
      SIM_H: tier.simH,
      PROMINENCE_COUNT: tier.prom,
      // streams próprios como no config.js de lá (semeados: capturas
      // reproduzíveis; o three não consome estes streams)
      srand,
      spotRand: mulberry32(params.seed ^ 0x59075eed),
      loopRand: mulberry32(params.seed ^ 0x5eedc0de),
      cmeRand: mulberry32(params.seed ^ 0x00c0e5ed),
      knob: (name: string) => kn[name] ?? 0,
      // R1b: os uniforms da calibração por curva, partilhados pelos
      // materiais do Sol e escritos por quadro em `update`
      paleta: { value: SOL_NO_ACES.ganho.clone() },
      corFria: { value: SOL_NO_ACES.corFria.clone() },
      corQuente: { value: SOL_NO_ACES.corQuente.clone() },
      corDoLimbo: { value: SOL_NO_ACES.limbo.clone() },
      tintaDaAbsorcao: { value: SOL_FORA_DO_ACES.absorcao.clone() },
      paletaDaCoroa: { value: SOL_NO_ACES.ganho.clone() },
      getControl: (name: string) => kn[name] ?? 0,
      getAppliedControl: (name: string) => kn[name] ?? 0,
      TIME_SCALE: 1, EDU_K: 0, CYCLE_K: kn.cycle, LAPSE_K: 0,
      FPROM_K: kn.fprom, SPOTS_K: kn.spots, LOOP_K: kn.loops,
      CVOL_K: kn.cvol, CME_K: kn.cme,
      DET: false,
      subToggle: {
        sim: true, bake: true, corona: true, corona3d: true,
        loops: true, spots: true, prom: true, cme: true, cmepts: true,
      },
      eduEvent: () => false,
      diagEvent: () => {},
      markInteraction: () => {},
      directorUserExit: null,
      launchCME: () => {},
      maybeLaunchCME: () => {},
      elapsed: 0,
      cyclePhase01: cicloInicial.fase01,
      cycleN: cicloInicial.ciclo,
      // O RELÓGIO LENTO — a data, na unidade do núcleo. Escrito por
      // `escreverCiclo` a cada quadro; nasce no instante que o director
      // passou. Não acumula, não pode acumular: é ele que faz o mesmo
      // instante devolver o mesmo Sol.
      tempoDoCiclo: tempoDoCiclo(cicloInicial),
      // a régua que converte T de volta em (ciclo, fase) — é dela que o
      // núcleo tira a fase EM QUE UMA REGIÃO NASCEU
      UNIDADES_POR_CICLO,
      // a DOSE de ocupação da dramaturgia (1 = sem assistência)
      doseDoSol: 1,
      // A CORRENTE DE UMA VIDA. Semente por (família, índice, vida) — é
      // o que substituiu o stream compartilhado que ANDAVA a cada
      // renascimento. A família separa regiões de grupos de manchas para
      // um não deslocar o outro.
      correnteDaVida: (familia: string, i: number, k: number) =>
        mulberry32(
          (params.seed ^ Math.imul(FAMILIAS_DA_VIDA[familia] ?? 0, 0x9e3779b1)
            ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(k | 0, 0xc2b2ae35)) >>> 0
        ),
      solarMaxK: 0,
      surfFlareT: 999,
      surfFlareAmp: 0,
      surfFlareCooldown: 6,
      flareSeedVal: 0,
      bakeStep: -1,
      bakeTime: 0,
      bakeSwapT: 0,
      bakeCycleDt: 0.4,
      camDist: DONOR_FIT,
      fitDist: DONOR_FIT,
      MACRO_SLOW,
      ROT_SPEED: this.rotSpeed,
      rtType: THREE.HalfFloatType,
      isHDR: true,
      quadCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      // As CINCO cenas de quad (sim, três da cromosfera, PIL) vivem FORA
      // do `group` — são cenas de passo, não cena de mundo —, e por isso
      // o `traverse` do `dispose()` nunca as alcançou. Com um Sol por
      // aba isso não custava nada; com a troca de tier ao vivo (Ajustes
      // C) custava 5 geometrias POR CLIQUE, e o amostrador de memória as
      // pegou. A lista é a coleira: quem cria, anota.
      makeFullscreenScene: (material: THREE.Material) => {
        const geometria = new THREE.PlaneGeometry(2, 2);
        this.geoDosQuads.push(geometria);
        const mesh = new THREE.Mesh(geometria, material);
        mesh.frustumCulled = false;
        // o assado da Forja com a região fria (`glslDoAssadoDaForja`): o corpo
        // guarda o material para escrever a região e ligar o define
        if (material instanceof THREE.ShaderMaterial && material.fragmentShader.includes('uManchaFriaAssado')) {
          this.assadoComManchaFria = material;
          material.uniforms.uManchaFriaAssado = this.manchaFria.uManchaFriaAssado;
        }
        const s = new THREE.Scene();
        s.add(mesh);
        return s;
      },
    };
    ctx.NOISE_GLSL = NOISE_GLSL.replace('i<5;', 'i<' + tier.fbm + ';');
    ctx.tuneLic = (src: string) =>
      tier.lic7
        ? src
        : src
            .replace(/int i=-6;i<=6/g, 'int i=-3;i<=3')
            .replace(/float\(i\)\/6\.0/g, 'float(i)/3.0');
    this.ctx = ctx;

    // Ordem de criação do main.js original — dependências implícitas
    ctx.gran = createGranulation(ctx);
    ctx.simRTs = ctx.gran.simRTs;
    ctx.simUniforms = ctx.gran.simUniforms;
    ctx.simRTOptions = ctx.gran.simRTOptions;
    ctx.pil = createPIL(ctx);
    createSunBase(ctx);
    ctx.act = createActivity(ctx);
    ctx.charges = ctx.act.charges;
    ctx.pairStates = ctx.act.pairStates;
    // SEM DÍNAMO, SEM CARGAS: as regiões e o dipolo polar vão a zero (o
    // `prime` re-semeia o sim e re-assa com elas zeradas). Sobra o tapete
    // misto do sim, que a cirurgia abaixo também não deixa virar plage
    if (this.semDinamo) {
      ctx.cycleAmpK = 0;
      ctx.doseDoSol = 0;
      ctx.act.cyclePolarN.w = 0;
      ctx.act.cyclePolarS.w = 0;
      ctx.act.updateActiveRegions(ctx.tempoDoCiclo);
    }
    createSunUniforms(ctx);
    if (this.forja) {
      // o assado pinta a convecção (`cirurgiaDoAssado`) e a smear não roda
      const forja = this.forja;
      ctx.cirurgiaDoAssado = (f: string) => cirurgiaDoAssado(f, forja, Boolean(this.params.escurecimento));
      ctx.cirurgiaDoSmear = cirurgiaDoSmear;
    }
    ctx.chromo = createChromo(ctx);
    if (this.forja) this.assadoSoDaConveccao(ctx);
    createSunMesh(ctx);
    // a fotosfera é ocultador do rascunho do campo (item 47): estrela
    // atrás do Sol não vaza clarão. Coroa/cromosfera/ejeções ficam fora.
    ctx.sunMesh.layers.enable(CAMADA_DOS_OCULTADORES);
    // F2, LEI SEM PORTA desde o M1. A fotosfera emite a radiância
    // verdadeira na unidade de tela; a porta `?bfoto=` morreu com a
    // migração (regra iv do §4 da LEI-DA-ESTRELA) — o lado A do A/B vive
    // nas capturas versionadas e no teste numérico, nunca mais num ramo
    // de runtime.
    //
    // A CONDIÇÃO QUE FICA NÃO É ZELO, é o half-float: com `?bemis=0` a
    // curva é identidade exata, e identidade sobre 2,7e10 é o buffer
    // saturado em 65.504 no primeiro pixel do disco — o quadro branco que
    // a onda existe para consertar. Quem pedir a volta do joelho leva
    // junto a volta da paleta autorada; ou as duas, ou nenhuma.
    //
    // O FATOR SAI DA PONTE DE UNIDADES (`radianciaDeTela`), a MESMA que o
    // invariante da troca cobra em `luzDaCasa.test.ts` — uma escrita só
    // para a lei, com o raio DESTA instância. A metade geométrica dela já
    // é da instância; a fotométrica ainda é do Sol (`magnitudeDoSol`), e é
    // a E3 — `StellarBody` parametrizado por `teffK` — que a solta. Passar
    // `params.radiusPc` em vez do `RAIO_SOL_PC` constante é o que faz esse
    // dia ser um diff em `luzDaCasa.ts`, não uma caça a literais aqui
    // dentro.
    if (BETA_DA_EMISSAO > 0) {
      const mat = ctx.sunMesh.material as THREE.ShaderMaterial;
      mat.fragmentShader = cirurgiaDaFotosfera(
        mat.fragmentShader,
        // o raio da PONTE é o do Sol para toda instância: a unidade da casa
        // é "a superfície do Sol", e o vão é troca de unidade — com o raio
        // de outra estrela ele erraria por (R☉/R)² (o mesmo argumento do
        // piloto). No Sol é o mesmo número de antes.
        radianciaDeTela(RADIANCIA_DA_FOTOSFERA, RAIO_DO_SOL_NA_CENA),
        BETA_DA_EMISSAO
      );
      // o BRILHO DE OUTRA ESTRELA (radiância visível × exposição da visita,
      // escrito por `escreverBrilho`): só fora dos 5.772 K — o Sol nem o tem
      if (this.outraCor) {
        mat.fragmentShader =
          'uniform float uBrilhoDaEstrela;\n' +
          mat.fragmentShader.replace('* uTransmitancia, ', '* uTransmitancia * uBrilhoDaEstrela, ');
        if (!mat.fragmentShader.includes('uBrilhoDaEstrela, ')) {
          throw new Error('StellarBody: a âncora do brilho (`* uTransmitancia, `) sumiu da fotosfera');
        }
        ctx.sunUniforms.uBrilhoDaEstrela = { value: 1 };
      }
      // O FILTRO nasce em 1 — radiância verdadeira, o comportamento da F2
      // crua — e só desce quando o director escreve. O uniform entra no
      // MESMO objeto que o vendorizado entregou ao material (`uniforms:
      // sunUniforms`, sun.js:857), e ANTES do primeiro render: o three
      // monta a lista de uniforms na COMPILAÇÃO do programa, e uma chave
      // que aparecesse depois nunca chegaria à GPU.
      ctx.sunUniforms.uFiltroSolar = { value: 1 };
      // o AR DA TERRA no raio câmera→Sol (`escreverTransmitancia`): nasce
      // (1, 1, 1), e multiplicar por 1,0 é exato — longe da Terra o disco
      // sai bit a bit o de antes
      ctx.sunUniforms.uTransmitancia = { value: new THREE.Vector3(1, 1, 1) };
      this.filtroSolarLigado = true;
      mat.needsUpdate = true;
    }
    // A FOTOSFERA DE OUTRA ESTRELA (contraste, borda, sem dínamo, forma
    // achatada + gravidade): só o que a instância pede — o Sol não passa
    this.operarAFotosfera(ctx);
    ctx.sunInvRot = new THREE.Matrix3();
    // sem dínamo a atmosfera magnética inteira (coroa, CME, espículas,
    // proeminências, laços, erupções) NEM NASCE
    if (!this.semDinamo) this.criarAAtmosfera(ctx);
    // o passo do sim escreve a textura viva também nas espículas
    // (`granulation.js`): sem elas, um ralo no lugar
    else ctx.spiculeUniforms = { uSimTex: { value: null } };
    ctx.sunMesh.rotation.z = params.tiltRad;

    if (params.foraDaOrigem || this.outraCor) this.operarAsCamadas(ctx);
    if (this.qEixo) this.girarPeloEixo(ctx);
    this.operarOPesoDasCamadas(ctx);
    // a atmosfera estendida: só quem a tem (o Sol nem a constrói). Depois
    // das cirurgias das camadas — ela não usa mundo nem cor embutida
    if ((this.raioDaBordaDifusa > 1 || (params.veu ?? 0) > 0 || params.gas) && this.filtroSolarLigado) {
      this.criarABordaDifusa(ctx);
    }

    this.prime(renderer);
  }

  /**
   * UM PESO SÓ PARA A ESTRELA INTEIRA (12/11): toda camada aditiva do
   * grupo que ainda não bebe `uWorldFade` (a fotosfera, as espículas e a
   * borda difusa já bebem) passa a sair multiplicada pelo peso da lei. O
   * sprite da coroa externa não é shader: o peso entra na cor dele, em
   * `update`. Com o peso em 1 (corpo resolvido) a conta é ×1 exato.
   */
  private operarOPesoDasCamadas(ctx: any) {
    const feitos = new Set<THREE.Material>();
    this.group.traverse((o: any) => {
      const lista = (Array.isArray(o.material) ? o.material : [o.material]).filter(
        (m: unknown) => m instanceof THREE.ShaderMaterial
      ) as THREE.ShaderMaterial[];
      for (const m of lista) {
        if (feitos.has(m)) continue;
        feitos.add(m);
        if (m === ctx.sunMesh.material || m.blending !== THREE.AdditiveBlending) continue;
        if (m.fragmentShader.includes('uWorldFade')) continue;
        m.fragmentShader = cirurgiaDoPeso(m.fragmentShader);
        m.uniforms.uPesoDasCamadas = this.pesoDasCamadas;
        m.needsUpdate = true;
      }
    });
  }

  /** a atmosfera magnética, na ordem de criação do main.js original */
  private criarAAtmosfera(ctx: any) {
    const params = this.params;
    createCoronaRays(ctx);
    createCoronaVolume(ctx);
    createCME(ctx);
    // a coroa atrás de um corpo (F4): os três planos aditivos passam a
    // testar profundidade contra os globos, na frente do próprio Sol —
    // ver `cirurgiaDaCoroaOcultavel`. Volume e CME podem não existir
    // (tier/knob): o que não nasceu não se opera.
    for (const plano of [ctx.coronaRays, ctx.coronaVol, ctx.cmeMesh]) {
      if (plano) coroaOcultavel(plano.material as THREE.ShaderMaterial, params.radiusPc);
    }
    // partículas do CME: -mv.z em parsec de volta à régua do doador
    // meshes NASCE [null, null] (cme.js) e o tier low nunca as preenche
    // (cmen=0 desliga o subsistema inteiro) — sem o m?. o construtor
    // estourava em ?q=performance. Ficou escondido porque o ?q= só era
    // aplicado DEPOIS do init: o tier low nunca tinha rodado.
    for (const m of ctx.cmePts?.meshes ?? []) {
      if (m?.material?.uniforms?.uZScale) m.material.uniforms.uZScale.value = 1 / this.scale;
    }
    // e o rastro delas na régua do doador (ver `cirurgiaDasParticulas`):
    // um material só, partilhado pelas duas malhas
    const particulas = ctx.cmePts?.ptsMat as THREE.ShaderMaterial | undefined;
    if (particulas) particulas.vertexShader = cirurgiaDasParticulas(particulas.vertexShader, this.scale);
    createSpicules(ctx);
    ctx.prom = createProminences(ctx);
    createLoops(ctx);
    // as duas fitas dos laços na régua do doador (ver `cirurgiaDasFitas`)
    for (const o of ctx.loopGroup.children) {
      const m = o.material as THREE.ShaderMaterial;
      m.vertexShader = cirurgiaDasFitas(m.vertexShader, this.scale);
    }
    createFlares(ctx);
    // a primeira erupção também na frequência da estrela (no Sol, pulado)
    if (this.taxaDeErupcoes !== 1) ctx.surfFlareCooldown /= Math.max(this.taxaDeErupcoes, 1e-3);

    // inclinação do eixo (Sol: ~7,25°, como no original; a fotosfera a
    // recebe no construtor, porque sem dínamo esta função nem roda)
    ctx.prominenceGroup.rotation.z = params.tiltRad;
    ctx.spiculeMesh.rotation.z = params.tiltRad;
    ctx.loopGroup.rotation.z = params.tiltRad;

    // AS CAMADAS PRESAS À SUPERFÍCIE SEGUEM A FORMA ACHATADA (`achatamento`):
    // espículas, proeminências (com os filamentos) e laços nasceram numa
    // esfera de raio R; a fotosfera segue Roche. A MESMA escala no eixo de
    // rotação — o +Y do objeto, o mesmo da fotosfera (`formaDeRoche`), antes
    // do giro e da inclinação, porque a escala de uma malha vem antes da
    // rotação dela — leva a esfera ao esferoide Rp × Re. A superfície de
    // Roche difere desse esferoide pelo quadrado do achatamento: 0,026 % do
    // raio em Capella Ab (2,6 %), invisível. Os cartões cisalham no máximo
    // o próprio achatamento; as fitas medem a largura em pixels, sem
    // cisalhar. Coroa, CME, halo e brilho não estão na superfície: ficam.
    // Sem achatamento (o Sol) nada aqui roda.
    const a = params.achatamento;
    if (a) {
      const k = a.raioPolarRsol.v / a.raioEquatorialRsol.v;
      for (const m of [ctx.prominenceGroup, ctx.spiculeMesh, ctx.loopGroup]) m.scale.y = k;
      const esp = ctx.spiculeMesh.material as THREE.ShaderMaterial;
      esp.vertexShader = cirurgiaDaNormalDasEspiculas(esp.vertexShader, k);
    }
  }

  /**
   * A CASCA EM VOLTA DO DISCO, uma casca aditiva desenhada pelas faces de
   * TRÁS — atrás do disco a profundidade da fotosfera a apaga, fora dele
   * sobra o anel; vale com a câmera dentro dela. Duas coisas, cada uma só
   * para quem a física dá (o Sol não constrói a casca):
   *  · A ATMOSFERA ESTENDIDA (raio > 1, a MOLsphere de uma
   *    supergigante): gás luminoso e translúcido, ADITIVO — exponencial na
   *    altura acima da borda, mais brilhante rente a ela (uma camada densa a
   *    `ESCALA_DA_CAMADA_RENTE` por cima), e levado a zero por uma cauda suave
   *    antes do fim da casca (nada de aresta). Poucas plumas assimétricas,
   *    como o VLT e o ALMA mostram (Kervella et al. 2009, 2018): um ruído de
   *    ordem baixa na direção muda a escala de altura (de `PLUMA_MIN` a
   *    `PLUMA_MAX` × o excesso medido) e o brilho; estrias ao longo do raio;
   *  · O VÉU (`veu` > 0): a luz que a exposição da visita não põe no disco
   *    vira o espalhamento da câmera em volta dele, como fração da borda do
   *    disco JÁ COMPRIMIDA (ver `RAIO_DO_VEU` e `forcaDoVeu`).
   * A REGRA É A DO SOL (14/11): só a FOTOSFERA recebe a radiância verdadeira
   * do filtro aberto (g = 1); o que fica em volta do disco — no Sol a coroa,
   * as espículas, a ejeção — é desenhado sempre no nível da visita. A casca
   * recebia o fator do filtro, e com o disco entre ~8 e ~90 px ela estourava
   * inteira: um disco branco chapado de 2,4 raios em Betelgeuse (as plumas
   * viravam caroços na borda) e de 2 raios em Sirius e Vega (o véu). Agora
   * ela lê `uBrilhoDaVisita` (radiância × exposição plena, sem o filtro):
   * com g = 0 é bit a bit a de antes. O ar, a compressão e o peso da lei
   * seguem os da fotosfera, partilhando os uniforms.
   */
  private criarABordaDifusa(ctx: any) {
    const p = this.params;
    const su = ctx.sunUniforms;
    const rEnv = Math.max(1, this.raioDaBordaDifusa);
    const veu = Math.max(0, p.veu ?? 0);
    const fj = this.forja !== null;
    const plumaMin = fj ? CASCA_DA_FORJA.plumaMin : PLUMA_MIN;
    const plumaMax = fj ? CASCA_DA_FORJA.plumaMax : PLUMA_MAX;
    const alcance = fj ? CASCA_DA_FORJA.alcance : ALCANCE_DA_ATMOSFERA;
    const brilho = fj ? CASCA_DA_FORJA.brilho : BRILHO_DA_ATMOSFERA;
    // a asa longa e o tom do véu: só nas quentes (ver `VEU_POR_STOP`)
    const quente = (p.pesoDoPico ?? 0) > 0 && veu > 0;
    const asaLonga = quente ? pesoDaAsaLonga(p.stopsDoPico ?? 0) : 0;
    // o gás das quentes (`O GÁS DAS QUENTES`): só de quem o tem
    const gas = p.gas;
    const rGas = raioDoGas(gas);
    // a casca SEM o gás é a régua dos fiapos e das plumas (eles somem
    // antes do fim dela): o vento não estica a atmosfera da estrela
    const rSemGas = Math.max(
      1 + (rEnv - 1) * plumaMax * alcance,
      veu > 0 ? RAIO_DO_VEU : 1,
      asaLonga > 0 ? RAIO_DO_VEU_QUENTE : 1
    );
    const rCasca = Math.max(rSemGas, rGas);
    // o fator tonal da casca lisa entra na da Forja pela rampa em que a
    // convecção sai (`pesoDaLisa`): sem degrau no nível do véu na fronteira;
    // abaixo de 8.700 K (peso 0) o texto é o de antes
    const tomDaLisa = fj ? pesoDaLisa(p.teffK) : 1;
    const tomDoVeuGlsl = quente
      ? ` * vec3(${tomDoVeu(p.teffK, p.pesoDoPico ?? 0).map((x) => literalGlsl(x)).join(', ')})`
      : '';
    const u = p.bordaU ?? 0.3;
    // as asas do véu com o gás (`asaComGas`): pela fase quando há disco
    this.forcaDoVeuComGas = forcaDoVeu(veu);
    this.asaLongaComGas = asaLonga;
    const asaDoGasGlsl = gas
      ? gas.disco
        ? ' * uAsaDoGas'
        : ` * ${literalGlsl(asaComGas(gas, this.forcaDoVeuComGas, asaLonga, u, 0))}`
      : '';
    // a cor do gás: o rosa do hidrogênio, sobre a luminância do centro do disco comprimido
    const corDoGas = gas
      ? `rosaDoGas(dot(comprimir3(k, ${literalGlsl(BETA_DA_EMISSAO)}), vec3(${[LUMA_R, LUMA_G, LUMA_B]
          .map((x) => literalGlsl(x))
          .join(', ')})) * gas)`
      : '';
    // A BORDA DE UMA ESTRELA ACHATADA (`achatamento`): o perfil começa no
    // contorno dela, não no círculo do raio equatorial — senão sobra, entre o
    // polo e o círculo, uma faixa com o véu na força da borda. Duas contas:
    //  · o ESFEROIDE dos dois raios, EXATO sob perspectiva: no espaço
    //    esticado ao longo do eixo por k = Re/Rp ele é a esfera de raio Re, e
    //    esticar preserva a tangência — o parâmetro de impacto de lá é a
    //    distância ao centro sobre o raio do esferoide naquela direção (a
    //    elipse do contorno visto de longe deixava, a 3 raios e de eixo
    //    inclinado, uma faixa só do lado do polo de trás: Régulo, 16/11);
    //  · a superfície de ROCHE fica por dentro do esferoide nas latitudes
    //    médias (até 2,5 % do raio em Régulo): a razão entre os dois raios
    //    na colatitude do ponto mais próximo, com o raio de Roche na forma
    //    fechada r/Rp = 3/(ω·senθ)·cos((π + acos(ω·senθ))/3), ω = Ω/Ω_c
    //    (perto do eixo, a série 1 + (4/27)·(ω·senθ)²).
    const corDaCasca = `vec3 c = mix(uCorFria, uCorQuente, ${literalGlsl(CALOR_DO_MEIO_DO_DISCO)});
          ${
            tomDaLisa <= 0
              ? ''
              : tomDaLisa >= 1
              ? `c *= ${TOM_DA_CASCA_LISA};`
              : `c *= mix(1.0, ${TOM_DA_CASCA_LISA}, ${literalGlsl(tomDaLisa)});`
          }`;
    const ach = p.achatamento;
    const eixo = p.eixoNaCena ?? [0, 1, 0];
    const kAch = ach ? ach.raioEquatorialRsol.v / ach.raioPolarRsol.v : 1;
    const omegaAch = Math.min(1, Math.sqrt((27 * (kAch - 1)) / (4 * kAch ** 3)));
    const mat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec3 vPosV;
        varying vec3 vCentroV;
        varying vec3 vDirObj;${ach ? '\n        varying vec3 vEixoV;' : ''}${
          fj
            ? `
        varying vec3 vPosObj;
        varying vec3 vCamObj;`
            : ''
        }
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vPosV = mv.xyz;
          vCentroV = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;${
            ach
              ? `
          vEixoV = normalize(mat3(modelViewMatrix) * vec3(${eixo.map((x) => literalGlsl(x)).join(', ')}));`
              : ''
          }
          vDirObj = normalize(position);${
            fj
              ? `
          vPosObj = position;
          vCamObj = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;`
              : ''
          }
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader:
        ctx.NOISE_GLSL +
        GLSL_COMPRESSAO +
        /* glsl */ `
        uniform vec3 uCorFria;
        uniform vec3 uCorQuente;
        uniform vec3 uPaleta;
        uniform vec3 uTransmitancia;
        uniform float uBrilhoDaVisita;
        uniform float uWorldFade;
        uniform float uRaio;
        uniform float uTime;
        varying vec3 vPosV;
        varying vec3 vCentroV;
        varying vec3 vDirObj;${ach ? '\n        varying vec3 vEixoV;' : ''}${
          fj
            ? `
        uniform mat3 uSunInvRot;
        varying vec3 vPosObj;
        varying vec3 vCamObj;`
            : ''
        }${gas && !fj ? '\n        uniform mat3 uSunInvRot;' : ''}${gas?.disco ? UNIFORMS_DO_DISCO + '\n        uniform float uAsaDoGas;' : ''}${gas ? GLSL_ROSA_DO_GAS : ''}
        void main() {
          vec3 d = normalize(vPosV);
          // dentro do disco a profundidade da fotosfera apaga a casca: o perfil
          // começa na borda (b ≥ 1), sem fresta entre a malha e a conta
          ${
            ach
              ? `vec3 cE = vCentroV + ${literalGlsl(kAch - 1)} * dot(vCentroV, vEixoV) * vEixoV;
          vec3 dE = d + ${literalGlsl(kAch - 1)} * dot(d, vEixoV) * vEixoV;
          float tE = dot(cE, dE) / dot(dE, dE);
          vec3 pR = tE * d - vCentroV;
          float cT = dot(pR, vEixoV) / max(length(pR), 1e-30);
          float sT = sqrt(max(1.0 - cT * cT, 0.0));
          float xR = ${literalGlsl(omegaAch)} * sT;
          float rRoche = xR > 1e-3 ? 3.0 / xR * cos((3.14159265 + acos(min(xR, 1.0))) / 3.0) : 1.0 + 0.148148 * xR * xR;
          float rElip = inversesqrt(cT * cT + sT * sT * ${literalGlsl(1 / (kAch * kAch))});
          float b = max(length(tE * dE - cE) / uRaio * rElip / rRoche, 1.0);`
              : 'float b = max(length(vCentroV - dot(vCentroV, d) * d) / uRaio, 1.0);'
          }
          ${corDaCasca}
          vec3 luz = vec3(0.0);
          ${
            rEnv > 1 && fj
              ? `
          // O GÁS EM FIAPOS (Forja): luz da estrela espalhada no gás, então
          // os fiapos são CLAROS e mais vermelhos, finos, por cima de um fundo
          // que nunca desce abaixo de 0,85 (nada escurece o céu); entortam
          // com a altura e somem antes do gás. Tudo pela direção do ponto da
          // borda sob a linha de visada, que gira com a estrela; as plumas,
          // de ordem baixa (as células do assado ali viravam estrias escuras)
          vec3 dO = normalize(vPosObj - vCamObj);
          vec3 sob = normalize(vCamObj - dot(vCamObj, dO) * dO);
          vec3 dS = uSunInvRot * sob;
          float alt = b - 1.0;
          float pl = smoothstep(0.3, 0.9, 0.5 + 0.6 * fbmLight(dS * 1.1 + vec3(3.1, 7.7, uTime * 0.004)));
          float hEsc = ${literalGlsl(rEnv - 1)}*mix(${literalGlsl(plumaMin)}, ${literalGlsl(plumaMax)}, pl);
          float fe = exp(-alt / hEsc) * (1.0 + 0.6*exp(-alt / ${literalGlsl(ESCALA_DA_CAMADA_RENTE)}))
            * (1.0 - smoothstep(0.5, 1.0, alt / ${literalGlsl(rSemGas - 1)}));
          float altN = alt / ${literalGlsl(rEnv - 1)};
          vec3 wq = dS * 6.0 + vec3(0.0, 0.0, uTime * 0.004);
          wq += 0.8 * altN * vec3(snoise(dS * 1.7 + 1.7), snoise(dS * 1.7 + 5.3), snoise(dS * 1.7 + 9.1));
          float r1 = 1.0 - abs(snoise(wq));
          float r3 = r1 * r1 * r1;
          float fil = r3 * r3 * smoothstep(0.35, 0.85, 0.5 + 0.5 * snoise(dS * 1.3 + vec3(4.4, 0.7, 2.9)));
          fil *= exp(-altN / 0.7);
          vec3 cor = mix(vec3(1.0, 0.85, 0.7), vec3(1.0, 0.6, 0.4), fil);
          luz += ${literalGlsl(1 - u)} * cor * ${literalGlsl(brilho * Math.min(1, (rEnv - 1) / EXCESSO_DA_ATMOSFERA_PLENA))} * fe * mix(0.8, 1.2, pl) * (0.85 + 2.0 * fil);`
              : rEnv > 1
              ? `
          // poucas plumas assimétricas: um ruído de ordem baixa muda a escala
          // de altura de uma direção a outra (e o brilho, junto)
          float pl = smoothstep(0.3, 0.9, 0.5 + 0.6*fbmLight(vDirObj*1.1 + vec3(3.1, 7.7, uTime*0.004)));
          float hEsc = ${literalGlsl(rEnv - 1)}*mix(${literalGlsl(plumaMin)}, ${literalGlsl(plumaMax)}, pl);
          // gás que rarefaz: exponencial na altura, o mais brilhante rente à
          // borda, com a camada rente (a MOLsphere, a ~0,1 R da fotosfera) mais
          // densa por cima; a cauda leva tudo a ZERO antes do fim da casca
          float fe = exp(-(b - 1.0) / hEsc) * (1.0 + 0.6*exp(-(b - 1.0) / ${literalGlsl(ESCALA_DA_CAMADA_RENTE)}))
            * (1.0 - smoothstep(0.5, 1.0, (b - 1.0) / ${literalGlsl(rSemGas - 1)}));
          // estrias ao longo do raio (o ruído só da direção): filamento, não caroço
          float fio = 0.8 + 0.4*fbmLight(vDirObj*5.0 + vec3(0.0, 0.0, uTime*0.01));
          luz += ${literalGlsl(1 - u)} * vec3(1.0, 0.85, 0.7) * ${literalGlsl(brilho * Math.min(1, (rEnv - 1) / EXCESSO_DA_ATMOSFERA_PLENA))} * fe * mix(0.5, 1.5, pl) * fio;`
              : ''
          }
          float veu = 0.0;
          ${
            veu > 0
              ? `
          veu = ${literalGlsl(forcaDoVeu(veu))} * (${literalGlsl(VEU_PESO_RENTE)}*exp(-(b - 1.0) / ${literalGlsl(VEU_RENTE)})
            + ${literalGlsl(VEU_PESO_ASA)}${asaDoGasGlsl}*exp(-(b - 1.0) / ${literalGlsl(VEU_ASA)}))
            * (1.0 - smoothstep(${literalGlsl(0.5 * (RAIO_DO_VEU + 1))}, ${literalGlsl(RAIO_DO_VEU)}, b));`
              : ''
          }${
            asaLonga > 0
              ? `
          veu += ${literalGlsl(forcaDoVeu(veu) * asaLonga)}${asaDoGasGlsl} * exp(-(b - 1.0) / ${literalGlsl(VEU_ASA_LONGA)})
            * (1.0 - smoothstep(${literalGlsl(0.5 * (RAIO_DO_VEU_QUENTE + 1))}, ${literalGlsl(RAIO_DO_VEU_QUENTE)}, b));`
              : ''
          }
${gas ? glslDoGas(gas, rGas, kAch) : ''}
          vec3 k = c * uPaleta * uTransmitancia * uBrilhoDaVisita;
          // o véu sobre a borda do disco como a tela a mostra (comprimida)
          vec3 borda = comprimir3(k * ${literalGlsl(1 - u)}, ${literalGlsl(BETA_DA_EMISSAO)});
          gl_FragColor = vec4((comprimir3(k * luz, ${literalGlsl(BETA_DA_EMISSAO)}) + borda * veu${tomDoVeuGlsl}${gas ? ` + ${corDoGas}` : ''}) * uWorldFade, 1.0);
        }`,
      uniforms: {
        uCorFria: ctx.corFria,
        uCorQuente: ctx.corQuente,
        uPaleta: ctx.paleta,
        uTransmitancia: su.uTransmitancia,
        uBrilhoDaVisita: this.brilhoDaVisita,
        uWorldFade: su.uWorldFade,
        uTime: su.uTime,
        uRaio: { value: p.radiusPc },
        ...(fj || gas ? { uSunInvRot: { value: ctx.sunInvRot } } : {}),
        ...(gas?.disco ? { uLuzDoDisco: this.luzDoDisco, uPisoDoGas: this.pisoDoGas, uAsaDoGas: this.asaDoGas } : {}),
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const casca = new THREE.Mesh(new THREE.SphereGeometry(DONOR_RADIUS * rCasca, 96, 48), mat);
    casca.frustumCulled = false;
    casca.renderOrder = 1;
    this.group.add(casca);
    if (gas) this.pisoDoGas.value = PISO_DO_INSTRUMENTO * (gas.vento?.pico ?? 0);
    if (gas) this.asaDoGas.value = asaComGas(gas, this.forcaDoVeuComGas, asaLonga, u, 0);
    if (gas?.disco) this.criarOGasDaFrente(ctx, gas, rGas, kAch, corDaCasca, corDoGas);
  }

  /**
   * O GÁS NA FRENTE DA ESTRELA (só o disco de gás): a casca é de trás e a
   * fotosfera a apaga sobre o disco da estrela, então a parte do disco de gás
   * que passa NA FRENTE dela — a que dá a leitura de anel em volta do corpo —
   * vai numa malha própria, uma esfera rente por fora da estrela (1,02 Re,
   * de frente: passa no teste de profundidade sobre a fotosfera e some atrás
   * de quem estiver na frente). Só onde a linha bate na estrela (o resto é
   * da casca), e só o trecho antes dela. O vento na frente do disco não é
   * desenhado: ali a linha de Hα de um vento é de absorção (perfil P Cygni).
   */
  private criarOGasDaFrente(ctx: any, gas: GasDoMotor, rGas: number, kAch: number, corDaCasca: string, corDoGas: string) {
    const p = this.params;
    const su = ctx.sunUniforms;
    const mat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec3 vPosV;
        varying vec3 vCentroV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vPosV = mv.xyz;
          vCentroV = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader:
        GLSL_COMPRESSAO +
        /* glsl */ `
        uniform vec3 uCorFria;
        uniform vec3 uCorQuente;
        uniform vec3 uPaleta;
        uniform vec3 uTransmitancia;
        uniform float uBrilhoDaVisita;
        uniform float uWorldFade;
        uniform float uRaio;
        uniform mat3 uSunInvRot;${UNIFORMS_DO_DISCO}${GLSL_ROSA_DO_GAS}
        varying vec3 vPosV;
        varying vec3 vCentroV;
        void main() {
          vec3 d = normalize(vPosV);
${glslDoGas(gas, rGas, kAch, true)}
          ${corDaCasca}
          vec3 k = c * uPaleta * uTransmitancia * uBrilhoDaVisita;
          gl_FragColor = vec4(${corDoGas} * uWorldFade, 1.0);
        }`,
      uniforms: {
        uCorFria: ctx.corFria,
        uCorQuente: ctx.corQuente,
        uPaleta: ctx.paleta,
        uTransmitancia: su.uTransmitancia,
        uBrilhoDaVisita: this.brilhoDaVisita,
        uWorldFade: su.uWorldFade,
        uRaio: { value: p.radiusPc },
        uSunInvRot: { value: ctx.sunInvRot },
        uLuzDoDisco: this.luzDoDisco,
        uPisoDoGas: this.pisoDoGas,
      },
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const frente = new THREE.Mesh(new THREE.SphereGeometry(DONOR_RADIUS * RAIO_DA_FRENTE_DO_GAS, 96, 48), mat);
    frente.frustumCulled = false;
    frente.renderOrder = 1;
    this.group.add(frente);
  }

  /**
   * O ASSADO SÓ DA CONVECÇÃO (a Forja): sem a passagem smear, as fatias dela
   * (4 a 7) não desenham e o alvo dela é o próprio alvo da convecção — um
   * alvo por conjunto, três conjuntos (a troca suave de sempre). A memória:
   * largura × largura/2 × 8 bytes (RGBA de meia precisão) × 3.
   */
  private assadoSoDaConveccao(ctx: any) {
    const u = ctx.sunUniforms;
    for (const set of ctx.bakeSets) {
      if (set.s === set.c) continue;
      // a primeira passada (`bakeChromo`) já ligou o disco ao alvo da smear:
      // religar ao da convecção ANTES de descartá-lo
      for (const k of ['uChromoTex', 'uChromoTexP']) {
        if (u[k].value === set.s.texture) u[k].value = set.c.texture;
      }
      set.s.dispose();
      set.s = set.c;
    }
    const fatia = ctx.chromo.bakeChromoSlice;
    ctx.chromo.bakeChromoSlice = (passo: number, t: number) => {
      if (passo < 4) fatia(passo, t);
    };
  }

  /**
   * As cirurgias da fotosfera de OUTRA estrela (`cirurgiaDaEstrela`,
   * `cirurgiaDaForma`), antes da primeira compilação. Sem nenhum campo
   * novo nos parâmetros (o Sol) não toca em nada.
   */
  private operarAFotosfera(ctx: any) {
    const p = this.params;
    const a = p.achatamento;
    const mat = ctx.sunMesh.material as THREE.ShaderMaterial;
    const cir = cirurgiasDaFotosfera(mat.fragmentShader, mat.vertexShader, p, this.forja);
    if (!cir) return;
    mat.fragmentShader = cir.fragment;
    mat.vertexShader = cir.vertex;
    ctx.sunUniforms.uDispScale.value *= cir.relevo;
    if (this.forja && p.escurecimento) Object.assign(mat.uniforms, this.manchaFria);
    if (a) {
      // a FORMA e a GRAVIDADE por vértice (`formaDeRoche`): o raio e a
      // normal de Roche; cor × brilho da Teff local (von Zeipel) relativos
      // à média da estrela (`teffK`, a que a matiz e o brilho de CPU já
      // usam) — interpolada por fragmento
      const geo = ctx.sunMesh.geometry as THREE.BufferGeometry;
      const pos = geo.getAttribute('position') as THREE.BufferAttribute;
      const fator = new Float32Array(pos.count * 3);
      const raio = new Float32Array(pos.count);
      const normal = new Float32Array(pos.count * 3);
      const Tm = p.teffK;
      const cm = corpoNegroUnitario(Tm);
      const rm = radianciaVisivelDeCorpoNegro(Tm);
      for (let i = 0; i < pos.count; i++) {
        const f = formaDeRoche(pos.getX(i), pos.getY(i), pos.getZ(i), a);
        const c = corpoNegroUnitario(f.teffK);
        const b = radianciaVisivelDeCorpoNegro(f.teffK) / rm;
        for (let k2 = 0; k2 < 3; k2++) {
          fator[i * 3 + k2] = (c[k2] / cm[k2]) * b;
          normal[i * 3 + k2] = f.normal[k2];
        }
        raio[i] = f.raio;
      }
      geo.setAttribute('aGravidade', new THREE.BufferAttribute(fator, 3));
      geo.setAttribute('aRaioDeRoche', new THREE.BufferAttribute(raio, 1));
      geo.setAttribute('aNormalDeRoche', new THREE.BufferAttribute(normal, 3));
    }
    mat.needsUpdate = true;
  }

  /**
   * O EIXO NA BASE DA CENA, por malha (`eixoNaCena`): o quaternion de cada
   * corpo girante é eixo × giro. Chamado no nascimento e a cada quadro.
   */
  private girarPeloEixo(ctx: any) {
    this.qGiro.setFromAxisAngle(EIXO_Y, this.giro);
    const q = ctx.sunMesh.quaternion.copy(this.qEixo!).multiply(this.qGiro);
    for (const m of [ctx.prominenceGroup, ctx.spiculeMesh, ctx.loopGroup, ...(ctx.cmePts?.meshes ?? [])]) {
      if (m) m.quaternion.copy(q);
    }
  }

  /**
   * As cirurgias de OUTRA ESTRELA nas camadas do `group` (nunca nas cenas de
   * quad — sim e bakes não têm mundo nem cor): o referencial local em todo
   * material de shader (`foraDaOrigem`), e a matiz nas camadas aditivas de cor
   * embutida (`outraCor`). As raias e o volume da coroa já bebem a cor de
   * `paletaDaCoroa` e a fotosfera da sua paleta: essas a matiz pega na CPU
   * (`update`). Absorções (blending de multiplicação) não ganham matiz.
   */
  private operarAsCamadas(ctx: any) {
    const coroa = new Set<THREE.Material>(
      [ctx.coronaRays?.material, ctx.coronaVol?.material].filter(Boolean)
    );
    const feitos = new Set<THREE.ShaderMaterial>();
    const operar = (m: THREE.ShaderMaterial) => {
      if (feitos.has(m)) return;
      feitos.add(m);
      if (this.params.foraDaOrigem) {
        m.vertexShader = cirurgiaDoReferencialLocal(m.vertexShader, true);
        m.fragmentShader = cirurgiaDoReferencialLocal(m.fragmentShader, false);
        Object.assign(m.uniforms, this.referencial);
      }
      if (
        this.outraCor &&
        m !== ctx.sunMesh.material &&
        !coroa.has(m) &&
        m.blending === THREE.AdditiveBlending
      ) {
        m.fragmentShader = cirurgiaDaMatiz(m.fragmentShader);
        m.uniforms.uMatizDaCamada = this.matizDaCamada;
      }
      m.needsUpdate = true;
    };
    const escrever = (_r: unknown, _s: unknown, camera: THREE.Camera) => this.escreverReferencialLocal(camera);
    this.group.traverse((o: any) => {
      const lista = (Array.isArray(o.material) ? o.material : [o.material]).filter(
        (m: unknown) => m instanceof THREE.ShaderMaterial
      );
      if (!lista.length) return;
      lista.forEach(operar);
      if (this.params.foraDaOrigem) {
        const antes = o.onBeforeRender;
        o.onBeforeRender = function (this: THREE.Object3D, ...a: any[]) {
          escrever(a[0], a[1], a[2]);
          antes.apply(this, a);
        };
      }
    });
    // o gêmeo da absorção que a curva troca (só um está pendurado na malha)
    for (const m of [ctx.absMat, ctx.absMatTingido]) if (m) operar(m);
  }

  /**
   * O REFERENCIAL LOCAL deste quadro, em float64: a câmera relativa ao
   * centro da estrela (c − o) e a vista com a estrela na origem. Chamado no
   * `onBeforeRender` de cada camada, com a câmera QUE VAI DESENHAR — a mesma
   * conta repetida é idempotente, e não há quadro de atraso.
   */
  private escreverReferencialLocal(camera: THREE.Camera) {
    const c = camera.matrixWorld.elements;
    const o = this.group.matrixWorld.elements;
    const dx = c[12] - o[12];
    const dy = c[13] - o[13];
    const dz = c[14] - o[14];
    const v = this.referencial.uVistaLocal.value.copy(camera.matrixWorldInverse).elements;
    v[12] = -(v[0] * dx + v[4] * dy + v[8] * dz);
    v[13] = -(v[1] * dx + v[5] * dy + v[9] * dz);
    v[14] = -(v[2] * dx + v[6] * dy + v[10] * dz);
    const inv = this.referencial.uVistaLocalInv.value.copy(camera.matrixWorld).elements;
    inv[12] = dx;
    inv[13] = dy;
    inv[14] = dz;
    this.referencial.uCameraLocal.value.set(dx, dy, dz);
  }

  /**
   * O BRILHO DE OUTRA ESTRELA na unidade da casa (a superfície do Sol = 1):
   * radiância visível(T) × exposição da visita — o mesmo produto do piloto
   * (`brilhoDe` × `uExposicao`). Entra na radiância ANTES da compressão,
   * junto com a transmitância. No Sol não existe (no-op). `kDaVisita` é o
   * mesmo produto com a exposição PLENA (a de g = 0): o nível em que a casca
   * em volta do disco é desenhada em qualquer distância (`criarABordaDifusa`).
   */
  escreverBrilho(k: number, kDaVisita: number = k) {
    const u = this.ctx.sunUniforms.uBrilhoDaEstrela;
    if (!u || !Number.isFinite(k) || k < 0) return;
    u.value = k;
    if (Number.isFinite(kDaVisita) && kDaVisita >= 0) this.brilhoDaVisita.value = kDaVisita;
  }

  // Sim + bake síncronos: põe as regiões NA FASE PEDIDA, evolui o Br na
  // direção delas e publica um retrato completo da cromosfera. Usado
  // pelo `prime` do construtor. A ORDEM importa e mudou em 21/08: as
  // cargas primeiro, senão os N passos relaxam rumo a um estado que já
  // não existe e o retrato sai meio ciclo atrasado.
  private bakeNow(simSteps: number) {
    const ctx = this.ctx;
    const prevRT = ctx.renderer.getRenderTarget();
    ctx.act.updateActiveRegions(ctx.tempoDoCiclo);
    for (let i = 0; i < simSteps; i++) ctx.gran.stepSimulation(SIM_DT);
    ctx.chromo.snapshotBakeInputs();
    for (let s = 0; s < 8; s++) ctx.chromo.bakeChromoSlice(s, ctx.elapsed);
    this.publicarRetrato();
    ctx.renderer.setRenderTarget(prevRT);
  }

  /** o passo comum a `bakeNow` e ao re-bake: o retrato novo entra INTEIRO */
  private publicarRetrato() {
    const ctx = this.ctx;
    ctx.bakePrev = ctx.bakeCur = ctx.bakeWrite;
    ctx.bakeWrite = (ctx.bakeCur + 1) % 3;
    ctx.bakeSwapT = ctx.elapsed;
    const set = ctx.bakeSets[ctx.bakeCur];
    ctx.sunUniforms.uChromoTex.value = set.s.texture;
    ctx.sunUniforms.uChromoFar.value = set.c.texture;
    ctx.sunUniforms.uChromoTexP.value = set.s.texture;
    ctx.sunUniforms.uChromoFarP.value = set.c.texture;
    ctx.sunUniforms.uBakeMix.value = 1;
    this.cicloAssado = ctx.tempoDoCiclo;
  }

  /**
   * O RE-BAKE FATIADO, um passo por quadro. É a MESMA máquina do `prime`
   * — mesma semente, MESMA CONTAGEM de passos —, só que repartida no
   * orçamento de quadro em vez de bloquear a thread. É essa igualdade
   * que faz a chegada ser bit-idêntica por qualquer caminho: nunca se
   * integra para trás; re-semeia-se e repete-se a contagem fixa.
   *
   * A SEMENTE É O PONTO. Ele só roda com o relógio visual parado, e ali
   * NADA integra a granulação — então o campo é REFEITO da semente, com
   * a contagem fixa, e a chegada é a mesma por qualquer caminho. Com o
   * relógio andando esta máquina nem acorda: quem segue a data é a
   * relaxação de sempre, 5 passos por quadro, e re-semear ali trocaria o
   * padrão de grânulos duas vezes por segundo — um strobo.
   */
  private passoDoReassar() {
    const ctx = this.ctx;
    const r = this.reassar!;
    const prevRT = ctx.renderer.getRenderTarget();
    if (r.passos === 0 && ctx.gran.seedSimulation) ctx.gran.seedSimulation();
    if (r.passos < PRIME_STEPS) {
      const ate = Math.min(PRIME_STEPS, r.passos + PASSOS_DO_REASSAR_POR_QUADRO);
      for (let i = r.passos; i < ate; i++) ctx.gran.stepSimulation(SIM_DT);
      r.passos = ate;
    } else {
      if (r.fatia === 0) ctx.chromo.snapshotBakeInputs();
      ctx.chromo.bakeChromoSlice(r.fatia, ctx.elapsed);
      r.fatia++;
      if (r.fatia >= 8) {
        this.publicarRetrato();
        this.reassar = null;
      }
    }
    ctx.renderer.setRenderTarget(prevRT);
  }

  // Estado apresentável ANTES do primeiro frame (e do t=0 das capturas):
  // semente + relaxamento LONGO do sim (o Br semeado precisa convergir
  // para as cargas fracas do mínimo — senão o disco nasce com filamentos
  // de campo que não existe) + um bake completo. Sob o véu.
  private prime(renderer: THREE.WebGLRenderer) {
    const ctx = this.ctx;
    const prev = renderer.getRenderTarget();
    if (ctx.gran.seedSimulation) ctx.gran.seedSimulation();
    this.bakeNow(PRIME_STEPS);
    // coroa volumétrica: corre a máquina de fatias até a 1ª publicação —
    // sem isto, capturas ?shot= (delta 0) nunca a veriam
    for (let i = 0; i < 220 && !ctx.cvolReady; i++) {
      if (ctx.CVOL_STEPS > 0) ctx.cvolFrame(true, 1 / 30, false);
      else break;
    }
    renderer.setRenderTarget(prev);
  }

  // (sem warmupMaterials: os quads de sim/bake compilam no prime(),
  // com RT amarrado — a variante certa; os meshes do group entram na
  // cena antes do compileAsync do director e são cobertos por ele)

  /**
   * O corpo tem um retrato COMPLETO publicado: nenhum bake fatiado a meio
   * caminho (`bakeStep < 0` — as 8 fatias publicam de uma vez, e capturar
   * no meio mostraria meia cromosfera nova sobre meia velha) e a coroa
   * volumétrica já na primeira publicação (`cvolReady`, que o `prime` roda
   * até acontecer justamente porque sob `?shot=` o delta é 0 e a máquina
   * de fatias nunca giraria).
   *
   * SOMENTE LEITURA, e isso é contrato: quem consulta é o sinal de
   * prontidão do harness de captura (`window.__director.captura`). Nenhum
   * ramo daqui escreve estado nem toca no caminho de render — se tocasse,
   * o gate de identidade estaria medindo a própria régua.
   */
  get assentado(): boolean {
    const ctx = this.ctx;
    return (
      ctx.bakeStep < 0 &&
      // o re-bake pela data conta como retrato a meio caminho: capturar
      // no meio dele fotografaria a cromosfera da data ANTERIOR
      this.reassar === null &&
      (!(ctx.CVOL_STEPS > 0) || Boolean(ctx.cvolReady))
    );
  }

  /**
   * O FILTRO SOLAR DECLARADO (F2), escrito por quadro pelo director.
   *
   * `g = 1` ⇒ a fotosfera emite a radiância VERDADEIRA; `g = 0` ⇒ a
   * paleta H-alfa autorada, o override que a Lei da Estrela §E3 declara.
   * Entre as duas pontas a descida é em STOPS (o `pow` do fragment) — o
   * porquê está escrito no cabeçalho da seção F2, junto com a conta.
   *
   * QUEM DECIDE O g É A LEI, e o director só o entrega: é o
   * `overrideExpoente` de `repartir` (`estrela.ts`), na fração do quadro
   * que o disco ocupa (`filtroPeloQuadro`) — ou, com `?solquadro=hoje`,
   * na régua de px de antes (4 a 10 px de disco). Este método não a
   * reproduz nem a adivinha — se a régua morasse aqui, a casa teria
   * duas cópias de uma lei que precisa andar em passo com a soltura do
   * clarão, e a primeira a mudar deixaria a outra para trás em silêncio.
   *
   * SEM A CIRURGIA É NO-OP SILENCIOSO, e é o contrato certo: com
   * `?bfoto=0` (ou `?bemis=0`) a cirurgia não rodou, `uFiltroSolar` não
   * existe no material, e o director — que não sabe de porta nenhuma —
   * chama isto todo quadro do mesmo jeito. Lançar aqui transformaria o
   * lado A do A/B em erro por quadro.
   *
   * A ESCRITA É CACHEADA, no precedente do `uGain` de `planetas.ts`: o g
   * fica parado em 1 na viagem inteira, e só acorda no último trecho da
   * aproximação — escrever mesmo assim sujaria o uniform 60×/s por nada.
   */
  escreverFiltroSolar(g: number, alturaPx?: number) {
    if (!this.filtroSolarLigado) return;
    // valor envenenado NÃO é escrito: `pow(2,7e10, NaN)` pinta o disco de
    // preto (ou de lixo), e o último valor são é melhor que qualquer
    // fallback inventado aqui.
    if (!Number.isFinite(g)) return;
    let v = g <= 0 ? 0 : g >= 1 ? 1 : g;
    // o fator da cirurgia foi assado na altura de referência (900 px); com
    // a altura VIVA (px de CSS, a do ponto) o expoente reescala para o
    // disco emitir o vão DELA — fator^(g·k) = vãoVivo^g. Em 900 px, k = 1
    // exato. Sem altura (`?solquadro=hoje`), a régua de referência de antes.
    if (alturaPx !== undefined) {
      const k =
        Math.log(radianciaDeTela(RADIANCIA_DA_FOTOSFERA, RAIO_DO_SOL_NA_CENA, alturaPx)) /
        Math.log(radianciaDeTela(RADIANCIA_DA_FOTOSFERA, RAIO_DO_SOL_NA_CENA));
      if (k > 0 && Number.isFinite(k)) v *= k;
    }
    if (v === this.filtroSolarAnterior) return;
    this.filtroSolarAnterior = v;
    this.ctx.sunUniforms.uFiltroSolar.value = v;
  }

  /**
   * O DISCO ATRAVÉS DO AR DA TERRA: a transmitância do raio câmera→Sol
   * (`SolNoQuadro`, por quadro). Entra na RADIÂNCIA, antes da compressão
   * da emissão — o mesmo lugar onde o ponto e o clarão a recebem, para a
   * troca disco↔ponto continuar conservando a luz. A coroa, as espículas e
   * a CME não a recebem: a 1 UA, o único lugar onde o raio pode rasar a
   * Terra, a contribuição delas em volta do Sol é < 0,1/255 (medido em
   * 08/10, escondendo-as); proeminências e laços nem desenham ali
   * (`limboFade`). Sem a cirurgia (`?bemis=0`) é no-op, como o filtro.
   */
  escreverTransmitancia(t: readonly number[]) {
    if (!this.filtroSolarLigado) return;
    if (!(t[0] >= 0 && t[1] >= 0 && t[2] >= 0)) return;
    (this.ctx.sunUniforms.uTransmitancia.value as THREE.Vector3).set(t[0], t[1], t[2]);
  }

  /**
   * O PESO DA REPRESENTAÇÃO RESOLVIDA (M1 da Lei da Estrela): quanto
   * desta malha a repartição única manda desenhar neste quadro —
   * `wResolvido·wMalha` de `repartir` (estrela.ts). Quem o calcula é o
   * director (só ele tem câmera e instrumento); o corpo só obedece, na
   * mesma divisão de trabalho de `escreverFiltroSolar`.
   *
   * Vai para `uWorldFade`, o multiplicador PÓS-compressão que o
   * vendorizado já tinha — a cessão de representação aplicada por fora,
   * na ordem que o invariante pós-curva (§5.1) exige. Envenenado não
   * escreve, pelo mesmo motivo do filtro.
   */
  escreverPesoDaLei(w: number) {
    if (!Number.isFinite(w)) return;
    this.pesoDaLei = w <= 0 ? 0 : w >= 1 ? 1 : w;
  }

  /**
   * A FASE DO CICLO, escrita por quadro pelo director a partir da DATA
   * SIMULADA (`faseDoCiclo(jdVivo)`, a lei da estrela). Mesma divisão de
   * trabalho do filtro e do peso: quem tem o relógio é o director; o
   * corpo obedece. É esta linha que faz o Sol do Atlas ter calendário.
   *
   * Escrever é BARATO e idempotente: enquanto a data não mover o
   * bastante (`LIMIAR_DE_REASSAR`), nada é re-assado.
   */
  escreverCiclo(fase: FaseDoCiclo) {
    if (!Number.isFinite(fase.fase01) || !Number.isFinite(fase.ciclo)) return;
    this.faseDoCicloViva = fase;
    const ctx = this.ctx;
    ctx.cyclePhase01 = fase.fase01;
    ctx.cycleN = fase.ciclo;
    ctx.tempoDoCiclo = tempoDoCiclo(fase);
  }

  /**
   * A FASE DO DISCO DE GÁS (`faseDoDisco`, pela data do app): quem tem o
   * relógio é o director; o corpo obedece. Sem disco, nada.
   */
  escreverDisco(fase: number) {
    const d = this.params.gas?.disco;
    if (!d || !Number.isFinite(fase)) return;
    const f = Math.min(1, Math.max(0, fase));
    this.luzDoDisco.value = d.normal * f;
    this.pisoDoGas.value = PISO_DO_INSTRUMENTO * ((this.params.gas?.vento?.pico ?? 0) + d.pico * f);
    this.asaDoGas.value = asaComGas(this.params.gas!, this.forcaDoVeuComGas, this.asaLongaComGas, this.params.bordaU ?? 0.3, f);
  }

  /**
   * A MANCHA FRIA DE UM ESCURECIMENTO pela data: quem tem o relógio e a
   * linha de visada da Terra é o director; o corpo obedece. `direcao` é o
   * lado escuro na base da cena (unitária), `corda` a borda nas imagens (raios),
   * `razaoT` a T_mancha/T_fotosfera. Valor não finito: sem mancha.
   */
  escreverManchaFria(direcao: readonly [number, number, number], corda: number, razaoT: number) {
    if (!this.params.escurecimento) return;
    const ok = [...direcao, corda, razaoT].every(Number.isFinite) && razaoT > 0;
    // nada não finito chega ao shader (um NaN + bloom branqueia a tela)
    if (ok) this.manchaFria.uManchaFria.value.set(direcao[0], direcao[1], direcao[2], corda);
    else this.manchaFria.uManchaFria.value.set(0, 0, 1, CORDA_SEM_MANCHA);
    this.manchaFria.uManchaFriaK.value = ok ? razaoT : 1;
    // o programa com a mancha só dentro da janela (`MANCHA_FRIA`): trocar
    // recompila uma vez por variante (o three guarda as duas)
    const ligada = ok && razaoT !== 1 && corda < BORDA_FORA_DO_DISCO;
    const mesh = this.ctx?.sunMesh as THREE.Mesh | undefined;
    if (!mesh) return;
    // o lado escuro no referencial do ASSADO: o do objeto (sem o giro da
    // malha), com o x trocado — a esfera do three põe x = −cos(lon), o
    // assado x = +cos(lon)
    const a = this.manchaFria.uManchaFriaAssado.value;
    if (ligada) {
      const d = this.dManchaTmp.set(direcao[0], direcao[1], direcao[2]).applyQuaternion(mesh.getWorldQuaternion(this.qManchaTmp).invert());
      a.set(-d.x, d.y, d.z, corda);
    } else a.set(0, 0, 1, CORDA_SEM_MANCHA);
    // com o relógio parado o assado só se refaz a pedido: a região andou o bastante, re-assar
    if (
      Math.abs(a.x - this.manchaAssada.x) + Math.abs(a.y - this.manchaAssada.y) + Math.abs(a.z - this.manchaAssada.z) +
        Math.abs(a.w - this.manchaAssada.w) >
      0.01
    ) {
      this.assadoDaManchaSujo = true;
    }
    for (const mat of [mesh.material as THREE.ShaderMaterial, this.assadoComManchaFria]) {
      if (!mat || ligada === Boolean(mat.defines && 'MANCHA_FRIA' in mat.defines)) continue;
      mat.defines ??= {};
      if (ligada) mat.defines.MANCHA_FRIA = 1;
      else delete mat.defines.MANCHA_FRIA;
      mat.needsUpdate = true;
    }
  }

  /**
   * O RELÓGIO DO GIRO: a data do filme em cartaz, ou null fora dele.
   * Mesma divisão de trabalho do ciclo — quem tem o relógio é o director;
   * o corpo obedece (`anguloDoGiro`).
   */
  escreverRelogioDeCena(jd: number | null) {
    this.jdDaCena = jd !== null && Number.isFinite(jd) ? jd : null;
  }

  /**
   * O LAPSO DO RELÓGIO (item 17). `taxa` é quantos segundos de céu andam
   * por segundo de relógio; ela vira `LAPSE_K` na unidade do núcleo
   * doador (0..1 ↔ multiplicador 1..40 de `sol/cycle.js`, invertendo
   * `cycleMultiplierFor`). É o único interruptor das rampas largas do
   * bloco C de `sol/activity.js` — sem ele o nascimento e a morte de
   * plage/faculae viram pop no limbo assim que o relógio do Atlas
   * acelera. Taxa 1 (relógio parado, ao vivo, filme, foto) devolve 0 e o
   * Sol é o de sempre, bit a bit.
   */
  escreverLapso(taxa: number) {
    if (!Number.isFinite(taxa)) return;
    const lapso = ((Math.max(1, taxa) - 1) / 39) ** 2;
    this.ctx.LAPSE_K = lapso >= 1 ? 1 : lapso;
  }

  /**
   * A DOSE DE OCUPAÇÃO da dramaturgia (`director/doseDoSol.ts`): quanto
   * da atividade DAQUELA data aparece. 1 = tudo, e é o valor fora do
   * filme. Ela multiplica a ocupação e não encosta em fase, banda de
   * Spörer, Hale ou dipolo polar — atenuação de QUANTO, nunca invenção
   * de QUANDO.
   */
  escreverDose(d: number) {
    if (!Number.isFinite(d)) return;
    this.ctx.doseDoSol = d <= 0 ? 0 : d >= 1 ? 1 : d;
  }

  /**
   * O ESTADO LÓGICO desta instância, na forma do contrato da Lei
   * (`EstadoDaEstrela`, estrela.ts §3): o corpo declara O QUE ELE É; a
   * observação (quem olha) e o instrumento (a casa) são do director.
   *
   * OS TRÊS CAMPOS DO §5.18 SÃO FACES DESTE ESTADO, e a nomeação é esta:
   *   S(n, t) — a superfície: granulação, manchas, faculae
   *             (`sol/granulation.js`, `sol/activity.js`, `sol/sun.js`);
   *   C(n, h, t) — a cromosfera: casca fina + espículas
   *             (`sol/chromo.js`, `sol/spicules.js`);
   *   E(x, t) — o exterior: coroa, proeminências, loops, flares, CME
   *             (`sol/corona*.js`, `sol/prominences.js`, `sol/loops.js`,
   *             `sol/flares.js`, `sol/cme.js`).
   * Cada estrutura de E tem critério de visibilidade PRÓPRIO — escala
   * projetada e contraste (o `limboFade` deste arquivo, o cone da coroa
   * que desliga abaixo de um texel) — nunca o LOD do renderer.
   *
   * A FASE é a do ciclo VIVO e ela é a da DATA SIMULADA — não há mais
   * inversa de fórmula nenhuma a fazer, porque não há mais acumulador
   * (item 5, 21/08). O §5.20 fica satisfeito pelo caminho mais forte que
   * existe: a fase não "persiste", ela é RECALCULÁVEL — sair de quadro,
   * voltar, recarregar ou trocar de tier devolvem o mesmo Sol porque
   * todos leem o mesmo calendário.
   */
  estadoDaLei(): EstadoDaEstrela {
    const p = this.params;
    return {
      id: p.nome,
      semente: p.seed,
      posicaoPc: [0, 0, 0],
      raioPc: p.radiusPc,
      teffK: p.teffK,
      tempo: this.ctx.elapsed,
      fase: this.faseDoCicloViva.fase01,
      rotacao: {
        periodo: p.rotPeriodDays * 86400,
        eixo: [Math.sin(p.tiltRad), Math.cos(p.tiltRad), 0],
      },
      atividade: { nivel: p.activityLevel },
    };
  }

  /** relógio visual do director (0 sob ?shot=) + câmera */
  update(time: number, camera: THREE.PerspectiveCamera) {
    const ctx = this.ctx;
    ctx.camera = camera;
    const delta = this.lastTime < 0 ? 0 : Math.min(Math.max(time - this.lastTime, 0), 0.1);
    this.lastTime = time;

    // (o relógio RÁPIDO — `ctx.elapsed` — só anda DEPOIS do retorno de
    // invisibilidade, umas linhas abaixo. Item 16: até 21/08 ele era
    // somado aqui, fora de quadro, e o Sol reaparecia com um salto de
    // tudo o que "viveu" enquanto ninguém o via.)

    // câmera em unidades de doador, corrigida por fov: o LOD do disco
    // de lá foi calibrado a fov 42° — mesmo enquadramento, mesmo LOD
    const fovCorr =
      Math.tan((camera.fov * Math.PI) / 360) / DONOR_HALF_FOV;
    // relativa ao CENTRO desta estrela (o group mora na raiz da cena ou num
    // grupo sem transformação); no Sol a posição é zero e x − 0 é x
    this.camRel.copy(camera.position).sub(this.group.position);
    ctx.camDist = (this.camRel.length() / this.scale) * fovCorr;
    ctx.sunUniforms.uCamDist.value = ctx.camDist;
    this.camDirN.copy(this.camRel).normalize();
    ctx.camDirN = this.camDirN;

    // Fade das camadas de LIMBO além do regime do doador: o zoom de lá
    // parava em ~14 R e a dose proeminência+bloom nunca foi calibrada
    // para vista afastada (viravam bolas de bloom no recuo da hélice).
    // Fisicamente proeminências/loops somem a distâncias estelares.
    const fk = (ctx.camDist - 35) / 25;
    this.limboFade = fk <= 0 ? 1 : fk >= 1 ? 0 : 1 - fk * fk * (3 - 2 * fk);
    if (!this.semDinamo) {
      ctx.prominenceGroup.visible = this.limboFade > 0.01;
      ctx.loopGroup.visible = this.limboFade > 0.01;
    }

    // O PESO DA LEI (M1). `uWorldFade` — que a F3 deixou em 1 SEMPRE por
    // ausência de lei — voltou a ter dono: é o peso da representação
    // RESOLVIDA na repartição única (`wResolvido·wMalha`, estrela.ts),
    // escrito pelo director por quadro via `escreverPesoDaLei`. É o que
    // faz a malha ENTRAR DO ZERO enquanto o Sol-ponto cede na mesma
    // medida (aCede = wResolvido na camada dos dez): a soma dos pesos é
    // 1 por construção, e o armar binário do gate do palco (4 px) fica
    // invisível em pixel — no instante em que o grupo liga, o peso ainda
    // é 0. A ORDEM não mudou: a compressão vem antes do fade, porque o
    // invariante da troca é cobrado PÓS-curva (§5.1 da Lei) e o joelho
    // não pode andar durante a transição.
    ctx.sunUniforms.uWorldFade.value = this.pesoDaLei;
    this.pesoDasCamadas.value = this.pesoDaLei;
    if (!this.semDinamo) {
      ctx.spiculeUniforms.uWorldFade.value = this.pesoDaLei;
      ctx.coronaRaysUniforms.uRayBoost.value = this.kn.ray;
      ctx.coronaRaysUniforms.uHalo.value = this.kn.halo;
    }
    // R1b: a calibração de arte pela curva viva do renderer (`SOL_FORA_DO_ACES`)
    const tom = ctx.renderer.toneMapping;
    ctx.paleta.value.copy(porCurva(tom, SOL_NO_ACES.ganho, SOL_FORA_DO_ACES.paleta));
    ctx.corFria.value.copy(porCurva(tom, SOL_NO_ACES.corFria, SOL_FORA_DO_ACES.corFria));
    ctx.corQuente.value.copy(porCurva(tom, SOL_NO_ACES.corQuente, SOL_FORA_DO_ACES.corQuente));
    ctx.corDoLimbo.value.copy(porCurva(tom, SOL_NO_ACES.limbo, SOL_FORA_DO_ACES.limbo));
    ctx.paletaDaCoroa.value.copy(porCurva(tom, SOL_NO_ACES.ganho, SOL_FORA_DO_ACES.coroa));
    if (!this.semDinamo) {
      ctx.absMesh.material = porCurva(tom, ctx.absMat, ctx.absMatTingido);
      ctx.coronaOuter.material.color
        .copy(porCurva(tom, SOL_NO_ACES.coroaExterna, SOL_FORA_DO_ACES.coroaExterna))
        .multiplyScalar(this.pesoDaLei);
    }
    if (this.outraCor) this.matizarPelaTemperatura(ctx);
    if (!this.group.visible) return;

    // O RELÓGIO RÁPIDO, aqui e não lá em cima (item 16): corpo fora de
    // quadro não envelhece. Antes deste ponto ficam só as leituras de
    // câmera e os uniforms que o ponto do Sol ainda consome; daqui para
    // baixo é tudo trabalho de corpo em quadro.
    ctx.elapsed += delta;
    ctx.sunUniforms.uTime.value = ctx.elapsed;

    // --- o retrato SEGUE A DATA (item 5) ------------------------------
    // COALESCER É DEIXAR POUSAR. Um re-bake em curso NUNCA se reinicia:
    // reiniciá-lo a cada vez que a data passa do limiar parece "seguir a
    // fase mais de perto" e é o contrário — MEDIDO no degrau de 115,7
    // dias/s, com a data andando ~6 unidades por quadro contra um limiar
    // de 7,2, a máquina reiniciava a cada quadro e o retrato NUNCA
    // publicava. Deixando pousar, ele pousa e a data seguinte dispara o
    // próximo.
    //
    // TRÊS GUARDAS, e cada uma tem uma razão escrita: `delta === 0`
    // porque com o relógio andando quem segue a data é o bake de 8 Hz de
    // sempre, e as duas máquinas escrevem no MESMO alvo; `bakeStep < 0`
    // porque um bake estrutural a meio caminho não pode ser atropelado;
    // e o lugar — depois do retorno de invisibilidade — porque re-assar
    // um Sol que ninguém vê é gastar quadro à toa, e quando ele voltar a
    // ser corpo a comparação dispara sozinha.
    if (
      this.reassar === null &&
      delta === 0 &&
      ctx.bakeStep < 0 &&
      Math.abs(ctx.tempoDoCiclo - this.cicloAssado) > LIMIAR_DE_REASSAR
    ) {
      this.reassar = { passos: 0, fatia: 0 };
    }
    // a região fria de um escurecimento entrou no assado (`uManchaFriaAssado`):
    // com o relógio parado, re-assar uma vez (andando, o de 8 Hz a pega)
    if (this.assadoDaManchaSujo && ctx.bakeStep < 0 && this.reassar === null) {
      this.assadoDaManchaSujo = false;
      this.manchaAssada.copy(this.manchaFria.uManchaFriaAssado.value);
      if (delta === 0) this.reassar = { passos: 0, fatia: 0 };
    }

    // --- simulação de convecção, fatiada (guard-5 + dreno, como lá) ---
    this.simAccum += delta;
    let guard = 0;
    while (this.simAccum >= ctx.TP.simStep && guard < 5) {
      this.simAccum -= ctx.TP.simStep;
      ctx.gran.stepSimulation(SIM_DT);
      guard++;
    }
    if (this.simAccum > ctx.TP.simStep) this.simAccum = ctx.TP.simStep;

    // --- bake estrutural ~8 Hz, 8 fatias, publicação com crossfade ---
    this.chromoAccum += delta;
    if (ctx.bakeStep < 0 && this.chromoAccum >= 0.12 && delta > 0 && this.reassar === null) {
      this.chromoAccum = 0;
      ctx.bakeStep = 0;
      ctx.bakeTime = ctx.elapsed;
      ctx.chromo.snapshotBakeInputs();
    }
    if (ctx.bakeStep >= 0) {
      ctx.chromo.bakeChromoSlice(ctx.bakeStep, ctx.bakeTime);
      ctx.bakeStep++;
      if (ctx.bakeStep >= 8) {
        ctx.bakeStep = -1;
        ctx.bakePrev = ctx.bakeCur;
        ctx.bakeCur = ctx.bakeWrite;
        ctx.bakeWrite = ctx.bakeCur === ctx.bakePrev ? (ctx.bakeCur + 1) % 3 : 3 - ctx.bakeCur - ctx.bakePrev;
        ctx.bakeCycleDt = Math.max(0.05, Math.min(4.5, (ctx.elapsed - ctx.bakeSwapT) * 0.85));
        ctx.bakeSwapT = ctx.elapsed;
        // o retrato de 8 Hz também é um retrato DA DATA: anotá-lo aqui é
        // o que faz parar o relógio não disparar um catch-up para uma
        // fase que já está na tela
        this.cicloAssado = ctx.tempoDoCiclo;
        ctx.sunUniforms.uChromoTex.value = ctx.bakeSets[ctx.bakeCur].s.texture;
        ctx.sunUniforms.uChromoFar.value = ctx.bakeSets[ctx.bakeCur].c.texture;
        ctx.sunUniforms.uChromoTexP.value = ctx.bakeSets[ctx.bakePrev].s.texture;
        ctx.sunUniforms.uChromoFarP.value = ctx.bakeSets[ctx.bakePrev].c.texture;
      }
    }
    ctx.sunUniforms.uBakeMix.value = Math.min(1, (ctx.elapsed - ctx.bakeSwapT) / ctx.bakeCycleDt);

    // --- rotação + inversa compartilhada (tilt+spin) ---
    if (this.qEixo) {
      // eixo na base da cena (`eixoNaCena`): o mesmo giro, por quaternion
      this.giro = anguloDoGiro(this.giro, this.rotSpeed, delta, this.jdDaCena, this.params.rotPeriodDays);
      this.girarPeloEixo(ctx);
    } else {
      ctx.sunMesh.rotation.y = anguloDoGiro(
        ctx.sunMesh.rotation.y,
        this.rotSpeed,
        delta,
        this.jdDaCena,
        this.params.rotPeriodDays
      );
      if (!this.semDinamo) {
        ctx.prominenceGroup.rotation.y = ctx.sunMesh.rotation.y;
        ctx.spiculeMesh.rotation.y = ctx.sunMesh.rotation.y;
        ctx.loopGroup.rotation.y = ctx.sunMesh.rotation.y;
      }
    }
    this.sunRotM4.makeRotationFromQuaternion(ctx.sunMesh.quaternion);
    ctx.sunInvRot.setFromMatrix4(this.sunRotM4).transpose();
    if (!this.semDinamo) ctx.spiculeUniforms.uTime.value = ctx.elapsed;

    // --- ciclo de 11 anos + regiões ativas ---------------------------
    // O relógio LENTO é a data e chega escrito (`escreverCiclo`): não há
    // o que integrar aqui, e é por isso que ele anda para trás de graça.
    // A dramaturgia por torção de fase morreu — o filme atenua OCUPAÇÃO
    // (`escreverDose`), nunca a fase.
    // (sem dínamo não há ciclo: as cargas ficam no zero do nascimento)
    if (!this.semDinamo) {
      if (ctx.act.cycleDepth() > 0.001) ctx.act.updateCycleState();
      else if (ctx.solarMaxK !== 0) ctx.solarMaxK = 0;
    }
    ctx.sunUniforms.uMaxK.value = ctx.solarMaxK;
    ctx.act.updateActiveRegions(ctx.tempoDoCiclo);
    if (this.reassar !== null) this.passoDoReassar();
    // daqui para baixo é a atmosfera magnética — sem dínamo ela não nasceu
    if (this.semDinamo) return;

    // --- flare de superfície (duas fases; sem CME na fase 1) ---
    if (delta > 0) {
      ctx.surfFlareCooldown -= delta;
      if (ctx.surfFlareCooldown <= 0) {
        if (ctx.triggerSurfaceFlare()) {
          ctx.surfFlareT = 0;
          // flare grande pode soltar CME (sorteio no stream próprio)
          ctx.maybeLaunchCME();
        }
        ctx.surfFlareCooldown =
          (12 + ctx.srand() * 14) / (0.5 + 1.1 * ctx.coronaRaysUniforms.uActivity.value);
        // a frequência DA ESTRELA pela atividade (no Sol, pulado)
        if (this.taxaDeErupcoes !== 1) ctx.surfFlareCooldown /= Math.max(this.taxaDeErupcoes, 1e-3);
      }
      ctx.surfFlareT += delta;
    }
    const sfImp = ctx.flareEnvImp(ctx.surfFlareT);
    const sfGrad = ctx.flareEnvGrad(ctx.surfFlareT);
    let sfEnv = sfImp * 1.7 * ctx.surfFlareAmp;
    let sfRib = (0.45 * sfImp + 0.85 * sfGrad) * 1.7 * ctx.surfFlareAmp;
    if (sfEnv < 0.004) sfEnv = 0;
    if (sfRib < 0.004) sfRib = 0;
    const sfSep = 0.018 + 0.05 * (1.0 - Math.exp(-ctx.surfFlareT * 0.45));
    const sfLen = 0.055 + 0.04 * (1.0 - Math.exp(-ctx.surfFlareT * 0.45));
    ctx.sunUniforms.uFlare.value.set(ctx.surfFlareDir.x, ctx.surfFlareDir.y, ctx.surfFlareDir.z, sfEnv);
    ctx.sunUniforms.uFlareGeo.value.set(ctx.flareTanDir.x, ctx.flareTanDir.y, ctx.flareTanDir.z, sfSep);
    ctx.sunUniforms.uFlarePerp.value.set(ctx.flarePerpDir.x, ctx.flarePerpDir.y, ctx.flarePerpDir.z, sfLen);
    ctx.sunUniforms.uFlareRib.value.set(
      sfRib, 0.01, ctx.flareSeedVal,
      Math.min(2.6, Math.max(1.0, ctx.fitDist / ctx.camDist))
    );

    // --- loops coronais + arcada pós-flare ---
    ctx.updateLoops(delta);

    // --- CME: relógio, casca e partículas (episódico; custo ~zero fora) ---
    if (ctx.cmePts?.on && !this.qEixo) {
      ctx.cmePts.meshes[0].rotation.y = ctx.sunMesh.rotation.y;
      ctx.cmePts.meshes[1].rotation.y = ctx.sunMesh.rotation.y;
    }
    ctx.updateCME(delta);

    // --- proeminências: ciclo de vida, campo, agitação, orientação ---
    ctx.promStates.forEach((ps: any) => {
      const lx = ((ctx.elapsed + ps.phase) % ps.period) / ps.period;
      ps.env = ctx.act.lifeEnvelope(lx);
      if (lx >= 0.9) {
        if (!ps.reborn) {
          ctx.placeProminence(ps, ctx.sampleProminenceAnchor());
          ps.reborn = true;
        }
      } else ps.reborn = false;
      const Bm = ctx.act.bFieldJS(ps.meshes[0].userData.dir).length();
      const fieldK = Math.min(1.2, 0.35 + 0.65 * (Bm / 1.1));
      // A RESPOSTA DA PROEMINÊNCIA AO CAMPO segue o campo com atraso —
      // e com o relógio PARADO ela SNAPA nele, em vez de ficar travada
      // no último valor que viu andando. Sem esta linha o filtro virava
      // um latch: uma captura (`?shot=`) mostrava proeminências
      // respondendo às cargas de um instante ANTERIOR, e entrar no Atlas
      // por t=10 ou por t=100 dava dois Sóis mesmo com todo o resto
      // idêntico — foi este o último resíduo de caminho que o item 5
      // encontrou, e ele estava aqui desde sempre. É a mesma doutrina do
      // catch-up de salto: com o relógio parado, o Sol vive o salto na
      // hora.
      const seguirOCampo = delta > 0 ? Math.min(1, delta * 0.8) : 1;
      ps.fieldK = ps.fieldK === undefined ? fieldK : ps.fieldK + (fieldK - ps.fieldK) * seguirOCampo;
      ps.agitT = ps.agitT === undefined ? 999 : ps.agitT + delta;
      ps.agit = (1.0 - Math.exp(-ps.agitT * 3.0)) * Math.exp(-ps.agitT * 0.55);
      if (ps.agit < 0.004) ps.agit = 0;
      ps.drift = (ps.drift || 0) + delta * (1.0 + 4.0 * ps.agit);
      if (!ps.orient) ps.orient = [0, 0];
      for (let oi = 0; oi < 2; oi++) {
        ps.meshes[oi].getWorldDirection(this.promNormal);
        const nv = Math.abs(this.promNormal.dot(this.camDirN));
        const ek = Math.min(1, Math.max(0, (nv - 0.03) / 0.13));
        ps.orient[oi] = (1.0 - 0.5 * nv) * ek * ek * (3 - 2 * ek);
      }
      ps.orientNorm = 1.05 / Math.max(0.45, ps.orient[0] + ps.orient[1]);
      if (ctx.FPROM_K > 0.001) {
        ps.flat.visible = true;
        const facingF = this.promWorldTmp
          .copy(ps.flat.userData.dir)
          .applyQuaternion(ctx.prominenceGroup.quaternion)
          .dot(this.camDirN);
        let sF = Math.min(1, Math.max(0, (facingF - 0.1) / 0.42));
        sF = sF * sF * (3.0 - 2.0 * sF);
        const fu = ps.flat.material.uniforms;
        fu.uLife.value = ps.env;
        fu.uAgit.value = ps.agit;
        fu.uPTime.value = ps.drift;
        fu.uTime.value = ctx.elapsed;
        fu.uAbsorb.value =
          Math.min(1.0, ctx.FPROM_K) * 0.45 * sF * Math.min(1.0, ps.fieldK) * this.limboFade;
      } else if (ps.flat.visible) ps.flat.visible = false;
    });
    ctx.prominenceMeshes.forEach((m: any) => {
      const ps = m.userData.state;
      m.material.uniforms.uLife.value = ps.env;
      m.material.uniforms.uAgit.value = ps.agit;
      m.material.uniforms.uPTime.value = ps.drift;
      const famp = 0.16 + 0.14 * ps.fieldK + 0.45 * ps.agit;
      const f = 0.65 + famp * ctx.act.flicker1f(ctx.elapsed * m.userData.speed + m.userData.phase);
      let base = Math.max(0.55, Math.min(1.15, f + 0.2));
      base *= 0.3 + 0.7 * ps.env;
      base *= ps.fieldK;
      base += 1.6 * ps.agit;
      const facing = this.promWorldTmp
        .copy(m.userData.dir)
        .applyQuaternion(ctx.prominenceGroup.quaternion)
        .dot(this.camDirN);
      let s = Math.min(1, Math.max(0, (facing - 0.1) / 0.42));
      s = s * s * (3.0 - 2.0 * s);
      base *= 0.05 + 0.95 * (1.0 - s);
      base *= ps.orient[m.userData.twinIdx] * ps.orientNorm;
      m.material.uniforms.uIntensity.value = base * this.limboFade;
      m.material.uniforms.uTime.value = ctx.elapsed;
    });
    ctx.flushProminences();

    // --- coroa (plano de raias): billboard + atividade global ---
    ctx.coronaRays.quaternion.copy(camera.quaternion);
    ctx.coronaRaysUniforms.uTime.value = ctx.elapsed;
    this.camRightTmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.camUpTmp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    ctx.coronaRaysUniforms.uRight.value.copy(this.camRightTmp);
    ctx.coronaRaysUniforms.uUp.value.copy(this.camUpTmp);
    let actSum = 0;
    for (let ai = 0; ai < ctx.pairStates.length; ai++) actSum += Math.abs(ctx.pairStates[ai].lead.w);
    ctx.coronaRaysUniforms.uActivity.value = Math.min(1.0, actSum / 4.0);

    // --- coroa volumétrica: uniforms + scheduler fatiado do sampler3D ---
    if (ctx.CVOL_STEPS > 0) {
      const cvolOn = ctx.CVOL_K > 0.001 && !ctx.cvolKilled;
      const cvolShow = cvolOn && ctx.cvolReady;
      ctx.coronaVol.visible = cvolShow;
      ctx.coronaRaysUniforms.uCvolMix.value = cvolShow ? Math.min(1.0, ctx.CVOL_K) : 0.0;
      if (cvolShow) {
        ctx.coronaVol.quaternion.copy(camera.quaternion);
        ctx.cvolUniforms.uCvol.value = ctx.CVOL_K;
        ctx.cvolUniforms.uActivity.value = ctx.coronaRaysUniforms.uActivity.value;
        // rotação PURA (matrixWorld herdaria a escala do group)
        ctx.cvolInvRot.copy(ctx.sunInvRot);
      }
      ctx.cvolFrame(cvolOn, delta, false);
    }

    // --- a coroa por ângulo (rodada do peso): o padrão angular das raias
    // e do volume, uma vez por quadro, DEPOIS de todo uniform da coroa
    // deste quadro (tempo, base da câmera, giro, cargas, atividade) ---
    ctx.coronaPorAngulo.desenhar();
  }

  /**
   * A COR DE OUTRA ESTRELA, sobre a receita do Sol recém-copiada (por curva):
   * as pontas da rampa da fotosfera e o fio do limbo levados a T DEPOIS do
   * ganho `paleta` (C' = pelaT(C⊙P)⊘P, que é como o piloto a aplica);
   * a coroa (raias, volume e sprite: luz da fotosfera espalhada, Thomson) pela
   * matiz da própria cor; as camadas H-alfa de cor embutida (espículas,
   * proeminências, laços, CME) pela matiz do limbo.
   */
  private matizarPelaTemperatura(ctx: any) {
    const T = this.params.teffK;
    const P = ctx.paleta.value as THREE.Vector3;
    for (const u of [ctx.corFria, ctx.corQuente, ctx.corDoLimbo]) {
      const C = u.value as THREE.Vector3;
      pelaTemperatura(this.corTmp.copy(C).multiply(P), T, this.corTmp);
      C.set(this.corTmp.x / P.x, this.corTmp.y / P.y, this.corTmp.z / P.z);
    }
    const Pc = ctx.paletaDaCoroa.value as THREE.Vector3;
    Pc.multiply(matizDe(Pc, T, this.matizTmp));
    if (this.semDinamo) return;
    const sprite = ctx.coronaOuter.material.color as THREE.Color;
    matizDe(this.corTmp.set(sprite.r, sprite.g, sprite.b), T, this.matizTmp);
    sprite.setRGB(sprite.r * this.matizTmp.x, sprite.g * this.matizTmp.y, sprite.b * this.matizTmp.z);
    // o limbo ANTES da matiz (a receita do Sol, pela curva viva) × o ganho
    const tom = ctx.renderer.toneMapping;
    this.corTmp.copy(porCurva(tom, SOL_NO_ACES.limbo, SOL_FORA_DO_ACES.limbo)).multiply(P);
    matizDe(this.corTmp, T, this.matizDaCamada.value);
  }

  dispose() {
    const ctx = this.ctx;
    // As proeminências são Object3D-PROXY com `material = { uniforms }`
    // (prominences.js): objeto simples, SEM dispose. Chamar dispose() em
    // qualquer material truthy estourava aqui e abortava todo o teardown
    // — inclusive os RTs abaixo e o Engine (ver director.dispose).
    const free = (x: any) => x?.dispose?.();
    this.group.traverse((o: any) => {
      free(o.geometry);
      const m = o.material;
      if (Array.isArray(m)) m.forEach(free);
      else free(m);
    });
    for (const rt of ctx.simRTs ?? []) rt.dispose();
    for (const set of ctx.bakeSets ?? []) {
      set.c?.dispose?.();
      // na Forja o alvo da smear é o próprio da convecção: um descarte só
      if (set.s !== set.c) set.s?.dispose?.();
    }
    // OS DOIS RTs QUE NÃO ESTAVAM EM LISTA NENHUMA: o do PIL (readback do
    // Br para as âncoras de proeminência) e o snapshot do sim que a
    // cromosfera assa. Nasceram privados dentro dos vendorizados; a troca
    // de tier ao vivo (Ajustes C) transformou "um por aba" em "um por
    // clique", e eles se publicam no ctx desde então (ver os comentários
    // `transplante:` em pil.js e chromo.js).
    free(ctx.pilRT);
    free(ctx.bakeSimRT);
    // os dois materiais da absorção (R1b): só um está pendurado na malha
    free(ctx.absMat);
    free(ctx.absMatTingido);
    // as cenas de quad vivem fora do `group` — só esta lista as alcança
    for (const g of this.geoDosQuads) g.dispose();
    this.geoDosQuads.length = 0;
    // Data3DTexture da coroa volumétrica: material.dispose() NÃO dispõe
    // texturas, e esta não pertence a nenhum material do traverse.
    free(ctx.cvolTex);
    // a faixa da coroa por ângulo: alvo e material vivem fora do `group`
    free(ctx.coronaPorAngulo?.rt);
    free(ctx.coronaPorAngulo?.material);
  }
}
