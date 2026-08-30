// Serve: dono — a coda pousa em casa como ele pediu: raspão na Lua, chegada pelo escuro, Terra grande com os polos para cima
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
//    pouso congelado no lado claro com a Terra grande. Desde o item 108
//    ela pousa no TERÇO DE BAIXO, e não mais no centro: o último bloco
//    deste arquivo cobra o retrato de família — a Lua no quadro junto
//    com ela —, que é a razão do deslocamento.
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
const { Journey, TERRA_PC, LUA_PC, MIRA_DO_POUSO, JD_DO_FILME_TDB, K_LUA_NO_TAKE } =
  await import('./journey');
const { galacticUp } = await import('./cameraRig');

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
  const v = motor.posicaoHeliocentrica(id, JD_DO_FILME_TDB);
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
const T_CODA = j.duration - 17;

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
    expect(menor).toBeGreaterThan(3.1e-10);
    expect(menor).toBeLessThan(3.9e-10);
    const diametroGraus = 2 * THREE.MathUtils.radToDeg(Math.atan(RAIO_LUA_PC / menor));
    expect(diametroGraus).toBeGreaterThan(14);
    // o dono pediu um instante, não um piscar: ~1,5–2 s com ela grande
    const dezRaios = 10 * RAIO_LUA_PC;
    const perto = AMOSTRAS.filter((a) => a.pos.distanceTo(LUA_PC) < dezRaios);
    expect(perto.length * 0.004).toBeGreaterThan(1.4);
    expect(perto.length * 0.004).toBeLessThan(3.2);
  });

  it('a Lua do raspão está acesa (flanco solar), não de costas', () => {
    const noRaspao = AMOSTRAS.reduce((m, a) =>
      a.pos.distanceTo(LUA_PC) < m.pos.distanceTo(LUA_PC) ? a : m
    );
    expect(faseVista(LUA_PC, noRaspao.pos)).toBeLessThan(120);
  });

  it('no raspão a Lua fica DENTRO do quadro', () => {
    const noRaspao = AMOSTRAS.reduce((m, a) =>
      a.pos.distanceTo(LUA_PC) < m.pos.distanceTo(LUA_PC) ? a : m
    );
    const s = j.at(noRaspao.t);
    const camLua = LUA_PC.clone().sub(s.pos);
    const olhar = s.look.clone().sub(s.pos);
    expect(grausEntre(camLua, olhar)).toBeLessThan(s.fov * 0.45);
  });

  // A mira do take é MIRA_DO_POUSO (item 108): a Terra deslocada 11° pelo
  // norte da tela NO RAIO DO POUSO, para o retrato de família caber no
  // último quadro. É um PONTO EM MUNDO, então de longe ele e a Terra são o
  // mesmo alvo — a costura com o plano anterior (que mira a Terra) está
  // medida abaixo em graus, e é ela que garante que a troca não é um corte.
  it('o take começa e termina na mira do pouso — no joelho o olhar cede à Lua', () => {
    const tTake = j.duration - 12;
    const noRaspao = AMOSTRAS.reduce((m, a) =>
      a.pos.distanceTo(LUA_PC) < m.pos.distanceTo(LUA_PC) ? a : m
    );
    expect(j.at(tTake).look.distanceTo(MIRA_DO_POUSO)).toBeLessThan(1e-12);
    const noJoelho = j.at(noRaspao.t);
    const paraTerra = TERRA_PC.clone().sub(noJoelho.pos).normalize();
    const paraLua = LUA_PC.clone().sub(noJoelho.pos).normalize();
    const olhar = noJoelho.look.clone().sub(noJoelho.pos).normalize();
    expect(grausEntre(olhar, paraTerra)).toBeGreaterThan(20);
    expect(grausEntre(olhar, paraLua)).toBeLessThan(12);
    expect(j.at(j.duration).look.distanceTo(MIRA_DO_POUSO)).toBeLessThan(1e-12);
  });

  it('a troca de mira na costura dos dois planos da coda é invisível', () => {
    // o plano anterior mira a TERRA; o take mira MIRA_DO_POUSO. A troca só
    // vale porque, de 2,9 milhões de km, os dois pontos são o mesmo alvo.
    const antes = j.at(j.duration - 12 - 0.001);
    const depois = j.at(j.duration - 12 + 0.001);
    const salto = grausEntre(
      antes.look.clone().sub(antes.pos),
      depois.look.clone().sub(depois.pos)
    );
    expect(salto).toBeLessThan(0.2);
  });

  it('a volta chega pelo lado escuro e pousa no claro, com a Terra grande', () => {
    const chegada = j.at(j.duration - 12 * (1 - K_LUA_NO_TAKE)).pos; // início da volta
    expect(faseVista(TERRA_PC, chegada)).toBeGreaterThan(135);
    const fim = j.at(j.duration).pos;
    expect(faseVista(TERRA_PC, fim)).toBeLessThan(45);
    const d = fim.distanceTo(TERRA_PC);
    const diametroGraus = 2 * THREE.MathUtils.radToDeg(Math.atan(RAIO_TERRA_PC / d));
    expect(diametroGraus).toBeGreaterThan(19);
    expect(diametroGraus).toBeLessThan(23);
    expect(j.at(j.duration).look.distanceTo(MIRA_DO_POUSO)).toBeLessThan(1e-12);
  });

  it('o filme termina CONGELADO na Terra (o pouso é antes do fim)', () => {
    const p1 = j.at(j.duration - 0.4).pos;
    const p2 = j.at(j.duration).pos;
    expect(p1.distanceTo(p2)).toBe(0);
  });

  it('o instante da coda é 16:00 UTC do dia do retrato', () => {
    expect(JD_DO_FILME_TDB).toBe(EPOCA_JD_TDB + 16 / 24);
  });

  it('o último quadro tem os POLOS PARA CIMA (pedido do dono)', () => {
    // a câmera reconstruída com as MESMAS peças do rig: galacticUp,
    // lookAt e rotateZ(roll) — não uma reescrita da conta
    const s = j.at(j.duration);
    const cam = new THREE.PerspectiveCamera(s.fov, 4 / 3, 0.1, 10);
    cam.position.copy(s.pos);
    const viewDir = s.look.clone().sub(s.pos).normalize();
    galacticUp(viewDir, cam.up);
    cam.lookAt(s.look);
    cam.rotateZ(s.roll);
    cam.updateMatrixWorld();
    // o "para cima" da tela é o +Y da câmera no mundo; o norte da Terra
    // é o +Z do frame equatorial, projetado perpendicular ao olhar
    const upDaTela = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const norte = new THREE.Vector3(0, 0, 1)
      .addScaledVector(viewDir, -viewDir.z)
      .normalize();
    expect(grausEntre(upDaTela, norte)).toBeLessThan(0.5);
  });
});

/**
 * O RETRATO DE FAMÍLIA (item 108, ordem do dono de 30/08: "vamos
 * consertar, vai melhorar o roteiro"). Antes desta obra a Lua saía por
 * cima no arremate — no último quadro ela estava a 32,9° da mira com
 * meio-quadro de 32,1°, NDC y = 1,10. O que segura o retrato são DUAS
 * peças, e cada cobrança abaixo mata uma delas:
 *   - a MIRA sobe 11° pelo norte da tela (`MIRA_DO_POUSO` no roteiro):
 *     devolvê-la ao centro da Terra leva a Lua a 0,97 no último quadro;
 *   - a LENTE fecha em 52°, não em 46°: voltar aos 46° encurta o retrato
 *     com folga de 2,10 s para 1,81 s.
 * As medidas são no quadro do rig (mesmas peças: galacticUp, lookAt,
 * rotateZ) e no aspecto da vista oficial `fim-do-filme` (1200×813).
 */
describe('o fim mostra a Lua E a Terra', () => {
  const ASPECTO_DA_VISTA = 1200 / 813;
  /** NDC de um corpo no quadro do rig; +∞ atrás da câmera */
  function noQuadro(t: number, alvo: THREE.Vector3) {
    const s = j.at(t);
    const cam = new THREE.PerspectiveCamera(s.fov, ASPECTO_DA_VISTA, 1e-12, 10);
    cam.position.copy(s.pos);
    const viewDir = s.look.clone().sub(s.pos).normalize();
    galacticUp(viewDir, cam.up);
    cam.lookAt(s.look);
    cam.rotateZ(s.roll);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    if (alvo.clone().applyMatrix4(cam.matrixWorldInverse).z >= 0) {
      return { x: Infinity, y: Infinity, fora: Infinity };
    }
    const p = alvo.clone().project(cam);
    return { x: p.x, y: p.y, fora: Math.max(Math.abs(p.x), Math.abs(p.y)) };
  }

  it('no último quadro a Lua está no quadro com folga, e a Terra manda', () => {
    const lua = noQuadro(j.duration, LUA_PC);
    expect(lua.fora).toBeLessThan(0.7); // medido 0,579
    expect(lua.y).toBeGreaterThan(0.2); // ela entra POR CIMA, não pelo lado
    const terra = noQuadro(j.duration, TERRA_PC);
    expect(Math.abs(terra.x)).toBeLessThan(0.05); // centrada na horizontal
    // a Terra assenta no terço de baixo: o disco INTEIRO no quadro, com ar
    // embaixo e o alto livre para a Lua
    const s = j.at(j.duration);
    const raio = Math.atan(RAIO_TERRA_PC / s.pos.distanceTo(TERRA_PC));
    const meioQuadro = Math.tan(THREE.MathUtils.degToRad(s.fov / 2));
    const emNdc = Math.tan(raio) / meioQuadro;
    expect(terra.y - emNdc).toBeGreaterThan(-0.9); // não corta embaixo
    expect(terra.y - emNdc).toBeLessThan(-0.7); // nem flutua no meio
    expect(terra.y + emNdc).toBeLessThan(0.1); // o alto do quadro é da Lua
  });

  it('o retrato dura pelo menos 2 s antes do fim', () => {
    let entrou = NaN;
    for (let t = j.duration - 4; t <= j.duration; t += 0.01) {
      if (noQuadro(t, LUA_PC).fora <= 0.85 && noQuadro(t, TERRA_PC).fora <= 1) {
        entrou = t;
        break;
      }
    }
    expect(j.duration - entrou).toBeGreaterThan(2); // medido 2,10 s
  });
});
