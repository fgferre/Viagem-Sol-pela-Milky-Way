// Serve: lei — as luas esculpidas na régua (PLAN-REGUA-UNICA.md, R2): a média por área do albedo de cada uma sai no p0 e nas razões medidas da tabela única, nenhuma cor passa de 1, e a tabela e a lista das esculpidas são as mesmas
import { describe, expect, it } from 'vitest';
import { REGUA_DOS_MAPAS, alvoDoMapa } from '../../../lib/atlas/reguaDosMapas';
import { FAMILIAS_DE_REGOLITO, IDS_ESCULPIDOS, coresNaRegua, criaGeometriaEsculpida, mediaDoRegolito } from './esculpido';

describe('as esculpidas na régua', () => {
  it('a média do albedo por área é p0 em G e p0·R/G, p0·B/G em R e B; nenhuma cor da família passa de 1', () => {
    for (const id of IDS_ESCULPIDOS) {
      const cores = coresNaRegua(id);
      const geo = criaGeometriaEsculpida(id);
      const media = mediaDoRegolito(geo, { ...FAMILIAS_DE_REGOLITO[id], ...cores });
      geo.dispose();
      const { p0, BG, RG } = alvoDoMapa(id);
      expect(media[1], id).toBeCloseTo(p0, 6);
      expect(media[0] / media[1], id).toBeCloseTo(RG, 6);
      expect(media[2] / media[1], id).toBeCloseTo(BG, 6);
      for (const cor of Object.values(cores)) for (const v of cor) expect(v, id).toBeLessThanOrEqual(1);
    }
  });

  it('os corpos `esculpido` da tabela única são exatamente os de IDS_ESCULPIDOS', () => {
    const daTabela = Object.keys(REGUA_DOS_MAPAS).filter((id) => REGUA_DOS_MAPAS[id].matiz === 'esculpido');
    expect([...daTabela].sort()).toEqual([...IDS_ESCULPIDOS].sort());
  });
});
