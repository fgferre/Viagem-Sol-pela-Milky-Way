# Evolução por rodada

Uma linha por rodada de implementação, medida contra as fotos reais em
`gaia-2025-face-on-5k.jpg` pela métrica de `measure-similarity.html`.
Gerado por `node scripts/visual/rodada.mjs <n> "nota"`.

As capturas ficam em `capturas/` e **não** são versionadas (AGENTS.md regra 5):
o que responde "aproximou ou afastou" é o número, não o PNG. Para a revisão
final, as imagens locais e esta tabela se leem juntas.

`harmonicError` menor é melhor; as outras três buscam o alvo.

| rodada | harmonicError | discMean | grain | purp | o que mudou |
|---|---|---|---|---|---|
| — | 0 | 0.1175 | 0.0679 | 0.2010 | **alvo (foto real)** |
| 01 | 0.1233 | 0.1078 | 0.1336 | 0.0840 | baseline: espalhamento religado, fotometria logLum+PSF, fades somados |
| 02 | 0.1186 | 0.1522 | 0.1083 | 0.1076 | soma de populacoes: corpo negro por temperatura no lugar dos tripletos pintados |
| 03 | 0.1056 | 0.1167 | 0.1386 | 0.1195 | recalibrar nivel: paleta nao carrega mais brilho (POP_LUMA_FIX) |
| 04 | 0.1025 | 0.1169 | 0.1372 | 0.1151 | campo iluminante do espalhamento: populacao jovem observada no lugar de rampa por raio |
| 05 | 0.1007 | 0.1171 | 0.1373 | 0.1206 | campo de radiacao difuso: piso no disco + gradiente de idade + realce dos bracos |
| 06 | 0.1104 | 0.1169 | 0.1397 | 0.1231 | H II com o espectro e o peso que tem: nos e laminas |
| 07 | 0.1015 | 0.1172 | 0.1373 | 0.1205 | conservar fluxo dos nos H II: cor decide matiz, alpha decide fluxo |
| 08 | 0.0998 | 0.1150 | 0.1398 | 0.1217 | coluna fechada nas laminas: F(tau)=(1-e^-tau)/tau no lugar de atenuacao linear, e uma so profundidade optica |
| 09 | 0.0989 | 0.1169 | 0.1376 | 0.1206 | lei de comprimento de caminho: tau perpendicular no bake, coluna reconstruida por 1/mu no runtime |
| 10 | 0.1026 | 0.1163 | 0.1382 | 0.1219 | hitch de driver corrigido: fbm das nuvens CO em 2 oitavas fixas; flags noco/noforge |
| 11 | 0.1718 | 0.1388 | 0.1104 | 0.1081 | sprites de poeira removidos: extincao por particula (VTF da coluna tau) + espalhamento por texel + fenda da barra no bake |
| 12 | 0.0696 | 0.1361 | 0.1092 | 0.1092 | emissao 2 bracos: Sct-Cen+Perseu dominantes (prof. 1,0 base 0,42), gas/H II/jovens uniformes em 4, braco ~12% mais largo (sharpness -20%), 3kpc 0,43; gate edge-on novo |
| 13 | 0.0739 | 0.1364 | 0.1096 | 0.1089 | unificacao 2 etapa 1: cascas por bin de M_V (hash de celula, existencia por densidade, m_sun>7,2, reconstrucao relativa a camera), PSF unica em GLSL_STAR_PSF, buildFarStars deletado; gates externos inalterados por construcao |

## Edge-on

`edgeError` menor é melhor (medida `?mode=edge` contra
`gaia-2025-edge-on-5k.jpg`); as outras buscam o alvo.

| rodada | edgeError | thickRatio | axialRatio | laneDepth | warpAmp | o que mudou |
|---|---|---|---|---|---|---|
| — | 0 | 0.0502 | 0.0598 | 0.9386 | 0.0187 | **alvo (foto real)** |
| 12 | 2.0258 | 0.0244 | 0.0263 | -0.0729 | 0.0089 | emissao 2 bracos: Sct-Cen+Perseu dominantes (prof. 1,0 base 0,42), gas/H II/jovens uniformes em 4, braco ~12% mais largo (sharpness -20%), 3kpc 0,43; gate edge-on novo |
| 13 | 2.0258 | 0.0244 | 0.0263 | -0.0729 | 0.0089 | unificacao 2 etapa 1: cascas por bin de M_V (hash de celula, existencia por densidade, m_sun>7,2, reconstrucao relativa a camera), PSF unica em GLSL_STAR_PSF, buildFarStars deletado; gates externos inalterados por construcao |
