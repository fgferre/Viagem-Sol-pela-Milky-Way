// ============================================================
// A TERRA RESOLVIDA (F2a) — os quatro juízes do módulo:
//
//  1. O ORÁCULO DE ORIENTAÇÃO (emenda D-E4): o transform do mesh em 3
//     instantes (inclusive o jd PINADO do eclipse de 2024) tem de pôr o
//     sub-ponto solar EXATAMENTE onde `subSolarPoint` (orientacao.ts,
//     julgado por Horizons) diz que ele está. Textura girada passa em
//     todos os md5 do mundo — aqui ela reprova. Com controle negativo:
//     o mapeamento espelhado TEM de falhar.
//  2. O PINO DA CONVENÇÃO DO THREE: a função uv→direção que o oráculo
//     usa é conferida contra a SphereGeometry REAL — sem este elo, o
//     oráculo julgaria a nossa cópia da convenção contra ela mesma.
//  3. O GATE BINÁRIO: histerese 2×, desigualdades assimétricas, NaN
//     preserva estado (contratos da Onda 3).
//  4. O GATILHO DA CARGA (lei 4 do cabeçalho de terra.ts): zero fetch
//     no boot e nas vistas de longe; a carga nasce SÓ quando o gate
//     arma ou na fase atlas — e a escada por tier escolhe a variante
//     certa do manifest REAL do repo.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { MetaEfemerides } from '../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../lib/atlas/efemerides';
import { subSolarPoint } from '../../../lib/atlas/orientacao';
import { ganhoFundido } from '../../../lib/atlas/luz';
import {
  LANTERNA_DE_LEITURA,
  S_DO_TERMINADOR,
  ganhoDoGlobo,
} from '../../../lib/atlas/luzDaVisita';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../lib/atlas/frameGalactico';
import { EPOCA_JD_TDB } from '../planetas/retrato2026';
import {
  ALVO_DE_APOIO_CINEMA,
  ATMOSFERA,
  CANAIS_DA_TERRA,
  CUSHION_DO_GATE,
  DERIVA_DAS_NUVENS,
  LIMIAR_DO_GATE_PX,
  RECARGAS_ATE_DESISTIR,
  RAIO_EQ_TERRA_PC,
  RAIO_POLAR_TERRA_PC,
  RAZAO_CASCA_ATMOSFERA,
  RAZAO_CASCA_NUVENS,
  TERRA_FRAG,
  TerraResolvida,
  alvoDePixels,
  cessaoAlvo,
  direcaoLocalDeLonLat,
  escolherVariante,
  escreverSombraDeEclipse,
  eixosDoMesh,
  gateBinario,
  orientacaoDaTerraNaCena,
  orientacaoDoCorpoNaCena,
  posicaoDaTerraUA,
  uniformsDeEclipseNeutros,
} from './terra';
import type { ManifestDeTexturas } from './terra';
import {
  criaSombraNaCena,
  pisoUmbralDoEclipsador,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import { IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import { cessaoPorDominancia } from '../lodStellar';

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

/** o jd PINADO da onda (eclipse solar 2024-04-08) + dois controles na janela */
const JDS = [2460409.26395835, EPOCA_JD_TDB, 2458327.34980323];

const FONTE = readFileSync(new URL('./terra.ts', import.meta.url), 'utf8');
// os shaders mudaram de casa na onda da arquitetura (corte 4): as leis
// pinadas no TEXTO deles leem o arquivo novo
const FONTE_SHADERS = readFileSync(
  new URL('../../shaders/terraShaders.ts', import.meta.url),
  'utf8'
);

function grau360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

function dirSolCena(jd: number): readonly [number, number, number] {
  const p = motor.posicaoHeliocentrica('earth', jd);
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

describe('1. o oráculo de orientação (emenda D-E4)', () => {
  it('a base é ortonormal dextrógira em qualquer instante', () => {
    for (const jd of JDS) {
      const { colunaX, colunaY, colunaZ } = orientacaoDaTerraNaCena(jd);
      const dot = (a: readonly number[], b: readonly number[]) =>
        a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(dot(colunaX, colunaX)).toBeCloseTo(1, 12);
      expect(dot(colunaY, colunaY)).toBeCloseTo(1, 12);
      expect(dot(colunaZ, colunaZ)).toBeCloseTo(1, 12);
      expect(dot(colunaX, colunaY)).toBeCloseTo(0, 12);
      expect(dot(colunaX, colunaZ)).toBeCloseTo(0, 12);
      // det = X · (Y × Z) = +1
      const det =
        colunaX[0] * (colunaY[1] * colunaZ[2] - colunaY[2] * colunaZ[1]) +
        colunaX[1] * (colunaY[2] * colunaZ[0] - colunaY[0] * colunaZ[2]) +
        colunaX[2] * (colunaY[0] * colunaZ[1] - colunaY[1] * colunaZ[0]);
      expect(det).toBeCloseTo(1, 12);
    }
  });

  it.each(JDS)('o transform do MESH põe o Sol a pino onde o Horizons diz — jd %f', async (jd) => {
    const { terra } = terraDeTeste();
    const perto = centroPc(jd);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    const q = quadro(perto, { jdTdb: jd });
    terra.atualizar(q);
    await flush();
    expect(terra.atualizar(q).emQuadro).toBe(true);
    const doMesh = subSolarDosEixos(eixosDoMesh(malhaDaSuperficie(terra.group)), dirSolCena(jd));
    const oraculo = subSolarPoint('earth', jd, motor);
    expect(doMesh.lonEastDeg).toBeCloseTo(oraculo.lonEastDeg, 8);
    expect(doMesh.latDeg).toBeCloseTo(oraculo.latPlanetocentricaDeg, 8);
    terra.dispose();
  });

  it('controle negativo: deitar o polo no equador no MESH reprova', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JDS[0]);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    const q = quadro(perto);
    terra.atualizar(q);
    await flush();
    expect(terra.atualizar(q).emQuadro).toBe(true);
    const mesh = malhaDaSuperficie(terra.group);
    const e = mesh.matrix.elements;
    for (let i = 0; i < 3; i++) {
      const tmp = e[4 + i];
      e[4 + i] = e[8 + i];
      e[8 + i] = tmp;
    }
    const doMesh = subSolarDosEixos(eixosDoMesh(mesh), dirSolCena(JDS[0]));
    const oraculo = subSolarPoint('earth', JDS[0], motor);
    expect(Math.abs(doMesh.latDeg - oraculo.latPlanetocentricaDeg)).toBeGreaterThan(10);
    terra.dispose();
  });
});

describe('2. o pino da convenção do three', () => {
  it('uv→direção bate com a SphereGeometry REAL, vértice a vértice', () => {
    const geo = new THREE.SphereGeometry(1, 16, 8);
    const pos = geo.getAttribute('position');
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      const lon = (uv.getX(i) - 0.5) * 360;
      const lat = (uv.getY(i) - 0.5) * 180;
      const d = direcaoLocalDeLonLat(lon, lat);
      const n = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i));
      expect(pos.getX(i) / n).toBeCloseTo(d[0], 6);
      expect(pos.getY(i) / n).toBeCloseTo(d[1], 6);
      expect(pos.getZ(i) / n).toBeCloseTo(d[2], 6);
    }
    geo.dispose();
  });
});

describe('3. o gate binário (F2a)', () => {
  it('entra no limiar, só sai abaixo de limiar/cushion — nunca no meio', () => {
    expect(gateBinario(false, LIMIAR_DO_GATE_PX - 0.01)).toBe(false);
    expect(gateBinario(false, LIMIAR_DO_GATE_PX)).toBe(true);
    // dentro da banda de histerese o estado fica onde está
    const meio = LIMIAR_DO_GATE_PX / CUSHION_DO_GATE + 0.5;
    expect(gateBinario(true, meio)).toBe(true);
    expect(gateBinario(false, meio)).toBe(false);
    // e só solta abaixo do cushion
    expect(gateBinario(true, LIMIAR_DO_GATE_PX / CUSHION_DO_GATE - 0.01)).toBe(false);
    expect(gateBinario(true, LIMIAR_DO_GATE_PX / CUSHION_DO_GATE)).toBe(true);
  });

  it('NaN preserva estado — medida envenenada não decide nada', () => {
    expect(gateBinario(true, Number.NaN)).toBe(true);
    expect(gateBinario(false, Number.NaN)).toBe(false);
  });
});

describe('4. a escada de texturas por tier (contra o manifest REAL)', () => {
  it('cinema pega o 8k no MAP quando o aparelho aguenta (política do dono)', () => {
    const v = escolherVariante(MANIFEST.entradas, 'earth', 'map', alvoDePixels('cinema', 'map', 16384), true);
    expect(v?.larguraPx).toBe(8192);
    expect(v?.arquivo.endsWith('.webp')).toBe(true);
  });

  it('A DOSE DE VRAM (lição N-9): em cinema só o map sobe a 8k; o apoio teta em 4k', () => {
    // Equiret 2:1, RGBA8 + mipmaps 4/3. A conta quadrada era 2× alta.
    const bytesEquiret = (w: number) => 4 * w * (w / 2) * (4 / 3);
    const terraCinema = bytesEquiret(8192) + 4 * bytesEquiret(4096);
    expect(terraCinema / 1024 ** 3).toBeCloseTo(0.333, 3);
    expect(alvoDePixels('cinema', 'map', 16384)).toBe(8192);
    for (const canal of CANAIS_DA_TERRA.filter((c) => c !== 'map')) {
      expect(alvoDePixels('cinema', canal, 16384), canal).toBe(ALVO_DE_APOIO_CINEMA);
      // e a variante da dose EXISTE no manifest real, canal a canal
      expect(
        escolherVariante(MANIFEST.entradas, 'earth', canal, ALVO_DE_APOIO_CINEMA, true)
          ?.larguraPx,
        canal
      ).toBe(4096);
    }
    // a regra é POR CANAL, não por corpo: a Lua (só map) mantém o 8k
    expect(
      escolherVariante(MANIFEST.entradas, 'moon', 'map', alvoDePixels('cinema', 'map', 16384), true)
        ?.larguraPx
    ).toBe(8192);
  });

  it('o teto da sonda governa: cinema em maxTextureSize 4096 desce a 4k', () => {
    const v = escolherVariante(MANIFEST.entradas, 'earth', 'map', alvoDePixels('cinema', 'map', 4096), true);
    expect(v?.larguraPx).toBe(4096);
  });

  it('alta = 2k, performance = 1k — em TODOS os canais', () => {
    expect(
      escolherVariante(MANIFEST.entradas, 'earth', 'map', alvoDePixels('alta', 'map', 16384), true)?.larguraPx
    ).toBe(2048);
    expect(
      escolherVariante(MANIFEST.entradas, 'earth', 'map', alvoDePixels('performance', 'map', 16384), true)
        ?.larguraPx
    ).toBe(1024);
    expect(alvoDePixels('alta', 'clouds', 16384)).toBe(2048);
    expect(alvoDePixels('performance', 'clouds', 16384)).toBe(1024);
  });

  it('sem webp cai no jpg da MESMA largura, nunca num degrau menor', () => {
    const v = escolherVariante(MANIFEST.entradas, 'earth', 'map', 8192, false);
    expect(v?.larguraPx).toBe(8192);
    expect(v?.arquivo.endsWith('.jpg')).toBe(true);
  });

  it('canal sem webp no degrau (clouds 2k) devolve o jpg mesmo com webp ok', () => {
    const v = escolherVariante(MANIFEST.entradas, 'earth', 'clouds', 2048, true);
    expect(v?.arquivo.endsWith('clouds_2048.jpg')).toBe(true);
  });

  it('o corpo é chave da escada: a mesma consulta em outro corpo NÃO vaza', () => {
    // F2b: a Lua entrou no manifest — pedir 'map' da Terra nunca pode
    // devolver o mapa da Lua, e vice-versa (a chave é corpo+canal)
    const daLua = escolherVariante(MANIFEST.entradas, 'moon', 'map', 8192, true);
    expect(daLua?.arquivo).toContain('/moon/');
    const daTerra = escolherVariante(MANIFEST.entradas, 'earth', 'map', 8192, true);
    expect(daTerra?.arquivo).toContain('/earth/');
    // canal que a Lua não tem devolve null — o chamador decide
    expect(escolherVariante(MANIFEST.entradas, 'moon', 'clouds', 8192, true)).toBeNull();
  });

  it('sem sonda legível o teto é 2k — errar para baixo, nunca estourar driver', () => {
    expect(alvoDePixels('cinema', 'map', undefined)).toBe(2048);
    expect(alvoDePixels('cinema', 'map', Number.NaN)).toBe(2048);
  });

  it('todos os cinco canais têm variante em todos os degraus da escada', () => {
    for (const canal of CANAIS_DA_TERRA) {
      for (const alvo of [1024, 2048, 4096, 8192]) {
        expect(
          escolherVariante(MANIFEST.entradas, 'earth', canal, alvo, true),
          `${canal} ≤ ${alvo}`
        ).not.toBeNull();
      }
    }
  });
});

// ------------------------------------------------------------
// A classe inteira, com carga INJETADA (nenhum fetch de verdade)
// ------------------------------------------------------------

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

function terraDeTeste() {
  const chamadas: string[] = [];
  const terra = new TerraResolvida({
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
  return { terra, chamadas };
}

/** centro da Terra em pc na cena, pelo mesmo caminho do módulo. */
function centroPc(jd: number): THREE.Vector3 {
  const p = posicaoDaTerraUA(jd, motor);
  const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
  return new THREE.Vector3(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
}

const JD = JDS[0];

/** a PSF do campo, com os números REAIS do init do Director. */
const PSF = { expoM0: 3.5, sigmaPx: 0.85, beta: 300 } as const;

function quadro(camPosPc: THREE.Vector3, extra: Partial<Parameters<TerraResolvida['atualizar']>[0]> = {}) {
  return {
    jdTdb: JD,
    fonte: motor as unknown as { posicaoHeliocentrica(id: string, jd: number): { x: number; y: number; z: number } },
    camPosPc,
    screenHPx: 1080,
    fovDeg: 58,
    ligado: true,
    atlasQuente: false,
    politica: 'assistida' as const,
    // dt GRANDE de propósito: um passo cobre a rampa temporal inteira
    // (stepRampToward clampa em 0,1 s = 1/3 da travessia; três ticks
    // assentam) — os testes que julgam a RAMPA passam dtS próprio
    dtS: 10,
    psf: PSF,
    salto: false,
    ...extra,
  };
}

describe('5. o gatilho da carga preguiçosa (lei 4)', () => {
  it('o construtor não busca NADA — o boot do filme fica intocado', async () => {
    const { chamadas } = terraDeTeste();
    await flush();
    expect(chamadas).toEqual([]);
  });

  it('de longe (gate frio, fora do atlas) segue sem um fetch', async () => {
    const { terra, chamadas } = terraDeTeste();
    terra.atualizar(quadro(new THREE.Vector3(0, 0, 0.001)));
    await flush();
    expect(chamadas).toEqual([]);
    terra.dispose();
  });

  it('o gate armando dispara a carga: manifest + os 5 canais no tier', async () => {
    const { terra, chamadas } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    expect(chamadas[0]).toBe('manifest:data/atlas/texturas.json');
    const texs = chamadas.filter((c) => c.startsWith('tex:'));
    expect(texs).toHaveLength(CANAIS_DA_TERRA.length);
    // cinema com sonda folgada: 8k SÓ no map; o apoio desce na dose de
    // VRAM (4k — no manifest real as nuvens 4k só existem em jpg)
    expect(texs).toContain('tex:textures/atlas/earth/map.webp');
    expect(texs).toContain('tex:textures/atlas/earth/clouds_4096.jpg');
    expect(texs).toContain('tex:textures/atlas/earth/night_4096.webp');
    expect(texs).toContain('tex:textures/atlas/earth/normal_4096.webp');
    expect(texs).toContain('tex:textures/atlas/earth/roughness_4096.webp');
    terra.dispose();
  });

  it('a fase atlas pré-aquece a carga mesmo de longe — e SÓ ela', async () => {
    const { terra, chamadas } = terraDeTeste();
    terra.atualizar(quadro(new THREE.Vector3(0, 0, 0.001), { atlasQuente: true }));
    await flush();
    expect(chamadas.length).toBeGreaterThan(0);
    terra.dispose();
  });
});

describe('6. o quadro vivo: gate + cessão + o escalar único de luz', () => {
  it('mesh dominando ⇒ cessão TOTAL (pela rampa); porta desligada devolve o ponto', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    // 1º tick: arma o gate e dispara a carga (ainda buscando)
    let e = terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(false);
    expect(e.carregando).toBe(true);
    expect(e.cede).toBe(0);
    await flush();
    // 2º tick: textura pronta, mesh em quadro — a 4 raios o globo domina
    // (r >> 2,5, alvo = 1) e a cessão ANDA por rampa em vez de saltar
    e = terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(true);
    expect(e.carregando).toBe(false);
    expect(e.cede).toBeGreaterThan(0);
    expect(e.emRampa).toBe(true);
    expect(terra.group.visible).toBe(true);
    // a rampa ASSENTA em 1 EXATO — o estado das vistas terra/terranb
    for (let i = 0; i < 8 && e.emRampa; i++) e = terra.atualizar(quadro(perto));
    expect(e.cede).toBe(1);
    expect(e.emRampa).toBe(false);
    // porta ?nocorpos: o mesh sai do quadro NO MESMO tick; o ponto volta
    // pela mesma rampa (sem pop) até o 0 exato
    e = terra.atualizar(quadro(perto, { ligado: false }));
    expect(e.emQuadro).toBe(false);
    expect(terra.group.visible).toBe(false);
    for (let i = 0; i < 8 && e.emRampa; i++) {
      e = terra.atualizar(quadro(perto, { ligado: false }));
    }
    expect(e.cede).toBe(0);
    terra.dispose();
  });

  it('salto de foco/data faz SNAP — nunca lerp através de teletransporte', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    // salto de CÂMERA: o alvo (1, a 4 raios) entra no mesmo tick
    let e = terra.atualizar(quadro(perto, { salto: true }));
    expect(e.cede).toBe(1);
    expect(e.emRampa).toBe(false);
    // salto de DATA (jd novo): idem, agora para o alvo da vista nova
    e = terra.atualizar(quadro(new THREE.Vector3(0, 0, 0.001), { jdTdb: JDS[2] }));
    expect(e.cede).toBe(0);
    expect(e.emRampa).toBe(false);
    terra.dispose();
  });

  it('a efeméride que chega TARDE recomputa a posição — mesmo jd, fonte nova', async () => {
    const { terra } = terraDeTeste();
    const cam = new THREE.Vector3(0, 0, 0.001);
    // 1º tick SEM fonte: o centro é o do retrato (o "sem rede" honesto)
    let e = terra.atualizar(quadro(cam, { fonte: null }));
    const doRetrato = e.centroPc.clone();
    // 2º tick com a fonte viva e o MESMO jd: o globo tem de saltar para
    // a posição da efeméride — o cache por jd sozinho o deixaria em 2026
    e = terra.atualizar(quadro(cam));
    expect(e.centroPc.equals(doRetrato)).toBe(false);
    expect(e.centroPc.distanceTo(centroPc(JD))).toBe(0);
    terra.dispose();
  });

  it('a histerese no ar: some só abaixo de limiar/2 do diâmetro', async () => {
    const { terra } = terraDeTeste();
    const c = centroPc(JD);
    const em = (raios: number) => {
      const p = c.clone();
      p.z += RAIO_EQ_TERRA_PC * raios;
      return p;
    };
    terra.atualizar(quadro(em(4)));
    await flush();
    // px por radiano da câmera de teste: 1080/(2·tan29°) ≈ 974 — o gate
    // de 4 px arma até ~487 raios; o de 2 px solta além de ~974
    let e = terra.atualizar(quadro(em(400)));
    expect(e.emQuadro).toBe(true);
    e = terra.atualizar(quadro(em(600))); // banda de histerese: fica
    expect(e.emQuadro).toBe(true);
    e = terra.atualizar(quadro(em(1100))); // abaixo do cushion: solta
    expect(e.emQuadro).toBe(false);
    expect(e.cede).toBe(0);
    terra.dispose();
  });

  /**
   * A PROMESSA MUDOU DUAS VEZES, e as duas DECLARADAS. Até o item 91 este
   * oráculo pinava `ganhoFundido(rUA, política)` — a lei do PONTO aplicada
   * no globo, que é exatamente o defeito que o dono viu em Saturno. O 91
   * trocou por `lei viva × compensação constante do corpo`, e o item 93
   * matou o produto inteiro: em `assistida` o Sol do globo vale **1
   * literal**, como no Eyes, e a compensação por corpo saiu do código —
   * sem resíduo de 1/d², não havia mais o que compensar.
   *
   * O PINO BIT-IDÊNTICO DA TERRA CAIU COM ISSO, e cai medido no fim deste
   * bloco: a Terra vivia na âncora, onde a compensação valia 1 exato e o
   * ganho batia com `ganhoFundido`; agora o ganho é 1 e a diferença é de
   * 0,10 %, menos de um nível de 255.
   */
  it('uLuzGanho é 1 em assistida e E(d) em real — e o pino do 91 caiu, com o delta medido', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    terra.atualizar(quadro(perto));
    const p = motor.posicaoHeliocentrica('earth', JD);
    const rUA = Math.hypot(p.x, p.y, p.z);
    const mats = terra.group.children.map(
      (m) => (m as THREE.Mesh).material as THREE.ShaderMaterial
    );
    expect(mats).toHaveLength(3);
    // AS TRÊS CASCAS continuam bebendo o MESMO escalar — a nuvem não
    // pode ficar num ISO e o chão em outro
    for (const m of mats) {
      expect(m.uniforms.uLuzGanho.value).toBe(1);
      expect(m.uniforms.uLuzGanho.value).toBe(ganhoDoGlobo(rUA, 'assistida'));
    }
    // e a política troca o MESMO uniform no tick seguinte, sem recarga
    terra.atualizar(quadro(perto, { politica: 'real' }));
    for (const m of mats) {
      expect(m.uniforms.uLuzGanho.value).toBe(ganhoDoGlobo(rUA, 'real'));
      expect(Object.is(m.uniforms.uLuzGanho.value, ganhoFundido(rUA, 'real'))).toBe(true);
    }
    // O PINO BIT-IDÊNTICO DO ITEM 91 CAIU AQUI, e caiu AUTORIZADO: o
    // contrato do 93 diz em letra "bit-idêntico da Terra/Lua do item 91:
    // cai". O número velho fica escrito para que a queda seja medida —
    // era 0,998953, e agora é 1 exato: 0,10 %, menos de um nível de 255.
    // Quem move a Terra na tela são a LOGÍSTICA e a LANTERNA, não isto.
    const ANTES_DO_93 = ganhoFundido(rUA, 'assistida');
    expect(ANTES_DO_93).toBeCloseTo(0.998953185723, 9);
    expect(Object.is(ganhoDoGlobo(rUA, 'assistida'), ANTES_DO_93)).toBe(false);
    terra.dispose();
  });

  /**
   * ITEM 93 — A TERRA RECEBE AS DUAS PEÇAS NA SUPERFÍCIE, E SÓ NELA.
   *
   * O contrato manda pôr a logística no `ndotl` da DIRETA e somar a
   * lanterna depois do Sol; manda, com todas as letras, deixar as
   * CIDADES e o NISHITA como estavam. O juiz lê os uniformes que as três
   * cascas receberam: a superfície tem os dois, as nuvens e a atmosfera
   * não têm nenhum — e é isso que impede alguém de "uniformizar" a
   * receita para as cascas sem ver a foto.
   */
  it('PINO 93: a receita entra na superfície; nuvens e atmosfera ficam de fora', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    terra.atualizar(quadro(perto));
    const [sup, ...cascas] = terra.group.children.map(
      (m) => (m as THREE.Mesh).material as THREE.ShaderMaterial
    );
    expect(sup!.uniforms.uLanternaLeitura.value).toBe(LANTERNA_DE_LEITURA);
    expect(sup!.uniforms.uTerminadorS.value).toBe(S_DO_TERMINADOR);
    expect(cascas).toHaveLength(2);
    for (const c of cascas) {
      expect(c.uniforms.uLanternaLeitura).toBeUndefined();
      expect(c.uniforms.uTerminadorS).toBeUndefined();
    }
    // em `real` as duas peças APAGAM na superfície também
    terra.atualizar(quadro(perto, { politica: 'real' }));
    expect(sup!.uniforms.uLanternaLeitura.value).toBe(0);
    expect(sup!.uniforms.uTerminadorS.value).toBe(0);
    terra.dispose();
  });

  it('o sub-ponto solar do UNIFORM bate com o oráculo — a fiação inteira', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    terra.atualizar(quadro(perto));
    const sup = terra.group.children[0] as THREE.Mesh;
    const dir = (sup.material as THREE.ShaderMaterial).uniforms.uDirSolLocal
      .value as THREE.Vector3;
    const lon = grau360(Math.atan2(-dir.z, dir.x) / (Math.PI / 180));
    const lat = Math.asin(Math.max(-1, Math.min(1, dir.y))) / (Math.PI / 180);
    const oraculo = subSolarPoint('earth', JD, motor);
    expect(lon).toBeCloseTo(oraculo.lonEastDeg, 6);
    expect(lat).toBeCloseTo(oraculo.latPlanetocentricaDeg, 6);
    terra.dispose();
  });

  it('a composição do palco: superfície opaca escreve depth; cascas não', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    terra.atualizar(quadro(perto));
    const [sup, nuv, atm] = terra.group.children.map(
      (m) => (m as THREE.Mesh).material as THREE.ShaderMaterial
    );
    expect(sup.depthWrite).toBe(true);
    expect(sup.depthTest).toBe(true);
    expect(sup.transparent).toBe(false);
    expect(nuv.depthWrite).toBe(false);
    expect(nuv.depthTest).toBe(true);
    expect(nuv.transparent).toBe(true);
    expect(atm.depthWrite).toBe(false);
    expect(atm.blending).toBe(THREE.AdditiveBlending);
    // face de TRÁS: o fragmento é a SAÍDA do raio — na frente o caminho
    // integrado colapsa a zero e a atmosfera some (medido na F2a)
    expect(atm.side).toBe(THREE.BackSide);
    terra.dispose();
  });
});

describe('6b. a dominância suave (F2b/D5) — a lei e as cicatrizes', () => {
  it('fora de quadro a cessão é 0 EXATO — é o que segura as vistas profundas', () => {
    expect(cessaoAlvo(false, 500, 10)).toBe(0);
    expect(Object.is(cessaoAlvo(false, Number.NaN, Number.NaN), 0)).toBe(true);
  });

  it('sob o halo (r ≤ 1) o ponto fica INTEIRO: o mesh nasce SOB o clarão', () => {
    // aos 4 px do gate contra um halo típico de ~12 px, r ≈ 0,33
    expect(cessaoAlvo(true, 4, 12)).toBe(0);
    expect(cessaoAlvo(true, 12, 12)).toBe(0); // r = 1 é a borda, exclusive
  });

  it('dominando (r ≥ 2,5) a cessão é 1 EXATO — o estado de terra/terranb', () => {
    expect(cessaoAlvo(true, 30, 12)).toBe(1);
    expect(cessaoAlvo(true, 795, 15)).toBe(1);
  });

  it('halo inexistente (ponto invisível) não cede — precedente heroDominanceRatio', () => {
    expect(cessaoAlvo(true, 40, 0)).toBe(0);
    expect(cessaoAlvo(true, 40, Number.NaN)).toBe(0);
  });

  it('PROPRIEDADE (a C1a do handoff): soma > 0 em TODA a faixa — nenhuma banda morta', () => {
    // varre a descida inteira, do gate frio ao globo colado: em cada
    // distância, ponto vivo (1 − cede) + mesh em quadro têm de somar
    // presença — nunca um buraco em que nada representa a Terra
    const pxPorRad = 1080 / (2 * Math.tan((58 / 2) * (Math.PI / 180)));
    let cede = 0;
    let armado = false;
    for (let raios = 6000; raios >= 1.5; raios *= 0.98) {
      const dPc = RAIO_EQ_TERRA_PC * raios;
      const mesh = 2 * Math.atan(RAIO_EQ_TERRA_PC / dPc) * pxPorRad;
      armado = gateBinario(armado, mesh);
      const emQuadro = armado; // textura pronta e porta ligada, no pior caso
      // halo plausível da faixa (medido ~11–14 px); o alvo é a LEI, e a
      // propriedade tem de valer para qualquer halo positivo
      for (const halo of [8, 12, 16]) {
        const alvo = cessaoAlvo(emQuadro, mesh, halo);
        cede = alvo; // o assentamento da rampa — o pior caso da soma
        const presenca = (1 - cede) + (emQuadro ? 1 : 0);
        expect(presenca, `raios=${raios.toFixed(0)} halo=${halo}`).toBeGreaterThan(0);
        // e a cessão só existe COM mesh em quadro
        if (!emQuadro) expect(cede).toBe(0);
      }
    }
    // a descida terminou com o globo dominando e o gate armado
    expect(armado).toBe(true);
    expect(cede).toBe(1);
  });

  it('a curva é a MESMA do par hero↔catálogo — uma lei, dois consumidores', () => {
    for (const r of [1.2, 1.7, 2.2]) {
      expect(cessaoAlvo(true, r * 10, 10)).toBeCloseTo(cessaoPorDominancia(r), 12);
    }
  });
});

describe('6c. a falha de carga não é sentença (auditoria item 6)', () => {
  /** Terra cujo manifest falha `falhas` vezes antes de passar. */
  function terraQueFalha(falhas: number) {
    let restantes = falhas;
    const chamadas: string[] = [];
    const terra = new TerraResolvida({
      tier: () => 'cinema',
      maxTextureSize: 16384,
      base: '',
      webp: true,
      buscarManifest: async (url) => {
        chamadas.push(`manifest:${url}`);
        if (restantes-- > 0) throw new Error('HTTP 500');
        return MANIFEST;
      },
      carregarTextura: async () => new THREE.Texture(),
    });
    return { terra, chamadas };
  }

  it('falha 1× volta a fria; a recarga do tick seguinte traz o globo', async () => {
    const { terra, chamadas } = terraQueFalha(1);
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    let e = terra.atualizar(quadro(perto)); // 1ª carga dispara
    expect(e.carregando).toBe(true);
    await flush(); // ...e falha → 'fria' de novo, sem aviso
    e = terra.atualizar(quadro(perto)); // o MESMO gatilho rearma (recarga)
    expect(e.carregando).toBe(true);
    await flush();
    e = terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(true);
    expect(chamadas.filter((c) => c.startsWith('manifest:'))).toHaveLength(2);
    terra.dispose();
  });

  it('esgotadas as recargas o estado desiste DE VERDADE, com aviso único', async () => {
    const avisos = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { terra, chamadas } = terraQueFalha(Number.POSITIVE_INFINITY);
      const perto = centroPc(JD);
      perto.z += RAIO_EQ_TERRA_PC * 4;
      // ticks de sobra: 1 carga + RECARGAS_ATE_DESISTIR recargas, e nada mais
      let e = terra.atualizar(quadro(perto));
      for (let i = 0; i < 6; i++) {
        await flush();
        e = terra.atualizar(quadro(perto));
      }
      expect(chamadas.filter((c) => c.startsWith('manifest:'))).toHaveLength(
        1 + RECARGAS_ATE_DESISTIR
      );
      expect(avisos).toHaveBeenCalledTimes(1);
      // o estado que o `captura` do Director SEGURA (item 5b): gate
      // armado a FRIO — nem globo em quadro, nem fetch em voo
      expect(e.gateArmado).toBe(true);
      expect(e.emQuadro).toBe(false);
      expect(e.carregando).toBe(false);
      terra.dispose();
    } finally {
      avisos.mockRestore();
    }
  });
});

describe('7. texto-fonte (as leis do cabeçalho, pinadas)', () => {
  it('não tem relógio: o jd é do Director (D-E6)', () => {
    expect(FONTE).not.toContain('Date.now');
    expect(FONTE).not.toContain('new Date(');
    expect(FONTE).not.toContain('performance.now');
  });

  it('a luz direta multiplica o ESCALAR ÚNICO, e as luzes de cidade ficam fora', () => {
    // o único lugar do fragment em que o ganho entra na superfície
    expect(FONTE_SHADERS).toContain('vec3 luzSol = vec3(uLuzGanho) * sombras;');
    expect(FONTE_SHADERS).toContain('vec3 direta = albedo * luz + vec3(espec) * luzSol;');
    // emissão: máscara × intensidade, SEM o ganho — cidade não é reflexo
    expect(FONTE_SHADERS).toContain('.rgb * (mascaraNoite * uNoiteGanho)');
    // o NOME do escalar mudou no item 91: a malha deixou de chamar a lei
    // do ponto e passa a chamar a exposição da visita
    expect(FONTE_SHADERS).toContain('ganhoDoGlobo(');
    expect(FONTE_SHADERS).not.toContain('ganhoFundido(');
  });

  it('não existe termo ambiente (anti-padrões 3 e 9): a saída é direta + emissão e nada mais', () => {
    expect(FONTE_SHADERS).toContain('gl_FragColor = vec4(direta + luzes, 1.0);');
    expect(FONTE_SHADERS).not.toMatch(/uAmbient|ambientLight|uPiso/);
  });

  it('as luzes noturnas usam o linstep do espec, não smoothstep', () => {
    expect(FONTE_SHADERS).toContain('linstep(-0.1, 0.1, -ndotlGeo)');
    expect(FONTE_SHADERS).not.toContain('smoothstep(');
  });

  it('a ponte de frame é a da casa e SÓ ela (D1)', () => {
    expect(FONTE).toContain('eclipticaParaEquatorial');
    expect(FONTE).toContain('AU_PARA_PC');
    expect(FONTE).not.toContain('galactocentricToScene');
  });

  it('nenhum chunk do three atravessa: shaders próprios por inteiro', () => {
    expect(FONTE_SHADERS).not.toContain('#include');
    expect(FONTE_SHADERS).not.toContain('ShaderChunk');
  });

  it('os raios saem de BODY_AXES — achatamento real, nenhum literal novo', () => {
    expect(FONTE).toContain('BODY_AXES.earth[0]');
    expect(FONTE).toContain('BODY_AXES.earth[2]');
    expect(RAIO_POLAR_TERRA_PC).toBeLessThan(RAIO_EQ_TERRA_PC);
    expect(RAIO_POLAR_TERRA_PC / RAIO_EQ_TERRA_PC).toBeCloseTo(6356.7519 / 6378.1366, 12);
  });

  it('a fiação no director: registro no palco, cessão, ordem e teardown', () => {
    const director = readFileSync(new URL('../../director.ts', import.meta.url), 'utf8');
    // OS QUATRO LAÇOS VIRARAM UM (item 63, 22/08): o registro, a cessão
    // e o fallback frio moram em `director/palco.ts`, sobre a lista
    // única; o que se cobra aqui é a MESMA fiação, no endereço novo.
    const palco = readFileSync(
      new URL('../../director/palco.ts', import.meta.url),
      'utf8'
    );
    // o Director registra a superfície e escreve a cessão — a Terra não
    // conhece nem o palco nem a camada
    expect(palco).toContain('palco.registrar(posto.id, e.raioPc, e.centroPc)');
    expect(palco).toContain('palco.remover(posto.id)');
    expect(palco).toContain('escreverCessao(posto.id, e.cede ?? 0)');
    // e a TERRA é um dos doze, com ponto (cessão) e retrato congelado
    const carregamento = readFileSync(
      new URL('../../director/carregamento.ts', import.meta.url),
      'utf8'
    );
    expect(carregamento).toContain("new TerraResolvida({ tier, maxTextureSize, base }), 'earth'");
    // o passo do palco roda ANTES do near ler a superfície: sem lag de
    // 1 quadro entre o globo entrar em quadro e o clip enxergá-lo
    const tickPalco = director.indexOf('passoDoPalco(this.noPalco');
    const nearLe = director.indexOf('this.palco.superficieMaisProxima(');
    expect(tickPalco).toBeGreaterThan(0);
    expect(tickPalco).toBeLessThan(nearLe);
    // a porta ?luz= passa pela lei única, e a captura espera a textura
    expect(director).toContain("lerPortaLuz(this.debug.get('luz'))");
    expect(director).toContain('this.noPalco.some((p) => p.carregando)');
    // ...e SEGURA o gate a FRIO (item 5b) e o retrato acusado (item 5c):
    // corpo armado sem textura quente não captura; efeméride pedida
    // indisponível segura a janela da retentativa e ACUSA no console. O
    // selo dos frios cobre OS DOZE de uma vez — não há mais lista para
    // alguém esquecer de acrescentar.
    expect(palco).toContain('posto.friaNoGate =');
    expect(palco).toContain('posto.temRetrato || efemeride !== null');
    expect(director).toContain('!this.noPalco.some((p) => p.friaNoGate)');
    expect(director).toContain("this.maquinaDoTempo.faseDaEfemeride === 'indisponivel'");
    expect(director).toContain('QUADROS_TENTANDO_FONTE');
    expect(director).toContain('RETRATO congelado');
    // teardown: os corpos devolvem tudo ANTES do palco esvaziar
    const stepCorpos = director.indexOf('step(posto.id, () => posto.corpo.dispose())');
    const stepPalco = director.indexOf("step('palco'");
    expect(stepCorpos).toBeGreaterThan(0);
    expect(stepCorpos).toBeLessThan(stepPalco);
  });

  it('as constantes do espec do doador estão pinadas número a número', () => {
    expect(ATMOSFERA).toEqual({
      kRayleigh: 0.0025,
      kMie: 0.0015,
      eSun: 10,
      g: 0.76,
      amostras: 23,
      scaleDepth: 0.25,
      comprimentosDeOnda: [0.65, 0.57, 0.475],
    });
    expect(RAZAO_CASCA_ATMOSFERA).toBe(1.025);
    expect(RAZAO_CASCA_NUVENS).toBe(1.0015);
    expect(DERIVA_DAS_NUVENS).toBe(1.03);
  });
});

describe('8. o eclipse na tela (F2c/D3)', () => {
  it('o needle do GLSL: o chunk da lib está no shader MONTADO e multiplica SÓ a direta', () => {
    // a lição do chunk renomeado do doador: lê-se o shader MONTADO
    // (TERRA_FRAG exportado para isto), nunca só o texto-fonte
    expect(TERRA_FRAG).toContain('vec3 fatorDeEclipse(vec3 p, vec3 n, float ndotlGeo)');
    expect(TERRA_FRAG).toContain('if (uEclipseAtivo < 0.5) return vec3(1.0);');
    // o fator entra DEPOIS do BRDF, na componente direta e só nela — e a
    // LANTERNA (item 93) recebe o MESMO `sombras`, que é a divergência
    // declarada do 93: um fill de câmera não acende a umbra de Durango
    expect(TERRA_FRAG).toContain(
      'vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);'
    );
    expect(TERRA_FRAG).toContain(
      'luzDoGlobo(vec3(ndotl) * luzSol, lanternaDeLeitura(nRelevo, v, sombras))'
    );
    // a emissão (luzes de cidade) soma DEPOIS do fator — fora da sombra
    expect(TERRA_FRAG).toContain('gl_FragColor = vec4(direta + luzes, 1.0);');
    // a casca das nuvens recebe o MESMO chunk (escurece junto): duas
    // interpolações do chunk da lib no texto-fonte, nenhuma cópia redigitada
    expect(FONTE_SHADERS.match(/\$\{GLSL_SOMBRA_ECLIPSE\}/g)).toHaveLength(2);
  });

  it('a ponte cena→local: o eixo da sombra no frame local É o anti-Sol, nos dois jd pinados', () => {
    const dot3 = (a: readonly number[], b: readonly number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    // no máximo de um eclipse o eixo da sombra fica a décimos de grau do
    // anti-Sol do receptor (é a DEFINIÇÃO de máximo) — uma base transposta
    // ou negada erra por dezenas de graus e reprova aqui, onde o md5 é cego
    // para o LUGAR da sombra no disco
    const casos: Array<{
      receptor: 'earth' | 'moon';
      eclipsador: 'earth' | 'moon';
      jd: number;
    }> = [
      { receptor: 'earth', eclipsador: 'moon', jd: 2460409.26395835 }, // solar 2024
      { receptor: 'moon', eclipsador: 'earth', jd: 2458327.34980323 }, // lunar 2018
    ];
    for (const { receptor, eclipsador, jd } of casos) {
      const pR = motor.posicaoHeliocentrica(receptor, jd);
      const pE = motor.posicaoHeliocentrica(eclipsador, jd);
      const s = resolveSombraNaCena(
        receptor,
        [pR.x, pR.y, pR.z],
        [pE.x, pE.y, pE.z],
        criaSombraNaCena()
      );
      expect(s.ativo).toBe(true);
      const u = uniformsDeEclipseNeutros();
      const o = orientacaoDoCorpoNaCena(IAU_ORIENTATIONS[receptor], jd);
      escreverSombraDeEclipse(
        u,
        s,
        new THREE.Vector3(...o.colunaX),
        new THREE.Vector3(...o.colunaY),
        new THREE.Vector3(...o.colunaZ),
        0
      );
      expect(u.uEclipseAtivo.value).toBe(1);
      const norma = Math.hypot(pR.x, pR.y, pR.z);
      const antiSol = eclipticaParaEquatorial([pR.x / norma, pR.y / norma, pR.z / norma]);
      const asL: [number, number, number] = [
        dot3(antiSol, o.colunaX),
        dot3(antiSol, o.colunaY),
        dot3(antiSol, o.colunaZ),
      ];
      const eixo = u.uEclipseEixo.value as THREE.Vector3;
      expect(eixo.x * asL[0] + eixo.y * asL[1] + eixo.z * asL[2]).toBeGreaterThan(0.999);
    }
  });

  it('o piso umbral no uniform: neutro com a Lua eclipsando, COBRE de Danjon com a Terra', () => {
    // solar 2024 (receptor Terra): totalidade com piso 0 e cor neutra —
    // o tinte laranja de receptor solar morreu no doador
    const pT = motor.posicaoHeliocentrica('earth', 2460409.26395835);
    const pL = motor.posicaoHeliocentrica('moon', 2460409.26395835);
    const sSolar = resolveSombraNaCena(
      'earth',
      [pT.x, pT.y, pT.z],
      [pL.x, pL.y, pL.z],
      criaSombraNaCena()
    );
    const uSolar = uniformsDeEclipseNeutros();
    const oT = orientacaoDaTerraNaCena(2460409.26395835);
    escreverSombraDeEclipse(
      uSolar,
      sSolar,
      new THREE.Vector3(...oT.colunaX),
      new THREE.Vector3(...oT.colunaY),
      new THREE.Vector3(...oT.colunaZ),
      0
    );
    expect(uSolar.uEclipsePisoEscalar.value).toBe(0);
    expect(uSolar.uEclipsePisoCor.value).toEqual(new THREE.Vector3(0, 0, 0));

    // lunar 2018 (receptor Lua): a blood moon é o piso da LIB, componente
    // a componente — nunca uma cor inventada no consumidor
    const pM = motor.posicaoHeliocentrica('moon', 2458327.34980323);
    const pE = motor.posicaoHeliocentrica('earth', 2458327.34980323);
    const sLunar = resolveSombraNaCena(
      'moon',
      [pM.x, pM.y, pM.z],
      [pE.x, pE.y, pE.z],
      criaSombraNaCena()
    );
    const uLunar = uniformsDeEclipseNeutros();
    const oM = orientacaoDoCorpoNaCena(IAU_ORIENTATIONS.moon, 2458327.34980323);
    escreverSombraDeEclipse(
      uLunar,
      sLunar,
      new THREE.Vector3(...oM.colunaX),
      new THREE.Vector3(...oM.colunaY),
      new THREE.Vector3(...oM.colunaZ),
      0
    );
    const piso = pisoUmbralDoEclipsador('earth');
    const cor = uLunar.uEclipsePisoCor.value as THREE.Vector3;
    expect(cor.x).toBe(piso[0]);
    expect(cor.y).toBe(piso[1]);
    expect(cor.z).toBe(piso[2]);
    expect(cor.x).toBeGreaterThan(0); // cobre, não preto
    expect(uLunar.uEclipsePisoEscalar.value).toBe(0);
  });

  it('inativo: só o flag 0 é escrito — os vetores neutros ficam intactos (o que mantém as 22)', () => {
    const u = uniformsDeEclipseNeutros();
    const eixo0 = (u.uEclipseEixo.value as THREE.Vector3).clone();
    const cone0 = (u.uEclipseCone.value as THREE.Vector3).clone();
    escreverSombraDeEclipse(
      u,
      criaSombraNaCena(), // ativo = false
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
      0
    );
    expect(u.uEclipseAtivo.value).toBe(0);
    expect(u.uEclipseEixo.value).toEqual(eixo0);
    expect(u.uEclipseCone.value).toEqual(cone0);
    expect(u.uEclipsePisoEscalar.value).toBe(1);
  });
});
