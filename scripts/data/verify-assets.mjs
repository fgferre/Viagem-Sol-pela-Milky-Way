import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './lib/binary.mjs';
import { heliocentricGalacticToProject } from './lib/galactic.mjs';
import { lerTabelasDaConfissao } from './atlas/lib-texturas.mjs';
import {
  decodeSpiralAnchors,
  evaluateSpiralModel,
} from './lib/spiral-fit.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicDirectory = path.join(rootDirectory, 'public');
const manifestPath = path.join(publicDirectory, 'data', 'galaxy', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const spiralModel = JSON.parse(
  await readFile(
    path.join(
      rootDirectory,
      'src',
      'three',
      'cartography',
      'spiralModel.json'
    ),
    'utf8'
  )
);

const coordinateCases = [
  { input: [0, 0, 100], expected: [8_050, 0, 5.5] },
  { input: [90, 0, 100], expected: [8_150, -100, 5.5] },
  { input: [270, 0, 100], expected: [8_150, 100, 5.5] },
  { input: [0, 90, 100], expected: [8_150, 0, 105.5] },
];
for (const { input, expected } of coordinateCases) {
  const actual = heliocentricGalacticToProject(...input);
  actual.forEach((value, index) => {
    if (Math.abs(value - expected[index]) > 1e-8) {
      throw new Error(
        `Transformação galáctica incorreta para (${input.join(', ')}): ` +
          `${actual.join(', ')}.`
      );
    }
  });
}

for (const [assetName, asset] of Object.entries(manifest.assets)) {
  const assetPath = path.join(publicDirectory, asset.file);
  const buffer = await readFile(assetPath);
  const expectedBytes = asset.count * asset.strideFloat32 * Float32Array.BYTES_PER_ELEMENT;
  if (buffer.byteLength !== expectedBytes || asset.byteLength !== expectedBytes) {
    throw new Error(
      `${assetName}: ${buffer.byteLength} bytes; manifest/schema exigem ${expectedBytes}.`
    );
  }
  if (sha256(buffer) !== asset.sha256) {
    throw new Error(`${assetName}: SHA-256 diverge do manifesto.`);
  }
  for (let offset = 0; offset < buffer.byteLength; offset += 4) {
    if (!Number.isFinite(buffer.readFloatLE(offset))) {
      throw new Error(`${assetName}: Float32 não finito no byte ${offset}.`);
    }
  }
}

// O DICIONÁRIO É DATA-DEPENDENTE E O RUNTIME TEM O CÓDIGO CRAVADO.
// `categoryDictionary` (lib/binary.mjs) ordena alfabeticamente os valores
// PRESENTES no snapshot WISE e numera a partir de 1 — então o código de
// cada classe depende de quais classes o catálogo trouxe. Do outro lado,
// `structureMap.ts` e `starForges.ts` decidem "região H II confirmada"
// com `Math.abs(classCode - 3) < 0.5`, um literal. Hoje bate; uma
// regeneração com catálogo que inclua uma classe ordenando antes de 'K'
// desloca todo mundo e o runtime passa a REBAIXAR as confirmadas em
// silêncio — nem o `expectedCount` do build nem este verify viam isso.
// Achado de auditoria externa (2026-08-12). Aqui ele grita.
if (manifest.dictionaries?.hiiClass?.['3'] !== 'K') {
  throw new Error(
    `hiiClass['3'] = ${JSON.stringify(manifest.dictionaries?.hiiClass?.['3'])}; ` +
      'esperado "K" (região H II confirmada). O código 3 está CRAVADO em ' +
      'src/three/cartography/structureMap.ts e src/three/world/starForges.ts — ' +
      'ou o dicionário volta a bater, ou os dois literais mudam junto.'
  );
}

// ============================================================
// OS ÍNDICES QUE O RUNTIME TEM CRAVADOS.
//
// Todo leitor de catálogo indexa Float32 por NÚMERO: `data[o + 4]`.
// Se uma regeneração mudar a ORDEM ou o CONJUNTO das colunas, o índice
// continua válido e devolve OUTRO campo — Float32 plausível, nenhum
// erro, imagem errada em silêncio. É a mesma armadilha do `hiiClass`
// logo acima, e foi o risco que a poda das colunas mortas (2026-08-21)
// obrigou a fechar: dois ativos trocaram de stride no mesmo dia.
//
// A tabela declara o contrato do lado do RUNTIME, independente do
// artefato gerado, e serve de censo: coluna que não aparece aqui é
// coluna que ninguém lê — a próxima candidata a sair.
// ============================================================
const INDICES_DO_RUNTIME = {
  // cartography/dustMap.ts
  dustDensity: [
    [0, 'xPc'], [1, 'yPc'], [2, 'zPc'],
    [3, 'particleDensityCm3'], [4, 'densityConfidence'],
  ],
  // world/observedClouds.ts + cartography/structureMap.ts
  largeMolecularClouds: [
    [0, 'xPc'], [1, 'yPc'], [2, 'zPc'], [3, 'radiusPc'],
    [4, 'particleDensityCm3'], [5, 'sigmaDensityCm3'],
    [6, 'heliocentricDistancePc'], [7, 'sigmaDistancePc'],
  ],
  molecularClouds: [
    [0, 'xPc'], [1, 'yPc'], [2, 'zPc'], [3, 'radiusPc'],
    [5, 'surfaceDensitySolarPerPc2'], [10, 'rendererRecommended'],
  ],
  // world/starForges.ts + cartography/structureMap.ts
  spiralAnchors: [
    [0, 'xPc'], [1, 'yPc'], [2, 'zPc'], [6, 'relativeParallaxError'],
  ],
  hiiRegions: [
    [0, 'xPc'], [1, 'yPc'], [2, 'zPc'], [3, 'radiusPc'],
    [6, 'relativeDistanceError'], [7, 'classCode'], [8, 'distanceMethodCode'],
  ],
  gaiaYoungClusters: [
    [0, 'xPc'], [1, 'yPc'], [2, 'zPc'], [6, 'relativeParallaxError'],
    [8, 'memberCount'], [9, 'brightMemberCount'],
  ],
  gaiaYoungCepheids: [
    [0, 'xPc'], [1, 'yPc'], [2, 'zPc'],
    [3, 'heliocentricDistancePc'], [4, 'sigmaDistancePc'],
  ],
  gaiaObProxyStars: [
    [0, 'xPc'], [1, 'yPc'], [2, 'zPc'], [3, 'sigmaDistancePc'],
    [4, 'photGMeanMag'], [5, 'effectiveTemperatureK'],
    [6, 'astrometricConfidence'],
  ],
};
for (const [nome, indices] of Object.entries(INDICES_DO_RUNTIME)) {
  const asset = manifest.assets[nome];
  if (!asset) throw new Error(`manifesto sem o ativo "${nome}".`);
  // `fields` só vale como contrato se descrever o registro INTEIRO
  if (asset.fields?.length !== asset.strideFloat32) {
    throw new Error(
      `${nome}: ${asset.fields?.length} campos declarados para stride ` +
        `${asset.strideFloat32} — o manifesto não descreve o registro.`
    );
  }
  for (const [indice, campo] of indices) {
    if (asset.fields[indice] !== campo) {
      throw new Error(
        `${nome}[${indice}] é "${asset.fields[indice]}"; o runtime lê esse ` +
          `índice como "${campo}". Ou o schema volta a bater, ou o leitor ` +
          'muda junto — offset errado devolve Float32 plausível e nada quebra.'
      );
    }
  }
}

const gaiaObAsset = manifest.assets.gaiaObProxyStars;
if (
  !gaiaObAsset ||
  gaiaObAsset.count < 80_000 ||
  gaiaObAsset.strideFloat32 !== 7
) {
  throw new Error(
    'Gaia OB proxy ausente, abaixo de 80.000 registros ou com stride inválido.'
  );
}
const gaiaObBuffer = await readFile(
  path.join(publicDirectory, gaiaObAsset.file)
);
for (
  let offset = 0;
  offset < gaiaObBuffer.byteLength;
  offset += gaiaObAsset.strideFloat32 * 4
) {
  const zPc = gaiaObBuffer.readFloatLE(offset + 2 * 4);
  const confidence = gaiaObBuffer.readFloatLE(offset + 6 * 4);
  if (Math.abs(zPc - 5.5) >= 300.01) {
    throw new Error(`Gaia OB proxy viola |Z| < 300 pc no byte ${offset}.`);
  }
  if (confidence < 0 || confidence > 1) {
    throw new Error(
      `Gaia OB proxy possui confiança fora de 0..1 no byte ${offset}.`
    );
  }
}

const spiralAnchorAsset = manifest.assets.spiralAnchors;
const spiralAnchorBuffer = await readFile(
  path.join(publicDirectory, spiralAnchorAsset.file)
);
const spiralAnchors = decodeSpiralAnchors(
  spiralAnchorBuffer,
  spiralAnchorAsset,
  manifest.dictionaries.maserArm
);
const spiralMetrics = evaluateSpiralModel(spiralModel, spiralAnchors);
const spiralGate = spiralModel.gate;
if (spiralMetrics.sampleCount !== spiralGate.expectedSampleCount) {
  throw new Error(
    `Fit BeSSeL usa ${spiralMetrics.sampleCount} âncoras; ` +
      `esperadas ${spiralGate.expectedSampleCount}.`
  );
}
if (
  spiralMetrics.medianResidualPc > spiralGate.maxMedianResidualPc ||
  spiralMetrics.p90ResidualPc > spiralGate.maxP90ResidualPc ||
  spiralMetrics.withinOneWidth < spiralGate.minWithinOneWidth
) {
  throw new Error(
    `Fit BeSSeL fora do gate: mediana ` +
      `${spiralMetrics.medianResidualPc.toFixed(1)} pc, p90 ` +
      `${spiralMetrics.p90ResidualPc.toFixed(1)} pc, ` +
      `${spiralMetrics.withinOneWidth} dentro de uma largura.`
  );
}

const [starBinary, starMetadataText] = await Promise.all([
  readFile(path.join(publicDirectory, 'data', 'stars.bin')),
  readFile(path.join(publicDirectory, 'data', 'stars_meta.json'), 'utf8'),
]);
const starMetadata = JSON.parse(starMetadataText);
if (starMetadata.format !== 'sc1') {
  throw new Error(`stars_meta.json com formato "${starMetadata.format}"; esperado "sc1".`);
}
if (starBinary.byteLength !== starMetadata.count * starMetadata.bytesPerStar) {
  throw new Error('stars.bin diverge de stars_meta.json.');
}
// o contrato que as cascas procedurais leem para NÃO repetir o catálogo
if (!(starMetadata.magLimit > 0) || !(starMetadata.horizonPc > 0)) {
  throw new Error('stars_meta.json sem magLimit/horizonPc — o corte das cascas fica cego.');
}
if (!starMetadata.sources?.every((s) => s.sha256 && s.license && s.url)) {
  throw new Error('stars_meta.json sem proveniência completa (url, licença, sha256).');
}
// a quantização é o único ponto onde o catálogo perde informação: se
// alguém apertar uma faixa em build-star-catalog.mjs, ela CLAMPA em
// silêncio e o erro explode. Aqui ele grita.
if (starMetadata.quantization.maxPositionErrorPc > 1) {
  throw new Error('Erro de posição da quantização acima de 1 pc.');
}
if (starMetadata.quantization.maxLogLumError > 0.001) {
  throw new Error('Erro de luminosidade da quantização acima de 0,001 dex.');
}
// Onda 1a/1g: toda nomeada carrega ci (é a lei de cor única — sem ele a
// hero volta à tabela por classe), e a identidade, quando presente, tem
// de ser plausível (HD/HIP inteiros positivos, Gliese com prefixo).
{
  const [ciMin, ciMax] = starMetadata.ranges.ci;
  for (const s of starMetadata.named) {
    if (!Number.isFinite(s.ci) || s.ci < ciMin - 0.5 || s.ci > ciMax + 0.5) {
      throw new Error(`Nomeada "${s.n}" sem ci plausível (${s.ci}).`);
    }
    if (s.hd !== undefined && (!Number.isInteger(s.hd) || s.hd <= 0)) {
      throw new Error(`Nomeada "${s.n}" com HD inválido (${s.hd}).`);
    }
    if (s.hip !== undefined && (!Number.isInteger(s.hip) || s.hip <= 0)) {
      throw new Error(`Nomeada "${s.n}" com HIP inválido (${s.hip}).`);
    }
    if (s.gl !== undefined && !/^(Gl|GJ|NN|Wo)\s/.test(s.gl)) {
      throw new Error(`Nomeada "${s.n}" com Gliese sem prefixo canônico ("${s.gl}").`);
    }
  }
  // âncora de regressão: se Sirius perder a identidade, o build quebrou
  const sirius = starMetadata.named.find((s) => s.n === 'Sirius');
  if (!sirius || sirius.hd !== 48915 || sirius.hip !== 32349) {
    throw new Error('Sirius sem HD 48915 / HIP 32349 — identidade do sidecar quebrada.');
  }
}

// Onda 2 (+ item 74, 2026-08-22): atlas/corpos — o editorial dos 45, agora
// com a ÓRBITA dos 38 alvos que orbitam alguma coisa.
// O contrato numérico (45 corpos, contagens por tipo) vive também em
// gera-corpos.mjs; aqui ele é cobrado no ARTEFATO publicado, para pegar
// edição manual do JSON ou gerador que mudou sem regenerar.
//
// E A FONTE ENTRA JUNTO. Cobrar só o artefato deixava passar a edição à mão
// do texto: quem reescrevesse uma frase dentro de `corpos.json` — sem tocar
// em `fonte/` e sem rodar o gerador — passava verde, e a tela mostrava prosa
// que fonte nenhuma respalda. Os dois arquivos da fonte são lidos aqui e o
// artefato é conferido CONTRA eles, campo a campo.
let corposDoc;
try {
  corposDoc = JSON.parse(
    await readFile(path.join(publicDirectory, 'data', 'atlas', 'corpos.json'), 'utf8')
  );
} catch (error) {
  throw new Error(
    `atlas/corpos.json ausente ou inválido (${error.message}) — ` +
      'rode node scripts/data/atlas/gera-corpos.mjs.'
  );
}
const corposFonteDir = path.join(rootDirectory, 'scripts', 'data', 'atlas', 'fonte');
let corposFonte;
let editorialPt;
try {
  corposFonte = JSON.parse(
    await readFile(path.join(corposFonteDir, 'corpos-fonte.json'), 'utf8')
  );
  editorialPt = JSON.parse(
    await readFile(path.join(corposFonteDir, 'editorial-pt.json'), 'utf8')
  );
} catch (error) {
  throw new Error(
    `atlas/corpos: a fonte do editorial não abriu (${error.message}) — ` +
      'scripts/data/atlas/fonte/{corpos-fonte,editorial-pt}.json.'
  );
}
const corpos = corposDoc.corpos;
// item 134/S3: as nove luas menores de Saturno somam-se às 45 (45→54,
// moon 23→32) — o mesmo contrato numérico vive em gera-corpos.mjs.
if (!Array.isArray(corpos) || corpos.length !== 54) {
  throw new Error(`atlas/corpos: esperados 54 corpos, obtidos ${corpos?.length ?? 0}.`);
}
{
  const contagensEsperadas = { star: 1, planet: 8, moon: 32, dwarf: 5, tno: 5, asteroid: 3 };
  const contagens = {};
  for (const corpo of corpos) {
    contagens[corpo.type] = (contagens[corpo.type] ?? 0) + 1;
  }
  for (const tipo of new Set([...Object.keys(contagensEsperadas), ...Object.keys(contagens)])) {
    if (contagens[tipo] !== contagensEsperadas[tipo]) {
      throw new Error(
        `atlas/corpos: tipo "${tipo}" com ${contagens[tipo] ?? 0} corpos; ` +
          `esperados ${contagensEsperadas[tipo] ?? 0}.`
      );
    }
  }
  if (new Set(corpos.map((c) => c.id)).size !== corpos.length) {
    throw new Error('atlas/corpos: há ids duplicados.');
  }
  for (const corpo of corpos) {
    if (typeof corpo.name?.en !== 'string' || typeof corpo.name?.pt !== 'string') {
      throw new Error(`atlas/corpos: corpo "${corpo.id}" sem name.en/name.pt.`);
    }
  }
  // a pendência de Miranda é nomeada (gate da Onda 2) e tem de continuar
  // VERDADEIRA no dado: se um dia a redação for feita, este guarda inverte
  // de função e manda remover a pendência — nunca as duas coisas ao mesmo
  // tempo, nunca nenhuma.
  if (!corposDoc._pendencias?.some((p) => typeof p === 'string' && p.includes('miranda'))) {
    throw new Error('atlas/corpos: _pendencias não nomeia "miranda".');
  }
  const miranda = corpos.find((c) => c.id === 'miranda');
  if (!miranda) {
    throw new Error('atlas/corpos: miranda ausente do catálogo.');
  }
  const mirandaNaFonte = corposFonte.corpos?.find((c) => c.id === 'miranda');
  if (
    mirandaNaFonte?.editorial?.en?.records !== undefined ||
    mirandaNaFonte?.editorial?.en?.explorationMilestone !== undefined
  ) {
    throw new Error(
      'atlas/corpos: miranda ganhou records/explorationMilestone — a pendência ' +
        'deixou de ser verdadeira; remova-a de fonte/corpos-fonte.json.'
    );
  }

  // ---- O CONTRATO NOVO (item 74, 2026-08-22): ÓRBITA E ALVO ------------
  // O JSON deixou de ser só editorial. Cada corpo é uma de duas coisas, e
  // nunca as duas nem nenhuma: ou tem ALVO nesta casa (e então tem órbita,
  // porque a ficha dele vai mostrá-la), ou é `semAlvo` (e então não tem
  // órbita nenhuma, porque ficha sem corpo na cena é promessa).
  const SEM_ALVO_ESPERADOS = ['gonggong', 'orcus', 'sedna', 'salacia', 'vanth', 'weywot'];
  const semAlvo = corpos.filter((c) => c.semAlvo === true).map((c) => c.id);
  if (semAlvo.join(',') !== SEM_ALVO_ESPERADOS.join(',')) {
    throw new Error(
      `atlas/corpos: os corpos sem alvo são [${semAlvo.join(', ')}]; ` +
        `esperados [${SEM_ALVO_ESPERADOS.join(', ')}].`
    );
  }
  if ((corposDoc._semAlvo ?? []).join(',') !== semAlvo.join(',')) {
    throw new Error(
      'atlas/corpos: _semAlvo no cabeçalho discorda das marcas nos corpos — ' +
        'o resumo do arquivo não pode divergir do dado dele.'
    );
  }
  if (
    !corposDoc._pendencias?.some(
      (p) => typeof p === 'string' && SEM_ALVO_ESPERADOS.every((id) => p.includes(id))
    )
  ) {
    throw new Error('atlas/corpos: _pendencias não nomeia os seis corpos sem alvo.');
  }

  const alvos = corpos.filter((c) => c.semAlvo !== true);
  // item 134/S3: as nove luas menores de Saturno são todas alvo (têm pai,
  // logo têm órbita) — 39→48.
  if (alvos.length !== 48) {
    throw new Error(`atlas/corpos: esperados 48 alvos, obtidos ${alvos.length}.`);
  }

  // ---- A LÍNGUA, E O CADEADO CONTRA A EDIÇÃO À MÃO ----------------------
  // A ficha mostra `editorial.pt` e mais nada, e o INGLÊS FICA NA FONTE. Isso
  // parte a cobrança em duas, e as duas moram aqui:
  //
  //  1. NA FONTE, a simetria en↔pt campo a campo. É ela que garante que
  //     nenhum fato ficou para trás na tradução — meia tradução é o modo
  //     silencioso de falhar, porque a linha some da tela sem dizer por quê.
  //  2. NO ARTEFATO, cada bloco `pt` conferido TEXTO POR TEXTO contra
  //     `editorial-pt.json`. É este o cadeado: prosa reescrita dentro de
  //     `corpos.json`, sem passar pela fonte nem pelo gerador, passava verde,
  //     e a tela mostrava frase que fonte nenhuma respalda.
  const CAMPOS_EDITORIAIS_PT = [
    'description',
    'curiosity',
    'facts',
    'records',
    'explorationMilestone',
    'info',
  ];
  const enDaFonte = new Map(
    (corposFonte.corpos ?? []).map((c) => [c.id, c.editorial?.en ?? {}])
  );
  let camposConferidos = 0;
  for (const corpo of alvos) {
    const en = enDaFonte.get(corpo.id);
    if (!en) {
      throw new Error(`atlas/corpos: alvo "${corpo.id}" não existe em corpos-fonte.json.`);
    }
    const daFonte = editorialPt.corpos?.[corpo.id];
    if (!daFonte) {
      throw new Error(
        `atlas/corpos: alvo "${corpo.id}" sem tradução em editorial-pt.json — ` +
          'a ficha dele ficaria muda.'
      );
    }
    for (const campo of CAMPOS_EDITORIAIS_PT) {
      const temEn = en[campo] !== undefined;
      const temPt = daFonte[campo] !== undefined;
      if (temEn !== temPt) {
        throw new Error(
          `atlas/corpos: "${corpo.id}", campo "${campo}": inglês ${temEn ? 'tem' : 'não tem'} ` +
            `e português ${temPt ? 'tem' : 'não tem'}.`
        );
      }
      if (!temEn) continue;
      if (Array.isArray(en[campo]) && daFonte[campo].length !== en[campo].length) {
        throw new Error(
          `atlas/corpos: "${corpo.id}", campo "${campo}": ${daFonte[campo].length} itens em pt ` +
            `contra ${en[campo].length} em en.`
        );
      }
      if (campo === 'explorationMilestone' && daFonte[campo].year !== en[campo].year) {
        throw new Error(
          `atlas/corpos: "${corpo.id}": ano da exploração ${daFonte[campo].year} em pt contra ` +
            `${en[campo].year} em en — a data é medida, não redação.`
        );
      }
    }
    // O CADEADO. Comparação pelo JSON dos dois lados: pega frase reescrita,
    // fato acrescentado, item de lista removido e campo inteiro inventado.
    const pt = corpo.editorial?.pt;
    if (!pt) {
      throw new Error(
        `atlas/corpos: alvo "${corpo.id}" sem editorial.pt — a ficha dele ficaria muda; ` +
          'rode npm run data:corpos.'
      );
    }
    for (const campo of new Set([...Object.keys(daFonte), ...Object.keys(pt)])) {
      if (JSON.stringify(pt[campo]) !== JSON.stringify(daFonte[campo])) {
        throw new Error(
          `atlas/corpos: "${corpo.id}", campo "${campo}": o texto em corpos.json não é o de ` +
            'editorial-pt.json — a fonte é o documento; rode npm run data:corpos.'
        );
      }
      camposConferidos++;
    }
    // O MESMO CADEADO PARA O INGLÊS (item 130/F2). A ficha em inglês lê este
    // bloco, então ele merece a mesma desconfiança que o pt: o texto tem de
    // ser, byte a byte, o `editorial.en` de `corpos-fonte.json` — que é o
    // ORIGINAL do dono, escrito no projeto doador, e não uma tradução de
    // volta a partir do pt.
    const ingles = corpo.editorial?.en;
    if (!ingles) {
      throw new Error(
        `atlas/corpos: alvo "${corpo.id}" sem editorial.en — a ficha em inglês dele ficaria ` +
          'em português; rode npm run data:corpos.'
      );
    }
    for (const campo of new Set([...Object.keys(en), ...Object.keys(ingles)])) {
      if (JSON.stringify(ingles[campo]) !== JSON.stringify(en[campo])) {
        throw new Error(
          `atlas/corpos: "${corpo.id}", campo "${campo}": o texto inglês em corpos.json não é ` +
            'o de corpos-fonte.json — a fonte é o documento; rode npm run data:corpos.'
        );
      }
      camposConferidos++;
    }
  }
  // E OS SEIS SEM ALVO NÃO TÊM EDITORIAL NENHUM: ficha que ninguém abre não
  // paga tradução, e a ausência aqui é a declaração.
  for (const corpo of corpos.filter((c) => c.semAlvo === true)) {
    if (corpo.editorial !== undefined) {
      throw new Error(
        `atlas/corpos: "${corpo.id}" é semAlvo e ganhou editorial — ninguém abre a ficha dele.`
      );
    }
  }
  // MAKEMAKE NÃO TEM MASSA e isso não é falta de tradução: o kernel
  // gm_de440 não o lista (SEM_GM_NO_KERNEL, em massas.ts), então a ficha
  // dele não escreve massa, gravidade nem escape. O que se cobra aqui é que
  // a PROSA dele esteja inteira — para que a ausência que sobrar na tela
  // seja a do kernel, e não a de um arquivo pela metade.
  const makemake = corpos.find((c) => c.id === 'makemake');
  if (!makemake?.editorial?.pt?.description || !makemake?.orbita) {
    throw new Error(
      'atlas/corpos: makemake sem prosa em pt ou sem órbita — a única ausência ' +
        'declarada dele é a massa (sem GM no kernel).'
    );
  }
  for (const corpo of alvos) {
    // O SOL É A ÚNICA EXCEÇÃO: ele é a origem e não orbita nada.
    if (corpo.id === 'sun') {
      if (corpo.orbita !== undefined) {
        throw new Error('atlas/corpos: o Sol ganhou órbita — ele é a origem.');
      }
      continue;
    }
    const o = corpo.orbita;
    if (
      !o ||
      !(o.periodoDias > 0) ||
      !(o.minUa > 0) ||
      !(o.maxUa >= o.minUa)
    ) {
      throw new Error(
        `atlas/corpos: "${corpo.id}" sem órbita utilizável (${JSON.stringify(o)}) — ` +
          'rode npm run data:corpos.'
      );
    }
  }
  // AS DUAS PONTAS DA ESCALA, cobradas no artefato: um número trocado de
  // lugar entre corpos é a classe de erro que uma varredura de forma não
  // pega, e um par de âncoras pega. Fobos leva 7,7 h para dar a volta em
  // Marte; Éris leva 558 anos para dar a volta no Sol.
  const porId = new Map(corpos.map((c) => [c.id, c]));
  const ancoras = [
    ['phobos', 0.3189, 0.001],
    ['earth', 365.26, 0.5],
    ['eris', 203816, 500],
  ];
  for (const [id, esperado, tolerancia] of ancoras) {
    const medido = porId.get(id)?.orbita?.periodoDias;
    if (medido === undefined || Math.abs(medido - esperado) > tolerancia) {
      throw new Error(
        `atlas/corpos: período de "${id}" é ${medido} dias, esperado ${esperado} ` +
          `± ${tolerancia} — a tabela de órbitas saiu do lugar.`
      );
    }
  }

  console.log(
    `atlas/corpos: ${camposConferidos} campos editoriais conferidos contra a fonte ` +
      `(${alvos.length} alvos, pt-BR e inglês), 0 divergentes.`
  );
}

// Onda 2: atlas/efemerides — tabelas Hermite geradas por
// amostra-efemerides.mjs. O auto-gate do gerador já lançou se o erro
// medido estourou; aqui o ARTEFATO publicado é cobrado de novo, para
// pegar .bin editado/corrompido, meta dessincronizado ou .gz velho.
{
  let efemeridesMeta;
  try {
    efemeridesMeta = JSON.parse(
      await readFile(
        path.join(publicDirectory, 'data', 'atlas', 'efemerides_meta.json'),
        'utf8'
      )
    );
  } catch (error) {
    throw new Error(
      `atlas/efemerides_meta.json ausente ou inválido (${error.message}) — ` +
        'rode npm run data:atlas.'
    );
  }
  const efemeridesBin = await readFile(
    path.join(publicDirectory, 'data', 'atlas', 'efemerides.bin')
  );
  if (sha256(efemeridesBin) !== efemeridesMeta.sha256) {
    throw new Error('atlas/efemerides.bin: SHA-256 diverge do manifesto.');
  }
  const { jdInicio, jdFim } = efemeridesMeta.janela ?? {};
  if (!Number.isFinite(jdInicio) || !Number.isFinite(jdFim) || jdFim <= jdInicio) {
    throw new Error('atlas/efemerides: janela (jdInicio/jdFim) não declarada.');
  }
  // Offsets e contagens coerentes com o tamanho: os blocos por corpo
  // têm de cobrir o buffer inteiro, sem furo nem sobreposição.
  const totalFloats = efemeridesBin.byteLength / 4;
  const blocos = Object.entries(efemeridesMeta.corpos).sort(
    ([, a], [, b]) => a.offsetFloats - b.offsetFloats
  );
  let cursor = 0;
  for (const [id, corpo] of blocos) {
    if (corpo.offsetFloats !== cursor) {
      throw new Error(
        `atlas/efemerides: "${id}" em offsetFloats ${corpo.offsetFloats}; ` +
          `esperado ${cursor} (furo ou sobreposição).`
      );
    }
    // A tabela precisa cobrir a janela inteira declarada.
    if ((corpo.n - 1) * corpo.passoDias < jdFim - jdInicio) {
      throw new Error(
        `atlas/efemerides: tabela de "${id}" (n=${corpo.n}, passo ` +
          `${corpo.passoDias} d) não cobre a janela declarada.`
      );
    }
    if (!(corpo.erroMedidoAu <= corpo.orcamentoErroAu)) {
      throw new Error(
        `atlas/efemerides: "${id}" com erro medido ${corpo.erroMedidoAu} AU ` +
          `acima do orçamento ${corpo.orcamentoErroAu} AU.`
      );
    }
    cursor += corpo.n * 6;
  }
  if (cursor !== totalFloats) {
    throw new Error(
      `atlas/efemerides: corpos somam ${cursor} floats; o .bin tem ${totalFloats}.`
    );
  }
  for (let offset = 0; offset < efemeridesBin.byteLength; offset += 4) {
    if (!Number.isFinite(efemeridesBin.readFloatLE(offset))) {
      throw new Error(`atlas/efemerides.bin: Float32 não finito no byte ${offset}.`);
    }
  }
  // (o `.gz` desta tabela é conferido junto com os outros, na varredura
  // de TODO `.bin` de public/data logo abaixo)
  console.log(
    `atlas/efemerides: ${blocos.length} corpos, ${(efemeridesBin.byteLength / 1048576).toFixed(2)} MB, ` +
      `pior interpolação ${Math.max(
        ...blocos.map(([, c]) => c.erroMedidoAu)
      ).toExponential(2)} AU dentro dos orçamentos.`
  );
}

// ============================================================
// TODO `.bin` TEM DE TER O `.gz` DELE, BIT-IDÊNTICO.
//
// O `.gz` é o que o visitante baixa: `fetchBinary` (src/three/config.ts)
// PREFERE o comprimido e só cai no cru se a API faltar. Até 2026-08-12
// só a efeméride era conferida — `stars.bin.gz` e os oito `galaxy/*.gz`
// passavam sem ninguém olhar. Consequência real: regenerar dados com
// `data:stars`/`data:galaxy` e esquecer o `data:pack` deixa um `.gz`
// velho no lugar; se a contagem não mudou, o check de byteLength do
// runtime passa e o app renderiza DADO VELHO com meta novo, sem erro.
// Achado de auditoria externa.
//
// A varredura é a MESMA do `compress-assets.mjs` (recursiva sobre
// public/data, todo `.bin`), de propósito: gate e gerador têm de
// enxergar exatamente o mesmo conjunto, ou um ativo novo nasce fora do
// alcance do gate.
// ============================================================
{
  const paresConferidos = [];
  const varrer = async (dir) => {
    for (const entrada of await readdir(dir, { withFileTypes: true })) {
      const alvo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        await varrer(alvo);
        continue;
      }
      if (!entrada.name.endsWith('.bin')) continue;
      const relativo = path.relative(publicDirectory, alvo);
      const cru = await readFile(alvo);
      let gz;
      try {
        gz = await readFile(`${alvo}.gz`);
      } catch {
        throw new Error(`${relativo}.gz ausente — rode npm run data:pack.`);
      }
      if (gz.byteLength >= cru.byteLength) {
        throw new Error(`${relativo}.gz não é menor que o .bin.`);
      }
      if (!gunzipSync(gz).equals(cru)) {
        throw new Error(
          `${relativo}.gz descomprime DIFERENTE do .bin — .gz velho; ` +
            'rode npm run data:pack.'
        );
      }
      paresConferidos.push(relativo);
    }
  };
  await varrer(path.join(publicDirectory, 'data'));
  // um .gz órfão (o .bin sumiu) também mente: o `compress-assets` o
  // apaga, e quem não rodou o packer fica com ele servindo dado de um
  // ativo que não existe mais
  const orfaos = [];
  const varrerOrfaos = async (dir) => {
    for (const entrada of await readdir(dir, { withFileTypes: true })) {
      const alvo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) await varrerOrfaos(alvo);
      else if (entrada.name.endsWith('.bin.gz') && !existsSync(alvo.slice(0, -3))) {
        orfaos.push(path.relative(publicDirectory, alvo));
      }
    }
  };
  await varrerOrfaos(path.join(publicDirectory, 'data'));
  if (orfaos.length) {
    throw new Error(`.gz órfão (sem .bin): ${orfaos.join(', ')} — rode npm run data:pack.`);
  }
  console.log(
    `${paresConferidos.length} pares .bin/.bin.gz bit-idênticos: ${paresConferidos.join(', ')}.`
  );
}

// ============================================================
// Onda 6 (F2a): texturas do atlas — manifest COMPLETO nos dois
// sentidos. (1) Toda entrada de texturas.json tem arquivo no
// disco com bytes, sha256 E dimensões batendo — as dimensões são
// RE-MEDIDAS pelo sharp aqui, nunca aceitas do nome do arquivo
// (a armadilha que cegou Júpiter/Urano no doador por três meses:
// `8k_jupiter.jpg` tinha 4096 px). (2) Todo arquivo em
// public/textures/atlas/ tem entrada — órfão QUEBRA, porque
// arquivo sem linha de manifest é textura sem licença/origem
// documentada, e a política do dono é: origem não resolvida
// entra MARCADA, nunca invisível.
//
// O PRECEDENTE DOS PARES .bin/.gz NÃO SE APLICA AQUI, de
// propósito: jpg e webp já são formatos comprimidos — um .gz
// deles seria pessimização (mais bytes e mais CPU pela mesma
// imagem). Ninguém estenda a varredura de pares para esta árvore.
// ============================================================
{
  let texturasDoc;
  try {
    texturasDoc = JSON.parse(
      await readFile(path.join(publicDirectory, 'data', 'atlas', 'texturas.json'), 'utf8')
    );
  } catch (error) {
    throw new Error(
      `atlas/texturas.json ausente ou inválido (${error.message}) — ` +
        'rode npm run data:texturas.'
    );
  }
  if (texturasDoc.formato !== 'texturas-atlas-v1') {
    throw new Error(`atlas/texturas: formato "${texturasDoc.formato}"; esperado "texturas-atlas-v1".`);
  }
  // sharp entra por import dinâmico: é devDependency do pipeline de
  // texturas e o erro tem de apontar o remédio, não um stack de resolução.
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error('sharp indisponível — rode npm install (devDependency do pipeline de texturas).');
  }
  const PROVENIENCIAS = ['medido', 'derivado', 'nao-resolvida'];
  const texturasRaiz = path.join(publicDirectory, 'textures', 'atlas');
  const conferidas = new Set();
  let totalBytes = 0;
  for (const entrada of texturasDoc.entradas) {
    const rotulo = `atlas/texturas["${entrada.arquivo}"]`;
    const caminho = path.join(publicDirectory, entrada.arquivo);
    let buffer;
    try {
      buffer = await readFile(caminho);
    } catch {
      throw new Error(`${rotulo}: arquivo ausente do disco — rode npm run data:texturas.`);
    }
    if (buffer.byteLength !== entrada.bytes) {
      throw new Error(
        `${rotulo}: ${buffer.byteLength} bytes; manifest declara ${entrada.bytes}.`
      );
    }
    if (sha256(buffer) !== entrada.sha256) {
      throw new Error(`${rotulo}: SHA-256 diverge do manifesto.`);
    }
    const meta = await sharp(buffer).metadata();
    if (meta.width !== entrada.larguraPx || meta.height !== entrada.alturaPx) {
      throw new Error(
        `${rotulo}: mede ${meta.width}x${meta.height}; manifest declara ` +
          `${entrada.larguraPx}x${entrada.alturaPx}.`
      );
    }
    if (!PROVENIENCIAS.includes(entrada.proveniencia)) {
      throw new Error(`${rotulo}: proveniência "${entrada.proveniencia}" desconhecida.`);
    }
    // Licença por entrada (política do dono): ou um nome de licença
    // real, ou a marca explícita 'nao-resolvida' — nunca vazio. E
    // licença que exige crédito (CC BY, USGS) sem texto de atribuição
    // é atribuição perdida — quebra.
    // BILÍNGUE desde o item 130/F4: as três frases que a ficha imprime
    // viajam como `{pt, en}`. O pt-BR continua sendo a régua de toda
    // guarda abaixo (é ele que a política e o ASSETS.md escrevem); o
    // inglês só precisa EXISTIR e não estar vazio — publicar uma ficha
    // em inglês com a linha em português seria o defeito que a F4 veio
    // fechar.
    const licenca = entrada.origem?.licenca;
    if (typeof licenca?.pt !== 'string' || licenca.pt === '') {
      throw new Error(`${rotulo}: origem.licenca ausente ou vazia.`);
    }
    for (const [campo, valor] of Object.entries(entrada.origem)) {
      if (campo === 'url' || valor === null) continue;
      if (typeof valor?.pt !== 'string' || valor.pt === '') {
        throw new Error(`${rotulo}: origem.${campo} sem o texto em pt-BR.`);
      }
      if (typeof valor.en !== 'string' || valor.en === '') {
        throw new Error(
          `${rotulo}: origem.${campo} sem o inglês (item 130/F4) — ` +
            'rode npm run data:texturas.'
        );
      }
    }
    if (
      (licenca.pt === 'nao-resolvida') !==
      (entrada.proveniencia === 'nao-resolvida')
    ) {
      throw new Error(
        `${rotulo}: licença e proveniência discordam sobre "nao-resolvida".`
      );
    }
    if (
      (/^CC BY/i.test(licenca.pt) || /USGS/i.test(licenca.pt)) &&
      !entrada.origem.atribuicao
    ) {
      throw new Error(`${rotulo}: licença "${licenca.pt}" exige atribuição redigida.`);
    }
    conferidas.add(path.normalize(caminho));
    totalBytes += entrada.bytes;
  }
  // Sentido 2: nenhum arquivo órfão na árvore.
  const orfaosDeTextura = [];
  const varrerTexturas = async (dir) => {
    for (const entrada of await readdir(dir, { withFileTypes: true })) {
      const alvo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) await varrerTexturas(alvo);
      else if (!conferidas.has(path.normalize(alvo))) {
        orfaosDeTextura.push(path.relative(publicDirectory, alvo));
      }
    }
  };
  await varrerTexturas(texturasRaiz);
  if (orfaosDeTextura.length) {
    throw new Error(
      `Texturas órfãs (sem entrada no manifest): ${orfaosDeTextura.join(', ')} — ` +
        'rode npm run data:texturas.'
    );
  }
  const naoResolvidas = texturasDoc.entradas.filter(
    (e) => e.proveniencia === 'nao-resolvida'
  ).length;

  // ---- A CONFISSÃO (itens 19 e 20, fechados em 22/08) -------------------
  // As frases que a ficha imprime nascem em `docs/reference/ASSETS.md` e
  // chegam ao artefato pelo gerador. Aqui o ARTEFATO é cobrado contra o
  // DOCUMENTO: um ASSETS editado sem regenerar o manifesto deixaria a tela
  // com o veredito velho, e essa é a divergência que ninguém vê acontecer.
  const assetsMd = await readFile(
    path.join(rootDirectory, 'docs', 'reference', 'ASSETS.md'),
    'utf8'
  );
  const notasNoManifesto = new Map();
  for (const e of texturasDoc.entradas) {
    if (e.nota) notasNoManifesto.set(`${e.corpo}/${e.canal}`, e.nota);
  }
  // AS DUAS LISTAS SAEM DO DOCUMENTO, e pela MESMA função que o gerador usa
  // (`lerTabelasDaConfissao`). Estavam escritas à mão aqui — quatro chaves de
  // imagem e quatro de forma —, e uma quinta linha legítima na tabela
  // reprovava o gate: o documento que é a fonte não podia crescer sem que
  // alguém se lembrasse de editar um `.mjs`. Agora crescer é só escrever a
  // linha, e o que o gate cobra é o manifesto BATER com ela.
  const confissao = lerTabelasDaConfissao(assetsMd, 'docs/reference/ASSETS.md');
  const CONFESSAM = [...confissao.imagem.keys()].sort();
  for (const chave of CONFESSAM) {
    const nota = notasNoManifesto.get(chave);
    if (!nota) {
      throw new Error(
        `atlas/texturas: "${chave}" perdeu a nota de defeito (item 19) — ` +
          'rode npm run data:texturas.'
      );
    }
    if (nota.pt !== confissao.imagem.get(chave)) {
      throw new Error(
        `atlas/texturas: a nota de "${chave}" no manifesto não é a do ASSETS.md — ` +
          'o documento é a fonte; rode npm run data:texturas.'
      );
    }
    if (typeof nota.en !== 'string' || nota.en === '') {
      throw new Error(
        `atlas/texturas: a nota de "${chave}" está sem inglês (item 130/F4) — ` +
          'rode npm run data:texturas.'
      );
    }
  }
  const ELIPSOIDES = [...confissao.forma.keys()].sort();
  const formas = texturasDoc.formas ?? {};
  if (Object.keys(formas).sort().join(',') !== ELIPSOIDES.join(',')) {
    throw new Error(
      `atlas/texturas: os corpos com forma confessada são [${Object.keys(formas).sort().join(', ')}]; ` +
        `o ASSETS.md diz [${ELIPSOIDES.join(', ')}] (item 20) — rode npm run data:texturas.`
    );
  }
  for (const [id, nota] of Object.entries(formas)) {
    if (nota.pt !== confissao.forma.get(id)) {
      throw new Error(
        `atlas/texturas: a forma de "${id}" não confere com o ASSETS.md ("${nota.pt}").`
      );
    }
    if (typeof nota.en !== 'string' || nota.en === '') {
      throw new Error(
        `atlas/texturas: a forma de "${id}" está sem inglês (item 130/F4) — ` +
          'rode npm run data:texturas.'
      );
    }
  }

  console.log(
    `atlas/texturas: ${texturasDoc.entradas.length} variantes conferidas ` +
      `(sha + dimensões medidas), ${(totalBytes / 1048576).toFixed(2)} MB, ` +
      `${naoResolvidas} com origem não resolvida, ` +
      `${CONFESSAM.length} defeitos e ${ELIPSOIDES.length} formas confessados.`
  );
}

console.log(
  `Dados verificados: ${Object.keys(manifest.assets).length} ativos galácticos, ` +
    `${starMetadata.count} estrelas de catálogo (${starMetadata.named.length} nomeadas, ` +
    `horizonte ${starMetadata.horizonPc} pc); fit BeSSeL ` +
    `${spiralMetrics.medianResidualPc.toFixed(1)} pc (p90 ` +
    `${spiralMetrics.p90ResidualPc.toFixed(1)} pc); atlas/corpos ${corpos.length} corpos.`
);
