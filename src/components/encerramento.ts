// ============================================================
// O ENCERRAMENTO DO FILME — quem lê o roteiro do fim e monta o relógio.
//
// O TEXTO DA CITAÇÃO NÃO MORA AQUI. Ele mora em
// `src/three/cinematic/roteiros/encerramento.json`, ao lado dos outros
// roteiros, e é DADO puro: a lista de linhas, o crédito, a fonte e os
// tempos. Este arquivo é a capacidade genérica que encena qualquer
// lista dessas — some com o roteiro e ele não tem o que mostrar.
//
// PARA ESTENDER A CITAÇÃO, ACRESCENTE LINHAS NAS DUAS LISTAS DO JSON
// (`linhas` em português e `en.linhas` no original inglês). Cada
// item é uma linha que ENTRA SOZINHA na tela, na ordem, com `passo`
// segundos entre uma e a seguinte; as aspas de abertura e de fechamento
// vão para a primeira e a última linha sozinhas (`textoDoEncerramento` as
// põe), e o crédito, o selo e os botões esperam a lista inteira terminar,
// porque os atrasos abaixo saem do TAMANHO dela.
//
// O FIM É DE CADA FILME (`Filme.encerramento`, `cinematic/filme.ts`): a
// citação abaixo é a do galáctico. O filme que tem texto próprio (o solar)
// diz uma linha e um crédito das tabelas de idioma, sem aspas, no mesmo
// relógio — os atrasos saem do tamanho da lista dele.
//
// A CITAÇÃO É EMPRESTADA, e por isso é curta e vem com crédito na
// própria tela (item 108, pedido do dono em 31/08): Carl Sagan, *Pale
// Blue Dot* (1994), sobre a foto da Terra feita pela Voyager 1. A
// origem está documentada em `docs/reference/ASSETS.md` ("Fonte da
// frase de encerramento"), e o crédito não é enfeite: `filme-smoke`
// reprova a tela final se ele sumir. Quem estender a citação estende o
// que a casa cita de outra pessoa — o parágrafo inteiro do livro não
// entra.
//
// O RITMO É DE CINEMA, não de HUD (ordem do dono: "é um encerramento do
// filme com impacto e drama. cinema puro"). Quem sequencia é o CSS
// (`animation-delay` em `02-filme.css`), a partir dos atrasos
// calculados aqui a partir dos tempos do roteiro.
// ============================================================
import roteiro from '../three/cinematic/roteiros/encerramento.json';
import type { Encerramento } from '../three/cinematic/filme';
import { idiomaAtual, t } from '../lib/idioma';

/**
 * AS LINHAS DA CITAÇÃO na língua do visitante, uma por entrada na tela.
 * O inglês do JSON é o ORIGINAL — Sagan escreveu em inglês, e o
 * português é que é tradução —, e por isso ele não se traduz de volta.
 *
 * É FUNÇÃO, e não constante, porque a língua troca AO VIVO: o `Hud`
 * assina o idioma e pede o texto de novo no redesenho. O RITMO não vem
 * daqui — os atrasos abaixo saem do tamanho da lista, e as duas línguas
 * têm o mesmo número de linhas de propósito: trocar de idioma no fim do
 * filme troca a frase e não move o relógio do encerramento.
 */
function linhasDaCitacao(): readonly string[] {
  return idiomaAtual() === 'en' ? roteiro.en.linhas : roteiro.linhas;
}

/** o texto da tela final de um filme, na língua do visitante */
export interface TextoDoEncerramento {
  /** uma entrada na tela por linha; a citação já vem com as aspas nas pontas */
  linhas: readonly string[];
  /** o crédito, discreto, depois da última linha */
  credito: string;
  /** de onde a frase veio, ainda menor, embaixo do crédito — só a citação tem */
  fonte?: string;
  /** a nota ao lado dos botões; ausente, o filme não tem nota */
  rodape?: string;
}

/**
 * O QUE O VÉU DIZ quando o filme acaba, lido do `encerramento` do próprio
 * filme: a citação do roteiro do fim (com as aspas, a atribuição e a fonte
 * dela) ou a linha e o crédito do filme, por chave de idioma.
 */
export function textoDoEncerramento(fim: Encerramento): TextoDoEncerramento {
  const rodape = fim.rodape === undefined ? undefined : t(fim.rodape);
  if (!fim.citacao) {
    return { linhas: [t(fim.linha)], credito: t(fim.credito), rodape };
  }
  const citacao = linhasDaCitacao();
  return {
    linhas: citacao.map(
      (linha, i) => `${i === 0 ? '“' : ''}${linha}${i === citacao.length - 1 ? '”' : ''}`
    ),
    credito: roteiro.atribuicao,
    fonte: roteiro.fonte,
    rodape,
  };
}

/** quanto cada linha leva para chegar */
export const FADE_S = roteiro.ritmo.fade;

/** quando a linha `i` começa a entrar, em segundos desde o véu subir */
export const ATRASO_DA_LINHA = (i: number) =>
  roteiro.ritmo.atrasoInicial + i * roteiro.ritmo.passo;
/** quando o crédito começa a entrar: depois da última das `quantas` linhas */
export const ATRASO_DA_ATRIBUICAO = (quantas: number) =>
  ATRASO_DA_LINHA(quantas - 1) + roteiro.ritmo.respiroDoCredito;
/** quando a nota, a régua e os botões começam a entrar: depois do crédito */
export const ATRASO_DO_RODAPE = (quantas: number) =>
  ATRASO_DA_ATRIBUICAO(quantas) + roteiro.ritmo.respiroDoRodape;
