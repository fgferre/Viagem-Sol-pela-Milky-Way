// Serve: lei — a Lua obedece Lommel-Seeliger derivado por quadratura, a libração do kernel e a cadeia de luz heliocêntrica
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
import {
  LANTERNA_DE_LEITURA,
  S_DO_TERMINADOR,
  ganhoDoGlobo,
} from '../../../lib/atlas/luzDaVisita';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../lib/atlas/frameGalactico';
import {
  BETA_EMISSAO,
  EXPO_M0,
  SIGMA_PX,
  picoDaPsf,
  psfPointSizePx,
} from '../../luzDaCasa';
import { EPOCA_JD_TDB } from '../planetas/retrato2026';
import { Planetas, magDoVertice } from '../planetas/planetas';
import { IDS_DOS_PONTOS } from '../planetas/fotometria';
import { JD_DO_FILME_TDB, LUA_PC } from '../../cinematic/journey';
import { passoDoPalco, quadroDoPalcoVazio } from '../../director/palco';
import type { PostoNoPalco } from '../../director/palco';
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

/** O INSTRUMENTO DA CASA, importado e não redigitado — é ele que o
 *  Director entrega ao quadro (`CALIBRACAO_DA_CASA`), e o halo do ponto
 *  da Lua sai dele. */
const PSF = { expoM0: EXPO_M0, sigmaPx: SIGMA_PX, beta: BETA_EMISSAO } as const;

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
    // o instrumento e o relógio da cessão do ponto (item 108)
    dtS: 1 / 60,
    psf: PSF,
    salto: false,
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

  /**
   * A PROMESSA MUDOU DUAS VEZES, e as duas estão declaradas. No ITEM 91
   * o uniform passou a ser a exposição da visita; no ITEM 93 ele virou
   * **1 literal** em `assistida` — o Sol do NASA Eyes —, e E(d) bit a
   * bit em `real`.
   *
   * O PINO BIT-IDÊNTICO DO 91 CAIU AQUI, e caiu autorizado: o contrato
   * do 93 diz em letra que "bit-idêntico da Terra/Lua do item 91: cai".
   * Antes o ganho da Lua era `ganhoFundido(rUA, 'assistida')` ≈ 1,0118 —
   * a âncora quase, mas não exatamente, em 1. Este bloco mede a queda em
   * vez de a esconder: o número velho fica escrito, e a diferença é de
   * 1,2 %.
   */
  it('uLuzGanho do MESH é 1 em assistida e E(d) em real — e o pino do 91 caiu, com o delta medido', async () => {
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
    expect(mat.uniforms.uLuzGanho.value).toBe(1);
    expect(mat.uniforms.uLuzGanho.value).toBe(ganhoDoGlobo(rUA, 'assistida'));
    // a política troca o MESMO uniform no tick seguinte
    lua.atualizar(quadro(perto, { politica: 'real' }));
    expect(mat.uniforms.uLuzGanho.value).toBe(ganhoDoGlobo(rUA, 'real'));
    expect(Object.is(ganhoDoGlobo(rUA, 'real'), ganhoFundido(rUA, 'real'))).toBe(true);
    // O QUE CAIU, com número: neste jd a Lua está a 0,9991 UA e o ganho
    // de antes era 1,000635 — o pino bit-idêntico morre por 0,063 %, que
    // é MENOS de um nível de 255. Quem move `lua` e `terralua` na tela é
    // a LANTERNA, não este número.
    const ANTES_DO_93 = ganhoFundido(rUA, 'assistida');
    expect(ANTES_DO_93).toBeCloseTo(1.000634968993, 9);
    expect(Object.is(ganhoDoGlobo(rUA, 'assistida'), ANTES_DO_93)).toBe(false);
    expect(Math.abs(1 / ANTES_DO_93 - 1)).toBeCloseTo(0.000634566, 8);
    lua.dispose();
  });

  /**
   * ITEM 93, PROVA 5 — A LUA RECEBE A LANTERNA E **NÃO** RECEBE A
   * LOGÍSTICA. É a decisão do contrato §4.3: o disco chato de
   * Lommel-Seeliger é o fato que se confere contra uma fotografia, e o
   * Eyes, que usa Phong até aqui, é PIOR nisto.
   *
   * O JUIZ LÊ O UNIFORM, não o texto: com a receita revertida os dois
   * uniformes ficariam em 0 nas duas políticas, e o `uTerminadorS`
   * declarado a 3 seria a assinatura de alguém ter posto a logística na
   * Lua por engano — o shader dela não o consome, e por isso ele vale 3
   * aqui SEM mudar um pixel do disco (a prova de que não mudou é a foto
   * `capturas/item93-lua-cheia.png`).
   */
  it('PINO 93: a Lua recebe a lanterna de leitura, e o BRDF continua LS', async () => {
    const { lua } = luaDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto));
    await flush();
    expect(lua.atualizar(quadro(perto)).emQuadro).toBe(true);
    const mat = (lua.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    expect(mat.uniforms.uLanternaLeitura.value).toBe(LANTERNA_DE_LEITURA);
    // em `real` a lanterna APAGA — a decisão 2 do dono vale aqui também
    lua.atualizar(quadro(perto, { politica: 'real' }));
    expect(mat.uniforms.uLanternaLeitura.value).toBe(0);
    expect(mat.uniforms.uTerminadorS.value).toBe(0);
    lua.atualizar(quadro(perto));
    expect(mat.uniforms.uTerminadorS.value).toBe(S_DO_TERMINADOR);
    // e o MAIN não consome o `s`: o BRDF continua sendo o LS puro. Lê-se
    // o corpo do main, não o shader inteiro — o helper da logística está
    // no chunk compartilhado e ESTAR lá não é usá-lo.
    const main = LUA_FRAG.slice(LUA_FRAG.indexOf('void main()'));
    expect(main).not.toContain('terminadorSuave(');
    expect(main).toContain('lanternaDeLeitura(');
    lua.dispose();
  });

  /**
   * PINO 93/104 — O INVARIANTE NOVO: assistido SEMPRE traduzido, real
   * SEMPRE cru. Este dente nasceu em 26/08 cobrando a fiação da porta
   * `?calib=`, achada por SABOTAGEM: apagar o `q.calibracao` da chamada de
   * `escreverLuzDaVisita` compilava e atravessava os 2.360 testes calado.
   *
   * A porta MORREU no mesmo dia — ele escolheu a C1, ela virou o padrão —,
   * e o dente ficou, com o alvo que sobrou. O gate da tradução passou a
   * ser o `uTerminadorS` (a convenção "0 = Lambert cru", que é dizer
   * `?luz=real`), então este uniforme deixou de ser só a suavidade do
   * terminador: é ele que acende e apaga a TRADUÇÃO. Um corpo que o
   * escrevesse sem passar a política acenderia a curva do Eyes dentro do
   * modo que promete penumbra física — a decisão 2 do dono desfeita por
   * dentro, e sem uma linha vermelha. O que o chunk FAZ com o uniforme é
   * cobrado em `luzDaVisita.test.ts`, que executa o GLSL.
   *
   * E COBRA A MORTE DAS CHAVES: um `uTraduzDaTela` de volta no bloco de
   * uniformes é uma segunda dose de brilho assistido entrando pela porta
   * de trás.
   */
  it('PINO 93/104: a Lua assistida traduz, e em `real` os dois zeram', async () => {
    const { lua } = luaDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto));
    await flush();
    lua.atualizar(quadro(perto));
    const mat = (lua.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    expect(mat.uniforms.uTraduzDaTela).toBeUndefined();
    expect(mat.uniforms.uLanternaDepois).toBeUndefined();
    expect(mat.uniforms.uLanternaLeitura.value).toBe(LANTERNA_DE_LEITURA);
    expect(mat.uniforms.uTerminadorS.value).toBeGreaterThan(0);
    lua.atualizar(quadro(perto, { politica: 'real' }));
    expect(Object.is(mat.uniforms.uLanternaLeitura.value, 0)).toBe(true);
    expect(Object.is(mat.uniforms.uTerminadorS.value, 0)).toBe(true);
    lua.atualizar(quadro(perto));
    expect(mat.uniforms.uTerminadorS.value).toBeGreaterThan(0);
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

  it('o pino MANDA sobre a efeméride VIVA — o relógio sequestrado não move a Lua (item 108)', async () => {
    // O DEFEITO, de 30/08: o pino só valia SEM fonte (`!q.fonte`), e por
    // isso não salvava o quadro quando um `?jd=` — que o PRÓPRIO app
    // grava na barra de endereços — punha a efeméride viva na data
    // errada dentro do filme. A coda mira um lugar pré-computado; é ele
    // que tem de estar lá. Recolocar o `!q.fonte` reprova aqui.
    const { lua } = luaDeTeste();
    const pin = centroPc(JD);
    const perto = pin.clone();
    perto.z += RAIO_LUA_PC * 4;
    lua.atualizar(quadro(perto, { atlasQuente: true }));
    await flush();
    // o CONTROLE: com a fonte viva e o relógio um dia adiante, a Lua
    // anda de verdade — é a magnitude que o pino tem de cancelar
    const doDiaSeguinte = lua.atualizar(quadro(perto, { jdTdb: JD + 1 })).centroPc.clone();
    expect(doDiaSeguinte.distanceTo(pin)).toBeGreaterThan(RAIO_LUA_PC * 4);
    // ...e com o pino, no MESMO relógio errado (outro jd para o cache
    // por (jd, fonte) recomputar), a Lua está onde a câmera a espera
    const comPino = lua.atualizar(quadro(perto, { jdTdb: JD + 2, centroPinadoPc: pin }));
    expect(comPino.centroPc.distanceTo(pin)).toBe(0);
    expect(Number.isFinite(comPino.rUA)).toBe(true);
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
    expect(FONTE).toContain('vec3(ls * uLuzGanho)');
    // o NOME do escalar mudou no item 91 (a malha deixou de chamar a lei do ponto)
    expect(FONTE).toContain('ganhoDoGlobo(');
    expect(FONTE).not.toContain('ganhoFundido(');
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

  it('o cabeçalho não promete mais o que já entregou (o ponto da Lua)', () => {
    expect(FONTE).not.toContain('SEM PONTO FOTOMÉTRICO');
    expect(FONTE).toContain('alvoDaCessaoDoCorpo(');
    expect(FONTE).toContain('FOTOMETRIA.moon.H');
  });

  it('o needle do eclipse (F2c/D3): o chunk da lib, MONTADO, multiplica SÓ a direta', () => {
    // a lição do chunk renomeado: lê-se o shader montado, não o texto-fonte
    expect(LUA_FRAG).toContain('vec3 fatorDeEclipse(vec3 p, vec3 n, float ndotlGeo)');
    expect(LUA_FRAG).toContain('if (uEclipseAtivo < 0.5) return vec3(1.0);');
    // depois do BRDF de Lommel-Seeliger, na direta e só nela — não há
    // outro termo no shader para o fator tocar
    expect(LUA_FRAG).toContain(
      'vec3 sombras = fatorDeEclipse(vLocal, n, dot(n, uDirSolLocal));'
    );
    expect(LUA_FRAG).toContain('vec3 luzSol = vec3(ls * uLuzGanho) * sombras;');
    // e a LANTERNA (item 93) entra DEPOIS do BRDF, levando as MESMAS
    // sombras — a divergência declarada do 93, que impede o fill de
    // câmera de acender a umbra de um eclipse
    expect(LUA_FRAG).toContain('luzDoGlobo(luzSol, lanternaDeLeitura(n, dirCam, sombras))');
  });

});

// ============================================================
// 6. A ORDEM FOTOMÉTRICA DO CÉU (item 108, a terceira perna)
//
// O juiz que trava o que o olho do dono viu quebrado: no quadro final
// do filme a Lua tem de ser a fonte mais viva do céu depois da Terra —
// acima de TODA estrela de fundo, em pico e em fluxo. Antes desta obra
// o pico dela era 148 de 255 contra dez estrelas entre 166 e 244
// (`capturas/item108-lua-fotometria.json`), porque a Lua não tinha
// ponto fotométrico: o globo é exposto "para si" e não carrega o fluxo
// verdadeiro de um disco de dez pixels.
//
// A RÉGUA DA COMPARAÇÃO É SIRIUS (V = −1,46), a estrela mais brilhante
// do céu inteiro. Bater Sirius é bater qualquer estrela de fundo, em
// qualquer quadro — é a forma mais forte da afirmação e a única que não
// depende de qual estrela caiu naquele recorte.
//
// E ELE MEDE COMPORTAMENTO, não texto: roda o `passoDoPalco` DE
// VERDADE contra uma `Planetas` de verdade. Apagar a publicação do
// lugar do ponto (`escreverPontoDeCorpo`) deixa o vértice na origem e o
// primeiro `expect` cai; apagar a cessão (`escreverCessao`) deixa o
// `aCede` no 1 de nascimento e o segundo cai; errar o H ou a lei de
// fase derruba o terceiro e o quarto.
// ============================================================
describe('6. a ordem fotométrica — o ponto da Lua no fim do filme', () => {
  /** o quadro final MEDIDO: câmera, fov e altura de
   *  `capturas/item108-fim-wide-medidas.json` (t=193, 1920×993). */
  const CAM_T193 = new THREE.Vector3(
    -9.003307607805455e-7, 0.000004294125917834365, 0.0000018618398447841702
  );
  const FOV_T193 = 52;
  const ALTURA_T193 = 993;
  /** V de Sirius, a estrela mais brilhante do céu. */
  const M_SIRIUS = -1.46;

  function luaNoQuadroFinal(
    camPosPc: THREE.Vector3,
    lua = luaDeTeste().lua,
    screenHPx = ALTURA_T193
  ) {
    const planetas = new Planetas(PSF);
    const posto: PostoNoPalco = {
      corpo: lua,
      id: 'moon',
      // os traços da Lua, como `montarCorposDoPalco` os declara (o pino
      // das 16:00, ponto sim, retrato não)
      pinoNoFilme: LUA_PC,
      temPonto: true,
      temRetrato: false,
      rotuloDeLua: true,
      emQuadroAntes: false,
      carregavaAntes: false,
      carregando: false,
      friaNoGate: false,
    };
    const q = quadroDoPalcoVazio();
    q.jdTdb = JD_DO_FILME_TDB;
    q.fonte = motor as unknown as typeof q.fonte;
    q.camPosPc = camPosPc;
    q.screenHPx = screenHPx;
    q.fovDeg = FOV_T193;
    q.ligado = true;
    q.psf = PSF;
    q.salto = true;
    passoDoPalco([posto], q, {
      palco: { registrar() {}, remover() {} } as unknown as Parameters<typeof passoDoPalco>[2]['palco'],
      planetas,
      rotulos: { escreverPosicaoDeLua() {} } as unknown as Parameters<typeof passoDoPalco>[2]['rotulos'],
      efemeride: motor,
      noFilme: true,
      preAquecer: () => false,
      perturbar: () => {},
    });
    // o quadro da camada, DEPOIS do palco — é ele que escreve o Φ de
    // cada ponto a partir da posição que a Lua acabou de publicar. Sem
    // esta linha o juiz mediria uma Lua CHEIA que não existe naquele
    // instante (o arremate a pega gibosa), e o número sairia otimista.
    planetas.update(screenHPx, camPosPc);
    const geo = planetas.points.geometry;
    const i = (IDS_DOS_PONTOS as readonly string[]).indexOf('moon');
    const pos = geo.getAttribute('position');
    const centro = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const m = magDoVertice(
      geo.getAttribute('aMagBase').getX(i),
      camPosPc.distanceTo(centro),
      geo.getAttribute('aFase').getX(i)
    );
    return { centro, cede: geo.getAttribute('aCede').getX(i), m, planetas, lua };
  }

  it('a Lua bate Sirius no quadro final — em pico E em fluxo integrado', () => {
    const { centro, cede, m, planetas, lua } = luaNoQuadroFinal(CAM_T193);

    // 1. o LUGAR do ponto é o do globo: o PINO das 16:00, não um
    //    segundo lugar que a camada tenha inventado por efeméride. Bit a
    //    bit no float32 do buffer — é o mais forte que a régua permite
    expect(centro.x).toBe(Math.fround(LUA_PC.x));
    expect(centro.y).toBe(Math.fround(LUA_PC.y));
    expect(centro.z).toBe(Math.fround(LUA_PC.z));

    // 2. o ponto está ACESO: o disco de ~10 px ainda não domina o halo
    expect(cede).toBe(0);

    // 3. e é a Lua GIBOSA do arremate, a 389 mil km: magnitude de −12
    //    (o Φ de [ALLEN76] naquele ângulo de fase já está dentro)
    expect(m).toBeLessThan(-12);

    // 4. PICO e FLUXO acima de Sirius, e não por pouco
    const picoLua = picoDaPsf(m, PSF.expoM0, PSF.sigmaPx, ALTURA_T193);
    const picoSirius = picoDaPsf(M_SIRIUS, PSF.expoM0, PSF.sigmaPx, ALTURA_T193);
    expect(picoLua / picoSirius).toBeGreaterThan(1e4);
    // o fluxo integrado é a mesma razão (a PSF conserva o fluxo por
    // construção): as duas afirmações do critério, medidas
    const fluxo = (mag: number) => 10 ** (-0.4 * (mag - PSF.expoM0));
    expect(fluxo(m) / fluxo(M_SIRIUS)).toBeGreaterThan(1e4);

    // 5. e o sprite dele CABE no disco: o clarão não é uma bola que
    //    engole a Terra ao lado — poucas dezenas de pixels
    expect(psfPointSizePx(m, PSF.expoM0, PSF.sigmaPx, ALTURA_T193)).toBeLessThan(40);

    planetas.dispose();
    lua.dispose();
  });

  it('de perto o ponto SE APAGA: o globo carrega o fluxo sozinho', async () => {
    // a câmera a 20 raios lunares — o disco domina o halo com folga. E
    // o globo tem de estar EM QUADRO: mesh fora de quadro não domina
    // nada e o ponto fica inteiro (é o `cessaoAlvo` de sempre), então a
    // textura precisa ter chegado — a carga injetada faz isso.
    const perto = LUA_PC.clone().addScaledVector(
      CAM_T193.clone().sub(LUA_PC).normalize(), 20 * RAIO_LUA_PC
    );
    const { lua } = luaDeTeste();
    luaNoQuadroFinal(perto, lua).planetas.dispose(); // arma o gate e dispara a carga
    await flush();
    const { cede, planetas } = luaNoQuadroFinal(perto, lua);
    expect(cede).toBe(1);
    planetas.dispose();
    lua.dispose();
  });

  it('sem lugar não há ponto: a Lua sem efeméride e sem pino fica MUDA', () => {
    const planetas = new Planetas(PSF);
    const lua = new LuaResolvida({ tier: () => 'cinema', maxTextureSize: 16384, base: '' });
    const e = lua.atualizar(
      quadro(CAM_T193, { fonte: null, centroPinadoPc: undefined, jdTdb: JD_DO_FILME_TDB })
    );
    expect(e.cede).toBe(1);
    // e o vértice nasce com o MESMO 1 na camada: os dois lados combinam
    const i = (IDS_DOS_PONTOS as readonly string[]).indexOf('moon');
    expect(planetas.points.geometry.getAttribute('aCede').getX(i)).toBe(1);
    // escrever um centro NaN não move um bit do buffer
    expect(
      planetas.escreverPontoDeCorpo(
        'moon', new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN)
      )
    ).toBe(false);
    planetas.dispose();
    lua.dispose();
  });
});
