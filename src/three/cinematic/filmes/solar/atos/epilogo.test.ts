// Serve: dono — o filme acaba em casa: do retrato de família a 40 UA ele corta para a Terra, e o Sol nasce sobre o limbo azul com a legenda "A mesma luz" e a ponte para a viagem seguinte
// A MESMA LUZ (cena 24), no relógio de Journey.at: o corte do retrato para
// a Terra com o céu voltando a JD_A num degrau, o limbo parado embaixo do
// quadro, o Sol saindo de trás dele e subindo pelo meio do quadro, a luz
// do roteiro desligada e as duas legendas do fim.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeSolar, raioPc } = await import('../montar');
const { Journey } = await import('../../../journey');
const { RELOGIOS_SOLAR } = await import('../pinos');
const { R_SOL, UA } = await import('./geometria');
const { MESMA_LUZ } = await import('./epilogo');

const filme = montarFilmeSolar();
const journey = new Journey(filme.shots, filme.starts);
const graus = THREE.MathUtils.radToDeg;
const TERRA = filme.pinos.get('earth')!;
const SOL = filme.pinos.get('sun')!;
type Amostra = ReturnType<InstanceType<typeof Journey>['at']>;

const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { i, inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur };
};
const { i: I, inicio: INICIO, fim: FIM } = plano('mesmaLuz');
/** os instantes do plano, a cada 1/30 s (o último um nada antes do fim) */
const INSTANTES = Array.from({ length: Math.round((FIM - INICIO) * 30) + 1 }, (_, n) =>
  Math.min(INICIO + n / 30, FIM - 1e-9));

/** a base do quadro de 16:9 de uma amostra: longe do polo o cima do rig é o do filme */
const quadro = ({ pos, look, fov }: Amostra) => {
  const frente = look.clone().sub(pos).normalize();
  const cima = filme.cima.clone().addScaledVector(frente, -filme.cima.dot(frente)).normalize();
  return { frente, cima, direita: new THREE.Vector3().crossVectors(frente, cima), meiaAltura: Math.tan(THREE.MathUtils.degToRad(fov / 2)) };
};
/** onde uma DIREÇÃO cai no quadro, em fração de meio quadro (dentro: |x| e |y| até 1) */
const noQuadro = (a: Amostra, direcao: THREE.Vector3) => {
  const { frente, cima, direita, meiaAltura } = quadro(a);
  const z = direcao.dot(frente);
  return { x: direcao.dot(direita) / z / (meiaAltura * 16 / 9), y: direcao.dot(cima) / z / meiaAltura };
};
/** o Sol e o limbo vistos da câmera: a altura do Sol sobre o limbo (graus,
 *  negativa = atrás da Terra) e a direção do ponto mais alto do limbo */
const solELimbo = (a: Amostra) => {
  const paraOCentro = TERRA.clone().sub(a.pos);
  const rho = Math.asin(raioPc('earth') / paraOCentro.length());
  const paraOSol = SOL.clone().sub(a.pos).normalize();
  paraOCentro.normalize();
  // o ponto do limbo no rumo do Sol: o centro girado de ρ para ele
  const eixo = new THREE.Vector3().crossVectors(paraOCentro, paraOSol).normalize();
  return {
    altura: graus(paraOCentro.angleTo(paraOSol) - rho),
    limbo: paraOCentro.clone().applyAxisAngle(eixo, rho),
    sol: paraOSol,
  };
};
/** o raio aparente do Sol a 1 UA, em graus */
const RAIO_DO_SOL = graus(Math.asin(R_SOL / TERRA.length()));

describe('a mesma luz (cena 24)', () => {
  it('abre num corte: a câmera salta ~40 UA, a lente não muda e o céu volta a JD_A num degrau no mesmo instante', () => {
    const troca = filme.trocas[filme.trocas.length - 1];
    expect([troca.de, troca.para, troca.duracao]).toEqual(['escuro', 'a', 0]);
    expect(troca.t).toBe(INICIO);
    const antes = journey.at(INICIO - 1e-9);
    const depois = journey.at(INICIO);
    expect(depois.plano).toBe(I);
    expect(antes.pos.distanceTo(depois.pos) / UA).toBeGreaterThan(39); // medido 40,7 UA
    // a lente é a do fim do retrato: o rig não amacia lente nenhuma na junta
    expect(Math.abs(antes.fov - depois.fov)).toBeLessThan(1e-9);
    expect(filme.jdDoFilme(INICIO - 1e-6)).toBe(RELOGIOS_SOLAR.escuro);
    expect(filme.jdDoFilme(INICIO)).toBe(RELOGIOS_SOLAR.a);
    expect(filme.jdDoFilme(FIM)).toBe(RELOGIOS_SOLAR.a);
  });

  it('a câmera fica a 2,5 raios da Terra, no lado da noite, e a luz do roteiro fica em 0 do começo ao fim', () => {
    for (const t of INSTANTES) {
      const a = journey.at(t);
      expect(a.pos.distanceTo(TERRA) / raioPc('earth')).toBeCloseTo(MESMA_LUZ.raio, 6);
      expect(a.luz).toBe(0);
    }
  });

  it('o limbo da Terra fica parado na parte de baixo do quadro, a 70% da meia altura abaixo do centro, sob o Sol no terço da direita, e o centro dela fora do quadro', () => {
    const fora: string[] = [];
    for (const t of INSTANTES) {
      const a = journey.at(t);
      const { x, y } = noQuadro(a, solELimbo(a).limbo);
      if (Math.abs(x - MESMA_LUZ.aDireita) > 0.005 || Math.abs(y - MESMA_LUZ.limbo) > 0.005) {
        fora.push(`t=${t.toFixed(2)}: ${x.toFixed(3)}, ${y.toFixed(3)}`);
      }
      expect(noQuadro(a, TERRA.clone().sub(a.pos).normalize()).y).toBeLessThan(-1);
    }
    expect(fora).toEqual([]); // medido: x 0,334, y −0,698
  });

  it('o Sol nasce: escondido inteiro atrás do limbo no começo, sobe sem voltar e termina 5° acima dele, no terço da direita', () => {
    const alturas = INSTANTES.map((t) => solELimbo(journey.at(t)).altura);
    // no começo o disco inteiro (0,27° de raio) está atrás da Terra (o
    // epílogo mira o Sol do centro da Terra; da câmera, a 2,5 raios, ele
    // está a 0,006° disso)
    expect(alturas[0]).toBeCloseTo(-MESMA_LUZ.escondido, 2);
    expect(alturas[0] + RAIO_DO_SOL).toBeLessThan(0);
    for (let n = 1; n < alturas.length; n++) expect(alturas[n]).toBeGreaterThanOrEqual(alturas[n - 1] - 1e-9);
    expect(alturas[alturas.length - 1]).toBeGreaterThan(5); // medido 5,10°
    expect(alturas[alturas.length - 1]).toBeLessThan(5.2);
    // o centro do Sol cruza o limbo entre 3,5 e 4,5 s do plano (medido 4,0 s)
    const cruza = INSTANTES[alturas.findIndex((e) => e >= 0)] - INICIO;
    expect(cruza).toBeGreaterThan(3.5);
    expect(cruza).toBeLessThan(4.5);
    // ele sobe pela linha do terço da direita, longe dos botões do filme
    // (embaixo, no meio), e acaba um pouco acima do centro
    for (const t of INSTANTES) {
      const a = journey.at(t);
      expect(Math.abs(noQuadro(a, solELimbo(a).sol).x - MESMA_LUZ.aDireita)).toBeLessThan(0.005);
    }
    const fim = journey.at(FIM - 1e-9);
    expect(Math.abs(noQuadro(fim, solELimbo(fim).sol).y - MESMA_LUZ.solNoFim)).toBeLessThan(0.005);
  });

  it('o Sol não afunda no clarão do limbo: nunca mais de 0,6° atrás dele, e atravessa visível a faixa de ±1° em menos de 3 s', () => {
    // a faixa de ±1° em torno do limbo é a do anel claro da atmosfera,
    // onde o Sol e o anel somam luz; atrás dele, o clarão do Sol cairia
    // sobre o lado da noite. Visível = alguma borda do disco acima do limbo.
    const alturas = INSTANTES.map((t) => solELimbo(journey.at(t)).altura);
    expect(Math.min(...alturas)).toBeGreaterThanOrEqual(-MESMA_LUZ.escondido - 0.01); // medido −0,602°
    const naFaixa = INSTANTES.filter((_, n) => alturas[n] > -RAIO_DO_SOL && alturas[n] < 1);
    expect(naFaixa[naFaixa.length - 1] - naFaixa[0]).toBeLessThan(3); // medido 2,8 s (de 3,2 a 6,0 s do plano)
  });

  it('as legendas: "A mesma luz" entra com o Sol inteiro acima do limbo, e a ponte para a viagem seguinte é a última do filme e acaba antes dele', () => {
    const legendas = filme.shots[I].captions!;
    const janela = (texto: string) => {
      const c = legendas.find((x) => x.text.startsWith(texto))!;
      const t0 = INICIO + c.at * filme.shots[I].dur;
      return { c, t0, t1: t0 + (c.dur ?? 8.6) };
    };
    const mesmaLuz = janela('A mesma luz');
    expect(solELimbo(journey.at(mesmaLuz.t0)).altura).toBeGreaterThan(RAIO_DO_SOL);
    const ponte = janela('A viagem seguinte');
    // não é `ponte` (a passagem de uma legenda por um corte): não há corte depois dela
    expect(ponte.c.bridge).toBeUndefined();
    expect(ponte.t0).toBeGreaterThanOrEqual(mesmaLuz.t1);
    expect(ponte.t1).toBeLessThanOrEqual(filme.duracao);
    const ultima = Math.max(...filme.shots.flatMap((s, i) =>
      (s.captions ?? []).map((c) => filme.starts[i] + c.at * s.dur)));
    expect(ultima).toBe(ponte.t0);
    expect(FIM).toBe(filme.duracao);
  });
});
