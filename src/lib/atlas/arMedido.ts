// ============================================================
// O AR MEDIDO DA TERRA — a fonte única dos números do ar limpo que a
// luz do pôr do sol (o chão e as nuvens do modo "com profundidade"), o
// limbo desse modo e o Sol visto através do ar usam. A derivação e as
// citações moram no comentário de `GLSL_TRANSMITANCIA_DO_SOL`
// (terraShaders.ts); aqui ficam os números e o gêmeo em CPU.
// ============================================================
import { BODY_AXES } from './iauOrientation';

/** Os três comprimentos de onda (µm) do vermelho, verde e azul do ar. */
export const COMPRIMENTOS_DE_ONDA_UM = [0.65, 0.57, 0.475] as const;

/** Rayleigh medido ao nível do mar, Hansen & Travis (1974) / Bucholtz (1995). */
export const tauRayleighAoNivelDoMar = (lambdaUm: number) =>
  0.008569 * lambdaUm ** -4 * (1 + 0.0113 * lambdaUm ** -2 + 0.00013 * lambdaUm ** -4);

/** Altura de escala do Rayleigh (km). */
export const ALTURA_DE_ESCALA_KM = 8;

/** Raio do ar (km): o equatorial da Terra. */
export const RAIO_DO_AR_KM = BODY_AXES.earth[0];

/** e^(y²)·erfc(y), y ≥ 0, sem exponencial (A&S 7.1.26 até 3, 7.1.23 dali). */
export function erfcEscalada(y: number): number {
  if (y < 3) {
    const t = 1 / (1 + 0.3275911 * y);
    return t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  }
  const q = 1 / (y * y);
  return (0.5641895835 / y) * (1 - q * (0.5 - q * (0.75 - q * 1.875)));
}

/** Massa de ar de Chapman, x = (R + h)/H, mu = cos χ em [0, 1]. */
export function massaDeArDeChapman(x: number, mu: number): number {
  return Math.sqrt(1.5707963 * x) * erfcEscalada(Math.sqrt(0.5 * x) * mu);
}

const TAU = COMPRIMENTOS_DE_ONDA_UM.map(tauRayleighAoNivelDoMar);

/**
 * O SOL VISTO DE FORA ATRAVÉS DO AR: a transmitância de um raio que passa
 * rente à Terra com altura mínima `hMinKm` e atravessa o ar de fora a fora
 * (duas metades de Chapman a 90°). Sem normalizar: o Sol visto do espaço
 * por cima do ar vale 1. `hMinKm < 0` é o raio que bate na Terra — 0.
 */
export function transmitanciaDoRaioRasante(hMinKm: number): [number, number, number] {
  if (hMinKm < 0) return [0, 0, 0];
  const x = (RAIO_DO_AR_KM + hMinKm) / ALTURA_DE_ESCALA_KM;
  const caminho = Math.exp(-hMinKm / ALTURA_DE_ESCALA_KM) * 2 * massaDeArDeChapman(x, 0);
  return [Math.exp(-TAU[0] * caminho), Math.exp(-TAU[1] * caminho), Math.exp(-TAU[2] * caminho)];
}

/** Raio polar do globo desenhado (km): o elipsoide de BODY_AXES. */
const RAIO_POLAR_KM = BODY_AXES.earth[2];

/** Raio do elipsoide (km) na direção de seno de latitude geocêntrica `u`. */
function raioDoElipsoideKm(u: number): number {
  const a = RAIO_DO_AR_KM;
  const c = RAIO_POLAR_KM;
  return (a * c) / Math.sqrt(c * c * (1 - u * u) + a * a * u * u);
}

/** Abaixo desta altitude (km) a câmera estaria DENTRO do ar — ver a guarda. */
export const ALTITUDE_MINIMA_DA_CAMERA_KM = 100;

/** Faixas horizontais do disco solar na média do que fica acima do limbo. */
const FAIXAS_DO_DISCO = 32;

/**
 * O SOL VISTO DA CÂMERA ATRAVÉS DO AR: a transmitância da luz do disco
 * solar que ainda passa por cima da Terra. `v` = câmera − centro da Terra
 * (km), `s` = direção unitária câmera→centro do Sol, `polo` = eixo de
 * rotação unitário — tudo no mesmo referencial, em float64 —, e
 * `raioAngularDoSolRad` o raio aparente do disco.
 *
 * Raio que se afasta da Terra (v·s ≥ 0) devolve [1, 1, 1] EXATO, e é esse
 * o caso de toda vista longe dela; um disco que passa inteiro a mais de
 * ~300 km do chão também dá 1 exato (o caminho de ar vira 0 em float64).
 *
 * O DISCO, NÃO SÓ O CENTRO: a 1,15 raio o disco cobre ~17 km de altura
 * rasante, duas alturas de escala. Pelo raio central o Sol sumiria
 * inteiro (T = 0) com a metade de cima ainda acima do limbo. Aqui o disco
 * é cortado em faixas paralelas ao limbo; cada faixa tem a altura rasante
 * do raio dela, e o T é a média, pesada pela largura da faixa, das que
 * passam por cima do chão — a cor da parte que se vê (a de trás o globo
 * esconde pela profundidade). Sem escurecimento de limbo. Um disco todo
 * abaixo do limbo dá 0.
 *
 * A ALTURA É SOBRE O ELIPSOIDE do globo desenhado, não sobre o raio
 * equatorial: sobre os polos o chão fica 21 km mais baixo, e medir pelo
 * equador apagaria o Sol até ~0,3° antes de o globo cobri-lo.
 *
 * A GUARDA DA CÂMERA BAIXA: a conta assume a câmera FORA do ar (o raio
 * atravessa as duas metades). O Atlas para em 1,1 raio, bem acima; se a
 * câmera descer abaixo de `ALTITUDE_MINIMA_DA_CAMERA_KM`, as alturas
 * ficam presas em ≥ 0 — esta conta nunca apaga o Sol ali (quem o esconde
 * atrás do chão é a profundidade do globo), e o caminho sai superestimado,
 * nunca NaN.
 *
 * Fora do escopo, declarado: a refração (o Sol rente ao limbo sobe ~0,5° e
 * achata) e o gradiente de cor dentro do disco; aqui só a cor e a perda de
 * luz, uma por quadro.
 */
export function transmitanciaDoSolVisto(
  v: ArrayLike<number>,
  s: ArrayLike<number>,
  polo: ArrayLike<number>,
  raioAngularDoSolRad: number
): [number, number, number] {
  const b = v[0] * s[0] + v[1] * s[1] + v[2] * s[2];
  if (!(b < 0)) return [1, 1, 1];
  const qx = v[0] - b * s[0];
  const qy = v[1] - b * s[1];
  const qz = v[2] - b * s[2];
  const r = Math.hypot(qx, qy, qz);
  const uRasante = r > 0 ? (qx * polo[0] + qy * polo[1] + qz * polo[2]) / r : 0;
  const raioDoChao = raioDoElipsoideKm(uRasante);
  const dCam = Math.hypot(v[0], v[1], v[2]);
  const uCam = dCam > 0 ? (v[0] * polo[0] + v[1] * polo[1] + v[2] * polo[2]) / dCam : 0;
  const cameraNoAr = dCam - raioDoElipsoideKm(uCam) < ALTITUDE_MINIMA_DA_CAMERA_KM;
  // girar o raio de y no plano de v e s (y > 0 = para longe da Terra) leva
  // a distância rasante de r a r·cos y + L·sen y, com L = −b
  const rho = raioAngularDoSolRad > 0 ? raioAngularDoSolRad : 0;
  const n = rho > 0 ? FAIXAS_DO_DISCO : 1;
  const soma: [number, number, number] = [0, 0, 0];
  let peso = 0;
  for (let k = 0; k < n; k++) {
    const f = rho > 0 ? -1 + (2 * k + 1) / n : 0;
    const y = f * rho;
    const h = r * Math.cos(y) - b * Math.sin(y) - raioDoChao;
    const hKm = cameraNoAr ? Math.max(h, 0) : h;
    if (hKm < 0) continue;
    const w = Math.sqrt(1 - f * f);
    const t = transmitanciaDoRaioRasante(hKm);
    soma[0] += t[0] * w;
    soma[1] += t[1] * w;
    soma[2] += t[2] * w;
    peso += w;
  }
  if (!(peso > 0)) return [0, 0, 0];
  return [soma[0] / peso, soma[1] / peso, soma[2] / peso];
}
