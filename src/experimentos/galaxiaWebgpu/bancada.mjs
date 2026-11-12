// Bancada do ensaio WebGPU: abre a página de teste num Chrome sem tela e
// roda o que for pedido. Servidor de dev antes, em porta própria:
//   npx vite --port 5331 --strictPort --host 127.0.0.1
// Uso (da raiz):
//   node src/experimentos/galaxiaWebgpu/bancada.mjs tempos  <saida.json>
//   node src/experimentos/galaxiaWebgpu/bancada.mjs grao    <saida.json> <webgl.png> x,y,lado x,y,lado
//   node src/experimentos/galaxiaWebgpu/bancada.mjs foto    <pasta> <vista> <k> [modo] [w] [h]
// ?sorteios=N na variável SORTEIOS. Fotos nunca sobrescrevem: ganham -v2, -v3…
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

  if (tarefa === 'tempos') {
    const linhas = [];
    for (const [w, h] of [[1280, 800], [2560, 1600]]) {
      for (const vista of ['media', 'de-cima']) {
        for (const modo of ['deposito', 'quadrados']) {
          for (const k of [1, 2, 4, 8, 16]) {
            const m = await avaliar(`window.__gw.medir(${JSON.stringify({ vista, modo, k, w, h })}, 10)`);
            m.carga = carga();
            linhas.push(m);
            console.log(`${w}x${h} ${vista} ${modo} ${m.milhoes.toFixed(1)}M: GPU ${m.gpu.toFixed(1)} ms ` +
              `(luz ${m.luz.toFixed(1)} desenho ${m.desenho.toFixed(1)} tom ${m.tom.toFixed(1)}) ` +
              `quadro ${m.parede.toFixed(1)} ms · carga ${m.carga}${m.erros.length ? ' ERRO ' + m.erros[0] : ''}`);
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
    for (const modo of ['deposito', 'quadrados']) {
      for (const k of [1, 2, 4, 8, 16]) {
        const url = await avaliar(`window.__gw.foto(${JSON.stringify({ vista: 'media', modo, k, w: 1280, h: 800 })})`);
        const g = await medirGrao(url);
        linhas.push({ o: modo, k, grao: g });
        console.log(modo, `${(info.particulas * k / 1e6).toFixed(1)}M`, g.map((v) => v.toFixed(3)).join(' / '));
      }
    }
    writeFileSync(saida, JSON.stringify({ info, trechos, linhas }, null, 1));
  } else if (tarefa === 'foto') {
    const [pasta, vista, k, modo = 'deposito', w = '1280', h = '800'] = args;
    const milhoes = Math.round((info.particulas * Number(k)) / 1e6);
    const sufixo = (modo === 'quadrados' ? '-quadrados' : '') + (SORTEIOS !== '1' ? `-sorteios${SORTEIOS}` : '') +
      (w !== '1280' ? `-${w}` : '');
    const { destino } = await gravarFoto(
      { vista, k: Number(k), modo, w: Number(w), h: Number(h) },
      resolve(pasta, `webgpu-${vista}-${milhoes}M${sufixo}.png`)
    );
    console.log('gravada', destino);
  } else {
    throw new Error('tarefa: tempos | grao | foto');
  }
} finally {
  fechar();
  await encerrar();
}
