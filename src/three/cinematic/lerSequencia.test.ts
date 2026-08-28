// Serve: dono — a sequência escrita deve comandar câmera, edição e capítulos (item 75).
import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { lerSequencia } from './lerSequencia';
import cinturao from './roteiros/cinturao.json';

const camera = {
  duracao: 2,
  movimento: { tipo: 'reta', de: 'inicio', para: [4, 5, 6] },
  mira: { tipo: 'fixo', ponto: [0, 0, 0] },
  lente: [30, 50],
};
const pontos = { inicio: new Vector3(1, 2, 3) };
const plano = {
  camera,
  legendas: [{ em: 0.25, texto: 'PRIMEIRA', subtexto: 'Detalhe', duracao: 1, ponte: true }],
  assuntos: ['SOL', 'Sirius'],
  fundoSilencioso: false,
  destino: 'Sirius',
  olhar: 'tras',
};

describe('lerSequencia — item 75', () => {
  it('preserva a ordem e entrega câmera, legendas e direção de cada plano', () => {
    const [a, b] = lerSequencia({ planos: [plano, { ...plano, camera: { ...camera, duracao: 5 } }] }, pontos);
    expect([a.dur, b.dur]).toEqual([2, 5]);
    expect(a.pos(0.5, new Vector3()).toArray()).toEqual([2.5, 3.5, 4.5]);
    expect(b.look(1, new Vector3()).toArray()).toEqual([0, 0, 0]);
    expect(a.captions).toEqual([{ at: 0.25, text: 'PRIMEIRA', sub: 'Detalhe', dur: 1, bridge: true }]);
    expect([a.target, a.quiet, a.dest, a.lingua]).toEqual([['SOL', 'Sirius'], false, 'Sirius', 'tras']);
  });

  it('copia os dados editoriais e conserva os padrões quando campos opcionais faltam', () => {
    const dado = structuredClone({ planos: [plano, { camera, legendas: [{ em: 0, texto: 'SÓ TEXTO' }] }] as const });
    const antes = JSON.stringify(dado);
    const [a, b] = lerSequencia(dado, pontos);
    expect(JSON.stringify(dado)).toBe(antes);
    dado.planos[0].legendas[0].texto = 'ALTERADO';
    dado.planos[0].assuntos.push('Rigel');
    expect(a.captions?.[0].text).toBe('PRIMEIRA');
    expect(a.target).toEqual(['SOL', 'Sirius']);
    expect(b.captions?.[0]).toEqual({ at: 0, text: 'SÓ TEXTO', sub: undefined, dur: undefined, bridge: undefined });
    expect([b.target, b.quiet, b.dest, b.lingua]).toEqual([undefined, undefined, undefined, undefined]);
    expect(lerSequencia({ planos: [{ camera }] }, pontos)[0].captions).toBeUndefined();
  });

  it('recusa sequências e dados editoriais inválidos com o campo no erro', () => {
    const com = (campos: Record<string, unknown>) => ({ planos: [{ ...plano, ...campos }] });
    const leg = (campos: Record<string, unknown>) => com({ legendas: [{ ...plano.legendas[0], ...campos }] });
    const casos: [unknown, RegExp][] = [
      [null, /sequencia/], [{}, /planos/], [{ planos: [] }, /planos/],
      [{ planos: [null] }, /planos\[0\]/], [{ planos: new Array(1) }, /planos\[0\]/],
      [com({ camera: { ...camera, duracao: 0 } }), /duracao/],
      [com({ legendas: {} }), /legendas/], [com({ legendas: [null] }), /legendas\[0\]/],
      [leg({ em: -0.1 }), /\.em/], [leg({ em: 1 }), /\.em/], [leg({ em: NaN }), /\.em/],
      [leg({ texto: '' }), /texto/], [leg({ texto: 3 }), /texto/], [leg({ subtexto: null }), /subtexto/],
      [leg({ duracao: 0 }), /duracao/], [leg({ duracao: Infinity }), /duracao/], [leg({ ponte: 1 }), /ponte/],
      [com({ assuntos: 'SOL' }), /assuntos/], [com({ assuntos: [' '] }), /assuntos\[0\]/],
      [com({ fundoSilencioso: 'false' }), /fundoSilencioso/], [com({ destino: '' }), /destino/],
      [com({ olhar: 'lado' }), /olhar/],
    ];
    for (const [dado, campo] of casos) expect(() => lerSequencia(dado, pontos)).toThrow(campo);
  });

  it('mudar a sequência muda ordem, duração, legendas, capítulos e direção no filme real', async () => {
    const { auditarRoteiro: original } = await import('./journey');
    const quantidadeOriginal = original().shotCount;
    const [bolhaLocal, tresMarias, passoAoLado] = cinturao.planos;
    vi.resetModules();
    vi.doMock('./roteiros/cinturao.json', () => ({
      default: { planos: [
        bolhaLocal,
        {
          ...passoAoLado,
          camera: { ...passoAoLado.camera, duracao: 2 },
          legendas: [{ em: 0.25, texto: 'PRIMEIRA DO DADO', subtexto: 'Novo detalhe', duracao: 1 }],
          assuntos: ['Rigel'], fundoSilencioso: false, destino: 'Sirius', olhar: 'tras',
        },
        {
          ...tresMarias,
          camera: { ...tresMarias.camera, duracao: 3 },
          legendas: [{ em: 0.5, texto: 'SEGUNDA DO DADO', duracao: 2, ponte: true }],
        },
        { camera: {
          ...camera, duracao: 1, movimento: { tipo: 'fixo', ponto: [101, 103, 107] },
        } },
      ] },
    }));
    try {
      const { Journey, auditarRoteiro } = await import('./journey');
      const { JourneyRig } = await import('./cameraRig');
      const audit = auditarRoteiro();
      const primeira = audit.captions.find((c) => c.text === 'PRIMEIRA DO DADO')!;
      const segunda = audit.captions.find((c) => c.text === 'SEGUNDA DO DADO')!;
      const inicio = audit.shots[primeira.shotIndex].t0;
      expect(audit.shotCount).toBe(quantidadeOriginal + 1);
      expect(audit.shots.slice(primeira.shotIndex, primeira.shotIndex + 3)).toEqual([
        { t0: inicio, dur: 2, lingua: 'tras' },
        { t0: inicio + 2, dur: 3, lingua: 'assunto' },
        { t0: inicio + 5, dur: 1, lingua: 'frente' },
      ]);
      expect([primeira.t0, primeira.t1, segunda.t0, segunda.t1, segunda.bridge])
        .toEqual([inicio + 0.5, inicio + 1.5, inicio + 3.5, inicio + 5.5, true]);
      const rig = new JourneyRig();
      // Vai e volta no tempo: o texto não depende de ter assistido ao plano anterior.
      expect(rig.captionAt(inicio + 5.25).key.caption).toBe('SEGUNDA DO DADO');
      expect(rig.captionAt(inicio + 0.5).key).toEqual({ caption: 'PRIMEIRA DO DADO', sub: 'Novo detalhe' });
      expect(rig.captionAt(inicio + 1.5).key.caption).toBe('');
      expect(rig.ticks.find((t) => t.text === 'SEGUNDA DO DADO')?.t).toBe(segunda.t0 / rig.duration);
      expect(rig.metaAt(inicio + 1)).toEqual({ target: ['Rigel'], quiet: false, dest: 'Sirius' });
      expect(rig.metaAt(inicio + 2).target).toEqual(['Alnitak', 'Alnilam', 'Mintaka']);
      expect(new Journey().at(inicio + 5).pos.toArray()).toEqual([101, 103, 107]);
      expect(audit.captions.some((c) => c.text === 'AS TRÊS MARIAS' || c.text === 'UM PASSO AO LADO')).toBe(false);
    } finally {
      vi.doUnmock('./roteiros/cinturao.json');
      vi.resetModules();
    }
  });
});
