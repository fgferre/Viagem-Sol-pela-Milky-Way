// ============================================================
// Custo: ~25 s por corrida nesta máquina (medido 10/09) — a maior parte é
// a espera de assentamento inicial, que cai no teto de segurança por
// contagem de quadros (~14 s) em vez do sinal rápido do app; os gestos e
// os dois clipes somam só uns 12 s.
//
// A SONDA DE MOVIMENTO — C0 do plano de motion (docs/PLANO-MOTION-UI.md,
// §12.3 e "C0 — restabelecer uma referência verificável"). Não julga
// sozinha: registra o commit, repete SEMPRE a mesma sequência de gestos
// por CDP (mouse/teclado reais na mesa, dedo real no telefone) e produz
// um JSON com as medidas mais clipes em velocidade normal — para
// qualquer IA repetir a ação, saber que commit está vendo e comparar
// antes/depois sem depender de "eu vi na tela".
//
// Os nomes de campo (`painel`, `transform`, `inert`, `events`,
// `beforeRelease`, `drag`) seguem os dois JSONs do auditor de 10/09
// (`capturas/auditoria-motion-20260910*-16e852d.json`) onde fazia
// sentido reaproveitar — esta sonda estende aquela primeira sondagem
// manual para um script reproduzível, com mais instantes por gesto.
//
// Uso:
//   node scripts/visual/sonda-motion.mjs
//   node scripts/visual/sonda-motion.mjs --app=http://localhost:58697
//   node scripts/visual/sonda-motion.mjs --folha --app=http://localhost:58697
//   node scripts/visual/sonda-motion.mjs --c5 --app=http://localhost:58697
//   node scripts/visual/sonda-motion.mjs --c5=v6,v7 --app=http://localhost:58697
//   node scripts/visual/sonda-motion.mjs --contorno --app=http://localhost:5180
//
// Saída (nomes inéditos — nunca sobrescreve, ver `semSobrescrever`):
//   capturas/motion-c0-<commit>.json       todas as amostras + metadados
//   capturas/motion-c0-mesa-<commit>.mp4   abrir/trocar/fechar (2a–2c)
//   capturas/motion-c0-toque-<commit>.mp4  abrir + arrastar + soltar (3)
// ============================================================
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import sharp from 'sharp';
import {
  lancarChrome, GPU_FLAGS, dorme, ligarSocketCDP, portaDoPerfil,
  comLinguaDoJuizNaUrl, esperarPor, esperarAssentar, esperarCapaSair,
} from './chrome.mjs';
import { semSobrescrever } from './luz-ab.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CAPTURAS = resolve(ROOT, 'capturas');
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';

const argApp = process.argv.find((a) => a.startsWith('--app='));
const APP = argApp ? argApp.slice('--app='.length) : 'http://localhost:58697';

// --dpr=N — o deviceScaleFactor usado em TODA emulação de métricas desta
// sonda (todo `Emulation.setDeviceMetricsOverride`) e na flag do Chrome
// que abre a aba (`abrirSonda`, `--force-device-scale-factor`). Ausente,
// o padrão de sempre (1) — nenhum comportamento muda.
const argDpr = process.argv.find((a) => a.startsWith('--dpr='));
const DPR = argDpr ? Number(argDpr.slice('--dpr='.length)) : 1;

// --query=k=v&k2=v2 — mescla por CIMA da query base de cada modo,
// sobrescrevendo as mesmas chaves (as outras sobrevivem); ausente, a
// query de sempre, intocada. `URLSearchParams.set` atualiza uma chave já
// presente NO LUGAR dela (ex.: `lang=pt-BR` vira `lang=en` sem mudar a
// ordem) — só uma chave nova vai para o fim.
const argQuery = process.argv.find((a) => a.startsWith('--query='));
const QUERY_OVERRIDES = argQuery ? argQuery.slice('--query='.length) : '';
function mesclarQuery(base) {
  if (!QUERY_OVERRIDES) return base;
  const params = new URLSearchParams(base);
  for (const [chave, valor] of new URLSearchParams(QUERY_OVERRIDES)) params.set(chave, valor);
  return params.toString();
}

// --janela=WxH — o viewport de MESA que todo modo na mesa usa para abrir
// a aba e para VOLTAR depois de testar um redimensionamento; ausente,
// 1440x900 de sempre.
const argJanela = process.argv.find((a) => a.startsWith('--janela='));
const JANELA = argJanela ? argJanela.slice('--janela='.length) : '1440x900';
const [JANELA_W, JANELA_H] = JANELA.split('x').map(Number);

// --telefone=WxH — o viewport de CELULAR (retrato) que todo modo no
// celular usa; ausente, 390x844 de sempre.
const argTelefone = process.argv.find((a) => a.startsWith('--telefone='));
const TELEFONE = argTelefone ? argTelefone.slice('--telefone='.length) : '390x844';
const [TELEFONE_W, TELEFONE_H] = TELEFONE.split('x').map(Number);

// --app-commit=<texto> — substitui o commit fixo do "servidor isolado" no
// meta de todo modo; ausente, "mesmo commit da árvore" (o caso comum: a
// sonda medindo o MESMO servidor que ela roda).
const argAppCommit = process.argv.find((a) => a.startsWith('--app-commit='));
const APP_COMMIT = argAppCommit ? argAppCommit.slice('--app-commit='.length) : 'mesmo commit da árvore';

const QUERY = mesclarQuery('atlas=1&q=performance&lang=pt-BR');
// `--c5` usa o FILME (sem `?atlas=1`) nas cenas V1–V6 — a mesma língua e
// o mesmo preset "performance" do resto da sonda, só sem o Atlas.
const QUERY_FILME = mesclarQuery('lang=pt-BR&q=performance');
// `q`/`lang`/`ui` DE VERDADE da query desta corrida, para o meta e o
// cabeçalho de todo modo — um 'performance'/'pt-BR' escrito à mão mentia
// assim que alguém rodasse com `--query=` (a matriz do C7 roda em inglês,
// com `ui=1.4` e com `q=cinema`).
const paramsDaQuery = new URLSearchParams(QUERY);
const META_DA_QUERY = {
  q: paramsDaQuery.get('q'), lang: paramsDaQuery.get('lang'), ui: paramsDaQuery.get('ui'),
};
const ROTULO_DA_QUERY = `${META_DA_QUERY.lang} | q=${META_DA_QUERY.q}${META_DA_QUERY.ui ? ` | ui=${META_DA_QUERY.ui}` : ''}`;
// `--sequencia` troca as seis provas E1–E6 (paralelas, sem história entre
// si) por UM fluxo contínuo só (C3, docs/PLANO-MOTION-UI.md linha 511:
// "mostrar uma sequência contínua Buscar Saturno → abrir seção → copiar
// link → mudar tempo"). Opt-in: sem a flag, o comportamento é o de
// sempre, intocado — ver o `if (!SEQUENCIA)` no fim do arquivo.
const SEQUENCIA = process.argv.includes('--sequencia');
// `--interrupcoes` troca a corrida de sempre por CINCO cenários de
// INTERROMPER um movimento no meio (I1–I5, o complemento do C1/C2/C3:
// aquelas provas rodam o gesto inteiro sem cutucar — estas cutucam de
// propósito). Cobre quatro formas de interrupção: fechar a sanfona
// "Avançado" no meio de uma abertura e reabri-la no meio de um
// fechamento; ligar "reduzir movimento" NO MEIO de uma transição
// (painel entrando/saindo, linha do tempo); redimensionar a janela sem
// cruzar o ponto de quebra do celular (760px) enquanto algo anima; e
// interromper a própria linha do tempo com um redimensionamento (I4) ou
// um Esc (I5). Cada cenário amostra com `amostrarSequencia` (dtMs REAL,
// nunca o nominal) e imprime PASSA/FALHA a partir dos números — não
// julga por fora, só mede. Opt-in: sem a flag, nada aqui muda.
const INTERRUPCOES = process.argv.includes('--interrupcoes');
// `--folha` troca a corrida de sempre por OITO cenários (F1–F8) da FOLHA
// GUIADA PELA MÃO no telefone (C4 do plano de motion, `useGavetas.ts`,
// `destinoDoArrasto`/`deslocamentoDaFolha`): a alça do cabeçalho
// (`.hud-cabecalho-eyebrow`, fora de qualquer botão) expande a compacta
// arrastando para cima e recolhe a expandida arrastando para baixo,
// seguindo o dedo até a decisão no soltar. Cobre as quatro guardas que
// não podem quebrar o gesto — um controle deslizante, um segundo dedo, a
// rolagem já dentro da expandida, e a paisagem baixa da MESA (onde a
// folha existe por `janelaBaixa`, não por `celular`, e o gesto não liga)
// — e amostra com `jsAmostraFolha` (estado, topo, transform, WAAPI,
// linha do tempo), como `rodarInterrupcoes`: PASSA/FALHA só a partir dos
// números medidos. Opt-in: sem a flag, nada aqui muda.
const FOLHA = process.argv.includes('--folha');
// `--c5` troca a corrida de sempre por OITO cenas (V1–V8) do que o C5
// já entregou (marcos do carregamento, aceno do CTA primário, o chrome
// do filme sumindo sozinho, o grupo "Mais", os ícones do transporte, a
// barra de progresso, a tela final, o acento de seleção no céu e a dica
// de ajuda): um clipe em velocidade normal + folha de contato por cena,
// como `--folha`/`--interrupcoes`, mais uma leva de checagens de DOM.
// Não é um gate de PASSA/FALHA — roda uma vez e relata os números.
// Opt-in: sem a flag, nada aqui muda.
// `--c5=v6,v7` (vírgula, sem espaço) roda só as cenas listadas — útil
// para reverificar UM conserto pontual sem pagar as oito de novo; sem
// valor, `--c5` sozinho continua rodando as OITO de sempre.
const argC5 = process.argv.find((a) => a === '--c5' || a.startsWith('--c5='));
const C5 = Boolean(argC5);
const C5_QUAIS = argC5 && argC5.includes('=')
  ? new Set(argC5.slice('--c5='.length).split(',').map((v) => v.trim()).filter(Boolean))
  : null; // null = todas as oito
// `--contorno` troca a corrida de sempre pelo A/B do C6 do plano de
// motion (docs/PLANO-MOTION-UI.md §7 e §12.5): o reflexo CSS de sempre
// (A) contra A + o protótipo de halo WebGL (B, `?contorno=webgl`,
// `three/core/contornoDaUi.ts`) na mesma abertura da aba Camadas —
// clipes recortados na borda, prova por luminância e custo pareado de
// GPU/quadro. Roda uma vez e relata os números, como `--c5`; não é
// PASSA/FALHA. Opt-in: sem a flag, nada aqui muda.
// `--contorno=cancelamento` (vírgula não se aplica aqui — um valor só)
// troca o A/B de sempre pelo sub-modo PASSA/FALHA do C6 (K0–K6): prova
// que o halo CANCELA o desenho nos jeitos que o conserto promete
// (reduzir movimento, resize, o painel mudar de tamanho sozinho, a
// troca de ferramenta) — ver `rodarCancelamento`.
const argContorno = process.argv.find((a) => a === '--contorno' || a.startsWith('--contorno='));
const CONTORNO = Boolean(argContorno);
const CONTORNO_MODO = argContorno && argContorno.includes('=')
  ? argContorno.slice('--contorno='.length)
  : null; // null = o A/B de sempre (clipes + stills + custo)
// `--visivel` — `abrirSonda` sobe o Chrome SEM `--headless=new` (mesmo
// padrão de `abrirSessao`, chrome.mjs): uma janela de verdade na tela
// do dono, para conferir a olho o que a sonda está fazendo. Ausente, o
// padrão de sempre (headless) não muda em nada.
const VISIVEL = process.argv.includes('--visivel');
// `--sem-timer` (com `--contorno`) — mede o tempo de quadro SEM as timer
// queries por desenho: medido em 11/09 (Chrome visível, DPR 2), a soma
// delas por quadro dava 700–900ms, impossível — a própria consulta mexe
// no regime da placa. Com a flag o instrumento só marca rAF e os
// desenhos do halo, e o custo sai só do tempo de quadro pareado A×B.
const SEM_TIMER = process.argv.includes('--sem-timer');
// `--aberturas=N` (com `--contorno`) — quantas aberturas por bloco do
// custo (A1/B1/B2/A2); ausente, 5. O tempo de quadro sob vsync anda em
// degraus de ~16,7ms e cinco aberturas por bloco não bastaram para
// separar ruído de custo (11/09, DPR 2: B1 e B2 discordaram) — a regra
// do §9 é aumentar a observação em vez de declarar.
const argAberturas = process.argv.find((a) => a.startsWith('--aberturas='));
const ABERTURAS_POR_BLOCO = argAberturas ? Number(argAberturas.slice('--aberturas='.length)) : 5;

const SEL_CAMADAS_GATILHO = '[data-abre-dialogo="camadas"]';
const SEL_AJUSTES_GATILHO = '[data-abre-dialogo="ajustes"]';
const SEL_CAMADAS_PAINEL = '[data-dialogo="camadas"]';
const SEL_AJUSTES_PAINEL = '[data-dialogo="ajustes"]';
// O CONTAINER do segmentado "Qualidade" — pela POSIÇÃO (3º `.ajustes-seg`
// do painel: Idioma, Texto, Qualidade, nesta ordem fixa em Ajustes.tsx),
// nunca pelo `aria-label`: ele é TRADUZIDO (`t('ajustes.qualidade')`), e
// um seletor em português quebra sob `--query=lang=en` (achado rodando
// M1, DPR2+EN, 11/09 — "Qualidade" não existe em inglês). `nth-of-type`
// não serve — cada `.ajustes-seg` é filho único do seu próprio
// `.ajustes-controle`, então CSS puro não conta "o 3º da classe"; só um
// `querySelectorAll` em ORDEM DE DOCUMENTO faz essa conta, daí ser uma
// EXPRESSÃO JS (usada dentro de outro `(() => {...})()`), não um seletor
// CSS como os `SEL_*` vizinhos.
const jsSegQualidade = () => `Array.from(document.querySelectorAll('${SEL_AJUSTES_PAINEL} .ajustes-seg'))[2]`;
// OS BOTÕES DA MÁQUINA DO TEMPO, pela mesma razão: o `aria-label` deles
// é traduzido ("Avançar no tempo" não existe sob `--query=lang=en`, achado
// rodando `--sequencia` em inglês, 11/09). Os três segmentados de
// `.atlas-tempo-botoes` têm ordem fixa em HudDoAtlas.tsx — transporte
// (voltar, pausar, avançar), velocidade, referência (ao vivo, …) — e os
// botões são os filhos DIRETOS de cada um. Expressão JS, como a de cima.
const jsBotaoDoTempo = (grupo, indice) =>
  `Array.from(document.querySelectorAll('.atlas-tempo-botoes .ajustes-seg'))[${grupo}]?.querySelectorAll(':scope > button')[${indice}]`;
const SEL_BUSCA_GATILHO = '[data-abre-dialogo="busca"]';
const SEL_BUSCA_PAINEL = '[data-dialogo="busca"]';
const SEL_FICHA_PAINEL = '[data-dialogo="ficha"]';
// A ALÇA E O "DETALHES" DA FICHA (`--folha`) — a alça é o EYEBROW do
// cabeçalho (só texto, nenhum botão dentro: `pontoDaAlca` confere em
// tempo de execução antes de usar o ponto), "Detalhes" é o botão que
// expande a compacta sem arrasto nenhum (F7/F8).
const SEL_FICHA_EYEBROW = '.hud-cabecalho-eyebrow';
const SEL_FICHA_DETALHES = '.atlas-ficha-detalhes';
// A SANFONA "AVANÇADO" (I1) e A LINHA DO TEMPO (I2c, I4, I5) — únicos
// alvos novos desta sonda que não são um `[data-dialogo]`.
const SEL_AVANCADO_GATILHO = '[aria-controls="ajustes-avancado"]';
const SEL_AVANCADO_CORPO = '#ajustes-avancado';
const SEL_TEMPO_CABECALHO = '.atlas-tempo-cabecalho';
const SEL_TEMPO_LINHA = '.atlas-tempo-linha';
// OS SEIS TOKENS DE DESLOCAMENTO (movimento.test.ts, `TOKENS_DE_MOVIMENTO`
// + `--t-rapido`) que a gravação lenta da C3 multiplica por 6 — a mesma
// lista, e não um subconjunto, porque a sequência inteira (busca, ficha,
// sanfona, ajustes, tempo) usa as duas famílias de token.
const TOKENS_LENTOS = ['--t-entrada', '--t-assenta', '--t-reflexo', '--t-folha', '--t-pressao', '--t-rapido'];

// O CONTADOR DE QUADROS (para `esperarAssentar`) e O COLETOR DE EVENTOS
// (para as tabelas `events`, replicando o que o auditor de 10/09 leu à
// mão): todo `animationstart` da casa já é um `@keyframes` nomeado
// (`entraPainel`, `saiPainel`, `assentaIcone`...) — um só ouvinte global
// substitui uma sonda por keyframe.
const SCRIPT_INJETADO = `
window.__f = 0;
const _raf = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = (cb) => _raf((t) => { window.__f++; return cb(t); });
window.__eventosMotion = [];
document.addEventListener('animationstart', (e) => {
  const alvo = (typeof e.target.className === 'string') ? e.target.className : {};
  window.__eventosMotion.push({ time: e.timeStamp, name: e.animationName, target: alvo });
}, true);
window.__toquesEntregues = 0;
window.addEventListener('touchstart', () => { window.__toquesEntregues++; }, { capture: true, passive: true });
`;

/** quantos `touchstart` a PÁGINA recebeu desde que nasceu — o toque
 *  emulado pelo CDP às vezes para de ser entregue no meio de uma sessão
 *  longa (medido a 760×900, depois do arrasto no deslizante da F6: zero
 *  eventos de toque na página na F7 inteira), e um cenário sem toque
 *  nenhum não diz nada sobre o app — é INCONCLUSIVO, nunca FALHA. */
const lerToques = (sessao) => sessao.js('window.__toquesEntregues ?? 0');

/** o veredito de um grupo de casos (I2/I3, K0–K6): FALHA se algum caso
 *  falhou; senão INCONCLUSIVO se algum ficou sem prova; só PASSA se todos
 *  passaram — um caso sem prova nunca vira aprovação por arrasto. */
const combinarVereditos = (vereditos) => {
  if (vereditos.some((v) => v === 'FALHA')) return 'FALHA';
  if (vereditos.some((v) => v === 'INCONCLUSIVO')) return 'INCONCLUSIVO';
  return 'PASSA';
};

/**
 * UMA SESSÃO DE CHROME PRÓPRIA, e não `abrirSessao` de `chrome.mjs`: esta
 * sonda precisa de `Page.startScreencast` para os clipes (passo 5), e
 * `Page.screencastFrame` chega como EVENTO não solicitado — o
 * despachante de `abrirSessao` só repassa três eventos fixos (carga,
 * console, exceção) e descartaria os quadros sem nunca confirmá-los
 * (`Page.screencastFrameAck`), o que faz o Chrome parar de mandar depois
 * do primeiro. Por isso esta função reabre, com as MESMAS peças
 * exportadas por `chrome.mjs` (`lancarChrome`, `portaDoPerfil`,
 * `ligarSocketCDP`, `esperarAssentar`), um despachante que qualquer
 * chamador pode assinar com `onEvento`.
 */
async function abrirSonda({ janela, prefixo }) {
  const [w, h] = janela.split('x').map(Number);
  const perfil = resolve(tmpdir(), `${prefixo}-${process.pid}`);
  // `--visivel` tira `--headless=new` de GPU_FLAGS — mesmo padrão de
  // `abrirSessao` (chrome.mjs, comentário lá tem o histórico). Ausente,
  // `GPU_FLAGS` intocado, headless de sempre.
  const flagsGpu = VISIVEL ? GPU_FLAGS.filter((f) => f !== '--headless=new') : GPU_FLAGS;
  const { encerrar } = lancarChrome({
    perfil,
    args: [
      ...flagsGpu,
      '--hide-scrollbars', '--no-first-run', '--mute-audio',
      `--force-device-scale-factor=${DPR}`, `--window-size=${w},${h}`,
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
  // A NOSSA ABA — pelo id do próprio socket (`…/devtools/page/<targetId>`),
  // do mesmo jeito que `abrirSessao` (chrome.mjs) já faz; o vigia abaixo
  // usa este id para nunca fechar a própria aba por engano.
  const idDaAba = alvo.split('/').pop();

  const ouvintes = new Set();
  let carregou = false;
  let cartografiaVista = false;
  const { send, fechar: fecharSocket } = await ligarSocketCDP(alvo, (m) => {
    if (m.method === 'Page.loadEventFired') carregou = true;
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
      if (txt.includes('[cartografia]')) cartografiaVista = true;
    }
    for (const fn of ouvintes) fn(m);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: SCRIPT_INJETADO });

  // GRAVANDO — aceso por `gravarClipe` durante a janela de
  // `Page.startScreencast`; o vigia abaixo lê para NUNCA chamar
  // `Target.closeTarget`/`activateTarget` no meio de uma gravação (achado
  // ao rodar `--c5`: a reativação forçada no meio de um clipe corrompeu
  // os quadros e quebrou o `ffmpeg` — "Error sending frames to
  // consumers"). Adiar para a próxima varredura, 500ms depois, é mais
  // barato que arriscar o clipe.
  let gravando = false;
  // O VIEWPORT QUE A CENA QUER — `null` até algum chamador registrar um
  // com `marcarViewport` (opt-in: os modos de sempre nunca chamam, e o
  // vigia abaixo fica exatamente como antes para eles). `--c5` registra
  // 1440×900 uma vez, no início de `rodarC5`.
  let ultimoOverride = null;

  /**
   * O VIGIA DA ABA DA FRENTE (mesmo achado de `abrirSessao`,
   * chrome.mjs — comentário lá tem o histórico completo): sessões longas
   * correm o risco do Chrome headless abrir sozinho uma aba
   * `chrome://settings/help` e roubar o primeiro plano. Copiado aqui
   * porque `abrirSonda` é uma sessão própria, sem herdar de
   * `abrirSessao`; só chama `Target.activateTarget` quando FECHA uma
   * intrusa de verdade — a reafirmação incondicional de `abrirSessao`
   * (inócua lá) corrompeu um clipe aqui no meio de uma gravação.
   *
   * ACHADO NOVO, rodando `--c5` (o primeiro modo longo o bastante para
   * bater nisto): a intrusa nasce como uma SEGUNDA ABA da MESMA janela,
   * e isso é o bastante para o Chrome passar a reservar a faixa da
   * barra de abas — a área útil encolhe (medido: 900 -> 813px de
   * altura, os mesmos 87px "descontados pela barra" do achado de
   * 17/08 em `capturarCDP`) e NÃO VOLTA sozinha ao fechar a intrusa. Um
   * clipe gravado depois disso saía com 1440×813 — altura ÍMPAR, que o
   * `libx264` do `renderizarClipe` recusa ("Could not open encoder").
   * Por isso o vigia reaplica `ultimoOverride` (se alguém registrou um)
   * depois de fechar a intrusa — `setDeviceMetricsOverride` FORÇA a área
   * útil de volta ao tamanho pedido, ao contrário de só reativar a aba.
   */
  const vigiaDaFrente = setInterval(async () => {
    if (gravando) return;
    try {
      const { targetInfos } = await send('Target.getTargets');
      const intrusa = targetInfos.find(
        (t) => t.type === 'page' && t.targetId !== idDaAba && /^(chrome|edge):\/\//.test(t.url)
      );
      if (intrusa) {
        process.stdout.write(
          `  ·     vigia: aba intrusa ${intrusa.url} fechada — a frente volta ao app\n`
        );
        await send('Target.closeTarget', { targetId: intrusa.targetId });
        await send('Target.activateTarget', { targetId: idDaAba });
        if (ultimoOverride) await send('Emulation.setDeviceMetricsOverride', ultimoOverride);
      }
    } catch { /* sessão fechando, ou socket já morto */ }
  }, 500);
  vigiaDaFrente.unref?.();

  const js = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`js: ${r.exceptionDetails.text}`);
    return r.result.value;
  };

  const ir = async (query) => {
    carregou = false;
    cartografiaVista = false;
    await send('Page.navigate', {
      url: comLinguaDoJuizNaUrl(`${APP}/${query ? `?${query}` : ''}`),
    });
    const t0 = Date.now();
    while (!carregou) {
      if (Date.now() - t0 > 30000) throw new Error(`?${query}: o documento novo não carregou`);
      await dorme(20);
    }
    return esperarAssentar({ send, cartografia: () => cartografiaVista, quadros: 700, teto: 180000 });
  };

  return {
    send,
    js,
    ir,
    onEvento: (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    marcarGravando: (v) => { gravando = v; },
    marcarViewport: (o) => { ultimoOverride = o; },
    fechar: () => { clearInterval(vigiaDaFrente); fecharSocket(); return encerrar(); },
  };
}

async function retanguloDe(sessao, seletor) {
  return sessao.js(`(() => {
    const el = document.querySelector(${JSON.stringify(seletor)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })()`);
}

/** o par mousePressed+mouseReleased em coordenadas EXPLÍCITAS — o miolo
 *  de `clicarReal`, que a V7 (`--c5`) também precisa: o ponto de clique
 *  vem de um rótulo achado no céu, não de um seletor de DOM. */
async function clicarEmPonto(sessao, x, y) {
  const base = {
    x, y, button: 'left', clickCount: 1, buttons: 1, pointerType: 'mouse',
  };
  await sessao.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed' });
  await sessao.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', buttons: 0 });
  return { x, y };
}

/** ROLA ATÉ O ALVO, como a pessoa rolaria, antes de clicar nele: com o
 *  texto grande (`ui=1.4`) o "Copiar link" dos Ajustes nasce abaixo da
 *  tela, dentro da rolagem do painel (medido 11/09, 1440×900: botão em
 *  919–980 px), e o clique no centro dele caía fora da página. Só o eixo
 *  VERTICAL e só o primeiro ancestral que ROLA de verdade (`overflow-y`
 *  auto/scroll) — `scrollIntoView` também rolaria um contêiner com
 *  `overflow: hidden` e deslocaria o HUD inteiro. Alvo já visível: nada. */
const jsTrazerParaAVista = (expressao) => `(() => {
  const el = ${expressao};
  if (!el) return false;
  let rolador = el.parentElement;
  while (rolador && !/(auto|scroll)/.test(getComputedStyle(rolador).overflowY)) rolador = rolador.parentElement;
  if (!rolador) return false;
  const r = el.getBoundingClientRect();
  const v = rolador.getBoundingClientRect();
  const fundo = Math.min(v.bottom, innerHeight);
  const topo = Math.max(v.top, 0);
  if (r.bottom > fundo) rolador.scrollTop += r.bottom - fundo + 8;
  else if (r.top < topo) rolador.scrollTop -= topo - r.top + 8;
  return true;
})()`;

/** o clique real de `clicarReal` num alvo dado por EXPRESSÃO JS (as
 *  `js*` acima), e não por seletor — o ponto sai do próprio DOM. */
async function clicarNaExpressao(sessao, expressao, nome) {
  await sessao.js(jsTrazerParaAVista(expressao));
  const p = await sessao.js(`(() => {
    const el = ${expressao};
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  if (!p) throw new Error(`clicarNaExpressao: ${nome} não encontrado`);
  return clicarEmPonto(sessao, p.x, p.y);
}

/** clique real de mouse (mousePressed+mouseReleased) no centro do alvo —
 *  o par que `Input.dispatchMouseEvent` gera é o que faz o Chrome
 *  decidir `:focus-visible` como um clique de verdade decidiria. */
async function clicarReal(sessao, seletor) {
  await sessao.js(jsTrazerParaAVista(`document.querySelector(${JSON.stringify(seletor)})`));
  const r = await retanguloDe(sessao, seletor);
  if (!r) throw new Error(`clicarReal: "${seletor}" não encontrado`);
  return clicarEmPonto(sessao, r.x + r.width / 2, r.y + r.height / 2);
}

async function moverMouse(sessao, x, y) {
  await sessao.send('Input.dispatchMouseEvent', {
    x, y, type: 'mouseMoved', pointerType: 'mouse', buttons: 0,
  });
}

async function pressionarEscape(sessao) {
  const base = {
    key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27,
  };
  await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown' });
  await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
}

/** teclas nomeadas que a sonda padrão não precisava (Tab/Enter/Backspace
 *  do fluxo da C3, `--sequencia`) — mesmo par rawKeyDown/keyUp de
 *  `pressionarEscape`, acima; só o código nativo muda por tecla.
 *  `shift` (C5, `--c5`) manda o modificador do CDP (8 = Shift) para o
 *  Shift+Tab que devolve o foco ao gatilho do "Mais" — omitido, o
 *  comportamento de sempre não muda em nada. */
async function pressionarTecla(sessao, nome, { shift = false } = {}) {
  const TECLAS = { Tab: 9, Enter: 13, Backspace: 8 };
  const codigo = TECLAS[nome];
  if (!codigo) throw new Error(`pressionarTecla: tecla desconhecida "${nome}"`);
  const base = {
    key: nome, code: nome, windowsVirtualKeyCode: codigo, nativeVirtualKeyCode: codigo,
    modifiers: shift ? 8 : 0,
  };
  await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown' });
  await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
}

/** digita tecla a tecla — mesmo molde de `abrirSessao().digitar`
 *  (chrome.mjs): `text` é o que faz o Chrome inserir o caractere e
 *  disparar o `input` que o React escuta. Esta sonda tem sessão própria
 *  (comentário acima de `abrirSonda`) e por isso não herda o método. */
async function digitarTexto(sessao, texto) {
  for (const ch of texto) {
    const vk = ch.toUpperCase().charCodeAt(0);
    const base = {
      key: ch, text: ch, unmodifiedText: ch,
      windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
    };
    await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'keyDown' });
    await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  }
}

/** dedo de verdade — mesmo molde de `arrastarNaFolha` em
 *  `a11y-celular.mjs`: toque perto do topo da folha (a alça), `passos`
 *  `touchMove` incrementais e SEM soltar — quem chama decide QUANDO
 *  soltar, para poder fotografar o instante `beforeRelease`. */
async function tocarEArrastar(sessao, seletor, percursoPx, passos = 12) {
  const ponto = await sessao.js(`(() => {
    const f = document.querySelector(${JSON.stringify(seletor)});
    if (!f) return null;
    const b = f.getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + 12) };
  })()`);
  if (!ponto) throw new Error(`tocarEArrastar: "${seletor}" não encontrado`);
  await sessao.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: ponto.x, y: ponto.y }],
  });
  for (let n = 1; n <= passos; n++) {
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: ponto.x, y: ponto.y + Math.round((percursoPx * n) / passos) }],
    });
  }
}

async function tocarSoltar(sessao) {
  const t0 = Date.now();
  await sessao.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return t0;
}

/** o CENTRO da alça (o eyebrow do cabeçalho da ficha,
 *  `.hud-cabecalho-eyebrow`) — o ponto onde o dedo começa o arrasto
 *  guiado (`--folha`, F1–F5 e F7). Confere por `elementFromPoint` que o
 *  ponto não caiu dentro de um botão — o eyebrow é só texto (o "?" e os
 *  botões são IRMÃOS dele, nunca filhos), mas a checagem é em tempo de
 *  execução, não por confiança na leitura do código; se cair, usa a
 *  borda esquerda do próprio cabeçalho, onde não há botão nenhum. O
 *  eyebrow e o cabeçalho são os DA FICHA: todo painel da casa tem um
 *  `.hud-cabecalho-eyebrow`, e o primeiro do documento pode ser de outro.
 *  Um ponto que não cai na alça da ficha é relatado na saída — o dedo
 *  estaria em outro lugar, e o veredito do cenário não diria nada. */
async function pontoDaAlca(sessao) {
  const r = await retanguloDe(sessao, `${SEL_FICHA_PAINEL} ${SEL_FICHA_EYEBROW}`);
  if (!r) throw new Error(`pontoDaAlca: "${SEL_FICHA_EYEBROW}" da ficha não encontrado`);
  let x = Math.round(r.x + r.width / 2);
  let y = Math.round(r.y + r.height / 2);
  const dentroDeBotao = await sessao.js(
    `Boolean(document.elementFromPoint(${x}, ${y})?.closest('button'))`
  );
  if (dentroDeBotao) {
    const cab = await retanguloDe(sessao, `${SEL_FICHA_PAINEL} .hud-cabecalho`);
    if (!cab) throw new Error('pontoDaAlca: ".hud-cabecalho" da ficha não encontrado');
    x = Math.round(cab.x + 16);
    y = Math.round(cab.y + cab.height / 2);
  }
  const alvo = await sessao.js(`(() => {
    const e = document.elementFromPoint(${x}, ${y});
    return { naAlca: Boolean(e?.closest('${SEL_FICHA_PAINEL} .hud-cabecalho')), alvo: e ? e.tagName + '.' + (typeof e.className === 'string' ? e.className : '') : null };
  })()`);
  if (!alvo.naAlca) process.stdout.write(`  ·     pontoDaAlca: (${x}, ${y}) caiu fora da alça da ficha — em ${alvo.alvo}\n`);
  return { x, y };
}

async function limparEventos(sessao) { await sessao.js('window.__eventosMotion.length = 0'); }
async function lerEventos(sessao) { return sessao.js('window.__eventosMotion'); }

/** a leitura composta de UM painel `[data-dialogo]`: retângulo, `inert`,
 *  transform/animação computados e uma descrição curta do foco — os
 *  mesmos quatro campos que os dois JSONs do auditor guardam por
 *  instante (`panel`, `transform`, `inert`, `active`). */
function jsAmostraPainel(seletor) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(seletor)});
    const ae = document.activeElement;
    const ativo = ae ? {
      tag: ae.tagName,
      cls: (typeof ae.className === 'string' ? ae.className : ''),
      gatilho: (ae.getAttribute && ae.getAttribute('data-abre-dialogo')) || null,
    } : null;
    const linhaDoTempo = document.timeline.currentTime;
    if (!el) return { existe: false, active: ativo, linhaDoTempo };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      existe: true,
      inert: el.inert,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      transform: cs.transform,
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      transitionProperty: cs.transitionProperty,
      transitionDuration: cs.transitionDuration,
      // QUEM MOVE O PAINEL DESDE O C1 É A WAAPI (movimentoDaGaveta.ts) —
      // os campos de CSS acima ficam em "none"/"0s" o tempo todo. O estado
      // real é este: pendente (ainda sem quadro para começar), rodando,
      // terminada. E a linha do tempo do documento só anda quando o
      // navegador produz quadro: é ela que separa "a animação parou" de
      // "o Chrome da sonda não desenhou nada".
      waapi: el.getAnimations().map((a) => ({
        playState: a.playState,
        pending: a.pending,
        currentTime: a.currentTime === null ? null : Math.round(Number(a.currentTime)),
        // a duração (ms) — junto com currentTime, é o que sobra da
        // animação em curso; observarAposEvento/--interrupcoes (I2/I3)
        // usa os dois para saber se ela já ia terminar sozinha antes do
        // evento que a interrompeu chegar.
        duration: a.effect?.getComputedTiming().duration,
      })),
      linhaDoTempo,
      active: ativo,
    };
  })()`;
}

/** a leitura composta da FOLHA da ficha no celular (`--folha`): o mesmo
 *  molde de `jsAmostraPainel` (transform computado, WAAPI, linha do
 *  tempo), com o ESTADO (`data-ficha-estado`, compacta/expandida) e o
 *  TOPO (`getBoundingClientRect().top`) a mais — os dois campos que só
 *  esta folha tem e que o dedo persegue durante o arrasto guiado. */
function jsAmostraFolha() {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_FICHA_PAINEL)});
    const linhaDoTempo = document.timeline.currentTime;
    if (!el) {
      return {
        existe: false, estado: null, top: null, transform: null, transformInline: null,
        dataArrasto: false, waapi: [], linhaDoTempo,
      };
    }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      existe: true,
      estado: el.getAttribute('data-ficha-estado'),
      top: r.top,
      transform: cs.transform,
      // transformInline e dataArrasto são o que o PRÓPRIO gesto escreve
      // (useGavetas.ts: folha.style.transform e o atributo data-arrasto,
      // os dois só enquanto o dedo segura) — F1 (a zona morta do toque)
      // e F9 (resize com o dedo no ar) precisam de saber se o arrasto
      // ainda está "com o dedo", não só o transform computado.
      transformInline: el.style.transform,
      dataArrasto: el.hasAttribute('data-arrasto'),
      waapi: el.getAnimations().map((a) => ({
        playState: a.playState,
        pending: a.pending,
        currentTime: a.currentTime === null ? null : Math.round(Number(a.currentTime)),
        tipo: a.constructor.name,
        propriedade: a.transitionProperty ?? null,
      })),
      linhaDoTempo,
    };
  })()`;
}

/** a máquina do tempo não é `[data-dialogo]` — corpo + opacidade + a
 *  linha da data (para flagrar salto no primeiro quadro, item do
 *  passo 2f). */
function jsAmostraTempo() {
  return `(() => {
    const corpo = document.querySelector('.atlas-tempo-botoes');
    const dataEl = document.querySelector('.atlas-tempo-data');
    const dr = dataEl ? dataEl.getBoundingClientRect() : null;
    const dataRect = dr ? { x: dr.x, y: dr.y } : null;
    if (!corpo) return { existe: false, dataRect };
    const cs = getComputedStyle(corpo);
    return {
      existe: true,
      sumindo: corpo.classList.contains('sumindo'),
      opacity: cs.opacity,
      transform: cs.transform,
      animationName: cs.animationName,
      dataRect,
    };
  })()`;
}

/** a leitura composta da SANFONA "Avançado" dos Ajustes (I1,
 *  `--interrupcoes`): existência, as classes (`abrindo`/`saindo`, que
 *  convivem — comentário de `usePresenca.ts`, "reabrir no meio da saída
 *  reinicia a entrada"), e o par que decide se o corte está ativo —
 *  `overflow` computado do `.sanfona-miolo` (nunca a classe, que só diz
 *  a INTENÇÃO) e as duas alturas (`sanfonaClientHeight` colapsada,
 *  `mioloScrollHeight` cheio) para enxergar o meio do caminho mesmo sem
 *  o overflow mudar. */
function jsAmostraSanfona() {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_AVANCADO_CORPO)});
    if (!el) return { existe: false };
    const miolo = el.querySelector('.sanfona-miolo');
    return {
      existe: true,
      className: el.className,
      // 'hidden' se a CAIXA ou o MIOLO cortam: desde 12/09 o corte mora na
      // própria dobra (WAAPI na .sanfona); antes vivia nos @keyframes do miolo
      overflow: [el, miolo].filter(Boolean).some((n) => getComputedStyle(n).overflow === 'hidden')
        ? 'hidden'
        : (miolo ? getComputedStyle(miolo).overflow : null),
      sanfonaClientHeight: el.clientHeight,
      mioloScrollHeight: miolo ? miolo.scrollHeight : null,
      linhaDoTempo: document.timeline.currentTime,
    };
  })()`;
}

/** a sanfona está ANIMANDO nesta amostra? Pelo estado dela, e não pelo
 *  relógio da sonda: saindo, ou com a caixa menor que o conteúdo. O
 *  cronômetro da sonda não serve para isso — com a gravação ligada a
 *  página às vezes fica sem quadro e um alvo de "+400 ms" cai no meio
 *  da animação (medido: a reabertura só começou aos ~450 ms). */
const sanfonaAnimando = (a) =>
  a.existe && (a.className.includes('saindo') || a.sanfonaClientHeight < a.mioloScrollHeight - 1);

/** espera a sanfona "Avançado" chegar ao REPOUSO ABERTA — sem `saindo`,
 *  sem animação viva na caixa (a dobra WAAPI de `dobrar`) e com a altura
 *  cheia do miolo — em vez de dormir um número e torcer; `null` no
 *  estouro reprova em quem chama, como toda espera da casa. */
const esperarSanfonaEmRepouso = (sessao) =>
  esperarPor({ js: sessao.js }, `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_AVANCADO_CORPO)});
    const miolo = el && el.querySelector('.sanfona-miolo');
    return !!el && !!miolo && !el.className.includes('saindo')
      && el.getAnimations().length === 0
      && el.clientHeight >= miolo.scrollHeight - 1;
  })()`, 3000);

/** o `transform` computado da linha do tempo MAIS a WAAPI dela (I2c,
 *  `--interrupcoes`) — não confundir com a leitura cheia de
 *  `jsAmostraTempo` (que é sobre `.atlas-tempo-botoes`, não
 *  `.atlas-tempo-linha`). A WAAPI entrou junto do `transform`: desde que
 *  I2c passou a julgar por `observarAposEvento`, "assentou" precisa do
 *  mesmo par que o painel usa (`playState`/`duration`/`currentTime`),
 *  senão não dá para saber se o FLIP (`ir`, `HudDoAtlas.tsx`) ainda tem
 *  algo em curso ou se já parou de verdade. */
function jsTransformDaLinhaDoTempo() {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_TEMPO_LINHA)});
    if (!el) return { transform: null, waapi: [] };
    return {
      transform: getComputedStyle(el).transform,
      waapi: el.getAnimations().map((a) => ({
        playState: a.playState,
        pending: a.pending,
        currentTime: a.currentTime === null ? null : Math.round(Number(a.currentTime)),
        duration: a.effect?.getComputedTiming().duration,
      })),
    };
  })()`;
}

/** o `y` da linha do tempo (I4/I5, `--interrupcoes`) — o FLIP de
 *  `HudDoAtlas.tsx` anima esta linha por `translateY`, então a posição
 *  na tela (não o transform bruto) é o que conta um salto de verdade. */
function jsYDaLinhaDoTempo() {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_TEMPO_LINHA)});
    return { y: el ? el.getBoundingClientRect().y : null };
  })()`;
}

/** amostra em `alvosMs` relativos a `t0` (o instante do comando) — cada
 *  amostra guarda o `dtMs` REAL decorrido, nunca o nominal, porque a
 *  viagem de ida e volta do CDP nunca bate exato com o alvo. */
async function amostrarSequencia(sessao, t0, alvosMs, construirJs) {
  const amostras = [];
  for (const alvoMs of alvosMs) {
    const espera = alvoMs - (Date.now() - t0);
    if (espera > 0) await dorme(espera);
    const dtMs = Date.now() - t0;
    const dado = await sessao.js(construirJs());
    amostras.push({ alvoMs, dtMs, ...dado });
  }
  return amostras;
}

/**
 * OBSERVA O PRÓXIMO EVENTO da página (`evento`: `'resize'` — o `resize`
 * da `window` — ou `'reduzido'` — o `change` de
 * `matchMedia('(prefers-reduced-motion: reduce)')`, só quando ele chega
 * com `matches === true`) e o que os `quadros` `requestAnimationFrame`
 * seguintes veem — usado por I2/I3 (`--interrupcoes`) e F9 (`--folha`)
 * para julgar UM comando de CDP (`Emulation.setEmulatedMedia`/
 * `setDeviceMetricsOverride`) pelo relógio da PRÓPRIA página
 * (`performance.now()`), nunca pelo `Date.now()` do Node — os dois não
 * batem exato, e essa folga era o que produzia os vereditos de
 * +10/+60ms fixos que este helper substitui.
 *
 * `construirAmostra` é a MESMA fábrica zero-args que `amostrarSequencia`
 * já recebe (`jsAmostraFolha`, ou `() => jsAmostraPainel(seletor)`): uma
 * função que devolve a expressão JS (a string já é o IIFE invocado).
 * Chamada uma vez aqui do lado do Node para o `antesDoComando`, e
 * embrulhada em `() => (<expr>)` para virar uma função de VERDADE
 * dentro da página — só assim o laço de quadros reavalia a amostra a
 * cada `requestAnimationFrame`, em vez de reler um valor congelado na
 * hora da instalação.
 *
 * `agir` é o comando de CDP que dispara o evento, chamado só DEPOIS do
 * listener instalado — instalar tarde perde o evento. O retorno não
 * julga nada: quem chama decide PASSA/FALHA/INCONCLUSIVO a partir de
 * `antesDoComando`, `chegou` e `amostras`.
 */
async function observarAposEvento(sessao, { evento, construirAmostra, quadros = 4, tetoMs = 2000 }, agir) {
  const exprAmostra = construirAmostra();
  const antesDoComando = await sessao.js(`(() => {
    const amostra = (${exprAmostra});
    return { ...amostra, tAntes: performance.now() };
  })()`);

  await sessao.js(`(() => {
    window.__obsEvento = { chegou: false, tEvento: null, noEvento: null, amostras: [], pronto: false };
    const construirAmostra = () => (${exprAmostra});
    const aoAcontecer = () => {
      const tEvento = performance.now();
      window.__obsEvento.chegou = true;
      window.__obsEvento.tEvento = tEvento;
      window.__obsEvento.noEvento = construirAmostra();
      let quadro = 0;
      const passo = () => {
        quadro++;
        window.__obsEvento.amostras.push({
          quadro, msAposEvento: performance.now() - tEvento, ...construirAmostra(),
        });
        if (quadro < ${quadros}) {
          requestAnimationFrame(passo);
        } else {
          window.__obsEvento.pronto = true;
        }
      };
      requestAnimationFrame(passo);
    };
    if (${JSON.stringify(evento)} === 'resize') {
      window.addEventListener('resize', aoAcontecer, { once: true });
    } else {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      const aoMudar = (e) => {
        if (!e.matches) return;
        mq.removeEventListener('change', aoMudar);
        aoAcontecer();
      };
      mq.addEventListener('change', aoMudar);
    }
  })()`);

  await agir();

  const t0Poll = Date.now();
  let estado = await sessao.js('window.__obsEvento');
  while (!estado.pronto && Date.now() - t0Poll < tetoMs) {
    await dorme(25);
    estado = await sessao.js('window.__obsEvento');
  }

  return {
    antesDoComando,
    chegou: estado.chegou,
    msAntesAteEvento: estado.chegou ? estado.tEvento - antesDoComando.tAntes : null,
    noEvento: estado.noEvento,
    amostras: estado.amostras,
  };
}

async function pularTour(sessao) {
  await dorme(300); // dá tempo do convite (Spotlight) montar
  return sessao.js(`(() => {
    const b = document.querySelector('.convite-linha button:not(.convite-adiante)');
    if (!b) return false;
    b.click();
    return true;
  })()`);
}

/**
 * GRAVA UM CLIPE em velocidade normal: liga `Page.startScreencast` e
 * confirma cada quadro (`screencastFrameAck` — sem o ACK o Chrome para
 * de mandar depois do primeiro). `executar` é quem faz o gesto por
 * dentro da gravação, e é POR ISSO que o quadro só é GRAVADO EM DISCO
 * depois de `executar` terminar: medido nesta sonda, um
 * `writeFileSync` de ~1440×900 dentro do ouvinte competia pelo laço do
 * Node com os `dorme()` das amostras cronometradas do PRÓPRIO passo
 * seguinte e atrasava uma amostra "aos 40 ms" para 137 ms. Guardar só
 * o base64 (nenhuma E/S) durante a janela medida e decodificar/escrever
 * depois resolveu — as amostras de `abrirCamadas` (primeiro passo, sem
 * fila de quadro nenhuma na frente) já saíam exatas antes deste
 * conserto, o que apontou a causa.
 */
async function gravarClipe(sessao, { largura, altura, pastaQuadros }, executar) {
  mkdirSync(pastaQuadros, { recursive: true });
  const brutos = [];
  const parar = sessao.onEvento((m) => {
    if (m.method !== 'Page.screencastFrame') return;
    brutos.push({ base64: m.params.data, ts: m.params.metadata.timestamp });
    sessao.send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
  });
  await sessao.send('Page.startScreencast', {
    format: 'png', everyNthFrame: 1, maxWidth: largura, maxHeight: altura,
  });
  sessao.marcarGravando?.(true); // o vigia da aba intrusa (C5) espera a gravação acabar
  try {
    await executar();
  } finally {
    sessao.marcarGravando?.(false);
    await sessao.send('Page.stopScreencast');
    parar();
  }
  return brutos.map(({ base64, ts }, i) => {
    const arquivo = resolve(pastaQuadros, `q${String(i).padStart(4, '0')}.png`);
    writeFileSync(arquivo, Buffer.from(base64, 'base64'));
    return { arquivo, ts };
  });
}

/** concat do ffmpeg com a duração REAL de cada quadro (nunca esticada) —
 *  o truque do último arquivo repetido sem `duration` é o jeito
 *  documentado do próprio ffmpeg de não perder a duração do quadro
 *  final. */
function renderizarClipe(quadros, destinoFinal) {
  if (quadros.length < 2) {
    throw new Error(`poucos quadros para um clipe (${quadros.length})`);
  }
  const arquivoLista = resolve(dirname(quadros[0].arquivo), 'lista.txt');
  const linhas = [];
  for (let i = 0; i < quadros.length; i++) {
    const dur = i < quadros.length - 1
      ? Math.max(0.001, quadros[i + 1].ts - quadros[i].ts)
      : Math.max(0.001, quadros[i].ts - quadros[i - 1].ts);
    linhas.push(`file '${quadros[i].arquivo}'`);
    linhas.push(`duration ${dur.toFixed(3)}`);
  }
  linhas.push(`file '${quadros[quadros.length - 1].arquivo}'`);
  writeFileSync(arquivoLista, `${linhas.join('\n')}\n`);
  const destino = semSobrescrever(destinoFinal);
  const r = spawnSync(FFMPEG, [
    '-y', '-f', 'concat', '-safe', '0', '-i', arquivoLista,
    // FORÇA PAR (`trunc(iw/2)*2`) — os quadros saem do tamanho real do
    // viewport (`--janela`/`--telefone`, nunca esticados pelo `maxWidth`
    // do screencast), e um viewport de largura ÍMPAR (761px, M4a, a
    // fronteira 760/761) faz o `libx264` recusar o encoder ("Could not
    // open encoder"), igual ao achado antigo da barra de abas no
    // cabeçalho deste arquivo. Em toda largura/altura PAR de sempre isto
    // é identidade (`trunc(x/2)*2 === x`) — nenhum clipe existente muda.
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-vsync', 'vfr', '-pix_fmt', 'yuv420p', destino,
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  return destino;
}

/** UMA FOLHA DE CONTATO (grade de miniaturas) do clipe LENTO, para
 *  inspeção humana sem abrir o vídeo — `fps` é CALCULADO, não fixo, para
 *  que os 5×4 = 20 quadros do `tile` cubram o clipe INTEIRO: um `fps=4`
 *  fixo (o exemplo do enunciado) só cobriria os primeiros 5 s de um
 *  clipe de dezenas de segundos, que é exatamente o tamanho de uma
 *  gravação ×6. A margem de +2 quadros evita que o `tile` fique um
 *  quadro curto por arredondamento (ffmpeg não completa a grade sem
 *  entrada suficiente). */
function renderizarContato(clipe, duracaoSegundos, destinoFinal) {
  const QUADROS_DA_GRADE = 20; // tile=5x4
  const fps = (QUADROS_DA_GRADE + 2) / Math.max(duracaoSegundos, 1);
  const destino = semSobrescrever(destinoFinal);
  const r = spawnSync(FFMPEG, [
    '-y', '-i', clipe,
    '-vf', `fps=${fps.toFixed(4)},scale=480:-1,tile=5x4`,
    '-frames:v', '1',
    destino,
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg (folha de contato) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  return destino;
}

/**
 * `--sequencia` (C3, docs/PLANO-MOTION-UI.md linha 511) — UM fluxo
 * contínuo (busca → ficha → seção → copiar link → tempo) em vez das seis
 * provas isoladas de sempre, gravado duas vezes: em velocidade normal (o
 * clipe de aceite, e a corrida que registra as checagens de DOM) e em
 * câmera lenta (os seis tokens de deslocamento ×6 em `.hud-root`, só
 * para o olho humano inspecionar quadro a quadro — os mesmos gestos não
 * mudam o que fica verdadeiro no DOM, só a velocidade da transição).
 * O MESMO `executarFluxo` roda as duas vezes; só `fatorEspera` muda, para
 * as esperas acompanharem as transições ×6 sem apressar a segunda
 * gravação nem inventar um segundo fluxo para manter igual ao primeiro.
 */
async function rodarSequencia() {
  mkdirSync(CAPTURAS, { recursive: true });
  const pastaNormal = resolve(tmpdir(), `sonda-motion-seq-${process.pid}`);
  const pastaLenta = resolve(tmpdir(), `sonda-motion-seq-lenta-${process.pid}`);
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: JANELA, prefixo: 'sonda-motion-seq' });
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    });
    // SEM ISTO o Chrome recusa `navigator.clipboard.writeText` em
    // automação — "Copiar link deste instante" falharia sempre, e o anel
    // de sucesso (`.realce-anel`) nunca acenderia para a sonda ver.
    await sessao.send('Browser.grantPermissions', {
      origin: APP,
      permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
    });
    const versaoChrome = await sessao.send('Browser.getVersion');

    const carregarApp = async () => {
      let assentou = null;
      let ultimoErro = null;
      for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
        try {
          assentou = await sessao.ir(QUERY);
        } catch (e) {
          ultimoErro = e;
          process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
          await dorme(500);
        }
      }
      if (!assentou) throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_GATILHO}'))`, 10000);
      await pularTour(sessao);
      await dorme(300);
    };

    await carregarApp();

    // OS SEIS TOKENS ×6 (só na segunda gravação) — lidos do COMPUTADO em
    // `.hud-root` e escritos de volta por `style` (especificidade maior
    // que a declaração de `:root`, então vence sem tocar no CSS). Nunca
    // hardcoded: os valores-base acabaram de mudar de mão nesta mesma
    // rodada (C3e, `--t-pressao` deixou de ser `transform` e virou
    // `scale`, mas o NÚMERO do token não mudou — mesmo assim, ler é mais
    // barato que confiar em memorizar).
    const desacelerar = () => sessao.js(`(() => {
      const raiz = document.querySelector('.hud-root') || document.documentElement;
      const cs = getComputedStyle(raiz);
      const tokens = ${JSON.stringify(TOKENS_LENTOS)};
      for (const tok of tokens) {
        const atual = cs.getPropertyValue(tok).trim();
        const n = Number.parseFloat(atual);
        if (Number.isNaN(n)) continue;
        const unidade = atual.slice(String(n).length) || 'ms';
        raiz.style.setProperty(tok, (n * 6) + unidade);
      }
      return true;
    })()`);

    const checagens = {};

    /**
     * O FLUXO ÚNICO (C3) — as seis paradas do enunciado, na ordem. Só as
     * esperas escalam com `fatorEspera` (1× na gravação normal, 6× na
     * lenta); os cliques e a digitação não precisam de régua própria
     * porque `esperarPor` já espera o DOM confirmar — o que muda de
     * velocidade é só quanto tempo aquele poll pode levar antes do teto.
     * `registrar` grava em `checagens` só na corrida normal: a lenta
     * repete os MESMOS gestos (é por isso que existe), então checar de
     * novo só re-confirmaria o que a primeira já viu.
     */
    const executarFluxo = async ({ fatorEspera, registrar }) => {
      const pausa = (ms) => dorme(ms * fatorEspera);
      const teto = (ms) => ms * fatorEspera + 2000;
      const guardar = (chave, valor) => { if (registrar) checagens[chave] = valor; };

      // 1) BUSCAR SATURNO — "sat" mostra resultado de verdade, "zzqq"
      // mostra o vazio (uma vez, per enunciado), "saturno" + Enter
      // confirma e abre a ficha.
      await clicarReal(sessao, SEL_BUSCA_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_BUSCA_PAINEL}'))`, teto(3000));
      await digitarTexto(sessao, 'sat');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'resultados'`,
        teto(2000)
      );
      for (let i = 0; i < 3; i++) await pressionarTecla(sessao, 'Backspace');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'destinos'`,
        teto(2000)
      );
      await digitarTexto(sessao, 'zzqq');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'vazio'`,
        teto(2000)
      );
      guardar('buscaSemResultado', true);
      for (let i = 0; i < 4; i++) await pressionarTecla(sessao, 'Backspace');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'destinos'`,
        teto(2000)
      );
      await digitarTexto(sessao, 'saturno');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'resultados'`,
        teto(2000)
      );
      await pausa(300);
      await pressionarTecla(sessao, 'Enter');
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_FICHA_PAINEL}'))`, teto(5000));
      await pausa(300);

      // 2) ESCOLHER JÚPITER DA MESMA FORMA — troca de verdade: é aqui que
      // o nome e o trecho de contexto confirmam com `.realce-texto`
      // (a primeira escolha, acima, nasce sem "de onde trocar").
      await clicarReal(sessao, SEL_BUSCA_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_BUSCA_PAINEL}'))`, teto(3000));
      await digitarTexto(sessao, 'jupiter');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'resultados'`,
        teto(2000)
      );
      await pausa(300);
      await pressionarTecla(sessao, 'Enter');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('.atlas-ficha-nome > span')?.className.includes('realce-texto') === true`,
        teto(5000)
      );
      guardar('nomeRealceTexto', await sessao.js(
        `document.querySelector('.atlas-ficha-nome > span')?.className.includes('realce-texto') ?? null`
      ));
      guardar('contextoRealceTexto', await sessao.js(
        `document.querySelector('.atlas-contexto-alvo > span')?.className.includes('realce-texto') ?? null`
      ));

      // 3) ABRIR UMA SEÇÃO FECHADA DA FICHA — a seta gira 0→90°; o Tab
      // (6, "o teclado também funciona") entra aqui, sempre, mesmo se
      // por acaso não houver seção fechada para abrir.
      const idSecaoFechada = await sessao.js(
        `document.querySelector('.atlas-ficha-titulo button[aria-expanded="false"]')?.getAttribute('aria-controls') ?? null`
      );
      if (idSecaoFechada) {
        await clicarReal(sessao, '.atlas-ficha-titulo button[aria-expanded="false"]');
      }
      await pressionarTecla(sessao, 'Tab');
      if (idSecaoFechada) {
        await esperarPor(
          { js: sessao.js },
          `document.querySelector('.atlas-ficha-titulo button[aria-controls="${idSecaoFechada}"]')?.getAttribute('aria-expanded') === 'true'`,
          teto(3000)
        );
        await pausa(200);
        guardar('secaoAberta', await sessao.js(`(() => {
          const b = document.querySelector('.atlas-ficha-titulo button[aria-controls="${idSecaoFechada}"]');
          if (!b) return null;
          const seta = b.querySelector('.atlas-ficha-seta');
          return { expandida: b.getAttribute('aria-expanded'), rotate: seta ? getComputedStyle(seta).rotate : null };
        })()`));
      } else {
        guardar('secaoAberta', null);
      }

      // 4) AJUSTES → "Copiar link deste instante" — sucesso acende o
      // anel. `.ajustes-acoes > .ajustes-copiar` (filho DIRETO) e não só
      // `.ajustes-copiar`: "Rever o convite" é a MESMA classe, mas mora
      // um nível mais fundo (`.ajustes-item.ajustes-acao`), e no Atlas
      // (`onReverConvite` também vive ali) o `querySelector` acharia ele
      // primeiro.
      await clicarReal(sessao, SEL_AJUSTES_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_AJUSTES_PAINEL}'))`, teto(3000));
      await pausa(200);
      await clicarReal(sessao, '.ajustes-acoes > .ajustes-copiar');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('.ajustes-copiar .realce-anel') !== null`,
        teto(3000)
      );
      guardar('copiarAnel', await sessao.js(`document.querySelector('.ajustes-copiar .realce-anel') !== null`));
      guardar('copiarEstado', await sessao.js(
        `document.querySelector('.ajustes-copiar-estado')?.textContent ?? null`
      ));

      // 5) FECHAR COM ESC; PASSAR O MOUSE NA MÁQUINA DO TEMPO, AVANÇAR,
      // TROCAR A VELOCIDADE E VOLTAR AO VIVO (se o botão existir).
      const dataAntes = await sessao.js(
        `document.querySelector('.atlas-tempo-data')?.getBoundingClientRect().top ?? null`
      );
      await pressionarEscape(sessao);
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_AJUSTES_PAINEL}') === null`,
        teto(3000)
      );
      const linhaDoTempo = await retanguloDe(sessao, '.atlas-tempo');
      if (linhaDoTempo) {
        await moverMouse(sessao, linhaDoTempo.x + linhaDoTempo.width / 2, linhaDoTempo.y + linhaDoTempo.height / 2);
        await esperarPor(
          { js: sessao.js },
          `getComputedStyle(document.querySelector('.atlas-tempo-botoes')).opacity === '1'`,
          teto(3000)
        );
      }
      const dataDepois = await sessao.js(
        `document.querySelector('.atlas-tempo-data')?.getBoundingClientRect().top ?? null`
      );
      guardar('linhaDaData', { antes: dataAntes, depois: dataDepois });

      await clicarNaExpressao(sessao, jsBotaoDoTempo(0, 2), 'o botão "avançar no tempo"');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('.atlas-tempo-nudge-futuro') !== null`,
        teto(3000)
      );
      guardar('avancarNudge', await sessao.js(`document.querySelector('.atlas-tempo-nudge-futuro') !== null`));

      await clicarReal(sessao, '.atlas-tempo-taxa');
      await pausa(300);

      const aoVivoExiste = await sessao.js(`Boolean(${jsBotaoDoTempo(2, 0)})`);
      if (aoVivoExiste) {
        await clicarNaExpressao(sessao, jsBotaoDoTempo(2, 0), 'o botão "ao vivo"');
        await pausa(300);
      }
    };

    // (a) VELOCIDADE NORMAL — o clipe de aceite, e a corrida que registra
    // as checagens de DOM.
    const quadrosNormais = await gravarClipe(
      sessao,
      { largura: JANELA_W, altura: JANELA_H, pastaQuadros: pastaNormal },
      () => executarFluxo({ fatorEspera: 1, registrar: true })
    );
    const clipeNormal = renderizarClipe(quadrosNormais, resolve(CAPTURAS, `motion-c3-sequencia-${commit}.mp4`));

    // (b) CÂMERA LENTA — reabre do zero (o estado de busca/ficha/ajustes
    // do passo anterior não importa aqui) e só ENTÃO desacelera os seis
    // tokens: desacelerar ANTES da carga trocaria também a entrada do
    // painel inicial, que ninguém pediu para ver lenta.
    await carregarApp();
    await desacelerar();
    const quadrosLentos = await gravarClipe(
      sessao,
      { largura: JANELA_W, altura: JANELA_H, pastaQuadros: pastaLenta },
      () => executarFluxo({ fatorEspera: 6, registrar: false })
    );
    const clipeLento = renderizarClipe(
      quadrosLentos,
      resolve(CAPTURAS, `motion-c3-sequencia-lenta-${commit}.mp4`)
    );
    const duracaoLenta = quadrosLentos[quadrosLentos.length - 1].ts - quadrosLentos[0].ts;
    const folha = renderizarContato(
      clipeLento,
      duracaoLenta,
      resolve(CAPTURAS, `motion-c3-folha-${commit}.png`)
    );

    const relatorio = {
      meta: {
        commit, dirty, appCommit: APP_COMMIT, chrome: versaoChrome.product, app: APP, query: QUERY,
        viewport: { width: JANELA_W, height: JANELA_H }, dpr: DPR,
        geradoEm: new Date().toISOString(),
      },
      checagens,
      clipeNormal, clipeLento, folha,
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c3-sequencia-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    const linhas = [
      `=== sonda-motion c3 sequência — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} ===`,
      `clipe normal: ${clipeNormal} (${quadrosNormais.length} quadros)`,
      `clipe lento: ${clipeLento} (${quadrosLentos.length} quadros, ${duracaoLenta.toFixed(1)}s)`,
      `folha de contato: ${folha}`,
      `busca "zzqq" mostrou vazio: ${checagens.buscaSemResultado === true}`,
      `nome (Saturno→Júpiter) ganhou .realce-texto: ${checagens.nomeRealceTexto === true}`,
      `trecho de contexto ganhou .realce-texto: ${checagens.contextoRealceTexto === true}`,
      `seção da ficha: aria-expanded=${checagens.secaoAberta?.expandida ?? '?'} rotate=${checagens.secaoAberta?.rotate ?? '?'}`,
      `copiar link: anel=${checagens.copiarAnel === true} estado="${checagens.copiarEstado ?? ''}"`,
      `"Avançar no tempo" ganhou a classe de nudge: ${checagens.avancarNudge === true}`,
      `linha da data: topo ${checagens.linhaDaData?.antes ?? '?'} → ${checagens.linhaDaData?.depois ?? '?'}`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    rmSync(pastaNormal, { recursive: true, force: true });
    rmSync(pastaLenta, { recursive: true, force: true });
  }
}

/**
 * um QUADRO de verdade — o duplo rAF garante que o quadro atual já foi
 * pintado antes de resolver (o primeiro rAF ainda é DESTE quadro, o
 * segundo já é do PRÓXIMO). É o ritmo do dedo em `--folha` (um
 * `touchMove` por quadro entre as amostras, nunca um atraso torcido
 * para o veredito passar) e, em `--interrupcoes`, a espera depois de
 * cada restauração de viewport, antes do próximo clique.
 */
async function esperarQuadro(sessao) {
  return sessao.send('Runtime.evaluate', {
    expression: 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))',
    awaitPromise: true,
    returnByValue: true,
  });
}

/**
 * `--interrupcoes` — CINCO cenários de INTERROMPER um movimento no meio
 * (I1–I5, o complemento de C1/C2/C3: aquelas provas rodam o gesto
 * inteiro sem cutucar no meio, estas cutucam de propósito). Cada
 * cenário tem o seu próprio `t0` e usa `amostrarSequencia` para o
 * `dtMs` REAL — o mesmo padrão de `rodarSequencia`, só que sem um fluxo
 * único: os cinco são independentes, e cada um decide sozinho se PASSA
 * ou FALHA a partir dos números medidos, sem espera extra para o
 * veredito bater.
 */
async function rodarInterrupcoes() {
  mkdirSync(CAPTURAS, { recursive: true });
  const pastaSanfona = resolve(tmpdir(), `sonda-motion-int-sanfona-${process.pid}`);
  const pastaTempo = resolve(tmpdir(), `sonda-motion-int-tempo-${process.pid}`);
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: JANELA, prefixo: 'sonda-motion-int' });
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    });
    const versaoChrome = await sessao.send('Browser.getVersion');

    // NAVEGAÇÃO com até 3 tentativas — mesma régua do bloco padrão
    // (abaixo de `if (!SEQUENCIA)`): "Chrome não sobe" e "app não
    // carrega" são achados que se reportam, não se escondem num loop.
    let assentou = null;
    let ultimoErro = null;
    for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
      try {
        assentou = await sessao.ir(QUERY);
      } catch (e) {
        ultimoErro = e;
        process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
        await dorme(500);
      }
    }
    if (!assentou) throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
    process.stdout.write(`app assentou por "${assentou.via}" em ${assentou.ms}ms\n`);
    await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_GATILHO}'))`, 10000);
    await pularTour(sessao);
    await dorme(300);

    const dpr = await sessao.js('window.devicePixelRatio');

    // espera até `t0 + alvoMs` (nunca negativo) — o mesmo cálculo que
    // `amostrarSequencia` já faz por amostra, aqui isolado porque estes
    // cenários intercalam UMA AÇÃO (o clique, o resize, o "reduzir
    // movimento") entre amostras, e não só amostras em fila.
    const esperarAte = async (t0, alvoMs) => {
      const resta = alvoMs - (Date.now() - t0);
      if (resta > 0) await dorme(resta);
    };
    // depois de CADA restauração de viewport (I3a/I3b/I3c/I4, sempre de
    // volta para `JANELA_W`×`JANELA_H`): sem isto o resize de uma
    // restauração podia chegar DEPOIS do clique do PRÓXIMO caso e
    // assentar a entrada dele antes de a sonda agir (I3b saiu
    // INCONCLUSIVO numa rodada por isto) — espera a PRÓPRIA página
    // confirmar o tamanho, não um `dorme` de prazo fixo, e mais dois
    // quadros de sobra.
    const esperarRestaurar = async () => {
      await esperarPor(
        { js: sessao.js },
        `window.innerWidth === ${JANELA_W} && window.innerHeight === ${JANELA_H}`,
        2000
      );
      await esperarQuadro(sessao);
      await esperarQuadro(sessao);
    };
    // "a entrada assentou" — `transform: none` (CSS) OU a WAAPI vazia ou
    // toda `finished` (o dono do movimento desde o C1, `movimentoDaGaveta.ts`)
    // — nunca `existe === false`, que aqui é falha (um painel que estava
    // ENTRANDO tem de existir).
    const emRepouso = (amostra) => {
      if (amostra.existe === false) return false;
      if (amostra.transform === 'none') return true;
      return (amostra.waapi ?? []).length === 0 || amostra.waapi.every((w) => w.playState === 'finished');
    };

    // ---------------------------------------------------------------
    // I1 — a sanfona "Avançado": fechar no meio de uma ABERTURA e
    // REABRIR no meio de um FECHAMENTO (o `abrindo`/`saindo` que
    // convivem, comentário de `usePresenca.ts`). O corte
    // (`overflow: hidden` do `.sanfona-miolo`) só pode existir ENQUANTO
    // anima — em repouso, aberta OU fechada, tem de sumir.
    // ---------------------------------------------------------------
    await clicarReal(sessao, SEL_AJUSTES_GATILHO);
    await dorme(400);
    await clicarReal(sessao, SEL_AVANCADO_GATILHO); // abre
    // O REPOUSO É UM ESTADO, NÃO UM INSTANTE (doutrina de `esperarPor`):
    // no Edge (12/09) a dobra começou tarde e aos 400 ms a caixa ainda
    // estava a 3 px do fim, cortada — e a sonda chamava aquilo de
    // "repouso com corte". Espera a sanfona sem animação viva e na
    // altura cheia; o estouro (3 s) reprova pelo próprio `esperarPor`.
    await esperarSanfonaEmRepouso(sessao);
    const i1RepousoAberta = await sessao.js(jsAmostraSanfona());

    const t0Fechar1 = Date.now();
    await clicarReal(sessao, SEL_AVANCADO_GATILHO); // fecha, sem interromper
    const i1Fechar1 = await amostrarSequencia(sessao, t0Fechar1, [20, 80, 150], jsAmostraSanfona);
    await dorme(400); // assenta fechada antes do gesto que entra no clipe

    let i1Aos20 = null;
    let i1Reentrada = [];
    const quadrosSanfona = await gravarClipe(
      sessao,
      { largura: JANELA_W, altura: JANELA_H, pastaQuadros: pastaSanfona },
      async () => {
        await clicarReal(sessao, SEL_AVANCADO_GATILHO); // abre de novo
        await dorme(400);
        const t0Fechar2 = Date.now();
        await clicarReal(sessao, SEL_AVANCADO_GATILHO); // fecha de novo
        // aos 20ms a reabertura (60ms) ainda não aconteceu — esta
        // amostra tem de sair ANTES do clique, senão mede o efeito
        // errado.
        await esperarAte(t0Fechar2, 20);
        i1Aos20 = { alvoMs: 20, dtMs: Date.now() - t0Fechar2, ...(await sessao.js(jsAmostraSanfona())) };
        await esperarAte(t0Fechar2, 60);
        await clicarReal(sessao, SEL_AVANCADO_GATILHO); // reabre NO MEIO da saída
        i1Reentrada = await amostrarSequencia(sessao, t0Fechar2, [100, 400], jsAmostraSanfona);
      }
    );
    const clipeSanfona = renderizarClipe(quadrosSanfona, resolve(CAPTURAS, `motion-interrupcoes-sanfona-${commit}.mp4`));
    const duracaoSanfona = quadrosSanfona[quadrosSanfona.length - 1].ts - quadrosSanfona[0].ts;
    const folhaSanfona = renderizarContato(
      clipeSanfona,
      duracaoSanfona,
      resolve(CAPTURAS, `motion-interrupcoes-sanfona-${commit}.png`)
    );

    // O REPOUSO DEPOIS DA REABERTURA é lido quando a gravação já parou e o
    // clipe já foi montado — a animação (--t-entrada) acabou há muito; é
    // uma amostra de repouso, não uma espera para o veredito passar
    await esperarSanfonaEmRepouso(sessao);
    const i1RepousoReaberta = await sessao.js(jsAmostraSanfona());
    // cada amostra é julgada pelo PRÓPRIO estado (`sanfonaAnimando`):
    // animando → corte ligado; em repouso → corte desligado
    const i1Amostras = [...i1Fechar1, i1Aos20, ...i1Reentrada].filter((a) => a?.existe);
    const i1AnimandoEscondeu = i1Amostras
      .filter(sanfonaAnimando)
      .every((a) => a.overflow === 'hidden');
    const i1RepousoVisivel = [i1RepousoAberta, i1RepousoReaberta, ...i1Amostras.filter((a) => !sanfonaAnimando(a))]
      .every((a) => !a.existe || a.overflow === 'visible');
    const i1ReabriuDeVerdade = i1RepousoReaberta.existe && !sanfonaAnimando(i1RepousoReaberta);
    const i1Passa = i1AnimandoEscondeu && i1RepousoVisivel && i1ReabriuDeVerdade;

    // fecha os Ajustes antes do I2 (deixa o app limpo para o próximo gesto)
    await pressionarEscape(sessao);
    await dorme(400);

    // ---------------------------------------------------------------
    // I2 — "reduzir movimento" ligado NO MEIO da transição: painel
    // saindo, painel entrando, linha do tempo entrando. Ligar
    // `prefers-reduced-motion: reduce` no meio tem de travar o
    // movimento EM CURSO, não só bloquear o próximo. Julgado pelo que a
    // PRÓPRIA página viu (`observarAposEvento`), nunca por +10/+60ms
    // fixos — o evento `change` da media query só chega no quadro
    // seguinte ao comando, e nem sempre no mesmo tempo de parede.
    // ---------------------------------------------------------------
    const ligarReduzido = () => sessao.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    const desligarReduzido = () => sessao.send('Emulation.setEmulatedMedia', { features: [] });

    // A MESMA régua para os seis casos de I2/I3 (saída, entrada, linha
    // do tempo) — só o "assentou?" (`assentouAgora`) muda por `tipo`.
    // INCONCLUSIVO quando o evento não chegou, quando não havia nada
    // rodando ANTES do comando para interromper, ou quando o
    // `restanteNaturalMs` (quanto faltava, pelo relógio da PÁGINA, para
    // a animação em curso acabar sozinha, contado do instante do
    // evento) já era <= 0 ou só foi coberto DEPOIS dele — nesses casos a
    // amostra não prova que o comando interrompeu coisa nenhuma. PASSA
    // exige o assentamento dentro de 3 quadros do evento E antes desse
    // `restanteNaturalMs`; senão, FALHA.
    const julgarInterrupcao = async (tipo, opcoes, agir, gatilho) => {
      const obs = await observarAposEvento(sessao, opcoes, agir);
      const base = {
        evento: { chegou: obs.chegou, msAntesAteEvento: obs.msAntesAteEvento },
        antesDoComando: obs.antesDoComando,
        amostras: obs.amostras,
      };
      const inconclusivo = (restanteNaturalMs = null, amostra = null) => ({
        ...base,
        assentouNoQuadro: amostra?.quadro ?? null,
        msAteAssentar: amostra?.msAposEvento ?? null,
        restanteNaturalMs,
        veredito: 'INCONCLUSIVO',
      });
      if (!obs.chegou) return inconclusivo();
      const emCurso = (obs.antesDoComando.waapi ?? []).find((w) => w.playState === 'running');
      if (!emCurso) return inconclusivo();
      const restanteNaturalMs = (emCurso.duration ?? 0) - (emCurso.currentTime ?? 0) - obs.msAntesAteEvento;
      if (restanteNaturalMs <= 0) return inconclusivo(restanteNaturalMs);

      const assentouAgora = (a) => {
        if (tipo === 'saida') return a.existe === false && (!gatilho || a.active?.gatilho === gatilho);
        if (tipo === 'entrada') return emRepouso(a);
        return a.transform === 'none' && (a.waapi ?? []).every((w) => w.playState !== 'running');
      };
      const primeiro = obs.amostras.find(assentouAgora);
      if (!primeiro) {
        return { ...base, assentouNoQuadro: null, msAteAssentar: null, restanteNaturalMs, veredito: 'FALHA' };
      }
      if (primeiro.msAposEvento >= restanteNaturalMs) return inconclusivo(restanteNaturalMs, primeiro);

      return {
        ...base,
        assentouNoQuadro: primeiro.quadro,
        msAteAssentar: primeiro.msAposEvento,
        restanteNaturalMs,
        veredito: primeiro.quadro <= 3 ? 'PASSA' : 'FALHA',
      };
    };
    // (a) painel SAINDO
    await clicarReal(sessao, SEL_CAMADAS_GATILHO);
    await dorme(400);
    const t0I2a = Date.now();
    await clicarReal(sessao, `${SEL_CAMADAS_PAINEL} .hud-fechar`);
    await esperarAte(t0I2a, 40);
    const i2a = await julgarInterrupcao(
      'saida',
      { evento: 'reduzido', construirAmostra: () => jsAmostraPainel(SEL_CAMADAS_PAINEL) },
      ligarReduzido,
      'camadas'
    );
    await desligarReduzido();
    await dorme(300);

    // (b) painel ENTRANDO
    const t0I2b = Date.now();
    await clicarReal(sessao, SEL_CAMADAS_GATILHO);
    await esperarAte(t0I2b, 40);
    const i2b = await julgarInterrupcao(
      'entrada',
      { evento: 'reduzido', construirAmostra: () => jsAmostraPainel(SEL_CAMADAS_PAINEL) },
      ligarReduzido
    );
    await desligarReduzido();
    await pressionarEscape(sessao);
    await dorme(400);

    // (c) linha do tempo ENTRANDO (hover)
    const rectCabecalhoI2 = await retanguloDe(sessao, SEL_TEMPO_CABECALHO);
    const t0I2c = Date.now();
    await moverMouse(sessao, rectCabecalhoI2.x + rectCabecalhoI2.width / 2, rectCabecalhoI2.y + rectCabecalhoI2.height / 2);
    await esperarAte(t0I2c, 40);
    const i2c = await julgarInterrupcao(
      'tempo',
      { evento: 'reduzido', construirAmostra: jsTransformDaLinhaDoTempo },
      ligarReduzido
    );
    await desligarReduzido();
    await moverMouse(sessao, 10, 10);
    await dorme(1000);

    const i2Veredito = combinarVereditos([i2a.veredito, i2b.veredito, i2c.veredito]);

    // ---------------------------------------------------------------
    // I3 — redimensionar a janela NO MEIO de uma transição, sem cruzar
    // os 760px do ponto de quebra do celular — a mesma guarda de
    // "reduzir movimento" (I2) vale para resize: as duas são formas de
    // "o navegador decidiu que este movimento não vai terminar como
    // começou". Julgado pela MESMA régua de I2 (`julgarInterrupcao`),
    // com o evento `resize` no lugar do `change` da media query.
    // ---------------------------------------------------------------
    // OUTRO TAMANHO DE MESA (a/b) — DERIVADO de `--janela`, nunca um
    // literal absoluto: um delta fixo (p.ex. -160px) cruzaria os 760px
    // se `--janela` já abrir perto da fronteira (M4a, 761×800); o
    // `Math.max` mantém mesa dos dois lados, qualquer que seja a base.
    const outraMesaA = { w: Math.max(JANELA_W - 160, 900), h: Math.max(JANELA_H - 100, 600) };
    const outraMesaB = { w: Math.max(JANELA_W - 140, 900), h: Math.max(JANELA_H - 50, 600) };

    // (a) mesa, painel SAINDO
    await clicarReal(sessao, SEL_CAMADAS_GATILHO);
    await dorme(400);
    const t0I3a = Date.now();
    await clicarReal(sessao, `${SEL_CAMADAS_PAINEL} .hud-fechar`);
    await esperarAte(t0I3a, 40);
    const i3a = await julgarInterrupcao(
      'saida',
      { evento: 'resize', construirAmostra: () => jsAmostraPainel(SEL_CAMADAS_PAINEL) },
      () => sessao.send('Emulation.setDeviceMetricsOverride', {
        width: outraMesaA.w, height: outraMesaA.h, deviceScaleFactor: DPR, mobile: false,
      })
    );
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    });
    await esperarRestaurar();

    // (b) mesa, painel ENTRANDO
    const t0I3b = Date.now();
    await clicarReal(sessao, SEL_CAMADAS_GATILHO);
    await esperarAte(t0I3b, 40);
    const i3b = await julgarInterrupcao(
      'entrada',
      { evento: 'resize', construirAmostra: () => jsAmostraPainel(SEL_CAMADAS_PAINEL) },
      () => sessao.send('Emulation.setDeviceMetricsOverride', {
        width: outraMesaB.w, height: outraMesaB.h, deviceScaleFactor: DPR, mobile: false,
      })
    );
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    });
    await esperarRestaurar();
    await pressionarEscape(sessao);
    await dorme(400);

    // (c) celular, painel SAINDO — só a ALTURA muda (844→700): a
    // LARGURA (390) nunca cruza os 760px que definem o layout de
    // celular.
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: TELEFONE_W, height: TELEFONE_H, deviceScaleFactor: DPR, mobile: true,
    });
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await dorme(300);
    await sessao.js(`document.querySelector('${SEL_CAMADAS_GATILHO}').click()`);
    await dorme(400);
    const t0I3c = Date.now();
    await sessao.js(`(() => {
      const b = document.querySelector('${SEL_CAMADAS_PAINEL} .hud-fechar');
      if (b) b.click();
      return Boolean(b);
    })()`);
    await esperarAte(t0I3c, 40);
    const i3c = await julgarInterrupcao(
      'saida',
      { evento: 'resize', construirAmostra: () => jsAmostraPainel(SEL_CAMADAS_PAINEL) },
      () => sessao.send('Emulation.setDeviceMetricsOverride', {
        width: TELEFONE_W, height: Math.max(TELEFONE_H - 144, 300), deviceScaleFactor: DPR, mobile: true,
      })
    );
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    });
    await esperarRestaurar();
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: false });

    const i3Veredito = combinarVereditos([i3a.veredito, i3b.veredito, i3c.veredito]);

    // ---------------------------------------------------------------
    // I4 — a linha do tempo depois de UM REDIMENSIONAMENTO (mesa): não
    // pode saltar de onde estava — o FLIP de `HudDoAtlas.tsx` tem de
    // repartir do topo medido DEPOIS do resize, não de um "antes" que já
    // não existe.
    // ---------------------------------------------------------------
    const rectCabecalhoI4a = await retanguloDe(sessao, SEL_TEMPO_CABECALHO);
    await moverMouse(
      sessao,
      rectCabecalhoI4a.x + rectCabecalhoI4a.width / 2,
      rectCabecalhoI4a.y + rectCabecalhoI4a.height / 2
    );
    await dorme(700); // abre — garante fechada-depois-aberta, não confia no estado anterior
    await moverMouse(sessao, 10, 10);
    await dorme(1000); // fecha (o respiro de ~350ms, com folga)

    // SÓ A ALTURA muda (I4 é sobre redimensionamento vertical) — a
    // LARGURA fica igual a `--janela`, nunca cruzando fronteira nenhuma.
    const alturaI4 = Math.max(JANELA_H - 140, 400);
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: alturaI4, deviceScaleFactor: DPR, mobile: false,
    });
    await dorme(400);
    const y0I4 = await sessao.js(
      `document.querySelector('${SEL_TEMPO_LINHA}')?.getBoundingClientRect().y ?? null`
    );

    let i4Amostras = [];
    const rectCabecalhoI4b = await retanguloDe(sessao, SEL_TEMPO_CABECALHO);
    const quadrosTempo = await gravarClipe(
      sessao,
      { largura: JANELA_W, altura: alturaI4, pastaQuadros: pastaTempo },
      async () => {
        const t0I4 = Date.now();
        await moverMouse(
          sessao,
          rectCabecalhoI4b.x + rectCabecalhoI4b.width / 2,
          rectCabecalhoI4b.y + rectCabecalhoI4b.height / 2
        );
        i4Amostras = await amostrarSequencia(sessao, t0I4, [15, 60, 150, 450], jsYDaLinhaDoTempo);
      }
    );
    const clipeTempo = renderizarClipe(quadrosTempo, resolve(CAPTURAS, `motion-interrupcoes-tempo-${commit}.mp4`));

    const y15 = i4Amostras.find((a) => a.alvoMs === 15)?.y ?? null;
    const y450 = i4Amostras.find((a) => a.alvoMs === 450)?.y ?? null;
    const i4SemSalto = y0I4 !== null && y15 !== null && Math.abs(y15 - y0I4) <= 8;
    const i4Assentou = y0I4 !== null && y450 !== null && y450 < y0I4;
    const i4Passa = i4SemSalto && i4Assentou;

    await moverMouse(sessao, 10, 10);
    await dorme(1000);
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    });
    await esperarRestaurar();

    // ---------------------------------------------------------------
    // I5 — interromper a PRÓPRIA linha do tempo com um Esc: clicar trava
    // aberta (`alternarPresa`), o Esc solta as três travas de uma vez
    // (`presa`/`hover`/`foco`, `HudDoAtlas.tsx`) — não pode saltar na
    // volta nem ficar presa aberta.
    // ---------------------------------------------------------------
    await moverMouse(sessao, 10, 10);
    await dorme(500); // garante fechada antes de medir o repouso de referência
    const yRepousoFechadaI5 = await sessao.js(
      `document.querySelector('${SEL_TEMPO_LINHA}')?.getBoundingClientRect().y ?? null`
    );

    const t0I5 = Date.now();
    await clicarReal(sessao, SEL_TEMPO_CABECALHO); // trava aberta
    await esperarAte(t0I5, 80);
    const yPreI5 = await sessao.js(
      `document.querySelector('${SEL_TEMPO_LINHA}')?.getBoundingClientRect().y ?? null`
    );
    const t1I5 = Date.now();
    await pressionarEscape(sessao);
    const i5Amostras = await amostrarSequencia(sessao, t1I5, [15, 500], jsYDaLinhaDoTempo);
    const yPostI5 = i5Amostras.find((a) => a.alvoMs === 15)?.y ?? null;
    const y500I5 = i5Amostras.find((a) => a.alvoMs === 500)?.y ?? null;
    const i5SemSalto = yPreI5 !== null && yPostI5 !== null && Math.abs(yPostI5 - yPreI5) <= 12;
    const i5Assentou =
      y500I5 !== null && yRepousoFechadaI5 !== null && Math.abs(y500I5 - yRepousoFechadaI5) <= 8;
    const i5Passa = i5SemSalto && i5Assentou;

    // ---------------------------------------------------------------
    // RELATÓRIO
    // ---------------------------------------------------------------
    const relatorio = {
      meta: {
        commit, dirty, appCommit: APP_COMMIT, chrome: versaoChrome.product, app: APP, query: QUERY,
        viewport: { width: JANELA_W, height: JANELA_H }, dpr, geradoEm: new Date().toISOString(),
      },
      i1: {
        repousoAberta: i1RepousoAberta,
        fechar1: i1Fechar1,
        fechar2ReabreNoMeio: [i1Aos20, ...i1Reentrada],
        repousoReaberta: i1RepousoReaberta,
        passa: i1Passa,
        clipe: clipeSanfona,
        folha: folhaSanfona,
      },
      i2: { a: i2a, b: i2b, c: i2c, veredito: i2Veredito },
      i3: { a: i3a, b: i3b, c: i3c, veredito: i3Veredito },
      i4: {
        y0: y0I4, amostras: i4Amostras, passa: i4Passa, clipe: clipeTempo,
      },
      i5: {
        yRepousoFechada: yRepousoFechadaI5, yPre: yPreI5, amostras: i5Amostras, passa: i5Passa,
      },
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-interrupcoes-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    // resume um caso de I2/I3 (`julgarInterrupcao`) numa linha: veredito
    // + quadros/ms, para bater o pedido de relatório sem repetir a conta
    // três (I2) e mais três (I3) vezes.
    const fmtCaso = (caso) => {
      const ev = caso.evento.chegou ? `chegou@${caso.evento.msAntesAteEvento.toFixed(1)}ms` : 'não chegou';
      const assentou = caso.assentouNoQuadro !== null
        ? `assentou quadro ${caso.assentouNoQuadro}@${caso.msAteAssentar.toFixed(1)}ms`
        : 'nunca assentou';
      const restante = caso.restanteNaturalMs !== null ? `${caso.restanteNaturalMs.toFixed(1)}ms` : '-';
      return `${caso.veredito} (evento ${ev}, ${assentou}, restante~${restante})`;
    };

    const linhas = [
      `=== sonda-motion interrupções — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app ${APP_COMMIT} ===`,
      `Chrome ${versaoChrome.product} | mesa ${JANELA_W}x${JANELA_H} DPR${dpr} | ${ROTULO_DA_QUERY}`,
      `I1 sanfona (fechar/reabrir no meio): repouso aberta=${i1RepousoAberta.overflow}, `
        + `fechar 20/80/150ms=${i1Fechar1.map((a) => a.overflow).join('/')}, `
        + `reentrada 20/100/400ms=${[i1Aos20, ...i1Reentrada].map((a) => `${a?.overflow}${a && sanfonaAnimando(a) ? '(animando)' : '(repouso)'}@${a?.dtMs}ms`).join(' / ')}, `
        + `repouso reaberta=${i1RepousoReaberta.overflow} — `
        + `${i1Passa ? 'PASSA' : 'FALHA'}`,
      `I2 reduzir movimento no meio: a) saindo ${fmtCaso(i2a)} `
        + `b) entrando ${fmtCaso(i2b)} `
        + `c) linha do tempo ${fmtCaso(i2c)} — ${i2Veredito}`,
      `I3 resize no meio sem cruzar 760px: a) mesa saindo ${fmtCaso(i3a)} `
        + `b) mesa entrando ${fmtCaso(i3b)} `
        + `c) celular saindo ${fmtCaso(i3c)} — ${i3Veredito}`,
      `I4 linha do tempo após resize: Y0=${y0I4} y(+15)=${y15} (Δ=${y0I4 !== null && y15 !== null ? Math.abs(y15 - y0I4).toFixed(1) : '?'}px) y(+450)=${y450} — `
        + `${i4Passa ? 'PASSA' : 'FALHA'}`,
      `I5 interromper a linha com Esc: y_pre=${yPreI5} y_post(+15ms)=${yPostI5} (Δ=${yPreI5 !== null && yPostI5 !== null ? Math.abs(yPostI5 - yPreI5).toFixed(1) : '?'}px) y(+500ms)=${y500I5} repouso fechada=${yRepousoFechadaI5} — `
        + `${i5Passa ? 'PASSA' : 'FALHA'}`,
      `clipe sanfona: ${clipeSanfona} (${quadrosSanfona.length} quadros)`,
      `folha sanfona: ${folhaSanfona}`,
      `clipe linha do tempo: ${clipeTempo} (${quadrosTempo.length} quadros)`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    rmSync(pastaSanfona, { recursive: true, force: true });
    rmSync(pastaTempo, { recursive: true, force: true });
  }
}

/**
 * `--folha` — OITO cenários (F1–F8) da FOLHA GUIADA PELA MÃO no celular
 * (C4 do plano de motion, `useGavetas.ts`): a alça do cabeçalho
 * (`.hud-cabecalho-eyebrow`, fora de qualquer botão) expande a compacta
 * arrastando para cima e recolhe a expandida arrastando para baixo,
 * seguindo o dedo (`deslocamentoDaFolha`) até a decisão no soltar
 * (`destinoDoArrasto`); quatro guardas — um controle deslizante, um
 * segundo dedo, a rolagem já dentro da expandida, e a paisagem baixa da
 * MESA (`compactavel` por `janelaBaixa`, nunca cruzando os 760px de
 * `celular`) — não podem quebrar nem travar a folha. Cada cenário
 * amostra com `jsAmostraFolha` e decide PASSA/FALHA pelos próprios
 * números, como `rodarInterrupcoes` — nenhuma espera extra para o
 * veredito bater.
 */
async function rodarFolha() {
  mkdirSync(CAPTURAS, { recursive: true });
  const pastaClipe = resolve(tmpdir(), `sonda-motion-folha-${process.pid}`);
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;
    const num = (n) => (typeof n === 'number' ? n.toFixed(1) : String(n));

    sessao = await abrirSonda({ janela: JANELA, prefixo: 'sonda-motion-folha' });
    // O TELEFONE DESDE O PRIMEIRO CARREGAMENTO, e não trocado depois (o
    // padrão do modo default): o override de CDP vale para o alvo
    // inteiro e sobrevive a `Page.navigate`, então marcar antes da
    // primeira `ir()` já entrega a folha no layout que ela testa, sem
    // uma passagem pela mesa no meio.
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: TELEFONE_W, height: TELEFONE_H, deviceScaleFactor: DPR, mobile: true,
    });
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const versaoChrome = await sessao.send('Browser.getVersion');
    const dpr = await sessao.js('window.devicePixelRatio');

    // `?foco=saturno` ABRE A FICHA DIRETO (`useEspelhoDaUrl.ts`,
    // `chaveDoFoco`) — o mesmo atalho que `atlas-smoke.mjs` já usa, sem
    // repetir o fluxo de busca+Enter da C3 (`--sequencia`).
    const queryComFoco = `${QUERY}&foco=saturno`;

    const carregarFichaDeSaturno = async () => {
      let assentou = null;
      let ultimoErro = null;
      for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
        try {
          assentou = await sessao.ir(queryComFoco);
        } catch (e) {
          ultimoErro = e;
          process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
          await dorme(500);
        }
      }
      if (!assentou) throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_FICHA_PAINEL}'))`, 10000);
      await pularTour(sessao);
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_FICHA_PAINEL}')?.getAttribute('data-ficha-estado') === 'compacta'`,
        5000
      );
      await dorme(300);
    };

    await carregarFichaDeSaturno();

    // ---------------------------------------------------------------
    // F1 + F2 — UM clipe só: expandir e recolher pela alça
    // ---------------------------------------------------------------
    const top0 = (await sessao.js(jsAmostraFolha())).top;

    let dedoY0F1 = null;
    let f1Passos = [];
    let f1PosSolta = [];
    let f2Move6 = null;
    let f2Move12 = null;
    let f2PosSolta = [];

    const quadrosClipe = await gravarClipe(
      sessao,
      { largura: TELEFONE_W, altura: TELEFONE_H, pastaQuadros: pastaClipe },
      async () => {
        // F1 — expandir: 12 `touchMove` para cima totalizando 140 px, uma
        // amostra (+ o Y do dedo) depois de CADA um — é o que separa a
        // zona morta do toque (`aindaEhToque`, `arrastoDePonteiro.ts`: o
        // arrasto só desconta do dedo depois de <16px E <500ms) do
        // arrasto de verdade.
        const pontoF1 = await pontoDaAlca(sessao);
        dedoY0F1 = pontoF1.y;
        await sessao.send('Input.dispatchTouchEvent', {
          type: 'touchStart', touchPoints: [{ x: pontoF1.x, y: pontoF1.y }],
        });
        for (let n = 1; n <= 12; n++) {
          const y = pontoF1.y - Math.round((140 * n) / 12);
          await sessao.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ x: pontoF1.x, y }],
          });
          await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
          f1Passos.push({ passo: n, dedoY: y, ...(await sessao.js(jsAmostraFolha())) });
        }
        const t0F1 = await tocarSoltar(sessao);
        f1PosSolta = await amostrarSequencia(sessao, t0F1, [16, 120, 300, 600], jsAmostraFolha);

        // F2 — recolher: a alça já está lá em cima (a ficha expandiu),
        // por isso o ponto é medido DE NOVO — um dedo novo, 12
        // `touchMove` para baixo totalizando 140 px
        const pontoF2 = await pontoDaAlca(sessao);
        await sessao.send('Input.dispatchTouchEvent', {
          type: 'touchStart', touchPoints: [{ x: pontoF2.x, y: pontoF2.y }],
        });
        for (let n = 1; n <= 12; n++) {
          const y = pontoF2.y + Math.round((140 * n) / 12);
          await sessao.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ x: pontoF2.x, y }],
          });
          await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
          if (n === 6) f2Move6 = { passo: n, ...(await sessao.js(jsAmostraFolha())) };
          if (n === 12) f2Move12 = { passo: n, ...(await sessao.js(jsAmostraFolha())) };
        }
        const t0F2 = await tocarSoltar(sessao);
        f2PosSolta = await amostrarSequencia(sessao, t0F2, [16, 120, 300, 600], jsAmostraFolha);
      }
    );
    const clipe = renderizarClipe(quadrosClipe, resolve(CAPTURAS, `motion-folha-${commit}.mp4`));
    const duracaoClipe = quadrosClipe[quadrosClipe.length - 1].ts - quadrosClipe[0].ts;
    const folhaContato = renderizarContato(clipe, duracaoClipe, resolve(CAPTURAS, `motion-folha-${commit}.png`));

    // F1 PASSA: a zona morta do toque (`aindaEhToque`) come alguma
    // quantia FIXA de percurso do dedo antes de a folha começar a segui-
    // lo — em algum lugar de [0, 16) px, nunca um valor único — e a
    // partir daí o dedo e a folha andam juntos até soltar. `comido(n)` é
    // essa conta: quanto o dedo andou menos quanto a folha subiu.
    const comido = (p) => (dedoY0F1 - p.dedoY) - (top0 - p.top);
    // `inicioEfetivo` — primeiro passo em que o topo já se moveu de
    // verdade (>0.5px); antes disso o dedo ainda está DENTRO da zona
    // morta e a folha nem deveria se mexer.
    const idxInicioEfetivo = f1Passos.findIndex((p) => p.top !== null && Math.abs(p.top - top0) > 0.5);
    const inicioEfetivo = idxInicioEfetivo === -1 ? null : {
      passo: f1Passos[idxInicioEfetivo].passo,
      dedoY: f1Passos[idxInicioEfetivo].dedoY,
      comidoPx: comido(f1Passos[idxInicioEfetivo]),
    };
    // o repouso EXPANDIDO medido depois de soltar — adiantado para cá
    // porque a exceção da janela de continuidade, logo abaixo, precisa
    // dele.
    const f1Final = f1PosSolta[f1PosSolta.length - 1] ?? null;
    // continuidade: A PARTIR do passo DEPOIS do início efetivo (um passo
    // de atraso é aceito bem no começo, enquanto o layout da expandida
    // ainda não pintou) `comido(n)` fica dentro de ±1.5px de uma
    // constante entre −1.5 e 17.5, e a folha nunca anda CONTRA o dedo —
    // EXCETO nos passos em que ela já chegou no topo de repouso da
    // expandida (top ≤ topo final + 0.5px, a tela curta do item (c): a
    // expansão para antes do dedo terminar). Ali não sobra mais nada
    // para "comer" e a constante quebra por definição, não por falha; a
    // proibição de andar CONTRA o dedo continua valendo para eles
    // (`nuncaContraODedo`, alguns parágrafos abaixo, olha TODOS os
    // passos, não só esta janela).
    const comidosNaJanela = idxInicioEfetivo === -1
      ? []
      : f1Passos.slice(idxInicioEfetivo + 1)
          .filter((p) => p.top !== null && !(f1Final?.top != null && p.top <= f1Final.top + 0.5))
          .map(comido);
    let f1ComidoConst = null;
    let f1Continuo = false;
    if (comidosNaJanela.length > 0) {
      const min = Math.min(...comidosNaJanela);
      const max = Math.max(...comidosNaJanela);
      f1ComidoConst = (min + max) / 2;
      const toposDesdeInicio = [top0, ...f1Passos.map((p) => p.top)];
      const nuncaContraODedo = toposDesdeInicio.every(
        (t, i) => i === 0 || t === null || toposDesdeInicio[i - 1] === null || t <= toposDesdeInicio[i - 1] + 0.1
      );
      f1Continuo = (max - min) / 2 <= 1.5
        && f1ComidoConst >= -1.5 && f1ComidoConst <= 17.5
        && nuncaContraODedo;
    }
    const f1SemAnimando =
      f1Final && ((f1Final.waapi ?? []).length === 0 || f1Final.waapi.every((w) => w.playState === 'finished'));
    const f1EstadoFinalOk =
      f1Final && f1Final.estado === 'expandida' && f1Final.transform === 'none' && f1SemAnimando;
    const f1SubiuBem = f1Final && f1Final.top !== null && f1Final.top < top0 - 50;
    const f1Passa = Boolean(f1Continuo && f1EstadoFinalOk && f1SubiuBem);

    // F2 PASSA: repouso final compacta/transform none, o topo volta a
    // ~top0, e os topos pós-soltar andam sempre no MESMO sentido — da
    // soltura rumo ao repouso final, seja ele subir ou descer — sem
    // reverter mais que 4px (uma reversão maior é o "flash" da folha
    // inteira antes de assentar). SEM checar WAAPI vazia aqui, ao contrário do F1: a
    // COMPACTA declara `height`/`max-height` própria (09-celular.css,
    // ".atlas-ficha[data-ficha-estado]"), então virar compacta acende
    // uma transição de CSS própria (a caixa encolhendo até 10rem) que
    // ainda corre por até 260ms DEPOIS do transform já estar assentado —
    // uma animação real, mas de ALTURA, não de POSIÇÃO; exigir "nenhuma"
    // aqui reprovaria a folha por um comportamento que o próprio CSS
    // pede (medido: currentTime ainda em ~250ms aos +600ms). A
    // EXPANDIDA (F1) não declara `height` própria — só ela pode exigir
    // WAAPI vazia com segurança.
    const f2Final = f2PosSolta[f2PosSolta.length - 1] ?? null;
    const f2EstadoFinalOk = f2Final && f2Final.estado === 'compacta' && f2Final.transform === 'none';
    const f2VoltouAoTopo = f2Final && f2Final.top !== null && Math.abs(f2Final.top - top0) <= 4;
    const toposF2 = f2PosSolta.map((a) => a.top).filter((t) => t !== null);
    // o sentido vem dos dois extremos da própria amostra (soltura → final),
    // não de um "sobe" fixo — a folha pode soltar já quase no repouso e
    // andar o resto do caminho no sentido contrário ao de F1.
    const direcaoF2 = toposF2.length > 1 && toposF2[toposF2.length - 1] < toposF2[0] ? -1 : 1;
    const f2SemSalto = toposF2.every(
      (t, i) => i === 0 || (t - toposF2[i - 1]) * direcaoF2 >= -4
    );
    const f2Passa = Boolean(f2EstadoFinalOk && f2VoltouAoTopo && f2SemSalto);

    // ---------------------------------------------------------------
    // F3 — arrasto curto (40 px para cima): volta para compacta
    // ---------------------------------------------------------------
    const pontoF3 = await pontoDaAlca(sessao);
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoF3.x, y: pontoF3.y }],
    });
    for (let n = 1; n <= 12; n++) {
      const y = pontoF3.y - Math.round((40 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pontoF3.x, y }] });
      await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
    }
    const t0F3 = await tocarSoltar(sessao);
    const f3Amostras = await amostrarSequencia(sessao, t0F3, [16, 120, 300, 600], jsAmostraFolha);
    const f3Final = f3Amostras[f3Amostras.length - 1];
    const f3Passa = Boolean(f3Final && f3Final.estado === 'compacta' && f3Final.transform === 'none');

    // ---------------------------------------------------------------
    // F4 — fechar pela alça (140 px para baixo, a partir da compacta)
    // ---------------------------------------------------------------
    const pontoF4 = await pontoDaAlca(sessao);
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoF4.x, y: pontoF4.y }],
    });
    for (let n = 1; n <= 12; n++) {
      const y = pontoF4.y + Math.round((140 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pontoF4.x, y }] });
      await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
    }
    const t0F4 = await tocarSoltar(sessao);
    const f4Amostras = await amostrarSequencia(sessao, t0F4, [16, 120, 300, 600], jsAmostraFolha);
    const f4Final = f4Amostras[f4Amostras.length - 1];
    const f4Passa = Boolean(f4Final && f4Final.existe === false);

    // ---------------------------------------------------------------
    // F5 — um segundo dedo no meio do arrasto: devolve ao começo
    // ---------------------------------------------------------------
    await carregarFichaDeSaturno(); // reabre a ficha (F4 acabou de fechá-la)
    const pontoF5 = await pontoDaAlca(sessao);
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoF5.x, y: pontoF5.y }],
    });
    let yF5 = pontoF5.y;
    for (let n = 1; n <= 12; n++) {
      yF5 = pontoF5.y - Math.round((100 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pontoF5.x, y: yF5 }] });
      await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
    }
    const t0F5 = Date.now();
    // O SEGUNDO DEDO É UM `touchStart` COM OS DOIS PONTOS (o protocolo
    // pede a lista INTEIRA de toques ativos, não só o novo) — é isto que
    // `comecar()` em `useGavetas.ts` lê como `e.touches.length > 1` e
    // devolve a folha ao começo (`desfazer`), sem esperar o `touchEnd`.
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: pontoF5.x, y: yF5 }, { x: pontoF5.x + 40, y: yF5 }],
    });
    await tocarSoltar(sessao);
    const f5Amostras = await amostrarSequencia(sessao, t0F5, [16, 120, 300, 600], jsAmostraFolha);
    const f5Final = f5Amostras[f5Amostras.length - 1];
    const f5Passa = Boolean(f5Final && f5Final.estado === 'compacta' && f5Final.transform === 'none');


    // ---------------------------------------------------------------
    // F7 — expandida e rolada: a alça ainda fecha (a rolagem não entra
    // na conta quando o gesto começa NELA, `useGavetas.ts`)
    // ---------------------------------------------------------------
    await carregarFichaDeSaturno(); // ficha compacta de novo (Ajustes fechou a da F6)
    await sessao.js(`document.querySelector('${SEL_FICHA_DETALHES}')?.click()`);
    await esperarPor(
      { js: sessao.js },
      `document.querySelector('${SEL_FICHA_PAINEL}')?.getAttribute('data-ficha-estado') === 'expandida'`,
      5000
    );
    await dorme(400); // assenta a expansão antes de rolar
    await sessao.js(`(() => {
      const el = document.querySelector('${SEL_FICHA_PAINEL}');
      if (el) el.scrollTop = 200;
    })()`);
    const scrollTopAntesDoArrasto = await sessao.js(
      `document.querySelector('${SEL_FICHA_PAINEL}')?.scrollTop ?? null`
    );
    const toquesAntesF7 = await lerToques(sessao);
    const pontoF7 = await pontoDaAlca(sessao);
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoF7.x, y: pontoF7.y }],
    });
    for (let n = 1; n <= 12; n++) {
      const y = pontoF7.y + Math.round((140 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pontoF7.x, y }] });
      await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
    }
    const t0F7 = await tocarSoltar(sessao);
    const f7Amostras = await amostrarSequencia(sessao, t0F7, [16, 120, 300, 600], jsAmostraFolha);
    const f7Final = f7Amostras[f7Amostras.length - 1];
    const f7Passa = Boolean(f7Final && f7Final.estado === 'compacta' && f7Final.transform === 'none');
    const f7ToqueChegou = (await lerToques(sessao)) > toquesAntesF7;
    const f7Veredito = !f7ToqueChegou ? 'INCONCLUSIVO' : f7Passa ? 'PASSA' : 'FALHA';

    // ---------------------------------------------------------------
    // F8 — paisagem baixa da MESA (844×390): `compactavel` por
    // `janelaBaixa`, não por `celular` (760px nunca é cruzado) — o
    // gesto da alça não existe aqui (o efeito de `useGavetas.ts` só liga
    // com `celular`); só confere que nada quebrou.
    // ---------------------------------------------------------------
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: TELEFONE_H, height: TELEFONE_W, deviceScaleFactor: DPR, mobile: true,
    });
    await carregarFichaDeSaturno();
    const f8Antes = await sessao.js(
      `document.querySelector('${SEL_FICHA_PAINEL}')?.getAttribute('data-ficha-estado') ?? null`
    );
    await sessao.js(`document.querySelector('${SEL_FICHA_DETALHES}')?.click()`);
    await dorme(400);
    const f8Depois = await sessao.js(
      `document.querySelector('${SEL_FICHA_PAINEL}')?.getAttribute('data-ficha-estado') ?? null`
    );

    // ---------------------------------------------------------------
    // F9 — redimensionar (a virada mesa↔celular, ou o teclado virtual
    // abrindo/fechando) com o DEDO AINDA NO AR, no meio do arrasto pela
    // alça — nos dois sentidos (abrir e fechar): o resize não pode
    // deixar a folha arrastando sozinha (`data-arrasto` órfão) nem
    // destravar o gesto do dedo que ainda a segurava.
    // ---------------------------------------------------------------
    const restaurarTelefone = () => sessao.send('Emulation.setDeviceMetricsOverride', {
      width: TELEFONE_W, height: TELEFONE_H, deviceScaleFactor: DPR, mobile: true,
    });

    // O ESQUELETO é o mesmo para abrir (F9a) e fechar (F9b) — só o
    // `sinal` do arrasto (para cima/para baixo) e o `estadoEsperado`
    // ANTES do resize mudam. Sem esse estado batendo (o dedo ainda não
    // cruzou a zona morta, ou a expansão não teve tempo de aparecer),
    // devolve INCONCLUSIVO sem chegar a mexer no viewport.
    const rodarF9 = async (sinal, estadoEsperado) => {
      await restaurarTelefone();
      await carregarFichaDeSaturno();
      const toquesAntes = await lerToques(sessao);
      const ponto = await pontoDaAlca(sessao);
      await sessao.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ x: ponto.x, y: ponto.y }],
      });
      let y = ponto.y;
      for (let n = 1; n <= 6; n++) {
        y = ponto.y + sinal * Math.round((84 * n) / 6);
        await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ponto.x, y }] });
        await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
      }
      const antesDoResize = await sessao.js(jsAmostraFolha());
      if (!antesDoResize.dataArrasto || antesDoResize.estado !== estadoEsperado) {
        await tocarSoltar(sessao); // solta o dedo pendente antes de seguir para o próximo sub-caso
        await restaurarTelefone();
        return { antesDoResize, toqueChegou: (await lerToques(sessao)) > toquesAntes, veredito: 'INCONCLUSIVO' };
      }

      // COM O DEDO AINDA NO AR: o resize acontece NO MEIO do arrasto —
      // `observarAposEvento` é o mesmo helper de I2/I3, só que aqui quem
      // chama já sabe que o gesto está em curso (checado acima).
      const obsResize = await observarAposEvento(
        sessao,
        { evento: 'resize', construirAmostra: jsAmostraFolha },
        () => sessao.send('Emulation.setDeviceMetricsOverride', {
          width: TELEFONE_W, height: Math.max(TELEFONE_H - 144, 300), deviceScaleFactor: DPR, mobile: true,
        })
      );

      for (let n = 1; n <= 4; n++) {
        y = ponto.y + sinal * Math.round(84 + (40 * n) / 4);
        await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ponto.x, y }] });
        await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
      }
      const posMoves = await sessao.js(jsAmostraFolha());
      const t0Solta = await tocarSoltar(sessao);
      const [posSolta] = await amostrarSequencia(sessao, t0Solta, [600], jsAmostraFolha);
      await restaurarTelefone();

      return {
        antesDoResize,
        resize: { chegou: obsResize.chegou, msAntesAteEvento: obsResize.msAntesAteEvento, amostras: obsResize.amostras },
        posMoves,
        posSolta,
      };
    };

    // F9a — intenção de EXPANDIR (arrasto para cima): o resize tem de
    // CANCELAR o gesto — a folha assenta compacta, nunca "arrastando
    // sozinha" com um `data-arrasto` que ninguém mais solta.
    const f9aBruto = await rodarF9(-1, 'expandida');
    let f9a;
    if (f9aBruto.veredito === 'INCONCLUSIVO') {
      f9a = f9aBruto;
    } else {
      // "sem animação rodando" ignora a MESMA transição de CSS que o F2
      // (comentário lá em cima) sabe ser da ALTURA da compacta, nunca da
      // POSIÇÃO — sem a exceção, essa transição (que ainda corre por
      // ~260ms) nunca deixava `assentou` bater. Em troca, exige que o
      // `top` fique parado (±1px) do quadro em que assentou até o
      // último quadro observado — é isto que pega um sheet ancorado
      // embaixo que a exceção acima deixaria passar se a altura ainda
      // estivesse de fato empurrando a posição.
      const semAnimacaoRodando = (a) => (a.waapi ?? [])
        .filter((w) => !(w.tipo === 'CSSTransition' && (w.propriedade === 'height' || w.propriedade === 'max-height')))
        .every((w) => w.playState !== 'running');
      const assentouAgora = (a) => a.dataArrasto === false && a.transformInline === '' && a.transform === 'none'
        && a.estado === 'compacta' && semAnimacaoRodando(a);
      const candidatosF9a = f9aBruto.resize.amostras.slice(0, 3);
      const idxAssentouF9a = candidatosF9a.findIndex(assentouAgora);
      const assentou = idxAssentouF9a === -1 ? undefined : candidatosF9a[idxAssentouF9a];
      const toposDepoisDeAssentar = idxAssentouF9a === -1
        ? []
        : f9aBruto.resize.amostras.slice(idxAssentouF9a).map((a) => a.top).filter((t) => t !== null);
      const topParado = toposDepoisDeAssentar.length > 0
        && Math.max(...toposDepoisDeAssentar) - Math.min(...toposDepoisDeAssentar) <= 2;
      const posMovesOk = f9aBruto.posMoves.dataArrasto === false && f9aBruto.posMoves.transform === 'none';
      const posSoltaOk = f9aBruto.posSolta.estado === 'compacta' && f9aBruto.posSolta.transform === 'none';
      f9a = {
        ...f9aBruto,
        assentouNoQuadro: assentou?.quadro ?? null,
        veredito: (assentou && topParado && posMovesOk && posSoltaOk) ? 'PASSA' : 'FALHA',
      };
    }

    // F9b — intenção de FECHAR (arrasto para baixo, a partir da
    // compacta): o resize não pode deixar a folha arrastando sozinha nem
    // fechá-la por conta própria — ela existe, assenta, e sobrevive ao
    // soltar do dedo.
    const f9bBruto = await rodarF9(1, 'compacta');
    let f9b;
    if (f9bBruto.veredito === 'INCONCLUSIVO') {
      f9b = f9bBruto;
    } else {
      const assentouAgora = (a) => a.existe === true && a.transform === 'none' && a.dataArrasto === false
        && a.estado === 'compacta';
      const assentou = f9bBruto.resize.amostras.slice(0, 3).find(assentouAgora);
      const existeAoFim = f9bBruto.posSolta.existe === true;
      f9b = {
        ...f9bBruto,
        assentouNoQuadro: assentou?.quadro ?? null,
        veredito: (assentou && existeAoFim) ? 'PASSA' : 'FALHA',
      };
    }

    // ---------------------------------------------------------------
    // F6 — um controle deslizante nunca começa o arrasto da folha. RODA
    // POR ÚLTIMO (depois da F9): a 760×900 o arrasto no deslizante deixa
    // o toque EMULADO do CDP sem entregar mais nada à página pelo resto
    // da sessão (medido: zero `touchstart` na F7 seguinte; sem este gesto
    // a F7 e a F9 passam) — nenhum cenário de toque pode vir depois dele.
    // ---------------------------------------------------------------
    await sessao.js(`document.querySelector('${SEL_AJUSTES_GATILHO}').click()`);
    await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_AJUSTES_PAINEL}'))`, 5000);
    await dorme(400); // assenta a entrada (--t-folha) antes do toque
    const seletorSlider = `${SEL_AJUSTES_PAINEL} input[type="range"]`;
    const rSlider = await retanguloDe(sessao, seletorSlider);
    if (!rSlider) throw new Error(`F6: "${seletorSlider}" não encontrado`);
    const pontoSlider = {
      x: Math.round(rSlider.x + rSlider.width / 2),
      y: Math.round(rSlider.y + rSlider.height / 2),
    };
    const f6Durante = [];
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoSlider.x, y: pontoSlider.y }],
    });
    for (let n = 1; n <= 12; n++) {
      const x = pontoSlider.x + Math.round((60 * n) / 12);
      const y = pontoSlider.y + Math.round((60 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await esperarQuadro(sessao); // o ritmo do dedo: um `touchMove` por quadro
      if (n === 6 || n === 12) {
        f6Durante.push({ passo: n, ...(await sessao.js(jsAmostraPainel(SEL_AJUSTES_PAINEL))) });
      }
    }
    const t0F6 = await tocarSoltar(sessao);
    const f6PosSolta = await amostrarSequencia(
      sessao, t0F6, [16, 120, 300, 600], () => jsAmostraPainel(SEL_AJUSTES_PAINEL)
    );
    const f6TudoNone = [...f6Durante, ...f6PosSolta].every((a) => a.transform === 'none');
    const f6AjustesAberto = f6PosSolta[f6PosSolta.length - 1]?.existe === true;
    const f6Passa = Boolean(f6TudoNone && f6AjustesAberto);

    // ---------------------------------------------------------------
    // RELATÓRIO
    // ---------------------------------------------------------------
    const relatorio = {
      meta: {
        commit,
        dirty,
        // O SERVIDOR É DE OUTRA ÁRVORE (isolada, item obrigatório do
        // enunciado): `commit`/`dirty` acima são desta sonda, não do app
        // que ela mede — os dois podem divergir, e é por isso que o app
        // ganha o campo dele, à parte.
        appCommit: APP_COMMIT,
        chrome: versaoChrome.product,
        app: APP,
        query: queryComFoco,
        viewport: { width: TELEFONE_W, height: TELEFONE_H },
        dpr,
        geradoEm: new Date().toISOString(),
      },
      f1: {
        top0,
        passos: f1Passos,
        inicioEfetivo,
        comidoMin: comidosNaJanela.length ? Math.min(...comidosNaJanela) : null,
        comidoMax: comidosNaJanela.length ? Math.max(...comidosNaJanela) : null,
        continuo: f1Continuo,
        posSolta: f1PosSolta,
        passa: f1Passa,
      },
      f2: {
        move6: f2Move6, move12: f2Move12, posSolta: f2PosSolta, semSalto: f2SemSalto, passa: f2Passa,
      },
      f3: { amostras: f3Amostras, passa: f3Passa },
      f4: { amostras: f4Amostras, passa: f4Passa },
      f5: { amostras: f5Amostras, passa: f5Passa },
      f6: {
        durante: f6Durante,
        posSolta: f6PosSolta,
        tudoTransformNone: f6TudoNone,
        ajustesAberto: f6AjustesAberto,
        passa: f6Passa,
      },
      f7: { scrollTopAntesDoArrasto, amostras: f7Amostras, toqueChegou: f7ToqueChegou, veredito: f7Veredito },
      f8: { antes: f8Antes, depois: f8Depois },
      f9: { a: f9a, b: f9b },
      clipe,
      folhaContato,
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-folha-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    // resume um sub-caso de F9 numa linha — INCONCLUSIVO nunca chegou a
    // fazer o resize, então só tem `antesDoResize` para mostrar.
    const fmtF9 = (caso) => (caso.veredito === 'INCONCLUSIVO'
      ? `INCONCLUSIVO (antes do resize dataArrasto=${caso.antesDoResize.dataArrasto} estado=${caso.antesDoResize.estado}`
        + `${caso.toqueChegou === false ? '; o toque emulado não chegou à página' : ''})`
      : `assentou quadro=${caso.assentouNoQuadro ?? '-'} `
        + `pós-solta(+600ms) existe=${caso.posSolta.existe} estado=${caso.posSolta.estado} `
        + `transform=${caso.posSolta.transform} — ${caso.veredito}`);

    const linhas = [
      `=== sonda-motion folha — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app ${APP_COMMIT} ===`,
      `Chrome ${versaoChrome.product} | celular ${TELEFONE_W}x${TELEFONE_H} DPR${dpr} | ${ROTULO_DA_QUERY} | foco=saturno`,
      `clipe F1+F2: ${clipe} (${quadrosClipe.length} quadros)`,
      `folha de contato: ${folhaContato}`,
      `F1 expandir: top0=${num(top0)} inicioEfetivo=${inicioEfetivo ? `passo ${inicioEfetivo.passo} comido=${num(inicioEfetivo.comidoPx)}px` : 'nunca'} `
        + `comido[min/max]=${comidosNaJanela.length ? `${num(Math.min(...comidosNaJanela))}/${num(Math.max(...comidosNaJanela))}` : '-'} `
        + `(${f1Continuo ? 'contínuo' : 'DESCONTÍNUO'}) final estado=${f1Final?.estado} transform=${f1Final?.transform} `
        + `top=${num(f1Final?.top)} — ${f1Passa ? 'PASSA' : 'FALHA'}`,
      `F2 recolher: final estado=${f2Final?.estado} transform=${f2Final?.transform} transformInline=${f2Final?.transformInline} `
        + `top=${num(f2Final?.top)} waapi=${JSON.stringify(f2Final?.waapi)} `
        + `(top0=${num(top0)}) topos pós-soltar=${toposF2.map((t) => t.toFixed(1)).join('/')} `
        + `(${f2SemSalto ? 'sem recuo' : 'COM RECUO'}) — ${f2Passa ? 'PASSA' : 'FALHA'}`,
      `F3 arrasto curto (40px): final estado=${f3Final?.estado} transform=${f3Final?.transform} — `
        + `${f3Passa ? 'PASSA' : 'FALHA'}`,
      `F4 fechar (140px): final existe=${f4Final?.existe} — ${f4Passa ? 'PASSA' : 'FALHA'}`,
      `F5 segundo dedo: final estado=${f5Final?.estado} transform=${f5Final?.transform} — `
        + `${f5Passa ? 'PASSA' : 'FALHA'}`,
      `F6 controle deslizante: transform sempre none=${f6TudoNone}, Ajustes aberto ao fim=${f6AjustesAberto} — `
        + `${f6Passa ? 'PASSA' : 'FALHA'}`,
      `F7 expandida+rolada (scrollTop=${scrollTopAntesDoArrasto}): final estado=${f7Final?.estado} `
        + `transform=${f7Final?.transform} transformInline=${f7Final?.transformInline} top=${num(f7Final?.top)} `
        + `waapi=${JSON.stringify(f7Final?.waapi)}${f7ToqueChegou ? '' : ' (o toque emulado não chegou à página)'} — ${f7Veredito}`,
      `F8 paisagem baixa ${TELEFONE_H}x${TELEFONE_W}: data-ficha-estado antes=${f8Antes} depois=${f8Depois}`,
      `F9a expandir + resize com o dedo no ar: ${fmtF9(f9a)}`,
      `F9b fechar + resize com o dedo no ar: ${fmtF9(f9b)}`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    rmSync(pastaClipe, { recursive: true, force: true });
  }
}

/** repete `fn` até `tentativas` vezes — rede de segurança da corrida
 *  `--c5`: o vigia da aba intrusa (`abrirSonda`) evita interferir no
 *  MEIO de uma gravação, mas se a intrusa aparecer bem no INÍCIO de uma
 *  cena (antes do vigia ter uma folga de 500ms para fechá-la), aquele
 *  clipe pode nascer com poucos ou nenhum quadro. Repetir a cena do
 *  zero é mais simples e mais honesto que adivinhar o instante exato. */
async function comRetentativa(fn, { tentativas = 2, pausaMs = 1000 } = {}) {
  let ultimoErro = null;
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimoErro = e;
      process.stdout.write(`  ·     tentativa ${i}/${tentativas} da cena falhou: ${e.message}\n`);
      if (i < tentativas) await dorme(pausaMs);
    }
  }
  throw ultimoErro;
}

/** pressiona Tab repetidamente até `document.activeElement` casar com
 *  `seletor` (ou até `maxPresses`) — TECLA REAL, nunca `.focus()` por
 *  script: só o Tab de verdade decide `:focus-visible` como um Tab de
 *  verdade decidiria (mesma razão de `clicarReal`). Devolve quantos
 *  Tabs foram precisos, ou -1 se não achou dentro do teto. */
async function tabularAte(sessao, seletor, maxPresses = 30) {
  for (let i = 1; i <= maxPresses; i++) {
    await pressionarTecla(sessao, 'Tab');
    const acertou = await sessao.js(
      `Boolean(document.activeElement && document.activeElement.matches(${JSON.stringify(seletor)}))`
    );
    if (acertou) return i;
  }
  return -1;
}

// ============================================================
// `--c5` — OITO CENAS (V1–V8) do que o C5 já entregou: os marcos do
// carregamento piscando uma vez (`marcoReflexo`), o aceno do CTA
// primário na abertura e na tela final (`reflexoDeAbertura`,
// `--cta-atraso`), o chrome do filme sumindo sozinho por inatividade
// (`useChromeDoFilme`), o grupo "Mais" (`usePresenca`), os ícones do
// transporte (`assentaIcone`/`.realce-texto`), a barra de progresso
// (U10: engrossa em hover/foco/arrasto, o ponto persegue o
// preenchimento), a tela final e o botão "Ficar neste céu", o acento
// âmbar de 200ms quando a seleção troca no céu (`acentoDaSelecao`,
// `LabelCanvas.ts`) e a dica de ajuda ("?", `entraDica`). Cada cena
// grava um clipe em velocidade normal + folha de contato (o mesmo
// `gravarClipe` → `renderizarClipe` → `renderizarContato` das outras
// leituras) e amostra o DOM pelo PRÓPRIO estado, nunca pelo relógio da
// sonda — mas ao contrário de `--interrupcoes`/`--folha` isto não julga
// PASSA/FALHA: roda uma vez e relata os números medidos.
// ============================================================

function jsMarcoAgora() {
  return `(() => {
    const el = document.querySelector('.cv-marco.agora');
    if (!el) return { existe: false };
    const cs = getComputedStyle(el);
    return { existe: true, animationName: cs.animationName, className: el.className };
  })()`;
}

function jsCtaPrimario() {
  return `(() => {
    const btn = document.querySelector('.veil-btn--primario');
    if (!btn) return { existe: false };
    const cs = getComputedStyle(btn, '::after');
    return {
      existe: true,
      animationName: cs.animationName,
      animationDelay: cs.animationDelay,
      animationDuration: cs.animationDuration,
    };
  })()`;
}

/**
 * V1 — A ABERTURA: da navegação (sem `?atlas=1`) pelas etapas do
 * carregamento até o véu do título, com o aceno do CTA primário já
 * passado. A gravação começa ANTES do `Page.navigate` — só assim os
 * marcos do carregamento (`.cv-marco.agora`, cada um pisca uma vez só)
 * entram no clipe — e por isso um segundo laço, concorrente com a
 * navegação, amostra o marco "agora" a cada 40ms pelo mesmo socket CDP;
 * erros de `Runtime.evaluate` no meio da troca de documento são
 * esperados (o contexto antigo morre) e só descartam aquela amostra.
 */
async function cenaAberturaC5(sessao, commit, pasta) {
  const marcos = [];
  let coletando = true;
  const coletor = (async () => {
    while (coletando) {
      try {
        const m = await sessao.js(jsMarcoAgora());
        if (m?.existe) marcos.push(m);
      } catch { /* documento trocando — amostra descartada */ }
      await dorme(40);
    }
  })();

  let cta = null;
  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      await sessao.ir(QUERY_FILME);
      await esperarCapaSair(sessao.send);
      // --cta-atraso (0,8s) + --t-reflexo (0,36s) do aceno, com folga
      await dorme(1400);
      cta = await sessao.js(jsCtaPrimario());
    }
  );
  coletando = false;
  await coletor;

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v1-abertura-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v1-abertura-${commit}.png`));
  const marcosComReflexo = marcos.filter((m) => m.animationName.includes('marcoReflexo')).length;

  return {
    clipe, folha, quadros: quadros.length, marcosAmostrados: marcos.length, marcosComReflexo, cta,
  };
}

/** Navega para o filme (sem `?atlas=1`) e clica "Ver o filme" — o botão
 *  SECUNDÁRIO do véu (`aria-describedby="porta-filme"`; o PRIMÁRIO leva
 *  ao Atlas, não ao filme). Usada por V2–V6, que precisam da viagem
 *  tocando. */
async function iniciarFilmeC5(sessao) {
  let assentou = null;
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
    try {
      assentou = await sessao.ir(QUERY_FILME);
    } catch (e) {
      ultimoErro = e;
      process.stdout.write(`tentativa ${tentativa}/3 de carregar o filme falhou: ${e.message}\n`);
      await dorme(500);
    }
  }
  if (!assentou) throw new Error(`o filme não carregou em 3 tentativas (${ultimoErro?.message})`);
  await esperarCapaSair(sessao.send);
  await clicarReal(sessao, '[aria-describedby="porta-filme"]');
  await esperarPor(
    { js: sessao.js },
    "document.querySelector('.hud-root')?.getAttribute('data-fase') === 'journey'",
    10000
  );
  await dorme(300);
}

/**
 * ACORDA O CHROME DO FILME (`useChromeDoFilme`) antes de uma cena que
 * precisa dele visível/clicável. Achado ao rodar `--c5`: `renderizarClipe`
 * e `renderizarContato` usam `spawnSync` (ffmpeg BLOQUEANTE) entre uma
 * cena e a próxima — o Node fica preso codificando por segundos de
 * parede enquanto o filme continua tocando e o ponteiro não se mexe, e
 * os 3s de inatividade (`ESPERA_DO_CHROME_MS`) vencem no meio disso. Sem
 * acordar antes, um clique em V3/V4/V5 podia cair num botão
 * `pointer-events: none` e atravessar até o céu por baixo — o clique
 * vira NO-OP, sem erro nenhum para acusar. Fica FORA de `gravarClipe`
 * de propósito: um gesto de despertar dentro do clipe poluiria a
 * gravação com um movimento que ninguém pediu para ver.
 */
async function acordarChromeDoFilme(sessao) {
  await moverMouse(sessao, 720, 450);
  await esperarPor(
    { js: sessao.js },
    "document.querySelector('.controls-bar')?.className.includes('hud-sumido') === false",
    2000
  );
  await dorme(150);
}

function jsBarraDoFilme() {
  return `(() => {
    const el = document.querySelector('.controls-bar');
    if (!el) return { existe: false };
    const cs = getComputedStyle(el);
    return {
      existe: true,
      sumida: el.className.includes('hud-sumido'),
      transitionDuration: cs.transitionDuration,
      opacity: cs.opacity,
    };
  })()`;
}

/**
 * V2 — O CHROME DO FILME SOME SOZINHO (`useChromeDoFilme`,
 * `ESPERA_DO_CHROME_MS = 3000`): com a viagem tocando e o ponteiro
 * parado, a barra de controles some por opacidade; o primeiro gesto a
 * traz de volta. A câmera grava em tempo real — a espera de uns 3s é o
 * PRÓPRIO comportamento sendo medido, não um `dorme` de conveniência
 * (por isso o teto de `esperarPor` é bem maior que os 3s nominais).
 */
async function cenaChromeC5(sessao, commit, pasta) {
  await sessao.js('window.__director.seek(20)');
  await acordarChromeDoFilme(sessao);
  const visivel = await sessao.js(jsBarraDoFilme());

  let escondida = null;
  let revelada = null;
  let escondidaDeNovo = null;
  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      const escondeuAos = await esperarPor(
        { js: sessao.js }, "document.querySelector('.controls-bar')?.className.includes('hud-sumido') === true", 6000
      );
      escondida = { ...(await sessao.js(jsBarraDoFilme())), escondeuAos };

      await moverMouse(sessao, 720, 450); // revela — o primeiro gesto do ponteiro
      const revelouAos = await esperarPor(
        { js: sessao.js }, "document.querySelector('.controls-bar')?.className.includes('hud-sumido') === false", 2000
      );
      revelada = { ...(await sessao.js(jsBarraDoFilme())), revelouAos };

      // sem NOVO gesto — é o silêncio que deve escondê-la de novo
      const escondeuDeNovoAos = await esperarPor(
        { js: sessao.js }, "document.querySelector('.controls-bar')?.className.includes('hud-sumido') === true", 6000
      );
      escondidaDeNovo = { ...(await sessao.js(jsBarraDoFilme())), escondeuDeNovoAos };
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v2-chrome-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v2-chrome-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, visivel, escondida, revelada, escondidaDeNovo,
  };
}

function jsMais() {
  return `(() => {
    const gatilho = document.querySelector('[aria-controls="barra-mais-ferramentas"]');
    const painel = document.getElementById('barra-mais-ferramentas');
    const ae = document.activeElement;
    return {
      gatilhoExpandido: gatilho ? gatilho.getAttribute('aria-expanded') : null,
      painelExiste: Boolean(painel),
      painelClasse: painel ? painel.className : null,
      painelInert: painel ? painel.inert : null,
      foco: ae ? {
        tag: ae.tagName,
        ehOGatilho: ae === gatilho,
        dentroDoPainel: Boolean(painel && ae !== painel && painel.contains(ae)),
      } : null,
    };
  })()`;
}

/**
 * V3 — O GRUPO "MAIS" (`usePresenca`, `.filme-mais`): abre e fecha pelo
 * mouse, depois abre de novo, entra nele com Tab e fecha pelo TECLADO
 * de volta no próprio gatilho (Shift+Tab, Enter) — o mesmo contrato de
 * presença da Sanfona de Ajustes (`inert` na saída, foco devolvido ao
 * gatilho de quem abriu).
 */
async function cenaMaisC5(sessao, commit, pasta) {
  await acordarChromeDoFilme(sessao);
  const seletorGatilho = '[aria-controls="barra-mais-ferramentas"]';
  let aposAbrirMouse = [];
  let aposFecharMouse = [];
  let focoAposTab = null;
  let focoAposFechar = null;

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      const t0Abrir = Date.now();
      await clicarReal(sessao, seletorGatilho);
      aposAbrirMouse = await amostrarSequencia(sessao, t0Abrir, [16, 120, 300], jsMais);
      await dorme(400);

      const t0Fechar = Date.now();
      await clicarReal(sessao, seletorGatilho);
      aposFecharMouse = await amostrarSequencia(sessao, t0Fechar, [16, 120, 300], jsMais);
      await dorme(400);

      await clicarReal(sessao, seletorGatilho); // abre de novo
      await dorme(400);
      await pressionarTecla(sessao, 'Tab'); // entra no painel
      focoAposTab = await sessao.js(jsMais());
      await pressionarTecla(sessao, 'Tab', { shift: true }); // volta ao gatilho
      await pressionarTecla(sessao, 'Enter'); // fecha pelo teclado
      await dorme(350);
      focoAposFechar = await sessao.js(jsMais());
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v3-mais-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v3-mais-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, aposAbrirMouse, aposFecharMouse, focoAposTab, focoAposFechar,
  };
}

function jsTransporte() {
  return `(() => {
    const botoes = document.querySelectorAll('.filme-transporte button');
    const pausaBtn = botoes[0] || null;
    const taxaBtn = botoes[1] || null;
    const iconeAssenta = document.querySelector('.filme-transporte-icone-assenta');
    const rateSpan = taxaBtn ? taxaBtn.querySelector('span') : null;
    return {
      pausaAriaLabel: pausaBtn ? pausaBtn.getAttribute('aria-label') : null,
      iconeAssentaExiste: Boolean(iconeAssenta),
      iconeAnimationName: iconeAssenta ? getComputedStyle(iconeAssenta).animationName : null,
      rateTexto: rateSpan ? rateSpan.textContent : null,
      rateRealceTexto: rateSpan ? rateSpan.className.includes('realce-texto') : false,
    };
  })()`;
}

/**
 * V4 — TRANSPORTE: pausar, retomar, mudar a velocidade. O ícone de
 * pausa/retomar reassenta (`assentaIcone`, remontado por `key`) a cada
 * troca, e o número da taxa ganha `.realce-texto` do mesmo jeito que o
 * nome do alvo ganha na busca (C3). Termina devolvendo a taxa a 1× para
 * não vazar velocidade alta para as cenas seguintes.
 */
async function cenaTransporteC5(sessao, commit, pasta) {
  await acordarChromeDoFilme(sessao);
  const seletorPausa = '.filme-transporte button:nth-child(1)';
  const seletorTaxa = '.filme-transporte button:nth-child(2)';
  let aposPausar = [];
  let aposRetomar = [];
  let aposTaxa = [];

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      const t0p = Date.now();
      await clicarReal(sessao, seletorPausa);
      aposPausar = await amostrarSequencia(sessao, t0p, [16, 80, 200], jsTransporte);
      await dorme(300);

      const t0r = Date.now();
      await clicarReal(sessao, seletorPausa);
      aposRetomar = await amostrarSequencia(sessao, t0r, [16, 80, 200], jsTransporte);
      await dorme(300);

      const t0t = Date.now();
      await clicarReal(sessao, seletorTaxa);
      aposTaxa = await amostrarSequencia(sessao, t0t, [16, 80, 200], jsTransporte);

      // devolve 2×→4×→1×, para a cena seguinte herdar velocidade normal
      await dorme(300);
      await clicarReal(sessao, seletorTaxa);
      await dorme(300);
      await clicarReal(sessao, seletorTaxa);
      await dorme(300);
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v4-transporte-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v4-transporte-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, aposPausar, aposRetomar, aposTaxa,
  };
}

function jsProgresso() {
  return `(() => {
    const wrap = document.querySelector('.progress-wrap');
    if (!wrap) return { existe: false };
    const track = wrap.querySelector('.progress-track');
    const ponto = wrap.querySelector('.progress-ponto');
    const fill = wrap.querySelector('.progress-fill');
    const csWrap = getComputedStyle(wrap);
    const csTrack = getComputedStyle(track);
    const csPontoBefore = getComputedStyle(ponto, '::before');
    const rWrap = wrap.getBoundingClientRect();
    const rFill = fill.getBoundingClientRect();
    const fracao = Number.parseFloat(csWrap.getPropertyValue('--journey-progress')) || 0;
    const pontoX = rWrap.left + fracao * rWrap.width;
    return {
      existe: true,
      arrastando: wrap.getAttribute('data-arrastando') !== null,
      focoAtual: document.activeElement === wrap,
      trackTransform: csTrack.transform,
      pontoOpacity: csPontoBefore.opacity,
      distanciaPontoFillPx: Math.abs(rFill.right - pontoX),
    };
  })()`;
}

/**
 * V5 — A BARRA DE PROGRESSO (U10, `.progress-wrap`): a camada visual
 * engrossa (`scaleY(2.5)`) em hover real, foco por Tab e arrasto; o
 * ponto do arrasto só aparece (opacidade 1) em foco por teclado ou
 * arrasto; e o ponto persegue a ponta do preenchimento — lida a MESMA
 * fração `--journey-progress` do computado dos dois (em vez de tentar
 * medir o pseudo-elemento `::before` por `getBoundingClientRect`, que a
 * API do DOM não permite).
 */
async function cenaProgressoC5(sessao, commit, pasta) {
  await acordarChromeDoFilme(sessao);
  let hover = null;
  let tabsAteFoco = -1;
  let foco = null;
  let duranteArrasto = null;
  let aposSoltarCedo = null;
  let aposAssentar = null;

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      // 1) HOVER — mouse real sobre a barra
      const rBarra = await retanguloDe(sessao, '.progress-wrap');
      if (!rBarra) throw new Error('v5: ".progress-wrap" não encontrado');
      await moverMouse(sessao, rBarra.x + rBarra.width / 2, rBarra.y + rBarra.height / 2);
      await dorme(250); // var(--t-assenta) = 180ms, com folga
      hover = await sessao.js(jsProgresso());
      await moverMouse(sessao, 10, 10);
      await dorme(200);

      // 2) FOCO POR TECLADO — só o Tab real decide `:focus-visible`
      await sessao.js('document.activeElement && document.activeElement.blur()');
      tabsAteFoco = await tabularAte(sessao, '.progress-wrap', 30);
      await dorme(250);
      foco = await sessao.js(jsProgresso());

      // 3) ARRASTO — pressiona a ~20% da barra, arrasta até ~70%, solta
      const rBarra2 = await retanguloDe(sessao, '.progress-wrap');
      const y = rBarra2.y + rBarra2.height / 2;
      const x0 = rBarra2.x + rBarra2.width * 0.2;
      const x1 = rBarra2.x + rBarra2.width * 0.7;
      const base = { button: 'left', pointerType: 'mouse' };
      await sessao.send('Input.dispatchMouseEvent', {
        ...base, x: x0, y, type: 'mousePressed', buttons: 1, clickCount: 1,
      });
      for (let n = 1; n <= 8; n++) {
        const x = x0 + ((x1 - x0) * n) / 8;
        await sessao.send('Input.dispatchMouseEvent', { ...base, x, y, type: 'mouseMoved', buttons: 1 });
      }
      duranteArrasto = await sessao.js(jsProgresso());
      await sessao.send('Input.dispatchMouseEvent', { ...base, x: x1, y, type: 'mouseReleased', buttons: 0 });
      aposSoltarCedo = await sessao.js(jsProgresso());
      await dorme(300); // o deslize de 0,18s do preenchimento, com folga
      aposAssentar = await sessao.js(jsProgresso());
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v5-progresso-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v5-progresso-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, hover, tabsAteFoco, foco, duranteArrasto, aposSoltarCedo, aposAssentar,
  };
}

function jsBotaoFicarNesteCeu() {
  return `(() => {
    const veu = document.querySelector('.veil-end');
    const btn = veu ? veu.querySelector('.veil-btn--primario') : null;
    const veuEscondido = veu ? veu.className.includes('hidden-veil') : null;
    if (!btn) return { existe: false, veuEscondido };
    const cs = getComputedStyle(btn);
    const csAfter = getComputedStyle(btn, '::after');
    const r = btn.getBoundingClientRect();
    const noPonto = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      existe: true,
      veuEscondido,
      disabled: btn.disabled,
      pointerEvents: cs.pointerEvents,
      clicavel: Boolean(noPonto && noPonto.closest('.veil-btn--primario') === btn),
      animationName: csAfter.animationName,
      animationDelay: csAfter.animationDelay,
      animationDuration: csAfter.animationDuration,
      // O RETÂNGULO JUNTO (conserto da V6): o rodapé tem a PRÓPRIA
      // entrada (a animação encerramento-entra, translateY(0.5rem)->0 no
      // MESMO atraso do aceno), então o botão ainda se desloca uns px
      // enquanto o aceno passa — um retângulo só do início recortaria
      // torto perto do fim. Cada amostra traz o seu, no mesmo instante.
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
    };
  })()`;
}

/**
 * V6 — A TELA FINAL: o `seek` (o mesmo instante de `filme-smoke.mjs`,
 * 192,8 — "os últimos 0,2s do corte") entra DENTRO da gravação, e não
 * antes dela. A 1ª leva assentava (`esperarAssentar`) FORA do clipe: a
 * fase tinha tempo de sobra para virar 'end', o véu de subir e até o
 * aceno inteiro de acontecer — sem câmera nenhuma ligada —, e a
 * amostragem, presa a só 4s depois do véu, terminava antes do rodapé
 * sequer nascer (o `--cta-atraso` dele é ATRASO_DO_RODAPE,
 * `encerramento.ts`, uns 8s). O clipe saía cortado no meio da citação,
 * sem "Ficar neste céu" nem o aceno dele aparecerem nunca. Agora a fase
 * 'end', o véu e o aceno INTEIRO do CTA (`::after`, `reflexoDeAbertura`)
 * ficam dentro da janela gravada. A JANELA não é um número decorado: sai
 * do PRÓPRIO computado do botão (`animationDelay`+`animationDuration`,
 * que É `--cta-atraso`) lido depois que o véu sobe — só ali a regra
 * `.veil:not(.hidden-veil) .veil-btn--primario::after` passa a valer e
 * o computado deixa de ser "none"/"0s".
 */
async function cenaFimC5(sessao, commit, pasta) {
  let chegouFimAos = null;
  let veuVisivelAos = null;
  let delayMs = 0;
  let duracaoMs = 0;
  let janelaMs = 0;
  let amostras = [];
  let tVeu = 0;

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      await sessao.js('window.__director.seek(192.8)');
      chegouFimAos = await esperarPor({ js: sessao.js }, "window.__director.captura.fase === 'end'", 15000);
      veuVisivelAos = await esperarPor(
        { js: sessao.js },
        "document.querySelector('.veil-end')?.className.includes('hidden-veil') === false",
        8000
      );
      tVeu = Date.now();
      const cta = await sessao.js(jsBotaoFicarNesteCeu());
      if (!cta.existe) throw new Error('v6: "Ficar neste céu" não existe depois do véu subir');
      delayMs = Math.round((Number.parseFloat(cta.animationDelay) || 0) * 1000);
      duracaoMs = Math.round((Number.parseFloat(cta.animationDuration) || 0) * 1000);
      if (delayMs <= 0) {
        throw new Error(`v6: animationDelay do CTA leu "${cta.animationDelay}" (esperava ~8s de ATRASO_DO_RODAPE)`);
      }
      // 900ms de folga: a viagem de ida e volta do CDP não pode cortar a
      // última amostra antes do aceno de fato terminar.
      janelaMs = delayMs + duracaoMs + 900;
      amostras = await amostrarSequencia(
        sessao, tVeu,
        [
          0,
          Math.round(delayMs / 2),
          delayMs,
          delayMs + Math.round(duracaoMs / 2),
          delayMs + duracaoMs,
          janelaMs,
        ],
        jsBotaoFicarNesteCeu
      );
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v6-fim-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v6-fim-${commit}.png`));
  const sempreClicavel =
    amostras.length > 0 && amostras.every((a) => a.existe && !a.disabled && a.pointerEvents !== 'none' && a.clicavel);

  // A FAIXA DE RECORTES DO BOTÃO ao longo do aceno inteiro (pedido do
  // enunciado): `quadroMaisProximoDoAlvo` (a mesma régua do `--contorno`,
  // mais abaixo neste arquivo) acha o quadro cujo timestamp REAL do CDP
  // mais bate com cada instante amostrado — sem supor quadros igualmente
  // espaçados dentro da gravação.
  const recortes = amostras.filter((a) => a.rect).map((a, i) => {
    const quadro = quadroMaisProximoDoAlvo(quadros, tVeu, a.dtMs);
    const pad = 16;
    const x = Math.max(0, Math.round(a.rect.x) - pad);
    const y = Math.max(0, Math.round(a.rect.y) - pad);
    const largura = Math.round(a.rect.width) + pad * 2;
    const altura = Math.round(a.rect.height) + pad * 2;
    const destino = semSobrescrever(resolve(CAPTURAS, `motion-c5-v6-recorte${i + 1}-${commit}.png`));
    const r = spawnSync(FFMPEG, [
      '-y', '-i', quadro.arquivo,
      '-vf', `crop=${largura}:${altura}:${x}:${y}`,
      destino,
    ], { stdio: 'pipe' });
    if (r.status !== 0) {
      throw new Error(`ffmpeg (recorte v6) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
    }
    return destino;
  });

  return {
    clipe, folha, quadros: quadros.length, chegouFimAos, veuVisivelAos,
    delayMs, duracaoMs, janelaMs, amostras, sempreClicavel, recortes,
  };
}

/** o mesmo carregamento do Atlas que `rodarSequencia`/`rodarFolha` já
 *  usam — cópia local, porque a convenção deste arquivo é cada modo ter
 *  a sua, não uma abstração nova compartilhada entre todos. */
async function carregarAtlasC5(sessao) {
  let assentou = null;
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
    try {
      assentou = await sessao.ir(QUERY);
    } catch (e) {
      ultimoErro = e;
      process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
      await dorme(500);
    }
  }
  if (!assentou) throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
  await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_GATILHO}'))`, 10000);
  await pularTour(sessao);
  await dorme(300);
}

/**
 * UM CORPO com nome DESENHADO na tela (V7) — a mesma lista pública que
 * `a11y.mjs`/`a11y-celular.mjs` já leem (`rotulos.alvos`, "a última
 * projeção — a lista ÚNICA que o clique lê", `director/rotulos.ts`),
 * com `x`/`y` em FRAÇÃO 0..1 — a MESMA conta que `gestos.ts:onPointerUp`
 * faz de `clientX/innerWidth` antes de escolher, então multiplicar por
 * `innerWidth`/`innerHeight` aqui não é aproximação, é a régua que o
 * clique de verdade usa. Só candidatos com TEXTO (nunca um `icone`, que
 * não escreve nome nenhum) e confirmados por DOIS testes independentes:
 * `elementFromPoint` cai no canvas da cena (não numa gaveta por cima) e
 * `escada.chaveApontada` (o mesmo hit-test do hover, `director.ts`)
 * aponta para a MESMA chave. NUNCA o Sol (`corpo:sun`, peso 100 — o mais
 * alto da tabela depois do foco, então costuma vir primeiro): medido, o
 * clique nele reenquadra ~200px (não é um corpo qualquer, é a origem do
 * sistema) e a cor dele é ambarina por natureza, o que contaminaria
 * justamente a contagem de pixels âmbar que a V7 faz depois.
 */
async function acharCorpoDesenhado(sessao, excluir = []) {
  return sessao.js(`(() => {
    const excluir = ${JSON.stringify(excluir)};
    const alvos = window.__director?.rotulos?.alvos ?? [];
    for (const l of alvos) {
      if (!l.key || !l.key.startsWith('corpo:')) continue; // CHAVE_DE_CORPO, atlasConfig.ts
      if (l.key === 'corpo:sun') continue;
      if (excluir.includes(l.key)) continue; // v9: pula corpos já usados noutro passo da mesma cena
      if (l.desenhado !== true || (l.opacity ?? 0) < 0.15) continue;
      if (l.icone || l.textoInvisivel) continue;
      const x = Math.round(l.x * window.innerWidth);
      const y = Math.round(l.y * window.innerHeight);
      if (x <= 0 || y <= 0 || x >= window.innerWidth - 1 || y >= window.innerHeight - 1) continue;
      const noPonto = document.elementFromPoint(x, y);
      if (!noPonto || !noPonto.classList.contains('scene-canvas')) continue;
      const chave = window.__director.escada.chaveApontada(x / window.innerWidth, y / window.innerHeight);
      if (chave !== l.key) continue;
      return { key: l.key, name: l.name, x, y };
    }
    return null;
  })()`);
}

/** a cor do acento (`acentoDaSelecao`, `LabelCanvas.ts`) é #e2b872; a
 *  tolerância absorve o anti-serrilhado contra o fundo escuro sem
 *  confundir com o azul/violeta do céu ao redor. */
const COR_DO_ACENTO = [0xe2, 0xb8, 0x72];
const TOLERANCIA_DO_ACENTO = 55;

/** conta pixels a até `TOLERANCIA_DO_ACENTO` (distância euclidiana em
 *  RGB) de `COR_DO_ACENTO` num PNG — o recorte inteiro já É a "pequena
 *  região ao redor do marcador" (160×160px centrados nele), então não
 *  há um segundo raio para recortar por cima do recorte. */
async function contarPixelsAmbar(caminhoDoPng) {
  const { data, info } = await sharp(caminhoDoPng).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - COR_DO_ACENTO[0];
    const dg = data[i + 1] - COR_DO_ACENTO[1];
    const db = data[i + 2] - COR_DO_ACENTO[2];
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= TOLERANCIA_DO_ACENTO) n++;
  }
  return { n, dePixels: info.width * info.height };
}

/** a posição projetada (px de viewport) do MESMO corpo, lida de novo —
 *  o acessório de depuração que a V7 usa para PERSEGUIR o marcador
 *  quadro a quadro, e não só achá-lo uma vez. */
function jsPosicaoDoRotulo(chave) {
  return `(() => {
    const l = (window.__director?.rotulos?.alvos ?? []).find((r) => r.key === ${JSON.stringify(chave)});
    return l
      ? { x: Math.round(l.x * window.innerWidth), y: Math.round(l.y * window.innerHeight) }
      : { x: null, y: null };
  })()`;
}


/** instala, em página, um laço de `requestAnimationFrame` que grava a
 *  série `{t, ambar, reduz}` do acento de UM corpo por até `TETO_MS` —
 *  o substituto do relógio de FORA (`amostrarSequencia`), que não
 *  alcança os 200ms do acento: cada ida e volta por CDP custa
 *  ~90-100ms (medido: `dtMs` reais 0/195/275/359 para alvos nominais
 *  0/70/120/180 — a janela não sobrevive nem a duas idas). Gravando POR
 *  QUADRO, DENTRO da página, uma única leitura no fim
 *  (`window.__acentoRec.am`) recupera a série inteira sem nenhuma ida e
 *  volta no meio do que importa. `rec` é uma variável LOCAL ao
 *  fechamento do laço, nunca `window.__acentoRec` relido a cada
 *  quadro — de propósito: se esta função for chamada de novo antes
 *  deste laço chegar ao teto (o passo B lê aos ~400ms, bem antes do
 *  teto de 900ms), o laço velho continua escrevendo no SEU PRÓPRIO
 *  objeto órfão, nunca no do próximo passo. A contagem relê a posição
 *  do rótulo A CADA QUADRO (o corpo se move enquanto a câmera
 *  reenquadra) e conta pixels do MESMO `canvas.label-canvas` que
 *  a leitura usa a mesma cor/tolerância/alfa mínimo da V7 —
 *  duplicado aqui (em vez de chamado) para não mexer na leitura de piso
 *  já testada em Chrome de verdade.
 *
 *  `cliqueEm` (opcional, `{x, y}` em px de viewport) resolve o resto do
 *  problema: nem o clique nem o toggle da preferência cabem os DOIS de
 *  FORA, por CDP, dentro dos 200ms do acento (~90-100ms de ida e volta
 *  cada). Passando `cliqueEm`, o PRÓPRIO gravador agenda, com
 *  `setTimeout(40)`, um clique sintético SINTETIZADO em página
 *  (`pointerdown`+`pointerup`+`click` em `document.elementFromPoint` do
 *  ponto, testado em Chrome de verdade: o app seleciona por esse
 *  caminho) — só o toggle continua vindo por CDP, e chega ~90-130ms
 *  depois da instalação, com o clique (40ms) já disparado e o acento já
 *  aceso. O instante do disparo fica em `rec.tClique`, para quem lê a
 *  série depois. Omitido, nenhum clique é agendado (o passo B não
 *  clica em nada; o passo C clica por CDP, sem corrida com mais nada). */
function jsInstalarGravadorDeAcento(chave, cliqueEm = null) {
  const trechoClique = cliqueEm ? `
    setTimeout(() => {
      // O PONTO DO CLIQUE É O DE AGORA, não o de quando a sonda achou o
      // corpo: entre uma coisa e outra a câmera reenquadra (a ficha do
      // clique anterior mudou a área útil) e o ponto velho erra o
      // marcador — medido em 12/09, com o ponto velho o acento não
      // acendia e o passo A media só o fundo. O ponto achado fica de
      // reserva, para o caso de o corpo ter saído da lista.
      const vivoAgora = (window.__director?.rotulos?.alvos ?? []).find((r) => r.key === ${JSON.stringify(chave)});
      const px = vivoAgora ? Math.round(vivoAgora.x * window.innerWidth) : ${cliqueEm.x};
      const py = vivoAgora ? Math.round(vivoAgora.y * window.innerHeight) : ${cliqueEm.y};
      rec.tClique = Math.round(performance.now() - rec.t0);
      const alvoEl = document.elementFromPoint(px, py);
      if (!alvoEl) return;
      rec.ondeClicou = alvoEl.className || alvoEl.tagName;
      const init = {
        clientX: px, clientY: py, bubbles: true, cancelable: true,
        pointerId: 1, isPrimary: true, button: 0,
      };
      alvoEl.dispatchEvent(new PointerEvent('pointerdown', init));
      alvoEl.dispatchEvent(new PointerEvent('pointerup', init));
      alvoEl.dispatchEvent(new MouseEvent('click', init));
    }, 12);` : '';
  return `(() => {
    const TETO_MS = 900;
    const cor = ${JSON.stringify(COR_DO_ACENTO)};
    const tolerancia = ${TOLERANCIA_DO_ACENTO};
    const contarAmbarPerto = (x, y) => {
      const cv = document.querySelector('canvas.label-canvas');
      if (!cv) return null;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      const escala = cv.width / cv.clientWidth;
      const ladoBuffer = Math.round(120 * escala);
      const x0 = Math.max(0, Math.min(cv.width - ladoBuffer, Math.round(x * escala - ladoBuffer / 2)));
      const y0 = Math.max(0, Math.min(cv.height - ladoBuffer, Math.round(y * escala - ladoBuffer / 2)));
      const dados = ctx.getImageData(x0, y0, ladoBuffer, ladoBuffer).data;
      let ambar = 0;
      for (let i = 0; i < dados.length; i += 4) {
        if (dados[i + 3] < 20) continue;
        const dr = dados[i] - cor[0];
        const dg = dados[i + 1] - cor[1];
        const db = dados[i + 2] - cor[2];
        if (Math.sqrt(dr * dr + dg * dg + db * db) <= tolerancia) ambar++;
      }
      return ambar;
    };
    const rec = { t0: performance.now(), am: [], tClique: null };
    window.__acentoRec = rec;
    const passo = () => {
      const t = Math.round(performance.now() - rec.t0);
      const l = (window.__director?.rotulos?.alvos ?? []).find((r) => r.key === ${JSON.stringify(chave)});
      const ambar = l
        ? contarAmbarPerto(Math.round(l.x * window.innerWidth), Math.round(l.y * window.innerHeight))
        : null;
      rec.am.push({ t, ambar, reduz: matchMedia('(prefers-reduced-motion: reduce)').matches });
      if (t < TETO_MS) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);${trechoClique}
  })()`;
}

/**
 * V7 — O ACENTO DO CÉU: acha um NOME DE VERDADE já desenhado na tela
 * (`acharCorpoDesenhado`) e clica NELE — o mesmo ponto que
 * `a11y.mjs`/`a11y-celular.mjs` já usam para achar um rótulo de verdade
 * em vez de sortear um pixel. A 1ª gravação escolhia pela BUSCA (o
 * fluxo da C3), que seleciona pelo NOME sem saber se o marcador está em
 * quadro — Júpiter caiu fora, a câmera voou por segundos reenquadrando,
 * e os 200ms do acento (`acentoDaSelecao`, `LabelCanvas.ts`) passaram
 * inteiros fora da gravação. Clicando um nome que JÁ ESTÁ na tela
 * (vista padrão do Atlas, tour pulado, nada selecionado) a câmera não
 * VOA para lá — mas ainda REENQUADRA um pouco (a ficha que abre ao lado
 * muda a área útil, medido: um corpo qualquer derivou umas dezenas de
 * px em menos de 1s), o bastante para um recorte ESTÁTICO perder o
 * marcador antes mesmo do acento acabar (medido: 1 pixel âmbar nos
 * primeiros 160ms). Por isso a V7 PERSEGUE: `amostrarSequencia` relê a
 * posição projetada do MESMO corpo (`jsPosicaoDoRotulo`) em cada alvo
 * de ms, e cada recorte usa a posição DAQUELE instante, não a do clique.
 */
async function cenaAcentoC5(sessao, commit, pastaClipe) {
  const alvo = await acharCorpoDesenhado(sessao);
  if (!alvo) throw new Error('v7: nenhum nome de corpo desenhado e clicável na vista padrão do Atlas');

  const alvosMs = [0, 80, 160, 250, 500];
  let tClique = 0;
  let rastro = [];
  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pastaClipe },
    async () => {
      await dorme(150); // garante o screencast já armado antes do clique
      tClique = Date.now();
      await clicarEmPonto(sessao, alvo.x, alvo.y);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_FICHA_PAINEL}'))`, 3000);
      rastro = await amostrarSequencia(sessao, tClique, alvosMs, () => jsPosicaoDoRotulo(alvo.key));
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v7-acento-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v7-acento-${commit}.png`));

  // RECORTES EM RESOLUÇÃO CHEIA (160×160, pedido do enunciado), UM POR
  // AMOSTRA DO RASTRO — cada um centrado na posição TRACKED daquele
  // instante (ou na do clique, se o corpo sumiu da lista). O quadro vem
  // de `quadroMaisProximoDoAlvo` (a mesma régua do `--contorno`, mais
  // abaixo neste arquivo): o quadro cujo timestamp REAL do CDP mais bate
  // com o `dtMs` REAL da amostra (nunca o alvo nominal). Os alvos cobrem
  // os ~200ms do acento (`DURACAO_DO_ACENTO_MS`, LabelCanvas.ts) e um
  // instante bem depois, já apagado.
  const LADO = 160;
  const recortes = rastro.map((a, i) => {
    const cx = a.x ?? alvo.x;
    const cy = a.y ?? alvo.y;
    const x0 = Math.max(0, Math.min(1440 - LADO, Math.round(cx - LADO / 2)));
    const y0 = Math.max(0, Math.min(900 - LADO, Math.round(cy - LADO / 2)));
    const quadro = quadroMaisProximoDoAlvo(quadros, tClique, a.dtMs);
    const destino = semSobrescrever(resolve(CAPTURAS, `motion-c5-v7-recorte${i + 1}-${commit}.png`));
    const r = spawnSync(FFMPEG, [
      '-y', '-i', quadro.arquivo,
      '-vf', `crop=${LADO}:${LADO}:${x0}:${y0}`,
      destino,
    ], { stdio: 'pipe' });
    if (r.status !== 0) {
      throw new Error(`ffmpeg (recorte v7) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
    }
    return destino;
  });

  // A CONTAGEM DE PIXELS ÂMBAR em cada recorte — a medida que o
  // enunciado pede, não "parece que sim".
  const contagens = [];
  for (const arq of recortes) contagens.push(await contarPixelsAmbar(arq));

  const ultimoRastro = [...rastro].reverse().find((a) => a.x !== null) ?? null;
  const derivaPx = ultimoRastro ? Math.round(Math.hypot(ultimoRastro.x - alvo.x, ultimoRastro.y - alvo.y)) : null;

  return {
    clipe, folha, quadros: quadros.length, recortes, contagens, alvo, alvosMs, rastro, derivaPx,
  };
}

/**
 * V9 — O ACENTO PARA COM "REDUZIR MOVIMENTO": o acento do céu
 * (`acentoDaSelecao`, `LabelCanvas.ts`) dura só 200ms — curto demais
 * para o relógio de FORA. Duas idas e voltas por CDP (clique + toggle
 * da preferência, ~90-100ms cada, medido) não cabem as duas dentro da
 * janela; e amostrar por CDP no meio (`amostrarSequencia`) tampouco
 * alcança (medido: `dtMs` reais 0/195/275/359 para alvos nominais
 * 0/70/120/180). A V9 resolve em DUAS partes:
 *   - grava POR QUADRO DENTRO DA PÁGINA (`jsInstalarGravadorDeAcento`,
 *     um laço de rAF que empurra `{t, ambar, reduz}` em
 *     `window.__acentoRec`) e lê a série inteira numa única chamada,
 *     depois do teto — nenhuma ida e volta no meio da janela que
 *     importa. A contagem lê o `canvas.label-canvas` (2D, transparente,
 *     sem o piso ambarino de anéis/órbitas do `scene-canvas` WebGL por
 *     trás — medido: ~37 em Júpiter, ~70 em Saturno);
 *   - no passo A, o CLIQUE que acende o acento a medir também sai de
 *     DENTRO da página (agendado pelo próprio gravador via
 *     `setTimeout(40)` — ver `cliqueEm` em `jsInstalarGravadorDeAcento`),
 *     e só o toggle da preferência continua vindo por CDP, na linha
 *     seguinte, sem `dorme` no meio: ele chega ~90-130ms depois da
 *     instalação — o clique (40ms) já rodou e o acento já está aceso —
 *     no MEIO da janela de 200ms, não perto do fim ou depois dela.
 * Três passos, um clipe só (o clipe/folha de contato continuam como
 * prova visual; quem julga é a série gravada):
 *   A) clica um corpo (por CDP) só para abrir uma ficha e deixar o
 *      acento DELE morrer sozinho (`dorme(500)`); mede o PISO do 2º
 *      corpo (ainda sem acento), instala o gravador JÁ com o clique
 *      nele agendado, e manda o toggle imediatamente depois;
 *   B) com a preferência ainda ligada, desliga sem clicar em nada: se o
 *      acento reaparecesse só por isso, seria a seleção ANTIGA (a de A)
 *      vazando de volta pelo toggle, não uma escolha nova;
 *   C) mede o PISO de um TERCEIRO corpo, instala o gravador e clica
 *      nele por CDP (aqui não há corrida com mais nada): a PRÓXIMA
 *      seleção de verdade tem de voltar a acender e apagar nos mesmos
 *      ~200ms de sempre, provando que A/B não deixaram o mecanismo do
 *      acento travado.
 * "Vivo"/"apagado" são sempre relativos ao PISO de cada corpo
 * (`piso + 25` / `piso + 12`), nunca um valor absoluto. Se, mesmo com o
 * clique agendado, a preferência ainda chegar tarde demais perto do
 * acento (`tPreferencia - tAcendeu > 150`), o passo A continua
 * INCONCLUSIVO — é uma medida honesta, não um teste que se autoaprova.
 */
async function cenaAcentoReduzidoC5(sessao, commit, pastaClipe) {
  await pressionarEscape(sessao); // garante nenhum painel aberto antes do 1º clique
  await dorme(300);

  const alvo1 = await acharCorpoDesenhado(sessao);
  if (!alvo1) throw new Error('v9: nenhum corpo desenhado para abrir a 1ª ficha (passo A, partida)');

  let alvo2 = null;
  let alvo3 = null;
  let pisoA = null;
  let pisoC = null;
  let tCliqueA = null;
  let serieA = [];
  let serieB = [];
  let serieC = [];

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pastaClipe },
    async () => {
      await dorme(150); // garante o screencast já armado antes do 1º clique

      // PASSO A, 1ª metade — o 1º corpo só abre uma ficha para deixar o
      // acento DELE morrer sozinho; o acento a MEDIR é o da 2ª escolha.
      await clicarEmPonto(sessao, alvo1.x, alvo1.y);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_FICHA_PAINEL}'))`, 3000);
      await dorme(500);

      alvo2 = await acharCorpoDesenhado(sessao, [alvo1.key]);
      if (!alvo2) throw new Error('v9: nenhum 2º corpo desenhado, diferente do 1º, para medir no passo A');

      // PASSO A, 2ª metade — nem o clique nem o toggle cabem os dois de
      // FORA, por CDP, dentro dos 200ms (~90-100ms de ida e volta cada).
      // O CLIQUE sai de DENTRO da página, agendado pelo próprio gravador
      // (`setTimeout(12)` — 40ms deixava a preferência chegar ANTES do
      // clique quando o CDP vinha rápido, e aí nem acento havia para
      // interromper); o toggle continua por CDP, na linha
      // seguinte, sem `dorme` no meio — chega ~90-130ms depois da
      // instalação, com o acento já aceso havia umas dezenas de ms.
      await sessao.js(jsInstalarGravadorDeAcento(alvo2.key, { x: alvo2.x, y: alvo2.y }));
      // A ORDEM NÃO PODE SER SORTEADA: espera-se o clique ter ACONTECIDO
      // de fato antes de mandar o toggle. Sem isso o comando de CDP às
      // vezes chegava PRIMEIRO (medido em 12/09: preferência aos 15ms,
      // clique aos 43) e aí não havia acento nenhum para interromper — a
      // rodada saía inconclusiva por sorteio. A espera custa uma ida e
      // volta, então a preferência pousa uns 45-135ms depois do clique:
      // no meio dos 200ms, que é onde o defeito mora.
      await esperarPor({ js: sessao.js }, 'window.__acentoRec?.tClique !== null', 2000);
      await sessao.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      await dorme(900);
      const recA = await sessao.js('window.__acentoRec');
      serieA = recA.am;
      tCliqueA = recA.tClique;

      // PASSO B — a preferência CONTINUA ligada por mais 300ms antes de
      // desligar: se o acento reaparecesse só por desligar o toggle,
      // seria a seleção ANTIGA (a do passo A) vazando de volta — por
      // isso nada é clicado aqui, só mais um gravador do MESMO corpo.
      await dorme(300);
      await sessao.send('Emulation.setEmulatedMedia', { features: [] });
      await sessao.js(jsInstalarGravadorDeAcento(alvo2.key));
      await dorme(400);
      serieB = (await sessao.js('window.__acentoRec')).am;

      // PASSO C — a PRÓXIMA seleção de verdade, num 3º corpo: prova que
      // A/B não deixaram o mecanismo do acento travado. Aqui não há
      // corrida com mais nada, o clique continua vindo por CDP.
      alvo3 = await acharCorpoDesenhado(sessao, [alvo1.key, alvo2.key]);
      if (!alvo3) throw new Error('v9: nenhum 3º corpo desenhado, diferente dos dois anteriores, para o passo C');
      await sessao.js(jsInstalarGravadorDeAcento(alvo3.key));
      await clicarEmPonto(sessao, alvo3.x, alvo3.y);
      await dorme(900);
      serieC = (await sessao.js('window.__acentoRec')).am;
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v9-acento-reduzido-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v9-acento-reduzido-${commit}.png`));

  // O PISO SAI DA PRÓPRIA SÉRIE — a mediana dos ÚLTIMOS cinco quadros,
  // quando o acento já acabou de qualquer jeito. Medir o piso ANTES do
  // clique (12/09) dava um número de outro lugar da tela: a câmera
  // reenquadra, o recorte de 120px viaja com o marcador e o fundo
  // debaixo dele muda — num caso o "piso" saiu 148 com a série inteira
  // abaixo de 107, e nenhum quadro podia ser VIVO.
  const pisoDaSerie = (serie) => {
    const caudas = serie.slice(-5).map((a) => a.ambar ?? 0).sort((x, y) => x - y);
    return caudas.length ? caudas[Math.floor(caudas.length / 2)] : 0;
  };
  // "VIVO"/"APAGADO" relativos ao PISO (nunca um valor absoluto). As
  // margens são largas porque a separação medida é larga: o acento vale
  // ~500 pixels âmbar contra um piso de 50-90, que oscila ±30 enquanto o
  // marcador anda sobre o céu.
  const vivo = (amostra, piso) => amostra.ambar >= piso + 150;
  const apagado = (amostra, piso) => amostra.ambar <= piso + 60;
  pisoA = pisoDaSerie(serieA);
  pisoC = pisoDaSerie(serieC);
  const primeiroT = (serie, teste) => serie.find(teste)?.t ?? null;

  // PASSO A: `tAcendeu` é o `t` do 1º quadro VIVO; `tPreferencia`, o `t`
  // do 1º quadro com `reduz === true`. Sem os dois, ou com a preferência
  // chegando tarde demais perto do acento (>150ms depois de acender), a
  // rodada é INCONCLUSIVA — faltou prova, não é um FALHA do app.
  const tAcendeuA = primeiroT(serieA, (a) => vivo(a, pisoA));
  const tPreferenciaA = primeiroT(serieA, (a) => a.reduz === true);
  let vereditoA;
  if (tAcendeuA === null || tPreferenciaA === null || tPreferenciaA - tAcendeuA > 150) {
    vereditoA = 'INCONCLUSIVO';
  } else {
    const ultimoAntes = [...serieA].reverse().find((a) => a.t < tPreferenciaA);
    const vivoAntesDaPreferencia = Boolean(ultimoAntes) && vivo(ultimoAntes, pisoA);
    const apagadoDepoisDaPreferencia = serieA
      .filter((a) => a.t >= tPreferenciaA + 50)
      .every((a) => apagado(a, pisoA));
    vereditoA = vivoAntesDaPreferencia && apagadoDepoisDaPreferencia ? 'PASSA' : 'FALHA';
  }

  // PASSO B: o piso é o MESMO do passo A (mesmo corpo) — desligar não
  // pode reacender a seleção antiga.
  const tAcendeuB = primeiroT(serieB, (a) => vivo(a, pisoA));
  const tPreferenciaB = primeiroT(serieB, (a) => a.reduz === true);
  const vereditoB = serieB.every((a) => apagado(a, pisoA)) ? 'PASSA' : 'FALHA';

  // PASSO C: houve quadro vivo, e todo quadro 260ms depois dele (já fora
  // dos 200ms do acento) está apagado.
  const tAcendeuC = primeiroT(serieC, (a) => vivo(a, pisoC));
  const tPreferenciaC = primeiroT(serieC, (a) => a.reduz === true);
  const vereditoC = tAcendeuC !== null
    && serieC.filter((a) => a.t >= tAcendeuC + 260).every((a) => apagado(a, pisoC))
    ? 'PASSA' : 'FALHA';

  const veredito = combinarVereditos([vereditoA, vereditoB, vereditoC]);

  return {
    clipe, folha, quadros: quadros.length, alvo1, alvo2, alvo3, veredito,
    passoA: {
      piso: pisoA, serie: serieA, tClique: tCliqueA, tAcendeu: tAcendeuA, tPreferencia: tPreferenciaA,
      veredito: vereditoA,
    },
    passoB: { piso: pisoA, serie: serieB, tAcendeu: tAcendeuB, tPreferencia: tPreferenciaB, veredito: vereditoB },
    passoC: { piso: pisoC, serie: serieC, tAcendeu: tAcendeuC, tPreferencia: tPreferenciaC, veredito: vereditoC },
  };
}

function jsDica(idDica) {
  return `(() => {
    const el = document.getElementById(${JSON.stringify(idDica)});
    if (!el) return { existe: false };
    const cs = getComputedStyle(el);
    return { existe: true, hidden: el.hidden, animationName: cs.animationName, opacity: cs.opacity };
  })()`;
}

/**
 * V8 — A DICA DE AJUDA ("?", `Ajuda.tsx`): o hover mostra (`entraDica`,
 * `--t-rapido` = 120ms) e a saída do mouse esconde de imediato — não há
 * saída animada, o atributo `hidden` alterna direto. Usa um "?" do
 * painel de Ajustes (o mesmo componente que a barra do tempo também
 * usa).
 */
async function cenaDicaC5(sessao, commit, pasta) {
  await pressionarEscape(sessao); // fecha a ficha do V7, se ainda aberta
  await dorme(300);
  await clicarReal(sessao, SEL_AJUSTES_GATILHO);
  await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_AJUSTES_PAINEL}'))`, 3000);
  await dorme(400); // assenta a entrada do painel antes de medir

  const seletorAjuda = `${SEL_AJUSTES_PAINEL} .hud-ajuda`;
  const rAjuda = await retanguloDe(sessao, seletorAjuda);
  if (!rAjuda) throw new Error(`v8: "${seletorAjuda}" não encontrado`);
  const idDica = await sessao.js(
    `document.querySelector(${JSON.stringify(seletorAjuda)})?.getAttribute('aria-controls') ?? null`
  );
  if (!idDica) throw new Error('v8: o "?" não tem aria-controls');

  let antes = null;
  let durante = [];
  let depois = [];
  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      antes = await sessao.js(jsDica(idDica));
      const t0 = Date.now();
      await moverMouse(sessao, rAjuda.x + rAjuda.width / 2, rAjuda.y + rAjuda.height / 2);
      durante = await amostrarSequencia(sessao, t0, [16, 80, 200], () => jsDica(idDica));
      const t1 = Date.now();
      await moverMouse(sessao, 10, 10);
      depois = await amostrarSequencia(sessao, t1, [16, 80, 200], () => jsDica(idDica));
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v8-dica-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v8-dica-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, antes, durante, depois,
  };
}

async function rodarC5(quais = null) {
  const roda = (v) => !quais || quais.has(v);
  mkdirSync(CAPTURAS, { recursive: true });
  const pastas = Object.fromEntries(
    ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'].map(
      (v) => [v, resolve(tmpdir(), `sonda-motion-c5-${v}-${process.pid}`)]
    )
  );
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: JANELA, prefixo: 'sonda-motion-c5' });
    const viewport = {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    };
    await sessao.send('Emulation.setDeviceMetricsOverride', viewport);
    // registra o viewport para o vigia da aba intrusa reaplicar depois de
    // fechar uma intrusa (ver o comentário em `abrirSonda`) — `--c5` não
    // troca de viewport em nenhuma cena, então um registro só já basta
    // para a corrida inteira.
    sessao.marcarViewport(viewport);
    const versaoChrome = await sessao.send('Browser.getVersion');

    const v1 = roda('v1') ? await comRetentativa(() => cenaAberturaC5(sessao, commit, pastas.v1)) : null;

    // V2–V6 precisam do filme TOCANDO (`iniciarFilmeC5`); só paga a
    // viagem até lá se alguma delas de fato vai rodar (`--c5=v7` sozinho
    // nunca entra aqui).
    if (roda('v2') || roda('v3') || roda('v4') || roda('v5') || roda('v6')) await iniciarFilmeC5(sessao);
    const v2 = roda('v2') ? await comRetentativa(() => cenaChromeC5(sessao, commit, pastas.v2)) : null;
    const v3 = roda('v3') ? await comRetentativa(() => cenaMaisC5(sessao, commit, pastas.v3)) : null;
    const v4 = roda('v4') ? await comRetentativa(() => cenaTransporteC5(sessao, commit, pastas.v4)) : null;
    const v5 = roda('v5') ? await comRetentativa(() => cenaProgressoC5(sessao, commit, pastas.v5)) : null;
    const v6 = roda('v6') ? await comRetentativa(() => cenaFimC5(sessao, commit, pastas.v6)) : null;

    if (roda('v7') || roda('v8') || roda('v9')) await carregarAtlasC5(sessao);
    const v7 = roda('v7') ? await comRetentativa(() => cenaAcentoC5(sessao, commit, pastas.v7)) : null;
    const v8 = roda('v8') ? await comRetentativa(() => cenaDicaC5(sessao, commit, pastas.v8)) : null;
    const v9 = roda('v9') ? await comRetentativa(() => cenaAcentoReduzidoC5(sessao, commit, pastas.v9)) : null;

    const dpr = await sessao.js('window.devicePixelRatio');
    const relatorio = {
      meta: {
        commit,
        dirty,
        // O SERVIDOR É DE OUTRA ÁRVORE (isolada, item obrigatório do
        // enunciado): `commit`/`dirty` acima são desta sonda, não do
        // app que ela mede.
        appCommit: APP_COMMIT,
        chrome: versaoChrome.product,
        app: APP,
        viewport: { width: JANELA_W, height: JANELA_H },
        dpr,
        idioma: META_DA_QUERY.lang,
        preset: META_DA_QUERY.q,
        ui: META_DA_QUERY.ui,
        cenas: quais ? [...quais].join(',') : 'v1-v9',
        geradoEm: new Date().toISOString(),
      },
      v1, v2, v3, v4, v5, v6, v7, v8, v9,
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c5-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    const linhas = [
      `=== sonda-motion c5 — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app ${APP_COMMIT} ===`,
      `Chrome ${versaoChrome.product} | mesa ${JANELA_W}x${JANELA_H} DPR${dpr} | ${ROTULO_DA_QUERY}`,
    ];
    if (v1) {
      linhas.push(
        `V1 abertura: ${v1.clipe} (${v1.quadros}q) — marcos amostrados=${v1.marcosAmostrados}, com marcoReflexo=${v1.marcosComReflexo}; `
          + `CTA ::after animation=${v1.cta?.animationName} delay=${v1.cta?.animationDelay} duration=${v1.cta?.animationDuration}`
      );
    }
    if (v2) {
      linhas.push(
        `V2 chrome do filme: ${v2.clipe} (${v2.quadros}q) — visível transitionDuration=${v2.visivel.transitionDuration}; `
          + `escondeu aos ${v2.escondida?.escondeuAos}ms (transitionDuration=${v2.escondida?.transitionDuration}); `
          + `revelou aos ${v2.revelada?.revelouAos}ms; escondeu de novo aos ${v2.escondidaDeNovo?.escondeuDeNovoAos}ms`
      );
    }
    if (v3) {
      linhas.push(
        `V3 "Mais": ${v3.clipe} (${v3.quadros}q) — abrir(mouse) classes=${v3.aposAbrirMouse.map((a) => a.painelClasse).join(' / ')}; `
          + `fechar(mouse) classes=${v3.aposFecharMouse.map((a) => `${a.painelClasse}${a.painelInert ? '[inert]' : ''}`).join(' / ')}; `
          + `Tab entrou no painel=${v3.focoAposTab?.foco?.dentroDoPainel}; fechar(teclado) foco voltou ao gatilho=${v3.focoAposFechar?.foco?.ehOGatilho}`
      );
    }
    if (v4) {
      linhas.push(
        `V4 transporte: ${v4.clipe} (${v4.quadros}q) — pausar animation=${v4.aposPausar.map((a) => a.iconeAnimationName).join('/')}; `
          + `retomar animation=${v4.aposRetomar.map((a) => a.iconeAnimationName).join('/')}; `
          + `taxa realce=${v4.aposTaxa.map((a) => a.rateRealceTexto).join('/')} texto=${v4.aposTaxa.map((a) => a.rateTexto).join('/')}`
      );
    }
    if (v5) {
      linhas.push(
        `V5 progresso: ${v5.clipe} (${v5.quadros}q) — hover transform=${v5.hover?.trackTransform}; `
          + `foco após ${v5.tabsAteFoco} Tabs, transform=${v5.foco?.trackTransform} pontoOpacity=${v5.foco?.pontoOpacity}; `
          + `durante o arrasto transform=${v5.duranteArrasto?.trackTransform} distância ponto↔fill=${v5.duranteArrasto?.distanciaPontoFillPx?.toFixed(2)}px; `
          + `logo ao soltar=${v5.aposSoltarCedo?.distanciaPontoFillPx?.toFixed(2)}px, assentado=${v5.aposAssentar?.distanciaPontoFillPx?.toFixed(2)}px`
      );
    }
    if (v6) {
      linhas.push(
        `V6 tela final: ${v6.clipe} (${v6.quadros}q) — chegou a 'end' aos ${v6.chegouFimAos}ms, véu visível aos ${v6.veuVisivelAos}ms; `
          + `aceno do CTA: delay=${v6.delayMs}ms duração=${v6.duracaoMs}ms (sweep ${v6.delayMs}→${v6.delayMs + v6.duracaoMs}ms depois do véu); `
          + `"Ficar neste céu" clicável em todas as ${v6.amostras.length} amostras=${v6.sempreClicavel} `
          + `(animation=${v6.amostras.map((a) => a.animationName).join('/')}); recortes=${v6.recortes.join(', ')}`
      );
    }
    if (v7) {
      linhas.push(
        `V7 acento no céu: alvo="${v7.alvo?.name}" (${v7.alvo?.key}) em (${v7.alvo?.x},${v7.alvo?.y}); `
          + `${v7.clipe} (${v7.quadros}q); deriva da câmera após o clique=${v7.derivaPx}px; `
          + `recortes(ms=${v7.alvosMs.join('/')})=${v7.recortes.join(', ')}; `
          + `pixels âmbar=${v7.contagens.map((c) => c.n).join('/')} de ${v7.contagens[0]?.dePixels ?? '?'} por recorte`
      );
    }
    if (v8) {
      linhas.push(
        `V8 dica de ajuda: ${v8.clipe} (${v8.quadros}q) — antes hidden=${v8.antes?.hidden}; `
          + `durante o hover animation=${v8.durante.map((a) => a.animationName).join('/')} hidden=${v8.durante.map((a) => a.hidden).join('/')}; `
          + `depois de sair hidden=${v8.depois.map((a) => a.hidden).join('/')}`
      );
    }
    if (v9) {
      const notaA = v9.passoA.veredito === 'INCONCLUSIVO'
        ? ' (sem quadro vivo, sem preferência, ou ela chegou tarde demais perto do acento — a rodada não provou nada)'
        : '';
      const resumoPasso = (p) => {
        const maximo = Math.max(...p.serie.map((a) => a.ambar ?? 0));
        const ultimo = p.serie[p.serie.length - 1]?.ambar;
        return `piso=${p.piso} max=${maximo} tAcendeu=${p.tAcendeu} tPreferencia=${p.tPreferencia} `
          + `último=${ultimo} veredito=${p.veredito}`;
      };
      linhas.push(
        `V9 acento reduzido: A/B alvo="${v9.alvo2?.name}" (${v9.alvo2?.key}), C alvo="${v9.alvo3?.name}" (${v9.alvo3?.key}); `
          + `${v9.clipe} (${v9.quadros}q); `
          + `passo A (${resumoPasso(v9.passoA)})${notaA}; `
          + `passo B (${resumoPasso(v9.passoB)}); `
          + `passo C (${resumoPasso(v9.passoC)}); `
          + `veredito geral=${v9.veredito}`
      );
    }
    linhas.push(`JSON: ${destinoJson}`);
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    for (const p of Object.values(pastas)) rmSync(p, { recursive: true, force: true });
  }
}

// ============================================================
// `--contorno` — C6 do plano de motion (docs/PLANO-MOTION-UI.md §7 e
// §12.5): o A/B do halo WebGL de borda (`three/core/contornoDaUi.ts`,
// `?contorno=webgl`) contra o reflexo CSS de sempre
// (`reflexoDeAbertura`, `01-base.css`, que roda nos dois lados — esta
// sonda nunca o desliga). Quatro peças, na ordem do enunciado:
//   1) dois clipes (A sem a flag, B com ela) recortados na FAIXA da
//      borda esquerda/superior do painel (60px fora + 20px dentro),
//      só os 450ms depois do clique, mais UMA imagem lado a lado (A em
//      cima, B embaixo, mesmos instantes relativos ao clique);
//   2) prova por luminância: a faixa 4–20px fora da borda ESQUERDA tem
//      de clarear mais em B que em A enquanto o halo está vivo e
//      voltar a bater com A depois de ~450ms — e ficar no nível de A
//      também em B com `&shot=1` e com "reduzir movimento" ligado (os
//      dois portões que `App.tsx`/`Director` já fecham por código;
//      isto é a PROVA, não a implementação);
//   3) custo pareado: o tempo de GPU do desenho do halo (só existe em
//      B — o mesmo truque de `EXT_disjoint_timer_query_webgl2` de
//      `gpu-profile.mjs`, reescrito aqui porque aquele arquivo dispara
//      um Chrome property ao ser importado, não é uma função) e a
//      distribuição do tempo de quadro (rAF) nos 450ms depois de CADA
//      abertura, A×B, dez aberturas cada — abrindo/fechando a aba
//      Camadas dez vezes, sempre esperando a saída terminar (só assim
//      `montada` volta a `null` e o próximo clique é de novo um
//      nascimento "do nada", o único gatilho que o C6 liga).
// Roda uma vez e relata os números — não é PASSA/FALHA como
// `--interrupcoes`/`--folha`: o veredito de adoção é do dono (aceite
// do C6, linha 542), a régua só mede.
// ============================================================

/**
 * O INSTRUMENTO DE GPU/QUADRO, injetado por
 * `Page.addScriptToEvaluateOnNewDocument` (uma vez por sessão — CDP
 * reaplica sozinho em CADA navegação seguinte). Mesma técnica de
 * `gpu-profile.mjs` (timer query por draw, rótulo pelo texto do
 * shader), reescrita aqui porque IMPORTAR aquele arquivo dispararia o
 * Chrome dele — o cabeçalho desta sonda pede exatamente o contrário.
 * Só um rótulo interessa — `distanciaAoRetangulo`, função só do
 * fragment shader do halo (`contornoDaUi.ts`) — o resto vira `outro` e
 * é descartado.
 *
 * TRÊS COISAS SEMPRE ligadas, com ou sem `EXT_disjoint_timer_query*`
 * (só o tempo de GPU depende da extensão): o rótulo de todo programa
 * (pelo texto dos shaders), o embrulho de TODO desenho (`drawArrays` e
 * primos) e o embrulho do `requestAnimationFrame` (o tempo de quadro
 * não depende da extensão nenhuma). Dois campos novos, para o
 * `--contorno=cancelamento` (`rodarCancelamento`) confirmar que o halo
 * CANCELA, não só que ele desenha:
 *   `desenhosHalo`  — um `{ t, ret }` por desenho do halo (`ret` é o
 *                     ÚLTIMO valor mandado para o uniform `uRetangulo`
 *                     — x, y, width, height em px CSS — do PROGRAMA do
 *                     halo; three.js só reenvia um uniform quando ele
 *                     MUDA, então "o último mandado" já é o corrente).
 *   `gpuPorQuadro`  — um `{ t, ns }` por quadro (rAF), com o tempo de
 *                     GPU de TODOS os desenhos daquele quadro somado
 *                     (não só o halo) — cada query pendente carrega o
 *                     número do quadro em que nasceu (`frame`,
 *                     incrementado no embrulho do rAF) para saber onde
 *                     somar quando o resultado chega, quadros depois.
 */
const SCRIPT_GPU_HALO = `
window.__contornoProf = {
  ready: 0, ext: 0, err: null, halo: [], rafAbs: [], desenhosHalo: [], gpuPorQuadro: [],
};
(() => {
  const G = window.__contornoProf;
  const origGet = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const gl = origGet.call(this, type, attrs);
    if (gl && !G.ready && this.isConnected && (type === 'webgl2' || type === 'webgl')) {
      try { instrument(gl, type === 'webgl2'); } catch (e) { G.err = String((e && e.stack) || e); }
    }
    return gl;
  };
  function instrument(gl, is2) {
    G.ready = 1;
    const ext = window.__contornoSemTimer
      ? null
      : gl.getExtension(is2 ? 'EXT_disjoint_timer_query_webgl2' : 'EXT_disjoint_timer_query');
    G.ext = ext ? 1 : 0;
    const TE = ext ? ext.TIME_ELAPSED_EXT : null;

    const src = new WeakMap();
    const shaders = new WeakMap();
    const label = new WeakMap();
    const oSrc = gl.shaderSource.bind(gl);
    gl.shaderSource = (sh, s) => { src.set(sh, s); oSrc(sh, s); };
    const oAtt = gl.attachShader.bind(gl);
    gl.attachShader = (p, sh) => {
      const a = shaders.get(p) || [];
      a.push(sh);
      shaders.set(p, a);
      oAtt(p, sh);
    };
    const labelOf = (p) => {
      let l = label.get(p);
      if (l) return l;
      const s = (shaders.get(p) || []).map((sh) => src.get(sh) || '').join('\\n');
      l = s.includes('distanciaAoRetangulo') ? 'halo:contorno' : 'outro';
      label.set(p, l);
      return l;
    };
    let cur = null;
    const oUse = gl.useProgram.bind(gl);
    gl.useProgram = (p) => { cur = p; oUse(p); };

    // O ÚLTIMO VALOR de \`uRetangulo\` POR PROGRAMA — \`getUniformLocation\`
    // guarda de quem (programa, nome) é cada location devolvida,
    // \`uniform4f\`/\`uniform4fv\` gravam o valor mandado por último nela.
    const infoDaLocation = new WeakMap();
    const ultimoRetPorPrograma = new WeakMap();
    const oGetLoc = gl.getUniformLocation.bind(gl);
    gl.getUniformLocation = (programa, nome) => {
      const loc = oGetLoc(programa, nome);
      if (loc) infoDaLocation.set(loc, { programa, nome });
      return loc;
    };
    const registrarRetangulo = (location, valores) => {
      const info = infoDaLocation.get(location);
      if (!info || info.nome !== 'uRetangulo') return;
      ultimoRetPorPrograma.set(info.programa, valores);
    };
    const oUniform4f = gl.uniform4f.bind(gl);
    gl.uniform4f = (location, x, y, z, w) => {
      registrarRetangulo(location, [x, y, z, w]);
      return oUniform4f(location, x, y, z, w);
    };
    const oUniform4fv = gl.uniform4fv.bind(gl);
    gl.uniform4fv = (location, valor) => {
      registrarRetangulo(location, Array.from(valor).slice(0, 4));
      return oUniform4fv(location, valor);
    };

    const free = [];
    const pending = [];
    let active = null;
    let quadroAtual = -1;
    const nomes = ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements'];
    for (const nome of nomes) {
      if (typeof gl[nome] !== 'function') continue;
      const orig = gl[nome].bind(gl);
      gl[nome] = function (...a) {
        const rotulo = cur ? labelOf(cur) : 'semPrograma';
        if (rotulo === 'halo:contorno') {
          G.desenhosHalo.push({ t: performance.now(), ret: ultimoRetPorPrograma.get(cur) ?? null });
        }
        if (!ext || active) return orig(...a);
        const q = free.pop() || gl.createQuery();
        try { gl.beginQuery(TE, q); active = q; } catch (e) { return orig(...a); }
        const r = orig(...a);
        gl.endQuery(TE);
        active = null;
        pending.push({ q, l: rotulo, frame: quadroAtual });
        return r;
      };
    }
    let poll = () => {};
    if (ext) {
      poll = () => {
        while (pending.length) {
          const r = pending[0];
          if (!gl.getQueryParameter(r.q, gl.QUERY_RESULT_AVAILABLE)) break;
          pending.shift();
          const dis = gl.getParameter(ext.GPU_DISJOINT_EXT);
          const ns = gl.getQueryParameter(r.q, gl.QUERY_RESULT);
          free.push(r.q);
          if (dis) continue;
          if (r.l === 'halo:contorno') G.halo.push({ ns, t: performance.now() });
          const quadro = G.gpuPorQuadro[r.frame];
          if (quadro) quadro.ns += ns;
        }
      };
    }
    const oRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => oRAF((t) => {
      quadroAtual += 1;
      G.gpuPorQuadro[quadroAtual] = { t, ns: 0 };
      poll();
      G.rafAbs.push(t);
      return cb(t);
    });
  }
})();
`;

/** p50/p95 (ou o que `p` pedir, 0..1) — `null` sem amostra nenhuma, o
 *  caso esperado do halo em A (a flag nem existe lá). */
function percentilDe(valores, p) {
  if (!valores.length) return null;
  const s = [...valores].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
}

/** `-` sem amostra (`null`/`undefined`), senão `n` casas decimais — o
 *  formatador de toda linha impressa de `--contorno`/`--contorno=cancelamento`. */
const fmt = (n, casas = 1) => (n === null || n === undefined ? '-' : n.toFixed(casas));

/** amostras → `{ amostras, media, p50, p95, max, acimaDeUmEMeio }` — o resumo
 *  usado pelas TRÊS distribuições do custo (tempo de GPU do halo,
 *  tempo de GPU por quadro, intervalo do rAF): `max` e
 *  `acimaDeUmEMeio` (quantos valores passam de 1,5× a PRÓPRIA mediana
 *  da amostra) só importam para o intervalo do rAF, mas calcular os
 *  quatro sempre é mais simples que três funções quase iguais. */
function resumoDeMs(valores) {
  const p50 = percentilDe(valores, 0.5);
  const p95 = percentilDe(valores, 0.95);
  return {
    amostras: valores.length,
    // a MÉDIA também: sob vsync o intervalo do rAF anda em degraus de
    // ~16,7ms e a mediana pula de um degrau para o outro com pouco
    // custo a mais — a média enxerga a fração de quadros que pulou.
    media: valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null,
    p50,
    p95,
    max: valores.length ? Math.max(...valores) : null,
    acimaDeUmEMeio: p50 !== null ? valores.filter((v) => v > p50 * 1.5).length : 0,
  };
}

/** o quadro (de `gravarClipe`) cujo instante REAL (`ts`, segundos,
 *  `Page.screencastFrame.metadata.timestamp`) mais se aproxima de
 *  `t0Ms + alvoMs` — `t0Ms` é `Date.now()` do Node, a mesma base de
 *  época (UTC, unix) que o CDP usa nesse campo, por isso a comparação
 *  é direta, sem segundo relógio para reconciliar. */
function quadroMaisProximoDoAlvo(quadros, t0Ms, alvoMs) {
  let melhor = null;
  let menorDif = Infinity;
  for (const q of quadros) {
    const dif = Math.abs(q.ts * 1000 - (t0Ms + alvoMs));
    if (dif < menorDif) { menorDif = dif; melhor = q; }
  }
  return melhor;
}

/** a luminância MÉDIA (`YAVG`, 0–255) de uma região de um PNG — prova
 *  se B clareia uma faixa que A não alcança. `signalstats` calcula,
 *  `metadata=print:file=-` manda o valor para STDOUT (não o log de
 *  sempre do ffmpeg, que vai para stderr). */
function luminanciaMediaPng(arquivoPng, { x, y, largura, altura }) {
  const r = spawnSync(FFMPEG, [
    '-i', arquivoPng,
    '-vf', `crop=${largura}:${altura}:${x}:${y},signalstats,metadata=print:file=-`,
    '-f', 'null', '-',
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg (luminância) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  const m = /lavfi\.signalstats\.YAVG=([\d.]+)/.exec((r.stdout || '').toString());
  if (!m) throw new Error(`luminância: YAVG não encontrado em ${arquivoPng}`);
  return Number.parseFloat(m[1]);
}

/** arredonda para PAR — a mesma exigência que já derrubou um clipe
 *  desta sonda antes (comentário de `abrirSonda`, "altura ÍMPAR, que o
 *  libx264 recusa"): o recorte do C6 vira `-pix_fmt yuv420p` de novo. */
const parPixel = (n) => {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r - 1;
};

/** a faixa do RECORTE (clipes `-a-`/`-b-`): 60px fora + 20px dentro na
 *  horizontal (a borda ESQUERDA), 60px de folga acima do topo até o pé
 *  do painel (cobre também a borda de CIMA, e o percurso inteiro do
 *  ponto quente que desce a esquerda — seção 7/12.5 do plano). */
function faixaDoRecorte(painel) {
  const FORA = 60;
  const DENTRO = 20;
  const x = Math.max(0, Math.round(painel.x - FORA));
  const y = Math.max(0, Math.round(painel.y - FORA));
  const x1 = painel.x + DENTRO;
  const y1 = painel.y + painel.height + FORA;
  const largura = Math.min(parPixel(x1 - x), 1440 - x);
  const altura = Math.min(parPixel(y1 - y), 900 - y);
  return { x, y, largura, altura };
}

/** a faixa da PROVA por luminância: 16px de largura, 4–20px fora da
 *  borda ESQUERDA de repouso — fora do DOM opaco do painel (regra 5 da
 *  seção 7: o halo só existe onde a página não pintou nada), altura
 *  inteira do painel (o termo `base` do shader não decai com Y, só a
 *  intensidade geral do envelope de tempo — qualquer Y already mostra
 *  a diferença). */
function faixaDeLuminancia(painel) {
  return {
    x: Math.max(0, Math.round(painel.x - 20)),
    y: Math.round(painel.y),
    largura: 16,
    altura: Math.max(2, Math.round(painel.height)),
  };
}

/** recorta ESPACIALMENTE (a faixa da borda) e no TEMPO (janela relativa
 *  ao clique, calculada por quem chama) um clipe já bruto — o clipe
 *  final `-a-`/`-b-` do C6. */
function recortarClipeContorno(clipeOrigem, retangulo, { inicioSeg, duracaoSeg }, destinoFinal) {
  const destino = semSobrescrever(destinoFinal);
  const r = spawnSync(FFMPEG, [
    '-y', '-i', clipeOrigem,
    '-ss', Math.max(0, inicioSeg).toFixed(3), '-t', duracaoSeg.toFixed(3),
    '-vf', `crop=${retangulo.largura}:${retangulo.altura}:${retangulo.x}:${retangulo.y}`,
    '-pix_fmt', 'yuv420p',
    destino,
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg (recorte c6) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  return destino;
}

/** UMA imagem, A empilhado sobre B, nos MESMOS instantes relativos ao
 *  clique: `QUADROS_LADO` colunas por clipe (`tile=Nx1`, o mesmo par
 *  fps-calculado/tile de `renderizarContato`), depois `vstack`. */
function ladoALadoContorno(clipeA, clipeB, janelaSegundos, destinoFinal) {
  const QUADROS_LADO = 5;
  const fps = (QUADROS_LADO + 1) / Math.max(janelaSegundos, 0.1);
  const destino = semSobrescrever(destinoFinal);
  const r = spawnSync(FFMPEG, [
    '-y', '-i', clipeA, '-i', clipeB,
    '-filter_complex',
    `[0:v]fps=${fps.toFixed(4)},tile=${QUADROS_LADO}x1[a];`
      + `[1:v]fps=${fps.toFixed(4)},tile=${QUADROS_LADO}x1[b];`
      + '[a][b]vstack=inputs=2[saida]',
    '-map', '[saida]', '-frames:v', '1',
    destino,
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg (lado a lado c6) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  return destino;
}

/** área do quad (px², DPR 1) a partir do retângulo do painel — a mesma
 *  conta de `contornoDaUi.ts` (`MARGEM_DO_QUAD_PX = SIGMA_PX * 4 = 48`,
 *  o quad cresce 48px para cada lado nos dois eixos). */
const areaDoQuadPx = (r) => (r.width + 96) * (r.height + 96);

/** o tamanho REAL do framebuffer do canvas principal (`drawingBuffer`,
 *  já em pixels FÍSICOS — largura CSS × DPR) e o DPR que a página
 *  enxerga — a checagem de sanidade do custo (§12.5): pega o contexto
 *  DE NOVO no mesmo canvas (WebGL devolve o MESMO contexto numa
 *  segunda chamada, nunca cria outro) para não interferir em nada que
 *  `SCRIPT_GPU_HALO` já instrumentou. */
const jsInfoCanvas = () => `(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return {
    drawingBufferWidth: gl ? gl.drawingBufferWidth : null,
    drawingBufferHeight: gl ? gl.drawingBufferHeight : null,
    devicePixelRatio: window.devicePixelRatio,
  };
})()`;

/** a CAIXA DE REPOUSO de um painel `[data-dialogo]` — a mesma conta que
 *  `contornoDaUi.ts` faz (K5, `--contorno=cancelamento`): soma
 *  `offsetLeft`/`offsetTop` subindo por `offsetParent` até `.hud-root`
 *  (sem incluir o dele mesmo), mais `offsetWidth`/`offsetHeight` — a
 *  posição/tamanho do painel PARADO, e não o `getBoundingClientRect()`
 *  ao vivo (que inclui o deslocamento da entrada em curso). */
function jsCaixaDeRepouso(seletorPainel) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(seletorPainel)});
    const raiz = document.querySelector('.hud-root');
    if (!el || !raiz) return null;
    let x = 0;
    let y = 0;
    let node = el;
    while (node && node !== raiz) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y, width: el.offsetWidth, height: el.offsetHeight };
  })()`;
}

/** espera exatamente `n` quadros de verdade (`n` voltas de
 *  `requestAnimationFrame`) — o "wait 3 frames" do K5 depois de mudar
 *  `--ui`, tempo do CSS/React reagirem antes de ler a caixa de
 *  repouso. */
function esperarQuadros(sessao, n) {
  return sessao.send('Runtime.evaluate', {
    expression: `new Promise((r) => {
      let restam = ${n};
      const passo = () => { restam -= 1; if (restam <= 0) r(1); else requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    })`,
    awaitPromise: true,
    returnByValue: true,
  });
}

/** carrega uma query na sonda de `--contorno`/`--contorno=cancelamento`
 *  — até 3 tentativas (a régua de sempre), tour pulado, um respiro de
 *  300ms; usado pelas duas corridas para não repetir o mesmo miolo. */
async function carregarNoContorno(sessao, query) {
  let assentou = null;
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
    try {
      assentou = await sessao.ir(query);
    } catch (e) {
      ultimoErro = e;
      process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
      await dorme(500);
    }
  }
  if (!assentou) throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
  await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_GATILHO}'))`, 10000);
  await pularTour(sessao);
  await dorme(300);
}

async function rodarContorno() {
  mkdirSync(CAPTURAS, { recursive: true });
  const pastaA = resolve(tmpdir(), `sonda-motion-contorno-a-${process.pid}`);
  const pastaB = resolve(tmpdir(), `sonda-motion-contorno-b-${process.pid}`);
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: JANELA, prefixo: 'sonda-motion-contorno' });
    const viewport = {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    };
    await sessao.send('Emulation.setDeviceMetricsOverride', viewport);
    sessao.marcarViewport(viewport);
    const versaoChrome = await sessao.send('Browser.getVersion');
    await sessao.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${SEM_TIMER ? 'window.__contornoSemTimer = true;\n' : ''}${SCRIPT_GPU_HALO}`,
    });

    // UMA abertura GRAVADA (passo 1) — o painel some de novo antes de
    // devolver, para a página ficar limpa para as dez do passo 3, na
    // MESMA navegação.
    const capturarAbertura = async (pasta) => {
      let t0Ms = 0;
      const quadros = await gravarClipe(
        sessao,
        { largura: 1440, altura: 900, pastaQuadros: pasta },
        async () => {
          await dorme(150); // quadros "de antes", para o recorte ter contexto
          await clicarReal(sessao, SEL_CAMADAS_GATILHO);
          t0Ms = Date.now();
          await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_PAINEL}'))`, 3000);
          await dorme(600); // 450ms pedidos + folga além do teto do halo (400ms)
        }
      );
      const painel = await retanguloDe(sessao, SEL_CAMADAS_PAINEL);
      await clicarReal(sessao, `${SEL_CAMADAS_PAINEL} .hud-fechar`);
      await esperarPor({ js: sessao.js }, `document.querySelector('${SEL_CAMADAS_PAINEL}') === null`, 3000);
      await dorme(200);
      return { quadros, t0Ms, painel };
    };

    // CINCO aberturas SEM gravação por BLOCO (passo 3, custo) — marca o
    // clique no relógio DA PÁGINA (`performance.now()`, a base do
    // `rAF`/GPU do instrumento), espera a janela medida, fecha e ESPERA
    // A SAÍDA TERMINAR antes da próxima: sem isso `montada` não volta a
    // `null` e o próximo clique seria uma TROCA, não um nascimento — e
    // o C6 nunca ligaria de novo (`App.tsx`, guarda `anterior !== null`).
    // `n` aberturas por chamada — quem chama já fez o `carregarNoContorno`
    // do bloco (cada bloco é a SUA PRÓPRIA navegação, item 4 do
    // enunciado), então `window.__contornoProf` nasce zerado aqui.
    const medirCustoBloco = async (n) => {
      const t0sPerf = [];
      for (let i = 0; i < n; i++) {
        await clicarReal(sessao, SEL_CAMADAS_GATILHO);
        t0sPerf.push(await sessao.js('performance.now()'));
        await dorme(600);
        await clicarReal(sessao, `${SEL_CAMADAS_PAINEL} .hud-fechar`);
        await esperarPor({ js: sessao.js }, `document.querySelector('${SEL_CAMADAS_PAINEL}') === null`, 3000);
        await dorme(150);
      }
      const prof = await sessao.js('window.__contornoProf');
      const canvas = await sessao.js(jsInfoCanvas());
      return { t0sPerf, prof, canvas };
    };

    // uma foto só (`Page.captureScreenshot`) para `&shot=1` e para
    // "reduzir movimento" — os dois não têm abertura animada nenhuma
    // para recortar no tempo, e os dois portões já são código
    // (`semMovimento()`/`Director.shotMode`); isto só fotografa o
    // resultado.
    const medirSemHalo = async ({ query, reduzido, arquivo }) => {
      await carregarNoContorno(sessao, query);
      if (reduzido) {
        await sessao.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
        });
      }
      await clicarReal(sessao, SEL_CAMADAS_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_PAINEL}'))`, 3000);
      await dorme(200); // o pico do halo (60ms), se existisse, já teria passado
      const shot = await sessao.send('Page.captureScreenshot', { format: 'png' });
      const painel = await retanguloDe(sessao, SEL_CAMADAS_PAINEL);
      if (reduzido) await sessao.send('Emulation.setEmulatedMedia', { features: [] });
      if (!painel) throw new Error('painel de Camadas não encontrado (shot/reduzido)');
      writeFileSync(arquivo, Buffer.from(shot.data, 'base64'));
      return luminanciaMediaPng(arquivo, faixaDeLuminancia(painel));
    };

    process.stdout.write('  ·     A (CSS só)…\n');
    await carregarNoContorno(sessao, QUERY);
    const capA = await capturarAbertura(pastaA);

    process.stdout.write('  ·     B (CSS + halo WebGL)…\n');
    await carregarNoContorno(sessao, `${QUERY}&contorno=webgl`);
    const capB = await capturarAbertura(pastaB);

    if (!capA.painel || !capB.painel) {
      throw new Error('painel de Camadas não encontrado ao medir o retângulo de repouso');
    }

    // A REFERÊNCIA de cada checagem é o MESMO modo (shot/reduzido) SEM a
    // flag — não o repouso "ao vivo" de A: medido (11/09), `shot=1`
    // sozinho já muda a cena determinística nesta faixa (27,5 contra
    // ~22 "ao vivo"), sem `contorno=webgl` nenhum — comparar B contra o
    // repouso ao vivo teria acusado um halo que não existe.
    process.stdout.write('  ·     shot=1, sem a flag (referência)…\n');
    const luminanciaShotA = await medirSemHalo({
      query: `${QUERY}&shot=1`, reduzido: false, arquivo: resolve(pastaA, 'still-shot.png'),
    });
    process.stdout.write('  ·     B com &shot=1…\n');
    const luminanciaShotB = await medirSemHalo({
      query: `${QUERY}&contorno=webgl&shot=1`, reduzido: false, arquivo: resolve(pastaB, 'still-shot.png'),
    });
    process.stdout.write('  ·     reduzir-movimento, sem a flag (referência)…\n');
    const luminanciaReduzidoA = await medirSemHalo({
      query: QUERY, reduzido: true, arquivo: resolve(pastaA, 'still-reduzido.png'),
    });
    process.stdout.write('  ·     B com reduzir-movimento…\n');
    const luminanciaReduzidoB = await medirSemHalo({
      query: `${QUERY}&contorno=webgl`, reduzido: true, arquivo: resolve(pastaB, 'still-reduzido.png'),
    });

    // ---- passo 1: clipes recortados + lado a lado ----
    // O CLIPE INTEIRO (janela toda, sem recorte) vai DIRETO para
    // `capturas/` — `renderizarClipe` já passa `destinoFinal` por
    // `semSobrescrever` sozinho, então isto também é o clipe "inteiro"
    // pedido, sem precisar duplicar o arquivo.
    const brutoA = renderizarClipe(capA.quadros, resolve(CAPTURAS, `motion-c6-a-inteiro-${commit}.mp4`));
    const brutoB = renderizarClipe(capB.quadros, resolve(CAPTURAS, `motion-c6-b-inteiro-${commit}.mp4`));
    const janelaA = { inicioSeg: capA.t0Ms / 1000 - capA.quadros[0].ts, duracaoSeg: 0.45 };
    const janelaB = { inicioSeg: capB.t0Ms / 1000 - capB.quadros[0].ts, duracaoSeg: 0.45 };
    const clipeA = recortarClipeContorno(
      brutoA, faixaDoRecorte(capA.painel), janelaA, resolve(CAPTURAS, `motion-c6-a-${commit}.mp4`)
    );
    const clipeB = recortarClipeContorno(
      brutoB, faixaDoRecorte(capB.painel), janelaB, resolve(CAPTURAS, `motion-c6-b-${commit}.mp4`)
    );
    const ladoALado = ladoALadoContorno(
      clipeA, clipeB, 0.45, resolve(CAPTURAS, `motion-c6-lado-a-lado-${commit}.png`)
    );

    // ---- passo 2: prova por luminância ----
    const ALVOS_MS = [100, 200, 300, 600];
    const luminanciaEm = (cap) => Object.fromEntries(ALVOS_MS.map((alvoMs) => {
      const q = quadroMaisProximoDoAlvo(cap.quadros, cap.t0Ms, alvoMs);
      return [`t${alvoMs}`, q ? luminanciaMediaPng(q.arquivo, faixaDeLuminancia(cap.painel)) : null];
    }));
    const luminanciaA = luminanciaEm(capA);
    const luminanciaB = luminanciaEm(capB);

    // ---- passo 3: custo em blocos A1/B1/B2/A2 (`--aberturas`, 5 por padrão) ----
    // ORDEM A→B→B→A, cada bloco na SUA PRÓPRIA navegação (`item 4`):
    // pool A1+A2 × B1+B2 mostra deriva térmica (o Chrome esquenta ao
    // longo da corrida) sem confundi-la com "A sempre roda primeiro,
    // frio" — a intercalação pesa os dois lados igualmente.
    process.stdout.write(`  ·     bloco A1 (custo, ${ABERTURAS_POR_BLOCO} aberturas)…\n`);
    await carregarNoContorno(sessao, QUERY);
    const blocoA1 = await medirCustoBloco(ABERTURAS_POR_BLOCO);
    process.stdout.write(`  ·     bloco B1 (custo, ${ABERTURAS_POR_BLOCO} aberturas)…\n`);
    await carregarNoContorno(sessao, `${QUERY}&contorno=webgl`);
    const blocoB1 = await medirCustoBloco(ABERTURAS_POR_BLOCO);
    process.stdout.write(`  ·     bloco B2 (custo, ${ABERTURAS_POR_BLOCO} aberturas)…\n`);
    await carregarNoContorno(sessao, `${QUERY}&contorno=webgl`);
    const blocoB2 = await medirCustoBloco(ABERTURAS_POR_BLOCO);
    process.stdout.write(`  ·     bloco A2 (custo, ${ABERTURAS_POR_BLOCO} aberturas)…\n`);
    await carregarNoContorno(sessao, QUERY);
    const blocoA2 = await medirCustoBloco(ABERTURAS_POR_BLOCO);

    const dentroDeAlgumaAbertura = (t, t0sPerf) => t0sPerf.some((t0) => t >= t0 && t <= t0 + 450);
    const haloMsDoBloco = (bloco) => bloco.prof.halo
      .filter((h) => dentroDeAlgumaAbertura(h.t, bloco.t0sPerf))
      .map((h) => h.ns / 1e6);
    const frameTimeMsDoBloco = (bloco) => {
      const deltas = [];
      for (let i = 1; i < bloco.prof.rafAbs.length; i++) {
        if (dentroDeAlgumaAbertura(bloco.prof.rafAbs[i], bloco.t0sPerf)) {
          deltas.push(bloco.prof.rafAbs[i] - bloco.prof.rafAbs[i - 1]);
        }
      }
      return deltas;
    };
    // GPU TOTAL por quadro (`G.gpuPorQuadro`, TODOS os desenhos — não só
    // o halo) dentro da MESMA janela de 450ms de cada abertura, em ms.
    const gpuQuadroMsDoBloco = (bloco) => bloco.prof.gpuPorQuadro
      .filter((q) => q && dentroDeAlgumaAbertura(q.t, bloco.t0sPerf))
      .map((q) => q.ns / 1e6);
    const resumoDoBloco = (bloco) => ({
      extDisponivel: Boolean(bloco.prof.ext),
      canvas: bloco.canvas,
      halo: resumoDeMs(haloMsDoBloco(bloco)), // esperado ~0 amostras nos blocos A
      gpuPorQuadro: resumoDeMs(gpuQuadroMsDoBloco(bloco)),
      frameTime: resumoDeMs(frameTimeMsDoBloco(bloco)),
    });
    const poolar = (blocos, extrair) => blocos.flatMap(extrair);
    const pooledA = {
      canvas: blocoA1.canvas,
      halo: resumoDeMs(poolar([blocoA1, blocoA2], haloMsDoBloco)), // esperado 0 — a flag nem existe em A
      gpuPorQuadro: resumoDeMs(poolar([blocoA1, blocoA2], gpuQuadroMsDoBloco)),
      frameTime: resumoDeMs(poolar([blocoA1, blocoA2], frameTimeMsDoBloco)),
    };
    const pooledB = {
      canvas: blocoB1.canvas,
      halo: resumoDeMs(poolar([blocoB1, blocoB2], haloMsDoBloco)),
      gpuPorQuadro: resumoDeMs(poolar([blocoB1, blocoB2], gpuQuadroMsDoBloco)),
      frameTime: resumoDeMs(poolar([blocoB1, blocoB2], frameTimeMsDoBloco)),
    };

    const relatorio = {
      meta: {
        commit,
        dirty,
        // O SERVIDOR É DE OUTRA ÁRVORE (isolada, item obrigatório do
        // enunciado): `commit`/`dirty` acima são desta sonda, não do
        // app que ela mede.
        appCommit: APP_COMMIT,
        chrome: versaoChrome.product,
        app: APP,
        viewport: { width: JANELA_W, height: JANELA_H },
        dpr: DPR,
        visivel: VISIVEL,
        semTimer: SEM_TIMER,
        q: META_DA_QUERY.q,
        lang: META_DA_QUERY.lang,
        ui: META_DA_QUERY.ui,
        geradoEm: new Date().toISOString(),
      },
      clipes: {
        a: clipeA, b: clipeB, aInteiro: brutoA, bInteiro: brutoB, ladoALado,
      },
      recorte: { a: faixaDoRecorte(capA.painel), b: faixaDoRecorte(capB.painel) },
      areaDoQuadPx: { a: areaDoQuadPx(capA.painel), b: areaDoQuadPx(capB.painel) },
      luminancia: {
        faixaPx: '4–20px fora da borda esquerda, largura 16px, altura do painel',
        a: luminanciaA,
        b: luminanciaB,
        // referência = MESMO modo (shot/reduzido) sem `contorno=webgl` —
        // não o repouso "ao vivo" de `a` acima (ver comentário no ponto
        // de coleta, mais acima nesta função).
        shot: { a: luminanciaShotA, b: luminanciaShotB },
        reduzido: { a: luminanciaReduzidoA, b: luminanciaReduzidoB },
      },
      custo: {
        aberturasPorBloco: ABERTURAS_POR_BLOCO,
        janelaMs: 450,
        ordemDosBlocos: ['A1', 'B1', 'B2', 'A2'],
        porBloco: {
          a1: resumoDoBloco(blocoA1),
          b1: resumoDoBloco(blocoB1),
          b2: resumoDoBloco(blocoB2),
          a2: resumoDoBloco(blocoA2),
        },
        pooled: { a: pooledA, b: pooledB },
      },
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c6-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    // uma linha por lado (bloco OU pool) — halo, GPU/quadro e rAF, os
    // três pelo mesmo `resumoDeMs`.
    const linhaCusto = (r) => `halo p50=${fmt(r.halo.p50, 3)}ms p95=${fmt(r.halo.p95, 3)}ms (${r.halo.amostras} am.) | `
      + `GPU/quadro p50=${fmt(r.gpuPorQuadro.p50, 2)}ms p95=${fmt(r.gpuPorQuadro.p95, 2)}ms (${r.gpuPorQuadro.amostras} am.) | `
      + `rAF média=${fmt(r.frameTime.media, 2)} p50=${fmt(r.frameTime.p50, 2)} p95=${fmt(r.frameTime.p95, 2)} max=${fmt(r.frameTime.max, 2)} `
      + `(${r.frameTime.acimaDeUmEMeio}/${r.frameTime.amostras} > 1,5×mediana)`;
    const linhas = [
      `=== sonda-motion c6 (halo WebGL × CSS) — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app ${APP_COMMIT} ===`,
      `Chrome ${versaoChrome.product} | mesa ${JANELA_W}x${JANELA_H} DPR${DPR} | visível=${VISIVEL} | `
        + `lang=${META_DA_QUERY.lang} q=${META_DA_QUERY.q}${META_DA_QUERY.ui ? ` ui=${META_DA_QUERY.ui}` : ''}`,
      `clipe A: ${clipeA} (inteiro: ${brutoA})`,
      `clipe B: ${clipeB} (inteiro: ${brutoB})`,
      `lado a lado: ${ladoALado}`,
      `luminância (YAVG 0-255, faixa 4-20px fora da borda esquerda) — `
        + `A: 100ms=${fmt(luminanciaA.t100)} 200ms=${fmt(luminanciaA.t200)} 300ms=${fmt(luminanciaA.t300)} 600ms=${fmt(luminanciaA.t600)} | `
        + `B: 100ms=${fmt(luminanciaB.t100)} 200ms=${fmt(luminanciaB.t200)} 300ms=${fmt(luminanciaB.t300)} 600ms=${fmt(luminanciaB.t600)}`,
      `shot=1 — sem a flag: ${fmt(luminanciaShotA)} | B: ${fmt(luminanciaShotB)} `
        + `(a referência é o PRÓPRIO shot=1 sem a flag, não o repouso ao vivo de A: `
        + `medido, shot=1 sozinho já muda essa faixa para ~27 contra ~22 ao vivo)`,
      `reduzir-movimento — sem a flag: ${fmt(luminanciaReduzidoA)} | B: ${fmt(luminanciaReduzidoB)}`,
      `custo por bloco (${ABERTURAS_POR_BLOCO} aberturas cada, ordem A1→B1→B2→A2, janela 450ms):`,
      `  A1 — ${linhaCusto(relatorio.custo.porBloco.a1)}`,
      `  B1 — ${linhaCusto(relatorio.custo.porBloco.b1)}`,
      `  B2 — ${linhaCusto(relatorio.custo.porBloco.b2)}`,
      `  A2 — ${linhaCusto(relatorio.custo.porBloco.a2)}`,
      `custo POOLADO — A (A1+A2) ${linhaCusto(pooledA)}`,
      `custo POOLADO — B (B1+B2) ${linhaCusto(pooledB)}`,
      `canvas principal — A1: ${pooledA.canvas?.drawingBufferWidth}x${pooledA.canvas?.drawingBufferHeight} dpr=${pooledA.canvas?.devicePixelRatio} | `
        + `B1: ${pooledB.canvas?.drawingBufferWidth}x${pooledB.canvas?.drawingBufferHeight} dpr=${pooledB.canvas?.devicePixelRatio}`,
      `[EXT_disjoint_timer_query_webgl2 disponível — A1=${relatorio.custo.porBloco.a1.extDisponivel} `
        + `B1=${relatorio.custo.porBloco.b1.extDisponivel} B2=${relatorio.custo.porBloco.b2.extDisponivel} `
        + `A2=${relatorio.custo.porBloco.a2.extDisponivel}]`,
      'números crus deste Mac, cabeça headless: sob vsync o rAF só entrega múltiplos de ~16,7ms — uma '
        + 'diferença de custo menor que isso pode não aparecer no tempo de quadro mesmo existindo na GPU '
        + '(mesmo ponto do comentário `SEM_VSYNC` em gpu-profile.mjs); por isso o p50/p95 da GPU acima é '
        + 'a medida mais confiável do custo do passe em si.',
      `área do quad (retângulo do painel + 48px de margem por lado, DPR 1) — A: ${areaDoQuadPx(capA.painel)}px² B: ${areaDoQuadPx(capB.painel)}px²`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    rmSync(pastaA, { recursive: true, force: true });
    rmSync(pastaB, { recursive: true, force: true });
  }
}

/**
 * `--contorno=cancelamento` — o sub-modo PASSA/FALHA do C6: prova que o
 * halo WebGL CANCELA o desenho nos seis jeitos que o conserto promete
 * (K1–K6), mais um controle sem ação nenhuma (K0) que só confirma que,
 * sem interrupção, o halo desenha "do nada" por ~400ms como sempre —
 * sem K0, um PASSA em K1–K6 não provaria cancelamento, só ausência.
 * Usa o MESMO `SCRIPT_GPU_HALO` de `--contorno` (`desenhosHalo`: um
 * `{ t, ret }` por desenho, `ret` o uniform `uRetangulo` no instante)
 * numa ÚNICA navegação para os sete casos — sem gravar clipe nenhum,
 * só números e veredito, como `--interrupcoes`.
 *
 * Todo caso: abre Camadas DO NADA (o único gatilho que o halo liga,
 * `App.tsx`), age num atraso fixo do relógio DA PÁGINA, mede os
 * desenhos do halo, fecha o painel e só DEPOIS restaura
 * mídia/viewport/`--ui` — nessa ordem, para a restauração nunca
 * disputar com a leitura, e sempre incondicional (é NO-OP quando o
 * caso não tocou aquele estado), para nada vazar de um K para o
 * seguinte.
 */
async function rodarCancelamento() {
  mkdirSync(CAPTURAS, { recursive: true });
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: JANELA, prefixo: 'sonda-motion-cancelamento' });
    const viewport = {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    };
    await sessao.send('Emulation.setDeviceMetricsOverride', viewport);
    sessao.marcarViewport(viewport);
    const versaoChrome = await sessao.send('Browser.getVersion');
    await sessao.send('Page.addScriptToEvaluateOnNewDocument', { source: SCRIPT_GPU_HALO });
    await carregarNoContorno(sessao, `${QUERY}&contorno=webgl`);

    const fecharPainel = async (seletorPainel) => {
      await sessao.js(`(() => {
        const b = document.querySelector('${seletorPainel} .hud-fechar');
        if (b) b.click();
      })()`);
      await esperarPor({ js: sessao.js }, `document.querySelector('${seletorPainel}') === null`, 3000);
      await dorme(300);
    };
    const esperarRestaurarJanela = async () => {
      await esperarPor(
        { js: sessao.js },
        `window.innerWidth === ${JANELA_W} && window.innerHeight === ${JANELA_H}`,
        2000
      );
      await esperarQuadro(sessao);
      await esperarQuadro(sessao);
    };
    const restaurarTudo = async () => {
      await sessao.send('Emulation.setEmulatedMedia', { features: [] });
      await sessao.send('Emulation.setDeviceMetricsOverride', viewport);
      await esperarRestaurarJanela();
      await sessao.js("document.documentElement.style.removeProperty('--ui')");
    };
    const abrirCamadasDoNada = async () => {
      // garante ausente antes de abrir "do nada" — o único gatilho que
      // o halo liga (`App.tsx`, guarda `anterior !== null`)
      await esperarPor({ js: sessao.js }, `document.querySelector('${SEL_CAMADAS_PAINEL}') === null`, 3000);
      await clicarReal(sessao, SEL_CAMADAS_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_PAINEL}'))`, 3000);
      return sessao.js('performance.now()'); // relógio DA PÁGINA, nunca o do Node
    };
    const contarDesenhos = () => sessao.js('window.__contornoProf.desenhosHalo.length');
    const lerDesenhosDesde = async (antes) => (await sessao.js('window.__contornoProf.desenhosHalo')).slice(antes);
    // espera até a página relatar `alvoMs` desde `tPagina` (relógio DA
    // PÁGINA) — uma leitura, um `dorme`, sem laço: a mesma folga de
    // `esperarAte` (`--interrupcoes`), contra `performance.now()` em
    // vez do `Date.now()` do Node.
    const esperarAtePagina = async (tPagina, alvoMs) => {
      const agora = await sessao.js('performance.now()');
      const resta = alvoMs - (agora - tPagina);
      if (resta > 0) await dorme(resta);
      return sessao.js('performance.now()');
    };
    // ESPERA A ENTRADA ACABAR, no quadro em que ela acaba (K2/K4): um
    // atraso fixo não serve — a entrada termina ~260–290ms depois do
    // clique, conforme o commit do React, e o resize ainda leva ~60ms do
    // comando até a página; entre "a entrada já acabou" e "o halo ainda
    // vive" (400ms) sobra uma janela estreita que um número fixo erra
    // para os dois lados (medido: +280ms agia com a entrada ainda viva,
    // +320ms fazia o evento chegar só aos ~380ms). Teto de 600ms.
    const esperarFimDaEntrada = () => sessao.send('Runtime.evaluate', {
      expression: `new Promise((r) => {
        const t0 = performance.now();
        const olhar = () => {
          const el = document.querySelector('${SEL_CAMADAS_PAINEL}');
          const acabou = !el || el.getAnimations().every((a) => a.playState === 'finished');
          if (acabou || performance.now() - t0 > 600) r(performance.now());
          else requestAnimationFrame(olhar);
        };
        olhar();
      })`,
      awaitPromise: true,
      returnByValue: true,
    });
    // quando a entrada (WAAPI) do painel termina, pela amostra tirada
    // enquanto ela ainda RODAVA — `duration - currentTime` é quanto
    // falta, do relógio da PRÓPRIA página (`linhaDoTempo`,
    // `document.timeline.currentTime`, a mesma base de
    // `performance.now()` que `desenhosHalo[].t`).
    const tempoDeFimDeEntrada = (amostra) => {
      const emCurso = (amostra.waapi ?? []).find((w) => w.playState === 'running');
      return emCurso
        ? amostra.linhaDoTempo + ((emCurso.duration ?? 0) - (emCurso.currentTime ?? 0))
        : amostra.linhaDoTempo; // já tinha acabado quando a amostra foi tirada
    };
    const ligarReduzido = () => sessao.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    const agirResize = () => sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W - 140, height: JANELA_H - 50, deviceScaleFactor: DPR, mobile: false,
    });

    // ---------------------------------------------------------------
    // K0 — CONTROLE, sem ação nenhuma: o halo tem de desenhar "do nada"
    // por ~400ms quando NADA o interrompe.
    // ---------------------------------------------------------------
    const casoK0 = async () => {
      const tPagina = await abrirCamadasDoNada();
      const antes = await contarDesenhos();
      await dorme(600); // 450ms pedidos + folga além do teto do halo (400ms), igual ao resto da sonda
      const desenhos = await lerDesenhosDesde(antes);
      await fecharPainel(SEL_CAMADAS_PAINEL);
      await restaurarTudo();
      const tempos = desenhos.map((d) => d.t);
      const primeiro = tempos.length ? Math.min(...tempos) : null;
      const ultimo = tempos.length ? Math.max(...tempos) : null;
      const duracaoMs = primeiro !== null ? ultimo - primeiro : null;
      const passa = desenhos.length >= 3 && duracaoMs !== null && duracaoMs >= 250 && duracaoMs <= 450;
      return {
        veredito: passa ? 'PASSA' : 'FALHA',
        desenhosAntes: antes,
        desenhosDepois: antes + desenhos.length,
        contagem: desenhos.length,
        duracaoMs,
        msUltimoDesenhoAposAcao: ultimo !== null ? ultimo - tPagina : null,
      };
    };

    // ---------------------------------------------------------------
    // K1–K4 — SUPRESSÃO: reduzir movimento (K1/K2) ou redimensionar
    // (K3/K4) em dois instantes (+100ms, dentro da entrada de 260ms; e
    // no quadro em que ela acaba, `esperarFimDaEntrada`). PASSA exige >=1 desenho ANTES do evento
    // (o halo tinha mesmo começado) e NENHUM depois de evento+20ms.
    // K2/K4 acrescentam a PROVA DE LACUNA: a entrada já tinha acabado
    // quando o comando chegou ("at the command", a amostra que
    // `observarAposEvento` tira ANTES de agir) E houve pelo menos um
    // desenho do halo depois do fim da entrada (`tempoDeFimDeEntrada`,
    // de uma amostra tirada logo na abertura, ainda com ela rodando) —
    // sem os dois, K2/K4 não provam que o halo sobreviveu à entrada
    // por conta própria, e saem INCONCLUSIVO.
    // ---------------------------------------------------------------
    const rodarCasoDeSupressao = async ({
      evento, delayMs, comLacuna, agir,
    }) => {
      const tPagina = await abrirCamadasDoNada();
      const amostraAbertura = comLacuna ? await sessao.js(jsAmostraPainel(SEL_CAMADAS_PAINEL)) : null;
      const tFimEntrada = amostraAbertura ? tempoDeFimDeEntrada(amostraAbertura) : null;
      const antes = await contarDesenhos();
      if (comLacuna) await esperarFimDaEntrada();
      else await esperarAtePagina(tPagina, delayMs);
      const obs = await observarAposEvento(
        sessao,
        { evento, construirAmostra: () => jsAmostraPainel(SEL_CAMADAS_PAINEL) },
        agir
      );
      await dorme(500); // deixa o resto da janela do halo (até 400ms) terminar, se ainda estiver correndo
      const desenhos = await lerDesenhosDesde(antes);
      await fecharPainel(SEL_CAMADAS_PAINEL);
      await restaurarTudo();

      const base = { desenhosAntes: antes, desenhosDepois: antes + desenhos.length };
      if (comLacuna) {
        const entradaAcabouNoComando = (obs.antesDoComando.waapi ?? []).length === 0
          || obs.antesDoComando.waapi.every((w) => w.playState === 'finished');
        const desenhoDepoisDaEntrada = desenhos.some((d) => d.t > tFimEntrada);
        if (!(entradaAcabouNoComando && desenhoDepoisDaEntrada)) {
          return {
            ...base,
            veredito: 'INCONCLUSIVO',
            motivo: 'sem prova de que o halo sobreviveu ao fim da entrada',
            entradaAcabouNoComando,
            desenhoDepoisDaEntrada,
          };
        }
      }
      if (!obs.chegou) return { ...base, veredito: 'INCONCLUSIVO', motivo: 'evento não chegou' };
      const tEvento = obs.antesDoComando.tAntes + obs.msAntesAteEvento;
      // O EVENTO TEM DE PEGAR O HALO VIVO: ele dura 400ms desde a abertura,
      // e um evento que só chega depois disso (medido no build velho, K4:
      // o resize de +320ms chegou à página aos ~400ms) acharia "nenhum
      // desenho depois" porque o halo já tinha acabado SOZINHO — um
      // PASSA vazio. Perto do fim natural, nada se prova.
      if (tEvento - tPagina >= 380) {
        return { ...base, veredito: 'INCONCLUSIVO', motivo: 'o evento chegou depois do fim natural do halo', tEventoMs: tEvento - tPagina };
      }
      const antesDoEvento = desenhos.filter((d) => d.t < tEvento).length;
      const depoisDoLimite = desenhos.filter((d) => d.t > tEvento + 20).length;
      const passa = antesDoEvento >= 1 && depoisDoLimite === 0;
      const ultimo = desenhos.length ? Math.max(...desenhos.map((d) => d.t)) : null;
      return {
        ...base,
        veredito: passa ? 'PASSA' : 'FALHA',
        tEventoMs: tEvento - tPagina,
        desenhosAntesDoEvento: antesDoEvento,
        desenhosDepoisDoLimite: depoisDoLimite,
        msUltimoDesenhoAposAcao: ultimo !== null ? ultimo - tEvento : null,
      };
    };

    // ---------------------------------------------------------------
    // K5 — o painel muda de TAMANHO sozinho (`--ui`, sem resize de
    // janela): o halo tem de seguir a caixa de REPOUSO nova
    // (`jsCaixaDeRepouso`, a mesma conta de `contornoDaUi.ts`) a partir
    // de 2 quadros depois da mudança — Y/largura/altura sempre; X só
    // depois que a entrada (260ms) já tinha acabado, porque até lá o X
    // do halo segue o deslizar da entrada, não o repouso.
    // ---------------------------------------------------------------
    const casoK5 = async () => {
      const tPagina = await abrirCamadasDoNada();
      const amostraAbertura = await sessao.js(jsAmostraPainel(SEL_CAMADAS_PAINEL));
      const tFimEntrada = tempoDeFimDeEntrada(amostraAbertura);
      const antes = await contarDesenhos();
      await esperarAtePagina(tPagina, 150);
      const quadrosAntes = await sessao.js('window.__contornoProf.rafAbs.length');
      await sessao.js("document.documentElement.style.setProperty('--ui', '1.2')");
      await esperarQuadros(sessao, 3);
      const caixa = await sessao.js(jsCaixaDeRepouso(SEL_CAMADAS_PAINEL));
      // "2 quadros depois da mudança" — o 3º quadro novo desde
      // `quadrosAntes` (os índices 0 e 1 ainda são transição de layout).
      const limiarT = await sessao.js(`window.__contornoProf.rafAbs[${quadrosAntes + 2}] ?? performance.now()`);
      await dorme(250); // deixa o resto da janela de 400ms do halo passar
      const desenhos = await lerDesenhosDesde(antes);
      await fecharPainel(SEL_CAMADAS_PAINEL);
      await restaurarTudo();

      const base = { desenhosAntes: antes, desenhosDepois: antes + desenhos.length, caixaDeRepouso: caixa };
      if (!caixa) return { ...base, veredito: 'INCONCLUSIVO', motivo: '.hud-root ou painel não encontrado' };
      const dentroDeUmPx = (a, b) => Math.abs(a - b) <= 1;
      const relevantes = desenhos.filter((d) => d.t >= limiarT && d.ret);
      const bate = (d) => dentroDeUmPx(d.ret[1], caixa.y)
        && dentroDeUmPx(d.ret[2], caixa.width)
        && dentroDeUmPx(d.ret[3], caixa.height)
        && (d.t < tFimEntrada || dentroDeUmPx(d.ret[0], caixa.x));
      const todasBatem = relevantes.length > 0 && relevantes.every(bate);
      const ultimo = desenhos.length ? Math.max(...desenhos.map((d) => d.t)) : null;
      return {
        ...base,
        veredito: relevantes.length === 0 ? 'INCONCLUSIVO' : (todasBatem ? 'PASSA' : 'FALHA'),
        tFimEntradaMs: tFimEntrada - tPagina,
        desenhosVerificados: relevantes.length,
        msUltimoDesenhoAposAcao: ultimo !== null ? ultimo - tPagina : null,
      };
    };

    // ---------------------------------------------------------------
    // K6 — TROCA DE FERRAMENTA: Ajustes substitui Camadas (nunca fecha
    // "vazio") — o halo, preso ao painel que morreu, não pode continuar
    // desenhando depois do clique que troca.
    // ---------------------------------------------------------------
    const casoK6 = async () => {
      const tPagina = await abrirCamadasDoNada();
      const antes = await contarDesenhos();
      await esperarAtePagina(tPagina, 100);
      const tAcao = await sessao.js(`(() => {
        document.querySelector('${SEL_AJUSTES_GATILHO}')?.click();
        return performance.now();
      })()`);
      const trocou = await esperarPor(
        { js: sessao.js }, `Boolean(document.querySelector('${SEL_AJUSTES_PAINEL}'))`, 3000
      );
      await dorme(500);
      const desenhos = await lerDesenhosDesde(antes);
      await fecharPainel(SEL_AJUSTES_PAINEL);
      await restaurarTudo();

      const base = { desenhosAntes: antes, desenhosDepois: antes + desenhos.length };
      if (trocou === null) return { ...base, veredito: 'INCONCLUSIVO', motivo: 'Ajustes não abriu' };
      const depoisDoLimite = desenhos.filter((d) => d.t > tAcao + 50).length;
      const ultimo = desenhos.length ? Math.max(...desenhos.map((d) => d.t)) : null;
      return {
        ...base,
        veredito: depoisDoLimite === 0 ? 'PASSA' : 'FALHA',
        tAcaoMs: tAcao - tPagina,
        desenhosDepoisDoLimite: depoisDoLimite,
        msUltimoDesenhoAposAcao: ultimo !== null ? ultimo - tAcao : null,
      };
    };

    process.stdout.write('  ·     K0 controle (sem ação)…\n');
    const k0 = await casoK0();
    process.stdout.write('  ·     K1 reduzir-movimento @100ms…\n');
    const k1 = await rodarCasoDeSupressao({
      evento: 'reduzido', delayMs: 100, comLacuna: false, agir: ligarReduzido,
    });
    process.stdout.write('  ·     K2 reduzir-movimento no fim da entrada (lacuna)…\n');
    const k2 = await rodarCasoDeSupressao({
      evento: 'reduzido', comLacuna: true, agir: ligarReduzido,
    });
    process.stdout.write('  ·     K3 resize @100ms…\n');
    const k3 = await rodarCasoDeSupressao({
      evento: 'resize', delayMs: 100, comLacuna: false, agir: agirResize,
    });
    process.stdout.write('  ·     K4 resize no fim da entrada (lacuna)…\n');
    const k4 = await rodarCasoDeSupressao({
      evento: 'resize', comLacuna: true, agir: agirResize,
    });
    process.stdout.write('  ·     K5 painel muda de tamanho sozinho…\n');
    const k5 = await casoK5();
    process.stdout.write('  ·     K6 troca de ferramenta…\n');
    const k6 = await casoK6();

    const veredito = combinarVereditos([k0, k1, k2, k3, k4, k5, k6].map((k) => k.veredito));

    const relatorio = {
      meta: {
        commit,
        dirty,
        appCommit: APP_COMMIT,
        chrome: versaoChrome.product,
        app: APP,
        viewport: { width: JANELA_W, height: JANELA_H },
        dpr: DPR,
        visivel: VISIVEL,
        geradoEm: new Date().toISOString(),
      },
      k0, k1, k2, k3, k4, k5, k6,
      veredito,
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c6-cancelamento-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    const linhas = [
      `=== sonda-motion contorno cancelamento — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app ${APP_COMMIT} ===`,
      `Chrome ${versaoChrome.product} | mesa ${JANELA_W}x${JANELA_H} DPR${DPR} | visível=${VISIVEL}`,
      `K0 controle: ${k0.veredito} (desenhos=${k0.contagem}, duração=${fmt(k0.duracaoMs, 0)}ms)`,
      `K1 reduzir-movimento @100ms: ${k1.veredito} `
        + `(antes-do-evento=${k1.desenhosAntesDoEvento ?? '-'}, depois-do-limite=${k1.desenhosDepoisDoLimite ?? '-'}, motivo=${k1.motivo ?? '-'})`,
      `K2 reduzir-movimento no fim da entrada (lacuna): ${k2.veredito} `
        + `(antes-do-evento=${k2.desenhosAntesDoEvento ?? '-'}, depois-do-limite=${k2.desenhosDepoisDoLimite ?? '-'}, motivo=${k2.motivo ?? '-'})`,
      `K3 resize @100ms: ${k3.veredito} `
        + `(antes-do-evento=${k3.desenhosAntesDoEvento ?? '-'}, depois-do-limite=${k3.desenhosDepoisDoLimite ?? '-'}, motivo=${k3.motivo ?? '-'})`,
      `K4 resize no fim da entrada (lacuna): ${k4.veredito} `
        + `(antes-do-evento=${k4.desenhosAntesDoEvento ?? '-'}, depois-do-limite=${k4.desenhosDepoisDoLimite ?? '-'}, motivo=${k4.motivo ?? '-'})`,
      `K5 painel muda de tamanho sozinho: ${k5.veredito} `
        + `(desenhos-verificados=${k5.desenhosVerificados ?? '-'}, motivo=${k5.motivo ?? '-'})`,
      `K6 troca de ferramenta: ${k6.veredito} `
        + `(depois-do-limite=${k6.desenhosDepoisDoLimite ?? '-'}, motivo=${k6.motivo ?? '-'})`,
      `veredito geral: ${veredito}`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
  }
}

// ============================================================
// A CORRIDA
// ============================================================
// SEM REINDENTAR o bloco padrão abaixo (C3, `--sequencia`): é a corrida
// INTEIRA de sempre, só posta atrás de `if (!SEQUENCIA)` — reindentar
// ~330 linhas por estética arriscava mais erro de transcrição do que
// resolvia, e o enunciado pede o comportamento de sempre "exatamente
// como está", não o arquivo mais bonito.
if (FOLHA) {
  await rodarFolha();
} else if (INTERRUPCOES) {
  await rodarInterrupcoes();
} else if (C5) {
  await rodarC5(C5_QUAIS);
} else if (CONTORNO) {
  if (CONTORNO_MODO === 'cancelamento') {
    await rodarCancelamento();
  } else {
    await rodarContorno();
  }
} else if (!SEQUENCIA) {
mkdirSync(CAPTURAS, { recursive: true });
const pastaQuadrosMesa = resolve(tmpdir(), `sonda-motion-mesa-${process.pid}`);
const pastaQuadrosToque = resolve(tmpdir(), `sonda-motion-toque-${process.pid}`);

try {
  const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

  const sessao = await abrirSonda({ janela: JANELA, prefixo: 'sonda-motion' });
  try {
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    });
    const versaoChrome = await sessao.send('Browser.getVersion');

    // NAVEGAÇÃO com até 3 tentativas — "Chrome não sobe" e "app não
    // carrega" são achados que se reportam, não se escondem num loop.
    let assentou = null;
    let ultimoErro = null;
    for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
      try {
        assentou = await sessao.ir(QUERY);
      } catch (e) {
        ultimoErro = e;
        process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
        await dorme(500);
      }
    }
    if (!assentou) {
      throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
    }
    process.stdout.write(`app assentou por "${assentou.via}" em ${assentou.ms}ms\n`);
    await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_GATILHO}'))`, 10000);
    await pularTour(sessao);
    await dorme(300);

    const dpr = await sessao.js('window.devicePixelRatio');
    const viewportInicial = await sessao.js('({ w: window.innerWidth, h: window.innerHeight })');

    // ---------------------------------------------------------------
    // MESA — 1440×900, DPR 1, mouse/teclado reais por CDP
    // ---------------------------------------------------------------
    const mesa = {};
    const quadrosMesa = await gravarClipe(
      sessao,
      { largura: JANELA_W, altura: JANELA_H, pastaQuadros: pastaQuadrosMesa },
      async () => {
        // a) abrir Camadas
        await limparEventos(sessao);
        const t0a = Date.now();
        await clicarReal(sessao, SEL_CAMADAS_GATILHO);
        mesa.abrirCamadas = {
          amostras: await amostrarSequencia(sessao, t0a, [45, 120, 450], () => jsAmostraPainel(SEL_CAMADAS_PAINEL)),
          eventos: await lerEventos(sessao),
        };

        // b) trocar para Ajustes com Camadas aberta (E3)
        await limparEventos(sessao);
        const t0b = Date.now();
        await clicarReal(sessao, SEL_AJUSTES_GATILHO);
        mesa.trocarAjustes = {
          amostras: await amostrarSequencia(sessao, t0b, [50, 120, 450], () => jsAmostraPainel(SEL_AJUSTES_PAINEL)),
          eventos: await lerEventos(sessao),
        };

        // c) fechar com Escape (E2)
        await limparEventos(sessao);
        const t0c = Date.now();
        await pressionarEscape(sessao);
        mesa.fecharEscape = {
          amostras: await amostrarSequencia(sessao, t0c, [40, 120, 450], () => jsAmostraPainel(SEL_AJUSTES_PAINEL)),
          eventos: await lerEventos(sessao),
        };
      }
    );
    mesa.clipe = renderizarClipe(quadrosMesa, resolve(CAPTURAS, `motion-c0-mesa-${commit}.mp4`));

    // reabre Ajustes (fora da gravação) para os passos e) e d) —
    // invertidos de propósito: d) solta o dedo LONGE do botão para não
    // fechar por baixo do que e) ainda precisa medir.
    await clicarReal(sessao, SEL_AJUSTES_GATILHO);
    await dorme(500);

    // e) segmentado "Qualidade": escolhe outra opção e mede o filete
    const antesSeg = await sessao.js(`(() => {
      const g = ${jsSegQualidade()};
      const on = g && g.querySelector(':scope > .on');
      return on ? on.textContent.trim() : null;
    })()`);
    const t0e = Date.now();
    // `clicarReal` não serve aqui — ela exige um SELETOR CSS, e
    // `jsSegQualidade()` é uma expressão JS (comentário na constante). O
    // ponto vem do próprio DOM e o clique continua REAL (mousePressed +
    // mouseReleased via `clicarEmPonto`), só a localização muda.
    const rBotaoSeg = await sessao.js(`(() => {
      const g = ${jsSegQualidade()};
      const b = g && g.querySelector('button:not(.on):not(:disabled)');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!rBotaoSeg) throw new Error('segmentado Qualidade: nenhum botão não-ativo encontrado');
    await clicarEmPonto(sessao, rBotaoSeg.x, rBotaoSeg.y);
    const amostrasSeg = await amostrarSequencia(sessao, t0e, [45, 120, 450], () => `(() => {
      const g = ${jsSegQualidade()};
      if (!g) return { existe: false };
      const cs = getComputedStyle(g);
      const on = g.querySelector(':scope > .on');
      const gRect = g.getBoundingClientRect();
      const bRect = on ? on.getBoundingClientRect() : null;
      return {
        existe: true,
        segX: cs.getPropertyValue('--seg-x').trim(),
        segW: cs.getPropertyValue('--seg-w').trim(),
        onTexto: on ? on.textContent.trim() : null,
        botaoRelativoX: bRect ? bRect.x - gRect.x : null,
        botaoLargura: bRect ? bRect.width : null,
      };
    })()`);
    mesa.segmentadoQualidade = { antes: antesSeg, amostras: amostrasSeg };

    // d) segurar o fechar do Ajustes (E4) — solta longe de propósito
    const rectFecharAntes = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar`);
    const cx = rectFecharAntes.x + rectFecharAntes.width / 2;
    const cy = rectFecharAntes.y + rectFecharAntes.height / 2;
    await sessao.send('Input.dispatchMouseEvent', {
      x: cx, y: cy, type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse',
    });
    await dorme(180);
    const rectFecharDurante = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar`);
    // o DESENHO de dentro (o ícone), que é quem deve afundar desde o C2 —
    // a caixa acima tem de ficar igual, e este tem de encolher
    const rectIconeDurante = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar > *`);
    await sessao.send('Input.dispatchMouseEvent', {
      x: cx, y: cy - 100, type: 'mouseMoved', pointerType: 'mouse', buttons: 1,
    });
    await sessao.send('Input.dispatchMouseEvent', {
      x: cx, y: cy - 100, type: 'mouseReleased', button: 'left', buttons: 0, pointerType: 'mouse',
    });
    await dorme(450);
    const rectFecharDepois = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar`);
    const rectIconeDepois = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar > *`);
    mesa.segurarFechar = {
      antes: rectFecharAntes,
      durante: rectFecharDurante,
      depois: rectFecharDepois,
      iconeDurante: rectIconeDurante,
      iconeDepois: rectIconeDepois,
    };

    // fecha de vez (Escape) antes de passar à máquina do tempo
    await pressionarEscape(sessao);
    await dorme(500);

    // f) hover na máquina do tempo (abre/fecha sozinha)
    const linhaDoTempo = await retanguloDe(sessao, '.atlas-tempo');
    let tempoEntrada = null;
    let tempoSaida = null;
    if (linhaDoTempo) {
      const t0f1 = Date.now();
      await moverMouse(sessao, linhaDoTempo.x + linhaDoTempo.width / 2, linhaDoTempo.y + linhaDoTempo.height / 2);
      tempoEntrada = await amostrarSequencia(sessao, t0f1, [45, 120, 450], jsAmostraTempo);
      const t0f2 = Date.now();
      await moverMouse(sessao, 10, 10);
      tempoSaida = await amostrarSequencia(sessao, t0f2, [45, 120, 360, 500], jsAmostraTempo);
    }
    mesa.maquinaDoTempo = { entrada: tempoEntrada, saida: tempoSaida };

    // ---------------------------------------------------------------
    // TELEFONE — 390×844, toque emulado
    // ---------------------------------------------------------------
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: TELEFONE_W, height: TELEFONE_H, deviceScaleFactor: DPR, mobile: true,
    });
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await dorme(300);

    const telefone = { viewportInicial: { width: TELEFONE_W, height: TELEFONE_H, dpr: DPR } };
    const quadrosToque = await gravarClipe(
      sessao,
      { largura: TELEFONE_W, altura: TELEFONE_H, pastaQuadros: pastaQuadrosToque },
      async () => {
        await sessao.js(`document.querySelector('${SEL_CAMADAS_GATILHO}').click()`);
        await dorme(400);
        const antes = await sessao.js(jsAmostraPainel(SEL_CAMADAS_PAINEL));
        await tocarEArrastar(sessao, SEL_CAMADAS_PAINEL, 115, 12);
        const beforeRelease = await sessao.js(`(() => {
          const f = document.querySelector(${JSON.stringify(SEL_CAMADAS_PAINEL)});
          if (!f) return null;
          const r = f.getBoundingClientRect();
          return { inline: f.getAttribute('style'), rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
        })()`);
        await limparEventos(sessao);
        const tSolta = await tocarSoltar(sessao);
        telefone.arrastarESoltar = {
          antes,
          beforeRelease,
          // o 500 confere que a saída TERMINA e desmonta — sem ele, uma folha
          // que escorrega até fora da tela e fica presa lá passaria por boa
          amostras: await amostrarSequencia(sessao, tSolta, [13, 18, 60, 150, 300, 500], () => jsAmostraPainel(SEL_CAMADAS_PAINEL)),
          eventos: await lerEventos(sessao),
        };
      }
    );
    telefone.clipe = renderizarClipe(quadrosToque, resolve(CAPTURAS, `motion-c0-toque-${commit}.mp4`));

    // reabre e fecha pelo botão, girando DURANTE a saída (E6) — fora da
    // gravação: só o arrasto (passo 3) entra no clipe.
    await sessao.js(`document.querySelector('${SEL_CAMADAS_GATILHO}').click()`);
    await dorme(400);
    await sessao.js(`(() => {
      const b = document.querySelector('${SEL_CAMADAS_PAINEL} .hud-fechar');
      if (b) b.click();
      return Boolean(b);
    })()`);
    await dorme(30); // a saída (saiPainel, ~260ms) já começou
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: TELEFONE_H, height: TELEFONE_W, deviceScaleFactor: DPR, mobile: true,
    });
    const tGiro = Date.now();
    const [amostraGiro] = await amostrarSequencia(sessao, tGiro, [100], () => jsAmostraPainel(SEL_CAMADAS_PAINEL));
    telefone.reabrirEGirar = { viewportGirado: { width: TELEFONE_H, height: TELEFONE_W }, amostra: amostraGiro };

    // ---------------------------------------------------------------
    // MOVIMENTO REDUZIDO — mesa de novo, prefers-reduced-motion: reduce
    // ---------------------------------------------------------------
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: JANELA_W, height: JANELA_H, deviceScaleFactor: DPR, mobile: false,
    });
    await sessao.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await dorme(150);
    await sessao.js(`document.querySelector('${SEL_CAMADAS_GATILHO}').click()`);
    await dorme(400);
    // O PRÓPRIO `.hud-interruptor` transita com `--t-rapido` (fundo/borda);
    // é o `::after` (a bolinha) quem usa `--t-normal` (transform/fundo) —
    // o achado do auditor (E5) é sobre a BOLINHA, não sobre a caixa: sem
    // ler o `::after` esta amostra mede o token errado.
    const reducedMotion = await sessao.js(`(() => {
      const chk = document.querySelector('${SEL_CAMADAS_PAINEL} .hud-interruptor');
      if (!chk) return null;
      const cs = getComputedStyle(chk);
      const csDepois = getComputedStyle(chk, '::after');
      return {
        checked: chk.checked,
        transitionDuration: cs.transitionDuration,
        transitionProperty: cs.transitionProperty,
        bolinhaTransitionDuration: csDepois.transitionDuration,
        bolinhaTransitionProperty: csDepois.transitionProperty,
        tokenRapido: cs.getPropertyValue('--t-rapido').trim(),
        tokenEntrada: cs.getPropertyValue('--t-entrada').trim(),
        tokenNormal: cs.getPropertyValue('--t-normal').trim(),
      };
    })()`);

    // ---------------------------------------------------------------
    // RELATÓRIO
    // ---------------------------------------------------------------
    // OS TRÊS ABAIXO (idioma/preset/ui) leem a QUERY EFETIVA (depois de
    // `--query`, se houver) — nunca um texto fixo, que ficaria errado
    // assim que `lang=`/`q=`/`ui=` chegassem por ali sobrescritos.
    const relatorio = {
      meta: {
        commit,
        dirty,
        appCommit: APP_COMMIT,
        chrome: versaoChrome.product,
        userAgent: versaoChrome.userAgent,
        app: APP,
        query: QUERY,
        idioma: META_DA_QUERY.lang,
        preset: META_DA_QUERY.q,
        ui: META_DA_QUERY.ui ? `?ui=${META_DA_QUERY.ui}` : 'default (sem ?ui=)',
        viewportInicial,
        dpr,
        geradoEm: new Date().toISOString(),
      },
      mesa: { viewport: { width: JANELA_W, height: JANELA_H, dpr: DPR }, ...mesa },
      telefone,
      reducedMotion: { camadasInterruptor: reducedMotion },
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c0-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    // ---------------------------------------------------------------
    // RESUMO
    // ---------------------------------------------------------------
    const em = (amostras, alvoMs) => amostras.find((a) => a.alvoMs === alvoMs) || amostras[0];
    const e1 = telefone.arrastarESoltar.amostras;
    // "cedo" é o PRIMEIRO instante em que já sumiu, não o primeiro
    // checkpoint da lista — os alvos (13/18/60/150/300ms) são
    // crescentes, então o primeiro `existe:false` na ordem já é o mais
    // cedo que a sonda flagrou.
    const e1UltimoPresente = [...e1].reverse().find((a) => a.existe === true);
    const e1PrimeiroAusente = e1.find((a) => a.existe === false);
    const e1ReproduzCedo = Boolean(e1PrimeiroAusente && e1PrimeiroAusente.alvoMs <= 60);
    // PRESA SÓ SE O RELÓGIO DA PÁGINA ANDOU (reauditoria de 11/09): numa
    // rodada a folha ficou no ponto da soltura de 13 a 501 ms, e a mesma
    // base, repetida com e sem gravação, em Chrome visível e headless,
    // sempre saiu e desmontou antes dos 500 ms. A saída fica PENDENTE até
    // o próximo quadro (medido: nenhum quadro nos primeiros ~45 ms depois
    // de soltar, em toda configuração); se o Chrome da sonda para de
    // desenhar, a linha do tempo do documento para junto e nada anda com
    // ela. Sem esta conta a sonda chamava de defeito um navegador parado.
    const e1Primeira = e1[0];
    const e1Ultima = e1[e1.length - 1];
    const e1RelogioMs =
      typeof e1Primeira?.linhaDoTempo === 'number' && typeof e1Ultima?.linhaDoTempo === 'number'
        ? e1Ultima.linhaDoTempo - e1Primeira.linhaDoTempo
        : null;
    const e1ParedeMs = e1Ultima && e1Primeira ? e1Ultima.dtMs - e1Primeira.dtMs : 0;
    const e1SemQuadros = !e1PrimeiroAusente && e1RelogioMs !== null && e1RelogioMs < e1ParedeMs / 2;
    const e1Waapi = e1UltimoPresente?.waapi?.[0];
    const e2 = em(mesa.fecharEscape.amostras, 40);
    const e2Reproduz = e2.existe === true && e2.active?.tag === 'BODY';
    const e3 = em(mesa.trocarAjustes.amostras, 50);
    // DESLOCADO EM RELAÇÃO A ONDE ASSENTA, e não em relação à borda da
    // tela: o Ajustes mora em x≈944 numa janela de 1440, então "x > 100"
    // acusava o próprio lugar de repouso como recomeço.
    const e3Assentado = mesa.trocarAjustes.amostras[mesa.trocarAjustes.amostras.length - 1];
    const e3OffsetX = e3.existe && e3Assentado?.existe ? e3.rect.x - e3Assentado.rect.x : null;
    const e3Reproduz = e3OffsetX !== null && Math.abs(e3OffsetX) > 4;
    const iconeDurante = mesa.segurarFechar.iconeDurante;
    const iconeDepois = mesa.segurarFechar.iconeDepois;
    const e4Encolhe = rectFecharDurante.width < rectFecharAntes.width - 0.5;
    const e5Reproduz = reducedMotion && Number.parseFloat(reducedMotion.bolinhaTransitionDuration) > 0.05;
    const e6Reproduz = amostraGiro.existe === true && amostraGiro.inert === true;

    const linhas = [
      `=== sonda-motion c0 — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app ${APP_COMMIT} ===`,
      `Chrome ${versaoChrome.product} | mesa ${JANELA_W}x${JANELA_H} DPR${dpr} | ${ROTULO_DA_QUERY}`,
      `clipe mesa: ${mesa.clipe} (${quadrosMesa.length} quadros)`,
      `clipe toque: ${telefone.clipe} (${quadrosToque.length} quadros)`,
      `E1 folha solta (toque): presente aos ${e1UltimoPresente ? e1UltimoPresente.dtMs.toFixed(1) : '—'}ms, `
        + `ausente aos ${e1PrimeiroAusente ? e1PrimeiroAusente.dtMs.toFixed(1) : 'nunca (ficou até o fim)'}ms `
        + `(WAAPI por último: ${e1Waapi ? `${e1Waapi.playState}${e1Waapi.pending ? ' pendente' : ''} em ${e1Waapi.currentTime}ms` : 'nenhuma'}; `
        + `linha do tempo da página andou ${e1RelogioMs === null ? '?' : Math.round(e1RelogioMs)}ms em ${e1ParedeMs}ms de relógio) — `
        + `${e1ReproduzCedo ? 'reproduz (some bem antes da transição acabar)'
          : e1PrimeiroAusente ? 'não reproduz'
          : e1SemQuadros ? 'INCONCLUSIVO (o Chrome da sonda quase não desenhou quadro: a saída ficou pendente, não presa — repita a rodada)'
          : 'PRESA (a página desenhou e a saída não desmontou)'}`,
      `E2 foco no Esc (mesa): aos ${e2.dtMs}ms active=${e2.active?.tag}/${e2.active?.gatilho ?? '-'} painel=${e2.existe} — `
        + `${e2Reproduz ? 'reproduz (foco em BODY, painel ainda visível)' : 'não reproduz'}`,
      `E3 troca Camadas→Ajustes (mesa): aos ${e3.dtMs}ms deslocado ${e3OffsetX}px do repouso — `
        + `${e3Reproduz ? 'reproduz (recomeça deslocado)' : 'não reproduz (já assentado)'}`,
      `E4 caixa do fechar sob pressão: antes ${rectFecharAntes.width.toFixed(2)}px, durante ${rectFecharDurante.width.toFixed(2)}px, depois ${rectFecharDepois.width.toFixed(2)}px — `
        + `${e4Encolhe ? 'reproduz (encolhe sob pressão)' : 'não reproduz'}`
        + ` | ícone ${iconeDurante ? iconeDurante.width.toFixed(2) : '?'}px pressionado × ${iconeDepois ? iconeDepois.width.toFixed(2) : '?'}px solto`,
      `E5 reduced motion (bolinha do interruptor de Camadas, ::after): transitionDuration=${reducedMotion?.bolinhaTransitionDuration ?? '?'} (caixa=${reducedMotion?.transitionDuration}/--t-rapido=${reducedMotion?.tokenRapido}, --t-entrada=${reducedMotion?.tokenEntrada}, --t-normal=${reducedMotion?.tokenNormal}) — `
        + `${e5Reproduz ? 'reproduz (a bolinha ainda transiciona por --t-normal)' : 'não reproduz'}`,
      `E6 giro durante a saída (toque): aos ${amostraGiro.dtMs}ms existe=${amostraGiro.existe} inert=${amostraGiro.inert} animation=${amostraGiro.animationName} — `
        + `${e6Reproduz ? 'reproduz (ainda executando a saída antiga)' : 'não reproduz'}`,
      `segmentado "Qualidade": ${antesSeg} → ${amostrasSeg[amostrasSeg.length - 1]?.onTexto}, --seg-x/--seg-w em ${JSON.stringify(amostrasSeg[amostrasSeg.length - 1]?.segX)}/${JSON.stringify(amostrasSeg[amostrasSeg.length - 1]?.segW)}`,
      `máquina do tempo (hover): entrada opacity ${tempoEntrada?.[0]?.opacity}→${tempoEntrada?.[tempoEntrada.length - 1]?.opacity}, saída ${tempoSaida?.[0]?.opacity}→${tempoSaida?.[tempoSaida.length - 1]?.opacity}, existe no fim=${tempoSaida?.[tempoSaida.length - 1]?.existe}`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } finally {
    await sessao.fechar();
  }
} catch (erro) {
  process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
  process.exitCode = 1;
} finally {
  rmSync(pastaQuadrosMesa, { recursive: true, force: true });
  rmSync(pastaQuadrosToque, { recursive: true, force: true });
}
} else {
  await rodarSequencia();
}
