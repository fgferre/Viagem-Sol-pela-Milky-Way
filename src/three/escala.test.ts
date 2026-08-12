// ============================================================
// O oráculo do cadastro de escala. Três coisas, e a terceira é a que
// dá valor às outras duas:
//
//  1. ESPELHOS — os números que moram em arquivos que importam three
//     entram no cadastro copiados; aqui se confere a cópia contra a
//     fonte, por varredura TEXTUAL (o molde de `selo.test.ts`). Uma
//     casa decimal movida do outro lado quebra o teste, não a tela.
//
//  2. COMPLETUDE — todo arquivo que CONFESSA escala artística num
//     comentário tem de ter entrada no cadastro. É o que impede a
//     próxima escala inventada de nascer calada, que foi exatamente
//     como a do Sol nasceu.
//
//  3. A REGRA + a dívida — corpo (escreve profundidade) tem de ter
//     fator 1; quem não tem, tem de ter a fase que paga escrita em
//     `DIVIDAS_ABERTAS`. Quando a F3 e a F5 entrarem, a entrada some da
//     tabela e este teste passa a EXIGIR o fator 1 sozinho: o oráculo
//     aperta sem ninguém lembrar de apertá-lo.
//
// PROVA DE SABOTAGEM (a exigência que separa gate de decoração): cada
// varredura e cada regra tem um caso que a sabota de propósito e cobra
// vermelho. Uma varredura com o padrão podre passa calada, e foi assim
// que o registro do doador envelheceu mentindo.
// ============================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { WORLD } from './config';
import {
  CADASTRO_DE_ESCALA,
  DIVIDAS_ABERTAS,
  ESPELHO_COEF_CLARAO_PC,
  ESPELHO_ESCALA_COMPLEXO,
  ESPELHO_ESCALA_NUVEM_CO,
  ESPELHO_RS_SGR_A_PC,
  MASSA_SGR_A_MSOL,
  RAIO_SOL_KM,
  RAIO_SOL_PC,
  acusacaoDaEscala,
  culpadosDaEscala,
  deveDivida,
  fatorEmTexto,
  kmParaPc,
  raioDeSchwarzschildPc,
  type EscalaDeclarada,
} from './escala';

const ler = (caminhoDoRepo: string) =>
  readFileSync(new URL(`../../${caminhoDoRepo}`, import.meta.url), 'utf8');

/** o arquivo de um endereço "src/a/b.ts:12" */
const arquivoDe = (endereco: string) => endereco.split(':')[0];

// ------------------------------------------------------------
describe('1. os espelhos batem com a fonte', () => {
  it('RS de Sgr A✱ — world/blackHole.ts', () => {
    const m = ler('src/three/world/blackHole.ts').match(/const RS_PC = ([\d.]+);/);
    expect(m, 'a varredura do RS_PC perdeu o padrão').not.toBeNull();
    expect(Number(m![1])).toBe(ESPELHO_RS_SGR_A_PC);
  });

  it('coeficiente do clarão — world/heroStars.ts', () => {
    const m = ler('src/three/world/heroStars.ts').match(
      /const size = ([\d.]+) \* lum;/
    );
    expect(m, 'a varredura do clarão perdeu o padrão').not.toBeNull();
    expect(Number(m![1])).toBe(ESPELHO_COEF_CLARAO_PC);
  });

  it('escalas das nuvens — world/observedClouds.ts', () => {
    const fonte = ler('src/three/world/observedClouds.ts');
    const co = fonte.match(/const CO_RADIUS_SCALE = ([\d.]+);/);
    const grande = fonte.match(/const LARGE_RADIUS_SCALE = ([\d.]+);/);
    expect(co, 'a varredura de CO_RADIUS_SCALE perdeu o padrão').not.toBeNull();
    expect(grande, 'a varredura de LARGE_RADIUS_SCALE perdeu o padrão').not.toBeNull();
    expect(Number(co![1])).toBe(ESPELHO_ESCALA_NUVEM_CO);
    expect(Number(grande![1])).toBe(ESPELHO_ESCALA_COMPLEXO);
  });

  it('a massa de Sgr A✱ é a que o cabeçalho do shader declara', () => {
    // "(4,15e6 M☉)" no comentário — vírgula decimal, como a casa escreve
    expect(ler('src/three/world/blackHole.ts')).toContain('4,15e6 M☉');
    expect(MASSA_SGR_A_MSOL).toBe(4.15e6);
  });

  it('o raio do Sol NÃO é espelho: sai de WORLD, a fonte única', () => {
    const sol = CADASTRO_DE_ESCALA.find((e) => e.id === 'sol')!;
    expect(sol.fator).toBe(WORLD.sunRadius / RAIO_SOL_PC);
  });
});

// ------------------------------------------------------------
describe('2. completude — quem confessa tem de estar no cadastro', () => {
  // Os arquivos que a casa já sabe que inventam escala. A varredura
  // abaixo os REDESCOBRE pelo texto; esta lista existe só para provar
  // que ela funciona (o defeito clássico: padrão podre, zero achados,
  // teste verde).
  const CONFESSAM = [
    'src/three/config.ts',
    'src/three/world/blackHole.ts',
    'src/three/world/observedClouds.ts',
  ];

  const VARREDURA = /art[íi]stic[ao]/i;

  it('a varredura acha confissão de verdade — um padrão quebrado passaria calado', () => {
    for (const arquivo of CONFESSAM) {
      expect(VARREDURA.test(ler(arquivo)), `a varredura perdeu ${arquivo}`).toBe(true);
    }
  });

  it('todo arquivo que confessa escala artística tem entrada no cadastro', () => {
    const cadastrados = new Set(CADASTRO_DE_ESCALA.map((e) => arquivoDe(e.endereco)));
    for (const arquivo of CONFESSAM) {
      expect(
        cadastrados.has(arquivo),
        `${arquivo} confessa escala artística e não tem entrada em CADASTRO_DE_ESCALA`
      ).toBe(true);
    }
  });

  it('todo endereço do cadastro aponta para arquivo que existe', () => {
    for (const e of CADASTRO_DE_ESCALA) {
      expect(() => ler(arquivoDe(e.endereco)), `${e.id}: ${e.endereco}`).not.toThrow();
    }
  });

  it('nenhuma entrada sem razão escrita — o cadastro não aceita adjetivo vazio', () => {
    for (const e of CADASTRO_DE_ESCALA) {
      expect(e.razao.length, `${e.id} sem razão`).toBeGreaterThan(30);
      expect(e.nome.length, `${e.id} sem nome`).toBeGreaterThan(0);
    }
  });

  it('ids únicos', () => {
    const ids = CADASTRO_DE_ESCALA.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ------------------------------------------------------------
describe('3. a regra: quem escreve profundidade tem raio real', () => {
  it('todo corpo em dívida tem a fase que a paga escrita', () => {
    for (const e of CADASTRO_DE_ESCALA.filter(deveDivida)) {
      expect(
        DIVIDAS_ABERTAS[e.id],
        `${e.id} está em dívida e não tem fase declarada em DIVIDAS_ABERTAS`
      ).toBeTruthy();
    }
  });

  it('nenhuma dívida órfã — entrada que sobra vira mentira ao contrário', () => {
    const emDivida = new Set(CADASTRO_DE_ESCALA.filter(deveDivida).map((e) => e.id));
    for (const id of Object.keys(DIVIDAS_ABERTAS)) {
      expect(
        emDivida.has(id),
        `${id} tem dívida declarada mas o cadastro diz que o fator já é 1 — apague a entrada`
      ).toBe(true);
    }
  });

  it('instrumento nunca entra na acusação — ele é óptica, não corpo', () => {
    for (const e of culpadosDaEscala()) expect(e.classe).toBe('corpo');
  });

  // PROVA DE SABOTAGEM: sem ela as três acima são decoração.
  it('SABOTAGEM — um corpo inflado sem dívida declarada TEM de reprovar', () => {
    const sabotado: EscalaDeclarada = {
      id: 'planeta-x',
      nome: 'Planeta X',
      classe: 'corpo',
      fator: 12,
      endereco: 'src/three/config.ts:9',
      razao: 'inflado de propósito para provar que o gate morde de verdade',
    };
    expect(deveDivida(sabotado)).toBe(true);
    expect(DIVIDAS_ABERTAS[sabotado.id]).toBeUndefined();
  });

  it('SABOTAGEM — corpo que não sabe o próprio raio real também deve dívida', () => {
    const semReal: EscalaDeclarada = {
      id: 'corpo-sem-medida',
      nome: 'corpo sem medida',
      classe: 'corpo',
      fator: null,
      endereco: 'src/three/config.ts:9',
      razao: 'um corpo que não sabe o próprio tamanho é pior que um que sabe e mente',
    };
    expect(deveDivida(semReal)).toBe(true);
  });

  it('um corpo honesto (fator 1) sai da acusação sozinho', () => {
    const honesto: EscalaDeclarada = {
      id: 'terra',
      nome: 'Terra',
      classe: 'corpo',
      fator: 1,
      endereco: 'src/three/world/corpos/terra.ts:98',
      razao: 'raio equatorial do kernel da NASA, sem fator nenhum — a régua da casa',
    };
    expect(deveDivida(honesto)).toBe(false);
  });
});

// ------------------------------------------------------------
describe('4. os números, pinados', () => {
  it('o raio do Sol em pc é o que o config.ts:8 chamou de invisível', () => {
    expect(RAIO_SOL_PC).toBeCloseTo(2.256684e-8, 14);
    expect(kmParaPc(RAIO_SOL_KM)).toBe(RAIO_SOL_PC);
  });

  it('o Sol da cena está 487.441× maior', () => {
    const sol = CADASTRO_DE_ESCALA.find((e) => e.id === 'sol')!;
    expect(Math.round(sol.fator!)).toBe(487_441);
  });

  it('Sgr A✱ está 125.884× maior, e o real SAI DA MASSA', () => {
    const bh = CADASTRO_DE_ESCALA.find((e) => e.id === 'sgr-a')!;
    expect(raioDeSchwarzschildPc(MASSA_SGR_A_MSOL)).toBeCloseTo(3.971895e-7, 13);
    expect(Math.round(bh.fator!)).toBe(125_884);
  });

  it('o clarão de Sirius é ~5,7 milhões de vezes o raio dela', () => {
    const clarao = CADASTRO_DE_ESCALA.find((e) => e.id === 'clarao-estelar')!;
    expect(clarao.fator!).toBeGreaterThan(5.6e6);
    expect(clarao.fator!).toBeLessThan(5.8e6);
    expect(clarao.classe).toBe('instrumento');
  });

  it('a acusação vai do pior para o melhor', () => {
    const f = culpadosDaEscala().map((e) => e.fator!);
    expect(f).toEqual([...f].sort((a, b) => b - a));
  });
});

// ------------------------------------------------------------
describe('5. a copy que o visitante lê', () => {
  it('fator em pt-BR: milhar com ponto, decimal com vírgula', () => {
    expect(fatorEmTexto(487_441)).toBe('487.441×');
    expect(fatorEmTexto(2.1)).toBe('2,1×');
    expect(fatorEmTexto(1.2)).toBe('1,2×');
  });

  it('fator ausente vira palavra honesta, nunca número inventado', () => {
    expect(fatorEmTexto(null)).toBe('raio de autor');
    expect(fatorEmTexto(NaN)).toBe('raio de autor');
    expect(fatorEmTexto(Infinity)).toBe('raio de autor');
  });

  it('a acusação nomeia o culpado e o fator', () => {
    const linhas = acusacaoDaEscala();
    expect(linhas[0]).toBe('Sol está 487.441× maior');
    expect(linhas[1]).toBe('Sagittarius A✱ está 125.884× maior');
    expect(linhas).toHaveLength(2);
  });
});
