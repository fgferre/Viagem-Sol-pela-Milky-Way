// Serve: dono — as estrelas S estão onde as órbitas medidas as põem, na data do relógio, e o céu delas é o dos artigos
import { describe, expect, it } from 'vitest';
import { ESTRELAS_S, jdDoAno, posicaoDaEstrelaS } from './estrelasS';
import { AU_PARA_PC } from './atlas/frameGalactico';

// a direção de Sgr A✱ vista do Sol (α = 266,4168°, δ = −29,0078°), equatorial
const G = Math.PI / 180;
const DIR: [number, number, number] = [
  Math.cos(-29.0078 * G) * Math.cos(266.4168 * G),
  Math.cos(-29.0078 * G) * Math.sin(266.4168 * G),
  Math.sin(-29.0078 * G),
];
const estrela = (nome: string) => ESTRELAS_S.find((s) => s.nome === nome)!;
const UA = (v: [number, number, number]) => Math.hypot(...v) / AU_PARA_PC;

/** [norte, leste, para longe] em segundos de arco na R0 da fonte */
function noCeu(ano: number, nome: string): [number, number, number] {
  const s = estrela(nome);
  const v = posicaoDaEstrelaS(jdDoAno(ano), s, DIR);
  const ln = Math.hypot(DIR[0], DIR[1]);
  const leste = [-DIR[1] / ln, DIR[0] / ln, 0];
  const norte = [
    DIR[1] * leste[2] - DIR[2] * leste[1],
    DIR[2] * leste[0] - DIR[0] * leste[2],
    DIR[0] * leste[1] - DIR[1] * leste[0],
  ];
  const dot = (a: readonly number[]) => a[0] * v[0] + a[1] * v[1] + a[2] * v[2];
  const k = 1 / (AU_PARA_PC * s.r0DaFontePc);
  return [dot(norte) * k, dot(leste) * k, dot(DIR) * k];
}

/** o ano da menor distância numa janela, por varredura fina */
function periastroEntre(nome: string, de: number, ate: number): number {
  let melhor = de;
  let dMin = Infinity;
  for (let ano = de; ano <= ate; ano += 0.0005) {
    const d = UA(posicaoDaEstrelaS(jdDoAno(ano), estrela(nome), DIR));
    if (d < dMin) {
      dMin = d;
      melhor = ano;
    }
  }
  return melhor;
}

describe('as estrelas S — Kepler contra os artigos', () => {
  it('S2: periastro em 19/05/2018 a ~120 UA, e a volta de ~16 anos', () => {
    // GRAVITY 2018: "May 19th, 2018", "120 AU"
    const t = periastroEntre('S2', 2017.5, 2019);
    expect(t).toBeCloseTo(2018.379, 2);
    expect(UA(posicaoDaEstrelaS(jdDoAno(t), estrela('S2'), DIR))).toBeGreaterThan(115);
    expect(UA(posicaoDaEstrelaS(jdDoAno(t), estrela('S2'), DIR))).toBeLessThan(125);
    // o periastro anterior, "end of April 2002"
    expect(periastroEntre('S2', 2001.5, 2003)).toBeCloseTo(2002.33, 1);
  });

  it('S14 e S175: periastro na data da tabela, à distância a(1−e)·R0, e a mesma posição um período depois', () => {
    // Gillessen et al. 2017, tabela das órbitas, R0 = 8,33 kpc
    const casos = [
      { nome: 'S14', tP: 2000.12, T: 55.3, peri: 0.2863 * (1 - 0.9761) * 8330 },
      { nome: 'S175', tP: 2009.51, T: 96.2, peri: 0.414 * (1 - 0.9867) * 8330 },
    ];
    for (const c of casos) {
      const t = periastroEntre(c.nome, c.tP - 0.5, c.tP + 0.5);
      expect(t, c.nome).toBeCloseTo(c.tP, 2);
      expect(UA(posicaoDaEstrelaS(jdDoAno(t), estrela(c.nome), DIR)) / c.peri, c.nome).toBeCloseTo(1, 2);
      const a = noCeu(c.tP + 3, c.nome);
      const b = noCeu(c.tP + 3 + c.T, c.nome);
      for (let k = 0; k < 3; k++) expect(b[k] - a[k], c.nome).toBeCloseTo(0, 6);
    }
  });

  it('cada linha da tabela pesa ~4,3 milhões de sóis pela 3ª lei de Kepler (sem erro de cópia)', () => {
    for (const s of ESTRELAS_S) {
      const aUA = s.orbita.aSegArco * s.r0DaFontePc;
      const massa = aUA ** 3 / s.orbita.periodoAnos ** 2;
      expect(massa / 4.3e6, s.nome).toBeGreaterThan(0.9);
      expect(massa / 4.3e6, s.nome).toBeLessThan(1.1);
    }
  });
});

describe('o referencial — o céu de S2 é o da figura 2 de GRAVITY 2018', () => {
  it('periastro logo a sudeste de Sgr A✱, apoastro ~0,18″ ao norte e um pouco a oeste', () => {
    const [nP, lP] = noCeu(2018.379, 'S2');
    expect(nP).toBeGreaterThan(-0.015);
    expect(nP).toBeLessThan(-0.007);
    expect(Math.abs(lP)).toBeLessThan(0.005);
    const [nA, lA] = noCeu(2018.379 - 16.0455 / 2, 'S2');
    expect(nA).toBeGreaterThan(0.16);
    expect(nA).toBeLessThan(0.19);
    expect(lA).toBeLessThan(0);
    expect(lA).toBeGreaterThan(-0.04);
    // em 2002–2005 (lado leste da elipse) e 2012–2017 (lado oeste)
    expect(noCeu(2004, 'S2')[1]).toBeGreaterThan(0.025);
    expect(noCeu(2015, 'S2')[1]).toBeLessThan(-0.04);
  });

  it('a velocidade radial sobe a ~+4.000 km/s antes do periastro e cai a ~−2.000 km/s depois', () => {
    const s = estrela('S2');
    const vr = (ano: number) => {
      const h = 1e-4;
      const kmPorUA = 1.495978707e8;
      const segPorAno = 365.25 * 86400;
      const z = (t: number) => {
        const v = posicaoDaEstrelaS(jdDoAno(t), s, DIR);
        return (v[0] * DIR[0] + v[1] * DIR[1] + v[2] * DIR[2]) / AU_PARA_PC;
      };
      return ((z(ano + h) - z(ano - h)) / (2 * h)) * (kmPorUA / segPorAno);
    };
    let maximo = -Infinity;
    for (let t = 2017.8; t < 2018.379; t += 0.002) maximo = Math.max(maximo, vr(t));
    expect(maximo).toBeGreaterThan(3500);
    expect(maximo).toBeLessThan(4500);
    let minimo = Infinity;
    for (let t = 2018.379; t < 2019.5; t += 0.002) minimo = Math.min(minimo, vr(t));
    expect(minimo).toBeLessThan(-1700);
    expect(minimo).toBeGreaterThan(-2300);
    // 2010 (apoastro): perto de zero, como os pontos da figura
    expect(Math.abs(vr(2010.4))).toBeLessThan(400);
  });
});
