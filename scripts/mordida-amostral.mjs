// Serve: dono — prova por amostra que teste velho ainda morde; o veredito é dele, nunca do script
//
// A mordida amostral (item 99). K testes de unidade por rodada, rotação
// determinística pela semana ISO sobre a lista ordenada; cada sujeito
// recebe UMA sabotagem textual por vez num worktree temporário e o teste
// tem de ficar vermelho. Teste que não morde nenhuma pede olho humano —
// este script NUNCA apaga nem enfraquece teste algum (o medo do dono é
// deriva silenciosa; alarme falso ocasional é aceitável, morte automática não).
// Um "não mordeu" pode ser RESPONDIDO no próprio teste com a linha
// `// Mordida: justificada — frase` (ex.: arquivo que pina defeitos
// pontuais de um sujeito enorme julgado em navegador): o veredito passa
// a informar sem reprovar — e avisa quando a justificativa envelhece.
//
//   node scripts/mordida-amostral.mjs            # K=3 da semana
//   node scripts/mordida-amostral.mjs 5          # K=5
//   node scripts/mordida-amostral.mjs --todos    # a lista inteira
//
// Fora do gate de commit de propósito (o gate fica rápido): roda no
// fechamento de etapa e quando o censo mandar.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const K_PADRAO = 3;

// ---------------------------------------------------------------- semana ISO
// Semanas ISO começam na segunda; 2024-01-01 foi uma segunda e ancora a
// contagem — o índice cresce 1 por semana, então semanas sucessivas
// avançam a janela e varrem a lista inteira.
const ANCORA_SEGUNDA_UTC = Date.UTC(2024, 0, 1);
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

export function indiceDaSemanaIso(data = new Date()) {
  const dia = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate());
  return Math.floor((dia - ANCORA_SEGUNDA_UTC) / SEMANA_MS);
}

export function rotuloDaSemanaIso(data = new Date()) {
  const t = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const dia = t.getUTCDay() || 7;
  // a quinta-feira da semana decide o ano ISO (semana 1 é a da 1ª quinta)
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const jan1 = Date.UTC(t.getUTCFullYear(), 0, 1);
  const semana = Math.ceil(((t.getTime() - jan1) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

// ------------------------------------------------------------------- amostra
/** Janela de k itens começando em indice*k (mod n): determinística e rotativa. */
export function escolherAmostra(lista, indice, k = K_PADRAO) {
  const n = lista.length;
  if (n === 0) return [];
  if (k >= n) return [...lista];
  const base = (((indice * k) % n) + n) % n;
  return Array.from({ length: k }, (_, i) => lista[(base + i) % n]);
}

export function lerArgumentos(argv) {
  const args = { todos: false, k: K_PADRAO };
  for (const a of argv) {
    if (a === '--todos') args.todos = true;
    else if (/^\d+$/.test(a) && Number(a) > 0) args.k = Number(a);
    else throw new Error(`argumento desconhecido: ${a} (use --todos ou um K inteiro > 0)`);
  }
  return args;
}

// ------------------------------------------------------------------ sujeitos
export function candidatosDeSujeito(teste) {
  const m = teste.match(/^(.*)\.test\.(ts|tsx|mjs|js)$/);
  if (!m) return [];
  const [, base, ext] = m;
  // .test.ts cobre módulo .ts e componente .tsx (padrão da casa, cf. tocados.mjs)
  return ext === 'ts' ? [`${base}.ts`, `${base}.tsx`] : [`${base}.${ext}`];
}

export function sujeitoDe(teste) {
  return candidatosDeSujeito(teste)[0] ?? null;
}

/** Mapa teste→sujeito com existência injetável (testável sem tocar disco). */
export function planejarAlvos(testes, existe) {
  return testes.map((teste) => ({
    teste,
    sujeito: candidatosDeSujeito(teste).find(existe) ?? null,
  }));
}

// ----------------------------------------------------------------- sabotagem
function trocaPrimeira(fonte, re, sub) {
  if (!re.test(fonte)) return null;
  const mutado = fonte.replace(re, sub);
  return mutado === fonte ? null : mutado;
}

// "return X" só de função exportada: aproximação textual — o primeiro
// return com expressão depois da primeira declaração `export function`.
function retornoSome(fonte) {
  const decl = fonte.match(/export\s+(?:default\s+)?(?:async\s+)?function\b/);
  if (!decl) return null;
  const cauda = fonte.slice(decl.index);
  const ret = cauda.match(/\breturn\s+(?!undefined\b)[^;\n]+/);
  if (!ret) return null;
  const inicio = decl.index + ret.index;
  return fonte.slice(0, inicio) + 'return undefined' + fonte.slice(inicio + ret[0].length);
}

/** Cada sabotagem devolve o fonte mutado, ou null quando não se aplica. */
export const MUTACOES = [
  // (?<!<)…(?![=<]) poupa os operadores <=, << e o << pelo segundo sinal
  { nome: 'primeiro < vira <=', aplicar: (f) => trocaPrimeira(f, /(?<!<)<(?![=<])/, '<=') },
  { nome: 'primeiro true vira false', aplicar: (f) => trocaPrimeira(f, /\btrue\b/, 'false') },
  {
    nome: 'primeiro + numérico vira -',
    // vizinhos de identificador/número/fechamento e nunca ++ nem +=
    aplicar: (f) => trocaPrimeira(f, /(?<!\+)([\w)\]]\s*)\+(?![+=])(\s*[\w(.])/, '$1-$2'),
  },
  { nome: 'primeiro return de função exportada vira undefined', aplicar: retornoSome },
];

// ------------------------------------------------------------------ veredito
export function agregarVeredito(tentativas) {
  return { morde: tentativas.some((t) => t.pegou), tentadas: tentativas.length };
}

// A resposta humana ao "não mordeu" mora no PRÓPRIO teste — aparece no
// diff, e envelhece à vista quando o teste volta a morder.
export const JUSTIFICATIVA_RE = /^\/\/ Mordida:\s*justificada\s+[—–-]\s+(\S.*)$/m;

export function lerJustificativa(fonte) {
  return fonte.match(JUSTIFICATIVA_RE)?.[1]?.trim() ?? null;
}

// -------------------------------------------------------------------- motor
function andar(dir, acc = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome === 'dist' || nome === '.git') continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) andar(caminho, acc);
    else acc.push(caminho);
  }
  return acc;
}

function listarTestesDeUnidade() {
  return andar(join(ROOT, 'src'))
    .filter((c) => c.endsWith('.test.ts'))
    .map((c) => relative(ROOT, c).replaceAll('\\', '/'))
    .sort();
}

function rodarVitest(wt, teste) {
  const r = spawnSync('npx', ['vitest', 'run', teste], {
    cwd: wt,
    stdio: 'ignore',
    env: { ...process.env, CI: '1' },
  });
  return r.status === 0;
}

function segundos(ms) {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

function main() {
  const args = lerArgumentos(process.argv.slice(2));
  const lista = listarTestesDeUnidade();
  const indice = indiceDaSemanaIso();
  const amostra = args.todos ? [...lista] : escolherAmostra(lista, indice, args.k);
  const escreve = (s) => process.stdout.write(`${s}\n`);

  escreve(`Mordida amostral — semana ${rotuloDaSemanaIso()} (índice ${indice}): ${amostra.length} de ${lista.length} testes`);

  const raiz = mkdtempSync(join(tmpdir(), 'mordida-'));
  const wt = join(raiz, 'arvore');
  let falhas = 0;
  let tMordida = 0;
  const t0 = Date.now();
  try {
    execFileSync('git', ['worktree', 'add', '--detach', wt, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
    symlinkSync(join(ROOT, 'node_modules'), join(wt, 'node_modules'), 'dir');
    const t1 = Date.now();

    const alvos = planejarAlvos(amostra, (s) => existsSync(join(wt, s)));
    for (const { teste, sujeito } of alvos) {
      if (!sujeito) {
        escreve(`  PULA ${teste} — sujeito ao lado não encontrado`);
        continue;
      }
      if (!rodarVitest(wt, teste)) {
        // vermelho sem sabotagem: a mordida não mede nada aqui
        escreve(`  PULA ${teste} — JÁ VERMELHO no HEAD sem sabotagem (conserte antes de medir)`);
        falhas += 1;
        continue;
      }
      const caminho = join(wt, sujeito);
      const original = readFileSync(caminho, 'utf8');
      const tentativas = [];
      try {
        for (const mutacao of MUTACOES) {
          const mutado = mutacao.aplicar(original);
          if (mutado === null) continue;
          writeFileSync(caminho, mutado);
          const pegou = !rodarVitest(wt, teste);
          tentativas.push({ nome: mutacao.nome, pegou });
          if (pegou) break;
        }
      } finally {
        writeFileSync(caminho, original);
      }
      const v = agregarVeredito(tentativas);
      const justificativa = lerJustificativa(readFileSync(join(wt, teste), 'utf8'));
      if (v.morde) {
        escreve(`  MORDE ${teste} — pegou "${tentativas.at(-1).nome}" em ${sujeito}`);
        if (justificativa) escreve(`        (a justificativa de mordida envelheceu — o teste voltou a morder; apagar a linha)`);
      } else if (justificativa) {
        escreve(`  NÃO MORDEU ${teste} — justificado: ${justificativa}`);
      } else {
        falhas += 1;
        escreve(
          v.tentadas === 0
            ? `  NÃO MORDEU ${teste} — nenhuma sabotagem se aplicou a ${sujeito}: pede olho humano`
            : `  NÃO MORDEU ${teste} — nenhuma das ${v.tentadas} sabotagens em ${sujeito}: pede olho humano — reforçar o teste ou justificar (linha \`// Mordida: justificada — …\` no próprio teste)`
        );
      }
    }
    tMordida = Date.now() - t1;
  } finally {
    try {
      execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' });
    } catch {
      rmSync(wt, { recursive: true, force: true });
      try {
        execFileSync('git', ['worktree', 'prune'], { cwd: ROOT, stdio: 'ignore' });
      } catch {
        /* melhor esforço: a árvore já foi apagada acima */
      }
    }
    rmSync(raiz, { recursive: true, force: true });
  }

  escreve(`tempo: ${segundos(tMordida)} de mordida (alvo < 1 min no K padrão) + worktree, total ${segundos(Date.now() - t0)}`);
  if (falhas > 0) {
    escreve(`${falhas} teste(s) pedem olho humano — a decisão é sua, nada foi apagado`);
    process.exit(1);
  }
  escreve('amostra da semana morde inteira');
}

const este = fileURLToPath(import.meta.url);
const chamado = process.argv[1] ? resolve(process.argv[1]) : '';
if (este === chamado) main();
