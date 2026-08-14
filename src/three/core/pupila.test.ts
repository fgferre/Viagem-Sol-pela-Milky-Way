// A PUPILA — a lei pura da auto-exposição (Onda 8).
//
// Três coisas são cobradas aqui, e a primeira é a que mais importa: a
// NEUTRALIDADE DE BIT. A pupila nasce desligada e, mesmo ligada, é inerte em
// toda distância em que nenhuma fonte estoura o quadro. Se essa inércia não for
// EXATA, ela deixa de ser uma peça que se pode montar sem mexer no filme.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ALVO_DE_PICO,
  KAPPA_DA_PUPILA,
  PISO_DO_GANHO,
  PUPILA_PADRAO,
  Pupila,
  TETO_DO_GANHO,
  deslocamentoDeExpoM0,
  ganhoDaPupila,
  lerPortaDaPupila,
  picoDaPsf,
  stopsDaPupila,
} from './pupila';

const RAIZ = resolve(__dirname, '../../..');

describe('1. picoDaPsf — o espelho da lei da GPU', () => {
  it('é a MESMA conta do GLSL_STAR_PSF, lida do texto do shader', () => {
    // varredura textual, no método declarado da casa: se a PSF mudar em
    // `common.ts` e este espelho não, o alarme toca AQUI e não numa vista.
    const glsl = readFileSync(resolve(RAIZ, 'src/three/shaders/common.ts'), 'utf8');
    expect(glsl).toContain('float sigma = sigmaPx * screenH / 1080.0;');
    expect(glsl).toContain('float E = pow(10.0, -0.4 * (m - expoM0));');
    expect(glsl).toContain('peak = E / (6.2831853 * sigma * sigma);');
  });

  it('em m = expoM0 o fluxo é 1 — o ponto-zero da exposição da casa', () => {
    // E = 10^(-0,4·0) = 1, logo pico = 1/(2πσ²) com σ = sigmaPx·screenH/1080
    const sigma = (0.85 * 1080) / 1080;
    expect(picoDaPsf(3.5, 3.5, 0.85, 1080)).toBeCloseTo(1 / (6.2831853 * sigma * sigma), 12);
  });

  it('cai 100× a cada 5 magnitudes — a definição de magnitude', () => {
    const a = picoDaPsf(0, 3.5, 0.85, 900);
    const b = picoDaPsf(5, 3.5, 0.85, 900);
    expect(a / b).toBeCloseTo(100, 6);
  });

  it('o Sol a 1 UA deposita ~4e11 numa tela de 900 px — o número que estoura', () => {
    // m = −0,15 + 5·log10(d_pc), d = 1 UA = 4,84813681e-6 pc  ⇒  m = −26,72.
    // 4e11 num buffer HALF-FLOAT, que satura em 65.504: o ponto do Sol já chega
    // ao buffer como INFINITO. É a medição que decidiu que a pupila entra no
    // shader e não num passe de pós.
    const m = -0.15 + 5 * Math.log10(4.84813681e-6);
    const pico = picoDaPsf(m, 3.5, 0.85, 900);
    expect(pico).toBeGreaterThan(1e11);
    expect(pico).toBeGreaterThan(65504);
  });
});

describe('2. ganhoDaPupila — a lei, e a inércia exata', () => {
  it('fonte abaixo do alvo devolve 1 EXATO — a pupila não toca o que não estoura', () => {
    // `toBe` e não `toBeCloseTo`: a igualdade tem de ser de BIT. Um ULP aqui
    // seria um ULP em `expoM0`, e daí em cada uma das 328.749 estrelas.
    expect(ganhoDaPupila(ALVO_DE_PICO - 1)).toBe(1);
    expect(ganhoDaPupila(ALVO_DE_PICO)).toBe(1);
    expect(ganhoDaPupila(0.001)).toBe(1);
  });

  it('entrada envenenada devolve 1 — nunca NaN, nunca apaga a cena', () => {
    expect(ganhoDaPupila(Number.NaN)).toBe(1);
    expect(ganhoDaPupila(Number.POSITIVE_INFINITY)).toBe(1);
    expect(ganhoDaPupila(-5)).toBe(1);
    expect(ganhoDaPupila(0)).toBe(1);
  });

  it('com kappa = 1 a fonte pousa EXATAMENTE no alvo — adaptação total', () => {
    for (const pico of [200, 1e4, 1e8, 4e11]) {
      expect(pico * ganhoDaPupila(pico)).toBeCloseTo(ALVO_DE_PICO, 6);
    }
  });

  it('com kappa < 1 a fonte continua ganhando brilho ao se aproximar', () => {
    const p = { ...PUPILA_PADRAO, kappa: 0.85 };
    const perto = 4e11 * ganhoDaPupila(4e11, p);
    const longe = 2.4e4 * ganhoDaPupila(2.4e4, p);
    // é o que separa a pupila de um TETO: com teto os dois seriam iguais
    expect(perto).toBeGreaterThan(longe);
    // e a lei fechada: pico_exibido = alvo^κ · pico^(1−κ)
    expect(perto).toBeCloseTo(Math.pow(ALVO_DE_PICO, 0.85) * Math.pow(4e11, 0.15), 0);
  });

  it('nunca ABRE além do teto, mesmo com alvo alto — ver (a) do cabeçalho', () => {
    expect(ganhoDaPupila(1e-9)).toBe(TETO_DO_GANHO);
    expect(TETO_DO_GANHO).toBe(1);
  });

  it('o piso segura uma fonte absurda em vez de zerar o quadro', () => {
    expect(ganhoDaPupila(1e300)).toBe(PISO_DO_GANHO);
    expect(ganhoDaPupila(1e300)).toBeGreaterThan(0);
  });

  it('kappa 0 desliga a lei — devolve o teto, sem passar pela potência', () => {
    expect(ganhoDaPupila(1e12, { ...PUPILA_PADRAO, kappa: 0 })).toBe(1);
  });
});

describe('3. deslocamentoDeExpoM0 — o atuador', () => {
  it('ganho 1 desloca 0 EXATO: é isso que mantém o campo intocado', () => {
    expect(deslocamentoDeExpoM0(1)).toBe(0);
    // e somado a expoM0 devolve o MESMO bit
    expect(3.5 + deslocamentoDeExpoM0(1)).toBe(3.5);
  });

  it('deslocar expoM0 é multiplicar o fluxo pelo ganho — a identidade da lei', () => {
    // é o teorema em que a pupila inteira se apoia:
    //   E(m, expoM0 + 2,5·log10 g) = E(m, expoM0) · g
    for (const g of [0.5, 1e-3, 1e-10]) {
      const base = picoDaPsf(-20, 3.5, 0.85, 900);
      const comPupila = picoDaPsf(-20, 3.5 + deslocamentoDeExpoM0(g), 0.85, 900);
      expect(comPupila / base).toBeCloseTo(g, 12);
    }
  });

  it('entrada envenenada não desloca nada', () => {
    expect(deslocamentoDeExpoM0(Number.NaN)).toBe(0);
    expect(deslocamentoDeExpoM0(0)).toBe(0);
    expect(deslocamentoDeExpoM0(-1)).toBe(0);
  });

  it('stops: 0 com a pupila aberta, negativo quando ela fecha', () => {
    expect(stopsDaPupila(1)).toBe(0);
    expect(stopsDaPupila(0.5)).toBe(-1);
    expect(stopsDaPupila(0.25)).toBe(-2);
    expect(stopsDaPupila(Number.NaN)).toBe(0);
  });
});

describe('4. Pupila — a adaptação no tempo', () => {
  it('nasce ABERTA: ganho 1, 0 stops', () => {
    const p = new Pupila();
    expect(p.valor).toBe(1);
    expect(p.stopsAplicados).toBe(0);
  });

  it('instantâneo SALTA — é o que permite a bancada julgá-la sob ?shot=', () => {
    const p = new Pupila();
    expect(p.passo(1e-6, 0.016, true)).toBe(1e-6);
    expect(p.stopsAplicados).toBeCloseTo(Math.log2(1e-6), 12);
  });

  it('fecha mais depressa do que abre — a assimetria do olho', () => {
    const fechando = new Pupila();
    const abrindo = new Pupila();
    abrindo.passo(0.01, 0, true); // parte de fechada
    // um passo de 0,1 s rumo a alvos simétricos em log
    const dFecha = Math.abs(Math.log2(fechando.passo(0.01, 0.1)) - 0);
    const dAbre = Math.abs(Math.log2(abrindo.passo(1, 0.1)) - Math.log2(0.01));
    expect(dFecha).toBeGreaterThan(dAbre);
  });

  it('converge para o alvo e PARA — sem tremor depois de chegar', () => {
    const p = new Pupila();
    for (let i = 0; i < 2000; i++) p.passo(0.001, 0.05);
    const a = p.passo(0.001, 0.05);
    const b = p.passo(0.001, 0.05);
    expect(a).toBeCloseTo(0.001, 9);
    expect(b).toBe(a);
  });

  it('dt envenenado não move a pupila (guarda NaN, como a rampa da casa)', () => {
    const p = new Pupila();
    p.passo(0.01, Number.NaN);
    expect(p.valor).toBe(1);
  });

  it('dt gigante é grampeado — aba que volta do background não dá salto', () => {
    const a = new Pupila();
    const b = new Pupila();
    a.passo(0.01, 100);
    b.passo(0.01, 0.1);
    expect(a.valor).toBe(b.valor);
  });

  it('reabrir devolve ao nascimento', () => {
    const p = new Pupila();
    p.passo(1e-8, 0, true);
    p.reabrir();
    expect(p.valor).toBe(1);
    expect(p.stopsAplicados).toBe(0);
  });
});

describe('5. a porta ?pupila= — e o padrão DESLIGADO', () => {
  it('ausente é DESLIGADA: sem a porta, o filme é o de hoje bit a bit', () => {
    // o porquê está escrito no docstring de `lerPortaDaPupila`, e é MEDIDO:
    // ligada, a pupila descobre que malha e ponto do Sol estão a ~26 mag um do
    // outro, e o handoff a 3,6 UA passa a ESCURECER quando a câmera se aproxima
    expect(lerPortaDaPupila(null)).toBeNull();
    expect(lerPortaDaPupila(undefined)).toBeNull();
    expect(lerPortaDaPupila('')).toBeNull();
    expect(lerPortaDaPupila('0')).toBeNull();
  });

  it('`1` liga com o padrão da casa', () => {
    expect(lerPortaDaPupila('1')).toEqual(PUPILA_PADRAO);
    expect(PUPILA_PADRAO.alvo).toBe(ALVO_DE_PICO);
    expect(PUPILA_PADRAO.kappa).toBe(KAPPA_DA_PUPILA);
  });

  it('`A,K` liga com alvo e kappa explícitos — é assim que a bancada varre', () => {
    expect(lerPortaDaPupila('30,0.85')).toEqual({ ...PUPILA_PADRAO, alvo: 30, kappa: 0.85 });
    expect(lerPortaDaPupila('250')).toEqual({ ...PUPILA_PADRAO, alvo: 250, kappa: KAPPA_DA_PUPILA });
  });

  it('porta torta cai no padrão LIGADO e nunca lança', () => {
    for (const ruim of ['abc', '-4,0.5', '100,7', '100,-1', 'NaN']) {
      expect(lerPortaDaPupila(ruim), ruim).toEqual(PUPILA_PADRAO);
    }
  });

  it('a lição do ?tone=constructor: chave de Object não vira parâmetro', () => {
    expect(lerPortaDaPupila('constructor')).toEqual(PUPILA_PADRAO);
    expect(lerPortaDaPupila('__proto__')).toEqual(PUPILA_PADRAO);
  });
});
