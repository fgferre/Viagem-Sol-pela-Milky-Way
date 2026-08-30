// Serve: lei — o céu interno contra o panorama ESO: 6 faces costuradas e os cinco termos da régua
// Custo: 0,7 min
// Gate da vista interna: captura as 6 faces do cubo do céu a partir do
// Sol, costura, mede contra o panorama ESO e imprime os termos.
//
//   node scripts/visual/sky-capture.mjs                 # baseline
//   node scripts/visual/sky-capture.mjs nowrap "&nowrap=1"   # ablação
//   node scripts/visual/sky-capture.mjs --perfil        # + perfil por longitude
//   node scripts/visual/sky-capture.mjs av05 --so-medir # re-mede PNGs já capturados
//   FALLBACK_OK=1 node scripts/visual/sky-capture.mjs   # aceita o modo lento
//
// `--so-medir` existe porque a RÉGUA muda mais que o render: toda vez que
// um termo é consertado (r37, auditoria, r38) o histórico inteiro precisa
// ser re-baselinado, e re-capturar dez configurações é meia hora de GPU
// para produzir bytes idênticos aos que já estão em disco. Sem dev server.
//
// Cada face: ?pos=0,0,0&look=<dir>&fov=90&shot=2 em janela quadrada — o
// FreeRoam canoniza a orientação (yaw/pitch no referencial galáctico +
// up galáctico), e sky-measure.html replica essa matemática para costurar.
//
// A MEDIÇÃO mora aqui de propósito. Capturar e medir eram dois comandos,
// e o segundo (um Chrome com file:// e --dump-dom) foi reescrito do zero
// em pelo menos duas rodadas porque vivia no scratchpad. Um comando só.
import { mkdirSync, existsSync, rmSync, readFileSync, writeFileSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  GPU_FLAGS, lancarChrome, matarPerfil, capturarCDP, julgarProntidao, APP_PADRAO,
} from './chrome.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MEASURE = resolve(ROOT, 'scripts/visual/sky-measure.html');
const REF = resolve(ROOT, 'docs/reference/eso-gigagalaxy-panorama.jpg');
const APP = process.env.APP_URL || APP_PADRAO;
const FLAGS = ['--perfil', '--so-medir'];
const args = process.argv.slice(2).filter((a) => !FLAGS.includes(a));
const comPerfil = process.argv.includes('--perfil');
const soMedir = process.argv.includes('--so-medir');
const tag = args[0] || 'base';
const extra = args[1] || '';
const OUT = resolve(process.cwd(), tag === 'base' ? 'sky' : `sky_${tag}`);
mkdirSync(OUT, { recursive: true });
// Os perfis do Chrome vão para o TEMP do sistema, não para dentro do repo:
// cada perfil tem alguns milhares de arquivos, e uma bateria de doze capturas
// enchia a pasta do projeto com mais de cem mil — o VS Code passa do limite
// do `git.statusLimit` e desliga metade das funções de Git. Só os 6 PNGs e o
// dom.html ficam em OUT, que é o produto da medição.
const PERFIS = resolve(tmpdir(), `sky-capture-${process.pid}`);
mkdirSync(PERFIS, { recursive: true });

// base galáctica (idêntica a galaxy.ts)
const N = [-0.867666149, -0.1980763734, 0.4559837762]; // polo norte
const DIRGC = [-0.0548755604, -0.8734370902, -0.4838350155]; // Sol→centro
const A = DIRGC.map((v) => -v); // anticentro (FRAME_A do rig)
const B = [
  N[1] * A[2] - N[2] * A[1],
  N[2] * A[0] - N[0] * A[2],
  N[0] * A[1] - N[1] * A[0],
]; // cross(N, A) = FRAME_B

const FACES = [
  { nome: 'gc', dir: DIRGC }, // l=0
  { nome: 'anti', dir: A }, // l=180
  { nome: 'l90', dir: B.map((v) => -v) }, // l=90 = -FRAME_B
  { nome: 'l270', dir: B }, // l=270
  { nome: 'npole', dir: N }, // b=+90
  { nome: 'spole', dir: N.map((v) => -v) }, // b=-90
];

// Teto da MEDIÇÃO (a página file:// que costura e compara). As faces não
// passam mais por aqui: elas são capturadas por CDP, que espera a cena
// assentar em vez de apostar num orçamento de tempo virtual — ver capturarCDP
// em chrome.mjs para o porquê (o `--virtual-time-budget --screenshot` não
// termina neste Chrome/macOS: 6 min sem sair numa janela de 400×400).
const TIMEOUT = Number(process.env.SKY_TIMEOUT || 600000);

if (!soMedir) {
  const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
  if (!/<div id="root"/.test(ping)) throw new Error(`o app não respondeu em ${APP} — suba o dev server`);
}

let porta = 9700 + (process.pid % 100);
// por qual caminho cada face assentou; o veredito sai no fim da leva, com
// `julgarProntidao` — uma face por `quadros` no dev server é sinal quebrado
const vias = [];
for (const f of (soMedir ? [] : FACES)) {
  const png = resolve(OUT, `face_${f.nome}.png`);
  if (existsSync(png)) rmSync(png);
  const cap = await capturarCDP({
    largura: 1440, altura: 1440, porta: porta++,
    // noclarao=1 (era nohero=1 até o M2): o clarão de asas é camada de
    // ÓPTICA — o gate mede o CAMPO fotométrico contra a recriação Gaia,
    // que não desenha lente; com a camada, Sirius/αCen/Capella viram
    // picos espúrios no perfil da faixa.
    // kneeamt=1&knee=0.02&exp=4.4: REVELAÇÃO fotométrica do gate (não é o
    // look do app!) — o panorama ESO é astrofoto com stretch asinh a ~3% do
    // pico; medir sem o stretch equivalente compara curva de tom, não céu
    // (provado 2026-08-03: bulgeAnti 19,1→5,52 com alvo 5,57; zero clipping)
    // q=cinema: declara em que qualidade a régua foi medida — `nebulaSteps`
    // 56→30 muda o raymarch local, que é 46% do excesso do termo
    // `espessura`. Era defesa contra o auto-quality rebaixando o tier no
    // meio da captura; desde a letra D dos Ajustes nada troca sozinho.
    // Ver o bloco do PIN em ab-identidade.
    // noplan=1 (Onda 4, D8): precedente EXATO do noclarao=1 acima. A câmera do
    // protocolo fica na ORIGEM, ou seja DENTRO do domínio profundo, e a
    // camada de planetas acenderia aqui — no céu de verdade eles estariam
    // lá. Só que o oráculo é a recriação Gaia do panorama ESO, que não tem
    // planeta nenhum: medir com eles compararia o nosso céu com um céu que
    // a referência não sabe desenhar. Entra no MESMO commit que vira a
    // chave, para o gate do céu nunca ver a camada ligada.
    url: `${APP}/?pos=0,0,0&look=${f.dir.map((v) => v.toFixed(9)).join(',')}` +
      `&fov=90&q=cinema&nosun=1&noclarao=1&noplan=1&kneeamt=1&knee=0.02&exp=4.4&shot=2${extra}`,
  });
  writeFileSync(png, cap.png);
  vias.push(cap.via);
  process.stdout.write(`face_${f.nome}.png ok (via=${cap.via})\n`);
}

// O JUÍZO é calculado aqui, com a leva ainda fresca, e COBRADO no fim do
// arquivo: o produto desta invocação é a linha do `skyError`, e um erro que
// abortasse antes dela esconderia a régua de quem precisa dela para consertar.
// O bloco (e a saída ≠ 0) fica sendo a última palavra na tela.
const prontidao = julgarProntidao({
  vias, appUrl: process.env.APP_URL, fallbackOk: process.env.FALLBACK_OK === '1',
});

if (soMedir) {
  const faltando = FACES.filter((f) => !existsSync(resolve(OUT, `face_${f.nome}.png`)));
  if (faltando.length) throw new Error(`--so-medir sem captura em ${OUT}: falta ${faltando.map((f) => f.nome).join(', ')}`);
  process.stdout.write(`(--so-medir) as 6 faces de ${OUT}\n`);
}

const dom = resolve(OUT, 'dom.html');
if (existsSync(dom)) rmSync(dom);
// A medição roda com `--dump-dom`, e AQUI o tempo virtual serve: a página é
// estática (lê 6 PNGs e conta), sem laço de rAF para segurar o relógio. O que
// ela não faz é SAIR — o Chrome fica vivo depois de despejar o DOM, e esperar
// o processo custava os 600 s do teto inteiro por execução. O produto é o
// arquivo, então o critério de pronto é o arquivo: assim que o bloco <pre>
// aparece, o resto do processo não interessa e morre.
const { processo: medidor, encerrar: encerrarMedidor } = lancarChrome({
  perfil: `${PERFIS}/pm`,
  args: [
    ...GPU_FLAGS,
    '--allow-file-access-from-files', '--no-first-run',
    '--window-size=900,900', '--virtual-time-budget=25000', '--dump-dom',
    `file:///${MEASURE.replace(/\\/g, '/')}?dir=${OUT.replace(/\\/g, '/')}` +
      `&ref=${REF.replace(/\\/g, '/')}`,
  ],
  stdio: ['ignore', openSync(dom, 'w'), 'ignore'],
});
const prazo = Date.now() + TIMEOUT;
for (;;) {
  await new Promise((r) => setTimeout(r, 1000));
  const pronto = existsSync(dom) && /<pre[^>]*>[\s\S]*?<\/pre>/i.test(readFileSync(dom, 'utf8'));
  if (pronto || Date.now() > prazo || medidor.exitCode !== null) break;
}
await encerrarMedidor();

const bloco = readFileSync(dom, 'utf8').match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
if (!bloco) throw new Error('a métrica não devolveu resultado — confira o dev server e a referência');
const j = JSON.parse(bloco[1].replace(/&quot;/g, '"'));
const O = j.ours;
const R = j.ref;
const curva = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
const media = (a) => a.reduce((s, v) => s + v, 0) / a.length;
// os mesmos seis termos que somam o skyError em sky-measure.html
const termos = {
  espessura: curva(O.thick, R.thick) / media(R.thick),
  perfil: curva(O.nprof, R.nprof),
  cor: Math.abs(O.colour - R.colour),
  purpura: Math.abs(O.purp - R.purp),
  // a fenda é comparada bin a bin desde a rodada 37: o escalar
  // (média das profundidades) era cego ao LUGAR do vale e cancelava
  // uma anticorrelação quase perfeita — ver o cabeçalho do sky-measure
  fenda: curva(O.riftProf, R.riftProf),
  // bojoAnti NÃO entra: é função exata do `perfil` (auditoria 2026-08-06).
  // Segue impresso na linha de diagnóstico abaixo — ele afere a RÉGUA.
};
const total = Object.values(termos).reduce((a, b) => a + b, 0);
console.log(`\nskyError ${j.skyError}  (${tag}${extra ? ' ' + extra : ''})`);
for (const [k, v] of Object.entries(termos).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(10)} ${v.toFixed(4)}  ${((100 * v) / total).toFixed(0)}%`);
}
console.log(
  `  bulgeAnti ${O.bulgeAnti} (alvo ${R.bulgeAnti}) · rift ${O.rift} (${R.rift}) · ` +
    `colour ${O.colour} (${R.colour}) · purp ${O.purp} (${R.purp})`
);

if (comPerfil) {
  // A ESPESSURA bin a bin. Ela é o maior termo do gate desde que o gate
  // existe e era a única curva da soma que ninguém imprimia — a tabela do
  // diagnóstico de 2026-08-06 foi montada à mão no scratchpad e por isso
  // envelheceu sem ninguém notar (ela dizia "anticentro pouco luminoso"
  // quando hoje o anticentro está 1,18× BRILHANTE demais). Aqui ela sai
  // junto com o resto, e o sinal de cada bin sai com ela: a soma dos
  // desvios positivos contra a dos negativos é o teste de cancelamento
  // que a auditoria de 2026-08-06 tornou obrigatório para todo termo de
  // família (média|Δ| / |médiaΔ| = 1 quer dizer erro de um sinal só).
  const nt = O.thick.length;
  const lont = (i) => Math.round(-180 + (360 * (i + 0.5)) / nt);
  console.log('\n  l    espess    ref     dif');
  let somaPos = 0;
  let somaNeg = 0;
  for (let i = 0; i < nt; i++) {
    const d = O.thick[i] - R.thick[i];
    if (d > 0) somaPos += d;
    else somaNeg += d;
    console.log(
      `  ${String(lont(i)).padStart(5)} ${O.thick[i].toFixed(2).padStart(7)}` +
        ` ${R.thick[i].toFixed(2).padStart(7)} ${(d > 0 ? '+' : '') + d.toFixed(2)}` +
        `  ${(d > 0 ? '+' : '-').repeat(Math.min(24, Math.round(Math.abs(d) * 4)))}`
    );
  }
  const mediaAbs = (somaPos - somaNeg) / nt;
  console.log(
    `  soma dif>0 ${somaPos.toFixed(2)} · dif<0 ${somaNeg.toFixed(2)} · ` +
      `media|d| ${mediaAbs.toFixed(3)} · ` +
      `media|d|/|media d| ${(mediaAbs / Math.abs((somaPos + somaNeg) / nt)).toFixed(2)}`
  );

  // o perfil é NORMALIZADO pela própria média: comparação de FORMA.
  // Ablação redistribui — ler bin a bin, nunca só o agregado.
  const n = O.nprof.length;
  const lon = (i) => Math.round(-180 + (360 * (i + 0.5)) / n);
  console.log('\n  l      nosso    ref     dif');
  for (let i = 0; i < n; i++) {
    const d = O.nprof[i] - R.nprof[i];
    const barra = (d > 0 ? '+' : '-').repeat(Math.min(20, Math.round(Math.abs(d) * 10)));
    console.log(
      `  ${String(lon(i)).padStart(5)} ${O.nprof[i].toFixed(2).padStart(7)}` +
        ` ${R.nprof[i].toFixed(2).padStart(7)} ${(d > 0 ? '+' : '') + d.toFixed(2)}  ${barra}`
    );
  }
  // a fenda por longitude, com a latitude do vale ao lado. b = ±10,1°
  // significa que o mínimo caiu na BORDA da busca — ou seja, vale nenhum.
  const lr = [];
  for (let i = 0; i < n; i++) {
    const l = ((i + 0.5) / n) * 360 - 180;
    if (l >= -35 && l <= 45) lr.push(Math.round(l));
  }
  console.log('\n  l    fenda   ref     dif   |   b do vale (nosso/ref)');
  for (let k = 0; k < lr.length; k++) {
    const d = O.riftProf[k] - R.riftProf[k];
    console.log(
      `  ${String(lr[k]).padStart(5)} ${O.riftProf[k].toFixed(3).padStart(7)}` +
        ` ${R.riftProf[k].toFixed(3).padStart(7)} ${(d > 0 ? '+' : '') + d.toFixed(3)}` +
        `   |  ${O.riftB[k].toFixed(1).padStart(6)} ${R.riftB[k].toFixed(1).padStart(6)}`
    );
  }
}

// os spawnSync retornam quando o browser sai, mas os helpers de GPU podem
// sobreviver a ele e disputar a GPU da próxima medição — ver chrome.mjs
matarPerfil(PERFIS);
// e MATAR não é APAGAR: cada perfil do medidor deixa 8,4 MB para trás, e a
// pasta é nomeada pelo PID, então nunca é reusada. Uma sessão de sweeps
// tinha 472 MB parados no TEMP quando isto foi notado. O `capturarCDP` já
// apaga o dele (chrome.mjs); este era o único que só matava.
try {
  rmSync(PERFIS, { recursive: true, force: true });
} catch {
  /* perfil preso por helper que ainda não morreu — o TEMP do SO recolhe */
}

// DEPOIS da limpeza, e por último: o gate GRITA e SAI ≠ 0. Os PNGs e a régua
// já estão em disco e na tela — o que a saída ≠ 0 diz é "não valide nada com
// isto", no mesmo protocolo do apaga-antes/exige-status-0-depois.
if (prontidao.mensagem) process.stderr.write(prontidao.mensagem);
if (prontidao.erro) process.exit(1);
