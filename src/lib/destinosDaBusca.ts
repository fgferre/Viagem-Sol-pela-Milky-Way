// ============================================================
// A LISTA FECHADA de destinos da busca vazia (Lote 6, PLAN-UI.md §3.4)
// — portas fixas para quem abre a busca sem saber o que digitar.
// Cada linha aqui é um NOME OU ID que a própria busca já resolve por
// degrau exato (`resolverFoco`, o mesmo motor do "?foco="); este
// arquivo não monta índice novo nem busca em outro lugar — só aponta a
// consulta certa e confia no que já existe (o índice que a paleta já
// tem em mãos).
//
// UM DESTINO QUE NÃO RESOLVER NÃO APARECE, em silêncio: a alternativa
// (um cartão sem entrada real por trás) seria pior que um cartão a
// menos. `destinosDaBusca.test.ts` é quem denuncia qual sumiu.
// ============================================================
import { resolverFoco } from './buscaEstrelas';
import type { EntradaDaBusca, IndiceEstrelas } from './buscaEstrelas';

export type CategoriaDeDestino = 'sistema' | 'estrelas' | 'galaxia';

export interface Destino {
  id: string;
  categoria: CategoriaDeDestino;
  entrada: EntradaDaBusca;
  /** distância de chegada em raios do corpo — só os do sistema; `0` é o
   *  degrau do corpo no quadro dele, sem distância pinada */
  raios?: number;
}

/**
 * Categoria, ID (a chave de `busca.destino.<id>` e de `previas/<id>.webp`)
 * e a CONSULTA que resolve contra o índice — id de camada para um corpo,
 * nome canônico para uma estrela, id da tabela para um lugar. A ORDEM É
 * A DA TABELA DO PLANO: dentro de cada categoria, o primeiro é o
 * principal (o cartão grande).
 */
const LISTA: readonly {
  id: string;
  categoria: CategoriaDeDestino;
  consulta: string;
  /** a MESMA distância em que a prévia do cartão foi tirada (`d` da tabela
   *  de `scripts/visual/previas-de-destino.mjs`): o cartão leva aonde a
   *  imagem dele mostra. Mexeu lá, mexa aqui. */
  raios?: number;
}[] = [
  { id: 'earth', categoria: 'sistema', consulta: 'earth', raios: 4 },
  { id: 'moon', categoria: 'sistema', consulta: 'moon', raios: 4 },
  { id: 'mars', categoria: 'sistema', consulta: 'mars', raios: 4 },
  { id: 'jupiter', categoria: 'sistema', consulta: 'jupiter', raios: 10 },
  // SATURNO EM `raios: 0` (12/11/2026): o degrau do corpo no quadro dele,
  // o dos anéis (`quadroDePerto`), que se mede na tela de cada um — a 12
  // raios fixos o planeta ficava pequeno no desktop com a ficha aberta
  { id: 'saturn', categoria: 'sistema', consulta: 'saturn', raios: 0 },
  { id: 'pluto', categoria: 'sistema', consulta: 'pluto', raios: 5 },
  // A PRIMEIRA SONDA (pilar 4, 12/11/2026): a mais longe, no quadro de
  // chegada dela — o Sol e os planetas do outro lado (sem `raios`)
  { id: 'voyager-1', categoria: 'sistema', consulta: 'voyager-1' },
  // O PRIMEIRO COMETA (pilar 4, 12/11/2026): Halley, no quadro de chegada
  // dele — o Sol de um lado, o núcleo do outro (sem `raios`)
  { id: 'halley', categoria: 'sistema', consulta: 'halley' },
  { id: 'sirius', categoria: 'estrelas', consulta: 'Sirius' },
  { id: 'betelgeuse', categoria: 'estrelas', consulta: 'Betelgeuse' },
  { id: 'rigil-kentaurus', categoria: 'estrelas', consulta: 'Rigil Kentaurus' },
  // O PRIMEIRO SISTEMA PLANETÁRIO (12/11/2026): os sete de TRAPPIST-1,
  // no quadro de chegada do sistema — a anfitriã que o catálogo não
  // nomeia entra na lista pela `comAnfitrias`, como no app
  { id: 'trappist-1', categoria: 'estrelas', consulta: 'TRAPPIST-1' },
  // OS LUGARES DO CÉU (céu profundo, 12/11/2026): a galáxia de fora
  // abre a aba (o cartão grande); depois o endereço do Sol, os lugares
  // perto de casa e, por último, os dois que ficam do outro lado do centro.
  // A NEBULOSA DE ÓRION NÃO TEM CARTÃO (decisão de 12/11): o gás dela não
  // está desenhado, e cartão sugerido tem de entregar o que mostra — ela
  // segue na busca pelo nome, com a ficha que confessa isso
  { id: 'via-lactea', categoria: 'galaxia', consulta: 'via-lactea' },
  { id: 'nosso-lugar', categoria: 'galaxia', consulta: 'nosso-lugar' },
  { id: 'pleiades', categoria: 'galaxia', consulta: 'pleiades' },
  { id: 'hyades', categoria: 'galaxia', consulta: 'hyades' },
  { id: 'sagittarius-a', categoria: 'galaxia', consulta: 'sagittarius-a' },
  { id: 'ana-de-sagitario', categoria: 'galaxia', consulta: 'ana-de-sagitario' },
  // AS VIZINHAS (pilar 3, 12/11/2026): além da nossa galáxia, a maior
  // companheira e a grande espiral do lado
  { id: 'grande-nuvem-de-magalhaes', categoria: 'galaxia', consulta: 'grande-nuvem-de-magalhaes' },
  { id: 'andromeda', categoria: 'galaxia', consulta: 'andromeda' },
];

/**
 * Os destinos de UMA categoria, resolvidos contra o índice recebido —
 * o mesmo que a paleta já tem em mãos, nunca um segundo.
 */
export function destinosDaBusca(
  indice: IndiceEstrelas,
  categoria: CategoriaDeDestino
): Destino[] {
  const destinos: Destino[] = [];
  for (const linha of LISTA) {
    if (linha.categoria !== categoria) continue;
    const achado = resolverFoco(linha.consulta, indice);
    if (!achado) continue;
    destinos.push({ id: linha.id, categoria, entrada: achado.entrada, raios: linha.raios });
  }
  return destinos;
}
