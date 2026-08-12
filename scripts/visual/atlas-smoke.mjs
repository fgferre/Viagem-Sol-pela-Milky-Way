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

  // A BARRA DO TEMPO NÃO VAZA NO ?shot=2 (invariante arq#14 da onda): o
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
  const gritos = sessao.gritos();
  conferir(
    gritos.length === 0,
    `sem rede, ZERO grito de console (${gritos.join(' | ') || 'nenhum'})`
  );
  await sessao.bloquear([]);

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
