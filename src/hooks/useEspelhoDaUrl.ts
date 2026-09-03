import { lerPortaRotulos3d } from '../lib/beta';
// ============================================================
// A URL COMO ESPELHO — o estado de gosto que nasce dela e os sete
// escritores que a mantêm fiel (a decisão do dono: a URL espelha, não
// é painel). Morava no App.tsx (onda da arquitetura, corte 6); a
// semântica é a MESMA, linha a linha — só mudou de endereço. Este
// arquivo é GOVERNADO pelo selo (lê portas de URL).
// ============================================================
import { useLayoutEffect, useState } from 'react';
import type { Director, EstadoDaQualidade, Phase } from '../three/director';
import type {
  EscolhaDeQualidade,
  NivelDaNebulosa,
  ToneMapMode,
} from '../three/core/engine';
import { lerPortaExposicao, lerPortaTom } from '../three/core/engine';
import { chaveDoFoco, construirIndice } from '../lib/buscaEstrelas';
import { CAMADAS } from '../three/atlasConfig';
import { estadoDoSelo } from '../three/selo';
import { ESCALA_PADRAO, aplicarEscalaDaUi, lerEscalaDaUi } from '../lib/uiScale';

/** a exposição de referência da casa — o 1,02 da vista interna */
export const EXPOSICAO_PADRAO = 1.02;

/**
 * Reescreve a query preservando tudo que não é o parâmetro tocado.
 * Estava dentro do painel de Ajustes enquanto ele era o único a escrever
 * na URL; com a gaveta do Atlas e o selo mexendo nos mesmos parâmetros,
 * subiu para o dono do estado.
 */
function comParam(chave: string, valor: string | null) {
  const q = new URLSearchParams(window.location.search);
  if (valor === null) q.delete(chave);
  else q.set(chave, valor);
  const s = q.toString();
  return `${window.location.pathname}${s ? `?${s}` : ''}`;
}

export function useEspelhoDaUrl(dep: {
  directorRef: React.MutableRefObject<Director | null>;
  phase: Phase;
  foco: string | null;
  indice: ReturnType<typeof construirIndice>;
  quality: EstadoDaQualidade;
}) {
  const { directorRef, phase, foco, indice, quality } = dep;
  // O ESTADO DE GOSTO, com um dono só (F2). Ele nasce da URL — que segue
  // sendo a fonte de verdade — e é lido por três hospedeiros: o painel de
  // Ajustes, a gaveta do Atlas e o selo de honestidade. Enquanto morava
  // dentro do painel, o segundo hospedeiro nascia mentindo.
  // ...pela MESMA lei que o engine aplica (`lerPortaTom`/`lerPortaExposicao`
  // em core/engine): antes o inicializador lia cru e só o caminho do
  // Director validava, então `?tone=foo` deixava os quatro rádios
  // desmarcados e `?exp=abc` pintava "Exposição · NaN" num slider com
  // `value={NaN}` — o HUD mentindo sobre o que o instrumento faz.
  // A BETA DOS RÓTULOS 3D (item 109) — decisão dele em 29/08. A porta
  // `?r3d=1` mora em lib/beta.ts, FORA do catálogo do selo, por
  // doutrina dele: rotulagem é ponto de vista, não desvio de
  // honestidade. O espelho escreve a chave para o link reproduzir.
  const [rotulos3d, setRotulos3d] = useState(
    () => lerPortaRotulos3d(new URLSearchParams(window.location.search))
  );
  const trocarRotulos3d = (ligado: boolean) => {
    setRotulos3d(ligado);
    directorRef.current?.setRotulos3d(ligado);
    window.history.replaceState(null, '', comParam('r3d', ligado ? '1' : null));
  };

  const [tom, setTom] = useState<ToneMapMode>(
    () => lerPortaTom(new URLSearchParams(window.location.search).get('tone')) ?? 'aces'
  );
  const [exposicao, setExposicao] = useState(
    () =>
      lerPortaExposicao(new URLSearchParams(window.location.search).get('exp')) ??
      EXPOSICAO_PADRAO
  );
  const [escondidas, setEscondidas] = useState<Set<string>>(() => {
    const q = new URLSearchParams(window.location.search);
    return new Set(CAMADAS.filter((c) => q.has(c.flag)).map((c) => c.flag));
  });
  /**
   * O TAMANHO DO TEXTO DO HUD (`?ui=`, F6). Nasce da URL como todo
   * gosto da casa e NUNCA vai ao storage — quem quiser o texto maior
   * leva o tamanho no link, junto do instante da viagem.
   */
  const [escalaUi, setEscalaUi] = useState(() =>
    lerEscalaDaUi(new URLSearchParams(window.location.search).get('ui'))
  );

  /**
   * O CARIMBO DO REDESENHO — e ele existe por uma mentira MEDIDA em
   * 22/08. A política de luz é estado do DIRECTOR (`definirLuz`) e não
   * tem espelho em React, ao contrário do tom, da exposição e das
   * camadas. Resultado: quando o único desvio era `luz`, o clique na
   * linha BRILHO do selo trocava a luz de verdade e escrevia `?luz=real`
   * na URL — e o SELO continuava dizendo BRILHO ASSISTIDO na tela, até
   * um redesenho por outro motivo passar por ali. É a doença do item 10
   * ("o selo só atualiza quando a interface redesenha") por outra porta,
   * e ela passava calada porque o juiz de a11y só clicava em BRILHO
   * DEPOIS de desligar uma camada, que redesenha por conta própria.
   *
   * NÃO É SEGUNDA VERDADE: ninguém lê este número. Ele só faz o React
   * repintar, e quem repinta relê `director.selo`, que é a fonte única.
   */
  const [, carimbar] = useState(0);
  const redesenhar = () => carimbar((n) => n + 1);

  // ANTES DE PINTAR, e antes do Director existir: o `--ui` da raiz é o
  // que move os `rem` do HUD e o termo `vw` dos `clamp`, e o número
  // vivo é o que o retângulo útil do Atlas lê a cada quadro. Efeito de
  // layout (não `useEffect`) para não haver um quadro com o tamanho
  // errado quando o link já chega com `?ui=`.
  useLayoutEffect(() => {
    aplicarEscalaDaUi(escalaUi);
  }, [escalaUi]);

  /**
   * A URL de agora, com o MOMENTO da viagem dentro. Era o buraco comum de
   * três incômodos: trocar a qualidade recarregava e devolvia o espectador à
   * tela de título, "copiar link" copiava a configuração sem o instante, e
   * quem recarregava perdia onde estava. `play=1` acompanha o `t=` para a
   * viagem voltar ANDANDO — `?t=` sozinho congela, e assim continua, porque
   * é o contrato das capturas headless.
   *
   * O primeiro dos três morreu de vez nos Ajustes C: a qualidade não
   * recarrega mais. Este texto continua sendo o que ela escreve no
   * espelho — e agora ele serve a quem der F5 por conta própria, não a
   * um reload forçado pelo app.
   */
  const urlComMomento = () => {
    const url = new URL(window.location.href);
    // ferramenta de captura NÃO viaja no link copiado (auditoria item
    // 4): `?loader=` numa URL compartilhada prenderia o véu na tela de
    // quem a abrisse com ?shot= — e sem ?shot= seria porta morta.
    url.searchParams.delete('loader');
    const d = directorRef.current;
    if (!d) return url;
    // de dentro do Atlas o link volta PARA o Atlas, com o momento que o
    // portal guardou pendurado — quem abrir o link e clicar em "Partir"
    // cai no mesmo instante de quem o copiou
    const instante =
      phase === 'atlas'
        ? d.momentoGuardado
        : phase === 'journey' || phase === 'end'
          ? d.currentTime
          : null;
    if (phase === 'atlas') url.searchParams.set('atlas', '1');
    else url.searchParams.delete('atlas');
    // O ALVO EM QUADRO (F3) viaja junto, e só de dentro do Atlas: é lá
    // que "foco" quer dizer alguma coisa. A chave é a canônica da lib
    // (hd/hip quando existem), e ela some da URL quando o que está em
    // quadro é o sistema — que é o enquadramento de abertura, o padrão.
    //
    // O QUE ESTA LINHA NÃO PROMETE, declarado: o foco que NÃO está no
    // índice (o Sagittarius A✱, alcançável pelo clique no rótulo) não tem
    // chave — o link volta ao modo sem o alvo em vez de inventar uma
    // porta que a busca não saberia resolver. É o mesmo alcance da D4,
    // dos dois lados. Os dez corpos do sistema ENTRAM: a chave deles é o
    // nome normalizado (`?foco=terra`).
    const emQuadro = foco === null ? null : chaveDoFoco(foco, indice);
    if (phase === 'atlas' && emQuadro) url.searchParams.set('foco', emQuadro);
    else url.searchParams.delete('foco');
    // `?ver=` VIRA SÓ LEITURA (item 73, 22/08). Ele espelhava o DEGRAU
    // — "no corpo" ou "na órbita" —, e o degrau deixou de ser a
    // grandeza que descreve a vista no dia em que a roda virou zoom
    // contínuo: entre "no corpo" e "no corpo, a 2,4 raios dele" a porta
    // não sabe distinguir. Quem espelha agora é `?d=`, e escrever as
    // duas seriam DUAS PORTAS PARA A MESMA GRANDEZA (AGENTS §4), com a
    // pior consequência possível — a que sabe menos ganhando na leitura.
    //
    // LER continua valendo, e é o contrato: todo link `?foco=x&ver=corpo`
    // já copiado pousa no MESMO enquadramento de sempre (`lerPortaVer`
    // em `selo.ts` e o bloco do `useDirector` ficam inteiros). O que
    // some é a ESCRITA — e ela some sempre, inclusive quando a porta
    // chegou pela URL: espelho reescreve o que a vista diz agora.
    url.searchParams.delete('ver');
    // A DISTÂNCIA AO ALVO, em RAIOS dele — 4 algarismos significativos.
    // Ela entra SÓ quando o visitante pinou (mexeu na roda ou chegou com
    // `?d=`): sem pino a vista É o enquadramento, e um link que
    // escrevesse a distância calculada congelaria no endereço um número
    // que anda com `?ui=` e com o tamanho da janela.
    const emRaios = phase === 'atlas' ? directorRef.current?.distanciaEmRaios : null;
    if (emRaios !== null && emRaios !== undefined && Number.isFinite(emRaios)) {
      url.searchParams.set('d', String(Number(emRaios.toPrecision(4))));
    } else url.searchParams.delete('d');
    // O INSTANTE DO CÉU (F4) viaja junto — pelo mesmo motivo do `t=`: o
    // "voltar ao brilho real" ainda pode RECARREGAR a página por esta
    // URL (e o F5 de quem trocou de tier a relê), e sem esta linha o
    // visitante que viajou no tempo voltaria à época sem ter pedido. Na
    // época a porta sai da URL em vez de gravar o valor padrão.
    //
    // LIDO DO DIRECTOR NA HORA, como o `?d=` logo acima — não do estado
    // empurrado. O mostrador deixou de publicar a cada segundo (o `jd`
    // anda, mas a data tem resolução de minuto: ver `mesmoMostrador`), e
    // um `?jd=` que viesse do último empurrão congelaria no minuto. Este
    // texto é escrito em GESTO — copiar link, trocar de tier, voltar ao
    // brilho real —, nunca num relógio, então "na hora" é sempre a hora
    // certa. De quebra o link ficou EXATO: antes ele saía com o instante
    // de até 250 ms atrás.
    const agora = d.tempo;
    if (!agora.naEpoca) url.searchParams.set('jd', String(agora.jd));
    else url.searchParams.delete('jd');
    if (instante !== null && instante > 0.5) {
      url.searchParams.set('t', instante.toFixed(1));
      url.searchParams.set('play', '1');
    }
    return url;
  };

  /**
   * A QUALIDADE TROCA AO VIVO (Ajustes C do NORTE — a régua do dono:
   * nada recarrega). Metade dela sempre foi viva (pixelRatio, passos do
   * raymarch); a outra metade é ALOCAÇÃO — a população da galáxia, o
   * tier do Sol, o alvo de textura dos corpos —, e até 2026-08-20 o
   * único jeito de refazê-la era gravar `?q=` na URL e RECARREGAR, o
   * que devolvia o espectador à tela de título. Agora o Director assa o
   * mundo novo em segundo plano e troca os ponteiros num quadro só
   * (`Director.setQuality`); daqui sai só o pedido e o espelho.
   *
   * A URL É ESPELHO, NÃO PAINEL: ela continua sendo reescrita — e pelo
   * `urlComMomento`, que é o mesmo texto do botão "copiar link" —, mas
   * com `replaceState` em vez de `assign`. Quem der F5 depois de trocar
   * de tier volta ao mesmo instante, no mesmo modo, com o mesmo alvo em
   * quadro; quem não der não perde nada.
   *
   * O QUE VAI À URL É A ESCOLHA, NÃO O TIER VIVO (Ajustes D). Em `auto`
   * o tier anda sozinho, e gravar o tier de agora congelaria no link uma
   * decisão que o visitante não tomou — quem abrisse o link cairia num
   * tier fixo em vez do Auto que o dono do link escolheu.
   *
   * O `?q=` É SEMPRE ESCRITO, cinema inclusive — mesmo agora que cinema
   * é o padrão de produto. Tom e exposição omitem o valor padrão porque
   * o estado deles é só gosto; este é ALOCAÇÃO, e um link que cala sobre
   * o tier não diz o que a tela mostra.
   */
  const changeQuality = (escolha: EscolhaDeQualidade) => {
    if (escolha === quality.escolha) return;
    directorRef.current?.setQuality(escolha);
    const url = urlComMomento();
    url.searchParams.set('q', escolha);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  /**
   * A SUAVIZAÇÃO DE BORDAS, AO VIVO (item 145) — o primeiro controle da
   * gaveta AVANÇADO. Palavras do dono: *"porque não deixamos isso como
   * um toggle então... se a pessoa quiser ela desliga isso, mas como eu
   * não tenho hoje o toggle não consigo nem entender direito em tempo
   * real qual é o impacto em performance e em qualidade visual"*.
   *
   * NÃO HÁ ESTADO EM REACT AQUI, e é de propósito: o valor vivo mora no
   * `Post`, o Director o publica dentro do `EstadoDaQualidade` (é o
   * mesmo assunto na tela), e o painel lê de lá. Uma cópia local seria a
   * segunda verdade que a F2 da Onda 5 tirou do tom e da exposição.
   *
   * A URL É ESPELHO: `?msaa=` já existia como porta de bancada e vira o
   * reflexo do controle — escrita só quando o visitante saiu do preset,
   * apagada quando ele volta, porque "do preset" é o padrão e a URL
   * desta casa descreve a vista, não é painel.
   */
  const trocarAmostras = (amostras: number | null) => {
    directorRef.current?.forcarAmostras(amostras);
    window.history.replaceState(
      null,
      '',
      comParam('msaa', amostras === null ? null : String(amostras))
    );
  };

  /**
   * A NEBULOSA E A ESCALA DE RESOLUÇÃO, AO VIVO (item 145) — os outros
   * dois controles da gaveta Avançado, no molde exato do de cima:
   * nenhum estado em React (a verdade mora no Director e no Engine, e o
   * painel a lê pelo `EstadoDaQualidade`), e a URL como ESPELHO —
   * escrita só fora do preset, apagada na volta a ele.
   *
   * `?nebsteps=` NÃO passa por aqui: é bancada, vence tudo dentro da
   * própria `Nebula` e continua declarada como porta no selo.
   */
  const trocarNebulosa = (nivel: NivelDaNebulosa | null) => {
    directorRef.current?.forcarNebulosa(nivel);
    window.history.replaceState(null, '', comParam('nebula', nivel));
  };

  const trocarEscala = (fator: number | null) => {
    directorRef.current?.forcarEscala(fator);
    window.history.replaceState(
      null,
      '',
      comParam('escala', fator === null ? null : String(fator))
    );
  };

  // ---- o gosto, escrito num lugar só (estado + Director + URL) -------
  const trocarTom = (t: ToneMapMode) => {
    setTom(t);
    directorRef.current?.engine.setToneMapping(t);
    window.history.replaceState(null, '', comParam('tone', t === 'aces' ? null : t));
  };

  /**
   * O SLIDER DE VOLTA AO PADRÃO DESARMA O LATCH. `setExposure` LIGA o
   * `expOverride` do Director (é o que faz o valor escolhido sobreviver
   * ao quadro seguinte), e o slider o armava até no 1,02 — a tela ficava
   * em 1,02 fixo enquanto a URL, já sem `?exp=`, recarregava na
   * auto-exposição 1,02+0,03·galaxyFade (1,05 na vista externa). Duas
   * telas para a mesma URL. No padrão o caminho é o de volta, o mesmo que
   * a linha BRILHO do selo usa.
   */
  const trocarExposicao = (v: number) => {
    setExposicao(v);
    const d = directorRef.current;
    if (v === EXPOSICAO_PADRAO) d?.limparExposicaoManual();
    else d?.setExposure(v);
    window.history.replaceState(
      null,
      '',
      comParam('exp', v === EXPOSICAO_PADRAO ? null : String(v))
    );
  };

  /**
   * A LINHA BRILHO DO SELO É UMA PORTA DE DUAS VIAS (decisão 3 do dono,
   * 25/08). Até então ela só tinha ida: o clique desfazia a assistência e
   * NÃO havia caminho de volta sem editar a URL e recarregar — a linha em
   * BRILHO REAL ficava desabilitada, e quem quisesse a foto de novo
   * precisava saber que existe uma porta `?luz=` para apagar à mão.
   *
   * A REGRA, em uma frase: **enquanto sobrar algo a desfazer, o clique
   * desfaz; quando não sobra mais nada, o clique devolve a assistência.**
   *
   * Ela não tem lista própria de coisas a desfazer: pergunta ao registro
   * quais caminhos estão ativos AGORA e desfaz os que têm volta. Os de
   * volta 'vivo' são desfeitos no lugar; se houver algum que só o boot lê
   * (`?nobloom=`, `?knee=`, as camadas do bake), o caminho é o mesmo que
   * a troca de qualidade já usa: reescrever a URL sem eles e recarregar —
   * e a URL sai do `urlComMomento`, que carrega o `atlas=1` e o instante
   * guardado, para o visitante voltar exatamente para onde estava. O que
   * não tem volta (o tier) fica, e o selo segue dizendo.
   *
   * A VOLTA É AO VIVO, SEM RECARGA: `definirLuz('assistida')` e o tick
   * seguinte já entrega o escalar novo ao material. E a URL espelha o
   * gesto nos DOIS sentidos — indo, escreve `?luz=real`; voltando, APAGA
   * a chave, porque `assistida` é o padrão e a URL desta casa é espelho
   * da vista, nunca painel de controle.
   */
  const voltarAoBrilhoReal = () => {
    const d = directorRef.current;
    if (!d) return;
    const veredito = estadoDoSelo(d.selo);
    const desvios = veredito.desvios.filter((c) => c.volta !== 'nenhuma');
    // A SEGUNDA VIA arma pelo QUE RESTA A DESFAZER — a mesma guarda de
    // `aoClicarEmBrilho`, que é o oráculo puro deste gesto. Ela lia o
    // VEREDITO até o item 103, e por isso um desvio indesfazível (o tier
    // abaixo de cinema, a dose do arranque) trancava a luz em `real` para
    // sempre: o veredito nunca esvaziava, a volta nunca armava. Sem nada a
    // desfazer, `luz` já está em `real` — a `assistida` é sempre desvio.
    if (desvios.length === 0) {
      d.definirLuz('assistida');
      redesenhar();
      const volta = urlComMomento();
      // `assistida` é o PADRÃO: o espelho da volta é a AUSÊNCIA da chave,
      // nunca `?luz=assistida`. A URL desta casa descreve a vista, e uma
      // chave que só repete o default seria painel, não espelho.
      volta.searchParams.delete('luz');
      window.history.replaceState(null, '', `${volta.pathname}${volta.search}`);
      return;
    }
    const url = urlComMomento();
    for (const c of desvios) url.searchParams.delete(c.chave);
    // A LUZ (Onda 6, D2): o padrão é `assistida`,
    // então apagar a chave da URL a ressuscitaria na recarga. A volta
    // escreve `?luz=real` — a URL vira espelho do estado escolhido.
    if (desvios.some((c) => c.chave === 'luz')) url.searchParams.set('luz', 'real');
    if (desvios.some((c) => c.volta === 'recarregar')) {
      window.location.assign(url.toString());
      return;
    }
    for (const c of desvios) {
      if (c.chave === 'exp') {
        d.limparExposicaoManual();
        setExposicao(EXPOSICAO_PADRAO);
      } else if (c.chave === 'tone') {
        d.engine.setToneMapping('aces');
        setTom('aces');
      } else if (c.chave === 'msaa') {
        // a suavização escolhida à mão volta ao preset (item 145) — e
        // sem este ramo ela cairia no `setLayerHidden` lá embaixo, que
        // não conhece esta chave: o selo apagaria a linha da URL e a
        // cena continuaria com o número forçado
        d.forcarAmostras(null);
      } else if (c.chave === 'nebula') {
        d.forcarNebulosa(null);
      } else if (c.chave === 'escala') {
        d.forcarEscala(null);
      } else if (c.chave === 'luz') {
        // volta ao 1/d² cru no próximo quadro (D2 — volta 'vivo'), e o
        // carimbo porque esta é a única linha sem espelho em React: sem
        // ele o selo ficava dizendo ASSISTIDO sobre uma cena já real
        d.definirLuz('real');
        redesenhar();
      } else {
        d.setLayerHidden(c.chave, false);
        setEscondidas((prev) => {
          const s = new Set(prev);
          s.delete(c.chave);
          return s;
        });
      }
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  /**
   * O tamanho do texto do HUD. Muda ao vivo (o `--ui` é lido pelo CSS a
   * cada pintura) e conta como troca de ENQUADRAMENTO para o Atlas: o
   * HUD cresceu, o retângulo útil encolheu, a câmera recua.
   */
  const trocarEscalaUi = (v: number) => {
    setEscalaUi(v);
    directorRef.current?.escalaDaUiMudou();
    window.history.replaceState(
      null,
      '',
      comParam('ui', v === ESCALA_PADRAO ? null : String(v))
    );
  };

  const alternarCamada = (flag: string, ligar: boolean) => {
    const camada = CAMADAS.find((c) => c.flag === flag);
    if (!camada) return;
    if (!camada.viva) {
      // O RAMO DE RECARGA, hoje sem nenhuma camada: as três que passavam
      // por aqui (nodisc/nogdust/noglow) viraram vivas em 2026-08-12. Ele
      // fica como o outro lado do contrato `viva` — uma camada nova que
      // realmente precise reconstruir o mundo cai aqui, com o ↻ do painel
      // junto. Desde os Ajustes C a QUALIDADE já não passa por aqui: o
      // Director assa o mundo novo em segundo plano e troca ao vivo, e
      // uma camada que precisasse do mesmo teria esse caminho pronto.
      //
      // Reconstruir o mundo — reload de verdade. E pelo `urlComMomento`,
      // que é o que o "voltar ao brilho real" já faz: sem ele, desmarcar
      // uma camada ↻ de DENTRO do Atlas (onde a URL costuma estar limpa)
      // recarregava em `/?nodisc=1` e devolvia o visitante à tela de
      // título — modo, foco, instante do céu e alvo em quadro, perdidos.
      const url = urlComMomento();
      if (ligar) url.searchParams.delete(flag);
      else url.searchParams.set(flag, '1');
      window.location.assign(url.toString());
      return;
    }
    directorRef.current?.setLayerHidden(flag, !ligar);
    setEscondidas((prev) => {
      const s = new Set(prev);
      if (ligar) s.delete(flag);
      else s.add(flag);
      return s;
    });
    window.history.replaceState(null, '', comParam(flag, ligar ? null : '1'));
  };

  return {
    tom,
    exposicao,
    escondidas,
    escalaUi,
    setEscondidas,
    urlComMomento,
    changeQuality,
    trocarAmostras,
    trocarNebulosa,
    trocarEscala,
    trocarTom,
    trocarExposicao,
    voltarAoBrilhoReal,
    trocarEscalaUi,
    rotulos3d,
    trocarRotulos3d,
    alternarCamada,
  };
}
