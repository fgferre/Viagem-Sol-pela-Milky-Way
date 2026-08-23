// O JUIZ DO HUD DO CELULAR (item 62) — a perna de aparelho do `a11y.mjs`.
//
//   não se roda sozinho: quem o chama é `scripts/visual/a11y.mjs`
//
// POR QUE UM ARQUIVO. Esta perna nasceu dentro do `a11y.mjs` e o levou de
// 1.810 a 2.517 linhas — 546 delas em `julgarCelular`, com seis partes
// próprias, constantes próprias e um medidor próprio. Isso é um juiz
// dentro de um juiz, e o §11 do AGENTS diz o que fazer com um arquivo que
// acumulou assuntos: dividir na primeira mudança que o tocar, MOVENDO e
// não reescrevendo. As seis partes, os dois aparelhos, a leitura de tela
// e o vestir/despir do aparelho vieram inteiros, linha a linha.
//
// AS FERRAMENTAS COMUNS ENTRAM PELA PORTA (`conferir`, `medirCobertura` e
// o `PIN`), em vez de serem importadas de volta do `a11y.mjs`. O motivo é
// mecânico e não de gosto: o corpo do `a11y.mjs` RODA O JUIZ INTEIRO —
// importar dele criaria um ciclo cuja outra ponta é uma sessão de Chrome,
// e quem abrisse este arquivo direto rodaria o juiz completo sem pedir.
// `medirCobertura` e o `bate()` continuam existindo em UM lugar só, que
// era a condição da divisão.
//
// O CENSO CONTINUA UM, porque a corrida continua uma: os 301 vereditos da
// perna do celular somam-se aos 238 do resto no mesmo `a11y`, e o preço
// (6,1 min) é o da sessão única — dividir a CHAMADA em duas custaria dois
// boots de Chrome para medir a mesma coisa.
import { dorme } from './chrome.mjs';

/** os aparelhos que este juiz abre — o comum e o pequeno */
const APARELHOS = [[390, 844], [320, 568]];

/** a fileira do pé, na ordem do mockup; a ficha é a quinta, com seleção */
const ALCAS_SEM_SELECAO = ['busca', 'camadas', 'tempo', 'ajustes'];
const ALCAS_COM_SELECAO = [...ALCAS_SEM_SELECAO, 'ficha'];

/**
 * O QUE A TELA DO TELEFONE DIZ DE SI — uma leitura só, porque as
 * promessas são geométricas e têm de ser medidas no MESMO instante.
 */
const MEDIR_CELULAR = `(() => {
  const W = innerWidth, H = innerHeight;
  const cx = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, w: b.width, h: b.height };
  };
  const bate = (p, q) => Boolean(p && q && p.x < q.x + q.w && q.x < p.x + p.w
    && p.y < q.y + q.h && q.y < p.y + p.h);
  const fileira = document.querySelector('.atlas-alcas');
  const botoes = fileira ? [...fileira.querySelectorAll(':scope > .hud-btn')] : [];
  const alcas = botoes.map((b) => {
    const r = b.getBoundingClientRect();
    return {
      nome: b.getAttribute('data-abre-dialogo'),
      rotulo: b.textContent.trim(),
      topo: Math.round(r.top),
      alto: r.height,
    };
  });
  const linhas = new Set(alcas.map((a) => a.topo));
  const selo = cx('.atlas-selo');
  const caixaDaFileira = cx('.atlas-alcas');
  const seletor = document.querySelector('.controls-bar select');
  // A BARRA DE CIMA, e não um botão pelo NOME (item 61, 23/08). Ela
  // guardava o literal 'Partir', e o que importa nunca foi o rótulo: é a
  // BARRA que tem de estar ancorada na tarja, porque é a altura dela que
  // entra na base declarada do retângulo útil. Desde o item 61 ela pode
  // ter três botões (▶ Ver o filme · ↗ Explorar · ↩ Voltar ao filme), e
  // o último só existe com filme guardado — cobrar um nome era cobrar
  // uma composição, e a composição mudou.
  const barra = document.querySelector('.controls-bar');
  const tarja = cx('.letterbox.top');
  return {
    W, H,
    alcas,
    linhas: linhas.size,
    fileira: caixaDaFileira,
    // quanto a fileira MEDE por dentro: maior que a caixa = ela rola
    fileiraConteudo: fileira ? fileira.scrollWidth : null,
    // a alça ABERTA está visível dentro da fileira? (a fileira rola, e a
    // ficha — que abre sozinha — é a quinta, que nasce fora do quadro)
    alcaAbertaVisivel: (() => {
      const b = fileira && fileira.querySelector('[aria-expanded="true"]');
      if (!b || !caixaDaFileira) return null;
      const r = b.getBoundingClientRect();
      return r.left >= caixaDaFileira.x - 0.5
        && r.right <= caixaDaFileira.x + caixaDaFileira.w + 0.5;
    })(),
    dentro: Boolean(caixaDaFileira && caixaDaFileira.x >= -0.5
      && caixaDaFileira.x + caixaDaFileira.w <= W + 0.5
      && caixaDaFileira.y + caixaDaFileira.h <= H + 0.5),
    selo,
    cobreSelo: bate(caixaDaFileira, selo),
    // a máquina do tempo PERMANENTE do rodapé; a de dentro da gaveta é outra
    tempoNoRodape: cx('.atlas-rodape .atlas-tempo'),
    seletorVisivel: Boolean(seletor && seletor.getClientRects().length > 0),
    barraNaTarja: Boolean(barra && tarja
      && barra.getBoundingClientRect().top < tarja.h + 1),
    // ...e ela é UMA linha: duas cresceriam a base declarada em silêncio
    // só o que está DESENHADO: o seletor de qualidade continua no DOM
    // apagado por CSS (é duplicata do painel), e contá-lo daria uma
    // segunda "linha" no topo da tela que ninguém vê
    barraLinhas: barra
      ? new Set([...barra.querySelectorAll('.hud-btn')]
        .filter((b) => b.getClientRects().length > 0)
        .map((b) => Math.round(b.getBoundingClientRect().top))).size
      : 0,
    barraRotulos: barra
      ? [...barra.querySelectorAll('.hud-btn')]
        .filter((b) => b.getClientRects().length > 0)
        .map((b) => b.textContent.trim())
      : [],
    dicaFora: (() => {
      const d = document.querySelector('.atlas-rodape .free-hint');
      return d ? getComputedStyle(d).position : null;
    })(),
    dialogos: [...document.querySelectorAll('[data-dialogo]')]
      .map((d) => d.getAttribute('data-dialogo')),
    folha: cx('[data-dialogo]'),
    folhaCobreSelo: bate(cx('[data-dialogo]'), selo),
    folhaCobreAlca: bate(cx('[data-dialogo]'), caixaDaFileira),
    folhaPct: (() => {
      const f = cx('[data-dialogo]');
      return f ? (f.w * f.h) / (W * H) * 100 : null;
    })(),
    folhaDentro: (() => {
      const f = cx('[data-dialogo]');
      return Boolean(f && f.x >= -0.5 && f.y >= -0.5 && f.x + f.w <= W + 0.5
        && f.y + f.h <= H + 0.5);
    })(),
  };
})()`;

// ============================================================
// O HUD DO CELULAR (item 62, 23/08) — a perna que NENHUM juiz tinha.
//
// Até aqui a casa media telefone em UM lugar só: `julgarAreaDaFicha`, que
// abre 390 e 320 px para conferir a ÁREA de um diálogo. Nada abria o modo
// inteiro num aparelho, e o pedido do dono é justamente o modo inteiro:
// *"podemos criar alternativas de controle menores e escondidos que
// expandam para celular"*.
//
// A EMULAÇÃO É DE APARELHO, e não de janela estreita: `mobile: true` no
// override de métricas (que é o que faz o `width=device-width` do
// `index.html` valer) e `setTouchEmulationEnabled` com cinco dedos. Uma
// janela de 390 px num Chrome de mesa continua sendo mesa para tudo que
// pergunte por toque, e o item 62 mexe justamente nos alvos de toque.
//
// A CONTA DE NAVEGAÇÕES É DESENHO, não pressa. Trocar o tamanho da tela
// NÃO exige recarregar — quem responde é o `matchMedia` do `useCelular`,
// e medir os dois aparelhos na mesma página é, de quebra, a prova de que
// o ouvinte existe (sem ele o HUD ficaria congelado no tamanho do boot).
// Só o `?ui=` exige navegação, porque a escala é lida da URL no boot.
// ============================================================

/** liga (ou desliga) o aparelho: métricas de celular e dedos de verdade */
async function vestirAparelho(s, w, h) {
  await s.send('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: 1, mobile: true,
  });
  await s.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
}

async function despirAparelho(s) {
  await s.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await s.send('Emulation.clearDeviceMetricsOverride');
}

/**
 * PARTE 1 — A FILEIRA EXISTE, E É UMA LINHA SÓ.
 *
 * As promessas, e cada uma responde a uma decisão escrita do item 62:
 *  1. QUATRO ALÇAS sem seleção e CINCO com — a ficha só se oferece quando
 *     há alvo, porque botão que não faz nada é pior que botão nenhum;
 *  2. TODAS SE DECLARAM (`data-abre-dialogo`), na ordem do mockup: sem
 *     isso o contrato do `dialogFocus` não as alcança e nenhuma das
 *     quatro promessas de diálogo pode ser cobrada;
 *  3. UMA LINHA SÓ. Duas linhas mudariam a altura da base declarada e
 *     MOVERIAM A CÂMERA no meio da sessão (a lição da `.free-hint`);
 *  4. O ALVO DE TOQUE de cada alça — 44 px no tamanho de fábrica, o
 *     mínimo que as duas plataformas pedem, e ele acompanha o `?ui=`;
 *  5. A FILEIRA NÃO COBRE O SELO, o mesmo `bate()` de `julgarAreaDaFicha`;
 *  6. A MÁQUINA DO TEMPO permanente saiu do rodapé (virou a alça ⏱) e o
 *     `<select>` de qualidade saiu da barra (é duplicata do painel);
 *  7. O "PARTIR" está na TARJA de cima — com ele lá, o topo do retângulo
 *     útil volta a ser a tarja;
 *  8. A DICA está FORA DO FLUXO, que é o que a deixa apagar sem dar pulo.
 */
export async function julgarCelular(s, { conferir, medirCobertura, PIN }) {
  const ALVO_DE_TOQUE_PX = 44;

  // ---- PARTE 0: O CONVITE, QUE AGORA ABRE NO TELEFONE --------------
  // Até 2026-08-23 o convite do Atlas era PULADO em `pointer: coarse`, e
  // a razão escrita era verdadeira: "o gesto do meio é a RODA, que não
  // existe em tela de toque". Com a PINÇA existindo ela deixou de ser, e
  // o modo passa a se apresentar a quem chega de telefone. Os quatro
  // passos falam a língua do dedo, e cada um aponta um pedaço REAL da
  // dica do rodapé — que também trocou de gestos.
  //
  // ELE VEM PRIMEIRO de propósito: o convite abre na PRIMEIRA entrada, e
  // as partes 1 a 5 medem o estado de regime. Fechá-lo aqui com o
  // "entendi" grava `conviteAtlasVisto` e tira-o do caminho delas; no
  // fim da função o storage é limpo, porque o juiz do convite de MESA
  // (mais abaixo) precisa de uma primeira entrada de novo.
  await vestirAparelho(s, ...APARELHOS[0]);
  await s.js("window.localStorage.removeItem('viagem-prefs')");
  await s.ir(`atlas=1&${PIN}`);
  await dorme(300);
  const passos = [];
  for (let i = 0; i < 4; i++) {
    passos.push(JSON.parse(await s.js(`JSON.stringify({
      texto: (document.querySelector('.convite-texto') || {}).innerText || '',
      conta: (document.querySelector('.convite-conta') || {}).innerText || '',
      alvo: (() => {
        const r = [...document.querySelectorAll('.spotlight-mascara rect')]
          .map((n) => Number(n.getAttribute('width')))
          .find((w) => Number.isFinite(w) && w > 0 && w < innerWidth);
        return r ?? null;
      })(),
    })`)));
    await s.js(`(() => { const b = [...document.querySelectorAll('.convite-linha button')]
      .find((x) => /continuar|entendi/.test(x.textContent.trim())); if (b) b.click(); })()`);
    await dorme(150);
  }
  const dicaDeToque = await s.js(
    "(document.querySelector('.atlas-rodape .free-hint') || {}).textContent || ''"
  );
  conferir(
    passos.every((p) => p.texto && p.alvo !== null),
    `convite no telefone: os 4 passos abrem e cada um FURA um pedaço da dica —`
      + ` ${passos.map((p) => `${p.conta.trim()}:${p.alvo}px`).join(' · ')}`
  );
  conferir(
    /pinça/i.test(passos[1].texto) && /toque num nome/i.test(passos[2].texto)
      && /duas vezes/i.test(passos[3].texto),
    `convite no telefone: os gestos são os do DEDO — "${passos.map((p) => p.texto).join('" · "')}"`
  );
  conferir(
    /pinça — zoom/.test(dicaDeToque) && /toque duplo — ir/.test(dicaDeToque)
      // os dois gestos que NÃO existem no aparelho: a roda e a tecla.
      // (`esc — voltar` inteiro, e não só "esc": "escolher" tem as três
      // letras dentro, e a primeira versão desta linha reprovou por isso)
      && !/roda/.test(dicaDeToque) && !/esc —/.test(dicaDeToque),
    `dica no telefone: a roda e o Esc saem, a pinça e o toque duplo entram —`
      + ` "${dicaDeToque}"`
  );
  conferir(
    (await s.js("!!document.querySelector('.spotlight')")) === false,
    'convite no telefone: o "entendi" fecha, e as partes seguintes medem o regime'
  );

  for (const fator of [0.85, 1, 1.4]) {
    for (const [query, esperadas] of [
      ['atlas=1', ALCAS_SEM_SELECAO],
      ['foco=marte', ALCAS_COM_SELECAO],
    ]) {
      await vestirAparelho(s, ...APARELHOS[0]);
      await s.ir(`${query}&ui=${fator}&${PIN}`);
      for (const [w, h] of APARELHOS) {
        await vestirAparelho(s, w, h);
        await dorme(200);
        const m = await s.js(MEDIR_CELULAR);
        const onde = `${w}×${h}, ui = ${fator}, ${esperadas.length === 5 ? 'com' : 'sem'} seleção`;
        conferir(
          JSON.stringify(m.alcas.map((a) => a.nome)) === JSON.stringify(esperadas),
          `alças (${onde}): ${m.alcas.length} na fileira, na ordem do mockup`
            + ` — ${m.alcas.map((a) => a.rotulo).join(' · ') || 'NENHUMA'}`
        );
        conferir(
          m.alcas.length > 0 && m.alcas.every((a) => a.nome),
          `alças (${onde}): todas se declaram com data-abre-dialogo`
        );
        conferir(
          m.linhas === 1 && m.dentro,
          `alças (${onde}): UMA linha só e dentro da tela — ${m.linhas} linha(s),`
            + ` fileira [${m.fileira ? [m.fileira.x | 0, m.fileira.y | 0, m.fileira.w | 0, m.fileira.h | 0].join(',') : 'ausente'}]`
        );
        const menor = Math.min(...m.alcas.map((a) => a.alto));
        conferir(
          menor >= ALVO_DE_TOQUE_PX * fator - 0.5,
          `alças (${onde}): a menor mede ${menor.toFixed(1)} px de alto ≥ alvo de toque`
            + ` ${(ALVO_DE_TOQUE_PX * fator).toFixed(1)} px`
        );
        conferir(
          m.selo !== null && !m.cobreSelo,
          `alças (${onde}): a fileira NÃO cobre o selo — selo`
            + ` [${m.selo ? [m.selo.x | 0, m.selo.y | 0, m.selo.w | 0, m.selo.h | 0].join(',') : 'ausente'}]`
        );
        conferir(
          m.tempoNoRodape === null || m.tempoNoRodape.h === 0,
          `alças (${onde}): a máquina do tempo saiu do rodapé — ela é a alça ⏱`
        );
        conferir(
          !m.seletorVisivel,
          `alças (${onde}): o <select> de qualidade saiu da barra — é duplicata do painel`
        );
        conferir(
          m.barraNaTarja && m.barraLinhas === 1,
          `alças (${onde}): a barra de cima está ancorada na TARJA e é UMA linha`
            + ` (${m.barraLinhas} linha(s): ${m.barraRotulos.join(' · ') || 'vazia'})`
            + ` — o topo do retângulo útil volta a ser a tarja, e a altura dela`
            + ` é base declarada`
        );
        conferir(
          m.dicaFora === 'absolute',
          `alças (${onde}): a dica está FORA DO FLUXO (position: ${m.dicaFora}) —`
            + ` apagá-la não move a câmera`
        );
        // O ESTADO DE SEMPRE CABE INTEIRO. A fileira ROLA de propósito —
        // é a saída certa para a QUINTA alça e para o texto grande —,
        // mas a primeira tela que o visitante vê tem QUATRO alças num
        // aparelho comum no tamanho de fábrica, e ali nada pode nascer
        // cortado pela borda. Medido: eram 414 px de conteúdo em 390 de
        // tela, com o ⚙ Ajustes pela metade.
        if (w === 390 && fator === 1 && esperadas.length === 4) {
          conferir(
            m.fileiraConteudo <= m.fileira.w + 0.5,
            `alças (${onde}): as quatro cabem INTEIRAS — ${m.fileiraConteudo} px de`
              + ` conteúdo em ${m.fileira.w | 0} px de tela, sem rolar`
          );
        }
      }
    }
  }

  // ---- PARTE 2: A FOLHA DE BAIXO -----------------------------------
  // O `@media` converte as CINCO de uma vez, então as cinco são medidas —
  // a Ficha e o painel de Ajustes são as mais altas da casa, e o teto de
  // 48vh existe para elas. As promessas: a folha vai de borda a borda,
  // para ACIMA do selo e ACIMA da alça que a abriu, cabe na janela e não
  // passa de metade da tela (o teto que `julgarAreaDaFicha` já cobra para
  // a ficha, aqui cobrado para as cinco).
  const TETO_DA_FOLHA_PCT = 50;
  for (const fator of [0.85, 1, 1.4]) {
    await vestirAparelho(s, ...APARELHOS[0]);
    await s.ir(`foco=marte&ui=${fator}&${PIN}`);
    for (const [w, h] of APARELHOS) {
      await vestirAparelho(s, w, h);
      await dorme(200);
      for (const nome of ['camadas', 'busca', 'tempo', 'ajustes', 'ficha']) {
        await s.js(`(() => {
          const b = document.querySelector('[data-abre-dialogo="${nome}"]');
          if (b && b.getAttribute('aria-expanded') !== 'true') b.click();
        })()`);
        await dorme(200);
        const m = await s.js(MEDIR_CELULAR);
        const onde = `${nome}, ${w}×${h}, ui = ${fator}`;
        const r = (p) => (p ? `[${p.x | 0},${p.y | 0} ${p.w | 0}×${p.h | 0}]` : 'ausente');
        // UMA GAVETA POR VEZ: abrir a seguinte fecha a anterior, e é o
        // TIPO do estado que garante isso (`useGavetas`) — nunca um
        // `set` esquecido. Com cinco folhas de borda a borda, duas
        // abertas seriam uma pilha de cartões, não um HUD.
        conferir(
          m.dialogos.length === 1 && m.dialogos[0] === nome,
          `folha (${onde}): exatamente UMA aberta — ${m.dialogos.join(', ') || 'nenhuma'}`
        );
        conferir(
          m.folha !== null && Math.abs(m.folha.w - m.W) < 1.5,
          `folha (${onde}): de borda a borda — ${r(m.folha)} numa tela de ${m.W} px`
        );
        conferir(
          m.folha !== null && !m.folhaCobreSelo && !m.folhaCobreAlca,
          `folha (${onde}): NÃO cobre o selo ${r(m.selo)} nem a fileira ${r(m.fileira)}`
        );
        conferir(
          m.folhaDentro && m.folhaPct <= TETO_DA_FOLHA_PCT,
          `folha (${onde}): cabe na janela e ocupa ${m.folhaPct?.toFixed(1)}% da tela`
            + ` ≤ teto ${TETO_DA_FOLHA_PCT}%`
        );
        // A ALÇA ABERTA ESTÁ NA TELA. A fileira rola, e a ficha — que
        // abre SOZINHA a cada seleção — é a quinta: sem o
        // `scrollIntoView` do `useGavetas`, o visitante escolheria um
        // corpo, a folha subiria, e o botão que a fecha estaria fora do
        // quadro.
        conferir(
          m.alcaAbertaVisivel === true,
          `folha (${onde}): a alça que a abriu está VISÍVEL na fileira`
        );
      }
    }
  }

  // ---- PARTE 3: A FOLHA SOBE ---------------------------------------
  // SEM O PINO, e é a armadilha declarada deste juiz: `PIN` traz
  // `?shot=1`, e a fatia 7 zera TODA transição e TODA animação
  // (`.shot-mode * { animation: none !important }`). Medir a subida com o
  // pino seria medir a folha já parada e chamar isso de movimento. Roda
  // com o relógio solto, como `julgarChromeDoFilme`.
  //
  // TRÊS ESTADOS, 0 / 130 / 260 ms: fora da tela, no meio do caminho, e
  // em repouso. A amostragem é DE DENTRO da página (um `rAF` e dois
  // `setTimeout` gravando num vetor), porque medir daqui custaria uma ida
  // e volta de CDP por amostra — 10 a 20 ms de incerteza sobre uma
  // animação de 260.
  await vestirAparelho(s, ...APARELHOS[0]);
  await s.ir('atlas=1');
  await dorme(300);
  await s.js(`(() => {
    window.__folha = [];
    // O RELÓGIO É O DA PRÓPRIA ANIMAÇÃO (getAnimations()[0].currentTime),
    // e não o de parede. Entre o clique e o primeiro quadro animado há um
    // render do React, um paint e o que a cena do Atlas estiver fazendo —
    // medido, isso custou de 0 a 130 ms conforme a carga, e a 18 quadros
    // por segundo (que é o que um aparelho emulado dá) uma grade de
    // parede põe as três amostras em qualquer lugar da animação. Perguntar
    // à animação em que ponto ELA está tira o escalonador da conta.
    const inicio = performance.now();
    const passo = () => {
      const d = document.querySelector('[data-dialogo]');
      if (d) {
        const a = d.getAnimations()[0];
        const r = d.getBoundingClientRect();
        window.__folha.push([a ? Math.round(Number(a.currentTime)) : null,
          Math.round(r.top), Math.round(r.height)]);
      }
      if (performance.now() - inicio < 900) requestAnimationFrame(passo);
    };
    document.querySelector('[data-abre-dialogo="camadas"]').click();
    requestAnimationFrame(passo);
    return true;
  })()`);
  await dorme(1400);
  const subida = (await s.js('window.__folha')).filter((a) => a[0] !== null);
  const receita = await s.js(`(() => {
    const d = document.querySelector('[data-dialogo]');
    const cs = d ? getComputedStyle(d) : null;
    return cs ? { dur: cs.animationDuration, curva: cs.animationTimingFunction,
      nome: cs.animationName } : null;
  })()`);
  conferir(
    receita !== null && receita.dur === '0.26s'
      && receita.curva === 'cubic-bezier(0.22, 1, 0.36, 1)',
    `folha sobe: 260 ms com a curva da casa — ${receita?.nome} ${receita?.dur}`
      + ` ${receita?.curva}`
  );
  /** a amostra cujo relógio DA ANIMAÇÃO está mais perto de `ms` */
  const em = (ms) => subida.reduce(
    (a, b) => (Math.abs(b[0] - ms) < Math.abs(a[0] - ms) ? b : a),
    subida[0]
  );
  const inicio = em(0);
  const meio = em(130);
  const fim = subida.find((a) => a[0] >= 260) ?? subida[subida.length - 1];
  const repouso = subida[subida.length - 1];
  const alto = repouso ? repouso[2] : 0;
  conferir(
    subida.length >= 8,
    `folha sobe: ${subida.length} amostras com o relógio da animação —`
      + ` a varredura mediu de verdade`
  );
  conferir(
    Boolean(inicio && repouso) && inicio[0] <= 60
      && inicio[1] >= repouso[1] + 0.7 * alto,
    `folha sobe: aos ${inicio?.[0]} ms ela está FORA da tela — topo ${inicio?.[1]} px`
      + ` contra ${repouso?.[1]} em repouso (altura ${alto})`
  );
  conferir(
    Boolean(meio) && meio[1] > repouso[1] + 1 && meio[1] < inicio[1] - 1,
    `folha sobe: aos ${meio?.[0]} ms ela está NO MEIO do caminho — topo ${meio?.[1]}`
      + ` px entre ${repouso?.[1]} e ${inicio?.[1]}`
  );
  conferir(
    Boolean(fim && repouso) && Math.abs(fim[1] - repouso[1]) <= 3,
    `folha sobe: aos ${fim?.[0]} ms ela já chegou — topo ${fim?.[1]} px contra`
      + ` ${repouso?.[1]} em repouso`
  );

  // ---- PARTE 4: AS TRÊS SAÍDAS -------------------------------------
  // A folha fecha pela PRÓPRIA ALÇA (o gatilho já é um interruptor), pelo
  // Esc (que vem de graça do `dialogFocus`) e pelo TOQUE NO CÉU, que é
  // novo. Sem pino, porque a saída também é animada — e é a saída que
  // obriga o hook a existir: o nó desmonta, e CSS nenhum anima um nó que
  // já não está lá.
  await vestirAparelho(s, ...APARELHOS[0]);
  await s.ir('atlas=1');
  await dorme(300);

  // a) A ALÇA — e a folha DESCE antes de sumir, com o nó segurado por
  //    `inert`: sem toque, sem foco, fora da árvore de quem ouve a tela
  await s.js(`(() => {
    window.__saida = [];
    document.querySelector('[data-abre-dialogo="camadas"]').click();
    setTimeout(() => {
      const t0 = performance.now();
      document.querySelector('[data-abre-dialogo="camadas"]').click();
      const passo = () => {
        const d = document.querySelector('[data-dialogo]');
        window.__saida.push([Math.round(performance.now() - t0),
          d ? Math.round(d.getBoundingClientRect().top) : null,
          d ? d.hasAttribute('inert') : null]);
        if (performance.now() - t0 < 700) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    }, 500);
    return true;
  })()`);
  await dorme(1600);
  const saida = await s.js('window.__saida');
  const descendo = saida.filter((a) => a[1] !== null);
  const sumiu = saida.filter((a) => a[1] === null);
  conferir(
    descendo.length >= 3 && descendo.every((a) => a[2] === true),
    `saída pela alça: o nó fica ${descendo.length} quadro(s) DESCENDO, todo o tempo`
      + ` com \`inert\` — sem toque, sem foco, fora da árvore de quem ouve`
  );
  conferir(
    descendo.length > 0 && sumiu.length > 0
      && descendo[descendo.length - 1][1] > descendo[0][1] + 20
      && sumiu[0][0] >= 200 && sumiu[0][0] <= 500,
    `saída pela alça: desce de ${descendo[0]?.[1]} a ${descendo[descendo.length - 1]?.[1]} px`
      + ` e some aos ${sumiu[0]?.[0]} ms (260 ms, a curva da casa)`
  );

  // b) O Esc — o mesmo `dialogFocus` de sempre, agora com a saída pela frente
  await s.js(`document.querySelector('[data-abre-dialogo="camadas"]').click()`);
  await dorme(250);
  const comEsc = await s.js(`document.querySelectorAll('[data-dialogo]').length`);
  await s.teclar('Escape');
  await dorme(500);
  const semEsc = await s.js(`document.querySelectorAll('[data-dialogo]').length`);
  conferir(
    comEsc === 1 && semEsc === 0,
    `saída pelo Esc: ${comEsc} folha aberta → ${semEsc} depois do Esc`
  );

  // c) O TOQUE NO CÉU — e a prova é de DOIS lados, porque um lado só não
  //    distingue "a regra funciona" de "o dedo caiu no vazio": o MESMO
  //    pixel, com a folha aberta, FECHA e não escolhe; sem folha aberta,
  //    ESCOLHE.
  //
  //    O ALVO É A ÂNCORA DE UM RÓTULO DESENHADO, e não o primeiro pixel
  //    com tinta do canvas. A varredura de pixel media o CANTO de uma
  //    letra — que pode ficar meia palavra longe do ponto contra o qual
  //    o hit-test compara (`alvoNoPonto`, raio de ~6% da tela) — e por
  //    isso reprovava sozinha sempre que a câmera mudava de
  //    enquadramento: a 390 px, com o retângulo útil do telefone, o
  //    rótulo mais alto da tela passou a ser outro e o canto dele caiu
  //    fora do raio. A âncora é o ponto que o produto usa, e as duas
  //    condições do hit-test (desenhado, opacidade ≥ 0,15) entram na
  //    escolha em vez de ficarem implícitas.
  //
  //    E O PONTO TEM DE SER CÉU DE VERDADE: a folha sobe até 48vh e a
  //    fileira ocupa o pé, então um rótulo perfeitamente desenhado pode
  //    estar ATRÁS deles — e aí o toque acerta o painel, não o canvas.
  //    Quem responde isso é `elementFromPoint`, com a folha JÁ ABERTA,
  //    que é o estado do primeiro dos três toques.
  await s.js(`document.querySelector('[data-abre-dialogo="camadas"]').click()`);
  await dorme(300);
  const tinta = await s.js(`(() => {
    const alvos = window.__director.rotulos.alvos
      .filter((l) => l.desenhado === true && l.opacity >= 0.15);
    for (const l of alvos) {
      const x = Math.round(l.x * innerWidth), y = Math.round(l.y * innerHeight);
      if (x < 1 || y < 1 || x > innerWidth - 2 || y > innerHeight - 2) continue;
      const alvo = document.elementFromPoint(x, y);
      if (alvo && alvo.classList.contains('scene-canvas')) return { x, y, nome: l.name };
    }
    return null;
  })()`);
  if (!tinta) {
    conferir(false, 'toque no céu: nenhum rótulo desenhado sobre o canvas para tocar');
  } else {
    await s.clicar(tinta.x, tinta.y);
    await dorme(600);
    const depoisDoToque = await s.js(`(() => ({
      folhas: document.querySelectorAll('[data-dialogo]').length,
      // O MARCADOR DA SELEÇÃO é a ALÇA DA FICHA, e não
      // escada.focoCorpoId: aquele campo só existe para corpo do
      // sistema solar, e metade dos nomes clicáveis do Atlas é ESTRELA
      // — a ficha delas abre pelo degrau, com o corpoId nulo. A alça é
      // o que o visitante vê, e ela nasce exatamente quando há alvo.
      alvo: (document.querySelector('[data-abre-dialogo="ficha"]') || {}).textContent || null,
    }))()`);
    conferir(
      depoisDoToque.folhas === 0 && depoisDoToque.alvo === null,
      `toque no céu com a folha aberta: FECHA e NÃO escolhe —`
        + ` ${depoisDoToque.folhas} folha(s), alvo ${depoisDoToque.alvo ?? 'nenhum'}`
    );
    await s.clicar(tinta.x, tinta.y);
    await s.assentar();
    const semFolha = await s.js(`(() => ({
      folhas: [...document.querySelectorAll('[data-dialogo]')]
        .map((d) => d.getAttribute('data-dialogo')),
      // O MARCADOR DA SELEÇÃO é a ALÇA DA FICHA, e não
      // escada.focoCorpoId: aquele campo só existe para corpo do
      // sistema solar, e metade dos nomes clicáveis do Atlas é ESTRELA
      // — a ficha delas abre pelo degrau, com o corpoId nulo. A alça é
      // o que o visitante vê, e ela nasce exatamente quando há alvo.
      alvo: (document.querySelector('[data-abre-dialogo="ficha"]') || {}).textContent || null,
    }))()`);
    conferir(
      semFolha.alvo !== null,
      `toque no céu SEM folha aberta: continua escolhendo ("${tinta.nome}") — alvo`
        + ` ${semFolha.alvo ?? 'nenhum'}`
    );
    // …e a FICHA é a exceção: ela é o painel da SELEÇÃO, não uma folha
    // que o visitante abriu. Sem esta cláusula o clique num nome
    // deixaria de escolher em quase todo instante do Atlas.
    conferir(
      semFolha.folhas.length === 1 && semFolha.folhas[0] === 'ficha',
      `toque no céu: a escolha abriu a FICHA do alvo, e ela é a EXCEÇÃO da`
        + ` regra — folhas: ${semFolha.folhas.join(', ') || 'nenhuma'}`
    );
    const antes = semFolha.alvo;
    await s.clicar(tinta.x, tinta.y);
    await s.assentar();
    const comFicha = await s.js(`(() => ({
      folhas: document.querySelectorAll('[data-dialogo]').length,
      // O MARCADOR DA SELEÇÃO é a ALÇA DA FICHA, e não
      // escada.focoCorpoId: aquele campo só existe para corpo do
      // sistema solar, e metade dos nomes clicáveis do Atlas é ESTRELA
      // — a ficha delas abre pelo degrau, com o corpoId nulo. A alça é
      // o que o visitante vê, e ela nasce exatamente quando há alvo.
      alvo: (document.querySelector('[data-abre-dialogo="ficha"]') || {}).textContent || null,
    }))()`);
    conferir(
      comFicha.folhas === 1 && comFicha.alvo !== null,
      `toque no céu com a FICHA aberta: ela NÃO fecha e o gesto continua`
        + ` escolhendo (era "${antes}", ficou "${comFicha.alvo}")`
    );
  }

  // ---- A QUEBRA: o CSS e o TypeScript viram celular no MESMO pixel ----
  // `LARGURA_DO_CELULAR_PX` é 760, e o `@media` repete o literal porque
  // media query não lê `var()`. O lado do TypeScript é a PRESENÇA da
  // fileira (quem a desenha é o `useCelular`); o lado do CSS é o teto de
  // tela dos diálogos, que a fatia 9 aperta a 48svh. Ele é a MESMA
  // variável que governa a altura da folha — até 23/08 a fatia 9 escrevia
  // um `max-height` literal ao lado dela, e o que esta prova lia era o
  // 52vh da fatia 6, que no telefone não governava nada. Os dois têm de
  // virar no mesmo pixel: uma faixa em que um diz celular e o outro diz
  // mesa é a fileira no pé com a barra de controles inteira em cima.
  const TETO_DE_TELA_DO_CELULAR = '48svh';
  await s.ir(`atlas=1&${PIN}`);
  for (const [largura, esperado] of [[760, true], [761, false]]) {
    await vestirAparelho(s, largura, 844);
    await dorme(200);
    const q = await s.js(`(() => ({
      fileira: Boolean(document.querySelector('.atlas-alcas')),
      teto: getComputedStyle(document.querySelector('.hud-root'))
        .getPropertyValue('--teto-dialogo-tela').trim(),
    }))()`);
    const tetoDeCelular = q.teto === TETO_DE_TELA_DO_CELULAR;
    conferir(
      q.fileira === esperado && tetoDeCelular === esperado,
      `a quebra de 760 px (janela de ${largura}): TypeScript diz`
        + ` ${q.fileira ? 'celular' : 'mesa'} e o CSS diz`
        + ` ${tetoDeCelular ? 'celular' : 'mesa'} (--teto-dialogo-tela: ${q.teto})`
    );
  }

  // ---- PARTE 5: O CÉU ----------------------------------------------
  // A SEGUNDA FAIXA DECLARADA. Até 2026-08-23 o retângulo útil tinha uma
  // só (`LARGURA_UTIL_MINIMA_PX`, 768 px para cima) e o telefone era
  // registro: a câmera recuava pela base de MESA — o selo grande, a
  // máquina do tempo e os dois degraus dela, todos disparados numa tela
  // de 390 px — por um rodapé que a fatia 9 já tinha desmontado. Agora o
  // ramo do celular tem quatro frações próprias, e elas são COBRADAS
  // aqui, nos seis cantos da faixa: dois aparelhos × três `?ui=`.
  //
  // O QUE ESTA PROVA MEDE, e o que ela NÃO mede: ela cobra declarado ≥
  // medido, que é a promessa de que nada do alvo cai atrás do HUD. O
  // ganho de céu é o outro lado — `medirCobertura` imprime os dois
  // números em cada canto, e a meta do item 62 (≥ 75% a 390, ≥ 70% a
  // 320) é conferida logo abaixo, no tamanho de fábrica.
  const META_DO_CEU = { 390: 75, 320: 70 };
  for (const fator of [0.85, 1, 1.4]) {
    for (const [w, h] of APARELHOS) {
      await vestirAparelho(s, w, h);
      await s.ir(`atlas=1&ui=${fator}&${PIN}`);
      await dorme(200);
      await medirCobertura(s, `celular ${w}×${h}, ui = ${fator}`, true, fator);
    }
  }
  // A META, no TAMANHO DE FÁBRICA e com a dica NA TELA — ou seja, o pior
  // instante do pior estado, contando até o que a declaração não paga.
  // Foi assim que os 42% e os 18% de antes foram medidos (item 62), e
  // comparar de outro jeito seria trocar a régua no meio da conta.
  for (const [w, h] of APARELHOS) {
    await vestirAparelho(s, w, h);
    await s.ir(`atlas=1&${PIN}`);
    await dorme(200);
    const c = await s.js(`(() => {
      const H = innerHeight;
      const cx = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return 0;
        const b = e.getBoundingClientRect();
        return b.height === 0 ? 0 : b;
      };
      const topo = Math.max(...['.controls-bar', '.letterbox.top']
        .map(cx).filter(Boolean).map((b) => b.bottom / H));
      const base = Math.max(...['.atlas-selo', '.free-hint', '.atlas-alcas', '.letterbox.bottom']
        .map(cx).filter(Boolean).map((b) => (H - b.top) / H));
      return { pct: (1 - topo - base) * 100, util: window.__director.retanguloUtil };
    })()`);
    conferir(
      c.pct >= META_DO_CEU[w],
      `o CÉU a ${w}×${h}: ${c.pct.toFixed(1)}% da tela livre de HUD ≥ meta`
        + ` ${META_DO_CEU[w]}% (declarado à câmera:`
        + ` ${((1 - c.util.topo - c.util.base) * 100).toFixed(1)}%)`
    );
  }
  // A FRESTA de 761 a 767 px — o que sobra entre as duas faixas
  // declaradas. Ali o `@media` ainda diz mesa (é `max-width: 760px`) e a
  // janela já é estreita demais para a declaração de mesa não pagar os
  // três degraus. Continua REGISTRO, e continua nomeada.
  await vestirAparelho(s, 764, 844);
  await s.ir(`atlas=1&${PIN}`);
  await dorme(200);
  await medirCobertura(s, 'a FRESTA entre as duas faixas (761–767)', false);
  // o convite de MESA precisa de uma primeira entrada, e a parte 0
  // gravou `conviteAtlasVisto` neste perfil
  await s.js("window.localStorage.removeItem('viagem-prefs')");
  await despirAparelho(s);
}
