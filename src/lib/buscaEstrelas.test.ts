// ============================================================
// Gate da busca (Onda 5, F3) — julgado contra o DADO VIVO, o mesmo
// `public/data/stars_meta.json` que o runtime carrega. Nada de fixture
// inventada: se o build do catálogo trocar um nome, este arquivo é
// quem grita.
//
// O que se julga: normalização (acento, caixa, espaço, sobrescrito),
// prefixo, chave irmã (abreviação/nome pt-BR da letra grega), consulta
// numérica hd/hip por acesso direto, consulta vazia, limite, e a
// ORDENAÇÃO da rubrica de 4 degraus — sempre com a estrela cujo score
// menor a joga atrás de outras mais fracas em magnitude, que é onde
// uma busca ingênua erraria.
//
// MEDIDO ao escrever: nenhuma consulta única acende os 4 degraus neste
// dado (varredura sobre as 3.845 chaves de texto), porque um degrau
// EXATO só nasce de chave de uma palavra e essas não reaparecem como
// palavra interna de outra. Por isso a rubrica é provada em DOIS casos
// reais que se emendam: "ran" (exato > prefixo > parcial) e "tau"
// (prefixo > palavra interna > parcial).
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../three/config';
import { SCORE, buscar, construirIndice, normalizarConsulta } from './buscaEstrelas';

const meta = JSON.parse(
  readFileSync(new URL('../../public/data/stars_meta.json', import.meta.url), 'utf8')
) as { named: NamedStar[] };
const nomeadas = meta.named;
const indice = construirIndice(nomeadas);

const nomes = (consulta: string, limite?: number) =>
  buscar(consulta, indice, limite).map((r) => r.estrela.n);

describe('dado vivo', () => {
  it('as 1.726 nomeadas da Decisão 2 chegam inteiras', () => {
    expect(nomeadas.length).toBe(1726);
    // uma identidade de catálogo por estrela, sem colisão: o Map direto
    // só é lícito porque hd/hip são únicos no alcance da D4
    expect(indice.porCatalogo.size).toBe(
      nomeadas.filter((s) => s.hd !== undefined).length +
        nomeadas.filter((s) => s.hip !== undefined).length
    );
  });

  it('o índice devolvido aponta para a estrela certa da array', () => {
    for (const r of buscar('tau', indice, 20)) {
      expect(nomeadas[r.indice]).toBe(r.estrela);
    }
  });
});

describe('normalização (teclado pt-BR)', () => {
  it('acento, caixa e espaço não separam a mesma estrela', () => {
    expect(nomes('Tupã')).toEqual(['Tupã']);
    expect(nomes('tupa')).toEqual(['Tupã']);
    expect(nomes('  TUPÃ  ')).toEqual(['Tupã']);
  });

  it('macron e circunflexo do catálogo caem no ASCII que se digita', () => {
    expect(nomes('bibha')).toEqual(['Bibhā']); // Bibhā
    expect(nomes('lusitania')).toEqual(['Lusitânia']);
    expect(nomes('ananuca')).toEqual(['Añañuca']); // o ñ decompõe e o til cai junto
    expect(nomes('anhanhuca')).toEqual([]); // grafar o SOM em pt-BR já é outro nome
  });

  it('colapsa espaço e dobra o sobrescrito de Bayer', () => {
    expect(normalizarConsulta('  Alfa   CENTAURI ')).toBe('alfa centauri');
    expect(normalizarConsulta('γ² Vel')).toBe('γ2 vel');
  });
});

describe('texto', () => {
  it('prefixo acha antes de terminar de digitar', () => {
    expect(nomes('prox')).toEqual(['Proxima Centauri']);
    expect(nomes('kaus')).toEqual(['Kaus Australis', 'Kaus Media', 'Kaus Borealis']);
  });

  it('chave dupla: glifo grego, abreviação de catálogo e nome pt-BR da letra', () => {
    expect(nomes('γ² Vel')).toEqual(['γ² Vel']);
    expect(nomes('gam vel')).toEqual(['γ² Vel']); // abreviação HYG
    expect(nomes('gama vel')).toEqual(['γ² Vel']); // como um brasileiro digita
    expect(nomes('alfa mus')).toEqual(['α Mus']);
    expect(nomes('tau cet')).toEqual(['τ Cet']);
  });

  it('a designação Gliese também é porta de entrada', () => {
    expect(nomes('gl 244')).toEqual(['Sirius', 'Sirius B']);
  });

  it('SURPRESA DO DADO: sem α Cen — o nome próprio expulsa o Bayer', () => {
    // `named` guarda UM nome por estrela; quando a IAU deu nome próprio,
    // a designação de Bayer não existe no dado e nenhuma chave irmã pode
    // ser fabricada (não há coluna `con`). "alfa cen" não acha nada;
    // quem procura α Cen tem de digitar "rigil" (ou "prox" para a C).
    expect(nomes('alfa cen')).toEqual([]);
    expect(nomes('rigil')).toEqual(['Rigil Kentaurus']);
  });

  it('consulta vazia ou só espaço não devolve nada', () => {
    expect(buscar('', indice)).toEqual([]);
    expect(buscar('   ', indice)).toEqual([]);
  });

  it('o limite é respeitado (8 por omissão)', () => {
    expect(buscar('tau', indice, 5)).toHaveLength(5);
    expect(buscar('tau', indice)).toHaveLength(8);
    expect(buscar('tau', indice, 500).length).toBe(78);
  });
});

describe('consulta numérica por acesso direto', () => {
  it('hd e hip acham Sirius com e sem espaço, em qualquer caixa', () => {
    expect(nomes('hd 48915')).toEqual(['Sirius']);
    expect(nomes('hd48915')).toEqual(['Sirius']);
    expect(nomes('HD 48915')).toEqual(['Sirius']);
    expect(nomes('hip 32349')).toEqual(['Sirius']);
    expect(nomes('hip32349')).toEqual(['Sirius']);
    expect(nomes('hd 0048915')).toEqual(['Sirius']); // zero à esquerda cai fora
  });

  it('número incompleto ou fora do alcance não acende nada (contrato da D4)', () => {
    expect(nomes('hd 4891')).toEqual([]); // sem varredura: só o número inteiro
    expect(nomes('hip 1')).toEqual([]);
  });
});

describe('rubrica de 4 degraus', () => {
  it('"ran": exato > prefixo > parcial, e Aldebaran fica atrás apesar do brilho', () => {
    const r = buscar('ran', indice, 8);
    expect(r.map((x) => `${x.estrela.n} ${x.score}`)).toEqual([
      `Ran ${SCORE.exato}`,
      `Rana ${SCORE.prefixo}`,
      `Rangifer ${SCORE.prefixo}`,
      `Aldebaran ${SCORE.parcial}`,
      `Bharani ${SCORE.parcial}`,
      `Tarandus ${SCORE.parcial}`,
      `Quadrans ${SCORE.parcial}`,
      `Quadrans B ${SCORE.parcial}`,
    ]);
    // o desempate por magnitude só vale DENTRO do degrau: Aldebaran
    // (m 0,87) é de longe a mais brilhante e mesmo assim vem depois de
    // Rangifer (m 5,22), que casou por prefixo
    expect(r[2].estrela.m).toBeGreaterThan(r[3].estrela.m);
  });

  it('"tau": prefixo > palavra interna > parcial, com Rigil Kentaurus no fim', () => {
    const r = buscar('tau', indice, 500);
    const degraus = [...new Set(r.map((x) => x.score))];
    expect(degraus).toEqual([SCORE.prefixo, SCORE.palavra, SCORE.parcial]);
    expect(r[0].estrela.n).toBe('τ Pup'); // "τ Pup" → chave irmã "tau pup"
    expect(r.find((x) => x.score === SCORE.palavra)?.estrela.n).toBe('ο Tau');
    // a terceira estrela mais brilhante do céu é a ÚLTIMA da lista:
    // "tau" só aparece dentro de "kentaurus"
    expect(r.at(-2)?.estrela.n).toBe('Rigil Kentaurus');
    expect(r.at(-1)?.estrela.n).toBe('Proxima Centauri');
  });

  it('cada degrau vale a mesma coisa para a mesma estrela, venha da chave que vier', () => {
    // "τ Cet" casa por prefixo pela chave irmã "tau cet" e por exato
    // quando o visitante digita a designação inteira
    expect(buscar('tau cet', indice)[0].score).toBe(SCORE.exato);
    expect(buscar('τ Cet', indice)[0].score).toBe(SCORE.exato);
    expect(buscar('cet', indice, 500).find((x) => x.estrela.n === 'τ Cet')?.score).toBe(
      SCORE.palavra
    );
  });
});
