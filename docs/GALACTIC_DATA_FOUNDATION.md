# Fundação de dados cartográficos da Via Láctea

## Decisão

Não existe um mapa observacional único que forneça estrelas, poeira e gás em 3D
por todo o disco da Via Láctea. A extinção no plano galáctico, a ambiguidade das
distâncias cinemáticas e o fato de observarmos de dentro impedem esse produto.

A cena deve, portanto, manter duas camadas que nunca sejam confundidas:

1. **observada/derivada**, com posição, método e incerteza provenientes dos
   catálogos abaixo;
2. **inferida**, gerada estatisticamente somente para preencher regiões sem
   amostragem, condicionada pelos dados observados e identificada no código como
   tal.

O renderer combina as duas camadas: a poeira APOGEE condiciona o campo
volumétrico, e nuvens CO, H II, masers, aglomerados e Cefeidas entram em suas
posições catalogadas. O preenchimento procedural permanece apenas onde falta
cobertura. A implementação está documentada em `RENDERER_CARTOGRAPHY.md`.

## O que a imagem Gaia/ESA realmente contém

A visualização Gaia/ESA de 2025 é uma **impressão artística baseada em dados**,
não um escaneamento volumétrico completo da Via Láctea. O detalhamento próximo
usa populações jovens do Gaia DR3; a aparência global completa forma um modelo
artístico.

O trabalho científico usado nessa visualização seleciona aproximadamente
579.577 estrelas OB, 988 aglomerados abertos com menos de 100 milhões de anos e
mais de 2.800 Cefeidas jovens. O mapa OB é particularmente informativo até cerca
de 3 kpc e traça estrutura até 4–5 kpc do Sol; as Cefeidas alcançam partes do
disco externo a aproximadamente 10 kpc. Os próprios autores dizem que não
reconstruíram a densidade estelar absoluta e alertam para artefatos radiais por
extinção.

Fontes:

- [Gaia/ESA — Milky Way map, 2025](https://www.cosmos.esa.int/web/gaia/milky-way)
- [Gaia Collaboration / Drimmel et al. 2023](https://doi.org/10.1051/0004-6361/202243797)
- [catálogo VizieR J/A+A/674/A37](https://cdsarc.cds.unistra.fr/viz-bin/cat/J/A%2BA/674/A37)

O VizieR publica os aglomerados, Cefeidas e mapas derivados, mas não a lista
final completa das 579.577 estrelas OB. A seleção inicial reproduzível está em
`scripts/data/queries/gaia-dr3-ob-hot-stars.sql`; para obter a amostra do paper
ainda é obrigatório cruzá-la com:

- distâncias fotogeométricas de Bailer-Jones;
- `astrometric fidelity > 0.5`, de Rybizki et al.;
- corte vertical `|Z| < 300 pc`.

Sem esses três passos, chamar o resultado de “amostra OB de Drimmel” seria
incorreto.

## Ativos já materializados

Todos os binários usam Float32 little-endian. O schema campo a campo, hashes e
dicionários categóricos ficam em `public/data/galaxy/manifest.json`.

| Ativo | Registros | Uso científico | Limite que o renderer deve respeitar |
|---|---:|---|---|
| `dust-density.bin` | 196.503 | espinha dorsal de densidade 3D derivada de APOGEE | 48.612 inferências negativas foram limitadas a zero; `sigmaDensity` e `densityConfidence` continuam disponíveis |
| `large-molecular-clouds.bin` | 84 | grandes complexos de nuvens no mesmo mapa APOGEE | usar raio, erro de distância e associação de braço |
| `molecular-clouds.bin` | 8.107 | catálogo de nuvens derivado da emissão de CO | distância é cinemática; `farDistanceFlag` e `rendererRecommended` são obrigatórios |
| `spiral-anchors.bin` | 199 | regiões de formação estelar com paralaxe trigonométrica BeSSeL | usar como âncoras de alta confiança, não como campo de densidade |
| `hii-regions.bin` | 1.413 | subconjunto WISE com distância adotada | 6.986 fontes sem distância não foram inventadas em 3D; classe e método foram preservados |
| `gaia-young-clusters.bin` | 988 | aglomerados Gaia DR3 com `log10(age/yr) < 8` | distância por inversão da paralaxe mediana; usar erro relativo |
| `gaia-young-cepheids.bin` | 2.806 | Cefeidas Gaia jovens com menos de 200 Myr | distância por módulo de distância; usar `sigmaDistance` |

Fontes dos dados:

- [Rezaei Kh. et al. 2024 — mapa de poeira APOGEE](https://doi.org/10.1051/0004-6361/202449255)
- [Miville-Deschênes et al. 2017 — 8.107 nuvens de CO](https://doi.org/10.3847/1538-4357/834/1/57)
- [Reid et al. 2019 — paralaxes de masers BeSSeL](https://doi.org/10.3847/1538-4357/ab4a11)
- [Anderson et al. 2014 — catálogo WISE de regiões H II](https://doi.org/10.1088/0067-0049/212/1/1)
- [Gaia Collaboration / Drimmel et al. 2023 — traçadores jovens](https://doi.org/10.1051/0004-6361/202243797)

## Coordenadas

Os catálogos são transformados para uma base galactocêntrica única:

- origem no centro galáctico;
- `+X` do centro em direção ao Sol;
- `+Y` na direção da longitude galáctica `l=270°`;
- `+Z` em direção ao polo norte galáctico;
- Sol em `(8150, 0, 5,5)` pc.

O sinal de `Y` torna a base dextrógira e corresponde a `EX/EY/EZ` em
`src/three/world/galaxy.ts`. Uma fonte observada em `l=90°` recebe, portanto,
`Y` negativo. Essa convenção é diferente de alguns catálogos e não pode ser
inferida pelo nome da coluna.

As escalas e a posição solar correspondem ao contrato de
`src/three/cartography/galacticModel.ts`. A conversão para a base equatorial da
cena ocorre uma vez na carga, por `galactocentricToScene()`.

## Auditoria do HYG atual

O binário original tinha 19.115 registros. Desses, 572 estavam sobre a esfera de
aproximadamente 100.000 pc usada pelo HYG quando a posição angular é conhecida,
mas a distância não é. Eles não eram estrelas distantes cartografadas e
produziam uma falsa população na escala galáctica.

`scripts/data/sanitize-stars.mjs` os removeu de forma idempotente. O runtime
agora contém 18.543 registros com distância utilizável, e
`stars_meta.json` guarda a contabilidade da exclusão. O repositório ainda não
contém o CSV de origem nem sua versão exata; por isso a próxima migração do campo
estelar deve registrar release, consulta, licença e checksum da fonte.

Referência independente sobre a sentinela do HYG:
[Universidade de Waterloo — HYG e a esfera de 100.000 pc](https://www.math.uwaterloo.ca/tsp/star/hyg119614.html).

## Fontes avaliadas, mas ainda não empacotadas

### Poeira local de alta resolução

O mapa de Edenhofer et al. usado nas reconstruções de berçários estelares da
Gaia cobre aproximadamente 69–1.250 pc com grande detalhe. Os produtos brutos
chegam a dezenas ou centenas de gigabytes; devem ser reamostrados offline para
um volume local esparso, não enviados diretamente ao browser.

- [ESA — mapa 3D dos berçários estelares](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Fly_through_Gaia_s_3D_map_of_stellar_nurseries)
- [Edenhofer et al. — dados no Zenodo](https://zenodo.org/records/10658339)

### Poeira de alcance intermediário

O mapa de Wang et al. combina Gaia XP e LAMOST e pode complementar a região
local/intermediária. O pacote completo ainda deve passar por avaliação de
licença, resolução, incerteza e custo de reamostragem antes de ser incorporado.

- [plataforma oficial NADC de mapas de poeira](https://nadc.china-vo.org/data/dustmaps/)
- [Wang et al. — mapa 3D de poeira](https://arxiv.org/abs/2509.07640)

### Cubos de CO e H I

Os cubos Dame CO e HI4PI são observações em longitude, latitude e velocidade
radial (`l,b,v`), não posições cartesianas 3D. Eles servem para validar emissão,
silhuetas e estatística angular. Transformá-los diretamente em nuvens 3D sem
resolver a ambiguidade cinemática criaria falsa cartografia.

- [CfA — Composite CO Survey](https://lweb.cfa.harvard.edu/rtdc/CO/CompositeSurveys/)
- [NASA LAMBDA — HI4PI](https://lambda.gsfc.nasa.gov/product/foreground/fg_hi4pi_info.html)

## Contrato permanente

1. posições observadas nunca são deslocadas por direção de arte;
2. preenchimento `inferred` cede onde existe cobertura `observed` ou `derived`;
3. coordenadas são convertidas uma vez na carga;
4. dados ausentes degradam para o renderer procedural sem quebrar a viagem;
5. qualquer alteração de ativo atualiza schema, proveniência e hash no
   `manifest.json` e passa por `npm run data:verify`.
