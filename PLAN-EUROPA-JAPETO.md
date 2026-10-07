# Europa com cor real e Jápeto com a crista no lugar — plano da rodada (06/10/2026)

Item 230 do `docs/PENDENCIAS.md`. Palavras dele (05–06/10): *"ainda vamos melhorar esse asset, se houver mais algum
asset que precise ser melhorado também vamos colocar isso no pipeline"*; *"Priorizar Europa e Jápeto"*. A receita é a
de Plutão, Caronte, Tritão (plano) e Hipérion: fonte com licença, o real onde existe, o inventado por código no resto,
ancorado no real e confessado na ficha; decisão dele por prancha; gerador travado por hash; a cadeia oficial assa no
terminal dele; fotos do app de verdade; `npm run done`; merge com a palavra dele; conferência no ar por sha256.
Ramo `europa-japeto` (backup `git push -u origin europa-japeto`); ferramentas e candidatos em `capturas/europa-japeto/`
(fora do git). Fotos do estado de hoje: `capturas/europa-japeto/hoje-prancha.jpg` (Europa d=3 e 1,6; Jápeto pose
padrão, frente 265°E e trás 85°E; 1º/01/2026 e 10/02/2026).

## Hoje
- Europa: `map` 1440×720 da NASA 3D Resources — é o mosaico USGS Voyager–Galileo em cinza, reduzido. As lineae saem
  pretas; na realidade são marrom-ferrugem dessaturado sobre gelo creme. Sem relevo (bump 0, item 141: as linhas são
  cor, não forma — fica assim).
- Jápeto: `map` 3840×1920 do mosaico Cassini de Schenk (PIA18436, domínio público); `height`/`normal` 1024×512
  SINTÉTICOS do projeto Saturn do dono (campo de crateras por código + crista modelada), escala do relevo 2,7 % do raio
  (~20 km). Medido no arquivo publicado (06/10): no mapa de cor a Cassini Regio escura ocupa x = 7–170° (centro 88°,
  bate com o centro real 92,6°W → o eixo x do mapa conta longitude OESTE, como a USGS); a crista do mapa de altura
  ocupa x = 170–314°, isto é, 46–190°E — ~90° a oeste do lugar real e com Carcassone no lugar de Toledo/Tortelosa.
  Espelhada (x → 360 − x) ela cairia em 170–314°E, sobre Toledo e Tortelosa. Girar 180° NÃO resolve. A estimativa do
  bastão (332→136°E) era por olho, no filme.
- Forma: esfera. A real é achatada 4,6 % (746,7 × 745,7 × 712,1 km, Archinal 2018 / JPL SSD).

## Fatos (06/10; [C] conferido na página, [L] lembrança/conta a conferir na etapa 0)
Europa
- USGS "Europa Voyager–Galileo SSI Global Mosaic 500m" [C]: 19.631×9.816, 8 bits, cilíndrica simples, +W 0–360,
  esfera 1.562,09 km, GeoTIFF 184 MB, sem cobertura ao sul de −83° (altas latitudes a ~20 km/px); domínio público
  ("Use Constraints: None"). https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif
- Nenhum mapa global EM COR com licença livre existe [C]: USGS não tem (só Ganimedes); Jónsson é CC BY-NC-ND (não serve,
  nem recolorir); Albers "uso pessoal não comercial" (não serve); Solar System Scope (CC BY) não tem as galileanas.
- Cor real de domínio público: PIA19048 "Europa's Stunning Surface" (Galileo 1995/1998, reprocessado 2014) [C]: cor
  "realista" (IR+verde+violeta corrigidos), 1,6 km/px, projeção ORTOGRÁFICA de um hemisfério, TIFF 11 MB; lacunas
  preenchidas com cor simulada por tipo de terreno (confessar). PIA00502 (G1, 1996) [C]: hemisfério traseiro em cor
  natural aproximada ao lado da realçada — referência de TOM. PIA16827 [C]: ortográfica 500 m/px, cor REALÇADA — só
  para localizar tipos de terreno. Precedente da própria NASA: o E17 em cinza (226 m) colorido com a cor do E14 (1,4 km).
- Ciência da cor: Clark 1998 [C] — manchas escuras, lineamentos e margens de banda tripla são UM componente "escuro e
  avermelhado"; terreno mosqueado e bandas claras são mistura linear de planície clara + esse componente. Geissler 1998
  [C] — fraturas incipientes (< 1,6 km) incolores; cristas de 3–6 km com cor própria; bandas triplas com margens
  marrom-avermelhadas. Trumbo 2020 e McEwen 1986 [C] — hemisfério traseiro mais escuro e vermelho (escurecimento em
  cosseno centrado nele), dianteiro mais amarelo-claro; polos levemente azulados (forte só na cor realçada). Albedo
  geométrico 0,68 [C]. Razões numéricas lineae/planície por filtro: não achadas — medir no PIA19048 na etapa 0.

Jápeto
- Crista (Gazetteer da IAU, lat 0, longitudes em °E; o Gazetteer publica em °W) [C]: Tortelosa Montes 284,0–306,5
  (294 km); Toledo Montes 180,7–267,3 (1.100 km); Carcassone Montes 114,0–171,2 (740 km, picos na transição para o
  terreno claro); montes isolados Seville 13,7°E (69 km), Cordova 153,8 (85), Sorence 166,3 (46), Haltile 169,6 (45),
  Gayne 184,0 (65), Valterne 189,4 (50). Vão de ~17° entre Toledo e Tortelosa. CSV: Gazetteer, alvo 76_Iapetus.
- Porco 2005 [C]: contínua por mais de 110° (210–320°E no mosaico da Fig. 6, ~1.400 km), a ±1–2° do equador, cortada
  por crateras; cadeia de picos claros em 150–175°E; > 20 km pelo limbo. Giese 2008 [C]: DTM de 4–8 km/px, máximo 13 km,
  relevo total −10..+13 km, largura até 70 km. Castillo-Rogez 2007 [C]: seção triangular típica 18 km × 200 km de base
  (com os flancos). Lopez Garcia 2014 (506 perfis) [C]: triangular 33 %, trapezoidal 21 %, sela 17 %, gêmea 14 %,
  coroada 8 %; faces de ~15–16° quase simétricas, flancos 3–4°; assenta num abaulado largo; trechos com 2–3 cristas
  paralelas. Fora da Cassini Regio: picos isolados de ~10 km, não crista contínua.
- Crateras com nome (Gazetteer, 58; 20 com ≥ 100 km) [C], °E: Abisme 768 km (37,5°N 267,1); Turgis 580 (16,9°N
  331,6); Engelier 504 (40,5°S 95,3); Gerin 445 (45,6°S 127,0); Falsaron 424 (33,8°N 277,4); Malprimis 377 (15,2°S
  241,8); Naimon 244; Ganelon 230; Bramimond 200; Tibbald 160; Roland 144; Marsilion 136; Malun 121 (sobre a Turgis).
  Profundidade: Falsaron 10,5 km (White 2013; d/D ≈ 0,025); bacias complexas com pico central e terraços, bordas até
  ~10 km (Giese 2008); crateras < 100 km com d/D como as de Reia [C, sem o valor — usar a lei de Reia da casa].
- DEM público: não existe [C] (Schenk semi-global "unreleased"; Gaskell "planejado"). Cinza USGS 803 m (PIA11116,
  5760×2880, PD) só se precisarmos de sombreado para conferir a crista.
- Forma: fóssil de rotação, achatamento 4,6 %; a crista é camada separável (volume < 5 % do abaulado) [C].

## O que muda em relação a Plutão e Caronte (decisões; as de gosto vão por prancha)
1. Europa não tem "lado medido" de cor para calibrar retalhos: a luminância é inteira e real (USGS 500 m); só a CROMA é
   inventada fora do hemisfério do PIA19048, por mistura de dois componentes (planície clara + escuro avermelhado)
   guiada pelo cinza, mais o gradiente dianteiro/traseiro, tudo calibrado no hemisfério colorido. Fraturas finas ficam
   incolores (regra de Geissler). Costura na borda do hemisfério como a de Plutão (resíduo banda a banda).
2. O TOM de Europa é gosto: três variantes na prancha — natural (PIA00502), realista (PIA19048) e meio-termo.
3. Jápeto não tem DEM: a crista entra pela posição do Gazetteer e de Porco, com os perfis de Lopez Garcia sorteados por
   trecho (triangular/trapezoidal/gêmea), 18–20 km de altura, 50–70 km de largura, sobre um abaulado largo; cortada
   pelas crateras que a atravessam. As 58 crateras com nome entram no lugar e no tamanho (as > 300 km com pico central
   e terraços, d/D 0,025; as menores pela lei de Reia); o campo sem nome é sorteado e confessado.
4. O achatamento de 4,6 % entra pelo manifesto `formas` (elipsoide, como Haumea), não pelo mapa de altura — o mapa
   fica para crista e crateras, sem gastar os 8 bits com a forma. (A conferir na etapa J1: se a casa só tem elipsoide
   para os esculpidos, decidir ali; a Mimas-rota do Hipérion é o plano B.)
5. Resolução: Europa sobe para a escada da casa (1024/2048/4096/8192 por tier) a partir dos 500 m; Jápeto segue 3840 na
   cor e 1024×512 na altura (ou 2048 se o custo medido for igual — medir como no 226).
6. A legenda do Ato III do filme ("a crista como fato") continua verdadeira; depois da obra a crista real cai na luz
   em 1º/01 (subsolar 9,2°S 244,7°E) — conferir por foto no filme.

## Etapas (um trabalhador por etapa; Opus onde há julgamento, Sonnet para foto e mecânica; cadeia no terminal dele)
- E0. Dados de Europa: baixar com o sim dele para `.cache/europa/` (USGS 184 MB, PIA19048 TIFF 11 MB, PIA00502) com
  sha256 no plano; registrar o PIA19048 contra o mosaico (centro, escala, cobertura — como o `registro-tritao.mjs`);
  medir no hemisfério colorido a cor da planície, do componente escuro e o gradiente; prancha 0: hoje | o cinza de
  500 m | o hemisfério colorido desprojetado | os três tons de referência.
- E1. Cor de Europa: passo `corInventada`-irmão na entrada de Europa em `baixa-texturas.mjs` (depois do giro, antes do
  jpeg, portão por hash); preenchimento ao sul de −83° (o tapa-buraco polar da casa); três variantes de tom; prancha
  (Atlas d=3 e 1,6; o Ato II do filme sobre Júpiter); palavra dele; hash aprovado na entrada.
- J1. Relevo de Jápeto: gerador `relevo-japeto` ao lado de `relevo-inventado.mjs` (reaproveitar catálogo de crateras,
  perfil radial, escarpas, costura): abaulado + crista + 58 crateras + campo sorteado; normal derivada; elipsoide no
  manifesto `formas`; prévias e prancha: hoje | espelhado (prova do diagnóstico) | novo, nas duas caras e no 1º/01 com
  a crista na luz; palavra dele; hash aprovado.
- F. Confissão pt/en (`docs/reference/ASSETS.md`, "A CONFISSÃO NA TELA"); assar no terminal dele (`RODADA-EJ-OK`);
  hash e escada conferidos; `npm run data:verify`; `npm run done`; fotos finais nas vistas da prancha e nos Atos II e
  III; merge em linha reta com a palavra dele; o push do `main` é dele; conferir no ar por sha256.

## Fora do escopo
Os outros assets fracos do item 230 (Urano, Netuno, Vesta, Deimos, Tritão pausado, Ariel, Titã, Vênus); relevo de
Europa (fica sem); a Cassini Regio quase preta no app (é a luz honesta sobre albedo 0,04 — observação para ele, não
obra desta rodada); publicar.
