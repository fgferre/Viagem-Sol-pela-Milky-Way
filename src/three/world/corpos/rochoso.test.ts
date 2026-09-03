// Serve: chão — os mesmos consertos dos gigantes (ganho de visita, tradução) não regridem nos rochosos
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
import { ANOES_DO_SISTEMA, ASTEROIDES_DO_SISTEMA, LUAS_DO_SISTEMA } from '../../atlasConfig';
import { EPOCA_JD_TDB, RETRATO_2026 } from '../planetas/retrato2026';
import { LS_NORMALIZACAO_GLSL } from './lua';
import { LIMIAR_DO_GATE_PX, eixosDoMesh } from './terra';
import type { ManifestDeTexturas } from './terra';
import { ANEIS_CITADOS } from './gigante';
import { FAMILIAS_DE_REGOLITO, FORMAS_ESCULPIDAS } from './esculpido';
import { ganhoFundido } from '../../../lib/atlas/luz';
import {
  LANTERNA_DE_LEITURA,
  S_DO_TERMINADOR,
  ganhoDoGlobo,
} from '../../../lib/atlas/luzDaVisita';
import { escalaDoBumpDoAlbedo } from './corpos';
import {
  type ConfigDoRochoso,
  GRADUACAO_DO_MOSAICO,
  LIMIAR_LUA_ROCHOSA_PX,
  NORMAL_MEDIDA,
  ROCHOSOS,
  ROCHOSO_LAMBERT_FRAG,
  ROCHOSO_LS_FRAG,
  ROCHOSO_PROC_FRAG,
  ROCHOSO_PROC_LS_FRAG,
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
/** o CÓDIGO sem a prosa — a guarda do literal de comprimento mede o que
 *  a máquina executa, e não o comentário que explica de onde ele veio (o
 *  item 141 escreveu "raio de 3396" numa explicação e reprovava). */
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

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
    // o esculpido (134/S3) não é esfera: é a malha soldada com as máscaras
    if (c instanceof THREE.Mesh && c.geometry.hasAttribute('aFundoDeCratera')) return c;
  }
  throw new Error('malhaDaSuperficie: nenhuma superfície no grupo');
}

describe('2. o needle dos GLSL montados', () => {
  it('o chunk do eclipse existe nos DOIS shaders e multiplica SÓ a direta, depois do BRDF', () => {
    for (const frag of [ROCHOSO_LS_FRAG, ROCHOSO_LAMBERT_FRAG, ROCHOSO_PROC_LS_FRAG]) {
      expect(frag).toContain('vec3 fatorDeEclipse(vec3 p, vec3 n, float ndotlGeo)');
      expect(frag).toContain('if (uEclipseAtivo < 0.5) return vec3(1.0);');
      expect(frag).toContain('fatorDeEclipse(pElip, n,');
    }
    for (const frag of [ROCHOSO_LS_FRAG, ROCHOSO_PROC_LS_FRAG]) {
      expect(frag).toContain('vec3 sombras = fatorDeEclipse(pElip, n, mu0);');
      expect(frag).toContain('vec3 luzSol = vec3(ls * uLuzGanho) * sombras;');
    }
    for (const frag of [ROCHOSO_LAMBERT_FRAG, ROCHOSO_PROC_FRAG]) {
      expect(frag).toContain('vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);');
      expect(frag).toContain(
        'vec3 luzSol = vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * sombras;'
      );
    }
    // A DIVERGENCIA DECLARADA do item 93: a lanterna leva o fator do
    // ECLIPSE. Sem isso ela acenderia a umbra de um eclipse total.
    //
    // ⚠ ESTE GUARDA ESTAVA FROUXO ATÉ 26/08, e o item 104 o denunciou por
    // acidente: o padrão era `/lanternaDeLeitura\([^)]*sombras\)/` sobre o
    // fragmento INTEIRO, e quem o satisfazia era a DECLARAÇÃO da função no
    // chunk (`vec3 lanternaDeLeitura(vec3 n, vec3 dirCam, vec3 sombras)`),
    // não a chamada — as chamadas daqui têm um `)` no meio
    // (`normSeguro(...)`) e nunca casaram. Renomear o parâmetro do chunk
    // fez o guarda cair sem que uma linha de shader tivesse mudado. Agora
    // ele lê o `main` e amarra o ARGUMENTO à variável que veio do eclipse.
    for (const frag of [ROCHOSO_LS_FRAG, ROCHOSO_PROC_LS_FRAG,
      ROCHOSO_LAMBERT_FRAG, ROCHOSO_PROC_FRAG]) {
      const corpo = frag.slice(frag.indexOf('void main()'));
      const chamada = /lanternaDeLeitura\(\s*\w+,[^,]*,\s*(\w+)\s*\)/.exec(corpo);
      expect(chamada, 'o `main` não chama a lanterna').not.toBeNull();
      expect(new RegExp(`vec3 ${chamada![1]} = fatorDeEclipse\\(`).test(corpo)).toBe(true);
    }
  });

  /**
   * ITEM 93 — QUEM RECEBE A LOGÍSTICA E QUEM NÃO RECEBE, contado por
   * DERIVAÇÃO e não por lista decorada: os quatro fragmentos desta
   * classe repartem-se pelo BRDF, e é o BRDF que decide. Lambert (com
   * mapa ou procedural) usa a curva do Eyes; Lommel-Seeliger fica com o
   * disco chato, que é o fato da foto. Todos os quatro recebem a
   * lanterna — ela é a mesma luz para todo mundo.
   */
  it('a logística entra nos Lambert e NÃO nos Lommel-Seeliger; a lanterna entra em todos', () => {
    const main = (glsl: string) => glsl.slice(glsl.indexOf('void main()'));
    const comLogistica = [ROCHOSO_LAMBERT_FRAG, ROCHOSO_PROC_FRAG];
    const semLogistica = [ROCHOSO_LS_FRAG, ROCHOSO_PROC_LS_FRAG];
    // a contagem é derivada das listas acima, e elas cobrem os QUATRO
    expect(new Set([...comLogistica, ...semLogistica]).size).toBe(4);
    for (const frag of comLogistica) expect(main(frag)).toContain('terminadorSuave(');
    for (const frag of semLogistica) expect(main(frag)).not.toContain('terminadorSuave(');
    for (const frag of [...comLogistica, ...semLogistica]) {
      expect(main(frag)).toContain('lanternaDeLeitura(');
      expect(main(frag)).toContain('luzDoGlobo(');
    }
  });

  it('o C de Lommel-Seeliger é o LITERAL da Lua — uma fonte só, nunca redigitado', () => {
    expect(ROCHOSO_LS_FRAG).toContain(`${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4)`);
    expect(ROCHOSO_PROC_LS_FRAG).toContain(`${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4)`);
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

  it('Ceres usa o raio polar ATUAL do kernel (446), não o bloco antigo 454,7', () => {
    expect(BODY_AXES.ceres).toEqual([487.3, 487.3, 446]);
  });

  it('Quaoar: o anel divide pelos km equatoriais da malha, não por 543', () => {
    expect(ANEIS_CITADOS.quaoar.rInt).toBeCloseTo(2520 / BODY_AXES.quaoar[0], 12);
    expect(ANEIS_CITADOS.quaoar.rExt).toBeCloseTo(4057 / BODY_AXES.quaoar[0], 12);
  });

  it('a normal é o gradiente exato (x/a²…), não a aproximação de 1ª ordem da Terra', () => {
    // em Fobos a/c = 1,43: 1/razao² = 0,49 contra 1/razao = 0,70 da
    // aproximação — a escolha é visível no limbo e o teste a pina
    const fobos = new RochosoResolvido({
      config: { id: 'phobos', brdf: 'lambert' },
      tier: () => 'cinema',
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

function rochosoDeTeste(
  id: string,
  brdf: 'ls' | 'lambert',
  superficie?: ConfigDoRochoso['superficie']
) {
  const chamadas: string[] = [];
  const corpo = new RochosoResolvido({
    config: { id, brdf, superficie },
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

const PSF_FALSA = { expoM0: 0, sigmaPx: 2, beta: 300 };

function quadro(id: string, distanciaRaios: number, extra: Record<string, unknown> = {}) {
  const jd = typeof extra.jdTdb === 'number' ? extra.jdTdb : JD;
  const c = centroPc(id, jd);
  const raio = raiosDoRochosoPc(id).a;
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
    focoDoAtlas: false,
    pedidoDoRoteiro: false,
    politica: 'assistida' as const,
    tS: 0,
    dtS: 0.016,
    psf: PSF_FALSA,
    salto: true,
    ...extra,
  };
}

describe('1. o oráculo de orientação por corpo (D-E4)', () => {
  for (const c of ROCHOSOS) {
    it(`${c.id}: o transform do MESH põe o Sol a pino nos dois instantes`, async () => {
      const { corpo } = rochosoDeTeste(c.id, c.brdf, c.superficie);
      for (const jd of JDS) {
        const q = quadro(c.id, 4, { jdTdb: jd });
        corpo.atualizar(q);
        await flush();
        expect(corpo.atualizar(q).emQuadro, c.id).toBe(true);
        const doMesh = subSolarDosEixos(
          eixosDoMesh(malhaDaSuperficie(corpo.group)),
          dirSolCena(c.id, jd)
        );
        const oraculo = subSolarPoint(c.id, jd, motor);
        expect(doMesh.lonEastDeg).toBeCloseTo(oraculo.lonEastDeg, 8);
        expect(doMesh.latDeg).toBeCloseTo(oraculo.latPlanetocentricaDeg, 8);
      }
      corpo.dispose();
    });
  }

  it('controle negativo: deitar o polo no equador no MESH reprova — Titã', async () => {
    const { corpo } = rochosoDeTeste('titan', 'lambert');
    const q = quadro('titan', 4);
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
    const doMesh = subSolarDosEixos(eixosDoMesh(mesh), dirSolCena('titan', JD));
    const oraculo = subSolarPoint('titan', JD, motor);
    expect(Math.abs(doMesh.latDeg - oraculo.latPlanetocentricaDeg)).toBeGreaterThan(10);
    corpo.dispose();
  });

  it('o anel de Quaoar é inercial: um dia não gira o padrão', async () => {
    const { corpo } = rochosoDeTeste('quaoar', 'lambert', 'procedural');
    const q1 = quadro('quaoar', 4, { jdTdb: JD });
    corpo.atualizar(q1);
    await flush();
    expect(corpo.atualizar(q1).emQuadro).toBe(true);
    const anel = [...corpo.group.children].find(
      (ch) => ch instanceof THREE.Mesh && ch.geometry instanceof THREE.RingGeometry
    ) as THREE.Mesh;
    expect(anel).toBeTruthy();
    const x1 = eixosDoMesh(anel).colunaX.slice();
    const xGlobo1 = eixosDoMesh(malhaDaSuperficie(corpo.group)).colunaX.slice();
    expect(corpo.atualizar(quadro('quaoar', 4, { jdTdb: JD + 0.3 })).emQuadro).toBe(true);
    const x2 = eixosDoMesh(anel).colunaX;
    const xGlobo2 = eixosDoMesh(malhaDaSuperficie(corpo.group)).colunaX;
    const dot = (a: readonly number[], b: readonly number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(x1, x2)).toBeGreaterThan(0.999);
    expect(dot(xGlobo1, xGlobo2)).not.toBeCloseTo(1, 2);
    corpo.dispose();
  });
});

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
      tier: () => 'cinema',
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

  /**
   * O PINO DE REGRESSÃO DO ITEM 91, o irmão do de `gigante.test.ts` — e
   * os dois nasceram de uma SABOTAGEM que passou. Em 25/08 o auditor
   * reverteu a obra alimentando `ganhoDoGlobo` com o id `'earth'` em vez
   * do id do corpo, aqui e no gigante, e os 2.249 testes passaram TODOS:
   * o conserto existia sem nada que o protegesse.
   *
   * NO ITEM 93 O PINO MUDOU DE ALVO, e ficou mais duro: a compensação
   * por corpo saiu inteira, e o que o uniform tem de dizer em
   * `assistida` é **1 literal**. Qualquer resíduo de distância no globo
   * — inclusive o do próprio item 91 — reprova aqui.
   */
  describe('PINO 93: o uniform é o SOL DO EYES — 1 literal em assistida, E(d) em real', () => {
    /**
     * TRÊS FAMÍLIAS, TRÊS PINOS. Esta classe serve rochoso, lua e TNO
     * com uma lei só; um pino em Marte não prova Titã nem Éris. O que
     * mudou no item 93 é que a lei parou de ter caminhos: em `assistida`
     * o Sol é 1 para os três, e a distância só reaparece em `real`.
     *
     * OS NÚMEROS DA REVERSÃO SÃO LITERAIS, de fora do código: são os
     * valores que o item 91 escrevia aqui, com o resíduo do 1/d² ainda
     * vivo dentro do globo. Se um deles voltar, este pino morde.
     */
    for (const caso of [
      // corpo      brdf        superficie      sob a reversão (item 91)
      { id: 'mars', brdf: 'lambert' as const, sup: undefined, revertido: 1.067588635207, familia: 'rochoso' },
      { id: 'titan', brdf: 'lambert' as const, sup: undefined, revertido: 0.987842741269, familia: 'lua (herda o pai)' },
      { id: 'eris', brdf: 'lambert' as const, sup: 'procedural' as const, revertido: 0.796563463514, familia: 'TNO' },
    ]) {
      it(`${caso.id} — ${caso.familia}`, async () => {
        const { corpo } = rochosoDeTeste(caso.id, caso.brdf, caso.sup);
        corpo.atualizar(quadro(caso.id, 4));
        await flush();
        const e = corpo.atualizar(quadro(caso.id, 4));
        expect(e.emQuadro, caso.id).toBe(true);
        const mat = malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial;
        expect(mat.uniforms.uLuzGanho.value, caso.id).toBe(1);
        // e o valor que a reversão ao item 91 produziria fica de fora
        expect(mat.uniforms.uLuzGanho.value, `${caso.id} sob a reversão`).not.toBeCloseTo(
          caso.revertido,
          6
        );
        // AS DUAS PEÇAS NOVAS chegam ao material, e apagam em `real`
        expect(mat.uniforms.uLanternaLeitura.value, caso.id).toBe(LANTERNA_DE_LEITURA);
        expect(mat.uniforms.uTerminadorS.value, caso.id).toBe(S_DO_TERMINADOR);
        corpo.atualizar(quadro(caso.id, 4, { politica: 'real' }));
        expect(mat.uniforms.uLanternaLeitura.value, caso.id).toBe(0);
        expect(mat.uniforms.uTerminadorS.value, caso.id).toBe(0);
        // e em `real` o ganho volta a ser a lei física, na rUA viva
        expect(mat.uniforms.uLuzGanho.value, caso.id).toBe(
          ganhoDoGlobo(e.rUA, 'real')
        );
        corpo.dispose();
      });
    }

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
    it('PINO 93/104: o rochoso assistido traduz, e em `real` os dois zeram', async () => {
      const { corpo } = rochosoDeTeste('mars', 'lambert');
      corpo.atualizar(quadro('mars', 4));
      await flush();
      corpo.atualizar(quadro('mars', 4));
      const mat = malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial;
      expect(mat.uniforms.uTraduzDaTela).toBeUndefined();
      expect(mat.uniforms.uLanternaDepois).toBeUndefined();
      expect(mat.uniforms.uLanternaLeitura.value).toBe(LANTERNA_DE_LEITURA);
      expect(mat.uniforms.uTerminadorS.value).toBeGreaterThan(0);
      corpo.atualizar(quadro('mars', 4, { politica: 'real' }));
      expect(Object.is(mat.uniforms.uLanternaLeitura.value, 0)).toBe(true);
      expect(Object.is(mat.uniforms.uTerminadorS.value, 0)).toBe(true);
      corpo.atualizar(quadro('mars', 4));
      expect(mat.uniforms.uTerminadorS.value).toBeGreaterThan(0);
      corpo.dispose();
    });

    it('Éris é o caso em que a visita mais gasta: ~24,2× sobre a lei crua', () => {
      // o número que separa este pino de um teste decorativo — sem a
      // exposição da visita, Éris cairia para 4% do que está na tela
      const dEris = 95.0;
      expect(1 / ganhoDoGlobo(dEris, 'assistida')).toBe(1);
      expect(1 / ganhoFundido(dEris, 'assistida')).toBeCloseTo(24.233, 3);
    });
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
    expect(CODIGO).not.toContain('2440');
    expect(CODIGO).not.toContain('6051');
    expect(CODIGO).not.toContain('3396');
  });

  it('a tabela da fase é o dado vivo: LS nos opt-in + F7, Vanth/Weywot fora', () => {
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
      'pluto',
      'charon',
      'ceres',
      'vesta',
      'pallas',
      'hygiea',
      'haumea',
      'makemake',
      'eris',
      'quaoar',
      'pan',
      'daphnis',
      'atlas',
      'prometheus',
      'pandora',
      'janus',
      'epimetheus',
      'hyperion',
      'phoebe',
    ]);
    expect(ROCHOSOS.filter((c) => c.brdf === 'ls').map((c) => c.id)).toEqual([
      'mercury',
      'io',
      'europa',
      'ganymede',
      'callisto',
      'enceladus',
      'vesta',
      'pallas',
      'hygiea',
      'haumea',
    ]);
    expect(ROCHOSOS.some((c) => c.id === 'vanth' || c.id === 'weywot')).toBe(false);
  });

  it('lua só nasce como assunto: 48 px fica acima de Io no retrato de Júpiter', () => {
    expect(LIMIAR_LUA_ROCHOSA_PX).toBe(48);
    expect(LIMIAR_LUA_ROCHOSA_PX / LIMIAR_DO_GATE_PX).toBe(12);
    // Io no retrato oficial de Júpiter (F4) mede 37 px — abaixo do limiar
    expect(37).toBeLessThan(LIMIAR_LUA_ROCHOSA_PX);
    // a vista titan/europa a 4 raios mede ~829 px — o assunto entra
    expect(829).toBeGreaterThan(LIMIAR_LUA_ROCHOSA_PX);
  });

  it('todo rochoso tem IAU, BODY_AXES e textura ou procedural', () => {
    for (const c of ROCHOSOS) {
      expect(IAU_ORIENTATIONS[c.id], `${c.id} sem IAU`).toBeTruthy();
      expect(BODY_AXES[c.id], `${c.id} sem BODY_AXES`).toBeTruthy();
      if (c.superficie === 'procedural') continue;
      if (c.superficie === 'esculpido') {
        // sem textura por desenho: a forma e a família de regolito são o dado
        expect(FORMAS_ESCULPIDAS[c.id], `${c.id} sem forma esculpida`).toBeTruthy();
        expect(FAMILIAS_DE_REGOLITO[c.id], `${c.id} sem família de regolito`).toBeTruthy();
        continue;
      }
      expect(
        MANIFEST.entradas.some((e) => e.corpo === c.id && e.canal === 'map'),
        `${c.id} sem textura no manifest`
      ).toBe(true);
      if (
        c.id in RETRATO_2026 ||
        ANOES_DO_SISTEMA.some((a) => a.id === c.id) ||
        ASTEROIDES_DO_SISTEMA.some((a) => a.id === c.id)
      ) {
        continue;
      }
      const lua = LUAS_DO_SISTEMA.find((l) => l.id === c.id);
      expect(lua, `${c.id} fora de LUAS_DO_SISTEMA`).toBeTruthy();
      if (PARES_DE_ECLIPSE[c.id]) expect(PARES_DE_ECLIPSE[c.id]).toBe(lua!.pai);
    }
  });
});

// ------------------------------------------------------------
// 6. A GRADUAÇÃO DO MOSAICO (item 138)
// ------------------------------------------------------------

/**
 * A CONTA DO FRAGMENTO, em JS: `clamp(mix(c, luminância, desat) * ganho)`.
 * Ela não é uma segunda fonte de verdade — a primeira linha deste bloco
 * confere que o GLSL montado ainda é ESTA conta, letra por letra; o que
 * o espelho serve é medir o EFEITO do par que o material publica.
 */
function graduar(c: readonly [number, number, number], desat: number, ganho: number) {
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return c.map((v) => Math.min(1, Math.max(0, (v + (lum - v) * desat) * ganho))) as unknown as
    number[];
}

/** o desvio de neutro de uma cor: 1 = cinza, >1 = mais vermelha que azul */
const razaoRB = (c: readonly number[]) => c[0] / c[2];

describe('6. a graduação do mosaico Cassini (item 138)', () => {
  /** a cor CRUA de um mosaico de Schenk: realçada em IR/UV, R/B = 1,07 */
  const CRUA = [0.62, 0.55, 0.58] as const;

  it('o fragmento montado faz a conta dele, na ordem dele', () => {
    for (const frag of [ROCHOSO_LS_FRAG, ROCHOSO_LAMBERT_FRAG]) {
      expect(frag).toContain(
        'return clamp(mix(c, vec3(alturaDoAlbedo(c)), uGraduacao.x) * uGraduacao.y, 0.0, 1.0);'
      );
      // e ela entra no CAMINHO da cor, não num canto morto do shader
      expect(frag).toContain('graduarMosaico(texture2D(uMapaDia, vUv).rgb)');
    }
  });

  it('o par do material SAI da tabela, para as seis luas de mosaico', async () => {
    for (const id of Object.keys(GRADUACAO_DO_MOSAICO)) {
      const { corpo } = rochosoDeTeste(id, 'lambert');
      corpo.atualizar(quadro(id, 4));
      await flush();
      expect(corpo.atualizar(quadro(id, 4)).emQuadro, id).toBe(true);
      const u = (malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial).uniforms;
      const par = u.uGraduacao.value as THREE.Vector2;
      expect(par.x, `${id} desat`).toBe(GRADUACAO_DO_MOSAICO[id]!.desat);
      expect(par.y, `${id} ganho`).toBe(GRADUACAO_DO_MOSAICO[id]!.ganho);
      corpo.dispose();
    }
  });

  it('em Mimas a graduação MUDA a cor: desatura de verdade e levanta o nível', () => {
    const { desat, ganho } = GRADUACAO_DO_MOSAICO.mimas!;
    // o par não é a identidade — zerar a tabela (a sabotagem) devolveria
    // o mosaico cru, e estas três medidas caem juntas
    expect(desat).toBeGreaterThan(0);
    const graduada = graduar(CRUA, desat, ganho);
    expect(razaoRB(CRUA)).toBeGreaterThan(1.05);
    expect(razaoRB(graduada)).toBeLessThan(razaoRB(CRUA));
    // a lua de gelo fica quase neutra (o realce IR/UV some)
    expect(Math.abs(razaoRB(graduada) - 1)).toBeLessThan(0.05);
    // e o nível sobe pelo ganho dele
    expect(graduada[1]).toBeGreaterThan(CRUA[1]);
  });

  it('Encélado tem o maior ganho — é o corpo mais reflexivo do Sistema', () => {
    const ganhos = Object.entries(GRADUACAO_DO_MOSAICO).map(([id, g]) => [id, g.ganho] as const);
    const maior = ganhos.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(maior[0]).toBe('enceladus');
    expect(maior[1]).toBe(1.35);
  });

  it('FORA das seis o par é (0,1) e a cor sai bit a bit intocada', async () => {
    for (const id of ['mercury', 'ganymede', 'titan']) {
      expect(GRADUACAO_DO_MOSAICO[id]).toBeUndefined();
      const { corpo } = rochosoDeTeste(id, 'lambert');
      corpo.atualizar(quadro(id, 4));
      await flush();
      corpo.atualizar(quadro(id, 4));
      const u = (malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial).uniforms;
      const par = u.uGraduacao.value as THREE.Vector2;
      expect([par.x, par.y], id).toEqual([0, 1]);
      corpo.dispose();
    }
    // e a conta com (0,1) é a identidade EXATA, não "quase"
    expect(graduar(CRUA, 0, 1)).toEqual([...CRUA]);
  });
});

// ------------------------------------------------------------
// 7. A MEIA VOLTA DOS MAPAS DAS SEIS (item 138)
// ------------------------------------------------------------

/**
 * A CONVENÇÃO DE LONGITUDE DOS ARQUIVOS. Os mosaicos de Schenk e os
 * mapas de relevo do projeto Saturn nascem em layout Schenk, que pede o
 * `offset 0.5` que ele aplica no shader e a casa não trouxe: até o item
 * 138 o relevo das seis luas caía MEIA VOLTA fora do albedo. O conserto
 * foi girar os doze mapas de relevo e os seis mosaicos NO ARQUIVO — uma
 * convenção só na árvore, nada no shader —, e é o arquivo que este juiz
 * lê.
 *
 * A MEDIDA é a do executor do 138 (`capturas/item138-medidas.txt`):
 * Herschel, a cratera que cobre um terço de Mimas, está a 104° W, que na
 * grade equiretangular centrada em 0° cai em u = 0,211; o mapa de altura
 * dela, como veio da S2, tinha o mínimo em u = 0,695 — a meia volta
 * exata — e depois do giro no arquivo ficou em u = 0,197. O juiz
 * reamostra a faixa equatorial dos DOIS arquivos (barato: 64x32) e cobra
 * o encontro.
 */
// Herschel a 104° W = 256° E; a grade da casa é centrada em 0° com o
// leste crescendo para a direita, então u = (0,5 + lonLeste/360) mod 1.
const U_DE_HERSCHEL = (0.5 + (360 - 104) / 360) % 1; // 0,2111…

/** o perfil da faixa equatorial de um arquivo, em 64 colunas. */
async function faixaEquatorial(caminho: string): Promise<number[]> {
  const { default: sharp } = await import('sharp');
  const L = 64;
  const A = 32;
  const { data, info } = await sharp(caminho)
    .removeAlpha()
    .resize(L, A, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const perfil: number[] = [];
  for (let x = 0; x < L; x += 1) {
    let soma = 0;
    for (let y = 13; y < 19; y += 1) soma += data[(y * L + x) * info.channels]!;
    perfil.push(soma / 6);
  }
  return perfil;
}

/** o u da coluna mais escura da faixa. */
function uDoMinimo(perfil: number[]): number {
  let iMin = 0;
  perfil.forEach((v, i) => {
    if (v < perfil[iMin]!) iMin = i;
  });
  return (iMin + 0.5) / perfil.length;
}

/** distância entre dois u DANDO A VOLTA (0,98 e 0,02 distam 0,04). */
const distanciaEmU = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};

const TEXTURAS = fileURLToPath(new URL('../../../../public/textures/atlas/', import.meta.url));

describe('7. a meia volta dos mapas das seis luas de mosaico (item 138)', () => {
  it('Herschel está a 104° W, que é u = 0,211 na grade da casa', () => {
    expect(U_DE_HERSCHEL).toBeCloseTo(0.2111, 4);
  });

  it('o mapa de ALTURA de Mimas tem o fundo de Herschel em u ≈ 0,2 — não meia volta adiante', async () => {
    const u = uDoMinimo(await faixaEquatorial(join(TEXTURAS, 'mimas/height.png')));
    expect(distanciaEmU(u, U_DE_HERSCHEL), `mínimo em u = ${u.toFixed(3)}`).toBeLessThan(0.05);
    // e NÃO no antípoda, que é onde a S2 o punha (u = 0,695 medido)
    expect(distanciaEmU(u, U_DE_HERSCHEL + 0.5)).toBeGreaterThan(0.4);
  });

  it('o fundo é fundo mesmo: Herschel afunda muito abaixo do resto do equador', async () => {
    const perfil = await faixaEquatorial(join(TEXTURAS, 'mimas/height.png'));
    const media = perfil.reduce((a, b) => a + b, 0) / perfil.length;
    expect(Math.min(...perfil)).toBeLessThan(media * 0.4);
  });

  it('o MOSAICO de Mimas está na MESMA convenção do relevo (os dois girados)', async () => {
    const uAltura = uDoMinimo(await faixaEquatorial(join(TEXTURAS, 'mimas/height.png')));
    const uAlbedo = uDoMinimo(await faixaEquatorial(join(TEXTURAS, 'mimas/map_1024.jpg')));
    // a mancha escura do equador do mosaico cai junto do fundo da bacia;
    // um dos dois arquivos girado sozinho poria os dois a meia volta
    expect(distanciaEmU(uAlbedo, uAltura), `albedo em ${uAlbedo.toFixed(3)}`).toBeLessThan(0.1);
  });

  it('as seis têm os três mapas (mosaico, altura e normal) na árvore', async () => {
    const { existsSync } = await import('node:fs');
    for (const id of Object.keys(GRADUACAO_DO_MOSAICO)) {
      for (const arq of ['map.jpg', 'height.png', 'normal.png']) {
        expect(existsSync(join(TEXTURAS, id, arq)), `${id}/${arq}`).toBe(true);
      }
    }
  });
});

// ------------------------------------------------------------
// 8. O RELEVO MEDIDO E O BUMP APOSENTADO (itens 140 e 141)
// ------------------------------------------------------------

describe('8. o relevo de Mercúrio e Marte vem MEDIDO, e o inventado saiu (141)', () => {
  it('Mercúrio e Marte: normal medida ligada em 1 (ganho nenhum) e bump ZERADO', async () => {
    for (const id of ['mercury', 'mars']) {
      const { corpo, chamadas } = rochosoDeTeste(id, id === 'mercury' ? 'ls' : 'lambert');
      corpo.atualizar(quadro(id, 4));
      await flush();
      expect(corpo.atualizar(quadro(id, 4)).emQuadro, id).toBe(true);
      const u = (malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial).uniforms;
      expect(u.uRelevoNormal.value, `${id} relevo`).toBe(NORMAL_MEDIDA[id]);
      expect(u.uRelevoNormal.value, `${id} ganho`).toBe(1);
      expect(u.uBumpAlbedo.value, `${id} bump`).toBe(0);
      // o mapa de normais DESCE e CHEGA ao material — sem isso o relevo
      // some sem ninguém notar
      expect(chamadas.some((c) => c.includes(`${id}/normal`)), `${id} pediu a normal`).toBe(true);
      expect(u.uMapaNormal.value, `${id} normal no material`).not.toBeNull();
      corpo.dispose();
    }
  });

  it('Europa e Io ficam LISAS: sem normal medida e sem bump inventado', async () => {
    for (const id of ['europa', 'io']) {
      const { corpo, chamadas } = rochosoDeTeste(id, 'ls');
      corpo.atualizar(quadro(id, 4));
      await flush();
      corpo.atualizar(quadro(id, 4));
      const u = (malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial).uniforms;
      expect(u.uRelevoNormal.value, `${id} relevo`).toBe(0);
      expect(u.uBumpAlbedo.value, `${id} bump`).toBe(0);
      // e nenhum canal de relevo é sequer pedido
      expect(chamadas.some((c) => c.includes('/normal') || c.includes('/height')), id).toBe(false);
      corpo.dispose();
    }
  });

  it('quem não tem relevo medido continua com a aproximação do albedo', async () => {
    const { corpo } = rochosoDeTeste('ganymede', 'ls');
    corpo.atualizar(quadro('ganymede', 4));
    await flush();
    corpo.atualizar(quadro('ganymede', 4));
    const u = (malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial).uniforms;
    expect(u.uBumpAlbedo.value).toBe(escalaDoBumpDoAlbedo('ganymede'));
    expect(u.uBumpAlbedo.value).toBeGreaterThan(0);
    expect(u.uRelevoNormal.value).toBe(0);
    corpo.dispose();
  });

  it('no fragmento, a normal MEDIDA exclui o bump — nunca as duas juntas', () => {
    for (const frag of [ROCHOSO_LS_FRAG, ROCHOSO_LAMBERT_FRAG]) {
      expect(frag).toContain('n = uRelevoNormal > 0.0');
      expect(frag).toContain('? normalDoMapa(n, vUv)');
      expect(frag).toContain(': normalComBumpDoAlbedo(n, pElip, alturaDoAlbedo(albedo));');
    }
  });

  it('a normal medida não desloca vértice: a malha das duas segue a esfera lisa', async () => {
    for (const id of ['mercury', 'mars']) {
      const { corpo } = rochosoDeTeste(id, 'lambert');
      corpo.atualizar(quadro(id, 4));
      await flush();
      corpo.atualizar(quadro(id, 4));
      const g = malhaDaSuperficie(corpo.group).geometry as THREE.SphereGeometry;
      // a esfera de 128x64 da casa, não a malha densa do relevo de vértice
      expect(g.parameters.widthSegments, id).toBe(128);
      expect(g.parameters.heightSegments, id).toBe(64);
      // e nenhum vértice saiu da esfera unitária
      const pos = g.getAttribute('position');
      for (const k of [0, 100, pos.count - 1]) {
        expect(
          Math.hypot(pos.getX(k), pos.getY(k), pos.getZ(k)),
          `${id} vértice ${k}`
        ).toBeCloseTo(1, 5);
      }
      corpo.dispose();
    }
  });
});
