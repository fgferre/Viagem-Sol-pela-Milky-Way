// Serve: lei — o estado das regiões ativas do Sol é função do instante, nunca do caminho por onde se chega até ele
// A SIMETRIA DO SEEK — o oráculo que o item 5 comprou.
//
// A promessa é uma frase: o estado das regiões ativas num instante é o
// MESMO vindo de frente, vindo de trás ou indo direto. Até 21/08 isso era
// falso por construção — a posição era integral de caminho e o
// renascimento consumia um stream compartilhado —, e o sintoma que o dono
// via era o Sol do Atlas mudando conforme por onde se entrava.
//
// O teste monta um contexto MÍNIMO (sem GPU, sem render): o modelo
// magnético é aritmética pura sobre `THREE.Vector4`, e é dela que a
// promessa depende.
import { describe, expect, it } from 'vitest';
import { createActivity } from './activity.js';
import { UNIDADES_POR_CICLO, tempoDoCiclo, faseDoCiclo } from '../../estrela';

const SEMENTE = 20260803;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAMILIAS: Record<string, number> = { regiao: 1, mancha: 2 };

/* eslint-disable @typescript-eslint/no-explicit-any */
function bancada(t0: number) {
  const ctx: any = {
    srand: mulberry32(SEMENTE),
    MACRO_SLOW: 0.15,
    CYCLE_K: 1,
    LAPSE_K: 0,
    doseDoSol: 1,
    cyclePhase01: 0.35,
    cycleN: 25,
    tempoDoCiclo: t0,
    UNIDADES_POR_CICLO,
    simUniforms: { uChargesSim: { value: null } },
    gran: { seedSimulation: () => {} },
    correnteDaVida: (familia: string, i: number, k: number) =>
      mulberry32(
        (SEMENTE ^
          Math.imul(FAMILIAS[familia] ?? 0, 0x9e3779b1) ^
          Math.imul(i + 1, 0x85ebca6b) ^
          Math.imul(k | 0, 0xc2b2ae35)) >>>
          0
      ),
  };
  return { ctx, act: createActivity(ctx) };
}

/** o retrato do modelo magnético num instante, em números comparáveis */
function retrato(ctx: any, act: any, jd: number) {
  const f = faseDoCiclo(jd);
  ctx.cyclePhase01 = f.fase01;
  ctx.cycleN = f.ciclo;
  ctx.tempoDoCiclo = tempoDoCiclo(f);
  act.updateCycleState();
  act.updateActiveRegions(ctx.tempoDoCiclo);
  return act.charges.map((c: any) => [c.x, c.y, c.z, c.w].join(',')).join('|');
}

const JD_EPOCA = 2461041.5; // 2026-01
const JD_MAX = 2460584.5; // 2024-10
const JD_MIN = 2458818.5; // 2019-12

describe('o estado das regiões é função do INSTANTE, não do caminho', () => {
  it('mesma data, três caminhos: direto, vindo de frente e vindo de trás', () => {
    const a = bancada(tempoDoCiclo(faseDoCiclo(JD_EPOCA)));
    const direto = retrato(a.ctx, a.act, JD_EPOCA);

    // caminho longo POR CIMA: 200 dias de calendário até o alvo
    const b = bancada(tempoDoCiclo(faseDoCiclo(JD_EPOCA)));
    let deFrente = '';
    for (let i = 200; i >= 0; i--) deFrente = retrato(b.ctx, b.act, JD_EPOCA - i);
    expect(deFrente).toBe(direto);

    // e POR BAIXO — o sentido que a máquina antiga não sabia percorrer
    const c = bancada(tempoDoCiclo(faseDoCiclo(JD_EPOCA)));
    let deTras = '';
    for (let i = 200; i >= 0; i--) deTras = retrato(c.ctx, c.act, JD_EPOCA + i);
    expect(deTras).toBe(direto);

    // saltos grandes e desordenados, incluindo anos de distância
    const d = bancada(tempoDoCiclo(faseDoCiclo(JD_EPOCA)));
    for (const jd of [JD_MIN, JD_MAX, JD_EPOCA + 4000, JD_MIN - 900]) {
      retrato(d.ctx, d.act, jd);
    }
    expect(retrato(d.ctx, d.act, JD_EPOCA)).toBe(direto);
  });

  it('e um corpo NOVO, nascido noutra data, chega ao mesmo estado', () => {
    // a prova de que não sobra nada no objeto: dois Sóis construídos em
    // datas diferentes convergem no mesmo instante (é o que faz a troca
    // de tier ao vivo bater com o boot direto)
    const velho = bancada(tempoDoCiclo(faseDoCiclo(JD_MIN)));
    const novo = bancada(tempoDoCiclo(faseDoCiclo(JD_MAX + 3000)));
    expect(retrato(novo.ctx, novo.act, JD_EPOCA)).toBe(
      retrato(velho.ctx, velho.act, JD_EPOCA)
    );
  });

  it('datas distintas dão Sóis distintos — a contraprova', () => {
    const a = bancada(tempoDoCiclo(faseDoCiclo(JD_MIN)));
    expect(retrato(a.ctx, a.act, JD_MIN)).not.toBe(retrato(a.ctx, a.act, JD_MAX));
  });

  it('o mínimo tem regiões FRACAS e o máximo, fortes — a fase manda', () => {
    const b = bancada(tempoDoCiclo(faseDoCiclo(JD_MIN)));
    const carga = (jd: number) => {
      retrato(b.ctx, b.act, jd);
      return b.act.pairStates.reduce(
        (s: number, ps: any) => s + Math.abs(ps.lead.w),
        0
      );
    };
    const noMinimo = carga(JD_MIN);
    const noMaximo = carga(JD_MAX);
    expect(noMaximo).toBeGreaterThan(noMinimo * 3);
  });

  it('a banda de Spörer segue a fase DO NASCIMENTO (diagrama borboleta)', () => {
    // varre um ciclo inteiro anotando, a cada vida NOVA, a latitude em
    // que ela emergiu e a fase daquele momento. É a borboleta medida, não
    // a fórmula relida.
    const b = bancada(tempoDoCiclo(faseDoCiclo(JD_MIN)));
    const cedo: number[] = [];
    const tarde: number[] = [];
    const vidas = new Map<number, number>();
    for (let dia = 0; dia < 4030; dia += 5) {
      const jd = JD_MIN + dia;
      retrato(b.ctx, b.act, jd);
      b.act.pairStates.forEach((ps: any, i: number) => {
        if (vidas.get(i) === ps.vida) return;
        vidas.set(i, ps.vida);
        const lat = Math.abs(Math.asin(ps.lead0.y / 0.88));
        const fase = faseDoCiclo(jd).fase01;
        if (fase < 0.25) cedo.push(lat);
        else if (fase > 0.75) tarde.push(lat);
      });
    }
    const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
    expect(cedo.length).toBeGreaterThan(3);
    expect(tarde.length).toBeGreaterThan(3);
    // início de ciclo nasce ALTO (perto de 35°), fim nasce BAIXO (~5°)
    expect(media(cedo)).toBeGreaterThan(media(tarde) * 1.8);
  });
});

describe('a DOSE é ocupação, nunca fase', () => {
  it('dose 1 é bit-exata: o mesmo estado sem dose nenhuma', () => {
    const a = bancada(tempoDoCiclo(faseDoCiclo(JD_EPOCA)));
    const cheio = retrato(a.ctx, a.act, JD_EPOCA);
    a.ctx.doseDoSol = 1;
    expect(retrato(a.ctx, a.act, JD_EPOCA)).toBe(cheio);
  });

  it('dose menor enfraquece as cargas e NÃO move as posições', () => {
    const a = bancada(tempoDoCiclo(faseDoCiclo(JD_EPOCA)));
    retrato(a.ctx, a.act, JD_EPOCA);
    const posCheia = a.act.pairStates.map((ps: any) => `${ps.lead.x},${ps.lead.y},${ps.lead.z}`);
    const wCheio = a.act.pairStates.map((ps: any) => ps.lead.w);
    const faseCheia = a.ctx.cyclePhase01;
    const polCheio = a.ctx.cyclePolF;
    const haleCheio = a.ctx.cycleHale;

    a.ctx.doseDoSol = 0.13;
    retrato(a.ctx, a.act, JD_EPOCA);
    const posDosada = a.act.pairStates.map((ps: any) => `${ps.lead.x},${ps.lead.y},${ps.lead.z}`);
    expect(posDosada).toEqual(posCheia); // ONDE não muda
    a.act.pairStates.forEach((ps: any, i: number) => {
      if (wCheio[i] === 0) expect(ps.lead.w).toBe(0);
      else expect(Math.abs(ps.lead.w)).toBeLessThan(Math.abs(wCheio[i])); // QUANTO muda
    });
    // e o que a dose NÃO pode tocar continua intocado
    expect(a.ctx.cyclePhase01).toBe(faseCheia);
    expect(a.ctx.cyclePolF).toBe(polCheio);
    expect(a.ctx.cycleHale).toBe(haleCheio);
  });
});
