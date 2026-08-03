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
| 14 | 0.0740 | 0.1366 | 0.1100 | 0.1090 | unificacao 2 etapa 2: handoff unresolved(d) nas particulas e no termo estelar da LUT (identidade 1,0 alem de 5,2 kpc); densidade das cascas pelos canais B/A do dust map (+5,3 ms -> +0,3 ms medidos por CDP a 1440p) |
| 15 | 0.0800 | 0.1364 | 0.1076 | 0.1093 | faixa escura edge-on: extincao por caminho amostrado (4 VTF no segmento particula-camera, sem piso de mu), piso difuso axissimetrico (tau_perp 0,125 no Sol), fenda no glow do bojo, braco -10%; laneDepth -0,07 -> ~0,3 |
| 16 | 0.0615 | 0.1349 | 0.1033 | 0.1087 | faixa+vantagem: 16 amostras no caminho, t158 pelos nós do warp a z=500 |
| 18 | 0.0595 | 0.1781 | 0.0989 | 0.1044 | auto-exposição 1,02→1,40 pela galaxyFade (campanha de varredura: exp vence, glow/idim/warpamp rejeitados) |
| 20 | 0.0526 | 0.1314 | 0.1018 | 0.1077 | chromsat 0,5 + knee asinh 0,45 + exp 1,05: o vermelho na fonte dissolve a fronteira (vitória dupla) |
| 21 | 0.0467 | 0.1314 | 0.1016 | 0.1077 | warp da literatura: amplitude 820 → 1310 pc (Skowron 2019 na borda; o S entra sob o regime chromsat) |
| 22 | 0.0480 | 0.1311 | 0.1020 | 0.1077 | halo térmico oblato (ganho 0,3, 6 kpc, lei 1/μ): a luz quente que faltava às bandas altas |
| 24 | 0.0339 | 0.1284 | 0.0704 | 0.1053 | PROTOCOLO: captura 1800px (analise simetrica em 1200 com a referencia); re-baseline, zero mudanca de render |
| 25 | 0.0333 | 0.1293 | 0.0701 | 0.1049 | re-dosagem sob o protocolo honesto: warp volta ao 820 original (o impulso a 1310 era artefato da regua aliasada) |
| 26 | 0.0346 | 0.1286 | 0.0703 | 0.1050 | roteiro novo em shots: 4 atos, Sgr A* Gargantua, holds de medição com roll do rig antigo assado (t 261/293) |
| 27 | 0.0370 | 0.1293 | 0.0699 | 0.1044 | warp com a fase certa: 185 e nao 5 — a quiralidade do S contra a recriacao-alvo estava invertida (ablacao: warpAsym -0,35 -> +0,22; maior salto da serie) |

## Edge-on

`edgeError` menor é melhor (medida `?mode=edge` contra
`gaia-2025-edge-on-5k.jpg`); as outras buscam o alvo.

| rodada | edgeError | thickRatio | axialRatio | laneDepth | warpAmp | o que mudou |
|---|---|---|---|---|---|---|
| — | 0 | 0.0502 | 0.0598 | 0.9386 | 0.0187 | **alvo (foto real)** |
| 12 | 2.0258 | 0.0244 | 0.0263 | -0.0729 | 0.0089 | emissao 2 bracos: Sct-Cen+Perseu dominantes (prof. 1,0 base 0,42), gas/H II/jovens uniformes em 4, braco ~12% mais largo (sharpness -20%), 3kpc 0,43; gate edge-on novo |
| 13 | 2.0258 | 0.0244 | 0.0263 | -0.0729 | 0.0089 | unificacao 2 etapa 1: cascas por bin de M_V (hash de celula, existencia por densidade, m_sun>7,2, reconstrucao relativa a camera), PSF unica em GLSL_STAR_PSF, buildFarStars deletado; gates externos inalterados por construcao |
| 14 | 2.0258 | 0.0244 | 0.0263 | -0.0729 | 0.0089 | unificacao 2 etapa 2: handoff unresolved(d) nas particulas e no termo estelar da LUT (identidade 1,0 alem de 5,2 kpc); densidade das cascas pelos canais B/A do dust map (+5,3 ms -> +0,3 ms medidos por CDP a 1440p) |
| 15 | 1.4780 | 0.0315 | 0.0338 | 0.2944 | 0.0059 | faixa escura edge-on: extincao por caminho amostrado (4 VTF no segmento particula-camera, sem piso de mu), piso difuso axissimetrico (tau_perp 0,125 no Sol), fenda no glow do bojo, braco -10%; laneDepth -0,07 -> ~0,3 |
| 16 | 0.8741 | 0.0223 | 0.0357 | 0.6613 | 0.0104 | faixa+vantagem: 16 amostras no caminho, t158 pelos nós do warp a z=500 |
| 18 | 0.8380 | 0.0229 | 0.0347 | 0.6355 | 0.0120 | auto-exposição 1,02→1,40 pela galaxyFade (campanha de varredura: exp vence, glow/idim/warpamp rejeitados) |
| 20 | 0.8282 | 0.0228 | 0.0355 | 0.6699 | 0.0109 | chromsat 0,5 + knee asinh 0,45 + exp 1,05: o vermelho na fonte dissolve a fronteira (vitória dupla) |
| 21 | 0.7895 | 0.0274 | 0.0374 | 0.6197 | 0.0154 | warp da literatura: amplitude 820 → 1310 pc (Skowron 2019 na borda; o S entra sob o regime chromsat) |
| 22 | 0.6535 | 0.0392 | 0.0581 | 0.7345 | 0.0191 | halo térmico oblato (ganho 0,3, 6 kpc, lei 1/μ): a luz quente que faltava às bandas altas |
| 24 | 0.6992 | 0.0586 | 0.0958 | 0.9044 | 0.0323 | PROTOCOLO: captura 1800px (analise simetrica em 1200 com a referencia); re-baseline, zero mudanca de render |
| 25 | 0.6441 | 0.0494 | 0.0924 | 0.9100 | 0.0326 | re-dosagem sob o protocolo honesto: warp volta ao 820 original (o impulso a 1310 era artefato da regua aliasada) |
| 26 | 0.6456 | 0.0503 | 0.0929 | 0.9052 | 0.0329 | roteiro novo em shots: 4 atos, Sgr A* Gargantua, holds de medição com roll do rig antigo assado (t 261/293) |
| 27 | 0.4396 | 0.0393 | 0.0810 | 0.8506 | 0.0425 | warp com a fase certa: 185 e nao 5 — a quiralidade do S contra a recriacao-alvo estava invertida (ablacao: warpAsym -0,35 -> +0,22; maior salto da serie) |
