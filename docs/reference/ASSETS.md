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

## Ceres — SSS admite invenção

Incumbente: Solar System Scope `2k_ceres_fictional`, **2048×1024**,
CC BY 4.0 — a fonte **admite** que o mapa é inventado. Não há NASA 3D
nem 2k real no SSS. Mosaico Dawn/USGS fica pendente (não há empacote
com licença fechada nesta onda).

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
| Reia, Jápeto | **ficaram de FORA** — o relevo deles no projeto Saturn é sintético (sem DTM público) e sai em bolhas no limbo (`capturas/item134-s2-ficha-rhea.png`) | — | 0 |

Total baixado pelo visitante: **3,55 MB** em webp (10,17 MB em disco com o
`.png` de fallback). O `NOTICE` do projeto dele é a fonte destas linhas e
declara os dois sintéticos com todas as letras: *"Rhea and Iapetus have no
public DTM as of 2026; their relief is synthetic"*.

**Reia e Jápeto NÃO entraram.** O `NOTICE` dele confessa que a topografia
das duas é fabricada, e a foto mostrou o preço: bolhas largas no limbo,
pior que a esfera lisa. Decisão do coordenador em 02/09, reversível: os
mapas continuam no projeto dele; voltar é uma linha em `RELEVO_DA_LUA`,
os assets no manifesto e a nota "relevo sintético" na ficha (o caminho
`relevo` da seção *a imagem* já existe).

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
| ceres/map | a fonte admite que este mapa é inventado — não existe mosaico real de Ceres com licença fechada, e o da sonda Dawn segue pendente |
| titan/map | 720×360, só a névoa laranja: o mosaico Cassini de mais resolução mostra emendas de longitude na esfera e não entrou |
| europa/map | mapa global monocromático: o mosaico USGS de mais resolução traz 68 linhas pretas de vazio sobre o polo sul e não entrou |
| venus/map | é o topo de nuvens, não o chão: a superfície de Vênus não tem foto em luz visível — o que existe é radar, e radar não é cor |
| enceladus/height | DEM de 200 m reamostrado para 1024 px: o que se vê é a forma geral, não a fratura individual do polo sul |

### a forma (item 20)

Os quatro corpos cujo modelo de forma IRREGULAR existe publicado e **não** é
carregado: a casa não tem `GLTFLoader`/`OBJLoader` (pendência **P-F7-MESH**,
acima) e desenha o elipsoide de `BODY_AXES`.

| corpo | nota |
| --- | --- |
| vesta | elipsoide, sem malha: a forma irregular medida pela Dawn existe publicada e esta casa ainda não a carrega |
| pallas | elipsoide, sem malha: a forma irregular do DAMIT existe publicada e esta casa ainda não a carrega |
| hygiea | elipsoide, sem malha: a forma irregular do DAMIT existe publicada e esta casa ainda não a carrega |
| haumea | elipsoide, sem malha: a forma irregular medida por ocultação existe publicada e esta casa ainda não a carrega |
