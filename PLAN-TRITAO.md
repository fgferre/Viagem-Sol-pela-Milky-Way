# Tritão com a receita inteira — relevo medido e inventado, cor real e inventada (plano, 04/10/2026)

**PAUSADO por decisão dele (04/10):** *"acho q tritao esta bom hj, vamos tomar cuidado para nao piorar"*; escolheu
comparar primeiro e, vista a prancha da primeira versão (`capturas/tritao/olhar/prancha-comparacao-v1.jpg`), *deixar
como está*. O resultado: na face fotografada a receita fica mais real; no lado oposto a Netuno e no ápice — o que o
Sol ilumina hoje — fica PIOR, porque a foto real ali é das de aproximação (17–47 km/px), borrada e com manchas de cor,
e a M2 só põe detalhe fino por cima dela. A ideia para uma segunda tentativa, se ele pedir: tratar o lado borrado
como nunca visto (alvo da M1, inventado nítido como o norte) e guardar da foto só o tom de escala muito grande.
Tudo deste ramo é experimento: a normal medida e o bump zero de Tritão (`rochoso.ts`, `corpos.ts`) quebram o manifesto
publicado se forem ao main sem o canal `normal` assado.

Palavras dele: *"vamos tirar a sombra e tritao tb vamos fazer a receita"* (03/10, manhã); *"pode juntar ao principal e
seguir com tritão"* (03/10, noite). A receita é a de Plutão e Caronte: o real onde existe, o inventado por código no
resto, ancorado no real e confessado na ficha. Ramo de trabalho `tritao` (backup `git push -u origin tritao`);
ferramentas e candidatos em `capturas/tritao/` (fora do git).

## Hoje
- Cor: o mapa inteiro é um redesenho por IA (item 148, 03/09, gerado na conta dele) sobre o mapa NASA/LPI de 600 m,
  em 2048 px; a ficha confessa "nada aqui é medida".
- Relevo: o "bump" emprestado das manchas da cor (2 % do raio) — o item 144 pede desfazer; não há DEM nem normal.png.

## Fatos (04/10; fontes abertas, salvo onde dito)
- Voyager 2, 25/08/1989: ponto subsolar a 45°S. O norte além de ~40–45°N estava em noite polar: nunca visto. O
  hemisfério oposto a Netuno (180°E) só existe em fotos de aproximação borradas (4–47 km/px). Nítido (≤ 2 km/px) é
  ~28 % do globo: o domo de −75 a +90°E, −60 a +45°.
- Cor: USGS "Triton Voyager 2 Global Color Mosaic 600m" (GlobalFill = Schenk/LPI 2014 = PIA18668): GeoTIFF
  14138×7069 RGB, 600 m/px, centro em 0°E, domínio público, 300 MB, sem dado = 0 (33 % do globo, o norte); cor
  realçada. Schenk 2021 (repositório do LPI/USRA, "citar Schenk et al. 2021"): mosaicos de 3 cores "ogb"
  (laranja/verde/azul) e "obu" em JPEG de ~18 MB, com a rede de controle nova — a mesma do DEM.
- Relevo: Schenk et al. 2021 (Remote Sensing 13, 3476), cubos ISIS no repositório do LPI: estéreo + sombreado
  `tndem-Thr-cyl-ZT151-101.cub` (66,65 MB) e só sombreado `tndem-Thr-cyl_TA_Tds91.cub` (67,06 MB; os comprimentos
  de onda longos foram suprimidos). Cobertura ~13 % do globo (o arco de −66 a +83°E, −18 a +43°N: o terreno
  "cantaloupe" e Cipango); amplitude ±1 km; nada maior que ~100 km é real. Uso com citação.
- Geologia (Croft et al. 1995; Schenk et al. 2021; nomes IAU com centros em shapefile): terreno cantaloupe (Bubembe
  Regio), planícies lisas de Cipango, planícies muradas (Ruach, Tuonela), planícies gravadas a leste, cristas e
  sulcos, terreno macular do sul (máculas escuras, plumas), terreno lineado, depósitos lobados claros. Não há mapa
  geológico publicado em SIG.
- Crateras: ~100 prováveis > 5 km, todas a menos de 90° do ápice (90°E), densidade em cosseno (Schenk & Zahnle
  2007); nenhuma tabela pública; 12 crateras com nome IAU (9–14 km).

## O que muda em relação a Plutão e Caronte (decisões; as de gosto vão por prancha)
1. O nunca visto é o NORTE: o `padraoDoSul` do relevo vira um padrão polar com hemisfério; a cor já segue a máscara
   do vazio, onde quer que ele esteja.
2. O relevo medido é pequeno (13 %, não os 40 % do bastão): retalhos medidos só para o cantaloupe e Cipango; as outras
   unidades se ancoram nas estatísticas descritas nos artigos e nas feições IAU com posição e tamanho; as crateras
   são sorteadas pela lei do ápice e confessadas.
3. Foto nítida SEM DEM (o sul do domo, ~15 % do globo): relevo inventado ali brigaria com as feições reais da foto.
   Duas opções para a prancha dele: (a) só as escalas grandes inventadas ali, o detalhe fica com a foto; (b) inventado
   inteiro.
4. A cor de hoje é a do redesenho por IA; o mosaico real é realçado. O tom (o realçado da NASA ou um mais próximo do
   natural) vai por prancha.
5. A sombra das fotos vem do SUL (subsolar a 45°S): a sombra assada sai onde há DEM (`sombra-assada.mjs`), como em
   Plutão e Caronte; fora dele fica, confessada.
6. Mosaico de cor: o de 2014 (sem perda) ou o de 2021 (JPEG, mesma rede do DEM) — decide a régua de alinhamento.

## T0 — medido (04/10; ferramentas em `capturas/tritao/ferramentas/`)
- Baixados com o sim dele para `.cache/tritao/` (sha256): GlobalFill `f20ed332…` (300 MB), cubo estéreo + sombreado
  `da17d9b6…`, cubo só sombreado `e056ca42…`, mosaico 2021 ogb `10ed7850…` (14165×7083 RGB, cilíndrica −180..180 E).
- Cubos (`le-cubo.mjs`): ISIS Real Lsb em ladrilhos 151×128, 6493×2636, cilíndrica simples, centro 0°, R 1352,6 km,
  lon −70..95 E, lat −21..46, 600 m/px; os valores estão em KM; furos NaN nas marcas da câmera (reseau) e entre
  quadros. Só sombreado: 50 % da janela válida (~13 % do globo), −1,4..1,5 km; estéreo + sombreado: 17 % (~4 %),
  −1,2..1,2 km.
- Alinhamento (`registro-tritao.mjs`, janela −30..60 E, −10..40): o mosaico de 2021 casa com o DEM em r 0,80 com
  deslocamento ZERO, Sol das fotos a 210° (sul-sudoeste, o subsolar a 45°S); o GlobalFill de 2014 não casa (r 0,03;
  0,11 no melhor de ±15 px) — rede de controle antiga. **Decisão: o mosaico de cor é o de 2021 (ogb).** O r tão alto
  é porque o DEM de sombreado saiu destas fotos: onde há DEM, a sombra assada sai quase inteira.

## Etapas
- T0. Dados e medidas: baixar com o sim dele (GlobalFill 300 MB, os dois cubos 67 MB cada, o ogb ~18 MB) para
  `.cache/`; ler os cubos (o cabeçalho ISIS traz a projeção); medir cobertura, alinhamento DEM × mosaicos e resolução
  local; prancha 0 para ele: o Tritão de hoje (IA) | o real que existe (nítido, borrado, vazio, relevo medido).
- T1. Relevo: entrada de Tritão em `gera-normal-de-dem.mjs` (leitor de cubo ISIS), `fonte/triton-lado-de-tras.json`
  (unidades e pesos por palpite guiado pelos artigos, feições IAU, padrão do norte), padrão polar nos módulos;
  prévias e prancha (com as opções do item 3); palavra dele.
- T2. Cor: `POR_CORPO.triton`, M1 (o norte) e M2 (o lado oposto borrado), sem a sombra assada; prancha (com o tom do
  item 4); palavra dele.
- T3. Confissão pt/en; assar no terminal dele; conferir hash e escada; `data:verify`; `npm run done`; fotos finais;
  merge com a palavra dele.

## Fora do escopo
As outras luas com redesenho por IA (Miranda, Ariel, Umbriel, Titânia, Oberon); a forma de Tritão (fica a esfera);
publicar.
