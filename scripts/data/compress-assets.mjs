// Gera .gz ao lado de cada .bin de public/data — o que o visitante baixa.
//
// O GitHub Pages comprime text/* e JSON na borda, mas NÃO comprime
// application/octet-stream: os .bin viajavam crus, e eles são 12,3 dos
// 13,3 MB do payload. O app busca `<arquivo>.bin.gz` e descomprime com
// DecompressionStream (ver fetchBinary em src/three/config.ts); os .bin
// crus continuam no lugar como fallback para navegador sem a API.
//
// Roda como último passo do `data:all` — asset novo ganha o .gz junto,
// e um .gz órfão (fonte sumiu) é apagado em vez de ficar mentindo.
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = resolve(ROOT, 'public/data');

const bins = [];
const orfaos = [];
(function varre(dir) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) varre(p);
    else if (nome.endsWith('.bin')) bins.push(p);
    else if (nome.endsWith('.bin.gz') && !existsSync(p.slice(0, -3))) orfaos.push(p);
  }
})(DATA);

let antes = 0;
let depois = 0;
for (const bin of bins) {
  const cru = readFileSync(bin);
  // nível máximo: roda uma vez por atualização de dados, é lido milhões
  const gz = gzipSync(cru, { level: 9 });
  writeFileSync(bin + '.gz', gz);
  antes += cru.length;
  depois += gz.length;
  console.log(
    `${(cru.length / 1048576).toFixed(2).padStart(6)} → ${(gz.length / 1048576)
      .toFixed(2)
      .padStart(5)} MB  ${bin.slice(ROOT.length + 1)}`
  );
}
for (const gz of orfaos) {
  rmSync(gz);
  console.log(`órfão removido: ${gz.slice(ROOT.length + 1)}`);
}
console.log(
  `\n${bins.length} ativos: ${(antes / 1048576).toFixed(1)} → ${(depois / 1048576).toFixed(1)} MB ` +
    `(−${(100 * (1 - depois / antes)).toFixed(0)}%)`
);
