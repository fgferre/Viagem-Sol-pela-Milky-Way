// Serve: dono — os dez destinos da busca vazia resolvem para o alvo real, não para um nome parecido
// ============================================================
// A LISTA FECHADA (Lote 6, PLAN-UI.md §3.4), julgada contra as 1.726
// nomeadas do DADO VIVO (a mesma receita de `buscaEstrelas.test.ts`) —
// se o build do catálogo trocar Sirius, Betelgeuse ou Rigil Kentaurus
// de nome, é este arquivo que grita. Os CORPOS e o LUGAR entram à mão,
// como a FAMÍLIA de `buscaEstrelas.test.ts`: o que se julga aqui é a
// RESOLUÇÃO (o id certo, a categoria certa, a ordem certa), não a
// astrometria — por isso `rUA` e a geometria do lugar são de enfeite.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../three/config';
import { construirIndice } from './buscaEstrelas';
import type { CorpoBuscavel, LugarBuscavel } from './buscaEstrelas';
import { destinosDaBusca } from './destinosDaBusca';

const meta = JSON.parse(
  readFileSync(new URL('../../public/data/stars_meta.json', import.meta.url), 'utf8')
) as { named: NamedStar[] };
const nomeadas = meta.named;

const corpos: readonly CorpoBuscavel[] = [
  { id: 'earth', nome: 'Terra', nomeEn: 'Earth', classe: 'planeta', rUA: 1 },
  { id: 'moon', nome: 'Lua', nomeEn: 'Moon', classe: 'lua', rUA: Number.NaN, pai: 'earth' },
  { id: 'mars', nome: 'Marte', nomeEn: 'Mars', classe: 'planeta', rUA: 1.52 },
  { id: 'jupiter', nome: 'Júpiter', nomeEn: 'Jupiter', classe: 'planeta', rUA: 5.2 },
  { id: 'saturn', nome: 'Saturno', nomeEn: 'Saturn', classe: 'planeta', rUA: 9.58 },
  { id: 'pluto', nome: 'Plutão', nomeEn: 'Pluto', classe: 'anão', rUA: 39.5 },
];
// o centro galáctico — mesmo id de `LUGARES_DA_BUSCA` (useDirector.ts);
// a geometria não importa para quem resolve por texto
const sagitario: LugarBuscavel = {
  id: 'sagittarius-a',
  nome: 'Sagittarius A✱',
  d: 8178,
  x: 0,
  y: 0,
  z: -8178,
};
const indice = construirIndice(nomeadas, corpos, [sagitario]);

describe('destinosDaBusca', () => {
  const sistema = destinosDaBusca(indice, 'sistema');
  const estrelas = destinosDaBusca(indice, 'estrelas');
  const galaxia = destinosDaBusca(indice, 'galaxia');

  it('os dez resolvem para o CORPO, a ESTRELA ou o LUGAR certo, um a um', () => {
    const idsDeCorpo = sistema.map((d) => (d.entrada.tipo === 'corpo' ? d.entrada.corpo.id : null));
    expect(idsDeCorpo, 'algum destino do Sistema Solar não resolveu para o corpo certo').toEqual([
      'earth',
      'moon',
      'mars',
      'jupiter',
      'saturn',
      'pluto',
    ]);

    const nomesDeEstrela = estrelas.map((d) =>
      d.entrada.tipo === 'estrela' ? d.entrada.estrela.n : null
    );
    expect(
      nomesDeEstrela,
      'alguma estrela da lista fechada não resolveu para o nome certo'
    ).toEqual(['Sirius', 'Betelgeuse', 'Rigil Kentaurus']);

    const idsDeLugar = galaxia.map((d) => (d.entrada.tipo === 'lugar' ? d.entrada.lugar.id : null));
    expect(idsDeLugar, 'o centro galáctico não resolveu').toEqual(['sagittarius-a']);
  });

  it('as categorias contam 6/3/1', () => {
    expect(sistema.length).toBe(6);
    expect(estrelas.length).toBe(3);
    expect(galaxia.length).toBe(1);
  });

  it('o primeiro de cada categoria é o principal', () => {
    expect(sistema[0]?.id).toBe('earth');
    expect(estrelas[0]?.id).toBe('sirius');
    expect(galaxia[0]?.id).toBe('sagittarius-a');
  });
});
