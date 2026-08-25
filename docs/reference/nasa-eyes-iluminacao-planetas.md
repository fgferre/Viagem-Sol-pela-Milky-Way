# NASA Eyes — iluminação dos planetas

> ## ⚠️ ESTE RELATÓRIO FOI CONSUMIDO — leia esta caixa antes do resto
>
> A obra do item **91 aconteceu em 2026-08-25**, e o que está no código
> **diverge deste documento em quatro pontos**. O diagnóstico central
> daqui está certo e é o que guiou a obra: *o app colou a regra do
> pontinho no céu no globo visitado*. O resto se lê como estudo do
> Eyes, não como especificação viva. **A especificação viva é
> `src/lib/atlas/luzDaVisita.ts` e a entrada do `NORTE.md`.**
>
> **1. O §11.1 pede ganho 1 no globo TAMBÉM em `?luz=real`. O dono
> decidiu o contrário, e a decisão dele prevalece.** No `real` a casa
> mantém a **penumbra física verdadeira** — E(d) de verdade, Saturno
> visivelmente mais escuro que a Terra. O app conserva uma posição 1:1,
> e é isso que faz do `real` um modo, e não um segundo assistido.
> Onde este arquivo disser "`?luz=real` no globo **não** volta a E(d)",
> leia o contrário.
>
> **2. O conserto não foi "`ganhoFundido` SAI da malha" (§11.1, §14).**
> Apagar a lei não é endereçá-la. O escalar da malha continua sendo UM
> e virou o produto `ganhoFundido(distância viva) ×
> compensacaoDaVisita(corpo)`, com a compensação constante por corpo. O
> §11.1 chama "dois ganhos empilhados" de anti-padrão 1 e **cita o
> anti-padrão ao contrário**: o anti-padrão 1 do `PLANO-ATLAS.md` é
> *"lei física em duas camadas que NÃO SE CONHECEM (`decay=0` +
> 1/r² por material)"* — duas camadas cegas uma para a outra. O
> conserto legítimo é exatamente as camadas **se conhecerem**, que é o
> que este produto faz.
>
> **3. §11.1 e §11.6 afirmam que o PONTO consome `ganhoFundido`. É
> falso.** `planetas.ts` é MH18 puro e nunca passou por
> `ganhoFundido` — o único consumidor sempre foi o globo. Por isso o
> selo declarava, até 25/08, um gasto que a malha não fazia; agora ele
> declara `stopsDaVisita`, que é o gasto do globo.
>
> **4. Os números de §8.3, §11.7.1 e §12 estão em LINEAR pós-ACES, e a
> régua desta casa mede BYTES do PNG** (`luz-do-quadro.mjs`,
> `medirQuadro` — luminância Rec.709 sobre o byte, que é sRGB). "o
> disco de hoje ≈ 0,09" é linear; **em bytes de tela o disco de Saturno
> media 58 de 255 na vista oficial e 84 de 255 de perto**, e passou a
> **139** e **187**. O alvo de §11.7.1 ("acima de ~0,35 depois do
> ACES") em bytes é ~0,63 · 255 ≈ 160. Comparar os dois espaços sem
> dizer qual é qual faz a prova nascer ambígua — foi o que quase
> aconteceu.
>
> **O que NÃO foi implementado, e não por esquecimento:** a lanterna de
> leitura de 15 % (§11.3), a logística s=3 no terminador dos gigantes
> (§11.2) e o véu de atmosfera no limbo de Saturno (§11.5). Depois que
> o dia voltou a ser dia, nenhuma delas era necessária para o defeito
> que o dono viu. Continuam disponíveis como segunda leva.

O que o Eyes realmente faz com a luz dos globos, lido no JavaScript
público (`https://eyes.nasa.gov/apps/solar-system/app.js`, 1.740.345
bytes, baixado em 2026-08-24). Não é os `atlas-estudo-*.md` (pesquisa
de IA sem fonte primária). Não é cópia do fonte: são as **regras** que
o desenho obedece.

O irmão deste arquivo, `nasa-eyes-algoritmos.md`, cobre nomes e
trajetórias. Aqui a pergunta é outra: **por que Saturno lá é palha
clara e aqui, mesmo com brilho assistido, quase some.**

Peças da casa citadas pelo nome: `ganhoFundido`, `SIGMA_ASSISTIDA`,
`irradianciaRelativa`, `GIGANTE_LAMBERT_FRAG`, `ANEL_FRAG`,
`TERRA_FRAG`, `LUA_FRAG`, `fatorDeFaseMh18`, `cessaoAlvo`,
`ACESFilmicToneMapping`.

Peças do Eyes citadas pelo nome: `MaterialUtilsPhong`,
`MaterialUtils.setLightSourceUniforms`, `LightSourceComponent`,
`CameraManager.toggleCameraLight`, `Scene._ambientLightColor`,
`SpheroidLODComponent`, `RingsComponent`, `AtmosphereComponent`,
`Settings.toggleLightOptions`.

---

## Como ler

O Eyes tem uma lei só para o globo, e ela **não é a lei do ponto no
céu**:

> O planeta visitado é uma **fotografia iluminada**. O Sol chega
> branco, sem 1/d². O dia é a textura. Uma lanterna fraca na câmera
> lê a noite. Quem conta a distância é o **tamanho**, não o quão
> preto o mármore ficou.

A casa faz o contrário no globo: a malha 3D herda `ganhoFundido(dUA)`
— a irradiância heliocêntrica comprimida — e o ACES come o que sobra.
O ponto fotométrico (MH18) está certo. O globo é que paga a conta de
uma exposição travada na Terra.

---

## A mistura — duas coisas, uma regra colada na outra

Cravado com o dono em 24–25/08, nas palavras da conversa. Não é
hipótese: é o diagnóstico que a implementação tem de honrar.

Existem **duas coisas diferentes**. O app colou a regra de uma na
outra.

**1. O pontinho no céu** — Saturno visto de longe, como estrela.
A regra certa é: quanto mais longe do Sol (e de você), mais fraco.
Vênus brilha, Netuno some. Isso é o céu de verdade. A casa **já faz
bem** (`fatorDeFaseMh18`, `H = −8,914`, a PSF da Lei da Estrela).

**2. O globo quando você chegou** — Saturno enchendo a tela, como
nas fotos da Cassini. A regra certa é outra: o Sol ilumina aquele
mundo **ali**, e a imagem se ajusta a isso. O dia é palha. A noite
é noite. A distância se lê pelo **tamanho** do planeta, não pelo
quão preto ele ficou.

O erro: pegaram a regra do pontinho (`ganhoFundido` = 1/d²
comprimido) e aplicaram no globo (`uLuzGanho` da malha). Por isso
Saturno, mesmo com brilho assistido, parece carvão — uma conta de
“visto da Terra” colada numa visita.

**Não é que a física do Sol fraco lá fora seja mentira.** Saturno
de fato recebe ~1/90 da luz que a Terra recebe. É que **ninguém
fotografa Saturno com o ISO da Terra**. Olho, Cassini e NASA Eyes
expõem para o mundo em que estão. O 1/d² no globo visitado não é
realismo: é a regra certa no endereço errado.

O Eyes tem modo **Natural Lighting** (lanterna desligada). Isso
**não** apaga o dia de Saturno. Natural = noite preta, dia ainda
palha. O nosso defeito é o dia fraco, não a ausência de um
interruptor “realista”.

---

## 1. O que o dono vê

Palavras dele, 2026-08-24 (item **91**): Saturno, mesmo com brilho
assistido, quase escuro — e Saturno é um objeto claro no céu, mesmo a
olho nu.

Três Saturnos, e a casa misturou os três:

| Saturno | O que é | Brilho verdadeiro |
|---|---|---|
| Ponto a olho nu | m ≈ 0,5 a 1,0 — rivaliza com as estrela brilhantes | O ponto MH18 da casa **já faz isso** (`H = −8,914`, anel incluso) |
| Disco visto da Terra | ~20″, albedo geométrico ~0,47; por arcsegundo é **fraco** (não é a Lua) | Irrelevante: ninguém resolve o disco a olho nu |
| Globo visitado (Cassini / Atlas) | Nuvens palha, anel de gelo; a câmera **expõe para Saturno** | É isto que o olho dele pede, e o Eyes desenha |

A textura da casa **não é o defeito**. Mapa SSS `8k_saturn`, luma
sRGB média **0,76**, linear **0,55**, p10/p50/p90 = 0,63 / 0,75 /
0,90. É palha clara. O que apaga é a conta **depois** do texel.

---

## 2. Arquitetura do Eyes, em uma página

Dois desenhistas, dois contratos.

| Camada | Peça | Lei de luz |
|---|---|---|
| **Globo** (planeta, lua, anel) | `SpheroidLODComponent` + `MaterialUtilsPhong` | Sol branco, **sem** 1/d². Phong customizado. Até 5 luzes. |
| **Modelo GLTF** (sonda) | `ModelComponent` + `MaterialUtilsStandard` (PBR) | A mesma lista de luzes; Lambert/π + GGX. Só espaçonave. |
| **Estrela de fundo** | `StarfieldComponent` | `absoluteMagnitudeToFlux` — **esta sim** é 1/d². **Não entra no planeta.** |
| **Ponto do planeta no céu** | (Eyes: o globo encolhe; não há PSF) | A casa tem MH18 no ponto; o Eyes não precisa |

O Sol é um `LightSourceComponent` no entidade `sun`:

- cor default `(1, 1, 1)` — `Color` constrói branco;
- `setAbsoluteMagnitude(4.83)` — o M_V do Sol, **escrito e ignorado**
  na hora de iluminar a malha (ver §4);
- raio `+∞` no componente; o `lightRadii` que chega no shader é o
  `occlusionRadius` da entidade (o raio do Sol), para penumbra.

A câmera também é um `LightSourceComponent` (a lanterna, §3).

Teto: **5 luzes**. O próprio corpo é pulado
(`l !== entity.getComponent(LightSourceComponent)`), então Saturno
não se ilumina. A lanterna da câmera entra com `lightRadii = −1`
(tem `CameraComponent`) e **não sofre eclipse** de lua nem de anel.

Ambiente de cena, default: `Scene._ambientLightColor = (0.02, 0.02, 0.02)`.

Não há ACES no globo. O Phong escreve `textura × luz` e entrega. O
PBR das sondas aplica `pow(rgb, 1/gammaCorrectionFactor)` com
`gammaCorrection = 1` e depois `sRGBTransferOETF`. Planeta **não
passa por tone mapping de filme**.

---

## 3. Os três modos que o visitante escolhe

`Settings.lightType`, default **`shadow`**. Três botões, três
políticas. A peça é `toggleLightOptions` →
`CameraManager.toggleCameraLight`.

| Modo | O que faz | Cor da lanterna | Sol |
|---|---|---|---|
| **Shadow Lighting** (default) | Lanterna **ligada** | `(0,15; 0,15; 0,15)` | ligado |
| **Flood Lighting** | Lanterna **ligada** | `(1, 1, 1)` | no compare, o Sol **apaga** (`color.min() < 1` é a guarda; flood = 1) |
| **Natural Lighting** | Lanterna **desligada** | — | só o Sol + 2 % de ambiente |

A história da Voyager em Netuno liga `flood` no `onEnter` e devolve
`shadow` no `onLeave`: quando a câmera está do lado escuro de
propósito, eles **não** deixam o planeta preto.

A casa não tem nenhum destes três. Tem `?luz=real|assistida`, que
comprime 1/d² e **não** põe lanterna.

O default do Eyes **não é** o natural. O default é “Sol de verdade +
noite legível”. É assistência **declarada** (três botões, ícone no
HUD), não um piso escondido no BRDF.

**O que o Natural faz, e o que a dúvida do dono precisava cravar.**
O Natural **só** desliga a lanterna da câmera
(`toggleCameraLight(false)`). O Sol continua branco, **sem** 1/d²,
o `saturate` do dia continua em 1, a textura no subsolar continua
a textura. O lado da noite fica escuro (sobra o ambiente 2 %). O
lado do dia de Saturno **não escurece**. “Modo realista” no Eyes
quer dizer “eu vejo a noite como noite” — **não** “Saturno virou
carvão porque está a 9,5 UA”. Copiar o Natural da casa sem antes
tirar o `ganhoFundido` da malha reproduz o carvão e chama isso de
honesto. Não é.

---

## 4. A regra que decide Saturno: o Sol chega 1

`MaterialUtils.setLightSourceUniforms`, o único escritor das luzes
do globo:

```
posição  = light.getEntity().getCameraSpacePosition(camera)
ganho    = 1                          // literal
cor      = light.getColor() * ganho
raio     = tem CameraComponent ? −1
         : entity.getOcclusionRadius()
```

Não há `1/d²`. Não há `absoluteMagnitude`. Não há `ganhoFundido`.
A cor do Sol é branca em Mercúrio e branca em Netuno.

`absoluteMagnitudeToFlux` existe no pacote e **só serve ao sprite de
estrela**:

```
L = 3.0128e28 * 10^(M/−2.5)     // watts
F = L / (4 π d²)                // W/km²
brilho = 2 * log(1 + F * 1e4)
```

É a lei certa para **ponto no céu**. Aplicá-la no globo visitado
seria expor Saturno com o ISO da Terra — o mármore sai preto, a
Cassini nunca fotografou assim.

A direção da luz, essa, é pontual de verdade:

```
lightDir = normalize(fragmentCam − lightPosCam)
```

Longe do Sol, os raios são paralelos. Perto, o terminador **curva**
com a posição no globo. Intensidade constante, direção geométrica.

Depois de somar as luzes, o Phong faz `diffuseLight = saturate(diffuseLight)`:
o dia **não passa de 1**. A lanterna a 15 % ilumina a noite; no
subsolar (Sol + lanterna + ambiente > 1) o excesso **corta**, e o
dia continua sendo a textura.

---

## 5. O shader do globo (`MaterialUtilsPhong`)

É Phong, não PBR. Saturno, Júpiter, Urano, Netuno, Marte, Vênus,
Mercúrio, a Terra e as luas passam por aqui (`SpheroidLODComponent`
chama `MaterialUtils.get` = Phong). PBR é sonda.

Uniforms que importam: `ambientLightColor`, `lightPositions[5]`,
`lightColors[5]`, `lightRadii[5]`, `numLights`, `color` (default
branco), `specularIntensity` (default **0**), mapas `color` /
`normal` / `specular` / `night` / `decal`, e os blocos opcionais
`shadowEntities`, `shadowRings`, `atmosphere`.

### 5.1 Lambert que não é Lambert

Por luz:

```
lightDir      = normalize(posCam − lightPos)
lightCosAngle = −dot(lightDir, normal)          // N·L cru, pode ser < 0

sharpness = 3.0
#ifdef atmosphere
  sharpness /= 1.0 + 700.0 * atmosphereDensity
#endif

lightCosAngle = 2*(1+exp(−s)) / (1+exp(−s * lightCosAngle)) − 1
diffuseLight += incoming * saturate(lightCosAngle)
```

A logística (`s = 3`) é o truque de leitura. Valores (saturados):

| N·L cru | Lambert `max(N·L,0)` | Eyes (s=3) | O que muda |
|---|---|---|---|
| 1,00 (subsolar) | 1,00 | 1,00 | igual |
| 0,70 | 0,70 | 0,87 | meio-dia mais cheio |
| 0,50 | 0,50 | 0,72 | **+43 %** no flanco |
| 0,20 | 0,20 | 0,36 | terminador largo |
| 0,00 (terminador) | 0,00 | 0,05 | vaza 5 % |
| −0,05 | 0,00 | 0,00 | noite continua noite |

Não é Hapke, não é Lommel-Seeliger. É um Lambert **amaciado** para o
globo não nascer bola de billiard. A casa nos gigantes faz
`ndotl = max(dot(n, uDirSolLocal), 0.0)` — o flanco cai no coseno
cru, e o ACES ainda esmaga.

Saturno tem atmosfera `density = 5e−5` → `sharpness` cai 3,5 %.
Quase o default. A Terra (`density = 0,0015`) amacia de verdade
(`sharpness ≈ 0,95`): o azul do limbo come o corte.

### 5.2 Specular

```
phong  = 0.25 * pow(saturate(R·V), hardness/2)
blinn  = 4    * pow(saturate(H·N), hardness)
rim    = pow(1 − saturate(−dirCam·N), hardness/12) * blinn
spec  += saturate(N·L * 20) * (phong + rim) * incoming
```

`specularIntensity` default 0. Saturno **não** declara mapa
especular — o globo é difuso puro. A Terra declara
`specular_$SIZE_$FACE.png` (oceanos). A casa tem Blinn-Phong no
oceano da Terra (`F0 = 0,04`); nos gigantes, nada. Não copiar
specular para Saturno.

No fim, `specularLight *= (1 − ambientLightColor)`: com ambiente
2 %, o spec perde 2 %. Cosmético.

### 5.3 Textura × luz, no espaço da foto

```
colorPixel = texture(colorTexture, uv) * color
#ifndef colorMapEmissive
  colorPixel *= vec4(diffuseLight, 1)
#endif
pc_fragColor = colorPixel
pc_fragColor.rgb += specularLight * specularPixel
```

Não há conversão sRGB→linear no Phong. O PNG/JPG entra, multiplica,
sai. É o “look de jogo clássico”: médios mais claros que o fluxo
linear + ACES da casa. Com `gain = 1` e ACES, a casa ainda chega
perto (ver §10) — o ACES deixa de ser o vilão quando o globo entra
na faixa 0,3–0,6, não em 0,08.

### 5.4 Noite (só quem tem mapa)

Terra: `night_$SIZE_$FACE.png`. Mistura

```
mix(dia, night, 1 − min(1, 3 * length(diffuseLight)))
```

Cidades acendem quando a luz cai abaixo de ~1/3. Saturno não tem
este mapa.

### 5.5 Sombra de lua (`shadowEntities`)

Cone com Sol de raio finito. Para cada um de até 7 oclusores
(Saturno declara: Jápeto, Dione, Reia, Tétis, Titã, Mimas,
Encélado):

```
e0, e1  // umbra / penumbra projetadas
lightLevel = pow(saturate((e − e0)/(e1 − e0)), 0.5)   // PBR
           ou (e−e0)/(e1−e0)                          // Phong
cor = lightLevel * mix(cor, sunsetColor,
        (1−lightLevel) * sunsetIntensity)
```

No Phong ainda entra Rayleigh de palco (`r,g,b` com expoentes 1 /
1,602 / 3,228) quando o oclusor tem atmosfera. A lanterna da câmera
(`lightRadius < 0`) **sai no primeiro `break`** — não é eclipsada.

A casa já tem eclipse analítico em `fatorDeEclipse` (Danjon na
umbra da Lua). Não é o buraco de Saturno.

### 5.6 Sombra do anel no globo (`shadowRings`)

Saturno é o único que liga `materialOptions: ["shadowRings"]`.

```
d = dot(pos, nAnel) / dot(lightDir, nAnel)
pontoNoDisco = −d * lightDir + pos
u = (r − rInt) / (rExt − rInt)
shadow = 1 − texture(anel, vec2(u, 0)).a
if (rInt ≤ r ≤ rExt && d > 0) incoming *= saturate(shadow)
```

A casa faz o irmão disto em `sombraDoAnel` (plano y=0, placa alpha,
fade `smoothstep(0, 0,05, ndotl)`, densidade 0,9). A geometria está
certa. O que falta é luz **antes** da sombra: uma sombra de 90 %
sobre um globo que já está a 0,21 vira buraco.

### 5.7 Atmosfera (mistura no fim)

Saturno declara, no `postCreateFunction`:

| | Saturno | Terra | Sol |
|---|---|---|---|
| `scaleHeight` | 200 (km) | 8 | 2e5 |
| `density` | 5e−5 | 0,0015 | 8e−7 |
| `color` | (234, 202, 151)/255 palha | (214,5; 267; 1,5)/255 azul (canais podem >1) | (1, 1, 64/255) |
| `sunBrightness` | 1 (default) | 2 | — |
| `sunsetIntensity` | 0 | 1,2 | — |
| `emissivity` | 0 | 0 | 1 |

A atmosfera **não é Nishita**. É um glow de densidade amostrado em
5 passos, com `getDayLevel` (o raio rasante vira 0…1) e
`adjustOverbrightness` (se um canal > 1, comprime por
`pow(c/max, 1/max)`). No `main`:

```
pc_fragColor.rgb = mix(globo, atmosphereColor.rgb, clamp(a, 0, 1))
```

E a lanterna da câmera **não** entra na atmosfera
(`if (length(lightPositions[i]) > 0)` — a câmera está na origem do
espaço de câmera). Só o Sol faz o limbo.

A casa tem Nishita **só na Terra** (`ATMOSFERA` em `terraShaders.ts`).
Os gigantes não têm casca. Saturno no Eyes ganha um véu palha no
limbo; o nosso é Lambert nu.

---

## 6. O anel (`RingsComponent`)

Malha 10×10 no quadrado [−1,1]², escalada por `outerRadius`. Duas
texturas (topo / fundo), blending normal, `depthWrite = false`,
dois lados.

Saturno:

| | Eyes | Casa (`ANEL_SATURNO`) |
|---|---|---|
| raio interno | 74 271 km = **1,232 R** | 1,110 R (anel D) |
| raio externo | 140 479 km = **2,331 R** | 2,326 R (anel F) |
| texturas | `saturn_rings_top.png` / `_bottom.png` | placa alpha SSS |

Por luz:

```
bottomTopRatio = (1 + 0.2 * cameraDir·lightDir)
                 * sign(cameraCos) * lightCos
shadow     = spheroidShadow(...)                 // elipsoide do globo
bottomColor = saturate(incoming * (1 − ratio) * shadow)
topColor    = 2.0 * saturate(incoming * ratio * shadow)
cor = mix(bottomTex * bottomColor, topTex * topColor, ratio)
```

O **2,0** no lado do Sol é a razão de o anel parecer gelo e não
papel pardo. A casa:

```
lambert = max(abs(nDotL), 0.12)
brilho  = mesmoLado ? lambert : (0.18 + 1.6 * pow(phase, 6))
direta  = albedo * brilho * uLuzGanho * sombraDoPlaneta
```

O espalhamento frente/trás da casa é **melhor física** que o 2,0
fixo. O que mata o anel é o mesmo `uLuzGanho = 0,21`. Um piso
Lambert 0,12 × 0,21 = 0,025 — o anel some junto com o globo.

`spheroidShadow` do Eyes: o globo projeta um disco no plano do anel
(com o squash polar). A casa faz o irmão com discriminante
`a = dot(d',d')` no elipsoide (W5-B), umbra 0,22 — não zero. Os
dois deixam o anel na sombra do globo **legível**. Não é isto que
está quebrado.

---

## 7. Cadastro de Saturno no Eyes (o dado vivo)

`Entity.register` → `saturn:`:

- grupos `planets`; raio 60 268 km; achatamento 54 364 km;
- pais: Sol; trilha ouro `(0,72; 0,65; 0,52; 0,70)`;
- cubemap de cor `saturn/color_$SIZE_$FACE.png` nos tamanhos 4 e
  512 (não 4k — o globo de Saturno é de propósito **mais pobre**
  que Júpiter, que sobe a 4096);
- `materialOptions: ["shadowRings"]`;
- oclusores: as sete luas grandes;
- anel e atmosfera no `postCreateFunction` (§5.7, §6);
- **sem** `LightSource` próprio, **sem** night map, **sem**
  specular, **sem** ganho por UA.

Júpiter é o mesmo contrato (Phong, Sol branco, sem lanterna
própria), textura maior, sem anel, sem atmosfera declarada no
trecho lido. A Terra acrescenta normal + specular + night +
nuvem-decal e atmosfera azul com pôr-do-sol.

O Sol, além da luz: `AtmosphereComponent` amarelo com
`emissivity = 1`, sprite `sun_glow.png` 100×100 px,
`colorMultiplier (1, 1, 0,5)`, `renderOrder −2`.

---

## 8. O que a casa faz hoje

Três leis, três endereços, e o globo pegou a errada.

### 8.1 O ponto (certo)

`fotometria.ts` + `planetas.ts`: `m = H + 5 log r + 5 log Δ − 2,5 log Φ`,
Φ = MH18, Saturno com termo de anel. Consome o instrumento da Lei
da Estrela. Saturno **ponto** é um dos mais brilhantes do céu da
casa (`H = −8,914`). O dono não está reclamando deste.

### 8.2 O globo (errado para visitar)

Gigantes: Lambert `albedo * ndotl * uLuzGanho`, **zero** ambiente,
**zero** lanterna, **zero** logística no terminador.
`uLuzGanho = ganhoFundido(rUA, politica)`.

```
E(d) = (1 UA / d)²          // clamp [0,05; 1000] UA
assistida: E^0,35           // SIGMA_ASSISTIDA, chute herdado
real:      E
```

Números, órbita circular típica, `assistida` (o default):

| corpo | d (UA) | E | ganho | ΔEV vs Terra |
|---|---|---|---|---|
| Mercúrio | 0,39 | 6,68 | 1,94 | −1,8 |
| Terra | 1 | 1 | 1 | 0 |
| Júpiter | 5,2 | 0,037 | 0,32 | +3,1 |
| **Saturno** | **9,5** | **0,011** | **0,21** | **+4,2** |
| Urano | 19,2 | 0,0027 | 0,13 | +5,5 |
| Netuno | 30 | 0,0011 | 0,09 | +6,4 |

`assistida` já **ajuda** (o real de Saturno seria 0,011, nove
vezes pior). Não chega. O Eyes no mesmo globo usa **1,00**.

Lua e rochosos: Lommel-Seeliger (`C = 4/3`), o disco cheio é
chato — certo para regolito, e **não é o problema de Saturno**.
Os gigantes são Lambert de propósito (nuvem, não poeira).

Terra: Lambert + especular de oceano + cidades (emissão, fora do
ganho) + Nishita. Na Terra `ganho = 1` e o globo lê. Saturno não
tem esse privilégio.

### 8.3 A cadeia de display (o multiplicador escondido)

A casa é linear de verdade: texel sRGB → linear (`SRGBColorSpace`),
Lambert, `uLuzGanho`, depois **ACES** (`toneMappingExposure = 1,02`)
+ knee asinh no bloom + sRGB de saída.

ACES Filmic da three, valores que o globo realmente produz:

| linear que entra | ACES que sai | leitura |
|---|---|---|
| 0,028 (Saturno, flanco, assistida) | **0,018** | preto |
| 0,076 (Saturno, média do disco, assistida) | **0,09** | carvão |
| 0,114 (Saturno, subsolar, assistida) | 0,16 | sombrio |
| 0,37 (Saturno, média, **ganho 1**) | 0,51 | fotografia |
| 0,55 (subsolar, ganho 1) | 0,64 | palha |

O ACES **não é o vilão** quando o globo entra na faixa da foto. Ele
é um compressor de faixa. Alimentá-lo com 0,08 linear é pedir
carvão. O Eyes nem pergunta: multiplica a foto por 1 e entrega.

Doutrina da casa que continua certa e **não se revoga**:

- sem piso de ambiente no BRDF (anti-padrões 3 e 9 do doador);
- um escalar só no material, não dois ganhos empilhados;
- ordem de brilho entre corpos não mente (`x^σ` monótono);
- auto-exposição pelo que está **em quadro** o dono reprovou
  (`PLANO-ATLAS.md`, `NORTE.md`).

O que a doutrina **não** pede é que o globo visitado herde a
exposição da Terra. Isso foi uma travessia, não uma decisão dele.

---

## 9. Por que Saturno some — a pilha, número a número

Olho no subsolar, `assistida`, textura linear 0,55:

```
0,55  (texel linear)
× 1,00  (Lambert no subsolar)
× 0,21  (ganhoFundido a 9,5 UA)     ← o corte grande
= 0,114 linear
→ ACES 0,16 na tela                 ← o segundo corte
```

Olho no flanco (N·L = 0,3), o caso de quem gira em volta:

```
0,55 × 0,30 × 0,21 = 0,035 linear → ACES 0,02
```

Quase apagado. Sombra do anel em cima (×0,1) vira buraco.

O mesmo flanco no Eyes, modo **shadow** (o default):

```
luz = saturate( 1,00 * logistic(0,30)
              + 0,15 * (N·V da lanterna)
              + 0,02 ambiente )
≈ saturate(0,48 + 0,15 + 0,02) = 0,65
× texel sRGB 0,76
≈ 0,49 na tela
```

Vinte vezes o nosso flanco. No subsolar o Eyes satura em 1 e a
textura aparece inteira (~0,76). A lanterna não clareia o dia
(já está no teto); clareia a **noite**, que na casa é preta
absoluta.

A olho nu, Saturno é claro porque é um **ponto** de m ≈ 0,7. A
casa já acerta esse ponto. O dono está no Atlas, no globo, e o
globo foi desenhado como se a câmera tivesse o ISO de quem olha
da Terra.

---

## 10. O que copiar, o que recusar, o que a casa já tem melhor

Copiar a **lei**, não o Phong de 2018.

| Peça do Eyes | Copiar? | Por quê |
|---|---|---|
| Sol branco no **globo**, sem 1/d² | **SIM — é o conserto** | Visitar Saturno é expor para Saturno. Cassini não fotografou carvão. |
| MH18 / 1/d² no **ponto** | já temos, **não mexer** | É o céu a olho nu. |
| Lanterna 15 % na câmera (modo shadow) | **SIM, declarada** | Não é piso de ambiente. É uma luz com dono, como `assistida`. Selo. |
| Modo flood branco | NÃO como default | Apaga o terminador. O Eyes deixa como opção; o default é shadow. |
| Modo natural (só Sol) | opcional, `?luz=real` do globo | A casa já tem `real` para o 1/d². No globo, `real` honesto é noite preta **com dia na textura**, não dia a 1 %. |
| Ambiente 0,02 no BRDF | **NÃO** | Anti-padrão 3 e 9. A lanterna cobre a leitura. |
| Logística s=3 no N·L dos gigantes | **SIM** | Flanco +43 %. Barato. Não é Hapke. |
| Lommel-Seeliger na Lua | já temos, **não trocar** | Disco chato é o fato da foto. |
| `specularIntensity = 0` nos gigantes | já é o caso | — |
| Atmosfera palha no limbo de Saturno | SIM, depois da luz | Véu, não substituto da exposição. |
| Anel ×2 no lado do Sol | NÃO o 2,0 mágico | A casa já tem frente/trás. Tire o `uLuzGanho` de 0,21 do anel. |
| Sombra anel→globo e globo→anel | já temos | — |
| Eclipse de luas | já temos | — |
| ACES fora do globo / multiplicar em sRGB | **NÃO** | A casa é linear. Com ganho 1 o ACES **ajuda**. |
| Auto-exposição pelo foco | **NÃO** | O dono reprovou. Ganho **por corpo**, constante, não por quadro. |
| `compensated` (ganho 1 em TUDO, ponto incluso) | **NÃO** | Morto na travessia de propósito. O ponto tem de cair com 1/d². |
| PBR GGX nos globos | NÃO agora | Saturno no Eyes é Phong difuso. GGX é sonda. |

---

## 11. Contrato para implementar (item 91)

A luz continua **um escalar só** no material. Quem muda é **qual
lei escreve o escalar**, e ela é diferente no ponto e no globo.

### 11.1 Dois consumidores, uma honestidade

> ⚠️ **Esta seção foi superada pela obra de 25/08 em três pontos** — o
> `real` no globo, o "`ganhoFundido` sai da malha" e a atribuição do
> `ganhoFundido` ao ponto. Ver a caixa no topo do arquivo. O que
> sobrevive daqui é a **partição**: duas leis, dois endereços.

```
ponto  (camada planetas, PSF)  → MH18 + 1/d²    (NUNCA ganhoFundido)
globo  (malha Terra/Lua/rochoso/gigante/anel)
       → ganhoFundido(d) × compensacaoDaVisita(corpo)
```

Exposição local = o Sol no globo vale **1** (o texel no subsolar é
o texel). `?luz=real` no globo **não** volta a E(d): isso reabre o
carvão. `real` no globo quer dizer “sem lanterna, noite preta, dia
na textura”. `assistida` no globo quer dizer “lanterna de leitura,
default 0,15, a do Eyes shadow”.

`ganhoFundido(dUA)` **sai** de `uLuzGanho` da malha. Continua
existindo para quem ainda mede irradiância (selo, ficha, ponto).
Dois ganhos empilhados no shader é o anti-padrão 1: então o
uniforme da malha deixa de se chamar a mesma coisa que o do ponto,
ou o mesmo nome passa a significar “exposição do globo = 1”.

Não é auto-exposição: o número **não olha o quadro**. É o mesmo 1
em Mercúrio e em Netuno, como o Eyes. A distância continua visível
pelo **tamanho** do disco e pelo ponto quando o globo cede
(`cessaoAlvo`).

### 11.2 Terminador dos gigantes

Trocar `max(N·L, 0)` pela logística s=3 do Eyes, **depois** do
eclipse e da sombra do anel (a sombra é geometria; a logística é
leitura). Lua e Mercúrio ficam em Lommel-Seeliger — regolito não
pede o amacio do gigante.

### 11.3 Lanterna de leitura

Uma luz na câmera, cor `(0,15; 0,15; 0,15)`, só no globo, só em
`assistida`. Não sofre 1/d², não sofre eclipse (como `lightRadii = −1`).
`N·V` saturado, sem logística — é fill, não Sol. Selo: uma linha
“lanterna de leitura 15 %” no mesmo lugar que já fala `assistida`.
`?luz=real` desliga.

Isto **não** é o piso 0,02 no BRDF. A noite em `real` continua
preta. A noite em `assistida` lê relevo.

### 11.4 Anel

O anel usa o **mesmo** 1 do globo, não o 0,21. O espalhamento
frente/trás fica. A sombra do planeta fica. Sem o 2,0 mágico.

### 11.5 Atmosfera de Saturno — segunda leva

Depois que o dia voltar a ser palha, um véu `(234, 202, 151)/255`,
`density 5e−5`, `scaleHeight 200 km`, mistura no limbo. Sem isso o
globo já lê; com isso, lê como o Eyes. Não bloqueia o 11.1.

### 11.6 O que o selo passa a dizer

> ⚠️ **Corrigido em 25/08:** o ΔEV que o selo mostrava NÃO era "da
> camada ponto" — o ponto nunca consumiu `ganhoFundido`. Era um número
> da lei do ponto exibido sobre o gasto do globo. O selo agora declara
> `stopsDaVisita`, o gasto REAL da malha, corpo a corpo.

Hoje o selo reporta o ΔEV da `assistida` **por corpo**, como se o
globo o usasse. No dia em que o globo deixar de usar, a frase
muda: o ΔEV continua sendo da **camada ponto** e da política
heliocêntrica; o globo declara “exposição local” / “lanterna 15 %”.
Mentir o EV do globo é pior do que não ter consertado.

### 11.7 Prova — a vista tem de cobrir o que mudou

> ⚠️ **O item (3) desta lista foi REVOGADO pelo dono:** em `?luz=real`
> o dia de Saturno **não** continua palha — volta a ser E(d), a
> penumbra física. Os outros seis foram cumpridos. E os limiares do
> item (1) estão em LINEAR: em bytes de tela o alvo é ~160 de 255, e o
> medido foi 187. Ver a caixa do topo.

Gate bit-idêntico das 18 do filme **não prova** Saturno. Se o filme
não pousa no globo de Saturno, o gate sai verde e o dono continua
vendo carvão. Obrigação (AGENTS.md §7): **criar a vista que cobre**.

Mínimo:

1. Saturno a 2 UA, lado do Sol, `assistida`. Disco médio **depois
   do ACES** acima de ~0,35 (hoje ~0,09). Foto lado a lado com
   `docs/reference/referencias-corpos/saturno-cassini-aneis-pia06193.jpg`
   (fase 72°, não copiar a fase — copiar a leitura: palha, não carvão).
2. O mesmo a 9,5 UA. Se o 11.1 estiver certo, o globo **não**
   escurece 21 % — o disco é o mesmo; só o tamanho muda.
3. `?luz=real`, lado da noite: preto. Lado do dia: ainda palha
   (não 0,011).
4. Ponto MH18 **bit-idêntico** (`planetas.test.ts`). Cessão
   globo↔ponto inalterada na forma; o fluxo do ponto não herda o 1
   do globo.
5. Mercúrio globo não estoura. Com ganho 1 + ACES, subsolar ~0,8
   — cabe. Sem `saturate` extra se o ACES já é o ombro.
6. Anel visível no mesmo enquadramento do (1), não um fio de
   carvão.
7. Lua cheia continua chata (LS). Não aplicar a logística dos
   gigantes nela.

A prova (1) é a que o dono julga. O resto é regressão.

---

## 12. Números-oráculo, para não chutar de novo

> ⚠️ **Espaço de cor:** os `ACES(...)` desta lista estão em LINEAR. A
> régua da casa mede BYTES do PNG. Ver o ponto 4 da caixa do topo.

```
SIGMA_ASSISTIDA           0,35     // continua valendo no PONTO
E_saturno(9,5 UA)         0,01108
ganho assistido hoje      0,207    // o que sai da malha hoje
lanterna Eyes (shadow)    0,15
ambiente Eyes             0,02     // NÃO copiar para o BRDF
logística s               3
vazamento no terminador   0,05     // saturate(f(0))
anel Eyes rInt/rExt       1,232 / 2,331 R_eq
anel casa                 1,110 / 2,326 R_eq
atmosfera Saturno         density 5e−5, H 200 km, rgb (0,918; 0,792; 0,592)
luma sRGB do mapa SSS     0,76
ACES(0,076)               ≈ 0,09   // o disco de hoje
ACES(0,37)                ≈ 0,51   // o disco com ganho 1
```

`absoluteMagnitude` 4,83 no Sol do Eyes: **não usar** no globo. O
próprio Eyes não usa.

---

## 13. Limites desta leitura

- Pacote `app.js` de 2026-08-24, 1,7 MiB, mais `vendors.js` (Three).
  Não foi o DOM ao vivo; foi o fonte. Um define que só arma em
  runtime (`shadowRings`, `atmosphere`) foi conferido no
  `Entity.register` de Saturno, que o arma.
- Texturas do Eyes (`saturn/color_$SIZE_$FACE.png`) não foram
  baixadas — 403 sem o loader deles. A comparação de texel é com o
  **nosso** SSS, que já é claro.
- O modo compare (`cameraLightLeft/Right`) e o Spout (ambiente
  branco para captura 360°) existem e não governam o Atlas. Spout
  chega a `setAmbientLightColor(1,1,1)` — é ferramenta de dump, não
  o céu.
- `gammaCorrection` default 1. Não há ACES no Phong. Se um
  futuro pacote do Eyes mudar isso, esta página envelhece: a lei
  (“Sol = 1 no globo”) é que tem de sobreviver, não o Phong.

---

## 14. Recado para o Claude (item 91)

Lê este arquivo inteiro. A obra é o globo, não o ponto. O ponto
(MH18, PSF, `planetas.ts`) **não se mexe**.

O diagnóstico que o dono cravou: o app colou a regra do pontinho
no céu (`ganhoFundido` / 1/d²) no globo visitado. Duas coisas,
uma regra no endereço errado. Saturno recebe mesmo ~1/90 da luz
da Terra — isso não é mentira. Mentira é fotografar a visita com
o ISO da Terra. Cassini não fez isso. O Eyes, **mesmo no modo
Natural**, não faz isso: desliga a lanterna, a noite fica preta,
o dia continua palha.

Contrato, em uma linha: `ganhoFundido` **sai** de `uLuzGanho` da
malha (Terra, Lua, rochoso, gigante, anel). No globo o Sol vale
**1**. `?luz=real` no globo = sem lanterna, noite preta, **dia
ainda na textura**. `?luz=assistida` no globo = lanterna de
leitura 15 %, a do Eyes *shadow*. Logística s=3 nos gigantes,
não na Lua. Sem piso de ambiente no BRDF. Sem flood de default.
Sem ganho 1 no ponto. Sem desligar o ACES. Sem auto-exposição
pelo quadro.

A prova tem de mostrar o que mudou: Saturno de perto, lado do
Sol, depois do ACES, palha — não carvão. Vista nova, não as 18
do filme. Detalhe do contrato: §11. Selo honesto: §11.6.

### O que o Grok já tocou nesta sessão (além deste relatório)

A obra do globo **ainda não rolou**. O Grok só estudou o Eyes,
escreveu este arquivo e alinhou os contratos vivos. Commits
`4bc4810` e `38ccecf` (locais, sem push). Não releia o mundo
como se só este `.md` tivesse nascido:

| arquivo | o que mudou |
|---|---|
| `docs/PENDENCIAS.md` | item **91** aberto com as palavras do dono; fila agora passa por 91; em 25/08 o diagnóstico da mistura e o modo Natural |
| `docs/NORTE.md` | regra que ainda manda: o globo visitado não herda o 1/d² do ponto; fila da obra 91 |
| `docs/PLANO-ATLAS.md` | o risco da primeira superfície 9.400:1 aponta para este diagnóstico, não para outro σ |
| `docs/reference/nasa-eyes-algoritmos.md` | uma linha: iluminação dos globos é o irmão (este arquivo) |

Código, shader, `ganhoFundido`, gates: **intocados**. Quem implementa
é este agente, a partir daqui.
