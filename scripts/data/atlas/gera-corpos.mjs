// ============================================================
// corpos.json — o conteúdo editorial dos 45 corpos do atlas.
//
// POR QUE EXECUTAR O DOADOR EM VEZ DE COPIAR À MÃO. A lição
// herdada do próprio atlas (derive-iau-orientation.js) é que
// transcrição por olho é como um número acaba no campo errado —
// lá era uma amplitude no argumento errado, aqui seria um fact
// de Encélado na ficha de Titã. Este script lê o arquivo do
// doador, faz DOIS retoques puramente textuais (remove a linha
// do import de tipo, que apontaria para um módulo que não
// existe fora do doador, e troca `import.meta.env.BASE_URL` por
// "/", porque .mjs puro não tem import.meta.env do Vite), grava
// o resultado num .ts temporário e o importa dinamicamente — o
// Node 25 executa TypeScript por type stripping. O JSON emitido
// é transcrição de fonte legível por máquina, nunca cópia humana.
//
// Se depois dos dois retoques sobrar QUALQUER outro import, o
// script explode em vez de silenciar: um import novo no doador
// significa que o pré-processamento precisa ser revisto, e
// remover linhas às cegas executaria um arquivo com semântica
// diferente da do doador.
//
// DETERMINÍSTICO de propósito: sem timestamp. Rodar de novo com
// o doador parado produz arquivo bit-idêntico — mesma disciplina
// do stars.bin da Onda 1a, para o diff do git mostrar só mudança
// de conteúdo real. A proveniência é o commit do doador, não a
// hora da máquina.
//
// CAMPO AUSENTE FICA AUSENTE. Miranda não tem records nem
// explorationMilestone no doador — inventar aqui fecharia em
// silêncio um trabalho editorial que é do dono (PLANO §4:
// redação de Miranda e tradução pt-BR = Onda 8). A ausência
// vira pendência nomeada em _pendencias, e o verify-assets
// cobra que a pendência continue verdadeira no dado. A chave
// `editorial.pt` só nascerá quando houver tradução.
//
//   node scripts/data/atlas/gera-corpos.mjs
//   ATLAS_DIR=/outro/caminho node scripts/data/atlas/gera-corpos.mjs
// ============================================================
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);
const atlasDirectory = process.env.ATLAS_DIR ?? '/Users/fgferre/Github/atlas-orbital';
const donorPath = path.join(atlasDirectory, 'src', 'data', 'celestialBodies.ts');
const outputPath = path.join(rootDirectory, 'public', 'data', 'atlas', 'corpos.json');

// ---- contagens esperadas: o mesmo contrato vive em verify-assets.mjs
const TOTAL_ESPERADO = 45;
const CONTAGENS_ESPERADAS = { star: 1, planet: 8, moon: 23, dwarf: 5, tno: 5, asteroid: 3 };

// ---- os 6 campos editoriais do PLANO §4, na ordem canônica do JSON
const CAMPOS_EDITORIAIS = [
  'description',
  'curiosity',
  'facts',
  'records',
  'explorationMilestone',
  'info',
];

// ---- pré-processamento textual (as DUAS únicas adaptações; qualquer
//      outra diferença entre doador e temporário é bug deste script)
let fonte = await readFile(donorPath, 'utf8');

// 1) a linha do import de tipo — cobre `import { type X }` e `import type { X }`,
//    e SÓ eles: um import de valor não casa aqui de propósito, para cair no
//    guarda abaixo em vez de ser removido às cegas
fonte = fonte.replace(
  /^import\s+(?:type\s+\{\s*[A-Za-z_$][\w$]*\s*\}|\{\s*type\s+[A-Za-z_$][\w$]*\s*\})\s+from\s+["'][^"']+["'];?[^\S\n]*\n/m,
  ''
);

// 2) o BASE_URL do Vite vira raiz literal
fonte = fonte.replaceAll('import.meta.env.BASE_URL', '"/"');

// 3) sobrou import? explode — nunca silencie. `\bimport\b` no início de
//    linha não morde "important" dentro das strings editoriais.
if (/^\s*import\b/m.test(fonte) || /\bimport\s*\(/.test(fonte) || /\bimport\.meta\b/.test(fonte)) {
  throw new Error(
    'celestialBodies.ts do doador tem import além do import de tipo esperado — ' +
      'o pré-processamento de gera-corpos.mjs precisa ser revisto, não silenciado.'
  );
}

// ---- executa o doador pré-processado (type stripping do Node 25)
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'gera-corpos-'));
let bodies;
try {
  const temporaryFile = path.join(temporaryDirectory, 'celestialBodies.ts');
  await writeFile(temporaryFile, fonte);
  ({ SOLAR_SYSTEM_BODIES: bodies } = await import(pathToFileURL(temporaryFile).href));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

if (!Array.isArray(bodies)) {
  throw new Error('SOLAR_SYSTEM_BODIES não é um array — o doador mudou de forma.');
}

// ---- extração: só identidade + editorial; campo ausente fica ausente
const corpos = bodies.map((body) => {
  if (typeof body.id !== 'string' || typeof body.type !== 'string') {
    throw new Error(`Corpo sem id/type no doador: ${JSON.stringify(body?.id)}.`);
  }
  if (typeof body.name?.en !== 'string' || typeof body.name?.pt !== 'string') {
    throw new Error(`Corpo "${body.id}" sem name.en/name.pt no doador.`);
  }
  const en = {};
  for (const campo of CAMPOS_EDITORIAIS) {
    if (body[campo] !== undefined) en[campo] = body[campo];
  }
  return {
    id: body.id,
    type: body.type,
    name: { en: body.name.en, pt: body.name.pt },
    editorial: { en },
  };
});

// ---- validação: contagens do PLANO §4 (45 corpos, nenhum fica para trás)
if (corpos.length !== TOTAL_ESPERADO) {
  throw new Error(`Esperados ${TOTAL_ESPERADO} corpos; o doador entregou ${corpos.length}.`);
}
const contagens = {};
for (const corpo of corpos) {
  contagens[corpo.type] = (contagens[corpo.type] ?? 0) + 1;
}
for (const [tipo, esperado] of Object.entries(CONTAGENS_ESPERADAS)) {
  if (contagens[tipo] !== esperado) {
    throw new Error(`Tipo "${tipo}": esperados ${esperado} corpos, obtidos ${contagens[tipo] ?? 0}.`);
  }
}
const tiposInesperados = Object.keys(contagens).filter((t) => !(t in CONTAGENS_ESPERADAS));
if (tiposInesperados.length > 0) {
  throw new Error(`Tipos fora do contrato: ${tiposInesperados.join(', ')}.`);
}
if (new Set(corpos.map((c) => c.id)).size !== corpos.length) {
  throw new Error('Há ids duplicados entre os corpos.');
}

const doadorCommit = execFileSync('git', ['-C', atlasDirectory, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();

const saida = {
  _fonte:
    'SOLAR_SYSTEM_BODIES de src/data/celestialBodies.ts (atlas-orbital) — ' +
    'campos editoriais migrados verbatim, em inglês',
  _proveniencia: {
    gerador: 'scripts/data/atlas/gera-corpos.mjs',
    doadorCommit,
  },
  _pendencias: [
    'tradução pt-BR integral dos campos editoriais — Onda 8, trabalho do dono',
    'miranda: redação editorial — sem records, sem explorationMilestone, facts com 1 item',
  ],
  corpos,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(saida, null, 2) + '\n');
console.log(
  `corpos.json: ${corpos.length} corpos (` +
    Object.entries(CONTAGENS_ESPERADAS)
      .map(([tipo, n]) => `${tipo} ${n}`)
      .join(', ') +
    `) — doador ${doadorCommit.slice(0, 7)}.`
);
