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
mora nos commits de 16–17/08 e na `LEI-DA-ESTRELA.md`. A **ONDA DA
ARQUITETURA (item 43 da BAIXA) está DESTRAVADA e em execução**: passo 0
(re-medir tudo) primeiro; o primeiro commit de corte só depois do
re-mapa. O que segue à espera de conferência ESPECÍFICA do dono no app:
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
independentes. O item 21 é memória paga e inútil (`depth: false` no
engine). O item 38 (`aFocus`) é dormente por desenho — **não apagar**; é
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

**36.** (Suspeita a medir.) Leis de poeira demais convivendo — a análise
paralela de 17/08 conta QUATRO (a absorção do catálogo, a das cascas em
0,8 mag/kpc, a CCM89 das partículas e o forno das forjas), e o NORTE
ainda descreve uma quinta fórmula (λ^−2,6) que não é a que o catálogo
executa — documento e código não batem. É a unificação 1 do NORTE, não
um corte de pasta. Medir antes de mexer — esta família já produziu um
falso positivo (cessão da faixa) — e foto para o dono. Só depois da
onda da arquitetura assentar (fila aprovada em 17/08).

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

**46.** (Suspeita a medir, herdada do item 44.) A galáxia profunda
(`galaxy.ts`, 4M pontos, `shrink` 1/px² próprio) não passou pela
invariância de resolução — se o "céu vazio" voltar na vista de LONGE em
tela retina, é a primeira suspeita. Conferir com o dono na vista
galáctica antes de mexer.

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

O vilão é o `director.ts` (4.019 linhas em 16/08, 15 assuntos); depois
`hud.css`, `terra.ts`, `galaxy.ts`, `App.tsx`, `atlasRig.ts`. Docs estão
saudáveis. Plano aprovado pelo dono no mesmo dia — refatoração pura (zero
pixel, gates bit-idênticos como prova), desenho por símbolo em
`/Users/fgferre/.claude/plans/estou-preocupado-com-nossa-rosy-lynx.md`.
**DESTRAVADA em 17/08 com a palavra dele** (o pouso da estrela; o bastão
no topo). **A PARTE 2 ESTÁ 5/6 (17/08, cinco cortes commitados):** passo
0 (re-mapa completo; a lápide exposicao.ts morreu com a pupila, o
solNoQuadro virou módulo definitivo, lodStellar já caiu a 287 pela Lei);
corte 1 alias `@/*` morto + princípio 11 no AGENTS; corte 2 hud.css → 8
fatias contíguas em `src/hud/` (cascata byte a byte); corte 3 atlasRig →
retanguloDoAtlas + enquadramento + rig (fachada serve o a11y por
caminho); corte 4 terra → orientacaoNaCena + texturas +
eclipseNoMaterial + shaders/terraShaders (1.210→693; corpos importam
por assunto); corte 5 galaxy → baseGalactica (49 l — journey e mais 4
importavam 1.192 linhas por 4 vetores) + geradorDaGalaxia + classe.
Provas por corte: typecheck + 1.622 testes + lint, e ab-identidade
BIT-IDÊNTICO (51 vistas no 4 e no 5; atlas-smoke verde no 3). **A PARTE
2 FECHOU 6/6 em 17/08** — o corte 6 entregou App.tsx 1.183 → 769 com os
três hooks (useDirector 226, useEspelhoDaUrl 308, useAtalhos 64; os
dois primeiros GOVERNADOS pelo selo; semântica da URL intocada; provas:
busca-smoke + voo-smoke + ab SMOKE bit-idêntico + a11y sem falha nova).
**A PARTE 1 FECHOU 9/9 (17/08, noite) e o director em 2.135** (era
3.797): 1 nuvensSemente, 2 veu, 3 prontidao, 4 maquinaDoTempo (as 110
costuras religadas de uma vez — o typecheck com campos mortos varre as
órfãs; atlas-smoke provou o relógio em cada gesto), 5 carregamento
(montarGalaxia/montarCorposDoPalco/montarCenaDeAquecimento; os
literais expoM0/sigmaPx FICARAM no shell do init), 6 gestos
(ligarGestos com as duas máquinas dentro; arrasto provado com mouse
CDP real: órbita nos dois eixos, move órfão inerte), 7 rotulos
(Rotulos com a projeção do quadro, a linha de rumo, a distância do
Sol e o buffer das luas; o beat da viagem entra por fio; tryVisit lê
a MESMA lista pelo getter `alvos`; os pinos de lua.test,
atlasRig.test e LabelCanvas.test seguiram o código e vigiam a costura
dos dois lados), 8 solNoQuadro (o gate do palco, a repartição da lei
e a cessão do ponto nos MESMOS três pontos do tick; `solArmado` e a
repartição do quadro viraram estado do módulo; as heroes ficaram no
director e subiram uma posição — neutro provado em pixel; o cadastro
de representações aponta o fiador novo; prova extra: voo-ida-e-volta
PASSA em 34 degraus), 9 escada — o corte MAIOR, executado na janela
limpa que o mapa pediu (a navegação inteira em `director/escada.ts`:
clique, busca, casa viva, degraus, religador do relógio e reaplicação
pós-efeméride; o trio do foco com UM dono e o selo lendo `focoCorpoId`
pela fachada; `EstadoDaEscada` e `larguraDeCss` moram lá com reexport;
`HELIO_SEM_PONTO` mudou para o `atlasConfig`, ao lado das listas de
que deriva; as fatias do atlasRig.test seguiram o código; prova manual
no navegador: Ceres pela busca com aproximar e Esc·Esc de volta,
clique no Sol em casa descendo ao corpo, `?foco=sol&ver=corpo`
nascendo seco a 6,40 raios solares). Provas por corte: 1.622 testes +
ab (completos: 52 vistas bit-idênticas; a acusação falsa da `terranb`
virou o item 49 — nos cortes 7 a 9 as vistas da Terra saíram limpas de
primeira). ⚠ Lição de instrumento do corte 9: o ab-identidade RETOMA
capturas por vista do estado em disco — um `depois` rodado depois de
outra sessão pode reaproveitar capturas VELHAS e o veredito sai vazio;
o `depois` de um corte novo roda com `DOZERO=1`.
**Da fila aprovada em 17/08 fica: corte 10 — a `baseGalactica` (49
linhas) importa o modelo galáctico de 932 linhas para usar TRÊS
números** (`sunRadiusPc`, `diskRadiusPc`, `sunHeightPc`) — o
desperdício que o corte 5 matou voltou pela porta dos fundos;
consertar mantendo UMA fonte para os números (nada de literal
duplicado — o modelo continua o dono deles), prova ab de sempre. Em
seguida os consertos de papel (itens 50 e 51) e só então a poeira
(item 36), medida e com foto. Não tocar no que a Lei ainda demole
(`lodStellar.ts`).

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

**48.** O juiz de a11y cobra um morto: 6 falhas órfãs do M1. O campo
`gradacao` do selo e a porta `?grad=` morreram DE PROPÓSITO no M1
(lápide em `selo.ts`, "a gradação por contexto"), mas `a11y.mjs` ainda
os testa — "clarão undefined", "fator undefined", `?grad=0`. Provado em
17/08 que as falhas antecedem a onda da arquitetura (mesmas 6 com e sem
o corte do hud.css). O conserto é atualizar o JUIZ ao mundo pós-M1 — e
decidir o que ele passa a cobrar da assistência nova do Atlas
(`OCUPACAO_NA_OBSERVACAO`, a dose 0,07), que hoje ninguém vigia.

**50. O mapa do README desenha mortos.** A seção do mapa ainda lista
`hud.css` na raiz (virou 8 fatias em `src/hud/` no corte 2 da Parte 2)
e a pupila em `core/` (enterrada no M2), e não mostra as pastas que a
onda criou (`director/` com os módulos novos, `hud/`). Mapa mentiroso
manda a próxima IA ler arquivo morto — é o conserto mais barato da
fila. Aprovado pelo dono em 17/08; mentira antes de estrutura.

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
