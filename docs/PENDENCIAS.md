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
- **Próximo número livre: 126.** Quem abrir um item usa este e soma um aqui,
  no mesmo commit — é esta linha que os agentes leem, não a contagem à mão.
  *(O **107** saiu em 28/08: a varredura de fecho, no `AGENTS.md`. Em
  31/08 esta linha foi pega TRÊS vezes atrás da verdade — o 114, o 115 e
  o 122 nasceram sem somá-la; quem abrir item confere o maior número vivo
  antes de confiar nela. Os 123 e 124 nasceram na faxina da estação do
  115, conferindo primeiro.)*

A primeira mensagem de uma conversa nova pode ser: *"Leia docs/PENDENCIAS.md e siga."*

---

## O BASTÃO — onde a rodada parou (31/08)

**31/08 (a rodada da retomada — Fable coordena, executores Opus,
auditor por etapa; TODAS as etapas auditadas por mão independente e os
achados consertados no dia).** O **item 108 completou as três pernas**,
e a chave foi a HIPÓTESE DELE (a câmera chegando quando os corpos não
estão mais lá): (1) o relógio do filme consertado na raiz — o `?jd=`
que o próprio app gravava na URL desligava a correção após um F5; a
guarda saiu do tick com censo, contraprova com data suja saiu
bit-idêntica à foto boa; (2) o **retrato de família** — o fim mostra a
Lua E a Terra (mira +11°, lente 52°, 2 s de retrato; só a vista
`fim-do-filme` mudou, 50/51 intactas com rastro); (3) a **Lua ACESA** —
ela não tinha ponto fotométrico e perdia para estrelas de fundo (pico
148 vs 230); entrou na camada de pontos SEM dose nova (148→245, fluxo
19,8× a estrela mais viva) e o brilho ganhou dente. O **109** ajustado
pela ordem dele ("olhar de UX sênior"): "SOL" legível no clarão
(contraste 1,8→12,5:1), fotos `-v2` na mesa. **FECHADOS por obra: 59**
(trocar de qualidade não tira mais o globo da tela; double-buffer na
casa única; troca só para quem está NA TELA; museu), **34** (a vinheta
do boot com os QUATRO braços do modelo — e o espelho de quiralidade
desfeito), **84** (3 vistas de Atlas no gate — enquadramento de corpo,
teto do zoom, close-up de lua; preço MEDIDO 4,0/lado, catraca 32,3;
sabotagem independente selou, inclusive a prova de que a vista do teto
mede o GRAMPO). Nasceram **116/117** e no MESMO dia ganharam causa medida
(116: o mosaico de Tritão é 76% preto e o lado fotografado nunca
enquadra — família de 8 luas, conversa com a bancada do item 19; 117:
a aberração cromática do passe de gradação pinta o limbo — dosar perto
de borda dura é conversa de gosto com A/B). O contador de itens estava
DUAS casas atrás (114/115 da outra sessão sem somá-lo) — re-somado, com
aviso na própria linha. **ESPERA O OLHO DELE: o fim do filme no app
(108), as fotos da beta (109) e a galáxia do boot (34).** Backup em dia
a cada selo; site intocado. E a palavra dele na pedra da outra frente
(`acb2b1e`): os blocos do 115 só ENTRAM depois que a frente atual da
fila terminar.

*(30/08, o bastão anterior:)*

**30/08 (noite — item 113 FECHADO e a lição de modelo).** A caçada que
ele cobrou achou desperdício real (foto duplicada, "antes" refeito à
toa, capturas em dobro, 122 boots de Chrome) e cinco fases provadas o
mataram: bolsa dos juízes 44,0→31,8 min, fechamento pesado ~20→8,8,
encadeado ~5,3. No caminho a rodada expôs a QUEDA DE MODELO — meio
plano semanal de Fable queimado num dia por agentes lançados sem
escolha de modelo ("inaceitável", dele) — e o conserto virou ESTRUTURA:
operários nomeados em `.claude/agents/` (executor=Opus,
mecanico=Sonnet), a delegação certa por construção. Consensos dele
gravados na memória do coordenador: "leia a intenção — pedido claro
executa, observação conversa primeiro"; a política de testes é autoria
das IAs (verificação = assunto interno, decisões dele são de PRODUTO);
julgamento, não pedra.

**30/08 (mais tarde — item 99 FECHADO, a dieta dos juízes).** A pedido
dele ("vamos para o item 99"), 6 frentes paralelas + fecho: os 97
arquivos sem dono responderam a quem servem (dono 28 · lei 45 · chão
31; NENHUM morreu — a leva inteira se justificou), todo juiz declara o
preço (soma 43,3 min PINADA na catraca: total só desce, subir re-pina
no diff), o porteiro do `npm run censo` reprova sem-dono e sem-preço, e
a mordida amostral (`npm run mordida`, 3/semana) provou no primeiro
giro que morde de verdade — pegou o App.test.ts, respondido com
justificativa no arquivo. Fusões marcadas nos cabeçalhos (fita 3→1,
chapa→costura) para quem tocar; fase-da-grade virou bancada. Suíte
2.516 verde; história no museu. Próximos da fila de produto: 108
(armado, espera a aparição com o olho dele) e a beta do 109.

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

**53. O expoente da asa (β) espera o gate de foto do dono — FECHADO em
31/08.** Ele olhou a escada inteira das 11 distâncias
(`capturas/luz-*.png`, entregues no chat) e cravou, palavras dele:
*"acho que isso já ficou bom, nao precisamos mais mexer nisso."* —
β = 2,4 deixa de ser semente e vira valor definitivo, com a corrente
que o item sempre declarou: `BETA_DO_ESPINHO` = 1,5× ele e a fração
0,06 juntas. O gate de foto que este item pedia foi cumprido.
*(Texto original preservado abaixo para o museu.)*
β = 2,4 é semente de projeto — a Lei §1 pede a escolha entre 2,0 e 3,0
com foto, com `BETA_DO_ESPINHO` acorrentado em **1,5×** ele
(`1.5 * BETA_DA_ASA`, em `estrela.ts`) e a fração 0,06 junto. O ¾ foi a
primeira forma, e o dono a reprovou no app em 16/08 — *"os spikes
ficaram horríveis e enormes"*: braço que decai mais devagar que o halo
não é cruz, é parede de 2.400 px. As fotos já existem
(`capturas/luz-*.png`, a escada inteira); falta ele olhar e cravar. *(Veio do bloco da onda da luz, enxuto pelo
item 51.)*

**54. O filme espera a exibição do dono — FECHADO em 31/08.** Ele
assistiu ao filme inteiro com o final novo (retrato v2 + dolly zoom +
Sagan) e cravou: *"já assisti, ficou lindo."* A exibição que este item
esperava aconteceu. *(Texto original abaixo para o museu.)*
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

**99.** A dieta dos juízes — **FECHADO em 30/08**: todo teste e juiz
declara a quem serve (dono 28 · lei 45 · chão 31, zero sem dono — e
NENHUM morreu: a leva inteira respondeu), todo juiz declara o preço
(43,3 min somados, PINADOS na catraca do censo: o total só desce;
subir re-pina no diff com justificativa), o porteiro do `npm run
censo` reprova arquivo sem dono e juiz sem preço, e a MORDIDA
AMOSTRAL (`npm run mordida`, 3 por semana, rotação determinística)
prova que teste velho ainda morde — no primeiro giro pegou o
App.test.ts, respondido com justificativa no próprio arquivo. Fusões
marcadas nos cabeçalhos para quem tocar (fita 3→1; chapa→costura);
fase-da-grade desceu a bancada; voo-ida-e-volta vive. História no
museu (`grep -n '^## Item 99' docs/PENDENCIAS-ARQUIVO.md`).

**113.** Os minutos dos juízes — **FECHADO em 30/08, no mesmo dia**:
cinco fases provadas uma a uma (A/A bit-idêntica ×2 no detector; zero
acusações no MB1; 573=573 na acessibilidade) + os 3 cortes que ele
aprovou ("ok para tudo"). Placar medido: bolsa 44,0→31,8 min (−28%),
fechamento pesado ~20→8,8 min, rodadas encadeadas ~5,3 (o "antes" de
graça pelo carimbo de árvore). As duas réguas defasadas pela lente 58°
morreram re-derivadas da lei viva. História no museu
(`grep -n '^## Item 113' docs/PENDENCIAS-ARQUIVO.md`).

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

**34.** A tela de carregamento desenhava outra Via Láctea, de dois braços,
e o modelo da casa tem quatro — **FECHADO em 31/08**. A vinheta tinha
espiral própria (um `TWIST` linear em r, dois braços a π); agora a crista
sai da MESMA espinha do modelo cartográfico (`BACKBONE`, quatro cristas de
pitch 12,5° espaçadas 2π/4), com o par ímpar dominante como no céu e o gás
(H II, poeira) uniforme nos quatro, também como no céu. E havia um segundo
defeito que ninguém tinha visto: o **sentido estava espelhado**. Medido
pela fase da harmônica m=4 contra ln r, o céu da casa fotografado do polo
norte galáctico abre a −3,78 rad por e-fold, a vinheta velha abria a
+4,33 e a nova abre a −4,44 (pitch aparente 12,7° contra os 12,5° do
`BACKBONE`). Fotos: `capturas/item34-boot-antes.png`,
`item34-boot-depois.png` e `item34-ceu-polo-norte.png` (a referência de
quiralidade, `?pos=` sobre o polo norte).

**O olho dele confirmou em 31/08:** *"a vinheta da galaxia está um pouco
melhor sim... por enquanto vamos dar como encerrada"* — e a ressalva
dele virou o item **118**.

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

**37.** As nuvens escuras apagavam o que está NA FRENTE delas —
**FECHADO em 31/08**: o campo de catálogo passou a desenhar em DUAS
passadas, uma de cada lado do quad multiplicativo, e quem diz de que
lado cada estrela está é o céu das nuvens (`temNuvemNaFrente`, em
`observedClouds.ts`); a estrela do tiro único vai de 0,512 para 0,966,
a população livre vai a mediana 1,000 e as estrelas ATRÁS de nuvem
ficam bit-idênticas, com o fundo ainda escurecido em 0,488. O conserto
proposto no item (a coluna das nuvens dentro do shader da estrela) foi
recusado pelo TAMANHO — vira subsistema e reescreve as camadas. O que
sobrou tem número: item **122**. História no ARQUIVO.

**46.** A galáxia profunda não passava pela invariância de resolução —
**FECHADO em 31/08**: a lei de tela ganhou RÉGUA (`leiDeTelaNaRegua`, em
`estrela.ts`) — o ângulo é julgado sempre na altura de calibração da casa
e o rastro volta ao buffer, com o piso do rasterizador MEDIDO no lugar do
suposto; na escada 900→1800 a razão vai de 0,770/0,714 para 0,982/0,937 e
o quadro cheio em retina de 0,975/0,845 para 1,000/0,966, com −0,09% e
−2,6% na janela de dpr 1 de sempre. História no ARQUIVO.

**59.** Trocar de qualidade não trocava a textura dos corpos já
carregados — **FECHADO em 31/08**: a troca de tier virou double-buffer no
pipeline único de texturas — a tela fica com os pixels velhos até o lote
novo chegar, zero quadros sem globo em 261 amostras nas duas travessias.
História no ARQUIVO.

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

**117.** (Suspeita a medir, mesma sessão.) As capturas de globo em
close-up mostram um **aro azulado fino na borda do disco** — visto em
Ganimedes (`atlas-lua-ganimedes`, nova) e na `foco-io` antiga. Corpo
sem atmosfera não devia ter limbo azul. Pré-existente à obra do 84.
Conferir se é casca de atmosfera aplicada por engano, Fresnel de
material, ou artefato de anti-serrilhado — par de zoom na borda antes
de qualquer conserto.

**VEREDITO (medido em 31/08 — CULPADA a aberração cromática do passe de
gradação; atmosfera, Fresnel e anti-serrilhado inocentes).** O perfil RGB
atravessando o limbo mostra os canais caindo em ORDEM, um pixel cada:
Ganimedes a 45° da tela dá (205,205,209) → (99,213,208) → (10,8,121) →
(4,3,29) → fundo; a Lua e Mercúrio dão o mesmo desenho. Não é mistura de
anti-serrilhado (isso daria cinza mais escuro, não azul saturado com R e
G em 3). A peça é o `FILM_SHADER` de `src/three/shaders/dustShaders.ts`,
que amostra R deslocado para FORA e B para DENTRO
(`off = c*uCA*r2*60`, `uCA` de fábrica 0,00012; `Post.setWarp` de
`src/three/core/post.ts` o reescreve por quadro e o multiplica por até
4,5× no warp da viagem). A/B na mesma sessão, travando só `uCA` em zero:
o "azul do limbo" (B − (R+G)/2) cai de **112 → 1** em Ganimedes, **117 →
2** na Lua e **77 → −51** em Io; desligar o passe inteiro dá o mesmo, ou
seja a aberração é a única contribuinte. Não é casca de atmosfera posta
em quem não devia: só a Terra tem casca (`terra.ts`), e o limbo dela é
uma faixa larga e macia de ~20 px em (24,50,112) — outro bicho; Titã, de
limbo laranja e macio, não tem aro nenhum (azul máx. −8). O aro aparece
em TODO globo com borda dura porque a borda dura é do render — a
silhueta sai serrilhada (visível no zoom sem aberração). **Conserto
proposto (não implementado):** atenuar `uCA` (ou zerá-lo fora do warp),
já que o efeito só se manifesta como franja de 1 px em silhuetas de alto
contraste. Zooms `capturas/item117-zoom-*.png` (com e `-semCA`), perfis e
a peça em `capturas/item117-limbo.json`.

---

## BAIXA — dívida interna, ninguém vê

**118. A tela de abertura merece ser repensada por inteiro (futuro).**
Palavras dele em 31/08, ao encerrar o item 34: *"acho que ainda temos
grande oportunidade nessa tela de abertura no entanto.. nao acho muito
bonita ainda... talvez tenhamos que repensar no futuro completamente
essa tela de loading, mas por enquanto vamos dar como encerrada."* Fica
registrado como obra futura de produto, sem urgência; quando vier,
começa por propostas visuais para o olho dele (a mineração do Eyes tem
o mecanismo do loading deles mapeado no mergulho 06 — bundle separado,
dados essenciais antes do app, saída em fade).

**119. O atlas-smoke prova 3 reprova em t=250 — o relógio do portal
move a Terra (pré-existente, provado).** Achado em 31/08 durante a obra
do retrato v2, com prova de inocência da obra: a mesma receita em HEAD
com as mudanças em stash dá o MESMO desvio (1,185e-2 do raio) — a pose
atravessa o portal exata em relação à Terra (60.170,7128 km antes e
depois); o que muda é o relógio: o `?jd=` reaplicado no portal move a
Terra 1,74 M km e a prova mede contra o lugar velho. Família do
108/portal. Casa do conserto: decidir se o portal deve reaplicar o
`?jd=` (e a prova acompanhar) ou se a prova deve medir relativo à
Terra.

**125. A ONDA DA PARIDADE — linhas de órbita, rótulos e ícones IGUAIS
aos do NASA Eyes.** *(Nasceu como "120" nos commits `335fa9c`/`60190b9`
por contador atrasado — o 120 é a histerese, aberta E fechada em 31/08
pela outra frente; renumerado para 125 no mesmo dia. Os commits de
história seguem dizendo "120"; este parágrafo é a ponte.)* Ordem do dono em 31/08, palavras dele: *"nao estou
convencido nem mesmo satisfeito ainda com a nossa implementacao das
linhas de orbitas, labels e ícones. Acho que nao aprendemos direito as
regras que fazem eles aparecerem, em qual momento desaparecem, como sao
desenhados, quais algoritmos governam encobrimentos... mas
principalmente os visuais desses elementos e comportamentos. Quero que
fiquem iguais ao do nasa eyes. Acho que vc fez um trabalho pobre e está
colocando exclusivamente a culpa dessa diferença no MSAA... nao estamos
atingindo o nivel de otimizacao e de algoritmos e regras que governam
esses itens, sejam em visuais, seja em comportamentos dinamicos."*
Esta ordem SUPERA a "estação da beleza" do item 115 (o bloco B era um
subconjunto) e AUTORIZA rever leis anteriores onde conflitarem com a
paridade — em particular o orçamento de 8 nomes do item 82 (lei de
25/08), que será substituído pelo conjunto de regras do Eyes (pesos por
classe + colisão + rodízio), mudança declarada aqui e conferível por
ele no fim.

**ESTADO DA ÁRVORE ANTES DE ABRIR FASE (aviso da frente do 115,
31/08):** o plano abaixo foi escrito contra um retrato ANTERIOR à
estação (2) do item 115, que pousou NO MESMO DIA. Já estão na main:
fades 250/750 ms nos rótulos (`622e920` — a F2 começa daí, faltam
intervalos por tamanho aparente e canais ícone/texto), oclusão por
TODO globo via âncora (`7d51170` — a F4 cita "hoje só o Sol", que já
não é verdade; falta segmento-esfera e atrás-da-câmera), gradiente na
fita (`74bec54`), MSAA `samples:4` MEDIDO e reprovado pelo preço nesta
GPU (+55–70% do quadro em dpr 2, `925f595` — a F1 tem os números
prontos em capturas/item115-msaa.json, não precisa medir do zero), e o
re-baseline único + faxina 49/80/85/101 FEITOS (`6873dbf`, 54 vistas
estáveis). As fases constroem em cima disso, não do retrato velho.

**O PLANO (a fila viva é esta; cada fase fecha com prova e a onda
inteira fecha com A/B lado a lado contra o Eyes vivo e o olho dele):**

**F1 SELADA em 31/08 (a madrugada virou 01/09), palavras dele: "pode
declarar e selar a F1 assim" (commit 04529af).** O que a F1 entregou:
MSAA no alvo do composer com escada por tier (cinema/alta 4 amostras,
performance 2 — o zero foi RECUSADO com foto na prancha, e o remédio de
2 custa +2,5-3,5 ms), saia de fwidth aposentada (beira dura, miolo
chapado, largura 1,2 = o literal do Eyes), hover que nasce no NOME e
acende a órbita (regra F0: o Eyes não tem picking de linha), forense
54/54 vistas explicada POR MEDIDA (noorbitas isola a luz da linha;
?msaa=0 devolve bit-idêntico nas 25 sem órbita), 11 sabotagens mordem.
**DECARADO por decisão dele:** sob MSAA a galáxia perde −1,23% de luz
de face / −2,19% de perfil — NÃO é o campo de estrelas (ablação por
camada prova: esconder o campo mantém a perda; esconder a galáxia
zera; a fotometria estelar está INTACTA) — é cobertura area-correta
(sem MSAA, sprite que cobre 30% do pixel depositava 100% da energia) e
invisível a olho nu; a blindagem aprovada parou ANTES de operar porque
trataria o órgão errado (condição dele honrada). Fica registrado, sem
obra: metade da perda vem do caminho do resolve (msaa=1 = msaa=2 =
metade do 4) — investigar só se um dia incomodar. Pós-selo pendente
para a sessão da F2: aplicar as 2 correções ao §7 do contrato (L3/L4
dizem "não tem" e a casa tem — anotadas no F1-BASTAO.md §8); achado
para o item 49 (tremor é ENTRE sessões, não dentro — 160 capturas
internas sem oscilação, terralua diferiu entre sessões). *(As duas
cumpridas em 01/09, commit `2196c5e`.)*

**F2 SELADA em 01/09, palavras dele no servidor vivo: "ficou ótimo,
pode selar a F2 e seguir para a F3".** O que a F2 entregou: cessão do
rótulo por TAMANHO APARENTE com a conta literal do Eyes (raio do corpo
em NDC, preset (0, 0,02), fadeBlur 0,5 ⇒ apaga entre 0,02 e 0,03 —
na Terra, entre ~90 e ~60 raios, série de 6 fotos conferida pelo
coordenador e pelo olho dele no vivo); o FOCO não é exceção (prioridade
120 fica, imunidade morre — provado vivo com as 6 distâncias); a
SEGUNDA camada de fade (opacidade final = produto: texto 0,75 planeta /
0,35 secundário, 0,05 escondido, 1 apontado; rampas 250/750 ms nas DUAS
causas de sumiço, `causaDoSumico` 'tamanho'/'disputa' registrado — a F3
vai ler); hover leva o texto a alfa 1 no mesmo evento da F1 (razão
descida/subida MEDIDA = 3,0 = 750/250; +26% no pixel do nome). 13
sabotagens mordem, 122 testes verdes. A4 conferida SEM código: a régua
de aparição da órbita da casa não é equivalente à deles, e fica —
A7/L24 já a declaram melhor. **ACHADO ESTRUTURAL para F3-F6: o gate de
identidade (54 vistas `?shot=2`) é CEGO a rótulo por construção**
(`.bare-mode` esconde o `label-canvas`, App.tsx:700) — o bit-idêntico
54/54 da F2 não prova nada sobre nomes; a prova é foto com HUD +
medida. Pendências herdadas e endereçadas: canal de ícone calculado
mas não lido (F5 pluga); oclusão/atrás-da-câmera sem causa própria
(F4); o modo só-ícone cede junto (decisão, igual ao Eyes). O
atlas-smoke segue com a única falha pré-existente do portal t=250
(item 119, idêntica em `2196c5e`).

**ESTADO DA ONDA no handoff de 31/08 (histórico da pausa; superado pelo selo acima):**
F0 FEITA e commitada (docs/reference/contrato-eyes-linhas-rotulos.md,
60190b9 — 77 regras). F1 FEITA E PAUSADA NA ÁRVORE, SEM COMMIT, por
ordem dele (pausa para outra sessão pousar): 11 arquivos, todos
listados em scratchpad/estudos/nasa-eyes-solar-system/mineracao/
F1-BASTAO.md — o bastão tem o estado exato, os números (GPU +50,8%
dpr2 ⇒ escada por tier; beira 1,836→1,560; hover 5×), as 9 sabotagens
e a fila de retomada: (1) forense do re-baseline (54/54 vistas DIFEREM
— esperado com MSAA, mas cada uma precisa de explicação escrita; só luz
de linha/AA pode explicar); (2) AMOSTRAS_POR_TIER.performance = 2
(remédio medido, +3,5 ms, decisão do coordenador já tomada); (3) fotos
finais para o olho dele. NENHUMA OUTRA FRENTE pode tocar os 11 arquivos
do bastão até a F1 selar. Achado colateral da F1 para o item 49: o
tremor é ENTRE sessões, não dentro (160 capturas na mesma sessão, zero
oscilação; terralua diferiu entre sessões). A retomada: relançar um
executor com o F1-BASTAO.md como brief + o contrato §1; depois F2→F5
pelo contrato, F6 fecha com A/B contra o Eyes vivo e o olho dele.

- **F0 — O CONTRATO (leitura, sem código):** um documento único em
  docs/reference/ com TODAS as regras do Eyes já mineradas e as que
  faltarem, extraídas dos trechos locais: pintura da linha (larguras,
  cores, alfas, hover, junta, miolo chapado), TrailShader, pesos de
  classe e prioridade determinística do LabelQuadtree (rodízio 20/frame,
  profundidade 8), VisibleInterval (fadeBlur, DefaultVisibleFar),
  DivComponent (oclusão segmento-esfera, atrás-da-câmera), fades
  250/750ms em duas camadas, canais independentes ícone/texto,
  tipografia dos dois níveis, ícones (anel/hexágono, tamanhos). Cada
  regra com o literal e o endereço no bundle. É o gabarito da onda.
- **F1 — A PINTURA:** samples:4 no alvo do composer (custo de GPU
  MEDIDO antes/depois; se o preço for alto, escada de qualidade decide
  por tier), aposentadoria da saia fwidth (miolo chapado como o deles),
  hover da órbita no mesmo quadro (1,2→2px, alfa 0,75→1). Re-baseline
  ÚNICO dos juízes, na mesma sessão da faxina dos ruídos 49/80/85/101.
- **F2 — AS REGRAS DE APARIÇÃO:** intervalos de visibilidade por
  tamanho aparente (o rótulo cede quando o corpo ENCHE a tela e quando
  vira pó), fades assimétricos 250/750ms, canais ícone/texto
  independentes (ícone pode ficar sem texto).
- **F3 — PRIORIDADE E COLISÃO:** pesos por classe do Eyes, prioridade
  determinística (classe → profundidade → alfabética), perdedor SOME
  (sem empurrar), rodízio por quadro; substitui o orçamento fixo de 8.
- **F4 — ENCOBRIMENTO:** todo corpo é oclusor de rótulo/ícone
  (segmento-esfera; hoje só o Sol, rotulos.ts:149), atrás-da-câmera
  não rotula.
- **F5 — TIPOGRAFIA E ÍCONES:** os dois níveis (planeta caixa alta com
  tracking; corpo menor caixa mista menor), ícone ao lado do nome,
  migalha fora do escopo (é do 115-F).
- **F6 — O JULGAMENTO:** fotos A/B das MESMAS cenas nos dois apps
  (vista do sistema, hover, aproximação, close com cessão) + auditoria
  independente única da onda + suíte cheia + a palavra dele.

Riscos declarados de antemão: F1 muda pixel na casa inteira (re-baseline
total dos gates de identidade — por isso é UM re-baseline só); o custo
do MSAA é real e será medido, com a escada de tiers como saída se
pesar; F3 revoga uma lei aprovada (declarado acima). O material-fonte
está todo em docs/reference/nasa-eyes-* e nos trechos/medidas de
scratchpad/estudos/nasa-eyes-solar-system/mineracao/.

**120.** A histerese da régua de relevância nunca chegava a valer —
**FECHADO em 31/08**; história no ARQUIVO. *(`prevDesenhados` era montado
da lista NOVA do próprio quadro, em que `desenhado` ainda é `undefined`
porque quem o escreve é o `LabelCanvas`, no `onLabels` que vem depois — o
conjunto saía SEMPRE vazio e o bônus de 20% de `pesoDoRotulo` não
multiplicava nada. A colheita passou para ANTES da reescrita de
`lastLabels`. Muda QUEM aparece em cena de empate, e está medido: numa
cena de fronteira — Júpiter enquadrado com as luas e cinco estrelas
disputando as vagas — as trocas do conjunto desenhado caem de **816,7
para 785,3 por minuto** (−3,8%, 3 corridas de 30 s por lado) e as
configurações distintas de **187 para 166** (−11%).)*

**121.** O juiz da beira da fita não conseguia medir a perna dpr 1 com o
gradiente — **FECHADO em 31/08**; história no ARQUIVO. *(A crista deixou
de ser o pixel mais claro de cada coluna e virou a TRILHA de maior soma
que anda devagar; a mesma foto que reprovava com `colunasMansas` 0,86
aprova com subida 1,307 px disp e FWHM 1,633, e as duas pernas de dpr 2
mal se mexem. A cobrança da continuidade — agora garantida por
construção — deu lugar a `colunasVivas ≥ 0,9`, sob teste próprio em
`beira-da-fita.test.mjs`.)*

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

**DATADO POR REPETIÇÃO em 31/08, e NÃO se reproduziu.** A `lua` levou 6
capturas no contexto de BALDE e 3 no ISOLADO, e as **nove deram
`09d8c61fa256@1800x1713`**. Ela entrou na varredura da família inteira
(63 capturas, 7 vistas) descrita no item **101**.

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

**84.** O gate de identidade cobria a fase ATLAS com UMA vista de 52 —
**FECHADO em 31/08**, pelas três vistas que o próprio item nomeava, todas
em corpos que nenhuma irmã cobria e todas com `&jd=` pinado:
`atlas-corpo-marte` (`?foco=marte&ver=corpo`, md5 `bfbf114a7e61`),
`atlas-teto-netuno` (`?foco=netuno&d=100000`, `4750e7bd5e37`) e
`atlas-lua-ganimedes` (`?foco=ganimedes&d=2`, `1d1faa08f163`).
Estabilidade provada antes de pinar (par nulo de 3 capturas cada,
`capturas/item84-vistas-atlas-parnulo.json`) e mordida provada por duas
sabotagens de knob só-do-Atlas, com as irmãs de filme 4/4 bit-idênticas.
Preço MEDIDO de novo: 4,0 min por lado (54 vistas, 56 capturas) contra
3,6 declarados — o til do item 108 saiu e o teto do censo subiu de 31,9
para 32,3 min. Continua sem juiz bit-exato, declarado: os NOMES na tela e
o HUD, que o `?shot=2` de toda vista apaga. História no ARQUIVO.

**85.** O `atlas-smoke` reprovava o TOQUE DUPLO sem defeito nenhum —
**FECHADO em 31/08**; história no ARQUIVO. *(A causa estava escrita uma
tela acima do defeito: o `await` entre os dois toques do par custa uma
ida e volta de CDP, medida no próprio arquivo em 200 ms com a sessão
sozinha e mais de 500 com o navegador aquecido — e a janela do duplo é
de 500 ms. Os seis comandos do par foram para uma fila só: o intervalo
caiu de 50 para 12 ms, e a espera de 1,5 s de parede virou espera de
ESTADO — o mergulho começa em 4 ms. O par e o mergulho entram no
veredito, então o zero de amanhã já vem com a explicação ao lado.)*

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

**123. As FORJAS ESTELARES perdem um terço do brilho quando a resolução
dobra — o defeito-irmão do item 46, medido em 31/08.** O
`src/three/world/starForges.ts` consome `GLSL_LEI_DE_TELA` — a lei de
tela ANTES da régua —, e não o `GLSL_LEI_DE_TELA_NA_REGUA` que a galáxia
profunda ganhou no fecho do 46. É o mesmo platô: `shrink` conserva o
depósito em PIXEL e não em ÂNGULO, então dobrar a altura do buffer divide
a contribuição em área. O achado estava registrado só no ARQUIVO, dentro
do fecho do 46 ("o que NÃO foi tocado, e é o mesmo defeito"), que é museu
— por isso ganhou número aqui.

**MEDIDO** com a mesma conta do 46: fluxo das forjas = quadro cheio menos
quadro com `?noforge=1`, em espaço linear (`?tone=linear` mais o sRGB
desfeito), média por ÁREA, altura do buffer 900 contra 1800 px em dpr 1
(o eixo verdadeiro do 46 é a ALTURA, não o pixel ratio).

· **edge-on: 0,663** — as forjas são 7,8% do quadro (3,62e-4 contra
  4,65e-3) e nenhum pixel satura (max 234 e 232). **Um terço da luz das
  forjas some ao dobrar a resolução**, e o número do 46 antes da régua era
  0,650 na mesma vista: é o mesmo defeito, na mesma dose.
· **face-on: 0,798** (o 46 dava 0,770), mas este lado vale MENOS: o quadro
  satura (max 255 nos quatro) e as forjas são só 0,3% dele.

Casa do conserto: trocar a lei pela régua no `starForges.ts`, como o 46
fez no `galaxyShaders.ts` — e a dose das forjas ainda espera a re-dosagem
da extinção de coluna (rodada 26), com quem a mudança tem de conversar.
Rastro: `capturas/item123-forjas-resolucao.json`, sonda em
`capturas/item123-forjas-resolucao.mjs`.

**124.** O porteiro do censo reprovava por uma palavra — **FECHADO em
31/08**; história no ARQUIVO. *(O `observedClouds.test.ts` nasceu com
`// Serve: física` e o porteiro só aceita `dono|lei|chão`; a classe
certa era `lei` — o arquivo prova o contrato do céu das nuvens. Uma
palavra trocada, `npm run censo` de volta ao exit 0.)*

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
