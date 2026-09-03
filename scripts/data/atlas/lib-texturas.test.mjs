// Serve: chão — a escada de texturas nunca faz upscale, o host fica na allowlist do item 13 e o webp só sobrevive mais leve
// ============================================================
// Oráculos das decisões puras do pipeline de texturas (Onda 6,
// F2a). Cada bloco pina uma lição do checklist pré-fusão ou do
// desenho D4 — os pontos exatos onde o doador se machucou.
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  alturaProporcional,
  analisarNomeDeTextura,
  degrausDaEscada,
  hostPermitido,
  preencherVazioSemDado,
  webpCompensa,
} from './lib-texturas.mjs';

describe('degrausDaEscada (emenda T-E7: reamostragem declarada, nunca upscale)', () => {
  it('desce a escada inteira declarada no desenho', () => {
    expect(degrausDaEscada(8192)).toEqual([4096, 2048, 1024]);
    expect(degrausDaEscada(4096)).toEqual([2048, 1024]);
    expect(degrausDaEscada(2048)).toEqual([1024]);
  });

  it('nunca gera upscale nem degrau igual à fonte', () => {
    expect(degrausDaEscada(1024)).toEqual([]);
    expect(degrausDaEscada(512)).toEqual([]);
    // fonte "quase 4k" (o 8k_jupiter do doador tem 4096; um
    // hipotético 4095 só desce para 2048/1024)
    expect(degrausDaEscada(4095)).toEqual([2048, 1024]);
  });

  it('recusa largura não medida (a armadilha do nome)', () => {
    expect(() => degrausDaEscada(Number.NaN)).toThrow(/inválida/);
    expect(() => degrausDaEscada(0)).toThrow(/inválida/);
    expect(() => degrausDaEscada('8k')).toThrow(/inválida/);
  });
});

describe('alturaProporcional (placas não-2:1, ex.: anel 8192×500)', () => {
  it('mantém a proporção da fonte', () => {
    expect(alturaProporcional(8192, 4096, 2048)).toBe(1024);
    expect(alturaProporcional(8192, 500, 4096)).toBe(250);
  });

  it('nunca cai a zero', () => {
    expect(alturaProporcional(8192, 3, 1024)).toBe(1);
  });
});

describe('analisarNomeDeTextura (vocabulário fechado corpo/canal)', () => {
  it('reconhece fonte e variante', () => {
    expect(analisarNomeDeTextura('map.jpg')).toEqual({
      canal: 'map',
      largura: null,
      extensao: 'jpg',
      ehFonte: true,
    });
    expect(analisarNomeDeTextura('night_2048.jpg')).toMatchObject({
      canal: 'night',
      largura: 2048,
      ehFonte: false,
    });
  });

  it('webp nunca é fonte (é sempre derivado do jpg/png irmão)', () => {
    expect(analisarNomeDeTextura('map.webp').ehFonte).toBe(false);
    expect(analisarNomeDeTextura('map_4096.webp').ehFonte).toBe(false);
  });

  it('lança em canal desconhecido ou nome fora do vocabulário', () => {
    expect(() => analisarNomeDeTextura('albedo.jpg')).toThrow(/desconhecido/);
    expect(() => analisarNomeDeTextura('8k_earth_daymap.jpg')).toThrow(
      /fora do vocabulário/
    );
    expect(() => analisarNomeDeTextura('map.tif')).toThrow(/fora do vocabulário/);
  });
});

describe('hostPermitido (item 13: redirect só dentro da allowlist)', () => {
  it('aceita as fontes documentadas', () => {
    expect(
      hostPermitido('https://www.solarsystemscope.com/textures/download/8k_moon.jpg')
    ).toBe(true);
    expect(hostPermitido('https://web.archive.org/web/2024/x.tif')).toBe(true);
    expect(hostPermitido('https://astrogeology.usgs.gov/x')).toBe(true);
  });

  it('recusa host estranho e http puro', () => {
    expect(hostPermitido('https://evil.example.com/8k_moon.jpg')).toBe(false);
    // sufixo parecido não engana o casamento por domínio
    expect(hostPermitido('https://notsolarsystemscope.com/x.jpg')).toBe(false);
    expect(hostPermitido('http://www.solarsystemscope.com/x.jpg')).toBe(false);
  });
});

describe('webpCompensa (item 17: guarda de pessimização)', () => {
  it('só mantém webp estritamente menor', () => {
    expect(webpCompensa(1000, 999)).toBe(true);
    expect(webpCompensa(1000, 1000)).toBe(false);
    expect(webpCompensa(1000, 1001)).toBe(false);
  });
});

describe('preencherVazioSemDado (item 147: o hemisfério que a Voyager não viu)', () => {
  // 64×32, 3 canais: metade norte PRETA (o vazio), metade sul cinza 120
  // com uma sombra de cratera 3×3 e uma língua do vazio 24×6 que invade
  // o sul — a borda dentada que os mapas reais têm.
  function mapa() {
    const largura = 64;
    const altura = 32;
    const px = Buffer.alloc(largura * altura * 3, 0);
    for (let j = 16; j < altura; j += 1) {
      for (let i = 0; i < largura; i += 1) px.fill(120, (j * largura + i) * 3, (j * largura + i) * 3 + 3);
    }
    for (let j = 16; j < 22; j += 1) for (let i = 20; i < 44; i += 1) px.fill(0, (j * largura + i) * 3, (j * largura + i) * 3 + 3);
    for (let j = 26; j < 29; j += 1) for (let i = 8; i < 11; i += 1) px.fill(0, (j * largura + i) * 3, (j * largura + i) * 3 + 3);
    return { px, largura, altura };
  }
  const em = (px, largura, i, j) => px[(j * largura + i) * 3];

  it('tapa o vazio grande com o tom médio do que tem dado e deixa a sombra pequena', () => {
    const { px, largura, altura } = mapa();
    const conta = preencherVazioSemDado(px, largura, altura, 3);
    expect(conta.tom).toEqual([120, 120, 120]);
    expect(em(px, largura, 5, 5)).toBe(120); // o norte inteiro
    expect(em(px, largura, 30, 19)).toBe(120); // a língua que invadia o sul
    expect(em(px, largura, 9, 27)).toBe(0); // a sombra de cratera fica
    expect(conta.preenchidos).toBe(conta.semDado - 9);
  });

  it('não toca um mapa sem vazio', () => {
    const { px, largura, altura } = mapa();
    px.fill(120);
    const antes = Buffer.from(px);
    const conta = preencherVazioSemDado(px, largura, altura, 3);
    expect(conta.preenchidos).toBe(0);
    expect(px.equals(antes)).toBe(true);
  });
});
