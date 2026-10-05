// Serve: dono — todo número dito nas legendas do filme solar é a conta feita no instante do filme
// O CANAL TÉCNICO DAS LEGENDAS (decisão 4 do plano: afirmação científica
// defensável). Cada número do texto é recomputado aqui — pelos pinos,
// pela fonte única de raios (BODY_AXES) ou pela posição da câmera no
// instante da legenda — e cobrado com o arredondamento que o texto usa,
// nas duas línguas. Cada conta usa o céu do ato da legenda: a Lua, o de
// JD1; de Júpiter em diante, o de JD2 — inclusive a Terra, que é
// desenhada no pino de JD1 mas é recomputada pela cadeia em JD2.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../../lib/atlas/efemerides';
import { AU_KM } from '../../../../lib/atlas/elementosOrbitais';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../../../lib/atlas/frameGalactico';
import { BODY_AXES } from '../../../../lib/atlas/iauOrientation';
import { ANEL_SATURNO } from '../../../world/corpos/gigante';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeSolar } = await import('./montar');
const { pino } = await import('./pinos');
const { glide } = await import('../../movimentos');

const C_KM_S = 299_792.458;
const UA = AU_PARA_PC;
const filme = montarFilmeSolar();
const legendas = filme.shots.flatMap((s, i) => (s.captions ?? []).map((c) => ({
  ...c, t: filme.starts[i] + c.at * s.dur,
})));

/** a legenda cujo texto (pt) contém `trecho` — tem de existir e ser única */
function legenda(trecho: string) {
  const achadas = legendas.filter((c) => c.text.includes(trecho));
  expect(achadas).toHaveLength(1);
  return achadas[0];
}
/** o número como o texto o escreve: vírgula em pt, ponto em en */
const pt = (n: number, casas = 0) => n.toFixed(casas).replace('.', ',');
const en = (n: number, casas = 0) => n.toFixed(casas);
const falaPt = (c: ReturnType<typeof legenda>) => `${c.text} ${c.sub ?? ''}`;
const falaEn = (c: ReturnType<typeof legenda>) => `${c.en?.text ?? ''} ${c.en?.sub ?? ''}`;

/** a posição da câmera no instante t, com o relógio de Journey.at */
function camera(t: number): THREE.Vector3 {
  const { shots, starts } = filme;
  let i = shots.length - 1;
  for (let s = 0; s < shots.length; s++) {
    if (t < starts[s] + shots[s].dur) { i = s; break; }
  }
  const s = shots[i];
  const k = THREE.MathUtils.clamp((t - starts[i]) / s.dur, 0, 1);
  return s.pos((s.ease ?? glide)(k), new THREE.Vector3());
}

const DATA_DIR = fileURLToPath(new URL('../../../../../public/data/atlas/', import.meta.url));
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    JSON.parse(readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')) as MetaEfemerides
  )
);

const TERRA = pino('earth');
const LUA = pino('moon');
const JUPITER = pino('jupiter');
const SATURNO = pino('saturn');
/** a Terra no céu dos atos II–IV, pela mesma cadeia dos pinos */
const TERRA_EM_JD2 = (() => {
  const v = motor.posicaoHeliocentrica('earth', filme.jd2);
  return new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z])).multiplyScalar(UA);
})();
const emUA = (v: THREE.Vector3) => v.length() / UA;
const minutosLuz = (ua: number) => (ua * AU_KM) / C_KM_S / 60;
/** a luz do Sol num ponto, como fração da que a Terra recebe no céu dos atos II–IV (1/d²) */
const maisFraco = (dUA: number) => (dUA / emUA(TERRA_EM_JD2)) ** 2;

describe('os números das legendas batem com a conta', () => {
  it('a Lua: 28 Terras e 1,2 segundo-luz (centro a centro, no instante)', () => {
    const km = (LUA.distanceTo(TERRA) / UA) * AU_KM;
    const terras = Math.round(km / (2 * BODY_AXES.earth[0]));
    expect(terras).toBe(28); // medido 28,24 — a Lua está perto do perigeu
    const c = legenda('Terras de distância');
    expect(falaPt(c)).toContain(`${terras} Terras`);
    expect(falaPt(c)).toContain(`${pt(km / C_KM_S, 1)} segundo-luz`);
    expect(falaEn(c)).toContain(`${terras} Earths`);
    expect(falaEn(c)).toContain(`${en(km / C_KM_S, 1)} light-seconds`);
  });

  it('Júpiter: 4,2 UA da Terra e 35 minutos-luz (as duas em JD2)', () => {
    const ua = emUA(JUPITER.clone().sub(TERRA_EM_JD2));
    const c = legenda('Júpiter: ');
    expect(falaPt(c)).toContain(`${pt(ua, 1)} UA`);
    expect(falaPt(c)).toContain(`${Math.round(minutosLuz(ua))} minutos`);
    expect(falaEn(c)).toContain(`${en(ua, 1)} AU`);
    expect(falaEn(c)).toContain(`${Math.round(minutosLuz(ua))} minutes`);
  });

  it('Júpiter: 11 Terras de largura (diâmetros equatoriais)', () => {
    const n = Math.round(BODY_AXES.jupiter[0] / BODY_AXES.earth[0]);
    const c = legenda('Terras de largura');
    expect(falaPt(c)).toContain(`${n} Terras`);
    expect(falaEn(c)).toContain(`${n} Earths`);
  });

  it('em Júpiter o Sol é 28 vezes mais fraco que na Terra', () => {
    const n = Math.round(maisFraco(emUA(JUPITER)));
    expect(n).toBe(28); // 1 UA daria 27; a Terra está a 0,983 UA no instante
    const c = legenda('Daqui, o Sol');
    expect(falaPt(c)).toContain(`${n} vezes`);
    expect(falaEn(c)).toContain(`${n} times`);
  });

  it('Saturno: 9,5 UA do Sol e 79 minutos-luz', () => {
    const ua = emUA(SATURNO);
    const c = legenda('Saturno: ');
    expect(falaPt(c)).toContain(`${pt(ua, 1)} UA`);
    expect(falaPt(c)).toContain(`${Math.round(minutosLuz(ua))} minutos`);
    expect(falaEn(c)).toContain(`${en(ua, 1)} AU`);
    expect(falaEn(c)).toContain(`${Math.round(minutosLuz(ua))} minutes`);
  });

  it('os anéis: 280 mil km de ponta a ponta (o anel desenhado, até o F) e menos de 1 km de espessura', () => {
    const milKm = Math.round((2 * ANEL_SATURNO.rExt * BODY_AXES.saturn[0]) / 1000);
    const c = legenda('de ponta a ponta');
    expect(falaPt(c)).toContain(`${milKm} mil km`);
    expect(falaEn(c)).toContain(`${milKm},000 km`);
    // espessura vertical dos anéis principais: de ~10 m a ~1 km (Cassini;
    // Tiscareno & Murray, Planetary Ring Systems, 2018). A laje do app tem
    // ±12 km — o texto fala do real, não da laje.
    const ESPESSURA_REAL_MAXIMA_KM = 1;
    expect(falaPt(c)).toContain(`menos de ${ESPESSURA_REAL_MAXIMA_KM} km`);
    expect(falaEn(c)).toContain(`less than ${ESPESSURA_REAL_MAXIMA_KM} km`);
  });

  it('Hipérion: 270 km (diâmetro médio, a esfera de BODY_AXES)', () => {
    const km = 2 * BODY_AXES.hyperion[0];
    const c = legenda('Hipérion');
    expect(falaPt(c)).toContain(`${km} km`);
    expect(falaEn(c)).toContain(`${km} km`);
  });

  it('“a 10 UA, 100 vezes mais fraco” é onde a câmera está quando a legenda entra', () => {
    const c = legenda('A 10 UA');
    const d = emUA(camera(c.t));
    expect(Math.round(d)).toBe(10);
    expect(Math.round(maisFraco(d) / 10) * 10).toBe(100);
    expect(falaEn(c)).toContain('10 AU');
    expect(falaEn(c)).toContain('100 times');
  });

  it('“um ponto azul pálido, a 40 UA” é onde a câmera está quando a legenda entra', () => {
    const c = legenda('A Terra, daqui');
    const d = emUA(camera(c.t));
    expect(Math.round(d)).toBe(40);
    expect(falaPt(c)).toContain('40 UA');
    expect(falaEn(c)).toContain('40 AU');
  });
});
