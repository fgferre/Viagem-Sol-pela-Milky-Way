# Referências fotográficas dos corpos resolvidos — Onda 6

Curadoria (2026-08-12, revisada 2026-08-12 após feedback externo) para a rodada
de realismo dos corpos que já têm disco resolvido (Terra, Lua) e antecipação
barata para os que vêm a seguir (Marte, Júpiter, Saturno). Mesmo padrão de
`docs/reference/gaia-2025-*.jpg` e `eso-gigagalaxy-panorama.jpg` para a
galáxia: **fotos reais de instrumento, domínio público ou licença aberta com
crédito, nunca render/arte, nunca falsa-cor sem aviso**.
8 arquivos, ≈13,9 MB no total — abaixo do teto de 15 MB.

A revisão de 2026-08-12 aplicou um feedback externo (`docs/onda-6/FEEDBACK-REFERENCIAS-CORPOS.md`)
depois de checar cada crítica na fonte oficial. O que se confirmou está
aplicado aqui; o que não se confirmou, ou não teve substituto real
verificável, ficou de fora — ver "Correções desta revisão" no fim do arquivo.

## Terra

| Arquivo | O que é | Instrumento / missão | Data | Fonte | Licença |
|---|---|---|---|---|---|
| `terra-epic-disco-cheio-2026-08-10.png` | Disco inteiro em cor natural, visto do ponto L1 Sol-Terra. Arquivo oficial PNG 2048×2048 (não o JPG 1080 de preview). | EPIC (Earth Polychromatic Imaging Camera) a bordo do DSCOVR, NOAA/NASA | 2026-08-10 00:50:27 UTC | [epic.gsfc.nasa.gov/api/natural](https://epic.gsfc.nasa.gov/api/natural) → `archive/natural/2026/08/10/png/epic_1b_20260810005516.png` | NASA, domínio público |
| `terra-blue-marble-apollo17-as17-148-22727.jpg` | Blue Marble clássica, disco inteiro do Mediterrâneo à Antártida | Fotografia de mão (Hasselblad), tripulação Apollo 17 (Cernan/Evans/Schmitt), trans-lunar coast | 1972-12-07 | [images.nasa.gov/details/as17-148-22727](https://images.nasa.gov/details/as17-148-22727) | NASA, domínio público |

Julga: albedo de nuvem, cor do oceano/continente, disco cheio. Não julga
dureza de terminador — nenhuma foto desta pasta mostra a Terra como
crescente grande no quadro (ver "Correções desta revisão", item removido).

## Lua

| Arquivo | O que é | Instrumento / missão | Data | Fonte | Licença |
|---|---|---|---|---|---|
| `lua-cheia-clementine-gsfc-e001982.jpg` | Lua cheia, disco **chato** (efeito Lommel-Seeliger: mares quase sem contraste de sombra, brilho de oposição no centro). É **composição/mosaico orbital** (a própria NASA descreve como "composite image" a partir dos dados Clementine), não uma exposição única de oposição — o achatamento pode estar parcialmente acentuado pelo blend, não é garantia de fotometria pura. Julga textura/crateras da face cheia; não usar para calibrar o achatamento fino sem checar contra um segundo fato. | Composição fotográfica a partir dos dados da sonda Clementine (1994) | dados de 1994, publicação NASA GSFC | [images.nasa.gov/details/GSFC_20171208_Archive_e001982](https://images.nasa.gov/details/GSFC_20171208_Archive_e001982) | NASA, domínio público |
| `lua-crescente-terminador-artemis2-art002e019570.jpg` | Lua em crescente delicado, terminador nítido, sombras longas de cratera por toda a face iluminada. Arquivo original 5568×3712 (não o "Large" 1920×1280 de preview). | Câmera da tripulação, missão Artemis II (Orion), pós-sobrevoo lunar | 2026-04-07 | [images.nasa.gov/details/art002e019570](https://images.nasa.gov/details/art002e019570) | NASA, domínio público |
| `lua-lado-afastado-lro-wac-gsfc-e001939.jpg` | Lado afastado da Lua, mosaico fotográfico em projeção ortográfica (180° long., 0° lat.). Mosaico de **1 canal, sem informação de cor** (confirmado visualmente: imagem inteiramente monocromática). Julga albedo/textura de base da face oculta; não julga cor. | LROC WAC (Wide Angle Camera), Lunar Reconnaissance Orbiter — NASA/Goddard/Arizona State University | mosaico publicado 2011-03-11 | [images.nasa.gov/details/GSFC_20171208_Archive_e001939](https://images.nasa.gov/details/GSFC_20171208_Archive_e001939) | NASA/Goddard/ASU, domínio público |

## Antecipação F3/F4 (barata, coletada agora)

Mercúrio e Vênus foram removidos nesta revisão (fotos em falsa-cor,
confirmado nas legendas oficiais) e ainda não têm substituto real
verificado — ver "Correções desta revisão". **Atualização F3
(2026-08-13): Mercúrio ganhou substituto real verificado (abaixo);
Vênus segue sem — a caça está documentada ao fim da seção.**

| Arquivo | O que é | Instrumento / missão | Data | Fonte | Licença |
|---|---|---|---|---|---|
| `mercurio-bepicolombo-mcam2-2024-12-01.png` | Mercúrio em disco quase cheio a >51.000 km, Caloris visível como mancha clara; o polo norte fica à direita, na linha do terminador. **Monocromática, sem informação de cor** (as M-CAM são câmeras de engenharia preto-e-branco 1024×1024, sem obturador mecânico — a página oficial declara o processamento leve anti-banding). Julga albedo/textura de base e a leitura fotométrica do disco; não julga cor. | M-CAM 2 (monitoring camera), BepiColombo (ESA/JAXA), aproximação do 5º flyby | 2024-12-01 11:46 CET | [esa.int/ESA_Multimedia/Images/2024/12/Mercury_during_BepiColombo_s_fifth_flyby](https://www.esa.int/ESA_Multimedia/Images/2024/12/Mercury_during_BepiColombo_s_fifth_flyby) | ESA/BepiColombo/MTM, CC BY-SA 3.0 IGO |
| `marte-viking-disco-pia00407.jpg` | **Mapa/mosaico global, não fotografia de disco**: ~1000 imagens Viking Orbiter (filtros vermelho/violeta), projeção ortográfica centrada em 20°N, iluminação normalizada fotometricamente, cor "esticada" por processamento (confirmado na legenda oficial da NASA). Sem terminador, sem fase, sem atmosfera. Arquivo oficial JPEG 6787×6787 (não o preview 1280 px). Julga geografia/textura de base (Valles Marineris, calota); não julga luz, albedo real nem fase de disco. | Mosaico de cor global, Viking Orbiter | publicado 1998-06-08 | [science.nasa.gov/photojournal/global-color-views-of-mars](https://science.nasa.gov/photojournal/global-color-views-of-mars) (PIA00407) | NASA/JPL, domínio público |
| `jupiter-cassini-disco-pia04866.jpg` | Júpiter, mosaico de maior aproximação em cor verdadeira — retrato mais detalhado da época. O escurecimento gradual do lado direito segue a curvatura do disco (o planeta inteiro cabe no quadro, do topo à base): é o **lado noturno (terminador)**, não um corte de campo de visão — confirmado por inspeção visual (a legenda oficial da NASA não comenta o ponto, mas não sustenta a leitura antiga de "limbo cortado"). Arquivo oficial JPEG 1920×2400 (não o preview 66 KB). | ISS NAC (Narrow Angle Camera), Cassini | publicado 2003-11-13 | [science.nasa.gov/photojournal/cassini-jupiter-portrait](https://science.nasa.gov/photojournal/cassini-jupiter-portrait) (PIA04866) | NASA/JPL-Caltech, domínio público |
| `saturno-cassini-aneis-pia06193.jpg` | Saturno com anéis, mosaico global de imagens de outubro de 2004 — a visão mais detalhada da época, planeta inteiro + anéis de ponta a ponta. Ângulo de fase 72°, portanto iluminação parcial real (sombra do anel no globo, lado noturno visível): melhor foto do lote para julgar luz. Arquivo oficial JPEG 8888×4544 (não o preview 66 KB). | Cassini, outubro de 2004 | publicado 2005-02-24 | [science.nasa.gov/photojournal/the-greatest-saturn-portrait-yet](https://science.nasa.gov/photojournal/the-greatest-saturn-portrait-yet) (PIA06193) | NASA/JPL/Space Science Institute, domínio público |

**Vênus — a caça da F3 (2026-08-13), resultado documentado:** não entrou
arquivo. O disco cheio de Vênus em luz VISÍVEL essencialmente não existe
(o planeta é sem feição no visível; as candidatas clássicas caíram na
revisão de 2026-08-12 por falsa-cor: Mariner 10 é UV de 1974). As duas
candidatas reais nomeadas para a próxima rodada de caça: (1) **Akatsuki
UVI 365 nm** (JAXA, galeria oficial em akatsuki.isas.jaxa.jp/en/gallery —
é UV renderizado em amarelo pela convenção da equipe, entraria com a
natureza declarada, precedente do LRO mono; a galeria é JS-pesada e a
extração do arquivo oficial ficou para a rodada seguinte, com os
[termos de uso JAXA](https://akatsuki.isas.jaxa.jp/en/) a conferir na
linha); (2) **Parker Solar Probe WISPR** (flybys 2020–2021, lado NOTURNO
de Vênus em luz visível — foto real mas do lado errado para julgar o
topo de nuvens diurno).

Todas as licenças seguem as NASA Media Usage Guidelines: conteúdo de agência
federal dos EUA é domínio público, uso educacional livre, sem exigência legal
de crédito (mas o crédito acima é mantido por postura conservadora, mesmo
padrão adotado em `ATLAS-LICENCAS.md`). O filtro não é "só NASA": ESA, JAXA,
USGS e outras agências entram se ganharem no fato, com a licença anotada na
linha da tabela — ver item 2 do PROTOCOLO.

## Tamanho dos arquivos

Depois desta revisão, os arquivos são os **oficiais de tela cheia** de cada
ficha (JPEG/PNG, não TIFF — o TIFF só entraria se o JPEG fosse o preview), não
mais o preview do Photojournal/API. O maior é `saturno-cassini-aneis-pia06193.jpg`
(8888×4544, 5,7 MB); com o BepiColombo da F3 (0,3 MB) o total fica em
≈14,2 MB, abaixo do teto de 15 MB com folga de ~0,8 MB. Todas as
dimensões foram conferidas com `file`/`sips` depois do download cheio,
não antes.

## PROTOCOLO da rodada de referência

1. A foto é **direção**, não gabarito de pixel — ninguém vai subtrair estas
   imagens do nosso render.
2. Comparação sempre na bancada (`scripts/visual/bancada-assets.html`), lado
   a lado com uma captura nossa em **geometria casada** (mesma fase e
   distância aproximada do corpo na foto). Licença é linha do manifest, não
   veto: NASA, ESA (CC BY-SA 3.0 IGO, crédito + compartilhamento igual),
   JAXA (crédito, "Provided by JAXA"), USGS e Hubble/ESA entram se ganharem
   no fato — mas só depois de ler a legenda oficial até o fim (ver item 10).
3. Cada rodada julga **2–3 fatos direcionais nomeados**, nunca "parece
   melhor": dureza do terminador, albedo/branco das nuvens, contraste dos
   mares/faixas, cor do limbo.
4. Cada rodada mexe **UM botão** só — se dois parâmetros mudarem juntos, a
   causa do ganho ou da perda fica ambígua.
5. Todo resultado é registrado em `EVOLUCAO.md`, mesmo formato das rodadas da
   galáxia: o que mudou, o que os fatos julgados fizeram.
6. Máximo de **2–3 rodadas por corpo** nesta leva — é curadoria de direção,
   não perseguição de pixel a pixel.
7. Se a foto e o render divergirem num fato que a foto não pretende testar
   (ex.: iluminação da cena inteira, não só o corpo), a rodada anota a
   divergência como fora de escopo e segue.
8. Fotos com terminador (crescentes) julgam dureza de sombra; fotos de disco
   cheio julgam albedo e achatamento (Lommel-Seeliger); a de lado afastado ou
   mosaico julga textura/cor de base, não geometria de luz — e só cor se o
   arquivo realmente tiver canais de cor (ver linha do LRO acima).
9. Nenhuma foto desta pasta é gabarito de cor absoluta — todas passaram por
   processamento de cada missão (balanço de branco, composição de canais);
   o que se julga é a **relação** entre os fatos, não o valor RGB exato. Isso
   não cobre falsa-cor declarada (UV, filtros estatísticos): essas não entram
   na pasta, ponto — não é uma questão de calibrar a relação, é fotografar
   outra coisa que não luz visível.
10. Antes de trocar uma foto por outra, registrar aqui o motivo (imagem
    quebrada, era render, resolução ruim, falsa-cor não avisada) com a
    citação da fonte que confirmou — mesma disciplina de substituição
    documentada nas outras curadorias do projeto.

## Correções desta revisão (2026-08-12)

Aplicado depois de confirmar cada ponto na fonte oficial (protocolo: relatório
externo é hipótese, cada claim se confirma antes de agir).

**Removidas (falsa-cor confirmada na legenda oficial, sem substituto real
verificado nesta rodada):**

- `mercurio-messenger-disco-pia12051.jpg` — a legenda oficial
  ([science.nasa.gov/photojournal/a-global-view-of-mercurys-surface](https://science.nasa.gov/photojournal/a-global-view-of-mercurys-surface))
  diz: "The WAC enhanced color uses a statistical analysis of images from all
  11 WAC filters..." e "The black strip between the approach and departure
  images is a portion of Mercury's surface not viewed..." — falsa-cor
  estatística *e* duas passagens com iluminações diferentes coladas com uma
  faixa sem dado no meio. Não serve para julgar cor nem luz. Substitutos
  verificados e descartados: `PIA11364` ("Mercury's true color is in the eye
  of the beholder") é um gráfico comparativo de 4 versões de cor sem resposta
  única — a própria NASA declara não haver "a cor certa"; BepiColombo M-CAM 1
  "Mercury's sunlit north" (ESA/JAXA, CC BY-SA 3.0 IGO) é foto real
  monocromática, mas tem estrutura da sonda em primeiro plano e
  logo/legenda gravados na imagem — não serve de referência limpa para a
  bancada. Corpo fica sem foto até achar um frame limpo (MESSENGER de um só
  sobrevoo, ou outro M-CAM da BepiColombo sem a sonda no quadro).
- `venus-mariner10-pia23791.jpg` — a legenda oficial
  ([science.nasa.gov/photojournal/venus-from-mariner-10](https://science.nasa.gov/photojournal/venus-from-mariner-10))
  diz: "This view is a false color composite created by combining images
  taken using orange and ultraviolet spectral filters..." — Vênus a olho nu é
  creme quase sem traço; esta imagem mostra o que o UV realça. Substitutos
  verificados: a galeria oficial da Akatsuki (JAXA,
  [akatsuki.isas.jaxa.jp/en/gallery/data/ir1](https://akatsuki.isas.jaxa.jp/en/gallery/data/ir1/))
  rotula toda imagem de disco diurno como "synthesized false color image by
  UVI and IR1" — não há opção natural publicada. Venus Express VMC (ESA) tem
  canal visível (503–523 nm) que poderia servir, mas não achei imagem de
  disco publicada com licença clara nesta busca. Corpo fica sem foto.
- `terra-crescente-terminador-apollo17-as17-152-23272.jpg` — a legenda oficial
  diz "The crescent Earth rises above the lunar horizon": a Terra é um disco
  pequeno num canto do quadro, dominado pela superfície lunar (confirmado
  visualmente — a Terra ocupa menos de 10% do quadro). Não dá para julgar
  dureza de terminador nem albedo de nuvem numa comparação lado a lado com o
  nosso render. Frames vizinhos do mesmo rolo (`as17-152-23274`,
  `as17-152-23279`) têm o mesmo problema ou pior. Nenhum substituto com a
  Terra grande no quadro encontrado nesta rodada.

**Corrigidas no lugar (arquivo mantido, legenda/linha do LEIA-ME ajustada):**

- Júpiter (PIA04866) — a linha antiga dizia "o limbo direito sai do quadro
  (Júpiter era maior que o campo de visão)"; a inspeção visual mostra o
  disco inteiro dentro do quadro com escurecimento gradual seguindo a
  curvatura — é lado noturno/terminador, não corte de campo de visão.
- Lua lado afastado (LRO WAC) — a linha antiga não avisava que o mosaico é
  monocromático; corrigido para "não julga cor".
- Lua cheia (Clementine) — a linha antiga não avisava que é composição
  orbital, não exposição única; corrigido com a citação da NASA
  ("composite image") e a ressalva sobre o achatamento.
- Marte (Viking PIA00407) — a linha antiga tratava como "disco inteiro";
  corrigido para "mapa/mosaico, não fotografia de disco", com os números da
  legenda oficial (≈1000 frames, normalização fotométrica, projeção
  ortográfica, cor esticada). Substituto avaliado e descartado: Hubble
  `heic1814` (oposição de 2018) é foto real, mas é dominada por uma tempestade
  de poeira global, também não é cor natural (filtros UV+óptico realçados,
  confirmado na legenda da ESA/Hubble) e não tem terminador (oposição = disco
  todo iluminado) — não entrega o que prometia, não trocado.

**Arquivos trocados por preview → oficial cheio (mesma fonte, mesmo papel):**

| Arquivo | Antes | Depois |
|---|---|---|
| `terra-epic-disco-cheio-2026-08-10.png` | JPG 1080×1080, 212 KB | PNG 2048×2048, 2,8 MB |
| `lua-crescente-terminador-artemis2-art002e019570.jpg` | "Large" 1920×1280, 63 KB | Original 5568×3712, 582 KB |
| `marte-viking-disco-pia00407.jpg` | preview 1280 px, 181 KB | oficial 6787×6787, 3,5 MB |
| `jupiter-cassini-disco-pia04866.jpg` | preview 66 KB | oficial 1920×2400, 175 KB |
| `saturno-cassini-aneis-pia06193.jpg` | preview 66 KB | oficial 8888×4544, 5,4 MB |

`terra-blue-marble-apollo17-as17-148-22727.jpg` não foi trocada — o feedback
marcou como opcional ("scan maior se achar sem custo") e não priorizei a
busca nesta rodada.

**Fora de escopo desta revisão — textura de runtime:** o feedback também
critica as texturas 3D de `public/textures/atlas/` (incumbente Solar System
Scope 8k, CC BY 4.0, conferido em `public/data/atlas/texturas.json`) como
inferiores ao que existe em NASA Blue Marble/Black Marble, USGS LRO WAC etc.
Isso é textura de runtime, não foto de direção — não mexi em nada de
`public/textures/` ou no manifest; a decisão é da frente de runtime.
