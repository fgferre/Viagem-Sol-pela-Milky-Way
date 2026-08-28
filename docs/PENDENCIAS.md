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
- **Próximo número livre: 106.** Quem abrir um item usa este e soma um aqui,
  no mesmo commit — é esta linha que os agentes leem, não a contagem à mão.
  *(O **104** saiu em 26/08: a costura sombra do anel → noite, queixa dele.)*

A primeira mensagem de uma conversa nova pode ser: *"Leia docs/PENDENCIAS.md e siga."*

---

## O BASTÃO — onde a rodada parou (27/08)

**27/08 — O 87 POUSOU E SAIU DA FILA.** A abertura do telefone com a fonte
grande passou a ROLAR, sem encolher nada (a escolha dele em 25/08, Q6); o
juiz de acessibilidade ganhou as três provas das pontas e a sabotagem
confirma que elas mordem. Foto: `capturas/item87-abertura-rolagem-v2.png`.

**27/08, TERCEIRA LEVA — A CAUSA 2 DO 70 POUSOU.** O ponto de estrela
passa a ser preso 1 px dentro da tela e o brilho é avaliado na posição
verdadeira (catálogo, cascas e planetas, o mesmo `STAR_FRAG`). Juiz:
`scripts/visual/ponto-na-borda.mjs`. Medido em 1128×1080: Rigil
Kentaurus cruza a borda e o pico da faixa cai 2,6% no passo (234 →
228 de 255), depois desce aos poucos com o rabo da PSF; foto
`capturas/item70-borda-depois-v3.png`. A fila que vale agora começa
no **99** → **75** → **100**.

**27/08, SEGUNDA LEVA — AS FOTOS DO (3) ESTÃO NA MESA, à espera do olho
dele.** A sessão única de captura saiu: `capturas/item86-lente-ab.png`
(o A/B da lente, 35° × 58°, data pinada, árvore limpa dos dois lados —
o lado 58° era um worktree de uma linha, já removido) e
`capturas/item61-abertura-folha.png` (os três candidatos de abertura, todos
a 58°). **Achado da sessão, que ele precisa saber antes de julgar:** com a
lente mais aberta o teto do zoom cai de 226,84 para ~133,7 UA e a
abertura natural desce de ~8,9 para ~5,2 UA — está nas etiquetas das
pranchas. Nenhuma linha de código pousou; a escolha é dele.
**A fila que vale agora começa no (5):** o **99** (a dieta dos juízes)
→ **75** → **100**.

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
> morre na borda)~~ (27/08 — pousou; a foto espera o olho dele) → **(5)** o **99** (a dieta dos juízes) → **(6)** o **75**
> (o motor de filmes) → o item **100**.

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

*(Registro de escrivão, para nada se perder: a foto
`capturas/item77-filme-sem-orbitas.png` — a volta para casa sem as linhas
de órbita — foi tirada DEPOIS da C1 e ainda não passou pelo olho dele; está
escrita no próprio item **77**. Não aparece na fila acima porque a fila
acima é a que ELE ordenou, e não se inventa posição em nome dele.)*

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

**105.** A prova 19 do `atlas-smoke` (o toque duplo, no aparelho) falha de
vez em quando, e não é do produto: é do INSTRUMENTO. Ela toca um ponto e
usa o corpo mais próximo do toque; medido em 26/08, quatro corridas
seguidas do mesmo binário deram três vezes *"Marte (vizinho a 39 px)"* e o
toque duplo desceu ao degrau `corpo`, e uma vez *"Terra (vizinho a 76 px)"*
com a câmera parada no `orbita` — o toque caiu longe demais do rótulo e
não pegou ninguém. A falhada foi a PRIMEIRA depois de reiniciar o servidor
de desenvolvimento (grafo de módulos frio, primeira carga mais lenta), o
que casa com a teoria: o que muda é onde os rótulos assentam no instante
do toque, não o gesto. A prova navega com URL e data pinadas e põe as
próprias métricas, então nada da prova anterior vaza para ela. **O
conserto é fazer a prova MIRAR um corpo em vez de tocar um ponto e aceitar
quem estiver perto** — juiz que escolhe o próprio alvo mede coisas
diferentes em corridas diferentes. Entra na dieta dos juízes (item 99).

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

**61. Rever a UI/UX inteira — DECISÃO DELE, 21/08. A ONDA POUSOU E ELE
CONFERIU EM 25/08; o que sobra é RE-JULGAR A VISTA DE ABERTURA.** Palavras dele: *"nao, mas acho que podemos rever essa UI/UX
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

**A CARA NOVA ESTÁ CONFERIDA — C8, 25/08, pela Sala de Conferência: ele
confirmou o modo único e a interface nova como bons.** As fotos
`capturas/item61-*`, `capturas/vista-padrao-*` e `capturas/clarao-v2-*` **já
serviram**. E com C7 (as telas de erro, item **79**) fechando no mesmo
olhar, a onda da UI/UX está aceita por inteiro — menos a vista de abertura,
que é o que sobra abaixo.

**"EXPLORAR" É A PALAVRA, E O ASSUNTO MORREU EM 25/08 (Q7).** Ele tinha
oferecido *"navegar"* como alternativa sem exigi-la; perguntado, cravou
**"Explorar (como está)"**. O bullet do NAVEGAR **saiu desta lista** —
não é mais alternativa aceita, é caminho fechado. `components/Hud.tsx` e
`components/BarraOuAlcas.tsx` ficam como estão, e trocar a palavra passa a
exigir pedido novo dele.

**O QUE FICA ABERTO:**

- **A VISTA (a) NÃO É DEFINITIVA, e a hora de RE-JULGAR chegou.** Ele
  apontou, na noite de 23/08, que o **contexto de abertura do NASA Eyes é
  muito melhor que o nosso** — o Eyes abre no sistema INTEIRO e mesmo
  assim é legível. Isto obriga a uma confissão: a escolha do (a) foi
  **parcialmente FORÇADA pela dívida**, não preferência final — a vista
  larga era "dez nomes num nó de 40 px" sobre linhas de um pixel, e descer
  para o sistema interno foi o jeito de fugir do nó, não o de dar o melhor
  contexto. **N1** (item 82) e **L2** (item 83) pousaram em 24/08, e era
  isso que a vista larga esperava. **A folha de fotos SAIU em 27/08** —
  `capturas/item61-abertura-folha.png`: sistema inteiro no estilo Eyes ×
  interno atual × meio-termo, os três sob a lente nova de 58°, com HUD.
  **A decisão
  é DELE, e ninguém trate a (a) como resposta final até isso acontecer.**
  **E ELA ANDA EMPARELHADA COM A LENTE (item 86), por decisão de 25/08:**
  ele mandou abrir o fov do filme para o app inteiro, e a lente é metade da
  razão pela qual a vista larga era ilegível. **As duas folhas de foto — a
  do A/B da lente e a da vista de abertura — saem da MESMA sessão de
  captura**, no mesmo binário, senão ele julga a vista larga sob uma lente
  que já não vai existir.
- **o Atlas parar de parecer mais vazio que o filme** (*"parece que o modo
  atlas fica mais morto, vazio..."*). **Um mundo só JÁ É LEI e já é
  código.** A medida de 24/08 achou a causa, e ela não é regra por modo: é
  a **LENTE** (35° no Atlas contra 58°). Está no item **86** — e **ele
  DECIDIU em 25/08: abrir a lente do filme para o app inteiro**, com foto
  A/B antes de cravar.

**A história completa está no ARQUIVO, item 61.**

**70. O ponto que morre seco na borda.** *(O título nomeia o que está
ABERTO, nunca o que já foi consertado — por essa disciplina este item já
perdeu DOIS nomes em 25/08.)* (Achado em 22/08 pelo juiz de movimento, o
MB1 — `scripts/visual/estabilidade-temporal.mjs`.) Quando uma estrela muito
brilhante sai pela borda do quadro, o brilhão dela some de uma vez e **o
céu inteiro perde luz num único passo de câmera**. Ao voltar, acende de
novo do mesmo jeito. Está medido três vezes com a mesma assinatura, sempre
na mesma estrela — Rigil Kentaurus. A causa 2 pousou em 27/08; o que
falta é o olho dele na foto da borda.

**A METADE QUE FECHOU em 25/08** (história no ARQUIVO): eram DUAS causas, e
nenhuma delas a pupila. A **causa 1** — o segundo cobertor
(`ClaraoDoCampo`) vestindo um rascunho que só tinha o que estava DENTRO do
quadro — morreu com a **faixa de guarda** (`MARGEM_DO_CAMPO = 128 px`, o
joelho medido). Na mesma rodada fecharam a **cessão da linha de órbita**
(decisão dele) e a **faixa de instrumento** do juiz. **O MB1 foi de 6
defeitos a ZERO, sem afrouxar soleira nenhuma, e o zero repete.**

**A CAUSA 2 POUSOU em 27/08.** O vértice do ponto é preso 1 px dentro
do clip e a PSF é avaliada pela distância verdadeira (`gl_FragCoord`
menos o centro real) — o mesmo desenho da hero, agora nos três
desenhistas do `STAR_FRAG` (catálogo, cascas, planetas). A largura do
quadro sai da projeção, sem uniforme novo. Juiz: `scripts/visual/ponto-na-borda.mjs`.
Medido em 1128×1080 dpr 1, Rigil Kentaurus: o pico da faixa cai **2,6%**
no passo que cruza a borda (234 → 228 de 255) e depois desce com o rabo
da PSF (186, 105, piso ~45). Foto:
`capturas/item70-borda-depois-v3.png` — **espera o olho dele**.
Neste Mac (ANGLE/Metal) o GPU já mantinha o sprite 1–2 px fora, então
sabotar o prender não mudou a curva; o prender é o conserto portátil
para o GPU que descarta o ponto no clip. **O MB1 não cobra este
pedaço**; a régua nova mora no juiz acima.

**O TAMANHO DO EFEITO DEPENDE DA JANELA** (medido em 25/08, item 81). Os
números originais saíram de um quadro de 613 px, onde cada estrela é
**3,1× mais quente** que num de 1080. No `pan` a queda do passo cai de
−24,6% para **menos de 5%** a 1080 px; no `fov` ela **FICA** (−29,4%). A
causa 2 mediu-se em 1128×1080, e é essa a janela do juiz.

**AS TRÊS FOTOS DESTA HISTÓRIA JÁ SERVIRAM — C5, 25/08:** ele olhou
`capturas/item70-giro-antes-depois.png`,
`capturas/item70-linha-cede-antes-depois.png` e
`capturas/item72-nobloom-antes-depois.png` pela Sala de Conferência e
confirmou **o giro e a borda como bons**. Com isso a metade que fechou está
ACEITA por ele, a nota de "não apagar" morre com a conferência, e **o que
este item ainda é resume-se à foto da causa 2** — espera o olho dele.

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

**77. As linhas de órbita, ligadas por padrão — A OBRA ACABOU EM 25/08;
FALTA SÓ O OLHO DELE.** A órbita é o DADO,
não enfeite: NASA Eyes, Celestia e SpaceEngine desenham as três. Apareceram
**30 laços** (os nove planetas e as 21 luas), com camada `noorbitas` na
gaveta, fade nas duas pontas, lua só com o pai enquadrado, e **sem efeméride
viva não há linha**.

**O QUE ELE APROVOU (C1, pela Sala de Conferência):** as linhas **no
Atlas**. Com isso as decisões **1** e **2**, que iam junto na conferência,
ficam de pé como estão e não se re-litigam:

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

**A DECISÃO 3 ELE RESPONDEU, E A RESPOSTA VIROU OBRA — FEITA em 25/08.
Palavras dele:** *"tirar do filme (aceito recriar a separação entre modos
só aí)"*.

**⛔ O QUE FALTA NESTE ITEM É SÓ O OLHO DELE:**
`capturas/item77-filme-sem-orbitas.png` — a volta para casa ANTES (as
quatro elipses sobre o Sol) × DEPOIS (o céu do filme, sem linha). Se ele
aprovar, o item fecha e vai para o museu.

**ONDE A EXCEÇÃO MORA, para quem for mexer nisso um dia.** O mapa
`LINHAS_DE_ORBITA_POR_FASE` (`three/fases.ts`) diz, fase a fase, se a
camada desenha: **não** no filme (`intro`, `journey`, `end`) e no
`loading`; **sim** no Atlas e no voo livre. Quem lê o mapa é UM só — a
camada, dentro de `Orbitas.update` (`world/orbitas.ts`, §7) —, e a fase
chega lá como **parâmetro obrigatório**: apagá-lo não compila. A gaveta
não perdeu nada: o `noorbitas` continua governando a camada onde sempre
governou, e o gate se MULTIPLICA com ele.

**É EXCEÇÃO AUTORIZADA POR ELE** à lei do mundo único (item **61**: *"o
modo atlas na minha visao deveria ser o modo único"*), e a autorização é
**só aí, com as palavras dele**: ninguém a estende para brilho, lente,
nomes, bloom ou qualquer outra camada, e quem tentar está inventando
permissão que ele não deu. **Isso não é promessa de comentário:**
`fases.test.ts` varre a árvore e reprova qualquer consumidor do mapa que
não seja a camada das órbitas.

**A PROVA, em número.** `ab-identidade` nas **61 vistas**: **UMA** difere —
`mergulho` (a volta para casa, t=180), `a6efa49a8749` → `b0c38175a512`;
**56 IGUAIS**, e o Atlas entre elas (`atlas 45082fd1a0e5` dos dois lados,
mais as 12 de `foco-*`/`anao-*`). As **4 INSTÁVEIS** (`eclipse-limbo`,
`saturno-anel`, `saturno-anelnb`, `foco-titan`) já não repetiam **no lado
ANTES**, com o código de HEAD: é tremor herdado, não desta obra. O diff de
pixel do `mergulho`: **11.038 px de 3.083.400 (0,358%)**, e **11.027 SÓ
PERDERAM luz** — assinatura de conteúdo que sumiu, não de ULP.
**Sabotagem** (worktree, 77 dentes): gate removido → 2 reprovam; gate
invertido → 10; exceção estendida a outra camada → 1; director passando
fase digitada → 1; parâmetro apagado → **20 erros de compilação**.

**AS FOTOS:** `capturas/item77-filme-sem-orbitas.png` (a que espera o olho
dele), `item77-atlas-com-orbitas.png` e `item77-atlas-sem-orbitas.png` (o
par que decidiu o Atlas, na vista de 226,84 UA que desde o item 61 é o TETO
do zoom — **não é o candidato (a)**, que é o sistema interno de
`capturas/vista-padrao-abertura.png`), `item77-jupiter-luas.png`,
`item77-lua-fade.png` e `item77-filme-volta-para-casa.png`.

**A história completa está no ARQUIVO, item 77.**

**83. Órbitas AAA — a fita e o foco.** (Aberto em 23/08, DEPOIS de medir o
NASA Eyes. L1 e L2 nasceram sem queixa; o acabamento, em 25/08, ele
reprovou.) Estudo: `docs/reference/estudo-orbitas-eyes-observacao.md`.

**ACABAMENTO REABERTO por ele em 26/08:** *"lá a órbita parece uma fita
dobrada, não uma linha grossa; a nossa ainda parece linha grossa"* — e as
cores, *"muito sem graça"*. O que falta, medido no shader deles
(`LineShader`/`TrailManager` no `app-pretty.js`), e a obra — na ordem, um
commit e uma foto por passo:

1. **B1 — A2+A3. POUSARAM em 26/08 (`85f775f`).** A saia do AA e a
   largura que cresce com a janela saíram juntas, e tinham de sair. **Um
   desvio da receita, com razão:** o `miolo` do A2 virou UNIFORM
   (`uMiolo`) em vez do literal que ela pedia, porque com o fator da
   janela em cima da largura e a saia fixa por baixo a fração
   `visível/(visível+saia)` MUDA de janela para janela — 1,25/2,25 numa
   tela de 800, 1,40625/2,40625 numa de 1200. Literal, ele mentiria em
   toda janela grande e a largura visível deixaria de ser a que o §5
   promete. `larguraVisivelDaFitaPx` é a fonte única dos dois números.
   **A FOTO:** `capturas/item83-b1-beira-v2.png` — zoom 5× em pixels
   crus, dpr 2, duas janelas 4:3 de lado menor 800 (fator 1) e 1200
   (fator 1,5). A beira sai da ESCADA: a subida 10→90% atravessando a
   fita vai de **1,113 para 1,764 px** de dispositivo na janela pequena
   e de **1,311 para 2,111** na grande — no antes dá para CONTAR os
   degraus, no depois não há degrau nenhum. A largura obedece à janela:
   na de 800 a FWHM **não muda** (3,014 → 3,020), que é a "igual a hoje"
   que ele pediu; na de 1200 sobe de **3,046 para 4,234**. A franja
   colorida da foto é o `uCA` do `post.ts`, igual nos quatro painéis, e
   não é da fita. Instrumento novo:
   `scripts/visual/beira-da-fita.mjs`.
2. **B2 — a junta vira bissetriz. POUSOU em 26/08 (`4f40f65`).** Dois
   atributos de vizinho no MESMO buffer interleaved (`PASSO_DA_FITA` =
   12, escritos pela mesma passada de `espelharNaFita`) e a conta em
   pixel no vertex, com `escalaDaBissetriz` cobrada por número em Node e
   a mesma expressão pinada no GLSL. Sobrevivem, conferidos um a um: o
   `discard` do USE_DASH, o corte no near plane, o `resolution`
   automático e o `raycast` do L5.
   **CUIDADO AO LER O JSON:** `capturas/item83-b2-{antes,depois}.json`
   guardam a medida que CADA lado fez nas pontas que ELE achou, e a ponta
   anda um ou dois pixels entre os dois — lidos ingenuamente, eles
   desmentem o parágrafo abaixo. **O veredito é o da passada
   `--prancha`**, que mede os DOIS lados nos endereços do ANTES; é ele
   que está na foto, e são esses os números daqui.
   **A FOTO:** `capturas/item83-b2-dobra.png` — zoom 6×, vista de
   PERFIL (40 UA no equinócio vernal), estrelas e Sol removidos por
   subtração de um quadro com `&noorbitas=1`. Nas três pontas de fuso
   medidas a tinta sobe (66.328 → 67.032, 18.429 → 18.937, 27.364 →
   28.014); na ponta de cima o ANTES tem um ENTALHE PRETO no cotovelo da
   dobra e uma ponta cortada em degrau reto, e no DEPOIS o entalhe some
   e a ponta fecha em bico.
   **O TAMANHO, DITO SEM INFLAR — e isto é achado, não desculpa:** o
   ganho é LOCAL. Numa elipse vista de FRENTE a dobra por junta é 1,4° e
   a cunha vale 0,01 px, invisível (este item já dizia isso no A1). No
   quadro inteiro mudam ~800 pixels de 4,3 milhões. O que a bissetriz
   conserta é a PONTA, e é lá que se olha. **Se a impressão de "linha
   grossa" sobreviver ao B2, o que sobra não é a junta** — é a cor (o
   B3) ou algo que ainda não foi medido, e volta com foto.
   Instrumento novo: `scripts/visual/dobra-da-fita.mjs`.
3. **B3 — A PRANCHA ESTÁ PRONTA E ESPERA O OLHO DELE:**
   `capturas/item83-b3-cores-v2.png` (a v1 fica ao lado, sem as amostras
   de cor nem o achado), 3 colunas de cor × 2 linhas de alpha
   (0,32 / 0,75), na ABERTURA DO ATLAS. **Nada disto virou código** — a
   escolhida vira, em commit próprio.
   **A causa do "sem graça", medida:** a fotometria normaliza no canal
   mais forte, então TODAS as nove saem com um canal em 1,000, e o que o
   olho recebe (em sRGB, que é a régua certa para uma queixa de cor) é
   creme quase branco: Mercúrio `#ffddbc`, Vênus `#ffede3`, Marte
   `#ffbe8a`, Júpiter `#fff9df`, Saturno `#ffe3ba`, Plutão `#ffe6cf` — e
   a **Terra sai quase branca**, `#fef3ff`, com saturação **0,10**.
   Só Urano `#b0f6ff` e Netuno `#a8ebff` escapam do creme, e escapam
   para o mesmo azul claro. **Os nove saem do conversor do three em
   precisão CHEIA**, e isso importou por um byte: arredondar o triplo
   linear a três casas ANTES de converter dá `#ffbe89` em Marte, e só
   nele. A prancha entregue traz esse `#ffbe89` na etiqueta de Marte —
   um byte de arredondamento numa legenda, que não muda a amostra nem a
   escolha; o número certo é o de cima.
   As três colunas: **(i)** a fotometria de hoje; **(ii)** a tabela de
   design deles VERBATIM — Mercúrio `#9768ac`, Vênus `#b07919`, Terra
   `#0099cc`, Marte `#9a4e19`, Júpiter `#da8b72`, Saturno `#d5c187`,
   Urano `#68ccda`, Netuno `#708ce3`, fora da lista branco —, convertida
   de sRGB para linear; **(iii)** a fotometria com a saturação
   EMPURRADA, e o empurrão é este número e mais nada: **`S′ = S^0,45`**
   sobre o triplo já normalizado, com matiz e canal mais forte parados.
   **O QUE A PRANCHA JÁ RESPONDE, antes de ele olhar — e é achado, não
   opinião:** em (i) as quatro elipses da abertura são praticamente a
   MESMA cor, que é a queixa dele à vista. Em (ii) a **Terra fica AZUL**
   e as quatro se separam na hora. Em (iii) a cor volta, mas as quatro
   seguem todas QUENTES: o empurrão mexe na SATURAÇÃO e não no MATIZ, e
   os matizes fotométricos de Mercúrio, Vênus, Terra e Marte são de fato
   parecidos. **Saturar sozinho não separa as quatro de dentro** — só a
   tabela de design dá um azul à Terra. Quem quiser a terceira via com
   separação terá de mexer no matiz, e aí já não é mais fotometria.
   **A QUARTA COLUNA É DIREÇÃO DELE (27/08):** a cor da **textura** de
   cada planeta — a linha sai da cor do globo que já se vê na tela, e o
   azul da Terra vem de graça. A prancha ganha a coluna **(iv)** antes
   da escolha; a fotometria (observação distante, MKP17) não é da
   textura, e era exatamente essa a pergunta dele. **E não é a cor
   MÉDIA — é a cor DOMINANTE DE MAIOR SATURAÇÃO (refino dele, ainda
   27/08):** a média lava tudo (oceano azul + nuvem branca + continente
   marrom dá cinza). Pixel quase neutro (nuvem, gelo, bruma) não vota;
   quem vota é o pixel colorido. Receita: histograma de matiz dos pixels
   da textura PESADO pela saturação de cada um; a cor da coluna é a do
   pico — Terra sai o azul do oceano, Marte a ferrugem, Saturno o
   dourado.
   **COMO SE REPRODUZ:** as seis células saem de uma porta de
   instrumento EFÊMERA — `?paleta=foto|deles|saturada` e `?alfafita=` —
   que vive só num worktree e não pousou na main. Reabri-la é trocar a
   cor do material por essas três receitas e ler `BRILHO_DA_LINHA` da
   URL; a tabela e o gama acima são tudo o que ela precisa.

**Não falta, medido — não inventar:** a linha deles NÃO tem perfil
através da largura (chapada, `glowWidth = 0` até no hover), NÃO tem
gradiente nem fade ao longo da órbita (`farSideAlphaFade` existe no
código deles mas está **desligado**), NÃO tem cor de seleção (hover de
rótulo só sobe alpha para 1 e largura para 2), NÃO escurece atrás do
planeta (é depth buffer, que a casa já tem). A elipse deles tem 360
pontos × 256 nossos — não se mexe. A "vida" ao longo da linha só existe
nos trails de sonda — fora desta leva.

**O COLAR MORTO ESTÁ CONFERIDO — C13, 26/08, pela Sala de Conferência:
ele confirmou como bom** (junto com as confirmações C3 e C11 do mesmo
dia). O A1 fecha por inteiro — obra, auditoria, re-sabotagem independente
e agora o olho dele. A prancha
`capturas/item83-colar-antes-depois-v2.png` **já serviu**. O próximo
degrau é o **A2** (a borda macia), na fila desta família.

**AS PALAVRAS DELE CHEGARAM — 25/08, e elas fecham o C3.** Na Sala de
Conferência, diante de `capturas/item83-fita-zoom-antes-depois.png`, ele
tinha dito *"estranhei algo (explico no chat)"*. O chat veio: ele quer que
**as linhas de órbita finalmente fiquem lindas e profissionais como as do
NASA Eyes**. O que ele VÊ: a fita do L1/L2 ainda **não** está desse jeito.
**O A1 POUSOU em 25/08 e o colar está MORTO (a prova está no bloco dele,
abaixo); AGORA é o A2.** Não se espera mais o Passo 0, e não se pergunta
de novo o que ele estranhou — era isto.

**O ALVO É A LINHA LINDA, a mesma ideia de caneta do Eyes — não o
arquivo deles.** Palavra dele em 25/08: isso é ideia matemática já
pública (three.js MIT, SVG, Cesium), não invenção da NASA. **Não se cola
o `app.js`.** Não se pinta planeta com a paleta violeta/âmbar. Não se liga
`antialias: true` no renderer (a casa inteira nasceu sem MSAA). Gate
bit-idêntico é detector de regressão contra o NOSSO antes, nunca alvo
contra a foto deles. A receita que segue é a da caneta.

**O placar, dito sem inflar:** o que a medida nos dá razão são **dois
comportamentos estreitos da LINHA** (o corte quando a câmera está DENTRO do
laço, e o fade angular) mais a **honestidade da efeméride**. Não é veredito
geral: **no conjunto, os nomes e os rastros do Eyes são mais inteligentes e
mais bonitos que os nossos.**

**L1 (o foco manda na cena) e L2 (a fita de 1,25 px CSS) POUSARAM em
24/08** — e de carona caiu um defeito antigo da Onda 7: pedir Júpiter e
mandar chegar perto punha a **TERRA** em quadro. **O OLHO DELE VIU, e
reprovou o acabamento:** a foto
`capturas/item83-fita-zoom-antes-depois.png` (mais
`item83-abertura-antes-depois.png` e `item83-foco-antes-depois.png`) não
está linda como o Eyes. A foto do **A1** (colar morto) já está na mesa:
`capturas/item83-colar-antes-depois-v2.png`. **A próxima que decide é a
do A2** (beira em rampa no zoom 5×).

**A RECEITA DA CANETA — 25/08, e é ISTO que se implementa, nesta ordem.**
A fita é chapada (não é tubo). O Eyes também é: `glowWidth = 0`. O “volume”
que o olho lê é **junta limpa + borda macia**. `sqrt(1−u²)` está
**proibido** — era a leitura errada de 24/08. `Line2` **não** troca um
pixel: é o mesmo `LineMaterial` com as mesmas calotas.

**Já feito, NÃO SE TOCA — e isto congela COMPORTAMENTO, não FONTE.** A
lista abaixo protege o que essas peças FAZEM: quem as reescrever tem de
devolver o mesmo desenho e os mesmos números. Estender o corpo de uma
delas para servir a um passo novo — como `espelharNaFita` passou a
escrever os dois vizinhos no B2, sem mexer no que já escrevia — não é
violação; trocar a álgebra, a contagem de pontos ou o frame, é.
`conicaOsculadora`, `escreverLaco` (256 em
anomalia excêntrica), lua no frame do pai, cor por fotometria,
`alfaDa` (fade angular + corte com a câmera dentro do laço), L1
(`realce` do foco), L2 (`LARGURA_DA_FITA_PX = 1,25` CSS, o número
visível), `cederAoNucleo`, disciplina do buffer (`espelharNaFita`, nunca
`setPositions()` no quadro), `antialias: false` no renderer.

---

**A1 — JUNTA SEM CONTA (o colar). POUSOU em 25/08 — o colar está MORTO.**
Era o L2.5-a. A receita abaixo é o que foi feito, palavra por palavra;
fica registrada porque é o desenho, não o diário. **O item 83 NÃO fecha:
o A2 é o próximo.**

**O NÚMERO, medido no quadro vivo** (`scripts/visual/colar-da-fita.mjs`,
Retina dpr 2, com o relógio ANDANDO 30 dias de efeméride antes do
obturador; recorte de 340 colunas sobre o alto do laço de Saturno a 40
UA): **44 contas em 19 grupos, vão de 18 px, 100% regulares → ZERO
contas, zero grupos.** O corpo da fita quase não se mexe (154,7 → 152,8
de 255), o que prova que o que morreu foi o disco em dobro, e não a
linha.

**A FOTO QUE ELE JULGA é a `capturas/item83-colar-antes-depois-v2.png`**
— recorte de 120 colunas em zoom 15×, com as sete juntas marcadas nas
MESMAS colunas dos dois lados e, sob cada painel, o pico de luz de cada
coluna, que é a medida em si: no antes o perfil cruza o limiar sete
vezes em passo regular; no depois não o encosta em lugar nenhum. A v1
(`item83-colar-antes-depois.png`) fica ao lado, e não por cima: nela o
colar quase não se via — foi a queixa da auditoria, e é o que a v2
conserta. A medida crua está nos três
`capturas/item83-colar-{antes,depois,sabotagem}.json`, cada um carimbado
com o commit que o produziu, e os quadros em `capturas/item83-colar-cru/`
— **não apagar enquanto ele não julgar a foto**.

**O NÚMERO SE REPRODUZ, e isso custou um conserto:** a primeira versão do
juiz dormia 3 s de relógio de parede, e a efeméride andada virava refém
da carga da máquina (34,1 / 33,6 / 31,2 dias aqui, 21,4 na corrida do
auditor), levando o corpo da fita junto no primeiro decimal. Agora a
andada para por `jd` — 30 dias exatos, com resíduo de ~0,003 gravado no
arquivo. Duas corridas seguidas devolvem corpo, piso, limiar, contas,
grupos e vão IGUAIS, e a sabotagem numa árvore separada reproduz o
pré-A1 **número por número**.

**O dente de imagem existe e MORDE, nas DUAS pontas.** O juiz declara no
cabeçalho a quem serve (a frase dele, "lindas e profissionais como as do
NASA Eyes"), e as duas sabotagens foram feitas em worktree:

- revertido só o `dashed: true`, ele volta a acusar **44 contas em 19
  grupos de vão 18 px** e sai ≠ 0;
- apagado o gancho que faz o relógio andar, a foto sai de cena PARADA e
  o pente mede zero — e ele **reprova assim mesmo**, porque fita parada
  não julga o A1. Sem esse termo, um gancho que deixasse de disparar
  daria aprovação em silêncio.

O limiar não é os 215 absolutos de 24/08 (aquilo era a exposição DAQUELA
foto): é o corpo da fita mais 15 de 255, e o veredito exige o PENTE —
grupos demais, com vão de junta e vão regular —, que é o que separa a
junta do serrilhado da curva.

**A RE-BASELINE está declarada:** das 61 vistas do `ab-identidade`, **11
mudaram de pixel** — `atlas`, `foco-jupiter`, `foco-luas`,
`anao-eris-orbita`, `mercurio`, `mercurionb`, `venus`, `venusnb`,
`titan`, `titannb` e `eclipse-lunar` —, mais as 3 conhecidas como
INSTÁVEIS do item **101** (`saturno-anel`, `saturno-anelnb`,
`foco-titan`), que dão par nulo dos DOIS lados. As outras 47 saíram
bit-idênticas. **A inocência foi provada por medida, não por argumento:**
a mesma leva de 61 vistas com `EXTRA='&noorbitas=1'` dos dois lados
(pré-A1 num worktree, pós-A1 na árvore) fecha **58 IGUAL + as 3
instáveis, ZERO DIFERE** — com a camada desligada o binário novo é o
binário velho, então todo o delta de pixel mora na linha de órbita.

O texto abaixo é a receita como foi executada.

A fita tinha contas de luz nas juntas: **54 de 340 colunas** com pico ≥ 215,
espaçamento **rigorosamente constante de 14 px**. Cada quad do
`LineMaterial` (caminho de pixels, `worldUnits: false`) estende calota
redonda nas pontas; a calota do segmento *k* cobre o corpo do *k+1*; em
aditivo o disco pinta DUAS vezes (204 → 230). A 1× é sutil; no Retina
dele, é o colar. O dente de continuidade não pegou: cobra o BUFFER, e o
defeito nasce depois, na expansão do quad.

**Como fazer, no construtor de `Orbitas`, depois de `instanceStart` /
`instanceEnd` existirem e da `fita = new LineSegments2(...)`:**

1. No `LineMaterial`: `dashed: true`, `gapSize: 0`, `dashSize: 1` (o
   padrão; **nunca 0** — `mod(..., 0)` quebra). `dashed: true` liga
   `USE_DASH`: o fragmento faz `if (vUv.y < -1.0 || vUv.y > 1.0)
   discard` e a calota some. `gapSize: 0` faz
   `mod(d, dashSize+0) > dashSize` nunca verdadeiro — **não fica
   tracejada**.
2. `fita.computeLineDistances()` **UMA vez**. Com `USE_DASH` o atributo
   `instanceDistanceStart/End` é obrigatório. **NUNCA no `reamostrar`:**
   a função aloca `InstancedInterleavedBuffer` novo a cada chamada, e com
   `gapSize: 0` distância velha não pinta traço. No construtor as
   posições ainda são zero — serve.
3. `cederAoNucleo` continua: o `discard` do `USE_DASH` roda ANTES do
   `gl_FragColor` que a cirurgia procura.
4. `alphaToCoverage` continua `false`. `worldUnits` continua `false`.

O destino deste passo é o da fita de referência: ponta cortada reta,
**nenhuma** calota em lugar nenhum. O truque chega lá sem trocar a
geometria nem o material de linha — não é gambiarra, é atalho para o
mesmo desenho.

**Prova ENTREGUE:** `capturas/item83-colar-antes-depois-v2.png` (Retina,
fita em movimento), o dente `scripts/visual/colar-da-fita.mjs` com 17
provas de unidade em `colar-da-fita.test.mjs`, duas provas novas em
`orbitas.test.ts` (uma cobra as três chaves juntas, outra cobra que a
distância de traço nasce no construtor e não é reposta por salto de data),
e a re-baseline acima. **Agora o A2.**

---

**A2 — BORDA MACIA (anti-aliasing analítico). DEPOIS da prova do A1.**
É a ideia de livro (GPU Gems, Cesium, o estudo
`atlas-estudo-visualizacao-orbitas-ux-espacial.md`): a caneta é um
pouco mais larga, e a saia some. A beira lisa da referência é 100%
MSAA do cartão — duas camadas: 4× no alvo de render, mais o AA do
canvas — e **zero** suavização no shader de linha. Esta casa não liga
MSAA no app. Imita-se **só na linha**.

**Não é tubo.** O miolo fica chapado em `BRILHO_DA_LINHA`. Só a beira
some. A perda de 21,5% de luz era do `sqrt(1−u²)` **retratado** — não se
recalibra o brilho por causa dela.

**Como fazer, no MESMO `onBeforeCompile` de `cederAoNucleo`** (um
segundo callback APAGA o primeiro):

1. Constante nova `SAIA_DO_AA_PX = 1` (1 px CSS a mais no total, 0,5
   para cada lado). `LARGURA_DA_FITA_PX` continua **1,25** — é a largura
   VISÍVEL, o número medido do pixel deles (não é o padrão declarado da
   API deles; não se troca pelo padrão). O material nasce com
   `linewidth: LARGURA_DA_FITA_PX + SAIA_DO_AA_PX`. O teste da largura
   passa a cobrar os DOIS números, não “linewidth === 1,25”.
2. No fragmento, **antes** da cessão ao núcleo, com `vUv` do caminho de
   pixels (`vUv.x` vai de −1 a +1 na largura da fita **inchada**):

   ```
   float u = abs(vUv.x);
   float pixel = fwidth(u);
   float miolo = LARGURA_DA_FITA_PX / (LARGURA_DA_FITA_PX + SAIA_DO_AA_PX);
   alpha *= 1.0 - smoothstep(miolo - pixel, 1.0, u);
   ```

   Os dois números entram como literal no GLSL, iguais às constantes
   TypeScript. O nome no shader é `miolo`, **nunca** `nucleo`: `uNucleo`
   já é o disco de `cederAoNucleo`. `u` abaixo do miolo fica 1; a saia
   vai a 0 na beira do quad. Sem `discard` duro na beira longitudinal.
3. Ordem no fragmento, e é esta: (1) `USE_DASH` descarta calota — já
   veio do three; (2) a saia acima; (3) `cederAoNucleo`; (4)
   `gl_FragColor`. Não ligar `alphaToCoverage`. Não ligar `antialias` no
   `engine.ts`.

**Prova:** a MESMA foto de zoom 5× do L2 (`item83-fita-zoom-antes-depois`)
redesenhada: beira em rampa, não escada. Sem colar.

---

**A3 — LARGURA NA JANELA (L2.5-b). Só depois de A1+A2 na tela.**

```
px = LARGURA_DA_FITA_PX * max(1, min(larguraCss, alturaCss) / 800)
```

A saia soma **depois** do fator: `linewidth = px + SAIA_DO_AA_PX`.
**Armadilha dupla:** (i) o `hPx` da camada é de DISPOSITIVO — dividir
pelo `pixelRatio` antes de comparar com 800; (ii) UMA linhagem — 1,25
**com** fator. Não voltar a 1,2. Não escrever `resolution` à mão (o
`LineSegments2.onBeforeRender` já escreve em CSS).

---

**A4 — FITA CONTÍNUA COM MITER. É o B2 da leva** — a bissetriz é o
desenho da junta deles, medido no shader em 26/08. A fórmula é pública
(SVG / Canvas / Cesium) e é literalmente a deles:

```
offset = normalize(perp(l0) + perp(l1))
offset /= max(0.25, sqrt((1.0 + dot(l0, l1)) / 2.0))
```

Não é fita nova nem obra distante: é a MESMA estrutura de quads por
segmento que a casa já tem, mais dois atributos de vizinho
(anterior/próximo) por vértice, e a junta vira uma conta no vertex
shader, em pixel. Feito sobre a `LineSegments2`, o corte no *near
plane*, o `resolution` automático e o `raycast` de que o L5 depende
**sobrevivem** — porta-se a conta, não se reconstrói a fita. `Line2`
**não** é atalho: as calotas continuam.

---

**G1 / L4 / L5 NÃO ENTRAM NESTA LEVA** — não são o desenho da
caneta. Ficam na fila da família (o L3 saiu da fila em 26/08: é o B3
acima):

- **G1 — a gaveta devolve os oito** de `HELIO_SEM_PONTO` (a decisão 2 do
  item 77), como classe própria **desligada por padrão**, em vez de
  enterrados numa decisão de código. É literalmente o que o Eyes faz com as
  anãs dele.
- **L4 — o rastro, e só quando houver sonda no acervo.** É camada IRMÃ, não
  a mesma: no Eyes, `Trails` e `Orbits` são chaves separadas.
- **L5 — a linha responde ao mouse.** **No Eyes a linha é matéria morta** —
  o que eles têm é hover de RÓTULO, não de geometria. É vaga aberta, e
  continua sendo nossa. Cuidado: `raycast` antes do primeiro render falha
  **em silêncio**.

**O QUE NÃO SE REFAZ — verificado com TRÊS testemunhas independentes** (o
pixel do Eyes, a API do motor deles e as fontes MIT abertas), para impedir
que uma conversa futura "melhore" o que já está certo: a **cônica
osculadora do estado vivo**; a **amostragem em anomalia excêntrica com 256
pontos** (360 na deles, medido em 26/08; fica o 256 — a contagem não é o
que o olho reclama); **lua no frame do PAI**; **cor
por fotometria**; e o **corte de câmera dentro do laço + o fade angular**.
**Não copiar** o que eles fazem aqui.

**A história completa está no ARQUIVO, item 83.**

**87.** O véu da abertura não cabia na tela do telefone com a fonte
grande — **FECHADO em 27/08**, por obra, no caminho que ELE escolheu em
25/08 (Q6: *"deixar a página rolar"*): o véu rola e nada encolhe. As três
provas novas do juiz de acessibilidade cobrem as duas pontas (a tarja
inteira no início, o tempo do filme inteiro depois de rolar) e a sabotagem
confirma que elas mordem. Foto: `capturas/item87-abertura-rolagem-v2.png`;
história no ARQUIVO.

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

**92.** Descer ao corpo de um anão não punha o corpo na tela — e era a
classe dos oito, não Éris — **FECHADO em 25/08**, conferido por ele na
SEGUNDA LEVA da Sala de Conferência (**C11**); história no ARQUIVO.

**100. Mostrar e mexer na lente — o HUD de fotografia, como nos jogos.**
(**IDEIA DELE**, 25/08, dita junto com a decisão de abrir a lente — item
**86**. O **escopo ainda é decisão dele**: entra aqui em MÉDIA pela régua do
"quanto incomoda", e pode subir ou descer quando ele disser o tamanho que
quer.) Palavras dele, verbatim, a partir de onde a decisão do 86 termina:

> *"mas acho que podemos criar uma dinamica tb de indicar a lente que
> estamos usando e colocar tb um controle de zoom (que muda a lente
> automaticamente ou vc escolhe a lente e o zoom muda de acordo se for
> lentes de zoom variável tb muda as inidicacoes, isso é especialemnte
> interessante para o modo filme quando tem vezes que nao sabemos se o
> ponto de observacao está mudando ou o zoom está sneod ativado (como no
> caso das 3 marias), podiamos colcoar um pequeno indicador de posicao e
> zoom discreto e cool, como se fosse um hud de jogo que usa essa tecnica
> para parte de fotografia que alguns jogos tem esse modo..."*

**Em uma linha, o que isso é tecnicamente:** um indicador discreto de
lente/zoom mais um controle de zoom que **muda a lente** — zoom ÓPTICO
declarado (o fov anda de verdade), nunca recorte da imagem —, com os dois
mostradores amarrados um ao outro; e o valor dele está no **filme**, onde
hoje não dá para distinguir **"a câmera está andando"** de **"o zoom está
fechando"** (o caso das Três Marias, que foi ele quem apontou).

**O que fica dito e não se re-litiga:** o painel é **discreto**, no espírito
do modo fotografia de jogo, e não vira mais um painel de ajustes — a lei do
item 61 (uma porta só) continua valendo. E ele é **irmão**, não filho, do
item **86**: lá se decide *qual* lente o app usa; aqui se **mostra e se
mexe** nela. O 86 anda primeiro — mostrar uma lente que está prestes a mudar
é trabalho jogado fora.

---

## BAIXA — dívida interna, ninguém vê

**95.** Num eclipse o chão escurecia e o AR não — **FECHADO em 25/08**,
conferido por ele na SEGUNDA LEVA da Sala de Conferência (**C12**);
história no ARQUIVO.

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

**86.** (Aberto em 24/08, respondendo a uma impressão dele. **DECIDIDO POR
ELE em 25/08 — vira OBRA: abrir a lente do filme para o app inteiro.**)
**O céu de fundo PARECE mais apagado no Atlas — e parece com razão, mas a
causa é a LENTE, não uma regra por modo.** Ele relatou a impressão; a resposta vem
com número, porque impressão dele merece medida, não silêncio.
**O QUE NÃO EXISTE:** varredura completa de `src/` não achou NENHUMA
dependência de fase/modo no brilho, exposição, bloom ou ganho do campo
estelar. Os uniformes do campo (`STAR_VERT`/`STAR_FRAG`, escritos por
`StarField` e `WrappedStars`) saem de constantes, de resolução, de
posição e do `catFade` — que depende da DISTÂNCIA de casa, não da fase.
As três regras por modo que já existiram (`claraoDoAtlas`, o
`setGradacao` do bloom e a dose por fase do clarão) estão mortas, com
lápide e com `simbolosProibidos.test.ts` guardando o túmulo. *(Desde
25/08 existe UMA regra por modo viva na casa, e ela não é de luz: as
LINHAS DE ÓRBITA não desenham no filme — exceção que ELE autorizou pelo
nome, item **77** decisão 3. Ela governa a visibilidade de uma camada de
instrumento, não brilho, exposição, bloom nem ganho do campo, e
`fases.test.ts` reprova qualquer tentativa de estendê-la.)* E a *dose do
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

**ELE DECIDIU EM 25/08, pela Sala de Conferência (Q4). Palavras dele:**
*"abrir a lente (lente do modo filme) para o app inteiro — voltem com foto
A/B"*. Ou seja: o **58°** do filme passa a valer também no Atlas, os
`ATLAS_FOV_GRAUS` de 35° saem do caminho, e o eixo é **global**, como a
medida acima já apontava ser o único caminho lícito.

**A OBRA, e ela tem uma condição que é dele:** fazer o A/B da lente e
**voltar com FOTO antes de cravar** — Atlas a 35° × Atlas a 58°, na mesma
distância, mesma data, árvore limpa dos dois lados. Três coisas para quem
executar: (i) o `uZoom` das heroes (`heroStars.ts`) responde à lente por
LEI — a 58° o clarão delas cresce de 0,569 para ~0,95, e isso É parte do
efeito, não bug a compensar; (ii) mudar o fov re-baseliza as vistas de Atlas
do gate, e isso se declara; (iii) o teto do zoom e o enquadramento padrão
mudam de tamanho aparente junto — o par de fotos tem de mostrar isso, não
só o céu.

**A FOTO SAIU em 27/08: `capturas/item86-lente-ab.png`** — 4 painéis, data
pinada (jd 2460409,264), árvore limpa nos dois lados (o 58° era worktree de
uma linha, removido; nada pousou). Par 1: mesma câmera (8,9 UA), 35° × 58°.
Par 2: o enquadramento natural de cada lado. **Achado que ele precisa saber
antes de julgar:** a 58° o teto do zoom cai de 226,84 para ~133,7 UA e a
abertura natural desce de ~8,9 para ~5,2 UA. Espera o olho dele junto com
a folha do item 61.

**⚠ ESTA FOTO NÃO SAI SOZINHA.** Ela conversa direto com o **re-julgamento
da vista de abertura** (item **61**): a vista larga era ilegível em parte
por causa da lente, e ele vai julgar as duas coisas no mesmo olhar. **As
duas folhas de foto — a da lente e a da vista de abertura — saem da MESMA
sessão de captura**, senão ele compara maçã com laranja e a conferência não
vale.

**A ideia que veio junto com esta decisão virou o item 100** — o indicador e
o controle de lente/zoom. São coisas separadas: aqui é *qual* lente o app
usa; lá é *mostrar e mexer* nela.

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
