// Serve: dono — o custo dos testes tem teto e cada juiz declara a quem serve (item 99)
//
// O porteiro do censo. Cada teste e cada juiz responde "a quem sirvo":
// decisão do dono, lei física, ou chão de regressão — quem não responde
// REPROVA e sai listado. Juiz visual declara também o custo em minutos;
// a catraca soma os custos e compara com o teto pinado aqui: o total só
// desce ou fica — subir exige re-pinar o teto no mesmo commit.
//
//   node scripts/censo-dos-juizes.mjs
//
// Todos os números impressos derivam da varredura; nada decorado
// (regra anti-deriva da casa).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Teto por corrida de rodada visual — régua do item 57, segue de pé.
export const TETO_DA_RODADA_MIN = 15;

// A catraca do total: soma dos custos declarados de TODOS os juízes.
// O total só desce ou fica; subir exige re-pinar AQUI, no mesmo commit,
// com a justificativa (aposentou? fundiu?). Re-pinado na F1 do item 113
// — a verdade dos preços subiu o declarado (o ab-identidade dizia 7,1
// min de 54 vistas e são 60; o atlas-smoke desceu 7,4 → 7,3 medido).
// Re-pinado PARA BAIXO nas F2/F3 do item 113 (30/08): o ab-identidade
// caiu de 7,9 para 3,5 min medidos (corte de 10 vistas + captura
// adaptativa + sessão por balde + JOBS=6), e o teto desce os mesmos
// 4,4 — de 44,0 para 39,6.
// Re-pinado PARA BAIXO na F4 do item 113 (30/08): o MB1 caiu de 3,9
// para 1,8 min medidos (corte ii: 97 → 72 passos; três baldes
// paralelos), e o teto desce os mesmos 2,1 — de 39,6 para 37,5.
// Re-pinado PARA BAIXO na F5 do item 113 (30/08), tudo medido na mesma
// máquina: a11y 6,1→4,5 (recarga → mudança viva de ?ui=/viewport),
// busca-smoke 1,9→1,5 (espera por estado), filme-smoke 2,6→1,4
// (sentinela na 2ª largura + mesma sessão), filme-ritmo 2,3→1,4 (passo
// 4 s), memoria 2,9→2,1 (ciclos/focos 5→3) e atlas-smoke 7,3→6,5
// (manual 18→10 s) — 5,7 min a menos, e o teto desce os mesmos 5,7:
// de 37,5 para 31,8.
export const TETO_TOTAL_MIN = 31.8;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** dono = decisão dele; lei = física/contrato; chão = regressão. */
export const SERVE_RE = /^\/\/ Serve:\s*(dono|lei|chão)\s+[—–-]\s+\S+/m;

// Custo pt-BR: "X,X min" ou "~X,X min (…)" — o ~ marca estimado.
export const CUSTO_RE = /^\/\/ Custo:\s*(~?)\s*(\d+(?:,\d+)?)\s*min\b/m;

// Fora da exigência de Custo: não são juízes, são a bancada deles.
// fase-da-grade desceu de juiz a bancada no fechamento do 99: a soleira
// dele já é cobrada DENTRO da suíte (estabilidade-temporal.test.mjs);
// o standalone resta como impressor de tabela.
const FERRAMENTAS = new Set(['diff-pixel.mjs', 'gpu-profile.mjs', 'fase-da-grade.mjs']);
const HARNESS = new Set(['chrome.mjs']);

export const CLASSES = ['dono', 'lei', 'chão'];

function andar(dir, acc = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome === 'dist' || nome === '.git') continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) andar(caminho, acc);
    else acc.push(caminho);
  }
  return acc;
}

export function lerServe(fonte) {
  const m = fonte.match(SERVE_RE);
  if (!m) return null;
  return { classe: m[1], linha: m[0].slice(3) };
}

export function lerCusto(fonte) {
  const m = fonte.match(CUSTO_RE);
  if (!m) return null;
  return { minutos: Number(m[2].replace(',', '.')), estimado: m[1] === '~' };
}

function contarCasos(fonte) {
  const m = fonte.match(/(?:^|\n)\s*it\s*\(/g);
  return m ? m.length : 0;
}

function rel(caminho) {
  return relative(ROOT, caminho).replaceAll('\\', '/');
}

function entradaDe(caminho) {
  const fonte = readFileSync(caminho, 'utf8');
  const serve = lerServe(fonte);
  const r = rel(caminho);
  const base = r.split('/').pop();
  let papel = 'teste';
  if (r.startsWith('scripts/visual/') && r.endsWith('.mjs') && !r.endsWith('.test.mjs')) {
    if (HARNESS.has(base)) papel = 'harness';
    else if (FERRAMENTAS.has(base)) papel = 'ferramenta';
    else papel = 'juiz';
  }
  return {
    arquivo: r,
    papel,
    casos: r.endsWith('.test.ts') || r.endsWith('.test.mjs') ? contarCasos(fonte) : 0,
    serve: serve ? serve.classe : null,
    frase: serve ? serve.linha : null,
    custo: lerCusto(fonte),
  };
}

export function censo() {
  const todos = andar(join(ROOT, 'src')).concat(andar(join(ROOT, 'scripts')));
  const testes = todos
    .filter((c) => c.endsWith('.test.ts') || c.endsWith('.test.mjs'))
    .map(entradaDe)
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo));
  const visuais = todos
    .filter((c) => {
      const r = rel(c);
      return r.startsWith('scripts/visual/') && r.endsWith('.mjs') && !r.endsWith('.test.mjs');
    })
    .map(entradaDe)
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo));
  return { testes, visuais };
}

/** Os furos que reprovam: teste/juiz sem Serve; juiz sem Custo parseável. */
export function furos({ testes, visuais }) {
  const juizes = visuais.filter((v) => v.papel === 'juiz');
  return {
    semServe: [...testes, ...juizes].filter((e) => !e.serve).map((e) => e.arquivo),
    semCusto: juizes.filter((j) => !j.custo).map((j) => j.arquivo),
  };
}

export function quebraPorClasse(entradas) {
  const q = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  let semDono = 0;
  for (const e of entradas) {
    if (e.serve) q[e.serve] += 1;
    else semDono += 1;
  }
  return { ...q, semDono };
}

export function somaCustos(juizes) {
  let total = 0;
  let estimados = 0;
  for (const j of juizes) {
    if (!j.custo) continue;
    total += j.custo.minutos;
    if (j.custo.estimado) estimados += 1;
  }
  return { total, estimados };
}

/** soma > teto estoura; teto null = catraca desarmada, nada estoura.
 *  A comparação é em DÉCIMOS de minuto — a precisão das declarações —
 *  porque a soma binária de 43,3 chega como 43,300000000000004. */
export function julgarCatraca(totalMin, teto = TETO_TOTAL_MIN) {
  if (teto === null) return { armada: false, estoura: false };
  return { armada: true, estoura: Math.round(totalMin * 10) > Math.round(teto * 10) };
}

export function minutosPtBr(n) {
  return n.toFixed(1).replace('.', ',');
}

function main() {
  const { testes, visuais } = censo();
  const juizes = visuais.filter((v) => v.papel === 'juiz');
  const casos = testes.reduce((n, t) => n + t.casos, 0);
  const quebra = quebraPorClasse([...testes, ...juizes]);
  const { semServe, semCusto } = furos({ testes, visuais });
  const { total, estimados } = somaCustos(juizes);
  const catraca = julgarCatraca(total);

  const escreve = (s) => process.stdout.write(`${s}\n`);
  escreve(`Censo dos juízes (item 99) — teto da rodada visual: ${TETO_DA_RODADA_MIN} min`);
  escreve(`testes: ${testes.length} arquivos, ${casos} casos`);
  escreve(`juízes visuais: ${juizes.length} (harness/ferramentas fora da exigência de Custo: ${visuais.length - juizes.length})`);
  escreve(`por classe: dono ${quebra.dono} · lei ${quebra.lei} · chão ${quebra['chão']} · sem dono ${quebra.semDono}`);
  escreve(`custo declarado dos juízes: ${minutosPtBr(total)} min (${estimados} estimados)`);
  if (!catraca.armada) {
    escreve('catraca desarmada (armar no fechamento do item 99)');
  } else if (!catraca.estoura) {
    escreve(`catraca armada: ${minutosPtBr(total)} min dentro do teto de ${minutosPtBr(TETO_TOTAL_MIN)} min`);
  }

  for (const a of semServe) escreve(`SEM SERVE: ${a}`);
  for (const a of semCusto) escreve(`SEM CUSTO: ${a}`);
  if (catraca.estoura) {
    escreve(
      `CATRACA: ${minutosPtBr(total)} min estoura o teto de ${minutosPtBr(TETO_TOTAL_MIN)} min — ` +
        'juiz novo só entra aposentando ou fundindo alguém — ou re-pine o teto NO MESMO commit com a justificativa'
    );
  }

  if (semServe.length || semCusto.length || catraca.estoura) {
    escreve(
      `PORTEIRO REPROVA: ${semServe.length} sem Serve, ${semCusto.length} juiz(es) sem Custo` +
        (catraca.estoura ? ', catraca estourada' : '')
    );
    process.exit(1);
  }
  escreve('porteiro passa: todo teste e juiz com dono, todo juiz com custo');
}

const este = fileURLToPath(import.meta.url);
const chamado = process.argv[1] ? resolve(process.argv[1]) : '';
if (este === chamado) main();
