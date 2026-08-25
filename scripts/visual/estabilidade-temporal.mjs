// ============================================================
// MB1 — O JUIZ DE ESTABILIDADE TEMPORAL (LEI-DA-ESTRELA §5.17, §5.20).
//
//   node scripts/visual/estabilidade-temporal.mjs                 # a corrida inteira
//   node scripts/visual/estabilidade-temporal.mjs pan orbita      # só estas famílias
//   PNGS=1 node scripts/visual/estabilidade-temporal.mjs pan      # guarda os retratos
//   JANELA=1128x1080 node scripts/visual/estabilidade-temporal.mjs # (padrão)
//
// A JANELA É O QUADRO EXATO, e a altura dela NÃO é gosto: 1080 é a altura em
// que a PSF da casa vale os 0,85 px que a aritmética de fase deste arquivo
// supõe (`fatorDeFase`). Rodar mais baixo encolhe a PSF do app e desqualifica
// a régua de identidade — o veredito passa a dizer a soleira que sobrou.
//
// POR QUE ELE EXISTE. A §5.17 é a única cláusula da Lei que nenhuma régua da
// casa mede: "nenhum campo procedural, nenhuma PSF, nenhum crossfade e nenhum
// clarão pode ferver ou cintilar quando a câmera avança frações de por cento".
// O `ab-identidade` responde "mudou?" entre duas sessões; o `luz-do-quadro`
// mede um quadro PARADO; o `voo-ida-e-volta` amostra 34 degraus DISTANTES e é
// cego a cintilação por construção. Sem MB1, "não ferve" é opinião — e o §5.20
// ("proibido re-semear") não tem juiz nenhum: hoje nada na casa detecta uma
// fonte que troca de identidade ao trocar de representação.
//
// O QUE ELE FAZ, e por que não é um juiz de pixel cru. Comparar quadros
// consecutivos pixel a pixel MISTURA fluxo legítimo com fervura: a imagem
// *deve* mudar quando a câmera anda. Então MB1 compara **depois da
// reprojeção** — o quadro anterior transportado para a pose atual — e mede o
// que SOBRA. A reprojeção é exata porque a câmera é conhecida dos dois lados
// (posição, orientação e fov lidos do `__director` a cada passo):
//
//   · fontes no INFINITO (estrelas, galáxia, poeira) — basta a rotação mais o
//     fov: a homografia leva a direção do pixel de um quadro ao outro;
//   · corpos PRÓXIMOS de profundidade conhecida (o Sol na origem, a Terra no
//     `centroPc` que ela publica, a estrela nomeada no catálogo) — a posição
//     3D é projetada nas duas poses e a predição é exata.
//
// AS DUAS RÉGUAS, que são as duas que a §5.17 nomeia:
//
//   resíduo por pixel — média de |ΔY| entre o quadro e o anterior REPROJETADO,
//     sobre um borrão 3×3. O borrão é o preço declarado da reamostragem
//     bilinear: sem ele a régua mediria o próprio filtro do harness, não a
//     imagem. Publicado também em p99 (onde olhar).
//   energia em banda alta — |E(quadro) − E(anterior)| relativa, com E = média
//     de |passa-alta 3×3|. É ESCALAR e por isso imune a desregistro
//     sub-pixel: fervura muda a energia fina, um deslocamento de meio pixel
//     não muda.
//
// O PISO, e é ele que torna o veredito honesto. O relógio ANDA (é o requisito:
// nada de `?shot=`, que congela `time` em zero). Granulação, coroa e nebulosa
// mudam sozinhas entre dois retratos, e isso não é defeito. Então cada família
// MEDE o seu piso: dois retratos na MESMA pose, com o mesmo intervalo de
// quadros dos passos, nas duas pontas do percurso — e o piso da família é o
// MAIOR dos dois. O que se julga é o EXCESSO que o movimento acrescenta, que é
// exatamente o que a cláusula proíbe. O piso é publicado, nunca julgado: um
// piso grande é onde-olhar, não reprovação.
//
// A IDENTIDADE (§5.20), que é a outra metade e não depende de pixel nenhum.
// Cada quadro tem as suas FONTES (componentes conexas acima de um limiar, com
// pico e centroide). A fonte do quadro anterior é PREVISTA no quadro atual
// pela reprojeção; se o centroide medido cair a mais de `TOLERANCIA_SALTO_PX`
// da predição, a fonte se moveu sem motivo físico — é re-semeadura, e reprova
// no passo em que aconteceu. Fonte brilhante, bem dentro do quadro, que
// simplesmente SOME também reprova. É este teste que atravessa as fronteiras
// de promoção (ponto→corpo do Sol; a cessão corpo↔ponto da Terra), onde a
// §5.20 diz que a estrela que era ponto e vira corpo é A MESMA estrela.
//
// PERSISTÊNCIA: um corpo que sai de quadro e volta não recomeça o relógio. A
// família `pan` dá meia-volta e retorna à pose inicial; as fontes que saíram e
// voltaram têm de estar onde estavam, dentro da mesma tolerância. Fase que se
// re-semeia na reentrada aparece aqui.
//
// A PARALAXE É DERIVADA, NÃO CHUTADA. A reprojeção do campo supõe distância
// infinita; um passo de translação Δ desloca uma estrela real a D pc em Δ/D
// radianos. O juiz calcula esse teto com D = 1,30 pc (Proxima, a mais próxima
// que existe) e o SOMA à tolerância de salto. Onde o teto passa de
// `PARALAXE_CEGA_PX`, o resíduo por pixel deixa de ser julgado e a família diz
// isso na cara — é o caso da aproximação a uma estrela nomeada, em que só a
// própria estrela-alvo (profundidade conhecida) é julgada.
//
// O PASSO É DETERMINÍSTICO. Nada de tempo de parede: a câmera anda por
// `__director.placeCamera` (o mesmo método dos deep-links) e o fov por
// `engine.camera.fov`, e entre dois retratos o harness espera um número FIXO
// de quadros (`QUADROS_ENTRE`), contados dentro da página. Duas corridas
// pisam nas mesmas poses.
//
// SEM `?shot=`, E O HUD SAI POR CSS. `?shot=` congela o relógio (`const time =
// this.shotMode ? 0 : rawTime`) e é exatamente o que MB1 não pode ter. Mas o
// HUD contamina o retrato — e a capa de abertura (`cv-veil`) cobre a cena por
// alguns segundos depois de a prontidão fechar. O harness injeta a MESMA regra
// do `.bare-mode` (`> *:not(.scene-canvas)`) que o `?shot=2` usa, e nada mais:
// a cena desenha igual, o relógio anda.
//
// AS OITO FAMÍLIAS, 87 passos. `aproxSol` (300 → 6 UA, translação pura: o campo
// fica parado e a reprojeção é quase a identidade — o caso mais limpo);
// `fronteiraSol` (a banda do gate ponto→corpo, 4 px arma e 2 px desarma, LIDA da
// régua do próprio app e não digitada); `reversao` (a MESMA escada de volta, na
// MESMA sessão, que é onde a histerese aparece); `pan` (rotação pura a 40 UA,
// com a volta ao ponto de partida — a persistência); `orbita` (translação e
// rotação juntas); `fov`; `aproxEstrela` (Sirius); `fronteiraTerra` (a cessão
// corpo↔ponto, `cessaoPorDominancia`). O passo de cada família move a imagem uns
// 4 px — a escala de um quadro de voo real.
//
// QUEM NÃO É JULGADO, e cada regra tem a sua medida ao lado da constante:
// fonte fraca demais para sobreviver à fase da grade (`LIMIAR_JULGADA`); fonte
// cortada pela borda (`MARGEM_DA_BORDA_PX` — o recorte puxa o centroide); duas
// âncoras na mesma mancha (bloco fundido não tem identidade); fonte do CAMPO
// que mudou de brilho além do que a grade explica (mudou de forma, não de
// lugar — mas numa ÂNCORA a acusação continua, porque é na promoção que o
// brilho muda de propósito e a posição não pode); e o interior do clarão de um
// corpo próximo, que sai do resíduo por pixel e é julgado só por identidade.
//
// AS POSES SÃO DETERMINÍSTICAS; A FASE DO RELÓGIO NÃO É — e quem lê o veredito
// tem de saber. Duas corridas pisam nas MESMAS poses, mas o Sol está num
// instante diferente da granulação e o número de quadros que cabe entre dois
// retratos depende da máquina. Os resíduos variam nas casas decimais e um
// achado NO FIO da tolerância aparece numa corrida e não na outra. Achado que
// importa se REPETE: é assim que a linha de base de 22/08 foi separada do
// ruído — o que entrou no item 70 das PENDENCIAS repetiu em corridas
// sucessivas, com a mesma assinatura e no mesmo passo.
//
// CUSTO: ~4 min a corrida inteira, ~0,4 min por família — medido nesta máquina
// em 25/08, com o dev server no ar e o quadro de 1128×1080 (eram 1,8 min no
// quadro de 613 px que não servia). O censo está em docs/NORTE.md.
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { abrirSessao, APP_PADRAO, dorme } from './chrome.mjs';

const UA_POR_PC = 206264.80624548031;

// ------------------------------------------------------------
// AS TOLERÂNCIAS DECLARADAS (§5.17 pede tolerância declarada, e é aqui)
// ------------------------------------------------------------

/** Excesso de resíduo por pixel, SOBRE O PISO da família, em luminância 0..1.
 *  Dois degraus de 8 bits (2/255) de erro MÉDIO no quadro inteiro: um degrau é
 *  quantização pura e ninguém vê; dois de média já são cintilação visível numa
 *  panorâmica. O número é do formato de saída, não de calibração. */
export const EXCESSO_RESIDUO = 2 / 255;

/** Excesso de energia em banda alta, SOBRE O PISO, em fração relativa. 15% de
 *  variação da energia fina entre dois quadros consecutivos é o limite do que
 *  a reamostragem honesta explica; acima disso a imagem está trocando de
 *  detalhe, que é o nome técnico de ferver. */
export const EXCESSO_BANDA_ALTA = 0.15;

/** Salto máximo de uma fonte, em px, contra a posição REPROJETADA. Um pixel: o
 *  centroide de uma PSF amostrada numa grade se localiza bem melhor que isso
 *  (planeta-pixel cobra 0,5 px), então 1 px é folga e não desculpa. */
export const TOLERANCIA_SALTO_PX = 1.0;

/** A estrela mais próxima que existe (Proxima Centauri, pc) — o teto da
 *  paralaxe de um passo de translação sai daqui, e não de um palpite. */
export const D_MIN_PC = 1.30;

/** Acima deste teto de paralaxe a reprojeção por rotação não descreve mais o
 *  campo, e o resíduo por pixel deixa de ser julgado (declarado no veredito). */
export const PARALAXE_CEGA_PX = 1.0;

/**
 * Luminância a partir da qual um pixel entra numa fonte — e este número é
 * MEDIDO, não escolhido. Com a câmera PARADA a 40 UA (dois retratos, nada se
 * movendo a não ser o relógio) o censo das componentes conexas dá:
 *
 *   limiar 0,20 → 1.260 fontes, e 111 delas (9%) mudam de lugar mais de 1 px
 *   limiar 0,30 →   591 fontes,  20 (3%)
 *   limiar 0,40 →   235 fontes,   2 (0,9%)
 *   limiar 0,50 →   134 fontes,   0
 *
 * Perto do limiar, componentes vizinhas se fundem e se partem por um degrau de
 * 8 bits, e o centroide do bloco fundido anda sozinho. Isso é população de
 * loteria, não população: um juiz de identidade construído em cima dela acusa
 * re-semeadura onde só há quantização. 0,40 é onde a população vira população.
 */
export const LIMIAR_FONTE = 0.40;

/**
 * A ALTURA em que a PSF da casa vale 0,85 px. NÃO é um número deste arquivo:
 * é `ALTURA_DE_CALIBRACAO_DO_SIGMA_PX` de `src/three/luzDaCasa.ts`, e o
 * shader do campo escreve `sigma = SIGMA_PX · alturaDoQuadro / 1080`
 * (`GLSL_STAR_PSF`, `shaders/common.ts`). Ou seja: **a PSF que MB1 mede
 * encolhe com a janela**, e toda a aritmética de fase abaixo depende dela.
 */
export const ALTURA_DE_CALIBRACAO_PX = 1080;
/** σ da PSF em px NA altura de calibração — `SIGMA_PX` de `luzDaCasa.ts`. */
export const SIGMA_DA_PSF_PX = 0.85;

/**
 * QUANTO DO PICO uma PSF perde por cair entre dois pixels da grade, e A CONTA
 * DEPENDE DA ALTURA DO QUADRO. Uma gaussiana de σ px amostrada meio pixel fora
 * do centro nos dois eixos lê exp(−0,25/σ²) do seu pico verdadeiro; com σ =
 * 0,85 (a altura de calibração) isso dá 0,70, e a soleira julgada 0,57. É por
 * isso que existe uma SEGUNDA soleira: uma fonte cujo pico está a um fio do
 * `LIMIAR_FONTE` entra e sai da lista conforme a estrela atravessa a fronteira
 * entre dois pixels — e o vizinho fraco que aparece no lugar dela vira uma
 * acusação falsa de re-semeadura. Medido nesta máquina no pan de 40 UA: com a
 * soleira única, 7 das 245 fontes por passo "saltavam" de 3 a 14 px, e TODAS
 * eram componentes de UM pixel com pico entre 0,40 e 0,49.
 *
 * POR QUE ISTO DEIXOU DE SER UMA CONSTANTE (item 81, 25/08). MB1 nasceu com
 * `0,70` digitado e com a janela padrão `640x700`, que depois de a moldura do
 * Chrome comer 87 px entrega um quadro de **613** px de altura — onde o app
 * desenha σ = 0,85 · 613/1080 = **0,48 px**, uma PSF abaixo de Nyquist. A
 * soleira honesta ali é 0,40/exp(−0,25/0,48²) = **1,17**, isto é ACIMA do
 * máximo de um quadro de 8 bits: naquela janela NENHUMA fonte do campo tem
 * identidade medível, e o juiz cobrava identidade de todas. Medido com o
 * PRÓPRIO `fontesDoQuadro`, sobre gaussianas sintéticas em 441 fases de
 * sub-pixel: a σ = 0,48 uma fonte de amplitude 1,0 SOME do censo em 4 fases
 * de 441 e lê pico entre 0,40 e 0,72; a de amplitude 0,7 some em 84 de 441.
 * Era essa a família de acusações "SUMIU — fonte de pico 0,57…0,93
 * desapareceu, longe da borda". A σ = 0,85 nada disso acontece: nenhuma fonte
 * de amplitude ≥ 0,55 some em nenhuma das 441 fases, e o erro de centroide
 * nunca passa de 0,67 px contra a régua de 1,00 px.
 */
export function fatorDeFase(alturaPx = ALTURA_DE_CALIBRACAO_PX) {
  const sigma = (SIGMA_DA_PSF_PX * alturaPx) / ALTURA_DE_CALIBRACAO_PX;
  return Math.exp(-0.25 / (sigma * sigma));
}

/** O pico mínimo para uma fonte ser JULGADA, NA altura de quadro dada. Quem
 *  define o contorno é o `LIMIAR_FONTE`; quem entra no veredito de identidade
 *  é só quem sobrevive à pior fase da grade. Fontes abaixo disto seguem
 *  servindo de ALVO de casamento — elas existem, só não se cobra identidade
 *  delas. Acima de 1,0 a soleira não tem população possível num quadro de 8
 *  bits, e é o veredito que diz isso (`julgarFamilia`), nunca o silêncio. */
export function soleiraJulgada(alturaPx = ALTURA_DE_CALIBRACAO_PX) {
  return LIMIAR_FONTE / fatorDeFase(alturaPx);
}

/** os dois valores NA altura de calibração — a régua que o cabeçalho declara */
export const FATOR_DE_FASE = fatorDeFase();
export const LIMIAR_JULGADA = soleiraJulgada();

/** Teto de fontes por quadro, só para o custo não explodir. NÃO é um ranking:
 *  quem decide quem é fonte é o `LIMIAR_FONTE`, e um teto que morde aparece no
 *  JSON (`fontes` colado no teto) porque um ranking que troca de membro entre
 *  quadros inventa fontes que somem. */
export const MAX_FONTES = 600;

/** Raio de busca do casamento fonte↔fonte, em px. Maior que a tolerância de
 *  salto de propósito: é preciso ACHAR a fonte deslocada para poder acusá-la.
 *  O casamento é MÚTUO (cada uma tem de ser a mais próxima da outra), que é o
 *  que impede um campo denso de casar vizinhas trocadas. */
export const RAIO_BUSCA_PX = 14;

/** Quão perto do ponto 3D a fonte tem de estar para SER aquele corpo. Três
 *  pixels: seis vezes a prova de 0,5 px que o `planeta-pixel.mjs` já cobra da
 *  camada dos corpos, e apertado o bastante para não capturar a estrela ao
 *  lado. Num clarão saturado o raio cresce com o núcleo da mancha. */
export const RECONHECE_ANCORA_PX = 3;

/** Margem da borda, em px, e ela vale para as DUAS coisas: uma fonte cujo
 *  núcleo chega a menos disto do quadro não é cobrada por sumir (ela pode ter
 *  simplesmente saído) nem por saltar (o recorte puxa o centroide). */
export const MARGEM_DA_BORDA_PX = 12;

/** Luminância que declara "isto é o clarão de um corpo próximo". A máscara
 *  desse clarão sai do resíduo por pixel: dentro dela a mudança é o corpo
 *  chegando, não fervura — e é a IDENTIDADE (posição do pico) que julga ali. */
export const LIMIAR_MASCARA = 0.25;

/** Dilatação da mancha do clarão, em px. A borda dela é um degrau de 8 bits e
 *  alguns pixels ficam de fora do limiar por arredondamento; quatro pixels
 *  fecham o contorno sem comer o céu em volta. */
export const DILATACAO_MASCARA_PX = 4;

/** Fração mínima de pixels válidos para o resíduo por pixel valer alguma
 *  coisa. Abaixo disso a família declara que o clarão comeu o quadro. */
export const MINIMO_DE_VALIDOS = 0.30;

/** Quadros de relógio entre dois retratos. Dois: o menor intervalo que o CDP
 *  entrega sem medir a latência do próprio harness. O piso é medido com o
 *  MESMO intervalo, então a comparação é justa. */
export const QUADROS_ENTRE = 2;

// ------------------------------------------------------------
// A CÂMERA, PURA — projeção e reprojeção
// ------------------------------------------------------------

/** roda o vetor `v` pelo quaternion `q` (x,y,z,w) — a fórmula do three */
export function rodar(q, v) {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  const ix = qw * vx + qy * vz - qz * vy;
  const iy = qw * vy + qz * vx - qx * vz;
  const iz = qw * vz + qx * vy - qy * vx;
  const iw = -qx * vx - qy * vy - qz * vz;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

/** o conjugado — leva do mundo para o espaço da câmera */
const conjugado = (q) => [-q[0], -q[1], -q[2], q[3]];

/** px por radiano no eixo VERTICAL, que é onde o fov do three é definido */
export function pxPorRad(cam) {
  return cam.H / (2 * Math.tan((cam.fov * Math.PI) / 360));
}

/**
 * Projeta um PONTO do mundo no quadro da câmera. Devolve `{ x, y, atras }` em
 * pixels com origem no canto superior esquerdo e o centro do pixel em +0,5 —
 * a mesma régua do centroide de `planeta-pixel.mjs`.
 */
export function projetarPonto(cam, ponto) {
  const d = [ponto[0] - cam.pos[0], ponto[1] - cam.pos[1], ponto[2] - cam.pos[2]];
  return projetarDirecao(cam, rodar(conjugado(cam.quat), d));
}

/** Projeta uma DIREÇÃO já no espaço da câmera (a câmera olha para −Z). */
export function projetarDirecao(cam, v) {
  const t = Math.tan((cam.fov * Math.PI) / 360);
  const aspecto = cam.W / cam.H;
  if (!(v[2] < 0)) return { x: NaN, y: NaN, atras: true };
  const ndcX = v[0] / -v[2] / (t * aspecto);
  const ndcY = v[1] / -v[2] / t;
  return {
    x: (ndcX * 0.5 + 0.5) * cam.W,
    y: (0.5 - ndcY * 0.5) * cam.H,
    atras: false,
  };
}

/** Projeta uma direção do MUNDO (unitária ou não) no quadro da câmera. */
export function projetarDirecaoMundo(cam, dir) {
  return projetarDirecao(cam, rodar(conjugado(cam.quat), dir));
}

/** A direção NO MUNDO que o pixel (x, y) enxerga — a inversa da projeção. */
export function direcaoDoPixel(cam, x, y) {
  const t = Math.tan((cam.fov * Math.PI) / 360);
  const aspecto = cam.W / cam.H;
  const ndcX = (x / cam.W) * 2 - 1;
  const ndcY = 1 - (y / cam.H) * 2;
  return rodar(cam.quat, [ndcX * t * aspecto, ndcY * t, -1]);
}

/**
 * O TETO DA PARALAXE de um passo, em px: uma estrela real a `D_MIN_PC` se
 * desloca `|Δcâmera| / D` radianos quando a câmera anda. É o que separa
 * "a reprojeção por rotação não descreve isto" de "a fonte se re-semeou".
 */
export function paralaxeMaximaPx(camA, camB) {
  const dx = camB.pos[0] - camA.pos[0];
  const dy = camB.pos[1] - camA.pos[1];
  const dz = camB.pos[2] - camA.pos[2];
  const passoPc = Math.hypot(dx, dy, dz);
  return (passoPc / D_MIN_PC) * pxPorRad(camB);
}

// ------------------------------------------------------------
// O QUADRO, PURO — luminância, borrão, passa-alta, warp
// ------------------------------------------------------------

/** Luminância Rec.709 em 0..1, a mesma conta de `luz-do-quadro.mjs`. */
export function luminancia(dados, W, H, canais) {
  const y = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const o = i * canais;
    y[i] = (0.2126 * dados[o] + 0.7152 * dados[o + 1] + 0.0722 * dados[o + 2]) / 255;
  }
  return y;
}

/** Média 3×3 (bordas replicadas) — o borrão que paga a reamostragem. */
export function borrar3x3(y, W, H) {
  const out = new Float32Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      let s = 0;
      for (let dj = -1; dj <= 1; dj++) {
        const jj = Math.min(H - 1, Math.max(0, j + dj));
        for (let di = -1; di <= 1; di++) {
          const ii = Math.min(W - 1, Math.max(0, i + di));
          s += y[jj * W + ii];
        }
      }
      out[j * W + i] = s / 9;
    }
  }
  return out;
}

/** Passa-alta: o quadro menos o seu borrão 3×3 — a banda fina da §5.17. */
export function passaAlta(y, W, H) {
  const b = borrar3x3(y, W, H);
  const out = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = y[i] - b[i];
  return out;
}

/** Amostra bilinear, com −1 fora do quadro (o chamador decide o que fazer). */
export function amostrar(y, W, H, x, fy) {
  if (!(x >= 0.5) || !(fy >= 0.5) || x > W - 0.5 || fy > H - 0.5) return -1;
  const px = x - 0.5;
  const py = fy - 0.5;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const fx = px - x0;
  const gy = py - y0;
  const x1 = Math.min(W - 1, x0 + 1);
  const y1 = Math.min(H - 1, y0 + 1);
  return (
    y[y0 * W + x0] * (1 - fx) * (1 - gy) +
    y[y0 * W + x1] * fx * (1 - gy) +
    y[y1 * W + x0] * (1 - fx) * gy +
    y[y1 * W + x1] * fx * gy
  );
}

/**
 * A REPROJEÇÃO. Para cada pixel do quadro NOVO devolve a coordenada
 * correspondente no quadro ANTERIOR, supondo distância infinita (rotação +
 * fov). `-1` marca o que não existia no quadro anterior.
 *
 * Backward mapping de propósito: mapear para a frente deixaria buracos, e
 * buraco num juiz de resíduo é resíduo inventado.
 */
export function mapaDaReprojecao(camA, camB) {
  const { W, H } = camB;
  const mx = new Float32Array(W * H).fill(-1);
  const my = new Float32Array(W * H).fill(-1);
  const qa = conjugado(camA.quat);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const dir = direcaoDoPixel(camB, i + 0.5, j + 0.5);
      const p = projetarDirecao(camA, rodar(qa, dir));
      const k = j * W + i;
      if (p.atras) continue;
      mx[k] = p.x;
      my[k] = p.y;
    }
  }
  return { mx, my, W, H };
}

/**
 * O RESÍDUO de um par de quadros, já reprojetado. `mascara` é um Uint8Array
 * 1 = pixel EXCLUÍDO (o clarão de um corpo próximo — ver `LIMIAR_MASCARA`).
 */
export function residuoDoPar({ yA, yB, camA, camB, mascara = null }) {
  const { W, H } = camB;
  const mapa = mapaDaReprojecao(camA, camB);
  const bA = borrar3x3(yA, W, H);
  const bB = borrar3x3(yB, W, H);
  const hA = passaAlta(yA, W, H);
  const hB = passaAlta(yB, W, H);
  const deltas = [];
  let somaDelta = 0;
  let somaB = 0;
  let somaAmostrada = 0;
  let energiaA = 0;
  let energiaB = 0;
  let validos = 0;
  for (let k = 0; k < W * H; k++) {
    if (mascara && mascara[k]) continue;
    const x = mapa.mx[k];
    if (x < 0) continue;
    const v = amostrar(bA, W, H, x, mapa.my[k]);
    if (v < 0) continue;
    const d = Math.abs(bB[k] - v);
    somaDelta += d;
    somaB += bB[k];
    somaAmostrada += v;
    deltas.push(d);
    validos++;
    // a energia fina compara-se por AMOSTRA MAIS PRÓXIMA: interpolar o
    // passa-alta apagaria justamente a banda que se quer medir
    const ix = Math.min(W - 1, Math.max(0, Math.round(x - 0.5)));
    const iy = Math.min(H - 1, Math.max(0, Math.round(mapa.my[k] - 0.5)));
    energiaA += Math.abs(hA[iy * W + ix]);
    energiaB += Math.abs(hB[k]);
  }
  if (!validos) {
    return {
      residuoMedio: 0, residuoP99: 0, bandaAlta: 0, validos: 0, fracaoValida: 0, deltaLuz: 0,
    };
  }
  deltas.sort((a, b) => a - b);
  const eA = energiaA / validos;
  const eB = energiaB / validos;
  return {
    // A LUZ MÉDIA DO QUADRO, e a variação dela entre os dois. Sem esta coluna
    // o veredito manda procurar fervura onde houve um APAGÃO: bloom é efeito
    // de tela, e uma fonte forte que cruza a borda leva o clarão dela junto,
    // escurecendo pixels que nem se moveram. Medido no pan de 40 UA: a luz
    // média do quadro caiu 31% em dois passos de 4 px quando a estrela
    // brilhante do canto saiu de quadro.
    luzMedia: somaB / validos,
    deltaLuz: (somaB - somaAmostrada) / Math.max(somaAmostrada, 1e-9),
    residuoMedio: somaDelta / validos,
    residuoP99: deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * 0.99))],
    bandaAlta: Math.abs(eB - eA) / Math.max(eA, eB, 1e-6),
    validos,
    fracaoValida: validos / (W * H),
  };
}

/**
 * A MÁSCARA DO CLARÃO de um corpo próximo: a mancha CONEXA acima de
 * `LIMIAR_MASCARA` que contém o centro projetado, dilatada por
 * `DILATACAO_MASCARA_PX`.
 *
 * É a FORMA da mancha, não um disco em volta dela — e a diferença é o clarão
 * do Sol. Um disco pelo raio médio deixa os BRAÇOS DE DIFRAÇÃO de fora, e os
 * braços são luz do próprio corpo: quando o filtro solar engata (§5.7) eles
 * somem de uma vez, e o juiz os denunciava como dez estrelas desaparecendo.
 * Um disco que os cobrisse comeria o quadro inteiro. A mancha conexa cobre o
 * braço e deixa o céu ENTRE os braços medível, que é onde a fervura mora.
 *
 * Nasce da IMAGEM e não de fórmula porque o clarão de uma PSF não escala com
 * o disco — cobrar a lei do disco sobre o halo seria inventar um raio.
 */
export function mascaraDoClarao(y, W, H, centros) {
  const m = new Uint8Array(W * H);
  const pilha = new Int32Array(W * H);
  for (const c of centros) {
    const cx = Math.round(c.x - 0.5);
    const cy = Math.round(c.y - 0.5);
    if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
    const s0 = cy * W + cx;
    if (y[s0] < LIMIAR_MASCARA) {
      // corpo fraco demais para ter clarão: um disco mínimo, e é só
      for (let j = Math.max(0, cy - 3); j <= Math.min(H - 1, cy + 3); j++) {
        for (let i = Math.max(0, cx - 3); i <= Math.min(W - 1, cx + 3); i++) {
          if ((i - cx) ** 2 + (j - cy) ** 2 <= 9) m[j * W + i] = 1;
        }
      }
      continue;
    }
    let topo = 0;
    pilha[topo++] = s0;
    m[s0] = 1;
    while (topo > 0) {
      const p = pilha[--topo];
      const x = p % W;
      const j = (p / W) | 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const nx = x + di;
          const ny = j + dj;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (!m[q] && y[q] >= LIMIAR_MASCARA) {
            m[q] = 1;
            pilha[topo++] = q;
          }
        }
      }
    }
  }
  return dilatar(m, W, H, DILATACAO_MASCARA_PX);
}

/** Dilatação separável (máximo em linha, depois em coluna) — a borda do
 *  clarão é um degrau de 8 bits e alguns pixels dela ficam de fora do limiar. */
export function dilatar(m, W, H, r) {
  if (r <= 0) return m;
  const a = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const x = i + d;
        if (x >= 0 && x < W && m[j * W + x]) v = 1;
      }
      a[j * W + i] = v;
    }
  }
  const b = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const yy = j + d;
        if (yy >= 0 && yy < H && a[yy * W + i]) v = 1;
      }
      b[j * W + i] = v;
    }
  }
  return b;
}

/** União de máscaras (a do quadro anterior e a do atual). */
export function unirMascaras(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] || b[i] ? 1 : 0;
  return out;
}

// ------------------------------------------------------------
// AS FONTES — quem tem identidade a preservar (§5.20)
// ------------------------------------------------------------

/**
 * As FONTES de um quadro: componentes conexas acima de `LIMIAR_FONTE`, com
 * pico e centroide.
 *
 * O CENTROIDE É O DE MEIA-ALTURA — os pixels acima de metade do pico da
 * própria componente —, e não o da componente inteira. É a decisão que o
 * `planeta-pixel.mjs` já tomou pela mesma razão (item 58a): a cauda da PSF
 * mora no degrau de 8 bits e um pixel solto entra e sai por arredondamento,
 * arrastando o centroide junto. Num clarão de milhares de pixels a diferença
 * é grande: o centroide inteiro anda com a cauda, o de meia-altura fica no
 * núcleo. `cxTudo/cyTudo` ficam publicados ao lado porque dizem onde a
 * componente INTEIRA se espalha.
 */
export function fontesDoQuadro(y, W, H, { limiar = LIMIAR_FONTE, max = MAX_FONTES } = {}) {
  const rotulo = new Int32Array(W * H).fill(-1);
  const pilha = new Int32Array(W * H);
  const fontes = [];
  for (let s = 0; s < W * H; s++) {
    if (y[s] < limiar || rotulo[s] >= 0) continue;
    const id = fontes.length;
    let topo = 0;
    pilha[topo++] = s;
    rotulo[s] = id;
    let n = 0;
    let peso = 0;
    let sx = 0;
    let sy = 0;
    let pico = 0;
    let px = 0;
    let py = 0;
    const meus = [];
    while (topo > 0) {
      const p = pilha[--topo];
      const x = p % W;
      const j = (p / W) | 0;
      const w = y[p];
      n++;
      peso += w;
      sx += w * (x + 0.5);
      sy += w * (j + 0.5);
      meus.push(p);
      if (w > pico) {
        pico = w;
        px = x + 0.5;
        py = j + 0.5;
      }
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const nx = x + di;
          const ny = j + dj;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (y[q] >= limiar && rotulo[q] < 0) {
            rotulo[q] = id;
            pilha[topo++] = q;
          }
        }
      }
    }
    // segundo passo: o centroide do NÚCLEO (acima de meio pico)
    const corte = pico / 2;
    let pm = 0;
    let mx = 0;
    let my = 0;
    let nMeia = 0;
    let x0 = W;
    let y0 = H;
    let x1 = -1;
    let y1 = -1;
    for (const p of meus) {
      const w = y[p];
      if (w < corte) continue;
      const ix = p % W;
      const iy = (p / W) | 0;
      nMeia++;
      pm += w;
      mx += w * (ix + 0.5);
      my += w * (iy + 0.5);
      if (ix < x0) x0 = ix;
      if (ix > x1) x1 = ix;
      if (iy < y0) y0 = iy;
      if (iy > y1) y1 = iy;
    }
    fontes.push({
      id, n, nMeia, pico, px, py,
      cx: mx / pm, cy: my / pm,
      cxTudo: sx / peso, cyTudo: sy / peso,
      x0, y0, x1, y1,
      // FONTE CORTADA PELA BORDA não tem posição: o recorte puxa o centroide
      // para dentro, e o quanto ele puxa muda a cada passo. Medida no pan de
      // 40 UA, foi a causa ÚNICA dos saltos de 1 a 6 px que sobraram depois de
      // o limiar de fase entrar — sempre a MESMA estrela brilhante encostada
      // no topo do quadro, com o halo metade fora.
      naBorda:
        x0 < MARGEM_DA_BORDA_PX || y0 < MARGEM_DA_BORDA_PX ||
        x1 > W - 1 - MARGEM_DA_BORDA_PX || y1 > H - 1 - MARGEM_DA_BORDA_PX,
    });
  }
  fontes.sort((a, b) => b.pico - a.pico || b.n - a.n);
  return fontes.slice(0, max).map((f, i) => ({ ...f, id: i }));
}

/**
 * QUANTAS VEZES o lado do núcleo pode passar de `√nMeia` e a componente ainda
 * ser uma MANCHA. Um disco de n pixels tem lado 2·√(n/π) = 1,13·√n; três é
 * folga de 2,7× sobre o disco perfeito, e o vão medido é enorme: platô do Sol
 * 1,6 · estrela do campo ≤ 1,7 · **traço de órbita 17,2**.
 */
export const LADO_POR_RAIZ_DO_NUCLEO = 3;

/**
 * UM TRAÇO NÃO TEM CENTROIDE QUE SE POSSA COBRAR — e desde 23/08 o quadro tem
 * traços. As linhas de órbita nasceram em `141b483` e engordaram para 1,25 px
 * CSS em `8be508f`; antes disso não havia nada no céu com esta forma.
 *
 * MEDIDO na família `fronteiraTerra` (o eclipse de 2024-04-08, a Lua sobre o
 * eixo Sol–Terra): a linha da órbita da Lua atravessa o quadro inteiro e é UMA
 * componente conexa — n=1602 num quadro de 613 px, n=2863 num de 1080 —, com o
 * núcleo numa caixa de 522×365 e 918×643. O `√nMeia` que alarga o raio de
 * reconhecimento (escrito para um PLATÔ SATURADO, onde o pico pode estar longe
 * do meio) vira ali 40 e 53 px, e a âncora `moon` reclamava o TRAÇO em vez da
 * Lua — a 2,7 px, porque no eclipse a Lua está quase no centro da própria
 * elipse. No passo seguinte a linha esmaece e se parte (n=90 + n=11), e o
 * centroide do bloco anda 4,63 px: a fusão se desfazendo, não a Lua andando.
 *
 * É a MESMA doutrina do bloco fundido que já está aqui ("dois corpos na mesma
 * mancha não têm identidade separada"), aplicada à forma: o que sai é a
 * IDENTIDADE. O resíduo por pixel e a banda alta continuam medindo o traço —
 * se ele cintilar, quem acusa é a §5.17, que não depende de centroide.
 */
export function nucleoCompacto(f) {
  const lado = Math.max(f.x1 - f.x0, f.y1 - f.y0) + 1;
  return lado <= LADO_POR_RAIZ_DO_NUCLEO * Math.sqrt(Math.max(f.nMeia, 1));
}

/**
 * CASA as fontes de dois quadros consecutivos, com a predição vinda da
 * reprojeção. `ancoras` são as fontes de profundidade CONHECIDA (o Sol, a
 * Terra, a estrela-alvo): para elas a predição é a projeção exata do ponto 3D,
 * não a hipótese de infinito.
 *
 * Devolve, para cada fonte do quadro anterior: onde ela foi prevista, onde foi
 * achada, e o salto (a distância entre as duas). É este salto que o §5.20
 * proíbe.
 */
export function casarFontes({
  fontesA, fontesB, camA, camB, ancoras = [], mascara = null, julgada = LIMIAR_JULGADA,
}) {
  const dentroDoClarao = (x, y) => {
    if (!mascara) return false;
    const i = Math.round(x - 0.5);
    const j = Math.round(y - 0.5);
    if (i < 0 || j < 0 || i >= camB.W || j >= camB.H) return false;
    return mascara[j * camB.W + i] === 1;
  };
  // 0. CADA ÂNCORA RECLAMA UMA FONTE SÓ — a mais próxima dela, e ninguém mais.
  //    Sem exclusividade, uma estrela de fundo a 14 px de Saturno herdava o
  //    deslocamento de SATURNO e era acusada de saltar os 4 px de paralaxe do
  //    planeta, passo após passo (medido na órbita de 40 UA: sempre o mesmo
  //    par, sempre a mesma acusação).
  //
  //    E O RAIO DE RECONHECIMENTO É APERTADO. O `planeta-pixel.mjs` já prova
  //    que a luz da camada dos corpos cai a ≤ 0,5 px do previsto, então uma
  //    fonte a 10 px do ponto 3D NÃO é o corpo — é a vizinha dele, e dar-lhe a
  //    paralaxe do corpo é fabricar um salto. `RECONHECE_ANCORA_PX` é a folga
  //    sobre aquela prova; para um clarão saturado ela cresce com o NÚCLEO
  //    (√nMeia), porque o "pico" de um platô de milhares de pixels é o
  //    primeiro máximo que o alagamento encontrou e pode estar longe do meio.
  //    E O ALARGAMENTO SÓ VALE PARA MANCHA — ver `nucleoCompacto`: num TRAÇO
  //    o √nMeia não descreve extensão nenhuma, e a âncora herdava a linha de
  //    órbita que passa por cima dela.
  const daAncora = new Map();
  const ambiguas = new Set();
  for (const k of ancoras) {
    if (!Number.isFinite(k.emA?.x) || !Number.isFinite(k.emB?.x)) continue;
    let melhor = null;
    let dist = Infinity;
    for (const a of fontesA) {
      const d = Math.hypot(k.emA.x - a.cx, k.emA.y - a.cy);
      const raio = nucleoCompacto(a)
        ? Math.max(RECONHECE_ANCORA_PX, Math.sqrt(a.nMeia))
        : RECONHECE_ANCORA_PX;
      if (d < dist && d <= raio) {
        dist = d;
        melhor = a;
      }
    }
    if (!melhor) continue;
    // DOIS CORPOS NA MESMA MANCHA não têm identidade separada: enquanto a Lua
    // e a Terra são uma componente só, o centroide é do BLOCO, e cobrar dele
    // a posição de qualquer um dos dois é medir a fusão. A fonte sai do
    // veredito até os dois se separarem.
    if (daAncora.has(melhor.id)) ambiguas.add(melhor.id);
    else daAncora.set(melhor.id, k);
  }
  // 1. onde cada fonte de A deveria estar em B. Só as que passam de
  //    `julgada` entram: as fracas continuam servindo de ALVO (estão em
  //    `fontesB`), mas não se cobra identidade de quem some por meio degrau.
  //    A soleira é ARGUMENTO e não constante porque ela depende da ALTURA do
  //    quadro — ver `soleiraJulgada`.
  const previstos = [];
  for (const a of fontesA) {
    if (a.pico < julgada || a.naBorda || ambiguas.has(a.id)) continue;
    // e um TRAÇO não entra: o centroide de uma linha que atravessa o quadro
    // não é posição de coisa nenhuma (`nucleoCompacto`)
    if (!nucleoCompacto(a)) continue;
    const ancora = daAncora.get(a.id);
    let prev;
    if (ancora && Number.isFinite(ancora.emB?.x)) {
      // o deslocamento da ÂNCORA aplicado ao centroide da fonte: a fonte é o
      // clarão do corpo, e o clarão acompanha o corpo
      prev = {
        x: a.cx + (ancora.emB.x - ancora.emA.x),
        y: a.cy + (ancora.emB.y - ancora.emA.y),
        via: `ancora:${ancora.nome}`,
      };
    } else {
      const p = projetarDirecaoMundo(camB, direcaoDoPixel(camA, a.cx, a.cy));
      if (p.atras) continue;
      prev = { x: p.x, y: p.y, via: 'infinito' };
    }
    if (prev.x < 0 || prev.y < 0 || prev.x >= camB.W || prev.y >= camB.H) continue;
    // ENGOLIDA PELO CLARÃO não é fonte que sumiu. Quando o corpo próximo
    // cresce, a mancha dele avança sobre o céu e absorve as estrelas que ela
    // cobre: elas deixam de ser componentes próprias porque a luz somou, não
    // porque alguém as apagou. Só a ÂNCORA continua a ser julgada dentro do
    // próprio clarão — é ela que a fronteira de promoção interroga.
    if (!ancora && (dentroDoClarao(prev.x, prev.y) || dentroDoClarao(a.cx, a.cy))) continue;
    previstos.push({ a, prev });
  }
  // 2. o mais próximo de cada lado — e só o casal MÚTUO conta. Num campo
  //    denso, "o mais próximo" sozinho casa vizinhas trocadas e inventa
  //    saltos; a mutualidade é o que torna a acusação de re-semeadura séria.
  const perto = (px, py, lista, chaveX, chaveY) => {
    let melhor = null;
    let dist = Infinity;
    for (const it of lista) {
      const d = Math.hypot(chaveX(it) - px, chaveY(it) - py);
      if (d < dist) {
        dist = d;
        melhor = it;
      }
    }
    return { melhor, dist };
  };
  const casados = [];
  const sumidos = [];
  for (const p of previstos) {
    const ida = perto(p.prev.x, p.prev.y, fontesB, (b) => b.cx, (b) => b.cy);
    const volta = ida.melhor
      ? perto(ida.melhor.cx, ida.melhor.cy, previstos, (q) => q.prev.x, (q) => q.prev.y)
      : { melhor: null };
    if (ida.melhor && volta.melhor === p && ida.dist <= RAIO_BUSCA_PX) {
      casados.push({
        de: p.a.id, para: ida.melhor.id, prev: p.prev,
        salto: ida.dist, pico: ida.melhor.pico, picoAntes: p.a.pico, via: p.prev.via,
        // encostou na borda DEPOIS de andar: o salto existe mas não se julga
        naBorda: ida.melhor.naBorda,
        // MUDOU DE BRILHO mais do que a fase da grade explica. Uma fonte que
        // perde um terço do pico num passo mudou de FORMA, e o centroide de
        // outra forma não é a mesma medida — a acusação de POSIÇÃO cala-se.
        // (Só vale para o campo: numa âncora a posição vem da física, e é
        // justamente na fronteira de promoção que o brilho muda de propósito
        // enquanto a posição não pode mudar — §5.20.)
        mudouDeBrilho:
          Math.min(ida.melhor.pico, p.a.pico) / Math.max(ida.melhor.pico, p.a.pico)
            < FATOR_DE_FASE,
      });
    } else {
      const naBorda =
        p.prev.x < MARGEM_DA_BORDA_PX ||
        p.prev.y < MARGEM_DA_BORDA_PX ||
        p.prev.x > camB.W - MARGEM_DA_BORDA_PX ||
        p.prev.y > camB.H - MARGEM_DA_BORDA_PX;
      sumidos.push({ de: p.a.id, prev: p.prev, pico: p.a.pico, naBorda, via: p.prev.via });
    }
  }
  return { casados, sumidos };
}

// ------------------------------------------------------------
// O VEREDITO, PURO
// ------------------------------------------------------------

/**
 * Julga UMA família. `passos` é a lista de medidas por passo (cada uma com o
 * resíduo do par e o casamento de fontes); `piso` é o par medido na mesma pose.
 *
 * O que reprova, e nada além disso:
 *  1. resíduo por pixel acima de `piso + EXCESSO_RESIDUO` — fervura que o
 *     movimento acrescentou (§5.17);
 *  2. energia em banda alta acima de `piso + EXCESSO_BANDA_ALTA` — idem;
 *  3. fonte que salta mais que `TOLERANCIA_SALTO_PX + paralaxe` — re-semeadura
 *     (§5.20);
 *  4. fonte FORTE, longe da borda, que some sem deixar sucessora.
 * A regra 1 e a 2 ficam SUSPENSAS onde a paralaxe do passo passa de
 * `PARALAXE_CEGA_PX` ou onde o clarão comeu o quadro — e isso vai escrito no
 * veredito, nunca em silêncio.
 */
export function julgarFamilia({ nome, passos = [], piso = null }) {
  const pisoResiduo = piso ? piso.residuoMedio : 0;
  const pisoBanda = piso ? piso.bandaAlta : 0;
  const erros = [];
  const suspensos = [];
  // A SOLEIRA DE FASE DESTA CORRIDA, declarada uma vez por família. Quando ela
  // passa de 1,00 não há população possível num quadro de 8 bits — a régua de
  // identidade está fora de calibração e o veredito TEM de dizer, senão a
  // ausência de acusações passa por aprovação (item 81).
  const julgada = passos.find((p) => Number.isFinite(p.julgada))?.julgada;
  if (Number.isFinite(julgada) && Math.abs(julgada - LIMIAR_JULGADA) > 1e-9) {
    suspensos.push(
      `${nome}: soleira de fase ${julgada.toFixed(2)} (a de calibração é `
      + `${LIMIAR_JULGADA.toFixed(2)}) — a PSF encolhe com a altura do quadro`
      + (julgada > 1
        ? '; ACIMA DE 1,00 nenhuma fonte do campo tem identidade medível nesta janela'
        : '')
    );
  }
  for (const p of passos) {
    const rotulo = `${nome} passo ${p.k}`;
    const cegoPorParalaxe = p.paralaxePx > PARALAXE_CEGA_PX;
    const cegoPorClarao = p.fracaoValida < MINIMO_DE_VALIDOS;
    if (cegoPorParalaxe || cegoPorClarao) {
      suspensos.push(
        `${rotulo}: resíduo por pixel SUSPENSO — `
        + (cegoPorParalaxe ? `paralaxe do passo ${p.paralaxePx.toFixed(1)} px > ${PARALAXE_CEGA_PX}` : '')
        + (cegoPorParalaxe && cegoPorClarao ? ' e ' : '')
        + (cegoPorClarao ? `só ${(p.fracaoValida * 100).toFixed(0)}% do quadro fora do clarão` : '')
      );
    } else {
      if (p.residuoMedio > pisoResiduo + EXCESSO_RESIDUO) {
        const luz = Number.isFinite(p.deltaLuz)
          ? `; a luz do quadro mudou ${(p.deltaLuz * 100).toFixed(1)}%`
          : '';
        erros.push(
          `${rotulo}: FERVE — resíduo ${(p.residuoMedio * 255).toFixed(2)} degraus contra `
          + `piso ${(pisoResiduo * 255).toFixed(2)} + folga ${(EXCESSO_RESIDUO * 255).toFixed(2)}${luz}`
        );
      }
      if (p.bandaAlta > pisoBanda + EXCESSO_BANDA_ALTA) {
        erros.push(
          `${rotulo}: BANDA ALTA — energia fina mudou ${(p.bandaAlta * 100).toFixed(1)}% contra `
          + `piso ${(pisoBanda * 100).toFixed(1)}% + folga ${(EXCESSO_BANDA_ALTA * 100).toFixed(0)}%`
        );
      }
    }
    const tetoSalto = TOLERANCIA_SALTO_PX + Math.max(0, p.paralaxePx);
    for (const c of p.casados ?? []) {
      if (c.naBorda) continue;
      if (c.mudouDeBrilho && c.via === 'infinito') continue;
      if (c.salto > tetoSalto) {
        erros.push(
          `${rotulo}: RE-SEMEIA — fonte saltou ${c.salto.toFixed(2)} px da posição reprojetada `
          + `(teto ${tetoSalto.toFixed(2)} px, via ${c.via})`
        );
      }
    }
    // quem chega aqui já passou por `LIMIAR_JULGADA`: uma fonte sólida que
    // desaparece sem sucessora, longe da borda, é o outro rosto do §5.20
    for (const s of p.sumidos ?? []) {
      if (!s.naBorda) {
        erros.push(
          `${rotulo}: SUMIU — fonte de pico ${s.pico.toFixed(2)} desapareceu em `
          + `(${s.prev.x.toFixed(0)}, ${s.prev.y.toFixed(0)}), longe da borda`
        );
      }
    }
  }
  return { nome, piso, passos: passos.length, erros, suspensos };
}

/**
 * A MEDIDA DE UM PAR de retratos consecutivos — o passo do juiz, inteiro e
 * puro. `a` e `b` são `{ cam, y }`; `ancoras` são os pontos 3D de
 * profundidade conhecida em cena (`{ nome, ponto }`).
 *
 * É esta função que o oráculo em `.test.mjs` exercita: o percurso no
 * navegador só produz os `{ cam, y }` e chama isto aqui. Juiz cujo miolo só
 * roda com Chrome é juiz que ninguém confere.
 */
export function medirPar(a, b, k, ancoras = [], julgada = LIMIAR_JULGADA) {
  // uma âncora pode ter UM ponto (o Sol, na origem, e a estrela do catálogo)
  // ou DOIS (os corpos do sistema, cuja efeméride anda com o relógio entre um
  // retrato e o outro) — a predição usa o ponto de cada lado
  const centros = ancoras.map((p) => ({
    ...p,
    emA: projetarPonto(a.cam, p.pontoA ?? p.ponto),
    emB: projetarPonto(b.cam, p.pontoB ?? p.ponto),
  }));
  const visiveis = (lado) => centros.map((c) => c[lado]).filter((c) => !c.atras);
  const mA = mascaraDoClarao(a.y, a.cam.W, a.cam.H, visiveis('emA'));
  const mB = mascaraDoClarao(b.y, b.cam.W, b.cam.H, visiveis('emB'));
  const mascara = unirMascaras(mA, mB);
  const r = residuoDoPar({ yA: a.y, yB: b.y, camA: a.cam, camB: b.cam, mascara });
  const fontesA = fontesDoQuadro(a.y, a.cam.W, a.cam.H);
  const fontesB = fontesDoQuadro(b.y, b.cam.W, b.cam.H);
  const { casados, sumidos } = casarFontes({
    fontesA, fontesB, camA: a.cam, camB: b.cam, ancoras: centros, mascara, julgada,
  });
  return {
    k,
    julgada,
    paralaxePx: paralaxeMaximaPx(a.cam, b.cam),
    quadrosEntre: (b.cam.f ?? 0) - (a.cam.f ?? 0),
    solArmado: b.cam.solArmado,
    cedeTerra: b.cam.cedeTerra,
    fontes: fontesB.length,
    exposicao: b.cam.exposicao,
    ...r,
    casados,
    sumidos,
  };
}

/** O veredito da corrida: a soma dos vereditos de família. */
export function julgarCorrida(familias) {
  const erros = familias.flatMap((f) => f.erros);
  const suspensos = familias.flatMap((f) => f.suspensos);
  return { familias, erros, suspensos, passa: erros.length === 0 };
}

// ------------------------------------------------------------
// A CORRIDA — a partir daqui o juiz fala com o navegador
// ------------------------------------------------------------

/* c8 ignore start */

const APP = process.env.APP_URL || APP_PADRAO;
/**
 * O QUADRO, e ele é EXATO — `Emulation.setDeviceMetricsOverride`, o mesmo
 * remédio que `capturarCDP` já usava ("a janela `--window-size=900,900`
 * desconta a barra do navegador e a viewport real era 900×813"). MB1 vivia
 * exatamente desse engano: pedia `640x700` e media 640×**613**.
 *
 * E A ALTURA É A DE CALIBRAÇÃO DA PSF, 1080 — não é gosto, é a única em que
 * os números deste arquivo são verdade (ver `fatorDeFase`). A 613 px o app
 * desenha σ = 0,48 px, a soleira honesta de fase vai a 1,17 e a régua de
 * identidade fica sem população nenhuma. O preço está medido e é o custo do
 * quadro: a corrida inteira passou de ~1,8 min para ~4 min nesta máquina.
 */
const JANELA = process.env.JANELA || `${1128}x${ALTURA_DE_CALIBRACAO_PX}`;
const GUARDAR_PNGS = process.env.PNGS === '1';
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CAPTURAS = resolve(RAIZ, 'capturas');

/** o jd das vistas oficiais da Terra/Lua (o eclipse de 2024-04-08) */
const JD_DA_TERRA = 2460409.26395835;

/** o CSS do `.bare-mode`, injetado — ver o cabeçalho */
const SO_A_CENA =
  "(() => { const s = document.createElement('style');"
  + " s.textContent = '.hud-root > *:not(.scene-canvas){display:none !important}';"
  + ' document.head.appendChild(s); return true; })()';

async function novaSessao() {
  const [largura, altura] = JANELA.split('x').map(Number);
  // a janela do SO é a pedida MAIS a moldura, para o override nunca ter de
  // encolher a página; quem manda no quadro é o override logo abaixo
  const s = await abrirSessao({ janela: `${largura}x${altura + 120}`, app: APP, prefixo: 'mb1' });
  // O QUADRO EXATO — ver o comentário de `JANELA`. Sem isto a altura medida é
  // a da janela menos a barra do navegador, e é dela que sai o σ da PSF.
  await s.send('Emulation.setDeviceMetricsOverride', {
    width: largura, height: altura, deviceScaleFactor: 1, mobile: false,
  });
  await s.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "try{localStorage.setItem('viagem-prefs',JSON.stringify({conviteVisto:true}))}catch{}",
  });
  return s;
}

/** o estado da câmera do quadro que está na tela AGORA */
const LER_CAMERA = `(() => {
  const d = window.__director;
  const c = d.engine.camera;
  const e = d.engine.renderer.domElement;
  return JSON.stringify({
    pos: c.position.toArray(),
    quat: c.quaternion.toArray(),
    fov: c.fov,
    W: e.width, H: e.height,
    f: window.__f | 0,
    jd: d.tempo.jd,
    solArmado: !!(d.solNoQuadro && d.solNoQuadro.solArmado),
    // a EXPOSIÇÃO do quadro: um multiplicador global que mude entre dois
    // retratos levanta o resíduo do quadro INTEIRO, e um juiz de estabilidade
    // que não a publica manda procurar fervura onde houve troca de lente
    exposicao: d.engine.renderer.toneMappingExposure,
    // OS CORPOS DO SISTEMA, em pc, do MESMO quadro: os dez pontos
    // fotométricos mais tudo o que estiver RESOLVIDO no palco (a Lua, as luas
    // dos gigantes, os anões). A câmera que voa de 4 UA a 0,8 UA move Vênus
    // dezenas de pixels por passo: é PARALAXE legítima de um corpo a 5e-6 pc,
    // e o teto derivado de Proxima (1,3 pc) não a cobre nem de longe. Com a
    // posição 3D na mão a predição volta a ser exata, e o juiz passa a cobrar
    // identidade dos corpos também. A LUA entra por este segundo caminho, e
    // sem ela a aproximação da Terra acusava a Terra de saltar 8 px: o que
    // salta é o centroide do BLOCO Lua+Terra enquanto os dois se separam.
    corpos: (() => {
      const fora = [];
      const p = d.planetas ? Array.from(d.planetas.posicoes) : [];
      const ids = (d.corpos || []).map((c) => c.id);
      for (let i = 0; i < p.length / 3; i++) {
        fora.push([ids[i] || ('ponto' + i), p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]);
      }
      const vistos = new Set(fora.map((f) => f[0]));
      for (const posto of d.noPalco || []) {
        if (vistos.has(posto.id)) continue;
        const c = posto.corpo && posto.corpo.estadoVivo && posto.corpo.estadoVivo.centroPc;
        if (c && Number.isFinite(c.x)) fora.push([posto.id, c.x, c.y, c.z]);
      }
      return fora;
    })(),
    cedeTerra: (() => {
      const p = (d.noPalco || []).find((x) => x.id === 'earth');
      return p && p.corpo.estadoVivo ? p.corpo.estadoVivo.cede : null;
    })(),
  });
})()`;

/** Espera `QUADROS_ENTRE` quadros de relógio — nunca tempo de parede. */
async function esperarQuadros(s, n = QUADROS_ENTRE) {
  const f0 = await s.js('window.__f | 0');
  for (let i = 0; i < 200; i++) {
    if ((await s.js('window.__f | 0')) >= f0 + n) return;
    await dorme(16);
  }
}

/** Um retrato: o quadro em luminância mais a câmera que o desenhou. */
async function retrato(s, tag) {
  const cam = JSON.parse(await s.js(LER_CAMERA));
  const shot = await s.send('Page.captureScreenshot', { format: 'png' });
  const png = Buffer.from(shot.data, 'base64');
  if (GUARDAR_PNGS) {
    mkdirSync(CAPTURAS, { recursive: true });
    writeFileSync(resolve(CAPTURAS, `mb1-${tag}.png`), png);
  }
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const cams = { ...cam, W: info.width, H: info.height };
  return { cam: cams, y: luminancia(data, info.width, info.height, info.channels) };
}

/**
 * Mede um PERCURSO: uma lista de poses, andadas em ordem, com um retrato por
 * pose e o piso medido nas duas pontas. `ancorasDe(cam)` devolve os pontos 3D
 * de profundidade conhecida em cena (o Sol, a Terra, a estrela-alvo).
 */
async function medirPercurso(s, { nome, poses, ancorasDe = ancorasDaCasa }) {
  const quadros = [];
  const pisos = [];
  for (let k = 0; k < poses.length; k++) {
    await poses[k](s);
    await esperarQuadros(s);
    // O PISO NAS DUAS PONTAS, e ele entra ANTES do retrato de partida e
    // DEPOIS do de chegada — nunca no meio. Posto entre dois passos, o par
    // parado esticaria o intervalo do passo seguinte (medido: 72 quadros
    // contra 13), e um passo com seis vezes mais relógio dentro não é
    // comparável com os outros nem com o próprio piso.
    if (k === 0) pisos.push([await retrato(s, `${nome}-piso-de`), null]);
    quadros.push(await retrato(s, `${nome}-${k}`));
    if (k === 0) pisos[0][1] = quadros[0];
    if (k === poses.length - 1) {
      await esperarQuadros(s);
      pisos.push([quadros[quadros.length - 1], await retrato(s, `${nome}-piso-ate`)]);
    }
  }
  // A SOLEIRA DE FASE SAI DO QUADRO QUE FOI CAPTURADO, não de uma constante:
  // a PSF do app encolhe com a altura da tela (`soleiraJulgada`), e uma
  // soleira digitada é uma soleira que mente numa janela e não na outra.
  const julgada = soleiraJulgada(quadros[0].cam.H);
  const passos = [];
  for (let k = 1; k < quadros.length; k++) {
    passos.push(medirPar(
      quadros[k - 1], quadros[k], k, ancorasDe(quadros[k - 1].cam, quadros[k].cam), julgada
    ));
  }
  const parados = pisos.map(([a, b], i) =>
    medirPar(a, b, `piso${i}`, ancorasDe(a.cam, b.cam), julgada));
  // o piso da família é o MAIOR das duas pontas — conservador e declarado
  const piso = {
    residuoMedio: Math.max(...parados.map((p) => p.residuoMedio)),
    bandaAlta: Math.max(...parados.map((p) => p.bandaAlta)),
    pontas: parados.map((p) => ({
      residuoMedio: p.residuoMedio, bandaAlta: p.bandaAlta, quadrosEntre: p.quadrosEntre,
    })),
  };
  return { nome, passos, piso, quadros: quadros.map((q) => q.cam) };
}

// ------------------------------------------------------------
// AS FAMÍLIAS
// ------------------------------------------------------------

/** o passo de câmera, sempre pelo mesmo método determinístico */
const pousar = (pos, look) => (s) =>
  s.js(`window.__director.placeCamera([${pos.join(',')}],[${look.join(',')}])`);

const SOL = [0, 0, 0];

/**
 * AS ÂNCORAS PADRÃO: o Sol na origem e os dez corpos do sistema, cada um com a
 * sua posição nos DOIS retratos. É o que a Lei chama de "profundidade conhecida
 * da fonte" — e sem elas um voo radial acusa Vênus de re-semear a cada passo.
 */
const ancorasDaCasa = (camA, camB) => {
  const fora = [{ nome: 'sol', ponto: SOL }];
  const b = new Map((camB.corpos ?? []).map((c) => [c[0], c]));
  for (const c of camA.corpos ?? []) {
    const par = b.get(c[0]);
    // o Sol já entrou pela origem; corpo que não está nos DOIS retratos não
    // tem deslocamento a prever
    if (!par || c[0] === 'sun') continue;
    fora.push({ nome: c[0], pontoA: [c[1], c[2], c[3]], pontoB: [par[1], par[2], par[3]] });
  }
  return fora;
};

/** N degraus geométricos de `de` a `ate` (inclusive nas duas pontas) */
function degraus(de, ate, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(de * Math.pow(ate / de, i / (n - 1)));
  return out;
}

/**
 * A BANDA DO GATE do Sol, lida da régua do PRÓPRIO app (a mesma conta que o
 * `voo-ida-e-volta` faz): o corpo arma a 4 px e desarma a 2 px, e é entre as
 * duas distâncias que a promoção ponto→corpo acontece.
 */
async function bandaDoSol(s) {
  return JSON.parse(await s.js(`(() => {
    const d = window.__director;
    const h = d.engine.renderer.domElement.height;
    const pxPorRad = h / (2 * Math.tan((d.engine.camera.fov * Math.PI / 180) / 2));
    const dPara = (px) => d.solRaioPc / Math.tan(px / (2 * pxPorRad));
    return JSON.stringify({ de: dPara(4), ate: dPara(2) });
  })()`));
}

/** APROXIMAÇÃO AO SOL — translação pura, campo estático, o caso mais limpo. */
async function familiaAproxSol(s) {
  await s.ir('pos=0,0,0.0014542&look=0,0,0&q=cinema');
  await s.js(SO_A_CENA);
  const poses = degraus(300 / UA_POR_PC, 6 / UA_POR_PC, 10).map((z) => pousar([0, 0, z], SOL));
  return medirPercurso(s, { nome: 'aproxSol', poses });
}

/** A FRONTEIRA DE PROMOÇÃO ponto→corpo DO SOL, com o passo dentro da banda. */
async function familiaFronteiraSol(s, banda) {
  const de = banda.ate * 1.6;
  const ate = banda.de * 0.6;
  await s.ir(`pos=0,0,${de}&look=0,0,0&q=cinema`);
  await s.js(SO_A_CENA);
  const poses = degraus(de, ate, 12).map((z) => pousar([0, 0, z], SOL));
  return medirPercurso(s, { nome: 'fronteiraSol', poses });
}

/** REVERSÃO DE SENTIDO — os MESMOS degraus da fronteira, de volta, sem
 *  recarregar: é onde a histerese aparece (§5.17). */
async function familiaReversao(s, banda) {
  const de = banda.ate * 1.6;
  const ate = banda.de * 0.6;
  const poses = degraus(ate, de, 12).map((z) => pousar([0, 0, z], SOL));
  return medirPercurso(s, { nome: 'reversao', poses });
}

/** PAN — rotação pura a 40 UA, e a volta ao ponto de partida (persistência). */
async function familiaPan(s) {
  const z = 40 / UA_POR_PC;
  await s.ir(`pos=0,0,${z}&look=0,0,0&q=cinema`);
  await s.js(SO_A_CENA);
  const cam = JSON.parse(await s.js(LER_CAMERA));
  // o passo é escolhido para deslocar o CENTRO do quadro 4 px: a escala de um
  // quadro de voo real, e um deslocamento inteiro no centro deixa a
  // reamostragem bilinear quase exata (o resto do quadro paga a perspectiva)
  const passoRad = 4 / pxPorRad(cam);
  const raio = z * 4;
  const ida = [];
  for (let i = 0; i <= 8; i++) ida.push(i * passoRad);
  // e a VOLTA pelos mesmos ângulos: a fonte que saiu de quadro tem de voltar
  // onde estava, com a mesma fase (§5.20, "não recomeça o relógio")
  const angulos = [...ida, ...[...ida].reverse().slice(1)];
  const poses = angulos.map((a) => pousar([0, 0, z], [raio * Math.sin(a), 0, z - raio * Math.cos(a)]));
  return medirPercurso(s, { nome: 'pan', poses });
}

/** ÓRBITA — translação + rotação juntas, com o Sol pinado no centro. */
async function familiaOrbita(s) {
  const r = 40 / UA_POR_PC;
  await s.ir(`pos=0,0,${r}&look=0,0,0&q=cinema`);
  await s.js(SO_A_CENA);
  const cam = JSON.parse(await s.js(LER_CAMERA));
  const passoRad = 4 / pxPorRad(cam);
  const poses = [];
  for (let i = 0; i <= 9; i++) {
    const a = i * passoRad;
    poses.push(pousar([r * Math.sin(a), 0, r * Math.cos(a)], SOL));
  }
  return medirPercurso(s, { nome: 'orbita', poses });
}

/**
 * FOV — a lente muda e a câmera não sai do lugar.
 *
 * O PASSO É PEQUENO DE PROPÓSITO, e tem conta. A reprojeção supõe que a imagem
 * é função da DIREÇÃO; a PSF de uma estrela não é — ela tem tamanho de TELA,
 * fixo em pixels, e não encolhe quando a lente abre. Então fechar a lente
 * afasta as estrelas umas das outras sem mudar o tamanho de cada uma, e a luz
 * média do quadro cai por FÍSICA (estrela é fonte pontual: o fluxo dela não
 * muda com o zoom), não por fervura. Medido: um degrau de 9,4% de fov mexeu
 * 15% na luz do quadro e o juiz gritava FERVE. A 2% por degrau o efeito cabe
 * na folga, e o que sobra volta a ser instabilidade de verdade.
 */
async function familiaFov(s) {
  const z = 40 / UA_POR_PC;
  await s.ir(`pos=0,0,${z}&look=0,0,0&q=cinema`);
  await s.js(SO_A_CENA);
  const fovs = degraus(58, 46, 12);
  const poses = fovs.map((f) => async (sess) => {
    await sess.js(
      `(() => { const c = window.__director.engine.camera; c.fov = ${f};`
      + ' c.updateProjectionMatrix(); return c.fov; })()'
    );
  });
  return medirPercurso(s, { nome: 'fov', poses });
}

/** APROXIMAÇÃO A UMA ESTRELA NOMEADA — Sirius, a mais brilhante do céu. */
async function familiaAproxEstrela(s) {
  await s.ir('pos=0,0,0&look=0,0,0&q=cinema');
  await s.js(SO_A_CENA);
  const alvo = JSON.parse(await s.js(
    "JSON.stringify(window.__director.nomeadas.find((e) => e.n === 'Sirius') || window.__director.nomeadas[0])"
  ));
  const p = [alvo.x, alvo.y, alvo.z];
  const norma = Math.hypot(...p);
  const u = p.map((v) => v / norma);
  const poses = degraus(0.5, 0.006, 10).map((d) =>
    pousar(p.map((v, i) => v - u[i] * d), p)
  );
  const ancorasDe = (ca, cb) => [...ancorasDaCasa(ca, cb), { nome: alvo.n, ponto: p }];
  const r = await medirPercurso(s, { nome: 'aproxEstrela', poses, ancorasDe });
  return { ...r, alvo: alvo.n };
}

/** A CESSÃO corpo↔ponto DA TERRA — a outra fronteira de promoção da Lei. */
async function familiaFronteiraTerra(s) {
  const centro = [
    -0.0000045890070378484725, -0.000001455314175436054, -6.308304960541221e-7,
  ];
  const RAIO_TERRA_PC = 2.0645e-10; // 6.378,137 km em pc — só para a escada
  // o eixo de aproximação: do Sol para a Terra (o lado iluminado)
  const norma = Math.hypot(...centro);
  const u = centro.map((v) => v / norma);
  const pousarEm = (k) => pousar(centro.map((v, i) => v - u[i] * k * RAIO_TERRA_PC), centro);
  // pré-aquecimento: a textura da Terra tem de estar residente ANTES do
  // percurso, senão o juiz mede a chegada dela e não a estabilidade
  const perto = centro.map((v, i) => v - u[i] * 20 * RAIO_TERRA_PC);
  await s.ir(
    `pos=${perto.join(',')}&look=${centro.join(',')}&jd=${JD_DA_TERRA}&corpos=1&q=cinema`
  );
  await s.js(SO_A_CENA);
  await s.assentar();
  const poses = degraus(600, 30, 12).map((k) => pousarEm(k));
  const ancorasDe = (ca, cb) => [...ancorasDaCasa(ca, cb), { nome: 'terra', ponto: centro }];
  return medirPercurso(s, { nome: 'fronteiraTerra', poses, ancorasDe });
}

/**
 * ZOOM DE RODA (item 73) — a única família que corre DENTRO do Atlas, e a
 * única que mexe na câmera pela porta que o visitante usa.
 *
 * POR QUE ELA PRECISA EXISTIR: as outras oito voam com `placeCamera` no
 * voo livre, onde o AtlasRig nem é o escritor da câmera. O zoom contínuo
 * é escrita nova de posição a 60 Hz com o relógio andando, e é
 * exatamente o regime que MB1 existe para julgar — campo procedural, PSF
 * e clarão re-semeando entre quadros consecutivos.
 *
 * O PASSO É PEQUENO DE PROPÓSITO, e o precedente é o `familiaFov`: a
 * reprojeção supõe que a imagem é função da DIREÇÃO, e a PSF de uma
 * estrela tem tamanho de TELA. Um degrau de zoom translada a câmera, e a
 * paralaxe do passo é o que decide se o par é julgável — `paralaxePx`
 * acima de `PARALAXE_CEGA_PX` SUSPENDE o passo sozinho, como já acontece
 * em `aproxEstrela`. `PASSO_LOG_PERTO` (0,05 década = 12,2% da
 * distância) é o passo do produto junto ao piso, e a 226 UA de casa ele
 * desloca a câmera 8,8e-5 pc — 0,07 px de paralaxe contra a régua de
 * 1,30 pc. Cabe com folga de uma ordem de grandeza.
 *
 * A POSE é escrita pelo mesmo caminho do gesto (`pinarDistancia`), e não
 * por `placeCamera`: fosse por `placeCamera`, a família mediria o voo
 * livre com outro nome.
 */
async function familiaZoomDeRoda(s) {
  // O `&jd=` É PINO, e ele entrou em 23/08 (item 61, §3): desde então o
  // Atlas abre com o relógio do céu AO VIVO, e MB1 mede FERVURA entre
  // quadros consecutivos — com os dez corpos andando entre eles, o piso
  // da família subiria por efeméride e não por instabilidade de campo.
  // O pino é o idioma da casa para isto (o `atlas-smoke` faz o mesmo na
  // prova do portal), e é o mais honesto dos dois caminhos possíveis:
  // medir o piso novo escreveria "fervura" num número que é do
  // calendário.
  await s.ir(`atlas=1&foco=saturno&jd=${JD_DA_TERRA}&q=cinema`);
  await s.js(SO_A_CENA);
  await s.assentar();
  const faixa = JSON.parse(await s.js(`JSON.stringify((() => {
    const d = window.__director;
    return { dist: d.atlas.distancia, piso: d.atlas.pisoDeZoom, teto: d.atlas.tetoDeZoom };
  })())`));
  // 11 poses descendo do enquadramento rumo ao piso, uma década em 11
  // passos de 0,05 — o passo do produto junto ao corpo
  const poses = [];
  for (let k = 0; k < 11; k++) {
    const d = faixa.dist * Math.pow(10, -0.05 * k);
    poses.push((sess) =>
      sess.js(`window.__director.atlas.pinarDistancia(${Math.max(d, faixa.piso)})`));
  }
  return medirPercurso(s, { nome: 'zoomDeRoda', poses });
}

// ------------------------------------------------------------
// main
// ------------------------------------------------------------

const TODAS = [
  'aproxSol', 'fronteiraSol', 'reversao', 'pan', 'orbita', 'fov',
  'aproxEstrela', 'fronteiraTerra', 'zoomDeRoda',
];

async function correr() {
  const pedidas = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const alvos = pedidas.length ? pedidas : TODAS;
  for (const a of alvos) {
    if (!TODAS.includes(a)) throw new Error(`família desconhecida: ${a} (há ${TODAS.join(', ')})`);
  }

  const t0 = Date.now();
  const alturaPedida = Number(JANELA.split('x')[1]);
  console.log(
    `quadro ${JANELA} · σ da PSF ${((SIGMA_DA_PSF_PX * alturaPedida) / ALTURA_DE_CALIBRACAO_PX).toFixed(2)} px`
    + ` · soleira de fase ${soleiraJulgada(alturaPedida).toFixed(2)}`
    + (alturaPedida === ALTURA_DE_CALIBRACAO_PX ? ' (calibrada)' : ' (FORA da calibração)')
  );
  const s = await novaSessao();
  const cruas = [];
  let gritos = [];
  try {
    // a fronteira e a reversão andam a MESMA escada, e a reversão tem de ser na
    // MESMA sessão (histerese não sobrevive a um reload)
    let banda = null;
    if (alvos.includes('fronteiraSol') || alvos.includes('reversao')) {
      await s.ir('pos=0,0,0.00001&look=0,0,0&q=cinema');
      await s.js(SO_A_CENA);
      banda = await bandaDoSol(s);
      console.log(
        `banda do gate do Sol: ${(banda.de * UA_POR_PC).toFixed(3)} a `
        + `${(banda.ate * UA_POR_PC).toFixed(3)} UA (4 px arma, 2 px desarma)`
      );
    }
    for (const nome of alvos) {
      const marca = Date.now();
      let r;
      if (nome === 'aproxSol') r = await familiaAproxSol(s);
      else if (nome === 'fronteiraSol') r = await familiaFronteiraSol(s, banda);
      else if (nome === 'reversao') {
        if (!alvos.includes('fronteiraSol')) await familiaFronteiraSol(s, banda);
        r = await familiaReversao(s, banda);
      } else if (nome === 'pan') r = await familiaPan(s);
      else if (nome === 'orbita') r = await familiaOrbita(s);
      else if (nome === 'fov') r = await familiaFov(s);
      else if (nome === 'aproxEstrela') r = await familiaAproxEstrela(s);
      else if (nome === 'zoomDeRoda') r = await familiaZoomDeRoda(s);
      else r = await familiaFronteiraTerra(s);
      r.segundos = (Date.now() - marca) / 1000;
      cruas.push(r);
      const pior = r.passos.reduce((m, p) => Math.max(m, p.residuoMedio), 0);
      console.log(
        `${nome.padEnd(15)} ${String(r.passos.length).padStart(2)} passos  `
        + `piso ${(r.piso.residuoMedio * 255).toFixed(2).padStart(6)}  `
        + `pior ${(pior * 255).toFixed(2).padStart(6)} degraus  `
        + `banda ${(r.piso.bandaAlta * 100).toFixed(1).padStart(5)}%  `
        + `${r.segundos.toFixed(0)} s`
      );
    }
    gritos = s.gritos();
  } finally {
    s.fechar();
  }

  const familias = cruas.map((r) => julgarFamilia(r));
  const veredito = julgarCorrida(familias);
  const minutos = (Date.now() - t0) / 60000;

  mkdirSync(CAPTURAS, { recursive: true });
  const json = resolve(CAPTURAS, 'estabilidade-temporal.json');
  writeFileSync(
    json,
    JSON.stringify(
      {
        janela: JANELA,
        minutos,
        tolerancias: {
          EXCESSO_RESIDUO, EXCESSO_BANDA_ALTA, TOLERANCIA_SALTO_PX,
          D_MIN_PC, PARALAXE_CEGA_PX, LIMIAR_FONTE, QUADROS_ENTRE,
          // a soleira de fase é DESTA corrida (depende da altura do quadro),
          // e o número de calibração vai ao lado para se ver a diferença
          soleiraDeFase: soleiraJulgada(Number(JANELA.split('x')[1])),
          LIMIAR_JULGADA,
        },
        familias: cruas.map((r) => ({
          nome: r.nome,
          segundos: r.segundos,
          piso: r.piso,
          alvo: r.alvo,
          passos: r.passos.map((p) => ({
            k: p.k,
            residuoMedio: p.residuoMedio,
            residuoP99: p.residuoP99,
            bandaAlta: p.bandaAlta,
            luzMedia: p.luzMedia,
            deltaLuz: p.deltaLuz,
            fracaoValida: p.fracaoValida,
            paralaxePx: p.paralaxePx,
            quadrosEntre: p.quadrosEntre,
            solArmado: p.solArmado,
            cedeTerra: p.cedeTerra,
            fontes: p.fontes,
            exposicao: p.exposicao,
            casados: p.casados.length,
            mudaramDeBrilho: p.casados.filter((c) => c.mudouDeBrilho).length,
            maiorSalto: p.casados.reduce((m, c) => Math.max(m, c.salto), 0),
            // os cinco piores saltos, com endereço: uma acusação de re-semeadura
            // sem coordenada é uma acusação que ninguém consegue conferir
            piores: [...p.casados]
              .sort((a, b) => b.salto - a.salto)
              .slice(0, 5)
              .map((c) => ({ salto: c.salto, x: c.prev.x, y: c.prev.y, pico: c.pico, via: c.via })),
            sumidos: p.sumidos.filter((x) => !x.naBorda).length,
          })),
        })),
        erros: veredito.erros,
        suspensos: veredito.suspensos,
        gritos,
      },
      null,
      1
    )
  );

  console.log(`\ncorrida em ${minutos.toFixed(2)} min`);
  if (veredito.suspensos.length) {
    console.log(`\nsuspensos (declarados, não reprovam) — ${veredito.suspensos.length}:`);
    for (const x of veredito.suspensos.slice(0, 10)) console.log('  · ' + x);
    if (veredito.suspensos.length > 10) console.log(`  · (+${veredito.suspensos.length - 10})`);
  }
  if (gritos.length) console.log(`gritos do app: ${gritos.length}\n  ` + gritos.slice(0, 5).join('\n  '));
  if (veredito.erros.length) {
    console.log(`\n>>> REPROVA — ${veredito.erros.length} defeito(s) de estabilidade temporal:`);
    for (const e of veredito.erros.slice(0, 30)) console.log('  · ' + e);
    if (veredito.erros.length > 30) console.log(`  · (+${veredito.erros.length - 30} não listados)`);
    console.log(`\n  ${json}`);
    process.exit(1);
  }
  console.log(`>>> PASSA — ${familias.length} famílias, nenhuma fervura nem re-semeadura\n  ${json}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await correr();
}
/* c8 ignore stop */
