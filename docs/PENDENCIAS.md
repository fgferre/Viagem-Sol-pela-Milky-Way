# Pendências — o que está quebrado e o que falta

**Este é o primeiro arquivo a ler.** Lista viva do que está aberto, no jeito
que o dono vê. O detalhe técnico mora nos commits, no `NORTE.md` e na
`LEI-DA-ESTRELA.md`.

**A REGRA DE LEITURA — são DOIS arquivos, e não se leem do mesmo jeito
(25/08, item 98).**

- **Este arquivo é o VIVO, e é ele que se lê INTEIRO** antes de trabalhar.
  Só mora aqui o que ainda exige obra ou uma decisão dele.
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
- **Próximo número livre: 99.** Quem abrir um item usa este e soma um aqui,
  no mesmo commit — é esta linha que os agentes leem, não a contagem à mão.

A primeira mensagem de uma conversa nova pode ser: *"Leia docs/PENDENCIAS.md e siga."*

---

## O BASTÃO — onde a rodada parou (25/08)

**A FILA QUE VALE, e ela é DECISÃO DELE.** Entrou aqui em 23/08 como
decisão de coordenação com a conferência pendente; em **25/08 ele mandou a
obra do 91 andar**, e quem manda uma obra andar confirma a posição dela na
fila. O que sobra à espera dele agora é a IMAGEM, não a prioridade.

> ~~**clarão único**~~ (24/08, teto de 0,07) → ~~**82 (N1+N2: os nomes)**~~
> (24/08) → ~~**tarjas do celular**~~ (24/08) → ~~**"Explorar" e o arrasto
> da folha**~~ (24/08) → ~~**83 (L1+L2)**~~ (24/08) → ~~**91 (Saturno
> escuro — a luz dos planetas)**~~ (25/08) → ~~**81**~~ (25/08; o vermelho
> que sobrava era do **70**, e ele também fechou em 25/08 — **o MB1 fecha
> em ZERO, e o zero repete**) → **93 (brilho assistido = algoritmo do
> Eyes)** → **70** (a causa 2, o ponto que morre na borda) → **75**, com o
> resto do **83** (L2.5, G1, L3, L4, L5) na fila da mesma família.

**O QUE ESPERA O OLHO DELE, e é a maior dívida da casa:** as fotos dos
itens **91** (Saturno, o anel, a sombra, Mercúrio), **83** (a fita),
**82** (os nomes), **77** (as órbitas), **61** (a onda da UI/UX inteira),
**70** (o giro e a cessão), **5** (o Sol pelo calendário), **7** (a troca
de qualidade sem reload) e **79** (as duas telas de erro). Nada disso é
obra pendente — é conferência.

**A DOUTRINA DO PINO, escrita para a próxima vez que houver foto à espera.**
Mexer na LINHA da fila antes da conferência **invalida as fotos** que estão
na mão dele: ele julgaria uma coisa e veria outra. O pino de 24/08 foi
**retirado por quem o pôs** (*"pode dar push e seguir em frente
orquestrando"*), que é a única forma de um pino sair.

**E A VISTA DE ABERTURA VAI SER RE-JULGADA — a hora chegou.** Ele apontou,
na noite de 23/08, que o contexto de abertura do NASA Eyes é melhor que o
nosso. A escolha do candidato **(a)** foi **parcialmente forçada pela
dívida**, não preferência final. **N1** (item 82) e **L2** (item 83)
pousaram em 24/08, e era exatamente isso que a vista larga esperava para
voltar a ser contexto viável. O detalhe está no item **61**; ninguém trate
a (a) como resposta final até ele ver as fotos lado a lado.

**⚠ A PUPILA ESTÁ REPROVADA — e foi ENTERRADA no M2 (16/08).**
`src/three/core/pupila.ts` e o teste morreram inteiros na data marcada
(LEI §7.3); a varredura invertida (`simbolosProibidos.test.ts`) vigia a
ressurreição. O que está no lugar é compressão fixa na emissão —
`LEI-DA-ESTRELA.md` §7. Não a reescreva. O `NORTE` proíbe em letra:
*"Proibido: teto de brilho. Proibido: exposição que depende do que está em
foco."*

**A FRONTEIRA DA LEI DA ESTRELA fica de pé:** não tocar no que a Lei ainda
demole (`lodStellar.ts`, `stellarBody.ts` por dentro, `world/sol/*`,
`iauOrientation.ts`) — a exceção é obra própria DELA, e a primeira foi o
item 5 em 21/08, com a exceção declarada no cabeçalho de cada arquivo. O
conserto do Sol está FECHADO e ACEITO (M1, M2, R1–R3 e a soltura, o pouso
de 17/08). O item **38** (`aFocus`) é dormente por desenho — **não apagar**;
é o canal do passo E3.

**Publicar está em aberto e é decisão dele.** Em 2026-08-08 ele pediu, com
estas palavras: *"Consegue publicar o projeto automaticamente a cada commit
no main no git spaces"* — e é isso que `.github/workflows/deploy.yml` faz.
Segurar o push **não foi pedido dele**: foi um agente que inventou a trava.
Qualquer push na `main` põe o site no ar. Sem pedido explícito, não se
publica; o pedido de publicar continua de pé.

**Números aposentados — e nenhum se reaproveita.** A lista inteira, com o
commit de cada saída, mora no ARQUIVO (seção *O DIÁRIO DO CABEÇALHO*). Os
de 14/08 (**1, 2, 14, 29, 30, 31, 32, 35**) leem-se em
`git show de16542 -- docs/PENDENCIAS.md`. Os que o ARQUIVO registra, com
hash: **1–4, 6, 8–11, 14, 16, 20, 21, 29–33, 35, 41, 42, 44, 47, 48, 50,
51, 55–58, 60, 62, 63, 65–68, 71, 73, 74, 76**. O **19** NÃO saiu — fechou
a metade da confissão e ficou a das texturas.

---

## ALTA — o dono vê e incomoda

**91. Saturno estava quase escuro mesmo com brilho assistido — a obra
pousou em 25/08, e falta ELE VER.** Palavras do dono, 2026-08-24: *"acho
que estamos com algortimos de iluminacao q nao estao funcionando bem...
saturno, mesmo com brilho assistido, quase escuro e saturno é um objeto
claro no ceu... mesmo a olho nu."*

**AS TRÊS DECISÕES DE DESENHO DELE (25/08) não se reabrem, e estão
cumpridas:** (1) o modo assistido, que é o padrão, dá **dia claro em todos
os corpos visitados**, como a Cassini e o Eyes; (2) **`?luz=real` mantém a
penumbra física verdadeira** no globo; (3) a porta é de **duas vias**, ao
vivo, com a URL espelhando o gesto. O globo saiu do carvão para a palha, o
anel acendeu junto e a sombra dele, que caía do lado do Sol, voltou ao lado
certo — os números estão no ARQUIVO.

**O QUE FALTA É SÓ A CONFERÊNCIA DELE**, e são três perguntas que só ele
responde:

- **(a)** Saturno está no ponto ou passou do ponto? — e o adendo do anel
  (25/08, olhando as fotos: *"os anéis de Saturno não estão visíveis"*):
  ficou no ponto, ou ainda está escuro para o que ele espera das fotos da
  Cassini?
- **(b)** **Mercúrio DESCE, 164 → 118**, e isso é a lei funcionando (ele
  recebe ~6,7× a irradiância da Terra; expor "para o mundo em que se está"
  ali significa FECHAR o diafragma). Ficou melhor domado ou ficou apagado?
- **(c)** o modo real, com Saturno quase preto, é a honestidade que ele
  quer ver ou é escuro demais para servir de modo?

**Fotos:** `capturas/item91-saturno-antes-depois.png` (a prova),
`item91-familia-antes-depois.png`, `item91-modo-real.png`,
`item91-selo-porta-de-duas-vias.png`, `item91-anel-antes-depois.png`,
`item91-anel-modo-real.png`, `item91-anel-proc-antes-depois.png`,
`item91-sombra-antes-depois.png` e `item91-auditoria-da-luz.png`.

**A auditoria do básico respondeu "NÃO" à pergunta dele** (*"problemas
bizarros de iluminação em todo app?"*): seis casos medidos, o básico está
são, e o único defeito achado — o do anel — está consertado. As duas sobras
que ela nomeou viraram os itens **95** e **96**.

**A história completa está no ARQUIVO, item 91.**

**93. O brilho assistido tem de ser o mesmo algoritmo do NASA Eyes.**
Palavras do dono, 2026-08-25: *"estou perguntado do brilho assistido...
quero que o nosso conserte isso para ficar igual ao algortimo usado no
nasa eyes"*.

O item **91** pagou o **dia** (Saturno palha). A receita ainda não é
a deles: ainda sobra um resto de 1/d² no globo, não há a lanterna da
câmera, o corte dia/noite continua duro. O Eyes, no modo padrão
(Shadow), é Sol cheio + lanterna fraca + corte suave. Contrato para
implementar:
`docs/reference/nasa-eyes-brilho-assistido-contrato.md`.
O modo `real` e o pontinho no céu **não entram**.

**5. O Sol do Atlas estava congelado no máximo solar — agora ele obedece
ao calendário; falta ele ver.**
Cheio de manchas e explosões em QUALQUER data; o do filme começa limpo.
Implementado em 21/08, e o item fica aberto até ele conferir nas fotos e
no app.

**A frase, para quem for olhar:** *hoje o Sol do Atlas é o mesmo em
qualquer data; agora ele obedece ao calendário — e 2026 segue um Sol
ativo porque o Sol de 2026 É ativo.*

**As fotos:** `capturas/item5-sol-do-atlas-cinco-datas.png` (o mesmo
enquadramento em 2019-12, 2024-10, 2026-01, 2030-05 e 2035-01 — em cima
o Sol de antes, sempre igual; embaixo o de agora, com o mínimo quase
limpo e o máximo cheio de manchas) e
`capturas/item5-arranque-antes-depois.png` (o arranque do filme em t=0,
6 e 29 s, que NÃO podia mudar — e não mudou).

*(A fase do ciclo saiu do acumulador e virou função pura da data, com
âncora declarada: mínimo do ciclo 25 em dezembro de 2019 e máximo em
outubro de 2024, o que obriga a subida a ser mais curta que a descida.
O estado das regiões ativas e dos grupos de manchas virou função do
mesmo instante — semente POR VIDA e deriva em forma fechada —, então o
relógio anda para trás sem re-integrar nada e o mesmo instante devolve
sempre o mesmo Sol. Morreram o pino `ATLAS_JOURNEY_T`, a torção de fase
da dramaturgia e os dois acumuladores do núcleo. A dramaturgia do filme
virou DOSE de ocupação declarada no selo: o arranque mostra menos
atividade do que a data pede, e diz isso — nunca inventa uma data. O
`atlas-smoke` ganhou a prova que faltava, no degrau do corpo do Sol:
mesma data por dois caminhos dá o MESMO pixel, e data diferente dá Sol
diferente.)*

**7. Trocar a qualidade recarregava a página — o reload morreu; falta ele ver.**
O dono pediu “nada recarrega, padrão AAA”. Hoje NADA no painel recarrega,
a qualidade inclusive; o item fica aberto até ele conferir no app —
clicar em outro tier, com o filme andando ou de dentro do Atlas, e ver a
cena continuar de onde estava. E de quebra, olhar o **Auto**, que agora
é o 4º estado do seletor.
→ `docs/NORTE.md`, seção “Ajustes”. *(As QUATRO letras fecharam em
20/08. A B pôs a cadeia de carga inteira num worker. A **C** matou o
reload: o mundo novo (galáxia, os dois mapas e o Sol) assa em segundo
plano enquanto o atual continua desenhando, e a troca é num quadro só,
sem véu; medido: o mundo trocado ao vivo sai BIT-IDÊNTICO ao do boot
direto naquele tier, nos dois sentidos, e seis trocas seguidas não
acumulam uma textura. A **D** pôs o Auto no seletor e tirou do boot
quem decidia pelo visitante: sem `?q=` o tier é cinema por constante —
o storage e a detecção por aparelho saíram do caminho. A medição de
quadros continua rodando e SUGERE (o painel diz "Cinema, a 28
quadros/s — Alta deve andar melhor"), mas só troca de tier se ele
escolher Auto; medido no navegador: em manual, 18 s com a medição
pedindo outro tier e nada se moveu. Fica de pé o pior bloqueio de
thread do swap, que é o `prime` do Sol — 136 ms medidos em 21/08 nesta
máquina. O item 5 entrou no miolo de `stellarBody.ts` e construiu a
máquina que vai fatiá-lo (o re-bake por data já roda a MESMA semente e a
MESMA contagem repartidas por quadro), mas não fatiou o `prime` em si —
e não o piorou: 137 ms depois.)*

**39. Estrela focada apaga as outras, ligando e desligando de repente.**
Palavras do dono: *"uma coisa que percebi é que agora quando uma estrela
está focada, as demais simplesmente desaparecem (ligam/desligam
abruptamente), nao quero esse efeito, quero que as estrelas continuem
aparecendo, nao precisa ter esse efeito bizarro..."* E: *"eu quero que
independentemente do astro/objeto que está em foco na tela nunca se
esmaeça a grandeza da cena galáctica e do starfield, exuberante... nada de
efeitos de pupila ou sei lá como vc chama isso..."*

Medido: era a pupila (`?pupila=1`), 16 stops ao focar Sirius. No app limpo
ela está desligada e nenhuma camada esmaece. Item fica aberto até ele
conferir no app limpo.

**40. Dois Sóis com rótulo ao mesmo tempo.**
Palavras do dono: *"percebi tb que existem 2 sois (com tags) simultaneos
na cena. será que tem mais outras duplciacoes? ou isso já está no pipeline
para ser resovido?"*

O rótulo dobrado não se reproduziu. *(M1, 16/08: o Sol continua sendo
bola 3D + ponto, mas agora os dois são UMA repartição — o ponto cede
exatamente na medida em que a bola entra, pesos somando 1; e o terceiro
desenhista, o clarão de autor do `SunStar`, morreu.)* O borrão branco da
abertura do Atlas é o rabo do item 3 (bloom, M2). Fica aberto até o dono
conferir. Não criar segundo mecanismo de rótulos — o `LabelCanvas` já
resolve colisão.

**43. Planetas de longe parecem estrelas.**
Palavras do dono, 2026-08-16: *"percebi q planetas de longe parecem
estrelas tb... esse comportamento nao é estranho? eles nao emitem luz...
no máximo refletem um pouco que nao causaria esse efeito similar ao de
uma estrela..."*

O que é físico e fica: ponto de luz refletida É ponto de luz — Vênus é a
"estrela" mais brilhante do céu real (m −4,6), e a camada dos dez corpos
divide o gaussiano e a fotometria com o campo estelar de propósito. De
longe de verdade eles apagam com 1/d²: no limiar do sistema (~10.300 UA)
os nove medem m 15,3–27,7, invisíveis — pinado em `planetas.test.ts`.

O que era defeito e tinha dono: o GRAU. O gatilho dos espinhos saturava
em pico 4 (cláusula 5.4 da Lei, o clamp `sat`), então Vênus, Júpiter e
Sirius ganhavam a MESMA cruz de difração cheia. *(MORTO no M2, 16/08:
espinho e branqueamento derivam do FLUXO — amplitude 0,0278·pico,
calibrada por continuidade em Sirius; saturação suave pico/(pico+4) no
lugar do clamp. Vênus brilha mais que Sirius no céu real e agora a cruz
dela é maior TAMBÉM — como numa câmera. Fica aberto até o dono conferir
na cena.)*

Ele refinou, no mesmo dia: *"acho que um planeta, nao poderia refletir
de todos os lados... eles nao sao fontes de luz..."* e *"os planetas
refletem de acordo com sua cor... venus está proxima do sol, brilha mais
e tem uma cor mais reflexiva... marte jé é mais avermelhada.. a terra é
o pale blue dot..."*

As duas coisas JÁ SÃO o modelo, verificadas ao vivo em 16/08:
- **Fase:** todo movimento de câmera reescreve `aFase` por corpo
  (`escreverFase`, planetas.ts) com o ângulo Sol–planeta–observador no
  modelo MH18 (Saturno inclui a abertura do anel). Medido na cena:
  Saturno a 2 UA pelo lado do Sol, fase 0,883; a 2 UA por trás (ângulo
  160,7°), fase 0,024 — 37× menos luz, e some no piso (+15 mag) em
  fase nova plena. Ninguém reflete de todos os lados.
- **Cor e albedo:** `aCor` por corpo = iluminante solar × razão de banda
  dos índices medidos (B−V/V−R, fotometria.ts). Na cena: Marte
  [1,89 / 0,97 / 0,48] avermelhado; Netuno [0,46 / 0,97 / 1,17] azul;
  Terra levemente azulada; Vênus clara — e o brilho dela vem de H
  (albedo × tamanho) + proximidade, como ele descreveu.

O que a verificação REVELOU de quebra: na foto do lado noturno quem
domina o quadro é o HALO do Sol a 11,5 UA (~160 px) — o rabo do item 3
fotobombando a cena. É a fila M1/M2 de novo, por outro ângulo.

**52. A conferência do dono no app com o padrão novo da luz.**
A queixa que abriu a rodada da luz era do app com o desenho velho; o
pacote inteiro (compressão na emissão, ombro no bloom, filtro solar
declarado, repartição + clarão de asas) espera a conferência DELE no
app. O pouso de 17/08 aceitou a SOLTURA da estrela — este item é o
pacote da luz por inteiro. *(Veio do bloco da onda da luz, enxuto pelo
item 51.)*

**53. O expoente da asa (β) espera o gate de foto do dono.**
β = 2,4 é semente de projeto — a Lei §1 pede a escolha entre 2,0 e 3,0
com foto, com `BETA_DO_ESPINHO` acorrentado em **1,5×** ele
(`1.5 * BETA_DA_ASA`, em `estrela.ts`) e a fração 0,06 junto. O ¾ foi a
primeira forma, e o dono a reprovou no app em 16/08 — *"os spikes
ficaram horríveis e enormes"*: braço que decai mais devagar que o halo
não é cruz, é parede de 2.400 px. As fotos já existem
(`capturas/luz-*.png`, a escada inteira); falta ele olhar e cravar. *(Veio do bloco da onda da luz, enxuto pelo
item 51.)*

**54. O filme espera a exibição do dono — agora com o gesto da Lua.**
Palavras dele no pedido, 19/08: *“quando estivesse passando poderia dar
uma leve desacelerada e virar rapidamente a camera para ela e desvirar
para continuar em direção a terra.”* — implementado e medido em 20/08:
a Lua fica grande ~1,5 s (era 0,7 — o "piscar"), a câmera vira para ela
no ponto mais próximo (6 raios lunares) e devolve o olhar à Terra; o
pouso assenta nas Américas. Na mesma rodada: os giros de Sirius e de
Rigel deixaram de borrar, "O BERÇÁRIO" cai onde as estrelas reais
passam, a Lua sem rede usa o lugar medido das 16:00, e um juiz novo
assiste o filme INTEIRO em play contínuo (0→193) nos testes. A
história completa da rodada (o roteiro repensado, a coda, as falhas do
play e seus consertos) mora nos commits de 19–20/08. Falta só ele
assistir do começo, sem pular, e aprovar.

A ideia solta dele segue na mesa como decisão de escopo: *“como um
fly-by ao redor dos planetas no final”*. Na rota de casa Júpiter passa
a 2,3 UA — um pontinho; fly-by de verdade exige desviar a rota da coda.
A alternativa oferecida é cruzar o plano da galáxia no mergulho (a
poeira passa de teto a chão). Um dos dois, ou nenhum: escolha dele.

E um aviso dele sobre as legendas novas (que ele gostou): *“gostei das
suas sugestoes, mas talvez teria que adaptar um pouco design/layout UI
para acomodar”* — conferir na mesma exibição.

**69. As forjas ficaram mais claras de longe — a dose delas espera o
olho dele.** (Achado no M5, 22/08.) As 5.400 e tantas regiões de
formação de estrelas (H II, masers, aglomerados jovens, Cefeidas,
proxy OB) largaram a cópia própria da lei de tela e passaram à lei da
casa: piso 0,85 → 0,7 px e teto 26 → 20 px. De longe elas clareiam até
1,47× e de perto escurecem para 0,59×. O fluxo total no sub-pixel é o
mesmo dos dois lados — o que muda é a repartição —, mas a DOSE delas
(`aIntensity`, artística) foi calibrada sob o piso velho, e a régua da
galáxia mediu o preço: no face-on o `clumpError` piorou 0,1581 → 0,1741
e o `grain` 0,0874 → 0,0877 (ledger, rodada 44); as outras notas e o
edge-on inteiro não se mexeram. Re-dosar é GOSTO, não migração: a foto
está em `capturas/m5-glows-forjas-antes-depois.png` e a decisão é dele
— fica mais bonito com os berçários assim, mais fracos, ou como
estavam?

**82. Os nomes na tela estão muito intrusivos — N1 e N2 pousaram em 24/08,
e falta ELE VER.** Palavras do dono, 23/08: *"estou achando que ele está
muito intrusivo, acho que precisaria ser um sistema mais inteligente do que
é."* E: *"A impressao que tenho é que o default todos os objetos estao com
o label ligado, fica uma confusao na tela."*

A régua de relevância passou a cortar **ANTES da geometria** — *a tela
carrega DEZ nomes* (`ORCAMENTO_DE_NOMES`, em `world/labels.ts`) —, a
colisão virou a lei dos atlas de referência (um lugar por nome; colidiu, o
menor SOME), e a camada **`nonomes`** entrou na gaveta. A abertura foi de
22 nomes para **8**; o teto do zoom, de 27 para 4.

**O QUE FICA ABERTO:**

- **a conferência dele** — se a abertura ficou como ele queria, e se OITO é
  o número certo (mudar é UMA LINHA). Fotos:
  `capturas/item82-abertura-antes-depois.png`,
  `item82-teto-antes-depois.png`, `item82-camada-nomes.png` e
  `item82-filme-legendas-antes-depois.png`.
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

## MÉDIA — afeta o produto, não salta aos olhos

**97. A órbita acende mais cedo no Retina do que numa tela comum.** Achado
em 25/08 ao consertar a régua da cessão (item 70), na mesma peça e pela
mesma doença: o fade de entrada da linha compara o raio aparente da elipse
com `RAIO_MIN_PX = 3` e `RAIO_CHEIO_PX = 16` (`world/orbitas.ts`), só que o
raio é calculado contra a meia-altura do quadro em px de **buffer**. Num Mac
(2×) o mesmo céu dá o dobro de pixels, então a linha cruza os dois limiares
com **metade do tamanho aparente**: numa tela ela já está cheia enquanto na
outra ainda está nascendo. O tamanho aparente é o que a casa exige de tudo
que tem medida de tela (a fita é px de CSS, o clarão corrige DPR), então o
provável certo é dividir pelo `pixelRatio` — mas isso MUDA o que aparece na
tela e em que momento, e por isso pede medida e o olho dele, não conserto de
passagem. **Não medido ainda:** em quanto anda a distância em que cada órbita
aparece. Fica aqui porque foi visto, não porque foi julgado.

**12.** Nenhuma foto de referência mora entre 1 UA e 40 UA — onde a tela
lava. A régua de luz e as vistas `ua2`…`ua2000` já enxergam a faixa.

**13.** Sagittarius A✱ ainda é 125.884× maior que o real. Segundo
mentiroso de escala. Cadastro em `escala.ts`.

**15.** Quando o quadro engasga, não há como aliviar o Sol. As chaves de
desligar coroa e ejeção são lidas e nunca escritas.

**17.** O Sol solavanca quando o relógio acelera. O conserto existe, veio
do projeto irmão e está desligado. Ligar depende de editar `sol/activity.js`.

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

**34.** A tela de carregamento desenha outra Via Láctea, de dois braços.
O modelo da casa tem quatro.

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

**37.** (Suspeita a medir.) As nuvens escuras podem estar apagando o que
está na frente delas. Par de capturas antes de tocar em qualquer linha.

**46.** (Suspeita a medir, herdada do item 44.) A galáxia profunda
(`galaxy.ts`, 4M pontos, `shrink` 1/px² próprio) não passou pela
invariância de resolução — se o "céu vazio" voltar na vista de LONGE em
tela retina, é a primeira suspeita. Conferir com o dono na vista
galáctica antes de mexer.

**59.** (Achado em 21/08, ligado ao item 7.) Trocar de qualidade não
troca a textura dos corpos que já estão carregados. O `reassarMundo`
refaz a galáxia, os dois mapas e o Sol; os doze corpos do palco leem o
tier só na HORA de pedir textura, então quem já carregou fica no alvo do
tier velho (`alvoDePixels`, `world/corpos/texturas.ts`: cinema 8192,
alta 2048, performance 1024). Não é esquecimento: refazer o globo hoje
custa ~2 s de véu — a Terra em close-up vira ponto e volta enquanto a
textura nova vem pela rede —, e isso está declarado no próprio
`reassarMundo` e no `NORTE.md`. O conserto sem véu é double-buffer por
corpo: assar a textura nova em paralelo e trocar o ponteiro num quadro
só, que é o que a letra C já faz com a galáxia e o Sol.

*(22/08: ENCOLHEU por dois lados, e continua aberto. (1) A carga virou
TRANSACIONAL e cancelável — `carregarCanaisDoCorpo` já busca o lote
inteiro num pedido, publica de uma vez e descarta tudo se o pedido for
cancelado no caminho; é exatamente a metade de baixo do double-buffer, e
ela existe. (2) O pré-aquecimento virou DOSE por corpo: abrir o Atlas
não carrega mais os doze, então na troca de tier quase todo corpo está
`fria` e nasce no tier novo sozinho — o item passou a valer só para o
corpo que o visitante está OLHANDO. O que falta é a metade de cima: uma
GERAÇÃO por corpo e o `tierVivo` que ela compara, para o corpo já
carregado pedir o tier novo em segundo plano, seguir desenhando com os
pixels velhos e trocar o ponteiro num quadro só. Hoje isso seriam quatro
cópias — o estado (`texturas`, `recargas`, `texturasVivas`) ainda mora em
cada classe; o passo honesto é esse estado mudar de casa para o pipeline
único primeiro, e o double-buffer nascer lá, uma vez.)*

**61. Rever a UI/UX inteira — DECISÃO DELE, 21/08. A ONDA POUSOU; falta
ELE VER.** Palavras dele: *"nao, mas acho que podemos rever essa UI/UX
(atlas tinha ideias boas de UX/UI e outros Apps tem até coisas melhores)"*
— ou seja, **não** é para separar os Ajustes; é revisão da interface
inteira. E a parte grande: *"o modo atlas na minha visao deveria ser o modo
único, a viagem na verdade para mim é só uma ferramenta do modo atlas"*.

**FECHARAM entre 22 e 24/08, e a história está no ARQUIVO:** os três botões
iguais na abertura; os controles do filme somem sozinhos; o selo de
honestidade virou UMA linha; as camadas saíram dos Ajustes e a gaveta virou
a porta única; o **MODO ÚNICO inteiro**, em cinco passos, incluindo a vista
padrão a ~9 UA; as tarjas pretas saíram do celular; *"Explorar livremente"*
encurtou para **"Explorar"**; a folha do celular ganhou a quarta saída; e o
clarão do Sol virou **teto único de 0,07**, decisão dele em duas etapas.

**O QUE FICA ABERTO:**

- **o olho dele no app**, com as fotos em `capturas/item61-*`,
  `capturas/vista-padrao-*` e `capturas/clarao-v2-*`.
- **A VISTA (a) NÃO É DEFINITIVA, e a hora de RE-JULGAR chegou.** Ele
  apontou, na noite de 23/08, que o **contexto de abertura do NASA Eyes é
  muito melhor que o nosso** — o Eyes abre no sistema INTEIRO e mesmo
  assim é legível. Isto obriga a uma confissão: a escolha do (a) foi
  **parcialmente FORÇADA pela dívida**, não preferência final — a vista
  larga era "dez nomes num nó de 40 px" sobre linhas de um pixel, e descer
  para o sistema interno foi o jeito de fugir do nó, não o de dar o melhor
  contexto. **N1** (item 82) e **L2** (item 83) pousaram em 24/08, e era
  isso que a vista larga esperava. Falta a folha de fotos lado a lado —
  sistema inteiro no estilo Eyes × interno atual × meio-termo. **A decisão
  é DELE, e ninguém trate a (a) como resposta final até isso acontecer.**
- **"NAVEGAR" fica registrado como alternativa aceita por ele.** Ele
  ofereceu a palavra e não a exigiu (*"não precisa ser explorar, pode ser
  navegar"*). Trocar é **uma palavra em dois arquivos** —
  `components/Hud.tsx` (o véu do fim) e `components/BarraOuAlcas.tsx` (as
  duas barras) —, e as DUAS têm de andar juntas, senão o app volta a ter
  dois nomes para a mesma ação.
- **o Atlas parar de parecer mais vazio que o filme** (*"parece que o modo
  atlas fica mais morto, vazio..."*). **Um mundo só JÁ É LEI e já é
  código.** A medida de 24/08 achou a causa, e ela não é regra por modo: é
  a **LENTE** (35° no Atlas contra 58°). Está no item **86**, e é decisão
  dele.

**A história completa está no ARQUIVO, item 61.**

**70. O ponto que morre seco na borda.** *(O título nomeia o que está
ABERTO, nunca o que já foi consertado — por essa disciplina este item já
perdeu DOIS nomes em 25/08.)* (Achado em 22/08 pelo juiz de movimento, o
MB1 — `scripts/visual/estabilidade-temporal.mjs`.) Quando uma estrela muito
brilhante sai pela borda do quadro, o brilhão dela some de uma vez e **o
céu inteiro perde luz num único passo de câmera**. Ao voltar, acende de
novo do mesmo jeito. Está medido três vezes com a mesma assinatura, sempre
na mesma estrela — Rigil Kentaurus. **Conferir com ele no app antes de
mexer:** é um giro lento com uma estrela forte perto da borda.

**A METADE QUE FECHOU em 25/08** (história no ARQUIVO): eram DUAS causas, e
nenhuma delas a pupila. A **causa 1** — o segundo cobertor
(`ClaraoDoCampo`) vestindo um rascunho que só tinha o que estava DENTRO do
quadro — morreu com a **faixa de guarda** (`MARGEM_DO_CAMPO = 128 px`, o
joelho medido). Na mesma rodada fecharam a **cessão da linha de órbita**
(decisão dele) e a **faixa de instrumento** do juiz. **O MB1 foi de 6
defeitos a ZERO, sem afrouxar soleira nenhuma, e o zero repete.**

**A CAUSA 2 SEGUE ABERTA, e é ela o item.** A faixa de guarda conserta o
COBERTOR, não a **IMAGEM DIRETA do ponto** no quadro principal: ali o
`THREE.Points` continua sendo descartado inteiro quando o vértice cruza o
volume de clip, e a metade do sprite que ainda estava na tela some de uma
vez. É o "culling da ponta e não da asa" — a hero, que é QUAD, sai suave
pela mesma borda.

**O desenho conhecido para consertar** (não executado, e não medido depois
da faixa): prender o vértice DENTRO do volume de clip e avaliar a PSF pela
distância VERDADEIRA (`gl_FragCoord` menos o centro real), como o quad das
heroes já faz por construção — o fragmento do campo usa `uv` só em módulo,
então a troca não vira arte nova. Custa um uniforme de viewport. **O MB1
não cobra mais este pedaço**, então quem o pegar tem de trazer a régua
junto — e a LEI já marca o catálogo e as cascas como território do M3.

**O TAMANHO DO EFEITO DEPENDE DA JANELA** (medido em 25/08, item 81). Os
números originais saíram de um quadro de 613 px, onde cada estrela é
**3,1× mais quente** que num de 1080. No `pan` a queda do passo cai de
−24,6% para **menos de 5%** a 1080 px; no `fov` ela **FICA** (−29,4%). **O
defeito é real e segue de pé — o que não é fixo é a magnitude, e quem for
consertar tem de dizer em que janela mediu.**

**Falta o dono olhar as três fotos que esta história produziu:**
`capturas/item70-giro-antes-depois.png`,
`capturas/item70-linha-cede-antes-depois.png` e
`capturas/item72-nobloom-antes-depois.png`. **Não apagar na próxima limpeza
de `capturas/`**, pela mesma razão do item 79.

**DUAS REGRAS NASCERAM AQUI e valem para toda a casa:** *A/B se roda de
ÁRVORE LIMPA dos dois lados — e se não der, o que sobrou de sujo entra
NOMEADO no carimbo, arquivo por arquivo*; e *JSON de datas diferentes não é
A/B*.

**A história completa está no ARQUIVO, item 70.**

**75. Motor de filmes por roteiro — ideia dele para implementação
futura, 22/08.** Palavras dele, inteiras:

> *"Digo mais, deveríamos ser capazes de criar filmes, os filmes nao
> deveriam ser milhares de linhas de codigo, deveriam ser na verdade um
> script, quase como um arquivo txt com os parametros que o "motor de
> filmes" só lesse. um diretor de uma camera que se movimenta pelo
> universo, troca de lente, usa zoom, vira e se movimenta livremente,
> seguidno algortimos claros de movimento intelignete cinematográfico.
> Nao estou dizendo que a ferramenta deveria estar disponivel para o
> usuário, mas isso facilitaria sua propria vida para que vc gerasse
> novos filmes facilmente... logo vc criaria a ferramenta e deixaria
> instrucoes para que vc mesmo criasse scripts para essa ferramenta...
> fica a ideia para uma implmentacao futura. depois podemos portar esse
> filme atual para esssa ferramenta. nunca li o codigo, mas tneho a
> impressao que hoje dentro do filme já temos todas as "ferramentas"
> praticamente prontas para que realmente vire um motor, seria como
> separar as coisas que sao constantes hard coded, da lógica
> algortimica..."*

Três coisas ficam ditas por ele: a ferramenta **não** é para o
visitante (é para o agente escrever filmes), ela vem com **instruções**
para o próprio agente escrever os roteiros, e o **filme atual se porta
depois** — não antes.

O plano da casa já tem o nome disso, e a ideia dele coincide com o que
está escrito: é o **"Motor declarativo"**, item 1 da *Fila ativa* do
[`PLANO-CINEMA.md`](PLANO-CINEMA.md) — **critério de saída: PLANO-CINEMA,
fila ativa 1** (é lá que ele mora, e só lá). O que a mensagem dele
ACRESCENTA ao que estava escrito é a parte da câmera — trocar de lente,
usar zoom, virar e se mover por "algoritmos claros de movimento
inteligente cinematográfico" — e o destinatário: o motor é ferramenta do
agente, com instruções.

**77. As linhas de órbita, ligadas por padrão — O CÓDIGO POUSOU EM 23/08;
FALTA ELE OLHAR.** A órbita é o DADO, não enfeite: NASA Eyes, Celestia e
SpaceEngine desenham as três. Apareceram **30 laços** (os nove planetas e
as 21 luas), com camada `noorbitas` na gaveta, fade nas duas pontas, lua só
com o pai enquadrado, e **sem efeméride viva não há linha**.

**O QUE ESTÁ EM PÉ É SÓ A CONFERÊNCIA DELE**, e são três decisões que mudam
o que aparece na tela e que não estavam no contrato que ele leu:

1. **A curva NÃO sai de "amostrar um período", porque esse caminho não
   existe.** A efeméride cobre 1950–2050, e um período inteiro cai fora
   dela em **quatro dos nove planetas** — metade do sistema ficaria sem
   linha, para sempre. O que ficou é a **cônica osculadora do estado
   vivo**, que é o que "linha de órbita" significa nos três programas de
   referência: o primeiro vértice do laço **É** a posição viva do corpo,
   por identidade algébrica.
2. **Os oito corpos SEM PONTO ficaram de fora, e a decisão foi tomada com a
   FOTO na mão.** Ceres, Éris, Haumea, Makemake, Quaoar, Vesta, Palas e
   Hígia juntos viravam um **novelo**, e os PLANETAS — que são o que este
   item existe para deixar legível — sumiam dentro dele. Devolvê-los é
   **UMA LINHA** (`HELIO_SEM_PONTO`, em `world/orbitas.ts`), e virou o
   degrau **G1** do item 83.
3. **A camada vale NO FILME também, e ele tem de olhar UMA foto por causa
   disso.** Não há `if (fase)` nenhum, que é a lei dele. Das sete vistas de
   filme do gate, seis saem bit-idênticas; muda UMA — a volta para casa
   (t=180). **É a foto que ele deve olhar com mais atenção: é a única
   mudança no FILME, e ninguém a pediu.** Se ele não a quiser, o conserto é
   um gate de fase — mas isso RESSUSCITARIA a distinção entre modos que ele
   acabou de proibir, e por isso não foi feito por conta própria.

**AS FOTOS:** `capturas/item77-atlas-com-orbitas.png` e
`item77-atlas-sem-orbitas.png` (o par que decide, na vista de 226,84 UA que
desde o item 61 é o TETO do zoom — **não é o candidato (a)**, que é o
sistema interno de `capturas/vista-padrao-abertura.png`),
`item77-jupiter-luas.png`, `item77-lua-fade.png` e
`item77-filme-volta-para-casa.png`.

**A história completa está no ARQUIVO, item 77.**

**83. Órbitas AAA — a fita e o foco.** (Aberto em 23/08, DEPOIS de medir o
NASA Eyes. Ninguém reclamou disto: é a diferença que sobra entre a camada
77 que pousou e a referência do ramo.) Estudo:
`docs/reference/estudo-orbitas-eyes-observacao.md`.

**O placar, dito sem inflar:** o que a medida nos dá razão são **dois
comportamentos estreitos da LINHA** (o corte quando a câmera está DENTRO do
laço, e o fade angular) mais a **honestidade da efeméride**. Não é veredito
geral: **no conjunto, os nomes e os rastros do Eyes são mais inteligentes e
mais bonitos que os nossos.**

**L1 (o foco manda na cena) e L2 (a fita de 1,25 px CSS) POUSARAM em
24/08** — e de carona caiu um defeito antigo da Onda 7: pedir Júpiter e
mandar chegar perto punha a **TERRA** em quadro. **Falta o OLHO DO DONO:**
`capturas/item83-fita-zoom-antes-depois.png` é a que decide, mais
`item83-abertura-antes-depois.png` e `item83-foco-antes-depois.png`.

**O PLANO DO QUE FALTA, em ordem — e ele começa pelo OLHO, não por código:**

- **Passo 0 — o veredito do dono sobre o L1/L2.** **Nada de segunda onda de
  linha antes disso.** Uma segunda obra por cima de fotos ainda não
  julgadas repete exatamente o erro que o pino existe para impedir.
- **L2.5 — O COLAR DE CONTAS, e ele é DEFEITO MEDIDO, não gosto.** A fita
  tem contas de luz nas juntas: **54 de 340 colunas** com pico ≥ 215, a
  espaçamento **rigorosamente constante de 14 px** — é o espaçamento
  constante que o separa do serrilhado. **A causa, lida no shader:** cada
  quad do `LineMaterial` tem calota redonda ALÉM das extremidades, e a
  calota do segmento *k* cobre o corpo do *k+1* — um disco pintado DUAS
  vezes por junta, e em aditivo isso soma (204 → 230). A 1× é sutil; no
  Retina dele, é o colar. *(O dente de continuidade não pegou porque ele
  cobra o BUFFER, e o defeito nasce depois dele, na expansão do quad.)*
  - **L2.5-a — matar a conta SEM sair do three** (~5 linhas): `dashed:
    true` faz o fragmento descartar as calotas, e `gapSize: 0` garante que
    nada seja tracejado. **O detalhe que salva o conserto de quebrar, e não
    é opcional:** com `USE_DASH` o material EXIGE `computeLineDistances()`
    na geometria, uma vez. Pede dente de IMAGEM e **re-baseline das 13
    vistas com linha**.
  - **L2.5-b — a largura que escala com a janela** (~6 linhas). **Armadilha
    dupla:** (i) o `hPx` que a camada recebe é de DISPOSITIVO — dividir
    pelo `pixelRatio` antes de comparar com 800; (ii) escolher UMA linhagem
    para a base — 1,2 **com** fator, ou 1,25 **sem**. Multiplicar 1,25 pelo
    fator conta a mesma coisa duas vezes.
- **G1 — a gaveta devolve os oito** de `HELIO_SEM_PONTO` (a decisão 2 do
  item 77), como classe própria **desligada por padrão**, em vez de
  enterrados numa decisão de código. É literalmente o que o Eyes faz com as
  anãs dele.
- **L3 — matiz que separa sem mentir.** Manter a fotometria (o Eyes pinta
  Mercúrio de VIOLETA e Vênus de ÂMBAR, que não são as cores deles) e
  garantir distância mínima de matiz entre linhas vizinhas, com o empurrão
  DECLARADO no selo. A paleta deles entra como referência de SEPARAÇÃO,
  nunca como tinta.
- **L4 — o rastro, e só quando houver sonda no acervo.** É camada IRMÃ, não
  a mesma: no Eyes, `Trails` e `Orbits` são chaves separadas.
- **L5 — a linha responde ao mouse.** **No Eyes a linha é matéria morta** —
  o que eles têm é hover de RÓTULO, não de geometria. É vaga aberta, e
  continua sendo nossa. Cuidado: `raycast` antes do primeiro render falha
  **em silêncio**.
- **O perfil analítico na largura** — o que fecharia a dívida de COBERTURA
  (casamos a largura do Eyes, não o anti-aliasing da borda: a fita dos dois
  é chapada, e quem resolve a borda lá é **MSAA**, que esta casa não tem).
  É **gosto COM preço**: a fita perde **21,5% de luz** e o
  `BRILHO_DA_LINHA` teria de ser recalibrado com régua e declaração. Cabe
  em **~8 linhas** via `onBeforeCompile` — a estimativa de "~200 linhas"
  que corre nos estudos era para um `ShaderMaterial` próprio. Só depois do
  passo 0.
- **Strip próprio com miter — ÚLTIMO recurso**, só se o L2.5-a falhar E o
  dono reclamar: custa o corte no *near plane*, o `resolution` automático e
  o `raycast` de que o L5 depende.

**O QUE NÃO SE REFAZ — verificado com TRÊS testemunhas independentes** (o
pixel do Eyes, a API do motor deles e as fontes MIT abertas), para impedir
que uma conversa futura "melhore" o que já está certo: a **cônica
osculadora do estado vivo**; a **amostragem em anomalia excêntrica com 256
pontos** (a nossa é mais fina que a deles); **lua no frame do PAI**; **cor
por fotometria**; e o **corte de câmera dentro do laço + o fade angular**.
**Não copiar** o que eles fazem aqui.

**A história completa está no ARQUIVO, item 83.**

**87. O véu da abertura não cabe na tela do telefone com a fonte
grande.** (Achado em 24/08, conferindo a queixa dos três botões — item
**61**.) A 390×844 com `?ui=1.4` — o degrau de fonte MAIS ALTO no
aparelho MAIS ESTREITO — o véu inteiro transborda na vertical: a tarja de
cima (*"HYG · VIA LÁCTEA · TEMPO REAL"*) e a linha do rodapé
(*"experiência cinematográfica · 3 min 13 s"*) saem **cortadas pela
borda**. Os TRÊS BOTÕES estão certos e medidos (313,59×58,06 px, iguais,
nada fora da tela na horizontal); quem não cabe é a PÁGINA.
**Não é o que ele reportou** — a queixa dele era o botão mal formatado, e
essa não reproduz mais. Este é vizinho, achado na mesma conferência.
**Por que fica ABERTO e não foi consertado na hora:** o conserto é
composição — encolher a tarja, o subtítulo ou o rodapé no telefone, ou
deixar o véu rolar —, e composição é dele. Quem tem fonte grande é
justamente quem mais precisa ler o rodapé, então "cortar e ignorar" não
serve de resposta. Foto: `capturas/abertura-botoes.png`, painel da
direita.

**89. Desligar os nomes deixa o céu INCLICÁVEL — o ícone tem de sobreviver
ao texto.** (Aberto em 24/08, medido ao fechar o item **83**. Não é queixa
dele: é buraco de produto achado com a régua na mão.) A camada dos nomes
(item **82**) é uma chave só, e ela cala a TELA INTEIRA: sem rótulo
desenhado não há o que clicar, porque **não existe raycast** nesta casa —
o hit-test do Atlas roda sobre a LISTA de rótulos desenhados
(`rotulos.ts`), não sobre a geometria. Quem desliga os nomes para limpar o
céu perde junto o **clicar-para-visitar**, e isso é lei declarada e
testada ("o que não está escrito não se clica", a mesma da pendência 30).
Hoje isso é coerente; deixa de ser no dia em que o visitante quiser um céu
limpo E navegável, que é exatamente o que o dono pediu quando reclamou da
poluição visual.

**A RESPOSTA JÁ ESTÁ MEDIDA, e é do Eyes** (degrau D5 de
`docs/reference/estudo-orbitas-eyes-observacao.md`, promovido a item aqui
porque proposta de estudo não tem dono e item tem): lá o **ícone é uma
camada separada do texto** — `Labels` e `Icons` são chaves DISTINTAS —, e
o ícone continua clicável com os nomes desligados. É a separação que falta:
o ponto/ícone do corpo vira alvo próprio, com chave própria na gaveta, e o
TEXTO é que se apaga. O céu fica limpo e continua navegável.

**Cuidado herdado, para quem executar:** `raycast` antes do primeiro
render falha **em silêncio** (verificado no fonte do three) — se a
implementação passar a usar geometria em vez da lista de rótulos, a
primeira leva de cliques some sem erro nenhum.

**92. Descer ao corpo de Éris não põe Éris na tela.** (Aberto em 25/08,
achado com a régua na mão ao fotografar o item **91**. Não é queixa
dele.) `?foco=Éris` ACHA o alvo — a ficha abre com o nome certo —, mas
`?foco=Éris&ver=corpo&d=6`, que é o degrau declarado dos anões
("órbita heliocêntrica → aproximar o globo"), devolve um quadro **sem
globo nenhum**.

**A prova é indireta e é forte:** a obra do 91 multiplicou o globo de
Éris por 6,5, e o quadro dessa URL saiu **byte a byte igual** nos dois
binários (antes e depois do 91), enquanto TODOS os outros corpos
mudaram. Quadro que não muda quando a luz do corpo muda é quadro sem o
corpo. Com a câmera posta à mão sobre a efeméride (`?pos=`/`?look=`), a
mesma Éris aparece e mede 25,5 → 165,6 de 255 — ou seja, o mesh existe
e desenha; quem falha é o **enquadramento** do degrau.

Não foi investigado além disto: sai do escopo do 91, e a foto de Éris
que o dono vai julgar foi tirada pelo caminho manual. Suspeitos a
conferir quando o item subir: Éris está a **93,8 UA** (a mais distante
que a escada tenta), e o degrau pode estar mirando a órbita e não o
corpo, ou parando antes por algum teto de distância.

---

## BAIXA — dívida interna, ninguém vê

**95.** (Achado pela auditoria da direção da luz, 25/08 — a pergunta dele
"estamos com problemas bizarros de iluminação em todo app?".) **Num
eclipse, o chão escurece e o AR não.** Dos três shaders da Terra,
`TERRA_FRAG` e `NUVENS_FRAG` chamam `fatorDeEclipse`; `ATMOSFERA_FRAG`
nem monta o `GLSL_SOMBRA_ECLIPSE`. Então a casca de atmosfera continua
espalhando luz cheia por cima de um chão que está preto.

**O tamanho medido:** no eclipse de 08/04/2024 o núcleo da umbra sai em
2,9 de 255 contra 53 do deserto vizinho — a atmosfera quase não pesa no
MEIO do disco, que é onde caiu essa sombra. O erro mora no LIMBO, onde a
casca é brilhante: um eclipse rasante hoje aparece com o ar aceso por
cima. **Não é multiplicar pelo fator e pronto**, e é por isso que fica
como item em vez de conserto de uma linha: na totalidade de verdade o
céu não é preto, ele é o crepúsculo de 360° — luz espalhada de FORA da
umbra. Zerar o ar seria trocar um erro por outro. Quem pegar decide a
dose e volta com a foto de um eclipse no limbo.

**96.** (Da mesma auditoria, 25/08. **Risco latente, não defeito visível.**)
**"O Sol está na origem" é combinado, não é verificado.** A cena inteira
depende disso: os quatro corpos resolvidos fazem `-centro` normalizado
sem consultar ninguém, a camada de planetas põe o Sol no vértice 0 em
`(0,0,0)`, o enquadramento usa a constante `ORIGEM`, e a malha do Sol
(`StellarBody`) fica na origem por OMISSÃO — o `group.position` dela
nunca é escrito. Não há `DirectionalLight` nem `PointLight` em `src`
inteiro, então não existe uma segunda fonte hoje. **Mas nada afirma o
combinado**: bastaria alguém transladar a raiz da cena ou posicionar a
malha do Sol para a luz de todo o app discordar de onde o Sol é
desenhado, em silêncio, e o modo de falha seria exatamente o do item 91.
É um teste de uma linha (`sun.group.position` é `ORIGEM`) para quem
estiver em `director/` — o arquivo não é de quem levantou isto.

**94.** (Achado pela auditoria da rodada da faixa de guarda, 25/08.) **O
segundo cobertor compõe um quadro inteiro que ninguém lê — e agora ele é
1,43× mais caro.** O `UnrealBloomPass` (three/addons) termina sempre
somando o clarão de volta no `readBuffer` que recebeu; o `ClaraoDoCampo`
passa o RASCUNHO nos dois argumentos, então essa soma final cai no
próprio rascunho e morre ali — o passe seguinte lê `renderTargetsHorizontal[0]`
direto, pelo recorte. É um passe aditivo de tela cheia por quadro,
jogado fora. Já era desperdício antes; com a faixa de guarda o rascunho
tem 1,43× a área do quadro (a 1920×1080), então o desperdício cresceu na
mesma razão. **É ganho de graça para quem pegar:** não muda um pixel do
que se vê, só para de desenhar o que ninguém amostra. O caminho conhecido
é não chamar `bloom.render` inteiro — repetir as três etapas que
importam (passa-alta, pirâmide, composite) sem a soma final —, e o preço
disso é passar a depender da forma interna do passe, que hoje já é
cobrada por `throw` no construtor. Medir com `gpu-profile` antes e
depois; o rótulo do passe é `pos:bloom-blend`, que na medição de 25/08
aparecia com ~1,6 ms.


**22.** 35 imagens de referência citadas que não existem, e as 6 fotos
reais do Sol nunca foram baixadas. As seis passam na régua da bancada;
o dono nunca as julgou.

**23.** A granulação do Sol não é física (45 Mm contra 1 Mm reais) e muda
55% conforme a placa de vídeo.

**24.** A dose da ejeção de massa (1,4) nunca foi calibrada.

**25.** Mergulhar no Sol é impossível abaixo de 1,44 raios solares — o
corte come a superfície.

**26.** O brilho das estrelas é relativo, não absoluto.

**27.** Faltam fixtures Horizons de Vênus, Júpiter, Saturno e Urano.

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

**79.** (22/08.) **As duas telas de erro esperam o olho dele.** O véu que
`bb65fff` pôs nas falhas DEPOIS do boot — a placa de vídeo desistindo
(`webglcontextlost`) e a exceção em quadro — nunca foi visto por ele: as
fotos são `capturas/erro-contexto-perdido.png` e `capturas/erro-no-tick.png`,
e elas ficam no disco até ele olhar. **Não apagar na próxima limpeza de
`capturas/`** — a regra 5 vale para captura que terminou de servir, e
estas não terminaram.

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

**81.** O MB1 reprovava em cinco famílias e a culpa era do próprio juiz, que
media numa janela em que a régua dele não vale — **FECHADO em 25/08**;
história no ARQUIVO. *(Pedia 640×700 e media 640×**613**; ali o app desenha
uma PSF de 0,48 px, abaixo de Nyquist, e nenhuma fonte do campo tem
identidade medível. O quadro passou a ser exato, o padrão virou
1128×**1080**, e a soleira deixou de ser digitada.)*

**AS DUAS LIMITAÇÕES DECLARADAS ficam AQUI** — não são obra pendente; são o
que a régua reconhecidamente não faz, e quem for medir depois precisa
saber. **(a)** A regra do traço barra a LINHA, não o PEDAÇO dela: o corte
`lado ≤ 3·√nMeia` equivale a 9:1 num blob cheio, então barras maciças
compridas passam por mancha — fechar esse vão pede olhar a HISTÓRIA da
componente, não a geometria de um quadro. **(b)** `pan` e `orbita` definem o
passo em PIXELS (`4 / pxPorRad`), então o CÉU que varrem encolhe quando a
janela cresce: **os vereditos das duas não são comparáveis entre janelas.**

**84.** (Achado em 23/08, fechando o clarão único.) **O `ab-identidade`
cobre a fase ATLAS com UMA vista só, de 52.** Medido sem querer: uma
mudança que só tocava o Atlas (o teto do clarão) devolveu **51 de 52
bit-idênticas** — e não porque quase nada mudou, mas porque 51 daquelas
vistas rodam por `?pos=`, isto é, na fase do voo livre. A única que
mudou foi `atlas`, e mudou muito (8,08% do quadro). O gate está certo no
que faz; o que ele não tem é POPULAÇÃO no modo que virou o produto. Hoje
quem cobre o Atlas de verdade é a perna `PERNA=atlas` da régua de luz
(sete distâncias, JSON versionado) — e ela cobre LUZ, não composição:
nomes, órbitas e HUD do Atlas não têm vista bit-exata que os guarde. O
conserto é somar vistas de Atlas ao gate (o enquadramento de um corpo, o
teto do zoom, o close-up de uma lua), e o preço é ~6 s de captura por
vista por lado. **Não fazer isto às cegas junto de outra obra:** cada
vista nova pede o lado "antes" recapturado, senão nasce sem base.

**85.** (Ruído de instrumento, visto UMA vez em 24/08.) **O
`atlas-smoke` reprovou o TOQUE DUPLO sem defeito nenhum.** Numa corrida
ele acusou *"o TOQUE DUPLO VAI: a câmera reposicionou (andou 2.63e-16 do
raio, degrau orbita)"* — ou seja, a câmera NÃO andou. Na corrida
seguinte, com o MESMO código, passou (*"andou 1.10e+0 do raio, degrau
corpo"*), e no código anterior também passava. É flutuação do gesto
sintético, não regressão. Fica registrado porque é o mesmo gênero dos
itens 64 e 78, e porque juiz que reprova inocente já custou uma
investigação inteira (item 76). Se reaparecer, o passo é datar por
repetição antes de mexer em qualquer coisa.

**86.** (Aberto em 24/08, respondendo a uma impressão dele.) **O céu de
fundo PARECE mais apagado no Atlas — e parece com razão, mas a causa é a
LENTE, não uma regra por modo.** Ele relatou a impressão; a resposta vem
com número, porque impressão dele merece medida, não silêncio.
**O QUE NÃO EXISTE:** varredura completa de `src/` não achou NENHUMA
dependência de fase/modo no brilho, exposição, bloom ou ganho do campo
estelar. Os uniformes do campo (`STAR_VERT`/`STAR_FRAG`, escritos por
`StarField` e `WrappedStars`) saem de constantes, de resolução, de
posição e do `catFade` — que depende da DISTÂNCIA de casa, não da fase.
As três regras por modo que já existiram (`claraoDoAtlas`, o
`setGradacao` do bloom e a dose por fase do clarão) estão mortas, com
lápide e com `simbolosProibidos.test.ts` guardando o túmulo. E a *dose do
Sol por fase* de `director.ts` foi seguida até o fim do fio: alimenta só
`cycleAmpK` em `world/sol/activity.js` (manchas e plages do CORPO do
Sol) e não toca o campo.
**A GRADAÇÃO TAMBÉM NÃO DIFERE**, medido com `?dbgfade=1` na mesma
distância: Atlas e voo livre dão os MESMOS `gal=0.00 loc=1.00`. A
suspeita de que a trava `leftDisk` atravessasse o portal e deixasse o
Atlas com bloom de "vista externa" DENTRO do sistema **não se confirma na
entrada por link**; ela só poderia acender vindo de um instante do filme
já fora do disco, e nesse caso é a lei declarada do item 61 (o ambiente
parou de mudar por troca de fase) — história, não modo.
**O QUE EXISTE, medido nas duas pernas versionadas da régua de luz, na
MESMA distância:** a luz média do quadro no Atlas é **0,0180** contra
**0,0613** no voo livre a 3,6 UA, e **0,0191 contra 0,0612** a 150 UA —
o quadro do Atlas tem ~**3,1× menos luz**. E é exatamente o que a LENTE
prevê: o Atlas roda pinado em **35°** (`ATLAS_FOV_GRAUS`) e o voo
livre/filme em **58°**; como a PSF do campo é de PIXEL FIXO (não cresce
com a lente), estreitar o fov não escurece estrela nenhuma — só cabem
menos estrelas por tela. A razão de área de céu é
`(tan 17,5° / tan 29°)² = 0,324`, isto é **3,09× menos céu por tela**,
contra os 3,1× medidos. **Mesma estrela, mesmo brilho, menos estrelas.**
Some-se o `uZoom` das heroes (`heroStars.ts`), que por LEI encolhe o
clarão sob teleobjetiva: a 35° vale 0,569 contra ~0,95–1,0 nos atos
largos do filme.
**NÃO HÁ CONSERTO PEQUENO E LÍCITO**, e por isso isto é item e não obra:
mexer no fov quebra a reprodutibilidade que o pino existe para dar, e
mexer no brilho POR MODO é exatamente o que ele proibiu. O caminho
honesto, se ele quiser o céu mais cheio no Atlas, é um **eixo global de
lente** — para todo mundo, nunca por modo. **Decisão dele.**

**88.** (Achado em 24/08, consertando o teleporte do religador do
relógio.) **Ao enquadrar QUALQUER lua, o que fica no alto da tela é o
eixo da nossa Lua.** É o último dos três literais da Onda 7 que sobraram
de quando a Terra e a Lua eram os únicos corpos com malha: os outros dois
— o corpo e a lua que o relógio ia buscar — caíram no mesmo dia, porque
punham o corpo ERRADO em quadro. Este não põe: ele só inclina a cena.
A lei já está decidida desde a Onda 7 — *polo do CORPO nos degraus
"corpo" e "lua"* — e Titã, Io, Tritão e as outras dezoito estão sendo
enquadradas com o polo da Lua.
**POR QUE NÃO CAIU JUNTO:** ele mora em DOIS lugares que precisam
concordar (o gesto, `focarNaLua`, e o religador, `enquadreVivo`, ambos em
`director/escada.ts`); consertar um só giraria a câmera no primeiro tique
do relógio. Consertar os dois é uma linha em cada — mas MUDA O QUE SE VÊ
(o horizonte da cena roda) numa vista que nenhum juiz cobre e que ele
nunca olhou. **É obra de olhar, não de conserto**: quem a fizer cria a
vista que a cobre (uma lua de outro pai, tipo Titã ou Io) e volta com a
foto do antes e depois.

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

**O QUE FICA ABERTO DENTRO DESTE ITEM** — o resto do plano de 14/08,
conferido contra o código em 25/08:

- **a baseline do gate gerada e VERSIONADA.** Hoje o `ab-identidade` guarda
  tudo em TMPDIR, e o `NORTE` já registra a falta ("baseline indexada pela
  GPU, fora do TMPDIR — ainda não existe; o ritual é manual"). Sem ela,
  mexer nos documentos deixa a casa sem valor esperado.
- **o dossiê mecânico dos itens abertos**, como checklist da extração.
  Agora só vale para os documentos que a reforma ainda não tocou —
  `NORTE.md`, `PLANO-ATLAS.md`, `LEI-DA-ESTRELA.md`.
- **o `RAIO_SOL_PC` duplicado — CONFERIDO em 25/08, e ainda é.**
  `scripts/visual/luz-do-quadro.mjs` redigita o literal
  `2.2566840209436597e-8`, cuja fonte é `RAIO_SOL_PC` em
  `src/three/escala.ts`, e a razão está declarada no próprio comentário: a
  régua roda em node puro. **O defeito não é a cópia, é que ela não tem
  dente.** O vizinho `ATLAS_FOV_GRAUS`, redigitado pela MESMA razão, é
  cobrado por `luz-do-quadro.test.mjs` (*"o fov do Atlas redigitado aqui é
  o da fonte, não um número parecido"*); o `RAIO_SOL_PC` não é. São duas
  linhas de teste.
- **O QUE NÃO FICA ABERTO, e por quê:** o `scripts/docs-check.mjs` com
  lista de exceções foi construído, medido e **removido pelo dono no mesmo
  14/08** — *"só mais um problema para o futuro, um teste que pouco faz"*.
  Ele mora nos **becos sem saída** do `NORTE.md` e não volta: a praga que
  importa (documento que afirma faltar algo já pronto) é invisível para
  qualquer máquina. Quem confere se o escrito é verdade é gente, com
  auditoria por onda.

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
