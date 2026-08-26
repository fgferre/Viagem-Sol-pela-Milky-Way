// ============================================================
// O JUIZ DO MEDIDOR — cada definição do A/B de luz num quadro cuja
// resposta se sabe à mão.
//
// O medidor tem DUAS provas, e elas cobrem coisas diferentes:
//
//  1. A DE FORA, feita uma vez e relatada: rodado sobre os quadros crus
//     de 1100×900 de 25/08, ele devolve os oito `capturas/item93-*.json`
//     campo por campo, 473 de 473. É o que prova que o que veio da
//     bancada para dentro do projeto é o MESMO instrumento.
//  2. ESTA, que fica: quadros montados aqui, com a conta ao lado, para
//     que nenhuma definição possa mudar em silêncio depois. É ela que
//     protege a de fora — os PNG de 25/08 são efêmeros, este arquivo não.
//
// As contas de luz recebem `Float32Array` direto: é o mesmo tipo que o
// medidor usa, e assim o valor esperado é aritmética exata em vez de
// refém do arredondamento do cinza. O leitor de PNG tem bloco só dele.
// ============================================================
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  LIMIAR_DE_MUDANCA,
  arred,
  medirJanela,
  LIMIAR_DE_SATURACAO,
  LIMIAR_DO_PRETO,
  cinzaDoPng,
  lerPng,
  medirAneis,
  medirCroma,
  medirFaixas,
  medirPar,
  medirUmbra,
  nucleoMaisEscuro,
  percentil,
} from './luz-ab.mjs';

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function pedaco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

/**
 * Um PNG RGBA de 8 bits com o FILTRO pedido em cada linha — 0 e 4 (Paeth)
 * são os que aparecem no que o Chrome grava, e os dois passam por aqui.
 */
function png(largura, altura, corDoPixel, filtro = 0) {
  const canais = 4;
  const linha = largura * canais;
  const cru = Buffer.alloc(altura * (linha + 1));
  const anterior = Buffer.alloc(linha);
  for (let y = 0; y < altura; y++) {
    const bruto = Buffer.alloc(linha);
    for (let x = 0; x < largura; x++) {
      const [r, g, b] = corDoPixel(x, y);
      bruto[x * 4] = r;
      bruto[x * 4 + 1] = g;
      bruto[x * 4 + 2] = b;
      bruto[x * 4 + 3] = 255;
    }
    cru[y * (linha + 1)] = filtro;
    for (let i = 0; i < linha; i++) {
      if (filtro === 0) cru[y * (linha + 1) + 1 + i] = bruto[i];
      else {
        const a = i >= canais ? bruto[i - canais] : 0;
        const b = anterior[i];
        const c = i >= canais ? anterior[i - canais] : 0;
        const p = a + b - c;
        const da = Math.abs(p - a);
        const db = Math.abs(p - b);
        const dc = Math.abs(p - c);
        const prev = da <= db && da <= dc ? a : db <= dc ? b : c;
        cru[y * (linha + 1) + 1 + i] = (bruto[i] - prev) & 255;
      }
    }
    bruto.copy(anterior);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(cru)),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

describe('o leitor de PNG', () => {
  it('lê os dois filtros que aparecem no arquivo e devolve o MESMO cinza', () => {
    const desenho = (x, y) => {
      const v = (x * 7 + y * 13) % 256;
      return [v, v, v];
    };
    const semFiltro = cinzaDoPng(lerPng(png(9, 5, desenho, 0)));
    const comPaeth = cinzaDoPng(lerPng(png(9, 5, desenho, 4)));
    expect([...comPaeth]).toEqual([...semFiltro]);
    expect(semFiltro[0]).toBe(0);
    expect(semFiltro[1]).toBeCloseTo(7, 4);
  });

  it('a luminância Rec.709 é a declarada, canal a canal', () => {
    const g = cinzaDoPng(
      lerPng(png(3, 1, (x) => [x === 0 ? 255 : 0, x === 1 ? 255 : 0, x === 2 ? 255 : 0]))
    );
    expect(g[0]).toBeCloseTo(0.2126 * 255, 3);
    expect(g[1]).toBeCloseTo(0.7152 * 255, 3);
    expect(g[2]).toBeCloseTo(0.0722 * 255, 3);
  });

  it('recusa o que não sabe ler, em vez de devolver pixel inventado', () => {
    expect(() => lerPng(Buffer.from('isto não é um png'))).toThrow(/não é PNG/);
    const dezesseis = Buffer.from(png(2, 2, () => [10, 10, 10]));
    dezesseis[24] = 16; // a profundidade de bits, dentro do IHDR
    expect(() => lerPng(dezesseis)).toThrow(/16 bits/);
  });
});

describe('percentil', () => {
  it('devolve uma AMOSTRA que existe, na posição floor(p·n) — sem interpolar', () => {
    const v = [0, 10, 20, 30, 40];
    expect(percentil(v, 0)).toBe(0);
    expect(percentil(v, 0.5)).toBe(20); // floor(2,5) = 2
    expect(percentil(v, 0.9)).toBe(40); // floor(4,5) = 4
    expect(percentil(v, 1)).toBe(40); // e nunca sai do vetor
    expect(percentil([0, 10], 0.25)).toBe(0); // interpolado daria 2,5
    expect(percentil([], 0.9)).toBe(0);
  });
});

describe('medirPar — o bloco A/B, campo a campo', () => {
  /**
   * O QUADRO DE PROVA, 10×10 = 100 pixels, contado à mão:
   *
   *   linha 0 (10 px): antes 0,   depois 0    → PRETO dos dois lados
   *   linha 1 (10 px): antes 0,   depois 40   → NASCE do preto
   *   linha 2 (10 px): antes 40,  depois 0    → MORRE no preto
   *   linha 3 (10 px): antes 100, depois 90   → escurece (Δ 10)
   *   linhas 4–9 (60): antes 100, depois 120  → clareia (Δ 20)
   *
   *   máscara = 90 (tudo menos a linha 0)
   *   mediaAntes  = (0·10 + 40·10 + 100·70)/90 = 7.400/90 = 82,222
   *   mediaDepois = (40·10 + 0·10 + 90·10 + 120·60)/90 = 8.500/90 = 94,444
   *   razão = 8.500/7.400 = 1,1486
   *   mudaram = 90; deltaMedio = (400+400+100+1.200)/90 = 23,333
   */
  const quadro = (f) => {
    const v = new Float32Array(100);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) v[y * 10 + x] = f(y);
    return v;
  };
  const antes = quadro((y) => (y <= 1 ? 0 : y === 2 ? 40 : 100));
  const depois = quadro((y) => (y === 0 ? 0 : y === 1 ? 40 : y === 2 ? 0 : y === 3 ? 90 : 120));
  const m = medirPar(antes, depois);

  it('conta o quadro, a máscara e as médias', () => {
    expect(m.pixels).toBe(100);
    expect(m.mascara).toBe(90);
    expect(m.mediaAntes).toBe(82.222);
    expect(m.mediaDepois).toBe(94.444);
    expect(m.razao).toBe(1.1486);
  });

  it('conta quem mudou, e a porcentagem é do QUADRO, não da máscara', () => {
    expect(m.pixelsQueMudaram).toBe(90);
    expect(m.pctQueMudaram).toBe(90); // 90/100, e NÃO 100 (90/90)
    expect(m.deltaMedio).toBe(23.333);
    expect(m.deltaMax).toBe(40);
  });

  it('separa clarear de acender: nasceu, morreu e perdeu luz', () => {
    expect(m.nasceramDoPreto).toBe(10);
    expect(m.morreramNoPreto).toBe(10);
    expect(m.pixelsQuePerderamLuz).toBe(20); // a linha 2 (40 → 0) e a linha 3 (Δ 10)
  });

  it('os percentis saem da máscara ordenada, sem interpolar', () => {
    expect(m.p90Antes).toBe(100);
    expect(m.p99Antes).toBe(100);
    expect(m.p90Depois).toBe(120);
    expect(m.p99Depois).toBe(120);
  });

  /**
   * O PRETO É 2, NÃO 0, e isto é a definição que mais muda o veredito:
   * abaixo de 2 de 255 não há imagem, há o piso de ruído do quadro. Um
   * pixel que sai de 0,4 para 1,6 não "nasceu" — continuou preto.
   */
  it('o limiar do preto é 2: quem não cruza o 2 não nasce nem morre', () => {
    expect(LIMIAR_DO_PRETO).toBe(2);
    const a = new Float32Array([0.4, 0.4, 3, 3]);
    const b = new Float32Array([1.6, 3, 0.5, 3]);
    const q = medirPar(a, b);
    expect(q.mascara).toBe(3); // o par 0,4 → 1,6 fica de fora dos dois lados
    expect(q.nasceramDoPreto).toBe(1); // só o 0,4 → 3
    expect(q.morreramNoPreto).toBe(1); // só o 3 → 0,5
  });

  it('o limiar de meio nível separa mudança de arredondamento', () => {
    expect(LIMIAR_DE_MUDANCA).toBe(0.5);
    const a = new Float32Array([100, 100, 100, 100]);
    const b = new Float32Array([100.4, 100.5, 100.6, 101]);
    const q = medirPar(a, b);
    expect(q.pixelsQueMudaram).toBe(3); // o 100,4 não passa; o 100,5 passa (é `≥`)
    expect(q.pixelsQuePerderamLuz).toBe(0); // todos clarearam
  });

  it('conta os saturados na máscara e recusa quadros de tamanhos diferentes', () => {
    expect(LIMIAR_DE_SATURACAO).toBe(254);
    const cheio = new Float32Array([255, 254, 253.9, 1]);
    const s = medirPar(cheio, cheio);
    expect(s.mascara).toBe(3); // o 1 é preto
    expect(s.saturadosAntes).toBe(2);
    expect(s.saturadosDepois).toBe(2);
    expect(s.pixelsQueMudaram).toBe(0);
    expect(s.razao).toBe(1);
    expect(() => medirPar(cheio, new Float32Array(2))).toThrow(/tamanhos diferentes/);
  });
});

describe('medirFaixas — o quadro repartido pelo nível do lado ANTES', () => {
  it('cada faixa recebe o nível que lhe cabe, e a razão é a da faixa', () => {
    // 10 px, o k-ésimo com antes = 20·k: os níveis caem em 0,1 … 1,0, um
    // por faixa. O depois é o dobro em toda parte.
    const antes = Float32Array.from({ length: 10 }, (_, k) => 20 * (k + 1));
    const depois = antes.map((v) => v * 2);
    const f = medirFaixas(antes, depois);
    expect(f.pico).toBe(200);
    expect(f.faixas).toHaveLength(10);
    expect(f.faixas[0]).toEqual({ faixa: '0.05–0.15', n: 1, antes: 20, depois: 40, razao: 2 });
    expect(f.faixas[9]).toEqual({ faixa: '0.95–1.05', n: 1, antes: 200, depois: 400, razao: 2 });
    expect(f.faixas.reduce((s, x) => s + x.n, 0)).toBe(10);
  });

  it('o flanco e o subsolar podem ter razões DIFERENTES — é para isso que serve', () => {
    const f = medirFaixas(new Float32Array([50, 100]), new Float32Array([72, 100]));
    expect(f.faixas[4]).toMatchObject({ faixa: '0.45–0.55', n: 1, razao: 1.44 });
    expect(f.faixas[9]).toMatchObject({ faixa: '0.95–1.05', n: 1, razao: 1 });
  });

  /**
   * POR QUE O PICO É O p99,9 E NÃO O MÁXIMO: uma estrela do fundo é mais
   * brilhante que o subsolar do planeta. Com o máximo por régua, o disco
   * inteiro desceria para a faixa de baixo e as dez faixas mediriam o
   * céu, não o corpo.
   */
  it('o pico é o p99,9: uma estrela do fundo não manda a régua para o espaço', () => {
    const antes = new Float32Array(10000);
    antes.fill(200);
    for (let i = 9995; i < 10000; i++) antes[i] = 1000; // cinco estrelas
    const f = medirFaixas(antes, antes);
    expect(f.pico).toBe(200); // e não 1000
    expect(f.faixas[9].n).toBe(9995); // o disco inteiro no subsolar
  });
});

describe('medirAneis — o disco em dez anéis, e o quão chato ele é', () => {
  /** um disco de raio R num quadro L×L, com o brilho dado por r/R */
  const disco = (L, R, brilhoNoRaio) => {
    const v = new Float32Array(L * L);
    const c = L / 2;
    for (let y = 0; y < L; y++) {
      for (let x = 0; x < L; x++) {
        const r = Math.hypot(x - c, y - c);
        v[y * L + x] = r <= R ? brilhoNoRaio(r / R) : 0;
      }
    }
    return v;
  };

  it('acha o centro e o raio equivalente do disco', () => {
    const d = disco(300, 60, () => 200);
    const a = medirAneis(d, d, 300, 300);
    expect(a.centro[0]).toBeCloseTo(150, 0);
    expect(a.centro[1]).toBeCloseTo(150, 0);
    expect(a.raioPx).toBeCloseTo(60, 0);
  });

  it('disco de brilho CONSTANTE é chato = 1 — o fato da foto da Lua', () => {
    const d = disco(300, 60, () => 200);
    const a = medirAneis(d, d, 300, 300);
    expect(a.chatoAntes).toBe(1);
    expect(a.chatoDepois).toBe(1);
    for (const anel of a.aneis) expect(anel.razao).toBe(1);
  });

  it('limbo que cai puxa o chato para baixo, e o número diz quanto', () => {
    const plano = disco(300, 60, () => 200);
    const caindo = disco(300, 60, (t) => 200 * (1 - 0.5 * t));
    const a = medirAneis(plano, caindo, 300, 300);
    expect(a.chatoAntes).toBe(1);
    // o anel 0,8–0,9 recebe ~200·(1−0,5·0,85) e o 0,0–0,1 ~200·(1−0,5·0,05)
    expect(a.chatoDepois).toBeCloseTo(0.59, 1);
    expect(a.aneis[9].razao).toBeLessThan(a.aneis[0].razao);
  });

  /** o último décimo para em 0,98 porque é no limbo que a máscara mente */
  it('os anéis param em 0,98: o último é MEIO anel, e isso é de propósito', () => {
    const d = disco(300, 60, () => 200);
    const a = medirAneis(d, d, 300, 300);
    expect(a.aneis[9].n).toBeLessThan(a.aneis[8].n);
    const raio = a.raioPx;
    expect(a.aneis.reduce((s, x) => s + x.n, 0)).toBeLessThan(Math.PI * raio * raio);
  });

  it('sem disco acima do limiar, REPROVA em vez de devolver um centro inventado', () => {
    const escuro = new Float32Array(300 * 300);
    expect(() => medirAneis(escuro, escuro, 300, 300)).toThrow(/nenhum disco/);
  });
});

describe('medirCroma — a COR do que mudou, separada pelo sinal', () => {
  /**
   * O QUADRO DE PROVA, 5×1 = 5 pixels, contado à mão:
   *
   *   px 0: 100,100,100 → 100,100,100   parado
   *   px 1:  50, 50, 50 →  70, 60, 52   ACENDE com tinta palha (Δ 20/10/2)
   *   px 2:  50, 50, 50 →  90, 70, 54   ACENDE com a MESMA tinta, o dobro
   *   px 3: 100,100,100 →  90, 90, 90   APAGA achatado (Δ −10 nos três)
   *   px 4: 100,100,100 → 120, 90,100   APAGA com o VERMELHO SUBINDO
   *                                     (Δ +20/−10/0, Δlum = −2,90)
   *
   *   acendeu: n=2, médias 30/15/3    → cor  1 :  0,5 : 0,1
   *   apagou:  n=2, médias 5/−10/−5   → cor  1 : −2   : −1
   *
   * O PX 4 É O JUIZ DA LUMINÂNCIA, e entrou em 25/08 porque sem ele o
   * balde não tinha juiz nenhum: nos quatro primeiros pixels o ΔR e a
   * Δluminância concordam de SINAL, então trocar a Rec.709 desta linha
   * por um `dR` cru passava calado. No px 4 eles discordam — o vermelho
   * sobe 20, o verde cai 10, e a Rec.709 pesa o verde 3,4× mais que o
   * vermelho, de modo que o pixel ESCURECEU.
   */
  const png = (trincas) => ({
    largura: trincas.length,
    altura: 1,
    canais: 3,
    dados: Uint8Array.from(trincas.flat()),
  });
  const antes = png([
    [100, 100, 100], [50, 50, 50], [50, 50, 50], [100, 100, 100], [100, 100, 100],
  ]);
  const depois = png([
    [100, 100, 100], [70, 60, 52], [90, 70, 54], [90, 90, 90], [120, 90, 100],
  ]);
  const c = medirCroma(antes, depois);

  it('separa quem acendeu de quem apagou pelo sinal da LUMINÂNCIA', () => {
    expect(c.pixels).toBe(5);
    expect(c.acendeu.n).toBe(2);
    expect(c.apagou.n).toBe(2);
  });

  it('a média do delta sai canal a canal, e a COR é a razão normalizada em R', () => {
    expect(c.acendeu.dR).toBe(30);
    expect(c.acendeu.dG).toBe(15);
    expect(c.acendeu.dB).toBe(3);
    expect(c.acendeu.corRGB).toEqual([1, 0.5, 0.1]);
  });

  /**
   * O BALDE É O DA LUMINÂNCIA, NÃO O DE UM CANAL — e o px 4 é quem prova.
   * Ele ganha 20 de vermelho e mesmo assim ESCURECE, porque perdeu 10 de
   * verde e a Rec.709 pesa o verde 3,4× mais. Um medidor que repartisse
   * pelo ΔR o mandaria para `acendeu` e os DOIS baldes passariam a
   * mentir: o `apagou` perderia o pixel e o `acendeu` diluiria a tinta.
   */
  it('quem escurece com o VERMELHO subindo cai em `apagou` — o balde é da luminância', () => {
    // o Δlum do px 4, à mão: 0,2126·20 − 0,7152·10 = −2,90
    expect(0.2126 * 20 + 0.7152 * -10).toBeCloseTo(-2.9, 6);
    expect(c.apagou.n).toBe(2); // o achatado E o px 4
    expect(c.apagou.dR).toBe(5); // (−10 + 20)/2 — o ΔR do balde `apagou` é POSITIVO
    expect(c.apagou.dG).toBe(-10);
    expect(c.apagou.dB).toBe(-5);
    // e a cor do balde denuncia a discordância: o verde e o azul andaram
    // ao CONTRÁRIO do vermelho, e por isso saem negativos
    expect(c.apagou.corRGB).toEqual([1, -2, -1]);
    // e o px 4 NÃO foi parar do outro lado: repartir pelo ΔR daria
    // acendeu n=3 e dR médio 26,667, não estes dois números
    expect(c.acendeu.n).toBe(2);
    expect(c.acendeu.dR).toBe(30);
  });

  /**
   * O BALDE `apagou` TEM OS TRÊS DELTAS NEGATIVOS QUANDO A MUDANÇA É DE
   * DOSE, e é aí que uma normalização ingênua explode: dividir por
   * `max(ΣdR, 1e-9)` devolveria 1e13 em vez de 1. O quadro é só disto,
   * para que a leitura "mexeu na dose, não na tinta" tenha um pino limpo.
   */
  it('mudança de DOSE sai achatada (1:1:1) — e o balde negativo não explode', () => {
    const dose = medirCroma(png([[100, 100, 100]]), png([[90, 90, 90]]));
    expect(dose.apagou.n).toBe(1);
    expect(dose.apagou.dR).toBe(-10);
    expect(dose.apagou.corRGB).toEqual([1, 1, 1]);
  });

  /**
   * A FRAÇÃO GUARDA O SINAL, e é a diferença entre ler o fato e o oposto
   * dele. Até 25/08 a normalização era `|dG|/|dR|` e `|dB|/|dR|`: um azul
   * que CAIU enquanto o vermelho subia saía POSITIVO — a leitura era
   * "entrou azul" quando o azul tinha ido embora. Aqui o pixel acende no
   * vermelho e PERDE azul, e o relatório diz isso.
   */
  it('a fração guarda o SINAL: canal que anda ao contrário do R sai negativo', () => {
    const tinta = medirCroma(png([[10, 10, 100]]), png([[60, 30, 60]]));
    expect(tinta.acendeu.n).toBe(1);
    expect(tinta.acendeu.dR).toBe(50);
    expect(tinta.acendeu.dG).toBe(20);
    expect(tinta.acendeu.dB).toBe(-40);
    // com `Math.abs` por canal isto saía [1, 0,4, +0,8] — "entrou azul"
    expect(tinta.acendeu.corRGB).toEqual([1, 0.4, -0.8]);
  });

  /**
   * O LIMIAR é o terceiro argumento, e ele MOVE pixel de balde: com meio
   * nível o px 4 conta como apagado; com 5 níveis a Δlum de −2,90 já não
   * passa, e ele vira ruído de arredondamento. É este argumento que a
   * linha de comando passou a honrar.
   */
  it('o limiar reparte de verdade: subir a régua tira o pixel do balde', () => {
    const largo = medirCroma(antes, depois, 5);
    expect(largo.apagou.n).toBe(1); // só o achatado (Δlum −10) sobrevive
    expect(largo.apagou.dR).toBe(-10);
    expect(largo.acendeu.n).toBe(2); // os dois de tinta palha continuam
  });

  it('quadro sem cor ou de outro tamanho REPROVA — não devolve croma inventada', () => {
    expect(() => medirCroma(antes, png([[1, 1, 1]]))).toThrow(/tamanhos diferentes/);
    expect(() => medirCroma({ ...antes, canais: 1 }, depois)).toThrow(/sem cor/);
  });

  it('o pico é o pixel de maior ΔR, com as duas trincas inteiras', () => {
    expect(c.pico.x).toBe(2);
    expect(c.pico.y).toBe(0);
    expect(c.pico.dR).toBe(40);
    expect(c.pico.antes).toEqual([50, 50, 50]);
    expect(c.pico.depois).toEqual([90, 70, 54]);
  });

});

/**
 * A LINHA DE COMANDO — o encanamento, que é onde o defeito morava. Até
 * 25/08 o modo `croma` era o único dos cinco que ENGOLIA o 4º argumento
 * (`aneis` e `umbra` o liam), e nenhuma chamada de função pegava isso:
 * `medirCroma` sempre soube receber o limiar; quem não o passava era o
 * CLI. Um juiz que só chama a função nunca vê esse buraco, então este
 * bloco RODA o script.
 */
describe('a linha de comando do medidor', () => {
  const SCRIPT = fileURLToPath(new URL('./luz-ab.mjs', import.meta.url));

  it('o modo `croma` honra o 4º argumento `limiar`, como os outros modos', () => {
    const dir = mkdtempSync(join(tmpdir(), 'luz-ab-croma-'));
    try {
      const a = join(dir, 'antes.png');
      const b = join(dir, 'depois.png');
      // um quadro 2×1 chapado: o px 0 apaga FORTE (Δlum −10) e o px 1
      // apaga FRACO (Δ +20/−10/0, Δlum −2,90 — o px 4 do quadro de prova)
      writeFileSync(a, png(2, 1, () => [100, 100, 100]));
      writeFileSync(b, png(2, 1, (x) => (x === 0 ? [90, 90, 90] : [120, 90, 100])));
      const rodar = (...extra) =>
        JSON.parse(
          execFileSync(process.execPath, [SCRIPT, 'croma', a, b, ...extra], { encoding: 'utf8' })
        );
      expect(rodar().apagou.n).toBe(2); // padrão: meio nível, os dois entram
      expect(rodar('5').apagou.n).toBe(1); // régua de 5: o fraco não passa
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('medirUmbra — o buraco contra o chão ao lado', () => {
  /**
   * Um quadro 700×600 chapado em `fundo`, com um POÇO de meia-largura 6
   * em (200, 300). A meia-largura é 6 de propósito: é o alcance exato da
   * amostragem do varredor, então só o centro tem as 25 amostras dentro
   * do poço — o mínimo é ÚNICO e o teste sabe onde ele está.
   */
  const comPoco = (fundo, poco) => {
    const v = new Float32Array(700 * 600);
    v.fill(fundo);
    for (let y = 294; y <= 306; y++) for (let x = 194; x <= 206; x++) v[y * 700 + x] = poco;
    return v;
  };

  it('o varredor acha o ponto mais escuro do quadro, não um chute', () => {
    expect(nucleoMaisEscuro(comPoco(24, 2.76), 700, 600)).toEqual({ x: 200, y: 300 });
  });

  it('a janela é 17×17 e o vizinho fica a 220 px — o contraste sai daí', () => {
    const antes = comPoco(24, 2.76);
    const depois = comPoco(28, 2.8);
    const m = medirUmbra(antes, depois, 700, 600);
    expect(m.nucleo).toEqual({ x: 200, y: 300 });
    // 13×13 = 169 px de poço e 120 de fundo, nos 17×17 = 289 da janela
    expect(m.antes.media).toBe(+((169 * 2.76 + 120 * 24) / 289).toFixed(2));
    expect(m.antes.min).toBe(2.76);
    expect(m.vizinhoAntes.media).toBe(24); // a 220 px o poço já não alcança
    expect(m.contrasteAntes).toBe(+(24 / m.antes.media).toFixed(1));
    expect(m.contrasteDepois).toBe(+(28 / m.depois.media).toFixed(1));
  });

  /**
   * O NÚMERO QUE CONDENOU A LANTERNA SEM SOMBRA: com o fill de câmera
   * entrando na umbra, o núcleo fica MAIS CLARO que o chão ao lado e o
   * contraste cai abaixo de 1 — a totalidade sai do mapa.
   */
  it('uma lanterna que ACENDE a umbra derruba o contraste abaixo de 1', () => {
    const antes = comPoco(24, 2.76);
    const invertido = comPoco(30.45, 42.21);
    const m = medirUmbra(antes, invertido, 700, 600);
    expect(m.contrasteAntes).toBeGreaterThan(1);
    expect(m.contrasteDepois).toBeLessThan(1);
    expect(m.depois.media).toBeGreaterThan(m.vizinhoDepois.media);
  });

  it('o lado que ESCOLHE o ponto pode ser um terceiro quadro', () => {
    const chapado = new Float32Array(700 * 600).fill(24);
    const guia = comPoco(24, 2.76);
    // sem guia o quadro é chapado e o mínimo é o primeiro ponto varrido
    expect(nucleoMaisEscuro(chapado, 700, 600)).toEqual({ x: 120, y: 120 });
    expect(medirUmbra(chapado, chapado, 700, 600, guia).nucleo).toEqual({ x: 200, y: 300 });
  });
});

/**
 * A JANELA DECLARADA — a quem ela serve.
 *
 * Serve às LEGENDAS das pranchas do item 93: quando uma delas diz "a noite
 * do globo lê 122 bytes e a candidata a leva a 46", esse par de números tem
 * de ser refazível por quem abrir o PNG. A umbra ACHA o ponto; esta recebe
 * o ponto, e é só isso que as separa.
 */
describe('a janela declarada — o byte que uma legenda cita', () => {
  /**
   * O QUADRO DE PROVA É UMA RAMPA, e isso é o conserto de um dente que
   * não mordia. Até 26/08 esta mancha era um retângulo CHAPADO de 81×81
   * com a janela de 51×51 no meio dele: deslocar a leitura em 3 px, em 10
   * ou em 15 devolvia EXATAMENTE a mesma média, e a suíte inteira — 36 de
   * 36 — passava com o instrumento medindo o lugar errado. Só a partir de
   * 20 px a janela encostava na beira e alguém reclamava.
   *
   * Agora o valor dentro da mancha é `mancha × perfil(x, y)`, com o perfil
   * subindo 1 % por COLUNA e 0,25 % por LINHA: UM pixel de deslocamento em
   * qualquer eixo já muda a média. Multiplicativo, e não somado, por duas
   * razões — nenhum valor fica negativo (isto são bytes de tela), e a
   * RAZÃO entre os dois lados continua sendo a razão dos níveis, porque o
   * mesmo perfil cai nos dois. E o perfil é ímpar em torno de (200, 300),
   * então a média de uma janela centrada ali continua sendo o `mancha`
   * pedido — os números que estes casos citam não mudaram.
   */
  const RAMPA_X = 0.01;
  const RAMPA_Y = 0.0025;
  const perfil = (x, y) => 1 + (x - 200) * RAMPA_X + (y - 300) * RAMPA_Y;
  const comMancha = (fundo, mancha) => {
    const v = new Float32Array(700 * 600).fill(fundo);
    for (let y = 260; y <= 340; y++) {
      for (let x = 160; x <= 240; x++) v[y * 700 + x] = mancha * perfil(x, y);
    }
    return v;
  };

  it('mede os DOIS lados na MESMA janela, e a razão sai deles', () => {
    const m = medirJanela(comMancha(3, 121.86), comMancha(3, 45.97), 700, 600, 200, 300, 25);
    expect(m.janela).toEqual({ x: 200, y: 300, raio: 25, lado: 51 });
    // a média no centro é o nível pedido; min e max são os cantos da rampa
    // (±31,25 % do nível), e é por eles que a legenda sabe que não mediu
    // uma chapada
    expect(m.antes).toEqual({ media: 121.86, min: 83.78, max: 159.94, n: 2601 });
    expect(m.depois.media).toBe(45.97);
    expect(m.razao).toBe(+(45.97 / 121.86).toFixed(4));
  });

  /**
   * O DENTE DA POSIÇÃO — o que a mancha chapada não cobrava. Se o
   * instrumento ler 3 px ao lado do ponto que a legenda declara, a legenda
   * mente, e nenhum outro caso deste arquivo percebe.
   */
  it('a janela mede ONDE lhe mandam — 1 px de deslocamento já muda o número', () => {
    const v = comMancha(3, 100);
    expect(medirJanela(v, v, 700, 600, 200, 300, 25).antes.media).toBe(100);
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [3, 0], [0, 3], [-3, -3]]) {
      const m = medirJanela(v, v, 700, 600, 200 + dx, 300 + dy, 25).antes.media;
      expect(m, `${dx},${dy}`).not.toBe(100);
      expect(m, `${dx},${dy}`).toBe(arred(100 * perfil(200 + dx, 300 + dy), 2));
    }
  });

  /** o mínimo e o máximo existem para a legenda não vender uma média
   *  chapada onde há um degrau — a beira da mancha entra na janela */
  it('a janela que pega a beira DECLARA o degrau no min e no max', () => {
    const m = medirJanela(comMancha(3, 100), comMancha(3, 100), 700, 600, 230, 300, 25);
    expect(m.antes.min).toBe(3);
    // o canto mais alto da mancha que a janela alcança: (240, 325)
    expect(m.antes.max).toBe(arred(100 * perfil(240, 325), 2));
    expect(m.antes.max).toBe(146.25);
    expect(m.antes.media).toBeGreaterThan(3);
    expect(m.antes.media).toBeLessThan(146.25);
  });

  it('janela fora do quadro REPROVA em vez de recortar em silêncio', () => {
    const v = comMancha(3, 100);
    expect(() => medirJanela(v, v, 700, 600, 10, 300, 25)).toThrow(/fora do quadro/);
    expect(() => medirJanela(v, v, 700, 600, 200, 590, 25)).toThrow(/fora do quadro/);
  });

  it('a umbra continua sendo a MESMA conta, agora pela peça comum', () => {
    const v = comMancha(24, 2.76);
    const m = medirJanela(v, v, 700, 600, 200, 300, 8);
    expect(m.antes.media).toBe(2.76);
    expect(m.razao).toBe(1);
  });
});
