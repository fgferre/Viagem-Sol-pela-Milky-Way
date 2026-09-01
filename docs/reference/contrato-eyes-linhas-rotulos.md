# O CONTRATO — linhas de órbita, rótulos e ícones do NASA Eyes

**O que é.** O gabarito único da ONDA DA PARIDADE (item 120, fase F0). Toda
regra que governa como o Eyes desenha, mostra, esconde e prioriza LINHA,
RÓTULO e ÍCONE está aqui, com o **literal** e o **endereço**. Quem
implementar F1–F6 não deve precisar reabrir o bundle.

**Fonte.** `eyes.nasa.gov/apps/solar-system/app.js`, pacote de 2026-08-05,
1 740 345 bytes, cópia local em
`scratchpad/estudos/nasa-eyes-solar-system/src/app.js`; folha em
`…/src/app.css`; sprites em `…/src/assets/default/svg/sprite.svg`.
Trechos reformatados em `…/mineracao/trechos/` (citados pelo nome do
arquivo). Offsets são posições em **caracteres** no `app.js` local, e todos
os deste documento foram conferidos nesta passada.

**Endereço = prova.** Toda regra abaixo tem arquivo de trecho ou offset. Onde
o bundle não cravou, está escrito **SEM PROVA** — não se inventou número.

**Convenções.** "px CSS" = pixel de layout (o shader recebe `viewportSize`
em px CSS, não em px de dispositivo). Nomes de peças do Eyes em `código`.
A leitura do que a CASA tem hoje está no §7, não misturada às regras.

---

## §1 A LINHA

### 1.1 São DUAS peças, não uma — e a classe decide

| | `OrbitLineComponent` | `TrailComponent` |
|---|---|---|
| quem usa | ids do grupo `planets` mais `moon` | todo o resto (naves, cometas, asteroides, luas de fora) |
| forma | laço FECHADO, 720 vértices | fita ABERTA, amostragem adaptativa |
| largura | constante | rampa ao longo do comprimento |
| alfa | constante por linha | rampa ao longo do comprimento |
| ponta | não tem | a cabeça está NO corpo, no instante atual |

**L1.** `setUpTrail` REMOVE o `TrailComponent` e põe `OrbitLineComponent`
quando o id está no conjunto
`Entity.getEntityNamesInGroup("planets").add("moon")`. Não é o mesmo traço com
outra cor: são dois componentes com shaders diferentes.
→ `trechos/m08-app-orbita-hover.js:12` (`_orbitLineEntityNames`), `:88`
(`setUpTrail`), `:132` (`createOrbitLine`).

### 1.2 Pintura — a fita em espaço de tela (vale para os DOIS shaders)

**L2 — cada ponto vira dois vértices, um de cada lado, no plano da TELA.**
Não é tubo 3D. O vértice é projetado, convertido para pixel, deslocado na
perpendicular e reprojetado:

```glsl
vec2 ndc_center   = projected_center.xy / view_center.y;   // convenção deles: Y é profundidade
vec2 pixel_center = (ndc_center.xy + 1.0) / 2.0 * viewportSize;
vec2 l0 = normalize(pixel_center - pixel_prev);
vec2 l1 = normalize(pixel_next  - pixel_center);
ndc_center = (pixel_center + offset) / viewportSize * 2.0 - 1.0;
gl_Position = vec4(ndc_center * view_center.y, projected_center.z, projected_center.w);
```
→ `trechos/m08-shaders.js:33-60` (LineShader), `:251-278` (TrailShader).

**L3 — a largura em pixels e o `resolutionFactor`.**

```glsl
float resolutionFactor = max(1.0, min(viewportSize.x, viewportSize.y) / 800.0);
float offsetScalar = sign(width) * (abs(width) / 2.0 + glowWidth) * resolutionFactor;  // LineShader
float offsetScalar = side      * (width      / 2.0 + glowWidth) * resolutionFactor;    // TrailShader
```
Janela maior que 800 px no lado menor → linha proporcionalmente mais gorda;
nunca mais fina que o desenho. O lado da fita vem do **sinal** do atributo
`width` no `LineMesh` (`+t` num vértice, `−t` no par) e do atributo `side`
(+1/−1) no `TrailComponent`.
→ `trechos/m08-shaders.js:41-42` e `:259-260`; `trechos/m08-LineMesh.js:41`;
`trechos/m08-TrailComponent.js:179` (`…+9]=1` / `…+9]=-1`).

**L4 — a junta (miter), com DOIS clamps diferentes.** Caso geral (nem
`prev` nem `next` coincidem com o centro):

```glsl
// LineShader  (anel fechado)
offset *= normalize(vec2(-l0.y - l1.y, l0.x + l1.x));
offset /= max(0.25, sqrt((1.0 + dot(l0, l1)) / 2.0));

// TrailShader (fita aberta)
offset *= normalize(vec2(-l0.y - l1.y, l0.x + l1.x));
offset /=          sqrt((1.0 + max(0.0, dot(l0, l1))) / 2.0);
```
São clamps **distintos e não intercambiáveis**: o anel limita o
DENOMINADOR a 0,25 (o espinho da dobra fechada não passa de 4× a largura);
o rastro limita o `dot` a 0 (denominador nunca abaixo de `sqrt(0,5)` ≈ 0,707,
teto de ~1,41× a largura). Degenerescências: se `pixel_center == pixel_prev`
**e** `== pixel_next`, `offset = 0`; se só um coincide, usa a perpendicular do
outro.
→ `trechos/m08-shaders.js:44-58` e `:262-276`.

**L5 — o miolo é CHAPADO; a borda é DURA.** O fragmento é literalmente:

```glsl
outColor = fColor;                                   // LineShader
outColor.a *= alphaMultiplier * edgeGlow() * line_dash_func();
```
Não há `fwidth`, não há suavização de borda, não há textura, não há gradiente
ATRAVÉS da largura. `edgeGlow()` devolve `1.0` sempre que `glowWidth == 0.0`,
e o `TrailManager` arma `glowWidth: {default: 0, hover: 0}` — **o ramo do
glow nunca roda neste app**.
→ `trechos/m08-shaders.js:84-96` e `:304-316`; `trechos/m08-app-orbita-hover.js:9-10`.

**L6 — quem suaviza é o MSAA do alvo do composer, e só ele.**

```js
const l = new THREE.WebGLRenderTarget(i.x, i.y, { samples: 4 });
this._threeJsComposer = new EffectComposer(this._threeJsRenderer, l);
```
→ offset **261 634** do bundle (conferido nesta passada). O renderer também
nasce com `antialias:!0` + `setPixelRatio(window.devicePixelRatio)`
(offset **166 604**, `trechos/m08-antialias.js`), mas isso vale só para o
framebuffer default; **a cena inteira desenha no alvo do composer**, logo o
parâmetro que produz o pixel é `samples: 4`.

**Assinatura medida no pixel** (`mergulhos/capturas-08/nasa-03a-orbita-sem-hover.png`,
DPR 2, janela 1280×800, corte perpendicular à órbita da Terra, canal B):
`0, 77, 153, 153, 51, 0`. 77/153 = 0,503 e 51/153 = 0,333 — degraus em
**quartos exatos**, com **dois pixels de platô**. É a assinatura de 4 amostras
sobre borda dura.
→ `mergulhos/08-fita-e-rotulos.md` §1.1.

**L7 — mistura e profundidade.** `properties: {transparent:!0, depthWrite:!1,
side:"double", blending:"additive"}` nos dois shaders. `depthTest` **não é
declarado** → fica no padrão `true` do three: a metade de trás do anel some
atrás do globo, a da frente cruza o disco. Cruzamento de linhas SOMA (é daí
que vem a leitura de "um fio por cima do outro").
→ `trechos/m08-shaders.js:10` (LineShader) e `:221` (TrailShader).

### 1.3 Cor por corpo e os dois alfas

**L8.** Tabela literal do `TrailManager`, com o alfa embutido na cor:

| corpo | RGB (0-255 / fração como está no fonte) | hex | alfa |
|---|---|---|---|
| mercury | 151, 104, 172 | `#9768AC` | 0,75 |
| venus | 176, 121, 25 | `#B07919` | 0,75 |
| earth | 0, 0.6, 0.8 | `#0099CC` | 0,75 |
| mars | 154, 78, 25 | `#9A4E19` | 0,75 |
| jupiter | 218, 139, 114 | `#DA8B72` | 0,75 |
| saturn | 213, 193, 135 | `#D5C187` | 0,75 |
| uranus | 104, 0.8, 218 | `#68CCDA` | 0,75 |
| neptune | 112, 140, 227 | `#708CE3` | 0,75 |
| **default (todo o resto)** | 1, 1, 1 (branco) | `#FFFFFF` | **0,35** |

`this._opacity = {primary: .75, secondary: .35, hover: 1}`. Os oito nomeados
levam `primary`; qualquer outro id cai em `_colors.default`, branco com
`secondary`. **Não há terceiro alfa.**
→ `trechos/m08-app-orbita-hover.js:2-3` e `:13`.

Nota de precisão: o fonte mistura escalas (`151/255` ao lado de `.6`); os
hex acima são a conversão dessa mistura, e é ela que está na tela.

### 1.4 Larguras e o hover

**L9 — números de fábrica.**

```js
this._orbitLinesOpts = {
  lineWidth: { default: 1.2, hover: 2 },
  glowWidth: { default: 0,   hover: 0 },
  visibleInterval: VisibleInterval.DefaultVisibleFar,
};
this._width = { default: [0, 2], hover: [2, 4] };   // [widthMin, widthMax] do rastro
```
→ `trechos/m08-app-orbita-hover.js:4-11`.

**L10 — o hover é INSTANTÂNEO e acontece no MESMO QUADRO.** `onHoverChange`
não tem tween nem duração: escreve `setLineWidth`/`setColor` (e
`setWidths` no rastro) e o quadro seguinte já sai com o número novo. O alfa
vai a `hover: 1` — inclusive para quem estava em 0,35.
→ `trechos/m08-app-orbita-hover.js:37-52`.

**Medido vivo** (mesma execução, par `nasa-03a`/`nasa-03b`, coluna x=1577,
canal B): sem hover `153, 153, 77` (2,5 px de dispositivo, pico 153); com
hover `153, 204, 204, 204, 51` (3,75 px, pico 204). 204/153 = 1,333 = 1,0/0,75
exato.
→ `mergulhos/08-fita-e-rotulos.md` §1.4.

**L11 — QUEM dispara o hover é o RÓTULO, não a linha.** O `mouseenter` /
`mouseleave` estão no `<div>` do rótulo (`LabelManager.setLabelProps`), que
dispara o evento `hoverchange`, e o app registra
`labelManager.registerCallback("hoverchange", trailManager.onHoverChange)`.
**Não existe picking da geometria da linha.** Apontar o NOME acende a LINHA.
→ `trechos/app.js.LabelManager.js:159-160`; offset **1 339 277** do bundle
(`_.registerCallback("hoverchange",b.onHoverChange)`).

### 1.5 O anel do planeta (`OrbitLineComponent`)

**L12 — 720 vértices, 360 amostras de 1° de anomalia VERDADEIRA.** A cada
quadro `setFromPositionAndVelocity(posição, velocidade, t, μ)` recomputa os
elementos osculadores; para `t` de 0 a 359 resolve verdadeira → excêntrica →
média → tempo → projeta, e SUBSTITUI o degrau que contém a anomalia do corpo
agora (`(d<r && r<u) || (u<d && d<r && r<u+2π) → d = r`) — é assim que um
vértice cai exatamente no planeta. As posições são relativas ao corpo
(`o.sub(o, n)`).
→ `trechos/m08-OrbitLineComponent.js:32-34` (720), `:50-70` (o laço).

**L13 — hipérbole (`e ≥ 1`) não fecha o laço:** os dois últimos vértices
copiam o antepenúltimo e recebem alfa 0. `NaN` na anomalia média colapsa
quatro vértices na origem e zera os quatro alfas.
→ `trechos/m08-OrbitLineComponent.js:61-65` e `:70`.

**L14 — `farSideAlphaFade` existe e está DESLIGADO.** A máquina calcula, por
vértice, `m = clamp01(angle(anomalia_do_vértice, anomalia_do_corpo)/π)` e
`cor = _color × lerp(1, _farSideAlphaFade, m)`. O default é
`this._farSideAlphaFade = 1`, e nada no app o muda → o gradiente ao longo do
laço **não aparece na tela do Eyes**. A cor por vértice existe no
`LineMesh.setColors` (RGBA nos floats 9-12).
→ `trechos/m08-OrbitLineComponent.js:3` (`=1`), `:66-69` (a conta),
`trechos/m08-LineMesh.js:20-32`.

**L15 — geometria do `LineMesh`.** 15 floats por vértice
(`position` 0-2, `positionPrev` 3-5, `positionNext` 6-8, `color` 9-12,
`width` 13, `dashOffset` 14), máximo 65 536 vértices por geometria, índices
`6 por 4 vértices` (`4t, 4t+2, 4t+3, 4t, 4t+3, 4t+1`). `setPositions` exige
contagem PAR e usa `wrap` nos vizinhos — é isso que fecha o laço sem costura.
`prepareForRender` escreve `viewportSize` e o `alphaMultiplier` do
`VisibleInterval`.
→ `trechos/m08-LineMesh.js:100-118` e `:64-72`.

**L16 — tracejado.** `dashLength = 1`, `dashGapLength = 0` nos dois
componentes → `line_dash_func()` devolve sempre 1. Órbita e rastro do Eyes
**não são tracejados**.
→ `trechos/m08-LineMesh.js:3`; `trechos/m08-TrailComponent.js:3`.

### 1.6 O rastro (`TrailComponent`) — a fita afunilada

**L17 — largura e alfa correm ao longo do `indexU`.**

```glsl
float indexU = mod(index - indexStart + indexLength, indexLength) / (indexCount - 1.0);
float width  = mix(widthMin, widthMax, indexU);        // vertex
outColor.a  *= alphaMultiplier * edgeGlow() * lineDash() * mix(alphaFade, 1.0, fIndexU);  // fragment
```
`indexU = 0` no ponto mais antigo, `1` na cabeça. Com os defaults
`_widthMin = 0`, `_widthMax = 2`, `_alphaFade = 0`: **a cauda tem largura zero
e alfa zero; a cabeça tem 2 px e alfa cheio**. Literalmente uma fita com fade.
→ `trechos/m08-shaders.js:243-244` e `:316`; `trechos/m08-TrailComponent.js:3`.

**L18 — a CABEÇA está no corpo, no instante atual.**
`_getIntervalForUpdate` põe `max = tempo + endTimeMultiplier × endTime` com
`_endTime = 0` no padrão → a fita termina exatamente no corpo, sem futuro; e
`min = tempo − startTimeMultiplier × (_startTime ?? _getAutoLength(tempo))`. O
intervalo é depois intersectado com `getPositionCoverage()` da entidade — o
rastro nunca sai da efeméride.
→ `trechos/m08-TrailComponent.js:182` e `:3` (`_endTime=0`,
`_startTimeMultiplier=1`, `_endTimeMultiplier=1`, `_relativeStartTime=!0`).

**L19 — `_getAutoLength` é o período orbital vivo.** Com controlador `orb`
cobrindo o instante: `r = μ²/|r×v|² × (−0,5)(1−e²)` e
`T = 2π μ / sqrt(8 |min(1, r³)|)` (o `min(1, …)` trava a energia que explode).
Sem controlador: `T = 2π |r×v| / |v|²`.
→ `trechos/m08-TrailComponent.js:213-227`.

**L20 — o fade está preso ao TEMPO, não ao vértice.** `indexStart`,
`indexCount` e `indexLength` são uniforms de ring-buffer reescritos TODO
QUADRO em `__prepareForRender`. O buffer cresce em potência de 2 com mínimo 8
(`_resize`), e encolhe quando a ocupação cai a ¼. É por isso que o gradiente
escorre pela fita conforme o relógio anda, em vez de ficar colado na
geometria.
→ `trechos/m08-TrailComponent.js:99` e `:191-211`.

**L21 — amostragem por curvatura, amortizada.** `_angleCurveThreshold =
0,05235987755 rad = 3,0°`; passo inicial `Δt₀ = duração × θ / 2π`; até **20**
tentativas por ponto novo; **`_pointsPerFrame = 4`** — no máximo 4 pontos
novos por quadro EM CADA PONTA. Regras da busca:
ângulo entre velocidades consecutivas `> 3°` → passo pela metade;
`< θ/3` (= 1°) **e** passo `< 10 Δt₀` → dobra (ou meio-termo com o teto já
conhecido); distância `< 0,001` → ângulo inválido (`NaN`);
`position.isNaN()` (fora da efeméride) → descarta a ponta e para.
→ `trechos/m08-TrailComponent.js:3` (`.05235987755`, `_pointsPerFrame=4`),
`:114`, `:127-141`, `:152-167`.

**L22 — o pai manda.** Se o pai da entidade muda no tempo, `resetPoints()`;
a malha é posicionada na posição de câmera do pai
(`setPosition(a.getCameraSpacePosition(t))`), e o rastro pode ser relativo a
outra entidade (`setRelativeToEntity`) e à orientação dela.
→ `trechos/m08-TrailComponent.js:97` e `:110`, `:228-241`.

**L23 — a exceção de missão.** Um rastro pode receber
`VisibleInterval.AlwaysVisible` na entrada de uma janela de cobertura e voltar
ao padrão na saída (visto no cruzeiro do Mars 2020).
→ offset **1 121 840** do bundle.

### 1.7 O que o Eyes NÃO faz na linha

**L24 — não há corte quando a câmera entra DENTRO do laço.** A única porta
extra do Eyes é a do §2.4 (`1e3 × d_câmera/d_órbita`), e ela só existe no
`TrailComponent`. O `OrbitLineComponent` tem apenas o `alphaMultiplier` do
`VisibleInterval`, escrito pelo `LineMesh.prepareForRender`.
→ `trechos/m08-LineMesh.js:71-72` contra `trechos/m08-TrailComponent.js:100-102`.
(A casa faz esse corte e é melhor nesse ponto — §7.)

---

## §2 APARIÇÃO — quando linha e nome existem

### 2.1 A régua é TAMANHO APARENTE, nunca distância

**A1 — a conta inteira do `VisibleInterval.getFadeMultiplier`:**

```js
const entra = (r > 0 || this._min > 0) ? clamp01((r/this._min - 1)/this._fadeBlur + 1) : 1;
const sai   = (r > 0 || this._max > 0) ? clamp01((1 - r/this._max)/this._fadeBlur + 1) : 0;
return Math.min(entra, sai);
```
→ `trechos/m08-VisibleInterval.js:56-57`.

**A2 — três réguas possíveis**, escolhidas por `minSpace`/`maxSpace`:
`"pixel-radius"` = `getPixelSpaceExtentsRadius(camera)` (raio em px);
`"normal-radius"` = `getNormalSpaceExtentsRadius(camera)` (raio em NDC);
`"z-distance"` = `|z|` da posição em espaço de câmera girada. O padrão do
construtor é `"pixel-radius"`.
→ `trechos/m08-VisibleInterval.js:5` e `:45-55`.

**A3 — `fadeBlur = 0,5` é uma rampa de meia oitava**, e é o quinto parâmetro
do construtor, com esse default. Com `max = 0,02`: pleno até `r = 0,02`, zero
em `r = 1,5 × max = 0,03`. Nada é booleano; nada pisca.
→ `trechos/m08-VisibleInterval.js:5-6`.

### 2.2 Os presets, com números — e não há mais nenhum para rótulo/linha

**A4 — o censo completo dos `VisibleInterval` do bundle** (varredura de
`new *.VisibleInterval(` no `app.js`; 6 literais, 2 estáticos):

| preset / literal | valores | espaço | quem usa | endereço |
|---|---|---|---|---|
| `AlwaysVisible` | `(0, +∞)` | pixel-radius | `ModelComponent`; rótulo do baricentro de Plutão; rastro em janela de missão | `trechos/m08-VisibleInterval.js:2`; offsets 351 103 / 808 096 / 1 121 840 |
| **`DefaultVisibleFar`** | **`(0, 0.02)`** | **normal-radius** | **`DivComponent`, `LabelComponent`, `TrailComponent`, `OrbitLineComponent`** | `trechos/m08-VisibleInterval.js:3` |
| default do `BaseComponent` | `(0, +∞)` | normal-radius | qualquer componente que não escolha outro | offset 238 324 |
| magnetosfera de Saturno (LOD) | `(4000, +∞)` e `(0, 4000)` | pixel-radius | troca de modelo por tamanho na tela | offsets 718 094 / 718 323 |
| sprite da Via Láctea | `(12e15, +∞)` | z-distance | o cartão da galáxia | offset 795 663 |
| eclíptica da Terra | `(0, 3e6)` | z-distance | anel de referência | offset 1 710 707 |
| toro genérico | `(...visibleDistance)` | (do chamador) | `createTorus`, default `(−∞, +∞)` | offset 1 236 101 |

**Conclusão do censo: para RÓTULO, ÍCONE, ÓRBITA e RASTRO o Eyes usa UM
preset só — `DefaultVisibleFar` — e a única exceção documentada é
`AlwaysVisible` em três casos pontuais.** Não existe uma tabela de intervalos
por classe.

### 2.3 O rótulo CEDE no close — a regra contraintuitiva

**A5.** `DefaultVisibleFar = (0, 0.02, "normal-radius")`, `fadeBlur = 0,5`.
`min = 0` ⇒ nunca some por ser pequeno; `max = 0,02` ⇒ **some quando o corpo
fica GRANDE**, começando a apagar em raio NDC 0,02 (≈1,1°) e sumindo de vez em
0,03. O `DivComponent` já nasce com ele no construtor; o `LabelComponent` e o
`TrailComponent` também.
→ `trechos/m08-DivComponent.js:3`; `trechos/app.js.LabelComponent.js:3`;
`trechos/m08-TrailComponent.js:3`; `trechos/m08-VisibleInterval.js:3`.

**Fotografado:** em `nasa-04-terra-perto.png` a Terra enche a tela e o rótulo
"EARTH" NÃO EXISTE; em `nasa-05-nave-parker-t0.png` a sonda enche a tela e o
nome dela some, mas EARTH e URANUS, pequenos ao fundo, continuam.
→ `mergulhos/08-fita-e-rotulos.md` §1.5.

**A6 — o alvo SEGUIDO não é exceção a A5.** Seguir um corpo faz duas coisas,
e nenhuma delas é mexer no `VisibleInterval`: peso 201 (§3.4) e
`DivComponent.setCanBeOccluded(false)` (§4.5). O nome do alvo some no close
pela mesma régua de todo mundo.
→ offset 1 312 951 (`setOcclusionProps`).

### 2.4 A segunda porta, só no rastro

**A7.**
```js
const o = entidade.getCameraSpacePosition(t).magnitude() / entidade.getPosition().magnitude();
n *= MathUtils.clamp01(1e3 * o);
```
`o` = (distância da câmera ao corpo) ÷ (raio orbital do corpo). O rastro
começa a sumir quando a câmera chega a **0,001 do raio da órbita** (para a
Terra, ~150 mil km) — é o que impede a órbita de virar um risco reto cruzando
o quadro na chegada. **Só o `TrailComponent` tem isso** (ver L24).
→ `trechos/m08-TrailComponent.js:100-102`.

### 2.5 Os fades do rótulo — 250 ms para entrar, 750 ms para sair, em DUAS camadas

**A8 — a camada de fora (o `<div>`):**
```css
.pioneer-label-div { transition: opacity .25s ease-out }
.pioneer-label-div.hidden, .pioneer-label-div.hiddenByLabelQuadtree {
  display: initial; opacity: 0; pointer-events: none;
  transition: opacity .75s ease-out;
}
```
**A9 — a camada de dentro (`.icon` e `.text`), com outros números:**
```css
.icon, .text { opacity: var(--secondaryFadeIn);  transition: opacity .25s, transform .25s ease-in-out }
.text        {                                    transition: opacity .25s ease-out }
.hidden .icon, .hidden .text { opacity: var(--secondaryFadeOut);
                               transition: opacity .75s, transform .75s ease-in-out }
```
Variáveis: `--secondaryFadeIn: 0.35`, `--secondaryFadeOut: 0.05`,
`--primaryFadeIn: 0.75`, `--primaryFadeOut: 0.05`, `--hoverOpacity: 1`.
A opacidade final é o **produto** das duas camadas com constantes diferentes —
é essa curva não-linear que soa "orquestrada". Rápido a aparecer, preguiçoso a
sumir: um nome que perde a vaga por um punhado de quadros e a recupera nem
chega a apagar.
→ `trechos/m08-label-css.txt:2-11` e `:35-44` (a variante `.planet` troca os
dois alfas para `--primaryFadeIn`/`--primaryFadeOut`).

**A10 — duas causas de sumiço, duas classes, MESMA duração.** `hidden` =
tamanho aparente fora do intervalo, oclusão por corpo, ou atrás da câmera
(escrita pelo `DivComponent`). `hiddenByLabelQuadtree` = perdeu a disputa por
espaço (escrita pelo `LabelQuadtree`). Censo vivo da página: mercúrio,
europa_clipper, juice, psyche, ganymede e moon em `hiddenByLabelQuadtree`;
voyager_1/2, pioneer_11, new_horizons, milky_way em `hidden`.
→ `trechos/m08-DivComponent.js:42`; `trechos/app.js.LabelQuadtree.js:97-98`;
`mergulhos/08-fita-e-rotulos.md` §1.6b.

**A11 — rótulo fora da tela NÃO é `display:none`.** Ele vai para
`translate(10 × largura, 10 × altura)` — dez viewports fora. Sem relayout, sem
perder a transição.
→ `trechos/m08-DivComponent.js:47` e `:49-55`.

### 2.6 O hover do rótulo — e este TEM transição

**A12.**
```css
@media (pointer:fine) and (hover:hover) {
  .pioneer-label-div:hover .icon { transform: translate(…) scale(1.2); transform-origin: center center }
  .pioneer-label-div:hover .icon,
  .pioneer-label-div:hover .text { opacity: var(--hoverOpacity) }   /* = 1 */
}
```
O ícone cresce **20% em 250 ms com ease-in-out** e os dois alfas vão a 1.
Medido vivo com `getComputedStyle` e o mouse real:
`terra {icon:"1", iconTr:"matrix(1.2,0,0,1.2,-28,-4)", text:"1"}` contra
`venus {icon:"0.75", iconTr:"matrix(1,0,0,1,-28,-4)", text:"0.75"}`.
→ `trechos/m08-label-css.txt:16-23`, `:27-32` (nave), `:45-52` (planeta);
`mergulhos/08-fita-e-rotulos.md` §1.4.

**A13 — o hover do rótulo é o MESMO evento que engrossa a linha** (L11): um
gesto, dois efeitos, no mesmo quadro (a linha) e em 250 ms (o ícone).

**A14 — números de microinteração da casa deles**, para a família toda:
tooltip 600 ms para entrar e 0 para sair; segurar botão vira repetição depois
de 200 ms, repetindo a 30 ms; long-press de 2 s no toque.
→ `mergulhos/06-ux-polimento.md` §1.9 e §3.8.

---

## §3 PRIORIDADE E COLISÃO

### 3.1 A tabela COMPLETA de pesos por classe

**P1 — literal do `LabelManager._weightMap`, na ordem do fonte:**

```js
this._weightMap = {
  Universe: 100, Galaxy: 100, Star: 100,
  Barycenter: 0, "Landing site": 5,
  Asteroid: 15, Comet: 15,
  Moon: 25, "Dwarf Planet": 28, Spacecraft: 30, Planet: 50,
  Constellation: 10
};
```

| classe | peso |
|---|---|
| Universe / Galaxy / Star | 100 |
| Planet | 50 |
| Spacecraft | 30 |
| Dwarf Planet | 28 |
| Moon | 25 |
| Asteroid / Comet | 15 |
| Constellation | 10 |
| Landing site | 5 |
| Barycenter | 0 |

→ `trechos/app.js.LabelManager.js:5-6`.

**P2 — os DOIS defaults, e eles diferem.** `initLabelWeights` grava
`weight = 1` para categoria fora do mapa; `getDefaultWeight` devolve `0` para
categoria desconhecida quando não há entrada em `_weights`. Nome que começa
com `constellation_` sempre cai em `Constellation` (10), qualquer que seja a
categoria.
→ `trechos/app.js.LabelManager.js:15-24` e `:35-36`.

### 3.2 A disputa: a ordem determinística

**P3 — o comparador literal:**
```js
_isLessWeightsAndZ(t, e) {
  if (t.weight !== e.weight) return t.weight < e.weight;   // 1º peso: menor perde
  if (t.z      !== e.z)      return t.z > e.z;             // 2º empate: MAIS LONGE perde
  return t.divComponent.getEntity().getName()
         .localeCompare(e.divComponent.getEntity().getName()) < 0;  // 3º empate: alfabético
}
```
`z` é `getCameraSpacePosition(camera).magnitude()` — distância à câmera,
reescrita todo quadro no rodízio. No terceiro critério, **quem perde é o nome
que vem ANTES alfabeticamente** (`localeCompare < 0` ⇒ "é menor" ⇒ é o
ocluído). É contraintuitivo e é o que o fonte diz.
→ `trechos/app.js.LabelQuadtree.js:102-106` e `:70`.

**P4 — perdeu, SOME. Não há posição alternativa, não há haste, não há
empurrão.** O efeito é uma classe CSS:
`div.classList.toggle("<hiddenClass>ByLabelQuadtree", perdeu)`.
→ `trechos/app.js.LabelQuadtree.js:97-98`.

### 3.3 A quadtree e o rodízio

**P5 — a estrutura.** `Quadtree(viewport, maxValuesPerNode = 8)`; raiz do
tamanho do viewport; um nó estoura em 4 filhos quando passa de 8 valores, e
**para de subdividir em `depth >= 8`**; um valor só desce para um filho que o
CONTENHA inteiro (`bounds.surrounds`), senão fica no nó atual. Colapsa de
volta quando a soma cai abaixo de `maxValuesPerNode/2` (= 4). A raiz é
reconstruída sozinha quando o viewport muda de tamanho.
→ `trechos/app.js.Quadtree.js:2-7`, `:60-81`, `:82-99`, `:9-13`.

**P6 — DOIS retângulos por nome.** `"<nome>"` = o ponto do objeto, tamanho
`(0,0)`, na posição em pixels; `"<nome>-div"` = a caixa do `<div>`, opcional
(`_divBoundsAdjustmentFunction` pode ajustá-la). **Só retângulos terminados em
`-div` participam da disputa** — o outro está lá para consultas de
interseção.
→ `trechos/app.js.LabelQuadtree.js:67-70` e `:84-85`.

**P7 — o rodízio é 20 por quadro.** `n = Math.min(this._labelNames.length, 20)`,
começando em `_labelNamesIndex % length` e avançando
`_labelNamesIndex = (i + n) % length` no fim. Os mesmos 20 sofrem as duas
passadas do quadro (atualizar caixas/z, depois disputar).
→ `trechos/app.js.LabelQuadtree.js:59-63`, `:71-73`, `:92`.

**P8 — a lista é mantida ORDENADA por peso.** `addEntity` e `setWeight`
chamam `Sort.sortObject(this._labelNames, this._isLessWeights)`. O rodízio
percorre essa ordem, então nomes de peso próximo tendem a ser julgados no
mesmo quadro.
→ `trechos/app.js.LabelQuadtree.js:34` e `:46-49`.

**P9 — quem já está `hidden` sai da disputa.** Se o div já tem a classe
`hidden` (§2.5/§4), o `LabelQuadtree` LIMPA a marca `…ByLabelQuadtree` e
segue — não gasta vaga nem derruba ninguém. E um oponente só derruba se ele
próprio não estiver oculto por nenhuma das duas causas.
→ `trechos/app.js.LabelQuadtree.js:75-77` e `:87`.

**P10 — o retângulo `__focus`.** O `LabelManager.update` insere, todo quadro,
um retângulo chamado `"__focus"` centrado na tela, de lado
`max(largura, altura) × 0,05` (5%). Como não termina em `-div`, **ele não
participa da disputa de rótulos** — a pergunta aberta do
`nasa-eyes-algoritmos.md` fica RESPONDIDA: ele não muda peso.
→ `trechos/app.js.LabelManager.js:12-14`; comparar com
`trechos/app.js.LabelQuadtree.js:84`.

### 3.4 Promoções fora da tabela

**P11 — o alvo SEGUIDO recebe peso `"201"`**; o valor anterior é guardado e
restaurado no `unfollow`. As entidades da ferramenta de distância recebem
`"200"`. São **strings** no fonte, e ficam acima de qualquer classe (o teto da
tabela é 100).
→ offsets 1 312 660 (`setLabelWeight(t, e=!1, i="201")`) e 1 688 723
(`const s = i ?? "200"`).

**P12 — exceções de camada (`addException`).** Nomes no conjunto
`_exceptions` não obedecem a `toggleLabels`/`toggleIcons` — o alvo em foco
pode ficar aceso com a camada desligada.
→ `trechos/app.js.LabelManager.js:70-77`, `:97`, `:117`.

---

## §4 ENCOBRIMENTO

### 4.1 A conta

**O1 — `isPositionOccluded(pos)` na câmera** varre a lista de oclusores e
devolve `true` no primeiro que oclua:
```js
isPositionOccluded(t) {
  for (let e = 0; e < this._occludingEntities.length; e++)
    if (this._occludingEntities[e].isOccludingPosition(this, t)) return !0;
  return !1;
}
```
→ offset **266 023**.

**O2 — `isOccludingPosition(camera, pos)` na entidade oclusora:**
```js
if (!this._canOcclude || !this.isInPositionCoverage()) return !1;
const i = Math.min(this._occlusionRadius, this.getCameraSpacePosition(t).magnitude());
Geometry.getLineSphereIntersectionWithLineStartAtOrigin(n, e, this.getCameraSpacePosition(t), i);
const o = n.min + n.max;
return n.min < n.max && 0 <= o && o < 2;
```
→ offset **179 189**.

Lido em português: a reta parte da CÂMERA (origem) na direção do objeto, e o
parâmetro está normalizado de modo que `1` é o objeto. Ocluiu quando
(a) há interseção real (`min < max`) **e** (b) o PONTO MÉDIO do trecho dentro
da esfera, `(min+max)/2`, cai em `[0, 1)` — isto é, entre a câmera e o
objeto. O raio é `min(occlusionRadius, distância da esfera à câmera)`: **de
dentro do globo, ninguém oclui.**

**O3 — a interseção reta-esfera, literal:**
```js
getLineSphereIntersectionWithLineStartAtOrigin(t, e, i, s) {
  const n = e.dot(e), o = e.dot(i), r = o*o + (s*s - i.dot(i)) * n;
  if (r < 0) { t.min = NaN; t.max = NaN; }
  else { const e = Math.sqrt(r); t.min = (o - e)/n; t.max = (o + e)/n; }
}
```
(`e` = direção/posição do objeto, `i` = centro da esfera, `s` = raio.)
→ offset **49 784**.

### 4.2 Quem é oclusor

**O4 — TODA entidade habilitada é oclusora, por quadro, se passar de um
pixel.** Em `__updateCameraVariables`:
`this._canOcclude && this.getPixelSpaceOcclusionRadius(t) >= 1 && t.__addToOccludingEntities(this)`.
→ offset **188 960**.

**O5 — e a lista é PODADA todo quadro** na câmera: sai quem tiver
`getPixelSpaceOcclusionRadius(camera) < 1`, ou estiver desabilitado, ou tiver
`canOcclude() === false`, ou já não estiver na cena.
→ offset **268 607**.

**O6 — defaults.** `_canOcclude = true` e `_occlusionRadius = 0` no
construtor da entidade (raio 0 ⇒ não oclui até alguém escrever um raio). O
raio vem do catálogo: `radius` escreve `occlusionRadius` e `extentsRadius`
juntos, e `occlusionRadius` pode ser dado à parte.
→ offsets **171 385** e **707 933**.

**O7 — quem se declara não-oclusor.** Corpos de efeito e cascas
(magnetosfera de Saturno, baricentro de Plutão) chamam `setCanOcclude(!1)`.
→ offsets 718 094 e 808 096.

### 4.3 Atrás da câmera

**O8 — o teste é do EIXO Y da câmera** (a convenção deles: Y é a
profundidade):
```js
if (!e) { const n = Vector3.pool.get();
          t.getEntity().getOrientation().getAxis(n, 1);   // eixo 1 = Y
          e = n.dot(i) <= 0; }
```
Um nome atrás de você não fica colado no vidro.
→ `trechos/m08-DivComponent.js:30-33`.

### 4.4 As duas peças de rótulo se comportam DIFERENTE

**O9 — `DivComponent._determineComponentVisibility`** devolve um BOOLEANO
(`escondido`), e testa três coisas em ordem: fade zero → oclusão (se
`_canBeOccluded`) → atrás da câmera.
→ `trechos/m08-DivComponent.js:27-33`.

**O10 — `LabelComponent._determineComponentVisibility`** devolve um
MULTIPLICADOR: `fade` × (`isPositionOccluded ? 0 : 1`), e **não tem o teste de
atrás-da-câmera**. Ele é overlay (`ThreeJsHelper.setOverlay(t, !0)`) — desenha
por cima de tudo — e é por isso que a oclusão precisa zerar o alfa na mão.
→ `trechos/app.js.LabelComponent.js:51-54` e `:66`.

### 4.5 A isenção do alvo seguido

**O11.** Ao seguir uma entidade, o app grava o `canOcclude` anterior e faz
`entidade.getComponent(DivComponent).setCanBeOccluded(false)` — o rótulo do
alvo não é escondido por globo nenhum, nem pelo dele mesmo. Ao desfazer, os
valores voltam.
→ offset **1 312 951** (`setOcclusionProps`); `trechos/m08-DivComponent.js:14-15`.

---

## §5 ÍCONES E TIPOGRAFIA

### 5.1 Dois canais independentes

**T1 — o `<div>` tem exatamente dois filhos**, criados por
`LabelManager.setLabelProps`: `<span class="icon …">` primeiro,
`<span class="text …">` depois. O texto é
`entityInfo.displayName || entityInfo.iauName`.
→ `trechos/app.js.LabelManager.js:145-146`.

**T2 — os toggles atingem filhos diferentes.**
`toggleIconForEntity` põe/tira `hidden` no `firstElementChild`;
`toggleLabelForEntity`, no `lastElementChild`. São as camadas `icons` e
`labels` da gaveta, ligadas por `settings.addCallback("labels", …)` e
`("icons", …)`. **Existe ícone sem texto**, e é o default leve deles.
→ `trechos/app.js.LabelManager.js:89-117`; offset 1 339 277.

### 5.2 A forma exata dos ícones (medida no `sprite.svg`)

Todos os ícones são **traçado, com miolo vazado** — nenhum é preenchido.

**T3 — o ANEL do planeta.** `icon-circle-<nome>`: 20×20 px, círculo externo
r = 10, círculo interno r = 8,5 ⇒ **traço de 1,5 px**, vazado no meio.
A classe é montada como `icon-circle-` + o NOME da entidade
(`"Planet" === category ? nome : ""`).
→ `sprite.svg` `id="icon-circle-earth"` (path `M10 0c-5.514 0-10 4.486-10
10s… M10 1.5c4.703 0 8.5 3.797 8.5 8.5s…`); `app.css`
`icon-circle-earth{background-position:-36px -195px;height:20px;width:20px}`;
`trechos/app.js.LabelManager.js:145`.

**T4 — cores dos anéis de planeta** (`fill` no sprite):

| ícone | fill | cor da órbita (L8) | igual? |
|---|---|---|---|
| earth | `#09C` | `#0099CC` | sim |
| mercury | `#9768AC` | `#9768AC` | sim |
| venus | `#B07919` | `#B07919` | sim |
| mars | `#9A4E19` | `#9A4E19` | sim |
| jupiter | `#DA8B72` | `#DA8B72` | sim |
| **saturn** | **`#E8BF6D`** | **`#D5C187`** | **NÃO** |
| uranus | `#68CCDA` | `#68CCDA` | sim |
| neptune | `#708CE3` | `#708CE3` | sim |
| sun | `#F6F4DF` | — (o Sol não tem órbita) | — |
| white | `#FFF` | branco default | sim |

Ou seja: **o ícone é da cor da órbita do corpo, com uma única exceção
medida** (Saturno). Não se sabe se é intenção ou deriva — **SEM PROVA** de
qual dos dois é o valor "certo".
→ `sprite.svg`, atributos `fill` dos `id="icon-circle-*"`.

**T5 — o anel pequeno.** `icon-circle-white-small`: 16×16, r externo 8, r
interno 6,5 ⇒ traço de 1,5 px, branco. Usado por Moon, Asteroid, Comet,
Dwarf Planet, Barycenter e o Default.
→ `sprite.svg` `id="icon-circle-white-small"`; `app.css` `-32px -163px`.

**T6 — o HEXÁGONO.** `icon-hexagon`: 14×16, ponta em cima
(`M6.928 0 l-6.928 4 v8 l6.928 4 l6.928 -4 v-8 z`), com hexágono interno
(`5.43 / 3.133`) ⇒ parede de ~1,5 px perpendicular, vazado, branco. Usado por
Spacecraft e por "Landing site".
→ `sprite.svg` `id="icon-hexagon"`; `app.css` `.icon-hexagon{background-position:0 -163px;height:16px;width:14px}`.

**T7 — quem NÃO tem ícone.** `Universe`, `Galaxy` e `Star` mapeiam para
`"no-icon"`, e `.icon.no-icon { display: none }`. Estrela de fundo é **texto
puro**.
→ `trechos/app.js.LabelManager.js:4`; `trechos/m08-label-css.txt:13-14`.

**T8 — o mapa completo (`_iconMap`), literal:**
```js
{ Universe:"no-icon", Galaxy:"no-icon", Star:"no-icon",
  Barycenter:"icon-circle-white-small", "Landing site":"icon-hexagon",
  Moon:"icon-circle-white-small", Asteroid:"icon-circle-white-small",
  "Dwarf Planet":"icon-circle-white-small", Comet:"icon-circle-white-small",
  Spacecraft:"icon-hexagon", Planet:"icon-circle-", Default:"icon-circle-white-small" }
```
→ `trechos/app.js.LabelManager.js:4`.

### 5.3 Os DOIS níveis tipográficos — e o eixo NÃO é o tamanho

**T9 — a folha, literal** (`.pioneer-label-div`, `trechos/m08-label-css.txt`):

| | base (lua, nave, asteroide…) | `.planet` | `.sun` |
|---|---|---|---|
| caixa | como veio | `text-transform: uppercase` | `uppercase` |
| peso | herdado (400) | `font-weight: 600` | `600` |
| tracking | normal | `letter-spacing: .3em` | `.3em` |
| alfa em repouso | `--secondaryFadeIn` = **0,35** | `--primaryFadeIn` = **0,75** | **0,75** |
| alfa ao sair | `--secondaryFadeOut` = 0,05 | `--primaryFadeOut` = 0,05 | 0,05 |
| ícone | 16×16 (nave: 14) | 20×20 | 20×20 |
| recuo do texto | `left: 12px` (nave: 14) | `left: 18px` | `left: 20px` |
| deslocamento vertical | `top: -4px` | `top: -6px`, `position: relative` | `top: 8px` |
| transform do ícone | `translate(calc(-50% - 12px), calc(-50% + 4px))` | `…(-50% - 18px), (-50% + 6px)` | herda o de base (−12px) |

**T10 — o TAMANHO é do dispositivo, não da classe.** Correção do que estava
escrito em `mergulhos/08-fita-e-rotulos.md` §1.6d ("16/18 px para planeta,
14 px para secundário"): a folha diz outra coisa.
```css
.pioneer-label-div { font-size: var(--fontSizeSmall) }          /* 14px */
@media only screen and (min-width:1025px) and (min-height:600px) {
  .pioneer-label-div     { font-size: var(--fontSize) }         /* 16px */
  .pioneer-label-div.sun { font-size: var(--fontSizeLarge) }    /* 18px */
}
```
Em desktop **todos os rótulos têm 16 px**, e só o Sol tem 18 px; em telas
pequenas, 14 px (Sol 16). **A hierarquia entre planeta e lua é feita por
CAIXA + PESO + TRACKING + ALFA + TAMANHO DO ÍCONE — nunca por tamanho de
fonte.** Variáveis disponíveis: `--fontSize:16px`, `--fontSizeLarge:18px`,
`--fontSizeSmall:14px`, `--fontSizeXSmall:12px`, `--fontSizeTiny:10px`.
→ `trechos/m08-label-css.txt:2`; `app.css` offsets 89 216 e 92 506.

**T11 — a classe vem do conteúdo.** `getLabelClass: t => "no-select " +
contentManager.getClassName(t)` e depois `_.className += " … clickable"` —
são as classes `planet`, `sun`, `spacecraft` que a folha estiliza.
→ `trechos/app.js.LabelManager.js:43-45` e `:144`.

### 5.4 Posicionamento — colado no pixel

**T12 — alinhamento `(0, 0.5)`:** a caixa cresce **para a direita** do ponto,
centrada na vertical. O ícone fica no astro (transform negativo), o texto é um
sussurro ao lado. **Não há haste, não há traço.**
→ `trechos/m08-DivComponent.js:3` (`new Vector2(0, .5)`).

**T13 — pixel INTEIRO, e o arredondamento depende da paridade da janela:**
```js
n.x = e.size.x % 2 == 0 ? Math.round(n.x) : Math.floor(n.x);
n.y = e.size.y % 2 == 0 ? Math.round(n.y) : Math.floor(n.y);
this._bounds.origin.x = n.x - this._bounds.size.x * this._alignment.x - e.origin.x;
…
this._div.style.translate = `${Math.round(origin.x)}px ${Math.round(origin.y)}px`;
```
→ `trechos/m08-DivComponent.js:47`.

**T14 — a caixa só é RE-MEDIDA quando muda.** `offsetWidth`/`offsetHeight`
(que forçam layout) só são lidos quando o `innerHTML` mudou ou o estado
escondido mudou. É uma regra de custo, e vale copiar.
→ `trechos/m08-DivComponent.js:43`.

### 5.5 Texto DOM vs. textura

**T15 — o rótulo que o visitante clica é DOM** (`DivComponent`): `<div>`
absoluto no viewport, com hinting e AA subpixel do navegador, colado num
inteiro. Ganha resolução de graça em qualquer DPR.
→ `trechos/m08-DivComponent.js:3`.

**T16 — existe TAMBÉM um rótulo 3D** (`LabelComponent`), quad de 4 vértices
com textura de canvas, para quando o nome precisa sentar no ponto na cena.
Fonte `16px Arial` por default (configurável por
`config.fontFamily`/`fontSize`); o canvas é dimensionado em potências de 2
(`ceilPow2`) sobre `medida × devicePixelRatio`; a baseline é
`altura − 0,1875 × tamanho`; pinta branco e o `colorMultiplier` dá a cor. O
shader mantém tamanho constante em pixels:

```glsl
up    *= (position.y * pixelSize.y + pixelOffset.y) / renderSize * distance;
right *= (position.x * pixelSize.x + pixelOffset.x) / renderSize * distance * flipX;
```
com `renderSize = max(largura, altura)` do viewport. Material transparente e
**overlay** (profundidade Always).
→ `trechos/app.js.LabelComponent.js:3-7`, `:60-68`, `:73-83`, `:34-50`.

---

## §6 O QUE NÃO ENTRA, e por quê

Decisões já tomadas nos mergulhos e no arquivo da casa; aqui só os ponteiros,
para ninguém reabrir por engano. **`antialias:true` sozinho no renderer** é
inerte, porque tudo desenha no alvo do composer — o parâmetro é `samples` no
alvo (mergulho 08 §4). **`glowWidth`/`edgeGlow()`** está zerado no Eyes e o
ramo nunca roda; ligá-lo daria um halo que a referência não tem (idem, e o
cabeçalho de `SAIA_DO_AA_PX` já proíbe). **Tracejado** existe nos dois shaders
e não é usado (L16). **`ndc = projected.xy / view.y`** é a convenção de eixo
deles (Y é profundidade) e copiar quebraria a nossa projeção em silêncio.
**720 vértices por órbita** — temos 256 e o fade mata o laço antes de a
subamostragem aparecer. **Recomputar os elementos osculadores todo quadro**
(L12) só serve para cravar o vértice na anomalia do corpo, e há caminho mais
barato. **O salto instantâneo do hover deles** — a nossa `perseguirRealce` com
encosto exponencial é melhor; falta o gatilho, não a máquina. **A paleta
violeta/âmbar e o `app.js`** são lei da casa e nada aqui as revoga: traz-se a
IDEIA, nunca o arquivo nem a cor. **`lat/lon`, `featuredMoons` curado,
Stories/Featured Events, o painel da Cassini e o modo missão** ficam fora
desta onda (mergulhos 06 §4 e 08 §4; `nasa-eyes-algoritmos.md` §L).
**A migalha de hierarquia** é do item 115-F, não desta onda.

---

## §7 MAPA DO CONFRONTO — regra a regra, o que a casa tem hoje

Uma linha por regra. "Casa" é o estado conferido em 31/08 por grep dirigido;
"F" é a fase do item 120 a que a regra pertence.

### §1 A LINHA → F1

| regra | o que a casa tem hoje | onde | fase |
|---|---|---|---|
| L1 duas peças por classe | **só uma**: laço fechado para todos; não há rastro | `src/three/world/orbitas.ts` | F1 (declarar), fita afunilada fora do escopo |
| L2 fita em espaço de tela | **igual em espírito**: `LineSegments2` + `LineMaterial` (item 83) | `orbitas.ts:1344` | — |
| L3 `resolutionFactor` | **NÃO tem**: largura fixa `LARGURA_DA_FITA_PX = 1.25` | `orbitas.ts:542` | F1 |
| L4 junta miter com clamp | **NÃO tem**: `LineSegments2` põe calota redonda em cada segmento (o "colar de contas", L2.5 do item 83) | `orbitas.ts:1344` | F1 |
| L5 miolo chapado, borda dura | **oposto**: saia de `fwidth`, `SAIA_DO_AA_PX = 1`, `miolo = 1.25/2.25` — perfil medido `35,161,179,151,12`, sem platô | `orbitas.ts:567`, `:1280`, `:1490` | F1 |
| L6 `samples: 4` no alvo | **nenhum MSAA em alvo nenhum**: `antialias: false` e `new EffectComposer(renderer)` sem alvo próprio | `src/three/core/engine.ts:419`, `src/three/core/post.ts:664` | F1 |
| L7 aditivo, `depthWrite:false`, `depthTest` ligado | **igual** | `orbitas.ts:1354`, `:1358` | — |
| L8 cor por corpo, alfas 0,75/0,35 | **diferente**: `BRILHO_DA_LINHA = 0.32` para todos, × `realceDoFoco` (1,75 no foco / 0,35 fora) | `orbitas.ts:761`, `:779-780` | F1 |
| L9/L10 hover 1,2→2 px e alfa→1 | **não existe hover de ponteiro**; só realce por FOCO com encosto exponencial (`VELOCIDADE_DO_REALCE = 9`) | `orbitas.ts:789`, `:1872-1880` | F1 |
| L11 o hover nasce no rótulo | **não existe**: nenhum `mouseenter` em rótulo | `src/components/LabelCanvas.ts` | F1 |
| L12 720 vértices, 1° verdadeira | **nosso é melhor**: 256 pontos em anomalia EXCÊNTRICA, vértice 0 = o corpo | `orbitas.ts` (`escreverLaco`) | não copiar |
| L13 hipérbole não fecha | **igual em efeito**: devolve `null` e não desenha | `orbitas.ts` | — |
| L14 `farSideAlphaFade` | **não existe** (e no Eyes está desligado) | — | não copiar |
| L16 tracejado | nosso `dashed:true` é o truque de junta, coisa diferente | `orbitas.ts` | — |
| L17-L23 `TrailComponent` | **não existe** nenhuma peça de rastro | — | fora da onda |
| L24 sem corte por câmera dentro | **nosso é melhor**: `if (d <= linha.apoastroPc) return 0` | `orbitas.ts:1904` | manter |

### §2 APARIÇÃO → F2

| regra | o que a casa tem hoje | onde | fase |
|---|---|---|---|
| A1-A3 fade por tamanho aparente | **mesma família**: `smoothstep` em px CSS e em semi-ângulo | `orbitas.ts:1910`, `:1923-1924` | — |
| A4 preset único `DefaultVisibleFar` | a casa tem quatro constantes próprias: `RAIO_MIN_PX 3`, `RAIO_CHEIO_PX 16`, `CABE_NO_QUADRO 1.0`, `FORA_DO_QUADRO 1.8` | `orbitas.ts:737-746` | F2 (conferir equivalência) |
| A5 o rótulo cede no close | **NÃO**: planeta nunca some por tamanho; só a lua colada no pai esmaece (`LUA_ACENDE_EM = 0.012`) | `src/three/director/rotulos.ts:97`, `:327` | **F2** |
| A6 o alvo seguido não é exceção | a casa promove o foco a `prioridade 120` e não tem cessão por tamanho | `src/three/world/labels.ts:139` | F2 |
| A7 porta extra do rastro | não se aplica (sem rastro); a ponta de cima da casa é o semi-ângulo de tangência ao apoastro, e é melhor | `orbitas.ts:1917-1924` | manter |
| A8/A9 fades 250/750 ms em duas camadas | **a camada de fora JÁ EXISTE** (item 115-B): `RAMPA_DE_ENTRADA_S = 0.25`, `RAMPA_DE_SAIDA_S = 0.75`. **Falta a segunda camada** (o produto com o alfa do ícone/texto) | `labels.ts:293-295` | F2 |
| A10 duas causas, duas classes | a casa distingue corte-da-régua de opacidade, mas não separa as durações por causa | `labels.ts` (`cortadoPelaRegua`) | F2 |
| A11 fora da tela sem `display:none` | não se aplica (canvas 2D, não DOM) | `LabelCanvas.ts` | — |
| A12/A13 hover do rótulo, `scale(1.2)` 250 ms | **não existe** | — | F2/F5 |

### §3 PRIORIDADE E COLISÃO → F3

| regra | o que a casa tem hoje | onde | fase |
|---|---|---|---|
| P1 tabela de pesos por classe | tabela PRÓPRIA e com outra escala: `foco 120, sol 90, planeta 10, anao 8, lua 6, estrelaPropria 5, outros 4, estrelaBayer 3` | `labels.ts:138-147` | **F3** |
| P2 defaults 1 e 0 | não há equivalente | — | F3 |
| P3 peso → z → alfabética | a casa ordena por `pesoDoRotulo` e desempata por `distPc` (mais perto ganha) — **os dois primeiros critérios batem**; falta o terceiro | `labels.ts:258-262` | F3 |
| P4 perdeu, some | **JÁ É A LEI** desde o item 82 (um lugar por nome, sem haste) | `labels.ts` | — |
| P5 quadtree profundidade 8, 8 por nó | **não existe**: a casa varre `occupied` linearmente | `LabelCanvas.ts:340` (`occupied.some(...)`) | F3 |
| P6 dois retângulos por nome | não existe | — | F3 |
| P7 rodízio 20/quadro | **não existe**: a casa julga a lista inteira todo quadro | `labels.ts` | F3 |
| P8 lista mantida ordenada | equivalente: `lista.sort` por peso a cada quadro | `labels.ts:259` | — |
| P9 quem já está oculto sai da disputa | **equivalente**: `if (l.opacity < OPACIDADE_MINIMA_DO_ROTULO) continue` | `labels.ts:267` | — |
| P10 `__focus` não pesa | não se aplica | — | — |
| P11 alvo seguido com peso 201 | equivalente: `foco: 120`, acima de tudo | `labels.ts:139` | — |
| P12 exceções de camada | a gaveta tem a camada "Nomes na tela"; sem lista de exceções | `HudDoAtlas.tsx` | F3 |
| **orçamento fixo** | a casa tem `ORCAMENTO_DE_NOMES = 10` — o Eyes **não tem orçamento**, tem colisão + pesos + rodízio | `labels.ts:237` | **F3 revoga (declarado no item 120)** |
| histerese de seleção | `BONUS_DE_HISTERESE = 1.2` — invenção da casa, sem par no Eyes; o análogo deles é a rampa de 750 ms | `labels.ts:161` | F3 (decidir se convive) |

### §4 ENCOBRIMENTO → F4

| regra | o que a casa tem hoje | onde | fase |
|---|---|---|---|
| O1-O3 conta segmento-esfera | **`escondidaPorDisco` é geral e correta** | `labels.ts` | — |
| O4/O5 todo corpo é oclusor, podado por 1 px | **JÁ FOI FEITO** (item 115-B, peça 2): a lista é remontada por quadro com os corpos do quadro; entrada 0 = o Sol, permanente | `rotulos.ts:164`, `:258-292` | conferir no F4 |
| O6 raio de oclusão do catálogo | a casa usa o raio de cena do corpo | `rotulos.ts` | — |
| O7 quem se declara não-oclusor | não há conceito | — | F4 (baixo) |
| O8 atrás da câmera não rotula | **JÁ EXISTE, e por outro caminho**: `projectPoint` devolve `null` quando o NDC `z` sai de `[-1, 1]` — pega o que está atrás E o que passou do plano distante | `labels.ts:374` | conferir no F4 |
| (extra da casa) recorte com margem | a casa descarta rótulo fora de `x ∈ [0,04; 0,96]`, `y ∈ [0,08; 0,9]`; o Eyes usa o retângulo INTEIRO do viewport e joga o resto 10 viewports fora (A11) | `labels.ts:377` contra `trechos/m08-DivComponent.js:47` | F4 (decidir) |
| O10 rótulo 3D sem teste de costas | não se aplica (canvas 2D) | — | — |
| O11 alvo seguido não é ocluído | não há isenção; "nenhum corpo é oclusor de si" já vale | `rotulos.test.ts:586` | F4 |

### §5 ÍCONES E TIPOGRAFIA → F5

| regra | o que a casa tem hoje | onde | fase |
|---|---|---|---|
| T1/T2 canais ícone/texto independentes | **parcial**: existe a entrada SÓ-ÍCONE (item 89) e o `comAnel` (anel + nome), mas não são dois canais desligáveis | `LabelCanvas.ts:332`, `:416`; `rotulos.ts:601`, `:690` | F5 |
| T3 anel do planeta 20 px, traço 1,5 | anel de r = 3,5 px com traço 1,1 px e miolo escuro `rgba(8,10,14,0.55)` — **menor e preenchido** | `LabelCanvas.ts:333`, `:465-477` | **F5** |
| T4 ícone na cor da órbita | **já é a lei**: `label.corDoAnel` vem da cor da órbita; âmbar `rgba(255,211,145,0.72)` como padrão | `LabelCanvas.ts:476` | — |
| T5 anel pequeno 16 px branco | não há segundo tamanho de anel | `LabelCanvas.ts` | F5 |
| T6 hexágono da nave | **não existe** (não desenhamos sonda) | — | fora da onda |
| T7 estrela sem ícone | conferir: hoje o anel é por `icone`/`comAnel`, não por classe | `rotulos.ts:601` | F5 |
| T9 dois níveis por caixa/peso/tracking/alfa | **três níveis, e só por TAMANHO + PESO + COR**: `principal 13px/600`, `secundario 12px/500`, `terciario 11px/400`; sem caixa alta, sem tracking, sem alfa 0,75/0,35 | `LabelCanvas.ts:65-98` | **F5** |
| T10 tamanho é do dispositivo | a casa escala por `k` (dpr/zoom) mas separa classes por tamanho — o oposto do Eyes | `LabelCanvas.ts:356` | F5 |
| T12 alinhamento (0, 0.5), sem haste | **parcial**: o `comAnel` já dispensa a haste, mas o caminho sem anel ainda desenha um risco de 10 px | `LabelCanvas.ts:421-425` | F5 |
| T13 pixel inteiro por paridade da janela | não há arredondamento por paridade | `LabelCanvas.ts` | F5 (baixo) |
| T14 caixa re-medida só quando muda | **equivalente e melhor**: cache de largura por fonte+string (`medir`) | `LabelCanvas.ts:200-205` | — |
| T15 texto DOM | **canvas 2D em DPR** com `shadowBlur 7` — AA em cinza, nunca subpixel | `LabelCanvas.ts:438` | F5 (declarar como diferença aceita ou não) |
| detalhe `classe · distância` no céu | **a casa escreve**, o Eyes não (a ficha carrega isso) | `LabelCanvas.ts:357` | F5 (decisão pendente desde o item 82) |

---

## Contagem

| seção | regras |
|---|---|
| §1 A LINHA | 24 (L1-L24) |
| §2 APARIÇÃO | 14 (A1-A14) |
| §3 PRIORIDADE E COLISÃO | 12 (P1-P12) |
| §4 ENCOBRIMENTO | 11 (O1-O11) |
| §5 ÍCONES E TIPOGRAFIA | 16 (T1-T16) |
| **total** | **77** |

§6 é ponteiro (13 recusas com endereço), §7 é o confronto (58 linhas de
mapa, cobrindo todas as regras que têm par na casa).

**Fatias por fase:** F1 leva 8 linhas do mapa (L3, L4, L5, L6, L8, L9, L10,
L11); F2 leva 6 (A4, A5, A6, A8, A10, A12); F3 leva 8 (P1, P2, P3, P5, P6,
P7, P12, mais a revogação do orçamento e a decisão sobre a histerese); F4
leva 4 (O4-conferir, O7, O8-conferir, O11, mais a decisão do recorte com
margem); F5 leva 9 (T1, T3, T5, T7, T9, T10, T12, T13, T15, mais a decisão
do detalhe `classe · distância`). O `TrailComponent` inteiro (L17-L23) e o
hexágono (T6) ficam FORA da onda por falta de assunto — não há sonda nem
cometa na casa.

## Onde o bundle não cravou (SEM PROVA)

- Qual é o valor "certo" do amarelo de Saturno — ícone `#E8BF6D` contra
  órbita `#D5C187` (T4). Só se sabe que diferem.
- Se algum ponto do runtime liga `farSideAlphaFade ≠ 1` (L14): a varredura
  não achou nenhum.
- O teto do anel de pontos do rastro (`_resize` cresce em potência de 2 sem
  limite superior visível).
- Buracos no meio da efeméride: só se viu "NaN → para a ponta" (L21).
- Cometas: as provas de linha foram de planeta e de missão.
- Se o rastro padrão alguma vez pinta o futuro (o fim de fábrica é `agora`;
  missão tem fim absoluto).
