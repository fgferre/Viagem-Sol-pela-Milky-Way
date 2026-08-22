// ============================================================
// A LEI DA ESTRELA — os oráculos do L1.
//
// O que se cobra aqui, por NÚMERO (varredura textual é proibida como prova
// de conformidade — §8.6 da Lei):
//  1. a conservação é TAUTOLÓGICA nos dois eixos — escrita, não conferida
//     por sorte;
//  2. as duas faces (TS e GLSL) batem bit a bit contra uma transliteração
//     independente, sobre grade — o mesmo molde do F0;
//  3. o clarão deriva do FLUXO e nunca do peso do ponto — a cláusula que a
//     v1 violaria;
//  4. a asa encolhe com a luz na potência declarada (R ∝ F^(1/2β)) — o
//     conserto do item 42, cobrado na forma;
//  5. o fallback é ÚNICO e na direção que não cega o quadro (§8.5);
//  6. a radiância vive na banda de render (§5.5), com o Sol em 1 EXATO e os
//     números da cláusula reproduzidos.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  BETA_DA_ASA,
  FRACAO_DA_ASA,
  LARGURA_DA_TROCA,
  LARGURA_DO_OVERRIDE,
  LIMIAR_DO_CLARAO,
  LIMIAR_DO_OVERRIDE_PX,
  NUCLEO_DA_ASA_EM_SIGMAS,
  PONTO_ZERO_DA_LEI,
  TROCA_PX_PADRAO,
  discoAparentePx,
  GLSL_LEI_DA_ESTRELA,
  GLSL_LEI_DE_TELA,
  PISO_DE_TELA_AO_QUADRADO,
  PISO_DE_TELA_PX,
  PLATO_DE_TELA_PX,
  TETO_DE_TELA_PX,
  leiDeTela,
  repartir,
  type EstadoDaEstrela,
  type Instrumento,
  type Observacao,
} from './estrela';
import {
  EXPO_M0,
  M_V_SOL,
  SIGMA_PX,
  TEFF_SOL_K,
  depositoDoDisco,
  picoDaPsf,
  psfPointSizePx,
  radianciaDeCorpoNegro,
  radianciaVisivelDeCorpoNegro,
  radianciaDeTela,
  sigmaDaPsfPx,
  vaoRadiometricoNaTroca,
} from './luzDaCasa';
import { RAIO_SOL_PC } from './escala';
import { diametroAparentePx } from './world/corpos/corpos';

const UA_EM_PC = 1 / 206264.80624548031;
const TAN_HALF_FOV = Math.tan((58 * Math.PI) / 360);

/** O Sol da lei — a instância nº 1, nos números da casa. */
function sol(): EstadoDaEstrela {
  return {
    id: 'sol',
    semente: 0,
    posicaoPc: [0, 0, 0],
    raioPc: RAIO_SOL_PC,
    teffK: TEFF_SOL_K,
    tempo: 0,
    fase: 0,
    rotacao: { periodo: 25.38 * 86400, eixo: [0, 0, 1] },
    atividade: { nivel: 0 },
  };
}

function verDe(distPc: number, extra?: Partial<Observacao>): Observacao {
  return { distPc, direcao: [0, 0, 1], ...extra };
}

function instrumento(extra?: Partial<Instrumento>): Instrumento {
  return {
    alturaPx: 900,
    tanHalfFov: TAN_HALF_FOV,
    expoM0: EXPO_M0,
    sigmaPx: SIGMA_PX,
    beta: 300,
    ...extra,
  };
}

// ------------------------------------------------------------
describe('1. a conservação é tautológica — nos DOIS eixos', () => {
  it('wResolvido É 1−wPonto e wMalha É 1−wEsfera, bit a bit, na varredura', () => {
    for (let logUa = -2; logUa <= 4.2; logUa += 0.37) {
      for (const req of [0, 0.25, 0.5, 0.75, 1]) {
        const r = repartir(sol(), verDe(Math.pow(10, logUa) * UA_EM_PC), instrumento({ requisitoGeometrico: req }));
        expect(r.wResolvido).toBe(1 - r.wPonto);
        expect(r.wMalha).toBe(1 - r.wEsfera);
        const soma = r.wPonto + r.wResolvido * r.wEsfera + r.wResolvido * r.wMalha;
        expect(soma).toBeCloseTo(1, 12);
      }
    }
  });

  it('longe é ponto inteiro; perto é resolvido inteiro — extremos exatos', () => {
    const longe = repartir(sol(), verDe(1000), instrumento());
    expect(longe.wPonto).toBe(1);
    expect(longe.wResolvido).toBe(0);
    const perto = repartir(sol(), verDe(0.05 * UA_EM_PC), instrumento());
    expect(perto.wPonto).toBe(0);
    expect(perto.wResolvido).toBe(1);
  });

  it('o requisito geométrico decide impostor↔geometria sem tocar o eixo óptico', () => {
    const d = verDe(0.1 * UA_EM_PC);
    const esfera = repartir(sol(), d, instrumento({ requisitoGeometrico: 0 }));
    const malha = repartir(sol(), d, instrumento({ requisitoGeometrico: 1 }));
    expect(esfera.wEsfera).toBe(1);
    expect(malha.wEsfera).toBe(0);
    expect(esfera.wPonto).toBe(malha.wPonto);
    expect(esfera.fluxo).toBe(malha.fluxo);
  });

  it('a rampa é C¹ — sem quina na entrada nem na saída da troca (§8.3)', () => {
    // derivada numérica de wPonto em discoPx, dos dois lados das fronteiras
    const w = (discoPx: number) => {
      // inverte discoPx→distância para sondar a rampa pela porta da frente
      const dist = (2 * Math.atan(RAIO_SOL_PC / 1) * 900) / (2 * TAN_HALF_FOV) / discoPx; // aproximação linear
      return repartir(sol(), verDe(dist), instrumento()).wPonto;
    };
    const eps = 1e-6;
    for (const borda of [TROCA_PX_PADRAO, LARGURA_DA_TROCA * TROCA_PX_PADRAO]) {
      const esq = (w(borda) - w(borda - eps)) / eps;
      const dir = (w(borda + eps) - w(borda)) / eps;
      expect(Math.abs(dir - esq)).toBeLessThan(1e-3);
    }
  });
});

// ------------------------------------------------------------
describe('2. as duas faces batem — conformidade numérica, molde do F0', () => {
  /** Transliteração float64 do corpo de `repartirPesos` (GLSL). */
  function repartirPesosRef(discoPx: number, trocaPx: number, req: number) {
    const smoothstep = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
    const wPonto = 1.0 - smoothstep(trocaPx, 2.0 * trocaPx, discoPx);
    const wResolvido = 1.0 - wPonto;
    const wEsfera = 1.0 - smoothstep(0.0, 1.0, clamp(req, 0.0, 1.0));
    const wMalha = 1.0 - wEsfera;
    return { wPonto, wResolvido, wEsfera, wMalha };
  }

  /** Transliteração float64 do corpo de `raioDaAsaPx` (GLSL). */
  function raioDaAsaRef(picoDeTela: number, sigmaPx: number): number {
    const excesso = (FRACAO_DA_ASA * picoDeTela) / LIMIAR_DO_CLARAO;
    if (excesso <= 1.0) return 0.0;
    const theta0 = NUCLEO_DA_ASA_EM_SIGMAS * sigmaPx;
    return theta0 * Math.sqrt(Math.pow(excesso, 1 / BETA_DA_ASA) - 1.0);
  }

  it('pesos: repartir === transliteração do GLSL, bit a bit na grade', () => {
    for (let logUa = -2; logUa <= 4.2; logUa += 0.23) {
      for (const req of [0, 0.15, 0.5, 0.85, 1]) {
        const dist = Math.pow(10, logUa) * UA_EM_PC;
        const r = repartir(sol(), verDe(dist), instrumento({ requisitoGeometrico: req }));
        const ref = repartirPesosRef(r.discoPx, TROCA_PX_PADRAO, req);
        expect(r.wPonto).toBe(ref.wPonto);
        expect(r.wEsfera).toBe(ref.wEsfera);
      }
    }
  });

  it('asa: o claraoPx usa EXATAMENTE o raio da transliteração quando a asa manda', () => {
    for (const ua of [1, 10, 100, 1000, 15800]) {
      const dist = ua * UA_EM_PC;
      const r = repartir(sol(), verDe(dist), instrumento());
      // R2 do item 44: o clarão é a óptica PLENA do ponto (fluxo SEM
      // filtro) vestida pela SOLTURA no tamanho. A transliteração
      // recompõe o pleno e multiplica pela soltura que a própria
      // repartição declara — as duas travas exponenciais (wPonto ×
      // 1/filtro) morreram, e com elas o clarão que explodia no recuo.
      const fluxoPleno = depositoDoDisco(
        radianciaDeTela(r.radiancia, RAIO_SOL_PC, 900),
        r.discoPx
      );
      const m = EXPO_M0 - 2.5 * Math.log10(fluxoPleno);
      const pico = picoDaPsf(m, EXPO_M0, SIGMA_PX, 900);
      const sigma = sigmaDaPsfPx(SIGMA_PX, 900);
      const esperado =
        Math.max(psfPointSizePx(m, EXPO_M0, SIGMA_PX, 900), 2 * raioDaAsaRef(pico, sigma)) *
        r.solturaDoClarao;
      expect(r.claraoPx, `${ua} UA`).toBe(esperado);
    }
  });

  it('a soltura é a rampa única: 0 com a superfície dona, 1 no ponto, C¹ em log no meio', () => {
    // disco ≥ 10 px (o filtro completo) ⇒ soltura 0 — clarão nenhum por
    // cima da fotosfera (a lição do círculo branco, paga por construção)
    expect(repartir(sol(), verDe(0.5 * UA_EM_PC), instrumento()).solturaDoClarao).toBe(0);
    // disco ≤ 2 px ⇒ ponto pleno
    expect(repartir(sol(), verDe(4 * UA_EM_PC), instrumento()).solturaDoClarao).toBe(1);
    // no meio: estritamente crescente com a distância (recuando, o
    // clarão só desabrocha — nunca pisca nem volta)
    let anterior = 0;
    for (const ua of [0.8, 1, 1.26, 1.58, 2, 2.5, 3.16]) {
      const s = repartir(sol(), verDe(ua * UA_EM_PC), instrumento()).solturaDoClarao;
      expect(s, `${ua} UA`).toBeGreaterThanOrEqual(anterior);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      anterior = s;
    }
  });

  it('o texto GLSL gerado não vazou lixo de interpolação', () => {
    expect(GLSL_LEI_DA_ESTRELA).not.toMatch(/undefined|NaN/);
  });

  // ─── A LEI DE TELA (M5) ─────────────────────────────────────────────
  //
  // A conformidade é NUMÉRICA (§8.6): o texto GLSL é lido pelo seu
  // TRANSLITERADOR — os literais que ele imprime são extraídos e
  // reavaliados em float64 — e comparados com `leiDeTela` sobre grade.
  // Uma casa decimal a menos no `toFixed` quebra aqui, que é exatamente
  // a divergência que a lei existe para tornar impossível.
  it('a face GLSL da lei de tela imprime os MESMOS floats da face TS', () => {
    const numeros = (re: RegExp) => {
      const m = GLSL_LEI_DE_TELA.match(re);
      expect(m, `${re} não achou o literal no GLSL gerado`).not.toBeNull();
      return (m as RegExpMatchArray).slice(1).map(Number);
    };
    const [pisoClamp, teto] = numeros(/clamp\(px, ([\d.]+), ([\d.]+)\)/);
    const [plato2] = numeros(/min\(1\.0, ([\d.]+) \/ max/);
    const [pisoIf] = numeros(/px < ([\d.]+)\n/);
    const [piso2] = numeros(/\/ ([\d.]+)\n/);
    expect(pisoClamp).toBe(PISO_DE_TELA_PX);
    expect(pisoIf).toBe(PISO_DE_TELA_PX);
    expect(teto).toBe(TETO_DE_TELA_PX);
    expect(plato2).toBe(PLATO_DE_TELA_PX * PLATO_DE_TELA_PX);
    expect(piso2).toBe(PISO_DE_TELA_AO_QUADRADO);
    // e o número escrito É o quadrado do piso, dentro do float — a relação
    // que a constante escrita à mão poderia perder em silêncio
    expect(PISO_DE_TELA_AO_QUADRADO).toBeCloseTo(PISO_DE_TELA_PX * PISO_DE_TELA_PX, 15);
    expect(GLSL_LEI_DE_TELA).not.toMatch(/undefined|NaN/);
    // e a transliteração completa bate com a face TS em toda a grade
    for (let logPx = -2; logPx <= 3; logPx += 0.037) {
      const px = Math.pow(10, logPx);
      const t = leiDeTela(px);
      expect(t.pontoPx, `${px} px`).toBe(Math.min(teto, Math.max(pisoClamp, px)));
      expect(t.shrink, `${px} px`).toBe(Math.min(1, plato2 / Math.max(px * px, 1e-4)));
      expect(t.subPix, `${px} px`).toBe(px < pisoIf ? (px * px) / piso2 : 1);
    }
  });

  it('a lei de tela conserva o DEPÓSITO no sub-pixel, seja qual for o piso', () => {
    // por que os dois pisos da casa velha (0,7 e 0,85) depositavam o mesmo:
    // abaixo do piso o depósito é pontoPx² · subPix = piso² · px²/piso² = px².
    // É por isso que o M5 não é uma mudança de FLUXO nas forjas fracas — é
    // uma mudança de REPARTIÇÃO (o mesmo fluxo, num ponto de outro tamanho).
    for (const px of [0.05, 0.2, 0.4, 0.6, 0.69]) {
      const t = leiDeTela(px);
      expect(t.pontoPx * t.pontoPx * t.subPix).toBeCloseTo(px * px, 12);
    }
  });

  it('a lei de tela é contínua nas duas fronteiras — piso e platô', () => {
    const eps = 1e-9;
    for (const p of [PISO_DE_TELA_PX, PLATO_DE_TELA_PX, TETO_DE_TELA_PX]) {
      const a = leiDeTela(p - eps);
      const b = leiDeTela(p + eps);
      expect(a.pontoPx, `pontoPx em ${p}`).toBeCloseTo(b.pontoPx, 8);
      expect(a.shrink, `shrink em ${p}`).toBeCloseTo(b.shrink, 8);
      expect(a.subPix, `subPix em ${p}`).toBeCloseTo(b.subPix, 8);
    }
  });

  it('discoAparentePx === diametroAparentePx da régua do palco, bit a bit', () => {
    for (const raio of [RAIO_SOL_PC, 1.711 * RAIO_SOL_PC, 100 * RAIO_SOL_PC]) {
      for (let logUa = -1.5; logUa <= 4; logUa += 0.31) {
        const d = Math.pow(10, logUa) * UA_EM_PC;
        expect(discoAparentePx(raio, d, 900, TAN_HALF_FOV)).toBe(
          diametroAparentePx(raio, d, 900, 58)
        );
      }
    }
  });
});

// ------------------------------------------------------------
describe('3. o clarão deriva do FLUXO — nunca do peso do ponto (§1)', () => {
  it('com o disco dominando (wResolvido = 1) a óptica MUDA DE DONO — não some', () => {
    const r = repartir(sol(), verDe(0.05 * UA_EM_PC), instrumento());
    expect(r.wResolvido).toBe(1);
    // R2 do item 44: a soltura declara o dono. Zero = a superfície manda
    // e a óptica é o BLOOM sobre a imagem real (§1, corrigida) — o
    // billboard do clarão se apaga, e é isso que protege a fotosfera do
    // círculo branco. O fluxo admitido segue vivo (cadastro/selo).
    expect(r.solturaDoClarao).toBe(0);
    expect(r.claraoPx).toBe(0);
    expect(r.claraoGanho).toBeGreaterThan(0);
  });

  it('mais perto ⇒ MAIS clarão NO REGIME DE PONTO; com o corpo resolvido, o filtro corta', () => {
    // no regime de ponto (disco < 4 px, filtro fora) a câmera que chega
    // ganha clarão — a frase do §1, intacta onde ela vale
    const perto = repartir(sol(), verDe(3.6 * UA_EM_PC), instrumento());
    const longe = repartir(sol(), verDe(10 * UA_EM_PC), instrumento());
    expect(perto.claraoGanho).toBeGreaterThan(longe.claraoGanho);
    expect(perto.claraoPx).toBeGreaterThan(longe.claraoPx);
    // e com o corpo RESOLVIDO o filtro solar (§5.7) engata pela mesma
    // rampa da lei e corta a asa — é o que deixa o filme mostrar a
    // superfície de perto (correção do M2, palavras do dono: o Sol
    // procedural escondido atrás da tela branca)
    const colado = repartir(sol(), verDe(0.1 * UA_EM_PC), instrumento());
    expect(colado.overrideExpoente).toBe(0); // paleta autorada = filtro pleno
    expect(colado.claraoPx).toBeLessThan(perto.claraoPx);
  });

  it('o clarão ENCOLHE monotônico com a distância no regime de ponto — item 42', () => {
    // a partir de onde a SOLTURA completa (disco ≤ 2 px ⇔ d ≳ 3,2 UA
    // para o Sol) a forma do item 42 vale inteira; a janela da soltura
    // (0,63–3,16 UA) é a rampa DECLARADA da entrega, não quebra de
    // monotonia — e o teste dela mora no bloco da soltura, acima
    let anterior = Infinity;
    for (const ua of [3.6, 7.2, 20, 40, 150, 500, 2000, 4000, 15800]) {
      const r = repartir(sol(), verDe(ua * UA_EM_PC), instrumento());
      expect(r.claraoPx, `${ua} UA`).toBeLessThanOrEqual(anterior);
      anterior = r.claraoPx;
    }
  });

  it('a asa encolhe na potência declarada: R ∝ F^(1/2β) ⇒ R ∝ d^(−1/β)', () => {
    // longe do núcleo (asa dominante), duas décadas de distância medem o expoente
    const r1 = repartir(sol(), verDe(100 * UA_EM_PC), instrumento());
    const r2 = repartir(sol(), verDe(10000 * UA_EM_PC), instrumento());
    const inclinacao = Math.log10(r2.claraoPx / r1.claraoPx) / Math.log10(10000 / 100);
    // teórico: −2/(2β) = −1/2,4 ≈ −0,4167; a raiz √(x−1) e o núcleo afrouxam
    // a assíntota — a banda declarada cobre o regime medido
    expect(inclinacao).toBeLessThan(-0.3);
    expect(inclinacao).toBeGreaterThan(-0.55);
  });

  it('estrela fraca continua um ponto: sob o limiar a asa é zero', () => {
    // uma anã fria vista de longe — fluxo minúsculo
    const anaFria: EstadoDaEstrela = { ...sol(), id: 'ana', teffK: 3000, raioPc: 0.1 * RAIO_SOL_PC };
    const r = repartir(anaFria, verDe(50), instrumento());
    // o clarão é só o núcleo (o tamanho mínimo do sprite), sem asa
    const fluxoDeTela = depositoDoDisco(
      radianciaDeTela(r.radiancia, anaFria.raioPc, 900),
      r.discoPx
    );
    const m = EXPO_M0 - 2.5 * Math.log10(fluxoDeTela);
    expect(r.claraoPx).toBe(psfPointSizePx(m, EXPO_M0, SIGMA_PX, 900));
  });
});

// ------------------------------------------------------------
describe('4. a radiância vive na banda de render (§5.5) — decisão explícita', () => {
  it('o Sol é 1 EXATO — a âncora não arredonda', () => {
    expect(radianciaVisivelDeCorpoNegro(TEFF_SOL_K)).toBe(1);
    expect(repartir(sol(), verDe(1), instrumento()).radiancia).toBe(1);
  });

  it('reproduz os números da cláusula: 30.000 K dá ~66, não 729', () => {
    expect(radianciaVisivelDeCorpoNegro(30000)).toBeCloseTo(65.875, 2);
    expect(radianciaDeCorpoNegro(30000)).toBeCloseTo(729.76, 1);
  });

  it('a M fria: visível ABAIXO da bolométrica (o T⁴ a inflava 4,4×)', () => {
    expect(radianciaVisivelDeCorpoNegro(3000)).toBeCloseTo(0.016409, 5);
    expect(radianciaVisivelDeCorpoNegro(3000)).toBeLessThan(radianciaDeCorpoNegro(3000));
  });

  it('monótona em T — mais quente nunca é menos brilhante no visível', () => {
    let anterior = 0;
    for (let t = 2500; t <= 40000; t += 750) {
      const r = radianciaVisivelDeCorpoNegro(t);
      expect(r, `T=${t}`).toBeGreaterThan(anterior);
      anterior = r;
    }
  });

  it('o fluxo carrega a extinção SEMPRE — não a partir de 3 px', () => {
    const semTau = repartir(sol(), verDe(1), instrumento());
    const comTau = repartir(sol(), verDe(1, { tau: 1 }), instrumento());
    expect(comTau.fluxo / semTau.fluxo).toBeCloseTo(Math.exp(-1), 12);
    // e o disco não muda: extinção é luz, não geometria
    expect(comTau.discoPx).toBe(semTau.discoPx);
  });
});

// ------------------------------------------------------------
describe('5. o override é SEÇÃO da lei (§5.7) — mesma régua, largura própria', () => {
  it('longe: a lei manda (expoente 1) e o custo declarado é 1 EXATO', () => {
    const r = repartir(sol(), verDe(1), instrumento());
    expect(r.discoPx).toBeLessThan(LIMIAR_DO_OVERRIDE_PX);
    expect(r.overrideExpoente).toBe(1);
    expect(r.overrideFator).toBe(1);
  });

  it('perto: a paleta autorada assume (expoente 0) e o custo é o vão inteiro', () => {
    const r = repartir(sol(), verDe(0.05 * UA_EM_PC), instrumento());
    expect(r.discoPx).toBeGreaterThan(LIMIAR_DO_OVERRIDE_PX * LARGURA_DO_OVERRIDE);
    expect(r.overrideExpoente).toBe(0);
    expect(r.overrideFator).toBe(vaoRadiometricoNaTroca(RAIO_SOL_PC, 900));
  });

  it('no meio a rampa é contínua — nem degrau, nem booleano', () => {
    // acha uma distância com 0 < g < 1 e confere vizinhança contínua
    const alvoPx = LIMIAR_DO_OVERRIDE_PX * 1.5;
    const dist = RAIO_SOL_PC / Math.tan((alvoPx * TAN_HALF_FOV) / 900);
    const g = repartir(sol(), verDe(dist), instrumento()).overrideExpoente;
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(1);
    const gPerto = repartir(sol(), verDe(dist * 0.999), instrumento()).overrideExpoente;
    expect(Math.abs(g - gPerto)).toBeLessThan(0.01);
  });
});

// ------------------------------------------------------------
describe('6. o fallback é ÚNICO e não cega o quadro (§8.5)', () => {
  const venenos: Array<[string, EstadoDaEstrela, Observacao, Instrumento]> = [
    ['distância NaN', sol(), verDe(NaN), instrumento()],
    ['distância zero', sol(), verDe(0), instrumento()],
    ['raio negativo', { ...sol(), raioPc: -1 }, verDe(1), instrumento()],
    ['teff zero', { ...sol(), teffK: 0 }, verDe(1), instrumento()],
    ['altura zero', sol(), verDe(1), instrumento({ alturaPx: 0 })],
    ['sigma NaN', sol(), verDe(1), instrumento({ sigmaPx: NaN })],
  ];
  for (const [nome, e, o, i] of venenos) {
    it(`${nome} ⇒ ponto inteiro, paleta autorada, nada de NaN`, () => {
      const r = repartir(e, o, i);
      expect(r.wPonto).toBe(1);
      expect(r.wResolvido).toBe(0);
      expect(r.wEsfera).toBe(1);
      expect(r.overrideExpoente).toBe(0);
      expect(r.fluxo).toBe(0);
      for (const [chave, valor] of Object.entries(r)) {
        if (typeof valor === 'number') {
          expect(Number.isFinite(valor), `${nome} → ${chave}`).toBe(true);
        }
      }
    });
  }

  it('tau inválido não cega: vira 0 (sem extinção), nunca NaN', () => {
    const r = repartir(sol(), verDe(1, { tau: NaN }), instrumento());
    expect(r.fluxo).toBe(repartir(sol(), verDe(1), instrumento()).fluxo);
  });
});

// ------------------------------------------------------------
describe('7. o ponto-zero é UM (§5.9)', () => {
  it('a lei carrega 4,83 — e a divergência com o campo fica DECLARADA fora dela', () => {
    expect(PONTO_ZERO_DA_LEI).toBe(M_V_SOL);
    expect(PONTO_ZERO_DA_LEI).toBe(4.83);
  });
});
