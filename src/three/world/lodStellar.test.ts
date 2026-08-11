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
import { WORLD } from '../config';
import {
  DISC_ENTER_RAD,
  DISC_EXIT_RAD,
  DISC_VISIBLE_MIN,
  FADE_NEUTRAL,
  FOCUS_OFF,
  FOCUS_ON,
  LOD_HERO,
  LOD_SOL,
  POINT_SIZE_CEILING_PX,
  RAMP_DURATION_MS,
  clearFocus,
  computeSolidAngle,
  discWorldFade,
  distanceForSolidAngle,
  heroFarFade,
  heroNearFade,
  heroPresence,
  isDiscGroupVisible,
  isFocusBypassActive,
  maxSpriteSolidAngleRad,
  needsAttributeWrite,
  projectedRadiusPx,
  psfPointSizePx,
  resetRamp,
  shouldDiscBeActive,
  spriteAttenuation,
  stepRampToward,
  sunStarCore,
  sunStarGain,
} from './lodStellar';

const DEG = Math.PI / 180;

/** Varredura fina do regime do Sol: 0,01 → 5 pc, 1 mpc de passo. */
const VARREDURA: number[] = [];
for (let i = 0; i <= 4990; i++) VARREDURA.push(0.01 + i * 0.001);

// ------------------------------------------------------------
// 1. Integrador da rampa — 11 casos portados verbatim do doador
// ------------------------------------------------------------
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
// 2. Janelas do Sol — pinagem verbatim (mata a redigitação)
// ------------------------------------------------------------
describe('janelas de LOD do Sol — pinagem verbatim da casa', () => {
  it('as 7 janelas são exatamente as do código: 0,16 / 0,34 / 0,14 / 0,30 / 0,42 / 320 / 900', () => {
    expect(LOD_SOL.disc.fade0Pc).toBe(0.16);
    expect(LOD_SOL.disc.fade1Pc).toBe(0.34);
    expect(LOD_SOL.starGain.startPc).toBe(0.14);
    expect(LOD_SOL.starGain.endPc).toBe(0.3);
    expect(LOD_SOL.starCore.startPc).toBe(0.3);
    expect(LOD_SOL.starCore.endPc).toBe(0.42);
    expect(LOD_HERO.far.startPc).toBe(320);
    expect(LOD_HERO.far.endPc).toBe(900);
    expect(DISC_VISIBLE_MIN).toBe(0.02);
  });

  it('a janela near dos heroes é em múltiplos do próprio tamanho: 0,5 e 1,4', () => {
    expect(LOD_HERO.near.startFactor).toBe(0.5);
    expect(LOD_HERO.near.endFactor).toBe(1.4);
  });

  it('as larguras são os literais que os consumidores dividem (0,16 e 0,12)', () => {
    expect(LOD_SOL.starGain.widthPc).toBe(0.16);
    expect(LOD_SOL.starCore.widthPc).toBe(0.12);
  });

  it('as janelas se sobrepõem na ordem 0,14 < 0,16 < 0,30 < 0,34 < 0,42', () => {
    const ordem = [
      LOD_SOL.starGain.startPc,
      LOD_SOL.disc.fade0Pc,
      LOD_SOL.starGain.endPc,
      LOD_SOL.disc.fade1Pc,
      LOD_SOL.starCore.endPc,
    ];
    for (let i = 1; i < ordem.length; i++) expect(ordem[i]).toBeGreaterThan(ordem[i - 1]);
  });

  it('ARMADILHA DE FLOAT: derivar a largura do fim mudaria o último bit da rampa', () => {
    // é por isso que a tabela guarda largura E fim
    expect(LOD_SOL.starGain.endPc - LOD_SOL.starGain.startPc).not.toBe(LOD_SOL.starGain.widthPc);
    expect(LOD_SOL.starGain.startPc + LOD_SOL.starGain.widthPc).not.toBe(LOD_SOL.starGain.endPc);
    expect(LOD_SOL.disc.fade1Pc - LOD_SOL.disc.fade0Pc).not.toBe(0.18);

    const larguraDerivada = LOD_SOL.starGain.endPc - LOD_SOL.starGain.startPc;
    const rampaDerivada = (d: number) => {
      const k = Math.min(1, Math.max(0, (d - LOD_SOL.starGain.startPc) / larguraDerivada));
      return k * k * (3 - 2 * k);
    };
    const rampaDiscoLiteral = (d: number) => {
      const wk = (d - LOD_SOL.disc.fade0Pc) / 0.18;
      return wk <= 0 ? 1 : wk >= 1 ? 0 : 1 - wk * wk * (3 - 2 * wk);
    };
    expect(VARREDURA.some((d) => rampaDerivada(d) !== sunStarGain(d))).toBe(true);
    expect(VARREDURA.some((d) => rampaDiscoLiteral(d) !== discWorldFade(d))).toBe(true);
  });

  it('a FIAÇÃO existe: os consumidores importam daqui e a redigitação não voltou', () => {
    // Na fase 1 este teste conferia NÚMERO contra número, lendo o TEXTO
    // de `novoSol.ts` e de `heroStars.ts` — era o único elo entre dois
    // arquivos que não se importavam (risco 5 do mapa da casa). A fase 2
    // fez a fiação, então o teste mudou de alvo: agora ele guarda o
    // CONSUMO. Se alguém reescrever uma rampa à mão em vez de chamar
    // daqui, o número volta a poder divergir em silêncio — e quebra aqui.
    const stellarBody = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');
    const heroStars = readFileSync(new URL('./heroStars.ts', import.meta.url), 'utf8');

    expect(stellarBody).toMatch(/import \{[^}]*\bdiscWorldFade\b[^}]*\} from '\.\/lodStellar'/);
    expect(stellarBody).toMatch(/import \{[^}]*\bisDiscGroupVisible\b[^}]*\} from '\.\/lodStellar'/);
    expect(stellarBody).toContain('discWorldFade(dPc)');
    expect(stellarBody).toContain('isDiscGroupVisible(world)');

    expect(heroStars).toMatch(/import \{[^}]*\bsunStarGain\b[^}]*\} from '\.\/lodStellar'/);
    expect(heroStars).toMatch(/import \{[^}]*\bsunStarCore\b[^}]*\} from '\.\/lodStellar'/);
    expect(heroStars).toContain('sunStarGain(d)');
    expect(heroStars).toContain('sunStarCore(d)');

    // e nenhuma das três rampas voltou a ser digitada no consumidor: os
    // padrões abaixo casam CÓDIGO (a divisão pela janela e a cúbica do
    // smoothstep), não prosa de comentário
    expect(stellarBody).not.toMatch(/\(dPc - [\d.]+\)\s*\//);
    expect(stellarBody).not.toMatch(/wk \* wk \* \(3 - 2 \* wk\)/);
    expect(heroStars).not.toMatch(/\(d - [\d.]+\) \/ [\d.]+/);
    expect(heroStars).not.toMatch(/[kc] \* [kc] \* \(3 - 2 \* [kc]\)/);
  });

  it('as duas janelas das 16 heroes seguem no GLSL, com os números pinados (D7)', () => {
    // Decisão D7: o shader dos heroes genéricos NÃO muda na fase 2 — o
    // espelho JS puro (LOD_HERO/heroPresence) existe para a fase 3, que
    // escreve `aFade` no ponto do catálogo. Enquanto o pixel do hero sair
    // do FRAG, é o texto do FRAG que tem de casar com a tabela.
    const heroStars = readFileSync(new URL('./heroStars.ts', import.meta.url), 'utf8');
    const near = heroStars.match(/smoothstep\(uSize \* ([\d.]+), uSize \* ([\d.]+), uCamDist\)/);
    const far = heroStars.match(/1\.0 - smoothstep\(([\d.]+), ([\d.]+), uCamDist\)/);
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(Number(near?.[1])).toBe(LOD_HERO.near.startFactor);
    expect(Number(near?.[2])).toBe(LOD_HERO.near.endFactor);
    expect(Number(far?.[1])).toBe(LOD_HERO.far.startPc);
    expect(Number(far?.[2])).toBe(LOD_HERO.far.endPc);
  });
});

// ------------------------------------------------------------
// 2b. As vistas do gate visual, pinadas em número
// ------------------------------------------------------------
describe('as 8 vistas novas do ab-identidade — o regime de cada uma', () => {
  // `scripts/visual/ab-identidade.mjs` cravou 8 vistas por DISTÂNCIA na
  // fase 2 (4 do Sol, 4 de Betelgeuse). O que faz cada uma valer a pena é
  // o REGIME em que ela cai; se uma janela se mexer, a vista deixa de
  // medir o que foi escolhida para medir — e isso tem de quebrar aqui,
  // não passar despercebido numa bateria de 45 min de GPU.
  it('0,10 pc é disco PLENO: o clarão ainda não começou', () => {
    expect(discWorldFade(0.1)).toBe(1);
    expect(sunStarGain(0.1)).toBe(0);
    expect(sunStarCore(0.1)).toBe(0);
    expect(isDiscGroupVisible(discWorldFade(0.1))).toBe(true);
  });

  it('0,25 pc é o MEIO da rampa do disco, com o clarão em 3/4', () => {
    expect(discWorldFade(0.25)).toBeCloseTo(0.5, 12);
    expect(sunStarGain(0.25)).toBeCloseTo(0.76806640625, 12);
    expect(sunStarCore(0.25)).toBe(0);
  });

  it('0,32 pc é o ESTOURO: disco quase morto, clarão pleno, núcleo abrindo', () => {
    expect(discWorldFade(0.32)).toBeCloseTo(0.0342935528, 9);
    // e ainda ACIMA do corte duro (que cai em ~0,3249 pc): a vista mede
    // o último fôlego do disco, o degrau mais sensível das quatro
    expect(isDiscGroupVisible(discWorldFade(0.32))).toBe(true);
    expect(sunStarGain(0.32)).toBe(1);
    expect(sunStarCore(0.32)).toBeCloseTo(0.0740740741, 9);
  });

  it('0,50 pc é ESTRELA PURA: grupo do disco cortado, clarão e núcleo em 1', () => {
    expect(discWorldFade(0.5)).toBe(0);
    expect(isDiscGroupVisible(discWorldFade(0.5))).toBe(false);
    expect(sunStarGain(0.5)).toBe(1);
    expect(sunStarCore(0.5)).toBe(1);
  });

  it('as 3 distâncias de hero caem nos 3 regimes do farFade', () => {
    expect(heroFarFade(200)).toBe(1); // presença cheia
    expect(heroFarFade(600)).toBeCloseTo(0.5258518184, 9); // meio da rampa
    expect(heroFarFade(950)).toBe(0); // apagado: só o ponto do catálogo
  });

  it('e a 4ª (8 pc) é a única em que o billboard do hero é VISÍVEL', () => {
    // Medida antes de escolher as vistas: o raio na tela de um hero é
    // `uSize / (d · tan(58°/2))` em meias-alturas de tela — não depende da
    // lente, porque o uZoom cancela o fov de propósito (heroStars.ts:14-16).
    // Betelgeuse tem uSize = 0,08·10^(−0,3·0,45) = 0,0586 pc.
    const raioPx = (dPc: number, sizePc: number) =>
      (sizePc / (dPc * Math.tan(29 * DEG))) * (1713 / 2);
    const BETELGEUSE = 0.08 * Math.pow(10, -0.3 * 0.45);
    expect(raioPx(200, BETELGEUSE)).toBeLessThan(0.5);
    expect(raioPx(600, BETELGEUSE)).toBeLessThan(0.2);
    expect(raioPx(950, BETELGEUSE)).toBeLessThan(0.2);
    expect(raioPx(8, BETELGEUSE)).toBeGreaterThan(10);
    // e nela a presença é CHEIA — é a vista que julga a dupla-luz da D2
    expect(heroPresence(8, BETELGEUSE)).toBe(1);
    expect(spriteAttenuation(heroPresence(8, BETELGEUSE))).toBe(0);
  });
});

// ------------------------------------------------------------
// 3. As rampas reproduzem a matemática da casa BIT A BIT
// ------------------------------------------------------------
describe('rampas — forma exata dos consumidores atuais', () => {
  // Oráculo: as três expressões transcritas de novo, direto das linhas
  // dos consumidores (novoSol.ts:334-335, heroStars.ts:224-225,236-237).
  const oraculoDisco = (dPc: number) => {
    const wk = (dPc - 0.16) / (0.34 - 0.16);
    return wk <= 0 ? 1 : wk >= 1 ? 0 : 1 - wk * wk * (3 - 2 * wk);
  };
  const oraculoGain = (d: number) => {
    const k = Math.min(1, Math.max(0, (d - 0.14) / 0.16));
    return k * k * (3 - 2 * k);
  };
  const oraculoCore = (d: number) => {
    const c = Math.min(1, Math.max(0, (d - 0.3) / 0.12));
    return c * c * (3 - 2 * c);
  };

  it('o disco bate o oráculo em toda a varredura (igualdade exata, não aproximada)', () => {
    for (const d of VARREDURA) expect(discWorldFade(d)).toBe(oraculoDisco(d));
  });

  it('uGain bate o oráculo em toda a varredura', () => {
    for (const d of VARREDURA) expect(sunStarGain(d)).toBe(oraculoGain(d));
  });

  it('uCore bate o oráculo em toda a varredura', () => {
    for (const d of VARREDURA) expect(sunStarCore(d)).toBe(oraculoCore(d));
  });

  it('os extremos são exatos (1/0 nas pontas, 0,5 no meio de cada janela)', () => {
    expect(discWorldFade(0.1)).toBe(1);
    expect(discWorldFade(0.16)).toBe(1);
    expect(discWorldFade(0.34)).toBe(0);
    expect(discWorldFade(5)).toBe(0);
    expect(discWorldFade(0.25)).toBeCloseTo(0.5, 12);

    expect(sunStarGain(0.14)).toBe(0);
    expect(sunStarGain(0.3)).toBe(1);
    expect(sunStarGain(0.22)).toBeCloseTo(0.5, 12);

    expect(sunStarCore(0.3)).toBe(0);
    expect(sunStarCore(0.42)).toBe(1);
    expect(sunStarCore(0.36)).toBeCloseTo(0.5, 12);
  });

  it('as rampas são monotônicas em toda a varredura', () => {
    for (let i = 1; i < VARREDURA.length; i++) {
      expect(discWorldFade(VARREDURA[i])).toBeLessThanOrEqual(discWorldFade(VARREDURA[i - 1]));
      expect(sunStarGain(VARREDURA[i])).toBeGreaterThanOrEqual(sunStarGain(VARREDURA[i - 1]));
      expect(sunStarCore(VARREDURA[i])).toBeGreaterThanOrEqual(sunStarCore(VARREDURA[i - 1]));
    }
  });

  it('o corte duro de custo do grupo (world > 0,02) cai em ~0,3249 pc', () => {
    expect(isDiscGroupVisible(discWorldFade(0.32))).toBe(true);
    expect(isDiscGroupVisible(discWorldFade(0.325))).toBe(false);
    expect(isDiscGroupVisible(1)).toBe(true);
    expect(isDiscGroupVisible(DISC_VISIBLE_MIN)).toBe(false); // fronteira exata: fora
  });
});

// ------------------------------------------------------------
// 3b. Heroes genéricos — nearFade × farFade e a curva de presença (D2)
// ------------------------------------------------------------
describe('heroes — nearFade, farFade e a curva de presença', () => {
  // Oráculo: o smoothstep do GLSL transcrito de novo, e as duas linhas
  // do FRAG (heroStars.ts:56,58) reescritas em cima dele.
  const ss = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const oraculoNear = (d: number, size: number) => ss(size * 0.5, size * 1.4, d);
  const oraculoFar = (d: number) => 1.0 - ss(320.0, 900.0, d);
  /** tamanho do clarão de um hero de magnitude m (heroStars.ts:126-127) */
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
describe('limiares derivados (contrato do doador, âncora da casa)', () => {
  it('ENTER = WORLD.sunRadius / DISC_FADE0 ≈ 6,875e-2 rad', () => {
    expect(DISC_ENTER_RAD).toBe(WORLD.sunRadius / LOD_SOL.disc.fade0Pc);
    expect(DISC_ENTER_RAD).toBeCloseTo(6.875e-2, 12);
  });

  it('EXIT ≈ 3,4375e-2 rad', () => {
    expect(DISC_EXIT_RAD).toBeCloseTo(3.4375e-2, 12);
  });

  it('ENTER é exatamente 2× EXIT (cushion de histerese)', () => {
    expect(DISC_ENTER_RAD).toBe(DISC_EXIT_RAD * 2);
  });

  it('a âncora é o raio artístico do Sol da casa: WORLD.sunRadius = 0,011 pc', () => {
    expect(WORLD.sunRadius).toBe(0.011);
    // e ele traduz a janela em pc para ângulo sem resto:
    expect(distanceForSolidAngle(WORLD.sunRadius, DISC_ENTER_RAD)).toBe(LOD_SOL.disc.fade0Pc);
  });

  it('os limiares do doador NÃO atravessam (o da casa é ~69× o ENTER do atlas)', () => {
    expect(DISC_ENTER_RAD / 1e-3).toBeCloseTo(68.75, 6);
    expect(DISC_ENTER_RAD).not.toBe(1e-3);
    expect(DISC_EXIT_RAD).not.toBe(5e-4);
  });
});

describe('computeSolidAngle', () => {
  it('devolve raio / distância para entradas típicas', () => {
    expect(computeSolidAngle(1, 100)).toBe(0.01);
    expect(computeSolidAngle(WORLD.sunRadius, LOD_SOL.disc.fade0Pc)).toBe(DISC_ENTER_RAD);
  });

  it('o Sol na parede de fogo (0,05 pc) → ~0,22 rad, bem acima do ENTER', () => {
    const sa = computeSolidAngle(WORLD.sunRadius, 0.05);
    expect(sa).toBeCloseTo(0.22, 6);
    expect(sa).toBeGreaterThan(DISC_ENTER_RAD);
  });

  it('Sirius (1,71 R☉ na escala da casa) a 0,16 pc → acima do ENTER', () => {
    expect(computeSolidAngle(1.711 * WORLD.sunRadius, 0.16)).toBeGreaterThan(DISC_ENTER_RAD);
  });

  it('o Sol a 0,5 pc (passada a janela inteira) → abaixo do EXIT', () => {
    expect(computeSolidAngle(WORLD.sunRadius, 0.5)).toBeLessThan(DISC_EXIT_RAD);
  });

  it('devolve 0 para entradas não-finitas (defensivo)', () => {
    expect(computeSolidAngle(NaN, 1)).toBe(0);
    expect(computeSolidAngle(1, NaN)).toBe(0);
    expect(computeSolidAngle(Infinity, 1)).toBe(0);
    expect(computeSolidAngle(1, Infinity)).toBe(0);
  });

  it('devolve 0 para distância zero / negativa (defensivo)', () => {
    expect(computeSolidAngle(1, 0)).toBe(0);
    expect(computeSolidAngle(1, -100)).toBe(0);
  });

  it('devolve 0 para raio zero / negativo (defensivo)', () => {
    expect(computeSolidAngle(0, 1)).toBe(0);
    expect(computeSolidAngle(-1, 1)).toBe(0);
  });
});

describe('shouldDiscBeActive — histerese partindo de INATIVO', () => {
  it('acende quando o ângulo passa do ENTER', () => {
    expect(shouldDiscBeActive(false, 2 * DISC_ENTER_RAD)).toBe(true);
    expect(shouldDiscBeActive(false, 5 * DISC_ENTER_RAD)).toBe(true);
  });

  it('NÃO acende quando o ângulo é exatamente o ENTER (desigualdade estrita)', () => {
    expect(shouldDiscBeActive(false, DISC_ENTER_RAD)).toBe(false);
  });

  it('NÃO acende na zona morta (abaixo do ENTER, acima do EXIT)', () => {
    expect(shouldDiscBeActive(false, 0.75 * DISC_ENTER_RAD)).toBe(false);
  });

  it('NÃO acende em ângulo <= EXIT', () => {
    expect(shouldDiscBeActive(false, DISC_EXIT_RAD)).toBe(false);
    expect(shouldDiscBeActive(false, 0.1 * DISC_ENTER_RAD)).toBe(false);
    expect(shouldDiscBeActive(false, 0)).toBe(false);
  });
});

describe('shouldDiscBeActive — histerese partindo de ATIVO', () => {
  it('fica aceso enquanto o ângulo for >= EXIT', () => {
    expect(shouldDiscBeActive(true, DISC_EXIT_RAD)).toBe(true);
    expect(shouldDiscBeActive(true, DISC_ENTER_RAD)).toBe(true);
    expect(shouldDiscBeActive(true, 5 * DISC_ENTER_RAD)).toBe(true);
  });

  it('fica aceso na zona morta (entre EXIT e ENTER)', () => {
    expect(shouldDiscBeActive(true, 0.75 * DISC_ENTER_RAD)).toBe(true);
  });

  it('apaga quando o ângulo cai abaixo do EXIT', () => {
    expect(shouldDiscBeActive(true, 0.8 * DISC_EXIT_RAD)).toBe(false);
    expect(shouldDiscBeActive(true, 0.2 * DISC_EXIT_RAD)).toBe(false);
    expect(shouldDiscBeActive(true, 0)).toBe(false);
  });
});

describe('shouldDiscBeActive — ciclo completo de zoom', () => {
  it('inativo → acende → segura → apaga → segura → acende (7 transições encadeadas)', () => {
    let active = false;
    active = shouldDiscBeActive(active, 0.1 * DISC_ENTER_RAD); // longe: nada
    expect(active).toBe(false);
    active = shouldDiscBeActive(active, 0.7 * DISC_ENTER_RAD); // zona morta subindo: ainda nada
    expect(active).toBe(false);
    active = shouldDiscBeActive(active, 2 * DISC_ENTER_RAD); // passou do ENTER: acende
    expect(active).toBe(true);
    active = shouldDiscBeActive(active, 0.9 * DISC_ENTER_RAD); // zona morta descendo: PERSISTE
    expect(active).toBe(true);
    active = shouldDiscBeActive(active, 0.8 * DISC_EXIT_RAD); // abaixo do EXIT: apaga
    expect(active).toBe(false);
    active = shouldDiscBeActive(active, 0.7 * DISC_ENTER_RAD); // zona morta subindo: segue apagado
    expect(active).toBe(false);
    active = shouldDiscBeActive(active, 2 * DISC_ENTER_RAD); // passou do ENTER: acende de novo
    expect(active).toBe(true);
  });

  it('NaN preserva o estado anterior nos dois sentidos (defensivo)', () => {
    expect(shouldDiscBeActive(false, NaN)).toBe(false);
    expect(shouldDiscBeActive(true, NaN)).toBe(true);
    expect(shouldDiscBeActive(true, Infinity)).toBe(true);
  });
});

describe('sanidade de integração — gate contra computeSolidAngle (regime da casa)', () => {
  // Escala ARTÍSTICA da casa: o Sol tem 0,011 pc de raio (config.ts:8);
  // as demais entram como múltiplos do raio solar nessa mesma régua.
  // A lei física de raio por classe é trabalho da Onda 7 (stellarPhysics).
  const raioCasa = (rSolar: number) => rSolar * WORLD.sunRadius;

  it('o Sol logo dentro da própria janela → disco acende; na fronteira exata é no-op', () => {
    const dentro = computeSolidAngle(WORLD.sunRadius, 0.159);
    expect(shouldDiscBeActive(false, dentro)).toBe(true);
    const fronteira = computeSolidAngle(WORLD.sunRadius, LOD_SOL.disc.fade0Pc);
    expect(fronteira).toBe(DISC_ENTER_RAD);
    expect(shouldDiscBeActive(false, fronteira)).toBe(false);
  });

  it('Sirius na distância REAL (2,64 pc) → só sprite (da Terra ela é um ponto)', () => {
    const sa = computeSolidAngle(raioCasa(1.711), 2.64);
    expect(sa).toBeLessThan(DISC_EXIT_RAD);
    expect(shouldDiscBeActive(false, sa)).toBe(false);
  });

  it('Betelgeuse a 100 pc → acende (a gigante compensa a distância)', () => {
    const sa = computeSolidAngle(raioCasa(764), 100);
    expect(sa).toBeGreaterThan(DISC_ENTER_RAD);
    expect(shouldDiscBeActive(false, sa)).toBe(true);
    // e na distância real (~168 pc) ela cai na zona morta: quem estava
    // fora fica fora, quem estava dentro fica dentro — a histerese em ação
    const real = computeSolidAngle(raioCasa(764), 168);
    expect(real).toBeGreaterThan(DISC_EXIT_RAD);
    expect(real).toBeLessThan(DISC_ENTER_RAD);
    expect(shouldDiscBeActive(false, real)).toBe(false);
    expect(shouldDiscBeActive(true, real)).toBe(true);
  });

  it('Sirius B (anã branca, 0,0084 R☉) na distância do handoff do Sol → nunca acende', () => {
    const sa = computeSolidAngle(raioCasa(0.0084), LOD_SOL.disc.fade0Pc);
    expect(sa).toBeLessThan(DISC_EXIT_RAD);
    expect(shouldDiscBeActive(false, sa)).toBe(false);
    // para acender ela teria de estar ~119× mais perto que o Sol acende
    const dEnter = distanceForSolidAngle(raioCasa(0.0084), DISC_ENTER_RAD);
    expect(LOD_SOL.disc.fade0Pc / dEnter).toBeCloseTo(119, 0);
  });
});

// ------------------------------------------------------------
// 5. Equivalência pc ↔ rad (a conta (a)/(b) do módulo)
// ------------------------------------------------------------
describe('equivalência janela-pc ↔ limiar-rad', () => {
  it('a âncora do Sol fecha nos dois sentidos: 0,16 pc ↔ 6,875e-2 rad', () => {
    expect(computeSolidAngle(WORLD.sunRadius, LOD_SOL.disc.fade0Pc)).toBe(DISC_ENTER_RAD);
    expect(distanceForSolidAngle(WORLD.sunRadius, DISC_ENTER_RAD)).toBe(LOD_SOL.disc.fade0Pc);
  });

  it('o EXIT cai em 0,32 pc = 2× DISC_FADE0, DENTRO da janela do crossfade', () => {
    const dExit = distanceForSolidAngle(WORLD.sunRadius, DISC_EXIT_RAD);
    expect(dExit).toBe(0.32);
    expect(dExit).toBe(2 * LOD_SOL.disc.fade0Pc);
    expect(dExit).toBeLessThan(LOD_SOL.disc.fade1Pc);
    // e a casa já apagava o grupo em ~0,3249 pc (world > 0,02): o cushion
    // de 2× do doador reproduz o corte achado à mão com ~1,5% de diferença
    expect(discWorldFade(dExit)).toBeGreaterThan(DISC_VISIBLE_MIN);
    expect(discWorldFade(dExit)).toBeLessThan(0.05);
  });

  it('a mesma régua serve outra instância: um corpo de 3 R☉ acende 3× mais longe', () => {
    const r3 = 3 * WORLD.sunRadius;
    expect(distanceForSolidAngle(r3, DISC_ENTER_RAD)).toBeCloseTo(3 * LOD_SOL.disc.fade0Pc, 12);
  });

  it('as guardas defensivas da inversa devolvem 0, nunca NaN/Infinity', () => {
    expect(distanceForSolidAngle(1, 0)).toBe(0);
    expect(distanceForSolidAngle(1, -1)).toBe(0);
    expect(distanceForSolidAngle(0, 1)).toBe(0);
    expect(distanceForSolidAngle(NaN, 1)).toBe(0);
    expect(distanceForSolidAngle(1, NaN)).toBe(0);
  });
});

// ------------------------------------------------------------
// 6. Cicatriz C1a — nenhuma faixa de distância sem nada
// ------------------------------------------------------------
describe('C1a — cobertura contínua do Sol (nenhuma banda morta)', () => {
  it('disco + clarão somam > 0 em TODA a varredura 0,01 → 5 pc', () => {
    for (const d of VARREDURA) {
      const soma = discWorldFade(d) + sunStarGain(d);
      expect(soma).toBeGreaterThan(0);
    }
  });

  it('onde o grupo do disco é cortado por custo, o clarão já está pleno', () => {
    for (const d of VARREDURA) {
      if (!isDiscGroupVisible(discWorldFade(d))) expect(sunStarGain(d)).toBe(1);
    }
  });

  it('onde o clarão ainda é zero, o disco está pleno', () => {
    for (const d of VARREDURA) {
      if (sunStarGain(d) === 0) expect(discWorldFade(d)).toBe(1);
    }
  });

  it('a faixa de sobreposição [0,14; 0,34] pc tem as DUAS camadas acesas', () => {
    for (const d of VARREDURA) {
      if (d > 0.141 && d < 0.339) {
        expect(discWorldFade(d)).toBeGreaterThan(0);
        expect(sunStarGain(d)).toBeGreaterThan(0);
      }
    }
  });
});

// ------------------------------------------------------------
// 7. A conta do teto de gl_PointSize
// ------------------------------------------------------------
describe('o teto de gl_PointSize na conta do handoff', () => {
  const TAN26 = Math.tan(13 * DEG); // fov 26°, o mais fechado do regime do Sol
  const H = 1080; // uScreenH default (stars.ts:40)
  const EXPO_M0 = 3.5; // stars.ts:41
  const SIGMA_PX = 0.85; // stars.ts:42
  /** magnitude aparente do Sol a d pc (heroStars.ts:216) */
  const magSol = (d: number) => 4.83 + 5 * Math.log10(d / 10);

  it('o teto é PARÂMETRO de projeto (256 px), não medição de driver', () => {
    expect(POINT_SIZE_CEILING_PX).toBe(256);
    expect(maxSpriteSolidAngleRad(POINT_SIZE_CEILING_PX, H, TAN26)).toBeCloseTo(5.47243e-2, 7);
    // no ângulo do handoff um gl_Point já estaria grampeado pelo driver
    expect(maxSpriteSolidAngleRad(POINT_SIZE_CEILING_PX, H, TAN26)).toBeLessThan(DISC_ENTER_RAD);
  });

  it('no handoff o corpo precisa de ~322 px de diâmetro na tela', () => {
    expect(projectedRadiusPx(DISC_ENTER_RAD, H, TAN26)).toBeCloseTo(160.81, 2);
    expect(2 * projectedRadiusPx(DISC_ENTER_RAD, H, TAN26)).toBeGreaterThan(POINT_SIZE_CEILING_PX);
  });

  it('a PSF da casa entrega 9,4 px no handoff — 34× menos do que o corpo pede', () => {
    const px = psfPointSizePx(magSol(LOD_SOL.disc.fade0Pc), EXPO_M0, SIGMA_PX, H);
    expect(px).toBeCloseTo(9.395, 3);
    expect((2 * projectedRadiusPx(DISC_ENTER_RAD, H, TAN26)) / px).toBeCloseTo(34.2, 1);
  });

  it('COMPORTAMENTO NO LIMITE: o sprite cresce com log(fluxo), o corpo com 1/d', () => {
    // 100× mais perto = 10 magnitudes a mais de brilho
    const perto = psfPointSizePx(magSol(0.0016), EXPO_M0, SIGMA_PX, H);
    const longe = psfPointSizePx(magSol(0.16), EXPO_M0, SIGMA_PX, H);
    expect(perto / longe).toBeLessThan(2); // sprite: fator ~1,5
    const anguloPerto = computeSolidAngle(WORLD.sunRadius, 0.0016);
    const anguloLonge = computeSolidAngle(WORLD.sunRadius, 0.16);
    expect(anguloPerto / anguloLonge).toBeCloseTo(100, 6); // corpo: fator 100
    // e mesmo numa magnitude absurda a PSF não chega perto do teto
    expect(psfPointSizePx(-60, EXPO_M0, SIGMA_PX, H)).toBeCloseTo(21.887, 3);
    expect(psfPointSizePx(-60, EXPO_M0, SIGMA_PX, H)).toBeLessThan(POINT_SIZE_CEILING_PX);
  });

  it('o teto depende do fov: fechado aperta, aberto folga (medição real é Onda 7)', () => {
    const fechado = maxSpriteSolidAngleRad(POINT_SIZE_CEILING_PX, H, Math.tan(7.5 * DEG)); // fov 15°
    const aberto = maxSpriteSolidAngleRad(POINT_SIZE_CEILING_PX, H, Math.tan(35 * DEG)); // fov 70°
    expect(fechado).toBeLessThan(DISC_ENTER_RAD);
    expect(aberto).toBeGreaterThan(DISC_ENTER_RAD);
  });

  it('as guardas defensivas da conta devolvem 0 (nunca NaN/Infinity)', () => {
    expect(projectedRadiusPx(NaN, H, TAN26)).toBe(0);
    expect(projectedRadiusPx(DISC_ENTER_RAD, 0, TAN26)).toBe(0);
    expect(projectedRadiusPx(DISC_ENTER_RAD, H, 0)).toBe(0);
    expect(maxSpriteSolidAngleRad(0, H, TAN26)).toBe(0);
    expect(maxSpriteSolidAngleRad(POINT_SIZE_CEILING_PX, -1, TAN26)).toBe(0);
    expect(maxSpriteSolidAngleRad(POINT_SIZE_CEILING_PX, H, NaN)).toBe(0);
  });
});

// ------------------------------------------------------------
// 8. Cicatrizes C2/C3 como contrato puro
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
