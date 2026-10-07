# Reia com relevo real e crateras pela foto — plano da rodada (07/10/2026)

Palavras dele (07/10): *"Pode começar por Reia, com a mesma receita. coordene inteligentemente."* A receita é a de Jápeto
(`PLAN-EUROPA-JAPETO.md`: crateras com nome do Gazetteer no lugar, as demais detectadas no mosaico da Cassini,
profundidades por lei citada, degradação, quantização explícita, normal do mesmo campo, portão por hash na cadeia,
cadeia no terminal dele, fotos no app de verdade) — com uma mudança que a pesquisa de 07/10 trouxe: **Reia tem modelo de
forma público** (Weirich, Gaskell, Palmer & Domingue 2025, PDS SBN, DOI 10.26033/tqxb-q714), então o relevo das escalas
grandes é MEDIDO, como em Plutão e Caronte, e só o detalhe fino é pela foto. Ramo `reia` (backup `git push -u origin
reia`); ferramentas e candidatos em `capturas/reia/`; fontes em `.cache/reia/` com sha256.

## Hoje (medido em 07/10; `capturas/reia/hoje-medidas.md`, `hoje-prancha.jpg`)
- `map.jpg` 4096×2048 do mosaico Cassini de Schenk (PIA18438: 400 m/px, 12.015×6.008 px, cor realçada IR-verde-UV,
  graduada no projeto Saturn). Convenção do app confirmada pela Inktomi (mancha clara a 19 km do esperado).
- `height`/`normal` 1024×512 SINTÉTICOS do projeto Saturn: −14..+6 km, 613 "crateras" circulares sobrepostas (mediana
  131 km, nada abaixo de ~25 km), NENHUMA no lugar das com nome (Mamaldi e Tirawa não aparecem; 76 com nome ≥ 30 km
  acertam no nível do acaso); na foto, esfera em formato de batata no terminador, crateras poligonais, uma bacia funda
  no sul do trás sem correspondente. Escala 0,02632 / viés −0,01833 (`rochoso.ts:249`). Terreno "wispy" só na cor.
- Forma: elipsoide 765,0 × 763,1 × 762,4 km (NAIF pck00011, IAU 2015) — quase esfera; a conferir `BODY_AXES.rhea`.

## Fatos (07/10; [C] conferido na página, [L] lembrança)
- Gazetteer (zip de pontos centrais, +LESTE no dbf; páginas em +W) [C]: 144 feições — 129 crateras (81 com diâmetro;
  48 sem, de 1982/87, inclusive Tirawa, Izanagi, Izanami), 6 catenae, 5 chasmata, 2 fossae, 2 lineae, 0 montes.
  ≥ 100 km, °E: Mamaldi 480 (14°N 176); Powehiwehi 271 (8,2°S 79,6); Wakonda 123 (48,6°N 90,3); Nzame 119 (9°N 335);
  Nishanu 103 (9°S 231); Samni 101 (47,7°S 269,3). Tirawa ~370 km (34,2°N 208,3°E), sobreposta a Mamaldi, ~6 km de
  fundo, anel interno ~180 km, cristas de 1–3 km [C, PIA12856; Wikipedia]. Inktomi 47 km (14,1°S 247,9°E), a cratera
  jovem com raios claros, ~3,6 km de fundo, pico central de 1,25 km [L, de Schenk 2020]. Chasmata (o terreno wispy,
  todos em 60–106°E, hemisfério traseiro) [C]: Galunlati 740 km (60–80°E, 4–60°N), Avaiki 580, Yamsi 380 (73–86°E,
  14–42°S), Vaupas 280, Pulag 190 — grábens N–S de alguns a 30 km de largura, até ~4 km de profundidade, escarpas de
  gelo claro [C, PIA12807; Wagner 2010]. Catenae: Puchou 620, Wungaran 350, Onokoro 240, Thebeksan 220.
- Relaxação e profundidades [C]: White, Schenk & Dombard 2013 — em Reia só crateras > ~100 km relaxaram; nenhuma passa de
  ~6,5 km de fundo (Tirawa d/D ≈ 0,016). Lei d × D (Aponte-Hernández et al. 2021, PSJ, CC-BY; 509 crateras de 4–132 km
  num MDT de 180 m/px): simples d/D 0,11 ± 0,03 (máx 0,20), complexas d/D 0,08 ± 0,03 (a maior: 132 km, 4,8 km),
  d = b·D^β com β 0,86 ± 0,41 (complexas) — b ≈ 0,11 é conta nossa; transição simples→complexa 12 ± 2 km; parede média
  12°. Frescas pequenas: d/D 0,13–0,22 (Schenk 1989; White 2013).
- DTM [C]: `rhea_radius_g.tif` do pacote SPC (2222×1111, equiretangular, planetocêntrica, +LESTE, 0°E na borda esquerda,
  2,154 km/px, raio em metros, referência 763,5 km; 2.719 imagens; precisão 1–2× GSD = 2–4 km; resolve bacias,
  crateras ≳ 20 km e os grábens largos; NÃO as crateras pequenas nem escarpas finas; os maplets de 1 km não foram
  arquivados). O estéreo semi-global de Schenk segue "unreleased" na USGS: o SPC é o único DEM público. Licença: dado
  PDS/NASA com citação obrigatória.
- Cinza USGS "Rhea Cassini–Voyager 417 m" [C]: 11.520×5.760, cilíndrica simples, centro 180, +W, esfera 764,1 km —
  só se precisarmos de sombreado de conferência.

## O que muda em relação a Jápeto (decisões; as de gosto vão por prancha)
1. O campo nasce do DTM (relevo = raio − elipsoide do app), reamostrado para a convenção da casa: é o MEDIDO. Por cima,
   só o que o DTM não resolve: crateras detectadas na foto ABAIXO de um diâmetro-limite X (a medir em R1: onde o
   sombreado do DTM deixa de mostrar as com nome; esperado ~20–25 km), com a lei de Aponte-Hernández (simples 0,11;
   complexas 0,11·D^0,86), degradadas; crateras detectadas acima de X NÃO entram (o DTM já as tem — carimbar de novo
   dobraria). As com nome ≥ X já estão no DTM; as com nome < X entram pela posição do catálogo com a lei.
2. Sem crista, sem abaulado; as escarpas do terreno wispy: se o DTM mostrar os grábens largos, ficam dele; escarpas
   finas NÃO são inventadas (sem número publicado para altura individual) — a cor já as mostra. Confessar.
3. Quantização pela faixa medida do DTM mais a margem das crateras finas (esperado ~−9..+5 km → ~55 m por degrau, bem
   mais fino que Jápeto); escala/viés novos em `rochoso.ts:249`. Resolução: 1024×512 como hoje e um candidato 2048×1024
   (o DTM tem 6,2 px/°, a grade de 2048 tem 5,7: cabe inteiro); custo medido como no 226 antes de escolher.
4. Miolo comum: `relevo-por-foto.mjs` (extraído de `relevo-japeto.mjs` em 07/10 sem mudar o hash publicado de
   Jápeto); `relevo-reia.mjs` só monta (DTM + crateras finas + quantização + normal). Um só jeito de fazer.
5. Confissão pt/en: "relevo medido pelo modelo de forma da Cassini (Weirich et al. 2025) nas escalas acima de ~X km;
   abaixo, crateras onde a foto as mostra, com profundidade pela lei de Aponte-Hernández 2021; nada da forma é
   inventado" — proveniência a do vocabulário da casa para "medido + completado".
6. O subsolar do app em 1º/01 difere 4,4° do Horizons (R0): é a rotação de Reia durante o tempo de luz (4.749 s) —
   anotar no BACKLOG, não é desta rodada.

## Etapas
- R0 (feito 07/10): Gazetteer em JSON, fotos de hoje, medidas do relevo de hoje.
- R1 (em curso): baixar e ler o DTM, campo em km nas duas grades, medidas (faixa, bacias, chasmata, menor cratera
  resolvida, ruído), registro com o mapa de cor, prancha DTM.
- R2: `relevo-reia.mjs` + teste; candidatos A (1024) e B (2048), cada um com `parametros.json`, mapa de confissão e
  hashes; prancha "hoje | só DTM | DTM + crateras pela foto" nas vistas de R0 mais Tirawa de perto e o terreno wispy;
  palavra dele.
- F: entradas `rhea/height` e `rhea/normal` na cadeia (gerador no lugar do Saturn; portão do conjunto; DTM pinado por
  sha256 no cache), confissão, `data:verify`, cadeia no terminal dele a pedido dele, `npm run done`, fotos finais,
  merge em linha reta e envio com a palavra dele, conferência no ar por sha256.

## Resultado
- **R1 (07/10; `capturas/reia/dtm-prancha.jpg`, `dtm-medidas.md`; DTM e derivados em `.cache/reia/` com sha256 em
  `FONTES.json`):** o TIFF é 2222×1111 float32 sem nodata, raio em metros (756,15–770,73 km), +leste com 0°E na borda
  esquerda; os dados cobrem 360° exatos (o rótulo diz 2.153,874 m/px, que daria 359,15° — usar 360/2222 °/px, sem
  degrau na costura). Relevo sobre o ELIPSOIDE do app (765,0 × 763,1 × 762,4): RMS 1,37 km (sobre a esfera 1,72 —
  o elipsoide é o certo); p0,1/p99,9 = −4,95/+3,82 km, extremos −6,6/+6,1, desvio 1,31 km (o sintético de hoje tem
  3,10). Bacias: Tirawa 399 km de borda a borda no DTM (centro 34,8°N 205,4°E, 33 km do Gazetteer), borda +1,4, vale
  anelar −2,0, domo central +4,5, sem anel interno; Mamaldi degradada (anel ~1,8 km, alto central +2,9); Powehiwehi
  vale −2,8, domo +5,8; Wakonda 4,9; Samni 5,0–6,6. Chasmata: Avaiki é um vale claro (~2,1 km, ~25 km de largura),
  Galunlati 2–3,6 km entre 31 e 45°N; Yamsi/Vaupas/Pulag não se separam do fundo craterado. Resolução: crateras com
  profundidade de verdade a partir de ~30 km; de 15 a 30 km saem rasas; abaixo de 15 km não existem. Piso de ruído
  ~0,1 km. Registro com o mapa de cor: 0,08 px em 2048 (~0,01°) — as bordas coincidem; Inktomi no DTM com 3,2 km de
  borda a fundo, exatamente na cratera do mapa (o Gazetteer erra 1–2° em parte do dianteiro, 185–295°E: Inktomi,
  Chingaso, Imra, Fuxi, Pachacamac). Dúvidas: depressão de −3 km no último grau do polo norte (real?); Tirawa 399 km
  contra ~360 da literatura.
- **Decisões (Fable, 07/10, pela medida):** X = 30 km. O campo é o DTM; detectadas < 15 km entram com a lei; de 15 a
  30 km COMPLETAM a profundidade que falta (lei − o que o DTM já tem no lugar), nunca somam; ≥ 30 km não entram.
  Posições das crateras pela foto/DTM, não pelo Gazetteer (ele erra 1–2° no dianteiro); o Gazetteer serve à confissão
  e aos nomes. Faixa de quantização: −7..+7 km (55 m por degrau) — a conferir que nenhum texel sature fora do polo.
  Terreno wispy: os grábens largos ficam do DTM; escarpas finas não se inventam.

- **Revisão externa (GPT pelo Codex, 07/10; `.cache/revisoes/plano-reia-gpt-2026-10-07.md`, conferida):** aceitos os
  quatro bloqueadores — filtrar crateras antes do miolo (D desconhecido fora), operação de COMPLETAR que preserva a
  base medida (nunca somar cavidade sobre cavidade), X pela medida do espectro e não pelo catálogo, confissão
  "medido + completado com perfis estimados". Lei para < 30 km sem potência (d/D 0,11 até 12 km; 0,08 de 12 a 30);
  faixa derivada do campo final; exceções cartográficas (360° exatos, residual/a com erro ≤ 0,34 %, planetocêntrica)
  nos parâmetros; folha de prova do detector em Reia; candidatos A 1024, B 2048 e o 1024 derivado de B pela escada;
  os dois canais gravados num só comando em F. O caminho é a montagem `relevo-reia.mjs` sobre o miolo comum, na
  cadeia de Jápeto (`gera-normal-de-dem` não serve: lê outro formato e só grava normal).

## Fora do escopo
Cor de Reia (o mosaico de Schenk fica); as outras luas (Dione, Tétis, Mimas, Encélado já têm modelo medido no app);
o tempo de luz do subsolar; publicar.
