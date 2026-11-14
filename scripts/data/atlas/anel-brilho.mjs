// O BRILHO MEDIDO DO ANEL DE SATURNO (14/11/2026) — os três perfis radiais
// de brilho do modelo de anéis de Björn Jónsson ("A model of Saturn's
// rings", https://bjj.mmedia.is/data/s_rings/index.html) assados num binário
// só, na MESMA grade do `anel-saturno-perfil.bin` (`PERFIL_DO_ANEL` em
// `src/three/world/corpos/gigante.ts`: 2.048 caixas sobre 66.900–140.500 km).
//
//   node scripts/data/atlas/anel-brilho.mjs <pasta-dos-txt>
//
// A pasta tem `backscattered.txt`, `forwardscattered.txt` e `unlitside.txt`
// (13.177 linhas, um número 0–1 por linha, passo de 5 km a partir de
// 74.510 km); o sha256 de cada um é conferido antes de qualquer conta.
//
// O QUE O DADO NÃO TEM: cada perfil foi normalizado 0–1 pela fonte, então a
// RAZÃO entre retro, frente e lado sem luz se perdeu — o binário guarda só a
// ESTRUTURA radial de cada um. O nível vem do shader (âncora em `gigante.ts`).
//
// A REGRA DA CAIXA é a do perfil vizinho: o valor no CENTRO da caixa,
// interpolado linearmente entre as duas amostras de 5 km. Conferido no vão de
// Keeler: o perfil vizinho tem α = 0 na caixa 1.937 (centro 136.529 km), que
// cai dentro do zero de 136.500–136.530 km; a média da caixa não daria zero.
// Fora de 74.510–140.390 km não há dado: a caixa sai com A = 0.
//
// O FORMATO: 2048 × RGBA16 little-endian (16 KB). R = retro, G = frente,
// B = lado sem luz, cada um 0–65535 = 0–1; A = 65535 onde há dado, 0 fora.
// 16 bits e não 8 por causa do anel B: o retro tem 1.969 valores distintos
// na fonte, a diferença mediana entre caixas vizinhas do B é 0,0045 (pouco
// mais de um degrau de 8 bits) e 26 % delas cabem em meio degrau de 8 bits —
// sumiriam. O LIMITE DECLARADO é o da GPU, não o do arquivo: o app sobe o
// dado em meia-precisão (RGBA16F, filtrável sem extensão), degrau ≤ 2⁻¹¹ ≈
// 0,0005 entre 0,5 e 1 — oito vezes mais fino que o byte. A frente (241
// valores distintos) e o lado sem luz (382) já vêm grossos da fonte.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** a grade do `PERFIL_DO_ANEL` (gigante.ts) — tem de ser a mesma */
export const GRADE = Object.freeze({ caixas: 2048, kmInterno: 66900, kmExterno: 140500 });
/** a régua da fonte */
export const FONTE = Object.freeze({ kmInicial: 74510, passoKm: 5, amostras: 13177 });
/** na ordem dos canais R, G, B do binário */
export const ARQUIVOS = Object.freeze([
  { nome: 'backscattered.txt', sha256: 'b7fd2a735626019565195f2107e2dc38d08c839123efe82a46e6f1ef62e2e47f' },
  { nome: 'forwardscattered.txt', sha256: '7ca46db8590986e17dd5159a559b4d1f58dd147da0442deb844a604d4924da67' },
  { nome: 'unlitside.txt', sha256: 'b8cf5eb1d5d34292f4b1b89d8ae0ea7c3b4d5077ff65c71f766fbb25e883b850' },
]);
export const SAIDA = 'public/data/atlas/anel-saturno-brilho.bin';

/** um número por linha; linha vazia é ignorada, o resto tem de ser 0–1 */
export function leAmostras(texto) {
  const valores = texto
    .split(/\r?\n/)
    .filter((linha) => linha.trim() !== '')
    .map(Number);
  valores.forEach((v, i) => {
    if (!Number.isFinite(v) || v < 0 || v > 1) throw new Error(`linha ${i + 1}: ${v} fora de 0–1`);
  });
  return Float64Array.from(valores);
}

/**
 * As amostras de 5 km nas caixas da grade: o valor no centro da caixa por
 * interpolação linear; `NaN` onde o centro cai fora da régua da fonte.
 */
export function reamostraNasCaixas(amostras, fonte = FONTE, grade = GRADE) {
  const largura = (grade.kmExterno - grade.kmInterno) / grade.caixas;
  const caixas = new Float64Array(grade.caixas).fill(Number.NaN);
  for (let i = 0; i < grade.caixas; i++) {
    const s = (grade.kmInterno + (i + 0.5) * largura - fonte.kmInicial) / fonte.passoKm;
    if (s < 0 || s > amostras.length - 1) continue;
    const j = Math.min(Math.floor(s), amostras.length - 2);
    const t = s - j;
    caixas[i] = amostras[j] * (1 - t) + amostras[j + 1] * t;
  }
  return caixas;
}

/** três perfis já nas caixas (R, G, B) → o binário RGBA16 little-endian */
export function montaBinario(perfis) {
  const n = perfis[0].length;
  const buffer = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) {
    const temDado = perfis.every((p) => Number.isFinite(p[i]));
    for (let c = 0; c < 3; c++) {
      buffer.writeUInt16LE(temDado ? Math.round(perfis[c][i] * 65535) : 0, (i * 4 + c) * 2);
    }
    buffer.writeUInt16LE(temDado ? 65535 : 0, (i * 4 + 3) * 2);
  }
  return buffer;
}

/** lê e confere a pasta da fonte; devolve o binário pronto */
export function assaBrilhoDoAnel(pasta, arquivos = ARQUIVOS, fonte = FONTE, grade = GRADE) {
  const perfis = arquivos.map(({ nome, sha256 }) => {
    const cru = readFileSync(join(pasta, nome));
    const visto = createHash('sha256').update(cru).digest('hex');
    if (visto !== sha256) throw new Error(`${nome}: sha256 ${visto}, esperado ${sha256}`);
    const amostras = leAmostras(cru.toString('utf8'));
    if (amostras.length !== fonte.amostras) {
      throw new Error(`${nome}: ${amostras.length} amostras, esperado ${fonte.amostras}`);
    }
    return reamostraNasCaixas(amostras, fonte, grade);
  });
  return montaBinario(perfis);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pasta] = process.argv.slice(2);
  if (!pasta) {
    console.error('uso: anel-brilho.mjs <pasta com backscattered.txt, forwardscattered.txt, unlitside.txt>');
    process.exit(1);
  }
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const binario = assaBrilhoDoAnel(resolve(pasta));
  writeFileSync(join(raiz, SAIDA), binario);
  const comDado = binario.reduce((n, _, k) => n + (k % 8 === 6 && binario.readUInt16LE(k) > 0 ? 1 : 0), 0);
  console.log(
    `${SAIDA}: ${binario.length} B, ${comDado} de ${GRADE.caixas} caixas com dado, ` +
      `sha256 ${createHash('sha256').update(binario).digest('hex')}`
  );
}
