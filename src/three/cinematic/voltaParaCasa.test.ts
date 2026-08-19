// O JUIZ DA VOLTA PARA CASA (coda de 19/08).
//
// Duas coisas se cobram aqui, e nenhuma é estética:
//
// 1. OS VETORES PINADOS SÃO A EFEMÉRIDE. TERRA_PC e LUA_PC vivem como
//    literais no journey.ts (o roteiro é puro e não pode fazer fetch);
//    este arquivo recomputa os dois pela MESMA cadeia do app
//    (efemerides.bin → posicaoHeliocentrica → eclipticaParaEquatorial ×
//    AU_PARA_PC) na época pinada do céu e cobra igualdade bit a bit.
//    Se a época, a tabela ou o frame mudarem, quebra AQUI — antes de a
//    câmera chegar numa Terra que não está mais lá.
//
// 2. A ENCENAÇÃO QUE O DONO PEDIU É GEOMETRIA VERIFICÁVEL: raspão que
//    enche o quadro, Lua acesa no flanco, chegada pelo lado escuro,
//    pouso congelado no lado claro com a Terra grande e centrada.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../lib/atlas/efemerides';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../lib/atlas/frameGalactico';
import { EPOCA_JD_TDB } from '../world/planetas/retrato2026';
import { BODY_AXES } from '../../lib/atlas/iauOrientation';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';

// mesmo stub e mesma razão do cameraRig.test: journey puxa world/galaxy,
// que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { Journey, TERRA_PC, LUA_PC } = await import('./journey');

const DATA_DIR = fileURLToPath(new URL('../../../public/data/atlas/', import.meta.url));
const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    meta
  )
);

const cadeiaPc = (id: 'earth' | 'moon') => {
  const v = motor.posicaoHeliocentrica(id, EPOCA_JD_TDB);
  const eq = eclipticaParaEquatorial([v.x, v.y, v.z]);
  return [eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC];
};

const RAIO_TERRA_PC = (BODY_AXES.earth[0] / AU_KM) * AU_PARA_PC;
const RAIO_LUA_PC = (BODY_AXES.moon[0] / AU_KM) * AU_PARA_PC;
const grausEntre = (a: THREE.Vector3, b: THREE.Vector3) =>
  THREE.MathUtils.radToDeg(a.angleTo(b));
/** ângulo Sol–corpo–câmera: 0° = câmera do lado aceso, 180° = do escuro */
function faseVista(corpo: THREE.Vector3, cam: THREE.Vector3): number {
  const aoSol = corpo.clone().negate(); // o Sol é a origem da cena
  const aCamera = cam.clone().sub(corpo);
  return grausEntre(aoSol, aCamera);
}

const j = new Journey();
const T_CODA = j.duration - 15;

describe('os vetores pinados são a efeméride', () => {
  it('TERRA_PC e LUA_PC batem bit a bit com a cadeia na época pinada', () => {
    const terra = cadeiaPc('earth');
    const lua = cadeiaPc('moon');
    expect([TERRA_PC.x, TERRA_PC.y, TERRA_PC.z]).toEqual(terra);
    expect([LUA_PC.x, LUA_PC.y, LUA_PC.z]).toEqual(lua);
  });
});

describe('a encenação pedida, medida na trajetória', () => {
  // varredura fina da coda (passo 4 ms): raspão e chegada são rápidos
  const AMOSTRAS: { t: number; pos: THREE.Vector3 }[] = [];
  for (let t = T_CODA; t <= j.duration; t += 0.004) {
    AMOSTRAS.push({ t, pos: j.at(t).pos.clone() });
  }

  it('a coda parte do quadro congelado da deriva, sem salto', () => {
    const fimDaDeriva = j.at(T_CODA - 0.001).pos;
    const inicioDaCoda = j.at(T_CODA).pos;
    expect(inicioDaCoda.distanceTo(fimDaDeriva) / fimDaDeriva.length()).toBeLessThan(1e-12);
  });

  it('o raspão toca ~7 raios lunares e a Lua enche o quadro', () => {
    const menor = AMOSTRAS.reduce(
      (m, a) => Math.min(m, a.pos.distanceTo(LUA_PC)),
      Infinity
    );
    expect(menor).toBeGreaterThan(3.6e-10);
    expect(menor).toBeLessThan(4.4e-10);
    const diametroGraus = 2 * THREE.MathUtils.radToDeg(Math.atan(RAIO_LUA_PC / menor));
    expect(diametroGraus).toBeGreaterThan(14);
  });

  it('a Lua do raspão está acesa (flanco solar), não de costas', () => {
    const noRaspao = AMOSTRAS.reduce((m, a) =>
      a.pos.distanceTo(LUA_PC) < m.pos.distanceTo(LUA_PC) ? a : m
    );
    expect(faseVista(LUA_PC, noRaspao.pos)).toBeLessThan(100);
  });

  it('a volta chega pelo lado escuro e pousa no claro, com a Terra grande', () => {
    const chegada = j.at(j.duration - 5).pos; // início da volta
    expect(faseVista(TERRA_PC, chegada)).toBeGreaterThan(135);
    const fim = j.at(j.duration).pos;
    expect(faseVista(TERRA_PC, fim)).toBeLessThan(45);
    const d = fim.distanceTo(TERRA_PC);
    const diametroGraus = 2 * THREE.MathUtils.radToDeg(Math.atan(RAIO_TERRA_PC / d));
    expect(diametroGraus).toBeGreaterThan(19);
    expect(diametroGraus).toBeLessThan(23);
    expect(j.at(j.duration).look.distanceTo(TERRA_PC)).toBeLessThan(1e-12);
  });

  it('o filme termina CONGELADO na Terra (o pouso é antes do fim)', () => {
    const p1 = j.at(j.duration - 0.4).pos;
    const p2 = j.at(j.duration).pos;
    expect(p1.distanceTo(p2)).toBe(0);
  });
});
