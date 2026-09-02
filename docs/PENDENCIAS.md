# Pendências — o que está quebrado e o que falta

**Este é o primeiro arquivo a ler.** Lista viva do que está aberto, no jeito
que o dono vê. O detalhe técnico mora nos commits, no `NORTE.md` e na
`LEI-DA-ESTRELA.md`.

**A REGRA DE LEITURA — são DOIS arquivos, e não se leem do mesmo jeito
(25/08, item 98).**

- **Este arquivo é o VIVO.** Só mora aqui o que ainda exige obra ou uma
  decisão dele. **Na janela de quem coordena, lê-se o BASTÃO, a fila que
  vale, e o item da vez** — o resto se mira com `grep`/trecho (item
  **106**, 28/08). O "inteiro" de 25/08 era o contraste com o MUSEU, não
  a ordem de despejar ~1.800 linhas em toda retomada.
- **[`PENDENCIAS-ARQUIVO.md`](PENDENCIAS-ARQUIVO.md) é o MUSEU:** a história
  completa e verbatim dos itens fechados, com o número intacto.
  **Consulta pontual por número (`grep -n '^\*\*61\.' docs/PENDENCIAS-ARQUIVO.md`),
  NUNCA leitura completa por agente.** Ninguém precisa do museu para
  trabalhar — ele existe para quando alguém perguntar *por que* uma coisa
  é como é.

**DECISÃO SEM NÚMERO MORRE — regra do dono, 25/08.** Toda decisão que exige
obra vira **item numerado AQUI, no mesmo commit em que é decidida**. Memória
de coordenador, relatório e conversa são PONTEIRO, nunca casa de trabalho.
A história de uma linha que instituiu a regra: a reforma da documentação foi
decidida em **14/08**, nunca ganhou número, e ficou **11 dias perdida**
debaixo de 318 commits — ver o item **98**.

**Como esta lista funciona:**

- O dono reportou um problema? Escreva aqui **naquele momento**, com as
  palavras dele.
- Item resolvido **sai da lista**: vira commit, deixa UMA linha aqui e a
  história vai para o ARQUIVO com o número intacto. Isto é o que está
  aberto, não um diário.
- A ordem é por **o quanto incomoda quem usa**, não por dificuldade.
- **O número é IDENTIDADE, não posição.** Item novo entra no fim da sua
  seção, com o próximo número livre. Números aposentados não se reaproveitam.
- **Próximo número livre: 133.** Quem abrir um item usa este e soma um aqui,
  no mesmo commit — é esta linha que os agentes leem, não a contagem à mão.
  *(O **107** saiu em 28/08: a varredura de fecho, no `AGENTS.md`. Em
  31/08 esta linha foi pega TRÊS vezes atrás da verdade — o 114, o 115 e
  o 122 nasceram sem somá-la; quem abrir item confere o maior número vivo
  antes de confiar nela. Os 123 e 124 nasceram na faxina da estação do
  115, conferindo primeiro. Em 01/09 ela ficou de novo atrás — o 129 nasceu
  com ela ainda em 126; re-somada.)*

A primeira mensagem de uma conversa nova pode ser: *"Leia docs/PENDENCIAS.md e siga."*

---

## O BASTÃO — onde a rodada parou (02/09)

**02/09 (o fecho da FAXINA).** Sete miúdos verificados por código e git
antes de qualquer obra (ordem dele): **123, 17, 117 consertados** com
foto (`542a9d2`); **15 fechado sem obra** (já funcionava, medido);
**119 e 27 feitos** (`37d6010`) e **fechados pelos testes que ele
aprovou** (regressão 197/197; atlas-smoke prova 3 passa); **22
encolhido** (sobra a curadoria das fotos do Sol). A suíte cheia rodou
1× no fecho: 2 guardas de texto quebradas pela assinatura da F1
(consertadas, 162/162 nos dois arquivos). O juiz do atlas trouxe 7
falhas ANTIGAS da onda 125 — provado no código de antes — que viraram
o item **132**. Próxima frente: **130 (app bilíngue)**. Backup em dia;
site intocado.

---

## ALTA — o dono vê e incomoda

**115. A colheita da mineração do Eyes espera o julgamento dele.**
A mineração de 30-31/08 (12 mergulhos comparados, tudo medido) está
sintetizada em
[`docs/reference/nasa-eyes-mineracao-mecanismos.md`](reference/nasa-eyes-mineracao-mecanismos.md)
— ganhos ranqueados em blocos e a lista do que NÃO trazer. Nada virou
obra; este item existe para a colheita não morrer sem número. As duas
maiores alavancas sugeridas: **bloco A** (memória de texturas — hoje
não descarregamos NADA, até 1,12 GiB residentes; refcount + descarga
adiada 15 s) e **bloco B** (fita de órbita e rótulos — MSAA zerado
hoje, `samples:4` no alvo do composer + rampa de rótulos 250/750 ms +
oclusores além do Sol). Dentro do pacote há também quatro defeitos
nossos pequenos e medidos que podem sair na frente: o desempate da
busca devolve 0 ("jupiter" enche os slots com Jupiter LI…), o play
pisca contra a parede do tempo, o embalo do zoom queima até 0,84 s
contra o grampo, e a direção da rampa estoura 7,7× a velocidade
angular a 170° (o `slerpDir` pronto existe). O material bruto
(fichas, medidas, capturas) vive no scratchpad da máquina
(`scratchpad/estudos/nasa-eyes-solar-system/mineracao/`, fora do git,
retomada pelo `CHECKPOINT.md` de lá). **Palavra dele em 31/08:** *"eu
acho que temo que fazer tudo, mas talvez valha a pena fazer uma
reavaliacao da ordem e prioridades... nesse momento tem outro agente já
trabalhando na fila, entao vamos deixar ele terminar para depois pensar
nisso com carinho e inteligencia."* — ou seja: a colheita ENTRA (tudo,
em princípio), a ORDEM será reavaliada com calma quando a frente que
hoje trabalha a fila terminar. Ninguém abre obra destes blocos antes
dessa reavaliação. Quando ela vier, cada bloco escolhido vira item
próprio e este encolhe.
**A REAVALIAÇÃO ACONTECEU em 31/08 e a ordem decidida por ele é:**
(0) a CONFERÊNCIA dele AGORA, antes de tudo — 108/109/vinheta no app +
fotos antigas (52/53/54/22) + contar o que estranhou na fita (82/C3);
(1) consertos rápidos medidos: slerpDir da rampa, embalo do zoom na
parede, ⏵ na parede do tempo, desempate da busca (+ medir 117 e, se
couber, 37/46); (2) BELEZA PRIMEIRO — bloco B (MSAA no alvo com GPU
medida antes, rampas de rótulo 250/750 ms, oclusores além do Sol,
gradiente da fita), com a faxina dos ruídos de instrumento
(49/80/85/101) na MESMA sessão de re-baseline; (3) bloco A (memória de
texturas: refcount + descarga adiada 15 s, createImageBitmap, abort);
(4) em diante: os pontos MAIS ANTIGOS da fila (pacote Sol/escala e
afins), por escolha dele; o 114 requalificado (relevância + assets)
fica para etapa mais à frente, e os blocos D/E da colheita junto com
ele.
**Estação (1) CUMPRIDA em 31/08** (executor com juiz que morde por
conserto; suíte cheia uma vez, 2.583 verdes/exit 0; tsc e lint limpos):
a rampa do Atlas virou slerp (chicote 891°/s → 116°/s, `0e789c4`), o
embalo do zoom morre na parede (resposta à inversão 0,85 s → 1 quadro,
`b7a4808`), o ⏵ assenta contra a parede do tempo (2 publicações
fantasmas → 0, `7e1471d`) e o desempate da busca é o nome mais curto
(Titan antes de Titania, `d16ef27`). Dois achados de CONTRATO ficaram
registrados SEM obra, para a colheita: a busca não tem palavras-chave
("jupiter" ainda não traz Io/Europa/Ganimedes/Calisto — pede campo novo
em `CorpoBuscavel` e todos os produtores) e o desempate por importância
física pede o raio do corpo, que o contrato não carrega; herdado e
registrado como fronteira em `maquinaDoTempo.test.ts`: o ⏸ contra a
parede ainda apaga o aviso uma vez (não pisca). **As três medições da
estação estão FEITAS**, veredito escrito no próprio item: 117 (aberração
cromática do passe de gradação, CULPADA), 37 (a camada multiplicativa das
nuvens apaga o que está na frente — CULPADA, meia luz de uma estrela a
56,5 pc comida por nuvens a 121 pc) e 46 (a galáxia profunda não é
invariante à resolução — CULPADA, 23–29% a menos em retina; mas o "céu
vazio" temido é INOCENTE). Medição não é conserto, e cada um trouxe o
conserto proposto por escrito; o **46 e o 37 FECHARAM por obra** no mesmo
dia (a lei de tela ganhou régua, e a razão da escada 900→1800 foi de 0,770
para 0,982; o campo de catálogo ganhou dois lados, e a estrela comida pela
nuvem de trás foi de 0,512 para 0,966), o 117 segue aberto.
**Estação (2), primeira peça — o MSAA no alvo do composer: MEDIDO e
REPROVADO PELO PREÇO (31/08). NÃO virou obra.** O teto era ~15% do tempo
de quadro na vista mais cara; o medido foi **+55% a +70% em dpr 2** e
**+22% a +26% em dpr 1**, e não há tier em que caiba. Máquina: Chrome com
GPU real (`ANGLE Metal, Apple M1`, `MAX_SAMPLES` 4 — o `samples:4` da
referência é também o teto desta placa). Método: `gpu-profile.mjs` em modo
`cru` com `SEM_VSYNC=1` e os dois lados ALTERNADOS na mesma sequência —
sob vsync o rAF só devolve múltiplos de 16,67 ms e as três vistas davam
p50 33,3/33,3/83,3 **antes e depois**, ou seja o balde engolia o custo
inteiro; e a máquina deriva até 60% entre corridas distantes, então lado A
e lado B têm de ser vizinhos. Os números, mediana de 4 repetições
(sem MSAA → com MSAA): sistema de Júpiter **51,7 → 85,1 ms (+64,7%)**,
abertura do Atlas **55,7 → 94,3 ms (+69,3%)**, galáxia de face
**100,5 → 156,3 ms (+55,5%)**. Com `samples:2` ainda é +19% a +35%.
**ONDE O PREÇO É PAGO, e é isto que mata a ideia:** no perfil por passe,
`cena:heroStars` vai de 81,9 para 358,4 ms (4,4×) — o campo de estrelas
aditivo paga quase toda a conta e **não ganha nada**, porque sprite macio
não tem beira dura para amostrar. **E o que o MSAA compra não é o que a
mineração prometeu:** a fita de órbita quase não muda (diferença média
0,070 por pixel na zona da fita contra **0,498** na beira de globo — 7×
menos), porque a SAIA analítica do `orbitas.ts` já faz o trabalho dela;
quem ganha de verdade é a silhueta dura de globo, a escada que o 117
mediu. Prova visual em `capturas/item115-msaa-{fita,silhueta}-{off,on}.png`
e os zooms `-zoom-{off,on}`: no limbo de Ganimedes a escada some, na fita
o par é indistinguível a olho. O diff é de BEIRA, não de luz: 88,5% e
97,9% da massa de diferença nos 3 decis de maior gradiente, e a luz média
do quadro anda −0,07% e +0,05%. **Dois achados que sobrevivem à
reprovação.** (i) O `EffectComposer` **não reinicia os buffers a cada
quadro** e o número de trocas por quadro é ímpar com o joelho ligado
(knee + OutputPass + film) e par sem ele — então o alvo em que a cena é
rasterizada ALTERNA entre `renderTarget1` e `renderTarget2`. Hoje é
inofensivo (os dois alvos são gêmeos), mas qualquer obra que dê
propriedade só a um deles pega quadro sim, quadro não; grampear os dois
buffers no início de `Post.render` derrubou o custo de +87/90/73% para
+65/69/55%, e é o desenho certo se a peça algum dia voltar. (ii) Ligar
`antialias:true` no renderer continua inerte — quem rasteriza é o alvo do
composer. **O conserto proposto (não implementado), se ele quiser a
beleza:** o remendo exato de 6 linhas está gravado dentro de
`capturas/item115-msaa.json` (campo `remendoMedido`, com a porta `?msaa=N`
que serviu de bancada), junto de todos os números acima. Caminho mais
barato para a MESMA beleza, a desenhar: tirar o campo de estrelas do alvo
amostrado, ou atacar a franja do limbo pelo 117 (atenuar `uCA`), que é um
uniforme e custa zero.

**Estação (2), a FAXINA e o RE-BASELINE — CUMPRIDOS em 31/08, na mesma
sessão, como ele mandou.** Os ruídos de instrumento responderam: o **121**
(o juiz da beira não media a perna dpr 1 com o gradiente) e o **120** (a
histerese da régua nunca valeu) FECHARAM por obra, com sabotagem; o **85**
(o `atlas-smoke` reprovando o toque duplo inocente) FECHOU com a causa
achada — a ida e volta de CDP entre os dois toques contra a janela de
500 ms do navegador; e os **49/80/101** continuam ABERTOS, agora datados:
63 capturas em 7 vistas, nos dois contextos (balde e isolado), ZERO
oscilação, e nada a consertar enquanto o fenômeno não voltar. Nasceram os
itens **123** (as forjas perdem um terço da luz ao dobrar a resolução — o
irmão do 46, que morava só no museu) e **124** (o porteiro do censo
reprova por uma palavra).

**O RE-BASELINE: 54 de 54 vistas do `ab-identidade` re-pinadas, e o diff
inteiro EXPLICADO.** Lado `antes` em `7d51170` (a árvore antes do
gradiente da fita), lado `depois` na árvore final; **zero vistas
INSTÁVEIS em 222 capturas do lado depois**, com `JOBS=6`. As três
mudanças intencionais da estação assinam o diff, e a forense de pixel
separa as assinaturas: na `atlas` (com órbita no quadro) quem PERDE luz é
BRILHANTE e perde muito (21.163 px, mediana 67 de brilho, delta mediano
14, máx 72 — a fita escurecida pelo gradiente) e quem GANHA é ESCURO e
ganha pouco (39.827 px, mediana 16, delta mediano 1 — o céu); na `edgeon`
(sem órbita nenhuma) ninguém perde de verdade (2.396 px a 1 nível, que é
ULP) e 83.947 ganham — a galáxia; na `terra` **o globo não foi tocado**
(7 px em 370.527, delta máximo 2 no limbo) e tudo o que mudou está no
céu. Nenhuma mancha compacta com delta grande, que é a assinatura de
conteúdo que sumiu. A histerese do **120** não alcança estas vistas: o
`?shot=2` esconde o `.label-canvas` pela regra `.bare-mode >
*:not(.scene-canvas)`. Rastro: `capturas/item115-rebaseline-ab.json` e
`capturas/item115-rebaseline-forense.json`. **A prova 3 do `atlas-smoke`
(item 119) segue reprovando com o MESMO 1,19e-2 do raio nas quatro
corridas da sessão — não foi mascarada nem tocada.**

**A FOLHA PARA ELE**, cinco pranchas legendadas com o antes/depois de
cada conquista da estação: `capturas/item115-folha-1-rampa.png`
(os nomes entrando em 250 ms), `-2-oclusor.png` (FOMALHAUT saindo de cima
da Terra), `-3-gradiente.png` (o laço inteiro mais o zoom no alto),
`-4-galaxia-retina.png` (a faixa da Via Láctea em dpr 2) e
`-5-nuvens.png` (a estrela na frente da nuvem, 10× no pixel medido).
Compostas por `capturas/item115-folha.mjs`.

**Estação (3) — o BLOCO A (memória de texturas): CUMPRIDA em 31/08, as
três peças.** O buraco que o mergulho 09 chamou de mais grave era real e
está MEDIDO nos dois lados, com o passeio de oito corpos em cinema
(`capturas/item115-passeio-memoria.mjs`; rastro em
`item115-passeio-antes.json` e `item115-passeio-memoria.json`).

*Peça 1 — os três que seguram e a carência de 15 s* (`25b131c`). O app
não descarregava textura nenhuma: 54,1 MiB no boot, **1.082,9 MiB**
depois de visitar oito corpos, e **1.082,9 MiB vinte segundos depois de
sair** — o repouso ERA o pico, 100%. Agora quem segura os texels é uma
lista de três razões reais (`Seguradores`) e basta uma para os bytes
ficarem: a TELA (o gate de 4 px), o FOCO do Atlas e o ROTEIRO do filme.
Depois: **pico 966,1 MiB, repouso 70,1 MiB — 7% do pico**. A carência são
os 15 000 ms literais do `ResourceManager` deles, no relógio de PAREDE do
app. Duas garantias que valem escritas: (a) a descarga NUNCA alcança
corpo em quadro, por construção — `emQuadro` exige o gate armado, que é o
segurador `tela`; (b) o roteiro do filme é MONOTÔNICO (`t >= inicio`),
então a descarga não pode estrangular a viagem.

*Peça 2 — `createImageBitmap`* (`ee261bb`). O `<img>` do
`THREE.TextureLoader` decodificava na thread principal: pousar na Terra
em cinema travava **1.308 ms** (TBT 1.413). Fora da thread: **790 ms**
(−40%), TBT 972 (−31%) — `capturas/item115-thread-na-carga.{mjs,json}`.
O que SOBRA e não é decodificação: a subida dos 134 MB de RGBA8 para a
GPU. As três opções do bitmap existem para o pixel não mudar, e o
`descartarTextura` fecha o `ImageBitmap` além do `dispose()` — a metade
de CPU que o `dispose()` sozinho não devolve.

*Peça 3 — `abort`* (`fa44a4a`). A geração já invalidava o lote em voo,
mas invalidar não é parar de receber. Com a banda estrangulada a 2 Mbit/s
e uma troca de alvo no meio da carga
(`capturas/item115-abort-na-troca.mjs`): ANTES 5 pedidos da Terra, 0
cortados, 3 inteiros, **0,70 MiB desceram** para um corpo abandonado;
DEPOIS **5 de 5 CORTADOS, 0,00 MiB**.

**As provas.** Volta ao mesmo corpo DENTRO da carência: **0 pedidos
novos**; DEPOIS dela: os 5 canais recarregam, e o retorno não tem UM
quadro com o gate armado e sem globo (`friaNoGate` 0 em 17 amostras a
100 ms) — porque o segurador do FOCO dispara no clique, com a câmera
ainda viajando. O `memoria.mjs` ganhou a régua **E** (o passeio), a única
que mede o que a sessão DEVOLVE; as quatro antigas seguem verdes. O juiz
subiu de 2,1 para 4,4 min medidos e a catraca do censo foi re-pinada de
32,3 para 34,6 no mesmo commit. Doze sabotagens em worktree reprovaram
(cinco na peça 1, três na 2, três na 3, e uma na mão do roteiro).
**Pixel:** `ab-identidade` em worktree LIMPO do HEAD, duas levas de 54
vistas — **zero DIFERE nas duas**; 52+2 e 53+1 instáveis, e as vistas
instáveis TROCARAM entre as levas (`terralua`/`venusnb` numa,
`saturno-anel` — uma das duas pinadas trêmulas — na outra), que é
assinatura da família 49/80/101 e não de código. As duas suspeitas da
primeira leva deram 8 de 8 capturas idênticas ao `antes` no instrumento
de datação. **Fica sem obra, declarado:** o KTX2 (item 3 do bloco A)
segue REPROVADO pelo mergulho para o canal `map` e pendente de A/B de um
arquivo nos canais de apoio; e uma corrida do passeio pendurou em
`sun.assentado` (o bake do Sol, que esta obra não toca) e não
reproduziu na repetição.

**114. O censo do sistema solar: todas as luas e os objetos interessantes.**
Pedido do dono em 30/08, palavras dele: *"quero expandir nosso projeto
para ter todos obejtos possiveis de luas e obejtos maiores tb. meteoros
etc. queria ter ao menos os 40 maiores obetos do sistma solar..."* e, na
sequência: *"nao quero as naves mas quero todas as luas e outros objetos
interessantes..."*. Hoje o app tem Sol, planetas e poucas luas. A meta:
**sem naves**; TODAS as luas (o Eyes cataloga 451) e os demais objetos
interessantes — planetas-anões (Plutão, Éris, Ceres...), asteroides e
cometas notáveis; o top-40 por tamanho é o piso, não o teto.
**REQUALIFICADO por ele em 31/08, na reavaliação de prioridades:**
*"estava mais preocupado em aumentar a oferta de objetos do sistema
solar, mas sempre focando em relevância e em objetos que tenhamos
assets para utilizar. Então talvez possamos deixar isso para uma etapa
mais para frente ainda... e focar em outros pontos que já estão na
fila há mais tempo."* — ou seja: o critério é RELEVÂNCIA + ASSETS
DISPONÍVEIS (não completude das 451), e a onda fica para DEPOIS das
estações decididas no item 115. O mapa técnico do mergulho 05 continua
válido quando a onda chegar. A mineração do NASA Eyes de 30/08
(`scratchpad/estudos/nasa-eyes-solar-system/mineracao/`) foi reapontada
para colher exatamente a engenharia disso: como o Eyes registra 724
objetos (catálogo de receitas `EntityUtils`, parentesco dependente do
tempo, política de existência por quadro do `SceneManager`, camadas
contextuais por proximidade) — o mergulho 05 traz o confronto. Obra a
desenhar depois do estudo: catálogo, órbitas e texturas dos 40, sem
quebrar a lei de um universo só. Saturno estava quase escuro mesmo com brilho assistido, e o modo
real ficou escuro demais — **FECHADO em 26/08**, conferido por ele na Sala
de Conferência (**C15**: a chapa do modo real, com a **R1** que ele escolheu
na **Q14** embarcada e os +3 passos declarados no selo); história no
ARQUIVO.

**93.** O brilho assistido = mesmo algoritmo do NASA Eyes — **FECHADO em 26/08**; ARQUIVO.

**5.** O Sol do Atlas estava congelado no máximo solar — **FECHADO em 25/08**; ARQUIVO.

**7.** Trocar de qualidade recarregava a página e o reload morria — **FECHADO em 25/08**; ARQUIVO.

**39.** Focar uma estrela apagava as outras — **FECHADO em 29/08**; ARQUIVO.

**40.** Dois Sóis com rótulo ao mesmo tempo — **FECHADO em 29/08**; ARQUIVO.

**43.** Planetas de longe pareciam estrelas — **FECHADO em 29/08**; ARQUIVO.

**52. A conferência do dono no app com o padrão novo da luz.**
A queixa que abriu a rodada da luz era do app com o desenho velho; o
pacote inteiro (compressão na emissão, ombro no bloom, filtro solar
declarado, repartição + clarão de asas) espera a conferência DELE no
app. O pouso de 17/08 aceitou a SOLTURA da estrela — este item é o
pacote da luz por inteiro. *(Veio do bloco da onda da luz, enxuto pelo
item 51.)*

**53.** O expoente da asa (β) esperava o gate de foto do dono — **FECHADO em 31/08**; ARQUIVO.

**54.** O filme esperava a exibição do dono — **FECHADO em 31/08**; ARQUIVO.

**69.** A dose das forjas (berçários) vista de longe — **FECHADA em 25/08**; ARQUIVO.

**82. Os nomes na tela estão muito intrusivos — N1 e N2 pousaram em 24/08 e
ELE CONFERIU em 25/08; o que sobra é N3 e duas vagas.** *(Correção de
31/08: o caso ALNILAM saiu desta lista — foi resolvido em 29/08 pelo
fechamento do item 75, o roteiro dirige seus assuntos e as Três Marias
aparecem juntas, foto `alnilam-depois.png` conferida; o cabeçalho aqui
tinha ficado para trás e chegou a gerar uma oferta requentada ao dono.)* Palavras do dono, 23/08: *"estou achando que ele está
muito intrusivo, acho que precisaria ser um sistema mais inteligente do que
é."* E: *"A impressao que tenho é que o default todos os objetos estao com
o label ligado, fica uma confusao na tela."*

A régua de relevância passou a cortar **ANTES da geometria** — *a tela
carrega DEZ nomes* (`ORCAMENTO_DE_NOMES`, em `world/labels.ts`) —, a
colisão virou a lei dos atlas de referência (um lugar por nome; colidiu, o
menor SOME), e a camada **`nonomes`** entrou na gaveta. A abertura foi de
22 nomes para **8**; o teto do zoom, de 27 para 4.

**A CONFERÊNCIA FECHOU — C2, 25/08, pela Sala de Conferência: ele confirmou
os nomes na tela como bons.** A abertura com **OITO** nomes, o teto do zoom
em quatro e as legendas do filme param de ser pergunta: o
`ORCAMENTO_DE_NOMES` = 8 vira o número da casa, e mudá-lo passa a exigir
pedido novo dele. As quatro fotos —
`capturas/item82-abertura-antes-depois.png`,
`item82-teto-antes-depois.png`, `item82-camada-nomes.png` e
`item82-filme-legendas-antes-depois.png` — **já serviram**.

**O QUE FICA ABERTO:**

- **o caso ALNILAM**, aceito como provisório por decisão DELE (24/08). No
  beat AS TRÊS MARIAS o nome de Alnilam cede e a legenda embaixo continua
  dizendo os três. Palavras dele: *"não acho que ficou bom o caso
  Alnilam... nesse caso específico do filme, talvez isso tenha que entrar
  no motor de filmes"*. A forma final que ele refinou é **DIRIGIR, não
  desligar**: a regra geral segue governando o que o roteiro não fala, e o
  que o roteiro DECLARA assume a frente. **Fecha no item 75**, e este é o
  caso de prova do vocabulário novo.
- **N3 — a oclusão em 3D, e ela fica ATRÁS.** Nome de corpo escondido atrás
  de outro corpo ainda nasce. A conta existe e está pronta —
  `escondidaPorDisco`, em `world/labels.ts`, hoje serve só às estrelas —,
  falta **chamá-la também em `projectCorpos`**. Só entra se ele reclamar de
  nome flutuando sobre um globo no close-up (em 24/08 o caso apareceu:
  CITALÁ e MULIPHEIN escritos por cima de Júpiter).
- **a régua gasta vaga com nome que o HUD vai comer** (achado de 24/08, no
  celular com a gaveta aberta). **Não é urgente** — painel aberto é hora de
  ler o painel — e não se conserta de graça: contar o orçamento no DESENHO
  passaria a régua para depois da geometria, que é o contrário do que este
  item decidiu. Fica escrito para quando ele reclamar.
- **o detalhe `classe · distância` no céu**, que o estudo do Eyes pede que
  SAIA. Não saiu porque apagá-lo apagaria a legenda do FILME ("BETELGEUSE ·
  M2Ib · 49,7 anos-luz"). Continua sendo boa ideia; precisa ser julgada com
  o filme na tela.

**A história completa está no ARQUIVO, item 82.**

---

**99.** A dieta dos juízes — **FECHADO em 30/08**; ARQUIVO.

**113.** Os minutos dos juízes — **FECHADO em 30/08**; ARQUIVO.

## MÉDIA — afeta o produto, não salta aos olhos

**97.** A órbita acendia mais cedo no Retina — **FECHADO em 29/08**; ARQUIVO.

**12.** Nenhuma foto de referência mora entre 1 UA e 40 UA — onde a tela
lava. A régua de luz e as vistas `ua2`…`ua2000` já enxergam a faixa.

**13.** Sagittarius A✱ ainda é 125.884× maior que o real. Segundo
mentiroso de escala. Cadastro em `escala.ts`.

**15.** Sem como aliviar o Sol quando o quadro engasgava — **FECHADO em 02/09**; ARQUIVO.

**17.** O Sol solavancava quando o relógio acelerava — **FECHADO em 02/09**; ARQUIVO.

**18.** A luz trata o Sol como ponto sem tamanho. Certo para planetas,
errado a poucos raios solares — e agora a câmera chega lá. Sem penumbra.

**19. (A METADE DA CONFISSÃO FECHOU em 22/08; a das texturas segue
aberta.)** Titã tem emendas, Europa tem 68 linhas pretas no polo sul,
Ceres é inventado pela fonte, Vênus não tem foto em luz visível.
→ `docs/reference/ASSETS.md`. **O que fechou:** a ficha do objeto agora
DIZ isso na tela, corpo a corpo, junto com a fonte, a licença e o
crédito da imagem — a frase sai do próprio ASSETS.md, lida por máquina.
**O que fica:** as texturas continuam sendo as piores das duas, e
trocá-las é trabalho de bancada (o mosaico Cassini de Titã com as
emendas tratadas, as 68 linhas de Europa preenchidas, o mosaico Dawn de
Ceres com licença fechada).

**34.** A tela de carregamento desenhava outra Via Láctea, espelhada — **FECHADO em 31/08**; ARQUIVO.

**36. (MEDIDO em 17/08 — o censo completo mora no commit da data.)
SEIS leis de poeira convivem, não quatro.** Às quatro contadas (a
tripla literal do catálogo, as cascas em 0,8 mag/kpc acromático, a
CCM89 das partículas com saturação `?chromsat=`, o forno das forjas —
CCM89 SEM saturação e desligado por padrão) somam-se as nuvens
observadas (CCM89 sem coluna, τ fixo 2,4) e a LUT da faixa (A_V→τ
cinza). Três espaços de conta e três curvas espectrais diferentes; o
catálogo e as partículas — as duas camadas que se tocam na tela —
avermelham DIFERENTE (~33% mais azul comido no catálogo para a mesma
coluna). O NORTE errava dois de quatro e foi corrigido no mesmo
commit: a λ^−2,6 do catálogo NÃO existe (executa-se `exp(−τ·[1.0,
1.65, 2.35])`, que nem se reduz a lei de potência) e o "1,5 mag/kpc no
bake" é âncora declarada pendente no próprio código (executa-se um
fator 2,39 normalizado). De carona: a extinção do catálogo entra DUAS
vezes (na cor e em metade do alpha) com degrau duro em 3 px, e o
`tau: 0.045` do director deixa o default 0,9 da classe como letra
morta. A UNIFICAÇÃO segue sendo a pauta 1 do NORTE — obra própria, que
muda pixel e volta com foto para o dono a cada mudança.

**37.** As nuvens escuras apagavam o que está na frente delas — **FECHADO em 31/08**; ARQUIVO.

**46.** A galáxia profunda não passava pela invariância de resolução — **FECHADO em 31/08**; ARQUIVO.

**59.** Trocar de qualidade não trocava a textura já carregada — **FECHADO em 31/08**; ARQUIVO.

**61.** Rever a UI/UX inteira — **FECHADO em 29/08**; ARQUIVO.

**70.** O ponto que morria seco na borda — **FECHADO em 29/08**; ARQUIVO.

**75.** Motor de filmes por roteiro — **FECHADO em 29/08**; ARQUIVO.

**77.** As linhas de órbita, ligadas por padrão — **FECHADO em 29/08**; ARQUIVO.

**83.** Órbitas AAA — a fita e o foco — **FECHADO em 29/08**; ARQUIVO.

**87.** O véu da abertura não cabia no telefone — **FECHADO em 27/08**; ARQUIVO.

**89.** Desligar os nomes deixava o céu inclicável — **FECHADO em 29/08**; ARQUIVO.

**92.** Descer ao corpo de um anão não o mostrava — **FECHADO em 25/08**; ARQUIVO.

**100.** O HUD de fotografia — **FECHADO em 29/08**; ARQUIVO.

**108. O fim do filme não mostra direito a Lua e a Terra — FECHADO em
31/08, inteiro.** As três pernas da retomada (relógio do ?jd=, retrato,
Lua acesa 148→245) + a v2 dele (pouso anti-Lua, dolly zoom, Sagan,
commit a675ff9) + a exibição completa: *"já assisti, ficou lindo."* O
herdeiro vivo é o item 119 (relógio do portal). História no ARQUIVO.* (Palavras
dele, 29/08, ditas ao ver o filme depois da lente nova: *"agora que
mudou-se a lente o filme nao mostra mais direito no final a lua e a
terra, ficou errado. será que no filme nao deverimaos manter a direcao
de lente do jeito que era? motor de filme nao usa os efeitos e lentes de
acordo com o roteiro/script?"*)

**A MEDIDA JÁ FEITA, no mesmo dia — e ela absolve a lente E o roteiro:**
os cinco instantes finais (t=183, 187, 190, 192, 193) são
**bit-idênticos** em três códigos — antes da lente (a50a644), depois da
lente (c7081d2) e antes da conversão do take final para roteiro
(b3cd9cc). O motor LÊ a lente do roteiro, como ele esperava; o fim do
filme está assim desde antes das duas obras. PNGs da sonda no
scratchpad da sessão; a sonda é reproduzível (capturas por
`?t=…&shot=2`, 1200×900).

**A CONFERÊNCIA DELE de 31/08 (após as três pernas da retomada) — o
item entra na versão 2, palavras dele:** *"testei o fim do filme, a lua
e a terra ok, mas acho que podemos atingir um resultado ainda melhor se
estivermos com a lente certa... a lua nao está fácil de entender que é
a Lua... acho que temos que aproximar mais ela e a terra e melhorar o
enquadramento para que as 2 ocupem a mesma cena de forma incontestável.
tb acho que podemos trocar a frase de encerramento para aquela frase
classica do carl sagan falando do pale blue dot."* Direção da obra v2:
(a) retrato mais perto com lente certa — o mergulho 04 da mineração
(docs/reference/nasa-eyes-mineracao-mecanismos.md) mediu o quadro: o
roteiro atual fica a ~34.868 km e o fit de dois corpos indica ~14.550 km
(2,4× mais perto; Terra 47° de altura no quadro, Lua legível), com
script de medida pronto em
`scratchpad/estudos/nasa-eyes-solar-system/mineracao/mergulhos/medidas/retrato-vs-fit.test.ts`;
(b) frase final = a curta clássica do Pale Blue Dot com atribuição a
Carl Sagan, origem documentada (licença documenta-se, não bloqueia).
Prova: fotos dos quadros finais para o olho dele.
**Direção dele em 31/08 para a frase:** entre aspas, sem caixa alta, e
com *"olhar de UI/UX apurado... é um encerramento do filme com impacto
e drama. cinema puro"* — encenação linha a linha. Sobre o comprimento:
ele pediu a frase completa achando-a de domínio público; esclarecido
que não é (obra de 1994, domínio público só ~2066) e que a citação
CURTA com atribuição é o caminho seguro em obra educacional (Lei
9.610 art. 46). Decisão operacional: o app embarca as frases icônicas
curtas; o texto vive num LUGAR ÚNICO comentado, onde o dono pode
estender a citação à mão se decidir assumir isso — o coordenador
declarou que não escreve o parágrafo longo (limite próprio de direito
autoral).
**A V2 POUSOU E ELE APROVOU em 31/08 — palavras dele: "ficou lindo,
aprovo a recomendada com o dolly zoom" (commit a675ff9).** A causa da
Lua ilegível era geométrica (pouso medido do eixo solar deixava a Lua a
32,9°; lente 52° ⇒ Lua 7,4 px); o pouso passou à linha anti-Lua
(separação 12°, lente 20°, Lua 19,1 px com fase), o dolly zoom entrou
como lei d·tan(fov/2) constante (Terra 489 px cravada, deriva 1 px,
pupila +5,3% monotônica) via primitiva GENÉRICA "lente ancorada"
(lerPlanoDeCamera.ts; roteiro segue dado puro — volta.json +
encerramento.json novo), e o encerramento encena o Sagan linha a linha
com crédito. 5 sabotagens mordem; fotos item108-v2-* conferidas pelo
coordenador e por ele. O que falta para FECHAR o 108 inteiro: só a
exibição do filme completo por ele (casa com o item 54). O risco
pré-existente achado na obra virou o item 119.

**Terceira direção dele, 31/08:** *"no finalzinho nao tem como fazer um
jogo de lente em que o fundo se aproxima mais e mais para a Lua
aparecer um pouco maior... nao tem um truque de lente que muda essa
perspectiva?"* — é o DOLLY ZOOM (efeito Vertigo): nos últimos segundos,
a câmera recua enquanto a lente fecha, a Terra segura o tamanho
aparente e a Lua cresce atrás. Entra como keyframes de lente+distância
no take final (o roteiro dirige), lento, casando com as frases do
Sagan, sem bombear a exposição.

**O QUE SE VÊ nos quadros finais, para quando ele disser o que é o
"errado":** em t=190/193 a Terra aparece de dia inteiro (Américas
acesas, o pouso desenhado do roteiro) com um clarão de 4 pontas GRANDE
dentro do quadro (abaixo/à direita da Terra) e um segundo clarão menor —
e a Lua não aparece como corpo, só como clarão. Hipóteses a confirmar
com ele: (a) o clarão gigante junto da Terra é o que incomoda; (b) a
Lua virar estrela em vez de globo é o que incomoda; (c) o incômodo é
DEPOIS do filme — a volta ao Atlas, que desde 29/08 abre no sistema
inteiro, onde a Terra não tem nome nem órbita acesa (casa some da
tela ao fim da viagem).

**A RECEITA CHEGOU DELE, no mesmo dia (29/08, palavras dele):** *"vi
novamente agora e apareceu.. tem algo estranho acontecendo talvez"* e
*"eu estava no atlas e voltei para o modo de filme, talvez tenha algum
bug quando é feito dessa forma"*. Ou seja: é INTERMITENTE e o gatilho é
o caminho **Atlas → "Ver o filme"**.

**A PRIMEIRA SONDA ACUSOU E FOI DESMENTIDA NO MESMO DIA — defeito do
INSTRUMENTO, não do app, e fica registrado para ninguém reabrir por
cima:** a sonda v1 dizia "câmera presa na pose do Atlas", mas o
`play()` REINICIA o filme do zero (o botão é "Ver o filme desde o
começo"), então os quadros "presos" eram quadros CERTOS de t≈17 e t≈24
do roteiro, mal rotulados por relógio de parede. A sonda v2, lendo o
relógio de verdade (`currentTime`) e fotografando em t=192,07 pela
MESMA receita (?atlas=1 → play → seek 178 → correr), mostra o fim
CERTO — "A TERRA", as Américas, a legenda. As fotos da v1 foram
APAGADAS de capturas/ para não enganar o olho de ninguém; ficou a do
fim certo (`capturas/item108-fim-certo-t193.png`).

**ESTADO REAL DO ITEM: o relato dele é intermitente e AINDA NÃO FOI
REPRODUZIDO.** O que já está absolvido por medida: a lente (fim
bit-idêntico em três códigos), o roteiro (idem), o caminho
Atlas→play→fim por seek (v2, foto certa). A reprodução com o filme INTEIRO
tocando em tempo real pela receita foi feita no mesmo dia (Atlas →
play → 189 s de relógio de parede) e o fim saiu CERTO — "A TERRA" com
as Américas no quadro (`capturas/item108-fim-inteiro-t189.png`). Três
tentativas honestas, zero reproduções. A próxima pista tem de vir do
olho dele na hora em que acontecer de novo (o que a tela mostrava, se
havia legenda, se o relógio corria, de onde ele tinha vindo). Hipóteses vivas:
corrida de recurso após sessão LONGA no Atlas (textura/globo que não
rearma), pressão de memória no M1, algo que só o percurso completo arma.

**FUROU O JUIZ, e isso vira obrigação aqui:** a última vista oficial do
`ab-identidade` no filme é **t=180** — os 13 segundos finais não têm
vista nenhuma. Quem fechar este item ACRESCENTA uma vista do fim (t=190
ou t=193) à lista oficial, para o buraco não reabrir. **CUMPRIDO em
30/08:** a vista `fim-do-filme` (**t=193**, o quadro extremo — t=190
deixaria os últimos 3 s de fora) está no gate. As duas candidatas foram
sondadas por par nulo, três capturas cada na mesma árvore, e as duas
saíram com md5 igual nas três — a escolha foi por cobertura, não por
tremor; os números estão em `capturas/item108-fim-vista-parnulo.json`.
O preço do juiz subiu de 3,5 para ~3,6 min e o teto do censo de 31,8
para 31,9, re-pinado no mesmo commit.

**A HIPÓTESE DELE, 30/08 (palavras dele):** *"será que pode de alguma
forma estar relacionado a posicao no tempo dos obejtos que por alguma
razao em alguma situacao que ainda nao etendemos está chegando a camera
num momento em que os obejtos nao estao mais lá por estarem em outro
ponto de suas orbitas?"* Duas leituras testáveis, e as duas ganham
sonda: **(a)** o relógio do Atlas vazando para o filme — o conserto
"Atlas em 2035 não vaza" é de 21-22/08, ANTERIOR à reescrita completa
do motor (item 75, 28-29/08); o vazamento pode ter renascido no motor
novo; **(b)** a data real do dia — o filme corre na data de quem
assiste, e o take Lua→Terra tem pelo menos um pedaço que usa posição
LEMBRADA da Lua ("o lugar medido das 16:00", o fallback sem rede) em
vez da viva; em algum dia do calendário a câmera pode olhar para onde a
Lua não está. A sonda é numérica: varrer datas (`&jd=`) e o caminho
Atlas-com-época-movida→filme, medindo o ângulo entre a mira da câmera e
a direção viva da Terra/Lua em t=188–193 — data em que a Terra sai do
quadro é a reprodução que faltava.

**REPRODUZIDO em 30/08, no mesmo dia — a hipótese dele estava CERTA, e
o mecanismo tem nome.** A causa NÃO é o relógio do Atlas vazando (os
quatro caminhos Atlas→filme saíram bit-idênticos ao certo — o conserto
de 21-22/08 sobreviveu à reescrita do motor): é a porta `?jd=` que o
PRÓPRIO APP grava na barra de endereços. A cadeia, só com gestos de
visitante: o Atlas abre AO VIVO por desenho, então `naEpoca` é falso
sempre e QUALQUER gesto que espelhe a URL (trocar qualidade, copiar
link, recarregar camada — `urlComMomento()` em `useEspelhoDaUrl.ts`)
grava `&jd=` de hoje; um F5, um link compartilhado ou uma aba
restaurada fazem o boot ler `?jd=`; e a guarda
`!this.debug.has('jd')` no tick do `director.ts` então entrega o
relógio do filme à porta — os corpos correm na data errada enquanto a
câmera segue o roteiro. Varridas 14 datas: SÓ a do filme passa; com
`?jd=` de +1 dia a Terra já sai do quadro em t=187 (46°), e na
reprodução pela UI ela está a 263 milhões de km quando deveria estar a
34.868. A intermitência do relato é exatamente o F5: sem recarregar, a
barra fica suja mas o filme sai certo. Terceira peça: o pino das 16:00
em `terra.ts`/`lua.ts` só vale SEM efeméride (`!q.fonte`), então não
salva o quadro. Foto `capturas/item108-REPRODUZIDO-t193.png` (a
legenda "A TERRA" sobre céu vazio); rastro completo
`capturas/item108-sonda-tempo.json` (22 cenários × 4 instantes).
**Conserto proposto pela sonda (não implementado):** o pino manda
sempre que existir (`if (q.centroPinadoPc)`, sem o `!q.fonte` — o
`palco.ts` já o zera fora do filme), e decidir na obra se a guarda do
`?jd=` sai do trecho do filme inteiro; o gate novo tem de reprovar
quando se recoloca a condição antiga.

**CONSERTADO em 30/08 — as duas peças de código, e a lei que elas
servem: o filme corre sempre na SUA data.** (1) O PINO MANDA SEMPRE QUE
EXISTE: `terra.ts` e `lua.ts` passaram a obedecer `centroPinadoPc` na
frente da efeméride viva (na Lua ele subiu para o primeiro ramo), e quem
decide se o pino existe segue sendo só o `palco.ts`, que o zera fora do
filme — consequência declarada, sem eclipse resolvido no ramo do pino: a
posição é a das 16:00 e a sombra fica neutra, que é a verdade de
2026-01-01. (2) A GUARDA `!this.debug.has('jd')` SAIU DO TICK DO FILME
INTEIRO. O CENSO que decidiu isso: dos consumidores de `?jd=` durante a
fase journey, só existem dois, e os dois são o mesmo caso — a prova 3
(`t=10/100/250` + `jd=EPOCA`) e a prova 18 (`noCorpoDoSol`) do
`atlas-smoke`, que chegam ao ATLAS vindo do filme e precisam do instante
que pediram na URL; nenhuma vista de filme do `ab-identidade` leva
`&jd=`, e `filme-smoke`, `filme-ritmo` e os `voo-*` não conhecem a
porta. Ou seja: nada legítimo precisa pinar o relógio DENTRO do filme —
o que os dois juízes precisam é da porta mandando no Atlas. Então o
`?jd=` é reaplicado quando o portal abre (`aplicarPortaJd`, lida num
lugar só, do boot e do portal). E o censo foi CONFERIDO no app vivo, não
só lido (`capturas/item108-portal-jd.txt`, sonda em
`item108-portal-jd.mjs`): entrando no Atlas a partir de t=10, t=100 e
t=250 com `jd=EPOCA`, o relógio do Atlas é o MESMO nas três
(2461041,5008692136 — o invariante da prova 3), e com `jd=2465000` ele
difere (o invariante da prova 18); no FILME, t=250 já corre em
2461042,16753588, a data do roteiro.

**AS GUARDAS (§15 — comportamento, não texto):** três testes novos, e a
sabotagem de cada um feita pela própria mão, com o defeito exato de
volta. `director.test.ts` extrai o bloco REAL do tick e o EXECUTA com um
`this` de mentira: com `debug` contendo `jd`, t=193 tem de escrever
`JD_DO_FILME_TDB` e t=40 `EPOCA_JD_TDB` (recolocar a guarda → reprova),
fora do filme não escreve nada, e o portal tem de chamar
`aplicarPortaJd` (tirar a chamada → reprova). `terra.test.ts` e
`lua.test.ts` cobram o pino COM a fonte viva num relógio errado, com o
controle medindo quanto o corpo andaria sem ele (recolocar `!q.fonte` →
reprovam nos dois).

**A CONTRAPROVA, com número, pela receita da sonda** (rastro
`capturas/item108-contraprova.json`): boot em `?t=193&shot=2&jd=` de +1
dia (2026-01-02, o cenário que reprovava), 1200×900, medida no MESMO
quadro que produziu a foto. A Terra está NO QUADRO, a 0,0° da mira, NDC
(0,000; 0,000), a **34.868 km** — o valor certo, contra os 263 milhões
de km da reprodução; `jd` vivo = 2461042,16753588, isto é, o filme
corrigiu o relógio. Os três casos medidos (sem porta, `?jd=` de +1 dia,
e a URL que o próprio app grava) dão números IDÊNTICOS: a porta deixou
de mover o filme. E a foto `capturas/item108-CONSERTADO-t193.png` sai
**bit-idêntica** (md5 `c6e9c7ad14e4`) à `item108-fim-certo-t193.png`, o
quadro correto capturado em 29/08.

**A PROVA DE PIXEL, mirada no que mudou** (`capturas/item108-ab-filme.json`):
as 7 vistas de FILME do `ab-identidade` (`sol`, `interno`, `travessia`,
`mergulho`, `edgeon`, `faceon`, `fim-do-filme`), antes (árvore em HEAD,
carimbo `arv-d58c3b0633b1`) × depois (`arv-a312f7931970`) — **BIT-IDÊNTICO
nas sete**; o par nulo do `fim-do-filme` no lado depois deu o mesmo md5
duas vezes (`d0cb808b1115`), então a vista nova não passou a tremer.

**O QUE SEGUE ABERTO, e por isso o item NÃO fecha:** o OLHO DELE — só
ele diz se o fim do filme parou de "não mostrar direito"; e a pergunta
da LUA no roteiro, que é o parágrafo abaixo e não tem nada com o
relógio. Fora do escopo desta obra, RELATADO e não executado: o
`urlComMomento()` continua gravando `&jd=` de hoje em qualquer espelho
de URL (o Atlas abre ao vivo, `naEpoca` é falso sempre) — o filme agora
é imune, mas a barra de endereços segue suja, e um link compartilhado
leva o Atlas de quem o abre para a data de quem o copiou.

**ACHADO INDEPENDENTE da mesma sonda — a Lua, e este é do ROTEIRO, não
do relógio:** mesmo no caminho CERTO a Lua fica fora do quadro nos
últimos 6 s (t=187 ela está ATRÁS da câmera, 133,9°; t=193 a 32,9°,
logo acima da borda); o fly-by dela é em t≈183, no centro. Pode ser a
outra metade da frase dele ("não mostra mais direito no final A LUA e
a terra") — perguntado a ele em 30/08, **e a palavra veio no mesmo
dia, com lição junto:** *"nunca travamos nada, se for detectada alguma
melhoria temos a obrigacao de sempre trazer. como te disse vc mesmo
que cria as travas... vc detectou o problema, vamos consertar, vai
melhorar o roteiro"*. A obra do roteiro do take final está ORDENADA:
o fim mostra a Lua E a Terra no quadro (a composição fina é mecânica
nossa; ele julga por foto e no filme). A Lua em t=193 está a 32,9° da
mira com meio-quadro de ~32° — logo acima da borda: o ajuste é de
enquadramento, não de trajeto.

**A OBRA DO ROTEIRO POUSOU em 30/08 — o retrato de família, e só o
roteiro dirigiu (item 75).** Duas linhas de JSON e um ponto de apoio
novo; nenhuma peça nova no motor. **(1) A MIRA:** `mira.principal` do
take passou de `Terra` para `miraDoPouso` — a Terra deslocada
**11° pelo norte da tela**, medido no raio do pouso (`SUBIDA_DO_RETRATO`
em `journey.ts`; 6.778 km de deslocamento em mundo). É PONTO EM MUNDO
de propósito: o desvio angular cresce com a aproximação — 0,12° na
entrada de casa, ~1° no raspão, 11° no pouso —, então de longe o take
segue olhando a Terra e o retrato só se compõe quando há retrato. A
subida é pelo NORTE porque o roll põe o norte da Terra para cima: ela
vira deslocamento vertical puro do disco, sem torcer as Américas.
**(2) A LENTE:** o take fecha em **52°**, não mais em 46°.
`ROLL_DOS_POLOS` passou a derivar da visada REAL do último quadro (a
mira do retrato), senão a subida entortaria os polos que ela existe
para preservar.

**OS NÚMEROS DA COMPOSIÇÃO** (rastro `capturas/item108-fim-novo-medidas.json`,
medidos NO APP pela receita da sonda: 1200×900, `?t=…&shot=2`; e
reproduzidos bit a bit fora do navegador pelo `voltaParaCasa.test.ts`):

| t | lente | Terra (ângulo da mira / NDC) | Lua (ângulo da mira / NDC) |
|---|---|---|---|
| 188 | 55,76° | 4,93° / (0,021; −0,160) | 101,17° / FORA |
| 190 | 53,56° | 8,83° / (−0,027; −0,305) | 51,36° / FORA (1,426; 1,307) |
| 191 | 52,74° | 10,26° / (−0,017; −0,364) | **35,19° / (0,810; 0,770)** |
| 192 | 52,20° | 10,97° / (−0,001; −0,396) | **26,27° / (0,584; 0,521)** |
| 193 | 52,00° | 11,00° / (0,000; −0,399) | **25,93° / (0,579; 0,513)** |

Antes da obra a Lua saía por cima em t=193 com NDC y = 1,10. No último
quadro ela agora está a 0,58 do centro, e a Terra fecha centrada na
horizontal, com o disco inteiro entre NDC y −0,774 e −0,023: 20,73° de
diâmetro em 52° de lente, **39,9% da altura do quadro** (eram 45% em
46°). **O RETRATO DURA 2,10 s** — a Lua entra no quadro em t=190,58 e
passa de 0,85 em t=190,90.

**O QUE A GEOMETRIA NÃO DÁ, dito com número medido:** em t=188 e t=190
os dois corpos NÃO cabem. A separação Terra–Lua vista da câmera é
**102,4° em t=188** (a Lua ainda quase de costas) e **57,2° em t=190** —
ela está a 382 mil km enquanto a Terra está a 43 mil. O menor fov que
poria os dois dentro do quadro: em t=188, NENHUM (nem 175°); em t=190,
**71,6°** com a mira do retrato e **87,2°** mirando o centro da Terra —
olho-de-peixe com a Terra do tamanho de uma moeda, ou seja outro plano,
não este. Em t=191 o mínimo é 43,8° e a lente do take é 52,7°: cabe. A
convergência é física: a Lua fecha para 33° só nos últimos 2,4 s. Um
efeito colateral DECLARADO: a estrela brilhante que fechava o quadro
antigo por baixo (19,5° abaixo da Terra, NDC y −0,83) sai por baixo nos
últimos 2 s — o orçamento vertical entre ela e a Lua é 44,5°, e não cabe
com a Terra grande; a ordem do dono é a Lua. O Sol não estava no quadro
nem antes: ele fica a 171° da mira, ATRÁS da câmera (é por isso que a
Terra fecha quase cheia, com o terminador no bordo direito).

**AS GUARDAS (§15 — comportamento, não texto),** em `voltaParaCasa.test.ts`,
com a sabotagem de cada uma feita e medida: *"no último quadro a Lua está
no quadro com folga, e a Terra manda"* (Lua ≤0,70, entrando POR CIMA;
Terra centrada na horizontal e com o disco inteiro no terço de baixo) e
*"o retrato dura pelo menos 2 s antes do fim"*. Devolver `principal` a
`Terra` reprova CINCO testes (a Lua vai a 0,966 e o retrato nunca
acontece — e os polos saem de esquadro, 0,507°); devolver a lente a 46°
reprova a duração (1,81 s < 2 s). Somou-se a guarda da costura: a troca
de mira entre os dois planos da coda tem de valer menos de 0,2° (medida
0,1212°, e o rig ainda a amortece em 0,4 s) — é ela que impede alguém de
pôr o ponto do retrato longe e transformar a costura num corte.

**A PROVA DE PIXEL** (`ab-identidade`, leva CHEIA, antes `arv-d0ba6b48827f`
× depois `arv-fdbd19534642`): **50 das 51 vistas bit-idênticas**, as seis
de filme incluídas (`sol`, `interno`, `travessia`, `mergulho`, `edgeon`,
`faceon`). A `fim-do-filme` MUDA de propósito: md5
**d0cb808b1115 → 20a4c9758e2b**, e o par nulo do lado depois deu o mesmo
md5 **três vezes** seguidas (a vista nova não treme). O diff de pixel da
vista que mudou: 1.509.388 px de 3.083.400 (48,95%) — é o quadro
recomposto, não um ULP. Fotos para o olho dele:
`capturas/item108-fim-novo-t190.png`, `-t191.png` e `-t193.png`.

**A AUDITORIA ÚNICA DAS DUAS OBRAS (30/08, mão independente) passou sem
ALTO** — re-sabotou as seis guardas (todas mordem), reproduziu os md5
das duas vistas em árvores COMMITADAS e conferiu as fotos contra os
números ao pixel. Os achados dela, todos consertados no mesmo dia: o
docblock do `jdDoFilme` ainda prometia a precedência morta do `?jd=`;
a varredura do `director.test.ts` aceitava cópia morta do bloco (agora
recorta DO PRÓPRIO tick e cobra a linha ÚNICA no arquivo); a leva cheia
da prova de pixel acima estava SEM ARQUIVO (§14) — re-rodada na árvore
limpa de `d13b6ea` (`arv-be5ad6279a2a`, carimbo do commit): **50 de 51
IGUAIS, rastro em `capturas/item108-ab-retrato.json`**; as duas sondas
de capturas/ gravavam por cima da própria testemunha (agora escrevem
`-v2` ao lado, §7). E uma linha que faltava declarar: **o pino de
terra/lua vale o FILME INTEIRO** (t=0 a 193, `palco.ts`), não só a
coda — antes de `REVEAL_T` o relógio é a época e o pino é o das 16:00;
inofensivo (Terra fora do quadro/sub-pixel nesse trecho, vistas t=6/40/
100 bit-idênticas) e agora escrito.

**A TERCEIRA PERNA DA QUEIXA, achada pelo OLHO DELE em 30/08 à noite —
ele testou e disse: *"nao percebo a lua por cima... será???"*. O olho
dele estava CERTO e o quadro errado:** a geometria foi absolvida na
tela dele (sonda em 1920×1080: a Lua NO quadro de t=191 em diante, NDC
0,44/0,51 em t=193 — `capturas/item108-fim-wide-medidas.json`), mas a
FOTOMETRIA está invertida: o pico do disco da Lua é **148**, e **SETE**
das dez fontes de fundo do rastro estão acima dela, a mais viva com
**230** — [230, 229, 188, 184, 174, 163, 152], as dez com coordenada em
`capturas/item108-lua-ponto-fotometria-v2.json`.

> **ERRATA de 31/08 (registro, não obra).** Este parágrafo dizia "dez
> estrelas entre 166 e 244", e o número saía de uma varredura que não
> exigia MÁXIMO LOCAL. Refeita agora sobre a MESMA foto
> (`item108-fim-wide-t193.png`), ela se explica: **oito das dez eram o
> mesmo borrão** — x 775–781 × y 343–347, uma fonte compacta sentada no
> halo da Terra a 394 px do centro dela, isto é, fora do corte de 340 px
> por 54 px. O topo verdadeiro do fundo é 230, o mesmo 230 da tabela do
> "depois", abaixo — e é por isso que os dois lados dela batem.
> **Limite declarado:** uma varredura de passo 1 exigindo máximo local
> encontra, nessa foto, outros picos acima de 148 que a lista das dez não
> carrega (219, 218, 216…, alguns também no halo da Terra). "Sete" é a
> contagem DENTRO da lista do rastro, não um censo do quadro; nada no
> veredito depende disso, que é a comparação Lua × mais viva do fundo.

A Lua cheia a 389 mil km é
magnitude ~−12,7 — ordens de grandeza acima de QUALQUER estrela; o
modo assistido dá o empurrão às estrelas e esqueceu o corpo resolvido
pequeno, que fica pálido e invisível no meio delas. A obra: o corpo
resolvido pequeno tem de carregar o brilho VERDADEIRO (ordem
fotométrica restaurada — a Lua inconfundível, mais viva que toda
estrela do fundo), como LEI do desenho e não gambiarra do filme; é o
mesmo vão que o canal dormente `aFocus` (item 38) existe para fechar
no sentido inverso.

**A OBRA DA FOTOMETRIA POUSOU EM 31/08, e o conserto é LEI, não um `if`
do fim do filme: a Lua ganhou o PONTO FOTOMÉTRICO que nunca teve.**

**O MECANISMO, achado antes de mexer.** O globo e o ponto vivem em
unidades diferentes e só se encontram num crossfade. O globo é exposto
*para si* (`luzDaVisita.ts`, Sol = 1 — a fotografia da visita que ele
escolheu no item 93), e nessa régua a superfície da Lua vale o albedo
dela, ~0,12, esteja onde estiver: por isso o pico 148. O ponto é
normalizado por `EXPO_M0`, que é a régua em que a estrela vive — e o
ponto CEDE (`aCede`, a rampa `cessaoPorDominancia`) só quando o disco
cresce o bastante para carregar o fluxo sozinho. A régua do palco já
prometia isso por escrito em `corpos.ts`: *"abaixo de 4 px um globo
texturizado não comunica nada que o ponto fotométrico já não comunique
— e o ponto tem a fotometria certa"*. Para a Lua a promessa era vazia:
`IDS_FOTOMETRIA` não a conhecia, e o próprio cabeçalho de `lua.ts`
declarava o vão ("SEM PONTO FOTOMÉTRICO... pendência nomeada para
F8/Onda 7"). Corpo resolvido PEQUENO caía entre as duas réguas.
**Consertar pelo lado do globo foi ESCOLHA DE DESENHO, não
impossibilidade — e a razão escrita antes estava errada:** o teto do
half-float do composer (65.504) NÃO barra a Lua, que na régua de tela
vale ~3,5e4 por pixel ali; quem estoura o teto é a Terra ao lado
(~1,8e5). O motivo verdadeiro é o PERFIL: quem carrega fluxo grande em
pouco pixel é o ponto, que tem a compressão na emissão da Lei §7 para
isso; o globo não tem e não deve ter, porque comprimir o globo
achataria o modelado da superfície — a coisa que o globo existe para
mostrar.

**A DOSE: NENHUMA.** Não há rampa nova, não há assistência a declarar
no selo, não há ramo de filme. A Lua entrou na camada de pontos como
os outros dez, com a lei publicada dela — V(1,0) = +0,21 e a fase
`V = −12,73 + 0,026·|α| + 4e−9·α⁴` de [ALLEN76] —, e cede pela MESMA
curva das irmãs. Lambert não serviria e o teste mede: no quarto a Lua
real vale Φ = 0,091 contra 0,50 de uma esfera difusora (5,5× de erro —
o surto de oposição do regolito, o mesmo fato que o globo já respeita
por Lommel-Seeliger). A cor sai dos índices do disco cheio, com o
(V−R) **derivado** do (B−V) pela inclinação espectral [BES90] em vez
de um segundo número copiado sem fonte.

**ONDE MORA.** `world/planetas/fotometria.ts` (a linha da Lua, a lei de
fase e o despachante, que deixou de se chamar `fatorDeFaseMh18` no
commit em que passou a servir três leis); `world/planetas/planetas.ts`
(o 11º vértice, `IDS_DOS_PONTOS`, e o `escreverPontoDeCorpo`);
`corpos/lua.ts` (a cessão); `director/palco.ts` (o par
`temPonto && !temRetrato` decide quem publica o LUGAR do ponto — e o
lugar é o do globo, com o pino das 16:00 dentro, porque duas fontes de
posição para o mesmo corpo foi exatamente o defeito da 2ª perna). O
bloco da cessão, que era cópia idêntica em Terra/rochoso/gigante e ia
virar a quarta, virou `alvoDaCessaoDoCorpo` em `terra.ts`.

**OS NÚMEROS, medidos** (`capturas/item108-lua-ponto-fotometria-v2.json`,
mesmo método PIL do rastro anterior, nos dois lados):

| | pico da Lua | fluxo integrado | maior do fundo |
|---|---|---|---|
| antes | **148** | 8.623 | **230** |
| depois | **245** | **90.226** | 230 |

A Lua sai de PERDER para sete estrelas para ser a fonte mais viva do
céu depois da Terra: pico acima de todas e fluxo **19,8×** o da estrela
mais brilhante do quadro. O campo estelar não se mexeu um bit (as dez
maiores do fundo são as MESMAS nos dois lados). No app a linha do
`?dbgplan` fecha a conta: `moon … m = −12,16 · E = 1,84e6 · pico
4,79e5` com o disco em 9,1 px e `aCede = 0`. Fotos AO LADO:
`capturas/item108-lua-ponto-t193.png` (1920, o quadro novo) contra
`item108-fim-wide-t193.png` (o velho), e o par de zooms
`item108-lua-zoom-antes.png` × `-depois.png`.

**O RAIO DA EXPLOSÃO, vista a vista** (leva CHEIA do `ab-identidade`,
`antes` no HEAD `87793dd` × `depois` na árvore da obra; **45 das 51
bit-idênticas**). As SEIS que mudaram, com o diff de pixel de cada uma
(a contagem foi corrigida em 31/08 — a auditoria achou uma sexta vista
que a leitura anterior tinha perdido):

- **`fim-do-filme`** — 6.930 px numa caixa de 348×379 em torno da Lua.
  É a obra. Quase todos GANHAM luz; **3 dos 6.930 perdem 1 nível num
  canal** — é o tonemap ACES misturando canais (somar luz num canal
  pode baixar outro), não perda de luz.
- **`mercurio`** — 1.082 px, +2 níveis no máximo, caixa de 78×74. A Lua
  vista de Mercúrio é magnitude ~0: uma estrela viva no céu, como no
  céu de verdade. O par `mercurionb` (sem bloom) mostra o ponto CRU —
  **10 px** —, o que prova que a mancha maior do `mercurio` é o bloom
  fazendo o que faz com qualquer fonte brilhante.
- **`mercurionb`** — 10 px, +1 nível. O mesmo ponto, sem bloom.
- **`foco-jupiter`** — 7 px, +1 nível. A Lua vista de Júpiter é
  **m = +4,82** (d = 5,85 UA, α = 29,7°): uma estrela fraca no limite do
  olho nu, e é o que aparece.
- **`mergulho`** (t=180) — **9 px**, todos ganhando, máximo +1, caixa
  6×5 no centro do quadro (md5 `a6cdca686136` → `0eab4aa12d79`). É a luz
  do próprio ponto da Lua naquele instante: legítima, e a vista que a
  primeira leitura tinha perdido.
- **`anao-eris-orbita`** — **1 pixel, −1 nível**. É CONTEÚDO, não ULP
  (a explicação anterior — "aritmética do driver com um vértice a mais"
  — estava errada): a luz da própria Lua (m = +10,39, um ponto de 3,44 px
  no piso) caindo dentro do clarão do Sol, e determinística — duas
  capturas deram o mesmo md5. O nível ir para BAIXO é o mesmo mecanismo
  dos 3 px do `fim-do-filme`: o ACES mistura canais, então somar luz num
  canal pode baixar outro.

E as que NÃO mudaram são a outra metade da prova: `terra`, `lua`,
`terralua`, `eclipse-solar`, `eclipse-lunar`, `eclipse-limbo`,
`foco-luas`, `foco-io`, `foco-titan` — em todas o globo da Lua domina e
`aCede` vai a 1 exato, isto é, **o crossfade apaga o ponto sozinho**;
e as onze vistas profundas (`sol*`, `hero*`, `ua*`) seguem bit a bit.

**A GUARDA (§15)** entrou no juiz que já existia, `world/corpos/lua.test.ts`,
como a seção 6: ela roda o `passoDoPalco` DE VERDADE contra uma
`Planetas` de verdade, na câmera medida do quadro final, e cobra que o
ponto esteja no lugar do pino (bit a bit no float32), que a cessão seja
0 ali, e que o pico E o fluxo da Lua batam **Sirius** — a estrela mais
brilhante do céu inteiro, que é a forma mais forte de "acima de toda
estrela de fundo". **SABOTAGEM PELA PRÓPRIA MÃO, cinco cortes, todos
mordidos** (e a coluna diz QUEM mordeu, porque não é sempre o mesmo
juiz):

| corte | quem reprova |
|---|---|
| `temPonto: true` → `false` (`carregamento.ts`) | `director.test.ts` (pino de texto — `montarCorposDoPalco` não é importável em `node`, o próprio arquivo explica) |
| apagar `escreverPontoDeCorpo` do `palco.ts` | `lua.test.ts` §6 |
| apagar `escreverCessao` do `palco.ts` | `lua.test.ts` §6 |
| apagar `moon: 150` do domínio (a fase vira Lambert) | `fotometria.test.ts`, 2 oráculos |
| H da Lua +0,21 → +4,21 | `fotometria.test.ts` + `lua.test.ts` §6 |

Nenhum juiz novo nasceu (a dieta do item 99 respeitada): as guardas
entraram em `lua.test.ts`, `fotometria.test.ts`, `planetas.test.ts` e
`director.test.ts`, que já existiam.

**O QUE SEGUE ABERTO no item:** o OLHO DELE — se o fim parou de "não
mostrar direito". A distância da Lua no último quadro (~0,51° de
diâmetro) é a máxima que a trajetória aprovada permite; o que mudou foi
o BRILHO, não o tamanho. E fica NOMEADO o que esta obra não fez: as
OUTRAS luas resolvidas (Io, Europa, Titã, Caronte…) e os anões
seguem sem ponto fotométrico — o mecanismo agora existe e serve a
todas, mas cada uma precisa do H e da cor com fonte publicada, que é
trabalho de dado, não de desenho.

**NOTA HERDADA, achada na auditoria de 31/08 e anotada sem obra:** o
que a casa chama de `faseLambertiana` (`planetas/fotometria.ts`) é a
**fração iluminada do disco**, `(1 + cos α)/2` — não a função de fase de
uma esfera Lambertiana, que é `[sin α + (π − α)·cos α]/π`. A Lua não é
afetada (tem lei própria, [ALLEN76]); quem usa esta função é o
**fallback** fora do domínio publicado — hoje o Sol e Plutão, e a
emenda contínua na borda dos outros. As duas curvas coincidem em α = 0 e
em α = π e divergem no meio (em α = 90°: 0,50 contra 0,318). Fica para a
bancada da luz decidir se troca a função ou só o nome; nada muda de
pixel enquanto isso.


**109. Os labels 3D do outro projeto — trazer ou não, com medida.**
(Pergunta dele, 29/08, palavras dele: *"meu outro projeto tinha labels
lindos 3d, porque nao trouxemos isso? com certeza terá algum ganho
visual e de performance. funcionava super bem"*.)

**POR QUE NÃO VIERAM, dito honesto:** a doutrina da fusão (decisão de
então) tratou o atlas doador como ESPECIFICAÇÃO, não fornecedor — a UI
dele foi condenada e renasceu. O sistema atual de rótulos 2D
(`LabelCanvas`) não é herança preguiçosa: ele carrega três leis duras
construídas item a item — *o que se desenha é o que se clica* (pendência
30), a colisão contra o HUD medido (item 56) e a régua de relevância
(item 82). Labels 3D no espaço da cena teriam de reimplementar as três.

**O QUE O 3D COMPRARIA (a favor):** oclusão correta pelos corpos,
profundidade real (o nome perto é maior), movimento solidário com a
cena sem custo de reprojeção por quadro. **O QUE É LENDA ATÉ MEDIR:** o
ganho de performance — canvas 2D com assinatura repinta quase nunca;
sprites/SDF 3D pagam draw calls e atlas de glifos por quadro.

**O SPIKE FOI FEITO em 29/08, por ordem dele — worktree efêmero com o
mecanismo real do doador** (troika-three-text, o texto SDF vivo NA
cena, tamanho estável por escala — o desenho que uma migração de
verdade usaria), porta `?labels3d=N` com carga de população. **OS
NÚMEROS (1920×1080, dpr 2, a abertura):** sem labels 3D **34,4 fps**;
com 10 **33,0**; com 30 **34,0** — dentro do ruído. **O ganho de
performance esperado NÃO existe**: o canvas 2D com assinatura quase
nunca repinta, e os textos 3D não pesam nem aliviam. **O VISUAL:** o
glifo SDF é nítido e tem profundidade de verdade, mas sem as três leis
do 2D ele reabre exatamente o nó que a casa matou — na abertura os
nomes internos se empilham sobre o Sol (foto), sem relevância e sem
clique. Folha: `capturas/item109-spike-labels3d.png`.

**ELE DECIDIU DIFERENTE no mesmo dia — e é gosto dele, vale:** *"vamos
implementar como uma opcao beta a ser ativada no menu. no atlas os
labels 3d sao muito mais bonitos e sao dinamicos de um jeito
interessante"*. **A OBRA DA BETA ESTÁ NO MEIO — o estado exato para a
próxima janela:**

- **PRONTO E COMMITADO:** a camada `world/rotulos3d.ts` (espelha os
  rótulos de corpo que o 2D mandou desenhar — as TRÊS leis ficam no 2D:
  colisão, relevância e clique; o anel segue âncora; `textoInvisivel`
  no LabelCanvas ocupa a vaga sem pintar); a porta `?r3d=1` em
  `lib/beta.ts` (FORA do catálogo do selo, por doutrina dele); o
  espelho/estado em `useEspelhoDaUrl` (`trocarRotulos3d`); a seção
  "Beta · Rótulos 3D" no Ajustes; `director.setRotulos3d` com import
  preguiçoso; dependência `troika-three-text` declarada; fonte
  `public/fonts/inter-400.woff2` embarcada (OFL, ASSETS.md); guarda de
  unidade em `rotulos.test.ts` (texto3d marca corpo, poupa estrela,
  posicaoDoCorpo); **beta desligada = bit-idêntico provado** (SMOKE
  4/4).
- **O DEFEITO DOS GLIFOS: CONSERTADO em 29/08 (2ª sessão).** A causa
  cravada pela sonda se confirmou: o parser do troika não digere woff2
  (digere ttf/otf/woff1). Conserto: `public/fonts/inter-400.woff2` →
  `inter-400.woff` (o MESMO @fontsource/inter 5.0.18, variante woff1,
  latin 400, 29 kB, via `npm pack`); `FONTE` em `world/rotulos3d.ts` e
  ASSETS.md ajustados. Sonda reescrita e re-medida na página viva: o
  `sync` que NUNCA resolvia agora resolve em **774 ms** e
  `textRenderInfo` existe. Na cena: glifos nítidos na abertura e no
  foco, sem quadrados pretos.
- **AS FOTOS PARA O OLHO DELE (feitas, esperando julgamento):**
  `capturas/item109-beta-abertura.png` (Atlas `?atlas=1&r3d=1`) e
  `item109-beta-foco.png` (Saturno `?foco=saturno&ver=orbita&r3d=1`),
  com os pares 2D `item109-beta-*-2d.png` da MESMA câmera e data para
  comparar. 1920×1080 dpr2, `?shot=1` (visão do visitante, HUD), arnês
  `chrome.mjs`. **Duas observações do coordenador para o olho dele:**
  (1) a beta espelha SÓ O NOME — a linha `categoria · distância` do 2D
  some junto com o texto invisível (gosto ou defeito? decisão dele);
  (2) o "SOL" nasce meio engolido pelo clarão do Sol (profundidade
  real: o texto fica atrás do brilho — é o dinamismo que ele elogiou no
  atlas, mas na abertura o nome da estrela sai ilegível pela metade).
  Nota de instrumento: `?shot=2` apaga o HUD e os rótulos 2D moram no
  HUD, mas o texto 3D mora NA CENA — foto "só-cena" com beta ligada
  inclui os nomes; juízes de pixel não são afetados (beta desligada =
  bit-idêntico, SMOKE 4/4).

**A RESPOSTA DELE CHEGOU (30/08), sobre a segunda observação — e é
ordem de obra:** *"ajustamos... sempre importante avaliar sob um olhar
maduro de UX/UI senior"*. O ajuste é desta beta, mesmo item: **(1)** o
nome de estrela tem de nascer LEGÍVEL mesmo dentro do clarão — o
caminho técnico é mecânica interna, preservando a oclusão pelos globos
que o item 112 consertou; **(2)** a primeira observação (a linha
`categoria · distância` que some no 3D) decide-se sob o MESMO olhar de
UX e volta declarada na mesma folha. As fotos de 29/08 são ANTERIORES
aos consertos do 112 na beta — as novas saem do código atual e
gravam-se AO LADO (`-v2`), nunca por cima; o olho dele julga a folha
nova. **O AJUSTE POUSOU EM 30/08**, e o caminho foi o do espelho, não o
do caso especial: o nome 3D passou a nascer na FOLGA do 2D (o
`RECUO_DO_TEXTO`, 18 px sobre o corpo de 13 — era um espaço de ~4 px, e
por isso o "S" caía dentro do núcleo) e ganhou o mesmo HALO ESCURO que
o canvas põe atrás de todo nome (`shadowBlur 7` → contorno com borrão
no SDF). Medido na abertura: a primeira letra do "SOL" saiu de 1,8:1
para 12,5:1 de contraste, com a palavra inteira em 15:1. Fotos `-v2` na
mesa (o par 2D saiu bit-idêntico ao de 29/08, mesmo md5). A linha
`categoria · distância` FICA FORA do 3D por decisão de UX — texto de
cena é identidade, o dado mora na ficha e no 2D —, à espera do veto
dele. **Achado a decidir:** a linha `depthTest = false` do 112 nunca
chegou a material nenhum (com contorno, o `material` do troika é um
ARRAY) — o nome sempre foi ocluído pelos globos, e continua sendo; o
defeito que o 112 quis matar (a casca do próprio corpo engolindo o nome
em close) segue aberto.

**O VEREDITO DO SPIKE fica como história da medida: NÃO migrar** — obra GRANDE (reimplementar
colisão + relevância + clique no espaço 3D) por ganho estético parcial
e zero de performance. O que vale colher pontualmente, se um dia
incomodar: oclusão do rótulo atrás do globo, que dá para fazer no 2D
com os oclusores que a casa já tem. **A decisão é dele: arquivar, ou
ordenar a obra grande mesmo assim.** O worktree e a troika foram
removidos após o spike, como manda o desenho.

**A CONFERÊNCIA DELE em 31/08, testando a beta consertada — três
vereditos, palavras dele:** (a) legibilidade OK ("o nome continua facil
de ler"); (b) **REPROVAÇÃO — e o conserto da causa POUSOU em 31/08, aprovado por
ele nas fotos (commit b394141)**: *"nao, quando aproximo o corpo do
objeto engole o texto"* — investigado: o "conserto" de 30/08 NUNCA
existiu (o depthTest era escrito numa lista de materiais do troika e
morria; commit 4f13f00 já tinha removido as linhas mortas). Causa
verdadeira: o texto vivia no CENTRO do globo, atrás da casca que
escreve profundidade. Conserto: o nome avança pela linha câmera→corpo
(AVANCO_EM_RAIOS 1,05, rotulos3d.ts:89) — mesmo pixel e tamanho na
tela, à frente da superfície, teto no near — preservando a oclusão
pelos OUTROS corpos (o ganho real do 3D). Sabotagem avanco=0 reprova
os 4 vereditos novos; fotos item109-engolimento-* em 3 corpos,
conferidas pelo coordenador e por ele; 3 riscos de borda declarados no
relato (lua raspada abaixo do piso da roda; nome do planeta pode furar
lua a <1 raio à frente; cascas sem profundidade intocadas);
(c) direção de produto: *"o texto parece mais definido no 3d, ficou
visualmente atraente, mas ele parece sempre do mesmo tamanho, achei que
teria algo mais dinamico regendo a posicao e tamanho das fontes e
icones"* — a beta pede uma régua dinâmica de tamanho/posição (a
mineração do Eyes tem o mecanismo mapeado: tamanho por pixels na tela e
intervalos de aparição, mergulhos 06/08); e **DECISÃO DE DOUTRINA
dele**: *"Nao acho que devemos nunca transformar o modo 3d ou 2d num
modo unico, acho que é algo de preferencia que deve ficar guardado
quando selecionado pelo usuario"* — 2D e 3D coexistem para sempre como
preferência salva do usuário; ninguém propõe unificação de novo.

**116.** (Suspeita a medir, achada em 31/08 fechando o item 84.)
`?foco=tritao` devolve o disco de Tritão **inteiramente escuro**, com e
sem `?d=`, no jd pinado do gate (2460409.26) — silhueta preta sobre a
Via Láctea. Pode ser geometria honesta (a noite virada para a câmera
naquele instante) ou defeito do degrau `lua` de Netuno (enquadramento
ou luz). Antes de tocar qualquer linha: par de capturas em dois jd
diferentes e a conta do terminador (onde o Sol está em relação à
câmera). A vista foi DESCARTADA do gate do 84 por isso; se for
geometria honesta, vira candidata de novo com outro jd.

**VEREDITO (medido em 31/08 — luz e enquadramento INOCENTES; culpado é o
MAPA).** A câmera está no lado do DIA: ângulo de fase 70,00° no jd
pinado (67% do disco iluminado) — e é 70,00° exato porque
`MAX_SOLAR_DEVIATION_GRAUS` de `direcaoDaLua`
(`src/three/cinematic/enquadramento.ts`) grampeia ali. O censo das 13
luas no mesmo jd dá fase ≤ 70° em TODAS (Lua 6,7° … Calisto/Ariel/
Oberon/Caronte 70,0°): o degrau `lua` sempre escolhe o lado do dia, e
Tritão não é azarado. Sem eclipse (Sol↔Netuno visto de Tritão: 34,7°,
contra 4,0° de raio angular de Netuno), `uLuzGanho`=1 e `uEclipseAtivo`=0
como em Ganimedes. O preto é a TEXTURA: `public/textures/atlas/triton/
map.webp` é mosaico parcial da Voyager 2 com **76,0% da área esférica em
preto puro** (Ganimedes: 0,16%), e o shader usa o mapa como albedo cru
(`albedo = texture2D(uMapaDia, vUv)` em `ROCHOSO_LS_FRAG`/`LAMBERT`,
`src/three/world/corpos/rochoso.ts`) — albedo 0 × luz = 0. Em 24
instantes (uma órbita de 5,88 d e um ano) o sub-ponto da câmera cai
SEMPRE no vazio do mosaico (amostra da textura: média 0, máx 0), porque
Tritão é síncrono e o enquadramento vai para o lado oposto a Netuno.
Prova por gesto do produto: 4 arrastos de 400 px no MESMO jd levam o
sub-ponto a uv (0,634 / 0,829), dentro do trecho fotografado, e o miolo
do quadro sobe de 2,7/4,3 para 11,8/101,6 — o globo acende
(`capturas/item116-tritao-girado-4x400px.png`). **A família é maior que
Tritão**: Titânia 68%, Ariel 66%, Oberon 66%, Umbriel 63%, Miranda 61%,
Hígia 59%, Jápeto 30% de área preta no mapa. **Conserto proposto (não
implementado):** preencher o vazio dos mosaicos parciais na origem —
albedo médio do corpo, com a costura suavizada — em vez de servir preto
puro como albedo. Fotos `capturas/item116-*.png`, rastro com ângulos,
distâncias e a receita de recomputo em `capturas/item116-tritao.json`.

**117.** Aro azulado fino na borda dos globos em close-up — **FECHADO em 02/09**; ARQUIVO.

**126.** `?foco=mars` caía na estrela Marsic, não em Marte — **FECHADO em 01/09**; ARQUIVO.
---

## BAIXA — dívida interna, ninguém vê

**130. O app inteiro bilíngue — português e inglês (futuro, direção
dele em 01/09).** Palavras dele, ao pedir as tabelas bilíngues da busca:
*"depois temos que transformar nosso app todo em bilingue"*. Medido em
01/09 (contagem grosseira por script, não por olho): ~460 trechos de
texto em português no código fora de testes (o grosso em
`cadastroDeRepresentacoes.ts`, `selo.ts`, `escala.ts`, `ficha.ts`, HUD e
paleta — parte é texto interno de auditoria, não de tela), ~280 textos
nas fichas dos corpos (`public/data/atlas/corpos.json`) e as legendas
do filme. O mecanismo é pequeno (dicionário + língua na URL/navegador,
sem biblioteca); o volume é a tradução. Ordem sugerida quando vier:
(1) a chave de língua e o HUD/botões/dicas; (2) as fichas dos corpos;
(3) as legendas do filme; (4) o resto. Antes de qualquer obra: censo
por OLHO do que é texto de tela e do que é texto interno. **NA FILA
por ordem dele (01/09, "app inteiro bilingue na fila"): é a próxima
frente depois de fechar o 129.** A busca (129/F5) já nasce bilíngue.

**131. Aglomerados, nebulosas e nuvens na busca — roadmap futuro, depois
da curadoria do desenho deles.** Palavras dele em 01/09, ao fechar o
129: *"não vamos fazer isso agora. precisamos ver esses objetos com
calma, acho que hoje talvez eles não sejam desenhados corretamente,
teríamos que curar isso. vamos deixar como roadmap futuro."* Fatos
medidos no dia: os arquivos que o app carrega para essas famílias
(`public/data/galaxy/*.bin`, manifesto) guardam só posição e física —
o nome foi descartado na linha de montagem; os catálogos de origem têm
nome nos aglomerados do Gaia (coluna `Cluster`: NGC, Melotte…) e só
código de coordenada nas regiões H II e masers; as nuvens grandes não
têm nome nem na origem; o cache local dos catálogos não existe (baixar
de novo). Dois caminhos quando vier: (1) tabela curta de lugares
famosos (Nebulosa de Órion, Plêiades, Carina, Lagoa, Águia, Aglomerado
Duplo, nuvens de Touro/Ofiúco/Cisne) pelo mesmo mecanismo de `lugar`
do centro galáctico, com foto de chegada em cada um; (2) reexportar os
nomes dos aglomerados num arquivo lateral (base útil para o 114).
**Pré-requisito, ordem dele: olhar com calma como essas famílias são
desenhadas hoje e curar antes de apontar a busca para elas.**

**132. O juiz `atlas-smoke` está desatualizado pela onda 125 — 7 provas
de rótulos reprovam, e uma pode ser defeito de verdade.** Achado em
02/09 ao rodar o juiz no fecho da faxina (com o sim dele). PROVADO que
não é da faxina: o mesmo juiz rodado no código do fecho da onda 125
(`11cdbf0`, worktree) dá as MESMAS 7 falhas mais a do 119
(`capturas/item132-atlas-smoke-antes-11cdbf0.log` vs
`-depois-37d6010.log`). A onda 125 mudou as regras dos rótulos pelo olho
dele (F4 encobrimento, F5 tipografia e ícones, F7 portas) e só rodou a
suíte, não este juiz. O que reprova: (a) o CENSO da abertura e do teto do
zoom — o juiz pina 15 nomes e uma lista exata de estrelas; hoje são 17
(entram Alnair, Sargas, Shaula; sai Fuyue) — provavelmente só re-pinar;
(b) "1 cortado sem vencedor (corpo:uranus)" — a régua do juiz não conhece
as causas novas de corte (encobrimento/portas); verificar se Urano some
por regra nova ou por defeito antes de re-pinar; (c) no CELULAR
(390×844) Plutão não está desenhado sobre o canvas — pode ser a
tipografia de 16 px da F5 tirando vaga; conferir com foto do telefone.
Obra: olhar as três com foto, re-pinar o juiz com número medido e
declaração no commit (§13). Não bloqueia nada: o site publicado é
anterior à onda 125.

**118. A tela de abertura merece ser repensada por inteiro (futuro).**
Palavras dele em 31/08, ao encerrar o item 34: *"acho que ainda temos
grande oportunidade nessa tela de abertura no entanto.. nao acho muito
bonita ainda... talvez tenhamos que repensar no futuro completamente
essa tela de loading, mas por enquanto vamos dar como encerrada."* Fica
registrado como obra futura de produto, sem urgência; quando vier,
começa por propostas visuais para o olho dele (a mineração do Eyes tem
o mecanismo do loading deles mapeado no mergulho 06 — bundle separado,
dados essenciais antes do app, saída em fade).

**129.** Modos não são universos; a busca é uma só — **FECHADO em 01/09**; ARQUIVO.

**119.** O atlas-smoke prova 3 reprovava em t=250 (Terra velha) — **FECHADO em 02/09**; ARQUIVO.

**125.** A onda da paridade — linhas, rótulos e ícones do Eyes — **FECHADA em 01/09**; ARQUIVO.

**120.** A histerese da régua de relevância nunca valia — **FECHADO em 31/08**; ARQUIVO.

**121.** O juiz da beira da fita não media a perna dpr 1 — **FECHADO em 31/08**; ARQUIVO.

**122. O quad das nuvens ainda apaga as OUTRAS camadas aditivas que
estão na frente dele (herdado do item 37, 31/08).** O conserto do 37 deu
dois lados ao campo de catálogo, e só a ele. As demais camadas aditivas
seguem inteiras do lado de trás do quad multiplicativo (`renderOrder` 5),
e como nenhuma escreve profundidade, todas continuam sendo multiplicadas
por nuvem que está ATRÁS delas: o **clarão de asas** (`clarao.ts`, ordem
3 — a lente das fontes fortes, que é artefato do instrumento e nasce na
câmera), as **16 heroes** (`heroStars.ts`, ordem 3) e a **poeira local**
(`dust.ts`, ordem 4). As cascas (`wrappedStars.ts`) e as partículas da
galáxia estão do lado CERTO — são o fundo que as nuvens têm de escurecer,
e é delas que vêm as fendas escuras da faixa. Os dez corpos NÃO sofrem: o
grupo é opaco, escreve o único depth da casa e o `depthTest` do quad o
rejeita. **Nada disto está medido** — o que está medido é a ordem no
código. Casa do conserto: as heroes e o clarão são poucos objetos, com
posição conhecida, e o oráculo do 37 (`temNuvemNaFrente`) já responde por
eles um a um — dá para escolher o `renderOrder` de cada quad. A poeira
local é campo de pontos e pede o mesmo canal do campo. **E há o caminho
grande, que segue de pé:** a extinção das nuvens dentro do shader de cada
camada, por um bake direção × distância — o conserto que o 37 recusou
pelo tamanho, e que resolveria todas de uma vez.

**95.** Num eclipse o chão escurecia e o AR não — **FECHADO em 25/08**; ARQUIVO.

**96.** "O Sol está na origem" era combinado, não verificado — **FECHADO em 29/08**; ARQUIVO.

**94.** O segundo cobertor compunha um quadro que ninguém lia — **FECHADO em 29/08**; ARQUIVO.

**22.** As 6 fotos reais do Sol nunca foram curadas — a bancada nunca as
baixou nem as pôs diante do olho dele. *(A outra metade do item — "35
imagens de referência citadas que não existem" — morreu em 01/09 na
verificação: o `referencias-corpos/LEIA-ME.md` foi limpo em 12/08, dois
dias antes de o item nascer; hoje cita 8 e as 8 existem.)* Trabalho de
bancada com o olho dele, não conserto; conversa com o 12 e o 23.

**23.** A granulação do Sol não é física (45 Mm contra 1 Mm reais) e muda
55% conforme a placa de vídeo.

**24.** A dose da ejeção de massa (1,4) nunca foi calibrada.

**25.** Mergulhar no Sol é impossível abaixo de 1,44 raios solares — o
corte come a superfície.

**26.** O brilho das estrelas é relativo, não absoluto.

**27.** Faltavam fixtures Horizons de posição de 4 planetas — **FECHADO em 02/09**; ARQUIVO.

**28.** Dívidas internas de cor a re-dosar.

**38.** Canal `aFocus` dormente por desenho — **não apagar.** É o que
apaga o ponto de uma estrela quando ela ganha corpo (passo E3 da lei).
Se a onda do motor terminar sem fiá-lo, aí sim vira peso morto.

**45.** (Herdada do item 44.) A perna retina das réguas não cobre o
`sky-capture` — a medição do céu interno contra o panorama ESO precisa de
decisão própria de resolução quando esse assunto voltar à mesa.

**49.** (Ruído de instrumento, achado nos cortes 4-5 da arquitetura.)
As vistas oficiais da TERRA cintilam entre capturas da MESMA sessão no
MESMO código — `terralua` (corte 4 da Parte 2: duas capturas do antes
com md5 distintos) e `terranb` (corte 5 da Parte 1: primeira captura do
depois transiente, segunda byte a byte igual ao baseline; a recaptura
isolada saiu IGUAL). Algo assenta entre capturas — cara de carga
preguiçosa de textura. Enquanto viver, qualquer A/B pode acusá-las em
falso; a prova de inocência é uma captura do lado acusado bater byte a
byte com o baseline (funcionou nas duas).

Uma pista MORREU em 22/08: o item 66 (a mesma URL dando duas telas) era
o mostrador de quadros por segundo do HUD entrando na foto — e as vistas
da Terra são `?shot=2`, sem HUD nenhum. Não é a mesma raiz.

**DATADO POR REPETIÇÃO em 31/08, e NÃO se reproduziu.** A `terralua` (a
`terranb` já não está na lista de vistas) entrou na varredura da família
descrita no item **101** — 63 capturas, nos DOIS contextos. **As 6
capturas de `terralua` no balde e as 3 no isolado deram todas o mesmo
md5** (`22eabfacec75@1800x1713`). O item fica aberto, honesto: o fenômeno
não se reproduziu sob comando, então não há o que consertar nem o que
fechar.

**DATUM DA F1 (01/09, forense do re-baseline da onda 125):** o tremor é
**ENTRE sessões do navegador, não dentro** — 160 capturas na mesma sessão
deram zero oscilação; a `terralua` só diferiu quando capturada em SESSÕES
distintas. Combina com a cara de "algo assenta" (carga/estado que se firma
por sessão) e estreita a caça: quem procurar a causa deve comparar o que
muda entre dois processos do navegador, não entre dois quadros.

**64.** (Ruído de instrumento, visto UMA vez em 21/08.) Um filho do
`ab-identidade` mediu as suas 18 vistas, gravou o estado e o arquivo de
vias, e NÃO saiu — ficou 12 minutos vivo depois do `process.exit(0)`,
com o pai parado no `Promise.allSettled`. As 52 vistas já estavam em
disco; matar o filho fez o pai fundir os três baldes normalmente e só
então lançar `filho j0 saiu com null`, sem imprimir o veredito. O lado
`antes` da mesma bateria, com os mesmos três filhos, terminou sozinho.
Enquanto viver, uma leva que pare com todos os baldes cheios se resolve
matando o filho preso — o veredito sai da segunda invocação, que lê tudo
de disco. **O suspeito ganhou nome em 22/08, medindo o item 76:** cada
chamada de CDP fica pendurada num `id` que só o Chrome responde, e o
`send` do `chrome.mjs` não tinha nenhuma saída para o Chrome que morre
SEM responder — a promessa ficava viva para sempre, e com ela o processo.
O buraco foi tapado em `6dacdc4` (fechar o socket agora reprova os
pendentes, nos dois lugares que falam CDP), mas isto NÃO é a prova: o
defeito não se
reproduz sob comando, e o item só fecha quando uma leva presa voltar a
acontecer e sair com erro legível em vez de sono. **A OUTRA METADE
MORREU em 23/08** — o Chrome que sobrevivia ao juiz é o assunto do item
**78**, e o conserto está lá. O que segura ESTE item é só o sono.

**78.** (Ruído de instrumento, visto UMA vez em 22/08.) **O
`ab-identidade` com `JOBS=3` travou DEPOIS de terminar.** Os três
processos-filhos capturaram as 52 vistas, gravaram os arquivos de
estado e saíram — o pai ficou 25 minutos vivo, sem filhos, sem
consumir CPU e sem imprimir o veredito, com 20 Chrome órfãos na
máquina. O `Promise.allSettled` sobre os `on('exit')` dos filhos não
resolveu, e o pai nem chegou a fundir os três `-j*.json` (eles
continuavam em disco, e a fusão os apaga). Contornado à mão: fundir os
três num `ab-identidade-depois.json` e rodar o lado de novo — as 52
vieram `(de disco)`, com o CARIMBO conferido (`c8507bad1eb9-d41d8cd9`),
e o veredito saiu em segundos. **O suspeito mudou em 22/08:** não é o
`stdio: 'inherit'` — é o mesmo `send` sem saída do item 64 (uma chamada
de CDP que espera para sempre a resposta de um Chrome morto). O `send`
dos dois caminhos (`abrirSessao` e `capturarCDP`) agora reprova os
pendentes quando o socket fecha (`6dacdc4`); enquanto o travamento não
voltar a acontecer para mostrar o erro, o item fica aberto.

**OS 20 CHROME ÓRFÃOS SÃO OUTRO DEFEITO, E ESSE MORREU EM 23/08.** Não
era consequência do travamento: o `finally` que mata o Chrome é o
caminho FELIZ, e quando o Node morria no MEIO (Ctrl+C, `kill` de agente,
`process.exit` dentro de um `try` — o `--cru` do `gpu-profile` fazia
exatamente isso) ele não rodava, o browser reparentava para o launchd e
ficava desenhando o app com contexto Metal para sempre. Custo medido na
casa: dois headless de 1,5 dia com `PPID=1`, ~45% de CPU e ~1,2 GB
disputando o M1 do dono — e o próprio `chrome.mjs` já tinha medido a
baseline caindo de **20,0 para 8,0 fps** com órfãos vivos. Era, de longe,
a maior perda de quadro desta máquina, e não estava no app.

O conserto é estrutural: os OITO `spawn(CHROME)` soltos do projeto
viraram UMA porta (`lancarChrome`, em `chrome.mjs`), toda sessão viva
entra num registro, e UM vigia só — `exit` + `SIGINT` + `SIGTERM`,
armado uma vez e nunca por chamada — mata browser e helpers pelo
`user-data-dir` quando o Node cai. Provado com o mesmo juiz nos dois
lados: morto no meio por `kill -INT`, **antes** deixava 2 headless de pé
(o browser e o Helper de GPU com Metal), **depois** deixa ZERO; até o
fim normal, zero; e num laço de 8 capturas os ouvintes de sinal ficam em
**1, 1 e 1** (um tratador por chamada seria vazamento com outro nome).
Origem: relatório externo de degradação, verificado por leitura
independente antes de virar código. A conferência do dono é só o fps que
ele sentir — o número de processos já está provado.

**79.** As duas telas de erro esperavam o olho dele — **FECHADO em 25/08**; ARQUIVO.

**80.** (Ruído de instrumento, achado em 22/08 fechando o item 74.) **Uma
das 52 vistas oficiais não repetiu a si mesma.** O `ab-identidade` captura
cada vista DUAS vezes por lado, e é assim que ele sabe distinguir "mudou"
de "oscila". Na corrida `antes` (HEAD `3235aa7`, árvore limpa) a vista
`lua` devolveu `e90581bdd9d0` numa captura e `6550cae71307` na outra — o
MESMO código, dois md5. Não é regressão da obra: o lado `depois` deu
`6550cae71307` em oito capturas seguidas (a leva inteira mais três
recapturas forçadas com `DOZERO=1`), e as outras 51 vistas saíram
IGUAL contra IGUAL. Ou seja, o que oscila é a vista, não a mudança — e o
juiz a marcou `INSTÁVEL`, que é exatamente o que ele existe para fazer.
Fica aberto porque não se reproduz sob comando: enquanto não voltar, não
há o que medir. Quando voltar, o passo é guardar os DOIS PNG e rodar o
`diff-pixel` — o suspeito de sempre nessa vista é a textura chegando em
estados diferentes, e o gate tem defesa contra isso (`friaNoGate`), o que
torna a hipótese menos provável e o achado mais interessante.

**DATADO POR REPETIÇÃO em 31/08, e NÃO se reproduziu.** A `lua` levou 6
capturas no contexto de BALDE e 3 no ISOLADO, e as **nove deram
`09d8c61fa256@1800x1713`**. Ela entrou na varredura da família inteira
(63 capturas, 7 vistas) descrita no item **101**.

**81.** O MB1 reprovava em cinco famílias — culpa do juiz — **FECHADO em 25/08**; ARQUIVO.

**84.** O gate de identidade cobria o Atlas com 1 vista só — **FECHADO em 31/08**; ARQUIVO.

**85.** O atlas-smoke reprovava o toque duplo sem defeito — **FECHADO em 31/08**; ARQUIVO.

**86.** O céu do Atlas parecia apagado pela lente — **FECHADO em 29/08**; ARQUIVO.

**88.** Ao enquadrar qualquer lua aparecia o eixo da nossa Lua — **FECHADO em 25/08**; ARQUIVO.

**90. Upscaling espacial como feature experimental (beta).** (Decisão do
dono em 24/08, em resposta ao levantamento de desempenho. **Fila futura,
prioridade BAIXA — atrás de tudo que está aberto.**) Palavras dele:
*"vamos colocar isso numa fila futura, baixa prioridade nesse momento, mas
definitivamente um ganho interessante para testar como feature
experimental (podemos colocar um flag de beta independente do modo para
ser acionado como um DLSS faz)"*.

**DLSS NÃO EXISTE NO NAVEGADOR, e isso é fato verificado, não pessimismo:**
ele está preso a hardware NVIDIA mais driver nativo, sem qualquer porta
para a web — e a máquina do dono é um **M1**, que nem NVIDIA tem. O
equivalente da Apple (**MetalFX**) é igualmente só nativo. Quem promete
"DLSS no browser" está vendendo outra coisa.

**O CAMINHO VIÁVEL É O FSR 1 da AMD:** shader **aberto (MIT)**, já
portado para three.js por terceiros. Ele é espacial (não usa vetores de
movimento nem histórico), então cabe num passe de pós: **renderizar a
~70–80% da resolução, ampliar com EASU e afiar com RCAS**. Ganho típico
esperado: **30–50% do tempo de GPU devolvido** — e isso importa porque o
app **é GPU-bound**: **36–42 fps** no M1 em `cinema`/`pixelRatio` 2,0 —
medido em **24/08 com `scripts/visual/gpu-profile.mjs`**, janela
1200×900. (O mesmo instrumento, na vista das galileanas, deu 22,8 fps:
a faixa depende da vista, e quem citar o número tem de citar qual.)

**A RESSALVA, escrita antes de alguém se animar:** a nossa cena é o
**pior caso** para upscaling espacial — céu de estrelas sub-pixel e
linhas finas, que é exatamente o que EASU borra e RCAS depois exagera. A
fita de 1,25 px do item **83** ajuda (linha com corpo reamostra melhor
que fio de teia), mas não isenta. **Por isso o veredito não é a régua: é
FOTO A/B lado a lado mais fps medido, e o olho do dono.** Se o céu
"chapinhar", não entra — nem como beta.

**A FORMA, decidida por ele:** flag de **beta INDEPENDENTE do modo e do
tier**, acionável como se aciona um DLSS. Não é um quarto degrau de
qualidade. A casa do assunto é a dos tiers (`core/engine.ts`, e o `Auto`
que mede e sugere), porque é lá que já mora quem decide resolução — mas a
chave é própria, e nasce desligada.

**98. A reforma do PENDENCIAS — o vivo e o museu.** (Decidida por ele em
**14/08**, morta no primeiro passo, ressuscitada por ordem dele em **25/08**
e executada no mesmo dia. **O que sobra deste item entra na fila ATRÁS do
item 75.**)

**O PROBLEMA MEDIDO:** este arquivo tinha **2.874 linhas** — 955 no sábado,
triplicou em dois dias —, ~72 itens numerados dos quais a maioria FECHADA, e
191 commits em cima. Cada leitura completa custava ~65 mil tokens, e só em
25/08 uns 30 agentes o leram. Ele era três coisas num arquivo só: a fila
viva, o **MUSEU** (itens aposentados com história completa, que nunca saem)
e o diário. **O museu era o monstro.**

**AS DECISÕES DELE, que não se re-litigam:**

- **14/08:** mantêm-se os **NOMES** dos arquivos de hoje (37 citações por
  nome vivem dentro de `src/` e `scripts/`); **NÃO se cria
  `docs/historico/`** — o git é o diário, e o ponto de restauro é a tag
  `docs-antes-da-reforma`; endereço em documento é **por símbolo, nunca por
  número de linha**; e **número aposentado nunca se reaproveita**.
- **25/08:** *"temos que ter um sistema vivo e o arquivo do passado, não
  tudo no mesmo lugar"* — a forma é **UM arquivo-museu único**,
  `docs/PENDENCIAS-ARQUIVO.md`, e não uma pasta.
- **25/08, a regra que nasceu da autópsia: DECISÃO SEM NÚMERO MORRE.** Ela
  mora no cabeçalho deste arquivo e no `AGENTS.md`, que é onde trabalha.

**A AUTÓPSIA, em três linhas, porque é ela que justifica a regra.** A
reforma começou em 14/08 às 15h55 (a tag existe), o primeiro passo quase
apagou código são, a sessão recuou — e a reforma **morreu ali**, com 318
commits passando por cima. **Causa raiz: ela nunca virou ITEM NUMERADO
aqui**; vivia só numa memória de coordenador, que informa mas não enfileira.
De carona, a regra "mentira primeiro, estrutura depois" virou álibi: toda
sessão fazia metade das mentiras e a estrutura passava fome.

**O QUE ESTA CIRURGIA ENTREGOU (25/08):** o museu nasceu com a história
**verbatim e o número intacto** dos itens **61, 70, 77, 81, 82, 83 e 91**,
mais o diário do cabeçalho (os bastões de 17 a 25/08 e as seções de números
aposentados); cada item movido deixou aqui uma entrada curta apontando para
lá; o cabeçalho ganhou as **duas regras novas** (a de leitura e a do
número); e o `AGENTS.md` — que é a primeira coisa que todo agente lê —
ganhou as duas, apontando para cá em vez de duplicar a história.

**28/08, ele refinou a LEITURA, não a forma** (item **106**): o vivo
continua sendo este arquivo e o museu o outro. A janela cara lê o
bastão, a fila e o item da vez — não as ~1.800 linhas. A forma (um
vivo, um museu, git é o diário) não se re-litiga.

**O QUE FICA ABERTO DENTRO DESTE ITEM** — o resto do plano de 14/08,
conferido contra o código em 25/08:

- **a baseline do gate gerada e VERSIONADA.** Hoje o `ab-identidade` guarda
  tudo em TMPDIR, e o `NORTE` já registra a falta ("baseline indexada pela
  GPU, fora do TMPDIR — ainda não existe; o ritual é manual"). Sem ela,
  mexer nos documentos deixa a casa sem valor esperado. **E mais uma
  razão, achada em 31/08:** esse estado em `$TMPDIR` é COMPARTILHADO entre
  as worktrees e a árvore principal — o carimbo é do código, então mesmo
  carimbo quer dizer mesmo cache, e duas mãos em paralelo escrevem uma por
  cima da outra sem aviso nenhum.
- **o dossiê mecânico dos itens abertos**, como checklist da extração.
  Agora só vale para os documentos que a reforma ainda não tocou —
  `NORTE.md`, `PLANO-ATLAS.md`, `LEI-DA-ESTRELA.md`.
- **O QUE NÃO FICA ABERTO, e por quê:** o `scripts/docs-check.mjs` com
  lista de exceções foi construído, medido e **removido pelo dono no mesmo
  14/08** — *"só mais um problema para o futuro, um teste que pouco faz"*.
  Ele mora nos **becos sem saída** do `NORTE.md` e não volta: a praga que
  importa (documento que afirma faltar algo já pronto) é invisível para
  qualquer máquina. Quem confere se o escrito é verdade é gente, com
  auditoria por onda.

**A QUEIXA DELE DE 25/08, no fecho da sessão — o modelo AINDA engorda, e
esta é a terceira vez.** Palavras dele: *"acho que temos que pensar mais
um pouco no modelo de documentacao viva, novamente vc criou algo e já
estava engordando o arquivo... nao sei mais o que fazer..."* O caso da
vez foi o **bastão** (a memória de coordenador entre sessões), que numa
rodada só virou diário — e o padrão é sempre o mesmo, já visto no
PENDENCIAS pré-reforma e nos testes (item 99): **escrever é barato para
quem escreve e caro para quem lê depois; acrescentar nunca dói na hora, e
ninguém apaga**. O diagnóstico do coordenador, registrado para a decisão:
o coordenador propôs "teto com porteiro" para todo registro vivo — e
**ELE RECUSOU, no mesmo fecho, com a regra mais simples que fica sendo a
lei.** Palavras dele: *"temos que simplesmente apagar as linhas feitas e
nao criar arquivos novos, a arquitetura é fixa. Se está crescendo muito o
arquivo é porque temos um backlog grande a resolver mesmo... já o arquivo
de memória nao tem problema crescer tanto, ou talvez possamos vetorizá-lo
no futuro se isso chegar a virar um problema mesmo."* Traduzido em três
regras: (1) **a arquitetura da documentação é FIXA — nenhum documento
novo, nunca**; (2) **linha feita se APAGA do vivo** (o fluxo vivo→museu
que já existe é o cumprimento disso — manter); (3) **tamanho de arquivo
não é problema a policiar**: o vivo grande reflete backlog real, e a
memória de coordenador pode crescer livre (vetorizar é opção futura SE
um dia doer). Sem teto, sem porteiro, sem burocracia nova.

**101.** (Ruído de instrumento, achado em 25/08 fechando o item 88 —
irmão dos itens 49, 80 e 85.) **O anel de Saturno treme entre capturas do
MESMO código.** A vista `saturno-anel`, na leva desde a F6, contra ela
mesma dá **828 px** (0,027%, delta máx 47) — a auditoria reproduziu ao
pixel; a irmã dela `saturno-anelnb` (a mesma vista sem bloom) entrou na
lista em 25/08, pela leva do item **92**, com os dois lados instáveis
contra si mesmos; a `eclipse-limbo` entrou em 25/08, pela leva do item
**77** (par nulo no lado antes: dois hashes com o MESMO código, e o
depois dentro do conjunto do antes — mesma família: casca de atmosfera +
sombra no limbo, textura chegando em estados diferentes); a `foco-titan`
nova dá **605 px numa medição e 262 px noutra**
(estocástico: o número muda por leva, e por isso nenhum vale como pino) —
sempre na caixa sobre a linha do anel e a sombra dela no globo. A câmera
está fora de suspeita (pose bit a bit igual nas duas navegações); o
suspeito de sempre é textura chegando em estados diferentes. Enquanto
viver, um A/B pode acusar essas vistas em falso — a prova de inocência é
o par nulo (o mesmo lado contra ele mesmo), que já pegou este.

A `foco-luas` entrou em **31/08**, pela leva do item **59**: dentro do
balde da leva cheia (9 navegações na MESMA sessão de Chrome) as duas
capturas do lado *depois* — mesmo código — deram md5 diferentes,
`fda93db749c0` na primeira e `6af9c0dbcbe4` na segunda, que é o md5 do
lado *antes*. Medida em seguida **isolada**, uma sessão de Chrome por
captura, ela é estável: 3 capturas no código novo e 3 no código antigo
(`63ce689`) deram as seis `6af9c0dbcbe4`. É tremor de **contexto de
balde**, não da obra — a família deste item com o **80** —, e por isso o
A/B fechou 51/51 bit-idênticas. Rastro:
`capturas/item59-ab-vistas.json`.

**PARTE DISTO TINHA CAUSA, E A CAUSA CAIU EM 26/08 (item 104, S3).** O
`sombraDoAnel` de `gigante.ts` lia a placa do anel com a busca DEPOIS dos
`return` geométricos, e uma busca sem LOD sob quadrado partido escolhe o
nível da textura por uma derivada de lixo — valor que muda **a cada
execução**. Isso é exatamente "a mesma vista, o mesmo código, dois
quadros diferentes", e caía "na caixa sobre a linha do anel e a sombra
dela no globo", que é onde este item sempre apontou. Consertada a ordem,
o par nulo da vista da costura foi de 618 px a **ZERO**, e as quatro
vistas desta lista deram **0 px** numa medição de duas capturas cada
(`capturas/item104-parnulo-vistas101-v2.json`).

⚠ **ISSO NÃO FECHA O ITEM, e a razão é o controle.** A `eclipse-limbo`
também deu zero — e ela não tem anel nenhum, logo o conserto do S3 não
pode explicá-la. Somado ao que o próprio item já diz (o número é
estocástico: a `foco-titan` deu 605 numa medição e 262 noutra), duas
capturas por vista não enterram o fenômeno. O que ficou PROVADO é que a
família de Saturno carregava, além do tremor, um defeito de código; o que
sobrar do tremor continua vivendo aqui, e a régua continua sendo o par
nulo.

**A VARREDURA DE 31/08 — 63 capturas, ZERO oscilação, e o item continua
aberto.** A faxina da estação do item 115 datou a família inteira por
repetição, antes de mexer em qualquer coisa. Sete vistas — `lua`,
`terralua`, `eclipse-limbo`, `saturno-anel`, `saturno-anelnb`,
`foco-titan`, `foco-luas` —, nos DOIS contextos que o item acusa:

· **BALDE** (o contexto do item 59/80: uma sessão de Chrome só,
  `Storage.clearDataForOrigin` entre navegações, três rodadas de DUAS
  capturas por vista, as vistas alternando entre as rodadas — 42
  capturas, 5,0 min): **as 6 capturas de cada vista deram um md5 só.**

· **ISOLADO** (uma sessão de Chrome por captura — 21 capturas, 2,7 min):
  **as 3 de cada vista deram um md5 só, e o MESMO do balde.**

Ou seja: hoje, nesta máquina, nenhuma das sete treme, e o md5 não depende
do contexto. **Isso não fecha o item, e a razão é a mesma de sempre:** o
fenômeno nunca se reproduziu sob comando, e ausência sob 63 capturas não
é prova de morte. **O que a varredura NÃO cobriu é a CARGA:** a leva
oficial do `ab-identidade` roda SEIS sessões de Chrome ao mesmo tempo
(`JOBS=6`), e a `foco-luas` de 31/08 tremeu justamente ali. Enquanto o
item viver, a régua continua sendo o par nulo. Rastro:
`capturas/item115-datacao-tremor-balde.json`,
`capturas/item115-datacao-tremor-isolado.json`, sonda em
`capturas/item115-datacao-tremor.mjs`.

**123.** As forjas estelares perdiam brilho ao dobrar a resolução — **FECHADO em 02/09**; ARQUIVO.

**124.** O porteiro do censo reprovava por uma palavra — **FECHADO em 31/08**; ARQUIVO.

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
