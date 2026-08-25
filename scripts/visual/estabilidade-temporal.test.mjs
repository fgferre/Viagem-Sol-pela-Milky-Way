// O ORÁCULO DO MB1 — o miolo do juiz de estabilidade temporal, julgado sem
// navegador nenhum.
//
// A régua inteira não é testável aqui (ela dirige o Chrome), mas TUDO o que
// decide o veredito é: a projeção, a reprojeção, o resíduo, as fontes e o
// julgamento. O molde é o de `luz-do-quadro.test.mjs` e `planeta-pixel.test.mjs`
// — cenas FABRICADAS, com o resultado conhecido de antemão, mais o caso de
// sabotagem que TEM de dar vermelho.
//
// As três perguntas que a Lei faz ao juiz, e que este arquivo responde:
//   1. campo estável sob movimento de câmera → PASSA;
//   2. uma fonte que salta no passo k → REPROVA, e no passo k;
//   3. reprojeção de um pan puro → resíduo ~zero (senão a régua mede o
//      próprio filtro do harness).
import { describe, it, expect } from 'vitest';
import {
  EXCESSO_RESIDUO,
  TOLERANCIA_SALTO_PX,
  LIMIAR_JULGADA,
  FATOR_DE_FASE,
  ALTURA_DE_CALIBRACAO_PX,
  fatorDeFase,
  soleiraJulgada,
  D_MIN_PC,
  PARALAXE_CEGA_PX,
  LIMIAR_FONTE,
  rodar,
  pxPorRad,
  projetarPonto,
  projetarDirecaoMundo,
  direcaoDoPixel,
  paralaxeMaximaPx,
  borrar3x3,
  passaAlta,
  amostrar,
  fontesDoQuadro,
  nucleoCompacto,
  casarFontes,
  residuoDoPar,
  mascaraDoClarao,
  medirPar,
  julgarFamilia,
  julgarCorrida,
} from './estabilidade-temporal.mjs';

// ------------------------------------------------------------
// A BANCADA: um céu sintético e uma câmera que o fotografa
// ------------------------------------------------------------

const W = 160;
const H = 128;
const FOV = 58;

const norm = (v) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};
const cruz = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * O quaternion de uma câmera que olha para `dir` com o topo em +Y — a mesma
 * convenção do three (a câmera olha para −Z do seu próprio espaço).
 */
function quatOlhando(dir) {
  const z = norm(dir.map((v) => -v));
  const x = norm(cruz([0, 1, 0], z));
  const y = cruz(z, x);
  // matriz de rotação em colunas [x y z] → quaternion (a receita do three)
  const m = [x, y, z];
  const traco = m[0][0] + m[1][1] + m[2][2];
  if (traco > 0) {
    const s = 0.5 / Math.sqrt(traco + 1);
    return [(m[1][2] - m[2][1]) * s, (m[2][0] - m[0][2]) * s, (m[0][1] - m[1][0]) * s, 0.25 / s];
  }
  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = 2 * Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]);
    return [0.25 * s, (m[1][0] + m[0][1]) / s, (m[2][0] + m[0][2]) / s, (m[1][2] - m[2][1]) / s];
  }
  if (m[1][1] > m[2][2]) {
    const s = 2 * Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]);
    return [(m[1][0] + m[0][1]) / s, 0.25 * s, (m[2][1] + m[1][2]) / s, (m[2][0] - m[0][2]) / s];
  }
  const s = 2 * Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]);
  return [(m[2][0] + m[0][2]) / s, (m[2][1] + m[1][2]) / s, 0.25 * s, (m[0][1] - m[1][0]) / s];
}

/** uma câmera no ponto `pos` olhando na direção `dir` */
const camera = (pos, dir, fov = FOV) => ({
  pos, quat: quatOlhando(dir), fov, W, H, f: 0,
});

/** o guinar de `rad` em torno de +Y, aplicado à direção de vista −Z */
const olharGuinado = (rad) => [Math.sin(rad), 0, -Math.cos(rad)];

/**
 * O CÉU SINTÉTICO: gaussianas nas direções dadas, desenhadas pela projeção
 * DO JUIZ. Fabricar o quadro com a mesma projeção que ele usa é de propósito:
 * o que se testa aqui é o resíduo, não a álgebra do three.
 */
function fotografar(cam, fontes, { sigma = 2, fundo = 0.02 } = {}) {
  const y = new Float32Array(cam.W * cam.H).fill(fundo);
  for (const f of fontes) {
    const p = projetarDirecaoMundo(cam, f.dir);
    if (p.atras) continue;
    const R = Math.ceil(sigma * 4);
    for (let j = Math.max(0, Math.floor(p.y - R)); j <= Math.min(cam.H - 1, Math.ceil(p.y + R)); j++) {
      for (let i = Math.max(0, Math.floor(p.x - R)); i <= Math.min(cam.W - 1, Math.ceil(p.x + R)); i++) {
        const dx = i + 0.5 - p.x;
        const dy = j + 0.5 - p.y;
        y[j * cam.W + i] += f.brilho * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      }
    }
  }
  for (let i = 0; i < y.length; i++) y[i] = Math.min(1, y[i]);
  return y;
}

/** o céu de referência: cinco fontes espalhadas, todas no infinito */
const CEU = [
  { dir: [0.00, 0.00, -1], brilho: 0.9 },
  { dir: [0.12, 0.09, -1], brilho: 0.8 },
  { dir: [-0.15, 0.05, -1], brilho: 0.7 },
  { dir: [0.08, -0.13, -1], brilho: 0.85 },
  { dir: [-0.10, -0.10, -1], brilho: 0.75 },
].map((f) => ({ ...f, dir: norm(f.dir) }));

// ------------------------------------------------------------

describe('a projeção e a sua inversa — a base de tudo', () => {
  it('pixel → direção → pixel volta ao mesmo lugar', () => {
    const cam = camera([0, 0, 0], [0, 0, -1]);
    for (const [x, y] of [[0.5, 0.5], [80, 64], [159.5, 127.5], [12.3, 99.7]]) {
      const p = projetarDirecaoMundo(cam, direcaoDoPixel(cam, x, y));
      expect(p.x).toBeCloseTo(x, 9);
      expect(p.y).toBeCloseTo(y, 9);
    }
  });

  it('o centro do quadro é o centro do quadro, e o fov é o VERTICAL do three', () => {
    const cam = camera([0, 0, 0], [0, 0, -1]);
    const c = projetarDirecaoMundo(cam, [0, 0, -1]);
    expect(c.x).toBeCloseTo(W / 2, 9);
    expect(c.y).toBeCloseTo(H / 2, 9);
    // a borda de cima está a meio fov vertical do eixo
    const alto = projetarDirecaoMundo(cam, norm([0, Math.tan((FOV * Math.PI) / 360), -1]));
    expect(alto.y).toBeCloseTo(0, 6);
    expect(pxPorRad(cam)).toBeCloseTo(H / (2 * Math.tan((FOV * Math.PI) / 360)), 12);
  });

  it('um PONTO próximo projeta pela posição, não só pela direção', () => {
    const cam = camera([0, 0, 1], [0, 0, -1]);
    // ponto na origem: está exatamente à frente
    const p = projetarPonto(cam, [0, 0, 0]);
    expect(p.x).toBeCloseTo(W / 2, 9);
    expect(p.atras).toBe(false);
    // e o mesmo ponto ATRÁS da câmera não projeta
    expect(projetarPonto(camera([0, 0, -1], [0, 0, -1]), [0, 0, 0]).atras).toBe(true);
  });
});

describe('a paralaxe é DERIVADA — Δ/D em radianos, e nada mais', () => {
  it('um passo de D_MIN_PC deslocaria a estrela mais próxima em 1 radiano', () => {
    const a = camera([0, 0, 0], [0, 0, -1]);
    const b = camera([D_MIN_PC, 0, 0], [0, 0, -1]);
    expect(paralaxeMaximaPx(a, b)).toBeCloseTo(pxPorRad(b), 9);
  });

  it('os passos do sistema solar ficam MUITO abaixo do teto de cegueira', () => {
    // 300 UA → 6 UA em dez degraus: o maior passo é o primeiro
    const UA = 1 / 206264.80624548031;
    const a = camera([0, 0, 300 * UA], [0, 0, -1]);
    const b = camera([0, 0, 300 * UA * Math.pow(6 / 300, 1 / 9)], [0, 0, -1]);
    expect(paralaxeMaximaPx(a, b)).toBeLessThan(PARALAXE_CEGA_PX);
  });
});

describe('as contas do quadro', () => {
  it('o borrão 3×3 preserva um campo constante e o passa-alta o zera', () => {
    const y = new Float32Array(W * H).fill(0.37);
    expect(borrar3x3(y, W, H)[500]).toBeCloseTo(0.37, 6);
    expect(passaAlta(y, W, H)[500]).toBeCloseTo(0, 6);
  });

  it('a amostragem bilinear devolve o valor exato no centro do pixel', () => {
    const y = new Float32Array(4 * 4);
    y[1 * 4 + 2] = 0.8;
    expect(amostrar(y, 4, 4, 2.5, 1.5)).toBeCloseTo(0.8, 6);
    expect(amostrar(y, 4, 4, -3, 2)).toBe(-1);
  });
});

describe('3. reprojeção de um PAN PURO — resíduo ~zero', () => {
  it('duas poses só rodadas descrevem o MESMO céu: o que sobra é reamostragem', () => {
    const camA = camera([0, 0, 0], olharGuinado(0));
    // o passo que desloca o centro em 4 px exatos
    const passo = 4 / pxPorRad(camA);
    const camB = camera([0, 0, 0], olharGuinado(passo));
    const r = residuoDoPar({
      yA: fotografar(camA, CEU),
      yB: fotografar(camB, CEU),
      camA,
      camB,
    });
    // meio degrau de 8 bits de resíduo MÉDIO: é o preço da bilinear, e é
    // cinco vezes menor que a folga com que o juiz reprova
    expect(r.residuoMedio).toBeLessThan(0.5 / 255);
    expect(r.residuoMedio).toBeLessThan(EXCESSO_RESIDUO / 4);
    expect(r.fracaoValida).toBeGreaterThan(0.9);
  });

  it('SEM reprojetar, o mesmo par acusa um resíduo dezenas de vezes maior', () => {
    // a sabotagem que prova que a reprojeção está fazendo alguma coisa: dar
    // ao juiz a MESMA câmera dos dois lados é o "juiz de pixel cru" que a
    // §5.17 proíbe, e ele confunde fluxo legítimo com fervura
    const camA = camera([0, 0, 0], olharGuinado(0));
    // doze pixels de panorâmica: um segundo de câmera lenta, e ainda assim o
    // juiz reprojetado não pisca
    const passo = 12 / pxPorRad(camA);
    const camB = camera([0, 0, 0], olharGuinado(passo));
    const yA = fotografar(camA, CEU);
    const yB = fotografar(camB, CEU);
    const bom = residuoDoPar({ yA, yB, camA, camB });
    const cru = residuoDoPar({ yA, yB, camA, camB: { ...camA } });
    expect(cru.residuoMedio).toBeGreaterThan(bom.residuoMedio * 20);
    expect(cru.residuoMedio).toBeGreaterThan(EXCESSO_RESIDUO);
  });

  it('uma mudança de FOV também é reprojetada — o zoom não é movimento', () => {
    const camA = camera([0, 0, 0], [0, 0, -1], 58);
    const camB = camera([0, 0, 0], [0, 0, -1], 52);
    const r = residuoDoPar({
      yA: fotografar(camA, CEU),
      yB: fotografar(camB, CEU),
      camA,
      camB,
    });
    // a gaussiana MUDA de tamanho na tela com o fov (a fonte é um objeto de
    // tela, não um disco do mundo): o resíduo não é zero, mas é pequeno
    expect(r.residuoMedio).toBeLessThan(EXCESSO_RESIDUO);
  });
});

describe('as FONTES e o seu casamento', () => {
  it('acha as cinco fontes do céu, com o centroide no lugar previsto', () => {
    const cam = camera([0, 0, 0], [0, 0, -1]);
    const fontes = fontesDoQuadro(fotografar(cam, CEU), W, H);
    expect(fontes).toHaveLength(5);
    for (const f of CEU) {
      const p = projetarDirecaoMundo(cam, f.dir);
      const perto = fontes.find((x) => Math.hypot(x.cx - p.x, x.cy - p.y) < 0.5);
      expect(perto, `fonte prevista em ${p.x.toFixed(1)},${p.y.toFixed(1)}`).toBeTruthy();
    }
  });

  it('fonte abaixo do limiar não existe para o juiz', () => {
    const cam = camera([0, 0, 0], [0, 0, -1]);
    const fraca = [{ dir: [0, 0, -1], brilho: LIMIAR_FONTE / 2 }];
    expect(fontesDoQuadro(fotografar(cam, fraca), W, H)).toHaveLength(0);
  });

  it('sob rotação pura, o salto de toda fonte casada é ~zero', () => {
    const camA = camera([0, 0, 0], olharGuinado(0));
    const camB = camera([0, 0, 0], olharGuinado(4 / pxPorRad(camA)));
    const { casados, sumidos } = casarFontes({
      fontesA: fontesDoQuadro(fotografar(camA, CEU), W, H),
      fontesB: fontesDoQuadro(fotografar(camB, CEU), W, H),
      camA,
      camB,
    });
    expect(casados.length).toBeGreaterThanOrEqual(4);
    expect(sumidos.filter((s) => !s.naBorda)).toHaveLength(0);
    // décimos de pixel: o centroide de uma gaussiana cortada no limiar não é
    // exato, e é justamente por isso que a tolerância do juiz é 1 px inteiro
    for (const c of casados) expect(c.salto).toBeLessThan(TOLERANCIA_SALTO_PX / 5);
  });

  it('uma âncora reclama UMA fonte só — a vizinha não herda a paralaxe dela', () => {
    // o caso medido na órbita: um planeta que anda 6 px e uma estrela de fundo
    // a 10 px dele, que não anda nada. Se a âncora valesse para as duas, a
    // estrela seria acusada de saltar os 6 px do planeta.
    const camA = camera([0, 0, 0], [0, 0, -1]);
    const camB = camera([0, 0, 0], [0, 0, -1]);
    const P = pxPorRad(camA);
    const planetaA = [0, 0, -1];
    const planetaB = [6 / P, 0, -1];
    const estrela = norm([-10 / P, 0, -1]);
    const yA = fotografar(camA, [{ dir: norm(planetaA), brilho: 0.95 }, { dir: estrela, brilho: 0.9 }]);
    const yB = fotografar(camB, [{ dir: norm(planetaB), brilho: 0.95 }, { dir: estrela, brilho: 0.9 }]);
    const r = casarFontes({
      fontesA: fontesDoQuadro(yA, W, H),
      fontesB: fontesDoQuadro(yB, W, H),
      camA, camB,
      ancoras: [{
        nome: 'planeta',
        emA: projetarDirecaoMundo(camA, norm(planetaA)),
        emB: projetarDirecaoMundo(camB, norm(planetaB)),
      }],
    });
    const porVia = Object.fromEntries(r.casados.map((c) => [c.via, c.salto]));
    expect(Object.keys(porVia).sort()).toEqual(['ancora:planeta', 'infinito']);
    for (const salto of Object.values(porVia)) expect(salto).toBeLessThan(TOLERANCIA_SALTO_PX);
  });

  it('duas âncoras na MESMA mancha calam as duas — bloco fundido não tem identidade', () => {
    // a Lua e a Terra grudadas: uma componente só, dois pontos 3D dentro dela
    const camA = camera([0, 0, 0], [0, 0, -1]);
    const camB = camera([0, 0, 0], [0, 0, -1]);
    const P = pxPorRad(camA);
    const bloco = [{ dir: [0, 0, -1], brilho: 0.95 }, { dir: norm([4 / P, 0, -1]), brilho: 0.9 }];
    const emA = projetarDirecaoMundo(camA, [0, 0, -1]);
    const perto = projetarDirecaoMundo(camA, norm([4 / P, 0, -1]));
    const r = casarFontes({
      fontesA: fontesDoQuadro(fotografar(camA, bloco), W, H),
      fontesB: fontesDoQuadro(fotografar(camB, bloco), W, H),
      camA, camB,
      ancoras: [
        { nome: 'terra', emA, emB: emA },
        { nome: 'lua', emA: perto, emB: perto },
      ],
    });
    expect(r.casados).toEqual([]);
    expect(r.sumidos).toEqual([]);
  });

  it('uma ÂNCORA prevê pelo ponto 3D, e não pela hipótese de infinito', () => {
    // a câmera anda 0,2 pc de lado; um ponto a 1 pc à frente sai muito do
    // lugar, e só a âncora sabe disso
    const camA = camera([0, 0, 0], [0, 0, -1]);
    const camB = camera([0.2, 0, 0], [0, 0, -1]);
    const ponto = [0, 0, -1];
    const perto = { dir: norm([-0.2, 0, -1]), brilho: 0.9 };
    const yA = fotografar(camA, [{ dir: norm(ponto), brilho: 0.9 }]);
    const yB = fotografar(camB, [perto]);
    const ancora = {
      nome: 'perto',
      emA: projetarPonto(camA, ponto),
      emB: projetarPonto(camB, ponto),
    };
    const semAncora = casarFontes({
      fontesA: fontesDoQuadro(yA, W, H), fontesB: fontesDoQuadro(yB, W, H), camA, camB,
    });
    const comAncora = casarFontes({
      fontesA: fontesDoQuadro(yA, W, H), fontesB: fontesDoQuadro(yB, W, H),
      camA, camB, ancoras: [ancora],
    });
    // sem âncora o ponto próximo "sumiu" (a predição de infinito erra o alvo);
    // com âncora ele casa em cima da predição
    expect(semAncora.casados).toHaveLength(0);
    expect(comAncora.casados).toHaveLength(1);
    expect(comAncora.casados[0].via).toBe('ancora:perto');
    expect(comAncora.casados[0].salto).toBeLessThan(TOLERANCIA_SALTO_PX);
  });
});

describe('quem NÃO entra no veredito de identidade, e por quê', () => {
  const camA = camera([0, 0, 0], olharGuinado(0));
  const camB = camera([0, 0, 0], olharGuinado(6 / pxPorRad(camA)));
  /** o casamento de duas cenas dadas, sem âncora */
  const casar = (fA, fB, ancoras = []) =>
    casarFontes({
      fontesA: fontesDoQuadro(fotografar(camA, fA), W, H),
      fontesB: fontesDoQuadro(fotografar(camB, fB), W, H),
      camA, camB, ancoras,
    });

  it('fonte fraca demais (pico entre o contorno e a soleira de fase) não é julgada', () => {
    const fraca = norm([0.05, 0.05, -1]);
    const desviada = norm([0.05 + 6 / pxPorRad(camA), 0.05, -1]);
    const brilho = (LIMIAR_FONTE + LIMIAR_JULGADA) / 2;
    expect(brilho).toBeGreaterThan(LIMIAR_FONTE);
    expect(brilho).toBeLessThan(LIMIAR_JULGADA);
    const r = casar([{ dir: fraca, brilho }], [{ dir: desviada, brilho }]);
    expect(r.casados).toEqual([]);
    expect(r.sumidos).toEqual([]);
    // e a MESMA fonte, forte, é julgada e acusada
    const forte = casar([{ dir: fraca, brilho: 0.9 }], [{ dir: desviada, brilho: 0.9 }]);
    expect(forte.casados[0].salto).toBeGreaterThan(TOLERANCIA_SALTO_PX);
  });

  it('fonte cortada pela borda não é julgada — o recorte puxa o centroide', () => {
    // no topo do quadro, com metade do halo fora
    const noTopo = norm([0, Math.tan((FOV * Math.PI) / 360) * 0.99, -1]);
    const [f] = fontesDoQuadro(fotografar(camA, [{ dir: noTopo, brilho: 0.9 }], { sigma: 5 }), W, H);
    expect(f.naBorda).toBe(true);
    expect(casar([{ dir: noTopo, brilho: 0.9 }], [{ dir: noTopo, brilho: 0.9 }]).casados).toEqual([]);
    // e a MESMA fonte no meio do quadro é julgada
    const meio = fontesDoQuadro(fotografar(camA, [{ dir: [0, 0, -1], brilho: 0.9 }], { sigma: 5 }), W, H);
    expect(meio[0].naBorda).toBe(false);
  });

  it('fonte do CAMPO que muda de brilho além da fase da grade cala a acusação', () => {
    const onde = norm([0.05, 0.05, -1]);
    const desviada = norm([0.05 + 6 / pxPorRad(camA), 0.05, -1]);
    const r = casar([{ dir: onde, brilho: 0.95 }], [{ dir: desviada, brilho: 0.62 }]);
    expect(r.casados[0].mudouDeBrilho).toBe(true);
    expect(r.casados[0].salto).toBeGreaterThan(TOLERANCIA_SALTO_PX);
    const v = julgarFamilia({
      nome: 'x',
      passos: [{ k: 1, paralaxePx: 0, fracaoValida: 1, residuoMedio: 0, bandaAlta: 0, ...r }],
      piso: { residuoMedio: 0, bandaAlta: 0 },
    });
    expect(v.erros).toEqual([]);
  });

  it('mas uma ÂNCORA que muda de brilho SEGUE julgada — é a fronteira de promoção', () => {
    // o mesmo caso de cima, com a fonte declarada como ponto 3D conhecido: na
    // promoção ponto→corpo o brilho muda de propósito e a posição não pode
    const ponto = [0, 0, -1];
    const desviada = norm([6 / pxPorRad(camA), 0, -1]);
    const ancora = {
      nome: 'sol',
      emA: projetarPonto(camA, ponto),
      emB: projetarPonto(camB, ponto),
    };
    const r = casar([{ dir: norm(ponto), brilho: 0.95 }], [{ dir: desviada, brilho: 0.62 }], [ancora]);
    expect(r.casados[0].via).toBe('ancora:sol');
    expect(r.casados[0].mudouDeBrilho).toBe(true);
    const v = julgarFamilia({
      nome: 'fronteiraSol',
      passos: [{ k: 1, paralaxePx: 0, fracaoValida: 1, residuoMedio: 0, bandaAlta: 0, ...r }],
      piso: { residuoMedio: 0, bandaAlta: 0 },
    });
    expect(v.erros.some((e) => e.includes('RE-SEMEIA'))).toBe(true);
  });

  it('a soleira de fase é o inverso da perda de pico da grade, e nada mais', () => {
    expect(LIMIAR_JULGADA).toBeCloseTo(LIMIAR_FONTE / FATOR_DE_FASE, 12);
    expect(FATOR_DE_FASE).toBeCloseTo(Math.exp(-0.25 / (0.85 * 0.85)), 1);
  });

  it('a soleira SEGUE A ALTURA DO QUADRO — a PSF do app encolhe com a janela', () => {
    // na altura de calibração ela é a de sempre
    expect(fatorDeFase(ALTURA_DE_CALIBRACAO_PX)).toBeCloseTo(FATOR_DE_FASE, 12);
    expect(soleiraJulgada(ALTURA_DE_CALIBRACAO_PX)).toBeCloseTo(LIMIAR_JULGADA, 12);
    // e no quadro de 613 px que MB1 media até 25/08 (item 81) ela vai a 1,17:
    // acima do máximo de um quadro de 8 bits, ou seja SEM população
    expect(soleiraJulgada(613)).toBeGreaterThan(1);
    expect(soleiraJulgada(613)).toBeCloseTo(1.17, 2);
  });

  it('e uma soleira sem população não julga NINGUÉM em vez de acusar todo mundo', () => {
    const onde = norm([0.05, 0.05, -1]);
    const desviada = norm([0.05 + 6 / pxPorRad(camA), 0.05, -1]);
    const cena = (b) => fontesDoQuadro(fotografar(camA, [{ dir: onde, brilho: b }]), W, H);
    const cenaB = (b) => fontesDoQuadro(fotografar(camB, [{ dir: desviada, brilho: b }]), W, H);
    const com = (julgada) => casarFontes({
      fontesA: cena(0.9), fontesB: cenaB(0.9), camA, camB, julgada,
    });
    // com a soleira calibrada a fonte de pico 0,9 é julgada e acusada
    expect(com(LIMIAR_JULGADA).casados[0].salto).toBeGreaterThan(TOLERANCIA_SALTO_PX);
    // com a soleira do quadro de 613 px ninguém entra no veredito — e é isso
    // que impede o juiz de cobrar identidade de quem a grade sozinha apaga
    expect(com(soleiraJulgada(613)).casados).toEqual([]);
    expect(com(soleiraJulgada(613)).sumidos).toEqual([]);
  });

  it('um TRAÇO não tem centroide que se possa cobrar — nem para a âncora', () => {
    // a linha de órbita do quadro real, reproduzida: uma diagonal de 1 px que
    // atravessa a cena inteira. No quadro B ela esmaece nas pontas e sobra o
    // meio — que foi o que a família `fronteiraTerra` fotografou (n=1602 → 90)
    const linha = (de, ate) => {
      const y = new Float32Array(W * H).fill(0.02);
      for (let i = de; i <= ate; i++) {
        const j = Math.round((i * (H - 20)) / W) + 6;
        if (j >= 0 && j < H) y[j * W + i] = 0.8;
      }
      return y;
    };
    const cam = camera([0, 0, 0], [0, 0, -1]);
    const fA = fontesDoQuadro(linha(4, W - 5), W, H);
    const fB = fontesDoQuadro(linha(60, W - 5), W, H);
    const traco = fA.find((f) => f.nMeia > 50);
    expect(traco).toBeDefined();
    expect(nucleoCompacto(traco)).toBe(false);
    // uma MANCHA do mesmo tamanho de núcleo passa: é o platô do Sol
    expect(nucleoCompacto({ x0: 0, x1: 12, y0: 0, y1: 12, nMeia: traco.nMeia })).toBe(true);
    // a âncora fica em cima do traço, como a Lua fica em cima da própria órbita
    const ancora = {
      nome: 'moon',
      emA: { x: traco.cx, y: traco.cy, atras: false },
      emB: { x: traco.cx, y: traco.cy, atras: false },
    };
    const r = casarFontes({ fontesA: fA, fontesB: fB, camA: cam, camB: cam, ancoras: [ancora] });
    // o traço se partiu e o centroide dele andou muito — e mesmo assim
    // ninguém é acusado, porque não há posição a cobrar de uma linha
    const centroideAndou = Math.hypot(
      traco.cx - fB.find((f) => f.nMeia > 50).cx,
      traco.cy - fB.find((f) => f.nMeia > 50).cy
    );
    expect(centroideAndou).toBeGreaterThan(TOLERANCIA_SALTO_PX * 10);
    expect(r.casados.some((c) => c.via.startsWith('ancora:'))).toBe(false);
    expect(r.casados).toEqual([]);
    expect(r.sumidos).toEqual([]);
  });

  it('o veredito DECLARA a soleira quando ela não é a de calibração', () => {
    const passo = {
      k: 1, paralaxePx: 0, fracaoValida: 1, residuoMedio: 0, bandaAlta: 0,
      casados: [], sumidos: [], julgada: soleiraJulgada(613),
    };
    const v = julgarFamilia({
      nome: 'pan', passos: [passo], piso: { residuoMedio: 0, bandaAlta: 0 },
    });
    expect(v.erros).toEqual([]);
    expect(v.suspensos.join(' ')).toContain('soleira de fase 1.17');
    expect(v.suspensos.join(' ')).toContain('ACIMA DE 1,00');
    // e na calibração ele não enche o veredito de declaração inútil
    const calibrado = julgarFamilia({
      nome: 'pan',
      passos: [{ ...passo, julgada: LIMIAR_JULGADA }],
      piso: { residuoMedio: 0, bandaAlta: 0 },
    });
    expect(calibrado.suspensos).toEqual([]);
  });
});

describe('a MÁSCARA do clarão — o que o resíduo por pixel não julga', () => {
  it('cobre a mancha acesa em volta do centro e nada além dela', () => {
    const cam = camera([0, 0, 0], [0, 0, -1]);
    const y = fotografar(cam, [{ dir: [0, 0, -1], brilho: 1 }], { sigma: 6 });
    const m = mascaraDoClarao(y, W, H, [projetarDirecaoMundo(cam, [0, 0, -1])]);
    expect(m[Math.floor(H / 2) * W + Math.floor(W / 2)]).toBe(1);
    expect(m[2 * W + 2]).toBe(0);
    const cobertos = m.reduce((a, b) => a + b, 0);
    expect(cobertos).toBeGreaterThan(100);
    expect(cobertos).toBeLessThan(W * H * 0.4);
  });
});

// ------------------------------------------------------------
// AS DUAS PERGUNTAS QUE FECHAM O JUIZ
// ------------------------------------------------------------

/** um percurso de pan: N poses, o céu fotografado em cada uma */
function percursoDePan(n, deformar = () => CEU) {
  const base = camera([0, 0, 0], olharGuinado(0));
  const passo = 4 / pxPorRad(base);
  const quadros = [];
  for (let k = 0; k < n; k++) {
    const cam = camera([0, 0, 0], olharGuinado(k * passo));
    cam.f = k * 2;
    quadros.push({ cam, y: fotografar(cam, deformar(k)) });
  }
  return quadros;
}

/** os passos de um percurso, medidos pelo MESMO caminho da corrida real */
const passosDe = (quadros) =>
  quadros.slice(1).map((q, i) => medirPar(quadros[i], q, i + 1));

describe('1. campo ESTÁVEL sob movimento — o juiz PASSA', () => {
  it('oito passos de pan, nenhuma fervura e nenhum salto', () => {
    const quadros = percursoDePan(9);
    const passos = passosDe(quadros);
    const piso = medirPar(quadros[0], { ...quadros[0] }, 'piso');
    const v = julgarFamilia({ nome: 'pan', passos, piso });
    expect(v.erros).toEqual([]);
    expect(v.suspensos).toEqual([]);
    expect(v.passos).toBe(8);
    expect(julgarCorrida([v]).passa).toBe(true);
  });

  it('e o piso de um par PARADO é exatamente zero — nada muda sozinho aqui', () => {
    const quadros = percursoDePan(2);
    const piso = medirPar(quadros[0], { ...quadros[0] }, 'piso');
    expect(piso.residuoMedio).toBe(0);
    expect(piso.bandaAlta).toBe(0);
  });
});

describe('2. uma fonte que SALTA no passo k — o juiz REPROVA, e no passo k', () => {
  const K = 5;
  /** no passo K a primeira fonte muda de lugar 5 px, sem motivo físico */
  const reSemeada = (k) =>
    k < K
      ? CEU
      : [{ ...CEU[0], dir: norm([CEU[0].dir[0] + 5 / pxPorRad(camera([0, 0, 0], [0, 0, -1])), CEU[0].dir[1], CEU[0].dir[2]]) }, ...CEU.slice(1)];

  it('a acusação sai com o número do passo e a palavra RE-SEMEIA', () => {
    const quadros = percursoDePan(9, reSemeada);
    const v = julgarFamilia({
      nome: 'pan',
      passos: passosDe(quadros),
      piso: medirPar(quadros[0], { ...quadros[0] }, 'piso'),
    });
    const reSemeia = v.erros.filter((e) => e.includes('RE-SEMEIA'));
    expect(reSemeia.length).toBeGreaterThan(0);
    expect(reSemeia.every((e) => e.startsWith(`pan passo ${K}`))).toBe(true);
    expect(julgarCorrida([v]).passa).toBe(false);
  });

  it('e o passo SEGUINTE já não acusa: a fonte saltou uma vez, não ficou torta', () => {
    const quadros = percursoDePan(9, reSemeada);
    const v = julgarFamilia({
      nome: 'pan',
      passos: passosDe(quadros),
      piso: medirPar(quadros[0], { ...quadros[0] }, 'piso'),
    });
    expect(v.erros.some((e) => e.startsWith(`pan passo ${K + 1}`))).toBe(false);
  });

  it('um salto MENOR que a tolerância não acusa — a régua tem folga declarada', () => {
    const cam = camera([0, 0, 0], [0, 0, -1]);
    const quase = (k) =>
      k < K
        ? CEU
        : [{ ...CEU[0], dir: norm([CEU[0].dir[0] + 0.4 / pxPorRad(cam), CEU[0].dir[1], CEU[0].dir[2]]) }, ...CEU.slice(1)];
    const quadros = percursoDePan(9, quase);
    const v = julgarFamilia({
      nome: 'pan',
      passos: passosDe(quadros),
      piso: medirPar(quadros[0], { ...quadros[0] }, 'piso'),
    });
    expect(v.erros.filter((e) => e.includes('RE-SEMEIA'))).toEqual([]);
  });
});

describe('a fonte que SOME, e a que ferve', () => {
  it('fonte forte que desaparece longe da borda reprova', () => {
    const K = 4;
    const quadros = percursoDePan(7, (k) => (k === K ? CEU.slice(1) : CEU));
    const v = julgarFamilia({
      nome: 'pan',
      passos: passosDe(quadros),
      piso: medirPar(quadros[0], { ...quadros[0] }, 'piso'),
    });
    expect(v.erros.some((e) => e.includes('SUMIU') && e.startsWith(`pan passo ${K}`))).toBe(true);
  });

  it('um campo que FERVE (ruído fino novo a cada quadro) reprova por resíduo', () => {
    const quadros = percursoDePan(5);
    // sabotagem: xadrez de 1 px que troca de fase a cada quadro — é o
    // aliasing clássico que a §5.17 chama de fervura
    for (let k = 1; k < quadros.length; k++) {
      const { y, cam } = quadros[k];
      for (let j = 0; j < cam.H; j++) {
        for (let i = 0; i < cam.W; i++) {
          y[j * cam.W + i] = Math.min(1, y[j * cam.W + i] + ((i + j + k) % 2) * 0.08);
        }
      }
    }
    const v = julgarFamilia({
      nome: 'pan',
      passos: passosDe(quadros),
      piso: medirPar(quadros[0], { ...quadros[0] }, 'piso'),
    });
    expect(v.erros.some((e) => e.includes('FERVE'))).toBe(true);
    expect(v.erros.some((e) => e.includes('BANDA ALTA'))).toBe(true);
  });
});

describe('o que o juiz SUSPENDE em vez de reprovar', () => {
  it('paralaxe acima do teto tira o resíduo por pixel do veredito', () => {
    const passos = [{
      k: 1, paralaxePx: PARALAXE_CEGA_PX + 1, fracaoValida: 1,
      residuoMedio: 1, bandaAlta: 1, casados: [], sumidos: [],
    }];
    const v = julgarFamilia({ nome: 'aproxEstrela', passos, piso: { residuoMedio: 0, bandaAlta: 0 } });
    expect(v.erros).toEqual([]);
    expect(v.suspensos[0]).toContain('SUSPENSO');
    expect(v.suspensos[0]).toContain('paralaxe');
  });

  it('mas a IDENTIDADE segue valendo mesmo com o resíduo suspenso', () => {
    const passos = [{
      k: 1, paralaxePx: PARALAXE_CEGA_PX + 1, fracaoValida: 1,
      residuoMedio: 1, bandaAlta: 1,
      casados: [{ salto: PARALAXE_CEGA_PX + 1 + TOLERANCIA_SALTO_PX + 5, via: 'ancora:Sirius' }],
      sumidos: [],
    }];
    const v = julgarFamilia({ nome: 'aproxEstrela', passos, piso: { residuoMedio: 0, bandaAlta: 0 } });
    expect(v.erros.some((e) => e.includes('RE-SEMEIA'))).toBe(true);
  });

  it('o clarão comendo o quadro suspende o resíduo, e diz que foi ele', () => {
    const passos = [{
      k: 3, paralaxePx: 0, fracaoValida: 0.05,
      residuoMedio: 1, bandaAlta: 1, casados: [], sumidos: [],
    }];
    const v = julgarFamilia({ nome: 'aproxSol', passos, piso: { residuoMedio: 0, bandaAlta: 0 } });
    expect(v.erros).toEqual([]);
    expect(v.suspensos[0]).toContain('fora do clarão');
  });
});

describe('o piso é REFERÊNCIA, nunca acusação', () => {
  it('um piso alto sobe a barra em vez de reprovar sozinho', () => {
    const passos = [{
      k: 1, paralaxePx: 0, fracaoValida: 1,
      residuoMedio: 0.05, bandaAlta: 0.2, casados: [], sumidos: [],
    }];
    const semPiso = julgarFamilia({ nome: 'x', passos, piso: { residuoMedio: 0, bandaAlta: 0 } });
    const comPiso = julgarFamilia({ nome: 'x', passos, piso: { residuoMedio: 0.05, bandaAlta: 0.2 } });
    expect(semPiso.erros.length).toBe(2);
    expect(comPiso.erros).toEqual([]);
  });
});

describe('o quaternion da bancada bate com o do juiz', () => {
  it('rodar(quatOlhando(d), [0,0,-1]) devolve d', () => {
    for (const d of [[0, 0, -1], [1, 0, 0], norm([0.3, 0.2, -1])]) {
      const v = rodar(quatOlhando(d), [0, 0, -1]);
      expect(v[0]).toBeCloseTo(d[0], 9);
      expect(v[1]).toBeCloseTo(d[1], 9);
      expect(v[2]).toBeCloseTo(d[2], 9);
    }
  });
});
