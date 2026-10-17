// Serve: lei — a ficha monta completa, honesta e silenciosa para os 48 alvos, com a efeméride e o corpos.json reais
// ============================================================
// A FICHA — a montagem julgada com a efeméride REAL e o `corpos.json` real.
// O que se cobra aqui é o contrato que a tela depende: completude (todo
// alvo monta), honestidade (nenhum rótulo de procedência fora do selo) e
// silêncio (campo ausente não vira linha).
// ============================================================
import { afterEach, describe, expect, it } from 'vitest';
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
import type { EntradaDeTextura, ManifestDeTexturas } from '../../three/world/corpos/texturas';
import type { CorpoNoJson, CorposDoAtlas, EditorialDoCorpo, Ficha } from './ficha';
import { formatarDuracao, montarFicha, montarFichaDeEstrela } from './ficha';
import { temperatureFromBV } from './stellarPhysics';
import { dateToTDB } from './time';
import { definirIdioma } from '../idioma';

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
 * O INGLÊS DA FONTE — e ele é lido daqui DE PROPÓSITO, mesmo depois de a
 * F2 do item 130 o ter feito atravessar para `corpos.json`. Ele é a
 * RÉGUA da tradução: as duas provas de fidelidade abaixo perguntam se o
 * pt-BR do artefato bate com o original do dono, e ler as duas pontas do
 * mesmo arquivo não perguntaria nada. Quem confere o artefato CONTRA a
 * fonte é o `verify-assets`, campo a campo.
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

const todasAsLinhas = (f: Ficha) => f.secoes.flatMap((s) => s.linhas);

describe('completude — todo alvo do Atlas monta ficha', () => {
  // 39 → 48 no item 134/S3: as nove luas esculpidas de Saturno entraram
  // na lista de alvos do Atlas.
  it('são 48 alvos e os 48 montam', () => {
    expect(ALVOS).toHaveLength(48);
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
  it('todo rótulo de procedência sai de PROCEDENCIA — e só a seção da imagem tem linha sem selo', () => {
    const permitidos = new Set(Object.keys(PROCEDENCIA));
    for (const id of ALVOS) {
      for (const secao of ficha(id)!.secoes) {
        for (const l of secao.linhas) {
          if (l.procedencia === undefined) {
            expect(secao.id, `${id}/${l.rotulo}`).toBe('imagem');
            continue;
          }
          expect(permitidos.has(l.procedencia), `${id}/${l.rotulo}`).toBe(true);
        }
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
  // EM LAÇO, e não uma passada só: com dois grupos de milhar ("12,950,000")
  // uma passada come o primeiro separador e deixa o segundo, e aí as duas
  // línguas se partem em lugares diferentes — o inglês em {12950, 000} e o
  // português em {12950.000}, um falso "sumiu na tradução" (Febe, 134/S3).
  const padrao = new RegExp(`(\\d)\\${milhar}(\\d\\d\\d)(?!\\d)`, 'g');
  let semMilhar = texto;
  for (let antes = ''; antes !== semMilhar; ) {
    antes = semMilhar;
    semMilhar = semMilhar.replaceAll(padrao, '$1$2');
  }
  const normalizado =
    decimal === ',' ? semMilhar.replaceAll(/(\d),(\d)/g, '$1.$2') : semMilhar;
  return new Set(normalizado.match(/\d+(?:\.\d+)?/g) ?? []);
}

describe('a língua — o texto é pt-BR e a tela não tem inglês (item 74, parte B)', () => {
  it('os 48 alvos têm as duas seções de prosa, e nenhuma nasce vazia', () => {
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
    // O que a CASA escreveu na mesma seção — as quatro linhas da confissão
    // e a fonte do relevo — continua no varredor.
    const CITACAO_DE_LICENCA = new Set(['fonte', 'licença', 'atribuição']);
    for (const id of ALVOS) {
      for (const l of todasAsLinhas(ficha(id)!)) {
        if (CITACAO_DE_LICENCA.has(l.rotulo)) continue;
        const naTela = `${l.rotulo} ${l.valor} ${l.badge ?? ''} ${l.fonte ?? ''}`;
        for (const palavra of naTela.split(/[^\p{L}]+/u)) {
          // NOME PRÓPRIO PASSA, prosa não: o item 140 pôs a linha
          // "relevo" na ficha da Lua citando o produto da NASA pelo nome
          // ("CGI Moon Kit"), que é como o arquivo se procura e não se
          // traduz. A distinção é a MAIÚSCULA — uma frase inglesa que
          // vazasse traria "the", "of", "moon" em caixa baixa, e essas
          // continuam reprovando.
          if (palavra !== palavra.toLowerCase()) continue;
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

describe('a imagem confessa — quatro linhas com selo e o crédito sem selo (R3)', () => {
  afterEach(() => definirIdioma('pt-BR'));

  const linhasDaImagem = (id: string, manifest: ManifestDeTexturas = texturas) =>
    montarFicha({ id, jd: JD, fonte: motor, editorial: porId.get(id), texturas: manifest })!
      .secoes.find((s) => s.id === 'imagem')!.linhas;
  const linhaDe = (id: string, rotulo: string) =>
    linhasDaImagem(id).find((l) => l.rotulo === rotulo)!;
  const QUATRO = ['forma', 'relevo', 'cor', 'brilho'];
  const CREDITO = ['fonte', 'licença', 'atribuição', 'fonte do relevo'];
  const SO_ATMOSFERA = ['jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'titan'];

  it('todo corpo abre com forma, relevo, cor e brilho, e o crédito vem depois, sem selo', () => {
    // 47 dos 48: o Sol não entra (a imagem dele é a Lei da Estrela).
    for (const id of ALVOS.filter((i) => i !== 'sun')) {
      const linhas = linhasDaImagem(id);
      expect(linhas.slice(0, 4).map((l) => l.rotulo), id).toEqual(QUATRO);
      expect(linhas.slice(4).every((l) => CREDITO.includes(l.rotulo)), id).toBe(true);
      for (const l of linhas.slice(4)) expect(l.procedencia, `${id}/${l.rotulo}`).toBeUndefined();
      const temMapa = texturas.entradas.some((e) => e.corpo === id && e.canal === 'map');
      if (temMapa) {
        for (const rotulo of ['fonte', 'licença', 'atribuição']) {
          expect(linhas.find((l) => l.rotulo === rotulo)?.valor, `${id}/${rotulo}`).toBeTruthy();
        }
      }
    }
  });

  it('forma: sem linha na tabela é o elipsoide dos eixos medidos; com linha, o selo é o da tabela', () => {
    // A tabela "a forma" do ASSETS.md: os três elipsoides (ou esferas) no
    // lugar da malha publicada, as sete esculpidas por código e as duas luas
    // de Marte e Vesta com o modelo de forma medido no mapa de altura (16/10/2026).
    const COM_MALHA_PUBLICADA = ['pallas', 'hygiea', 'haumea'];
    const ESCULPIDAS = ['daphnis', 'atlas', 'prometheus', 'pandora', 'janus', 'epimetheus', 'phoebe'];
    const FORMA_MEDIDA: Record<string, [string, string]> = {
      phobos: ['Gaskell', 'medido'],
      deimos: ['Thomas', 'derivado'],
      vesta: ['equipe de gravidade da Dawn', 'derivado'],
    };
    for (const id of ALVOS.filter((i) => i !== 'sun')) {
      const forma = linhaDe(id, 'forma');
      const medida = FORMA_MEDIDA[id];
      if (medida) {
        expect(forma.valor, id).toContain(medida[0]);
        expect(forma.procedencia, id).toBe(medida[1]);
      } else if (COM_MALHA_PUBLICADA.includes(id)) expect(forma.valor, id).toContain('sem malha');
      else if (ESCULPIDAS.includes(id)) {
        expect(forma.valor, id).toContain('geometria esculpida por código');
      } else {
        expect(forma.valor, id).toMatch(/^elipsoide dos eixos medidos/);
        expect(forma.procedencia, id).toBe('medido');
      }
    }
    // Hipérion e Pã têm a forma medida por mapa de altura: a frase diz isso
    expect(linhaDe('hyperion', 'forma').valor).toContain('mapa de altura');
    expect(linhaDe('mars', 'forma').valor).toBe('elipsoide dos eixos medidos');
    // o selo vem da coluna `selo` (manifesto regenerado); sem ela, o piso
    const vesta = texturas.formas!.vesta;
    const comSelo: ManifestDeTexturas = {
      ...texturas,
      formas: { ...texturas.formas, vesta: { ...vesta, seloDaNota: 'derivado' } },
    };
    expect(linhasDaImagem('vesta', comSelo).find((l) => l.rotulo === 'forma')!.procedencia).toBe(
      'derivado'
    );
    const semSelo: ManifestDeTexturas = {
      ...texturas,
      formas: { ...texturas.formas, vesta: { pt: vesta.pt, en: vesta.en } },
    };
    expect(linhasDaImagem('vesta', semSelo).find((l) => l.rotulo === 'forma')!.procedencia).toBe(
      'artistico'
    );
  });

  it('relevo: atmosfera não se aplica e não leva selo; sem mapa de relevo é liso, artístico', () => {
    for (const id of SO_ATMOSFERA) {
      const relevo = linhaDe(id, 'relevo');
      expect(relevo.valor, id).toBe('não se aplica: o que se vê é atmosfera');
      expect(relevo.procedencia, id).toBeUndefined();
    }
    expect(linhaDe('miranda', 'relevo')).toMatchObject({
      valor: 'sem mapa de relevo: a esfera é lisa, e as sombras que se veem estão na própria imagem',
      procedencia: 'artistico',
    });
    // a esculpida não tem mapa nenhum: o relevo é o da malha feita por código
    expect(linhaDe('daphnis', 'relevo').valor).toContain('malha feita por código');
    expect(linhaDe('daphnis', 'relevo').procedencia).toBe('artistico');
    // com imagem, o selo é o da nota mais fraca; Mimas, Tétis e Dione admitem o texel
    for (const id of ['mimas', 'tethys', 'dione']) {
      expect(linhaDe(id, 'relevo').valor, id).toContain('1024 px');
      expect(linhaDe(id, 'relevo').procedencia, id).toBe('medido');
    }
    expect(linhaDe('iapetus', 'relevo').procedencia).toBe('artistico');
    expect(linhaDe('ceres', 'relevo').valor).toContain('137 m');
    // desde 16/10/2026 a forma (e o relevo sobre ela) vem do SPC da Dawn
    expect(linhaDe('vesta', 'fonte do relevo').valor).toContain('SPC');
  });

  it('cor: o mais fraco entre a nota do mapa e a política da régua', () => {
    // Vênus: a nota mede (topo de nuvens), a tinta deriva — vence a tinta,
    // e a frase dela entra junto, para o selo ter quem o explique
    const venus = linhaDe('venus', 'cor');
    expect(venus.procedencia).toBe('derivado');
    expect(venus.valor).toContain('luz visível');
    expect(venus.valor).toContain('tingido com a cor medida — Mallama+2017');
    // Europa: a nota deriva (cor inferida), a foto mede — vence a nota, sozinha
    const europa = linhaDe('europa', 'cor');
    expect(europa.procedencia).toBe('derivado');
    expect(europa.valor).toContain('INFERIDA');
    expect(europa.valor).not.toContain('foto em cor verdadeira');
    // sem nota, só a régua, citando a fonte da cor
    expect(linhaDe('jupiter', 'cor')).toMatchObject({
      valor: 'foto em cor verdadeira, média medida — Mallama+2017',
      procedencia: 'medido',
    });
    expect(linhaDe('daphnis', 'cor').procedencia).toBe('artistico');
    expect(linhaDe('pluto', 'cor').procedencia).toBe('artistico');
    for (const id of ['hygiea', 'pallas', 'haumea', 'makemake', 'eris', 'quaoar']) {
      expect(linhaDe(id, 'fonte').valor, id).toContain('IA');
      expect(linhaDe(id, 'cor').valor, id).toContain('não existe foto');
      expect(linhaDe(id, 'cor').procedencia, id).toBe('artistico');
    }
  });

  it('brilho: o p0 da régua, derivado quando o pico é modelo ou a média é estimada, e o γ < 1 dito', () => {
    expect(linhaDe('enceladus', 'brilho')).toMatchObject({
      valor:
        'albedo medido p0 = 0,89; contraste do mapa ×0,07 para não estourar — Filacchione+2022, VIMS equigonal 0,55 µm',
      procedencia: 'medido',
    });
    const vesta = linhaDe('vesta', 'brilho');
    expect(vesta.procedencia).toBe('derivado');
    expect(vesta.valor).toContain('pico de oposição tirado por modelo');
    // a foto F2 corrigida (16/10/2026) cabe sem compressão: γ = 1, nada a confessar
    expect(vesta.valor).not.toContain('contraste');
    // γ = 1 não confessa contraste nenhum
    expect(linhaDe('callisto', 'brilho').valor).not.toContain('contraste');
    const dafnis = linhaDe('daphnis', 'brilho');
    expect(dafnis.procedencia).toBe('derivado');
    expect(dafnis.valor).toContain('média estimada');
    // a Terra composta fica fora da régua: cor e brilho dizem isso, sem selo
    for (const rotulo of ['cor', 'brilho']) {
      expect(linhaDe('earth', rotulo).valor, rotulo).toContain('fora da régua');
      expect(linhaDe('earth', rotulo).procedencia, rotulo).toBeUndefined();
    }
  });

  it('a fonte citada leva a vírgula decimal da língua, e só ela muda', () => {
    // em pt, todo dígito-ponto-dígito da fonte da régua vira vírgula, ao lado do "0,31"
    expect(linhaDe('enceladus', 'brilho').valor).toMatch(/— Filacchione\+2022, VIMS equigonal 0,55 µm$/);
    expect(linhaDe('miranda', 'brilho').valor).toContain('— Buratti & Mosher 1991 (0,30–0,37)');
    expect(linhaDe('vesta', 'brilho').valor).toContain('(p, Dawn FC 554 nm); S(H,G), G = 0,32');
    // (Fobos, o exemplo até 16/10/2026, ganhou a nota da foto do Viking no lugar da fonte)
    expect(linhaDe('phoebe', 'cor').valor).toContain('— Grav & Bauer 2007 (−2,5 %/100 nm)');
    // em inglês a fonte fica como está escrita
    definirIdioma('en');
    expect(linhaDe('enceladus', 'brightness').valor).toMatch(/— Filacchione\+2022, VIMS equigonal 0\.55 µm$/);
    expect(linhaDe('vesta', 'brightness').valor).toContain('G = 0.32');
  });

  it('brilho: o nível que repousa numa suposição ou numa média (nivelDerivado) é derivado; o medido segue medido', () => {
    for (const id of ['iapetus', 'miranda', 'io', 'europa', 'ganymede', 'callisto']) {
      expect(linhaDe(id, 'brilho').procedencia, id).toBe('derivado');
    }
    expect(linhaDe('mimas', 'brilho').procedencia).toBe('medido');
  });

  it('nenhuma nota some: tudo o que a bancada e o crédito escrevem chega a uma linha, nas duas línguas', () => {
    for (const idioma of ['pt-BR', 'en'] as const) {
      definirIdioma(idioma);
      const na = (texto: { pt: string; en?: string } | null | undefined) =>
        texto && (idioma === 'en' ? (texto.en ?? texto.pt) : texto.pt);
      for (const id of ALVOS.filter((i) => i !== 'sun')) {
        const valores = linhasDaImagem(id).map((l) => l.valor);
        const doCanal = (canal: string) =>
          texturas.entradas.filter((e) => e.corpo === id && e.canal === canal);
        const [mapa, altura, normal] = [doCanal('map'), doCanal('height'), doCanal('normal')];
        const esperadas = [na(texturas.formas?.[id])];
        for (const e of [...mapa, ...altura, ...normal]) esperadas.push(na(e.nota));
        for (const e of mapa) {
          esperadas.push(na(e.origem?.fonte), na(e.origem?.licenca), na(e.origem?.atribuicao));
        }
        // a fonte do relevo é a da altura, e a das normais só sem altura — como sempre foi
        for (const e of altura.length > 0 ? altura : normal) esperadas.push(na(e.origem?.fonte));
        for (const frase of esperadas) {
          if (!frase) continue;
          expect(valores.some((v) => v.includes(frase)), `${idioma} ${id}: ${frase.slice(0, 50)}`).toBe(true);
        }
      }
    }
  });

  it('o selo em partes: o canal misto mostra cada tier com a porcentagem da área; o de um tier só fica como era', () => {
    // as partes que a coluna `selo` do ASSETS.md escreve (16/10/2026), postas
    // aqui no manifesto para a prova não depender da cadeia ter rodado
    const PARTES: Record<string, Pick<EntradaDeTextura, 'seloDaNota' | 'partes'>> = {
      'phobos/normal': { seloDaNota: 'inventado', partes: { medido: 21, derivado: 41, inventado: 38 } },
      'enceladus/height': { seloDaNota: 'inventado', partes: { medido: 94.4, derivado: 0.6, inventado: 5 } },
      'enceladus/normal': { seloDaNota: 'inventado', partes: { medido: 94.4, derivado: 0.6, inventado: 5 } },
      // escrita com uma parte medida, para provar o teto da régua: a tinta a faz derivada
      'deimos/map': { seloDaNota: 'inventado', partes: { medido: 14, inventado: 86 } },
      'phobos/map': { seloDaNota: 'derivado', partes: { medido: 60, derivado: 40 } },
    };
    const misto: ManifestDeTexturas = {
      ...texturas,
      formas: { ...texturas.formas, deimos: { ...texturas.formas!.deimos!, seloDaNota: 'derivado', partes: { medido: 90, derivado: 10 } } },
      entradas: texturas.entradas.map((e) => {
        const p = PARTES[`${e.corpo}/${e.canal}`];
        return p ? { ...e, ...p } : e;
      }),
    };
    const partes = (id: string, rotulo: string) =>
      linhasDaImagem(id, misto).find((l) => l.rotulo === rotulo)!;
    // Fobos: o relevo leva as partes da normal (o fino); a altura é a forma inteira, medida
    expect(partes('phobos', 'relevo')).toMatchObject({
      procedencia: 'artistico',
      partes: [
        { procedencia: 'medido', texto: 'medido 21 %' },
        { procedencia: 'derivado', texto: 'derivado 41 %' },
        { procedencia: 'artistico', texto: 'artístico 38 %' },
      ],
    });
    expect(partes('enceladus', 'relevo').partes!.map((p) => p.texto)).toEqual([
      'medido 94,4 %',
      'derivado 0,6 %',
      'artístico 5 %',
    ]);
    expect(partes('deimos', 'forma')).toMatchObject({
      procedencia: 'derivado',
      partes: [
        { procedencia: 'medido', texto: 'medido 90 %' },
        { procedencia: 'derivado', texto: 'derivado 10 %' },
      ],
    });
    // a cor tem o teto da régua: o medido de um mapa tingido é derivado, e o que cai junto se soma
    expect(partes('deimos', 'cor').partes!.map((p) => p.texto)).toEqual(['derivado 14 %', 'artístico 86 %']);
    expect(partes('phobos', 'cor')).toMatchObject({ procedencia: 'derivado' });
    expect(partes('phobos', 'cor').partes).toBeUndefined();
    // sem partes, a linha é a de sempre
    expect(partes('mars', 'relevo').partes).toBeUndefined();
    expect(partes('pallas', 'forma').partes).toBeUndefined();
    // em inglês, o rótulo do tier e o ponto decimal da língua
    definirIdioma('en');
    expect(partes('phobos', 'relief').partes!.map((p) => p.texto)).toEqual([
      'measured 21 %',
      'derived 41 %',
      'artistic 38 %',
    ]);
    expect(partes('enceladus', 'relief').partes!.map((p) => p.texto)).toEqual([
      'measured 94.4 %',
      'derived 0.6 %',
      'artistic 5 %',
    ]);
  });

  it('o relevo realçado da Terra (item 232) se confessa SÓ quando ligado, antes da nota «sem exagero»', () => {
    const imagem = (realceDoRelevo?: number) =>
      montarFicha({ id: 'earth', jd: JD, fonte: motor, editorial: porId.get('earth'), texturas, realceDoRelevo })!
        .secoes.find((s) => s.id === 'imagem')!.linhas;
    for (const real of [imagem(), imagem(1)]) {
      expect(real.some((l) => l.rotulo === 'relevo realçado')).toBe(false);
    }
    const realcado = imagem(3);
    const i = realcado.findIndex((l) => l.rotulo === 'relevo realçado');
    expect(realcado[i]!.valor).toContain('3× maiores que as medidas');
    expect(realcado[i]!.procedencia).toBe('artistico');
    // a nota da bancada vem logo depois, na linha do relevo, e continua descrevendo o MAPA
    expect(realcado[i + 1]!.rotulo).toBe('relevo');
    expect(realcado[i + 1]!.valor).toContain('sem exagero');
    expect(realcado).toHaveLength(imagem().length + 1);
  });

  it('Hipérion e Pã: a pintura por IA na cor, o relevo fino inventado no relevo', () => {
    for (const id of ['hyperion', 'pan']) {
      expect(linhaDe(id, 'fonte').valor, id).toContain('IA');
      expect(linhaDe(id, 'fonte do relevo').valor, id).toContain('Thomas');
    }
    expect(linhaDe('hyperion', 'relevo').valor).toContain('poços');
    expect(linhaDe('pan', 'relevo').valor).toContain('INVENTADO');
    expect(linhaDe('pan', 'cor').valor).toContain('espectro medido');
    expect(linhaDe('ceres', 'cor').valor).toContain('tingimento');
    expect(linhaDe('titan', 'cor').valor).toContain('emendas');
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

  it('o crédito cita a variante MAIS LARGA, com a largura dela', () => {
    const variantes = texturas.entradas.filter((e) => e.corpo === 'earth' && e.canal === 'map');
    const maisLarga = Math.max(...variantes.map((e) => e.larguraPx));
    expect(maisLarga).toBe(8192);
    expect(variantes.some((e) => e.larguraPx < maisLarga)).toBe(true);
    const fonte = linhaDe('earth', 'fonte');
    expect(fonte.valor).toContain('Solar System Scope');
    expect(fonte.valor).toMatch(/· 8192 px de largura$/);
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
    // "Distância — {pai}" (maquetes m3/m13; o "ao {pai}" do Lote 5 errava
    // a Terra) — o rótulo em si é aparte do que este teste mede (a
    // UNIDADE), mas ele já provava o texto por acidente.
    expect(lua.linhas[0]!.rotulo).toBe('Distância — Terra');
    expect(lua.linhas[0]!.valor).toMatch(/mil km$/);
    const marte = ficha('mars')!.secoes.find((s) => s.id === 'agora')!;
    expect(marte.linhas[0]!.rotulo).toBe('Distância — Sol');
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

// ============================================================
// A PROSA EM DUAS LÍNGUAS (item 130/F2, lista do §19).
//
// O inglês da prosa é o ORIGINAL do dono e atravessa o gerador desde a
// F2; `editorialDoIdioma` escolhe em UM lugar, com o pt-BR de PISO. As
// duas coisas que podem quebrar sem ninguém ver:
//   · a ficha em inglês perder LINHA (um campo que só o pt tem, ou o
//     contrário) — o visitante em inglês leria uma ficha menor;
//   · o piso sumir — corpo sem `en` devolveria vazio em vez do pt.
//
// A prova é de COMPORTAMENTO: monta a ficha REAL nas duas línguas, com
// o `corpos.json` real, e compara a ESTRUTURA (seções e rótulos) contra
// o TEXTO (que tem de mudar).
// ============================================================
describe('a ficha nas duas línguas', () => {
  afterEach(() => definirIdioma('pt-BR'));

  /** só as seções de PROSA: o resto da ficha é número e efeméride */
  const SECOES_DE_PROSA = ['contexto', 'curiosidades'];

  const prosaDe = (id: string): { rotulos: string[]; textos: string[] } => {
    const f = ficha(id)!;
    const rotulos: string[] = [];
    const textos: string[] = [];
    for (const s of f.secoes) {
      if (!SECOES_DE_PROSA.includes(s.id)) continue;
      for (const l of s.linhas) {
        rotulos.push(`${s.id}/${l.rotulo}`);
        textos.push(l.valor);
      }
    }
    return { rotulos, textos };
  };

  it('os 48 corpos têm o MESMO número de linhas de prosa nas duas línguas', () => {
    const pt = new Map(ALVOS.map((id) => [id, prosaDe(id)]));
    definirIdioma('en');
    const divergentes: string[] = [];
    for (const id of ALVOS) {
      const en = prosaDe(id);
      if (en.rotulos.length !== pt.get(id)!.rotulos.length) {
        divergentes.push(`${id}: pt ${pt.get(id)!.rotulos.length} × en ${en.rotulos.length}`);
      }
    }
    expect(ALVOS.length).toBe(48);
    expect(divergentes).toEqual([]);
  });

  it('o TEXTO muda de língua — a ficha em inglês não é a portuguesa com outro rótulo', () => {
    const pt = prosaDe('saturn');
    definirIdioma('en');
    const en = prosaDe('saturn');
    expect(en.textos.length).toBeGreaterThan(4);
    // nenhuma linha de prosa ficou em português
    for (let i = 0; i < en.textos.length; i++) {
      expect(en.textos[i], `linha ${pt.rotulos[i]}`).not.toBe(pt.textos[i]);
    }
    // e os RÓTULOS também são os da tabela inglesa
    expect(en.rotulos.join('|')).not.toBe(pt.rotulos.join('|'));
  });

  it('corpo SEM `en` cai no português — o piso declarado', () => {
    const semEn: CorpoNoJson = JSON.parse(JSON.stringify(porId.get('saturn')!)) as CorpoNoJson;
    delete semEn.editorial!.en;
    const monta = () =>
      montarFicha({ id: 'saturn', jd: JD, fonte: motor, editorial: semEn, texturas });
    const emPt = monta()!;
    definirIdioma('en');
    const emEn = monta()!;
    const prosa = (f: Ficha) =>
      f.secoes
        .filter((s) => SECOES_DE_PROSA.includes(s.id))
        .flatMap((s) => s.linhas.map((l) => l.valor));
    // o TEXTO é o mesmo (o pt de piso), mas nenhuma linha some
    expect(prosa(emEn)).toEqual(prosa(emPt));
    expect(prosa(emEn).length).toBeGreaterThan(4);
  });

  it('e o piso não é um buraco: com `en`, a mesma ficha muda mesmo', () => {
    // a contraprova do teste acima — sem ela, um `editorialDoIdioma` que
    // devolvesse SEMPRE o pt passaria nos dois
    definirIdioma('en');
    const comEn = ficha('saturn')!;
    const semEn: CorpoNoJson = JSON.parse(JSON.stringify(porId.get('saturn')!)) as CorpoNoJson;
    delete semEn.editorial!.en;
    const piso = montarFicha({ id: 'saturn', jd: JD, fonte: motor, editorial: semEn, texturas })!;
    const prosa = (f: Ficha) =>
      f.secoes
        .filter((s) => SECOES_DE_PROSA.includes(s.id))
        .flatMap((s) => s.linhas.map((l) => l.valor))
        .join('|');
    expect(prosa(comEn)).not.toBe(prosa(piso));
  });

  // A NOTA DE VALIDADE (item 130) é `registroOrbital` + `notaDeValidade`
  // falando das duas bocas — a única prosa da ficha que não vem de
  // `corpos.json`. A prova aqui é a mesma dos testes acima, num campo a
  // mais: em inglês, a linha "model and validity" não pode sobrar com
  // nenhum fiapo do template ou dos fragmentos em pt-BR.
  it('a linha "modelo e validade" da órbita sai em inglês, sem resíduo de pt-BR', () => {
    definirIdioma('en');
    const ROTULO = 'model and validity';
    const RESIDUOS_PT = [
      'válid',
      'pior caso',
      'órbita',
      'série',
      'teoria',
      'Fora de',
      'Tabela embarcada',
      'medido dos',
      'sem validação',
      'a.C.',
      'd.C.',
    ];
    for (const id of ALVOS) {
      if (id === 'sun') continue;
      const orbita = ficha(id)!.secoes.find((s) => s.id === 'orbita');
      const linha = orbita?.linhas.find((l) => l.rotulo === ROTULO);
      expect(linha, id).toBeDefined();
      for (const residuo of RESIDUOS_PT) {
        expect(linha!.valor, `${id}: "${residuo}"`).not.toContain(residuo);
      }
    }
    const hiperion = ficha('hyperion')!
      .secoes.find((s) => s.id === 'orbita')!
      .linhas.find((l) => l.rotulo === ROTULO)!;
    expect(hiperion.valor).toContain('valid');
    expect(hiperion.valor).toContain('worst case');
  });
});
