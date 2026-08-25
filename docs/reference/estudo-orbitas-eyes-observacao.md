# As órbitas do NASA Eyes, MEDIDAS — e o mapa do que falta à camada 77

> **Procedência deste arquivo:** pesquisa POR OBSERVAÇÃO DE TELA, feita em 23/08/2026 e
> versionada aqui no mesmo dia. Não é relatório de IA nem survey de blog: cada número saiu
> de leitura de pixel, de nome lido da API viva do motor no navegador, ou está marcado como
> não apurado. As **capturas de tela citadas no texto eram EFÊMERAS** — moravam na pasta
> temporária da sessão e se foram com ela; nunca foram versionadas, e não se reproduzem sem
> voltar ao site. **As MEDIÇÕES sobrevivem**, porque estão escritas aqui em número: o que a
> foto provava está dito em prosa ao lado de cada uma (§12).
>
> **O IRMÃO DESTE ARQUIVO** é [`nasa-eyes-algoritmos.md`](nasa-eyes-algoritmos.md), que leu o
> MESMO app pelo outro lado — o JavaScript público dele — e nomeia as peças de dentro
> (`LabelQuadtree`, `TrailComponent`, `OrbitLineComponent`). Os dois se cobrem: lá está a
> REGRA lida do código, aqui o NÚMERO lido da tela. Onde os dois falam do mesmo assunto, eles
> concordam — e quando um deles for atualizado, o outro tem de ser lido junto.
>
> Estudo de campo, 23/08/2026. O Eyes foi **dirigido**, não lido: `eyes.nasa.gov/apps/solar-system`
> aberto no navegador da sessão, câmera levada a Saturno, à Terra, ao Sol e de volta, com o
> relógio mexido. O que está escrito aqui ou é **número lido do pixel**, ou é **nome lido da
> API do próprio motor**, ou está marcado como não apurado. Nenhum comportamento foi inferido
> de vídeo, de blog ou de memória.
>
> **Este documento PARTE do estudo herdado** (`docs/reference/atlas-estudo-visualizacao-orbitas-ux-espacial.md`)
> e não repete o que ele já diz (MeshLine, origem flutuante, depth log). Em dois pontos ele é
> **corrigido**, e os dois estão marcados com ⚠️ — porque a correção veio de medida, e o
> texto herdado veio de survey.
>
> ⚠️ **RETRATO DE ANTES, no que diz da NOSSA linha (24/08).** Este estudo foi escrito com a
> casa ainda em `LineLoop` + `LineBasicMaterial`, 1 px de dispositivo. O degrau **D1** virou o
> item **83 · L2** e POUSOU em 24/08 (`8be508f`): hoje a casa é `LineSegments2` +
> `LineMaterial` a **1,25 px CSS**. Toda coluna "nós" que disser `LineLoop` ou "1 px" descreve
> o que HAVIA. O que o Eyes faz, medido, continua valendo — e o que ainda nos separa dele
> (cobertura sub-pixel na largura, junta miter, largura que escala com a janela) está em
> `orbitas-eyes-releitura.md`.

---

## 0. Como se mediu — a procedência de cada número

Três instrumentos, nesta ordem de confiança:

1. **Leitura de pixel.** O canvas do Eyes nasce com `preserveDrawingBuffer: false`, então
   `toDataURL` devolve preto. O jeito que funciona é copiar o canvas para um canvas 2D
   **dentro do `requestAnimationFrame`**, depois do desenho do quadro, e ler `getImageData`
   de uma coluna inteira. Cada travessia de linha vira um "run": largura em pixels, pico e
   RGB do pico. É daí que saem todos os números da §1.
2. **A API do motor.** O Eyes expõe `window.Pioneer` — 112 classes. Os nomes dos métodos são
   a especificação de comportamento mais honesta que existe, e estão na §3.
3. **O DOM.** Os rótulos do Eyes **não são WebGL**: são `div`s (§5). As classes de estado
   deles contam a regra de decluttering inteira.

**Sobre as capturas:** o que se capturou foi o **canvas puro**, sem UI e **sem rótulos** (que
são DOM). Isso foi acidente feliz para o estudo: as fotos mostravam as LINHAS sozinhas, que é
o que o item 77 trata. Elas eram efêmeras (viviam na pasta temporária da sessão) e **não
existem mais** — o que elas provavam está escrito em número nas seções seguintes e resumido
no §12.

---

## 1. A anatomia da linha — e a primeira surpresa

### 1.1 ⚠️ A órbita de planeta NÃO tem gradiente. Nenhum.

O estudo herdado dedica a §2.4 inteira ao *trail fading* — "cria um rastro de cometa que
segue o planeta". **O Eyes não faz isso nas órbitas dos planetas.** A elipse é desenhada com
opacidade **constante em toda a volta**.

Isto não é impressão: é o mesmo pico, no mesmo corpo, em colunas de tela diferentes e em
lados opostos da elipse.

| corpo (matiz medido) | RGB do pico | pico | amostras independentes |
|---|---|---|---|
| Mercúrio (violeta) | (113, 78, 129) | **129** | 2 |
| Vênus (âmbar) | (132, 91, 19) | **132** | 2 |
| Terra (azul-ciano) | (0, 115, 153) | **153** | 4 |
| Marte (ferrugem) | (116, 59, 19) | **116** | **6** |
| Júpiter (salmão) | (163, 104, 86) | **163** | 4 |
| Saturno (ouro pálido) | (160, 145, 101) | **160** | 4 |
| Urano (ciano) | (78, 153, 163) | **163** | 2 |
| Netuno (azul-violeta) | (84, 105, 170) | **170** | 2 |

Seis amostras de Marte, em três colunas e nos dois lados do laço: **116, 116, 116, 116, 116,
116**. Não há decaimento, não há cabeça quente, não há cauda fria.

E os picos diferentes entre corpos **não são alfas diferentes**: são o canal mais forte de
matizes diferentes. Lido de outro jeito — **uma opacidade só, oito matizes**. É exatamente a
arquitetura da nossa camada 77 (`BRILHO_DA_LINHA` único, matiz por corpo), o que é uma
confirmação forte de que a escolha da casa estava certa.

**Onde o gradiente mora, então:** numa camada SEPARADA, chamada *Trails* (§2), que é de
sonda e de cometa. A captura `eyes-01` (efêmera, §12) mostrava a diferença crua: as elipses
coloridas uniformes; os arcos brancos das sondas **terminando esmaecidos**.

### 1.2 Largura e anti-aliasing — o número que nos condena

Perfil típico de uma travessia, em pixels de dispositivo (DPR 2):

```
[ 40, 160, 160,  40 ]     → dois pixels de núcleo cheio, dois de borda a 25%
[122, 163,  82 ]          → cobertura 75% / 100% / 50%
```

Os níveis de cobertura caem em **0,25 / 0,50 / 0,75 / 1,00** — a assinatura de **4 níveis de
cobertura por pixel**. A linha do Eyes tem cerca de **2,5 px de dispositivo (≈1,25 px CSS)**
e bordas resolvidas em sub-pixel.

**A nossa TINHA 1 pixel de dispositivo e borda dura** (até 24/08 — item 83 · L2). `THREE.LineBasicMaterial.linewidth` é
ignorado em WebGL — sempre 1 —, e num Retina isso é **meio pixel CSS**. Medido contra medido:
o Eyes desenha uma linha **2,5× mais grossa** que a nossa, e com borda suave. Este é o maior
buraco isolado entre as duas casas, e é puramente de renderização — não de dado.

### 1.3 A cor: paleta desenhada, não fotometria

Mercúrio no Eyes é **violeta**. Vênus é **âmbar**. Nenhum dos dois é a cor do corpo: Mercúrio
é cinza e Vênus é branco-amarelado. Terra (azul) e Marte (ferrugem) batem, e é isso que
disfarça a escolha.

O Eyes usa uma **paleta categórica de legibilidade** — matizes escolhidos para se separarem
uns dos outros. Nós usamos a **fotometria** (`FOTOMETRIA[id].corLinear` normalizada no canal
mais forte). São duas doutrinas, e a nossa é a honesta; mas a dele resolve um problema que a
nossa tem de resolver de outro jeito (§9, degrau D6): dois corpos cinzentos vizinhos ficam
indistinguíveis.

### 1.4 Não é aditivo

Os picos ficam entre 116 e 170 de 255 e **não estouram** em cruzamento nem sobre estrela.
Alfa comum sobre céu preto, com uma opacidade fixa. A nossa é `AdditiveBlending` a 0,32 —
escolha defensável sobre céu medido, mas que faz cruzamento de linhas somar.

---

## 2. A arquitetura, lida no painel *Layers*

O Eyes tem uma gaveta de camadas, e ela é a planta da casa:

**Classes de objeto** — o que existe na cena:
`Planets` ✅ · `Spacecraft` ✅ · `Asteroids` ☐ · `Comets` ☐ · `Dwarf Planets` ☐ · `Constellations` ☐

**Elementos** — como cada coisa se desenha:
`Trails` ✅ · `Orbits` ✅ · `Labels` ✅ · `Icons` ✅ · (`User Interface` ✅)

Três leituras que valem ouro:

1. **`Trails` e `Orbits` são camadas DIFERENTES.** Confirma a §1.1 pela outra ponta: a elipse
   fechada e o rastro que conta o tempo são objetos distintos, com regras distintas. Nós
   temos só a elipse, e chamamos a camada de `noorbitas` — o nome já está certo.
2. **Anãs, asteroides e cometas nascem DESLIGADOS.** O catálogo tem **60 anãs e asteroides**
   e **87 sondas** disponíveis. O Eyes escolheu não mostrá-los por padrão. **Isto valida
   frontalmente a Decisão 2 do item 77** (as oito de `HELIO_SEM_PONTO` fora): a maior
   referência do ramo tomou a mesma decisão, com a mesma razão. A diferença é que ele
   **devolve a escolha ao visitante numa caixinha**, e nós fixamos no código.
3. **`Labels` e `Icons` têm chave própria.** É exatamente a chave que falta ao item 82 —
   hoje as órbitas têm `noorbitas` e os nomes não têm nada.

---

## 3. O motor: **Pioneer** — lido pela própria API

O Eyes roda um motor do JPL chamado **Pioneer**, exposto em `window.Pioneer` (o mesmo nome
aparece na classe CSS dos rótulos: `pioneer-label-div`). Os nomes de método são a
documentação mais confiável que se pode ter sem o código:

**`LineMesh`** — a primitiva de linha:
`setPositions` · `setColors` · `setWidths` · `setDashLength` · `setGlowWidth` · `setScale`

> **Cor POR VÉRTICE, largura POR VÉRTICE, tracejado e GLOW.** Não é `gl.LINES`: é uma malha.
> A nossa `LineLoop` não tinha nenhuma das quatro. Desde 24/08 (item 83 · L2) a casa é
> `LineSegments2`, que também não tem as quatro: ele resolve LARGURA e JUNTA, não cor nem
> largura por vértice — o alfa por vértice segue sendo a receita reservada ao L4 (D1, abaixo).

**`TrailComponent`** — o rastro, e aqui está o modelo inteiro do "tempo na linha":
`setAlphaFade` · `setStartTime`/`setEndTime` · `setRelativeStartTime`/`setRelativeEndTime` ·
`setStartTimeMultiplier`/`setEndTimeMultiplier` · `setRelativeToEntity` ·
`setRelativeToEntityOrientation` · `setAngleCurveThreshold` · `setInitialTimeStep` ·
`setPointsPerFrame` · `resetPoints` · `_popFrontPoint`/`_pushBackPoint` · `_getAutoLength`

> Traduzindo o que esses nomes dizem, junto:
> - o rastro é uma **janela de tempo em volta do agora**, e a janela pode ser **relativa**
>   (ex.: "um período para trás") e **multiplicada** (ex.: escalar com a velocidade do relógio);
> - o esmaecimento é `alphaFade` — **propriedade do rastro, não da órbita**;
> - ele é desenhado **no frame do pai** (`setRelativeToEntity`) — é a nossa lei "a lua gira no
>   pai, não no Sol", com outro nome;
> - a amostragem é **adaptativa por curvatura** (`angleCurveThreshold`), não uniforme;
> - e é construída **com orçamento por quadro** (`pointsPerFrame`), num anel que empurra ponto
>   na frente e tira atrás conforme o tempo anda. É assim que o rastro "segue o corpo".

**`OrbitalElements`** — e aqui vem a validação mais bonita do dia:
`setFromPositionAndVelocity` · `project` · `projectFromMeanAnomaly` ·
`getEccentricAnomalyFromMeanAnomaly` · `getPeriapsis` · `getApoapsis` · `setOrientationFromElements`

> **`setFromPositionAndVelocity` é literalmente a nossa `conicaOsculadora`.** O Pioneer monta a
> órbita a partir do **estado vivo (posição + velocidade)**, exatamente como a Decisão 1 do
> item 77 — que foi tomada por necessidade (a janela 1950–2050 da tabela) e acabou coincidindo
> com a escolha do JPL. O contrato original ("amostrar um período") era o caminho errado, e
> agora há testemunha externa disso.

Existe ainda `OrbitalElementsKeyframe` e `OrbitalElementsController`: os elementos são
**keyframados no tempo** e interpolados — ou seja, a elipse **evolui com a época**, ela não é
uma tabela fixa de elementos médios.

Outras classes que interessam: `CometTailComponent`, `OrbitalParticlesComponent` (cinturões e
anéis), `DivComponent` (o mecanismo dos rótulos), `LabelComponent`, `CameraComponent`.

**Sobre copiar:** nada daqui foi copiado e nada precisa ser — e não haveria de onde. **O
Pioneer é FECHADO** (§13): não existe repositório, pacote nem documentação pública. O que está
acima são **nomes de método** lidos do objeto vivo no navegador, isto é, a descrição de um
comportamento — e comportamento se estuda.

---

## 4. Inteligência de contexto: o que o Eyes faz, e o que ele NÃO faz

Esta era a pergunta central da missão, e a resposta tem duas metades opostas.

### 4.1 O que ele faz bem: as luas

Enquadrando Saturno (`eyes-04`, efêmera, §12), as órbitas das luas aparecem como elipses concêntricas
pálidas. Duas medidas:

- **Todas no matiz do PAI.** RGB ≈ (1 : 0,90 : 0,72) — o tom de Saturno — para todas elas.
  **É a nossa regra**, escrita em `orbitas.ts` §5: *"lua herda o matiz do pai — é assim que o
  olho lê 'estas quatro são de Júpiter' sem um rótulo em cima de cada uma"*. Convergência
  independente.
- **Cada uma com o SEU alfa.** Picos medidos numa só vista: **48, 49, 58, 63, 73, 92, 93, 97,
  107, 127**. Ou seja: as luas **têm** desvanecimento por objeto (por tamanho angular ou
  importância), enquanto os planetas (§1.1) não têm nenhum.

### 4.2 O que ele faz MAL: a câmera dentro da órbita

**Este é o achado que mais importa para nós.**

Na mesma vista de Saturno, **Netuno (170) e Urano (163) atravessam o quadro inteiro como riscos
retos, a alfa CHEIA** — porque a câmera está a 9 UA do Sol, dentro das duas órbitas. Uma
elipse vista de dentro não é uma elipse: é um risco dando a volta no céu. O Eyes desenha
assim mesmo.

Na Terra (`eyes-02`, efêmera, §12) é pior: as órbitas dos planetas externos entram pelas bordas esquerda e
direita como um **feixe de retas quase paralelas**, e por cima delas vem a gaiola branca das
sondas.

**A camada 77 já corta exatamente isto**, e por dois caminhos que o Eyes não tem:

```
if (d <= linha.apoastroPc) return 0;          // câmera DENTRO do laço: corte duro
… smoothstep(raioAngular / atan(tanHalfFov), 1.0, 1.8)   // não cabe no quadro: apaga
```

E o comentário em `orbitas.ts` já dizia a razão certa, antes de eu ter visto o Eyes falhar:
*"quando a órbita não CABE no quadro ela deixa de ser uma órbita e vira um risco atravessando
o céu"*. **Nesta regra nós estamos à frente do NASA Eyes, e há foto dos dois lados.**

### 4.3 Muito perto do corpo

Colado em Saturno e colado no Sol, quase nada de linha sobrevive — mas por **geometria** (não
cabe no quadro, está atrás do globo), não por regra declarada. Não achei no Eyes nenhum corte
explícito de proximidade.

### 4.4 A transição

Ao trocar o foco (`#/saturn`), a câmera **voa** por alguns segundos e as linhas entram e saem
**por desvanecimento contínuo**, não por corte. A gaveta (`Layers`) também liga/desliga com
fade. Não vi nenhum "pisca" duro em nenhuma troca.

---

## 5. Rótulos — a resposta completa ao item 82

Os rótulos do Eyes são **`div`s de DOM** posicionados sobre o canvas (classe `pioneer-label-div`,
via `Pioneer.DivComponent`), **18 px, fonte Metropolis, brancos**. Não são texto em WebGL.

Censo tirado da vista da Terra, num só quadro:

| | |
|---|---|
| rótulos existentes no DOM | **103** |
| **visíveis** | **40** |
| escondidos por `hidden` | **52** |
| escondidos por **`hiddenByLabelQuadtree`** | **11** |
| classes: `spacecraft` 87 · `planet` 8 · `moon` 2 · `lagrange-point` 2 · `selection` 1 | |

São **três mecanismos empilhados**, e o do meio é o que o dono pediu:

1. **`hidden`** — corte duro (fora do quadro, longe demais, classe desligada). Rótulo fora de
   tela não é removido: é **estacionado** em `left: 11150px`.
2. **`hiddenByLabelQuadtree`** — cada rótulo publica sua **caixa em espaço de tela**
   (`LabelComponent.getNormalSpaceBounds`) numa **quadtree**; quem chega e encontra o lugar
   ocupado **some**. É decluttering por colisão, resolvido por prioridade de chegada.
3. **Opacidade contínua** — o rótulo amostrado estava com `opacity: 0.05`. Os nomes não
   ligam e desligam: eles **esmaecem**.

E há `selection` para o corpo focado — exatamente um, sempre.

**A lição para o item 82 é dupla, e a segunda metade é a mais importante:**

- O "sistema mais inteligente" que o dono pediu **existe e tem nome**: filtro por classe +
  esmaecimento por opacidade + **quadtree de colisão em espaço de tela** + um destaque de
  seleção. Nada disso é caro.
- **E mesmo assim o Eyes falha na Terra**: 40 nomes acesos ao mesmo tempo é uma confusão. A
  quadtree resolve *sobreposição*, não resolve *população*. O que falta lá — e o que nós
  devemos fazer — é uma **régua de relevância** que corte por importância antes de a
  geometria ser consultada. O Eyes nunca decide que uma sonda **não interessa**; ele só decide
  que ela **não cabe**.

Nota de contraste: o Eyes **não puxa traço** para salvar rótulo que não cabe. O nosso item 73
PUXAVA traço de até 102 px, e era isso que fazia o "nó de nomes" que o dono viu — o item 82
(N1) o matou em 24/08, e hoje a casa faz o mesmo que o Eyes: um lugar por nome, colidiu e o
menor some.

---

## 6. Tempo

- A data e a taxa entram por URL (`#/sun?time=…&rate=…`) e pelo dial de baixo, de *real rate*
  a minutos/segundo e além. Levei a cena a **2100** e ela desenhou normalmente.
- A elipse é **keyframada em elementos** (`OrbitalElementsKeyframe`), então **muda com a
  época** — mas a mudança é precessão secular, sub-pixel em décadas. **Não é visualmente
  decidível**, e digo isto em vez de fingir que medi.
- Quem carrega o tempo é o **rastro**, não a órbita: janela relativa ao agora, anel de pontos
  que empurra na frente e solta atrás (§3). É por isso que "o rastro segue o corpo".

## 7. Interação com a própria linha

**Nenhuma.** Passei o mouse exatamente sobre a órbita de Marte (posição achada por leitura de
pixel, não a olho) e não houve tooltip, nem realce, nem mudança de cursor. Clicável é o corpo,
o ícone e o rótulo (`clickable` está nos 103 rótulos). **A linha é matéria morta no Eyes** — e
isso é uma vaga aberta para nós.

---

## 8. O que o Eyes faz MAL — a lista honesta

1. **Não corta órbita que não cabe no quadro** (§4.2). Riscos retos a alfa cheia atravessando
   vistas de corpo. É o defeito mais visível do produto.
2. **A gaiola de satélites da Terra** (`eyes-02`): 87 sondas, todas em **branco, mesma
   largura, mesmo brilho**. Sem hierarquia, sem cor, sem desvanecimento por relevância. O
   planeta fica enjaulado.
3. **Rótulos por população** (§5): a quadtree resolve colisão, não excesso.
4. **A linha não responde a nada** (§7).
5. **A órbita do corpo FOCADO não ganha destaque.** Enquadrar Saturno não acende a órbita de
   Saturno nem as das luas dele acima das outras. A cena não sabe o que você veio ver.
6. **Cor que não é dado** (§1.3): Mercúrio violeta, Vênus âmbar. Bonito, legível — e falso.

---

## 9. O placar honesto

⚠️ **Como LER as duas tabelas, para ninguém sair delas com a conclusão
errada.** Elas comparam quesito a quesito, e o número de linhas de cada lado não é um
placar de jogo. O que está medido a nosso favor é **estreito**: dois comportamentos da LINHA
(o corte com a câmera dentro do laço, e o fade angular) e a honestidade da efeméride. **No
conjunto, os nomes e os rastros do Eyes são mais inteligentes e mais bonitos que os nossos** —
e a nossa vista de abertura tem poluição visual real, que é queixa viva do dono. Quem usar
este estudo para dizer "estamos à frente do NASA Eyes" está usando-o errado.

### Onde a camada 77 JÁ é melhor

| | nós | Eyes |
|---|---|---|
| câmera dentro do laço | **corte duro** (`d ≤ apoastro`) | desenha o risco, alfa cheia |
| órbita que não cabe no quadro | **fade angular** 1,0 → 1,8 | não existe |
| rabisco de poucos pixels | **fade** 3 → 16 px | não observado |
| lua sem o pai enquadrado | **não desenha** | desenha |
| linha × ponto do corpo | **identidade algébrica** (vértice 0 **É** `r`, 1e-12) | não verificável de fora |
| sem efeméride viva | **não desenha nada** (honestidade declarada) | sempre desenha |
| procedência na tela | **selo + derivação** da camada | nenhuma |
| cor | **fotometria medida** | paleta inventada |

### Onde ele nos supera hoje

| | Eyes | nós |
|---|---|---|
| corpo da linha | malha ~2,5 px disp., AA sub-pixel, glow, tracejado, cor/largura **por vértice** | ~~`LineLoop` **1 px** de dispositivo, borda dura~~ → **fita de 1,25 px CSS** (item 83 · L2, 24/08); borda ainda DURA e cor única |
| rastro no tempo | camada `Trails` própria, janela relativa, `alphaFade` | **não existe** |
| alfa por lua | 10 alfas distintos numa vista | temos fade angular (parcial) |
| decluttering de nomes | **quadtree** + opacidade + classe | **nada** (e ainda puxamos traço) |
| controle do visitante | 6 classes + 4 elementos em caixinhas | uma chave `noorbitas` |
| acervo | 60 anãs/asteroides, 87 sondas, curados | 9 + 21 luas |

---

## 10. A proposta — degraus INDEPENDENTES, em ordem

Cada degrau se sustenta sozinho e pode ser feito fora de ordem. "Custo" é esforço de
implementação, não risco.

---

**D1 · A linha ganha corpo. FEITO em 24/08** — virou o item **83 · L2** (`8be508f`), a 1,25 px CSS. *Prioridade máxima. Custo: médio-baixo.*
Trocar `LineLoop` + `LineBasicMaterial` por **`LineSegments2` + `LineMaterial`** (o caminho
`Line2` dos exemplos do three, MIT, mantido e vivo em r185 — **`MeshLine` não é aposta
segura**, os repositórios estão parados). Largura em **pixels CSS** (desde r165 o
`onBeforeRender` acerta o `resolution` sozinho, e a largura passa a independer do
`pixelRatio`), mirando o número medido no Eyes: **~1,25 px CSS**.
*O juiz de imagem veria:* as órbitas param de ser fio de teia serrilhado num Retina e passam a
ter a mesma presença física das do Eyes. É a diferença mais visível de todas, e é só desenho.

⚠️ **Correção de uma suposição minha:** eu tinha escrito que D1 traria alfa por vértice "de
graça". **Não traz.** `LineSegments2.setColors()` só aceita **RGB**; o alfa é um *uniform*
global (`three` issue #23680, aberta desde 2022). Alfa por vértice — que é o que D3 precisa —
custa uma receita à parte: atributo instanciado próprio
(`InstancedInterleavedBuffer` → `instanceAlphaStart/End`) + `material.defines.USE_COLOR_ALPHA`
+ `onBeforeCompile` escrevendo `vColor.w`, com `transparent: true`. A alternativa é um
`ShaderMaterial` da casa (~200 linhas, mesmo custo de GPU), cujo preço é reimplementar corte
no *near plane*, juntas, `resolution` e `raycast` — e mantê-los a cada release do three.
**Recomendação: ficar no `Line2` e pagar a receita do atributo.**

*Ganho de brinde:* dá para juntar **dezenas de órbitas num único `LineSegments2`** — 1 draw
call para a camada inteira, contra os 30 de hoje. 256 pontos ≈ 6 KB (12 KB com cor).

⚠️ **ESTE "brinde" FOI MEDIDO E RECUSADO em 24/08 (item 83 · L2).** Concatenar mataria a
origem flutuante (os vértices são relativos ao centro VIVO do pai, que anda todo quadro; a
órbita de Io é 1e-8 pc ao lado de um centro a 5,2 UA, que float32 não resolve) e exigiria
alfa por vértice, que o fade angular e o realce do foco tornam obrigatório — a receita do
⚠️ acima, reservada ao L4. E não havia o que ganhar: medido com `gpu-profile`, a camada
custa **4 draw calls** na vista das galileanas, os MESMOS 4 do `LineLoop` (só as linhas
acesas E dentro do frustum desenham). A camada ficou com **30 objetos**, de propósito.

---

**D2 · O foco manda na cena.** *Prioridade máxima. Custo: baixo.*
Um multiplicador de alfa por linha, ligado ao corpo enquadrado: a órbita do alvo e as das
**luas dele** sobem; as demais recuam. Um número por linha, dentro do `alfaDa` que já existe.
*O juiz veria:* ao enquadrar Júpiter, as galileanas acendem e o resto da cena recua um passo.
**O Eyes NÃO faz isto** (§8.5) — é o degrau mais barato que nos coloca à frente.

---

**D3 · O rastro: a linha passa a contar o tempo.** *Prioridade alta. Custo: alto.*
Camada irmã da 77, com o modelo que o `TrailComponent` descreve: **janela de tempo relativa
ao agora** (ex.: −0,25 período atrás, +0,05 à frente), alfa em rampa da cauda fria à **cabeça
quente exatamente no corpo**, amostragem **adaptativa por curvatura**, e orçamento de pontos
por quadro. Depende de D1 (alfa por vértice).
*O juiz veria:* com o relógio andando, cada planeta puxa um cometa de luz atrás de si e a
cena passa a ter **direção** — hoje ela é um diagrama parado. Vale a pena ler junto a §2:
rastro e órbita são camadas diferentes, com chaves diferentes.
*Como fazer sem pagar caro:* o **OpenSpace** (MIT, §13) resolve isto com **anel de amostras**
onde **só a cabeça se move** — um ponto flutuante reenviado por quadro, e um index buffer do
dobro do tamanho para resolver a volta do anel. O esmaecimento sai de graça no vertex shader
lendo `gl_VertexID`. É a mesma ideia dos `_popFrontPoint`/`_pushBackPoint` do Pioneer, e
dispensa reescrever os 256 vértices a cada quadro.

---

**D4 · Nomes com quadtree** *(item 82). Prioridade alta. Custo: médio.*
**FEITO em 24/08 (N1), na parte que importava:** a **régua de relevância que corta por
importância ANTES da geometria** (a parte que o Eyes não tem, §5) e o **fim do traço de
102 px** — nome que não cabe, some. Medido: a abertura caiu de 22 nomes para 8, e nenhuma
designação de Bayer sobra na tela.
**O QUE NÃO ENTROU:** a *quadtree* propriamente dita — a colisão da casa é o laço linear de
sempre, e com um orçamento de dez nomes na tela ele não custa nada, então a estrutura seria
otimizar o que já é grátis. A **oclusão em 3D** (nome atrás do globo) tampouco: ela é o
degrau **N3** do item 82, e continua aberta.
*O juiz viu:* a abertura do Atlas deixou de ser um nó de nomes.

---

**D5 · Gaveta por classe.** *Prioridade média. Custo: baixo-médio.*
Em vez de uma chave `noorbitas`, chaves por **classe** (planetas / luas / anãs / sondas) e por
**elemento** (órbita / rastro / nome / ícone) — a planta do §2. Isso devolve ao visitante a
Decisão 2 do item 77 em vez de a enterrar no código: **as oito de `HELIO_SEM_PONTO` voltam,
desligadas por padrão, atrás de uma caixinha** — que é literalmente o que o Eyes faz com as 60
anãs dele. A nota do item 77 diz que voltar é uma linha; este degrau é essa linha, com dono.

---

**D6 · Matiz que separa sem mentir.** *Prioridade média. Custo: baixo.*
Manter a fotometria (a honestidade é nossa, §1.3), mas garantir **distância mínima de matiz**
entre linhas vizinhas na tela, empurrando saturação/matiz dentro de um limite declarado — e
declarar o empurrão no selo, como a casa já faz com assistência.
*O juiz veria:* Mercúrio e a Lua param de ser o mesmo cinza, sem que a casa invente um violeta.

---

**D7 · Glow e tracejado.** *Prioridade baixa. Custo: baixo (depois de D1).*
`setGlowWidth` e `setDashLength` existem no Pioneer por uma razão: o glow dá presença sem
engrossar, e o tracejado é vocabulário — dá para dizer "este trecho é previsão" sem uma
legenda. Sai quase de graça junto com D1.

---

**D8 · A linha responde.** *Prioridade baixa. Custo: médio. **Aqui não há o que copiar.***
Passar o mouse na órbita e ela se identificar (nome, periélio/afélio, período); clicar e
enquadrar o corpo. O Eyes deixou essa vaga vazia (§7) — é onde dá para **passar** a
referência em vez de alcançá-la.

---

## 11. Notas de execução que valem para D1 e D3

Quatro armadilhas, três delas já verificadas no fonte do three:

- **`logarithmicDepthBuffer`: está resolvido.** O `LineMaterial` **inclui os chunks de
  logdepth corretamente no caminho WebGL** — as issues abertas são só do caminho WebGPU. Fica
  de pé, porém, o preço geral do log-Z, que é da casa e não da linha: ele escreve
  `gl_FragDepth` (**mata o early-Z**) e o antialias falha em cruzamentos (issue #22017) — o que
  importa aqui porque **`alphaToCoverage` depende de MSAA**. A alternativa moderna é
  `WebGLRenderer.reverseDepthBuffer` (r169+, via `EXT_clip_control`): mais rápido e mais
  preciso. Isso conversa direto com a **Decisão 3 da Onda 6** que o estudo herdado deixou em
  aberto.
- **Origem flutuante: não obriga a reescrever buffer nenhum.** Guardar os vértices
  **relativos ao centro** (o corpo ou o Sol) num `Object3D` local e recalcular por quadro
  **só a MATRIZ**, em double na CPU. É o que a camada 77 já faz por instinto — o laço de uma
  lua é escrito no pai e o `loop.position` é que anda. Par *high/low* estilo Cesium só faria
  falta se a órbita fosse >1e7× a largura da linha, que não é o nosso caso.
- **Nunca `setPositions()` por quadro.** Ele **aloca buffer de GPU novo e recomputa a
  bounding sphere**. O certo é mutar `instanceStart.data.array` e marcar `needsUpdate` no
  `InterleavedBuffer`, com `addUpdateRange`/`clearUpdateRanges` (r159+) e `DynamicDrawUsage`.
  A camada 77 já usava o padrão bom no `LineLoop` (muta `attr.array` + `needsUpdate`), e a
  migração de 24/08 (item 83 · L2) **manteve a disciplina**: o `InstancedInterleavedBuffer`
  nasce à mão no construtor e o quadro só muta o array dele, com `needsUpdate` no buffer (não
  no atributo — os dois atributos são janelas do MESMO array). Há dente que segura a
  IDENTIDADE do buffer e a do array em três saltos de data. E atenção: **`setDrawRange` NÃO corta instâncias** — quem corta é
  `instanceCount` (isso importa para D3, onde o rastro cresce e encolhe).
- **`raycast` antes do primeiro render falha em silêncio**, e o limiar em px vs mundo tem
  issue aberta (#30623) — a anotar para o degrau D8, não para D1.

---

## 12. As fotos — EFÊMERAS, e o que cada uma provava

⚠️ **As três capturas abaixo NÃO EXISTEM MAIS.** Eram o **canvas puro do Eyes** (sem UI, sem
rótulos), 1000 px de largura, salvas na pasta temporária da sessão de 23/08 — que morreu com
ela. Nunca foram versionadas, e não podiam ser: são quadro de um site de terceiro, e este
repositório não guarda pixel alheio. Ficam registradas porque **o texto acima aponta para elas
pelo nome**, e porque a medição que cada uma sustentava está escrita em número nas seções
citadas. Quem quiser refazer a prova reabre `eyes.nasa.gov/apps/solar-system` e repete o §0.

| a captura (efêmera) | o que ela provava — e onde o número mora |
|---|---|
| `eyes-01-sistema-visao-geral` | as oito elipses coloridas, **uniformes** na volta inteira; e os arcos brancos de sonda **esmaecendo nas pontas** — as duas camadas na mesma foto. Números: a tabela de picos do §1.1 (Marte: 116 em seis amostras) e o censo de camadas do §2 |
| `eyes-02-terra-teia-de-satelites` | a gaiola branca de 87 sondas sobre a Terra **mais** o feixe de órbitas externas entrando reto pelas bordas: os dois piores defeitos do Eyes numa imagem. Números: §5 (103 rótulos, 40 visíveis) e §8.1/§8.2 |
| `eyes-04-saturno-luas-e-netuno-atravessando` | as luas em elipses pálidas **no matiz de Saturno, cada uma com seu alfa** — e Netuno/Urano cortando o quadro a alfa cheia. Números: §4.1 (os dez picos, 48…127, e a razão RGB 1 : 0,90 : 0,72) e §4.2 (Netuno 170, Urano 163) |

> Havia na mesma pasta um `NAO-E-EYES-captura-do-nosso-atlas.jpg` que **não era do Eyes** — um
> quadro do nosso próprio dev server, capturado por engano quando outro agente tomou a aba do
> navegador. Some junto; fica a nota, para que ninguém a procure como evidência do Eyes.

---

## 13. Fontes e licenças — o que se pode aprender e o que contamina

### O Pioneer é FECHADO

**Veredito: proprietário, sem código e sem documentação pública.** A busca foi feita e deu
vazio nos três lugares onde estaria:

- `org:nasa-jpl` e `org:NASA-AMMOS` no GitHub: **zero** repositórios `pioneer`.
- npm: `@nasa-jpl/pioneer` → **404**; `pioneer-scripts` → **404**.
- Os bundles do app (1,7 MB + 2,5 MB) vêm **sem source map e sem aviso de licença**; o site é
  `noarchive`; o FAQ oficial não menciona motor, fonte, licença nem API.
- Enquadramento jurídico: software do JPL tem copyright do **Caltech** — "grátis para usar"
  não é código aberto.

Que o nome é real, disso não há dúvida — está no HTML (`<div id="pioneer">`), nas chamadas
(`getPioneerVersion()`, `PioneerMaterial`) e na classe CSS dos rótulos (`pioneer-label-div`).
**Consequência prática: só se observa comportamento e se reimplementa.** Foi o que este estudo
fez, e é o único caminho que existia.

### As fontes abertas, com licença

| projeto | licença | o que vale minerar |
|---|---|---|
| **three.js `Line2`/`LineMaterial`** | **MIT** | O caminho mantido para linha grossa (r185). Quad instanciado por segmento, expandido em clip space; largura em px CSS, tracejado, `alphaToCoverage`, `vertexColors`. **Sem alfa por vértice** (D1). |
| **spacekit.js** | **MIT** | Amostra a elipse com passo fixo em **anomalia excêntrica** — 90 pontos, 360 se e > 0,9. **É a nossa `escreverLaco`**, com outro nome e menos pontos: terceira confirmação independente de que varrer em `E` (e não em anomalia verdadeira) é a escolha certa. Render simples (`THREE.Line`), sem fade. |
| **OpenSpace** | **MIT** | A melhor fonte de **código** para D3: `RenderableTrailOrbit` com **ring buffer** (só a cabeça é reenviada), fade por `gl_VertexID`, linha grossa resolvida no fragment, e matrizes `dmat4` camera-relative em precisão dupla. |
| **THREE.MeshLine** | MIT | **Não usar.** Repositório parado; o `Line2` o substituiu. Fica registrado porque o estudo herdado o recomenda — e essa recomendação **envelheceu**. |
| **Celestia** | **GPL-2.0-or-later** ⚠️ | A melhor **ideia** da lista, e a única que contamina. `adaptiveSample()` mede o erro contra uma **Hermite cúbica** com tolerância de **1 km**; `curveplot.cpp` faz **subdivisão recursiva conforme a distância à câmera** e tem **alfa por vértice** para o fade. |

**A regra de contaminação, dita sem rodeio:** MIT (three, spacekit, OpenSpace) permite copiar
código mantendo o aviso de copyright. **Só a Celestia contamina**: traduzir linha a linha
`curveplot.cpp` obrigaria o projeto inteiro a GPL-2.0+. Algoritmo e ideia não têm copyright —
o caminho seguro é **anotar o algoritmo em prosa** (as constantes são fatos) e implementar a
partir da nota. Em resumo: **OpenSpace como fonte de código, Celestia como fonte de ideia.**

⚠️ **Correção ao estudo herdado, a segunda.** Ele fecha recomendando **MeshLine** como
"solução da indústria" e **SPICE em runtime (WASM) ou Horizons via API** para efemérides. A
primeira envelheceu (o `Line2` a substituiu); a segunda já estava condenada pela decisão de
dados da casa. O que sobrevive dele, e sobrevive bem, é a **§3** (log-Z, origem flutuante) —
que é justamente onde a §11 daqui se apoia.
