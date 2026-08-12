// Prova de que uma mudança NÃO mexeu na imagem: md5 das mesmas vistas antes
// e depois.
//
//   node scripts/visual/ab-identidade.mjs antes      # no HEAD, antes de editar
//   ...edita...
//   node scripts/visual/ab-identidade.mjs depois     # compara e dá o veredito
//   node scripts/visual/ab-identidade.mjs antes interno   # uma vista só
//   SMOKE=1 node scripts/visual/ab-identidade.mjs antes   # 4 vistas-sentinela
//   JOBS=1 node scripts/visual/ab-identidade.mjs antes    # serial (padrão: 3)
//
// POR QUE NÃO `--virtual-time-budget --screenshot`, que é como `rodada.mjs`
// captura: o orçamento de tempo virtual acelera TIMERS, não a REDE. Os ~6 MB
// de cartografia e o pool de nuvens-semente chegam antes ou depois dele
// conforme a sorte, e a MESMA vista sai em estados diferentes. Medido em
// 2026-08-07 no mesmo commit: t=100 devolveu a60fe9ce / 40f306d2 / effb3b85 em
// três capturas, com e sem `?q=cinema`, com orçamento de 16 s e de 32 s.
// Aqui a captura ESPERA — e o QUE ela espera mudou na reforma de 2026-08-11:
//
//   ANTES: o log da cartografia e mais 700 quadros desenhados depois dele.
//   Funcionava, e custava ~70 s POR CAPTURA (a leva roda a ~10 fps numa vista
//   de 1800×1800): 30 capturas = ~45 min, quase tudo esperando no escuro.
//   700 nunca foi medido — era folga escolhida quando o virtual time falhou.
//
//   AGORA: o SINAL do próprio app, `window.__director.captura.pronto` (ver o
//   getter `captura` em `src/three/director.ts`), que só sobe quando o `init`
//   terminou, nada está andando, o Sol tem retrato completo publicado e a
//   cena já desenhou 10 quadros sem perturbação. ~6 s por captura. Sondado
//   antes de trocar: `sol`, `travessia` e `soldisco` já devolvem o md5
//   OFICIAL no primeiro quadro depois do deep-link — nos marcos 1, 2, 3, 5,
//   10, 30, 80, 320 e 700 o hash é o mesmo. O método NÃO afrouxou: N=2 por
//   vista, navegador limpo por captura, tier pinado, md5 bit-exato.
//   O critério antigo continua vivo como TETO DE SEGURANÇA: se o sinal não
//   existir (bundle de produção — `window.__director` só é publicado em DEV)
//   ou não subir, a captura cai nos 700 quadros em vez de travar. A coluna
//   `via=` de cada linha diz por qual caminho ela assentou; uma leva inteira
//   em `via=quadros` é sinal quebrado, não lentidão de hardware — e desde
//   2026-08-11 isso não é só um aviso no rodapé: no alvo padrão, QUALQUER
//   captura por `quadros` faz o gate imprimir o bloco de erro e SAIR ≠ 0
//   (`julgarProntidao` em chrome.mjs). `FALLBACK_OK=1` aceita de propósito.
//
// PARALELISMO POR DIVISÃO DA LISTA (`JOBS=N`, padrão 3): o pai reparte as
// vistas entre N processos-filhos independentes, cada um com o SEU Chrome e o
// SEU perfil; o dev server é um só (serve estático, aguenta). Nunca N abas ou
// contextos num Chrome só — a bit-exatidão sob GPU compartilhada não está
// documentada em lugar nenhum, e o gate inteiro depende dela. Cada filho grava
// o seu arquivo de estado e o pai funde no JSON de sempre, no formato exato de
// antes. `JOBS=1` roda tudo em processo, em série — é assim que se isola a
// prova do sinal da prova do paralelismo.
//
// LEIA O VEREDITO CERTO: md5 igual prova igualdade; md5 diferente NÃO prova
// diferença — pode ser captura não assentada. Por isso N capturas por lado e
// a marca INSTÁVEL quando um dos lados não repete. E "DIFERE" pede o passo
// seguinte, não a conclusão: rodar o diff de pixel. Diferença de 1 nível
// espalhada por dezenas de pixels é 1 ULP do compilador (reordenar aritmética
// ao mudar um `if` já basta), não conteúdo que sumiu.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  CHROME, GPU_FLAGS, matarPerfil, portaDoPerfil, esperarAssentar, julgarProntidao, APP_PADRAO,
} from './chrome.mjs';

const LADO = process.argv[2] || 'antes';
const SO = process.argv[3];
const N = 2;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// EXPORTADA porque a régua 3 (`planeta-pixel.mjs`) mede as MESMAS vistas
// profundas com as MESMAS strings de deep-link. Redigitar `?pos=0,0,0.00072722`
// num segundo arquivo compraria uma divergência silenciosa: a régua diria
// "medido a 0,5 px" de uma câmera que não é a do md5 oficial.
export const VISTAS = [
  // O ATO DO SOL não tinha vista, e as duas alavancas que sobram na fila de
  // performance (nebulosa atrás da fotosfera, LUT do flick da coroa) vivem
  // inteiras aqui: t=0..12 para uma, t=0..~20 para a outra. Com a lista
  // começando em t=40, o gate era cego justamente para elas — e é o trecho
  // mais olhado do filme. t=6 pega o Sol grande na tela, com coroa, raias e
  // proeminências vivas.
  ['sol', '?t=6&shot=2'],
  ['interno', '?t=40&shot=2'],
  ['travessia', '?t=100&shot=2'],
  ['mergulho', '?t=180&shot=2'],
  ['edgeon', '?t=261&shot=2'],
  ['faceon', '?t=293&shot=2'],
  // RETRATO POR PADRÃO, não opt-in. Os três harnesses do repo capturam em 1:1
  // (rodada 1800x1800, sky 1440x1440, este 1800x1800), e defeito que dependa
  // do ASPECTO da tela é invisível para todos eles. Foi exatamente o caso da
  // margem lateral do recorte de sprite da galáxia: a versão errada passava
  // nas cinco vistas quadradas. Uma sonda que alguém precisa lembrar de rodar
  // não fecha buraco nenhum — por isso esta linha, e não uma variável de
  // ambiente. 700x1800 dá aspecto 0,40, abaixo do limiar onde a margem
  // derivada só da altura começa a apagar ponto.
  ['retrato', '?t=100&shot=2', '700x1800'],
  // ------------------------------------------------------------------
  // ONDA 3 — as vistas que faltavam para o motor estelar (PLANO-ATLAS.md:446
  // pede "Sol pixel-igual em 4 condições e heroes em 3 distâncias"; nenhuma
  // existia). `?t=` não serve: o instante amarra a distância ao trajeto da
  // hélice, e o que se quer medir é a DISTÂNCIA. `?pos=&look=` (App.tsx:137-145)
  // crava a câmera no ponto exato — aqui, olhando a origem (o Sol) ou a estrela.
  //
  // As 4 do Sol caem uma em cada regime do crossfade disco↔clarão
  // (lodStellar.ts): 0,10 pc = disco pleno (uWorldFade 1, uGain 0); 0,25 =
  // meio da rampa do disco (uWorldFade 0,5, uGain 0,77); 0,32 = o estouro,
  // logo antes do corte duro de custo `world > 0.02` que cai em 0,3249 pc
  // (uWorldFade 0,034, uGain 1, uCore 0,07 — é a vista que denuncia se
  // alguém mover uma casa decimal); 0,50 = estrela pura (grupo do disco
  // apagado, uGain e uCore em 1).
  ['soldisco', '?pos=0,0,0.1&look=0,0,0&shot=2'],
  ['solrampa', '?pos=0,0,0.25&look=0,0,0&shot=2'],
  ['solestouro', '?pos=0,0,0.32&look=0,0,0&shot=2'],
  ['solestrela', '?pos=0,0,0.5&look=0,0,0&shot=2'],
  // As de hero são Betelgeuse (152,67 pc de casa, a supergigante do Ato II),
  // a câmera na PRÓPRIA reta Sol→estrela. As três distâncias são os três
  // regimes do `farFade` do billboard (heroStars.ts:58, 320→900 pc): 200 pc
  // = presença 1; 600 = meio da rampa (0,526); 950 = presença 0, o hero não
  // desenha mais e só o ponto do catálogo sobra. As três ficam com dHome
  // abaixo de 1200, senão o corte de director.ts:885 desligaria o grupo
  // inteiro e as três vistas mediriam a mesma coisa (nada).
  //
  // E `hero8`, a QUARTA: medida antes de escolher as outras três, o
  // billboard de Betelgeuse tem RAIO de 0,45 px a 200 pc, 0,15 a 600 e 0,10
  // a 950 — o tamanho na tela é `uSize/(d·tan29°)` e não depende da lente
  // (o `uZoom` cancela o fov de propósito, heroStars.ts:14-16). Ou seja: as
  // três vistas do farFade são regimes do CONTRATO, mas nelas o hero é
  // sub-pixel, e a dupla-luz hero↔catálogo que a fase 3 vai desfazer não
  // aparece em nenhuma. A 8 pc o mesmo billboard tem 11,3 px de raio: é a
  // única em que se PODE ver o hero e o ponto do catálogo somando luz na
  // mesma posição — a vista que julga a decisão D2.
  //
  // [fase 3, correção de fato] "a única" vale para BETELGEUSE, não para
  // as 16. Perto de casa a soma de luz é a REGRA: a 0,06 pc oito das 16
  // têm billboard maior que o próprio ponto, e nas quatro vistas do Sol
  // é α Centauri (1,4 pc) quem soma as duas luzes dentro do quadro —
  // medido com `?dom=1`, são elas e a hero8 que mudam quando a cessão
  // liga. hero8 continua julgando a D2 em Betelgeuse; as do Sol julgam
  // o caso vizinho, que é o mais comum.
  ['hero200', '?pos=7.3677,349.6513,45.4654&look=3.1895,151.3642,19.682&shot=2'],
  ['hero600', '?pos=15.7242,746.2254,97.0322&look=3.1895,151.3642,19.682&shot=2'],
  ['hero950', '?pos=23.0362,1093.2277,142.1532&look=3.1895,151.3642,19.682&shot=2'],
  ['hero8', '?pos=3.0224,143.4327,18.6507&look=3.1895,151.3642,19.682&shot=2'],
  // ------------------------------------------------------------------
  // ONDA 4 — o DOMÍNIO PROFUNDO, em UA. Nenhuma das 15 acima chega perto
  // do Sol na escala do sistema solar: a mais próxima é `sol`, a 0,063151
  // pc = ~13.000 UA, e o piso do filme inteiro é essa distância. As três
  // abaixo caem ABAIXO do piso, onde a Onda 4 dissolve a fotosfera
  // artística e acende os planetas por fotometria — a única faixa em que
  // o gate pode enxergar o frame local em UA de dentro.
  //
  // `?pos=` e não `?t=`: o instante amarra a distância ao trajeto da
  // hélice, e o que se quer cravar é a DISTÂNCIA. Câmera no eixo z da
  // cena olhando a origem (o Sol), como as quatro do Sol acima.
  //
  // ELAS ENTRAM NA LISTA ANTES DE QUALQUER CÓDIGO DA ONDA, de propósito:
  // a baseline delas nasce no HEAD sem a onda, e é isso que desarma a
  // armadilha do veredito (vista sem "antes" saía como linha NOVA e não
  // como comparação). No "antes" as três mostram só o fundo — o `near`
  // atual clipa tudo a menos de ~206 UA da câmera —, e esse fundo é a
  // baseline legítima contra a qual o "depois" vai diferir.
  //
  // As distâncias (o conversor é AU_PARA_PC = 1/206264,80624548031):
  //   ua500 = 0,0024241 pc = 500,01 UA — Sol-estrela, Júpiter fraco
  //   ua150 = 0,00072722 pc = 150,00 UA — o desfile a olho nu, sistema
  //           inteiro em quadro (escorço 0,917, quase face-on)
  //   ua40  = 0,00019393 pc = 40,00 UA — a família como faróis, na
  //           travessia da órbita de Netuno
  ['ua500', '?pos=0,0,0.0024241&look=0,0,0&shot=2'],
  ['ua150', '?pos=0,0,0.00072722&look=0,0,0&shot=2'],
  ['ua40', '?pos=0,0,0.00019393&look=0,0,0&shot=2'],
  // ------------------------------------------------------------------
  // ONDA 6 (F2a) — A TERRA RESOLVIDA, no jd PINADO da onda
  // (2024-04-08, o mesmo do eclipse de F2c — a época viva não captura).
  // A câmera fica a 4 raios do CENTRO da Terra viva (efeméride pelo
  // ?jd=), do lado ILUMINADO, 35° fora do eixo Terra→Sol: mais de meio
  // disco aceso (a lição do negate da Onda 5), terminador e lado
  // noturno em quadro — dia, noite, nuvens e limbo da atmosfera numa
  // captura só (~795 px de diâmetro em 1800 px). Os números saíram da
  // MESMA cadeia do app (efemerides.bin → eclipticaParaEquatorial →
  // AU_PARA_PC), calculados uma vez e pinados aqui como os ?pos= acima.
  // O par &nobloom=1 é GATE (emenda T-E10): é nele que se lê o subsolar
  // sem o clarão, contra o limiar 0,82 do bloom.
  [
    'terra',
    '?pos=-0.0000045882235587153385,-0.0000014555632225072523,-6.307425015010789e-7'
      + '&look=-0.0000045890070378484725,-0.000001455314175436054,-6.308304960541221e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'terranb',
    '?pos=-0.0000045882235587153385,-0.0000014555632225072523,-6.307425015010789e-7'
      + '&look=-0.0000045890070378484725,-0.000001455314175436054,-6.308304960541221e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
  // ------------------------------------------------------------------
  // ONDA 6 (F2b) — A LUA RESOLVIDA, no MESMO jd pinado da onda (que é o
  // dia do eclipse solar de 2024: a Lua está entre o Sol e a Terra, e o
  // lado voltado ao Sol — o que a câmera vê — está aceso).
  //
  // `lua`: a câmera a 4 raios lunares, 20° fora do eixo Lua→Sol — disco
  // de ~795 px, quase cheio. É a vista que JULGA a lei de
  // Lommel-Seeliger a olho: o disco tem de ler CHATO com borda dura
  // (regolito), não esfera sombreada de Lambert — o fato fotométrico
  // que se confere contra uma fotografia.
  //
  // `terralua`: o primeiro PAR da casa — a câmera além da Lua (lado do
  // Sol), 20° fora do eixo Terra→Lua, olhando a TERRA: a Lua resolvida
  // a ~404 px em primeiro plano e a Terra a ~55 px ao fundo, sem
  // oclusão (20° contra 7,1° de raio angular da Lua), os dois
  // iluminados. Números da MESMA cadeia do app (efemerides.bin →
  // eclipticaParaEquatorial → AU_PARA_PC), calculados uma vez e
  // pinados como os ?pos= acima.
  [
    'lua',
    '?pos=-0.000004577765217805196,-0.0000014518586579005272,-6.2925581919652e-7'
      + '&look=-0.000004577990409167882,-0.000001451855297832381,-6.292543536189472e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'terralua',
    '?pos=-0.000004577540038198493,-0.0000014518632898141814,-6.292550387276077e-7'
      + '&look=-0.0000045890070378484725,-0.000001455314175436054,-6.308304960541221e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
];
// SENTINELA (`SMOKE=1`): as três que mais pegam regressão. `sol` é o disco
// solar inteiro (coroa, raias, proeminências, o ato mais olhado do filme);
// `soldisco` é o campo com a cessão de dominância ligada a 0,1 pc — foi ela
// que mudou quando `DOMINANCE_DEFAULT_ON` virou true; `hero8` é o hero de
// perto, a única vista em que billboard e ponto do catálogo dividem o mesmo
// lugar com 11,3 px de raio. E `ua150` desde a Onda 4: é a única sentinela
// DENTRO do domínio profundo (150 UA), com o sistema solar inteiro em quadro
// — sem ela, iterar na onda dos planetas seria iterar às cegas.
// SENTINELA É PARA ITERAR: o gate de fechamento continua sendo a leva
// COMPLETA das 18 — quatro vistas não cobrem o aspecto (retrato), nem a
// travessia, nem o mergulho, nem os regimes do farFade.
const SENTINELAS = ['sol', 'soldisco', 'hero8', 'ua150'];
const APP = process.env.APP_URL || APP_PADRAO;
// TIER FIXO, e ele não é preferência: sem `?q=` o `autoQuality` do engine
// rebaixa cinema→alta→performance sozinho assim que a média cai de 42 fps
// (engine.ts), e isso troca `nebulaSteps` 56→30 e o `pixelRatio` NO MEIO da
// espera. Numa máquina que segura 60 fps o degrau nunca dispara e `q=cinema`
// é BIT-EXATO (mesmo tier, mesmo preset — só desliga o automático); numa que
// não segura, sem ele o gate compara duas imagens tiradas em qualidades
// diferentes e chama a diferença de regressão. Medido aqui: o app assenta em
// `performance` (raymarch de 30 passos) em toda captura, e o `nearCeiling`
// do engine ainda pode reacelerar para `alta`.
export const PIN = '&q=cinema';
// EXTRA=&knob=1 anexa um parâmetro a TODAS as vistas — o A/B de um knob se faz
// com o mesmo binário dos dois lados, sem editar nada entre as capturas.
//
// É POR AQUI QUE SE PROVA NEUTRALIDADE ONDE O md5 É CEGO (Onda 4, régua 3;
// cobrado de novo no gate da F6 da Onda 5). Perto do Sol o clarão satura o
// quadro: `ua150` e `ua40` devolvem md5 IGUAIS com céus diferentes, e uma
// mudança escondida atrás do branco passaria batida. O par honesto é
//
//   EXTRA='&nobloom=1' node scripts/visual/ab-identidade.mjs antes|depois
//
// com o bloom desligado dos DOIS lados. Medido na F6 (6 vistas em que o Sol
// domina, 900×900): 6/6 bit-idênticas.
const EXTRA = process.env.EXTRA || '';
// ...e o estado de uma leva com EXTRA NÃO pisa no estado da leva oficial. Sem
// este sufixo, quem rodasse o A/B do knob apagaria a baseline dos 18 md5 e
// só descobriria na próxima leva de fechamento — ~25 min de GPU para
// recapturar.
// ...e a JANELA entra no sufixo pelo MESMO argumento, palavra por palavra:
// ela muda a imagem tanto quanto o EXTRA, e uma varredura ad hoc de aspecto
// que gravasse no estado da leva oficial apagaria a mesma baseline pelo mesmo
// preço. Era o defeito irmão, e ele tinha ficado de fora do conserto.
const CHAVE_DO_ESTADO = `${EXTRA}${process.env.JANELA || ''}`;
const SUFIXO = CHAVE_DO_ESTADO ? `-${CHAVE_DO_ESTADO.replace(/[^a-z0-9]+/gi, '')}` : '';
// JANELA=700x1800 muda o tamanho da captura. Existe porque os TRÊS harnesses do
// repo capturam em 1:1 (rodada 1800x1800, sky 1440x1440, este 1800x1800), e
// qualquer defeito que dependa do ASPECTO da tela é invisível para todos eles —
// o corte lateral de sprite é exatamente desse tipo.
// JANELA=LxA sobrescreve o tamanho de TODAS as vistas, para varredura ad hoc.
const ESTADO = resolve(tmpdir(), `ab-identidade-${LADO}${SUFIXO}.json`);
// o filho recebe a sua fatia por ambiente; a linha de comando continua sendo
// a de sempre (`lado [vista]`), para nada do ritual mudar
const FILHO = process.env.AB_FILHO ? Number(process.env.AB_FILHO) : null;
const JOBS = Math.max(1, Number(process.env.JOBS || 3));
const SMOKE = process.env.SMOKE === '1' || process.env.SMOKE === 'true';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let id = 0;
function rpc(ws, onEvent) {
  const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    else if (m.method) onEvent(m);
  });
  return (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    waiting.set(n, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

let seqPerfil = 0;
async function capturar(query, png, janela) {
  const [jw, jh] = (janela || process.env.JANELA || '1800x1800').split('x');
  let efetivo = '?';
  const perfil = resolve(tmpdir(), `ab-${process.pid}-${seqPerfil++}`);
  // PORTA ZERO: quem escolhe é o SO, e o Chrome publica a escolha no
  // DevToolsActivePort do próprio perfil. Com N filhos em paralelo (e duas
  // levas simultâneas na mesma máquina) não sobra aritmética de porta para
  // errar — era a única corrida de verdade do paralelismo por lista.
  const chrome = spawn(CHROME, [
    ...GPU_FLAGS,
    '--hide-scrollbars', '--no-first-run', '--mute-audio',
    '--force-device-scale-factor=1', `--window-size=${jw},${jh}`,
    `--user-data-dir=${perfil}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    const porta = await portaDoPerfil(perfil);
    let url = null;
    for (let i = 0; i < 100 && !url; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
        url = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
      } catch { /* Chrome ainda subindo */ }
      if (!url) await sleep(200);
    }
    if (!url) throw new Error('CDP não respondeu');
    const ws = new WebSocket(url);
    // COM TIMEOUT, e ele já custou uma bateria inteira: se o alvo do CDP morre
    // entre o /json/list e o handshake, nem `open` nem `error` disparam. A
    // promessa fica pendente para sempre, o Node fica sem handles, e o processo
    // SAI com um aviso de "unsettled top-level await" — três vistas capturadas,
    // nenhuma gravada, e um veredito que nunca vem.
    await new Promise((r, j) => {
      const relogio = setTimeout(() => j(new Error('WebSocket do CDP não abriu em 30 s')), 30000);
      ws.addEventListener('open', () => { clearTimeout(relogio); r(); });
      ws.addEventListener('error', (e) => { clearTimeout(relogio); j(new Error('WebSocket: ' + e.message)); });
    });
    let cartografiaChegou = false;
    const send = rpc(ws, (m) => {
      if (m.method === 'Runtime.consoleAPICalled') {
        const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
        if (txt.includes('[cartografia]')) cartografiaChegou = true;
      }
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__f=0;const o=window.requestAnimationFrame.bind(window);'
        + 'window.requestAnimationFrame=(c)=>o((t)=>{window.__f++;return c(t)});',
    });
    await send('Page.navigate', { url: APP + '/' + query });
    const assentou = await esperarAssentar({
      send, cartografia: () => cartografiaChegou, quadros: 700, teto: 180000,
    });
    // buffer EFETIVO, não a janela pedida: 700x1800 vira 684x1705 depois da
    // barra de rolagem e do chrome do headless, e é o buffer que decide o
    // aspecto que o shader vê
    const buf0 = await send('Runtime.evaluate', {
      expression: "(()=>{const c=document.querySelector('canvas');"
        + "return c?c.width+'x'+c.height:'?'})()",
      returnByValue: true,
    });
    efetivo = buf0.result.value;
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    // captura preta ou página de erro: um md5 estável de NADA passaria no teste
    if (buf.length < 40000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
    if (png) writeFileSync(png, buf);
    return {
      hash: createHash('md5').update(buf).digest('hex').slice(0, 12) + '@' + efetivo,
      via: assentou.via,
      ms: assentou.ms,
    };
  } finally {
    chrome.kill();
    matarPerfil(perfil);
    await sleep(400);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* perfil preso */ }
  }
}

/**
 * Captura uma lista de vistas em SÉRIE e grava o resultado em `arquivo` a
 * cada vista concluída. É o corpo do laço de sempre — o pai serial e cada
 * filho do paralelo chamam exatamente este.
 *
 * `base` é o que JÁ estava medido: no pai serial é o estado lido do disco,
 * e ele precisa ser reescrito junto a cada vista, senão uma queda no meio da
 * leva deixaria em disco só as vistas desta rodada — a retomada perderia
 * justamente as boas que já custaram GPU.
 *
 * Devolve `{ out, vias }`: `vias` é uma entrada por CAPTURA (não por vista),
 * 'sinal' ou 'quadros', e é o que `julgarProntidao` julga no fim da leva.
 */
async function capturarLista(vistas, arquivo, marca = '', base = {}) {
  const out = { ...base };
  const vias = [];
  for (const [nome, query, janela] of vistas) {
    out[nome] = [];
    const daVista = [];
    for (let k = 0; k < N; k++) {
      // capturas/ é gitignored e não existe em clone novo — criar aqui, senão
      // a única forma de OLHAR a diferença (o diff de pixel) morre no open()
      const png = SO ? resolve(ROOT, 'capturas', `ab-${LADO}-${nome}-${k}.png`) : null;
      if (png) mkdirSync(resolve(ROOT, 'capturas'), { recursive: true });
      // uma segunda chance por captura: o Chrome headless morre no arranque de
      // vez em quando, e perder a bateria por isso é caro demais
      let r = null;
      for (let tent = 1; tent <= 2 && r === null; tent++) {
        try {
          r = await capturar(query + PIN + EXTRA, png, janela);
        } catch (e) {
          console.log(`${marca}  ${nome} ${k} tentativa ${tent} falhou: ${e.message}`);
          if (tent === 2) throw e;
        }
      }
      out[nome].push(r.hash);
      vias.push(r.via);
      daVista.push(`${r.via}/${(r.ms / 1000).toFixed(0)}s`);
    }
    console.log(`${marca}${nome.padEnd(10)} ${out[nome].join(' ')}  via=${daVista.join(' ')}`);
    // por VISTA, não no fim: o estado sobrevive a uma queda no meio
    writeFileSync(arquivo, JSON.stringify(out, null, 1));
  }
  writeFileSync(arquivo, JSON.stringify(out, null, 1));
  return { out, vias };
}

// O arquivo de `via` de cada filho, ao LADO do arquivo de md5 e não dentro
// dele: o de md5 tem o formato exato do estado de retomada (`{vista: [hash]}`)
// e o pai o funde com um `Object.assign` — enfiar metadado ali contaminaria a
// baseline que sobrevive entre sessões por uma economia de um arquivo.
const viasDoFilho = (k) => resolve(tmpdir(), `ab-identidade-${LADO}${SUFIXO}-j${k}-vias.json`);

/**
 * O VEREDITO da leva, puro — sem Chrome, sem disco, testado em
 * `ab-identidade.test.mjs`.
 *
 * A ARMADILHA QUE ELE FECHA: o laço antigo abria com
 * `if (!md5[nome] || !antes[nome]) continue;`. Uma vista ACRESCENTADA à lista
 * depois de capturar o "antes" não tinha baseline, caía no `continue` e sumia
 * — sem linha na tela e sem afetar o `>>> BIT-IDÊNTICO`, que saía verde tendo
 * julgado uma vista a menos. O mesmo `continue` engolia o espelho: uma vista
 * que o "depois" NÃO capturou (queda no meio da leva, estado de disco
 * incompleto) também passava batido. Gate que aprova o que não mediu é pior
 * que gate quebrado — a mesma lição do teto de segurança (`julgarProntidao`).
 *
 * A regra:
 * - sem "depois" → **AUSENTE**, e é ERRO: a comparação está incompleta e o
 *   veredito não vale. Recapture o lado que falta (o estado é retomável).
 * - com "depois" e sem "antes" → **NOVA**: não há o que comparar, a baseline
 *   dela nasce agora. Não é erro, mas TEM linha e entra no resumo — nunca
 *   silêncio.
 * - os dois lados presentes → `INSTÁVEL` (um dos lados não repetiu o próprio
 *   md5), `IGUAL` (interseção não vazia) ou `DIFERE`, como sempre.
 *
 * `vistas` é a lista de NOMES que ESTA invocação cobre (a leva completa, ou o
 * recorte de `SMOKE`/vista única) — julgar sempre as 18 faria `SMOKE=1 depois`
 * reprovar por AUSENTE as 14 que ninguém pediu. `antes` e `depois` são os
 * mapas `{vista: [hash, ...]}` dos dois lados.
 */
export function julgarVistas({ vistas = [], antes = {}, depois = {} }) {
  const linhas = [];
  const conta = { IGUAL: 0, DIFERE: 0, INSTÁVEL: 0, NOVA: 0, AUSENTE: 0 };
  for (const nome of vistas) {
    const a = antes[nome]?.length ? [...new Set(antes[nome])] : null;
    const d = depois[nome]?.length ? [...new Set(depois[nome])] : null;
    let veredito;
    if (!d) veredito = 'AUSENTE';
    else if (!a) veredito = 'NOVA';
    else if (a.length > 1 || d.length > 1) veredito = 'INSTÁVEL';
    else veredito = a.some((h) => d.includes(h)) ? 'IGUAL' : 'DIFERE';
    conta[veredito]++;
    linhas.push({
      nome,
      veredito,
      antes: a,
      depois: d,
      texto: `${veredito.padEnd(9)} ${nome.padEnd(10)} `
        + `antes=${a ? a.join(',') : '—'} depois=${d ? d.join(',') : '—'}`,
    });
  }
  const julgadas = conta.IGUAL + conta.DIFERE + conta.INSTÁVEL;
  const erro = conta.AUSENTE > 0;
  const bitIdentico = !erro && conta.DIFERE === 0 && conta.INSTÁVEL === 0;
  const sufixo = conta.NOVA ? ` · ${conta.NOVA} NOVA(s) sem baseline (nada a comparar)` : '';
  let resumo;
  if (erro) {
    resumo = `>>> VEREDITO INVÁLIDO — ${conta.AUSENTE} vista(s) AUSENTE(s) no `
      + '"depois": recapture o lado que falta antes de concluir qualquer coisa'
      + sufixo;
  } else if (bitIdentico) {
    const n = julgadas === 1 ? '1 vista julgada' : `${julgadas} vistas julgadas`;
    resumo = `>>> BIT-IDÊNTICO (${n})${sufixo}`;
  } else {
    resumo = '>>> NÃO é bit-idêntico — rodar o diff de pixel antes de concluir'
      + sufixo;
  }
  return { linhas, conta, julgadas, bitIdentico, erro, resumo };
}

// ---- FILHO: uma fatia da lista, um Chrome de cada vez, arquivo próprio ----
async function filho() {
  const nomes = new Set((process.env.AB_VISTAS || '').split(',').filter(Boolean));
  const { vias } = await capturarLista(
    VISTAS.filter(([n]) => nomes.has(n)),
    resolve(tmpdir(), `ab-identidade-${LADO}${SUFIXO}-j${FILHO}.json`),
    `[j${FILHO}] `
  );
  // o filho NÃO julga: quem vê a leva inteira é o pai, e "todas caíram no
  // fallback" só tem sentido somando os três baldes
  writeFileSync(viasDoFilho(FILHO), JSON.stringify(vias));
  process.exit(0);
}

// ---- PAI ----------------------------------------------------------------
async function pai() {
  const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
  if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

  // RETOMA o que já está em disco em vez de começar do zero. Uma bateria são
  // minutos de GPU, e antes disto uma captura travada no meio jogava fora TODAS
  // as vistas já medidas — inclusive as boas. Com o estado gravado por vista,
  // re-rodar o mesmo lado só refaz o que falta, e `ab-identidade.mjs antes
  // edgeon` deixa de apagar as outras (o filtro `SO` escrevia um estado
  // com uma vista só).
  const md5 = existsSync(ESTADO) && !process.env.DOZERO
    ? JSON.parse(readFileSync(ESTADO, 'utf8'))
    : {};

  const lista = VISTAS.filter(([nome]) => {
    if (SO) return nome === SO;
    if (SMOKE && !SENTINELAS.includes(nome)) return false;
    return true;
  });
  const pendentes = lista.filter(([nome]) => {
    if (md5[nome]?.length === N && !SO) {
      console.log(`${nome.padEnd(10)} ${md5[nome].join(' ')}  (de disco)`);
      return false;
    }
    return true;
  });

  const t0 = Date.now();
  const jobs = Math.min(JOBS, pendentes.length);
  // uma entrada por CAPTURA desta invocação, dos dois ramos. Vista que veio de
  // disco não entra: ela não capturou nada agora, e julgar o que não se mediu
  // seria inventar sinal.
  const vias = [];
  if (jobs <= 1) {
    // SERIAL, em processo — o caminho de sempre, e o que isola a prova do
    // sinal de prontidão da prova do paralelismo
    const serial = await capturarLista(pendentes, ESTADO, '', md5);
    Object.assign(md5, serial.out);
    vias.push(...serial.vias);
    writeFileSync(ESTADO, JSON.stringify(md5, null, 1));
  } else {
    // DIVISÃO DA LISTA em N processos independentes, cada um com o seu Chrome.
    // Round-robin e não blocos contíguos: as vistas custam tempos diferentes
    // (as de `?pos=` assentam antes das de `?t=`), e alternar reparte melhor.
    const baldes = Array.from({ length: jobs }, () => []);
    pendentes.forEach((v, i) => baldes[i % jobs].push(v));
    console.log(
      `${pendentes.length} vistas em ${jobs} processos: `
      + baldes.map((b, i) => `j${i}=${b.length}`).join(' ')
    );
    const filhos = baldes.map((balde, k) => new Promise((res, rej) => {
      const p = spawn(process.execPath, [fileURLToPath(import.meta.url), LADO], {
        env: {
          ...process.env,
          AB_FILHO: String(k),
          AB_VISTAS: balde.map(([n]) => n).join(','),
        },
        stdio: ['ignore', 'inherit', 'inherit'],
      });
      p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`filho j${k} saiu com ${code}`))));
      p.on('error', rej);
    }));
    // `allSettled` e não `all`: um filho que cai não pode fazer o pai abandonar
    // os arquivos dos outros — o que já foi medido tem de entrar no estado, ou
    // a retomada em disco não vale nada.
    const fim = await Promise.allSettled(filhos);
    for (let k = 0; k < jobs; k++) {
      const arq = resolve(tmpdir(), `ab-identidade-${LADO}${SUFIXO}-j${k}.json`);
      if (existsSync(viasDoFilho(k))) {
        vias.push(...JSON.parse(readFileSync(viasDoFilho(k), 'utf8')));
        rmSync(viasDoFilho(k), { force: true });
      }
      if (!existsSync(arq)) continue;
      Object.assign(md5, JSON.parse(readFileSync(arq, 'utf8')));
      rmSync(arq, { force: true });
    }
    writeFileSync(ESTADO, JSON.stringify(md5, null, 1));
    const caiu = fim.filter((f) => f.status === 'rejected');
    if (caiu.length) throw new Error(caiu.map((f) => f.reason.message).join('; '));
  }
  if (pendentes.length) {
    console.log(
      `\n${pendentes.length} vistas × ${N} capturas em `
      + `${((Date.now() - t0) / 60000).toFixed(1)} min (JOBS=${jobs}${SMOKE ? ', SMOKE' : ''})`
    );
  }

  let vistaAusente = false;
  if (LADO === 'depois') {
    const antes = JSON.parse(
      readFileSync(resolve(tmpdir(), `ab-identidade-antes${SUFIXO}.json`), 'utf8')
    );
    // `lista` e não `VISTAS`: o veredito cobra o que ESTA invocação pediu.
    // Com a leva completa são as 18; com SMOKE/vista única é o recorte, e
    // cobrar as outras como AUSENTE reprovaria o fluxo de iterar.
    const juizo = julgarVistas({ vistas: lista.map(([nome]) => nome), antes, depois: md5 });
    for (const l of juizo.linhas) console.log(l.texto);
    console.log('\n' + juizo.resumo);
    vistaAusente = juizo.erro;
  }

  // POR ÚLTIMO, depois do veredito: o gate GRITA e SAI ≠ 0 se o sinal de
  // prontidão não subiu no dev server. Os md5 já estão em disco e na tela — o
  // que a saída ≠ 0 diz é "não valide nada com isto", no mesmo protocolo do
  // apaga-o-PNG-antes/exige-status-0-depois. Sem esta linha, uma quebra futura
  // do sinal voltaria a leva para os ~45 min e passaria por hardware lento.
  const prontidao = julgarProntidao({
    vias, appUrl: process.env.APP_URL, fallbackOk: process.env.FALLBACK_OK === '1',
  });
  if (prontidao.mensagem) process.stderr.write(prontidao.mensagem);
  // vista AUSENTE sai ≠ 0 pelo mesmo motivo: um veredito que não julgou a
  // lista inteira não é veredito, e o silêncio de antes era o defeito
  if (prontidao.erro || vistaAusente) process.exit(1);
}

// SÓ A INVOCAÇÃO POR LINHA DE COMANDO roda a leva. `ab-identidade.test.mjs`
// importa `julgarVistas` — puro, sem Chrome e sem disco — e um import não
// pode subir 30 capturas nem pingar o dev server.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (FILHO !== null) await filho();
  else await pai();
}
