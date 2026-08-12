// ============================================================
// Oráculo dos PLANOS DE CORTE (Onda 4, fase 2 — decisão D5).
//
// UMA afirmação, e ela é o gate desta fase: acima do limiar do domínio
// profundo o par (near, far) é o MESMO PAR de doubles de antes da onda.
// O oráculo é a fórmula ANTIGA reescrita aqui, do commit em que ela
// vivia inline no `updateClip` — comparar a nova consigo mesma testaria
// a régua contra ela própria.
//
// Não instancia a `Engine`: o construtor pede canvas, WebGL e `window`.
// O que se testa é a conta, que é pura — mesmo precedente de
// `stellarBody.test.ts`, que julga `SOL_PARAMS` sem montar a cena.
// ============================================================
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEEP_LIMIAR_PC } from '../world/lodStellar';
import { DEEP_NEAR_MIN_PC, farPlanePc, nearPlanePc } from './engine';

/** A fórmula ANTIGA, verbatim das duas linhas que viviam no `updateClip`. */
const nearAntigo = (d: number) => THREE.MathUtils.clamp(d * 0.004, 0.001, 40);
const farAntigo = (d: number) => THREE.MathUtils.clamp(d * 12, 60000, 400000);

/**
 * As distâncias das 18 vistas do `ab-identidade`, em pc. As sete de
 * `?t=` são a amostragem do `Journey` (a proveniência e a varredura do
 * roteiro inteiro estão em `world/lodStellar.test.ts` e em
 * `cinematic/cameraRig.test.ts`); as onze de `?pos=` são |pos| dos
 * literais do script. NOTA: o `updateClip` recebe `min(dHome, dGC)`
 * (`director.ts`), e nas duas vistas em que o centro galáctico está mais
 * perto que o Sol (mergulho, faceon) é ELE que entra — os dois números
 * abaixo são os que o engine vê de verdade.
 */
const VISTAS: readonly (readonly [string, number])[] = [
  ['sol', 0.06315061361538779],
  ['interno', 4.486971350060561],
  ['travessia', 221.22434784471977],
  ['retrato', 221.22434784471977],
  ['mergulho', 4232.2957393244915],
  ['edgeon', 15904.56497361685],
  ['faceon', 32527.188638285254],
  ['soldisco', 0.1],
  ['solrampa', 0.25],
  ['solestouro', 0.32],
  ['solestrela', 0.5],
  ['hero200', 352.67182647915047],
  ['hero600', 752.6718049107726],
  ['hero950', 1102.671756611173],
  ['hero8', 144.67177658942327],
];

/** As três vistas do domínio profundo (D9) — a exceção declarada. */
const PROFUNDAS: readonly (readonly [string, number])[] = [
  ['ua500', 0.0024241],
  ['ua150', 0.00072722],
  ['ua40', 0.00019393],
];

/** 0,05 → 400.000 pc: o limiar, a faixa do filme e o além dela. */
const ACIMA: number[] = [];
for (let i = 0; i <= 2000; i++) ACIMA.push(DEEP_LIMIAR_PC + i * 0.0001);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 0.05);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 400);

describe('near/far — acima do limiar o par é IDÊNTICO ao de antes (D5)', () => {
  it('nas 15 vistas do gate visual que ficam fora do domínio profundo', () => {
    for (const [nome, d] of VISTAS) {
      expect(d, nome).toBeGreaterThanOrEqual(DEEP_LIMIAR_PC);
      expect(Object.is(nearPlanePc(d), nearAntigo(d)), nome).toBe(true);
      expect(Object.is(farPlanePc(d), farAntigo(d)), nome).toBe(true);
    }
  });

  it('e em toda a faixa de 0,05 a 400.000 pc, ponto a ponto', () => {
    for (const d of ACIMA) {
      expect(Object.is(nearPlanePc(d), nearAntigo(d))).toBe(true);
      expect(Object.is(farPlanePc(d), farAntigo(d))).toBe(true);
    }
  });

  it('inclusive nos três regimes do clamp: piso, proporção e teto', () => {
    expect(nearPlanePc(0.06315061361538779)).toBe(0.001); // piso, o filme inteiro
    expect(nearPlanePc(1)).toBe(0.004); // proporção
    expect(nearPlanePc(20000)).toBe(40); // teto
    expect(farPlanePc(0.1)).toBe(60000); // piso do far
    expect(farPlanePc(10000)).toBe(120000); // proporção
    expect(farPlanePc(40000)).toBe(400000); // teto do far
  });

  it('o piso de 0,001 pc (206,3 UA) governa TODA a faixa do filme até 0,25 pc', () => {
    // é o que faz as vistas do Sol (0,1 / 0,25 / 0,32 / 0,5) e o piso do
    // filme saírem com o mesmo near de sempre
    expect(nearPlanePc(DEEP_LIMIAR_PC)).toBe(0.001);
    expect(nearPlanePc(0.1)).toBe(0.001);
    expect(nearPlanePc(0.25)).toBe(0.001);
    expect(nearPlanePc(0.32)).toBe(0.00128);
  });

  it('NaN atravessa como antes (o guarda de 5% do updateClip não dispara)', () => {
    expect(Number.isNaN(nearPlanePc(NaN))).toBe(true);
    expect(Number.isNaN(nearAntigo(NaN))).toBe(true);
    expect(Number.isNaN(farPlanePc(NaN))).toBe(true);
  });
});

describe('near — abaixo do limiar o piso SAI (o que a D5 comprou)', () => {
  it('nas três vistas do domínio profundo o near vira UA de verdade', () => {
    const UA_POR_PC = 206264.80624548031;
    for (const [nome, d] of PROFUNDAS) {
      expect(d, nome).toBeLessThan(DEEP_LIMIAR_PC);
      expect(nearPlanePc(d), nome).toBe(d * 0.004);
      // e o antigo grampeava tudo no mesmo 0,001 pc = 206,3 UA
      expect(nearAntigo(d), nome).toBe(0.001);
    }
    // em UA, para leitura humana: a 150 UA o near passa de 206 UA (que
    // clipava o sistema solar inteiro) para 0,6 UA
    expect(nearPlanePc(0.00072722) * UA_POR_PC).toBeCloseTo(0.6, 1);
    expect(nearPlanePc(0.00019393) * UA_POR_PC).toBeCloseTo(0.16, 2);
  });

  it('é a MESMA proporção de sempre (0,4% da distância), agora sem piso', () => {
    for (let i = 1; i <= 4999; i++) {
      const d = i * 1e-5; // 1e-5 → 0,04999 pc
      expect(nearPlanePc(d)).toBe(d * 0.004);
      expect(nearPlanePc(d)).toBeLessThan(d);
    }
  });

  it('a guarda mínima é 1e-8 pc e só manda dentro da órbita de Vênus', () => {
    const UA = 1 / 206264.80624548031;
    expect(DEEP_NEAR_MIN_PC).toBe(1e-8);
    expect(nearPlanePc(0)).toBe(DEEP_NEAR_MIN_PC);
    expect(nearPlanePc(1e-9)).toBe(DEEP_NEAR_MIN_PC);
    // a fronteira é d = 1e-8/0,004 = 2,5e-6 pc = 0,52 UA: abaixo dela a
    // guarda segura o near, acima quem manda é a proporção
    expect(nearPlanePc(0.51 * UA)).toBe(DEEP_NEAR_MIN_PC);
    expect(nearPlanePc(0.53 * UA)).toBe(0.53 * UA * 0.004);
    expect(nearPlanePc(1 * UA)).toBeGreaterThan(DEEP_NEAR_MIN_PC);
    // nas três vistas do domínio profundo ela não aparece: a mais funda
    // (40 UA) trabalha 77× acima da guarda
    expect(nearPlanePc(0.00019393) / DEEP_NEAR_MIN_PC).toBeCloseTo(77.6, 1);
  });

  it('o near é sempre > 0 e finito na faixa inteira (a projeção não aceita 0)', () => {
    for (const d of [0, 1e-12, 1e-6, 0.001, 0.049, 0.05, 1, 1e5]) {
      expect(nearPlanePc(d)).toBeGreaterThan(0);
      expect(Number.isFinite(nearPlanePc(d))).toBe(true);
      expect(nearPlanePc(d)).toBeLessThan(farPlanePc(d));
    }
  });

  it('O DEGRAU NA FRONTEIRA, declarado: 5× de uma vez, e ninguém o vê', () => {
    // em 0,05 pc o piso deixa de valer: 0,001 → 0,0002 pc. Entre 41 e
    // 206 UA da câmera não há geometria nesta fase, então o degrau não
    // pinta pixel; o que ele custa é uma matriz de projeção nova.
    expect(nearPlanePc(DEEP_LIMIAR_PC)).toBe(0.001);
    expect(nearPlanePc(DEEP_LIMIAR_PC - 1e-15)).toBe((DEEP_LIMIAR_PC - 1e-15) * 0.004);
    expect(nearPlanePc(DEEP_LIMIAR_PC) / nearPlanePc(DEEP_LIMIAR_PC - 1e-15)).toBeCloseTo(5, 6);
  });

  it('o far NÃO muda no domínio profundo — o que muda é o quão perto se vê', () => {
    for (const [nome, d] of PROFUNDAS) {
      expect(Object.is(farPlanePc(d), farAntigo(d)), nome).toBe(true);
      expect(farPlanePc(d), nome).toBe(60000);
    }
  });
});
