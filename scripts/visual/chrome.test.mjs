// Serve: chão — o sinal de prontidão quebrado no alvo padrão é ERRO, não silêncio
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
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { julgarProntidao, APP_PADRAO, ligarSocketCDP, esperarCapaSair, flagsDoBinario, lancarChrome, julgarFolgaDoLimite, folgaDoLimiteGb, julgarTetoDoRuido, diferencaPorPixel, TETO_DO_RUIDO } from './chrome.mjs';

describe('o teto de ruído da foto (22/11)', () => {
  // a tela do par nulo do planeta-pixel (diagnóstico §1)
  const total = 3026156;
  it('é 1/255 em 0,03 % dos px, e os 236 px que piscam no D3D11 cabem nele', () => {
    expect(TETO_DO_RUIDO).toEqual({ nivel: 1, fracao: 0.0003 });
    const r = julgarTetoDoRuido({ diferentes: 236, maior: 1, total });
    expect(r.ok).toBe(true);
    expect(r.texto).toContain('236 px de 3026156');
    expect(julgarTetoDoRuido({ diferentes: 0, maior: 0, total }).ok).toBe(true);
  });

  it('CONTROLE NEGATIVO: 2/255 num px só reprova, e 1/255 em px demais também', () => {
    expect(julgarTetoDoRuido({ diferentes: 1, maior: 2, total }).ok).toBe(false);
    expect(julgarTetoDoRuido({ diferentes: Math.floor(total * 0.0003) + 1, maior: 1, total }).ok).toBe(false);
  });

  it('diferencaPorPixel conta px que diferem em algum canal e a maior diferença', () => {
    const a = Uint8Array.from([10, 10, 10, 50, 50, 50, 0, 0, 0]);
    const b = Uint8Array.from([10, 11, 10, 50, 50, 53, 0, 0, 0]);
    expect(diferencaPorPixel(a, b, 3)).toEqual({ diferentes: 2, maior: 3 });
  });
});

describe('a folga do limite de memória do Windows (22/11)', () => {
  const win = (gb) => ({ plataforma: 'win32', gb, erro: null });
  it('abaixo do piso reprova dizendo o número e o que fechar; no piso ou acima passa; fora do Windows não mede', () => {
    const baixo = julgarFolgaDoLimite(win(9), 14);
    expect(baixo.ok).toBe(false);
    expect(baixo.texto).toContain('9 GB');
    expect(baixo.texto).toContain('feche outros Chromes');
    expect(julgarFolgaDoLimite(win(14), 14).ok).toBe(true);
    const fora = julgarFolgaDoLimite(folgaDoLimiteGb({ plataforma: 'linux' }), 14);
    expect(fora).toEqual({ ok: true, texto: 'folga do limite de memória: não medida (fora do Windows)' });
  });

  it('a leitura que FALHA no Windows segue dizendo "folga não lida: <erro>", nunca "fora do Windows" nem 0 GB', () => {
    const falhas = [
      () => ({ error: new Error('spawn powershell ENOENT'), status: null, stdout: null, stderr: null }),
      () => ({ status: 1, stdout: '', stderr: 'Get-CimInstance : acesso negado' }),
      () => ({ status: 0, stdout: '\r\n', stderr: '' }),
    ];
    for (const rodar of falhas) {
      const leitura = folgaDoLimiteGb({ plataforma: 'win32', rodar });
      expect(leitura.gb).toBeNull();
      const v = julgarFolgaDoLimite(leitura, 14);
      expect(v.ok).toBe(true);
      expect(v.texto).toMatch(/^folga não lida: \S/);
      expect(v.texto).not.toContain('fora do Windows');
    }
    const lida = folgaDoLimiteGb({ plataforma: 'win32', rodar: () => ({ status: 0, stdout: '21\r\n', stderr: '' }) });
    expect(lida).toEqual({ plataforma: 'win32', gb: 21, erro: null });
  });
});

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

  it('a queda diz o código e o erro: o `error` vem antes do `close` e não pode engolir o código', async () => {
    const { send, ws } = await ligarFalso();
    const pedido = send('Page.captureScreenshot');
    const erro = new Event('error');
    erro.message = 'Max decompressed size exceeded';
    ws.dispatchEvent(erro);
    const fim = new Event('close');
    fim.code = 1006;
    ws.dispatchEvent(fim);
    await expect(pedido).rejects.toThrow(/fechou \(código 1006, erro: Max decompressed size exceeded\)/);
  });

  it('se o Chrome negociar permessage-deflate, reprova ao ligar em vez de cair na foto grande', async () => {
    const original = globalThis.WebSocket;
    globalThis.WebSocket = class extends SocketFalso {
      extensions = 'permessage-deflate; client_max_window_bits=15';
    };
    try {
      await expect(ligarSocketCDP('ws://falso')).rejects.toThrow(/negociou permessage-deflate/);
    } finally {
      globalThis.WebSocket = original;
    }
  });

  it('com o WebSocket do Node, não oferece compressão e uma mensagem de 6 MiB chega inteira', async () => {
    // servidor que aceita deflate se for oferecido, como o do Chrome; a
    // mensagem vai sem compressão, que é o caminho sem o teto de 4 MiB
    let oferta = null;
    const servidor = createServer();
    servidor.on('upgrade', (req, sock) => {
      oferta = req.headers['sec-websocket-extensions'] ?? '';
      const aceita = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
      sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
        + `Sec-WebSocket-Accept: ${aceita}\r\n`
        + (oferta.includes('permessage-deflate') ? 'Sec-WebSocket-Extensions: permessage-deflate\r\n' : '') + '\r\n');
      const corpo = Buffer.from(JSON.stringify({ method: 'Grande', params: { data: 'A'.repeat(6 * 1048576) } }));
      const tamanho = Buffer.alloc(8);
      tamanho.writeBigUInt64BE(BigInt(corpo.length));
      sock.write(Buffer.concat([Buffer.from([0x81, 127]), tamanho, corpo]));
      sock.on('error', () => {});
    });
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    try {
      let recebida = null;
      const chegou = new Promise((r) => { recebida = r; });
      const { fechar } = await ligarSocketCDP(`ws://127.0.0.1:${servidor.address().port}/`, (m) => recebida(m));
      const m = await chegou;
      fechar();
      expect(oferta).not.toMatch(/permessage-deflate/);
      expect(m.params.data.length).toBe(6 * 1048576);
    } finally {
      servidor.closeAllConnections();
      servidor.close();
    }
  });
});

/**
 * O SEGUNDO TERMO DO OBTURADOR. O defeito que ele fecha foi medido no
 * navegador em 2026-08-23 (`?atlas=1`, 1200×900): a prontidão acendia
 * aos 5,2 s com a fase já em `atlas` e a tela do carregamento ficava
 * mais **2,13 s** por cima — a foto saía com a cartografia da carga no
 * lugar do app (a camada de hoje é a `.tc-tela`, a do rodízio). Aqui prova-se a REGRA, com um `send` de
 * mentira: o navegador é o que a folha `capturas/captura-errada-antes-
 * depois.png` mostra.
 */
const sendDeCapa = (respostas) => {
  const fila = [...respostas];
  return async () => ({ result: { value: fila.length > 1 ? fila.shift() : fila[0] } });
};

describe('esperarCapaSair', () => {
  it('sem capa no documento: `ausente`, e o obturador não espera nada', async () => {
    const r = await esperarCapaSair(sendDeCapa(['']));
    expect(r.estado).toBe('ausente');
  });

  it('a capa que sai vira `saiu` — é o caso que a foto com HUD sofria', async () => {
    const r = await esperarCapaSair(sendDeCapa(['tc-tela tc-desfecho tc-em-voo tc-saindo', '']));
    expect(r.estado).toBe('saiu');
  });

  it('a capa de ERRO é a verdade do quadro: fotografa-se, não se espera', async () => {
    const r = await esperarCapaSair(sendDeCapa(['tc-tela tc-falhou']));
    expect(r.estado).toBe('erro');
  });

  it('capa que nunca sai estoura o teto e DIZ que ficou, em vez de travar', async () => {
    const r = await esperarCapaSair(sendDeCapa(['tc-tela tc-desfecho']), 0);
    expect(r.estado).toBe('ficou');
  });
});

/**
 * O PERFIL É DA PEÇA — a única parte de `lancarChrome` que se prova sem subir
 * Chrome, e a que mais importa manter: o `--user-data-dir` é o CABO pelo qual
 * a sessão é puxada para a morte (`matarPerfil` casa pela linha de comando).
 * O dia em que um chamador puser a flag por conta própria, o registro guarda
 * um perfil e o Chrome roda com outro — e o vigia mata o vazio enquanto o
 * headless de verdade fica desenhando com Metal. É a fábrica de órfãos do
 * item 78 renascendo por um caminho novo, e por isso a peça GRITA em vez de
 * aceitar.
 */
describe('lancarChrome', () => {
  it('recusa quem traz o próprio --user-data-dir: o perfil é o cabo da morte', () => {
    expect(() => lancarChrome({
      perfil: '/tmp/qualquer', args: ['--headless=new', '--user-data-dir=/tmp/outro'],
    })).toThrow(/user-data-dir/);
  });

  it('o Edge (e só ele) entra sem extensões e sem sincronização — a aba de sincronização roubava a frente na matriz do C7', () => {
    expect(flagsDoBinario('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')).toEqual([
      '--disable-extensions',
      '--disable-sync',
    ]);
    expect(flagsDoBinario('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')).toEqual([
      '--disable-extensions',
      '--disable-sync',
    ]);
    expect(flagsDoBinario('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')).toEqual([]);
  });
});
