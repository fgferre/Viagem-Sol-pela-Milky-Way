// Serve: dono — a busca acha a estrela certa por acento, prefixo, chave irmã e rubrica de degraus, do jeito que ele desenhou
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
// MEDIDO ao escrever: nenhuma consulta única acende todos os degraus
// neste dado (varredura sobre as 11.170 chaves de texto — eram 3.845
// antes do vocabulário bilíngue do item 129/F5), porque um degrau
// EXATO só nasce de chave de uma palavra e essas não reaparecem como
// palavra interna de outra. Por isso a rubrica é provada em DOIS casos
// reais que se emendam: "ran" (exato > prefixo > parcial) e "tau"
// (prefixo > palavra interna > parcial > constelação).
//
// O VOCABULÁRIO BILÍNGUE (item 129/F5) alargou o alcance sem mexer na
// rubrica: apelido, designação de Bayer de TODA estrela com letra e
// sigla, constelação como lugar e o centro galáctico. As expectativas
// que mudaram de propósito estão marcadas uma a uma, com o porquê.
// ============================================================
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { NamedStar } from '../three/config';
import {
  SCORE,
  buscar,
  chaveDeLink,
  chaveDoFoco,
  construirIndice,
  nomeDaEntrada,
  normalizarConsulta,
  resolverFoco,
} from './buscaEstrelas';
import type {
  CorpoBuscavel,
  EntradaDaBusca,
  LugarBuscavel,
  ResultadoBusca,
} from './buscaEstrelas';
import { CORPOS_DO_SISTEMA } from '../three/atlasConfig';
import { RETRATO_2026 } from '../three/world/planetas/retrato2026';
import type { IdRetrato } from '../three/world/planetas/retrato2026';
import { definirIdioma } from './idioma';

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
    // MUDOU no item 129/F4, de propósito: "anhanhuca" está a DUAS letras
    // de "ananuca" (os dois 'h' a mais), e o degrau tolerante do motor
    // acha por isso. Era `[]` enquanto a busca só sabia casar letra a
    // letra — grafar o som em pt-BR deixou de ser "outro nome" e passou a
    // ser o que de fato é: um erro de digitação dentro da folga.
    expect(nomes('anhanhuca')).toEqual(['Añañuca']);
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
    // e o GENITIVO latino, que é como a designação se escreve por fora
    // do catálogo — mesma estrela, mesma lei (item 129/F5)
    expect(nomes('gamma velorum')).toEqual(['γ² Vel']);
    expect(nomes('beta orionis')).toEqual(['Rigel']);
  });

  it('a designação Gliese também é porta de entrada', () => {
    expect(nomes('gl 244')).toEqual(['Sirius', 'Sirius B']);
  });

  it('α Cen ACHA (item 129/F5): a designação não depende mais do nome', () => {
    // MUDOU DE PROPÓSITO. Enquanto a chave irmã saía do NOME, uma
    // estrela batizada pela IAU perdia a designação de Bayer junto — e
    // "alfa cen" caía no vazio, que era a "surpresa do dado" que este
    // teste registrava. Agora a designação sai dos campos `b`/`c`, que
    // o catálogo sempre trouxe: as duas α do Centauro respondem, a mais
    // brilhante na frente, e as duas línguas valem sempre.
    expect(nomes('alfa cen')).toEqual(['Rigil Kentaurus', 'Toliman']);
    expect(nomes('alpha centauri')).toEqual(['Rigil Kentaurus', 'Toliman']);
    expect(nomes('α cen')).toEqual(['Rigil Kentaurus', 'Toliman']);
    // o sobrescrito é opcional: com ele, a designação é de UMA só
    expect(nomes('alfa1 cen')).toEqual(['Rigil Kentaurus']);
    expect(nomes('rigil')).toEqual(['Rigil Kentaurus']);
  });

  it('apelido popular, nas duas línguas, acha a estrela do catálogo', () => {
    expect(nomes('sirio')).toEqual(['Sirius']); // MUDOU: era vazio
    expect(nomes('sírio')).toEqual(['Sirius']);
    expect(nomes('estrela polar')).toEqual(['Polaris']);
    expect(nomes('north star')).toEqual(['Polaris']);
    // um apelido pode ser de TRÊS estrelas — o cinturão de Órion
    expect(nomes('tres marias')).toEqual(['Alnilam', 'Alnitak', 'Mintaka']);
    expect(nomes("orion's belt")).toEqual(['Alnilam', 'Alnitak', 'Mintaka']);
  });

  it('a constelação é um LUGAR, e vem embaixo de todo casamento literal', () => {
    // "ursa maior" não é nome de estrela nenhuma: o que responde é o
    // ENDEREÇO delas, no degrau próprio, da mais brilhante para a mais
    // fraca. Em latim, pt e en — as três formas, sempre.
    const brilhantes = ['Alioth', 'Dubhe', 'Alkaid', 'Mizar', 'Merak'];
    expect(buscar('ursa maior', indice, 5).map((r) => est(r).n)).toEqual(brilhantes);
    expect(buscar('great bear', indice, 5).map((r) => est(r).n)).toEqual(brilhantes);
    expect(buscar('ursa maior', indice, 1)[0].score).toBe(SCORE.constelacao);
    // e o preço que o desenho mandou não pagar: "and" não afoga quem
    // casa por letra — a constelação vale MENOS que qualquer literal
    expect(SCORE.constelacao).toBeLessThan(SCORE.parcial);
  });

  it('consulta vazia ou só espaço não devolve nada', () => {
    expect(buscar('', indice)).toEqual([]);
    expect(buscar('   ', indice)).toEqual([]);
  });

  it('o limite é respeitado (8 por omissão)', () => {
    expect(buscar('tau', indice, 5)).toHaveLength(5);
    expect(buscar('tau', indice)).toHaveLength(8);
    // 130, e eram 78 até o item 129/F5: entraram as τ que têm nome
    // próprio (a designação não depende mais do nome) e a constelação
    expect(buscar('tau', indice, 500).length).toBe(130);
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

describe('rubrica de degraus', () => {
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

  it('"tau": prefixo > palavra > parcial > constelação, e Rigil lá embaixo', () => {
    const r = buscar('tau', indice, 500);
    const degraus = [...new Set(r.map((x) => x.score))];
    // MUDOU no item 129/F5: o quarto degrau é a constelação (Taurus),
    // e o primeiro do prefixo é outra τ — Paikauhale (τ Sco, m 2,82) é
    // mais brilhante que τ Pup e só entrou porque a designação deixou
    // de depender do nome próprio
    expect(degraus).toEqual([
      SCORE.prefixo,
      SCORE.palavra,
      SCORE.parcial,
      SCORE.constelacao,
    ]);
    expect(est(r[0]).n).toBe('Paikauhale'); // τ Sco, pela chave "tau sco"
    // "α Tau" → chave "alfa tauri", e "tauri" é palavra que começa com "tau"
    expect(est(r.find((x) => x.score === SCORE.palavra)).n).toBe('Aldebaran');
    // a terceira estrela mais brilhante do céu abre o degrau PARCIAL:
    // "tau" só aparece dentro de "kentaurus", e isso a joga atrás de
    // toda τ e de toda estrela de Touro
    expect(est(r.find((x) => x.score === SCORE.parcial)).n).toBe('Rigil Kentaurus');
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
// O DEGRAU TOLERANTE (item 129, F4) — o quinto, o do MiniSearch. A
// queixa medida do dono: "jupter", "siriuss" e "betelgeuze" caíam no
// estado vazio, porque a rubrica literal só casa começo de palavra ou
// substring. O motor entra POR BAIXO dela: só acende quando os quatro
// degraus literais acharam ZERO, e por isso nada do que já funcionava
// mudou de ordem — o que se julga aqui é o que era vazio e virou acerto,
// e o que tem de continuar vazio.
// ============================================================
describe('degrau tolerante: um erro de digitação não apaga a estrela', () => {
  it('a letra trocada, a sobrando e a faltando acham o nome certo', () => {
    expect(nomes('siriuss')).toEqual(['Sirius', 'Sirius B']); // uma a mais
    // "betelgeuze" saiu daqui no item 129/F5: virou APELIDO de dado
    // (degrau exato), e quem prova a tolerância é a de duas trocadas
    expect(nomes('betelguese')).toEqual(['Betelgeuse']); // duas trocadas
    expect(nomes('vegaa')).toEqual(['Vega']);
  });

  it('o degrau tolerante vale MENOS que qualquer casamento literal', () => {
    expect(buscar('siriuss', indice)[0].score).toBe(SCORE.aproximado);
    expect(SCORE.aproximado).toBeLessThan(SCORE.parcial);
    // e não se intromete quando a letra bate: "sirius" continua exato
    expect(buscar('sirius', indice)[0].score).toBe(SCORE.exato);
  });

  it('termo curto não ganha folga — um erro em 3 letras é outra palavra', () => {
    // "sirio" saiu daqui no item 129/F5 pelo mesmo motivo do
    // "betelgeuze": deixou de ser erro de digitação e virou apelido
    expect(nomes('vga')).toEqual([]);
    expect(nomes('rgl')).toEqual([]); // "rigel" sem as vogais não é erro, é outra coisa
  });

  it('o estado vazio continua honesto: o que não parece nada dá nada', () => {
    // "cruzeiro do sul" saiu daqui: é apelido das três da Cruz desde o
    // item 129/F5. "buraco negro" continua vazio NESTE índice porque
    // ele nasce sem lugares — o alvo é injetado, ver o describe do
    // centro galáctico lá embaixo
    expect(nomes('buraco negro')).toEqual([]);
    expect(nomes('xkcd')).toEqual([]);
    // e a lei do §D4 não afrouxa: número incompleto segue sem palpite
    expect(nomes('hd 4891')).toEqual([]);
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
    // "alfa cen" SAIU desta lista no item 129/F5 — hoje ele resolve em
    // Rigil Kentaurus, e é uma porta legítima; o que continua sem
    // palpite é a consulta que não casa com nada
    expect(resolverFoco('kzzz', indice)).toBeNull();
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

  it('chaveDoFoco acha pelo nome que a ficha mostra — corpo ou estrela', () => {
    expect(chaveDoFoco('Terra', comCorpos)).toBe('terra');
    expect(chaveDoFoco('Sirius', comCorpos)).toBe('hd48915');
    // o que não está no índice não inventa porta — e este índice nasce
    // SEM lugares, então o Sagittarius A✱ ainda não é dele (com o lugar
    // injetado ele tem chave; ver o describe do centro galáctico)
    expect(chaveDoFoco('Sagittarius A✱', comCorpos)).toBeNull();
  });
});

// ============================================================
// O DESEMPATE ENTRE CORPOS (item 115). `brilhoDe` devolve 0 para todo
// corpo, então dois corpos no MESMO degrau caíam na ordem do catálogo —
// ordem de construção, não mérito. Com dez corpos ninguém via; a
// mineração do NASA Eyes mediu a nossa rubrica contra os 451 nomes de
// lua deles (o porte que o item 114 traz) e achou três empates cegos:
// "tita" (Titan × Titania, 110 cada), "jupiter" (14 numeradas em 110) e
// "s/2004" (33 chaves empatadas).
//
// Os nomes desta bancada são os do catálogo do Eyes, escritos aqui de
// propósito: o defeito é do PORTE que ainda não temos, e um juiz que só
// olhasse os dez corpos de hoje não veria nada.
// ============================================================
describe('empate entre corpos: o desempate é o nome, não a ordem do catálogo', () => {
  const lua = (nome: string, pai: string): CorpoBuscavel => ({
    id: normalizarConsulta(nome).replace(/[^a-z0-9]+/g, '-'),
    nome,
    classe: 'lua',
    rUA: Number.NaN,
    pai,
  });
  const FAMILIA: readonly CorpoBuscavel[] = [
    { id: 'jupiter', nome: 'Júpiter', classe: 'planeta', rUA: 5.2 },
    { id: 'saturn', nome: 'Saturno', classe: 'planeta', rUA: 9.58 },
    lua('Titania', 'uranus'),
    lua('Titan', 'saturn'),
    lua('Jupiter LII', 'jupiter'),
    lua('Jupiter LI', 'jupiter'),
    lua('Jupiter LIV', 'jupiter'),
    lua('S/2004 S 12', 'saturn'),
    lua('S/2004 S 7', 'saturn'),
    lua('S/2004 S 13', 'saturn'),
  ];
  /** os nomes que a busca devolve, na ordem, para um catálogo nesta ordem */
  const saida = (consulta: string, corpos: readonly CorpoBuscavel[]) =>
    buscar(consulta, construirIndice([], corpos), 8).map((r) =>
      nomeDaEntrada(r.entrada)
    );

  it('"tita": Titan ganha de Titania por mérito, e não por chegar antes', () => {
    // os dois casam por PREFIXO (110): sem desempate de nome, quem
    // ganha é quem o catálogo construiu primeiro — e aqui Titania vem
    // primeiro de propósito
    expect(saida('tita', FAMILIA)).toEqual(['Titan', 'Titania']);
    // ...e continua ganhando com o catálogo ao contrário
    expect(saida('tita', [...FAMILIA].reverse())).toEqual(['Titan', 'Titania']);
  });

  it('a ordem do catálogo NÃO decide mais nada — embaralhar não muda a saída', () => {
    // o veredito que define "determinístico": a mesma consulta, o mesmo
    // conjunto, ordens de entrada diferentes, UMA saída
    const consultas = ['tita', 'jupiter', 's/2004', 'jupiter l'];
    const embaralhado = [
      FAMILIA[7], FAMILIA[2], FAMILIA[5], FAMILIA[0],
      FAMILIA[9], FAMILIA[3], FAMILIA[8], FAMILIA[1], FAMILIA[6], FAMILIA[4],
    ];
    for (const q of consultas) {
      expect(saida(q, embaralhado), q).toEqual(saida(q, FAMILIA));
      expect(saida(q, [...FAMILIA].reverse()), q).toEqual(saida(q, FAMILIA));
    }
  });

  it('"jupiter": o planeta na frente por score, e as numeradas em ordem estável', () => {
    // o exato (140) já põe Júpiter em primeiro; o que o desempate novo
    // arruma é o que vem DEPOIS — antes era o acaso do catálogo
    expect(saida('jupiter', FAMILIA)).toEqual([
      'Júpiter',
      'Jupiter LI',
      'Jupiter LII',
      'Jupiter LIV',
    ]);
  });

  it('"s/2004": as empatadas saem da mais curta para a mais longa, e em ordem', () => {
    expect(saida('s/2004', FAMILIA)).toEqual([
      'S/2004 S 7',
      'S/2004 S 12',
      'S/2004 S 13',
    ]);
  });
});

// ============================================================
// O CENTRO GALÁCTICO como alvo da busca (item 129/F5). Ele não é
// estrela do catálogo nem corpo do sistema: é um LUGAR, e entra no
// índice com a geometria INJETADA — a lib é pura e `GAL.GC_POS` mora no
// three. O que se julga aqui é o vocabulário das duas línguas e a porta
// do link, que até esta fase devolvia `null` para ele.
// ============================================================
describe('o centro galáctico é um lugar, e a busca o alcança', () => {
  // os números são os da cena (`LUGARES_DA_BUSCA`, em useDirector); o
  // que este arquivo julga é a busca, não a astrometria
  const sgrA: LugarBuscavel = {
    id: 'sagittarius-a',
    nome: 'Sagittarius A✱',
    d: 8178,
    x: 0,
    y: 0,
    z: -8178,
  };
  const comLugar = construirIndice(nomeadas, [], [sgrA]);
  const achado = (q: string) => {
    const e = buscar(q, comLugar, 1)[0]?.entrada;
    return e && e.tipo === 'lugar' ? e.lugar.id : null;
  };

  it('as duas línguas levam ao mesmo lugar', () => {
    for (const q of [
      'buraco negro',
      'black hole',
      'centro da galaxia',
      'centro galáctico',
      'galactic center',
      'galactic centre',
      'sagittarius a',
    ]) {
      expect(achado(q), q).toBe('sagittarius-a');
    }
  });

  it('a porta do link fecha o círculo — nome em quadro → chave → alvo', () => {
    // era `null` até o item 129/F5, e por isso o `?foco=` sumia da URL
    // quando o que estava em quadro era o centro galáctico
    expect(chaveDoFoco('Sagittarius A✱', comLugar)).toBe('sagittarius-a');
    expect(achado('sagittarius-a')).toBe('sagittarius-a');
  });
});

// ============================================================
// AS DUAS GRAFIAS DE UM CORPO (item 130/F2, lista do §19).
//
// A divisão: o nome pt-BR é a CHAVE (índice da busca, `?foco=`,
// `chaveDeLink`) e o inglês é a TELA. Dois modos de falha, os dois
// mudos:
//   · a LISTA da paleta continuar em português com a casa em inglês —
//     `nomeDaEntrada` é quem a alimenta;
//   · o `?foco=` SUMIR da URL depois de o visitante trocar de língua —
//     o foco foi publicado numa grafia e `chaveDoFoco` procura na outra.
//     A troca é ao vivo e não reenquadra nada, então o nome em quadro
//     fica na grafia velha até o próximo enquadramento.
// ============================================================
describe('as duas grafias do corpo — a busca e o foco', () => {
  const corpos: readonly CorpoBuscavel[] = CORPOS_DO_SISTEMA.map((c) => ({
    id: c.id,
    nome: c.nome,
    nomeEn: c.nomeEn,
    classe: c.classe,
    rUA: c.id === 'sun' ? 0 : RETRATO_2026[c.id as IdRetrato].rUA,
  }));
  const comCorpos = construirIndice(nomeadas, corpos);
  const doId = (id: string): EntradaDaBusca =>
    comCorpos.entradas.find((e) => e.tipo === 'corpo' && e.corpo.id === id)!;

  afterEach(() => definirIdioma('pt-BR'));

  it('o NOME NA LISTA segue o idioma vivo, sem reconstruir o índice', () => {
    expect(nomeDaEntrada(doId('mercury'))).toBe('Mercúrio');
    expect(nomeDaEntrada(doId('earth'))).toBe('Terra');
    definirIdioma('en');
    // MESMO índice, mesma entrada: quem trocou foi a língua
    expect(nomeDaEntrada(doId('mercury'))).toBe('Mercury');
    expect(nomeDaEntrada(doId('earth'))).toBe('Earth');
    definirIdioma('pt-BR');
    expect(nomeDaEntrada(doId('mercury'))).toBe('Mercúrio');
  });

  it('a ESTRELA e o LUGAR não têm segunda grafia — e continuam iguais', () => {
    const estrela = comCorpos.entradas.find((e) => e.tipo === 'estrela')!;
    const antes = nomeDaEntrada(estrela);
    definirIdioma('en');
    expect(nomeDaEntrada(estrela)).toBe(antes);
  });

  it('o TERMO em português continua achando o corpo com a casa em inglês', () => {
    // o índice é de CHAVES pt-BR e não se reconstrói na troca: quem
    // digita "Mercúrio" num app em inglês tem de achar o planeta
    definirIdioma('en');
    const r = buscar('Mercúrio', comCorpos, 8)[0];
    expect(r?.entrada.tipo).toBe('corpo');
    expect(r.entrada.tipo === 'corpo' && r.entrada.corpo.id).toBe('mercury');
    // e o termo em inglês também acha, pelo `id` anotado desde o item 126
    expect(buscar('mercury', comCorpos, 8)[0]?.entrada.tipo).toBe('corpo');
  });

  it('`chaveDoFoco` aceita AS DUAS grafias, em qualquer língua', () => {
    for (const lingua of ['pt-BR', 'en'] as const) {
      definirIdioma(lingua);
      expect(chaveDoFoco('Mercúrio', comCorpos), lingua).toBe('mercurio');
      expect(chaveDoFoco('Mercury', comCorpos), lingua).toBe('mercurio');
      expect(chaveDoFoco('Terra', comCorpos), lingua).toBe('terra');
      expect(chaveDoFoco('Earth', comCorpos), lingua).toBe('terra');
    }
  });

  it('a CHAVE gravada na URL é a mesma nas duas línguas — o link é um só', () => {
    const emPt = chaveDeLink(doId('earth'));
    definirIdioma('en');
    expect(chaveDeLink(doId('earth'))).toBe(emPt);
    // e o link escrito em inglês abre a mesma vista
    expect(resolverFoco(emPt, comCorpos)?.entrada.tipo).toBe('corpo');
  });

  it('nome que não é do índice continua devolvendo `null` nas duas línguas', () => {
    expect(chaveDoFoco('Vulcano', comCorpos)).toBeNull();
    definirIdioma('en');
    expect(chaveDoFoco('Vulcan', comCorpos)).toBeNull();
  });
});
