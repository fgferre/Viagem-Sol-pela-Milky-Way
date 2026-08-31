// ============================================================
// O ENCERRAMENTO DO FILME — quem lê o roteiro do fim e monta o relógio.
//
// O TEXTO NÃO MORA AQUI. Ele mora em
// `src/three/cinematic/roteiros/encerramento.json`, ao lado dos outros
// roteiros, e é DADO puro: a lista de linhas, o crédito, a fonte e os
// tempos. Este arquivo é a capacidade genérica que encena qualquer
// lista dessas — some com o roteiro e ele não tem o que mostrar.
//
// PARA ESTENDER A CITAÇÃO, ACRESCENTE LINHAS NA LISTA DO JSON. Cada
// item é uma linha que ENTRA SOZINHA na tela, na ordem, com `passo`
// segundos entre uma e a seguinte; as aspas de abertura e de fechamento
// vão para a primeira e a última linha sozinhas (o `Hud.tsx` as põe), e
// o crédito, o selo e os botões esperam a lista inteira terminar,
// porque os atrasos abaixo saem do TAMANHO dela.
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

/** as linhas da citação, uma por entrada na tela */
export const LINHAS: readonly string[] = roteiro.linhas;
/** o crédito, discreto, depois da última linha */
export const ATRIBUICAO = roteiro.atribuicao;
/** de onde a frase veio, ainda menor, embaixo do crédito */
export const FONTE_DA_CITACAO = roteiro.fonte;
/** quanto cada linha leva para chegar */
export const FADE_S = roteiro.ritmo.fade;

/** quando a linha `i` começa a entrar, em segundos desde o véu subir */
export const ATRASO_DA_LINHA = (i: number) =>
  roteiro.ritmo.atrasoInicial + i * roteiro.ritmo.passo;
export const ATRASO_DA_ATRIBUICAO =
  ATRASO_DA_LINHA(LINHAS.length - 1) + roteiro.ritmo.respiroDoCredito;
export const ATRASO_DO_RODAPE = ATRASO_DA_ATRIBUICAO + roteiro.ritmo.respiroDoRodape;
