// Serve: dono — no Ato 3 a câmera atravessa as Plêiades por dentro, chega às Híades olhando para elas e para atrás do grupo com Aldebaran à frente, e as legendas dizem as idades que o app conhece
// PLÊIADES E HÍADES (C1–C5), no relógio de Journey.at: a junta que vem de
// Órion, as travessias de frente, a passagem pelo miolo das Plêiades sem
// colar em estrela nenhuma, Aldebaran à frente das Híades no rumo de casa,
// as juntas sem salto e os números das legendas pelas tabelas do app.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { decodeStars, type StarsMeta } from '../../../../config';
import { LUGARES_DO_FILME } from '../../../../../lib/lugaresDoFilme';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { JD_DO_FILME_ESTELAR_TDB, montarFilmeEstelar } = await import('../montar');
const { Journey } = await import('../../../journey');
const { ESTRELAS_DO_FILME } = await import('../estrelas');
const { PONTOS_DAS_JUNTAS } = await import('./juntas');

const filme = montarFilmeEstelar();
const journey = new Journey(filme.shots, filme.starts);
const graus = THREE.MathUtils.radToDeg;
const NOMES = ['rumoAsPleiades', 'dentroDasPleiades', 'rumoAsHiades', 'hiadesDeCima', 'aLaranja'];
const lugar = (id: string) => LUGARES_DO_FILME.find((l) => l.id === id)!;
const centro = (id: string) => new THREE.Vector3(...(lugar(id).alvo as { pc: [number, number, number] }).pc);
const PLEIADES = centro('pleiades');
const HIADES = centro('hyades');
const ALDEBARAN = ESTRELAS_DO_FILME.Aldebaran;

const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { i, shot: filme.shots[i], inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur };
};
/** os instantes de um plano, a cada 1/30 s (o último um nada antes do fim) */
const instantes = (nome: string) => {
  const { inicio, fim } = plano(nome);
  return Array.from({ length: Math.round((fim - inicio) * 30) + 1 }, (_, n) => Math.min(inicio + n / 30, fim - 1e-9));
};
const frente = (t: number) => {
  const a = journey.at(t);
  return a.look.clone().sub(a.pos).normalize();
};
/** o maior ângulo entre o olhar e o rumo do movimento num plano */
const maiorDesvio = (nome: string) => {
  let maior = 0;
  const ts = instantes(nome);
  for (let n = 0; n < ts.length - 1; n++) {
    const passo = journey.at(ts[n + 1]).pos.sub(journey.at(ts[n]).pos);
    if (passo.length() > 0) maior = Math.max(maior, graus(passo.angleTo(frente(ts[n]))));
  }
  return maior;
};

describe('o Ato 3 no corte', () => {
  it('cinco planos, ~44 s, depois do prólogo e com o céu parado', () => {
    const { i } = plano(NOMES[0]);
    expect(filme.shots.slice(i, i + 5).map((s) => s.nome)).toEqual(NOMES);
    expect(filme.shots.slice(i, i + 5).reduce((a, s) => a + s.dur, 0)).toBe(44);
    for (const nome of NOMES) expect(filme.jdDoFilme(plano(nome).inicio + 1)).toBe(JD_DO_FILME_ESTELAR_TDB);
  });

  it('a junta de entrada: parado em saidaDeOrion, mirando as Plêiades, lente 40°', () => {
    const { shot } = plano('rumoAsPleiades');
    const pos = shot.pos(0, new THREE.Vector3());
    expect(pos.distanceTo(PONTOS_DAS_JUNTAS.saidaDeOrion)).toBeLessThan(1e-9);
    expect(graus(shot.look(0, new THREE.Vector3()).sub(pos).angleTo(PLEIADES.clone().sub(pos)))).toBeLessThan(1e-6);
    expect(shot.fov0).toBe(40);
    expect(shot.ease!(0.001)).toBeLessThan(1e-4); // parte do repouso
  });

  it.each(NOMES.slice(1))('a junta que abre %s não salta de posição, de mira nem de lente', (nome) => {
    const { i } = plano(nome);
    const antes = filme.shots[i - 1];
    const depois = filme.shots[i];
    const p0 = antes.pos(1, new THREE.Vector3());
    const p1 = depois.pos(0, new THREE.Vector3());
    expect(p0.distanceTo(p1)).toBeLessThan(1e-9);
    const m0 = antes.look(1, new THREE.Vector3()).sub(p0);
    const m1 = depois.look(0, new THREE.Vector3()).sub(p1);
    expect(graus(m0.angleTo(m1))).toBeLessThan(0.01);
    expect(antes.fov1).toBe(depois.fov0);
  });
});

describe('as travessias olham para onde vão', () => {
  it.each([
    ['rumoAsPleiades', 3], // medido 1,3°
    ['dentroDasPleiades', 25], // a curva para as Híades: medido 22,4°
    ['rumoAsHiades', 20], // chega subindo: medido 17,7°
  ])('%s: o olhar fica a até %i° do rumo do movimento', (nome, limite) => {
    expect(maiorDesvio(nome)).toBeLessThan(limite);
  });

  it('a chegada às Híades mira o centro delas o plano inteiro', () => {
    for (const t of instantes('rumoAsHiades')) {
      const a = journey.at(t);
      expect(graus(frente(t).angleTo(HIADES.clone().sub(a.pos)))).toBeLessThan(1e-4);
    }
  });
});

describe('por dentro das Plêiades', () => {
  const DADOS = new URL('../../../../../../public/data/', import.meta.url);
  const meta = JSON.parse(readFileSync(new URL('stars_meta.json', DADOS), 'utf8')) as StarsMeta;
  const bruto = readFileSync(new URL('stars.bin', DADOS));
  const campo = decodeStars(bruto.buffer.slice(bruto.byteOffset, bruto.byteOffset + bruto.byteLength), meta);
  const perto: THREE.Vector3[] = [];
  for (let k = 0; k < campo.position.length / 3; k++) {
    const p = new THREE.Vector3(...campo.position.subarray(3 * k, 3 * k + 3));
    if (p.distanceTo(PLEIADES) < 8) perto.push(p);
  }

  it('nenhuma estrela do catálogo a menos de 0,3 pc da câmera', () => {
    let menor = Infinity;
    for (const nome of ['rumoAsPleiades', 'dentroDasPleiades']) {
      for (const t of instantes(nome)) {
        const pos = journey.at(t).pos;
        for (const p of perto) menor = Math.min(menor, pos.distanceTo(p));
      }
    }
    expect(perto.length).toBeGreaterThan(50);
    expect(menor).toBeGreaterThan(0.3); // medido 0,37 pc
  });

  it('as quatro nomeadas passam a menos de 1 pc, dos dois lados e em cima e embaixo', () => {
    const { shot } = plano('dentroDasPleiades');
    expect(shot.target).toEqual(['Atlas', 'Alcyone', 'Merope', 'Taygeta']);
    const lados = new Set<string>();
    for (const nome of shot.target!) {
      const estrela = ESTRELAS_DO_FILME[nome];
      let melhor = { d: Infinity, t: 0 };
      for (const t of instantes('dentroDasPleiades')) {
        const d = journey.at(t).pos.distanceTo(estrela);
        if (d < melhor.d) melhor = { d, t };
      }
      expect(melhor.d, nome).toBeLessThan(1);
      const a = journey.at(melhor.t);
      const direita = new THREE.Vector3().crossVectors(frente(melhor.t), filme.cima).normalize();
      const cima = new THREE.Vector3().crossVectors(direita, frente(melhor.t));
      const rumo = estrela.clone().sub(a.pos);
      lados.add(rumo.dot(direita) > 0 ? 'direita' : 'esquerda');
      lados.add(rumo.dot(cima) > 0 ? 'em cima' : 'embaixo');
    }
    expect([...lados].sort()).toEqual(['direita', 'em cima', 'embaixo', 'esquerda']);
  });
});

describe('Aldebaran à frente das Híades', () => {
  it('ela está a 44 % do caminho Híades→Sol e a menos de 3° dessa reta', () => {
    const fracao = ALDEBARAN.length() / HIADES.length();
    expect(fracao).toBeGreaterThan(0.35);
    expect(fracao).toBeLessThan(0.55); // medido 0,44: "a meio caminho de casa"
    expect(graus(ALDEBARAN.angleTo(HIADES))).toBeLessThan(3);
  });

  it('no plano parado a câmera está atrás do grupo, com Aldebaran no centro do quadro', () => {
    const { inicio, fim } = plano('aLaranja');
    const a = journey.at((inicio + fim) / 2);
    expect(a.pos.length()).toBeGreaterThan(HIADES.length()); // atrás das Híades, vista de casa
    expect(a.pos.distanceTo(HIADES)).toBeLessThan(12);
    expect(graus(frente((inicio + fim) / 2).angleTo(ALDEBARAN.clone().sub(a.pos)))).toBeLessThan(1e-4);
    expect(graus(frente((inicio + fim) / 2).angleTo(a.pos.clone().negate()))).toBeLessThan(10); // o rumo de casa
    expect(journey.at(inicio + 0.5).pos.distanceTo(journey.at(fim - 0.5).pos)).toBe(0);
  });
});

describe('as legendas', () => {
  const legendas = NOMES.flatMap((n) => plano(n).shot.captions ?? []);
  const fato = (id: string, campo: string) => lugar(id).fatos!.find((f) => f.campo === campo)!.pt;

  it('subtexto com no máximo 12 palavras, nas duas línguas', () => {
    expect(legendas.length).toBe(3);
    for (const l of legendas) {
      for (const sub of [l.sub, l.en?.sub]) expect((sub ?? '').split(/\s+/).length, sub).toBeLessThanOrEqual(12);
      expect(l.en?.text, l.text).toBeTruthy();
    }
  });

  it('as idades das legendas são as da ficha de cada aglomerado', () => {
    const idade = (texto: string) => texto.match(/(\d+) milhões/)![1];
    const [pleiades, hiades] = legendas;
    expect(fato('pleiades', 'idade')).toContain(idade(pleiades.sub!)); // ≈ 112 milhões
    expect(fato('hyades', 'idade')).toContain(idade(hiades.sub!)); // ≈ 625 a 750 milhões
    expect(pleiades.en!.sub).toContain(idade(pleiades.sub!));
    expect(hiades.en!.sub).toContain(idade(hiades.sub!));
  });
});
