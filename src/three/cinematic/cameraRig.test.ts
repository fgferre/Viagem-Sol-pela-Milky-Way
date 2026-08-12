// ============================================================
// Oráculo do VOO NO DOMÍNIO PROFUNDO (Onda 4, fase 2 — decisão D6) e
// da varredura do ROTEIRO INTEIRO.
//
// Duas afirmações:
//  1. acima do limiar do domínio profundo a velocidade de entrada do
//     voo livre é o MESMO double de antes da onda (oráculo: a fórmula
//     antiga reescrita aqui, do commit em que ela vivia inline no
//     `syncFromCamera`);
//  2. o FILME INTEIRO fica acima desse limiar — e por isso as três
//     consequências da fase (fade do disco, planos de corte e
//     velocidade) saem bit a bit idênticas em cada instante dele.
//
// A varredura do roteiro mora AQUI, e não em `lodStellar.test.ts`,
// porque quem sabe as posições é o `Journey`, o vizinho deste arquivo.
// Não se instancia `FreeRoam` (o construtor pede canvas e `window`): o
// que se testa é a conta, que é pura — mesmo precedente de
// `stellarBody.test.ts`.
// ============================================================
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEEP_LIMIAR_PC, discWorldFade, solWorldFade } from '../world/lodStellar';
import { farPlanePc, nearPlanePc } from '../core/engine';

// STUB MÍNIMO DE `window`: `journey.ts` importa `world/galaxy.ts`, que lê
// `window.location.search` NO TOPO do módulo (os knobs de `?tune=`), e o
// vitest roda em `node`. Por isso os três imports abaixo são DINÂMICOS —
// import estático é içado e rodaria ANTES do stub, e `cameraRig.ts`
// também cai nessa rede (ele importa o `Journey`). Nada aqui depende dos
// knobs: busca vazia é o que o app carrega sem parâmetro nenhum.
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const {
  ERROS_ATE_DESISTIR,
  EstadoDaCaptura,
  RODA_MIN_PC_POR_S,
  VOO_MIN_PC_POR_S,
  pisoDaRoda,
  velocidadeDeVoo,
} = await import('./cameraRig');
const { Journey } = await import('./journey');
const { GAL } = await import('../world/galaxy');

/** A fórmula ANTIGA, verbatim da linha que vivia no `syncFromCamera`. */
const velocidadeAntiga = (d: number) => THREE.MathUtils.clamp(d * 0.02, 2, 600);
const nearAntigo = (d: number) => THREE.MathUtils.clamp(d * 0.004, 0.001, 40);
const farAntigo = (d: number) => THREE.MathUtils.clamp(d * 12, 60000, 400000);

/** As onze vistas por `?pos=` do `ab-identidade`, |pos| em pc. */
const VISTAS_POS: readonly (readonly [string, number])[] = [
  ['soldisco', 0.1],
  ['solrampa', 0.25],
  ['solestouro', 0.32],
  ['solestrela', 0.5],
  ['hero200', 352.67182647915047],
  ['hero600', 752.6718049107726],
  ['hero950', 1102.671756611173],
  ['hero8', 144.67177658942327],
  ['ua500', 0.0024241],
  ['ua150', 0.00072722],
  ['ua40', 0.00019393],
];

/** 0,05 → 40.000 pc */
const ACIMA: number[] = [];
for (let i = 0; i <= 2000; i++) ACIMA.push(DEEP_LIMIAR_PC + i * 0.0001);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 0.05);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 40);

const UA_POR_PC = 206264.80624548031;

describe('velocidadeDeVoo — acima do limiar é a de sempre (D6)', () => {
  it('bate o oráculo antigo em toda a faixa de 0,05 a 40.000 pc', () => {
    for (const d of ACIMA) {
      expect(Object.is(velocidadeDeVoo(d), velocidadeAntiga(d))).toBe(true);
    }
  });

  it('nas oito vistas por `?pos=` que ficam fora do domínio profundo', () => {
    for (const [nome, d] of VISTAS_POS.filter(([, d]) => d >= DEEP_LIMIAR_PC)) {
      expect(Object.is(velocidadeDeVoo(d), velocidadeAntiga(d)), nome).toBe(true);
    }
  });

  it('os três regimes do clamp antigo seguem inteiros: piso, proporção, teto', () => {
    expect(velocidadeDeVoo(DEEP_LIMIAR_PC)).toBe(2); // piso
    expect(velocidadeDeVoo(1)).toBe(2); // piso ainda
    expect(velocidadeDeVoo(500)).toBe(10); // proporção
    expect(velocidadeDeVoo(30000)).toBe(600); // teto
  });
});

describe('velocidadeDeVoo — abaixo do limiar o piso de 2 pc/s SAI', () => {
  it('nas três vistas do domínio profundo a escala é a do lugar', () => {
    for (const [nome, d] of VISTAS_POS.filter(([, d]) => d < DEEP_LIMIAR_PC)) {
      expect(velocidadeDeVoo(d), nome).toBe(d * 0.02);
      expect(velocidadeDeVoo(d), nome).toBeLessThan(velocidadeAntiga(d));
    }
    // em UA/s, para leitura humana: a 150 UA de casa o voo entra a 3 UA/s
    // (o antigo entrava a 2 pc/s = 412.530 UA/s — o sistema solar inteiro
    // atravessado em menos de 1 ms)
    // (as vistas cravam a distância arredondada, daí a 5ª casa)
    expect(velocidadeDeVoo(0.00072722) * UA_POR_PC).toBeCloseTo(3, 5);
    expect(velocidadeDeVoo(0.00019393) * UA_POR_PC).toBeCloseTo(0.8, 4);
    expect(velocidadeAntiga(0.00072722) * UA_POR_PC).toBeCloseTo(412529.6, 1);
  });

  it('é a MESMA lei de 2% da distância por segundo, agora sem interrupção', () => {
    for (let i = 1; i <= 4999; i++) {
      const d = i * 1e-5; // 1e-5 → 0,04999 pc
      expect(velocidadeDeVoo(d)).toBe(d * 0.02);
    }
    // e a lei é contínua ATRAVÉS do limiar quando lida como proporção:
    // o degrau é do PISO, não dela
    expect(velocidadeDeVoo(DEEP_LIMIAR_PC - 1e-15)).toBeCloseTo(0.001, 12);
    expect(velocidadeDeVoo(DEEP_LIMIAR_PC)).toBe(2);
  });

  it('a guarda mínima é 1e-9 pc/s e só age praticamente na origem', () => {
    expect(VOO_MIN_PC_POR_S).toBe(1e-9);
    expect(velocidadeDeVoo(0)).toBe(VOO_MIN_PC_POR_S);
    expect(velocidadeDeVoo(1e-9)).toBe(VOO_MIN_PC_POR_S);
    // fronteira: 1e-9/0,02 = 5e-8 pc = 0,0103 UA (1,5 milhão de km)
    expect(velocidadeDeVoo(0.01 / UA_POR_PC)).toBe(VOO_MIN_PC_POR_S);
    expect(velocidadeDeVoo(1 / UA_POR_PC)).toBe((1 / UA_POR_PC) * 0.02);
    expect(velocidadeDeVoo(0)).toBeGreaterThan(0); // nunca trava
  });

  it('é monotônica: chegar mais perto nunca acelera o voo', () => {
    let anterior = 0;
    for (let i = 1; i <= 20000; i++) {
      const v = velocidadeDeVoo(i * 1e-5);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
  });
});

describe('pisoDaRoda — o OUTRO grampo de velocidade (D6)', () => {
  it('fora do domínio profundo é o 0,01 pc/s de sempre', () => {
    expect(RODA_MIN_PC_POR_S).toBe(0.01);
    expect(pisoDaRoda(DEEP_LIMIAR_PC)).toBe(0.01);
    expect(pisoDaRoda(0.1)).toBe(0.01);
    expect(pisoDaRoda(8000)).toBe(0.01);
  });

  it('dentro dele cede à guarda: sem isso a D6 seria letra morta', () => {
    // 0,01 pc/s são 2.063 UA/s — a roda devolveria num tique tudo o que
    // a velocidade proporcional tinha acabado de dar
    expect(RODA_MIN_PC_POR_S * UA_POR_PC).toBeCloseTo(2062.6, 1);
    expect(pisoDaRoda(0.00072722)).toBe(VOO_MIN_PC_POR_S);
    expect(pisoDaRoda(0.049)).toBe(VOO_MIN_PC_POR_S);
    // e a roda continua podendo desacelerar até parar de fato: 0,85^n
    let v = velocidadeDeVoo(0.00072722);
    for (let i = 0; i < 50; i++) v = Math.max(v * 0.85, pisoDaRoda(0.00072722));
    expect(v).toBeLessThan(velocidadeDeVoo(0.00072722) * 1e-3);
  });
});

describe('O ROTEIRO INTEIRO — o filme não encosta no domínio profundo', () => {
  // A varredura que o desenho da onda pede: t = 0 → 321 s, e em cada
  // instante as TRÊS consequências da fase julgadas contra os oráculos
  // antigos. O `updateClip` recebe `min(dHome, dGC)` (director.ts), a
  // velocidade recebe `dHome` (|posição|), e o fade do disco também.
  const j = new Journey();
  const AMOSTRAS: { t: number; dHome: number; dClip: number }[] = [];
  for (let i = 0; i <= 32100; i++) {
    const t = i * 0.01;
    const s = j.at(t);
    const dHome = s.pos.length();
    AMOSTRAS.push({ t, dHome, dClip: Math.min(dHome, s.pos.distanceTo(GAL.GC_POS)) });
  }

  it('a duração é 321 s e o piso do filme é 0,0631506 pc, em t=0', () => {
    expect(j.duration).toBe(321);
    const piso = AMOSTRAS.reduce((m, a) => Math.min(m, a.dHome), Infinity);
    expect(piso).toBe(0.06315061361538779);
    expect(AMOSTRAS.find((a) => a.dHome === piso)?.t).toBe(0);
  });

  it('nem dHome nem min(dHome, dGC) descem do limiar em instante nenhum', () => {
    // a rasante de Sgr A* é o que poderia surpreender aqui: lá quem
    // alimenta o near é o centro galáctico, não o Sol. Mínimo medido:
    // 1,397 pc em t≈229,3 — 28× o limiar.
    const pisoClip = AMOSTRAS.reduce((m, a) => Math.min(m, a.dClip), Infinity);
    expect(pisoClip).toBeGreaterThan(DEEP_LIMIAR_PC);
    const pisoGC = AMOSTRAS.reduce(
      (m, a) => Math.min(m, j.at(a.t).pos.distanceTo(GAL.GC_POS)),
      Infinity
    );
    expect(pisoGC).toBeCloseTo(1.3972179743, 8);
  });

  it('em cada instante: o fade do disco é o de antes, bit a bit', () => {
    for (const a of AMOSTRAS) {
      expect(Object.is(solWorldFade(a.dHome), discWorldFade(a.dHome))).toBe(true);
    }
  });

  it('em cada instante: o par (near, far) é o de antes, bit a bit', () => {
    for (const a of AMOSTRAS) {
      expect(Object.is(nearPlanePc(a.dClip), nearAntigo(a.dClip))).toBe(true);
      expect(Object.is(farPlanePc(a.dClip), farAntigo(a.dClip))).toBe(true);
    }
  });

  it('em cada instante: a velocidade de voo é a de antes, bit a bit', () => {
    for (const a of AMOSTRAS) {
      expect(Object.is(velocidadeDeVoo(a.dHome), velocidadeAntiga(a.dHome))).toBe(true);
    }
  });
});

// ============================================================
// O BACKOFF DA CAPTURA DE PONTEIRO (Onda 5, F5).
//
// A defesa 1 das quatro: um navegador que NEGA a captura (política de
// permissão, sandbox, gesto que não conta) negaria para sempre, e o
// botão do opt-in ficaria oferecendo o que não pode entregar. A regra
// mora num estado sem DOM justamente para caber aqui — o vitest da casa
// roda em `node`, e regra que só se conferisse com um `document` na mesa
// não seria conferida.
// ============================================================
describe('EstadoDaCaptura — o backoff das três negativas', () => {
  it('nasce oferecendo: sem erro e sem lock, vale pedir', () => {
    const e = new EstadoDaCaptura();
    expect(e.ativa).toBe(false);
    expect(e.desistiu).toBe(false);
    expect(e.podePedir).toBe(true);
  });

  it('DUAS negativas ainda deixam pedir; a TERCEIRA desiste', () => {
    const e = new EstadoDaCaptura();
    for (let i = 1; i < ERROS_ATE_DESISTIR; i++) {
      e.errou();
      expect(e.desistiu).toBe(false);
      expect(e.podePedir).toBe(true);
    }
    e.errou();
    expect(e.erros).toBe(ERROS_ATE_DESISTIR);
    expect(e.desistiu).toBe(true);
    expect(e.podePedir).toBe(false);
  });

  it('desistiu até SAIR DO MODO: erro a mais não reabre, soltar não reabre, sair do modo reabre', () => {
    const e = new EstadoDaCaptura();
    for (let i = 0; i < ERROS_ATE_DESISTIR + 4; i++) e.errou();
    expect(e.podePedir).toBe(false);
    // soltar o ponteiro NÃO reabre: soltar acontece o tempo todo (Esc,
    // alt-tab), e reabrir ali devolveria o pedido por clique para sempre
    e.soltou();
    expect(e.podePedir).toBe(false);
    // sair do modo, sim — é o escopo do doador (`surfaceModeActive`
    // virando falso). O `pointerlockerror` dispara em negativas
    // TRANSITÓRIAS, e sem esta volta três ciclos de Esc-e-clicar
    // matavam o opt-in até a recarga, num navegador que suporta tudo.
    e.saiuDoModo();
    expect(e.erros).toBe(0);
    expect(e.desistiu).toBe(false);
    expect(e.podePedir).toBe(true);
  });

  it('um lock que dá certo ZERA a conta — negativas são SEGUIDAS', () => {
    const e = new EstadoDaCaptura();
    e.errou();
    e.errou();
    e.trancou();
    expect(e.erros).toBe(0);
    expect(e.ativa).toBe(true);
    // capturado, não se pede de novo: o pedido duplicado é o que o
    // navegador contaria como erro
    expect(e.podePedir).toBe(false);
    e.soltou();
    expect(e.podePedir).toBe(true);
    // e as duas negativas de antes não somam com as de agora
    e.errou();
    e.errou();
    expect(e.desistiu).toBe(false);
  });
});
