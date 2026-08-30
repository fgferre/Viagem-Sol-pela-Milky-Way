// Serve: lei — os planos de corte, as portas ?tone=/?exp= e a trava de vai-e-volta do engine só deixam passar número são
// ============================================================
// Dois oráculos do `engine.ts`: os PLANOS DE CORTE (Onda 4, fase 2 —
// decisão D5) e, no fim do arquivo, as DUAS PORTAS DE GOSTO (`?tone=` e
// `?exp=`), que ganharam leitor único depois da auditoria de 2026-08-12.
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
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LIMIAR_SISTEMA_SOLAR_PC } from '../escala';
import {
  DEEP_NEAR_MIN_PC,
  MedidorDeQuadros,
  TONE_MAPPINGS,
  TravaDoVaivem,
  farPlanePc,
  lerPortaExposicao,
  lerPortaTom,
  nearPlanePc,
  tierMedido,
} from './engine';
import type { QualityLevel, ToneMapMode } from './engine';

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
 *
 * O `sol` (t=6) é o RE-MEDIDO de 17/08 no navegador, com o filme
 * congelado. O achado do item 41 (15/08) flagrou o literal antigo
 * defasado do vivo de então (1,2955e-7 pc — o começo refilmado da F3) e
 * mandava mover a vista para PROFUNDAS; antes do conserto a soltura da
 * estrela refez o começo do filme e t=6 voltou para CIMA do limiar. O
 * número da tabela segue a medição — se o filme re-temporizar de novo,
 * é a asserção de limiar logo abaixo que acusa.
 */
const VISTAS: readonly (readonly [string, number])[] = [
  ['sol', 0.07762087348130012],
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
for (let i = 0; i <= 2000; i++) ACIMA.push(LIMIAR_SISTEMA_SOLAR_PC + i * 0.0001);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 0.05);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 400);

describe('near/far — acima do limiar o par é IDÊNTICO ao de antes (D5)', () => {
  it('nas 15 vistas do gate visual que ficam fora do domínio profundo', () => {
    for (const [nome, d] of VISTAS) {
      expect(d, nome).toBeGreaterThanOrEqual(LIMIAR_SISTEMA_SOLAR_PC);
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
    expect(nearPlanePc(0.07762087348130012)).toBe(0.001); // piso, o filme inteiro
    expect(nearPlanePc(1)).toBe(0.004); // proporção
    expect(nearPlanePc(20000)).toBe(40); // teto
    expect(farPlanePc(0.1)).toBe(60000); // piso do far
    expect(farPlanePc(10000)).toBe(120000); // proporção
    expect(farPlanePc(40000)).toBe(400000); // teto do far
  });

  it('o piso de 0,001 pc (206,3 UA) governa TODA a faixa do filme até 0,25 pc', () => {
    // é o que faz as vistas do Sol (0,1 / 0,25 / 0,32 / 0,5) e o piso do
    // filme saírem com o mesmo near de sempre
    expect(nearPlanePc(LIMIAR_SISTEMA_SOLAR_PC)).toBe(0.001);
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
      expect(d, nome).toBeLessThan(LIMIAR_SISTEMA_SOLAR_PC);
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
    // em 0,05 pc o piso deixa de valer: 0,001 → 0,0002 pc. A razão de
    // ninguém ver era PREMISSA ("não há geometria entre 41 e 206 UA")
    // e a Onda 6 a matou ao pôr corpos resolvidos no domínio profundo;
    // desde então é CONTA, no teste seguinte. O que o degrau custa é
    // uma matriz de projeção nova.
    expect(nearPlanePc(LIMIAR_SISTEMA_SOLAR_PC)).toBe(0.001);
    expect(nearPlanePc(LIMIAR_SISTEMA_SOLAR_PC - 1e-15)).toBe((LIMIAR_SISTEMA_SOLAR_PC - 1e-15) * 0.004);
    expect(nearPlanePc(LIMIAR_SISTEMA_SOLAR_PC) / nearPlanePc(LIMIAR_SISTEMA_SOLAR_PC - 1e-15)).toBeCloseTo(5, 6);
  });

  it('a CONTA que substituiu a premissa: na fronteira, todo corpo está longe do degrau', () => {
    // quem cruza 0,05 pc está a 10.313 UA da âncora; todo corpo do
    // retrato orbita a ≤ 40 UA do Sol (Plutão, o mais distante, a
    // 35,4 — planetas.ts), então o corpo mais próximo possível fica a
    // ≥ 10.273 UA da câmera — 49× além dos 206 UA que o degrau toca.
    // O disco artístico do Sol (2.269 UA de raio) fica a ≥ 8.044 UA.
    const UA_POR_PC = 206264.80624548031;
    const fronteiraUA = LIMIAR_SISTEMA_SOLAR_PC * UA_POR_PC;
    expect(fronteiraUA).toBeCloseTo(10313.2, 1);
    expect(fronteiraUA - 40).toBeGreaterThan(49 * 206.3);
    expect(fronteiraUA - 2269).toBeGreaterThan(8000);
  });

  it('o far NÃO muda no domínio profundo — o que muda é o quão perto se vê', () => {
    for (const [nome, d] of PROFUNDAS) {
      expect(Object.is(farPlanePc(d), farAntigo(d)), nome).toBe(true);
      expect(farPlanePc(d), nome).toBe(60000);
    }
  });
});

// ============================================================
// O PALCO LOCAL NO NEAR (Onda 6, F0 — D1). Duas promessas, nesta ordem:
//
//  1. PINO DE NEUTRALIDADE: sem corpo resolvido (NaN/ausente), o par
//     (near, far) é BIT-IDÊNTICO (Object.is) ao vigente da Onda 4 — o
//     oráculo é a lei REESCRITA verbatim aqui, no mesmo protocolo do
//     `nearAntigo` lá de cima. É este pino que sustenta o 18/18 da F0
//     e o skyError (a câmera do céu está em casa, onde o piso 1e-8
//     governa).
//  2. COM corpo em quadro: o regime é o termo proporcional (0,4% da
//     distância à superfície), o piso deriva do RAIO (metade dele —
//     rede de segurança ~1e-13 pc para Fobos), e corpo longe não mexe
//     em nada.
// ============================================================
describe('Onda 6, F0 — pino de neutralidade: sem corpo, o par é o vigente', () => {
  /** A lei VIGENTE (Onda 4), verbatim das linhas de antes desta onda. */
  const nearVigente = (d: number) =>
    d >= LIMIAR_SISTEMA_SOLAR_PC
      ? THREE.MathUtils.clamp(d * 0.004, 0.001, 40)
      : Math.max(d * 0.004, DEEP_NEAR_MIN_PC);

  it('nas 18 vistas do gate visual, com NaN explícito E com os argumentos ausentes', () => {
    for (const [nome, d] of [...VISTAS, ...PROFUNDAS]) {
      expect(Object.is(nearPlanePc(d, Number.NaN, Number.NaN), nearVigente(d)), nome).toBe(true);
      expect(Object.is(nearPlanePc(d), nearVigente(d)), nome).toBe(true);
      expect(Object.is(farPlanePc(d), farAntigo(d)), nome).toBe(true);
    }
  });

  it('na faixa inteira, ponto a ponto — inclusive dentro do domínio profundo', () => {
    const AMOSTRA = [...ACIMA];
    for (let i = 1; i <= 500; i++) AMOSTRA.push(i * 1e-7); // 1e-7 → 5e-5 pc
    for (let i = 1; i <= 499; i++) AMOSTRA.push(i * 1e-4); // 1e-4 → 0,0499 pc
    for (const d of AMOSTRA) {
      expect(Object.is(nearPlanePc(d, Number.NaN, Number.NaN), nearVigente(d))).toBe(true);
      expect(Object.is(nearPlanePc(d), nearVigente(d))).toBe(true);
    }
  });

  it('superfície envenenada pela METADE também é neutra — só o par completo age', () => {
    // dSuperficie sem raio (ou raio sem dSuperficie) não é corpo em
    // quadro: é chamador quebrado, e a resposta honesta é o vigente
    for (const d of [0.0007, 0.05, 1]) {
      expect(Object.is(nearPlanePc(d, 1e-6, Number.NaN), nearVigente(d))).toBe(true);
      expect(Object.is(nearPlanePc(d, Number.NaN, 1e-8), nearVigente(d))).toBe(true);
      expect(Object.is(nearPlanePc(d, 1e-6, 0), nearVigente(d))).toBe(true);
      expect(Object.is(nearPlanePc(d, 1e-6, -1), nearVigente(d))).toBe(true);
      expect(Object.is(nearPlanePc(d, Number.POSITIVE_INFINITY, 1e-8), nearVigente(d))).toBe(
        true
      );
    }
  });
});

describe('Onda 6, F0 — com corpo em quadro, a superfície governa o near', () => {
  // Fobos, o menor corpo citado pelo desenho: 11 km = 3,565e-13 pc
  const RAIO_FOBOS_PC = 11 / 149597870.7 / 206264.80624548031;
  // Terra, o primeiro corpo que o palco vai receber (F2a): 6.371 km
  const RAIO_TERRA_PC = 6371 / 149597870.7 / 206264.80624548031;

  it('o REGIME é o termo proporcional: 0,4% da distância à superfície', () => {
    // câmera a 150 UA do Sol com a Terra a 1 UA dela: o near desce dos
    // 0,6 UA do vigente para 0,004 UA — é o que abre o corpo resolvido
    const dSup = 1 * 4.848e-6; // ~1 UA em pc
    const near = nearPlanePc(0.00072722, dSup, RAIO_TERRA_PC);
    expect(near).toBe(dSup * 0.004);
    expect(near).toBeLessThan(nearPlanePc(0.00072722));
  });

  it('o piso é METADE DO RAIO — rede de segurança, nunca regime', () => {
    // câmera TOCANDO a superfície (d=0) e DENTRO do corpo (d<0): o
    // near não zera nem vira negativo — a projeção não aceita nenhum
    for (const dSup of [0, -RAIO_TERRA_PC / 2]) {
      expect(nearPlanePc(0.00072722, dSup, RAIO_TERRA_PC)).toBe(RAIO_TERRA_PC * 0.5);
    }
    // e o piso só assume MUITO perto: ele empata com a proporção em
    // d_superfície = (raio/2)/0,004 = 125 raios — de 126 para fora o
    // regime é o proporcional, como o desenho manda
    expect(nearPlanePc(0.00072722, 126 * RAIO_TERRA_PC, RAIO_TERRA_PC)).toBe(
      126 * RAIO_TERRA_PC * 0.004
    );
  });

  it('para Fobos o piso é ~1,8e-13 pc — a rede de ~1e-13 do desenho da onda', () => {
    const piso = nearPlanePc(0.00072722, 0, RAIO_FOBOS_PC);
    expect(piso).toBeCloseTo(1.78e-13, 15);
    expect(piso).toBeGreaterThan(1e-13 / 2);
    expect(piso).toBeLessThan(1e-12);
    // o piso do Sol (1e-8 pc = 308 mil km) seria 56 mil vezes maior que
    // o corpo inteiro — é por isso que ele deriva do raio agora
    expect(DEEP_NEAR_MIN_PC / RAIO_FOBOS_PC).toBeGreaterThan(10000);
  });

  it('corpo LONGE não mexe em nada: o min() escolhe o vigente', () => {
    // Terra em quadro mas a 100 UA da câmera: 100 UA · 0,4% = 0,4 UA,
    // maior que o near vigente de vistas próximas — o min devolve o de
    // sempre, bit a bit
    const dSup = 100 * 4.848e-6;
    expect(Object.is(nearPlanePc(0.00019393, dSup, RAIO_TERRA_PC), nearPlanePc(0.00019393))).toBe(
      true
    );
  });

  it('o far NUNCA ouve o corpo: o que muda é o quão perto se vê', () => {
    expect(Object.is(farPlanePc(0.00072722), farAntigo(0.00072722))).toBe(true);
  });

  it('o near com corpo continua > 0, finito e abaixo do far', () => {
    for (const [dSol, dSup, raio] of [
      [0.0007, 0, RAIO_FOBOS_PC],
      [0.0007, -1e-9, RAIO_TERRA_PC],
      [0.05, 1e-6, RAIO_TERRA_PC],
      [1, 1e-5, 1e-8],
    ] as const) {
      const near = nearPlanePc(dSol, dSup, raio);
      expect(near).toBeGreaterThan(0);
      expect(Number.isFinite(near)).toBe(true);
      expect(near).toBeLessThan(farPlanePc(dSol));
    }
  });
});

// ============================================================
// AS DUAS PORTAS DE GOSTO — `?tone=` e `?exp=`.
//
// A auditoria de 2026-08-12 achou a lei escrita DUAS vezes no `App.tsx`:
// com guarda no caminho que fala com o engine e sem guarda nenhuma no
// inicializador do estado React, que é quem pinta o HUD. Agora é uma lei
// só, aqui, e o que este bloco cobra é exatamente o lixo que passava.
// ============================================================
describe('?tone= — só um modo que existe de verdade atravessa', () => {
  it('os quatro modos do mapa passam, e devolvem a si mesmos', () => {
    for (const modo of Object.keys(TONE_MAPPINGS) as ToneMapMode[]) {
      expect(lerPortaTom(modo), modo).toBe(modo);
    }
  });

  it('lixo devolve null — inclusive o que a versão sem guarda deixava passar', () => {
    // `?tone=foo` era o caso do relatório: o valor entrava no estado com
    // um `as ToneMapMode` e os quatro rádios ficavam desmarcados
    for (const ruim of ['foo', 'ACES', 'aces ', '', ' ', '0', 'toString', null, undefined]) {
      expect(lerPortaTom(ruim), String(ruim)).toBeNull();
    }
  });

  it('herdado do objeto não é modo: `constructor` e `__proto__` não colam', () => {
    // `in` anda na cadeia de protótipos — se o leitor usasse só ele sem o
    // mapa ser um objeto de dados, isto passaria
    expect(lerPortaTom('constructor')).toBeNull();
    expect(lerPortaTom('__proto__')).toBeNull();
    expect(lerPortaTom('hasOwnProperty')).toBeNull();
  });
});

describe('?exp= — só número finito e positivo atravessa', () => {
  it('valores de uso real passam com o mesmo double', () => {
    for (const bom of ['1.02', '0.5', '4.4', '8', '0.001', '1e2']) {
      expect(lerPortaExposicao(bom), bom).toBe(Number(bom));
    }
  });

  it('`?exp=abc` devolve null — era o "Exposição · NaN" do relatório', () => {
    for (const ruim of ['abc', 'NaN', 'Infinity', '-1', '0', '', ' ', null, undefined]) {
      expect(lerPortaExposicao(ruim), String(ruim)).toBeNull();
    }
  });

  it('e o que sai NUNCA é NaN — a propriedade que o slider precisa', () => {
    for (const qualquer of ['abc', '1.02', '', '-3', null]) {
      const v = lerPortaExposicao(qualquer);
      expect(v === null || (Number.isFinite(v) && v > 0), String(qualquer)).toBe(true);
    }
  });
});

// ============================================================
// A NITIDEZ SEGUE O MONITOR (item 6) — por texto-fonte, porque o vigia
// depende de `window.matchMedia` e de um evento que só o navegador
// dispara de verdade (trocar de tela, mudar o zoom). O que se pina é a
// fiação: a query armada no DPR VIVO, o re-arme, e a separação de
// assuntos — reafiar não é opinião sobre tier.
// ============================================================
describe('a nitidez segue o monitor (item 6)', () => {
  const ENGINE = readFileSync(new URL('./engine.ts', import.meta.url), 'utf8');

  it('o vigia arma a query no DPR vivo, com re-arme de um disparo', () => {
    expect(ENGINE).toContain(
      'matchMedia(\n      `(resolution: ${window.devicePixelRatio}dppx)`\n    )'
    );
    expect(ENGINE).toContain(
      "addEventListener('change', this.aoMudarDpr, { once: true })"
    );
  });

  it('reafiar NÃO passa pelo tier — e o teardown desarma o vigia', () => {
    const vigia = ENGINE.slice(
      ENGINE.indexOf('private aoMudarDpr'),
      ENGINE.indexOf('onTick(')
    );
    expect(vigia).toContain('this.aplicarNitidez();');
    expect(vigia).not.toContain('applyQuality');
    const teardown = ENGINE.slice(ENGINE.indexOf('dispose() {'));
    expect(teardown).toContain(
      "this.vigiaDeDpr?.removeEventListener('change', this.aoMudarDpr);"
    );
  });

  it('o applyQuality e o vigia aplicam a MESMA nitidez (uma função)', () => {
    // o pixel ratio é min(DPR vivo, teto do tier) num lugar só — duas
    // contas divergiriam no primeiro monitor novo
    expect(
      ENGINE.split('Math.min(window.devicePixelRatio || 1,').length - 1
    ).toBe(1);
    const aplicar = ENGINE.slice(
      ENGINE.indexOf('applyQuality(q: QualityLevel'),
      ENGINE.indexOf('private aplicarNitidez()')
    );
    expect(aplicar).toContain('this.aplicarNitidez();');
  });
});

// ============================================================
// A TRAVA DE VAI-E-VOLTA DO AUTO (21/08). A espera (`upgradeCooldown`)
// segura só a SUBIDA, e por isso nunca bastou: um aparelho parado na
// fronteira dos 42 fps caía para alta, cumpria os 15 s, subia de volta
// para cinema no teto do monitor e caía outra vez na PRIMEIRA janela de
// medida — 17,5 s por volta, para sempre, com um mundo inteiro assado a
// cada volta (`aoMedirOQuadro` → `setQuality('auto')` → `reassarMundo`).
//
// Aqui a SEQUÊNCIA de medidas é simulada, que é a única forma de julgar
// uma máquina de estados sem GPU. As duas peças que decidem são as do
// app (`tierMedido` e `TravaDoVaivem`); o simulador só repõe a cola —
// o teto observado, a espera e quem aplica — nas janelas de 2,5 s.
// ============================================================
describe('o Auto não balança para sempre (trava de vai-e-volta)', () => {
  const JANELA = 2.5;
  const ORDEM: QualityLevel[] = ['performance', 'alta', 'cinema'];

  function simular(
    fps: Record<QualityLevel, number>,
    segundos: number,
    comTrava = true
  ) {
    let tier: QualityLevel = 'cinema';
    let peakAvg = 0;
    let espera = 0;
    const trava = new TravaDoVaivem();
    const trocas: { t: number; de: QualityLevel; para: QualityLevel }[] = [];
    // por CONTAGEM de janelas, não somando 2,5 num acumulador: o passo é
    // exato em binário, o acumulador de 240 somas não é
    for (let n = 1; n * JANELA <= segundos; n++) {
      const t = n * JANELA;
      const avg = fps[tier];
      peakAvg = Math.max(peakAvg, avg);
      espera = Math.max(0, espera - JANELA);
      const noTeto =
        peakAvg > 20
        && avg > peakAvg * 0.94
        && espera <= 0
        && !(comTrava && trava.travada);
      const sugestao = tierMedido(tier, avg, noTeto);
      if (sugestao === tier) continue;
      // no simulador toda troca vem da medição — é o que ele simula
      trava.anotar(tier, sugestao, t, true);
      espera = ORDEM.indexOf(sugestao) < ORDEM.indexOf(tier) ? 15 : 10;
      trocas.push({ t, de: tier, para: sugestao });
      tier = sugestao;
    }
    return { tier, trocas, travada: trava.travada };
  }

  /** o aparelho do defeito: cinema não fecha os 42, alta corre no teto */
  const NA_FRONTEIRA: Record<QualityLevel, number> = {
    cinema: 41,
    alta: 60,
    performance: 60,
  };

  it('sem a trava, dez minutos balançam sem parar — uma volta a cada 17,5 s', () => {
    const { trocas } = simular(NA_FRONTEIRA, 600, false);
    expect(trocas.length).toBeGreaterThan(60);
    // ainda balançando no fim dos dez minutos: não é transitório
    expect(trocas[trocas.length - 1].t).toBeGreaterThan(590);
    const subidas = trocas.filter((x) => x.para === 'cinema');
    const intervalos = subidas.slice(1).map((x, i) => x.t - subidas[i].t);
    expect([...new Set(intervalos)]).toEqual([17.5]);
  });

  it('com a trava, a volta se fecha UMA vez e a escada desarma', () => {
    const { tier, trocas, travada } = simular(NA_FRONTEIRA, 600);
    // cai (2,5 s) → sobe quando a espera vence (17,5 s) → cai de novo na
    // janela seguinte (20 s), e aí a trava arma: nunca mais.
    expect(trocas).toEqual([
      { t: 2.5, de: 'cinema', para: 'alta' },
      { t: 17.5, de: 'alta', para: 'cinema' },
      { t: 20, de: 'cinema', para: 'alta' },
    ]);
    expect(travada).toBe(true);
    expect(tier).toBe('alta');
  });

  it('o aparelho que SEGURA o tier não arma nada — nem troca', () => {
    const { tier, trocas, travada } = simular(
      { cinema: 60, alta: 60, performance: 60 },
      600
    );
    expect(trocas).toEqual([]);
    expect(travada).toBe(false);
    expect(tier).toBe('cinema');
  });

  it('o aparelho FRACO desce os dois degraus, tenta voltar uma vez, e para', () => {
    const { tier, trocas, travada } = simular(
      { cinema: 20, alta: 20, performance: 55 },
      600
    );
    expect(trocas.map((x) => x.para)).toEqual([
      'alta',
      'performance',
      'alta',
      'performance',
    ]);
    expect(travada).toBe(true);
    expect(tier).toBe('performance');
  });

  describe('a regra da trava, peça a peça', () => {
    it('subir e cair de volta DENTRO da janela arma', () => {
      const t = new TravaDoVaivem();
      t.anotar('cinema', 'alta', 10, true);
      expect(t.travada).toBe(false);
      t.anotar('alta', 'cinema', 25, true);
      t.anotar('cinema', 'alta', 27.5, true);
      expect(t.travada).toBe(true);
    });

    it('...e FORA dela não arma: engasgo que passou não é fronteira', () => {
      const t = new TravaDoVaivem();
      t.anotar('alta', 'cinema', 25, true);
      t.anotar('cinema', 'alta', 45.1, true);
      expect(t.travada).toBe(false);
    });

    it('duas quedas seguidas, sem subida entre elas, não armam', () => {
      const t = new TravaDoVaivem();
      t.anotar('cinema', 'alta', 5, true);
      t.anotar('alta', 'performance', 10, true);
      expect(t.travada).toBe(false);
    });

    it('a queda que NÃO veio da medição não arma — mexer no painel não é engasgo', () => {
      const t = new TravaDoVaivem();
      t.anotar('alta', 'cinema', 25, false);
      t.anotar('cinema', 'performance', 27.5, false);
      expect(t.travada).toBe(false);
    });

    it('subir REARMA — com a trava armada, subida só pode vir do visitante', () => {
      const t = new TravaDoVaivem();
      t.anotar('alta', 'cinema', 25, true);
      t.anotar('cinema', 'alta', 27.5, true);
      expect(t.travada).toBe(true);
      t.anotar('alta', 'cinema', 300, false);
      expect(t.travada).toBe(false);
    });

    it('troca para o MESMO tier é não-evento', () => {
      const t = new TravaDoVaivem();
      t.anotar('alta', 'cinema', 25, true);
      t.anotar('cinema', 'cinema', 26, true);
      t.anotar('cinema', 'alta', 27, true);
      expect(t.travada).toBe(true);
    });
  });

  // ============================================================
  // O CHÃO DE 20 q/s (item 68, medido em 22/08). A janela somava o `dt`
  // do tick, que vem grampeado em 0,05 s para a animação não saltar um
  // engasgo — e `quadros ÷ tempo grampeado` nunca podia dar menos de
  // 1 ÷ 0,05 = 20. Medido nesta bancada em `q=cinema` a 1200×900: 60
  // quadros em 4,00 s reais (15,0 q/s) com o painel dizendo 20,3.
  // ============================================================
  describe('o medidor conta relógio de parede, não o passo do integrador', () => {
    /** roda `n` quadros de `dtS` e devolve as amostras que fecharam */
    function medir(dtS: number, n: number, janelaS = 2.5) {
      const m = new MedidorDeQuadros();
      const saidas: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = m.amostrar(dtS, janelaS);
        if (a) saidas.push(a.fps);
      }
      return saidas;
    }

    it('quadros de 66 ms dão 15 q/s — abaixo do chão velho de 20', () => {
      const [fps] = medir(1 / 15, 60);
      expect(fps).toBeCloseTo(15, 6);
      // a conta VELHA, verbatim: o mesmo quadro somado com o `dt`
      // grampeado devolve exatamente o chão, e é a mentira do painel
      const grampeado = Math.min(1 / 15, 0.05);
      const nVelho = Math.ceil(2.5 / grampeado) + 1;
      expect(nVelho / (nVelho * grampeado)).toBeCloseTo(20, 6);
    });

    it('quadros de 60 Hz atravessam intocados — o grampo não morde acima de 20', () => {
      const [fps] = medir(1 / 60, 300);
      expect(fps).toBeCloseTo(60, 6);
    });

    // 0,0625 s = 16 q/s, exato em binário: 40 quadros dão 2,5 s cravados
    // e a janela ainda NÃO fecha (o corte é `>`), o 41º fecha
    const PASSO_EXATO = 0.0625;

    it('a janela só fecha DEPOIS de 2,5 s de relógio, e recomeça do zero', () => {
      const m = new MedidorDeQuadros();
      for (let i = 0; i < 40; i++) expect(m.amostrar(PASSO_EXATO)).toBeNull();
      const a = m.amostrar(PASSO_EXATO);
      expect(a).not.toBeNull();
      expect(a!.janelaS).toBeCloseTo(41 * PASSO_EXATO, 9);
      expect(a!.fps).toBeCloseTo(16, 9);
      expect(m.amostrar(PASSO_EXATO)).toBeNull();
    });

    it('`zerar` esvazia a janela — a média do tier que saiu não conta no que entrou', () => {
      const m = new MedidorDeQuadros();
      for (let i = 0; i < 30; i++) m.amostrar(PASSO_EXATO);
      m.zerar();
      for (let i = 0; i < 40; i++) expect(m.amostrar(PASSO_EXATO)).toBeNull();
      expect(m.amostrar(PASSO_EXATO)).not.toBeNull();
    });

    // O CONSERTO NÃO MEXE NO AUTO: os limiares de `QUEDA` são 42 e 34,
    // os dois acima do chão velho. Onde a medida muda (abaixo de 20) ela
    // cai do MESMO lado dos dois; acima, os dois tempos são o mesmo
    // número. Quem mentia era só o mostrador.
    it('as decisões do Auto não mudam: 15 e 20 pedem o mesmo degrau', () => {
      for (const tier of ['cinema', 'alta', 'performance'] as QualityLevel[]) {
        expect(tierMedido(tier, 15, false)).toBe(tierMedido(tier, 20, false));
        expect(tierMedido(tier, 15, true)).toBe(tierMedido(tier, 20, true));
      }
    });

    it('o engine passa o dt REAL ao medidor e o grampeado ao tick', () => {
      const ENGINE = readFileSync(new URL('./engine.ts', import.meta.url), 'utf8');
      const loop = ENGINE.slice(ENGINE.indexOf('const loop = (timestamp'));
      expect(loop).toContain('const dtReal = this.timer.getDelta();');
      expect(loop).toContain('const dt = Math.min(dtReal, GRAMPO_DO_PASSO_S);');
      expect(loop).toContain('this.medidor.amostrar(dtReal, JANELA_DA_MEDIDA_S)');
      expect(loop).toContain('f(t, dt)');
      // e o acumulador de `dt` grampeado não volta por outro nome
      expect(loop).not.toContain('this.fpsAcc');
      expect(loop).not.toContain('this.fpsTimer');
    });
  });

  it('o engine liga a trava nos dois pontos: a medida lê, a troca anota', () => {
    const ENGINE = readFileSync(new URL('./engine.ts', import.meta.url), 'utf8');
    const medida = ENGINE.slice(
      ENGINE.indexOf('const noTeto ='),
      ENGINE.indexOf('const sugestao =')
    );
    expect(medida).toContain('!this.travaDoVaivem.travada');
    const aplicar = ENGINE.slice(
      ENGINE.indexOf('applyQuality(q: QualityLevel'),
      ENGINE.indexOf('private aplicarNitidez()')
    );
    expect(aplicar).toContain('this.travaDoVaivem.anotar(antes, q,');
    expect(aplicar).toContain('const daMedicao = q === this.medicaoAtual?.sugestao;');
  });
});
