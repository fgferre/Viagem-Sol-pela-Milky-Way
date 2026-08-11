#!/usr/bin/env node

// ============================================================
// Retrato congelado dos planetas na época fixa da Onda 4 (D4).
//
// O QUE FAZ: lê `public/data/atlas/efemerides.bin` + o manifesto,
// monta o MotorEfemerides REAL (o mesmo módulo que o runtime usaria)
// e escreve `src/three/world/planetas/retrato2026.ts` com nove vetores
// heliocêntricos em UA, eclíptica média J2000, na época
// 2026-01-01T00:00:00Z.
//
// POR QUE UMA TABELA CONGELADA E NÃO UM FETCH. A Onda 4 desenha o
// sistema solar em ESCALA VERDADEIRA (D1) numa época FIXA (D4): o
// payload novo é ZERO byte — a efemerides.bin (785 kB) não é baixada
// pelo navegador. Nove vetores de float64 na fonte custam ~2 kB de
// bundle e dispensam rede, decode e cache. Tempo vivo (a efeméride
// consultada por quadro) é pendência declarada da Onda 5/6.
//
// POR QUE O MOTOR DE VERDADE, E NÃO UMA HERMITE REDIGITADA AQUI. O
// irmão `amostra-efemerides.mjs` reimplementa a Hermite de propósito
// (ele PRODUZ a tabela; o motor ainda não podia ser juiz de si mesmo).
// Aqui é o contrário: o dado já existe e a única coisa que interessa é
// que o retrato seja EXATAMENTE o que `MotorEfemerides` responde — o
// teste de proveniência (`retrato.test.ts`) recomputa do .bin em disco
// e cobra `Object.is` componente a componente. Redigitar a Hermite
// aqui criaria uma terceira cópia da fórmula para o teste reprovar.
//
// COMO UM .mjs IMPORTA UM .ts DA CASA (precedente novo, declarado). O
// irmão `gera-corpos.mjs` já executa TypeScript por type stripping do
// Node, mas o doador dele era um arquivo SEM imports relativos. O
// `efemerides.ts` puxa `./kepler`, `./registroOrbital` e `./time` sem
// extensão, e o resolvedor ESM do Node exige extensão. A ponte é
// `module.registerHooks` (Node ≥ 22.15, síncrono, em processo): um
// gancho de `resolve` que acrescenta `.ts` quando o pai é `.ts` e o
// arquivo existe. Sem cópia para temporário, sem bundler, sem
// dependência nova — e o módulo executado é LITERALMENTE o do `src`.
// (`tsconfig.app.json` liga `erasableSyntaxOnly`, então todo o `src`
// atravessa o type stripping sem transformação.)
//
// DETERMINÍSTICO de propósito, mesma disciplina de `gera-corpos.mjs`:
// SEM data de geração no cabeçalho. Rodar de novo com a mesma
// efemerides.bin produz arquivo BYTE-IDÊNTICO — o diff do git mostra
// só mudança de conteúdo real. A proveniência é o sha256 do .bin, não
// a hora da máquina.
//
// GATES QUE ESTE SCRIPT NÃO AFROUXA (ele explode em vez de emitir):
//   1. sha256 do .bin em disco tem de bater com o do manifesto.
//   2. `dateToTDB(new Date(EPOCA_ISO))` tem de dar EXATAMENTE
//      EPOCA_JD_TDB — se o modelo de ΔT de `time.ts` mudar, o literal
//      congelado deixa de ser o que a casa calcula e isso não pode
//      passar em silêncio.
//   3. Todo literal emitido tem de voltar em `Number()` ao MESMO
//      float64 (toPrecision(17) round-trip conferido um a um).
//
//   npm run data:planetas
// ============================================================

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);
const dataDirectory = path.join(rootDirectory, 'public', 'data', 'atlas');
const outputPath = path.join(
  rootDirectory,
  'src',
  'three',
  'world',
  'planetas',
  'retrato2026.ts'
);

// ---- a ponte .mjs → .ts (ver cabeçalho): só acrescenta a extensão que
//      o resolvedor ESM do Node exige e o TypeScript da casa omite.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts')) {
      const candidato = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidato))) {
        return { url: candidato.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

const { decodeEfemerides, MotorEfemerides } = await import(
  pathToFileURL(path.join(rootDirectory, 'src', 'lib', 'atlas', 'efemerides.ts')).href
);
const { dateToTDB } = await import(
  pathToFileURL(path.join(rootDirectory, 'src', 'lib', 'atlas', 'time.ts')).href
);

// ---- a época (D4): literal congelado, conferido contra o conversor
//      ÚNICO da casa. 2026-01-01 é a data mais recente com cobertura de
//      fixtures Horizons no repositório e cai funda na janela da tabela
//      (1950–2050), longe dos 80 s de armadilha da borda superior.
const EPOCA_ISO = '2026-01-01T00:00:00Z';
const EPOCA_JD_TDB = 2461041.5008692136;

// ---- os nove corpos do retrato, na ordem do Sol para fora. A Lua e os
//      20 satélites FICAM DE FORA (D3): sub-resolução na janela da onda
//      e resíduos Kepler de até 5,2° sem canal de honestidade — Onda 6.
const IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

// ---- gate 1: o .bin em disco é o que o manifesto carimba
const meta = JSON.parse(
  readFileSync(path.join(dataDirectory, 'efemerides_meta.json'), 'utf8')
);
const binNode = readFileSync(path.join(dataDirectory, 'efemerides.bin'));
const sha256 = createHash('sha256').update(binNode).digest('hex');
if (sha256 !== meta.sha256) {
  throw new Error(
    `efemerides.bin não é a do manifesto: sha256 em disco ${sha256}, ` +
      `manifesto ${meta.sha256}. Rode \`npm run data:atlas\` ou recupere o dado — ` +
      'não gere retrato de binário desconhecido.'
  );
}

// ---- gate 2: o literal da época É o que o conversor da casa calcula
const jdConferido = dateToTDB(new Date(EPOCA_ISO));
if (!Object.is(jdConferido, EPOCA_JD_TDB)) {
  throw new Error(
    `dateToTDB('${EPOCA_ISO}') = ${jdConferido}, mas o literal congelado é ` +
      `${EPOCA_JD_TDB}. O modelo de ΔT de src/lib/atlas/time.ts mudou — ` +
      'decida a época de novo em vez de reescrever o literal às cegas.'
  );
}

const bufferBin = binNode.buffer.slice(
  binNode.byteOffset,
  binNode.byteOffset + binNode.byteLength
);
const motor = new MotorEfemerides(decodeEfemerides(bufferBin, meta));

/**
 * Literal de float64 que volta EXATAMENTE ao mesmo número (gate 3).
 * 17 dígitos significativos é a garantia de round-trip de IEEE-754
 * binary64; a conferência existe porque "é garantido" não é medição.
 */
function literal(valor) {
  const texto = valor.toPrecision(17);
  if (!Object.is(Number(texto), valor)) {
    throw new Error(
      `toPrecision(17) não devolve ${valor} (virou ${Number(texto)} via "${texto}").`
    );
  }
  return texto;
}

const linhas = [];
const raios = [];
for (const id of IDS) {
  const p = motor.posicaoHeliocentrica(id, EPOCA_JD_TDB);
  // rUA por Math.hypot — o MESMO caminho que o teste recomputa. Trocar
  // por sqrt(x²+y²+z²) mudaria o último bit e quebraria o Object.is.
  const rUA = Math.hypot(p.x, p.y, p.z);
  raios.push(rUA);
  linhas.push(
    `  ${id}: {\n` +
      `    vetorUA: [${literal(p.x)}, ${literal(p.y)}, ${literal(p.z)}],\n` +
      `    rUA: ${literal(rUA)},\n` +
      `  },`
  );
}

const fonte = `// ============================================================
// GERADO por scripts/data/atlas/gera-retrato-planetas.mjs.
// NÃO EDITE À MÃO — regenere com \`npm run data:planetas\`.
//
// O retrato congelado da Onda 4 (D4): posição heliocêntrica dos nove
// corpos de tabela na época FIXA, em UA, eclíptica média J2000 — o
// mesmo frame e as mesmas unidades que \`MotorEfemerides\` responde.
// A cena consome isto por \`eclipticaParaEquatorial(v) × AU_PARA_PC\`
// (D1); PROIBIDO qualquer outro escalar de comprimento no caminho.
//
// PROVENIÊNCIA
//   fonte:   public/data/atlas/efemerides.bin (Hermite cúbica sobre
//            VSOP87D + Pluto-Meeus, amostrada por
//            scripts/data/atlas/amostra-efemerides.mjs)
//   sha256:  ${sha256}
//   motor:   src/lib/atlas/efemerides.ts — MotorEfemerides
//            .posicaoHeliocentrica(id, jdTdb)
//   época:   ${EPOCA_ISO} = JD ${EPOCA_JD_TDB} TDB
//            (\`dateToTDB\` de src/lib/atlas/time.ts, conferido na
//            geração e pinado em retrato.test.ts)
//   rUA:     Math.hypot(x, y, z) — o teste recomputa pelo mesmo
//            caminho e cobra Object.is
//
// SEM data de geração de propósito: regenerar com a mesma
// efemerides.bin devolve arquivo BYTE-IDÊNTICO.
// ============================================================

/** ${EPOCA_ISO}, o instante do retrato. */
export const EPOCA_ISO = '${EPOCA_ISO}';

/**
 * A época em Julian Date TDB. Literal congelado, nunca recalculado em
 * runtime (anti-padrão nº 6: nada de relógio na cena) — este arquivo
 * não constrói data nenhuma, e o teste de texto-fonte cobra isso. A
 * igualdade com o conversor da casa aplicado a EPOCA_ISO é pinada em
 * retrato.test.ts.
 */
export const EPOCA_JD_TDB = ${EPOCA_JD_TDB};

export interface RetratoCorpo {
  /** Heliocêntrico em UA, eclíptica média J2000. */
  readonly vetorUA: readonly [number, number, number];
  /** Distância heliocêntrica em UA — \`Math.hypot\` do vetor acima. */
  readonly rUA: number;
}

export const RETRATO_2026 = {
${linhas.join('\n')}
} as const satisfies Record<string, RetratoCorpo>;

/** Os nove corpos do retrato, do Sol para fora. */
export const IDS_RETRATO = [
${IDS.map((id) => `  '${id}',`).join('\n')}
] as const;

export type IdRetrato = (typeof IDS_RETRATO)[number];
`;

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, fonte);

IDS.forEach((id, i) => {
  console.log(`${id.padEnd(8)} r = ${raios[i].toFixed(6)} UA`);
});
console.log(
  `\nretrato2026.ts: ${IDS.length} corpos em ${EPOCA_ISO} ` +
    `(JD ${EPOCA_JD_TDB} TDB), efemerides.bin ${sha256.slice(0, 12)}….`
);
