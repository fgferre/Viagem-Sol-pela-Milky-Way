// ============================================================
// Gate da onda para o frame galáctico (TAREFA G): dois faróis no céu
// real — Sgr A* e o polo eclíptico norte — mais a prova de construção
// (NGP → b = 90° a 1e-9), a ortonormalidade das matrizes e o ORÁCULO
// que amarra runtime e pipeline: os casos fixos que verify-assets.mjs
// cobra de heliocentricGalacticToProject, reproduzidos aqui a 1e-8.
// A duplicação .mjs/.ts é deliberada (cabeçalho do módulo); este
// arquivo É o elo — se a convenção mudar de um lado, quebra aqui.
// ============================================================
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Mat3, Vec3 } from './frameGalactico';
import {
  ALTURA_SOL_PC,
  AU_PARA_PC,
  MATRIZ_ECLIPTICA_PARA_EQUATORIAL,
  MATRIZ_EQUATORIAL_PARA_GALACTICA,
  NGP_DEC_DEG,
  NGP_RA_DEG,
  R0_PC,
  eclipticaParaEquatorial,
  equatorialParaEcliptica,
  equatorialParaGalactica,
  galacticaParaEquatorial,
  heliocentricaEclipticaUAParaBaseGalactocentricaPc,
  radecParaGalactica,
} from './frameGalactico';

const DEG = Math.PI / 180;
const PC_EM_AU = 1 / AU_PARA_PC; // inverso do literal 206264.80624548031

function versorEquatorial(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const cosDec = Math.cos(dec);
  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

function lbDeVetor(g: Vec3): { lDeg: number; bDeg: number } {
  let lDeg = (Math.atan2(g[1], g[0]) * 180) / Math.PI;
  if (lDeg < 0) lDeg += 360;
  const bDeg = (Math.atan2(g[2], Math.hypot(g[0], g[1])) * 180) / Math.PI;
  return { lDeg, bDeg };
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalizar(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

function determinante(m: Mat3): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

// RNG determinístico da casa (mesmo mulberry32 de galaxy.ts): os vetores
// do round-trip são idênticos em toda rodada — falha reproduzível.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('frameGalactico', () => {
  describe('gate (a): Sgr A*', () => {
    // Posição ICRS de Sgr A* (Reid & Brunthaler 2004, rádio VLBI).
    const RA_SGR = 266.4168262;
    const DEC_SGR = -29.0078106;

    it('cai em l = 359.94423°, b = −0.04616° a 0,01°', () => {
      const { lDeg, bDeg } = radecParaGalactica(RA_SGR, DEC_SGR);
      expect(Math.abs(lDeg - 359.94423)).toBeLessThan(0.01);
      expect(Math.abs(bDeg - -0.04616)).toBeLessThan(0.01);
    });

    it('a direção na base do projeto, vista do Sol, aponta para a origem (o GC)', () => {
      // A direção independe da distância escolhida; 8178 pc é a medida
      // GRAVITY (2019), usada só para dar escala realista ao vetor.
      const dPc = 8_178;
      const ecl = equatorialParaEcliptica(versorEquatorial(RA_SGR, DEC_SGR));
      const posAU: Vec3 = [
        ecl[0] * dPc * PC_EM_AU,
        ecl[1] * dPc * PC_EM_AU,
        ecl[2] * dPc * PC_EM_AU,
      ];
      const base = heliocentricaEclipticaUAParaBaseGalactocentricaPc(posAU);
      // O Sol na base do projeto é (8150, 0, 5.5); a origem é o GC.
      const direcao = normalizar([
        base[0] - R0_PC,
        base[1],
        base[2] - ALTURA_SOL_PC,
      ]);
      const paraOrigem = normalizar([-R0_PC, 0, -ALTURA_SOL_PC]);
      expect(dot(direcao, paraOrigem)).toBeGreaterThan(0.999999);
    });
  });

  describe('gate (b): polo eclíptico norte', () => {
    it('o vetor eclíptico (0,0,1) cai em l = 96.384°, b = +29.811° a 0,01°', () => {
      const gal = equatorialParaGalactica(eclipticaParaEquatorial([0, 0, 1]));
      const { lDeg, bDeg } = lbDeVetor(gal);
      expect(Math.abs(lDeg - 96.384)).toBeLessThan(0.01);
      expect(Math.abs(bDeg - 29.811)).toBeLessThan(0.01);
    });
  });

  describe('gate (c): NGP volta como polo exato', () => {
    it('radecParaGalactica(NGP) dá b = 90° a 1e-9', () => {
      const { bDeg } = radecParaGalactica(NGP_RA_DEG, NGP_DEC_DEG);
      expect(Math.abs(bDeg - 90)).toBeLessThan(1e-9);
    });
  });

  describe('gate (d): ortonormalidade e round-trip', () => {
    it('as duas matrizes têm determinante +1 a 1e-12', () => {
      expect(
        Math.abs(determinante(MATRIZ_ECLIPTICA_PARA_EQUATORIAL) - 1)
      ).toBeLessThan(1e-12);
      expect(
        Math.abs(determinante(MATRIZ_EQUATORIAL_PARA_GALACTICA) - 1)
      ).toBeLessThan(1e-12);
    });

    it('ida-e-volta devolve o vetor original a 1e-12 (semente fixa)', () => {
      const rng = mulberry32(0x5eed_cafe);
      const proximo = (): Vec3 => [
        rng() * 2 - 1,
        rng() * 2 - 1,
        rng() * 2 - 1,
      ];
      for (let i = 0; i < 32; i++) {
        const v = proximo();
        const viaEquatorial = equatorialParaEcliptica(
          eclipticaParaEquatorial(v)
        );
        const viaGalactica = galacticaParaEquatorial(
          equatorialParaGalactica(v)
        );
        for (let eixo = 0; eixo < 3; eixo++) {
          expect(Math.abs(viaEquatorial[eixo] - v[eixo])).toBeLessThan(1e-12);
          expect(Math.abs(viaGalactica[eixo] - v[eixo])).toBeLessThan(1e-12);
        }
      }
    });
  });

  describe('gate (e): oráculo da ponte de cena (casos de verify-assets.mjs)', () => {
    // Os MESMOS quatro casos fixos que verify-assets.mjs cobra de
    // heliocentricGalacticToProject — o elo deliberado pipeline↔runtime.
    const casos: ReadonlyArray<{
      entrada: readonly [number, number, number]; // (l°, b°, d pc)
      esperado: readonly [number, number, number];
    }> = [
      { entrada: [0, 0, 100], esperado: [8_050, 0, 5.5] },
      { entrada: [90, 0, 100], esperado: [8_150, -100, 5.5] },
      { entrada: [270, 0, 100], esperado: [8_150, 100, 5.5] },
      { entrada: [0, 90, 100], esperado: [8_150, 0, 105.5] },
    ];

    it.each(casos)(
      '(l=$entrada.0°, b=$entrada.1°, d=$entrada.2 pc) → $esperado',
      ({ entrada, esperado }) => {
        const [lDeg, bDeg, dPc] = entrada;
        // O caso fixo é esférico galáctico; o runtime recebe eclíptica em
        // AU — desandamos a ponte (galáctica → equatorial → eclíptica,
        // pc → AU) e cobramos que a ida reproduza o pipeline a 1e-8.
        const l = lDeg * DEG;
        const b = bDeg * DEG;
        const galPc: Vec3 = [
          dPc * Math.cos(b) * Math.cos(l),
          dPc * Math.cos(b) * Math.sin(l),
          dPc * Math.sin(b),
        ];
        const eclPc = equatorialParaEcliptica(galacticaParaEquatorial(galPc));
        const eclAU: Vec3 = [
          eclPc[0] * PC_EM_AU,
          eclPc[1] * PC_EM_AU,
          eclPc[2] * PC_EM_AU,
        ];
        const base = heliocentricaEclipticaUAParaBaseGalactocentricaPc(eclAU);
        for (let eixo = 0; eixo < 3; eixo++) {
          expect(Math.abs(base[eixo] - esperado[eixo])).toBeLessThan(1e-8);
        }
      }
    );
  });

  describe('gate (f): a armadilha do caminho composto (resíduo PINADO)', () => {
    // POR QUE ESTE TESTE EXISTE. A função acima se chamava
    // `posicaoHeliocentricaEclipticaParaCena`, e "ParaCena" convidava a
    // compor com `galactocentricToScene` (three/world/galaxy.ts) para
    // chegar às coordenadas da cena. A composição parece a identidade — a
    // ida põe o Sol em (8150, 0, 5.5) na base dos binários, a volta
    // desfaz — mas NÃO é: as duas pontes são construídas de números
    // diferentes. `GAL.GC_POS` sai de `DIR_GC` e `NGP`, versores literais
    // arredondados a 10 casas em galaxy.ts:44-46; a base deste módulo sai
    // da definição IAU (NGP + lNCP) em float64 cheio. O desencontro é
    // MEDIDO aqui: o Sol volta a 5,4959e-7 pc da origem — 0,1134 AU.
    //
    // Para uma estrela a centenas de pc isso é ruído abaixo de qualquer
    // gate. Para um PLANETA em escala real (Onda 4) é a distância
    // Terra–Sol em ordem de grandeza: Mercúrio nasceria fora do lugar por
    // um terço da própria órbita.
    //
    // O TESTE AFIRMA O RESÍDUO, e não o conserta. "Consertar" seria
    // realinhar `GAL.GC_POS`/EX/EY/EZ com esta álgebra, o que moveria a
    // GALÁXIA INTEIRA (todo binário de public/data/galaxy passa por
    // `galactocentricToScene`) e portanto os md5 das 15 vistas oficiais —
    // preço altíssimo por 0,1134 AU que nenhuma vista enxerga. O caminho
    // dos planetas não passa por aqui: é
    // `eclipticaParaEquatorial(vAU) × AU_PARA_PC`, uma rotação e uma
    // multiplicação sobre uma cena que já é heliocêntrica equatorial
    // J2000 em pc com o Sol na ORIGEM — sem origem para errar (a segunda
    // asserção deste bloco).
    it('o Sol composto de volta cai a 5,4959e-7 pc (0,1134 AU) da origem, não nela', async () => {
      // `galaxy.ts` lê `window.location.search` no topo do módulo (os
      // knobs de varredura por URL das rodadas 18+), e o ambiente do
      // vitest é `node`. Daí o stub mínimo e o import dinâmico: nenhuma
      // linha de render muda, só se encena o que o navegador já dá.
      (globalThis as unknown as { window: unknown }).window = {
        location: { search: '' },
      };
      const { galactocentricToScene } = await import('../../three/world/galaxy');

      const base = heliocentricaEclipticaUAParaBaseGalactocentricaPc([0, 0, 0]);
      // a ida é exata: o Sol é o (8150, 0, 5.5) dos binários. O y é −0
      // porque o sinal deliberado da casa (+Y → l = 270°) nega um zero —
      // e `toBe` usa Object.is, que separa os dois zeros.
      expect(base[0]).toBe(R0_PC);
      expect(base[1]).toBe(-0);
      expect(base[2]).toBe(ALTURA_SOL_PC);

      const cena = galactocentricToScene(
        base[0],
        base[1],
        base[2],
        new THREE.Vector3()
      );
      const residuoPc = cena.length();
      const RESIDUO_PC = 5.495929215356232e-7; // medido 2026-08-11, V8/node
      // TOLERÂNCIA RELATIVA de 1e-4, e ela é apertada onde importa: o
      // resíduo é um CANCELAMENTO de números da ordem de 8150, então 1 ULP
      // nas entradas já o move ~3e-6 em relativo — abaixo de 1e-4 o teste
      // ficaria frágil sem julgar mais nada. E 1e-4 ainda pina quatro
      // dígitos de um número que a composição prometia ser ZERO: o resíduo
      // é ~5e5 vezes maior que o erro de arredondamento de um caminho
      // exato (segunda asserção), que é o que este gate cobra.
      expect(Math.abs(residuoPc / RESIDUO_PC - 1)).toBeLessThan(1e-4);
      expect(residuoPc * PC_EM_AU).toBeCloseTo(0.1134, 4);

      // O CAMINHO DOS PLANETAS, no mesmo teste para não ficar só no
      // comentário: rotação + escala, e o vetor ZERO cai na origem EXATA
      // (Object.is, não tolerância).
      const direto = eclipticaParaEquatorial([0, 0, 0]).map(
        (v) => v * AU_PARA_PC
      );
      for (const v of direto) expect(Object.is(v, 0)).toBe(true);
    });
  });
});
