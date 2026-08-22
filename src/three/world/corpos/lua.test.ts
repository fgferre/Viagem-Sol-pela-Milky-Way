// ============================================================
// A LUA RESOLVIDA (F2b) — os cinco juízes do módulo:
//
//  1. O ORÁCULO DE LOMMEL-SEELIGER POR QUADRATURA (correção de fato 1
//     do desenho da onda, traduzido do regolithPhotometry.test.ts do
//     doador): o teste NÃO lê o 4/3 do módulo para conferi-lo —
//     INTEGRA os dois perfis de radiância sobre o disco visível em
//     fase zero, RESOLVE a razão de neutralidade de fluxo e cobra que
//     o literal do GLSL seja o que a integral produziu. Valor ajustado
//     a olho falha.
//  2. O ORÁCULO DE ORIENTAÇÃO (emenda D-E4): o transform do mesh em 3
//     instantes contra `subSolarPoint('moon')` — a rotação síncrona E a
//     LIBRAÇÃO entram pelos termos periódicos do W do kernel, e o
//     controle negativo (mapeamento espelhado) TEM de falhar.
//  3. A CADEIA DE LUZ (o oráculo Europa/Júpiter prometido em luz.ts,
//     adaptado): a irradiância da Lua sai da distância HELIOCÊNTRICA
//     da cadeia (Terra + geocêntrica) — razão Lua/Terra ≈ 1 a ±1e-2 —
//     e o controle negativo prova que a distância AO PAI daria um erro
//     de ~150.000× (o bug que o contrato de luz.ts proíbe).
//  4. GATE + CARGA PREGUIÇOSA, como a Terra — e o contrato próprio da
//     Lua: SEM efeméride não há corpo (o retrato não tem luas).
//  5. TEXTO-FONTE: sem relógio, sem chunk, sem termo ambiente, sem
//     especular. O texto lido aqui é o de `lua.ts` e o do shader
//     MONTADO — nunca o de outro arquivo. A fiação do posto no Director
//     (traços, palco, rótulos, captura, teardown) mudou de casa em 22/08
//     para `director.test.ts`, que é o dono dela: refatorar o Director
//     não pode quebrar o teste da Lua.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../lib/atlas/efemerides';
import { subSolarPoint } from '../../../lib/atlas/orientacao';
import { IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import { ganhoFundido, irradianciaRelativa } from '../../../lib/atlas/luz';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../lib/atlas/frameGalactico';
import { EPOCA_JD_TDB } from '../planetas/retrato2026';
import {
  LS_NORMALIZACAO,
  LS_NORMALIZACAO_GLSL,
  LUA_FRAG,
  LuaResolvida,
  RAIO_LUA_PC,
} from './lua';
import { eixosDoMesh } from './terra';
import type { ManifestDeTexturas } from './terra';

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

/** o jd PINADO da onda (eclipse solar de 2024) + dois controles na janela */
const JDS = [2460409.26395835, EPOCA_JD_TDB, 2458327.34980323];
const JD = JDS[0];

const FONTE = readFileSync(new URL('./lua.ts', import.meta.url), 'utf8');

function grau360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

// ------------------------------------------------------------
// 1. Lommel-Seeliger por quadratura — a lei independente do código
// ------------------------------------------------------------

/**
 * Fluxo ponderado por área projetada de um perfil de radiância sobre o
 * hemisfério visível de uma esfera unitária em FASE ZERO (luz e
 * observador coincidentes) — a tradução exata do oráculo do doador:
 * anel no ângulo polar θ do ponto sub-observador tem área
 * 2π·senθ·dθ, escorço cosθ, e μ == μ₀ == cosθ porque as duas direções
 * coincidem.
 */
function fluxoEmFaseZero(radiancia: (mu: number) => number): number {
  const passos = 200_000;
  const dTheta = Math.PI / 2 / passos;
  let fluxo = 0;
  for (let i = 0; i < passos; i++) {
    const theta = (i + 0.5) * dTheta;
    const mu = Math.cos(theta);
    fluxo += radiancia(mu) * mu * 2 * Math.PI * Math.sin(theta) * dTheta;
  }
  return fluxo;
}

describe('1. a normalização de Lommel-Seeliger, por QUADRATURA', () => {
  it('deriva o 4/3 da neutralidade de fluxo contra Lambert — não do gosto', () => {
    const fluxoLambert = fluxoEmFaseZero((mu) => mu);
    // LS sem normalização: μ₀/(μ₀+μ) = 1/2 em todo o disco em fase zero
    // — o disco chato da Lua cheia
    const fluxoLsCru = fluxoEmFaseZero((mu) => mu / (mu + mu));
    const normalizacao = fluxoLambert / fluxoLsCru;
    expect(normalizacao).toBeCloseTo(4 / 3, 5);
    // e a constante exportada é EXATAMENTE a derivada (4/3 como conta)
    expect(LS_NORMALIZACAO).toBe(4 / 3);
  });

  it('o GLSL embarca o valor DERIVADO, e nenhum outro', () => {
    // o literal sai do GLSL MONTADO (o texto que a GPU compila) — um
    // número trocado no shader, venha de onde vier, reprova aqui
    const literal = LUA_FRAG.match(/float ls = ([0-9.]+) \* mu0 \/ max\(mu0 \+ mu, 1\.0e-4\);/);
    expect(literal).not.toBeNull();
    expect(Number(literal?.[1])).toBeCloseTo(4 / 3, 6);
    expect(literal?.[1]).toBe(LS_NORMALIZACAO_GLSL);
  });

  it('redistribui o brilho sem mudar o fluxo da fase cheia', () => {
    const fluxoLambert = fluxoEmFaseZero((mu) => mu);
    const fluxoLs = fluxoEmFaseZero((mu) => LS_NORMALIZACAO * (mu / (mu + mu)));
    expect(fluxoLs / fluxoLambert).toBeCloseTo(1, 5);
    // ...e a distribuição MUDA de verdade: Lambert cai rumo ao limbo,
    // LS é CHATA em fase zero — o fato fotométrico conferível
    expect(LS_NORMALIZACAO * (0.1 / 0.2)).toBeCloseTo(LS_NORMALIZACAO * (0.9 / 1.8), 12);
  });

  it('Hapke está recusado por doutrina, e o cabeçalho o declara', () => {
    expect(FONTE).toContain('Hapke');
    expect(FONTE).toMatch(/RECUSADO POR DOUTRINA/);
    // nenhum parâmetro de Hapke inventado no código
    expect(FONTE).not.toMatch(/opposition|roughness.*macro|hapkeW|singleScatteringAlbedo/);
  });
});

// ------------------------------------------------------------
// 2. O oráculo de orientação — libração incluída, pelo kernel
// ------------------------------------------------------------

function dirSolCena(jd: number): readonly [number, number, number] {
  const p = motor.posicaoHeliocentrica('moon', jd);
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

describe('2. o oráculo de orientação da Lua (D-E4)', () => {
  it.each(JDS)('o transform do MESH põe o Sol a pino onde o Horizons diz — jd %f', async (jd) => {
    const { lua } = luaDeTeste();
    const perto = centroPc(jd);
    perto.z += RAIO_LUA_PC * 4;
    const q = quadro(perto, { jdTdb: jd });
    lua.atualizar(q);
    await flush();
    expect(lua.atualizar(q).emQuadro).toBe(true);
    const doMesh = subSolarDosEixos(eixosDoMesh(malhaDaSuperficie(lua.group)), dirSolCena(jd));
    const oraculo = subSolarPoint('moon', jd, motor);
    expect(doMesh.lonEastDeg).toBeCloseTo(oraculo.lonEastDeg, 8);
    expect(doMesh.latDeg).toBeCloseTo(oraculo.latPlanetocentricaDeg, 8);
    lua.dispose();
  });

  it('a LIBRAÇÃO está no W: o sub-ponto anda em longitude ao longo do mês', () => {
    const termos = IAU_ORIENTATIONS.moon.nutPrec ?? [];
    const doW = termos.filter((t) => t.pmAmpDeg !== undefined);
    expect(doW.length).toBeGreaterThanOrEqual(8);
    expect(Math.max(...doW.map((t) => Math.abs(t.pmAmpDeg ?? 0)))).toBeCloseTo(3.561, 3);
  });

  it('controle negativo: deitar o polo no equador no MESH reprova', async () => {
    const { lua } = luaDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    const q = quadro(perto);
    lua.atualizar(q);
    await flush();
    expect(lua.atualizar(q).emQuadro).toBe(true);
    const mesh = malhaDaSuperficie(lua.group);
    const e = mesh.matrix.elements;
    // troca X↔Y: o polo cai no meridiano-primo (Y↔Z quase não mexe
    // a latitude quando o Sol já está no equador — lua nova)
    for (let i = 0; i < 3; i++) {
      const tmp = e[i];
      e[i] = e[4 + i];
      e[4 + i] = tmp;
    }
    const doMesh = subSolarDosEixos(eixosDoMesh(mesh), dirSolCena(JD));
    const oraculo = subSolarPoint('moon', JD, motor);
    expect(Math.abs(doMesh.latDeg - oraculo.latPlanetocentricaDeg)).toBeGreaterThan(40);
    lua.dispose();
  });
});

// ------------------------------------------------------------
// A classe, com carga INJETADA (nenhum fetch de verdade)
// ------------------------------------------------------------

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

function luaDeTeste() {
  const chamadas: string[] = [];
  const lua = new LuaResolvida({
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
  return { lua, chamadas };
}

/** centro da Lua em pc na cena, pelo mesmo caminho do módulo. */
function centroPc(jd: number): THREE.Vector3 {
  const p = motor.posicaoHeliocentrica('moon', jd);
  const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
  return new THREE.Vector3(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
}

function quadro(camPosPc: THREE.Vector3, extra: Partial<Parameters<LuaResolvida['atualizar']>[0]> = {}) {
  return {
    jdTdb: JD,
    fonte: motor as unknown as { posicaoHeliocentrica(id: string, jd: number): { x: number; y: number; z: number } },
    camPosPc,
    screenHPx: 1080,
    fovDeg: 58,
    ligado: true,
    atlasQuente: false,
    politica: 'assistida' as const,
    ...extra,
  };
}

describe('3. a cadeia de luz da Lua (o oráculo Europa/Júpiter, adaptado)', () => {
  it('a razão de irradiância Lua/Terra é ≈ 1 a ±1e-2 nos três instantes', () => {
    for (const jd of JDS) {
      const lua = motor.posicaoHeliocentrica('moon', jd);
      const terra = motor.posicaoHeliocentrica('earth', jd);
      const eLua = irradianciaRelativa(Math.hypot(lua.x, lua.y, lua.z));
      const eTerra = irradianciaRelativa(Math.hypot(terra.x, terra.y, terra.z));
      // a Lua está a ≤ 0,00257 UA da Terra: a irradiância dela é a da
      // vizinhança da Terra, sempre — se isto falhar, alguém alimentou
      // a lei com a distância errada
      expect(Math.abs(eLua / eTerra - 1)).toBeLessThan(1e-2);
    }
  });

  it('controle negativo: a distância AO PAI daria irradiância ~150.000× alta', () => {
    const geo = motor.posicao('moon', JD); // geocêntrica por construção
    const rGeo = Math.hypot(geo.x, geo.y, geo.z);
    expect(rGeo).toBeLessThan(0.003);
    // MIN_UA clampa 0,00257 → 0,05, senão seria ~150.000×; mesmo
    // clampada a razão fica 400/1 ≈ 400× — nunca plausível
    expect(irradianciaRelativa(rGeo) / irradianciaRelativa(1)).toBeGreaterThan(100);
  });

  it('uLuzGanho do MESH é ganhoFundido(rUA da CADEIA), bit a bit', async () => {
    const { lua } = luaDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto));
    await flush();
    const e = lua.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(true);
    const p = motor.posicaoHeliocentrica('moon', JD);
    const rUA = Math.hypot(p.x, p.y, p.z);
    expect(e.rUA).toBe(rUA);
    const mat = (lua.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    expect(mat.uniforms.uLuzGanho.value).toBe(ganhoFundido(rUA, 'assistida'));
    // a política troca o MESMO uniform no tick seguinte
    lua.atualizar(quadro(perto, { politica: 'real' }));
    expect(mat.uniforms.uLuzGanho.value).toBe(ganhoFundido(rUA, 'real'));
    lua.dispose();
  });

  it('o sub-ponto solar do UNIFORM bate com o oráculo — a fiação inteira', async () => {
    const { lua } = luaDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto));
    await flush();
    lua.atualizar(quadro(perto));
    const mat = (lua.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    const dir = mat.uniforms.uDirSolLocal.value as THREE.Vector3;
    const lon = grau360(Math.atan2(-dir.z, dir.x) / (Math.PI / 180));
    const lat = Math.asin(Math.max(-1, Math.min(1, dir.y))) / (Math.PI / 180);
    const oraculo = subSolarPoint('moon', JD, motor);
    expect(lon).toBeCloseTo(oraculo.lonEastDeg, 6);
    expect(lat).toBeCloseTo(oraculo.latPlanetocentricaDeg, 6);
    lua.dispose();
  });
});

describe('4. gate, carga preguiçosa e o contrato "sem efeméride não há Lua"', () => {
  it('o construtor não busca NADA; de longe segue frio', async () => {
    const { lua, chamadas } = luaDeTeste();
    await flush();
    expect(chamadas).toEqual([]);
    lua.atualizar(quadro(new THREE.Vector3(0, 0, 0.001)));
    await flush();
    expect(chamadas).toEqual([]);
    lua.dispose();
  });

  it('o gate armando carrega a escada da LUA (um canal, tier cinema = 8k webp)', async () => {
    const { lua, chamadas } = luaDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto));
    await flush();
    expect(chamadas[0]).toBe('manifest:data/atlas/texturas.json');
    expect(chamadas).toContain('tex:textures/atlas/moon/map.webp');
    expect(chamadas.filter((c) => c.startsWith('tex:'))).toHaveLength(1);
    lua.dispose();
  });

  it('a fase atlas pré-aquece mesmo de longe — o mesmo gatilho duplo da Terra', async () => {
    const { lua, chamadas } = luaDeTeste();
    lua.atualizar(quadro(new THREE.Vector3(0, 0, 0.001), { atlasQuente: true }));
    await flush();
    expect(chamadas.length).toBeGreaterThan(0);
    lua.dispose();
  });

  it('o pino da coda coloca a Lua no lugar medido, sem inventar', async () => {
    const { lua } = luaDeTeste();
    const pin = centroPc(JD);
    const perto = pin.clone();
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto, { atlasQuente: true }));
    await flush();
    lua.atualizar(quadro(perto));
    const e = lua.atualizar(quadro(perto, { fonte: null, centroPinadoPc: pin }));
    expect(e.centroPc.distanceTo(pin)).toBe(0);
    expect(Number.isFinite(e.rUA)).toBe(true);
    lua.dispose();
  });

  it('SEM efeméride não há Lua: centro NaN, nunca em quadro, nada inventado', async () => {
    const { lua } = luaDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    // com textura pronta e câmera colada, mas fonte null: fora de quadro
    lua.atualizar(quadro(perto, { atlasQuente: true }));
    await flush();
    const e = lua.atualizar(quadro(perto, { fonte: null }));
    expect(Number.isNaN(e.centroPc.x)).toBe(true);
    expect(Number.isNaN(e.rUA)).toBe(true);
    expect(e.emQuadro).toBe(false);
    expect(lua.group.visible).toBe(false);
    // a fonte chegando TARDE dá a Lua no MESMO jd (o cache é por jd E fonte)
    const depois = lua.atualizar(quadro(perto));
    expect(depois.emQuadro).toBe(true);
    expect(depois.centroPc.distanceTo(centroPc(JD))).toBe(0);
    lua.dispose();
  });

  it('a composição do palco: superfície OPACA escreve depth', async () => {
    const { lua } = luaDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto));
    await flush();
    lua.atualizar(quadro(perto));
    const mat = (lua.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    expect(mat.depthWrite).toBe(true);
    expect(mat.depthTest).toBe(true);
    expect(mat.transparent).toBe(false);
    lua.dispose();
  });

  it('falha de carga volta a fria e a recarga traz a Lua — o MESMO backoff da Terra', async () => {
    let falhas = 1;
    const chamadas: string[] = [];
    const lua = new LuaResolvida({
      tier: () => 'cinema',
      maxTextureSize: 16384,
      base: '',
      webp: true,
      buscarManifest: async (url) => {
        chamadas.push(`manifest:${url}`);
        if (falhas-- > 0) throw new Error('HTTP 500');
        return MANIFEST;
      },
      carregarTextura: async () => new THREE.Texture(),
    });
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto)); // 1ª carga dispara e falha
    await flush();
    let e = lua.atualizar(quadro(perto)); // o gatilho rearma (recarga)
    expect(e.carregando).toBe(true);
    await flush();
    e = lua.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(true);
    expect(chamadas.filter((c) => c.startsWith('manifest:'))).toHaveLength(2);
    lua.dispose();
  });
});

describe('5. texto-fonte de lua.ts e do shader montado (as leis pinadas)', () => {
  it('não tem relógio: o jd é do Director (D-E6)', () => {
    expect(FONTE).not.toContain('Date.now');
    expect(FONTE).not.toContain('new Date(');
    expect(FONTE).not.toContain('performance.now');
  });

  it('a luz direta multiplica o ESCALAR ÚNICO e não existe outro termo', () => {
    expect(FONTE).toContain('albedo * (ls * uLuzGanho)');
    expect(FONTE).toContain('ganhoFundido(');
    // sem ambiente, sem especular, sem emissão: regolito é o que é —
    // os NOMES de uniform/termos, não a palavra (o cabeçalho fala deles)
    expect(LUA_FRAG).not.toMatch(/uAmbient|ambientLight|uPiso|uEspec|dEspec|fresnel|uNoite/);
  });

  it('a cadeia da luz é a HELIOCÊNTRICA da LUA, dita e usada', () => {
    expect(FONTE).toContain("posicaoHeliocentrica('moon'");
    // e nenhum atalho pela Terra ou pelo pai
    expect(FONTE).not.toContain("posicaoHeliocentrica('earth'");
  });

  it('nenhum chunk do three atravessa: shader próprio por inteiro', () => {
    expect(FONTE).not.toContain('#include');
    expect(FONTE).not.toContain('ShaderChunk');
  });

  it('o raio sai de BODY_AXES — nenhum literal novo de comprimento', () => {
    expect(FONTE).toContain('BODY_AXES.moon[0]');
    expect(FONTE).not.toContain('1737');
  });

  it('o needle do eclipse (F2c/D3): o chunk da lib, MONTADO, multiplica SÓ a direta', () => {
    // a lição do chunk renomeado: lê-se o shader montado, não o texto-fonte
    expect(LUA_FRAG).toContain('vec3 fatorDeEclipse(vec3 p, vec3 n, float ndotlGeo)');
    expect(LUA_FRAG).toContain('if (uEclipseAtivo < 0.5) return vec3(1.0);');
    // depois do BRDF de Lommel-Seeliger, na direta e só nela — não há
    // outro termo no shader para o fator tocar
    expect(LUA_FRAG).toContain(
      'albedo * (ls * uLuzGanho) * fatorDeEclipse(vLocal, n, dot(n, uDirSolLocal))'
    );
    expect(LUA_FRAG).toContain('gl_FragColor = vec4(direta, 1.0);');
  });

});
