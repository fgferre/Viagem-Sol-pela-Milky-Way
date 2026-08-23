// O juízo do fallback do harness, sem subir Chrome e sem tocar na GPU
// (importar `chrome.mjs` ainda exige o binário instalado — ele resolve o
// caminho no topo do módulo, de propósito).
//
// Existe porque o caso que mais importa — dev server com o sinal QUEBRADO —
// não tem como ser encenado de fora sem editar `src/`: no dev server o sinal
// funciona, e apontar `APP_URL` para outro lugar já é o outro ramo da regra.
// O que dá para provar de fora (e foi provado, 2026-08-11) é o `vite preview`
// do `dist` servido NA PORTA PADRÃO, que é dev-por-endereço e produção-por-
// bundle; aqui ficam as combinações restantes, incluindo as parciais, que
// nenhum arranjo de servidor encena de propósito.
import { describe, it, expect } from 'vitest';
import { julgarProntidao, APP_PADRAO, ligarSocketCDP } from './chrome.mjs';

const sinal = (n) => Array(n).fill('sinal');
const quadros = (n) => Array(n).fill('quadros');

describe('julgarProntidao', () => {
  it('leva inteira por sinal no alvo padrão: nada a dizer', () => {
    const r = julgarProntidao({ vias: sinal(6) });
    expect(r).toMatchObject({ total: 6, quadros: 0, alvoPadrao: true, erro: false, mensagem: null });
  });

  it('leva inteira no fallback com APP_URL ausente: ERRO com o bloco', () => {
    const r = julgarProntidao({ vias: quadros(6) });
    expect(r.erro).toBe(true);
    expect(r.quadros).toBe(6);
    expect(r.mensagem).toContain('SINAL DE PRONTIDÃO QUEBRADO');
    expect(r.mensagem).toContain('6 de 6 capturas');
    expect(r.mensagem).toContain('FALLBACK_OK=1');
  });

  it('fallback PARCIAL no alvo padrão: mesmo erro — intermitente é pior', () => {
    const r = julgarProntidao({ vias: [...sinal(5), 'quadros'] });
    expect(r.erro).toBe(true);
    expect(r.mensagem).toContain('SINAL DE PRONTIDÃO QUEBRADO');
    expect(r.mensagem).toContain('1 de 6 capturas');
  });

  it('APP_URL apontado para o próprio padrão não compra o perdão', () => {
    for (const u of [APP_PADRAO, `${APP_PADRAO}/`, 'http://localhost:5173']) {
      const r = julgarProntidao({ vias: quadros(2), appUrl: u });
      expect(r.alvoPadrao, u).toBe(true);
      expect(r.erro, u).toBe(true);
    }
  });

  it('APP_URL explícito noutro alvo: só aviso, sem erro', () => {
    const r = julgarProntidao({ vias: quadros(6), appUrl: 'http://127.0.0.1:4173' });
    expect(r).toMatchObject({ alvoPadrao: false, erro: false });
    expect(r.mensagem).toContain('aviso');
    expect(r.mensagem).toContain('4173');
    expect(r.mensagem).not.toContain('SINAL DE PRONTIDÃO QUEBRADO');
  });

  it('FALLBACK_OK=1 silencia o erro mas não a mensagem', () => {
    const r = julgarProntidao({ vias: quadros(6), fallbackOk: true });
    expect(r.erro).toBe(false);
    expect(r.mensagem).toContain('SINAL DE PRONTIDÃO QUEBRADO');
    expect(r.mensagem).toContain('ACEITO por FALLBACK_OK=1');
  });

  it('sem captura nenhuma (tudo de disco, ou --so-medir) não há juízo', () => {
    expect(julgarProntidao({ vias: [] })).toMatchObject({ total: 0, erro: false, mensagem: null });
  });
});

// ============================================================
// O SOCKET DO CDP, sem Chrome. `ligarSocketCDP` fala com o global
// `WebSocket`, então é o global que se troca por um falso — e é a única
// forma de exercitar a rede de segurança dos itens 64 e 78 (o Chrome que
// morre SEM responder), que nenhuma corrida verde percorre.
// ============================================================
class SocketFalso extends EventTarget {
  constructor() {
    super();
    this.enviadas = [];
    this.fechado = false;
    queueMicrotask(() => this.dispatchEvent(new Event('open')));
  }

  send(texto) {
    this.enviadas.push(JSON.parse(texto));
  }

  close() {
    this.fechado = true;
    this.dispatchEvent(new Event('close'));
  }

  /** o Chrome falando: resposta a um `send`, ou evento espontâneo */
  receber(mensagem) {
    const e = new Event('message');
    e.data = JSON.stringify(mensagem);
    this.dispatchEvent(e);
  }
}

async function ligarFalso(aoEvento) {
  const original = globalThis.WebSocket;
  let ws = null;
  globalThis.WebSocket = class extends SocketFalso {
    constructor(alvo) {
      super();
      this.alvo = alvo;
      ws = this;
    }
  };
  try {
    return { ...(await ligarSocketCDP('ws://falso', aoEvento)), ws };
  } finally {
    globalThis.WebSocket = original;
  }
}

describe('ligarSocketCDP', () => {
  it('casa a resposta com o pedido pelo id e devolve o `result`', async () => {
    const { send, ws } = await ligarFalso();
    const pedido = send('Runtime.evaluate', { expression: '1+1' });
    expect(ws.enviadas).toHaveLength(1);
    expect(ws.enviadas[0]).toMatchObject({ id: 1, method: 'Runtime.evaluate' });
    ws.receber({ id: 1, result: { value: 2 } });
    await expect(pedido).resolves.toEqual({ value: 2 });
  });

  it('erro do CDP vira exceção com o método no texto', async () => {
    const { send, ws } = await ligarFalso();
    const pedido = send('Page.navigate');
    ws.receber({ id: 1, error: { message: 'sem alvo' } });
    await expect(pedido).rejects.toThrow('Page.navigate: sem alvo');
  });

  it('o socket que MORRE reprova os pendentes, em vez de dormir para sempre', async () => {
    const { send, fechar, ws } = await ligarFalso();
    const um = send('Runtime.evaluate');
    const dois = send('Page.captureScreenshot');
    fechar();
    expect(ws.fechado).toBe(true);
    await expect(um).rejects.toThrow('o WebSocket do CDP fechou');
    await expect(dois).rejects.toThrow('o WebSocket do CDP fechou');
  });

  it('o que não é resposta vai para `aoEvento` — dali saem cartografia e gritos', async () => {
    const vistos = [];
    const { send, ws } = await ligarFalso((m) => vistos.push(m));
    ws.receber({ method: 'Runtime.consoleAPICalled', params: { type: 'error' } });
    const pedido = send('Runtime.evaluate');
    ws.receber({ id: 1, result: {} });
    await pedido;
    expect(vistos.map((m) => m.method)).toEqual(['Runtime.consoleAPICalled']);
  });
});
