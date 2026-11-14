// Serve: lei — o brilho medido do anel: amostra no centro da caixa, sem dado fora da régua da fonte, RGBA16 LE, e fonte com sha256 errado é recusada
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assaBrilhoDoAnel } from './anel-brilho.mjs';

// fonte de 5 amostras (100–120 km, passo 5) numa grade de 4 caixas de 10 km
// sobre 90–130 km: centros 95 (fora), 105, 115, 125 (fora)
const FONTE = { kmInicial: 100, passoKm: 5, amostras: 5 };
const GRADE = { caixas: 4, kmInterno: 90, kmExterno: 130 };
const TEXTOS = ['0\n0.2\n0.4\n0.6\n0.8\n', '1\n1\n0.5\n0\n0\n', '0.1\n0.1\n0.1\n0.1\n0.1\n'];

function pastaSintetica() {
  const pasta = mkdtempSync(join(tmpdir(), 'anel-brilho-'));
  const arquivos = TEXTOS.map((texto, i) => {
    const nome = `p${i}.txt`;
    writeFileSync(join(pasta, nome), texto);
    return { nome, sha256: createHash('sha256').update(texto).digest('hex') };
  });
  return { pasta, arquivos };
}

describe('brilho medido do anel', () => {
  it('interpola no centro da caixa, zera fora da fonte e grava RGBA16 little-endian', () => {
    const { pasta, arquivos } = pastaSintetica();
    const bin = assaBrilhoDoAnel(pasta, arquivos, FONTE, GRADE);
    const u16 = Array.from({ length: 16 }, (_, k) => bin.readUInt16LE(k * 2));
    // 105 km = amostra 1; 115 km = amostra 3
    const q = (v) => Math.round(v * 65535);
    expect(u16).toEqual([0, 0, 0, 0, q(0.2), q(1), q(0.1), 65535, q(0.6), 0, q(0.1), 65535, 0, 0, 0, 0]);
  });

  it('recusa a fonte cujo sha256 não bate', () => {
    const { pasta, arquivos } = pastaSintetica();
    const trocado = [{ ...arquivos[0], sha256: '0'.repeat(64) }, ...arquivos.slice(1)];
    expect(() => assaBrilhoDoAnel(pasta, trocado, FONTE, GRADE)).toThrow(/sha256/);
  });
});
