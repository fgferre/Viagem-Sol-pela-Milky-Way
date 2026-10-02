// Serve: lei — a conta que assa a normal do DEM (itens 140/141) e a guarda que recusa a meia volta
// ============================================================
// O GERADOR DE NORMAIS EM MINIATURA. O script real lê DEMs de centenas
// de MB e escreve 4096x2048; aqui entram grades sintéticas de dezenas de
// texels, onde a resposta é conhecida de fora do código:
//
//  1. O SINAL. A convenção que `normalDoMapa` (corpos.ts) consome é
//     x = -dh/dLeste, y = -dh/dNorte, z = 1: encosta que SOBE para o
//     leste tem normal apontando para OESTE. Inverter um dos dois sinais
//     é o defeito que faz a cratera virar montanha na tela, e ele passa
//     em md5 — só um oráculo de sinal o pega.
//  2. A AMPLITUDE FÍSICA. Uma rampa de inclinação conhecida em METROS
//     por METRO tem de sair com essa mesma inclinação no mapa, com os
//     passos da ESFERA (R·cos(lat)·dLon a leste, R·dLat ao norte) — é o
//     que separa "amplitude medida, ganho 1" de exagero.
//  3. A GUARDA DE ALINHAMENTO. Com o albedo acompanhando o relevo, a
//     orientação declarada vence a meia volta; com o DEM girado meia
//     volta contra o mapa de cor, a guarda RECUSA a assar.
//
//  4. A TABELA. As declarações por corpo estão pinadas contra as fontes
//     de verdade da CASA: os eixos do elipsoide contra `BODY_AXES`
//     (`iauOrientation.ts`) e a lista de corpos contra `NORMAL_MEDIDA`
//     (`rochoso.ts`) — quem assa e quem consome não podem divergir em
//     silêncio.
//
// Nada aqui toca rede ou o DEM (o único disco é a pasta temporária que a
// seção 7 cria e apaga, para o cache das alturas): o script foi partido
// em funções puras (`assaNormais`, `medirAlinhamento`,
// `conferirAlinhamento`) sem mudar uma conta — os mapas já assados da
// Lua, de Mercúrio e de Marte continuam byte a byte os mesmos. O giro do
// DEM é `giraColunasDeImagem` (`lib-texturas.mjs`), a MESMA função que
// gira imagem na aquisição.
// ============================================================
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BODY_AXES } from '../../../src/lib/atlas/iauOrientation.ts';
import { NORMAL_MEDIDA } from '../../../src/three/world/corpos/rochoso.ts';
import { giraColunasDeImagem } from './lib-texturas.mjs';
import {
  CORPOS,
  MARGEM_DA_BORDA,
  assaNormais,
  conferirAlinhamento,
  gravarCacheDeAlturas,
  lerCacheDeAlturas,
  mediaDeCaixa,
  medirAlinhamento,
} from './gera-normal-de-dem.mjs';

const L = 64;
const A = 32;
const RAIO_M = 1737400;

/** meia volta no DEM — o caso do gerador, um canal por texel. */
const meiaVolta = (campo, largura = L, altura = A) =>
  giraColunasDeImagem(campo, largura, altura, 1, 180);

/** o canal do pixel (i,j) do RGB assado, já de volta em [-1, 1] */
function normalEm(rgb, i, j, largura = L) {
  const k = (j * largura + i) * 3;
  return {
    x: (rgb[k] / 255) * 2 - 1,
    y: (rgb[k + 1] / 255) * 2 - 1,
    z: (rgb[k + 2] / 255) * 2 - 1,
  };
}

/** grade de alturas em metros, montada por uma função de (i, j). */
function grade(f, largura = L, altura = A) {
  const h = new Float32Array(largura * altura);
  for (let j = 0; j < altura; j += 1) {
    for (let i = 0; i < largura; i += 1) h[j * largura + i] = f(i, j);
  }
  return h;
}

/** latitude do centro da linha j — a mesma conta do gerador. */
const latDe = (j, altura = A) => Math.PI / 2 - ((j + 0.5) / altura) * Math.PI;

/** os passos da ESFERA nesta grade, em metros (os mesmos do gerador). */
const passoLeste = (j, raioM = RAIO_M) => (raioM * Math.cos(latDe(j)) * 2 * Math.PI) / L;
const passoNorte = (raioM = RAIO_M) => (raioM * Math.PI) / A;

/**
 * AS ALTURAS SÃO ABSURDAS DE PROPÓSITO. Numa grade de 64x32 o texel da
 * Lua mede 170 km: um morro realista de 2 km daria inclinação de
 * centésimo de grau, dentro da quantização de 8 bits do PNG. O que se
 * mede aqui é o SINAL e a CONTA, não a paisagem — por isso as rampas se
 * escrevem por INCLINAÇÃO (metros por metro), e a calota tem meia
 * largura de texel de altura.
 */
function rampaLeste(declive, raioM = RAIO_M) {
  return grade((i, j) => declive * passoLeste(j, raioM) * i);
}

/**
 * A CALOTA SINTÉTICA: um morro gaussiano centrado no texel (16, 16) com
 * uns 3 texels de raio, alto o bastante para inclinar a normal.
 */
const CALOTA = grade((i, j) =>
  0.6 * passoNorte() * Math.exp(-(((i - 16) ** 2 + (j - 16) ** 2) / 8))
);

/** a inclinação LESTE que o mapa devolve, de volta em metros por metro:
 *  x = -dhLeste·inv e z = inv, então -x/z é a derivada original. */
function declivLeste(rgb, i, j) {
  const n = normalEm(rgb, i, j);
  return -n.x / n.z;
}

describe('1. o sinal da normal — a parede leste aponta para OESTE', () => {
  it('a rampa que SOBE para o leste devolve x negativo em toda a grade', () => {
    // dh/dLeste > 0 ⇒ x = -dh/dLeste < 0 (a normal se deita para OESTE)
    const { rgb } = assaNormais(rampaLeste(Math.tan(Math.PI / 6)), L, A, RAIO_M);
    for (const j of [8, 16, 24]) {
      for (const i of [10, 30, 50]) {
        const n = normalEm(rgb, i, j);
        expect(n.x, `x em (${i},${j})`).toBeLessThan(-0.1);
        expect(n.z, `z em (${i},${j})`).toBeGreaterThan(0);
      }
    }
  });

  it('a rampa que SOBE para o NORTE devolve y negativo (a linha de cima é o norte)', () => {
    // j cresce para o SUL; altura maior no norte ⇒ dh/dNorte > 0 ⇒ y < 0
    const declive = Math.tan(Math.PI / 6);
    const { rgb } = assaNormais(
      grade((_i, j) => declive * passoNorte() * (A - j)), L, A, RAIO_M
    );
    for (const j of [8, 16, 24]) {
      const n = normalEm(rgb, 32, j);
      expect(n.y, `y na linha ${j}`).toBeLessThan(-0.1);
      expect(Math.abs(n.x), `x na linha ${j}`).toBeLessThan(1e-2);
    }
  });

  it('a CALOTA aponta para FORA em todos os quatro flancos', () => {
    const { rgb } = assaNormais(CALOTA, L, A, RAIO_M);
    // a leste do cume a altura CAI para o leste ⇒ x > 0 (a normal se
    // deita rumo ao leste, para fora do morro); e simétrico nos outros
    expect(normalEm(rgb, 18, 16).x).toBeGreaterThan(0.1);
    expect(normalEm(rgb, 14, 16).x).toBeLessThan(-0.1);
    // ao SUL do cume (j maior) a altura SOBE rumo ao norte ⇒ dhNorte > 0
    // ⇒ y < 0, que é a normal deitada para o SUL — para fora do morro
    expect(normalEm(rgb, 16, 18).y).toBeLessThan(-0.1);
    expect(normalEm(rgb, 16, 14).y).toBeGreaterThan(0.1);
    // e o cume é plano: a normal ali é a geométrica (0,0,1)
    const cume = normalEm(rgb, 16, 16);
    expect(Math.hypot(cume.x, cume.y)).toBeLessThan(0.02);
  });
});

describe('2. a amplitude é FÍSICA — a inclinação medida sai como inclinação', () => {
  it('uma encosta de 10° em metros por metro sai como 10° no mapa', () => {
    const { rgb, rmsGraus } = assaNormais(
      rampaLeste(Math.tan((10 * Math.PI) / 180)), L, A, RAIO_M
    );
    // longe da emenda de longitude (a coluna 0 dá a volta e vira degrau)
    for (const j of [8, 16, 24]) {
      for (const i of [16, 32, 48]) {
        const graus = (Math.atan(declivLeste(rgb, i, j)) * 180) / Math.PI;
        expect(graus, `inclinação em (${i},${j})`).toBeCloseTo(10, 0);
      }
    }
    // e o RMS da grade inteira fica na mesma ordem (o degrau da emenda e
    // o clamp polar sobem o número, nunca o derrubam)
    expect(rmsGraus).toBeGreaterThan(9.9);
  });

  it('uma encosta de 30° sai como 30° — nenhum ganho, nenhum teto', () => {
    const { rgb } = assaNormais(rampaLeste(Math.tan(Math.PI / 6)), L, A, RAIO_M);
    const graus = (Math.atan(declivLeste(rgb, 32, 16)) * 180) / Math.PI;
    expect(graus).toBeCloseTo(30, 0);
  });

  it('a MESMA paisagem num corpo 4x maior sai 4x menos inclinada', () => {
    // as alturas são as da rampa de 30° na Lua; num corpo de raio 4x os
    // mesmos metros se espalham por 4x mais chão
    const alturas = rampaLeste(Math.tan(Math.PI / 6));
    const pequeno = assaNormais(alturas, L, A, RAIO_M);
    const grande = assaNormais(alturas, L, A, RAIO_M * 4);
    expect(grande.rmsGraus).toBeLessThan(pequeno.rmsGraus);
    expect(declivLeste(grande.rgb, 32, 16)).toBeCloseTo(
      declivLeste(pequeno.rgb, 32, 16) / 4, 2
    );
  });

  it('terreno plano devolve a normal geométrica exata (128,128,255)', () => {
    const { rgb, rmsGraus, maxGraus } = assaNormais(grade(() => 1234), L, A, RAIO_M);
    for (const k of [0, 3 * (16 * L + 32), rgb.length - 3]) {
      expect(rgb[k]).toBe(128);
      expect(rgb[k + 1]).toBe(128);
      expect(rgb[k + 2]).toBe(255);
    }
    expect(rmsGraus).toBe(0);
    expect(maxGraus).toBe(0);
  });
});

describe('3. a guarda de alinhamento recusa a meia volta', () => {
  /** albedo que ACOMPANHA o relevo (o degrau de terreno é degrau de imagem) */
  const albedoDaCalota = Float64Array.from(CALOTA, (h) => 40 + h / 20);
  const naOutraOrientacao = meiaVolta(CALOTA);

  it('com o DEM e o mapa na MESMA convenção, a declarada vence e a guarda passa', () => {
    const m = medirAlinhamento(CALOTA, naOutraOrientacao, albedoDaCalota, L, A);
    expect(m.bordaDeclarada).toBeGreaterThan(m.bordaOutra + MARGEM_DA_BORDA);
    expect(() => conferirAlinhamento(CORPOS.mercury, m)).not.toThrow();
  });

  it('com o DEM MEIA VOLTA virado contra o mapa de cor, a guarda NÃO assa', () => {
    // as duas orientações trocadas: é exatamente o defeito do item 138
    const m = medirAlinhamento(naOutraOrientacao, CALOTA, albedoDaCalota, L, A);
    expect(m.bordaDeclarada).toBeLessThan(m.bordaOutra);
    expect(() => conferirAlinhamento(CORPOS.mercury, m)).toThrow(/meia volta/);
  });

  it('empate dentro da margem também recusa — vencer por pouco não é vencer', () => {
    const quase = { bordaDeclarada: 0.20, bordaOutra: 0.16, comSinal: 0.9 };
    expect(quase.bordaDeclarada - quase.bordaOutra).toBeLessThan(MARGEM_DA_BORDA);
    expect(() => conferirAlinhamento(CORPOS.mercury, quase)).toThrow(/meia volta/);
  });

  it('o piso COM SINAL é só da Lua, e reprova quando o albedo não segue a altura', () => {
    expect(CORPOS.moon.correlacaoMinima).toBe(0.3);
    expect(CORPOS.mercury.correlacaoMinima).toBeUndefined();
    expect(CORPOS.mars.correlacaoMinima).toBeUndefined();
    const passaNaBorda = { bordaDeclarada: 0.9, bordaOutra: 0.0, comSinal: 0.1 };
    // em Mercúrio o albedo é composição: a mesma medida passa
    expect(() => conferirAlinhamento(CORPOS.mercury, passaNaBorda)).not.toThrow();
    // na Lua, mar baixo E escuro é FATO — 0,1 não serve
    expect(() => conferirAlinhamento(CORPOS.moon, passaNaBorda)).toThrow(/correlação com sinal/);
  });

  it('a meia volta é involutiva e não perde texel — girar duas vezes volta ao mesmo', () => {
    const ida = meiaVolta(CALOTA);
    const volta = meiaVolta(ida);
    expect(Array.from(volta)).toEqual(Array.from(CALOTA));
    expect(ida[16 * L + 16 + L / 2]).toBe(CALOTA[16 * L + 16]);
  });
});

describe('4. a tabela dos corpos (o que muda de um para o outro)', () => {
  it('a conversão declarada por cada fonte está pinada, e só ela muda', () => {
    // convenção do GDAL desde a 2ª fase do 141: metros = valor·escala + offset;
    // a meia volta virou a longitude da borda esquerda da fonte (180 = meia volta)
    expect(CORPOS.moon).toMatchObject({ offsetDoDado: -10000, metrosPorUnidade: 0.5, longitudeDaBordaEsquerdaGraus: 180 });
    expect(CORPOS.mercury).toMatchObject({ offsetDoDado: 0, metrosPorUnidade: 0.5, longitudeDaBordaEsquerdaGraus: 0 });
    expect(CORPOS.mars).toMatchObject({ offsetDoDado: 0, metrosPorUnidade: 1, longitudeDaBordaEsquerdaGraus: 0 });
    expect(CORPOS.ceres).toMatchObject({ offsetDoDado: 470000, metrosPorUnidade: 1, longitudeDaBordaEsquerdaGraus: 0 });
    // Vesta: na 3ª fase do 141 a COR foi girada −150° para a IAU na
    // aquisição, e o relevo voltou ao rótulo do DEM (borda esquerda 180°)
    expect(CORPOS.vesta).toMatchObject({ offsetDoDado: 0, metrosPorUnidade: 1, longitudeDaBordaEsquerdaGraus: 180 });
    // Plutão e Caronte (01/10): os DEMs da New Horizons não declaram escala
    // nem deslocamento; Plutão nasce com meridiano central 180° (borda em
    // 0°, a meia volta do mapa de cor), Caronte com 0° (borda em 180°)
    expect(CORPOS.pluto).toMatchObject({ offsetDoDado: 0, metrosPorUnidade: 1, longitudeDaBordaEsquerdaGraus: 0 });
    expect(CORPOS.charon).toMatchObject({ offsetDoDado: 0, metrosPorUnidade: 1, longitudeDaBordaEsquerdaGraus: 180 });
    // e só os dois DEMs parciais ligam a máscara do vazio: os cinco de
    // antes assam sem ela, byte a byte como antes
    expect(Object.keys(CORPOS).filter((id) => CORPOS[id].vazioLiso)).toEqual(['pluto', 'charon']);
    // e só eles guardam as alturas em cache: os outros cinco leem a fonte como sempre
    expect(Object.keys(CORPOS).filter((id) => CORPOS[id].cacheDeAlturas)).toEqual(['pluto', 'charon']);
    // e NINGUÉM fica de fora do pino: corpo novo entra na tabela com as
    // três declarações ou reprova aqui, em vez de assar por padrão mudo
    expect(Object.keys(CORPOS)).toEqual(['moon', 'mercury', 'mars', 'ceres', 'vesta', 'pluto', 'charon']);
    for (const [id, c] of Object.entries(CORPOS)) {
      expect(Number.isFinite(c.offsetDoDado), `${id} offset`).toBe(true);
      expect(Number.isFinite(c.metrosPorUnidade), `${id} escala`).toBe(true);
      expect(Number.isFinite(c.longitudeDaBordaEsquerdaGraus), `${id} borda`).toBe(true);
    }
  });

  it('os `eixosDaCasaKm` de Ceres e Vesta SÃO os `BODY_AXES` da casa', () => {
    // o gerador DESCONTA este elipsoide do DEM para não contar a figura
    // global duas vezes (a rampa de ~8° de Vesta). Se a casa mudar de
    // eixos e o gerador não, o relevo passa a descontar uma forma que o
    // corpo não tem — e nada na tela grita. Aqui grita.
    const [aCeres, bCeres, cCeres] = BODY_AXES.ceres;
    expect(aCeres).toBe(bCeres); // Ceres é esférico em a/b: a média é o próprio a
    expect(CORPOS.ceres.eixosDaCasaKm).toEqual({ a: aCeres, c: cCeres });

    const [aVesta, bVesta, cVesta] = BODY_AXES.vesta;
    // Vesta tem TRÊS eixos; o gerador usa a média equatorial
    expect(aVesta).not.toBe(bVesta);
    expect(CORPOS.vesta.eixosDaCasaKm).toEqual({ a: (aVesta + bVesta) / 2, c: cVesta });
  });

  it('quem o gerador assa é quem o `rochoso.ts` lê como NORMAL_MEDIDA (+ a Lua)', () => {
    // as duas listas se desencontram calado: um corpo assado e fora da
    // `NORMAL_MEDIDA` gasta disco que o shader nunca lê, e um corpo na
    // `NORMAL_MEDIDA` sem entrada aqui pede um normal.png que ninguém
    // assa. A Lua é a exceção declarada: ela lê a normal por outro
    // caminho (`RELEVO_DA_LUA`/mapa), não pelo interruptor do bump.
    expect(Object.keys(CORPOS).sort()).toEqual(
      [...Object.keys(NORMAL_MEDIDA), 'moon'].sort()
    );
  });
});

describe('5. o giro do DEM é a MESMA conta que gira imagem', () => {
  /**
   * A CONTA ANTIGA, letra por letra como vivia em `gera-normal-de-dem.mjs`
   * antes de virar uma função só com a da aquisição (`giraColunasDeImagem`,
   * em `lib-texturas.mjs`). Está aqui como ORÁCULO: se a unificação tivesse
   * mudado um índice, a Lua, Mercúrio, Marte, Ceres e Vesta reassariam
   * diferentes — e isso não pode passar por md5 de ninguém.
   */
  function giroAntigo(campo, largura, altura, giroGraus) {
    const passos = ((Math.round((giroGraus / 360) * largura) % largura) + largura) % largura;
    if (passos === 0) return campo;
    const saida = new Float32Array(campo.length);
    for (let j = 0; j < altura; j += 1) {
      for (let i = 0; i < largura; i += 1) {
        saida[j * largura + i] = campo[j * largura + ((i + passos) % largura)];
      }
    }
    return saida;
  }

  it('a nova bate com a antiga em todos os giros que a casa usa', () => {
    // 180 é a meia volta da Lua/Vesta, -150 é Vesta na cor, 0 é o caso
    // sem giro (Mercúrio/Marte/Ceres já saem na borda certa depois da
    // conta de `orientar`), e 37 é um giro qualquer que não divide 360
    for (const giro of [0, 180, -150, 37, 360, -180]) {
      const novo = giraColunasDeImagem(CALOTA, L, A, 1, giro);
      expect(Array.from(novo), `giro ${giro}`).toEqual(
        Array.from(giroAntigo(CALOTA, L, A, giro))
      );
    }
  });

  it('a saída sai do MESMO tipo da entrada — Float32Array no DEM', () => {
    // o DEM é metro em ponto flutuante; devolver Buffer truncaria cada
    // altura para 0..255 e o relevo viraria degrau
    expect(meiaVolta(CALOTA)).toBeInstanceOf(Float32Array);
  });

  it('com 3 canais por texel o giro leva o PIXEL inteiro, não o byte', () => {
    // é o caminho da aquisição (`baixa-texturas.mjs`): trocar a ordem dos
    // canais aqui pintaria o mapa de cor errada em vez de girá-lo
    const largura = 4;
    const rgb = Buffer.from([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    const girado = giraColunasDeImagem(rgb, largura, 1, 3, 180);
    expect(Array.from(girado)).toEqual([7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]);
  });
});

describe('6. o vazio sem dado vira relevo LISO (Plutão e Caronte, 01/10)', () => {
  /**
   * Os DEMs da New Horizons cobrem menos da metade do globo, e o
   * tapa-buraco põe o vazio em 0 m: sem a máscara, o degrau entre o
   * planalto medido e esse zero é uma PAREDE de normal. A ORIGEM aqui tem
   * 16x8 amostras, e a média de caixa a reduz a 8x4 (2x2 por texel): dado
   * nas colunas de saída 0–3 — um planalto de 3 km com rampa leste de
   * 100 m por coluna —, vazio nas 4–7 e UMA amostra sem dado no texel
   * (1,3), o parcial. O raio de 1 km dá inclinação de grau inteiro com
   * alturas de int16.
   */
  it('o vazio e os vizinhos dele saem lisos, e a rampa medida ao lado sobrevive sem parede', async () => {
    const SEM_DADO = -32768;
    const fonte = new Int16Array(16 * 8);
    for (let k = 0; k < fonte.length; k += 1) {
      const coluna = (k % 16) >> 1; // a coluna de SAÍDA desta amostra
      fonte[k] = coluna < 4 ? 3000 + 100 * coluna : SEM_DADO;
    }
    fonte[7 * 16 + 2] = SEM_DADO; // uma das quatro amostras do texel (1,3)
    const { media, vazio } = await mediaDeCaixa(
      async (j0, n) => fonte.subarray(j0 * 16, (j0 + n) * 16),
      { largura: 16, altura: 8 }, 8, 4, 2, SEM_DADO, false
    );
    // o PARCIAL conta como vazio, igual à caixa toda sem dado
    expect(Array.from(vazio)).toEqual(
      Array.from(grade((i, j) => (i >= 4 || (i === 1 && j === 3) ? 1 : 0), 8, 4))
    );

    const R = 1000;
    // sem a máscara, o degrau de 3 km para o 0 m é uma parede (~80°)
    expect(assaNormais(media, 8, 4, R).maxGraus).toBeGreaterThan(70);
    const com = assaNormais(media, 8, 4, R, vazio);
    // com ela, só sai calculado quem tem a diferença central inteira no dado
    const calculados = ['1,0', '2,0', '1,1', '2,1', '2,2'];
    for (let j = 0; j < 4; j += 1) {
      for (let i = 0; i < 8; i += 1) {
        const k = (j * 8 + i) * 3;
        const liso = [com.rgb[k], com.rgb[k + 1], com.rgb[k + 2]].join() === '128,128,255';
        expect(liso, `(${i},${j})`).toBe(!calculados.includes(`${i},${j}`));
      }
    }
    expect(com.lisos).toBe(32 - calculados.length);
    // e a inclinação impressa é a da rampa, medida só onde há dado
    const declive = (j) => 100 / ((R * Math.cos(latDe(j, 4)) * 2 * Math.PI) / 8);
    const graus = (d) => (Math.atan(d) * 180) / Math.PI;
    expect(com.maxGraus).toBeCloseTo(graus(declive(0)), 6);
    expect(com.rmsGraus).toBeCloseTo(
      graus(Math.sqrt((2 * declive(0) ** 2 + 3 * declive(1) ** 2) / 5)), 6
    );

    // a máscara gira COM o DEM (a meia volta de Plutão): assar girado é girar o assado
    const meia = (campo, canais) => giraColunasDeImagem(campo, 8, 4, canais, 180);
    expect(meia(vazio, 1)).toBeInstanceOf(Uint8Array);
    expect(Array.from(assaNormais(meia(media, 1), 8, 4, R, meia(vazio, 1)).rgb)).toEqual(
      Array.from(meia(com.rgb, 3))
    );
  });
});

describe('7. o cache das alturas (rodada do relevo inventado)', () => {
  /**
   * Plutão e Caronte custam 745 MiB por faixas HTTP, e o cache poupa a
   * segunda leitura. O que volta do disco tem de ser BYTE A BYTE o que
   * entrou — senão o `normal.png` da prévia difere do da final sem que
   * ninguém veja —, e o que alguém mexeu no disco tem de ser RECUSADO, não
   * assado. A pasta é temporária e some no fim.
   */
  it('relê byte a byte, devolve null sem cache e recusa o arquivo mexido', async () => {
    const raiz = await mkdtemp(path.join(os.tmpdir(), 'cache-relevo-'));
    try {
      // a pasta ainda não existe: a gravação a cria, como na primeira rodada
      const dir = path.join(raiz, 'ainda', 'nao', 'existe');
      const metros = new Float32Array([0.1, -1234.5, 3000, -0.001, 8848.86, 1e-7]);
      const vazio = Uint8Array.from([0, 1, 1, 0, 1]); // tamanho ímpar de propósito
      const guarda = new Float32Array([7, -7, 0.25]);
      await gravarCacheDeAlturas(dir, 'teste', { corpo: 'x', giroGraus: 180 }, { metros, vazio, guarda });
      // só os quatro arquivos: cada parte e o cabeçalho, sem temporário esquecido
      expect((await readdir(dir)).sort()).toEqual(
        ['teste.guarda.bin', 'teste.json', 'teste.metros.bin', 'teste.vazio.bin']
      );

      const lido = await lerCacheDeAlturas(dir, 'teste');
      expect(lido.cabecalho).toMatchObject({ versao: 1, endianness: 'LE', corpo: 'x', giroGraus: 180 });
      expect(lido.cabecalho.partes.metros).toMatchObject({
        tipo: 'f32', comprimento: 6, bytes: 24, arquivo: 'teste.metros.bin',
      });
      expect(lido.cabecalho.partes.vazio).toMatchObject({ tipo: 'u8', comprimento: 5, bytes: 5 });
      expect(lido.cabecalho.partes.metros.sha256).toMatch(/^[0-9a-f]{64}$/);
      const bytes = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
      for (const [parte, tipo, original] of [
        ['metros', Float32Array, metros], ['vazio', Uint8Array, vazio], ['guarda', Float32Array, guarda],
      ]) {
        expect(lido.partes[parte], parte).toBeInstanceOf(tipo);
        // ArrayBuffer próprio, no começo dele: alinhado para o Float32Array
        expect(lido.partes[parte].byteOffset, `${parte} byteOffset`).toBe(0);
        expect(bytes(lido.partes[parte]).equals(bytes(original)), `${parte} bytes`).toBe(true);
      }

      // sem cabeçalho, sem cache: nome que não existe e pasta que não existe
      expect(await lerCacheDeAlturas(dir, 'outro')).toBeNull();
      expect(await lerCacheDeAlturas(path.join(raiz, 'sem-pasta'), 'teste')).toBeNull();

      // um byte virado numa parte: o sha256 não bate e a leitura RECUSA
      const arquivo = path.join(dir, 'teste.metros.bin');
      const original = await readFile(arquivo);
      const mexido = Buffer.from(original);
      mexido[5] ^= 0xff;
      await writeFile(arquivo, mexido);
      await expect(lerCacheDeAlturas(dir, 'teste')).rejects.toThrow(/cache corrompido em .*teste\.metros\.bin/);
      // e arquivo cortado também: o tamanho não bate
      await writeFile(arquivo, original.subarray(0, original.length - 1));
      await expect(lerCacheDeAlturas(dir, 'teste')).rejects.toThrow(/cache corrompido/);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});
