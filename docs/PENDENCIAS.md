# Pendências — o que está quebrado e o que falta

**Este é o primeiro arquivo a ler.** Lista viva do que está aberto, no jeito
que o dono vê. O detalhe técnico mora nos commits, no `NORTE.md` e na
`LEI-DA-ESTRELA.md`.

**Como esta lista funciona:**

- O dono reportou um problema? Escreva aqui **naquele momento**, com as
  palavras dele.
- Item resolvido **sai da lista** e vira commit. Isto é o que está aberto,
  não um diário.
- A ordem é por **o quanto incomoda quem usa**, não por dificuldade.
- **O número é IDENTIDADE, não posição.** Item novo entra no fim da sua
  seção, com o próximo número livre. Números aposentados não se reaproveitam.

A primeira mensagem de uma conversa nova pode ser: *"Leia docs/PENDENCIAS.md e siga."*

**⚠ A PUPILA ESTÁ REPROVADA — e foi ENTERRADA no M2 (16/08).**
`src/three/core/pupila.ts` e o teste morreram inteiros na data marcada
(LEI §7.3); a varredura invertida (`simbolosProibidos.test.ts`) vigia a
ressurreição. O que está no lugar é compressão fixa na emissão —
`LEI-DA-ESTRELA.md` §7. Não a reescreva.

**O plano da estrela está em [`docs/LEI-DA-ESTRELA.md`](LEI-DA-ESTRELA.md).**
O conserto do Sol está FECHADO em código: M1 e **M2** (asa + bloom pela lei)
pousaram em 16/08 — os itens 3, 39, 40 e 43 ficam abertos só até o dono
conferir no app. O item 5 é obra própria (ciclo pela data). Os itens 8, 9 e
10 são HUD, independentes. O item 21 é memória paga e inútil (`depth: false`
no engine). O item 38 (`aFocus`) é dormente por desenho — **não apagar**; é
o canal do passo E3.

Palavras do dono no fim da rodada de 14/08: *"precisamos começar a tirar as
coisas da frente"*. **RESPONDIDA em 15/08: pela fundação.** A onda da luz
entrou INTEIRA e é o padrão; o que resta dela está no bloco abaixo.

---

## ONDA DA LUZ — o pacote é o PADRÃO desde 15/08

O visitante vê, sem digitar nada: compressão na emissão (β = 300), compressão
com ombro dentro do bloom (0,45 / 40), fotosfera na unidade da casa com o
filtro solar declarado, a repartição única do Sol e — desde o M2 — o clarão
de asas da lei com a pirâmide do bloom derivada dela. As derivações moram
nas constantes nomeadas (`luzDaCasa.ts`, `estrela.ts`, `post.ts`,
`terra.ts`); a história inteira, nos commits de 15–16/08. Das cinco portas
de volta restou UMA (`?bemis=`, registrada no selo): `?bfoto`/`?bcede`
morreram no M1 e `?bbloom`/`?bombro` no M2 — regra iv do §4, o lado A vive
nas capturas versionadas.

Provas vivas: o invariante disco↔ponto está VERDE (a dívida F2 foi paga); o
voo de ida e volta (`scripts/visual/voo-ida-e-volta.mjs`, pedido do dono)
passa em 34 degraus — 0,05 → 15.800 UA e volta, na MESMA sessão, sem tela
cega e sem assimetria fora da banda de histerese declarada (1,71–3,41 UA).

**O que está ABERTO da onda:**

- O dono conferir o app com o padrão novo (a queixa que abriu a rodada era
  do app com o desenho velho).
- O GATE DE FOTO do expoente da asa: β = 2,4 é semente de projeto (a Lei
  §1 pede a escolha entre 2,0 e 3,0 com foto), com `BETA_DO_ESPINHO`
  acorrentado em ¾ dele e a fração 0,06 junto. As fotos já existem —
  `capturas/luz-*.png`, a escada inteira — falta o dono olhar e cravar.

**O M1 FECHOU em 16/08 — o Sol inteiro numa repartição.** `repartir`
(`estrela.ts`) decide cessão, filtro e peso da malha; morreram o
`SunStar`, a entrega {0,02;0,05} pc, as quatro rampas com quina e as
portas `?bcede`/`?bfoto`. A costura 0,232→0,341 UA caiu de 4,3× para
1,5× — aceite declarado, cumprido e medido. Saldo: ~2.000 linhas
devolvidas.

**O M2 FECHOU em 16/08, no mesmo dia — o clarão virou LEI e o halo
constante morreu.** A régua da luz saiu de REPROVA 4/11 para **PASSA
11/11**, com o borrão finalmente encolhendo com a distância — ≥900 px na
parede de fogo → 349 a 40 UA → 87 a 500 → **20 px na âncora de
15.800 UA** (aceite declarado ≤ 20; o alvo do dono era ~8 px de raio) —
e o voo passa em 34 degraus, ida e volta, zero assimetrias. Entrou a
camada única do clarão de asas (`clarao.ts`): 16 vagas por ORÇAMENTO DE
FLUXO entre o Sol e as 1.726 nomeadas (a identidade "as 16" morreu — em
casa, Sirius, Canopus, Vega e as clássicas emergem da física), com
histerese e rampas para o ranking nunca piscar. O bloom passou a ser
governado pela lei: pesos por mip derivados da asa (razão ≈ 0,144) e a
fração da pirâmide DERIVADA da partição (≈ 0,051, zero número livre) —
era o σ≈12 px do primeiro mip que segurava o borrão em 24–37 px na
âncora; sem ele, 14. Morreram: as 16 heroes de autor (arquivo inteiro),
a política de dominância e o canal `aFade`, a PUPILA inteira (arquivo,
teste e a espinha de `uExposicao`), o clamp `sat` dos espinhos (item 43:
a cruz agora vem NA DOSE do fluxo — 0,0278 por continuidade em Sirius),
o coeficiente 0,08·10^(−0,3m) com o exemplar Sirius, e as portas
`?pupila`/`?dom`/`?nodom`/`?nohero`(→`?noclarao`)/`?bbloom`/`?bombro`/
`?knee2`. O juiz de cegueira do voo foi reescrito para o teto da lei
(perto do Sol, lavar é a parede de fogo honesta). A/B das 51 vistas
oficiais, medido com baseline recapturada do zero no commit do M1:
**50 mudam, 1 fica bit-idêntica** (`edgeon` — a única sem nada acima do
limiar do bloom: o controle de que a repesagem só toca o que floresce).
Mudar era o esperado e está DECLARADO.

**E a CORREÇÃO do mesmo dia, cobrada pelo dono ao abrir o app** — as
palavras dele, na hora: *"está totalmente bugado... o filme começa
totalmente bugado com a tela toda branca, o sol procedural não aparece
mais, fica escondido atrás dessa tela branca, os spikes ficaram
horríveis e enormes"* e *"esse círculo branco no meio do sol é normal
para você???"*. Três defeitos que as réguas não viam (elas fotografam o
Sol de longe; o juiz que faltava era o filme aberto): (1) a asa ignorava
o FILTRO SOLAR — de perto, quem deixa ver a superfície é o filtro
(~26 mag), e câmera com filtro não tem flare; agora a asa é cortada pela
mesma transmitância da repartição; (2) a asa é a óptica do PONTO — num
disco resolvido ela concentrava o fluxo inteiro numa conta de PSF e
desenhava o círculo branco; agora ela entrega ao BLOOM pela rampa
`wPonto` da lei (emenda escrita na cláusula do §1); (3) o braço do
espinho decaía mais devagar que o halo e virava parede branca de
~2.400 px; o expoente virou 1,5·β e a cruz afina em vez de atravessar a
tela. Verificado NA TELA desta vez: abertura com o Sol procedural
limpo, primeiro ato limpo, 5/40/500 UA com brilho redondo decaindo —
e os números re-medidos no registro do commit da correção.

**Publicar está em aberto e é decisão dele.** Em 2026-08-08 ele pediu, com
estas palavras: *"Consegue publicar o projeto automaticamente a cada commit
no main no git spaces"* — e é isso que `.github/workflows/deploy.yml` faz.
Segurar o push **não foi pedido dele**: foi um agente que inventou a trava.
Qualquer push na `main` põe o site no ar. Sem pedido explícito, não se
publica; o pedido de publicar continua de pé.

Números aposentados (1, 2, 4, 11, 14, 29, 30, 31, 32, 35, 42): `git show de16542 -- docs/PENDENCIAS.md`;
o 4 (Atlas com brilho apagado 100×) morreu no M1 — `claraoDoAtlas` saiu do
código e os dois modos desenham igual, decisão do dono cumprida.

---

## ALTA — o dono vê e incomoda

**0. A tela congelada virou o juiz — e é daqui que quase tudo nasce.**
Aprovar trabalho passou a depender de *"as vistas saem bit-idênticas"*.
Todo conserto que mexia em pixel era reprovado; todo defeito virava uma
camada nova por cima. Cinco commits exibiram “18/18 vistas idênticas” como
aval de trabalho de HUD — e as vistas são capturadas sem HUD.

Palavras do dono, 2026-08-11: *"Nunca foi criada essa regra que nada muda
na tela. Estamos sempre caminhando no sentido das melhorias, se nada muda
na tela isso fica impossível."* E em 2026-08-13: *"nada é fixo, tudo sempre
pode ser questionado se melhora UX."*

O que ela ainda cobra: fotos reais do Sol nunca julgadas por ele
(item 22). A cegueira a movimento (item 11) morreu com o voo de ida e
volta, versionado.
→ `docs/NORTE.md`, seção “Como medir”.

**3. A tela fica branca quando o Sol está longe.** *(M1 e M2 FECHADOS em
16/08 — a repartição única + o clarão de asas + o bloom pela lei são o
padrão. A régua PASSA 11/11 e o borrão encolhe com a distância em toda a
escada, 20 px na âncora de 15.800 UA. Fica aberto SÓ até o dono conferir
no app — a queixa era dele e o aceite final é dele.)*
De ~1 UA a ~2.000 UA o quadro lavava. O Sol encolhia 4.000 vezes e a mancha
na tela não mudava de tamanho. Era: o ponto do Sol não encolhia, o borrão
da lente multiplicava, e entre a bola e a estrela de espinhos havia um vão.
O M1 matou o vão; o M2 matou a mancha constante (era o kernel do bloom, que
não conhecia fluxo — agora a extensão é da asa, que encolhe com a luz).

O conserto não foi teto de brilho (proibido) nem a pupila (reprovada). Foi a
lei da estrela: mesma escala de brilho para bola e ponto, compressão fixa.

Palavras do dono, no dia: *"mas isso nao deveria ser so para o sol. toda
estrela deveria seguir o mesmo mecanismo nao acha? baseado nas magnitudes
da estrela obviamente. tinhamos falado disso quando geramos o plano de como
fariamos o motor estelar para gerar proceduralmente todas as estrelas
quando nos aproximarmos delas"*

→ `docs/LEI-DA-ESTRELA.md`. Régua: `scripts/visual/luz-do-quadro.mjs`.

**5. O Sol do Atlas está congelado no máximo solar.**
Cheio de manchas e explosões; o do filme começa limpo. A fase do ciclo
deveria sair da data simulada. *(O M1 NÃO o tocou, de propósito: o pino
`ATLAS_JOURNEY_T` existe pela reprodutibilidade das vistas do Atlas, e
trocá-lo pela data exige o ciclo andar para TRÁS com re-bake — obra
própria, com foto para o dono.)*

**6. A cena não reafia ao trocar de monitor.**
Os rótulos reafiam; a cena 3D não. A nitidez é decidida uma vez, no
arranque.

**7. Trocar a qualidade ainda recarrega a página.**
O dono pediu “nada recarrega, padrão AAA”. A Fase A fechou 3 dos 4
recarregamentos; sobra a qualidade, mais três automatismos.
→ `docs/NORTE.md`, seção “Ajustes”.

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

**44. Afastando do Sol, a bola CRESCE — branca, disforme e com borda
quadrada.**
Palavras do dono, 2026-08-16, entregando 10 fotos em sequência de
afastamento: *"o sistema todo de estrelas está quebrado... quando eramos
somente 1 filme as coisas eram mais bonitas... essa transicao entre as
distancias nao pode ser do jeito que está sendo feito hoje... várias
estrelas estavam com os spikes bonitos e bem pensados no inicio do
projeto quando eramos o filme somente... perdemos isso e vriou um spike
horrivel, uma bola borrada e disforme e enorme em vários memomentos"*.
E: *"infelizmentre nao tem medida de distancia para provar isso"*.

O que as 10 fotos mostram, nessa ordem de afastamento: fotosfera linda
de perto (1); ponto alaranjado correto (2–3); afastando MAIS, a bola
CRESCE até meia tela e perde a cor (4–8); a borda QUADRADA do adesivo do
brilho aparece (5 e 9); só a ~0,9 ano-luz vira ponto rotulado (10).
Três leis quebradas de uma vez: afastando, nada pode crescer; a cor da
estrela não pode morrer para branco; borda de quadrado nunca pode
aparecer. E falta distância viva na tela para ele provar o que vê.

Investigado no ato (16/08): sonda de afastamento com distância carimbada
provou o crescimento (6→42→222 px de raio entre 0,73 e 1,58 UA, 4
décadas para desinchar) e o mapa achou o culpado — as duas travas
(wPonto e filtro solar) abrem NO MESMO pixel (disco = 4 px) e a asa
entra com o fluxo pleno; o branco era a compressão por canal esmagando o
matiz; o quadrado era a janela de borda desenhada com régua de quadrado;
e a régua da monotonia tinha EXCEÇÃO escrita exatamente nessa faixa.

**R1 EXECUTADA (16/08, tarde) — a estrela renasce:** a FORMA do clarão
voltou a ser a receita de 30/07 (braço fino 16/2,4, halo, cruz colorida),
assada UMA vez numa textura neutra (`world/flare.ts`) e pintada pela cor
de cada estrela — o padrão dos grandes (Stellarium/Celestia/SpaceEngine:
forma é imagem, fórmula só decide escala). Moldura agora é CIRCULAR e
zera com folga antes da aresta (quadrado impossível — `flare.test.ts`
cobra zero na borda). A LUZ ganhou teto próprio (`TETO_DE_LUZ_DO_FLARE`)
separado do teto de TAMANHO: o rim do halo tem degradê e cor (o prato
branco saturado morreu). As ESTRELAS ganharam o piso de presença do
filme (`raioDoFlarePx`, Sirius ~104 px); o SOL manteve a régua ACEITA do
item 3 (asa/espinho × fator de enchimento 0,45 — escada preservada:
189 px a 1,58 UA, 75 a 15,8, 6 no fim; o piso não vale para ele, senão
o halo constante renasceria). Sonda re-voada: restam as 2 violações de
crescimento NA SOLTURA do filtro (0,73→1,58 UA) — são a **R2** (entrega
contínua + remover a exceção da régua). **R3**: distância viva na tela.

Escada oficial re-rodada com o desenho da R1: 9/11, com os 2 vermelhos
declarados (o teto do lavado orçava só "céu + Sol" e o piso da R1 dava
flare grande às nomeadas).

**RESGATE (16/08, noite) — o dono REPROVOU a R1 e mandou a ordem:**
*"Porque você não resgata no git a versão certa antes de entrar o atlas?
Já vi nas screenshots que está horrível não preciso nem abrir. Virou uma
bolha enorme com uma spikes dentro dessa bolha de luz enorme. Totalmente
horrível. Veja as imagens de spikes geradas anteriormente pelo histórico
do git."* Executado no ato: `world/heroStars.ts` EXUMADO byte a byte de
`bd12905` (as 16 do filme, braço fino 16/2,4, halo e cruz na cor, tamanho
de autor em pc, cintilação; só a espinha MORTA da pupila foi amputada);
o clarão da lei fica SÓ com o Sol — o piso K·pico^0,4 que a R1 deu às
estrelas morreu com a bolha; a textura da R1 segue APENAS na forma do
clarão do Sol (rim com degradê e cor). Lápides do M2 reabertas com a
ordem dele citada (`simbolosProibidos`, `corpos.test`): SunStar e pupila
seguem mortos. Prova visual: `resgate-sirius.png` — o Sirius de hoje ao
lado do alvo de 30/07, na mesma moldura (6,5 anos-luz). A unificação
estética estrela↔Sol volta à mesa só no M3, COM o visto dele.

**O CÉU (16/08, madrugada) — o dono viu o campo apagado:** *"o que vc
está fazzendo está bagunçando todo céu, as estrelas quase nao existem
mais, o ceu ficou vazio e escuro"*. Causa PROVADA por diff: o M2 trocou
o gatilho da cruz do catálogo (o `vSat` de 30/07 — saturava em pico 4,
amplitude 0,85) pela lei do fluxo pura, e centenas de estrelas perderam
a faísca. RESGATADO atrás de `uArteDaCruz`: campo estelar e cascas usam
a arte do filme; os dez corpos ficam na lei pura (o conserto do item 43
segue de pé). Junto: a dose de luz do clarão do Sol desceu ao teto 2,5
(proporção do filme — halo em ⅓ do cartaz, braços para fora; a 15,8 UA
o Sol voltou a ser ESTRELA). Escada re-medida: 11/11.

**A RESPOSTA DO DONO VEIO COMO DESENHO COMPLETO (16/08, madrugada) — e
é o brief da R2, palavra por palavra:** *"acho que temos ainda que achar
o equilíbrio entre uma regra única para todas as estrelas baseados nas
suas 'qualidades'/magintudes/medidas, etc, etc e um fitro aplicado a
cada uma delas baseado na distancia e foco, nao aplicado à cena inteira
ou a todo starfiled, ele só limita para que nao aconteça que uma estrela
nunca ocupe toda a tela, ela sempre chega no máximo que vai ocupar
rapidamente, ela é uma bola 3d, depois vira uma bola colorida e vai
migrando para o shape do spike até virar uma bola de novo e até sumir
pela distancia ou se encolher e diminuir luminosidade, enfim aí vc quem
sabe melhor como fazer, mas nao quero que o ceu vire nunca uma coisa
vazia, pois ele nao é...."*

Tradução executável — A ESCADA DA ESTRELA (vale para TODAS, Sol
incluído; o "gigante × discreto" morre aqui: a fase do spike É o
gigante, com teto):

1. **Regra única por estrela** (magnitude/cor/raio → fluxo recebido),
   com **LIMITADOR POR ESTRELA** — nunca exposição de cena (a pupila
   segue morta). O limitador só faz UMA coisa: nenhuma estrela ocupa a
   tela toda, nunca; aproximando, ela cresce RÁPIDO até o teto de
   ocupação (fração da tela) e estaciona ali até o corpo resolver.
2. **A escada de formas, contínua e reversível** (ida e volta pelas
   MESMAS rampas, C¹, histerese onde precisar — nada liga/desliga):
   corpo 3D resolvido → bola colorida → SHAPE DO SPIKE (a cruz do filme,
   a fase de presença) → bola pequena → ponto que esmaece até sumir.
3. **O céu nunca vazio — vira JUIZ executável:** régua nova que conta as
   estrelas visíveis/faiscantes por quadro em vistas fixas; toda mudança
   de desenho compara antes × depois — nunca mais um commit apaga o céu
   em silêncio (foi o que o M2 fez e nenhuma régua viu).
4. Execução em rodadas pequenas (método de 16/08), começando pelo Sol
   (a soltura do filtro é o pulo declarado) e estendendo às nomeadas;
   a âncora de 20 px a 15.800 UA se re-decide com a escada dele.

**O COBERTOR CURTO, nomeado pelo dono e MEDIDO (madrugada):** *"minha
preocupação é o cobertor curto... vc resolve de um lado e ferra do
outro"*. Confirmado pela escada no bloom: ele é UM para a cena inteira —
o kernel do filme (raio 0,58) devolve o respiro do campo ("a galaxia
parece vazia... tem bilhoes de estrelas e nem parece") E lava o Sol
distante (4/11); o kernel do M2 disciplina o Sol E mata o campo. O
meio-termo MEDIDO desta noite: a FORMA do filme (5 mips vivos) a 30% —
PASSA 11/11 com o campo respirando (`respirarPiramide`, post.ts). O
COBERTOR COMPRIDO é o item 1 da R2: **bloom seletivo por família de
camada** (campo estelar com o kernel do filme; Sol/planetas com o
disciplinado) + a régua do céu-nunca-vazio para o teto do céu ser
re-derivado com o dono, não herdado do céu morto do M2.

**A RAIZ DO CÉU VAZIO, ACHADA PELA PISTA DO DONO (madrugada, com fotos
modo-cinema-dpr2 × modo-performance-dpr1):** *"no modo performance
parece que a galaxia fica muito mais cheia"* — confirmado e explicado. O
pico da PSF cai com o QUADRADO do pixelRatio (mesmo fluxo, 4× mais
pixels em cinema/DPR 2), e TODOS os gatilhos são em cima do pico: a
faísca da cruz (satura em pico 4), o piso 1/255, o branqueamento, a
entrada do clarão, o limiar do bloom. Resultado: o céu DESARMA
exatamente no modo mais caro. E o ESCÂNDALO DE INSTRUMENTO: todas as
réguas capturam em DPR 1 — nunca mediram o céu que o dono vê no Mac.

**O MAPA DO CONSERTO (R2) — estado:**
1. **✅ Invariância de resolução (FEITA em DUAS partes, 3cef5f1 +
   37a8c26, APROVADA PELO DONO: *"ficou muito melhor agora"*):**
   parte 1 = gatilhos e doses de arte na régua de referência; parte 2 =
   o DEPÓSITO também (vPeak × uPr2 no vertex das três camadas — o
   tonemap esmagava o brilho por pixel em retina). Em DPR 1 nada muda
   (testes e baselines intactos); em retina o campo = performance, com
   nitidez de cinema (fotos modo-cinema-dpr2). Heroes já eram
   invariantes (pc). SUSPEITA REMANESCENTE se "vazio" voltar na vista
   de LONGE: a camada da galáxia profunda (galaxy.ts, 4M pontos,
   `shrink` 1/px² próprio) não recebeu o tratamento — conferir com o
   dono na vista galáctica antes de mexer.
2. **Instrumento (PENDENTE):** perna DPR 2 formal na sonda e na escada
   (Emulation.setDeviceMetricsOverride — receita pronta em
   scratchpad/dois-modos.mjs); nenhuma régua de céu vale só em DPR 1.
3. **✅ Bloom seletivo (FEITO em 17/08 — a ordem *"cada camada com seu
   cobertor"*, cumprida):** o cobertor PRINCIPAL voltou à pirâmide da
   LEI (`governarPiramide`, raio 0) e disciplina Sol, planetas, galáxia
   e nebulosa; o passe novo do campo (`ClaraoDoCampo`, post.ts) desenha
   catálogo + cascas + heroes pela `CAMADA_DO_CAMPO` e veste neles o
   kernel do FILME inteiro ([1; 0,8; 0,6; 0,4; 0,2], raio 0,58) — na
   MESMA máquina do vendorizado, rodada duas vezes por quadro: zero
   VRAM nova (o rascunho é o writeBuffer ocioso do composer), e só o
   CLARÃO soma no quadro, antes do knee/ACES — estrela nenhuma conta
   duas vezes (a "flag só-brilho" do desenho virou reuso). O meio-termo
   0,3 morreu com lápide na varredura invertida. O limiar do campo já
   chega na régua de referência sem conta nova (o depósito ×pr² da
   parte 2 é quem faz). Escada re-medida: **PASSA 11/11**, com o Sol
   MAIS disciplinado que o meio-termo (borrão a 1 UA: 88→40 px; na
   âncora de 15.800 UA: 52→**20 px**, o aceite do M2) e decaimento
   monotônico 310→20 px — e o campo com o respiro PLENO do filme
   (fotos da prova na conversa de 17/08). Defeito achado e morto na
   montagem, ao vivo: o quad da soma final limpava o quadro inteiro
   (autoClear ligado) — o Sol e a nebulosa sumiam da tela; o passe
   agora prende o autoClear em falso do primeiro ao último draw, a
   disciplina do vendorizado. LIMITES DECLARADOS: (a) estrela atrás de
   corpo resolvido ainda vaza clarão fraco no rascunho do campo (sem
   ocultadores lá; o conserto conhecido — fantasmas só-profundidade —
   está anotado no passe); (b) em retina a EXTENSÃO de qualquer bloom
   é menor em px de CSS (o kernel mede em px de buffer) — quem mede e
   decide é a perna DPR 2 (item 2). Fica aberto SÓ o aceite do dono no
   app.
4. Depois de 2–3: re-derivar o teto de céu da escada COM o dono (o céu
   legítimo ficou mais rico) e re-medir tudo nas DUAS pernas.

**PRIMEIRO PASSO EXECUTADO NO ATO (madrugada) — UM DESENHISTA SÓ:** o
dono cravou o diagnóstico final: *"claramente a regra que desenha
sirius é totalmente diferente da que desenha o sol... o desenho de
spikes de sirius é muito superioir"*. Resposta: o clarão do Sol passou a
usar A MESMA receita das heroes (núcleo+halo+braços de 30/07, brilho
fixo da forma — linha a linha, com oráculo de conformidade em
`clarao.test.ts` que cai se alguém "melhorar" um lado só); a LEI manda
apenas em presença (filtro/entrega/gatilho) e TAMANHO (asa do item 3 +
teto de ocupação por estrela, `OCUPACAO_MAXIMA_DA_TELA` = 0,55 da
altura). A textura assada da R1 foi DELETADA (flare.ts + teste). Na
tela: o Sol partindo voltou a ser o gigante de braços finos do tríptico
de 15/08, encolhendo monotônico — sem prato, sem moeda, sem borda.

---

## MÉDIA — afeta o produto, não salta aos olhos

**8.** `Esc` é a única tecla do Atlas e não está escrita na tela. A busca
também não tem atalho.

**9.** Tela estreita quebra o rodapé. Abaixo de 900 px a base do HUD estoura.

**10.** O selo de honestidade pode atrasar até 3 segundos. Só atualiza
quando a interface redesenha.

**12.** Nenhuma foto de referência mora entre 1 UA e 40 UA — onde a tela
lava. A régua de luz e as vistas `ua2`…`ua2000` já enxergam a faixa.

**13.** Sagittarius A✱ ainda é 125.884× maior que o real. Segundo
mentiroso de escala. Cadastro em `escala.ts`.

**15.** Quando o quadro engasga, não há como aliviar o Sol. As chaves de
desligar coroa e ejeção são lidas e nunca escritas.

**16.** Engasgo ao entrar no Atlas (a medir): o relógio do Sol acumula
fora de quadro e volta em salto.

**17.** O Sol solavanca quando o relógio acelera. O conserto existe, veio
do projeto irmão e está desligado. Ligar depende de editar `sol/activity.js`.

**18.** A luz trata o Sol como ponto sem tamanho. Certo para planetas,
errado a poucos raios solares — e agora a câmera chega lá. Sem penumbra.

**19.** Texturas que não passaram e um mapa inventado. Titã tem emendas,
Europa tem 68 linhas pretas no polo sul, Ceres é inventado pela fonte,
Vênus não tem foto em luz visível.
→ `docs/reference/ASSETS.md`.

**20.** Asteroides são elipsoides, e o HUD não confessa. Diz “cartografia
real” sem admitir o recuo procedural.

**33.** O selo e o painel discordam sobre quantas camadas existem.
Ajustes oferece 13, a gaveta do Atlas 6, o selo conhece 17.

**34.** A tela de carregamento desenha outra Via Láctea, de dois braços.
O modelo da casa tem quatro.

**36.** (Suspeita a medir.) Duas leis de poeira convivendo. Medir antes
de mexer — esta família já produziu um falso positivo (cessão da faixa).

**41.** (Suspeita a medir.) `core/engine.test.ts:44` diz que a vista `sol`
está a 0,063 pc; o valor vivo é 1,2955e-7 pc (`lodStellar.test.ts:1636`) —
487.000× de diferença. O literal envelheceu na F3 e ninguém o moveu. O teste
está VERDE só por isso: a asserção da `:77` exige que toda vista da lista
esteja ACIMA de 0,05 pc, então trocar o número pelo certo deixa o teste
vermelho **sem ter achado defeito nenhum**. O conserto certo é mover `sol`
para a lista `PROFUNDAS` (`:62-66`) e medir o corte de câmera lá. Achado em
15/08, na onda da luz; não tocado de propósito.

**37.** (Suspeita a medir.) As nuvens escuras podem estar apagando o que
está na frente delas. Par de capturas antes de tocar em qualquer linha.

---

## BAIXA — dívida interna, ninguém vê

**21.** 22,9 MB de memória de vídeo paga e inútil (buffer de profundidade
da tela; o composite é um quad). Uma palavra: `depth: false` no engine.

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

**43. Arquivos grandes demais — toda mudança faz as IAs lerem milhares de
linhas.** Palavras do dono, 2026-08-16: *"estou preocupado com nossa
arquitetura atual, acho que estamos com arquivos muito grandes, e toda vez que
vamos fazer qq mudança as AIs leem tudo isso.. como poderíamos resolver isso?"*

O vilão é o `director.ts` (4.019 linhas, 15 assuntos); depois `hud.css`,
`terra.ts`, `galaxy.ts`, `App.tsx`, `atlasRig.ts`. Docs estão saudáveis. Plano
aprovado pelo dono no mesmo dia — refatoração pura (zero pixel, gates
bit-idênticos como prova), desenho por símbolo em
`/Users/fgferre/.claude/plans/estou-preocupado-com-nossa-rosy-lynx.md`.
**Largada travada por decisão dele:** só depois que a etapa da rodada da
estrela pousar e ele avisar — a rodada altera muitas linhas, e o passo 0 da
execução é re-medir tudo. Não tocar no que a Lei demole (`lodStellar.ts`,
`pupila.ts`); os blocos que M1/M2 apagam viram lápides de um arquivo só.

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
