// ============================================================
// OS ROCHOSOS (F3+F5) — os juízes do módulo genérico:
//
//  1. O ORÁCULO DE ORIENTAÇÃO (D-E4) POR CORPO: o transform do mesh
//     de cada rochoso texturizado, em dois instantes, tem de pôr o
//     sub-ponto solar onde `subSolarPoint` (julgado por Horizons)
//     diz — textura girada passa em md5, não passa aqui. Vênus
//     retrógrada, Fobos triaxial e as luas da F5 incluídos.
//  2. O NEEDLE dos dois GLSL montados: o chunk do eclipse existe nos
//     dois, o C de Lommel-Seeliger é o LITERAL IMPORTADO da Lua (uma
//     fonte só — a quadratura mora em lua.test.ts) e o fator multiplica
//     SÓ a direta.
//  3. A FIGURA: triaxial por BODY_AXES com o gradiente EXATO do
//     elipsoide (a aproximação de 1ª ordem da Terra erraria 20% em
//     Fobos), e Vênus na fonte única de raio.
//  4. A CLASSE: gate, carga preguiçosa com backoff contado, retrato
//     × sem-retrato, cessão de planeta × lua-sem-ponto.
//  5. TEXTO-FONTE: relógio único, raios só de BODY_AXES, sem ambiente.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../lib/atlas/efemerides';
import { PARES_DE_ECLIPSE } from '../../../lib/atlas/eclipse';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import { subSolarPoint } from '../../../lib/atlas/orientacao';
import { LUAS_DO_SISTEMA } from '../../atlasConfig';
import { EPOCA_JD_TDB, RETRATO_2026 } from '../planetas/retrato2026';
import { LS_NORMALIZACAO_GLSL } from './lua';
import { LIMIAR_DO_GATE_PX, orientacaoDoCorpoNaCena } from './terra';
import type { ManifestDeTexturas } from './terra';
import {
  LIMIAR_LUA_ROCHOSA_PX,
  ROCHOSOS,
  ROCHOSO_LAMBERT_FRAG,
  ROCHOSO_LS_FRAG,
  RochosoResolvido,
  posicaoDoRochosoUA,
  raiosDoRochosoPc,
} from './rochoso';

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

/** o jd PINADO da onda (eclipse solar 2024-04-08) + a época do retrato */
const JDS = [2460409.26395835, EPOCA_JD_TDB];
const JD = JDS[0];

const FONTE = readFileSync(new URL('./rochoso.ts', import.meta.url), 'utf8');

function grau360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** o sub-ponto solar COMO O MESH O RENDERIZA (o espelho de terra/lua.test). */
function subSolarDoMesh(id: string, jd: number): { lonEastDeg: number; latDeg: number } {
  const p = motor.posicaoHeliocentrica(id, jd);
  const norma = Math.hypot(p.x, p.y, p.z);
  const dir = eclipticaParaEquatorial([-p.x / norma, -p.y / norma, -p.z / norma]);
  const { colunaX, colunaY, colunaZ } = orientacaoDoCorpoNaCena(IAU_ORIENTATIONS[id], jd);
  const dot = (a: readonly number[], b: readonly number[]) =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const lx = dot(dir, colunaX);
  const ly = dot(dir, colunaY);
  const lz = dot(dir, colunaZ);
  return {
    lonEastDeg: grau360(Math.atan2(-lz, lx) / (Math.PI / 180)),
    latDeg: Math.asin(Math.max(-1, Math.min(1, ly))) / (Math.PI / 180),
  };
}

describe('1. o oráculo de orientação por corpo (D-E4)', () => {
  for (const { id } of ROCHOSOS) {
    it.each(JDS)(`${id}: o transform do mesh põe o Sol a pino onde o Horizons diz — jd %f`, (jd) => {
      const doMesh = subSolarDoMesh(id, jd);
      const oraculo = subSolarPoint(id, jd, motor);
      expect(doMesh.lonEastDeg).toBeCloseTo(oraculo.lonEastDeg, 8);
      expect(doMesh.latDeg).toBeCloseTo(oraculo.latPlanetocentricaDeg, 8);
    });
  }

  it('controle negativo: o mapeamento ESPELHADO (textura girada) reprova — Titã', () => {
    const p = motor.posicaoHeliocentrica('titan', JD);
    const norma = Math.hypot(p.x, p.y, p.z);
    const dir = eclipticaParaEquatorial([-p.x / norma, -p.y / norma, -p.z / norma]);
    const { colunaX, colunaZ } = orientacaoDoCorpoNaCena(IAU_ORIENTATIONS.titan, JD);
    const dot = (a: readonly number[], b: readonly number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const lonErrada = grau360(
      Math.atan2(+dot(dir, colunaZ), dot(dir, colunaX)) / (Math.PI / 180)
    );
    const oraculo = subSolarPoint('titan', JD, motor);
    const delta = Math.abs(lonErrada - oraculo.lonEastDeg);
    expect(Math.min(delta, 360 - delta)).toBeGreaterThan(1);
  });

  it('controle negativo: o mapeamento ESPELHADO (textura girada) reprova — Vênus retrógrada', () => {
    const p = motor.posicaoHeliocentrica('venus', JD);
    const norma = Math.hypot(p.x, p.y, p.z);
    const dir = eclipticaParaEquatorial([-p.x / norma, -p.y / norma, -p.z / norma]);
    const { colunaX, colunaZ } = orientacaoDoCorpoNaCena(IAU_ORIENTATIONS.venus, JD);
    const dot = (a: readonly number[], b: readonly number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const lonErrada = grau360(
      Math.atan2(+dot(dir, colunaZ), dot(dir, colunaX)) / (Math.PI / 180)
    );
    const oraculo = subSolarPoint('venus', JD, motor);
    const delta = Math.abs(lonErrada - oraculo.lonEastDeg);
    expect(Math.min(delta, 360 - delta)).toBeGreaterThan(1);
  });
});

describe('2. o needle dos GLSL montados', () => {
  it('o chunk do eclipse existe nos DOIS shaders e multiplica SÓ a direta, depois do BRDF', () => {
    for (const frag of [ROCHOSO_LS_FRAG, ROCHOSO_LAMBERT_FRAG]) {
      expect(frag).toContain('vec3 fatorDeEclipse(vec3 p, vec3 n, float ndotlGeo)');
      expect(frag).toContain('if (uEclipseAtivo < 0.5) return vec3(1.0);');
      expect(frag).toContain('fatorDeEclipse(pElip, n,');
      expect(frag).toContain('gl_FragColor = vec4(direta, 1.0);');
    }
    expect(ROCHOSO_LS_FRAG).toContain('albedo * (ls * uLuzGanho) * fatorDeEclipse(pElip, n, mu0)');
    expect(ROCHOSO_LAMBERT_FRAG).toContain(
      '(albedo * ndotl) * uLuzGanho * fatorDeEclipse(pElip, n, dot(n, uDirSolLocal))'
    );
  });

  it('o C de Lommel-Seeliger é o LITERAL da Lua — uma fonte só, nunca redigitado', () => {
    expect(ROCHOSO_LS_FRAG).toContain(`${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4)`);
    expect(FONTE).toContain("import { LS_NORMALIZACAO_GLSL } from './lua';");
    expect(FONTE).not.toContain('1.3333');
  });

  it('não existe termo ambiente nem especular inventado (anti-padrões 3 e 9)', () => {
    expect(ROCHOSO_LS_FRAG).not.toMatch(/uAmbient|ambientLight|uPiso|fresnel/);
    expect(ROCHOSO_LAMBERT_FRAG).not.toMatch(/uAmbient|ambientLight|uPiso|fresnel/);
  });
});

describe('3. a figura — BODY_AXES e o gradiente EXATO do elipsoide', () => {
  it('Vênus está na fonte única de raio (a exceção mão-mantida da Lua)', () => {
    expect(BODY_AXES.venus).toEqual([6051.8, 6051.8, 6051.8]);
    expect(raiosDoRochosoPc('venus').a).toBeCloseTo((6051.8 / 149597870.7) * AU_PARA_PC, 20);
  });

  it('Fobos é triaxial de verdade (a > b > c do pck00011)', () => {
    const { a, c, b } = raiosDoRochosoPc('phobos');
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(a / c).toBeCloseTo(13 / 9.1, 12);
  });

  it('a normal é o gradiente exato (x/a²…), não a aproximação de 1ª ordem da Terra', () => {
    // em Fobos a/c = 1,43: 1/razao² = 0,49 contra 1/razao = 0,70 da
    // aproximação — a escolha é visível no limbo e o teste a pina
    const fobos = new RochosoResolvido({
      config: { id: 'phobos', brdf: 'lambert' },
      tier: 'cinema',
      base: '',
    });
    // o uniform nasce no garantirCasca (privado) — a fórmula é pinada
    // no texto-fonte, derivada dos raios
    expect(FONTE).toContain('1 / (this.razaoC * this.razaoC)');
    expect(FONTE).toContain('1 / (this.razaoB * this.razaoB)');
    fobos.dispose();
  });
});

// ------------------------------------------------------------
// 4. A classe, com carga INJETADA (nenhum fetch de verdade)
// ------------------------------------------------------------

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

function rochosoDeTeste(id: string, brdf: 'ls' | 'lambert') {
  const chamadas: string[] = [];
  const corpo = new RochosoResolvido({
    config: { id, brdf },
    tier: 'cinema',
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
  const c = centroPc(id, JD);
  const raio = raiosDoRochosoPc(id).a;
  const cam = c.clone().add(new THREE.Vector3(0, 0, distanciaRaios * raio));
  return {
    jdTdb: JD,
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

describe('4. a classe — gate, carga, retrato × sem-retrato, cessão', () => {
  it('perto, o mesh nasce com a textura do manifest REAL; longe, nada carrega', async () => {
    const { corpo, chamadas } = rochosoDeTeste('mercury', 'ls');
    // longe (a 100 mil raios): sub-pixel — nenhum fetch
    corpo.atualizar(quadro('mercury', 100_000));
    await flush();
    expect(chamadas).toHaveLength(0);
    // perto (4 raios): o gate arma, a carga desce, o mesh entra em quadro
    corpo.atualizar(quadro('mercury', 4));
    await flush();
    const e2 = corpo.atualizar(quadro('mercury', 4));
    expect(chamadas.some((c) => c.startsWith('manifest:'))).toBe(true);
    expect(chamadas.some((c) => c.includes('mercury/map'))).toBe(true);
    expect(e2.emQuadro).toBe(true);
    expect(e2.gateArmado).toBe(true);
    // a cessão de planeta: com o globo a 4 raios ele domina o halo
    expect(e2.cede).toBeGreaterThan(0);
    corpo.dispose();
  });

  it('planeta sem efeméride cai no RETRATO (o "sem rede" honesto da Terra)', () => {
    const { corpo } = rochosoDeTeste('mars', 'lambert');
    const p = posicaoDoRochosoUA('mars', Number.NaN, null);
    expect(p).not.toBeNull();
    const v = p!;
    expect(Math.hypot(v.x, v.y, v.z)).toBeGreaterThan(1.3); // Marte ~1,52 UA
    expect(Math.hypot(v.x, v.y, v.z)).toBeLessThan(1.7);
    corpo.dispose();
  });

  it('lua sem efeméride NÃO nasce (o contrato da Lua, palavra por palavra)', async () => {
    const { corpo } = rochosoDeTeste('phobos', 'lambert');
    expect(posicaoDoRochosoUA('phobos', JD, null)).toBeNull();
    const e = corpo.atualizar(quadro('phobos', 4, { fonte: null }));
    await flush();
    expect(Number.isFinite(e.diametroPx)).toBe(false);
    expect(e.emQuadro).toBe(false);
    expect(e.cede).toBe(0); // lua não tem ponto a ceder
    corpo.dispose();
  });

  it('lua COM efeméride nasce — Fobos pelo Kepler composto com Marte', async () => {
    const { corpo } = rochosoDeTeste('phobos', 'lambert');
    corpo.atualizar(quadro('phobos', 4));
    await flush();
    const e = corpo.atualizar(quadro('phobos', 4));
    expect(e.emQuadro).toBe(true);
    // a CADEIA heliocêntrica: a 1,52 UA de Marte, nunca os 9.376 km do pai
    expect(e.rUA).toBeGreaterThan(1.3);
    expect(e.rUA).toBeLessThan(1.7);
    corpo.dispose();
  });

  it('a carga que falha volta a fria e rearma pelo gatilho, até desistir com aviso', async () => {
    const chamadas: string[] = [];
    const corpo = new RochosoResolvido({
      config: { id: 'venus', brdf: 'lambert' },
      tier: 'cinema',
      maxTextureSize: 16384,
      base: '',
      webp: true,
      buscarManifest: async () => MANIFEST,
      carregarTextura: async (url) => {
        chamadas.push(url);
        throw new Error('rede caiu');
      },
    });
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      corpo.atualizar(quadro('venus', 4));
      await flush();
    }
    // 1 carga + 2 recargas = 3 tentativas; a 4ª passada não dispara mais
    expect(chamadas).toHaveLength(3);
    const e = corpo.atualizar(quadro('venus', 4));
    expect(e.emQuadro).toBe(false);
    expect(e.gateArmado).toBe(true); // o gate a frio que a captura segura
    corpo.dispose();
  });
});

describe('5. texto-fonte (as leis do cabeçalho, pinadas)', () => {
  it('não tem relógio: o jd é do Director (D-E6)', () => {
    expect(FONTE).not.toContain('Date.now');
    expect(FONTE).not.toContain('new Date(');
    expect(FONTE).not.toContain('performance.now');
  });

  it('os raios saem de BODY_AXES — nenhum literal novo de comprimento', () => {
    expect(FONTE).toContain('BODY_AXES[id]');
    expect(FONTE).not.toContain('2440');
    expect(FONTE).not.toContain('6051');
    expect(FONTE).not.toContain('3396');
  });

  it('a tabela da fase é o dado vivo: LS nos 6 opt-in, Vanth/Weywot fora', () => {
    expect(ROCHOSOS.map((c) => c.id)).toEqual([
      'mercury',
      'venus',
      'mars',
      'phobos',
      'deimos',
      'io',
      'europa',
      'ganymede',
      'callisto',
      'mimas',
      'enceladus',
      'tethys',
      'dione',
      'rhea',
      'titan',
      'iapetus',
      'miranda',
      'ariel',
      'umbriel',
      'titania',
      'oberon',
      'triton',
    ]);
    expect(ROCHOSOS.filter((c) => c.brdf === 'ls').map((c) => c.id)).toEqual([
      'mercury',
      'io',
      'europa',
      'ganymede',
      'callisto',
      'enceladus',
    ]);
    expect(ROCHOSOS.some((c) => c.id === 'vanth' || c.id === 'weywot')).toBe(false);
  });

  it('lua só nasce como assunto: 64 px fica acima de Io no retrato de Júpiter', () => {
    expect(LIMIAR_LUA_ROCHOSA_PX).toBe(64);
    expect(LIMIAR_LUA_ROCHOSA_PX / LIMIAR_DO_GATE_PX).toBe(16);
    // Io no retrato oficial de Júpiter (F4) mede 37 px — abaixo do limiar
    expect(37).toBeLessThan(LIMIAR_LUA_ROCHOSA_PX);
    // a vista titan/europa a 4 raios mede ~829 px — o assunto entra
    expect(829).toBeGreaterThan(LIMIAR_LUA_ROCHOSA_PX);
  });

  it('todo rochoso tem IAU, BODY_AXES e textura; lua entra na busca e no eclipse do pai', () => {
    for (const { id } of ROCHOSOS) {
      expect(IAU_ORIENTATIONS[id], `${id} sem IAU`).toBeTruthy();
      expect(BODY_AXES[id], `${id} sem BODY_AXES`).toBeTruthy();
      expect(
        MANIFEST.entradas.some((e) => e.corpo === id && e.canal === 'map'),
        `${id} sem textura no manifest`
      ).toBe(true);
      if (!(id in RETRATO_2026)) {
        const lua = LUAS_DO_SISTEMA.find((l) => l.id === id);
        expect(lua, `${id} fora de LUAS_DO_SISTEMA`).toBeTruthy();
        expect(PARES_DE_ECLIPSE[id], `${id} sem par de eclipse`).toBe(lua!.pai);
      }
    }
  });
});
