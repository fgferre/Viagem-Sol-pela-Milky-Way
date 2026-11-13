import { describe, expect, it } from 'vitest';
import { EXPO_M0, SIGMA_PX } from '../luzDaCasa';
import { MAGNITUDE_DO_TETO_DA_ARTE, OCUPACAO_MAXIMA_DA_TELA } from './clarao';
import { DISTANCIA_DA_EXPOSICAO_PC, claraoDoPonto, magnitudeExposta } from './estrelasS';

describe('a luz das estrelas S', () => {
  it('a exposição põe S2 a 0,05 pc como Sirius de casa e guarda as razões físicas', () => {
    expect(magnitudeExposta(-3, DISTANCIA_DA_EXPOSICAO_PC, -3)).toBeCloseTo(MAGNITUDE_DO_TETO_DA_ARTE, 12);
    // 1 mag mais fraca e 10× mais longe: +1 e +5 magnitudes, como no céu de verdade
    expect(magnitudeExposta(-2, DISTANCIA_DA_EXPOSICAO_PC * 10, -3)).toBeCloseTo(MAGNITUDE_DO_TETO_DA_ARTE + 6, 12);
  });

  it('o clarão cresce com o brilho, para no teto de ocupação e apaga nas fracas', () => {
    const h = 800;
    const forte = claraoDoPonto(-20, EXPO_M0, SIGMA_PX, h);
    const media = claraoDoPonto(0, EXPO_M0, SIGMA_PX, h);
    const fraca = claraoDoPonto(8, EXPO_M0, SIGMA_PX, h);
    expect(forte.meiaPx).toBeCloseTo(OCUPACAO_MAXIMA_DA_TELA * h, 9);
    expect(media.meiaPx).toBeLessThan(forte.meiaPx);
    expect(media.ganho).toBeGreaterThan(0);
    expect(fraca.ganho).toBe(0);
  });
});
