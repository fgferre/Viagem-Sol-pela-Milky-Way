// ============================================================
// Busca das estrelas nomeadas — biblioteca PURA (Onda 5, fase F3).
// Alcance pela Decisão D4 do desenho: só as 1.726 de `meta.named`.
// Nada de fetch, de three e de React aqui — o array `named` entra
// injetado e a UI da F3 monta a paleta em cima do que sai.
//
// PROVENIÊNCIA (PLANO-ATLAS §2, linha `hygNameIndex` — "Renasce"): do
// doador atlas-orbital vem a INTENÇÃO — normalização NFD (teclado
// pt-BR digita sem acento), rubrica de score de 4 degraus, chave dupla
// abreviação/glifo grego. O código é novo e o dado é OUTRO: a casa
// guarda UM nome por estrela em `NamedStar.n` (nome próprio IAU quando
// existe, senão a designação de Bayer já em glifo), não as colunas
// `proper`/`bayer`/`con` do HYG.
//
// FICA DE FORA, declarado: a varredura linear das chaves HD/HIP em
// massa (medido no doador: 206k chaves = 27-32 ms POR TECLA no
// desktop). Aqui `hd`/`hip` são `Map` direto — a consulta numérica sai
// por acesso único, sem tocar as chaves de texto. O preço declarado: a
// numérica só acende COMPLETA ("hd 4891" não é prefixo de nada), que é
// o contrato da D4. A varredura de texto sobrevive porque o alcance é
// 1.726 estrelas (~5k chaves), não 328k.
//
// O MOTOR É O MiniSearch (7.2.0, MIT, sem dependências), e ele entra
// por BAIXO das regras da casa, não por cima: o degrau TOLERANTE (o
// quinto) é dele — índice invertido com distância de edição, o que a
// varredura de chaves não sabe fazer. Continuam da casa, acima dele: os
// quatro degraus (exato > prefixo > palavra > parcial, e o parcial é
// substring NO MEIO da palavra, que o MiniSearch não tem), o acesso
// direto hd/hip por Map, a normalização única (`normalizarConsulta`
// entra como `processTerm` nos dois lados) e todos os desempates. O
// degrau tolerante só ACENDE quando os quatro acharam ZERO — a
// tolerância é para consertar um erro de digitação, nunca para chutar.
//
// ADAPTAÇÃO DECLARADA: o doador guardava a abreviação ("Alp") e
// acrescentava o glifo; aqui a chave é a que se DIGITA — a abreviação
// de catálogo ("alp cen"), o glifo ("α cen") e o nome da letra nas duas
// línguas ("alfa cen", "alpha centauri"). O sobrescrito de Bayer (γ²
// Vel) vira dígito ASCII na normalização, e a designação existe com e
// sem ele.
//
// O VOCABULÁRIO BILÍNGUE (item 129/F5) entra por TRÊS tabelas de dado,
// e nenhuma palavra é redigitada aqui: `apelidosDeEstrelas` (sírio,
// north star, três marias), `atlas/constelacoes` (os nomes das 88 e o
// genitivo latino) e `lugaresDoFilme` (o centro galáctico). As DUAS
// línguas entram sempre, qualquer que seja o idioma da tela: quem
// digita "black hole" e quem digita "buraco negro" procuram a mesma
// coisa, e uma busca que só falasse a língua do momento perderia
// metade dos links que já circulam por aí.
// ============================================================
import MiniSearch from 'minisearch';
import type { NamedStar } from '../three/config';
import { APELIDOS_DE_ESTRELAS } from './apelidosDeEstrelas';
import { CONSTELACOES, NOMES_DAS_CONSTELACOES } from './atlas/constelacoes';
import { LUGARES_DO_FILME } from './lugaresDoFilme';
import { idiomaAtual } from './idioma';

/** um documento do motor: UMA chave normalizada do índice de texto */
interface ChaveIndexada {
  /** a posição da chave em `IndiceEstrelas.chaves` */
  id: number;
  texto: string;
}

/**
 * UM CORPO DO SISTEMA como alvo da busca. Ele entra no MESMO índice das
 * estrelas — um índice só, não dois: a alternativa (uma lista à parte na
 * paleta) obrigaria a UI a mesclar dois resultados ordenados por réguas
 * diferentes, e é assim que "Netuno" acaba embaixo de uma vizinha
 * qualquer que casou por prefixo.
 */
export interface CorpoBuscavel {
  /** id da camada de planetas ('earth') — o Director enquadra por ele */
  id: string;
  /** nome pt-BR: a CHAVE do índice e do `?foco=`, em qualquer língua */
  nome: string;
  /** nome inglês (item 130/F2): o que a LISTA mostra quando a casa fala
   *  inglês. Não entra no índice — quem já casa o termo em inglês é o `id`
   *  ('mars', 'charon'), anotado abaixo desde o item 126. */
  nomeEn?: string;
  /** a palavra da classe, no vocabulário da legenda */
  classe: string;
  /** raio da ÓRBITA em UA — é o que a lista mostra e o que o Atlas
   *  enquadra (D5: enquadra-se a órbita, não o corpo). Para uma LUA é a
   *  distância AO PAI (F2b/P-E10), e pode ser NaN enquanto a efeméride
   *  não chegou — a nota fica sem número, nunca com um inventado. */
  rUA: number;
  /** id do PAI, presente só nas luas — é ele que muda a régua da nota
   *  (km, não UA) e que o degrau "lua" mantém em quadro */
  pai?: string;
}

// A NOTA DE DISTÂNCIA (o degrau km/UA da emenda P-E10a) MUDOU DE CASA
// em 2026-08-14: ela era metade de uma escada cuja outra metade — o
// degrau dos anos-luz — estava copiada em três outros arquivos, com
// duas grafias e dois separadores decimais na mesma tela. A escada
// inteira passou a morar em `lib/unidades.ts`, e é de lá que a paleta
// de busca e os rótulos das estrelas a importam. Aqui ficou só a busca.

/**
 * UM LUGAR DO CÉU que não é estrela nem corpo do sistema — hoje só o
 * centro galáctico (`LUGARES_DO_FILME`). As PALAVRAS dele vêm da
 * tabela; a GEOMETRIA entra injetada, porque `GAL.GC_POS` mora no three
 * e esta biblioteca é pura (ver `LUGARES_DA_BUSCA`, em `useDirector`).
 */
export interface LugarBuscavel {
  /** o id da linha em `LUGARES_DO_FILME` — é a chave do link */
  id: string;
  /** o nome que o Director ANUNCIA no rótulo ('Sagittarius A✱'), que é
   *  por onde `chaveDoFoco` o reconhece em quadro */
  nome: string;
  /** distância ao Sol em PARSECS, como `NamedStar.d` — a nota da paleta */
  d: number;
  x: number;
  y: number;
  z: number;
}

/**
 * O que o índice guarda. As três famílias de alvo, com o TIPO declarado
 * em vez de inferido — quem consome decide o verbo (voar até uma
 * estrela, enquadrar a órbita de um corpo, voar até um lugar) olhando
 * esta etiqueta.
 */
export type EntradaDaBusca =
  | { tipo: 'estrela'; estrela: NamedStar }
  | { tipo: 'corpo'; corpo: CorpoBuscavel }
  | { tipo: 'lugar'; lugar: LugarBuscavel };

export interface ResultadoBusca {
  /** posição na array `entradas` do índice — a chave da lista na UI */
  indice: number;
  entrada: EntradaDaBusca;
  score: number;
}

export interface IndiceEstrelas {
  /** os corpos primeiro, as nomeadas depois — ver `construirIndice` */
  entradas: readonly EntradaDaBusca[];
  /** só as estrelas, para quem precisa contar o alcance do catálogo */
  nomeadas: readonly NamedStar[];
  /** chave normalizada → entradas (uma chave irmã pode servir a duas) */
  porChave: Map<string, number[]>;
  /** 'hd 48915' / 'hip 32349' → estrela, para o acesso direto */
  porCatalogo: Map<string, number>;
  /** nome de CONSTELAÇÃO (pt, en e latino) → as estrelas dela. Mapa à
   *  parte de propósito — ver o degrau `SCORE.constelacao` em `buscar` */
  porConstelacao: Map<string, number[]>;
  /** as chaves de `porChave` na ordem de inserção — a id do motor é a
   *  posição aqui, e é por ela que um achado volta a ser entrada */
  chaves: readonly string[];
  /** o motor das mesmas chaves, usado SÓ no degrau tolerante */
  tolerancia: MotorTolerante;
}

/**
 * O MOTOR VISTO DA FRONTEIRA — só o `search` que o degrau tolerante
 * chama. A instância continua sendo do MiniSearch, mas o tipo dele
 * (e o `ChaveIndexada`, que é interno) param aqui: quem importa
 * `IndiceEstrelas` — a paleta de busca — não tipa mais contra a
 * declaração da biblioteca.
 */
export interface MotorTolerante {
  search(
    consulta: string,
    opcoes: { prefix: boolean; fuzzy: (termo: string) => number; combineWith: 'AND' }
  ): { id: unknown; score: number }[];
}

/**
 * A rubrica, agora de 6 degraus: exato > prefixo > palavra interna >
 * parcial > CONSTELAÇÃO > aproximado. Os quatro primeiros são casamento
 * literal e nunca mudaram de valor; o quinto é a constelação como LUGAR
 * (item 129/F5) e o sexto é o do motor (distância de edição).
 *
 * POR QUE A CONSTELAÇÃO MORA EMBAIXO DOS QUATRO. Ela não casa com o
 * nome do alvo, casa com o ENDEREÇO dele: "andromeda" devolve 150
 * estrelas que não se chamam Andrômeda. Se valesse um degrau literal,
 * digitar "and" empurraria a constelação inteira para dentro do limite
 * de 8 e enterraria quem de fato começa com "and" — o preço que o
 * desenho desta fase mandou não pagar. Embaixo, ela só aparece no
 * espaço que sobra.
 */
export const SCORE = {
  exato: 140,
  prefixo: 110,
  palavra: 90,
  parcial: 75,
  constelacao: 60,
  aproximado: 40,
} as const;

/**
 * Glifo → como a letra se DIGITA: a abreviação de catálogo (a coluna
 * `bayer` do HYG) e o nome dela nas DUAS línguas — pt primeiro, en
 * depois, e uma forma só quando as duas coincidem. O inglês entrou no
 * item 129/F5: a busca indexa as duas línguas sempre, independente do
 * idioma da tela, e sem ele "alpha centauri" ficava fora.
 */
const GREGAS: Record<string, readonly string[]> = {
  α: ['alp', 'alfa', 'alpha'], β: ['bet', 'beta'], γ: ['gam', 'gama', 'gamma'],
  δ: ['del', 'delta'], ε: ['eps', 'epsilon'], ζ: ['zet', 'zeta'], η: ['eta'],
  θ: ['the', 'teta', 'theta'], ι: ['iot', 'iota'], κ: ['kap', 'capa', 'kappa'],
  λ: ['lam', 'lambda'], μ: ['mu', 'mi'], ν: ['nu', 'ni'], ξ: ['xi', 'csi'],
  ο: ['omi', 'omicron'], π: ['pi'], ρ: ['rho', 'ro'], σ: ['sig', 'sigma'],
  τ: ['tau'], υ: ['ups', 'ipsilon', 'upsilon'], φ: ['phi', 'fi'],
  χ: ['chi', 'qui'], ψ: ['psi'], ω: ['ome', 'omega'],
};

/**
 * Normaliza consulta e chave pela MESMA lei: NFKD (o NFD do doador mais
 * a dobra dos sobrescritos, γ² → γ2 — ninguém digita "²"; medido: nos
 * 1.726 nomes é a ÚNICA diferença entre NFD e NFKD), tira os
 * diacríticos que sobraram (Tupã → tupa), minúsculas, apara e colapsa
 * espaços.
 */
export function normalizarConsulta(valor: string): string {
  return valor
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * AS CHAVES DE UMA DESIGNAÇÃO DE BAYER — "α¹ Cen" vira "α1 cen",
 * "α cen", "alfa1 cen", "alfa cen", "alpha centauri"… e assim por
 * diante, o glifo e as formas da letra cruzados com a SIGLA e com o
 * GENITIVO latino.
 *
 * UMA LEI SÓ (item 129/F5). Até aqui isto se chamava `chavesIrmas` e
 * saía do NOME (`n`), o que só alcançava as 1.151 estrelas cujo nome JÁ
 * era a designação — nas outras 575 o nome próprio da IAU tinha
 * expulsado o Bayer e "alfa cen" caía no vazio. Agora sai dos campos
 * `b`/`c` do catálogo, que existem em 1.522 delas, e é por isso que
 * "alfa cen" acha Rigil Kentaurus. Medido: nas 1.151 que o caminho
 * velho cobria, `b`+`c` reproduzem o nome partido ao meio, letra a
 * letra — a lei nova contém a velha, não a contradiz.
 *
 * O SOBRESCRITO ENTRA E SAI: "α¹ Cen" responde a "alfa1 cen" (a
 * designação inteira) e também a "alfa cen" (quem procura a estrela do
 * Centauro não sabe que ela é a primeira de um par). A normalização
 * dobra "¹" em "1" — aqui só se decide QUAIS formas existem.
 */
function chavesDeBayer(letra: string, sigla: string): string[] {
  const nua = letra.replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, '');
  const sufixo = letra.slice(nua.length);
  const formas = [nua, ...(GREGAS[nua] ?? [])];
  const todas = sufixo ? [...formas.map((f) => f + sufixo), ...formas] : formas;
  const genitivo = CONSTELACOES[sigla];
  const chaves: string[] = [];
  for (const forma of todas) {
    chaves.push(`${forma} ${sigla}`);
    if (genitivo) chaves.push(`${forma} ${genitivo}`);
  }
  return chaves;
}

/** nome da estrela → apelidos populares nas duas línguas (item 129/F5) */
const APELIDOS = new Map(APELIDOS_DE_ESTRELAS.map((a) => [a.nome, [...a.pt, ...a.en]]));

/**
 * `corpos` é opcional e vem VAZIO fora do Atlas: é lá que existe o verbo
 * "enquadrar a órbita". No voo livre a escolha VOA, e voar até a Terra
 * pararia a 0,8 pc dela — a lei de aproximação do voo é de estrelas —,
 * ou seja, prometeria um destino que a fase não entrega.
 */
export function construirIndice(
  nomeadas: readonly NamedStar[],
  corpos: readonly CorpoBuscavel[] = [],
  lugares: readonly LugarBuscavel[] = []
): IndiceEstrelas {
  const porChave = new Map<string, number[]>();
  const porCatalogo = new Map<string, number>();
  const anotar = (bruta: string, indice: number) => {
    const chave = normalizarConsulta(bruta);
    if (!chave) return;
    const lista = porChave.get(chave);
    if (!lista) porChave.set(chave, [indice]);
    else if (!lista.includes(indice)) lista.push(indice);
  };
  // OS CORPOS PRIMEIRO — dez corpos contra 1.726 estrelas, e quem
  // digita "terra" está em casa procurando casa. Quem os põe na frente
  // no resultado é `ordemDoTipo`, não esta ordem: desde o item 115 o
  // índice é só o ÚLTIMO critério do `buscar`, o que sobra para dois
  // alvos com nome idêntico. Os LUGARES vêm logo atrás (é um só).
  const entradas: EntradaDaBusca[] = [
    ...corpos.map((corpo) => ({ tipo: 'corpo', corpo }) as const),
    ...lugares.map((lugar) => ({ tipo: 'lugar', lugar }) as const),
    ...nomeadas.map((estrela) => ({ tipo: 'estrela', estrela }) as const),
  ];
  /** nome da estrela → entrada, só para casar as tabelas de vocabulário */
  const porNome = new Map<string, number>();
  /** id do lugar → entrada, idem */
  const porIdDeLugar = new Map<string, number>();
  /** sigla da constelação → as estrelas dela, antes de virar nome */
  const porSigla = new Map<string, number[]>();
  entradas.forEach((entrada, indice) => {
    if (entrada.tipo === 'corpo') {
      anotar(entrada.corpo.nome, indice);
      // O ID INGLÊS TAMBÉM É CHAVE (item 126): `?foco=mars` caía na
      // estrela Marsic porque "mars" não é começo de "marte", e a única
      // chave que casava era a da estrela. O id é o nome inglês do corpo
      // ('mars', 'earth', 'moon'), que casa por degrau EXATO e vence
      // qualquer prefixo — o link escrito em inglês pousa no planeta.
      // O que a UI ESCREVE segue sendo o nome (`chaveDeLink`); isto é só
      // o lado que LÊ. "jupiter" é id e nome ao mesmo tempo: `anotar`
      // não repete a mesma entrada na mesma chave.
      anotar(entrada.corpo.id, indice);
      return;
    }
    if (entrada.tipo === 'lugar') {
      // o id é a CHAVE DO LINK (`?foco=sagittarius-a`) e o nome é o que
      // o Director anuncia; as palavras das duas línguas entram abaixo,
      // da tabela, junto com as dos lugares que são estrela
      anotar(entrada.lugar.id, indice);
      anotar(entrada.lugar.nome, indice);
      porIdDeLugar.set(entrada.lugar.id, indice);
      return;
    }
    const estrela = entrada.estrela;
    anotar(estrela.n, indice);
    porNome.set(estrela.n, indice);
    // A DESIGNAÇÃO DE BAYER de TODA estrela que tenha letra e sigla —
    // 1.522 delas, o nome próprio não a expulsa mais (item 129/F5)
    if (estrela.b && estrela.c) {
      for (const chave of chavesDeBayer(estrela.b, estrela.c)) anotar(chave, indice);
    }
    // A CONSTELAÇÃO NÃO VIRA CHAVE DE TEXTO, e é a decisão desta fase:
    // "andromedae" em 150 estrelas encheria os degraus literais de
    // endereço. Ela vai para um mapa à parte, consultado no degrau
    // próprio (`SCORE.constelacao`). O GENITIVO acima é a exceção
    // declarada: ele é parte da designação que se digita ("alfa
    // centauri"), e por isso paga o preço de casar também por palavra.
    if (estrela.c) {
      const lista = porSigla.get(estrela.c);
      if (lista) lista.push(indice);
      else porSigla.set(estrela.c, [indice]);
    }
    for (const apelido of APELIDOS.get(estrela.n) ?? []) anotar(apelido, indice);
    if (estrela.gl) anotar(estrela.gl, indice);
    if (estrela.hd !== undefined) porCatalogo.set(`hd ${estrela.hd}`, indice);
    if (estrela.hip !== undefined) porCatalogo.set(`hip ${estrela.hip}`, indice);
  });
  // OS LUGARES DO FILME, as duas línguas. Uma linha da tabela aponta ou
  // para um lugar injetado (o centro galáctico) ou para uma ESTRELA do
  // catálogo — e nesse caso as palavras dela viram apelido da estrela,
  // que é o alvo de verdade. Linha sem alvo no índice é silêncio.
  for (const lugar of LUGARES_DO_FILME) {
    const alvo =
      'estrela' in lugar.alvo
        ? porNome.get(lugar.alvo.estrela)
        : porIdDeLugar.get(lugar.id);
    if (alvo === undefined) continue;
    for (const palavra of [...lugar.pt, ...lugar.en]) anotar(palavra, alvo);
  }
  // As 88 constelações pelo NOME — latino, pt e en, as três sempre.
  const porConstelacao = new Map<string, number[]>();
  for (const [sigla, estrelas] of porSigla) {
    const nomes = NOMES_DAS_CONSTELACOES[sigla];
    if (!nomes) continue;
    for (const nome of [nomes.la, nomes.pt, nomes.en]) {
      const chave = normalizarConsulta(nome);
      const lista = porConstelacao.get(chave);
      // "Cruzeiro do Sul" é o pt de Cru e nada mais; mas duas siglas
      // podem cair na mesma palavra e a lista soma, nunca se sobrescreve
      if (lista) for (const i of estrelas) { if (!lista.includes(i)) lista.push(i); }
      else porConstelacao.set(chave, [...estrelas]);
    }
  }
  // O MOTOR RECEBE AS MESMAS CHAVES, uma por documento (não uma por
  // estrela): é o que faz "sirius" pontuar mais alto na chave "sirius"
  // do que na "sirius b" — o MiniSearch normaliza pelo comprimento do
  // campo. `processTerm` é a normalização da casa, então indexação e
  // consulta passam pela MESMA lei e o índice não guarda acento nenhum.
  const chaves = [...porChave.keys()];
  const tolerancia = new MiniSearch<ChaveIndexada>({
    fields: ['texto'],
    processTerm: (termo) => normalizarConsulta(termo) || null,
  });
  tolerancia.addAll(chaves.map((texto, id) => ({ id, texto })));
  return { entradas, nomeadas, porChave, porCatalogo, porConstelacao, chaves, tolerancia };
}

function pontuar(chave: string, consulta: string): number {
  if (chave === consulta) return SCORE.exato;
  if (chave.startsWith(consulta)) return SCORE.prefixo;
  for (const palavra of chave.split(' ')) {
    if (palavra.startsWith(consulta)) return SCORE.palavra;
  }
  return chave.includes(consulta) ? SCORE.parcial : 0;
}

/**
 * O nome que a entrada mostra, seja ela de que família for — e, para um
 * CORPO, na língua de agora (item 130/F2).
 *
 * ELA É TAMBÉM A RÉGUA DO `?foco=`: `chaveDoFoco` procura a entrada cujo
 * `nomeDaEntrada` bate com o nome que o Director publicou no foco. Os dois
 * lados falam a mesma língua porque os dois passam por aqui — o que a URL
 * GRAVA continua sendo o nome pt-BR normalizado (`chaveDeLink`), para que um
 * link escrito em inglês e um escrito em português abram a mesma vista.
 */
export function nomeDaEntrada(entrada: EntradaDaBusca): string {
  if (entrada.tipo === 'corpo') {
    const corpo = entrada.corpo;
    return idiomaAtual() === 'en' ? (corpo.nomeEn ?? corpo.nome) : corpo.nome;
  }
  if (entrada.tipo === 'lugar') return entrada.lugar.nome;
  return entrada.estrela.n;
}

/** casa antes do céu: com o mesmo score, um corpo do sistema vem antes */
const ordemDoTipo = (entrada: EntradaDaBusca) => (entrada.tipo === 'corpo' ? 0 : 1);

/** magnitude aparente, para o desempate ENTRE ESTRELAS */
const brilhoDe = (entrada: EntradaDaBusca) =>
  entrada.tipo === 'estrela' ? entrada.estrela.m : 0;

/** o nome canônico da entrada, normalizado — a régua do desempate final */
const nomeCanonico = (entrada: EntradaDaBusca) => normalizarConsulta(nomeDaEntrada(entrada));

/**
 * Resultados por score decrescente; empate desempata primeiro pelo TIPO
 * (casa antes do céu) e depois pela mais BRILHANTE (magnitude aparente
 * menor), que é a estrela que o visitante procurava.
 *
 * O ÚLTIMO DESEMPATE É O NOME, NÃO O ACASO (item 115). `brilhoDe`
 * devolve 0 para todo corpo, então dois CORPOS no mesmo degrau caíam na
 * ordem do catálogo — que é ordem de construção, não mérito. Medido
 * contra os 451 nomes de lua do NASA Eyes (o porte que o item 114
 * traz): "tita" empata Titan e Titania em 110 e Titan só ganhava por
 * acidente; "s/2004" empata 33 chaves e a lista saía por acaso;
 * "jupiter" empata 14 numeradas. A régua nova é o COMPRIMENTO do nome e,
 * nele, a ordem alfabética: o nome mais curto é o corpo principal —
 * "Titan" antes de "Titania", "Júpiter" antes de "Jupiter LI" — e o
 * resto fica reproduzível em vez de arbitrário. Entra DEPOIS do brilho,
 * então nada muda entre estrelas com magnitudes diferentes.
 */
export function buscar(
  consulta: string,
  indice: IndiceEstrelas,
  limite = 8
): ResultadoBusca[] {
  const alvo = normalizarConsulta(consulta);
  if (!alvo) return [];

  const catalogo = /^(hd|hip) ?0*(\d+)$/.exec(alvo);
  if (catalogo) {
    const achado = indice.porCatalogo.get(`${catalogo[1]} ${catalogo[2]}`);
    if (achado === undefined) return [];
    return [{ indice: achado, entrada: indice.entradas[achado], score: SCORE.exato }];
  }

  const melhorPorEntrada = new Map<number, number>();
  for (const [chave, entradas] of indice.porChave) {
    const score = pontuar(chave, alvo);
    if (score === 0) continue;
    for (const i of entradas) {
      if ((melhorPorEntrada.get(i) ?? 0) < score) melhorPorEntrada.set(i, score);
    }
  }

  // A CONSTELAÇÃO COMO LUGAR (item 129/F5): "orion", "cão maior",
  // "southern cross" devolvem as estrelas DAQUELE pedaço de céu, as
  // mais brilhantes primeiro (quem ordena é o desempate por magnitude
  // que já existe). Em degrau próprio, embaixo dos quatro literais —
  // ver `SCORE.constelacao`.
  //
  // A CONSULTA INTEIRA, e prefixo só de 3 letras para cima: "and" já
  // abre Andrômeda, "an" não abre nada. Abaixo de três, um prefixo
  // acende meia dúzia de constelações de uma vez e o degrau deixa de
  // querer dizer "o visitante nomeou um lugar".
  for (const [chave, estrelas] of indice.porConstelacao) {
    if (chave !== alvo && !(alvo.length >= 3 && chave.startsWith(alvo))) continue;
    for (const i of estrelas) {
      if ((melhorPorEntrada.get(i) ?? 0) < SCORE.constelacao) {
        melhorPorEntrada.set(i, SCORE.constelacao);
      }
    }
  }

  // O DEGRAU TOLERANTE, e SÓ COM A LISTA VAZIA. "jupter", "siriuss" e
  // "betelgeuze" não casam com letra nenhuma da rubrica acima e caíam no
  // estado vazio; aqui o motor procura por distância de edição.
  //
  // Por que só quando não achou nada: se alguma chave casou de verdade,
  // acrescentar semelhanças só empurra ruído para dentro do limite de 8
  // — e a lei do estado vazio honesto (nada parecido → nada) continua
  // valendo, porque a busca tolerante também pode não achar.
  //
  // A dose: distância 0,2 do tamanho do termo e só de 4 letras para
  // cima ("io", "sol", "cet" não têm folga para errar — um erro de uma
  // letra num termo curto é outra palavra). Prefixo fica DESLIGADO aqui
  // porque a rubrica acima já o cobre (e melhor: ela também casa no meio
  // da palavra). `AND` obriga TODOS os termos a casarem na mesma chave —
  // é o que mantém "alfa cen" devolvendo nada, já que "cen" é curto
  // demais para tolerância e não existe chave com essa palavra.
  const relevancia = new Map<number, number>();
  if (melhorPorEntrada.size === 0) {
    for (const achado of indice.tolerancia.search(alvo, {
      prefix: false,
      fuzzy: (termo) => (termo.length >= 4 ? 0.2 : 0),
      combineWith: 'AND',
    })) {
      for (const i of indice.porChave.get(indice.chaves[achado.id as number]) ?? []) {
        melhorPorEntrada.set(i, SCORE.aproximado);
        if ((relevancia.get(i) ?? 0) < achado.score) relevancia.set(i, achado.score);
      }
    }
  }

  // o nome sai UMA vez por candidato: `normalizarConsulta` dentro do
  // comparador seria O(n log n) normalizações do mesmo texto
  const nomes = new Map<number, string>();
  const nomeDe = (i: number) => {
    let nome = nomes.get(i);
    if (nome === undefined) nomes.set(i, (nome = nomeCanonico(indice.entradas[i])));
    return nome;
  };

  return [...melhorPorEntrada]
    .map(([i, score]) => ({ indice: i, entrada: indice.entradas[i], score }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        ordemDoTipo(a.entrada) - ordemDoTipo(b.entrada) ||
        // a relevância do motor é ZERO em todos os quatro degraus
        // literais, então esta linha não muda nada lá: ela só ordena o
        // degrau tolerante, onde o score é o mesmo para todos e quem
        // deve vir na frente é quem se parece MAIS com o que se digitou
        (relevancia.get(b.indice) ?? 0) - (relevancia.get(a.indice) ?? 0) ||
        brilhoDe(a.entrada) - brilhoDe(b.entrada) ||
        nomeDe(a.indice).length - nomeDe(b.indice).length ||
        (nomeDe(a.indice) < nomeDe(b.indice) ? -1 : nomeDe(a.indice) > nomeDe(b.indice) ? 1 : 0) ||
        a.indice - b.indice
    )
    .slice(0, limite);
}

// ---- o DEEP-LINK (`?foco=`), os dois lados ------------------------
//
// A porta carrega uma CONSULTA, não um id novo: quem resolve é o
// `buscar` acima, o mesmo que a paleta usa. Foi decisão, e o motivo é
// que a alternativa custava caro por nada — um identificador próprio
// (índice na array `named`, por exemplo) quebraria calado no dia em que
// o build do catálogo mudasse a ordem, e ninguém saberia que o link
// guardado apontava para outra estrela. Uma consulta pode no máximo não
// achar, e aí a linha de contexto mostra o que ficou em quadro.
//
// O preço declarado: `?foco=sir` também acha Sirius. Não é bug — é a
// mesma permissividade da caixa de busca, e é o que faz um link escrito
// à mão funcionar. O que a UI ESCREVE é sempre a forma canônica abaixo.

/**
 * A chave que vai no link. `hd`/`hip` primeiro por serem curtas, ASCII e
 * exatas (a consulta numérica é acesso direto por Map, sem ambiguidade);
 * as 37 nomeadas sem catálogo — as companheiras "B" — vão pelo nome, que
 * casa por degrau EXATO e portanto nunca perde para uma vizinha.
 *
 * UM CORPO vai pelo NOME NORMALIZADO (`?foco=terra`, `?foco=jupiter`), e
 * não pelo id inglês da camada: a porta é para gente escrever, e o
 * mesmo `buscar` que resolve "sirius" resolve "terra" por degrau exato.
 */
export function chaveDeLink(entrada: EntradaDaBusca): string {
  if (entrada.tipo === 'corpo') return normalizarConsulta(entrada.corpo.nome);
  // UM LUGAR vai pelo id da tabela (`?foco=sagittarius-a`): o nome dele
  // carrega um "✱" que nenhuma URL quer, e o id é ASCII e casa por
  // degrau EXATO — a mesma lei do nome de um corpo, com outra grafia
  if (entrada.tipo === 'lugar') return entrada.lugar.id;
  const estrela = entrada.estrela;
  if (estrela.hd !== undefined) return `hd${estrela.hd}`;
  if (estrela.hip !== undefined) return `hip${estrela.hip}`;
  return estrela.n;
}

/**
 * A CHAVE DO QUE ESTÁ EM QUADRO, achada pelo NOME que o Director
 * anunciou (é o que o cabeçalho da ficha mostra). `null` quando o nome
 * não é do índice — o link volta ao modo sem o alvo em vez de inventar
 * uma porta que a busca não saberia resolver.
 *
 * O SAGITTARIUS A✱ DEIXOU DE SER ESSE CASO (item 129/F5): enquanto ele
 * era só um rótulo alcançável pelo clique, o foco nele apagava o
 * `?foco=` da URL; agora ele é uma ENTRADA do índice (um `lugar`), a
 * chave dele é `sagittarius-a` e o link reproduz a vista. Continua
 * valendo quando o índice é construído SEM lugares — é o que os testes
 * do catálogo fazem, e lá o silêncio segue certo.
 */
export function chaveDoFoco(nome: string, indice: IndiceEstrelas): string | null {
  // AS DUAS GRAFIAS DE UM CORPO (item 130/F2). O nome chega na língua em que
  // o foco foi PUBLICADO, e o visitante pode ter trocado de língua depois —
  // a troca é ao vivo e não reenquadra nada. Comparar só com a grafia de
  // agora apagaria o `?foco=` da URL até o próximo enquadramento, que é
  // regressão silenciosa; aceitar as duas custa uma comparação.
  const entrada = indice.entradas.find((e) =>
    e.tipo === 'corpo'
      ? e.corpo.nome === nome || e.corpo.nomeEn === nome
      : nomeDaEntrada(e) === nome
  );
  return entrada ? chaveDeLink(entrada) : null;
}

/** O outro lado: o valor da porta vira o alvo que ela nomeia. */
export function resolverFoco(
  valor: string,
  indice: IndiceEstrelas
): ResultadoBusca | null {
  return buscar(valor, indice, 1)[0] ?? null;
}
