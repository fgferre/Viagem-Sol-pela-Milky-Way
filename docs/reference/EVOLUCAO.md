# Evolução por rodada

Uma linha por rodada de implementação, medida contra `gaia-2025-face-on-5k.jpg`
pela métrica de `measure-similarity.html`. As vistas externas são **recriações
científicas** ancoradas em Gaia, não fotos — ninguém fotografou a Via Láctea de
fora (NORTE.md). A única foto real do projeto é o panorama ESO, visto de DENTRO.
Gerado por `node scripts/visual/rodada.mjs <n> "nota"`.

As capturas ficam em `capturas/` e **não** são versionadas (AGENTS.md regra 5):
o que responde "aproximou ou afastou" é o número, não o PNG. Para a revisão
final, as imagens locais e esta tabela se leem juntas.

`harmonicError` menor é melhor; as outras três buscam o alvo.

### Régua ATÉ 2026-08-06 — números históricos, não comparáveis com os de baixo

A auditoria de 2026-08-06 achou dois defeitos aqui. (1) `harmonicError` era
`Σ_m |média(A_m nossa sobre 56 anéis) − média(A_m do alvo)|`: o módulo DEPOIS
da média, então um excesso no anel externo cancelava contra um déficit no
miolo. A rodada 30 já tinha MEDIDO esse cancelamento e o termo nunca fora
trocado. (2) `profile`, `colour` e `purp` eram calculados e **não entravam em
score nenhum** — a coluna `purp` abaixo mostra 0,1047 contra alvo 0,2010,
metade, parada desde a rodada 20. Agora as harmônicas são comparadas anel a
anel e existe uma terceira nota, `toneError`.

| rodada | harmonicError | discMean | grain | purp | o que mudou |
|---|---|---|---|---|---|
| — | 0 | 0.1175 | 0.0679 | 0.2010 | **alvo (recriação científica)** |
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
| 33 | 0.0371 | 0.1299 | 0.0663 | 0.1047 | bojo achatado (c/a 0,30) + poeira com escala radial própria (2,1 kpc) |
| 37 | 0.0371 | 0.1299 | 0.0663 | 0.1047 | regua da fenda por longitude + Grande Fenda no lugar real |

### Régua a partir de 2026-08-06 — três notas, todas menores é melhor

`harmonicError` = soma sobre m=1..6 da média |Δ| ANEL A ANEL (56 anéis).
`clumpError` = agrupamento nas 4 escalas × 2 anéis + granulação dos dois
anéis. `toneError` = perfil radial + cor + púrpura, as três curvas de 24
raios que antes ninguém cobrava. `discMean` fica FORA das notas de propósito:
é brilho absoluto e depende da exposição, que é knob soberano.

| rodada | harmonicError | clumpError | toneError | discMean | grain | purp | o que mudou |
|---|---|---|---|---|---|---|---|
| 38 | 0.3920 | 0.0603 | 0.1753 | 0.1299 | 0.0663 | 0.1047 | auditoria: harmonicas anel a anel, toneError novo, thickRatio fora da soma |
| 39 | 0.3920 | 0.0603 | 0.1753 | 0.1299 | 0.0663 | 0.1047 | bojo c/a 0,30 -> 0,26 (Wegg & Gerhard); regua da fenda mede na latitude da foto |
| 40 | 0.3920 | 0.0603 | 0.1753 | 0.1299 | 0.0663 | 0.1047 | extremo frio do disco: 25.000 K -> 6.000 K pela blackbodyLinear, Y e purpura conservados |

## Edge-on

`edgeError` menor é melhor (medida `?mode=edge` contra
`gaia-2025-edge-on-5k.jpg`); as outras buscam o alvo.

| rodada | edgeError | thickRatio | axialRatio | laneDepth | warpAmp | o que mudou |
|---|---|---|---|---|---|---|
| — | 0 | 0.0502 | 0.0598 | 0.9386 | 0.0187 | **alvo (recriação científica)** |
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
| 33 | 0.4181 | 0.0445 | 0.0916 | 0.8715 | 0.0500 | bojo achatado (c/a 0,30) + poeira com escala radial própria (2,1 kpc) |
| 37 | 0.4181 | 0.0445 | 0.0916 | 0.8715 | 0.0500 | régua da fenda + Grande Fenda: BIT-IDÊNTICO à rodada 33 (md5 `c0743465`), como manda a construção — a mudança vive só no LUT da faixa e `nebulaFade = 0` nos dois holds |
| 38 | 0.4124 | 0.0445 | 0.0916 | 0.8715 | 0.0500 | auditoria: harmonicas anel a anel, toneError novo, thickRatio fora da soma |
| 39 | 0.4124 | 0.0445 | 0.0916 | 0.8715 | 0.0500 | bojo c/a 0,30 -> 0,26 (Wegg & Gerhard); regua da fenda mede na latitude da foto |
| 40 | 0.4124 | 0.0445 | 0.0916 | 0.8715 | 0.0500 | extremo frio do disco: 25.000 K -> 6.000 K pela blackbodyLinear, Y e purpura conservados |

## Céu interno (panorama ESO)

`skyError` menor é melhor: soma de seis termos medidos contra
`eso-gigagalaxy-panorama.jpg`, a única foto REAL do projeto, vista de dentro
(protocolo v3 — `scripts/visual/sky-capture.mjs` + `sky-measure.html`, 6 faces
de 1440² com revelação `kneeamt=1&knee=0.02&exp=4.4`). O absoluto deriva entre
sessões: comparar sempre A/B na MESMA sessão.

| rodada | skyError | espessura | bulgeAnti | rift | colour | o que mudou |
|---|---|---|---|---|---|---|
| — | 0 | 0 | 5.568 | 0.2444 | 0.0641 | **alvo (foto ESO)** |
| 31 | 1.1230 | 0.5178 | 5.468 | 0.0369 | -0.0649 | baseline do protocolo v3 (o gate do céu não movia nas rodadas de vista externa) |
| 32 | 1.0767 | 0.5178 | 5.116 | 0.1807 | -0.0668 | a faixa era opticamente FINA: componente difusa ancorada em A_V (0,15 mag/kpc) na camada de gás (h 70 pc) |
| 33 | 0.9459 | 0.4160 | 5.069 | 0.2555 | -0.0708 | bojo achatado (c/a 0,30, luminosidade conservada) + poeira com escala radial própria (2,1 kpc) |
| 34 | 0.8134 | 0.3499 | 5.735 | 0.2555 | -0.0685 | o corredor de Órion começava DENTRO da Bolha Local: os 7 núcleos deslocados +130 pc ao longo da própria direção (138–348 pc); face-on e edge-on bit-idênticos |
| 35 | 0.7885 | 0.3617 | 5.584 | 0.2531 | -0.0694 | catálogo estelar 18.543 → 328.749 (cobertura = magnitude E horizonte E presença) |
| 37 | 0.8693 | 0.3239 | 5.580 | 0.1122 | -0.0551 | **RÉGUA NOVA — não comparar com as linhas acima**: o termo da fenda passou a comparar a curva POR LONGITUDE (o escalar cancelava uma anticorrelação quase perfeita: 0,0087 contra 0,5241 reais). A mesma imagem da linha 35 marca 1,3039 nesta régua. Na régua nova, a poeira axissimétrica saiu (`bandav` 0,15 → 0) e as quatro nuvens do Aquila Rift entraram: 1,3039 → 0,8693 |
| 37b | 0.8672 | 0.3239 | 5.580 | 0.1122 | -0.0551 | auditoria dos termos: `bojoAnti` saiu da soma (é função EXATA do `perfil` — peso duplo em 16 dos 48 bins); segue impresso porque afere a RÉGUA |
| 39a | 0.8874 | 0.3239 | 5.580 | 0.0817 | -0.0551 | **RÉGUA DE NOVO — a linha 37b é a MESMA imagem** (nada foi capturado): a fenda passou a medir a NOSSA profundidade na latitude onde a FOTO tem o vale, em vez de cada um no seu próprio mínimo. O buraco estava pré-registrado na r37 e apareceu: com `bandav=0,05` o bin l=+41° marcava 0,311 contra 0,300 da foto com o vale nosso em b=+0,4° e o dela em b=+9,9° — um bin invertia o veredito de uma rodada inteira |
| 40 | **0.7811** | 0.3097 | 5.455 | 0.0760 | **0.0557** | extremo frio de `diskColor`: a constante pintada `vec3(0.30,0.43,0.78)` ERA corpo negro de ~25.000 K (conferido: `?coldt=25000` a reproduz em 3 casas) — mais quente que qualquer população integrada e que uma estrela O. Agora sai da `blackbodyLinear` das estrelas a **6.000 K** (B−V 0,60, disco Sbc), com luminância e púrpura conservados. Oito doses: 25k→0,8796 · 12k→0,8464 · 9,8k→0,8319 · 8k→0,8148 · 7k→0,8014 · 6,4k→0,7910 · **6k→0,7811** · 5,4k→0,7822. `cor` 0,1208 → **0,0084**; espessura/perfil/fenda PARADOS nas 4 casas nas oito (o teste da hipótese). Gates externos bit-idênticos |
| 39 | 0.8783 | 0.3097 | 5.475 | 0.0754 | -0.0567 | bojo c/a 0,30 → **0,26** (o valor que Wegg & Gerhard medem; 0,30 era arredondamento) — o ganho é no maior termo. `bandav` e `dustrd` re-dosados e FECHADOS: 7 doses monótonas dão zero como ótimo, e `dustrd` é inerte com `bandav=0`. Gates externos bit-idênticos (md5 `873e64b2` / `c0743465`) |
| 41 | **0.7782** | **0.3026** | 5.497 | 0.0694 | 0.0509 | **a LUT e o catálogo desenhavam a mesma luz duas vezes.** `unresolved()` descontava os 3,8% das CASCAS; as 328.749 estrelas do catálogo (completo a m=10) nunca entraram no handoff. Fração MEDIDA no próprio binário em runtime (`resolvedCatalogCurve`): ~1,0 até 150 pc, 0,29 a 600 pc, 0,058 a 1 kpc, 0 no horizonte — a dupla contagem morre em ~500 pc. `?catsub=0` devolve o estado anterior bit-idêntico; `mergulho`/`edgeon`/`faceon` bit-idênticas (a 8 kpc do Sol `catFade` é zero — a checagem causal). **Nota de máquina: a baseline daqui é 0,7857, não os 0,7811 da linha 40** — o A/B é 0,7857 → 0,7782. Beco medido: a mesma fração DERIVADA da LF de 7 bins das cascas dá 0,8259 (o bin de topo, uniforme em M ao longo de 4 mag, prevê 0,635 a 1 kpc contra 0,058 reais) |
