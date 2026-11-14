// Serve: dono — o terceiro filme monta pelo roteiro: o prólogo escrito, os assuntos que o app sabe nomear e o relógio que anda dentro de um plano
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../../../config';
import { comAnfitrias } from '../../../../lib/exoplanetas';

// mesmo stub dos vizinhos: journey.ts puxa world/galaxy.ts, que lê
// window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { JD_DO_FILME_ESTELAR_TDB, montarFilmeEstelar } = await import('./montar');
const { assuntoDasTabelas } = await import('../../assuntos');
const { posicaoDoExoplanetaNaCena } = await import('../../../world/exoplanetas');
const { ESTRELAS_DO_FILME } = await import('./estrelas');
const prologo = (await import('../../roteiros/estelar/prologo.json')).default;

const meta = JSON.parse(
  readFileSync(new URL('../../../../../public/data/stars_meta.json', import.meta.url), 'utf8')
) as { named: NamedStar[] };
const nomeadas = new Set(comAnfitrias(meta.named).map((s) => s.n));

/** um plano mínimo de prova, depois do prólogo */
const plano = (extra: Record<string, unknown>) => ({
  planos: [{
    camera: {
      duracao: 10,
      movimento: { tipo: 'fixo', ponto: [0, 0, 1] },
      mira: { tipo: 'fixo', ponto: 'TRAPPIST-1' },
      lente: [40, 40],
    },
    ...extra,
  }],
});

describe('o filme estelar (E0)', () => {
  it('o prólogo: três planos, ~22 s, e todo assunto é algo que o app desenha com nome', () => {
    const m = montarFilmeEstelar();
    expect(m.shots.map((s) => s.nome)).toEqual(['solNaMetade', 'paraOrion', 'orionDeCasa']);
    expect(m.duracao).toBe(22);
    const assuntos = m.shots.flatMap((s) => s.target ?? []);
    expect(assuntos).toEqual(['Betelgeuse', 'Rigel', 'Alnitak', 'Alnilam', 'Mintaka']);
    // contra o catálogo de verdade: tabela da Busca, ou estrela das nomeadas
    for (const nome of assuntos) expect(assuntoDasTabelas(nome) !== null || nomeadas.has(nome), nome).toBe(true);
    // o prólogo pousa no mirante olhando Órion, com o Sol atrás da câmera
    const fim = m.shots[2];
    const pos = fim.pos(1, new THREE.Vector3());
    const olhar = fim.look(1, new THREE.Vector3()).sub(pos).normalize();
    expect(olhar.dot(pos.clone().normalize())).toBeGreaterThan(0.999);
  });

  it('assunto que o app não sabe nomear é recusado na montagem, com o nome', () => {
    expect(() => montarFilmeEstelar([prologo, plano({ assuntos: ['Plêiades'] })])).not.toThrow();
    expect(() => montarFilmeEstelar([prologo, plano({ assuntos: ['Sírius B', 'Próxima b', 'TRAPPIST-1'] })])).not.toThrow();
    expect(() => montarFilmeEstelar([prologo, plano({ assuntos: ['Plêiade'] })])).toThrow(/“Plêiade”/);
  });

  it('o relógio anda só no plano que o declara, sem degrau, e TRAPPIST-1 e anda junto', () => {
    const m = montarFilmeEstelar([prologo, plano({ relogio: { diasPorSegundo: 1.5 } })]);
    const t0 = m.starts[3];
    // o prólogo é uma data só
    expect(m.jdDoFilme(0)).toBe(JD_DO_FILME_ESTELAR_TDB);
    expect(m.jdDoFilme(t0)).toBe(JD_DO_FILME_ESTELAR_TDB);
    // dentro do plano, 1,5 dia por segundo; depois do fim, para onde parou
    expect(m.jdDoFilme(t0 + 4)).toBeCloseTo(JD_DO_FILME_ESTELAR_TDB + 6, 9);
    expect(m.jdDoFilme(t0 + 10)).toBeCloseTo(JD_DO_FILME_ESTELAR_TDB + 15, 9);
    expect(m.jdDoFilme(t0 + 99)).toBeCloseTo(JD_DO_FILME_ESTELAR_TDB + 15, 9);
    const estrela = ESTRELAS_DO_FILME['TRAPPIST-1'];
    const e = (t: number) => posicaoDoExoplanetaNaCena('trappist-1e', m.jdDoFilme(t), estrela)!;
    // 6,1 dias de período: em 4 s de plano (6 dias) ele quase dá a volta
    expect(e(t0).distanceTo(e(t0 + 2))).toBeGreaterThan(0.02 * 4.848e-6);
  });
});
