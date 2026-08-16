// ============================================================
// A UNIDADE DE LUZ — o oráculo que faltava, e a dívida com número.
//
// Este arquivo tem dois trabalhos, e o segundo é o que importa:
//
//  1. PROVAR QUE A F1 É INERTE. A ponte magnitude↔fluxo tem de devolver, bit a
//     bit, o mesmo `E` que os espelhos de hoje calculam. Um teste vermelho
//     aqui não é convite a reescrever oráculo — é prova de que a F1 violou o
//     próprio contrato ("no dia 1 ela devolve os números de hoje").
//
//  2. ESCREVER O INVARIANTE DA TROCA, que a casa nunca teve. A Lei da Estrela
//     declara que "em toda troca de representação o fluxo integrado é o mesmo
//     dos dois lados" e nomeia isso como o critério de sucesso — e não existia
//     UM teste que medisse fluxo. Ele nasce aqui REPROVANDO de propósito, com
//     o vão de hoje pinado em número, e fica verde sozinho quando a fotosfera
//     subir para a unidade. É o idioma que `escala.ts:305-318` já usa para
//     tamanho: a suíte aperta sem ninguém lembrar de apertá-la.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  ALTURA_DE_REFERENCIA_PX,
  BETA_EMISSAO,
  EXPO_M0,
  FOV_DA_CASA,
  comprimir,
  lerBetaDaEmissao,
  lerPortaFotosfera,
  SIGMA_PX,
  M_V_SOL,
  M_V_SOL_DO_CAMPO,
  RADIANCIA_DA_FOTOSFERA,
  TEFF_SOL_K,
  anguloSolidoDeDisco,
  depositoDoDisco,
  depositoDoPonto,
  distanciaDeTrocaPc,
  fluxoDeEstrela,
  fluxoDeMagnitude,
  magnitudeDeFluxo,
  magnitudeDoSol,
  radianciaDeCorpoNegro,
  razaoDiscoPonto,
  vaoEmMagnitudes,
  vaoRadiometricoNaTroca,
} from './luzDaCasa';
// os espelhos que JÁ existem — importados, nunca redigitados. É o contrato da
// F1: a régua nova descreve o que a casa faz, não inventa uma segunda casa.
import { RAIO_SOL_PC } from './escala';
import { picoDaPsf } from './core/pupila';
import { psfPointSizePx } from './world/lodStellar';
import { diametroAparentePx } from './world/corpos/corpos';
import { PONTO_ZERO_SOL_PC } from './world/planetas/planetas';

const ler = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

/** A lente de fábrica da câmera (`core/engine.ts`, `PerspectiveCamera(58, …)`). */
const FOV = FOV_DA_CASA;
/** O buffer do harness de captura (`ab-identidade.mjs`, 1800×1800 → 1713 úteis)
 *  e o da régua da luz (900). O invariante vale nos dois. */
const ALTURAS = [900, 1080, 1713];

// ------------------------------------------------------------
describe('1. a F1 é INERTE — a ponte devolve os números de hoje, bit a bit', () => {
  it('fluxoDeMagnitude é o MESMO E que picoDaPsf calcula por dentro', () => {
    // `picoDaPsf` = E / (6,2831853·σ²). Reconstruir E a partir dele e comparar
    // com a ponte prova a igualdade sem redigitar a fórmula aqui.
    for (const m of [-26.72, -10.22, -1.46, 0, 3.5, 6, 12]) {
      for (const h of ALTURAS) {
        const sigma = (SIGMA_PX * h) / 1080.0;
        const eDoEspelho = picoDaPsf(m, EXPO_M0, SIGMA_PX, h) * (6.2831853 * sigma * sigma);
        expect(eDoEspelho / fluxoDeMagnitude(m), `m=${m} h=${h}`).toBeCloseTo(1, 12);
      }
    }
  });

  it('em expoM0 o fluxo é 1 EXATO — é a definição da normalização', () => {
    expect(fluxoDeMagnitude(EXPO_M0)).toBe(1);
  });

  it('a ponte é reversível e a lei de 5 magnitudes = 100× continua valendo', () => {
    for (const m of [-5, 0, 3.5, 11]) {
      expect(magnitudeDeFluxo(fluxoDeMagnitude(m))).toBeCloseTo(m, 12);
    }
    expect(fluxoDeMagnitude(0) / fluxoDeMagnitude(5)).toBeCloseTo(100, 9);
  });

  it('a radiância do Sol é 1 EXATO — a âncora não arredonda', () => {
    expect(radianciaDeCorpoNegro(TEFF_SOL_K)).toBe(1);
    expect(RADIANCIA_DA_FOTOSFERA).toBe(1);
  });

  it('a radiância NÃO depende da distância — é o fato físico central da lei', () => {
    // "chegar perto de uma estrela não a deixa mais brilhante; deixa maior".
    // Quem escrever um 1/d² dentro de radianciaDeCorpoNegro reescreve o item 3.
    const r = radianciaDeCorpoNegro(9000);
    expect(fluxoDeEstrela(9000, RAIO_SOL_PC, 1) / anguloSolidoDeDisco(RAIO_SOL_PC, 1)).toBe(r);
    expect(fluxoDeEstrela(9000, RAIO_SOL_PC, 100) / anguloSolidoDeDisco(RAIO_SOL_PC, 100)).toBe(r);
  });

  it('o fluxo do disco cai com 1/d² — e o ângulo sólido é π(r/d)², não (r/d)²', () => {
    const perto = fluxoDeEstrela(TEFF_SOL_K, RAIO_SOL_PC, 1);
    const longe = fluxoDeEstrela(TEFF_SOL_K, RAIO_SOL_PC, 10);
    expect(perto / longe).toBeCloseTo(100, 9);
    // o fator π separado, para a sabotagem do item 4 morder
    expect(anguloSolidoDeDisco(2, 1)).toBeCloseTo(Math.PI * 4, 12);
  });
});

// ------------------------------------------------------------
describe('2. os espelhos batem com a fonte — quem mover o número move os dois', () => {
  it('TEFF_SOL_K é o teffK da instância nº 1 (SOL_PARAMS)', () => {
    expect(ler('src/three/world/stellarBody.ts')).toContain(`teffK: ${TEFF_SOL_K}`);
  });

  it('M_V_SOL_DO_CAMPO é o PONTO_ZERO_SOL_PC de planetas.ts, deslocado de 5 mag', () => {
    // m(1 pc) = M − 5. A identidade é o que impede a divergência 4,83/4,85 de
    // virar 4,83/4,85/4,87 na próxima onda.
    expect(M_V_SOL_DO_CAMPO - 5).toBeCloseTo(PONTO_ZERO_SOL_PC, 12);
    expect(magnitudeDoSol(1)).toBeCloseTo(PONTO_ZERO_SOL_PC, 12);
  });

  it('A DIVERGÊNCIA DE PONTO-ZERO está declarada, não consertada', () => {
    // 4,83 (SunStar, via stellarPhysics) contra 4,85 (o campo). 0,02 mag =
    // 1,86% de brilho em 328.749 estrelas. A F1 mede e declara; unificar move
    // pixel em todo o céu e é decisão do dono, com foto.
    expect(M_V_SOL).toBe(4.83);
    expect(M_V_SOL_DO_CAMPO - M_V_SOL).toBeCloseTo(0.02, 12);
    const razao = Math.pow(10, 0.4 * (M_V_SOL_DO_CAMPO - M_V_SOL));
    expect(razao).toBeCloseTo(1.0186, 4);
  });

  it('os três literais de expoM0 SUMIRAM — o campo importa a lei, não a redigita', () => {
    // Era `expoM0: 3.5` em director.ts, `?? 3.5` em stars.ts e `value: 3.5` em
    // wrappedStars.ts. Três literais é o jeito conhecido de uma lei se partir
    // em três leis parecidas sem ninguém ver.
    for (const arquivo of [
      'src/three/director.ts',
      'src/three/world/stars.ts',
      'src/three/world/wrappedStars.ts',
    ]) {
      const fonte = ler(arquivo);
      expect(fonte, `${arquivo} não importa a unidade`).toMatch(/from '\.[./]*luzDaCasa'/);
    }
    expect(ler('src/three/director.ts')).toContain('expoM0: EXPO_M0');
    expect(ler('src/three/director.ts')).toContain('sigmaPx: SIGMA_PX');
    expect(ler('src/three/world/stars.ts')).toContain('opts.expoM0 ?? EXPO_M0');
  });

  it('e os VALORES não mudaram — é isso que faz a F1 não mover pixel', () => {
    expect(EXPO_M0).toBe(3.5);
    expect(SIGMA_PX).toBe(0.85);
  });
});

// ------------------------------------------------------------
// 3. O INVARIANTE DA TROCA
// ------------------------------------------------------------

/**
 * A distância em que o disco do Sol vale exatamente `diametroPx` pixels —
 * DERIVADA de `diametroAparentePx` (a régua do palco), nunca escolhida. Busca
 * binária porque a função é monótona em d e a inversa analítica introduziria
 * uma segunda fórmula.
 */
function distanciaParaDiametro(diametroPx: number, alturaPx: number): number {
  let lo = 1e-9;
  let hi = 1e-2;
  for (let i = 0; i < 200; i++) {
    const meio = 0.5 * (lo + hi);
    if (diametroAparentePx(RAIO_SOL_PC, meio, alturaPx, FOV) > diametroPx) lo = meio;
    else hi = meio;
  }
  return 0.5 * (lo + hi);
}

/**
 * O QUE O FRAGMENT REALMENTE DEPOSITA, por integração numérica sobre o disco
 * do sprite — espelho de `STAR_FRAG` (`shaders/starShaders.ts:126-152`).
 *
 * Existe porque a conta "o depósito é 1,54×E" (núcleo + halo) está INCOMPLETA:
 * o fragment soma ainda os espinhos de difração e o núcleo esbranquiçado, e no
 * ponto de troca `vSat` está saturado em 1, ou seja, os dois estão LIGADOS. Um
 * invariante que cobrasse um fator errado falharia mesmo com o conserto certo
 * — e é assim que alguém acaba ajustando o número até ficar verde.
 *
 * Devolve tudo em unidades de área do espaço `uv` do sprite; o que interessa
 * são as RAZÕES entre os termos, e nelas o fator (size/2)² se cancela.
 */
function depositosDoFragment(vSigma: number, vPeak: number, vSat: number) {
  const NR = 2000;
  const NT = 720;
  const s2 = Math.max(vSigma * vSigma, 1e-6);
  let nucleo = 0;
  let halo = 0;
  let espinhos = 0;
  let nucleoBranco = 0;
  // luminância Rec.709 do vec3(0.9, 0.95, 1.0) do núcleo esbranquiçado
  const LUM_BRANCO = 0.2126 * 0.9 + 0.7152 * 0.95 + 0.0722 * 1.0;
  const dr = 1 / NR;
  const dt = (2 * Math.PI) / NT;
  for (let i = 0; i < NR; i++) {
    const r = (i + 0.5) * dr;
    const r2 = r * r;
    const peso = r * dr * dt;
    const core = Math.exp(-r2 / (2 * s2));
    const h = Math.exp(-r2 / (18 * s2)) * 0.06;
    for (let j = 0; j < NT; j++) {
      const t = (j + 0.5) * dt;
      const ux = Math.abs(r * Math.cos(t));
      const uy = Math.abs(r * Math.sin(t));
      nucleo += core * vPeak * peso;
      halo += h * vPeak * peso;
      if (vSat > 0.001) {
        const ax = Math.exp(-uy * 14.0) * Math.exp(-ux * 2.6);
        const ay = Math.exp(-ux * 14.0) * Math.exp(-uy * 2.6);
        espinhos += (ax + ay) * vSat * 0.85 * peso;
      }
      nucleoBranco += LUM_BRANCO * core * core * vSat * 0.6 * peso;
    }
  }
  return { nucleo, halo, espinhos, nucleoBranco, total: nucleo + halo + espinhos + nucleoBranco };
}

describe('3. o invariante da troca — o teste que a casa não tinha', () => {
  it('o ponto de troca é DERIVADO da régua do palco, não escolhido', () => {
    for (const h of ALTURAS) {
      const d = distanciaParaDiametro(1, h);
      expect(diametroAparentePx(RAIO_SOL_PC, d, h, FOV), `h=${h}`).toBeCloseTo(1, 9);
    }
    // e o número, para quem quiser conferir no céu: num buffer de 900 px o
    // disco do Sol cruza 1 px por volta de 7,5 UA — bem no meio do vão do
    // item 3, que é exatamente por isso que a troca importa tanto ali.
    const UA_POR_PC = 206264.80624548031;
    expect(distanciaParaDiametro(1, 900) * UA_POR_PC).toBeCloseTo(7.56, 1);
  });

  it('a inversa analítica bate com a régua exata — e o preço do ângulo pequeno é MEDIDO', () => {
    // `distanciaDeTrocaPc` usa a aproximação de ângulo pequeno; a régua do
    // palco (`diametroAparentePx`) usa `2·atan(r/d)` de propósito, "porque a
    // régua vale também com a câmera colada no corpo".
    //
    // O PREÇO DA APROXIMAÇÃO NÃO É ZERO, e vale escrever o número em vez de
    // dizer "desprezível": na troca de 1 px o ângulo é r/d = 6,16e-4 rad, e
    // `atan(x) ≈ x − x³/3` dá erro relativo de x²/3 = 1,26e-7. É isso que a
    // primeira versão deste teste chamou de "1e-15" e o teste desmentiu.
    //
    // 1,26e-7 numa distância é folga de sobra para o cadastro declarar o vão
    // sem importar three — mas quem for usar a inversa perto do corpo (poucos
    // raios solares) tem de usar a régua exata, e agora sabe por quê.
    for (const h of ALTURAS) {
      const analitica = distanciaDeTrocaPc(RAIO_SOL_PC, 1, h, FOV);
      const porBusca = distanciaParaDiametro(1, h);
      expect(analitica / porBusca, `h=${h}`).toBeCloseTo(1, 6);
      expect(diametroAparentePx(RAIO_SOL_PC, analitica, h, FOV), `h=${h}`).toBeCloseTo(1, 5);
    }
    // e o erro é o previsto pela série, não um acidente
    const razaoAngular = RAIO_SOL_PC / distanciaDeTrocaPc(RAIO_SOL_PC, 1, 900, FOV);
    const erroPrevisto = (razaoAngular * razaoAngular) / 3;
    const erroMedido =
      distanciaDeTrocaPc(RAIO_SOL_PC, 1, 900, FOV) / distanciaParaDiametro(1, 900) - 1;
    expect(erroMedido / erroPrevisto).toBeCloseTo(1, 2);
  });

  it('FOV_DA_CASA é o da câmera de fábrica', () => {
    expect(ler('src/three/core/engine.ts')).toMatch(
      new RegExp(`PerspectiveCamera\\(\\s*${FOV_DA_CASA}`)
    );
  });

  it('a SOBRETAXA DO INSTRUMENTO é o halo, e os outros dois somem no ruído', () => {
    // Medida por integração do fragment inteiro, na configuração da troca.
    const h = 900;
    const d = distanciaParaDiametro(1, h);
    const m = magnitudeDoSol(d);
    const pico = picoDaPsf(m, EXPO_M0, SIGMA_PX, h);
    const size = psfPointSizePx(m, EXPO_M0, SIGMA_PX, h);
    const sigma = (SIGMA_PX * h) / 1080.0;
    const vSigma = sigma / Math.max(0.5 * size, 1e-4);
    // sat = clamp(0,5·log2(peak), 0, 1) — saturado muito antes daqui
    const vSat = Math.min(1, Math.max(0, 0.5 * Math.log2(Math.max(pico, 1))));
    expect(vSat).toBe(1);

    const dep = depositosDoFragment(vSigma, pico, vSat);

    // O HALO é ~0,53 do núcleo: a integral analítica dá 0,54 no plano inteiro
    // (0,06 × 9), e o disco do sprite corta a cauda.
    expect(dep.halo / dep.nucleo).toBeCloseTo(0.534, 2);

    // OS ESPINHOS E O NÚCLEO BRANCO NÃO ESCALAM COM O PICO — o fragment os
    // soma FORA do produto por `vPeak` (`starShaders.ts:147-149`). Com o pico
    // de 7e9 da troca, os dois juntos valem 3e-11 do depósito. Não é que sejam
    // desprezíveis por gosto: é que são PISO DE INSTRUMENTO, não fluxo. Por
    // isso o invariante pode ser escrito sobre o termo fotométrico sem mentir.
    expect((dep.espinhos + dep.nucleoBranco) / dep.total).toBeLessThan(1e-9);

    // logo a sobretaxa total é a do halo, e é ESTE o número que vai para a
    // coluna de brilho do cadastro
    expect(dep.total / dep.nucleo).toBeCloseTo(1.534, 2);
  });

  it('O VÃO RADIOMÉTRICO — a dívida da fotosfera, com número em vez de frase', () => {
    // Na troca de 1 px: o disco deposita radiância × área (π/4 · 1²), e o
    // ponto deposita E. Hoje a fotosfera é autorada em ~1 e o ponto vale ~2e10.
    const h = 900;
    const d = distanciaParaDiametro(1, h);
    const razao = razaoDiscoPonto(magnitudeDoSol(d), 1);
    expect(razao).toBeGreaterThan(1e10);
    expect(vaoEmMagnitudes(razao)).toBeCloseTo(26.2, 0);
    // e é ESTE o número que o cadastro declara, pela mesma função — a diferença
    // é só o ângulo pequeno da inversa (2× o 1,26e-7 do teste acima, porque o
    // fluxo vai com d⁻²)
    expect(vaoRadiometricoNaTroca(RAIO_SOL_PC, ALTURA_DE_REFERENCIA_PX) / razao).toBeCloseTo(1, 6);
  });

  it('o vão depende do BUFFER, e por isso a altura é declarada junto', () => {
    // a lei do ponto normaliza por PIXEL (é o que `expoM0` significa), então
    // "quantas vezes o ponto brilha mais que o disco" só tem resposta depois
    // de dizer quantos pixels a tela tem. Um número sem a altura ao lado seria
    // uma frase sem unidade — e o cadastro existe para não aceitar isso.
    const a = vaoRadiometricoNaTroca(RAIO_SOL_PC, 900);
    const b = vaoRadiometricoNaTroca(RAIO_SOL_PC, 1800);
    expect(a / b).toBeCloseTo(4, 6);
  });

  it.fails('NA TROCA DE 1 PX O FLUXO É O MESMO DOS DOIS LADOS (a dívida de F2)', () => {
    // ESTE TESTE REPROVA DE PROPÓSITO e é a dívida inteira em uma linha. Ele
    // fica verde quando a fotosfera passar a emitir a radiância verdadeira —
    // e não antes. Trocar o `it.fails` por `it.skip`, ou afrouxar o 1e-9,
    // seria apagar a dívida em vez de pagá-la.
    const h = 900;
    const d = distanciaParaDiametro(1, h);
    const disco = depositoDoDisco(RADIANCIA_DA_FOTOSFERA, 1);
    const ponto = depositoDoPonto(magnitudeDoSol(d));
    expect(Math.abs(ponto / disco - 1)).toBeLessThan(1e-9);
  });
});

// ------------------------------------------------------------
describe('3b. A COMPRESSÃO NA EMISSÃO — e a prova de que não é teto', () => {
  it('NASCE NEUTRA: β = 0 é identidade EXATA, bit a bit', () => {
    expect(BETA_EMISSAO).toBe(0);
    for (const x of [0, 1e-6, 0.45, 1, 1e3, 3.9e11]) {
      expect(Object.is(comprimir(x, 0), x), String(x)).toBe(true);
      expect(Object.is(comprimir(x, -1), x), String(x)).toBe(true);
    }
  });

  it('O CÉU PASSA INTOCADO: muito abaixo de β a curva é a identidade', () => {
    // É a regra 2 do §7 — "o campo estelar e a galáxia nunca esmaecem", e o
    // preço tem de ser MEDIDO, não afirmado. Com β = 300, Sirius (pico 30,6
    // num buffer de 900 px) perde **0,17%**. Invisível, e é o número que
    // autoriza esse β; com β = 30 a mesma estrela perderia 13%, que já é
    // esmaecer o céu e está do lado proibido.
    const sirius = 30.6;
    const perdaEm300 = 1 - comprimir(sirius, 300) / sirius;
    expect(perdaEm300).toBeCloseTo(0.0017, 4);
    expect(perdaEm300).toBeLessThan(0.002);

    const perdaEm30 = 1 - comprimir(sirius, 30) / sirius;
    expect(perdaEm30).toBeGreaterThan(0.1);

    // e o fundo do céu, cinco ordens abaixo de β, sente 5e-12 — que é o
    // termo (x/β)²/6 da série do asinh, não zero. "Intocado" aqui quer dizer
    // abaixo do quantum do half-float por dez ordens de grandeza.
    expect(Math.abs(comprimir(1e-3, 300) / 1e-3 - 1)).toBeLessThan(1e-11);
  });

  it('SABOTAGEM — A CURVA NÃO É TETO, e é isto que a separa do proibido', () => {
    // `NORTE.md:183` proíbe teto de brilho. A diferença é executável: com
    // asinh, chegar mais perto de uma estrela CONTINUA deixando-a mais
    // brilhante, só que devagar; com um teto, dois brilhos diferentes viram o
    // mesmo pixel e a informação morre.
    const beta = 300;
    const longe = comprimir(2.4e4, beta);
    const perto = comprimir(4e11, beta);
    expect(perto).toBeGreaterThan(longe);

    // e o mesmo par sob um TETO reprovaria — os dois saem iguais
    const teto = (x: number, c: number) => Math.min(x, c);
    expect(teto(2.4e4, 6.5e3)).toBe(teto(4e11, 6.5e3));

    // estritamente crescente em toda a faixa, não só nos dois pontos
    let anterior = -Infinity;
    for (let e = -6; e <= 12; e += 0.25) {
      const v = comprimir(Math.pow(10, e), beta);
      expect(v).toBeGreaterThan(anterior);
      anterior = v;
    }
  });

  it('A GUARDA DO HALF-FLOAT — o teto de β é DERIVADO, não escolhido', () => {
    // o composer usa HalfFloatType (EffectComposer, por omissão) e satura em
    // 65.504. O maior valor alcançável hoje é o pico do Sol-ponto a 1 UA.
    const UA_EM_PC = 1 / 206264.80624548031;
    const picoDoSolA1UA = picoDaPsf(magnitudeDoSol(UA_EM_PC), EXPO_M0, SIGMA_PX, 900);
    expect(picoDoSolA1UA).toBeGreaterThan(1e11); // é o número do item 3

    const TETO_HALF_FLOAT = 65504;
    // β = 300 (o ponto de partida da calibração) põe o Sol em ~6,5e3
    expect(comprimir(picoDoSolA1UA, 300)).toBeLessThan(TETO_HALF_FLOAT);
    // e existe um β acima do qual a compressão deixa de proteger o buffer
    expect(comprimir(picoDoSolA1UA, 4000)).toBeGreaterThan(TETO_HALF_FLOAT);
  });

  it('A GUARDA DO HALF-FLOAT NA MALHA (F2) — o teto vale para o DISCO também', () => {
    // A guarda de cima é do PONTO. Esta é da MALHA, e a conta é outra: o
    // que a F2 escreve não é o pico da PSF, é `radiância × fator`, onde o
    // fator é o vão radiométrico e a radiância é a cor autorada do
    // fragment do Sol. Ela não é 1 no pico — a paleta H-alfa chega a
    // ~2,4 nas regiões mais quentes (HDR medido na onda), e é ESSE o
    // valor máximo que o material vai escrever.
    const TETO_HALF_FLOAT = 65504;
    const HDR_DA_PALETA = 2.4;
    const fator = vaoRadiometricoNaTroca(RAIO_SOL_PC);
    const maximoEscrito = comprimir(fator * HDR_DA_PALETA, 300);
    expect(maximoEscrito).toBeLessThan(TETO_HALF_FLOAT);

    // SEM A CURVA A PORTA É UM QUADRO BRANCO, e é por isso que
    // `stellarBody.ts` cobra `?bemis=` junto com `?bfoto=`: β = 0 é
    // identidade EXATA, e identidade sobre 2,7e10 satura o buffer no
    // primeiro pixel do disco. No pico da paleta são SEIS ordens de
    // grandeza acima do teto (1,0e6×); o piso de 1e5 aqui é folga.
    expect(comprimir(fator * HDR_DA_PALETA, 0)).toBeGreaterThan(TETO_HALF_FLOAT * 1e5);

    // e o mesmo β que estoura para o ponto estoura para a malha: as duas
    // pontas da troca vivem sob o MESMO teto, que é o argumento inteiro
    // para elas viverem sob a mesma curva
    expect(comprimir(fator * HDR_DA_PALETA, 4000)).toBeGreaterThan(TETO_HALF_FLOAT);
  });

  it('A CURVA TEM UM ENDEREÇO SÓ — o GLSL e o espelho de CPU são a mesma', () => {
    const glsl = ler('src/three/shaders/common.ts');
    expect(glsl).toContain('vec3 asinh3(vec3 v) { return log(v + sqrt(v * v + 1.0)); }');
    expect(glsl).toContain('if (b <= 0.0) return x;');
    expect(glsl).toContain('return b * asinh3(max(x, 0.0) / b);');

    // `post.ts` deixou de ter a definição própria e passou a interpolar a mesma
    const post = ler('src/three/core/post.ts');
    expect(post).toContain('${GLSL_COMPRESSAO}');
    expect(post.match(/vec3 asinh3\(vec3 v\)/g)).toBeNull();

    // e o STAR_FRAG aplica a curva na escrita final
    const star = ler('src/three/shaders/starShaders.ts');
    expect(star).toContain('${GLSL_COMPRESSAO}');
    expect(star).toContain('gl_FragColor = vec4(comprimir3(col, uBeta), 1.0);');
  });

  it('SABOTAGEM — A PUPILA NÃO VOLTA PELA PORTA DOS FUNDOS', () => {
    // regra 1 do §7: NADA de exposição que dependa do que está em foco. A
    // curva é fixa, e o texto do caminho da emissão tem de provar isso — nem
    // média do quadro, nem magnitude do alvo, nem índice de foco.
    const PROIBIDO = /focusIndex|alvoEmFoco|mediaDoQuadro|luminanciaDoQuadro|adaptar/i;
    for (const arquivo of ['src/three/luzDaCasa.ts', 'src/three/shaders/starShaders.ts']) {
      expect(PROIBIDO.test(ler(arquivo)), `${arquivo} lê estado por foco na emissão`).toBe(false);
    }
    // e a sabotagem: o padrão ACHA de verdade quando existe
    expect(PROIBIDO.test('const g = mediaDoQuadro();')).toBe(true);
  });

  it('a porta ?bemis= aceita número e recusa lixo — o default é o neutro', () => {
    expect(lerBetaDaEmissao('')).toBe(BETA_EMISSAO);
    expect(lerBetaDaEmissao('?bemis=300')).toBe(300);
    expect(lerBetaDaEmissao('?bemis=0')).toBe(0);
    expect(lerBetaDaEmissao('?bemis=abacaxi')).toBe(BETA_EMISSAO);
    expect(lerBetaDaEmissao('?bemis=-5')).toBe(BETA_EMISSAO);
    expect(lerBetaDaEmissao('?outro=1')).toBe(BETA_EMISSAO);
  });

  it('a porta ?bfoto= é BINÁRIA — só `1` liga, e o default é não fazer nada', () => {
    // binária de propósito, ao contrário da irmã `?bemis=`: um "quanto"
    // aqui seria um segundo botão de brilho para a malha, e a fotosfera
    // ou está na unidade da casa ou não está. O joelho mora em `?bemis=`.
    expect(lerPortaFotosfera('?bfoto=1')).toBe(true);
    expect(lerPortaFotosfera('')).toBe(false);
    expect(lerPortaFotosfera('?bfoto=0')).toBe(false);
    expect(lerPortaFotosfera('?bfoto=2')).toBe(false);
    expect(lerPortaFotosfera('?bfoto=true')).toBe(false);
    expect(lerPortaFotosfera('?bfoto=abacaxi')).toBe(false);
    expect(lerPortaFotosfera('?bfoto=')).toBe(false);
    expect(lerPortaFotosfera('?outro=1')).toBe(false);
    // e ela é PURA: recebe a query, não lê `window` — que é o que
    // permite este teste existir em `environment: 'node'`
    expect(lerPortaFotosfera('?bemis=300&bfoto=1&q=cinema')).toBe(true);
  });
});

// ------------------------------------------------------------
describe('4. SABOTAGENS — sem elas as três seções acima são decoração', () => {
  it('raio no lugar de diâmetro: erro de 4×, o mais difícil de ver na imagem', () => {
    const certo = depositoDoDisco(1, 4);
    const errado = depositoDoDisco(1, 2); // alguém passou o raio
    expect(certo / errado).toBe(4);
  });

  it('Ω = θ² no lugar de π(θ/2)²: erro de 4/π', () => {
    const r = 1e-8;
    const d = 1;
    const certo = anguloSolidoDeDisco(r, d);
    const errado = (2 * r / d) ** 2; // θ², com θ de diâmetro
    expect(errado / certo).toBeCloseTo(4 / Math.PI, 9);
  });

  it('expoente −0,3 no lugar de −0,4: o erro que a casa JÁ cometeu', () => {
    // `heroStars.ts:152` faz `10^(−0,3·m)` para o TAMANHO do clarão — sem
    // parentesco com o −0,4 da lei fotométrica. É o único lugar da casa em que
    // o tamanho de uma estrela sai de magnitude em vez de raio, e a Lei manda
    // matá-lo em L3. Aqui o teste impede que ele volte pela porta da luz.
    const m = -1.46;
    expect(fluxoDeMagnitude(m) / Math.pow(10, -0.3 * (m - EXPO_M0))).not.toBeCloseTo(1, 3);
    expect(ler('src/three/luzDaCasa.ts')).not.toMatch(/-0\.3\s*\*/);
  });

  it('radiância que escala com 1/d² É o item 3 — tem de reprovar', () => {
    const comDefeito = (teffK: number, dPc: number) => radianciaDeCorpoNegro(teffK) / (dPc * dPc);
    // a lei certa devolve o mesmo em qualquer distância; a defeituosa, não
    expect(radianciaDeCorpoNegro(TEFF_SOL_K)).toBe(radianciaDeCorpoNegro(TEFF_SOL_K));
    expect(comDefeito(TEFF_SOL_K, 1)).not.toBe(comDefeito(TEFF_SOL_K, 2));
  });

  it('a unidade é PURA — trazer three para dentro dela a tira do selo', () => {
    const fonte = ler('src/three/luzDaCasa.ts');
    expect(fonte).not.toMatch(/from 'three'/);
    expect(fonte).not.toMatch(/import \* as THREE/);
  });
});
