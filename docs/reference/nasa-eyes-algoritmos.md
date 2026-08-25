# NASA Eyes — algoritmos de nomes e trajetórias

O que o Eyes realmente faz, lido no JavaScript público
(`https://eyes.nasa.gov/apps/solar-system/app.js`, pacote de 2026-08-05,
1,7 MiB). Não é os `atlas-estudo-*.md` (pesquisa de IA sem fonte
primária). Não é cópia do fonte: são as **regras** que o desenho obedece.

Peças da casa citadas pelo nome: `LabelCanvas`, `projectCorpos`,
`pesoDoRotulo`, `esmaecerLuasColadasNoPai`, `orbitas.ts`,
`conicaOsculadora`, `escreverLaco`, `alfaDa`.

Peças do Eyes citadas pelo nome: `LabelManager`, `LabelQuadtree`,
`DivComponent`, `LabelComponent`, `TrailManager`, `TrailComponent`,
`TrailShader`, `OrbitLineComponent`, `LineShader`, `TrajectoryManager`,
`VisibleInterval`.

---

## Como ler

O Eyes tem uma lei só, e ela vale para nome e para linha:

> O desenho é um **instrumento de leitura**, constante em pixels da
> tela, que **some** quando atrapalha o objeto, e que **não se
> empurra** para caber — quem perde a vaga desaparece.

O Atlas FAZIA o contrário nos nomes — o item 73 dava sete lugares e um
traço de até 102 px para salvar o texto — e segue o parente pobre nas
órbitas (`LineLoop` de 1 px, some no zoom). **AS DUAS METADES ESTÃO
PAGAS, e as duas em 24/08:** o item 82 (N1) matou os sete lugares e o
traço, e pôs a régua de relevância na frente da geometria; o item 83
(L2) trocou o `LineLoop` de 1 px pela FITA de 1,25 px CSS
(`LineSegments2` + `LineMaterial`), e o "some no zoom" morreu com ele.
Onde este documento disser `LineLoop` ou "1 px" daqui para baixo, é o
retrato de ANTES. O que este documento diz dos
nomes, daqui para baixo, é o retrato de ANTES — vale como diagnóstico e
como origem da obra, não como descrição do que está na tela.

A ordem abaixo é a do **impacto na tela desta casa**, não a do
organograma do Eyes. Missão (Cassini, Voyager) vem por último: a gente
ainda não desenha sonda.

---

## Fila de impacto

| # | O que é | Onde mora no Eyes | O que o Atlas faz hoje | Quanto muda a tela |
|---|---------|-------------------|------------------------|--------------------|
| 1 | Colidiu, **some** o menor. Sem traço-aranha | `LabelQuadtree` | `LabelCanvas` procura 14 vagas e puxa um fio | A abertura deixa de ser uma teia |
| 2 | Ícone ≠ texto. Default leve: marca sem prosa | `toggleIcons` / `toggleLabels`, dois filhos do `DivComponent` | Todo nome traz CLASSE · DISTÂNCIA | Metade da tinta some de graça |
| 3 | O nome vive no mundo: some atrás do globo e atrás da câmera | `isPositionOccluded`, teste de costas | Canvas 2D por cima de tudo (só estrela-atrás-do-Sol some) | Os nomes passam a parecer 3D |
| 4 | Peso por **classe**, default magro | `weightMap` (Planeta 50, Lua 25, Asteroide 15…) | Hierarquia existe, mas o objetivo é **encaixar 10** | Deixa de nascer com tudo ligado |
| 5 | Perto do corpo, o nome **cede** (o globo é o nome) | `VisibleInterval.DefaultVisibleFar` (some quando o raio passa ~1,1°) | Lua some colada no pai; planeta **nunca** some por tamanho | Close-up limpo |
| 6 | Texto ao lado, ícone no ponto, pixel inteiro | `DivComponent` alignment `(0, 0,5)`, `round`/`floor` | Âncora + deslocamento vertical + detalhe largo | Leveza; “está colado no mundo” |
| 7 | Billboard de tamanho constante em pixels, no ponto 3D | `LabelComponent` shader: offset × distância | Canvas HUD, tamanho de fonte fixo mas fora da cena | Opcional se 1–6 já bastarem |
| 8 | Órbita como **fita em pixels** (1,2 px, junta miter) | `LineShader` / `TrailShader` | ~~`LineLoop` 1 px~~ → **fita de 1,25 px CSS** (item 83, 24/08) | A órbita sobrevive ao zoom |
| 9 | Hover engrossa (1,2→2) e acende o alfa | `TrailManager.onHoverChange` | Clique escolhe; passar por cima não faz nada no traço | Apontar revela, sem rotular tudo |
| 10 | Anel fechado ≠ rastro de tempo | `setUpTrail` troca `TrailComponent` por `OrbitLineComponent` nos planetas | Só anel (`conicaOsculadora`) | Só quando houver sonda |
| 11 | Rastro: janela de **tempo**, afina no passado | `TrailComponent` + `indexU` no shader | Não há | Missão, depois |
| 12 | Amostragem por curvatura (3°, 4 pontos/ponta/quadro) | `_updatePoints` | 256 em anomalia excêntrica — **melhor** para elipse | Só caminho que não é elipse |
| 13 | Modo missão: o resto cala, o relógio obedece | `TrajectoryManager` | O filme já é este espírito | Ferramenta, não default |

---

## Nomes — o que o olho chama de “leve e 3D”

### A. Dois canais, não um rótulo

Cada objeto ganha um `div` absoluto no viewport:

- **primeiro filho = ícone** (círculo do planeta, hexágono da sonda)
- **último filho = texto**

`toggleLabels` esconde só o texto. `toggleIcons` esconde só o ícone.
São a camada `labels` e a camada `icons`, independentes. Dá para ver
um pontinho clicável **sem** palavra em cima.

O Atlas escreve `MERCÚRIO  planeta  ·  227,4 UA` em todo mundo que
cabe. A prosa é o que vira teia. O Eyes, no default, é marca + nome
curto. Distância e classe moram na ficha, não no céu.

### B. Colisão: some, não emigra

`LabelQuadtree` — grade da tela (quadtree, 8 valores por nó, profundidade
máxima 8). Cada nome tem **dois** retângulos: o ponto do objeto (tamanho
zero) e a caixa do `div`.

Por quadro, só **20 nomes** entram na disputa (rodízio). Para cada um:

1. Se já está escondido pela camada, ignora.
2. Quem intersecta a caixa de texto?
3. Se o outro está visível e **ganha** (`_isLessWeightsAndZ`), este some.

Quem ganha, nesta ordem:

1. **peso maior** (classe)
2. empate: **mais perto da câmera** (z menor)
3. empate: nome em ordem alfabética

A CSS `hiddenByLabelQuadtree` é o interruptor. **Não há posição
alternativa. Não há traço.** O item 73 da casa fez o oposto: 7
deslocamentos × 2 lados = 14 vagas, traço até 102 px — e era por isso
que a abertura PARECIA um porco-espinho. Em 24/08 o item 82 (N1) adotou
a política daqui: um lugar por nome, colidiu e o menor some. A abertura
caiu de 22 nomes para 8.

Peso de fábrica:

| classe | peso |
|---|---|
| Universo / Galáxia / Estrela | 100 |
| Planeta | 50 |
| Sonda | 30 |
| Planeta anão | 28 |
| Lua | 25 |
| Asteroide / cometa | 15 |
| Constelação | 10 |
| Sítio de pouso | 5 |
| Baricentro | 0 |

Lua **sempre** cede a planeta. Asteroide cede a lua. Estrela, no
papel, ganha de planeta — por isso no céu fundo as nomeadas podem
ficar, e no sistema o Eyes quase não as acende (outra regra, a da
camada).

A casa já tem `PRIORIDADE_DO_ROTULO` (foco 100, sol 90, planeta 10, lua
6). O número existe. O que falta é usá-lo para **esconder**, não para
**escolher quem puxa o traço primeiro**.

### C. O nome está no mundo, não no HUD

O `DivComponent` (HTML, o que o visitante clica) some quando:

1. o fade de tamanho chega a zero (`VisibleInterval`);
2. **uma esfera oclusora** está no segmento câmera→objeto
   (`isPositionOccluded` → `isOccludingPosition`: interseção
   reta–esfera, raio = `min(occlusionRadius, distância_à_câmera)` —
   de dentro do globo ninguém oclui);
3. o objeto está **atrás da câmera** (`eixoY_da_câmera · posição ≤ 0`).

É isto que faz “parecer 3D”: Mercúrio passando atrás do Sol **perde o
nome**. Um nome atrás de você não fica colado no vidro.

O `LabelComponent` (quad 3D, textura de canvas) faz a mesma oclusão e
ainda senta no ponto do corpo. O shader:

```
offset_mundo = (pixel + pixelOffset) / renderSize × distância_à_câmera
```

Tamanho **constante em pixels**, no ponto 3D, olhando a câmera. Material
com profundidade Always (overlay), mas o alfa vai a zero se a esfera
oclui. Branco no canvas, `colorMultiplier` pinta.

A casa: `LabelCanvas` é um overlay 2D. Só estrela atrás do disco do Sol
é testada (`escondidaPorDisco`). Nome de planeta desenha **por cima**
do globo. Por isso parece adesivo.

### D. Perto, o globo é o nome

`VisibleInterval.DefaultVisibleFar = (0, 0,02, "normal-radius")`,
`fadeBlur = 0,5`.

O nome (e o rastro) **some quando o corpo fica grande** — raio em NDC
passando de ~0,02 rad (~1,1°) e morrendo em ~1,5× isso. Chegou na
Terra, o nome “TERRA” cede: o planeta enche o quadro, o texto é ruído.

A casa já faz o irmão disso nas **órbitas** (`CABE_NO_QUADRO` /
`FORA_DO_QUADRO`, câmera dentro do laço). Nos **nomes**, só a lua
colada no pai esmaece (`LUA_ACENDE_EM = 0,012` da largura). Planeta
nunca some por tamanho. Por isso, no close-up de Saturno, o nome
continua lá, e as estrelas de fundo também.

### E. O desenho leve

- Alinhamento `(0, 0,5)`: a caixa cresce **para a direita** do ponto.
  O ícone está no astro; o texto é um sussurro ao lado. Sem haste.
- Posição em pixel **inteiro** (`round` ou `floor` conforme a largura
  da janela é par ou ímpar). Sem blur subpixel.
- Fonte 16 px Arial no canvas 3D; o HTML usa a folha do app.
- Sem “planeta · 227 UA” no céu.

### F. Camada, hover, exceções

Nomes e ícones desligam na gaveta (`layerLabels`, `layerIcons`).
Exceções (`addException`) não obedecem ao toggle — o alvo em foco
pode ficar.

Hover no Eyes acende a **linha**, não inventa um nome novo: o que já
estava magro fica opaco e grosso. O nome que perdeu a vaga continua
sem vaga. Apontar não é “liga todos”.

---

## Trajetórias — o que o olho chama de “volume”

### G. Fita em pixels, junta que não explode

Não é tubo 3D. Cada ponto vira dois vértices, um de cada lado, no
plano da tela.

1. Projeta atual, anterior, seguinte em **pixels**.
2. `l0`, `l1` = direções no plano.
3. Junta (miter):

   `offset = normalize(perp(l0)+perp(l1)) / sqrt((1 + max(0, l0·l1)) / 2)`

   No anel, o denominador não desce de `0,25` — curva fechada não vira
   espinho.
4. `offsetScalar = lado × (largura/2 + glow) × resolutionFactor`
   `resolutionFactor = max(1, min(lado da janela) / 800)`
   Tela grande → linha mais gorda. Tela pequena → nunca mais fina que
   o desenho.
5. Mistura **aditiva**, sem gravar profundidade, dois lados. RGB = quem
   é; alfa = brilho.

`glowWidth` existe e **nasce 0**. O “volume” é a fita + a soma de luz,
não um halo extra.

Números de fábrica:

| | anel (planeta) | rastro (sonda) |
|---|---|---|
| largura | 1,2 px constante | 0 → 2 px no tempo |
| hover | 2 px | 2 → 4 px |
| glow | 0 | 0 |
| alfa | 0,75 nos nomeados | 0,35 o resto |
| hover | 1,0 | 1,0 |

A casa (**retrato de ANTES do item 83**): `LineLoop` 1 px,
`BRILHO_DA_LINHA = 0,32`, aditivo, testa profundidade (some atrás do
globo — isso o Eyes da fita **não** faz, porque não grava profundidade;
o fade de tamanho faz o serviço). No zoom, o fio de 1 px some. A fita de
1,2 px **não**. **Desde 24/08 a casa também é fita** (1,25 px CSS), e o
que sobrevive deste parágrafo é só o teste de profundidade, que é nosso
e continua.

### H. Dois desenhos, uma pergunta de classe

`TrailManager.setUpTrail`: se o id está no grupo `planets` ou é
`moon`, **remove** o rastro e põe `OrbitLineComponent`. Sonda fica
com `TrailComponent`. Não é o mesmo traço com outra cor.

O anel é o irmão de `conicaOsculadora`: estado vivo → cônica → laço.
Amostragem deles: 1° de anomalia **verdadeira**, 360 amostras, 720
vértices (fita). Cada grau resolve Kepler (verdadeira → excêntrica →
média → tempo → projetar) e **substitui** o degrau se ele contém a
anomalia do corpo agora.

A casa já faz **melhor** a elipse: varrer em anomalia **excêntrica**,
256 pontos, vértice 0 **é** o estado (`escreverLaco`). Não copiar a
amostra de 1°. Copiar a **fita**.

Hipérbole (`e ≥ 1`): eles colapsam os últimos vértices e zeriam o
alfa (não fecham o laço). A casa devolve `null` e não desenha — o
mesmo recado.

Fade “lado oposto ao corpo” (`farSideAlphaFade`): a API existe, o
default é **1** (desligado). Não é o truque que o olho está vendo.

### I. Rastro de sonda: comprimento = tempo

```
t_min = agora − k × duração     (ou instante absoluto)
t_max = agora + k_fim × duração_fim
intervalo ∩ cobertura da efeméride
```

Padrão: `duração_fim = 0` → **sem futuro**. Sem duração nos dados:
período da cônica viva `T = 2π √(a³/μ)` (trava se a energia explode);
senão `2π |r×v| / |v|²`.

Shader do rastro:

```
u = (índice − início) módulo N / (contagem − 1)   // 0 = passado, 1 = agora
largura = mix(widthMin, widthMax, u)
alfa    *= mix(alphaFade, 1, u)
```

Missão liga `alphaFade = 1`: o arco inteiro fica. Se `fim − início > 2 628 000 s`
(~30,4 dias), 18 pontos novos por ponta e por quadro em vez de 4.

Cassini, cores por fase (não pelo shader): dourado `(0,72; 0,58; 0,30)`,
depois castanho, depois ferrugem. O relógio da fase manda; no fim,
**pausa**.

### J. Amostragem por curvatura (só o que não é elipse)

Buffer circular, cresce em potência de 2, mínimo 8. Cada quadro
acrescenta no máximo 4 pontos **em cada ponta**.

Passo inicial: `Δt₀ = duração × θ / 2π`, `θ = 0,05236 rad = 3°`.

Até 20 tentativas por ponto novo:

- ângulo entre velocidades consecutivas **> 3°** → metade do passo
- **< 1°** e passo `< 10 × Δt₀` → dobro do passo
- distância `< 0,001` → ângulo inválido
- posição NaN (fora da efeméride) → descarta a ponta e para

Pai mudou no tempo → `resetPoints()`. Linha relativa ao pai, malha
colada na posição de câmera dele. A casa já faz o análogo nas luas.

Para planeta, **não usar isto**. `escreverLaco` em `E` é a amostra
certa da elipse.

### K. Quando a linha some sozinha

O mesmo `VisibleInterval.DefaultVisibleFar` dos nomes: corpo grande na
tela → rastro/anel cede. Extra no rastro:

`alfa *= saturate(1000 × d_câmera / d_origem)`

Só morde colado no objeto.

### L. Vista de missão

Não é shader. É modo: esconde a camada de sondas (às vezes luas), cria
um rastro por fase com começo/fim absolutos, pula o relógio, trava
clique nos nomes. O filme da casa já é este espírito (`quiet` +
assunto forçado). Não copiar o painel da Cassini.

---

## O que a casa já tem (não refazer)

- Cônica osculadora do estado vivo, vértice 0 = corpo.
- Lua gira no pai, não no Sol.
- Cor do corpo (fotometria normalizada) e brilho de instrumento
  separados; mistura aditiva.
- Fade da elipse por tamanho angular, inclusive câmera dentro do laço.
- Fade da lua colada no pai.
- Hierarquia numérica de nomes (`PRIORIDADE_DO_ROTULO` + histerese 1,2).
- Oclusão de estrela atrás do disco do Sol.
- Filme: assunto tem nome, fundo mudo.

---

## O que o JS minificado não cravou

- Se o rastro padrão alguma vez pinta o futuro (o fim de fábrica é
  agora; missão tem fim absoluto).
- O tamanho máximo do anel de pontos do rastro.
- Buracos na efeméride: só vimos “NaN → para a ponta”.
- Se o `__focus` (quadrado de 5% no centro da tela) **muda peso** ou
  só existe para outro teste — ele é inserido na quadtree, mas a
  disputa de nomes ignora retângulos que não terminam em `-div`.
- Cometas: as provas foram de planeta e missão.
- Quem, no runtime, liga `farSideAlphaFade` ≠ 1.

---

## Tradução para obra, na ordem desta fila

A obra não é “portar o Eyes”. É três cortes, cada um com foto.

**Corte 1 — nomes magros (item 82). PAGO em 24/08, menos um pedaço.**
Trocou-se a política do `LabelCanvas` (colidiu, o menor some; um lugar
por nome, sem haste), pôs-se a régua de relevância ANTES da geometria,
nasceu a camada “Nomes na tela” na gaveta, e o juiz `atlas-smoke` mudou
de promessa no mesmo commit. Abertura: 22 nomes → 8.
**O pedaço que NÃO foi feito, e por decisão:** tirar o detalhe
`classe · distância` do céu. O desenho é UM SÓ para o Atlas e para o
FILME — uma instância de `LabelCanvas` serve os dois —, e apagar o
detalhe apagaria também a legenda do filme, que não está em discussão
neste item. Fica como pedido em aberto, para quando alguém quiser
julgar a legenda do filme junto; enquanto isso, a ficha continua sendo
onde a classe e a distância se leem com folga.

**Corte 2 — nomes no mundo.** Teste de oclusão esfera (o que
`escondidaPorDisco` já faz para estrela/Sol) para **todo** nome, mais
“atrás da câmera some”. Fade quando o globo passa de ~1° na tela. Sem
isso, o corte 1 limpa a abertura e o close-up continua adesivo.

**Corte 3 — órbita como fita. PAGO EM 24/08 (item 83, L2), menos dois
pedaços.** `LineLoop` 1 px virou faixa de **1,25 px CSS** com junta, e a
cônica, o fade angular e o pai da lua não se tocaram, como previsto.
**O que NÃO veio junto:** o `resolutionFactor` na janela (a nossa
largura é fixa; a do Eyes escala com `min(janela)/800`) e o hover de
2 px (é o L5, que segue aberto). Ver `orbitas-eyes-releitura.md` para a
dívida de COBERTURA que sobrou. Este corte é o volume que o
olho pede nas linhas; é independente dos nomes.

Sonda, janela de tempo, amostragem por curvatura, modo missão: depois.
Sem catálogo de missões, não há tela para eles mudarem.
