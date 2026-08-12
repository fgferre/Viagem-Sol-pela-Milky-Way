# DADOS-ANEIS-F6 — Raios e larguras dos anéis de Urano, Netuno e Quaoar

Pesquisa de dado para a Onda 6 (F6) do Viagem. Anéis procedurais com raio publicado e fonte
primária citada por linha. Compilado em 2026-08-12. NENHUM valor é de blog ou wiki: só
NASA PDS Ring-Moon Systems Node, JPL Horizons, e papers revisados (com espelho arXiv quando
o original está atrás de paywall).

Fontes-mestre (abreviadas nas tabelas):
- **[PDS-U]** PDS Ring-Moon Systems Node (NASA/SETI), "Vital Statistics for Uranus's Rings"
  (baseada em Nicholson et al. 2018, *Planetary Ring Systems*, CUP; e Showalter & Lissauer 2006, Science 311)
  — https://pds-rings.seti.org/uranus/uranus_rings_table.html
- **[PDS-N]** PDS Ring-Moon Systems Node, "Vital Statistics for Neptune's Rings"
  (baseada em Porco et al. 1995, *Neptune and Triton*; de Pater et al. 2018, *Planetary Ring Systems*, CUP)
  — https://pds-rings.seti.org/neptune/neptune_rings_table.html
- **[French24]** French, Hedman, Nicholson, Longaretti & McGhee-French 2024, "The Uranus system
  from occultation observations (1977–2006)", Icarus 411, 115957 — https://arxiv.org/abs/2401.04634 (Tabela 5)
- **[Molter19]** Molter et al. 2019, "Thermal emission from the Uranian ring system", AJ 158:47
  — https://arxiv.org/abs/1905.12566 (larguras do ε: valores de Karkoschka 2001c; albedo: Karkoschka 1997)
- **[dePater18]** de Pater, Renner, Showalter & Sicardy 2018, "The rings of Neptune", cap. 5 de
  *Planetary Ring Systems*, CUP — https://arxiv.org/abs/1906.11728 (Tabelas 5.1 e 5.3, texto extraído do PDF)
- **[Morgado23]** Morgado, Sicardy, Braga-Ribas et al. 2023, "A dense ring of the trans-Neptunian
  object Quaoar outside its Roche limit", Nature 614, 239–243 — https://www.nature.com/articles/s41586-022-05629-6
- **[Pereira23]** Pereira et al. 2023, "The two rings of (50000) Quaoar", A&A 673, L4
  — https://arxiv.org/abs/2304.09237
- **[Horizons]** NASA/JPL Horizons, dados físicos dos corpos 799 (rev. 2025-09-25) e 899 (rev. 2026-07-08)
  — https://ssd.jpl.nasa.gov/horizons/ (API, `COMMAND='799'`/`'899'`, `OBJ_DATA='YES'`)
- **[Chancia16]** Chancia & Hedman 2016, "Are there moonlets near the Uranian α and β rings?", AJ 152
  — https://arxiv.org/abs/1610.02376 (larguras gerais 1–100 km, atribuídas a French et al. 1986)

## Corpos pais (denominador da razão r/R)

| Corpo | R equatorial (km) | FONTE |
|---|---|---|
| Urano | 25.559 ± 4 (1 bar) | [Horizons] 799; mesmo valor de referência usado por [French24] |
| Netuno | 24.766 ± 15 (1 bar) | [Horizons] 899 · **divergência menor**: IAU/WGCCRE (Archinal et al. 2018) lista 24.764 km — diferença de 2 km, irrelevante para o shader |
| Quaoar | 543 ± 2 (raio equivalente em área); semieixo aparente 579,5 ± 4,0; achatamento 0,12 ± 0,01 | [Pereira23] · **divergência**: [Morgado23] adotou R = 555 km — afeta a razão r/R (7,47 vs 7,4) |

## 1. Urano — 10 anéis principais

Semieixos maiores: [French24] Tabela 5 (precisão sub-km, ocultações 1977–2006 + Voyager 2);
λ do [PDS-U] (o ajuste circular do λ é problemático em [French24] — poucas detecções seguras).
Larguras médias, excentricidade, inclinação e profundidade óptica: [PDS-U].
Regra geral das larguras: "narrow ringlets with widths between 1 and 100 km" (French et al. 1986, citado por [Chancia16]).

| Anel | raio a (km) | largura (km) | e | i (°) | r/R (R=25.559) | τ (prof. óptica) | Nota visual | FONTE da linha |
|---|---|---|---|---|---|---|---|---|
| 6 | 41.837,09 ± 0,10 | 1,53 | 0,00102 | 0,0607 | 1,637 | ~0,3 | traço fino | a: [French24] · resto: [PDS-U] |
| 5 | 42.234,89 ± 0,09 | 2,28 | 0,0019 | 0,0559 | 1,652 | ~0,5 | traço fino | a: [French24] · resto: [PDS-U] |
| 4 | 42.571,12 ± 0,09 | 2,33 | 0,00106 | 0,032 | 1,666 | ~0,3 | traço fino | a: [French24] · resto: [PDS-U] |
| α | 44.718,47 ± 0,09 | 8,46 | 0,00076 | 0,015 | 1,750 | ~0,4 | 2º/3º mais visível | a: [French24] · resto: [PDS-U] |
| β | 45.661,06 ± 0,09 | 9,49 | 0,000442 | 0,005 | 1,786 | ~0,3 | 2º/3º mais visível | a: [French24] · resto: [PDS-U] |
| η | 47.176,01 ± 0,09 | 1,6 (+ bainha "η C" de 40 km, τ 0,02) | ~0 | ~0 | 1,846 | ~0,4 | traço fino c/ véu | a: [French24] · resto: [PDS-U] |
| γ | 47.626,17 ± 0,09 | 2,15 (variável; modo m=0 de 5,15 km de amplitude) | 0,001092 | 0 | 1,863 | ~0,3 | traço fino | a: [French24] · resto: [PDS-U] |
| δ | 48.300,62 ± 0,09 | 4,6 (variável; dominada por modo m=2; + "δ C" de 15 km, τ 0,03) | — | 0,001 | 1,890 | ~0,5 | traço fino | a: [French24] · resto: [PDS-U] |
| λ | 50.024 | 2,3 (com aglomerados; + "λ C" de 3,1 km interno) | ~0 | ~0 | 1,957 | ~0,1 | pó, quase invisível em luz refletida | [PDS-U] |
| ε | 51.149,07 ± 0,09 | **19,7 (periapse) → 96,4 (apoapse)**; média 58,1 | 0,00794 | 0 | 2,001 | 0,5 a 2,3 | **domina o sistema**; ~5× mais largo e ~2,5× mais brilhante no apoapse | a: [French24] · largura 19,7/96,4: Karkoschka 2001c via [Molter19] · média/τ: [PDS-U] |

Albedo/opacidade (dosagem honesta): partículas MUITO escuras — albedo Bond 0,061 ± 0,006
(Karkoschka 1997, via [Molter19]); albedo de partícula ~0,05 assumido em [Molter19]. "Dark at all
visible wavelengths, spectrum similar to carbon" (Tiscareno 2013, *Planetary Rings*, arXiv:1112.3305).
Os opticamente relevantes a olho de câmera: **ε ≫ α ≈ β**; os outros sete são traços de 1,5–4,6 km.

Anéis largos difusos (véus, só para modo exagero/poeira): ζ a 39.600 km (L 3.500, τ ~0,0045),
ν a 67.300 km (L 3.800, τ 5,6e-6), μ a 97.700 km (L 17.000, τ 8,5e-6) — [PDS-U] (Showalter & Lissauer 2006).

## 2. Netuno — 6 anéis

Fonte primária da tabela: [dePater18] Tabela 5.1 (que reproduz de Pater & Lissauer 2015, dados de
Porco et al. 1995 / Voyager 2). [PDS-N] concorda em todos os valores.

| Anel | raio (km) | largura (km) | r/R (R=24.766) | τ (prof. óptica) | Nota visual | FONTE da linha |
|---|---|---|---|---|---|---|
| Galle | 42.000 | 2.000 | 1,696 | ~1e-4 (de poeira) | véu tênue | [dePater18] Tab. 5.1 · [PDS-N] |
| Le Verrier | 53.200 | ~100 ([PDS-N]: <100) | 2,148 | ~0,003 | traço fino, 2º mais visível | [dePater18] Tab. 5.1 · [PDS-N] |
| Lassell | 55.200 | 4.000 | 2,229 | ~1e-4 | véu tênue (extensão externa do Le Verrier) | [dePater18] Tab. 5.1 · [PDS-N] |
| Arago | 57.200 | — (borda externa brilhante do Lassell) | 2,310 | — | realce de borda, não anel próprio | [dePater18] Tab. 5.1 · [PDS-N] |
| co-orbital de Galatea (sem nome) | 61.953 | — | 2,502 | — | poeira na órbita de Galatea | [dePater18] Tab. 5.1 · [PDS-N] |
| Adams | 62.933 | 15 (nos arcos) | 2,541 | 0,1 nos arcos; 0,003 no resto | o anel dos arcos; "radial wiggles" por Galatea | [dePater18] Tab. 5.1 · [PDS-N] |

### Arcos do anel Adams (estado Voyager 1989)

Extensões individuais ~1° a ~10°, todos confinados em 40° de longitude; largura radial típica
~15 km; τ ~0,1; fração de poeira ~50% nos arcos, ~30% no resto — [dePater18] §5.1.
Longitudes relativas (do trailing para o leading) — [PDS-N]:

| Arco | posição relativa | extensão | nota |
|---|---|---|---|
| Fraternité | referência (trailing, longitude 0°) | ~10° (o maior) | o mais brilhante |
| Égalité 1, 2 | Égalité 2 a 10,7° à frente de Fraternité (arco duplo) | ~3° | brilho variável entre 1 e 2 |
| Liberté | 12° à frente de Égalité 1 | ~3° | **desapareceu/apagou pós-2003** (Keck/HST) |
| Courage | ~7,3° à frente de Liberté | ~1° (o menor) | o mais tênue; pulou ~8° em 2003; **apagado** |

Refletividade dos arcos: I/F = 0,055 ± 0,004 (Voyager, 0,5 µm) vs Galatea 0,079 — [dePater18] Tab. 5.3
(Porco et al. 1995; Karkoschka 2003). Partículas "very dark, perhaps as dark as the particles in the
uranian rings", muito vermelhas (poeira) — [dePater18] §5.3.
Estado atual honesto: só Fraternité + Égalité persistem estáveis; Liberté e Courage sumiram
([dePater18] §5.6.2, Keck/HST 2009+).

## 3. Quaoar — 2 anéis (ambos FORA do limite de Roche clássico)

| Anel | raio (km) | largura (km) | r/R (R=543) | τ (prof. óptica) | Nota | FONTE da linha |
|---|---|---|---|---|---|---|
| Q2R (interno) | 2.520 ± 20 | ~10 (típica) | 4,64 | ~0,004 | tênue; descoberto na ocultação de 2022-08 | [Pereira23] |
| Q1R (externo) | 4.057 ± 6 | núcleo denso ~5 (FWHM) dentro de estrutura de ~60; azimutalmente 5–300 | 7,47 | núcleo ~0,4; azimutalmente 0,004–0,7 | **irregular como os arcos de Netuno**: denso só num setor | raio/núcleo: [Pereira23] · faixas 5–300 km e τ 0,004–0,7: [Morgado23] |

**Divergência (achado, não problema):** [Morgado23] publicou Q1R a "~4.100 km" (7,4 raios, com
R = 555 km); [Pereira23], com mais cordas e o ajuste elíptico do corpo, refinou para 4.057 ± 6 km
(7,47 raios com R = 543 km). Usar Pereira (mais recente, mesmo grupo, mais cordas); a razão ~7,4–7,5 R
é robusta nas duas.

**Fato notável (por linha de Q1R e Q2R):** o limite de Roche clássico de Quaoar é ~1.780 km
(ρ partícula = 0,4 g/cm³) ≈ 3,3 R — [Morgado23]. Ambos os anéis orbitam MUITO além dele, onde a
teoria clássica (desde 1850) esperava acreção em lua, não anel. Q1R fica perto da ressonância
spin-órbita 1/3 com a rotação de Quaoar (17,68 h) e da ressonância de movimento médio 6/1 com a
lua Weywot — [Morgado23]; Q2R perto da 5/7 spin-órbita — [Pereira23].

## Divergências registradas (resumo)

1. **Q1R**: ~4.100 km [Morgado23] vs 4.057 ± 6 km [Pereira23] → adotar Pereira, marcar a faixa.
2. **R Netuno**: 24.766 ± 15 km [Horizons] vs 24.764 km (IAU/WGCCRE 2015) → 2 km, cosmético.
3. **Largura do γ (Urano)**: [PDS-U] lista 2,15 km; a largura real varia (modo m=0 de 5,15 km de
   amplitude, nota do próprio PDS) e a literatura clássica dá faixas maiores → tratar TODA largura
   de anel estreito de Urano como média de uma faixa (French et al. 1986: 1–100 km no conjunto).
4. **Le Verrier**: "<100 km" [PDS-N] vs "~100 km" [dePater18] → mesma coisa, usar ~100.
5. **Arcos de Netuno**: os dados de longitude são o retrato Voyager 1989; hoje só Fraternité+Égalité
   persistem → o shader deve tratar longitudes de arco como época-1989 (e é honesto desenhar só 2 arcos
   em época atual).

## Recomendação de dosagem visual honesta (3 linhas)

1. **Urano**: a olho de câmera só o **ε** existe (com largura variando 20→96 km ao longo da órbita —
   a assimetria É a assinatura visual), **α e β** como traços finos perceptíveis; os outros sete são
   linhas de ~1 px que só aparecem de perto — e tudo escuro como carvão (albedo ~0,05), nunca
   Saturno em miniatura.
2. **Netuno**: nenhum anel honestamente "visível" — **Adams e Le Verrier** como traços finíssimos e
   escuros, com os **arcos (Fraternité + Égalité; τ 0,1 vs 0,003)** como os únicos pontos onde o Adams
   acende; Galle/Lassell são véus 1e-4, só para modo exagero.
3. **Quaoar**: **Q1R** honesto = quase invisível: um traço de τ ~0,004 com UM setor denso estreito
   (~5 km, τ ~0,4) — um "arco" que pisca ao cruzar; **Q2R** ainda mais tênue; o espetáculo aqui é
   didático (anéis onde deveria haver lua), não luminoso.
