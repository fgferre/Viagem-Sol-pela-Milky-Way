// Onde está o Chrome e com que backend ele desenha — um lugar só.
//
// Os quatro harnesses (rodada, ab-identidade, sky-capture, gpu-profile) subiam
// Chrome cada um com a sua cópia da lista de caminhos e do `--use-angle`. Eram
// quatro cópias do MESMO contrato de lançamento, e num clone macOS as quatro
// falhavam junto: nenhum gate do projeto rodava nesta máquina.
//
// O backend NÃO é detalhe de conveniência: `d3d11` só existe no Windows e
// `metal` só no macOS. Passar o backend errado faz o Chrome cair para
// SwiftShader (CPU) SEM ERRO — o headless sobe, a captura sai, e o md5 é de
// uma imagem que nenhuma GPU desenhou. Por isso a escolha é por plataforma e
// não uma constante: gate que degrada em silêncio é pior que gate que quebra.
//
// E `matarPerfil`, porque `chrome.kill()` NÃO basta: o processo que o Node
// gera é só o browser: os helpers de GPU e renderer são filhos que sobrevivem
// ao pai. Medido nesta máquina — depois de quatro invocações do gpu-profile
// havia 14 Chrome órfãos vivos, e eles não são inertes: disputam a MESMA GPU
// que o harness está medindo. A baseline caiu de 20,0 para 8,0 fps entre a
// primeira e a quarta execução, e a mesma vista devolveu 196 e 588 ms de
// total. `rodada.mjs` já tinha a limpeza — só que só no ramo `win32`, e a
// morte silenciosa dos outros três harnesses estava embutida no valor que
// eles imprimiam. Regra: quem sobe Chrome mata pelo `user-data-dir`, sempre.
//
// E `lancarChrome`, porque `finally` NÃO basta: o `finally` é o caminho FELIZ.
// Quando o Node morre no MEIO — Ctrl+C, `kill` de agente, `process.exit`
// dentro de um `try` (o `--cru` do gpu-profile fazia exatamente isso) — o
// `finally` não roda, o Chrome reparenta para o launchd e fica desenhando o
// app com contexto Metal para SEMPRE. Medido na casa em 23/08: dois headless
// de 1,5 dia com `PPID=1`, somando ~45 % de CPU, ~1,2 GB e dois contextos de
// GPU no mesmo M1 que o dono usa. Era a causa dos itens 64 e 78. A resposta é
// o REGISTRO abaixo: toda sessão viva num Set, um vigia só (`exit` + `SIGINT`
// + `SIGTERM`), e o lançamento por uma porta única — nenhum `spawn(CHROME)`
// solto no projeto.
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const CAMINHOS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser'],
};

const ANGLE = { darwin: 'metal', win32: 'd3d11', linux: 'gl' };

export const CHROME = (CAMINHOS[process.platform] ?? []).find((p) => existsSync(p));
if (!CHROME) throw new Error(`Chrome não encontrado (${process.platform})`);

/** Flags de GPU comuns a todos os harnesses, com o backend da plataforma. */
export const GPU_FLAGS = [
  '--headless=new',
  '--enable-gpu',
  '--use-gl=angle',
  `--use-angle=${ANGLE[process.platform] ?? 'default'}`,
];

/**
 * A espera de todo harness. Eram DOZE cópias desta linha em
 * `scripts/visual/` — sete chamadas `sleep` e cinco `dorme`, idênticas —
 * e os doze arquivos já importam este módulo. Uma linha só, aqui.
 */
export const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * AS SESSÕES VIVAS deste processo — `{ processo, perfil }` de cada Chrome que
 * subiu e ainda não foi encerrado. É a lista que o vigia percorre quando o
 * Node morre no meio.
 *
 * A sessão SÓ sai daqui em `encerrar`, nunca no `exit` do filho: o browser
 * principal morrer sem os helpers é exatamente o caso órfão, e é pelo PERFIL
 * (não pelo pid do pai) que se alcança um helper de GPU já reparentado.
 */
const sessoesVivas = new Set();
let vigiaArmado = false;

/** Mata o browser e os helpers do perfil. Idempotente: chamar duas vezes é nada. */
function matarSessao(sessao) {
  if (!sessoesVivas.delete(sessao)) return;
  try { sessao.processo.kill(); } catch { /* já saiu sozinho */ }
  matarPerfil(sessao.perfil);
}

const apagarPerfil = (perfil) => {
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* preso por helper */ }
};

/**
 * O VIGIA — UM ÚNICO conjunto de tratadores para o processo inteiro, armado na
 * primeira sessão e nunca mais.
 *
 * POR QUE UMA VEZ SÓ, e não um `process.on` por sessão: `capturarCDP` roda em
 * laço (52 vistas na leva do `ab-identidade`), e um tratador por chamada
 * empilharia 52 ouvintes no mesmo sinal — `MaxListenersExceededWarning` e
 * vazamento, trocando um defeito por outro.
 *
 * POR QUE `process.exit` NO FIM DO SINAL: registrar `SIGINT` DESLIGA a saída
 * automática do Node. Sem a saída explícita o juiz ficaria pendurado depois do
 * Ctrl+C — vivo, mudo e sem Chrome. 130 e 143 são os códigos convencionais
 * (128 + o número do sinal).
 *
 * O QUE O VIGIA NÃO ALCANÇA: `SIGKILL`. Não há tratador para ele em processo
 * nenhum; a rede que sobra ali é o `matarPerfil` da próxima leva.
 */
function armarVigia() {
  if (vigiaArmado) return;
  vigiaArmado = true;
  const limpar = () => {
    // tudo aqui é SÍNCRONO de propósito: no `exit` o Node não roda mais
    // nenhuma volta do laço de eventos, então promessa aqui não existe
    for (const sessao of [...sessoesVivas]) {
      const { perfil } = sessao;
      matarSessao(sessao);
      apagarPerfil(perfil);
    }
  };
  process.on('exit', limpar);
  for (const [sinal, codigo] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    process.on(sinal, () => { limpar(); process.exit(codigo); });
  }
}

/**
 * A ÚNICA PORTA por onde Chrome sobe neste projeto — ver o cabeçalho.
 *
 * Eram OITO `spawn(CHROME, …)` soltos (os dois daqui e mais seis nos
 * harnesses), e cada um deles era uma fábrica de órfãos independente. Aqui o
 * `spawn` acontece uma vez, a sessão entra no registro no mesmo instante em
 * que nasce, e o vigia passa a cobri-la — inclusive nos harnesses que só
 * emprestam o Chrome para um `--dump-dom` e nem falam CDP.
 *
 * O PERFIL É DA PEÇA, não do chamador: é ele o cabo pelo qual a sessão é
 * puxada para a morte (`matarPerfil` casa pela linha de comando), então quem
 * lança é quem põe a flag. Passar `--user-data-dir` em `args` é erro e grita.
 *
 * `detached` FICA FALSO, e é escolha declarada. Com `detached: true` viria a
 * morte por grupo (`process.kill(-pid)`), que alcança helper reparentado — mas
 * tirar o Chrome do grupo do terminal significa que o Ctrl+C deixa de chegar
 * NELE, e o vigia daqui viraria a ÚNICA linha de defesa. `matarPerfil` já
 * alcança os mesmos helpers (casa pelo `--user-data-dir`, que eles carregam na
 * própria linha de comando), então o grupo compraria uma segunda faca ao preço
 * de perder o cinto que já existe de graça. Falso é o desenho com DUAS redes.
 */
export function lancarChrome({ perfil, args, stdio = 'ignore' }) {
  if (args.some((a) => String(a).startsWith('--user-data-dir'))) {
    throw new Error('lancarChrome é quem põe o --user-data-dir: passe `perfil`, não a flag');
  }
  armarVigia();
  const processo = spawn(CHROME, [`--user-data-dir=${perfil}`, ...args], { stdio });
  const sessao = { processo, perfil };
  sessoesVivas.add(sessao);
  return {
    processo,
    /**
     * O caminho feliz: mata, espera a `carencia` e APAGA o perfil (matar não é
     * apagar — cada perfil deixa ~8 MB no TEMP e a pasta nunca é reusada).
     * Com `carencia: 0` é síncrono na prática, e devolve promessa resolvida
     * para quem prefere sempre `await`.
     */
    encerrar: ({ carencia = 0 } = {}) => {
      matarSessao(sessao);
      if (!carencia) { apagarPerfil(perfil); return Promise.resolve(); }
      return dorme(carencia).then(() => apagarPerfil(perfil));
    },
  };
}

/**
 * ESPERAR O ESTADO, NUNCA O RELÓGIO DE PAREDE — a régua de todo juiz
 * que interage com o app, e a única casa desta doutrina no projeto.
 *
 * Pergunta-se "ACONTECEU?", jamais "passaram N ms?": quem dorme mede a
 * carga da máquina e chama isso de defeito do app, e um juiz que acusa
 * inocente é pior que nenhum — ele treina quem o roda a ignorá-lo. O
 * caso medido que fundou a regra mora no commit `72c76b9`.
 *
 * Espera uma condição VALER no navegador e devolve em quantos ms ela
 * valeu (`null` no estouro). O número entra no veredito de propósito:
 * juiz que espera sem dizer quanto esperou esconde a piora do dia em que
 * ela começar. E o `null` REPROVA em quem chama — estouro é veredito,
 * não rodapé.
 *
 * QUANDO `dorme` AINDA É O CERTO: quando o veredito é "NADA acontece" —
 * ali esperar mais só fortalece a prova (o `ESPERA_DO_MANUAL_MS` do
 * `atlas-smoke` é o caso). Para "ACONTECEU?", é esta peça.
 */
export async function esperarPor(s, expressao, teto = 3000) {
  const t0 = Date.now();
  for (;;) {
    if (await s.js(expressao)) return Date.now() - t0;
    if (Date.now() - t0 > teto) return null;
    await dorme(50);
  }
}

/**
 * O ALVO PADRÃO dos harnesses: o dev server do vite. Todo script de
 * `scripts/visual/` resolve o app do mesmo jeito (`APP_URL || APP_PADRAO`), e
 * a regra do fallback (`julgarProntidao`) precisa da constante para saber se
 * está mirando ESTE alvo — onde `window.__director` é publicado e o sinal de
 * prontidão é OBRIGATÓRIO — ou um alvo que o operador apontou de propósito.
 */
export const APP_PADRAO = 'http://127.0.0.1:5173';

// `localhost` e `127.0.0.1` na mesma porta são o MESMO dev server; quem
// exporta `APP_URL=http://localhost:5173` não está apontando para outro lugar
// e não pode ganhar o perdão que existe só para alvo de produção.
const canonico = (u) => String(u).trim().replace(/\/+$/, '').replace('://localhost:', '://127.0.0.1:');

/**
 * O CONTADOR E O JUÍZO do fallback, puro para poder ser testado sem GPU
 * (`chrome.test.mjs`).
 *
 * A brecha que ele fecha: `esperarAssentar` cai no teto de segurança
 * (`via=quadros`) sem reclamar quando o sinal do app some. Como o fallback
 * devolve a MESMA imagem, uma quebra futura de `window.__director.captura`
 * não apareceria como erro — apareceria como os ~70 s por captura de antes da
 * reforma, com o gate passando "funcionando". É o modo caro de falhar que a
 * casa já pagou duas vezes (helpers de GPU órfãos, `--use-angle` errado): o
 * instrumento degrada em silêncio e contamina a medida em vez de quebrar.
 *
 * A regra:
 * - Alvo PADRÃO (`APP_URL` ausente, ou apontando para o próprio dev server) e
 *   QUALQUER captura por `quadros` → ERRO, saída ≠ 0. Inclusive parcial: sinal
 *   intermitente é pior que sinal morto, porque metade da leva mediu por um
 *   critério e metade por outro.
 * - Alvo EXPLÍCITO e diferente (o `vite preview` do `dist`, por exemplo) →
 *   só aviso: ali `window.__director` legitimamente não existe (é publicado
 *   sob `import.meta.env.DEV`), e cair no teto é o comportamento correto.
 * - `FALLBACK_OK=1` aceita conscientemente: imprime o mesmo bloco e não falha.
 * - Nenhuma captura nesta invocação (tudo veio de disco, ou `--so-medir`) →
 *   nada a julgar.
 */
export function julgarProntidao({ vias = [], appUrl = '', fallbackOk = false }) {
  const total = vias.length;
  const quadros = vias.filter((v) => v === 'quadros').length;
  const alvoPadrao = !appUrl || canonico(appUrl) === canonico(APP_PADRAO);
  if (!total || !quadros) return { total, quadros, alvoPadrao, erro: false, mensagem: null };
  const cerca = '!'.repeat(74);
  if (!alvoPadrao) {
    return {
      total, quadros, alvoPadrao, erro: false,
      mensagem:
        `\naviso: ${quadros} de ${total} capturas assentaram por via=quadros `
        + '(o teto de segurança, ~70 s cada).\n'
        + `  É o esperado em APP_URL=${appUrl}, que não é o dev server padrão —\n`
        + '  window.__director só existe no bundle de DEV. No alvo padrão isto seria ERRO.\n',
    };
  }
  const bloco =
    `\n${cerca}\n`
    + '!! SINAL DE PRONTIDÃO QUEBRADO — o harness caiu no modo lento em\n'
    + `!! ${quadros} de ${total} capturas (via=quadros, o teto de segurança dos 700 quadros).\n`
    + '!! O fallback devolve a MESMA imagem: o sintoma é só a lentidão de antes da\n'
    + '!! reforma (~70 s por captura), e o gate passaria "funcionando".\n'
    + '!! Conserte window.__director.captura (o getter `captura` em\n'
    + '!! src/three/director.ts) antes de validar qualquer coisa.\n'
    + '!! Para aceitar conscientemente, rode com FALLBACK_OK=1.\n'
    + `${cerca}\n`;
  if (fallbackOk) {
    return {
      total, quadros, alvoPadrao, erro: false,
      mensagem: `${bloco}!! ACEITO por FALLBACK_OK=1 — o gate não falha, o modo lento segue ligado.\n`,
    };
  }
  return { total, quadros, alvoPadrao, erro: true, mensagem: bloco };
}

/**
 * A PORTA que o Chrome escolheu, lida do `DevToolsActivePort` que ele grava
 * no próprio perfil. Existe para o harness poder subir N browsers em
 * paralelo sem aritmética de porta: com `--remote-debugging-port=0` quem
 * escolhe é o SO, e duas levas simultâneas (ou dois filhos do mesmo pai)
 * não têm como colidir. É o mesmo caminho que o puppeteer usa.
 */
export async function portaDoPerfil(perfil, teto = 30000) {
  const arquivo = resolve(perfil, 'DevToolsActivePort');
  const prazo = Date.now() + teto;
  for (;;) {
    try {
      const porta = Number(readFileSync(arquivo, 'utf8').split('\n')[0]);
      if (porta > 0) return porta;
    } catch { /* o Chrome ainda não gravou */ }
    if (Date.now() > prazo) throw new Error('Chrome não publicou DevToolsActivePort');
    await dorme(100);
  }
}

/**
 * ESPERA A CENA ASSENTAR, com o SINAL do app na frente e o método antigo
 * como teto de segurança.
 *
 * O caminho rápido é `window.__director.captura.pronto` (ver o getter
 * `captura` em `src/three/director.ts`): o app declara ele mesmo que o
 * `init` terminou, que nada está andando, que o Sol tem retrato completo
 * publicado e que já desenhou N quadros sem perturbação. Numa vista de
 * 1800×1800 isso acontece ~6 s depois do `navigate`.
 *
 * O caminho lento é o CRITÉRIO ANTIGO, palavra por palavra: o log da
 * cartografia e mais `quadros` quadros desenhados depois dele (~70 s nesta
 * máquina, porque a leva roda a ~10 fps). Ele continua aqui porque o sinal
 * só existe no bundle de DEV (`window.__director` é publicado sob
 * `import.meta.env.DEV`) — apontar `APP_URL` para um build de produção, ou
 * para uma versão do app anterior a esta reforma, cai neste ramo em vez de
 * travar. Quem chama recebe o `via` e DEVE imprimi-lo: uma leva inteira
 * caindo no teto de segurança é sinal quebrado, e o sintoma seria só a
 * lentidão de antes — o modo caro de falhar.
 */
export async function esperarAssentar({ send, cartografia, quadros = 700, teto = 180000 }) {
  const t0 = Date.now();
  let base = null;
  for (;;) {
    const r = await send('Runtime.evaluate', {
      expression:
        'JSON.stringify({f:window.__f|0,'
        + 'c:(window.__director&&window.__director.captura)||null})',
      returnByValue: true,
    });
    const { f, c } = JSON.parse(r.result.value);
    if (cartografia() && base === null) base = f;
    if (c && c.pronto) {
      return { via: 'sinal', ms: Date.now() - t0, quadros: c.quadros, fase: c.fase };
    }
    // o teto de segurança é o método antigo INTEIRO, não uma aproximação
    if (base !== null && f - base > quadros) {
      return { via: 'quadros', ms: Date.now() - t0, quadros: f - base, fase: c?.fase ?? null };
    }
    if (Date.now() - t0 > teto) {
      throw new Error(
        `não assentou (cart=${cartografia()}, f=${f}, sinal=${c ? JSON.stringify(c) : 'ausente'})`
      );
    }
    await dorme(100);
  }
}

/**
 * ESPERA A CAPA DO CARREGAMENTO SAIR DA FRENTE — o segundo termo do
 * obturador, e a resposta a "a foto mostra o app ou mostra a tela de
 * carga?".
 *
 * O QUE ACONTECIA, medido em 2026-08-23 com `?atlas=1` a 1200×900: o
 * sinal de prontidão acende aos 5,2 s e está CERTO — a fase já é
 * `atlas`, a cena já assentou. Mas a `LoadingVeil` (`.cv-veil`,
 * `z-index: 52`, ver `hud/05-loading.css`) é camada PERSISTENTE: o App
 * só a desmonta `MERGE_MS` depois do `done`, para o crossfade do núcleo
 * sobre o Sol não piscar. Medido: ela sai **2,13 s DEPOIS** do sinal. O
 * obturador disparava no meio disso e a foto saía com a cartografia da
 * carga — outra Via Láctea, de dois braços (item 34) — no lugar do app.
 *
 * POR QUE NENHUM JUIZ ADOECEU COM ISSO, e é o que explica os meses de
 * silêncio: todo consumidor de `capturarCDP` pina `?shot=2`
 * (`ab-identidade`, `luz-do-quadro`, `rodada`, `sky-capture`,
 * `planeta-pixel`), e sob `?shot=2` (`bareMode`) a capa NEM MONTA. Quem
 * sofria era a foto COM HUD — exatamente a que se tira para o dono ver.
 *
 * POR QUE AQUI E NÃO EM `esperarAssentar`: aquela responde "a cena
 * assentou?" e a resposta dela não mudou — quem a chama sem tirar foto
 * (`a11y`, `busca-smoke`, os passos de DOM do `atlas-smoke`: 91
 * navegações na casa) pagaria ~2 s cada por uma espera que não mede
 * nada do que aquele juiz julga. Isto é do OBTURADOR, e só ele o paga.
 *
 * E NÃO SE MEDE POR "dois md5 iguais seguidos", que foi a primeira
 * hipótese: com o HUD na tela o md5 NUNCA estabiliza (medido: 0c78…,
 * 9386…, 3b82… em quadros consecutivos, já sem a capa — o HUD vive).
 * Esse critério travaria justamente as fotos que este conserto existe
 * para salvar.
 *
 * Devolve o `estado`, e quem chama o IMPRIME: `ausente` (a capa nem
 * montou — o caso do `?shot=2`), `saiu` (esperou e ela saiu), `erro` (a
 * capa é a tela de falha, e aí ELA é a verdade do quadro: fotografa-se),
 * `ficou` (o teto estourou — a foto sai suspeita e diz que é).
 */
export async function esperarCapaSair(send, teto = 8000) {
  const t0 = Date.now();
  let estava = false;
  for (;;) {
    const r = await send('Runtime.evaluate', {
      expression: "((document.querySelector('.cv-veil')||{}).className)||''",
      returnByValue: true,
    });
    const capa = String(r.result.value || '');
    const ms = Date.now() - t0;
    if (!capa) return { estado: estava ? 'saiu' : 'ausente', ms };
    estava = true;
    if (capa.includes('cv-error')) return { estado: 'erro', ms };
    if (ms > teto) return { estado: 'ficou', ms };
    await dorme(100);
  }
}

/**
 * O SOCKET DO CDP, ligado e pronto a falar — a plataforma dos dois
 * harnesses (`abrirSessao` e `capturarCDP`).
 *
 * Eram DUAS cópias das mesmas quatro peças (`seq`, `esperando`, `send` e
 * `derrubarPendentes`), que é o defeito que o cabeçalho deste arquivo
 * existe para não repetir: a segunda cópia nasceu já sem a rede de
 * segurança e só a ganhou meses depois, num conserto que precisou ser
 * feito duas vezes.
 *
 * `aoEvento` recebe o que NÃO é resposta a um `send` (console, exceção):
 * é a única parte que difere entre os dois, e por isso é o parâmetro.
 *
 * O SOCKET QUE MORRE NÃO PODE DEIXAR UMA PROMESSA VIVA PARA SEMPRE.
 * Cada `send` fica pendurado num `id` que só o Chrome responde: se o
 * Chrome cai (ou é morto por fora) sem responder, o `await` nunca
 * resolve, o processo não termina e quem o espera fica parado — é o
 * desenho dos itens 64 e 78 (`ab-identidade` vivo 12 e 25 minutos
 * depois de ter terminado o trabalho). Fechar o socket REPROVA os
 * pendentes, que vira erro legível em vez de sono eterno; e é por isso
 * que `fechar` existe: quem mata o Chrome fecha o socket ANTES.
 */
export async function ligarSocketCDP(alvo, aoEvento = () => {}) {
  const ws = new WebSocket(alvo);
  await new Promise((r, j) => {
    const relogio = setTimeout(() => j(new Error('WebSocket do CDP não abriu em 30 s')), 30000);
    ws.addEventListener('open', () => { clearTimeout(relogio); r(); });
    ws.addEventListener('error', () => { clearTimeout(relogio); j(new Error('WebSocket falhou')); });
  });
  let seq = 0;
  const esperando = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id); }
    else aoEvento(m);
  });
  const derrubarPendentes = (porque) => {
    for (const responder of esperando.values()) responder({ error: { message: porque } });
    esperando.clear();
  };
  ws.addEventListener('close', () => derrubarPendentes('o WebSocket do CDP fechou'));
  ws.addEventListener('error', () => derrubarPendentes('o WebSocket do CDP falhou'));
  return {
    send: (method, params = {}) => new Promise((res, rej) => {
      const n = ++seq;
      esperando.set(n, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    }),
    fechar: () => ws.close(),
  };
}

/**
 * UMA SESSÃO DE CHROME VIVA, dirigida por CDP — a base dos harnesses que
 * INTERAGEM com o app (o smoke do portal, o juiz de a11y), em oposição a
 * `capturarCDP`, que sobe um Chrome por vista e o mata em seguida.
 *
 * Por que uma sessão só: comparar md5 entre processos diferentes não prova
 * portal nenhum (GPU e contexto mudam), e um juiz de foco precisa da MESMA
 * página entre um Tab e o seguinte. Nasceu dentro do `atlas-smoke.mjs` na
 * F1 da Onda 5 e subiu para cá na F2, quando o segundo consumidor apareceu:
 * duas cópias do contrato de lançamento é exatamente o defeito que o
 * cabeçalho deste arquivo existe para não repetir.
 */
export async function abrirSessao({ janela = '1200x900', app = APP_PADRAO, prefixo = 'sessao' } = {}) {
  const [w, h] = String(janela).split('x');
  const perfil = resolve(tmpdir(), `${prefixo}-${process.pid}`);
  const { encerrar } = lancarChrome({
    perfil,
    args: [
      ...GPU_FLAGS,
      '--hide-scrollbars', '--no-first-run', '--mute-audio',
      '--force-device-scale-factor=1', `--window-size=${w},${h}`,
      '--remote-debugging-port=0', 'about:blank',
    ],
  });
  const porta = await portaDoPerfil(perfil);
  let alvo = null;
  for (let i = 0; i < 100 && !alvo; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
      alvo = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* Chrome ainda subindo */ }
    if (!alvo) await dorme(200);
  }
  if (!alvo) throw new Error('CDP não respondeu');
  let cartografia = false;
  /**
   * O DOCUMENTO NOVO JÁ EXISTE? A terceira armadilha do harness, medida
   * em 23/08 (as duas primeiras estão em `esperarCapaSair` e no
   * `NORTE.md`). `Page.navigate` volta assim que o pedido é ACEITO, e por
   * alguns milissegundos o documento VELHO continua vivo — com o
   * `window.__director` dele já assentado. `esperarAssentar` perguntava
   * "está pronto?", a página velha respondia "estou", e o md5 saía da
   * vista ANTERIOR. Um `atlas-smoke` inteiro passou verde ao lado disso e
   * o veredito só quebrou quando duas vistas vizinhas ficaram
   * parecidas o bastante para alguém olhar: `?ver=corpo` legado devolveu
   * o md5 do link de Saturno do passo de cima.
   *
   * O marcador é o `Page.loadEventFired` do DOCUMENTO NOVO — evento do
   * navegador, não heurística de conteúdo.
   */
  let carregou = false;
  // O QUE O APP GRITA. Só o que o app diz por conta própria
  // (`console.error`/`console.warn` e exceção não capturada) — falha de
  // rede o navegador registra por conta dele, e cobrar isso do app seria
  // cobrar o contrário do que a degradação honesta faz. É esta lista que
  // o gate "sem rede, zero erro de console" da F4 lê.
  const gritos = [];
  const { send, fechar: fecharSocket } = await ligarSocketCDP(alvo, (m) => {
    if (m.method === 'Page.loadEventFired') carregou = true;
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
      if (txt.includes('[cartografia]')) cartografia = true;
      if (m.params.type === 'error' || m.params.type === 'warning') {
        gritos.push(`console.${m.params.type}: ${txt}`);
      }
    } else if (m.method === 'Runtime.exceptionThrown') {
      gritos.push(`exceção: ${m.params.exceptionDetails?.text ?? '?'}`);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__f=0;const o=window.requestAnimationFrame.bind(window);'
      + 'window.requestAnimationFrame=(c)=>o((t)=>{window.__f++;return c(t)});',
  });
  return {
    send,
    fechar: () => {
      fecharSocket();
      return encerrar();
    },
    /** o que o app gritou desde a última limpeza (ver `gritos`) */
    gritos: () => [...gritos],
    limparGritos: () => {
      gritos.length = 0;
    },
    /**
     * CORTA A REDE para os padrões dados — é assim que se prova o
     * caminho "sem efeméride" com o mesmo binário, sem mexer no app nem
     * no servidor. Lista vazia religa tudo.
     */
    bloquear: async (padroes) => {
      await send('Network.enable');
      await send('Network.setBlockedURLs', { urls: padroes });
    },
    ir: async (query) => {
      cartografia = false;
      carregou = false;
      await send('Page.navigate', { url: `${app}/?${query}` });
      // O DOCUMENTO NOVO PRIMEIRO — ver `carregou`. Sem esta espera a
      // prontidão da página VELHA responde pela nova e o md5 sai da
      // vista anterior.
      const t0 = Date.now();
      while (!carregou) {
        if (Date.now() - t0 > 30000) throw new Error(`?${query}: o documento novo não carregou`);
        await dorme(20);
      }
      // o rAF contador morre com o documento; a navegação recria tudo
      return esperarAssentar({ send, cartografia: () => cartografia, quadros: 700, teto: 180000 });
    },
    assentar: () =>
      esperarAssentar({ send, cartografia: () => true, quadros: 700, teto: 180000 }),
    /** clique curto de verdade — o gesto que o Director escuta */
    clicar: async (x, y) => {
      const base = { x, y, button: 'left', clickCount: 1, buttons: 1, pointerType: 'mouse' };
      await send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed' });
      await send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', buttons: 0 });
    },
    /**
     * DUPLO CLIQUE de verdade — dois pares press/release com
     * `clickCount` 1 e 2, que é o que faz o Chrome sintetizar o evento
     * `dblclick`. Sem o `clickCount: 2` no segundo par o navegador
     * entrega dois cliques soltos e o tratador do duplo nunca acorda:
     * era assim que o Atlas ficava sem dono para o gesto (item 73).
     */
    duploClicar: async (x, y) => {
      const base = { x, y, button: 'left', pointerType: 'mouse' };
      for (const clickCount of [1, 2]) {
        await send('Input.dispatchMouseEvent', {
          ...base, type: 'mousePressed', clickCount, buttons: 1,
        });
        await send('Input.dispatchMouseEvent', {
          ...base, type: 'mouseReleased', clickCount, buttons: 0,
        });
      }
    },
    /**
     * Tecla de verdade, com código nativo — `el.dispatchEvent(new
     * KeyboardEvent('keydown'))` não move o foco: só o evento REAL faz o
     * Chrome andar com o Tab, e é justamente o andar do foco que o juiz
     * de a11y mede.
     */
    teclar: async (nome, { shift = false } = {}) => {
      // as setas entraram na F3 (a listbox da paleta de busca escolhe
      // com elas); o resto é da F2
      const TECLAS = {
        Tab: 9, Escape: 27, Enter: 13,
        ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
      };
      const codigo = TECLAS[nome];
      if (!codigo) throw new Error(`tecla desconhecida: ${nome}`);
      const base = {
        key: nome,
        code: nome,
        windowsVirtualKeyCode: codigo,
        nativeVirtualKeyCode: codigo,
        modifiers: shift ? 8 : 0,
      };
      await send('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown' });
      await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
    },
    /**
     * DIGITA texto tecla a tecla, com `text` no evento — que é o que faz
     * o Chrome inserir o caractere e disparar o `input` que o React
     * escuta. Nasceu na F3 para a paleta de busca, e é tecla a tecla de
     * propósito: `Input.insertText` põe a palavra inteira de uma vez, e
     * é justamente a conta POR TECLA que o gate da busca mede.
     */
    digitar: async (texto) => {
      for (const ch of texto) {
        const vk = ch.toUpperCase().charCodeAt(0);
        const base = {
          key: ch,
          text: ch,
          unmodifiedText: ch,
          windowsVirtualKeyCode: vk,
          nativeVirtualKeyCode: vk,
        };
        await send('Input.dispatchKeyEvent', { ...base, type: 'keyDown' });
        await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
      }
    },
    // o Director lê `prefers-reduced-motion` UMA vez, no construtor —
    // então a emulação tem de estar de pé antes da navegação seguinte
    reduzirMovimento: () =>
      send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      }),
    js: async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`js: ${r.exceptionDetails.text}`);
      return r.result.value;
    },
    md5: async () => {
      // o segundo termo do obturador — ver `esperarCapaSair`. Sob
      // `?shot=2` (o pino de todo md5 desta casa) ela devolve `ausente`
      // sem esperar nada; num quadro COM HUD ela é o que impede a foto
      // de sair com a tela de carga por cima.
      await esperarCapaSair(send);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');
      if (buf.length < 20000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
      return createHash('md5').update(buf).digest('hex').slice(0, 12);
    },
  };
}

/**
 * Captura uma vista por CDP, esperando a cena ASSENTAR — a alternativa a
 * `--virtual-time-budget --screenshot`, que neste Chrome/macOS simplesmente
 * NÃO TERMINA: medido, uma janela de 400×400 com 8 s de orçamento ficou mais
 * de 6 min sem sair e sem gravar PNG. O laço de rAF do app nunca deixa o
 * tempo virtual chegar ao teto, e o `--screenshot` só dispara quando ele
 * chega. O cabeçalho de `ab-identidade.mjs` já dizia por outro motivo que o
 * orçamento virtual é régua ruim (adianta TIMER, não REDE); aqui ele é régua
 * nenhuma.
 *
 * Espera o SINAL de prontidão do app (`esperarAssentar`), com o critério
 * antigo — cartografia + `quadros` quadros desenhados — como teto de
 * segurança. As seis faces do gate do céu saem BIT-IDÊNTICAS pelos dois
 * caminhos (medido 2026-08-11, `skyError` 0,7782 nos dois).
 *
 * Devolve `{ png, via, ms, linhas }` e não só o PNG: quem chama TEM de saber
 * por qual caminho a captura assentou, senão o teto de segurança engata em
 * silêncio — ver `julgarProntidao`.
 *
 * `coletar` é um RegExp (NUNCA com `/g`: `lastIndex` sobrevive entre chamadas
 * e faria o filtro alternar entre pegar e não pegar) que escolhe quais
 * mensagens de console a captura guarda em `linhas`. Existe para a régua 3
 * (`planeta-pixel.mjs`) ler o bloco do `?dbgplan` DO MESMO carregamento que
 * produziu o PNG: previsto e medido têm de vir do mesmo quadro, senão a
 * comparação de 0,5 px compara duas cenas.
 */
export async function capturarCDP({
  url, largura, altura, porta, quadros = 700, teto = 300000, coletar = null, dpr = null,
}) {
  const perfil = resolve(tmpdir(), `cdp-${process.pid}-${porta}`);
  const { encerrar } = lancarChrome({
    perfil,
    args: [
      ...GPU_FLAGS,
      '--hide-scrollbars', '--no-first-run', '--mute-audio',
      '--force-device-scale-factor=1', `--window-size=${largura},${altura}`,
      `--remote-debugging-port=${porta}`, 'about:blank',
    ],
  });
  let socket = null;
  try {
    let alvo = null;
    for (let i = 0; i < 100 && !alvo; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
        alvo = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
      } catch { /* Chrome ainda subindo */ }
      if (!alvo) await dorme(200);
    }
    if (!alvo) throw new Error('CDP não respondeu');
    let cartografia = false;
    const linhas = [];
    socket = await ligarSocketCDP(alvo, (m) => {
      if (m.method === 'Runtime.consoleAPICalled') {
        const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
        if (txt.includes('[cartografia]')) cartografia = true;
        if (coletar && coletar.test(txt)) linhas.push(txt);
      }
    });
    const { send } = socket;
    await send('Page.enable');
    await send('Runtime.enable');
    // A PERNA RETINA (item 2 do mapa da R2): o escândalo de instrumento da
    // madrugada de 16→17/08 foi as réguas medirem SEMPRE em DPR 1 — nunca o
    // céu que o dono vê no Mac. Com `dpr`, o CDP emula a tela (o
    // devicePixelRatio muda de verdade, o preset cinema arma pr=dpr e o
    // buffer escala) e o screenshot sai em px FÍSICOS (largura·dpr).
    //
    // E o override também FIXA A ÁREA ÚTIL em largura×altura exatos — o que
    // a primeira trava da escada pegou no primeiro tiro (17/08): a janela
    // `--window-size=900,900` desconta a barra do navegador e a viewport
    // real era 900×813, com as previsões da régua assumindo 900 de altura.
    // Toda régua que passa `dpr` (mesmo `dpr: 1`) ganha a geometria exata;
    // quem NÃO passa (`null`) fica com a viewport de janela de sempre,
    // byte a byte — os históricos dessas réguas continuam comparáveis.
    if (dpr !== null) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: largura, height: altura, deviceScaleFactor: dpr, mobile: false,
      });
    }
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__f=0;const o=window.requestAnimationFrame.bind(window);'
        + 'window.requestAnimationFrame=(c)=>o((t)=>{window.__f++;return c(t)});',
    });
    await send('Page.navigate', { url });
    const assentou = await esperarAssentar({
      send, cartografia: () => cartografia, quadros, teto,
    });
    // O SEGUNDO TERMO DO OBTURADOR (23/08) — ver `esperarCapaSair`. A
    // prontidão diz que a CENA assentou; esta diz que nada do app está
    // por CIMA dela. Sob `?shot=2` sai `ausente` em ~5 ms.
    const capa = await esperarCapaSair(send);
    process.stdout.write(
      `  assentou por ${assentou.via} em ${(assentou.ms / 1000).toFixed(1)}s`
      + ` · fase=${assentou.fase ?? '?'} · capa=${capa.estado}`
      + (capa.estado === 'ausente' ? '' : ` (+${(capa.ms / 1000).toFixed(1)}s)`)
      + '\n'
    );
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    if (buf.length < 40000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
    return { png: buf, via: assentou.via, ms: assentou.ms, fase: assentou.fase, capa, linhas };
  } finally {
    socket?.fechar();
    await encerrar({ carencia: 400 });
  }
}

/**
 * Mata TODO processo cuja linha de comando cite este `user-data-dir` — o
 * browser e os helpers que sobrevivem a ele. Casa pelo perfil, e não pelo
 * nome, para nunca encostar no Chrome que o usuário está usando.
 */
export function matarPerfil(perfil) {
  if (process.platform === 'win32') {
    spawnSync('powershell', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ` +
      `Where-Object { $_.CommandLine -like '*${perfil.replace(/\\/g, '\\\\')}*' } | ` +
      `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
    ], { stdio: 'ignore' });
  } else {
    // -f casa a linha inteira; o perfil tem o PID do harness, então é único
    spawnSync('pkill', ['-f', perfil], { stdio: 'ignore' });
  }
}
