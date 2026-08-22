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
//  3. ABERTURA REPRODUZÍVEL. Entrar no Atlas a partir de t=10, t=100 e
//     t=250 tem de dar o MESMO md5: nenhum resíduo do trajeto pode
//     atravessar o portal. Foi esta trinca que denunciou a LUT do
//     raymarch herdada do voo.
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
import { abrirSessao, APP_PADRAO, dorme } from './chrome.mjs';

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
  // a prova 3 no cabeçalho). O `?jd=` tem precedência declarada sobre a
  // troca da coda — é a mesma porta que a prova 8 usa.
  const PIN_DO_TRIO = `${PIN}&jd=EPOCA`;
  const doAtlas = new Map();
  const relogios = new Map();
  for (const T of [10, 100, 250]) {
    await sessao.ir(`t=${T}&${PIN_DO_TRIO}`);
    const antesFase = await sessao.js('window.__director.captura.fase');
    const antesT = await sessao.js('window.__director.currentTime');
    const antes = await sessao.md5();
    conferir(antesFase === 'journey', `t=${T}: parte de 'journey' congelada em t=${antesT}`);

    await sessao.js('window.__director.entrarNoAtlas()');
    const dentro = await sessao.assentar();
    const faseDentro = await sessao.js('window.__director.captura.fase');
    const md5Atlas = await sessao.md5();
    doAtlas.set(T, md5Atlas);
    relogios.set(T, await sessao.js('window.__director.tempo.jd'));
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
  const vistas = [...new Set(doAtlas.values())];
  conferir(
    vistas.length === 1,
    `abertura reproduzível: ${[...doAtlas].map(([t, h]) => `t=${t} ${h}`).join(' · ')}`
  );

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
    daPorta === vistas[0],
    `a porta da abertura chega ao MESMO Atlas dos três cliques`
      + ` (${daPorta} vs ${vistas[0]})`
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
  const veu = "getComputedStyle(document.querySelector('.hud-root'))"
    + ".getPropertyValue('--veu-atlas').trim()";
  await sessao.ir('t=100&q=cinema');
  await sessao.js("[...document.querySelectorAll('.controls-bar button')]"
    + ".find((b) => b.innerText.toUpperCase().includes('ATLAS')).click()");
  await dorme(150);
  const meio = Number(await sessao.js(veu));
  conferir(meio > 0 && meio < 1, `o véu fecha por passos (medido em ${meio.toFixed(2)})`);
  await sessao.assentar();
  conferir(
    (await sessao.js('window.__director.captura.fase')) === 'atlas'
      && Number(await sessao.js(veu)) === 0,
    'o véu abre de volta e a fase é a nova — o portal não fica preso'
  );

  // ---- 7: a fundação da F3 — rótulos e clicar-para-enquadrar -------
  // O Atlas herdou o ramo de rótulos do voo livre, e o clique curto
  // passou a FOCAR em vez de voar. Sem esta prova, a busca da F3
  // nasceria sobre um pipeline que ninguém verificou estar de pé.
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
    await sessao.ir('atlas=1&q=cinema');
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
  const UA150 = 'pos=0,0,0.00072722&look=0,0,0&nobloom=1';
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

  // ---- 11: AS DOZE CAMADAS TROCAM SEM RECARREGAR --------------------
  // A régua do dono: nenhuma opção do painel de Ajustes recarrega a
  // página. Até 2026-08-12 três delas (nodisc/nogdust/noglow) recarregavam
  // por um comentário podre — "são lidas no bake" —, e este bloco julgava
  // justamente a recarga. Agora ele julga o contrário, e com quatro provas
  // por camada, todas no MESMO documento:
  //
  //   1. não houve navegação  — uma marca posta na `window` sobrevive;
  //   2. a cena reagiu        — `captura.quadros` volta a ZERO no mesmo
  //      tique do clique (o `perturbar()` do Director), lido dentro da
  //      MESMA avaliação para não haver corrida com o rAF;
  //   3. a URL espelha        — `replaceState`, como as vivas de sempre;
  //   4. o selo declara       — a camada desligada vira desvio de brilho.
  //
  // E de dentro do Atlas, que é onde uma recarga custa mais caro: modo,
  // instante do céu e alvo em quadro seguem no lugar por construção.
  await sessao.ir('atlas=1&jd=2465000&foco=hd48915&ajustes=1&q=cinema&shot=1');
  await sessao.js('window.__semRecarga = 1');
  const camadas = JSON.parse(await sessao.js(`JSON.stringify(
    [...document.querySelectorAll('[data-dialogo="ajustes"] .ajustes-check')]
      .map((e) => e.textContent.trim())
  )`));
  // 17 desde o item 33: as 13 de sempre mais as quatro que eram só-URL
  // (nosun/nodust/noco/noforge). Quem PINA o número contra a tabela
  // única é `atlasConfig.test.ts` (`CAMADAS.length`); aqui ele serve só
  // para o painel não deixar nenhuma de fora na hora de desenhar.
  conferir(camadas.length === 17, `o painel oferece ${camadas.length} camadas`);
  conferir(
    !camadas.some((n) => n.includes('↻')),
    `nenhuma marcada com ↻ (${camadas.join(' · ')})`
  );

  // o clique e as leituras na MESMA avaliação: `input.click()` dispara o
  // onChange do React sincronamente, então `captura.quadros` já é o de
  // DEPOIS do perturbar() quando esta função retorna
  const trocar = (indice) => sessao.js(`(() => {
    const l = document.querySelectorAll('[data-dialogo="ajustes"] .ajustes-check')[${indice}];
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
    `as ${vivas} de ${camadas.length} camadas do painel trocam sem reload`
  );

  await sessao.assentar();
  const depoisDaCamada = await sessao.js(`JSON.stringify({
    url: location.search,
    fase: window.__director.captura.fase,
    jd: window.__director.tempo.jd,
    foco: (document.querySelector('.atlas-contexto-nome') || {}).textContent || '',
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
      foco: (document.querySelector('.atlas-contexto-nome') || {}).textContent || '',
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
  await sessao.js('window.__marcaAuto = 1');
  await clicarTier('auto');
  // uma JANELA DE MEDIDA inteira (2,5 s) mais folga: escolher Auto só
  // vira tier depois de EXISTIR uma sugestão, e é a primeira janela que
  // a produz — sem a espera, a prova cobraria o Auto por não ter
  // aplicado uma medida que ainda não havia.
  //
  // O que NÃO se espera aqui é o mostrador: desde 22/08 (item 66) o
  // `?shot=` congela a nota em "medindo o quadro." de propósito. O
  // número é medida VIVA, muda de boot para boot, e entrava na tela ~50
  // quadros depois do `pronto` — toda foto de HUD carregava um dígito
  // que ninguém controla, e era isso que fazia a prova 13 reprovar uma
  // vez a cada ~100. Quem traz o número é
  // `window.__director.engine.medicao`, lido abaixo, que o modo foto
  // não congela: a régua corre, só o mostrador para.
  await dorme(3200);
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
    noAuto.medicao === null || noAuto.medicao.sugestao === noAuto.tier,
    `e o Auto não fica parado contra a medição (tier '${noAuto.tier}', medida`
      + ` ${noAuto.medicao ? `${noAuto.medicao.fps.toFixed(1)} q/s → '${noAuto.medicao.sugestao}'` : 'recomeçando'})`
  );

  // A FRONTEIRA POLÍTICA, no navegador: em MANUAL a medição pode gritar
  // o que quiser — o tier não anda. O tier escolhido é `performance` e a
  // espera passa dos 15 s da anti-vaivém DE PROPÓSITO: é só depois dela
  // que a medida no teto do monitor passa a sugerir SUBIR, ou seja, é aí
  // que existe uma sugestão para o manual resistir. Medido nesta
  // bancada: a 60 q/s a sugestão vira 'alta' na 6ª janela (~15,6 s).
  // Numa máquina que não chega ao teto a sugestão fica igual ao vivo e a
  // prova enfraquece (o tier segue o mesmo, que é o que se cobra) — o
  // log diz qual dos dois casos aconteceu.
  const ESPERA_DO_MANUAL_MS = 18000;
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
  // a inércia é curta (meia-vida 87 ms, zona morta em ~0,5 s): esperar
  // por ela é esperar o gesto acabar, não uma trava de produto
  const estalo = async (deltaY, ctrlKey = false) => {
    await rodar(deltaY, ctrlKey);
    await dorme(600);
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
  await dorme(900);
  noPiso = await doZoom();
  conferir(
    Math.abs(noPiso.dist / noPiso.piso - 1) < 1e-9 && noPiso.foco === zoomInicio.foco,
    `o PISO segura em ${(noPiso.dist / (noPiso.piso / 2)).toFixed(4)} raios físicos do alvo`
      + ` (K_MIN = 2,0; ${(noPiso.dist / 4.84813681e-6 * 1.495978707e8).toFixed(0)} km)`
  );

  // O TETO: o sistema em quadro, centrado no alvo
  for (let i = 0; i < 90; i++) await rodar(100);
  await dorme(900);
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
    Math.abs(Math.log10(noTeto.teto / noPiso.piso) - 5.55) < 0.05,
    `a faixa inteira do alvo tem ${Math.log10(noTeto.teto / noPiso.piso).toFixed(2)} décadas`
      + ` — as ~50 estaladas de ponta a ponta que o passo em log promete`
  );

  // a PINÇA do trackpad é o mesmo `wheel` com `ctrlKey`, e sem limiar
  // nenhum: eventos pequenos viram fração de estalo e a câmera anda
  const antesDaPinca = await doZoom();
  for (let i = 0; i < 4; i++) await rodar(-30, true);
  await dorme(600);
  const depoisDaPinca = await doZoom();
  conferir(
    depoisDaPinca.dist < antesDaPinca.dist && depoisDaPinca.foco === zoomInicio.foco,
    `a pinça (ctrlKey) faz o mesmo, em fração de estalo`
      + ` (${(antesDaPinca.dist / antesDaPinca.raio).toFixed(3)} →`
      + ` ${(depoisDaPinca.dist / depoisDaPinca.raio).toFixed(3)} raios)`
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
  await dorme(800);
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

  // ---- 15c: OS NOMES DA ABERTURA (item 73, plano §3) ---------------
  // A segunda coisa que o dono pediu, com as palavras dele:
  // *"conseguíamos ver os rótulos de todos objetos de forma
  // inteligente"*. A medida de antes desta obra: 38 projetados → 7
  // desenhados → TRÊS corpos com nome (Sol, Netuno, Plutão). Os quatro
  // planetas internos projetam a menos de 6 px do Sol e perdiam a vaga
  // para ele; Saturno perdia para Júpiter.
  //
  // A promessa é contada em CORPOS COM NOME, não em rótulos desenhados:
  // quantas estrelas cabem depende do céu daquela data, e o que o dono
  // pediu foi ver os objetos do sistema.
  await sessao.ir('atlas=1&q=cinema');
  await sessao.assentar();
  // a capa da abertura cobre a cena por alguns segundos DEPOIS de a
  // prontidão fechar (ver o NORTE, "Como rodar") — e é o desenho dos
  // rótulos que se mede aqui, não a prontidão
  await dorme(4000);
  const nomesDaAbertura = JSON.parse(await sessao.js(`JSON.stringify((() => {
    const alvos = window.__director.rotulos.alvos;
    return {
      projetados: alvos.length,
      desenhados: alvos.filter((l) => l.desenhado === true).length,
      corpos: alvos.filter((l) => l.desenhado === true && l.key.startsWith('corpo:'))
        .map((l) => l.key.slice(6)),
      luasAcesas: alvos.filter((l) => l.desenhado === true && l.opacity > 0.08
        && ['moon','titan','io','europa','ganymede','callisto'].includes(l.key.slice(6))).length,
    };
  })())`));
  const OITO_PLANETAS = [
    'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
  ];
  const faltando = OITO_PLANETAS.filter((p) => !nomesDaAbertura.corpos.includes(p));
  conferir(
    faltando.length === 0 && nomesDaAbertura.corpos.includes('sun'),
    `na abertura os 8 planetas e o Sol têm nome — ${nomesDaAbertura.corpos.length}`
      + ` corpos de ${nomesDaAbertura.projetados} projetados`
      + ` (${nomesDaAbertura.corpos.join(', ')})`
      + (faltando.length ? ` · FALTAM ${faltando.join(', ')}` : '')
  );
  conferir(
    nomesDaAbertura.luasAcesas === 0,
    `...e nenhuma LUA acende colada no pai: elas esmaecem por separação`
      + ` na tela (${nomesDaAbertura.luasAcesas} acesas)`
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
  await dorme(2000);
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
    `a 115,7 dias/s o alvo andou ${(andou / 4.84813681e-6).toFixed(2)} UA em 2 s —`
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
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nSMOKE DO ATLAS: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nSMOKE DO ATLAS: tudo verde\n');
