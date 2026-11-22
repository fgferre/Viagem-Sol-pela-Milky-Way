// Serve: chão — o veredito da memória reprova foco que vaza e boot que não assentou, sem subir Chrome
// As contas PURAS do amostrador de memória: a lei dos focos de 21/11/2026
// ("enquadrar não vaza", três contas) e o teto de tempo do boot.
//
// O juiz inteiro captura e não roda aqui; o que decide o veredito roda. Cada
// conta tem o seu CONTROLE NEGATIVO — o app quebrado do jeito que ela existe
// para pegar — e o caso bom ao lado, no molde de `luz-do-quadro.test.mjs`.
import { describe, it, expect } from 'vitest';
import {
  bootAteOSinal, contarDeclarados, julgarBoot, julgarFocos, TETO_DO_BOOT_MS,
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

  it('o sinal que não chega até o teto deixa o `via` dos quadros, e o veredito reprova', async () => {
    let t = 0;
    const boot = await bootAteOSinal({
      ir: async () => { t = 20000; return { via: 'quadros' }; },
      esperarSinal: async (resta) => { t += resta; throw new Error('teto'); },
      agora: () => t,
    });
    expect(boot).toEqual({ via: 'quadros', ms: TETO_DO_BOOT_MS });
    expect(julgarBoot(boot)).toBe(false);
  });
});
