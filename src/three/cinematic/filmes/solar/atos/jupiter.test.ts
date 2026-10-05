// Serve: dono — o céu passa da hora de Júpiter para a de Saturno sem que se veja Júpiter girar nem as luas pularem
// A TROCA QUE FECHA O ATO II: o céu de JD_J (o de Júpiter) passa ao de
// JD2 (o dos atos de fora) numa rampa dentro da chegada a Saturno
// (`trocas`, em ../montar.ts). Na rampa Júpiter gira 213° e Io anda 50°
// na órbita; nada disso pode estar no quadro. A câmera e a lente vêm do
// relógio de Journey.at, a cada quadro de 1/30 s; os corpos, dos pinos
// (onde o palco os desenha durante o filme).
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeSolar, raioPc } = await import('../montar');
const { Journey } = await import('../../../journey');

const filme = montarFilmeSolar();
const journey = new Journey(filme.shots, filme.starts);
const troca = filme.trocas.find((x) => x.de === 'jupiter' && x.para === 'fora')!;
const CORPOS = ['jupiter', 'io', 'europa', 'ganymede', 'callisto'];
const graus = THREE.MathUtils.radToDeg;
/** o canto do quadro de 16:9, em graus do centro, para a lente (vertical) dada */
const meiaDiagonal = (fov: number) =>
  graus(Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) * Math.hypot(1, 16 / 9)));

describe('a troca de JD_J para JD2', () => {
  it('cai inteira dentro da chegada a Saturno', () => {
    const i = filme.shots.findIndex((s) => s.nome === 'saturnoChegada');
    expect(troca.t).toBeGreaterThan(filme.starts[i]);
    expect(troca.t + troca.duracao).toBeLessThan(filme.starts[i] + filme.shots[i].dur);
  });

  it('Júpiter e as quatro galileanas ficam a mais de meio quadro + 10° da visada (borda do disco) a cada 1/30 s da rampa', () => {
    const fim = troca.t + troca.duracao;
    let menor = Infinity;
    for (let n = 0; n <= Math.ceil(troca.duracao * 30); n++) {
      const { pos, look, fov } = journey.at(Math.min(troca.t + n / 30, fim));
      const visada = look.clone().sub(pos);
      for (const id of CORPOS) {
        const ate = filme.pinos.get(id)!.clone().sub(pos);
        const borda = graus(visada.angleTo(ate)) - graus(Math.asin(Math.min(1, raioPc(id) / ate.length())));
        menor = Math.min(menor, borda - (meiaDiagonal(fov) + 10));
      }
    }
    expect(menor).toBeGreaterThan(0); // medido 118,6°: estão atrás da câmera
  });
});

// A CHEGADA A JÚPITER E O RASPÃO DE IO (cenas 10 e 11), no relógio de
// Journey.at: a Mancha de frente no pouso, a chegada longe do planeta, e
// no joelho de Io ela acesa com Júpiter inteiro no quadro.
const { A_MANCHA, PONTOS_JUPITER } = await import('./jupiter');
const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur };
};
const JUPITER = filme.pinos.get('jupiter')!;
const IO = filme.pinos.get('io')!;
/** o joelho de Io: o instante do raspão mais perto dela, a cada 1/300 s */
const joelhoDeIo = (() => {
  const { inicio, fim } = plano('ioRaspao');
  let melhor = { t: inicio, d: Infinity };
  for (let t = inicio; t <= fim; t += 1 / 300) {
    const d = journey.at(t).pos.distanceTo(IO);
    if (d < melhor.d) melhor = { t, d };
  }
  return journey.at(melhor.t);
})();

/** o quadro de 16:9 de uma amostra de Journey.at: longe do polo o cima do
 *  rig é o do filme; `meiaAltura` é a tangente da meia lente vertical */
const quadro = ({ pos, look, fov }: { pos: THREE.Vector3; look: THREE.Vector3; fov: number }) => {
  const frente = look.clone().sub(pos).normalize();
  const cima = filme.cima.clone().addScaledVector(frente, -filme.cima.dot(frente)).normalize();
  const direita = new THREE.Vector3().crossVectors(frente, cima);
  return { pos, frente, cima, direita, meiaAltura: Math.tan(THREE.MathUtils.degToRad(fov / 2)) };
};
/** quanto falta, em fração de meio quadro, entre o limbo do disco (o cone
 *  tangente) e a beira mais próxima do quadro; negativo: o disco sai */
function folgaDoDisco(amostra: Parameters<typeof quadro>[0], centroDoCorpo: THREE.Vector3, raioDoCorpo: number) {
  const { pos, frente, cima, direita, meiaAltura } = quadro(amostra);
  const ate = centroDoCorpo.clone().sub(pos);
  const centro = ate.clone().normalize();
  const raio = Math.asin(raioDoCorpo / ate.length());
  const p = new THREE.Vector3().crossVectors(centro, cima).normalize();
  const q = new THREE.Vector3().crossVectors(centro, p);
  let folga = Infinity;
  for (let n = 0; n < 360; n++) {
    const a = THREE.MathUtils.degToRad(n);
    const borda = centro.clone().multiplyScalar(Math.cos(raio))
      .addScaledVector(p, Math.sin(raio) * Math.cos(a)).addScaledVector(q, Math.sin(raio) * Math.sin(a));
    const z = borda.dot(frente);
    const x = Math.abs(borda.dot(direita) / z) / (meiaAltura * 16 / 9);
    const y = Math.abs(borda.dot(cima) / z) / meiaAltura;
    folga = Math.min(folga, z > 0 ? 1 - Math.max(x, y) : -1);
  }
  return folga;
}

describe('a chegada a Júpiter e o raspão de Io', () => {
  it('a chegada pousa com a Grande Mancha Vermelha a menos de 15° do ponto sob a câmera', () => {
    const { pos } = journey.at(plano('jupiterMancha').fim - 1e-6);
    expect(graus(pos.clone().sub(JUPITER).angleTo(A_MANCHA))).toBeLessThan(15); // medido 10,0°
  });

  it('a chegada nunca passa a menos de 1,3 raio de Júpiter', () => {
    let menor = Infinity;
    for (let t = plano('jupiterChegada').inicio; t <= plano('jupiterMancha').fim; t += 0.01) {
      menor = Math.min(menor, journey.at(t).pos.distanceTo(JUPITER) / raioPc('jupiter'));
    }
    expect(menor).toBeGreaterThanOrEqual(1.3); // medido 2,95, no pouso
  });

  it('no joelho de Io a fase dela é de no máximo 70° (acesa)', () => {
    const fase = graus(joelhoDeIo.pos.clone().sub(IO).angleTo(IO.clone().negate()));
    expect(fase).toBeLessThanOrEqual(70); // medido 26,8°
  });

  it('no joelho de Io o disco de Júpiter cabe inteiro no quadro de 16:9', () => {
    expect(folgaDoDisco(joelhoDeIo, JUPITER, raioPc('jupiter'))).toBeGreaterThan(0); // medido 0,24 de meio quadro entre o limbo e a beira
  });
});

// EUROPA E O QUASE-SOL (cenas 12 e 13), no mesmo relógio: Europa acesa no
// joelho; o Sol e Júpiter inteiro no mesmo quadro por 6 s ou mais, antes
// de o olhar virar para Saturno; e o número da legenda do quase-sol.
const { GM_CORPOS } = await import('../../../../../lib/atlas/massas');
const EUROPA = filme.pinos.get('europa')!;
const SOL = filme.pinos.get('sun')!;
/** a beira que o Sol não passa: o brilho e os raios dele são maiores que o ponto */
const MARGEM_DO_SOL = 3;
/** o Sol dentro do quadro de 16:9, a `MARGEM_DO_SOL` graus da beira, na horizontal e na vertical */
const solNoQuadro = (t: number) => {
  const { pos, frente, cima, direita, meiaAltura } = quadro(journey.at(t));
  const ate = SOL.clone().sub(pos).normalize();
  const z = ate.dot(frente);
  if (z <= 0) return false;
  const horizontal = graus(Math.atan(Math.abs(ate.dot(direita)) / z));
  const vertical = graus(Math.atan(Math.abs(ate.dot(cima)) / z));
  return horizontal < graus(Math.atan(meiaAltura * 16 / 9)) - MARGEM_DO_SOL
    && vertical < graus(Math.atan(meiaAltura)) - MARGEM_DO_SOL;
};
/** onde a virada para Saturno começa: o olhar sai do rumo fixo do quase-sol
 *  (mais de 0,5°). Na virada o Sol cruza o quadro e Júpiter sai dele */
const viradaParaSaturno = (() => {
  const { inicio, fim } = plano('jupiterRumoDeSaturno');
  for (let t = inicio; t < fim; t += 1 / 30) {
    const { pos, look } = journey.at(t);
    if (graus(look.clone().sub(pos).angleTo(PONTOS_JUPITER.miraDoQuaseSol.clone().sub(pos))) > 0.5) return t;
  }
  return fim;
})();
/** o trecho contínuo mais longo, a cada 1/30 s do começo do arco à virada
 *  para Saturno, em que o Sol está no quadro: os instantes amostrados */
const comOSol = (() => {
  const inicio = plano('jupiterArco').inicio;
  const fim = viradaParaSaturno;
  let melhor: number[] = [];
  let atual: number[] = [];
  for (let n = 0; inicio + n / 30 < fim; n++) {
    const t = inicio + n / 30;
    if (solNoQuadro(t)) atual.push(t);
    else atual = [];
    if (atual.length > melhor.length) melhor = [...atual];
  }
  return melhor;
})();

describe('Europa e o quase-sol', () => {
  it('no joelho de Europa a fase dela é de no máximo 90° (acesa)', () => {
    const { inicio, fim } = plano('europaRaspao');
    let melhor = { t: inicio, d: Infinity };
    for (let t = inicio; t <= fim; t += 1 / 300) {
      const d = journey.at(t).pos.distanceTo(EUROPA);
      if (d < melhor.d) melhor = { t, d };
    }
    const { pos } = journey.at(melhor.t);
    expect(graus(pos.clone().sub(EUROPA).angleTo(SOL.clone().sub(EUROPA)))).toBeLessThanOrEqual(90); // medido 36,0°
  });

  it('o Sol fica dentro do quadro por 6 s ou mais seguidos, do arco até o olhar virar para Saturno', () => {
    expect(comOSol.length / 30).toBeGreaterThanOrEqual(6); // medido 7,0 s (197,3 a 204,3 s)
  });

  it('nesse mesmo trecho o disco de Júpiter cabe inteiro no quadro', () => {
    const menor = Math.min(...comOSol.map((t) => folgaDoDisco(journey.at(t), JUPITER, raioPc('jupiter'))));
    expect(menor).toBeGreaterThan(0); // medido 0,09 de meio quadro
  });

  it('o quase-sol: Júpiter precisaria ser 80 vezes mais pesado para virar estrela', () => {
    // a menor massa que acende o hidrogênio no centro, para a composição
    // do Sol: 0,075 massa solar (Burrows et al. 1997, ApJ 491, 856; a
    // revisão de Burrows et al. 2001, Rev. Mod. Phys. 73, 719, dá
    // 0,07–0,08 conforme a composição), ~0,08 no número redondo dos
    // livros. Júpiter tem 1/1048 da massa do Sol (a razão dos GM de
    // gm_de440.tpc, em massas.ts): 78,6 a 83,8 vezes — "80"
    const razao = GM_CORPOS.sun / GM_CORPOS.jupiter;
    expect(0.075 * razao).toBeLessThanOrEqual(80);
    expect(0.08 * razao).toBeGreaterThanOrEqual(80);
    const legendas = filme.shots.flatMap((s) => s.captions ?? []).filter((c) => c.text.includes('segunda estrela'));
    expect(legendas).toHaveLength(1);
    expect(legendas[0].sub).toContain('precisaria ser 80 vezes mais pesado');
    expect(legendas[0].en?.sub).toContain('80 times heavier');
  });
});
