// Serve: dono — todo número dito nas legendas do filme solar é a conta feita no instante do filme
// O CANAL TÉCNICO DAS LEGENDAS (decisão 4 do plano: afirmação científica
// defensável). Cada número do texto é recomputado aqui — pelos pinos,
// pela fonte única de raios (BODY_AXES) ou pela posição da câmera no
// instante da legenda — e cobrado com o arredondamento que o texto usa,
// nas duas línguas. Cada conta usa o céu do ato da legenda: do Sol à
// Ceres, o de JD_A; em Júpiter, o de JD_J; em Saturno, o de JD2; de Urano
// ao retrato, o de JD_E — inclusive a Terra, que é desenhada no pino de
// JD_A mas é recomputada pela cadeia no relógio do ato; no epílogo, de
// volta à Terra, de novo o de JD_A.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../../lib/atlas/efemerides';
import { AU_KM } from '../../../../lib/atlas/elementosOrbitais';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../lib/atlas/orientacao';
import { ANEL_SATURNO } from '../../../world/corpos/gigante';
import { RELEVO_DA_LUA } from '../../../world/corpos/rochoso';
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
const URANO = pino('uranus');
/** a Terra num relógio do filme, pela mesma cadeia dos pinos */
const terraEm = (jd: number) => {
  const v = motor.posicaoHeliocentrica('earth', jd);
  return new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z])).multiplyScalar(UA);
};
/** a Terra no céu do ato II (JD_J), no do ato III (JD2) e no do ato IV (JD_E) */
const TERRA_EM_JD_J = terraEm(RELOGIOS_SOLAR.jupiter);
const TERRA_EM_JD2 = terraEm(RELOGIOS_SOLAR.fora);
const TERRA_EM_JD_E = terraEm(RELOGIOS_SOLAR.escuro);
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

  it('Saturno: 9,5 UA do Sol, 79 minutos-luz e 1 % da luz da Terra (no céu de JD2)', () => {
    const ua = emUA(SATURNO); // medido 9,518 UA: 79,2 minutos-luz
    const c = legenda('Saturno —');
    expect(falaPt(c)).toContain(`${pt(ua, 1)} UA`);
    // a legenda entra quando a câmera já chegou: o HUD também diz 9,5 UA
    expect(pt(emUA(camera(c.t)), 1)).toBe(pt(ua, 1));
    expect(falaPt(c)).toContain(`${Math.round(minutosLuz(ua))} minutos`);
    expect(falaEn(c)).toContain(`${en(ua, 1)} AU`);
    expect(falaEn(c)).toContain(`${Math.round(minutosLuz(ua))} minutes`);
    // 1/d²: 1,10 % do que o Sol dá a 1 UA e 1,07 % do que a Terra recebe no
    // mesmo céu (0,983 UA) — "1 %" é o arredondamento ao inteiro das duas
    const porCento = 100 / maisFraco(ua, TERRA_EM_JD2);
    expect(Math.round(porCento)).toBe(1);
    expect(Math.round(100 / ua ** 2)).toBe(1);
    expect(falaPt(c)).toContain(`${Math.round(porCento)} % da luz da Terra`);
    expect(falaEn(c)).toContain(`${Math.round(porCento)}% of Earth's light`);
  });

  it('os anéis: gelo, 280 mil km de ponta a ponta (o anel desenhado, até o F), dezenas de metros de espessura e talvez menos de 100 milhões de anos', () => {
    const milKm = Math.round((2 * ANEL_SATURNO.rExt * BODY_AXES.saturn[0]) / 1000);
    const c = legenda('de ponta a ponta');
    // mais de 95 % gelo de água (Cuzzi et al. 2010, Science 327, 1470)
    expect(c.text.startsWith('Gelo:')).toBe(true);
    expect(c.en?.text.startsWith('Ice:')).toBe(true);
    expect(falaPt(c)).toContain(`${milKm} mil km de ponta a ponta`);
    expect(falaEn(c)).toContain(`${milKm},000 km end to end`);
    // espessura vertical local dos anéis principais: de ~10 m a algumas
    // dezenas de metros, até ~1 km só nas bordas e ondas (Cassini;
    // Tiscareno & Murray, Planetary Ring Systems, 2018). A laje do app tem
    // ±12 km — o texto fala do real, não da laje.
    expect(falaPt(c)).toContain('dezenas de metros de espessura');
    expect(falaEn(c)).toContain('tens of metres thick');
    // a idade: pela massa medida no Grand Finale, de 10 a 100 milhões de
    // anos (Iess et al. 2019, Science 364, eaat2965) — debatida, por isso
    // "talvez" e "podem ter"
    expect(falaPt(c)).toContain('talvez jovens — podem ter menos de 100 milhões de anos');
    expect(falaEn(c)).toContain('perhaps young — they may be less than 100 million years old');
  });

  it('Encélado: gêiseres de um oceano salgado sob o gelo, e a Cassini voou dentro deles em 2015', () => {
    // o sal nos grãos da pluma vem de água líquida (Postberg et al. 2011,
    // Nature 474, 620) e o oceano é global (Thomas et al. 2016, Icarus
    // 264, 37); o mergulho mais fundo da Cassini na pluma, a 49 km do polo
    // sul, foi o sobrevoo E21, em 28 de outubro de 2015
    const c = legenda('Encélado —');
    expect(falaPt(c)).toContain('gêiseres de um oceano salgado sob o gelo');
    expect(falaPt(c)).toContain('a Cassini voou dentro deles em 2015');
    expect(falaEn(c)).toContain('geysers from a salty ocean under the ice');
    expect(falaEn(c)).toContain('Cassini flew through them in 2015');
  });

  it('Hipérion: 270 km (diâmetro médio, a esfera de BODY_AXES)', () => {
    const km = 2 * BODY_AXES.hyperion[0];
    const c = legenda('Hipérion');
    expect(falaPt(c)).toContain(`${km} km`);
    expect(falaEn(c)).toContain(`${km} km`);
  });

  it('Titã: a única lua com ar denso, e a Huygens pousou nela em 2005', () => {
    // 1,5 bar no chão, medido pela Huygens (Fulchignoni et al. 2005, Nature
    // 438, 785) — nenhuma outra lua tem mais que traços de ar; o pouso foi
    // em 14 de janeiro de 2005 (Lebreton et al. 2005, Nature 438, 758)
    const c = legenda('Titã —');
    expect(falaPt(c)).toContain('a única lua com ar denso');
    expect(falaPt(c)).toContain('a Huygens pousou aqui em 2005');
    expect(falaEn(c)).toContain('the only moon with a thick atmosphere');
    expect(falaEn(c)).toContain('Huygens landed here in 2005');
  });

  it('Jápeto: uma cara preta e outra branca, e uma muralha de até 20 km no equador (o relevo desenhado vai até 20 km)', () => {
    // a face da frente na órbita reflete poucos por cento da luz e a de
    // trás mais da metade (Spencer & Denk 2010, Science 327, 432); a
    // crista equatorial chega a 20 km de altura (Giese et al. 2008, Icarus
    // 193, 359); o relevo desenhado (sintético, rochoso.ts) tem amplitude
    // de escala × raio = 20,0 km
    const km = Math.round(RELEVO_DA_LUA.iapetus.escala * BODY_AXES.iapetus[0]);
    expect(km).toBe(20);
    const c = legenda('Jápeto —');
    expect(falaPt(c)).toContain('uma cara preta, outra branca');
    expect(falaPt(c)).toContain(`no equador corre uma muralha de até ${km} km`);
    expect(falaEn(c)).toContain('one face black, the other white');
    expect(falaEn(c)).toContain(`a wall up to ${km} km high runs along its equator`);
  });

  it('a Cassini mergulhou em Saturno em 15 de setembro de 2017, de propósito', () => {
    // o fim do Grand Finale: sem combustível, a Cassini foi lançada na
    // atmosfera de Saturno para nunca cair numa lua que pode ter vida,
    // como Encélado ou Titã (NASA/JPL, fim da missão Cassini)
    const c = legenda('Cassini mergulhou');
    expect(falaPt(c)).toContain('Em 15 de setembro de 2017');
    expect(falaPt(c)).toContain('de propósito, para nunca contaminar as luas');
    expect(falaEn(c)).toContain('On 15 September 2017');
    expect(falaEn(c)).toContain('on purpose, so it could never contaminate the moons');
  });

  it('em Urano a luz do Sol é cerca de 1/390 da nossa (no céu de JD_E, a Terra a 0,983 UA), também onde a câmera está quando a legenda entra', () => {
    // 19,49 UA: 1/d² dá 1/380 do que o Sol dá a 1 UA e 1/393 do que a
    // Terra recebe no mesmo céu — a convenção das legendas de Júpiter e
    // Saturno, com dois algarismos significativos
    const duasCasas = (n: number) => Number(n.toPrecision(2));
    const n = duasCasas(maisFraco(emUA(URANO), TERRA_EM_JD_E));
    expect(n).toBe(390);
    const c = legenda('Urano —');
    expect(duasCasas(maisFraco(emUA(camera(c.t)), TERRA_EM_JD_E))).toBe(n);
    expect(falaPt(c)).toContain('gira deitado');
    expect(falaPt(c)).toContain(`cerca de 1/${n} da nossa`);
    expect(falaEn(c)).toContain('spins on its side');
    expect(falaEn(c)).toContain(`about 1/${n} of ours`);
    // "deitado": o polo norte IAU de Urano a 82,2° do polo da órbita, pela
    // efeméride do app (a obliquidade de 97,8°, girando ao contrário) — o
    // eixo a 8° do plano da órbita
    const uranoEm = (jd: number) => {
      const v = motor.posicaoHeliocentrica('uranus', jd);
      return new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z]));
    };
    const poloDaOrbita = uranoEm(RELOGIOS_SOLAR.escuro).cross(uranoEm(RELOGIOS_SOLAR.escuro + 30));
    const polo = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.uranus, RELOGIOS_SOLAR.escuro).polo);
    expect(THREE.MathUtils.radToDeg(polo.angleTo(poloDaOrbita))).toBeCloseTo(82.2, 0);
  });

  it('Tritão gira ao contrário (a órbita, pelos elementos do app, é retrógrada no equador de Netuno), gêiseres de nitrogênio a −235 °C, Voyager 2 em 1989', () => {
    // a órbita: o polo dela a mais de 90° do polo de Netuno — o sinal de
    // uma lua capturada (Agnor & Hamilton 2006, Nature 441, 192)
    const tritaoEm = (jd: number) => {
      const t = motor.posicaoHeliocentrica('triton', jd);
      const n = motor.posicaoHeliocentrica('neptune', jd);
      return new THREE.Vector3(...eclipticaParaEquatorial([t.x - n.x, t.y - n.y, t.z - n.z]));
    };
    const polo = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.neptune, RELOGIOS_SOLAR.escuro).polo);
    const poloDaOrbita = tritaoEm(RELOGIOS_SOLAR.escuro).cross(tritaoEm(RELOGIOS_SOLAR.escuro + 0.1));
    expect(THREE.MathUtils.radToDeg(poloDaOrbita.angleTo(polo))).toBeGreaterThan(90);
    // a superfície a 38 K, medida pela Voyager 2 (Conrath et al. 1989,
    // Science 246, 1454); as plumas de nitrogênio, nas imagens dela
    // (Soderblom et al. 1990, Science 250, 410); o sobrevoo, em 25/08/1989
    expect(Math.round(38 - 273.15)).toBe(-235);
    const c = legenda('Tritão');
    expect(falaPt(c)).toContain('Tritão gira ao contrário: foi capturado');
    expect(falaPt(c)).toContain('gêiseres de nitrogênio a −235 °C; a Voyager 2 passou em 1989');
    expect(falaEn(c)).toContain('Triton orbits backwards: it was captured');
    expect(falaEn(c)).toContain('nitrogen geysers at −235 °C; Voyager 2 flew past in 1989');
  });

  it('Plutão: ao meio-dia a luz é ~1/1300 da nossa (35,4 UA no céu de JD_E, a Terra a 0,983 UA) — a de um fim de tarde na Terra —, um coração de gelo de nitrogênio, New Horizons em 2015', () => {
    // a "hora de Plutão" da NASA: a luz do meio-dia em Plutão é a que a
    // Terra tem perto do pôr do Sol (~1/1000 a 1/1600 do dia aberto, entre
    // 33 e 49 UA); em JD_E Plutão está a 35,4 UA, não às 39 UA da média
    const PLUTAO = pino('pluto');
    expect(emUA(PLUTAO)).toBeCloseTo(35.4, 1);
    const n = Number(maisFraco(emUA(PLUTAO), TERRA_EM_JD_E).toPrecision(2));
    expect(n).toBe(1300);
    // o coração (Sputnik Planitia) é gelo de nitrogênio, com metano e
    // monóxido de carbono (Grundy et al. 2016, Science 351, aad9189); o
    // sobrevoo da New Horizons foi em 14/07/2015
    const c = legenda('Plutão —');
    expect(falaPt(c)).toContain('Plutão — ao meio-dia, a luz é a de um fim de tarde na Terra');
    expect(falaPt(c)).toContain('um coração de gelo de nitrogênio; a New Horizons passou em 2015');
    expect(falaEn(c)).toContain('Pluto — at noon, the light is like late afternoon on Earth');
    expect(falaEn(c)).toContain('a heart of nitrogen ice; New Horizons flew past in 2015');
  });

  it('o retrato de família: a Voyager 1 a 40 UA em 14 de fevereiro de 1990, e a câmera a 40 UA quando a legenda entra', () => {
    // o "Retrato de Família" e o "Pálido Ponto Azul": 14/02/1990, a ~6
    // bilhões de km (40 UA) do Sol (NASA/JPL, PIA00451 e PIA00452)
    const c = legenda('O retrato de família');
    expect(Math.round(emUA(camera(c.t)))).toBe(40);
    expect(falaPt(c)).toContain('a Voyager 1 nos viu em 14 de fevereiro de 1990: a Terra, um ponto azul pálido');
    expect(falaEn(c)).toContain('Voyager 1 saw us on 14 February 1990: Earth, a pale blue dot');
  });

  it('a mesma luz, oito minutos depois: a luz do Sol chega à Terra em 8 min 10,7 s (a Terra a 0,983 UA em JD_A, o céu do epílogo)', () => {
    const minutos = minutosLuz(emUA(TERRA));
    expect(emUA(TERRA)).toBeCloseTo(0.983, 3);
    expect(Math.floor(minutos)).toBe(8);
    expect((minutos - 8) * 60).toBeCloseTo(10.7, 1);
    // o número vai por extenso na legenda
    const POR_EXTENSO: Record<number, [string, string]> = { 8: ['Oito', 'Eight'] };
    const [oito, eight] = POR_EXTENSO[Math.floor(minutos)];
    const c = legenda('A mesma luz');
    expect(falaPt(c)).toContain(`A mesma luz. ${oito} minutos depois.`);
    expect(falaEn(c)).toContain(`The same light. ${eight} minutes later.`);
  });
});
