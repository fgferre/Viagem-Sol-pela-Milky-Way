# Europa com cor real e Jápeto com a crista no lugar — plano da rodada (06/10/2026, v2 depois da revisão externa)

Item 230 do `docs/PENDENCIAS.md`. Palavras dele (05–06/10): *"ainda vamos melhorar esse asset, se houver mais algum
asset que precise ser melhorado também vamos colocar isso no pipeline"*; *"Priorizar Europa e Jápeto"*; *"Você está
aprovado, você pode usar o GPT"* (06/10, noite). A receita é a de Plutão, Caronte, Tritão (plano) e Hipérion: fonte com
licença, o real onde existe, o inventado por código no resto, ancorado no real e confessado na ficha; decisão dele por
prancha; gerador travado por hash; a cadeia oficial assa no terminal dele; fotos do app de verdade; `npm run done`;
merge com a palavra dele; conferência no ar por sha256. Ramo `europa-japeto` (backup `git push -u origin
europa-japeto`); ferramentas e candidatos em `capturas/europa-japeto/` (fora do git). Fotos do estado de hoje:
`capturas/europa-japeto/hoje-prancha.jpg`. Revisão externa (GPT pelo Codex, 06/10) em
`.cache/revisoes/plano-europa-japeto-gpt-2026-10-06.md`, conferida contra o código: corrigiu o diagnóstico da crista
(era "espelhar", é girar meia volta), tirou o item da forma (Jápeto já é elipsoide) e fixou os contratos abaixo.

## Hoje
- Europa: `map` 1440×720 da NASA 3D Resources — é o mosaico USGS Voyager–Galileo em cinza, reduzido. As lineae saem
  pretas; na realidade são marrom-ferrugem dessaturado sobre gelo creme. Sem relevo (bump 0, item 141: as linhas são
  cor, não forma — fica assim; dar normal a Europa quebraria `rochoso.test.ts:941`).
- Jápeto: `map` 3840×1920 do mosaico Cassini de Schenk; `height`/`normal` 1024×512 em 8 bits, SINTÉTICOS do projeto
  Saturn do dono (campo de crateras por código + crista modelada), entrando pela cadeia com meia volta
  (`giroDeLongitudeGraus: 180`, `baixa-texturas.mjs:337`). Vértice `1 + viés + h·escala` (`rochoso.ts:413`) com
  escala 0,0269 e viés −0,0175: o relevo de hoje vai de −13 a +7 km — a crista chega a 7 km, não a 13–20.
  Forma: já é elipsoide 745,7 × 745,7 × 712,1 (`iauOrientation.ts:1080`), aplicado também com altura.
- Convenção do mapa (conferida em `orientacaoNaCena.ts`): Greenwich no centro, u = lon/360 + 0,5, crescendo para
  leste; x em graus desde a borda esquerda vale (180 + x) mod 360 °E. Medido no arquivo publicado (06/10): a Cassini
  Regio escura ocupa x = 7–170° → 187–350°E (centro 268°E; real 267,4°E: a cor está no lugar); a crista do mapa de
  altura ocupa x = 170–314° → 350°E→134°E, atravessando 0° (bate com a estimativa por olho do bastão, 332→136°E).
  A real vai de 114 a 307°E. Girada meia volta, a de hoje cairia em 170–314°E, sobre Toledo e Tortelosa — a hipótese
  do bastão ("girar 180°") era a certa; espelhar (226°E→10°E) não serve.
- Proveniência publicada errada: o manifesto diz PIA18439 para o mapa de Jápeto (`gera-manifest-texturas.mjs:277`);
  PIA18439 é Tétis, o de Jápeto é PIA18436 (página do Photojournal "Color maps of Iapetus 2014", conferida 06/10).

## Fatos (06/10; [C] conferido na página, [L] lembrança/conta a conferir na etapa 0)
Europa
- USGS "Europa Voyager–Galileo SSI Global Mosaic 500m" [C]: 19.631×9.816, 8 bits, cilíndrica simples, +W 0–360,
  esfera 1.562,09 km, GeoTIFF 184 MB, sem cobertura ao sul de −83° (altas latitudes a ~20 km/px); domínio público
  ("Use Constraints: None"). https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif
  (o host não está na allowlist do downloader, `lib-texturas.mjs:98`: entra pelo cache, como os DEMs de Plutão).
- Nenhum mapa global EM COR com licença livre achado em 06/10 [C]: USGS não tem (só Ganimedes); Jónsson é CC BY-NC-ND
  (não serve, nem recolorir); Albers "uso pessoal não comercial" (não serve); Solar System Scope (CC BY) não tem as
  galileanas. Conclusão de busca datada — refazer se a rodada atrasar.
- Cor real de domínio público: PIA19048 "Europa's Stunning Surface" (Galileo 1995/1998, reprocessado 2014) [C]: cor
  "realista" (IR+verde+violeta corrigidos), 1,6 km/px, projeção ORTOGRÁFICA de um hemisfério, TIFF 11 MB; lacunas
  preenchidas pela própria NASA com cor simulada por tipo de terreno (confessar). PIA00502 (G1, 1996) [C]: hemisfério
  traseiro em cor natural aproximada ao lado da realçada — referência de TOM. PIA16827 [C]: ortográfica 500 m/px, cor
  REALÇADA — só para localizar tipos de terreno. Precedente da própria NASA: o E17 em cinza (226 m) colorido com a cor
  do E14 (1,4 km).
- Ciência da cor: Clark 1998 [C] — manchas escuras, lineamentos e margens de banda tripla são UM componente "escuro e
  avermelhado"; terreno mosqueado e bandas claras são mistura linear de planície clara + esse componente (mistura
  espectral; a versão RGB guiada pelo cinza é hipótese nossa, calibrada no hemisfério colorido). Geissler 1998 [C] —
  fraturas incipientes (< 1,6 km de largura física) incolores; cristas de 3–6 km com cor própria; bandas triplas com
  margens marrom-avermelhadas. Trumbo 2020 e McEwen 1986 [C] — hemisfério traseiro mais escuro e vermelho
  (escurecimento em cosseno centrado nele), dianteiro mais amarelo-claro; polos levemente azulados (forte só na cor
  realçada). Albedo geométrico 0,68 [C]. Razões numéricas lineae/planície por filtro: medir no PIA19048 na etapa 0.

Jápeto
- Crista (Gazetteer da IAU, lat 0, longitudes em °E; o Gazetteer publica em °W) [C]: Tortelosa Montes 284,0–306,5
  (294 km); Toledo Montes 180,7–267,3 (1.100 km); Carcassone Montes 114,0–171,2 (740 km, picos na transição para o
  terreno claro); montes isolados Seville 13,7°E (69 km), Cordova 153,8 (85), Sorence 166,3 (46), Haltile 169,6 (45),
  Gayne 184,0 (65), Valterne 189,4 (50). Vão de ~17° entre Toledo e Tortelosa. CSV: Gazetteer, alvo 76_Iapetus
  (o Gazetteer dá nome, posição e tamanho; perfis e profundidades vêm dos artigos).
- Porco 2005 [C]: contínua por mais de 110° (210–320°E no mosaico da Fig. 6, ~1.400 km), a ±1–2° do equador, cortada
  por crateras; cadeia de picos claros em 150–175°E; > 20 km pelo limbo. Giese 2008 [C]: DTM de 4–8 km/px, máximo 13 km,
  relevo total −10..+13 km, largura até 70 km. Castillo-Rogez 2007 [C]: seção triangular típica 18 km × 200 km de base
  (com os flancos). Lopez Garcia 2014 (506 perfis) [C]: triangular 33 %, trapezoidal 21 %, sela 17 %, gêmea 14 %,
  coroada 8 %; faces de ~15–16° quase simétricas, flancos 3–4°; assenta num abaulado largo; trechos com 2–3 cristas
  paralelas. Geometria coerente: faces de 15–16° por ~65 km de cada lado dão os 18 km de altura (base ~130 km); os
  "50–70 km" são a zona do cume, não a base. A altura varia ao longo da crista (máximos de 13–20 km, não altura
  uniforme). Fora da Cassini Regio: picos isolados de ~10 km, não crista contínua.
- Crateras com nome (Gazetteer, 58; 20 com ≥ 100 km) [C], °E: Abisme 768 km (37,5°N 267,1); Turgis 580 (16,9°N
  331,6); Engelier 504 (40,5°S 95,3); Gerin 445 (45,6°S 127,0); Falsaron 424 (33,8°N 277,4); Malprimis 377 (15,2°S
  241,8); Naimon 244; Ganelon 230; Bramimond 200; Tibbald 160; Roland 144; Marsilion 136; Malun 121 (sobre a Turgis).
  Profundidade: Falsaron 10,5 km (White 2013); bacias complexas com pico central e terraços, bordas até ~10 km (Giese
  2008). Lei profundidade × diâmetro por tamanho: a das luas geladas de Saturno (White et al. 2013/2017, Schenk 1989:
  simples até a transição de ~15 km, complexas mais rasas acima), citada no gerador; o d/D 0,025 de Falsaron só vale
  para as bacias > 300 km, e confessado como extrapolação.
- DEM público: não achado em 06/10 [C] (Schenk semi-global "unreleased"; Gaskell "planejado"). Cinza USGS 803 m
  (PIA11116, 5760×2880, PD) só se precisarmos de sombreado para conferir a crista.
- Forma: fóssil de rotação, achatamento 4,5 %, já no app; a crista é camada separável (volume < 5 % do abaulado) [C].

## O que muda em relação a Plutão e Caronte (decisões; as de gosto vão por prancha)
1. Europa não reaproveita o adaptador `corInventada` (ele exige normal, JSON de unidades e cache de relevo —
   `baixa-texturas.mjs:929`, `cor-inventada.mjs:1774`): ganha módulo próprio `cor-europa.mjs`, usado pela prévia e
   pela cadeia, encaixado no mesmo ponto (depois do giro, antes do jpeg, `baixa-texturas.mjs:898`) com portão por
   hash do RGB (`portaoDaCor`, :989) e chave por receita + tom. Entrada de Europa passa a consumir `.cache/europa/`
   (sha256 no plano), com `larguraDoDestino: 4096` (a escada só desce da fonte, `lib-texturas.mjs:36`; 8192 custa
   171 MiB residentes contra 43 — só se a prancha mostrar ganho visível e a memória for medida).
2. A luminância é inteira e real (USGS 500 m); só a CROMA é inventada. Duas receitas na prancha: (a) recoloração
   simples — mistura de dois componentes (planície clara + escuro avermelhado) guiada pelo cinza, mais o gradiente
   dianteiro/traseiro, calibrada nas estatísticas do PIA19048; (b) hemisfério do PIA19048 desprojetado com a croma real
   e a receita (a) no resto, costurada na borda. Se (a) ≈ (b) a olho, fica (a). Fraturas finas ficam incolores (regra
   de Geissler, pela largura física, não pela resolução). O TOM é gosto: natural (PIA00502), realista (PIA19048) e
   meio-termo.
3. O vazio ao sul de −83°: preencher por linhas, na resolução cheia, com a última faixa válida (não o tapa-buraco
   por valor < 12 com média global, `lib-texturas.mjs:194`, que custaria ~1,5 GB e marcaria preto legítimo); o sul
   preenchido é confessado como inventado.
4. Jápeto não tem DEM: gerador paramétrico mínimo `relevo-japeto.mjs` (campo em km: abaulado largo + crista + 58
   crateras com nome + campo sorteado), sem a colcha nem o medidor de DEM de `relevo-inventado.mjs` (eles exigem lado
   medido — :5606, :4568); reaproveitar só o que é operação pura (perfil de cratera, costura de bordas). Crista pela
   posição do Gazetteer e de Porco, perfil sorteado por trecho (triangular/trapezoidal/gêmea), altura variando ao
   longo (13–20 km nos máximos), faces 15–16° e flancos 3–4°, cortada pelas crateras que a atravessam; picos isolados
   nos montes com nome. Altura quantizada com conversão explícita (ex.: −14..+22 km em 8 bits → 141 m por degrau;
   escala 0,0483, viés −0,0188, novos em `rochoso.ts:248`) e normal derivada do MESMO campo (ganho tangencial 1,2 de
   `rochoso.ts:296` entra na conta). O portão aprova o CONJUNTO: height, normal e os dois parâmetros, por hash.
5. As entradas de Jápeto em `baixa-texturas.mjs:337` deixam de copiar o Saturn e passam a ler o gerador; o elipsoide
   fica como está; nada entra em `formas` (quebraria `ficha.test.ts:475` sem ganho).
6. Resolução de Jápeto: 1024×512 (a malha é 256×128, ~18 km por vértice; 2048 só se a luz melhorar na prancha e o custo
   for medido como no 226).
7. Confissão e tradução fecham junto da receita (`ORIGENS` e notas em `gera-manifest-texturas.mjs:74`,
   `texturas-em-ingles.mjs:576` usa o português literal como chave): confessar em separado posições/tamanhos reais,
   perfis inventados, croma extrapolada e preenchimento polar; corrigir PIA18439 → PIA18436.
8. O filme decide junto: a legenda do Ato III promete até 20 km (`roteiros/solar/saturno.json:267`) — a prancha de
   Jápeto inclui o raspão do Ato III como está no roteiro, não só o Atlas; a de Europa inclui o Ato II sobre Júpiter.

## Etapas (um trabalhador por etapa; Opus onde há julgamento, Sonnet para foto e mecânica; cadeia no terminal dele)
- J0. Diagnóstico barato (sem download): relevo de hoje girado meia volta (translação de colunas, `lib-texturas.mjs:146`;
  normal girada junto, sem derivar de novo — translação não troca sinal); prancha: hoje | girado, frente 265°E em
  1º/01 e o raspão do Ato III, com duas feições identificáveis (Toledo e Tortelosa sobre a Cassini Regio). Prova o
  diagnóstico antes de reconstruir; se ele aprovar, pode virar publicação intermediária (chain dele) enquanto J1 roda.
  Candidatos entram no app sem tocar em `public/`: interceptação de rede pelo CDP, como nas rodadas de Plutão
  (`capturas/relevo-inventado/ferramentas/fotos/foto-candidato.mjs`, padrão `*textures/atlas/<corpo>/...*`).
- E0. Dados de Europa: baixar com o sim dele para `.cache/europa/` (USGS 184 MB, PIA19048 TIFF 11 MB, PIA00502) com
  sha256 no plano; registrar o PIA19048 contra o mosaico (centro, escala, cobertura — como o `registro-tritao.mjs`);
  medir no hemisfério colorido a cor da planície, do componente escuro e o gradiente; prancha 0: hoje | o cinza de
  500 m | o hemisfério colorido desprojetado | os três tons de referência.
- E1. Cor de Europa: `cor-europa.mjs` + entrada em `baixa-texturas.mjs` (cache, giro, 4096, preenchimento polar,
  portão); prévias das receitas (a) e (b) nos três tons; prancha (Atlas d=3 e 1,6; o Ato II do filme sobre Júpiter);
  palavra dele; hash aprovado na entrada.
- J1. Relevo de Jápeto: `relevo-japeto.mjs` (campo em km → height 8 bits + normal + parâmetros), tabela do Gazetteer
  em `fonte/iapetus-gazetteer.csv` (baixada com o sim dele), prévias e prancha: hoje | girado (J0) | novo, frente e
  trás, 1º/01 e o raspão do Ato III; palavra dele; hash do conjunto aprovado.
- F. Confissão pt/en (`docs/reference/ASSETS.md` "A CONFISSÃO NA TELA", `ORIGENS`, tradução), PIA corrigido; assar no
  terminal dele (`RODADA-EJ-OK`); hash e escada conferidos; `npm run data:verify` (manifesto regenerado — senão reprova,
  `verify-assets.mjs:1139`); `npm run done`; fotos finais nas vistas da prancha e nos Atos II e III; merge em linha
  reta com a palavra dele; o push do `main` é dele; conferir no ar por sha256.

## Resultado
- **J0 (06/10, feito; `capturas/europa-japeto/j0-prancha.jpg`, `j0b-prancha.jpg`, candidatos em `j0-girado/`,
  ferramentas em `capturas/europa-japeto/ferramentas/`):** o relevo girado meia volta põe a crista do mapa de altura em
  170–314°E (medido no arquivo: faixas 169,8–289,7, 293,9–305,9 e 310,4–314,3°E), sobre Toledo e Tortelosa — o
  diagnóstico está provado pelo número. Na foto, a diferença hoje × girado é sutil: limbos e sombreado fino nas vistas
  de frente; só com o terminador em 230°E (jd 2461025,15) o girado mostra um sulco com parede de sombra cruzando a
  cara escura em 246–279°E, com 1–2 níveis de contraste. Motivo: a crista de hoje chega a +7 km e a luz de frente achata
  o relevo. O conserto barato acerta o LUGAR; só o relevo novo (J1, com a altura real) vai fazer a crista aparecer.
  Achado de brinde: o mapa de COR já traz a crista real como uma linha fina mais clara no equador, de 180 a 300°E, a
  +0,2..+1,6° de latitude (ondula) — é a fonte para traçar o caminho da crista em J1 ("refazê-lo pela foto"), e o
  relevo girado cai em cima dela. A pose da ferramenta de foto deixa o equador na vertical da tela (a linha "vertical"
  das fotos é a crista real do mapa de cor), a conferir antes de ler as próximas pranchas.

- **J1, primeira passada (06/10, noite; `capturas/europa-japeto/j1-prancha.jpg`, candidatos em `j1/a-15km/` e
  `j1/b-20km/`, runner `capturas/europa-japeto/ferramentas/previa-japeto.mjs`):** `relevo-japeto.mjs` + teste (5/5)
  geram altura e normal do mesmo campo em km; crista traçada pela linha clara do mapa de cor (entre 210 e 250°E a linha
  é fraca e o caminho ondula ±0,5°), 15,0/20,0 km lidos em 225,9°E depois das crateras (a ejecta de Malprimis e Abisme
  soma ~1,3 km); 55 das 58 crateras com nome (Escremiz, Torleu e Basile < 2 texels); Falsaron sai com 11,4 km (medido
  10,5); quantização −14..+22 km, só 113/100 texels saturam no fundo de Falsaron sobre Abisme; `rochoso.ts:248` com a
  escala/viés novos (0,04828 / −0,01877); sha256 iguais em duas rodadas. Na prancha: no terminador a crista é uma
  muralha nítida nos dois candidatos (hoje e girado quase não mostram); frente e trás mudam pouco (luz de frente);
  Turgis e Engelier coincidem com a borda visível na cor. **Problema visto:** o campo sorteado (R = 0,1, 4.053
  crateras de 9–120 km) põe crateras nítidas onde a foto não tem e não põe onde tem — no limbo o relevo e a cor
  brigam. Próxima passada (J1b): campo pela FOTO, como no Hipérion — crateras detectadas no mosaico de cor (posição e
  diâmetro pela imagem, profundidade pela lei, bordas degradadas), as com nome por cima. Pendências menores: bordas de
  cratera brilhando do lado noturno do terminador (shader, conferir em F sem realce); `saturno.ts:76` e o comentário
  de `rochoso.ts:243–246` citam a crista em 332°L — atualizar em F. Decisão dele pendente: crista de 15 ou 20 km.

## Fora do escopo
Os outros assets fracos do item 230 (Urano, Netuno, Vesta, Deimos, Tritão pausado, Ariel, Titã, Vênus); relevo de
Europa (fica sem); altura em 16 bits no app (o carregador é `UnsignedByteType`, `texturas.ts:440`); a Cassini Regio
quase preta no app (luz honesta sobre albedo 0,04 — no BACKLOG, gosto dele); publicar.
