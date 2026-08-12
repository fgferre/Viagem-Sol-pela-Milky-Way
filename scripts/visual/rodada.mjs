// Captura de rodada: as duas vistas que correspondem às imagens de referência
// (face-on e edge-on), mais a linha de números que vai para o git.
//
// As imagens ficam em capturas/ (fora do git — AGENTS.md regra 5). O que se
// versiona é docs/reference/EVOLUCAO.md: uma linha por rodada, diffável, que
// responde "aproximou ou afastou?" com número em vez de impressão.
//
//   node scripts/visual/rodada.mjs 3 "soma de populações"
//
// Requer o vite dev em 127.0.0.1:5173.
//
// CONSERTADO NA ONDA 4 (fase 0). Este era o único harness que não rodava
// nesta máquina, por três defeitos independentes e acumulados:
//   1. lista de Chrome só com Windows/Linux — o `chrome.mjs` de 2026-08-08
//      unificou os outros três e este ficou de fora;
//   2. `GPU_FLAGS` e `matarPerfil` usados SEM import (uma meia-migração que
//      trocou os literais pelos nomes e esqueceu o `import`) — em qualquer
//      plataforma onde o Chrome fosse achado, morreria com ReferenceError;
//   3. `--virtual-time-budget --screenshot`, que neste Chrome/macOS NÃO
//      TERMINA (NORTE: 400×400 com 8 s de orçamento, 6 min sem gravar PNG).
// A captura passou para `capturarCDP` (o mesmo caminho do `ab-identidade` e do
// `sky-capture`: espera o SINAL de prontidão do app), a medição passou para o
// padrão do `sky-capture` (o critério de pronto é o ARQUIVO, não o processo —
// o Chrome do `--dump-dom` também não sai sozinho), e a URL ganhou
// `&q=cinema`: sem fixar o tier o `autoQuality` rebaixa cinema→alta→
// performance no meio da captura e troca `nebulaSteps` 56→30, o que mudaria
// os números do ledger por motivo alheio à rodada medida.
//
// CONSEQUÊNCIA PARA QUEM LÊ O LEDGER: a rodada 42 é a primeira por este
// caminho. Os números anteriores vieram de outro protocolo de captura (tempo
// virtual, tier livre) — a comparação válida é 42 contra 43 em diante, e a
// descontinuidade está declarada no próprio EVOLUCAO.md.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  CHROME, GPU_FLAGS, matarPerfil, capturarCDP, julgarProntidao, APP_PADRAO,
} from './chrome.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'capturas');
const LEDGER = resolve(ROOT, 'docs/reference/EVOLUCAO.md');
const METRIC = resolve(ROOT, 'scripts/visual/measure-similarity.html');
const APP = process.env.APP_URL || APP_PADRAO;

// As duas vistas espelham docs/reference/gaia-2025-{face-on,edge-on}-5k.jpg.
// Os tempos são o MEIO dos holds de medição do roteiro (journey.ts,
// CAPTURE_T): posição/mira/fov idênticos aos das rodadas 16–25 — só o
// instante na linha do tempo mudou com o roteiro novo (rodada 26).
const VIEWS = [
  { nome: 'faceon', t: 293 },
  { nome: 'edgeon', t: 261 },
];

// TIER FIXO, e não é preferência: ver o cabeçalho e `ab-identidade.mjs`.
const PIN = '&q=cinema';

const round = String(process.argv[2] || '').padStart(2, '0');
const nota = process.argv.slice(3).join(' ') || '';
if (!round || round === '00') throw new Error('uso: node scripts/visual/rodada.mjs <n> "nota"');

// Perfil do Chrome no TEMP do sistema, NUNCA dentro do repo: cada perfil tem
// alguns milhares de arquivos e o script cria um por captura. Em `capturas/`
// eles ficavam ignorados pelo git mas contados pelo VS Code, que passa do
// `git.statusLimit` e desliga metade das funções de Git com um aviso de
// "too many active changes". Em `capturas/` fica só o PNG, que é o produto.
const PROFILE = resolve(tmpdir(), `rodada-${process.pid}`);
mkdirSync(OUT, { recursive: true });

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
// Teto da MEDIÇÃO (a página file:// que compara com a referência). A CAPTURA
// não passa por aqui: ela é `capturarCDP`, que espera a cena assentar.
const TIMEOUT = Number(process.env.RODADA_TIMEOUT || 600000);

let seq = 0;
/**
 * Roda `measure-similarity.html` sobre um PNG e devolve o JSON da régua.
 *
 * O critério de pronto é o ARQUIVO e não o processo — mesma lição do
 * `sky-capture`: o Chrome do `--dump-dom` despeja o DOM e fica vivo, e
 * esperá-lo custava o teto inteiro por execução. A página é estática (lê dois
 * arquivos e conta, sem laço de rAF), então aqui o tempo virtual serve.
 */
async function medir(png, extra = '') {
  const perfil = `${PROFILE}-m${seq++}`;
  const dom = resolve(tmpdir(), `rodada-${process.pid}-dom-${seq}.html`);
  if (existsSync(dom)) rmSync(dom);
  const medidor = spawn(CHROME, [
    ...GPU_FLAGS,
    '--allow-file-access-from-files', '--no-first-run', `--user-data-dir=${perfil}`,
    '--window-size=900,900', '--virtual-time-budget=14000', '--dump-dom',
    `file:///${METRIC.replace(/\\/g, '/')}?a=${png.replace(/\\/g, '/')}${extra}`,
  ], { stdio: ['ignore', openSync(dom, 'w'), 'ignore'] });
  const prazo = Date.now() + TIMEOUT;
  let texto = '';
  let bloco = null;
  for (;;) {
    await dorme(1000);
    texto = existsSync(dom) ? readFileSync(dom, 'utf8') : '';
    bloco = texto.match(/\{\s*"(harmonicError|edgeError)"[\s\S]*?\n\}/);
    if (bloco || /ERRO: /.test(texto) || Date.now() > prazo || medidor.exitCode !== null) break;
  }
  medidor.kill();
  matarPerfil(perfil);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* perfil preso */ }
  if (!bloco) {
    const erro = texto.match(/ERRO: [^<]*/);
    throw new Error(`métrica não devolveu JSON${erro ? ` — ${erro[0]}` : ''}`);
  }
  rmSync(dom, { force: true });
  const j = JSON.parse(bloco[0].replace(/<[^>]*>/g, ''));
  // terceira rede: quadro PRETO. Acontece (visto na rodada 28) quando o app
  // não chega a desenhar — o PNG existe, as duas vistas diferem, e a métrica
  // devolve zeros perfeitamente formatados. Sem esta linha o ledger recebe
  // "0,0000" e parece recorde.
  const brilho = j.ours?.discMean ?? j.ours?.thickRatio ?? 0;
  if (!(brilho > 0.001)) {
    throw new Error(`captura preta (discMean ${brilho}) — a cena não desenhou`);
  }
  return j;
}

try {
  // O dev server já caiu no meio de uma rodada e o Chrome fotografou a página
  // de ERR_CONNECTION_REFUSED: as duas vistas saíram idênticas e a métrica
  // devolveu números plausíveis para uma imagem que não era a galáxia. Um
  // ledger só vale se ele grita quando a medida é lixo.
  const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
  if (!/Mar de Estrelas|<div id="root"/.test(ping)) {
    throw new Error(`o app não respondeu em ${APP} — suba o dev server antes`);
  }

  // por qual caminho cada vista assentou; o veredito sai no fim, com
  // `julgarProntidao` — uma captura por `quadros` no dev server é sinal
  // quebrado, e o ledger não pode receber número medido assim sem aviso
  const vias = [];
  let porta = 9600 + (process.pid % 100);
  for (const v of VIEWS) {
    // shot=2 = modo foto SEM HUD: botões e rótulos entrariam no cálculo.
    // 1800×1800 desde a rodada 24: toLinearFull analisa TUDO em maxDim
    // 1200 — a referência 5k sempre caiu nessa grade, e a captura de 900
    // era analisada em 900: protocolo assimétrico que sub-resolvia a
    // fenda (~4 px, meio-enchida pelo PSF de px fixo — laneDepth media
    // 0,73 no que o render real tem em 0,90). Capturar ≥1200 põe os dois
    // lados na MESMA grade; 1800 ainda ganha o supersampling que o 5k da
    // referência tem no downscale.
    const png = resolve(OUT, `rodada_${round}_${v.nome}.png`);
    // apagar ANTES e exigir DEPOIS é o que separa medida de lixo — sem isso,
    // um Chrome que morre deixa o PNG da rodada anterior no lugar, ele passa
    // pela rede "face ≠ edge" e a métrica devolve números plausíveis para a
    // imagem errada.
    if (existsSync(png)) rmSync(png);
    const cap = await capturarCDP({
      largura: 1800, altura: 1800, porta: porta++,
      url: `${APP}/?t=${v.t}&shot=2${PIN}`,
    });
    writeFileSync(png, cap.png);
    if (!existsSync(png)) throw new Error(`não gravou ${png}`);
    vias.push(cap.via);
    process.stdout.write(`rodada_${round}_${v.nome}.png (via=${cap.via})\n`);
  }

  // segunda rede: face-on e edge-on não podem sair iguais. Se saírem, a
  // navegação não aconteceu e as duas fotos são da mesma cena.
  const [a, b] = VIEWS.map((v) => readFileSync(resolve(OUT, `rodada_${round}_${v.nome}.png`)));
  if (a.length === b.length && a.equals(b)) {
    throw new Error('as duas vistas saíram idênticas — a navegação não aconteceu');
  }

  const m = await medir(resolve(OUT, `rodada_${round}_faceon.png`));
  const e = await medir(resolve(OUT, `rodada_${round}_edgeon.png`), '&mode=edge');
  const faixa = (arr) => {
    // mesma faixa do discMean: 0,25–1,05 R90, em anéis de 1,5·R90/24
    const s = arr.filter((_, i) => { const r = ((i + 0.5) / 24) * 1.5; return r >= 0.25 && r <= 1.05; });
    return s.reduce((x, y) => x + y, 0) / s.length;
  };
  // As TRÊS notas do face-on desde 2026-08-06: harmônicas anel a anel,
  // textura, e tom (perfil+cor+púrpura, que antes não entravam em score
  // nenhum). `purp` continua na linha como diagnóstico — é o número que o
  // VISUAL_TARGETS usa —, mas agora tem juiz dentro do `toneError`.
  const linha = `| ${round} | ${m.harmonicError.toFixed(4)} | ${m.clumpError.toFixed(4)} | `
    + `${m.toneError.toFixed(4)} | ${m.ours.discMean.toFixed(4)} | `
    + `${m.ours.grain.toFixed(4)} | ${faixa(m.ours.purp).toFixed(4)} | ${nota} |`;

  const alvos = `| — | 0 | 0 | 0 | ${m.ref.discMean.toFixed(4)} | ${m.ref.grain.toFixed(4)} | `
    + `${faixa(m.ref.purp).toFixed(4)} | **alvo (recriação científica)** |`;

  let doc = existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8') : `# Evolução por rodada

Uma linha por rodada de implementação, medida contra \`gaia-2025-face-on-5k.jpg\`
pela métrica de \`measure-similarity.html\`. As vistas externas são **recriações
científicas** ancoradas em Gaia, não fotos — ninguém fotografou a Via Láctea de
fora (NORTE.md). A única foto real do projeto é o panorama ESO, visto de DENTRO.
Gerado por \`node scripts/visual/rodada.mjs <n> "nota"\`.

As capturas ficam em \`capturas/\` e **não** são versionadas (AGENTS.md regra 5):
o que responde "aproximou ou afastou" é o número, não o PNG. Para a revisão
final, as imagens locais e esta tabela se leem juntas.

\`harmonicError\` menor é melhor; as outras três buscam o alvo.

| rodada | harmonicError | discMean | grain | purp | o que mudou |
|---|---|---|---|---|---|
${alvos}
`;
  // a linha face-on entra no FIM da PRIMEIRA tabela — não no fim do
  // arquivo, que depois da rodada 12 é a tabela edge-on
  if (!doc.includes(`\n| ${round} |`)) {
    const cut = doc.indexOf('\n## Edge-on');
    doc = cut < 0
      ? doc.trimEnd() + '\n' + linha + '\n'
      : doc.slice(0, cut).trimEnd() + '\n' + linha + '\n' + doc.slice(cut);
  }

  // Edge-on: a física vertical tem gate próprio (espessura, faixa escura,
  // warp, razão axial, cor por altura) — modos de falha disjuntos da face-on.
  const linhaE = `| ${round} | ${e.edgeError.toFixed(4)} | ${e.ours.thickRatio.toFixed(4)} | `
    + `${e.ours.axialRatio.toFixed(4)} | ${e.ours.laneDepth.toFixed(4)} | `
    + `${e.ours.warpAmp.toFixed(4)} | ${nota} |`;
  const alvosE = `| — | 0 | ${e.ref.thickRatio.toFixed(4)} | ${e.ref.axialRatio.toFixed(4)} | `
    + `${e.ref.laneDepth.toFixed(4)} | ${e.ref.warpAmp.toFixed(4)} | **alvo (recriação científica)** |`;
  if (!doc.includes('## Edge-on')) {
    doc = doc.trimEnd() + `

## Edge-on

\`edgeError\` menor é melhor (medida \`?mode=edge\` contra
\`gaia-2025-edge-on-5k.jpg\`); as outras buscam o alvo.

| rodada | edgeError | thickRatio | axialRatio | laneDepth | warpAmp | o que mudou |
|---|---|---|---|---|---|---|
${alvosE}
`;
  }
  // A MESMA armadilha que o comentário da face-on descreve, e ela mordeu na
  // rodada 37: apendar no fim do ARQUIVO punha a linha do edge-on DENTRO da
  // tabela "Céu interno", que entrou depois — cinco números do edge-on numa
  // tabela de seis colunas do céu, e o ledger passou por commit assim. A
  // linha entra no fim da PRÓPRIA seção, e a checagem de duplicata olha só
  // ela (o regex antigo era guloso e encontrava a rodada em QUALQUER tabela
  // abaixo, o que também mascarava o erro).
  const ini = doc.indexOf('\n## Edge-on');
  const prox = doc.indexOf('\n## ', ini + 1);
  const fim = prox < 0 ? doc.length : prox;
  if (!doc.slice(ini, fim).includes(`\n| ${round} |`)) {
    doc = doc.slice(0, fim).trimEnd() + '\n' + linhaE + '\n' + doc.slice(fim);
  }
  writeFileSync(LEDGER, doc);
  process.stdout.write('\n' + linha + '\n' + alvos + '\n' + linhaE + '\n' + alvosE + '\n');

  // POR ÚLTIMO, depois das linhas: o gate GRITA e SAI ≠ 0 se o sinal de
  // prontidão não subiu no alvo padrão. O ledger já está escrito e na tela —
  // o que a saída ≠ 0 diz é "não valide nada com isto".
  const prontidao = julgarProntidao({
    vias, appUrl: process.env.APP_URL, fallbackOk: process.env.FALLBACK_OK === '1',
  });
  if (prontidao.mensagem) process.stderr.write(prontidao.mensagem);
  if (prontidao.erro) process.exitCode = 1;
} finally {
  // mata só o que este script subiu — casa pelo user-data-dir
  matarPerfil(PROFILE);
}
