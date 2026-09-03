// ============================================================
// O GATE DOS DADOS, JULGADO COMO GATE (item 130, lista do §19).
//
// `verify-assets.mjs` é o cadeado que a F2 e a F4 do 130 inverteram: o
// inglês das fichas e o do manifesto de texturas DEIXARAM de ser
// proibidos no artefato e passaram a ser conferidos byte a byte contra
// a fonte. Um cadeado assim envelhece calado — ele passa verde tanto
// quando confere quanto quando não confere nada —, e por isso a única
// prova que vale é ADULTERAR o artefato e exigir que ele reprove.
//
// COMO, sem tocar no repositório: monta-se uma RAIZ ESPELHO em /tmp com
// `scripts/` copiado e todo o resto (public, src, docs) por atalho de
// arquivo, e só o arquivo sob julgamento é uma cópia adulterada. O
// script calcula a raiz dele a partir do próprio caminho, então roda
// contra o espelho sem saber. O repositório fica intocado, e uma queda
// no meio do teste não deixa artefato sujo para trás.
//
// Cada caso roda o gate INTEIRO (242 texturas, 328 mil estrelas) e
// custa ~0,3 s, porque as texturas entram por atalho e o sha delas sai
// dos mesmos bytes. Quatro casos: o gate verde no artefato de verdade
// (sem ele o espelho podia estar reprovando por outro motivo), o inglês
// da FICHA reescrito, o inglês da ficha APAGADO e o inglês do
// MANIFESTO apagado.
// ============================================================
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Espelha `origem` em `destino`: PASTA vira pasta de verdade, ARQUIVO
 * vira atalho. As pastas precisam ser reais porque o gate desce nelas
 * com `readdir({ withFileTypes: true })` e um atalho não se declara
 * pasta — com atalho de pasta o gate varria três pares .bin/.gz em vez
 * dos onze, e passava verde varrendo menos.
 *
 * `mutaveis` são os arquivos que o teste reescreve: ficam de fora, e
 * cada caso os grava como cópia.
 */
function espelhar(origem, destino, mutaveis = [], pular = []) {
  mkdirSync(destino, { recursive: true });
  for (const entrada of readdirSync(origem, { withFileTypes: true })) {
    const de = join(origem, entrada.name);
    const para = join(destino, entrada.name);
    if (pular.includes(de) || mutaveis.includes(de)) continue;
    if (entrada.isDirectory()) espelhar(de, para, mutaveis, pular);
    else symlinkSync(de, para);
  }
}

let espelho;

beforeAll(() => {
  espelho = mkdtempSync(join(tmpdir(), 'verify-assets-'));
  espelhar(
    join(RAIZ, 'public'),
    join(espelho, 'public'),
    [join(RAIZ, 'public/data/atlas/corpos.json'), join(RAIZ, 'public/data/atlas/texturas.json')]
  );
  // o script real, COPIADO: é o caminho dele que dá a raiz do gate
  cpSync(join(RAIZ, 'scripts'), join(espelho, 'scripts'), { recursive: true });
  // o resto da raiz por atalho — inclusive `node_modules`, sem o qual o
  // `sharp` some e o bloco de texturas morre antes de julgar nada
  for (const nome of ['src', 'docs', 'package.json', 'node_modules']) {
    symlinkSync(join(RAIZ, nome), join(espelho, nome));
  }
}, 120_000);

afterAll(() => {
  if (espelho) rmSync(espelho, { recursive: true, force: true });
});

/** Escreve os dois artefatos mutáveis do espelho e roda o gate. */
function rodar(mudar = (corpos, texturas) => ({ corpos, texturas })) {
  const corposCru = JSON.parse(readFileSync(join(RAIZ, 'public/data/atlas/corpos.json'), 'utf8'));
  const texturasCru = JSON.parse(
    readFileSync(join(RAIZ, 'public/data/atlas/texturas.json'), 'utf8')
  );
  const { corpos, texturas } = mudar(corposCru, texturasCru);
  writeFileSync(join(espelho, 'public/data/atlas/corpos.json'), JSON.stringify(corpos));
  writeFileSync(join(espelho, 'public/data/atlas/texturas.json'), JSON.stringify(texturas));
  try {
    const saida = execFileSync(
      process.execPath,
      [join(espelho, 'scripts/data/verify-assets.mjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return { ok: true, saida };
  } catch (erro) {
    return { ok: false, saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}` };
  }
}

describe('verify-assets — o cadeado do inglês', () => {
  it('o gate passa VERDE no artefato de verdade (o espelho é fiel)', () => {
    const r = rodar();
    expect(r.saida).toContain('pt-BR e inglês');
    expect(r.ok, r.saida.slice(-800)).toBe(true);
  }, 180_000);

  it('reprova o INGLÊS DA FICHA reescrito no artefato', () => {
    const r = rodar((corpos, texturas) => {
      const saturno = corpos.corpos.find((c) => c.id === 'saturn');
      saturno.editorial.en.description = 'Reescrito à mão, longe da fonte.';
      return { corpos, texturas };
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('saturn');
    expect(r.saida).toContain('o texto inglês em corpos.json não é');
  }, 180_000);

  it('reprova o INGLÊS DA FICHA APAGADO — a ficha em inglês ficaria em português', () => {
    const r = rodar((corpos, texturas) => {
      const saturno = corpos.corpos.find((c) => c.id === 'saturn');
      delete saturno.editorial.en;
      return { corpos, texturas };
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('sem editorial.en');
  }, 180_000);

  it('reprova o INGLÊS DO MANIFESTO de texturas apagado', () => {
    const r = rodar((corpos, texturas) => {
      const comOrigem = texturas.entradas.find((e) => e.origem?.licenca?.en);
      delete comOrigem.origem.licenca.en;
      return { corpos, texturas };
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('sem o inglês (item 130/F4)');
  }, 180_000);
});
