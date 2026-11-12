// Fotografa (e mede) o APP com ou sem o interruptor ?galaxia=. Servidor de
// dev antes (porta 5331). Uso, da raiz:
//   node src/experimentos/galaxiaWebgpu/app.mjs <saida.png|-> '<query>' [largura] [altura]
// Com ?galaxia=webgpu espera todos os sorteios chegarem. Imprime o md5 do
// PNG e os quadros por segundo medidos em 5 s. Nunca sobrescreve.
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir, loadavg } from 'node:os';
import { resolve } from 'node:path';
import { GPU_FLAGS, dorme, lancarChrome, ligarSocketCDP, portaDoPerfil } from '../../../scripts/visual/chrome.mjs';

const [, , saida, query, largura = '1280', altura = '800'] = process.argv;
if (saida !== '-' && existsSync(saida)) throw new Error(`${saida} já existe`);
const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5331';
const perfil = resolve(tmpdir(), `gw-app-${process.pid}`);
const { encerrar } = lancarChrome({
  perfil,
  args: [
    ...GPU_FLAGS, '--enable-unsafe-webgpu', '--hide-scrollbars', '--no-first-run', '--mute-audio',
    '--force-device-scale-factor=1', `--window-size=${largura},${altura}`,
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
  const gritos = [];
  const s = await ligarSocketCDP(alvo, (m) => {
    if (m.method === 'Runtime.exceptionThrown') gritos.push(m.params.exceptionDetails?.exception?.description ?? '?');
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      gritos.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' '));
    }
  });
  fechar = s.fechar;
  await s.send('Runtime.enable');
  await s.send('Page.enable');
  await s.send('Emulation.setDeviceMetricsOverride', {
    width: Number(largura), height: Number(altura), deviceScaleFactor: 1, mobile: false,
  });
  await s.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__f=0;const o=window.requestAnimationFrame.bind(window);'
      + 'window.requestAnimationFrame=(c)=>o((t)=>{window.__f++;return c(t)});',
  });
  const av = async (e) => (await s.send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.value;
  await s.send('Page.navigate', { url: `${BASE}/?${query}` });
  const webgpu = /galaxia=webgpu/.test(query);
  const sorteios = Number(/sorteios=(\d+)/.exec(query)?.[1] ?? 4);
  let estado = '';
  for (let i = 0; i < 300; i++) {
    await dorme(1000);
    estado = await av(`JSON.stringify({ pronto: !!window.__director?.captura?.pronto, gpu: window.__galaxiaWebgpu ? window.__galaxiaWebgpu.sorteios : -1, erros: window.__galaxiaWebgpu?.erros ?? [] })`).catch(() => '');
    const e = estado ? JSON.parse(estado) : {};
    if (e.pronto && (!webgpu || e.gpu >= sorteios || (e.gpu === -1 && i > 60))) break;
    if (gritos.length && i > 15) throw new Error(`o app gritou e não ficou pronto:\n${gritos.slice(0, 3).join('\n')}`);
  }
  await dorme(2500); // a extinção assenta e a cena fica parada
  const f0 = await av('window.__f');
  await dorme(5000);
  const fps = ((await av('window.__f')) - f0) / 5;
  const { data } = await s.send('Page.captureScreenshot', { format: 'png' });
  const png = Buffer.from(data, 'base64');
  if (saida !== '-') writeFileSync(saida, png);
  console.log(`${saida} · md5 ${createHash('md5').update(png).digest('hex')} · ${fps.toFixed(1)} quadros/s · carga ${loadavg()[0].toFixed(1)} · ${estado}`);
  for (const g of gritos.slice(0, 5)) console.log('  grito:', g.slice(0, 300));
} finally {
  fechar();
  await encerrar();
}
