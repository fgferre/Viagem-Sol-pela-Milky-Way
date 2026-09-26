// Serve: dono — o contrato heliocêntrico→cena da poeira medida (E1/E2) não desalinha do galactocêntrico que o resto da cartografia já usa
// PROVA POR DOIS CAMINHOS (PLAN.md, E2 item 2): `helioGalacticoParaCena`
// converte direto (xh,yh,zh → cena); a rota independente vai por
// `heliocentricGalacticToProject` (scripts/data/lib/galactic.mjs,
// vendorizada aqui — mesmo precedente de kepler.test.ts, que também
// vendoriza em vez de importar um .mjs de scripts/ dentro de src/) e
// depois `galactocentricToScene`. As duas nascem de medidas físicas
// diferentes (EX/EY/EZ vs R_SUN/sunHeightPc) e só concordam se o
// contrato de eixos (xh→centro, yh→l=90°, zh→norte) e o sinal de Y
// (EY aponta para l=270°) estiverem certos ao mesmo tempo.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { galactocentricToScene, helioGalacticoParaCena } from './baseGalactica';

const DEG = Math.PI / 180;

// Vendorizado de scripts/data/lib/galactic.mjs (GALACTIC_FRAME +
// heliocentricGalacticToProject) — mesmos números.
const R_SUN_PC = 8_150;
const SUN_HEIGHT_PC = 5.5;

function heliocentricGalacticToProjectVendorizado(
  glonDeg: number,
  glatDeg: number,
  distancePc: number
): [number, number, number] {
  const longitude = glonDeg * DEG;
  const latitude = glatDeg * DEG;
  const inPlaneDistance = distancePc * Math.cos(latitude);
  return [
    R_SUN_PC - inPlaneDistance * Math.cos(longitude),
    -inPlaneDistance * Math.sin(longitude),
    SUN_HEIGHT_PC + distancePc * Math.sin(latitude),
  ];
}

/** (l, b, d) → heliocêntrico galáctico CONVENCIONAL: xh→centro galáctico
 *  (l=0,b=0), yh→l=90°, zh→polo norte — o mesmo referencial do manifesto
 *  de `public/data/galaxy` (ex. `dustVolumeNear20pc`). */
function paraHeliocentrico(glonDeg: number, glatDeg: number, distancePc: number) {
  const lon = glonDeg * DEG;
  const lat = glatDeg * DEG;
  const planoPc = distancePc * Math.cos(lat);
  return {
    xh: planoPc * Math.cos(lon),
    yh: planoPc * Math.sin(lon),
    zh: distancePc * Math.sin(lat),
  };
}

/** rota independente: (l,b,d) → galactocêntrico do projeto (vendorizada) → cena */
function rotaIndependente(glonDeg: number, glatDeg: number, distancePc: number): THREE.Vector3 {
  const [lx, ly, lz] = heliocentricGalacticToProjectVendorizado(glonDeg, glatDeg, distancePc);
  return galactocentricToScene(lx, ly, lz, new THREE.Vector3());
}

describe('helioGalacticoParaCena — o contrato do manifesto por dois caminhos (E2)', () => {
  it.each([
    ['Touro', 172, -14, 140],
    ['Ofiúco', 353, 17, 140],
  ] as const)('%s (l=%d°, b=%d°, d=%dpc): a mesma posição na cena pelas duas rotas', (_nome, l, b, d) => {
    const { xh, yh, zh } = paraHeliocentrico(l, b, d);
    const direto = helioGalacticoParaCena(xh, yh, zh);
    const indireto = rotaIndependente(l, b, d);
    expect(direto.distanceTo(indireto)).toBeLessThan(1e-3);
  });

  it('escreve no alvo passado, sem alocar um Vector3 novo', () => {
    const alvo = new THREE.Vector3();
    const devolvido = helioGalacticoParaCena(10, 0, 0, alvo);
    expect(devolvido).toBe(alvo);
  });
});
