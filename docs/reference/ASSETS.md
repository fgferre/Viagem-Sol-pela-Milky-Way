# ASSETS — negativos medidos

Fonte única dos vereditos da bancada (`scripts/visual/bancada-assets.html`,
D4). Textura que perdeu fica aqui para não renascer. Resolução é o pixel
contado, nunca o nome do arquivo.

## Titã — mosaico Cassini não entra

Incumbente da casa: NASA 3D Resources, **720×360**, 49 KB, névoa
laranja. O mosaico Cassini/VIMS (candidato da bancada, ~3,6 MB com
Europa) mostra **emendas de longitude** na esfera (a costura 0/360 do
WRAP) e é monocromático no produto USGS sem crédito redigido no
momento do julgamento. A bancada não promoveu. Fica pendente: crédito
USGS redigido + emendas tratadas.

## Europa — 68 linhas de no-data

Incumbente: NASA 3D Resources, **1440×720**, 611 KB, mono declarado.
O mosaico USGS/Voyager+Galileo traz **68 linhas pretas de no-data**
sobre a calota sul. Sem máscara/preenchimento não entra: o WRAP faria
um anel negro no polo. Pendente: as 68 linhas tratadas + crédito USGS
redigido.

## Ceres — o inventado saiu (item 141, 3ª fase)

Incumbente ATÉ 03/09: Solar System Scope `2k_ceres_fictional`,
**2048×1024**, CC BY 4.0 — a fonte **admitia** que o mapa era inventado.
Era a única textura da casa cuja própria origem se declarava ficção, e ela
**perdeu**: no lugar entrou o mosaico global real da Framing Camera da Dawn
(`Ceres_Dawn_FC_DLR_global_20ppd_Oct2015`, DLR via USGS Astrogeology,
7383×3691, 27 MB, domínio público), entregue a **4096×2048**. O que a casa
fez com ele está na seção do relevo, abaixo: giro de 180°, tingimento
uniforme e preenchimento do polo sul. O mapa inventado não volta.

## 2k sem licença no doador (não atravessaram)

O doador servia Júpiter canônico, Urano, Titã incumbente e Europa
ativa **sem linha de licença**. A casa não os copiou. Júpiter/Urano
cá são SSS CC BY 4.0 (o `8k_jupiter` mede **4096** px — o nome
mente). Titã/Europa cá são NASA 3D (acima). O “candidato de Júpiter”
do doador era um mapa **de Io** (NASA 3D Io B).

## GLB/OBJ — pipeline de malha irregular

`Vesta_1_100.glb`, `Haumea_1_1000.glb` (NASA), `Pallas_DAMIT_101.obj`,
`Hygiea_DAMIT_4392.obj` (DAMIT CC BY 4.0): licença fecha; a casa não
tem `GLTFLoader`/`OBJLoader`. F7 renderiza elipsoide BODY_AXES + LS.
Pendência **P-F7-MESH**.

## Licenças vivas

A autoridade de textura da casa é `public/data/atlas/texturas.json`
(crédito por linha). Sem licença documentada não entra. O inventário
do repositório atlas-orbital não vale aqui.

## Perfil radial do anel de Saturno (item 134)

- `public/data/atlas/anel-saturno-perfil.bin` (8.192 B, 2048 × RGBA8: cor
  da partícula + opacidade) — **modelo de anéis
  de Björn Jónsson** (Voyager PPS + Cassini, via o PDS Ring-Moon Systems
  Node; 13.177 amostras a 5 km, 74.510–140.390 km), reamostrado em 2.048
  caixas sobre 66.900–140.500 km. Trazidos do projeto Saturn do dono
  (https://github.com/fgferre/Saturn, `scripts/bake-rings.mjs`), que os
  credita no `NOTICE` **sem linha de licença**. Uso com crédito ao autor;
  **licença não declarada pelo autor** — a base do PDS é domínio público,
  mas o modelo dele não diz. PENDÊNCIA DESTE ARQUIVO: confirmar com o
  autor (ou refazer os perfis direto do PDS) antes de publicar. Consumidor:
  `world/corpos/gigante.ts` (τ, cor e sombra do anel). O segundo binário
  dele (retro/frente/lado escuro) ficou de fora: normalizado por canal, a
  razão entre as faces se perdeu na assadura. Com ele, o canal `ring` da
  placa (`texturas.json`) deixou de ser pedido por Saturno.

## Os mosaicos das seis luas de Saturno (item 138)

O `map` de Mimas, Encélado, Tétis, Dione, Reia e Jápeto era o da NASA 3D
Resources, **1440×720 e MONOCROMÁTICO** (R = G = B medido, R/B = 1,000 nos
seis). Em Jápeto ele levava a dicotomia ao extremo — piso 2/255, desvio 88,8
contra 57,7 do mosaico — e era isso que o dono via como *"totalmente feio"*:
manchas pretas duras sobre branco estourado. Os seis foram trocados pelos
**mosaicos globais Cassini de Paul Schenk (PIA18434–18439,
NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute,
domínio público)**, graduados para cor natural no **projeto Saturn do dono**
(https://github.com/fgferre/Saturn, `public/textures/`) — 3840×1920 a
4096×2048, coloridos (R/B 1,04 a 1,11).

| lua | mosaico (px) | webp cinema | webp alta | webp perf. |
| --- | --- | --- | --- | --- |
| Mimas | 4096×2048 (fonte dele 6356×3178, reamostrada) | 1,03 MB | 0,42 MB | 0,15 MB |
| Encélado | 4096×2048 | 2,81 MB | 0,80 MB | 0,19 MB |
| Tétis | 3840×1920 | 2,66 MB | 0,81 MB | 0,20 MB |
| Dione | 3840×1920 | 2,32 MB | 0,69 MB | 0,16 MB |
| Reia | 4096×2048 | 2,57 MB | 0,77 MB | 0,20 MB |
| Jápeto | 3840×1920 | 1,32 MB | 0,41 MB | 0,11 MB |

Mimas veio 6356 px e foi **reamostrada para 4096** (lanczos3): a 1080 px de
disco em cinema, 4096 já dá 1,9 texel por pixel, e o 6356 custaria 108 MB de
VRAM contra 45 MB — a dose do §"alvo de pixels" existe para isso.

**A MEIA VOLTA (o defeito que a S2 trouxe sem saber).** Os mosaicos dele —
e os mapas de altura/normal assados a partir deles — usam o layout Schenk
(*"east longitude 0..360 left→right"*), com o meridiano sub-Saturno na
EMENDA; o `map` do atlas põe o sub-Saturno no MEIO. O projeto dele resolve
com `tex.offset.x = 0.5` no carregador, e o `bake-moon-relief.mjs` dele
avisa: *"pair with the runtime texture offset of 0.5"*. A S2 trouxe os
mapas de altura/normal **sem essa meia volta**, e o relevo das SEIS luas
ficou no antípoda do albedo. Medida: a bacia de Herschel está no albedo NASA
3D de Mimas em u = 0,194 (o lugar certo: 104° W dá u = 0,211) e o mínimo do
mapa de altura estava em u = 0,695 — meia volta exata. Conserto: os doze
mapas de relevo e os seis mosaicos foram **girados meia volta no próprio
arquivo** (`np.roll` de W/2), não no shader — assim toda a árvore fala UMA
convenção e nenhum corpo precisa de bandeira de layout. Depois do giro o
mínimo da altura de Mimas está em u = 0,197, e as duas Herschel (a do
mosaico e a da altura) coincidem no mesmo x quando as folhas se empilham.

**A GRADUAÇÃO.** Os mosaicos Schenk são de cor realçada em IR/UV: o detalhe
é o melhor que existe, o matiz é exagerado e o nível é baixo. A tabela
`MAP_GRADING` dele atravessou letra por letra para `GRADUACAO_DO_MOSAICO`
(`world/corpos/rochoso.ts`) — desatura rumo à luminância e multiplica por um
ganho, com Encélado em 1,35 por ser o corpo mais reflexivo do Sistema Solar.
**Declarado:** os ganhos dele foram calibrados para a exposição DELE (AgX
1,4, Sol 3,4); na exposição da casa (ACES 1,05) o nível linear dos seis
mosaicos é 1,7× a 3,4× mais baixo que o dos mapas NASA 3D que saíram, e o
disco renderizado sai 1,2× a 1,7× mais escuro que antes. Subir os ganhos até
igualar estouraria de 1,4 % a 15 % do mapa — é decisão do dono, não conserto.

## Relevo das seis luas de Saturno (item 134, S2)

Dois canais novos por lua — `height` (mapa de altura equiretangular, que
desloca o vértice) e `normal` (mapa de normais, que gira a luz) — em
1024×512, `.png` de fallback e `.webp` **sem perda**. O webp de cor (q88)
foi medido e reprovado para estes dois: no mapa de altura de Mimas erra até
8/255 (= 0,64 km de relevo falso, ~1,6 px de faceta no limbo em close) e no
de normais, 51/255. A regra vive em `scripts/data/atlas/otimiza-texturas.mjs`
(`CANAIS_DE_DADO`) e vale só para fonte PNG — `earth/normal` continua q88
porque a fonte dele já é jpg.

Todos vêm do **projeto Saturn do dono** (https://github.com/fgferre/Saturn,
`public/textures/relief/`), que os assou a partir dos modelos abaixo; as
escalas de deslocamento (`span`/`bias` como fração do raio) vêm do
`relief.json` dele e moram em `RELEVO_DA_LUA` (`world/corpos/rochoso.ts`).
Encélado veio em 2048 e foi reamostrado para 1024 (lanczos3).

| lua | topografia | licença | webp (altura + normal) |
| --- | --- | --- | --- |
| Mimas | modelo de forma SPC V2.0 (R. Gaskell), NASA PDS | domínio público | 103 + 477 KB |
| Tétis | modelo de forma SPC V1.0 (R. Gaskell), NASA PDS | domínio público | 143 + 492 KB |
| Encélado | DEM global 200 m — Schenk & McKinnon 2024, USGS Astropedia | domínio público, **citação obrigatória**: *Icarus* 408, 115827 | 296 + 728 KB |
| Dione | DTM SPC — Weirich et al. 2025, NASA PDS SBN | domínio público | 228 + 512 KB |
| Reia | **relevo SINTÉTICO** — não existe DTM público de Reia; campo de crateras gerado por código no projeto Saturn | código do autor | 108 + 232 KB |
| Jápeto | **relevo SINTÉTICO** — não existe DTM público de Jápeto; campo de crateras por código, com a crista equatorial real (~13 km) modelada | código do autor | 104 + 209 KB |

Total baixado pelo visitante: **3,55 MB** em webp (10,06 MB em disco com o
`.png` de fallback). O `NOTICE` do projeto dele é a fonte destas linhas e
declara os dois sintéticos com todas as letras: *"Rhea and Iapetus have no
public DTM as of 2026; their relief is synthetic"*.

**Reia e Jápeto entraram por decisão DELE (02/09, S2b):** *"queremos o
relevo sobressaído, sabemos que Reia não é uma esfera, ela é acidentada"*.
O relevo das duas **não é medida** — é campo de crateras gerado por código
no projeto Saturn dele —, e é isso que a ficha imprime na seção *a imagem*,
na linha `relevo`. As amplitudes são as dele (`relief.json`: 2,6 % do raio
nas duas), sem corte: o `span`/`bias` do projeto é o piso, não o teto.

## As nove luas esculpidas de Saturno (item 134, S3)

Pã, Dáfnis, Atlas, Prometeu, Pandora, Jano, Epimeteu, Hipérion e Febe
entraram **sem um único byte de imagem**: a forma é malha gerada por código
(`src/three/world/corpos/esculpido.ts`) e a cor é família de regolito em
GLSL. Não há textura, não há mapa de altura, não há download.

O esculpidor e as duas tabelas de dado (razões de eixo + campo de crateras;
cor de base, de fundo de cratera, de borda e de crista) vêm do **projeto
Saturn do dono** (https://github.com/fgferre/Saturn,
`src/scene/irregularMoonGeometry.ts` e `src/materials/moonMaterials.ts`),
trazidos com autorização dele. O material da casa é reescrito — o dele é
`MeshStandardNodeMaterial` do TSL, que esta casa não usa.

| dado | fonte | licença |
| --- | --- | --- |
| Raio médio de cada lua e elementos orbitais (a, e, i, nodo, periastro, M₀, período) | NASA/JPL Solar System Dynamics — *Planetary Satellite Mean Orbital Parameters* (https://ssd.jpl.nasa.gov/sats/elem/), transcritos em `src/data/saturn.ts` do projeto dele | domínio público |
| Elementos de Febe no frame ECLÍPTICO (i = 173,04° ⇒ retrógrada) | JPL SSD, tabela de satélites irregulares (`PHOEBE_ECLIPTIC` dele) | domínio público |
| Razões de eixo e morfologia (crista de acreção dos pastores, cratera profunda de Hipérion, polo sul rebaixado de Epimeteu, escuridão de Febe) | páginas de corpo da NASA/Cassini, ligadas uma a uma no cabeçalho de `esculpido.ts` | domínio público |
| Polo de Saturno usado na mudança de frame e na orientação modelada | IAU/WGCCRE, α₀ = 40,589°, δ₀ = 83,537° (o mesmo do kernel que a casa já carrega) | domínio público |

**O que NÃO é medido, e está confessado na tela** (tabela *a forma*,
abaixo): o campo de crateras é procedural por semente, e o meridiano-primo
das nove é W₀ = 0 arbitrário — numa superfície inventada não há feição
medida em que ancorá-lo. A fase orbital também não é efeméride: os
elementos são MÉDIOS na época J2000 e a propagação é de dois corpos, então
uma lua de 0,575 dia acumula dezenas de graus de longitude em 26 anos. A
órbita, o tamanho, a inclinação e o sentido, sim.

## Fonte dos rótulos 3D (item 109)

- `public/fonts/inter-400.woff` — **Inter** (regular, subconjunto
  latin), de @fontsource/inter 5.0.18 (`files/inter-latin-400-normal.woff`,
  via `npm pack`). Licença **SIL Open Font License 1.1**. Formato woff1
  de propósito: o parser de fontes do troika digere ttf/otf/woff mas
  NÃO woff2 (a variante woff2 deste mesmo pacote travava o `sync` para
  sempre — item 109). Consumidor único: `world/rotulos3d.ts` (o texto
  SDF do troika). Sem ela o troika buscaria glifos num CDN em tempo de
  execução — esta casa é autocontida.

## Fonte da frase de encerramento (item 108)

O véu do fim do filme fecha com uma frase que **não é da casa**:

- **"Olhe de novo esse ponto. É aqui. É o nosso lar. Somos nós."** —
  Carl Sagan, *Pale Blue Dot: A Vision of the Human Future in Space*
  (Random House, 1994), do trecho escrito sobre a fotografia da Terra
  feita pela Voyager 1 em 14/02/1990. Tradução da casa do original
  *"Look again at that dot. That's here. That's home. That's us."*
- O texto mora num lugar só: **`src/components/encerramento.ts`**, como
  lista de linhas (o `Hud.tsx` só encena). É lá que se acrescenta linha
  se a citação for estendida à mão.
- O que entra é só ESSA citação curta, e ela entra **atribuída na
  própria tela** — `— Carl Sagan`, com `Pale Blue Dot, 1994` embaixo. O
  parágrafo longo do livro **não entra**: é obra protegida, e citação
  curta com crédito é outra coisa que reprodução. Quem estender a lista
  estende o que a casa cita de outra pessoa, e essa fronteira é aqui.
- Quem trocar a frase troca frase e crédito juntos: frase sem crédito na
  tela é o defeito que esta seção existe para não deixar acontecer, e
  `scripts/visual/filme-smoke.mjs` reprova a tela final sem a linha do
  crédito.

## O relevo da Lua (item 140)

A Lua tinha só o mapa de cor. O relevo dela vinha do **bump por derivada do
albedo** da S2 do item 134: a normal era torcida pelo gradiente da própria
cor, então mancha escura virava buraco e mancha clara virava crista. Nos
mares e nos raios de Tycho isso é o contrário do terreno — o mar é uma
planície LISA e escura, e o raio é poeira clara sobre chão plano. Palavras
do dono: *"não corresponde mais ao que observamos"*.

A fonte do conserto é o **LDEM do LOLA/LRO**, publicado pelo NASA SVS no CGI
Moon Kit (<https://svs.gsfc.nasa.gov/4720>, domínio público). Entrou o
`ldem_16_uint.tif`: 5760×2880, 16 pixels por grau, inteiro sem sinal de 16
bits com o deslocamento que a própria página declara — altura em metros =
`(valor − 20000) × 0,5`, sobre a esfera de referência de 1737,4 km.

`scripts/data/atlas/gera-normal-de-dem.mjs` assa dele um mapa de NORMAIS
equiretangular de 4096×2048 (escada 2048/1024), em **amplitude física**: as
derivadas são metros por metro sobre a esfera (passo leste `R·cos(lat)·dLon`,
passo norte `R·dLat`), **sem ganho nenhum** — inclinação RMS medida 6,9° e
máxima 40,2°. A Lua é o único corpo da casa com relevo assim, e por isso ela
saiu da tabela `BUMP_DO_ALBEDO`: quem tem a normal medida não precisa da
inventada.

O relevo entra **só na iluminação**. Nada desloca vértice: a silhueta segue
sendo a da esfera exata de `BODY_AXES`, e o que o mapa faz é girar a normal
para o Sol desenhar sombra DENTRO da cratera — que é o pedido do dono ("a
lua só aparece a iluminação fazendo como se fosse sombra nas crateras").

O TIFF de origem **não fica na árvore**: são 33 MB de matéria-prima para um
produto de 12,9 MB, e o script o apaga depois de assar.

O alinhamento é conferido por MEDIDA, não por fé: o script correlaciona a
altura com a luminância do mapa de cor (mares baixos e escuros, terras altas
e claras) e recusa a assar abaixo de +0,3. Sem deslocamento nenhum ela dá
**+0,61** — o LDEM e o mapa da Solar System Scope estão na mesma convenção
de longitude, e não há a meia volta que o item 138 achou nas luas de Saturno.

## O relevo de Mercúrio e de Marte (item 141)

A mesma técnica da Lua, nos dois corpos seguintes que têm DEM global,
público e de domínio público. Os dois vinham do **bump por derivada do
albedo**, e em Marte a aproximação era grotesca: 2 % do raio de pico a pico
são 68 km de relevo falso, num planeta cujo Olympus Mons — o mais alto do
Sistema Solar — tem 22 km.

**Mercúrio**: `Mercury MESSENGER Global DEM 665 m v2` do USGS Astrogeology
(<https://astrogeology.usgs.gov/search/map/mercury_messenger_usgs_dem_global_665m_v2>,
domínio público), 23040×11520, inteiro COM sinal de 16 bits. A conversão
está no próprio GeoTIFF e o script a LÊ (`GDALMetadata`: `OFFSET` 0,
`SCALE` 0,5) — altura em metros = `valor × 0,5` sobre a esfera de 2439,4 km
que a geokey do arquivo declara; ele recusa a assar se esses metadados
divergirem da tabela. O arquivo tem 530 MB e **não é baixado**: ele é um
TIFF sem compressão, uma tira por linha e tiras contíguas, então a leitura
é por FAIXAS HTTP — só as linhas que a grade de 4096×2048 usa: 212 MiB
medidos (180 do assamento + 32 da guarda) em vez de 530 MB. Preço declarado: das 5,6 linhas de origem que cabem em cada
linha de saída, a média usa 2 (nas colunas ela é completa); é borrão de
latitude, não deslocamento. Inclinação medida: RMS 2,86°, máxima 56,43°.

**Marte**: `MOLA MEGDR` a 16 pixels por grau (`megt90n000eb.img`, PDS
Geosciences, <https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/>,
domínio público), 5760×2880, inteiro com sinal MSB, **em metros diretos**
sobre o areoide — o rótulo PDS não traz escala nem deslocamento, e o script
baixa esse rótulo e confere dimensões, tipo, bits e raio (3396 km) antes de
assar. Inclinação medida: RMS 1,94°, máxima 30,35°. Marte é liso nesta
régua, e isso é fato, não perda: a 5,2 km por texel o que a luz desenha é a
parede de Valles Marineris e o flanco dos vulcões, não a duna.

**A MEIA VOLTA, medida.** Os dois DEMs nascem com a borda esquerda em
longitude 0° (meridiano central 180°) e as texturas de cor da casa são
centradas em 0° — meia volta de diferença, que é o defeito que o item 138
achou nas luas de Saturno. O giro é feito no dado, e a guarda do gerador o
CONFERE: ela correlaciona a energia de borda (`|∇altura|` contra
`|∇albedo|`) na orientação declarada e na meia volta, e recusa a assar se a
declarada não vencer. Medido: Mercúrio 0,201 contra 0,018, Marte 0,133
contra −0,017, Lua 0,261 contra 0,008. A correlação COM SINAL do item 140
(mar baixo e escuro, terra alta e clara, +0,61) continua valendo **só na
Lua**: em Mercúrio ela é negativa (−0,15) e em Marte fraca (+0,17), porque
lá o albedo é composição e poeira, não forma — exigir sinal seria exigir
uma física que não existe.

**Só na iluminação, como na Lua.** Nada desloca vértice: a silhueta segue a
do elipsoide de `BODY_AXES`, a esfera continua a de 128×64, e os dois saem
da tabela `BUMP_DO_ALBEDO` (`NORMAL_MEDIDA`, em `rochoso.ts`, é a lista de
quem tem a normal medida). Os TIF/IMG de origem não ficam na árvore.

## O relevo de Ceres e de Vesta (item 141, 2ª fase)

Os dois corpos que a sonda **Dawn** mapeou, e os dois primeiros em que a
técnica encontrou um problema que a Lua, Mercúrio e Marte não tinham: o
**elipsoide de `BODY_AXES` deles não é quase-esfera**. Ceres é 487,3×446 e
Vesta 289×280×229, e `normalDoCorpo` já desenha essa figura. Um DEM medido
sobre esfera carrega a figura global inteira — em Vesta são 60 km de
achatamento num raio de 255 km, uma rampa sistemática de ~8° que a geometria
JÁ desenha —, e assá-la no mapa contaria a mesma forma **duas vezes**. Por
isso o gerador subtrai o raio do elipsoide de revolução da casa antes de
derivar (campo `eixosDaCasaKm`), e o que vai para o mapa é o relevo SOBRE a
bola desenhada. Preço declarado: a subtração é axissimétrica (a equatorial é
a média de *a* e *b*), então os 9 km entre os dois eixos equatoriais de Vesta
ficam no resíduo como rampa suave, e a diferença entre o elipsoide da casa e
o que a Dawn mediu (Ceres 487,3 aqui contra 482 lá) também.

**Ceres**: `Ceres Dawn FC HAMO DTM Global 137m` (DLR, distribuído pelo USGS
Astrogeology, <https://astrogeology.usgs.gov/search/map/ceres_dawn_fc_hamo_dtm_global_137m>,
domínio público), 21600×10800, inteiro COM sinal de 16 bits, 466 MB — lido
por FAIXAS HTTP como o de Mercúrio, **198,41 MB** medidos, sem baixar o
mosaico. A conversão está no próprio GeoTIFF e o script a LÊ (`GDALMetadata`:
`OFFSET` 470000, `SCALE` 1): o texel é a altura sobre a esfera de 470 km que
o rótulo PDS3 e a geokey declaram, e o offset a devolve como RAIO em metros —
que é a forma de que a subtração do elipsoide precisa. Inclinação medida:
**RMS 10,86°, máxima 63,62°** — o maior número da casa, e ele é fato: a 4096
px cada texel de Ceres cobre 0,73 km (contra 2,7 na Lua e 5,2 em Marte), e
nessa régua a parede de cratera aparece inteira.

**A GUARDA DE CERES, e o mapa de cor que ela obrigou a trocar.** Na 2ª fase
o mapa de cor de Ceres era o `2k_ceres_fictional`, invenção declarada pela
própria fonte, e correlacionar topografia medida com invenção não prova nada:
a guarda mediu contra o mosaico REAL da Dawn, baixado só para isso — energia
de borda **0,2124** na orientação declarada contra **−0,0056** na meia volta,
pico agudo em 0° na varredura das 72 defasagens. A correlação COM SINAL dá
**−0,39**, e é assim mesmo: em Ceres o chão claro é o fundo de cratera com
sal (as fáculas de Occator), não a terra alta.

**Na 3ª fase (03/09) esse mesmo mosaico virou o MAPA DE COR** e a exceção
morreu — a guarda de Ceres passou a medir contra o que a tela mostra, como
nos outros quatro. Medido depois da troca, contra o `map.jpg` entregue:
**0,2134** na orientação declarada contra **−0,0029** na meia volta, pico
agudo em 0° na varredura das 72 defasagens (a segunda melhor posição vale
0,068) e correlação com sinal **−0,3843** — os mesmos números da 2ª fase,
agora medidos contra o que a tela mostra. O que a casa faz com o mosaico, e
só isto:

- **giro de 180°** — o GeoTIFF declara meridiano central 180° (geokey 3088)
  com a borda esquerda em 0°E, e as texturas da casa começam em 180°. É o
  MESMO giro que o DTM leva, e é o que faz cratera e relevo caírem juntos.
  Conferido por olho: a cratera **Occator**, com as fáculas de Cerealia, cai
  em 239,3°E / 19,9°N, o que a IAU publica.
- **tingimento uniforme, declarado**: a Framing Camera fotografou no filtro
  claro, então o mosaico é CINZA — não existe cor de Ceres em imagem. O
  cinza vira cor por um fator fixo por canal, **R 1,021 / G 1,000 / B 0,946**,
  tirado dos índices de cor publicados contra os do Sol (B−V 0,71 contra
  0,65; V−R 0,375 contra 0,352). É pouco de propósito: Ceres é quase neutro,
  e o marrom vistoso do mapa antigo era invenção. O NÍVEL não é mexido — o
  mosaico entra com o brilho que o USGS publicou (média 118/255).
- **preenchimento do polo sul**: a Dawn mapeou Ceres com o polo sul em NOITE
  POLAR, e 3,6 % dos texels do mosaico são vazio preto abaixo de −84°.
  Deixá-los seria a mancha negra no polo que fez esta mesma bancada RECUSAR o
  mosaico de Europa. O buraco é tapado com a média da última faixa de
  latitude que tem dado, e o preenchimento é POLAR: só acima de |80°|. Fora
  dos polos nada é tocado — os 0,04 % de texels escuros que sobram são sombra
  de cratera, que é medida.

Fica declarado o que NÃO foi corrigido: o mosaico não é achatado
fotometricamente, e o brilho médio cai de 145/255 no equador para 84 no polo
norte e 68 no sul — a luz da casa escurece de novo por cima disso.

**Vesta**: `Vesta Dawn HAMO DTM Global 93m` (DLR, via USGS Astrogeology,
<https://astrogeology.usgs.gov/search/map/vesta_dawn_hamo_dtm_global_93m>,
domínio público), 17280×8640, **ponto flutuante de 32 bits** (o leitor por
faixas do gerador aprendeu esse formato aqui), 597 MB, lidos por faixas. O
TIF não traz `GDALMetadata`: o float **já é o raio em metros** (medido: 279
km de média no equador, 224 no polo), e a esfera de 255 km do rótulo é só a
projeção, não o corpo. Inclinação medida DEPOIS de tirar o elipsoide da casa:
**RMS 17,44°, máxima 84,61°** — o número mais alto da casa, e Vesta é
mesmo assim: a 4096 px cada texel dela cobre 0,41 km, e nessa régua a
escarpa de Rheasilvia e as fossas equatoriais entram inteiras. A repartição
por eixo (`capturas/item141-anisotropia.mjs`) dá 11,66° leste-oeste contra
13,33° norte-sul, razão 1,15 — a média de caixa que usa 2 das 4,2 linhas de
origem NÃO está fabricando ruído (em Ceres a razão é 1,03, em Mercúrio 0,89).

**OS 150° DE VESTA — medidos na 2ª fase, consertados na 3ª.** Vesta tem dois sistemas de longitude em
circulação — o "Claudia" com que a Dawn operou e o "Claudia Double Prime" que
a IAU aprovou, ~150° apartados. Com a orientação que o rótulo do DEM declara,
**a guarda reprovou**; a varredura das 72 defasagens achou o pico em **150°**
(0,1359 contra 0,062 na declarada, sobre um fundo de 0,046–0,089). Para saber
QUEM está fora, a mesma varredura foi feita entre dois ALBEDOS — o mosaico de
cor da própria USGS (74 px/grau, lido por faixas) contra o `map.jpg` da casa:
pico **também em 150°**, com 0,3118. Os dois produtos da USGS/DLR concordam
entre si, e quem está deslocado é **o mapa de cor que a casa carrega** (o
mosaico embutido no modelo 3D da NASA). Como a casa orienta Vesta pela IAU
(`iauOrientation.ts`, pck00011, W₀ = 285,39°), esse mapa de cor estava 150°
fora do meridiano que o próprio motor usa — defeito ANTERIOR ao item 141. A 2ª
fase alinhou o RELEVO ao mapa de cor (borda esquerda do DEM em 30° = 180 −
150), porque cratera e mancha casando é o que o olho vê, e deixou o conserto
de raiz pendente.

**A 3ª fase fez o conserto de raiz**: o mapa de cor é girado **−150°** na
aquisição (`baixa-texturas.mjs`, campo `giroDeLongitudeGraus`) e o relevo
voltou ao rótulo do DEM (borda esquerda em 180°, giro 0). Agora os dois estão
na IAU, e a face que o Sol ilumina numa data também é a certa — não só o
casamento entre cratera e mancha. A guarda passa **sem varredura**, com a
varredura confirmando pico em 0°. Rastro em
`capturas/item141-vesta-longitude.txt` (2ª fase) e
`capturas/item141c-guardas.txt` (3ª).

**Só na iluminação, como nos outros.** Nada desloca vértice: a silhueta segue
a do elipsoide de `BODY_AXES`, a esfera continua a de 128×64, e os dois saem
da tabela `BUMP_DO_ALBEDO` (`NORMAL_MEDIDA`, em `rochoso.ts`, é a lista de
quem tem a normal medida). Vesta entra nessa lista de zeros AGORA: o mosaico
dela é real, mas o que o bump lia como cratera era em boa parte a mancha de
composição da crosta. Os TIF de origem não ficam na árvore.

## As cinco luas de Urano e Tritão — o hemisfério que a Voyager não viu (item 147)

Os `map` de Miranda, Ariel, Umbriel, Titânia, Oberon e Tritão são os da NASA
3D Resources (1440×720, monocromáticos), e cada um traz um **hemisfério em
preto puro**: a Voyager 2 passou por Urano em janeiro de 1986 com o polo sul
do sistema virado para o Sol e só fotografou o sul das cinco; em Tritão
(agosto de 1989) viu cerca de 40 %. Medido nos mapas crus: **56,8 % (Miranda),
61,1 % (Ariel), 58,7 % (Umbriel), 62,2 % (Titânia), 61,1 % (Oberon) e 79,6 %
(Tritão) dos texels abaixo de 8/255**. A borda do vazio não é uma linha de
latitude — é o terminador do dia da passagem, uma curva dentada que invade as
linhas com dado (6 a 21 % de preto dentro delas).

Era isto que o dono via em 03/09 (*"algo estranho está acontecendo"* com as
luas de Urano): em 2026 o Sol ilumina o **norte** de Urano, e a lua desenhada
com o mapa cru era um disco preto no lado do dia — câmera, luz e textura
conferidos na cena viva, todos certos. O item 116 (Tritão "inteiramente
escuro") tinha a mesma causa.

**O preenchimento** (`preencherVazioSemDado`, `lib-texturas.mjs`, passo
`preencher-vazio` da aquisição): texel sem dado é o que fica abaixo de 12/255
em todo canal, e só é tapado quando pertence a um vazio GRANDE (mais de 35 %
de texels sem dado numa janela de 15×15 à volta) — sombra de cratera, que é
pequena e cercada de dado, fica. O tom é a **média por canal do que foi
fotografado**, sem esticar nem escurecer (a disciplina do mosaico de Ceres):
não se inventa cratera nem se espelha o hemisfério visto. O que não foi
fotografado entra liso e é confessado na ficha (tabela abaixo). Os mapas crus
da NASA 3D seguem no histórico do git (`5da9cc5`).

## A CONFISSÃO NA TELA — este arquivo é lido por máquina

**Não edite as duas tabelas abaixo achando que são prosa.**
`scripts/data/atlas/gera-manifest-texturas.mjs` LÊ esta seção e grava cada
linha em `public/data/atlas/texturas.json`; a ficha do objeto (item 74)
imprime a frase na seção “a imagem”. É por isso que ela mora aqui e não em
código: os vereditos da bancada estão nas seções acima, e uma segunda cópia
deles num arquivo `.mjs` envelheceria calada — que é exatamente o defeito
que este documento existe para não ter. Os parágrafos acima são o veredito
completo; a tabela é a UMA FRASE que cabe na tela.

O gerador **falha** se este título sumir, se uma linha vier malformada ou se
citar um `corpo/canal` que não existe em `ORIGENS`. Frase curta, sem ponto
final, na voz de quem admite — o visitante lê isto ao lado da foto.

**As três regras do formato** — quem lê é `lerTabelasDaConfissao`
(`scripts/data/atlas/lib-texturas.mjs`), a mesma função no gerador e no
`data:verify`:

1. Os subtítulos das tabelas **começam** com `a imagem` e `a forma`; o que
   vem depois (o número do item) é livre.
2. Esta seção é a **última do arquivo** — a leitura vai deste título até o
   fim, então um `##` depois dele engoliria as tabelas. Seção nova entra
   **acima**.
3. Editar uma linha aqui não muda a tela sozinha: quem republica é
   `npm run data:texturas`, e o `data:verify` reprova enquanto o manifesto
   não trouxer exatamente estas frases.

As duas listas de corpos **não** estão escritas em código nenhum: quem manda
são as linhas abaixo, e uma quinta linha legítima passa a ser cobrada sem
tocar num `.mjs`.

### a imagem (item 19)

| corpo/canal | nota |
| --- | --- |
| ceres/map | mosaico real da Dawn, mas fotografado no filtro claro: a cor é um tingimento uniforme desta casa, e o polo sul, que a sonda pegou em noite polar, foi preenchido com a média da faixa de latitude vizinha |
| titan/map | 720×360, só a névoa laranja: o mosaico Cassini de mais resolução mostra emendas de longitude na esfera e não entrou |
| europa/map | mapa global monocromático: o mosaico USGS de mais resolução traz 68 linhas pretas de vazio sobre o polo sul e não entrou |
| venus/map | é o topo de nuvens, não o chão: a superfície de Vênus não tem foto em luz visível — o que existe é radar, e radar não é cor |
| enceladus/height | DEM de 200 m reamostrado para 1024 px: o que se vê é a forma geral, não a fratura individual do polo sul |
| rhea/height | relevo SINTÉTICO: não existe DTM público de Reia — o campo de crateras foi gerado por código no projeto Saturn do autor, e não é medida |
| iapetus/height | relevo SINTÉTICO: não existe DTM público de Jápeto — o campo de crateras foi gerado por código no projeto Saturn do autor (só a crista equatorial é feição real, modelada), e não é medida |
| moon/normal | topografia real do LRO reamostrada para 4096 px: cada texel cobre ~2,7 km, então o que a luz desenha é a cratera, não a pedra dentro dela |
| mercury/normal | topografia real da MESSENGER reamostrada de 665 m para 4096 px: cada texel cobre ~3,7 km, e a média de latitude usou 2 das 5,6 linhas de origem |
| mars/normal | topografia real do MOLA a 16 pixels por grau: cada texel cobre ~5,2 km, então o que a luz desenha é o vulcão e o cânion, nunca a duna |
| ceres/normal | topografia real da Dawn reamostrada de 137 m para 4096 px: cada texel cobre 0,73 km, o mais fino da casa, e a média de latitude usou 2 das 5,3 linhas de origem |
| vesta/normal | topografia real da Dawn sobre um elipsoide de revolução: Vesta tem três eixos diferentes, e os 9 km entre os dois equatoriais ficam na luz como rampa suave |
| miranda/map | só o hemisfério sul foi fotografado (Voyager 2, 1986): o norte, nunca visto, entra liso, no tom médio do que a sonda viu |
| ariel/map | só o hemisfério sul foi fotografado (Voyager 2, 1986): o norte, nunca visto, entra liso, no tom médio do que a sonda viu |
| umbriel/map | só o hemisfério sul foi fotografado (Voyager 2, 1986): o norte, nunca visto, entra liso, no tom médio do que a sonda viu |
| titania/map | só o hemisfério sul foi fotografado (Voyager 2, 1986): o norte, nunca visto, entra liso, no tom médio do que a sonda viu |
| oberon/map | só o hemisfério sul foi fotografado (Voyager 2, 1986): o norte, nunca visto, entra liso, no tom médio do que a sonda viu |
| triton/map | a Voyager 2 fotografou cerca de 40 % de Tritão (1989): o resto, nunca visto, entra liso, no tom médio do que a sonda viu |

### a forma (item 20)

Duas famílias. Primeiro, os quatro corpos cujo modelo de forma IRREGULAR
existe publicado e **não** é carregado: a casa não tem
`GLTFLoader`/`OBJLoader` (pendência **P-F7-MESH**, acima) e desenha o
elipsoide de `BODY_AXES`. Depois, as nove luas de Saturno da S3, que são o
caso oposto — têm malha, e a malha é INVENTADA a partir das dimensões
publicadas (item 134/S3, seção acima).

| corpo | nota |
| --- | --- |
| vesta | elipsoide, sem malha: a forma irregular medida pela Dawn existe publicada e esta casa ainda não a carrega |
| pallas | elipsoide, sem malha: a forma irregular do DAMIT existe publicada e esta casa ainda não a carrega |
| hygiea | elipsoide, sem malha: a forma irregular do DAMIT existe publicada e esta casa ainda não a carrega |
| haumea | elipsoide, sem malha: a forma irregular medida por ocultação existe publicada e esta casa ainda não a carrega |
| pan | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
| daphnis | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
| atlas | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
| prometheus | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
| pandora | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
| janus | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
| epimetheus | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
| hyperion | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
| phoebe | geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais |
