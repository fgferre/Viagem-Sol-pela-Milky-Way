// ============================================================
// OS GIGANTES (F4) — os juízes do módulo:
//
//  1. O ORÁCULO DE ORIENTAÇÃO (D-E4) POR CORPO: o transform do
//     mesh de CADA um dos quatro, em dois instantes, tem de pôr
//     o sub-ponto solar onde `subSolarPoint` (julgado por Horizons)
//     diz — textura girada passa em md5, não passa aqui.
//  2. O NEEDLE dos GLSL montados: eclipse, sombra do anel, squash
//     no .z com `a = dot(d',d')`, scattering frente/trás.
//  3. A FIGURA: flattening BODY_AXES, gradiente EXATO.
//  4. O ANEL: raios 1,110–2,326; Saturno não é receptor.
//  5. A CLASSE: gate, carga, cessão, Saturno pede o canal ring.
//  6. TEXTO-FONTE: relógio único; advecção ESTÁTICA com pendência
//     nomeada; sem cisalhamento por banda.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../lib/atlas/efemerides';
import { CORPOS_COM_ANEL } from '../../../lib/atlas/eclipse';
import { subSolarPoint } from '../../../lib/atlas/orientacao';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../lib/atlas/frameGalactico';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import { EPOCA_JD_TDB } from '../planetas/retrato2026';
import { eixosDoMesh } from './terra';
import type { ManifestDeTexturas } from './terra';
import {
  ANEIS_CITADOS,
  ANEL_FRAG,
  ANEL_SATURNO,
  GIGANTE_LAMBERT_FRAG,
  GIGANTES,
  GiganteResolvido,
  posicaoDoGiganteUA,
  raiosDoGigantePc,
} from './gigante';

const DATA_DIR = fileURLToPath(new URL('../../../../public/data/atlas/', import.meta.url));
const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    meta
  )
);
const MANIFEST = JSON.parse(
  readFileSync(join(DATA_DIR, 'texturas.json'), 'utf8')
) as ManifestDeTexturas;

const JDS = [2460409.26395835, EPOCA_JD_TDB];
const JD = JDS[0];

const FONTE = readFileSync(new URL('./gigante.ts', import.meta.url), 'utf8');

function grau360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

function dirSolCena(id: string, jd: number): readonly [number, number, number] {
  const p = motor.posicaoHeliocentrica(id, jd);
  const norma = Math.hypot(p.x, p.y, p.z);
  return eclipticaParaEquatorial([-p.x / norma, -p.y / norma, -p.z / norma]);
}

function subSolarDosEixos(
  eixos: { colunaX: readonly number[]; colunaY: readonly number[]; colunaZ: readonly number[] },
  dir: readonly number[]
): { lonEastDeg: number; latDeg: number } {
  const dot = (a: readonly number[], b: readonly number[]) =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return {
    lonEastDeg: grau360(Math.atan2(-dot(dir, eixos.colunaZ), dot(dir, eixos.colunaX)) / (Math.PI / 180)),
    latDeg: Math.asin(Math.max(-1, Math.min(1, dot(dir, eixos.colunaY)))) / (Math.PI / 180),
  };
}

function malhaDaSuperficie(group: THREE.Object3D): THREE.Mesh {
  for (const c of group.children) {
    if (c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry) return c;
  }
  throw new Error('malhaDaSuperficie: nenhuma esfera no grupo');
}

function malhaDoAnel(group: THREE.Object3D): THREE.Mesh {
  for (const c of group.children) {
    if (c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry) return c;
  }
  throw new Error('malhaDoAnel: nenhum anel no grupo');
}

describe('2. o needle dos GLSL montados', () => {
  it('o chunk do eclipse existe e multiplica SÓ a direta, depois do BRDF', () => {
    expect(GIGANTE_LAMBERT_FRAG).toContain('vec3 fatorDeEclipse(vec3 p, vec3 n, float ndotlGeo)');
    expect(GIGANTE_LAMBERT_FRAG).toContain('if (uEclipseAtivo < 0.5) return vec3(1.0);');
    expect(GIGANTE_LAMBERT_FRAG).toContain('fatorDeEclipse(pElip, n,');
    expect(GIGANTE_LAMBERT_FRAG).toContain('sombraDoAnel(pElip, ndotl)');
    expect(GIGANTE_LAMBERT_FRAG).toContain('gl_FragColor = vec4(direta, 1.0);');
  });

  it('a sombra planeta→anel é elipsoide: squash no .z e a = dot(d,d)', () => {
    expect(ANEL_FRAG).toContain('p.z / k');
    expect(ANEL_FRAG).toContain('dir.z / k');
    expect(ANEL_FRAG).toContain('float a = dot(d, d)');
    expect(ANEL_FRAG).toContain('delta >= 0.0 && b < 0.0');
  });

  it('scattering frente/trás no anel — o 0,34 fixo do doador não atravessa', () => {
    expect(ANEL_FRAG).toContain('mesmoLado');
    expect(ANEL_FRAG).toContain('1.6 * frente');
    expect(ANEL_FRAG).not.toContain('0.34');
    expect(GIGANTE_LAMBERT_FRAG).not.toContain('0.34');
    expect(FONTE).not.toMatch(/RING_SHADOW_INTENSITY/);
  });

  it('não existe termo ambiente (anti-padrões 3 e 9)', () => {
    expect(GIGANTE_LAMBERT_FRAG).not.toMatch(/uAmbient|ambientLight|uPiso/);
    expect(ANEL_FRAG).not.toMatch(/uAmbient|ambientLight|uPiso/);
  });
});

describe('3. a figura — BODY_AXES e o gradiente EXATO', () => {
  it('os raios saem de BODY_AXES — nenhum literal novo de comprimento', () => {
    expect(FONTE).toContain('BODY_AXES[id]');
    expect(FONTE).not.toContain('71492');
    expect(FONTE).not.toContain('60268');
    expect(raiosDoGigantePc('jupiter').a).toBeGreaterThan(raiosDoGigantePc('saturn').a);
    expect(raiosDoGigantePc('saturn').c / raiosDoGigantePc('saturn').a).toBeCloseTo(
      BODY_AXES.saturn[2] / BODY_AXES.saturn[0],
      12
    );
  });

  it('a normal é o gradiente exato (x/a²…), não a aproximação de 1ª ordem', () => {
    expect(FONTE).toContain('1 / (this.razaoC * this.razaoC)');
    expect(FONTE).toContain('1 / (this.razaoB * this.razaoB)');
  });
});

describe('4. o anel de Saturno (D6 / W5-B)', () => {
  it('os raios são 1,110–2,326 contra o raio equatorial', () => {
    expect(ANEL_SATURNO.rInt).toBeCloseTo(66_900 / 60_268, 3);
    expect(ANEL_SATURNO.rExt).toBeCloseTo(140_180 / 60_268, 3);
    expect(FONTE).toContain('66 900');
    expect(FONTE).toContain('140 180');
  });

  it('Quaoar: os raios do anel dividem pelo equatorial da malha, não por 543', () => {
    expect(ANEIS_CITADOS.quaoar.rInt).toBeCloseTo(2520 / BODY_AXES.quaoar[0], 12);
    expect(ANEIS_CITADOS.quaoar.rExt).toBeCloseTo(4057 / BODY_AXES.quaoar[0], 12);
    expect(ANEIS_CITADOS.quaoar.rInt).not.toBeCloseTo(2520 / 543, 3);
  });

  it('Saturno NÃO é receptor de eclipse — o contrato CORPOS_COM_ANEL', () => {
    expect(CORPOS_COM_ANEL).toEqual(['saturn', 'uranus', 'neptune', 'quaoar']);
    expect(FONTE).toContain('CORPOS_COM_ANEL');
  });
});

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

function giganteDeTeste(id: string) {
  const chamadas: string[] = [];
  const corpo = new GiganteResolvido({
    id,
    tier: () => 'cinema',
    maxTextureSize: 16384,
    base: '',
    webp: true,
    buscarManifest: async (url) => {
      chamadas.push(`manifest:${url}`);
      return MANIFEST;
    },
    carregarTextura: async (url) => {
      chamadas.push(`tex:${url}`);
      return new THREE.Texture();
    },
  });
  return { corpo, chamadas };
}

function centroPc(id: string, jd: number): THREE.Vector3 {
  const p = motor.posicaoHeliocentrica(id, jd);
  const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
  return new THREE.Vector3(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
}

const PSF_FALSA = { expoM0: 0, sigmaPx: 2 };

function quadro(id: string, distanciaRaios: number, extra: Record<string, unknown> = {}) {
  const jd = typeof extra.jdTdb === 'number' ? extra.jdTdb : JD;
  const c = centroPc(id, jd);
  const raio = raiosDoGigantePc(id).a;
  const cam = c.clone().add(new THREE.Vector3(0, 0, distanciaRaios * raio));
  return {
    jdTdb: jd,
    fonte: motor as unknown as {
      posicaoHeliocentrica(id2: string, jd: number): { x: number; y: number; z: number };
    },
    camPosPc: cam,
    screenHPx: 1080,
    fovDeg: 58,
    ligado: true,
    atlasQuente: false,
    politica: 'assistida' as const,
    dtS: 0.016,
    psf: PSF_FALSA,
    salto: true,
    ...extra,
  };
}

describe('1. o oráculo de orientação por corpo (D-E4)', () => {
  for (const { id } of GIGANTES) {
    it(`${id}: o transform do MESH põe o Sol a pino nos dois instantes`, async () => {
      const { corpo } = giganteDeTeste(id);
      for (const jd of JDS) {
        const q = quadro(id, 4, { jdTdb: jd });
        corpo.atualizar(q);
        await flush();
        expect(corpo.atualizar(q).emQuadro, id).toBe(true);
        const doMesh = subSolarDosEixos(eixosDoMesh(malhaDaSuperficie(corpo.group)), dirSolCena(id, jd));
        const oraculo = subSolarPoint(id, jd, motor);
        expect(doMesh.lonEastDeg).toBeCloseTo(oraculo.lonEastDeg, 8);
        expect(doMesh.latDeg).toBeCloseTo(oraculo.latPlanetocentricaDeg, 8);
      }
      corpo.dispose();
    });
  }

  it('controle negativo: deitar o polo no equador no MESH reprova', async () => {
    const { corpo } = giganteDeTeste('jupiter');
    const q = quadro('jupiter', 4);
    corpo.atualizar(q);
    await flush();
    expect(corpo.atualizar(q).emQuadro).toBe(true);
    const mesh = malhaDaSuperficie(corpo.group);
    const e = mesh.matrix.elements;
    for (let i = 0; i < 3; i++) {
      const tmp = e[4 + i];
      e[4 + i] = e[8 + i];
      e[8 + i] = tmp;
    }
    const doMesh = subSolarDosEixos(eixosDoMesh(mesh), dirSolCena('jupiter', JD));
    const oraculo = subSolarPoint('jupiter', JD, motor);
    expect(Math.abs(doMesh.latDeg - oraculo.latPlanetocentricaDeg)).toBeGreaterThan(10);
    corpo.dispose();
  });

  it('o anel é inercial: um terço de dia não gira o padrão, e o globo sim', async () => {
    const { corpo } = giganteDeTeste('uranus');
    const q1 = quadro('uranus', 4, { jdTdb: JD });
    corpo.atualizar(q1);
    await flush();
    expect(corpo.atualizar(q1).emQuadro).toBe(true);
    const xAnel1 = eixosDoMesh(malhaDoAnel(corpo.group)).colunaX.slice();
    const xGlobo1 = eixosDoMesh(malhaDaSuperficie(corpo.group)).colunaX.slice();
    const q2 = quadro('uranus', 4, { jdTdb: JD + 0.3 });
    expect(corpo.atualizar(q2).emQuadro).toBe(true);
    const xAnel2 = eixosDoMesh(malhaDoAnel(corpo.group)).colunaX;
    const xGlobo2 = eixosDoMesh(malhaDaSuperficie(corpo.group)).colunaX;
    const dot = (a: readonly number[], b: readonly number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(xAnel1, xAnel2)).toBeGreaterThan(0.999);
    expect(dot(xGlobo1, xGlobo2)).toBeLessThan(0.5);
    corpo.dispose();
  });
});

describe('5. a classe — gate, carga, cessão, anel', () => {
  it('perto, o mesh nasce com a textura do manifest REAL; longe, nada carrega', async () => {
    const { corpo, chamadas } = giganteDeTeste('jupiter');
    corpo.atualizar(quadro('jupiter', 100_000));
    await flush();
    expect(chamadas).toHaveLength(0);
    corpo.atualizar(quadro('jupiter', 4));
    await flush();
    const e2 = corpo.atualizar(quadro('jupiter', 4));
    expect(chamadas.some((c) => c.startsWith('manifest:'))).toBe(true);
    expect(chamadas.some((c) => c.includes('jupiter/map'))).toBe(true);
    expect(e2.emQuadro).toBe(true);
    expect(e2.cede).toBeGreaterThan(0);
    corpo.dispose();
  });

  it('Saturno pede o canal ring além do map', async () => {
    const { corpo, chamadas } = giganteDeTeste('saturn');
    corpo.atualizar(quadro('saturn', 4));
    await flush();
    expect(chamadas.some((c) => c.includes('saturn/map'))).toBe(true);
    expect(chamadas.some((c) => c.includes('saturn/ring'))).toBe(true);
    expect(corpo.atualizar(quadro('saturn', 4)).emQuadro).toBe(true);
    corpo.dispose();
  });

  it('sem efeméride cai no RETRATO (os quatro são planetas)', () => {
    const p = posicaoDoGiganteUA('jupiter', Number.NaN, null);
    expect(p).not.toBeNull();
    expect(Math.hypot(p!.x, p!.y, p!.z)).toBeGreaterThan(4);
    expect(Math.hypot(p!.x, p!.y, p!.z)).toBeLessThan(6);
  });
});

describe('6. texto-fonte (as leis do cabeçalho, pinadas)', () => {
  it('não tem relógio: o jd é do Director (D-E6)', () => {
    expect(FONTE).not.toContain('Date.now');
    expect(FONTE).not.toContain('new Date(');
    expect(FONTE).not.toContain('performance.now');
  });

  it('advecção de Júpiter é ESTÁTICA com pendência nomeada — sem cisalhamento', () => {
    expect(FONTE).toContain('ADVECÇÃO ZONAL DE JÚPITER: ESTÁTICA');
    expect(FONTE).toContain('P-E12');
    expect(GIGANTE_LAMBERT_FRAG).not.toMatch(/vUv\.x\s*\+/);
    expect(GIGANTE_LAMBERT_FRAG).not.toMatch(/uVento|uAdvec|windProfile/);
  });

  it('a tabela da fase é o dado vivo: os 4 gigantes, Lambert, Saturno com anel', () => {
    expect(GIGANTES.map((c) => c.id)).toEqual(['jupiter', 'saturn', 'uranus', 'neptune']);
    expect(FONTE).toContain("this.idCorpo === 'saturn'");
  });
});
