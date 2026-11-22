// Serve: chão — o veredito da memória reprova foco que vaza e boot que não assentou, sem subir Chrome
// As contas PURAS do amostrador de memória: a lei dos focos de 21/11/2026
// ("enquadrar não vaza", três contas) e o teto de tempo do boot.
//
// O juiz inteiro captura e não roda aqui; o que decide o veredito roda. Cada
// conta tem o seu CONTROLE NEGATIVO — o app quebrado do jeito que ela existe
// para pegar — e o caso bom ao lado, no molde de `luz-do-quadro.test.mjs`.
import { describe, it, expect } from 'vitest';
import { bootAteOSinal, julgarBoot, julgarFocos, TETO_DO_BOOT_MS } from './memoria.mjs';

/** o protocolo dos focos como `memoria.mjs` o escreve, com as contas trocáveis */
function protocolo({ primeira = 1, revisita = 0, pedidos = 0, volta = 0, geo = 0 } = {}) {
  const a = (rotulo, textures, extra = {}) => ({ rotulo, textures, geometries: 44, ...extra });
  return [
    a('troca q 3', 40),
    a('base focos', 40),
    a('foco earth', 40 + primeira),
    a('revisita earth', 40 + primeira + revisita, { pedidos }),
    // o mapa da Terra venceu a carência no caminho de Júpiter: a 1ª visita
    // pode DESCER, e não é vazamento
    a('foco jupiter', 40 + primeira + revisita, { geometries: 44 + geo }),
    a('foco saturn', 41 + primeira + revisita),
    a('volta focos', 40 + volta),
  ];
}

describe('julgarFocos', () => {
  it('o app certo passa as três contas: um mapa por corpo, revisita zero, volta à base', () => {
    const f = julgarFocos(protocolo());
    expect([f.primeiraOk, f.revisitaOk, f.voltaOk]).toEqual([true, true, true]);
    expect(f.primeiras.map((p) => p.id)).toEqual(['earth', 'jupiter', 'saturn']);
  });

  it('a 1ª visita alocando DUAS texturas num corpo REPROVA', () => {
    expect(julgarFocos(protocolo({ primeira: 2 })).primeiraOk).toBe(false);
  });

  it('a 1ª visita que cria geometria REPROVA: enquadrar não faz malha', () => {
    expect(julgarFocos(protocolo({ geo: 1 })).primeiraOk).toBe(false);
  });

  it('a 2ª visita alocando REPROVA, e também a que pede a textura de novo', () => {
    expect(julgarFocos(protocolo({ revisita: 1 })).revisitaOk).toBe(false);
    expect(julgarFocos(protocolo({ pedidos: 1 })).revisitaOk).toBe(false);
  });

  it('a volta que não chega à base REPROVA', () => {
    expect(julgarFocos(protocolo({ volta: 1 })).voltaOk).toBe(false);
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
