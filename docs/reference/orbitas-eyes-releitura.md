# Releitura — por que a órbita do Eyes parece um tubo e a nossa não

Para o agente que for mexer em `world/orbitas.ts`. Não copiar JavaScript
da NASA. Não refazer `conicaOsculadora`, `escreverLaco`, o fade angular
(`alfaDa`), o pai da lua, nem o `realce` do foco. A álgebra da elipse
já é a deles (`setFromPositionAndVelocity`). O buraco é **como a fita
é um pixel**.

Irmãos: `estudo-orbitas-eyes-observacao.md` (número da tela) e
`nasa-eyes-algoritmos.md` (peças do JS). Este arquivo é só a órbita de
**planeta** (`OrbitLineComponent` + `LineShader` + `LineMesh`), não o
rastro de sonda.

Lido de novo no `app.js` público (2026-08-05) e no `LineMaterial.js` que
a casa passou a usar em `8be508f`.

---

## O que o olho está comparando

O Eyes parece **3D, volumétrico, quase sombreado**. A nossa, depois da
fita de 1,25 px, ainda parece um **arame**. Não é falta de um pixel a
mais. São três leis de desenho que a troca `LineLoop` → `LineSegments2`
não trouxe.

| | NASA Eyes (planeta) | Casa hoje (`LineSegments2` + `LineMaterial`) |
|---|---|---|
| Primitiva | **uma** faixa contínua, miter em cada vértice (`LineMesh`) | **256** segmentos soltos, cada um com ponta redonda |
| Perfil na largura | cobertura 0,25 / 0,50 / 0,75 / 1,00 em ~2,5 px de dispositivo | retângulo **chapado** (`alpha = opacity`); `discard` duro na borda |
| Junta | miter: `offset /= max(0,25, sqrt((1+l0·l1)/2))` | overlap de dois comprimidos; em aditivo vira **conto de luz** na dobra |
| Largura | 1,2 px CSS × `max(1, min(janela)/800)` | 1,25 px CSS, **fixo** em qualquer janela |
| Cor | paleta **categórica** × 0,75 de alfa | fotometria normalizada × 0,32 aditivo |
| Blending no JS | `additive`, `depthWrite: false` | o mesmo |
| Cor por vértice | sim (`vec4` no `LineMesh`) | não (um `color` no material) |
| Glow | `glowWidth` existe, **nasce 0** nas órbitas | não há |

A medida de tela (`estudo-orbitas-eyes-observacao.md` §1.1) crava: a
elipse do planeta **não** tem gradiente *ao longo* da volta. Seis
amostras de Marte, pico 116 nos dois lados. O “sombreado” que o dono vê
é **atravessando a largura**, não seguindo o planeta.

---

## Algoritmo 1 — faixa contínua com junta, não 256 comprimidos

O `LineMesh` do Eyes guarda, por vértice da fita, lado a lado:

```
positionCurr (xyz)
positionPrev (xyz)
positionNext (xyz)
color        (rgba)     // por vértice
width        (float)    // sinal = lado: +w / −w
dashOffset   (float)    // comprimento acumulado
```

Dois vértices por amostra 3D (lado +1 e lado −1). 360 amostras × 2 =
720. O shader projeta os três pontos para **pixels**, tira as
perpendiculares `l0` e `l1`, e empurra:

```
resolutionFactor = max(1.0, min(viewport.x, viewport.y) / 800.0)
offsetScalar     = sign(width) * (abs(width)/2 + glowWidth) * resolutionFactor

// junta (miter), trava em 0,25 para não virar espinho:
offset = normalize(perp(l0) + perp(l1))
offset /= max(0.25, sqrt((1.0 + dot(l0, l1)) / 2.0))
offset *= offsetScalar
```

`LineSegments2` **não faz isso**. Cada segmento é um quad independente.
O `vUv.y` só existe dentro do segmento; a junta é o overlap das pontas
redondas (`if (len2 > 1.0) discard` no cap). Em aditivo, a dobra acende.

**Releitura:** um `Line2` contínuo (não `LineSegments2`) **ou** um
triangle strip próprio com prev/curr/next, uma geometria só por órbita.
256 pontos de `escreverLaco` servem; a expansão `espelharNaFita` (início
xyz / fim xyz por segmento) é o layout errado para miter.

Não chamar `setPositions()` por quadro — a disciplina do buffer que o
L2 já pagou continua valendo: mutar o `Float32Array` no lugar.

---

## Algoritmo 2 — o “tubo”: perfil na largura

Este é o que falta para parecer volume.

No Eyes, `glowWidth = 0` nas órbitas, então o `edgeGlow()` do fragmento
devolve 1. O perfil macio **não vem de um glow ligado**. Vem da
**cobertura sub-pixel** de uma faixa de ~2,5 px de dispositivo (DPR 2):

```
medido: [ 40, 160, 160, 40 ]     → 25% / 100% / 100% / 25%
        [122, 163, 82]          → 75% / 100% / 50%
níveis: 0,25 / 0,50 / 0,75 / 1,00
```

Isso é a silhueta de um **cilindro visto de lado**: o miolo é opaco, a
borda some. Um retângulo chapado (o `LineMaterial` sem
`USE_ALPHA_TO_COVERAGE`) não produz essa curva.

O `LineMaterial` da casa, com `alphaToCoverage: false` (certo: não há
MSAA):

```
dentro da faixa (abs(vUv.y) ≤ 1):  alpha = opacity     // CHAPADO
cap do segmento  (abs(vUv.y) > 1): discard se len2 > 1 // só a ponta
```

**Releitura, no fragmento, com `u ∈ [−1, +1]` atravessando a fita:**

```
// corte de cilindro (o 3D barato):
float tubo = sqrt(max(0.0, 1.0 - u * u));
alpha *= tubo;

// AA da borda, SEM MSAA (substitui o discard duro):
float w = fwidth(u);
alpha *= 1.0 - smoothstep(1.0 - w, 1.0 + w, abs(u));
```

`sqrt(1−u²)` é a lei. Gaussiana `exp(−2.5 u²)` é o plano B, mais glow
que tubo. Não ligar `alphaToCoverage` — nesta casa não há amostra de
cobertura (`antialias: false`).

Largura:

```
px = 1.25 * max(1.0, min(viewportCss.x, viewportCss.y) / 800.0)
```

Na janela de 1200 o Eyes engorda ~1,5×. A casa está cravada em 1,25 em
qualquer monitor — no cinema largo a linha deles é mais “cheia”. O
`onBeforeRender` do `Line2` já escreve `resolution` em CSS; o fator 800
é que falta.

Hover deles: 1,2 → 2 px e alfa 0,75 → 1,0. Não é obrigatório para o
tubo; é o “aponta e acende”.

---

## Algoritmo 3 — a cor não é luz, é identidade

Não há sombreamento de Phong na linha. Não há fotometria. Há uma
**tabela de tinta**, um alfa só, e o RGB × alfa no céu preto reproduz
os picos medidos.

Paleta do `TrailManager` (planeta = `primary` 0,75; resto =
`secondary` 0,35). RGB 0–1 do JS, e o pico 8-bit medido na tela:

| corpo | RGB do Eyes | pico medido | o que a fotometria faria |
|---|---|---|---|
| Mercúrio | (0.592, 0.408, 0.675) | violeta 129 | cinza do corpo |
| Vênus | (0.690, 0.475, 0.098) | âmbar 132 | branco-amarelo |
| Terra | (0.000, 0.600, 0.800) | ciano 153 | azul pálido |
| Marte | (0.604, 0.306, 0.098) | ferrugem 116 | ferrugem (bate) |
| Júpiter | (0.855, 0.545, 0.447) | salmão 163 | bege |
| Saturno | (0.835, 0.757, 0.529) | ouro 160 | amarelo pálido |
| Urano | (0.408, 0.800, 0.855) | ciano 163 | ciano |
| Netuno | (0.439, 0.549, 0.890) | azul-violeta 170 | azul |

Conferência: Terra `(0, 0.6, 0.8) × 0,75 × 255 = (0, 115, 153)` — é o
pico medido, ao pixel. A lei é:

```
tinta_rgb  = PALETA[id]          // categórica, saturada, um matiz por mundo
alfa       = 0.75                // planetas; 0.35 o resto
pixel      = tinta_rgb * alfa    // sobre céu preto (aditivo ≡ isto)
```

A casa: `matizDe` = `FOTOMETRIA.corLinear / max(canal)`, depois
`BRILHO_DA_LINHA = 0.32` aditivo. Mercúrio e Vênus saem vizinhos e
apagados. Dois cinzas não se separam.

**Releitura, sem trair o selo:**

1. **Não substituir a fotometria como verdade do corpo.** O globo
   continua albedo. A linha é instrumento.
2. Recolher a paleta acima como tinta da **linha só** — ou saturar o
   matiz atual (`mix(cinza, rgb, 1.6)` + recorte) até Mercúrio e Vênus
   se afastarem. O número a cravar no pixel é o pico da tabela, não o
   0,32.
3. Subir o alfa efetivo da linha para a casa **0,55–0,75** no canal
   forte. 0,32 é metade da tinta do Eyes; por isso a nossa “não tem
   corpo” mesmo a 1,25 px.
4. Cor **por vértice** no buffer (o `LineMesh` já tem `vec4`). Uniforme
   na volta (a medida proíbe gradiente ao longo). O slot existe se um
   dia o `farSideAlphaFade` ligar: `g = lerp(1, fade, ângulo(E, E_corpo)/π)`.
   No Eyes o default do fade é 1 (desligado). Não é o sombreado que o
   dono está vendo. Não gastar a primeira obra nisso.

Lua: herda a tinta do **pai** (já é a lei da casa). Não inventar paleta
de lua.

---

## Algoritmo 4 — aditivo sem virar lâmpada

O JS do `LineShader` é `blending: "additive"`, `depthWrite: false`. A
medida de tela diz que cruzamento **não estoura**. Os dois cabem: sobre
céu preto, `rgb * 0,75` já é o pixel; dois laços na mesma coluna só
somam se o overlap for o miolo com o miolo. Com o perfil de tubo
(`sqrt(1−u²)`), a borda é fraca — o overlap das bordas não acende um
star.

A casa aditiva a 0,32 chapado: junta de `LineSegments2` soma dois
retângulos = conto. Por isso a fita nova pode parecer um **colar de
contas** no periastro, não um tubo.

**Releitura:** manter aditivo e `depthTest: true` / `depthWrite: false`
(linha atrás do globo some — isso a casa já faz certo, o Eyes da fita
também não grava profundidade). O tubo no alfa resolve o estouro da
junta. Não passar para `NormalBlending` só para copiar a frase “não é
aditivo” da medida — a frase descrevia o *resultado* no pixel, não a
API.

---

## O que NÃO mexer

- `conicaOsculadora` / `escreverLaco` / 256 em anomalia excêntrica —
  melhor que os 1° de anomalia verdadeira deles.
- Fade por tamanho (`RAIO_MIN_PX`, `CABE_NO_QUADRO`) e câmera dentro do
  laço — o Eyes tem o irmão (`VisibleInterval`), a casa já ganhou.
- Lua no pai.
- `realce` do foco (1,75 / 0,35) — o Eyes usa hover, não dim das outras.
  Já é extra. Não misturar com o tubo.
- `HELIO_SEM_PONTO` fora — o Eyes também nasce sem anãs/asteroides.

---

## Ordem de obra (uma foto por passo)

1. **Perfil de tubo no fragmento** + AA por `fwidth`. É o “sombreado”.
   Prova: uma coluna de pixels com degrau 25/50/75/100, não um tijolo.
2. **Faixa contínua com miter**, fora do `LineSegments2`. Prova: periastro
   sem contas.
3. **Tinta da linha** (paleta ou saturação) e alfa efetivo ~0,75.
   Prova: Mercúrio violeta ≠ Vênus âmbar, Terra ciano, picos na casa
   110–170 como a tabela.
4. **`resolutionFactor`** na janela. Prova: a 1200 px a fita é mais cheia
   que a 800.

Rastro de sonda (janela de tempo, `indexU`, `widthMin→widthMax`) é
outra peça (`TrailComponent`). Não entra neste corte. Sem catálogo de
missões não há tela para ele mudar.
