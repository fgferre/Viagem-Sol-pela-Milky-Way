// Serve: chão — as estrelas do filme estelar estão onde o app as desenha, não onde o nome diz: a câmera que orbita Aldebaran orbita a estrela
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeStars, type StarsMeta } from '../../../config';
import { comAnfitrias } from '../../../../lib/exoplanetas';
import { indiceNoCatalogo } from '../../../director/estrelasNoQuadro';
import { ESTRELAS_DO_FILME } from './estrelas';

const DADOS = new URL('../../../../../public/data/', import.meta.url);
const meta = JSON.parse(readFileSync(new URL('stars_meta.json', DADOS), 'utf8')) as StarsMeta;
const bruto = readFileSync(new URL('stars.bin', DADOS));
const campo = decodeStars(bruto.buffer.slice(bruto.byteOffset, bruto.byteOffset + bruto.byteLength), meta);

describe('as estrelas do filme estelar', () => {
  it('cada uma é o ponto que o app desenha (ou a anfitriã, fora do catálogo), bit a bit', () => {
    const nomeadas = comAnfitrias(meta.named);
    for (const [nome, pino] of Object.entries(ESTRELAS_DO_FILME)) {
      const s = nomeadas.find((e) => e.n === nome);
      expect(s, nome).toBeDefined();
      const i = indiceNoCatalogo(campo.position, campo.logLum, s!, s!.d > 0 ? s!.m - 5 * Math.log10(s!.d) : NaN);
      const desenhada = i < 0 ? [s!.x, s!.y, s!.z] : [...campo.position.subarray(i * 3, i * 3 + 3)];
      expect(pino.toArray(), nome).toEqual(desenhada);
    }
  });
});
