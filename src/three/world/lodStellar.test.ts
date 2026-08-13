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
import { WORLD, decodeStars } from '../config';
import type { StarArrays, StarsMeta } from '../config';
import { HeroStars } from './heroStars';
import {
  DEEP_LIMIAR_PC,
  DISC_ENTER_RAD,
  DISC_EXIT_RAD,
  DISC_VISIBLE_MIN,
  DOMINANCE_DEFAULT_ON,
  FADE_NEUTRAL,
  FOCUS_OFF,
  FOCUS_ON,
  HERO_DOMINANCE,
  HERO_MATCH_REL_TOL,
  HERO_ZOOM_TAN_REF,
  LOD_HERO,
  LOD_SOL,
  POINT_SIZE_CEILING_PX,
  RAMP_DURATION_MS,
  catalogApparentMag,
  clearFocus,
  computeSolidAngle,
  deepDiscFade,
  deepPointGain,
  discWorldFade,
  distanceForSolidAngle,
  fadesDoQuadro,
  heroCatalogFade,
  heroDominanceFade,
  heroDominanceRatio,
  heroFarFade,
  heroNearFade,
  heroPresence,
  heroSizePx,
  isDiscGroupVisible,
  isFocusBypassActive,
  matchHeroesToCatalog,
  maxSpriteSolidAngleRad,
  needsAttributeWrite,
  projectedRadiusPx,
  psfPointSizePx,
  resetRamp,
  shouldDiscBeActive,
  discWorldFadeDaInstancia,
  solWorldFade,
  spriteAttenuation,
  spriteAttenuationWithFocus,
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
    //
    // A STRING DO SOL MUDOU DELIBERADAMENTE NA ONDA 4 (decisão D2 do
    // Estado da Onda 4, PLANO-ATLAS §4): o `stellarBody` deixou de chamar
    // `discWorldFade` e passou a chamar a COMPOSIÇÃO `solWorldFade`, que
    // é `discWorldFade × deepDiscFade` — a atenuação total do disco
    // fatorada num lugar só (lição do conserto do vSat, commit 2e16689).
    // O que se pina aqui é a fiação NOVA, e o `not.toContain` proíbe a
    // volta da antiga: com ela de volta o disco artístico voltaria a
    // desenhar pleno dentro do sistema solar.
    const stellarBody = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');
    const heroStars = readFileSync(new URL('./heroStars.ts', import.meta.url), 'utf8');

    // O ALVO MUDOU DE NOVO NA F1 (onda do Sol real), e pelo mesmo tipo
    // de razão da D2: `stellarBody` deixou de chamar `solWorldFade` e
    // passou a chamar `discWorldFadeDaInstancia(dPc, raio)`, que é
    // `solWorldFade` EXATO para o raio artístico e dispensa o termo do
    // domínio profundo para qualquer outro raio — porque esse termo
    // existe para uma fotosfera de 2.269 UA, e a de raio físico
    // (487.441× menor) não engolfa sistema nenhum. Sem isso um Sol de
    // tamanho real nasceria INVISÍVEL dentro de todo o sistema solar.
    //
    // O QUE A GUARDA CONTINUA GUARDANDO, intacto: (a) o consumo vem
    // DAQUI, por import; (b) a rampa não voltou a ser digitada no
    // consumidor (os padrões de código mais abaixo); (c) a chamada crua
    // a `discWorldFade(dPc)` continua PROIBIDA — com ela de volta o
    // disco artístico voltaria a desenhar pleno dentro do sistema solar,
    // que é exatamente o que a D2 comprou. Repare que
    // `discWorldFadeDaInstancia(dPc,` não casa esse `not.toContain`: o
    // sufixo separa as duas, e é de propósito.
    expect(stellarBody).toMatch(
      /import \{[^}]*\bdiscWorldFadeDaInstancia\b[^}]*\} from '\.\/lodStellar'/
    );
    expect(stellarBody).toMatch(/import \{[^}]*\bisDiscGroupVisible\b[^}]*\} from '\.\/lodStellar'/);
    expect(stellarBody).toContain('discWorldFadeDaInstancia(dPc, this.params.radiusPc)');
    expect(stellarBody).not.toContain('discWorldFade(dPc)');
    expect(stellarBody).not.toContain('solWorldFade(dPc)');
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
    // lente, porque o uZoom cancela o fov de propósito (o comentário do
    // `uZoom` no VERT de heroStars.ts).
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
  // dos consumidores COMO ELAS ERAM antes da fiação da fase 2 — o disco
  // inline em `novoSol.ts` (hoje `stellarBody.ts`), uGain e uCore inline
  // em `SunStar.update`.
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
  // os três parâmetros da PSF do campo, como o StarField nasce
  // (`uScreenH` do material; `expoM0`/`sigmaPx` dos defaults de
  // `StarFieldOptions`, em stars.ts)
  const H = 1080;
  const EXPO_M0 = 3.5;
  const SIGMA_PX = 0.85;
  /** magnitude aparente do Sol a d pc (lei de magnitude de `SunStar.update`) */
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
    expect(spriteAttenuationWithFocus(FADE_NEUTRAL, FOCUS_OFF)).toBe(1);
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
    expect(spriteAttenuationWithFocus(FADE_NEUTRAL, FOCUS_OFF)).toBe(1);
  });

  it('o bypass de foco ignora QUALQUER fade (o corpo chega na Onda 7)', () => {
    expect(spriteAttenuationWithFocus(1, FOCUS_ON)).toBe(1);
    expect(spriteAttenuationWithFocus(0.5, FOCUS_ON)).toBe(1);
    expect(spriteAttenuationWithFocus(0.5, FOCUS_OFF)).toBe(0.5);
    expect(spriteAttenuationWithFocus(0.5, 0.5)).toBe(0.5); // fronteira: fora
  });
});

// ------------------------------------------------------------
// 10. O DOMÍNIO PROFUNDO (Onda 4, fase 2) — as duas rampas novas, a
//     composição, e o gate desta fase: ACIMA DO LIMIAR NADA MUDA.
// ------------------------------------------------------------
//
// A janela `deep` (decisão D2 da Onda 4 — Estado no PLANO-ATLAS §4) é a única
// coisa da Onda 4 que já toca pixel — e ela existe para NÃO tocar
// nenhum, enquanto a câmera não descer abaixo de 0,05 pc. A prova é
// bit a bit: acima do limiar `solWorldFade` tem de ser o MESMO double
// que `discWorldFade` sempre devolveu, nas 18 vistas do gate visual e
// em toda a faixa que o filme percorre.

/**
 * As distâncias de casa (pc) das SETE vistas por `?t=` do
 * `ab-identidade`, medidas amostrando o `Journey` nesta sessão. Aqui
 * elas entram como literais de propósito: `journey.ts` importa
 * `world/galaxy.ts`, que lê `window.location.search` NO TOPO do módulo,
 * e o vitest roda em `node` — a varredura do roteiro inteiro (com o stub
 * de window declarado) mora em `cinematic/cameraRig.test.ts`, ao lado do
 * rig. O que se guarda aqui é o alcance: da mais próxima (o piso do
 * filme, t=0/t=6) à mais distante (o face-on).
 */
const VISTAS_T: readonly (readonly [string, number])[] = [
  ['sol', 0.06315061361538779],
  ['interno', 4.486971350060561],
  ['travessia', 221.22434784471977],
  ['retrato', 221.22434784471977],
  ['mergulho', 4275.53796810298],
  ['edgeon', 15904.56497361685],
  ['faceon', 32790.153293328774],
];

/**
 * As ONZE vistas por `?pos=` que caem sob a lei do DISCO ARTÍSTICO,
 * lidas do PRÓPRIO script do gate visual.
 *
 * AS DE `?solreal=1` FICAM DE FORA, e a exclusão é o assunto (F1 da onda
 * do Sol real): naquelas vistas o Sol é construído com o raio FÍSICO, e
 * o domínio profundo — cuja razão de existir é uma fotosfera de 2.269 UA
 * engolfando o sistema — simplesmente não se aplica. Contá-las aqui
 * faria o gate cobrar de `solWorldFade` um comportamento que aquelas
 * vistas nem consultam (elas passam por `discWorldFadeDaInstancia`).
 *
 * A exclusão é CONTADA logo abaixo: se alguém acrescentar uma quarta
 * vista de `?solreal=1` sem pensar, o número muda e o teste reclama.
 * Silenciar uma vista é exatamente o que este bloco existe para impedir.
 */
const VISTAS_POS: { nome: string; dPc: number }[] = [];
const VISTAS_SOL_REAL: string[] = [];
{
  const ab = readFileSync(
    new URL('../../../scripts/visual/ab-identidade.mjs', import.meta.url),
    'utf8'
  );
  for (const m of ab.matchAll(/\['(\w+)', '\?pos=([-\d.,]+)&([^']*)'/g)) {
    const [x, y, z] = m[2].split(',').map(Number);
    const alvo = m[3].includes('solreal=1') ? VISTAS_SOL_REAL : null;
    if (alvo) alvo.push(m[1]);
    else VISTAS_POS.push({ nome: m[1], dPc: Math.sqrt(x * x + y * y + z * z) });
  }
}

/** As três que o desenho declara ABAIXO do limiar (D9) — a exceção. */
const PROFUNDAS = ['ua500', 'ua150', 'ua40'];

/** 0,05 → 40.000 pc: o limiar, a faixa do filme e o além dela. */
const ACIMA: number[] = [];
for (let i = 0; i <= 2000; i++) ACIMA.push(DEEP_LIMIAR_PC + i * 0.0001);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 0.05);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 40);

/** varredura fina DENTRO da janela deep (0,019 → 0,051 pc) */
const DENTRO: number[] = [];
for (let i = 0; i <= 32000; i++) DENTRO.push(0.019 + i * 1e-6);

describe('janela deep — a tabela e o limiar (D2)', () => {
  it('a janela é {0,02 → 0,05} pc, e o limiar É a borda de cima', () => {
    expect(LOD_SOL.deep.fade0Pc).toBe(0.02);
    expect(LOD_SOL.deep.fade1Pc).toBe(0.05);
    expect(DEEP_LIMIAR_PC).toBe(LOD_SOL.deep.fade1Pc);
    expect(DEEP_LIMIAR_PC).toBe(0.05);
  });

  it('o piso do filme fica FORA da janela, com 26% de folga', () => {
    const piso = VISTAS_T[0][1]; // 0,0631506 pc, medido em t=0
    expect(piso).toBeGreaterThan(DEEP_LIMIAR_PC);
    expect(piso / DEEP_LIMIAR_PC - 1).toBeCloseTo(0.263, 3);
  });

  it('a janela cabe INTEIRA abaixo de todas as outras do Sol', () => {
    // as janelas de longe começam em 0,14 pc; a deep termina em 0,05 —
    // as duas nunca estão em rampa ao mesmo tempo, e é por isso que a
    // composição `solWorldFade` é identidade em cada uma das faixas.
    expect(LOD_SOL.deep.fade1Pc).toBeLessThan(LOD_SOL.starGain.startPc);
    expect(LOD_SOL.deep.fade1Pc).toBeLessThan(LOD_SOL.disc.fade0Pc);
  });

  it('ARMADILHA DE FLOAT espelhada: a SUBTRAÇÃO mente, a soma não', () => {
    // na janela do disco quem mentia era a diferença (0,34−0,16 ≠ 0,18);
    // aqui é a mesma doença com outros números: 0,05−0,02 não é 0,03,
    // embora 0,02+0,03 feche 0,05 exato. A rampa faz a SUBTRAÇÃO, então
    // é ela que tem de ser recalculada — nunca a largura digitada.
    expect(LOD_SOL.deep.fade1Pc - LOD_SOL.deep.fade0Pc).not.toBe(0.03);
    expect(LOD_SOL.deep.fade1Pc - LOD_SOL.deep.fade0Pc).toBe(0.030000000000000002);
    expect(LOD_SOL.deep.fade0Pc + 0.03).toBe(LOD_SOL.deep.fade1Pc);

    const larguraDigitada = (d: number) => {
      const wk = (d - LOD_SOL.deep.fade0Pc) / 0.03;
      return wk <= 0 ? 0 : wk >= 1 ? 1 : wk * wk * (3 - 2 * wk);
    };
    expect(DENTRO.some((d) => larguraDigitada(d) !== deepDiscFade(d))).toBe(true);
  });
});

describe('deepDiscFade — o disco se dissolve INDO PARA DENTRO', () => {
  // oráculo: a forma transcrita de novo, como as outras rampas da casa
  const oraculo = (d: number) => {
    const wk = (d - 0.02) / (0.05 - 0.02);
    return wk <= 0 ? 0 : wk >= 1 ? 1 : wk * wk * (3 - 2 * wk);
  };

  it('bate o oráculo em toda a varredura da janela (igualdade exata)', () => {
    for (const d of DENTRO) expect(deepDiscFade(d)).toBe(oraculo(d));
  });

  it('1 EXATO na borda de cima e acima dela (Object.is, não "quase 1")', () => {
    expect(Object.is(deepDiscFade(DEEP_LIMIAR_PC), 1)).toBe(true);
    expect(Object.is(deepDiscFade(0.0500000001), 1)).toBe(true);
    expect(Object.is(deepDiscFade(0.06315061361538779), 1)).toBe(true);
    expect(Object.is(deepDiscFade(40000), 1)).toBe(true);
  });

  it('0 EXATO na borda de baixo e abaixo dela', () => {
    expect(Object.is(deepDiscFade(LOD_SOL.deep.fade0Pc), 0)).toBe(true);
    expect(Object.is(deepDiscFade(0.00072722), 0)).toBe(true);
    expect(Object.is(deepDiscFade(0), 0)).toBe(true);
  });

  it('meio da janela é 0,5 (a cúbica é simétrica)', () => {
    expect(deepDiscFade(0.035)).toBeCloseTo(0.5, 12);
  });

  it('é monotônica ASCENDENTE (ao contrário da rampa do disco)', () => {
    for (let i = 1; i < DENTRO.length; i++) {
      expect(deepDiscFade(DENTRO[i])).toBeGreaterThanOrEqual(deepDiscFade(DENTRO[i - 1]));
    }
  });

  it('NaN devolve NaN, como `discWorldFade` — o veneno aparece', () => {
    expect(Number.isNaN(deepDiscFade(NaN))).toBe(true);
    expect(Number.isNaN(discWorldFade(NaN))).toBe(true);
  });
});

describe('deepPointGain — o reverso exato (alpha do Sol-ponto)', () => {
  it('0 na borda de cima e acima, 1 na de baixo e abaixo (Object.is)', () => {
    expect(Object.is(deepPointGain(DEEP_LIMIAR_PC), 0)).toBe(true);
    expect(Object.is(deepPointGain(1), 0)).toBe(true);
    expect(Object.is(deepPointGain(LOD_SOL.deep.fade0Pc), 1)).toBe(true);
    expect(Object.is(deepPointGain(0.00019393), 1)).toBe(true);
    expect(Object.is(deepPointGain(0), 1)).toBe(true);
  });

  it('COMPLEMENTARIDADE EXATA: as duas somam 1 em toda a varredura', () => {
    // não é "aproximadamente 1": é 1 bit a bit, e o docstring do módulo
    // diz por quê (o erro de `1 − a` é ≤ 2⁻⁵⁴ e some no arredondamento).
    // A ordem importa para o consumidor da fase 3: o alpha do ponto é
    // exatamente o que o disco deixou de ter.
    for (const d of DENTRO) {
      expect(Object.is(deepDiscFade(d) + deepPointGain(d), 1)).toBe(true);
    }
    for (const d of [0, 0.02, 0.035, 0.05, 1, 40000]) {
      expect(Object.is(deepDiscFade(d) + deepPointGain(d), 1)).toBe(true);
    }
  });

  it('é monotônica DESCENDENTE e vale 0,5 no meio', () => {
    for (let i = 1; i < DENTRO.length; i++) {
      expect(deepPointGain(DENTRO[i])).toBeLessThanOrEqual(deepPointGain(DENTRO[i - 1]));
    }
    expect(deepPointGain(0.035)).toBeCloseTo(0.5, 12);
  });

  it('NaN devolve NaN (mesma guarda da rampa gêmea)', () => {
    expect(Number.isNaN(deepPointGain(NaN))).toBe(true);
  });
});

describe('solWorldFade — a atenuação TOTAL do disco, num lugar só', () => {
  it('é o produto das duas rampas, em toda a faixa', () => {
    for (const d of [...DENTRO, ...ACIMA]) {
      expect(solWorldFade(d)).toBe(discWorldFade(d) * deepDiscFade(d));
    }
  });

  it('PERTO DE CASA o disco APAGA, mesmo com a rampa de longe em 1', () => {
    // é a lição que justifica as duas rampas: `discWorldFade` não sabe
    // nada do domínio profundo e devolveria disco PLENO a 150 UA
    for (const { nome, dPc } of VISTAS_POS.filter((v) => PROFUNDAS.includes(v.nome))) {
      expect(discWorldFade(dPc), nome).toBe(1);
      expect(Object.is(solWorldFade(dPc), 0), nome).toBe(true);
      // e o corte duro de custo acompanha: nada do Sol é submetido
      expect(isDiscGroupVisible(solWorldFade(dPc)), nome).toBe(false);
    }
  });

  it('o corte duro cai dentro da janela deep (~0,0225 pc), não na borda', () => {
    // resolvendo a cúbica em DISC_VISIBLE_MIN: o grupo do Sol volta a
    // ser submetido um pouco acima de 0,0224 pc — bem abaixo do limiar,
    // então o disco ainda desenha (fraco) na maior parte da janela
    expect(isDiscGroupVisible(solWorldFade(0.0224))).toBe(false);
    expect(isDiscGroupVisible(solWorldFade(0.0226))).toBe(true);
    expect(isDiscGroupVisible(solWorldFade(DEEP_LIMIAR_PC))).toBe(true);
  });

  it('no meio da janela é o disco pleno atenuado pela rampa nova', () => {
    expect(solWorldFade(0.035)).toBeCloseTo(0.5, 12);
    expect(solWorldFade(0.035)).toBe(deepDiscFade(0.035)); // discWorldFade = 1
  });
});

describe('O GATE DA F2 — acima do limiar NADA muda, bit a bit', () => {
  it('as 11 vistas por `?pos=` saem do script, e só TRÊS caem no domínio', () => {
    // ALARME: uma vista nova por `?pos=` dentro do domínio profundo tem
    // de ser declarada aqui, senão o gate visual passaria a comparar
    // uma vista que a onda MUDA contra uma baseline que ela não mudou.
    expect(VISTAS_POS.length).toBe(11);
    const dentro = VISTAS_POS.filter((v) => v.dPc < DEEP_LIMIAR_PC).map((v) => v.nome);
    expect(dentro).toEqual(PROFUNDAS);
  });

  it('as TRÊS vistas de `?solreal=1` estão fora desta lei, e são exatamente três', () => {
    // A exclusão CONTADA (F1): elas não consultam `solWorldFade`, então
    // cobrar dela um comportamento nelas seria medir o instrumento errado.
    // Mas exclusão sem contagem é vista silenciada — por isso o número.
    expect(VISTAS_SOL_REAL).toEqual(['solreal4mkm', 'solreal1ua', 'solreal40ua']);
  });

  it('nas 15 vistas acima do limiar, `solWorldFade` É `discWorldFade`', () => {
    const acima = [
      ...VISTAS_T.map(([nome, d]) => ({ nome, dPc: d })),
      ...VISTAS_POS.filter((v) => !PROFUNDAS.includes(v.nome)),
    ];
    expect(acima.length).toBe(15);
    for (const { nome, dPc } of acima) {
      expect(dPc, nome).toBeGreaterThanOrEqual(DEEP_LIMIAR_PC);
      expect(Object.is(deepDiscFade(dPc), 1), nome).toBe(true);
      expect(Object.is(solWorldFade(dPc), discWorldFade(dPc)), nome).toBe(true);
    }
  });

  it('e em TODA a faixa de 0,05 a 40.000 pc, ponto a ponto', () => {
    for (const d of ACIMA) {
      expect(Object.is(deepDiscFade(d), 1)).toBe(true);
      expect(Object.is(solWorldFade(d), discWorldFade(d))).toBe(true);
    }
  });

  it('a igualdade vale para os DOIS zeros e o 1 do disco (× 1 é exato)', () => {
    // as bordas da rampa de longe são os valores que o md5 mais vê:
    // 1 (disco pleno), 0 (apagado) e o meio da rampa
    for (const d of [0.05, 0.1, 0.16, 0.25, 0.32, 0.34, 0.5, 1]) {
      expect(Object.is(solWorldFade(d), discWorldFade(d))).toBe(true);
    }
  });

  it('abaixo do limiar a igualdade CAI — o gate não é tautologia', () => {
    // 0,0499 pc: a rampa já saiu de 1 e as duas divergem. É o que a onda
    // vai usar; sem esta ponta, o gate acima seria só uma identidade
    // algébrica se disfarçando de medição.
    expect(deepDiscFade(0.0499)).toBeLessThan(1);
    expect(Object.is(solWorldFade(0.0499), discWorldFade(0.0499))).toBe(false);
  });

  it('e ela não morre num precipício: a cúbica dá 1,1e-10 pc de folga', () => {
    // ACHADO desta fase, medido por bisseção: como o smoothstep tem
    // derivada ZERO na borda (1 − 3δ² perto de wk=1), em double o valor
    // continua sendo 1 EXATO até 1,1176e-10 pc abaixo do limiar —
    // 2,3e-5 UA, ou 3,4 km. Não afrouxa nada (nenhuma vista mora aí), e
    // é o que garante que a fronteira não vira um degrau de 1 ULP com a
    // câmera tremendo em cima dela.
    expect(Object.is(deepDiscFade(DEEP_LIMIAR_PC - 1e-12), 1)).toBe(true);
    expect(Object.is(deepDiscFade(DEEP_LIMIAR_PC - 1.1e-10), 1)).toBe(true);
    expect(Object.is(deepDiscFade(DEEP_LIMIAR_PC - 1.2e-10), 1)).toBe(false);
  });
});

describe('a FIAÇÃO da F2 — o limiar atravessa três módulos sem redigitação', () => {
  const engine = readFileSync(new URL('../core/engine.ts', import.meta.url), 'utf8');
  const rig = readFileSync(new URL('../cinematic/cameraRig.ts', import.meta.url), 'utf8');

  it('o engine importa o limiar daqui e compara com ELE, não com 0.05', () => {
    expect(engine).toMatch(/import \{[^}]*\bDEEP_LIMIAR_PC\b[^}]*\} from '\.\.\/world\/lodStellar'/);
    expect(engine).toContain('distFromSun >= DEEP_LIMIAR_PC');
    expect(engine).not.toMatch(/distFromSun >= 0\.05/);
  });

  it('e a fórmula ANTIGA do near/far continua literal, verbatim', () => {
    // o gate da fase é a igualdade bit a bit acima do limiar: se alguém
    // mexer num destes literais, ela morre em silêncio.
    // RENEGOCIADO na Onda 6 (F0): a chamada do updateClip ganhou o par
    // da superfície resolvida (palco local, D1) — com NaN o par
    // (near, far) segue o vigente bit a bit, pinado em engine.test.ts.
    expect(engine).toContain('THREE.MathUtils.clamp(distFromSun * 0.004, 0.001, 40)');
    expect(engine).toContain('THREE.MathUtils.clamp(distFromSun * 12, 60000, 400000)');
    expect(engine).toContain('const near = nearPlanePc(distFromSun, dSuperficiePc, raioCorpoPc);');
    expect(engine).toContain('const far = farPlanePc(distFromSun);');
  });

  it('o rig importa o limiar daqui e guarda a fórmula antiga da velocidade', () => {
    expect(rig).toMatch(/import \{[^}]*\bDEEP_LIMIAR_PC\b[^}]*\} from '\.\.\/world\/lodStellar'/);
    expect(rig).toContain('dPc >= DEEP_LIMIAR_PC');
    expect(rig).toContain('THREE.MathUtils.clamp(dPc * 0.02, 2, 600)');
    expect(rig).toContain('this.speed = velocidadeDeVoo(this.camera.position.length());');
    expect(rig).not.toMatch(/clamp\(this\.camera\.position\.length\(\) \* 0\.02/);
  });

  it('e a roda do mouse não grampeia por fora: o piso vem da mesma lei', () => {
    // o outro lugar que clampa velocidade (onWheel) — sem ele, a D6
    // seria letra morta na prática
    expect(rig).toContain('pisoDaRoda(this.camera.position.length()),');
    expect(rig).not.toMatch(/this\.speed \* \(event\.deltaY > 0 \? 0\.85 : 1\.18\),\s*0\.01,/);
  });

  it('o SunStar NÃO foi tocado: as janelas de longe seguem as de sempre', () => {
    // decisão D2: o clarão de hero fica intocado (morto abaixo de 0,14 pc)
    const heroStars = readFileSync(new URL('./heroStars.ts', import.meta.url), 'utf8');
    expect(heroStars).not.toContain('deepDiscFade');
    expect(heroStars).not.toContain('deepPointGain');
    expect(heroStars).not.toContain('solWorldFade');
    expect(heroStars).toContain('sunStarGain(d)');
    expect(heroStars).toContain('sunStarCore(d)');
  });
});

// ============================================================
// F1 — a atenuação ciente do RAIO DA INSTÂNCIA.
// ============================================================
describe('discWorldFadeDaInstancia — a primeira rachadura declarada na régua-em-pc', () => {
  const RAIO_FISICO_PC = 2.2566840209436597e-8;

  it('para o raio ARTÍSTICO é solWorldFade, com igualdade de BIT', () => {
    // varredura, não amostra: é o que mantém o filme inteiro sem um pixel
    for (let i = 0; i <= 400; i++) {
      const d = i * 0.0025; // 0 → 1 pc, cobrindo as quatro janelas
      expect(discWorldFadeDaInstancia(d, WORLD.sunRadius)).toBe(solWorldFade(d));
    }
  });

  it('AGULHA: com o raio FÍSICO o Sol NÃO nasce invisível dentro do sistema', () => {
    // a 4 milhões de km (a distância da abertura refilmada) e a 1 UA
    for (const dPc of [1.2957e-7, 4.8481e-6, 2.4241e-4]) {
      expect(solWorldFade(dPc)).toBe(0); // a quebra, escrita
      expect(discWorldFadeDaInstancia(dPc, RAIO_FISICO_PC)).toBe(1); // e a ponte
      expect(isDiscGroupVisible(discWorldFadeDaInstancia(dPc, RAIO_FISICO_PC))).toBe(true);
    }
  });

  it('longe, o raio físico continua obedecendo a janela do disco', () => {
    // a rampa de longe não é do domínio profundo e continua valendo
    expect(discWorldFadeDaInstancia(0.5, RAIO_FISICO_PC)).toBe(0);
    expect(discWorldFadeDaInstancia(0.16, RAIO_FISICO_PC)).toBe(1);
  });
});
