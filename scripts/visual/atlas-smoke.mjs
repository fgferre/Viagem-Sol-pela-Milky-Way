// Serve: dono — o portal do Atlas, a navegação e o toque no aparelho fazem o que ele pediu
// Custo: 6,5 min (medido 30/08, F5/corte iii do item 113: espera do manual 18→10 s; era 7,3)
// O PORTAL DO ATLAS EM NAVEGADOR REAL — ida e volta, medida em PIXEL.
//
//   node scripts/visual/atlas-smoke.mjs
//
// Três provas, numa sessão de Chrome só (mesma GPU, mesmo contexto —
// comparar md5 entre processos diferentes não prova portal nenhum):
//
//  1. IDA E VOLTA. Pausa a viagem num instante, entra no Atlas, parte.
//     Cobra `journeyT` EXATO (Object.is, não "perto") e o md5 do quadro
//     ANTES de entrar igual ao md5 DEPOIS de partir. O escalar sozinho
//     não bastava: o `seek()` zera o olhar do pausar-e-olhar e o tick
//     zera o latch do disco fora da viagem — o pixel é quem denuncia.
//  2. PRONTIDÃO NA FASE NOVA. A captura dentro do Atlas tem de assentar
//     por `via=sinal`. Se ela cair no teto de segurança (`via=quadros`),
//     o getter `captura` não aprendeu a fase e todo gate futuro do Atlas
//     estaria medindo espera cega — o modo caro de falhar.
//  3. O PORTAL LEVA A CÂMERA. A prova MUDOU DE PERGUNTA em 23/08 (item
//     61, §2). Ela cobrava que as três entradas dessem o MESMO md5, e
//     cobrava certo enquanto `entrarNoAtlas` chamava `focarNoSistema()`
//     e jogava a pose fora. Isso ERA o defeito: entrar em t=10, t=100 ou
//     t=250 devolvia sempre a vista de abertura, a 224 UA de casa, e o
//     Atlas parecia outro programa. Agora ela cobra o contrário —
//     **três entradas, três vistas** — mais a prova que importa: a
//     POSIÇÃO da câmera antes e depois do portal, e o fov no pino do
//     Atlas (58° desde 29/08, item 86; era 35°).
//
//     A POSIÇÃO É COBRADA POR ERRO RELATIVO, não por `Object.is`, e o
//     desvio é declarado: o pouso reconstrói a pose como (direção,
//     distância) contra o eixo do degrau, e a ida e volta por ângulo não
//     é exata em ponto flutuante. Medido: a coda sai BIT-IDÊNTICA nos
//     três eixos, e as outras duas concordam em 1 ulp (~1e-16
//     relativo). O teto é 1e-9 do raio, três ordens acima do pior visto
//     e sete abaixo de qualquer erro que mova pixel.
//
//     Os três instantes seguem sendo escolhidos por REGIME, e agora cada
//     um cai num degrau diferente do pouso — que é o que faz a trinca
//     valer a pena: t=10 a 0,34 UA do Sol, sem corpo mais perto que ele
//     (degrau `sistema`); t=100 a 1.911 pc, fora do sistema (degrau
//     `céu`, o que nasceu com esta obra); t=250 na coda, a 10 mil km da
//     Terra (degrau `corpo`).
//
//     O RELÓGIO DO CÉU VAI PINADO (`&jd=EPOCA`), e não é conforto. O
//     `?t=250` é grampeado no FIM do filme (193 s), e a partir de
//     REVEAL_T o palco esquenta e a coda TROCA o relógio para
//     `JD_DO_FILME_TDB` — as 16:00 UTC do pouso sobre as Américas. Esse
//     instante atravessa o portal DE PROPÓSITO (ver `partirDoAtlas`:
//     "o jdPedido FICA"), os planetas ficam noutro lugar, e a abertura
//     enquadra pela órbita mais externa VIVA (`casaViva`) — 4·10⁻⁸ pc
//     de câmera a menos e md5 diferente. Sem o pino, a prova media DUAS
//     coisas e culpava uma: reprovou de 20/08 até aqui acusando o Sol
//     de um desvio que era do calendário. Por isso o veredito do
//     relógio vem ANTES do veredito do pixel — se alguém tirar o
//     `&jd=EPOCA`, é ele quem diz o que aconteceu.
//
//     E ela NÃO mede o Sol, apesar do nome que carregou até 20/08:
//     nesta abertura (226,8 UA) o Sol não chega a um pixel. Quem o mede
//     é a PROVA 18, no degrau do corpo — e ela nasceu com o item 5, em
//     21/08, quando o Sol passou a obedecer ao calendário.
//
// Método herdado do `ab-identidade`: `?q=cinema` pinado (declara o tier
// da captura — era defesa contra o autoQuality até a letra D dos
// Ajustes), `?shot=2` (só a cena), e o SINAL de prontidão do próprio app
// no lugar de espera cega.
import { readFileSync } from 'node:fs';
import { abrirSessao, APP_PADRAO, dorme, esperarCapaSair, esperarPor } from './chrome.mjs';

/**
 * OS +3 PASSOS DA Q14 (item 91), LIDOS DA FONTE e não redigitados aqui.
 * A prova 20 mede a razão de exposição entre os dois lados da porta do
 * BRILHO, e um número decorado neste arquivo seria a deriva que o item 99
 * nomeia: o dia em que o desenho fosse de +3 para outra coisa, o juiz
 * reprovaria o app por estar certo. `luz-do-quadro.mjs` já paga esse
 * pedágio com um teste; aqui é mais barato ler a lei direto.
 */
const PASSOS_DA_EXPOSICAO_REAL = Number(
  readFileSync(new URL('../../src/lib/atlas/luzDaVisita.ts', import.meta.url), 'utf8').match(
    /export const PASSOS_DA_EXPOSICAO_REAL = (\d+);/
  )?.[1]
);
const FATOR_DA_EXPOSICAO_REAL = 2 ** PASSOS_DA_EXPOSICAO_REAL;

/** a conta SAI da tabela única — pino decorado de "17/18/19" era a deriva do item 99. */
const N_CAMADAS = (() => {
  const bloco = readFileSync(new URL('../../src/three/atlasConfig.ts', import.meta.url), 'utf8')
    .match(/export const CAMADAS:[\s\S]*?\n\];/)?.[0];
  const n = (bloco?.match(/\bflag:/g) || []).length;
  if (n < 1) throw new Error('CAMADAS não achada em atlasConfig.ts');
  return n;
})();

const APP = process.env.APP_URL || APP_PADRAO;
const PIN = 'shot=2&q=cinema';
const JANELA = process.env.JANELA || '1200x900';
// A sessão viva (subir o Chrome, falar CDP, navegar, esperar assentar,
// clicar, ler JS, tirar md5) nasceu aqui na F1 e mora em `chrome.mjs`
// desde a F2, quando o juiz de a11y virou o segundo consumidor.
const abrir = () => abrirSessao({ janela: JANELA, app: APP, prefixo: 'atlas-smoke' });

const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

/**
 * O NOME DO QUE ESTÁ EM QUADRO, lido do BOTÃO da ficha e não da ficha.
 *
 * Quem anuncia o alvo é o cabeçalho da FICHA DO OBJETO, e a ficha é um
 * DIÁLOGO: uma gaveta de cada vez, então abrir Camadas a fecha — e as provas
 * abaixo abrem Camadas de propósito. O que sobrevive a isso, e é o que mede
 * "o alvo está intacto", é o gatilho na barra de controles: ele existe
 * sempre que há seleção e carrega o nome dela ("Ficha de Sirius"). Trecho de
 * JS injetado, não função de Node: cada chamada entra dentro de um
 * `sessao.js`.
 */
const nomeEmQuadro = () =>
  "((document.querySelector('[data-abre-dialogo=\"ficha\"]') || {})"
  + ".getAttribute ? document.querySelector('[data-abre-dialogo=\"ficha\"]')"
  + ".getAttribute('aria-label').replace('Ficha de ', '') : '')";

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const sessao = await abrir();
try {
  // ---- 1, 2 e 3: ida e volta, prontidão, e a abertura reproduzível --
  // Os TRÊS instantes não são redundância — cada um deixa a câmera do
  // filme num regime diferente na hora de cruzar o portal (medido):
  // t=10 dentro dos 2 pc de casa (o raio em que a LUT do raymarch se
  // reusa), t=100 a 1.911 pc, e t=250 grampeado no fim (193 s), de
  // volta em casa pela coda e já com o palco quente. Foi essa variedade
  // que denunciou a LUT herdada do trajeto — com um instante só, o gate
  // passava mentindo.
  //
  // `jd=EPOCA` pina o relógio do céu: é a segunda variável que a coda
  // move sozinha, e sem o pino ela se disfarçava de defeito do Sol (ver
  // a prova 3 no cabeçalho). Desde o conserto do item 108 (30/08) a
  // porta `?jd=` manda no ATLAS (reaplicada ao entrar, `aplicarPortaJd`)
  // e nunca mais no filme — o filme corrige o próprio relógio todo
  // quadro. É a mesma porta que a prova 8 usa.
  const PIN_DO_TRIO = `${PIN}&jd=EPOCA`;
  const doAtlas = new Map();
  const relogios = new Map();
  const degraus = new Map();
  const poses = new Map();
  // a pose lida do MESMO objeto dos dois lados do portal — é ela que
  // responde "o Atlas nasceu onde o filme estava?"
  const POSE = 'JSON.stringify((()=>{const c=window.__director.engine.camera;'
    + 'return {p:[c.position.x,c.position.y,c.position.z],fov:c.fov};})())';
  for (const T of [10, 100, 250]) {
    await sessao.ir(`t=${T}&${PIN_DO_TRIO}`);
    const antesFase = await sessao.js('window.__director.captura.fase');
    const antesT = await sessao.js('window.__director.currentTime');
    const poseAntes = JSON.parse(await sessao.js(POSE));
    const antes = await sessao.md5();
    conferir(antesFase === 'journey', `t=${T}: parte de 'journey' congelada em t=${antesT}`);

    await sessao.js('window.__director.entrarNoAtlas()');
    const dentro = await sessao.assentar();
    const faseDentro = await sessao.js('window.__director.captura.fase');
    const md5Atlas = await sessao.md5();
    doAtlas.set(T, md5Atlas);
    relogios.set(T, await sessao.js('window.__director.tempo.jd'));
    const poseDepois = JSON.parse(await sessao.js(POSE));
    degraus.set(T, await sessao.js('window.__director.escadaViva.degrau'));
    const raio = Math.hypot(...poseAntes.p);
    const desvio = Math.hypot(...poseAntes.p.map((v, i) => v - poseDepois.p[i]));
    poses.set(T, {
      erro: raio > 0 ? desvio / raio : desvio,
      exata: poseAntes.p.every((v, i) => Object.is(v, poseDepois.p[i])),
      fov: poseDepois.fov,
    });
    conferir(faseDentro === 'atlas', `t=${T}: entrou — fase = '${faseDentro}'`);
    conferir(
      dentro.via === 'sinal',
      `t=${T}: captura em 'atlas' por via=${dentro.via} em ${(dentro.ms / 1000).toFixed(1)}s`
    );
    conferir(md5Atlas !== antes, `t=${T}: o Atlas é OUTRA vista (${md5Atlas} ≠ ${antes})`);

    await sessao.js('window.__director.partirDoAtlas()');
    await sessao.assentar();
    const depoisFase = await sessao.js('window.__director.captura.fase');
    const depoisT = await sessao.js('window.__director.currentTime');
    const depois = await sessao.md5();
    conferir(depoisFase === 'journey', `t=${T}: partiu — fase = '${depoisFase}'`);
    conferir(Object.is(antesT, depoisT), `t=${T}: journeyT EXATO na volta (${depoisT})`);
    conferir(antes === depois, `t=${T}: pixel idêntico antes/depois — ${antes} vs ${depois}`);
  }
  // o relógio PRIMEIRO: ele é a variável escondida que fazia o pixel
  // mentir, e um veredito só dele diz na hora se o pino saiu do lugar
  const jds = [...new Set(relogios.values())];
  conferir(
    jds.length === 1,
    `o relógio do céu vai PINADO nas três entradas — a coda não o move`
      + ` (${[...relogios].map(([t, jd]) => `t=${t} ${jd}`).join(' · ')})`
  );
  // TRÊS ENTRADAS, TRÊS VISTAS — o veredito invertido (ver a prova 3 no
  // cabeçalho). Enquanto o portal jogava a pose fora, este número era 1.
  const vistas = [...new Set(doAtlas.values())];
  const legenda = [...doAtlas].map(([t, h]) => `t=${t} ${h}`).join(' · ');
  conferir(
    vistas.length === 3,
    `o portal leva a câmera: três entradas, ${vistas.length} vista(s) — ${legenda}`
  );
  const degrausDoPouso = [...new Set(degraus.values())];
  conferir(
    degrausDoPouso.length === 3,
    `...e cada instante cai num degrau diferente do pouso:`
      + ` ${[...degraus].map(([t, d]) => `t=${t} ${d}`).join(' · ')}`
  );
  for (const [T, p] of poses) {
    conferir(
      p.erro < 1e-9,
      `t=${T}: a POSIÇÃO atravessa o portal — desvio ${p.erro.toExponential(2)}`
        + ` do raio (teto 1e-9)${p.exata ? ', bit-idêntica nos três eixos' : ''}`
    );
    // desde 29/08 (item 86) a lente do Atlas é a da casa: 58°. O corte
    // continua existindo — o shot pausado varre 15°–60° e o pino do
    // Atlas escreve por cima — só o valor mudou.
    conferir(p.fov === 58, `t=${T}: o fov assenta em 58° atrás do véu (${p.fov})`);
  }

  // ---- 3b: A QUARTA ENTRADA, a porta da ABERTURA (item 60) ---------
  // Desde 22/08 dá para entrar no Atlas sem ver o filme, pelo terceiro
  // botão do véu de título. O botão chama o MESMO `entrarNoAtlas`, mas
  // "mesmo método" não é prova de "mesma tela": daqui ele entra SEM
  // viagem atrás (`retomada` fica `null`) e sem nada do palco montado
  // pelo roteiro. A promessa que o item 60 fez é que o visitante chega
  // ao MESMO Atlas dos três cliques — então é pixel que a mede.
  // O clique vai no botão mesmo, e não no método: sob `?shot=2` o véu
  // está em `display: none` e o `.click()` do DOM dispara igual, o que
  // é justamente o que se quer — a prova é do BOTÃO.
  //
  // E O ESPELHO MUDOU em 23/08 (item 61, §2): a comparação era com "os
  // três cliques", e os três cliques deixaram de dar uma vista só — cada
  // um pousa onde o filme estava. Quem entra SEM filme atrás continua
  // caindo no enquadramento de abertura, e é com o `?atlas=1` puro (o
  // outro endereço sem filme) que a porta tem de bater.
  await sessao.ir(`atlas=1&${PIN}`);
  const daUrl = await sessao.md5();
  await sessao.ir(PIN);
  await sessao.js("[...document.querySelectorAll('.veil-intro button')]"
    + ".find((b) => b.textContent.trim() === 'Entrar no Atlas').click()");
  await sessao.assentar();
  const faseDaPorta = await sessao.js('window.__director.captura.fase');
  const daPorta = await sessao.md5();
  conferir(
    faseDaPorta === 'atlas',
    `a porta da abertura entra no Atlas: fase = '${faseDaPorta}'`
  );
  conferir(
    daPorta === daUrl,
    `a porta da abertura chega ao MESMO Atlas do \`?atlas=1\``
      + ` (${daPorta} vs ${daUrl})`
  );

  // ---- 4: o deep-link e o "Partir" sem viagem anterior -------------
  await sessao.ir(`atlas=1&${PIN}`);
  const faseLink = await sessao.js('window.__director.captura.fase');
  conferir(faseLink === 'atlas', `?atlas=1 abre no Atlas: fase = '${faseLink}'`);
  await sessao.js('window.__director.partirDoAtlas()');
  await sessao.assentar();
  const semViagem = await sessao.js('window.__director.captura.fase');
  conferir(semViagem === 'intro', `"Partir" sem viagem anterior volta ao título: '${semViagem}'`);

  // ---- 5: ?pos= ganha de ?atlas=1 (precedência declarada) ----------
  await sessao.ir(`pos=0,0,0.1&look=0,0,0&atlas=1&${PIN}`);
  const faseComPos = await sessao.js('window.__director.captura.fase');
  conferir(faseComPos === 'free', `?pos= ganha de ?atlas=1: fase = '${faseComPos}'`);

  // ---- 6: o véu, e o que reduced-motion faz com ele ----------------
  // Sem `?shot=` o véu ANIMA: ele fecha, a troca acontece atrás dele e
  // ele abre. Com `prefers-reduced-motion` a troca é INSTANTÂNEA e o
  // véu nunca sai de 0 — quem interpola é o número do Director, então
  // é nele que a promessa se mede, não numa classe de CSS.
  //
  // A PORTA `--veu-atlas` É ESCRITA POR QUADRO, então quem a amostra é o
  // PRÓPRIO relógio de quadro da página (um `rAF` que anota a porta a
  // cada quadro): a rampa não tem como escapar entre duas espiadas, e o
  // veredito lê a série inteira. Espiar UMA vez, N ms depois do clique,
  // media quantos quadros couberam em N ms — ver `esperarPor`. Um valor
  // estritamente entre 0 e 1 é o que "fechar por passos" quer dizer — o
  // salto instantâneo do `prefers-reduced-motion` não teria nenhum.
  const veu = "getComputedStyle(document.querySelector('.hud-root'))"
    + ".getPropertyValue('--veu-atlas').trim()";
  await sessao.ir('t=100&q=cinema');
  await sessao.js(`(() => {
    window.__veuAmostras = [];
    const raiz = document.querySelector('.hud-root');
    const passo = () => {
      window.__veuAmostras.push(Number(
        getComputedStyle(raiz).getPropertyValue('--veu-atlas').trim()));
      window.__veuRaf = requestAnimationFrame(passo);
    };
    passo();
  })()`);
  await sessao.js("[...document.querySelectorAll('.controls-bar button')]"
    + ".find((b) => b.innerText.toUpperCase().includes('ATLAS')).click()");
  await sessao.assentar();
  const rampaDoVeu = JSON.parse(await sessao.js(`(() => {
    cancelAnimationFrame(window.__veuRaf);
    return JSON.stringify(window.__veuAmostras);
  })()`));
  const passos = rampaDoVeu.filter((v) => v > 0 && v < 1);
  conferir(
    passos.length > 0,
    `o véu fecha por passos: ${passos.length} de ${rampaDoVeu.length} quadros`
      + ` entre 0 e 1 (topo ${Math.max(0, ...rampaDoVeu).toFixed(2)})`
  );
  conferir(
    (await sessao.js('window.__director.captura.fase')) === 'atlas'
      && Number(await sessao.js(veu)) === 0,
    'o véu abre de volta e a fase é a nova — o portal não fica preso'
  );

  // ---- 7: a fundação da F3 — rótulos e clicar-para-enquadrar -------
  // O Atlas herdou o ramo de rótulos do voo livre, e o clique curto
  // passou a FOCAR em vez de voar. Sem esta prova, a busca da F3
  // nasceria sobre um pipeline que ninguém verificou estar de pé.
  //
  // E ELAS COMEÇAM DA VISTA DE ABERTURA, desde 23/08 (item 61, §2). O
  // portal acima entrou vindo de t=100 e agora POUSA onde o filme
  // estava — 1.911 pc de casa, o degrau `céu`. Lá o rótulo que o
  // hit-test acha primeiro é o `sol-home`, e clicar nele é a exceção
  // declarada de `selecionarNoPonto`: a esta distância "SOL" quer dizer
  // VOLTAR, e o gesto move a câmera de propósito. As provas daqui para
  // baixo medem o GESTO, não o portal — então elas pedem a casa antes de
  // medir, em vez de julgar o clique num quadro em que ele promete outra
  // coisa.
  await sessao.js('window.__director.focarNoSistema()');
  await sessao.assentar();
  const tinta = await sessao.js(`(() => {
    const c = document.querySelector('.label-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < c.height; y += 2) {
      for (let x = 0; x < c.width; x += 2) {
        if (d[(y * c.width + x) * 4 + 3] > 200) return { x, y };
      }
    }
    return null;
  })()`);
  conferir(tinta !== null, `o pipeline de rótulos desenha em 'atlas' (tinta em ${JSON.stringify(tinta)})`);
  if (tinta) {
    // UM CLIQUE ESCOLHE, DOIS VÃO (item 73, 22/08). O veredito antigo
    // era "clicar num nome ENQUADRA (a câmera reposicionou)", e é
    // exatamente a promessa que mudou: o clique simples passa a trocar o
    // ALVO com a câmera PARADA, e quem reposiciona é o segundo clique.
    const pose = async () => JSON.parse(await sessao.js(`JSON.stringify((() => {
      const d = window.__director;
      return {
        cam: d.engine.camera.position.toArray(),
        foco: d.escada.focoCorpoId,
        alvo: d.atlas.alvo.toArray().join(),
        degrau: d.escadaViva.degrau,
        fase: d.captura.fase,
      };
    })())`));
    const anda = (a, b) => {
      const r = Math.hypot(a.cam[0] - b.cam[0], a.cam[1] - b.cam[1], a.cam[2] - b.cam[2]);
      return r / Math.hypot(...b.cam);
    };
    // a SELEÇÃO é o trio (alvo, corpo em foco, degrau): clicar num
    // corpo muda o foco, clicar no Sol da abertura muda só o degrau (o
    // alvo já era a origem), clicar numa estrela muda o alvo
    const selecao = (p) => `${p.alvo}|${p.foco}|${p.degrau}`;
    const antesDoClique = await pose();
    await sessao.clicar(tinta.x, tinta.y);
    await sessao.assentar();
    const depoisDoClique = await pose();
    const mexeu = anda(depoisDoClique, antesDoClique);
    conferir(
      selecao(depoisDoClique) !== selecao(antesDoClique)
        && mexeu < 1e-9
        && depoisDoClique.fase === 'atlas',
      `um clique ESCOLHE e a câmera NÃO sai do lugar: degrau`
        + ` ${antesDoClique.degrau} → ${depoisDoClique.degrau}, foco`
        + ` ${antesDoClique.foco} → ${depoisDoClique.foco}, deslocamento`
        + ` ${mexeu.toExponential(2)} do raio`
    );
    // O DUPLO CLIQUE É UM GESTO SÓ, e por isso ele começa de uma
    // abertura LIMPA em vez de continuar de onde o clique acima parou:
    // escolher RE-MIRA a câmera, então o rótulo que estava em `tinta`
    // já não está lá — clicar duas vezes no mesmo pixel com segundos de
    // intervalo é outro gesto, e mediria outra coisa.
    // O `&jd=EPOCA` É PINO, e ele entrou em 23/08 (item 61, §3): o Atlas
  // passou a abrir com o relógio do céu AO VIVO, e relógio andando é cena
  // mudando — o sinal de prontidão fica em `andando` e o `assentar()`
  // destas provas cai no teto de segurança. Medido sem o pino: a pinça
  // estourou os 30 s do embalo e o toque duplo não teve tempo de mover a
  // câmera. Provas de GESTO precisam de céu parado, e o pino é o idioma
  // da casa para isso (o mesmo do trio do portal, de MB1 e do `memoria`).
  await sessao.ir('atlas=1&jd=EPOCA&q=cinema');
    await sessao.assentar();
    const tintaDoDuplo = await sessao.js(`(() => {
      const c = document.querySelector('.label-canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let y = 0; y < c.height; y += 2) {
        for (let x = 0; x < c.width; x += 2) {
          if (d[(y * c.width + x) * 4 + 3] > 200) return { x, y };
        }
      }
      return null;
    })()`);
    const antesDoDuplo = await pose();
    await sessao.duploClicar(tintaDoDuplo.x, tintaDoDuplo.y);
    // a rampa entre degraus dura 0,5 s (RAMPA_DO_DEGRAU_S)
    await dorme(1500);
    await sessao.assentar();
    const depoisDoDuplo = await pose();
    conferir(
      anda(depoisDoDuplo, antesDoDuplo) > 1e-3 && depoisDoDuplo.fase === 'atlas',
      `o DUPLO clique MERGULHA: a câmera reposicionou (degrau`
        + ` ${antesDoDuplo.degrau} → ${depoisDoDuplo.degrau}, andou`
        + ` ${anda(depoisDoDuplo, antesDoDuplo).toExponential(2)} do raio)`
    );
  }

  // ---- 8: a máquina do tempo, medida em PIXEL ---------------------
  // A vista é a `ua150` do gate (o desfile a olho nu, sentinela da leva)
  // e não o enquadramento de abertura do Atlas: a 200 UA o Sol estoura o
  // quadro e um planeta que anda não moveria um bit.
  //
  // E ELA VAI COM `&nobloom=1`, pela MESMA razão que a régua 3 da Onda 4
  // (`planeta-pixel.mjs`): com o bloom ligado o quadro satura em volta do
  // Sol e engole os planetas — MEDIDO aqui, a `ua150` e a `ua40` com
  // bloom devolvem o MESMO md5 na época e em 2036, e as duas com
  // `nobloom` DIFEREM. Sem o corte, o "bit-idêntico na época" seria um
  // teste sem dentes: ele passaria mesmo com o caminho vivo errado.
  // O A/B da porta no render DEFAULT (com bloom, as 18 vistas oficiais)
  // continua sendo o da leva — lá o que se prova é outra coisa, que o
  // filme não perde um pixel por a porta existir.
  // E VAI TAMBÉM COM `&noorbitas=1`, pela MESMÍSSIMA razão do `nobloom`
  // acima — é lente de régua, não conveniência. O que estas três linhas
  // provam é que o CAMINHO VIVO (busca, decodificação, escrita dos dois
  // atributos) reproduz o retrato congelado bit a bit; o sujeito são os
  // dez PONTOS. Desde o item 77 há uma segunda coisa que depende da
  // efeméride estar viva: as LINHAS DE ÓRBITA, que não desenham sem ela
  // (é o contrato delas — nunca o retrato). Sem o corte, o lado
  // `jd=EPOCA` ganharia as linhas que o lado sem porta não tem, e o
  // teste passaria a medir "a camada de órbitas existe" em vez de "a
  // efeméride viva acerta a posição dos pontos" — perderia o dente que
  // o `nobloom` foi posto ali para lhe dar.
  const UA150 = 'pos=0,0,0.00072722&look=0,0,0&nobloom=1&noorbitas=1';
  await sessao.ir(`${UA150}&${PIN}`);
  const semPorta = await sessao.md5();
  await sessao.ir(`${UA150}&jd=EPOCA&${PIN}`);
  const naEpoca = await sessao.md5();
  conferir(
    semPorta === naEpoca,
    '?jd=EPOCA é NEUTRA: a efeméride viva na época reproduz o retrato bit a bit'
      + ` (${semPorta} vs ${naEpoca})`
  );
  await sessao.ir(`${UA150}&jd=2465000&${PIN}`);
  const noutroDia = await sessao.md5();
  conferir(
    noutroDia !== semPorta,
    `e outro instante é OUTRO céu — os corpos andaram (${noutroDia} ≠ ${semPorta})`
  );
  const tempoDoLink = await sessao.js('JSON.stringify(window.__director.tempo)');
  conferir(
    JSON.parse(tempoDoLink).jd === 2465000 && JSON.parse(tempoDoLink).aviso === '',
    `?jd= chega ao mostrador sem aviso: ${tempoDoLink}`
  );

  // A BARRA DO TEMPO NÃO VAZA NO ?shot=2 — invariante da onda: o
  // `.bare-mode` só esconde FILHOS DIRETOS de `.hud-root`, e uma peça
  // portalizada para fora dele entraria nas 18 vistas oficiais. A leva
  // não pega isto sozinha — lá o modo Atlas nem monta —, então a prova é
  // aqui, na fase em que a barra existe.
  //
  // A prova segue a CADEIA até `.hud-root` em vez de exigir parentesco
  // direto: desde a F6 a barra mora dentro do rodapé do Atlas (a coluna
  // que a empilha com a dica), e o que a invariante pede não é que a
  // peça seja filha — é que ALGUM ancestral dela seja o filho direto que
  // o `.bare-mode` apaga. Exigir a letra em vez do sentido proibiria
  // qualquer agrupamento e não cobriria o único caso perigoso, que é a
  // peça pendurada fora de `.hud-root`.
  await sessao.ir(`atlas=1&${PIN}`);
  const barra = await sessao.js(`(() => {
    const e = document.querySelector('.atlas-tempo');
    const raiz = document.querySelector('.hud-root');
    let anc = e;
    while (anc && anc.parentElement !== raiz) anc = anc.parentElement;
    return JSON.stringify({
      existe: Boolean(e),
      apagavel: Boolean(anc),
      ancestral: anc ? anc.className : null,
      desenhada: Boolean(e && e.getClientRects().length > 0),
    });
  })()`);
  const b = JSON.parse(barra);
  conferir(
    b.existe && b.apagavel && !b.desenhada,
    `a barra do tempo pende de .hud-root e o ?shot=2 a esconde (${barra})`
  );

  // ---- 9: SEM REDE, a camada congela no retrato e ninguém grita ----
  // Corta só o caminho do DADO (`data/atlas/efemerides*`), nunca o do
  // módulo: bloquear o import seria testar o empacotador, não o
  // fallback. O mesmo binário dos dois lados, e a mesma vista sem bloom
  // da prova 8 — que é onde a diferença aparece.
  await sessao.bloquear(['*data/atlas/efemerides*']);
  sessao.limparGritos();
  await sessao.ir(`${UA150}&jd=2465000&${PIN}`);
  const semRede = await sessao.md5();
  conferir(
    semRede === semPorta,
    `sem efeméride, a camada fica EXATA no retrato (${semRede} vs ${semPorta})`
  );
  await sessao.ir('atlas=1&jd=2465000&q=cinema&shot=1');
  const badge = await sessao.js(
    "(document.querySelector('.atlas-tempo-aviso')||{}).textContent||''"
  );
  conferir(
    /sem efem[ée]ride/.test(badge),
    `e o badge conta a verdade ao visitante: "${badge}"`
  );
  // ...e o ÚNICO grito permitido é o RETRATO ACUSADO (item 5c da
  // auditoria): com corpos em cena e a efeméride PEDIDA indisponível, o
  // Director dá UM aviso por sessão — a captura nunca finge que a fonte
  // viva estava lá. O resto do caminho sem rede continua mudo (o badge
  // fala com o visitante), e qualquer outro grito reprova como sempre.
  const gritos = sessao.gritos();
  const acusacoes = gritos.filter((g) => g.includes('[captura] efeméride pedida indisponível'));
  conferir(
    acusacoes.length >= 1 && acusacoes.length === gritos.length,
    `sem rede, só o RETRATO ACUSADO grita — 1 aviso por sessão, nada além `
      + `(${gritos.join(' | ') || 'nenhum'})`
  );
  await sessao.bloquear([]);

  // ---- 10: O RELÓGIO DO CÉU PARA quando se manda parar ------------
  // Duas promessas que o rótulo dos controles faz e que o código não
  // cumpria. O relógio roda no TOPO do tick, sem olhar a fase, e os
  // botões que o param só existem no HUD do Atlas — então um relógio que
  // não para na hora certa não tem como ser parado depois.
  //
  // `?shot=1` e não `shot=2`: o objeto do juízo são os botões.
  const relogio = () => sessao.js('JSON.stringify(window.__director.tempo)');
  const apertar = (rotulo) =>
    sessao.js(`(() => {
      const b = [...document.querySelectorAll('.atlas-tempo button')]
        .find((e) => (e.getAttribute('aria-label') || '').startsWith(${JSON.stringify(rotulo)}));
      b.click();
    })()`);

  await sessao.ir('atlas=1&q=cinema&shot=1');
  await apertar('Seguir o tempo real');
  await dorme(300);
  const vivo = JSON.parse(await relogio());
  conferir(vivo.aoVivo === true, `AO VIVO liga o relógio do calendário (${vivo.data})`);
  // ⏸ com AO VIVO ligado: o botão está habilitado e promete "Parar o
  // tempo". Enquanto `andarNoTempo(0)` não desligava o AO VIVO, ele
  // apagava o sentido (que já era zero) e a data seguia andando a 1 Hz.
  await apertar('Parar o tempo');
  await dorme(200);
  const parado = JSON.parse(await relogio());
  await dorme(1600);
  const aindaParado = JSON.parse(await relogio());
  conferir(
    parado.aoVivo === false && parado.sentido === 0 && aindaParado.jd === parado.jd,
    `⏸ com AO VIVO ligado PARA de verdade (aoVivo=${parado.aoVivo},`
      + ` jd ${parado.jd} → ${aindaParado.jd} em 1,6 s)`
  );

  // E "Partir" leva o relógio junto: o filme não tem dono para ele.
  await sessao.ir('t=100&q=cinema&shot=1');
  await sessao.js('window.__director.entrarNoAtlas({ instantaneo: true })');
  await dorme(200);
  await apertar('Avançar no tempo');
  await dorme(300);
  const andando = JSON.parse(await relogio());
  await sessao.js('window.__director.partirDoAtlas()');
  await sessao.assentar();
  const noFilme = JSON.parse(await relogio());
  await dorme(1200);
  const depoisDoFilme = JSON.parse(await relogio());
  conferir(
    andando.sentido === 1 && noFilme.sentido === 0 && !noFilme.aoVivo
      && depoisDoFilme.jd === noFilme.jd,
    `"Partir" PARA o relógio do céu (sentido ${andando.sentido} → ${noFilme.sentido},`
      + ` jd ${noFilme.jd} → ${depoisDoFilme.jd} em 1,2 s)`
  );
  conferir(
    (await sessao.js('window.__director.captura.andando')) === false,
    'e o sinal de prontidão da captura volta a ficar pronto no filme'
  );

  // ---- 11: AS 17 CAMADAS TROCAM SEM RECARREGAR ----------------------
  // A régua do dono: nenhuma opção recarrega a página. Até 2026-08-12
  // três delas (nodisc/nogdust/noglow) recarregavam por um comentário
  // podre — "são lidas no bake" —, e este bloco julgava justamente a
  // recarga. Agora ele julga o contrário, e com quatro provas por camada,
  // todas no MESMO documento:
  //
  //   1. não houve navegação  — uma marca posta na `window` sobrevive;
  //   2. a cena reagiu        — `captura.quadros` volta a ZERO no mesmo
  //      tique do clique (o `perturbar()` do Director), lido dentro da
  //      MESMA avaliação para não haver corrida com o rAF;
  //   3. a URL espelha        — `replaceState`, como as vivas de sempre;
  //   4. o selo declara       — a camada desligada vira desvio de brilho.
  //
  // O HOSPEDEIRO MUDOU EM 22/08 (item 61): as camadas saíram do painel de
  // Ajustes e a GAVETA passou a ser a única porta delas — 19 caixas em
  // três famílias, nos dois modos (a décima oitava é o item 77, as
  // linhas de órbita; a décima nona é o item 82, os nomes na tela). O
  // que se julga aqui é o mesmo de sempre; o seletor é o da gaveta.
  //
  // E de dentro do Atlas, que é onde uma recarga custa mais caro: modo,
  // instante do céu e alvo em quadro seguem no lugar por construção.
  await sessao.ir('atlas=1&jd=2465000&foco=hd48915&q=cinema&shot=1');
  await sessao.js('window.__semRecarga = 1');
  await sessao.js("document.querySelector('[data-abre-dialogo=\"camadas\"]').click()");
  await dorme(200);
  const camadas = JSON.parse(await sessao.js(`JSON.stringify(
    [...document.querySelectorAll('[data-dialogo="camadas"] .atlas-gaveta-linha')]
      .map((e) => e.textContent.trim())
  )`));
  // a conta SAI da tabela única (`N_CAMADAS`, lido de atlasConfig.ts).
  // Pino decorado de 17/18/19 era a deriva que o item 99 nomeia.
  conferir(camadas.length === N_CAMADAS, `a gaveta oferece ${camadas.length} camadas (tabela: ${N_CAMADAS})`);
  // AS TRÊS FAMÍLIAS, com a contagem que cada uma mostra: é o resumo do
  // grupo, e ele tem de bater com as caixas ligadas de verdade — um
  // número decorado seria a gaveta contando outra coisa que não a cena.
  const familias = JSON.parse(await sessao.js(`JSON.stringify(
    [...document.querySelectorAll('[data-dialogo="camadas"] .atlas-gaveta-familia')]
      .map((g) => ({
        rotulo: g.getAttribute('aria-label'),
        conta: g.querySelector('.atlas-gaveta-conta').textContent,
        linhas: g.querySelectorAll('.atlas-gaveta-linha').length,
        ligadas: [...g.querySelectorAll('input[type=checkbox]')]
          .filter((i) => i.checked).length,
      }))
  )`));
  conferir(
    familias.length === 3
      && familias.every((f) => f.conta === `${f.ligadas}/${f.linhas}`)
      && familias.reduce((n, f) => n + f.linhas, 0) === N_CAMADAS,
    `as três famílias e a contagem de cada uma — `
      + familias.map((f) => `${f.rotulo} (${f.conta})`).join(' · ')
  );
  conferir(
    !camadas.some((n) => n.includes('↻')),
    `nenhuma marcada com ↻ (${camadas.join(' · ')})`
  );

  // o clique e as leituras na MESMA avaliação: `input.click()` dispara o
  // onChange do React sincronamente, então `captura.quadros` já é o de
  // DEPOIS do perturbar() quando esta função retorna
  const trocar = (indice) => sessao.js(`(() => {
    const l = document.querySelectorAll(
      '[data-dialogo="camadas"] .atlas-gaveta-linha'
    )[${indice}];
    const input = l.querySelector('input');
    const antes = window.__director.captura.quadros;
    input.click();
    input.blur();
    return JSON.stringify({
      nome: l.textContent.trim(),
      marcado: input.checked,
      antes,
      depois: window.__director.captura.quadros,
      url: location.search,
      escondidas: window.__director.selo.camadasEscondidas,
      recarregou: window.__semRecarga !== 1,
    });
  })()`);

  // A FLAG DA LINHA VEM DO APP, não de uma quarta lista digitada à mão.
  // Havia uma aqui, e ela envelheceu: quando as quatro só-URL entraram na
  // tabela (item 33) o painel passou a desenhar 17 linhas e este laço
  // seguiu casando os nomes com as 13 antigas — nove vereditos errados,
  // exatamente a classe de defeito que o config único existe para não
  // ter. Agora a flag é a que ENTRA no selo com o clique: a lista parte
  // vazia (boot limpo) e cada `off` acende uma, cada `on` apaga.
  let vivas = 0;
  for (let i = 0; i < camadas.length; i++) {
    // assentar ANTES de cada clique: é o que dá sentido ao `antes >= 10`
    // — a cena estava parada e o clique é quem a perturbou
    await sessao.assentar();
    const off = JSON.parse(await trocar(i));
    await sessao.assentar();
    const on = JSON.parse(await trocar(i));
    const flag = off.escondidas[0];
    const ok =
      !off.recarregou && !on.recarregou
      && off.antes >= 10 && on.antes >= 10 && off.depois === 0 && on.depois === 0
      && off.marcado === false && on.marcado === true
      && off.escondidas.length === 1 && on.escondidas.length === 0
      && off.url.includes(`${flag}=1`) && !on.url.includes(`${flag}=1`);
    if (ok) vivas++;
    conferir(
      ok,
      `${flag} (${off.nome}) troca AO VIVO: sem navegação, quadros ${off.antes}→0,`
        + ` url '${off.url}', selo [${off.escondidas.join(',')}] e volta`
    );
  }
  conferir(
    vivas === camadas.length,
    `as ${vivas} de ${camadas.length} camadas da gaveta trocam sem reload`
  );

  await sessao.assentar();
  const depoisDaCamada = await sessao.js(`JSON.stringify({
    url: location.search,
    fase: window.__director.captura.fase,
    jd: window.__director.tempo.jd,
    foco: ${nomeEmQuadro()},
    marca: window.__semRecarga,
  })`);
  const dc = JSON.parse(depoisDaCamada);
  conferir(
    dc.fase === 'atlas' && dc.jd === 2465000 && dc.foco === 'Sirius' && dc.marca === 1,
    `e o Atlas nem soube: modo, instante e alvo intactos (${depoisDaCamada})`
  );

  // ---- 12: A TROCA VIVA É BIT-IDÊNTICA AO BOOT COM A MESMA FLAG -----
  // O protocolo do `ab-identidade`, dentro de uma sessão só: a mesma
  // vista, o mesmo tier pinado, `?shot=2` (só a cena). Se o caminho vivo
  // desenhasse UM pixel diferente do caminho de boot, o link copiado
  // mentiria — e as três camadas novas mexem em `mesh.visible` e no bind
  // do `uTauMap`, que é onde uma diferença dessas se esconderia.
  //
  // `t=167` é a vista de fora (a `faceon` da leva oficial): é a única em
  // que as três TÊM efeito — lâminas do disco, bojo e extinção por
  // partícula só pintam com a galáxia inteira em quadro. Por isso o
  // terceiro veredito: md5 vivo ≠ md5 limpo, senão o teste passaria
  // comparando duas imagens que ninguém mudou.
  for (const flag of ['nodisc', 'nogdust', 'noglow']) {
    await sessao.ir(`t=167&${PIN}&${flag}=1`);
    const noBoot = await sessao.md5();
    await sessao.ir(`t=167&${PIN}`);
    const limpo = await sessao.md5();
    await sessao.js(`window.__director.setLayerHidden('${flag}', true)`);
    await sessao.assentar();
    const aoVivo = await sessao.md5();
    conferir(
      aoVivo === noBoot,
      `?${flag}=1: boot e troca viva dão o MESMO pixel (${noBoot} vs ${aoVivo})`
    );
    conferir(
      limpo !== aoVivo,
      `e a camada REALMENTE muda a vista de fora (limpo ${limpo})`
    );
  }

  // ---- 13: o SLIDER DE VOLTA AO PADRÃO desarma o latch --------------
  // `setExposure` LIGA o latch `expOverride` (é o que faz o valor
  // escolhido sobreviver ao quadro seguinte). O slider o armava até no
  // 1,02: a tela ficava em 1,02 fixo enquanto a MESMA URL — já sem
  // `?exp=` — recarregava na auto-exposição 1,02+0,03·galaxyFade, que na
  // vista externa é 1,05. Duas telas para uma URL só. As provas: o número
  // vivo do renderer, o latch do selo, a URL, e o PIXEL da recarga.
  const EXPOSICAO = 'window.__director.engine.renderer.toneMappingExposure';
  const mexerNoSlider = (valor) => sessao.js(`(() => {
    const el = document.querySelector('[data-dialogo="ajustes"] input[type=range]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, '${valor}');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.value;
  })()`);

  await sessao.ir('t=167&ajustes=1&q=cinema&shot=1');
  await sessao.assentar();
  const autoAntes = Number(await sessao.js(EXPOSICAO));
  conferir(
    Math.abs(autoAntes - 1.05) < 1e-6,
    `a vista externa nasce na auto-exposição (${autoAntes.toFixed(4)})`
  );
  await mexerNoSlider('1.4');
  await sessao.assentar();
  const manual = JSON.parse(await sessao.js(`JSON.stringify({
    exp: ${EXPOSICAO}, latch: window.__director.selo.exposicaoManual, url: location.search })`));
  conferir(
    Math.abs(manual.exp - 1.4) < 1e-6 && manual.latch === true
      && manual.url.includes('exp=1.4'),
    `1,40 no slider: tela em ${manual.exp.toFixed(4)}, latch ligado, url '${manual.url}'`
  );
  await mexerNoSlider('1.02');
  await sessao.assentar();
  const devolta = JSON.parse(await sessao.js(`JSON.stringify({
    exp: ${EXPOSICAO}, latch: window.__director.selo.exposicaoManual, url: location.search })`));
  conferir(
    Math.abs(devolta.exp - 1.05) < 1e-6 && devolta.latch === false
      && !devolta.url.includes('exp='),
    `de volta a 1,02: a AUTO-exposição volta (${devolta.exp.toFixed(4)}), latch desligado,`
      + ` url '${devolta.url}'`
  );
  const telaDevolta = await sessao.md5();
  await sessao.ir(devolta.url.replace(/^\?/, ''));
  const recarregada = await sessao.md5();
  conferir(
    telaDevolta === recarregada,
    `e a URL sem ?exp= reproduz a tela, pixel a pixel (${telaDevolta} vs ${recarregada})`
  );

  // ---- 14: A QUALIDADE TROCA AO VIVO, IDA E VOLTA (Ajustes C) -------
  // A ÚLTIMA opção do painel que recarregava a página. Metade da
  // qualidade sempre foi viva (pixel ratio, passos do raymarch); a outra
  // metade é ALOCAÇÃO — população da galáxia, tier do Sol, alvo de
  // textura dos corpos — e até 2026-08-20 o único jeito de refazê-la era
  // gravar `?q=` e RECARREGAR, o que devolvia o espectador à tela de
  // título. Este bloco julgava justamente a recarga; agora julga o
  // contrário, e IDA E VOLTA na mesma sessão — captura congelada não vê
  // histerese, e mundo que volta tem de ser o mesmo que saiu.
  //
  // Quatro provas por sentido, todas no MESMO documento:
  //   1. não houve navegação    — a marca posta na `window` sobrevive;
  //   2. o MUNDO trocou         — `captura.tierDoMundo` acompanha, e não
  //      só `captura.tier` (o do instrumento, que muda no quadro do
  //      clique e sozinho não prova alocação nenhuma);
  //   3. a URL espelha          — `replaceState` com `?q=` SEMPRE
  //      escrito, cinema inclusive: um link que cala sobre o tier não
  //      diz o que a tela mostra (e até a letra D quem decidia na
  //      recarga era o storage ou a detecção, que sobrepunham a escolha
  //      do visitante em silêncio);
  //   4. o Atlas nem soube      — modo, instante do céu e alvo em quadro.
  await sessao.ir('atlas=1&jd=2465000&foco=hd48915&ajustes=1&q=alta&shot=1');
  await sessao.js('window.__marcaQ = 1');
  // o botão mostra o nome pt-BR da tabela única ('Cinema', 'Auto'); a
  // comparação em minúsculas casa com o `id`, que é o que se digita aqui
  const clicarTier = (q) => sessao.js(`(() => [...document.querySelectorAll(
    '[data-dialogo="ajustes"] button')].find(
      (b) => b.textContent.trim().toLowerCase() === '${q}').click())()`);
  for (const q of ['cinema', 'alta']) {
    await clicarTier(q);
    // o `andando` da prontidão inclui a troca em voo (Ajustes C): quem
    // espera o sinal do app espera o swap, sem relógio de parede
    await sessao.assentar();
    const t = JSON.parse(await sessao.js(`JSON.stringify({
      url: location.search,
      tier: window.__director.captura.tier,
      mundo: window.__director.captura.tierDoMundo,
      marca: window.__marcaQ,
      fase: window.__director.captura.fase,
      jd: window.__director.tempo.jd,
      foco: ${nomeEmQuadro()},
    })`));
    conferir(
      t.marca === 1 && t.tier === q && t.mundo === q && t.url.includes(`q=${q}`),
      `clicar em ${q} troca o MUNDO sem recarregar (instrumento '${t.tier}',`
        + ` mundo '${t.mundo}', url '${t.url}')`
    );
    conferir(
      t.fase === 'atlas' && t.jd === 2465000 && t.foco === 'Sirius',
      `e o Atlas nem soube: modo, instante e alvo intactos (${t.fase}, ${t.jd}, ${t.foco})`
    );
  }

  // O PIXEL, que é o veredito duro: o mundo trocado AO VIVO tem de sair
  // idêntico ao do boot DIRETO naquele tier — a mesma exigência que a
  // seção 12 faz às camadas, agora sobre a alocação inteira (4,02 M
  // partículas em cinema contra 1,1 M em performance, o Sol em high
  // contra low, e os dois mapas reassados). `t=167` é a vista de fora,
  // onde a população da galáxia É a imagem. Nos DOIS sentidos: subir de
  // tier e voltar, sem recarregar entre um e outro.
  const bootDoTier = new Map();
  for (const q of ['performance', 'cinema']) {
    await sessao.ir(`t=167&shot=2&q=${q}`);
    bootDoTier.set(q, await sessao.md5());
  }
  conferir(
    bootDoTier.get('performance') !== bootDoTier.get('cinema'),
    `o tier REALMENTE muda a vista de fora (${bootDoTier.get('performance')}`
      + ` vs ${bootDoTier.get('cinema')})`
  );
  await sessao.ir('t=167&shot=2&q=performance');
  for (const q of ['cinema', 'performance']) {
    await sessao.js(`window.__director.setQuality('${q}')`);
    await sessao.assentar();
    const aoVivo = await sessao.md5();
    conferir(
      aoVivo === bootDoTier.get(q),
      `?q=${q}: boot e troca viva dão o MESMO pixel (${bootDoTier.get(q)} vs ${aoVivo})`
    );
  }

  // ---- 14b: O AUTO É O 4º ESTADO (Ajustes D) -----------------------
  // A régua do dono: *detecção nunca decide; medição sugere; o visitante
  // escolhe*. O que se prova aqui é a FRONTEIRA POLÍTICA, no navegador,
  // com o HUD na tela (`?shot=1`, nunca `2` — vista sem HUD não prova
  // HUD):
  //   1. o seletor tem QUATRO estados, e os quatro saem da tabela única;
  //   2. sem `?q=` o boot é CINEMA — nem storage, nem palpite sobre o
  //      aparelho. O storage é SUJADO de propósito antes do boot com o
  //      campo que decidia o tier até 20/08: se ele voltar a mandar,
  //      esta linha é a que grita;
  //   3. escolher Auto vira `?q=auto` na URL e política viva, sem
  //      navegação nenhuma (a marca na `window` sobrevive);
  //   4. e o Auto NÃO congela o tier no link: `?q=auto` num documento
  //      novo volta como Auto, não como o tier em que ele pousou.
  // `atlas=1` e não a tela de título: a barra de controles — que é onde
  // o seletor mora — só existe nas fases que a hospedam (`fases.ts`), e
  // uma prova de HUD tirada onde o HUD não está não prova nada.
  await sessao.ir('atlas=1&ajustes=1&shot=1');
  const estadosDoSeletor = JSON.parse(await sessao.js(`JSON.stringify(
    [...document.querySelectorAll('.controls-bar select option')].map((o) => o.value))`));
  conferir(
    estadosDoSeletor.join(',') === 'cinema,alta,performance,auto',
    `o seletor mostra os quatro estados (${estadosDoSeletor.join(' · ')})`
  );
  await sessao.js(`window.localStorage.setItem('viagem-prefs',
    JSON.stringify({ v: 1, tierQueRodou: 'performance' }))`);
  await sessao.ir('atlas=1&ajustes=1&shot=1');
  const semQnaUrl = JSON.parse(await sessao.js(`JSON.stringify({
    url: location.search,
    tier: window.__director.captura.tier,
    mundo: window.__director.captura.tierDoMundo,
    escolhido: document.querySelector('.controls-bar select').value })`));
  conferir(
    semQnaUrl.tier === 'cinema' && semQnaUrl.mundo === 'cinema'
      && semQnaUrl.escolhido === 'cinema' && !semQnaUrl.url.includes('q='),
    `sem ?q= o padrão de produto é CINEMA, com o storage mentindo 'performance'`
      + ` (instrumento '${semQnaUrl.tier}', mundo '${semQnaUrl.mundo}',`
      + ` seletor '${semQnaUrl.escolhido}')`
  );
  await sessao.js("window.localStorage.removeItem('viagem-prefs')");
  await sessao.js('window.__marcaAuto = 1;'
    + ' window.__medicaoAntesDoAuto = window.__director.engine.medicao');
  await clicarTier('auto');
  // espera de ESTADO, não 3,2 s de parede (item 113): escolher Auto só
  // vira tier depois de EXISTIR uma sugestão, e quem a produz é uma
  // JANELA DE MEDIDA inteira fechada depois do clique. Cada janela
  // publica um OBJETO novo em `engine.medicao`, então "objeto diferente
  // do anotado antes do clique" é exatamente esse estado — e sobrevive
  // ao zerar da troca de tier, que só adia o objeto novo. O estouro
  // entra no veredito da convergência abaixo, não num rodapé.
  //
  // O que NÃO se espera aqui é o mostrador: desde 22/08 (item 66) o
  // `?shot=` congela a nota em "medindo o quadro." de propósito. O
  // número é medida VIVA, muda de boot para boot, e entrava na tela ~50
  // quadros depois do `pronto` — toda foto de HUD carregava um dígito
  // que ninguém controla, e era isso que fazia a prova 13 reprovar uma
  // vez a cada ~100. Quem traz o número é
  // `window.__director.engine.medicao`, lido abaixo, que o modo foto
  // não congela: a régua corre, só o mostrador para.
  const janelaDoAuto = await esperarPor(sessao,
    'window.__director.engine.medicao !== null'
    + ' && window.__director.engine.medicao !== window.__medicaoAntesDoAuto', 8000);
  // …e se a medida pediu outro tier, o mundo novo ainda está no forno
  await sessao.assentar();
  const noAuto = JSON.parse(await sessao.js(`JSON.stringify({
    url: location.search,
    marca: window.__marcaAuto,
    escolhido: document.querySelector('.controls-bar select').value,
    tier: window.__director.captura.tier,
    medicao: window.__director.engine.medicao,
    nota: ((document.querySelector('.ajustes-medida') || {}).textContent || '').trim() })`));
  conferir(
    noAuto.marca === 1 && noAuto.escolhido === 'auto' && noAuto.url.includes('q=auto'),
    `escolher Auto não recarrega e vira espelho na URL ('${noAuto.url}',`
      + ` seletor '${noAuto.escolhido}')`
  );
  conferir(
    noAuto.nota.startsWith('Auto:') && noAuto.nota.includes(noAuto.tier === 'cinema'
      ? 'Cinema' : noAuto.tier === 'alta' ? 'Alta' : 'Performance'),
    `e o painel DIZ onde a medição pôs a qualidade: "${noAuto.nota}"`
  );
  // A CONVERGÊNCIA, que é o que "aplica" quer dizer sem depender do fps
  // desta máquina: sob Auto, o tier VIVO não pode ficar parado contra a
  // medição. `medicao` nula é o estado legítimo logo depois de uma
  // troca — a média recomeça —, e aí não há veredito a contradizer.
  conferir(
    janelaDoAuto !== null
      && (noAuto.medicao === null || noAuto.medicao.sugestao === noAuto.tier),
    `e o Auto não fica parado contra a medição (janela nova em ${janelaDoAuto} ms,`
      + ` tier '${noAuto.tier}', medida`
      + ` ${noAuto.medicao ? `${noAuto.medicao.fps.toFixed(1)} q/s → '${noAuto.medicao.sugestao}'` : 'recomeçando'})`
  );

  // A FRONTEIRA POLÍTICA, no navegador: em MANUAL a medição pode gritar
  // o que quiser — o tier não anda. O tier escolhido é `performance`.
  // ERAM 18 s, atravessando de propósito os 15 s da anti-vaivém (a 60
  // q/s a sugestão de SUBIR só nasce na 6ª janela, ~15,6 s — e aí havia
  // uma sugestão para o manual resistir). DESDE 30/08 são 10 s, por
  // decisão do dono (corte iii do item 113): a prova negativa "nada
  // troca sozinho" fica mais CURTA — ela cobre ~4 janelas de medição,
  // mas já não espera a sugestão de subir nascer nesta bancada; o log
  // continua dizendo qual dos dois casos aconteceu.
  const ESPERA_DO_MANUAL_MS = 10000;
  await sessao.ir('atlas=1&ajustes=1&shot=1&q=performance');
  await dorme(ESPERA_DO_MANUAL_MS);
  const noManual = JSON.parse(await sessao.js(`JSON.stringify({
    tier: window.__director.captura.tier,
    mundo: window.__director.captura.tierDoMundo,
    escolhido: document.querySelector('.controls-bar select').value,
    medicao: window.__director.engine.medicao })`));
  conferir(
    noManual.tier === 'performance' && noManual.mundo === 'performance'
      && noManual.escolhido === 'performance',
    `em MANUAL nada troca de tier sozinho: ${ESPERA_DO_MANUAL_MS / 1000} s depois segue`
      + ` em '${noManual.tier}' (mundo '${noManual.mundo}'), com a medição`
      + ` ${noManual.medicao ? `em ${noManual.medicao.fps.toFixed(1)} q/s sugerindo '${noManual.medicao.sugestao}'` : 'ainda medindo'}`
  );
  await sessao.ir('q=auto&atlas=1&ajustes=1&shot=1');
  const deLink = JSON.parse(await sessao.js(`JSON.stringify({
    escolhido: document.querySelector('.controls-bar select').value,
    tier: window.__director.captura.tier })`));
  conferir(
    deLink.escolhido === 'auto',
    `?q=auto num documento novo volta como AUTO, não como o tier em que ele`
      + ` pousou (seletor '${deLink.escolhido}', tier '${deLink.tier}')`
  );

  // ---- 15: A RODA DÁ ZOOM E NÃO TROCA O ALVO (item 73) --------------
  // Substitui a prova "a roda e a pinça movem a escada" (Onda 7). A
  // bancada de `zoomDaRoda.test.ts` prova a inércia, o passo em log e os
  // dois limites; o que ela NÃO pode provar é que o evento do navegador
  // chega — que o listener está no elemento certo, que a fase o aceita e
  // que a câmera anda. E o veredito NOVO é o que o dono pediu com estas
  // palavras: "nem conseguimos mais selecionar para onde vamos" — o
  // objeto escolhido não pode trocar sozinho quando a roda gira.
  await sessao.ir('atlas=1&foco=saturno&q=cinema&shot=1');
  await sessao.assentar();
  const doZoom = async () => JSON.parse(await sessao.js(`JSON.stringify((() => {
    const d = window.__director;
    return {
      degrau: d.escadaViva.degrau,
      foco: d.escada.focoCorpoId,
      alvo: d.atlas.alvo.toArray().join(','),
      dist: d.atlas.distancia,
      piso: d.atlas.pisoDeZoom,
      teto: d.atlas.tetoDeZoom,
      raio: d.atlas.raioDoAlvo,
      cam: d.engine.camera.position.distanceTo(d.atlas.alvo),
    };
  })())`));
  const rodar = (deltaY, ctrlKey = false) =>
    sessao.js(`(() => document.querySelector('canvas').dispatchEvent(
      new WheelEvent('wheel', { deltaY: ${deltaY}, deltaMode: 0,
        ctrlKey: ${ctrlKey}, bubbles: true, cancelable: true })))()`);
  /**
   * O GESTO ACABOU? — a régua do `esperarPor`, em dois tempos, e nenhum
   * deles é relógio de parede:
   *  - `zoomEmbalando` cai para `false` quando a velocidade da roda se
   *    esgota. Ele sobe no PRÓPRIO listener do `wheel`, síncrono com o
   *    evento, então não há corrida: quando `rodar` volta, ele já é true;
   *  - `captura.pronto` volta a true dez quadros depois do último
   *    `perturbar()` — a câmera parada, não só o embalo gasto.
   *
   * O ESTOURO REPROVA AQUI DENTRO, e é por isso que ela conhece o nome
   * do sítio: enquanto o `null` voltava mudo, quatro dos cinco sítios o
   * jogavam fora e mediam a vista MID-VOO como se o gesto tivesse
   * acabado.
   */
  const TETO_DO_ZOOM_MS = 30000;
  const assentarZoom = async (nome, teto = TETO_DO_ZOOM_MS) => {
    const t0 = Date.now();
    // `=== false` e não `!`: porta ausente é `undefined`, e `!undefined`
    // devolveria "gesto acabou" no primeiro instante — um juiz que se
    // desliga sozinho quando a peça que ele mede some
    const gasto = await esperarPor(sessao, 'window.__director.zoomEmbalando === false', teto);
    const parado = gasto === null ? null : await esperarPor(
      sessao, 'window.__director.captura.pronto', teto - (Date.now() - t0)
    );
    const ms = parado === null ? null : Date.now() - t0;
    conferir(
      ms !== null,
      `${nome}: o gesto do zoom acabou`
        + (ms === null
          ? ` — ESTOUROU ${teto} ms (embalo ${gasto === null ? 'vivo' : 'gasto'})`
          : ` em ${ms} ms`)
    );
    return ms;
  };
  const estalo = async (deltaY, ctrlKey = false) => {
    await rodar(deltaY, ctrlKey);
    await assentarZoom('a roda');
    return doZoom();
  };

  const zoomInicio = await doZoom();
  const paraDentro = [];
  for (let i = 0; i < 6; i++) paraDentro.push(await estalo(-100));
  const mesmoAlvo = paraDentro.every(
    (a) => a.alvo === zoomInicio.alvo && a.foco === zoomInicio.foco
      && a.degrau === zoomInicio.degrau
  );
  const desce = paraDentro.every(
    (a, i) => a.dist < (i === 0 ? zoomInicio.dist : paraDentro[i - 1].dist)
  );
  conferir(
    mesmoAlvo && desce,
    `a roda APROXIMA sem trocar o alvo: ${(zoomInicio.dist / zoomInicio.raio).toFixed(2)}`
      + ` → ${(paraDentro[5].dist / zoomInicio.raio).toFixed(2)} raios, foco`
      + ` "${zoomInicio.foco}" → "${paraDentro[5].foco}", degrau ${zoomInicio.degrau}`
  );
  conferir(
    paraDentro.every((a) => Math.abs(a.cam - a.dist) / a.dist < 1e-9),
    'e a CÂMERA está onde a distância publicada diz que ela está'
  );

  // O PISO: `K_MIN_RAIOS` raios FÍSICOS do alvo (o piso publicado já é
  // `2 × raio físico`), e nem oitenta estalos passam dele. Para Saturno
  // são 120.536 km de centro — 2 raios equatoriais, o topo das nuvens.
  let noPiso = paraDentro[5];
  for (let i = 0; i < 80; i++) await rodar(-100);
  await assentarZoom('os 80 estalos até o piso');
  noPiso = await doZoom();
  conferir(
    Math.abs(noPiso.dist / noPiso.piso - 1) < 1e-9 && noPiso.foco === zoomInicio.foco,
    `o PISO segura em ${(noPiso.dist / (noPiso.piso / 2)).toFixed(4)} raios físicos do alvo`
      + ` (K_MIN = 2,0; ${(noPiso.dist / 4.84813681e-6 * 1.495978707e8).toFixed(0)} km)`
  );

  // O TETO: o sistema em quadro, centrado no alvo
  for (let i = 0; i < 90; i++) await rodar(100);
  await assentarZoom('os 90 estalos até o teto');
  const noTeto = await doZoom();
  conferir(
    Math.abs(noTeto.dist - noTeto.teto) / noTeto.teto < 1e-9
      && noTeto.dist > zoomInicio.dist,
    `o TETO segura no sistema em quadro: ${(noTeto.dist / noTeto.raio).toFixed(3)} raios de`
      + ` órbita (${(noTeto.dist / 4.84813681e-6).toFixed(1)} UA)`
  );
  conferir(
    noTeto.alvo === zoomInicio.alvo && noTeto.foco === zoomInicio.foco,
    `...e depois de 176 estalos o alvo ainda é o mesmo ("${noTeto.foco}")`
  );
  conferir(
    // 5,32 décadas desde 29/08 (item 86): a lente de 58° encurtou o teto
    // — eram 5,55 sob a de 35°
    Math.abs(Math.log10(noTeto.teto / noPiso.piso) - 5.32) < 0.05,
    `a faixa inteira do alvo tem ${Math.log10(noTeto.teto / noPiso.piso).toFixed(2)} décadas`
      + ` — as ~48 estaladas de ponta a ponta que o passo em log promete`
  );

  // a PINÇA do trackpad é o mesmo `wheel` com `ctrlKey`, e sem limiar
  // nenhum: eventos pequenos viram fração de estalo e a câmera anda
  const antesDaPinca = await doZoom();
  for (let i = 0; i < 4; i++) await rodar(-30, true);
  const pincaAssentouEm = await assentarZoom('a pinça');
  const depoisDaPinca = await doZoom();
  conferir(
    depoisDaPinca.dist < antesDaPinca.dist && depoisDaPinca.foco === zoomInicio.foco,
    `a pinça (ctrlKey) faz o mesmo, em fração de estalo`
      + ` (${(antesDaPinca.dist / antesDaPinca.raio).toFixed(3)} →`
      + ` ${(depoisDaPinca.dist / depoisDaPinca.raio).toFixed(3)} raios,`
      + ` assentou em ${pincaAssentouEm === null ? '—' : `${pincaAssentouEm} ms`})`
  );

  // e o gesto NÃO rola a página nem deixa o navegador dar zoom: o
  // `preventDefault` só é aceito porque o listener é `passive: false`
  const engoliu = await sessao.js(`(() => {
    const e = new WheelEvent('wheel', { deltaY: -120, deltaMode: 0,
      bubbles: true, cancelable: true });
    document.querySelector('canvas').dispatchEvent(e);
    return String(e.defaultPrevented);
  })()`);
  conferir(engoliu === 'true', `e a rolagem da página morre no canvas (defaultPrevented=${engoliu})`);

  // ---- 15b: `?d=` ENTRA NO ESPELHO; `?ver=` VIRA SÓ LEITURA -------
  // A distância era a única grandeza da vista que o link não sabia
  // contar: `?ver=` diz "no corpo" e não sabe dizer "no corpo, a 2,4
  // raios dele". As duas metades da porta se medem aqui, e nenhuma
  // delas cabe numa bancada — o escritor é o `urlComMomento` do React e
  // o leitor é o boot, e entre um e outro há uma NAVEGAÇÃO.
  //
  // O escritor vivo é chamado pelo mesmo caminho que o `busca-smoke`
  // usa: trocar a qualidade reescreve a URL por `replaceState` com o
  // texto do "copiar link". Nada de montar a query à mão — o que se
  // prova é o ESPELHO, não a nossa ideia dele.
  const espelhar = async () => {
    await sessao.js(`(() => {
      const sel = document.querySelector('.controls-bar select');
      sel.value = sel.value === 'alta' ? 'cinema' : 'alta';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sessao.assentar();
    return sessao.js('location.search');
  };

  await sessao.ir('atlas=1&foco=saturno&q=cinema&shot=1');
  await sessao.assentar();
  for (let i = 0; i < 6; i++) await rodar(-100);
  // o mesmo `assentarZoom` do 15: `antesDoLink` medido MID-VOO acusava o
  // `?d=` — escrito depois, com a câmera já parada — de errar 6,3%.
  await assentarZoom('o zoom antes do link');
  const antesDoLink = await doZoom();
  const linkComD = await espelhar();
  const dEscrito = new URLSearchParams(linkComD).get('d');
  conferir(
    dEscrito !== null && /^\d+(\.\d+)?$/.test(dEscrito)
      && String(Number(Number(dEscrito).toPrecision(4))) === dEscrito,
    `o espelho escreve ?d= com 4 algarismos ('${dEscrito}' contra`
      + ` ${(antesDoLink.dist / antesDoLink.raio).toFixed(6)} raios medidos)`
  );
  conferir(
    !linkComD.includes('ver='),
    `...e NÃO escreve mais ?ver= (${linkComD})`
  );
  await sessao.ir(linkComD.replace(/^\?/, ''));
  await sessao.assentar();
  const doLink = await doZoom();
  const erro = Math.abs(doLink.dist / antesDoLink.dist - 1);
  conferir(
    erro < 5e-4 && doLink.foco === antesDoLink.foco,
    `a ida e volta reproduz a distância a ${(erro * 100).toFixed(4)}%`
      + ` (${(antesDoLink.dist / antesDoLink.raio).toFixed(4)} →`
      + ` ${(doLink.dist / doLink.raio).toFixed(4)} raios de "${doLink.foco}")`
  );
  // e ela SOBREVIVE à efeméride, que chega sempre depois do boot e
  // refaz o enquadramento do degrau vivo — era aqui que um `?d=` sem
  // dono voltaria sozinho para o enquadramento, um segundo depois
  await dorme(1500);
  const depoisDaFonte = await doZoom();
  conferir(
    Math.abs(depoisDaFonte.dist / doLink.dist - 1) < 5e-4,
    `...e sobrevive à efeméride que chega tarde`
      + ` (${(depoisDaFonte.dist / depoisDaFonte.raio).toFixed(4)} raios)`
  );

  // `?ver=corpo` LEGADO pousa no MESMO enquadramento de sempre: sem
  // `?d=` a distância é a conta pura, e a conta pura é bit a bit a de
  // antes desta obra. O oráculo é o GESTO — descer ao corpo pela escada
  // — e o veredito é o md5, não um número de câmera.
  await sessao.ir(`atlas=1&foco=terra&ver=corpo&jd=EPOCA&${PIN}`);
  await sessao.assentar();
  const porPortaLegada = await sessao.md5();
  const pinadoNaPorta = await sessao.js('window.__director.atlas.distanciaEstaPinada');
  await sessao.ir(`atlas=1&jd=EPOCA&${PIN}`);
  await sessao.js("window.__director.focarNoCorpo('earth', 'corpo')");
  await sessao.assentar();
  const peloGesto = await sessao.md5();
  conferir(
    porPortaLegada === peloGesto && pinadoNaPorta === false,
    `?ver=corpo legado pousa no MESMO md5 do gesto, e sem pino de distância`
      + ` (${porPortaLegada} vs ${peloGesto})`
  );

  // O MESMO `?ver=corpo` COM UM CORPO QUE NÃO É A TERRA — e esta prova
  // é NOVA (24/08), porque a de cima passava por EMPATE. Ela compara a
  // porta com o gesto, e quando o religador do relógio (`enquadreVivo`)
  // tinha a posição e o raio da TERRA em literal os DOIS caminhos caíam
  // na Terra: md5 igual, veredito verde, defeito de pé. Escolher a
  // Terra como corpo de prova era escolher o único caso que o defeito
  // não movia.
  //
  // O que denuncia é a IDENTIDADE do que ficou em quadro, e ela se lê
  // no rig: o alvo a 5,21 UA do Sol e a esfera com o RAIO DE JÚPITER.
  // MEDIDO com o defeito: 0,9833 UA e 6.378 km — a Terra, com a ficha
  // anunciando "Júpiter". A tolerância do raio é a da tabela (1e-3
  // relativo); a da distância é 1% porque a efeméride que chega tarde
  // não põe o planeta no mesmo bit do retrato.
  await sessao.ir(`atlas=1&foco=jupiter&ver=corpo&jd=EPOCA&${PIN}`);
  await sessao.assentar();
  const emQuadro = JSON.parse(
    await sessao.js(
      'JSON.stringify((()=>{const r=window.__director.atlas;const k=206264.806247096;'
      + 'return {ua:Math.hypot(r.alvo.x,r.alvo.y,r.alvo.z)*k,'
      + ' km:r.raioDoAlvo*k*149597870.7,'
      + ' corpo:window.__director.escadaViva.corpoId,'
      + ' degrau:window.__director.escadaViva.degrau};})())'
    )
  );
  conferir(
    emQuadro.corpo === 'jupiter'
      && emQuadro.degrau === 'corpo'
      && Math.abs(emQuadro.ua / 5.2119 - 1) < 1e-2
      && Math.abs(emQuadro.km / 71492 - 1) < 1e-3,
    `?foco=jupiter&ver=corpo enquadra JÚPITER e nele FICA depois do tique do relógio`
      + ` (${emQuadro.ua.toFixed(4)} UA do Sol, esfera de ${emQuadro.km.toFixed(0)} km)`
  );

  // ---- 15c: OS NOMES DA ABERTURA (item 73, plano §3) ---------------
  // A segunda coisa que o dono pediu, com as palavras dele:
  // *"conseguíamos ver os rótulos de todos objetos de forma
  // inteligente"*. A medida de antes daquela obra: 38 projetados → 7
  // desenhados → TRÊS corpos com nome (Sol, Netuno, Plutão). Os quatro
  // planetas internos projetavam a menos de 6 px do Sol e perdiam a
  // vaga para ele; Saturno perdia para Júpiter.
  //
  // A promessa é contada em CORPOS COM NOME, não em rótulos desenhados:
  // quantas estrelas cabem depende do céu daquela data, e o que o dono
  // pediu foi ver os objetos do sistema.
  //
  // A PROVA VIROU DUAS EM 23/08 (item 61), e não por conveniência: a
  // abertura deixou de ser o sistema INTEIRO a 226,84 UA e passou a ser
  // o sistema INTERNO a ~9 UA. Cobrar "os oito planetas com nome" na
  // abertura virou cobrar que a tela nomeie quem NÃO está no quadro —
  // Júpiter fica a 32° do eixo de vista, Urano a 84°, e o corte de
  // `projectPoint` os descarta antes de haver rótulo. O aperto que o
  // item 73 consertou não sumiu: ele MUDOU DE ENDEREÇO, e agora mora no
  // TETO do zoom, aonde o visitante chega puxando a roda. Então:
  //
  // Trocar o endereço e manter o dente é o que separa re-pinar de
  // afrouxar. O QUE CADA ENDEREÇO COBRAVA ATÉ 23/08 — na abertura, que
  // TODO corpo em quadro tem nome; no teto, os DEZ (os oito planetas, o
  // Sol e Plutão) — está escrito no passado de propósito: as duas
  // promessas foram REVOGADAS no dia seguinte, e o que cada endereço
  // cobra hoje está logo abaixo, nos vereditos.
  //
  // E EM 29/08 A ABERTURA VOLTOU AO SISTEMA INTEIRO (itens 61+86, sob a
  // lente de 58°): os dois endereços passaram a olhar a MESMA esfera —
  // a abertura nasce no teto. As duas sondas ficam de pé de propósito:
  // uma mede a vista de nascença, a outra a vista aonde a roda chega, e
  // enquanto abertura e teto forem a mesma vista os censos têm de
  // CONCORDAR — divergirem é o trilho gritando.
  //
  // E EM 24/08 A PROMESSA MUDOU DE NATUREZA (item 82). O dono viu a
  // conta daquela promessa — *"o default todos os objetos estao com o
  // label ligado, fica uma confusao na tela"* — e o que ela cobrava
  // ("encaixar o máximo de nomes") foi revogado por decisão dele. Os
  // dois vereditos abaixo passaram a cobrar a régua de RELEVÂNCIA: um
  // número medido de nomes na tela, quais são, e o avesso — que quem
  // ficou vale mais que quem saiu, e que designação de Bayer não ocupa
  // vaga de nome próprio. Um juiz que só perdesse o dente não mediria
  // nada; estes ganharam dente novo no mesmo commit em que a lei mudou.
  await sessao.ir('atlas=1&jd=EPOCA&q=cinema');
  await sessao.assentar();
  // ---- item 96: o COMBINADO "o Sol está na origem" deixa de ser só
  // combinado. A cena inteira depende disso (o -centro normalizado dos
  // resolvidos, o vértice 0 dos planetas, a ORIGEM do enquadramento) e
  // a malha do Sol fica lá por OMISSÃO — ninguém escreve o
  // group.position dela. Se um dia alguém transladar a raiz ou
  // posicionar a malha, a luz do app inteiro discordaria de onde o Sol
  // é desenhado, em silêncio (o modo de falha do item 91). Uma linha,
  // no app VIVO, e o silêncio acaba.
  const solNaOrigem = JSON.parse(await sessao.js(
    "JSON.stringify((() => { const p = window.__director.sun.group.position; return [p.x, p.y, p.z]; })())"
  ));
  conferir(
    solNaOrigem.every((v) => v === 0),
    `o Sol ESTÁ na origem — group.position = [${solNaOrigem.join(', ')}] (item 96)`
  );
  // a capa da abertura cobre a cena por alguns segundos DEPOIS de a
  // prontidão fechar (ver o NORTE, "Como rodar") — e é o desenho dos
  // rótulos que se mede aqui, não a prontidão. Espera de ESTADO, não
  // 4 s de parede (item 113): a capa SAI (~2,1 s medidos) e o primeiro
  // quadro de rótulos é escrito. O estouro não cala: sem quadro de
  // rótulos o censo abaixo lê zero desenhados e reprova.
  await esperarCapaSair(sessao.send);
  await esperarPor(sessao,
    'window.__director.rotulos.alvos.some((l) => l.desenhado === true)', 6000);
  // O CENSO DOS NOMES, uma sonda só para os dois endereços: era esta
  // mesma IIFE copiada em dois lugares, e cópia de sonda é como cópia de
  // régua — uma delas envelhece calada.
  const censoDeNomes = async () => JSON.parse(await sessao.js(`JSON.stringify((() => {
    const alvos = window.__director.rotulos.alvos;
    const naTela = alvos.filter((l) => l.desenhado === true);
    // O QUE A RÉGUA DE RELEVÂNCIA CORTOU (item 82, N1): a marca fica no
    // objeto, e é por isso que ela existe — sem ela, "a régua não quis"
    // e "não coube" seriam a mesma ausência, e ninguém mediria a régua.
    const corte = alvos.filter((l) => l.cortadoPelaRegua === true);
    return {
      projetados: alvos.length,
      desenhados: naTela.length,
      corpos: naTela.filter((l) => l.key.startsWith('corpo:')).map((l) => l.key.slice(6)),
      // tier 0 = nome próprio, 1 = designação de Bayer ("ε Ind", "ι Pav")
      estrelasProprias: naTela.filter((l) => !l.key.startsWith('corpo:') && !l.tier).length,
      // QUAIS estrelas, pelo nome — sem isto o veredito cobra quantas e
      // de que classe, e qualquer outro quarteto de nome próprio passa
      nomesDeEstrela: naTela.filter((l) => !l.key.startsWith('corpo:')).map((l) => l.name),
      estrelasBayer: naTela.filter((l) => !l.key.startsWith('corpo:') && l.tier === 1)
        .map((l) => l.name),
      cortadosPelaRegua: corte.length,
      menorQueFicou: Math.min(...naTela.map((l) => l.prioridade ?? 4)),
      maiorQueSaiu: corte.length ? Math.max(...corte.map((l) => l.prioridade ?? 4)) : 0,
      luasAcesas: naTela.filter((l) => l.opacity > 0.08
        && ['moon','titan','io','europa','ganymede','callisto'].includes(l.key.slice(6))).length,
    };
  })())`));
  const nomesDaAbertura = await censoDeNomes();
  const OITO_PLANETAS = [
    'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
  ];
  // ---- A PROMESSA NOVA, MEDIDA EM 24/08 (item 82, N1) --------------
  // A velha ("todo corpo em quadro tem nome") era a promessa do item 73
  // — encaixar o máximo de nomes com catorze vagas e traço de até 102 px
  // por nome. É essa promessa que o item 82 REVOGA, e por decisão do
  // dono: *"fica uma confusao na tela"*. A abertura desenhava VINTE E
  // DOIS nomes (os cinco corpos e DEZESSETE estrelas, quase todas
  // designações de Bayer). Com a régua de relevância ela desenha OITO.
  //
  // O número é medido nesta janela (1200×900) e com este relógio
  // (`jd=EPOCA`): quem mudar `JANELA` mede outro céu. DESDE 29/08 a
  // abertura é o SISTEMA INTEIRO sob a lente de 58° (itens 61+86, a
  // escolha dele pela folha) — o censo medido em 29/08 é TRÊS nomes,
  // os mesmos três que o teto sempre teve: os corpos longe do nó do
  // clarão. Na abertura interna de 23/08–29/08 eram 8 (earth, mars,
  // sun, venus + 4 estrelas de nome próprio). Se a régua ou a vista
  // mudarem, este pino se REESCREVE com o número novo, do jeito que
  // este aqui foi escrito; afrouxar o dente para o juiz calar é que
  // não vale.
  const NA_ABERTURA = 3;
  const CORPOS_COM_NOME = ['neptune', 'pluto', 'sun'];
  const corposDaAbertura = [...nomesDaAbertura.corpos].sort();
  const bateOsCorpos =
    corposDaAbertura.length === CORPOS_COM_NOME.length
    && CORPOS_COM_NOME.every((c, i) => corposDaAbertura[i] === c);
  conferir(
    nomesDaAbertura.desenhados === NA_ABERTURA && bateOsCorpos,
    `a abertura desenha ${NA_ABERTURA} nomes de ${nomesDaAbertura.projetados} projetados`
      + ` (eram 22 antes da régua) — e os corpos com nome são exatamente`
      + ` ${CORPOS_COM_NOME.join(', ')}`
      + ` · medido: ${nomesDaAbertura.desenhados} nomes, corpos`
      + ` [${corposDaAbertura.join(', ')}]`
  );
  // E AS ESTRELAS SÃO ESTAS, pelo nome (a forma apertada em 24/08,
  // depois de o auditor mostrar que contagem + classe deixava passar
  // qualquer quarteto de nome próprio). Medido em 29/08 na abertura do
  // sistema inteiro: NENHUMA estrela desenha — o quadro é o sistema, e
  // os corpos tomam as vagas (na abertura interna eram Aldhanab,
  // Alnair, Peacock e Tiaki). A régua ordena por peso e desempata pelo
  // mais PERTO, então o conjunto é função do céu daquela data
  // (`jd=EPOCA`) e desta janela (1200×900) — as duas pinadas acima.
  const ESTRELAS_DA_ABERTURA = [];
  const estrelasNaTela = [...nomesDaAbertura.nomesDeEstrela].sort();
  const bateEstrelas =
    estrelasNaTela.length === ESTRELAS_DA_ABERTURA.length
    && ESTRELAS_DA_ABERTURA.every((n, i) => estrelasNaTela[i] === n);
  conferir(
    bateEstrelas,
    `...e as estrelas com nome são exatamente ${ESTRELAS_DA_ABERTURA.join(', ')}`
      + ` · medido: [${estrelasNaTela.join(', ')}]`
  );
  // O AVESSO, e ele é a metade que dá dente ao veredito de cima: as
  // estrelas que sobram são de NOME PRÓPRIO, e nenhuma designação de
  // Bayer fica na tela. Eram elas — ε Ind, ι Pav, τ PsA, φ² Pav… — o nó
  // que o dono viu, e elas caem por serem o último degrau da tabela de
  // prioridade, sem uma regra nova que as nomeie.
  conferir(
    nomesDaAbertura.estrelasBayer.length === 0 && nomesDaAbertura.estrelasProprias === 0,
    `...e nenhuma estrela ocupa vaga na abertura do sistema inteiro —`
      + ` ${nomesDaAbertura.estrelasProprias} próprias,`
      + ` ${nomesDaAbertura.estrelasBayer.length} designações de Bayer`
      + (nomesDaAbertura.estrelasBayer.length
        ? ` (${nomesDaAbertura.estrelasBayer.join(', ')})` : '')
  );
  // A RÉGUA É UMA RÉGUA, e não um corte por acaso: o menor peso que
  // ficou na tela ainda vale o maior que ela cortou. Um corte por
  // proximidade, por ordem de chegada ou por sorteio quebra aqui.
  conferir(
    nomesDaAbertura.cortadosPelaRegua > 0
      && nomesDaAbertura.menorQueFicou >= nomesDaAbertura.maiorQueSaiu,
    `...e o corte é por IMPORTÂNCIA: ${nomesDaAbertura.cortadosPelaRegua} nomes cortados,`
      + ` o menor que ficou vale ${nomesDaAbertura.menorQueFicou}`
      + ` e o maior que saiu vale ${nomesDaAbertura.maiorQueSaiu}`
  );
  conferir(
    nomesDaAbertura.luasAcesas === 0,
    `...e nenhuma LUA acende colada no pai: elas esmaecem por separação`
      + ` na tela (${nomesDaAbertura.luasAcesas} acesas)`
  );

  // ---- 15d: OS NOMES QUE SOBREVIVEM NO TETO (item 82) -------------
  // Eram DEZ até 24/08 — a promessa do item 73, cobrada aqui porque é
  // onde os corpos ainda projetam colados. A régua de relevância a
  // revogou e hoje são TRÊS: o teto do zoom é a vista de onde o Atlas
  // abria até 23/08. O `?d=`
  // sai DA CENA e não é digitado — a régua é "raios do alvo", e o alvo
  // da abertura encolheu com o item 61; um literal aqui envelheceria no
  // dia seguinte.
  const raiosDoTeto = Number(
    await sessao.js('String(window.__director.atlas.tetoDeZoom'
      + ' / window.__director.atlas.raioDoAlvo)')
  );
  conferir(
    Number.isFinite(raiosDoTeto) && raiosDoTeto > 1,
    `o teto do zoom fica ACIMA da abertura — ${raiosDoTeto.toFixed(1)} raios do alvo`
  );
  await sessao.ir(`atlas=1&jd=EPOCA&q=cinema&d=${raiosDoTeto}`);
  await sessao.assentar();
  // a MESMA capa da abertura do censo de cima: estado, não parede (item 113)
  await esperarCapaSair(sessao.send);
  await esperarPor(sessao,
    'window.__director.rotulos.alvos.some((l) => l.desenhado === true)', 6000);
  const nomesDoTeto = await censoDeNomes();
  // ---- A PROMESSA DOS DEZ, REVOGADA EM 24/08 (item 82, N1) ---------
  // Até aqui este veredito cobrava os DEZ com nome — os oito planetas, o
  // Sol e Plutão —, e cobrava certo enquanto a promessa era "encaixar o
  // máximo de nomes": a 226,8 UA os dez projetam a menos de 1% de tela
  // uns dos outros, e só cabiam porque cada nome tinha catorze vagas e
  // um traço de até 102 px para chegar até elas. ERA ESSA A TEIA. Com um
  // lugar por nome, os que se empilham sobre o clarão do Sol somem, e
  // sobra o que a tela consegue de fato SEPARAR — três nomes, medido:
  // o Sol, Netuno e Plutão, que são os que estão longe do nó.
  //
  // O QUE ESTE VEREDITO GUARDA AGORA é a lei, não a contagem: no teto
  // quem tem nome é o TOPO da hierarquia. Enquanto um CORPO do sistema
  // ficou sem nome, nenhuma estrela de fundo pode ter um — o sistema é o
  // assunto do quadro. Um corte por proximidade, por ordem de chegada ou
  // por sorteio deixaria estrela na tela e planeta mudo, e quebra aqui.
  // os dez que PROJETAM colados no teto — a régua de comparação, não uma
  // promessa: é contra eles que se mede quantos a tela consegue separar
  const OS_DEZ_DO_TETO = ['sun', ...OITO_PLANETAS, 'pluto'];
  // OS TRÊS, PELO NOME (apertado em 24/08): conferir só o `sun` deixava
  // passar qualquer par a mais — e QUEM sobrevive é o veredito, porque é
  // ele que diz que a tela guarda os que estão LONGE do nó (Netuno e
  // Plutão, nas órbitas de fora) e cala os que se empilham sobre o
  // clarão. Trocar Netuno por Júpiter seria outra lei, não outro número.
  const NO_TETO = ['neptune', 'pluto', 'sun'];
  const corposDoTeto = [...nomesDoTeto.corpos].sort();
  const bateOTeto =
    corposDoTeto.length === NO_TETO.length
    && NO_TETO.every((c, i) => corposDoTeto[i] === c);
  conferir(
    nomesDoTeto.desenhados === NO_TETO.length && bateOTeto,
    `no teto do zoom sobra o que a tela SEPARA — ${NO_TETO.length} nomes de`
      + ` ${nomesDoTeto.projetados} projetados (eram 27 antes da régua), e são`
      + ` exatamente ${NO_TETO.join(', ')}`
      + ` · medido ${nomesDoTeto.desenhados}: [${corposDoTeto.join(', ')}]`
  );
  conferir(
    nomesDoTeto.estrelasProprias + nomesDoTeto.estrelasBayer.length === 0
      && nomesDoTeto.corpos.length < OS_DEZ_DO_TETO.length,
    `...e nenhuma estrela de fundo toma a vaga de um corpo do sistema:`
      + ` ${nomesDoTeto.corpos.length} dos ${OS_DEZ_DO_TETO.length} corpos com nome,`
      + ` ${nomesDoTeto.estrelasProprias + nomesDoTeto.estrelasBayer.length} estrelas`
  );

  // ---- 16: O POLO DO CORPO NO ALTO (Onda 7) ------------------------
  // O `up` era a constante do polo da eclíptica em toda parte. No degrau
  // "corpo" ele passa a ser o EIXO DO PLANETA — e os dois são coisas
  // bem diferentes: 23,4° de diferença, que é a torção que o visitante
  // via no globo.
  await sessao.ir('atlas=1&foco=terra&ver=corpo&q=cinema&shot=1');
  await sessao.assentar();
  const noCorpo = JSON.parse(await sessao.js(`JSON.stringify({
    degrau: window.__director.escadaViva.degrau,
    up: window.__director.engine.camera.up.toArray() })`));
  // o eixo da Terra em EQUATORIAL J2000 é o próprio polo celeste: (0,0,1)
  // a menos de precessão. O polo da ECLÍPTICA, no mesmo frame, é
  // (0, −0,3977, 0,9175) — se o `up` fosse ele, o y valeria −0,4.
  const desvioDoEixo = Math.acos(Math.min(1, Math.abs(noCorpo.up[2]))) * (180 / Math.PI);
  conferir(
    noCorpo.degrau === 'corpo' && desvioDoEixo < 1 && Math.abs(noCorpo.up[1]) < 0.05,
    `no degrau "corpo" o alto da tela é o EIXO DA TERRA, a ${desvioDoEixo.toFixed(2)}° do`
      + ` polo celeste e não os 23,4° da eclíptica (up=${noCorpo.up.map((v) => v.toFixed(4))})`
  );

  // ---- 17: O ALVO VIVO com o relógio andando (Onda 7) --------------
  // O enquadramento copiava a posição UMA VEZ. Aqui o relógio vai à
  // taxa mais rápida da escada e se mede quanto o ALVO andou contra o
  // tamanho do enquadramento: se ele não fosse vivo, o corpo teria
  // saído de quadro por milhares de vezes o próprio raio.
  const leitura = () => sessao.js(`(() => {
    const d = window.__director;
    return JSON.stringify({
      alvo: d.atlas.alvo.toArray(),
      dist: d.engine.camera.position.distanceTo(d.atlas.alvo),
      taxa: d.tempo.taxa });
  })()`);
  const antesDoRelogio = JSON.parse(await leitura());
  for (let i = 0; i < 12; i++) {
    if (/115/.test(JSON.parse(await sessao.js('JSON.stringify(window.__director.tempo)')).taxa)) break;
    await sessao.js('window.__director.ciclarDegrau()');
  }
  await sessao.js('window.__director.andarNoTempo(1)');
  // espera de ESTADO, não 2 s de parede (item 113): o veredito cobra o
  // alvo andando >100× o raio do enquadramento, então espera-se o
  // PRÓPRIO deslocamento cruzar o limiar (com margem) e o relógio para
  // em seguida. O estouro não cala: sem o limiar cruzado o `emQuadros`
  // abaixo fica aquém dos 100 e o veredito reprova.
  const LIMIAR_DO_RELOGIO = 110 * antesDoRelogio.dist;
  const msDoRelogio = await esperarPor(sessao, `(() => {
    const a = window.__director.atlas.alvo;
    return Math.hypot(a.x - (${antesDoRelogio.alvo[0]}), a.y - (${antesDoRelogio.alvo[1]}),
      a.z - (${antesDoRelogio.alvo[2]})) > ${LIMIAR_DO_RELOGIO}; })()`, 6000);
  await sessao.js('window.__director.andarNoTempo(0)');
  const depoisDoRelogio = JSON.parse(await leitura());
  const andou = Math.hypot(
    depoisDoRelogio.alvo[0] - antesDoRelogio.alvo[0],
    depoisDoRelogio.alvo[1] - antesDoRelogio.alvo[1],
    depoisDoRelogio.alvo[2] - antesDoRelogio.alvo[2]
  );
  const emQuadros = andou / depoisDoRelogio.dist;
  conferir(
    emQuadros > 100,
    `a 115,7 dias/s o alvo andou ${(andou / 4.84813681e-6).toFixed(2)} UA em`
      + ` ${msDoRelogio === null ? 'ESTOURO de 6' : (msDoRelogio / 1000).toFixed(1)} s —`
      + ` ${emQuadros.toFixed(0)}× o raio do enquadramento`
  );
  conferir(
    Math.abs(depoisDoRelogio.dist - antesDoRelogio.dist) / antesDoRelogio.dist < 1e-6,
    `...e a câmera foi junto: a distância de enquadramento é a MESMA`
      + ` (${antesDoRelogio.dist.toExponential(6)} → ${depoisDoRelogio.dist.toExponential(6)} pc)`
  );

  await sessao.reduzirMovimento();
  await sessao.ir('t=100&q=cinema');
  await sessao.js("[...document.querySelectorAll('.controls-bar button')]"
    + ".find((b) => b.innerText.toUpperCase().includes('ATLAS')).click()");
  await dorme(150);
  conferir(
    (await sessao.js('window.__director.captura.fase')) === 'atlas'
      && Number(await sessao.js(veu)) === 0,
    'reduced-motion: a troca é instantânea e o véu nunca acende'
  );
  // ---- 18: O SOL DO ATLAS OBEDECE AO CALENDÁRIO (item 5) -----------
  //
  // A prova 3 mede a ABERTURA do Atlas, onde o Sol não chega a um pixel
  // (226,8 UA). Esta desce ao DEGRAU DO CORPO — o único enquadramento em
  // que o Sol É a imagem — e cobra as duas metades do item 5, que só
  // valem JUNTAS:
  //
  //  (a) MESMA DATA, DOIS CAMINHOS: entrar no Atlas a partir de t=10 e a
  //      partir de t=100 tem de dar o MESMO md5. Até 21/08 dava dois
  //      Sóis — o pino da dramaturgia só empurrava a fase para FRENTE e
  //      quem alimentava as regiões era um acumulador, então os quadros
  //      do filme desenhados antes do portal deixavam resíduo;
  //  (b) DATAS DIFERENTES, SÓIS DIFERENTES: a mesma rota com o relógio
  //      noutra data tem de dar md5 DIFERENTE. Sem esta metade, (a)
  //      passaria com um Sol congelado — que é exatamente o defeito
  //      antigo, e ele passaria por virtude.
  //
  // O VEREDITO DO RELÓGIO VEM ANTES DO VEREDITO DO PIXEL, como na prova
  // 3: se o pino do céu sair do lugar, é ele quem diz o que aconteceu em
  // vez de o Sol levar a culpa.
  const noCorpoDoSol = async (t, jd) => {
    await sessao.ir(`t=${t}&${PIN}&jd=${jd}`);
    await sessao.js('window.__director.entrarNoAtlas()');
    await sessao.js("window.__director.focarNoCorpo('sun', 'corpo')");
    const pousou = await sessao.assentar();
    return {
      md5: await sessao.md5(),
      via: pousou.via,
      jd: await sessao.js('window.__director.tempo.jd'),
      degrau: await sessao.js('window.__director.escadaViva.degrau'),
    };
  };
  const de10 = await noCorpoDoSol(10, 'EPOCA');
  const de100 = await noCorpoDoSol(100, 'EPOCA');
  const outraData = await noCorpoDoSol(10, 2465000);
  conferir(
    de10.degrau === 'corpo' && de100.degrau === 'corpo' && outraData.degrau === 'corpo',
    `as três entradas param no degrau do CORPO do Sol`
      + ` (${de10.degrau} · ${de100.degrau} · ${outraData.degrau})`
  );
  conferir(
    de10.via === 'sinal' && de100.via === 'sinal' && outraData.via === 'sinal',
    `o corpo do Sol assenta por via=sinal (${de10.via} · ${de100.via} · ${outraData.via})`
  );
  conferir(
    de10.jd === de100.jd && de10.jd !== outraData.jd,
    `o relógio do céu: as duas entradas na MESMA data (${de10.jd}) e a`
      + ` contraprova noutra (${outraData.jd})`
  );
  conferir(
    de10.md5 === de100.md5,
    `mesma data, dois caminhos: t=10 e t=100 dão o MESMO Sol`
      + ` (${de10.md5} vs ${de100.md5})`
  );
  conferir(
    de10.md5 !== outraData.md5,
    `datas diferentes, Sóis diferentes — o Sol do Atlas tem calendário`
      + ` (${de10.md5} vs ${outraData.md5})`
  );

  // ---- 20: A PORTA DE DUAS VIAS DO BRILHO (itens 103 e 91/Q14) ------
  //
  // A QUEM SERVE: ao DONO, e à decisão 3 dele no item 91 — a linha
  // BRILHO do selo é um INTERRUPTOR, ao vivo, com a URL espelhando o
  // gesto nos dois sentidos. Quem quebrar isso quebra o único controle
  // que o visitante tem sobre a política de luz sem editar a URL à mão.
  //
  // E DESDE 26/08 ELA COBRA UMA TERCEIRA COISA, pela Q14 do mesmo dono
  // (*"R1 — +3 passos fixos, sempre os mesmos, declarados no selo"*): o
  // gesto tem de levar a EXPOSIÇÃO junto, no mesmo clique. A porta passou
  // a ter duas cargas — a política de luz do globo e a chapa do quadro —,
  // e uma que ficasse para trás devolveria ao vivo o modo real *"escuro
  // demais"* que ele reprovou. Cresceu a prova, não nasceu outra: é o
  // MESMO gesto, no mesmo estado difícil (tier abaixo de cinema), e uma
  // prova irmã pagaria de novo os ~20 s de subir Chrome e assentar cena.
  //
  // POR QUE ELA PRECISOU EXISTIR. A porta nasceu em 25/08 e emperrou
  // calada. Palavras dele em 26/08: *"depois que clico no selo de
  // honestidade, na parte de brilho, nao consigo voltar ao modo anterior
  // nem vice versa"*. Nenhum juiz da casa podia dizê-lo, e por três
  // razões que valem para toda prova de HUD daqui em diante:
  //
  //  1. TODO md5 desta casa é pinado em `?shot=2`, que APAGA o HUD. Um
  //     selo que não está na tela não recebe clique de ninguém.
  //  2. Todo harness pina `?q=cinema` — e era justamente o tier ABAIXO
  //     de cinema que trancava a porta. O pino escondia o caso.
  //  3. Os pinos puros do item 91 rodavam sobre um estado de tier
  //     `cinema`, onde o defeito não existe; e um deles CONGELOU o
  //     defeito como lei ("a volta NÃO arma..."), enquanto outro cobrava
  //     o HUD por GREP do texto-fonte da própria linha errada.
  //
  // POR ISSO ESTA PROVA É DE COMPORTAMENTO E NÃO DE TEXTO: ela abre o
  // Atlas SEM `shot=2` (o HUD tem de existir para receber o gesto) e
  // COM `?q=alta` — o tier abaixo de cinema é um desvio de `volta:
  // 'nenhuma'`, o que faz o veredito NUNCA esvaziar. É o estado exato
  // em que a porta emperrava. Depois clica no selo com mouse de
  // verdade, duas vezes na linha BRILHO, e cobra as três coisas: a luz
  // troca nos DOIS sentidos, a URL acompanha (`?luz=real` indo, a chave
  // APAGADA voltando — `assistida` é o padrão) e a linha nunca fica
  // desabilitada, que era como o gesto morria.
  const SELO = (sel, n = 0) =>
    `JSON.stringify((()=>{const e=document.querySelectorAll(${JSON.stringify(sel)})[${n}];`
    + `if(!e) return null; const r=e.getBoundingClientRect();`
    + `return {x:r.x+r.width/2,y:r.y+r.height/2,dis:!!e.disabled};})())`;
  /**
   * A EXPOSIÇÃO VIVA entra aqui pela Q14 do dono (26/08, item 91): em
   * `?luz=real` o quadro abre +3 passos FIXOS, e o gesto da porta tem de
   * levar a chapa junto NO MESMO CLIQUE — sem recarga. É a metade que
   * faltava a esta prova: ela já sabia dizer que a POLÍTICA virava, e não
   * sabia dizer que a FOTO virava com ela.
   *
   * LIDA DO RENDERER, que é o consumidor final — não do Director, não da
   * constante. Um `exposicaoDoQuadro` que ninguém chamasse continuaria
   * dando 8 numa prova de unidade e deixaria a tela escura aqui.
   */
  const luzViva = () =>
    sessao.js(
      "JSON.stringify({luz: window.__director.selo.luz,"
      + " exp: window.__director.engine.renderer.toneMappingExposure,"
      + " url: new URLSearchParams(location.search).get('luz'),"
      + " zzz: new URLSearchParams(location.search).has('zzz')})"
    );
  /**
   * Espera o selo existir e o ABRE se estiver fechado. Sobrevive a
   * RECARGA de propósito: um desvio de `volta: 'recarregar'` (a porta
   * não declarada da segunda metade) troca o documento no meio do gesto,
   * e o estado aberto/fechado do selo não vai para a URL nem para o
   * storage — ele nasce fechado do outro lado.
   */
  const abrirOSelo = async (teto = 40000) => {
    const t0 = Date.now();
    for (;;) {
      const temLinha = await sessao
        .js("!!document.querySelectorAll('.atlas-selo-linha')[1]")
        .catch(() => false);
      if (temLinha) return true;
      const bruto = await sessao.js(SELO('.atlas-selo-resumo')).catch(() => null);
      const caixa = bruto ? JSON.parse(bruto) : null;
      if (caixa) {
        await sessao.clicar(caixa.x, caixa.y);
        await dorme(400);
        continue;
      }
      if (Date.now() - t0 > teto) return false;
      await dorme(500);
    }
  };

  await sessao.ir('atlas=1&foco=saturn&ver=corpo&q=alta&jd=EPOCA');
  const resumoDoSelo = JSON.parse(await sessao.js(SELO('.atlas-selo-resumo')));
  conferir(resumoDoSelo !== null, 'o selo está na tela para receber o gesto (sem ?shot=2)');
  if (resumoDoSelo) {
    await sessao.clicar(resumoDoSelo.x, resumoDoSelo.y);
    await dorme(300);
    // o tier abaixo de cinema TEM de estar declarado: sem ele esta prova
    // mede o caso fácil e passa verde sobre a porta trancada
    const indesfazivel = await sessao.js(
      "JSON.stringify(window.__director.selo.tier)"
    );
    conferir(
      indesfazivel === '"alta"',
      `o tier abaixo de cinema está vivo (${indesfazivel}) — é o desvio`
        + ' indesfazível que trancava a porta'
    );
    const passos = [];
    for (let i = 0; i < 2; i++) {
      const linha = JSON.parse(await sessao.js(SELO('.atlas-selo-linha', 1)));
      if (!linha) break;
      passos.push({ dis: linha.dis });
      await sessao.clicar(linha.x, linha.y);
      await dorme(500);
      passos[i].depois = JSON.parse(await luzViva());
      // o TEXTO da linha depois do clique — é onde a Q14 manda o selo
      // declarar a chapa. Lido da tela, não da fonte: o pino de grep
      // desta mesma linha já custou uma investigação inteira (a lápide
      // está em `selo.test.ts`, bloco 3).
      passos[i].texto = await sessao.js(
        "document.querySelectorAll('.atlas-selo-linha')[1].textContent"
      );
    }
    conferir(
      passos.length === 2 && !passos[0].dis && !passos[1].dis,
      `a linha BRILHO aceita os DOIS cliques (desabilitada:`
        + ` ${passos.map((p) => p.dis).join(', ')}) — desabilitar no meio`
        + ' do caminho era como a porta emperrava'
    );
    conferir(
      passos[0]?.depois.luz === 'real' && passos[1]?.depois.luz === 'assistida',
      `o clique troca o modo NOS DOIS SENTIDOS: assistida →`
        + ` ${passos[0]?.depois.luz} → ${passos[1]?.depois.luz}`
    );
    conferir(
      passos[0]?.depois.url === 'real' && passos[1]?.depois.url === null,
      `e a URL espelha o gesto nas duas voltas: ?luz=${passos[0]?.depois.url}`
        + ` indo, chave ${passos[1]?.depois.url === null ? 'APAGADA' : passos[1]?.depois.url} voltando`
    );
    // ---- A CHAPA VAI JUNTO — a Q14 do dono, 26/08 (item 91) ---------
    //
    // *"R1 — +3 passos fixos, sempre os mesmos, declarados no selo"*. O
    // gesto que vira a política tem de virar a EXPOSIÇÃO no mesmo
    // instante: um app que trocasse a luz e deixasse a chapa para a
    // próxima recarga daria, ao vivo, o modo real *"escuro demais"* que
    // ele reprovou — e nenhum juiz da casa saberia dizê-lo, porque os
    // pinos de md5 rodam por URL, com o binário já aberto no modo certo.
    //
    // A RAZÃO é a medida, e não o valor: multiplicar e dividir por
    // potência de 2 é exato em binário, então isto compara PASSOS com
    // passos. Os +3 saem de `PASSOS_DA_EXPOSICAO_REAL`
    // (`src/lib/atlas/luzDaVisita.ts`) e são lidos da fonte, nunca
    // redigitados aqui — a disciplina anti-deriva do item 99.
    conferir(
      Number.isInteger(PASSOS_DA_EXPOSICAO_REAL) && PASSOS_DA_EXPOSICAO_REAL > 0,
      `os passos da Q14 saíram da FONTE e não deste arquivo`
        + ` (${PASSOS_DA_EXPOSICAO_REAL}) — sem isto a razão abaixo compara com NaN`
    );
    const razao = passos[1]?.depois.exp
      ? passos[0]?.depois.exp / passos[1]?.depois.exp
      : NaN;
    conferir(
      Math.abs(razao - FATOR_DA_EXPOSICAO_REAL) < 1e-9,
      `a chapa vira NO MESMO GESTO: real ${passos[0]?.depois.exp?.toFixed(4)}`
        + ` × assistido ${passos[1]?.depois.exp?.toFixed(4)} = ${razao?.toFixed(6)}`
        + ` (os +${PASSOS_DA_EXPOSICAO_REAL} passos da Q14, sem recarga)`
    );
    conferir(
      Math.abs(passos[1]?.depois.exp - 1.02) < 1e-6,
      `e o assistido continua na exposição de referência da casa`
        + ` (${passos[1]?.depois.exp?.toFixed(4)}, o 1,02 da vista interna) — a Q14`
        + ' mexeu na chapa do modo real e em mais nada'
    );
    // ...E O SELO DECLARA, que é a outra metade da Q14 (*"declarados no
    // selo"*). Sem esta linha o app abriria +3 passos calado, e o selo
    // seguiria dizendo "a fotometria da casa, sem ajuste" — a lista curta
    // que o cabeçalho do `selo.ts` promete não repetir.
    conferir(
      (passos[0]?.texto || '').includes(`+${PASSOS_DA_EXPOSICAO_REAL} passos`)
        && (passos[0]?.texto || '').includes('tempo de exposição'),
      `e a linha BRILHO DECLARA a chapa no modo real: "${(passos[0]?.texto || '').trim()}"`
    );
    // e no assistido ela volta a falar de assistência, não de chapa
    conferir(
      !(passos[1]?.texto || '').includes('tempo de exposição'),
      `de volta ao assistido a declaração de chapa SOME: "${(passos[1]?.texto || '').trim()}"`
    );
  }

  // ---- 20b: A MESMA PORTA, COM UMA CHAVE NÃO DECLARADA NA URL -------
  //
  // O SEGUNDO CAMINHO que mantém o veredito cheio, e ele foi levantado
  // pelo auditor do item 103: `desconhecida()` (`selo.ts`) é empurrada
  // para TODA porta que a URL traz e o registro não conhece, com
  // `desvia: () => true`. Enquanto ela estiver na URL o veredito nunca
  // esvazia — a mesma forma do defeito do tier.
  //
  // MEDIDO, E O DESFECHO É OUTRO: a porta desconhecida NÃO tranca nada,
  // porque ela é `volta: 'recarregar'` e não `'nenhuma'`. Quer dizer: o
  // clique TEM o que desfazer, apaga a chave da URL e RECARREGA — e do
  // outro lado da recarga a chave não existe mais, então o ciclo segue
  // normal. O preço declarado é a recarga (e o selo nasce FECHADO nela,
  // porque o aberto/fechado é chrome e não vai para a URL).
  //
  // ESTA METADE FICA porque o caminho é real e agora é medido: se alguém
  // trocar a `volta` da porta desconhecida para `'nenhuma'` — ou se a
  // guarda voltar a ler o veredito inteiro —, é aqui que a conta muda.
  await sessao.ir('atlas=1&foco=saturn&q=cinema&zzz=1');
  const abriuComChave = await abrirOSelo();
  conferir(abriuComChave, 'com uma chave não declarada na URL o selo abre igual');
  if (abriuComChave) {
    const comChave = [];
    for (let i = 0; i < 2; i++) {
      if (!(await abrirOSelo())) break;
      const linha = JSON.parse(await sessao.js(SELO('.atlas-selo-linha', 1)));
      if (!linha) break;
      // a marca morre com o documento — é ela que diz "a recarga já passou"
      await sessao.js('window.__antesDaVolta = 1');
      await sessao.clicar(linha.x, linha.y);
      // espera de ESTADO, não 3 s de parede (item 113). A primeira volta
      // passa por RECARGA (a porta desconhecida é volta:'recarregar') e o
      // documento troca no meio: espera-se o documento NOVO (sem a marca)
      // com a LUZ que o clique pediu — só a luz não basta, o documento
      // velho poderia respondê-la antes de navegar. A segunda volta é
      // gesto no MESMO documento e a marca fica; ali só a luz decide. O
      // catch é o do `abrirOSelo`: o vão entre documentos derruba o
      // evaluate, e esse erro é a própria recarga passando. O estouro não
      // cala: a luz errada reprova no veredito do ciclo, logo abaixo.
      const luzPedida = i === 0 ? 'real' : 'assistida';
      const soDocNovo = i === 0 ? "typeof window.__antesDaVolta === 'undefined' && " : '';
      const t0DaVolta = Date.now();
      for (;;) {
        const chegou = await sessao
          .js(`${soDocNovo}((window.__director || {}).selo || {}).luz === '${luzPedida}'`)
          .catch(() => false);
        if (chegou || Date.now() - t0DaVolta > 15000) break;
        await dorme(150);
      }
      comChave.push(JSON.parse(await luzViva()));
    }
    conferir(
      comChave[0]?.luz === 'real' && comChave[1]?.luz === 'assistida',
      `...e o ciclo fecha do mesmo jeito ATRAVESSANDO a recarga:`
        + ` assistida → ${comChave[0]?.luz} → ${comChave[1]?.luz}`
    );
    conferir(
      comChave[0]?.zzz === false,
      `...e a chave não declarada é APAGADA pelo gesto (?zzz ainda na URL:`
        + ` ${comChave[0]?.zzz}) — é o que a torna desfazível em vez de tranca`
    );
  }

  // ---- 21: A INÉRCIA DO GIRO — solta o arrasto e ele morre macio ----
  //
  // (item 102, P1. Palavras do dono: *"o movimento de rotacionar objetos
  // selecionados do app é péssimo… porque somos diferentes do nasa eyes
  // nisso?"*. A causa, medida dos dois lados: lá TODO delta de arrasto
  // passa por um filtro exponencial e o giro morre macio ao soltar; aqui
  // ele ia seco no acumulador e a câmera parava no MESMO quadro em que o
  // dedo parava.)
  //
  // O ARRASTO É DE MOUSE E FEITO À MÃO: o `clicar` da casa não anda —
  // press e release no mesmo ponto. O `pointerdown` é do CANVAS e o
  // `pointermove`/`pointerup` são da JANELA (`director/gestos.ts`), e o
  // `Input.dispatchMouseEvent` serve os dois de uma vez.
  //
  // A MEDIDA É AMOSTRADA POR QUADRO DENTRO DA PÁGINA, e os dois motivos
  // são de instrumento: um `sessao.js` por quadro custa 200–500 ms de
  // round-trip e mediria o CDP em vez do filtro; e quem marca o instante
  // de SOLTAR é a própria página, ouvindo o `pointerup` — uma marca
  // vinda daqui chegaria dezenas de quadros atrasada e comeria o rastro
  // que a prova existe para medir.
  {
    await sessao.ir(`atlas=1&foco=saturno&jd=EPOCA&${PIN}`);
    await sessao.assentar();

    await sessao.js(`(() => {
      window.__giro = [];
      window.__soltouEm = -1;
      window.addEventListener('pointerup', () => {
        window.__soltouEm = window.__giro.length;
      }, { once: true });
      const passo = () => {
        window.__giro.push(window.__director.atlas.anguloDoGiro);
        window.__giroRaf = requestAnimationFrame(passo);
      };
      passo();
    })()`);

    const meio = JSON.parse(await sessao.js(`(() => {
      const r = document.querySelector('canvas').getBoundingClientRect();
      return JSON.stringify([Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]);
    })()`));
    const mouse = (type, x, buttons) => sessao.send('Input.dispatchMouseEvent', {
      type, x, y: meio[1], button: 'left', buttons, clickCount: 1, pointerType: 'mouse',
    });
    // 15 passos de 12 px, um por quadro: atravessa o limiar do clique
    // curto logo no primeiro e dá tempo de o filtro chegar ao regime
    // antes de o dedo soltar. Sem o `dorme` os 15 caem no mesmo quadro e
    // o que se mediria seria um piparote, não um arrasto.
    await mouse('mousePressed', meio[0], 1);
    for (let i = 1; i <= 15; i++) {
      await mouse('mouseMoved', meio[0] + i * 12, 1);
      await dorme(16);
    }
    await mouse('mouseReleased', meio[0] + 15 * 12, 0);
    await dorme(1500);

    const { giro, soltouEm } = JSON.parse(await sessao.js(`(() => {
      cancelAnimationFrame(window.__giroRaf);
      return JSON.stringify({ giro: window.__giro, soltouEm: window.__soltouEm });
    })()`));
    // o último quadro em que a órbita ainda ANDOU
    let ultimo = -1;
    for (let i = 1; i < giro.length; i++) if (giro[i] !== giro[i - 1]) ultimo = i;
    const rastro = soltouEm >= 0 && ultimo >= soltouEm ? ultimo - soltouEm + 1 : 0;
    const girou = soltouEm > 0 ? Math.abs(giro[soltouEm - 1] - giro[0]) : 0;

    conferir(
      girou > 0.05,
      `o arrasto de 180 px girou o Atlas: ${girou.toFixed(3)} rad até soltar`
    );
    conferir(
      rastro >= 5 && rastro <= 60,
      `...e o giro NÃO para seco quando o dedo solta: ${rastro} quadros de rastro`
        + ` (antes do filtro eram 0)`
    );
    // e o rastro MORRE: os quadros finais não mudam um bit
    const parados = giro.length - 1 - ultimo;
    conferir(
      parados >= 10,
      `...e o rastro morre de vez: ${parados} quadros finais sem mexer um bit`
    );

    // ...e a JANELA DO TOQUE (item 102, P2): o arrasto que ainda cabe no
    // clique curto não gira NADA — nem no MOUSE, que até 26/08 andava
    // desde o primeiro pixel. A régua é o GIRO e não a câmera: o alvo
    // é vivo e anda com o relógio, então a posição da câmera nunca é
    // bit-idêntica entre duas leituras separadas por meio segundo (o
    // primeiro veredito desta prova mediu isso e reprovou por causa do
    // instrumento, não do produto).
    const giroVivo = async () => Number(await sessao.js(
      'window.__director.atlas.anguloDoGiro'
    ));
    const antesDoCurto = await giroVivo();
    await mouse('mousePressed', meio[0], 1);
    await mouse('mouseMoved', meio[0] + 4, 1);
    await mouse('mouseReleased', meio[0] + 4, 0);
    await dorme(500);
    const giroCurto = Math.abs((await giroVivo()) - antesDoCurto);
    // 4 px ENTREGUES seriam 8,8e-3 rad. O que sobra é o resíduo de float
    // da RE-SELEÇÃO — o gesto curto virou clique, como tem de virar, e
    // `selecionar` reescreve o giro no referencial novo passando por uma
    // base de câmera e um `setFromRotationMatrix`. O teto é 1e-6 rad,
    // que são 0,2 segundo de arco: três ordens de grandeza ABAIXO do
    // gesto entregue e muito acima do resíduo. (Era 1e-12 com o par de
    // ângulos, cuja volta era dois `atan2` e custava menos ULPs.)
    conferir(
      giroCurto < 1e-6,
      `...e o arrasto de 4 px não gira o Atlas: ${giroCurto.toExponential(1)} rad`
        + ` (entregue, seriam 8,8e-3)`
    );
  }

  // ---- 22: A BÚSSOLA — ela aparece torta, endireita e some ----------
  //
  // (item 102, 26/08. A sugestão dele: "podemos colocar um botao de
  // zerar orientacao, assim como o google maps tem um botao de norte".)
  //
  // POR QUE ESTA PROVA EXISTE NO NAVEGADOR e não só na bancada: a
  // bancada julga a CONTA (o desvio, a histerese, a rampa), e ela já o
  // faz. O que só aqui se pode julgar é a FIAÇÃO — o rig acender, o
  // Director entregar a virada ao React na BORDA, o React montar o
  // botão, o clique voltar até o rig e o botão sumir sozinho. É
  // exatamente o tipo de caminho que passa por `tsc` e por 2.400 testes
  // calado quando um dos fios não é ligado (a jurisprudência é o
  // `?calib=`, em que trocar um default não reprovou nada).
  //
  // O GESTO É DIAGONAL de propósito: giro livre acumula roll por
  // holonomia da esfera, e é o arrasto na diagonal que a acumula
  // depressa. Um arrasto puro na horizontal ou na vertical em torno do
  // repouso quase não torce o horizonte — e a prova não acenderia nada.
  //
  // SEM `?shot=2`, E ISSO É A PROVA E NÃO UM DETALHE: aquela porta
  // apaga o HUD inteiro (`.bare-mode > *:not(.scene-canvas)`), e um
  // botão de HUD medido com o HUD apagado dá retângulo (0,0,0,0) — a
  // conferência de "cabe na tela" passaria verde sobre uma peça que
  // ninguém vê. É a regra 7 do AGENTS com todas as letras: vista sem
  // HUD não prova trabalho de HUD. O precedente é a prova do selo, que
  // larga o PIN pelo mesmo motivo.
  {
    await sessao.ir('atlas=1&foco=saturno&jd=EPOCA&q=cinema');
    await sessao.assentar();

    const bussola = async () => JSON.parse(await sessao.js(`(() => {
      const b = document.querySelector('.atlas-bussola');
      if (!b) return JSON.stringify({ existe: false });
      const r = b.getBoundingClientRect();
      return JSON.stringify({
        existe: true,
        acesa: b.classList.contains('acesa'),
        // o que o OLHO vê, não só a classe: opacidade e visibilidade
        // computadas, que é o que o CSS realmente entregou
        opacidade: Number(getComputedStyle(b).opacity),
        visivel: getComputedStyle(b).visibility === 'visible',
        rotulo: b.getAttribute('aria-label'),
        // ...e o que o TECLADO alcança: um botão invisível na ordem de
        // tabulação é armadilha de a11y
        tabbable: b.tabIndex === 0,
        // TEM TAMANHO DE VERDADE — a guarda contra medir uma peca que o
        // bare-mode (ou um display:none qualquer) apagou: ali o
        // retangulo e (0,0,0,0) e toda pergunta de posicao passa verde
        temCaixa: r.width > 8 && r.height > 8,
        dentroDaTela:
          r.left >= 0 && r.top >= 0
          && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
        // ...e mora na METADE ESQUERDA, na faixa do MEIO: a direita é
        // onde a ficha do objeto abre, e a bússola morava debaixo dela
        naBordaEsquerda: r.x + r.width / 2 < window.innerWidth * 0.5,
        naFaixaDoMeio:
          r.y + r.height / 2 > window.innerHeight * 0.25
          && r.y + r.height / 2 < window.innerHeight * 0.75,
        // e NÃO encosta em nenhuma outra peça permanente do HUD
        // OS DIÁLOGOS ENTRAM NA CONTA, e esta linha é a cicatriz: a
        // bússola nasceu na borda DIREITA com esta lista sem eles, e a
        // prova deu 0 sobreposições sobre um botão que acendia POR
        // BAIXO da ficha do objeto (z 46 contra z 40) — no pior caso
        // possível, que é o de quem acabou de focar um corpo. Quem
        // mede sobreposição de HUD mede contra o HUD INTEIRO.
        encosta: ['.controls-bar', '.atlas-selo', '.atlas-tempo', '.free-hint',
          '.atlas-alcas', '[data-dialogo]', '.letterbox']
          .flatMap((sel) => [...document.querySelectorAll(sel)]
            .map((n) => ({ sel, o: n.getBoundingClientRect() })))
          .filter((x) => x.o.width > 0 && x.o.height > 0)
          .filter((x) => !(r.right <= x.o.left || r.left >= x.o.right
            || r.bottom <= x.o.top || r.top >= x.o.bottom))
          .map((x) => x.sel + ' [' + Math.round(x.o.x) + ',' + Math.round(x.o.y)
            + ' ' + Math.round(x.o.width) + 'x' + Math.round(x.o.height) + ']'),
        x: Math.round(r.x), y: Math.round(r.y),
      });
    })()`));
    const desvioGraus = async () => Number(await sessao.js(
      'Math.abs(window.__director.atlas.desvioDoHorizonte) * 180 / Math.PI'
    ));

    const dormindo = await bussola();
    conferir(
      dormindo.existe && !dormindo.acesa && dormindo.opacidade === 0
        && !dormindo.visivel && !dormindo.tabbable,
      `a bússola nasce APAGADA e fora do teclado: acesa=${dormindo.acesa}`
        + ` opacidade=${dormindo.opacidade} tabbable=${dormindo.tabbable}`
    );
    conferir(
      (await desvioGraus()) === 0,
      'e o horizonte nasce de pé: desvio 0,000° na pose de repouso'
    );

    // o arrasto DIAGONAL que torce o horizonte
    const meioB = JSON.parse(await sessao.js(`(() => {
      const r = document.querySelector('canvas').getBoundingClientRect();
      return JSON.stringify([Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]);
    })()`));
    const arrastar = async (passos) => {
      await sessao.send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x: meioB[0], y: meioB[1],
        button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse',
      });
      for (let i = 1; i <= passos; i++) {
        await sessao.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved', x: meioB[0] + i * 14, y: meioB[1] + i * 14,
          button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse',
        });
        await dorme(16);
      }
      await sessao.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', x: meioB[0] + passos * 14, y: meioB[1] + passos * 14,
        button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse',
      });
      await dorme(900);
    };
    await arrastar(26);

    const torto = await desvioGraus();
    const acesa = await bussola();
    conferir(
      torto > 5 && acesa.acesa && acesa.opacidade === 1 && acesa.visivel
        && acesa.tabbable,
      `o arrasto diagonal torceu o horizonte ${torto.toFixed(1)}° e a bússola`
        + ` ACENDEU: opacidade=${acesa.opacidade} tabbable=${acesa.tabbable}`
    );
    conferir(
      acesa.temCaixa && acesa.dentroDaTela && acesa.naBordaEsquerda
        && acesa.naFaixaDoMeio && acesa.encosta.length === 0
        && acesa.rotulo === 'Endireitar o horizonte',
      `...e ela tem CAIXA de verdade em (${acesa.x}, ${acesa.y}), na borda`
        + ` esquerda e na faixa do meio, sem encostar em nenhuma peça do HUD`
        + ` (sobreposições: ${JSON.stringify(acesa.encosta)}), com rótulo para quem ouve:`
        + ` "${acesa.rotulo}"`
    );

    // ...E NO TELEFONE, onde a geometria é outra e a peça se muda de
    // lugar: lá a ficha do objeto é uma FOLHA DE BAIXO de largura
    // inteira, e a meia altura cai dentro dela — a bússola encosta na
    // barra (`--barra-fim`) em vez de ficar centrada. Por isso a faixa
    // do meio NÃO é cobrada aqui: o que se cobra é o que importa nas
    // duas telas, que é não encostar em NADA. Só se trocam as MÉTRICAS
    // (reversível); a emulação de TOQUE não entra — ela é de mão única
    // nesta sessão, e a prova 19 declara isso.
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: false,
    });
    await dorme(600);
    const noTelefone = await bussola();
    conferir(
      noTelefone.acesa && noTelefone.temCaixa && noTelefone.dentroDaTela
        && noTelefone.naBordaEsquerda
        && noTelefone.encosta.length === 0,
      `...e a 390×844 ela continua inteira em (${noTelefone.x},`
        + ` ${noTelefone.y}), sem encostar na barra nem nas alças`
        + ` (sobreposições: ${JSON.stringify(noTelefone.encosta)})`
    );
    await sessao.send('Emulation.clearDeviceMetricsOverride');
    await dorme(600);

    // A MIRA NÃO PODE ANDAR no clique — é a lei do botão de norte. A
    // régua é a DIREÇÃO alvo→câmera e não a posição: o alvo é vivo e
    // anda com o relógio (foi o que reprovou a primeira versão da prova
    // 21, por instrumento e não por produto).
    const miraViva = async () => JSON.parse(await sessao.js(`(() => {
      const c = window.__director.engine.camera;
      const a = window.__director.atlas.alvo;
      const d = c.position.clone().sub(a).normalize();
      return JSON.stringify([d.x, d.y, d.z]);
    })()`));
    const miraAntes = await miraViva();
    await sessao.js("document.querySelector('.atlas-bussola').click()");
    await dorme(1200);

    const direito = await desvioGraus();
    const apagada = await bussola();
    conferir(
      direito < 0.5 && !apagada.acesa && apagada.opacidade === 0,
      `o clique ENDIREITOU (${torto.toFixed(1)}° → ${direito.toFixed(3)}°) e a`
        + ` bússola apagou sozinha`
    );
    const miraDepois = await miraViva();
    const andou = Math.hypot(
      miraDepois[0] - miraAntes[0],
      miraDepois[1] - miraAntes[1],
      miraDepois[2] - miraAntes[2]
    );
    conferir(
      andou < 1e-3,
      `...e a MIRA não andou: ${andou.toExponential(1)} de corda unitária`
        + ` (a lei do botão de norte — acerta a bússola, não move o mapa)`
    );
  }

  // ---- 19: OS GESTOS DE DEDO, num APARELHO (item 62, etapa 2) -------
  //
  // A prova 15 mede a roda e a pinça de TRACKPAD — as duas chegam como
  // `wheel`, e a de trackpad traz `ctrlKey`. Num TELEFONE não existe
  // `wheel` nenhum: com `touch-action: none` a pinça produz dois
  // PONTEIROS, e o `ArrastoDePonteiro` ignora o segundo de propósito.
  // Ou seja, o gesto de zoom do aparelho em que ele é O gesto de zoom
  // simplesmente não existia — e nenhum juiz da casa podia dizê-lo,
  // porque nenhum abria um aparelho com toque de verdade.
  //
  // AQUI SE VESTE O APARELHO (`mobile: true` + `setTouchEmulationEnabled`)
  // e se dispara `Input.dispatchTouchEvent`, que é o que produz
  // `pointerType: 'touch'`. Três gestos, os três do dedo:
  //
  //  (a) O TOQUE ESCOLHE, e ele anda: um dedo se apoia e escorrega, e
  //      com o limiar de MOUSE (6 px de quarteirão) o toque virava
  //      arrasto e não escolhia nada. O gesto aqui anda 12 px de
  //      quarteirão de propósito — é o caso que reprovava —, e a câmera
  //      NÃO pode andar com ele (a zona morta do dedo).
  //  (b) O TOQUE DUPLO VAI, e o par sobrevive ao mesmo tremor.
  //  (c) A PINÇA. Afastar os dedos APROXIMA — é a lei da casa, escrita
  //      desde `estalosDoGiro` ("a roda para cima e a pinça ABRINDO ...
  //      querem dizer APROXIMAR") —, e aproximar afasta. E o que ela NÃO
  //      pode fazer: trocar `alvo`, `foco` ou degrau. É a mesma queixa
  //      do item 73 ("nem conseguimos mais selecionar para onde vamos"),
  //      agora pela porta do dedo.
  //
  // A PINÇA É A ÚLTIMA, E NADA NAVEGA DEPOIS DELA. Não é gosto de ordem:
  // é limite MEDIDO do instrumento. Depois de uma sequência de DOIS
  // dedos, a primeira navegação da sessão mata o emulador de toque do
  // Chrome — calado. Medido em 2026-08-23, isolando a variável (a mesma
  // sessão, as mesmas esperas, com e sem a pinça): sem ela o toque
  // depois de navegar continua chegando; com ela, `dispatchTouchEvent`
  // deixa de produzir `pointerdown` NENHUM, enquanto o mouse continua
  // chegando, `navigator.maxTouchPoints` continua 5 e `pointer: coarse`
  // continua verdadeiro. E não há volta: desligar e religar o toque,
  // limpar e repor as métricas do aparelho, navegar de novo — os três
  // remédios foram medidos e os três falham. Quem acrescentar prova de
  // toque aqui põe-na ANTES da pinça.
  const APARELHO = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };
  await sessao.send('Emulation.setDeviceMetricsOverride', APARELHO);
  await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const dedo = (type, touchPoints) =>
    sessao.send('Input.dispatchTouchEvent', { type, touchPoints });

  // (a) e (b): o TOQUE escolhe e o TOQUE DUPLO vai, com o tremor que um
  // dedo tem de verdade.
  //
  // O ALVO É MARTE, PELO NOME — item 105. A versão que escolhia o
  // rótulo mais isolado media coisas diferentes em corridas diferentes:
  // quatro do mesmo binário deram três vezes Marte (vizinho a 39 px) e
  // uma vez Terra (vizinho a 76 px) com a câmera parada no `orbita`,
  // porque o toque caiu longe do rótulo. A falhada foi a primeira
  // depois de reiniciar o servidor (grafo de módulos frio). Juiz que
  // escolhe o próprio alvo não é juiz.
  //
  // Plutão é um dos três corpos com nome na abertura do sistema
  // inteiro (prova 15c; desde 29/08, item 61 — era Marte na abertura
  // interna de 23/08–29/08, e Netuno ficou de fora porque a FICHA
  // aberta cobre o rótulo dele a 390×844). A prova ESPERA o rótulo
  // assentar (duas leituras a ≤ 2 px) e relê a posição na hora do gesto.
  //
  // E ELE TEM DE ESTAR SOBRE O CANVAS, e CONTINUAR SENDO CÉU DEPOIS
  // DO PRIMEIRO TOQUE — a metade que faltava, descoberta em 24/08
  // (item 82). Se o rótulo ficar debaixo da ficha, a prova FALHA com
  // essa frase, em vez de ir às compras noutro corpo.
  const ALVO_DO_TOQUE = 'corpo:pluto';
  const NOME_DO_ALVO = 'Plutão';
  const rotulosNoCeu = async () => JSON.parse(await sessao.js(`JSON.stringify(
    window.__director.rotulos.alvos
      .filter((l) => l.desenhado === true && l.opacity >= 0.15)
      .map((l) => ({ nome: l.name, key: l.key, x: Math.round(l.x * innerWidth),
        y: Math.round(l.y * innerHeight) }))
      .filter((l) => {
        const e = document.elementFromPoint(l.x, l.y);
        return Boolean(e && e.classList.contains('scene-canvas'));
      })
  )`));
  const rotuloDoAlvo = async () => {
    const lista = await rotulosNoCeu();
    const alvo = lista.find((l) => l.key === ALVO_DO_TOQUE);
    if (!alvo) return null;
    const d = Math.min(...lista.filter((o) => o.key !== ALVO_DO_TOQUE)
      .map((o) => Math.hypot(o.x - alvo.x, o.y - alvo.y)));
    alvo.vizinho = Number.isFinite(d) ? Math.round(d) : 0;
    return alvo;
  };
  const esperarAlvoAssentar = async () => {
    let ultimo = null;
    for (let i = 0; i < 24; i++) {
      const a = await rotuloDoAlvo();
      await dorme(250);
      const b = await rotuloDoAlvo();
      if (a && b && Math.hypot(a.x - b.x, a.y - b.y) <= 2) return b;
      ultimo = b;
    }
    return ultimo;
  };
  await sessao.ir('atlas=1&jd=EPOCA&q=cinema');
  await sessao.assentar();
  let nome = await esperarAlvoAssentar();
  if (!nome) {
    conferir(false, `toque: ${NOME_DO_ALVO} não está desenhado sobre o canvas a 390×844`);
  } else if (nome.vizinho < 16) {
    conferir(false, `toque: ${NOME_DO_ALVO} está a ${nome.vizinho} px do vizinho`
      + ` — a prova não mede o limiar de 12 px`);
  } else {
    await Promise.all([
      dedo('touchStart', [{ x: nome.x, y: nome.y, id: 1 }]),
      dedo('touchEnd', []),
    ]);
    await sessao.assentar();
    const aindaCeu = await sessao.js(`(() => {
      const e = document.elementFromPoint(${nome.x}, ${nome.y});
      return String(Boolean(e && e.classList.contains('scene-canvas')));
    })()`);
    await sessao.ir('atlas=1&jd=EPOCA&q=cinema');
    await sessao.assentar();
    nome = await esperarAlvoAssentar();
    if (aindaCeu !== 'true') {
      conferir(false, `toque: o rótulo de ${NOME_DO_ALVO} fica debaixo da ficha`
        + ` depois do primeiro toque — a prova não mede o par`);
    } else if (!nome) {
      conferir(false, `toque: ${NOME_DO_ALVO} sumiu depois do reset`);
    } else {
    /**
     * UM TOQUE QUE ANDA 12 px de quarteirão — o que um dedo faz —, e os
     * três eventos vão JUNTOS ao navegador.
     *
     * O `await` entre eles era o defeito da prova, e ele mediu-se: cada
     * `Input.dispatchTouchEvent` custa uma ida e volta de CDP, e com a
     * cena do Atlas ocupando o processo isso foi de 200 ms (a sessão
     * sozinha) a mais de 500 (a sessão inteira do smoke, com o navegador
     * aquecido). O gesto SINTÉTICO passava de meio segundo e o app o
     * classificava, com razão, como "segurar" — a prova reprovava o
     * produto por lentidão do instrumento. Despachados de uma vez, os
     * três comandos entram na MESMA fila da sessão, em ordem, e o gesto
     * dura microssegundos: mais perto de um toque real (50–150 ms).
     *
     * E O FECHO É A LISTA VAZIA: `touchPoints` é o que CONTINUA
     * encostado, nunca o que saiu.
     */
    const tocar = () => Promise.all([
      dedo('touchStart', [{ x: nome.x, y: nome.y, id: 1 }]),
      dedo('touchMove', [{ x: nome.x + 6, y: nome.y + 6, id: 1 }]),
      dedo('touchEnd', []),
    ]);
    const ondeEstaACamera = async () => JSON.parse(await sessao.js(
      'JSON.stringify(window.__director.engine.camera.position.toArray())'
    ));
    const andou = (a, b) =>
      Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / Math.hypot(...b);
    const cameraAntes = await ondeEstaACamera();
    await tocar();
    await sessao.assentar();
    const escolhido = await sessao.js(
      `(document.querySelector('[data-abre-dialogo="ficha"]') || {}).textContent || ''`
    );
    const cameraDoToque = await ondeEstaACamera();
    conferir(
      escolhido.includes(nome.nome) && andou(cameraDoToque, cameraAntes) < 1e-9,
      `o TOQUE ESCOLHE mesmo andando 12 px (o limiar de mouse é 6) e a câmera NÃO`
        + ` anda (zona morta do dedo): "${nome.nome}" (vizinho a ${nome.vizinho} px)`
        + ` → ficha "${escolhido || 'nenhuma'}", deslocamento`
        + ` ${andou(cameraDoToque, cameraAntes).toExponential(2)} do raio`
    );
    // O PAR, DO ZERO — e a página nova não é conforto: mergulhar no
    // objeto em que já se está é um NÃO-EVENTO, no dedo e no mouse
    // (medido nos dois em 23/08: com a estrela já focada, o duplo não
    // move a câmera um bit). É a mesma partida que a prova 7 usa para o
    // mouse. O veredito é a CÂMERA, e não o degrau: escolher uma
    // ESTRELA já põe o degrau em 'estrela' no primeiro toque, e o que o
    // mergulho faz é VOAR.
    await sessao.ir('atlas=1&jd=EPOCA&q=cinema');
    await sessao.assentar();
    nome = await esperarAlvoAssentar();
    if (!nome) {
      conferir(false, `toque duplo: ${NOME_DO_ALVO} sumiu depois do reset`);
    } else {
      const doZero = await ondeEstaACamera();
      // O PAR VAI NUMA FILA SÓ, e é o MESMO argumento do parágrafo acima
      // levado um nível adiante (item 85, 31/08). Ali o `await` entre os
      // três eventos de UM toque foi medido em 200 ms com a sessão
      // sozinha e mais de 500 com o navegador aquecido; entre os DOIS
      // toques do par ele continuava, e a janela do duplo é de 500 ms
      // (`JANELA_DO_DUPLO_MS`, `director/gestos.ts`). Nas corridas em que
      // a ida e volta estourava a janela o navegador entregava dois
      // toques SOLTOS, a câmera não ia a lugar nenhum e o juiz reprovava
      // um produto são — "andou 2.63e-16 do raio", que é zero. Seis
      // comandos numa fila só põem o par a microssegundos um do outro.
      await sessao.js(`(() => {
        window.__toquesDoPar = [];
        addEventListener('pointerup', () => window.__toquesDoPar.push(performance.now()), true);
        return true;
      })()`);
      await Promise.all([
        dedo('touchStart', [{ x: nome.x, y: nome.y, id: 1 }]),
        dedo('touchMove', [{ x: nome.x + 6, y: nome.y + 6, id: 1 }]),
        dedo('touchEnd', []),
        dedo('touchStart', [{ x: nome.x, y: nome.y, id: 1 }]),
        dedo('touchMove', [{ x: nome.x + 6, y: nome.y + 6, id: 1 }]),
        dedo('touchEnd', []),
      ]);
      // O INTERVALO DO PRÓPRIO GESTO, medido DENTRO da página. Ele entra
      // no veredito porque é ele que separa produto de instrumento: um
      // "andou zero" com o par a 3 ms é o produto; o mesmo zero com o par
      // a 600 ms é a prova não tendo entregado um duplo.
      const entreOsToques = JSON.parse(await sessao.js(
        `JSON.stringify((() => { const t = window.__toquesDoPar || [];
          return t.length >= 2 ? Math.round(t[1] - t[0]) : null; })())`
      ));
      // ESPERA DE ESTADO, não 1,5 s de parede: o veredito é "a câmera
      // FOI", então espera-se a câmera SAIR do lugar, e o quanto ela
      // demorou entra no veredito. O estouro não cala — sem deslocamento
      // o `andou` abaixo reprova do mesmo jeito.
      const msDoMergulho = await esperarPor(sessao, `(() => {
        const p = window.__director.engine.camera.position;
        return Math.hypot(p.x - (${doZero[0]}), p.y - (${doZero[1]}), p.z - (${doZero[2]}))
          / ${Math.hypot(...doZero)} > 1e-3; })()`, 6000);
      await sessao.assentar();
      const cameraDoDuplo = await ondeEstaACamera();
      conferir(
        andou(cameraDoDuplo, doZero) > 1e-3,
        `o TOQUE DUPLO VAI em ${NOME_DO_ALVO}: a câmera reposicionou (andou`
          + ` ${andou(cameraDoDuplo, doZero).toExponential(2)} do raio,`
          + ` degrau ${await sessao.js('window.__director.escadaViva.degrau')},`
          + ` par a ${entreOsToques === null ? '—' : `${entreOsToques} ms`} da janela de 500,`
          + ` mergulho em ${msDoMergulho === null ? 'ESTOURO de 6 s' : `${msDoMergulho} ms`})`
      );
    }
    }
  }

  // (c) A PINÇA — e daqui para baixo NÃO SE NAVEGA (ver a nota acima).
  await sessao.ir('atlas=1&foco=saturno&jd=EPOCA&q=cinema');
  await sessao.assentar();
  const CEU_Y = 180;
  const noPonto = await sessao.js(
    `(document.elementFromPoint(195, ${CEU_Y}) || {}).className || ''`
  );
  conferir(
    noPonto.includes('scene-canvas'),
    `pinça: o ponto (195, ${CEU_Y}) numa tela de 390×844 é CÉU e não painel`
      + ` (elemento: "${noPonto}")`
  );
  /**
   * DOIS DEDOS de `de` a `ate` pixels de distância, em 12 passos.
   *
   * `touchPoints` É A LISTA DO QUE CONTINUA ENCOSTADO, e não a do que
   * saiu. Soltar os dois com dois `touchEnd` de um ponto cada faz o
   * segundo dizer "agora só o dedo 2 está encostado" DEPOIS de o dedo 2
   * já ter saído — sequência impossível. O fecho correto é a lista com
   * o que sobra e, por fim, a lista VAZIA.
   */
  const pincar = async (de, ate) => {
    await dedo('touchStart', [
      { x: 195 - de / 2, y: CEU_Y, id: 1 }, { x: 195 + de / 2, y: CEU_Y, id: 2 }]);
    for (let k = 1; k <= 12; k++) {
      const d = de + ((ate - de) * k) / 12;
      await dedo('touchMove', [
        { x: 195 - d / 2, y: CEU_Y, id: 1 }, { x: 195 + d / 2, y: CEU_Y, id: 2 }]);
    }
    await dedo('touchEnd', [{ x: 195 - ate / 2, y: CEU_Y, id: 1 }]);
    await dedo('touchEnd', []);
  };
  const antesDaPincaDeDedo = await doZoom();
  await pincar(60, 240);
  const pincaDeDedoEm = await assentarZoom('a pinça de dois dedos');
  const depoisDeAfastar = await doZoom();
  conferir(
    depoisDeAfastar.dist < antesDaPincaDeDedo.dist
      && depoisDeAfastar.alvo === antesDaPincaDeDedo.alvo
      && depoisDeAfastar.foco === antesDaPincaDeDedo.foco
      && depoisDeAfastar.degrau === antesDaPincaDeDedo.degrau,
    `a PINÇA DE DOIS DEDOS aproxima e não troca o alvo:`
      + ` ${(antesDaPincaDeDedo.dist / antesDaPincaDeDedo.raio).toFixed(3)} →`
      + ` ${(depoisDeAfastar.dist / depoisDeAfastar.raio).toFixed(3)} raios`
      + ` (dedos 60→240 px), foco "${depoisDeAfastar.foco}", degrau`
      + ` ${depoisDeAfastar.degrau}, assentou em`
      + ` ${pincaDeDedoEm === null ? '—' : `${pincaDeDedoEm} ms`}`
  );
  await pincar(240, 60);
  await assentarZoom('a pinça ao contrário');
  const depoisDeAproximar = await doZoom();
  conferir(
    depoisDeAproximar.dist > depoisDeAfastar.dist
      && depoisDeAproximar.foco === antesDaPincaDeDedo.foco,
    `...e aproximar os dedos AFASTA, pelo mesmo caminho:`
      + ` ${(depoisDeAfastar.dist / depoisDeAfastar.raio).toFixed(3)} →`
      + ` ${(depoisDeAproximar.dist / depoisDeAproximar.raio).toFixed(3)} raios`
  );
  await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sessao.send('Emulation.clearDeviceMetricsOverride');
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nSMOKE DO ATLAS: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nSMOKE DO ATLAS: tudo verde\n');
