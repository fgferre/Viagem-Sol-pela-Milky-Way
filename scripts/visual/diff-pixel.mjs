// O passo seguinte a "DIFERE": QUANTOS pixels, de QUANTO, e ONDE.
//
//   node scripts/visual/diff-pixel.mjs capturas/ab-antes-sol-0.png capturas/ab-depois-sol-0.png
//
// `ab-identidade.mjs` prova igualdade por md5 e o próprio cabeçalho dele manda
// rodar o diff de pixel quando dá diferente — porque md5 diferente NÃO é
// conclusão. O projeto já precisou desta conta pelo menos três vezes (as "55 px
// de 3.036.528 em 1 nível" da guarda da cavidade, o "1 px de 3.041.720" do
// recorte da galáxia, os "~50 px" do galsplit) e nunca teve a ferramenta: era
// refeita à mão a cada vez, no scratchpad.
//
// COMO LER O QUE ELE IMPRIME. Delta máximo de 1 nível espalhado por dezenas ou
// centenas de pixels, sem se concentrar em lugar nenhum, é assinatura de 1 ULP
// do compilador — mexer num `if` já reordena a aritmética que o driver gera.
// Conteúdo que sumiu dá outra assinatura: mancha COMPACTA com delta grande. Por
// isso a saída traz o mapa de blocos 16×16, e não só o total: é a concentração
// que separa os dois casos, não a contagem.
//
// E a repetição do PRÓPRIO lado vem antes de comparar os lados — a guarda da
// cavidade tinha 65 px de tremor entre execuções, e citar o par mais favorável
// teria "provado" 1 pixel de diferença que não existia.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { CHROME, GPU_FLAGS, matarPerfil } from './chrome.mjs';

const [A, B] = process.argv.slice(2);
if (!A || !B) throw new Error('uso: diff-pixel.mjs <a.png> <b.png>');
for (const f of [A, B]) if (!existsSync(f)) throw new Error(`não existe: ${f}`);

// A conta roda DENTRO do Chrome porque é ele que já decodifica PNG; o Node
// puro exigiria uma dependência só para isto.
const dir = mkdtempSync(resolve(tmpdir(), 'diffpx-'));
const pagina = resolve(dir, 'diff.html');
writeFileSync(pagina, `<!doctype html><meta charset="utf-8"><pre id="o">…</pre><script>
(async () => {
  const carrega = (src) => new Promise((r, j) => {
    const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src;
  });
  const [a, b] = await Promise.all([carrega(${JSON.stringify('file://' + resolve(A))}),
                                    carrega(${JSON.stringify('file://' + resolve(B))})]);
  if (a.width !== b.width || a.height !== b.height) {
    document.getElementById('o').textContent = JSON.stringify({
      erro: 'tamanhos diferentes', a: a.width + 'x' + a.height, b: b.width + 'x' + b.height });
    return;
  }
  const W = a.width, H = a.height;
  const px = (img) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, W, H).data;
  };
  const pa = px(a), pb = px(b);
  const BL = 16, bw = Math.ceil(W / BL), bh = Math.ceil(H / BL);
  const blocos = new Int32Array(bw * bh);
  const hist = {};
  let n = 0, maxDelta = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0, p = 0; i < pa.length; i += 4, p++) {
    const d = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i+1] - pb[i+1]),
                       Math.abs(pa[i+2] - pb[i+2]));
    if (!d) continue;
    n++;
    hist[d] = (hist[d] || 0) + 1;
    if (d > maxDelta) maxDelta = d;
    const x = p % W, y = (p / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    blocos[((y / BL) | 0) * bw + ((x / BL) | 0)]++;
  }
  let piorBloco = 0, piorIdx = -1;
  for (let i = 0; i < blocos.length; i++) if (blocos[i] > piorBloco) { piorBloco = blocos[i]; piorIdx = i; }
  document.getElementById('o').textContent = JSON.stringify({
    W, H, total: W * H, diferentes: n, fracao: n / (W * H), maxDelta,
    histograma: hist,
    caixa: n ? { x0, y0, x1, y1, larg: x1 - x0 + 1, alt: y1 - y0 + 1 } : null,
    blocosComDiff: blocos.filter((v) => v > 0).length, blocosTotal: bw * bh,
    piorBloco: piorIdx < 0 ? null
      : { x: (piorIdx % bw) * BL, y: (((piorIdx / bw) | 0)) * BL, px: piorBloco, de: BL * BL },
  });
})();
</script>`);

const perfil = resolve(dir, 'perfil');
const saida = resolve(dir, 'dom.html');
const chrome = spawn(CHROME, [
  ...GPU_FLAGS, '--allow-file-access-from-files', '--no-first-run',
  `--user-data-dir=${perfil}`, '--window-size=600,400',
  '--virtual-time-budget=20000', '--dump-dom', `file://${pagina}`,
], { stdio: ['ignore', 'pipe', 'ignore'] });
let dom = '';
chrome.stdout.on('data', (c) => { dom += c; });
try {
  const prazo = Date.now() + 120000;
  for (;;) {
    await new Promise((r) => setTimeout(r, 500));
    if (/<pre[^>]*>\{[\s\S]*?\}<\/pre>/.test(dom) || Date.now() > prazo) break;
  }
} finally {
  chrome.kill();
  matarPerfil(perfil);
}
const bloco = dom.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
if (!bloco || !bloco[1].trim().startsWith('{')) throw new Error('o diff não devolveu resultado');
const r = JSON.parse(bloco[1].replace(/&quot;/g, '"'));
rmSync(dir, { recursive: true, force: true });

if (r.erro) throw new Error(`${r.erro}: ${r.a} vs ${r.b}`);
const pct = (100 * r.fracao).toFixed(5);
console.log(`\n${A}\n${B}\n`);
console.log(`  ${r.W}x${r.H} = ${r.total.toLocaleString('pt-BR')} px`);
console.log(`  diferentes  ${r.diferentes.toLocaleString('pt-BR')}  (${pct}%)`);
if (r.diferentes) {
  console.log(`  delta máx   ${r.maxDelta} de 255`);
  console.log(`  por delta   ${Object.entries(r.histograma).sort((a, b) => a[0] - b[0])
    .map(([d, c]) => `${d}:${c}`).join('  ')}`);
  console.log(`  caixa       ${r.caixa.larg}x${r.caixa.alt} em (${r.caixa.x0},${r.caixa.y0})`);
  console.log(`  blocos 16²  ${r.blocosComDiff} de ${r.blocosTotal} tocados · pior tem ` +
    `${r.piorBloco.px}/${r.piorBloco.de} px em (${r.piorBloco.x},${r.piorBloco.y})`);
  console.log(
    r.maxDelta <= 1
      ? '\n  >>> delta máximo de 1 nível: assinatura de ULP do compilador, não de conteúdo.'
      : '\n  >>> delta acima de 1 nível: olhe a caixa e o pior bloco antes de concluir.'
  );
}
