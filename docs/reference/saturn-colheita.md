# A COLHEITA DO PROJETO SATURN DELE — item 134

**Pedido dele, 02/09:** *"trazer os aprendizados desse outro projeto que eu
mesmo fiz, específico de Saturno: tem muitas luas e modelos 3D, com técnicas
muito interessantes que evidenciam as crateras, a textura aplicada nessas
luas, detalhes muito interessantes dos anéis de Saturno, e outras técnicas
interessantes que fazem sentido para melhorar o nosso projeto atual."*

Mineração só de leitura, 02/09/2026. Site <https://fgferre.github.io/Saturn/>,
repositório `github.com/fgferre/Saturn` (HEAD `2afe3a7`).

## 1. O que é o projeto dele

- **Stack:** three.js **r178**, TypeScript estrito, Vite 6. Renderiza em
  **WebGPU com materiais TSL** (nós), com queda para WebGL2 (`?webgl`).
  **A casa é r185 e GLSL cru** — a MATEMÁTICA dele atravessa, o CÓDIGO não.
- **Tamanho:** 65 MB no disco, 140 arquivos, ~10.900 linhas de `src/`.
  Uma dependência só (`three`); nenhum loader de malha.
- **NÃO existe modelo 3D carregado** (nem glTF, nem OBJ). O que ele chama de
  modelo 3D são (a) **mapas de altura** assados de shape models reais,
  aplicados como deslocamento radial numa esfera, e (b) geometria **esculpida
  na CPU** para as luas irregulares. Bom para nós: nada de `GLTFLoader`.
- **Corpos:** 17 — Saturno, 8 luas maiores (Mimas, Encélado, Tétis, Dione,
  Reia, Titã, Hipérion, Jápeto) e 9 menores (Pã, Dáfnis, Atlas, Prometeu,
  Pandora, Jano, Epimeteu, Febe). A casa tem 7 luas de Saturno.
- **Assets** (`public/textures/`, ~27 MB): mosaicos Cassini de 6 luas
  (1,6–3,3 MB cada), globo de Saturno 1,1 MB, `starmap.jpg` 1,3 MB, relevo
  (altura+normal PNG) 9,9 MB e **dois binários de anel de 8 KB + 6 KB**.
  Licenças no `NOTICE` — ver §6.

## 2. Técnica por técnica

| técnica dele | já temos? | ganho | custo (onde entra) | risco |
| --- | --- | --- | --- | --- |
| Perfil radial do anel **medido** (Björn Jónsson: 13.177 amostras a 5 km — cor, transparência, retro, frente, **lado escuro**) assado em 14 KB | **não** — a casa usa a placa `8k_saturn_ring_alpha` da SSS, uma FOTO com matte já denunciado em `gigante.ts` | dado real no lugar de foto; o lado de sombra deixa de ser adivinhado | `texturas.ts` (canal novo) + `gigante.ts` (troca a leitura da placa); +14 KB | baixo; conferir licença do dataset (§6) |
| Deslocamento radial de vértice por **mapa de altura de shape model real** (Gaskell/Schenk/Weirich) + normal map | **não** — luas da casa são esfera 128×64 lisa, só `map` | crateras aparecem no LIMBO e no terminador; é o que ele quer ver | `lua.ts` (vertex) + `texturas.ts` (2 canais) + tesselação maior; 2,5–8,4 MB | tesselação alta em todas as luas custa quadro; precisa LOD |
| **Bump por derivada de tela a partir do albedo** (`bumpMap = map`, escala 0,02) | **não** | relevo em luz rasante com **zero byte novo** | ~15 linhas de GLSL em `lua.ts` | nenhum; é aproximação declarada |
| **LOD de esfera em 3 níveis** com histerese ±10 % e trava para luas com relevo | **não** (esfera fixa 128×64) | paga a tesselação alta acima | `lua.ts`/`corpos.ts` | médio: mexe em caminho quente |
| Sombra do planeta no anel: elipsoide oblato + penumbra do disco solar | **igual** (`sombraDoPlaneta`, `gigante.ts`) | — | — | — |
| Sombra do anel no planeta: interseção analítica do plano + τ da placa | **igual** (`sombraDoAnel`) — a dele soma penumbra por 3 amostras | borda mais macia | 3 linhas em `gigante.ts` | nenhum |
| **Transmissão** pelo lado escuro do anel (Chandrasekhar) | **igual** — a casa já tem os dois ramos e a difração | — | — | — |
| **Ringshine** (anel ilumina o lado noturno do planeta): LUT de 64 latitudes integrada por quadro | **não** | o lado escuro de Saturno deixa de ser carvão | `gigante.ts` + classe nova; ~120 linhas, 0 asset | baixo; é o gêmeo da pendência que a casa já registrou (globo→anel) |
| Atmosfera por **raymarch** de espalhamento simples (Rayleigh+Mie, casca BackSide) | **não** (casa tem limbo, não integral) | limbo e terminador emergem, não são pintados | material novo | alto: caro por pixel, e briga com a lei da estrela |
| **Hapke** completo com parâmetros por lua (surto de oposição, HG) | **não, e por doutrina** — a casa usa Lommel-Seeliger com C=4/3 DERIVADO | — | — | **recusar**: parâmetros são ajustados a olho; o próprio código dele admite que a fase HG está com o pico no ângulo errado |
| Mosaicos Cassini de Schenk (PIA18434–18439), 1,6–3,3 MB por lua | **não** — casa usa NASA 3D 1440×720 (~0,5 MB) | mais resolução e cor natural | `ASSETS.md` + manifesto; +5× bytes | licença OK (domínio público), mas ele **regrada em shader** (dessatura + ganho): trazer a foto sem a grade muda a cor |
| Manchinha de ruído de alta frequência sobre o mosaico ("detail") para o close não ficar chapado | **não** | close-up sem borrão | 3 linhas em `lua.ts` | nenhum |
| Escada de resolução por preset com queda segura; rótulos projetados com oclusão e colisão; câmera grudada no corpo em movimento | **parecido nos três** (tier por canal e alvo de VRAM; `rotulos3d.ts`; escada de foco) | — | — | — |
| **URL como estado** (`?focus=&jd=&speed=&cam=az,el,dist,fov`) | **não, e ele já reprovou** | — | — | **recusar**: "URL knob o irrita" (decisão registrada) |
| Bloom radial gaussiano de verdade (corta o halo QUADRADO das mips) | **não** | halo redondo em estrela e Sol | pós-processo | médio: a casa tem lei própria de estrela |
| Lajota volumétrica de partículas para atravessar o anel; plumas de Encélado (até 1 M); anel E; anel F; raios do anel B; esteiras de autogravidade; ondas de Dáfnis | **não** | espetáculo específico de Saturno | muito código | fora de escopo agora |
| Presets Low/Med/High/Ultra + auto-ajuste por fps medido nos primeiros segundos | **parecido** (a casa mede e tem tiers) | — | — | — |

## 3. O que trazer, em ordem

**A. O perfil radial medido do anel (14 KB).** Assar `rings_profile.bin`
(2048 × RGBA8: cor + opacidade) e `rings_scatter.bin` (2048 × RGB8: retro,
frente, **lado escuro**) a partir do modelo do Björn Jónsson, como
`scripts/bake-rings.mjs` faz. Entra como canal novo no manifesto e troca a
leitura de `placa` em `ANEL_FRAG`. **Conversa direto com o item 133**: hoje o
τ do lado escuro sai de uma foto que a própria casa mediu e reprovou (matte
azul no anel C, `COR_DO_GELO_DO_ANEL`); com o dado medido, o anel B fica
preto por trás e a divisão de Cassini acende, sem chute. É o maior ganho pelo
menor byte de toda a colheita.

**B. Relevo nas luas — em dois degraus.**
*B1, de graça:* bump por derivada de tela a partir do `map` que a casa já
tem (o `proceduralNormal` dele, 15 linhas de GLSL em `lua.ts`). Faz cratera
aparecer em luz rasante sem baixar um byte. Fazer PRIMEIRO e fotografar.
*B2, com asset:* deslocamento radial por mapa de altura assado dos shape
models reais (Mimas e Tétis Gaskell SPC, Encélado Schenk & McKinnon 2024,
Dione Weirich 2025) + normal map. É o que produz cratera **no limbo**, que a
foto dele mostra e a nossa não tem. Assar em 1024×512 e webp: as quatro luas
cabem em ~2 MB (os PNG dele somam 8,4 MB porque Encélado está em 2048).
**Não trazer Reia e Jápeto**: o relevo deles no projeto dele é INVENTADO (não
existe DTM público) — a casa não desenha topografia fabricada.
*B3, obrigatório junto com B2:* LOD de esfera em 3 níveis com histerese, e a
armadilha que ele documentou — lua com relevo tem de ficar na malha fina
enquanto o limbo é legível, senão o terreno colapsa numa bola lisa.
Conversa com o item **114** (mais luas ⇒ mais esferas na tela).

**C. Ringshine — o anel ilumina a noite de Saturno.** LUT de 64 latitudes,
integrando o anel como fonte extensa com a curva de retro/lado-escuro do
bloco A. Zero asset. É o gêmeo exato da pendência que `gigante.ts` já
registra na direção contrária (globo→anel, ~5 % no D a ~0,2 % no F): o mesmo
integrador serve às duas, e resolvê-las juntas fecha o buraco de luz que
sobra no item 133.

**D. Penumbra na sombra do anel sobre o globo.** Três amostras do perfil
(`u−p`, `u`, `u+p`, pesos ¼-½-¼) com meia-largura `t · θ☉` — três linhas em
`sombraDoAnel`, e o degrau serrilhado vira borda macia.

**E. Manchinha de detalhe no close.** Ruído fractal fraco (±6 %) multiplicado
no albedo da lua, para o close não virar borrão onde o mosaico acaba. Três
linhas, zero asset.

**F. Mosaicos de Schenk (só se o dono quiser mais resolução).** PIA18434–18439,
domínio público, 1,6–3,3 MB por lua contra os 0,5 MB de hoje. Só depois de B:
relevo rende mais que resolução de cor. E a cor dele **é graduada em shader**
(dessatura 0,3, ganho por lua) — importar a foto crua sem a grade deixa as
luas com a cor IR/UV realçada do produto original.

## 4. O que NÃO trazer

*(Revisto em 02/09 pela palavra dele — "vamos fazer tudo isso, inclusive os jatos de Encélado": os jatos e o espetáculo dos anéis SAÍRAM desta lista e viraram as fases S4 e S5 do item 134. Fica aqui só o que continua fora por doutrina.)*

- **Hapke completo com parâmetros por lua.** A casa recusa por doutrina
  (`lua.ts`): exige parâmetros medidos por corpo e sem eles é invenção com
  cara de física. O código dele confirma o risco — um comentário admite que
  a fase Henyey-Greenstein está com o pico no ângulo errado.
- **Relevo sintético de Reia e Jápeto.** Ele declara que é procedural; a casa
  não desenha topografia inventada (é a mesma regra do mapa de Ceres).
- **Estado na URL** (`?focus=&cam=`). Ele já disse que URL-knob o irrita.
- **`starmap.jpg`** (Deep Star Maps 2020). A casa constrói a Via Láctea
  procedural das fotos do Gaia — uma equiretangular pintada é o oposto disso.
- **Atmosfera por raymarch** nesta rodada: cara por pixel e encosta na lei da
  estrela e na auto-exposição. Fica anotada, não agendada.
- **Espetáculo específico de Saturno** (lajota volumétrica, plumas de 1 M,
  anéis E e F, raios do anel B, esteiras de autogravidade, ondas de Dáfnis):
  bonito e caro, e nada disso resolve 133 nem 114.
- **Presets Low/Med/High/Ultra e auto-ajuste por fps.** A casa já mede e já
  tem tier de textura; seria peça duplicada.

## 5. As luas menores dele (nota para o item 114)

Pã, Dáfnis, Atlas, Prometeu, Pandora, Jano, Epimeteu, Hipérion e Febe são
esculpidas na CPU: icosaedro `detail` 18–20, eixos a/b/c publicados, campo de
crateras determinístico, e as **máscaras de fundo/borda/cavidade viajam como
atributos de vértice** — por isso o piso escuro fica DENTRO da cratera, e não
é um padrão celular pintado por cima. Receita útil se o 114 quiser luas
pequenas sem foto, **sem nenhum asset**: forma medida onde existe, cratera
procedural declarada onde não existe.

## 6. Licenças e fontes do que valeria importar

| asset | fonte | licença | tamanho |
| --- | --- | --- | --- |
| Perfis radiais do anel (cor, transparência, retro, frente, lado escuro) | Modelo de anéis de Björn Jónsson — Voyager PPS + Cassini, via PDS Ring-Moon Systems Node; 13.177 amostras a 5 km | **verificar com o autor antes de assar** — ele credita mas não cita licença; a base PDS é domínio público | 14 KB assados |
| Shape model de Mimas e Tétis | Gaskell SPC V2.0 / V1.0, NASA PDS | domínio público | ~1 MB assados (1024, webp) |
| DEM global de Encélado 200 m | Schenk & McKinnon 2024, USGS Astropedia — citar *Icarus* 408, 115827 | domínio público, com citação | ~0,6 MB assados |
| DTM de Dione | Weirich et al. 2025, NASA PDS SBN | domínio público | ~0,5 MB assados |
| Mosaicos globais de cor das luas | Paul Schenk, Cassini — NASA/JPL-Caltech/SSI/LPI, PIA18434–18439 | domínio público | 1,6–3,3 MB por lua |
| Globo de Saturno | Solar System Scope (INOVE CZ) | CC BY 4.0 | a casa **já usa** este mesmo mapa |

Único item com licença em aberto: o dataset do anel, que é o bloco A. Antes
de assar, escrever ao autor ou tirar os perfis direto do PDS.

## 7. As fotos do site dele

Capturadas do site publicado (Chrome com GPU, WebGL2, 1280×800):

- `capturas/item134-saturn-dele-sistema.png` — o sistema sobre a Via Láctea.
- `capturas/item134-saturn-dele-mimas-crateras.png` — **a foto que interessa**:
  Mimas a 1.100 km, crateras com sombra própria e o LIMBO recortado pelas
  bordas (deslocamento de vértice, bloco B2).
- `capturas/item134-saturn-dele-aneis-perto.png` — anel a 190.000 km contra o
  Sol: acende por difração enquanto o globo é uma foice, e a sombra do
  planeta corta o anel à esquerda.
- `capturas/item134-saturn-dele-aneis-lado-escuro.png` — o mesmo de longe.

Nota honesta: as quatro saíram em fase alta (150°–167°) porque a data da
simulação é a de hoje e a URL não fixou o ângulo do Sol — são fotos CONTRA a
luz. Servem para o 133; o lado iluminado pediria outra data.
