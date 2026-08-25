# Releitura — por que a órbita do Eyes parece um tubo e a nossa não

**VEREDITO 24/08 (depois da contestação):** o sintoma do colar de contas
estava certo. O mecanismo “tubo `sqrt(1−u²)`” e quase toda a receita
estavam errados. O que segue no corpo do arquivo fica como leitura do
JS; **não executar os quatro passos da ordem de obra antiga.** A
correção está nesta caixa. Detalhe e réplica: a mensagem ao Claude
nesta sessão.

- **Sintoma certo.** `LineMaterial` no caminho de pixels (não
  `WORLD_UNITS`) **estende calota** em cada ponta do segmento
  (`offset += ±dir` quando `position.y` sai de `[0,1]`). Em aditivo a
  junta pinta o disco duas vezes. Isso é o colar.
- **Não é tubo.** O `LineShader` do Eyes, com `glowWidth = 0`, devolve
  `edgeGlow() = 1` — faixa **chapada**. O renderer deles nasce com
  `antialias: true` (MSAA). Os quartos 0,25/0,50/0,75/1,00 são
  cobertura de 4 amostras numa borda dura, não um perfil contínuo. O
  pico cheio da paleta no miolo é exatamente o que MSAA de retângulo
  faz; um tubo também teria pico 1 no centro (`sqrt(1−0)=1`) — essa
  frase da contestação é que não se sustenta. A quantização em quartos
  e o `antialias: true` bastam para enterrar o tubo.
- **`Line2` não muda um pixel.** `Line2 extends LineSegments2` e usa o
  mesmo `LineMaterial`. Calotas iguais.
- **Hover no código, não na linha.** `TrailManager.onHoverChange` está
  ligado a `hoverchange` do `LabelManager` (o `div` do nome). Engrossa
  o anel 1,2→2 px. Passar o rato na **elipse vazia** não dispara.
- **0,32 vs 0,75 é erro de unidade.** São uniforms, não pixel. Comparar
  com a tela (116–170 deles) é outra conta — e a nossa fita, depois do
  L2, já pode ser mais forte. Não subir alfa para 0,75 por causa dessa
  frase.
- **Conserto do colar, na peça oficial.** Com `dashed = true` o
  fragmento faz `if (vUv.y < -1.0 || vUv.y > 1.0) discard` — as calotas
  caem. `gapSize = 0` faz
  `mod(d, dashSize+0) > dashSize` nunca verdadeiro (o resto vive em
  `[0, dashSize)`). Sem lacuna. É preciso **existir**
  `instanceDistanceStart/End` (`computeLineDistances()` uma vez; com
  gap 0 a distância não pinta). No caminho de pixels as calotas ainda
  **nascem** no vértice e morrem no fragmento — visualmente some o
  disco em dobro.

Paleta categórica: lei da casa é fotometria no corpo. Não copiar a
tinta violeta/âmbar. `resolutionFactor` (`min(janela)/800`) continua
no JS deles; é barato e independente do tubo.

---

Para o agente que for mexer em `world/orbitas.ts`. Não copiar JavaScript
da NASA. Não refazer `conicaOsculadora`, `escreverLaco`, o fade angular
(`alfaDa`), o pai da lua, nem o `realce` do foco. A álgebra da elipse
já é a deles (`setFromPositionAndVelocity`). O buraco que restou da fita
é **junta (calota) e, se o dono quiser, o AA da borda** — não um shader
de tubo.

Irmãos: `estudo-orbitas-eyes-observacao.md` (número da tela) e
`nasa-eyes-algoritmos.md` (peças do JS). Este arquivo é só a órbita de
**planeta** (`OrbitLineComponent` + `LineShader` + `LineMesh`), não o
rastro de sonda.

Lido de novo no `app.js` público (2026-08-05) e no `LineMaterial.js` que
a casa passou a usar em `8be508f`.

---

> ⚠️ **CONFERIDO EM 24/08 CONTRA O PIXEL, e a premissa central NÃO se
> sustenta. O arquivo fica inteiro** (a casa não apaga documento; marca),
> mas leia-o com estas seis correções na mão:
>
> 1. **O "tubo" é refutado pelos DADOS DO PRÓPRIO AUTOR.** As bordas que
>    ele cita estão quantizadas em QUARTOS (0,25 / 0,50 / 0,75 / 1,00) —
>    a assinatura de **cobertura por 4 amostras**, não de um perfil
>    analítico contínuo. E os 8 picos medidos batem no valor **CHEIO** da
>    paleta: com um perfil de tubo isso seria impossível, porque nenhum
>    pixel chegaria ao topo. O Eyes tem AA de borda, não volume.
> 2. **"`Line2` é contínuo" é falso.** `Line2` ESTENDE `LineSegments2`:
>    mesmos quads, mesmas calotas redondas. Trocar um pelo outro não
>    resolveria junta nenhuma — e, medido, é justamente a calota que
>    produz o **colar de contas** (ver **L2.5** no item 83 do
>    `PENDENCIAS.md`, com o número das colunas).
> 3. **`depthWrite` e `depthTest` estão trocados** no texto. São coisas
>    diferentes, e a casa usa `depthWrite: false` COM `depthTest: true`
>    de propósito — é o que faz a linha sumir atrás de um globo resolvido.
> 4. **O hover que ele descreve como vivo NÃO EXISTE na tela.** A medição
>    §7 do `estudo-orbitas-eyes-observacao.md` pôs o ponteiro sobre a
>    órbita de Marte por leitura de pixel: nem tooltip, nem realce, nem
>    cursor. No Eyes a linha é matéria morta.
> 5. **O alfa 0,75 é erro de UNIDADE.** É valor pós-codificação sobre
>    preto; o nosso 0,32 é linear e PRÉ-ACES. Comparados na tela, a
>    NOSSA fita é a mais forte: **200–230 contra 116–170** deles. A
>    tabela abaixo dá a impressão contrária.
> 6. **A paleta como TINTA choca com o item 77.** Ela serve como
>    referência de SEPARAÇÃO de matiz (é o L3); adotá-la como cor é
>    pintar Mercúrio de violeta, que é a desonestidade que a fotometria
>    da casa existe para não cometer.
>
> **E O QUE ELE ACERTOU, que também se registra:** a **reconciliação do
> "aditivo"** entre os dois estudos anteriores da casa, que se
> contradiziam — ponto dele; e a **paleta lida do `TrailManager`**,
> confirmada por 8 cruzamentos independentes a ±0,5. O diagnóstico de que
> "a nossa ainda parece arame" também está CERTO — só que a causa não é
> o tubo: são a calota dobrada (L2.5) e a borda dura (a dívida de
> cobertura), as duas registradas no item 83.

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

## Ordem de obra (corrigida 24/08)

A ordem antiga (tubo → Line2 → paleta × 0,75) **está morta**.

1. Olho do dono nas fotos do L1/L2 (já na fila).
2. **Mata-contas:** `dashed = true`, `gapSize = 0`, `dashSize` grande,
   `computeLineDistances()` para nascer o atributo. Calota some no
   fragmento. Não sair da peça do three.
3. **`resolutionFactor`** se ainda faltar corpo em janela larga
   (`max(1, min(lado)/800)`).
4. Matiz da linha, se o dono quiser — **sem** paleta categórica no
   lugar da fotometria.
5. AA analítico (`fwidth`) por último: é gosto, e tira luz da fita.
   Não é o que o Eyes faz (eles têm `antialias: true` no renderer;
   a casa tem `false` de propósito).

Rastro de sonda (`TrailComponent`) não entra neste corte.
