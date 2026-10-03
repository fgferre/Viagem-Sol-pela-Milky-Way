// ============================================================
// A COR INVENTADA DO SUL DE CARONTE (PLAN-COR.md, etapa M1, 02/10/2026)
//
// O DEFEITO. O mapa de cor de Caronte é o mosaico global de 300 m da New
// Horizons (um canal; a casa o grava em 8192×4096, cinza em três canais). O
// terço sul nunca foi fotografado — no sobrevoo o polo sul do sistema estava
// em noite polar — e `preencherVazioSemDado` (item 149) o tapa com o tom médio
// liso. A borda desse tapa-buraco é o terminador do dia da passagem, uma
// polilinha de trechos retos; com relevo dos dois lados (o relevo inventado)
// ela virou uma EMENDA RETA no app (foto 4 de Caronte). O relevo é contínuo e
// não muda aqui: a linha está na cor.
//
// A TÉCNICA: transferência de textura na esfera à Efros & Freeman (2001,
// "Image Quilting for Texture Synthesis and Transfer", §3), GUIADA pelo
// relevo. O alvo (o vazio e a faixa rasante, abaixo) é coberto por retalhos
// quadrados do plano tangente, copiados do fotografado nítido por ROTAÇÃO da
// esfera, sem giro e sem espelho — o norte do retalho fica no norte, porque a
// cor fotografada carrega a sombra da sonda com direção fixa (medido no lado
// nítido: o passa-alta do brilho correlaciona r = 0,34 com n·L para o Sol a
// azimute ~330° e elevação ~45°, no espaço do próprio mapa de normais). O
// "mapa-guia" é esse sombreado, g = max(0, n·L), lido do normal.png da casa
// (medido no lado medido, inventado no resto) nos dois lados. Três passadas,
// retalho de 120 → 80 → 55 km e α (o peso da costura contra o do guia) de
// 0,1 → 0,45 → 0,8; cada passada compara o retalho com o que a anterior pôs
// ali (E&F §3, a iteração). Corte de erro mínimo na sobreposição (curva
// fechada em volta do centro, programação dinâmica em ângulo — o molde é a
// colcha do relevo, `colcha` em `relevo-inventado.mjs`) e rampa de 3 texels.
//
// O QUE AS PRÉVIAS DE 02/10 PEDIRAM ALÉM DISSO (cada item corrige um defeito
// medido; a régua é `capturas/cor-inventada/ferramentas/m1/mede-m1.mjs`):
//  - A SOMBRA ASSADA. Só a escolha pelo guia dá correlação ~0,01 com n·L no
//    alvo (64 candidatos não acham sombreado parecido). A parte do detalhe que
//    o sombreado explica (regressão no `bom`, ganho ~117 DN por unidade de
//    n·L) sai das fontes e a do relevo do ALVO entra com o mesmo ganho — a cor
//    inventada sai sombreada pelo relevo inventado (`opcoes.sombreia: false`
//    desliga).
//  - O TOM. O tom é a continuação HARMÔNICA (`membranaHarmonica`) do
//    passa-baixa do fotografado que não é faixa — o nítido E o borrado (o
//    albedo grande do borrado é real; no lado de trás a borda do alvo só
//    encosta nele) —, presa em volta do alvo; o detalhe vem dos retalhos
//    (resultado = colcha − passa-baixa(colcha) + tom). O corte tom/detalhe é
//    40 km, e na borda 10 km (ver `SIGMA_DO_TOM_KM`): com 200 km a membrana lia
//    a média de centenas de km para dentro e fazia degrau de 13 DN na borda.
//  - O DESFOCADO. Junto do lado de trás (que equivale ao nítido desfocado por
//    σ ~10 km), o detalhe inventado começa desfocado igual e fica nítido em 150
//    km, e na zona livre a foto passa ao inventado sem corte; sem isso, a 1ª
//    prévia trocou a emenda reta por uma emenda de nitidez.
//  - AS UNIDADES sorteadas pelos pesos no centro do retalho, e não a dominante:
//    a dominante muda numa linha reta (−28° no lado de trás) e a colcha a
//    desenhava.
//  - A COSTURA FINAL (Poisson, só o degrau médio): o resultado casa com a foto
//    na borda do alvo, e a correção decai para dentro.
//
// AS REGIÕES (grade da casa: coluna 0 = 180°E, leste para a direita, linha 0
// = +90°; tudo medido no mosaico de Caronte em 02/10):
//  - `vazio`: o que `preencherVazioSemDado` tapou no mosaico CRU (a mesma
//    regra do vazio GRANDE, janela em graus), reduzido ao destino pelo máximo
//    e dilatado 6 texels — o halo do lanczos3 da redução 12693 → 8192.
//  - `semDado`: os buracos pequenos que o mosaico publicou em preto e a casa
//    deixa como estão; não são fonte.
//  - `borrado`: onde o mosaico não tem detalhe fino. A régua é a energia do
//    passa-alta de σ 3 km (média local de σ 20 km) contra a mediana do lado
//    nítido (Oz Terra 330–360°E 30–57°N e Vulcan 300–358°E −38..−3°, RMS 22
//    DN): abaixo de metade (o histograma tem o lado de trás em 0–0,15, a faixa
//    intermediária do norte em 0,3–0,45 e o nítido de 0,5 a 1,5) é
//    `desfocado`; e o RISCADO (coerência do tensor de estrutura do passa-alta
//    acima de 0,7: a cunha de 275–300°E junto do terminador tem 0,84, contra
//    0,55 em Vulcan) também é borrado — energia de risco não é detalhe. O lado
//    de trás inteiro sai borrado.
//  - `faixa` (rasante): dentro do fotografado, junto da borda do vazio, onde a
//    luz era rasante. Medido em função da distância à borda: junto do nítido
//    (275–330°E) o brilho sobe de 109 a 145 DN em 25 km e para em ~145 a
//    25–55 km; junto do borrado sobe de ~92 a ~145–150 ao longo de 45–70 km.
//    Largura: 40 km junto do nítido, 75 km junto do borrado (pela fração de
//    borrado do vizinho, média de σ 50 km), para os 15 km de fora — a ZONA
//    LIVRE, onde o retalho pode ficar com a foto e o corte escolhe por onde
//    passar — caírem no patamar do brilho.
//  - `bom` = fotografado, sem buraco, nem borrado, nem faixa: a fonte, que
//    não muda. Alvo = vazio ∪ faixa (em Plutão, também os buracos perto do
//    vazio: `buracosNoAlvoKm`); fora dele o mapa sai byte a byte igual.
//
// AS FONTES de cada unidade geológica (`pesosDasUnidades` do JSON do relevo,
// `fonte/<corpo>-lado-de-tras.json`) são as caixas `fontes` dela (Vulcan
// Planitia para a planície lisa do sul; Oz Terra para as terras altas;
// Serenity e Mandjet para o cinturão), com o centro a meia largura da borda da
// caixa e o retalho INTEIRO (meia diagonal) no `bom`.
//
// A M1b — PLUTÃO (02/10/2026). A mesma técnica; o que muda de um corpo para o
// outro mora em `POR_CORPO` (os números de Caronte acima ficam lá), e três
// generalizações que deixam Caronte igual (o RGB da prévia dele sai com o mesmo
// sha256):
//  - A COR EM TRÊS CANAIS. Cinza (Caronte: os três canais iguais) segue em um.
//    Com canais diferentes, a escolha do retalho (sobreposição, guia e corte), a
//    sombra assada e a régua do borrado medem-se na luminância (0,299 R + 0,587 G
//    + 0,114 B); o tom (a membrana) é por canal; os retalhos copiam os três (e a
//    luminância, que a escolha lê). A sombra assada é multiplicativa — o
//    sombreado escala o albedo —: em cada canal ela vale o ganho medido na
//    luminância vezes tom do canal ÷ tom da luminância.
//  - O GIRO. O mosaico cru de Plutão tem a borda esquerda em 0°E e `girarMapa`
//    gira 180° DEPOIS do tapa-buraco (que não dá a volta da longitude): as
//    máscaras saem do cru como ele é e giram com `giraColunasDeImagem` (`cru.giroGraus`).
//  - AS GRADES REDUZIDAS (a meia, a das fontes e a do tom) já não precisam
//    dividir a cheia — 5926×2963 tem altura ímpar —: a largura é a fração
//    arredondada para baixo a múltiplo de 64 (o desfoque pede largura par e a
//    membrana desce níveis de 2), e cada texel vai à célula que contém o centro
//    dele. Com a cheia divisível são os blocos de sempre.
// E o que a medida pediu em Plutão, cada item num número de `POR_CORPO.pluto` — entre eles o detalhe
// MULTIPLICATIVO (um ganho só, o da luminância, e o joelho do branco), a fração da sombra no alvo e os
// buracos que entram no alvo. Uma VARIANTE (`opcoes.variante`) põe os números dela (`POR_CORPO.<corpo>.variantes`)
// por cima desses — escolha de gosto dele, comparada por foto; sem ela, o resultado é o de sempre.
//
// A M2 — O LADO DE TRÁS BORRADO (`opcoes.borrado`, chave `sul:1,borrado:1`; 02/10/2026). O detalhe fino
// do `borrado` é refeito sobre o albedo real, e a verdade fica:
//  - O MAPA DE RESOLUÇÃO (`mapaDeResolucao`): para as bandas de 2, 4, 8, 16 e 32 km (diferença de
//    gaussianas), a energia local (relativa ao brilho local nos dois corpos: o lado de trás de Caronte vai
//    de 1 a 150 DN) contra a mediana do `bom`; a resolução σ_loc é a menor banda com metade da energia do
//    nítido. O CONTRASTE LOCAL entra na régua: o limiar vai vezes a razão da banda mais forte, quando ela é
//    menor que 1 — medido em 02/10, o norte de Plutão tem as cinco bandas a 0,13–0,20 do nítido com a forma
//    do espectro dele: é terreno de pouco contraste, resolvido, e a régua sem isso o daria todo por inventar;
//    o lado de trás de verdade cai (Plutão 0,03/0,08/0,23/0,56/1,11; Caronte 0,03/0,12/0,40/0,84/1,42). O
//    detalhe inventado sai com a amplitude desse contraste e do brilho local (o sombreado e o albedo
//    multiplicam).
//  - A SÍNTESE: a mesma transferência (as passadas, as fontes `bom` da unidade sorteada e de tom parecido —
//    o tom do alvo é o passa-baixa da própria foto —, a sombra do relevo do alvo, a amplitude da variante),
//    com o sul já posto como vizinho fixo; o guia soma ao sombreado o passa-baixa da foto (E&F §3: a
//    correspondência com a imagem alvo), para o detalhe inventado respeitar as manchas reais.
//  - A MONTAGEM (`montagemDaFoto`): resultado = passa-baixa(foto) + passa-alta(síntese) no nível da
//    resolução, a troca suave entre as gaussianas vizinhas; onde σ_loc = 2 km sai a foto.
//  - A LIGAÇÃO COM O SUL: o desfoque junto do lado de trás sai (o vizinho fica nítido) e, na zona livre, a
//    foto que passava ao inventado é a foto montada (a zona livre entra no alvo da M2).
//
// DETERMINÍSTICO por semente. A prévia e o gerador chamam a MESMA função,
// `inventaCorDoCorpo`; ela não lê nem grava disco.
// ============================================================

import { giraColunasDeImagem, preencherVazioSemDado } from './lib-texturas.mjs';
import {
  amostraNoPonto,
  coeficientesDeSpline,
  colunaDaLongitude,
  desfocaComMascara,
  distanciaAoVazioKm,
  latitudeDaLinha,
  linhaDaLatitude,
  longitudeDaColuna,
  membranaHarmonica,
  pesosDasUnidades,
  planoTangente,
  rasterizaPoligono,
  repeticaoMaisPerto,
} from './relevo-inventado.mjs';

const GRAUS = 180 / Math.PI;
const RADIANOS = Math.PI / 180;
const INF = 1e30;

/** A janela do vazio GRANDE, em graus: a de `GRAUS_DA_JANELA_DO_VAZIO` em `baixa-texturas.mjs` (lá não é exportada; mudou lá, muda aqui). */
const GRAUS_DA_JANELA_DO_VAZIO = 14;
/** Abaixo disto em todo canal o texel do mosaico cru não tem dado (o padrão de `preencherVazioSemDado`). */
const VAZIO_ATE = 12;

/** A régua do borrado (ver o cabeçalho): energia do passa-alta e coerência do tensor de estrutura dele (o riscado). */
const SIGMA_DO_PASSA_ALTA_KM = 3;
const SIGMA_DA_ENERGIA_KM = 20;
const LIMIAR_DO_BORRADO = 0.5;
const SIGMA_DA_COERENCIA_KM = 15;
const LIMIAR_DA_COERENCIA = 0.7;
const SIGMA_DO_BORRADO_KM = 20;

/** A faixa rasante: σ da fração de borrado do vizinho (as larguras são de `POR_CORPO`); a zona livre de fora. */
const SIGMA_DA_CLASSE_DA_FAIXA_KM = 50;
const ZONA_LIVRE_KM = 15;

/**
 * O SOL ASSADO nas fotos, no espaço do próprio mapa de normais (n = rgb/127,5
 * − 1; x = R, y = G, z = B): a direção que maximiza a correlação do passa-alta
 * do brilho com n·L no lado medido (Caronte: az 330°, el 45°, r = 0,34;
 * Plutão: az 320°, el 30°, r = 0,40).
 */
export const SOL_ASSADO = { charon: [-0.354, 0.612, 0.707], pluto: [-0.557, 0.663, 0.5] };

/** Os pesos da luminância (Rec. 601) em que a cor de três canais é medida e escolhida. */
const LUMINANCIA = [0.299, 0.587, 0.114];
/** O detalhe multiplicativo: os limites do ganho (tom do alvo ÷ tom da fonte) e onde começa o joelho do branco (DN). */
const GANHO_DO_DETALHE = [0.5, 2];
const INICIO_DO_JOELHO = 0.85 * 255;
/** O filtro de tom: tentativas de sorteio (× `CANDIDATOS`) em cada fator antes de alargar. */
const TENTATIVAS_DO_TOM = 16;

/** Os números da variante "calma" de Plutão (ver `POR_CORPO.pluto`); a "serena" herda deles. */
const CALMA_DE_PLUTAO = { sigmaDoTomKm: 20, joelhoRelativo: { inicio: 1.6, folga: 0.4, escuros: { inicio: 0.65, folga: 0.15 } }, sombraNoAlvo: 0.57 };

/**
 * O QUE MUDA DE UM CORPO PARA O OUTRO, cada número medido no mosaico dele:
 * `caixasNitidas` (a referência da régua do borrado) e `reguaRelativa` (a
 * energia dividida pelo brilho local ao quadrado — o contraste); `faixaRasanteKm`
 * (a largura da faixa junto do vizinho nítido e do borrado); os halos (texels
 * que o vazio e os buracos crescem no destino); `desfoqueDoBorradoKm` (o σ a
 * que o lado nítido equivale ao de trás); `grades` (a meia, a das fontes e a do
 * tom, em frações da cheia); `detalheMultiplicativo` (o detalhe dos retalhos
 * escala com o brilho: um ganho só, o da luminância, tom do alvo ÷ tom da fonte,
 * e o joelho do branco nos claros); `sombraNoAlvo` (a fração do ganho da sombra
 * assada que o relevo do alvo recebe; sem ela, 1); `buracosNoAlvoKm` (os
 * buracos sem dado a até essa distância do vazio entram no alvo) e `anelDosBuracosKm`
 * (o fotografado em volta deles que entra como zona livre); `filtroDeTom` (só valem
 * origens com o tom local, passa-baixa de `sigmaKm`, a um dos `fatores` do tom do
 * alvo — alarga com menos de `minimo` candidatos); `fontesExtras` (caixas de fonte da
 * cor além das do JSON, por unidade); `joelhoRelativo` (a razão brilho ÷ tom acima de
 * `inicio` vai a `inicio + folga` por um joelho suave; com `escuros`, o espelho: abaixo de
 * `escuros.inicio` vai a `escuros.inicio − escuros.folga` — `razaoNoJoelho`); `sigmaDoTomKm` (o corte
 * tom/detalhe, se não o de `SIGMA_DO_TOM_KM`); `amplitudeDoAlbedo` (a fração do resíduo de albedo dos
 * retalhos que o alvo recebe; a sombra do relevo fica com `sombraNoAlvo` — `detalheNoAlvo`; sem ela, 1);
 * `variantes` (conjuntos destes números que `opcoes.variante` põe por cima dos do corpo).
 */
const POR_CORPO = {
  // Caronte: os números do cabeçalho. O halo é o do lanczos3 na redução (±3 texels em 12693 → 8192, com folga).
  charon: {
    raioM: 606000,
    caixasNitidas: [
      { lon: [330, 360], lat: [30, 57] },
      { lon: [300, 358], lat: [-38, -3] },
    ],
    reguaRelativa: false,
    faixaRasanteKm: { bom: 40, borrado: 75 },
    haloDoVazioTexels: 6,
    haloDosBuracosTexels: 3,
    desfoqueDoBorradoKm: 10,
    grades: { meia: 2, fontes: 4, tom: 8 },
    detalheMultiplicativo: false,
  },
  // Plutão (PIA11707, 5926×2963, 1,26 km/texel; medido em 02/10 na luminância):
  //  - A RÉGUA É RELATIVA: o albedo vai de ~26 DN (Cthulhu, escura e nítida: RMS do passa-alta 3,9 DN)
  //    a ~160; em DN, Cthulhu empata com a calota do norte, de baixo contraste (3,7 DN). O contraste
  //    (RMS ÷ brilho local) separa: mediana 0,14 em Cthulhu, 0,19 em Krun, 0,22 em Tartarus Dorsa,
  //    contra 0,006–0,011 no lado de trás, 0,016 em Sputnik e 0,025 no norte. A referência são essas
  //    três caixas nítidas (fora de Sputnik), e a metade dela (o limiar de Caronte) separa os grupos.
  //  - O HALO: sem redução, mas a borda do mosaico tem um aro escuro — o 1º texel a 50–64 DN contra
  //    80–108 logo depois (o borrão de antisserrilhado da montagem), e no lóbulo do sul (100–160°E)
  //    uma subida de 3–4 texels (32 → 63 → 74 → 78 → 80); 4 texels (5 km) o cobrem.
  //  - A FAIXA (v4): o brilho (passa-baixa σ 20 km, média de toda a borda) em anéis de 10 km da borda
  //    do vazio: no lado de trás (205→360→100°E) sobe de 104,7 a 107,8 DN em 60 km e para no patamar a
  //    50–80 km (além, cai com o albedo do cinturão escuro); junto do lóbulo (100–205°E), plano em ~77,
  //    sem rampa. A faixa vai a 75 km junto do borrado — a zona livre (60–75 km) e a membrana do tom
  //    no patamar — e fica em 20 km junto do nítido.
  //  - O DESFOQUE: junto da borda do lado de trás (280–350°E, −28..−20°) o RMS relativo por banda de
  //    0–3/3–6/6–12 km (0,71/1,22/3,17 %) é o do lado nítido desfocado por σ ≈ 7,3/8,5/7,5 km.
  //  - A GRADE DO TOM ÷4 (5,1 km), e não ÷8: a ÷8 teria células de 10,6 km, mais largas que o σ de
  //    10 km da borda do tom (em Caronte a ÷8 tem 3,7 km).
  //  - O DETALHE MULTIPLICATIVO: a fonte do sul é Cthulhu (as planícies crateradas; 88 % dos
  //    retalhos da 1ª prévia), de brilho ~27 DN, e o alvo fica em ~100. Com o detalhe em DN (o de
  //    Caronte, onde fonte e alvo têm o mesmo brilho) a 1ª prévia saiu com contraste de 8,9 % no fundo
  //    do vazio contra 19–20 % em Cthulhu e Krun, e o que sobrou era quase só a sombra do relevo:
  //    correlação com n·L de 0,36 no vazio contra 0,16 no lado medido. O albedo e o sombreado
  //    multiplicam: o detalhe do retalho escala pelo tom da luminância no alvo ÷ o da fonte (o retalho
  //    leva os dois), e a sombra assada é medida como fração do brilho. UM ganho só para os três
  //    canais: a 2ª prévia, com o detalhe relativo POR CANAL, ganhou ×3,7 no azul (~15 DN em Cthulhu)
  //    e pôs pontos branco-ciano onde Cthulhu tem gelo claro; com o mesmo ganho, o matiz do retalho
  //    fica. Os claros que passam do fundo de escala vão ao branco por um joelho suave (`joelhoDaCor`).
  //  - A SOMBRA NO ALVO: com o detalhe multiplicativo, o ganho medido no `bom` (0,94 do brilho por
  //    unidade de n·L) devolvido inteiro dá correlação de 0,30 com n·L no vazio, contra 0,16 no lado
  //    medido (a régua de mede-m1b.mjs); sem sombra, 0,00 (os retalhos sozinhos não seguem o relevo).
  //    Os retalhos não dependem dessa fração e o resultado é afim nela: 0,52 dá 0,16 (calibra-sombra.mjs,
  //    em capturas/cor-inventada/ferramentas/m1b, sobre as prévias com 1 e com 0).
  //  - OS BURACOS: a faixa preta de 127–147°E, −42..−37° (um buraco do mosaico que encosta no vazio e
  //    vai a 309 km dele) ficava preta no app. Os buracos sem dado a até 150 km do vazio entram no alvo
  //    — o buraco inteiro, se um texel dele está a essa distância (27 buracos, 16 mil texels); e um anel
  //    de 15 km de fotografado em volta deles entra como zona livre, para o corte passar por dentro da
  //    textura e não na borda reta do buraco (o traço de 127–147°E na v3).
  //  - AS FONTES COM TOM PARECIDO (v4): 88 % dos retalhos da v3 vinham de Cthulhu (tom ~27 DN) e o
  //    ganho ×3,7 levava o gelo claro dela ao branco. Cada candidato só vale se o tom local da origem
  //    (passa-baixa σ 40 km da luminância) estiver a um fator 1,5 do tom do alvo no centro do retalho
  //    (alarga a 2 e a 3 com menos de 16 candidatos); as planícies crateradas ganham os planaltos de
  //    albedo intermediário que ladeiam Cthulhu (St21: a unidade só é escura entre 13°N e 23°S; tom
  //    mediano 83 e 64 DN contra 27); o ganho para em 2; e os claros relativos ao tom passam por um
  //    joelho (`joelhoSuave`) acima de 1,6 vezes o tom, até 2 — o gelo claro fica, sem virar branco.
  pluto: {
    raioM: 1188300,
    caixasNitidas: [
      { lon: [100, 140], lat: [-20, 5] },
      { lon: [200, 232], lat: [-25, 2] },
      { lon: [214, 245], lat: [2, 32] },
    ],
    reguaRelativa: true,
    faixaRasanteKm: { bom: 20, borrado: 75 },
    haloDoVazioTexels: 4,
    haloDosBuracosTexels: 4,
    desfoqueDoBorradoKm: 8,
    grades: { meia: 2, fontes: 4, tom: 4 },
    detalheMultiplicativo: true,
    sombraNoAlvo: 0.52,
    buracosNoAlvoKm: 150,
    anelDosBuracosKm: 15,
    filtroDeTom: { sigmaKm: 40, fatores: [1.5, 2, 3], minimo: 16 },
    fontesExtras: { 'planicies-crateradas': [{ lon: [86, 145], lat: [13, 22] }, { lon: [86, 145], lat: [-30, -23] }] },
    joelhoRelativo: { inicio: 1.6, folga: 0.4 },
    // A VARIANTE "CALMA" (02/10; `opcoes.variante: 'calma'`), escolha de gosto dele contra a v4, a "leopardo": as
    // manchas de albedo de 50–150 km dos retalhos (o vermelho-escuro sobre fundo claro que vem dos planaltos ao norte
    // de Cthulhu) ficam no tom — o corte tom/detalhe desce de 40 a 20 km (o da sombra assada junto, a mesma banda) e
    // a membrana manda nas escalas grandes; o detalhe fino, o grão e as crateras ficam. O joelho relativo ganha o
    // espelho nos escuros (abaixo de 0,65 vezes o tom, até a metade dele, como o claro vai até o dobro), e a sombra no
    // alvo é a fração que devolve, com o corte novo, a correlação do lado medido com n·L (0,163, a régua de
    // mede-m1b.mjs): 0,6 deu 0,171 no vazio, e 0,57 sai de r = f·a ÷ √(b² + f²·a²), a sombra somada a um detalhe
    // que não a segue (mede-m1b-v5.mjs, em capturas/cor-inventada/ferramentas/m1b).
    // A VARIANTE "SERENA" (02/10; `opcoes.variante: 'serena'`), a terceira escolha de gosto: a calma com o resíduo de
    // albedo dos retalhos (a colcha menos o passa-baixa dela, já com o ganho) a meia amplitude (`amplitudeDoAlbedo`) — o
    // mosqueado de albedo cai pela metade e as crateras seguem no sombreado do relevo. Com a sombra da calma (0,57), a
    // correlação com n·L no vazio sobe a 0,224 (o lado medido tem 0,163; mede-m1b-v6.mjs); a mesma conta da calma dá 0,41.
    variantes: {
      calma: CALMA_DE_PLUTAO,
      serena: { ...CALMA_DE_PLUTAO, amplitudeDoAlbedo: 0.5, sombraNoAlvo: 0.41 },
    },
  },
};

/** As passadas da transferência: largura do retalho (km), α e o passo (texels) dos pontos que medem o erro. */
const PASSADAS = [
  { larguraKm: 120, alfa: 0.1, passoDasAmostras: 3 },
  { larguraKm: 80, alfa: 0.45, passoDasAmostras: 2 },
  { larguraKm: 55, alfa: 0.8, passoDasAmostras: 2 },
];
/** A sobreposição entre retalhos vizinhos, em frações da largura. */
const SOBREPOSICAO = 0.25;
/** Candidatos sorteados por retalho; o escolhido sai ao acaso entre os `MELHORES`. */
const CANDIDATOS = 64;
const MELHORES = 4;
/** Sem repetir: nenhuma origem a menos de ¼ de largura de outra usada a menos de 4 larguras no alvo. */
const VIZINHANCA_SEM_REPETIR = 4;
const RAIO_DE_REPETICAO = 0.25;
const RODADAS_DE_SORTEIO = 5;
/** A rampa (texels) do corte; a margem do retalho (texels) além do quadrado, onde a rampa ainda escreve. */
const ESFUMADO_TEXELS = 3;
const MARGEM_DO_RETALHO = 3;
/**
 * O TOM: σ (km) do passa-baixa que separa o tom (membrana) do detalhe (retalhos), e a BORDA dele. A
 * membrana prende no passa-baixa do fotografado em volta do alvo, e o passa-baixa só vê um lado na
 * borda: com σ 200 km ele lia lá a média de centenas de km para dentro — no lado de trás, 13 DN
 * mais escura que a vizinhança logo além da faixa (degrau medido na 1ª prévia); com 40 km, ~4 DN
 * (2ª prévia). Por isso, até `BORDA_DO_TOM_KM[0]` do alvo o tom é o passa-baixa de
 * `SIGMA_DA_BORDA_DO_TOM_KM`, e passa ao de `SIGMA_DO_TOM_KM` até `BORDA_DO_TOM_KM[1]`: a membrana
 * sai do brilho LOCAL da borda. A colcha perde a escala grande pelo passa-baixa de
 * `SIGMA_DA_COLCHA_KM` (resultado = colcha − passa-baixa(colcha) + tom). `SIGMA_DA_MEMBRANA_KM` só
 * escolhe o nível em que `membranaHarmonica` resolve exato; tudo na grade do tom (`POR_CORPO`).
 */
const SIGMA_DO_TOM_KM = 40;
const SIGMA_DA_BORDA_DO_TOM_KM = 10;
const BORDA_DO_TOM_KM = [20, 80];
const SIGMA_DA_COLCHA_KM = 200;
const SIGMA_DA_MEMBRANA_KM = 200;

/** A costura final: σ (km) da média, ao longo da borda do alvo, do quanto o resultado se afasta da foto ali. */
const SIGMA_DO_DEGRAU_KM = 10;
/**
 * O DESFOQUE JUNTO DO BORRADO (o σ é `desfoqueDoBorradoKm` de `POR_CORPO`): em Caronte o lado de
 * trás equivale ao lado nítido desfocado por σ ≈ 10–12 km (RMS por banda de 0–3, 3–6, 6–12, 12–24
 * km: 0,7/0,7/1,8/4,1 DN em 195–260°E contra 0,2/0,6/1,8/3,6 no nítido desfocado 12 km — medido em
 * 02/10). Junto de vizinho borrado, o detalhe inventado começa
 * desfocado assim e fica nítido ao longo de `RAMPA_DO_DESFOQUE_KM` para dentro do alvo — sem o
 * degrau de nitidez que a 1ª prévia mostrou. O vizinho que conta é o MAIS PERTO fora do alvo (a
 * média larga da 2ª prévia desfocou o alvo colado em Vulcan, nítido, por causa da cunha riscada a 50
 * km): borrado se o texel borrado mais perto está mais perto que o nítido mais perto, com transição
 * de ±`TRANSICAO_DA_CLASSE_KM`. Os níveis de desfoque (0, σ/4, σ/2, σ) são interpolados.
 */
const RAMPA_DO_DESFOQUE_KM = 150;
const TRANSICAO_DA_CLASSE_KM = 20;

/**
 * A M2 (ver o cabeçalho): as bandas da régua de resolução (a de σ = gaussiana de σ/2 − gaussiana de σ; a 1ª, a foto
 * − a de 2 km), a média local da energia delas, o limiar (metade da ENERGIA do nítido: o RMS a √½ dele) e a
 * suavização do nível e do contraste; abaixo de `NIVEL_MINIMO_DA_SINTESE` (σ_loc < 2,03 km) a síntese não entra; a
 * zona livre das passadas da M2 (ver `inventaCorDoCorpo`).
 */
const BANDAS_DA_RESOLUCAO_KM = [2, 4, 8, 16, 32];
const SIGMA_DA_ENERGIA_DA_BANDA_KM = 25;
const LIMIAR_DA_RESOLUCAO = Math.SQRT1_2;
const SIGMA_DA_RESOLUCAO_KM = 20;
const NIVEL_MINIMO_DA_SINTESE = 0.02;
const ZONA_LIVRE_DA_M2_KM = 90;

const PESO_MINIMO = 1e-9;

/** mulberry32 — cópia de `geradorDeSemente` (relevo-inventado.mjs, interna; a mesma de esculpido.ts). */
function geradorDeSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------
// AS MÁSCARAS
// ------------------------------------------------------------

/**
 * O VAZIO DO MOSAICO CRU, na resolução dele: `vazio` = o que
 * `preencherVazioSemDado` tapa (a mesma função, numa cópia de um canal — o
 * máximo dos canais, que é o que ela compara —, com a janela em graus como em
 * `baixa-texturas.mjs`); `semDado` = os buracos pequenos que ficam pretos.
 */
export function vazioDoMosaico(pixels, largura, altura, canais, { grausDaJanela = GRAUS_DA_JANELA_DO_VAZIO, vazioAte = VAZIO_ATE } = {}) {
  const n = largura * altura;
  const um = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    let m = 0;
    for (let c = 0; c < canais; c += 1) if (pixels[k * canais + c] > m) m = pixels[k * canais + c];
    um[k] = m;
  }
  const tapado = Uint8Array.from(um);
  preencherVazioSemDado(tapado, largura, altura, 1, { vazioAte, raio: Math.round((largura * grausDaJanela) / 360) });
  // o tom do tapa-buraco é a média do que tem dado (≥ vazioAte): todo texel tapado muda
  const vazio = new Uint8Array(n);
  const semDado = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    if (tapado[k] !== um[k]) vazio[k] = 1;
    else if (um[k] < vazioAte) semDado[k] = 1;
  }
  return { vazio, semDado };
}

/** Reduz uma máscara `Lf`×`Af` a `L`×`A` pelo MÁXIMO na pegada de cada texel do destino. */
export function reduzMascara(mascara, Lf, Af, L, A) {
  const saida = new Uint8Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const y0 = Math.floor((j * Af) / A);
    const y1 = Math.max(y0 + 1, Math.ceil(((j + 1) * Af) / A));
    for (let i = 0; i < L; i += 1) {
      const x0 = Math.floor((i * Lf) / L);
      const x1 = Math.max(x0 + 1, Math.ceil(((i + 1) * Lf) / L));
      let v = 0;
      for (let y = y0; y < y1 && !v; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          if (mascara[y * Lf + x]) {
            v = 1;
            break;
          }
        }
      }
      saida[j * L + i] = v;
    }
  }
  return saida;
}

/** Dilata uma máscara `raio` texels (quadrado), com a volta da longitude e as linhas presas nos polos. */
export function dilataMascara(mascara, L, A, raio) {
  const meio = new Uint8Array(L * A);
  const conta = new Int32Array(2 * L + 1);
  for (let j = 0; j < A; j += 1) {
    const base = j * L;
    for (let s = 0; s < 2 * L; s += 1) conta[s + 1] = conta[s] + mascara[base + (s % L)];
    for (let i = 0; i < L; i += 1) {
      const a = i - raio + L;
      if (conta[Math.min(2 * L, a + 2 * raio + 1)] - conta[a] > 0) meio[base + i] = 1;
    }
  }
  const saida = new Uint8Array(L * A);
  const coluna = new Int32Array(A + 1);
  for (let i = 0; i < L; i += 1) {
    for (let j = 0; j < A; j += 1) coluna[j + 1] = coluna[j] + meio[j * L + i];
    for (let j = 0; j < A; j += 1) {
      if (coluna[Math.min(A, j + raio + 1)] - coluna[Math.max(0, j - raio)] > 0) saida[j * L + i] = 1;
    }
  }
  return saida;
}

/**
 * A GRADE REDUZIDA ÷`fator` da grade L×A: a largura é L/`fator` se der par, senão a fração
 * arredondada para baixo a múltiplo de 64 (Plutão, 5926×2963); a altura, a proporcional; cada texel
 * vai à célula que contém o centro dele (`coluna`, `linha`), e `conta` é quantos texels cada célula
 * junta. Com a cheia divisível são os blocos `fator`×`fator` de sempre.
 */
export function gradeReduzida(L, A, fator) {
  const l = L % (2 * fator) === 0 ? L / fator : 64 * Math.floor(L / fator / 64);
  const a = Math.round((A * l) / L);
  const coluna = Int32Array.from({ length: L }, (_, i) => Math.floor(((i + 0.5) * l) / L));
  const linha = Int32Array.from({ length: A }, (_, j) => Math.floor(((j + 0.5) * a) / A));
  const conta = new Int32Array(l * a);
  for (let j = 0; j < A; j += 1) for (let i = 0; i < L; i += 1) conta[linha[j] * l + coluna[i]] += 1;
  return { largura: l, altura: a, coluna, linha, conta };
}

/** Reduz à grade `g` (`gradeReduzida`): a média de `campo` onde `peso` > 0 e a fração com peso. */
function reduzEmBlocos(campo, peso, L, A, g) {
  const { largura: l, altura: a, coluna, linha, conta } = g;
  const valor = new Float32Array(l * a);
  const fracao = new Float32Array(l * a);
  for (let j = 0; j < A; j += 1) {
    const base = linha[j] * l;
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      const c = base + coluna[i];
      const p = peso ? peso[k] : 1;
      if (p > 0) {
        valor[c] += p * campo[k];
        fracao[c] += p;
      }
    }
  }
  for (let c = 0; c < l * a; c += 1) {
    valor[c] = fracao[c] > 0 ? valor[c] / fracao[c] : 0;
    fracao[c] /= conta[c];
  }
  return { valor, fracao, largura: l, altura: a };
}

/** O OU de uma máscara na grade `g` (`gradeReduzida`). */
function ouEmBlocos(mascara, L, A, g) {
  const { largura: l, altura: a, coluna, linha } = g;
  const saida = new Uint8Array(l * a);
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) if (mascara[j * L + i]) saida[linha[j] * l + coluna[i]] = 1;
  }
  return saida;
}

const naCaixa = (lat, lon, caixa) => lat >= caixa.lat[0] && lat <= caixa.lat[1] && lon >= caixa.lon[0] && lon <= caixa.lon[1];

/**
 * AS REGIÕES do mapa de cor na grade do destino (ver o cabeçalho), a partir
 * do brilho `valor` (Float32, L×A — a luminância, na cor), do `vazio` e dos
 * buracos `semDado` já no destino; `liso` (opcional) = o que o relevo alisa
 * (gelo sem crateras: Sputnik), que não é fonte nem referência da régua;
 * `corpo` = os números de `POR_CORPO`; `grade` = a meia grade
 * (`gradeReduzida`). Devolve as máscaras (Uint8), a distância ao vazio na
 * meia grade (`distanciaAoVazio`, km) e a régua do borrado (`rmsDeReferencia`:
 * DN, ou o contraste com a régua relativa).
 */
export function mascarasDaCor({ valor, vazio, semDado, liso, largura: L, altura: A, raioM, corpo, grade, registra = () => {} }) {
  const n = L * A;
  const dado = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) dado[k] = vazio[k] || semDado[k] ? 0 : 1;

  // o borrado: energia do passa-alta contra o lado nítido (em Plutão, relativa ao brilho local)
  const passaBaixa = desfocaComMascara(valor, dado, L, A, raioM, SIGMA_DO_PASSA_ALTA_KM).valor;
  const quadrado = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!dado[k]) continue;
    const h = valor[k] - passaBaixa[k];
    quadrado[k] = h * h;
  }
  const energia = desfocaComMascara(quadrado, dado, L, A, raioM, SIGMA_DA_ENERGIA_KM).valor;
  if (corpo.reguaRelativa) {
    const brilho = desfocaComMascara(valor, dado, L, A, raioM, SIGMA_DA_ENERGIA_KM).valor;
    for (let k = 0; k < n; k += 1) energia[k] /= Math.max(1, brilho[k]) ** 2;
  }
  const referencia = [];
  for (let j = 0; j < A; j += 2) {
    const lat = latitudeDaLinha(j, A) * GRAUS;
    for (let i = 0; i < L; i += 2) {
      const k = j * L + i;
      if (dado[k] && !liso?.[k] && corpo.caixasNitidas.some((c) => naCaixa(lat, longitudeDaColuna(i, L), c))) referencia.push(energia[k]);
    }
  }
  referencia.sort((a, b) => a - b);
  const energiaDeReferencia = referencia[referencia.length >> 1];
  // o riscado: a coerência do tensor de estrutura do passa-alta (na meia grade) — a cunha de 275–300°E
  // junto do terminador tem 0,84 contra 0,55 em Vulcan, 0,44 em Serenity e 0,31 em Oz Terra
  const { largura: l, altura: a, coluna, linha } = grade;
  const tensor = [new Float32Array(l * a), new Float32Array(l * a), new Float32Array(l * a)];
  const contaDoTensor = new Float32Array(l * a);
  const raioKm = raioM / 1000;
  const passoNorte = raioKm * (Math.PI / A);
  for (let j = 1; j < A - 1; j += 1) {
    const passoLeste = raioKm * ((2 * Math.PI) / L) * Math.max(Math.cos(80 * RADIANOS), Math.cos(latitudeDaLinha(j, A)));
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      const kl = j * L + ((i + 1) % L);
      const ko = j * L + ((i - 1 + L) % L);
      if (!(dado[k] && dado[kl] && dado[ko] && dado[k - L] && dado[k + L])) continue;
      const gx = (valor[kl] - passaBaixa[kl] - valor[ko] + passaBaixa[ko]) / (2 * passoLeste);
      const gy = (valor[k - L] - passaBaixa[k - L] - valor[k + L] + passaBaixa[k + L]) / (2 * passoNorte);
      const c = linha[j] * l + coluna[i];
      tensor[0][c] += gx * gx;
      tensor[1][c] += gx * gy;
      tensor[2][c] += gy * gy;
      contaDoTensor[c] += 1;
    }
  }
  for (let c = 0; c < l * a; c += 1) {
    for (const t of tensor) t[c] = contaDoTensor[c] ? t[c] / contaDoTensor[c] : 0;
    contaDoTensor[c] = contaDoTensor[c] ? 1 : 0;
  }
  const [txx, txy, tyy] = tensor.map((t) => desfocaComMascara(t, contaDoTensor, l, a, raioM, SIGMA_DA_COERENCIA_KM).valor);
  // dois indicadores: sem energia (desfocado) e sem energia OU riscado (borrado)
  const semEnergia = new Float32Array(n);
  const indicador = new Float32Array(n);
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      if (!dado[k]) continue;
      const c = linha[j] * l + coluna[i];
      const traco = txx[c] + tyy[c];
      const coerencia = traco > 0 ? Math.sqrt((txx[c] - tyy[c]) ** 2 + 4 * txy[c] * txy[c]) / traco : 0;
      if (!(energia[k] >= LIMIAR_DO_BORRADO * LIMIAR_DO_BORRADO * energiaDeReferencia)) semEnergia[k] = 1;
      if (semEnergia[k] || coerencia > LIMIAR_DA_COERENCIA) indicador[k] = 1;
    }
  }
  const borrado = new Uint8Array(n);
  const desfocado = new Uint8Array(n);
  for (const [entrada, saida] of [[indicador, borrado], [semEnergia, desfocado]]) {
    const suave = desfocaComMascara(entrada, dado, L, A, raioM, SIGMA_DO_BORRADO_KM).valor;
    for (let k = 0; k < n; k += 1) if (!vazio[k] && suave[k] > 0.5) saida[k] = 1;
  }

  // a faixa rasante, na meia grade: distância ao vazio e a fração de borrado do vizinho
  const distancia = distanciaAoVazioKm(ouEmBlocos(vazio, L, A, grade), l, a, raioM);
  const foto = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) foto[k] = vazio[k] ? 0 : 1;
  const classe = reduzEmBlocos(borrado, foto, L, A, grade);
  const beta = desfocaComMascara(classe.valor, classe.fracao, l, a, raioM, SIGMA_DA_CLASSE_DA_FAIXA_KM).valor;
  const { bom: larguraJuntoDoBom, borrado: larguraJuntoDoBorrado } = corpo.faixaRasanteKm;
  // os buracos sem dado perto do vazio entram no alvo inteiros (`buracosNoAlvoKm`; Plutão) e nunca
  // ficam com a "foto" — o preto — na zona livre
  const { buraco, componentes: buracosNoAlvo } = corpo.buracosNoAlvoKm
    ? buracosPertoDoVazio(semDado, L, A, grade, distancia, corpo.buracosNoAlvoKm)
    : { buraco: new Uint8Array(n), componentes: 0 };
  const faixa = new Uint8Array(n);
  const livre = new Uint8Array(n);
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      if (vazio[k]) continue;
      const c = linha[j] * l + coluna[i];
      const b = Number.isFinite(beta[c]) ? Math.min(1, Math.max(0, beta[c])) : 1;
      const w = larguraJuntoDoBom + (larguraJuntoDoBorrado - larguraJuntoDoBom) * b;
      if (distancia[c] < w) {
        faixa[k] = 1;
        if (distancia[c] >= w - ZONA_LIVRE_KM && !buraco[k]) livre[k] = 1;
      }
    }
  }
  // o anel em volta dos buracos do alvo (`anelDosBuracosKm`): o fotografado entra como zona livre
  if (corpo.anelDosBuracosKm && buracosNoAlvo) {
    const ateOBuraco = distanciaAoVazioKm(ouEmBlocos(buraco, L, A, grade), l, a, raioM);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        const k = j * L + i;
        if (dado[k] && ateOBuraco[linha[j] * l + coluna[i]] < corpo.anelDosBuracosKm) faixa[k] = livre[k] = 1;
      }
    }
  }
  const bom = new Uint8Array(n);
  const alvo = new Uint8Array(n);
  const conta = { vazio: 0, faixa: 0, livre: 0, borrado: 0, desfocado: 0, bom: 0, semDado: 0, liso: 0, buraco: 0 };
  for (let k = 0; k < n; k += 1) {
    bom[k] = dado[k] && !borrado[k] && !faixa[k] && !liso?.[k] ? 1 : 0;
    alvo[k] = vazio[k] || faixa[k] || buraco[k] ? 1 : 0;
    conta.vazio += vazio[k];
    conta.faixa += faixa[k];
    conta.livre += livre[k];
    conta.borrado += borrado[k];
    conta.desfocado += desfocado[k];
    conta.bom += bom[k];
    conta.semDado += semDado[k];
    conta.liso += liso?.[k] ?? 0;
    conta.buraco += buraco[k];
  }
  const porcento = Object.fromEntries(Object.entries(conta).map(([nome, v]) => [nome, +((100 * v) / n).toFixed(2)]));
  const rmsDeReferencia = Math.sqrt(energiaDeReferencia);
  const regua = corpo.reguaRelativa ? `contraste do passa-alta no lado nítido ${(100 * rmsDeReferencia).toFixed(2)} %` : `RMS do passa-alta no lado nítido ${rmsDeReferencia.toFixed(2)} DN`;
  const noAlvo = buracosNoAlvo ? `; ${buracosNoAlvo} buracos no alvo (${conta.buraco} texels)` : '';
  registra(`máscaras (% dos texels): ${JSON.stringify(porcento)}; ${regua}${noAlvo}`);
  return { vazio, semDado, borrado, desfocado, faixa, livre, bom, alvo, buraco, buracosNoAlvo, distanciaAoVazio: { km: distancia, largura: l, altura: a }, rmsDeReferencia, porcento };
}

/**
 * OS BURACOS PERTO DO VAZIO: os de `semDado` (componentes de vizinhança 8, com a volta da longitude)
 * com algum texel a até `ateKm` do vazio (`distancia`, km, na `grade`) — o buraco inteiro, para não
 * sobrar preto do outro lado de um corte. Devolve a máscara e quantos são.
 */
function buracosPertoDoVazio(semDado, L, A, grade, distancia, ateKm) {
  const n = L * A;
  const buraco = new Uint8Array(n);
  const visto = new Uint8Array(n);
  const pilha = [];
  const membros = [];
  let componentes = 0;
  for (let k0 = 0; k0 < n; k0 += 1) {
    if (!semDado[k0] || visto[k0]) continue;
    visto[k0] = 1;
    pilha.push(k0);
    membros.length = 0;
    let perto = false;
    while (pilha.length) {
      const k = pilha.pop();
      membros.push(k);
      const j = Math.floor(k / L);
      const i = k - j * L;
      if (distancia[grade.linha[j] * grade.largura + grade.coluna[i]] <= ateKm) perto = true;
      for (let jj = Math.max(0, j - 1); jj <= Math.min(A - 1, j + 1); jj += 1) {
        for (let di = -1; di <= 1; di += 1) {
          const kk = jj * L + ((i + di + L) % L);
          if (semDado[kk] && !visto[kk]) {
            visto[kk] = 1;
            pilha.push(kk);
          }
        }
      }
    }
    if (perto) {
      componentes += 1;
      for (const k of membros) buraco[k] = 1;
    }
  }
  return { buraco, componentes };
}

// ------------------------------------------------------------
// O GUIA E O TOM
// ------------------------------------------------------------

/**
 * O GUIA: g = max(0, n̂·L) na grade L×A, com n o normal.png (`Ln`×`An`, RGB,
 * n = rgb/127,5 − 1) reamostrado bilinear (com a volta) e normalizado.
 */
export function guiaDoRelevo(normais, Ln, An, L, A, sol) {
  const m = Math.hypot(...sol);
  const [lx, ly, lz] = sol.map((v) => v / m);
  const nn = Ln * An;
  const dec = new Float32Array(3 * nn);
  for (let k = 0; k < nn; k += 1) {
    const x = normais[3 * k] / 127.5 - 1;
    const y = normais[3 * k + 1] / 127.5 - 1;
    const z = normais[3 * k + 2] / 127.5 - 1;
    const r = Math.hypot(x, y, z) || 1;
    dec[3 * k] = x / r;
    dec[3 * k + 1] = y / r;
    dec[3 * k + 2] = z / r;
  }
  const guia = new Float32Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const y = ((j + 0.5) * An) / A - 0.5;
    let j0 = Math.floor(y);
    let fy = y - j0;
    if (j0 < 0) {
      j0 = 0;
      fy = 0;
    } else if (j0 > An - 2) {
      j0 = An - 2;
      fy = 1;
    }
    for (let i = 0; i < L; i += 1) {
      const x = ((i + 0.5) * Ln) / L - 0.5;
      let i0 = Math.floor(x);
      const fx = x - i0;
      if (i0 < 0) i0 += Ln;
      const i1 = i0 + 1 < Ln ? i0 + 1 : 0;
      const k00 = 3 * (j0 * Ln + i0);
      const k01 = 3 * (j0 * Ln + i1);
      const k10 = 3 * ((j0 + 1) * Ln + i0);
      const k11 = 3 * ((j0 + 1) * Ln + i1);
      const w00 = (1 - fx) * (1 - fy);
      const w01 = fx * (1 - fy);
      const w10 = (1 - fx) * fy;
      const w11 = fx * fy;
      const nx = w00 * dec[k00] + w01 * dec[k01] + w10 * dec[k10] + w11 * dec[k11];
      const ny = w00 * dec[k00 + 1] + w01 * dec[k01 + 1] + w10 * dec[k10 + 1] + w11 * dec[k11 + 1];
      const nz = w00 * dec[k00 + 2] + w01 * dec[k01 + 2] + w10 * dec[k10 + 2] + w11 * dec[k11 + 2];
      const r = Math.hypot(nx, ny, nz) || 1;
      guia[j * L + i] = Math.max(0, (nx * lx + ny * ly + nz * lz) / r);
    }
  }
  return guia;
}

/** Bilinear da grade `l`×`a` (centros de texel, com a volta) levada à grade L×A. */
function sobeBilinear(campo, l, a, L, A) {
  const saida = new Float32Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const y = ((j + 0.5) * a) / A - 0.5;
    let j0 = Math.floor(y);
    let fy = y - j0;
    if (j0 < 0) {
      j0 = 0;
      fy = 0;
    } else if (j0 > a - 2) {
      j0 = a - 2;
      fy = 1;
    }
    for (let i = 0; i < L; i += 1) {
      const x = ((i + 0.5) * l) / L - 0.5;
      let i0 = Math.floor(x);
      const fx = x - i0;
      if (i0 < 0) i0 += l;
      const i1 = i0 + 1 < l ? i0 + 1 : 0;
      saida[j * L + i] =
        (1 - fy) * ((1 - fx) * campo[j0 * l + i0] + fx * campo[j0 * l + i1]) +
        fy * ((1 - fx) * campo[(j0 + 1) * l + i0] + fx * campo[(j0 + 1) * l + i1]);
    }
  }
  return saida;
}

/**
 * O TOM (L×A): o passa-baixa de `valor` (gaussiana normalizada pela máscara
 * `dadoDoTom`; σ `SIGMA_DA_BORDA_DO_TOM_KM` junto do alvo, `sigmaKm` — o de
 * `SIGMA_DO_TOM_KM`, se não dado — longe dele) e, no `alvo`, a membrana harmônica dele presa no resto — tudo na
 * `grade` do tom (`gradeReduzida`; ~3,7 km em Caronte, 5,1 km em Plutão), que
 * sobe por bilinear.
 */
export function tomDeGrandeEscala({ valor, dadoDoTom, alvo, largura: L, altura: A, raioM, grade, sigmaKm = SIGMA_DO_TOM_KM }) {
  const r = reduzEmBlocos(valor, dadoDoTom, L, A, grade);
  const alvoR = ouEmBlocos(alvo, L, A, grade);
  const longe = desfocaComMascara(r.valor, r.fracao, r.largura, r.altura, raioM, sigmaKm).valor;
  const perto = desfocaComMascara(r.valor, r.fracao, r.largura, r.altura, raioM, SIGMA_DA_BORDA_DO_TOM_KM).valor;
  const distancia = distanciaAoVazioKm(alvoR, r.largura, r.altura, raioM);
  const preso = new Uint8Array(r.largura * r.altura);
  const campo = new Float32Array(r.largura * r.altura);
  for (let c = 0; c < campo.length; c += 1) {
    if (alvoR[c] || !Number.isFinite(longe[c])) continue;
    const t = Math.min(1, Math.max(0, (distancia[c] - BORDA_DO_TOM_KM[0]) / (BORDA_DO_TOM_KM[1] - BORDA_DO_TOM_KM[0])));
    const peso = Number.isFinite(perto[c]) ? 1 - t * t * (3 - 2 * t) : 0;
    preso[c] = 1;
    campo[c] = peso * perto[c] + (1 - peso) * longe[c];
  }
  const membrana = membranaHarmonica(campo, preso, r.largura, r.altura, raioM, SIGMA_DA_MEMBRANA_KM);
  return sobeBilinear(Float32Array.from(membrana), r.largura, r.altura, L, A);
}

// ------------------------------------------------------------
// AS FONTES
// ------------------------------------------------------------

/**
 * AS FONTES de cada unidade (a ordem de `fonte.unidades`) para retalhos de
 * `larguraKm`, na grade das fontes (`POR_CORPO`; `distanciaAoRuim` = a distância,
 * km, de cada célula ao não-`bom` nessa grade): células com o centro a meia
 * largura da borda de uma caixa `fontes` da unidade e a meia diagonal (mais
 * uma célula) longe do que não é `bom`; `extras` = caixas a mais por id de unidade
 * (`fontesExtras`). `{ celulas, caixa (a 1ª caixa que contém cada uma), tom (de
 * `tomDasCelulas`, na mesma grade, ou null), acumulado (cos lat), largura, altura,
 * areaKm2 }` por unidade, ou null.
 */
export function fontesDaCor({ distanciaAoRuim, largura: l, altura: a, fonte, raioM, larguraKm, extras = {}, tomDasCelulas = null }) {
  const raioKm = raioM / 1000;
  const kmPorGrau = raioKm * RADIANOS;
  const celulaKm = raioKm * (Math.PI / a);
  const meia = larguraKm / 2;
  const meiaDiagonal = meia * Math.SQRT2 + celulaKm;
  return Object.entries(fonte.unidades).map(([id, unidade]) => {
    const caixas = [...(unidade.fontes ?? (unidade.exemplo ? [unidade.exemplo] : [])), ...(extras[id] ?? [])];
    const celulas = [];
    const caixaDe = [];
    for (let J = 0; J < a; J += 1) {
      const lat = latitudeDaLinha(J, a) * GRAUS;
      const cosLat = Math.cos(lat * RADIANOS);
      for (let I = 0; I < l; I += 1) {
        const c = J * l + I;
        if (!(distanciaAoRuim[c] >= meiaDiagonal)) continue;
        const lon = longitudeDaColuna(I, l);
        const qual = caixas.findIndex((cx) =>
          naCaixa(lat, lon, cx) &&
          Math.min(lat - cx.lat[0], cx.lat[1] - lat) * kmPorGrau >= meia &&
          Math.min(lon - cx.lon[0], cx.lon[1] - lon) * kmPorGrau * cosLat >= meia);
        if (qual >= 0) {
          celulas.push(c);
          caixaDe.push(qual);
        }
      }
    }
    if (!celulas.length) return null;
    const acumulado = new Float64Array(celulas.length);
    let soma = 0;
    celulas.forEach((c, q) => {
      soma += Math.cos(latitudeDaLinha(Math.floor(c / l), a));
      acumulado[q] = soma;
    });
    return {
      celulas: Int32Array.from(celulas),
      caixa: Int8Array.from(caixaDe),
      tom: tomDasCelulas ? Float32Array.from(celulas, (c) => tomDasCelulas[c]) : null,
      acumulado,
      largura: l,
      altura: a,
      areaKm2: Math.round(soma * celulaKm * celulaKm),
    };
  });
}

/** O FILTRO DE TOM: o tom da fonte está a menos de um fator `fator` do tom do alvo (|ln(fonte ÷ alvo)| ≤ ln fator). */
export function dentroDoTom(tomDaFonte, tomDoAlvo, fator) {
  return Math.abs(Math.log(Math.max(1, tomDaFonte) / Math.max(1, tomDoAlvo))) <= Math.log(fator);
}

// ------------------------------------------------------------
// O RETALHO NA ESFERA
// ------------------------------------------------------------

/**
 * O PONTO DA ORIGEM do ponto `p` (esfera unitária) do retalho do `alvo`: as
 * mesmas coordenadas (x, y) no plano tangente gnomônico da `origem` — uma
 * rotação da esfera que leva o centro ao centro e o norte ao norte (sem giro
 * nem espelho). `alvo` e `origem` vêm de `planoTangente`; null no hemisfério
 * oposto ao centro do alvo.
 */
export function pontoDaOrigem(alvo, origem, p) {
  const d = p[0] * alvo.c[0] + p[1] * alvo.c[1] + p[2] * alvo.c[2];
  if (d <= 0) return null;
  const x = (p[0] * alvo.e[0] + p[1] * alvo.e[1] + p[2] * alvo.e[2]) / d;
  const y = (p[0] * alvo.n[0] + p[1] * alvo.n[1] + p[2] * alvo.n[2]) / d;
  const q = [0, 1, 2].map((i) => origem.c[i] + x * origem.e[i] + y * origem.n[i]);
  const r = Math.hypot(q[0], q[1], q[2]);
  return q.map((v) => v / r);
}

/** Bilinear de `campo` no ponto (x, y, z) da esfera unitária; com `coberto`, NaN se um dos quatro não está. Cópia de `bilinearNoPonto` (relevo-inventado.mjs, interna). */
function bilinearNoPonto(campo, largura, altura, x, y, z, coberto) {
  const u = (Math.atan2(y, x) / (2 * Math.PI) + 0.5) * largura - 0.5;
  const v = (0.5 - Math.asin(Math.max(-1, Math.min(1, z))) / Math.PI) * altura - 0.5;
  let i0 = Math.floor(u);
  const fx = u - i0;
  let j0 = Math.floor(v);
  let fy = v - j0;
  if (j0 < 0) {
    j0 = 0;
    fy = 0;
  } else if (j0 > altura - 2) {
    j0 = altura - 2;
    fy = 1;
  }
  if (i0 < 0) i0 += largura;
  const i1 = i0 + 1 < largura ? i0 + 1 : 0;
  const a = j0 * largura;
  const b = a + largura;
  if (coberto && !(coberto[a + i0] && coberto[a + i1] && coberto[b + i0] && coberto[b + i1])) return NaN;
  return (1 - fy) * ((1 - fx) * campo[a + i0] + fx * campo[a + i1]) + fy * ((1 - fx) * campo[b + i0] + fx * campo[b + i1]);
}

/** Bilinear dos dois campos entrelaçados de `dg` (detalhe, guia) no ponto (x, y, z): em `saida[0]`, `saida[1]`. */
function bilinearDuplo(dg, largura, altura, x, y, z, saida) {
  const u = (Math.atan2(y, x) / (2 * Math.PI) + 0.5) * largura - 0.5;
  const v = (0.5 - Math.asin(Math.max(-1, Math.min(1, z))) / Math.PI) * altura - 0.5;
  let i0 = Math.floor(u);
  const fx = u - i0;
  let j0 = Math.floor(v);
  let fy = v - j0;
  if (j0 < 0) {
    j0 = 0;
    fy = 0;
  } else if (j0 > altura - 2) {
    j0 = altura - 2;
    fy = 1;
  }
  if (i0 < 0) i0 += largura;
  const i1 = i0 + 1 < largura ? i0 + 1 : 0;
  const a = j0 * largura;
  const b = a + largura;
  const w00 = (1 - fx) * (1 - fy);
  const w01 = fx * (1 - fy);
  const w10 = (1 - fx) * fy;
  const w11 = fx * fy;
  const k00 = 2 * (a + i0);
  const k01 = 2 * (a + i1);
  const k10 = 2 * (b + i0);
  const k11 = 2 * (b + i1);
  saida[0] = w00 * dg[k00] + w01 * dg[k01] + w10 * dg[k10] + w11 * dg[k11];
  saida[1] = w00 * dg[k00 + 1] + w01 * dg[k01 + 1] + w10 * dg[k10 + 1] + w11 * dg[k11 + 1];
}

// ------------------------------------------------------------
// O CORTE DE ERRO MÍNIMO
// ------------------------------------------------------------

/**
 * A GEOMETRIA DO CORTE de um retalho de meia largura `meio` (texels) numa
 * grade local G×G (G = 2H + 1, centro em (H, H)): `nTheta` raios do centro;
 * no raio t, o estado r = "texels a menos de r do centro são novos", de 0 a
 * Rt + 1 (o 1º texel além do quadrado). O molde é o de `colcha`
 * (relevo-inventado.mjs).
 */
export function geometriaDoCorte(meio, H) {
  const G = 2 * H + 1;
  const nTheta = Math.ceil(2 * Math.PI * (meio * Math.SQRT2 + 1));
  const S = Math.floor(meio * Math.SQRT2) + 2;
  const Rt = new Int32Array(nTheta);
  const indice = new Int32Array(nTheta * S);
  for (let t = 0; t < nTheta; t += 1) {
    const th = (2 * Math.PI * t) / nTheta;
    const ct = Math.cos(th);
    const st = Math.sin(th);
    Rt[t] = Math.floor(meio / Math.max(Math.abs(ct), Math.abs(st)));
    for (let r = 0; r <= Rt[t] + 1; r += 1) indice[t * S + r] = (H + Math.round(r * st)) * G + H + Math.round(r * ct);
  }
  return {
    meio, H, G, nTheta, S, Rt, indice,
    custo: new Float64Array(nTheta * S),
    ponteiro: new Int8Array((nTheta + 1) * S),
    antes: new Float64Array(S),
    agora: new Float64Array(S),
    rCorte: new Float64Array(nTheta + 1),
  };
}

/**
 * O CORTE DE ERRO MÍNIMO (E&F 2001 §2.1, em curva fechada): a curva r(θ) em
 * volta do centro de menor soma de `custoDoTexel` (o erro velho − novo, por
 * texel da grade local) entre os texels que ficam velhos logo além dela. O
 * descoberto (`coberto` = 0) fica sempre dentro; o `fixo` (fora do alvo)
 * sempre fora — num raio, nada além do primeiro fixo vira novo. Programação
 * dinâmica em ângulo com passos radiais livres (Dijkstra numa coluna), como
 * em `colcha` (relevo-inventado.mjs). Escreve `geo.rCorte` (o raio em cada
 * raio, e o do raio 0 repetido no fim) e devolve o custo da curva (INF se não
 * há curva que cumpra as duas regras; aí o raio é o menor possível).
 */
export function corteDeErroMinimo(geo, custoDoTexel, coberto, fixo) {
  const { nTheta, S, Rt, indice, custo, ponteiro, rCorte } = geo;
  let livre = -1;
  for (let t = 0; t < nTheta; t += 1) {
    const R = Rt[t];
    const base = t * S;
    let rF = R + 2;
    for (let r = 0; r <= R + 1; r += 1) {
      if (fixo[indice[base + r]]) {
        rF = r;
        break;
      }
    }
    for (let r = R + 2; r < S; r += 1) custo[base + r] = INF;
    const gFora = indice[base + R + 1];
    custo[base + R + 1] = rF <= R ? INF : coberto[gFora] ? custoDoTexel[gFora] : 0;
    let todos = true;
    for (let r = R; r >= 0; r -= 1) {
      if (r > rF) {
        custo[base + r] = INF;
        continue;
      }
      const g = indice[base + r];
      if (r < rF && !coberto[g]) todos = false;
      custo[base + r] = todos ? custoDoTexel[g] : INF;
    }
    if (livre < 0 && custo[base + R] >= INF && custo[base + R + 1] === 0) livre = t;
  }
  let { antes, agora } = geo;
  const volta = (t0, inicio) => {
    for (let r = 0; r < S; r += 1) antes[r] = inicio < 0 || r === inicio ? custo[t0 * S + r] : INF;
    for (let passo = 1; passo <= nTheta; passo += 1) {
      const t = (t0 + passo) % nTheta;
      const tAntes = (t0 + passo - 1) % nTheta;
      const base = passo * S;
      for (let r = 0; r < S; r += 1) {
        let m = antes[r];
        let cod = 0;
        if (r > 0 && antes[r - 1] < m) {
          m = antes[r - 1];
          cod = 1;
        }
        if (r + 1 < S && antes[r + 1] < m) {
          m = antes[r + 1];
          cod = 2;
        }
        if (r === Rt[t] + 1 && antes[Rt[tAntes] + 1] < m) {
          m = antes[Rt[tAntes] + 1];
          cod = 5;
        }
        agora[r] = Math.min(INF, m + custo[t * S + r]);
        ponteiro[base + r] = cod;
      }
      for (let r = 1; r < S; r += 1) {
        const v = agora[r - 1] + custo[t * S + r];
        if (v < agora[r]) {
          agora[r] = v;
          ponteiro[base + r] = 3;
        }
      }
      for (let r = S - 2; r >= 0; r -= 1) {
        const v = agora[r + 1] + custo[t * S + r];
        if (v < agora[r]) {
          agora[r] = v;
          ponteiro[base + r] = 4;
        }
      }
      [antes, agora] = [agora, antes];
    }
    return antes;
  };
  const refaz = (t0, fim) => {
    let r = fim;
    for (let passo = nTheta; passo >= 1; passo -= 1) {
      const t = (t0 + passo) % nTheta;
      rCorte[t] = r;
      let cod = ponteiro[passo * S + r];
      while (cod === 3 || cod === 4) {
        r += cod === 3 ? -1 : 1;
        cod = ponteiro[passo * S + r];
      }
      const tAntes = (t0 + passo - 1) % nTheta;
      if (cod === 1) r -= 1;
      else if (cod === 2) r += 1;
      else if (cod === 5) r = Rt[tAntes] + 1;
    }
    rCorte[nTheta] = rCorte[0];
  };
  let total;
  if (livre >= 0) {
    total = volta(livre, Rt[livre] + 1)[Rt[livre] + 1];
    if (total < INF) refaz(livre, Rt[livre] + 1);
  } else {
    const fim = volta(0, -1);
    let rMin = 0;
    for (let r = 1; r < S; r += 1) if (fim[r] < fim[rMin]) rMin = r;
    total = volta(0, rMin)[rMin];
    if (total < INF) refaz(0, rMin);
  }
  geo.antes = antes;
  geo.agora = agora;
  if (total >= INF) {
    // sem curva que cumpra as duas regras: em cada raio, o menor estado possível
    for (let t = 0; t < nTheta; t += 1) {
      let r = 0;
      while (r < S - 1 && custo[t * S + r] >= INF) r += 1;
      rCorte[t] = r;
    }
    rCorte[nTheta] = rCorte[0];
    return INF;
  }
  return total;
}

/** O raio do corte (texels) no ângulo de (x, y), interpolado entre os raios. */
function raioDoCorte(geo, x, y) {
  let th = Math.atan2(y, x);
  if (th < 0) th += 2 * Math.PI;
  const ft = (th / (2 * Math.PI)) * geo.nTheta;
  const t = Math.min(geo.nTheta - 1, Math.floor(ft));
  return geo.rCorte[t] + (ft - t) * (geo.rCorte[t + 1] - geo.rCorte[t]);
}

// ------------------------------------------------------------
// A TRANSFERÊNCIA
// ------------------------------------------------------------

/**
 * UMA PASSADA DA TRANSFERÊNCIA (E&F §3): o `alvo` coberto por retalhos de
 * `larguraKm` em faixas de latitude (do topo do alvo ao polo sul, um retalho
 * no polo; o que sobrar descoberto ganha um retalho centrado nele). Cada
 * retalho: a unidade sorteada pelos pesos no centro; `CANDIDATOS` origens sorteadas nas
 * fontes dela; erro = α·(soma dos quadrados contra o já posto — a sobreposição
 * com esta passada, o resto com a anterior —, dividida pela energia dos dois
 * lados) + (1 − α)·(o mesmo para o guia centrado, no retalho inteiro); sorteio
 * entre os `MELHORES`; corte de erro mínimo contra o já posto desta passada e
 * rampa de `ESFUMADO_TEXELS`. Escreve no `campo` de cada uma das `camadas`
 * (o detalhe, copiado da spline `coef` dela; a 1ª é a que a escolha lê),
 * `coberto` e `novo` (a fração que veio dos retalhos).
 */
function passadaDaTransferencia(ctx, { larguraKm, alfa, passoDasAmostras }, fontes, anterior) {
  const { L, A, raioKm, texelKm, dg, camadas, guia, fixo, coberto, novo, pesos, sorteia, registra, filtro, tomDoAlvo } = ctx;
  const { campo } = camadas[0];
  const meio = larguraKm / 2 / texelKm;
  const H = Math.ceil(meio) + MARGEM_DO_RETALHO;
  const G = 2 * H + 1;
  const geo = geometriaDoCorte(meio, H);
  const passoRad = texelKm / raioKm;
  const passoKm = larguraKm * (1 - SOBREPOSICAO);
  const vizinhancaRad = (VIZINHANCA_SEM_REPETIR * larguraKm) / raioKm;
  const repeticaoRad = (RAIO_DE_REPETICAO * larguraKm) / raioKm;
  const raioDaCalota = Math.atan(((meio + MARGEM_DO_RETALHO + 1) * Math.SQRT2 * texelKm) / raioKm);
  const senLat = Float64Array.from({ length: A }, (_, j) => Math.sin(latitudeDaLinha(j, A)));
  const cosLat = Float64Array.from({ length: A }, (_, j) => Math.cos(latitudeDaLinha(j, A)));
  const cosLon = Float64Array.from({ length: L }, (_, i) => Math.cos(longitudeDaColuna(i, L) * RADIANOS));
  const senLon = Float64Array.from({ length: L }, (_, i) => Math.sin(longitudeDaColuna(i, L) * RADIANOS));

  // a grade local e os pontos que medem o erro
  const XL = new Float64Array(G * G);
  const YL = new Float64Array(G * G);
  const INV = new Float64Array(G * G);
  const dentro = new Uint8Array(G * G);
  const amostras = [];
  for (let b = 0; b < G; b += 1) {
    for (let a = 0; a < G; a += 1) {
      const g = b * G + a;
      XL[g] = (a - H) * passoRad;
      YL[g] = (b - H) * passoRad;
      INV[g] = 1 / Math.sqrt(1 + XL[g] * XL[g] + YL[g] * YL[g]);
      dentro[g] = Math.max(Math.abs(a - H), Math.abs(b - H)) <= meio ? 1 : 0;
      if (dentro[g] && (a - H) % passoDasAmostras === 0 && (b - H) % passoDasAmostras === 0) amostras.push(g);
    }
  }
  const nAm = amostras.length;
  const velho = new Float64Array(G * G);
  const cob = new Uint8Array(G * G);
  const fixoG = new Uint8Array(G * G);
  const custoDoTexel = new Float64Array(G * G);
  const temTextura = new Uint8Array(nAm);
  const texturaAlvo = new Float64Array(nAm);
  const guiaAlvo = new Float64Array(nAm);
  const duo = new Float64Array(2);

  const postos = [];
  const porUnidade = fontes.map(() => 0);
  const porCaixa = fontes.map(() => ({}));
  const porFator = filtro ? new Array(filtro.fatores.length + 1).fill(0) : null;
  let semTom = 0;
  let forcadas = 0;
  let semCurva = 0;
  let trocasDeUnidade = 0;
  let somaDaNota = 0;

  const sorteiaOrigem = (f) => {
    const x = sorteia() * f.acumulado[f.acumulado.length - 1];
    let lo = 0;
    let hi = f.acumulado.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (f.acumulado[m] < x) lo = m + 1;
      else hi = m;
    }
    const c = f.celulas[lo];
    const J = Math.floor(c / f.largura);
    const I = c % f.largura;
    return { lat: 90 - ((J + sorteia()) * 180) / f.altura, lon: 180 + ((I + sorteia()) * 360) / f.largura, q: lo };
  };
  const texelDoPonto = (x, y, z) => {
    const i = Math.floor((Math.atan2(y, x) / (2 * Math.PI) + 0.5) * L) % L;
    const j = Math.min(A - 1, Math.floor((0.5 - Math.asin(Math.max(-1, Math.min(1, z))) / Math.PI) * A));
    return j * L + i;
  };
  const unidadeNoCentro = (latC, lonC) => {
    const { ids, pesos: p, largura: lp, altura: ap } = pesos;
    const y = linhaDaLatitude(latC, ap);
    const x = colunaDaLongitude(lonC, lp);
    const j0 = Math.min(ap - 2, Math.max(0, Math.floor(y)));
    const fy = Math.min(1, Math.max(0, y - j0));
    const i0 = ((Math.floor(x) % lp) + lp) % lp;
    const i1 = (i0 + 1) % lp;
    const fx = x - Math.floor(x);
    const valores = ids.map((_, u) => {
      if (!fontes[u]) return 0;
      const q = p[u];
      return Math.max(0, (1 - fy) * ((1 - fx) * q[j0 * lp + i0] + fx * q[j0 * lp + i1]) + fy * ((1 - fx) * q[(j0 + 1) * lp + i0] + fx * q[(j0 + 1) * lp + i1]));
    });
    // sorteada pelos pesos (como na colcha do relevo): a troca de unidade sai salpicada ao longo de
    // ~2σ dos pesos, e não na linha reta em que o peso dominante muda (a −28° no lado de trás)
    const total = valores.reduce((s, v) => s + v, 0);
    if (!(total > 0)) {
      trocasDeUnidade += 1;
      return fontes.findIndex(Boolean);
    }
    let resto = sorteia() * total;
    for (let u = 0; u < ids.length; u += 1) {
      if (!valores[u]) continue;
      resto -= valores[u];
      if (resto <= 0) return u;
    }
    return valores.findLastIndex((v) => v > 0);
  };

  /** Põe um retalho centrado em (lat, lon); false se ele não tinha nada a cobrir. */
  const poe = (latC, lonC) => {
    const alvo = planoTangente(latC, lonC);
    const [cx, cy, cz] = alvo.c;
    const [ex, ey, ez] = alvo.e;
    const [nx, ny, nz] = alvo.n;
    let descobertos = 0;
    for (let g = 0; g < G * G; g += 1) {
      const s = INV[g];
      const px = (cx + XL[g] * ex + YL[g] * nx) * s;
      const py = (cy + XL[g] * ey + YL[g] * ny) * s;
      const pz = (cz + XL[g] * ez + YL[g] * nz) * s;
      velho[g] = bilinearNoPonto(campo, L, A, px, py, pz, coberto);
      cob[g] = Number.isNaN(velho[g]) ? 0 : 1;
      fixoG[g] = fixo[texelDoPonto(px, py, pz)];
      if (dentro[g] && !cob[g]) descobertos += 1;
    }
    if (!descobertos) return false;
    let somaGuia = 0;
    let somaGuia2 = 0;
    for (let q = 0; q < nAm; q += 1) {
      const g = amostras[q];
      const s = INV[g];
      const px = (cx + XL[g] * ex + YL[g] * nx) * s;
      const py = (cy + XL[g] * ey + YL[g] * ny) * s;
      const pz = (cz + XL[g] * ez + YL[g] * nz) * s;
      if (cob[g]) {
        temTextura[q] = 1;
        texturaAlvo[q] = velho[g];
      } else if (anterior) {
        temTextura[q] = 1;
        texturaAlvo[q] = bilinearNoPonto(anterior, L, A, px, py, pz);
      } else temTextura[q] = 0;
      guiaAlvo[q] = bilinearNoPonto(guia, L, A, px, py, pz);
      somaGuia += guiaAlvo[q];
      somaGuia2 += guiaAlvo[q] * guiaAlvo[q];
    }
    const mediaGuia = somaGuia / nAm;
    const energiaGuia = somaGuia2 - nAm * mediaGuia * mediaGuia;

    const u = unidadeNoCentro(latC, lonC);
    const f = fontes[u];
    const avalia = (base) => {
      const [bx, by, bz] = base.c;
      const [bex, bey, bez] = base.e;
      const [bnx, bny, bnz] = base.n;
      let erroT = 0;
      let energiaT = 0;
      let nT = 0;
      let erroG = 0;
      let somaG = 0;
      let somaG2 = 0;
      for (let q = 0; q < nAm; q += 1) {
        const g = amostras[q];
        const s = INV[g];
        bilinearDuplo(dg, L, A, (bx + XL[g] * bex + YL[g] * bnx) * s, (by + XL[g] * bey + YL[g] * bny) * s, (bz + XL[g] * bez + YL[g] * bnz) * s, duo);
        if (temTextura[q]) {
          const d = texturaAlvo[q] - duo[0];
          erroT += d * d;
          energiaT += texturaAlvo[q] * texturaAlvo[q] + duo[0] * duo[0];
          nT += 1;
        }
        const dGuia = guiaAlvo[q] - duo[1];
        erroG += dGuia * dGuia;
        somaG += duo[1];
        somaG2 += duo[1] * duo[1];
      }
      const mediaG = somaG / nAm;
      const centrado = erroG - nAm * (mediaGuia - mediaG) ** 2;
      const notaGuia = centrado / (energiaGuia + somaG2 - nAm * mediaG * mediaG + PESO_MINIMO);
      if (!nT) return notaGuia;
      return alfa * (erroT / (energiaT + PESO_MINIMO)) + (1 - alfa) * notaGuia;
    };
    const melhores = [];
    // AS FONTES COM TOM PARECIDO (`filtroDeTom`): só vale a origem a menos de um fator `limite` do tom do alvo
    const tomAqui = filtro ? Math.max(1, tomDoAlvo[texelDoPonto(cx, cy, cz)]) : 0;
    let limite = Infinity;
    let validos = 0;
    const candidato = (forcado) => {
      const o = sorteiaOrigem(f);
      if (filtro && !dentroDoTom(f.tom[o.q], tomAqui, limite)) return;
      const base = planoTangente(o.lat, o.lon);
      const longe = repeticaoMaisPerto(postos, alvo.c, base.c, vizinhancaRad, repeticaoRad);
      if (!forcado && longe < Infinity) return;
      validos += 1;
      melhores.push({ nota: avalia(base), longe, base, origem: o });
      if (forcado) melhores.sort((a, b) => b.longe - a.longe || a.nota - b.nota);
      else melhores.sort((a, b) => a.nota - b.nota);
      if (melhores.length > MELHORES) melhores.pop();
    };
    if (filtro) {
      // até `CANDIDATOS` válidos em `TENTATIVAS_DO_TOM` × `CANDIDATOS` sorteios; com menos de `minimo`, o fator alarga
      let nivel = 0;
      while (nivel < filtro.fatores.length) {
        limite = filtro.fatores[nivel];
        for (let q = 0; q < CANDIDATOS * TENTATIVAS_DO_TOM && validos < CANDIDATOS; q += 1) candidato(false);
        if (validos >= filtro.minimo) break;
        nivel += 1;
      }
      porFator[nivel] += 1;
      limite = filtro.fatores[filtro.fatores.length - 1];
    } else {
      for (let q = 0; q < CANDIDATOS; q += 1) candidato(false);
      for (let rodada = 1; rodada < RODADAS_DE_SORTEIO && !melhores.length; rodada += 1) {
        for (let q = 0; q < CANDIDATOS * 2 ** rodada; q += 1) candidato(false);
      }
    }
    if (!melhores.length) {
      forcadas += 1;
      for (let q = 0; q < 2 * CANDIDATOS; q += 1) candidato(true);
      if (!melhores.length) {
        // nenhuma origem nem no maior fator: o tom sai do critério
        semTom += 1;
        limite = Infinity;
        for (let q = 0; q < 2 * CANDIDATOS; q += 1) candidato(true);
      }
      const corte = melhores[0].longe * 0.9;
      const longes = melhores.filter((m) => m.longe >= corte).sort((a, b) => a.nota - b.nota);
      melhores.splice(0, melhores.length, ...longes);
    }
    const escolhido = melhores[Math.floor(sorteia() * melhores.length)];
    somaDaNota += escolhido.nota;
    const { base } = escolhido;
    const [bx, by, bz] = base.c;
    const [bex, bey, bez] = base.e;
    const [bnx, bny, bnz] = base.n;

    // o corte, contra o já posto desta passada
    let temCorte = false;
    for (let g = 0; g < G * G; g += 1) {
      if (!cob[g]) {
        custoDoTexel[g] = 0;
        continue;
      }
      const s = INV[g];
      bilinearDuplo(dg, L, A, (bx + XL[g] * bex + YL[g] * bnx) * s, (by + XL[g] * bey + YL[g] * bny) * s, (bz + XL[g] * bez + YL[g] * bnz) * s, duo);
      custoDoTexel[g] = (velho[g] - duo[0]) ** 2 + 1e-6;
      temCorte = true;
    }
    if (temCorte && corteDeErroMinimo(geo, custoDoTexel, cob, fixoG) >= INF) semCurva += 1;

    // a escrita: cada texel da calota, pela rotação, com a rampa do corte
    const fatorPlano = raioKm / texelKm;
    const linhaC = linhaDaLatitude(latC, A);
    const raioEmLinhas = (raioDaCalota / Math.PI) * A;
    const j0 = Math.max(0, Math.floor(linhaC - raioEmLinhas));
    const j1 = Math.min(A - 1, Math.ceil(linhaC + raioEmLinhas));
    const senC = Math.sin(latC * RADIANOS);
    const cosC = Math.cos(latC * RADIANOS);
    const cosR = Math.cos(raioDaCalota);
    for (let j = j0; j <= j1; j += 1) {
      let i0 = 0;
      let nI = L;
      const den = cosLat[j] * cosC;
      if (den > 1e-12) {
        const q = (cosR - senLat[j] * senC) / den;
        if (q >= 1) continue;
        if (q > -1) {
          const dLon = Math.acos(q) * GRAUS;
          i0 = Math.floor(colunaDaLongitude(lonC - dLon, L));
          nI = Math.min(L, Math.ceil((2 * dLon * L) / 360) + 2);
        }
      }
      for (let w0 = 0; w0 < nI; w0 += 1) {
        const i = (((i0 + w0) % L) + L) % L;
        const k = j * L + i;
        if (fixo[k]) continue;
        const px = cosLat[j] * cosLon[i];
        const py = cosLat[j] * senLon[i];
        const pz = senLat[j];
        const d = px * cx + py * cy + pz * cz;
        if (d <= 0) continue;
        const pe = (px * ex + py * ey + pz * ez) / d;
        const pn = (px * nx + py * ny + pz * nz) / d;
        const x = pe * fatorPlano;
        const y = pn * fatorPlano;
        const lado = Math.max(Math.abs(x), Math.abs(y));
        if (lado > meio + MARGEM_DO_RETALHO) continue;
        let w = 1;
        if (!coberto[k]) {
          if (lado > meio) continue;
          if (temCorte && Math.hypot(x, y) >= raioDoCorte(geo, x, y) + 1) continue;
        } else {
          if (!temCorte) continue;
          w = Math.min(1, Math.max(0, 0.5 + (raioDoCorte(geo, x, y) - 0.5 - Math.hypot(x, y)) / ESFUMADO_TEXELS));
          if (w <= 0) continue;
        }
        const s = 1 / Math.sqrt(1 + pe * pe + pn * pn);
        const ox = (bx + pe * bex + pn * bnx) * s;
        const oy = (by + pe * bey + pn * bny) * s;
        const oz = (bz + pe * bez + pn * bnz) * s;
        for (const camada of camadas) {
          const v = amostraNoPonto(camada.coef, L, A, ox, oy, oz);
          camada.campo[k] = coberto[k] ? w * v + (1 - w) * camada.campo[k] : v;
        }
        if (coberto[k]) novo[k] = w + (1 - w) * novo[k];
        else {
          novo[k] = 1;
          coberto[k] = 1;
        }
      }
    }
    postos.push({ alvo: alvo.c, origem: base.c });
    porUnidade[u] += 1;
    const caixa = f.caixa[escolhido.origem.q];
    porCaixa[u][caixa] = (porCaixa[u][caixa] ?? 0) + 1;
    return true;
  };

  // as faixas de latitude, do topo do descoberto ao polo sul
  let topo = -90;
  for (let j = 0; j < A && topo === -90; j += 1) {
    for (let i = 0; i < L; i += 1) {
      if (!coberto[j * L + i]) {
        topo = latitudeDaLinha(j, A) * GRAUS;
        break;
      }
    }
  }
  const kmPorGrau = raioKm * RADIANOS;
  const nFaixas = Math.ceil(((topo + 90) * kmPorGrau) / passoKm) + 1;
  let emFaixas = 0;
  for (let b = 0; b < nFaixas; b += 1) {
    const lat = topo - ((topo + 90) * b) / (nFaixas - 1);
    const quantos = b === nFaixas - 1 ? 1 : Math.max(1, Math.ceil((2 * Math.PI * raioKm * Math.cos(lat * RADIANOS)) / passoKm));
    const inicio = 360 * sorteia();
    for (let q = 0; q < quantos; q += 1) {
      const lon = inicio + (360 * q) / quantos;
      // centro fora do alvo: desce pelo meridiano até um oitavo de largura por vez, até meia largura
      let latC = lat;
      for (let passo = 0; passo <= 8; passo += 1) {
        latC = Math.max(-90, lat - (passo * larguraKm) / 16 / kmPorGrau);
        const j = Math.min(A - 1, Math.max(0, Math.round(linhaDaLatitude(latC, A))));
        const i = ((Math.round(colunaDaLongitude(lon, L)) % L) + L) % L;
        if (!fixo[j * L + i]) break;
        latC = null;
      }
      if (latC !== null && poe(latC, lon)) emFaixas += 1;
    }
  }
  // o que ficou descoberto
  let preenchimento = 0;
  let largados = 0;
  for (let k = 0; k < L * A; k += 1) {
    if (coberto[k] || fixo[k]) continue;
    const j = Math.floor(k / L);
    poe(latitudeDaLinha(j, A) * GRAUS, longitudeDaColuna(k % L, L));
    preenchimento += 1;
    if (!coberto[k]) {
      // nem o retalho centrado nele o cobriu: fica só o tom
      for (const camada of camadas) camada.campo[k] = 0;
      novo[k] = 1;
      coberto[k] = 1;
      largados += 1;
    }
  }
  const resumo = {
    larguraKm,
    alfa,
    retalhos: emFaixas,
    preenchimento,
    porUnidade,
    porCaixa,
    ...(filtro ? { fatorDoTom: Object.fromEntries([...filtro.fatores, 'abaixoDoMinimo'].map((x, q) => [x, porFator[q]])), semTom } : {}),
    trocasDeUnidade,
    repeticoesForcadas: forcadas,
    cortesSemCurva: semCurva,
    notaMedia: +(somaDaNota / Math.max(1, emFaixas + preenchimento)).toFixed(4),
    largados,
  };
  registra(`passada ${larguraKm} km, α ${alfa}: ${JSON.stringify(resumo)}`);
  return resumo;
}

// ------------------------------------------------------------
// O DETALHE MULTIPLICATIVO E O JOELHO DO BRANCO
// ------------------------------------------------------------

/**
 * O GANHO DO DETALHE MULTIPLICATIVO: o tom da luminância no alvo ÷ o da fonte (o que o retalho
 * levou), nos limites de `GANHO_DO_DETALHE`. Um só para os três canais: o matiz do retalho fica.
 */
export function ganhoDaLuminancia(tomDoAlvo, tomDaFonte) {
  return Math.min(GANHO_DO_DETALHE[1], Math.max(GANHO_DO_DETALHE[0], tomDoAlvo / Math.max(1, tomDaFonte)));
}

/**
 * O DETALHE QUE O ALVO RECEBE num texel, somado ao tom: o resíduo de albedo da colcha (`colcha` − `novo` ×
 * `escalaGrande`, o passa-baixa dela; no multiplicativo, já com o ganho) vezes `amplitudeDoAlbedo`, mais a sombra do
 * relevo do alvo (`sombra`, em DN) vezes `sombraNoAlvo` — as duas frações só no que veio dos retalhos (`novo`, de 0 a
 * 1); no que ficou do fotografado, o detalhe e a sombra dele voltam inteiros (o brilho original).
 */
export function detalheNoAlvo(colcha, escalaGrande, sombra, novo, sombraNoAlvo, amplitudeDoAlbedo) {
  return (colcha - novo * escalaGrande) * (1 - novo * (1 - amplitudeDoAlbedo)) + sombra * (1 - novo * (1 - sombraNoAlvo));
}

/**
 * O JOELHO SUAVE: acima de `inicio` x se aproxima de `inicio + folga` sem passar —
 * x₀ + f·(1 − e^(−(x − x₀)/f)): monótono, contínuo e com a derivada contínua (1) no começo, sem clipe.
 */
export function joelhoSuave(x, inicio, folga) {
  return x <= inicio ? x : inicio + folga * (1 - Math.exp((inicio - x) / folga));
}

/**
 * O JOELHO RELATIVO (`joelhoRelativo` de `POR_CORPO`): a razão brilho ÷ tom acima de `inicio` vai a
 * `inicio + folga` por `joelhoSuave`; com `escuros`, o espelho dele — abaixo de `escuros.inicio` ela vai a
 * `escuros.inicio − escuros.folga` sem passar. Devolve a razão nova (a mesma entre os dois joelhos).
 */
export function razaoNoJoelho(razao, { inicio, folga, escuros }) {
  if (razao > inicio) return joelhoSuave(razao, inicio, folga);
  if (escuros && razao < escuros.inicio) return -joelhoSuave(-razao, -escuros.inicio, escuros.folga);
  return razao;
}

/** O JOELHO DO BRANCO: o joelho suave de `INICIO_DO_JOELHO` (0,85 do fundo de escala) a 255. */
export function joelhoDoBranco(y) {
  return joelhoSuave(y, INICIO_DO_JOELHO, 255 - INICIO_DO_JOELHO);
}

/**
 * O JOELHO NA COR (`rgb`, reescrito no lugar): a luminância passa pelo joelho e os três canais
 * escalam com ela (a cor fica); se um canal ainda passa de 255 (cor saturada), ela vai para o cinza
 * de MESMA luminância só o necessário (o matiz fica, a saturação cede). Devolve 0 se nada mudou, 1
 * se o joelho comprimiu, 2 se também foi ao cinza.
 */
export function joelhoDaCor(rgb) {
  let y = LUMINANCIA[0] * rgb[0] + LUMINANCIA[1] * rgb[1] + LUMINANCIA[2] * rgb[2];
  let feito = 0;
  if (y > INICIO_DO_JOELHO) {
    const comprimido = joelhoDoBranco(y);
    for (let c = 0; c < 3; c += 1) rgb[c] *= comprimido / y;
    y = comprimido;
    feito = 1;
  }
  const maior = Math.max(rgb[0], rgb[1], rgb[2]);
  if (maior > 255) {
    const t = (255 - y) / (maior - y);
    // o mínimo só tira o arredondamento do canal maior, que a conta leva a 255
    for (let c = 0; c < 3; c += 1) rgb[c] = Math.min(255, y + t * (rgb[c] - y));
    feito = 2;
  }
  return feito;
}

// ------------------------------------------------------------
// A M2: A RESOLUÇÃO LOCAL E A MONTAGEM
// ------------------------------------------------------------

/**
 * O MAPA DE RESOLUÇÃO LOCAL da foto `valor` (L×A, mascarada por `dado`): para cada banda de
 * `BANDAS_DA_RESOLUCAO_KM`, a energia em média local de σ `SIGMA_DA_ENERGIA_DA_BANDA_KM` na `grade` reduzida (com
 * `relativa`, ÷ o brilho local ao quadrado: o contraste) e a razão do RMS dela à mediana nas células com mais de
 * metade de `nitido`. O CONTRASTE LOCAL é a razão da banda mais forte, até 1, e o limiar `LIMIAR_DA_RESOLUCAO` vai
 * vezes ele: pouco contraste com a forma do espectro do nítido não é borrado (a banda mais forte, e não só a de 32
 * km: a média de 25 km tem poucos ciclos de 16–32 km, e a razão dela sozinha oscila de 0,47 a 1,36 no nítido de um
 * campo sintético). σ_loc é a menor banda cuja razão chega ao limiar, interpolada em log entre ela e a anterior, e o
 * NÍVEL ℓ = log2(σ_loc) − 1 (0 = 2 km, a foto inteira; 5 = nenhuma banda chega); nível e contraste são suavizados
 * por `SIGMA_DA_RESOLUCAO_KM`. Devolve `{ nivel (0 onde não há dado ao alcance), contraste (1 idem) — Float32 na
 * grade —, rmsDoNitido (por banda) }`.
 */
export function mapaDeResolucao({ valor, dado, nitido, largura: L, altura: A, raioM, grade, relativa = false }) {
  const n = L * A;
  const { largura: l, altura: a } = grade;
  const nc = l * a;
  const energias = [];
  let anterior = valor;
  for (const s of BANDAS_DA_RESOLUCAO_KM) {
    const g = desfocaComMascara(valor, dado, L, A, raioM, s).valor;
    const quadrado = new Float32Array(n);
    for (let k = 0; k < n; k += 1) {
      if (!dado[k]) continue;
      const b = anterior[k] - g[k];
      quadrado[k] = b * b;
    }
    anterior = g;
    const r = reduzEmBlocos(quadrado, dado, L, A, grade);
    energias.push(desfocaComMascara(r.valor, r.fracao, l, a, raioM, SIGMA_DA_ENERGIA_DA_BANDA_KM).valor);
  }
  if (relativa) {
    const r = reduzEmBlocos(valor, dado, L, A, grade);
    const brilho = desfocaComMascara(r.valor, r.fracao, l, a, raioM, SIGMA_DA_ENERGIA_DA_BANDA_KM).valor;
    for (const e of energias) for (let c = 0; c < nc; c += 1) e[c] /= Math.max(1, brilho[c]) ** 2;
  }
  const fracaoNitida = reduzEmBlocos(nitido, null, L, A, grade).valor;
  const referencia = energias.map((e) => {
    const v = [];
    for (let c = 0; c < nc; c += 1) if (fracaoNitida[c] > 0.5 && Number.isFinite(e[c])) v.push(e[c]);
    v.sort((x, y) => x - y);
    return v[v.length >> 1];
  });
  const nb = BANDAS_DA_RESOLUCAO_KM.length;
  const bruto = new Float32Array(nc);
  const contrasteBruto = new Float32Array(nc);
  const temDado = new Uint8Array(nc);
  const razao = new Float64Array(nb);
  for (let c = 0; c < nc; c += 1) {
    if (!Number.isFinite(energias[nb - 1][c])) continue;
    temDado[c] = 1;
    for (let b = 0; b < nb; b += 1) razao[b] = Math.sqrt(Math.max(0, energias[b][c]) / referencia[b]);
    const contraste = Math.min(1, Math.max(...razao));
    contrasteBruto[c] = contraste;
    let nivel = nb;
    for (let b = 0; b < nb; b += 1) {
      if (razao[b] < LIMIAR_DA_RESOLUCAO * contraste) continue;
      nivel = b ? b - 1 + Math.min(1, Math.max(0, (LIMIAR_DA_RESOLUCAO * contraste - razao[b - 1]) / (razao[b] - razao[b - 1]))) : 0;
      break;
    }
    bruto[c] = nivel;
  }
  const nivel = desfocaComMascara(bruto, temDado, l, a, raioM, SIGMA_DA_RESOLUCAO_KM).valor;
  const contraste = desfocaComMascara(contrasteBruto, temDado, l, a, raioM, SIGMA_DA_RESOLUCAO_KM).valor;
  for (let c = 0; c < nc; c += 1) {
    if (!Number.isFinite(nivel[c])) nivel[c] = 0;
    if (!Number.isFinite(contraste[c])) contraste[c] = 1;
  }
  return { nivel, contraste, largura: l, altura: a, rmsDoNitido: referencia.map((e) => Math.sqrt(e)) };
}

/**
 * O PESO DO NÍVEL DE CORTE `q` (0 = a identidade; q ≥ 1 = a gaussiana de `BANDAS_DA_RESOLUCAO_KM[q − 1]`) no nível
 * contínuo ℓ: a interpolação linear entre os dois níveis vizinhos — contínua em ℓ, soma 1.
 */
export function pesoDoNivel(nivel, q) {
  const l = Math.min(BANDAS_DA_RESOLUCAO_KM.length, Math.max(0, nivel));
  const q0 = Math.floor(l);
  const t = l - q0;
  if (q === q0) return 1 - t;
  if (q === q0 + 1) return t;
  return 0;
}

/**
 * A MONTAGEM DA M2: resultado = passa-baixa_ℓ(foto) + passa-alta_ℓ(síntese) = síntese + passa-baixa_ℓ(foto −
 * síntese), com o passa-baixa do nível ℓ de cada texel (`nivel`, L×A) = a soma das gaussianas pelos pesos de
 * `pesoDoNivel` — onde ℓ = 0 sai a foto. As gaussianas são mascaradas por `peso` (onde há foto; a síntese só no
 * `alvo`, 0 fora dele). Devolve Float32 com o resultado nos texels do `alvo` (0 no resto).
 */
export function montagemDaFoto({ foto, sintese, nivel, alvo, peso, largura: L, altura: A, raioM }) {
  const n = L * A;
  const diferenca = new Float32Array(n);
  const saida = new Float32Array(n);
  const usados = new Uint8Array(BANDAS_DA_RESOLUCAO_KM.length + 1);
  for (let k = 0; k < n; k += 1) {
    if (alvo[k]) {
      diferenca[k] = foto[k] - sintese[k];
      saida[k] = sintese[k];
      const l = Math.min(BANDAS_DA_RESOLUCAO_KM.length, Math.max(0, nivel[k]));
      const q0 = Math.floor(l);
      usados[q0] = 1;
      if (l > q0) usados[q0 + 1] = 1;
    } else if (peso[k]) diferenca[k] = foto[k];
  }
  for (let q = 0; q < usados.length; q += 1) {
    if (!usados[q]) continue;
    const g = q ? desfocaComMascara(diferenca, peso, L, A, raioM, BANDAS_DA_RESOLUCAO_KM[q - 1]).valor : diferenca;
    for (let k = 0; k < n; k += 1) {
      if (!alvo[k]) continue;
      const w = pesoDoNivel(nivel[k], q);
      if (w) saida[k] += w * g[k];
    }
  }
  return saida;
}

/**
 * O JOELHO NA M2 (`rgb`, reescrito no lugar): o joelho relativo (`razaoNoJoelho`) na razão da luminância do resultado
 * à da FOTO (`base`, os três canais) — a montagem guarda o passa-baixa dela, e só o inventado passa do joelho —, e o
 * joelho do branco. Devolve 1 se o relativo mexeu.
 */
function joelhoNaM2(rgb, base, relativo) {
  const yb = Math.max(1, LUMINANCIA[0] * base[0] + LUMINANCIA[1] * base[1] + LUMINANCIA[2] * base[2]);
  let razao = (LUMINANCIA[0] * rgb[0] + LUMINANCIA[1] * rgb[1] + LUMINANCIA[2] * rgb[2]) / yb;
  if (relativo.escuros && razao < relativo.escuros.inicio) {
    for (let q = 0; q < 3; q += 1) rgb[q] = Math.max(0, rgb[q]);
    razao = (LUMINANCIA[0] * rgb[0] + LUMINANCIA[1] * rgb[1] + LUMINANCIA[2] * rgb[2]) / yb;
  }
  const nova = razaoNoJoelho(razao, relativo);
  let mexeu = 0;
  if (nova !== razao && razao > relativo.inicio) {
    for (let q = 0; q < 3; q += 1) rgb[q] *= nova / razao;
    mexeu = 1;
  } else if (nova !== razao) {
    const fator = Math.min(GANHO_DO_DETALHE[1], nova / Math.max(razao, PESO_MINIMO));
    const falta = nova - fator * razao;
    for (let q = 0; q < 3; q += 1) rgb[q] = fator * rgb[q] + falta * base[q];
    mexeu = 1;
  }
  joelhoDaCor(rgb);
  return mexeu;
}

// ------------------------------------------------------------
// A PORTA DE ENTRADA
// ------------------------------------------------------------

/**
 * A COR INVENTADA DE UM CORPO — a ÚNICA função que a prévia e o gerador
 * chamam. `cor` = o mapa de cor na grade da casa (Uint8Array, `canais` 1 ou
 * 3, `largura`×`altura` — a saída da redução e do giro, antes do jpg);
 * `mascaras` = `{ vazio, semDado }` no destino, ou `cru` = `{ pixels, largura,
 * altura, canais, giroGraus }` (o mosaico cru, antes do tapa-buraco, e o giro
 * que `girarMapa` aplica a ele depois) para montá-las; `normais` = `{ pixels
 * (RGB), largura, altura }` (o normal.png da casa); `fonte` = o JSON do relevo
 * do corpo; `semente` fixa. `opcoes.registra` recebe o andamento; `opcoes.variante`
 * escolhe um conjunto de `POR_CORPO.<id>.variantes` (sem ela, os números do corpo). Devolve
 * `{ cor, mascaras, chave: 'sul:1', relatorio }` — `cor` no formato da
 * entrada, igual a ela byte a byte fora do alvo. Com `opcoes.borrado` (a M2), também o lado de trás borrado:
 * a chave é `sul:1,borrado:1`, `mascaras.alvoDaM2` é o alvo dela e `resolucao` o mapa de resolução (`mapaDeResolucao`).
 */
export function inventaCorDoCorpo({ id, cor, largura: L, altura: A, canais, mascaras: dadas, cru, normais, fonte, semente, opcoes = {} }) {
  const registra = opcoes.registra ?? (() => {});
  const relogio = Date.now();
  const tempo = () => `${((Date.now() - relogio) / 1000).toFixed(1)} s`;
  const doCorpo = POR_CORPO[id];
  if (!doCorpo) throw new Error(`inventaCorDoCorpo: sem os números de ${id} (POR_CORPO).`);
  // a VARIANTE: os números dela por cima dos do corpo
  const variante = opcoes.variante ? doCorpo.variantes?.[opcoes.variante] : null;
  if (opcoes.variante && !variante) throw new Error(`inventaCorDoCorpo: ${id} não tem a variante ${opcoes.variante} (POR_CORPO).`);
  const corpo = { ...doCorpo, ...variante };
  const sigmaDoTomKm = corpo.sigmaDoTomKm ?? SIGMA_DO_TOM_KM;
  const raioM = opcoes.raioM ?? fonte.raioM ?? corpo.raioM;
  const sol = opcoes.sol ?? SOL_ASSADO[id];
  if (!sol) throw new Error(`inventaCorDoCorpo: sem o Sol assado de ${id}.`);
  const n = L * A;
  const raioKm = raioM / 1000;
  const texelKm = raioKm * (Math.PI / A);
  const grades = Object.fromEntries(Object.entries(corpo.grades).map(([nome, fator]) => [nome, gradeReduzida(L, A, fator)]));

  // os canais: cinza (os três iguais: Caronte) segue em um; a cor em três, e a escolha lê a luminância
  let cinza = true;
  for (let k = 0; k < n && cinza; k += 1) {
    for (let c = 1; c < canais; c += 1) if (cor[k * canais + c] !== cor[k * canais]) cinza = false;
  }
  if (!cinza && canais !== 3) throw new Error(`inventaCorDoCorpo: cor em ${canais} canais.`);
  const canal = (cinza ? [0] : [0, 1, 2]).map((c) => {
    const v = new Float32Array(n);
    for (let k = 0; k < n; k += 1) v[k] = cor[k * canais + c];
    return v;
  });
  const luminancia = ([r, g, b]) => {
    const y = new Float32Array(n);
    for (let k = 0; k < n; k += 1) y[k] = LUMINANCIA[0] * r[k] + LUMINANCIA[1] * g[k] + LUMINANCIA[2] * b[k];
    return y;
  };
  const valor = cinza ? canal[0] : luminancia(canal);

  // as máscaras (o cru como ele é, reduzido ao destino pelo máximo e girado como `girarMapa` gira)
  let vazio;
  let semDado;
  if (dadas) ({ vazio, semDado } = dadas);
  else {
    const fonteCru = vazioDoMosaico(cru.pixels, cru.largura, cru.altura, cru.canais);
    const noDestino = (mascara) => giraColunasDeImagem(reduzMascara(mascara, cru.largura, cru.altura, L, A), L, A, 1, cru.giroGraus ?? 0);
    vazio = dilataMascara(noDestino(fonteCru.vazio), L, A, corpo.haloDoVazioTexels);
    semDado = dilataMascara(noDestino(fonteCru.semDado), L, A, corpo.haloDosBuracosTexels);
    for (let k = 0; k < n; k += 1) if (vazio[k]) semDado[k] = 0;
  }
  // o gelo liso que o relevo alisa (Sputnik) não é fonte
  const liso = new Uint8Array(n);
  for (const alisamento of fonte.alisamentos ?? []) rasterizaPoligono(alisamento.poligono, L, A, liso);
  const m = mascarasDaCor({ valor, vazio, semDado, liso, largura: L, altura: A, raioM, corpo, grade: grades.meia, registra });
  registra(`máscaras prontas (${tempo()})`);

  // o tom (por canal): passa-baixa do fotografado que não é faixa, membrana no alvo
  const dadoDoTom = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) dadoDoTom[k] = !m.vazio[k] && !m.semDado[k] && !m.faixa[k] ? 1 : 0;
  const tons = canal.map((v) => tomDeGrandeEscala({ valor: v, dadoDoTom, alvo: m.alvo, largura: L, altura: A, raioM, grade: grades.tom, sigmaKm: sigmaDoTomKm }));
  const tom = cinza ? tons[0] : luminancia(tons);
  registra(`tom pronto (${tempo()})`);

  // o detalhe (brilho − tom; no multiplicativo, ÷ tom: ver `detalheMultiplicativo`) e o guia; a
  // SOMBRA ASSADA sai do detalhe: a parte que o sombreado do relevo explica (regressão no `bom`, na
  // banda abaixo de σ do tom) — os retalhos levam o albedo, e o alvo recebe a sombra do PRÓPRIO relevo
  // com o mesmo ganho (vezes `sombraNoAlvo`; o lado medido correlaciona 0,34 com n·L; só a escolha do
  // retalho pelo guia dá ~0,01 — medido na 1ª prévia). Sem foto: o vazio e os buracos do alvo.
  const multiplicativo = corpo.detalheMultiplicativo;
  const guia = guiaDoRelevo(normais.pixels, normais.largura, normais.altura, L, A, sol);
  const um = new Uint8Array(n).fill(1);
  const passaBaixaDoGuia = desfocaComMascara(guia, um, L, A, raioM, sigmaDoTomKm).valor;
  const sombra = Float32Array.from(guia, (g, k) => g - passaBaixaDoGuia[k]);
  const semFoto = Uint8Array.from(m.vazio, (v, k) => v | m.buraco[k]);
  const detalhe = new Float32Array(n);
  for (let k = 0; k < n; k += 1) detalhe[k] = semFoto[k] ? 0 : valor[k] - tom[k];
  if (multiplicativo) for (let k = 0; k < n; k += 1) detalhe[k] /= Math.max(1, tom[k]);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let j = 0; j < A; j += 2) {
    const w = Math.cos(latitudeDaLinha(j, A));
    for (let i = 0; i < L; i += 2) {
      const k = j * L + i;
      if (!m.bom[k]) continue;
      sxy += w * detalhe[k] * sombra[k];
      sxx += w * sombra[k] * sombra[k];
      syy += w * detalhe[k] * detalhe[k];
    }
  }
  const ganhoDaSombra = opcoes.sombreia === false ? 0 : sxy / sxx;
  const correlacaoNoBom = sxy / Math.sqrt(sxx * syy);
  for (let k = 0; k < n; k += 1) if (!semFoto[k]) detalhe[k] -= ganhoDaSombra * sombra[k];
  const unidadeDoGanho = multiplicativo ? 'do brilho' : 'DN';
  registra(`sombra assada: ganho ${ganhoDaSombra.toFixed(multiplicativo ? 3 : 1)} ${unidadeDoGanho} por unidade de n·L, correlação no bom ${correlacaoNoBom.toFixed(3)}`);
  // a sombra de cada canal, em DN: no cinza, o ganho; na cor ela é multiplicativa — a fração do brilho
  // (o ganho, no multiplicativo; na cor aditiva, o ganho ÷ tom da luminância) vezes o tom do canal
  const sombraDoCanal = multiplicativo
    ? (c, k) => ganhoDaSombra * sombra[k] * tons[c][k]
    : cinza
      ? (_, k) => ganhoDaSombra * sombra[k]
      : (c, k) => (ganhoDaSombra * sombra[k] * tons[c][k]) / Math.max(1, tom[k]);
  const dg = new Float32Array(2 * n);
  for (let k = 0; k < n; k += 1) {
    dg[2 * k] = detalhe[k];
    dg[2 * k + 1] = guia[k];
  }
  // as camadas que os retalhos copiam: a do brilho (a escolha lê); na cor e no multiplicativo, uma em
  // DN por canal (as que saem); no multiplicativo, também o tom da luminância da FONTE, que dá o ganho
  const camadas = [{ detalhe, coef: coeficientesDeSpline(detalhe, L, A), campo: new Float32Array(n) }];
  if (!cinza || multiplicativo) {
    for (const [c, v] of canal.entries()) {
      const d = new Float32Array(n);
      for (let k = 0; k < n; k += 1) if (!semFoto[k]) d[k] = v[k] - tons[c][k] - sombraDoCanal(c, k);
      camadas.push({ detalhe: d, coef: coeficientesDeSpline(d, L, A), campo: new Float32Array(n) });
    }
  }
  const saem = camadas.length > 1 ? camadas.slice(1) : camadas;
  const camadaDoTom = multiplicativo ? { detalhe: tom, coef: coeficientesDeSpline(tom, L, A), campo: new Float32Array(n) } : null;
  if (camadaDoTom) camadas.push(camadaDoTom);
  registra(`guia e spline prontos (${tempo()})`);

  // as unidades (a 4096) e as fontes
  const lp = Math.min(L, 4096);
  const ap = (A * lp) / L;
  const pesos = { ...pesosDasUnidades(fonte, lp, ap, raioM), largura: lp, altura: ap };
  const naoBom = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) naoBom[k] = m.bom[k] ? 0 : 1;
  const gf = grades.fontes;
  const distanciaAoRuim = distanciaAoVazioKm(ouEmBlocos(naoBom, L, A, gf), gf.largura, gf.altura, raioM);
  // o tom local de cada célula das fontes (`filtroDeTom`): passa-baixa da luminância do fotografado que não é faixa
  const filtro = corpo.filtroDeTom ?? null;
  let tomDasCelulas = null;
  if (filtro) {
    const r = reduzEmBlocos(valor, dadoDoTom, L, A, gf);
    tomDasCelulas = desfocaComMascara(r.valor, r.fracao, gf.largura, gf.altura, raioM, filtro.sigmaKm).valor;
  }
  const fontesPorPassada = PASSADAS.map((p) => fontesDaCor({ distanciaAoRuim, largura: gf.largura, altura: gf.altura, fonte, raioM, larguraKm: p.larguraKm, extras: corpo.fontesExtras, tomDasCelulas }));
  const resumoDasFontes = PASSADAS.map((p, q) => ({
    larguraKm: p.larguraKm,
    unidades: Object.fromEntries(pesos.ids.map((idU, u) => [idU, fontesPorPassada[q][u] ? { centros: fontesPorPassada[q][u].celulas.length, areaKm2: fontesPorPassada[q][u].areaKm2 } : null])),
  }));
  registra(`fontes: ${JSON.stringify(resumoDasFontes)} (${tempo()})`);
  fontesPorPassada.forEach((f, q) => {
    if (!f.some(Boolean)) throw new Error(`inventaCorDoCorpo: nenhuma unidade tem fonte para retalhos de ${PASSADAS[q].larguraKm} km.`);
  });

  // as passadas
  const sorteia = geradorDeSemente(semente);
  const coberto = new Uint8Array(n);
  const novo = new Float32Array(n);
  const fixo = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) fixo[k] = m.alvo[k] ? 0 : 1;
  let anterior = null;
  const passadas = [];
  for (const [q, p] of PASSADAS.entries()) {
    for (let k = 0; k < n; k += 1) {
      const velhoAqui = fixo[k] || m.livre[k];
      for (const camada of camadas) camada.campo[k] = velhoAqui ? camada.detalhe[k] : 0;
      coberto[k] = velhoAqui ? 1 : 0;
      novo[k] = 0;
    }
    const ctx = { L, A, raioKm, texelKm, dg, camadas, guia, fixo, coberto, novo, pesos, sorteia, registra, filtro, tomDoAlvo: tom };
    passadas.push(passadaDaTransferencia(ctx, p, fontesPorPassada[q], anterior));
    anterior = Float32Array.from(camadas[0].campo);
    registra(`passada ${q + 1} pronta (${tempo()})`);
  }

  // junto do vizinho DESFOCADO (sem energia; o riscado não conta), na meia grade: a distância de cada
  // texel do alvo ao de fora e a classe do de fora mais perto dão o desfoque (ver
  // `RAMPA_DO_DESFOQUE_KM`) e a mistura com o fotografado na zona livre (ver `ZONA_LIVRE_KM`)
  const gm = grades.meia;
  const { largura: l2, altura: a2 } = gm;
  const naMeia = (k) => gm.linha[Math.floor(k / L)] * l2 + gm.coluna[k % L];
  const foraDesfocado = new Uint8Array(n);
  const foraNitido = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!fixo[k]) continue;
    if (m.desfocado[k]) foraDesfocado[k] = 1;
    else foraNitido[k] = 1;
  }
  const ateDesfocado = distanciaAoVazioKm(ouEmBlocos(foraDesfocado, L, A, gm), l2, a2, raioM);
  const ateNitido = distanciaAoVazioKm(ouEmBlocos(foraNitido, L, A, gm), l2, a2, raioM);
  const alvo2 = ouEmBlocos(m.alvo, L, A, gm);
  // com a M2 o vizinho do lado de trás fica nítido: sem o desfoque de ligação
  const desfoqueKm = opcoes.borrado ? 0 : corpo.desfoqueDoBorradoKm;
  const niveisKm = [0, desfoqueKm / 4, desfoqueKm / 2, desfoqueKm];
  const desfoque = new Float32Array(l2 * a2);
  const mistura = new Float32Array(l2 * a2).fill(1);
  let comDesfoque = 0;
  let noAlvo = 0;
  for (let c = 0; c < l2 * a2; c += 1) {
    if (!alvo2[c]) continue;
    noAlvo += 1;
    const dentro = Math.min(ateDesfocado[c], ateNitido[c]);
    const t = Math.min(1, dentro / RAMPA_DO_DESFOQUE_KM);
    const x = Math.min(1, Math.max(0, (ateNitido[c] - ateDesfocado[c] + TRANSICAO_DA_CLASSE_KM) / (2 * TRANSICAO_DA_CLASSE_KM)));
    const classe = x * x * (3 - 2 * x);
    desfoque[c] = desfoqueKm * classe * (1 - t * t * (3 - 2 * t));
    const u = Math.min(1, dentro / ZONA_LIVRE_KM);
    mistura[c] = 1 - classe * (1 - u * u * (3 - 2 * u));
    if (desfoque[c] > 0.01) comDesfoque += 1;
  }
  const fora2 = new Uint8Array(l2 * a2).fill(1);
  for (let k = 0; k < n; k += 1) if (m.alvo[k]) fora2[naMeia(k)] = 0;
  registra(`desfoque junto do borrado: ${((100 * comDesfoque) / noAlvo).toFixed(1)} % do alvo (${tempo()})`);

  // A M2 — O LADO DE TRÁS BORRADO (`opcoes.borrado`; ver o cabeçalho): a resolução local da foto, o alvo, o guia e a
  // transferência de novo, com o sul já posto como vizinho fixo (a colcha dele fica nas `camadas`; a da M2 em outras)
  let m2 = null;
  if (opcoes.borrado) {
    const dadoDaFoto = new Uint8Array(n);
    for (let k = 0; k < n; k += 1) dadoDaFoto[k] = m.vazio[k] || m.semDado[k] ? 0 : 1;
    const reso = mapaDeResolucao({ valor, dado: dadoDaFoto, nitido: m.bom, largura: L, altura: A, raioM, grade: gm, relativa: true });
    const nivel = sobeBilinear(reso.nivel, l2, a2, L, A);
    registra(`M2: mapa de resolução pronto, contraste do nítido por banda ${JSON.stringify(reso.rmsDoNitido.map((v) => +v.toFixed(4)))} (${tempo()})`);
    // o alvo: o borrado fora do sul e do gelo liso (a região das passadas), e a zona livre do sul junto do lado de trás
    // (lá a foto passava ao inventado; agora passa a foto montada, com o detalhe do próprio sul) — a região inteira,
    // também o que a resolução não pede (onde σ_loc = 2 km a montagem devolve a foto): ilhas fixas no meio do alvo
    // deixam raio sem corte possível (a 1ª prévia, com o alvo só onde σ_loc > 2 km, ficou com 1986 cortes sem curva e
    // 2748 retalhos de preenchimento na 1ª passada). Os texels "sem dado" do borrado entram como foto: no lado de trás
    // de Caronte eles são o miolo de manchas escuras de verdade (a 180°E, 15°N, o brilho desce liso de 24 a 1 DN e
    // volta — fora do alvo, ficavam um borrão escuro liso no meio do detalhe, na 2ª prévia), e um buraco preto de
    // verdade segue preto (o detalhe escala com o brilho local)
    const alvoDaM2 = new Uint8Array(n);
    const regiao = new Uint8Array(n);
    const pesoDaMontagem = new Uint8Array(n);
    for (let k = 0; k < n; k += 1) {
      if (m.alvo[k]) {
        if (!m.buraco[k] && !m.vazio[k] && mistura[naMeia(k)] < 1) alvoDaM2[k] = pesoDaMontagem[k] = 1;
        continue;
      }
      if (dadoDaFoto[k]) pesoDaMontagem[k] = 1;
      if (m.borrado[k] && !liso[k]) alvoDaM2[k] = regiao[k] = pesoDaMontagem[k] = 1;
    }
    // O GUIA: o sombreado do relevo e o passa-baixa do detalhe da FOTO (brilho − tom; ÷ tom no multiplicativo) — no
    // alvo, a foto borrada no σ do lado de trás (`desfoqueDoBorradoKm`); nas fontes, a nítida no σ equivalente (√2 vezes,
    // a foto do alvo já vem desfocada dele) —, cada parte ÷ o desvio dela no `bom`
    const sigmaDoGuiaKm = corpo.desfoqueDoBorradoKm;
    const guia2 = new Float32Array(n);
    const desvios = {};
    {
      const daFoto = new Float32Array(n);
      for (let k = 0; k < n; k += 1) if (dadoDaFoto[k]) daFoto[k] = multiplicativo ? (valor[k] - tom[k]) / Math.max(1, tom[k]) : valor[k] - tom[k];
      const noAlvoDaM2 = desfocaComMascara(daFoto, dadoDaFoto, L, A, raioM, sigmaDoGuiaKm).valor;
      const naFonte = desfocaComMascara(daFoto, dadoDaFoto, L, A, raioM, Math.SQRT2 * sigmaDoGuiaKm).valor;
      const s = [0, 0, 0, 0, 0];
      for (let k = 0; k < n; k += 7) {
        if (!m.bom[k] || !Number.isFinite(naFonte[k])) continue;
        s[0] += 1;
        s[1] += guia[k];
        s[2] += guia[k] * guia[k];
        s[3] += naFonte[k];
        s[4] += naFonte[k] * naFonte[k];
      }
      desvios.relevo = Math.sqrt(Math.max(PESO_MINIMO, s[2] / s[0] - (s[1] / s[0]) ** 2));
      desvios.foto = Math.sqrt(Math.max(PESO_MINIMO, s[4] / s[0] - (s[3] / s[0]) ** 2));
      for (let k = 0; k < n; k += 1) {
        const f = alvoDaM2[k] ? noAlvoDaM2[k] : naFonte[k];
        guia2[k] = guia[k] / desvios.relevo + (dadoDaFoto[k] && Number.isFinite(f) ? f / desvios.foto : 0);
        dg[2 * k + 1] = guia2[k];
      }
    }
    let texelsDoAlvo = 0;
    let comSintese = 0;
    for (let k = 0; k < n; k += 1) {
      texelsDoAlvo += alvoDaM2[k];
      if (alvoDaM2[k] && nivel[k] > NIVEL_MINIMO_DA_SINTESE) comSintese += 1;
    }
    registra(`M2: alvo ${((100 * texelsDoAlvo) / n).toFixed(2)} % dos texels, com síntese (σ_loc > 2 km) em ${((100 * comSintese) / n).toFixed(2)} %; guia pronto (${tempo()})`);
    // as passadas: fora da região, o sul fica fixo com a colcha dele (os retalhos da M2 casam com ela na divisa), e a
    // foto, com o detalhe dela, é uma ZONA LIVRE até `ZONA_LIVRE_DA_M2_KM` da região — coberta, mas não fixa: o corte
    // passa por ela (a M2 não escreve lá, e a colcha dela é outra). Sem isso, a divisa recortada do bom deixava raio que
    // sai da região e volta a ela, sem curva possível (a 2ª prévia: 407 cortes sem curva e 477 retalhos de
    // preenchimento na 1ª passada; com 25 km, 97 e 171; com 90 km, nenhum)
    const ateARegiao = distanciaAoVazioKm(ouEmBlocos(regiao, L, A, gm), l2, a2, raioM);
    const fixo2 = new Uint8Array(n);
    const livre2 = new Uint8Array(n);
    for (let k = 0; k < n; k += 1) {
      if (regiao[k]) continue;
      if (!m.alvo[k] && ateARegiao[naMeia(k)] < ZONA_LIVRE_DA_M2_KM) livre2[k] = 1;
      else fixo2[k] = 1;
    }
    const coberto2 = new Uint8Array(n);
    const novo2 = new Float32Array(n);
    const camadas2 = camadas.map((c) => ({ detalhe: c.detalhe, coef: c.coef, campo: new Float32Array(n) }));
    let anterior2 = null;
    const passadas2 = [];
    for (const [q, p] of PASSADAS.entries()) {
      for (let i = 0; i < camadas2.length; i += 1) {
        const { campo, detalhe: d } = camadas2[i];
        const doSul = camadas[i].campo;
        for (let k = 0; k < n; k += 1) campo[k] = fixo2[k] || livre2[k] ? (m.alvo[k] ? doSul[k] : d[k]) : 0;
      }
      for (let k = 0; k < n; k += 1) coberto2[k] = fixo2[k] | livre2[k];
      novo2.fill(0);
      const ctx2 = { L, A, raioKm, texelKm, dg, camadas: camadas2, guia: guia2, fixo: fixo2, coberto: coberto2, novo: novo2, pesos, sorteia, registra, filtro, tomDoAlvo: tom };
      passadas2.push(passadaDaTransferencia(ctx2, p, fontesPorPassada[q], anterior2));
      anterior2 = Float32Array.from(camadas2[0].campo);
      registra(`M2: passada ${q + 1} pronta (${tempo()})`);
    }
    // o resumo do nível no alvo: σ_loc mediano e a fração em cada oitava
    const porOitava = new Array(BANDAS_DA_RESOLUCAO_KM.length + 1).fill(0);
    const amostra = [];
    for (let k = 0; k < n; k += 1) {
      if (!alvoDaM2[k] || m.alvo[k]) continue;
      porOitava[Math.min(BANDAS_DA_RESOLUCAO_KM.length, Math.floor(nivel[k]))] += 1;
      if (k % 13 === 0) amostra.push(nivel[k]);
    }
    amostra.sort((x, y) => x - y);
    const noBorrado = porOitava.reduce((x, y) => x + y, 0);
    m2 = {
      alvo: alvoDaM2,
      pesoDaMontagem,
      nivel,
      nivelNaGrade: reso,
      camadas: camadas2,
      novo: novo2,
      canais: null,
      relatorio: {
        alvoPorcento: +((100 * texelsDoAlvo) / n).toFixed(2),
        comSintesePorcento: +((100 * comSintese) / n).toFixed(2),
        bandasKm: BANDAS_DA_RESOLUCAO_KM,
        limiar: LIMIAR_DA_RESOLUCAO,
        contrasteDoNitidoPorBanda: reso.rmsDoNitido.map((v) => +v.toFixed(4)),
        sigmaLocMedianoKm: +(2 ** (1 + (amostra[amostra.length >> 1] ?? 0))).toFixed(2),
        porcentoDoBorradoPorSigmaLocKm: Object.fromEntries(['2-4', '4-8', '8-16', '16-32', '32-64', '64'].map((nome, q) => [nome, +((100 * porOitava[q]) / Math.max(1, noBorrado)).toFixed(1)])),
        guia: { sigmaKm: sigmaDoGuiaKm, desvioDoRelevo: +desvios.relevo.toFixed(4), desvioDaFoto: +desvios.foto.toFixed(4) },
        passadas: passadas2,
      },
    };
  }

  // O GANHO DO DETALHE (multiplicativo): o tom da luminância no alvo ÷ o da fonte, que o retalho levou
  // (`ganhoDaLuminancia`); 1 no que ficou do fotografado
  let ganhoDoDetalhe = null;
  const ganhoNoVazio = { medio: 0, noLimite: 0 };
  if (camadaDoTom) {
    ganhoDoDetalhe = new Float32Array(n).fill(1);
    let soma = 0;
    let conta = 0;
    for (let k = 0; k < n; k += 1) {
      if (!m.alvo[k] || !(novo[k] > 0)) continue;
      const g = ganhoDaLuminancia(tom[k], camadaDoTom.campo[k]);
      ganhoDoDetalhe[k] = g;
      if (!m.vazio[k]) continue;
      soma += g;
      conta += 1;
      if (g === GANHO_DO_DETALHE[0] || g === GANHO_DO_DETALHE[1]) ganhoNoVazio.noLimite += 1;
    }
    ganhoNoVazio.medio = +(soma / Math.max(1, conta)).toFixed(3);
    ganhoNoVazio.noLimite = +((100 * ganhoNoVazio.noLimite) / Math.max(1, conta)).toFixed(2);
    registra(`ganho do detalhe no vazio: médio ${ganhoNoVazio.medio}, ${ganhoNoVazio.noLimite} % no limite ${JSON.stringify(GANHO_DO_DETALHE)}`);
  }
  // a sombra do relevo do alvo: o ganho medido vezes `sombraNoAlvo` no que veio dos retalhos (novo), e
  // o ganho medido no que ficou do fotografado (devolve o brilho original)
  const fatorDaSombra = corpo.sombraNoAlvo ?? 1;
  // e o resíduo de albedo dos retalhos vezes `amplitudeDoAlbedo` (`detalheNoAlvo`)
  const amplitudeDoAlbedo = corpo.amplitudeDoAlbedo ?? 1;

  // A M2, o que vale para os canais: o ganho da luminância (multiplicativo) e a AMPLITUDE do detalhe inventado, que
  // escala com o CONTRASTE LOCAL do mapa de resolução (o espectro do nítido na escala do da foto: o norte de Plutão,
  // resolvido e de pouco contraste, não ganha o grão de Cthulhu) e com o BRILHO LOCAL (passa-baixa de σ
  // `desfoqueDoBorradoKm` ÷ o tom, de 0 a `GANHO_DO_DETALHE[1]`) — o sombreado e o albedo multiplicam, e uma mancha
  // escura menor que o tom não recebe o detalhe em DN do claro (na 2ª prévia de Caronte, o detalhe aditivo saturou
  // 0,27 % do alvo no preto, contra 0,004 % no mapa de hoje). A montagem é canal a canal, abaixo.
  let ganho2 = null;
  let escalaLocal = null;
  if (m2) {
    const camadaDoTom2 = camadaDoTom ? m2.camadas[camadas.indexOf(camadaDoTom)] : null;
    if (camadaDoTom2) {
      ganho2 = new Float32Array(n).fill(1);
      for (let k = 0; k < n; k += 1) if (m2.alvo[k] && m2.novo[k] > 0) ganho2[k] = ganhoDaLuminancia(tom[k], camadaDoTom2.campo[k]);
    }
    const brilhoLocal = desfocaComMascara(valor, m2.pesoDaMontagem, L, A, raioM, corpo.desfoqueDoBorradoKm).valor;
    escalaLocal = new Float32Array(n);
    for (let k = 0; k < n; k += 1) {
      if (!m2.alvo[k]) continue;
      const brilho = Math.min(GANHO_DO_DETALHE[1], Math.max(0, brilhoLocal[k] / Math.max(1, tom[k])));
      escalaLocal[k] = brilho * m2.nivelNaGrade.contraste[naMeia(k)];
    }
    m2.canais = [];
  }

  // canal a canal: o tom no lugar da escala grande da colcha, o desfoque, a mistura e a costura
  const saida = Uint8Array.from(cor);
  const degrausNaBorda = [];
  const finais = [];
  for (const [c, { campo }] of saem.entries()) {
    // resultado = colcha − passa-baixa(colcha) + tom, com a sombra do relevo do alvo de volta (no que
    // ficou do fotografado ela devolve o brilho original); no multiplicativo, a colcha já com o ganho
    const colcha = ganhoDoDetalhe ? Float32Array.from(campo, (v, k) => ganhoDoDetalhe[k] * v) : campo;
    const r = reduzEmBlocos(colcha, novo, L, A, grades.tom);
    const passaBaixaDaColcha = desfocaComMascara(r.valor, r.fracao, r.largura, r.altura, raioM, SIGMA_DA_COLCHA_KM).valor;
    for (let q = 0; q < passaBaixaDaColcha.length; q += 1) if (!Number.isFinite(passaBaixaDaColcha[q])) passaBaixaDaColcha[q] = 0;
    const escalaGrande = sobeBilinear(passaBaixaDaColcha, r.largura, r.altura, L, A);
    const total = new Float32Array(n);
    for (let k = 0; k < n; k += 1) total[k] = detalheNoAlvo(colcha[k], escalaGrande[k], sombraDoCanal(c, k), novo[k], fatorDaSombra, amplitudeDoAlbedo);
    // A MONTAGEM DA M2 deste canal (`montagemDaFoto`): a síntese é o detalhe da colcha da M2 (`detalheNoAlvo`, com o
    // ganho no multiplicativo e a amplitude acima, sem a escala grande — a montagem tira tudo acima do corte) e, na
    // zona livre do sul, o detalhe do próprio sul (`total`): a mistura com a foto montada só troca o passa-baixa, e o
    // detalhe fino segue o mesmo (na 4ª prévia, com a colcha da M2 ali, a mistura de duas texturas baixava o RMS do
    // passa-alta a 15 contra 17–20 em volta; e sem a escala grande do sul a foto montada saía ~2 DN mais escura na
    // borda, e a costura levava o sul todo junto)
    let montada = null;
    if (m2) {
      const campo2 = m2.camadas[camadas.indexOf(saem[c])].campo;
      const sintese = new Float32Array(n);
      for (let k = 0; k < n; k += 1) {
        if (!m2.alvo[k]) continue;
        sintese[k] = m.alvo[k] ? total[k] : escalaLocal[k] * detalheNoAlvo(ganho2 ? ganho2[k] * campo2[k] : campo2[k], 0, sombraDoCanal(c, k), m2.novo[k], fatorDaSombra, amplitudeDoAlbedo);
      }
      // sem a média local (o dobro da maior banda): o detalhe do sul e o da M2 não têm a mesma, e o passa-baixa da
      // montagem, que junta os dois na divisa, punha a diferença na foto montada (na 7ª prévia, o sul de Caronte
      // saiu 1,2 DN mais claro que o da M1, pela costura)
      const media = desfocaComMascara(sintese, m2.alvo, L, A, raioM, 2 * BANDAS_DA_RESOLUCAO_KM[BANDAS_DA_RESOLUCAO_KM.length - 1]).valor;
      for (let k = 0; k < n; k += 1) if (m2.alvo[k]) sintese[k] -= media[k];
      montada = montagemDaFoto({ foto: canal[c], sintese, nivel: m2.nivel, alvo: m2.alvo, peso: m2.pesoDaMontagem, largura: L, altura: A, raioM });
      m2.canais.push(montada);
    }
    const niveis = niveisKm.map((s) => (s ? desfocaComMascara(total, um, L, A, raioM, s).valor : total));
    const resultado = Float32Array.from(canal[c]);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        const k = j * L + i;
        if (!m.alvo[k]) continue;
        const naMeiaGrade = gm.linha[j] * l2 + gm.coluna[i];
        const s = desfoque[naMeiaGrade];
        let d = total[k];
        if (s > 0.01) {
          let q = 1;
          while (q < niveisKm.length - 1 && niveisKm[q] < s) q += 1;
          const s0 = niveisKm[q - 1];
          const s1 = niveisKm[q];
          const w = Math.min(1, (s - s0) / (s1 - s0));
          d = (1 - w) * niveis[q - 1][k] + w * niveis[q][k];
        }
        // na zona livre junto do desfocado, o fotografado de verdade passa ao inventado sem corte (no
        // buraco não há foto)
        const f = m.buraco[k] ? 1 : mistura[naMeiaGrade];
        // (com a M2, a foto montada)
        resultado[k] = f * (tons[c][k] + d) + (1 - f) * (montada && m2.alvo[k] ? montada[k] : canal[c][k]);
      }
    }

    // A COSTURA FINAL (Pérez, Gangnet & Blake 2003, "Poisson Image Editing", só no degrau médio). A
    // borda do alvo é a borda de fora da faixa, que tem foto: o degrau é o quanto o resultado se
    // afasta do fotografado nos texels do alvo que encostam no de fora, em média ao longo da borda (σ
    // `SIGMA_DO_DEGRAU_KM`, na meia grade) — sem o viés de gradiente das médias de um lado só (a 5ª
    // prévia mediu assim e PÔS 12 DN no flanco de uma mancha escura a 57°E). Ele vira a condição de
    // borda de uma membrana, somada ao alvo: o resultado casa com a foto na borda e a correção decai
    // para dentro sem desenhar nada.
    const somaDoDegrau = new Float32Array(l2 * a2);
    const naBorda = new Float32Array(l2 * a2);
    for (let j = 1; j < A - 1; j += 1) {
      for (let i = 0; i < L; i += 1) {
        const k = j * L + i;
        if (!m.alvo[k] || m.semDado[k] || m.vazio[k]) continue;
        const encosta = !m.alvo[k - L] || !m.alvo[k + L] || !m.alvo[j * L + ((i + 1) % L)] || !m.alvo[j * L + ((i - 1 + L) % L)];
        if (!encosta) continue;
        const q = gm.linha[j] * l2 + gm.coluna[i];
        somaDoDegrau[q] += canal[c][k] - resultado[k];
        naBorda[q] += 1;
      }
    }
    let degrauMedio = 0;
    let celulasDaBorda = 0;
    for (let q = 0; q < l2 * a2; q += 1) {
      if (!naBorda[q]) continue;
      somaDoDegrau[q] /= naBorda[q];
      naBorda[q] = 1;
      degrauMedio += Math.abs(somaDoDegrau[q]);
      celulasDaBorda += 1;
    }
    const degrauSuave = desfocaComMascara(somaDoDegrau, naBorda, l2, a2, raioM, SIGMA_DO_DEGRAU_KM).valor;
    const degrau = new Float32Array(l2 * a2);
    for (let q = 0; q < l2 * a2; q += 1) if (fora2[q] && Number.isFinite(degrauSuave[q])) degrau[q] = degrauSuave[q];
    const correcao = sobeBilinear(Float32Array.from(membranaHarmonica(degrau, fora2, l2, a2, raioM, SIGMA_DA_MEMBRANA_KM)), l2, a2, L, A);
    degrausNaBorda.push(+(degrauMedio / Math.max(1, celulasDaBorda)).toFixed(2));
    for (let k = 0; k < n; k += 1) {
      if (!m.alvo[k]) continue;
      if (multiplicativo) {
        resultado[k] += correcao[k];
        continue;
      }
      const v = Math.min(255, Math.max(0, Math.round(resultado[k] + correcao[k])));
      if (cinza) for (let q = 0; q < canais; q += 1) saida[k * canais + q] = v;
      else saida[k * canais + c] = v;
    }
    if (multiplicativo) finais.push(resultado);
    // a M2 fora do sul (a zona livre já entrou na mistura acima); no multiplicativo, depois dos joelhos
    if (montada && !multiplicativo) {
      for (let k = 0; k < n; k += 1) {
        if (!m2.alvo[k] || m.alvo[k]) continue;
        const v = Math.min(255, Math.max(0, Math.round(montada[k])));
        if (cinza) for (let q = 0; q < canais; q += 1) saida[k * canais + q] = v;
        else saida[k * canais + c] = v;
      }
    }
    registra(`canal ${cinza ? 'cinza' : 'RGB'[c]}: costura final, |foto − resultado| médio na borda do alvo ${degrausNaBorda[c].toFixed(2)} DN (${tempo()})`);
  }

  // O JOELHO DO BRANCO (multiplicativo): o detalhe com ganho passa do fundo de escala no gelo claro
  // das fontes escuras; a luminância vai ao branco pelo joelho, sem clipe, e a cor fica (`joelhoDaCor`)
  const joelho = { comprimidos: 0, aoCinza: 0, abaixoDeZero: 0, relativos: 0, relativosEscuros: 0 };
  const relativo = corpo.joelhoRelativo;
  if (multiplicativo) {
    const rgb = [0, 0, 0];
    for (let k = 0; k < n; k += 1) {
      if (!m.alvo[k]) continue;
      if (cinza) {
        const v = Math.min(255, Math.max(0, Math.round(joelhoDoBranco(finais[0][k]))));
        for (let q = 0; q < canais; q += 1) saida[k * canais + q] = v;
        continue;
      }
      for (let q = 0; q < 3; q += 1) rgb[q] = finais[q][k];
      // O JOELHO RELATIVO (`joelhoRelativo`, `razaoNoJoelho`): o claro do que veio dos retalhos (novo) acima de
      // `inicio` vezes o tom vai a `inicio + folga` vezes ele, os três canais escalados juntos (a cor fica). Com
      // `escuros`, o escuro abaixo de `escuros.inicio` vai ao espelho: os canais abaixo de zero (que a saída
      // cortaria) vão a zero, a razão é a do que sobra, e os três canais sobem juntos até o limite do ganho
      // (`GANHO_DO_DETALHE`); o que ainda faltar vem na cor do tom — o quase preto não tem matiz que se escale.
      let razao = (LUMINANCIA[0] * rgb[0] + LUMINANCIA[1] * rgb[1] + LUMINANCIA[2] * rgb[2]) / Math.max(1, tom[k]);
      if (relativo?.escuros && razao < relativo.escuros.inicio && novo[k] > 0) {
        for (let q = 0; q < 3; q += 1) rgb[q] = Math.max(0, rgb[q]);
        razao = (LUMINANCIA[0] * rgb[0] + LUMINANCIA[1] * rgb[1] + LUMINANCIA[2] * rgb[2]) / Math.max(1, tom[k]);
      }
      const nova = relativo && novo[k] > 0 ? razaoNoJoelho(razao, relativo) : razao;
      if (nova !== razao && razao > relativo.inicio) {
        const escala = 1 + novo[k] * (nova / razao - 1);
        for (let q = 0; q < 3; q += 1) rgb[q] *= escala;
        joelho.relativos += 1;
      } else if (nova !== razao) {
        const fator = Math.min(GANHO_DO_DETALHE[1], nova / Math.max(razao, PESO_MINIMO));
        const falta = nova - fator * razao;
        for (let q = 0; q < 3; q += 1) rgb[q] += novo[k] * ((fator - 1) * rgb[q] + falta * tons[q][k]);
        joelho.relativosEscuros += 1;
      }
      const feito = joelhoDaCor(rgb);
      if (feito) joelho.comprimidos += 1;
      if (feito === 2) joelho.aoCinza += 1;
      if (Math.min(rgb[0], rgb[1], rgb[2]) < -0.5) joelho.abaixoDeZero += 1;
      for (let q = 0; q < 3; q += 1) saida[k * canais + q] = Math.min(255, Math.max(0, Math.round(rgb[q])));
    }
    registra(`joelho do branco: ${JSON.stringify(joelho)} texels do alvo`);
  }
  // a M2 fora do sul no multiplicativo: o joelho relativo à FOTO (`joelhoNaM2`; na zona livre valeu o do sul, acima)
  if (m2 && multiplicativo) {
    let noJoelho = 0;
    const rgb = [0, 0, 0];
    const base = [0, 0, 0];
    for (let k = 0; k < n; k += 1) {
      if (!m2.alvo[k] || m.alvo[k]) continue;
      if (cinza) {
        const v = Math.min(255, Math.max(0, Math.round(m2.nivel[k] > 0 ? joelhoDoBranco(m2.canais[0][k]) : m2.canais[0][k])));
        for (let q = 0; q < canais; q += 1) saida[k * canais + q] = v;
        continue;
      }
      for (let q = 0; q < 3; q += 1) {
        rgb[q] = m2.canais[q][k];
        base[q] = canal[q][k];
      }
      if (m2.nivel[k] > 0) {
        if (corpo.joelhoRelativo) noJoelho += joelhoNaM2(rgb, base, corpo.joelhoRelativo);
        else joelhoDaCor(rgb);
      }
      for (let q = 0; q < 3; q += 1) saida[k * canais + q] = Math.min(255, Math.max(0, Math.round(rgb[q])));
    }
    m2.relatorio.joelhoRelativoTexels = noJoelho;
  }
  if (m2) registra(`M2: montagem pronta${multiplicativo ? `, joelho relativo em ${m2.relatorio.joelhoRelativoTexels} texels` : ''} (${tempo()})`);

  let mudados = 0;
  for (let k = 0; k < n; k += 1) {
    if (!m.alvo[k] && !m2?.alvo[k]) continue;
    for (let q = 0; q < canais; q += 1) {
      if (saida[k * canais + q] !== cor[k * canais + q]) {
        mudados += 1;
        break;
      }
    }
  }
  registra(`pronto: ${mudados} texels mudados, todos no alvo (${tempo()})`);
  m.alvoDaM2 = m2?.alvo ?? null;
  return {
    cor: saida,
    mascaras: m,
    chave: m2 ? 'sul:1,borrado:1' : 'sul:1',
    resolucao: m2 ? m2.nivelNaGrade : null,
    relatorio: {
      id,
      variante: opcoes.variante ?? null,
      semente,
      largura: L,
      altura: A,
      canais: cinza ? 1 : 3,
      texelKm: +texelKm.toFixed(4),
      grades: Object.fromEntries(Object.entries(grades).map(([nome, g]) => [nome, `${g.largura}x${g.altura}`])),
      mascaras: m.porcento,
      reguaDoBorrado: corpo.reguaRelativa ? 'contraste (RMS ÷ brilho local)' : 'RMS em DN',
      rmsDoPassaAltaNitido: +m.rmsDeReferencia.toFixed(corpo.reguaRelativa ? 4 : 2),
      haloDoVazioTexels: corpo.haloDoVazioTexels,
      faixaRasanteKm: corpo.faixaRasanteKm,
      zonaLivreKm: ZONA_LIVRE_KM,
      sol,
      detalheMultiplicativo: multiplicativo,
      ...(multiplicativo ? { ganhoDoDetalhe: { limites: GANHO_DO_DETALHE, ...ganhoNoVazio }, joelho: { inicioDN: INICIO_DO_JOELHO, relativo, ...joelho } } : {}),
      ...(filtro ? { filtroDeTom: filtro, fontesExtras: corpo.fontesExtras ?? null } : {}),
      anelDosBuracosKm: corpo.anelDosBuracosKm ?? 0,
      buracosNoAlvo: { buracos: m.buracosNoAlvo, ateKm: corpo.buracosNoAlvoKm ?? 0 },
      sombraAssada: { ganho: +ganhoDaSombra.toFixed(multiplicativo ? 4 : 2), unidade: unidadeDoGanho, correlacaoNoBom: +correlacaoNoBom.toFixed(3), fracaoNoAlvo: fatorDaSombra },
      amplitudeDoAlbedo,
      tom: { sigmaKm: sigmaDoTomKm, sigmaDaColchaKm: SIGMA_DA_COLCHA_KM },
      desfoqueJuntoDoBorrado: { sigmaKm: desfoqueKm, rampaKm: RAMPA_DO_DESFOQUE_KM, porcentoDoAlvo: +((100 * comDesfoque) / noAlvo).toFixed(1) },
      degrauNaBordaDoAlvoDN: degrausNaBorda,
      fontes: resumoDasFontes,
      passadas,
      m2: m2?.relatorio ?? null,
      texelsMudados: mudados,
      tempoS: +((Date.now() - relogio) / 1000).toFixed(1),
    },
  };
}
