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

**Mais que um SpaceEngine** (decisão do dono, 2026-08-11): escala 1:1 onde
for possível; visibilidade por fotometria; artifício só no canal do
instrumento, separável e desligável. A galáxia volumétrica científica é o
diferencial. Toda escala artística nova se declara no selo.

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
cessão partículas ↔ lâminas (a única dupla-luz sem mecanismo); promoção
partícula → catálogo → corpo. Detalhe e ordem: `LEI-DA-ESTRELA.md` passos
E e G.

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
  esses cinco.
- Fase nova decide por mapa em `fases.ts`, não por cadeia de `if`.
- O Atlas herda o look do filme. Diferença de desenho entre os dois modos
  é defeito — decisão dele CUMPRIDA no M1: `claraoDoAtlas` saiu do código
  e os dois modos desenham igual.
- Um relógio só: luz, rotação IAU, nuvens, anel e eclipse leem o `jd` do
  Director.

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

Três cegueiras declaradas:

- **Movimento.** `?shot=` congela o relógio. Nada que só apareça andando
  tem juiz aqui — quem enxerga movimento é `voo-ida-e-volta.mjs`, ida e
  volta na MESMA sessão. **Desde 21/08 ele não é juiz obrigatório**, por
  decisão do dono: *"essa viagem ida e volta não é mais relevante"*. Fica
  disponível como instrumento, e roda quando a mudança for de transição ou
  histerese — que é o que só a ida e volta enxerga.
- **O filme andando de ponta a ponta.** Nenhum juiz assiste 0→193 s no
  navegador: o `filme-ritmo.mjs` amostra 97 quadros PARADOS e o
  `filme-smoke.mjs` solta o relógio por 420 ms em sete instantes. A única
  varredura contínua a 60 fps é conta em Node (`cameraRig.test.ts`), sem
  GPU e sem pós. O filme inteiro continua sendo julgado pelo olho do dono.
- **Referência visual entre 1 e 40 UA.** As vistas `ua2`…`ua2000` existem;
  foto-oráculo nessa faixa, não (item 12).

Como rodar — e quanto cada um cobra. `npm run dev` primeiro: todos falam
com o dev server em `127.0.0.1:5173`. Os minutos são MEDIDOS nesta máquina
em 21/08, com o servidor já no ar; noutra máquina são ordem de grandeza,
nunca oráculo. Escolher qual rodar é a regra que já está escrita — a prova
tem de tocar o que a mudança tocou —, e a coluna do preço é o que faltava
para escolher com honestidade.

| Juiz | O que mede | Custo | Quando roda |
|---|---|---|---|
| `ab-identidade.mjs antes` / `depois` | md5 das **52 vistas** oficiais, um lado de cada vez — detector de regressão | **6,5 min por lado** (52 vistas × 2 capturas, `JOBS=3`) | fechamento de qualquer mudança que possa mover imagem |
| `SMOKE=1 ab-identidade.mjs …` | as 4 sentinelas (`sol`, `soldisco`, `hero8`, `ua150`) | **0,8 min por lado** | enquanto se itera — nunca para fechar |
| `atlas-smoke.mjs` | o portal do Atlas em pixel: ida e volta com `journeyT` exato, prontidão da fase nova, abertura reprodutível e o Sol pela data — 99 vereditos | **4,7 min** | portal, fases, enquadramento do Atlas, calendário do Sol |
| `memoria.mjs` | vazamento em número: texturas, geometrias, heap e workers vivos em 5 idas ao Atlas, 3 trocas de tier pelo caminho vivo e 5 focos. Autovalida-se — `--sabotagem` TEM de reprovar | **2,9 min** | troca de tier, entrar/sair do Atlas, foco, carga em worker |
| `a11y.mjs` (`?shot=1`) | os diálogos do HUD: o foco entra, fica preso, Esc devolve; nenhum diálogo órfão; escala de UI em três telas | **2,6 min** | HUD, diálogo novo, escala de texto |
| `filme-smoke.mjs` | o roteiro na tela: texto e corte nas margens das 25 janelas de legenda, responsividade, e 420 ms de relógio solto em sete instantes | **2,6 min** | legenda, corte, retemporização, responsividade |
| `filme-ritmo.mjs` | quanto a imagem muda por segundo no corte inteiro — 97 quadros parados — mais as folhas de contato | **~2,3 min** no passo padrão (extrapolado de 10 quadros em 0,3 min) | revisão de ritmo, e só como onde-olhar: a curva não mede tédio |
| `busca-smoke.mjs` | a paleta de busca e o `?foco=`: os dez corpos, a ida e volta pelo escritor vivo da URL, latência por tecla, o atalho de teclado | **1,5 min** | busca, deep-link de foco, rótulo clicável |
| `luz-do-quadro.mjs [ua…]` | quanto do quadro está lavado e o diâmetro do borrão contra o disco real e o clarão de direito, na escada de 11 distâncias; `julgarEscada` dá o veredito | **1,0 min inteira · 0,1 min por degrau** | exposição, bloom, clarão, qualquer coisa perto do Sol |
| `planeta-pixel.mjs [vista]` | se a luz que a camada dos planetas acende cai onde o `?dbgplan` mandou, a ≤0,5 px, por dois estimadores | **0,4 min por vista** (as três ≈ 1,1 min) | camada dos planetas, fotometria dos corpos |
| `sky-capture.mjs [tag]` | o céu interno contra o panorama ESO: 6 faces costuradas e os cinco termos da régua | **0,7 min** | céu, poeira, catálogo visto de casa |
| `voo-smoke.mjs` | o voo livre: convite, furo do Spotlight ancorado, captura de ponteiro opt-in, backoff, soltura de teclas | **0,6 min** | voo livre |
| `z-fighting.mjs` | pixels que ALTERNAM sob jitter sub-pixel (Terra × nuvem, Saturno × anel); limiar zero, com sabotagem que tem de reprovar | **0,5 min** | superfície colada em superfície, near/far, depth |
| `rodada.mjs <n> "nota"` | as duas vistas da galáxia contra as referências, e **escreve a linha** no ledger `docs/reference/EVOLUCAO.md` | **0,3 min** | mudança na galáxia (a última linha do ledger é de 11/08) |
| `gpu-profile.mjs "?q" s w h dpr` | o tempo que a GPU passa DENTRO de cada draw, passe a passe, por timer query | **0,2 min** com janela de 8 s | performance, custo de pós-processamento |
| `diff-pixel.mjs a.png b.png` | depois de um `DIFERE`: quantos pixels, de quanto e onde, com mapa de blocos 16×16 | segundos | sempre que o A/B der diferente |
| `voo-ida-e-volta.mjs` | ida e volta em 34 degraus na MESMA sessão — o único que enxerga transição e histerese | **9,3 min, e 8,1 deles são espera** pelo forno do Sol a 0,05 UA, que hoje esgota o teto de 480 s sem assentar | só quando a mudança for de transição ou histerese — não é obrigatório desde 21/08 |

Duas coisas que mudam o preço e não se adivinham:

- **O `depois` de código novo vai com `DOZERO=1`.** Sem ele o gate RETOMA
  os md5 que ficaram em disco (a retomada existe para não perder uma
  bateria interrompida) e o veredito sai vazio, com `(de disco)` em cada
  linha. Custo igual; prova, nenhuma.
- **As contas puras vêm de graça.** `ab-identidade`, `chrome`,
  `luz-do-quadro`, `planeta-pixel` e `z-fighting` têm cada um o seu
  `.test.mjs`, que julga o molde sem subir Chrome e roda dentro do
  `npm test`.

O harness espera `window.__director.captura.pronto`. Sem isso cai no teto
de 700 quadros e, no alvo padrão, **sai com status ≠ 0**. Chrome morre
pelo perfil (`matarPerfil`), nunca pelo nome. Gate de imagem **pina**
`?q=cinema`. Perto do Sol, A/B só com `&nobloom=1` — com bloom, `ua150` e
`ua40` devolvem md5 iguais com céus diferentes.

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

`forgetau` fica **desligado**. A dosagem edge foi calibrada sem extinção
nas forjas; ligar sem re-dosar explode o gate.

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
- **Dominância é por tamanho, não por presença.** `?nodom=1` / `?dom=1`
  existem para A/B com o mesmo binário.
- **Diálogo novo nasce em `dialogFocus.ts`** ou não é julgado.
- **Overlay novo é filho direto de `.hud-root`.**
- **Selo deriva de registro único** com teste de completude: porta nova
  na URL é obrigada a se declarar.
- **`?ui=` multiplica a preferência de fonte**, nunca px.
- **M1–M6** (verdade = runtime ligado; menor mudança; portam-se pixels,
  não fórmulas; hot path sem alocação; gate só vê o próprio escopo;
  unidades explícitas na fronteira) e L37–L42. Jurisprudência herdada
  do atlas, ainda válida.

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
- Halo > 0,4 sob `forgetau`: axial explode.
- Ligar `forgetau` sem re-dosar.
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

---

## Dados

Contrato observado vs inferido:
[`docs/GALACTIC_DATA_FOUNDATION.md`](GALACTIC_DATA_FOUNDATION.md).
Como o renderer come esses ativos:
[`docs/RENDERER_CARTOGRAPHY.md`](RENDERER_CARTOGRAPHY.md).
Negativos de textura: [`docs/reference/ASSETS.md`](reference/ASSETS.md).
Fotos-oráculo dos corpos: `docs/reference/referencias-corpos/LEIA-ME.md`.

Os quatro estudos `atlas-estudo-*.md` são mapa de técnicas gerado por
IA. Nenhum número deles se cita sem a fonte primária. Não orientam
decisão que já esteja fechada (piso de ambiente, SPICE em runtime,
catálogo Hipparcos).
