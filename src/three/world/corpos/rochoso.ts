// ============================================================
// OS ROCHOSOS RESOLVIDOS (Onda 6, F3+F5) — Mercúrio, Vênus, Marte,
// Fobos, Deimos e as ~17 luas texturadas sob a MESMA lei da Terra e
// da Lua: uma classe genérica parametrizada por corpo, nascida do
// molde da Lua (lua.ts) com os dois ramos de BRDF que a fase pede.
//
// PROVENIÊNCIA: implementação NOVA, como as irmãs. Do doador
// atravessam como ESPEC: a lista dos 7 opt-in de Lommel-Seeliger
// (correção de fato 1 do desenho — aqui só Mercúrio é regolito;
// Vênus, Marte, Fobos e Deimos ficam na Lambert estática do
// doador) e a regra "planeta Lambertiano com textura real".
//
// AS QUATRO LEIS de terra.ts/lua.ts valem palavra por palavra
// (escalar único de luz, relógio do Director, orientação IAU
// medida, carga preguiçosa). O que muda por corpo é DADO:
//
//   - BRDF: 'ls' (Mercúrio + os 5 opt-in da F5 + os 4 da F7 —
//     Vesta, Palas, Hígia, Haumea; o C = 4/3 DERIVADO por
//     quadratura da Lua, importado de lua.ts, nunca redigitado)
//     ou 'lambert'.
//   - FIGURA: esfera ou elipsoide triaxial por BODY_AXES — a
//     escala anisotrópica mora na matriz, como o achatamento da
//     Terra. A NORMAL do elipsoide aqui é o gradiente EXATO
//     (x/a², y/c², z/b²): a aproximação de primeiro grau da Terra
//     (a/c em vez de a²/c²) erra 0,3% no achatamento terrestre,
//     mas em Fobos (a/c = 1,43) seria uma mentira geométrica.
//   - POSIÇÃO: os três planetas têm retrato congelado (o "sem
//     rede" honesto da Terra); Fobos e Deimos, como a Lua, só
//     nascem com a efeméride viva (Kepler composto com Marte —
//     a cadeia de posicaoHeliocentrica).
//   - CESSÃO: os três planetas têm ponto fotométrico na camada
//     (IDS_FOTOMETRIA) e cedem pela régua do disco, pela MESMA
//     `cessaoAlvo` da Terra; Fobos e Deimos, como a Lua, nascem
//     mesh↔nada aos 4 px do gate (pendência MH18, Onda 7).
//   - ECLIPSE: Fobos e Deimos ganharam o par na TABELA da lib
//     (data-only, F3) — a sombra de Marte. Os três planetas não
//     têm par: o fator fica neutro por construção da lib.
//
// VÊNUS É O TOPO DE NUVENS: o mapa é o 4k_venus_atmosphere (o que
// se vê do espaço). A superfície de radar NÃO entra — uma casca
// translúcida sobre ela fingiria enxergar através de 20 km de
// nuvem. A super-rotação das nuvens (4 dias) NÃO é modelada: o
// doador aplicava o 1,03 da Terra a qualquer casca, número sem
// fonte para Vênus — pendência declarada, textura gira com o W
// sólido IAU (retrógrado, que o kernel já carrega).
// ============================================================
import * as THREE from 'three';
import { CAMADA_DOS_OCULTADORES, relevoNoFantasma } from '../../core/post';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import {
  AU_PARA_PC,
  eclipticaParaEquatorial,
} from '../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import type { PoliticaDeLuz } from '../../../lib/atlas/luz';
import {
  GLSL_LUZ_DA_VISITA,
  escreverLuzDaVisita,
  ganhoDoGlobo,
  uniformsDaLuzDaVisita,
} from '../../../lib/atlas/luzDaVisita';
import {
  GLSL_SOMBRA_ECLIPSE,
  PARES_DE_ECLIPSE,
  criaSombraNaCena,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import type { FonteDeEfemerides } from '../planetas/planetas';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { RAMP_DURATION_MS, stepRampToward } from '../lodStellar';
import {
  GLSL_ALTURA_DO_ALBEDO,
  GLSL_BUMP_DO_ALBEDO,
  GLSL_GRAO_DO_CLOSE,
  GLSL_NORMAL_DO_MAPA,
  GLSL_RUIDO_DE_VALOR,
  GLSL_SOMBRA_DO_HORIZONTE,
  diametroAparentePx,
  escalaDoBumpDoAlbedo,
} from './corpos';
import { LS_NORMALIZACAO_GLSL } from './lua';
import { LIMIAR_DO_GATE_PX, cessaoAlvo, gateBinario, saltoGuardado } from './terra';
import {
  CANAL_ALTURA,
  CANAL_HORIZONTE,
  CANAL_HORIZONTE2,
  CANAL_MAP,
  CANAL_NORMAL,
  type Seguradores,
  TexturasDoCorpo,
} from './texturas';
import type { OpcoesDeTextura } from './texturas';
import {
  componentesNoFrameDoAnel,
  orientacaoDoCorpoNaCena,
  orientacaoInercialDoAnelNaCena,
} from './orientacaoNaCena';
import { RAIO_SOL_KM } from '../../escala';
import {
  escreverSombraDeEclipse,
  uniformsDeEclipseNeutros,
} from './eclipseNoMaterial';
import { ANEIS_CITADOS, ANEL_PROC_FRAG, ANEL_VERT, FOLGA_DAS_FAIXAS } from './gigante';
import {
  ESCULPIDO_FRAG,
  ESCULPIDO_VERT,
  criaGeometriaEsculpida,
  uniformsDoEsculpido,
  IDS_ESCULPIDOS,
} from './esculpido';
import { PlumasDeEncelado, atividadeDasMares } from './plumas';
import type { QuadroDasPlumas } from './plumas';


/**
 * O LIMIAR DA MALHA DENSA do relevo (`SEGMENTOS_COM_RELEVO`), em px de
 * diâmetro: 12× o gate. Nasceu em 13/08 (F5-2, 64 px; 48 desde a F6-2) como
 * o gate das luas, só para Io/Europa/Ganimedes (37/10/11 px) não nascerem
 * no retrato oficial de Júpiter e as vistas da F4 ficarem bit-idênticas —
 * não por custo. Em 06/10 (F4 do filme solar) deixou de ser gate: a lua
 * pipocava com 48 px e o nome ficava em céu vazio. Hoje toda lua entra no
 * gate da casa (4 px) e este número só troca a esfera da casa pela malha
 * densa — ver `portaoDoRochoso`.
 */
export const LIMIAR_DA_MALHA_DENSA_PX = 48;

/** O que o rochoso desenha: 0 nada, 1 a esfera da casa, 2 a malha densa. */
export type PortaoDoRochoso = 0 | 1 | 2;

/**
 * O PORTÃO DO ROCHOSO (06/10/2026) — dois `gateBinario` em cascata, cada
 * um com a histerese da casa: o corpo entra aos 4 px (sai abaixo de 2) e,
 * dentro dele, a malha densa entra aos 48 px (sai abaixo de 24). Acima de
 * 48 px o desenho é o de antes, bit a bit; entre 4 e 48 a lua cresce de um
 * ponto na esfera de 128×64 com o MESMO deslocamento (a forma de Hipérion
 * mora no mapa de altura: uma esfera lisa estalaria em batata aos 48 px).
 * Só quem tem relevo tem duas malhas; nos outros o 2 desenha o mesmo que o 1.
 */
export function portaoDoRochoso(antes: PortaoDoRochoso, diametroPx: number): PortaoDoRochoso {
  if (!gateBinario(antes > 0, diametroPx)) return 0;
  return gateBinario(antes === 2, diametroPx * (LIMIAR_DO_GATE_PX / LIMIAR_DA_MALHA_DENSA_PX))
    ? 2
    : 1;
}

/** Os dois BRDFs da fase — Lommel-Seeliger (regolito) ou Lambert. */
export type BrdfDoRochoso = 'ls' | 'lambert';

/** A configuração de um corpo rochoso — dado, nunca ramo novo. */
export interface ConfigDoRochoso {
  readonly id: string;
  readonly brdf: BrdfDoRochoso;
  /**
   * F6: Haumea/Makemake/Éris/Quaoar — o −3 inventado; sem mapa.
   * S3 (item 134): `esculpido` é o terceiro caminho — sem mapa E sem
   * esfera, malha própria com o campo de crateras nos atributos
   * (`esculpido.ts`). É o único que troca a GEOMETRIA.
   */
  readonly superficie?: 'mapa' | 'procedural' | 'esculpido';
}

/**
 * OS ROCHOSOS DA F3+F5, na ordem do Sol para fora. A lista é o
 * DADO VIVO que o Director percorre para construir, ticar e
 * descartar — a "lista dos corpos construídos, nunca redigitada"
 * que a escada consulta (director.ts, `podeAproximar`).
 * Vanth/Weywot NÃO entram: sem textura/licença não nasce mesh.
 */
export const ROCHOSOS: readonly ConfigDoRochoso[] = [
  { id: 'mercury', brdf: 'ls' },
  { id: 'venus', brdf: 'lambert' },
  { id: 'mars', brdf: 'lambert' },
  { id: 'phobos', brdf: 'lambert' },
  { id: 'deimos', brdf: 'lambert' },
  { id: 'io', brdf: 'ls' },
  { id: 'europa', brdf: 'ls' },
  { id: 'ganymede', brdf: 'ls' },
  { id: 'callisto', brdf: 'ls' },
  { id: 'mimas', brdf: 'lambert' },
  { id: 'enceladus', brdf: 'ls' },
  { id: 'tethys', brdf: 'lambert' },
  { id: 'dione', brdf: 'lambert' },
  { id: 'rhea', brdf: 'lambert' },
  { id: 'titan', brdf: 'lambert' },
  // Hipérion saiu das esculpidas em 23/09/2026: a forma agora é MEDIDA
  // (Cassini) por mapa de altura, o mesmo caminho de Mimas — ver
  // RELEVO_DA_LUA abaixo.
  { id: 'hyperion', brdf: 'lambert' },
  { id: 'iapetus', brdf: 'lambert' },
  { id: 'miranda', brdf: 'lambert' },
  { id: 'ariel', brdf: 'lambert' },
  { id: 'umbriel', brdf: 'lambert' },
  { id: 'titania', brdf: 'lambert' },
  { id: 'oberon', brdf: 'lambert' },
  { id: 'triton', brdf: 'lambert' },
  { id: 'pluto', brdf: 'lambert' },
  { id: 'charon', brdf: 'lambert' },
  { id: 'ceres', brdf: 'lambert' },
  { id: 'vesta', brdf: 'ls' },
  // Item 151: as seis sem foto de superfície ganharam ilustração por IA
  // (fonte local, `baixa-texturas.mjs`) — nenhuma é mais `procedural`.
  { id: 'pallas', brdf: 'ls' },
  { id: 'hygiea', brdf: 'ls' },
  { id: 'haumea', brdf: 'ls' },
  { id: 'makemake', brdf: 'lambert' },
  { id: 'eris', brdf: 'lambert' },
  { id: 'quaoar', brdf: 'lambert' },
  // Pã saiu das esculpidas em 08/10/2026 (PLAN-LUAS-PEQUENAS.md): a forma
  // agora é MEDIDA (Cassini) por mapa de altura, como a do Hipérion — ver
  // RELEVO_DA_LUA abaixo. Fica no lugar em que estava na lista.
  { id: 'pan', brdf: 'lambert' },
  // S3 (item 134) — as sete esculpidas de Saturno. Todas `lambert` com o
  // `terminadorSuave` da casa: o disco chato de Lommel-Seeliger é o fato
  // que uma FOTO confere, e não há foto destas sete com que conferir —
  // o que existe é a forma, e a forma está na malha.
  // A lista mora em `esculpido.ts` (`IDS_ESCULPIDOS`): uma fonte só.
  ...IDS_ESCULPIDOS.map((id) => ({ id, brdf: 'lambert', superficie: 'esculpido' }) as const),
];

/**
 * O RELEVO POR LUA (item 134/S2) — `span`/`bias` como FRAÇÃO DO RAIO,
 * copiados do `relief.json` do projeto Saturn do dono. O raio do vértice
 * vira `1 + vies + altura·escala`: o viés é negativo para que a média
 * fique no raio nominal de `BODY_AXES` (a esfera não engorda).
 *
 * SÓ OITO LUAS PORQUE SÓ OITO TÊM MAPA. Cinco saem de modelo de forma
 * MEDIDO (Mimas e Tétis por SPC de Gaskell, Encélado pelo DEM de Schenk &
 * McKinnon 2024, Dione e Reia pelos DTMs de Weirich et al. 2025 — o de Reia
 * completado nesta casa com as crateras finas que a foto mostra,
 * `relevo-reia.mjs`); Jápeto NÃO TEM DTM público e o relevo dele é gerado por
 * código nesta casa desde o item 230, ancorado no catálogo da IAU e na foto
 * (`relevo-japeto.mjs`) — entra por decisão do dono e é confessado onde o
 * visitante lê (ficha do objeto, seção "a imagem", linha "relevo"), com o
 * texto nascendo em `docs/reference/ASSETS.md`. Hipérion é o sétimo caso
 * (23/09/2026): o mapa de altura é a FORMA MEDIDA inteira (Cassini —
 * Thomas, Joseph & Ansty 2018), não um relevo sobre elipsoide como as
 * outras seis; Pã é o oitavo (08/10/2026), pelo mesmo caminho.
 *
 * Mimas puxa 10 % do raio: Herschel é um terço do diâmetro dela, e é essa
 * a foto que o limbo tinha de mostrar e a esfera lisa não mostrava.
 */
export const RELEVO_DA_LUA: Readonly<
  Record<string, { escala: number; vies: number; horizonte?: true | 'soDoRelevo' }>
> = {
  mimas: { escala: 0.10200225260766879, vies: -0.04611062610562858 },
  enceladus: { escala: 0.009472107707579332, vies: -0.005141926965558401 },
  tethys: { escala: 0.03387224437534385, vies: -0.016188330361680364 },
  dione: { escala: 0.01065032313122289, vies: -0.005189992373296278 },
  // S2b — Reia e Jápeto entram por ORDEM DELE (02/09): "queremos o relevo
  // sobressaído, sabemos que Reia não é uma esfera, ela é acidentada".
  // Reia (PLAN-REIA.md): o DTM medido da Cassini (Weirich et al. 2025) + as crateras finas pela foto
  // (`relevo-reia.mjs`); a faixa do byte, −7 a +6 km, ÷ 765 km (`escalaEVies`).
  // Jápeto (item 230): a faixa do byte de `relevo-japeto.mjs`, −14 a +22 km (`escalaEVies`).
  rhea: { escala: 0.01699346405228758, vies: -0.009150326797385621 },
  iapetus: { escala: 0.04827678691162666, vies: -0.018774306021188143 },
  // Hipérion (23/09/2026): a forma MEDIDA inteira (Cassini — Thomas, Joseph
  // & Ansty 2018) mora no mapa de altura, raio 0,689805 a 1,367691 de
  // 135 km (`BODY_AXES.hyperion` continua a esfera — a razão fica no
  // relevo, não no eixo); os poços saem da pintura por IA (confessado na
  // ficha). `horizonte`: pede também os dois mapas de horizonte e o
  // Lambert escurece o Sol dentro dos poços (GLSL_SOMBRA_DO_HORIZONTE).
  hyperion: { escala: 0.677886, vies: -0.310195, horizonte: true },
  // Pã (08/10/2026, PLAN-LUAS-PEQUENAS.md, a versão F aprovada por ele): a
  // forma MEDIDA inteira (Cassini — Thomas, Joseph & Ansty 2018) no mapa de
  // altura, raio 0,740482 a 1,450393 de 14 km (`BODY_AXES.pan`) — a grade
  // radial 512×256 suavizada a 1° de arco —, mais o relevo fino das fotos
  // da Cassini e as crateras (confessados na ficha). `horizonte`: os dois
  // mapas, como o Hipérion — a crista é uma aba que faz sombra no núcleo,
  // e sem eles o núcleo abaixo dela acende. Mas SÓ DO RELEVO ('soDoRelevo',
  // o portão 2 de `uHorizonte`, `sombraSoDoRelevo`): o mapa mede o
  // horizonte sobre o plano RADIAL e o grampeia em ≥ 0, e em Pã a
  // superfície chega a 65° desse plano (as encostas da aba). Com o teste
  // cru, todo ponto com o Sol abaixo do plano radial apagava — e a encosta
  // inclinada para o Sol estava acesa: 12 % dos pixels acesos na pose norte
  // da Cassini (N1867604669) e 16 % na rasante saíam pretos, uma lua escura
  // na borda que a foto não tem. Só Pã usa este modo; o Hipérion segue com
  // o teste cru.
  pan: { escala: 0.709911, vies: -0.259518, horizonte: 'soDoRelevo' },
};

/**
 * A GRADUAÇÃO DO MOSAICO (item 138) — a tabela `MAP_GRADING` do projeto
 * Saturn, letra por letra. Os mosaicos globais Cassini de Paul Schenk são
 * de COR REALÇADA em IR/UV: o detalhe é o melhor que existe, mas o matiz
 * é exagerado (as luas de gelo são quase neutras) e o nível é baixo. A
 * receita dele é uma só e vale para as seis: puxar `desat` do caminho até
 * a luminância e multiplicar por `ganho` — o de Encélado é 1,35 porque
 * ela é o corpo mais reflexivo do Sistema Solar.
 *
 * SÓ AS SEIS: fora daqui o par é (0, 1) e o fragmento devolve o mapa cru,
 * bit a bit — os mapas dos outros corpos não são realçados e uma
 * graduação neles seria invenção.
 */
export const GRADUACAO_DO_MOSAICO: Readonly<
  Record<string, { desat: number; ganho: number }>
> = {
  mimas: { desat: 0.35, ganho: 1.05 },
  enceladus: { desat: 0.55, ganho: 1.35 },
  tethys: { desat: 0.4, ganho: 1.1 },
  dione: { desat: 0.35, ganho: 1.0 },
  rhea: { desat: 0.35, ganho: 1.0 },
  iapetus: { desat: 0.2, ganho: 1.0 },
};

/**
 * A MALHA DENSA que o deslocamento exige. A esfera de 128×64 da casa tem
 * 1,4° por segmento no equador — larga demais para uma cratera de 130 km
 * aparecer NO LIMBO, que é o defeito que a S2 conserta. 256×128 iguala o
 * nível `ultra` dele e amostra o mapa de 1024 px a 4:1.
 *
 * DOIS NÍVEIS, NÃO OS TRÊS DELE: desde 06/10 a lua é desenhada a partir
 * de 4 px, e abaixo de `LIMIAR_DA_MALHA_DENSA_PX` ela usa a esfera de
 * 128×64 da casa (um quarto dos vértices), deslocada pelo mesmo mapa. A
 * densa só nasce quando a lua passa dos 48 px (`portaoDoRochoso`).
 */
const SEGMENTOS_COM_RELEVO: readonly [number, number] = [256, 128];

/** A escala TANGENCIAL do mapa de normais — o 1,2 dele (`normalScale`). */
const ESCALA_DA_NORMAL_DO_RELEVO = 1.2;

/**
 * A NORMAL MEDIDA (item 141) — os corpos cujo relevo vem de DEM público
 * e entra SÓ NA LUZ. É o caminho que a Lua estreou no item 140, agora em
 * Mercúrio, Marte, Ceres, Vesta, Plutão e Caronte:
 * `scripts/data/atlas/gera-normal-de-dem.mjs` assa o
 * mapa de normais em AMPLITUDE FÍSICA (a inclinação do texel é a
 * inclinação medida do terreno) e o shader o consome pelo frame
 * tangente.
 *
 * A DIFERENÇA PARA `RELEVO_DA_LUA`: lá o mapa de ALTURA também desloca
 * vértice, e por isso a malha engrossa e a silhueta muda. Aqui NADA
 * desloca vértice — a silhueta segue a do elipsoide exato de
 * `BODY_AXES`, a esfera continua a de 128x64, e o que o mapa faz é
 * girar a normal para o Sol desenhar sombra DENTRO da cratera. Em
 * Mercúrio e Marte o relevo real é milésimo do raio — a faixa INTEIRA de
 * altura de Mercúrio mede 9,6 km (medida na grade de 720 do DEM) num raio de
 * 2439, e a de Marte 29 km num raio de 3396; deslocar vértice não
 * mudaria pixel de limbo e custaria a malha densa.
 *
 * OS DOIS DA DAWN (Ceres e Vesta) têm uma diferença que Mercúrio e Marte
 * não têm: o elipsoide de `BODY_AXES` deles NÃO é quase-esfera (Ceres
 * 487,3×446, Vesta 289×280×229), e `normalDoCorpo` já desenha essa
 * figura. Por isso o gerador subtrai o raio do elipsoide da casa antes
 * de derivar — o que vai para o mapa é o relevo SOBRE a bola desenhada,
 * e não a bola outra vez. Em Vesta a figura global valia ~8° de rampa,
 * que é mais do que todo o relevo dela.
 *
 * OS DOIS DA NEW HORIZONS (Plutão e Caronte, 01/10/2026) têm uma
 * diferença que os quatro de antes não têm: o DEM de 300 m é PARCIAL.
 * Plutão tem relevo medido em ~45 % do globo (o hemisfério do sobrevoo e
 * a calota norte) e Caronte em ~44 % (o hemisfério voltado para Plutão);
 * o resto é relevo INVENTADO por código (02/10/2026, `relevo-inventado.mjs`):
 * uma colcha de pedaços do terreno medido do mesmo tipo, posta onde o mapa
 * geológico das fotos da aproximação põe cada terreno e costurada ao medido
 * sem parede nem linha; a ficha confessa (ASSETS.md). Fonte do medido:
 * Schenk et al. 2018 (Icarus 314, 400 e 315, 124).
 *
 * O valor é a ESCALA TANGENCIAL, e é 1 — nenhum ganho. As luas de
 * Saturno usam 1,2 porque o número é o do projeto do dono; aqui a
 * amplitude já é a medida, e exagerá-la seria voltar a inventar.
 */
export const NORMAL_MEDIDA: Readonly<Record<string, number>> = {
  mercury: 1,
  mars: 1,
  ceres: 1,
  vesta: 1,
  pluto: 1,
  charon: 1,
};

/** Raios do corpo em pc — BODY_AXES (a fonte única) pelos
 *  conversores únicos; nenhum literal novo de comprimento. */
export function raiosDoRochosoPc(id: string): { a: number; c: number; b: number } {
  const [aKm, bKm, cKm] = BODY_AXES[id];
  return {
    a: (aKm / AU_KM) * AU_PARA_PC,
    c: (cKm / AU_KM) * AU_PARA_PC,
    b: (bKm / AU_KM) * AU_PARA_PC,
  };
}

/**
 * A posição heliocêntrica em UA (eclíptica J2000): efeméride viva
 * quando há fonte; o RETRATO congelado quando não há E o corpo é
 * planeta (o estado honesto do "sem rede", idêntico ao da camada);
 * null para lua sem fonte (não há luas no retrato — o contrato da
 * Lua, palavra por palavra).
 */
export function posicaoDoRochosoUA(
  id: string,
  jdTdb: number,
  fonte: FonteDeEfemerides | null
): { x: number; y: number; z: number } | null {
  if (fonte && Number.isFinite(jdTdb)) {
    return fonte.posicaoHeliocentrica(id, jdTdb);
  }
  const v = (RETRATO_2026 as Record<string, { vetorUA: readonly number[] }>)[id];
  return v ? { x: v.vetorUA[0], y: v.vetorUA[1], z: v.vetorUA[2] } : null;
}

// ------------------------------------------------------------
// GLSL — os dois BRDFs, shaders próprios no padrão da casa.
// ------------------------------------------------------------

const ROCHOSO_VERT = /* glsl */ `
varying vec3 vLocal; // posição na ESFERA UNITÁRIA (a figura mora na matriz)
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * O VERTEX DO RELEVO (item 134/S2) — deslocamento RADIAL por mapa de
 * altura, a receita dele (`moonMaterials.ts`): raio = 1 + viés +
 * altura·escala, com os dois em fração do raio. Fica num shader SEPARADO
 * do `ROCHOSO_VERT` de propósito: quem não tem relevo continua com o
 * vertex de sempre, sem sampler nem multiplicação a mais, e o A/B do
 * corpo sem relevo é bit-idêntico por construção.
 *
 * `texture2D` no vertex é leitura de nível 0 (GLSL ES 1.00 não aceita
 * viés de mip no estágio de vértice) — é o que se quer: o deslocamento
 * tem de ser o MESMO para todo vértice, venha a câmera de onde vier, ou
 * a silhueta pulsaria com a distância.
 */
const ROCHOSO_VERT_RELEVO = /* glsl */ `
uniform sampler2D uMapaAltura;
uniform vec2 uRelevo;  // (escala, viés) em fração do raio — relief.json dele
varying vec3 vLocal;   // posição DESLOCADA, ainda em raios de a
varying vec2 vUv;
void main() {
  vUv = uv;
  float h = texture2D(uMapaAltura, uv).r;
  vLocal = position * (1.0 + uRelevo.y + h * uRelevo.x);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vLocal, 1.0);
}
`;

/**
 * A GRADUAÇÃO NO FRAGMENTO — a conta dele (`createMoonMaterial`), na
 * mesma ordem: desatura rumo à luminância, multiplica pelo ganho, prende
 * em [0,1]. Fora das seis luas de mosaico o uniforme é (0,1) e a função
 * devolve a cor intocada.
 */
const GLSL_GRADUACAO_DO_MOSAICO = /* glsl */ `
uniform vec2 uGraduacao;  // (desatura, ganho); (0,1) = mapa cru
vec3 graduarMosaico(vec3 c) {
  return clamp(mix(c, vec3(alturaDoAlbedo(c)), uGraduacao.x) * uGraduacao.y, 0.0, 1.0);
}
`;

const GLSL_NORMAL_ELIPSOIDE = /* glsl */ `
// gradiente exato do elipsoide (x/a², y/c², z/b²) em unidades de a:
// uNormalEsc = (1, a²/c², a²/b²) — esfera ⇒ (1,1,1) exato
vec3 normalDoCorpo(vec3 p, vec3 esc) { return normSeguro(p * esc); }
`;

/**
 * LAMBERT — Vênus, Marte, Fobos, Deimos e as luas sem opt-in de
 * regolito: difusa cos(incidência) e nada mais (a esfera Lambertiana
 * estática do doador). O eclipse entra pelo chunk único da lib, SÓ
 * na direta, depois do BRDF.
 *
 * ITEM 93 — a superfície Lambert dos rochosos é uma das três famílias
 * que o contrato manda pôr sob a logística do Eyes (§4.3), e todas as
 * famílias daqui recebem a lanterna de leitura. Em `real` os dois
 * uniformes são 0 e o fragmento devolve o Lambert cru de antes.
 */
export const ROCHOSO_LAMBERT_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform vec3 uDirSolLocal;  // corpo→Sol, frame LOCAL (unitário)
uniform vec3 uCamLocal;     // câmera no frame local, em raios de a
uniform float uLuzGanho;    // ganhoDoGlobo(dUA da CADEIA) — o escalar único
uniform vec3 uNormalEsc;    // (1, a²/c², a²/b²): gradiente do elipsoide
uniform vec3 uEscalaLocal;  // (1, c/a, b/a): ponto real do elipsoide
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
${GLSL_ALTURA_DO_ALBEDO}
${GLSL_BUMP_DO_ALBEDO}
${GLSL_NORMAL_DO_MAPA}
${GLSL_SOMBRA_DO_HORIZONTE}
${GLSL_GRADUACAO_DO_MOSAICO}
${GLSL_RUIDO_DE_VALOR}
${GLSL_GRAO_DO_CLOSE}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 nGeo = n;
  vec3 pElip = vLocal * uEscalaLocal;
  vec3 albedo = graduarMosaico(texture2D(uMapaDia, vUv).rgb);
  // B2: com mapa de relevo, a normal vem MEDIDA e o bump do albedo
  // não entra — seriam duas fontes para a mesma cratera. B1 é o
  // substituto de quem não tem mapa (uRelevoNormal == 0).
  n = uRelevoNormal > 0.0
    ? normalDoMapa(n, vUv)
    : normalComBumpDoAlbedo(n, pElip, alturaDoAlbedo(albedo));
  // E: o grão do close, DEPOIS da normal — o ruído não é relevo
  albedo *= graoDoClose(vUv, vLocal);
  // o horizonte assado: o relevo tapa SÓ a direta; o céu visível SÓ a
  // lanterna (1 exato sem o portão)
  float sombraRelevo = sombraDoHorizonte(nGeo, vUv, uDirSolLocal);
  // portão 2 (horizonte: 'soDoRelevo'): o relevo só tapa o Sol ACIMA do
  // plano radial — abaixo dele quem decide é a normal (ver RELEVO_DA_LUA.pan)
  if (uHorizonte > 1.5) sombraRelevo = sombraSoDoRelevo(nGeo, vUv, uDirSolLocal);
  float ndotlGeo = dot(n, uDirSolLocal);
  vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 luzSol = vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * sombras;
  luzSol *= sombraRelevo;
  vec3 fill = lanternaDeLeitura(n, normSeguro(uCamLocal - pElip), sombras);
  fill *= visibilidadeDoCeu(vUv);
  gl_FragColor = vec4(albedo * luzDoGlobo(luzSol, fill), 1.0);
}
`;

/**
 * LOMMEL-SEELIGER — Mercúrio, os 5 opt-in da F5 e os 4 da F7
 * (Vesta/Palas/Hígia + Haumea, só o BRDF): a MESMA lei, com o
 * C = 4/3 importado da Lua (a derivação por quadratura mora em
 * lua.test.ts e cobre TODOS os consumidores — o literal é UM só).
 *
 * ITEM 93 — AQUI NÃO ENTRA A LOGÍSTICA, e é decisão do contrato (§4.3):
 * o disco chato de LS é o fato que se confere contra uma fotografia, e
 * o Eyes, que usa Phong até na Lua, é PIOR nisto. Entra só a LANTERNA
 * DE LEITURA, e ela chega junto com o teto de 1 — que não morde o
 * realce de limbo do LS (`luzDoGlobo`), então o disco não perde a borda
 * dura que o define.
 */
export const ROCHOSO_LS_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
${GLSL_ALTURA_DO_ALBEDO}
${GLSL_BUMP_DO_ALBEDO}
${GLSL_NORMAL_DO_MAPA}
${GLSL_GRADUACAO_DO_MOSAICO}
${GLSL_RUIDO_DE_VALOR}
${GLSL_GRAO_DO_CLOSE}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  vec3 albedo = graduarMosaico(texture2D(uMapaDia, vUv).rgb);
  // B2: com mapa de relevo, a normal vem MEDIDA e o bump do albedo
  // não entra — seriam duas fontes para a mesma cratera. B1 é o
  // substituto de quem não tem mapa (uRelevoNormal == 0).
  n = uRelevoNormal > 0.0
    ? normalDoMapa(n, vUv)
    : normalComBumpDoAlbedo(n, pElip, alturaDoAlbedo(albedo));
  // E: o grão do close, DEPOIS da normal — o ruído não é relevo
  albedo *= graoDoClose(vUv, vLocal);
  vec3 dirCam = normSeguro(uCamLocal - pElip);
  float mu0 = clamp(dot(n, uDirSolLocal), 0.0, 1.0);
  float mu = clamp(dot(n, dirCam), 0.0, 1.0);
  float ls = ${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4);
  vec3 sombras = fatorDeEclipse(pElip, n, mu0);
  vec3 luzSol = vec3(ls * uLuzGanho) * sombras;
  gl_FragColor = vec4(
    albedo * luzDoGlobo(luzSol, lanternaDeLeitura(n, dirCam, sombras)), 1.0
  );
}
`;

/**
 * PROCEDURAL (F6) — o −3 inventado do doador, declarado. Sem mapa:
 * albedo = cor-base + ruído 3 oitavas. Lambert + eclipse como as irmãs
 * — e, no item 93, a MESMA logística e a MESMA lanterna do Lambert
 * texturado: o que separa este shader do outro é de onde vem o albedo,
 * nunca o modelo de luz.
 */
export const ROCHOSO_PROC_FRAG = /* glsl */ `
uniform vec3 uAlbedoBase;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
${GLSL_RUIDO_DE_VALOR}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float ndotlGeo = dot(n, uDirSolLocal);
  float g = 0.5 * ruido(vLocal * 3.0) + 0.3 * ruido(vLocal * 7.0) + 0.2 * ruido(vLocal * 15.0);
  vec3 albedo = uAlbedoBase * (0.72 + 0.56 * g);
  vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 luzSol = vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * sombras;
  vec3 fill = lanternaDeLeitura(n, normSeguro(uCamLocal - pElip), sombras);
  gl_FragColor = vec4(albedo * luzDoGlobo(luzSol, fill), 1.0);
}
`;

/**
 * PROCEDURAL + LS (F7) — o mesmo −3, com o C = 4/3 importado da
 * Lua. Palas (sem mapa licenciado) e Haumea (corpo da F6, só o
 * BRDF muda: a casa não refaz a figura). Como no LS texturado, o item
 * 93 lhe dá a LANTERNA e NÃO lhe dá a logística.
 */
export const ROCHOSO_PROC_LS_FRAG = /* glsl */ `
uniform vec3 uAlbedoBase;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
${GLSL_RUIDO_DE_VALOR}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float g = 0.5 * ruido(vLocal * 3.0) + 0.3 * ruido(vLocal * 7.0) + 0.2 * ruido(vLocal * 15.0);
  vec3 albedo = uAlbedoBase * (0.72 + 0.56 * g);
  vec3 dirCam = normSeguro(uCamLocal - pElip);
  float mu0 = clamp(dot(n, uDirSolLocal), 0.0, 1.0);
  float mu = clamp(dot(n, dirCam), 0.0, 1.0);
  float ls = ${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4);
  vec3 sombras = fatorDeEclipse(pElip, n, mu0);
  vec3 luzSol = vec3(ls * uLuzGanho) * sombras;
  gl_FragColor = vec4(
    albedo * luzDoGlobo(luzSol, lanternaDeLeitura(n, dirCam, sombras)), 1.0
  );
}
`;

// A tabela de cores-base do −3 inventado (haumea/makemake/eris/quaoar/
// pallas) saiu no item 151: as cinco ganharam ilustração por IA e
// nenhuma ROCHOSOS entra mais como `superficie: 'procedural'` — sem
// config nenhuma nesse ramo, a tabela não tinha mais leitor (§6).

// ------------------------------------------------------------
// A classe — o molde é a Lua; o que a Terra tem a mais (cessão,
// retrato) entra como ramo de DADO (planeta × lua), nunca cópia.
// ------------------------------------------------------------

/** O que o Director entrega por tick. */
export interface QuadroDoRochoso {
  jdTdb: number;
  fonte: FonteDeEfemerides | null;
  camPosPc: THREE.Vector3;
  screenHPx: number;
  fovDeg: number;
  ligado: boolean;
  /** o Atlas está focado neste corpo (ou na lua dele) — um dos três que
   *  SEGURAM os texels (`Seguradores`, texturas.ts). */
  focoDoAtlas: boolean;
  /** o roteiro do filme declarou este corpo — o segurador monotônico. */
  pedidoDoRoteiro: boolean;
  politica: PoliticaDeLuz;
  /** a curva `camera.luz` do filme neste quadro (F2b, `kDaLuz`); ausente = 0 */
  luzDoRoteiro?: number;
  /** o relógio de PAREDE do app em segundos — só a carência da descarga
   *  o consome (`CARENCIA_DA_DESCARGA_S`). */
  tS: number;
  /** os três de PLANETA (a cessão suave, D5); luas ignoram. */
  dtS: number;
  /** px físicos por px CSS — as bordas da cessão são CSS (`QuadroDaTerra.pr`). */
  pr: number;
  salto: boolean;
}

export interface EstadoDoRochoso {
  emQuadro: boolean;
  carregando: boolean;
  gateArmado: boolean;
  cede: number;
  emRampa: boolean;
  raioPc: number;
  centroPc: THREE.Vector3;
  diametroPx: number;
  /** `?dbgplan`: a régua do disco, ANTES da presença — só o readout lê */
  alvoDeCessao?: number;
  /** distância heliocêntrica da CADEIA, em UA; NaN sem posição. */
  rUA: number;
}

/** O bloco comum de textura (`OpcoesDeTextura`) mais a ficha do corpo —
 *  a classe é genérica, o `config` é o que a instancia. */
export interface OpcoesDoRochoso extends OpcoesDeTextura {
  config: ConfigDoRochoso;
}

export class RochosoResolvido {
  readonly group = new THREE.Group();

  private readonly config: ConfigDoRochoso;
  private readonly raioA: number;
  private readonly razaoC: number; // c/a
  private readonly razaoB: number; // b/a
  /** planeta ⇒ retrato congelado de fallback + cessão do ponto (D5) */
  private readonly ehPlaneta: boolean;

  private readonly centro = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private jdEscrito = Number.NaN;
  private fonteEscrita: FonteDeEfemerides | null = null;
  private rUA = Number.NaN;
  /** a PRESENÇA do globo (0..1), rampada rumo a `emQuadro` (terra.ts). */
  private presenca = 0;
  /** um salto que caiu com o globo fora de quadro (`saltoGuardado`) */
  private saltoPendente = false;
  private portao: PortaoDoRochoso = 0;

  /** a sombra do eclipse (F3: Fobos/Deimos ← Marte), no cache de
   *  jd/fonte — scratch único (out-parameter), como nas irmãs */
  private readonly sombra = criaSombraNaCena();

  /** o estado das texturas — a casa dele é o pipeline (`texturas.ts`) */
  private readonly texturas: TexturasDoCorpo;
  /** o registro dos três seguradores, REUSADO por tick (M4 da casa) */
  private readonly seguram: Seguradores = { tela: false, foco: false, filme: false };
  private disposto = false;

  private geometria: THREE.BufferGeometry | null = null;
  /** a malha densa do relevo — só nasce na primeira vez que o portão dá 2 */
  private geometriaDensa: THREE.BufferGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  /** o interruptor da ficha: o relevo FINGIDO da cor do mapa (B1),
   *  desligado por padrão (item 144: "desfazer o relevo inventado") */
  private relevoDaCorLigado = false;
  private matSuperficie: THREE.ShaderMaterial | null = null;
  private geoAnel: THREE.RingGeometry | null = null;
  private anel: THREE.Mesh | null = null;
  private matAnel: THREE.ShaderMaterial | null = null;
  /** S4 (item 134): só Encélado tem jatos — ver `plumas.ts`. */
  private plumas: PlumasDeEncelado | null = null;
  /** o quadro das plumas, REUSADO (zero alocação por tick, M4 da casa) */
  private quadroDasPlumas: QuadroDasPlumas | null = null;
  /** o tier VIVO, lido na hora (a mesma regra da textura): a dose de
   *  grãos da pluma é alocação, e alocação lê o tier antes de alocar. */
  private readonly tier: OpcoesDoRochoso['tier'];
  private readonly mRx = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

  // rascunhos reusados — zero alocação por quadro (M4 da casa)
  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vAnelX = new THREE.Vector3();
  private readonly vAnelY = new THREE.Vector3();
  private readonly vAnelZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vSol = new THREE.Vector3();
  private readonly vEscala = new THREE.Vector3();
  private readonly estado: EstadoDoRochoso;

  /** o estado do último tick — somente leitura; o centro é VIVO. */
  get estadoVivo(): Readonly<EstadoDoRochoso> {
    return this.estado;
  }

  /** o id da casa ('mercury'…'deimos') — o Director registra por ele. */
  get id(): string {
    return this.config.id;
  }

  /** planeta (retrato + cessão do ponto) × lua (sem fonte, não nasce). */
  get planeta(): boolean {
    return this.ehPlaneta;
  }

  constructor(opcoes: OpcoesDoRochoso) {
    this.config = opcoes.config;
    const { a, c, b } = raiosDoRochosoPc(this.config.id);
    this.raioA = a;
    this.razaoC = c / a;
    this.razaoB = b / a;
    this.ehPlaneta = this.config.id in RETRATO_2026;
    this.tier = opcoes.tier;
    this.group.visible = false;
    this.texturas = new TexturasDoCorpo({
      corpo: this.config.id,
      // superfície PROCEDURAL não tem imagem para pedir: lista vazia, e
      // o corpo nasce pronto no primeiro gatilho sem tocar a rede
      canais:
        this.config.superficie !== undefined && this.config.superficie !== 'mapa'
          ? []
          : RELEVO_DA_LUA[this.config.id]?.horizonte
            ? [CANAL_MAP, CANAL_ALTURA, CANAL_NORMAL, CANAL_HORIZONTE, CANAL_HORIZONTE2]
            : this.config.id in RELEVO_DA_LUA
              ? [CANAL_MAP, CANAL_ALTURA, CANAL_NORMAL]
              : this.config.id in NORMAL_MEDIDA
                ? [CANAL_MAP, CANAL_NORMAL]
                : [CANAL_MAP],
      rede: opcoes,
      oQueNaoNasce: 'o corpo não nasce nesta sessão',
      publicar: (porCanal) => {
        this.garantirCasca();
        // o procedural chega com o lote VAZIO — o shader dele não lê mapa
        const u = this.matSuperficie!.uniforms;
        const tex = porCanal.get('map');
        if (tex) {
          u.uMapaDia.value = tex;
          const img = tex.image as { width?: number; height?: number } | undefined;
          (u.uTamanhoDoMapa.value as THREE.Vector2).set(img?.width ?? 0, img?.height ?? 0);
        }
        // o lote é ATÔMICO (texturas.ts): ou veio inteiro, ou nenhum —
        // cinco com horizonte, três com relevo de vértice, dois com
        // normal medida (item 141), um no resto
        const alt = porCanal.get('height');
        if (alt) u.uMapaAltura.value = alt;
        const nrm = porCanal.get('normal');
        if (nrm) u.uMapaNormal.value = nrm;
        const hor = porCanal.get('horizon');
        if (hor) u.uMapaHorizonte.value = hor;
        const hor2 = porCanal.get('horizon2');
        if (hor2) u.uMapaHorizonte2.value = hor2;
      },
      // o procedural nunca chega aqui (não há texel residente para
      // soltar), mas o uniform dele também não existe — a guarda serve
      // aos dois
      soltar: () => {
        const u = this.matSuperficie?.uniforms;
        if (!u) return;
        u.uMapaDia.value = null;
        (u.uTamanhoDoMapa.value as THREE.Vector2).set(0, 0);
        u.uMapaAltura.value = null;
        u.uMapaNormal.value = null;
        u.uMapaHorizonte.value = null;
        u.uMapaHorizonte2.value = null;
      },
    });
    this.estado = {
      emQuadro: false,
      carregando: false,
      gateArmado: false,
      cede: 0,
      emRampa: false,
      raioPc: a,
      centroPc: this.centro,
      diametroPx: Number.NaN,
      rUA: Number.NaN,
    };
  }

  /**
   * O TICK — a mesma ordem das irmãs: posição (cache por jd E fonte)
   * → diâmetro aparente → gate → gatilho de textura → matriz e
   * uniforms (só em quadro). Sem posição (lua sem efeméride) o
   * centro fica NaN e nada entra em quadro — o contrato da Lua.
   */
  atualizar(q: QuadroDoRochoso): EstadoDoRochoso {
    const e = this.estado;
    if (this.disposto) return e;

    let saltoDeData = false;
    if (
      (q.jdTdb !== this.jdEscrito || q.fonte !== this.fonteEscrita) &&
      Number.isFinite(q.jdTdb)
    ) {
      saltoDeData = true;
      this.jdEscrito = q.jdTdb;
      this.fonteEscrita = q.fonte;
      const p = posicaoDoRochosoUA(this.config.id, q.jdTdb, q.fonte);
      if (p) {
        this.rUA = Math.hypot(p.x, p.y, p.z);
        const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
        this.centro.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
        // O ECLIPSE (F2c/F3): o par da TABELA, no MESMO relógio do
        // quadro — sem fonte viva não há eclipsador medido, e corpo
        // sem par fica neutro por construção da lib
        const eclipsadorId = PARES_DE_ECLIPSE[this.config.id];
        if (q.fonte && eclipsadorId) {
          const pEcl = q.fonte.posicaoHeliocentrica(eclipsadorId, q.jdTdb);
          resolveSombraNaCena(
            this.config.id,
            [p.x, p.y, p.z],
            [pEcl.x, pEcl.y, pEcl.z],
            this.sombra
          );
        } else {
          this.sombra.ativo = false;
        }
      } else {
        this.rUA = Number.NaN;
        this.centro.set(Number.NaN, Number.NaN, Number.NaN);
        this.sombra.ativo = false;
      }
    }
    e.rUA = this.rUA;

    const dPc = q.camPosPc.distanceTo(this.centro);
    const diametroPx = diametroAparentePx(this.raioA, dPc, q.screenHPx, q.fovDeg);
    e.diametroPx = diametroPx;

    this.portao = portaoDoRochoso(this.portao, diametroPx);
    const armado = this.portao > 0;

    // OS MESMOS TRÊS SEGURADORES das irmãs (lei 4, item 115): tela, foco
    // do Atlas e roteiro do filme; o último a soltar abre a carência.
    this.seguram.tela = armado;
    this.seguram.foco = q.focoDoAtlas;
    this.seguram.filme = q.pedidoDoRoteiro;
    this.texturas.aoTick(this.seguram, q.tS);

    const emQuadro =
      armado &&
      q.ligado &&
      this.texturas.pronta &&
      Number.isFinite(this.centro.x);
    e.emQuadro = emQuadro;
    e.carregando = this.texturas.carregando;
    e.gateArmado = armado;
    this.group.visible = emQuadro;

    // A CESSÃO DO PONTO — só PLANETA tem ponto na camada; a conta é a
    // da Terra, palavra por palavra: régua do disco × presença rampada.
    if (this.ehPlaneta) {
      const alvo = cessaoAlvo(emQuadro, diametroPx, q.pr);
      const alvoPresenca = emQuadro ? 1 : 0;
      const estala = q.salto || saltoDeData || this.saltoPendente;
      this.saltoPendente = saltoGuardado(this.saltoPendente, q.salto, emQuadro);
      this.presenca = estala
        ? alvoPresenca
        : stepRampToward(this.presenca, alvoPresenca, q.dtS, RAMP_DURATION_MS);
      e.alvoDeCessao = alvo;
      e.cede = this.presenca * alvo;
      e.emRampa = this.presenca !== alvoPresenca;
    }

    if (emQuadro) this.posicionar(q);
    return e;
  }

  /** matriz + uniforms do quadro — só roda com o mesh em quadro. */
  private posicionar(q: QuadroDoRochoso) {
    const { colunaX, colunaY, colunaZ } = orientacaoDoCorpoNaCena(
      IAU_ORIENTATIONS[this.config.id],
      this.jdEscrito
    );
    this.vX.set(colunaX[0], colunaX[1], colunaX[2]);
    this.vY.set(colunaY[0], colunaY[1], colunaY[2]);
    this.vZ.set(colunaZ[0], colunaZ[1], colunaZ[2]);

    // a figura (esfera ou triaxial) mora na escala da matriz — a
    // geometria é sempre a esfera unitária (a lição da Terra)
    const sup = this.superficie!;
    this.malhaDoQuadro(sup);
    sup.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.set(this.raioA, this.raioA * this.razaoC, this.raioA * this.razaoB))
      .setPosition(this.centro);

    // frame local (CPU em float64): câmera em raios de a, Sol unitário
    // a exposição da visita (item 91, reescrita no 93): Sol = 1 em
    // `assistida`, E(d) em `real`. Os anéis (Quaoar, Haumea) recebem o mesmo
    // `ganho` — e nenhuma lanterna. Ver `luzDaVisita.ts`.
    const ganho = ganhoDoGlobo(this.rUA, q.politica, q.luzDoRoteiro);
    // ONDE ESTÁ O SOL, uma vez só por corpo: a ORIGEM da cena. Os anéis
    // (Quaoar, Haumea) bebem DESTE vetor — Quaoar tinha um segundo cálculo
    // idêntico só para ele (item 91).
    const dirSol = this.vSol.copy(this.centro).multiplyScalar(-1);
    const norma = Math.max(dirSol.length(), 1e-30);
    dirSol.multiplyScalar(1 / norma);
    const sLx = dirSol.dot(this.vX);
    const sLy = dirSol.dot(this.vY);
    const sLz = dirSol.dot(this.vZ);

    const delta = this.vTmp.copy(q.camPosPc).sub(this.centro);
    const cLx = delta.dot(this.vX) / this.raioA;
    const cLy = delta.dot(this.vY) / this.raioA;
    const cLz = delta.dot(this.vZ) / this.raioA;

    const u = this.matSuperficie!.uniforms;
    (u.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (u.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    u.uLuzGanho.value = ganho;
    // a lanterna de leitura e o `s` do terminador (item 93), pelo único
    // escritor da casa — as três famílias de BRDF desta classe recebem
    // os MESMOS dois uniformes; quem decide o que fazer com eles é o
    // fragmento (a LS ignora o `s`).
    escreverLuzDaVisita(u, q.politica, 0, q.luzDoRoteiro, ganho);
    // a sombra do eclipse — o mesmo fio das irmãs (sem deriva: casca única)
    escreverSombraDeEclipse(u, this.sombra, this.vX, this.vY, this.vZ, 0);

    // S4 — OS JATOS. Mesma matriz da casca (mesmo frame IAU, mesma
    // escala do elipsoide: as fissuras ficam grudadas nas listras) e os
    // MESMOS dois vetores locais do globo; a pluma segue a exposição da
    // visita pelo `ganho`, como a superfície.
    // Só com a malha densa: quanto menor a lua, mais grãos batem no piso de
    // 1 px do `gl_PointSize` e a luz da pluma deixa de ser conservada — com
    // Encélado de 10 px o grão rente ao chão sairia ~180× maior (bolha).
    if (this.plumas) this.plumas.pontos.visible = this.portao === 2;
    if (this.plumas && this.quadroDasPlumas && this.portao === 2) {
      this.plumas.pontos.matrix.copy(sup.matrix);
      const p = this.quadroDasPlumas;
      p.dirSolLocal.set(sLx, sLy, sLz);
      p.camLocal.set(cLx, cLy, cLz);
      p.luzGanho = ganho;
      p.atividade = atividadeDasMares(this.jdEscrito);
      p.alturaPx = q.screenHPx;
      p.tier = this.tier();
      this.plumas.atualizar(p);
    }

    if (this.anel && this.matAnel) {
      const inercial = orientacaoInercialDoAnelNaCena(
        IAU_ORIENTATIONS[this.config.id],
        this.jdEscrito
      );
      this.vAnelX.set(inercial.colunaX[0], inercial.colunaX[1], inercial.colunaX[2]);
      this.vAnelY.set(inercial.colunaY[0], inercial.colunaY[1], inercial.colunaY[2]);
      this.vAnelZ.set(inercial.colunaZ[0], inercial.colunaZ[1], inercial.colunaZ[2]);
      this.anel.matrix
        .makeBasis(this.vAnelX, this.vAnelY, this.vAnelZ)
        .scale(this.vEscala.set(this.raioA, this.raioA, this.raioA))
        .multiply(this.mRx)
        .setPosition(this.centro);
      // A MESMA ponte do anel de Saturno — e o mesmo conserto: as
      // componentes no frame da RingGeometry são a INVERSA de Rx(−π/2).
      // O erro estava copiado aqui; agora só existe uma função (item 91).
      const ua = this.matAnel.uniforms;
      componentesNoFrameDoAnel(
        dirSol, this.vAnelX, this.vAnelY, this.vAnelZ,
        ua.uDirSolLocal.value as THREE.Vector3
      );
      componentesNoFrameDoAnel(
        delta, this.vAnelX, this.vAnelY, this.vAnelZ,
        ua.uCamLocal.value as THREE.Vector3
      ).divideScalar(this.raioA);
      ua.uLuzGanho.value = ganho;
      ua.uSolAngRad.value = RAIO_SOL_KM / Math.max(this.rUA * AU_KM, 1e-30);
    }
  }

  /** o interruptor da ficha — só onde o relevo é FINGIDO da cor do mapa
   *  (B1, `escalaDoBumpDoAlbedo` > 0) e NÃO há mapa de relevo. `null`
   *  onde não há o que ligar: esculpido (a forma é o dado), config já
   *  procedural (sem mapa), relevo medido (Mercúrio, Marte, Ceres, Vesta,
   *  Plutão, Caronte, as seis de Saturno com o mosaico) e bump zerado
   *  (Europa, Io, Vênus, Titã). Decisão dele, 04/09/2026. */
  get relevoDaCor(): boolean | null {
    if (this.config.superficie !== undefined && this.config.superficie !== 'mapa') return null;
    const id = this.config.id;
    if (id in RELEVO_DA_LUA || id in NORMAL_MEDIDA || escalaDoBumpDoAlbedo(id) <= 0) return null;
    return this.relevoDaCorLigado;
  }

  /** o `uBumpAlbedo` que vale agora: a escala da tabela só com o
   *  interruptor ligado; zero no resto (e onde o interruptor não existe). */
  private escalaDoBumpVivo(): number {
    return this.relevoDaCor === true ? escalaDoBumpDoAlbedo(this.config.id) : 0;
  }

  /** liga/desliga o relevo fingido AO VIVO: só o uniform muda; mapa,
   *  geometria e shader ficam. Antes de a casca nascer, só a flag muda e
   *  `garantirCasca` a lê. */
  definirRelevoDaCor(ligado: boolean) {
    if (this.relevoDaCor === null || this.relevoDaCor === ligado) return;
    this.relevoDaCorLigado = ligado;
    if (this.matSuperficie) this.matSuperficie.uniforms.uBumpAlbedo.value = this.escalaDoBumpVivo();
  }

  /** geometria + material + mesh, UMA vez, na primeira necessidade. */
  private garantirCasca() {
    if (this.geometria || this.disposto) return;
    const relevo = RELEVO_DA_LUA[this.config.id];
    // S3: o corpo ESCULPIDO troca a esfera pela malha própria — é o único
    // caminho desta classe em que a figura não mora na escala da matriz.
    // Com relevo, a casca nasce na esfera da casa e a densa só quando o
    // portão pede (`malhaDoQuadro`).
    const esculpido = this.config.superficie === 'esculpido';
    this.geometria = esculpido
      ? criaGeometriaEsculpida(this.config.id)
      : this.esferaDaCasca(128, 64);
    const procedural = this.config.superficie === 'procedural';
    // sem ROCHOSOS `procedural` hoje (item 151), `uAlbedoBase` nunca é lido
    // por um fragmento vivo — o cinza neutro é só o padrão do uniform.
    const albedo: readonly [number, number, number] = [0.5, 0.5, 0.5];
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: esculpido
        ? ESCULPIDO_VERT
        : relevo
          ? ROCHOSO_VERT_RELEVO
          : ROCHOSO_VERT,
      fragmentShader: esculpido
        ? ESCULPIDO_FRAG
        : procedural
          ? this.config.brdf === 'ls'
            ? ROCHOSO_PROC_LS_FRAG
            : ROCHOSO_PROC_FRAG
          : this.config.brdf === 'ls'
            ? ROCHOSO_LS_FRAG
            : ROCHOSO_LAMBERT_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        // B1 — o relevo fingido da cor nasce DESLIGADO (item 144) e só a
        // ficha o liga (`definirRelevoDaCor`); onde há relevo medido ou o
        // bump zerado o interruptor nem existe, e o zero é definitivo
        uBumpAlbedo: { value: this.escalaDoBumpVivo() },
        // S3: cor/fundo/borda/crista da família de regolito. Só o corpo
        // esculpido lê estes; nos outros o bloco nem existe no shader.
        ...(esculpido ? uniformsDoEsculpido(this.config.id) : {}),
        // B2 — o relevo medido. Sem entrada em RELEVO_DA_LUA os três
        // ficam neutros e nenhum sampler é lido.
        uMapaAltura: { value: null },
        uMapaNormal: { value: null },
        // o horizonte assado: só quem declara `horizonte` liga o portão;
        // em 0 o Lambert multiplica por 1 exato e os mapas nem são lidos
        uMapaHorizonte: { value: null },
        uMapaHorizonte2: { value: null },
        uHorizonte: { value: relevo?.horizonte === 'soDoRelevo' ? 2 : relevo?.horizonte ? 1 : 0 },
        uRelevo: {
          value: new THREE.Vector2(relevo?.escala ?? 0, relevo?.vies ?? 0),
        },
        uRelevoNormal: {
          value: relevo
            ? ESCALA_DA_NORMAL_DO_RELEVO
            : (NORMAL_MEDIDA[this.config.id] ?? 0),
        },
        // item 138 — a graduação do mosaico Cassini; (0,1) fora das seis
        uGraduacao: {
          value: new THREE.Vector2(
            GRADUACAO_DO_MOSAICO[this.config.id]?.desat ?? 0,
            GRADUACAO_DO_MOSAICO[this.config.id]?.ganho ?? 1
          ),
        },
        // E — o gate do grão. Quem escreve o tamanho VERDADEIRO é quem
        // publica o mapa (a variante do tier manda, não o manifesto);
        // (0,0) é "ainda não veio" e o chunk devolve 1 exato.
        uTamanhoDoMapa: { value: new THREE.Vector2(0, 0) },
        uAlbedoBase: { value: new THREE.Vector3(albedo[0], albedo[1], albedo[2]) },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        // o gradiente EXATO do elipsoide (o cabeçalho diz por que não
        // é a aproximação de primeiro grau da Terra)
        uNormalEsc: {
          value: new THREE.Vector3(1, 1 / (this.razaoC * this.razaoC), 1 / (this.razaoB * this.razaoB)),
        },
        uEscalaLocal: { value: new THREE.Vector3(1, this.razaoC, this.razaoB) },
        ...uniformsDaLuzDaVisita(),
        ...uniformsDeEclipseNeutros(),
      },
      // corpo resolvido OPACO: escreve e testa o depth do palco (F0)
      depthWrite: true,
      depthTest: true,
      transparent: false,
    });
    this.superficie = new THREE.Mesh(this.geometria, this.matSuperficie);
    // globo opaco = ocultador do rascunho do campo (item 47): estrela
    // atrás dele não deposita clarão. Anel/atmosfera/nuvens ficam fora.
    this.superficie.layers.enable(CAMADA_DOS_OCULTADORES);
    // e com relevo o fantasma desse passe desloca a malha como este
    // vertex: sem isso a ponta de Hipérion não tapava estrela atrás dela
    if (relevo) relevoNoFantasma(this.superficie, this.matSuperficie);
    this.superficie.matrixAutoUpdate = false;
    this.group.add(this.superficie);

    // S4 — os jatos nascem com a casca e morrem com ela; o gate deles é
    // o da malha densa (48 px, `posicionar`).
    if (this.config.id === 'enceladus') {
      this.plumas = new PlumasDeEncelado();
      this.quadroDasPlumas = {
        dirSolLocal: new THREE.Vector3(),
        camLocal: new THREE.Vector3(),
        luzGanho: 1,
        atividade: 1,
        alturaPx: 1080,
        tier: 'cinema',
      };
      this.group.add(this.plumas.pontos);
    }

    // Os anéis finos — Quaoar (dois) e Haumea (um): qualquer rochoso com
    // entrada em `ANEIS_CITADOS`. A malha tem folga em volta das faixas: o
    // piso de pixels do fragmento as alarga além do raio citado. O plano é
    // o equatorial do corpo (`posicionar`, a pose inercial do polo); a sombra
    // do globo usa o achatamento polar (`razaoC`), e o eixo `b` de Haumea
    // (0,73) não entra — aproximação declarada.
    const anel = ANEIS_CITADOS[this.config.id];
    if (anel) {
      this.geoAnel = new THREE.RingGeometry(
        anel.rInt - FOLGA_DAS_FAIXAS,
        anel.rExt + FOLGA_DAS_FAIXAS,
        192
      );
      this.matAnel = new THREE.ShaderMaterial({
        vertexShader: ANEL_VERT,
        fragmentShader: ANEL_PROC_FRAG,
        uniforms: {
          uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
          uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
          uLuzGanho: { value: 1 },
          uKPolar: { value: this.razaoC },
          uSolAngRad: { value: 0 },
          uAnelRaios: { value: new THREE.Vector2(anel.rInt, anel.rExt) },
          uModo: { value: this.config.id === 'haumea' ? 3 : 2 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      this.anel = new THREE.Mesh(this.geoAnel, this.matAnel);
      this.anel.matrixAutoUpdate = false;
      this.group.add(this.anel);
    }
  }

  /**
   * A esfera unitária da casca. O VERTEX DO RELEVO desloca a superfície NA
   * GPU — o atributo de posição da CPU continua a esfera unitária, e o
   * boundingSphere AUTOMÁTICO (raio 1) cortaria o corpo do frustum com a
   * ponta ainda em tela: Hipérion alcança 1,37 (RELEVO_DA_LUA.hyperion).
   * Só o relevo precisa do valor à mão; o esculpido solda a malha já
   * deslocada e `computeBoundingSphere()` nela mede o raio de verdade.
   */
  private esferaDaCasca(largura: number, altura: number): THREE.SphereGeometry {
    const geo = new THREE.SphereGeometry(1, largura, altura);
    const relevo = RELEVO_DA_LUA[this.config.id];
    if (relevo) {
      geo.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(),
        Math.max(1, 1 + relevo.vies + relevo.escala)
      );
    }
    return geo;
  }

  /** a malha que o portão pede neste quadro — troca de referência, sem
   *  alocar; a densa nasce uma vez, na primeira passagem dos 48 px. */
  private malhaDoQuadro(sup: THREE.Mesh) {
    if (!(this.config.id in RELEVO_DA_LUA)) return;
    if (this.portao === 2) {
      this.geometriaDensa ??= this.esferaDaCasca(...SEGMENTOS_COM_RELEVO);
      sup.geometry = this.geometriaDensa;
    } else {
      sup.geometry = this.geometria!;
    }
  }

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.geometriaDensa?.dispose();
    this.matSuperficie?.dispose();
    this.geoAnel?.dispose();
    this.matAnel?.dispose();
    this.plumas?.dispose();
    this.texturas.dispose();
  }
}
