/**
 * O RODÍZIO DAS TELAS DE CARREGAMENTO (pedido dele, 07/10: "revezar é
 * melhor do que sortear"). Cada visita mostra a tela SEGUINTE à última
 * que este aparelho viu, na ordem fixa abaixo, e a última fica nas
 * preferências locais. Só entra no rodízio quem tem cena pronta, ou
 * seja, um carregador em `CARREGADORES`: pôr a próxima tela no ar é uma
 * linha aqui.
 *
 * Os carregadores são import dinâmico: cada cena vira um pedaço próprio
 * do bundle, e quem a busca (o worker ou a thread principal) só baixa a
 * da vez.
 */
import type { DefinicaoDaCena, IdDaTela } from './cena';
import { gravarPreferencia, lerPreferencias } from '../../lib/preferencias';

/** a ordem do rodízio, decidida por ele (PLAN-CARREGAMENTO.md, decisão 1) */
export const ORDEM_DAS_TELAS: readonly IdDaTela[] = ['nascer', 'ceu', 'bercario', 'galaxia'];

const CARREGADORES: Partial<Record<IdDaTela, () => Promise<DefinicaoDaCena>>> = {
  nascer: () => import('./cenas/nascer').then((m) => m.nascer),
};

/** as telas que já existem, na ordem do rodízio */
export const TELAS_PRONTAS: readonly IdDaTela[] = ORDEM_DAS_TELAS.filter((id) => CARREGADORES[id]);

export function carregarCena(id: IdDaTela): Promise<DefinicaoDaCena> {
  const carregar = CARREGADORES[id];
  if (!carregar) return Promise.reject(new Error(`tela sem cena: ${id}`));
  return carregar();
}

const ehPronta = (id: unknown): id is IdDaTela =>
  typeof id === 'string' && (TELAS_PRONTAS as readonly string[]).includes(id);

/**
 * A tela depois de `ultima`. `elegivel` tira telas deste aparelho (ex.:
 * uma pesada demais para o celular); se ele tirar todas, fica a primeira
 * pronta, porque alguma tela tem de aparecer. Lixo no storage, ou uma
 * tela que saiu do rodízio, não trava nada: a conta segue a ORDEM, e a
 * próxima é a primeira candidata depois do lugar dela na ordem.
 */
export function proximaTela(
  ultima: unknown,
  prontas: readonly IdDaTela[] = TELAS_PRONTAS,
  elegivel: (id: IdDaTela) => boolean = () => true
): IdDaTela {
  const candidatas = prontas.filter(elegivel);
  if (candidatas.length === 0) return prontas[0];
  const lugar = ORDEM_DAS_TELAS.indexOf(ultima as IdDaTela);
  if (lugar < 0) return candidatas[0];
  return (
    candidatas.find((id) => ORDEM_DAS_TELAS.indexOf(id) > lugar) ?? candidatas[0]
  );
}

/**
 * A tela desta visita, e o rodízio anda. `?tela=<id>` força uma tela
 * pronta sem mexer no rodízio (instrumento de foto e de juiz, como o
 * `?lang=`); `?shot=` também não mexe e mostra sempre a primeira, para
 * a foto da tela não depender do que o perfil do navegador viu antes.
 */
export function escolherTela(
  busca: string,
  elegivel: (id: IdDaTela) => boolean = () => true
): IdDaTela {
  const q = new URLSearchParams(busca);
  const pedida = q.get('tela');
  if (ehPronta(pedida)) return pedida;
  if (q.has('shot')) return proximaTela(null, TELAS_PRONTAS, elegivel);
  const tela = proximaTela(lerPreferencias().ultimaTelaDeCarga, TELAS_PRONTAS, elegivel);
  gravarPreferencia('ultimaTelaDeCarga', tela);
  return tela;
}
