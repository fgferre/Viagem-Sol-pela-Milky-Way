// ============================================================
// A TERRA RESOLVIDA (Onda 6, F2a) — o primeiro corpo 3D da casa: o
// globo que nasce sob o ponto fotométrico quando a câmera chega perto.
//
// PROVENIÊNCIA: implementação NOVA. O doador atlas-orbital entra como
// ESPEC apenas — as constantes Nishita do `atmosphereShader.ts`, o
// `linstep(-0,1, 0,1, -NdotL)` das luzes noturnas (a versão smoothstep
// vazava 16% de luz no lado diurno) e o terminador de nuvens do
// `cloudTerminatorMath.ts` atravessaram como NÚMEROS declarados; nenhuma
// linha de código dele atravessou (doutrina de travessia, PLANO-ATLAS §0).
//
// AS QUATRO LEIS QUE ESTE ARQUIVO OBEDECE:
//  1. A LUZ É UM ESCALAR SÓ (D2): `uLuzGanho = ganhoFundido(dUA, política)`
//     multiplica a componente DIRETA (difusa + especular) e nada mais.
//     Nunca dois multiplicadores empilhados (anti-padrão 1); SEM piso de
//     ambiente (anti-padrões 3 e 9) — o lado escuro em `real` é escuro, e
//     a didática honesta são as luzes de cidade, que são EMISSÃO
//     (independem da irradiância solar e ficam FORA do ganho).
//  2. UM RELÓGIO SÓ (D2/D-E6): o `jd` vem do Director; este arquivo não
//     conhece Date nem relógio de parede — o teste de texto-fonte da
//     camada de planetas vale aqui palavra por palavra.
//  3. ORIENTAÇÃO MEDIDA, NUNCA CALIBRADA: polo + W(t) IAU desenrolado via
//     `baseCorpoEquatorial` (orientacao.ts), raios de BODY_AXES
//     (achatamento real). O oráculo de sub-ponto solar em `terra.test.ts`
//     (emenda D-E4) confere o transform COMPLETO do mesh contra
//     `subSolarPoint` — textura girada passa em md5, não passa lá.
//     A lápide de `EARTH_ROTATION_OFFSET_DEG` (config.ts) segue valendo:
//     nenhum ângulo de alinhamento à mão neste arquivo.
//  4. CARGA PREGUIÇOSA (F2a): textura só desce quando o GATE arma ou na
//     fase atlas — nunca no boot do filme. As 18 vistas oficiais não fazem
//     um fetch (o teste pina o gatilho; as capturas provam de graça).
//
// O GATE + A DOMINÂNCIA SUAVE (F2b, decisão D5): o mesh entra quando o
// diâmetro aparente cruza `LIMIAR_DO_GATE_PX`, sai abaixo de LIMIAR/2
// (cushion 2×, desigualdades assimétricas, NaN preserva estado — os
// contratos de histerese da Onda 3). O PONTO da camada `planetas` NÃO
// apaga num degrau (o binário da F2a morreu aqui): ele cede por
// DOMINÂNCIA, no precedente exato do par hero↔catálogo da Onda 3 —
// razão r = diâmetro do MESH em px / halo PREVISTO do ponto em px
// (`psfPointSizePx`, o espelho da PSF), cessão-alvo = g(r), a rampa
// cúbica de 1 a 2,5 (`heroDominanceFade`, com a MESMA prova de
// continuidade: a luz combinada nunca dá passo para trás na
// aproximação). O mesh NASCE SOB o clarão (aos 4 px do gate, r ≈ 0,3 —
// o ponto segue inteiro) e o ponto só cede quando o globo o domina.
// As 4 cicatrizes do crossfade valem aqui: banda morta PROIBIDA
// (soma > 0 em toda a faixa — teste de propriedade como o C1a),
// reafirmação por quadro (a escrita idempotente de `escreverCessao`),
// reset no salto de foco/data (snap, nunca lerp através de um
// teletransporte) e clamp de dt (dentro de `stepRampToward`, o
// integrador do doador que estava DORMENTE desde a Onda 3 — este é o
// primeiro consumidor de runtime dele).
//
// PRECISÃO: a cena mede em pc e a Terra tem raio 2,07e-10 pc. Nenhuma
// posição de mundo é reconstruída na GPU: os shaders trabalham no FRAME
// LOCAL do corpo, em unidades de raio equatorial, com câmera e Sol
// convertidos na CPU (float64) a cada tick — o quantum de float32 na
// posição da cena (~6e-13 pc) nunca toca a matemática de iluminação.
// Clamps e guardas de NaN em todo pow/divisão do GLSL (pauta (a) da
// revisão; precedente c098470/9aff400).
// ============================================================
import * as THREE from 'three';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import {
  AU_PARA_PC,
  eclipticaParaEquatorial,
} from '../../../lib/atlas/frameGalactico';
import type { Vec3 } from '../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import type { IauOrientation } from '../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../lib/atlas/orientacao';
import { ganhoFundido } from '../../../lib/atlas/luz';
import type { PoliticaDeLuz } from '../../../lib/atlas/luz';
import {
  GLSL_SOMBRA_ECLIPSE,
  PARES_DE_ECLIPSE,
  criaSombraNaCena,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import type { SombraNaCena } from '../../../lib/atlas/eclipse';
import { CALIBRACAO_ATLAS } from '../../config';
import type { QualityLevel } from '../../core/engine';
import {
  RAMP_DURATION_MS,
  heroDominanceFade,
  psfPointSizePx,
  stepRampToward,
} from '../lodStellar';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { A_MAG_BASE_PC, DESLOCAMENTO_UA_PARA_PC, faseDoVertice, magDoVertice } from '../planetas/planetas';
import type { FonteDeEfemerides, PsfDoCampo } from '../planetas/planetas';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { CUSHION_DO_GATE, LIMIAR_DO_GATE_PX, diametroAparentePx, gateBinario } from './corpos';

const DEG_PARA_RAD = Math.PI / 180;

/** Raio equatorial da Terra em pc — BODY_AXES (km) → UA → pc pelos
 *  conversores únicos da casa; nenhum literal novo de comprimento. */
export const RAIO_EQ_TERRA_PC = (BODY_AXES.earth[0] / AU_KM) * AU_PARA_PC;
/** Raio polar — o achatamento real (a − c)/a ≈ 1/298,3 entra pela escala
 *  anisotrópica da matriz do mesh, nunca por geometria própria. */
export const RAIO_POLAR_TERRA_PC = (BODY_AXES.earth[2] / AU_KM) * AU_PARA_PC;

/**
 * A LEI DO GATE (limiar de 4 px, cushion 2× e a máquina com histerese)
 * MUDOU DE CASA na F2 da onda do Sol real: mora em `corpos.ts`, ao lado
 * de `diametroAparentePx`, que é a outra metade da mesma conta. A razão
 * longa está lá — em resumo, ela deixou de ser "a régua da Terra" no dia
 * em que o SOL passou a ser julgado por ela.
 *
 * REEXPORTADA daqui, e não copiada: os endereços antigos (`terra.ts`)
 * continuam achando o MESMO símbolo, então `terra.test.ts` e quem mais
 * importava não mudam de linha e não existe segunda fonte de verdade.
 */
export { CUSHION_DO_GATE, LIMIAR_DO_GATE_PX, gateBinario };

/** Casca das nuvens: +0,15% do raio — alto o bastante para o depth
 *  separar (medido: ~800× o passo de depth nesta geometria de câmera),
 *  baixo o bastante para não parecer uma segunda superfície. */
export const RAZAO_CASCA_NUVENS = 1.0015;
/** Casca da atmosfera: 1,025 — o `outerRadiusRatio` do espec Nishita, e
 *  o único valor para o qual o polinômio de O'Neil abaixo é válido. */
export const RAZAO_CASCA_ATMOSFERA = 1.025;

/**
 * As nuvens giram a spin × 1,03 (espec do doador). O multiplicador é
 * EXATAMENTE o motivo de o W da casa ser desenrolado (cicatriz 2 de
 * orientacao.ts): num ângulo enrolado, multiplicar injetaria um snap de
 * (1,03−1)·360° ≈ 10,7° a cada volta.
 */
export const DERIVA_DAS_NUVENS = 1.03;

/** Piso noturno do terminador de NUVENS — espec herdada de
 *  cloudTerminatorMath.ts do doador (LO −0,25, HI 0,12, piso 0,03).
 *  Não é piso de ambiente da superfície: vale só para a casca de nuvens,
 *  multiplicado pelo MESMO uLuzGanho de tudo. */
export const NUVEM_TERMINADOR = { lo: -0.25, hi: 0.12, pisoNoturno: 0.03 } as const;

/** Constantes Nishita/O'Neil — espec do atmosphereShader.ts do doador,
 *  declaradas número a número. O polinômio de profundidade óptica só
 *  vale para scaleDepth 0,25 e razão de casca 1,025 (dito no GLSL). */
export const ATMOSFERA = {
  kRayleigh: 0.0025,
  kMie: 0.0015,
  eSun: 10,
  g: 0.76,
  amostras: 23,
  scaleDepth: 0.25,
  comprimentosDeOnda: [0.65, 0.57, 0.475],
} as const;

/** Os cinco canais da Terra no manifest — a escada real de F2a-1. */
export const CANAIS_DA_TERRA = ['map', 'night', 'clouds', 'normal', 'roughness'] as const;
export type CanalDaTerra = (typeof CANAIS_DA_TERRA)[number];

/**
 * RECARGAS além da primeira tentativa antes de `'falhou'` virar terminal
 * (auditoria item 6: um 404 transitório matava o globo a sessão inteira).
 * O precedente é o backoff CONTADO dos 3 `pointerlockerror` da Onda 5
 * (`ERROS_ATE_DESISTIR`, cameraRig.ts): 1 carga + 2 recargas = 3
 * tentativas, e só então o estado desiste — com um aviso único, porque
 * três falhas seguidas não são degradação projetada, são um defeito que
 * alguém precisa ler.
 */
export const RECARGAS_ATE_DESISTIR = 2;

// ------------------------------------------------------------
// As contas puras (testáveis sem GPU)
// ------------------------------------------------------------

/**
 * Posição heliocêntrica da Terra em UA (eclíptica J2000) — o MESMO
 * caminho do `escreverInstante` da camada de planetas: efeméride quando
 * há fonte, retrato congelado quando não há (o estado honesto do "sem
 * rede", idêntico ao da camada que este globo substitui de perto).
 */
export function posicaoDaTerraUA(
  jdTdb: number,
  fonte: FonteDeEfemerides | null
): { x: number; y: number; z: number } {
  if (fonte && Number.isFinite(jdTdb)) {
    return fonte.posicaoHeliocentrica('earth', jdTdb);
  }
  const v = RETRATO_2026.earth.vetorUA;
  return { x: v[0], y: v[1], z: v[2] };
}

/** A saída das três colunas — ver `orientacaoDoCorpoNaCena`. */
export interface OrientacaoNaCena {
  colunaX: Vec3;
  colunaY: Vec3;
  colunaZ: Vec3;
  /** W desenrolado em radianos — a deriva das nuvens deriva DELE. */
  wRad: number;
}

/**
 * AS TRÊS COLUNAS da matriz local→cena de um corpo IAU num instante —
 * a ponte entre a base IAU (equatorial J2000, que é o frame da cena) e
 * a convenção de esfera do three (+Y no polo, `direcaoLocalDeLonLat`).
 *
 *   colunaX = x̂(W) = nodoQ·cos W + lesteDeQ·sin W  (o meridiano-primo)
 *   colunaY = polo                                  (o eixo de spin)
 *   colunaZ = x̂(W) × polo                           (fecha a tríade, det +1)
 *
 * GENÉRICA desde a F2b (o material comum dos corpos congela na F2 —
 * regra de paralelização do desenho da onda): a Terra e a Lua passam
 * pelas MESMAS colunas, cada uma com o seu registro IAU — a libração da
 * Lua entra sozinha, porque mora nos termos periódicos do W do kernel.
 * É o transform que os ORÁCULOS de sub-ponto solar julgam (terra.test.ts
 * e lua.test.ts): o mesh usa ESTA função, o teste inverte ESTA função —
 * uma textura girada 90° reprova lá antes de qualquer olho ver.
 */
export function orientacaoDoCorpoNaCena(
  o: IauOrientation,
  jdTdb: number
): OrientacaoNaCena {
  const { nodoQ, lesteDeQ, polo, wDeg } = baseCorpoEquatorial(o, jdTdb);
  const w = wDeg * DEG_PARA_RAD;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const colunaX: Vec3 = [
    nodoQ[0] * cw + lesteDeQ[0] * sw,
    nodoQ[1] * cw + lesteDeQ[1] * sw,
    nodoQ[2] * cw + lesteDeQ[2] * sw,
  ];
  const colunaZ: Vec3 = [
    colunaX[1] * polo[2] - colunaX[2] * polo[1],
    colunaX[2] * polo[0] - colunaX[0] * polo[2],
    colunaX[0] * polo[1] - colunaX[1] * polo[0],
  ];
  return { colunaX, colunaY: polo, colunaZ, wRad: w };
}

/**
 * Base INERCIAL do anel: o mesmo equador do corpo (nodoQ × polo),
 * sem o W(t). O padrão do anel não gira uma volta por dia do
 * planeta — está preso ao céu, não ao meridiano-primo.
 */
export function orientacaoInercialDoAnelNaCena(
  o: IauOrientation,
  jdTdb: number
): { colunaX: Vec3; colunaY: Vec3; colunaZ: Vec3 } {
  const { nodoQ, polo } = baseCorpoEquatorial(o, jdTdb);
  const colunaZ: Vec3 = [
    nodoQ[1] * polo[2] - nodoQ[2] * polo[1],
    nodoQ[2] * polo[0] - nodoQ[0] * polo[2],
    nodoQ[0] * polo[1] - nodoQ[1] * polo[0],
  ];
  return { colunaX: nodoQ, colunaY: polo, colunaZ };
}

/**
 * Eixos unitários como o MESH os gravou (colunas da matriz, sem a
 * escala). O oráculo D-E4 lê ISTO — não a função que escreveu a
 * matriz. Deitar o polo no equador na malha tem de reprovar.
 */
export function eixosDoMesh(mesh: THREE.Object3D): {
  colunaX: Vec3;
  colunaY: Vec3;
  colunaZ: Vec3;
} {
  const e = mesh.matrix.elements;
  const col = (i: number): Vec3 => {
    const x = e[i];
    const y = e[i + 1];
    const z = e[i + 2];
    const n = Math.hypot(x, y, z) || 1;
    return [x / n, y / n, z / n];
  };
  return { colunaX: col(0), colunaY: col(4), colunaZ: col(8) };
}

/** A instância Terra da função acima — o nome que o oráculo pina. */
export function orientacaoDaTerraNaCena(jdTdb: number): OrientacaoNaCena {
  return orientacaoDoCorpoNaCena(IAU_ORIENTATIONS.earth, jdTdb);
}

/**
 * A CONVENÇÃO UV→direção da SphereGeometry do three, escrita uma vez e
 * PINADA contra a geometria real no teste (é o elo que faltaria ao
 * oráculo): com a textura equiretangular de Greenwich no centro
 * (u = lon/360 + 0,5) e +Y no polo norte, o ponto (lon LESTE, lat)
 * mora na direção local
 *
 *     ( cos lat · cos lon,  sin lat,  −cos lat · sin lon ).
 */
export function direcaoLocalDeLonLat(lonEastDeg: number, latDeg: number): Vec3 {
  const lon = lonEastDeg * DEG_PARA_RAD;
  const lat = latDeg * DEG_PARA_RAD;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}

/**
 * O ALVO DA CESSÃO SUAVE (F2b/D5), pura: quanto o PONTO fotométrico
 * cede a um mesh que mede `diametroMeshPx` contra um halo previsto de
 * `haloPontoPx`. A curva é `heroDominanceFade` IMPORTADA — a mesma
 * rampa cúbica g(r) de 1 a 2,5 do par hero↔catálogo da Onda 3, com a
 * mesma prova de continuidade (hi = 2,5 é a MENOR borda em que a luz
 * combinada nunca dá passo para trás na aproximação; a régua é TAMANHO
 * na tela, a única comum às duas representações).
 *
 * Mesh fora de quadro ⇒ 0 EXATO (o ponto fica inteiro — é o que mantém
 * as vistas profundas bit-idênticas). Halo inexistente (PSF ≤ 0, ponto
 * invisível) ⇒ razão 0 ⇒ cessão 0, o precedente de
 * `heroDominanceRatio` ("ponto inexistente não domina nada" — e um
 * ponto invisível também não soma luz para haver o que ceder).
 */
export function cessaoAlvo(
  emQuadro: boolean,
  diametroMeshPx: number,
  haloPontoPx: number
): number {
  if (!emQuadro) return 0;
  if (!(haloPontoPx > 0) || !Number.isFinite(diametroMeshPx)) return 0;
  return heroDominanceFade(diametroMeshPx / haloPontoPx);
}

/**
 * O ALVO DA CESSÃO PELO GATE (bancada da onda da luz, porta `?bcede=`):
 * a MESMA rampa `g(r)` da irmã de cima, com a âncora trocada — em vez
 * do halo previsto da PSF, o LIMIAR DO GATE do palco vezes o
 * multiplicador da porta. Para o Sol a dominância é honesta e inócua
 * (o sprite mede ~25 px e o disco só o cruza a ~0,55 UA), mas quem lava
 * a tela não é o sprite: é a luz que o ponto DESPEJA no bloom por cima
 * da bola já desenhada — medido na régua da luz (borrão de centenas de
 * px sobre um disco de 14). Esta âncora pergunta outra coisa: "a bola
 * já é corpo de verdade na tela?" — razão 1 no armar do gate (4 px ⇒
 * g = 0 EXATO, sem pop nos dois sentidos da fronteira, porque o armar
 * não muda o ponto em nada) e cessão plena com a bola a 2,5 gates
 * (10 px, ~1,4 UA para o Sol).
 *
 * `mult` inválido ou ≤ 0 ⇒ 0 (porta fechada = lei herdada intacta);
 * mesh fora de quadro ⇒ 0 EXATO, como na irmã.
 */
export function cessaoPeloGate(
  emQuadro: boolean,
  diametroMeshPx: number,
  mult: number
): number {
  if (!emQuadro) return 0;
  if (!(mult > 0) || !Number.isFinite(diametroMeshPx)) return 0;
  return heroDominanceFade(diametroMeshPx / (LIMIAR_DO_GATE_PX * mult));
}

/** Uma entrada do manifest de texturas (public/data/atlas/texturas.json)
 *  — só os campos que a escada consome. */
export interface EntradaDeTextura {
  corpo: string;
  canal: string;
  arquivo: string;
  larguraPx: number;
}
export interface ManifestDeTexturas {
  entradas: EntradaDeTextura[];
}

/** Teto de cinema para os canais de APOIO (tudo que não é `map`) —
 *  a dose de VRAM; a conta mora no doc de `alvoDePixels`. */
export const ALVO_DE_APOIO_CINEMA = 4096;

/**
 * O ALVO de pixels por tier E POR CANAL — a política do dono (D4/decisão
 * 2) com a DOSE DE VRAM da auditoria: cinema usa a MELHOR variante que o
 * aparelho aguenta (`maxTextureSize` da sonda da Onda 1) SÓ no canal
 * `map`, que é o que o olho lê; os canais de apoio (clouds/night/normal/
 * roughness) tetam em 4k. Alta 2k, performance 1k, em todos os canais.
 *
 * A CONTA (RGBA8 + mipmaps 4/3). As nossas texturas são EQUIRET 2:1,
 * não quadradas — a conta antiga (w×w) era 2× alta. Map cinema
 * 8192×4096 = 179 MB; 4 apoios 4096×2048 = 179 MB; um corpo Terra =
 * 0,36 GB com mip. A lição N-9 do doador (tela branca por 3,9 GB)
 * continua válida: a dose existe para não empilhar 8k em todo canal.
 * A 795 px de disco os apoios em 4k já estão acima de 2 texels/pixel.
 * A regra mora AQUI, por canal, e vale para qualquer corpo futuro:
 * um corpo de 1 canal (a Lua) mantém o 8k no `map` de graça.
 *
 * Sem sonda legível o teto é 2k — errar para baixo é barato, estourar o
 * limite do driver é tela preta.
 */
export function alvoDePixels(
  tier: QualityLevel,
  canal: string,
  maxTextureSize?: number
): number {
  const teto =
    typeof maxTextureSize === 'number' && Number.isFinite(maxTextureSize) && maxTextureSize > 0
      ? maxTextureSize
      : 2048;
  const alvo =
    tier === 'cinema'
      ? canal === 'map'
        ? 8192
        : ALVO_DE_APOIO_CINEMA
      : tier === 'alta'
        ? 2048
        : 1024;
  return Math.min(alvo, teto);
}

/**
 * A variante de um canal de um CORPO para um alvo: a MAIOR largura ≤
 * alvo, webp quando o navegador decodifica (a guarda de pessimização já
 * morou no pipeline — só existe webp vencedor no manifest). Sem
 * candidata (canal ausente, alvo abaixo do menor degrau) devolve null e
 * o chamador decide. `corpo` entrou na F2b (a Lua é o segundo
 * consumidor); a escada é a mesma para todos.
 */
export function escolherVariante(
  entradas: readonly EntradaDeTextura[],
  corpo: string,
  canal: string,
  alvoPx: number,
  webpOk: boolean
): EntradaDeTextura | null {
  let melhor: EntradaDeTextura | null = null;
  for (const e of entradas) {
    if (e.corpo !== corpo || e.canal !== canal) continue;
    const ehWebp = e.arquivo.endsWith('.webp');
    if (ehWebp && !webpOk) continue;
    if (!(e.larguraPx <= alvoPx)) continue;
    if (
      !melhor ||
      e.larguraPx > melhor.larguraPx ||
      (e.larguraPx === melhor.larguraPx && webpOk && ehWebp)
    ) {
      melhor = e;
    }
  }
  return melhor;
}

/**
 * O navegador decodifica webp? Detecção por reencode de canvas — quem
 * não encoda webp devolve um data-URL de png. Safari antigo cai no jpg
 * com honestidade; falso negativo custa bytes, nunca imagem quebrada.
 */
export function detectarWebp(): boolean {
  try {
    return document
      .createElement('canvas')
      .toDataURL('image/webp')
      .startsWith('data:image/webp');
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// GLSL — shaders PRÓPRIOS, no padrão da casa: template strings,
// helpers com guarda, nenhum chunk do three.
// ------------------------------------------------------------

/** Helpers compartilhados: toda divisão com denominador saneado, todo
 *  pow com base clampada — a pauta (a) da revisão de olhos frescos. */
const GLSL_GUARDAS = /* glsl */ `
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
float linstep(float a, float b, float x) {
  return clamp((x - a) / (b - a), 0.0, 1.0);
}
`;

const TERRA_VERT = /* glsl */ `
varying vec3 vLocal; // posição na ESFERA UNITÁRIA (o raio mora na matriz)
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * OS UNIFORMS DO ECLIPSE num material de corpo resolvido (F2c/D3) — a
 * ponte cena→local é a transposta da base IAU (as MESMAS colunas que
 * levam o `uDirSolLocal`), e `derivaRad` desfaz o giro extra da casca
 * das nuvens (0 na superfície). Inativo: só o flag 0 é escrito — os
 * vetores antigos nunca são lidos, o chunk retorna 1 antes de tocá-los.
 * Exportada para a Lua (o molde compartilhado dos corpos, F2b).
 */
export function escreverSombraDeEclipse(
  u: Record<string, THREE.IUniform>,
  s: SombraNaCena,
  vX: THREE.Vector3,
  vY: THREE.Vector3,
  vZ: THREE.Vector3,
  derivaRad: number
) {
  u.uEclipseAtivo.value = s.ativo ? 1 : 0;
  if (!s.ativo) return;
  const [ex, ey, ez] = s.eixoCena;
  const [ox, oy, oz] = s.eclipsadorRaios;
  // cena → local: cada componente é o dot com a coluna da base
  let eixoLx = ex * vX.x + ey * vX.y + ez * vX.z;
  const eixoLy = ex * vY.x + ey * vY.y + ez * vY.z;
  let eixoLz = ex * vZ.x + ey * vZ.y + ez * vZ.z;
  let occLx = ox * vX.x + oy * vX.y + oz * vX.z;
  const occLy = ox * vY.x + oy * vY.y + oz * vY.z;
  let occLz = ox * vZ.x + oy * vZ.y + oz * vZ.z;
  if (derivaRad !== 0) {
    // a casca das nuvens tem o frame RODADO pela deriva: desfaz Ry(θ),
    // a mesma conta do uDirSolLocal das nuvens
    const cosD = Math.cos(derivaRad);
    const sinD = Math.sin(derivaRad);
    [eixoLx, eixoLz] = [eixoLx * cosD - eixoLz * sinD, eixoLx * sinD + eixoLz * cosD];
    [occLx, occLz] = [occLx * cosD - occLz * sinD, occLx * sinD + occLz * cosD];
  }
  (u.uEclipseEixo.value as THREE.Vector3).set(eixoLx, eixoLy, eixoLz);
  (u.uEclipseEclipsador.value as THREE.Vector3).set(occLx, occLy, occLz);
  (u.uEclipseCone.value as THREE.Vector3).set(
    s.raioEclipsadorRaios,
    s.inclinacaoUmbra,
    s.inclinacaoPenumbra
  );
  (u.uEclipsePisoCor.value as THREE.Vector3).set(
    s.pisoUmbral[0],
    s.pisoUmbral[1],
    s.pisoUmbral[2]
  );
  u.uEclipsePisoEscalar.value = s.minSombra;
}

/** Os uniforms do eclipse com defaults NEUTROS — nascem em todo material
 *  de superfície resolvida (Terra, nuvens, Lua). */
export function uniformsDeEclipseNeutros(): Record<string, THREE.IUniform> {
  return {
    uEclipseAtivo: { value: 0 },
    uEclipseEixo: { value: new THREE.Vector3(1, 0, 0) },
    uEclipseEclipsador: { value: new THREE.Vector3(0, 0, 1) },
    uEclipseCone: { value: new THREE.Vector3(0, 0, 0) },
    uEclipsePisoCor: { value: new THREE.Vector3(0, 0, 0) },
    uEclipsePisoEscalar: { value: 1 },
  };
}

/**
 * A SUPERFÍCIE. Dia (albedo × N·L), noite (linstep no terminador
 * GEOMÉTRICO — o espec do doador: smoothstep vazava 16% no lado diurno),
 * relevo (normal map em TBN analítica da esfera lat-long, com guarda de
 * polo) e o especular do oceano: dielétrico F0 = 0,04, o caso
 * metalness = 0 do fluxo PBR (CALIBRACAO_ATLAS — rocha e água não são
 * condutores; não existe ramo de condutor neste shader).
 *
 * `uLuzGanho` multiplica SÓ a componente direta; as luzes de cidade são
 * emissão e ficam fora. Não existe termo ambiente. O ECLIPSE (F2c/D3)
 * entra pelo chunk único da lib e multiplica SÓ a direta, depois do
 * BRDF — as luzes de cidade ficam fora da sombra também.
 *
 * Exportado (como LUA_FRAG) para o needle-teste da F2c ler o shader
 * montado, não o texto-fonte.
 */
export const TERRA_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform sampler2D uMapaNoite;
uniform sampler2D uMapaNormal;
uniform sampler2D uMapaRugosidade;
uniform vec3 uDirSolLocal;  // corpo→Sol, frame LOCAL do globo (unitário)
uniform vec3 uCamLocal;     // câmera no frame local, em raios equatoriais
uniform float uLuzGanho;    // ganhoFundido(dUA, política) — O escalar único
uniform float uNoiteGanho;  // EARTH_NIGHT_LIGHT_INTENSITY (emissão)
uniform vec3 uNormalEsc;    // (1, a/c, 1): normal do elipsoide escalado
uniform vec3 uEscalaLocal;  // (1, c/a, 1): ponto real do elipsoide
varying vec3 vLocal;
varying vec2 vUv;
${GLSL_GUARDAS}
${GLSL_SOMBRA_ECLIPSE}
void main() {
  vec3 n = normSeguro(vLocal * uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;

  // TBN analítica da esfera lat-long; no polo (leste degenerado) o
  // relevo cede ao normal geométrico em vez de dividir por ~0.
  vec3 leste = vec3(n.z, 0.0, -n.x);
  float lLeste = length(leste);
  vec3 nRelevo = n;
  if (lLeste > 1.0e-4) {
    leste /= lLeste;
    vec3 norte = cross(n, leste);
    vec3 tn = texture2D(uMapaNormal, vUv).xyz * 2.0 - 1.0;
    nRelevo = normSeguro(leste * tn.x + norte * tn.y + n * tn.z);
  }

  float ndotlGeo = dot(n, uDirSolLocal);          // terminador geométrico
  float ndotl = max(dot(nRelevo, uDirSolLocal), 0.0);
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;

  // especular do oceano: Blinn-Phong normalizado com Fresnel de Schlick,
  // brilho derivado do mapa de rugosidade (clampado — pow nunca vê base
  // fora de [0,1] nem expoente <= 0)
  vec3 v = normSeguro(uCamLocal - pElip);
  vec3 h = normSeguro(uDirSolLocal + v);
  float rug = clamp(texture2D(uMapaRugosidade, vUv).r, 0.05, 1.0);
  float brilho = max(2.0 / max(rug * rug, 4.0e-4) - 2.0, 1.0e-2);
  float ndoth = clamp(dot(nRelevo, h), 0.0, 1.0);
  float dEspec = pow(ndoth, brilho) * (brilho + 8.0) * 0.03978873; // /(8π)
  float vdoth = clamp(dot(v, h), 0.0, 1.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - vdoth, 5.0);
  float espec = dEspec * fresnel * ndotl;

  vec3 direta =
    (albedo * ndotl + vec3(espec)) * uLuzGanho * fatorDeEclipse(pElip, n, ndotlGeo);

  // luzes noturnas: EMISSÃO — só no lado escuro, pelo linstep do espec
  // (o smoothstep do doador vazava 16% no lado diurno), fora do ganho.
  float mascaraNoite = linstep(-0.1, 0.1, -ndotlGeo);
  vec3 luzes = texture2D(uMapaNoite, vUv).rgb * (mascaraNoite * uNoiteGanho);

  gl_FragColor = vec4(direta + luzes, 1.0);
}
`;

/**
 * AS NUVENS — casca própria a +0,15% do raio, translúcida, com o
 * terminador do espec do doador (linstep −0,25→0,12 e piso noturno 0,03,
 * só das nuvens) multiplicado pelo MESMO uLuzGanho de tudo. O eclipse é
 * o MESMO da superfície (a casca está 0,15% acima — a geometria do cone
 * é idêntica dentro de sub-pixel): uma nuvem dentro da umbra escurece
 * junto com o oceano embaixo dela.
 */
const NUVENS_FRAG = /* glsl */ `
uniform sampler2D uMapaNuvens;
uniform vec3 uDirSolLocal; // no frame DA CASCA (a deriva é da CPU)
uniform float uLuzGanho;
varying vec3 vLocal;
varying vec2 vUv;
${GLSL_GUARDAS}
${GLSL_SOMBRA_ECLIPSE}
void main() {
  float cobertura = texture2D(uMapaNuvens, vUv).r;
  vec3 n = normSeguro(vLocal);
  float ndotl = dot(n, uDirSolLocal);
  float dia = max(
    linstep(${NUVEM_TERMINADOR.lo.toFixed(2)}, ${NUVEM_TERMINADOR.hi.toFixed(2)}, ndotl),
    ${NUVEM_TERMINADOR.pisoNoturno.toFixed(2)}
  );
  vec3 sombra = fatorDeEclipse(vLocal * ${RAZAO_CASCA_NUVENS}, n, ndotl);
  gl_FragColor = vec4(vec3(dia * uLuzGanho) * sombra, cobertura);
}
`;

const ATMOSFERA_VERT = /* glsl */ `
varying vec3 vPosRaios; // ponto da casca externa, em raios equatoriais
void main() {
  vPosRaios = position * ${RAZAO_CASCA_ATMOSFERA};
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * A ATMOSFERA — Rayleigh + Mie por scattering simples (Nishita via a
 * formulação de O'Neil, GPU Gems 2), reescrita com as constantes do
 * espec do doador. O polinômio `escalaOtica` só é válido para
 * scaleDepth 0,25 e casca 1,025 — os DOIS números estão pinados nas
 * constantes exportadas. Tudo em unidades de raio equatorial, frame
 * local: nenhum número da cena (1e-10 pc) entra aqui.
 */
const ATMOSFERA_FRAG = /* glsl */ `
uniform vec3 uCamLocal;
uniform vec3 uDirSolLocal;
uniform float uLuzGanho;
varying vec3 vPosRaios;
${GLSL_GUARDAS}
const float RAIO_INT = 1.0;
const float RAIO_EXT = ${RAZAO_CASCA_ATMOSFERA};
const float ESCALA = ${(1 / (RAZAO_CASCA_ATMOSFERA - 1)).toFixed(1)};
const float PROF = ${ATMOSFERA.scaleDepth};
const float ESCALA_SOBRE_PROF = ${(1 / (RAZAO_CASCA_ATMOSFERA - 1) / ATMOSFERA.scaleDepth).toFixed(1)};
const float KR = ${ATMOSFERA.kRayleigh};
const float KM = ${ATMOSFERA.kMie};
const float E_SUN = ${ATMOSFERA.eSun.toFixed(1)};
const float G = ${ATMOSFERA.g};
const float G2 = ${(ATMOSFERA.g * ATMOSFERA.g).toFixed(4)};
const float QUATRO_PI = 12.566371;
const vec3 INV_LAMBDA4 = vec3(
  ${(1 / ATMOSFERA.comprimentosDeOnda[0] ** 4).toFixed(5)},
  ${(1 / ATMOSFERA.comprimentosDeOnda[1] ** 4).toFixed(5)},
  ${(1 / ATMOSFERA.comprimentosDeOnda[2] ** 4).toFixed(5)}
);

// profundidade óptica de O'Neil — válida SÓ para PROF 0,25 / casca 1,025
float escalaOtica(float fCos) {
  float x = 1.0 - fCos;
  return PROF * exp(-0.00287 + x * (0.459 + x * (3.83 + x * (-6.80 + x * 5.25))));
}

void main() {
  vec3 raio = vPosRaios - uCamLocal;
  float fim = length(raio);
  raio /= max(fim, 1.0e-6);

  // entrada do raio na casca externa; câmera DENTRO dela começa nela
  // (max com 0 — sem ramo separado, sem NaN: o det já vem clampado)
  float b = 2.0 * dot(uCamLocal, raio);
  float c = dot(uCamLocal, uCamLocal) - RAIO_EXT * RAIO_EXT;
  float det = max(0.0, b * b - 4.0 * c);
  float perto = max(0.5 * (-b - sqrt(det)), 0.0);

  vec3 inicio = uCamLocal + raio * perto;
  float comprimento = max(fim - perto, 0.0);
  float alturaInicio = max(length(inicio), 1.0e-6);
  float angInicio = dot(raio, inicio) / alturaInicio;
  float offsetInicio = exp(-1.0 / PROF) * escalaOtica(angInicio);

  float passo = comprimento / float(${ATMOSFERA.amostras});
  float passoEscalado = passo * ESCALA;
  vec3 passoVec = raio * passo;
  vec3 ponto = inicio + passoVec * 0.5;
  vec3 acumulada = vec3(0.0);
  for (int i = 0; i < ${ATMOSFERA.amostras}; i++) {
    float altura = max(length(ponto), 1.0e-6);
    float prof = exp(ESCALA_SOBRE_PROF * (RAIO_INT - altura));
    float angLuz = dot(uDirSolLocal, ponto) / altura;
    float angCam = dot(raio, ponto) / altura;
    float dispersao = clamp(
      offsetInicio + prof * (escalaOtica(angLuz) - escalaOtica(angCam)),
      0.0, 50.0
    );
    vec3 atenua = exp(-dispersao * (INV_LAMBDA4 * (KR * QUATRO_PI) + KM * QUATRO_PI));
    acumulada += atenua * (prof * passoEscalado);
    ponto += passoVec;
  }

  float fCos = dot(uDirSolLocal, raio);
  float faseR = 0.75 * (1.0 + fCos * fCos);
  float faseM = 1.5 * ((1.0 - G2) / (2.0 + G2)) * (1.0 + fCos * fCos)
    / pow(max(1.0 + G2 - 2.0 * G * fCos, 1.0e-4), 1.5);
  vec3 rayleigh = acumulada * (INV_LAMBDA4 * (KR * E_SUN));
  vec3 mie = acumulada * (KM * E_SUN);
  gl_FragColor = vec4((faseR * rayleigh + faseM * mie) * uLuzGanho, 1.0);
}
`;

// ------------------------------------------------------------
// A classe
// ------------------------------------------------------------

/** O que o Director entrega por tick. */
export interface QuadroDaTerra {
  /** jd TDB grampeado do Director — o relógio único da casa. */
  jdTdb: number;
  /** a efeméride viva, ou null (retrato congelado — o "sem rede"). */
  fonte: FonteDeEfemerides | null;
  camPosPc: THREE.Vector3;
  screenHPx: number;
  fovDeg: number;
  /** a porta ?corpos/?nocorpos, escrita pelo Director antes do tick. */
  ligado: boolean;
  /** fase atlas: pré-aquece a carga de textura (gatilho 2 do contrato). */
  atlasQuente: boolean;
  politica: PoliticaDeLuz;
  /** dt do quadro em segundos — só a rampa temporal da cessão o consome
   *  (o clamp de picos mora em `stepRampToward`, nunca aqui). */
  dtS: number;
  /** a PSF do campo (`StarField` publica) — o halo do ponto sai dela. */
  psf: PsfDoCampo;
  /** a câmera SALTOU neste quadro (portal, enquadramento, ?pos=): a
   *  cessão faz snap para o alvo em vez de animar através do salto —
   *  cicatriz "reset no salto de foco" do crossfade da Onda 3. */
  salto: boolean;
}

/** O que o tick devolve — o Director registra no palco e escreve a cessão. */
export interface EstadoDaTerra {
  /** mesh visível NESTE quadro (gate armado + textura pronta + ligado). */
  emQuadro: boolean;
  /** fetch de manifest/textura em voo — segura o sinal de captura. */
  carregando: boolean;
  /**
   * O GATE está ARMADO — o corpo DEVIA estar na tela, com ou sem
   * textura. Armado sem `emQuadro` e sem `carregando` é o FALLBACK FRIO
   * (textura que desistiu): o `captura` do Director segura a prontidão
   * nesse estado em vez de fotografar o ponto fingindo globo (auditoria
   * item 5b; precedente `sun.assentado`).
   */
  gateArmado: boolean;
  /**
   * A CESSÃO SUAVE do ponto da camada planetas (F2b/D5): 0 = ponto
   * inteiro, 1 = ponto apagado, contínua no meio — g(razão de
   * dominância) integrada no tempo por `stepRampToward`. 0 EXATO com o
   * mesh fora de quadro (fator (1 − aCede) = 1 em IEEE754 — é o que
   * mantém as vistas profundas bit-idênticas) e 1 EXATO com o globo
   * dominando (r ≥ 2,5 — o estado das vistas `terra`/`terranb`).
   */
  cede: number;
  /** a cessão ainda está ANDANDO rumo ao alvo — imagem mudando por
   *  construção; o Director zera a contagem de estabilidade enquanto
   *  isto for true. */
  emRampa: boolean;
  raioPc: number;
  /** centro em pc na cena — referência VIVA, só leitura. */
  centroPc: THREE.Vector3;
  diametroPx: number;
}

export interface OpcoesDaTerra {
  tier: QualityLevel;
  maxTextureSize?: number;
  /** BASE_URL do vite — o Director injeta; teste injeta ''. */
  base: string;
  /** injeção de teste; default = detectarWebp() no primeiro uso. */
  webp?: boolean;
  /** injeção de teste do fetch do manifest. */
  buscarManifest?: (url: string) => Promise<ManifestDeTexturas>;
  /** injeção de teste do loader de imagem. */
  carregarTextura?: (url: string) => Promise<THREE.Texture>;
}

type EstadoDasTexturas = 'fria' | 'buscando' | 'pronta' | 'falhou';

export class TerraResolvida {
  /** o nó do palco — o Director pendura em `palco.group`. */
  readonly group = new THREE.Group();

  /** centro em pc (float64 no JS — a matriz nasce em CPU). */
  private readonly centro = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private jdEscrito = Number.NaN;
  /** a FONTE do último cálculo entra na chave do cache: a efeméride
   *  chega TARDE (?jd= no boot) e o mesmo jd com fonte nova tem de
   *  recomputar — senão o globo ficaria no retrato para sempre. */
  private fonteEscrita: FonteDeEfemerides | null = null;
  private rUA = Number.NaN;
  private armado = false;

  /** a sombra do eclipse (F2c), resolvida no cache de jd/fonte —
   *  scratch único, preenchido por `resolveSombraNaCena` (out-parameter) */
  private readonly sombra = criaSombraNaCena();

  private texturas: EstadoDasTexturas = 'fria';
  /** recargas já gastas depois de falha — ver RECARGAS_ATE_DESISTIR */
  private recargas = 0;
  private readonly texturasVivas: THREE.Texture[] = [];
  private disposto = false;

  private geometria: THREE.SphereGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private nuvens: THREE.Mesh | null = null;
  private atmosfera: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;
  private matNuvens: THREE.ShaderMaterial | null = null;
  private matAtmosfera: THREE.ShaderMaterial | null = null;

  // rascunhos reusados — zero alocação por quadro (M4 da casa)
  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vEscala = new THREE.Vector3();
  private readonly mRot = new THREE.Matrix4();
  private readonly estado: EstadoDaTerra;

  /** o estado do último tick, para quem enquadra (a escada, F2b) —
   *  somente leitura; o centro é a referência VIVA. */
  get estadoVivo(): Readonly<EstadoDaTerra> {
    return this.estado;
  }

  private readonly opcoes: OpcoesDaTerra;

  constructor(opcoes: OpcoesDaTerra) {
    this.opcoes = opcoes;
    // O fluxo metalness da casa entra como o caso ESPECIALIZADO
    // metalness = 0 (F0 = 0,04 dielétrico): este material não tem ramo
    // de condutor. Se a calibração central um dia mudar, isto vira erro
    // alto em vez de um shader silenciosamente errado.
    if (CALIBRACAO_ATLAS.DEFAULT_PLANET_METALNESS !== 0) {
      throw new Error(
        'terra.ts assume DEFAULT_PLANET_METALNESS = 0 (dielétrico puro); ' +
          'o ramo de condutor não existe neste shader'
      );
    }
    this.group.visible = false;
    this.estado = {
      emQuadro: false,
      carregando: false,
      gateArmado: false,
      cede: 0,
      emRampa: false,
      raioPc: RAIO_EQ_TERRA_PC,
      centroPc: this.centro,
      diametroPx: Number.NaN,
    };
  }

  /**
   * O TICK. Ordem: posição (cache por jd, como o `escreverInstante`) →
   * diâmetro aparente → gate binário → gatilho de textura → matrizes e
   * uniforms (só com o mesh em quadro). Devolve o estado para o Director
   * registrar a superfície no palco e escrever a cessão na camada de
   * planetas — a Terra não conhece nem o palco nem a camada.
   */
  atualizar(q: QuadroDaTerra): EstadoDaTerra {
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
      const p = posicaoDaTerraUA(q.jdTdb, q.fonte);
      this.rUA = Math.hypot(p.x, p.y, p.z);
      // a MESMA ponte de frame da camada de planetas (D1): uma rotação e
      // uma multiplicação — nenhum segundo caminho de comprimento.
      const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
      this.centro.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
      // O ECLIPSE (F2c/D3): o par da TABELA (earth ← moon), resolvido no
      // MESMO relógio do quadro e na MESMA base da efeméride. Sem fonte
      // viva não há Lua — e não há eclipse: o fator fica neutro.
      const eclipsadorId = PARES_DE_ECLIPSE.earth;
      if (q.fonte && eclipsadorId) {
        const pEcl = q.fonte.posicaoHeliocentrica(eclipsadorId, q.jdTdb);
        resolveSombraNaCena(
          'earth',
          [p.x, p.y, p.z],
          [pEcl.x, pEcl.y, pEcl.z],
          this.sombra
        );
      } else {
        this.sombra.ativo = false;
      }
    }

    const dPc = q.camPosPc.distanceTo(this.centro);
    const diametroPx = diametroAparentePx(
      RAIO_EQ_TERRA_PC,
      dPc,
      q.screenHPx,
      q.fovDeg
    );
    e.diametroPx = diametroPx;

    this.armado = gateBinario(this.armado, diametroPx);

    // O GATILHO da carga (lei 4 do cabeçalho): gate armado OU fase atlas.
    // Nunca outro caminho — o teste pina exatamente esta dupla.
    if (this.texturas === 'fria' && (this.armado || q.atlasQuente)) {
      this.iniciarCarga();
    }

    const emQuadro = this.armado && q.ligado && this.texturas === 'pronta';
    e.emQuadro = emQuadro;
    e.carregando = this.texturas === 'buscando';
    e.gateArmado = this.armado;
    this.group.visible = emQuadro;

    // A CESSÃO SUAVE (F2b/D5). O halo do ponto sai do ESPELHO da PSF com
    // a magnitude que a camada de planetas está desenhando AGORA — mesma
    // base (efeméride viva quando há fonte, retrato quando não há),
    // mesma fase Lambertiana, mesma exposição do campo. A razão
    // mesh/halo vira alvo por g(r) e o alvo vira estado por
    // `stepRampToward` (clamp de dt lá dentro); salto de foco (portal,
    // enquadramento, ?pos=) ou de data faz SNAP — animar um crossfade
    // através de um teletransporte é mentir movimento que não houve.
    const base = q.fonte
      ? aMagBaseDe(FOTOMETRIA.earth.H, this.rUA) + DESLOCAMENTO_UA_PARA_PC
      : A_MAG_BASE_PC.earth;
    const fase = faseDoVertice(
      this.centro.x, this.centro.y, this.centro.z,
      q.camPosPc.x, q.camPosPc.y, q.camPosPc.z
    );
    const halo = psfPointSizePx(
      magDoVertice(base, dPc, fase),
      q.psf.expoM0,
      q.psf.sigmaPx,
      q.screenHPx
    );
    const alvo = cessaoAlvo(emQuadro, diametroPx, halo);
    e.cede =
      q.salto || saltoDeData
        ? alvo
        : stepRampToward(e.cede, alvo, q.dtS, RAMP_DURATION_MS);
    e.emRampa = e.cede !== alvo;

    if (emQuadro) this.posicionar(q);
    return e;
  }

  /** matrizes + uniforms do quadro — só roda com o mesh em quadro. */
  private posicionar(q: QuadroDaTerra) {
    const { colunaX, colunaY, colunaZ, wRad } = orientacaoDaTerraNaCena(this.jdEscrito);
    this.vX.set(colunaX[0], colunaX[1], colunaX[2]);
    this.vY.set(colunaY[0], colunaY[1], colunaY[2]);
    this.vZ.set(colunaZ[0], colunaZ[1], colunaZ[2]);

    const sup = this.superficie!;
    sup.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.set(RAIO_EQ_TERRA_PC, RAIO_POLAR_TERRA_PC, RAIO_EQ_TERRA_PC))
      .setPosition(this.centro);

    // nuvens: mesma base, giro EXTRA de (1,03 − 1)·W em torno do polo —
    // a deriva do espec, montada sobre o W desenrolado (nunca sobre um
    // ângulo enrolado; ver DERIVA_DAS_NUVENS).
    const derivaRad = (DERIVA_DAS_NUVENS - 1) * wRad;
    const nuv = this.nuvens!;
    nuv.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .multiply(this.mRot.makeRotationY(derivaRad))
      .scale(
        this.vEscala.set(
          RAIO_EQ_TERRA_PC * RAZAO_CASCA_NUVENS,
          RAIO_POLAR_TERRA_PC * RAZAO_CASCA_NUVENS,
          RAIO_EQ_TERRA_PC * RAZAO_CASCA_NUVENS
        )
      )
      .setPosition(this.centro);

    // atmosfera: casca ESFÉRICA declarada (o achatamento de 0,3% é
    // invisível no glow e pouparia o shader de um elipsoide inteiro)
    const atm = this.atmosfera!;
    atm.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.setScalar(RAIO_EQ_TERRA_PC * RAZAO_CASCA_ATMOSFERA))
      .setPosition(this.centro);

    // ---- frame local (CPU em float64): câmera em raios, Sol unitário
    const ganho = ganhoFundido(this.rUA, q.politica);

    // direção Terra→Sol na cena: o Sol é a ORIGEM (−centro normalizado)
    const dirSol = this.vTmp.copy(this.centro).multiplyScalar(-1);
    const norma = Math.max(dirSol.length(), 1e-30);
    dirSol.multiplyScalar(1 / norma);
    const sLx = dirSol.dot(this.vX);
    const sLy = dirSol.dot(this.vY);
    const sLz = dirSol.dot(this.vZ);

    const delta = this.vTmp.copy(q.camPosPc).sub(this.centro);
    const cLx = delta.dot(this.vX) / RAIO_EQ_TERRA_PC;
    const cLy = delta.dot(this.vY) / RAIO_EQ_TERRA_PC;
    const cLz = delta.dot(this.vZ) / RAIO_EQ_TERRA_PC;

    const uS = this.matSuperficie!.uniforms;
    (uS.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (uS.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    uS.uLuzGanho.value = ganho;
    // a sombra do eclipse (F2c) — resolvida no cache de jd; aqui só vira
    // uniform, no frame local pela mesma base do uDirSolLocal
    escreverSombraDeEclipse(uS, this.sombra, this.vX, this.vY, this.vZ, 0);

    // a casca das nuvens tem o frame RODADO pela deriva: desfaz Ry(θ)
    const cosD = Math.cos(derivaRad);
    const sinD = Math.sin(derivaRad);
    const uN = this.matNuvens!.uniforms;
    (uN.uDirSolLocal.value as THREE.Vector3).set(
      sLx * cosD - sLz * sinD,
      sLy,
      sLx * sinD + sLz * cosD
    );
    uN.uLuzGanho.value = ganho;
    escreverSombraDeEclipse(uN, this.sombra, this.vX, this.vY, this.vZ, derivaRad);

    const uA = this.matAtmosfera!.uniforms;
    (uA.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (uA.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    uA.uLuzGanho.value = ganho;
  }

  /** geometria + materiais + meshes, UMA vez, na primeira necessidade. */
  private garantirCascas() {
    if (this.geometria || this.disposto) return;
    // uma geometria unitária para as três cascas — o raio mora na matriz
    this.geometria = new THREE.SphereGeometry(1, 128, 64);

    const achat = RAIO_POLAR_TERRA_PC / RAIO_EQ_TERRA_PC;
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: TERRA_VERT,
      fragmentShader: TERRA_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        uMapaNoite: { value: null },
        uMapaNormal: { value: null },
        uMapaRugosidade: { value: null },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        uNoiteGanho: { value: CALIBRACAO_ATLAS.EARTH_NIGHT_LIGHT_INTENSITY },
        uNormalEsc: { value: new THREE.Vector3(1, 1 / achat, 1) },
        uEscalaLocal: { value: new THREE.Vector3(1, achat, 1) },
        ...uniformsDeEclipseNeutros(),
      },
      // a composição da F0: o corpo resolvido é OPACO e escreve o único
      // depth da casa — a lista opaca desenha antes da transparente por
      // construção do three.
      depthWrite: true,
      depthTest: true,
      transparent: false,
    });
    this.superficie = new THREE.Mesh(this.geometria, this.matSuperficie);
    this.superficie.matrixAutoUpdate = false;

    this.matNuvens = new THREE.ShaderMaterial({
      vertexShader: TERRA_VERT,
      fragmentShader: NUVENS_FRAG,
      uniforms: {
        uMapaNuvens: { value: null },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uLuzGanho: { value: 1 },
        ...uniformsDeEclipseNeutros(),
      },
      // translúcida SOBRE a superfície: testa o depth do globo, nunca o
      // escreve (decisão do palco, F0)
      depthWrite: false,
      depthTest: true,
      transparent: true,
    });
    this.nuvens = new THREE.Mesh(this.geometria, this.matNuvens);
    this.nuvens.matrixAutoUpdate = false;
    this.nuvens.renderOrder = 8;

    this.matAtmosfera = new THREE.ShaderMaterial({
      vertexShader: ATMOSFERA_VERT,
      fragmentShader: ATMOSFERA_FRAG,
      uniforms: {
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uLuzGanho: { value: 1 },
      },
      // aditiva, face de TRÁS (o desenho clássico do sky-from-space):
      // o fragmento é a SAÍDA do raio da casca, então o caminho
      // integrado é a corda inteira da atmosfera — na face da frente o
      // fragmento É a entrada e o caminho colapsa a zero (medido nesta
      // fase: limbo de 2/255, atmosfera invisível). Sobre o disco os
      // fragmentos de trás morrem no depth da superfície (depthTest
      // true): o que sobra é o anel de limbo, azul-dominante e fino —
      // a dose honesta. Nunca escreve depth.
      // ECLIPSE (F2c): a atmosfera NÃO recebe o fator — omissão
      // declarada. Sobre o disco o depth da superfície a mata; o anel
      // de limbo fica a ≥ ~6.000 km do eixo da sombra nos pares da
      // tabela (além da penumbra, ~3.400 km) — fora da sombra em toda
      // geometria alcançável. O cobre de Danjon do eclipse lunar nasce
      // no shader da LUA (o piso umbral da lib), não aqui.
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      side: THREE.BackSide,
    });
    this.atmosfera = new THREE.Mesh(this.geometria, this.matAtmosfera);
    this.atmosfera.matrixAutoUpdate = false;
    this.atmosfera.renderOrder = 9;

    this.group.add(this.superficie, this.nuvens, this.atmosfera);
  }

  /** a carga preguiçosa — manifest, escada por tier, cinco canais. */
  private iniciarCarga() {
    this.texturas = 'buscando';
    const { base, tier, maxTextureSize } = this.opcoes;
    const buscar =
      this.opcoes.buscarManifest ??
      (async (url: string): Promise<ManifestDeTexturas> => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json() as Promise<ManifestDeTexturas>;
      });
    const carregar =
      this.opcoes.carregarTextura ??
      ((url: string) => new THREE.TextureLoader().loadAsync(url));
    const webpOk = this.opcoes.webp ?? detectarWebp();

    void (async () => {
      const manifest = await buscar(`${base}data/atlas/texturas.json`);
      const texturas = await Promise.all(
        CANAIS_DA_TERRA.map(async (canal) => {
          // o alvo é POR CANAL — a dose de VRAM mora em `alvoDePixels`
          const alvo = alvoDePixels(tier, canal, maxTextureSize);
          const variante = escolherVariante(manifest.entradas, 'earth', canal, alvo, webpOk);
          if (!variante) throw new Error(`terra sem variante para '${canal}' ≤ ${alvo}px`);
          const tex = await carregar(`${base}${variante.arquivo}`);
          // cor em sRGB (o sampler decodifica para linear); dado
          // (normal/roughness) fica linear. Wrap REPEAT em U — a emenda
          // 0/360 do mapa equiretangular fecha sem risca de mipmap.
          if (canal === 'map' || canal === 'night' || canal === 'clouds') {
            tex.colorSpace = THREE.SRGBColorSpace;
          }
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.anisotropy = 4;
          return { canal, tex };
        })
      );
      if (this.disposto) {
        for (const { tex } of texturas) tex.dispose();
        return;
      }
      this.garantirCascas();
      const porCanal = new Map(texturas.map((t) => [t.canal, t.tex]));
      const uS = this.matSuperficie!.uniforms;
      uS.uMapaDia.value = porCanal.get('map');
      uS.uMapaNoite.value = porCanal.get('night');
      uS.uMapaNormal.value = porCanal.get('normal');
      uS.uMapaRugosidade.value = porCanal.get('roughness');
      this.matNuvens!.uniforms.uMapaNuvens.value = porCanal.get('clouds');
      this.texturasVivas.push(...texturas.map((t) => t.tex));
      this.texturas = 'pronta';
    })().catch(() => {
      if (this.disposto) return;
      // UMA falha não é sentença (auditoria item 6): volta a 'fria' e o
      // MESMO gatilho de sempre (gate armado ou fase atlas) rearma a
      // carga no tick seguinte — até RECARGAS_ATE_DESISTIR. Só então
      // 'falhou' é terminal: o globo não nasce, o PONTO continua com a
      // fotometria certa (degradação honesta), e o aviso único deixa a
      // falha legível — a captura da vista terra REPROVA em vez de
      // fingir (o `captura` do Director segura com o gate armado a frio).
      if (this.recargas < RECARGAS_ATE_DESISTIR) {
        this.recargas++;
        this.texturas = 'fria';
      } else {
        this.texturas = 'falhou';
        console.warn(
          `[terra] carga de texturas falhou ${1 + RECARGAS_ATE_DESISTIR}×; o globo não nasce nesta sessão`
        );
      }
    });
  }

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    this.matNuvens?.dispose();
    this.matAtmosfera?.dispose();
    for (const t of this.texturasVivas) t.dispose();
    this.texturasVivas.length = 0;
  }
}
