// Serve: física — o céu das nuvens diz quem tem poeira entre si e o Sol, e só quem tem é escurecido pelo quad multiplicativo
// ============================================================
// O CÉU DAS NUVENS (item 37).
//
// A camada de nuvens moleculares é um quad MULTIPLICATIVO que cai sobre
// o framebuffer inteiro — nenhuma camada aditiva escreve profundidade,
// então o `depthTest` do quad não tem contra o que rejeitar e ele apaga
// junto quem está NA FRENTE dele. Medido em 31/08: uma estrela do
// catálogo a 56,5 pc, com a nuvem viva mais próxima da visada a 121 pc,
// perdia 49,7% da luz em espaço linear.
//
// O conserto é de ORDEM, e a ordem precisa deste oráculo: quem NÃO tem
// nuvem viva entre si e o Sol desenha depois do quad. O que se cobra
// aqui é a resposta dele, ponto a ponto — e as duas metades que ela não
// pode perder:
//   · quem está na frente da nuvem não é escurecido (o defeito);
//   · quem está ATRÁS continua sendo (a extinção certa não morre junto).
// ============================================================
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ObservedClouds } from './observedClouds';
import { galactocentricToScene } from './baseGalactica';
import type { CatalogueTable } from '../cartography/galacticAssets';

const VAZIA: CatalogueTable = { data: new Float32Array(0), count: 0, stride: 9 };

/** uma tabela CO (stride 11) com as nuvens dadas, todas recomendadas */
function tabelaCO(
  nuvens: Array<{ l: [number, number, number]; raio: number; superficie: number }>
): CatalogueTable {
  const stride = 11;
  const data = new Float32Array(nuvens.length * stride);
  nuvens.forEach((n, i) => {
    const o = i * stride;
    data[o] = n.l[0];
    data[o + 1] = n.l[1];
    data[o + 2] = n.l[2];
    data[o + 3] = n.raio;
    data[o + 5] = n.superficie; // vira alpha = s/(s+130) · 0,34
    data[o + 10] = 1; // rendererRecommended
  });
  return { data, count: nuvens.length, stride };
}

/** o ponto a `t` vezes a distância da nuvem, na MESMA direção dela */
function naLinha(l: [number, number, number], t: number) {
  const p = galactocentricToScene(l[0], l[1], l[2], new THREE.Vector3());
  return p.multiplyScalar(t);
}

// a nuvem de referência: o Sol está na origem da cena, e
// `galactocentricToScene` põe esta em ~500 pc dele (o raio do catálogo
// entra ×2,1, com piso de 26 pc)
const SOL_GAL: [number, number, number] = [8150, 0, 0];
const NUVEM: [number, number, number] = [8150, 500, 0];

describe('o céu das nuvens — quem tem poeira entre si e o Sol', () => {
  const clouds = new ObservedClouds(
    tabelaCO([{ l: NUVEM, raio: 20, superficie: 400 }]),
    VAZIA
  );
  const centro = naLinha(NUVEM, 1);
  const distDaNuvem = centro.length();
  const raio = Math.max(20 * 2.1, 26);

  it('quem está na frente da nuvem NÃO tem nuvem na frente', () => {
    // a estrela do tiro único: a 56,5 pc, com a nuvem a 121 pc
    const p = naLinha(NUVEM, 0.4);
    expect(p.length()).toBeLessThan(distDaNuvem - raio);
    expect(clouds.temNuvemNaFrente(p.x, p.y, p.z)).toBe(false);
  });

  it('quem está ATRÁS da nuvem tem — a extinção certa não morre junto', () => {
    const p = naLinha(NUVEM, 3);
    expect(clouds.temNuvemNaFrente(p.x, p.y, p.z)).toBe(true);
  });

  it('quem está DENTRO do volume também tem: já há coluna pela frente', () => {
    const p = naLinha(NUVEM, 1 - (0.5 * raio) / distDaNuvem);
    expect(p.length()).toBeGreaterThan(distDaNuvem - raio);
    expect(p.length()).toBeLessThan(distDaNuvem);
    expect(clouds.temNuvemNaFrente(p.x, p.y, p.z)).toBe(true);
  });

  it('fora do cone do billboard, ninguém é escurecido', () => {
    // 5° ao lado, muito além do raio angular da nuvem (2,9°)
    const raioAngular = Math.atan2(raio, distDaNuvem);
    expect(raioAngular).toBeLessThan(0.09);
    const eixo = new THREE.Vector3(1, 0, 0)
      .cross(centro)
      .normalize();
    const p = centro
      .clone()
      .multiplyScalar(3)
      .applyAxisAngle(eixo, raioAngular + 0.05);
    expect(clouds.temNuvemNaFrente(p.x, p.y, p.z)).toBe(false);
    // e DENTRO do cone, à mesma distância, é escurecido — o par que
    // separa "está fora" de "o oráculo não acha nada"
    const dentro = centro
      .clone()
      .multiplyScalar(3)
      .applyAxisAngle(eixo, raioAngular * 0.5);
    expect(clouds.temNuvemNaFrente(dentro.x, dentro.y, dentro.z)).toBe(true);
  });

  it('a borda do cone é a do quad: dentro escurece, fora não', () => {
    const raioAngular = Math.atan2(raio, distDaNuvem);
    const eixo = new THREE.Vector3(0, 0, 1).cross(centro).normalize();
    const em = (ang: number) => {
      const p = centro.clone().multiplyScalar(2).applyAxisAngle(eixo, ang);
      return clouds.temNuvemNaFrente(p.x, p.y, p.z);
    };
    expect(em(raioAngular * 0.98)).toBe(true);
    expect(em(raioAngular * 1.02)).toBe(false);
  });

  it('o Sol não tem nuvem na frente de si mesmo', () => {
    expect(clouds.temNuvemNaFrente(0, 0, 0)).toBe(false);
  });

  it('nuvem sem alpha vivo não escurece ninguém', () => {
    // superfície 1 dá alpha 0,0026 — abaixo do descarte do fragmento, e
    // o construtor nem a admite (corte em 0,015)
    const mortas = new ObservedClouds(
      tabelaCO([{ l: NUVEM, raio: 20, superficie: 1 }]),
      VAZIA
    );
    const p = naLinha(NUVEM, 3);
    expect(mortas.temNuvemNaFrente(p.x, p.y, p.z)).toBe(false);
  });

  it('o céu inteiro responde — a peneira de direção não perde nuvem', () => {
    // 200 nuvens espalhadas por todo o céu, inclusive nos polos da
    // grade: cada uma tem de ser achada na PRÓPRIA direção. Uma grade
    // que erre a conversão de longitude perto do polo falha aqui.
    const espalhadas: Array<{ l: [number, number, number]; raio: number; superficie: number }> = [];
    for (let i = 0; i < 200; i++) {
      const u = (i + 0.5) / 200;
      const lat = Math.asin(2 * u - 1);
      const lon = i * 2.399963;
      const r = 900;
      espalhadas.push({
        l: [
          8150 + r * Math.cos(lat) * Math.cos(lon),
          r * Math.cos(lat) * Math.sin(lon),
          r * Math.sin(lat),
        ],
        raio: 30,
        superficie: 400,
      });
    }
    const ceu = new ObservedClouds(tabelaCO(espalhadas), VAZIA);
    for (const n of espalhadas) {
      const atras = naLinha(n.l, 2.5);
      expect(
        ceu.temNuvemNaFrente(atras.x, atras.y, atras.z),
        `atrás da nuvem em ${n.l.map((v) => v.toFixed(0)).join(',')}`
      ).toBe(true);
      const frente = naLinha(n.l, 0.3);
      expect(
        ceu.temNuvemNaFrente(frente.x, frente.y, frente.z),
        `na frente da nuvem em ${n.l.map((v) => v.toFixed(0)).join(',')}`
      ).toBe(false);
    }
  });

  it('o Sol de referência: sem nuvem nenhuma, ninguém é escurecido', () => {
    const semNuvens = new ObservedClouds(tabelaCO([]), VAZIA);
    const p = naLinha(SOL_GAL, 1);
    expect(semNuvens.temNuvemNaFrente(p.x, p.y, p.z)).toBe(false);
  });
});
