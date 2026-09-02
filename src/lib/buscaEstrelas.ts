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
// ADAPTAÇÃO DECLARADA: o doador guardava a abreviação ("Alp") e
// acrescentava o glifo; aqui é o inverso — o dado já traz "α Cen", e a
// chave irmã é a que se DIGITA. São duas: a abreviação de catálogo
// ("alp cen") e o nome pt-BR da letra ("alfa cen", o caso de teste que
// o desenho da onda nomeia). O sobrescrito de Bayer (γ² Vel) cai nas
// chaves irmãs e vira dígito ASCII na normalização.
// ============================================================
import type { NamedStar } from '../three/config';

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
  /** nome pt-BR: o que se digita, o que a lista mostra */
  nome: string;
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
 * O que o índice guarda. As duas famílias de alvo do Atlas, com o TIPO
 * declarado em vez de inferido — quem consome decide o verbo (voar até
 * uma estrela, enquadrar a órbita de um corpo) olhando esta etiqueta.
 */
export type EntradaDaBusca =
  | { tipo: 'estrela'; estrela: NamedStar }
  | { tipo: 'corpo'; corpo: CorpoBuscavel };

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
}

/** A rubrica de 4 degraus: exato > prefixo > palavra interna > parcial. */
export const SCORE = { exato: 140, prefixo: 110, palavra: 90, parcial: 75 } as const;

/** Glifo → chaves irmãs: abreviação de catálogo e nome pt-BR da letra. */
const GREGAS: Record<string, readonly string[]> = {
  α: ['alp', 'alfa'], β: ['bet', 'beta'], γ: ['gam', 'gama'], δ: ['del', 'delta'],
  ε: ['eps', 'epsilon'], ζ: ['zet', 'zeta'], η: ['eta'], θ: ['the', 'teta'],
  ι: ['iot', 'iota'], κ: ['kap', 'capa'], λ: ['lam', 'lambda'], μ: ['mu', 'mi'],
  ν: ['nu', 'ni'], ξ: ['xi', 'csi'], ο: ['omi', 'omicron'], π: ['pi'],
  ρ: ['rho', 'ro'], σ: ['sig', 'sigma'], τ: ['tau'], υ: ['ups', 'ipsilon'],
  φ: ['phi', 'fi'], χ: ['chi', 'qui'], ψ: ['psi'], ω: ['ome', 'omega'],
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

/** "γ² Vel" → ["gam vel", "gama vel"]; nome próprio não tem irmã. */
function chavesIrmas(nome: string): string[] {
  const partes = nome.split(' ');
  if (partes.length !== 2) return [];
  const formas = GREGAS[partes[0].replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, '')];
  return formas ? formas.map((forma) => `${forma} ${partes[1]}`) : [];
}

/**
 * `corpos` é opcional e vem VAZIO fora do Atlas: é lá que existe o verbo
 * "enquadrar a órbita". No voo livre a escolha VOA, e voar até a Terra
 * pararia a 0,8 pc dela — a lei de aproximação do voo é de estrelas —,
 * ou seja, prometeria um destino que a fase não entrega.
 */
export function construirIndice(
  nomeadas: readonly NamedStar[],
  corpos: readonly CorpoBuscavel[] = []
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
  // alvos com nome idêntico.
  const entradas: EntradaDaBusca[] = [
    ...corpos.map((corpo) => ({ tipo: 'corpo', corpo }) as const),
    ...nomeadas.map((estrela) => ({ tipo: 'estrela', estrela }) as const),
  ];
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
    const estrela = entrada.estrela;
    anotar(estrela.n, indice);
    for (const irma of chavesIrmas(estrela.n)) anotar(irma, indice);
    if (estrela.gl) anotar(estrela.gl, indice);
    if (estrela.hd !== undefined) porCatalogo.set(`hd ${estrela.hd}`, indice);
    if (estrela.hip !== undefined) porCatalogo.set(`hip ${estrela.hip}`, indice);
  });
  return { entradas, nomeadas, porChave, porCatalogo };
}

function pontuar(chave: string, consulta: string): number {
  if (chave === consulta) return SCORE.exato;
  if (chave.startsWith(consulta)) return SCORE.prefixo;
  for (const palavra of chave.split(' ')) {
    if (palavra.startsWith(consulta)) return SCORE.palavra;
  }
  return chave.includes(consulta) ? SCORE.parcial : 0;
}

/** casa antes do céu: com o mesmo score, um corpo do sistema vem antes */
const ordemDoTipo = (entrada: EntradaDaBusca) => (entrada.tipo === 'corpo' ? 0 : 1);

/** magnitude aparente, para o desempate ENTRE ESTRELAS */
const brilhoDe = (entrada: EntradaDaBusca) =>
  entrada.tipo === 'estrela' ? entrada.estrela.m : 0;

/** o nome canônico da entrada, normalizado — a régua do desempate final */
const nomeCanonico = (entrada: EntradaDaBusca) =>
  normalizarConsulta(entrada.tipo === 'corpo' ? entrada.corpo.nome : entrada.estrela.n);

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
  const estrela = entrada.estrela;
  if (estrela.hd !== undefined) return `hd${estrela.hd}`;
  if (estrela.hip !== undefined) return `hip${estrela.hip}`;
  return estrela.n;
}

/**
 * A CHAVE DO QUE ESTÁ EM QUADRO, achada pelo NOME que o Director
 * anunciou (é o que o cabeçalho da ficha mostra). `null` quando o nome não é do
 * índice — o Sagittarius A✱ é o caso, e o link volta ao modo sem o alvo
 * em vez de inventar uma porta que a busca não saberia resolver.
 */
export function chaveDoFoco(nome: string, indice: IndiceEstrelas): string | null {
  const entrada = indice.entradas.find((e) =>
    e.tipo === 'corpo' ? e.corpo.nome === nome : e.estrela.n === nome
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
