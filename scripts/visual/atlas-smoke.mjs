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
//  3. SOL REPRODUZÍVEL. Entrar no Atlas a partir de t=10 e a partir de
//     t=250 tem de dar o MESMO md5. A dramaturgia do ciclo solar é
//     monótona em `journeyT`; sem o pino do Atlas cada entrada daria um
//     Sol diferente e nenhuma vista do modo seria reproduzível.
//
// Método herdado do `ab-identidade`: `?q=cinema` pinado (senão o
// autoQuality troca o tier no meio da espera), `?shot=2` (só a cena),
// e o SINAL de prontidão do próprio app no lugar de espera cega.
import { abrirSessao, APP_PADRAO } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const PIN = 'shot=2&q=cinema';
const JANELA = process.env.JANELA || '1200x900';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  // ---- 1, 2 e 3: ida e volta, prontidão, e o Sol reproduzível ------
  // Os DOIS instantes não são redundância: t=10 deixa a câmera do filme
  // ainda dentro dos 2 pc de casa (o raio em que a LUT do raymarch se
  // reusa) e t=250 a deixa a 20 kpc. Foi essa dupla que denunciou a LUT
  // herdada do trajeto — com um instante só, o gate passava mentindo.
  const doAtlas = new Map();
  for (const T of [10, 100, 250]) {
    await sessao.ir(`t=${T}&${PIN}`);
    const antesFase = await sessao.js('window.__director.captura.fase');
    const antesT = await sessao.js('window.__director.currentTime');
    const antes = await sessao.md5();
    conferir(antesFase === 'journey', `t=${T}: parte de 'journey' congelada em t=${antesT}`);

    await sessao.js('window.__director.entrarNoAtlas()');
    const dentro = await sessao.assentar();
    const faseDentro = await sessao.js('window.__director.captura.fase');
    const md5Atlas = await sessao.md5();
    doAtlas.set(T, md5Atlas);
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
  const vistas = [...new Set(doAtlas.values())];
  conferir(
    vistas.length === 1,
    `Sol reproduzível: ${[...doAtlas].map(([t, h]) => `t=${t} ${h}`).join(' · ')}`
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
  await sleep(150);
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
    const antesDoClique = await sessao.js('window.__director.engine.camera.position.toArray().join()');
    await sessao.clicar(tinta.x, tinta.y);
    await sessao.assentar();
    const depoisDoClique = await sessao.js('window.__director.engine.camera.position.toArray().join()');
    conferir(
      antesDoClique !== depoisDoClique
        && (await sessao.js('window.__director.captura.fase')) === 'atlas',
      'clicar num nome ENQUADRA sem sair da fase (a câmera reposicionou)'
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
  await sleep(300);
  const vivo = JSON.parse(await relogio());
  conferir(vivo.aoVivo === true, `AO VIVO liga o relógio do calendário (${vivo.data})`);
  // ⏸ com AO VIVO ligado: o botão está habilitado e promete "Parar o
  // tempo". Enquanto `andarNoTempo(0)` não desligava o AO VIVO, ele
  // apagava o sentido (que já era zero) e a data seguia andando a 1 Hz.
  await apertar('Parar o tempo');
  await sleep(200);
  const parado = JSON.parse(await relogio());
  await sleep(1600);
  const aindaParado = JSON.parse(await relogio());
  conferir(
    parado.aoVivo === false && parado.sentido === 0 && aindaParado.jd === parado.jd,
    `⏸ com AO VIVO ligado PARA de verdade (aoVivo=${parado.aoVivo},`
      + ` jd ${parado.jd} → ${aindaParado.jd} em 1,6 s)`
  );

  // E "Partir" leva o relógio junto: o filme não tem dono para ele.
  await sessao.ir('t=100&q=cinema&shot=1');
  await sessao.js('window.__director.entrarNoAtlas({ instantaneo: true })');
  await sleep(200);
  await apertar('Avançar no tempo');
  await sleep(300);
  const andando = JSON.parse(await relogio());
  await sessao.js('window.__director.partirDoAtlas()');
  await sessao.assentar();
  const noFilme = JSON.parse(await relogio());
  await sleep(1200);
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
  // 13 desde a Onda 6/F0: o palco dos corpos resolvidos ('nocorpos')
  // entrou na tabela única (atlasConfig.CAMADAS) — e este juiz descobriu
  // na F2a que estava com a lista manual envelhecida (a mesma classe de
  // defeito que o selo existe para não ter).
  conferir(camadas.length === 13, `o painel oferece ${camadas.length} camadas`);
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

  const FLAGS = [
    'nogal', 'nodisc', 'nogdust', 'noglow', 'nocart', 'nonebula',
    'nowrap', 'nocat', 'noclarao', 'nomarker', 'noplan', 'nocorpos', 'nobh',
  ];
  let vivas = 0;
  for (let i = 0; i < FLAGS.length; i++) {
    const flag = FLAGS[i];
    // assentar ANTES de cada clique: é o que dá sentido ao `antes >= 10`
    // — a cena estava parada e o clique é quem a perturbou
    await sessao.assentar();
    const off = JSON.parse(await trocar(i));
    await sessao.assentar();
    const on = JSON.parse(await trocar(i));
    const ok =
      !off.recarregou && !on.recarregou
      && off.antes >= 10 && on.antes >= 10 && off.depois === 0 && on.depois === 0
      && off.marcado === false && on.marcado === true
      && off.url.includes(`${flag}=1`) && !on.url.includes(`${flag}=1`)
      && off.escondidas.includes(flag) && !on.escondidas.includes(flag);
    if (ok) vivas++;
    conferir(
      ok,
      `${flag} (${off.nome}) troca AO VIVO: sem navegação, quadros ${off.antes}→0,`
        + ` url '${off.url}', selo [${off.escondidas.join(',')}] e volta`
    );
  }
  conferir(vivas === 13, `as ${vivas} de 13 camadas do painel trocam sem reload`);

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
  // `t=293` é a vista de fora (a `faceon` da leva oficial): é a única em
  // que as três TÊM efeito — lâminas do disco, bojo e extinção por
  // partícula só pintam com a galáxia inteira em quadro. Por isso o
  // terceiro veredito: md5 vivo ≠ md5 limpo, senão o teste passaria
  // comparando duas imagens que ninguém mudou.
  for (const flag of ['nodisc', 'nogdust', 'noglow']) {
    await sessao.ir(`t=293&${PIN}&${flag}=1`);
    const noBoot = await sessao.md5();
    await sessao.ir(`t=293&${PIN}`);
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

  await sessao.ir('t=293&ajustes=1&q=cinema&shot=1');
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

  // ---- 14: escolha manual de qualidade grava ?q=, cinema inclusive --
  // Tom e exposição podem omitir o padrão porque o padrão deles é
  // CONSTANTE; o de qualidade não é — sem `?q=` quem decide na recarga é
  // o storage (`tierQueRodou`, alocação medida) ou a detecção. Apagando o
  // parâmetro no clique em Cinema, um `alta` medido na visita passada
  // sobrepunha a escolha do visitante.
  await sessao.ir('t=100&ajustes=1&q=alta&shot=1');
  await sessao.js('window.__marcaQ = 1');
  await sessao.js(`(() => [...document.querySelectorAll('[data-dialogo="ajustes"] button')]
    .find((b) => b.textContent.trim() === 'cinema').click())()`);
  // a recarga destrói o contexto de JS no meio do caminho: perguntar
  // durante a troca ERRA, e é por isso que a espera engole o erro em vez
  // de morrer nele. O documento novo se anuncia pela marca que sumiu.
  for (let i = 0; i < 100; i++) {
    const pronta = await sessao
      .js('String(window.__marcaQ) + "|" + (window.__director ? 1 : 0)')
      .catch(() => '');
    if (pronta === 'undefined|1') break;
    await sleep(200);
  }
  await sessao.assentar();
  const depoisDoTier = JSON.parse(await sessao.js(`JSON.stringify({
    url: location.search, tier: window.__director.captura.tier, marca: window.__marcaQ })`));
  conferir(
    depoisDoTier.url.includes('q=cinema') && depoisDoTier.tier === 'cinema'
      && depoisDoTier.marca === undefined,
    `clicar em Cinema grava ?q=cinema na URL (tier '${depoisDoTier.tier}',`
      + ` url '${depoisDoTier.url}')`
  );


  // ---- 15: A RODA E A PINÇA MOVEM A ESCADA (Onda 7) ----------------
  // A bancada de `rodaDaEscada.test.ts` prova a tradução de pixels em
  // degrau; o que ela NÃO pode provar é que o evento do navegador chega
  // — que o listener está no elemento certo, que a fase o aceita e que
  // o degrau realmente muda. Era exatamente esse o defeito original: a
  // lógica do voo livre existia e o Atlas nunca a via.
  await sessao.ir('atlas=1&q=cinema&shot=1');
  const degrauVivo = () => sessao.js('window.__director.escadaViva.degrau');
  const rodar = (deltaY, ctrlKey = false) =>
    sessao.js(`(() => document.querySelector('canvas').dispatchEvent(
      new WheelEvent('wheel', { deltaY: ${deltaY}, deltaMode: 0,
        ctrlKey: ${ctrlKey}, bubbles: true, cancelable: true })))()`);
  const descer = [];
  for (let i = 0; i < 4; i++) {
    await rodar(-120);
    // a trava de 300 ms é do produto: sem esperar por ela o gesto
    // seguinte é engolido de propósito
    await sleep(400);
    descer.push(await degrauVivo());
  }
  conferir(
    descer.join(' → ') === 'orbita → corpo → lua → lua',
    `a roda DESCE a escada e para no piso: sistema → ${descer.join(' → ')}`
  );
  await rodar(120);
  await sleep(400);
  const subiu = await degrauVivo();
  conferir(subiu === 'corpo', `e SOBE de volta um degrau por vez (lua → ${subiu})`);
  // a PINÇA do trackpad é o mesmo `wheel` com `ctrlKey`, em eventos
  // pequenos que somam até o limiar
  await rodar(-30, true);
  await rodar(-30, true);
  await sleep(400);
  const pincou = await degrauVivo();
  conferir(pincou === 'lua', `a pinça (ctrlKey) faz o mesmo (corpo → ${pincou})`);
  // e o gesto NÃO rola a página nem deixa o navegador dar zoom: o
  // `preventDefault` só é aceito porque o listener é `passive: false`
  const engoliu = await sessao.js(`(() => {
    const e = new WheelEvent('wheel', { deltaY: -120, deltaMode: 0,
      bubbles: true, cancelable: true });
    document.querySelector('canvas').dispatchEvent(e);
    return String(e.defaultPrevented);
  })()`);
  conferir(engoliu === 'true', `e a rolagem da página morre no canvas (defaultPrevented=${engoliu})`);

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
  await sleep(2000);
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
  await sleep(150);
  conferir(
    (await sessao.js('window.__director.captura.fase')) === 'atlas'
      && Number(await sessao.js(veu)) === 0,
    'reduced-motion: a troca é instantânea e o véu nunca acende'
  );
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nSMOKE DO ATLAS: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nSMOKE DO ATLAS: tudo verde\n');
