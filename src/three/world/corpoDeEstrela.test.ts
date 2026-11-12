// Serve: lei — as partes puras do corpo de estrela (piloto 12/11): a órbita de Sirius B, a temperatura de Vega e o raio de enquadramento
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  GRANULO_DO_SOL_NA_TELA_EM_RAIOS,
  eixoDeRotacao,
  ganhoDaVisita,
  granuloNaTelaEmRaios,
  raioDaEstrelaPc,
  rocheDe,
  posicaoDaCompanheira,
} from './corpoDeEstrela';
import { ESTRELAS_VISITAVEIS, estrelaVisitavelPorNome } from '../../lib/atlas/estrelasVisitaveis';
import { AU_PARA_PC } from '../../lib/atlas/frameGalactico';
import { RAIO_SOL_PC } from '../escala';
import { radianciaVisivelDeCorpoNegro } from '../luzDaCasa';

const sirius = estrelaVisitavelPorNome('Sirius')!;
const vega = estrelaVisitavelPorNome('Vega')!;
// a posição de catálogo de Sirius (stars_meta.json), pc
const POS_SIRIUS = new THREE.Vector3(-0.4944, 2.4768, -0.7584);

function noCeu(jdAno: number) {
  const d = POS_SIRIUS.length();
  const r = POS_SIRIUS.clone().normalize();
  const jd = 2451545 + (jdAno - 2000) * 365.25;
  const v = new THREE.Vector3(...posicaoDaCompanheira(jd, sirius.companheira!.orbita, [r.x, r.y, r.z], d));
  const z = v.dot(r);
  const ceu = v.clone().addScaledVector(r, -z);
  const leste = new THREE.Vector3(-r.y, r.x, 0).normalize();
  const norte = new THREE.Vector3().crossVectors(r, leste);
  return {
    sepSegArco: ceu.length() / d / AU_PARA_PC,
    paGraus: ((Math.atan2(ceu.dot(leste), ceu.dot(norte)) * 180) / Math.PI + 360) % 360,
  };
}

describe('Sirius B pela órbita de Bond et al. 2017', () => {
  it('no periastro de 1994,57 a separação é a mínima (~a(1−e) projetada)', () => {
    expect(noCeu(1994.5715).sepSegArco).toBeGreaterThan(2);
    expect(noCeu(1994.5715).sepSegArco).toBeLessThan(4);
  });
  it('em 2020 bate a efeméride publicada: ~11,2″ no ângulo de posição ~68°', () => {
    const { sepSegArco, paGraus } = noCeu(2020);
    expect(sepSegArco).toBeCloseTo(11.2, 0);
    expect(paGraus).toBeGreaterThan(63);
    expect(paGraus).toBeLessThan(73);
  });
});

describe('Vega: forma de Roche e escurecimento gravitacional (Monnier 2012)', () => {
  const a = vega.achatamento!;
  it('o polo tem 10.070 K e o raio polar medido', () => {
    const p = rocheDe(0, a);
    expect(p.teffK).toBeCloseTo(10070, 6);
    expect(p.raio).toBeCloseTo(a.raioPolarRsol.v / a.raioEquatorialRsol.v, 12);
  });
  it('o equador tem 8.910 K e raio 1', () => {
    const e = rocheDe(Math.PI / 2, a);
    expect(e.teffK).toBeCloseTo(8910, 6);
    expect(e.raio).toBeCloseTo(1, 12);
  });
  it('o eixo fica a 6,2° da linha até o Sol', () => {
    const pos = new THREE.Vector3(0.9605, -5.9082, 4.8097);
    const eixo = eixoDeRotacao(vega, pos, new THREE.Vector3());
    const paraOSol = pos.clone().normalize().negate();
    expect((eixo.angleTo(paraOSol) * 180) / Math.PI).toBeCloseTo(6.2, 9);
  });
});

describe('o enquadramento do corpo é o raio físico', () => {
  it('raio equatorial em pc, Betelgeuse ~4.950× Proxima', () => {
    for (const e of ESTRELAS_VISITAVEIS) expect(raioDaEstrelaPc(e)).toBe(e.raioRsol.v * RAIO_SOL_PC);
    const b = raioDaEstrelaPc(estrelaVisitavelPorNome('Betelgeuse')!);
    const p = raioDaEstrelaPc(estrelaVisitavelPorNome('Proxima Centauri')!);
    expect(b / p).toBeCloseTo(764 / 0.1542, 6);
  });
});

describe('a concessão cinematográfica dos grânulos é a do Sol, relativa pela lei', () => {
  it('Proxima ~0,67× e Sirius ~1,4× o grânulo que o Sol mostra; teto de 0,1 R', () => {
    const naTela = (n: string) =>
      granuloNaTelaEmRaios(estrelaVisitavelPorNome(n)!.superficie.granuloEmRaios.v) / GRANULO_DO_SOL_NA_TELA_EM_RAIOS;
    expect(naTela('Proxima Centauri')).toBeCloseTo(0.668, 2);
    expect(naTela('Sirius')).toBeCloseTo(1.416, 2);
    expect(granuloNaTelaEmRaios(estrelaVisitavelPorNome('Betelgeuse')!.superficie.granuloEmRaios.v)).toBe(0.1);
  });
});

describe('a exposição da visita: o nível do Sol × (radiância / a do Sol)^¼', () => {
  it('no assistido a ordem física fica e a faixa encolhe; no real nada muda', () => {
    const nivel = (nome: string) => {
      const e = estrelaVisitavelPorNome(nome)!;
      return radianciaVisivelDeCorpoNegro(e.teffK.v) * ganhoDaVisita(e.teffK.v, 'assistida');
    };
    expect(nivel('Proxima Centauri')).toBeCloseTo(0.372, 2);
    expect(nivel('Betelgeuse')).toBeCloseTo(0.51, 2);
    expect(nivel('Sirius')).toBeCloseTo(1.62, 2);
    expect(nivel('Proxima Centauri')).toBeLessThan(nivel('Betelgeuse'));
    expect(nivel('Betelgeuse')).toBeLessThan(1);
    expect(nivel('Sirius')).toBeGreaterThan(1);
    expect(ganhoDaVisita(3054, 'real')).toBe(1);
  });
});
