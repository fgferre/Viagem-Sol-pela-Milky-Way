// Serve: lei — a ficha monta completa, honesta e silenciosa para os 39 alvos, com a efeméride e o corpos.json reais
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
import type { StarsMeta } from '../../three/config';
import type { ManifestDeTexturas } from '../../three/world/corpos/texturas';
import type { CorpoNoJson, CorposDoAtlas, EditorialDoCorpo, Ficha } from './ficha';
import { formatarDuracao, montarFicha, montarFichaDeEstrela } from './ficha';
import { temperatureFromBV } from './stellarPhysics';
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
const texturas = JSON.parse(
  readFileSync(join(DATA_DIR, 'texturas.json'), 'utf8')
) as ManifestDeTexturas;
const porId = new Map<string, CorpoNoJson>(corposJson.corpos.map((c) => [c.id, c]));
/**
 * O INGLÊS, QUE NÃO ESTÁ NO ARTEFATO. Ele é a régua da tradução e mora na
 * fonte; `corpos.json` só carrega o pt-BR, que é o que a tela lê. As duas
 * provas de fidelidade abaixo comparam as DUAS línguas, então leem daqui.
 */
const editorialEn = new Map<string, EditorialDoCorpo>(
  (
    JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL('../../../scripts/data/atlas/fonte/corpos-fonte.json', import.meta.url)
        ),
        'utf8'
      )
    ) as { corpos: { id: string; editorial?: { en?: EditorialDoCorpo } }[] }
  ).corpos.map((c) => [c.id, c.editorial?.en ?? {}])
);
const starsMeta = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../public/data/stars_meta.json', import.meta.url)),
    'utf8'
  )
) as StarsMeta;

const JD = dateToTDB(new Date('2026-08-22T00:00:00Z'));
const ALVOS = [
  ...CORPOS_DO_SISTEMA,
  ...LUAS_DO_SISTEMA,
  ...ANOES_DO_SISTEMA,
  ...ASTEROIDES_DO_SISTEMA,
].map((c) => c.id);

function ficha(id: string): Ficha | null {
  return montarFicha({
    id,
    jd: JD,
    fonte: motor,
    editorial: porId.get(id) ?? null,
    texturas,
  });
}

/** As linhas de uma seção, por rótulo — o atalho de meia dúzia de provas. */
function porRotulo(id: string, secao: string): Map<string, string> {
  const s = ficha(id)!.secoes.find((x) => x.id === secao);
  return new Map((s?.linhas ?? []).map((l) => [l.rotulo, l.valor]));
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
    const semPt: CorpoNoJson = { ...marte, editorial: undefined };
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
      const en = editorialEn.get(id) as unknown as Record<string, unknown>;
      const pt = corpo.editorial?.pt as Record<string, unknown> | undefined;
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
    expect(miranda.editorial?.pt).toBeDefined();
    expect(miranda.editorial!.pt.records).toBeUndefined();
    expect(miranda.editorial!.pt.explorationMilestone).toBeUndefined();
    expect(editorialEn.get('miranda')!.records).toBeUndefined();
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
    // AS TRÊS LINHAS QUE FICAM EM INGLÊS DE PROPÓSITO são as que CITAM o
    // licenciante: o nome do arquivo na fonte ("8k_moon"), o nome do
    // instrumento jurídico ("CC BY 4.0", "NASA images and media usage
    // guidelines") e a frase de crédito que ele exige verbatim. Traduzi-las
    // não seria zelo com a língua — seria descumprir a licença que permite a
    // foto estar aqui, e apagar o nome pelo qual o arquivo é procurável.
    // O que a CASA escreveu na mesma seção — o defeito, a forma, a
    // superfície inventada — continua no varredor.
    const CITACAO_DE_LICENCA = new Set(['fonte', 'licença', 'atribuição']);
    for (const id of ALVOS) {
      for (const l of todasAsLinhas(ficha(id)!)) {
        if (CITACAO_DE_LICENCA.has(l.rotulo)) continue;
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
      const en = editorialEn.get(id)!;
      const pt = porId.get(id)!.editorial?.pt;
      const textoDe = (e: EditorialDoCorpo) =>
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

describe('a imagem confessa — itens 19 e 20', () => {
  it('todo corpo com mesh tem a seção, e ela diz fonte, licença e crédito', () => {
    // 38 dos 39: o Sol não entra (a imagem dele é a Lei da Estrela).
    for (const id of ALVOS.filter((i) => i !== 'sun')) {
      const imagem = porRotulo(id, 'imagem');
      expect(imagem.size, id).toBeGreaterThan(0);
      // ou tem mapa com licença, ou confessa que a superfície é inventada
      expect(imagem.has('licença') || imagem.has('superfície'), id).toBe(true);
      if (imagem.has('licença')) {
        expect(imagem.get('licença'), id).not.toBe('nao-resolvida');
        expect(imagem.get('fonte'), id).toBeTruthy();
        expect(imagem.get('atribuição'), id).toBeTruthy();
      }
    }
  });

  it('Ceres diz na cara que o mapa é inventado pela fonte (item 19)', () => {
    const defeito = porRotulo('ceres', 'imagem').get('o defeito');
    expect(defeito).toContain('inventado');
  });

  it('Titã confessa as emendas, Europa as 68 linhas, Vênus a falta de luz visível', () => {
    expect(porRotulo('titan', 'imagem').get('o defeito')).toContain('emendas');
    expect(porRotulo('europa', 'imagem').get('o defeito')).toContain('68 linhas');
    expect(porRotulo('venus', 'imagem').get('o defeito')).toContain('luz visível');
  });

  it('a Terra NÃO tem defeito — ausência de nota não é falta de conferência', () => {
    const imagem = porRotulo('earth', 'imagem');
    expect(imagem.has('o defeito')).toBe(false);
    expect(imagem.get('fonte')).toContain('Solar System Scope');
  });

  it('o defeito leva o selo de MEDIDO: quem o mediu foi a bancada', () => {
    const linhas = ficha('ceres')!.secoes.find((s) => s.id === 'imagem')!.linhas;
    const defeito = linhas.find((l) => l.rotulo === 'o defeito')!;
    expect(defeito.procedencia).toBe('medido');
    expect(defeito.fonte).toBe('bancada de texturas');
  });

  it('os quatro elipsoides confessam a forma, e ninguém mais (item 20)', () => {
    const COM_MALHA_PUBLICADA = ['vesta', 'pallas', 'hygiea', 'haumea'];
    for (const id of ALVOS.filter((i) => i !== 'sun')) {
      const forma = porRotulo(id, 'imagem').get('forma');
      if (COM_MALHA_PUBLICADA.includes(id)) {
        expect(forma, id).toContain('elipsoide, sem malha');
      } else {
        expect(forma, id).toBeUndefined();
      }
    }
    // O elipsoide no lugar da malha medida é ARTIFÍCIO, e leva o tier que
    // diz isso — a mesma palavra que o selo usa para a cruz de luz.
    const linhas = ficha('vesta')!.secoes.find((s) => s.id === 'imagem')!.linhas;
    expect(linhas.find((l) => l.rotulo === 'forma')!.procedencia).toBe('artistico');
  });

  it('os cinco sem textura dizem que a superfície é inventada', () => {
    // Palas, Haumea, Makemake, Éris e Quaoar — `superficie: procedural` em
    // `rochoso.ts`, e é o terceiro tier do selo estreando nesta peça.
    for (const id of ['pallas', 'haumea', 'makemake', 'eris', 'quaoar']) {
      const linhas = ficha(id)!.secoes.find((s) => s.id === 'imagem')!.linhas;
      const superficie = linhas.find((l) => l.rotulo === 'superfície')!;
      expect(superficie.valor, id).toContain('inventados');
      expect(superficie.procedencia, id).toBe('artistico');
      expect(linhas.find((l) => l.rotulo === 'licença'), id).toBeUndefined();
    }
  });

  it('sem o manifesto a seção some inteira, sem uma linha a explicar', () => {
    const f = montarFicha({
      id: 'ceres',
      jd: JD,
      fonte: motor,
      editorial: porId.get('ceres'),
      texturas: null,
    })!;
    expect(f.secoes.map((s) => s.id)).not.toContain('imagem');
  });

  it('a fonte de um canal é a variante MAIS LARGA, e não o webp reencodado', () => {
    // A Terra tem `map.jpg` e `map.webp` com a MESMA largura, e só o
    // primeiro carrega a procedência da fonte declarada: o webp é reencode
    // nosso. Escolher pela largura sozinha daria 'derivado' na metade das
    // vezes, conforme a ordem em que o manifesto foi varrido.
    const variantes = texturas.entradas.filter(
      (e) => e.corpo === 'earth' && e.canal === 'map'
    );
    const maisLarga = Math.max(...variantes.map((e) => e.larguraPx));
    expect(variantes.filter((e) => e.larguraPx === maisLarga).length).toBeGreaterThan(1);
    const fonteDaLinha = ficha('earth')!
      .secoes.find((s) => s.id === 'imagem')!
      .linhas.find((l) => l.rotulo === 'fonte')!;
    expect(fonteDaLinha.procedencia).toBe('medido');
    expect(fonteDaLinha.fonte).toMatch(/px de largura$/);
  });
});

describe('iluminado daqui — o ponto de vista da câmera (item 74, parte B)', () => {
  // A CÂMERA NO LUGAR DA TERRA tem de dar a MESMA resposta que a seção "no
  // céu" dá: as duas perguntas usam a mesma conta e diferem só no vértice.
  // Se um dia os dois números divergirem com o observador no mesmo ponto, um
  // dos dois caminhos passou a medir outra coisa.
  const daTerra = motor.posicaoHeliocentrica('earth', JD);
  const naTerra: [number, number, number] = [daTerra.x, daTerra.y, daTerra.z];

  it('com a câmera na Terra, "daqui" bate com "visto da Terra"', () => {
    for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'moon']) {
      const f = montarFicha({
        id,
        jd: JD,
        fonte: motor,
        editorial: porId.get(id),
        texturas,
        camaraUa: naTerra,
      })!;
      const daqui = f.secoes
        .find((s) => s.id === 'agora')!
        .linhas.find((l) => l.rotulo === 'iluminado daqui')!.valor;
      const doCeu = f.secoes
        .find((s) => s.id === 'ceu')!
        .linhas.find((l) => l.rotulo === 'disco iluminado')!.valor;
      expect(daqui, id).toBe(doCeu);
    }
  });

  it('a linha VALE PARA LUA DE PLANETA, que a seção "no céu" não cobre', () => {
    // Titã não ganha elongação (a dele fica a menos de um grau da de
    // Saturno e seria ruído), mas a fase DELE visto de perto é o que está
    // na tela.
    const f = montarFicha({
      id: 'titan',
      jd: JD,
      fonte: motor,
      editorial: porId.get('titan'),
      texturas,
      camaraUa: naTerra,
    })!;
    expect(f.secoes.map((s) => s.id)).not.toContain('ceu');
    const agora = f.secoes.find((s) => s.id === 'agora')!;
    expect(agora.linhas.map((l) => l.rotulo)).toContain('iluminado daqui');
  });

  it('a câmera ENTRE o Sol e o corpo vê o disco CHEIO; atrás dele, escuro', () => {
    // Falsificação, não amostra: pondo a câmera na linha Sol–Marte, dos dois
    // lados, os dois extremos têm de aparecer.
    const marte = motor.posicaoHeliocentrica('mars', JD);
    const r = Math.hypot(marte.x, marte.y, marte.z);
    const dentro: [number, number, number] = [
      (marte.x / r) * (r - 0.5),
      (marte.y / r) * (r - 0.5),
      (marte.z / r) * (r - 0.5),
    ];
    const fora: [number, number, number] = [
      (marte.x / r) * (r + 0.5),
      (marte.y / r) * (r + 0.5),
      (marte.z / r) * (r + 0.5),
    ];
    const ler = (cam: [number, number, number]) =>
      montarFicha({ id: 'mars', jd: JD, fonte: motor, editorial: porId.get('mars'), camaraUa: cam })!
        .secoes.find((s) => s.id === 'agora')!
        .linhas.find((l) => l.rotulo === 'iluminado daqui')!.valor;
    expect(ler(dentro)).toBe('100%');
    expect(ler(fora)).toBe('0%');
  });

  it('sem câmera a linha some — fora do Atlas não há "daqui"', () => {
    const f = montarFicha({ id: 'mars', jd: JD, fonte: motor, editorial: porId.get('mars') })!;
    const agora = f.secoes.find((s) => s.id === 'agora')!;
    expect(agora.linhas.map((l) => l.rotulo)).not.toContain('iluminado daqui');
    // e o Sol não tem "daqui" nem com câmera: ele é a fonte da luz
    const sol = montarFicha({ id: 'sun', jd: JD, fonte: motor, camaraUa: naTerra })!;
    expect(sol.secoes.map((s) => s.id)).not.toContain('agora');
  });
});

describe('a ficha de ESTRELA — medida e derivada, nunca editorial', () => {
  const sirius = starsMeta.named.find((s) => s.n === 'Sirius')!;
  const linhasDe = (f: Ficha) => new Map(f.secoes[0]?.linhas.map((l) => [l.rotulo, l]) ?? []);

  it('Sirius traz designação, distância, magnitude, tipo, cor e temperatura', () => {
    const f = montarFichaDeEstrela('Sirius', sirius)!;
    expect(f.nome).toBe('Sirius');
    expect(f.classe).toBe('estrela');
    expect(f.secoes).toHaveLength(1);
    const l = linhasDe(f);
    expect(l.get('designação')!.valor).toBe('α Canis Majoris');
    expect(l.get('distância')!.valor).toBe('8,6 anos-luz');
    expect(l.get('magnitude aparente')!.valor).toBe('-1,44');
    expect(l.get('tipo espectral')!.valor).toBe(sirius.s);
    expect(l.get('cor B−V')!.valor).toBe('0,009');
    expect(l.get('catálogos')!.valor).toBe('HD 48915 · HIP 32349 · Gl 244A');
  });

  it('a temperatura é DERIVADA, e é o primeiro consumidor de tela de temperatureFromBV', () => {
    const linha = linhasDe(montarFichaDeEstrela('Sirius', sirius)!).get('temperatura')!;
    expect(linha.procedencia).toBe('derivado');
    expect(linha.fonte).toContain('Ballesteros');
    // três algarismos significativos: Ballesteros não vale mais que isso, e
    // "9927 K" fingiria uma precisão que a fórmula não tem.
    const t = temperatureFromBV(sirius.ci!);
    expect(linha.valor).toBe(`${Number(t.toPrecision(3))} K`);
    expect(t).toBeGreaterThan(9000);
    expect(t).toBeLessThan(11000);
  });

  it('a distância sai na escada da casa: anos-luz, nunca parsec', () => {
    for (const estrela of starsMeta.named.slice(0, 200)) {
      const l = linhasDe(montarFichaDeEstrela(estrela.n, estrela)!);
      const d = l.get('distância')!.valor;
      expect(d, estrela.n).toMatch(/anos?-luz$/);
      expect(d, estrela.n).not.toContain('pc');
    }
  });

  it('nenhuma estrela do catálogo monta linha vazia, e nenhuma tem prosa', () => {
    const EDITORIAL = ['o que é', 'curiosidade', 'fato', 'recorde', 'exploração'];
    for (const estrela of starsMeta.named) {
      const f = montarFichaDeEstrela(estrela.n, estrela)!;
      expect(f.secoes.length, estrela.n).toBe(1);
      for (const l of f.secoes[0]!.linhas) {
        expect(l.valor.length, `${estrela.n}/${l.rotulo}`).toBeGreaterThan(0);
        expect(`${l.valor}`, `${estrela.n}/${l.rotulo}`).not.toMatch(/undefined|NaN/);
        expect(EDITORIAL, estrela.n).not.toContain(l.rotulo);
      }
    }
  });

  it('as 204 sem Bayer não inventam designação', () => {
    const semBayer = starsMeta.named.filter((s) => !s.b);
    expect(semBayer.length).toBeGreaterThan(0);
    for (const estrela of semBayer) {
      const l = linhasDe(montarFichaDeEstrela(estrela.n, estrela)!);
      expect(l.has('designação'), estrela.n).toBe(false);
      // e o resto continua de pé
      expect(l.has('distância'), estrela.n).toBe(true);
    }
  });

  it('sem NamedStar sobra o cabeçalho — é o caso de Sagittarius A✱', () => {
    const f = montarFichaDeEstrela('Sagittarius A✱', null)!;
    expect(f.nome).toBe('Sagittarius A✱');
    expect(f.secoes).toEqual([]);
    expect(montarFichaDeEstrela('')).toBeNull();
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
      'imagem',
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
    // e a IMAGEM dele fica de fora de propósito: o Sol não tem textura, tem
    // a LEI-DA-ESTRELA — uma linha aqui seria a segunda fonte sobre isso.
    expect(ids).not.toContain('imagem');
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

describe('a massa na ficha', () => {
  // A GRAFIA em si (a potência de dez, a recusa de massa sem medida) é de
  // `formatarMassaKg` e o gate dela é `unidades.test.ts`. Aqui se cobra o
  // outro lado: que a ficha USE essa grafia, e não outra.
  it('é a grafia que a ficha usa de verdade', () => {
    const fisico = ficha('earth')!.secoes.find((s) => s.id === 'fisico')!;
    expect(fisico.linhas.find((l) => l.rotulo === 'massa')!.valor).toBe(
      '5,97 × 10²⁴ kg'
    );
  });
});
