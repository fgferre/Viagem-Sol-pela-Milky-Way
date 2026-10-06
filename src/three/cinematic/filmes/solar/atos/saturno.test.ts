// Serve: dono — no ato III a câmera passa por Titã acesa e por Jápeto com as duas caras, a escura e a clara, no disco aceso
// TITÃ E JÁPETO (cenas 17 e 18), no relógio de Journey.at: as duas luas
// do lado aceso no céu de JD2, a passagem por Titã pelo lado do dia, a de
// Jápeto com a fronteira entre a face escura e a calota clara no quadro,
// os nomes só enquanto elas são pequenas e as juntas sem salto.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { IAU_ORIENTATIONS } from '../../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../../lib/atlas/orientacao';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeSolar, raioPc } = await import('../montar');
const { Journey } = await import('../../../journey');
const { JD2_SOLAR_TDB } = await import('../pinos');
const { naSuperficie } = await import('./geometria');
const { RAIO_DOS_ANEIS } = await import('./saturno');

const filme = montarFilmeSolar();
const journey = new Journey(filme.shots, filme.starts);
const graus = THREE.MathUtils.radToDeg;
const SOL = filme.pinos.get('sun')!;
const SATURNO = filme.pinos.get('saturn')!;
const TITA = filme.pinos.get('titan')!;
const JAPETO = filme.pinos.get('iapetus')!;
type Amostra = ReturnType<InstanceType<typeof Journey>['at']>;

const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { i, inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur };
};
/** o joelho de uma passagem: o instante mais perto do corpo, a cada 1/300 s dos planos dados */
const joelho = (centro: THREE.Vector3, nomes: string[]) => {
  let melhor = { t: 0, d: Infinity };
  for (const nome of nomes) {
    const { inicio, fim } = plano(nome);
    for (let t = inicio; t <= fim; t += 1 / 300) {
      const d = journey.at(t).pos.distanceTo(centro);
      if (d < melhor.d) melhor = { t, d };
    }
  }
  return { ...melhor, amostra: journey.at(melhor.t) };
};
/** a fase do corpo vista da câmera: o ângulo, no corpo, entre o Sol e a câmera */
const fase = (pos: THREE.Vector3, centro: THREE.Vector3) =>
  graus(pos.clone().sub(centro).angleTo(SOL.clone().sub(centro)));
/** onde um ponto da cena cai no quadro de 16:9, em fração de meio quadro
 *  (dentro: |x| e |y| até 1); longe do polo o cima do rig é o do filme */
const noQuadro = ({ pos, look, fov }: Amostra, p: THREE.Vector3) => {
  const frente = look.clone().sub(pos).normalize();
  const cima = filme.cima.clone().addScaledVector(frente, -filme.cima.dot(frente)).normalize();
  const direita = new THREE.Vector3().crossVectors(frente, cima);
  const meiaAltura = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const ate = p.clone().sub(pos);
  const z = ate.dot(frente);
  return z <= 0
    ? { x: Infinity, y: Infinity }
    : { x: ate.dot(direita) / z / (meiaAltura * 16 / 9), y: ate.dot(cima) / z / meiaAltura };
};

/** a lua em Saturno: o ângulo ao eixo da sombra (do Sol para fora) e a meia-abertura da sombra ali */
const sombra = (lua: THREE.Vector3) => {
  const rel = lua.clone().sub(SATURNO);
  return {
    aoEixo: graus(rel.angleTo(SATURNO.clone().sub(SOL))),
    meiaAbertura: graus(Math.asin(raioPc('saturn') / rel.length())),
    aoSubsolar: graus(rel.angleTo(SOL.clone().sub(SATURNO))),
  };
};

describe('Titã e Jápeto no céu de JD2', () => {
  it('Titã, atrás de Saturno para quem vem do Sol, fica fora da sombra do planeta', () => {
    const { aoEixo, meiaAbertura, aoSubsolar } = sombra(TITA);
    expect(aoSubsolar).toBeGreaterThan(110); // medido 165,2°: por isso a câmera chega pelo lado do planeta
    expect(aoEixo - meiaAbertura).toBeGreaterThan(10); // medido 14,8° do eixo; a sombra tem 2,9°
  });

  it('Jápeto está do lado aceso (até 110° do ponto subsolar de Saturno) e fora da sombra', () => {
    const { aoEixo, meiaAbertura, aoSubsolar } = sombra(JAPETO);
    expect(aoSubsolar).toBeLessThanOrEqual(110); // medido 64,4°
    expect(aoEixo).toBeGreaterThan(meiaAbertura);
  });
});

describe('a passagem por Titã', () => {
  const k = joelho(TITA, ['titaChegada', 'titaRaspao']);
  const r = raioPc('titan');

  it('no joelho a câmera está a 1,3 raio ou mais e Titã está acesa (fase até 90°)', () => {
    expect(k.d / r).toBeGreaterThanOrEqual(1.3); // 2,6 raios
    expect(fase(k.amostra.pos, TITA)).toBeLessThanOrEqual(90); // medido 30,0°
  });

  it('no joelho Titã é uma bola grande, inteira no quadro', () => {
    const raio = graus(Math.asin(r / k.d));
    const fora = graus(k.amostra.look.clone().sub(k.amostra.pos).angleTo(TITA.clone().sub(k.amostra.pos)));
    expect(raio).toBeGreaterThanOrEqual(15); // medido 22,6°
    expect(fora + raio).toBeLessThan(k.amostra.fov / 2); // lente de 58°
  });
});

describe('a passagem por Jápeto', () => {
  const k = joelho(JAPETO, ['japetoChegada', 'japetoRaspao']);
  const r = raioPc('iapetus');
  const noMapa = naSuperficie(IAU_ORIENTATIONS.iapetus, JD2_SOLAR_TDB);
  /** a borda sul da face escura, onde o mapa do motor passa de escuro a
   *  claro na longitude do joelho: 66,5°S a 250°L e 68,5°S a 260°L
   *  (capturas/viagem-solar/v4-ato3/ferramentas/mapa-de-japeto.ts) */
  const FRONTEIRA = { lat: -67, lonLeste: 255 };

  it('no joelho a câmera está a 1,3 raio ou mais e o lado que ela vê está aceso (fase até 70°)', () => {
    expect(k.d / r).toBeGreaterThanOrEqual(1.3); // 2,2 raios
    expect(fase(k.amostra.pos, JAPETO)).toBeLessThanOrEqual(70); // medido 36,9°
  });

  it.each([
    ['a face escura, 10° ao norte da fronteira', 10],
    ['a fronteira', 0],
    ['a calota clara, 10° ao sul da fronteira', -10],
  ])('no joelho %s está no disco aceso e dentro do quadro', (_, deslocamento) => {
    const n = noMapa(FRONTEIRA.lat + deslocamento, FRONTEIRA.lonLeste);
    const p = JAPETO.clone().addScaledVector(n, r);
    expect(k.amostra.pos.clone().sub(p).normalize().dot(n)).toBeGreaterThan(0.2); // de frente para a câmera
    expect(SOL.clone().sub(p).normalize().dot(n)).toBeGreaterThan(0.2); // de dia
    const { x, y } = noQuadro(k.amostra, p);
    expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThan(0.9);
  });
});

describe('os nomes e as juntas', () => {
  it('Titã e Jápeto só têm o nome no quadro enquanto são pequenas (menos de 2° de raio)', () => {
    let maior = 0;
    for (const [nome, id] of [['titaChegada', 'titan'], ['japetoChegada', 'iapetus']] as const) {
      expect(filme.shots[plano(nome).i].target).toEqual([id]);
      const { inicio, fim } = plano(nome);
      const centro = filme.pinos.get(id)!;
      for (let t = inicio; t <= fim; t += 1 / 30) {
        maior = Math.max(maior, graus(Math.asin(raioPc(id) / journey.at(t).pos.distanceTo(centro))));
      }
    }
    expect(maior).toBeLessThan(2); // medido 1,8°, Titã no fim da chegada
  });

  it.each(['titaChegada', 'titaRaspao', 'japetoChegada', 'japetoRaspao', 'hiperionRaspao'])(
    'a junta que abre o plano %s não salta de posição',
    (nome) => {
      const { i } = plano(nome);
      const fim = filme.shots[i - 1].pos(1, new THREE.Vector3());
      expect(fim.distanceTo(filme.shots[i].pos(0, new THREE.Vector3()))).toBeLessThan(1e-9 * fim.length());
    }
  );

  it.each(['titaRaspao', 'japetoRaspao'])('a chegada passa ao plano %s com a mesma velocidade', (nome) => {
    const { inicio: t } = plano(nome);
    const h = 1e-3;
    const v = (a: number, b: number) => journey.at(b).pos.sub(journey.at(a).pos).divideScalar(b - a);
    const antes = v(t - 2 * h, t - h);
    expect(antes.distanceTo(v(t + h, t + 2 * h))).toBeLessThan(0.15 * antes.length());
  });
});

describe('Hipérion e o postal (cenas 18 e 19)', () => {
  const HIPERION = filme.pinos.get('hyperion')!;
  const k = joelho(HIPERION, ['hiperionChegada', 'hiperionRaspao']);
  const rs = raioPc('saturn');
  const POLO = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.saturn, filme.jd).polo);
  /** a abertura do anel à câmera: quantos graus ela está abaixo do plano (face sul, a acesa) */
  const abertura = (pos: THREE.Vector3) => {
    const rel = pos.clone().sub(SATURNO);
    return -graus(Math.asin(rel.dot(POLO) / rel.length()));
  };

  it('a visita a Hipérion, da saída de Jápeto ao postal, dura de 7 a 8 s', () => {
    const total = plano('hiperionRaspao').fim - plano('hiperionChegada').inicio;
    expect(total).toBeGreaterThanOrEqual(7);
    expect(total).toBeLessThanOrEqual(8);
  });

  it('no joelho a câmera está a 3 raios de Hipérion ou mais, a lua acesa e inteira no quadro', () => {
    const r = raioPc('hyperion');
    expect(k.d / r).toBeGreaterThanOrEqual(3 * (1 - 1e-9)); // 3,000 raios, o joelho aprovado
    expect(fase(k.amostra.pos, HIPERION)).toBeLessThanOrEqual(60); // medido 45,0°
    const raio = graus(Math.asin(r / k.d));
    const fora = graus(k.amostra.look.clone().sub(k.amostra.pos).angleTo(HIPERION.clone().sub(k.amostra.pos)));
    expect(fora + raio).toBeLessThan(k.amostra.fov / 2); // raio médio de 19,5°, lente de 58°
    expect(Math.abs(filme.apoios.instanteDeQA('hiperion') - k.t)).toBeLessThan(1 / 30);
  });

  it('o olhar não chicoteia na visita a Hipérion: gira menos de 90° por segundo', () => {
    // com o joelho girado para o lado da entrada antiga (Encélado) a
    // chegada virava 135° e o olhar passava de 170°/s: na gravação a lua
    // sumia do quadro e Saturno atravessava a tela em meio segundo
    const direcao = (t: number) => {
      const a = journey.at(t);
      return a.look.sub(a.pos).normalize();
    };
    let maior = 0;
    for (let t = plano('hiperionChegada').inicio; t < plano('hiperionRaspao').fim; t += 1 / 100) {
      maior = Math.max(maior, graus(direcao(t).angleTo(direcao(t + 1 / 100))) * 100);
    }
    expect(maior).toBeLessThan(90); // medido 61°/s
  });

  it('Hipérion só tem o nome no quadro enquanto é pequeno (menos de 2° de raio); Saturno, que enche o postal, não tem', () => {
    const { i, inicio, fim } = plano('hiperionChegada');
    expect(filme.shots[i].target).toEqual(['hyperion']);
    expect(filme.shots[plano('hiperionRaspao').i].target ?? []).toEqual([]);
    let maior = 0;
    for (let t = inicio; t <= fim; t += 1 / 30) {
      maior = Math.max(maior, graus(Math.asin(raioPc('hyperion') / journey.at(t).pos.distanceTo(HIPERION))));
    }
    expect(maior).toBeLessThan(2); // medido 0,3°
    expect(filme.shots[plano('saturnoPostal').i].target ?? []).not.toContain('saturn');
  });

  it('o ponto de conferência do postal não muda: a 10,25 raios de Saturno, o anel aberto 23,5°, fase 49,9°', () => {
    const t = filme.apoios.instanteDeQA('cartaoPostal');
    const { inicio, fim } = plano('saturnoPostal');
    expect((t - inicio) / (fim - inicio)).toBeCloseTo(0.5, 9);
    const { pos } = journey.at(t);
    expect(pos.distanceTo(SATURNO) / rs).toBeCloseTo(10.25, 3);
    expect(abertura(pos)).toBeCloseTo(23.498, 3);
    expect(fase(pos, SATURNO)).toBeCloseTo(49.881, 3);
  });

  it('a legenda da Cassini fica no ar com Saturno e o anel inteiros no quadro e o anel aberto de 22° a 24°', () => {
    const { i, inicio } = plano('saturnoPostal');
    const s = filme.shots[i];
    const c = s.captions!.find((x) => x.text.includes('Cassini'))!;
    const t0 = inicio + c.at * s.dur;
    let folga = Infinity;
    let menor = Infinity;
    let maior = -Infinity;
    for (let t = t0; t <= t0 + c.dur!; t += 1 / 30) {
      const a = journey.at(t);
      const anel = graus(Math.asin((RAIO_DOS_ANEIS * rs) / a.pos.distanceTo(SATURNO)));
      const fora = graus(a.look.clone().sub(a.pos).angleTo(SATURNO.clone().sub(a.pos)));
      folga = Math.min(folga, a.fov / 2 - fora - anel);
      menor = Math.min(menor, abertura(a.pos));
      maior = Math.max(maior, abertura(a.pos));
    }
    expect(folga).toBeGreaterThan(5); // o anel até o F, contra a meia-altura do quadro: medido 12,6°
    expect(menor).toBeGreaterThanOrEqual(22);
    expect(maior).toBeLessThanOrEqual(24);
  });

  /** a velocidade da câmera logo antes e logo depois do instante t, por diferenças de h segundos */
  const velocidades = (t: number, h = 1e-3) => {
    const v = (a: number, b: number) => journey.at(b).pos.sub(journey.at(a).pos).divideScalar(b - a);
    return { antes: v(t - 2 * h, t - h), depois: v(t + h, t + 2 * h) };
  };

  it('a chegada passa ao raspão de Hipérion com a mesma velocidade', () => {
    const { antes, depois } = velocidades(plano('hiperionRaspao').inicio);
    expect(antes.distanceTo(depois)).toBeLessThan(0.15 * antes.length());
  });

  it.each(['hiperionChegada', 'saturnoPostal', 'saturnoSaida'])(
    'a junta que abre o plano %s não salta de posição, de olhar nem de lente, e a câmera para dos dois lados',
    (nome) => {
      const { i, inicio: t } = plano(nome);
      const fim = filme.shots[i - 1].pos(1, new THREE.Vector3());
      expect(fim.distanceTo(filme.shots[i].pos(0, new THREE.Vector3()))).toBeLessThan(1e-9 * fim.length());
      const [a, b] = [journey.at(t - 1e-6), journey.at(t + 1e-6)];
      expect(graus(a.look.clone().sub(a.pos).angleTo(b.look.clone().sub(b.pos)))).toBeLessThan(0.01);
      expect(Math.abs(a.fov - b.fov)).toBeLessThan(1e-3);
      // as duas pontas param (settle ou glide antes, launch, glide ou
      // quadratic depois): a 10 µs da junta, menos de 1 % da velocidade
      // média do plano que abre (o settle freia por último, como (1 − x)^1,2)
      const media = filme.shots[i].pos(1, new THREE.Vector3()).distanceTo(fim) / filme.shots[i].dur;
      const { antes, depois } = velocidades(t, 1e-5);
      expect(Math.max(antes.length(), depois.length())).toBeLessThan(0.01 * media);
    }
  );
});
