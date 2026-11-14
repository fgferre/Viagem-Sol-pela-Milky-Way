// Serve: dono — no Ato 4 a gigante laranja enche um terço da tela e o Sol aparece ao lado dela, Sírius B fica do tamanho que tem com Sírius A ao fundo, e o ato entrega a câmera parada mirando Próxima
// ALDEBARAN E SÍRIUS (D1–D5), no relógio de Journey.at: as travessias de
// frente, o disco de Aldebaran do tamanho pedido, a câmera que nunca entra
// numa estrela, Sírius B grande com Sírius A ao fundo no mesmo quadro, a
// junta de saída e os números das legendas pelas fichas das estrelas.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { estrelaVisitavelPorNome } from '../../../../../lib/atlas/estrelasVisitaveis';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { JD_DO_FILME_ESTELAR_TDB, montarFilmeEstelar } = await import('../montar');
const { Journey } = await import('../../../journey');
const { ESTRELAS_DO_FILME } = await import('../estrelas');
const { PONTOS_DAS_JUNTAS } = await import('./juntas');
const { PONTOS_ENVELHECER, RAIO_DE_SIRIUS_B } = await import('./envelhecer');
const { R_SOL } = await import('../../solar/atos/geometria');

const filme = montarFilmeEstelar();
const journey = new Journey(filme.shots, filme.starts);
const graus = THREE.MathUtils.radToDeg;
const NOMES = ['rumoAAldebaran', 'aGiganteLaranja', 'rumoASirius', 'siriusB', 'saidaDeSirius'];
const ALDEBARAN = ESTRELAS_DO_FILME.Aldebaran;
const SIRIUS = ESTRELAS_DO_FILME.Sirius;
const SIRIUS_B = PONTOS_ENVELHECER.siriusB;
const FICHA_ALDEBARAN = estrelaVisitavelPorNome('Aldebaran')!;
const FICHA_SIRIUS = estrelaVisitavelPorNome('Sirius')!;
const R_ALDEBARAN = FICHA_ALDEBARAN.raioRsol.v * R_SOL;
const R_SIRIUS = FICHA_SIRIUS.raioRsol.v * R_SOL;
type Amostra = ReturnType<InstanceType<typeof Journey>['at']>;

const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { i, shot: filme.shots[i], inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur };
};
const instantes = (nome: string) => {
  const { inicio, fim } = plano(nome);
  return Array.from({ length: Math.round((fim - inicio) * 30) + 1 }, (_, n) => Math.min(inicio + n / 30, fim - 1e-9));
};
const emFracao = (nome: string, f: number) => {
  const { inicio, fim } = plano(nome);
  return journey.at(inicio + (fim - inicio) * Math.min(f, 1 - 1e-9));
};
const frente = (a: Amostra) => a.look.clone().sub(a.pos).normalize();
/** o ângulo, em graus, entre o centro do quadro e um ponto */
const foraDoCentro = (a: Amostra, p: THREE.Vector3) => graus(frente(a).angleTo(p.clone().sub(a.pos)));
/** o raio aparente, em graus, de uma esfera */
const raioAparente = (a: Amostra, centro: THREE.Vector3, raio: number) => graus(Math.asin(raio / a.pos.distanceTo(centro)));

describe('o Ato 4 no corte', () => {
  it('cinco planos, ~43 s, logo depois do Ato 3 e com o céu parado (Sírius B na órbita da data do filme)', () => {
    const { i } = plano(NOMES[0]);
    expect(filme.shots[i - 1].nome).toBe('aLaranja');
    expect(filme.shots.slice(i, i + 5).map((s) => s.nome)).toEqual(NOMES);
    expect(filme.shots.slice(i, i + 5).reduce((a, s) => a + s.dur, 0)).toBe(43);
    for (const nome of NOMES) expect(filme.jdDoFilme(plano(nome).fim)).toBe(JD_DO_FILME_ESTELAR_TDB);
  });

  it.each(NOMES)('a junta que abre %s não salta de posição, de mira nem de lente', (nome) => {
    const { i } = plano(nome);
    const p0 = filme.shots[i - 1].pos(1, new THREE.Vector3());
    const p1 = filme.shots[i].pos(0, new THREE.Vector3());
    expect(p0.distanceTo(p1)).toBeLessThan(1e-12);
    const m0 = filme.shots[i - 1].look(1, new THREE.Vector3()).sub(p0);
    const m1 = filme.shots[i].look(0, new THREE.Vector3()).sub(p1);
    expect(graus(m0.angleTo(m1))).toBeLessThan(0.01);
    expect(filme.shots[i - 1].fov1).toBe(filme.shots[i].fov0);
  });

  it('a junta de saída: parado em saidaDeSirius, mirando Próxima, lente 40°', () => {
    const { shot } = plano('saidaDeSirius');
    const pos = shot.pos(1, new THREE.Vector3());
    expect(pos.distanceTo(PONTOS_DAS_JUNTAS.saidaDeSirius)).toBeLessThan(1e-12);
    const proxima = ESTRELAS_DO_FILME['Proxima Centauri'].clone().sub(pos);
    expect(graus(shot.look(1, new THREE.Vector3()).sub(pos).angleTo(proxima))).toBeLessThan(1e-6);
    expect(shot.fov1).toBe(40);
    // chega parada: no último 0,1 % do relógio anda 4 % do que andaria em
    // velocidade média (medido 4e-5 do caminho; a média seria 1e-3)
    const quase = shot.pos(shot.ease!(0.999), new THREE.Vector3());
    expect(quase.distanceTo(pos) / pos.distanceTo(shot.pos(0, new THREE.Vector3()))).toBeLessThan(1e-4);
  });
});

describe('a câmera viaja de frente e nunca entra numa estrela', () => {
  it.each([
    ['rumoAAldebaran', 5], // medido 2,0°
    ['rumoASirius', 5], // medido 3,4°
  ])('%s: o olhar fica a até %i° do rumo do movimento', (nome, limite) => {
    const ts = instantes(nome);
    let maior = 0;
    for (let n = 0; n < ts.length - 1; n++) {
      const a = journey.at(ts[n]);
      const passo = journey.at(ts[n + 1]).pos.sub(a.pos);
      if (passo.length() > 0) maior = Math.max(maior, graus(passo.angleTo(frente(a))));
    }
    expect(maior).toBeLessThan(limite);
  });

  it('a menor distância a cada estrela, em raios dela', () => {
    const menor = { aldebaran: Infinity, sirius: Infinity, siriusB: Infinity };
    for (const nome of NOMES) {
      for (const t of instantes(nome)) {
        const p = journey.at(t).pos;
        menor.aldebaran = Math.min(menor.aldebaran, p.distanceTo(ALDEBARAN) / R_ALDEBARAN);
        menor.sirius = Math.min(menor.sirius, p.distanceTo(SIRIUS) / R_SIRIUS);
        menor.siriusB = Math.min(menor.siriusB, p.distanceTo(SIRIUS_B) / RAIO_DE_SIRIUS_B);
      }
    }
    expect(menor.aldebaran).toBeGreaterThan(2.5); // medido 2,9: a saída passa rente ao limbo
    expect(menor.sirius).toBeGreaterThan(100);
    expect(menor.siriusB).toBeGreaterThan(9.9); // o fim do arco, a 10 raios
  });
});

describe('os quadros', () => {
  it('Aldebaran: o disco ocupa de um quarto a metade da altura, e no fim o Sol entra ao lado de Sírius', () => {
    for (const f of [0, 0.5, 1]) {
      const a = emFracao('aGiganteLaranja', f);
      const altura = (2 * raioAparente(a, ALDEBARAN, R_ALDEBARAN)) / a.fov;
      expect(altura).toBeGreaterThan(0.25);
      expect(altura).toBeLessThan(0.5); // medido 0,28 → 0,41
    }
    const fim = emFracao('aGiganteLaranja', 1);
    expect(foraDoCentro(fim, SIRIUS)).toBeLessThan(1e-4);
    expect(foraDoCentro(fim, new THREE.Vector3())).toBeLessThan(fim.fov / 2); // o Sol, a 5,8°
    // e o limbo de Aldebaran ainda no quadro, de lado
    expect(foraDoCentro(fim, ALDEBARAN) - raioAparente(fim, ALDEBARAN, R_ALDEBARAN)).toBeLessThan(fim.fov / 2);
  });

  it('Sírius B: no fim do arco ela é um disco de ~um terço da altura, e Sírius A brilha ao fundo, fora dele', () => {
    const fim = emFracao('siriusB', 1);
    const raioB = raioAparente(fim, SIRIUS_B, RAIO_DE_SIRIUS_B);
    expect((2 * raioB) / fim.fov).toBeGreaterThan(0.2); // medido 0,29
    const aoA = foraDoCentro(fim, SIRIUS);
    expect(aoA).toBeGreaterThan(2 * raioB); // A não se esconde atrás de B
    expect(aoA).toBeLessThan(fim.fov / 2); // e cabe no quadro
    expect(fim.pos.distanceTo(SIRIUS)).toBeGreaterThan(fim.pos.distanceTo(SIRIUS_B) * 1e4); // ao fundo, a 30 UA
  });
});

describe('as legendas', () => {
  const legendas = NOMES.flatMap((n) => plano(n).shot.captions ?? []);
  const numero = (texto: string) => Number(texto.match(/(\d+)/)![1]);

  it('subtexto com no máximo 12 palavras, nas duas línguas, e as duas de Aldebaran sem se sobrepor', () => {
    expect(legendas.length).toBe(4);
    for (const l of legendas) {
      for (const sub of [l.sub, l.en?.sub]) expect((sub ?? '').split(/\s+/).length, sub).toBeLessThanOrEqual(12);
      expect(l.en?.text, l.text).toBeTruthy();
    }
    const { shot } = plano('aGiganteLaranja');
    const [a, b] = shot.captions!;
    expect(a.at * shot.dur + a.dur!).toBeLessThan(b.at * shot.dur);
    expect(b.at * shot.dur + b.dur!).toBeLessThanOrEqual(shot.dur);
  });

  it('"45 vezes o raio do Sol" é o raio da ficha de Aldebaran', () => {
    const [inchou] = legendas;
    expect(numero(inchou.sub!)).toBe(Math.round(FICHA_ALDEBARAN.raioRsol.v)); // 45,1
    expect(numero(inchou.en!.sub!)).toBe(Math.round(FICHA_ALDEBARAN.raioRsol.v));
  });

  it('"do tamanho da Terra, com a massa do Sol" é a ficha de Sírius B', () => {
    const b = FICHA_SIRIUS.companheira!;
    const R_TERRA_EM_RSOL = 6371 / 695_700;
    expect(b.raioRsol.v / R_TERRA_EM_RSOL).toBeGreaterThan(0.8); // 0,88 Terra
    expect(b.raioRsol.v / R_TERRA_EM_RSOL).toBeLessThan(1.2);
    expect(b.massaMsol.v).toBeGreaterThan(0.95); // 1,018 Sol
    expect(b.massaMsol.v).toBeLessThan(1.05);
    expect(legendas[3].text).toBe('Do tamanho da Terra');
  });
});
