// Serve: chão — o veredito da memória reprova foco que vaza e boot que não assentou, sem subir Chrome
// As contas PURAS do amostrador de memória: a lei dos focos de 21/11/2026
// ("enquadrar não vaza", três contas) e o teto de tempo do boot.
//
// O juiz inteiro captura e não roda aqui; o que decide o veredito roda. Cada
// conta tem o seu CONTROLE NEGATIVO — o app quebrado do jeito que ela existe
// para pegar — e o caso bom ao lado, no molde de `luz-do-quadro.test.mjs`.
import { describe, it, expect } from 'vitest';
import {
  contarDeclarados, esperarRepouso, falhasDoPronto, julgarAssentarDoCiclo, julgarBoot, julgarFocos,
  julgarHeapPorRodada, julgarPrazoForaDoCiclo, julgarRepouso, TETO_DO_BOOT_MS, TETO_DO_REPOUSO_MS,
} from './memoria.mjs';

/** o protocolo dos focos como `memoria.mjs` o escreve, com as contas
 *  trocáveis. Cada amostra leva a `lista` do walker dos texels e a contagem
 *  crua coerente com ela (`fundo` é o que já morava antes da base). */
function protocolo({
  primeira = 1, revisita = 0, revisitaJupiter = 0, pedidos = 0, volta = 0, geo = 0,
} = {}) {
  const mapas = (id, n) => Array.from({ length: n }, (_, k) => `${id}-${k} 8x4`);
  const a = (rotulo, lista, extra = {}) => ({
    rotulo, textures: 39 + lista.length, geometries: 44, lista, ...extra,
  });
  const fundo = ['fundo 4x2'];
  const terra = mapas('earth', primeira);
  const jupiter = mapas('jupiter', 1);
  const saturno = mapas('saturn', 1);
  return [
    a('troca q 3', fundo),
    a('base focos', fundo),
    a('foco earth', [...fundo, ...terra]),
    a('revisita earth', [...fundo, ...terra, ...mapas('earth-de-novo', revisita)], { pedidos }),
    a('foco jupiter', [...fundo, ...terra, ...jupiter], { geometries: 44 + geo }),
    // o mapa da Terra vence a carência DURANTE a 2ª visita de Júpiter: a
    // contagem crua desce, e não é vazamento — e não pode abater o que nasce
    a('revisita jupiter', [...fundo, ...jupiter, ...mapas('jupiter-de-novo', revisitaJupiter)], { pedidos: 0 }),
    a('foco saturn', [...fundo, ...jupiter, ...saturno]),
    a('revisita saturn', [...fundo, ...jupiter, ...saturno], { pedidos: 0 }),
    a('volta focos', [...fundo, ...mapas('resto', volta)]),
  ];
}

const DECLARADOS = { earth: 1, jupiter: 1, saturn: 1 };

describe('julgarFocos', () => {
  it('o app certo passa as três contas: um mapa por corpo, revisita zero, volta à base', () => {
    const f = julgarFocos(protocolo(), DECLARADOS);
    expect([f.primeiraOk, f.revisitaOk, f.voltaOk]).toEqual([true, true, true]);
    expect(f.primeiras.map((p) => p.id)).toEqual(['earth', 'jupiter', 'saturn']);
  });

  it('a 1ª visita alocando MAIS que o conjunto declarado REPROVA', () => {
    expect(julgarFocos(protocolo({ primeira: 2 }), DECLARADOS).primeiraOk).toBe(false);
  });

  it('a Terra com 7 declarados e 7 subindo passa; com 8 reprova', () => {
    const decl = { ...DECLARADOS, earth: 7 };
    expect(julgarFocos(protocolo({ primeira: 7 }), decl).primeiraOk).toBe(true);
    expect(julgarFocos(protocolo({ primeira: 8 }), decl).primeiraOk).toBe(false);
  });

  it('Júpiter com 1 declarado e 2 subindo reprova, e a lista do que subiu sai', () => {
    const a = (rotulo, textures, lista = []) => ({ rotulo, textures, geometries: 44, lista });
    const f = julgarFocos(
      [a('base focos', 40, ['x 1x1']), a('foco jupiter', 42, ['x 1x1', 'map 8x4', 'map 8x4'])],
      { jupiter: 1 }
    );
    expect(f.primeiraOk).toBe(false);
    expect(f.primeiras[0].subiram).toEqual(['map 8x4', 'map 8x4']);
  });

  it('uma textura solta e duas nascidas na MESMA visita, com 1 declarado, REPROVA: soltas não abatem', () => {
    const a = (rotulo, lista) => ({ rotulo, textures: 39 + lista.length, geometries: 44, lista });
    const f = julgarFocos(
      [
        a('base focos', ['fundo 4x2', 'earth-0 8x4']),
        a('foco jupiter', ['fundo 4x2', 'jupiter-0 8x4', 'jupiter-1 8x4']),
      ],
      { jupiter: 1 }
    );
    expect(f.primeiras[0].texturas).toBe(1);
    expect(f.primeiras[0].novas).toBe(2);
    expect(f.primeiraOk).toBe(false);
  });

  it('o que o corpo cria para si (PROPRIAS) passa na quantidade declarada; uma a mais do mesmo tamanho ou um tamanho fora da lista reprova', () => {
    const a = (rotulo, lista) => ({ rotulo, textures: 39 + lista.length, geometries: 44, lista });
    const saturno = (...extra) => julgarFocos(
      [
        a('base focos', ['fundo 4x2']),
        a('foco saturn', ['fundo 4x2', 'sem-nome 2048x1024 #347', 'sem-nome 2048x1 #349',
          'sem-nome 64x1 #351', 'sem-nome 2048x1 #350', ...extra]),
      ],
      { saturn: 1 }
    ).primeiras[0];
    expect(saturno()).toMatchObject({ proprias: 3, excesso: [] });
    expect(julgarFocos([a('base focos', []), a('foco jupiter', ['m 2048x1024', 'd 1x1'])], { jupiter: 1 }).primeiraOk)
      .toBe(true);
    // a terceira 2048×1 reprova mesmo que o mapa do manifesto não tivesse subido
    expect(saturno('sem-nome 2048x1 #352').excesso).toEqual(['3 de 2048x1 (declaradas 2)']);
    // tamanho que não está em PROPRIAS conta contra o manifesto: 2 de 1
    const fora = saturno('sem-nome 512x512 #353');
    expect(fora.novas - fora.proprias).toBe(2);
    // a PROPRIAS de um corpo não vale para outro: a 1×1 de Júpiter na Terra reprova
    expect(julgarFocos([a('base focos', []), a('foco earth', ['m 8x4', 'd 1x1'])], { earth: 1 }).primeiraOk)
      .toBe(false);
  });

  it('textura que o walker não vê ainda conta: a contagem crua é o piso do que nasceu', () => {
    const a = (rotulo, textures) => ({ rotulo, textures, geometries: 44, lista: ['fundo 4x2'] });
    expect(julgarFocos([a('base focos', 40), a('foco jupiter', 42)], { jupiter: 1 }).primeiraOk).toBe(false);
  });

  it('o conjunto declarado sai do manifesto: canais distintos por corpo', () => {
    const e = (corpo, canal) => ({ corpo, canal });
    expect(
      contarDeclarados({
        entradas: [e('earth', 'map'), e('earth', 'map'), e('earth', 'night'), e('jupiter', 'map')],
      })
    ).toEqual({ earth: 2, jupiter: 1 });
  });

  it('a 1ª visita que cria geometria REPROVA: enquadrar não faz malha', () => {
    expect(julgarFocos(protocolo({ geo: 1 }), DECLARADOS).primeiraOk).toBe(false);
  });

  it('a 2ª visita alocando REPROVA, e também a que pede a textura de novo', () => {
    expect(julgarFocos(protocolo({ revisita: 1 }), DECLARADOS).revisitaOk).toBe(false);
    expect(julgarFocos(protocolo({ pedidos: 1 }), DECLARADOS).revisitaOk).toBe(false);
  });

  it('a 2ª visita de Júpiter subindo 1 REPROVA, mesmo com a da Terra limpa e a contagem crua sem subir', () => {
    const f = julgarFocos(protocolo({ revisitaJupiter: 1 }), DECLARADOS);
    expect(f.revisitas.find((r) => r.id === 'earth').novas).toBe(0);
    expect(f.revisitas.find((r) => r.id === 'jupiter').texturas).toBe(0);
    expect(f.revisitaOk).toBe(false);
  });

  it('corpo visitado sem 2ª visita REPROVA: a 2ª visita é cobrada de TODOS', () => {
    const semSaturno = protocolo().filter((a) => a.rotulo !== 'revisita saturn');
    expect(julgarFocos(semSaturno, DECLARADOS).revisitaOk).toBe(false);
  });

  it('a volta que não chega à base REPROVA', () => {
    expect(julgarFocos(protocolo({ volta: 1 }), DECLARADOS).voltaOk).toBe(false);
  });

  it('sem `base focos` (o braço M5) não há veredito de focos', () => {
    expect(julgarFocos([{ rotulo: 'ciclo 1', textures: 40, geometries: 44 }])).toBeNull();
  });
});

describe('julgarHeapPorRodada', () => {
  /** o heap das amostras, em MB, com a carga única do anel na 1ª rodada
   *  dos focos (os números da sonda iii, 22/11) e `r2` o que a 2ª soma */
  const heaps = ({ ciclo = 0, r2 = 1.2 } = {}) =>
    [
      ['boot', 125.7], ['ciclo 1', 128.0], ['ciclo 2', 128.2 + ciclo], ['ciclo 3', 128.3 + 2 * ciclo],
      ['troca q 1', 127.6], ['troca q 2', 127.9], ['troca q 3', 128.0],
      ['base focos', 130.9], ['foco saturn', 154.0], ['volta focos', 153.9],
      ['r2 foco saturn', 156.7], ['volta focos 2', 153.9 + r2],
    ].map(([rotulo, heap]) => ({ rotulo, heap }));

  it('a carga única da 1ª rodada (+20,7 MB) passa: a 2ª rodada soma ~zero', () => {
    const h = julgarHeapPorRodada(heaps());
    expect(h.ok).toBe(true);
    expect(h.rodadas.find((r) => r.para === 'volta focos 2').crescimento).toBeCloseTo(1.2);
  });

  it('a 2ª rodada dos focos crescendo 12,5 MB REPROVA: o teto é 12', () => {
    expect(julgarHeapPorRodada(heaps({ r2: 12.5 })).ok).toBe(false);
  });

  it('um ciclo do portal retendo 16 MB REPROVA (a sabotagem do M5)', () => {
    expect(julgarHeapPorRodada(heaps({ ciclo: 16 })).ok).toBe(false);
  });

  it('um vazamento de 5 MB por rodada, que só por rodada passava, REPROVA pela soma', () => {
    const h = julgarHeapPorRodada(heaps({ ciclo: 5, r2: 5 }));
    expect(h.pior.crescimento).toBeLessThan(12);
    expect(h.ok).toBe(false);
  });

  it('o que cresce DEPOIS do degrau de Saturno conta inteiro: 6 MB dentro da 1ª rodada e 7 na 2ª REPROVAM', () => {
    const h = julgarHeapPorRodada(
      heaps({ r2: 13.1 }).map((a) => (a.rotulo === 'volta focos' ? { ...a, heap: 160.0 } : a))
    );
    expect(h.pior.crescimento).toBeLessThan(12);
    expect(h.soma).toBeLessThan(12);
    expect(h.depoisDoDegrau).toBeCloseTo(13.0);
    expect(h.ok).toBe(false);
  });

  it('a 1ª rodada dos focos sem a 2ª REPROVA: sem ela carga única e vazamento são o mesmo número', () => {
    expect(julgarHeapPorRodada(heaps().filter((a) => a.rotulo !== 'volta focos 2')).ok).toBe(false);
  });
});

describe('julgarBoot', () => {
  it('assentar pelo sinal dentro do teto passa', () => {
    expect(julgarBoot({ via: 'sinal', ms: 34000 })).toBe(true);
  });

  it('boot pelos quadros REPROVA, por mais rápido que seja', () => {
    expect(julgarBoot({ via: 'quadros', ms: 20000 })).toBe(false);
  });

  it('boot pelo sinal DEPOIS de 90 s REPROVA', () => {
    expect(julgarBoot({ via: 'sinal', ms: TETO_DO_BOOT_MS + 1 })).toBe(false);
  });

  it('CONTROLE NEGATIVO: o pronto morto fora dos ciclos (PrazoSemPronto no boot) sai nomeado com a etapa', () => {
    expect(julgarPrazoForaDoCiclo('M5, boot', { ms: 180300, fase: 'loading' }))
      .toBe("o pronto não acendeu em M5, boot (o app deu sinal e o prazo de 180 s estourou, fase 'loading')");
  });
});

describe('o pronto e o repouso dos ciclos', () => {
  it('CONTROLE NEGATIVO: o prazo estourado com o sinal (PrazoSemPronto) é o pronto morto, nomeado; assentado, não', () => {
    const prazo = { ms: 180200, fase: 'intro', sinal: { fase: 'intro', pronto: false } };
    const j = julgarAssentarDoCiclo({ ciclo: 2, passo: 'entrar', prazo });
    expect(j.ok).toBe(false);
    expect(j.texto).toBe("o pronto não acendeu no ciclo 2 (entrar: o app deu sinal e o prazo de 180 s estourou, fase 'intro')");
    expect(julgarAssentarDoCiclo({ ciclo: 2, passo: 'entrar', via: 'quadros', ms: 70000, fase: null }).ok).toBe(true);
    expect(julgarAssentarDoCiclo({ ciclo: 2, passo: 'entrar', via: 'sinal', ms: 1100, fase: 'atlas' }).ok).toBe(true);
    // a lista que os dois braços E o M5 cobram: só as falhas, com o texto
    expect(falhasDoPronto([
      { ciclo: 1, passo: 'partir', via: 'sinal', ms: 900, fase: 'intro' },
      { ciclo: 2, passo: 'entrar', prazo },
    ])).toEqual([j.texto]);
  });

  /** o relógio e os quadros andam a cada espera; `leituras` dá o estado por tempo */
  const repousar = (leitura) => {
    let t = 0;
    let f = 0;
    return esperarRepouso({
      ler: async () => ({ ...leitura(t), f }),
      agora: () => t,
      dormir: async (ms) => { t += ms; f += 3; },
    });
  };

  it('o prazo vencido REPROVA nomeando o que não repousou: workers vivos, camada a caminho', async () => {
    const vazado = await repousar(() => ({ workers: 1, camada: null }));
    expect(vazado).toMatchObject({ ok: false, workers: 1 });
    expect(vazado.ms).toBeGreaterThanOrEqual(TETO_DO_REPOUSO_MS);
    expect(julgarRepouso({ ciclo: 2, ...vazado }).texto).toMatch(/ciclo 2: NÃO repousou .*1 worker\(s\) vivo\(s\)/);
    const subindo = julgarRepouso({ ciclo: 1, ...(await repousar(() => ({ workers: 0, camada: 'subindo' }))) });
    expect(subindo.ok).toBe(false);
    expect(subindo.texto).toMatch(/camada WebGPU 'subindo'/);
    expect(subindo.texto).not.toMatch(/worker/);
    // galáxia ausente não passa por repouso
    expect((await repousar(() => ({ workers: 0, camada: 'sem galáxia' }))).ok).toBe(false);
  });

  it('o repouso que chega no prazo passa e devolve o tempo até ele', async () => {
    const r = await repousar((t) => (t < 7000 ? { workers: 2, camada: 'subindo' } : { workers: 0, camada: null }));
    expect(r.ok).toBe(true);
    expect(r.ms).toBeGreaterThanOrEqual(7000);
    expect(r.ms).toBeLessThan(TETO_DO_REPOUSO_MS);
    expect(julgarRepouso({ ciclo: 1, ...r }).ok).toBe(true);
  });
});
