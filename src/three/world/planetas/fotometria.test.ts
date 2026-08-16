// ============================================================
// Régua 1 da D10, parte "a fotometria": as duas leis puras e a tabela
// de 10 corpos, julgadas pelo que é AFIRMÁVEL.
//
// O QUE ESTE TESTE NÃO FAZ, de propósito: não confere valores de cor
// contra número nenhum. Cor é calibração — a ORDEM DOS CANAIS é que é
// física, e é ela que quebra se alguém trocar uma linha da tabela por
// um chute bonito. Marte tem de sair vermelho, Urano e Netuno ciano, a
// Terra mais azul que o iluminante. Isso o teste cobra.
//
// O QUE ELE CONGELA: os nove `aMagBase` com 12 dígitos. Não é
// preciosismo — `aMagBase = H + 5·log10(r_UA)` é o único número que
// atravessa a fronteira dado→shader, e ele carrega a EFEMÉRIDE dentro
// (o r vem do retrato). Um pino de 12 dígitos pega qualquer troca de
// H, de época ou de tabela.
// ============================================================

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { bvToColor } from '../../shaders/common';
import { catalogApparentMag } from '../lodStellar';
import { SOL_BV } from '../clarao';
import {
  A_MAG_BASE,
  BV_SOL,
  COR_SOLAR_LINEAR,
  FOTOMETRIA,
  IDS_FOTOMETRIA,
  DOMINIO_MH18,
  aMagBaseDe,
  betaEfetivoAnel,
  deltaMagMh18,
  faseLambertiana,
  fatorDeFaseMh18,
  magAparente,
  magAparenteEstelar,
} from './fotometria';
import { IDS_RETRATO, RETRATO_2026 } from './retrato2026';

describe('fotometria — a tabela dos 10', () => {
  it('cobre o Sol e os nove do retrato, sem sobra e sem falta', () => {
    expect(Object.keys(FOTOMETRIA)).toEqual([...IDS_FOTOMETRIA]);
    expect(IDS_FOTOMETRIA).toHaveLength(10);
    expect(IDS_FOTOMETRIA[0]).toBe('sun');
  });

  it('só o Sol tem lei estelar; os nove planetas têm lei planetária', () => {
    expect(FOTOMETRIA.sun.lei).toBe('estelar');
    for (const id of IDS_RETRATO) expect(FOTOMETRIA[id].lei).toBe('planetaria');
  });

  it('o canal V da razão de banda vale 1 em todos — é a normalização', () => {
    for (const id of IDS_FOTOMETRIA) expect(FOTOMETRIA[id].razaoBanda[1]).toBe(1);
  });

  it('a cor é o iluminante vezes a razão de banda, e o Sol É o iluminante', () => {
    expect(COR_SOLAR_LINEAR).toEqual(bvToColor(BV_SOL));
    expect(FOTOMETRIA.sun.corLinear).toEqual(COR_SOLAR_LINEAR);
    for (const id of IDS_FOTOMETRIA) {
      const { razaoBanda, corLinear } = FOTOMETRIA[id];
      for (let k = 0; k < 3; k++) {
        expect(corLinear[k]).toBeCloseTo(COR_SOLAR_LINEAR[k] * razaoBanda[k], 15);
      }
    }
  });

  it('o B−V do Sol é o MESMO número de clarao.ts, sem redigitação divergente', () => {
    // O SOL_BV morava em heroStars.ts (morto no M2) e mudou-se para a
    // camada do clarão, agora EXPORTADO — a igualdade vira import, não
    // regex sobre o fonte.
    expect(SOL_BV).toBe(BV_SOL);
  });
});

/**
 * A ordem dos canais, corpo a corpo. Cada linha é uma afirmação
 * FÍSICA sobre a superfície ou a atmosfera, não sobre estética.
 */
describe('fotometria — a ORDEM dos canais de cor é a física', () => {
  const ordem = (id: string) => {
    const [r, g, b] = FOTOMETRIA[id].corLinear;
    return { r, g, b };
  };

  it('Marte: r > g > b — o óxido de ferro, a maior separação da tabela', () => {
    const { r, g, b } = ordem('mars');
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    // e a separação é grande: o vermelho tem mais que o triplo do azul
    expect(r / b).toBeGreaterThan(3);
  });

  it('Urano e Netuno: b > g > r — o metano come o vermelho', () => {
    for (const id of ['uranus', 'neptune']) {
      const { r, g, b } = ordem(id);
      expect(b).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(r);
    }
    // Netuno é o mais azul dos dois (b/r maior)
    const u = ordem('uranus');
    const n = ordem('neptune');
    expect(n.b / n.r).toBeGreaterThan(u.b / u.r);
  });

  it('Terra: b > r — o ponto azul pálido, mais azul que o iluminante', () => {
    const { r, b } = ordem('earth');
    expect(b).toBeGreaterThan(r);
    expect(b / r).toBeGreaterThan(COR_SOLAR_LINEAR[2] / COR_SOLAR_LINEAR[0]);
  });

  it('Mercúrio, Vênus, Júpiter, Saturno e Plutão: r > b — todos quentes', () => {
    for (const id of ['mercury', 'venus', 'jupiter', 'saturn', 'pluto']) {
      const { r, b } = ordem(id);
      expect(r).toBeGreaterThan(b);
    }
  });

  it('Vênus é o mais neutro dos quentes; Marte e Saturno os mais saturados', () => {
    const razao = (id: string) => ordem(id).r / ordem(id).b;
    expect(razao('venus')).toBeLessThan(razao('mercury'));
    expect(razao('venus')).toBeLessThan(razao('saturn'));
    expect(razao('mars')).toBeGreaterThan(razao('saturn'));
  });

  it('nenhum canal é negativo ou absurdo', () => {
    for (const id of IDS_FOTOMETRIA) {
      for (const c of FOTOMETRIA[id].corLinear) {
        expect(c).toBeGreaterThan(0);
        expect(c).toBeLessThan(4);
      }
    }
  });
});

/**
 * `aMagBase` pinado com 12 dígitos. Os valores foram MEDIDOS desta
 * tabela contra este retrato (2026-08-11); qualquer troca de H, de
 * época ou de efemerides.bin muda um deles e acende aqui.
 */
describe('fotometria — aMagBase pinado (H da tabela + r da efeméride)', () => {
  const PINOS: Record<string, string> = {
    mercury: '-2.28721468893',
    venus: '-5.07526233191',
    earth: '-4.02651088128',
    mars: '-0.826322768084',
    jupiter: '-5.81002258816',
    saturn: '-4.02114742775',
    uranus: '-0.660922391460',
    neptune: '0.377247760819',
    pluto: '7.19632310681',
  };

  for (const id of IDS_RETRATO) {
    it(`${id}: aMagBase = ${PINOS[id]}`, () => {
      expect(A_MAG_BASE[id].toPrecision(12)).toBe(PINOS[id]);
    });
  }

  it('a ordem de brilho intrínseco é a esperada: Júpiter lidera, Plutão fecha', () => {
    const porBrilho = [...IDS_RETRATO].sort((a, b) => A_MAG_BASE[a] - A_MAG_BASE[b]);
    expect(porBrilho[0]).toBe('jupiter');
    expect(porBrilho[porBrilho.length - 1]).toBe('pluto');
  });

  it('SENTINELA: a distância vem da EFEMÉRIDE — trocar r_UA muda aMagBase', () => {
    // Se alguém "simplificar" o aMagBase para uma constante por corpo,
    // ou trocar o r do retrato por um semi-eixo de livro, este teste é
    // o que acende. A lei é logarítmica: dobrar r custa +1,505 mag.
    for (const id of IDS_RETRATO) {
      const rReal = RETRATO_2026[id].rUA;
      const H = FOTOMETRIA[id].H;
      expect(aMagBaseDe(H, rReal)).toBe(A_MAG_BASE[id]);
      expect(aMagBaseDe(H, rReal * 2)).not.toBe(A_MAG_BASE[id]);
      expect(aMagBaseDe(H, rReal * 2) - aMagBaseDe(H, rReal)).toBeCloseTo(1.50515, 5);
    }
  });
});

describe('fotometria — a fase Lambertiana (APROXIMAÇÃO declarada)', () => {
  it('vale 1 exato em oposição e 0 exato em conjunção', () => {
    expect(faseLambertiana(0)).toBe(1);
    expect(faseLambertiana(Math.PI)).toBe(0);
    expect(faseLambertiana(Math.PI / 2)).toBe(0.5);
  });

  it('é monotônica não-crescente de 0 a π, sem degrau', () => {
    const N = 2000;
    let anterior = faseLambertiana(0);
    for (let i = 1; i <= N; i++) {
      const atual = faseLambertiana((i / N) * Math.PI);
      expect(atual).toBeLessThanOrEqual(anterior);
      expect(anterior - atual).toBeLessThan(0.002);
      anterior = atual;
    }
  });

  it('é simétrica: a fase só depende do cosseno do ângulo', () => {
    for (const a of [0.1, 0.7, 1.9, 3.0]) {
      expect(faseLambertiana(-a)).toBeCloseTo(faseLambertiana(a), 15);
    }
  });
});

describe('fotometria — magAparente', () => {
  it('mais longe é mais fraco: cresce com dObs, a 5 mag por década', () => {
    const base = A_MAG_BASE.jupiter;
    let anterior = magAparente(base, 0.5, 1);
    for (const d of [1, 2, 5, 10, 100, 1000, 12788]) {
      const m = magAparente(base, d, 1);
      expect(m).toBeGreaterThan(anterior);
      anterior = m;
    }
    expect(magAparente(base, 10, 1) - magAparente(base, 1, 1)).toBeCloseTo(5, 12);
  });

  it('a fase só pode escurecer: fator 1 não cobra nada, fator 0 apaga', () => {
    const base = A_MAG_BASE.mars;
    expect(magAparente(base, 3, 1)).toBe(magAparente(base, 3, 1));
    expect(magAparente(base, 3, 1)).toBeLessThan(magAparente(base, 3, 0.5));
    expect(magAparente(base, 3, 0)).toBe(Number.POSITIVE_INFINITY);
    // meia-fase custa exatamente 0,7526 mag (2,5·log10 2)
    expect(magAparente(base, 3, 0.5) - magAparente(base, 3, 1)).toBeCloseTo(0.752575, 6);
  });

  it('MEDIDO: a escada de brilho de Júpiter no domínio profundo', () => {
    // DIVERGÊNCIA MEDIDA CONTRA A PROSA DO DESENHO (registrada, não
    // silenciada). O desenho diz que na borda da janela deep (0,05 pc)
    // Júpiter tem "m ≈ 12,3" e que do piso do filme (0,062 pc) os
    // planetas ficam em "m ≈ 22". A fotometria de verdade, com o H de
    // [MH18] e o r desta efeméride, diz:
    //     1 500 UA        m = 10,07   (o "acende como pontinho" da D0)
    //     0,05 pc  (10 313 UA)  m = 14,26
    //     0,062 pc (12 788 UA)  m = 14,72   (piso do filme)
    // Ou seja: na BORDA DA JANELA o corpo é 2,0 mag mais fraco que o
    // desenho supunha (a conclusão da D3 — sub-limiar no corte, o
    // corte não pisca — fica mais forte, não mais fraca); no PISO DO
    // FILME ele é 7,3 mag mais brilhante que os "m ≈ 22" da prosa. O
    // filme continua intocado porque quem o protege é o GATE DE
    // VISIBILIDADE (`dHome < 0,05 pc`, abaixo do piso de 0,062), não a
    // magnitude. Quem escrever a camada (F3) tem de saber disso.
    expect(magAparente(A_MAG_BASE.jupiter, 1500, 1)).toBeCloseTo(10.0704, 4);
    expect(magAparente(A_MAG_BASE.jupiter, 10313.240312274016, 1)).toBeCloseTo(14.257, 3);
    expect(magAparente(A_MAG_BASE.jupiter, 12788.41798721978, 1)).toBeCloseTo(14.7241, 4);
  });
});

describe('fotometria — a lei estelar do Sol e o ponto-zero do campo', () => {
  it('m = M_V + 5·log10(d/10): 4,83 a 10 pc, +5 por década', () => {
    expect(magAparenteEstelar(4.83, 10)).toBeCloseTo(4.83, 12);
    expect(magAparenteEstelar(4.83, 100) - magAparenteEstelar(4.83, 10)).toBeCloseTo(5, 12);
  });

  it('PINADO: a lei do campo é 0,02 mag mais brilhante que M_V☉ = 4,83', () => {
    // `catalogApparentMag(0, d) = −0,15 + 5·log10(d)` = M_V☉ 4,85.
    // A diferença é CONSTANTE (não é deriva com a distância) e é este
    // pino que impede a discrepância de crescer sem ninguém ver.
    for (const dPc of [0.001, 0.01, 0.1, 1, 10, 100, 1000]) {
      const diferenca = magAparenteEstelar(4.83, dPc) - catalogApparentMag(0, dPc);
      expect(diferenca).toBeCloseTo(-0.02, 6);
    }
  });

  it('ACHADO para a F3: a lei do campo SATURA abaixo de 1e-3 pc = 206,26 UA', () => {
    // `catalogApparentMag` faz `Math.max(distPc, 1e-3)` — desenhado
    // para um campo de estrelas, onde 0,001 pc é uma distância que não
    // acontece. No domínio profundo da Onda 4 ela acontece o tempo
    // todo: 1e-3 pc são 206,26 UA, DENTRO da órbita de Netuno. Abaixo
    // disso a lei do campo congela e o Sol-ponto pararia de brilhar
    // enquanto o visitante se aproxima — exatamente na parte da
    // viagem que a onda existe para mostrar. Quem escrever o shader do
    // Sol-ponto (F3) precisa decidir o que fazer com esse piso; aqui
    // fica MEDIDO para não ser descoberto por acidente.
    expect(catalogApparentMag(0, 1e-3)).toBe(catalogApparentMag(0, 1e-6));
    expect(magAparenteEstelar(4.83, 1e-3)).toBeGreaterThan(magAparenteEstelar(4.83, 1e-6));
  });

  it('o Sol da tabela usa esse M_V publicado e não tem aMagBase', () => {
    expect(FOTOMETRIA.sun.H).toBe(4.83);
    expect(A_MAG_BASE).not.toHaveProperty('sun');
  });
});

describe('fotometria — MH18 (D10, domínio e costura)', () => {
  it('em α=0 e B=0 o fator é 1 (o H da tabela já é V(1,0))', () => {
    for (const id of Object.keys(DOMINIO_MH18)) {
      expect(fatorDeFaseMh18(id, 0), id).toBeCloseTo(1, 10);
      expect(deltaMagMh18(id, 0), id).toBeCloseTo(0, 12);
    }
  });

  it('Plutão e o Sol não têm MH18: devolvem Lambert', () => {
    const a = Math.PI / 3;
    expect(fatorDeFaseMh18('pluto', a)).toBeCloseTo(faseLambertiana(a), 12);
    expect(fatorDeFaseMh18('sun', a)).toBeCloseTo(faseLambertiana(a), 12);
  });

  it('na borda do domínio a emenda é C0 — razão pinada', () => {
    for (const [id, teto] of Object.entries(DOMINIO_MH18)) {
      const aRad = (teto * Math.PI) / 180;
      const dentro = fatorDeFaseMh18(id, aRad - 1e-9);
      const fora = fatorDeFaseMh18(id, aRad + 1e-9);
      expect(Math.abs(dentro - fora), id).toBeLessThan(1e-6);
    }
  });

  it('Saturno: o termo de anel move o fator com B, mesmo em α=0', () => {
    const semAnel = fatorDeFaseMh18('saturn', 0, 0);
    const comAnel = fatorDeFaseMh18('saturn', 0, 0.3);
    expect(semAnel).toBeCloseTo(1, 10);
    expect(comAnel).not.toBeCloseTo(1, 2);
  });

  it('Mercúrio no domínio é mais escuro que Lambert (regolito, não esfera lisa)', () => {
    const a = (30 * Math.PI) / 180;
    expect(fatorDeFaseMh18('mercury', a)).toBeLessThan(faseLambertiana(a));
  });

  it('os coeficientes do paper estão pinados — ×10 num termo reprova', () => {
    // cada esperado é a equação do paper escrita AQUI, não a função
    expect(deltaMagMh18('mercury', 10)).toBeCloseTo(
      6.328e-2 * 10 -
        1.6336e-3 * 100 +
        3.3644e-5 * 1000 -
        3.4265e-7 * 10_000 +
        1.6893e-9 * 100_000 -
        3.0334e-12 * 1_000_000,
      12
    );
    expect(deltaMagMh18('venus', 10)).toBeCloseTo(
      -1.044e-3 * 10 + 3.687e-4 * 100 - 2.814e-6 * 1000 + 8.938e-9 * 10_000,
      12
    );
    expect(deltaMagMh18('earth', 10)).toBeCloseTo(-1.06e-3 * 10 + 2.054e-4 * 100, 12);
    expect(deltaMagMh18('mars', 10)).toBeCloseTo(2.267e-2 * 10 - 1.302e-4 * 100, 12);
    expect(deltaMagMh18('jupiter', 10)).toBeCloseTo(-3.7e-4 * 10 + 6.16e-4 * 100, 12);
    expect(deltaMagMh18('saturn', 10, 0)).toBeCloseTo(0.026 * 10, 12);
    expect(deltaMagMh18('uranus', 10)).toBeCloseTo(6.587e-3 * 10 + 1.049e-4 * 100, 12);
    // [MH18] Eq. 17 — sem isto Netuno devolve 0 e o ponto dobra de brilho
    expect(deltaMagMh18('neptune', 10)).toBeCloseTo(7.944e-3 * 10 + 9.617e-5 * 100, 12);
    expect(deltaMagMh18('neptune', 90)).toBeCloseTo(7.944e-3 * 90 + 9.617e-5 * 8100, 12);
  });

  it('o domínio de Urano/Netuno é o da equação, não o α visto da Terra', () => {
    expect(DOMINIO_MH18.uranus).toBe(154);
    expect(DOMINIO_MH18.neptune).toBe(133);
    const a90 = Math.PI / 2;
    expect(fatorDeFaseMh18('neptune', a90)).toBeLessThan(faseLambertiana(a90) * 0.7);
  });

  it('Saturno: β efetiva é √(βE βS) de mesmo sinal, senão 0 [MH18] Eq. 10', () => {
    expect(betaEfetivoAnel(0.2, 0.2)).toBeCloseTo(0.2, 12);
    expect(betaEfetivoAnel(0.1, 0.4)).toBeCloseTo(Math.sqrt(0.04), 12);
    expect(betaEfetivoAnel(0.2, -0.2)).toBe(0);
    expect(betaEfetivoAnel(-0.2, -0.8)).toBeCloseTo(-Math.sqrt(0.16), 12);
    expect(betaEfetivoAnel(0, 0.3)).toBe(0);
  });
});

describe('fotometria — texto-fonte (D1, anti-relógio e fonte por linha)', () => {
  const fonte = readFileSync(new URL('./fotometria.ts', import.meta.url), 'utf8');

  it('não passa pela base galactocêntrica nem tem relógio', () => {
    expect(fonte).not.toContain('galactocentricToScene');
    expect(fonte).not.toContain('heliocentricaEclipticaUAParaBaseGalactocentricaPc');
    expect(fonte).not.toContain('Date.now');
    expect(fonte).not.toContain('new Date(');
  });

  it('cada corpo carrega fonte citada, e a política de domínio MH18 está dita', () => {
    for (const marca of ['[MH18]', '[MKP17]', '[R12]', '[SBDB]', '[RBF94]']) {
      expect(fonte).toContain(marca);
    }
    expect(fonte).toContain('emenda');
    expect(fonte).toContain('costura');
    expect(fonte).toContain('DOMINIO_MH18');
  });
});
