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

**O BASTÃO DE 17/08 (tarde): A RODADA DA ESTRELA POUSOU.** Palavras do
dono, com as imagens do recuo (1 → 40 → 15.800 UA), a abertura do Atlas
e o app na mão: *"a soltura ficou boa, pode considerar pousada —
destrave a arquitetura"*. Os itens 3 e 44 saíram da lista — a história
mora nos commits de 16–17/08 e na `LEI-DA-ESTRELA.md`. **A ONDA DA
ARQUITETURA CONCLUIU na noite de 17/08 e o item 43 da BAIXA saiu da
lista**: Parte 2 6/6, Parte 1 9/9 (director 4.019 → 2.135; a escada
foi o corte final), corte 10 (medidas da galáxia em folha) e a fila de
papel/poeira — cada corte com typecheck + 1.622 testes + lint + ab
bit-idêntico; a história mora nos commits de 17/08 (o fecho é a
sequência f702c4e → 881fbfc). Fronteira que fica de pé: não tocar no
que a Lei ainda demole (`lodStellar.ts`, `stellarBody.ts` por dentro,
`world/sol/*`, `iauOrientation.ts`) — a exceção é obra própria DELA, e a
primeira foi o item 5 em 21/08, que entrou em `stellarBody.ts`,
`sol/activity.js` e `sol/sun.js` com a exceção declarada no cabeçalho de
cada um. O que segue à espera de
conferência ESPECÍFICA do dono no app:
item 39 (focar estrela não pode apagar as outras), item 40 (rótulo
dobrado do Sol), item 43 da ALTA (a cruz de Vênus na dose do fluxo). A
dose 0,07 do Atlas segue sendo número DELE para calibrar quando quiser;
a extensão da escada às nomeadas mora na Lei (M3+), com o visto dele
antes de qualquer unificação estética estrela↔Sol.

**⚠ A PUPILA ESTÁ REPROVADA — e foi ENTERRADA no M2 (16/08).**
`src/three/core/pupila.ts` e o teste morreram inteiros na data marcada
(LEI §7.3); a varredura invertida (`simbolosProibidos.test.ts`) vigia a
ressurreição. O que está no lugar é compressão fixa na emissão —
`LEI-DA-ESTRELA.md` §7. Não a reescreva.

**O plano da estrela está em [`docs/LEI-DA-ESTRELA.md`](LEI-DA-ESTRELA.md).**
O conserto do Sol está FECHADO e ACEITO (M1, M2, R1–R3 e a soltura — o
pouso de 17/08). Os itens 39, 40 e 43 da ALTA esperam cada um a SUA
conferência no app (focar estrela; rótulo dobrado; a cruz de Vênus). O
item 5 (o ciclo pela data) FECHOU em 21/08 e espera só a conferência
dele. O item 38 (`aFocus`) é dormente por desenho — **não
apagar**; é o canal do passo E3.

Palavras do dono no fim da rodada de 14/08: *"precisamos começar a tirar as
coisas da frente"*. **RESPONDIDA em 15/08: pela fundação.** A onda da luz
entrou INTEIRA e é o padrão desde então — compressão na emissão, ombro no
bloom, filtro solar declarado, a repartição única do Sol (M1) e o clarão
de asas da lei (M2). A história (M1, M2 e a correção do mesmo dia, cobrada
pelo dono no app) mora nos commits de 15–16/08 e na `LEI-DA-ESTRELA.md`;
o que segue VIVO dela são os itens **52** e **53** da ALTA.

**Publicar está em aberto e é decisão dele.** Em 2026-08-08 ele pediu, com
estas palavras: *"Consegue publicar o projeto automaticamente a cada commit
no main no git spaces"* — e é isso que `.github/workflows/deploy.yml` faz.
Segurar o push **não foi pedido dele**: foi um agente que inventou a trava.
Qualquer push na `main` põe o site no ar. Sem pedido explícito, não se
publica; o pedido de publicar continua de pé.

Números aposentados — e nenhum se reaproveita. Os de 14/08 (**1, 2, 14, 29,
30, 31, 32, 35**) leem-se em `git show de16542 -- docs/PENDENCIAS.md`. Os
demais saíram depois, cada um no seu commit: **11** e **42** em 15/08
(`38d4ae4`, `ca4707e`), **4** em 16/08 (`bd12905`), **3** e **44** em 17/08
(`6740d72`), **8**, **10** e **51** em 18/08 (`cf6ea79`, `7afe64d`,
`229dc1c`), **9**, **55** e **56** em 20/08 (`35bab48`, `39ca08f`,
`2f2355a`), **16** e **57** em 21/08 (`ade2c3e`, `841d57d`). O 4 (Atlas com brilho apagado 100×)
morreu no M1 — `claraoDoAtlas` saiu do código e os dois modos desenham
igual, decisão do dono cumprida. O **3** e o **44** pousaram com o aceite
do dono em 17/08.

---

## ALTA — o dono vê e incomoda

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
com foto, com `BETA_DO_ESPINHO` acorrentado em ¾ dele e a fração 0,06
junto. As fotos já existem (`capturas/luz-*.png`, a escada inteira);
falta ele olhar e cravar. *(Veio do bloco da onda da luz, enxuto pelo
item 51.)*

**60. Atlas na abertura — DECISÃO DELE, 21/08: SIM.**
Perguntado se a abertura devia ter um botão de entrar no Atlas ao lado
de "Iniciar a viagem", ele respondeu: *"1. sim"*.

Medido em 21/08: hoje o caminho para o Atlas é único e tem 3 cliques —
Iniciar a viagem → Pausar → Entrar no Atlas. A palavra "Atlas" não
aparece na abertura, e "Explorar livremente" é o voo livre, outra coisa.

O que falta: um terceiro botão na abertura, ao lado de "Iniciar a
viagem" e "Explorar livremente", que entre no Atlas. É pequeno; o juiz
é o `a11y.mjs` (foco, Esc, escala de UI).

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

---

## MÉDIA — afeta o produto, não salta aos olhos

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

**19.** Texturas que não passaram e um mapa inventado. Titã tem emendas,
Europa tem 68 linhas pretas no polo sul, Ceres é inventado pela fonte,
Vênus não tem foto em luz visível.
→ `docs/reference/ASSETS.md`.

**20.** Asteroides são elipsoides, e o HUD não confessa. Diz “cartografia
real” sem admitir o recuo procedural.

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

**61. Rever a UI/UX inteira — DECISÃO DELE, 21/08.**
Perguntado se queria separar os Ajustes em "preferências do visitante" e
"laboratório" (medido: 32 controles hoje, 22 técnicos — curva de tom,
exposição, 17 camadas — e 10 de visitante), ele respondeu:

> *"2. nao, mas acho que podemos rever essa UI/UX (atlas tinha ideias
> boas de UX/UI e outros Apps tem até coisas melhores)"*

Ou seja: **não** é para separar os Ajustes. O que ele pediu é uma
revisão da interface inteira, trazendo as ideias boas do projeto Atlas
(`docs/PLANO-ATLAS.md`) e referências de outros aplicativos. É onda de
desenho: precisa de mockups antes de código.

**62. Celular: controles menores que expandem — DECISÃO DELE, 21/08.**
Perguntado se telas pequenas valem o esforço (medido: no Atlas, a
320×568 sobram 103 px de universo, 18% da tela; a 390×844 sobram 42%;
nenhum juiz abre 320 ou 390 px, e a quebra de CSS em 760 px ninguém
julga), ele respondeu:

> *"3. tela grande resultado melhor, mas acho que podemos criar
> alternativas de cotnrole menores e escondigos que expandam para
> celular, o proprio projeto atlas tinhas as abas animadas (drawer) que
> podiamos trazer a ideia (com execucao bem melhor fieta por sua
> coordenacao)"*

Tela grande continua sendo o resultado principal. O que entra é o
controle pequeno e escondido que expande — a ideia das abas animadas
(drawer) do projeto Atlas, com execução melhor. Junto vai um juiz que
abra 390 px, porque hoje nenhum abre.

**65.** (Achado em 22/08, conferindo no navegador o commit que gerou as
âncoras da galáxia.) A fenda do brilho do disco segue uma amplitude de
warp que o resto da casa não usa mais. Em `galaxyShaders.ts`
(`GLOW_FRAG`) o número é `1310.0`, com o comentário citando
`galWarpHeight (1310 pc)`; a base de hoje é 820 pc, e é ela que o
`GLSL_CARTOGRAPHY` gera. Medido com `?warpamp=`: os 9 shaders que
declaram `GAL_WARP_AMPLITUDE` acompanham o knob (820 → 410 com
`warpamp=0.5`) e quatro malhas ficam com `1310.0` cravado nos dois
casos. Trocar MUDA PIXEL: precisa de foto e do olho dele, não é
substituição cega.

---

## BAIXA — dívida interna, ninguém vê

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

**58.** (Achado no censo dos juízes de 21/08, que fechou o item 57. A
metade da ida e volta FECHOU em 22/08; sobra esta.) A régua dos planetas
(`planeta-pixel.mjs`) voltou a funcionar — travava desde o M1 pedindo um
`uGain` que a lei tinha matado — e agora REPROVA por outro motivo: a 150 UA
o clarão do Sol é uma mancha de 37.132 px que engole seis dos dez corpos, e
a lente `&nobloom=1` já não isola o que a régua veio medir. Ela precisa de
lente nova (a porta `?nosun=1` existe) antes de voltar a valer veredito.

**64.** (Ruído de instrumento, visto UMA vez em 21/08.) Um filho do
`ab-identidade` mediu as suas 18 vistas, gravou o estado e o arquivo de
vias, e NÃO saiu — ficou 12 minutos vivo depois do `process.exit(0)`,
com o pai parado no `Promise.allSettled`. As 52 vistas já estavam em
disco; matar o filho fez o pai fundir os três baldes normalmente e só
então lançar `filho j0 saiu com null`, sem imprimir o veredito. O lado
`antes` da mesma bateria, com os mesmos três filhos, terminou sozinho.
Não foi diagnosticado. Enquanto viver, uma leva que pare com todos os
baldes cheios se resolve matando o filho preso — o veredito sai da
segunda invocação, que lê tudo de disco.
---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
