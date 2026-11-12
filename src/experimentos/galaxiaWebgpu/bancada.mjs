// Bancada do ensaio WebGPU: abre a página de teste num Chrome sem tela e
// roda o que for pedido. Servidor de dev antes, em porta própria:
//   npx vite --port 5331 --strictPort --host 127.0.0.1
// Uso (da raiz):
//   node src/experimentos/galaxiaWebgpu/bancada.mjs tempos  <saida.json>
//   node src/experimentos/galaxiaWebgpu/bancada.mjs grao    <saida.json> <webgl.png> x,y,lado x,y,lado
//   node src/experimentos/galaxiaWebgpu/bancada.mjs foto    <pasta> <vista|todas> <k> [deposito|borrifo|quadrados] [w] [h]
// Variáveis: SORTEIOS (?sorteios=N), JEITOS (lista), KS (filhas por mãe) e FATIA (?fatia=). Fotos nunca sobrescrevem: ganham -v2, -v3…
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir, loadavg } from 'node:os';
import { resolve } from 'node:path';
import {
  GPU_FLAGS, dorme, lancarChrome, ligarSocketCDP, portaDoPerfil,
} from '../../../scripts/visual/chrome.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5331';
const SORTEIOS = process.env.SORTEIOS ?? '1';
const [, , tarefa, ...args] = process.argv;

const perfil = resolve(tmpdir(), `gw-bancada-${process.pid}`);
const { encerrar } = lancarChrome({
  perfil,
  args: [
    ...GPU_FLAGS, '--enable-unsafe-webgpu', '--enable-features=WebGPU',
    '--hide-scrollbars', '--no-first-run', '--mute-audio',
    '--force-device-scale-factor=1', '--window-size=1400,900',
    '--remote-debugging-port=0', 'about:blank',
  ],
});
let fechar = () => {};
try {
  const porta = await portaDoPerfil(perfil);
  let alvo = null;
  for (let i = 0; i < 100 && !alvo; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
      alvo = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* subindo */ }
    if (!alvo) await dorme(200);
  }
  const s = await ligarSocketCDP(alvo, (m) => {
    if (m.method === 'Runtime.exceptionThrown') console.error('exceção:', m.params.exceptionDetails?.text);
  });
  fechar = s.fechar;
  await s.send('Runtime.enable');
  await s.send('Page.enable');
  const avaliar = async (expressao) => {
    const r = await s.send('Runtime.evaluate', { expression: expressao, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  await s.send('Page.navigate', { url: `${BASE}/webgpu-galaxia.html?sorteios=${SORTEIOS}` });
  for (let i = 0; ; i++) {
    await dorme(1000);
    const st = await avaliar('window.__gwErro ? "ERRO " + window.__gwErro : window.__gw ? "ok" : ""').catch(() => '');
    if (st === 'ok') break;
    if (st.startsWith('ERRO') || i > 240) throw new Error(st || 'a página não ficou pronta em 240 s');
  }
  const info = await avaliar('window.__gw.info');
  console.log('página pronta:', JSON.stringify(info));
  const carga = () => loadavg()[0].toFixed(1);
  // os três jeitos medidos: depósito (tenda bilinear), borrifo (um pixel
  // sorteado por partícula) e quadrados instanciados
  const JEITOS = {
    deposito: { modo: 'deposito', borrifo: 0 },
    borrifo: { modo: 'deposito', borrifo: 1 },
    quadrados: { modo: 'quadrados', borrifo: 0 },
  };
  const livre = (caminho) => {
    let c = caminho;
    for (let v = 2; existsSync(c); v++) c = caminho.replace(/\.png$/, `-v${v}.png`);
    return c;
  };
  const gravarFoto = async (pedido, caminho) => {
    const url = await avaliar(`window.__gw.foto(${JSON.stringify(pedido)})`);
    const destino = livre(caminho);
    writeFileSync(destino, Buffer.from(url.split(',')[1], 'base64'));
    return { destino, url };
  };

  const LISTA = (process.env.JEITOS ?? 'deposito,borrifo,quadrados').split(',');
  const TAMANHOS = (process.env.TAMANHOS ?? '1280x800,2560x1600').split(',').map((t) => t.split('x').map(Number));
  const VISTAS = (process.env.VISTAS ?? 'media,de-cima').split(',');
  const FATIA = Number(process.env.FATIA ?? 1);
  const KS = (process.env.KS ?? '1,2,4,8,16').split(',').map(Number);

  if (tarefa === 'tempos') {
    const linhas = [];
    for (const [w, h] of TAMANHOS) {
      for (const vista of VISTAS) {
        for (const jeito of LISTA) {
          for (const k of KS) {
            const m = await avaliar(`window.__gw.medir(${JSON.stringify({ vista, ...JEITOS[jeito], k, w, h, fatia: FATIA })}, 20)`);
            m.carga = carga();
            m.jeito = jeito;
            linhas.push(m);
            console.log(`${w}x${h} ${vista} ${jeito} ${m.milhoes.toFixed(1)}M: quadro ${m.parede.toFixed(1)} ms ` +
              `(relógio da GPU: luz ${m.luz.toFixed(1)} desenho ${m.desenho.toFixed(1)}) ` +
              `· carga ${m.carga}${m.erros.length ? ' ERRO ' + m.erros[0] : ''}`);
          }
        }
      }
    }
    writeFileSync(args[0], JSON.stringify({ info, linhas }, null, 1));
  } else if (tarefa === 'grao') {
    const [saida, webgl, ...t] = args;
    const trechos = t.map((x) => x.split(',').map(Number));
    const medirGrao = (url) => avaliar(`window.__gw.grao(${JSON.stringify(url)}, ${JSON.stringify(trechos)})`);
    const linhas = [];
    if (webgl !== '-') {
      const g = await medirGrao(`data:image/png;base64,${readFileSync(webgl).toString('base64')}`);
      linhas.push({ o: 'webgl', grao: g });
      console.log('webgl', g.map((v) => v.toFixed(3)).join(' / '));
    }
    for (const jeito of LISTA) {
      for (const k of KS) {
        const url = await avaliar(`window.__gw.foto(${JSON.stringify({ vista: 'media', ...JEITOS[jeito], k, w: 1280, h: 800 })})`);
        const g = await medirGrao(url);
        linhas.push({ o: jeito, k, grao: g });
        console.log(jeito, `${(info.particulas * k / 1e6).toFixed(1)}M`, g.map((v) => v.toFixed(3)).join(' / '));
      }
    }
    writeFileSync(saida, JSON.stringify({ info, trechos, linhas }, null, 1));
  } else if (tarefa === 'foto') {
    const [pasta, vista, k, modo = 'deposito', w = '1280', h = '800'] = args;
    const milhoes = Math.round((info.particulas * Number(k)) / 1e6);
    const sufixo = (modo === 'deposito' ? '' : `-${modo}`) + (SORTEIOS !== '1' ? `-sorteios${SORTEIOS}` : '') +
      (w !== '1280' ? `-${w}` : '');
    const vistas = vista === 'todas' ? ['de-cima', 'inclinada', 'media', 'saindo', 'de-lado'] : [vista];
    for (const v of vistas) {
      const { destino } = await gravarFoto(
        { vista: v, k: Number(k), ...JEITOS[modo], w: Number(w), h: Number(h), fatia: FATIA },
        resolve(pasta, `webgpu-${v}-${milhoes}M${sufixo}.png`)
      );
      console.log('gravada', destino);
    }
  } else {
    throw new Error('tarefa: tempos | grao | foto');
  }
} finally {
  fechar();
  await encerrar();
}
