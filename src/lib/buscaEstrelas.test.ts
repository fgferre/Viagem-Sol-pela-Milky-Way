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
import {
  SCORE,
  buscar,
  chaveDeLink,
  chaveDoFoco,
  construirIndice,
  normalizarConsulta,
  resolverFoco,
} from './buscaEstrelas';
import type { CorpoBuscavel, EntradaDaBusca, ResultadoBusca } from './buscaEstrelas';
import { CORPOS_DO_SISTEMA } from '../three/atlasConfig';
import { RETRATO_2026 } from '../three/world/planetas/retrato2026';
import type { IdRetrato } from '../three/world/planetas/retrato2026';

const meta = JSON.parse(
  readFileSync(new URL('../../public/data/stars_meta.json', import.meta.url), 'utf8')
) as { named: NamedStar[] };
const nomeadas = meta.named;
const indice = construirIndice(nomeadas);

/**
 * A ESTRELA de um resultado. As seções abaixo desta linha julgam a busca
 * no CATÁLOGO, e o índice delas nasce sem corpos — então um resultado
 * que não seja estrela aqui é o próprio defeito, e o `throw` é o alarme.
 */
const est = (r: ResultadoBusca | null | undefined): NamedStar => {
  if (!r || r.entrada.tipo !== 'estrela') throw new Error('esperava uma estrela');
  return r.entrada.estrela;
};

/** a entrada de uma estrela, para quem chama `chaveDeLink` */
const daEstrela = (estrela: NamedStar): EntradaDaBusca => ({ tipo: 'estrela', estrela });

const nomes = (consulta: string, limite?: number) =>
  buscar(consulta, indice, limite).map((r) => est(r).n);

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
      expect(nomeadas[r.indice]).toBe(est(r));
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
    expect(r.map((x) => `${est(x).n} ${x.score}`)).toEqual([
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
    expect(est(r[2]).m).toBeGreaterThan(est(r[3]).m);
  });

  it('"tau": prefixo > palavra interna > parcial, com Rigil Kentaurus no fim', () => {
    const r = buscar('tau', indice, 500);
    const degraus = [...new Set(r.map((x) => x.score))];
    expect(degraus).toEqual([SCORE.prefixo, SCORE.palavra, SCORE.parcial]);
    expect(est(r[0]).n).toBe('τ Pup'); // "τ Pup" → chave irmã "tau pup"
    expect(est(r.find((x) => x.score === SCORE.palavra)).n).toBe('ο Tau');
    // a terceira estrela mais brilhante do céu é a ÚLTIMA da lista:
    // "tau" só aparece dentro de "kentaurus"
    expect(est(r.at(-2)).n).toBe('Rigil Kentaurus');
    expect(est(r.at(-1)).n).toBe('Proxima Centauri');
  });

  it('cada degrau vale a mesma coisa para a mesma estrela, venha da chave que vier', () => {
    // "τ Cet" casa por prefixo pela chave irmã "tau cet" e por exato
    // quando o visitante digita a designação inteira
    expect(buscar('tau cet', indice)[0].score).toBe(SCORE.exato);
    expect(buscar('τ Cet', indice)[0].score).toBe(SCORE.exato);
    expect(buscar('cet', indice, 500).find((x) => est(x).n === 'τ Cet')?.score).toBe(
      SCORE.palavra
    );
  });
});

// ============================================================
// O DEEP-LINK (`?foco=`). O gate de verdade é o primeiro teste: a
// ida-e-volta das 1.726, uma a uma. Uma colisão de chave — duas
// estrelas que o mesmo link resolve — apareceria ali e em lugar
// nenhum mais, e o sintoma no produto seria um link guardado que abre
// na estrela errada, sem erro nenhum.
// ============================================================
describe('a chave do link', () => {
  it('IDA E VOLTA nas 1.726: o link de cada estrela resolve NELA', () => {
    const erradas: string[] = [];
    for (const estrela of nomeadas) {
      const volta = resolverFoco(chaveDeLink(daEstrela(estrela)), indice);
      if (!volta || volta.entrada.tipo !== 'estrela' || volta.entrada.estrela !== estrela) {
        erradas.push(`${estrela.n} → ${volta ? est(volta).n : 'nada'}`);
      }
    }
    expect(erradas).toEqual([]);
  });

  it('prefere o catálogo, e só cai no nome quando não há nenhum', () => {
    const sirius = nomeadas.find((s) => s.n === 'Sirius')!;
    expect(chaveDeLink(daEstrela(sirius))).toBe('hd48915');
    // Proxima não tem HD; entra por HIP
    expect(chaveDeLink(daEstrela(nomeadas.find((s) => s.n === 'Proxima Centauri')!))).toBe(
      'hip70890'
    );
    // as 37 companheiras não têm catálogo nenhum: vão pelo próprio nome
    const semCatalogo = nomeadas.filter((s) => s.hd === undefined && s.hip === undefined);
    expect(semCatalogo.length).toBe(37);
    expect(chaveDeLink(daEstrela(semCatalogo[0]))).toBe(semCatalogo[0].n);
  });

  it('a porta aceita o que a caixa de busca aceita — inclusive escrita à mão', () => {
    expect(est(resolverFoco('hd 48915', indice)).n).toBe('Sirius');
    expect(est(resolverFoco('rigil', indice)).n).toBe('Rigil Kentaurus');
    expect(est(resolverFoco('gama vel', indice)).n).toBe('γ² Vel');
  });

  it('porta vazia ou sem correspondência devolve nada — nunca um palpite', () => {
    expect(resolverFoco('', indice)).toBeNull();
    expect(resolverFoco('   ', indice)).toBeNull();
    expect(resolverFoco('alfa cen', indice)).toBeNull();
    expect(resolverFoco('hd 4891', indice)).toBeNull();
  });
});

// ============================================================
// OS DEZ CORPOS DO SISTEMA no mesmo índice (conserto da revisão de
// olhos frescos). Até então o "Atlas navegável do sistema solar" tinha
// os dez desenhados e nenhum era alvo de nada: buscar "Netuno" caía no
// estado vazio. O dado vem do config único do Atlas — este arquivo não
// redigita nome nenhum, senão a divergência nasceria aqui.
// ============================================================
describe('os corpos do sistema entram no MESMO índice', () => {
  const corpos: readonly CorpoBuscavel[] = CORPOS_DO_SISTEMA.map((c) => ({
    id: c.id,
    nome: c.nome,
    classe: c.classe,
    rUA: c.id === 'sun' ? 0 : RETRATO_2026[c.id as IdRetrato].rUA,
  }));
  const comCorpos = construirIndice(nomeadas, corpos);

  it('são dez, e o índice cresce exatamente dez', () => {
    expect(corpos.length).toBe(10);
    expect(comCorpos.entradas.length).toBe(indice.entradas.length + 10);
    // as nomeadas continuam contadas à parte: é o número que a copy usa
    expect(comCorpos.nomeadas.length).toBe(1726);
  });

  it('cada um dos dez é achado pelo nome pt-BR, por degrau EXATO', () => {
    for (const c of corpos) {
      const r = buscar(c.nome, comCorpos, 8)[0];
      expect(r?.score, c.nome).toBe(SCORE.exato);
      expect(r.entrada.tipo, c.nome).toBe('corpo');
      expect(r.entrada.tipo === 'corpo' && r.entrada.corpo.id, c.nome).toBe(c.id);
    }
  });

  it('sem acento e com prefixo também: "netuno", "jupiter", "plut"', () => {
    const nome = (q: string) => {
      const e = buscar(q, comCorpos, 1)[0]?.entrada;
      return e && e.tipo === 'corpo' ? e.corpo.nome : null;
    };
    expect(nome('netuno')).toBe('Netuno');
    expect(nome('jupiter')).toBe('Júpiter');
    expect(nome('plut')).toBe('Plutão');
    expect(nome('mercurio')).toBe('Mercúrio');
    expect(nome('venus')).toBe('Vênus');
  });

  it('com o mesmo score, casa vem antes do céu', () => {
    // "sol" casa EXATO no Sol e por prefixo/parcial em nomes do
    // catálogo; o corpo tem de vir na frente
    const r = buscar('sol', comCorpos, 8);
    expect(r[0].entrada.tipo).toBe('corpo');
    expect(r[0].entrada.tipo === 'corpo' && r[0].entrada.corpo.nome).toBe('Sol');
  });

  it('e o catálogo não muda de resposta por eles existirem', () => {
    // o desempate por tipo só age dentro do MESMO score, então a
    // ordenação das estrelas continua a de antes, uma a uma
    const semCorpos = buscar('tau', indice, 500).map((r) => est(r).n);
    const comEles = buscar('tau', comCorpos, 500).map((r) => est(r).n);
    expect(comEles).toEqual(semCorpos);
  });

  it('a chave do link de um corpo é o nome que se escreve, e ela volta nele', () => {
    for (const c of corpos) {
      const chave = chaveDeLink({ tipo: 'corpo', corpo: c });
      // ASCII e minúscula: `?foco=terra`, `?foco=jupiter`, `?foco=plutao`
      expect(chave, c.nome).toBe(normalizarConsulta(c.nome));
      expect(chave, c.nome).toMatch(/^[a-z ]+$/);
      const volta = resolverFoco(chave, comCorpos);
      expect(volta?.entrada.tipo, c.nome).toBe('corpo');
      expect(volta?.entrada.tipo === 'corpo' && volta.entrada.corpo.id, c.nome).toBe(c.id);
    }
  });

  it('chaveDoFoco acha pelo nome que a ContextLine mostra — corpo ou estrela', () => {
    expect(chaveDoFoco('Terra', comCorpos)).toBe('terra');
    expect(chaveDoFoco('Sirius', comCorpos)).toBe('hd48915');
    // o que não está no índice não inventa porta (o Sagittarius A✱)
    expect(chaveDoFoco('Sagittarius A✱', comCorpos)).toBeNull();
  });
});
