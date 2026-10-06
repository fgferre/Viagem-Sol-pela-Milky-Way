// Serve: dono — no ato IV a câmera deixa Saturno sem que se veja o céu pular, passa por Urano deitado e por Tritão acesa com Netuno azul ao lado, chega ao coração de Plutão, mostra a luz de verdade e acaba no retrato de família a 40 UA
// URANO, NETUNO E TRITÃO, PLUTÃO E CARONTE E O RETRATO DE FAMÍLIA (cenas
// 20 a 23), no relógio de Journey.at: a troca de JD2 para JD_E fora do
// quadro na saída de Saturno, Urano com o eixo de rotação perto do plano
// da imagem e deitado no quadro, Tritão acesa e fora da sombra de Netuno,
// o coração de Plutão de frente e aceso, a luz do roteiro só em Plutão, o
// retrato a 40 UA olhando o Sol, os nomes só enquanto os corpos são
// pequenos e as juntas sem salto.
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
const { JD_E_SOLAR_TDB } = await import('../pinos');
const { UA } = await import('./geometria');
const { SAIDA_DE_TRITAO, OLHAR_EM_TRITAO, DIRECAO_DO_CORACAO, VISITA_A_PLUTAO } = await import('./afastamento');
const { ANEIS_CITADOS } = await import('../../../../world/corpos/gigante');

const filme = montarFilmeSolar();
const journey = new Journey(filme.shots, filme.starts);
const graus = THREE.MathUtils.radToDeg;
const SOL = filme.pinos.get('sun')!;
const URANO = filme.pinos.get('uranus')!;
const NETUNO = filme.pinos.get('neptune')!;
const TRITAO = filme.pinos.get('triton')!;
const PLUTAO = filme.pinos.get('pluto')!;
const CARONTE = filme.pinos.get('charon')!;
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
/** a base do quadro de 16:9 de uma amostra: longe do polo o cima do rig é o do filme */
const quadro = ({ pos, look, fov }: Amostra) => {
  const frente = look.clone().sub(pos).normalize();
  const cima = filme.cima.clone().addScaledVector(frente, -filme.cima.dot(frente)).normalize();
  return { frente, cima, direita: new THREE.Vector3().crossVectors(frente, cima), meiaAltura: Math.tan(THREE.MathUtils.degToRad(fov / 2)) };
};
/** onde um ponto da cena cai no quadro, em fração de meio quadro (dentro: |x| e |y| até 1) */
const noQuadro = (a: Amostra, p: THREE.Vector3) => {
  const { frente, cima, direita, meiaAltura } = quadro(a);
  const ate = p.clone().sub(a.pos);
  const z = ate.dot(frente);
  return z <= 0
    ? { x: Infinity, y: Infinity }
    : { x: ate.dot(direita) / z / (meiaAltura * 16 / 9), y: ate.dot(cima) / z / meiaAltura };
};
/** o raio aparente de um corpo, em graus */
const raioAparente = (id: string, pos: THREE.Vector3) =>
  graus(Math.asin(Math.min(1, raioPc(id) / pos.distanceTo(filme.pinos.get(id)!))));
/** o canto do quadro de 16:9, em graus do centro, para a lente (vertical) dada */
const meiaDiagonal = (fov: number) =>
  graus(Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) * Math.hypot(1, 16 / 9)));

describe('a saída de Saturno e a troca de JD2 para JD_E', () => {
  const troca = filme.trocas.find((x) => x.de === 'fora' && x.para === 'escuro')!;

  it('cai inteira dentro da saída de Saturno', () => {
    const { inicio, fim } = plano('saturnoSaida');
    expect(troca.t).toBeGreaterThan(inicio);
    expect(troca.t + troca.duracao).toBeLessThan(fim);
  });

  it('Saturno e as luas com pino ficam a mais de meio quadro + 10° da visada (borda do disco) a cada 1/30 s da rampa', () => {
    // em 7 h Saturno gira 237° e Encélado anda 77° na órbita: nada disso no quadro
    const fim = troca.t + troca.duracao;
    let menor = Infinity;
    for (let n = 0; n <= Math.ceil(troca.duracao * 30); n++) {
      const { pos, look, fov } = journey.at(Math.min(troca.t + n / 30, fim));
      const visada = look.clone().sub(pos);
      for (const id of ['saturn', 'enceladus', 'mimas', 'titan', 'hyperion', 'iapetus']) {
        const ate = filme.pinos.get(id)!.clone().sub(pos);
        const borda = graus(visada.angleTo(ate)) - graus(Math.asin(Math.min(1, raioPc(id) / ate.length())));
        menor = Math.min(menor, borda - (meiaDiagonal(fov) + 10));
      }
    }
    expect(menor).toBeGreaterThan(0); // medido 92,5°: estão atrás da câmera
  });

  it('Urano, Netuno e Tritão são pedidos desde o começo da saída de Saturno', () => {
    const { inicio } = plano('saturnoSaida');
    expect(['uranus', 'neptune', 'triton'].filter((id) => !filme.apoios.preAquecerCorpo(inicio, id))).toEqual([]);
  });
});

describe('Urano (cena 20)', () => {
  const k = joelho(URANO, ['uranoChegada', 'uranoPassagem']);
  const r = raioPc('uranus');
  const { i, inicio } = plano('uranoPassagem');
  const s = filme.shots[i];
  const c = s.captions!.find((x) => x.text.startsWith('Urano'))!;
  const t0 = inicio + c.at * s.dur;
  const polo = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.uranus, JD_E_SOLAR_TDB).polo);
  /** o eixo de Urano numa amostra: o ângulo à visada e, no quadro, à horizontal */
  const eixo = (a: Amostra) => {
    const { frente, cima, direita } = quadro(a);
    return {
      aVisada: graus(polo.angleTo(frente)),
      aHorizontal: graus(Math.atan2(Math.abs(polo.dot(cima)), Math.abs(polo.dot(direita)))),
    };
  };

  it('no joelho a câmera está a 6 raios, Urano aceso (fase até 70°) e inteiro no quadro, com os anéis', () => {
    expect(k.d / r).toBeGreaterThanOrEqual(6 * (1 - 1e-9)); // 6,000 raios
    expect(k.d / r).toBeLessThan(6.01);
    expect(fase(k.amostra.pos, URANO)).toBeLessThanOrEqual(70); // medido 58,4°
    const fora = graus(k.amostra.look.clone().sub(k.amostra.pos).angleTo(URANO.clone().sub(k.amostra.pos)));
    const anel = graus(Math.asin((ANEIS_CITADOS.uranus.rExt * r) / k.d));
    expect(fora + anel).toBeLessThan(k.amostra.fov / 2); // o anel ε (2,0 raios) dentro da meia-altura
    expect(Math.abs(filme.apoios.instanteDeQA('urano') - k.t)).toBeLessThan(0.6);
  });

  it('enquanto a legenda está no ar, o eixo de rotação fica perto do plano da imagem (a mais de 60° da visada) e deitado no quadro (a menos de 35° da horizontal)', () => {
    // o critério do "gira deitado": visto de cima (eixo na visada) Urano
    // seria um alvo, e com o eixo de pé no quadro pareceria um planeta
    // qualquer; com o eixo deitado na imagem o anel fica de pé
    let menorAVisada = Infinity;
    let maiorAHorizontal = 0;
    for (let t = t0; t <= t0 + c.dur!; t += 1 / 30) {
      const { aVisada, aHorizontal } = eixo(journey.at(t));
      menorAVisada = Math.min(menorAVisada, Math.min(aVisada, 180 - aVisada));
      maiorAHorizontal = Math.max(maiorAHorizontal, aHorizontal);
    }
    expect(menorAVisada).toBeGreaterThan(60);
    expect(maiorAHorizontal).toBeLessThan(35);
  });

  it('a legenda fica no ar com Urano inteiro no quadro', () => {
    let menor = Infinity;
    for (let t = t0; t <= t0 + c.dur!; t += 1 / 30) {
      const a = journey.at(t);
      const fora = graus(a.look.clone().sub(a.pos).angleTo(URANO.clone().sub(a.pos)));
      menor = Math.min(menor, a.fov / 2 - fora - raioAparente('uranus', a.pos));
    }
    expect(menor).toBeGreaterThan(0);
  });

  it('Urano só tem o nome no quadro enquanto é pequeno (menos de 2° de raio)', () => {
    let maior = 0;
    for (const nome of ['saturnoSaida', 'uranoChegada']) {
      const p = plano(nome);
      expect(filme.shots[p.i].target).toEqual(['uranus']);
      for (let t = p.inicio; t <= p.fim; t += 1 / 30) maior = Math.max(maior, raioAparente('uranus', journey.at(t).pos));
    }
    expect(maior).toBeLessThan(2); // medido 0,83°, no fim da chegada
    expect(filme.shots[i].target ?? []).toEqual([]);
  });
});

describe('Netuno e Tritão (cena 21)', () => {
  const k = joelho(TRITAO, ['netunoChegada', 'tritaoChegada', 'tritaoRaspao']);
  const r = raioPc('triton');

  it('Tritão está do lado aceso de Netuno (até 110° do ponto subsolar) e fora da sombra dele', () => {
    const rel = TRITAO.clone().sub(NETUNO);
    expect(graus(rel.angleTo(SOL.clone().sub(NETUNO)))).toBeLessThanOrEqual(110); // medido 36,4°
    const meiaAbertura = graus(Math.asin(raioPc('neptune') / rel.length()));
    expect(graus(rel.angleTo(NETUNO.clone().sub(SOL))) - meiaAbertura).toBeGreaterThan(10); // 143,6° do eixo; a sombra tem 4,0°
  });

  it('no joelho a câmera está a 3,5 raios de Tritão, acesa (fase até 90°) e inteira no quadro', () => {
    expect(k.d / r).toBeGreaterThanOrEqual(3.5 * (1 - 1e-9)); // 3,500 raios
    expect(k.d / r).toBeLessThan(3.51);
    expect(fase(k.amostra.pos, TRITAO)).toBeLessThanOrEqual(90); // medido 44,9°
    // o disco inteiro: o centro mais o raio, na horizontal e na vertical do quadro
    const { frente, cima, direita, meiaAltura } = quadro(k.amostra);
    const ate = TRITAO.clone().sub(k.amostra.pos);
    const raio = raioAparente('triton', k.amostra.pos);
    expect(Math.abs(graus(Math.atan2(ate.dot(direita), ate.dot(frente)))) + raio)
      .toBeLessThan(graus(Math.atan(meiaAltura * 16 / 9))); // 9,1° + 16,6° contra 35,8°
    expect(Math.abs(graus(Math.atan2(ate.dot(cima), ate.dot(frente)))) + raio)
      .toBeLessThan(graus(Math.atan(meiaAltura))); // 0,4° + 16,6° contra 22,1°
    // e à direita da legenda (embaixo à esquerda, até x = −0,3): o limbo
    // esquerdo de Tritão fica em x > −0,25 — texto branco sobre a lua não se lê
    const limboEsquerdo = Math.tan(Math.atan2(ate.dot(direita), ate.dot(frente)) - THREE.MathUtils.degToRad(raio));
    expect(limboEsquerdo / (meiaAltura * 16 / 9)).toBeGreaterThan(-0.25); // medido −0,18
    expect(Math.abs(filme.apoios.instanteDeQA('tritao') - k.t)).toBeLessThan(0.6);
  });

  it('Netuno fica perto do eixo da vista em toda a passagem (até 16°): a lente retilínea não o estica em oval (menos de 5 %)', () => {
    // um disco pequeno a θ do eixo sai esticado na direção radial por 1/cos θ:
    // a 16°, +4,0 %; na versão com Tritão no centro Netuno ia a 29° (+14 %)
    const { inicio, fim } = plano('tritaoRaspao');
    let maior = 0;
    for (let t = inicio; t < fim; t += 1 / 30) {
      const a = journey.at(t);
      maior = Math.max(maior, graus(a.look.clone().sub(a.pos).angleTo(NETUNO.clone().sub(a.pos))));
    }
    expect(maior).toBeLessThan(16); // medido 15,0°
    expect(1 / Math.cos(THREE.MathUtils.degToRad(maior)) - 1).toBeLessThan(0.05);
  });

  it('no joelho Netuno está no quadro, ao lado de Tritão (não atrás dela), acima da legenda, e aceso do lado da câmera', () => {
    const { x, y } = noQuadro(k.amostra, NETUNO);
    // à esquerda, perto do centro: a legenda fica embaixo à esquerda (de
    // y ≈ −0,3 para baixo) e o fundo dela desfoca o que passa atrás
    expect(x).toBeLessThan(-0.3); // medido −0,37
    expect(x).toBeGreaterThan(-0.85);
    expect(y).toBeGreaterThan(-0.15); // medido −0,03 (o raio de Netuno é 0,18 de meia altura)
    expect(y).toBeLessThan(0.6);
    const pos = k.amostra.pos;
    const separacao = graus(TRITAO.clone().sub(pos).angleTo(NETUNO.clone().sub(pos)));
    expect(separacao).toBeGreaterThan(raioAparente('triton', pos) + raioAparente('neptune', pos)); // 24,1° contra 16,6° + 4,0°
    expect(fase(pos, NETUNO)).toBeLessThanOrEqual(60); // medido 36,4°
  });

  it('a legenda de Tritão está no ar no joelho', () => {
    const { i, inicio } = plano('tritaoRaspao');
    const s = filme.shots[i];
    const c = s.captions!.find((x) => x.text.startsWith('Tritão'))!;
    const t0 = inicio + c.at * s.dur;
    expect(k.t).toBeGreaterThan(t0 + 1);
    expect(k.t).toBeLessThan(t0 + c.dur! - 1);
  });

  it('Netuno e Tritão só têm o nome no quadro enquanto são pequenos (menos de 2° de raio)', () => {
    // Tritão guarda o nome até 1,6°: a lua só é desenhada a partir de
    // ~48 px, e o nome segura o lugar dela até perto de ela aparecer
    let maior = 0;
    for (const [nome, ids] of [['netunoChegada', ['neptune', 'triton']], ['tritaoChegada', ['triton']]] as const) {
      const p = plano(nome);
      expect(filme.shots[p.i].target).toEqual(ids);
      for (let t = p.inicio; t <= p.fim; t += 1 / 30) {
        const { pos } = journey.at(t);
        for (const id of ids) maior = Math.max(maior, raioAparente(id, pos));
      }
    }
    expect(maior).toBeLessThan(2); // medido 1,67°, Netuno no fim da chegada dele
    expect(filme.shots[plano('tritaoRaspao').i].target ?? []).toEqual([]);
  });

  it('a passagem deixa a câmera parada na saída de Tritão, olhando na direção fixa da passagem, com Tritão e Netuno no quadro', () => {
    const { i, fim } = plano('tritaoRaspao');
    const s = filme.shots[i];
    const pos = s.pos(1, new THREE.Vector3());
    expect(pos.distanceTo(SAIDA_DE_TRITAO)).toBeLessThan(1e-9 * pos.length());
    const olhar = s.look(1, new THREE.Vector3()).sub(pos).normalize();
    expect(graus(olhar.angleTo(OLHAR_EM_TRITAO))).toBeLessThan(1e-6);
    for (const corpo of [NETUNO, TRITAO]) {
      const { x, y } = noQuadro(journey.at(fim - 1e-6), corpo);
      expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThan(0.9);
    }
    const v = journey.at(fim - 1e-5).pos.sub(journey.at(fim - 2e-5).pos).divideScalar(1e-5);
    expect(v.length()).toBeLessThan(0.01 * pos.distanceTo(s.pos(0, new THREE.Vector3())) / s.dur);
  });
});

describe('Plutão e Caronte (cena 22)', () => {
  const rP = raioPc('pluto');
  const { i: iLuz, inicio: inicioDaLuz, fim: fimDaLuz } = plano('plutaoLuz');
  const { fim: fimDoArco } = plano('plutaoPar');
  const beat = filme.shots[iLuz];
  const c = beat.captions!.find((x) => x.text.startsWith('Plutão'))!;
  const t0 = inicioDaLuz + c.at * beat.dur;
  const t1 = t0 + c.dur!;
  /** o limbo esquerdo de um corpo no quadro, em fração de meio quadro */
  const limboEsquerdo = (a: Amostra, id: string) => {
    const { frente, direita, meiaAltura } = quadro(a);
    const ate = filme.pinos.get(id)!.clone().sub(a.pos);
    return Math.tan(Math.atan2(ate.dot(direita), ate.dot(frente)) - THREE.MathUtils.degToRad(raioAparente(id, a.pos)))
      / (meiaAltura * 16 / 9);
  };
  /** o corpo inteiro no quadro: o centro mais o raio, na horizontal e na vertical */
  const inteiro = (a: Amostra, id: string) => {
    const { frente, cima, direita, meiaAltura } = quadro(a);
    const ate = filme.pinos.get(id)!.clone().sub(a.pos);
    const r = raioAparente(id, a.pos);
    return Math.abs(graus(Math.atan2(ate.dot(direita), ate.dot(frente)))) + r < graus(Math.atan(meiaAltura * 16 / 9))
      && Math.abs(graus(Math.atan2(ate.dot(cima), ate.dot(frente)))) + r < graus(Math.atan(meiaAltura));
  };

  it('Plutão e Caronte são pedidos desde o começo da chegada', () => {
    const { inicio } = plano('plutaoChegada');
    expect(['pluto', 'charon'].filter((id) => !filme.apoios.preAquecerCorpo(inicio, id))).toEqual([]);
  });

  it('a chegada para a 5,5 raios na direção do coração: o coração de frente (a menos de 1° do ponto sob a câmera) e aceso (até 70° do ponto subsolar)', () => {
    const { pos } = journey.at(inicioDaLuz);
    expect(pos.distanceTo(PLUTAO) / rP).toBeCloseTo(VISITA_A_PLUTAO.coracao, 6);
    expect(graus(DIRECAO_DO_CORACAO.angleTo(pos.clone().sub(PLUTAO)))).toBeLessThan(1); // medido 0,0°
    expect(graus(DIRECAO_DO_CORACAO.angleTo(SOL.clone().sub(PLUTAO)))).toBeLessThanOrEqual(70); // medido 54,0°
    expect(Math.abs(filme.apoios.instanteDeQA('plutao') - inicioDaLuz)).toBeLessThan(0.5);
  });

  it('enquanto a legenda está no ar, Plutão fica inteiro no quadro e à direita dela (limbo esquerdo em x > −0,25), e Caronte também', () => {
    // a legenda longa ocupa x de −0,88 a −0,30 e sobe de y = −0,78 até
    // perto do meio (4 linhas de título e 2 de subtítulo em 1280×720)
    let menorP = Infinity;
    let menorC = Infinity;
    for (let t = t0; t <= t1; t += 1 / 30) {
      const a = journey.at(t);
      expect(inteiro(a, 'pluto')).toBe(true);
      menorP = Math.min(menorP, limboEsquerdo(a, 'pluto'));
      menorC = Math.min(menorC, limboEsquerdo(a, 'charon'));
    }
    expect(menorP).toBeGreaterThan(-0.25); // medido −0,04
    expect(menorC).toBeGreaterThan(-0.25); // medido −0,13
  });

  it('a luz do roteiro: com a câmera parada no coração e a legenda no ar, sobe de 0 a 1, segura 5 s ou mais e volta a 0 antes do arco', () => {
    const luz = (t: number) => journey.at(t).luz;
    expect(luz(inicioDaLuz + 1e-9)).toBe(0);
    let maior = 0;
    let segura = 0;
    let comecaASubir = Infinity;
    let chegaEm1 = Infinity;
    let ultimoAceso = -Infinity;
    for (let t = inicioDaLuz; t < fimDaLuz; t += 1 / 300) {
      const k = luz(t);
      maior = Math.max(maior, k);
      if (k >= 0.99) segura += 1 / 300;
      if (k > 0 && comecaASubir === Infinity) comecaASubir = t;
      if (k >= 0.99 && chegaEm1 === Infinity) chegaEm1 = t;
      if (k > 0) ultimoAceso = t;
    }
    expect(maior).toBeGreaterThanOrEqual(0.99);
    expect(segura).toBeGreaterThanOrEqual(5); // medido 5,4 s
    expect(ultimoAceso).toBeLessThan(fimDaLuz - 0.2); // volta a 0 antes de o arco começar
    expect(luz(fimDaLuz - 1e-9)).toBe(0);
    // a legenda já está no ar quando a luz começa a cair, e fica até ela chegar a 1
    expect(t0).toBeLessThan(comecaASubir);
    expect(t1).toBeGreaterThan(chegaEm1 + 5);
    // o quadro antes da subida, o de k = 1 e o de depois da volta a 0 são o
    // mesmo: a câmera, a mira e a lente não andam no plano inteiro
    const [a, b, d] = [journey.at(comecaASubir - 0.1), journey.at(chegaEm1 + 0.1), journey.at(ultimoAceso + 0.1)];
    expect(d.luz).toBe(0);
    for (const x of [b, d]) {
      expect(a.pos.distanceTo(x.pos)).toBe(0);
      expect(graus(a.look.clone().sub(a.pos).angleTo(x.look.clone().sub(x.pos)))).toBe(0);
      expect(a.fov).toBe(x.fov);
    }
  });

  it('a luz do roteiro é 0 em todo o resto do filme', () => {
    const acesos: string[] = [];
    filme.shots.forEach((s, i) => {
      if (s.nome === 'plutaoLuz') return;
      for (let t = filme.starts[i]; t < filme.starts[i] + s.dur; t += 1 / 30) {
        if (journey.at(t).luz !== 0) { acesos.push(`${s.nome} em ${t.toFixed(2)} s`); break; }
      }
    });
    expect(acesos).toEqual([]);
  });

  it('no fim do arco Caronte, mais perto que Plutão, tem 90 px ou mais de altura em 720p, fica ao lado dele, os dois inteiros e acesos, livre do cartão de transporte, e com o polo norte (Mordor) voltado para a câmera', () => {
    const a = journey.at(fimDoArco - 1e-6);
    expect(inteiro(a, 'pluto')).toBe(true);
    expect(inteiro(a, 'charon')).toBe(true);
    const { meiaAltura } = quadro(a);
    const altura = 2 * 360 * Math.tan(THREE.MathUtils.degToRad(raioAparente('charon', a.pos))) / meiaAltura;
    expect(altura).toBeGreaterThanOrEqual(90); // medido 97 px: desenhado mesmo em DPR 1 (48 px)
    const separacao = graus(PLUTAO.clone().sub(a.pos).angleTo(CARONTE.clone().sub(a.pos)));
    expect(separacao - raioAparente('pluto', a.pos) - raioAparente('charon', a.pos)).toBeGreaterThan(10); // medido 26,3°
    // ao lado: no quadro de 1280×720, mais longe na horizontal que na vertical
    const [p, q] = [noQuadro(a, PLUTAO), noQuadro(a, CARONTE)];
    expect(Math.abs(p.x - q.x) * 640).toBeGreaterThan(Math.abs(p.y - q.y) * 360); // medido 512 contra 374 px
    // o cartão de transporte, embaixo no centro (|x| < 0,25, y < −0,62)
    const r = raioAparente('charon', a.pos) / graus(Math.atan(meiaAltura));
    expect(Math.abs(q.x) - r * 9 / 16 > 0.25 || q.y - r > -0.62).toBe(true); // medido x −0,40, y −0,52
    expect(fase(a.pos, PLUTAO)).toBeLessThanOrEqual(90); // medido 87°: o lado de Plutão que encara Caronte
    expect(fase(a.pos, CARONTE)).toBeLessThanOrEqual(70); // medido 57°
    const polo = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.charon, JD_E_SOLAR_TDB).polo);
    expect(90 - graus(polo.angleTo(a.pos.clone().sub(CARONTE)))).toBeGreaterThanOrEqual(45); // medido 50°
    // e o polo norte de Caronte está no verão: o Sol a 30° dele
    expect(graus(polo.angleTo(SOL.clone().sub(CARONTE)))).toBeLessThan(45);
    expect(Math.abs(filme.apoios.instanteDeQA('caronte') - fimDoArco)).toBeLessThan(0.5);
  });

  it('Plutão só tem o nome no quadro enquanto é pequeno (menos de 2° de raio), e Caronte nunca sobre Plutão grande', () => {
    const p = plano('plutaoChegada');
    expect(filme.shots[p.i].target).toEqual(['pluto']);
    let maior = 0;
    for (let t = p.inicio; t <= p.fim; t += 1 / 30) maior = Math.max(maior, raioAparente('pluto', journey.at(t).pos));
    expect(maior).toBeLessThan(2); // medido 0,1°
    for (const nome of ['plutaoCoracao', 'plutaoLuz', 'plutaoCaronte', 'plutaoPar']) {
      expect(filme.shots[plano(nome).i].target ?? []).toEqual([]);
    }
  });
});

describe('o retrato de família (cena 23)', () => {
  const { i, fim } = plano('pontoAzulPalido');

  it('acaba a 40 UA do Sol, parado, olhando o Sol, com a lente de 12°', () => {
    const a = journey.at(fim - 1e-9); // em `fim` já é o primeiro quadro do epílogo, depois do corte
    expect(a.pos.length() / UA).toBeCloseTo(40, 6);
    expect(graus(a.look.clone().sub(a.pos).angleTo(SOL.clone().sub(a.pos)))).toBeLessThan(1e-6);
    expect(a.fov).toBeCloseTo(12, 6);
    expect(filme.shots[i].pos(1, new THREE.Vector3()).distanceTo(journey.at(fim - 2).pos)).toBe(0);
  });

  it('os nomes do retrato: o Sol e os quatro planetas da Voyager, mais Marte', () => {
    expect(filme.shots[i].target).toEqual(['SOL', 'earth', 'venus', 'mars', 'jupiter', 'saturn']);
    expect(filme.shots[plano('retratoRecuo').i].target).toEqual(['SOL']);
  });
});

describe('as juntas do ato IV', () => {
  /** a velocidade da câmera logo antes e logo depois do instante t, por diferenças de h segundos */
  const velocidades = (t: number, h = 1e-5) => {
    const v = (a: number, b: number) => journey.at(b).pos.sub(journey.at(a).pos).divideScalar(b - a);
    return { antes: v(t - 2 * h, t - h), depois: v(t + h, t + 2 * h) };
  };

  it.each([
    'uranoChegada', 'uranoPassagem', 'netunoChegada', 'tritaoChegada', 'tritaoRaspao',
    'plutaoChegada', 'plutaoCoracao', 'plutaoLuz', 'plutaoCaronte', 'plutaoPar', 'retratoRecuo', 'pontoAzulPalido',
  ])(
    'a junta que abre o plano %s não salta de posição, de olhar nem de lente, e a câmera para dos dois lados ou passa com a mesma velocidade',
    (nome) => {
      const { i, inicio: t } = plano(nome);
      const fim = filme.shots[i - 1].pos(1, new THREE.Vector3());
      expect(fim.distanceTo(filme.shots[i].pos(0, new THREE.Vector3()))).toBeLessThan(1e-9 * fim.length());
      const [a, b] = [journey.at(t - 1e-6), journey.at(t + 1e-6)];
      expect(graus(a.look.clone().sub(a.pos).angleTo(b.look.clone().sub(b.pos)))).toBeLessThan(0.01);
      expect(Math.abs(a.fov - b.fov)).toBeLessThan(1e-3);
      // a régua do "parado" é a velocidade média do plano — ou a do anterior,
      // quando o plano é a câmera fixa da luz de Plutão (média zero)
      const media = Math.max(
        filme.shots[i].pos(1, new THREE.Vector3()).distanceTo(fim) / filme.shots[i].dur,
        fim.distanceTo(filme.shots[i - 1].pos(0, new THREE.Vector3())) / filme.shots[i - 1].dur);
      const { antes, depois } = velocidades(t);
      const para = Math.max(antes.length(), depois.length()) < 0.01 * media;
      const passaIgual = antes.distanceTo(depois) < 0.15 * antes.length();
      expect(para || passaIgual).toBe(true);
    }
  );
});
