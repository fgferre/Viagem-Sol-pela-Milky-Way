// Serve: lei — a orientação da Terra bate com o Horizons, e o gate binário e o gatilho de carga obedecem ao módulo
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
  ATMOSFERA_FRAG,
  ATMOSFERA_PROFUNDIDADE_FRAG,
  CANAIS_DA_TERRA,
  CUSHION_DO_GATE,
  DERIVA_DAS_NUVENS,
  ESPALHAMENTO_MULTIPLO,
  LIMIAR_DO_GATE_PX,
  NUVENS_FRAG,
  NUVENS_PROFUNDIDADE_FRAG,
  RECARGAS_ATE_DESISTIR,
  RAIO_EQ_TERRA_PC,
  RAIO_POLAR_TERRA_PC,
  RAZAO_CASCA_ATMOSFERA,
  RAZAO_CASCA_NUVENS,
  TERRA_FRAG,
  TERRA_PROFUNDIDADE_FRAG,
  TerraResolvida,
  alvoDePixels,
  caminhoDoSolNoAr,
  cessaoAlvo,
  direcaoLocalDeLonLat,
  escolherVariante,
  escreverSombraDeEclipse,
  eixosDoMesh,
  gateBinario,
  orientacaoDaTerraNaCena,
  orientacaoDoCorpoNaCena,
  posicaoDaTerraUA,
  tabelaDoEspalhamentoMultiplo,
  uniformsDaAtmosfera,
  uniformsDeEclipseNeutros,
} from './terra';
import type { ManifestDeTexturas } from './terra';
import {
  criaSombraNaCena,
  pisoUmbralDoEclipsador,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import {
  ALTURA_DE_ESCALA_KM,
  COMPRIMENTOS_DE_ONDA_UM,
  RAIO_DO_AR_KM,
  massaDeArDeChapman,
  tauRayleighAoNivelDoMar,
} from '../../../lib/atlas/arMedido';
import { cessaoPorDisco } from '../lodStellar';
import { FATOR_DO_RELEVO_REALCADO } from '../../core/engine';

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
      // o nome é o arquivo: quem testa a fiação sabe qual canal foi aonde
      return Object.assign(new THREE.Texture(), { name: url });
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

function quadro(camPosPc: THREE.Vector3, extra: Partial<Parameters<TerraResolvida['atualizar']>[0]> = {}) {
  return {
    jdTdb: JD,
    fonte: motor as unknown as { posicaoHeliocentrica(id: string, jd: number): { x: number; y: number; z: number } },
    camPosPc,
    screenHPx: 1080,
    fovDeg: 58,
    ligado: true,
    focoDoAtlas: false,
    pedidoDoRoteiro: false,
    politica: 'assistida' as const,
    // o relógio de parede fica PARADO por padrão: quem testa a carência
    // da descarga passa o `tS` dele
    tS: 0,
    // dt GRANDE de propósito: um passo cobre a rampa temporal inteira
    // (stepRampToward clampa em 0,1 s = 1/3 da travessia; três ticks
    // assentam) — os testes que julgam a RAMPA passam dtS próprio
    dtS: 10,
    pr: 1,
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
    terra.atualizar(quadro(new THREE.Vector3(0, 0, 0.001), { focoDoAtlas: true }));
    await flush();
    expect(chamadas.length).toBeGreaterThan(0);
    terra.dispose();
  });

  it('a descarga NUNCA alcança um globo em quadro — o gate é o segurador', async () => {
    // A prova de que a carência de 15 s (item 115) é segura por
    // construção: `emQuadro` exige o gate ARMADO, e o gate armado é o
    // segurador `tela`. Uma hora de relógio de parede com a câmera
    // colada não pode apagar o globo.
    const { terra, chamadas } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    expect(terra.atualizar(quadro(perto)).emQuadro).toBe(true);
    const carregas = chamadas.filter((c) => c.startsWith('tex:')).length;
    for (const tS of [60, 600, 3600]) {
      const e = terra.atualizar(quadro(perto, { tS }));
      expect(e.emQuadro, `o globo sumiu em tS=${tS}`).toBe(true);
    }
    // e nada foi rebaixado e recarregado pelo caminho
    expect(chamadas.filter((c) => c.startsWith('tex:'))).toHaveLength(carregas);
    terra.dispose();
  });

  it('fora do gate e fora do foco: passada a carência, os texels voltam', async () => {
    // o espelho do teste acima — e o que o passeio mede no navegador
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    expect(terra.atualizar(quadro(perto)).emQuadro).toBe(true);
    // a câmera vai embora: o gate desarma e ninguém mais segura
    const longe = new THREE.Vector3(0, 0, 40);
    expect(terra.atualizar(quadro(longe)).gateArmado).toBe(false);
    terra.atualizar(quadro(longe, { tS: 14.9 }));
    expect(terra.estadoVivo.carregando).toBe(false);
    // ...e depois dos 15 s a Terra volta a ser fria: o gate reaproxima e
    // a carga recomeça, com o ponto fotométrico cobrindo o caminho
    terra.atualizar(quadro(longe, { tS: 15.1 }));
    const volta = terra.atualizar(quadro(perto, { tS: 15.2 }));
    expect(volta.emQuadro).toBe(false);
    expect(volta.carregando).toBe(true);
    terra.dispose();
  });
});

describe('6. o quadro vivo: gate + cessão + o escalar único de luz', () => {
  it('globo grande ⇒ cessão TOTAL (pela rampa da presença); porta desligada devolve o ponto', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    // 1º tick: arma o gate e dispara a carga (ainda buscando)
    let e = terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(false);
    expect(e.carregando).toBe(true);
    expect(e.cede).toBe(0);
    await flush();
    // 2º tick: textura pronta, mesh em quadro — a 4 raios o disco passa
    // de 12 px (régua = 1) e a PRESENÇA do globo anda por rampa
    e = terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(true);
    expect(e.carregando).toBe(false);
    expect(e.alvoDeCessao).toBe(1);
    expect(e.cede).toBeGreaterThan(0);
    expect(e.cede).toBeLessThan(1);
    expect(e.emRampa).toBe(true);
    expect(terra.group.visible).toBe(true);
    // a rampa ASSENTA em 1 EXATO — o estado das vistas terra/terranb
    for (let i = 0; i < 8 && e.emRampa; i++) e = terra.atualizar(quadro(perto));
    expect(e.cede).toBe(1);
    expect(e.emRampa).toBe(false);
    // porta ?nocorpos: o mesh sai do quadro NO MESMO tick, e o ponto
    // volta inteiro no mesmo tick (régua fora de quadro = 0) — sem buraco
    e = terra.atualizar(quadro(perto, { ligado: false }));
    expect(e.emQuadro).toBe(false);
    expect(terra.group.visible).toBe(false);
    expect(e.cede).toBe(0);
    terra.dispose();
  });

  it('o TAMANHO muda a cessão no MESMO tick; só a presença anda no tempo', async () => {
    const { terra } = terraDeTeste();
    const c = centroPc(JD);
    const em = (raios: number) => c.clone().setZ(c.z + RAIO_EQ_TERRA_PC * raios);
    terra.atualizar(quadro(em(4)));
    await flush();
    // presença assentada com o globo grande: cede 1
    let e = terra.atualizar(quadro(em(4), { salto: true }));
    expect(e.cede).toBe(1);
    // a 243 raios o disco tem ~8 px: a régua responde já, sem rampa
    // (dtS ínfimo — uma rampa não andaria quase nada)
    e = terra.atualizar(quadro(em(243), { dtS: 1e-4 }));
    expect(e.emQuadro).toBe(true);
    expect(e.cede).toBe(cessaoPorDisco(e.diametroPx, 1));
    expect(e.cede).toBeGreaterThan(0.4);
    expect(e.cede).toBeLessThan(0.6);
    expect(e.emRampa).toBe(false);
    // e o DPR 2 põe o mesmo disco abaixo da borda de 8 px físicos
    e = terra.atualizar(quadro(em(243), { dtS: 1e-4, pr: 2 }));
    expect(e.cede).toBe(cessaoPorDisco(e.diametroPx, 2));
    expect(e.cede).toBeLessThan(0.01);
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

  it('o salto com a textura ATRASADA fica guardado: o globo que chega depois estala, não rampa', async () => {
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    const { terra } = terraDeTeste();
    // o tick do salto: gate armado, textura ainda buscando — presença 0
    let e = terra.atualizar(quadro(perto, { salto: true }));
    expect(e.carregando).toBe(true);
    expect(e.cede).toBe(0);
    // o Director já consumiu o salto; a textura segue sem chegar
    e = terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(false);
    expect(e.cede).toBe(0);
    await flush();
    // a textura chega SEM salto no quadro: o guardado estala a presença
    e = terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(true);
    expect(e.cede).toBe(e.alvoDeCessao);
    expect(e.cede).toBe(1);
    expect(e.emRampa).toBe(false);
    e = terra.atualizar(quadro(perto));
    expect(e.emRampa).toBe(false);
    terra.dispose();
    // CONTROLE: a mesma chegada sem salto antes anda pela rampa
    const controle = terraDeTeste().terra;
    controle.atualizar(quadro(perto));
    await flush();
    e = controle.atualizar(quadro(perto));
    expect(e.cede).toBeGreaterThan(0);
    expect(e.cede).toBeLessThan(e.alvoDeCessao ?? 0);
    controle.dispose();
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
  it('PINO 93/104: a superfície da Terra traduz, e as cascas seguem fora', async () => {
    const { terra } = terraDeTeste();
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto));
    await flush();
    terra.atualizar(quadro(perto));
    const [sup, ...cascas] = terra.group.children.map(
      (m) => (m as THREE.Mesh).material as THREE.ShaderMaterial
    );
    expect(sup!.uniforms.uTraduzDaTela).toBeUndefined();
    expect(sup!.uniforms.uLanternaDepois).toBeUndefined();
    expect(sup!.uniforms.uLanternaLeitura.value).toBe(LANTERNA_DE_LEITURA);
    expect(sup!.uniforms.uTerminadorS.value).toBeGreaterThan(0);
    for (const c of cascas) expect(c.uniforms.uTerminadorS).toBeUndefined();
    terra.atualizar(quadro(perto, { politica: 'real' }));
    expect(Object.is(sup!.uniforms.uLanternaLeitura.value, 0)).toBe(true);
    expect(Object.is(sup!.uniforms.uTerminadorS.value, 0)).toBe(true);
    terra.atualizar(quadro(perto));
    expect(sup!.uniforms.uTerminadorS.value).toBeGreaterThan(0);
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

describe('6b. a cessão pela régua do disco — a lei e as cicatrizes', () => {
  it('fora de quadro a cessão é 0 EXATO — é o que segura as vistas profundas', () => {
    expect(cessaoAlvo(false, 500, 1)).toBe(0);
    expect(Object.is(cessaoAlvo(false, Number.NaN, Number.NaN), 0)).toBe(true);
  });

  it('em quadro é a régua do disco, com o DPR — uma lei, quatro corpos', () => {
    for (const pr of [1, 2, 3]) {
      for (const d of [2, 4, 6, 9, 12, 20, 40]) {
        expect(cessaoAlvo(true, d, pr), `${d}@${pr}`).toBe(cessaoPorDisco(d, pr));
      }
    }
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
      for (const pr of [1, 2, 3]) {
        // presença assentada em 1 — o pior caso da soma
        cede = cessaoAlvo(emQuadro, mesh, pr);
        const presenca = (1 - cede) + (emQuadro ? 1 : 0);
        expect(presenca, `raios=${raios.toFixed(0)} pr=${pr}`).toBeGreaterThan(0);
        // e a cessão só existe COM mesh em quadro
        if (!emQuadro) expect(cede).toBe(0);
      }
    }
    // a descida terminou com o globo cedido e o gate armado
    expect(armado).toBe(true);
    expect(cede).toBe(1);
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

describe('6c2. trocar de qualidade não tira o globo da tela (item 59)', () => {
  /** Terra com o tier NA MÃO do teste e cada textura marcada pela url —
   *  é o `name` que diz, do lado de fora, quais pixels estão na tela. */
  function terraComTierVivo(inicial: 'cinema' | 'alta' | 'performance') {
    let tier = inicial;
    const urls: string[] = [];
    const descartadas: string[] = [];
    const terra = new TerraResolvida({
      tier: () => tier,
      maxTextureSize: 16384,
      base: '',
      webp: true,
      buscarManifest: async () => MANIFEST,
      carregarTextura: async (url) => {
        urls.push(url);
        const t = new THREE.Texture();
        t.name = url;
        t.addEventListener('dispose', () => descartadas.push(url));
        return t;
      },
    });
    const mapaNaTela = () => {
      const mesh = terra.group.children[0] as THREE.Mesh;
      const mat = mesh.material as THREE.ShaderMaterial;
      return (mat.uniforms.uMapaDia.value as THREE.Texture | null)?.name ?? null;
    };
    return {
      terra,
      urls,
      descartadas,
      mapaNaTela,
      escolher: (t: typeof inicial) => {
        tier = t;
      },
    };
  }

  /** a variante que o manifest REAL dá para o `map` da Terra num tier. */
  const mapaEm = (tier: 'cinema' | 'alta' | 'performance') =>
    escolherVariante(MANIFEST.entradas, 'earth', 'map', alvoDePixels(tier, 'map', 16384), true)!
      .arquivo;

  it('alta → cinema em close-up: o globo fica, e a textura nova entra por trás', async () => {
    const b = terraComTierVivo('alta');
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4; // a Terra dominando a tela
    b.terra.atualizar(quadro(perto));
    await flush();
    let e = b.terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(true);
    expect(b.mapaNaTela()).toBe(mapaEm('alta'));
    const pedidosDeAlta = b.urls.length;

    // o visitante escolhe Cinema. Os ticks abaixo são SÍNCRONOS: nenhum
    // microtask roda entre eles, então o lote novo não chegou em NENHUM
    // — é exatamente a janela em que a Terra "virava ponto e voltava".
    b.escolher('cinema');
    for (let i = 0; i < 20; i++) {
      e = b.terra.atualizar(quadro(perto));
      expect(e.emQuadro, `tick ${i}: o globo saiu da tela`).toBe(true);
      expect(b.terra.group.visible, `tick ${i}: o grupo apagou`).toBe(true);
      expect(b.mapaNaTela(), `tick ${i}: pixels sumiram`).toBe(mapaEm('alta'));
      // e a mudança já pedida se declara: o `captura` do Director não
      // fotografa a corrida
      expect(e.carregando).toBe(true);
    }

    // o lote inteiro chega: a troca é de um quadro só
    await flush();
    e = b.terra.atualizar(quadro(perto));
    expect(e.emQuadro).toBe(true);
    expect(e.carregando).toBe(false);
    expect(b.mapaNaTela()).toBe(mapaEm('cinema'));
    // os CINCO canais vieram no tier novo, e os cinco velhos voltaram
    expect(b.urls.length - pedidosDeAlta).toBe(CANAIS_DA_TERRA.length);
    expect(b.descartadas).toHaveLength(CANAIS_DA_TERRA.length);
    b.terra.dispose();
  });

  it('e o caminho de volta: cinema → performance, sem véu nenhum', async () => {
    const b = terraComTierVivo('cinema');
    const perto = centroPc(JD);
    perto.z += RAIO_EQ_TERRA_PC * 4;
    b.terra.atualizar(quadro(perto));
    await flush();
    expect(b.terra.atualizar(quadro(perto)).emQuadro).toBe(true);
    b.escolher('performance');
    for (let i = 0; i < 20; i++) {
      expect(b.terra.atualizar(quadro(perto)).emQuadro).toBe(true);
    }
    await flush();
    expect(b.terra.atualizar(quadro(perto)).emQuadro).toBe(true);
    expect(b.mapaNaTela()).toBe(mapaEm('performance'));
    b.terra.dispose();
  });

  it('de LONGE, com o gate frio, a troca de tier não faz um fetch', async () => {
    // a carga preguiçosa continua sendo o contrato: quem nunca carregou
    // não tem o que trocar, e as vistas oficiais não fazem fetch
    const b = terraComTierVivo('alta');
    b.terra.atualizar(quadro(new THREE.Vector3(0, 0, 0.001)));
    b.escolher('cinema');
    for (let i = 0; i < 5; i++) b.terra.atualizar(quadro(new THREE.Vector3(0, 0, 0.001)));
    await flush();
    expect(b.urls).toEqual([]);
    b.terra.dispose();
  });
});

describe('6d. o pino do filme manda sobre a efeméride (item 108, 30/08)', () => {
  it('com a fonte VIVA na data errada, a Terra fica onde a coda a espera', async () => {
    // O DEFEITO: o pino (`TERRA_PC`, as 16:00 do dia do filme) só valia
    // SEM fonte (`!q.fonte`), e por isso não salvava o quadro quando um
    // `?jd=` — que o PRÓPRIO app grava na barra de endereços a cada
    // gesto que espelha a URL — punha a efeméride viva noutra data
    // dentro do filme. Medido em 30/08: com `?jd=` de +1 dia a Terra
    // saía do quadro em t=187 e estava a 263 milhões de km na coda, em
    // vez de 34.868. Recolocar o `!q.fonte` reprova aqui.
    const { terra } = terraDeTeste();
    const pin = centroPc(JD);
    const perto = pin.clone();
    perto.z += RAIO_EQ_TERRA_PC * 4;
    terra.atualizar(quadro(perto, { focoDoAtlas: true }));
    await flush();
    // o CONTROLE: um dia de relógio move a Terra muito além do próprio
    // enquadramento — é essa magnitude que o pino tem de cancelar
    const doDiaSeguinte = terra.atualizar(quadro(perto, { jdTdb: JD + 1 })).centroPc.clone();
    expect(doDiaSeguinte.distanceTo(pin)).toBeGreaterThan(RAIO_EQ_TERRA_PC * 4);
    // ...e com o pino, no MESMO relógio errado (outro jd para o cache
    // por (jd, fonte) recomputar), o globo está no lugar medido
    const comPino = terra.atualizar(quadro(perto, { jdTdb: JD + 2, centroPinadoPc: pin }));
    expect(comPino.centroPc.distanceTo(pin)).toBe(0);
    // e o globo está mesmo LÁ, ao alcance da câmera do pouso — não é um
    // centro escrito num corpo que o resto do tick ignorou
    expect(comPino.diametroPx).toBeGreaterThan(0);
    terra.dispose();
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

  it('o chão para o raio do ar: amostra dentro da Terra sólida encerra o laço (06/10, quadros pretos da Lua)', () => {
    const guarda = /float altura = max\(length\(ponto\), 1\.0e-6\);[^]*?if \(altura < ([\d.]+)\) break;\s*float prof = exp/.exec(
      ATMOSFERA_FRAG
    );
    expect(guarda).not.toBeNull();
    const limiar = Number(guarda![1]);
    // abaixo do raio POLAR: o raio que só raspa o elipsoide segue bit a bit
    const [a, , c] = BODY_AXES.earth;
    expect(limiar).toBeLessThan(c / a);
    // e a densidade da amostra mais funda que ainda soma fica pequena —
    // sem a guarda, exp(160·(1 − h)) estoura o meio-float (65504) dentro do globo
    const escalaSobreProf = 1 / (RAZAO_CASCA_ATMOSFERA - 1) / ATMOSFERA.scaleDepth;
    expect(Math.exp(escalaSobreProf * (1 - limiar))).toBeLessThan(10);
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
    // a casca das nuvens e a de ATMOSFERA (item 95) recebem o MESMO
    // chunk: três interpolações no texto-fonte, nenhuma cópia redigitada
    expect(FONTE_SHADERS.match(/\$\{GLSL_SOMBRA_ECLIPSE\}/g)).toHaveLength(3);
  });

  it('o AR no eclipse (item 95): o material OFERECE exatamente o que o shader montado DECLARA', () => {
    // O DEFEITO DO ITEM 95 ERA ESTA FRONTEIRA. `ATMOSFERA_FRAG` não
    // montava o chunk e o material não oferecia os uniformes — os dois
    // lados calados, e nada no projeto sabia perguntar. Este caso EXECUTA
    // a pergunta: o conjunto que `uniformsDaAtmosfera()` devolve tem de
    // ser, nome a nome, o que o shader MONTADO declara. Tirar o chunk do
    // shader ou os uniformes do material quebra a igualdade.
    const declarados = new Set(
      [...ATMOSFERA_FRAG.matchAll(/^uniform\s+\w+\s+(\w+)\s*;/gm)].map((m) => m[1]!)
    );
    const oferecidos = new Set(Object.keys(uniformsDaAtmosfera()));
    expect([...oferecidos].sort()).toEqual([...declarados].sort());
    // e a família do eclipse está nos DOIS lados — o que o defeito negava
    for (const nome of Object.keys(uniformsDeEclipseNeutros())) {
      expect(declarados.has(nome)).toBe(true);
      expect(oferecidos.has(nome)).toBe(true);
    }
    // a sombra entra na FONTE do espalhamento, amostra a amostra, e com
    // o piso do crepúsculo — não como um fator único no fim do laço
    expect(ATMOSFERA_FRAG).toContain(
      'vec3 sombraDoAr = fatorDeEclipseNoAr(ponto, ponto / altura, angLuz);'
    );
    expect(ATMOSFERA_FRAG).toContain(
      'acumulada += (atenua * sombraDoAr) * (prof * passoEscalado);'
    );
  });

  it('a sombra do PRÓPRIO globo no ar: amostra com o Sol atrás do planeta não espalha (06/10)', () => {
    // o teste RODA o texto do shader: a condição sai de `solAlcancaAmostra`
    // tal qual (a expressão GLSL é JS válido) — não há gêmea em TS
    const corpo = /bool solAlcancaAmostra\(float angLuz, float altura\) \{\s*return ([^;]+);/.exec(
      ATMOSFERA_FRAG
    );
    expect(corpo).not.toBeNull();
    const alcanca = new Function('angLuz', 'altura', `return ${corpo![1]};`) as (
      angLuz: number,
      altura: number
    ) => boolean;
    const h = RAZAO_CASCA_ATMOSFERA;
    expect(alcanca(1, 1)).toBe(true);
    expect(alcanca(0, h)).toBe(true);
    expect(alcanca(-1, h)).toBe(false);
    // no topo da casca o horizonte desce acos(1/h): acima da curvatura é
    // crepúsculo e soma; abaixo dela o raio até o Sol cruza o globo
    const linha = -Math.sqrt(1 - 1 / (h * h));
    expect(alcanca(linha + 1e-6, h)).toBe(true);
    expect(alcanca(linha - 1e-6, h)).toBe(false);
    // no chão a linha de sombra é o próprio terminador
    expect(alcanca(-1e-6, 1)).toBe(false);
    // e o laço só soma a parcela de quem vê o Sol — a mesma parcela de antes
    expect(ATMOSFERA_FRAG).toMatch(
      /if \(solAlcancaAmostra\(angLuz, altura\)\) \{\s*acumulada \+= \(atenua \* sombraDoAr\) \* \(prof \* passoEscalado\);/
    );
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

// ------------------------------------------------------------
// 9. A VARIANTE `profundidade` (rodada das nuvens, 07/10)
// ------------------------------------------------------------

/** diferença circular em u (voltas), em (−0,5, 0,5] */
function difU(a: number, b: number): number {
  return ((((a - b) % 1) + 1.5) % 1) - 0.5;
}

/** u de uma direção pela convenção da SphereGeometry (pinada no bloco 2) */
function uDaDirecao(x: number, z: number): number {
  return Math.atan2(z, -x) / (2 * Math.PI);
}

async function terraNaTela(variante: 'classica' | 'profundidade', jd = JD) {
  const { terra, chamadas } = terraDeTeste();
  terra.definirVariante(variante);
  const perto = centroPc(jd);
  perto.z += RAIO_EQ_TERRA_PC * 4;
  const q = quadro(perto, { jdTdb: jd });
  terra.atualizar(q);
  await flush();
  expect(terra.atualizar(q).emQuadro).toBe(true);
  const [sup, nuv] = terra.group.children as THREE.Mesh[];
  return { terra, chamadas, sup: sup!, nuv: nuv!, q };
}

describe('9. a variante profundidade (rodada das nuvens, 07/10)', () => {
  /**
   * O SINAL DA DERIVA, no estilo do oráculo do bloco 1: o ponto do chão
   * que está SOB um texel de nuvem tem de amostrar ESSE texel. O juiz
   * leva o ponto do chão (uv da superfície) ao mundo pela matriz da
   * superfície e de volta à esfera da casca pela inversa da matriz das
   * nuvens — o transform COMPLETO, com o giro da deriva —, e o u da casca
   * tem de ser o `vUv.x + uDeslocU` que o shader usa. O controle negativo
   * (o sinal trocado) tem de reprovar.
   */
  it.each(JDS)('o chão sob um texel de nuvem amostra ESSE texel — jd %f', async (jd) => {
    const { terra, sup, nuv } = await terraNaTela('profundidade', jd);
    const desloc = (sup.material as THREE.ShaderMaterial).uniforms.uDeslocU.value as number;
    expect(desloc).toBeGreaterThanOrEqual(0);
    expect(desloc).toBeLessThan(1);
    const inversa = nuv.matrix.clone().invert();
    for (const [u, v] of [[0.1, 0.5], [0.37, 0.8], [0.9, 0.2]] as const) {
      const d = direcaoLocalDeLonLat((u - 0.5) * 360, (v - 0.5) * 180);
      // a fórmula de u do juiz é a da convenção pinada
      expect(difU(uDaDirecao(d[0], d[2]), u)).toBeCloseTo(0, 10);
      const naCasca = new THREE.Vector3(d[0], d[1], d[2])
        .applyMatrix4(sup.matrix)
        .applyMatrix4(inversa);
      const uNuvem = uDaDirecao(naCasca.x, naCasca.z);
      expect(difU(u + desloc, uNuvem)).toBeCloseTo(0, 8);
      // v não anda com a deriva (o giro é em torno do polo)
      const latNuvem = Math.atan2(naCasca.y, Math.hypot(naCasca.x, naCasca.z));
      expect(0.5 + latNuvem / Math.PI).toBeCloseTo(v, 8);
      // controle negativo: o sinal trocado erra o texel
      expect(Math.abs(difU(u - desloc, uNuvem))).toBeGreaterThan(1e-3);
    }
    terra.dispose();
  });

  /**
   * O CONTRATO DO PAR NOVO, no molde do juiz do ar (bloco 8): cada
   * material oferece exatamente o que o shader MONTADO declara; a
   * superfície funda lê o MESMO uniform (e portanto a mesma textura) das
   * nuvens, e a descarga o solta junto.
   */
  it('o par profundidade OFERECE o que os shaders montados DECLARAM, e lê a MESMA textura de nuvens', async () => {
    const { terra, sup, nuv } = await terraNaTela('profundidade');
    const mS = sup.material as THREE.ShaderMaterial;
    const mN = nuv.material as THREE.ShaderMaterial;
    const mA = (terra.group.children[2] as THREE.Mesh).material as THREE.ShaderMaterial;
    expect(mS.fragmentShader).toBe(TERRA_PROFUNDIDADE_FRAG);
    expect(mN.fragmentShader).toBe(NUVENS_PROFUNDIDADE_FRAG);
    expect(mA.fragmentShader).toBe(ATMOSFERA_PROFUNDIDADE_FRAG);
    for (const m of [mS, mN, mA]) {
      const declarados = [...m.fragmentShader.matchAll(/^uniform\s+\w+\s+(\w+)\s*;/gm)].map(
        (x) => x[1]!
      );
      expect(Object.keys(m.uniforms).sort()).toEqual([...new Set(declarados)].sort());
    }
    expect(mS.uniforms.uMapaNuvens).toBe(mN.uniforms.uMapaNuvens);
    expect(mS.uniforms.uMapaNuvens.value).toBeInstanceOf(THREE.Texture);
    // a descarga (longe, passada a carência) solta a textura nas três
    const longe = new THREE.Vector3(0, 0, 40);
    terra.atualizar(quadro(longe));
    terra.atualizar(quadro(longe, { tS: 15.1 }));
    expect(mS.uniforms.uMapaNuvens.value).toBeNull();
    expect(mN.uniforms.uMapaNuvens.value).toBeNull();
    terra.dispose();
  });

  it('trocar de variante ao vivo troca SÓ os materiais — sem fetch, a composição de sempre', async () => {
    const { terra, chamadas, sup, nuv, q } = await terraNaTela('classica');
    const atm = terra.group.children[2] as THREE.Mesh;
    const arClassico = atm.material as THREE.ShaderMaterial;
    const classicos = [sup.material, nuv.material];
    expect((classicos[0] as THREE.ShaderMaterial).fragmentShader).toBe(TERRA_FRAG);
    expect((classicos[1] as THREE.ShaderMaterial).fragmentShader).toBe(NUVENS_FRAG);
    const antes = chamadas.length;
    terra.definirVariante('profundidade');
    expect(terra.varianteViva).toBe('profundidade');
    const mS = sup.material as THREE.ShaderMaterial;
    const mN = nuv.material as THREE.ShaderMaterial;
    expect(mS.fragmentShader).toBe(TERRA_PROFUNDIDADE_FRAG);
    expect(mN.fragmentShader).toBe(NUVENS_PROFUNDIDADE_FRAG);
    expect([mS.depthWrite, mS.transparent, mN.depthWrite, mN.transparent]).toEqual([
      true,
      false,
      false,
      true,
    ]);
    expect(nuv.renderOrder).toBe(8);
    // o ar do limbo troca de shader e de ordem (antes das nuvens: a nuvem
    // na borda tapa o ar de trás); a composição e os objetos de uniform
    // são os do O'Neil
    expect(atm.renderOrder).toBe(7.5);
    const mA = atm.material as THREE.ShaderMaterial;
    expect(mA.fragmentShader).toBe(ATMOSFERA_PROFUNDIDADE_FRAG);
    expect([mA.blending, mA.side, mA.depthWrite, mA.depthTest, mA.transparent]).toEqual([
      arClassico.blending,
      arClassico.side,
      arClassico.depthWrite,
      arClassico.depthTest,
      arClassico.transparent,
    ]);
    for (const nome of Object.keys(arClassico.uniforms)) {
      expect(mA.uniforms[nome]).toBe(arClassico.uniforms[nome]);
    }
    // o tick escreve nos objetos compartilhados: o ganho chega ao par novo
    terra.atualizar(quadro(q.camPosPc, { politica: 'real' }));
    expect(mN.uniforms.uLuzGanho.value).toBe(
      (classicos[1] as THREE.ShaderMaterial).uniforms.uLuzGanho.value
    );
    expect((mN.uniforms.uCamNuvens.value as THREE.Vector3).length()).toBeCloseTo(4, 6);
    await flush();
    expect(chamadas).toHaveLength(antes);
    terra.definirVariante('classica');
    expect([sup.material, nuv.material]).toEqual(classicos);
    expect(atm.material).toBe(arClassico);
    expect(sup.material).toBe(classicos[0]);
    terra.dispose();
  });

  it('o 8k das nuvens e da normal é SÓ da profundidade, SÓ em cinema — a classica segue no 4k', async () => {
    const { terra, chamadas } = await terraNaTela('profundidade');
    const texs = chamadas.filter((c) => c.startsWith('tex:'));
    expect(texs).toContain('tex:textures/atlas/earth/clouds.webp');
    expect(texs).not.toContain('tex:textures/atlas/earth/clouds_4096.jpg');
    // a normal (item 232): o relevo medido de 8192 sobe junto
    expect(texs).toContain('tex:textures/atlas/earth/normal.webp');
    expect(texs).not.toContain('tex:textures/atlas/earth/normal_4096.webp');
    // o apoio que não é assunto continua na dose de VRAM
    expect(texs).toContain('tex:textures/atlas/earth/night_4096.webp');
    terra.dispose();
    const classica = await terraNaTela('classica');
    const texsClassica = classica.chamadas.filter((c) => c.startsWith('tex:'));
    expect(texsClassica).toContain('tex:textures/atlas/earth/normal_4096.webp');
    expect(texsClassica).not.toContain('tex:textures/atlas/earth/normal.webp');
    classica.terra.dispose();
    expect(alvoDePixels('cinema', 'clouds', 16384, true)).toBe(8192);
    expect(alvoDePixels('cinema', 'clouds', 4096, true)).toBe(4096);
    expect(alvoDePixels('alta', 'clouds', 16384, true)).toBe(2048);
    expect(alvoDePixels('performance', 'clouds', 16384, true)).toBe(1024);
    expect(alvoDePixels('cinema', 'clouds', 16384)).toBe(ALVO_DE_APOIO_CINEMA);
  });

  it('os mapas de horizonte (a sombra das montanhas) são SÓ da carga profundidade', async () => {
    const pedidosDeHorizonte = (chamadas: string[]) => chamadas.filter((c) => c.includes('/horizon'));
    // a classica não os pede; a troca ao vivo desenha sem a sombra (portão fechado)
    const viva = await terraNaTela('classica');
    expect(pedidosDeHorizonte(viva.chamadas)).toEqual([]);
    viva.terra.definirVariante('profundidade');
    const uViva = (viva.sup.material as THREE.ShaderMaterial).uniforms;
    expect([uViva.uHorizonte.value, uViva.uMapaHorizonte.value, uViva.uMapaHorizonte2.value]).toEqual([
      0,
      null,
      null,
    ]);
    viva.terra.dispose();
    // a profundidade os pede e liga cada um no seu uniform
    const { terra, chamadas, sup } = await terraNaTela('profundidade');
    expect(pedidosDeHorizonte(chamadas)).toEqual([
      'tex:textures/atlas/earth/horizon.webp',
      'tex:textures/atlas/earth/horizon2.webp',
    ]);
    const u = (sup.material as THREE.ShaderMaterial).uniforms;
    expect(u.uHorizonte.value).toBe(1);
    expect((u.uMapaHorizonte.value as THREE.Texture).name).toBe('textures/atlas/earth/horizon.webp');
    expect((u.uMapaHorizonte2.value as THREE.Texture).name).toBe('textures/atlas/earth/horizon2.webp');
    // a descarga solta os dois e fecha o portão
    const longe = new THREE.Vector3(0, 0, 40);
    terra.atualizar(quadro(longe));
    terra.atualizar(quadro(longe, { tS: 15.1 }));
    expect([u.uHorizonte.value, u.uMapaHorizonte.value, u.uMapaHorizonte2.value]).toEqual([0, null, null]);
    terra.dispose();
  });

  /**
   * O RELEVO REALÇADO (item 232): a troca é SÓ o fator do uniform da
   * superfície funda — o mesmo material, o mesmo programa, nenhum fetch —,
   * e só a `profundidade` define o realce: na clássica o preprocessador o
   * tira, e ela não tem o uniform.
   */
  it('o relevo realçado é o fator do uniform da superfície funda: 3 no realcado, 1 no real, ao vivo', async () => {
    const { terra, chamadas, sup } = await terraNaTela('profundidade');
    const mS = sup.material as THREE.ShaderMaterial;
    const versao = mS.version;
    const antes = chamadas.length;
    expect(mS.uniforms.uRealceDoRelevo.value).toBe(1);
    terra.definirRelevo('realcado');
    expect(FATOR_DO_RELEVO_REALCADO).toBe(3);
    expect(mS.uniforms.uRealceDoRelevo.value).toBe(FATOR_DO_RELEVO_REALCADO);
    terra.definirRelevo('real');
    expect(mS.uniforms.uRealceDoRelevo.value).toBe(1);
    expect([sup.material, mS.version, mS.fragmentShader]).toEqual([mS, versao, TERRA_PROFUNDIDADE_FRAG]);
    await flush();
    expect(chamadas).toHaveLength(antes);
    expect(TERRA_PROFUNDIDADE_FRAG).toContain('#define REALCE_DO_RELEVO');
    expect(TERRA_FRAG).not.toContain('#define REALCE_DO_RELEVO');
    terra.definirVariante('classica');
    expect((sup.material as THREE.ShaderMaterial).uniforms.uRealceDoRelevo).toBeUndefined();
    terra.dispose();
  });

  /**
   * A SOMBRA PARCIAL DAS MONTANHAS (item 232): a lei gama da célula, com as
   * expressões do shader montado tais quais, rodando em JS. É sombra SÓ do
   * relevo: abaixo da rampa do plano é 1 exato, e acima dela a luz só
   * cresce com o Sol.
   */
  it('a sombra das montanhas é a fração da célula: chão plano aceso, crescente com o Sol, sem NaN no zero', () => {
    const corpo = /float sombraParcialDoRelevo\(vec3 nGeo, vec2 uv, vec3 L\) \{([^]*?)\n\}/.exec(
      TERRA_PROFUNDIDADE_FRAG
    )![1]!;
    const expr = (re: RegExp) => re.exec(corpo)![1]!;
    const piso = expr(/float mu = max\(senoDoHorizonte\(t, b, uv, L\), ([\d.e-]+)\);/);
    const lei = new Function(
      'senH', 'senElev', 'max', 'exp', 'clamp',
      `const mu = max(senH, ${piso}); const xa = ${expr(/float xa = ([^;]+);/)}; ` +
        `const xb = ${expr(/float xb = ([^;]+);/)}; const tapada = ${expr(/float tapada = ([^;]+);/)}; ` +
        `return ${expr(/return (1\.0 - clamp\([^;]+\));/)};`
    ) as (...a: unknown[]) => number;
    const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);
    const parcial = (senH: number, senElev: number) => lei(senH, senElev, Math.max, Math.exp, clamp);
    // chão plano: no máximo o piso de μ dentro da rampa, nada fora dela
    for (const s of [-0.2, -0.03, -0.01, 0, 0.01, 0.03, 0.1, 1]) expect(parcial(0, s)).toBeGreaterThan(1 - 2e-4);
    // abaixo da rampa do plano o relevo não acrescenta nada; no Sol a 0°, número finito
    for (const mu of [0, 0.01, 0.05, 0.2]) {
      expect(parcial(mu, -0.031)).toBe(1);
      expect(Number.isFinite(parcial(mu, 0))).toBe(true);
    }
    // acima da rampa a fração acesa só cresce com o Sol, em qualquer montanha
    for (const mu of [0.005, 0.02, 0.05, 0.1]) {
      let antes = -Infinity;
      for (let s = 0.03; s <= 1; s += 0.001) {
        const v = parcial(mu, s);
        expect(v).toBeGreaterThanOrEqual(antes - 1e-12);
        antes = v;
      }
      expect(parcial(mu, 1)).toBeGreaterThan(0.999);
    }
    // com o Sol na média do horizonte a célula fica PARCIAL, não acesa nem apagada
    expect(parcial(0.05, 0.05)).toBeGreaterThan(0.2);
    expect(parcial(0.05, 0.05)).toBeLessThan(0.8);
    // e a Terra usa esta lei no lugar do degrau (Hipérion e Pã seguem com ele)
    expect(TERRA_PROFUNDIDADE_FRAG).toContain(
      'float transmissao = nuvens.x * sombraParcialDoRelevo(n, vUv, uDirSolLocal);'
    );
    expect(TERRA_PROFUNDIDADE_FRAG).not.toContain('sombraSoDoRelevo(n,');
  });

  /**
   * A NUVEM QUEBRADA (item 232): o α do texel é a refletância; a fração
   * coberta de nuvem grossa (Rc = 0,633, Bohren com τ = 23) deixa passar
   * o feixe direto D pelos buracos e a difusa F pela base — e, sem
   * absorção, com o Sol a pino D + F = 1 − α.
   */
  it('a nuvem quebrada: céu limpo passa inteiro, a grossa deixa só a difusa, e direto + difusa = 1 − α com o Sol a pino', () => {
    const corpo = /vec2 nuvemQuebrada\(float aq, float ap, float mu0\) \{([^]*?)\n\}/.exec(
      TERRA_PROFUNDIDADE_FRAG
    )![1]!;
    const consts = Object.fromEntries(
      [...TERRA_PROFUNDIDADE_FRAG.matchAll(/const float (REFLETANCIA_DA_NUVEM_GROSSA|UM_MENOS_G2?) = ([\d.]+);/g)].map(
        (m) => [m[1]!, Number(m[2])]
      )
    );
    const js = corpo.replace(/\bfloat /g, 'const ').replace(/return vec2\(([^;]+)\);/, 'return [$1];');
    const lei = new Function('aq', 'ap', 'mu0', 'min', 'max', 'exp', ...Object.keys(consts), js) as (
      ...a: unknown[]
    ) => [number, number];
    const nuvem = (aq: number, ap: number, mu0: number) =>
      lei(aq, ap, mu0, Math.min, Math.max, Math.exp, ...Object.values(consts));
    // os números: g = 0,85 (1 − g e 1 − g²) e o Rc da refletância de Bohren com τ = 23
    expect([consts.UM_MENOS_G, consts.UM_MENOS_G2]).toEqual([0.15, 0.2775]);
    expect((0.15 * 23) / (2 + 0.15 * 23)).toBeCloseTo(consts.REFLETANCIA_DA_NUVEM_GROSSA!, 3);
    // céu limpo: o Sol inteiro no feixe, nenhuma difusa — a luz de hoje
    expect(nuvem(0, 0, 1)).toEqual([1, 0]);
    expect(nuvem(0, 0, 0.055)).toEqual([1, 0]);
    for (const a of [0.1, 0.3, 0.633, 0.8, 0.98]) {
      const [d, f] = nuvem(a, a, 1);
      expect(Math.abs(d + f - (1 - a))).toBeLessThan(0.002);
      expect(d).toBeLessThanOrEqual(1);
      expect(f).toBeGreaterThanOrEqual(0);
    }
    // a nuvem grossa no raio do Sol: o feixe some, e mais com o Sol baixo
    expect(nuvem(0.98, 0, 1)[0]).toBeLessThan(1e-6);
    expect(nuvem(0.633, 0, 0.1)[0]).toBeLessThan(nuvem(0.633, 0, 1)[0]);
    // D passa pela montanha e leva o especular; F entra só na luz
    expect(TERRA_PROFUNDIDADE_FRAG).toContain('    transmissao + nuvens.y,');
    expect(TERRA_PROFUNDIDADE_FRAG).toContain('vec3 direta = albedo * luz + vec3(espec * transmissao) * luzSol;');
  });

  /**
   * O CÉU NA SOMBRA (item 232): o Sol normalizado no zênite vira direto +
   * céu pela Rayleigh do SPCTRAL2; nuvem e montanha barram só o direto, e o
   * céu acende como o chão plano. Com as expressões do shader em JS.
   */
  it('o céu na sombra: o chão plano aceso e limpo fica como hoje, e a sombra recebe o céu azul', () => {
    const tau = /const vec3 TAU_RAYLEIGH = vec3\(([\d.]+), ([\d.]+), ([\d.]+)\);/
      .exec(TERRA_PROFUNDIDADE_FRAG)!
      .slice(1)
      .map(Number);
    const fracaoGlsl = /vec3 fracaoDoCeu\(float cosZenite\) \{([^]*?)\n\}/.exec(TERRA_PROFUNDIDADE_FRAG)![1]!;
    const fracao = new Function(
      'cosZenite', 'tau', 'massaDeArDeChapman', 'RAIO_DO_AR_KM', 'ALTURA_DE_ESCALA_KM', 'clamp', 'exp',
      fracaoGlsl.replace(/\b(float|vec3) /g, 'const ').replace(/\(TAU_RAYLEIGH \+ TAU_AEROSSOL\)/g, 'tau')
    ) as (...a: unknown[]) => number;
    const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);
    const s = (graus: number) =>
      tau.map((t) =>
        fracao(Math.sin((graus * Math.PI) / 180), t, massaDeArDeChapman, RAIO_DO_AR_KM, ALTURA_DE_ESCALA_KM, clamp, Math.exp)
      );
    // os números de capturas/efeitos-timidos/nuvens/medidas-ceu.md: 9/16/32 % a 15°, 4/7/14 % a 40°
    s(15).forEach((v, i) => expect(Math.abs(v - [0.09, 0.16, 0.32][i]!)).toBeLessThan(0.01));
    s(40).forEach((v, i) => expect(Math.abs(v - [0.04, 0.07, 0.14][i]!)).toBeLessThan(0.01));
    const luzGlsl = /vec3 luzDoSolEDoCeu\([^)]*\) \{\s*return ([^;]+);/.exec(TERRA_PROFUNDIDADE_FRAG)![1]!;
    const luz = new Function('escuro', 'aceso', 'plano', 'tDireto', 'vistaDoCeu', 's', `return ${luzGlsl};`) as (
      ...a: number[]
    ) => number;
    // chão plano (a encosta é o plano, a faceta vê o céu inteiro), aceso e limpo: a luz de hoje
    for (const si of [...s(2), ...s(15), ...s(60)]) {
      for (const [escuro, aceso] of [[0, 0.7], [0.05, 0.3], [0.1, 1]] as const) {
        expect(luz(escuro, aceso, aceso, 1, 1, si)).toBeCloseTo(aceso, 12);
      }
    }
    // na sombra (direto barrado) o céu acende o chão, mais no azul; a faceta virada ao chão vê menos céu
    const sombra = s(15).map((si) => luz(0, 0.8, 0.8, 0, 1, si));
    expect(sombra[0]!).toBeGreaterThan(0);
    expect(sombra[2]!).toBeGreaterThan(sombra[1]!);
    expect(sombra[1]!).toBeGreaterThan(sombra[0]!);
    expect(luz(0, 0.8, 0.8, 0, 0.6, s(15)[2]!)).toBeLessThan(sombra[2]!);
    // no shader: o plano pelo terminador geométrico, a vista pela faceta, a fração pelo Sol no chão
    for (const trecho of [
      'luzDoGlobo(vec3(terminadorSuave(ndotlGeo)) * luzSol, lanterna),',
      '0.5 * (1.0 + dot(nRelevo, n)),',
      'fracaoDoCeu(ndotlGeo)',
    ]) {
      expect(TERRA_PROFUNDIDADE_FRAG).toContain(trecho);
    }
  });

  it('a luz do pôr do sol é o ar LIMPO medido, normalizada pelo zênite: vermelho no horizonte, grampeada abaixo dele (08/10)', () => {
    const trecho = /const vec3 TAU_RAYLEIGH[^]*?\nvec3 transmitanciaDoSol\(float alturaKm, float cosZenite\) \{[^}]*\}\n/.exec(
      TERRA_PROFUNDIDADE_FRAG
    )![0];
    expect(NUVENS_PROFUNDIDADE_FRAG).toContain(trecho);
    // as constantes montadas: o Rayleigh de Hansen & Travis / Bucholtz nos três λ, H, o raio, aerossol zero
    const tau = /const vec3 TAU_RAYLEIGH = vec3\(([\d.]+), ([\d.]+), ([\d.]+)\);/.exec(trecho)!.slice(1).map(Number);
    ATMOSFERA.comprimentosDeOnda.forEach((l, i) =>
      expect(tau[i]).toBeCloseTo(0.008569 * l ** -4 * (1 + 0.0113 * l ** -2 + 0.00013 * l ** -4), 5)
    );
    expect(trecho).toContain('const vec3 TAU_AEROSSOL = vec3(0.0); // ar limpo — sem poeira nem fumaça');
    expect(trecho).toContain('const float ALTURA_DE_ESCALA_KM = 8.0;');
    expect(trecho).toContain(`const float RAIO_DO_AR_KM = ${BODY_AXES.earth[0]};`);
    expect(trecho).toContain('float x = (RAIO_DO_AR_KM + alturaKm) / ALTURA_DE_ESCALA_KM;');
    expect(trecho).toContain(
      'float excesso = massaDeArDeChapman(x, clamp(cosZenite, 0.0, 1.0)) - massaDeArDeChapman(x, 1.0);'
    );
    expect(trecho).toContain(
      'return exp(-(TAU_RAYLEIGH + TAU_AEROSSOL) * exp(-alturaKm / ALTURA_DE_ESCALA_KM) * excesso);'
    );
    // a conta do shader roda em JS, com as expressões dele tais quais
    const expr = (re: RegExp) => re.exec(trecho)![1]!;
    const limiar = Number(expr(/if \(y < ([\d.]+)\)/));
    const racional = new Function('y', `const t = ${expr(/float t = ([^;]+);/)}; return ${expr(/\{\s*float t = [^;]+;\s*return ([^;]+);/)};`);
    const assintotica = new Function('y', `const q = ${expr(/float q = ([^;]+);/)}; return ${expr(/float q = [^;]+;\s*return ([^;]+);/)};`);
    const erfcEscalada = (y: number) => (y < limiar ? racional(y) : assintotica(y)) as number;
    const chapman = new Function(
      'x', 'mu', 'sqrt', 'erfcEscalada',
      `return ${expr(/float massaDeArDeChapman\(float x, float mu\) \{\s*return ([^;]+);/)};`
    ) as (x: number, mu: number, sqrt: (v: number) => number, e: (y: number) => number) => number;
    const R = BODY_AXES.earth[0];
    const H = 8;
    const transmitancia = (cosZenite: number) => {
      const mu = Math.min(Math.max(cosZenite, 0), 1);
      const excesso = chapman(R / H, mu, Math.sqrt, erfcEscalada) - chapman(R / H, 1, Math.sqrt, erfcEscalada);
      return tau.map((t) => Math.exp(-t * excesso));
    };
    const T = (chi: number) => transmitancia(Math.cos((chi * Math.PI) / 180));
    // a referência: a massa de ar integrada passo a passo na esfera exponencial
    const massaIntegrada = (chi: number) => {
      const mu = Math.cos((chi * Math.PI) / 180);
      const ds = 0.05;
      let soma = 0;
      for (let s = ds / 2; s < 3000; s += ds) soma += Math.exp(-(Math.sqrt(R * R + s * s + 2 * R * s * mu) - R) / H);
      return (soma * ds) / H;
    };
    const zenite = massaIntegrada(0);
    for (const chi of [0, 60, 84, 90]) {
      const ref = tau.map((t) => Math.exp(-t * (massaIntegrada(chi) - zenite)));
      T(chi).forEach((v, i) => expect(Math.abs(v / ref[i]! - 1)).toBeLessThan(0.01));
    }
    // o meio-dia fica como hoje, o horizonte vermelho fundo, e abaixo dele o grampo
    expect(T(0)).toEqual([1, 1, 1]);
    const horizonte = transmitancia(0);
    expect(horizonte[0]! / horizonte[2]!).toBeGreaterThan(50);
    expect(transmitancia(-0.2)).toEqual(horizonte);
    // a face entra no Sol e só nele; a classica e o ar do limbo ficam sem
    expect(TERRA_PROFUNDIDADE_FRAG).toContain(
      'vec3 luzSol = vec3(uLuzGanho) * sombras * transmitanciaDoSol(0.0, ndotlGeo);'
    );
    expect(NUVENS_PROFUNDIDADE_FRAG).toContain('* transmitanciaDoSol(topoKm, ndotl) * solAcimaDoHorizonte,');
    // a nuvem só vê o Sol acima do horizonte DELA: a 10 km, Sol zero em cos −0,07 e a faixa inteira em 0
    const nuvem = NUVENS_PROFUNDIDADE_FRAG;
    expect(nuvem).toContain(
      'float solAcimaDoHorizonte = linstep(cosDoPorDoSol - DISCO_DO_SOL, cosDoPorDoSol, ndotl);'
    );
    const raioKm = Number(/const float RAIO_KM = ([\d.]+);/.exec(nuvem)![1]);
    const disco = Number(/const float DISCO_DO_SOL = ([\d.]+);/.exec(nuvem)![1]);
    const cosDoPorDoSol = new Function(
      'topoKm', 'RAIO_KM', 'sqrt',
      `return ${/float cosDoPorDoSol = ([^;]+);/.exec(nuvem)![1]};`
    ) as (h: number, r: number, sqrt: (v: number) => number) => number;
    const solDaNuvem = (topoKm: number, cosZenite: number) => {
      const c0 = cosDoPorDoSol(topoKm, raioKm, Math.sqrt);
      return Math.min(Math.max((cosZenite - (c0 - disco)) / disco, 0), 1);
    };
    expect(cosDoPorDoSol(10, raioKm, Math.sqrt)).toBeCloseTo(-0.056, 3);
    expect(solDaNuvem(10, -0.07)).toBe(0);
    expect(solDaNuvem(10, 0)).toBe(1);
    for (const s of [TERRA_FRAG, NUVENS_FRAG, ATMOSFERA_FRAG]) expect(s).not.toContain('transmitanciaDoSol');
  });

  it('o limbo do ar medido (08/10): com o Sol logo abaixo do horizonte, a camada baixa sai vermelha e a alta azul', () => {
    const ar = ATMOSFERA_PROFUNDIDADE_FRAG;
    // os MESMOS números da luz do pôr do sol: o trecho inteiro, tal qual
    const trecho = /const vec3 TAU_RAYLEIGH[^]*?\nvec3 transmitanciaDoSol\(float alturaKm, float cosZenite\) \{[^}]*\}\n/.exec(
      TERRA_PROFUNDIDADE_FRAG
    )![0];
    expect(ar).toContain(trecho);
    // o caminho do Sol e o teste do globo rodam em JS com o texto do shader
    const funcao = (assinatura: string) =>
      new Function(
        'alturaKm', 'cosZenite', 'exp', 'sqrt', 'max', 'min', 'massaDeArDeChapman',
        'RAIO_DO_AR_KM', 'ALTURA_DE_ESCALA_KM',
        new RegExp(`${assinatura} \\{([^]*?)\\n\\}`).exec(ar)![1]!.replace(/\bfloat\s+/g, 'let ')
      ) as (...a: unknown[]) => number | boolean;
    const comoNoShader = (f: (...a: unknown[]) => number | boolean) => (h: number, mu: number) =>
      f(h, mu, Math.exp, Math.sqrt, Math.max, Math.min, massaDeArDeChapman, RAIO_DO_AR_KM, ALTURA_DE_ESCALA_KM);
    const caminho = comoNoShader(funcao('float caminhoDoSol\\(float alturaKm, float cosZenite\\)')) as (h: number, mu: number) => number;
    const alcanca = comoNoShader(funcao('bool solAlcancaOAr\\(float alturaKm, float cosZenite\\)')) as (h: number, mu: number) => boolean;
    const R = RAIO_DO_AR_KM;
    const H = ALTURA_DE_ESCALA_KM;
    const cos = (graus: number) => Math.cos((graus * Math.PI) / 180);
    // a referência: a massa de ar integrada passo a passo ao longo do raio do Sol
    const integrada = (h: number, chi: number) => {
      const [sx, sy] = [Math.sin((chi * Math.PI) / 180), cos(chi)];
      const ds = 0.05;
      let soma = 0;
      for (let t = ds / 2; t < 4000; t += ds) soma += Math.exp(-(Math.hypot(t * sx, R + h + t * sy) - R) / H);
      return (soma * ds) / H;
    };
    // a identidade de Chapman abaixo do horizonte (e o ramo de cima) contra a integral
    for (const [h, chi] of [[5, 92], [30, 92], [20, 94], [10, 60]] as const) {
      expect(alcanca(h, cos(chi))).toBe(true);
      expect(Math.abs(caminho(h, cos(chi)) / integrada(h, chi) - 1)).toBeLessThan(0.01);
    }
    // o raio que bate no globo não leva luz
    expect(alcanca(5, cos(95))).toBe(false);
    // o espalhamento de cada amostra, β(λ, h)·T_sol, a χ = 92°: vermelho embaixo, azul em cima
    const tau = COMPRIMENTOS_DE_ONDA_UM.map(tauRayleighAoNivelDoMar);
    const cor = (h: number) => tau.map((t) => t * Math.exp(-h / H) * Math.exp(-t * caminho(h, cos(92))));
    const [r5, , b5] = cor(5);
    const [r30, , b30] = cor(30);
    expect(r5! / b5!).toBeGreaterThan(5);
    expect(r30! / b30!).toBeLessThan(0.6);
    // a fonte de cada amostra: o simples (P/4·T_sol, só com o Sol na
    // amostra) mais o múltiplo da tabela, os dois pelo eclipse, somados
    // pela forma que conserva energia
    expect(ar).toContain('vec3 sombraDoAr = fatorDeEclipseNoAr(ponto, normSeguro(ponto), cosZenite);');
    expect(ar).toContain('float quartoDaFase = 0.1875 * (1.0 + cosFase * cosFase);');
    expect(ar).toContain(
      'if (solAlcancaOAr(hKm, cosZenite)) fonte += quartoDaFase * exp(-TAU_RAYLEIGH * caminhoDoSol(hKm, cosZenite));'
    );
    expect(ar).toContain('luz += fonte * sombraDoAr * vista * (1.0 - atravessa);');
    // nas unidades do chão (π·L/E), sem ganho inventado
    expect(ar).toContain('gl_FragColor = vec4(ar * uLuzGanho, 1.0);');
    expect(ar).not.toMatch(/\b(E_SUN|KR|KM)\b/);
    // o MESMO trecho é o véu do chão e das nuvens (a perspectiva aérea):
    // o chão chega atravessado e o ar acende por cima, com o ganho do Sol
    const marcha = /\nvec3 arNoCaminho\([^]*?\n\}\n/.exec(ar)![0];
    for (const s of [TERRA_PROFUNDIDADE_FRAG, NUVENS_PROFUNDIDADE_FRAG]) expect(s).toContain(marcha);
    expect(TERRA_PROFUNDIDADE_FRAG).toContain(
      'gl_FragColor = vec4((direta + luzes) * vista + veu * uLuzGanho, 1.0);'
    );
    expect(NUVENS_PROFUNDIDADE_FRAG).toContain(
      'gl_FragColor = vec4(dia * uLuzGanho * sombra * vista + veu * uLuzGanho, alfaVista);'
    );
  });

  /**
   * O ESPALHAMENTO MÚLTIPLO (Hillaire 2020), contra o limite do ar
   * CONSERVATIVO. Sobre chão preto, toda luz que o ar tira do feixe do Sol
   * numa coluna sai pelo topo ou cai no chão, depois de quantas voltas
   * for: no ponto subsolar, F↑(topo) + F↓(chão, difusa) = μ₀·(1 − e^(−τ/μ₀)),
   * com igualdade só se nada vazar de lado — na esfera os vizinhos têm o
   * Sol mais baixo, então o que chega de lado é menos do que o que sai, e a
   * soma fica ABAIXO da perda. Os dois fluxos saem do simples (com a fase
   * de Rayleigh) mais o múltiplo da tabela, marchados com 400 passos e
   * integrados no hemisfério; o juiz é a desigualdade, e o piso de 90%
   * mostra que a série não ficou curta.
   */
  it('o espalhamento múltiplo: finito, ≥ 0, e o ar não devolve mais luz do que tira do Sol', () => {
    const preto = tabelaDoEspalhamentoMultiplo(0);
    const claro = tabelaDoEspalhamentoMultiplo();
    for (let o = 0; o < preto.length; o++) {
      expect(Number.isFinite(preto[o]!) && Number.isFinite(claro[o]!)).toBe(true);
      expect(preto[o]!).toBeGreaterThanOrEqual(0);
      // o chão claro só acrescenta; e a série converge (f < 1)
      if (o % 4 !== 3) expect(claro[o]!).toBeGreaterThanOrEqual(preto[o]! - 1e-7);
      else expect(preto[o]!).toBeLessThan(1);
    }
    const { colunas, linhas, topoKm } = ESPALHAMENTO_MULTIPLO;
    // o filtro linear da GPU, com os centros dos texels nas pontas da grade
    const psi = (tab: Float32Array, h: number, mu: number, c: number) => {
      const x = (0.5 * Math.min(Math.max(mu, -1), 1) + 0.5) * (colunas - 1);
      const y = Math.sqrt(Math.min(Math.max(h / topoKm, 0), 1)) * (linhas - 1);
      const [i, j] = [Math.min(Math.floor(x), colunas - 2), Math.min(Math.floor(y), linhas - 2)];
      const [fx, fy] = [x - i, y - j];
      const v = (a: number, b: number) => tab[4 * ((j + b) * colunas + i + a) + c]!;
      return (1 - fy) * ((1 - fx) * v(0, 0) + fx * v(1, 0)) + fy * ((1 - fx) * v(0, 1) + fx * v(1, 1));
    };
    const R = RAIO_DO_AR_KM;
    const H = ALTURA_DE_ESCALA_KM;
    const tau = COMPRIMENTOS_DE_ONDA_UM.map(tauRayleighAoNivelDoMar);
    // a luz (π·L/E) que chega a `p0` vinda da direção −d: o ar ao longo de p0 + t·d
    const luzDoRaio = (p0: number[], d: number[], c: number) => {
      const b = p0[0]! * d[0]! + p0[1]! * d[1]! + p0[2]! * d[2]!;
      const r2 = b * b - (p0[0]! ** 2 + p0[1]! ** 2 + p0[2]! ** 2);
      const chao = r2 + R * R;
      const tMax = b < 0 && chao >= 0 ? -b - Math.sqrt(chao) : -b + Math.sqrt(Math.max(r2 + (R + topoKm) ** 2, 0));
      const passos = 400;
      const dt = Math.max(tMax, 0) / passos;
      const quartoDaFase = 0.1875 * (1 + d[1]! * d[1]!); // o Sol no zênite (eixo y)
      let vista = 1;
      let luz = 0;
      for (let k = 0; k < passos; k++) {
        const t = (k + 0.5) * dt;
        const p = [p0[0]! + t * d[0]!, p0[1]! + t * d[1]!, p0[2]! + t * d[2]!];
        const r = Math.hypot(p[0]!, p[1]!, p[2]!);
        const h = Math.max(r - R, 0);
        const cosZ = p[1]! / r;
        const atravessa = Math.exp(-tau[c]! * Math.exp(-h / H) * (dt / H));
        const alcanca = cosZ >= 0 || r * r * (1 - cosZ * cosZ) >= R * R;
        const simples = alcanca ? quartoDaFase * Math.exp(-tau[c]! * caminhoDoSolNoAr(h, cosZ)) : 0;
        luz += (simples + psi(preto, h, cosZ, c)) * vista * (1 - atravessa);
        vista *= atravessa;
      }
      return luz;
    };
    // o fluxo (em unidades de E) que atravessa `p0` no sentido de `sentido`
    // (+1 para cima, −1 para baixo): ∫ L·μ dω / π, olhando para o outro lado
    const fluxo = (p0: number[], sentido: number, c: number) => {
      const [nMu, nPhi] = [48, 12];
      let soma = 0;
      for (let a = 0; a < nMu; a++) {
        const mu = (a + 0.5) / nMu;
        const seno = Math.sqrt(1 - mu * mu);
        for (let k = 0; k < nPhi; k++) {
          const phi = (2 * Math.PI * (k + 0.5)) / nPhi;
          const olhar = [seno * Math.cos(phi), -sentido * mu, seno * Math.sin(phi)];
          soma += luzDoRaio(p0, olhar, c) * mu;
        }
      }
      return (soma * (1 / nMu) * ((2 * Math.PI) / nPhi)) / Math.PI;
    };
    for (let c = 0; c < 3; c++) {
      const sobe = fluxo([0, R + topoKm, 0], 1, c);
      const desce = fluxo([0, R, 0], -1, c);
      const perda = 1 - Math.exp(-tau[c]! * caminhoDoSolNoAr(0, 1));
      expect((sobe + desce) / perda).toBeLessThanOrEqual(1);
      expect((sobe + desce) / perda).toBeGreaterThan(0.9);
    }
  });
});
