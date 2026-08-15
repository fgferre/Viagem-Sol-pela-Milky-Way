// As duas contas PURAS da régua da luz — as que julgam sem subir Chrome.
//
// A régua inteira não é testável aqui (ela captura), mas as duas funções que
// decidem o VEREDITO são: `discoRealPx` é a verdade geométrica contra a qual o
// borrão é julgado, e `medirQuadro` é quem lê a imagem. Se qualquer uma das
// duas mentir, a régua vira decoração — e o item 3 continua sem juiz.
//
// O molde é o de `planeta-pixel.test.mjs`: imagens FABRICADAS, com o resultado
// conhecido de antemão, mais um caso de sabotagem que tem de dar vermelho.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { discoRealPx, claraoPsfPx, julgarEscada, medirQuadro, ESCADA_UA } from './luz-do-quadro.mjs';

const ler = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

/** Um quadro RGB sólido de luminância `y` (0..1), em 8 bits. */
function quadroSolido(largura, altura, y) {
  const v = Math.round(y * 255);
  return new Uint8Array(largura * altura * 3).fill(v);
}

describe('discoRealPx — a verdade geométrica do disco do Sol', () => {
  it('a 1 UA o Sol mede 0,533° — a aferição que todo mundo pode conferir no céu', () => {
    // θ = 2·R☉/1 UA = 2·2,2566840209436597e-8 / 4,84813681e-6 rad
    const graus = (2 * 2.2566840209436597e-8) / (1 / 206264.80624548031) * (180 / Math.PI);
    expect(graus).toBeCloseTo(0.5331, 3);
    // e projetado num buffer de 900 px com a lente de fábrica (58°)
    expect(discoRealPx(1, 900, 58)).toBeCloseTo(7.558, 3);
  });

  it('cai com 1/d EXATO — dobrar a distância divide o disco por dois', () => {
    // não `toBeCloseTo`: a lei é 1/d e a divisão por 2 é exata em IEEE754
    // para estes valores. Um desvio aqui seria erro de fórmula, não de ULP.
    expect(discoRealPx(2, 900, 58) * 2).toBeCloseTo(discoRealPx(1, 900, 58), 12);
    expect(discoRealPx(4000, 900, 58) * 4000).toBeCloseTo(discoRealPx(1, 900, 58), 9);
  });

  it('a escada padrão atravessa o vão inteiro do item 3, de ponta a ponta', () => {
    // da parede de fogo (bola de 113 px) até a véspera de 0,02 pc (0,002 px):
    // quatro ordens de grandeza de disco. É contra ISTO que o borrão constante
    // de hoje é acusado.
    expect(discoRealPx(ESCADA_UA[0], 900, 58)).toBeGreaterThan(100);
    expect(discoRealPx(ESCADA_UA[ESCADA_UA.length - 1], 900, 58)).toBeLessThan(0.01);
  });
});

describe('medirQuadro — o que a régua lê na imagem', () => {
  it('quadro preto: luz média 0, nada acima de meia luz, borrão 0', () => {
    const m = medirQuadro(quadroSolido(64, 64, 0), 64, 64);
    expect(m.luzMedia).toBe(0);
    expect(m.acimaDeMeia).toBe(0);
    expect(m.borrao).toBe(0);
  });

  it('quadro branco: luz média 1 (a menos de 1 ULP), tudo acima de meia luz, borrão do tamanho da largura', () => {
    const m = medirQuadro(quadroSolido(64, 64, 1), 64, 64);
    // NÃO é 1 exato, e o motivo fica escrito para ninguém "consertar" a lei:
    // 0,2126 + 0,7152 + 0,0722 dá 0,9999999999999999 em IEEE754. Branco puro
    // devolve esse valor, não 1. Trocar os coeficientes por três que somem 1
    // exato faria a régua discordar do `KNEE_SHADER` (post.ts:51), que é quem
    // decide de verdade o que é meia luz na cadeia.
    expect(m.luzMedia).toBeCloseTo(1, 12);
    expect(m.luzMedia).toBeLessThanOrEqual(1);
    expect(m.acimaDeMeia).toBe(1);
    expect(m.borrao).toBe(64);
  });

  it('a luminância é a Rec.709 — a MESMA do knee em post.ts, não a média dos canais', () => {
    const px = new Uint8Array(3);
    px[0] = 255; px[1] = 0; px[2] = 0; // vermelho puro
    const m = medirQuadro(px, 1, 1);
    // 0,2126 e não 1/3: se alguém trocar a lei por (r+g+b)/3 este número vira
    // 0,333 e a régua passa a discordar do shader sobre o que é "meia luz".
    expect(m.luzMedia).toBeCloseTo(0.2126, 4);
  });

  it('o borrão é medido do CENTRO para fora, e ignora mancha que não toca o meio', () => {
    // 21 px de largura, 3 de altura. Linha do meio: uma faixa clara de 5 px
    // NO CANTO ESQUERDO, e o centro preto.
    const W = 21, H = 3;
    const d = new Uint8Array(W * H * 3);
    for (let x = 0; x < 5; x++) {
      const p = (1 * W + x) * 3;
      d[p] = d[p + 1] = d[p + 2] = 255;
    }
    const m = medirQuadro(d, W, H);
    // borrão 0: a mancha existe e é clara, mas não é o assunto do quadro. É a
    // guarda contra uma estrela brilhante fora do eixo entrar na conta do Sol.
    expect(m.borrao).toBe(0);
    // o pico VÊ a mancha (ela é branca) — quem a ignora é só o borrão
    expect(m.pico).toBeCloseTo(1, 12);
  });

  it('mancha centrada de 7 px devolve borrão 7 — e não a contagem de toda a imagem', () => {
    const W = 21, H = 3;
    const d = new Uint8Array(W * H * 3);
    for (let x = 7; x <= 13; x++) {
      const p = (1 * W + x) * 3;
      d[p] = d[p + 1] = d[p + 2] = 255;
    }
    const m = medirQuadro(d, W, H);
    expect(m.borrao).toBe(7);
  });

  it('SABOTAGEM: um quadro lavado NÃO pode passar por honesto', () => {
    // é o caso medido hoje a 40 UA (luz média 0,946, 100% acima de meia luz).
    // Se a régua devolvesse "acimaDeMeia" abaixo de 1 aqui, ela estaria
    // escondendo exatamente o defeito que existe para denunciar.
    const m = medirQuadro(quadroSolido(64, 64, 0.95), 64, 64);
    expect(m.acimaDeMeia).toBe(1);
    expect(m.luzMedia).toBeGreaterThan(0.9);
  });
});

describe('claraoPsfPx — o que o instrumento tem DIREITO de espalhar', () => {
  it('encolhe LOGARITMICAMENTE: 60.000× de distância custa 1,5× de clarão', () => {
    // é a frase do cabeçalho ("logarítmico no fluxo, portanto encolhe devagar")
    // virando número. Sem isto, o teto do borrão seria injusto ou inútil.
    const perto = claraoPsfPx(0.067, 900);
    const longe = claraoPsfPx(4000, 900);
    expect(perto).toBeCloseTo(14.467, 2);
    expect(longe).toBeCloseTo(9.484, 2);
    expect(perto / longe).toBeLessThan(2);
  });

  it('além de ~0,5 UA é o clarão, e não o disco, que manda no teto', () => {
    // a inversão é o fato central do item 3: o disco cai com 1/d e o clarão
    // com a raiz do logaritmo. Cobrar "borrão igual ao disco" a 2.000 UA seria
    // cobrar 0,004 px — impossível por construção, e um critério impossível
    // reprova o conserto certo.
    expect(discoRealPx(0.067, 900, 58)).toBeGreaterThan(claraoPsfPx(0.067, 900));
    for (const ua of [1, 20, 500, 4000]) {
      expect(claraoPsfPx(ua, 900), `${ua} UA`).toBeGreaterThan(discoRealPx(ua, 900, 58));
    }
  });

  it('nunca cresce com a distância — a lei que o borrão medido tem de imitar', () => {
    for (let i = 1; i < ESCADA_UA.length; i++) {
      expect(claraoPsfPx(ESCADA_UA[i], 900)).toBeLessThan(claraoPsfPx(ESCADA_UA[i - 1], 900));
    }
  });

  it('ESPELHO: a lei redigitada aqui é a MESMA de starPSF, palavra por palavra', () => {
    // Esta régua roda em node puro e não importa TypeScript, então as quatro
    // constantes e a fórmula são redigitadas. O molde do espelho é o de
    // `escala.test.ts:63-69`: quem mover o número na fonte é obrigado a mover
    // aqui. As três primeiras linhas são as MESMAS que `pupila.test.ts:31-33`
    // fixa — duas varreduras sobre a mesma lei, de donos diferentes.
    const glsl = ler('src/three/shaders/common.ts');
    expect(glsl).toContain('float sigma = sigmaPx * screenH / 1080.0;');
    expect(glsl).toContain('float E = pow(10.0, -0.4 * (m - expoM0));');
    expect(glsl).toContain('peak = E / (6.2831853 * sigma * sigma);');
    expect(glsl).toContain('float rSat = peak > 1.0 ? sigma * sqrt(2.0 * log(peak)) : 0.0;');
    expect(glsl).toContain('size = 2.0 * (2.2 * sigma + rSat);');

    // O PAR expoM0/sigmaPx MUDOU DE CASA, e este espelho é a prova de que a
    // mudança não passou calada. Até a F1 da luz eles eram três literais
    // soltos e a varredura lia `expoM0: 3.5, sigmaPx: 0.85` em `director.ts`;
    // a F1 os juntou em `luzDaCasa.ts` e ESTE TESTE QUEBROU na hora — que é
    // exatamente o serviço dele. Agora ele lê a fonte única.
    const unidade = ler('src/three/luzDaCasa.ts');
    const mExpo = unidade.match(/EXPO_M0 = ([\d.]+);/);
    const mSigma = unidade.match(/SIGMA_PX = ([\d.]+);/);
    expect(mExpo, 'a varredura de expoM0 perdeu o padrão').not.toBeNull();
    expect(mSigma, 'a varredura de sigmaPx perdeu o padrão').not.toBeNull();
    expect(Number(mExpo[1])).toBe(3.5);
    expect(Number(mSigma[1])).toBe(0.85);
    // e o campo consome a lei em vez de redigitá-la
    expect(ler('src/three/director.ts')).toContain('expoM0: EXPO_M0');

    // e o ponto-zero do Sol na camada dos dez corpos
    const planetas = ler('src/three/world/planetas/planetas.ts');
    const m = planetas.match(/PONTO_ZERO_SOL_PC = (-?[\d.]+);/);
    expect(m, 'a varredura do ponto-zero perdeu o padrão').not.toBeNull();
    expect(Number(m[1])).toBe(-0.15);
  });
});

describe('julgarEscada — o veredito que a régua não tinha', () => {
  /** Uma escada honesta: borrão colado no clarão legítimo, quadro escuro. */
  const honesta = (uas = ESCADA_UA) =>
    uas.map((ua) => ({
      ua,
      luzMedia: 0.02,
      acimaDeMeia: ua < 1 ? 0.012 : 2e-4,
      pico: 1,
      borrao: Math.round(Math.max(discoRealPx(ua, 900, 58), claraoPsfPx(ua, 900))),
      disco: discoRealPx(ua, 900, 58),
    }));

  it('a escada de HOJE reprova em todo degrau a partir de 1 UA', () => {
    // os números são os que o repo já registra em comentário
    // (`atlasConfig.ts:262-284`, `ab-identidade.mjs:199-221`): borrão grudado
    // no tamanho da tela e quadro inteiro acima de meia luz.
    const hoje = [1, 3.6, 7.2, 20, 40, 150, 500, 2000].map((ua) => ({
      ua,
      luzMedia: 0.946,
      acimaDeMeia: 1,
      pico: 1,
      borrao: 900,
      disco: discoRealPx(ua, 900, 58),
    }));
    const j = julgarEscada({ linhas: hoje, alturaPx: 900, comBloom: true });
    expect(j.erro).toBe(true);
    expect(j.reprovadas).toBe(hoje.length);
    expect(j.resumo).toContain('REPROVA');
  });

  it('uma escada honesta PASSA — o juiz não é impossível de agradar', () => {
    const j = julgarEscada({ linhas: honesta(), alturaPx: 900, comBloom: false });
    expect(j.erro, j.texto).toBe(false);
    expect(j.resumo).toContain('PASSA');
  });

  it('o PISO DO CÉU não é cobrado do Sol — a baseline honesta de 15/08 passa', () => {
    // Números MEDIDOS no par `EXTRA='&nobloom=1'` (900×900, ?q=cinema,
    // `capturas/luz-do-quadro-nobloom1.json`). Duas coisas ficam pinadas aqui:
    //
    //  1. o céu sozinho já põe 0,1133% do quadro acima de meia luz — as
    //     estrelas brilhantes e a galáxia. Nada disso é culpa do Sol, e um teto
    //     abaixo desse piso reprovaria o conserto certo para sempre;
    //  2. a 1 UA o Sol acrescenta 1,67e-4 sobre o piso — que é, com três casas,
    //     a área do clarão de 13,47 px que a PSF manda ele ter
    //     (π·(13,47/2)²/810.000 = 1,76e-4). A previsão e a medida fecham.
    //
    // Ou seja: sem bloom o HDR por baixo JÁ É honesto. O que lava a tela é o
    // bloom espalhando um pico infinito — e é isso que o conserto ataca.
    const medido = [
      { ua: 1, luzMedia: 0.039, acimaDeMeia: 0.0013, pico: 1, borrao: 12 },
      { ua: 40, luzMedia: 0.039, acimaDeMeia: 0.001179, pico: 1, borrao: 10 },
      { ua: 2000, luzMedia: 0.039, acimaDeMeia: 0.001133, pico: 1, borrao: 8 },
    ].map((l) => ({ ...l, disco: discoRealPx(l.ua, 900, 58) }));
    const j = julgarEscada({ linhas: medido, alturaPx: 900, larguraPx: 900, comBloom: false });
    expect(j.erro, j.texto).toBe(false);
  });

  it('SABOTAGEM: borrão gigante com disco minúsculo TEM de reprovar', () => {
    const linhas = honesta([2000]);
    linhas[0].borrao = 900; // a assinatura do item 3, num degrau só
    const j = julgarEscada({ linhas, alturaPx: 900, comBloom: false });
    expect(j.erro).toBe(true);
    expect(j.linhas[0].motivos.join(' ')).toContain('teto');
  });

  it('SABOTAGEM: borrão que CRESCE com a distância TEM de reprovar', () => {
    // um borrão dentro do teto em cada degrau, mas subindo — é o Sol deixando
    // de encolher, que é o defeito mesmo quando o valor absoluto é pequeno.
    const linhas = [
      { ua: 20, luzMedia: 0.02, acimaDeMeia: 2e-4, pico: 1, borrao: 5, disco: discoRealPx(20, 900, 58) },
      { ua: 40, luzMedia: 0.02, acimaDeMeia: 2e-4, pico: 1, borrao: 9, disco: discoRealPx(40, 900, 58) },
    ];
    const j = julgarEscada({ linhas, alturaPx: 900, comBloom: false });
    expect(j.erro).toBe(true);
    expect(j.linhas.find((l) => l.ua === 40).motivos.join(' ')).toContain('CRESCEU');
  });

  it('SABOTAGEM: baixar o PICO não faz passar — o critério é a ÁREA', () => {
    // Este é o teste que torna executável a proibição de `NORTE.md:183`. Quem
    // "consertar" o item 3 com teto de brilho derruba o pico e deixa a mancha
    // do mesmo tamanho; o juiz tem de continuar reprovando. E o caminho certo
    // — mancha pequena com pico CHEIO, que é a fotosfera — tem de passar.
    const comTeto = honesta([500]);
    comTeto[0].pico = 0.2;
    comTeto[0].borrao = 900;
    expect(julgarEscada({ linhas: comTeto, alturaPx: 900, comBloom: false }).erro).toBe(true);

    const honestoComPicoCheio = honesta([500]);
    honestoComPicoCheio[0].pico = 1;
    expect(
      julgarEscada({ linhas: honestoComPicoCheio, alturaPx: 900, comBloom: false }).erro
    ).toBe(false);
  });

  it('a folga com bloom é maior que sem bloom — declarada, não frouxa', () => {
    const linhas = honesta([500]);
    linhas[0].borrao = Math.round(2 * claraoPsfPx(500, 900)); // entre 1,5× e 3×
    expect(julgarEscada({ linhas, alturaPx: 900, comBloom: false }).erro).toBe(true);
    expect(julgarEscada({ linhas, alturaPx: 900, comBloom: true }).erro).toBe(false);
  });

  it('sem linhas não inventa veredito', () => {
    const j = julgarEscada({ linhas: [], alturaPx: 900 });
    expect(j.erro).toBe(false);
    expect(j.linhas).toEqual([]);
  });
});
