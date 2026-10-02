# Plano — relevo inventado com base científica na metade sem dado de Plutão e Caronte (aprovado em 01/10/2026)

## Para o Felipe (o resumo em palavras simples)

**Onde estamos.** Desde 01/10, Plutão e Caronte têm o relevo REAL medido pela
New Horizons — mas só em menos da metade de cada um. O resto é uma bola lisa.
Você escolheu inventar essa metade com base científica (como Reia e Jápeto no
seu projeto Saturn) e confessar na ficha.

**O que existe nessa metade:** nenhum mapa de altura. Há fotos BORRADAS da
aproximação, quatro perfis da borda do planeta contra o céu e, no sul, só
umas poucas imagens muito escuras (o sul estava na noite do inverno). Medi a
beirada do dado real: ela é tão áspera quanto o miolo — a costura só precisa
encostar o inventado no medido sem degrau e sem faixa.

**Como o relevo vai ser inventado:**
1. **O lado medido ensina.** Medimos no dado real quão áspero é o chão em
   cada tamanho (de 1 a 500 km), quantas crateras de cada tamanho (o
   catálogo de crateras do lado medido é público) e o formato delas — terreno
   por terreno.
2. **O mapa geológico publicado diz o que vai onde.** Os cientistas da missão
   mapearam o lado de trás de Plutão pelas fotos borradas: um cinturão de
   "terreno em lâminas" 2 a 4 km mais alto, quase sem crateras; a faixa escura
   do equador, cheia de crateras; um manto liso no norte; planícies de gelo
   jovens; e uma cratera de 250 km com nome (Simonelli). Em Caronte, o
   cinturão de cânions provavelmente dá a volta, e há crateras grandes
   apontadas. O sul recebe o terreno mais ao sul do lado medido — palpite, e
   a ficha diz.
3. **Crateras sorteadas** com a quantidade e o formato medidos, velhas e novas
   misturadas; as reais cortadas pela borda do dado são completadas com o
   tamanho que o catálogo dá.
4. **A costura** segue uma conta da geoestatística (simulação condicional):
   na emenda o terreno É o medido, longe é o inventado, e a aspereza é a
   mesma o caminho todo.
5. **A prova antes da obra:** escondemos um pedaço do dado real que
   conhecemos, deixamos o código reinventá-lo e comparamos com a verdade, na
   mesma luz.
6. **Semente fixa:** a prévia que você aprovar é exatamente o que vai para o
   app, em todos os tamanhos do mapa; o gerador recusa qualquer outra coisa.
7. **A ficha confessa** o que é medido e o que é inventado.

**O que você vai ver e decidir (sempre por foto):**
- **Foto 1 — a prova:** o pedaço escondido, verdadeiro × reinventado, lado a
  lado na mesma luz. Se não convencer, a receita muda antes de qualquer outra
  coisa.
- **Foto 2 — a planície Sputnik:** com e sem o alisamento do grão de ruído que
  o dado real traz ali.
- **Foto 3 — a metade inventada pronta**, na qualidade final, ao lado da de
  hoje: as emendas com Sol rasante, o lado de trás inteiro, o sul, e um
  mapinho de onde é medido e onde é inventado. Junto, um A/B: nos trechos em
  que o próprio dado medido é BORRADO (a sonda viu de longe), completar ou
  não o detalhe fino inventado por cima da forma medida — o mesmo espírito
  do seu "melhorar o que está borrado".
- **Seus cliques:** dois comandos no começo (guardam as alturas medidas num
  arquivo local; o mapa do app sai idêntico ao de hoje) e alguns no fim
  (gerar os mapas finais, otimizar, manifesto, conferência). Publicar
  continua sendo seu.

**Fora deste plano:** mapa de relevo com resolução maior que a de hoje;
sombras projetadas pelo relevo (como em Hipérion); mexer na COR da metade sem
dado (a sombra que a cor traz das fotos segue anotada à parte); Tritão e os
demais do item 144 (depois, com a mesma receita).

---

## Execução (para quem implementa)

Revisado duas vezes antes da aprovação (crítica Opus e uma revisão externa
trazida pelo Felipe), cada ponto conferido no código. O plano vai para
**`PLAN-RELEVO.md`** na raiz — o `PLAN.md` é o da poeira do Gaia, com E4–E6
abertas, e não se toca (precedentes: `PLAN-HIPERION.md`, `PLAN-UI.md`).

### Fatos medidos e conferidos (01/10)
- Mapas 4096×2048 (Plutão ~1,8 km/texel; Caronte ~0,9). Coluna 0 = 180°E
  (centro 0°). Dado de Plutão: −50° a +89°, no equador só 84°E–247°E, acima
  de +60° em toda longitude (Sputnik atravessa a costura da longitude).
  Caronte: hemisfério voltado para Plutão, −42° a +89°; vazio nas colunas
  0–964 e 2789–4095.
- **(128,128,255) não é assinatura de vazio** (é o degrau de inclinação
  0–0,45°; 0,1–0,8 % dos texels medidos). Vazio só pela máscara do cache.
  Com o vazio limpo, a beirada do dado é tão áspera quanto o miolo (Plutão
  7,2° a 1 texel, 6,7–8,0° até 60; Caronte 3,3° → 3,1–4,8°).
- `assaNormais` (`gera-normal-de-dem.mjs:815`) deixa lisos também os texels
  MEDIDOS cujo estêncil de 5 pontos toca o vazio; preencher o vazio muda a
  normal desse anel mesmo com as alturas intactas.
- `mediaDeCaixa` é anisotrópica (leste–oeste ~6 colunas de origem; norte–sul
  2 das ~6 linhas, `:516`). A guarda lê a SUA grade de 720×360 (`:377`, `:747`).
- O app carrega o mapa por `fetch` + `createImageBitmap` (flipY, sem
  conversão de cor; `texturas.ts:427–441`), num tier de tamanho próprio.
- Teste que pina a chave: `gera-normal-de-dem.test.mjs:256` (`vazioLiso` só em
  pluto e charon; lista dos sete corpos).

### Ciência — as âncoras (pesquisa de 01/10 + revisão)
Longitudes: Plutão leste 0–360, lado de trás centrado em 0°E; Caronte 0° no
ponto voltado para Plutão, lado de trás centrado em 180°E.
- **Observado sem DEM:** Plutão, aproximação de 2,2 km/px (borda oeste) a
  40,6 km/px (leste); 4 perfis de limbo (0,35–0,89 km/px) e sombreamento no
  terminador [St21]; ao sul de ~38°S, só imagens com luz de Caronte [La21].
  Caronte, 30 a 2 km/px; o sul com luz de Plutão, inclusive o polo
  (PIA20375). Nunca imageado de dia: 17,8 % de Plutão, 19,5 % de Caronte
  [Ro17].
- **Plutão, unidades do lado de trás [St21, mapa de 12 unidades, Fig. 5]:**
  terreno em lâminas em ±30° por >220° de longitude (falta só em 75–210°E),
  2–4 km acima do entorno, quase sem crateras (exemplo medido: Tartarus
  Dorsa); faixa escura equatorial ±13° de Krun (225°E) a Cthulhu (80°E),
  fragmentada (Krun = planalto áspero com fossas de até 3 km; Cthulhu =
  planície craterada antiga); manto ao norte de ~15°N; planícies voláteis
  claras e jovens só no oeste do lado de trás (até ~220–290°E); **Simonelli**
  (12°N 315°E, ~250 km, pico central — a única cratera certa); possível
  cratera soterrada de 350–400 km (38°N 357°E); depressões e lineamentos
  escuros em 330–10°E (zona antípoda de Sputnik e/ou cristas e vales
  norte–sul ao longo de 330°E, 3200 × 300–400 km).
- **Caronte, lado de trás [Be17, Be21, Sch18C]:** consistente com o medido;
  o cinturão de cânions provavelmente dá a volta (escarpas medianas de 213
  km, espaçadas 75–115 km perto de Arroway; lineamentos em 110–125°E e
  174°E/13°N; possível Mandjet em 255–300°E). Serenity 40–50 km de largura,
  ≥5 km de relevo; Mandjet ≥450 × ~30 km, paredes de 5–7 km. Crateras
  candidatas sem diâmetro: A (93°E), Arroway (108°E), B (~153°E), C (~156°E),
  U (105°E 36°N, a maior); uma de raios claros de ~100 km a leste de Argo;
  planície lisa circular >400 km em Argo Chasma (15°N 90°E).
- **Crateras — tamanhos [Ro17, Si19, Si21]:** lei diferencial ≈ −3 acima de
  ~13–15 km; abaixo, mais rasa (Caronte VP −1,7; Cthulhu −0,6 a −1,4), dobra
  gradual. N(≥D) por 10⁶ km² (D = 8/11,3/16/32 km): Cthulhu 262/153/78/26;
  latitudes médias O 522/326/169/21; "fretted" 362/213/121/14; norte
  180/119/65/13; Vulcan Planitia 349/206/83/15; Tombaugh leste 17/15/7/2;
  Sputnik, lâminas, montes: zero.
- **Crateras — forma [Ro21]:** d/D mediana Plutão 0,12 (6–14 km), 0,092
  (14–20), 0,067 (20–40), 0,048 (≥40); Caronte 0,09–0,11 (6–20), 0,093
  (20–40), 0,071 (≥40). Borda/D ~0,03 (<14 km), ~0,02 (≥20). Pico central:
  Plutão 11/48/79/100 % (10–14/14–20/20–40/≥40 km); Caronte 17/40/62/100 %.
- **Aspereza [Sch18P, Sch18C, Co21]:** Plutão σ da altura 1,29 km (Sputnik
  0,27; planícies 0,71–0,75; lâminas 1,17, média +2,45 km); inclinação a ~1
  km: Sputnik 4,4°, planície craterada O 7,9°, erodida L 9,0°, Tombaugh L
  14,8°, maciços 13,6–19,2°. Caronte σ 2,53 km (Oz 2,65; VP 1,70); precisão
  vertical do DEM 0,1–1 km. Espectro: Plutão uma lei; Caronte dobra em ~150
  km. Hurst não publicado → sai da medida.
- **Fontes baixáveis:** catálogo de crateras de Robbins **v2** (Zenodo
  8292107, 2023: bases de Plutão e Caronte + guias de região com área e
  diâmetro de completude) — preferido à v1; tabelas de Ro21 (zenodo 7753861).
- Siglas: St21 Stern+ Icarus 356:113805; La21 Lauer+ "The Dark Side of
  Pluto" (arXiv:2110.11976); Sch18P/C Schenk+ Icarus 314:400 e 315:124; Be17
  Beyer+ Icarus 287:161; Be21 Beyer+ PSJ 2:141; Ro17 Robbins+ Icarus 287:187;
  Si19 Singer+ Science 363:955; Si21 Singer+ arXiv:2008.10153; Ro21 Robbins+
  Icarus 356:113902; Co21 Conrad+ JGR-P 126:e2020JE006641. Simulação
  condicional por correção de resíduos: capítulo da Springer citado na revisão
  (link.springer.com/chapter/10.1007/978-3-319-78999-6_1, §1.3, eq. 1.26).

### Peças que existem e serão reusadas
- `scripts/data/atlas/gera-normal-de-dem.mjs`: `lerAlturaEmMetros`,
  `mediaDeCaixa`, `orientar`, `guardaDeAlinhamento`, `assaNormais`; tabela
  `CORPOS` (moon, mercury, mars, ceres, vesta, pluto, charon).
- `scripts/data/atlas/relevo-e-cor-de-hiperion.mjs`: padrão de script que
  importa o gerador como biblioteca; `celulasTocadasPelaTampa` (`:795`, calota
  perto do polo com volta); porta de `amostrarCrateras`.
- `src/three/world/corpos/esculpido.ts`: `geradorDeSemente` (mulberry32).
- Projeto Saturn dele (`github.com/fgferre/Saturn`,
  `scripts/bake-moon-relief.mjs`, `synthTopo`): o ponto de partida conceitual.
- Fotos: o equipamento de 01/10 (`/private/tmp/claude-501/…/10d9f9cc-…/
  scratchpad/plutao-relevo-rig/`: `foto-pn.mjs`, `prancha.mjs`,
  `costura.mjs`, `rms.mjs`) — COPIAR para o scratchpad desta rodada no
  primeiro passo.

### Ramo, regras e trabalhadores
- `PLAN-RELEVO.md` com commit no `main`; obra no ramo `relevo-inventado`;
  backup `git push origin relevo-inventado`; merge no `main` só com a foto
  final aprovada.
- Scripts de dados quem roda é o Felipe. As PRÉVIAS o assistente gera num
  script do scratchpad que importa as funções puras e escreve só no
  scratchpad. Testes por filtro de nome (`npx vitest run relevo-inventado`).
- Trabalhadores: E1, E7 e o equipamento de fotos em Sonnet (brief fechado);
  E2 a E6 em Opus (numérica, geoestatística, escolhas no escopo);
  revisão Opus do diff inteiro antes da Foto 3. O main olha toda prancha
  antes do Felipe.

### Requisitos que valem para tudo
- Toda operação de grade dá a volta em longitude e é dimensionada em km
  (leste–oeste = Δ·cos lat); distância = corda 3D; médias pesadas por cos lat;
  todo filtro ignora o vazio (convolução normalizada pela máscara).
- **S(d)** = média, sobre os pares válidos, de (h(x+d) − h(x))², por eixo
  (norte–sul e leste–oeste) em km verdadeiros, pesada por cos lat, em ~20
  distâncias log-espaçadas de 1 texel a ~500 km, com subamostragem.
- O inventado passa pelo MESMO filtro do DEM: oitavas finas avaliadas no
  arranjo dos pixels de origem (300 m) e médias como `mediaDeCaixa`; calibrar
  contra o S(d) TOTAL medido. Oitava mais fina ≥ ~3 texels.
- Duas regiões de saída: **miolo** (texel cujo estêncil de 5 pontos é todo
  medido) sai com o RGB IDÊNTICO ao de hoje; **anel de borda** (medido que
  tocava o vazio + parciais) ganha normal nova — faz parte da costura e vai
  na foto.
- Pólo sul: sem a trava de 80° de `assaNormais` só onde o corpo pedir (o
  norte medido fica byte a byte). Validação: cobertura 100 % preenchida,
  alturas e derivadas finitas, nenhum NaN.

### Etapas
**E1 — cache das alturas medidas (Sonnet).** Em `gera-normal-de-dem.mjs`,
depois de `lerAlturaEmMetros` + `orientar`: gravar em `.cache/relevo/`
(ignorado pelo git) as alturas JÁ no giro da casa, a máscara E a grade de
720×360 que a guarda leu; cabeçalho com url e tamanho da fonte, versão do
filtro (`linhasPorSaida`), giro aplicado, endianness e sha256 de cada
payload; payload Float32 alinhado; gravação em temporário + renomeia. Com o
cache presente e íntegro: ler dele, sem rede, e RODAR a guarda sobre a grade
guardada (mesmos números). `--rede` força a leitura remota. A condição do
cache não depende de flag que a E3 apague; os outros cinco corpos não mudam.
Conferência: `normal.png` de Plutão e Caronte idêntico por md5 ao de hoje.
**Felipe roda** os dois comandos — ~745 MiB pela rede, uma vez.

**E2 — mapa de unidades e medidas do lado medido (Opus; só leitura).**
- O assistente baixa para `.cache/relevo/` o catálogo Robbins v2 (com os guias
  de região) e as tabelas de Ro21.
- **Mapa de unidades do lado de trás:** digitalizar em grosso a Fig. 5 de St21
  como polígonos lat/lon num JSON pequeno e citado,
  `scripts/data/atlas/fonte/{pluto,charon}-lado-de-tras.json`, com as feições
  nomeadas (posição, tamanho, tipo) e, por unidade, a REGIÃO-EXEMPLO no lado
  medido (Plutão: Cthulhu, Tartarus Dorsa, manto do norte, planície volátil,
  Krun; Caronte: Oz Terra, Vulcan Planitia, Serenity/Mandjet). Sul: a
  unidade mais ao sul do lado medido (Plutão ≈ Cthulhu; Caronte ≈ Vulcan),
  marcada como palpite.
- Função pura `medeLadoMedido` em `scripts/data/atlas/relevo-inventado.mjs`
  (módulo novo), rodada do scratchpad sobre o cache: por região-exemplo, RMS
  de inclinação, S(d) por eixo, média e σ da altura; crateras: CONTAGEM só
  acima do diâmetro de completude da região (guia v2); FORMA só onde a
  cratera é resolvida no cache (≥ ~10 texels de diâmetro: Plutão ≳ 18 km,
  Caronte ≳ 9 km), com as crateras recentradas no DEM antes de empilhar
  perfis radiais (d/D, borda, fundo, pico, dispersão); abaixo disso, a forma
  vem das tabelas de Ro21 (medidas no DEM de 300 m).
- Saída: `.cache/relevo/<id>-medidas.json` + resumo no `PLAN-RELEVO.md`; o
  main confere com a seção Ciência.
- **E2a FEITA (01/10):** `fonte/pluto-lado-de-tras.json` (St21 Fig. 5,
  digitalizada da imagem do PDF; 10 unidades — lâminas, planícies claras,
  máculas, planícies crateradas tipo Cthulhu, terreno intermediário, quatro
  mantos, terreno degradado; Simonelli, a crescente soterrada, 5 lineamentos,
  3 fossas, a zona antípoda e o sistema de 330°E; sul abaixo de −36° =
  planície craterada, palpite) e `fonte/charon-lado-de-tras.json` (Be21 não
  tem mapa de unidades: polígonos são palpite guiado pelas escarpas da Fig.
  2b de Be21; terras altas tipo Oz, cinturão tectônico dando a volta,
  planície lisa tipo Vulcan + Argo; crateras U ~120 km, A ~30, Arroway ~60 —
  é a "de raios a leste de Argo" —, B ~50, C ~70, diâmetros medidos no mapa
  da casa; sul abaixo de −28° = planície lisa, palpite). Polígonos com
  pontes de largura zero (regra par-ímpar) e leve sobreposição entre
  vizinhos (normalizar os pesos). Pranchas de conferência no scratchpad
  (`unidades/`), vistas pelo main.
- **Achados da E2a que entram na E2b/E3:** (1) há DADO MEDIDO BORRADO junto
  do vazio — Plutão: faixa de 10–15° na borda norte do lado de trás e
  235–255°E 0–16°N; Caronte: 55–100°E ao sul de 30°N e a borda oeste em
  250–300°E; os centros de U e C caem aí. (2) Em Plutão, a faixa ~10–100°E
  tem FOTO NÍTIDA mas não tem DEM — o catálogo de crateras cobre essa faixa.
- **E2b FEITA para Caronte (01/10; Plutão espera o cache):** módulo
  `relevo-inventado.mjs` (medidas puras, 5 testes) + runner no scratchpad
  (`e2b/medir.mjs <corpo>`, 17 s). RMS por exemplo: Oz 8,86°, Serenity 12,84°,
  Vulcan 8,39°, global 8,48° (= `assaNormais`); σ da altura global 2,50 km
  (literatura 2,53). Vulcan N(≥8/11,3/16/32) = 226/176/100/0 contra Si21
  349/206/83/15. **Crateras no cache são mais rasas e de borda fraca** que
  em Ro21 (d/D 0,058/0,073/0,058/0,040 contra 0,108/0,108/0,093/0,071; borda
  ~0,2–0,4 da publicada): as crateras de Ro21 remedidas no cache saem com
  0,71–0,88 da profundidade — é a resolução efetiva do DEM. DECISÃO: os
  moldes de cratera da E3 são os EMPILHADOS no cache (como a cratera aparece
  nesta resolução — a prova da E4 compara igual com igual); a amplitude de
  Ro21 fica guardada para uma variante "nítida", que vai junto do A/B do
  dado borrado na Foto 3. **Crateras reais no vazio de Caronte:** 6 da
  região 6 (26,9–92,6 km), entre elas a A (30,6 km, 1,8°N 92,9°E) e uma de
  92,6 km certa em 23°S 44,7°E. **Dado borrado:** a 50 km do vazio, as
  bandas 0–4 estão borradas em 90/70/60/51/29 % da área; a borda sudeste
  (30–130°E, −40° a 50°N) perde 3–5 oitavas (até σ 15–30 km); 90–210°E em
  30–60°N, 3–4; a borda oeste e a calota norte, ~1 (a calota acima de 60°N é
  preenchimento liso). Prancha `scratchpad/e2b/charon-bandas-borradas.png`.
  **Convenção do catálogo:** em Plutão a longitude leste = valor do catálogo
  + 180° (Sputnik, Burney e Simonelli só caem no lugar assim); em Caronte o
  catálogo já é 0–360.
- **E3.1 FEITA (02/10) — a costura com prova.** `costura` = simulação
  condicional por correção de resíduos, banda a banda (krigagem simples;
  covariância ajustada como bossas não negativas no espectro de Legendre,
  positiva-definida na esfera; nível σ/2 da pirâmide; blocos que dividem a
  fatoração; cascata de descida que repõe o resíduo nível a nível). Decisões
  do main ao longo de quatro trabalhadores: (1) escalas acima de R/5 NÃO são
  sorteadas nem krigadas — no vazio são a continuação harmônica (membrana,
  exata no dado, limitada) do medido; no Caronte real carregam só 0,1–0,35 %
  da inclinação; (2) o medido é PREENCHIDO pela membrana antes de ser
  separado em bandas com o filtro simples (sem o viés do desfoque mascarado
  na emenda); (3) os testes vigiam o que a imagem mostra — inclinação RMS
  por faixa de distância em [0,90; 1,10], p99 em [0,80; 1,20], energia por
  banda só nas bandas com ≥ 2 % da inclinação — num mundo de teste com o
  espectro medido de Oz Terra. Resultado em tamanho real (vazio real de
  Caronte, 10 bandas): 49 s, 1,36 GB; F = T byte a byte no dado; inclinação
  RMS 0,96/0,97 a ±1 texel, 0,93 a 3–10 texels do lado do vazio; p99
  0,92–1,09. LIMITAÇÃO CONHECIDA: as bandas 1–5 perdem energia logo dentro
  do vazio (0,42–0,66 nos primeiros bins; vazamento entre bandas) — ~7 % a
  menos de inclinação a 3–10 texels, invisível nas pranchas
  (`scratchpad/e3/prova-v3-*.png`). Se a prova real (E4) mostrar anel, a
  correção é somar ruído independente nessas bandas com a amplitude que falta
  por distância (medida no conjunto sintético).
- **E3.2 FEITA em Caronte (02/10) — a síntese por unidade, e o que ela
  ensinou.** `sintetizaCorpo`: pesos de unidade (polígonos, transição larga),
  níveis de unidade RELATIVOS e centrados no vazio (restrições interiores da
  membrana; TA +2121, C +1444, PL −2481 m), ruído por banda com amplitude
  √(Σ w·g²), 6 crateras reais do catálogo no lugar + ~9 mil sorteadas por
  unidade (moldes empilhados do cache), máscara do dado borrado (5b, chave
  `completaBorrado`), calibração em lags ≤ 30 km (TA 1,005; C 1,009; PL 1,020
  em RMS de inclinação; S(d) do cinturão não fecha por eixo porque o exemplo
  é anisotrópico 2,2–2,85× — é trabalho da tectônica, E6), `assaNormais`
  ganhou `{ travaNoSul }` (padrão inalterado). 36 testes verdes; Caronte em
  128 s / 1,85 GB. **Visto pelo main nas pranchas: o ruído gaussiano, mesmo
  calibrado, sai "papel amassado"** — o terreno real é planície lisa
  pontuada por crateras e escarpas nítidas, e a emenda some como linha mas
  aparece como mudança de caráter. DECISÃO (02/10): a textura fina (bandas
  < ~40 km, ~97 % da inclinação) passa a ser montada com PEDAÇOS DO TERRENO
  MEDIDO da mesma unidade — colcha à Efros–Freeman na esfera (retalhos no
  plano tangente local, escolhidos por casar com os vizinhos na
  sobreposição, corte de erro mínimo, giro aleatório só em unidade sem
  direção, sem repetir a mesma origem por perto, unidade sorteada por
  retalho na transição); o ruído fica só nas bandas 40 km–R/5 (pouca
  inclinação), a membrana acima de R/5, as crateras grandes por molde; a
  costura condiciona tudo como antes. A confissão passa a dizer "montado com
  pedaços do terreno medido do mesmo tipo".
- **E3.4 FEITA em Caronte (02/10) — a colcha.** Retalhos de 140 km com 35 km
  de sobreposição em 20 faixas de latitude (um por polo), cada um copiado por
  uma rotação exata da esfera; 96 candidatos, um dos 5 melhores por SSD
  normalizado pela energia; giro e espelho livres, menos no cinturão
  (alinhado à direção local); sem repetir origem a menos de 3 larguras;
  corte de erro mínimo fechado + correção da costura entre retalhos (o
  descasamento largo sai suavizado em 8 km e o fino por Laplace numa faixa
  de 8 km). Fontes por unidade em `fonte/charon-lado-de-tras.json`
  (`fontes`, citadas). Bandas 0–4 da colcha, 5–6 ruído, acima de R/5
  membrana; crateras: as 6 reais + 60 sorteadas ≥ 40 km. Conferência: RMS de
  inclinação 1,016 / 1,057 / 1,030 das fontes; S(d) ≤ 30 km em 0,92–1,13;
  80 s, 1,62 GB. Visto pelo main: o lado de trás agora tem escarpas, cristas
  e planícies do mesmo tipo do medido, o cinturão continua dos dois lados,
  sem grade de retalhos nem repetição evidente
  (`scratchpad/e3/charon-*-v2.png`). Esquisito a decidir no A/B do borrado:
  a calota norte (preenchimento liso no DEM) ganha uma textura de buracos
  densa demais. 21 testes do módulo (colcha: determinismo, corte sem salto,
  sem repetição, `ocultar` não vaza, plano tangente nos polos) + 20 do
  gerador; `npm run done` verde (114 arquivos, 3266 testes).

**E3 — o núcleo da síntese (Opus).** No mesmo módulo, funções puras; UMA
função exportada serve à prévia e ao gerador; semente fixa por corpo
(`CORPOS.<id>.vazioInventado: { semente, sha256Aprovado }` substitui
`vazioLiso`, e o teste `:256` acompanha).
1. **A costura primeiro, com prova.** Simulação condicional por correção de
   resíduos, oitava por oitava: F = S + K(T − S), com K o MESMO operador
   linear de krigagem simples (covariância do modelo daquela oitava,
   vizinhança local, no nível da pirâmide da oitava) aplicado ao dado T e à
   simulação S nos pontos medidos. Hipóteses escritas no código: cada oitava
   é estacionária com covariância conhecida, e T, perto da emenda, é
   realização do mesmo modelo calibrado. Garantia sob as hipóteses: F = T no
   dado e a covariância do modelo em toda parte (sem degrau, sem anel); a
   vizinhança local é aproximação → PROVA num mundo sintético (T realização
   conhecida do modelo) antes de seguir: energia por oitava × distância à
   emenda plana em ±15 %, gradiente (RMS e p99 por faixa de distância,
   contagens iguais) sem salto.
2. **Pesos de unidade** suaves (JSON + foto borrada), transições largas.
3. **Degrau de unidade** (banda baixa, transição larga): lâminas 2–4 km acima
   (calibrado em Tartarus e nos perfis de limbo), voláteis baixas, o resto
   com média e σ medidos — sem desenhar o contorno do albedo na luz (o
   "relevo da cor" que ele recusou no item 140).
4. **Aspereza fractal:** ruído de gradiente 3D na esfera unitária, UM ruído
   por oitava com amplitude √(Σ w·a²) (sem perda de variância nas
   fronteiras); só oitavas bem menores que a transição variam com a unidade.
5. **Crateras:** densidade e lei da unidade (lâminas e voláteis: zero); forma
   da E2; ejecta ∝ r⁻³ (além da borda); idade → desgaste; ordem de idade com
   herança; círculo máximo, meia-largura em longitude correta perto do polo,
   volta. **Crateras reais primeiro:** TODA cratera do catálogo v2
   (confiança ≥3, acima do diâmetro de completude da região) que cai no
   vazio — inclusive as cortadas pela borda do DEM e as da faixa de foto
   nítida sem DEM (Plutão ~10–100°E) — entra na posição e no diâmetro reais,
   com a forma da E2; as inventadas só completam a lei de tamanhos abaixo da
   completude e onde nunca houve foto. **Na emenda, sem exclusão seca:** as
   inventadas podem encostar e passam pela costura; mede-se a lei de
   tamanhos × distância à emenda (nenhuma faixa sem crateras), e a política
   fina sai da prova E4.
5b. **Dado medido borrado (máscara por oitava):** a E2b mede, por oitava, onde
   o DEM de fato resolve aquele tamanho (energia local da oitava contra a da
   região-exemplo da unidade). Na costura (item 1), cada oitava usa como
   "dado" só onde o DEM a resolve: nos trechos borrados, as oitavas grandes
   são o medido e as finas são simuladas e condicionadas — sem faixa lisa na
   emenda. Isso ACRESCENTA detalhe inventado sobre medido borrado: entra
   como A/B na Foto 3, é confessado, e o miolo bem resolvido segue com o
   RGB idêntico.
6. **Calibração:** o ajuste por mínimos quadrados não negativos de
   S(d) ≈ Σ g_k²·S_k(d) + S_crateras(d) é só o PONTO DE PARTIDA; a conferência
   mede o campo FINAL (todas as camadas, filtro de caixa e costura) por
   unidade contra a região-exemplo, e refaz o ajuste se sair de ±10 %.
7. **Saída:** campo contínuo → `assaNormais` (sem máscara; trava de 80° só
   no norte). O `main()` imprime a calibração, as versões (node, V8, sharp,
   libvips) e os sha256 do cache e do `map.jpg`; confere o hash do RGB
   decodificado de CADA tamanho do mapa contra `sha256Aprovado` e recusa se
   diferir. Meta < 2 min por corpo.

**E4 — a prova do recorte escondido (Opus; Foto 1).** Esconder 2–3 recortes
do DEM conhecido (Plutão: um em Cthulhu e um no planalto de Krun ou em
Tartarus; Caronte: um em Oz Terra), centenas de km cada, longe de Sputnik, e
aplicar a receita inteira da E3 com as medidas tiradas SEM os recortes.
Comparar com a verdade: S(d), histograma de inclinação, lei de crateras ×
distância à emenda, e fotos real × reinventado na mesma luz (rig de 01/10,
servindo o mapa por CDP `Fetch.fulfillRequest` — o app carrega pelo caminho
normal, em qualquer tier). Se não convencer o main e depois o Felipe, a
receita muda aqui, antes das feições.

**E5 — o grão de Sputnik (Opus; Foto 2), antes de congelar o candidato.**
Alisar a altura medida onde a inclinação local é baixa, só dentro de um
polígono declarado da planície (filtro adaptativo, com volta em longitude);
antes/depois em números e foto. Se aprovado, entra, é confessado e as medidas
das planícies são refeitas sobre o dado alisado.

**E6 — feições e o candidato final (Opus; Foto 3).** Tectônica (Caronte: o
cinturão pelo lado de trás, fossas e escarpas em arcos de círculo máximo com
largura e profundidade de Serenity/Mandjet, lineamentos ancorados,
espaçamento 75–115 km; Plutão: cristas e vales em 330°E e a zona revolvida
antípoda) e feições nomeadas (Simonelli; a soterrada de 38°N 357°E; em
Caronte U, A, Arroway, B, C com diâmetro medido na foto borrada, a de raios a
leste de Argo, a planície de Argo). Calibração final (E3.6) sobre o campo
completo. Prévia passada pela MESMA escada de `otimiza-texturas` (lanczos,
WebP sem perda) e mostrada pelo app por `Fetch.fulfillRequest`. Revisão Opus
do diff; o main itera até a prancha estar boa; Foto 3. Com o sim dele, os
hashes do RGB de cada tamanho viram `sha256Aprovado`.

**E7 — a confissão (Sonnet).** `docs/reference/ASSETS.md` (`pluto/normal`,
`charon/normal`), os pares pt/en em `scripts/data/atlas/texturas-em-ingles.mjs`,
o cabeçalho do gerador e os testes que pinam frases. Texto base: "…só o
hemisfério do sobrevoo e a calota norte têm mapa de altura; o resto é relevo
INVENTADO por código — terrenos e crateras sorteados com a estatística do
lado medido, onde o mapa geológico das fotos da aproximação os põe; o sul,
quase sem imagem, é palpite; não é medida" (+ Sputnik alisado, se aprovado).

**E8 — os mapas finais (Felipe roda, um por bloco):**
`node scripts/data/atlas/gera-normal-de-dem.mjs pluto`, idem `charon` (do
cache), `node scripts/data/atlas/otimiza-texturas.mjs pluto`, idem `charon`,
`node scripts/data/atlas/gera-manifest-texturas.mjs`, `npm run data:verify`.
Depois: hashes de todos os tamanhos conferidos contra `sha256Aprovado`; fotos
do app real nas mesmas vistas; `npm run done`; commit no ramo; merge no
`main` com a palavra dele; `git push origin main:backup`; publicar é dele;
conferir no ar por sha256. Fechamento: item 144 e BASTÃO em
`docs/PENDENCIAS.md`; no `BACKLOG.md`, tirar da linha de Plutão/Caronte SÓ o
que foi resolvido (a sombra da cor fica; o grão fica se Sputnik não for
alisada); apagar só `PLAN-RELEVO.md`.

### Testes (arquivo novo `scripts/data/atlas/relevo-inventado.test.mjs`)
Num mundo sintético pequeno de estatística conhecida, um por comportamento:
mesma semente → mesmo RGB; o miolo sai com o RGB idêntico; a prova da costura
(energia por oitava × distância plana; gradiente sem salto, por RMS e p99);
calibração (S(d) final em ±10 % do alvo); crateras sem faixa vazia na emenda.
O teste 6 atual (máscara do `mediaDeCaixa`) fica; o `:256` muda com a chave.
A lista vai ao Felipe no fim da rodada.

## Verificação
- **Números** (impressos e conferidos pelo main): por unidade, S(d) e RMS do
  campo final × região-exemplo em ±10 %; energia por oitava × distância à
  emenda sem vale nem pico; lei de crateras × distância sem buraco; miolo
  com RGB idêntico; cobertura 100 %; nenhum NaN.
- **Fotos** (mesmo jd e câmera antes/depois, norte para cima): a prova do
  recorte (real × reinventado); Sputnik A/B; Plutão — as emendas a 84°E e
  247°E com Sol rasante, Simonelli e o lado de trás, o sul num jd com o sul
  iluminado; Caronte — as duas emendas, o centro do lado de trás com o
  cinturão, o sul; mapinho "medido × inventado".
- **Real = prévia:** hash de cada tamanho igual ao aprovado (o gerador
  recusa o diferente); foto do app real igual à da prévia.
- **Fim:** `npm run done` verde uma vez; `npm run data:verify` verde.

## Andamento (02/10, noite)
- [x] E1 cache (Plutão e Caronte, mapas de hoje idênticos por md5)
- [x] E2 medidas (Robbins v2, Ro21, mapa de qualidade) e mapas de unidades
- [x] E3 núcleo: costura (krigagem por banda, pepita própria na banda 0), síntese por unidade, COLCHA de retalhos do terreno medido (costuras sem linha: commit 93d59e7), níveis de unidade, crateras reais do catálogo no vazio (Simonelli com o perfil medido da Burney), degrau da costura do arquivo do DEM tirado nos dois corpos, dado ruim refeito só no detalhe fino (calota polar de Caronte, limbo norte, borrão sul de Plutão, redemoinho do polo de Plutão)
- [x] E4 prova do recorte escondido (Foto 1, `capturas/relevo-prova-recorte-prancha.jpg`) — ele aprovou seguir ("pode seguir com as melhorias e aplicar no lado de trás inteiro")
- [~] E5 Sputnik: "só a banda 0" (grão 4,7° → 0,8°, células −6 %), Foto 2 `capturas/relevo-sputnik-grao-prancha-v2.jpg` enviada; ESPERA a palavra dele. Portado como `alisamentos` (`ativo: false`) no JSON de Plutão; a planície (com 150 km de margem) nunca é fonte de colcha nem é completada, ligada ou não — o lado de trás sai o mesmo nas duas escolhas (38 de 8 milhões de texels diferem fora dela, um tom).
- [~] E6 candidatos finais: Caronte v9; Plutão "final" (Sputnik fora das fontes). Foto 3 enviada: `capturas/relevo-plutao-lado-de-tras-prancha-v2.jpg` e `capturas/relevo-caronte-lado-de-tras-prancha-v2.jpg`; ESPERA a palavra dele sobre completar o borrado. Na coluna "sem completar" o lado de trás é sorteado de novo (a máscara muda a sequência aleatória) — só as emendas comparam.
- [x] E8 preparo: `inventaRelevoDoCorpo` é o caminho único (prévia = gerador, byte a byte); tabelas do Zenodo com sha256 fixado; o gerador só grava o RGB com hash em `sha256Aprovado` (hoje vazio: recusa tudo). Hashes do RGB decodificado — Caronte `completa:1` 53b50dc0…ba45, `completa:0` 1cf9e0bb…9046; Plutão `completa:1,sputnik:0` e7ab9e78…6e59, `completa:1,sputnik:1` 80d48040…1f41, `completa:0,sputnik:0` 487f5efc…cf86, `completa:0,sputnik:1` 55075b9b…9482 (valores inteiros no BASTÃO de `docs/PENDENCIAS.md`); os seis candidatos em `capturas/relevo-inventado/candidatos/` e as ferramentas da rodada em `capturas/relevo-inventado/ferramentas/` (copiadas do scratchpad, caminhos ajustados).
- [ ] E7 confissão (pt/en, ASSETS.md, texturas-em-ingles.mjs) — depois das duas palavras dele.
- [ ] Fixar `sha256Aprovado` da combinação escolhida; comandos dele (gerador ×2, otimiza ×2, manifesto, data:verify); conferir tamanhos menores contra a escada da prévia; fotos do app real; `npm run done`; merge no main com a palavra dele.
- Fora desta obra, anotado: a COR borrada/chapada do lado de trás (a ideia dele de melhorar a cor com IA, guiada pelo relevo) — próxima rodada.
