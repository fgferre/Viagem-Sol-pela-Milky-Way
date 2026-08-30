// Serve: chão — o MB1 mede o mesmo resíduo em cena fabricada: passa estável, reprova o salto no passo certo e suspende o que não deve julgar
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
  mascaraDasOrbitas,
  recortarNoQuadro,
  RAIO_DA_LINHA_PX,
  FRACAO_NA_LINHA,
  censoDaFaixa,
  medirPar,
  julgarFamilia,
  julgarCorrida,
  SIGMA_DA_PSF_PX,
} from './estabilidade-temporal.mjs';
import { censoDaAmplitude, pisoDeSobrevivencia, sigmaNaAltura } from './fase-da-grade.mjs';
import { SIGMA_PX, ALTURA_DE_CALIBRACAO_DO_SIGMA_PX } from '../../src/three/luzDaCasa';

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

  it('o guarda de BRILHO também segue a altura — não sobra metade digitada', () => {
    // `mudouDeBrilho` compara a razão dos picos contra o FATOR DE FASE. Ele
    // tem de vir da mesma altura que a soleira, senão metade da aritmética
    // continua na constante de 1080 enquanto a outra metade segue a janela.
    const onde = norm([0.05, 0.05, -1]);
    const desviada = norm([0.05 + 6 / pxPorRad(camA), 0.05, -1]);
    const fA = fontesDoQuadro(fotografar(camA, [{ dir: onde, brilho: 0.95 }]), W, H);
    const fB = fontesDoQuadro(fotografar(camB, [{ dir: desviada, brilho: 0.72 }]), W, H);
    const com = (julgada) =>
      casarFontes({ fontesA: fA, fontesB: fB, camA, camB, julgada }).casados[0];
    const r = com(LIMIAR_FONTE).pico / com(LIMIAR_FONTE).picoAntes;
    expect(r).toBeGreaterThan(0.3);
    expect(r).toBeLessThan(1);
    // uma soleira que implica um fator ACIMA da razão cala a acusação…
    expect(com(LIMIAR_FONTE / (r + 0.05)).mudouDeBrilho).toBe(true);
    // …e uma que implica um fator ABAIXO dela deixa a acusação de pé
    expect(com(LIMIAR_FONTE / (r - 0.05)).mudouDeBrilho).toBe(false);
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

  it('os dois números da PSF são os de `luzDaCasa.ts` — cópia com pino', () => {
    // o harness roda em node puro e não importa TypeScript, então redeclara os
    // dois; é ESTE teste que impede a cópia de divergir do original (o mesmo
    // arranjo do vizinho `luz-do-quadro.test.mjs`)
    expect(SIGMA_DA_PSF_PX).toBe(SIGMA_PX);
    expect(ALTURA_DE_CALIBRACAO_PX).toBe(ALTURA_DE_CALIBRACAO_DO_SIGMA_PX);
  });

  it('a bancada de fases REPRODUZ a soleira derivada, nas duas alturas', () => {
    // `fase-da-grade.mjs` mede o piso de sobrevivência por bisseção, com o
    // canto (0,5; 0,5) incluído; ele TEM de bater com `LIMIAR_FONTE/fator`,
    // senão a soleira é um número escolhido e não uma conta
    for (const altura of [ALTURA_DE_CALIBRACAO_PX, 613]) {
      const medido = pisoDeSobrevivencia(sigmaNaAltura(altura), 8);
      expect(medido).toBeCloseTo(soleiraJulgada(altura), 3);
    }
  });

  it('e os números que o cabeçalho cita são os que a bancada dá', () => {
    const s85 = sigmaNaAltura(ALTURA_DE_CALIBRACAO_PX);
    // a 0,85 uma fonte de amplitude 0,55 SOME em alguma fase (a afirmação
    // "nenhuma ≥ 0,55 some" era falsa, e caiu na auditoria de 25/08)
    expect(censoDaAmplitude(0.55, s85).fracaoQueSome).toBeGreaterThan(0);
    // e a soleira, essa, não some em nenhuma
    expect(censoDaAmplitude(soleiraJulgada(ALTURA_DE_CALIBRACAO_PX), s85).fracaoQueSome).toBe(0);
    // o pico LIDO chega à amplitude inteira na fase centrada — nunca a 0,72
    expect(censoDaAmplitude(1.0, s85).picoMax).toBeCloseTo(1.0, 6);
    // e no quadro de 613 px até a amplitude cheia some em alguma fase
    expect(censoDaAmplitude(1.0, sigmaNaAltura(613)).fracaoQueSome).toBeGreaterThan(0);
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
    // as pontas ficam DENTRO da margem de borda, como a elipse real: uma
    // linha que encosta na borda já sairia por `naBorda`, e o que se testa
    // aqui é a regra do traço, não a da borda
    const fA = fontesDoQuadro(linha(20, W - 21), W, H);
    const fB = fontesDoQuadro(linha(70, W - 21), W, H);
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
    // e a exclusão é CONTADA — quem sai do veredito aparece no veredito
    expect(r.tracos).toBe(1);
  });

  it('JUIZ QUE NÃO CONSEGUE MEDIR REPROVA — descalibrado não sai verde', () => {
    const passo = {
      k: 1, paralaxePx: 0, fracaoValida: 1, residuoMedio: 0, bandaAlta: 0,
      casados: [], sumidos: [], julgada: soleiraJulgada(613),
    };
    // um quadro de 613 px: nada a acusar, e MESMO ASSIM tem de reprovar —
    // ausência de acusação numa régua que não vale não é aprovação
    const v = julgarFamilia({
      nome: 'pan', passos: [passo], piso: { residuoMedio: 0, bandaAlta: 0 }, altura: 613,
    });
    expect(v.erros.length).toBe(1);
    expect(v.erros[0]).toContain('DESCALIBRADO');
    expect(v.erros[0]).toContain('1.1709');
    expect(v.erros[0]).toContain('ACIMA DE 1,00');
    expect(v.descalibrada).toBe(v.erros[0]);
    // e a corrida inteira REPROVA por causa dele
    const corrida = julgarCorrida([v]);
    expect(corrida.passa).toBe(false);
    expect(corrida.descalibradas).toEqual([v.erros[0]]);

    // na altura de calibração ele não enche o veredito de declaração inútil
    const calibrado = julgarFamilia({
      nome: 'pan',
      passos: [{ ...passo, julgada: LIMIAR_JULGADA }],
      piso: { residuoMedio: 0, bandaAlta: 0 },
      altura: ALTURA_DE_CALIBRACAO_PX,
    });
    expect(calibrado.erros).toEqual([]);
    expect(calibrado.descalibrada).toBe(null);
    expect(julgarCorrida([calibrado]).passa).toBe(true);
  });

  it('a altura que julga é a MEDIDA, não a pedida — soleira na mão também reprova', () => {
    // altura certa, soleira trocada por fora: o juiz não aceita
    const v = julgarFamilia({
      nome: 'pan',
      passos: [{
        k: 1, paralaxePx: 0, fracaoValida: 1, residuoMedio: 0, bandaAlta: 0,
        casados: [], sumidos: [], julgada: 0.9,
      }],
      piso: { residuoMedio: 0, bandaAlta: 0 },
      altura: ALTURA_DE_CALIBRACAO_PX,
    });
    expect(v.erros[0]).toContain('DESCALIBRADO');
    expect(v.erros[0]).toContain('0.9000');
  });

  it('a exclusão por TRAÇO é contada e declarada, nunca silenciosa', () => {
    const v = julgarFamilia({
      nome: 'fronteiraTerra',
      passos: [{
        k: 1, paralaxePx: 0, fracaoValida: 1, residuoMedio: 0, bandaAlta: 0,
        casados: [], sumidos: [], julgada: LIMIAR_JULGADA, tracos: 2,
      }],
      piso: { residuoMedio: 0, bandaAlta: 0 },
      altura: ALTURA_DE_CALIBRACAO_PX,
    });
    expect(v.tracos).toBe(2);
    // vai em `declaracoes`, que o rodapé imprime INTEIRO — e não em
    // `suspensos`, que se trunca em dez linhas
    expect(v.declaracoes.join(' ')).toContain('2 fonte(s) fora do veredito');
    expect(v.suspensos).toEqual([]);
    expect(v.erros).toEqual([]);
    expect(julgarCorrida([v]).declaracoes).toEqual(v.declaracoes);
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
// A FAIXA DO INSTRUMENTO — pedaço de linha de órbita continua sendo linha
// ------------------------------------------------------------

/**
 * Uma "camada de órbitas" de bancada: um laço de `n` vértices num círculo de
 * raio `r` no plano z = −1, no formato que `LER_CAMERA` entrega (o laço em
 * coordenadas do objeto mais a matriz que o leva ao mundo).
 */
function lacoDeBancada({ r = 0.25, n = 128, centro = [0, 0, -1] } = {}) {
  const p = new Array(n * 3);
  for (let k = 0; k < n; k++) {
    p[k * 3] = r * Math.cos((k * 2 * Math.PI) / n);
    p[k * 3 + 1] = r * Math.sin((k * 2 * Math.PI) / n);
    p[k * 3 + 2] = 0;
  }
  // coluna-maior do three: os 12 primeiros são a base, os 3 seguintes a posição
  const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, centro[0], centro[1], centro[2], 1];
  return { n, p, m };
}

/** o céu com um ARCO desenhado ao longo do laço, do vértice `de` ao `ate` */
function fotografarArco(cam, laco, de, ate, brilho = 0.62, fundo = 0.02) {
  const y = new Float32Array(cam.W * cam.H).fill(fundo);
  const e = laco.m;
  for (let k = de; k <= ate; k++) {
    const i = ((k % laco.n) + laco.n) % laco.n;
    const [x, yy, z] = [laco.p[i * 3], laco.p[i * 3 + 1], laco.p[i * 3 + 2]];
    const p = projetarPonto(cam, [
      e[0] * x + e[4] * yy + e[8] * z + e[12],
      e[1] * x + e[5] * yy + e[9] * z + e[13],
      e[2] * x + e[6] * yy + e[10] * z + e[14],
    ]);
    if (p.atras) continue;
    // um traço FINO, como a fita de 1,25 px CSS do app
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const ix = Math.round(p.x - 0.5) + di;
        const iy = Math.round(p.y - 0.5) + dj;
        if (ix < 0 || iy < 0 || ix >= cam.W || iy >= cam.H) continue;
        const peso = Math.exp(-(di * di + dj * dj) / 1.2);
        y[iy * cam.W + ix] = Math.max(y[iy * cam.W + ix], fundo + brilho * peso);
      }
    }
  }
  return y;
}

describe('a FAIXA DO INSTRUMENTO — o pedaço de linha de órbita (item 70)', () => {
  const cam = camera([0, 0, 0], [0, 0, -1]);
  const laco = lacoDeBancada();

  it('a faixa nasce da geometria da camada, e sem camada ela não existe', () => {
    const m = mascaraDasOrbitas(cam, [laco]);
    expect(m).not.toBe(null);
    // o traçado passa pelo topo do círculo projetado e NÃO pelo centro dele
    const topo = projetarPonto(cam, [0, 0.25, -1]);
    const centro = projetarPonto(cam, [0, 0, -1]);
    expect(m[Math.round(topo.y - 0.5) * W + Math.round(topo.x - 0.5)]).toBe(1);
    expect(m[Math.round(centro.y - 0.5) * W + Math.round(centro.x - 0.5)]).toBe(0);
    // ELA É FINA, e o teto MORDE: nesta bancada a faixa mede 3,03% do quadro a
    // raio 1 e 5,25% · 7,48% · 9,71% a raio 2 · 3 · 4. O teto de 5% reprova
    // qualquer alargamento do raio — o de 20% que esteve aqui não reprovava
    // nem o raio 4, e um pino que não morde é decoração.
    expect(m.reduce((a, b) => a + b, 0)).toBeLessThan(W * H * 0.05);
    expect(mascaraDasOrbitas(cam, [laco], 2).reduce((a, b) => a + b, 0))
      .toBeGreaterThan(W * H * 0.05);
    // E É POR CONSTRUÇÃO que `?noorbitas=1` não muda nada: sem fita acesa a
    // lista chega vazia e a máscara não existe
    expect(mascaraDasOrbitas(cam, [])).toBe(null);
    expect(mascaraDasOrbitas(cam, null)).toBe(null);
  });

  it('o segmento que não toca o quadro é recortado, e o que toca sobrevive', () => {
    expect(recortarNoQuadro(-500, -500, -400, -400, W, H, 0)).toBe(null);
    const dentro = recortarNoQuadro(-500, 10, 500, 10, W, H, 0);
    expect(dentro[0]).toBeCloseTo(0, 6);
    expect(dentro[2]).toBeCloseTo(W - 1, 6);
  });

  it('PEDAÇO DE ARCO sai do veredito de identidade, e a saída é CONTADA', () => {
    // o defeito real, reproduzido: a cessão corta o laço, o arco entra e sai do
    // quadro, e o pedaço TROCA de identidade entre um quadro e o outro
    const yA = fotografarArco(cam, laco, 0, 24);
    const yB = fotografarArco(cam, laco, 8, 32);
    const linhaA = mascaraDasOrbitas(cam, [laco]);
    const fA = fontesDoQuadro(yA, W, H, { mascaraLinha: linhaA });
    const fB = fontesDoQuadro(yB, W, H);
    const pedaco = fA.find((f) => f.pico >= LIMIAR_JULGADA && !f.naBorda);
    expect(pedaco).toBeDefined();
    // ele é COMPACTO — a regra do traço não o pega, e é esse o buraco
    expect(nucleoCompacto(pedaco)).toBe(true);
    expect(pedaco.fracLinha).toBeGreaterThanOrEqual(FRACAO_NA_LINHA);
    const r = casarFontes({ fontesA: fA, fontesB: fB, camA: cam, camB: cam });
    expect(r.instrumentos).toBeGreaterThan(0);
    expect(r.sumidos).toEqual([]);
    // SABOTAGEM: sem a faixa, o mesmo quadro volta a acusar
    const semFaixa = casarFontes({
      fontesA: fontesDoQuadro(yA, W, H), fontesB: fB, camA: cam, camB: cam,
    });
    expect(semFaixa.instrumentos).toBe(0);
    expect(semFaixa.casados.length + semFaixa.sumidos.length).toBeGreaterThan(0);
  });

  it('SABOTAGEM 1 — um salto REAL de céu continua reprovando com a faixa ligada', () => {
    // a exclusão não pode engolir o mundo: uma fonte GENUÍNA, longe do traçado,
    // que salta 1,7 px sem motivo físico, tem de continuar sendo acusada
    const onde = norm([0.28, -0.20, -1]);
    const desviada = norm([0.28 + 1.7 / pxPorRad(cam), -0.20, -1]);
    const comArco = (dir) => {
      const y = fotografarArco(cam, laco, 0, 24);
      const p = projetarDirecaoMundo(cam, dir);
      for (let j = -6; j <= 6; j++) {
        for (let i = -6; i <= 6; i++) {
          const ix = Math.round(p.x - 0.5) + i;
          const iy = Math.round(p.y - 0.5) + j;
          if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
          const dx = ix + 0.5 - p.x;
          const dy = iy + 0.5 - p.y;
          y[iy * W + ix] = Math.min(1, y[iy * W + ix] + 0.9 * Math.exp(-(dx * dx + dy * dy) / 8));
        }
      }
      return y;
    };
    const linhaA = mascaraDasOrbitas(cam, [laco]);
    const r = casarFontes({
      fontesA: fontesDoQuadro(comArco(onde), W, H, { mascaraLinha: linhaA }),
      fontesB: fontesDoQuadro(comArco(desviada), W, H),
      camA: cam, camB: cam,
    });
    // a faixa está LIGADA (calou o arco) e mesmo assim o salto é acusado
    expect(r.instrumentos).toBeGreaterThan(0);
    const acusada = r.casados.find((c) => c.salto > TOLERANCIA_SALTO_PX);
    expect(acusada).toBeDefined();
    expect(acusada.salto).toBeGreaterThan(1.5);
  });

  it('SABOTAGEM 3 — um arco FORA de qualquer elipse da camada NÃO é excluído', () => {
    // o mesmo pedaço de arco, desenhado onde a camada não desenhou nada: a
    // exclusão é geométrica, e sem geometria embaixo ela não vale
    // o laço da CAMADA fica no centro (raio 0,25); o intruso é um arco do mesmo
    // feitio desenhado longe dele, mas BEM dentro do quadro
    const outroLugar = lacoDeBancada({ r: 0.25, centro: [0, 0, -1] });
    const forasteiro = lacoDeBancada({ r: 0.09, centro: [0.40, 0.28, -1] });
    const yA = fotografarArco(cam, forasteiro, 0, 24);
    const linhaA = mascaraDasOrbitas(cam, [outroLugar]);
    const fA = fontesDoQuadro(yA, W, H, { mascaraLinha: linhaA });
    const intruso = fA.find((f) => f.pico >= LIMIAR_JULGADA && !f.naBorda);
    expect(intruso).toBeDefined();
    expect(intruso.fracLinha).toBe(0);
    const r = casarFontes({
      fontesA: fA,
      fontesB: fontesDoQuadro(fotografarArco(cam, forasteiro, 8, 32), W, H),
      camA: cam, camB: cam,
    });
    expect(r.instrumentos).toBe(0);
    expect(r.casados.length + r.sumidos.length).toBeGreaterThan(0);
  });

  it('A ÂNCORA É INTOCÁVEL — um corpo sobre a PRÓPRIA elipse continua julgado', () => {
    // é a razão de o item 70 existir: o planeta está sobre a linha por
    // construção algébrica. Se a faixa o calasse, a fronteira de promoção que o
    // §5.20 manda interrogar sairia do veredito em silêncio.
    const noLaco = [0.25, 0, -1];
    const naLinha = projetarPonto(cam, noLaco);
    const corpo = (dx) => {
      const y = fotografarArco(cam, laco, 0, 120);
      for (let j = -5; j <= 5; j++) {
        for (let i = -5; i <= 5; i++) {
          const ix = Math.round(naLinha.x - 0.5) + i + dx;
          const iy = Math.round(naLinha.y - 0.5) + j;
          if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
          y[iy * W + ix] = Math.min(1, y[iy * W + ix] + 0.95 * Math.exp(-(i * i + j * j) / 4));
        }
      }
      return y;
    };
    const linhaA = mascaraDasOrbitas(cam, [laco]);
    const fA = fontesDoQuadro(corpo(0), W, H, { mascaraLinha: linhaA });
    const alvo = fA.find((f) => Math.hypot(f.cx - naLinha.x, f.cy - naLinha.y) < 4);
    expect(alvo).toBeDefined();
    const ancora = {
      nome: 'venus',
      emA: { x: naLinha.x, y: naLinha.y, atras: false },
      emB: { x: naLinha.x + 2, y: naLinha.y, atras: false },
    };
    // o corpo anda 2 px na tela mas a fonte fica onde estava: é re-semeadura,
    // e a acusação TEM de sair mesmo com o corpo em cima do próprio traçado
    const r = casarFontes({
      fontesA: fA,
      fontesB: fontesDoQuadro(corpo(0), W, H),
      camA: cam, camB: cam, ancoras: [ancora],
    });
    const daAncora = r.casados.find((c) => c.via === 'ancora:venus');
    expect(daAncora).toBeDefined();
    expect(daAncora.salto).toBeGreaterThan(TOLERANCIA_SALTO_PX);
  });

  it('a exclusão por PEDAÇO DE LINHA é contada e declarada, nunca silenciosa', () => {
    const v = julgarFamilia({
      nome: 'zoomDeRoda',
      passos: [{
        k: 1, paralaxePx: 0, fracaoValida: 1, residuoMedio: 0, bandaAlta: 0,
        casados: [], sumidos: [], julgada: LIMIAR_JULGADA, instrumentos: 3,
      }],
      piso: { residuoMedio: 0, bandaAlta: 0 },
      altura: ALTURA_DE_CALIBRACAO_PX,
    });
    expect(v.instrumentos).toBe(3);
    expect(v.declaracoes.join(' ')).toContain('PEDAÇO DE LINHA DE ÓRBITA');
    expect(v.suspensos).toEqual([]);
    expect(v.erros).toEqual([]);
    // família sem órbita acesa não ganha declaração nenhuma — é o controle do
    // `?noorbitas=1` na forma que o oráculo consegue exercer
    const semLinha = julgarFamilia({
      nome: 'pan',
      passos: [{
        k: 1, paralaxePx: 0, fracaoValida: 1, residuoMedio: 0, bandaAlta: 0,
        casados: [], sumidos: [], julgada: LIMIAR_JULGADA,
      }],
      piso: { residuoMedio: 0, bandaAlta: 0 },
      altura: ALTURA_DE_CALIBRACAO_PX,
    });
    expect(semLinha.instrumentos).toBe(0);
    expect(semLinha.declaracoes).toEqual([]);
  });

  it('A FIAÇÃO: `medirPar` LIGA a faixa às fontes — apagar o fio reprova', () => {
    // A GUARDA QUE FALTAVA. Todos os testes acima montam a máscara na mão e a
    // passam a `fontesDoQuadro`; nenhum exercia o CAMINHO REAL. Apagar
    // `{ mascaraLinha: linhaA }` de `medirPar` matava a exclusão inteira e a
    // suíte passava 52/52 — a sabotagem que ninguém sentia.
    const laco = lacoDeBancada();
    const orbitas = [laco];
    const a = { cam, y: fotografarArco(cam, laco, 0, 24), orbitas };
    const b = { cam, y: fotografarArco(cam, laco, 8, 32), orbitas };
    const passo = medirPar(a, b, 1);
    // o fio chegou: a exclusão aconteceu DENTRO de `medirPar`
    expect(passo.instrumentos).toBeGreaterThan(0);
    // e o censo veio junto, que é o que o JSON grava
    expect(passo.faixa).not.toBe(null);
    expect(passo.faixa.naFaixa).toBe(passo.instrumentos);
    expect(passo.faixa.areaFaixa).toBeGreaterThan(0);
    // MESMO par, sem a camada: nada é excluído e o censo nem existe — é o
    // controle do `?noorbitas=1` no caminho real
    const semCamada = medirPar({ cam, y: a.y }, { cam, y: b.y }, 1);
    expect(semCamada.instrumentos).toBe(0);
    expect(semCamada.faixa).toBe(null);
    expect(semCamada.sumidos.length + semCamada.casados.length).toBeGreaterThan(0);
  });

  it('faixa NENHUMA é `null`, e não uma máscara de zeros', () => {
    // "sem linha no quadro o juiz é o de sempre" tem de ser verdade em UM
    // lugar só: quem não riscou nada devolve `null`, e o censo não publica
    // uma faixa que não existe
    const vazio = { n: 4, p: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], m: lacoDeBancada().m };
    expect(mascaraDasOrbitas(cam, [vazio])).toBe(null);
    expect(censoDaFaixa([], null, cam, LIMIAR_JULGADA)).toBe(null);
  });

  it('A CEGUEIRA MEDIDA: o que protege é TAMANHO, nunca brilho', () => {
    // O CENSO PRECISA DIZER A VERDADE, e a verdade é esta: uma fonte redonda
    // debaixo da faixa é calada por ser PEQUENA, não por ser fraca. Uma
    // gaussiana de pico 0,75-0,85 — forte, muito acima da soleira — sai do
    // veredito se o σ dela for o da casa. Quem escapa é quem TRANSBORDA.
    const laco = lacoDeBancada();
    const mask = mascaraDasOrbitas(cam, [laco]);
    const topo = projetarPonto(cam, [0, 0.25, -1]);
    const gaussiana = (sigma) => {
      const y = new Float32Array(W * H).fill(0.02);
      const R = Math.ceil(sigma * 4);
      for (let j = Math.max(0, Math.floor(topo.y - R)); j <= Math.min(H - 1, Math.ceil(topo.y + R)); j++) {
        for (let i = Math.max(0, Math.floor(topo.x - R)); i <= Math.min(W - 1, Math.ceil(topo.x + R)); i++) {
          const dx = i + 0.5 - topo.x;
          const dy = j + 0.5 - topo.y;
          y[j * W + i] = Math.min(1, y[j * W + i] + 0.95 * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)));
        }
      }
      return fontesDoQuadro(y, W, H, { mascaraLinha: mask })
        .find((f) => Math.hypot(f.cx - topo.x, f.cy - topo.y) < 3);
    };
    // a PSF desta casa (σ 0,85) debaixo da faixa: CALADA, e com pico 0,75
    const daCasa = gaussiana(SIGMA_DA_PSF_PX);
    expect(daCasa.pico).toBeGreaterThan(0.7);
    expect(daCasa.fracLinha).toBe(1);
    // a fronteira está entre σ 1,2 (ainda calada) e σ 1,5 (escapa)
    expect(gaussiana(1.2).fracLinha).toBe(1);
    expect(gaussiana(1.5).fracLinha).toBeLessThan(FRACAO_NA_LINHA);
    // e o que escapa é maior, não mais brilhante — o pico SOBE enquanto a
    // fração cai, que é a prova de que brilho não é a régua
    expect(gaussiana(1.5).pico).toBeGreaterThan(daCasa.pico);
  });

  it('o RAIO da faixa é o declarado, e a fração não é "quase nada"', () => {
    // guarda de número: se alguém alargar a faixa ou afrouxar a fração sem
    // medir de novo, isto quebra antes de a cegueira aparecer
    expect(RAIO_DA_LINHA_PX).toBe(1);
    expect(FRACAO_NA_LINHA).toBeGreaterThanOrEqual(0.9);
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
