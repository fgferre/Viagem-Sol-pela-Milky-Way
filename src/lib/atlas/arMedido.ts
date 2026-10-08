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
