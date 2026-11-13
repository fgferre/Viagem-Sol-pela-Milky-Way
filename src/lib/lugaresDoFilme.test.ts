// Serve: dono — cada lugar do céu está onde o catálogo desenha as estrelas dele e a busca o acha nas duas línguas
// ============================================================
// OS LUGARES DO CÉU (céu profundo, 12/11/2026). Três promessas da
// tabela que só um teste segura: o centro de um aglomerado é a MÉDIA das
// estrelas-membro tal como o catálogo vivo as desenha (se o build do
// catálogo mover as Plêiades, o enquadramento erraria em silêncio); os
// apelidos das duas línguas levam ao lugar; e o foco publicado numa
// língua continua reconhecido depois da troca para a outra.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../three/config';
import { buscar, chaveDoFoco, construirIndice, resolverFoco } from './buscaEstrelas';
import type { LugarBuscavel } from './buscaEstrelas';
import { LUGARES_DO_FILME, foraDaViaLactea } from './lugaresDoFilme';

const meta = JSON.parse(
  readFileSync(new URL('../../public/data/stars_meta.json', import.meta.url), 'utf8')
) as { named: NamedStar[] };

const lugares: readonly LugarBuscavel[] = LUGARES_DO_FILME.map((l) => ({
  id: l.id,
  nome: l.nome,
  ...(l.nomeEn ? { nomeEn: l.nomeEn } : {}),
  d: 1,
  x: 0,
  y: 0,
  z: 1,
}));
const indice = construirIndice(meta.named, [], lugares);
const idDe = (consulta: string) => {
  const achado = resolverFoco(consulta, indice);
  return achado?.entrada.tipo === 'lugar' ? achado.entrada.lugar.id : null;
};

describe('os lugares do céu', () => {
  it('o centro de cada aglomerado é a média das membros no catálogo vivo', () => {
    for (const lugar of LUGARES_DO_FILME) {
      if (!lugar.membros) continue;
      const membros = lugar.membros.map((n) => meta.named.find((s) => s.n === n));
      expect(membros.every(Boolean), `${lugar.id}: membro fora do catálogo`).toBe(true);
      expect('pc' in lugar.alvo, `${lugar.id}: aglomerado sem centro fixo`).toBe(true);
      if (!('pc' in lugar.alvo)) continue;
      const media = [0, 0, 0];
      for (const s of membros as NamedStar[]) {
        media[0] += s.x / membros.length;
        media[1] += s.y / membros.length;
        media[2] += s.z / membros.length;
      }
      const erro = Math.hypot(
        media[0] - lugar.alvo.pc[0],
        media[1] - lugar.alvo.pc[1],
        media[2] - lugar.alvo.pc[2]
      );
      expect(erro, `${lugar.id}: centro escrito longe da média`).toBeLessThan(0.02);
    }
  });

  it('os apelidos das duas línguas levam ao lugar', () => {
    const casos: [string, string][] = [
      ['M45', 'pleiades'],
      ['Sete Irmãs', 'pleiades'],
      ['Seven Sisters', 'pleiades'],
      ['Plêiades', 'pleiades'],
      ['Híades', 'hyades'],
      ['M42', 'nebulosa-de-orion'],
      ['Orion Nebula', 'nebulosa-de-orion'],
      ['Via Láctea', 'via-lactea'],
      ['Milky Way', 'via-lactea'],
      ['Onde estamos', 'nosso-lugar'],
      ['Sgr dSph', 'ana-de-sagitario'],
      ['sagittarius-a', 'sagittarius-a'],
      ['LMC', 'grande-nuvem-de-magalhaes'],
      ['Grande Nuvem', 'grande-nuvem-de-magalhaes'],
      ['SMC', 'pequena-nuvem-de-magalhaes'],
      ['M31', 'andromeda'],
      ['Andromeda Galaxy', 'andromeda'],
    ];
    for (const [consulta, id] of casos) expect(idDe(consulta), consulta).toBe(id);
  });

  it('"andrômeda" acha a galáxia primeiro e as estrelas da constelação logo abaixo', () => {
    const r = buscar('Andrômeda', indice, 8);
    expect(r[0].entrada.tipo === 'lugar' && r[0].entrada.lugar.id).toBe('andromeda');
    expect(r.slice(1).some((x) => x.entrada.tipo === 'estrela')).toBe(true);
  });

  it('as vizinhas, e só elas, ficam fora da Via Láctea (a linha de contexto)', () => {
    expect(foraDaViaLactea('Galáxia de Andrômeda')).toBe(true);
    expect(foraDaViaLactea('Large Magellanic Cloud')).toBe(true);
    expect(foraDaViaLactea('Galáxia anã de Sagitário')).toBe(false);
    expect(foraDaViaLactea('Sirius')).toBe(false);
  });

  it('a anã de Sagitário está onde a galáxia a desenha', async () => {
    // o gerador lê a URL ao ser importado; aqui não há página
    (globalThis as { window?: unknown }).window ??= { location: { search: '' } };
    const { SGR_DWARF_POS } = await import('../three/world/geradorDaGalaxia');
    const { CENTRO_DA_ANA_DE_SAGITARIO } = await import('../three/world/lugaresDoCeu');
    expect(CENTRO_DA_ANA_DE_SAGITARIO.distanceTo(SGR_DWARF_POS)).toBeLessThan(1e-6);
  });

  it('a busca e a ficha dizem a MESMA distância, e uma vista não diz nenhuma', async () => {
    // a crítica de 12/11: a paleta media o vetor da cena (418 anos-luz
    // das Plêiades) e a ficha citava a literatura (444)
    (globalThis as { window?: unknown }).window ??= { location: { search: '' } };
    const { LUGARES_DA_BUSCA } = await import('../three/world/lugaresDoCeu');
    for (const naBusca of LUGARES_DA_BUSCA) {
      const linha = LUGARES_DO_FILME.find((l) => l.id === naBusca.id)!;
      const daFicha = linha.distanciaPc?.doSolAoCentro ? undefined : linha.distanciaPc?.valor;
      expect(naBusca.d, naBusca.id).toBe(daFicha);
    }
    const d = (id: string) => LUGARES_DA_BUSCA.find((l) => l.id === id)!.d;
    expect(d('pleiades')).toBe(136.2);
    expect(d('nosso-lugar')).toBeUndefined();
  });

  it('o foco publicado numa língua é reconhecido na outra', () => {
    expect(chaveDoFoco('Plêiades', indice)).toBe('pleiades');
    expect(chaveDoFoco('Pleiades', indice)).toBe('pleiades');
    expect(chaveDoFoco('Our place in the galaxy', indice)).toBe('nosso-lugar');
  });
});
