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
`world/sol/*`, `iauOrientation.ts`). O que segue à espera de
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
item 5 é obra própria (ciclo pela data). Os itens 8, 9 e 10 são HUD,
independentes. O item 38 (`aFocus`) é dormente por desenho — **não
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

Números aposentados (1, 2, 4, 11, 14, 29, 30, 31, 32, 35, 42): `git show de16542 -- docs/PENDENCIAS.md`;
o 4 (Atlas com brilho apagado 100×) morreu no M1 — `claraoDoAtlas` saiu do
código e os dois modos desenham igual, decisão do dono cumprida. O **3** e o
**44** pousaram com o aceite do dono em 17/08 (histórico deste arquivo no git).

---

## ALTA — o dono vê e incomoda

**5. O Sol do Atlas está congelado no máximo solar.**
Cheio de manchas e explosões; o do filme começa limpo. A fase do ciclo
deveria sair da data simulada. *(O M1 NÃO o tocou, de propósito: o pino
`ATLAS_JOURNEY_T` existe pela reprodutibilidade das vistas do Atlas, e
trocá-lo pela data exige o ciclo andar para TRÁS com re-bake — obra
própria, com foto para o dono.)*

**7. Trocar a qualidade ainda recarrega a página.**
O dono pediu “nada recarrega, padrão AAA”. A Fase A fechou 3 dos 4
recarregamentos; sobra a qualidade, mais três automatismos.
→ `docs/NORTE.md`, seção “Ajustes”. *(A letra B avançou em 18/08: o
`buildGalaxy` roda num worker, bit a bit igual ao inline — a etapa da
galáxia deixou de congelar o carregamento. Sobram os bakes no worker,
o swap vivo (C) e o Auto (D).)*

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

---

## MÉDIA — afeta o produto, não salta aos olhos

**9.** Tela estreita quebra o rodapé. Abaixo de 900 px a base do HUD estoura.

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

**48. (EM FECHO — falta SÓ re-rodar o juiz inteiro e cravar 0 falhas.)**
O juiz foi reescrito ao mundo pós-M1 em 17/08 (commit desta data): as 6
cobranças órfãs (gradação, `?grad=`, "clarão undefined") viraram as
cobranças de HOJE — o selo declara a vista nova ao visitar (sem o campo
morto), a abertura cobra `faixa comprimida` no detalhe, o rodapé de
proveniência NOMEANDO o clarão como artístico + a gradação morta
vigiada em runtime (par do simbolosProibidos), a volta do BRILHO
escrevendo só `?luz=real` (nada de `grad` na URL), e o cenário
`?luz=real` abrindo em BRILHO REAL. A dose da observação ganhou pino em
`clarao.test.ts`: 0,07 é número do DONO (recalibrar = mudar o pino
junto), abaixo do drama 0,55, e a troca por fase vigiada no texto do
`solNoQuadro`. Suíte 1.626 + lint verdes. A janela fechou no meio da
rodada do juiz: a PRÓXIMA sessão roda `node scripts/visual/a11y.mjs`
com o dev server em 5173 e crava 0 falhas — se algo acusar, o suspeito
é o juiz novo, não o app (as provas do app desta janela estão todas
verdes).

**51. O topo DESTA lista pesa ~90 linhas de história fechada.** O bloco
da ONDA DA LUZ (M1/M2 e as correções) já mora nos commits e só tem
DOIS itens vivos dentro: a conferência do dono no app com o padrão
novo e o gate de foto do expoente da asa (β). Toda conversa nova paga
essa leitura antes de trabalhar. Enxugar movendo a história para o
git e mantendo os dois abertos como itens — é a regra da própria
lista ("isto é o que está aberto, não um diário"). Aprovado pelo dono
em 17/08.

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
