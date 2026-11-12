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
import { chaveDoFoco, construirIndice, resolverFoco } from './buscaEstrelas';
import type { LugarBuscavel } from './buscaEstrelas';
import { LUGARES_DO_FILME } from './lugaresDoFilme';

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
    ];
    for (const [consulta, id] of casos) expect(idDe(consulta), consulta).toBe(id);
  });

  it('o foco publicado numa língua é reconhecido na outra', () => {
    expect(chaveDoFoco('Plêiades', indice)).toBe('pleiades');
    expect(chaveDoFoco('Pleiades', indice)).toBe('pleiades');
    expect(chaveDoFoco('Our place in the galaxy', indice)).toBe('nosso-lugar');
  });
});
