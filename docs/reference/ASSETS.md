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
