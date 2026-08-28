// Serve: dono — o roteiro deve pedir recursos e dirigir os marcos de conferência (75).
import { describe, expect, it, vi } from 'vitest';
import { lerApoiosDoPlano, montarApoiosDoRoteiro } from './apoiosDoRoteiro';
import { lerSequencia } from './lerSequencia';
import revelacao from './roteiros/revelacao.json';
import type { Phase } from '../fases';

const camera = {
  duracao: 10, movimento: { tipo: 'fixo', ponto: [1, 2, 3] },
  mira: { tipo: 'fixo', ponto: [0, 0, 0] }, lente: [30, 30],
};

describe('apoios do roteiro — item 75', () => {
  it('liga os apoios da sequência e copia seus dados antes da montagem', () => {
    const dado = { planos: [{
      camera, preload: { corpos: ['earth'], efemerides: true }, qa: { meio: 0.5 },
    }] };
    const planos = lerSequencia(dado);
    dado.planos[0].preload.corpos.push('mars');
    dado.planos[0].qa.meio = 0.9;
    const apoios = montarApoiosDoRoteiro(planos, [20]);
    expect(apoios.preAquecerCorpo(19.999, 'earth')).toBe(false);
    expect(apoios.preAquecerCorpo(20, 'earth')).toBe(true);
    expect(apoios.preAquecerCorpo(29, 'mars')).toBe(false);
    expect(apoios.precisaEfemerides(20)).toBe(true);
    expect(apoios.instanteDeQA('meio')).toBe(25);
    const vazio = montarApoiosDoRoteiro(lerSequencia({ planos: [{ camera }] }), [0]);
    expect(vazio.preAquecerCorpo(5, 'earth')).toBe(false);
    expect(vazio.precisaEfemerides(5)).toBe(false);
  });

  it('recusa apoios inválidos, marcos repetidos e nomes de marco ausentes', () => {
    const casos: [unknown, RegExp][] = [
      [null, /apoios/], [{ preload: null }, /preload/],
      [{ preload: { corpos: 'earth' } }, /corpos/],
      [{ preload: { corpos: [' '] } }, /corpos/],
      [{ preload: { corpos: new Array(1) } }, /corpos/],
      [{ preload: { efemerides: 'true' } }, /efemerides/],
      [{ qa: null }, /qa/], [{ qa: [] }, /qa/], [{ qa: { ' ': 0 } }, /qa/],
      [{ qa: { foto: -0.1 } }, /foto/], [{ qa: { foto: 1 } }, /foto/],
      [{ qa: { foto: NaN } }, /foto/], [{ qa: { foto: '0.5' } }, /foto/],
    ];
    for (const [dado, campo] of casos) expect(() => lerApoiosDoPlano(dado)).toThrow(campo);
    expect(() => montarApoiosDoRoteiro([
      { dur: 4, qa: { foto: 0 } }, { dur: 3, qa: { foto: 0.5 } },
    ], [0, 4])).toThrow(/qa.foto.*repetido/);
    expect(() => montarApoiosDoRoteiro([{ dur: 4 }], [0]).instanteDeQA('ausente')).toThrow(/qa.ausente/);
  });

  it('deriva pedidos cumulativos e marcos dos inícios recebidos, inclusive ao retimar', () => {
    const planos = [
      { dur: 5, preload: { corpos: ['earth'] } },
      { dur: 3, preload: { corpos: ['moon', 'earth'], efemerides: true }, qa: { foto: 0.25 } },
    ];
    const apoios = montarApoiosDoRoteiro(planos, [12, 17]);
    expect(apoios.preAquecerCorpo(11.999, 'earth')).toBe(false);
    expect(apoios.preAquecerCorpo(12, 'earth')).toBe(true);
    expect(apoios.preAquecerCorpo(16.999, 'moon')).toBe(false);
    expect(apoios.preAquecerCorpo(17, 'moon')).toBe(true);
    expect(apoios.precisaEfemerides(16.999)).toBe(false);
    expect(apoios.precisaEfemerides(17)).toBe(true);
    expect(apoios.instanteDeQA('foto')).toBe(17.75);
    const retimado = montarApoiosDoRoteiro([{ ...planos[0], dur: 8 }, planos[1]], [12, 20]);
    expect(retimado.preAquecerCorpo(17, 'earth')).toBe(true);
    expect(retimado.preAquecerCorpo(17, 'moon')).toBe(false);
    expect(retimado.precisaEfemerides(20)).toBe(true);
    expect(retimado.instanteDeQA('foto')).toBe(20.75);
  });

  it('mudar o JSON muda a preparação no Director e os tempos reais de captura', async () => {
    vi.resetModules();
    vi.stubGlobal('window', { location: { search: '' } });
    vi.doMock('./roteiros/apoiosDaViagem.json', () => ({ default: {
      estilingue: { preload: { corpos: ['mars'], efemerides: false } },
    } }));
    vi.doMock('./roteiros/revelacao.json', () => ({ default: {
      planos: revelacao.planos.map((plano, i) => i === 0
        ? { ...plano, preload: { efemerides: true }, qa: { edge: 0.2 } }
        : i === 2 ? { ...plano, qa: { face: 0.8 } } : plano),
    } }));
    try {
      const { Director } = await import('../director');
      const { CAPTURE_T, REVEAL_T, auditarRoteiro } = await import('./journey');
      const audit = auditarRoteiro();
      const perfil = audit.shots[audit.captions.find((c) => c.text === 'ELA NÃO É PLANA')!.shotIndex];
      const face = audit.shots[audit.captions.find((c) => c.text === 'NOSSA GALÁXIA')!.shotIndex];
      expect(CAPTURE_T.edge).toBe(Math.round(perfil.t0 + perfil.dur * 0.2));
      expect(CAPTURE_T.face).toBe(Math.round(face.t0 + face.dur * 0.8));
      // Métodos reais, sem construir DOM/GPU. Só o estado que a política lê.
      const d = Object.create(Director.prototype) as {
        phase: Phase; journeyT: number; escada: { focoCorpoId: string | null };
        preAquecerCorpo: (id: string) => boolean; palcoQuente: boolean;
      };
      Object.assign(d, { phase: 'journey', journeyT: REVEAL_T - 0.001, escada: { focoCorpoId: null } });
      expect(d.preAquecerCorpo('mars')).toBe(false);
      d.journeyT = REVEAL_T;
      expect(d.preAquecerCorpo('mars')).toBe(true);
      expect(d.preAquecerCorpo('earth')).toBe(false);
      expect(d.preAquecerCorpo('moon')).toBe(false);
      expect(d.palcoQuente).toBe(false);
      d.journeyT = perfil.t0;
      expect(d.palcoQuente).toBe(true);
      // A regra do Atlas não veio do roteiro: foco de lua ainda inclui o pai.
      d.phase = 'atlas';
      d.escada.focoCorpoId = 'moon';
      expect(d.preAquecerCorpo('moon')).toBe(true);
      expect(d.preAquecerCorpo('earth')).toBe(true);
      expect(d.preAquecerCorpo('mars')).toBe(false);
      expect(d.palcoQuente).toBe(true);
      d.escada.focoCorpoId = null;
      expect(d.preAquecerCorpo('earth')).toBe(false);
      d.phase = 'free';
      expect(d.preAquecerCorpo('mars')).toBe(false);
      expect(d.palcoQuente).toBe(false);
    } finally {
      vi.doUnmock('./roteiros/apoiosDaViagem.json');
      vi.doUnmock('./roteiros/revelacao.json');
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
