// Serve: dono — todo número dito nas legendas do filme solar é a conta feita no instante do filme
// O CANAL TÉCNICO DAS LEGENDAS (decisão 4 do plano: afirmação científica
// defensável). Cada número do texto é recomputado aqui — pelos pinos,
// pela fonte única de raios (BODY_AXES) ou pela posição da câmera no
// instante da legenda — e cobrado com o arredondamento que o texto usa,
// nas duas línguas. Cada conta usa o céu do ato da legenda: do Sol à
// Ceres, o de JD_A; em Júpiter, o de JD_J; de Saturno em diante, o de
// JD2 — inclusive a Terra, que é desenhada no pino de JD_A mas é
// recomputada pela cadeia no relógio do ato.
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
import { RAIO_SOL_KM } from '../../../escala';
import { faseDoCiclo } from '../../../estrela';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeSolar } = await import('./montar');
const { pino, RELOGIOS_SOLAR } = await import('./pinos');
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

const MERCURIO = pino('mercury');
const TERRA = pino('earth');
const LUA = pino('moon');
const MARTE = pino('mars');
const JUPITER = pino('jupiter');
const SATURNO = pino('saturn');
/** a Terra num relógio do filme, pela mesma cadeia dos pinos */
const terraEm = (jd: number) => {
  const v = motor.posicaoHeliocentrica('earth', jd);
  return new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z])).multiplyScalar(UA);
};
/** a Terra no céu do ato II (JD_J) e no dos atos de fora (JD2) */
const TERRA_EM_JD_J = terraEm(RELOGIOS_SOLAR.jupiter);
const TERRA_EM_JD2 = terraEm(RELOGIOS_SOLAR.fora);
const emUA = (v: THREE.Vector3) => v.length() / UA;
const minutosLuz = (ua: number) => (ua * AU_KM) / C_KM_S / 60;
/** a luz do Sol num ponto, como fração da que a Terra recebe no mesmo céu (1/d²) */
const maisFraco = (dUA: number, terra: THREE.Vector3) => (dUA / emUA(terra)) ** 2;

describe('os números das legendas batem com a conta', () => {
  it('o Sol: 109 Terras de ponta a ponta, e um milhão de Terras caberiam dentro', () => {
    const terras = RAIO_SOL_KM / BODY_AXES.earth[0];
    expect(Math.round(terras)).toBe(109); // 109,2 diâmetros equatoriais
    const c = legenda('Um milhão de Terras');
    expect(falaPt(c)).toContain(`${Math.round(terras)} Terras de ponta a ponta`);
    expect(falaEn(c)).toContain(`${Math.round(terras)} Earths across`);
    // em volume cabem 1,3 milhão; empacotadas como esferas (74 %), 0,96
    // milhão — "um milhão" é o número redondo que as duas contas sustentam
    expect(terras ** 3 / 1e6).toBeCloseTo(1.3, 1);
    expect(falaEn(c)).toContain('A million Earths');
  });

  it('a luz do Sol leva 8 minutos até a Terra (8 min 10,7 s: a Terra está a 0,983 UA no instante)', () => {
    const minutos = minutosLuz(emUA(TERRA));
    expect(Math.floor(minutos)).toBe(8);
    const c = legenda('A luz que sai daqui');
    expect(falaPt(c)).toContain(`${Math.floor(minutos)} minutos`);
    expect(falaEn(c)).toContain(`${Math.floor(minutos)} minutes`);
  });

  it('10 de janeiro de 2026 fica perto do máximo do ciclo que o Sol desenhado segue (a fase pela data)', () => {
    // as manchas são do modelo, não as observadas no dia: a legenda diz
    // que elas seguem o ciclo, e a atividade dele nesta data passa de
    // 90 % da do máximo de outubro de 2024
    expect(Math.sin(Math.PI * faseDoCiclo(RELOGIOS_SOLAR.a).fase01)).toBeGreaterThan(0.9);
    const c = legendas.find((x) => x.text === 'O Sol')!;
    expect(falaPt(c)).toContain('10 de janeiro de 2026');
    expect(falaPt(c)).toContain('perto do máximo');
    expect(falaPt(c)).toContain('seguem o ciclo');
    expect(falaEn(c)).toContain('January 10, 2026');
    expect(falaEn(c)).toContain('near maximum');
    expect(falaEn(c)).toContain('follow the 11-year cycle');
  });

  it('Mercúrio: quase 5 vezes mais luz que na Terra ((1 UA / r)² no instante), 430 °C de dia e −180 °C de noite', () => {
    // em 10/01/2026 Mercúrio está a 0,464 UA, perto do afélio (0,467): a
    // razão é 4,64 — o "quase 7" da média (0,387 UA) não vale nesta data.
    // Contra a Terra do mesmo instante (0,983 UA), 4,49.
    const razao = (1 / emUA(MERCURIO)) ** 2;
    expect(Math.round(razao)).toBe(5);
    expect(razao).toBeLessThan(5);
    const c = legenda('Mercúrio');
    expect(falaPt(c)).toContain('quase 5 vezes');
    expect(falaEn(c)).toContain('almost 5 times');
    // a superfície: até 430 °C no dia e −180 °C na noite (NASA, Mercury
    // Fact Sheet) — sem atmosfera, o calor não fica
    expect(falaPt(c)).toContain('430 °C de dia, −180 °C de noite');
    expect(falaEn(c)).toContain('430 °C by day, −180 °C by night');
  });

  it('Vênus devolve três quartos da luz (albedo de Bond 0,76) e tem 460 °C sob as nuvens', () => {
    // albedo de Bond 0,76 (Haus et al. 2016, Icarus 272, 178); a
    // superfície, ~737 K = 464 °C (NASA, Venus Fact Sheet)
    const ALBEDO_DE_BOND = 0.76;
    expect(Math.abs(ALBEDO_DE_BOND - 3 / 4)).toBeLessThanOrEqual(0.02);
    const c = legenda('Vênus devolve');
    expect(falaPt(c)).toContain('três quartos da luz');
    expect(falaEn(c)).toContain('three quarters of the light');
    expect(Math.round((737 - 273.15) / 10) * 10).toBe(460);
    expect(falaPt(c)).toContain('460 °C');
    expect(falaEn(c)).toContain('460 °C');
  });

  it('a Terra fica a 8 minutos-luz do Sol (8 min 10,7 s no instante)', () => {
    const minutos = minutosLuz(emUA(TERRA));
    expect(Math.floor(minutos)).toBe(8);
    const c = legenda('TERRA');
    expect(falaPt(c)).toContain(`${Math.floor(minutos)} minutos-luz do Sol`);
    expect(falaEn(c)).toContain(`${Math.floor(minutos)} light-minutes from the Sun`);
  });

  it('a Terra vista da Lua: 399 mil km, 31 Terras e 1,3 segundo-luz (centro a centro, no instante)', () => {
    const km = (LUA.distanceTo(TERRA) / UA) * AU_KM;
    const terras = Math.round(km / (2 * BODY_AXES.earth[0]));
    expect(terras).toBe(31); // medido 31,29 — 399 177 km, a Lua passa da distância média
    const c = legenda('A Terra, vista da Lua');
    expect(falaPt(c)).toContain(`${Math.floor(km / 1000)} mil km`);
    expect(falaPt(c)).toContain(`${terras} Terras`);
    expect(falaPt(c)).toContain(`${pt(km / C_KM_S, 1)} segundo-luz`);
    expect(falaEn(c)).toContain(`${Math.floor(km / 1000)},000 km`);
    expect(falaEn(c)).toContain(`${terras} Earths`);
    expect(falaEn(c)).toContain(`${en(km / C_KM_S, 1)} light-seconds`);
    // o Nascer da Terra: Apollo 8, 24 de dezembro de 1968
    expect(falaPt(c)).toContain('Apollo 8 fotografou o Nascer da Terra, em 1968');
    expect(falaEn(c)).toContain('Apollo 8 photographed Earthrise, in 1968');
  });

  it('Marte: menos da metade da luz da Terra ((1 UA / r)² no instante)', () => {
    // em 10/01/2026 Marte está a 1,419 UA (perto do periélio, 1,381): a
    // razão é 0,497 — contra a Terra do mesmo instante (0,983 UA), 0,480
    const r = emUA(MARTE);
    expect((1 / r) ** 2).toBeLessThan(0.5);
    expect((emUA(TERRA) / r) ** 2).toBeLessThan(0.5);
    const c = legenda('Marte');
    expect(falaPt(c)).toContain('menos da metade da luz da Terra');
    expect(falaEn(c)).toContain('less than half the light of Earth');
    // o ar que o vento do Sol leva: MAVEN (Jakosky et al. 2018, Icarus 315, 146)
    expect(falaPt(c)).toContain('o vento do Sol ajudou a levar o ar embora');
  });

  it('Ceres é o maior do cinturão (diâmetro médio em BODY_AXES, contra Vesta, Palas e Hígia)', () => {
    const diametro = (id: string) => (2 * (BODY_AXES[id][0] + BODY_AXES[id][1] + BODY_AXES[id][2])) / 3;
    for (const id of ['vesta', 'pallas', 'hygiea']) expect(diametro('ceres')).toBeGreaterThan(diametro(id));
    const c = legenda('Ceres');
    expect(falaPt(c)).toContain('o maior do cinturão');
    expect(falaEn(c)).toContain('the largest in the belt');
  });

  it('Júpiter: 11 Terras de largura (diâmetros equatoriais)', () => {
    const n = Math.round(BODY_AXES.jupiter[0] / BODY_AXES.earth[0]);
    const c = legenda('Terras de largura');
    expect(falaPt(c)).toContain(`${n} Terras`);
    expect(falaEn(c)).toContain(`${n} Earths`);
  });

  it('em Júpiter o Sol é 28 vezes mais fraco que na Terra (na chegada)', () => {
    const n = Math.round(maisFraco(emUA(JUPITER), TERRA_EM_JD_J));
    expect(n).toBe(28); // 1 UA daria 27; a Terra está a 0,983 UA no instante
    const c = legenda('Terras de largura');
    expect(falaPt(c)).toContain(`${n} vezes mais fraco`);
    expect(falaEn(c)).toContain(`${n} times fainter`);
  });

  it('Io: mais de 400 vulcões, aquecida pela maré de Júpiter, e o primeiro vulcão fora da Terra visto pela Voyager 1 em 1979', () => {
    // mais de 400 vulcões ativos: Lopes et al. 2004 (Icarus 169, 140) e a
    // página de Io da NASA; o primeiro, a pluma de Pele, na imagem da
    // Voyager 1 de 8 de março de 1979 (Morabito et al. 1979, Science 204, 972)
    const c = legenda('Io —');
    expect(falaPt(c)).toContain('não é o Sol que a aquece');
    expect(falaPt(c)).toContain('é Júpiter, pela maré: mais de 400 vulcões');
    expect(falaPt(c)).toContain('A Voyager 1 viu aqui o primeiro vulcão fora da Terra, em 1979');
    expect(falaEn(c)).toContain('more than 400 volcanoes');
    expect(falaEn(c)).toContain('Voyager 1 saw the first volcano beyond Earth here, in 1979');
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
    expect(Math.round(maisFraco(d, TERRA_EM_JD2) / 10) * 10).toBe(100);
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
