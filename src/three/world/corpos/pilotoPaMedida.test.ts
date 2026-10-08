// Serve: lei — o piloto de Pã com a forma medida: a ponta mais comprida, lida do mapa de altura que o app carrega, aponta para Saturno
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eclipticaParaEquatorial } from '../../../lib/atlas/frameGalactico';
import { IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import { posicaoKepler } from '../../../lib/atlas/kepler';
import { direcaoLocalDeLonLat, orientacaoDoCorpoNaCena } from './orientacaoNaCena';
import { ENTRADAS_DA_PA_MEDIDA, orientacaoDoRochoso } from './pilotoPaMedida';

const RAD = Math.PI / 180;

describe('piloto de Pã (forma medida)', () => {
  it('a ponta de raio máximo do mapa de altura aponta para Saturno (< 5°) em três datas; sem o piloto, a orientação é a de sempre', async () => {
    const { default: sharp } = await import('sharp');
    const entrada = ENTRADAS_DA_PA_MEDIDA.find((e) => e.canal === 'height')!;
    const caminho = new URL(`../../../../public/${entrada.arquivo}`, import.meta.url);
    const { data, info } = await sharp(readFileSync(caminho)).greyscale().raw().toBuffer({ resolveWithObject: true });
    // a direção LOCAL da ponta: média dos texels no byte máximo, pela convenção da casa
    // (coluna 0 = 180°E, linha 0 = norte, `direcaoLocalDeLonLat`)
    let maior = 0;
    for (let k = 0; k < info.width * info.height; k++) maior = Math.max(maior, data[k * info.channels]);
    const ponta = [0, 0, 0];
    for (let k = 0; k < info.width * info.height; k++) {
      if (data[k * info.channels] !== maior) continue;
      const lon = ((k % info.width) + 0.5) * (360 / info.width) - 180;
      const lat = 90 - (Math.floor(k / info.width) + 0.5) * (180 / info.height);
      direcaoLocalDeLonLat(lon, lat).forEach((c, i) => (ponta[i] += c));
    }
    const norma = Math.hypot(...ponta);
    const local = ponta.map((c) => c / norma);

    // J2000, o sobrevoo da Cassini (07/03/2017) e 08/10/2026
    for (const jd of [2451545.0, 2457819.5, 2461321.5]) {
      const { colunaX, colunaY, colunaZ } = orientacaoDoCorpoNaCena(orientacaoDoRochoso('pan', true), jd);
      const naCena = [0, 1, 2].map((i) => local[0] * colunaX[i] + local[1] * colunaY[i] + local[2] * colunaZ[i]);
      const p = posicaoKepler('pan', jd);
      const doPai = eclipticaParaEquatorial([p.x, p.y, p.z]);
      const n = Math.hypot(...doPai);
      const cos = -(naCena[0] * doPai[0] + naCena[1] * doPai[1] + naCena[2] * doPai[2]) / n;
      expect(Math.acos(Math.min(1, cos)) / RAD, `JD ${jd}`).toBeLessThan(5);
    }
    expect(orientacaoDoRochoso('pan', false)).toBe(IAU_ORIENTATIONS.pan);
  });
});
