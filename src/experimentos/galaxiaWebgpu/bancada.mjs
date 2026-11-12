// Bancada do ensaio WebGPU: abre a página de teste num Chrome sem tela e
// roda o que for pedido. Servidor de dev antes, em porta própria:
//   npx vite --port 5331 --strictPort --host 127.0.0.1
// Uso (da raiz):
//   node src/experimentos/galaxiaWebgpu/bancada.mjs tempos  <saida.json>
//   node src/experimentos/galaxiaWebgpu/bancada.mjs grao    <saida.json> <webgl.png> x,y,lado x,y,lado
//   node src/experimentos/galaxiaWebgpu/bancada.mjs foto    <pasta> <vista|todas> <k> [tenda|borrifo] [w] [h]
// Variáveis: SORTEIOS (?sorteios=N), JEITOS (lista), KS (filhas), FATIA (?fatia=), FILTRO (0|1) e LOD (?lod=). Fotos nunca sobrescrevem: ganham -v2, -v3…
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, loadavg } from 'node:os';
import { resolve } from 'node:path';
import {
  GPU_FLAGS, dorme, lancarChrome, ligarSocketCDP, portaDoPerfil,
} from '../../../scripts/visual/chrome.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5331';
const SORTEIOS = process.env.SORTEIOS ?? '4';
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
  // os dois jeitos de depositar: a tenda bilinear e o borrifo (um pixel
  // sorteado por partícula)
  const JEITOS = { tenda: { borrifo: 0 }, borrifo: { borrifo: 1 } };
  const FILTRO = Number(process.env.FILTRO ?? 1);
  const LOD = Number(process.env.LOD ?? 0); // 0 = todas as partículas
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

  const LISTA = (process.env.JEITOS ?? 'tenda,borrifo').split(',');
  const TAMANHOS = (process.env.TAMANHOS ?? '1280x800,2560x1600').split(',').map((t) => t.split('x').map(Number));
  const VISTAS = (process.env.VISTAS ?? 'media,de-cima').split(',');
  const FATIA = Number(process.env.FATIA ?? 4);
  const KS = (process.env.KS ?? '1,2,4').split(',').map(Number);

  if (tarefa === 'tempos') {
    const linhas = [];
    for (const [w, h] of TAMANHOS) {
      for (const vista of VISTAS) {
        for (const jeito of LISTA) {
          for (const k of KS) {
            const m = await avaliar(`window.__gw.medir(${JSON.stringify({ vista, ...JEITOS[jeito], k, w, h, fatia: FATIA, filtro: FILTRO, lod: LOD })}, 20)`);
            m.carga = carga();
            m.jeito = jeito;
            linhas.push(m);
            console.log(`${w}x${h} ${vista} ${jeito} ${m.milhoes.toFixed(1)}M: quadro ${m.parede.toFixed(1)} ms ` +
              `(relógio da GPU: extinção ${m.extincao.toFixed(1)} depósito ${m.deposito.toFixed(1)}) ` +
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
        const url = await avaliar(`window.__gw.foto(${JSON.stringify({ vista: 'media', ...JEITOS[jeito], k, w: 1280, h: 800, filtro: FILTRO, lod: LOD })})`);
        const g = await medirGrao(url);
        linhas.push({ o: jeito, k, grao: g });
        console.log(jeito, `${(info.particulas * k / 1e6).toFixed(1)}M`, g.map((v) => v.toFixed(3)).join(' / '));
      }
    }
    writeFileSync(saida, JSON.stringify({ info, trechos, linhas }, null, 1));
  } else if (tarefa === 'foto') {
    const [pasta, vista, k, modo = 'tenda', w = '1280', h = '800'] = args;
    const milhoes = Math.round((info.particulas * Number(k)) / 1e6);
    const sufixo = (modo === 'tenda' ? '' : `-${modo}`) + (SORTEIOS !== '4' ? `-sorteios${SORTEIOS}` : '') + (FILTRO ? '' : '-semfiltro') +
      (w !== '1280' ? `-${w}` : '');
    const vistas = vista === 'todas' ? ['de-cima', 'inclinada', 'media', 'saindo', 'de-lado'] : [vista];
    for (const v of vistas) {
      const { destino } = await gravarFoto(
        { vista: v, k: Number(k), ...JEITOS[modo], w: Number(w), h: Number(h), fatia: FATIA, filtro: FILTRO, lod: LOD },
        resolve(pasta, `webgpu-${v}-${milhoes}M${sufixo}.png`)
      );
      console.log('gravada', destino);
    }
  } else if (tarefa === 'pares') {
    // quadros do voo em pares vizinhos (t e t + 1/60 s) e o mesmo t duas
    // vezes (e chegando em voo, sufixo v), para medir o que muda entre quadros: pares <pasta> <nome> <pedido JSON>
    const [pasta, nome, pedido] = args;
    for (const t of [5, 15, 25, 35, 45]) {
      for (const [sufixo, dt, fn] of [['a', 0, 'fotoDoVoo'], ['a2', 0, 'fotoDoVoo'], ['b', 1 / 60, 'fotoDoVoo'], ['v', 0, 'fotoEmVoo']]) {
        const url = await avaliar(`window.__gw.${fn}(${t + dt}, ${pedido})`);
        writeFileSync(resolve(pasta, `${nome}-${t}-${sufixo}.png`), Buffer.from(url.split(',')[1], 'base64'));
      }
    }
  } else if (tarefa === 'video') {
    // uma volta do voo, quadro a quadro: video <saida.mp4> <pedido JSON> [fps] [segundos]
    const [saida, pedido, fps = '30', segundos = '50'] = args;
    if (existsSync(saida)) throw new Error(`${saida} já existe: escolha outro nome`);
    const quadros = resolve(tmpdir(), `gw-video-${process.pid}`);
    mkdirSync(quadros);
    const n = Number(fps) * Number(segundos);
    for (let i = 0; i < n; i++) {
      const url = await avaliar(`window.__gw.fotoDoVoo(${i / Number(fps)}, ${JSON.stringify({ ...JSON.parse(pedido), jpeg: true })})`);
      writeFileSync(resolve(quadros, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
    const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-framerate', fps,
      '-i', resolve(quadros, '%05d.jpg'), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', saida], { encoding: 'utf8' });
    rmSync(quadros, { recursive: true, force: true });
    if (r.status !== 0) throw new Error(`ffmpeg falhou: ${r.stderr}`);
    console.log('gravado', saida);
  } else {
    throw new Error('tarefa: tempos | grao | foto | pares | video');
  }
} finally {
  fechar();
  await encerrar();
}
