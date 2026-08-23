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
