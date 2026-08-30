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
- **Próximo número livre: 113.** Quem abrir um item usa este e soma um aqui,
  no mesmo commit — é esta linha que os agentes leem, não a contagem à mão.
  *(O **107** saiu em 28/08: a varredura de fecho, no `AGENTS.md`.)*

A primeira mensagem de uma conversa nova pode ser: *"Leia docs/PENDENCIAS.md e siga."*

---

## O BASTÃO — onde a rodada parou (30/08)

**30/08 (a varredura das 36 h — item 112).** Pedido dele: caçar bugs
graves nas implementações das últimas 36 h. Time de 6 revisores em
paralelo + céticos independentes sobre `1129219..HEAD`; **2 graves
confirmados** (o CHICOTE do clique-durante-rampa — a queixa de 29/08
renascida pelo próprio item 110 — e o texto 3D da beta engolido pelo
globo) **e 7 médios; zero achado derrubado pelos céticos. TUDO
consertado no mesmo dia em 4 frentes paralelas**, cada conserto pinado
por guarda nova com sabotagem provada; suíte cheia 2.500/2.500,
typecheck e lint limpos. Áreas varridas e LIMPAS: órbitas/cores, post,
lente 58°; no leitor de roteiros, 1 armadilha desarmada
(`progresso`+`intervalo`). **O item 112 tem o mapa e as 3 perguntas
que esperam a mão/olho dele.** *(Mesmo dia, mais tarde:)* **ele testou
os 3 pontos — "tudo certo" — o 112 FECHOU pelo olho e pela mão dele e
mandou PUBLICAR: a main levou tudo (as levas desde `5371037` inclusas —
110/111, a beta do 109, a lente única, o Eyes completo, as cores das
órbitas, o HUD de fotografia e os consertos do 112). O site está na era
atual.**

**29/08 (fecho por ordem dele — "we are almost out of context").** A
sessão parou NO MEIO da beta dos rótulos 3D (item 109): a fiação
inteira está commitada e provada inofensiva (beta desligada =
bit-idêntico), e o único defeito aberto tem sonda e causa — a fonte
Inter woff2 embarcada trava o `sync` do troika (a padrão dele resolve
em 341 ms). **A PRÓXIMA JANELA COMEÇA AÍ: trocar o arquivo da fonte,
re-sondar, fotos, olho dele** — o passo a passo está no corpo do item
109. Antes disso ficaram fechados hoje: 39, 40, 43, 61, 70, 75, 77,
83, 86, 89, 94, 96, 97 e 100; publicado até `5371037`; o site NÃO tem
as levas posteriores (fecho da família + spike + beta).

**29/08 (madrugada, o fecho da rodada) — 89, 94 e 96 FECHARAM; a mesa
ficou limpa.** O 89 pelo olho dele ("confirmo as fotos"): o céu limpo
navegável + o Eyes completo com o anel na cor da órbita. O 94 por
medida dupla (blend 2,04→1,26 ms; A/B sentinela bit-idêntico 4/4) e o
96 virando veredito vivo do atlas-smoke (Sol na origem, verificado).
**O que resta aberto de produto: o 108 (armado, à espera da próxima
aparição com o olho dele na hora) e o 109 (o spike dos labels 3D,
quando ele mandar).** O site publicado está na era anterior a estas
últimas levas (89 Eyes-completo, 83-cores, 94/96, 100) — publicar de
novo é um pedido dele, como sempre.

**29/08 (fim da noite) — PUBLICADO, a pedido dele.** *"sim, publique e
faça push"* — os 179 commits desde a última publicação subiram para a
`main` e o Pages pôs no ar tudo desta era: o motor de filmes (75), a
lente de 58° no app inteiro com a abertura do sistema inteiro (86+61),
os fechos 70/77/87/91/93/104, o HUD de fotografia completo (100) e as
órbitas com as cores dos próprios mundos (83). Higiene do mesmo dia: as
4 branches locais de agentes (todas com zero commits fora da main)
foram apagadas com a trava `-d`; restam 3 branches remotos velhos
igualmente vazios, à espera de uma palavra dele para sumirem.

**29/08 — O 83 FECHOU: as órbitas ficaram lindas, e com as cores dos
próprios mundos.** Palavras dele no fecho: *"ficou lindo, confirmo as
fotos"*. O dia inteiro da família: coluna (iv) computada das texturas
pela receita dele (executor barato, oráculo 5/5), prancha v3 pela porta
efêmera `?paleta=` (worktree, morta após servir), escolha dele na mesa,
e a (iv) em código com procedência (`corDaTextura.ts`), guarda de
comportamento e re-baseline declarado. **A fila agora: o 108 segue
ARMADO (à espera da próxima aparição do fim errado, com o olho dele na
hora); o próximo trabalho livre natural é o 89** (o ícone que sobrevive
ao texto desligado — céu limpo E navegável, a separação Labels/Icons do
Eyes) **e atrás dele as dívidas BAIXAS (94, o clarão desperdiçado; 96,
o teste do Sol na origem). A ordem final é dele.**

**29/08 (madrugada) — O 100 NASCEU, CRESCEU E FECHOU NO MESMO DIA.**
As três levas: o indicador de fotografia (LENTE·SOL no filme, prova no
par das Três Marias — zoom sem dolly, legível por leigo), o controle da
variante (a) que ele escolheu (a roda no filme pausado fecha/abre a
lente com paredes 8°–75°, decai sozinha no play; SEM selo — doutrina
dele: *"a realidade está nos olhos de quem vê"*, lente não é assunto de
honestidade), e o conserto de layout que o olho dele apontou (a linha
caía sobre a barra de progresso; agora a coluna ancora acima da régua).
Ele confirmou as cinco fotos e mandou fechar. **A fila agora: o 108
segue ARMADO esperando a próxima aparição do fim errado (o olho dele na
hora é a pista que falta); trabalho livre mais natural é a família 83
(a coluna (iv) da prancha de cores — a cor da linha vem da textura do
globo, direção dele de 27/08 — e o degrau A2 da borda macia), com o 89
(o ícone que sobrevive ao texto desligado) atrás; a ordem final é
dele.** Pendência curta anotada no 100 fechado: a pinça do telefone.

**29/08 (noite) — A LENTE POUSOU INTEIRA; O FIM DO FILME REVELOU UM BUG
HERDADO (108).** A obra dos itens **86+61** fechou com todas as provas:
58° no app inteiro, abertura no sistema inteiro (nasce no teto, ~133,7
UA), A/B de 61 vistas com o filme **bit-idêntico** e só as 9 de Atlas
mudando (declarado), sabotagem independente 4/4 mordendo, suíte cheia
2.461 verdes, `atlas-smoke` e `luz-do-quadro` re-pinados com números
medidos, NORTE atualizado — **86 e 61 FECHARAM e estão no museu**. No
meio da leva ele reportou: *"o filme nao mostra mais direito no final a
lua e a terra"* — virou o item **108**, e a medida do mesmo dia ABSOLVEU
a lente e o roteiro (fim do filme bit-idêntico em três códigos) e
chegou a ACUSAR um flagra — e a acusação foi DESMENTIDA pela sonda
corrigida no mesmo dia: era defeito do instrumento (o `play()` reinicia
do zero; os quadros "presos" eram quadros certos de t≈17/24). Pela
receita dele com o relógio lido de verdade, o fim sai CERTO
(`item108-fim-certo-t193.png`; sonda v2 em t=192,07 com "A TERRA" na
tela). **O 108 fica ABERTO como relato intermitente não reproduzido**,
com as hipóteses e a próxima pista escritas no item. **A fila agora:
108 (reproduzir e consertar) → 100 (o HUD de lente/zoom,
destravado).** O 108 ganhou obrigação de juiz: uma vista oficial do
fim do filme (t=190/193) entra no `ab-identidade`, que hoje para em
t=180.

**29/08 (tarde) — A SALA DE CONFERÊNCIA JULGOU CINCO FOTOS E A FILA
DESTRAVOU.** Ele olhou as cinco no chat, de uma vez: **70 FECHOU** (a
borda está boa), **77 FECHOU** (o filme limpo, aprovado), o colar do
**83-A1** foi re-confirmado (já estava aceito por C13, 26/08 — segue o A2
e a coluna (iv) do B3), a lente do **86** está **CRAVADA** — *"Aprovo —
crava o 58°"*, sabendo do teto de zoom que encurta (226,84 → ~133,7 UA) e
da abertura que nasce mais perto — e a vista de abertura do **61** é o
**sistema inteiro, estilo NASA Eyes** (o candidato (a) da folha). **O item
da vez é a OBRA da lente:** 58° para o app inteiro + abertura no sistema
inteiro, com as vistas de Atlas do gate re-baselizadas e declaradas no
commit. Depois dela, o **100**.

**29/08 — O MOTOR DE FILMES FECHOU; A FILA AGORA COMEÇA NO 100.**
`revelacao.json` absorveu fuga, subida e deriva; `volta.json` declara o
mergulho de volta e o take Lua→Terra. O motor ganhou as composições que
esses gestos exigiam, e o roteiro agora dirige seus assuntos: Alnitak,
Alnilam e Mintaka aparecem juntas, enquanto os nomes de fundo continuam
cedendo. **Filme convertido: 25 de 25 cenas, 193 de 193 segundos.** Os
**209.958 números** de câmera e a edição inteira coincidem com o corte
anterior; o A/B completo deu **61 de 61 vistas bit-idênticas**, com duas
capturas estáveis de cada lado. A suíte única passou com 2.460 testes,
um antigo já desativado e nenhuma falha. A varredura da rodada retirou
duas exportações sem dono, corrigiu um comentário mentiroso e fechou a
lacuna do teste do lado alternativo. História e provas no item 75 do
ARQUIVO. A fila de produto agora começa no **100**, a viagem solar.

**28/08 — O ATO III FECHOU EM ROTEIRO.** `mergulho.json` agora reúne
também a aproximação final e a rasante de Sagittarius A✱. A órbita
passou a aceitar graus declarados para preservar, número por número,
a fórmula editorial que já existia; não nasceu movimento novo.
**Filme convertido: 20 de 25 cenas, 154 de 193 segundos (cerca de 80%
da duração).** **Motor: ainda parcial** — faltam a fuga/subida (trecho
da mesma curva e combinações de efeitos), a deriva, o mergulho de
volta e o take Lua→Terra, e a direção dos nomes em cena. O trajeto não
costura automaticamente planos diferentes. Instruções no
`PLANO-CINEMA.md`; provas no item. A fila segue **75** → **100**.

**28/08 — O 75 JÁ LÊ ÓRION E A VIRADA DE ANTARES.** `orion.json` reúne
a chegada e a órbita de Betelgeuse, o raspão de Rigel e a dobradiça
CASA; a virada para Antares abre o `mergulho.json`. Nenhum movimento
novo foi preciso: curva, órbita, reta e mira cedo bastaram. **Filme
convertido: 15 de 25 cenas, 116 de 193 segundos (cerca de 60% da
duração).** **Motor: ainda parcial** — faltam os trechos de curva e as
combinações da fuga/subida, o mergulho de volta e o take Lua→Terra, e a
direção dos nomes em cena. O trajeto não costura automaticamente planos
diferentes. Instruções no `PLANO-CINEMA.md`; provas no item. A fila
segue **75** → **100**.

**28/08 — A SESSÃO CARA VIROU LEI, NÃO CAMPANHA.** Palavras dele: as
sessões estão longas demais, gastando milhões de tokens em tarefa
simples; a solução tem de valer para qualquer modelo, não para um
instrumento. Isso é o item **106**, e fechou no mesmo dia: a lei mora
no `AGENTS.md` (§1 e §18). Não se apagam os testes; não se constrói um
motor de orçamento. O que falta no **99** (dono nos arquivos, teto de
15 min) acontece quando uma obra TOCAR o teste — não numa varredura.
No mesmo dia ele cravou o **107**: quando a janela estiver longa e
for hora de encerrar, varre-se duplicata, código morto, lixo e
emaranhado do CONJUNTO da sessão — não se repete a prova. A fila de
produto segue **75** → **100**. O que espera o olho dele não mudou:
a folha da lente (**86**) com a vista de abertura (**61**), a foto da
borda (**70**), a fita do **83**.

**27/08 — O 87 POUSOU E SAIU DA FILA.** A abertura do telefone com a fonte
grande passou a ROLAR, sem encolher nada (a escolha dele em 25/08, Q6); o
juiz de acessibilidade ganhou as três provas das pontas e a sabotagem
confirma que elas mordem. Foto: `capturas/item87-abertura-rolagem-v2.png`.

**27/08, QUARTA LEVA — A PRIMEIRA FATIA DO 99 POUSOU.** O toque duplo
no aparelho (item **105**) passou a MIRAR Marte, em vez de escolher o
vizinho; o cadastro da luz ganhou o prender da borda que o item 70
tinha deixado de fora; nasceu o censo dos juízes
(`scripts/censo-dos-juizes.mjs`) e o portão de commit (`npm run gate`:
typecheck + lint + testes dos tocados, com os transversais do
cadastro). Medido nesta máquina: 2.435 casos de unidade, typecheck
2,9 s, lint 5,5 s. A dieta NÃO fecha: falta dono na maior parte dos
arquivos, e o teto de 15 min da rodada visual ainda é porteiro de
papel. **A fila daquele dia seguia no 99** (o resto da dieta) →
**75** → **100**. *(28/08: o que vale está no topo deste bastão.)*

**27/08, TERCEIRA LEVA — A CAUSA 2 DO 70 POUSOU.** O ponto de estrela
passa a ser preso 1 px dentro da tela e o brilho é avaliado na posição
verdadeira (catálogo, cascas e planetas, o mesmo `STAR_FRAG`). Juiz:
`scripts/visual/ponto-na-borda.mjs`. Medido em 1128×1080: Rigil
Kentaurus cruza a borda e o pico da faixa cai 2,6% no passo (234 →
228 de 255), depois desce aos poucos com o rabo da PSF; foto
`capturas/item70-borda-depois-v3.png`. A fila daquele dia começava
no **99** → **75** → **100**. *(28/08: o que vale está no topo deste bastão.)*

**27/08, SEGUNDA LEVA — AS FOTOS DO (3) ESTÃO NA MESA, à espera do olho
dele.** A sessão única de captura saiu: `capturas/item86-lente-ab.png`
(o A/B da lente, 35° × 58°, data pinada, árvore limpa dos dois lados —
o lado 58° era um worktree de uma linha, já removido) e
`capturas/item61-abertura-folha.png` (os três candidatos de abertura, todos
a 58°). **Achado da sessão, que ele precisa saber antes de julgar:** com a
lente mais aberta o teto do zoom cai de 226,84 para ~133,7 UA e a
abertura natural desce de ~8,9 para ~5,2 UA — está nas etiquetas das
pranchas. Nenhuma linha de código pousou; a escolha é dele.
**A fila daquele dia começava no (5):** o **99** (a dieta dos juízes)
→ **75** → **100**. *(28/08: o que vale está no topo deste bastão.)*

**A FILA DE 23/08 — SUPERADA (a que vale é a da PRÓXIMA CONVERSA, mais
abaixo); fica como história, e era DECISÃO DELE.** Entrou aqui em 23/08 como
decisão de coordenação com a conferência pendente; em **25/08 ele mandou a
obra do 91 andar**, e quem manda uma obra andar confirma a posição dela na
fila. O que sobra à espera dele agora é a IMAGEM, não a prioridade.

> ~~**clarão único**~~ (24/08, teto de 0,07) → ~~**82 (N1+N2: os nomes)**~~
> (24/08) → ~~**tarjas do celular**~~ (24/08) → ~~**"Explorar" e o arrasto
> da folha**~~ (24/08) → ~~**83 (L1+L2)**~~ (24/08) → ~~**91 (Saturno
> escuro — a luz dos planetas)**~~ (25/08) → ~~**81**~~ (25/08; o vermelho
> que sobrava era do **70**, e ele também fechou em 25/08 — **o MB1 fecha
> em ZERO, e o zero repete**) → ~~**93 (brilho assistido = algoritmo do
> Eyes)**~~ (25/08 — a receita pousou INTEIRA, véu palha de Saturno
> incluído; **FECHADO em 26/08**, com a calibração escolhida na Q13) →
> **99 (a dieta dos juízes)** → ~~**70**
> (a causa 2, o ponto que
> morre na borda)~~ (27/08 — pousou) → **75**, com o resto do **83** (L2.5, G1, L3, L4, L5)
> na fila da mesma família.

**25/08, FIM DO DIA — A CONFERÊNCIA CHEGOU PELA SALA DE CONFERÊNCIA, E A
FILA DECIDIDA GANHOU OBRAS.** Ele respondeu a folha inteira de fotos e
perguntas naquele artefato, e as respostas pousaram item a item: **5, 7, 69
e 79 FECHARAM**; **61, 70, 77 e 82** tiveram a conferência aceita e as fotos
delas já serviram; o **modo real do 91** volta à prancheta com palavra dele
(*"escuro demais, repensar"*); **86**, **87** e o novo **100** nasceram
decididos; e a fita do **83** ficou com uma queixa pela metade — as
palavras chegaram no chat do mesmo dia (*"lindas e profissionais como as
do nasa eyes"*; a receita da caneta está no item — **o A1 pousou em
25/08 e o colar está morto**, agora o A2). **A fila decidida, que se
ACRESCENTA à de cima e não a substitui:** ~~**véu palha do 93**~~ (25/08 — pousou, e as três pranchas
esperam o olho dele) → ~~**88**~~ (25/08 — pousou; as duas pranchas
esperam o olho dele) → ~~**92**~~ (25/08 — pousou, e não era de Éris: era
da classe dos oito; as duas pranchas esperam o olho dele) → ~~**95**~~
(25/08 — pousou; o ar no eclipse ganhou dose derivada e quatro fotos
esperam o olho dele) → **gate do filme (77)** → ~~**rolagem do véu
(87)**~~ (27/08 — pousou, e saiu da lista) → **A/B da lente (86)**, na MESMA sessão de captura da folha da vista
de abertura (**61**) → ~~**70**, a causa 2~~ (27/08 — pousou) → **99** → **75**.

**25/08, FIM DE SESSÃO — A SEGUNDA LEVA DA SALA DE CONFERÊNCIA CHEGOU, E
TRÊS ITENS FECHARAM.** Ele olhou as pranchas que estavam na mão dele e
confirmou como bons **C10** (o polo das luas, item **88**), **C11** (descer
ao corpo dos anões, item **92**) e **C12** (o ar no eclipse, item **95**) —
os três saem da lista, com a história verbatim e o número intacto no
ARQUIVO. Respondeu também as **Q9–Q12** do item **93** e reafirmou o
**Q2** (o modo real): a **receita do Eyes está APROVADA** — palavras dele,
*"a calibracao nao muda a ideia central"* —, e o que ela pede é
**CALIBRAÇÃO** dos botões de dentro (lanterna, terminador, Mercúrio), com o
véu intacto. *(26/08 — a calibração POUSOU: ele escolheu a **C1** na Q13,
ela virou o padrão, a porta `?calib=` morreu e o item **104** saiu na
mesma leva, como ele pediu. E o olho dele veio no mesmo dia, pela Sala —
*"Confirmo como bom: C14, C15"* —, então **91**, **93** e **104**
FECHARAM.)*

**A FILA DA PRÓXIMA CONVERSA, e é esta que vale a partir de agora:**

> ~~**(1)** calibração da luz assistida + propostas do modo real (itens
> **93** e **91**(c) — UMA folha de opções em foto, 2 a 3 calibrações lado
> a lado)~~ (26/08 — **as DUAS metades pousaram**: ele escolheu a **C1**
> na Q13 e a porta `?calib=` morreu, com o item **104** saindo na mesma
> leva; e escolheu a **R1** na Q14, com os +3 passos de exposição do modo
> real embarcados e declarados no selo. **E o olho dele veio no mesmo dia:
> as TRÊS fecharam** — 91, 93 e 104, por C14 e C15) → ~~**(2)** a rolagem
> do véu da abertura (**87**)~~ (27/08 — pousou, e saiu da lista) → ~~**(3)** o A/B
> da lente de 58° (**86**) junto com a folha da vista de abertura (**61**),
> na **MESMA sessão de captura**~~ (27/08 — **as fotos saíram e estão na
> mesa**: `capturas/item86-lente-ab.png` e `capturas/item61-abertura-folha.png`;
> falta o olho dele) → ~~**(4)** o **70**, causa 2 (o ponto que
> morre na borda)~~ (27/08 — pousou; a foto espera o olho dele) → ~~**(5)** o **99**
> (a dieta dos juízes — primeira fatia em 27/08)~~ (28/08 — o resto do 99
> acontece no TOQUE, não em campanha; item **106**) → ~~**(6)** o **75**
> (o motor de filmes)~~ (29/08 — FECHOU; história no ARQUIVO) → **a obra
> da lente (86 + a abertura do 61)** → o item **100**.

**O QUE ESPERA O OLHO DELE — e a dívida virou quase nada em 25/08.** As
oito pranchas dos itens 88, 92 e 95 **já serviram**, e com elas morre a
nota de "não apagar" das três. **A fita do 83 deixou de esperar palavras:**
elas chegaram no chat (*"as linhas de órbita finalmente fiquem lindas e
profissionais como as do nasa eyes"*), e o **A1 POUSOU** em 25/08: a
IMAGEM do colar morto no Retina está na mesa
(`capturas/item83-colar-antes-depois-v2.png` — a v2 é a que ele julga)
e **espera o olho dele**.
Segue o **A2** (a borda macia). **A FOLHA DA CALIBRAÇÃO já serviu** — ele
escolheu a C1 por ela (Q13), e as quatro pranchas
`capturas/item93-calib-*.png` passam a ser a REFERÊNCIA medida do "antes",
não mais pergunta. **E EM 26/08 A DÍVIDA DA LUZ ZEROU:** a costura
(`capturas/item104-costura-v2.png`) e a chapa do modo real
(`capturas/item91-real-r1-v2.png`, a R1 da Q14 embarcada) foram à Sala e
voltaram confirmadas — *"Confirmo como bom: C14, C15"* —, e com elas os
itens **104**, **91** e **93** saíram da lista. O que vai à Sala agora é a
folha da lente com a vista de abertura, e a foto da borda do item **70**.
**(29/08: FORAM, e voltaram julgadas — a folha da lente, a da abertura, a
borda do 70 e o filme limpo do 77. NADA mais espera o olho dele; o placar
está no bastão.)**

*(Registro de escrivão: a foto `capturas/item77-filme-sem-orbitas.png`
passou pelo olho dele em 29/08, fora da fila mas com a mão dele — o 77
fechou; ver o bastão.)*

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

**E QUATRO SAÍRAM EM 25/08, todos por OLHO DELE e nenhum por obra nova** —
a conferência que chegou pela Sala de Conferência: **5** (o Sol do Atlas
pelo calendário, C6), **7** (a troca de qualidade sem reload, C9 — *"testei
e ficou bom"*), **69** (a dose dos berçários, Q5 — *"ficou bom assim"*) e
**79** (as duas telas de erro, C7). A história dos quatro está no ARQUIVO,
verbatim e com o número intacto.

**E MAIS TRÊS EM 25/08, na SEGUNDA LEVA da Sala de Conferência, também
todos por olho dele:** **88** (o polo das luas, C10), **92** (descer ao
corpo dos anões, C11) e **95** (o ar no eclipse, C12). Estes três TINHAM
obra nova — ela pousou no mesmo dia e foi ele quem a aceitou. A história
dos três está no ARQUIVO, verbatim e com o número intacto. **Total
aposentado em 25/08: SETE números** (5, 7, 69, 79, 88, 92, 95), mais o
**72**, que a conferência dos números resgatou e cuja história mora dentro
do item **70**.

**E o 72 entra aqui agora, achado pela conferência dos números de 25/08** —
a mesma varredura que já pegara o 76 e os sete créditos de 22/08: ele era o
único número que não estava nem vivo nem aposentado. **72** (a porta
`?nobloom=1` que só apagava METADE do bloom) **fechou em 25/08**, dentro da
rodada da faixa de guarda, e a história dele mora no ARQUIVO — não numa
seção própria, mas dentro do **item 70**, que é onde a obra aconteceu. A
foto é `capturas/item72-nobloom-antes-depois.png`, e ela **já serviu**: saiu
da lista das que esperam o olho dele com a conferência de 25/08 (C5).

**E QUATRO SAÍRAM EM 26/08 — o dia da calibração.** O **103** (a porta do
BRILHO que parou de virar) fechou de manhã, por obra, no mesmo dia em que
nasceu — foi o único dos quatro que não precisou do olho dele. Os outros
três fecharam pela Sala de Conferência, com as palavras dele — *"Confirmo
como bom: C14, C15"*: o **104** (a costura da sombra do anel para a noite,
**C14**), o **91** (Saturno escuro e o modo real, **C15** — a chapa da R1
que ele escolheu na Q14) e o **93** (o brilho assistido pelo algoritmo do
Eyes), que fecha porque **nada mais restava dentro dele**: receita aprovada
por ele em 25/08, calibração escolhida na Q13, padrão embarcado com a porta
`?calib=` morta, e a ressalva conferida no 104. A história dos quatro está
no ARQUIVO, verbatim e com o número intacto.

**E O QUINTO FECHOU À TARDE, POR DECISÃO DELE NO CHAT: o 102** (o giro em
volta do objeto focado). Ele não escolheu nenhum dos dois lados que o
vídeo A/B ia filmar — mandou um terceiro caminho, e a frase é a lei:
*"quero que seja navegação livre e sem travas para qualquer dos lados sem
nenhum limitador de angulo ou coisa parecida"*, mais *"podemos colocar um
botao de zerar orientacao, assim como o google maps tem um botao de
norte"*. O dedo virou QUATERNION em torno dos eixos da TELA, a porta
`?giro=` morreu com os DOIS ramos antigos, e nasceu a bússola. **O vídeo
A/B do P4 não vai ser gravado** — ele decidiu antes, e o instrumento que
existia para filmá-lo saiu junto. **O que sobra é o dedo dele no app, sem
vídeo:** o que se julga é TATO, e tato não se julga em gravação; se o que
ele sentir não for o que a frase pedia, é item NOVO.

**Total aposentado em 26/08: CINCO números** (91, 93, 102, 103, 104) — e o
**próximo número livre continua 105**, porque nenhum destes fechos abriu
obra nova.

**E em 27/08 saiu o 87** (a rolagem do véu da abertura), por obra, no
caminho que ele escolheu em 25/08 — o próximo número livre segue **106**,
porque o fecho não abriu obra nova.

**E ainda em 27/08 saiu o 105** (a prova 19 do toque duplo que escolhia
o próprio alvo), dentro da primeira fatia da dieta dos juízes (item
**99**). O próximo número livre naquele dia seguia **106**.

**E em 28/08 saiu o 106** (a lei curta da sessão, no `AGENTS.md`), no
mesmo dia em que nasceu; e no mesmo dia saiu o **107** (a varredura de
fecho: duplicata, lixo e emaranhado, não repetir a prova). O próximo
número livre segue **108**.

---

## ALTA — o dono vê e incomoda

**91.** Saturno estava quase escuro mesmo com brilho assistido, e o modo
real ficou escuro demais — **FECHADO em 26/08**, conferido por ele na Sala
de Conferência (**C15**: a chapa do modo real, com a **R1** que ele escolheu
na **Q14** embarcada e os +3 passos declarados no selo); história no
ARQUIVO.

**93.** O brilho assistido tinha de ser o mesmo algoritmo do NASA Eyes —
**FECHADO em 26/08**, e nada mais restava dentro dele: receita aprovada por
ele em 25/08 (*"a calibracao nao muda a ideia central"*), calibração
escolhida na **Q13** (a **C1**, *"o Eyes ao pé da letra"*), o padrão
embarcado com a porta `?calib=` morta, e a ressalva dele conferida no item
**104** (**C14**); história no ARQUIVO.

**5.** O Sol do Atlas estava congelado no máximo solar e passou a obedecer
ao calendário — **FECHADO em 25/08**, conferido por ele na Sala de
Conferência (**C6**); história no ARQUIVO.

**7.** Trocar a qualidade recarregava a página, e o reload morreu —
**FECHADO em 25/08**, palavras dele: *"testei e ficou bom"*; história no
ARQUIVO. *(O herdeiro VIVO é o item **59**: trocar de tier ainda não troca
a textura de quem já carregou.)*

**39.** Focar uma estrela apagava as outras — **FECHADO em 29/08**,
morto por mecanismo (uniforms do campo idênticos com/sem foco; a causa
— a pupila — tem lápide com teste). História no ARQUIVO.

**40.** Dois Sóis com rótulo — **FECHADO em 29/08**, morto por censo
(nunca mais de um rótulo SOL, em cinco endereços). História no ARQUIVO.

**43.** Planetas de longe parecem estrelas — **FECHADO em 29/08**: é a
física que ele pediu (fase e cor de verdade; Vênus é a "estrela" do
céu real), re-fotografada na cena de hoje e aceita. História no ARQUIVO.

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

**69.** A dose das forjas (os berçários) vista de longe — **FECHADA em
25/08**, palavras dele: *"ficou bom assim"*; história no ARQUIVO.

**82. Os nomes na tela estão muito intrusivos — N1 e N2 pousaram em 24/08 e
ELE CONFERIU em 25/08; o que sobra é Alnilam, N3 e duas vagas.** Palavras do dono, 23/08: *"estou achando que ele está
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

**99. A dieta dos juízes — o custo cresce sem teto e a deriva virou medo dele.**
(Aberto em 25/08, palavras do dono: *"os testes estão demorando muito e crescendo
cada vez mais... começam a derivar e se tornam um problema... estou com medo
deles... isso não deveria ser avaliado ao invés de criar mais testes?"*.)
O medo tem número: só na rodada 23–25/08 os testes de unidade foram de 2.023 a
2.293 (+13%), o MB1 dobrou de preço (1,8 → ~3,9 min, pela janela calibrada — que
era necessária), as vistas do A/B foram de 52 a 54, e cada etapa roda a suíte
inteira 3 a 6 vezes (editor valida, auditor refaz em worktree, conserto
revalida) — o custo cresce em duas direções ao mesmo tempo. E a deriva é
documentada: pinos de texto-fonte quebraram quando o código MELHOROU, contagens
decoradas mentiram em seis lugares, "17 camadas" mudou de pino a cada obra.
**A obra, em quatro peças:** (1) **censo com preço e dono** (herdeiro do item 57):
cada teste e juiz responde "a quem sirvo" — decisão do dono, lei física, ou chão
de regressão; quem não responde MORRE em vez de ser re-pinado; redundantes se
fundem; (2) **portões em camadas**: por commit só o rápido (typecheck + lint +
testes dos arquivos tocados); suíte cheia UMA vez por etapa, no fechamento; A/B
cheio só quando pixel muda de propósito; auditor sabota ALVOS, não re-roda o
mundo; (3) **teto de custo com porteiro**: a rodada padrão tem orçamento em
minutos (o item 57 fixou ~15); quem estoura só entra aposentando ou fundindo
alguém; (4) **anti-deriva**: contagem derivada em vez de decorada, pino declara
a quem serve, e o censo sabota POR AMOSTRA os testes velhos (hoje só os novos
provam que mordem — os velhos nunca). **Fila: entra ANTES do item 75** — o motor
de filmes é rodada longa, e emagrecer os portões antes dela paga a obra em uma
semana. A prova de saída: o preço da rodada padrão medido antes/depois, e o
censo publicado com cada morte justificada (nenhum juiz morre em silêncio).
**25/08, o dono cortou na carne antes da obra:** "vamos simplificar todo esse
processo — as sessões estão ridiculamente longas e três dias gastaram o plano
inteiro". As peças 2 e 3 (portões em camadas, prova proporcional, agente só
quando paga a passagem, custo anunciado, uma auditoria sem re-auditoria)
viraram **lei imediata** no `AGENTS.md` (§12 e §13) — não esperam esta obra.
O que resta ao item: a peça 1 (o censo com preço e dono) e a 4 (anti-deriva
com sabotagem amostral dos velhos), mais o teto em minutos com porteiro.

**27/08, PRIMEIRA FATIA — O ANDAIME POUSOU, A DIETA NÃO FECHA.** Quatro
peças de chão, nenhuma delas mata juiz em silêncio:

1. **O censo existe** (`scripts/censo-dos-juizes.mjs`, `npm run censo`):
   lista testes e juízes visuais, cobra Serve na amostra, imprime quem
   está sem dono. Medido nesta máquina: **2.435** casos de unidade em 75
   arquivos, typecheck 2,9 s, lint 5,5 s. A maior parte ainda está SEM
   DONO — classificar o resto acontece no TOQUE (28/08), e ninguém morre
   antes.
2. **O portão de commit existe** (`npm run gate`): typecheck + lint +
   testes dos arquivos tocados, mais os transversais do cadastro da luz
   e dos símbolos proibidos. Foi exatamente essa lacuna que deixou o
   `pontoNaBorda.ts` do item 70 de fora do cadastro com a suíte "dos
   tocados" verde.
3. **Anti-deriva amostral:** o "19 camadas" deixa de ser pino decorado
   (a gaveta deriva da tabela); a amostra de juízes velhos declara
   Serve; apagar a linha faz o censo acusar; o juiz do harness ainda
   morde o sinal quebrado.
4. **O item 105 fechou** no mesmo commit: a prova 19 mira Marte.

**O que falta para o 99 sair da lista:** dono em cada arquivo (quem não
responder MORRE, com a morte justificada no censo); fundir redundantes;
sabotagem amostral dos velhos para valer (hoje é uma amostra de seis);
porteiro do teto de 15 min que recuse juiz novo sem aposentar alguém
(hoje o teto está escrito, não trava).
**28/08, ele puxou de volta:** a prioridade é o tamanho da sessão (item
**106**), não uma campanha de classificação. O que falta aqui acontece
quando uma obra TOCAR o arquivo — não se abre sessão só para classificar.
O 75 **não espera** uma varredura: os portões em camadas já são lei
(`npm run gate` no commit; suíte cheia no fechamento).

**106. Sessões longas demais, milhões de tokens em tarefa simples —
FECHADO em 28/08, no mesmo dia em que nasceu.** Palavras dele: *"as
sessoes estao longas demais, gastando milhoes de tokens para tarefas
simples"*; e a solução *"tem que ser holistica e nao focada num
determinado harness"*. Não se apagam os testes; não se constrói um
sistema de orçamento. A lei curta entrou no `AGENTS.md` (§1 e §18):
obra pequena se faz sozinha; modelo caro só no diagnóstico e no
julgamento; agente recebe pacote curto; uma falha, um conserto; a
janela cara lê o bastão, a fila e o item da vez. Vale para qualquer
modelo. A casa desta lei é o `AGENTS.md`, não este item.

**107. Ao encerrar conversa longa, varrer o que a sessão deixou —
FECHADO em 28/08, no mesmo dia.** Palavras dele: garantir que na
sessão *nada tenha sido criado em duplicidade, ao invés de adaptar
itens que já existem*, gerando um emaranhado; *não deixar código
morto, lixo, desenho complexo de arquitetura* — o projeto é tocado
por várias IAs e ele não programa. A lei mora no `AGENTS.md` (§13):
cinco perguntas sobre o CONJUNTO da sessão; sessão longa manda o
*diff* a um leitor fresco e barato, nunca a conversa; um conserto e
fecha. Não é suíte. Não é segundo revisor da mesma prova.

**102.** Girar em volta do objeto selecionado era péssimo — **FECHADO em
26/08**. Ele decidiu o desenho no chat, e a frase é a lei: *"quero que
seja navegação livre e sem travas para qualquer dos lados sem nenhum
limitador de angulo ou coisa parecida"* — mais *"podemos colocar um botao
de zerar orientacao, assim como o google maps tem um botao de norte"*. O
dedo passou a somar num QUATERNION em torno dos eixos da TELA, sem grampo
nenhum; a porta `?giro=` morreu com os DOIS ramos antigos; e nasceu a
bússola, que só aparece com o horizonte torto e o endireita sem mover a
mira. 61 vistas bit-idênticas, `atlas-smoke` com 171 vereditos, a11y
verde. **O que sobra é o olho dele, no app, com o dedo e sem vídeo** — o
que se julga aqui é TATO, e tato não se julga em gravação; se o que ele
sentir não for o que a frase pedia, é item NOVO. História no ARQUIVO.

**105.** A prova 19 do `atlas-smoke` (o toque duplo, no aparelho) falhava
de vez em quando — **FECHADO em 27/08**, na primeira fatia do item **99**:
a prova mira Marte pelo nome, espera o rótulo assentar e relê a posição
na hora do gesto. História no ARQUIVO.

**103.** A porta do BRILHO no selo parou de virar — **FECHADO em 26/08**
(`4ce0169`). **A calibração era inocente** (medido: o defeito reproduz
IGUAL no `aca067b^`); o culpado é a porta de duas vias, que nasceu com ele
dentro em `dd2faeb` (item **91**) — a volta armava por *veredito vazio* em
vez de *nada a desfazer*, e o tier abaixo de cinema trancava a luz em
`real` para sempre. Gesto provado nos dois sentidos em navegador (prova
**20** do `atlas-smoke`); história no ARQUIVO.

**104.** A transição da sombra dos anéis para a noite estava mal feita —
**FECHADO em 26/08**, conferido por ele na Sala de Conferência (**C14**: a
costura, com o perfil que desce sem voltar atrás uma única vez); história no
ARQUIVO.

**110.** O voo até o corpo escolhido parecia um salto seco — palavras dele
(29/08): *"quando clicamos em algum corpo que nao está focado, ou
double-click, nao seria interessasnte que houvesse uma animacao até
centralizar esse corpo no centro? hoje parece que há um salto abrupto...
nao seria um padrao de industria?"*. **O diagnóstico:** o clique simples
NÃO move a câmera por lei dele mesmo (item **73**, 22/08: *"um clique
escolhe, dois vão"*) — o que salta é o GESTO DE IR (duplo clique, o botão
⊕ Aproximar, a busca): a rampa existia e terminava exata, mas durava
**0,5 s FIXOS**, do mergulho curto à travessia do céu inteiro — e
travessia grande em meio segundo lê como corte. Os melhores (NASA Eyes,
SpaceEngine) voam 1,5–4 s, proporcional à viagem. **FEITO em 29/08:** a
duração virou função da travessia — PAN (radianos que a mira varre) e
ZOOM (décadas de distância) somam tempo sobre o piso de 0,5 s, teto
2,2 s (`RAMPA_MAX_S`, `atlasRig.ts`); mergulho no corpo já focado fica
~1 s, planeta→planeta chega perto do teto; reduced-motion e `?shot=`
seguem instantâneos; a rampa continua terminando bit a bit na pose pura
(`?foco=` reproduzível). Guardas novas em `atlasRig.test.ts` (104/104).
**ABERTO esperando a mão dele no app** — tato não se julga em foto
(precedente do item 102). Se ele quiser que o clique simples TAMBÉM
centralize (hoje só escolhe), é revisão da lei do item 73 e decisão
dele.

**A 2ª QUEIXA (29/08, mesma noite):** *"quando dou um clique simples,
ainda nao ocorre uma transicao suave... ele centraliza num pulo"*. O
salto do clique SIMPLES era outro mecanismo: a lei do Atlas é a câmera
OLHAR o alvo, então ESCOLHER re-mira a vista em torno da câmera parada
— e re-mirava NUM QUADRO (`selecionar` zerava a rampa por contrato).
Sonda na página viva cravou: escolher uma estrela no degrau corpo de
Saturno girava **45,5° em 17 ms**. **FEITO em 29/08:** a re-mira passa
pela MESMA rampa proporcional (`selecionar` ganhou `rampa`, a escada a
passa com a guarda de sempre; sem mudança perceptível segue seco —
re-clicar não balança). Re-medido no mesmo cenário: maior giro num
quadro **2,96°**, pico no meio da rampa (~730 ms), giro total idêntico;
posição parada como manda o item 73; destino bit a bit o de sempre.
Guarda nova no `atlasRig.test.ts` (105/105) e **atlas-smoke inteiro
verde** (clique escolhe parado, duplo vai, pinça, bússola). Segue
ABERTO esperando a mão dele.

**111.** O cursor era mão aberta no céu inteiro — palavras dele (29/08):
*"o ícone do mouse está sempre no foramto de mao... acho que talvez
deveria mudar, como é o padrao?"*. O padrão dos mapas (Google Maps,
NASA Eyes) tem TRÊS estados, e a casa só tinha dois: `grab` (agarrar)
no céu e `grabbing` no arrasto — faltava `pointer` sobre o que é
clicável. **FEITO em 29/08:** o `pointermove` (só com o ponteiro solto,
`buttons === 0`) roda o MESMO hit-test do clique (`alvoNoPonto`, via
fachadas `apontaAlgo` na escolha e na escada) e liga/desliga a classe
`apontavel` direto no canvas, sem re-render; CSS em `01-base.css`, com
o apontar ANTES do `:active` para o agarrar em curso ganhar do hover.
Guardas no `arrastoDePonteiro.test.ts` (regra de CSS + ordem + fiação).
ABERTO esperando o olho dele no app.

**112.** A varredura das 36 horas — **FECHADO em 30/08 pelo olho e pela
mão dele** (*"testei os 3 pontos, tudo certo"*): 2 graves (o chicote do
clique-durante-rampa e o texto 3D engolido pelo globo na beta) e 7
médios, todos consertados no mesmo dia em 4 frentes, cada um pinado por
guarda com sabotagem provada; suíte 2.500/2.500. História completa no
museu (`grep -n '^## Item 112' docs/PENDENCIAS-ARQUIVO.md`).

## MÉDIA — afeta o produto, não salta aos olhos

**97.** A órbita acendia mais cedo no Retina — **FECHADO em 29/08**: a
régua do fade virou px de CSS (na tela comum, bit a bit; no Retina as
distâncias de aparição caíram ao valor certo — eram o DOBRO), com
guarda de invariância e foto aceita por ele. História no ARQUIVO.

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

**61.** Rever a UI/UX inteira — **FECHADO em 29/08**: a última ponta (a
vista de abertura) foi julgada por ele na folha
`capturas/item61-abertura-folha.png` — **o sistema inteiro, estilo NASA
Eyes** — e pousou junto com a lente do 86 (a abertura nasce no teto,
~133,7 UA sob 58°; na abertura acendem as cinco órbitas de fora e os
nomes Sol, Netuno e Plutão). O resto da onda já estava aceito desde
C8/25-08. História no ARQUIVO.

**70.** O ponto que morria seco na borda — **FECHADO em 29/08**: as duas
causas consertadas (a faixa de guarda em 25/08; o vértice preso e a PSF
pela distância verdadeira em 27/08) e o olho dele veio em 29/08 sobre
`capturas/item70-borda-depois-v3.png` — *"está bom"*. História no ARQUIVO.

**75. Motor de filmes por roteiro — FECHADO EM 29/08.** As 25 cenas e os
193 s são roteiro; câmera e edição preservadas, 61/61 vistas oficiais
bit-idênticas e Alnilam novamente junto de Alnitak e Mintaka. História e
provas no item 75 do `PENDENCIAS-ARQUIVO.md`.

**77.** As linhas de órbita, ligadas por padrão — **FECHADO em 29/08**: ele
aprovou `capturas/item77-filme-sem-orbitas.png` (o filme limpo). As linhas
ficam no Atlas e no voo livre; a exceção do filme é autorização DELE, só
das órbitas, e `fases.test.ts` a guarda. História no ARQUIVO.

**83.** Órbitas AAA — a fita e o foco — **FECHADO em 29/08**: o último
degrau (B3, a cor) pousou com a receita DELE — a cor dominante da
textura de cada globo (`corDaTextura.ts`; Terra o azul do oceano,
Plutão o salmão; Mercúrio na fotometria por decisão da própria
receita) — e ele confirmou as fotos ("ficou lindo"). A fita (B1), a
bissetriz (B2), o colar morto (A1) e a cor (B3), todos aceitos.
Opção dormente: o G1 (linha para os oito sem ponto) segue sendo UMA
linha, só se ele quiser. História no ARQUIVO.

**87.** O véu da abertura não cabia na tela do telefone com a fonte
grande — **FECHADO em 27/08**, por obra, no caminho que ELE escolheu em
25/08 (Q6: *"deixar a página rolar"*): o véu rola e nada encolhe. As três
provas novas do juiz de acessibilidade cobrem as duas pontas (a tarja
inteira no início, o tempo do filme inteiro depois de rolar) e a sabotagem
confirma que elas mordem. Foto: `capturas/item87-abertura-rolagem-v2.png`;
história no ARQUIVO.

**89.** Desligar os nomes deixava o céu inclicável — **FECHADO em
29/08**, em duas levas no mesmo dia: a camada `noicones` (o anel
só-ícone, céu limpo E navegável) e, por ordem dele, o **Eyes
completo** — anel na COR da órbita do corpo ao lado do nome, camadas
independentes de verdade. Zero raycast; o clique segue na lista única
da pendência 30. Fotos aceitas; história no ARQUIVO.

**92.** Descer ao corpo de um anão não punha o corpo na tela — e era a
classe dos oito, não Éris — **FECHADO em 25/08**, conferido por ele na
SEGUNDA LEVA da Sala de Conferência (**C11**); história no ARQUIVO.

**100.** O HUD de fotografia — **FECHADO em 29/08, no mesmo dia em que
nasceu como obra**: o indicador LENTE·SOL no filme, a roda que fecha a
lente no filme pausado (decai no play; sem selo, doutrina dele), e a
coluna de layout acima da régua que o olho dele pediu. Ele confirmou as
cinco fotos ("ficou otimo"). Pendência curta na família: a pinça do
telefone ainda não é lente. História no ARQUIVO.


**108. O fim do filme não mostra direito a Lua e a Terra.** (Palavras
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
ou t=193) à lista oficial, para o buraco não reabrir.


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

**O VEREDITO DO SPIKE fica como história da medida: NÃO migrar** — obra GRANDE (reimplementar
colisão + relevância + clique no espaço 3D) por ganho estético parcial
e zero de performance. O que vale colher pontualmente, se um dia
incomodar: oclusão do rótulo atrás do globo, que dá para fazer no 2D
com os oclusores que a casa já tem. **A decisão é dele: arquivar, ou
ordenar a obra grande mesmo assim.** O worktree e a troika foram
removidos após o spike, como manda o desenho.

---

## BAIXA — dívida interna, ninguém vê

**95.** Num eclipse o chão escurecia e o AR não — **FECHADO em 25/08**,
conferido por ele na SEGUNDA LEVA da Sala de Conferência (**C12**);
história no ARQUIVO.

**96.** "O Sol está na origem" era combinado, não verificado —
**FECHADO em 29/08**: virou veredito do `atlas-smoke`, no app VIVO
(`window.__director.sun.group.position` tem de ser exatamente
[0, 0, 0]); quem transladar a raiz da cena ou posicionar a malha do
Sol agora quebra um juiz em vez de quebrar a luz em silêncio.

**94.** O segundo cobertor compunha um quadro que ninguém lia —
**FECHADO em 29/08**: o `ClaraoDoCampo` deixou de chamar o
`bloom.render` inteiro e repete as três etapas que importam
(passa-alta, pirâmide, composite) sem a soma final; a dependência da
forma interna já era cobrada por `throw` no construtor, agora sobre
todos os campos usados. MEDIDO a 1920×1080 em `?t=100`:
`pos:bloom-blend` caiu de 2,04 para 1,26 ms (×0,5 → ×0,2 por quadro —
o que sobrou é o blend legítimo da máquina da lei), e o A/B sentinela
deu **bit-idêntico nas 4 vistas** (sol, soldisco, hero8, ua150).
Rastros: `capturas/item94-gpu-{antes,depois}.txt` e o carimbo do ab-identidade.


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

**79.** As duas telas de erro esperavam o olho dele — **FECHADO em 25/08**,
conferido na Sala de Conferência (**C7**); história no ARQUIVO. *(As fotos
`capturas/erro-contexto-perdido.png` e `capturas/erro-no-tick.png`
TERMINARAM de servir: a nota de "não apagar" morreu com o item.)*

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

**85.** (Ruído de instrumento, visto em 24/08 e **de novo em 26/08**.) **O
`atlas-smoke` reprovou o TOQUE DUPLO sem defeito nenhum.** Numa corrida
ele acusou *"o TOQUE DUPLO VAI: a câmera reposicionou (andou 2.63e-16 do
raio, degrau orbita)"* — ou seja, a câmera NÃO andou. Na corrida
seguinte, com o MESMO código, passou (*"andou 1.10e+0 do raio, degrau
corpo"*), e no código anterior também passava. É flutuação do gesto
sintético, não regressão. Fica registrado porque é o mesmo gênero dos
itens 64 e 78, e porque juiz que reprova inocente já custou uma
investigação inteira (item 76). Se reaparecer, o passo é datar por
repetição antes de mexer em qualquer coisa.

**REAPARECEU EM 26/08, na leva da Q14 (item 91), e foi datado como este
item manda.** A MESMA frase e o MESMO número — *"andou 2.63e-16 do
raio"*, que é zero —, mudando só o degrau (`corpo` no lugar de `orbita`).
A corrida ANTERIOR e a SEGUINTE, com o mesmo código, saíram **verdes as
duas**, e nada foi tocado por causa dele: a receita deste item é
repetição, e a repetição respondeu. **Segunda aparição; continua sem se
reproduzir sob comando, e continua sendo o único juiz da casa que
reprova inocente.**

**86.** O céu do Atlas parecia mais apagado e a causa era a LENTE —
**FECHADO em 29/08**: ele cravou o 58° com a foto A/B na mão
(`capturas/item86-lente-ab.png`) e a obra pousou no mesmo dia
(`ATLAS_FOV_GRAUS` = `FOV_DA_CASA`; teto do zoom 226,84 → 133,68 UA;
corpo do Sol a 3,7741 raios; A/B de 61 vistas com o filme bit-idêntico
e só as 9 de Atlas mudando; sabotagem independente 4/4). História no
ARQUIVO.

**88.** Ao enquadrar QUALQUER lua, o que ficava no alto da tela era o eixo
da NOSSA Lua — **FECHADO em 25/08**, conferido por ele na SEGUNDA LEVA da
Sala de Conferência (**C10**); história no ARQUIVO.

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

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
