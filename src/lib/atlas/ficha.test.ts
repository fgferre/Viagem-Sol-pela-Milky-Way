// ============================================================
// A FICHA — a montagem julgada com a efeméride REAL e o `corpos.json` real.
// O que se cobra aqui é o contrato que a tela depende: completude (todo
// alvo monta), honestidade (nenhum rótulo de procedência fora do selo) e
// silêncio (campo ausente não vira linha).
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANOES_DO_SISTEMA,
  ASTEROIDES_DO_SISTEMA,
  CORPOS_DO_SISTEMA,
  LUAS_DO_SISTEMA,
} from '../../three/atlasConfig';
import { PROCEDENCIA } from '../../three/selo';
import type { MetaEfemerides } from './efemerides';
import { decodeEfemerides, MotorEfemerides } from './efemerides';
import type { CorpoNoJson, CorposDoAtlas, Ficha } from './ficha';
import { formatarDuracao, formatarMassaKg, montarFicha } from './ficha';
import { dateToTDB } from './time';

const DATA_DIR = fileURLToPath(
  new URL('../../../public/data/atlas/', import.meta.url)
);
const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    meta
  )
);
const corposJson = JSON.parse(
  readFileSync(join(DATA_DIR, 'corpos.json'), 'utf8')
) as CorposDoAtlas;
const porId = new Map<string, CorpoNoJson>(corposJson.corpos.map((c) => [c.id, c]));

const JD = dateToTDB(new Date('2026-08-22T00:00:00Z'));
const ALVOS = [
  ...CORPOS_DO_SISTEMA,
  ...LUAS_DO_SISTEMA,
  ...ANOES_DO_SISTEMA,
  ...ASTEROIDES_DO_SISTEMA,
].map((c) => c.id);

function ficha(id: string): Ficha | null {
  return montarFicha({ id, jd: JD, fonte: motor, editorial: porId.get(id) ?? null });
}

const todasAsLinhas = (f: Ficha) => f.secoes.flatMap((s) => s.linhas);

describe('completude — todo alvo do Atlas monta ficha', () => {
  it('são 39 alvos e os 39 montam', () => {
    expect(ALVOS).toHaveLength(39);
    for (const id of ALVOS) {
      expect(ficha(id), id).not.toBeNull();
    }
  });

  it('nenhuma ficha carrega undefined, NaN ou "N/A" em campo de tela', () => {
    for (const id of ALVOS) {
      const f = ficha(id)!;
      expect(f.nome, id).toBeTruthy();
      expect(f.classe, id).toBeTruthy();
      for (const secao of f.secoes) {
        expect(secao.titulo, `${id}/${secao.id}`).toBeTruthy();
        // seção vazia não é desenhada, logo não pode sequer existir aqui
        expect(secao.linhas.length, `${id}/${secao.id}`).toBeGreaterThan(0);
        for (const l of secao.linhas) {
          const texto = `${l.rotulo}|${l.valor}|${l.badge ?? ''}|${l.fonte ?? ''}`;
          expect(texto, `${id}/${l.rotulo}`).not.toMatch(
            /undefined|NaN|N\/A|\[object/
          );
          expect(l.rotulo.length, `${id}/${l.rotulo}`).toBeGreaterThan(0);
          expect(l.valor.length, `${id}/${l.rotulo}`).toBeGreaterThan(0);
        }
      }
    }
  });

  /**
   * OS SEIS DO DOADOR SEM ALVO AQUI. Eles têm editorial em `corpos.json` e
   * NÃO têm corpo na cena (sem textura, sem BODY_AXES — está declarado em
   * `atlasConfig.ts`). Ficha sem corpo na cena é promessa: `montarFicha`
   * devolve `null` e o painel não abre.
   */
  it('devolve null para os seis do doador sem alvo, e para o que não é corpo', () => {
    const semAlvo = corposJson.corpos.filter((c) => c.semAlvo).map((c) => c.id);
    expect(semAlvo).toEqual([
      'gonggong',
      'orcus',
      'sedna',
      'salacia',
      'vanth',
      'weywot',
    ]);
    for (const id of semAlvo) {
      expect(ficha(id), id).toBeNull();
    }
    expect(ficha('hd48915')).toBeNull();
    expect(ficha('')).toBeNull();
  });
});

describe('honestidade — o vocabulário é o do selo, e só ele', () => {
  it('todo rótulo de procedência sai de PROCEDENCIA', () => {
    const permitidos = new Set(Object.keys(PROCEDENCIA));
    for (const id of ALVOS) {
      for (const l of todasAsLinhas(ficha(id)!)) {
        expect(permitidos.has(l.procedencia), `${id}/${l.rotulo}`).toBe(true);
      }
    }
  });

  it('o raio é MEDIDO e a massa é DERIVADA — a fronteira do kernel', () => {
    const terra = ficha('earth')!;
    const fisico = terra.secoes.find((s) => s.id === 'fisico')!;
    const porRotulo = new Map(fisico.linhas.map((l) => [l.rotulo, l]));
    expect(porRotulo.get('raio (equador)')?.procedencia).toBe('medido');
    expect(porRotulo.get('massa')?.procedencia).toBe('derivado');
    expect(porRotulo.get('gravidade')?.procedencia).toBe('derivado');
  });
});

describe('silêncio — campo ausente não vira linha', () => {
  it('Makemake não tem GM no kernel, e a ficha dele não fala de massa', () => {
    const f = ficha('makemake')!;
    const fisico = f.secoes.find((s) => s.id === 'fisico')!;
    const rotulos = fisico.linhas.map((l) => l.rotulo);
    expect(rotulos).toContain('raio (equador)');
    expect(rotulos).not.toContain('massa');
    expect(rotulos).not.toContain('gravidade');
    expect(rotulos).not.toContain('velocidade de escape');
  });

  it('sem efeméride não há "agora" nem "no céu" — e o resto continua de pé', () => {
    const f = montarFicha({ id: 'mars', jd: null, fonte: null, editorial: porId.get('mars') })!;
    const ids = f.secoes.map((s) => s.id);
    expect(ids).not.toContain('agora');
    expect(ids).not.toContain('ceu');
    expect(ids).toContain('fisico');
    expect(ids).toContain('orbita');
  });

  it('sem corpos.json a ficha ainda nasce com o físico e o agora', () => {
    const f = montarFicha({ id: 'mars', jd: JD, fonte: motor, editorial: null })!;
    const ids = f.secoes.map((s) => s.id);
    expect(ids).toContain('agora');
    expect(ids).toContain('fisico');
    // sem `orbita` no JSON sobra só a rotação e a nota de validade
    const orbita = f.secoes.find((s) => s.id === 'orbita')!;
    expect(orbita.linhas.map((l) => l.rotulo)).not.toContain('período orbital');
  });

  it('sem pt-BR as duas seções de prosa somem, e a ficha continua útil', () => {
    // O caminho continua sendo o de sempre: a ficha lê `editorial.pt` e mais
    // nada. Um corpo cujo `pt` não chegou (JSON velho em cache, geração pela
    // metade) perde a prosa e mantém número, unidade e procedência — nunca
    // inglês na tela, nunca uma linha explicando a falta.
    const marte = porId.get('mars')!;
    const semPt: CorpoNoJson = {
      ...marte,
      editorial: { en: marte.editorial.en },
    };
    const f = montarFicha({ id: 'mars', jd: JD, fonte: motor, editorial: semPt })!;
    const ids = f.secoes.map((s) => s.id);
    expect(ids).not.toContain('contexto');
    expect(ids).not.toContain('curiosidades');
    expect(ids).toContain('fisico');
  });

  it('desenha a prosa no dia em que ela existir em pt', () => {
    const marte = porId.get('mars')!;
    const comPt: CorpoNoJson = {
      ...marte,
      editorial: {
        ...marte.editorial,
        pt: {
          description: 'O planeta vermelho.',
          curiosity: 'Tem a maior montanha do sistema.',
          facts: ['Um dia marciano dura 24 h 37 min.'],
          records: ['Maior vulcão conhecido'],
          explorationMilestone: { year: 2021, description: 'Perseverance pousou na Jezero' },
        },
      },
    };
    const f = montarFicha({ id: 'mars', jd: JD, fonte: motor, editorial: comPt })!;
    const contexto = f.secoes.find((s) => s.id === 'contexto')!;
    expect(contexto.linhas[0]!.valor).toBe('O planeta vermelho.');
    const curiosidades = f.secoes.find((s) => s.id === 'curiosidades')!;
    expect(curiosidades.linhas.map((l) => l.rotulo)).toEqual([
      'curiosidade',
      'fato',
      'recorde',
      'exploração',
    ]);
    expect(curiosidades.linhas[3]!.valor).toContain('2021');
  });
});

/**
 * AS PALAVRAS QUE DENUNCIAM O INGLÊS. Não são substantivos (esses viram
 * nome próprio e atravessam de propósito: Voyager, Kraken Mare, Star Wars) —
 * são as palavras de LIGAÇÃO, que nenhuma frase inglesa consegue evitar e
 * nenhuma frase portuguesa produz. Ficam de fora, de propósito, as que as
 * duas línguas compartilham como palavra inteira ("no", "do", "as", "e"):
 * incluí-las trocaria um detector por um gerador de falso positivo.
 */
const PALAVRAS_INGLESAS = new Set([
  'the', 'of', 'and', 'is', 'are', 'was', 'were', 'with', 'that', 'this',
  'from', 'for', 'its', 'it', 'has', 'have', 'been', 'by', 'than', 'which',
  'their', 'they', 'but', 'about', 'also', 'only', 'other', 'into', 'over',
  'would', 'could', 'can', 'all', 'most', 'more', 'first', 'second',
  'largest', 'smallest', 'moon', 'moons', 'planet', 'surface', 'water',
  'ice', 'spacecraft', 'discovered', 'years', 'orbit', 'orbits',
]);

/** Os números que uma frase carrega, com a régua decimal de cada língua. */
function numerosDe(texto: string, decimal: ',' | '.'): Set<string> {
  const milhar = decimal === ',' ? '.' : ',';
  const semMilhar = texto.replaceAll(
    new RegExp(`(\\d)\\${milhar}(\\d\\d\\d)(?!\\d)`, 'g'),
    '$1$2'
  );
  const normalizado =
    decimal === ',' ? semMilhar.replaceAll(/(\d),(\d)/g, '$1.$2') : semMilhar;
  return new Set(normalizado.match(/\d+(?:\.\d+)?/g) ?? []);
}

describe('a língua — o texto é pt-BR e a tela não tem inglês (item 74, parte B)', () => {
  it('os 39 alvos têm as duas seções de prosa, e nenhuma nasce vazia', () => {
    for (const id of ALVOS) {
      const f = ficha(id)!;
      const contexto = f.secoes.find((s) => s.id === 'contexto');
      const curiosidades = f.secoes.find((s) => s.id === 'curiosidades');
      expect(contexto, id).toBeDefined();
      expect(curiosidades, id).toBeDefined();
      expect(contexto!.linhas.length, id).toBeGreaterThan(0);
      expect(curiosidades!.linhas.length, id).toBeGreaterThan(0);
    }
  });

  it('todo campo que o inglês tem, o português tem — e nada além', () => {
    const CAMPOS = [
      'description',
      'curiosity',
      'facts',
      'records',
      'explorationMilestone',
      'info',
    ] as const;
    for (const id of ALVOS) {
      const corpo = porId.get(id)!;
      const en = corpo.editorial.en as Record<string, unknown>;
      const pt = corpo.editorial.pt as Record<string, unknown> | undefined;
      expect(pt, id).toBeDefined();
      for (const campo of CAMPOS) {
        expect(pt![campo] === undefined, `${id}/${campo}`).toBe(
          en[campo] === undefined
        );
      }
      expect(Object.keys(pt!).every((k) => (CAMPOS as readonly string[]).includes(k)), id).toBe(true);
    }
  });

  it('Miranda continua sem recordes e sem exploração, nas DUAS línguas', () => {
    // A pendência do doador é dela, não da tradução: inventar em português
    // o que o inglês não tem seria fechar em silêncio um trabalho do dono.
    const miranda = porId.get('miranda')!;
    expect(miranda.editorial.pt).toBeDefined();
    expect(miranda.editorial.pt!.records).toBeUndefined();
    expect(miranda.editorial.pt!.explorationMilestone).toBeUndefined();
    const curiosidades = ficha('miranda')!.secoes.find((s) => s.id === 'curiosidades')!;
    expect(curiosidades.linhas.map((l) => l.rotulo)).toEqual(['curiosidade', 'fato']);
  });

  it('Makemake não fala de massa e FALA de tudo o mais — a ausência é do kernel', () => {
    // A única coisa que falta na ficha dele é a que o gm_de440 não mede.
    // Se a prosa também faltasse, o visitante veria duas ausências e não
    // saberia qual delas é honesta.
    const f = ficha('makemake')!;
    const ids = f.secoes.map((s) => s.id);
    expect(ids).toContain('contexto');
    expect(ids).toContain('curiosidades');
    expect(ids).toContain('orbita');
    expect(f.secoes.find((s) => s.id === 'fisico')!.linhas.map((l) => l.rotulo)).toEqual([
      'raio (equador)',
    ]);
  });

  it('nenhuma palavra inglesa de ligação sobra em linha de tela', () => {
    for (const id of ALVOS) {
      for (const l of todasAsLinhas(ficha(id)!)) {
        const naTela = `${l.rotulo} ${l.valor} ${l.badge ?? ''} ${l.fonte ?? ''}`;
        for (const palavra of naTela.toLowerCase().split(/[^\p{L}]+/u)) {
          expect(
            PALAVRAS_INGLESAS.has(palavra),
            `${id}: "${palavra}" em «${naTela.trim()}»`
          ).toBe(false);
        }
      }
    }
  });

  it('a tradução não perdeu número nem data pelo caminho', () => {
    // A prova mais dura da tradução: o conjunto de números da frase inglesa
    // tem de reaparecer inteiro na portuguesa, com a régua decimal trocada
    // ("20,000 times" → "20.000 vezes"; "1.39 million" → "1,39 milhão").
    // Um fato reescrito com o número errado passaria por qualquer leitura.
    for (const id of ALVOS) {
      const { en, pt } = porId.get(id)!.editorial;
      const textoDe = (e: typeof en) =>
        [
          e.description,
          e.curiosity,
          e.info,
          ...(e.facts ?? []),
          ...(e.records ?? []),
          e.explorationMilestone
            ? `${e.explorationMilestone.year} ${e.explorationMilestone.description}`
            : '',
        ].join(' ');
      const doIngles = numerosDe(textoDe(en), '.');
      const doPortugues = numerosDe(textoDe(pt!), ',');
      for (const n of doIngles) {
        expect(doPortugues.has(n), `${id}: o número ${n} sumiu na tradução`).toBe(true);
      }
    }
  });
});

describe('as unidades e os selos que o visitante lê', () => {
  it('a ordem das seções é a do interesse: o vivo antes da enciclopédia', () => {
    const f = ficha('titan')!;
    expect(f.secoes.map((s) => s.id)).toEqual([
      'agora',
      'fisico',
      'orbita',
      'contexto',
      'curiosidades',
    ]);
    expect(f.secoes[0]!.titulo).toBe('agora');
  });

  it('a lua fala em QUILÔMETROS do pai, e o planeta em UA do Sol', () => {
    const lua = ficha('moon')!.secoes.find((s) => s.id === 'agora')!;
    expect(lua.linhas[0]!.rotulo).toBe('distância — Terra');
    expect(lua.linhas[0]!.valor).toMatch(/mil km$/);
    const marte = ficha('mars')!.secoes.find((s) => s.id === 'agora')!;
    expect(marte.linhas[0]!.rotulo).toBe('distância — Sol');
    expect(marte.linhas[0]!.valor).toMatch(/ UA$/);
  });

  it('nenhuma linha da ficha fala em parsec', () => {
    for (const id of ALVOS) {
      for (const l of todasAsLinhas(ficha(id)!)) {
        expect(l.valor, `${id}/${l.rotulo}`).not.toMatch(/\bpc\b|parsec/);
      }
    }
  });

  it('Júpiter leva o selo de 11,21 raios, e Mimas não leva selo de massa', () => {
    const jupiter = ficha('jupiter')!.secoes.find((s) => s.id === 'fisico')!;
    const raio = jupiter.linhas.find((l) => l.rotulo === 'raio (equador)')!;
    expect(raio.badge).toBe('11,21× Terra');
    const mimas = ficha('mimas')!.secoes.find((s) => s.id === 'fisico')!;
    expect(mimas.linhas.find((l) => l.rotulo === 'massa')!.badge).toBeUndefined();
  });

  it('a Terra não se compara consigo mesma', () => {
    const terra = ficha('earth')!.secoes.find((s) => s.id === 'fisico')!;
    for (const l of terra.linhas) expect(l.badge, l.rotulo).toBeUndefined();
  });

  it('só os heliocêntricos e a Lua ganham a seção do céu', () => {
    expect(ficha('mars')!.secoes.map((s) => s.id)).toContain('ceu');
    expect(ficha('moon')!.secoes.map((s) => s.id)).toContain('ceu');
    expect(ficha('titan')!.secoes.map((s) => s.id)).not.toContain('ceu');
    expect(ficha('earth')!.secoes.map((s) => s.id)).not.toContain('ceu');
    expect(ficha('sun')!.secoes.map((s) => s.id)).not.toContain('ceu');
  });

  it('o Sol é a origem: sem "agora", sem órbita, com físico', () => {
    const ids = ficha('sun')!.secoes.map((s) => s.id);
    expect(ids).toEqual(['fisico', 'contexto', 'curiosidades']);
  });

  it('Vênus gira ao contrário, e a ficha diz', () => {
    const orbita = ficha('venus')!.secoes.find((s) => s.id === 'orbita')!;
    const dia = orbita.linhas.find((l) => l.rotulo === 'dia sideral')!;
    expect(dia.valor).toContain('retrógrado');
    expect(dia.valor).toContain('243');
  });
});

describe('formatarDuracao', () => {
  it('fala horas abaixo de um dia, dias abaixo de dois anos, anos acima', () => {
    expect(formatarDuracao(0.31891)).toBe('7,7 horas');
    expect(formatarDuracao(1 / 48)).toBe('0,5 hora');
    expect(formatarDuracao(27.3208)).toBe('27,3 dias');
    expect(formatarDuracao(365.264)).toBe('365,3 dias');
    expect(formatarDuracao(4332.72)).toBe('11,9 anos');
  });

  it('recusa duração sem medida', () => {
    expect(formatarDuracao(0)).toBeNull();
    expect(formatarDuracao(-1)).toBeNull();
    expect(formatarDuracao(Number.NaN)).toBeNull();
  });
});

describe('formatarMassaKg', () => {
  it('escreve a potência de dez como se escreve, não como o JS escreve', () => {
    // O `1.345e+23` do JavaScript é endereço de programador. O visitante
    // desta casa é leigo, e viu "× 10²³" na escola.
    expect(formatarMassaKg(1.345e23)).toBe('1,34 × 10²³ kg');
    expect(formatarMassaKg(5.9722e24)).toBe('5,97 × 10²⁴ kg');
    expect(formatarMassaKg(1.06e16)).toBe('1,06 × 10¹⁶ kg');
  });

  it('recusa massa sem medida', () => {
    expect(formatarMassaKg(0)).toBeNull();
    expect(formatarMassaKg(Number.NaN)).toBeNull();
  });

  it('é a grafia que a ficha usa de verdade', () => {
    const fisico = ficha('earth')!.secoes.find((s) => s.id === 'fisico')!;
    expect(fisico.linhas.find((l) => l.rotulo === 'massa')!.valor).toBe(
      '5,97 × 10²⁴ kg'
    );
  });
});
