// Serve: dono — a sequência escrita deve comandar câmera, edição e capítulos (item 75).
import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

// ============================================================
// O INGLÊS DAS LEGENDAS (item 130/F3, lista do §19).
//
// O molde: o português fica onde está e ganha um irmão `en` DENTRO da
// mesma legenda. O pt continua sendo a CHAVE — é por ele que `REVEAL_T`
// acha o beat do estilingue, que `auditarRoteiro` nomeia a legenda e que
// os juízes a procuram. Três coisas a provar, e todas mudas se
// quebrarem:
//   · o leitor RECUSA bloco `en` malformado (senão a legenda chega
//     torta na tela em vez de o roteiro não abrir);
//   · o `journey` devolve o inglês com o MESMO `t0`/`t1` — trocar de
//     língua no meio do filme não pode mover um quadro;
//   · legenda sem `en` cai para o português: piso declarado.
// ============================================================
describe('lerSequencia — o bloco `en` das legendas (item 130/F3)', () => {
  const comEn = (en: unknown) => ({
    planos: [{ ...plano, legendas: [{ ...plano.legendas[0], en }] }],
  });

  it('lê o par completo e o par sem subtexto', () => {
    const [a] = lerSequencia(comEn({ texto: 'FIRST', subtexto: 'Detail' }), pontos);
    expect(a.captions?.[0].en).toEqual({ text: 'FIRST', sub: 'Detail' });
    const [b] = lerSequencia(comEn({ texto: 'FIRST' }), pontos);
    expect(b.captions?.[0].en).toEqual({ text: 'FIRST', sub: undefined });
    // e o português continua intacto ao lado
    expect(b.captions?.[0].text).toBe('PRIMEIRA');
  });

  it('legenda SEM `en` é legítima — o piso é o português', () => {
    const [a] = lerSequencia({ planos: [plano] }, pontos);
    expect(a.captions?.[0].en).toBeUndefined();
  });

  it('RECUSA bloco `en` malformado, com o campo no erro', () => {
    const casos: [unknown, RegExp][] = [
      [comEn(null), /\.en/],
      [comEn('FIRST'), /\.en/],
      [comEn([]), /\.en/],
      [comEn({}), /\.en\.texto/],
      [comEn({ texto: '' }), /\.en\.texto/],
      [comEn({ texto: 3 }), /\.en\.texto/],
      [comEn({ subtexto: 'Detail' }), /\.en\.texto/],
      [comEn({ texto: 'FIRST', subtexto: 4 }), /\.en\.subtexto/],
      [comEn({ texto: 'FIRST', subtexto: '' }), /\.en\.subtexto/],
    ];
    for (const [dado, campo] of casos) expect(() => lerSequencia(dado, pontos)).toThrow(campo);
  });
});

describe('a legenda no filme REAL segue a língua, e o RITMO não (item 130/F3)', () => {
  // O IDIOMA VEM POR `import()` DINÂMICO, e isso não é estilo: um teste
  // acima chama `vi.resetModules()`, e a partir dali o `journey` que
  // este arquivo carrega enxerga uma INSTÂNCIA NOVA de `lib/idioma`.
  // Mexer na instância do topo trocaria a língua de um módulo que o
  // filme não lê — e o teste passaria verde medindo o nada.
  const idioma = () => import('../../lib/idioma');

  afterEach(async () => (await idioma()).definirIdioma('pt-BR'));

  it('o inglês sai no MESMO t0/t1 do português — trocar de língua não move um quadro', async () => {
    const { definirIdioma } = await idioma();
    const { JourneyRig } = await import('./cameraRig');
    const { auditarRoteiro } = await import('./journey');
    const rig = new JourneyRig();
    const audit = auditarRoteiro();
    // as janelas saem do roteiro em segundos e não olham o texto
    const janelas = audit.captions.map((c) => [c.t0, c.t1] as const);

    // o par INTEIRO (título + subtexto): cinco legendas são NOME PRÓPRIO
    // de estrela (SIRIUS, BETELGEUSE, RIGEL, ANTARES, SAGITTARIUS A✱) e
    // se escrevem igual nas duas línguas — o que muda nelas é o subtexto
    const fala = ([t0]: readonly [number, number]) => {
      const k = rig.captionAt(t0 + 0.01);
      return { par: `${k.key.caption}‖${k.key.sub ?? ''}`, i: k.index };
    };
    const emPt = janelas.map((j) => fala(j));

    definirIdioma('en');
    const emEn = janelas.map((j) => fala(j));
    const indicesPt = emPt.map((f) => f.i);
    const indicesEn = emEn.map((f) => f.i);

    // MESMAS janelas, MESMOS índices: o ritmo é do roteiro, não do texto
    expect(indicesEn).toEqual(indicesPt);
    expect(auditarRoteiro().captions.map((c) => [c.t0, c.t1] as const)).toEqual(janelas);
    // e o TEXTO mudou nas 24 legendas
    expect(emPt).toHaveLength(24);
    const iguais = emPt.filter((v, i) => v.par === emEn[i]!.par).map((v) => v.par);
    expect(iguais, `legendas que não trocaram: ${iguais.join(' | ')}`).toEqual([]);
    // e o TÍTULO muda nas 19 que não são nome próprio
    const titulos = emPt.filter((v, i) => v.par.split('‖')[0] !== emEn[i]!.par.split('‖')[0]);
    expect(titulos).toHaveLength(19);

    // as MARCAS da barra também falam inglês, no mesmo instante
    const ticksEn = rig.ticks;
    definirIdioma('pt-BR');
    const ticksPt = rig.ticks;
    expect(ticksEn.map((t) => t.t)).toEqual(ticksPt.map((t) => t.t));
    expect(ticksEn.map((t) => t.text)).not.toEqual(ticksPt.map((t) => t.text));
  });

  it('a AUDITORIA continua nomeando a legenda em português — o pt é a CHAVE', async () => {
    const { definirIdioma } = await idioma();
    const { auditarRoteiro } = await import('./journey');
    const emPt = auditarRoteiro().captions.map((c) => c.text);
    definirIdioma('en');
    expect(auditarRoteiro().captions.map((c) => c.text)).toEqual(emPt);
  });

  it('legenda sem `en` cai para o português DENTRO do filme', async () => {
    vi.resetModules();
    const [bolhaLocal] = cinturao.planos;
    vi.doMock('./roteiros/cinturao.json', () => ({
      default: {
        planos: [
          {
            ...bolhaLocal,
            camera: { ...bolhaLocal.camera, duracao: 4 },
            legendas: [
              { em: 0.1, texto: 'COM INGLÊS', en: { texto: 'WITH ENGLISH' }, duracao: 1 },
              { em: 0.5, texto: 'SEM INGLÊS', duracao: 1 },
            ],
          },
        ],
      },
    }));
    try {
      const { definirIdioma } = await idioma();
      const { JourneyRig } = await import('./cameraRig');
      const { auditarRoteiro } = await import('./journey');
      const rig = new JourneyRig();
      const audit = auditarRoteiro();
      const com = audit.captions.find((c) => c.text === 'COM INGLÊS')!;
      const sem = audit.captions.find((c) => c.text === 'SEM INGLÊS')!;
      definirIdioma('en');
      expect(rig.captionAt(com.t0 + 0.01).key.caption).toBe('WITH ENGLISH');
      // o piso: sem `en`, o inglês lê o português — e não uma string vazia
      expect(rig.captionAt(sem.t0 + 0.01).key.caption).toBe('SEM INGLÊS');
    } finally {
      (await idioma()).definirIdioma('pt-BR');
      vi.doUnmock('./roteiros/cinturao.json');
      vi.resetModules();
    }
  });
});
