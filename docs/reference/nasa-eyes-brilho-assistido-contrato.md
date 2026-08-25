# Contrato — brilho assistido = globo do NASA Eyes

**Item 93.** Pedido do dono em 25/08: o modo **brilho assistido** tem
de usar o **mesmo algoritmo** de iluminação de globo do NASA Eyes, não
só “o dia ficou claro”.

---

## ⚠️ O CONTRATO POUSOU INTEIRO EM 25/08

**Pousaram 4.1, 4.2, 4.3 e 4.5** na primeira leva. O Sol vale 1 literal
em `assistida` (e a compensação por corpo do item 91 saiu do código
inteira); a lanterna de leitura de 15 % entra depois do Sol com a soma
saturada em 1; o terminador logístico s = 3 entra nos Lambert e não
entra na Lua nem nos rochosos LS; e as peças nascem em `luzDaVisita.ts` —
número e GLSL no mesmo arquivo, com **um** escritor de uniformes.

**E POUSOU O 4.4, o véu palha de Saturno**, na segunda leva do mesmo
dia. É a `mix(globo, atmosphereColor, a)` deles, na mesma posição: a
superfície acende primeiro e a palha se mistura por cima, no limbo.

- **A dose vem dos dois números do Eyes, e só deles.** `density` 5e−5
  por km vezes `scaleHeight` 200 km é a coluna vertical `ρ₀H` = **0,01**
  — a única leitura das duas grandezas que fecha em unidades.
- **A forma é uma CASCA EQUIVALENTE de `4H/π`**, no lugar dos cinco
  passos de integração deles. A espessura não é gosto: é o valor que faz
  a casca acertar os DOIS extremos da atmosfera exponencial — coluna
  vertical `ρ₀H` no subsolar e a Chapman rasante `√(πR/2H)` = 21,76 no
  limbo. O caminho fica numa raiz quadrada, sem laço e sem `erfc`. A
  opacidade sai **0,00995** no centro do disco, 0,047 a μ = 0,2 e
  **0,1957** na borda: um véu que abraça os 2 % externos do raio.
- **A cor atravessa em LINEAR.** (234, 202, 151)/255 são bytes de TELA;
  esta casa é gerenciada por cor, e o que entra no shader é
  (0,8228; 0,5906; 0,3095). Passar o byte cru pintaria um véu lavado.
- **`sunBrightness` 1, `sunsetIntensity` 0 e `emissivity` 0 não viram
  código, e é assim que se cumprem**: o véu é aceso pelo MESMO `luzSol`
  da superfície (nada acima dele), multiplica a palha por um escalar
  (croma parada) e não tem termo próprio (sem Sol, não acrescenta nada).
- **A lanterna fica FORA**, como no Eyes (`length(lightPositions[i]) > 0`
  pula a luz de câmera, que está na origem). `globoComVeu` recebe
  `luzSol`, não a soma.
- **E o `s` de Saturno cai para 2,8986**, o `sharpness /= 1 + 700·density`
  deles — o vazamento no terminador sobe de 4,98 % para 5,51 % e o
  flanco cede 1 %. Nenhum outro corpo desta casa tem véu, e todos
  continuam em 3 exato.

**COMO O VÉU RESPONDE AO E(d), declarado:** ele é **LINEAR no `luzSol`** —
o termo dele é `cor × luzSol × opacidade`, sem parcela própria —, então em
`?luz=real`, onde esse mesmo termo já traz E(d) = 0,0106 e o Lambert cru,
o véu sai multiplicado por E(d) e por nada mais. A decisão 2 do dono não é
desfeita por uma casca que brilha sozinha — esta não brilha: ela só sabe
repetir a luz que o globo recebeu. **E cuidado com a leitura fácil:** isto
NÃO diz que o véu de `real` seja E(d) vezes o de `assistida` pixel a pixel.
O `luzSol` dos dois modos vem de curvas diferentes — `E(d)·max(N·L,0)`
contra `terminadorSuave(N·L)` —, então a razão entre MODOS anda com o N·L:
E(d) no subsolar, ~0,7·E(d) no flanco e ZERO no terminador. E(d) é o TETO
da razão, não a razão. Medido na mesma vista: 3.757 px de 990.000 (0,38 %), **Δmáx
4,3 de 255**, média do quadro 8,770 → 8,771. Com o véu apagado, `real`
volta ao ruído do instrumento (87 px contra 71 px do par nulo).

**UMA DIVERGÊNCIA DECLARADA, do §4.2: a lanterna RESPEITA as sombras.**
O contrato manda-a entrar sem eclipse e sem sombra de anel, porque no
Eyes a luz de câmera tem raio −1. Ao pé da letra ela não escurece a
umbra: **inverte-a**. Medido no mesmo binário, nos dois caminhos, o
núcleo do eclipse solar de 08/04/2024 sobre Durango, de 255 — item 91:
**2,76** contra 24,4 do deserto vizinho (8,8×); lanterna sem sombra:
**42,21** contra 30,5 (0,7× — a umbra fica MAIS CLARA que o chão);
lanterna com sombra: **2,80** contra 28,1 (10,0×). E o cobre de Danjon
da Lua eclipsada ia de R/B 4,28 para 2,24. O conserto não custa nada à
lanterna: as duas sombras valem 1 no lado noturno por construção, que é
onde ela trabalha. Foto: `capturas/item93-lanterna-e-a-sombra.png`.

**UMA DECISÃO DE ESCOPO, do §4.3: a logística é da `assistida`.** O
uniforme `uTerminadorS` vale 0 em `real`, e 0 significa Lambert cru. Um
terminador inventado no modo que promete *penumbra física verdadeira*
seria a decisão 2 do dono desfeita por dentro. Medido: em `?luz=real` a
vista de Júpiter sai com **zero** pixel diferente.

**Os pinos bit-idênticos de Terra e Lua do item 91 CAÍRAM**, como este
contrato autoriza em letra (§3), e caíram medidos: o ganho de casa era
0,998953 (Terra) e 1,000635 (Lua) e passou a 1 exato — 0,10 % e
0,063 %, menos de um nível de 255.

Este arquivo é a especificação **viva**. O estudo
`nasa-eyes-iluminacao-planetas.md` continua sendo a leitura do fonte
do Eyes; o ⚠️ de 25/08 lá descreve o que o item **91** fez. O 91 pagou
o dia. Este contrato pede a **receita**.

Peças da casa: `ganhoDoGlobo`, `compensacaoDaVisita`, `luzDaVisita.ts`,
`GIGANTE_LAMBERT_FRAG`, `ANEL_FRAG`, `TERRA_FRAG`, `LUA_FRAG`,
`fatorDeFaseMh18`, `?luz=assistida|real`.

Peças do Eyes: `MaterialUtils.setLightSourceUniforms`,
`CameraManager.toggleCameraLight`, `Settings.lightType === "shadow"`,
`MaterialUtilsPhong` (logística do N·L), `RingsComponent`,
`AtmosphereComponent` de Saturno.

---

## 0. O que o dono pediu

> o brilho assistido… quero que o nosso conserte isso para ficar igual
> ao algoritmo usado no nasa eyes

Não é “parecido”. Não é “Saturno palha chega”. É a **mesma receita no
globo**, no modo padrão da casa (`assistida`), que é o par do
**Shadow Lighting** do Eyes (o default deles).

`?luz=real` **não entra nesta obra.** Continua a decisão 2 do item 91:
penumbra física, E(d) no globo. O pontinho no céu **não entra**: MH18
em `planetas.ts` fica.

---

## 1. O algoritmo do Eyes no globo (Shadow, o default)

Lido em `app.js` (2026-08-24). Não chutar.

### 1.1 Luzes

O Sol é um `LightSourceComponent` branco `(1,1,1)`.
`setLightSourceUniforms` multiplica a cor por **`1` literal**. Não há
1/d², não há `absoluteMagnitude` (o 4,83 do Sol está escrito e é
**ignorado** na malha).

A câmera é outro `LightSourceComponent`. No default **shadow**:

```
toggleCameraLight(true, Color(0.15, 0.15, 0.15))
```

Raio da lanterna = `−1` (tem `CameraComponent`): **não** sofre eclipse
de lua nem de anel.

Ambiente de cena `(0.02, 0.02, 0.02)` — **não copiar** (anti-padrões 3
e 9 da casa; a lanterna já lê a noite).

Teto: 5 luzes. O próprio corpo não se ilumina.

### 1.2 Terminador (Phong do globo)

Por luz, **antes** do `saturate`:

```
lightDir      = normalize(posCam − lightPos)
lightCosAngle = −dot(lightDir, normal)          // pode ser < 0

s = 3.0
#ifdef atmosphere
  s /= 1.0 + 700.0 * atmosphereDensity
#endif

lightCosAngle = 2*(1+exp(−s)) / (1+exp(−s * lightCosAngle)) − 1
diffuse += incoming * saturate(lightCosAngle)
```

Com `s = 3` (Saturno quase não muda: density 5e−5):

| N·L cru | Lambert `max(0,N·L)` | Eyes |
|---|---|---|
| 1,00 | 1,00 | 1,00 |
| 0,50 | 0,50 | 0,72 |
| 0,20 | 0,20 | 0,36 |
| 0,00 | 0,00 | 0,05 |
| < 0 | 0,00 | 0,00 |

Depois de somar as luzes: `diffuse = saturate(diffuse)` — o dia **não
passa de 1**. A lanterna a 15 % clareia a **noite**; no subsolar o
excesso corta e o dia continua sendo a textura.

Direção da lanterna no Eyes: a luz está na câmera, então
`N·L_lanterna ≈ N·V` (quem olha para você recebe o fill).

### 1.3 Sombra e anel

Sombra de luas (`shadowEntities`) e sombra do anel no globo
(`shadowRings`) já têm irmão na casa (`fatorDeEclipse`,
`sombraDoAnel`). Não reescrever.

Anel (`RingsComponent`): o lado do Sol leva um **2,0** no termo de
luz; **sem** 1/d². A casa já tem espalhamento frente/trás próprio —
**melhor física**. Nesta obra o anel só precisa do **mesmo Sol = 1**
que o globo (o item 91 já aproximou isso). Não copiar o 2,0 mágico.

### 1.4 Atmosfera de Saturno

`postCreateFunction` do Saturno no Eyes:

| | valor |
|---|---|
| `scaleHeight` | 200 (km) |
| `density` | 5e−5 |
| `color` | (234, 202, 151)/255 palha |
| `sunBrightness` | 1 (default) |
| `sunsetIntensity` | 0 |
| `emissivity` | 0 |

Mistura no limbo **depois** da superfície. A lanterna **não** entra na
atmosfera (`length(lightPositions[i]) > 0` — a câmera está na origem).
Só o Sol faz o véu.

A casa tem Nishita **só na Terra**. Saturno é Lambert nu.

---

## 2. O que a `assistida` faz hoje (depois do 91)

```
uLuzGanho = ganhoFundido(dUA vivo) × compensacaoDaVisita(corpo)
```

Em `assistida` a compensação é `1/ganhoFundido(semieixo)`, constante.
O produto dá **~1** no meio da órbita, com resíduo `(dRef/d)^(2σ)`
(periélio mais claro que afélio). Mercúrio sai ~0,88 (a visita **fecha**
o diafragma). Saturno ~0,99.

Shader do gigante:

```
ndotl = max(dot(n, uDirSolLocal), 0.0)
direta = albedo * ndotl * uLuzGanho * eclipse * sombraDoAnel
```

Zero lanterna. Zero logística. Zero véu palha. Noite = preto.

O dia de Saturno ficou palha (item 91). A **receita** ainda não é a
do Eyes: ainda há 1/d² no produto, ainda não há a segunda luz, ainda
não há o terminador do Phong deles.

---

## 3. O que copiar, o que recusar

| Peça do Eyes (Shadow) | Na `assistida` | Por quê |
|---|---|---|
| Sol no globo = **1 literal**, sem 1/d² | **SIM** | É o algoritmo. O produto com resíduo **não** é isto. |
| Lanterna na câmera `(0,15; 0,15; 0,15)`, sem eclipse | **SIM** | Default do Eyes. Noite legível. |
| `diffuse = saturate(soma)` | **SIM** | O dia não estoura; a lanterna não clareia o subsolar. |
| Logística s=3 no N·L dos **Lambert** (gigantes, rochosos Lambert, Terra superfície) | **SIM** | Flanco +43 %. |
| Lommel-Seeliger na Lua e nos rochosos LS | **NÃO trocar** | Disco chato é o fato da foto; o Eyes usa Phong até na Lua, e é pior. |
| Ambiente 0,02 no BRDF | **NÃO** | Anti-padrões 3 e 9. A lanterna cobre. |
| Flood branco | **NÃO** | Apaga o terminador. |
| Natural do Eyes (lanterna off, Sol ainda 1) | já é quase o `assistida` **sem** lanterna; o dono pediu a receita **com** lanterna (Shadow) | — |
| `?luz=real` = E(d), sem lanterna | **não mexer** | Decisão 2 do item 91. |
| MH18 no ponto | **não mexer** | — |
| ACES / linear | **não desligar** | Com Sol = 1 o ACES já fotografa. Multiplicar em sRGB é o “look de jogo”; a casa não volta atrás. |
| Auto-exposição pelo quadro | **NÃO** | — |
| Véu palha de Saturno | **SIM** | Está no algoritmo do globo de Saturno no Eyes. Números: §1.4. |
| Anel ×2 mágico | **NÃO** | Sol = 1 no anel; espalhamento da casa fica. |
| Bit-idêntico da Terra/Lua do item 91 | **cai** | Lanterna + logística **movem** Terra. É o preço de copiar o Eyes. Declarar no selo e nas vistas. A Lua **não** ganha logística (fica LS). A Terra ganha logística no Lambert da superfície; as cidades e o Nishita ficam. |

---

## 4. Contrato de implementação

### 4.1 Sol no globo, em `assistida` = 1

`ganhoDoGlobo(d, id, "assistida")` passa a devolver **1** (finito).
Não é “apagou a lei”: a lei vive em `ganhoFundido` e no modo `real`.
Em `assistida`, o consumidor da malha **não** a aplica. O resíduo
`(dRef/d)^0,7` **morre** — era o resto da conta do pontinho no globo.

Mercúrio assistido deixa de ser 0,88 e volta a 1: o regolito não é
mais “domado”. Isso é a receita do Eyes, não um regresso ao estouro
do 91 (o 91 estourava porque o ganho era 1,72 = E^σ **sem** compensar;
agora é 1).

`real`: continua `ganhoFundido(d, "real")` = E(d). Sem lanterna.

### 4.2 Lanterna de leitura, só em `assistida`

Um uniforme `uLanternaLeitura`: `0,15` em assistida, `0` em real.
No shader, **depois** do Sol, **sem** eclipse e **sem** sombra de anel:

```
fill = uLanternaLeitura * saturate(dot(n, dirCam))
```

`dirCam` já existe (`uCamLocal`). Somar ao termo de luz **antes** do
albedo, e saturar a soma em 1:

```
luzSol = saturate(logistica(N·L_sol)) * uLuzGanho * eclipse * sombraAnel
luz    = saturate(luzSol + fill)
direta = albedo * luz
```

A lanterna não clareia o subsolar (já está no teto). Clareia a noite
que olha para a câmera.

Selo: a linha da visita declara a lanterna quando ela está ligada
(“lanterna de leitura 15 %”), no mesmo eixo BRILHO.

### 4.3 Logística s=3

Constante nomeada (`S_DO_TERMINADOR = 3`), um helper GLSL único,
usado em:

- `GIGANTE_LAMBERT_FRAG`
- superfície Lambert dos rochosos (não a LS)
- `TERRA_FRAG` (o `ndotl` da direta; o terminador geométrico das
  cidades/nuvens **não** vira logística — o linstep das cidades fica)

**Não** entra em `LUA_FRAG` nem nos rochosos LS.

Em Saturno, se a atmosfera do §4.4 existir, `s /= 1 + 700 * density`
como o Eyes. Sem atmosfera, `s = 3`.

### 4.4 Véu palha de Saturno — POUSOU

Mistura no limbo com os números do §1.4. Só Saturno. Só o Sol ilumina
o véu (lanterna fora). Segunda na ordem, **depois** do globo acender
com 4.1–4.3.

O que ficou no código, em `luzDaVisita.ts` e em lugar nenhum mais:
`VEU_DE_SATURNO` (os três números do Eyes que viram conta),
`COR_DO_VEU` (a palha decodificada para linear), `densidadeDoVeu`,
`colunaVerticalDoVeu`, `espessuraDoVeu`, `uniformsDoVeu` e o chunk
`GLSL_VEU_DE_SATURNO` com `opacidadeDoVeu` e `globoComVeu`. O
`GIGANTE_LAMBERT_FRAG` só o INCLUI, e os quatro gigantes passam pelo
mesmo fragmento: Júpiter, Urano e Netuno entram com coluna 0 e saem
bit a bit. Ver o ⚠️ no topo para a casca equivalente `4H/π`, a coluna
`ρ₀H` e a resposta do véu ao E(d).

### 4.5 Uma fonte só

A logística, o 0,15 e o “Sol = 1 em assistida” nascem em **um**
módulo (o sítio natural é `luzDaVisita.ts` + um GLSL compartilhado,
não quatro cópias). `ganhoDoGlobo` é o escritor do Sol; a lanterna é
o segundo uniforme, ligado pela mesma política.

---

## 5. Prova — tem de medir o que mudou

Gate bit-idêntico das 18 do filme **não prova** esta obra (e a Terra
**vai** mover). Criar a vista que cobre.

Mínimo:

1. Saturno de perto, lado do Sol, `assistida`: dia palha (não pior
   que o 91). Noite **visível**, não buraco — fill ~15 % de quem
   olha para a câmera.
2. O mesmo em `?luz=real`: noite preta, dia ~1/90 (o 91.2 fica).
3. Flanco (N·L ≈ 0,5) de um gigante em assistida: **mais claro** que
   Lambert puro (a logística). Número: a curva EXECUTADA dá **1,433**
   (**+43 %**) — é dele que sai o "+43 %" escrito em toda a casa. O
   1,44 é a mesma razão lida na tabela ARREDONDADA do §1.2
   (0,72/0,50): uma casa decimal, não outra conta.
4. Pontinho MH18 **bit-idêntico** (`planetas.test.ts`).
5. Lua cheia continua chata (LS). Sem logística.
6. Mercúrio assistido no subsolar: ganho **1**, não 0,88. Foto: não
   estourar branco; o ACES é o ombro.
7. Anel de Saturno, mesma vista do (1): acompanha o globo (Sol = 1),
   não volta a carvão.
8. Selo: assistida declara lanterna; real não declara.
9. **Véu (§4.4): a palha tem de ENTRAR no limbo, e só nele.** A prova
   não pode ser o cinza: a peça que muda a DOSE (o `s`) escurece 1 % o
   disco inteiro e tem cem vezes mais pixels que a que acende a borda.
   Mede-se com o modo `croma` de `scripts/visual/luz-ab.mjs` (a cor do
   que ENTROU, canal a canal) e com o véu ISOLADO — mesmo `s`, véu
   apagado contra véu aceso. Medido: 11.883 px, Δmáx 47,8, luz que
   entrou em R:G:B = 1 : 1,09 : **0,33** contra os 405 px de ruído do
   instrumento. Fotos: `capturas/item93-veu-*.png`.

A prova (1) é a que o dono julga. Lado a lado com o Eyes em Shadow,
mesmo corpo, é o juízo — não um número inventado de “igualdade”.

---

## 6. Recado para o Claude

Lê `docs/PENDENCIAS.md` (item **93**) e este arquivo inteiro. A obra
é tornar `?luz=assistida` a receita **Shadow** do NASA Eyes no globo.

O item **91** pagou o dia (Saturno palha). Não desfazê-lo. Não reabrir
o `real`. Não mexer no ponto.

Três peças que o 91 deixou de fora **de propósito** e que o dono pediu:
Sol = 1 literal (sem resíduo de 1/d²), lanterna 15 %, logística s=3. E a
quarta, o véu palha de Saturno, que veio na segunda leva do mesmo dia.
As quatro estão de pé; o que falta é o OLHO DELE.

Não copiar ambiente 0,02. Não copiar flood. Não desligar ACES. Não
trocar Lommel-Seeliger da Lua. Não chamar “igual” a um produto que
ainda tem `(dRef/d)^0,7`.
