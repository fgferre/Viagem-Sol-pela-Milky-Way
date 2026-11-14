// Serve: dono — o Ato 5 do filme estelar mostra o Sol passando como uma estrela qualquer, Próxima de perto com Alfa Centauri ao fundo, o rosto estimado de Próxima b, e TRAPPIST-1 com o relógio andando: g passa na frente da estrela e as órbitas se abrem com os planetas girando
// O ATO 5 no relógio de Journey.at, a cada 1/30 s: a câmera nunca salta numa
// junta nem entra numa estrela ou num planeta, cada quadro-motivo está no
// quadro (o Sol a um terço, o disco de Próxima, b e a estrela juntos, g na
// frente da estrela, as órbitas deitadas), e os números das legendas saem
// das tabelas do app.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { JD_DO_FILME_ESTELAR_TDB, montarFilmeEstelar } = await import('../montar');
const { Journey } = await import('../../../journey');
const { cimaDoFilme } = await import('../../../cameraRig');
const { ESTRELAS_DO_FILME } = await import('../estrelas');
const { PONTOS_DAS_JUNTAS } = await import('./juntas');
const { FICAM } = await import('./ficam');
const { UA, R_SOL } = await import('../../solar/atos/geometria');
const { estrelaVisitavelPorNome, raioDaEstrelaPc } = await import('../../../../../lib/atlas/estrelasVisitaveis');
const { exoplanetaPorId, sistemaDaEstrela } = await import('../../../../../lib/exoplanetas');
const { posicaoDoExoplanetaNaCena, raioDoPlanetaUa } = await import('../../../../world/exoplanetas');

const filme = montarFilmeEstelar();
const journey = new Journey(filme.shots, filme.starts);
type Amostra = ReturnType<InstanceType<typeof Journey>['at']>;
const graus = THREE.MathUtils.radToDeg;
const SOL = new THREE.Vector3();
const PROXIMA = ESTRELAS_DO_FILME['Proxima Centauri'];
const ALFA = ESTRELAS_DO_FILME['Rigil Kentaurus'];
const TRAPPIST = ESTRELAS_DO_FILME['TRAPPIST-1'];
const PLANOS = ['casaDeFora', 'chegadaAProxima', 'aVizinha', 'proximaB', 'paraTrappist', 'passagemDeG', 'osSeteGirando'];

const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { i, inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur, dur: filme.shots[i].dur };
};
/** os instantes de um trecho do corte, a cada 1/30 s (o último um nada antes do fim) */
const instantes = (de: number, ate: number) =>
  Array.from({ length: Math.round((ate - de) * 30) + 1 }, (_, n) => Math.min(de + n / 30, ate - 1e-9));
const ATO = { inicio: plano(PLANOS[0]).inicio, fim: plano(PLANOS[PLANOS.length - 1]).fim };

/** a base do quadro como o rig a monta: o cima do filme (cedendo no polo) e a rolagem do roteiro */
const POLO_FACE_ON = (() => {
  // o `perpendicularAoPolo` do rig: o polo cruzado com o eixo da base menos alinhado com ele
  const { x, y, z } = filme.cima;
  const eixo = new THREE.Vector3().setComponent(Math.abs(x) <= Math.abs(y) && Math.abs(x) <= Math.abs(z) ? 0 : Math.abs(y) <= Math.abs(z) ? 1 : 2, 1);
  return eixo.crossVectors(filme.cima, eixo).normalize();
})();
const quadro = ({ pos, look, fov, roll }: Amostra) => {
  const frente = look.clone().sub(pos).normalize();
  const cima0 = cimaDoFilme(filme.cima, POLO_FACE_ON, frente, new THREE.Vector3());
  const direita0 = new THREE.Vector3().crossVectors(frente, cima0).normalize();
  const cima1 = new THREE.Vector3().crossVectors(direita0, frente);
  // `camera.rotateZ(roll)`: a direita e o cima giram juntos em torno da visada
  const direita = direita0.clone().multiplyScalar(Math.cos(roll)).addScaledVector(cima1, Math.sin(roll));
  const cima = cima1.clone().multiplyScalar(Math.cos(roll)).addScaledVector(direita0, -Math.sin(roll));
  return { frente, cima, direita, meiaAltura: Math.tan(THREE.MathUtils.degToRad(fov / 2)) };
};
/** onde um ponto cai no quadro, em frações da meia largura e da meia altura (dentro: |x|, |y| ≤ 1) */
const noQuadro = (a: Amostra, p: THREE.Vector3) => {
  const { frente, cima, direita, meiaAltura } = quadro(a);
  const d = p.clone().sub(a.pos);
  const z = d.dot(frente);
  return { x: d.dot(direita) / z / (meiaAltura * 16 / 9), y: d.dot(cima) / z / meiaAltura, z };
};
const dentro = (v: { x: number; y: number; z: number }) => v.z > 0 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
const jd = (t: number) => filme.jdDoFilme(t);
const planetaEm = (id: string, t: number, estrela: THREE.Vector3) => posicaoDoExoplanetaNaCena(id, jd(t), estrela)!;

describe('o Ato 5 — Próxima e TRAPPIST-1', () => {
  it('sete planos, ~47 s, na ordem do roteiro, e começa na junta de Sírius: parado, mirando Próxima, lente 40°', () => {
    const { i } = plano(PLANOS[0]);
    expect(filme.shots.slice(i, i + PLANOS.length).map((s) => s.nome)).toEqual(PLANOS);
    expect(ATO.fim - ATO.inicio).toBe(47);
    const a = journey.at(ATO.inicio);
    expect(a.pos.distanceTo(PONTOS_DAS_JUNTAS.saidaDeSirius)).toBeLessThan(1e-12);
    expect(graus(a.look.clone().sub(a.pos).angleTo(PROXIMA.clone().sub(a.pos)))).toBeLessThan(1e-6);
    expect(a.fov).toBe(40);
    expect(a.roll).toBe(0);
    // sai do repouso: o primeiro trinta avos de segundo anda menos de 1/10.000 do caminho até Próxima
    expect(journey.at(ATO.inicio + 1 / 30).pos.distanceTo(a.pos) / a.pos.distanceTo(PROXIMA)).toBeLessThan(1e-4);
  });

  it('em cada junta de plano a posição, a mira, a lente e a rolagem continuam de onde estavam', () => {
    for (let n = 1; n < PLANOS.length; n++) {
      const t = plano(PLANOS[n]).inicio;
      const antes = journey.at(t - 1e-9);
      const depois = journey.at(t);
      const escala = Math.max(antes.pos.distanceTo(PROXIMA), 1e-9);
      expect(antes.pos.distanceTo(depois.pos) / escala, PLANOS[n]).toBeLessThan(1e-6);
      const olhar = (a: Amostra) => a.look.clone().sub(a.pos);
      expect(graus(olhar(antes).angleTo(olhar(depois))), PLANOS[n]).toBeLessThan(0.01);
      expect(Math.abs(antes.fov - depois.fov), PLANOS[n]).toBeLessThan(1e-6);
      expect(Math.abs(antes.roll - depois.roll), PLANOS[n]).toBeLessThan(1e-6);
    }
  });

  it('a câmera nunca entra numa estrela nem num planeta: fica a mais de 2 raios de cada um, a cada 1/30 s', () => {
    const estrelas: [THREE.Vector3, number][] = [
      [SOL, R_SOL],
      [PROXIMA, raioDaEstrelaPc(estrelaVisitavelPorNome('Proxima Centauri')!)],
      [TRAPPIST, raioDaEstrelaPc(estrelaVisitavelPorNome('TRAPPIST-1')!)],
    ];
    const pertos: string[] = [];
    for (const t of instantes(ATO.inicio, ATO.fim)) {
      const { pos } = journey.at(t);
      for (const [c, r] of estrelas) if (pos.distanceTo(c) < 2 * r) pertos.push(`t=${t.toFixed(2)}`);
      for (const [nome, estrela] of [['Proxima Centauri', PROXIMA], ['TRAPPIST-1', TRAPPIST]] as const) {
        for (const pl of sistemaDaEstrela(nome)!.planetas) {
          const r = raioDoPlanetaUa(pl) * UA;
          if (pos.distanceTo(planetaEm(pl.id, t, estrela)) < 2 * r) pertos.push(`${pl.id} t=${t.toFixed(2)}`);
        }
      }
    }
    expect(pertos).toEqual([]);
  });

  it('E1: o Sol desce pelo alto para dentro do quadro, passa ~2 s perto do terço da esquerda e sai pelo lado', () => {
    const { inicio, fim } = plano('casaDeFora');
    const visto = instantes(inicio, fim).filter((t) => dentro(noQuadro(journey.at(t), SOL)));
    expect(dentro(noQuadro(journey.at(inicio), SOL))).toBe(false);
    expect(dentro(noQuadro(journey.at(fim - 1e-9), SOL))).toBe(false);
    expect(visto[visto.length - 1] - visto[0]).toBeGreaterThan(2.5); // medido ~2,9 s
    // na janela da legenda ele está no terço da esquerda, acima do horizonte
    const legenda = filme.shots[plano('casaDeFora').i].captions![0];
    const t0 = inicio + legenda.at * plano('casaDeFora').dur;
    for (const t of instantes(t0, t0 + 1.2)) {
      const v = noQuadro(journey.at(t), SOL);
      expect(Math.abs(v.x - FICAM.SOL_NO_QUADRO.x)).toBeLessThan(0.12);
      expect(v.y).toBeGreaterThan(0);
    }
  });

  it('as travessias olham para onde vão: Próxima e TRAPPIST-1 no centro desde que a mira chega nelas', () => {
    for (const [nome, alvo, desde] of [
      ['chegadaAProxima', PROXIMA, 0], ['paraTrappist', TRAPPIST, 0.35],
    ] as const) {
      const { inicio, fim, dur } = plano(nome);
      for (const t of instantes(inicio + desde * dur, fim)) {
        const v = noQuadro(journey.at(t), alvo);
        expect(Math.hypot(v.x, v.y), `${nome} t=${t.toFixed(2)}`).toBeLessThan(0.01);
      }
    }
  });

  it('E2: o disco de Próxima toma um terço da altura do quadro e Alfa Centauri vem da beira direita ao terço da direita', () => {
    const { inicio, fim } = plano('aVizinha');
    const r = raioDaEstrelaPc(estrelaVisitavelPorNome('Proxima Centauri')!);
    for (const t of instantes(inicio, fim)) {
      const a = journey.at(t);
      const raio = Math.tan(Math.asin(r / a.pos.distanceTo(PROXIMA))) / Math.tan(THREE.MathUtils.degToRad(a.fov / 2));
      expect(raio).toBeCloseTo(FICAM.DISCO, 3);
      const alfa = noQuadro(a, ALFA);
      expect(dentro(alfa)).toBe(true);
      expect(Math.abs(alfa.y)).toBeLessThan(0.1);
    }
    expect(noQuadro(journey.at(inicio), ALFA).x).toBeGreaterThan(0.7);
    expect(noQuadro(journey.at(fim - 1e-9), ALFA).x).toBeCloseTo(1 / 3, 1);
  });

  it('E3: no fim, Próxima b a 3,5 raios, grande à esquerda, a estrela vermelha à direita, ambos no quadro', () => {
    const a = journey.at(plano('proximaB').fim - 1e-9);
    const b = planetaEm('proxima-b', plano('proximaB').fim, PROXIMA);
    expect(a.pos.distanceTo(b) / FICAM.R_B).toBeCloseTo(FICAM.PERTO_DE_B, 6);
    const vb = noQuadro(a, b);
    const vp = noQuadro(a, PROXIMA);
    expect(vb.x).toBeLessThan(-0.4);
    expect(dentro(vb) && dentro(vp)).toBe(true);
    expect(vp.x).toBeGreaterThan(0.5);
  });

  it('o relógio: parado até TRAPPIST-1, lento na passagem de g, rápido na subida (b dá ~12 voltas, h ~1), parado depois', () => {
    const lento = plano('passagemDeG');
    const rapido = plano('osSeteGirando');
    expect(jd(lento.inicio)).toBe(JD_DO_FILME_ESTELAR_TDB);
    expect(jd(lento.fim)).toBeCloseTo(JD_DO_FILME_ESTELAR_TDB + FICAM.RELOGIO.lento * lento.dur, 9);
    const dias = jd(rapido.fim) - jd(rapido.inicio);
    const periodo = (id: string) => exoplanetaPorId(id)!.planeta.periodoDias;
    expect(dias / periodo('trappist-1b')).toBeGreaterThan(11);
    expect(dias / periodo('trappist-1h')).toBeGreaterThan(0.9);
    expect(jd(filme.duracao)).toBe(jd(rapido.fim));
  });

  it('E5a: g cresce, passa na frente da estrela (a cobre) em torno de 2,6 s e sai pelo outro lado', () => {
    const { inicio, fim } = plano('passagemDeG');
    const rG = raioDoPlanetaUa(exoplanetaPorId('trappist-1g')!.planeta) * UA;
    let cobre = 0;
    for (const t of instantes(inicio, fim)) {
      const a = journey.at(t);
      const g = planetaEm('trappist-1g', t, TRAPPIST);
      const separacao = g.clone().sub(a.pos).angleTo(TRAPPIST.clone().sub(a.pos));
      if (separacao < Math.asin(rG / a.pos.distanceTo(g))) cobre = cobre || t - inicio;
    }
    expect(cobre).toBeGreaterThan(FICAM.G_PASSA_EM - 0.4);
    expect(cobre).toBeLessThan(FICAM.G_PASSA_EM);
    expect(noQuadro(journey.at(inicio + 0.8), planetaEm('trappist-1g', inicio + 0.8, TRAPPIST)).x).toBeLessThan(-0.9);
    expect(noQuadro(journey.at(fim - 0.8), planetaEm('trappist-1g', fim - 0.8, TRAPPIST)).x).toBeGreaterThan(0.9);
  });

  it('E5: as órbitas ficam deitadas no quadro (o polo do sistema de pé, a menos de 2°) e a subida abre o sistema', () => {
    const tortos: string[] = [];
    for (const t of instantes(plano('passagemDeG').inicio, plano('osSeteGirando').fim)) {
      const { cima, direita } = quadro(journey.at(t));
      const inclinacao = graus(Math.atan2(FICAM.POLO_DE_G.dot(direita), FICAM.POLO_DE_G.dot(cima)));
      if (Math.abs(inclinacao) > 2) tortos.push(`t=${t.toFixed(2)}: ${inclinacao.toFixed(1)}°`);
    }
    expect(tortos).toEqual([]);
    // a subida: de quase no plano a ELEVACAO_FINAL acima dele
    const elevacao = (t: number) => {
      const d = journey.at(t).pos.clone().sub(TRAPPIST).normalize();
      return graus(Math.asin(d.dot(FICAM.POLO_DE_G)));
    };
    expect(elevacao(plano('osSeteGirando').inicio)).toBeLessThan(1);
    expect(elevacao(plano('osSeteGirando').fim)).toBeCloseTo(FICAM.ELEVACAO_FINAL, 6);
  });

  it('as legendas: subtexto de até 12 palavras, inglês ao lado, e os números saem das tabelas do app', () => {
    const legendas = PLANOS.flatMap((n) => filme.shots[plano(n).i].captions ?? []);
    for (const c of legendas) {
      expect((c.sub ?? '').split(/\s+/).filter(Boolean).length, c.text).toBeLessThanOrEqual(12);
      expect(c.en, c.text).toBeDefined();
    }
    const texto = legendas.map((c) => `${c.text} ${c.sub ?? ''}`).join(' | ');
    const periodo = (id: string) => exoplanetaPorId(id)!.planeta.periodoDias;
    const virgula = (n: number, casas: number) => n.toFixed(casas).replace('.', ',');
    expect(texto).toContain(`um ano de ${Math.round(periodo('proxima-b'))} dias`);
    expect(texto).toContain(`de ${virgula(periodo('trappist-1b'), 1)} a ${Math.round(periodo('trappist-1h'))} dias`);
    expect(sistemaDaEstrela('TRAPPIST-1')!.planetas.length).toBe(7);
    expect(texto).toContain('sete planetas');
  });
});
