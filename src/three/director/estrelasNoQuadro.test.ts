// Serve: lei — os parâmetros do motor do Sol pela física de cada estrela visitável, o eixo de Vega e a exposição da visita
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  EXPOENTE_DAS_QUENTES,
  EXPOENTE_DO_BRILHO_ASSISTIDO,
  EstrelasNoQuadro,
  eixoDeRotacao,
  ganhoDaVisita,
  parametrosDoMotor,
} from './estrelasNoQuadro';
import type { NamedStar } from '../config';
import type { StarField } from '../world/stars';
import type { CorposResolvidos } from '../world/corpos/corpos';
import { VAGAS_DE_VISITADAS } from '../world/clarao';
import { ESTRELAS_VISITAVEIS, estrelaVisitavelPorNome } from '../../lib/atlas/estrelasVisitaveis';
import { radianciaVisivelDeCorpoNegro } from '../luzDaCasa';

describe('toda estrela visitável vira parâmetros do MESMO motor, sem nome', () => {
  it('cada uma tem raio, período e atividade finitos', () => {
    for (const e of ESTRELAS_VISITAVEIS) {
      const p = parametrosDoMotor(e);
      expect(p.radiusPc).toBeGreaterThan(0);
      expect(Number.isFinite(p.rotPeriodDays) && p.rotPeriodDays > 0).toBe(true);
      expect(Number.isFinite(p.activityLevel)).toBe(true);
      expect(p.foraDaOrigem).toBe(true);
    }
  });
  it('Betelgeuse: sem dínamo, células gigantes e borda difusa dos dados; grânulos tênues', () => {
    const b = parametrosDoMotor(estrelaVisitavelPorNome('Betelgeuse')!);
    expect(b.dinamo).toBe(false);
    expect(b.celulasGigantes).toEqual({ tamanhoEmRaios: 0.6, contraste: 0.25 });
    expect(b.bordaDifusaRaios).toBe(1.3);
    expect(b.contrasteRelativoAoSol).toBeCloseTo((0.25 * 0.2) / 0.15, 12);
    expect(b.veu).toBeUndefined();
  });
  it('a quente leva o véu (a luz que a exposição não põe no disco) e o piso da granulação', () => {
    const s = parametrosDoMotor(estrelaVisitavelPorNome('Sirius')!);
    expect(s.veu).toBeCloseTo(1 - ganhoDaVisita(9845, 'assistida'), 12);
    expect(s.veu!).toBeGreaterThan(0.5);
    expect(s.contrasteRelativoAoSol).toBeCloseTo(0.04 / 0.15, 12);
    // mais fria que o Sol (51 Peg, 5.761 K): nenhum véu
    expect(parametrosDoMotor(estrelaVisitavelPorNome('Helvetios')!).veu).toBeUndefined();
  });
  it('as anãs não levam células gigantes nem borda difusa', () => {
    const p = parametrosDoMotor(estrelaVisitavelPorNome('Proxima Centauri')!);
    expect(p.celulasGigantes).toBeUndefined();
    expect(p.bordaDifusaRaios).toBeUndefined();
    expect(p.dinamo).toBe(true);
  });
});

describe('o eixo de Vega (Monnier 2012)', () => {
  it('fica a 6,2° da linha até o Sol', () => {
    const pos = new THREE.Vector3(0.9605, -5.9082, 4.8097);
    const eixo = eixoDeRotacao(estrelaVisitavelPorNome('Vega')!, pos, new THREE.Vector3());
    const paraOSol = pos.clone().normalize().negate();
    expect((eixo.angleTo(paraOSol) * 180) / Math.PI).toBeCloseTo(6.2, 9);
  });
});

describe('a exposição da visita: o nível do Sol × (radiância / a do Sol)^e', () => {
  it('no assistido a M sobe e a quente sobe a ⅖; no real nada muda', () => {
    const nivel = (nome: string) => {
      const e = estrelaVisitavelPorNome(nome)!;
      return radianciaVisivelDeCorpoNegro(e.teffK.v) * ganhoDaVisita(e.teffK.v, 'assistida');
    };
    expect(EXPOENTE_DO_BRILHO_ASSISTIDO).toBe(0.25);
    expect(nivel('Proxima Centauri')).toBeCloseTo(0.372, 2);
    expect(nivel('Betelgeuse')).toBeCloseTo(0.51, 2);
    // a quente sobe a ⅖: o ¼ passa a ⅖ junto com o filtro do Sol
    expect(nivel('Sirius')).toBeCloseTo(radianciaVisivelDeCorpoNegro(9845) ** EXPOENTE_DAS_QUENTES, 12);
    expect(EXPOENTE_DAS_QUENTES).toBe(0.4);
    expect(nivel('Proxima Centauri')).toBeLessThan(nivel('Betelgeuse'));
    expect(nivel('Betelgeuse')).toBeLessThan(1);
    expect(nivel('Sirius')).toBeGreaterThan(2);
    expect(ganhoDaVisita(5772, 'assistida')).toBe(1);
    expect(ganhoDaVisita(3054, 'real')).toBe(1);
  });
});

// o motor do Sol precisa de WebGL: no teste ele é um corpo vazio
vi.mock('../world/stellarBody', async (original) => ({
  ...(await original<typeof import('../world/stellarBody')>()),
  StellarBody: class {
    group = new THREE.Group();
    escreverFiltroSolar() {}
    escreverBrilho() {}
    escreverPesoDaLei() {}
    escreverCiclo() {}
    update() {}
    dispose() {}
  },
}));

describe('a nomeada fora da lista à mão ganha piloto pelo foco', () => {
  // as da lista à mão espalhadas a 50 pc (fora do preparo), e Arcturus pelo catálogo
  const named: NamedStar[] = ESTRELAS_VISITAVEIS.map((e, i) => ({
    n: e.nomeNoCatalogo, x: 50 * Math.cos(i), y: 50 * Math.sin(i), z: 0, m: 1, s: '', d: 50,
  }));
  named.push({ n: 'Arcturus', x: 0, y: 11.26, z: 0, m: -0.05, s: 'K1.5III', d: 11.26, ci: 1.23 });
  const xyz = new Float32Array(named.flatMap((n) => [n.x, n.y, n.z]));
  const logLum = new Float32Array(named.map((n) => (-0.15 - (n.m - 5 * Math.log10(n.d))) / 2.5));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(xyz, 3));
  geo.setAttribute('aLogLum', new THREE.BufferAttribute(logLum, 1));
  geo.setAttribute('aCi', new THREE.BufferAttribute(new Float32Array(named.length), 1));
  const cedencias = new Map<number, number>();
  const stars = {
    points: new THREE.Points(geo),
    expoM0: 1,
    sigmaPx: 1,
    writeFocus: (i: number, v: number) => cedencias.set(i, v),
  } as unknown as StarField;
  const palco = { registrar() {}, remover() {} } as unknown as CorposResolvidos;
  const quadro = new EstrelasNoQuadro(named, {
    stars: () => stars,
    palco: () => palco,
    escondido: () => false,
    janelaDoQuadro: 'hoje',
    politicaDeLuz: () => 'real',
    motorDoSol: () => ({ renderer: {} as THREE.WebGLRenderer, camera: new THREE.PerspectiveCamera(), quality: 'alta' }),
  });
  const passo = (focoNome: string | null, camPos = new THREE.Vector3()) =>
    quadro.atualizar({ camPos, hPx: 1000, prAtual: 1, fovDeg: 50, jd: 2461000, tempoS: 0, focoNome });

  it('em foco nasce o corpo no ponto do catálogo, na vaga reservada; sem foco e longe, sai da lista', () => {
    expect(quadro.posicaoDe('Arcturus')).toBeNull();
    passo('Arcturus');
    expect(quadro.posicaoDe('Arcturus')?.toArray()).toEqual([0, Math.fround(11.26), 0]);
    expect(quadro.group.children).toHaveLength(1);
    const [c] = quadro.candidatasAoClarao();
    expect(c.vaga).toBe(VAGAS_DE_VISITADAS - 1);
    expect(c.nomeada).toBe(named.length - 1);
    passo(null);
    expect(quadro.group.children).toHaveLength(0);
    expect(quadro.posicaoDe('Arcturus')).toBeNull();
    expect(cedencias.get(named.length - 1) ?? 0).toBe(0);
  });

  it('o cadastro do clarão cabe: a lista à mão (2 × índice, + 1 se há companheira com corpo) não chega à vaga sob demanda', () => {
    const maior = Math.max(...ESTRELAS_VISITAVEIS.map((e, i) => 2 * i + (e.companheira ? 1 : 0)));
    expect(maior).toBeLessThan(VAGAS_DE_VISITADAS - 1);
  });

  it('as da lista à mão ficam na vaga de sempre (2 × índice)', () => {
    passo('Vega');
    passo('Arcturus');
    const vega = ESTRELAS_VISITAVEIS.findIndex((e) => e.nomeNoCatalogo === 'Vega');
    passo('Vega');
    expect(quadro.candidatasAoClarao().map((c) => c.vaga)).toEqual([2 * vega]);
    passo(null);
  });
});
