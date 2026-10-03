// Serve: lei — as peças puras da cor inventada (PLAN-COR.md, M1 e M1b): a máscara do vazio, o retalho no plano tangente, o corte de erro mínimo, o giro, as grades reduzidas, o detalhe multiplicativo, os joelhos, as fontes com tom, o tom preso no patamar e a amplitude do albedo
// ============================================================
// Em miniatura, com resposta conhecida de fora do código:
//  1. O VAZIO é o que `preencherVazioSemDado` tapa — a calota grande —, e o
//     buraco pequeno fica como `semDado`; a redução ao destino é pelo máximo
//     da pegada e a dilatação dá a volta da longitude.
//  2. O RETALHO vai do alvo à origem e volta (a mesma rotação nos dois
//     sentidos), leva o centro ao centro e não gira: as coordenadas no plano
//     tangente são as mesmas, e o norte do alvo cai no meridiano da origem.
//  3. O CORTE passa pelo anel de erro baixo, deixa o descoberto dentro e
//     nunca põe novo além do primeiro texel fixo de um raio.
//  4. O GIRO de 180° (Plutão): as máscaras tiradas do cru giram como a
//     imagem gira, e girar de novo devolve o cru.
//  5. AS GRADES REDUZIDAS em tamanho que não divide (5926×2963): cada texel
//     vai à célula que contém o centro dele, nenhuma fica vazia; dividindo,
//     são os blocos de sempre.
//  6. A COR EM TRÊS CANAIS: o detalhe multiplicativo de uma fonte escura num
//     alvo claro leva o contraste da luminância e o matiz do retalho (um
//     ganho só), e o gelo claro vai ao branco quente, não ao ciano.
//  7. O JOELHO não mexe abaixo de 0,85 do fundo de escala, é monótono, nunca
//     passa de 255 e, na cor, guarda a luminância do joelho e a ordem dos canais;
//     o joelho relativo (razão ao tom) é o mesmo joelho, de 1,6 a 2, e nos escuros
//     (a variante calma) o espelho dele, de 0,65 a 0,5.
//  8. AS FONTES COM TOM: a caixa extra entra nas fontes da unidade, cada célula
//     leva a caixa e o tom dela, e o filtro aceita o fator nos dois sentidos.
//  9. O TOM PRESO NO PATAMAR: num campo sintético com uma rampa escura junto da
//     borda, a membrana presa além da rampa sai plana por anel; presa na rampa, não.
// 10. A AMPLITUDE DO ALBEDO (a variante serena) escala só o resíduo de albedo dos
//     retalhos: a sombra do relevo e o que ficou do fotografado não mudam.
// 11. A M2: o mapa de resolução dá 2 km à metade nítida de um campo sintético e
//     4–16 km à metade desfocada (σ 6 km), com contraste cheio e com 1/5 dele — pouco
//     contraste não é borrado; a montagem devolve a foto onde σ_loc é mínima e, no
//     corte, o passa-baixa da foto mais o passa-alta da síntese; a troca de σ é
//     contínua (os pesos e o resultado, de um lado e do outro de cada oitava).
// 12. O PORTÃO DO GERADOR (M3, `portaoDaCor` em `baixa-texturas.mjs`): grava só o
//     RGB cujo sha256 é o aprovado para a chave; sem entrada (ou aprovado só para
//     outra chave) ou com outro hash recusa, e a mensagem fala do map.jpg.
// ============================================================
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { portaoDaCor } from './baixa-texturas.mjs';
import {
  corteDeErroMinimo, dentroDoTom, detalheNoAlvo, dilataMascara, fontesDaCor, ganhoDaLuminancia, geometriaDoCorte, gradeReduzida, joelhoDaCor,
  joelhoDoBranco, joelhoSuave, mapaDeResolucao, montagemDaFoto, pesoDoNivel, pontoDaOrigem, razaoNoJoelho, reduzMascara, tomDeGrandeEscala,
  vazioDoMosaico,
} from './cor-inventada.mjs';
import { giraColunasDeImagem } from './lib-texturas.mjs';
import { desfocaComMascara, distanciaAoVazioKm, latitudeDaLinha, noPlano, planoTangente, pontoDoPlano } from './relevo-inventado.mjs';

const distancia = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const latLon = (p) => [Math.asin(p[2]) * (180 / Math.PI), ((Math.atan2(p[1], p[0]) * (180 / Math.PI)) + 360) % 360];

describe('a máscara do vazio', () => {
  it('pega a calota sem dado e deixa o buraco pequeno como sem dado', () => {
    const L = 360;
    const A = 180;
    const pixels = new Uint8Array(L * A * 3);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        let v = j >= 130 ? 0 : 100 + ((i * 7 + j * 13) % 50);
        if (j >= 60 && j <= 62 && i >= 200 && i <= 202) v = 5;
        pixels.fill(v, 3 * (j * L + i), 3 * (j * L + i) + 3);
      }
    }
    const { vazio, semDado } = vazioDoMosaico(pixels, L, A, 3);
    let calota = 0;
    let fora = 0;
    for (let k = 0; k < L * A; k += 1) {
      if (Math.floor(k / L) >= 130) calota += vazio[k];
      else fora += vazio[k];
    }
    expect(calota).toBe(50 * L);
    expect(fora).toBe(0);
    expect(semDado[61 * L + 201]).toBe(1);
    expect(semDado.reduce((s, v) => s + v, 0)).toBe(9);
  });

  it('reduz pelo máximo da pegada e dilata com a volta da longitude', () => {
    const fonte = new Uint8Array(12 * 6);
    fonte[2 * 12 + 11] = 1;
    const reduzida = reduzMascara(fonte, 12, 6, 8, 4);
    expect(reduzida[1 * 8 + 7]).toBe(1);
    expect(reduzida.reduce((s, v) => s + v, 0)).toBe(1);
    const dilatada = dilataMascara(reduzida, 8, 4, 1);
    expect(dilatada[1 * 8 + 0]).toBe(1);
    expect(dilatada[0 * 8 + 6]).toBe(1);
    expect(dilatada[2 * 8 + 0]).toBe(1);
    expect(dilatada[3 * 8 + 7]).toBe(0);
    expect(dilatada[1 * 8 + 5]).toBe(0);
  });
});

describe('o retalho no plano tangente', () => {
  it('vai e volta pela mesma rotação, leva o centro ao centro e não gira', () => {
    const raioKm = 606;
    for (const [aLat, aLon, oLat, oLon] of [[-60, 200, -20, 330], [-90, 0, -10, 320], [10, 100, -30, 300]]) {
      const alvo = planoTangente(aLat, aLon);
      const origem = planoTangente(oLat, oLon);
      const p = pontoDoPlano(alvo, 20, 30, raioKm);
      const q = pontoDaOrigem(alvo, origem, p);
      expect(distancia(pontoDaOrigem(origem, alvo, q), p)).toBeLessThan(1e-12);
      expect(distancia(pontoDaOrigem(alvo, origem, alvo.c), origem.c)).toBeLessThan(1e-12);
      const [x, y] = noPlano(origem, q, raioKm);
      expect(x).toBeCloseTo(20, 9);
      expect(y).toBeCloseTo(30, 9);
      // o norte do alvo cai no meridiano da origem, ao norte do centro
      const norte = latLon(pontoDaOrigem(alvo, origem, pontoDoPlano(alvo, 0, 50, raioKm)));
      expect(norte[0]).toBeGreaterThan(oLat);
      expect(Math.abs(((norte[1] - oLon + 540) % 360) - 180)).toBeLessThan(1e-9);
    }
  });
});

describe('o corte de erro mínimo', () => {
  const meio = 10;
  const H = 13;
  const montar = () => {
    const geo = geometriaDoCorte(meio, H);
    const { G } = geo;
    const custo = new Float64Array(G * G);
    const coberto = new Uint8Array(G * G).fill(1);
    const fixo = new Uint8Array(G * G);
    for (let b = 0; b < G; b += 1) {
      for (let a = 0; a < G; a += 1) {
        const r = Math.hypot(a - H, b - H);
        custo[b * G + a] = Math.abs(r - 7) < 0.75 ? 1e-3 : 1;
        if (r < 3) coberto[b * G + a] = 0;
      }
    }
    return { geo, G, custo, coberto, fixo };
  };

  it('passa pelo anel de erro baixo, com o descoberto dentro', () => {
    const { geo, custo, coberto, fixo } = montar();
    expect(corteDeErroMinimo(geo, custo, coberto, fixo)).toBeLessThan(1e29);
    for (let t = 0; t < geo.nTheta; t += 1) {
      expect(geo.rCorte[t]).toBeGreaterThanOrEqual(6);
      expect(geo.rCorte[t]).toBeLessThanOrEqual(8);
    }
  });

  it('não põe novo além do primeiro texel fixo de um raio', () => {
    const { geo, G, custo, coberto, fixo } = montar();
    for (let b = 0; b < G; b += 1) for (let a = H + 5; a < G; a += 1) fixo[b * G + a] = 1;
    expect(corteDeErroMinimo(geo, custo, coberto, fixo)).toBeLessThan(1e29);
    expect(geo.rCorte[0]).toBeGreaterThanOrEqual(3);
    expect(geo.rCorte[0]).toBeLessThanOrEqual(5);
    for (let t = 0; t < geo.nTheta; t += 1) expect(geo.rCorte[t]).toBeGreaterThanOrEqual(3);
  });
});

describe('o giro de 180°', () => {
  it('as máscaras do cru giram como a imagem e voltam', () => {
    const L = 360;
    const A = 180;
    // o cru com a borda esquerda em 0°E: o sul sem dado só na metade esquerda e um buraco pequeno na borda
    const pixels = new Uint8Array(L * A * 3);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        let v = j >= 140 && i < 180 ? 0 : 100 + ((i * 7 + j * 13) % 50);
        if (j >= 60 && j <= 62 && i <= 2) v = 5;
        pixels.fill(v, 3 * (j * L + i), 3 * (j * L + i) + 3);
      }
    }
    const { vazio, semDado } = vazioDoMosaico(pixels, L, A, 3);
    const imagem = giraColunasDeImagem(pixels, L, A, 3, 180);
    const vazioGirado = giraColunasDeImagem(vazio, L, A, 1, 180);
    const buracoGirado = giraColunasDeImagem(semDado, L, A, 1, 180);
    // a coluna 0 do cru (0°E) vai ao meio do mapa, e a máscara vai junto com o texel da imagem
    expect(buracoGirado[61 * L + 180]).toBe(1);
    expect(buracoGirado[61 * L + 0]).toBe(0);
    expect(vazioGirado[150 * L + 270]).toBe(1);
    expect(vazioGirado[150 * L + 90]).toBe(0);
    let desencontros = 0;
    for (let k = 0; k < L * A; k += 1) {
      if ((vazioGirado[k] || buracoGirado[k]) !== (imagem[3 * k] < 12 ? 1 : 0)) desencontros += 1;
    }
    expect(desencontros).toBe(0);
    // ida e volta
    expect(Array.from(giraColunasDeImagem(buracoGirado, L, A, 1, 180))).toEqual(Array.from(semDado));
    expect(Array.from(giraColunasDeImagem(vazioGirado, L, A, 1, -180))).toEqual(Array.from(vazio));
  });
});

describe('as grades reduzidas', () => {
  it('em tamanho que não divide (Plutão), cada texel vai à célula que contém o centro dele', () => {
    const L = 5926;
    const A = 2963;
    const g = gradeReduzida(L, A, 4);
    expect([g.largura, g.altura]).toEqual([1472, 736]);
    let fora = 0;
    for (let i = 0; i < L; i += 1) {
      const x = ((i + 0.5) * g.largura) / L;
      if (!(g.coluna[i] <= x && x < g.coluna[i] + 1)) fora += 1;
    }
    for (let j = 0; j < A; j += 1) {
      const y = ((j + 0.5) * g.altura) / A;
      if (!(g.linha[j] <= y && y < g.linha[j] + 1)) fora += 1;
    }
    expect(fora).toBe(0);
    expect(g.conta.reduce((m, c) => Math.min(m, c), Infinity)).toBeGreaterThan(0);
    expect(g.conta.reduce((s, c) => s + c, 0)).toBe(L * A);
  });

  it('em tamanho que divide, são os blocos de sempre', () => {
    const g = gradeReduzida(64, 32, 4);
    expect([g.largura, g.altura]).toEqual([16, 8]);
    expect(Array.from(g.coluna)).toEqual(Array.from({ length: 64 }, (_, i) => i >> 2));
    expect(Array.from(g.linha)).toEqual(Array.from({ length: 32 }, (_, j) => j >> 2));
    expect(g.conta.every((c) => c === 16)).toBe(true);
  });
});

const luminancia = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

describe('a cor em três canais', () => {
  it('o detalhe multiplicativo leva o contraste e o matiz do retalho, com um ganho só', () => {
    // um planalto de albedo intermediário e o gelo claro de um fundo de cratera; o alvo, o tom do sul
    const tomDaFonte = [80, 60, 50];
    const gelo = [190, 160, 140];
    const tomDoAlvo = [113, 87, 78];
    const g = ganhoDaLuminancia(luminancia(tomDoAlvo), luminancia(tomDaFonte));
    expect(g).toBeCloseTo(luminancia(tomDoAlvo) / luminancia(tomDaFonte), 12);
    const detalhe = gelo.map((v, c) => v - tomDaFonte[c]);
    const rgb = tomDoAlvo.map((t, c) => t + g * detalhe[c]);
    // o contraste da luminância é o da fonte, e os três canais sobem na proporção do retalho
    const contraste = (c, t) => (luminancia(c) - luminancia(t)) / luminancia(t);
    expect(contraste(rgb, tomDoAlvo)).toBeCloseTo(contraste(gelo, tomDaFonte), 12);
    for (let c = 1; c < 3; c += 1) expect((rgb[c] - tomDoAlvo[c]) / (rgb[0] - tomDoAlvo[0])).toBeCloseTo(detalhe[c] / detalhe[0], 12);
    // o claro passa do fundo de escala: o joelho o leva ao branco quente (R ≥ G ≥ B), e não ao ciano
    expect(Math.max(...rgb)).toBeGreaterThan(255);
    joelhoDaCor(rgb);
    expect(Math.max(...rgb)).toBeLessThanOrEqual(255);
    expect(rgb[0]).toBeGreaterThanOrEqual(rgb[1]);
    expect(rgb[1]).toBeGreaterThanOrEqual(rgb[2]);
    // o ganho fica nos limites
    expect(ganhoDaLuminancia(100, 5)).toBe(2);
    expect(ganhoDaLuminancia(10, 100)).toBe(0.5);
  });
});

describe('o joelho do branco', () => {
  it('não mexe abaixo de 0,85 do fundo de escala, é monótono e nunca passa de 255', () => {
    expect(joelhoDoBranco(100)).toBe(100);
    expect(joelhoDoBranco(216)).toBe(216);
    let antes = -Infinity;
    let quebras = 0;
    for (let y = 0; y <= 5000; y += 0.25) {
      const v = joelhoDoBranco(y);
      if (v < antes || v > 255) quebras += 1;
      antes = v;
    }
    expect(quebras).toBe(0);
    expect(joelhoDoBranco(1e6)).toBeLessThanOrEqual(255);
  });

  it('na cor, nenhum canal passa de 255, a luminância é a do joelho e a ordem dos canais fica', () => {
    let semente = 7;
    const sorteia = () => {
      semente = (semente * 1103515245 + 12345) % 2147483648;
      return semente / 2147483648;
    };
    let quebras = 0;
    for (let q = 0; q < 2000; q += 1) {
      const entrada = [600 * sorteia(), 600 * sorteia(), 600 * sorteia()];
      const rgb = [...entrada];
      joelhoDaCor(rgb);
      if (Math.max(...rgb) > 255) quebras += 1;
      if (Math.abs(luminancia(rgb) - joelhoDoBranco(luminancia(entrada))) > 1e-9) quebras += 1;
      for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) if (Math.sign(entrada[a] - entrada[b]) !== Math.sign(rgb[a] - rgb[b])) quebras += 1;
    }
    expect(quebras).toBe(0);
  });
});

describe('o joelho relativo', () => {
  it('não mexe até 1,6, é monótono, contínuo no começo e nunca passa de 2', () => {
    expect(joelhoSuave(1.6, 1.6, 0.4)).toBe(1.6);
    expect(joelhoSuave(1.2, 1.6, 0.4)).toBe(1.2);
    expect((joelhoSuave(1.6001, 1.6, 0.4) - 1.6) / 0.0001).toBeCloseTo(1, 3);
    let antes = -Infinity;
    let quebras = 0;
    for (let x = 0; x <= 50; x += 0.01) {
      const v = joelhoSuave(x, 1.6, 0.4);
      if (v < antes || v > 2) quebras += 1;
      antes = v;
    }
    expect(quebras).toBe(0);
    expect(joelhoDoBranco(300)).toBe(joelhoSuave(300, 0.85 * 255, 255 - 0.85 * 255));
  });

  it('nos escuros é o espelho: não mexe de 0,65 a 1,6, é monótono, contínuo no começo e nunca desce de 0,5', () => {
    const relativo = { inicio: 1.6, folga: 0.4, escuros: { inicio: 0.65, folga: 0.15 } };
    expect(razaoNoJoelho(0.65, relativo)).toBe(0.65);
    expect(razaoNoJoelho(1.2, relativo)).toBe(1.2);
    expect((0.65 - razaoNoJoelho(0.6499, relativo)) / 0.0001).toBeCloseTo(1, 3);
    let antes = -Infinity;
    let quebras = 0;
    for (let x = -5; x <= 50; x += 0.01) {
      const v = razaoNoJoelho(x, relativo);
      if (v < antes || v < 0.5 || v > 2) quebras += 1;
      antes = v;
    }
    expect(quebras).toBe(0);
    // o claro é o joelho de sempre; sem `escuros` (a v4), o escuro fica como está
    expect(razaoNoJoelho(3, relativo)).toBe(joelhoSuave(3, 1.6, 0.4));
    expect(razaoNoJoelho(0.3, { inicio: 1.6, folga: 0.4 })).toBe(0.3);
  });
});

describe('as fontes com tom', () => {
  it('a caixa extra entra na unidade, cada célula leva a caixa e o tom, e o filtro aceita o fator nos dois sentidos', () => {
    const l = 360;
    const a = 180;
    const distanciaAoRuim = new Float32Array(l * a).fill(Infinity);
    const tomDasCelulas = Float32Array.from({ length: l * a }, (_, c) => (latitudeDaLinha(Math.floor(c / l), a) > 0 ? 80 : 27));
    const fonte = { unidades: { escura: { fontes: [{ lon: [100, 140], lat: [-20, 0] }] } } };
    const base = { distanciaAoRuim, largura: l, altura: a, fonte, raioM: 1188300, larguraKm: 55 };
    const [so] = fontesDaCor(base);
    const [com] = fontesDaCor({ ...base, extras: { escura: [{ lon: [100, 140], lat: [13, 22] }] }, tomDasCelulas });
    expect(so.tom).toBe(null);
    expect(com.celulas.length).toBeGreaterThan(so.celulas.length);
    expect(new Set(com.caixa)).toEqual(new Set([0, 1]));
    for (let q = 0; q < com.celulas.length; q += 1) expect(com.tom[q]).toBe(com.caixa[q] === 1 ? 80 : 27);
    // o filtro: o fator vale nos dois sentidos, e a fonte escura só entra no alvo claro a fator 3 ou mais
    expect(dentroDoTom(100, 149, 1.5)).toBe(true);
    expect(dentroDoTom(149, 100, 1.5)).toBe(true);
    expect(dentroDoTom(100, 151, 1.5)).toBe(false);
    expect(dentroDoTom(80, 105, 1.5)).toBe(true);
    expect(dentroDoTom(27, 105, 3)).toBe(false);
  });
});

describe('o tom preso no patamar', () => {
  it('com a rampa escura dentro do alvo, a membrana sai plana por anel; presa na rampa, não', () => {
    const L = 256;
    const A = 128;
    const raioM = 300000;
    const n = L * A;
    const vazio = Uint8Array.from({ length: n }, (_, k) => (latitudeDaLinha(Math.floor(k / L), A) < -0.5 ? 1 : 0));
    const distancia = distanciaAoVazioKm(vazio, L, A, raioM);
    const dentro = distanciaAoVazioKm(Uint8Array.from(vazio, (v) => 1 - v), L, A, raioM);
    // o patamar em 100 DN; a rampa da luz rasante desce a 80 nos 60 km junto da borda
    const valor = Float32Array.from(distancia, (d, k) => (vazio[k] ? 0 : 100 - 20 * Math.max(0, 1 - d / 60)));
    const grade = gradeReduzida(L, A, 2);
    const aneis = (faixaKm) => {
      const alvo = Uint8Array.from(vazio, (v, k) => (v || distancia[k] < faixaKm ? 1 : 0));
      const dadoDoTom = Uint8Array.from(alvo, (v) => 1 - v);
      const tom = tomDeGrandeEscala({ valor, dadoDoTom, alvo, largura: L, altura: A, raioM, grade });
      const soma = new Float64Array(10);
      const conta = new Float64Array(10);
      for (let k = 0; k < n; k += 1) {
        if (!vazio[k] || !(dentro[k] < 250)) continue;
        const b = Math.floor(dentro[k] / 25);
        soma[b] += tom[k];
        conta[b] += 1;
      }
      return Array.from(soma, (s, b) => s / conta[b]);
    };
    const noPatamar = aneis(75);
    const naRampa = aneis(0);
    expect(Math.max(...noPatamar) - Math.min(...noPatamar)).toBeLessThan(2);
    for (const v of noPatamar) expect(Math.abs(v - 100)).toBeLessThan(2);
    expect(100 - naRampa[0]).toBeGreaterThan(5);
  });
});

describe('a amplitude do albedo', () => {
  it('escala só o resíduo de albedo dos retalhos, não a sombra nem o fotografado', () => {
    // resíduo 30 − 10 = 20 DN, sombra 8 DN, a fração da sombra no alvo 0,57
    const inteiro = detalheNoAlvo(30, 10, 8, 1, 0.57, 1);
    expect(inteiro).toBe(30 - 1 * 10 + 8 * (1 - 1 * (1 - 0.57)));
    expect(inteiro - detalheNoAlvo(30, 10, 8, 1, 0.57, 0.5)).toBeCloseTo(10, 12);
    expect(detalheNoAlvo(10, 10, 8, 1, 0.57, 0.5)).toBe(detalheNoAlvo(10, 10, 8, 1, 0.57, 1));
    expect(detalheNoAlvo(30, 10, 8, 0, 0.57, 0.5)).toBe(38);
  });
});

describe('a M2: a resolução local e a montagem', () => {
  // a esfera de 512×256 com texel de 1 km (raio 81,5 km); ruído determinístico (mulberry32)
  const L = 512;
  const A = 256;
  const n = L * A;
  const raioM = (1000 * A) / Math.PI;
  const ruido = (semente) => {
    let a = semente >>> 0;
    return Float32Array.from({ length: n }, () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
    });
  };
  const um = new Uint8Array(n).fill(1);
  const mediana = (v) => [...v].sort((x, y) => x - y)[v.length >> 1];

  it('o mapa de resolução dá 2 km à metade nítida, 4–16 km à desfocada (σ 6 km), e pouco contraste não muda isso', () => {
    // a esfera de 1024×512 com texel de 1 km; a textura com a mesma energia em cada oitava (o ruído e ele desfocado de 2
    // a 16 km, cada um com RMS 1); a metade de oeste nítida, a de leste desfocada, e no meio de cada uma, uma faixa de
    // 192 km com 1/5 do contraste
    const Lg = 1024;
    const Ag = 512;
    const ng = Lg * Ag;
    const raioG = (1000 * Ag) / Math.PI;
    const umG = new Uint8Array(ng).fill(1);
    const textura = new Float32Array(ng);
    for (const [q, s] of [0, 2, 4, 8, 16].entries()) {
      let a = (30 + q) >>> 0;
      const r = Float32Array.from({ length: ng }, () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
      });
      const c = s ? desfocaComMascara(r, umG, Lg, Ag, raioG, s).valor : r;
      const rms = Math.sqrt(c.reduce((x, v) => x + v * v, 0) / ng);
      for (let k = 0; k < ng; k += 1) textura[k] += c[k] / rms;
    }
    const desfocada = desfocaComMascara(textura, umG, Lg, Ag, raioG, 6).valor;
    const fraco = (i) => (i >= 160 && i < 352) || (i >= 672 && i < 864);
    const valor = Float32Array.from(textura, (v, k) => {
      const i = k % Lg;
      return 100 + 10 * (fraco(i) ? 0.2 : 1) * (i < Lg / 2 ? v : desfocada[k]);
    });
    const nitido = Uint8Array.from({ length: ng }, (_, k) => (k % Lg < Lg / 2 && !fraco(k % Lg) ? 1 : 0));
    const grade = gradeReduzida(Lg, Ag, 2);
    const { nivel, largura: l } = mapaDeResolucao({ valor, dado: umG, nitido, largura: Lg, altura: Ag, raioM: raioG, grade });
    // a mediana do nível em colunas a 60 km ou mais de qualquer divisa, entre ±34° de latitude
    const naFaixa = (i0, i1) => {
      const v = [];
      for (let J = 80; J < 176; J += 1) for (let I = i0 / 2; I < i1 / 2; I += 1) v.push(nivel[J * l + I]);
      return mediana(v);
    };
    expect(naFaixa(40, 100)).toBeLessThan(0.3); // nítida: σ_loc ≈ 2 km
    expect(naFaixa(220, 292)).toBeLessThan(0.3); // nítida com 1/5 do contraste: segue nítida
    for (const faixa of [[584, 640], [736, 800]]) {
      // desfocada, com contraste cheio e com 1/5 dele: σ_loc da ordem do desfoque, entre 4 e 16 km
      expect(naFaixa(...faixa)).toBeGreaterThan(1);
      expect(naFaixa(...faixa)).toBeLessThan(3);
    }
  });

  it('a montagem devolve a foto onde σ_loc é mínima, e a síntese abaixo do corte onde não é', () => {
    const foto = Float32Array.from(ruido(11), (v) => 100 + 30 * v);
    const sintese = Float32Array.from(ruido(12), (v) => 25 * v);
    const nivel = Float32Array.from({ length: n }, (_, k) => (k % L < L / 2 ? 0 : 3));
    const saida = montagemDaFoto({ foto, sintese, nivel, alvo: um, peso: um, largura: L, altura: A, raioM });
    let maior = 0;
    for (let k = 0; k < n; k += 1) if (k % L < L / 2) maior = Math.max(maior, Math.abs(saida[k] - foto[k]));
    expect(maior).toBeLessThan(1e-4);
    // no nível 3 (corte na gaussiana de 8 km): o passa-baixa da foto mais o passa-alta da síntese
    const g8 = (x) => desfocaComMascara(x, um, L, A, raioM, 8).valor;
    const pbFoto = g8(foto);
    const pbSintese = g8(sintese);
    let erro = 0;
    for (let k = 0; k < n; k += 1) if (k % L >= L / 2) erro = Math.max(erro, Math.abs(saida[k] - (pbFoto[k] + sintese[k] - pbSintese[k])));
    expect(erro).toBeLessThan(1e-3);
  });

  it('a troca de σ é contínua: os pesos e o resultado, de um lado e do outro de cada oitava', () => {
    for (let l = 0; l <= 5; l += 0.001) {
      let soma = 0;
      for (let q = 0; q <= 5; q += 1) {
        soma += pesoDoNivel(l, q);
        expect(Math.abs(pesoDoNivel(l + 0.001, q) - pesoDoNivel(l, q))).toBeLessThan(0.0011);
      }
      expect(soma).toBeCloseTo(1, 12);
    }
    const foto = Float32Array.from(ruido(21), (v) => 100 + 30 * v);
    const sintese = Float32Array.from(ruido(22), (v) => 25 * v);
    const comNivel = (x) => montagemDaFoto({ foto, sintese, nivel: new Float32Array(n).fill(x), alvo: um, peso: um, largura: L, altura: A, raioM });
    for (const q of [1, 2, 4]) {
      const antes = comNivel(q - 1e-4);
      const depois = comNivel(q + 1e-4);
      let maior = 0;
      for (let k = 0; k < n; k += 1) maior = Math.max(maior, Math.abs(antes[k] - depois[k]));
      expect(maior).toBeLessThan(0.05);
    }
  });
});

describe('o portão do gerador (M3)', () => {
  it('grava só o RGB aprovado para a chave; sem entrada ou com outro hash recusa, e a mensagem fala do map.jpg', () => {
    const rgb = Uint8Array.from({ length: 4 * 2 * 3 }, (_, k) => (k * 37) % 256);
    const certo = createHash('sha256').update(rgb).digest('hex');
    const chave = 'sul:1,borrado:1';
    const comAprovados = (aprovados) => portaoDaCor({ rotulo: 'pluto/map', chave, rgb, aprovados });

    expect(comAprovados({ [chave]: certo })).toMatchObject({ grava: true, sha256: certo });

    const semEntrada = comAprovados({});
    expect(semEntrada).toMatchObject({ grava: false, sha256: certo });
    expect(semEntrada.mensagem).toContain(certo);
    expect(semEntrada.mensagem).toContain(`corInventada.sha256Aprovado["${chave}"]`);
    // o aprovado da M1 sozinha não serve à chave da M1 com a M2
    expect(comAprovados({ 'sul:1': certo }).grava).toBe(false);

    const outro = 'f'.repeat(64);
    const diferente = comAprovados({ [chave]: outro });
    expect(diferente.grava).toBe(false);
    expect(diferente.mensagem).toContain(certo);
    expect(diferente.mensagem).toContain(outro);

    for (const { mensagem } of [semEntrada, diferente]) {
      expect(mensagem).toMatch(/o map\.jpg NÃO foi gravado/);
      expect(mensagem).not.toMatch(/normal\.png/);
    }
  });
});
