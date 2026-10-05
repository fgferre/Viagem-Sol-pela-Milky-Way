// Serve: dono — o filme solar monta com quatro minutos, legendas nas duas línguas e a câmera perto dos corpos sem entrar neles
// A montagem do filme solar: duração, legendas, apoios, a geometria das
// aproximações e a troca de relógio, medidas nos próprios planos (o
// relógio de Journey.at: ritmo do plano, glide quando ausente) — antes de
// o filme ser registrado.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../../lib/atlas/efemerides';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../../lib/atlas/frameGalactico';
import { IAU_ORIENTATIONS } from '../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../lib/atlas/orientacao';
import { RELEVO_DA_LUA } from '../../../world/corpos/rochoso';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeSolar, raioPc, RAIO_DOS_ANEIS } = await import('./montar');
const { glide } = await import('../../movimentos');
const { auditarRoteiro } = await import('../../journey');

const filme = montarFilmeSolar();
const { shots, starts, duracao, apoios, pinos } = filme;

const DATA_DIR = fileURLToPath(new URL('../../../../../public/data/atlas/', import.meta.url));
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    JSON.parse(readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')) as MetaEfemerides
  )
);

/** a câmera no instante t, com o relógio de Journey.at: posição e mira
 *  do plano na fração do relógio */
function amostra(t: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
  let i = shots.length - 1;
  for (let s = 0; s < shots.length; s++) {
    if (t < starts[s] + shots[s].dur) { i = s; break; }
  }
  const s = shots[i];
  const ke = (s.ease ?? glide)(THREE.MathUtils.clamp((t - starts[i]) / s.dur, 0, 1));
  return { pos: s.pos(ke, new THREE.Vector3()), look: s.look(ke, new THREE.Vector3()) };
}
const camera = (t: number) => amostra(t).pos;

/** a menor distância do plano `i` ao corpo, em raios (amostragem fina:
 *  o ritmo é monótono, então os pontos do plano são os de pos(k)) */
function menorDistancia(i: number, id: string, raio = raioPc(id)): number {
  let menor = Infinity;
  const p = new THREE.Vector3();
  for (let j = 0; j <= 20000; j++) {
    menor = Math.min(menor, shots[i].pos(j / 20000, p).distanceTo(pinos.get(id)!) / raio);
  }
  return menor;
}

const inicioDoAto = (n: number) =>
  starts[filme.planosPorAto.slice(0, n).reduce((a, b) => a + b, 0)];

describe('o filme solar monta', () => {
  it('dura quatro minutos (235–245 s) em quatro atos', () => {
    expect(duracao).toBeGreaterThanOrEqual(235);
    expect(duracao).toBeLessThanOrEqual(245);
    expect(filme.planosPorAto).toHaveLength(4);
  });

  it('toda legenda tem o par em inglês', () => {
    const semIngles = shots.flatMap((s) => s.captions ?? [])
      .filter((c) => !c.en?.text || (c.sub !== undefined && !c.en.sub))
      .map((c) => c.text);
    expect(semIngles).toEqual([]);
  });

  it('as legendas não se sobrepõem nem atravessam um corte sem ponte', () => {
    const janelas = shots.flatMap((s, i) => (s.captions ?? []).map((c) => ({
      texto: c.text, i,
      t0: starts[i] + c.at * s.dur,
      t1: starts[i] + c.at * s.dur + (c.dur ?? 8.6),
      ponte: c.bridge ?? false,
    }))).sort((a, b) => a.t0 - b.t0);
    const sobrepostas = janelas.slice(1).filter((c, j) => c.t0 < janelas[j].t1).map((c) => c.texto);
    const vazadas = janelas.filter((c) =>
      c.i < shots.length - 1 && !c.ponte && c.t1 > starts[c.i] + shots[c.i].dur).map((c) => c.texto);
    expect(sobrepostas).toEqual([]);
    expect(vazadas).toEqual([]);
  });

  it('os corpos são pedidos antes de a câmera chegar a eles', () => {
    expect(shots[0].preload?.corpos).toEqual(expect.arrayContaining(['earth', 'moon']));
    expect(shots[0].preload?.efemerides).toBe(true);
    const antesDe = (t: number, ids: string[]) =>
      ids.filter((id) => !apoios.preAquecerCorpo(t - 1e-6, id));
    expect(antesDe(inicioDoAto(1), ['jupiter', 'io', 'europa', 'ganymede', 'callisto'])).toEqual([]);
    expect(antesDe(inicioDoAto(2), ['saturn', 'enceladus', 'hyperion', 'mimas', 'titan'])).toEqual([]);
  });

  it('a auditoria editorial do motor não acha sobreposição nem legenda vazando um corte sem ponte', () => {
    const auditoria = auditarRoteiro(shots, starts);
    expect(auditoria.duration).toBe(duracao);
    expect(auditoria.overlaps).toEqual([]);
    expect(auditoria.crossings.filter((c) => !c.bridge)).toEqual([]);
  });

  it('cada ato tem ao menos um ponto de conferência (qa)', () => {
    const porAto = [0, 1, 2, 3].map((n) => {
      const de = filme.planosPorAto.slice(0, n).reduce((a, b) => a + b, 0);
      return shots.slice(de, de + filme.planosPorAto[n])
        .flatMap((s) => Object.keys(s.qa ?? {}));
    });
    for (const nomes of porAto) expect(nomes.length).toBeGreaterThan(0);
  });
});

describe('a geometria das aproximações', () => {
  // plano → corpo que ele aproxima (o roteiro v3, na ordem dos planos)
  const APROXIMACOES: [number, string][] = [
    [0, 'earth'], [3, 'moon'], [4, 'moon'], [6, 'io'], [7, 'jupiter'],
    [10, 'saturn'], [11, 'enceladus'], [13, 'hyperion'],
  ];

  it.each(APROXIMACOES)('o plano %i passa entre 1,3 e 4 raios de %s', (i, id) => {
    const d = menorDistancia(i, id);
    expect(d).toBeGreaterThanOrEqual(1.3);
    expect(d).toBeLessThanOrEqual(4);
  });

  it('a câmera nunca entra num corpo (Hipérion pela forma medida, até 1,37 raio)', () => {
    const h = RELEVO_DA_LUA.hyperion;
    const dentro: string[] = [];
    for (const id of pinos.keys()) {
      if (id === 'sun') continue;
      const raio = raioPc(id) * (id === 'hyperion' ? 1 + h.vies + h.escala : 1);
      for (let i = 0; i < shots.length; i++) {
        if (menorDistancia(i, id, raio) < 1.3) dentro.push(`${id} no plano ${i}`);
      }
    }
    expect(dentro).toEqual([]);
  });

  it('o plano dos anéis só é cruzado uma vez dentro do anel, na divisão de Cassini', () => {
    const polo = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.saturn, filme.jd).polo);
    const saturno = pinos.get('saturn')!;
    const rs = raioPc('saturn');
    const cruzamentos: number[] = [];
    let anterior = NaN;
    for (let t = 0; t <= duracao; t += 0.002) {
      const v = camera(t).sub(saturno);
      const h = v.dot(polo) / rs;
      const r = Math.sqrt(Math.max(v.lengthSq() / (rs * rs) - h * h, 0));
      if (anterior * h < 0 && r < RAIO_DOS_ANEIS) cruzamentos.push(r);
      anterior = h;
    }
    expect(cruzamentos).toHaveLength(1);
    expect(cruzamentos[0]).toBeGreaterThan(1.95);
    expect(cruzamentos[0]).toBeLessThan(2.03);
  });
});

describe('o ponto azul pálido', () => {
  // a Terra no céu dos atos II–IV, pela cadeia dos pinos, vista da câmera
  // do roteiro, enquanto a legenda está no ar: a mira é o Sol (centro do
  // quadro), então a distância em px é a do ângulo, na lente do plano
  const v = motor.posicaoHeliocentrica('earth', filme.jd2);
  const terra = new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z])).multiplyScalar(AU_PARA_PC);
  const i = shots.findIndex((s) => s.captions?.some((c) => c.text === 'A Terra, daqui'));
  const c = shots[i].captions!.find((x) => x.text === 'A Terra, daqui')!;
  const t0 = starts[i] + c.at * shots[i].dur;
  const t1 = t0 + (c.dur ?? 8.6);

  it('a Terra fica a 60–150 px do Sol, num quadro de 1280×720, do começo ao fim da legenda', () => {
    const s = shots[i];
    const fora: string[] = [];
    for (let t = t0; t <= t1; t += 0.05) {
      const k = THREE.MathUtils.clamp((t - starts[i]) / s.dur, 0, 1);
      const { pos, look } = amostra(t);
      const fov = THREE.MathUtils.lerp(s.fov0, s.fov1, s.fovEase ? s.fovEase(k) : (s.ease ?? glide)(k));
      const angulo = look.clone().sub(pos).angleTo(terra.clone().sub(pos));
      const px = (360 / Math.tan(THREE.MathUtils.degToRad(fov / 2))) * Math.tan(angulo);
      if (px < 60 || px > 150) fora.push(`t=${t.toFixed(2)}: ${px.toFixed(0)} px`);
    }
    expect(look0EhOSol()).toBe(true);
    expect(fora).toEqual([]);
  });

  /** a mira do plano é o Sol em toda a janela da legenda */
  function look0EhOSol() {
    for (let t = t0; t <= t1; t += 0.5) {
      const { pos, look } = amostra(t);
      if (look.clone().sub(pos).angleTo(pos.clone().negate()) > 1e-6) return false;
    }
    return true;
  }
});

describe('os dois relógios: o ato I em JD1, os atos II–IV em JD2', () => {
  // o primeiro plano de jupiter.json: a travessia Terra→Júpiter
  const travessia = filme.planosPorAto[0];
  const fimDaTravessia = starts[travessia] + shots[travessia].dur;
  /** o menor ângulo entre a visada e as direções da câmera à Terra e à Lua */
  const foraDaVisada = (t: number) => {
    const { pos, look } = amostra(t);
    const visada = look.clone().sub(pos);
    return THREE.MathUtils.radToDeg(Math.min(
      visada.angleTo(pinos.get('earth')!.clone().sub(pos)),
      visada.angleTo(pinos.get('moon')!.clone().sub(pos))
    ));
  };

  it('o calendário dá JD1 antes da troca e JD2 dela em diante; o retrato (jd) é JD2', () => {
    expect(filme.jdDoFilme(0)).toBe(filme.jd1);
    expect(filme.jdDoFilme(filme.tTroca - 1e-6)).toBe(filme.jd1);
    expect(filme.jdDoFilme(filme.tTroca)).toBe(filme.jd2);
    expect(filme.jdDoFilme(duracao)).toBe(filme.jd2);
    expect(filme.jd).toBe(filme.jd2);
  });

  it('a troca cai 1 s depois de Terra e Lua ficarem a 45° da visada na travessia, e elas não voltam', () => {
    let primeiro = NaN;
    for (let t = starts[travessia]; t < fimDaTravessia; t += 0.001) {
      if (foraDaVisada(t) >= 45) { primeiro = t; break; }
    }
    expect(filme.tTroca).toBeCloseTo(primeiro + 1, 2);
    let menor = Infinity;
    for (let t = filme.tTroca; t <= fimDaTravessia; t += 0.01) menor = Math.min(menor, foraDaVisada(t));
    expect(menor).toBeGreaterThanOrEqual(45);
  });

  it('Júpiter, que está em quadro na troca, salta menos de 0,1° entre os dois céus', () => {
    const { pos } = amostra(filme.tTroca);
    const v = motor.posicaoHeliocentrica('jupiter', filme.jd1);
    const emJd1 = new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z])).multiplyScalar(AU_PARA_PC);
    const salto = THREE.MathUtils.radToDeg(
      emJd1.sub(pos).angleTo(pinos.get('jupiter')!.clone().sub(pos))
    );
    expect(salto).toBeLessThan(0.1); // medido 0,035°
  });

  it('nenhuma legenda está aberta na troca', () => {
    const abertas = shots.flatMap((s, i) => (s.captions ?? []).map((c) => ({
      texto: c.text,
      t0: starts[i] + c.at * s.dur,
      t1: starts[i] + c.at * s.dur + (c.dur ?? 8.6),
    }))).filter((c) => c.t0 <= filme.tTroca && filme.tTroca < c.t1).map((c) => c.texto);
    expect(abertas).toEqual([]);
  });

  it('o cima é o polo norte da eclíptica na cena (equatorial J2000, ε = 23,4393°)', () => {
    // a cena é equatorial J2000: o polo galáctico do rig (GALACTIC_NORTH,
    // −0,8677, −0,1981, 0,4560) é RA 192,86°, Dec +27,13°; o da eclíptica
    // é RA 270°, Dec 66,56°
    expect(filme.cima.distanceTo(new THREE.Vector3(0, -0.3978, 0.9175))).toBeLessThan(1e-3);
  });
});
