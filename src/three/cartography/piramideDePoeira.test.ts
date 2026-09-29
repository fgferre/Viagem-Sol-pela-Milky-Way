// Serve: chão — a residência da pirâmide da poeira pede o perto e a frente primeiro, nos raios do preset, cabe nas vagas, cancela o velho, respeita a carência, marca o omitido e não martela o 404
// ============================================================
// A PIRÂMIDE DA POEIRA SEM GPU E SEM REDE. Uma pirâmide sintética com a
// geometria do contrato (n1 de 10 pc na caixa inteira, n2 de 5 pc em
// r ≤ 900, n3 de 2,5 pc em r ≤ 450, alguns tijolos omitidos por uma
// regra fixa) e uma fonte falsa cujas promessas o teste resolve na mão —
// inclusive DEPOIS do aborto, porque a rede pode entregar atrasada.
// ============================================================
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RECARGAS_ATE_DESISTIR } from '../world/corpos/texturas';
import {
  BYTES_POR_TIJOLO,
  CODIGO_AUSENTE,
  CODIGO_OMITIDO,
  CONCORRENCIA_DE_BUSCA,
  ESPERA_APOS_FALHA_S,
  FATOR_ATRAS,
  PRIMEIRO_CODIGO_DE_VAGA,
  RAIO_DESEJADO_NO_COMPUTADOR_PC,
  RAIO_DESEJADO_PC,
  ResidenciaDaPiramide,
  VOXELS_POR_TIJOLO,
  carregarPiramideDePoeira,
  fonteDaRede,
  lerIndiceDeNivel,
  mesmoOrcamento,
  montarOrcamento,
  orcamentoDaPiramide,
} from './piramideDePoeira';
import type {
  CameraDaPoeira,
  FonteDeTijolos,
  LoteParaGpu,
  PiramideDePoeira,
  Trio,
} from './piramideDePoeira';

type Tripla = [number, number, number];
const ORIGEM: Tripla = [-1250, -1250, -500];
const SOL: Tripla = [0, 0, 0];
const GRADES = [
  { level: 1, voxelPc: 10, dims: [250, 250, 100] as Tripla, radiusPc: null },
  { level: 2, voxelPc: 5, dims: [500, 500, 200] as Tripla, radiusPc: 900 },
  { level: 3, voxelPc: 2.5, dims: [1000, 1000, 400] as Tripla, radiusPc: 450 },
];

/** o núcleo do tijolo em pc, cortado na borda da grade */
function caixa(level: number, b: Trio) {
  const { voxelPc, dims } = GRADES[level - 1];
  const lo = [0, 1, 2].map((a) => ORIGEM[a] + b[a] * 32 * voxelPc);
  const hi = [0, 1, 2].map((a) => ORIGEM[a] + Math.min((b[a] + 1) * 32, dims[a]) * voxelPc);
  return { lo, hi };
}
function aoCentro(level: number, b: Trio, q: Trio): number {
  const { lo, hi } = caixa(level, b);
  return Math.hypot(...[0, 1, 2].map((a) => (lo[a] + hi[a]) / 2 - q[a]));
}
function aCaixa(level: number, b: Trio, q: Trio): number {
  const { lo, hi } = caixa(level, b);
  return Math.hypot(...[0, 1, 2].map((a) => Math.max(lo[a] - q[a], 0, q[a] - hi[a])));
}
/** a prioridade da política, pelas oito quinas: inteira atrás conta ×FATOR_ATRAS */
function prioridadeDe(level: number, b: Trio, q: Trio, f: Trio): number {
  const { lo, hi } = caixa(level, b);
  let algumaNaFrente = false;
  for (let c = 0; c < 8; c++) {
    const quina = [c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]];
    if (quina.reduce((s, v, a) => s + (v - q[a]) * f[a], 0) >= 0) algumaNaFrente = true;
  }
  return aCaixa(level, b, q) * (algumaNaFrente ? 1 : FATOR_ATRAS);
}

/** o pipeline diria "resíduo pequeno, o pai cobre" */
const omitido = (level: number, b: Trio) => level > 1 && (b[0] + 2 * b[1] + 3 * b[2]) % 11 === 5;

function indiceSintetico(level: number) {
  const { voxelPc, dims, radiusPc } = GRADES[level - 1];
  const nb = dims.map((d) => Math.ceil(d / 32)) as Tripla;
  const bricks: Array<{ b: Tripla; sha256: string; bytes: number }> = [];
  for (let bk = 0; bk < nb[2]; bk++) {
    for (let bj = 0; bj < nb[1]; bj++) {
      for (let bi = 0; bi < nb[0]; bi++) {
        const b: Tripla = [bi, bj, bk];
        if (radiusPc !== null && aCaixa(level, b, SOL) > radiusPc) continue; // fora da região
        if (!omitido(level, b)) bricks.push({ b, sha256: '0'.repeat(64), bytes: 1 });
      }
    }
  }
  // a forma que o pipeline grava (scripts/data/build-dust-volumes.mjs)
  return {
    level,
    parent: { level: level - 1, sha256: '0'.repeat(64) },
    voxelPc,
    originPc: ORIGEM,
    dims,
    brickDims: nb,
    brickCore: 32,
    brickHalo: 1,
    radiusPc,
    scale: 1000,
    type: 'float16',
    bricks,
  };
}

const PIRAMIDE: PiramideDePoeira = {
  niveis: [1, 2, 3].map((k) => lerIndiceDeNivel(indiceSintetico(k), `sintetica/n${k}`)),
};

const nomeDe = (nivel: number, b: Trio) => `${nivel}:${b.join('_')}`;
function indiceDe(level: number, b: Trio): number {
  const [nbx, nby] = PIRAMIDE.niveis[level - 1].dimsEmTijolos;
  return b[0] + nbx * (b[1] + nby * b[2]);
}
const gravado = (level: number, b: Trio) => PIRAMIDE.niveis[level - 1].gravados.has(indiceDe(level, b));

/** o que a política manda desejar em q: gravado e com o centro no raio do nível */
function desejadosEm(
  q: Trio,
  raios: readonly number[] = RAIO_DESEJADO_PC
): Array<{ nome: string; level: number; b: Tripla }> {
  const lista: Array<{ nome: string; level: number; b: Tripla }> = [];
  for (const n of PIRAMIDE.niveis) {
    const [nbx, nby, nbz] = n.dimsEmTijolos;
    for (let bk = 0; bk < nbz; bk++) {
      for (let bj = 0; bj < nby; bj++) {
        for (let bi = 0; bi < nbx; bi++) {
          const b: Tripla = [bi, bj, bk];
          if (gravado(n.nivel, b) && aoCentro(n.nivel, b, q) <= raios[n.nivel]) {
            lista.push({ nome: nomeDe(n.nivel, b), level: n.nivel, b });
          }
        }
      }
    }
  }
  return lista;
}

interface Pedido {
  nivel: number;
  tijolo: Tripla;
  sinal: AbortSignal;
  aberto: boolean;
  resolver: (d: Uint16Array) => void;
  rejeitar: (e: Error) => void;
}

function fonteFalsa(falha: (nome: string) => boolean = () => false) {
  const pedidos: Pedido[] = [];
  const fonte: FonteDeTijolos = {
    buscar: (nivel, bi, bj, bk, sinal) =>
      new Promise<Uint16Array>((resolver, rejeitar) => {
        pedidos.push({ nivel: nivel.nivel, tijolo: [bi, bj, bk], sinal, aberto: true, resolver, rejeitar });
      }),
  };
  /** responde todo pedido aberto — inclusive os abortados */
  const responder = (ordem: 'direta' | 'inversa' = 'direta') => {
    const abertos = pedidos.filter((p) => p.aberto);
    if (ordem === 'inversa') abertos.reverse();
    for (const p of abertos) {
      p.aberto = false;
      if (falha(nomeDe(p.nivel, p.tijolo))) {
        p.rejeitar(new Error('HTTP 404'));
        continue;
      }
      const dados = new Uint16Array(VOXELS_POR_TIJOLO);
      dados[0] = p.nivel;
      p.resolver(dados);
    }
  };
  const quantas = (nome: string) => pedidos.filter((p) => nomeDe(p.nivel, p.tijolo) === nome).length;
  return { fonte, pedidos, responder, quantas };
}
type FonteFalsa = ReturnType<typeof fonteFalsa>;

const esvaziar = () => new Promise<void>((r) => setTimeout(r, 0));

/** quadros de 0,1 s até nada estar no ar nem faltar vaga */
async function bombear(
  res: ResidenciaDaPiramide,
  falsa: FonteFalsa,
  camera: CameraDaPoeira,
  t: number
): Promise<{ lotes: LoteParaGpu[]; t: number }> {
  const lotes: LoteParaGpu[] = [];
  for (let i = 0; i < 400; i++) {
    lotes.push(res.atualizar(t, camera));
    if (!res.carregando) return { lotes, t };
    falsa.responder();
    await esvaziar();
    t += 0.1;
  }
  throw new Error('a residência não assentou em 400 quadros');
}

/** os tijolos que as tabelas dizem residentes */
function residentes(res: ResidenciaDaPiramide): Set<string> {
  const nomes = new Set<string>();
  for (const n of PIRAMIDE.niveis) {
    const [nbx, nby] = n.dimsEmTijolos;
    res.tabela(n.nivel)?.forEach((codigo, i) => {
      if (codigo < PRIMEIRO_CODIGO_DE_VAGA) return;
      nomes.add(nomeDe(n.nivel, [i % nbx, Math.floor(i / nbx) % nby, Math.floor(i / (nbx * nby))]));
    });
  }
  return nomes;
}

const subiram = (lotes: LoteParaGpu[]) =>
  lotes.flatMap((l) => l.subidas.map((s) => nomeDe(s.nivel, s.tijolo)));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('a residência da pirâmide da poeira', () => {
  it('perto pede os três níveis, cada um só até o seu raio e só o gravado; longe, só o n1', async () => {
    for (const [q, niveis] of [
      [[120, -80, 15], ['1', '2', '3']],
      [[-1100, 1100, 300], ['1']],
    ] as Array<[Tripla, string[]]>) {
      const falsa = fonteFalsa();
      const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(1024, 2 ** 30, 2048), falsa.fonte);
      await bombear(res, falsa, { posicaoPc: q, frente: [1, 0, 0] }, 0);
      const esperados = new Set(desejadosEm(q).map((d) => d.nome));
      expect(residentes(res)).toEqual(esperados);
      // nada além disso foi sequer pedido
      expect(new Set(falsa.pedidos.map((p) => nomeDe(p.nivel, p.tijolo)))).toEqual(esperados);
      expect([...new Set([...esperados].map((n) => n.split(':')[0]))].sort()).toEqual(niveis);
    }
  });

  it('os raios vêm do orçamento do preset: o Cinema e o Alta desejam o n3 até 270 pc, o Performance até 150', async () => {
    expect(orcamentoDaPiramide('cinema', 2048).raiosPc).toBe(RAIO_DESEJADO_NO_COMPUTADOR_PC);
    expect(orcamentoDaPiramide('alta', 2048).raiosPc).toBe(RAIO_DESEJADO_NO_COMPUTADOR_PC);
    expect(orcamentoDaPiramide('performance', 2048).raiosPc).toBe(RAIO_DESEJADO_PC);
    // cinema ↔ alta não remonta; performance ↔ cinema sim
    expect(mesmoOrcamento(orcamentoDaPiramide('cinema', 2048), orcamentoDaPiramide('alta', 2048))).toBe(true);
    expect(mesmoOrcamento(orcamentoDaPiramide('cinema', 2048), orcamentoDaPiramide('performance', 2048))).toBe(false);
    expect(
      mesmoOrcamento(montarOrcamento(256, 1, 2048), montarOrcamento(256, 1, 2048, RAIO_DESEJADO_NO_COMPUTADOR_PC))
    ).toBe(false);
    // a residência pede exatamente o conjunto dos raios que recebeu
    const q: Tripla = [30, -20, 5];
    for (const raios of [RAIO_DESEJADO_PC, RAIO_DESEJADO_NO_COMPUTADOR_PC]) {
      const falsa = fonteFalsa();
      const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(1024, 2 ** 30, 2048, raios), falsa.fonte);
      await bombear(res, falsa, { posicaoPc: q, frente: [1, 0, 0] }, 0);
      expect(residentes(res)).toEqual(new Set(desejadosEm(q, raios).map((d) => d.nome)));
    }
    const n3 = (raios: readonly number[]) => desejadosEm(q, raios).filter((d) => d.level === 3).length;
    expect(n3(RAIO_DESEJADO_NO_COMPUTADOR_PC)).toBeGreaterThan(n3(RAIO_DESEJADO_PC));
  });

  it('nunca passa das vagas nem do cache, e quem fica é o mais útil', async () => {
    const vagas = 24;
    const cache = 40 * BYTES_POR_TIJOLO;
    const falsa = fonteFalsa();
    const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(vagas, cache, 2048), falsa.fonte);
    const frente: Tripla = [1, 0, 0];
    const caminho: Tripla[] = [[0, 0, 0], [60, 0, 0], [140, 40, 0], [220, 90, 10]];
    let t = 0;
    for (const q of caminho) {
      for (let i = 0; i < 30; i++) {
        res.atualizar(t, { posicaoPc: q, frente });
        const codigos = PIRAMIDE.niveis.flatMap((n) =>
          [...(res.tabela(n.nivel) ?? [])].filter((c) => c >= PRIMEIRO_CODIGO_DE_VAGA)
        );
        expect(new Set(codigos).size).toBe(codigos.length); // uma vaga, um tijolo
        expect(codigos.every((c) => c < PRIMEIRO_CODIGO_DE_VAGA + vagas)).toBe(true);
        expect(res.resumo().bytesEmCache).toBeLessThanOrEqual(cache);
        falsa.responder();
        await esvaziar();
        t += 0.1;
      }
    }
    const q = caminho[caminho.length - 1];
    await bombear(res, falsa, { posicaoPc: q, frente }, t);
    const aqui = desejadosEm(q);
    const dentro = residentes(res);
    expect(aqui.length).toBeGreaterThan(vagas);
    expect(dentro.size).toBe(vagas);
    expect([...dentro].every((n) => aqui.some((d) => d.nome === n))).toBe(true);
    const p = (d: { level: number; b: Tripla }) => prioridadeDe(d.level, d.b, q, frente);
    const piorDentro = Math.max(...aqui.filter((d) => dentro.has(d.nome)).map(p));
    const melhorFora = Math.min(...aqui.filter((d) => !dentro.has(d.nome)).map(p));
    expect(piorDentro).toBeLessThanOrEqual(melhorFora);
  });

  it('ao faltar vaga sai o menos útil: fora do raio, o mais longe em raios do seu nível', async () => {
    const vagas = 48;
    const casa: Tripla = [0, 0, 0];
    const longe: Tripla = [-1100, 1100, 300]; // só n1 ali
    const deLonge = desejadosEm(longe);
    expect(deLonge.length).toBeGreaterThan(0);
    expect(deLonge.length).toBeLessThan(vagas);
    const falsa = fonteFalsa();
    const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(vagas, 2 ** 30, 2048), falsa.fonte);
    const { t } = await bombear(res, falsa, { posicaoPc: casa, frente: [1, 0, 0] }, 0);
    const deCasa = [...residentes(res)];
    expect(deCasa).toHaveLength(vagas);
    await bombear(res, falsa, { posicaoPc: longe, frente: [1, 0, 0] }, t + 1); // dentro da carência
    // quem sobra de casa são os mais úteis vistos de longe: menor distância em raios do nível
    const util = (nome: string) => {
      const [nivel, resto] = nome.split(':');
      const level = Number(nivel);
      return aoCentro(level, resto.split('_').map(Number) as Tripla, longe) / RAIO_DESEJADO_PC[level];
    };
    const esperados = deCasa.sort((a, b) => util(a) - util(b)).slice(0, vagas - deLonge.length);
    expect(residentes(res)).toEqual(new Set([...deLonge.map((d) => d.nome), ...esperados]));
  });

  it('busca primeiro o que contém a câmera, do grosso ao fino; depois o perto; na mesma distância, a frente', async () => {
    const q: Tripla = [-10, -10, 20]; // o centro do tijolo n3 15_15_6
    const frente: Tripla = [1, 0, 0];
    expect([
      gravado(2, [7, 7, 3]),
      gravado(3, [15, 15, 6]),
      gravado(3, [16, 15, 6]),
      gravado(3, [14, 15, 6]),
    ]).toEqual([true, true, true, true]);
    const falsa = fonteFalsa();
    const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(512, 2 ** 30, 2048), falsa.fonte);
    await bombear(res, falsa, { posicaoPc: q, frente }, 0);
    const ordem = falsa.pedidos.map((p) => nomeDe(p.nivel, p.tijolo));
    expect(ordem.slice(0, 3)).toEqual(['1:3_3_1', '2:7_7_3', '3:15_15_6']);
    // os dois vizinhos a 40 pc: o da frente antes do de trás
    expect(ordem.indexOf('3:16_15_6')).toBeGreaterThan(-1);
    expect(ordem.indexOf('3:16_15_6')).toBeLessThan(ordem.indexOf('3:14_15_6'));
    // e a fila inteira anda do mais perto para o mais longe
    const prioridades = falsa.pedidos.map((p) => prioridadeDe(p.nivel, p.tijolo, q, frente));
    expect(prioridades.findIndex((v, i) => i > 0 && v < prioridades[i - 1] - 1e-9)).toBe(-1);
  });

  it('um salto de câmera cancela as buscas velhas, e nenhuma subida velha passa', async () => {
    const falsa = fonteFalsa();
    const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(256, 2 ** 30, 2048), falsa.fonte);
    res.atualizar(0, { posicaoPc: [0, 0, 0], frente: [1, 0, 0] });
    const velhos = falsa.pedidos.slice();
    expect(velhos).toHaveLength(CONCORRENCIA_DE_BUSCA);
    const longe: CameraDaPoeira = { posicaoPc: [-800, 600, 0], frente: [0, 1, 0] };
    res.atualizar(0.1, longe);
    expect(velhos.every((p) => p.sinal.aborted)).toBe(true);
    // a rede entrega mesmo assim — o aborto chegou tarde
    falsa.responder();
    await esvaziar();
    const { lotes } = await bombear(res, falsa, longe, 0.2);
    const nomesVelhos = new Set(velhos.map((p) => nomeDe(p.nivel, p.tijolo)));
    expect(subiram(lotes).filter((n) => nomesVelhos.has(n))).toEqual([]);
    expect([...residentes(res)].filter((n) => nomesVelhos.has(n))).toEqual([]);
    expect(residentes(res)).toEqual(new Set(desejadosEm(longe.posicaoPc).map((d) => d.nome)));
    // o que chegou depois do aborto nem entrou no cache
    const { residentes: quantos, bytesEmCache } = res.resumo();
    expect(bytesEmCache).toBe(quantos * BYTES_POR_TIJOLO);
  });

  it('quem volta dentro da carência não busca de novo; depois dela, busca', async () => {
    const falsa = fonteFalsa();
    // vagas curtas: ir e voltar despeja do atlas, e o que volta sai do cache
    const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(8, 64 * BYTES_POR_TIJOLO, 2048), falsa.fonte);
    const casa: CameraDaPoeira = { posicaoPc: [0, 0, 0], frente: [1, 0, 0] };
    const longe: CameraDaPoeira = { posicaoPc: [-800, 600, 0], frente: [1, 0, 0] };
    let { t } = await bombear(res, falsa, casa, 0);
    const deCasa = residentes(res);
    expect(deCasa.size).toBe(8);
    const buscasDeCasa = () => [...deCasa].reduce((s, n) => s + falsa.quantas(n), 0);
    expect(buscasDeCasa()).toBe(8);

    ({ t } = await bombear(res, falsa, longe, t + 1));
    expect([...residentes(res)].filter((n) => deCasa.has(n))).toEqual([]);
    const volta = await bombear(res, falsa, casa, t + 1); // ~2 s depois de sair
    expect(residentes(res)).toEqual(deCasa);
    expect(buscasDeCasa()).toBe(8); // nenhuma busca nova
    expect(new Set(subiram(volta.lotes))).toEqual(deCasa); // subiram do cache
    t = volta.t;

    ({ t } = await bombear(res, falsa, longe, t + 1));
    for (let i = 0; i < 20; i++) res.atualizar((t += 1), longe); // 20 s longe: a carência vence
    expect(res.resumo().bytesEmCache).toBe(8 * BYTES_POR_TIJOLO); // só os de lá
    await bombear(res, falsa, casa, t + 1);
    expect(residentes(res)).toEqual(deCasa);
    expect(buscasDeCasa()).toBe(16);
  });

  it('o tijolo omitido pelo pipeline é OMITIDO na tabela e nunca é buscado; fora da região é AUSENTE', async () => {
    let semTijolo: Tripla | null = null;
    let vizinho: Tripla | null = null;
    for (let bi = 10; bi < 22 && !semTijolo; bi++) {
      for (let bj = 10; bj < 22 && !semTijolo; bj++) {
        const b: Tripla = [bi, bj, 6];
        const v: Tripla = [bi + 1, bj, 6];
        if (omitido(3, b) && aoCentro(3, b, SOL) < 200 && gravado(3, v)) {
          semTijolo = b;
          vizinho = v;
        }
      }
    }
    if (!semTijolo || !vizinho) throw new Error('a regra sintética não omitiu nada perto do Sol');
    const falsa = fonteFalsa();
    const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(256, 2 ** 30, 2048), falsa.fonte);
    const tabela = res.tabela(3);
    expect(tabela?.[indiceDe(3, semTijolo)]).toBe(CODIGO_OMITIDO);
    expect(tabela?.[indiceDe(3, vizinho)]).toBe(CODIGO_AUSENTE);
    expect(tabela?.[indiceDe(3, [0, 0, 0])]).toBe(CODIGO_AUSENTE); // quina da caixa, r > 450

    const { lo, hi } = caixa(3, semTijolo);
    const centro = [0, 1, 2].map((a) => (lo[a] + hi[a]) / 2) as Tripla;
    await bombear(res, falsa, { posicaoPc: centro, frente: [1, 0, 0] }, 0);
    expect(falsa.quantas(nomeDe(3, semTijolo))).toBe(0);
    expect(tabela?.[indiceDe(3, semTijolo)]).toBe(CODIGO_OMITIDO);
    expect(tabela?.[indiceDe(3, vizinho)]).toBeGreaterThanOrEqual(PRIMEIRO_CODIGO_DE_VAGA);
  });

  it('um tijolo que dá 404 fica AUSENTE e para de ser pedido depois das tentativas contadas', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const quebrado = '3:15_15_6';
    const falsa = fonteFalsa((nome) => nome === quebrado);
    const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(256, 2 ** 30, 2048), falsa.fonte);
    const camera: CameraDaPoeira = { posicaoPc: [-10, -10, 20], frente: [1, 0, 0] };
    const tentativasEm: number[] = [];
    let t = 0;
    for (let i = 0; i < 480; i++) {
      // dois minutos de quadros a 4 Hz
      res.atualizar(t, camera);
      if (falsa.quantas(quebrado) > tentativasEm.length) tentativasEm.push(t);
      falsa.responder();
      await esvaziar();
      t += 0.25;
    }
    expect(falsa.quantas(quebrado)).toBe(1 + RECARGAS_ATE_DESISTIR);
    // espaçadas (a espera dobra): um tropeço da rede não gasta as três num segundo
    const intervalos = tentativasEm.slice(1).map((v, i) => v - tentativasEm[i]);
    expect(intervalos.every((d, i) => d >= ESPERA_APOS_FALHA_S * 2 ** i)).toBe(true);
    expect(res.tabela(3)?.[indiceDe(3, [15, 15, 6])]).toBe(CODIGO_AUSENTE);
    expect(res.resumo()).toMatchObject({ desistidos: 1, pendentes: 0, emVoo: 0 });
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(residentes(res).size).toBe(desejadosEm(camera.posicaoPc).length - 1);
  });

  it('a mesma viagem dá os mesmos lotes em qualquer ordem de chegada da rede', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const viagem = async (ordem: 'direta' | 'inversa') => {
      const falsa = fonteFalsa((nome) => nome === '2:8_7_3');
      const res = new ResidenciaDaPiramide(PIRAMIDE, montarOrcamento(24, 32 * BYTES_POR_TIJOLO, 2048), falsa.fonte);
      const trechos: Array<[Tripla, Tripla]> = [
        [[0, 0, 0], [1, 0, 0]],
        [[40, -30, 5], [0, 1, 0]],
        [[-800, 600, 0], [1, 0, 0]],
        [[0, 0, 0], [-1, 0, 0]],
      ];
      const diario: string[] = [];
      let t = 0;
      for (const [posicaoPc, frente] of trechos) {
        for (let i = 0; i < 25; i++) {
          const lote = res.atualizar(t, { posicaoPc, frente });
          diario.push(
            lote.subidas.map((s) => `${s.vaga}<${nomeDe(s.nivel, s.tijolo)}`).join(',') +
              ' | ' +
              lote.mudancas.map((m) => `${m.nivel}:${m.indice}=${m.codigo}`).join(',')
          );
          falsa.responder(ordem);
          await esvaziar();
          t += 0.2;
        }
      }
      return { diario, pedidos: falsa.pedidos.map((p) => nomeDe(p.nivel, p.tijolo)) };
    };
    const direta = await viagem('direta');
    const inversa = await viagem('inversa');
    expect(inversa.pedidos).toEqual(direta.pedidos);
    expect(inversa.diario).toEqual(direta.diario);
    expect(direta.diario.filter((l) => l !== ' | ').length).toBeGreaterThan(10); // a viagem mexeu
  });
});

describe('o adaptador dos arquivos reais', () => {
  it('lê o índice listado no manifesto e o tijolo .bin.gz do contrato; sem DecompressionStream nem busca', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bruto = new Uint16Array(VOXELS_POR_TIJOLO);
    bruto[0] = 0x3c00;
    bruto[VOXELS_POR_TIJOLO - 1] = 0x4000;
    const gz = (bytes: Uint8Array) => new Uint8Array(gzipSync(bytes));
    const arquivos = new Map<string, Uint8Array<ArrayBuffer> | string>([
      ['/b/data/galaxy/dust-piramide/n1.json', JSON.stringify(indiceSintetico(1))],
      ['/b/data/galaxy/dust-piramide/n1/3_4_1.bin.gz', gz(new Uint8Array(bruto.buffer))],
      ['/b/data/galaxy/dust-piramide/n1/0_0_0.bin.gz', gz(new Uint8Array(10))],
    ]);
    const vistos: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      vistos.push(url);
      const corpo = arquivos.get(url);
      return corpo === undefined ? new Response(null, { status: 404 }) : new Response(corpo);
    });
    const descritor = {
      kind: 'volume-pyramid',
      levels: [{ level: 1, index: 'data/galaxy/dust-piramide/n1.json', sha256: 'x' }],
    };

    const piramide = await carregarPiramideDePoeira('/b/', descritor);
    const n1 = piramide?.niveis[0];
    if (!n1) throw new Error('o índice n1 não foi lido');
    expect([piramide?.niveis.length, n1.pasta, n1.voxelPc, n1.dimsEmTijolos]).toEqual([
      1,
      'data/galaxy/dust-piramide/n1',
      10,
      [8, 8, 4],
    ]);
    const fonte = fonteDaRede('/b/');
    const sinal = new AbortController().signal;
    const dados = await fonte.buscar(n1, 3, 4, 1, sinal);
    expect([dados.length, dados[0], dados[VOXELS_POR_TIJOLO - 1]]).toEqual([VOXELS_POR_TIJOLO, 0x3c00, 0x4000]);
    await expect(fonte.buscar(n1, 0, 0, 0, sinal)).rejects.toThrow(/bytes/); // tamanho errado
    await expect(fonte.buscar(n1, 7, 7, 3, sinal)).rejects.toThrow(/404/); // não publicado

    vistos.length = 0;
    vi.stubGlobal('DecompressionStream', undefined);
    expect(await carregarPiramideDePoeira('/b/', descritor)).toBeNull();
    expect(vistos).toEqual([]);
  });
});
