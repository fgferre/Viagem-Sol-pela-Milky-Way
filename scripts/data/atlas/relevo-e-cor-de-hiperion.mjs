#!/usr/bin/env node
// ============================================================
// RELEVO E COR DE HIPÉRION — receita reprodutível das 3 imagens-FONTE
// que dão a Hipérion o mesmo tratamento de Mimas: deslocamento de vértice
// por mapa de ALTURA, luz por mapa de NORMAL, cor por mapa de COR — na
// convenção de mapas da casa. Desde o item 226 também os dois mapas de
// HORIZONTE (`hyperion-horizon.png`, `hyperion-horizon2.png`): a sombra de
// relevo assada do mesmo raio (`gera-horizonte.mjs`).
//
// FONTES:
//   1. FORMA MEDIDA — Thomas, P., Joseph, J. & Ansty, T. (2018), "Saturn
//      Small Moon Shape Models V1.0" (Cassini ISS), PDS4,
//      DOI 10.26033/ewy3-jy61 — DOMÍNIO PÚBLICO.
//      https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/hyperion_30k_plt.tab
//      (14.636 vértices, 29.268 facetas.)
//   2. COR — uma pintura de IA (ILUSTRAÇÃO, não medição): dá a cor e,
//      por detecção de manchas escuras, os poços que viram cratera no
//      relevo. Nem a cor nem os poços são dado observacional.
//
// O MIOLO (forma, grade radial, poços, altura/normal, tratamento da cor)
// mora em `relevo-medido.mjs`, comum às luas pequenas de Saturno; aqui
// ficam as constantes do Hipérion, o retoque da flor e as conferências.
//
// CONVENÇÃO LOCAL DA MALHA (mesma de `pilotoHiperionForma.ts`/`esculpido.ts`
// no branch piloto-hiperion, não versionada aqui): eixos principais a
// partir do centroide de VOLUME — X = eixo mais comprido, Y = intermediário
// (é o POLO da grade), Z = mais curto, destros; longitude da GRADE
// λ_grade = atan2(z,x), latitude lat = asin(y); raio normalizado por
// 135 km (raio médio de catálogo que a casa usa para Hipérion).
//
// CONVENÇÃO DA CASA (`src/three/world/corpos/orientacaoNaCena.ts:142`):
// mapas equiretangulares, u = λ/360 + 0,5 (Greenwich no centro), linha 0 =
// norte; a direção local de (λ leste, lat) é
//     (cos lat·cos λ, sin lat, −cos lat·sin λ).
// É o ESPELHO da grade (λ_grade = −λ: grade tem +Z em λ_grade=+90°, casa
// tem +Z em λ=−90°) — por isso todo valor sai daqui avaliado POR DIREÇÃO
// (grade e crateras na direção `d`, cor no (atan2, asin) de `d` dentro da
// SUA PRÓPRIA imagem), nunca por espelhamento manual de índice de coluna.
//
// USO:
//   node relevo-e-cor-de-hiperion.mjs [--tab <arquivo.tab>] [--cor <png>]
//     [--saida <diretório>] [--alinhamento <jpg>] [--limiar <num>]
//     [--pocos <json>] [--dose <png>] [--cor-antes <png>]
//
// Sem --tab, baixa da URL do PDS acima (cache em $TMPDIR). Sem --cor, usa
// <saida>/hyperion-ia-original.png (a cópia que uma corrida anterior já
// deixou — permite reproduzir só com o que já está versionado). Sem
// --saida, escreve em ./fonte ao lado deste script. --alinhamento é
// opcional: se dado, escreve ali um JPEG de 1200px (hillshade da altura
// sobre a cor) só para conferência visual — não é uma das 4 saídas.
// --dose, do mesmo jeito, escreve a dose da borda clara em cinza 2048×1024.
// --cor-antes escreve a cor graduada antes dos dois retoques da etapa C,
// na mesma convenção e resolução da saída, para uma prova antes/depois.
//
// POÇOS (crateras): por padrão, `detectaPocos` (relevo-medido.mjs) roda sobre --cor a
// cada chamada — a mesma detecção multi-escala usada no piloto (branch
// piloto-hiperion), portada para rodar em memória em vez de escrever
// direto no repositório; é o caminho que torna a receita reprodutível só
// de --tab + --cor. Ela É sensível ao limiar de aceitação (--limiar), que
// o piloto ajustou olhando o resultado e não deixou registrado — por isso
// --pocos aceita uma lista JÁ VALIDADA (mesmo formato de
// `hyperion-pocos.json`, `{crateras: [[x,y,z,raio,fundura,borda,escuridao],
// ...]}`) e pula a detecção quando dada, para reproduzir byte a byte um
// relevo já conferido.
//
// A FONTE DOS POÇOS DESTA CASA é `fonte/hyperion-pocos.json` — os 3.488
// aprovados no piloto (branch piloto-hiperion). A detecção embutida,
// no limiar padrão (`--limiar 0.010`), acha 5.175 e NÃO reproduz essa
// lista; rode com `--pocos fonte/hyperion-pocos.json` para repetir o
// relevo já conferido.
// ============================================================

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_DO_REPO = 'file:///Users/fgferre/Github/Viagem-Sol-pela-Milky-Way/';

// `sharp` é devDependency do REPOSITÓRIO; resolve contra o node_modules
// dele porque este script pode rodar de um rascunho fora da árvore
// (mesmo truque de `converte-hiperion.mjs`/`gradua-cor.mjs`).
const requireDoRepo = createRequire(new URL('package.json', RAIZ_DO_REPO));
const sharp = requireDoRepo('sharp');
const { assaHorizonte } = await import(
  new URL('scripts/data/atlas/gera-horizonte.mjs', RAIZ_DO_REPO).href
);
// o miolo da receita (forma, grade, poços, mapas, cor) — comum às luas pequenas de Saturno
const {
  alturaEmBytes,
  baldeDeCrateras,
  campoNaCasa,
  corEmSRGB,
  corNaCasa,
  declivesDaFormaEmGrande,
  detectaPocos,
  direcaoLocalDeLonLat,
  doseDaEncosta,
  graduaCorEmLinear,
  gradeRadial,
  linParaSRGB,
  lePlt,
  malhaNoReferencial,
  normalDoRaio,
  quantizaGrade,
  raioComPocos,
  suave01,
} = await import(new URL('scripts/data/atlas/relevo-medido.mjs', RAIZ_DO_REPO).href);

console.time('total');

// ------------------------------------------------------------
// CLI
// ------------------------------------------------------------
const argv = process.argv.slice(2);
function argValor(nome, padrao) {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : padrao;
}

const URL_TAB =
  'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/hyperion_30k_plt.tab';
const CAMINHO_SAIDA = path.resolve(argValor('saida', path.join(AQUI, 'fonte')));
const CAMINHO_COR = path.resolve(
  argValor('cor', path.join(CAMINHO_SAIDA, 'hyperion-ia-original.png'))
);
const CAMINHO_ALINHAMENTO = argValor('alinhamento', null);
const LIMIAR_POCOS = Number(argValor('limiar', '0.010'));
// `--pocos <json>`: usa uma lista de crateras JÁ VALIDADA (mesmo formato de
// `hyperion-pocos.json`) em vez de detectar de novo — a detecção (abaixo)
// fica disponível para reproduzir do zero, mas uma lista conhecida evita
// depender do limiar exato (não documentado) que gerou uma lista aceita.
const CAMINHO_POCOS = argValor('pocos', null);

const CAMINHO_TAB_CACHE = path.join(os.tmpdir(), 'hyperion_30k_plt.tab');
let caminhoTab = argValor('tab', null);
if (!caminhoTab) {
  if (!existsSync(CAMINHO_TAB_CACHE)) {
    console.log(`baixando forma medida de ${URL_TAB} ...`);
    const resposta = await fetch(URL_TAB);
    if (!resposta.ok) throw new Error(`download da forma medida falhou: HTTP ${resposta.status}`);
    writeFileSync(CAMINHO_TAB_CACHE, Buffer.from(await resposta.arrayBuffer()));
  }
  caminhoTab = CAMINHO_TAB_CACHE;
}
if (!existsSync(CAMINHO_COR)) {
  throw new Error(`sem imagem de cor da IA em ${CAMINHO_COR} — passe --cor <png>.`);
}
console.log(`tab: ${caminhoTab}`);
console.log(`cor: ${CAMINHO_COR}`);
console.log(`saída: ${CAMINHO_SAIDA}`);

const RAIO_MEDIO_KM = 135; // raio médio de catálogo que a casa usa para Hipérion
const GRAUS = 180 / Math.PI;

// ------------------------------------------------------------
// 1. FORMA MEDIDA — o .tab no referencial `pca` (centroide de volume +
//    eixos principais) e a grade radial 512×256 por interseção
//    raio-triângulo (`relevo-medido.mjs`).
// ------------------------------------------------------------
console.log('lendo forma medida...');
const malha = lePlt(readFileSync(caminhoTab, 'utf8'));
console.log(`  vértices: ${malha.vx.length}, facetas: ${malha.fa.length}`);
const malhaLocal = malhaNoReferencial(malha, 'pca');
const grade = gradeRadial(malhaLocal, { nx: 512, ny: 256, padGraus: 1.5 });
console.log(`  raios com 0 hits: ${grade.raiosComZeroHits} (tem de ser 0)`);
const gradeQ = quantizaGrade(grade, RAIO_MEDIO_KM);
console.log(
  `  grade medida 512×256: rMin=${gradeQ.rMin.toFixed(6)} rMax=${gradeQ.rMax.toFixed(6)} (unidades de 135 km)`
);

// ------------------------------------------------------------
// 2. POÇOS ESCUROS → CRATERAS — `detectaPocos` sobre --cor (pintura na
//    convenção da malha), ou a lista já validada de --pocos.
// ------------------------------------------------------------
let crateraArrays;
if (CAMINHO_POCOS) {
  console.log(`  usando lista de poços já validada: ${CAMINHO_POCOS}`);
  crateraArrays = JSON.parse(readFileSync(CAMINHO_POCOS, 'utf8')).crateras;
} else {
  console.log('detectando poços escuros em', CAMINHO_COR, '...');
  const { data: dataCor, info: infoCor } = await sharp(CAMINHO_COR)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  crateraArrays = detectaPocos(dataCor, infoCor.width, infoCor.height, infoCor.channels, {
    convencao: 'malha',
    limiar: LIMIAR_POCOS,
    epsLog: Number(process.env.EPS_LOG || 0.0012),
    epsStd: Number(process.env.EPS_STD || 0.05),
  });
}
console.log(`  crateras: ${crateraArrays.length}`);
const balde = baldeDeCrateras(crateraArrays);
const MACIEZ_CALIBRADA = 1.0; // `CRATERAS_CALIBRADAS_HIPERION.maciezDaCratera` em esculpido.ts
const raioEsculpidoNormalizado = (d) => raioComPocos(gradeQ, balde, d, MACIEZ_CALIBRADA);

// ------------------------------------------------------------
// 3. hyperion-altura.png — 1024×512, 8 bits, h=(r-rMin)/(rMax-rMin)
// ------------------------------------------------------------
console.log('gerando altura (1024×512)...');
const ALT_W = 1024,
  ALT_H = 512;
const { bytes: alturaBuf, rMin, rMax, escala, vies } = alturaEmBytes(
  campoNaCasa(ALT_W, ALT_H, raioEsculpidoNormalizado)
);
await sharp(alturaBuf, { raw: { width: ALT_W, height: ALT_H, channels: 1 } })
  .toColourspace('b-w') // 1 canal de verdade — sem isto o sharp expande p/ sRGB 3 canais
  .png()
  .toFile(path.join(CAMINHO_SAIDA, 'hyperion-altura.png'));
console.log(`  rMin=${rMin.toFixed(6)} rMax=${rMax.toFixed(6)} escala=${escala.toFixed(6)} vies=${vies.toFixed(6)}`);

// ------------------------------------------------------------
// 4. hyperion-normal.png — 2048×1024, campo calculado DIRETO nessa
//    resolução (não upsample da altura), em metros = R·ln(r/R) (Hipérion
//    varia de -34% a +7% do raio local).
// ------------------------------------------------------------
console.log('gerando normal (2048×1024)...');
const NRM_W = 2048,
  NRM_H = 1024;
const R_M = RAIO_MEDIO_KM * 1000; // metros — mesmo raio médio, em metros
const raioFinal = campoNaCasa(NRM_W, NRM_H, raioEsculpidoNormalizado); // o mesmo campo, para o horizonte (4b)
const { rgb: normalRgb, rmsGraus, maxGraus, metros } = normalDoRaio(raioFinal, NRM_W, NRM_H, RAIO_MEDIO_KM);
const caminhoNormalPng = path.join(CAMINHO_SAIDA, 'hyperion-normal.png');
await sharp(normalRgb, { raw: { width: NRM_W, height: NRM_H, channels: 3 } }).png().toFile(caminhoNormalPng);
console.log(`  declive rms=${rmsGraus.toFixed(2)}° máx=${maxGraus.toFixed(2)}°`);

// ------------------------------------------------------------
// 4b. hyperion-horizon.png + hyperion-horizon2.png — 2048×1024 RGB, o
//     mapa de HORIZONTE (item 226, `gera-horizonte.mjs`): marchado sobre
//     o raio FINAL (forma medida + poços) que a normal acabou de
//     rasterizar, lido por bilinear — as crateras não se reavaliam por
//     passo. `horizon` = azimutes 0/120/240° em RGB, `horizon2` =
//     60/180/300°; sem alfa.
// ------------------------------------------------------------
console.log('gerando horizonte (2048×1024, 6 azimutes)...');
console.time('horizonte');
const { horizon, horizon2 } = assaHorizonte({ raio: raioFinal, W: NRM_W, H: NRM_H });
console.timeEnd('horizonte');
for (const [nome, buf] of [
  ['hyperion-horizon.png', horizon],
  ['hyperion-horizon2.png', horizon2],
]) {
  await sharp(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength), {
    raw: { width: NRM_W, height: NRM_H, channels: 3 },
  })
    .png()
    .toFile(path.join(CAMINHO_SAIDA, nome));
}

// ------------------------------------------------------------
// 5. hyperion-ia.png — a pintura da IA GRADUADA (desestica os polos,
//    desatura 40% em luz linear) e reamostrada para a convenção da casa
//    por DIREÇÃO (`corNaCasa`, pintura na convenção da malha).
//    Dois retoques SÓ de cor (item 226, etapa C; invenção sobre a
//    invenção, a cor já é pintura de IA), em luz linear no mapa de SAÍDA,
//    depois da reamostragem e logo antes da volta a sRGB: (a) a flor de
//    raios brancos em (900, 333) coberta pelo doador 280 texels a leste,
//    na mesma latitude; (b) a cor clareia com o declive da forma MEDIDA em
//    escala grande sobre o elipsoide ajustado a ela (gelo fresco nas
//    encostas da bacia, foto PIA07740). A
//    graduação é linear por texel e a reamostragem também, então isto dá
//    o mesmo que retocar antes dela. Altura, normal e horizonte não mudam.
// ------------------------------------------------------------
const BRILHO_DA_ENCOSTA = 0.35; // cor × (1 + isto·dose): quanto clareia a encosta mais íngreme (o dono ajusta por foto)
const DECLIVE_SEM_BRILHO_GRAUS = 12; // abaixo deste declive em escala grande a cor fica como está (dose 0)
const DECLIVE_BRILHO_CHEIO_GRAUS = 30; // deste declive para cima a dose é cheia (1)
const SIGMA_DA_FORMA_GRAUS = 4; // suavização da forma medida antes do declive: escala da bacia, não dos poços
const MANCHA_X = 900; // centro da flor de raios brancos, texel do mapa 2048×1024 (achado no app, 29/09)
const MANCHA_Y = 333;
const DOADOR_DX = 280; // doador centrado em (1180, 333): mesma latitude, sem distorção equiretangular
const MANCHA_RAIO_CHEIO = 30; // até aqui (texels) o doador cobre tudo; daí até MANCHA_RAIO, borda suave
const MANCHA_RAIO = 40;
const CAMINHO_DOSE = argValor('dose', null); // opcional, como --alinhamento: a dose em cinza, só para conferência
const CAMINHO_COR_ANTES = argValor('cor-antes', null);
console.log('gerando cor (2048×1024)...');
const { data: dataPintura, info: infoPintura } = await sharp(CAMINHO_COR)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const corLinear = graduaCorEmLinear(dataPintura, infoPintura.width, infoPintura.height);
const COR_W = 2048,
  COR_H = 1024;
const { declive: declivesGrandes, elipsoide, rmsRho } = declivesDaFormaEmGrande(gradeQ, SIGMA_DA_FORMA_GRAUS);
console.log(
  `  elipsoide ajustado (unidades de 135 km): a=${elipsoide.a.toFixed(4)} ` +
    `b=${elipsoide.b.toFixed(4)} c=${elipsoide.c.toFixed(4)}; ` +
    `rms de ρ=ln(r/r_elipsoide) = ${rmsRho.toFixed(4)}`
);
const corSaida = corNaCasa(corLinear, COR_W, COR_H, 'malha');
const dose = doseDaEncosta(
  declivesGrandes,
  gradeQ.nx,
  gradeQ.ny,
  COR_W,
  COR_H,
  DECLIVE_SEM_BRILHO_GRAUS,
  DECLIVE_BRILHO_CHEIO_GRAUS
);
if (CAMINHO_COR_ANTES) {
  const antesBuf = Buffer.alloc(COR_W * COR_H * 3);
  for (let p = 0; p < COR_W * COR_H; p++) {
    for (let k = 0; k < 3; k++) antesBuf[p * 3 + k] = linParaSRGB(corSaida[k][p]);
  }
  await sharp(antesBuf, { raw: { width: COR_W, height: COR_H, channels: 3 } })
    .png()
    .toFile(CAMINHO_COR_ANTES);
}
// (a) retoque da flor: o doador (x + DOADOR_DX, y) fica fora do disco, então
// ler e escrever no mesmo mapa é seguro.
for (let y = MANCHA_Y - MANCHA_RAIO; y <= MANCHA_Y + MANCHA_RAIO; y++) {
  for (let x = MANCHA_X - MANCHA_RAIO; x <= MANCHA_X + MANCHA_RAIO; x++) {
    const peso = suave01((MANCHA_RAIO - Math.hypot(x - MANCHA_X, y - MANCHA_Y)) / (MANCHA_RAIO - MANCHA_RAIO_CHEIO));
    if (peso <= 0) continue;
    const p = y * COR_W + (((x % COR_W) + COR_W) % COR_W);
    const q = y * COR_W + ((((x + DOADOR_DX) % COR_W) + COR_W) % COR_W);
    for (let k = 0; k < 3; k++) corSaida[k][p] += (corSaida[k][q] - corSaida[k][p]) * peso;
  }
}
// os poços validados cujo centro cai no disco: o relevo os guarda, só a cor é clonada
const pocosNoDisco = crateraArrays.filter(([cx, cy, cz]) => {
  const tx = ((Math.atan2(-cz, cx) * GRAUS + 180) / 360) * COR_W - 0.5;
  const ty = ((90 - Math.asin(Math.max(-1, Math.min(1, cy))) * GRAUS) / 180) * COR_H - 0.5;
  return Math.hypot(tx - MANCHA_X, ty - MANCHA_Y) < MANCHA_RAIO;
}).length;
// (b) borda clara + volta a sRGB
const { bytes: corBuf, texelsComDose, somaDose } = corEmSRGB(corSaida, dose, BRILHO_DA_ENCOSTA);
console.log(
  `  retoque: ${pocosNoDisco} poços validados com centro no disco da flor; borda clara: ` +
    `${((100 * texelsComDose) / (COR_W * COR_H)).toFixed(2)}% dos texels com dose>0, ` +
    `dose média ${(somaDose / (COR_W * COR_H)).toFixed(4)}`
);
await sharp(corBuf, { raw: { width: COR_W, height: COR_H, channels: 3 } })
  .png()
  .toFile(path.join(CAMINHO_SAIDA, 'hyperion-ia.png'));
if (CAMINHO_DOSE) {
  const doseBuf = Buffer.from(Uint8Array.from(dose, (x) => Math.round(255 * x)));
  await sharp(doseBuf, { raw: { width: COR_W, height: COR_H, channels: 1 } })
    .toColourspace('b-w')
    .png()
    .toFile(CAMINHO_DOSE);
}

// ------------------------------------------------------------
// 6. hyperion-ia-original.png (cópia) + hyperion-pocos.json
// ------------------------------------------------------------
const destinoOriginal = path.join(CAMINHO_SAIDA, 'hyperion-ia-original.png');
if (path.resolve(destinoOriginal) !== path.resolve(CAMINHO_COR)) {
  copyFileSync(CAMINHO_COR, destinoOriginal);
}
writeFileSync(
  path.join(CAMINHO_SAIDA, 'hyperion-pocos.json'),
  JSON.stringify({
    fonte:
      'poços escuros detectados em hyperion-ia-original.png (pintura por IA, ilustração — não ' +
      'medição) por blob detection multi-escala sobre log-luminância, resposta dividida pelo ' +
      'desvio-padrão local (janela 3× a escala do blob) — DoG normalizado por escala e por ' +
      'contraste local, sigma 1.5-24px ×1.25, |lat|<=72°; gerado por ' +
      'scripts/data/atlas/relevo-e-cor-de-hiperion.mjs',
    crateras: crateraArrays,
  }) + '\n'
);

// ------------------------------------------------------------
// 7. CONFERÊNCIAS — quiralidade, espelho, ângulo do normal decodificado
// ------------------------------------------------------------
console.log('--- conferências ---');
function raioKmEm(lon, lat) {
  return raioEsculpidoNormalizado(direcaoLocalDeLonLat(lon, lat)) * RAIO_MEDIO_KM;
}
const rMaisX = raioKmEm(0, 0);
const rMenosX = raioKmEm(180, 0);
const rPoloNorte = raioKmEm(0, 90);
const rPoloSul = raioKmEm(0, -90);
console.log(`quiralidade: λ=0°,φ=0° (+X)=${rMaisX.toFixed(1)}km (≈174.3) | λ=180° (−X)=${rMenosX.toFixed(1)}km (≈182.0)`);
console.log(`             polo norte (+Y)=${rPoloNorte.toFixed(1)}km (≈143.5) | polo sul (−Y)=${rPoloSul.toFixed(1)}km (≈137.1)`);

const craterZPos = crateraArrays.find(([, , z]) => z > 0);
let espelhoLambda = null;
if (craterZPos) {
  espelhoLambda = Math.atan2(-craterZPos[2], craterZPos[0]) * GRAUS;
  console.log(
    `espelho: cratera z=${craterZPos[2].toFixed(4)}>0 → λ_casa=${espelhoLambda.toFixed(2)}° ` +
      `(${espelhoLambda < 0 ? 'OK, <0' : 'FALHOU, deveria ser <0'})`
  );
}

function normalAnaliticaEm(camposMetros, W, H, R, i, j) {
  const dLon = (2 * Math.PI) / W;
  const dLat = Math.PI / H;
  const passoNorte = R * dLat;
  const LAT_CLAMP = (80 * Math.PI) / 180; // LATITUDE_DO_CLAMP_RAD em gera-normal-de-dem.mjs
  const passoLesteMinimo = R * Math.cos(LAT_CLAMP) * dLon;
  const lat = Math.PI / 2 - ((j + 0.5) / H) * Math.PI;
  const passoLeste = Math.max(R * Math.cos(lat) * dLon, passoLesteMinimo);
  const jNorte = Math.max(0, j - 1);
  const jSul = Math.min(H - 1, j + 1);
  const vaoNorte = (jSul - jNorte) * passoNorte;
  const iLeste = (i + 1) % W;
  const iOeste = (i - 1 + W) % W;
  const dhLeste = (camposMetros[j * W + iLeste] - camposMetros[j * W + iOeste]) / (2 * passoLeste);
  const dhNorte = (camposMetros[jNorte * W + i] - camposMetros[jSul * W + i]) / vaoNorte;
  const x = -dhLeste,
    y = -dhNorte;
  const inv = 1 / Math.sqrt(x * x + y * y + 1);
  return { x: x * inv, y: y * inv, z: inv };
}
function anguloEntreGraus(a, b) {
  const na = Math.hypot(a.x, a.y, a.z) || 1;
  const nb = Math.hypot(b.x, b.y, b.z) || 1;
  const dot = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (na * nb)));
  return Math.acos(dot) * GRAUS;
}

const { data: normalLidoDoDisco } = await sharp(caminhoNormalPng).raw().toBuffer({ resolveWithObject: true });
const pontosDeChecagem = [
  [NRM_W >> 1, NRM_H >> 1],
  [300, 150],
  [1700, 700],
];
for (const [tx, ty] of pontosDeChecagem) {
  const k = (ty * NRM_W + tx) * 3;
  const decodificado = {
    x: (normalLidoDoDisco[k] / 255) * 2 - 1,
    y: (normalLidoDoDisco[k + 1] / 255) * 2 - 1,
    z: (normalLidoDoDisco[k + 2] / 255) * 2 - 1,
  };
  const analitico = normalAnaliticaEm(metros, NRM_W, NRM_H, R_M, tx, ty);
  const erro = anguloEntreGraus(decodificado, analitico);
  console.log(`  normal (${tx},${ty}): erro angular decodificado-vs-analítico = ${erro.toFixed(3)}°`);
}

// ------------------------------------------------------------
// 8. Alinhamento visual (opcional): hillshade da altura sobre a cor
// ------------------------------------------------------------
if (CAMINHO_ALINHAMENTO) {
  console.log('gerando imagem de alinhamento...');
  function normalizarVec(x, y, z) {
    const n = Math.hypot(x, y, z) || 1;
    return { x: x / n, y: y / n, z: z / n };
  }
  const luzDirecao = normalizarVec(-0.5, 0.5, 0.7);
  const hillBuf = Buffer.alloc(NRM_W * NRM_H * 3);
  for (let j = 0; j < NRM_H; j++) {
    for (let i = 0; i < NRM_W; i++) {
      const n = normalAnaliticaEm(metros, NRM_W, NRM_H, R_M, i, j);
      const sombreado = Math.max(0, n.x * luzDirecao.x + n.y * luzDirecao.y + n.z * luzDirecao.z);
      const luzFinal = 0.3 + 0.7 * sombreado;
      const k = (j * NRM_W + i) * 3;
      hillBuf[k] = Math.max(0, Math.min(255, Math.round(corBuf[k] * luzFinal)));
      hillBuf[k + 1] = Math.max(0, Math.min(255, Math.round(corBuf[k + 1] * luzFinal)));
      hillBuf[k + 2] = Math.max(0, Math.min(255, Math.round(corBuf[k + 2] * luzFinal)));
    }
  }
  const alturaJpg = Math.round((NRM_H / NRM_W) * 1200);
  await sharp(hillBuf, { raw: { width: NRM_W, height: NRM_H, channels: 3 } })
    .resize(1200, alturaJpg)
    .jpeg({ quality: 90 })
    .toFile(CAMINHO_ALINHAMENTO);
  console.log(`  escrito: ${CAMINHO_ALINHAMENTO}`);
}

console.log(
  JSON.stringify(
    {
      rMin,
      rMax,
      escala,
      vies,
      quiralidadeKm: { maisX: rMaisX, menosX: rMenosX, poloNorte: rPoloNorte, poloSul: rPoloSul },
      espelhoLambda,
      numCrateras: crateraArrays.length,
      normalRmsGraus: rmsGraus,
      normalMaxGraus: maxGraus,
    },
    null,
    2
  )
);
console.timeEnd('total');
