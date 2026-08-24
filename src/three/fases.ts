// ============================================================
// As FASES do Director — e o inventário PINADO de quem decide por
// fase. Antes da Onda 5 este conhecimento estava espalhado por 28
// cadeias `if` em dois arquivos (director.ts e App.tsx), e a fase
// nova entrava em cada uma por leitura atenta. Aqui ficam o tipo, os
// dois mapas `satisfies Record<Phase, …>` que substituem as cadeias
// que eram só "esta peça monta nesta fase?", e a LISTA dos pontos que
// continuam sendo `if` por terem lógica própria — com o comportamento
// de cada um em 'atlas' declarado, não inferido.
// ============================================================

/**
 * 'atlas' é a fase do modo Atlas navegável (Onda 5): o mesmo Director,
 * outro escritor de câmera, outro HUD. Ela NÃO é uma variação de
 * 'free' — o voo livre é pilotagem em 1ª pessoa, o Atlas é
 * enquadramento privilegiado sobre um alvo.
 */
export type Phase = 'loading' | 'intro' | 'journey' | 'end' | 'free' | 'atlas';

/**
 * QUEM ESCREVE A CÂMERA em cada fase. Até a Onda 5 isto vivia em três
 * lugares que ligavam/desligavam o `enabled` do FreeRoam à mão
 * (`play()`, `enterFreeRoam()`, `placeCamera()`); com a terceira via
 * (o AtlasRig) seriam seis. Agora a posse é do `setPhase`, e este mapa
 * é a única resposta para "quem manda na câmera agora".
 *
 * 'nenhum' não é ausência de câmera: é a câmera PARADA onde o último
 * escritor a deixou — é o que 'end' sempre fez (a viagem congela no
 * último quadro do roteiro) e o que 'loading' faz antes do início.
 */
export type EscritorDeCamera = 'nenhum' | 'viagem' | 'voo' | 'atlas';

export const ESCRITOR_DE_CAMERA = {
  loading: 'nenhum',
  // a intro roda o rig do roteiro em t=0 (deriva lenta contemplativa)
  intro: 'viagem',
  journey: 'viagem',
  end: 'nenhum',
  free: 'voo',
  atlas: 'atlas',
} satisfies Record<Phase, EscritorDeCamera>;

/**
 * ARRASTAR O CANVAS FAZ ALGUMA COISA nesta fase? É a pergunta que o
 * CURSOR responde: até 2026-08-13 o ponteiro sobre a cena era a seta de
 * sempre em TODAS as fases, e nada — nem o cursor, nem uma dica — dizia
 * que dava para arrastar. Quem não tentou, não descobriu.
 *
 * Não é estado novo: são os MESMOS três donos do gesto já escritos no
 * `Director`, lidos de onde eles moram. O voo livre sai do mapa
 * `ESCRITOR_DE_CAMERA` acima (é o `roam.enabled`, `director.ts:915`), o
 * Atlas é a fase inteira (a guarda do `onPausePointerDown`), e a viagem
 * só cede o ponteiro quando está CONGELADA (`pauseLookActive`) — daí o
 * segundo parâmetro. Fora desses três, arrastar não move um pixel, e
 * prometer "agarrar" ali seria mentira: com o filme correndo quem manda
 * na câmera é o roteiro, e o cursor de agarrar convidaria para um gesto
 * que não responde.
 *
 * Mora aqui, e não no `HUD_POR_FASE`, porque não é uma PEÇA do HUD que
 * monta — é uma propriedade da cena; e é função, não campo do mapa,
 * porque depende de `pausada`, que um mapa por fase não sabe.
 */
export function arrastoFazAlgo(fase: Phase, pausada: boolean): boolean {
  if (ESCRITOR_DE_CAMERA[fase] === 'voo') return true;
  if (fase === 'atlas') return true;
  return fase === 'journey' && pausada;
}

/**
 * QUE PEÇAS DO HUD MONTAM em cada fase. Substitui as cadeias do
 * App.tsx que eram só presença — as que têm lógica extra (a dica do
 * pausar-e-olhar depende de `paused`, a linha de rumo depende de haver
 * destino) continuam como condição composta lá, sobre estes campos.
 */
export interface HudDaFase {
  /** tarjas pretas de cinema (top/bottom) */
  letterbox: boolean;
  /** legenda do beat */
  legenda: boolean;
  /** linha de rumo "→ DESTINO · distância viva" */
  rumo: boolean;
  /** distância viva do Sol ("SOL · 40,2 UA") — o instrumento do
   *  afastamento que o dono pediu (item 44: "infelizmente nao tem
   *  medida de distancia para provar isso"). Só no voo livre: o filme
   *  guarda a dramaturgia, o Atlas tem o próprio enquadramento. */
  sol: boolean;
  /** barra de capítulos do FILME (slider de scrub) */
  progresso: boolean;
  /** barra de controles — é ela que hospeda o ⚙ Ajustes */
  controles: boolean;
  /**
   * A FICHA DO OBJETO (item 74) — o painel do corpo selecionado. O "em
   * quadro" é o CABEÇALHO dela: nome, classe e os dois gestos da escada.
   *
   * Só no Atlas, e o motivo é de dramaturgia. Na coda do filme a Terra e a
   * Lua estão em quadro por ROTEIRO, não por seleção: quem responde "o que
   * é isso?" ali é a legenda do beat, e a porta para o resto é o "Entrar no
   * Atlas" do pausar-e-olhar — que já leva o `jd` do filme junto.
   */
  ficha: boolean;
  /**
   * gaveta de camadas — as da casa em três famílias, config único.
   * Em TODA fase que tem barra de controles desde o item 61 (22/08): ela
   * é a única porta das camadas, e uma porta que só existisse no Atlas
   * deixaria o filme sem elas. Mesma peça, mesmo estado, mesma URL.
   */
  gaveta: boolean;
  /** selo de honestidade: ESCALA e BRILHO, e as duas são controles */
  selo: boolean;
  /** máquina do tempo: instante do céu, sentido, taxa, AO VIVO (F4/D2) */
  tempo: boolean;
  /**
   * paleta de busca sobre as 1.726 nomeadas (F3/D4). Nas DUAS fases em
   * que existe alvo para escolher, e o verbo muda com a fase: no Atlas
   * a escolha ENQUADRA, no voo livre ela VOA. No filme não monta — lá
   * quem manda na câmera é o roteiro, e uma busca sem destino possível
   * seria um controle que não faz nada.
   */
  busca: boolean;
  /** ⏸ Pausar · velocidade · Ver a galáxia · Explorar */
  botoesDaViagem: boolean;
  /** ↻ Reviver */
  botaoReviver: boolean;
  /**
   * ↩ Voltar ao filme — a saída do Atlas para a viagem GUARDADA. Só
   * monta quando há filme atrás (`momentoGuardado !== null`): sem ele o
   * botão devolvia a TELA DE TÍTULO, que era o Atlas confessando ser o
   * modo secundário.
   */
  botaoPartir: boolean;
  /**
   * ▶ Ver o filme · ↗ Explorar — as duas FERRAMENTAS do Atlas (item 61,
   * 23/08). Palavras do dono em 22/08: *"o modo atlas na minha visão
   * deveria ser o modo único, a viagem na verdade para mim é só uma
   * ferramenta do modo atlas"*. Até aqui a barra do Atlas só tinha a
   * saída; agora a viagem e o voo livre são coisas que se PEDEM de
   * dentro dele, e o Atlas deixa de ser um lugar de onde só se sai.
   */
  saidasDoAtlas: boolean;
  /** dica de teclas do voo livre */
  dicaDeVoo: boolean;
  /** tela de título / tela final */
  veuDeTitulo: boolean;
}

export const HUD_POR_FASE = {
  loading: {
    sol: false,
    letterbox: false,
    legenda: false,
    rumo: false,
    progresso: false,
    controles: false,
    ficha: false,
    gaveta: false,
    selo: false,
    tempo: false,
    busca: false,
    botoesDaViagem: false,
    botaoReviver: false,
    botaoPartir: false,
    saidasDoAtlas: false,
    dicaDeVoo: false,
    veuDeTitulo: false,
  },
  intro: {
    sol: false,
    letterbox: true,
    legenda: false,
    rumo: false,
    progresso: false,
    controles: false,
    ficha: false,
    gaveta: false,
    selo: false,
    tempo: false,
    busca: false,
    botoesDaViagem: false,
    botaoReviver: false,
    botaoPartir: false,
    saidasDoAtlas: false,
    dicaDeVoo: false,
    veuDeTitulo: true,
  },
  journey: {
    sol: false,
    letterbox: true,
    legenda: true,
    rumo: true,
    progresso: true,
    controles: true,
    ficha: false,
    gaveta: true,
    selo: false,
    tempo: false,
    busca: false,
    botoesDaViagem: true,
    botaoReviver: false,
    botaoPartir: false,
    saidasDoAtlas: false,
    dicaDeVoo: false,
    veuDeTitulo: false,
  },
  end: {
    sol: false,
    letterbox: true,
    legenda: false,
    rumo: false,
    progresso: true,
    controles: false,
    ficha: false,
    gaveta: false,
    selo: false,
    tempo: false,
    busca: false,
    botoesDaViagem: false,
    botaoReviver: false,
    botaoPartir: false,
    saidasDoAtlas: false,
    dicaDeVoo: false,
    veuDeTitulo: true,
  },
  free: {
    sol: true,
    letterbox: true,
    legenda: false,
    rumo: false,
    progresso: false,
    controles: true,
    ficha: false,
    gaveta: true,
    selo: false,
    tempo: false,
    busca: true,
    botoesDaViagem: false,
    botaoReviver: true,
    botaoPartir: false,
    saidasDoAtlas: false,
    dicaDeVoo: true,
    veuDeTitulo: false,
  },
  // O HUD do Atlas nasce MÍNIMO de propósito: barra de controles (que
  // é a porta dos Ajustes — sem ela a F5/F6 chegariam sem acesso) e a
  // saída. A ficha do objeto, a gaveta de camadas e o selo de honestidade
  // são da F2; a máquina do tempo é da F4; a barra de progresso NUNCA
  // entra (é o slider de capítulos do filme, e daria scrub do filme
  // dentro do Atlas — e o tempo do Atlas é OUTRO tempo: o do céu).
  atlas: {
    sol: false,
    letterbox: true,
    legenda: false,
    rumo: false,
    progresso: false,
    controles: true,
    ficha: true,
    gaveta: true,
    selo: true,
    tempo: true,
    busca: true,
    botoesDaViagem: false,
    botaoReviver: false,
    botaoPartir: true,
    saidasDoAtlas: true,
    dicaDeVoo: false,
    veuDeTitulo: false,
  },
} satisfies Record<Phase, HudDaFase>;

/**
 * OS 28 PONTOS QUE DECIDEM POR FASE, medidos no código em 2026-08-11
 * (15 no `director.ts`, 13 no `App.tsx`), com o comportamento de cada
 * um em 'atlas' DECLARADO. Os marcados [mapa] deixaram de ser cadeia
 * `if` e passaram a ler `HUD_POR_FASE`/`ESCRITOR_DE_CAMERA` acima.
 *
 * director.ts
 *  1. `captura.andando` — viagem correndo .............. não vale no Atlas;
 *     em troca o Atlas tem termo PRÓPRIO (véu de entrada/saída em curso).
 *  2. `captura.andando` — câmera do voo livre .......... não vale no Atlas.
 *  3. `captura.pronto` — `fase !== 'loading'` .......... 'atlas' É fase
 *     capturável: o gate da F1 exige captura em 'atlas' por `via=sinal`.
 *  4. `togglePause` — só em 'journey' .................. no-op no Atlas
 *     (a viagem não corre lá; o estado dela fica guardado no portal).
 *  5. `pauseLookActive` — 'journey' + congelada ........ falso no Atlas;
 *     o ponteiro no Atlas é do AtlasRig (mesmos listeners, outro dono).
 *  6. `tryVisit` — só em 'free' ........................ passa a valer em
 *     'atlas': o clique num nome FOCA pelo AtlasRig (fundação da F3).
 *  7. `seekFraction` — retoma a partir de 'end' ........ inalcançável no
 *     Atlas (a barra de progresso não monta lá).
 *  8. `skipChapter` — só em 'journey' .................. no-op no Atlas.
 *  9. `tick` — ramo da viagem .......................... não.
 * 10. `tick` — ramo do voo livre ....................... não.
 * 11. `tick` — ramo da intro ........................... não; o Atlas
 *     ganha ramo próprio, que escreve a câmera pelo AtlasRig.
 * 12. `tick` — latch `leftDisk` ........................ ARMA, como toda
 *     fase que escreve câmera (item 61, §6 — 23/08). Era o contrário: a
 *     trava caía num `else` que a apagava fora da viagem, e o preço era
 *     medido — entrar no Atlas na coda acendia a nebulosa e apagava o
 *     cartão da galáxia no mesmo lugar, só por trocar de modo. Hoje ela
 *     arma por POSIÇÃO onde `ESCRITOR_DE_CAMERA` não é 'nenhum',
 *     atravessa o portal nos dois sentidos e só é desarmada pelos dois
 *     gestos que pedem a casa (`escada.focarNoSistema` e `play()`).
 * 13. `tick` — rótulos em 'journey' ou 'free' .......... ganha 'atlas'.
 * 14. `tick` — ramo editorial de rótulos da viagem ..... não; o Atlas usa
 *     o ramo do voo livre (7 rótulos, sem filtro de centro).
 * 15. `tick` — limpar rótulos fora de 'journey' ........ não limpa em
 *     'atlas' (ele está no ramo 13).
 *
 * App.tsx
 * 16. `loaderState` — 'loading' ....................... 'atlas' é 'done'.
 * 17. `urlComMomento` — 'journey' ou 'end' ............ o Atlas carrega
 *     `atlas=1` (e o `t=` do momento guardado, quando existe).
 * 18. `inJourney` .................................... falso.
 * 19. `showVeil` — 'intro' ou 'end' (+ modo do véu) ... falso. [mapa]
 * 20. letterbox — `fase !== 'loading'` ............... ligado. [mapa]
 * 21. `Caption` ...................................... não monta. [mapa]
 * 22. linha de rumo .................................. não monta. [mapa]
 * 23. `ProgressBar` .................................. não monta. [mapa]
 * 24. dica do voo livre .............................. não monta. [mapa]
 * 25. dica do pausar-e-olhar ......................... não monta.
 * 26. barra de controles ............................. MONTA — é a porta
 *     dos Ajustes na fase nova. [mapa]
 * 27. botão ↻ Reviver ................................ não monta. [mapa]
 * 28. botões da viagem ............................... não; em lugar
 *     deles, as DUAS ferramentas (`saidasDoAtlas`: ▶ Ver o filme e
 *     ↗ Explorar) e o ↩ Voltar ao filme, que só monta com filme
 *     guardado (item 61, 23/08). [mapa]
 */
