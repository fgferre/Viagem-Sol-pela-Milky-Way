# Norte

O que o projeto está tentando ser, o que já foi decidido, e o que não se
repete. Este arquivo existe para que uma sessão nova retome sem redescobrir.
Não é diário: só entra aqui o que ainda decide alguma coisa. O que virou
código sai daqui. A ata das rodadas vive no git (tag `docs-antes-da-reforma`)
e no ledger `docs/reference/EVOLUCAO.md`.

O que está aberto e incomoda quem usa mora em [`docs/PENDENCIAS.md`](PENDENCIAS.md).
Como uma estrela é desenhada mora em [`docs/LEI-DA-ESTRELA.md`](LEI-DA-ESTRELA.md).
O que falta da fusão do Atlas mora em [`docs/PLANO-ATLAS.md`](PLANO-ATLAS.md).
O que ainda falta dos filmes mora em [`docs/PLANO-CINEMA.md`](PLANO-CINEMA.md).

---

## A visão

Uma Via Láctea volumétrica, cinematográfica e cientificamente fundamentada,
na qual se pode viajar até qualquer ponto e ainda sentir um universo vivo:

- Nuvens moleculares e poeira volumétricas em toda a galáxia — dourado de
  longe, púrpura e azul por dentro.
- Estrelas de catálogo e procedurais sob a **mesma lei** — magnitude, cor,
  tamanho e brilho corretos, respondendo à posição do observador.
- Determinístico, eficiente no browser, LOD de verdade. Sem truque de sprite.

O produto é um só — **Mar de Estrelas**: o filme de ~3 min 13 s leva do Sol
a Sagittarius A*; perto de casa vive o **Atlas**, o sistema solar explorável,
no mesmo Director, sem segundo motor. Frase de identidade: *a jornada te
leva; o Atlas te deixa ficar.*

O filme galáctico atual vem primeiro. Seu eixo é a **perspectiva**: o universo
não mudou; nós mudamos de lugar. Depois dele haverá uma segunda viagem, solar,
de quatro minutos — Terra/Lua, Júpiter/Io, Saturno/luas e o recuo até o Sol
virar ponto. Os dois filmes pertencem ao mesmo motor e novos filmes serão
declarativos: roteiro leve e editável, sem reescrever o núcleo do aplicativo.

Unidades também contam a história: **UA** no Sistema Solar, **anos-luz** na
narrativa galáctica e **parsecs** no canal técnico.

O árbitro visual não é captura do próprio app: são as referências em
[`docs/reference/`](reference/), com alvos em
[`docs/reference/VISUAL_TARGETS.md`](reference/VISUAL_TARGETS.md). As vistas
externas (face-on / edge-on) são recriações científicas ancoradas em Gaia —
ninguém fotografou a Via Láctea de fora. A única foto real é o panorama ESO,
visto de dentro.

**Mais que um SpaceEngine** — decisão do dono de 2026-08-11, e ela mora
INTEIRA na tabela de decisões fechadas, uma vez só. O que ela obriga
aqui: a galáxia volumétrica científica é o diferencial, e toda escala
artística nova se declara no selo.

---

## As três unificações

A visão não se decompõe em features. São três coisas que ainda existem em
duplicata. Ordem: **1 antes de 3**. A 2 é independente da 3.

**1. Uma cadeia fotométrica.** Magnitude → fluxo → pixel, uma vez só, para
todas as camadas. *Parcial:* o campo HYG já recalcula `m` da câmera e desenha
PSF de largura fixa. *Falta:* exposição compartilhada e o tonemap (hoje o
teto real do campo é ~2,3 mag contra 8,6 do catálogo). SEIS leis de
extinção convivem — censo de 17/08 no item 36 do PENDENCIAS: a tripla
literal `[1.0, 1.65, 2.35]` no HYG (não é lei de potência; entra 2×, na
cor e em meio alpha), CCM89 com saturação nas partículas, CCM89 sem
saturação nas forjas (desligada por padrão), CCM89 sem coluna nas nuvens
observadas, 0,8 mag/kpc acromático nas cascas, e o A_V→τ cinza da LUT da
faixa; o bake executa um fator 2,39 normalizado com a âncora física de
1,5 mag/kpc declarada como pendente no próprio código. Unificar é a
pauta desta unificação.

O contrato da estrela — disco + clarão, troca abaixo de 1 px conservando
fluxo, compressão fixa — está em `LEI-DA-ESTRELA.md`. É quem manda sobre as
antigas Ondas 7 e 8 de luz.

**2. Uma lei de população estelar.** Cascas por bin de M_V e o handoff
`unresolved(d)` já estão no código. O Sol já é `StellarBody` (instância nº 1).
*Falta:* star forges e as partículas da galáxia ainda são leis próprias;
DUAS dupla-luzes sem mecanismo — partículas ↔ lâminas, e catálogo ↔ as 16
heroes de autor (`heroStars.ts`, resgatado em 16/08 por ordem dele: o ponto
e o billboard somam na mesma estrela, e quem fecha a cessão é o M3, com
gate de foto); promoção partícula → catálogo → corpo. Detalhe e ordem:
`LEI-DA-ESTRELA.md` passos E e G.

**3. Um meio volumétrico.** O dado já é único (mesmo campo de densidade). O
que está duplicado é o integrador: ~430 k sprites na vista externa e um
raymarch local, ligados por crossfade. Decidido: coluna fechada sobre um Σ
único, `L = Σ_j·F(τ)/|μ|`. A emissão 2-braços (Sct-Cen + Perseu; gás em 4)
já substituiu o truque de sprite na harmônica. *Falta:* o quad único no
lugar dos sprites (dissolve as listras de raspão) e a calibração absoluta
de κ.

---

## Um produto, dois modos

O código do atlas-orbital é **especificação do problema, não fornecedor da
solução**. Dados e oráculos (efemérides, IAU, fixtures, testes) migram
verbatim. Runtime e UI renascem. Reescrever o que um oráculo externo já
protege adiciona risco sem ganho.

- A fase `atlas` é fase de verdade; o portal devolve o filme exato
  (`journeyT`, look, `leftDisk`, `paused`). Quem mexer no portal recontrata
  esses cinco. **E desde 23/08 (item 61) ele leva a CÂMERA nos dois
  sentidos:** entrar do filme POUSA na pose exata (`AtlasRig.pousar`), com
  o alvo derivado em três degraus — o corpo de que a câmera está mais
  perto, senão o Sol, senão o degrau **`céu`** (alvo no Sol, raio igual à
  distância do próprio observador). O fov corta para 35° atrás do véu. Sem
  filme atrás (`?atlas=1`, o botão da abertura) quem responde é a vista de
  abertura.
- **A VISTA DE ABERTURA é o SISTEMA INTERNO** — o candidato (a) que ele
  escolheu em 23/08, fechado no item 61. **E ELA NÃO É DEFINITIVA:** ele
  apontou na mesma noite que o contexto de abertura do NASA Eyes é melhor
  que o nosso (lá a vista é do sistema INTEIRO e ainda assim legível), e
  a escolha do (a) foi em parte FORÇADA pela dívida — a nossa vista larga
  era um nó de dez nomes sobre linhas de um pixel. **METADE DA DÍVIDA
  ESTÁ PAGA:** o item **82** (N1) pousou em 24/08 e o nó morreu — no teto
  do zoom, que é a vista larga, sobraram TRÊS nomes (o Sol, Netuno e
  Plutão) contra os 27 de antes. **A OUTRA METADE FOI PAGA EM 24/08:** o
  **83** (L2) trocou a linha de um pixel pela FITA de 1,25 px CSS, e as
  faíscas do serrilhado caíram **−81,2%** somando os cinco degraus da
  régua (−84,6% no melhor deles). Com as duas pagas, a vista larga
  vira contexto viável e **a pergunta da abertura se RE-JULGA**, com
  fotos lado a lado e decisão dele — é a conferência que agora espera
  (`capturas/item83-*`). O detalhe está no `PENDENCIAS.md`, na fila. A esfera enquadrada deixou de ser
  a órbita mais externa e passou a ser a **borda do sistema interno**
  (`BORDA_DO_SISTEMA_INTERNO`, a órbita de Marte): a câmera nasce a **~9,1
  UA** em vez de 226,84, e o item 77 acende ali as QUATRO linhas de dentro
  e só elas. O **teto do zoom continua em 226,84 UA** — ele sai de
  `orbitaMaisExterna`, não do raio enquadrado —, então a vista antiga
  virou um lugar aonde se CHEGA puxando a roda, em vez do lugar de onde
  não se podia sair. A DIREÇÃO de onde se olha continua saindo do corpo
  mais externo, e isso é decisão: pendurá-la em Marte faria a máquina do
  tempo girar o visitante em torno do Sol (687 dias contra 248 anos).
  **CONSEQUÊNCIA QUE SE VÊ, e por isso está aqui e não só numa
  docstring:** a porta `?d=` fala em RAIOS DO ALVO, e o alvo encolheu
  ~25× (226,84 ÷ 9,1 = 24,9). Um link com `?d=` copiado ANTES de 23/08
  pousa, portanto, **~25 vezes mais perto do Sol** do que pousava. É o
  preço de a régua ser relativa — a alternativa (régua absoluta) quebraria
  o `?d=` de todo alvo que não fosse a abertura —, e o espelho da URL
  reescreve o valor certo no primeiro gesto do visitante.
- Fase nova decide por mapa em `fases.ts`, não por cadeia de `if`.
- O Atlas herda o look do filme. Diferença de desenho entre os dois modos
  é defeito — decisão dele CUMPRIDA no M1: `claraoDoAtlas` saiu do código
  e os dois modos desenham igual.
- Um relógio só: luz, rotação IAU, nuvens, anel e eclipse leem o `jd` do
  Director. **E ele abre ANDANDO no Atlas desde 23/08 (item 61):** o modo
  é o relógio do visitante e nascia parado. As três portas que o calam são
  as três que pedem cena reprodutível — `?jd=`, `?shot=` e `?t=`; captura
  sem nenhuma delas nunca assenta pelo sinal, e está certo, porque a cena
  de fato não assenta. **Quem fotografa o Atlas pina `&jd=`** — foi assim
  que `memoria`, `atlas-smoke` (as provas de gesto) e MB1 (`zoomDeRoda`)
  se recompuseram.
- E DENTRO DO FILME esse relógio é do FILME (`jdDoFilme`, journey.ts): o
  instante do retrato até `REVEAL_T`, as 16:00 UTC do mesmo dia na coda,
  para o pouso sobre as Américas. O Atlas é o relógio do VISITANTE — e o
  preço declarado dessa fronteira é que voltar ao Atlas depois de passar
  pelo filme volta com a data do filme, não com a que ele escolheu. A
  porta `?jd=` do operador vence os dois. (Até 21/08 a troca só corria a
  partir de `REVEAL_T` e a data do Atlas atravessava o portal: 2035 nos
  atos, 2026 na coda, sem nada dizendo.)

O que ainda falta da fusão (Wikipedia, idioma, cinturões, Decisões 1 e 2)
está no `PLANO-ATLAS.md`. Não se relista aqui.

---

## Como medir

O gate de identidade (`ab-identidade.mjs`) é um **detector de regressão**.
Bit-idêntico não é objetivo nem aval, e nunca justifica desfazer melhoria.
Quando a mudança é intencional, o veredito é a imagem aberta, o diff de
pixel com sinal, e o rebaseline registrado.

As quatro vistas da abertura do filme (`sol`, `soldisco`, `solrampa`,
`solestouro`) só mudam de referência com o **sim do dono**, fotos abertas.
Isso não é bit-igualdade: é composição. A revogação de 11/08 não tocou
nesta regra.

A prova tem de tocar o que a mudança tocou. As vistas oficiais rodam com
`?shot=2` e **apagaram o HUD**. Trabalho de HUD é julgado por `a11y.mjs`
(`?shot=1`). Se nenhum juiz cobre a mudança, cria-se a vista que cobre.

As cegueiras declaradas — **a lista É a contagem, e por isso não há número
aqui**: esta linha dizia "três" com cinco itens embaixo, que é a errata de
sempre da casa (número decorado não acompanha lista que cresce). Quem
acrescentar uma cegueira acrescenta um item, e mais nada:

- **Movimento — ENCOLHEU em 22/08, e o que sobra está nomeado.** `?shot=`
  congela o relógio, e as 54 vistas oficiais são todas paradas. Quem
  enxerga movimento agora é `estabilidade-temporal.mjs` (MB1): sessão
  viva, relógio andando, HUD apagado por CSS em vez de `?shot=`, e o
  quadro comparado com o ANTERIOR REPROJETADO pela câmera conhecida.
  **O que ele COBRE:** fervura e cintilação entre quadros consecutivos
  (resíduo por pixel e energia em banda alta, contra o piso medido da
  própria pose) e identidade de fonte (§5.20 — re-semeadura, sumiço e a
  persistência de quem sai de quadro e volta), em nove famílias:
  aproximação ao Sol e a Sirius, pan, órbita, reversão, FOV, as duas
  fronteiras de promoção (o gate ponto→corpo do Sol e a cessão
  corpo↔ponto da Terra) e o zoom da roda (`zoomDeRoda`, 22/08 — a única
  que corre DENTRO do Atlas, pela porta do gesto). **O que ele NÃO cobre,
  declarado:** o filme andando (é a cegueira seguinte, e MB1 anda por
  poses, não pelo roteiro); a promoção partícula→catálogo da galáxia, que
  só existe depois do M6; o interior do clarão de um corpo próximo, que sai do
  resíduo por pixel e é julgado só por identidade; e o resíduo por
  pixel onde a paralaxe do passo passa de 1 px — em `aproxEstrela` isso
  suspende a família inteira e sobra a estrela-alvo; e
  **o céu que `pan` e `orbita` varrem, que não é fixo**: o passo das duas é de
  4 px, então o ALCANCE angular delas encolhe quando a janela cresce, e o
  veredito dessas duas famílias não é comparável entre janelas diferentes
  (achado em 25/08, item 81).
  **DUAS CEGUEIRAS DE LINHA DE ÓRBITA MORRERAM em 25/08, e a segunda deixou
  uma herdeira menor.** A primeira era o traço que se FUNDE com o núcleo do
  corpo (o planeta está sobre a própria elipse por construção algébrica, as
  duas luzes viravam uma componente só e o passeio do centroide era cobrado da
  âncora): morreu na TELA, com a cessão que o dono decidiu — a linha cede
  brilho no miolo aceso do corpo (`RAIO_DA_CESSAO_PX`). A segunda era o
  PEDAÇO de um traço partido — a regra do traço barra a linha inteira e não o
  fragmento compacto dela, e a cessão, ao cortar o laço em arcos, fabricou
  seis desses fragmentos: morreu no JUIZ, com a **faixa de instrumento**
  (`mascaraDasOrbitas`), que projeta a geometria REAL das fitas acesas e tira
  do veredito de identidade a componente cujo núcleo cai inteiro sobre o
  traçado. MB1 completo foi de 6 defeitos a ZERO sem afrouxar tolerância
  nenhuma; **10 a 11 fontes saem por instrumento de ~221 julgáveis** nas duas
  famílias que têm linha, e a conta é gravada no JSON do juiz
  (`censoDaFaixa`), não só impressa. **A HERDEIRA, e ela é maior do que a
  primeira redação admitiu:** a exclusão é geométrica, e o que protege uma
  fonte é TAMANHO, **nunca brilho**. Medido: uma gaussiana debaixo da faixa é
  calada com σ 0,85 e σ 1,2, e só escapa em σ 1,5 — enquanto o pico dela SOBE
  de 0,75 para 0,89. Como a PSF desta casa é σ 0,85 px, **qualquer estrela do
  campo exatamente debaixo de uma linha desenhada perde a identidade, por mais
  forte que seja**; a fronteira fica entre σ 1,2 e σ 1,5. O tamanho da cegueira
  é a área da faixa, gravada por passo: **1,17% do quadro em `zoomDeRoda`,
  0,35% em `fronteiraTerra` e ZERO nas outras sete famílias**, onde a camada
  não acende órbita nenhuma e o juiz é o de sempre. A âncora NUNCA é calada — a
  guarda salvou 1 âncora na corrida medida —, e o resíduo por pixel e a banda
  alta continuam medindo a linha: o que sai é a identidade, nunca a fervura.
  **A faixa cobre DEMAIS em três pontos declarados** (o miolo cedido pela
  cessão, a linha escondida atrás de um globo por `depthTest`, e o alfa, que
  ela ignora — fita a 0,008 cala tanto quanto fita a 0,56); um portão de alfa
  foi tentado e MEDIDO, e falha, porque o brilho de tela de uma linha vem do
  clarão do campo e não do alfa dela.
  **E A CEGUEIRA MAIS CARA É A DE SINAL, medida na própria pele em 25/08:
  o MB1 PREMIA CÉU MAIS ESCURO.** Ele mede o EXCESSO de resíduo sobre o
  piso, e um cobertor mais fraco tem menos pedestal para perder quando uma
  fonte cruza a borda — então apagar luz melhora a nota. Não é hipótese:
  a soma com recorte da faixa de guarda nasceu sem `premultipliedAlpha`,
  o céu saiu **28% mais escuro** (luz média 10,17 contra 14,10 bytes na
  vista `fov-0`), e o juiz aplaudiu — o resíduo do passo caiu de 3,80 para
  0,80 degraus. Passaria por melhoria se o controle de margem 0 não
  tivesse desmentido. **Regra que fica: melhora do MB1 acompanhada de
  QUEDA de luz do quadro é suspeita até prova em contrário, e a prova é
  uma vista parada com a luz medida** (o `luz-do-quadro` e a média de byte
  da captura). Hoje a guarda disso é `core/post.test.ts`.
  `voo-ida-e-volta.mjs`
  continua sendo outra régua para outra pergunta (ida e volta em 34
  degraus DISTANTES, cego a cintilação por construção) e não é juiz
  obrigatório desde 21/08 — ver a tabela de decisões fechadas.
- **O filme andando de ponta a ponta.** Nenhum juiz assiste 0→193 s no
  navegador: o `filme-ritmo.mjs` amostra 97 quadros PARADOS e o
  `filme-smoke.mjs` solta o relógio por 420 ms em sete instantes. A única
  varredura contínua a 60 fps é conta em Node (`cameraRig.test.ts`), sem
  GPU e sem pós. O filme inteiro continua sendo julgado pelo olho do dono.
- **Referência visual entre 1 e 40 UA.** As vistas `ua2`…`ua2000` existem;
  foto-oráculo nessa faixa, não (item 12).
- **O FPS É CEGO A CUSTO DE THREAD — medido em 24/08.** No M1, a 1200×900
  em cinema, o app anda a **36–42 fps** preso pela GPU: sobram ~25 ms de
  orçamento por quadro, e trabalho de JS de poucos milissegundos se
  ESCONDE inteiro atrás da folga. Um A/B de quadro não o enxerga — e não
  enxergar não é não existir. Quando a mudança é de CPU (React, HUD,
  `setState`), a régua é o relógio da própria thread:
  `Performance.getMetrics` do CDP devolve `ScriptDuration` acumulado, e a
  conta é **ms de JS por segundo** entre dois estados da MESMA página.
  Foi assim que o mostrador do relógio ao vivo foi pego custando 13,8 ms/s
  com a ficha fechada e 16,7 ms/s com ela aberta, com o fps IDÊNTICO nos
  dois lados. Quem julgar custo de HUD por fps nesta máquina vai concluir
  "não há gargalo" de um trabalho que existe — o mesmo modo de errar da
  medição de 2026-07-31 que o `gpu-profile` já documenta.
- **E O CONTROLE TEM DE MUDAR SÓ O QUE SE MEDE.** Na mesma medição,
  `?jd=EPOCA` parecia o controle óbvio para "relógio parado" e é
  ARMADILHA: ele troca a efeméride viva pelo retrato congelado, ou seja
  muda a CENA junto com o relógio — medido assim, o lado "parado" saiu
  **mais LENTO** que o vivo (34,3 contra 49,6 fps), que é o contrário do
  que a hipótese dizia. O controle honesto foi ligar e desligar o relógio
  na MESMA página, pelo gesto (`alternarAoVivo()`), com a vista e o
  instante parados. Régua de A/B: se o controle mexe em duas coisas, ele
  não é controle.

Como rodar — e quanto cada um cobra. `npm run dev` primeiro: todos falam
com o dev server em `127.0.0.1:5173`. Os minutos são MEDIDOS nesta máquina
em 21/08, com o servidor já no ar; noutra máquina são ordem de grandeza,
nunca oráculo. Escolher qual rodar é a regra que já está escrita — a prova
tem de tocar o que a mudança tocou —, e a coluna do preço é o que faltava
para escolher com honestidade. **Três preços foram remedidos em 22/08**,
depois de a navegação (item 73) e o selo (item 61) engordarem os juízes
que os cobram: `atlas-smoke` 5,6 → 7,4 min, `a11y` 2,6 → 4,5 min e
`busca-smoke` 1,5 → 1,9 min. Preço que envelhece cala sobre o próprio
custo, e a coluna existe para escolher — não para consolar. **O item 74
engordou dois deles em vereditos e não em minutos** (medido em 22/08): na
parte A `a11y` foi de 209 a 238 e `busca-smoke` de 31 a 33; na parte B
`busca-smoke` foi a **35** (a ficha de Sirius) e o `a11y` ficou em 238 —
o que mudou nele não foi a conta, foi o ALVO: as 12 medidas de área da
ficha passaram da Terra para MARTE, porque a Terra é o observador, não
ganha a seção "no céu" e era portanto a ficha mais BAIXA que existe. Os
dois seguem em 4,5 e 1,9 min. **E o item 62 engordou o `a11y` de verdade**
(medido em 23/08): 238 → **539** vereditos e 4,5 → **6,1 min**, porque **301**
deles são a perna do CELULAR, que abre o modo inteiro em 390 e 320 px nos
três degraus de `?ui=` — antes disso nenhum juiz da casa abria um
aparelho.
**ERRATA DE 24/08, e ela vale como aviso sobre contagem decorada.** O
número acima (539) é o do dia em que foi escrito e ficou parado; o
commit das tarjas (`b86f00c`) declarou "539 → 567, 28 novos" e errou nos
TRÊS números — o diff dele soma 14 vereditos, e a base de onde ele
partia já era 550, não 539. A conta que fecha é **550 → 564** (as tarjas)
**→ 567** (os retoques de `d2d6e6c`), e **567 é o que a corrida mede
hoje**. A lição não é o número: é que contagem de veredito só vale
CONTADA na corrida, e é por isso que quem a escreve tem de rodar o juiz
antes de digitar.
**A etapa 2 do 62 fechou o censo em 23/08**: os 28 últimos do
`a11y` (o céu cobrado nos seis cantos da faixa nova e o convite do
telefone), `atlas-smoke` **131** (eram 114: a pinça de dois dedos, o
toque que escolhe e o toque duplo que voa, todos a 390 px) e
`busca-smoke` **37** (eram 35: o dedo abrindo a paleta pela alça ⌕). Os
três passaram a vestir APARELHO, e o preço quase não mudou — o telefone
custa segundos, não minutos.

**E O INSTRUMENTO DE TOQUE TEM DOIS LIMITES MEDIDOS, os dois em 23/08 e
os dois escritos nos gates que os sofreram.** (1) Depois de uma
sequência de DOIS dedos, a primeira navegação da sessão MATA o emulador
de toque do Chrome — calado: `dispatchTouchEvent` deixa de produzir
`pointerdown` nenhum enquanto o mouse continua chegando e
`navigator.maxTouchPoints` continua 5. Desligar e religar o toque,
limpar e repor as métricas, navegar de novo: os três remédios foram
medidos e os três falham. Por isso a PINÇA é sempre a ÚLTIMA prova de
um arquivo. (2) Cada `Input.dispatchTouchEvent` custa uma ida e volta de
CDP, e com a cena do Atlas ocupando o processo o gesto sintético passava
de meio segundo — que o app classifica, com razão, como "segurar". Os
três eventos de um toque vão JUNTOS ao navegador (`Promise.all`, mesma
fila, mesma ordem), e aí o gesto dura microssegundos. Nos dois casos a
prova reprovava o produto por conta do instrumento; nos dois, o
instrumento tem agora a sua nota.

| Juiz | O que mede | Custo | Quando roda |
|---|---|---|---|
| `ab-identidade.mjs antes` / `depois` | md5 das **54 vistas** oficiais, um lado de cada vez — detector de regressão. Desde 24/08 (item **83**) duas delas têm CORPO EM FOCO (`foco-jupiter` e `foco-luas`): as outras 52 cravam a câmera com `?pos=` ou `?t=`, que é voo livre, e por isso o gate era CEGO a tudo que só muda a cena quando há foco | **7,1 min por lado** (54 vistas × 2 capturas, `JOBS=3`) | fechamento de qualquer mudança que possa mover imagem |
| `SMOKE=1 ab-identidade.mjs …` | as 4 sentinelas (`sol`, `soldisco`, `hero8`, `ua150`) | **0,8 min por lado** | enquanto se itera — nunca para fechar |
| `atlas-smoke.mjs` | o portal do Atlas em pixel: ida e volta com `journeyT` exato, prontidão da fase nova, abertura reprodutível (as três do filme e a porta da abertura, item 60), o Sol pela data e a NAVEGAÇÃO inteira (item 73: a roda dá zoom sem trocar o alvo, o piso e o teto seguram, `?d=` faz a ida e volta pelo escritor vivo, um clique escolhe com a câmera parada e o duplo mergulha, e OS NOMES em DOIS endereços — desde 24/08 (item 82) eles medem a RÉGUA DE RELEVÂNCIA que revogou a promessa do item 73: na abertura OITO nomes contra 22 (os quatro corpos e as quatro estrelas de NOME PRÓPRIO, as duas listas pinadas pelo nome desde 24/08, zero designações de Bayer) e no TETO do zoom TRÊS contra 27, com o avesso — nenhuma estrela de fundo toma a vaga de um corpo, e o menor peso que ficou vale o maior que a régua cortou) — e os GESTOS DE DEDO num aparelho de 390×844 (item 62, 23/08: a pinça de dois dedos aproxima e afasta sem trocar alvo, foco nem degrau; o toque escolhe mesmo andando 12 px, e a câmera NÃO anda com ele; o toque duplo voa) — e o PORTAL LEVANDO A CÂMERA (item 61, 23/08: três entradas dão TRÊS vistas, cada uma num degrau do pouso, com a posição atravessando o portal — bit-idêntica na coda — e o fov cortando para 35°) — e a GAVETA com a décima nona camada (item 77, 23/08, as linhas de órbita; item 82, 24/08, os nomes na tela — as duas entram na conta das famílias e trocam ao vivo como as outras) — **146** vereditos | **7,4 min** | portal, fases, enquadramento do Atlas, calendário do Sol, gestos, rótulos |
| `estabilidade-temporal.mjs [família…]` | MB1: fervura e re-semeadura entre quadros CONSECUTIVOS com o relógio andando, depois de reprojetar o quadro anterior pela câmera conhecida — 9 famílias, 97 passos, tolerâncias declaradas no cabeçalho (§5.17/§5.20); a 9ª (`zoomDeRoda`, 22/08) é a única que corre DENTRO do Atlas, pela porta do gesto. **O quadro é 1128×1080 e é EXATO** desde 25/08 (item 81): a altura é a de calibração da PSF (`ALTURA_DE_CALIBRACAO_DO_SIGMA_PX`), a única em que a aritmética de fase do juiz é verdade, e ela é fixada por `Emulation.setDeviceMetricsOverride` — pedir janela e medir a viewport descontada da moldura foi o que pôs 14 acusações falsas no item 81 | **3,9 min** a corrida inteira · ~0,4 min por família | qualquer coisa que só apareça em MOVIMENTO: campo procedural, PSF, crossfade, clarão, histerese, fronteira de promoção |
| `memoria.mjs` | vazamento em número: texturas, **bytes de texel**, geometrias, heap e workers vivos em 5 idas ao Atlas, 3 trocas de tier pelo caminho vivo e 5 focos. Autovalida-se — `--sabotagem` TEM de reprovar | **2,9 min** por tier | troca de tier, entrar/sair do Atlas, foco, carga em worker, **dose de textura** |
| `a11y.mjs` (`?shot=1`, e SEM o pino na prova da folha; a perna do CELULAR mora em `a11y-celular.mjs` desde 23/08 e é chamada daqui — uma corrida só, uma sessão de Chrome só) | 567 vereditos — os diálogos do HUD: o foco entra, fica preso, Esc devolve; nenhum diálogo órfão; escala de UI em três telas; a ABERTURA — as três portas com a sua linha, a mesma tinta nas três, o Tab na ordem da tela e nada fora dela (desde 22/08, item 60); e o CONVITE DO ATLAS — quatro passos, furo no pedaço real da dica, chave `conviteAtlasVisto` própria (desde 22/08, item 73); e o SELO DE HONESTIDADE — a linha fechada com os dois eixos, `aria-expanded`, as três saídas da gaveta (clique, Esc sem subir a escada, clique fora), os culpados nomeados na tela, o TETO de UMA LINHA de altura e a gaveta de camadas que NÃO cobre o selo (desde 22/08, item 61); e a GAVETA DE CAMADAS nos DOIS modos — 19 caixas com rótulo (a décima oitava é o item 77, as linhas de órbita; a décima nona é o item 82, os nomes na tela), três famílias que as repartem, e a contagem de cada uma batendo com as caixas marcadas (desde 22/08, item 61); e o CHROME DO FILME que some sozinho — pausado nunca some, correndo sai em 3 s com a CAIXA no lugar e o ponteiro desligado, o rodapé (legenda + dica) fica, e o primeiro movimento do ponteiro o traz de volta (desde 22/08, item 61); e a FICHA DO OBJETO — as seções dobram com `aria-expanded` e o corpo de cada uma entra e sai do DOM, a primeira nasce aberta, a área a 390×844 e 320×568 nos três degraus de `?ui=` fica abaixo de metade da tela (medida em MARTE, a ficha das sete seções — a mais ALTA que existe; era medida na Terra, que não tem "no céu" e é a mais baixa), a ficha não cobre o selo e cabe inteira na janela, e o foco da paleta passa para ela quando o Enter escolhe um alvo (desde 22/08, item 74); e o HUD DO CELULAR — a primeira perna da casa que abre o MODO inteiro num APARELHO (`mobile: true` + toque emulado, não só janela estreita), a 390×844 e 320×568 nos três degraus de `?ui=`: as alças no pé (4 sem seleção, 5 com, todas declaradas, UMA linha só, alvo de toque de 44 px em ui=1), a folha de baixo das CINCO gavetas (borda a borda, sem cobrir o selo nem a alça, ≤48% da tela, uma por vez), a subida de 260 ms medida pelo relógio da PRÓPRIA animação e SEM o pino (`?shot=1` zera toda animação), as TRÊS saídas (a alça com o nó `inert` descendo, o Esc, e o toque no céu provado dos dois lados no mesmo pixel) a QUEBRA de 760/761 em que o CSS e o TypeScript têm de virar juntos, o CÉU cobrado nos SEIS cantos da faixa nova (dois aparelhos × três `?ui=`, declarado ≥ medido, com a meta impressa) e o CONVITE do telefone, que deixou de ser pulado no dia em que a pinça passou a existir (desde 23/08, item 62) — 301 dos vereditos são dele, contados na corrida; e as DUAS FERRAMENTAS DO ATLAS (item 61, 23/08: ▶ Ver o filme e ↗ Explorar na barra, o Tab na ordem da tela, a saída ↩ Voltar ao filme só com filme atrás, o "Ficar aqui" do véu do fim pousando na coda, e a tarja de cima em UMA linha nos quatro cantos do telefone) — **567** vereditos | **6,1 min** | HUD, diálogo novo, escala de texto, abertura, convite, selo, camadas, chrome do filme, ficha do objeto, HUD do celular |
| `filme-smoke.mjs` | o roteiro na tela: texto e corte nas margens das 25 janelas de legenda, responsividade, e o relógio solto em NOVE instantes — o veredito é "andou?", com a taxa publicada como registro, nunca "andou X s em 420 ms de parede" (item 76, 22/08) | **2,6 min** | legenda, corte, retemporização, responsividade |
| `filme-ritmo.mjs` | quanto a imagem muda por segundo no corte inteiro — 97 quadros parados — mais as folhas de contato | **~2,3 min** no passo padrão (extrapolado de 10 quadros em 0,3 min) | revisão de ritmo, e só como onde-olhar: a curva não mede tédio |
| `busca-smoke.mjs` | a paleta de busca, o `?foco=` e o `?d=`: os dez corpos, a ida e volta pelo escritor vivo da URL (com a DISTÂNCIA dentro desde 22/08), latência por tecla, o atalho de teclado, o par clique/duplo clique num corpo, e a FICHA DO OBJETO que abre com o alvo escolhido — "Titã" na paleta abre a ficha dele com a distância a Saturno, `?foco=` que não acha não abre ficha nenhuma, e a ficha de SIRIUS diz a designação de Bayer, a distância em anos-luz e a temperatura derivada da cor (desde 22/08, item 74), e o DEDO abrindo a paleta pela alça ⌕ num aparelho de 390×844, com a folha de borda a borda e o campo focado (desde 23/08, item 62) — 37 vereditos | **1,9 min** | busca, deep-link de foco, rótulo clicável, gestos do Atlas, ficha do objeto, ficha de estrela |
| `luz-do-quadro.mjs [ua…]` | quanto do quadro está lavado e o diâmetro do borrão contra o disco real e o clarão de direito, na escada de 11 distâncias; `julgarEscada` dá o veredito. **`PERNA=atlas` roda a MESMA escada DENTRO do modo** (item 61, 23/08), pelo endereço do próprio Atlas — lente de 35° na conta, piso de faíscas por lente e SETE dos onze degraus, porque o `tetoDeZoom` do rig para em 255,54 UA e os outros quatro são distâncias em que o modo não põe a câmera | **1,0 min inteira · 0,1 min por degrau** | exposição, bloom, clarão, qualquer coisa perto do Sol |
| `planeta-pixel.mjs [vista]` | se a luz que a camada dos planetas acende cai onde o `?dbgplan` mandou, a ≤0,5 px, por dois estimadores — lente `&nobloom=1&noclarao=1` e caixa de MEIA-ALTURA desde 22/08 (item 58a) | **0,4 min por vista** (as três ≈ 1,1 min) | camada dos planetas, fotometria dos corpos |
| `sky-capture.mjs [tag]` | o céu interno contra o panorama ESO: 6 faces costuradas e os cinco termos da régua | **0,7 min** | céu, poeira, catálogo visto de casa |
| `voo-smoke.mjs` | o voo livre: convite, furo do Spotlight ancorado, captura de ponteiro opt-in, backoff, soltura de teclas | **0,6 min** | voo livre |
| `z-fighting.mjs` | pixels que ALTERNAM sob jitter sub-pixel (Terra × nuvem, Saturno × anel); limiar zero, com sabotagem que tem de reprovar | **0,5 min** | superfície colada em superfície, near/far, depth |
| `rodada.mjs <n> "nota"` | as duas vistas da galáxia contra as referências, e **escreve a linha** no ledger `docs/reference/EVOLUCAO.md` | **0,3 min** | mudança na galáxia (a última linha do ledger é a **44**, de 22/08 — o M5) |
| `gpu-profile.mjs "?q" s w h dpr` | o tempo que a GPU passa DENTRO de cada draw, passe a passe, por timer query | **0,2 min** com janela de 8 s | performance, custo de pós-processamento |
| `diff-pixel.mjs a.png b.png` | depois de um `DIFERE`: quantos pixels, de quanto e onde, com mapa de blocos 16×16 | segundos | sempre que o A/B der diferente |
| `voo-ida-e-volta.mjs` | ida e volta em 34 degraus na MESMA sessão — o único que enxerga transição e histerese | **1,0 min** (eram 9,3, e 8,1 deles eram espera cega pelo forno do Sol a 0,05 UA; a espera passou a contar bordas por quadro em 22/08 e fecha em 2 s) | só quando a mudança for de transição ou histerese — não é obrigatório desde 21/08 |

- **`memoria.mjs` conta BYTES desde 22/08, e roda por TIER.** A régua de
  objetos era cega para o que mais pesa: o próprio comentário dela
  admitia que cinema tem o mesmo número de texturas que alta, e ela
  rodava só em `alta` — ficava verde com 1,2 GiB residentes. Agora
  percorre a cena somando largura × altura × 4 × 4/3 de mipmap e cobra
  um teto DECLARADO por tier (`TETO_MIB`). `TIER=cinema node
  scripts/visual/memoria.mjs` mede onde os texels dobram, e a volta da
  troca de tier passou a ser ao tier da medida (era sempre `alta`).
  Medido em 22/08: pico de 139 MiB em `alta` (teto 200) e 683 MiB em
  `cinema` (teto 900). **E ele estreia o EPISÓDICO antes da linha de
  base.** `renderer.info.memory.geometries` conta o que já foi
  DESENHADO, não o que existe, e a ejeção de massa do Sol
  (`world/sol/cme.js`) nasce invisível e só aparece por sorteio: em
  cinema ela caiu na quinta volta ao Atlas e o veredito do portal
  acusou `delta 3` de vazamento onde não havia nenhum (item 67). Agora
  o juiz dispara uma ejeção pelo emissor canônico (`ctx.launchCME`, a
  porta que o `cme.js` reserva à QA) dentro do primeiro ciclo, do lado
  do FILME — no Atlas o Sol está longe e as três malhas não chegam ao
  renderer —, e a linha de base já nasce com elas: 45 → 48 nos dois
  tiers, e os cinco ciclos param em 48.

- **O `atlas-smoke` foi de 101 a 113 vereditos em 22/08**, e dois números
  de mensagem de commit ficaram errados no caminho — ficam corrigidos
  AQUI, que é onde o número vivo mora, e não por reescrita de histórico:
  `faa66ba` diz "102 vereditos" e aquele commit não toca o script (eram
  101); `59b099e` diz "111" e a corrida daquele código deu **108**. Os
  três números que foram MEDIDOS na rodada, cada um na sua corrida: 105
  (`71d0f90`, o zoom da abertura), 108 (`59b099e`, o `?d=`) e 113
  (`c8507ba`, o fecho). **Hoje ele dá 114** — medido em cinco corridas
  seguidas de 22/08, e o veredito que faltava na conta veio depois do
  fecho da rodada.

Duas coisas que mudam o preço e não se adivinham:

- **A retomada de disco não atravessa mais uma edição.** Cada lado grava,
  ao lado dos md5, o CARIMBO DO CÓDIGO que os produziu (commit + árvore
  suja); carimbo diferente é estado de outro binário e é descartado, com
  linha na tela. Era daqui que saía o `depois` inteiro em `(de disco)` —
  custo igual, prova nenhuma —, e o único remédio era alguém lembrar do
  `DOZERO=1`. Ele fica de pé como força bruta: recapturar o MESMO código.
  O veredito passa a imprimir os dois carimbos, e **0 vistas julgadas não
  é mais "bit-idêntico"** — é veredito inválido, com saída ≠ 0.
- **As contas puras vêm de graça.** `ab-identidade`, `chrome`,
  `estabilidade-temporal`, `luz-do-quadro`, `planeta-pixel` e
  `z-fighting` têm cada um o seu `.test.mjs`, que julga o molde sem
  subir Chrome e roda dentro do `npm test`.
- **MB1 não usa `?shot=`, e é por isso que ele existe.** A porta congela
  `time` em zero, que é exatamente o que um juiz de movimento não pode
  ter. Para o HUD não entrar na foto, o harness injeta a MESMA regra CSS
  do `.bare-mode` (`.hud-root > *:not(.scene-canvas)`) que o `?shot=2`
  usa — a cena desenha igual e o relógio segue andando. Sem isso a capa
  da abertura (`cv-veil`) ainda cobre a cena por alguns segundos DEPOIS
  de a prontidão fechar, e a foto sai da capa, não do mundo.

O harness espera `window.__director.captura.pronto`. Sem isso cai no teto
de 700 quadros e, no alvo padrão, **sai com status ≠ 0**. Chrome morre
pelo perfil (`matarPerfil`), nunca pelo nome. Gate de imagem **pina**
`?q=cinema`. Perto do Sol, A/B só com `&nobloom=1` — com bloom, `ua150` e
`ua40` devolvem md5 iguais com céus diferentes. **E desde 25/08 esta linha
é verdade:** até então `?nobloom=1` apagava só o bloom principal e o
cobertor do campo seguia inteiro (item 72), então quem lia aqui acreditava
estar sem bloom nenhum e não estava — a porta mudava 0,49% da luz do
quadro. Agora apaga os DOIS passes, e a mesma vista muda 31,4%
(`capturas/item72-nobloom-antes-depois.png`).

Holds do gate externo: o MEIO dos holds de perfil e face-on, com o roll
assado do rig antigo. O que descompara o histórico é mexer no QUADRO
(posição/mira/fov/roll, `GATE_*` do journey.ts); os instantes derivam do
corte e mudam com ele — réguas e juízes leem os vigentes em `CAPTURE_T`.

A régua do céu tem cinco termos (espessura, perfil, fenda-curva, púrpura,
cor). Números de antes da mudança de régua de 2026-08-06 **não se comparam**
com os de hoje. `bojoAnti` só afere o stretch, não entra na soma.

Os valores esperados vigentes desta GPU (merge de 2026-08-13, 1800×1713)
estão no ledger [`docs/reference/EVOLUCAO.md`](reference/EVOLUCAO.md),
seção “baseline vigente”. Noutra máquina servem só como sinal de que a
captura assentou, nunca como oráculo.

`forgetau` fica **desligado** — a razão e a condição de reabrir moram na
tabela de decisões fechadas, uma vez só.

Sagittarius A* é passe de pós, só a <2,4 kpc do centro. Custo zero de
longe. A escala artística (RS 0,05 pc ≈ 125.884× o real) é dívida de
corpo — item 13.

---

## Sol e escala

O núcleo em `world/sol/` é vendorizado do Novo-Sol-Fable-3d. Corrigir bug
do núcleo = corrigir lá e re-copiar. O wrapper é nosso. Ponte assume peça
ausente (`subToggle`, `meshes` nulos). Divergências declaradas no próprio
`sol/sun.js` (levar na re-cópia): `smoothstep` de bordas invertidas e o
teto do `mu`.

Não se instancia um segundo `StellarBody` enquanto `SUN_RADIUS = 2.2`
viver como literal nos vendorizados e `cme.js` capturar a câmera na
criação.

**Regra de escala, testável:** quem tapa o que está atrás (escreve
profundidade) tem raio físico real. Quem só brilha por cima pode ter
tamanho de instrumento — e se declara. O cadastro vive em `escala.ts`,
não neste arquivo. O Sol já está em fator 1. Sobra Sagittarius A*.

`RAIO_SOL_PC` é a fotosfera (`escala.ts`). `R0_PC` é a distância
Sol–centro (`frameGalactico.ts`). Não são o mesmo símbolo.

**DOIS RELÓGIOS, e a distinção é lei (21/08, item 5).** O RÁPIDO é tempo
de TELA (`ctx.elapsed`): granulação, rotação, coroa, flares,
proeminências. Ele acumula, e é honesto que acumule — mas só **com o
corpo em quadro**: fora dela ele para, senão o Sol reaparece com um salto
de tudo o que "viveu" sem plateia. O LENTO é a **data simulada**: a fase
do ciclo de 11 anos, as regiões ativas e os grupos de manchas. Ele NÃO
acumula — é função pura do calendário (`faseDoCiclo`, atrás de
`estrela.ts`), e é por isso que o relógio do Atlas anda para trás de
graça. Pendurar o lento no rápido foi o defeito que congelou o Sol do
Atlas no máximo solar; pendurar o rápido no lento congelaria o Sol nos
193 s do filme, em que o jd é fixo.

**A âncora do ciclo é declarada:** mínimo do ciclo 25 em 2019-12 (SILSO),
máximo em 2024-10 — daí a subida de 4,83 anos contra a descida de 6,20,
num período médio de 11,03. A assimetria mora no mapa data→fase; o
envelope de atividade do núcleo continua simétrico e com a calibração
intacta.

**O filme não torce a fase: ele DOSA a ocupação.** O arranque mostra
menos atividade do que a data pede (`doseDaDramaturgia`,
`director/doseDoSol.ts`), e isso é assistência DECLARADA — linha própria
no `selo.ts`, menção no cadastro. Fora da viagem a dose é 1 EXATO, e
multiplicar por 1,0 é bit-exato: sem dose e com dose plena desenham o
mesmo Sol. Um segundo relógio de fase "só do filme" é o segundo universo
com outro nome — não se faz.

**Nunca integrar o Sol para trás.** Data nova = re-semear + repetir a
contagem FIXA de passos (os mesmos do `prime`), fatiada por quadro e
coalescida. Integração reversa de campo difusivo não é opção; o que
garante a mesma chegada por qualquer caminho é a igualdade da contagem.

Proibido: teto de brilho. Proibido: exposição que depende do que está em
foco. A pupila adaptativa está reprovada pelo dono (enterrada no M2; era
lápide). O que entra no lugar é compressão **fixa** na emissão — contrato
em `LEI-DA-ESTRELA.md` §7. O céu e a galáxia nunca esmaecem.

---

## Ajustes: nada recarrega — e ninguém decide pelo visitante

Régua do dono: nenhuma opção do painel recarrega a página. **A seção
inteira virou produto em 20/08** — a A fechou as camadas e o latch da
exposição, a B pôs a cadeia de carga no worker, a C matou o último
reload (o da qualidade) e a D pôs o Auto como 4º estado do seletor. O
que fica aqui é só o que ainda decide alguma coisa.

**ONDE A CAMADA MORA, decidido em 22/08 (item 61):** na GAVETA, e só
nela. O dono: *"atlas - camadas e ajustes concorrem. vc nao acha que
varios elementos que hj estao em ajustes na verdade deveriam ser
camadas?"*. As 17 de então estavam DENTRO dos Ajustes (17 dos 32
controles) e a gaveta do Atlas mostrava 6 das mesmas — duas portas para
uma tabela. A gaveta passou a mostrar TODAS (19 desde o item 82, e o
número deriva da tabela) em três famílias com contagem, a existir
em toda fase com barra de controles (filme, voo livre e Atlas) e o
painel ficou com 15 controles. O que esta seção decide — nada recarrega;
detecção nunca decide, medição sugere, o visitante escolhe — continua de
pé e vale na gaveta como valia no painel.

**A LEI QUE A D DEIXOU, e ela é política, não mecânica:** *detecção
nunca decide; medição sugere; o visitante escolhe.* Sem `?q=` o tier é
uma CONSTANTE (`TIER_DE_PRODUTO` = cinema) — não há storage nem palpite
sobre o aparelho no caminho do boot, e a lápide dos três que morreram
está no arquivo onde cada um vivia — `defaultQualityForDevice` e
`tierQueRodou` em `core/engine.ts`, o campo do storage em
`lib/preferencias.ts`, o rebaixamento por renderer de software em
`lib/glProbe.ts`. O engine MEDE e avisa (`onMedicao`); quem aplica é o
Director, e só sob a política `auto`. A URL espelha a ESCOLHA, nunca o
tier vivo: em Auto o tier anda sozinho, e gravar o tier de agora
congelaria no link uma decisão que o visitante não tomou.

Knob que decide alocação lê-se **antes** de quem aloca — e, quando a
alocação é preguiçosa, lê-se **na hora de alocar**: é por isso que o
tier dos corpos do palco entra como FUNÇÃO (`montarCorposDoPalco`).
Teardown que falha não leva os outros junto (`passoBlindado`).

**O que a C deixou de pé, para quem for mexer no assunto:**

- **O `prime` do Sol é o pior bloqueio do swap** — medido por Long Tasks
  em `memoria.mjs` (registro no fim do run): 136 ms nesta máquina em
  21/08, contra os ~230–330 ms anotados em 20/08 noutra carga. É um bloco
  único dentro do construtor de `StellarBody`. O item 5 NÃO o fatiou (e
  não o piorou: 137 ms depois da rodada), mas construiu a máquina que
  vai fatiá-lo — o `passoDoReassar` já roda a MESMA semente e a MESMA
  contagem de passos repartidas no orçamento de quadro. O bake das
  lâminas, que era a outra metade, já vai FATIADO por lâmina (~70 ms
  cada, sete fatias) e a primeira renderização do mundo novo custa
  ~130 ms de upload de VBO, inerente.
- **Corpo do palco JÁ carregado guarda os pixels que tem.** Refazê-los
  na troca foi tentado e medido em 20/08: a Terra em close-up vira
  ponto por ~2 s enquanto a textura do tier novo vem pela rede — o véu
  que a letra C proíbe. Quem carregar DEPOIS da troca obedece ao tier
  de agora. Se um dia isso incomodar, o conserto é double-buffer POR
  CORPO (segurar a textura velha até a nova chegar), não reconstrução.
  Desde a dose de 22/08 (logo abaixo) isso vale para MUITO menos gente:
  quem não está em foco está `fria` na hora da troca e nasce no tier
  novo sozinho.
- **A DOSE DO PRÉ-AQUECIMENTO é por CORPO, e o gate manda no resto**
  (22/08). Era um booleano só — `palcoQuente` — valendo para os doze, e
  o preço estava medido: abrir o Atlas em cinema deixava residentes
  **1.200 MiB de texel** (1.146 deles de corpo; 38 texturas, 36,5 MiB
  baixados) sem o visitante chegar perto de nada, e a coda do filme
  fazia o mesmo a partir de REVEAL_T com os dez corpos que ela nunca
  resolve. Hoje pré-aquecem: no Atlas, o corpo EM FOCO e, se o foco é
  uma lua, o pai (o degrau da lua enquadra os dois); no filme, TERRA e
  LUA a partir de REVEAL_T, e só elas. Medido depois: o Atlas sem foco
  abre com **0 texel de corpo** (54,1 MiB, que são a galáxia e os dois
  mapas) e `?foco=terra&ver=corpo` fica em 582 MiB contra 1.216.
  **O NÚMERO QUE AUTORIZOU**, com o cache HTTP desligado e o
  pré-aquecimento desligado: um corpo sozinho vai de `fria` a `pronta`
  em **90–113 ms**, e na descida ao degrau do corpo o gate de 4 px arma
  **222–479 ms** antes da chegada da câmera — a textura pousa **124 a
  230 ms ANTES** do fim da rampa (Marte, Terra, Saturno). O gate acorda
  cedo o bastante; o pré-aquecimento fica só para quem o visitante já
  declarou querer ver. E os juízes de imagem não afrouxam: corpo armado
  sem textura segura a captura (`friaNoGate`), então a vista sai a mesma,
  só mais tarde.
- **O Sol novo nasce com o relógio RÁPIDO em zero e o LENTO na data
  viva.** Trocar de tier troca a resolução da simulação da granulação
  (768×384 ↔ 384×192): a superfície é necessariamente outra, não há como
  o padrão continuar. Sob `?shot=` o relógio rápido é 0 dos dois lados, e
  é por isso que o gate sai bit-idêntico. A fase do ciclo, essa, viaja:
  o construtor recebe `faseDoCiclo(jdVivo)` para que o `prime` asse o
  retrato na data certa — sem isso, toda troca pagaria um re-bake.

**E o que a D deixou de pé:**

- **A medição só sabe do tier que está rodando.** A sugestão é um degrau
  a partir do vivo (limiares 42 e 34 quadros/s, os do auto-quality que
  morreu), e a média recomeça a cada troca — média do tier que saiu não
  diz nada sobre o que entrou. Daí o "medindo" do painel ser verdade e
  não enfeite.
- **Vaivém no Auto é possível e está dosado, não resolvido.** Um
  aparelho que fica na fronteira pode cair e subir com período de ~17,5 s
  (a espera anti-vaivém: 15 s depois de cair, 10 s depois de subir).
  Cada volta paga um mundo assado. Se incomodar, o conserto é a espera
  crescer a cada vaivém, não o limiar mudar.
- **O pino `?q=` dos gates virou DECLARAÇÃO.** Era defesa contra o
  rebaixamento automático; hoje `?q=cinema` é o mesmo que o padrão. Fica
  porque gate não vive de padrão alheio.

---

## Decisões fechadas

Não reabrir sem que a condição listada mude.

| Decisão | Por quê | Reabre se |
|---|---|---|
| O Atlas vive aqui; o código do atlas é espec, não fornecedor | Testemunho do dono + crítica arquivo a arquivo | Uma linha específica da matriz, com arquivo aberto e medição |
| Mais que um SpaceEngine: 1:1 onde dá; visibilidade por fotometria; artifício só no instrumento | Decisão do dono na Onda 4 | Decisão do dono, nunca por conveniência técnica |
| Octree: não | O VBO é estático; a árvore podaria ~3,7% ao custo de ~193 draws | Conjunto estático > 2 M pontos **e** `WEBGL_multi_draw` |
| Floating origin: reconstrução relativa à câmera, não rebase global | Cascas reconstroem por célula; nenhum operando de kpc no caminho da posição | Outra camada resolver geometria perto da câmera longe do Sol |
| Log-depth: não | Onda 6 entrou geometria resolvida e o dono redecidiu não (near na superfície mais próxima) | O dono pedir; critério AAA |
| LUT de cor (Mamajek / CIE 401): não | O ajuste de 3 mads em `common.ts` tem RMS 0,009 | Precisão exigida abaixo de 2500 K ou acima de 40 kK |
| Saturação/lift no pós para “consertar” cor: não | Maquiagem. Cor emerge da física | — |
| Reduzir vértices para ganhar quadro: ⚠ reaberta | A nuvem custa ~31% do quadro; isso **não** autoriza podar pontos — contagem é imagem | — (já reaberta; entra como troca imagem×quadro, dose medida) |
| `forgetau` desligado | Dosagem edge calibrada sem extinção nas forjas | Re-dosagem conjunta medida |
| A ida e volta não é mais juiz obrigatório | Dono em 21/08: *"essa viagem ida e volta não é mais relevante"* — o run inteiro cobrava horas | A mudança ser de transição ou histerese: aí `voo-ida-e-volta.mjs` volta, como instrumento |
| Pupila adaptativa: não | Dono: o campo estelar nunca esmaece. Medido: 16 stops ao focar Sirius | — |
| A UI/UX vai ser revista | Dono em 21–22/08. O que ainda DECIDE: separar Ajustes em visitante × laboratório ele **recusou**; o celular ganha controles menores e escondidos que expandem (o drawer do projeto Atlas); e das três respostas do canvas (*"1) 3 botoes iguais 2) somem sozinhos 3) vira alça"*) as três viraram código: a 1 e a 2 em 22/08 (item **61**) e a 3 em 23/08 (item **62**, os CONTROLES do telefone — alças no pé, folha de baixo, três saídas). O **62** FECHOU INTEIRO em 23/08 e saiu do `PENDENCIAS.md`: a etapa 2 deu ao telefone o retângulo útil dele (céu à câmera de 44,5% para 77,0%), a PINÇA de dois dedos, que não existia em toque, e a régua do DEDO nos limiares de clique. As duas ESCOLHAS que ficaram, escritas no item 61, ele DECIDIU em 23/08 e as duas VIRARAM CÓDIGO em 24/08: as **tarjas pretas do celular SAÍRAM** (no telefone a imagem ocupa 100% da tela contra 91,0% — 9,00% dela deixaram de ser pintados de preto; na mesa nada muda, e a vista `atlas` do `ab-identidade` saiu bit-idêntica. Mexeu no ramo do celular de `retanguloDoAtlas.ts` e na fatia **6** do HUD — não na 9, como esta linha dizia: quem desenhava a tarja de 4,5vh era o responsivo. **O ganho prometido aqui era ~89% de céu e o medido é 81,0%**: os 89 eram conta de comentário, e a régua de "céu livre de HUD" não media esta obra — quem a mede é a prova nova da IMAGEM, no juiz do celular) e a folha ganhou a QUARTA saída, **fechando ao arrasto para baixo**, reusando o `ArrastoDePonteiro` (com um achado que mudou a fiação: numa folha rolável o Chrome manda `pointercancel` ~30 px depois do toque e assume a rolagem, então o ouvinte é de TOQUE — o `touchmove` do mesmo gesto sobrevive, e o mouse fica de fora sozinho, que é o certo). Na mesma resposta aprovou o retoque do nome: *"Explorar livremente"* encurtou para **"Explorar"** também na barra do filme; sobrava a frase inteira no **véu do fim**, e em 24/08 ele a NOMEOU — *"não entendi esse explorar livremente novo, mas não precisa ser explorar, pode ser navegar"* —, então o véu encurtou junto: **uma ação, uma palavra**, "Explorar" nos três lugares. O **"Navegar"** que ele ofereceu fica REGISTRADO como alternativa aceita (item **61**): se preferir, é uma palavra em dois lugares. **As três viraram código em 24/08** e esperam o olho (e o dedo) dele. O botão do Atlas na abertura e os três botões iguais viraram código em 22/08 e saíram daqui | — (é onda de desenho: mockups antes de código) |
| **O Atlas é o modo único; a viagem é uma ferramenta dele** | Dono em 22/08: *"O modo atlas na minha visao deveria ser o modo único, a viagem na verdade para mim é só uma ferramenta do modo atlas"*, e *"o atlas e a viagem sao 2 coisas quase concorrentes… parece que o modo atlas fica mais morto, vazio"*. **QUATRO PASSOS VIRARAM CÓDIGO em 23/08 (item 61):** (1) o portal LEVA A CÂMERA — o Atlas nasce onde o filme estava, com o degrau `céu` nascendo junto; (2) a viagem virou FERRAMENTA — ▶ Ver o filme e ↗ Explorar entram na barra do Atlas, o "Partir" que devolvia a tela de título virou ↩ Voltar ao filme e só existe com filme atrás, e o véu do fim ganhou "Ficar aqui", que pousa na coda; (3) a trava do disco virou lei dos DOIS modos — o ambiente parou de mudar por troca de fase; (4) o relógio do céu abre andando. **E EM 23/08 ELE FECHOU AS DUAS ESCOLHAS que faltavam:** a **vista de abertura** é o candidato (a) — o sistema com as **linhas de órbita** —, e por isso ele AUTORIZOU o item **77** a entrar ANTES, sabendo que ele muda a imagem de toda vista do Atlas; e o **brilho do Sol** IGUALA nos dois modos (linha própria nesta tabela). O **77** e a **vista inicial** POUSARAM em 23/08 — o Atlas abre no sistema interno com as quatro linhas, a ~9,1 UA (ver a regra da vista de abertura no alto deste documento) —, e a fila que restava — clarão único → tarjas do celular → os dois retoques — **está toda feita**: o clarão em 23/08, as tarjas e os dois retoques em 24/08 (`b86f00c`, `d2d6e6c`). **O clarão ABRIU E FECHOU DUAS VEZES**, e as duas por decisão dele: unificou em 23/08 (subindo para 0,55) e, quando ele olhou as fotos em 24/08 e reprovou o tamanho, DESCEU para 0,07 — sempre um número só (linha própria nesta tabela). O que espera agora é o OLHO dele, não código (ver o item 61) | — (a direção está fechada; o que resta é a OBRA das quatro decisões de 23/08) |
| **O clarão do Sol é UM SÓ no app inteiro: teto 0,07** | **A decisão tem DUAS metades, e as duas são dele.** Em 23/08, com as quatro fotos de `capturas/item61-um-sol-so-antes-depois.png` na mão, ele mandou UNIFICAR: *"vamos igualar o clarao, **se percebermos que é um problema para observacao do sisztema solar, vamos pensar em como consertar globalmente**, nao quero essa distincao entre modo atlas e modo filme, para mim o filme é um feature do atlas"*. Isso revogou a dose por fase de 17/08 (Atlas 0,07, filme 0,55) e o teto único subiu para **0,55**. Em **24/08 ele OLHOU as fotos e reprovou o TAMANHO**, acionando a segunda metade da própria frase: *"não gostei do resultado novo, acho que a versão anterior fica melhor em todo o app, unificada, essa estrela spiked desse tamanho (sol) ocupa todo sistema solar na visão afastada… fica um pouco prejudicado"*, e *"uma coisa é o background vivo, outra coisa é o tamanho que o Sol está ocupando do sistema solar… não quero mais 'modo' filme ou atlas… não pode haver diferença na iluminação, nos modelos, etc"*. **O conserto GLOBAL que ele pré-autorizou virou obra em 24/08: o teto único DESCEU para 0,07** — o número que a observação tinha —, valendo no filme, no voo livre e no Atlas. **A LEI NÃO MEXEU: um número, nunca dois**; o que se recalibrou foi o NÚMERO, com declaração no pino de `clarao.test.ts`. **O MECANISMO é teto seco, NÃO exposição adaptativa** — e o termo importa: este documento não proíbe auto-exposição em geral, proíbe a que LÊ A CENA (*"Proibido: teto de brilho. Proibido: exposição que depende do que está em foco. A pupila adaptativa está reprovada pelo dono"*). A exposição por `galaxyFade` do director segue VIVA e lícita, porque depende de onde a câmera ESTÁ e não do que caiu no quadro; o que estaria vetado é fechar a exposição porque o Sol está grande na tela — a pupila com outro nome. Além disso a queixa dele é GEOMÉTRICA (o tamanho que a fonte ocupa), não fotométrica: exposição nenhuma encolhe uma fonte, só apaga o resto da cena para caber. A `LEI-DA-ESTRELA` registra a escolha e APAGA a promessa contrária que trazia ("o conserto é global — auto-exposição"), que era larga demais e contradizia esta linha. **O PREÇO, medido:** em Vênus (4,045 UA, janela 1200×900) o quadro **perde 23,36%** em luz — **os MESMOS 227.854 px** que a obra de 23/08 tinha acendido, com o mesmo delta máximo de 224: a reversão é pixel a pixel, 100% unilateral. A abertura (~9 UA) perde **15,04%**; a vista afastada (40 UA), **4,50%**; e **o FILME paga junto**, que era o ponto — em `t=16 s`, o Sol grande da hélice de abertura, o quadro perde **11,08%** (108.102 px). Juízes: régua de luz **7/7** no Atlas e **11/11** no voo livre (mais as pernas retina e `noplan1`); `ab-identidade` **44 de 52 bit-idênticas**, mudando 8 — a vista `atlas`, seis do voo livre e **uma do FILME** (`mergulho`, t=180); `atlas-smoke`, `a11y`, typecheck, lint e 2.085 testes verdes. **E uma correção de fato:** o salto de faíscas 15→1.367 que 23/08 atribuiu ao teto **não é do teto** — A/B do mesmo dia dá 1.367 contra 1.369 —, era das linhas de órbita nascidas entre as duas medições. **E em 24/08 (item 83) soube-se POR QUÊ:** a linha era `LineLoop` de 1 pixel de DISPOSITIVO, serrilhada — um rastro de pixels isolados acesos, que é exatamente o que o detector de faísca conta. Trocada pela FITA de 1,25 px CSS, as faíscas caíram de **1.369 para 211** a 3,6 UA (e de 1.578 para 318 a 150 UA) enquanto a luz somada SUBIU 9,8–13,0%: a linha ficou mais forte e menos pontilhada ao mesmo tempo. **O SERRILHADO ERA −84,6% DAQUELAS FAÍSCAS NO MELHOR DEGRAU (3,6 UA) e −81,2% somando os cinco** — 5.970 → 1.121. (A primeira redação escrevia "~85%" e o aplicava ao conjunto; 85% é o melhor degrau, não o total.) Fotos: `capturas/clarao-v2-*-antes-depois.png` | Nada: as duas metades da frase dele estão cumpridas. Voltar a distinguir por modo está FORA — é a mesma lei do "um universo só" |
| **A ficha do objeto é a casa dos dados por corpo** | Item 74, 22/08. Uma peça e não quatro: número vivo, físico, órbita, céu, enciclopédia e a procedência da imagem, tudo no mesmo painel. A PROCEDÊNCIA fala a língua do SELO e nenhuma outra — `medido`/`derivado`/`artístico`, nunca um quarto tier próprio. O TEXTO EDITORIAL só existe em **pt**: onde o `pt` faltar a linha some, porque meia língua na tela é a casa decidindo pelo dono. E ESTRELA NÃO TEM PROSA — o que se escrevesse sobre as 1.726 nomeadas seria inventado ou copiado | Uma seção nova precisar de um vocabulário que os três tiers não digam — e aí muda o SELO primeiro, nunca só a ficha |
| **As gavetas do HUD são UM enum, e uma abre por vez** | Item 74, 22/08; a peça é `hooks/useGavetas.ts` desde 23/08, e são CINCO desde o item 62 (a máquina do tempo vira gaveta no telefone). Ajustes, Camadas, Busca, Ficha e Tempo ancoram-se na mesma régua (`.hud-dialogo`) e todas se declaram `aria-modal` — duas abertas seriam sobreposição e uma mentira para quem ouve a tela. A exclusividade é o TIPO: não existe estado que represente duas abertas, então abrir é ESCOLHER e uma porta nova não obriga a tocar as outras. As três exceções são escritas: o ⚙ Ajustes é o painel da CASA (o `?ajustes=1` o abre sobre a tela de título e a travessia de modo não o fecha), a FICHA obedece à SELEÇÃO e não à fase, e fechar é "feche-me", nunca "feche o que estiver aberto". As CINCO viram a MESMA folha de baixo abaixo de 761 px, por UM `@media` em `.hud-dialogo` (fatia 9 do HUD): nenhum componente novo, nenhum segundo mecanismo. A ENTRADA é `@keyframes` e não `transition` — as gavetas desmontam ao fechar, e sem quadro anterior não há de onde uma transição partir; a SAÍDA é do hook, que segura o nó 260 ms com `inert`, porque CSS nenhum anima um nó que já não existe. Trocar de alça troca o CONTEÚDO da folha, no ato: o doador descia e subia (500 ms de dança), e é a simplificação que mantém "uma por vez" literal — nunca há dois `[data-dialogo]` no documento | Um diálogo que precise conviver com outro aberto — e aí a decisão é de produto, não de estado |
| **O celular é uma FAIXA DECLARADA de 760 px, e ela tem dono em TypeScript** | Item 62, 23/08. `LARGURA_DO_CELULAR_PX` (`lib/uiScale.ts`) é o número que o `@media` já usava sem dono. Não é `LARGURA_UTIL_MINIMA_PX` (768) — essa é fronteira de CÂMERA, e usá-la abriria a faixa 761–767 em que o CSS diz celular e a declaração diz "fora da faixa" (a fresta fica, nomeada); nem `pointer: coarse`, que é CAPACIDADE e não largura — a casa a reservou para CONTEÚDO (quais gestos a dica nomeia), nunca para geometria. O CSS repete o literal porque media query não lê `var()`, e quem cobra que os dois digam o mesmo número é uma REGRA sobre o arquivo (`uiScale.test.ts` varre toda condição de media do HUD), não uma lista. O TypeScript decide QUEM está no DOM (as alças e os botões da barra são as mesmas peças, e duas cópias seriam dois `data-abre-dialogo` iguais); o CSS decide como elas se vestem. A MESMA FAIXA MANDA NA CÂMERA desde a etapa 2 (23/08): `retanguloUtilDoAtlas` ganhou o ramo do telefone, gateado por essa constante, com frações medidas antes de escritas. **Eram QUATRO até 24/08** — a tarja de 4,5vh, o "Partir" que sobrava dela, a fileira de alças e o que o selo acrescenta por cima dela; **hoje são TRÊS**, porque a tarja saiu do telefone (decisão dele) e levou junto a fração dela e o "sobra da tarja": o que era excedente virou a caixa inteira da barra de cima. Quem as declara é `retanguloDoAtlas` ("AS TRÊS FRAÇÕES SÃO MEDIDAS"), e quem as cobre é o `a11y-celular`. Até então a câmera descontava a base de MESA num aparelho de 390 px: recuava por um rodapé que a fatia 9 do HUD já tinha desmontado, e o céu declarado era 44,5% contra 77,0% agora. A DICA DOS GESTOS não entra nessa base, e é a única peça do HUD que não entra: ela é `absolute`, apaga sozinha no primeiro arrasto e cede à folha por opacidade — o oposto de área permanente. Na MESA ela conta, porque lá está no FLUXO. O preço dela é IMPRESSO em todos os seis cantos que o juiz cobra: o que não é cobrado não fica invisível. E a faixa passou a ser DUAS (≤760 e ≥768): a fresta de 761 a 767 continua registro, nomeada, e sai medida | Uma segunda fronteira de largura precisar existir — e aí ela se declara aqui, em vez de nascer calada no meio de uma fatia |
| **A PINÇA é o zoom da tela de toque, e o impulso tem UM dono** | Item 62, 23/08. O que a casa tinha era a pinça de TRACKPAD, que chega como `wheel` com `ctrlKey`; num telefone, com `touch-action: none`, o mesmo gesto produz DOIS PONTEIROS e nenhum `wheel`, e o `ArrastoDePonteiro` ignora o segundo de propósito — então o gesto de zoom do aparelho em que ele É o gesto de zoom não existia. O ramo de dois dedos mede a RAZÃO entre as distâncias e a converte em pixels de roda por `pixelsDaPinca`, que não traz número novo: é `ESTALO_EM_PX / PASSO_LOG_PERTO`. A lei é MANIPULAÇÃO DIRETA — afastar os dedos ao dobro aproxima a câmera à metade, exato junto ao piso e mais forte longe, que é o mesmo tempero da roda. Um dono do empurrão (`ZoomDaRoda.empurrar`, de que `girar` é a casca): dois seriam duas inércias na câmera, e o `esquecer` da troca de fase só apagaria uma. E `esquecer` no fim da pinça NÃO entrou, porque a medida disse que não — a integral do impulso sob atrito entrega exatamente o que o gesto pediu, então a inércia aqui é FILTRO e não arremesso. **E o DEDO tem régua própria**, três números derivados das plataformas e não inventados: 16 px de quarteirão (o `touchSlop` de 8 px do Chrome em cada eixo), 500 ms (o long-press do Android e do iOS; 400 é do mouse) e uma ZONA MORTA igual ao limiar — sem ela, 12 px de tremor arrastavam os rótulos 21,5 px na tela antes de a soltura decidir que aquilo era um toque, e o dedo pousava num nome e soltava em cima de outro. A zona morta é SÓ do dedo: o mouse não treme sobre o botão, e com zero ali a mesa fica bit-idêntica | Uma plataforma mudar o `touchSlop` ou o long-press dela — e aí muda o número com a fonte junto |
| **Filmes viram roteiro lido por um motor** | Dono em 22/08 — as palavras dele inteiras e o que fica decidido moram no **item 75** do `PENDENCIAS.md`, que é o dono do assunto; o critério técnico de saída é o item 1 da fila do `PLANO-CINEMA.md` | — (ideia para implementação futura) |

---

## Regras que ainda mandam

- **Coluna do manifesto se poda pelo CENSO, não por lista escrita à
  mão.** `INDICES_DO_RUNTIME` (`verify-assets.mjs`) declara todo índice
  que algum leitor tem cravado; o que não está lá é a próxima
  candidata, e schema que muda de ordem sem o leitor mudar junto agora
  quebra o gate em vez de devolver Float32 plausível. Duas exceções
  permanentes: `spiralAnchors[7] armCode` alimenta o fit espiral
  OFFLINE (não passa pelo runtime, não aparece no censo, não sai), e
  `bp_rp`/`random_index` seguem vivos no WHERE da consulta Gaia mesmo
  fora do binário. A lição de por que a lista à mão falha está no
  próprio caso: a que vigiava aqui envelheceu em quatro dias.
- **Cobertura = magnitude e horizonte e presença.** Os três saem de
  `stars_meta.json`. O corte é heliocêntrico e a câmera anda.
- **AT-HYG sozinho não serve.** A fotometria brilhante vem do HYG v4.4.
- **Dose vem da física; a nota do gate se aceita.** Gate que prefere
  0,0098 a menos não vence literatura.
- **Atenuação se fatora num lugar só.** Quem acrescenta um fator a
  `alpha` o dá aos two varyings sem precisar lembrar.
- **Escrita em atributo instanciado:** idempotência com `Math.fround`
  antes de decidir; teto nas faixas; latch de upload cheio.
- **Par de portas para A/B com o MESMO binário.** O que vive é o PADRÃO,
  não as portas que o inauguraram: `?nocorpos=1` é o caminho de volta à
  baseline e `?corpos=1` liga mesmo com a constante em `false` — o mesmo
  molde das `no*` do README. O par original, `?dom`/`?nodom` da Onda 3,
  MORREU no M2 com a política de dominância inteira, junto de `?pupila`,
  `?nohero` (→ `?noclarao`), `?bbloom`, `?bombro` e `?knee2`;
  `simbolosProibidos.test.ts` cobra a ausência de todas por varredura
  invertida. Citá-las como vivas é o erro que esta linha já cometeu.
- **Diálogo novo nasce em `dialogFocus.ts`** ou não é julgado.
- **Overlay novo é filho direto de `.hud-root`.**
- **Selo deriva de registro único** com teste de completude: porta nova
  na URL é obrigada a se declarar.
- **`?ui=` multiplica a preferência de fonte**, nunca px.
- **M1–M6** (verdade = runtime ligado; menor mudança; portam-se pixels,
  não fórmulas; hot path sem alocação; gate só vê o próprio escopo;
  unidades explícitas na fronteira) e L37–L42. Jurisprudência herdada
  do atlas, ainda válida.
- **DUAS LEIS DE LUZ, DOIS ENDEREÇOS — e o globo não usa a do ponto.**
  Item **91**, obra feita em 25/08. O **PONTO** no céu segue a
  irradiância (`ganhoFundido`, 1/d² comprimido): Vênus brilha, Netuno
  some, e a ordem verdadeira de brilho é lida ali. O **GLOBO** visitado
  segue a **exposição da visita** (`luzDaVisita.ts`), que é fotografia
  de quem chegou, não ISO da Terra.

  O mecanismo, para não renascer torto — e ele mudou no **item 93**, em
  25/08. O escalar da malha continua sendo **um**:

  - em `assistida` ele vale **1 LITERAL**. É o Sol do NASA Eyes
    (`setLightSourceUniforms` multiplica a cor da luz por 1 e ignora a
    magnitude absoluta escrita no cadastro deles). O produto do item 91
    — `ganhoFundido(d) × compensacaoDaVisita(corpo)` — deixava um
    resíduo `(dRef/d)^0,7` do 1/d² do PONTO dentro do globo, e é isso
    que morreu; com ele saíram a tabela de semieixos, a distância da
    visita e a constante por corpo, que não tinham mais o que compensar;
  - em `real` ele é `ganhoFundido(d, 'real')` = E(d) EXATO — **a
    penumbra física fica**, e isso é decisão do dono que CONTRARIA o
    §11.1 do relatório do Eyes.

  Nunca "ganho = 1 seco em toda parte": a lei continua viva em
  `ganhoFundido` e no modo `real`; o que ela deixou de fazer é governar
  o globo de quem chegou.

  **AS TRÊS PEÇAS DA RECEITA acendem por um interruptor só**, e todas
  nascem em `luzDaVisita.ts` (número e GLSL no mesmo arquivo): o Sol = 1,
  a **lanterna de leitura** de 15 % presa à câmera, e o **terminador
  logístico s = 3** nos Lambert. Em `real` os dois uniformes vão a 0, e
  0 no `s` significa Lambert cru, bit a bit. A logística NÃO entra na
  Lua nem nos rochosos Lommel-Seeliger — o disco chato é o fato da foto,
  e ali o Eyes é pior que a casa.

  **A DIVERGÊNCIA DECLARADA, e ela tem foto:** o §4.2 do contrato manda
  a lanterna entrar sem eclipse e sem sombra de anel (no Eyes a luz de
  câmera tem raio −1). Ao pé da letra ela **inverte a umbra**: medido, o
  núcleo do eclipse de 08/04/2024 sobre Durango ia de 2,76 para **42,2**
  de 255 e ficava MAIS CLARO que o deserto ao lado, e o cobre de Danjon
  da Lua eclipsada perdia metade da razão vermelho/azul. Na casa a
  lanterna **respeita as duas sombras** — e não perde nada com isso: as
  duas valem 1 no lado noturno por construção, que é onde ela trabalha.

  **O que isto NÃO é:** auto-exposição. A conta não olha o quadro, nem
  a câmera, nem o relógio — a alavanca que o dono reprovou continua
  recusada, e o piso de ambiente no BRDF também.

  **O que isto CUSTA, e o custo é declarado:** entre GLOBOS a ordem de
  brilho deixa de valer (Saturno visitado fica tão claro quanto a Terra
  visitada). É de propósito, é a decisão 1 dele, e o selo declara o
  gasto EXATO por corpo em passos de luz — agora `2·log2(d)`, sem o
  resíduo que o torcia. A ordem verdadeira continua inteira no ponto,
  que é onde o céu se lê. **E a Terra e a Lua deixaram de ser
  bit-idênticas** ao pré-91: o ganho de casa era 0,998953 (Terra) e
  1,000635 (Lua) e passou a 1 exato. O contrato autoriza a queda em
  letra, e ela está medida nos testes das duas classes.

  Contrato e números do Eyes:
  `docs/reference/nasa-eyes-brilho-assistido-contrato.md` (o item 93) e
  `docs/reference/nasa-eyes-iluminacao-planetas.md` (o estudo do fonte,
  com os avisos do 25/08). **O que NÃO pousou no 93:** o véu de
  atmosfera palha no limbo de Saturno (§4.4 do contrato), e por isso o
  item continua aberto.

---

## Becos sem saída

Já medidos e refutados — não repetir.

- Verificador automático de prosa (`scripts/docs-check.mjs`, 2026-08-14):
  construído, medido e **removido pelo dono no mesmo dia**. Quatro testes na
  árvore: documento novo passa limpo mesmo com três violações (a lista de
  documentos era digitada à mão), documento inexistente citado no código só
  gera aviso, documento vivo citando código inexistente não é olhado. E a
  praga que importa — documento que afirma faltar algo já pronto (43 casos
  medidos) — é invisível para qualquer máquina. Palavras do dono: *"só mais
  um problema para o futuro, um teste que pouco faz"*. Quem confere se o
  escrito é verdade é gente, com auditoria por onda.
- Subir contraste geral dos braços: amplifica todos os harmônicos junto.
- Desacoplar a fase da poeira da fase da luz: piora muito.
- Cor do disco decidida por raio (`mix(cold, warm)`): o disco fica
  geometricamente incapaz de púrpura. A r40 trocou o extremo frio
  (25.000 K → 6.000 K); o `mix` por raio segue lá.
- Pesar H II para subir o púrpura: área pequena demais; o ganho aparente
  era fluxo extra disfarçado de cor.
- Véu aditivo no caminho de extinção (rim light): cor ganha ~1:3, faixa
  paga ~1:1. Não fecha.
- Fenda do glow seguindo o warp: não há fluxo de glow em r > 8,4 kpc.
- Escurecer o glow ou o interior das partículas (`idim`) para o edge:
  o glow é flanco, halo quente e espessura ao mesmo tempo.
- Halo > 0,4 sob `forgetau`: axial explode (a regra do `forgetau` é uma
  decisão fechada — ver a tabela).
- Teto de brilho para a tela branca.
- Copiar a exposição 0,418 do projeto irmão: é a conta de um conserto
  de cor que esta casa nunca precisou; escurece tudo 2,44×.
- Confundir cessão que funciona com duplicidade (a faixa da galáxia
  “desenhada 2×” era cessão).
- Apagar `aFocus` como peso morto: é o canal do passo E3 da lei.

A lista completa das hipóteses de espiral está em
`docs/reference/VISUAL_TARGETS.md`.

---

## Fila que ainda manda (além das pendências do dono)

- Unificações 1, 2 (forjas/partículas + G2/G3) e 3 (κ/Σ + quad).
- Lei da estrela, a partir de F1 — `LEI-DA-ESTRELA.md`.
- Fade das cascas no Ato IV (`?nowrap` já saiu bit-idêntico nos gates;
  falta escolher a rampa e medir).
- Espessura do céu no anticentro: o dono medido é o volume **local**
  (raymarch + véu), não a LUT distante.
- `q2<7` no raymarch segue fora.
- Baseline do gate indexada pela GPU, fora do TMPDIR — ainda não
  existe; o ritual acima é manual.
- ~~Item **91**: a luz dos globos (Saturno palha, não carvão).~~ **A OBRA
  FOI FEITA em 25/08** — esta linha dizia "o relatório está escrito; a
  obra ainda não" e contradizia, noventa linhas acima, a entrada que já
  descrevia o mecanismo pronto. O que ainda manda mora lá em cima
  ("DUAS LEIS DE LUZ, DOIS ENDEREÇOS"); o que sobra do 91 é a
  **conferência do dono**, e conferência de imagem é assunto do
  `PENDENCIAS.md`, não desta fila.

---

## Dados

Contrato observado vs inferido:
[`docs/GALACTIC_DATA_FOUNDATION.md`](GALACTIC_DATA_FOUNDATION.md).
Como o renderer come esses ativos:
[`docs/RENDERER_CARTOGRAPHY.md`](RENDERER_CARTOGRAPHY.md).
Negativos de textura: [`docs/reference/ASSETS.md`](reference/ASSETS.md).
Fotos-oráculo dos corpos: `docs/reference/referencias-corpos/LEIA-ME.md`.

**O DOADOR SAIU DO CAMINHO DA GERAÇÃO (22/08, item 74).** `data:corpos`
executava `celestialBodies.ts` de `~/Github/atlas-orbital` para produzir
`public/data/atlas/corpos.json`: o comando só rodava numa máquina com o
doador clonado no lugar certo, e um dado da casa dependia de um
repositório que a casa não versiona. O editorial dos 45 corpos passou a
ser fonte AQUI (`scripts/data/atlas/fonte/corpos-fonte.json`, com o
commit do doador dentro dela), e o gerador só o casa com o que esta casa
mede. Nenhum script de dados lê o doador em runtime — ele voltou a ser o
que este documento sempre disse que ele é: especificação.

**E A LÍNGUA MORA NUM ARQUIVO IRMÃO.** O inglês fica em
`corpos-fonte.json` e o pt-BR em `fonte/editorial-pt.json` — escrever `pt`
no primeiro DERRUBA a geração, porque duas fontes para o mesmo texto
significam uma delas envelhecendo calada. O gerador cobra o casamento campo
a campo (mesmos campos, mesmo número de fatos, mesmo ano de exploração) e o
`data:verify` o cobra de novo no artefato publicado. **E o `ASSETS.md`
passou a ser LIDO POR MÁQUINA**: a seção "A CONFISSÃO NA TELA" tem duas
tabelas que o `gera-manifest-texturas.mjs` transcreve para
`texturas.json`, e é dali que a ficha do objeto tira a frase do defeito de
cada mapa e da forma dos quatro elipsoides. Quem corrige o veredito corrige
o DOCUMENTO; o `data:verify` cobra que a frase publicada ainda exista
nele.

Os quatro estudos `atlas-estudo-*.md` são mapa de técnicas gerado por
IA. Nenhum número deles se cita sem a fonte primária. Não orientam
decisão que já esteja fechada (piso de ambiente, SPICE em runtime,
catálogo Hipparcos).
