#!/usr/bin/env node

// ============================================================
// Otimiza as texturas do atlas: escada de reamostragem + WebP.
// Sucessor do optimize-textures.js do doador com as duas lições
// do checklist pré-fusão aplicadas:
//
//   - item 16: a seleção é por VARREDURA do diretório
//     public/textures/atlas/ — NUNCA allowlist manual. A lista
//     manual do doador tinha 3 nomes quando a auditoria achou
//     9 PNGs pesados servidos sem WebP (53 MB desperdiçados).
//   - item 17: guarda de pessimização — um .webp que não ficou
//     MENOR que a fonte é apagado; o runtime cai no original e
//     nunca se serve artefato maior que a fonte.
//
// E a emenda T-E7 do desenho da onda: o passo de REAMOSTRAGEM
// declarado. Para cada FONTE (`<canal>.<ext>`), a escada de
// variantes sai da LARGURA REAL MEDIDA pelo sharp — nunca do
// nome (a armadilha que cegou Júpiter/Urano no doador por três
// meses: `8k_jupiter.jpg` tem 4096 px). 8192→[4096,2048,1024],
// 4096→[2048,1024], 2048→[1024]; NUNCA upscale. A variante
// nasce `<canal>_<largura>.<ext>`; o número no nome é
// conveniência — o manifest e o verify medem de novo.
//
// DETERMINÍSTICO: mesma entrada → mesmos bytes. As garantias:
//   - travessia em ordem lexicográfica fixa;
//   - opções de encode FIXAS (jpeg q88 mozjpeg 4:4:4; png
//     compressionLevel 9 sem adaptiveFiltering; webp q88
//     effort 6 — as do doador, mantidas para comparabilidade);
//   - kernel de resize explícito (lanczos3);
//   - sem timestamp, sem cache por mtime (o doador pulava webp
//     "fresco" por mtime — aqui tudo se re-encoda idempotente);
//   - sharp/libvips PINADOS pelo package-lock; trocar a versão
//     do sharp PODE mudar bytes — regenerar manifest junto.
//
//   npm run data:texturas   (este script + gera-manifest)
// ============================================================

import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  alturaProporcional,
  analisarNomeDeTextura,
  degrausDaEscada,
  webpCompensa,
} from './lib-texturas.mjs';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);
const texturasRaiz = path.join(rootDirectory, 'public', 'textures', 'atlas');

// Opções de encode — FIXAS (bloco de determinismo do cabeçalho).
const OPCOES_JPEG = { quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' };
const OPCOES_PNG = { compressionLevel: 9, adaptiveFiltering: false };
const OPCOES_WEBP = { quality: 88, effort: 6 };

const megabytes = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;

/** Varredura recursiva ordenada — a MESMA disciplina do verify. */
async function listarArquivos(diretorio) {
  const resultado = [];
  const entradas = (await readdir(diretorio, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name, 'en')
  );
  for (const entrada of entradas) {
    const alvo = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) resultado.push(...(await listarArquivos(alvo)));
    else resultado.push(alvo);
  }
  return resultado;
}

async function main() {
  const todos = await listarArquivos(texturasRaiz);

  // ---- passo 1: escada de reamostragem, só a partir de FONTES.
  // Variante reamostrar variante acumularia perda de geração; a
  // escada inteira desce sempre da fonte cheia.
  const fontes = todos.filter(
    (arquivo) => analisarNomeDeTextura(path.basename(arquivo)).ehFonte
  );
  for (const fonte of fontes) {
    const meta = await sharp(fonte).metadata();
    const { canal, extensao } = analisarNomeDeTextura(path.basename(fonte));
    for (const degrau of degrausDaEscada(meta.width)) {
      const altura = alturaProporcional(meta.width, meta.height, degrau);
      const destino = path.join(path.dirname(fonte), `${canal}_${degrau}.${extensao}`);
      let cadeia = sharp(fonte).resize(degrau, altura, {
        fit: 'fill',
        kernel: 'lanczos3',
      });
      cadeia =
        extensao === 'png' ? cadeia.png(OPCOES_PNG) : cadeia.jpeg(OPCOES_JPEG);
      await cadeia.toFile(destino);
      const { size } = await stat(destino);
      console.log(
        `escada: ${path.relative(texturasRaiz, fonte)} ${meta.width}px → ` +
          `${path.relative(texturasRaiz, destino)} (${megabytes(size)}).`
      );
    }
  }

  // ---- passo 2: WebP por varredura — TODO jpg/png da árvore
  // (fontes E variantes recém-geradas), sem lista manual.
  let mantidos = 0;
  let descartados = 0;
  for (const arquivo of await listarArquivos(texturasRaiz)) {
    const { extensao } = analisarNomeDeTextura(path.basename(arquivo));
    if (extensao === 'webp') continue;
    const destino = arquivo.slice(0, -(extensao.length + 1)) + '.webp';
    await sharp(arquivo).webp(OPCOES_WEBP).toFile(destino);
    const bytesFonte = (await stat(arquivo)).size;
    const bytesWebp = (await stat(destino)).size;
    if (!webpCompensa(bytesFonte, bytesWebp)) {
      // Guarda de pessimização (item 17): apaga e o runtime usa o
      // original — nunca se embarca artefato maior que a fonte.
      await unlink(destino);
      descartados += 1;
      console.log(
        `webp descartado (não compensa): ${path.relative(texturasRaiz, arquivo)} ` +
          `${megabytes(bytesFonte)} → ${megabytes(bytesWebp)}.`
      );
      continue;
    }
    mantidos += 1;
    console.log(
      `webp: ${path.relative(texturasRaiz, destino)} ` +
        `${megabytes(bytesFonte)} → ${megabytes(bytesWebp)}.`
    );
  }

  console.log(
    `Escada gerada de ${fontes.length} fontes; webp: ${mantidos} mantidos, ` +
      `${descartados} descartados pela guarda. ` +
      'Agora: node scripts/data/atlas/gera-manifest-texturas.mjs.'
  );
}

await main();
