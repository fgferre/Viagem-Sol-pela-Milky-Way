// ============================================================
// O MAPA DE NORMAIS DA LUA, assado do LDEM do LRO (item 140).
//
//   node scripts/data/atlas/gera-normal-da-lua.mjs
//   node scripts/data/atlas/gera-normal-da-lua.mjs --tif /caminho/ldem_16_uint.tif
//
// POR QUE ESTE SCRIPT EXISTE. Até o item 140 a Lua tinha só o mapa de
// COR, e o relevo dela era INVENTADO a partir dele (o bump por derivada
// do albedo da S2 do item 134): os mares escuros viravam buracos e os
// raios claros de Tycho viravam cristas. Palavras do dono: "não
// corresponde mais ao que observamos". O conserto é dado, não shader —
// a topografia da Lua é medida, pública e a melhor do Sistema Solar
// fora da Terra.
//
// A FONTE. `ldem_16_uint.tif` do CGI Moon Kit do NASA SVS
// (https://svs.gsfc.nasa.gov/4720), que é o SLDEM/LOLA da missão LRO
// reamostrado a 16 pixels por grau — 5760x2880, equiretangular, domínio
// público. É inteiro SEM SINAL de 16 bits, e a página declara a
// conversão: o dado foi deslocado em +20.000 para ficar positivo, e a
// unidade é 0,5 m sobre uma esfera de referência de 1737,4 km. Logo
//
//     altura_em_metros = (valor - 20000) * 0,5
//
// O TIF NÃO FICA NA ÁRVORE: ele é matéria-prima de 33 MB para um
// produto de alguns MB, e o script o apaga ao terminar quando foi ele
// quem baixou (`--manter` segura, para quem for reamostrar).
//
// A CONTA. Normal em ESPAÇO TANGENTE sobre a esfera equiretangular, na
// convenção que `normalDoMapa` (rochoso.ts, S2) já consome: x ao longo
// de +u (leste), y ao longo de +v (norte), z para fora. Para um campo
// de altura,
//
//     m = normalize(-dh/dLeste, -dh/dNorte, 1)
//
// com as derivadas em METROS POR METRO — as distâncias horizontais são
// as da esfera, não as do pixel: um passo em coluna vale
// R*cos(lat)*dLon e um passo em linha vale R*dLat. É isto que faz a
// amplitude ser FÍSICA: nenhum ganho entra aqui, e uma encosta de 8°
// no dado sai como 8° no mapa.
//
// O CLAMP DO POLO. `cos(lat)` vai a zero no polo e o passo leste some
// junto: na última linha de um mapa de 2048 os texels distam 2 m, e
// qualquer degrau de 1 m viraria uma parede. O denominador leste é
// preso no valor de 80° de latitude — acima disso a inclinação
// leste-oeste sai SUBESTIMADA, que é o preço declarado do
// equiretangular (e o próprio shader devolve a normal geométrica no
// polo, onde o frame degenera).
//
// A GUARDA DE ALINHAMENTO. O mapa de cor da Lua e o LDEM têm de estar
// na MESMA convenção de longitude, senão o relevo cai meia volta fora
// (o defeito que o item 138 achou nas luas de Saturno). A prova é a
// correlação entre altura e luminância do albedo: os mares são baixos E
// escuros, as terras altas são altas E claras, então a correlação tem
// de ser francamente POSITIVA. Medida em 720x360, ela dá +0,61 sem
// deslocamento nenhum; o script recusa a assar abaixo de +0,3.
// ============================================================

import { mkdir, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);

const URL_LDEM =
  'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16_uint.tif';

/** O deslocamento e a unidade que a página do SVS declara. */
const OFFSET_LDEM = 20000;
const METROS_POR_UNIDADE = 0.5;
/** A esfera de referência do LOLA, em metros. */
const RAIO_DA_LUA_M = 1737400;

/** Largura do mapa assado — a fonte da escada (2048/1024 saem dela). */
const LARGURA_ALVO = 4096;

/** Latitude onde o passo leste para de encolher (ver o cabeçalho). */
const LATITUDE_DO_CLAMP_RAD = (80 * Math.PI) / 180;

/** Piso da correlação altura x albedo que autoriza assar. */
const CORRELACAO_MINIMA = 0.3;

const megabytes = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;

/** O LDEM em metros, numa grade de `largura` x `largura/2`. */
async function lerAlturaEmMetros(tif, largura) {
  const altura = largura / 2;
  const { data } = await sharp(tif, { limitInputPixels: false })
    // sem isto o sharp entrega o TIFF de 16 bits rebaixado a 8 (medido:
    // a faixa inteira do LDEM colapsava em 26..132)
    .toColourspace('grey16')
    .resize(largura, altura, { fit: 'fill', kernel: 'lanczos3' })
    .raw({ depth: 'ushort' })
    .toBuffer({ resolveWithObject: true });
  const cru = new Uint16Array(data.buffer, data.byteOffset, largura * altura);
  const metros = new Float32Array(largura * altura);
  for (let k = 0; k < metros.length; k += 1) {
    metros[k] = (cru[k] - OFFSET_LDEM) * METROS_POR_UNIDADE;
  }
  return { metros, largura, altura };
}

/** Correlação de Pearson entre a altura e a luminância do mapa de cor. */
async function correlacaoComOAlbedo(tif, mapaDeCor, largura) {
  const { metros, altura } = await lerAlturaEmMetros(tif, largura);
  const alb = await sharp(mapaDeCor, { limitInputPixels: false })
    .resize(largura, altura, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();
  const n = largura * altura;
  let mh = 0;
  let ma = 0;
  for (let k = 0; k < n; k += 1) {
    mh += metros[k];
    ma += alb[k];
  }
  mh /= n;
  ma /= n;
  let num = 0;
  let dh = 0;
  let da = 0;
  for (let k = 0; k < n; k += 1) {
    const x = metros[k] - mh;
    const y = alb[k] - ma;
    num += x * y;
    dh += x * x;
    da += y * y;
  }
  return num / Math.sqrt(dh * da);
}

async function main() {
  const argv = process.argv.slice(2);
  const manter = argv.includes('--manter');
  const iTif = argv.indexOf('--tif');
  const destino = path.join(rootDirectory, 'public', 'textures', 'atlas', 'moon');
  const mapaDeCor = path.join(destino, 'map.jpg');
  if (!existsSync(mapaDeCor)) {
    throw new Error(`Sem o mapa de cor da Lua em ${mapaDeCor} — a guarda de alinhamento precisa dele.`);
  }

  let tif = iTif >= 0 ? path.resolve(argv[iTif + 1]) : '';
  let baixado = false;
  if (!tif) {
    tif = path.join(os.tmpdir(), 'ldem_16_uint.tif');
    if (!existsSync(tif)) {
      console.log(`baixando ${URL_LDEM} …`);
      const resposta = await fetch(URL_LDEM);
      if (!resposta.ok) throw new Error(`LDEM: HTTP ${resposta.status}`);
      const { writeFile } = await import('node:fs/promises');
      await writeFile(tif, Buffer.from(await resposta.arrayBuffer()));
      baixado = true;
    }
  }
  const meta = await sharp(tif, { limitInputPixels: false }).metadata();
  console.log(`LDEM: ${tif} — ${meta.width}x${meta.height}, ${meta.depth}.`);

  // ---- a guarda de alinhamento, ANTES de assar 8 milhões de pixels
  const r = await correlacaoComOAlbedo(tif, mapaDeCor, 720);
  console.log(`correlação altura x albedo (720x360): ${r.toFixed(4)}.`);
  if (!(r > CORRELACAO_MINIMA)) {
    throw new Error(
      `Correlação ${r.toFixed(4)} abaixo de ${CORRELACAO_MINIMA}: o LDEM e o ` +
        'mapa de cor não estão na mesma convenção de longitude — não asso.'
    );
  }

  const { metros, largura, altura } = await lerAlturaEmMetros(tif, LARGURA_ALVO);
  const dLon = (2 * Math.PI) / largura;
  const dLat = Math.PI / altura;
  const passoNorte = RAIO_DA_LUA_M * dLat;
  const passoLesteMinimo = RAIO_DA_LUA_M * Math.cos(LATITUDE_DO_CLAMP_RAD) * dLon;

  const rgb = Buffer.allocUnsafe(largura * altura * 3);
  let somaDeclive2 = 0;
  let maiorDeclive = 0;
  for (let j = 0; j < altura; j += 1) {
    const lat = Math.PI / 2 - ((j + 0.5) / altura) * Math.PI;
    const passoLeste = Math.max(
      RAIO_DA_LUA_M * Math.cos(lat) * dLon,
      passoLesteMinimo
    );
    const jNorte = Math.max(0, j - 1); // a linha de cima é o NORTE
    const jSul = Math.min(altura - 1, j + 1);
    // nos polos a diferença atravessa só uma linha, não duas
    const vaoNorte = (jSul - jNorte) * passoNorte;
    for (let i = 0; i < largura; i += 1) {
      const iLeste = (i + 1) % largura; // longitude dá a volta
      const iOeste = (i - 1 + largura) % largura;
      const dhLeste = (metros[j * largura + iLeste] - metros[j * largura + iOeste]) / (2 * passoLeste);
      const dhNorte = (metros[jNorte * largura + i] - metros[jSul * largura + i]) / vaoNorte;
      const x = -dhLeste;
      const y = -dhNorte;
      const inv = 1 / Math.sqrt(x * x + y * y + 1);
      const declive2 = x * x + y * y;
      somaDeclive2 += declive2;
      if (declive2 > maiorDeclive) maiorDeclive = declive2;
      const k = (j * largura + i) * 3;
      rgb[k] = Math.max(0, Math.min(255, Math.round((x * inv * 0.5 + 0.5) * 255)));
      rgb[k + 1] = Math.max(0, Math.min(255, Math.round((y * inv * 0.5 + 0.5) * 255)));
      rgb[k + 2] = Math.max(0, Math.min(255, Math.round((inv * 0.5 + 0.5) * 255)));
    }
  }

  const rms = Math.sqrt(somaDeclive2 / (largura * altura));
  console.log(
    `inclinação: RMS ${((Math.atan(rms) * 180) / Math.PI).toFixed(2)}°, ` +
      `máxima ${((Math.atan(Math.sqrt(maiorDeclive)) * 180) / Math.PI).toFixed(2)}° ` +
      `(amplitude FÍSICA, ganho 1,0 — nenhum exagero entra aqui).`
  );

  await mkdir(destino, { recursive: true });
  const saida = path.join(destino, 'normal.png');
  await sharp(rgb, { raw: { width: largura, height: altura, channels: 3 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(saida);
  const { size } = await stat(saida);
  console.log(`assado: ${path.relative(rootDirectory, saida)} ${largura}x${altura} (${megabytes(size)}).`);

  if (baixado && !manter) {
    await unlink(tif);
    console.log(`matéria-prima apagada: ${tif} (use --manter para segurá-la).`);
  }
  console.log('agora: node scripts/data/atlas/otimiza-texturas.mjs moon && node scripts/data/atlas/gera-manifest-texturas.mjs');
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
