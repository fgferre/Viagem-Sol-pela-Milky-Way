// ============================================================
// Oráculo do LOD estelar (Onda 3, fase 1). Três origens, declaradas:
//
// 1. Os 11 casos de `stepRampToward` são PORTE VERBATIM de
//    `hygMeshFadeRamp.test.ts` do doador (atlas-orbital) — mesmos
//    valores, mesmas tolerâncias. Se um deles precisasse de adaptação,
//    a transcrição do integrador estaria errada; nenhum precisou.
// 2. Os 25 casos do gate vêm de `stellarMeshGate.test.ts` com TODOS os
//    contratos de forma intactos (assimetria estrita, zona morta nos
//    dois sentidos, NaN preserva, ciclo de 7 transições encadeadas,
//    guardas defensivas) e os NÚMEROS recalculados para os limiares
//    derivados da casa — os do doador (1e-3/5e-4 rad) não atravessam.
//    Os casos de integração foram refeitos no regime da casa (raios em
//    pc na escala artística do Sol); o PONTO de cada um sobrevive.
// 3. O resto é da casa: pinagem das 5 janelas (o teste que mata a
//    redigitação, incluindo a conferência contra o TEXTO dos dois
//    consumidores), a equivalência pc↔rad na âncora do Sol, a
//    cobertura contínua da cicatriz C1a, a conta do teto e os
//    contratos C2/C3.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeStars } from '../config';
import type { StarArrays, StarsMeta } from '../config';
import { LIMIAR_SISTEMA_SOLAR_PC } from '../escala';
import { HeroStars } from './heroStars';
import {
  DOMINANCE_DEFAULT_ON,
  FADE_NEUTRAL,
  FOCUS_OFF,
  FOCUS_ON,
  HERO_DOMINANCE,
  HERO_MATCH_REL_TOL,
  HERO_ZOOM_TAN_REF,
  LOD_HERO,
  RAMP_DURATION_MS,
  catalogApparentMag,
  clearFocus,
  fadesDoQuadro,
  heroCatalogFade,
  heroDominanceFade,
  heroDominanceRatio,
  heroFarFade,
  heroNearFade,
  heroPresence,
  heroSizePx,
  isFocusBypassActive,
  matchHeroesToCatalog,
  needsAttributeWrite,
  resetRamp,
  spriteAttenuation,
  stepRampToward,
} from './lodStellar';
import { psfPointSizePx } from '../luzDaCasa';

const DEG = Math.PI / 180;

// ------------------------------------------------------------
// 1. Integrador da rampa — 11 casos portados verbatim do doador
// ------------------------------------------------------------
// ============================================================
// O QUE MORREU AQUI NO M1 (LEI-DA-ESTRELA §4) — e não volta:
//  · a entrega {0,02; 0,05} pc (LOD_SOL, sunStarGain, deepPointGain) e o
//    oráculo `ponto + clarão === 1` em ~22.000 distâncias — a soma 1 é
//    tautológica na repartição (estrela.test.ts), não teorema de janela;
//  · o gate por ângulo sólido (DISC_ENTER/EXIT, shouldDiscBeActive,
//    computeSolidAngle, distanceForSolidAngle, projectedRadiusPx,
//    maxSpriteSolidAngleRad, POINT_SIZE_CEILING_PX) — dormiu sem
//    consumidor desde 13/08 e a âncora dele era o raio artístico morto;
//  · filtroSolarAlvo e a rampa log-simétrica sobre disco/halo — o filtro
//    é overrideExpoente da lei (mesma discoPx, largura própria, §5.7);
//  · a costura de tamanho do SunStar (heroSizePcDePx) — morreu com a
//    classe; o clarão por fluxo é o M2;
//  · spriteAttenuationWithFocus — órfão; os espelhos de linha ficam.
// A varredura invertida (simbolosProibidos.test.ts) vigia os nomes.
// ============================================================

describe('stepRampToward — integrador linear (porte verbatim do doador)', () => {
  it('salta para o alvo no primeiro tique quando o que falta cabe num passo', () => {
    // falta 0,05; passo = 0,5 s → 1,667
    expect(stepRampToward(0.95, 1.0, 0.5, 300)).toBe(1.0);
  });

  it('anda linearmente rumo ao alvo, dt/durationMs por tique', () => {
    expect(stepRampToward(0, 1, 0.05, 300)).toBeCloseTo(50 / 300, 6);
  });

  it('é simétrico na direção: a rampa de descida usa o mesmo passo', () => {
    const up = stepRampToward(0, 1, 0.1, 300);
    const down = stepRampToward(1, 0, 0.1, 300);
    expect(up + down).toBeCloseTo(1, 10);
    expect(up).toBeCloseTo(100 / 300, 6);
    expect(1 - down).toBeCloseTo(100 / 300, 6);
  });

  it('clampa o resultado a [0, 1] mesmo com entrada fora de faixa', () => {
    expect(stepRampToward(-0.5, 1, 0.001, 300)).toBeGreaterThanOrEqual(0);
    expect(stepRampToward(1.5, 1, 0.001, 300)).toBe(1);
  });

  it('assenta no alvo depois de exatamente durationMs de integração', () => {
    const dtPerTick = 1 / 60;
    const totalTicks = Math.ceil(300 / 1000 / dtPerTick);
    let r = 0;
    for (let i = 0; i < totalTicks; i++) r = stepRampToward(r, 1, dtPerTick, 300);
    expect(r).toBe(1);
  });

  it('não passa do ponto quando o alvo inverte no meio (cushion de histerese)', () => {
    let r = 0;
    for (let t = 0; t < 100; t += 16.67) r = stepRampToward(r, 1, 16.67 / 1000, 300);
    const peak = r;
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(1);
    for (let t = 0; t < 200; t += 16.67) r = stepRampToward(r, 0, 16.67 / 1000, 300);
    expect(r).toBeLessThan(peak);
    expect(r).toBeGreaterThanOrEqual(0);
  });

  it('devolve o alvo inalterado com durationMs <= 0 (defensivo, sem divisão por 0)', () => {
    expect(stepRampToward(0.5, 1, 0.1, 0)).toBe(1);
    expect(stepRampToward(0.5, 1, 0.1, -100)).toBe(1);
    expect(stepRampToward(0.5, 2, 0.1, 0)).toBe(1);
    expect(stepRampToward(0.5, -3, 0.1, 0)).toBe(0);
  });

  it('dt zero segura o valor corrente', () => {
    expect(stepRampToward(0.42, 1, 0, 300)).toBe(0.42);
    expect(stepRampToward(0.42, 0, 0, 300)).toBe(0.42);
  });

  it('trata dt não-finito como no-op (honra a segurança contra NaN do docstring)', () => {
    expect(stepRampToward(0.3, 1, NaN, 300)).toBe(0.3);
    expect(stepRampToward(0.3, 1, Infinity, 300)).toBe(0.3);
  });

  it('clampa o pico de dt da aba que volta do background (anima, não salta)', () => {
    // dt = 10 s clampado a 0,1 s → passo 0,333, não vai ao alvo
    expect(stepRampToward(0, 1, 10, 300)).toBeCloseTo((0.1 * 1000) / 300, 6);
    expect(stepRampToward(0, 1, 10, 300)).toBeLessThan(1);
  });

  it('preserva o invariante de soma do crossfade a cada tique (sprite + malha = 1)', () => {
    let r = 0;
    for (let t = 0; t < 500; t += 16.67) {
      r = stepRampToward(r, 1, 16.67 / 1000, 300);
      const spriteMult = 1 - r;
      const meshVis = r;
      expect(spriteMult + meshVis).toBeCloseTo(1, 10);
    }
  });

  it('[casa] a duração de 300 ms do doador entra pinada junto com o integrador', () => {
    expect(RAMP_DURATION_MS).toBe(300);
  });
});

// ------------------------------------------------------------
// 3b. Heroes genéricos — nearFade × farFade e a curva de presença (D2)
// ------------------------------------------------------------
describe('heroes — nearFade, farFade e a curva de presença', () => {
  // Oráculo: o smoothstep do GLSL transcrito de novo, e as duas linhas
  // `nearFade`/`farFade` do FRAG de heroStars.ts reescritas em cima dele.
  const ss = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const oraculoNear = (d: number, size: number) => ss(size * 0.5, size * 1.4, d);
  const oraculoFar = (d: number) => 1.0 - ss(320.0, 900.0, d);
  /** tamanho do clarão de um hero de magnitude m (construtor de HeroStars) */
  const tamanhoHero = (m: number) => 0.08 * Math.pow(10, -0.3 * m);
  const SIRIUS = tamanhoHero(-1.46); // ~0,219 pc de raio de clarão
  const ANTARES = tamanhoHero(1.06); // ~0,038 pc

  /** 0,001 → 2000 pc: cobre o colado, a faixa útil e o além do farFade. */
  const DISTANCIAS: number[] = [];
  for (let i = 1; i <= 1000; i++) DISTANCIAS.push(i * 0.001);
  for (let i = 1; i <= 2000; i++) DISTANCIAS.push(i);

  it('nearFade bate o oráculo em toda a varredura, para dois tamanhos reais', () => {
    for (const d of DISTANCIAS) {
      expect(heroNearFade(d, SIRIUS)).toBe(oraculoNear(d, SIRIUS));
      expect(heroNearFade(d, ANTARES)).toBe(oraculoNear(d, ANTARES));
    }
  });

  it('nearFade: 0 colado, 1 depois de 1,4× o tamanho, 0,5 no meio da janela', () => {
    expect(heroNearFade(SIRIUS * 0.5, SIRIUS)).toBe(0);
    expect(heroNearFade(SIRIUS * 0.2, SIRIUS)).toBe(0);
    expect(heroNearFade(SIRIUS * 1.4, SIRIUS)).toBe(1);
    expect(heroNearFade(SIRIUS * 10, SIRIUS)).toBe(1);
    expect(heroNearFade(SIRIUS * 0.95, SIRIUS)).toBeCloseTo(0.5, 12);
  });

  it('farFade bate o oráculo: 1 até 320 pc, 0 a partir de 900 pc, 0,5 em 610', () => {
    for (const d of DISTANCIAS) expect(heroFarFade(d)).toBe(oraculoFar(d));
    expect(heroFarFade(0)).toBe(1);
    expect(heroFarFade(320)).toBe(1);
    expect(heroFarFade(610)).toBeCloseTo(0.5, 12);
    expect(heroFarFade(900)).toBe(0);
    expect(heroFarFade(5000)).toBe(0);
  });

  it('a presença é o produto das duas e zera a partir de 900 pc (rede D2a)', () => {
    for (const d of DISTANCIAS) {
      expect(heroPresence(d, SIRIUS)).toBe(heroNearFade(d, SIRIUS) * heroFarFade(d));
      if (d >= LOD_HERO.far.endPc) expect(heroPresence(d, SIRIUS)).toBe(0);
    }
  });

  it('a presença é não-crescente além de 900 pc e o ponto do catálogo VOLTA inteiro', () => {
    let anterior = heroPresence(LOD_HERO.far.endPc, SIRIUS);
    for (const d of DISTANCIAS.filter((x) => x >= LOD_HERO.far.endPc)) {
      const p = heroPresence(d, SIRIUS);
      expect(p).toBeLessThanOrEqual(anterior);
      // é ISTO que impede as 16 mais brilhantes de sumirem do céu distante
      expect(spriteAttenuation(p)).toBe(1);
      anterior = p;
    }
  });

  it('a presença é não-crescente de 320 pc para fora (o hero cede ao catálogo)', () => {
    const cauda = DISTANCIAS.filter((x) => x >= LOD_HERO.far.startPc);
    for (let i = 1; i < cauda.length; i++) {
      expect(heroPresence(cauda[i], SIRIUS)).toBeLessThanOrEqual(heroPresence(cauda[i - 1], SIRIUS));
    }
  });

  it('invariante de soma por posição: catálogo×(1−p) + hero×p = 1 em toda distância', () => {
    for (const d of DISTANCIAS) {
      const p = heroPresence(d, SIRIUS);
      expect(spriteAttenuation(p) + p).toBeCloseTo(1, 12);
    }
  });

  it('guardas: fora do domínio do shader devolve 0 (hero ausente), nunca NaN', () => {
    expect(heroNearFade(100, 0)).toBe(0);
    expect(heroNearFade(100, -1)).toBe(0);
    expect(heroNearFade(NaN, SIRIUS)).toBe(0);
    expect(heroNearFade(100, NaN)).toBe(0);
    expect(heroFarFade(NaN)).toBe(0);
    expect(heroPresence(NaN, NaN)).toBe(0);
    // e a direção da guarda é a segura: hero ausente ⇒ catálogo inteiro
    expect(spriteAttenuation(heroPresence(NaN, SIRIUS))).toBe(1);
  });
});

// ------------------------------------------------------------
// 4. Gate por ângulo sólido — 25 casos do doador, números da casa
// ------------------------------------------------------------
describe('C2 — escrita idempotente do atributo', () => {
  it('não escreve quando o slot já tem o valor alvo', () => {
    expect(needsAttributeWrite(0.5, 0.5)).toBe(false);
    expect(needsAttributeWrite(0, 0)).toBe(false);
    expect(needsAttributeWrite(1, 1)).toBe(false);
  });

  it('escreve quando o alvo mudou, por menos que seja', () => {
    expect(needsAttributeWrite(0.5, 0.5000001)).toBe(true);
    expect(needsAttributeWrite(0, 1)).toBe(true);
    expect(needsAttributeWrite(1, 0)).toBe(true);
  });

  it('estado estável não levanta dirty-flag: reafirmar 100× escreve zero vezes', () => {
    const slot = 0.37;
    let escritas = 0;
    for (let i = 0; i < 100; i++) if (needsAttributeWrite(slot, 0.37)) escritas++;
    expect(escritas).toBe(0);
  });

  it('alvo NaN sempre escreve; -0 e +0 contam como iguais', () => {
    expect(needsAttributeWrite(0.5, NaN)).toBe(true);
    expect(needsAttributeWrite(NaN, NaN)).toBe(true);
    expect(needsAttributeWrite(-0, 0)).toBe(false);
  });

  it('a rampa reafirmada quadro a quadro só escreve enquanto se move', () => {
    let slot = 0;
    let r = 0;
    let escritas = 0;
    for (let i = 0; i < 40; i++) {
      r = stepRampToward(r, 1, 1 / 60, RAMP_DURATION_MS);
      if (needsAttributeWrite(slot, r)) {
        slot = r;
        escritas++;
      }
    }
    expect(slot).toBe(1);
    expect(escritas).toBeGreaterThan(0);
    expect(escritas).toBeLessThan(40); // depois de assentar em 1, para de escrever
  });
});

describe('C3 — reset de rampa e limpeza de foco', () => {
  it('resetRamp zera valor E alvo, e devolve objeto novo a cada chamada', () => {
    const a = resetRamp();
    expect(a).toEqual({ ramp: 0, target: 0 });
    a.ramp = 1;
    expect(resetRamp()).toEqual({ ramp: 0, target: 0 });
  });

  it('sem o reset, um refoco carregaria ramp=1 e apagaria a estrela nova', () => {
    // estrela A plenamente resolvida
    let estado = { ramp: 1, target: 1 };
    expect(spriteAttenuation(estado.ramp)).toBe(0); // sprite de A apagado
    // troca de foco para B: com reset, o sprite de B começa inteiro
    estado = resetRamp();
    expect(spriteAttenuation(estado.ramp)).toBe(1);
  });

  it('clearFocus devolve o par que a estrela que PERDE o foco recebe', () => {
    expect(clearFocus()).toEqual({ fade: FADE_NEUTRAL, focus: FOCUS_OFF });
    expect(spriteAttenuation(clearFocus().fade)).toBe(1);
    expect(isFocusBypassActive(clearFocus().focus)).toBe(false);
  });
});

describe('D3 — os atributos nascem NEUTROS', () => {
  it('aFade = 0 devolve atenuação 1 (estrela inteira)', () => {
    expect(FADE_NEUTRAL).toBe(0);
    expect(spriteAttenuation(FADE_NEUTRAL)).toBe(1);
  });

  it('aFocus = 0 deixa o branch de foco inerte; 1 liga o bypass', () => {
    expect(isFocusBypassActive(FOCUS_OFF)).toBe(false);
    expect(isFocusBypassActive(FOCUS_ON)).toBe(true);
    expect(isFocusBypassActive(0.5)).toBe(false); // fronteira exata: fora
  });

  it('a atenuação clampa como o shader e mantém o invariante de soma', () => {
    expect(spriteAttenuation(-1)).toBe(1);
    expect(spriteAttenuation(2)).toBe(0);
    for (let i = 0; i <= 100; i++) {
      const fade = i / 100;
      expect(spriteAttenuation(fade) + fade).toBeCloseTo(1, 12);
    }
  });
});

// ------------------------------------------------------------
// 9. A POLÍTICA DE DOMINÂNCIA (fase 3) — espelhos, curva, redes
// ------------------------------------------------------------
//
// O regime destes testes é o do gate visual: `screenH = 1713` é a ALTURA
// EFETIVA do buffer nas capturas do `ab-identidade` (janela 1800×1800
// menos o chrome do headless — o próprio harness reporta `@1800x1713`), e
// 3,5/0,85 são o `uExpoM0`/`uSigmaPx` com que o `new StarField` do
// `director.ts` constrói o campo. Os números abaixo são, por isso, os MESMOS que a
// fase 2 mediu na tela (achado A9) — se um deles se mover, a vista
// correspondente se move junto.
const SCREEN_H = 1713;
const EXPO = 3.5;
const SIGMA = 0.85;
/** a lente da hélice: 26°→56°, sempre igual ou mais fechada que a de referência */
const TAN_HELICE = Math.tan(28 * DEG);

/** O catálogo REAL do repo, decodificado pelo decodificador REAL. */
let cacheCatalogo: { meta: StarsMeta; stars: StarArrays } | null = null;
function catalogo() {
  if (!cacheCatalogo) {
    const meta = JSON.parse(
      readFileSync(new URL('../../../public/data/stars_meta.json', import.meta.url), 'utf8')
    ) as StarsMeta;
    const buf = readFileSync(new URL('../../../public/data/stars.bin', import.meta.url));
    const bin = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    cacheCatalogo = { meta, stars: decodeStars(bin, meta) };
  }
  return cacheCatalogo;
}

/** As 16 heroes DE VERDADE: quem escolhe é a classe, não este teste. */
let cacheHeroes: { chosen: { n: string; m: number; d: number; x: number; y: number; z: number }[]; sizePc: number[]; idx: number[] } | null = null;
function heroes16() {
  if (!cacheHeroes) {
    const { meta, stars } = catalogo();
    const h = new HeroStars(meta.named);
    cacheHeroes = {
      chosen: h.chosen,
      sizePc: h.sizePc,
      idx: matchHeroesToCatalog(h.chosen, stars.position, stars.logLum),
    };
    h.dispose();
  }
  return cacheHeroes;
}

function entradaDe(nome: string, dPc: number) {
  const { stars } = catalogo();
  const { chosen, sizePc, idx } = heroes16();
  const j = chosen.findIndex((s) => s.n === nome);
  return {
    camDistPc: dPc,
    heroSizePc: sizePc[j],
    catalogLogLum: stars.logLum[idx[j]],
    screenH: SCREEN_H,
    tanHalfFov: TAN_HELICE,
    expoM0: EXPO,
    sigmaPx: SIGMA,
  };
}

describe('espelhos em JS das duas contas de tela', () => {
  it('a lente de referência do uZoom é bit-idêntica à de heroStars', () => {
    // a associação importa: 29*(π/180) é o que MathUtils.degToRad faz
    expect(HERO_ZOOM_TAN_REF).toBe(Math.tan(29 * (Math.PI / 180)));
    expect(HeroStars.TAN_REF).toBe(HERO_ZOOM_TAN_REF);
    // e o consumidor IMPORTA em vez de redigitar (o elo que a fase 2
    // estabeleceu para as rampas do Sol, aqui para a lente)
    const src = readFileSync(new URL('./heroStars.ts', import.meta.url), 'utf8');
    expect(src).toContain('HERO_ZOOM_TAN_REF');
    expect(src).toContain('static readonly TAN_REF = HERO_ZOOM_TAN_REF;');
  });

  it('a magnitude aparente é a MESMA linha do vertex do catálogo', () => {
    const vert = readFileSync(new URL('../shaders/starShaders.ts', import.meta.url), 'utf8');
    expect(vert).toContain(
      'float m = -0.15 - 2.5 * aLogLum + 5.0 * (log2(max(dist, 1e-3)) * 0.30103);'
    );
    // logLum 0 é M_V = 4,85; a 10 pc a aparente tem de dar a absoluta
    expect(catalogApparentMag(0, 10)).toBeCloseTo(4.85, 5);
    // 10× mais longe = 5 magnitudes a mais
    expect(catalogApparentMag(1.3583, 100) - catalogApparentMag(1.3583, 10)).toBeCloseTo(5, 5);
    // e a guarda do shader (max(dist,1e-3)) impede o −∞ em d = 0
    expect(Number.isFinite(catalogApparentMag(1, 0))).toBe(true);
  });

  it('o tamanho do billboard: o fov se CANCELA em toda a lente da hélice', () => {
    const size = 0.0586; // ~Betelgeuse
    const canonico = (size * SCREEN_H) / (200 * HERO_ZOOM_TAN_REF);
    for (const fovGraus of [26, 40, 56, 58]) {
      expect(heroSizePx(size, 200, SCREEN_H, Math.tan((fovGraus / 2) * DEG))).toBeCloseTo(
        canonico,
        9
      );
    }
    // lente MAIS ABERTA que a de referência volta a depender do fov
    expect(heroSizePx(size, 200, SCREEN_H, Math.tan(45 * DEG))).toBeLessThan(canonico);
  });

  it('o billboard cresce com 1/d e a PSF do ponto com √log — o cruzamento é inevitável', () => {
    const size = 0.0586;
    const px = (d: number) => heroSizePx(size, d, SCREEN_H, TAN_HELICE);
    expect(px(8) / px(80)).toBeCloseTo(10, 9); // 1/d exato
    const ll = 4.1275;
    const psf = (d: number) => psfPointSizePx(catalogApparentMag(ll, d), EXPO, SIGMA, SCREEN_H);
    // a PSF anda 1,43× no mesmo trecho em que o billboard anda 10×
    expect(psf(8) / psf(80)).toBeCloseTo(1.426, 3);
  });

  it('guardas: entrada inválida devolve 0 (billboard ausente), nunca NaN', () => {
    expect(heroSizePx(0, 200, SCREEN_H, TAN_HELICE)).toBe(0);
    expect(heroSizePx(0.05, 0, SCREEN_H, TAN_HELICE)).toBe(0);
    expect(heroSizePx(0.05, 200, 0, TAN_HELICE)).toBe(0);
    expect(heroSizePx(0.05, 200, SCREEN_H, 0)).toBe(0);
    expect(heroSizePx(NaN, 200, SCREEN_H, TAN_HELICE)).toBe(0);
    expect(heroSizePx(0.05, Infinity, SCREEN_H, TAN_HELICE)).toBe(0);
  });

  it('o piso da PSF no regime do gate são os 5,93 px que a fase 2 mediu', () => {
    // com peak < 1 não há termo de saturação: size = 2·2,2·σ
    expect(psfPointSizePx(20, EXPO, SIGMA, SCREEN_H)).toBeCloseTo(5.932, 3);
    expect(psfPointSizePx(20, EXPO, SIGMA, SCREEN_H)).toBe(
      2 * 2.2 * ((SIGMA * SCREEN_H) / 1080)
    );
  });

  // (os testes de `heroSizePcDePx` morreram com ela no M1 — a inversa
  // só existia para o SunStar pedir tamanho em px, e o SunStar morreu.)
});

describe('g — a curva da cessão do ponto', () => {
  it('as bordas: 1 é a definição de dominância, 2,5 é DERIVADA da continuidade', () => {
    expect(HERO_DOMINANCE.enterRatio).toBe(1);
    expect(HERO_DOMINANCE.fullRatio).toBe(2.5);
    // a derivada máxima do smoothstep é 1,5/(hi−1); a compensação
    // disponível (dr/dr) é 1. Em 2,5 elas empatam — é a MENOR borda que
    // ainda garante φ′ = 1 − g′ ≥ 0 (ver a prova no módulo).
    expect(1.5 / (HERO_DOMINANCE.fullRatio - HERO_DOMINANCE.enterRatio)).toBe(1);
  });

  it('r ≤ 1 devolve 0 EXATO — é o que mantém as vistas bit-idênticas', () => {
    for (const r of [0, 0.1, 0.5, 0.9, 0.999999, 1]) expect(heroDominanceFade(r)).toBe(0);
    expect(spriteAttenuation(heroDominanceFade(1))).toBe(1);
  });

  it('r ≥ 2,5 devolve 1: o ponto virou detalhe dentro do clarão', () => {
    for (const r of [2.5, 3, 10, 1e6]) expect(heroDominanceFade(r)).toBe(1);
  });

  it('é monotônica e contínua — sem degrau em nenhum ponto da faixa', () => {
    const passo = 1e-4;
    let anterior = heroDominanceFade(0);
    for (let r = 0; r <= 4; r += passo) {
      const g = heroDominanceFade(r);
      expect(g).toBeGreaterThanOrEqual(anterior);
      // continuidade: o salto por passo é limitado pela derivada máxima
      expect(Math.abs(g - anterior)).toBeLessThanOrEqual(1.0 * passo + 1e-12);
      anterior = g;
    }
  });

  it('a derivada zera nas DUAS bordas (C¹): a cessão entra e sai sem quina', () => {
    const h = 1e-6;
    const d = (r: number) => (heroDominanceFade(r + h) - heroDominanceFade(r - h)) / (2 * h);
    expect(d(1)).toBeCloseTo(0, 4);
    expect(d(2.5)).toBeCloseTo(0, 4);
    expect(d(1.75)).toBeCloseTo(1, 4); // o máximo, exatamente 1
    // e nunca passa de 1 — a prova numérica da borda superior
    for (let r = 1; r <= 2.5; r += 1e-3) expect(d(r)).toBeLessThanOrEqual(1 + 1e-6);
  });

  it('entrada não-finita cede ZERO (direção segura: ponto inteiro)', () => {
    expect(heroDominanceFade(NaN)).toBe(0);
    expect(heroDominanceFade(Infinity)).toBe(0);
    expect(heroDominanceFade(-Infinity)).toBe(0);
  });
});

// ------------------------------------------------------------
// 9b. O FILTRO SOLAR — a MESMA razão, a rampa esticada em log
// ------------------------------------------------------------
//
// A rampa nasceu em 15/08 escrita como `1 − heroDominanceFade(r)`, isto é
// reaproveitando a curva da cessão. O voo de ida e volta do mesmo dia
// mostrou que ela não serve para 26,09 magnitudes: `1 → 2,5` de razão são
// 2,57× de distância, e o voo (34 degraus geométricos de fator 1,468)
// pegou 60% da troca entre DOIS degraus vizinhos — 0,232 → 0,341 UA, a
// foto `capturas/VOO-IDA.png`. `filtroSolarAlvo` estica a travessia
// simetricamente em log ao redor do cruzamento, e o que este bloco cobra
// é que o alargamento não trouxe número novo, não mexeu nas duas
// propriedades exatas que a rampa velha tinha nas pontas, e é de fato
// mais larga onde importa.
describe('as 4 vistas de hero — os números que a fase 2 mediu (A9)', () => {
  it('a 200 pc o PONTO domina: 0,91 px de billboard contra 5,93 do ponto', () => {
    const e = entradaDe('Betelgeuse', 200);
    expect(heroSizePx(e.heroSizePc, 200, SCREEN_H, TAN_HELICE)).toBeCloseTo(0.906, 3);
    expect(psfPointSizePx(catalogApparentMag(e.catalogLogLum, 200), EXPO, SIGMA, SCREEN_H))
      .toBeCloseTo(5.932, 3);
    expect(heroDominanceRatio(e)).toBeCloseTo(0.1527, 4);
    // e por isso hero200 sai BIT-IDÊNTICA
    expect(heroCatalogFade(e)).toBe(0);
  });

  it('a 600 e a 950 pc o billboard é sub-pixel: fade 0 nas duas', () => {
    expect(heroDominanceRatio(entradaDe('Betelgeuse', 600))).toBeLessThan(0.06);
    expect(heroCatalogFade(entradaDe('Betelgeuse', 600))).toBe(0);
    expect(heroDominanceRatio(entradaDe('Betelgeuse', 950))).toBeLessThan(0.04);
    expect(heroCatalogFade(entradaDe('Betelgeuse', 950))).toBe(0);
  });

  it('a 8 pc o HERO domina: 22,6 px contra 15,5 — e só aí o ponto cede', () => {
    const e = entradaDe('Betelgeuse', 8);
    expect(heroSizePx(e.heroSizePc, 8, SCREEN_H, TAN_HELICE)).toBeCloseTo(22.647, 3);
    expect(psfPointSizePx(catalogApparentMag(e.catalogLogLum, 8), EXPO, SIGMA, SCREEN_H))
      .toBeCloseTo(15.482, 3);
    expect(heroDominanceRatio(e)).toBeCloseTo(1.4628, 4);
    // a cessão da vista hero8: ~23% do ponto, não o apagamento dele
    expect(heroCatalogFade(e)).toBeCloseTo(0.2269, 4);
  });

  it('a dominância de Betelgeuse começa em ~12,2 pc e é plena em ~4,4 pc', () => {
    const r = (d: number) => heroDominanceRatio(entradaDe('Betelgeuse', d));
    expect(r(12.3)).toBeLessThan(1);
    expect(r(12.2)).toBeGreaterThan(1);
    expect(heroCatalogFade(entradaDe('Betelgeuse', 4.3))).toBe(1);
    expect(heroCatalogFade(entradaDe('Betelgeuse', 4.5))).toBeLessThan(1);
  });
});

describe('as redes de segurança da D2', () => {
  it('D2a — NENHUM dos 16 domina além de 320 pc, quanto mais de 900', () => {
    // a razão é monotônica decrescente em d, então bastam as bordas: se
    // ninguém domina em 320, ninguém domina depois. É por isso que a rede
    // "além de 900 pc o fade volta a 0" é REDUNDANTE por construção.
    const { chosen } = heroes16();
    for (const s of chosen) {
      expect(heroDominanceRatio(entradaDe(s.n, LOD_HERO.far.startPc))).toBeLessThan(1);
      expect(heroCatalogFade(entradaDe(s.n, LOD_HERO.far.startPc))).toBe(0);
      expect(heroCatalogFade(entradaDe(s.n, LOD_HERO.far.endPc))).toBe(0);
      expect(heroCatalogFade(entradaDe(s.n, 5000))).toBe(0);
    }
  });

  it('D2a — a dominância morre no MÁXIMO em 113 pc (Sirius, a maior das 16)', () => {
    const { chosen } = heroes16();
    let pior = 0;
    for (const s of chosen) {
      let lo = 1e-4;
      let hi = 2000;
      for (let k = 0; k < 100; k++) {
        const mid = (lo + hi) / 2;
        if (heroDominanceRatio(entradaDe(s.n, mid)) > 1) lo = mid;
        else hi = mid;
      }
      if (lo > pior) pior = lo;
    }
    expect(pior).toBeGreaterThan(100);
    expect(pior).toBeLessThan(120); // 2,8× de folga até os 320 pc do farFade
  });

  it('PERTO DE CASA A DOMINÂNCIA É A REGRA — 8 das 16 no Ato do Sol', () => {
    // O achado que a fase 3 mediu e que a fase 2 não tinha visto (A9 só
    // olhou Betelgeuse): na vista `sol` do ab-identidade (t=6) a câmera
    // está a 0,06 pc de casa, então a distância câmera↔hero é a própria
    // distância ao Sol — e aí OITO das 16 têm billboard maior que o
    // ponto. Sirius: 248 px de clarão contra 11 px de ponto.
    // O que MUDA pixel, porém, é mais estreito que isso, e a medição com
    // `?dom=1` fechou a conta: só muda a vista em que o PONTO está
    // dentro do quadro. Na `sol` (t=6) Sirius domina mas o ponto dele
    // cai fora do frustum — entra só o clarão, que esta política não
    // toca — e a vista sai bit-idêntica; nas quatro do Sol quem está
    // dentro do quadro é α Centauri, e elas mudam.
    const { chosen } = heroes16();
    const dominam = chosen.filter((s) => heroCatalogFade(entradaDe(s.n, s.d)) > 0);
    expect(dominam.map((s) => s.n).sort()).toEqual(
      [
        'Aldebaran',
        'Altair',
        'Arcturus',
        'Capella',
        'Procyon',
        'Rigil Kentaurus',
        'Sirius',
        'Vega',
      ].sort()
    );
    const sirius = chosen.find((s) => s.n === 'Sirius')!;
    expect(heroDominanceRatio(entradaDe('Sirius', sirius.d))).toBeGreaterThan(20);
    expect(heroCatalogFade(entradaDe('Sirius', sirius.d))).toBe(1);
    // ...e a 221 pc de casa (a vista `travessia`, t=100) nenhuma domina
    for (const s of chosen) {
      const d = Math.abs(s.d - 221) + 1; // ordem de grandeza da distância à câmera
      if (d > 100) expect(heroCatalogFade(entradaDe(s.n, d))).toBe(0);
    }
  });

  it('D2d/rede da presença — onde g > 0 a presença vale 1: o fator é inerte', () => {
    const { chosen } = heroes16();
    for (const s of chosen) {
      for (let d = 0.5; d < 200; d += 0.25) {
        const e = entradaDe(s.n, d);
        const g = heroDominanceFade(heroDominanceRatio(e));
        if (g > 0) {
          expect(heroPresence(d, e.heroSizePc)).toBe(1);
          expect(heroCatalogFade(e)).toBe(g);
        }
      }
    }
  });

  it('...e colado na estrela o billboard some e o PONTO VOLTA inteiro', () => {
    // regime absurdo (dentro de 1,4× o tamanho do clarão), que a viagem
    // não visita — mas a garantia é da conta, não da varredura
    const e = entradaDe('Betelgeuse', 0.02);
    expect(heroDominanceFade(heroDominanceRatio(e))).toBe(1); // domina de sobra
    expect(heroPresence(e.camDistPc, e.heroSizePc)).toBe(0); // ...e não desenha
    expect(heroCatalogFade(e)).toBe(0); // logo o ponto fica
  });

  it('guardas do consumidor: entrada podre não escurece ninguém', () => {
    const base = entradaDe('Betelgeuse', 8);
    expect(heroCatalogFade({ ...base, camDistPc: NaN })).toBe(FADE_NEUTRAL);
    expect(heroCatalogFade({ ...base, heroSizePc: 0 })).toBe(FADE_NEUTRAL);
    expect(heroCatalogFade({ ...base, screenH: 0 })).toBe(FADE_NEUTRAL);
    expect(heroCatalogFade({ ...base, tanHalfFov: NaN })).toBe(FADE_NEUTRAL);
  });

  it('a razão quase não depende da resolução (a política é da IMAGEM)', () => {
    const e = entradaDe('Betelgeuse', 8);
    const r1080 = heroDominanceRatio({ ...e, screenH: 1080 });
    const r4320 = heroDominanceRatio({ ...e, screenH: 4320 });
    expect(r4320 / r1080).toBeGreaterThan(0.8);
    expect(r4320 / r1080).toBeLessThan(1.3);
  });
});

describe('D2d — a luz combinada não dá um passo para trás na aproximação', () => {
  // A grandeza do invariante é a PRESENÇA COMBINADA em px:
  //     P(d) = ponto_px · (1 − fade) + billboard_px
  // (as duas camadas não têm normalização radiométrica comum — ver o
  // módulo —, e px é a régua que as duas compartilham). O que a D2d
  // proíbe é P andar para trás enquanto a câmera se aproxima: seria a
  // estrela piscando para baixo no meio do voo.
  const combinada = (nome: string, d: number) => {
    const e = entradaDe(nome, d);
    const ponto = psfPointSizePx(catalogApparentMag(e.catalogLogLum, d), EXPO, SIGMA, SCREEN_H);
    const hero = heroSizePx(e.heroSizePc, d, SCREEN_H, TAN_HELICE);
    return ponto * (1 - heroCatalogFade(e)) + hero;
  };

  it('varredura fina em Betelgeuse: monotônica de 1.200 pc até 0,5 pc', () => {
    let anterior = combinada('Betelgeuse', 1200);
    for (let d = 1200; d >= 0.5; d -= 0.05) {
      const p = combinada('Betelgeuse', d);
      expect(p).toBeGreaterThanOrEqual(anterior - 1e-9);
      anterior = p;
    }
  });

  it('e é CONTÍNUA: nenhum passo de 0,05 pc mexe mais de 5% na luz', () => {
    let anterior = combinada('Betelgeuse', 200);
    for (let d = 200; d >= 1; d -= 0.05) {
      const p = combinada('Betelgeuse', d);
      expect(Math.abs(p - anterior)).toBeLessThan(0.05 * anterior);
      anterior = p;
    }
  });

  it('nas 16, e no ponto mais perigoso (o meio da rampa, r = 1,75)', () => {
    // é onde g′ é máxima: se a política fosse cair rápido demais, quebra aqui
    const { chosen } = heroes16();
    for (const s of chosen) {
      let lo = 1e-3;
      let hi = 2000;
      for (let k = 0; k < 100; k++) {
        const mid = (lo + hi) / 2;
        if (heroDominanceRatio(entradaDe(s.n, mid)) > 1.75) lo = mid;
        else hi = mid;
      }
      const d = hi;
      expect(combinada(s.n, d * 0.99)).toBeGreaterThanOrEqual(combinada(s.n, d));
      expect(combinada(s.n, d)).toBeGreaterThanOrEqual(combinada(s.n, d * 1.01));
    }
  });

  it('com a política DESLIGADA a luz seria a de hoje — a dobrada', () => {
    // contraprova: sem cessão, P é maior (é a soma das duas luzes) em
    // todo o regime de dominância. A melhoria é medível, não retórica.
    const semCessao = (d: number) => {
      const e = entradaDe('Betelgeuse', d);
      return (
        psfPointSizePx(catalogApparentMag(e.catalogLogLum, d), EXPO, SIGMA, SCREEN_H) +
        heroSizePx(e.heroSizePc, d, SCREEN_H, TAN_HELICE)
      );
    };
    expect(semCessao(8)).toBeGreaterThan(combinada('Betelgeuse', 8));
    expect(semCessao(200)).toBe(combinada('Betelgeuse', 200)); // fora da dominância, igual
  });

  it('o ESCOPO da prova: presença = 1 acima de 1,4×uSize, e é toda a faixa da dominância', () => {
    // A álgebra da borda 2,5 supõe `H = r·C` — o hero desenhando INTEIRO.
    // Isso vale onde `heroPresence` = 1, isto é, acima de 1,4×uSize. O
    // maior 1,4×uSize dos 16 é o de Sirius; a dominância morre em 113 pc
    // no pior caso. Entre os dois números não há vão: a prova cobre a
    // viagem inteira, e é isso que o teste crava.
    const { chosen, sizePc } = heroes16();
    const maiorNear = Math.max(...sizePc.map((s) => s * LOD_HERO.near.endFactor));
    expect(maiorNear).toBeCloseTo(0.3028, 4);
    for (let j = 0; j < chosen.length; j++) {
      expect(heroPresence(maiorNear, sizePc[j])).toBe(1);
      // e onde a presença ainda não vale 1, a política é a rede: o fade
      // acompanha a presença e o ponto volta na mesma medida
      const d = sizePc[j] * 1.0; // dentro da janela do nearFade
      expect(heroCatalogFade(entradaDe(chosen[j].n, d))).toBeLessThan(1);
    }
  });

  it('...e ABAIXO de 1,4×uSize o invariante NÃO vale — regime herdado, documentado', () => {
    // O achado da caçada adversarial (fase 4b): colado na estrela o
    // `nearFade` do FRAG apaga o clarão e não há corpo nenhum para
    // assumir, então a luz combinada DIMINUI ao chegar perto. Não é
    // defeito desta política — é o handoff que só o Sol tem hoje, e que a
    // Onda 7 dá às outras (pendência nomeada). O teste existe para o dia
    // em que alguém ler a prova da borda 2,5 e achar que ela cobre isto.
    const j = heroes16().chosen.findIndex((s) => s.n === 'Sirius');
    const size = heroes16().sizePc[j];
    expect(size).toBeCloseTo(0.2163, 4);
    // a presença é a que o hero DE FATO desenha (nearFade × farFade)
    const P = (d: number) => {
      const e = entradaDe('Sirius', d);
      const ponto = psfPointSizePx(catalogApparentMag(e.catalogLogLum, d), EXPO, SIGMA, SCREEN_H);
      const hero = heroSizePx(size, d, SCREEN_H, TAN_HELICE) * heroPresence(d, size);
      return ponto * (1 - heroCatalogFade(e)) + hero;
    };
    const pico = P(0.28);
    expect(pico).toBeCloseTo(2297, 0);
    expect(P(0.11)).toBeCloseTo(18.65, 1);
    expect(pico / P(0.11)).toBeGreaterThan(100); // 123× medidos
    // ...e a rede FUNCIONA: com o clarão apagado o ponto volta INTEIRO
    expect(heroPresence(0.05, size)).toBe(0);
    expect(heroCatalogFade(entradaDe('Sirius', 0.05))).toBe(0);
    expect(P(0.05)).toBeCloseTo(
      psfPointSizePx(catalogApparentMag(entradaDe('Sirius', 0.05).catalogLogLum, 0.05), EXPO, SIGMA, SCREEN_H),
      9
    );
  });
});

describe('o casamento hero↔catálogo', () => {
  it('as 16 acham par no catálogo REAL do repo', () => {
    const { idx, chosen } = heroes16();
    expect(idx.length).toBe(16);
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect(new Set(idx).size).toBe(16); // sem dois heroes no mesmo ponto
    expect(chosen.map((s) => s.n)).toContain('Betelgeuse');
  });

  it('o par casa em posição E em luminosidade', () => {
    const { stars } = catalogo();
    const { idx, chosen } = heroes16();
    for (let j = 0; j < idx.length; j++) {
      const s = chosen[j];
      const i = idx[j];
      const dx = stars.position[i * 3] - s.x;
      const dy = stars.position[i * 3 + 1] - s.y;
      const dz = stars.position[i * 3 + 2] - s.z;
      // dentro do erro de quantização declarado pelo próprio build
      expect(Math.hypot(dx, dy, dz)).toBeLessThan(HERO_MATCH_REL_TOL * s.d);
      const esperado = 0.4 * (4.85 - (s.m - 5 * Math.log10(s.d) + 5));
      expect(Math.abs(stars.logLum[i] - esperado)).toBeLessThan(1e-3);
    }
  });

  it('as DUPLAS: Acrux e Rigil Kentaurus têm duas entradas no mesmo lugar', () => {
    // α Cru A/B caem no MESMO ponto quantizado (separação idêntica até o
    // último bit): posição sozinha escolheria por sorte de ordenação. É
    // a luminosidade que decide, e por 0,32 dex de margem.
    const { stars } = catalogo();
    const { idx, chosen } = heroes16();
    const jA = chosen.findIndex((s) => s.n === 'Acrux');
    const jR = chosen.findIndex((s) => s.n === 'Rigil Kentaurus');
    for (const [j, nome] of [[jA, 'Acrux'], [jR, 'Rigil Kentaurus']] as const) {
      const s = chosen[j];
      const tol = HERO_MATCH_REL_TOL * s.d;
      let candidatos = 0;
      for (let i = 0; i < stars.logLum.length; i++) {
        const dx = stars.position[i * 3] - s.x;
        if (dx > tol || dx < -tol) continue;
        const dy = stars.position[i * 3 + 1] - s.y;
        const dz = stars.position[i * 3 + 2] - s.z;
        if (dx * dx + dy * dy + dz * dz <= tol * tol) candidatos++;
      }
      expect(candidatos).toBe(2); // a companheira está lá
      const esperado = 0.4 * (4.85 - (s.m - 5 * Math.log10(s.d) + 5));
      expect(Math.abs(stars.logLum[idx[j]] - esperado)).toBeLessThan(1e-3);
      expect(nome).toBeTruthy();
    }
  });

  it('sem par é DECLARAÇÃO (−1), nunca o vizinho mais próximo', () => {
    const pos = new Float32Array([0, 0, 10, 0, 0, 20]);
    const lum = new Float32Array([1, 2]);
    // alvo a 10 pc do primeiro ponto: fora da tolerância relativa
    const longe = [{ x: 0, y: 0, z: 30, m: 5, d: 30 }];
    expect(matchHeroesToCatalog(longe, pos, lum)).toEqual([-1]);
    // e entrada inválida também não chuta
    expect(matchHeroesToCatalog([{ x: 0, y: 0, z: 10, m: 5, d: 0 }], pos, lum)).toEqual([-1]);
    expect(matchHeroesToCatalog([{ x: NaN, y: 0, z: 10, m: 5, d: 10 }], pos, lum)).toEqual([-1]);
  });

  it('INJETIVO: dois alvos no mesmo ponto não ficam com o mesmo índice', () => {
    // conserto da revisão (fase 4b). Hoje os 16 casam um a um, mas o laço
    // não impedia a colisão — e colisão silenciosa é a dupla-luz voltando
    // numa das duas sem nada denunciar. UM ponto no catálogo, DOIS alvos.
    const pos = new Float32Array([0, 0, 10]);
    const lum = new Float32Array([2.5]);
    const mDe = (ll: number) => 4.85 - 2.5 * ll + 5 * Math.log10(10) - 5;
    const perto = { x: 0, y: 0, z: 10, m: mDe(2.5), d: 10 }; // casa exato
    const longe = { x: 0, y: 0, z: 10, m: mDe(0.5), d: 10 }; // 2 dex pior
    expect(matchHeroesToCatalog([perto, longe], pos, lum)).toEqual([0, -1]);
    // e a ordem dos alvos não decide: quem casa melhor fica, sempre
    expect(matchHeroesToCatalog([longe, perto], pos, lum)).toEqual([-1, 0]);
    // −1 é o caminho seguro que já existia: o consumidor pula o slot e o
    // ponto fica INTEIRO (o comportamento pré-onda), com o mesmo
    // `console.warn` de "sem par no catálogo" que o director já emite.
  });

  it('empate exato de score na colisão: vence o primeiro alvo, sem oscilar', () => {
    const pos = new Float32Array([0, 0, 10]);
    const lum = new Float32Array([2.5]);
    const alvo = { x: 0, y: 0, z: 10, m: 4.85 - 2.5 * 2.5 + 5 * Math.log10(10) - 5, d: 10 };
    expect(matchHeroesToCatalog([{ ...alvo }, { ...alvo }], pos, lum)).toEqual([0, -1]);
  });

  it('empate de posição é desfeito pela luminosidade, não pela ordem', () => {
    // dois pontos no MESMO lugar, luminosidades diferentes
    const pos = new Float32Array([0, 0, 10, 0, 0, 10]);
    const lum = new Float32Array([0.5, 2.5]);
    // alvo cuja logLum esperada é 2,5: m tal que 0,4·(4,85 − M) = 2,5
    const m = (10 - 4.85) / -2.5 + 4.85 + 0; // M = 4,85 − 2,5·2,5 = −1,4
    expect(m).toBeTruthy();
    const alvo = [{ x: 0, y: 0, z: 10, m: -1.4 + 5 * Math.log10(10) - 5, d: 10 }];
    expect(matchHeroesToCatalog(alvo, pos, lum)).toEqual([1]);
    const alvo2 = [{ x: 0, y: 0, z: 10, m: 3.6 + 5 * Math.log10(10) - 5, d: 10 }];
    expect(matchHeroesToCatalog(alvo2, pos, lum)).toEqual([0]);
  });
});

describe('a CHAVE da cessão (achado da fase 3, virada na fase 4a)', () => {
  it('está LIGADA, e o consumidor lê a chave — não a política direto', () => {
    // Fase 4a, decisão D11 do coordenador (veredito visual de 2026-08-11):
    // a dupla-luz hero↔catálogo fica desfeita por padrão. A chave nasceu
    // `false` na fase 3 só para o gate daquela fase sair bit-idêntico; o
    // CONTRATO da política (g(r≤1)=0, monotonia, invariante de soma) não
    // depende dela e não mudou nesta virada.
    expect(DOMINANCE_DEFAULT_ON).toBe(true);
    const director = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    // PINAGEM DELIBERADA DE FIAÇÃO, e só disso (anotação da fase 4b): o
    // COMPORTAMENTO da política está testado logo abaixo, na função pura
    // `fadesDoQuadro`. O que sobra aqui é o que nenhuma função pura pode
    // provar — que as duas portas de URL existem no director com este
    // nome exato, e que a chave passa por elas.
    expect(director).toContain('DOMINANCE_DEFAULT_ON');
    expect(director).toContain("this.debug.has('dom')");
    expect(director).toContain("!this.hide.has('nodom')");
    // `?nodom` segue registrado como chave de URL viva (o caminho de volta)
    expect(director).toContain("'nodom',");
    // e o fio vai para a política pura, não para uma segunda cópia dela
    expect(director).toContain('fadesDoQuadro(');
  });

  it('a ORDEM da fiação está pinada: o update dos heroes vem ANTES da escrita', () => {
    // não é preciosismo: `heroes.camDistPc` é preenchido no `update`, e
    // inverter as duas linhas daria o fade da distância do quadro
    // ANTERIOR — e `Infinity` no primeiro quadro (o valor de nascimento).
    // Nenhum teste de função pura pega isto; este pega.
    const director = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    const update = director.indexOf('this.heroes?.update(');
    const escrita = director.indexOf('this.writeHeroFades(');
    expect(update).toBeGreaterThan(0);
    expect(escrita).toBeGreaterThan(update);
  });

  it('desligada por `?nodom=1`, o campo volta a ser o de sempre', () => {
    // o que o caminho de volta escreve é o NEUTRO, e
    // `spriteAttenuation(FADE_NEUTRAL)` é 1 — o campo desenha exatamente
    // o que desenhava antes da onda. É esta identidade que sustenta as
    // duas provas de pixel-igual das fases 2 e 3.
    expect(spriteAttenuation(FADE_NEUTRAL)).toBe(1);
    expect(isFocusBypassActive(FOCUS_OFF)).toBe(false);
  });
});

describe('fadesDoQuadro — a fiação da onda, agora testada por COMPORTAMENTO', () => {
  // Achado da caçada adversarial (fase 4b): `writeHeroFades` concentrava
  // TUDO de que a política precisa para funcionar — a ordem do update, o
  // gate do grupo, as portas de URL e a limpeza do resíduo — e o que
  // existia de teste era leitura do texto-fonte, que quebra com um
  // `rename` inofensivo e passa com a fiação errada. A parte pura saiu
  // para `lodStellar` e é ela que este bloco exercita.
  const CAM = { screenH: SCREEN_H, tanHalfFov: TAN_HELICE, expoM0: EXPO, sigmaPx: SIGMA };
  function entradas() {
    const { stars } = catalogo();
    const { chosen, sizePc, idx } = heroes16();
    return { chosen, sizePc, idx, logLum: idx.map((i) => (i >= 0 ? stars.logLum[i] : 0)) };
  }
  /** as 16 vistas das próprias distâncias ao Sol (a vista `sol`: 8 dominam) */
  const dCasa = () => entradas().chosen.map((s) => s.d);

  it('DESLIGADO escreve neutro em todos, mesmo onde a dominância é plena', () => {
    const { sizePc, idx, logLum } = entradas();
    const ligados = fadesDoQuadro(idx, dCasa(), sizePc, logLum, CAM, true);
    expect(ligados.filter((v) => v > 0).length).toBe(8); // o achado A13
    const desligados = fadesDoQuadro(idx, dCasa(), sizePc, logLum, CAM, false);
    expect(desligados.every((v) => v === FADE_NEUTRAL)).toBe(true);
  });

  it('LIGADO é a MESMA política, slot a slot (não uma segunda cópia dela)', () => {
    const { chosen, sizePc, idx, logLum } = entradas();
    const d = dCasa();
    const saida = fadesDoQuadro(idx, d, sizePc, logLum, CAM, true);
    for (let i = 0; i < idx.length; i++) {
      expect(saida[i]).toBe(heroCatalogFade(entradaDe(chosen[i].n, d[i])));
    }
  });

  it('o resíduo do quadro anterior é limpo NO MESMO quadro em que a chave vira', () => {
    // é o que faz `?nodom=1` (e `?nohero=1`, e o corte dHome≥1200) terem
    // efeito imediato, e o que mantém o gate do céu medindo o de sempre
    const { sizePc, idx, logLum } = entradas();
    const out: number[] = [];
    fadesDoQuadro(idx, dCasa(), sizePc, logLum, CAM, true, out);
    expect(out.some((v) => v > 0)).toBe(true);
    const mesmo = fadesDoQuadro(idx, dCasa(), sizePc, logLum, CAM, false, out);
    expect(mesmo).toBe(out); // o array é reusado entre quadros
    expect(out.every((v) => v === FADE_NEUTRAL)).toBe(true);
  });

  it('distância podre (Infinity do nascimento, NaN) não escurece ninguém', () => {
    const { sizePc, idx, logLum } = entradas();
    const infinitas = idx.map(() => Infinity); // o valor de `camDistPc` no init
    expect(fadesDoQuadro(idx, infinitas, sizePc, logLum, CAM, true).every((v) => v === 0)).toBe(
      true
    );
    const nans = idx.map(() => NaN);
    expect(fadesDoQuadro(idx, nans, sizePc, logLum, CAM, true).every((v) => v === 0)).toBe(true);
  });

  it('slot SEM PAR (−1) recebe neutro — e o consumidor o pula', () => {
    const { sizePc, idx, logLum } = entradas();
    const semPar = idx.map((v, i) => (i === 0 ? -1 : v));
    const saida = fadesDoQuadro(semPar, dCasa(), sizePc, logLum, CAM, true);
    expect(saida[0]).toBe(FADE_NEUTRAL);
    // e o resto do quadro não muda por causa dele
    const inteiro = fadesDoQuadro(idx, dCasa(), sizePc, logLum, CAM, true);
    expect(saida.slice(1)).toEqual(inteiro.slice(1));
  });

  it('o tamanho da saída acompanha o número de pares, sempre', () => {
    const { sizePc, idx, logLum } = entradas();
    const out = [1, 2, 3];
    fadesDoQuadro(idx, dCasa(), sizePc, logLum, CAM, false, out);
    expect(out.length).toBe(idx.length);
    fadesDoQuadro([], [], [], [], CAM, true, out);
    expect(out.length).toBe(0);
  });
});

describe('D3 — o par de atributos nasce inerte no shader novo', () => {
  it('a linha do STAR_VERT é a que o espelho descreve', () => {
    const vert = readFileSync(new URL('../shaders/starShaders.ts', import.meta.url), 'utf8');
    expect(vert).toContain('attribute float aFade;');
    expect(vert).toContain('attribute float aFocus;');
    expect(vert).toContain(
      'float atten = mix(clamp(1.0 - aFade, 0.0, 1.0), 1.0, step(0.5, aFocus));'
    );
    expect(vert).toContain('alpha *= atten;');
    // E o vSat cede junto, senão os espinhos de difração ficavam por cima —
    // pela atenuação TOTAL (alpha), não só pela cessão por estrela (atten):
    // alpha nasce 1.0 e acumula extinção + uFade + atten, então é o MESMO
    // fator que vPeak recebe. A pinagem é de FIAÇÃO: se alguém devolver a
    // linha para `atten`, os espinhos voltam a ficar com força cheia sobre um
    // núcleo já esmaecido (achado da caçada adversarial da Onda 3).
    expect(vert).toContain('vSat = sat * alpha;');
    // e a ordem importa: alpha já tem os três fatores quando vSat o usa
    expect(vert.indexOf('alpha *= atten;')).toBeLessThan(vert.indexOf('vSat = sat * alpha;'));
  });

  it('(0, 0) devolve atenuação 1: o campo desenha o que desenhava', () => {
    // oráculo transcrito do `mix` do STAR_VERT (o espelho combinado
    // `spriteAttenuationWithFocus` morreu no M1 — era órfão de runtime;
    // a linha do shader continua viva e é pinada acima)
    const mixDoVert = (fade: number, focus: number) =>
      isFocusBypassActive(focus) ? 1 : spriteAttenuation(fade);
    expect(mixDoVert(FADE_NEUTRAL, FOCUS_OFF)).toBe(1);
    // e o bypass de foco ignora QUALQUER fade (o corpo chega na Onda 7)
    expect(mixDoVert(1, FOCUS_ON)).toBe(1);
    expect(mixDoVert(0.5, FOCUS_ON)).toBe(1);
    expect(mixDoVert(0.5, FOCUS_OFF)).toBe(0.5);
    expect(mixDoVert(0.5, 0.5)).toBe(0.5); // fronteira: fora
  });
});

// ------------------------------------------------------------
// 10. A ENTREGA PONTO↔CLARÃO (F3 da onda do Sol real) — a única
//     janela do Sol, e a cirurgia que separou as duas constantes.
// ------------------------------------------------------------
//
// A janela `deep` da Onda 4 existia para dissolver o disco INFLADO ao se
// chegar perto de casa. Com o Sol de raio físico não há o que dissolver,
// e a janela mudou de assunto sem mudar de números: ela agora é a
// ENTREGA entre as duas representações de PONTO do Sol — o vértice 0 da
// camada dos dez corpos e o clarão do `SunStar`.
//
// O que este bloco cobra é o que a fase prometeu: (1) as duas somam 1
// em toda distância, (2) as vistas oficiais fora da janela não se movem
// um bit, (3) a borda de cima da janela é EXATAMENTE onde a camada dos
// dez some, e (4) a constante do sistema solar ficou congelada e
// separada, com os três consumidores importando dela.

describe('a CIRURGIA da constante — duas perguntas, dois símbolos', () => {
  const engine = readFileSync(new URL('../core/engine.ts', import.meta.url), 'utf8');
  const rig = readFileSync(new URL('../cinematic/cameraRig.ts', import.meta.url), 'utf8');
  const escala = readFileSync(new URL('../escala.ts', import.meta.url), 'utf8');

  it('a constante do SISTEMA SOLAR está congelada em 0,05 pc, com âncora escrita', () => {
    expect(LIMIAR_SISTEMA_SOLAR_PC).toBe(0.05);
    // a âncora: 0,05 pc = 10.313 UA, contra os 35,4 UA de Plutão
    expect(LIMIAR_SISTEMA_SOLAR_PC * 206264.80624548031).toBeCloseTo(10313.24, 2);
    expect(escala).toContain('10.313 UA');
    expect(escala).toContain('35,4 UA');
  });

  it('os consumidores importam de `escala.ts`, e não do LOD', () => {
    // é a cirurgia: até a F3 os consumidores liam `DEEP_LIMIAR_PC`, o
    // mesmo símbolo que dizia onde o disco morria. Desde o M1 a camada
    // dos dez NÃO consome limiar nenhum (o corte de distância dela
    // morreu — planetas.test.ts cobra a ausência); ficam o plano de
    // corte (engine) e a velocidade do voo (rig).
    for (const [nome, txt] of [
      ['engine', engine],
      ['rig', rig],
    ] as const) {
      expect(txt, nome).toMatch(/import \{[^}]*\bLIMIAR_SISTEMA_SOLAR_PC\b[^}]*\} from '[^']*escala'/);
      // o `not` é sobre o IMPORT, não sobre a prosa: os comentários
      // desses arquivos citam o nome antigo de propósito, para contar o
      // que a cirurgia separou
      expect(txt, nome).not.toMatch(/import \{[^}]*\bDEEP_LIMIAR_PC\b/);
    }
    expect(engine).toContain('distFromSun >= LIMIAR_SISTEMA_SOLAR_PC');
    expect(rig).toContain('dPc >= LIMIAR_SISTEMA_SOLAR_PC');
    expect(engine).not.toMatch(/distFromSun >= 0\.05/);
  });

  it('e as fórmulas ANTIGAS do near/far e da velocidade seguem literais', () => {
    // o gate da Onda 4 era a igualdade bit a bit acima do limiar: se
    // alguém mexer num destes literais, ela morre em silêncio.
    expect(engine).toContain('THREE.MathUtils.clamp(distFromSun * 0.004, 0.001, 40)');
    expect(engine).toContain('THREE.MathUtils.clamp(distFromSun * 12, 60000, 400000)');
    expect(engine).toContain('const near = nearPlanePc(distFromSun, dSuperficiePc, raioCorpoPc);');
    expect(engine).toContain('const far = farPlanePc(distFromSun);');
    expect(rig).toContain('THREE.MathUtils.clamp(dPc * 0.02, 2, 600)');
    expect(rig).toContain('this.speed = velocidadeDeVoo(this.camera.position.length());');
    expect(rig).toContain('pisoDaRoda(this.camera.position.length()),');
  });

  // (a SABOTAGEM da igualdade LIMIAR_DA_ENTREGA_PC === LIMIAR_SISTEMA_SOLAR_PC
  // morreu com a entrega no M1: não existe mais janela para divergir da
  // camada — o Sol-ponto não é cortado por distância nenhuma.)
});
