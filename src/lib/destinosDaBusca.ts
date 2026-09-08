// ============================================================
// A LISTA FECHADA de destinos da busca vazia (Lote 6, PLAN-UI.md §3.4)
// — dez portas fixas para quem abre a busca sem saber o que digitar.
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
}[] = [
  { id: 'earth', categoria: 'sistema', consulta: 'earth' },
  { id: 'moon', categoria: 'sistema', consulta: 'moon' },
  { id: 'mars', categoria: 'sistema', consulta: 'mars' },
  { id: 'jupiter', categoria: 'sistema', consulta: 'jupiter' },
  { id: 'saturn', categoria: 'sistema', consulta: 'saturn' },
  { id: 'pluto', categoria: 'sistema', consulta: 'pluto' },
  { id: 'sirius', categoria: 'estrelas', consulta: 'Sirius' },
  { id: 'betelgeuse', categoria: 'estrelas', consulta: 'Betelgeuse' },
  { id: 'rigil-kentaurus', categoria: 'estrelas', consulta: 'Rigil Kentaurus' },
  { id: 'sagittarius-a', categoria: 'galaxia', consulta: 'sagittarius-a' },
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
    destinos.push({ id: linha.id, categoria, entrada: achado.entrada });
  }
  return destinos;
}
