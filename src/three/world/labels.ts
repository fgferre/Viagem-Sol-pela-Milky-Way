// ============================================================
// Rótulos das estrelas nomeadas — projeção 3D → Canvas 2D do HUD.
// No voo livre eles também são os ALVOS do clicar-para-visitar.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import { GAL } from './baseGalactica';
import { classeEmTexto, nomeNaLingua } from '../atlasConfig';

/** a caixa julgada pela disputa, em px CSS do canvas (ver `StarLabel`) */
export interface CaixaDaDisputa {
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** o quanto a consulta infla esta caixa para procurar oponente */
  folga: number;
}

export interface StarLabel {
  name: string;
  /** tipo espectral — vazio nos corpos do sistema, que não têm um */
  spect: string;
  distPc: number;
  x: number; // 0..1
  y: number; // 0..1
  opacity: number;
  key: string;
  /** 0 = nome próprio, 1 = designação de Bayer. Só ordena a disputa
   *  pelas vagas; o Sol e Sgr A✱ entram como 0. */
  tier?: number;
  /** entrada SÓ-ÍCONE (item 89): o LabelCanvas desenha um marcador em
   *  vez do texto, e o clique a lê pela mesma lista dos desenhados. */
  icone?: boolean;
  /** o ANEL do corpo (item 89, o Eyes completo): desenha o marcador na
   *  âncora TAMBÉM quando há texto — a camada de ícones é independente
   *  da de nomes. */
  comAnel?: boolean;
  /** BETA dos rótulos 3D (item 109): o texto deste rótulo é pintado NA
   *  CENA pelo `Rotulos3d` — o 2D cumpre as leis (colisão, relevância,
   *  clique, vaga ocupada) e o anel, mas NÃO pinta o texto. */
  textoInvisivel?: boolean;
  /** a cor CSS do anel — a mesma da linha de órbita do corpo (item 83);
   *  ausente, o anel sai na tinta âmbar padrão dos rótulos. */
  corDoAnel?: string;
  /**
   * O que a etiqueta escreve ao lado do nome quando o detalhe NÃO é
   * tipo espectral — os corpos do sistema trazem aqui a classe deles em
   * pt-BR ("planeta", "planeta anão"). Ausente nas estrelas: lá vale o
   * `spect` aparado em 5, que é o que as 1.726 nomeadas sempre
   * mostraram, pixel a pixel.
   */
  detalhe?: string;
  /**
   * O RÓTULO CHEGOU A SER DESENHADO NESTE QUADRO? Quem escreve é o
   * `LabelCanvas`, no MESMO objeto que o Director guarda em
   * `lastLabels` — e é isso que faz o desenho e o CLIQUE lerem uma
   * lista só (pendência 30, 2026-08-14).
   *
   * Por que a marca e não uma segunda lista: o desenho descarta por
   * três leis suas (quase-transparente, faixa reservada do HUD e
   * colisão com um nome que chegou antes), e no TETO do zoom do Atlas
   * ela descarta MUITO — os dez corpos e as 21 luas projetam quase no
   * mesmo ponto e só o Sol sobrevive. (Era a vista de ABERTURA até
   * 23/08; o item 61 desceu a abertura para o sistema interno, e o
   * aperto ficou no teto, aonde a roda ainda leva.) Sem a marca, o clique
   * no "SOL" escrito na tela caía em Fobos, que estava 0,4% de tela
   * mais perto do dedo e nunca fora desenhado.
   *
   * `undefined` = o desenho ainda não passou por este quadro; o clique
   * só descarta o `false` EXPLÍCITO, para nunca ficar sem alvo caso o
   * canvas dos rótulos não exista.
   */
  desenhado?: boolean;
  /**
   * QUEM GANHA A VAGA quando dois nomes se atropelam (item 73, 22/08).
   * Número maior manda; `undefined` é "não entra na disputa por
   * hierarquia" e vale o peso mínimo — é o caso do RAMO DO FILME, que
   * não é tocado por esta obra e continua ordenando por tier e
   * proximidade, como sempre ordenou.
   *
   * O valor sai da tabela `PRIORIDADE_DO_ROTULO` — desde 01/09 com os
   * NÚMEROS DO EYES (item 125, F3 · P1). Continua sendo um número e não
   * uma classe porque a disputa compara pesos, e porque o alvo em foco
   * entra por promoção (201) e não por classe nova.
   */
  prioridade?: number;
  /**
   * ESTE NOME ESTÁ ESCONDIDO PELA DISPUTA — o `hiddenByLabelQuadtree`
   * deles (item 82, N1; refeito no item 125, F3).
   *
   * QUEM ESCREVE MUDOU em 01/09. Era a régua de relevância, quando o
   * nome passava do orçamento de dez. O orçamento morreu; hoje a marca é
   * a REALIMENTAÇÃO do veredito da colisão: o `LabelCanvas` julga e
   * escreve `perdeuAVaga` no objeto do quadro, e o produtor a converte
   * nesta marca no quadro seguinte, ANTES das rampas — que é como a
   * derrota vira fade de 750 ms em vez de sumiço seco.
   *
   * É uma MARCA e não uma remoção da lista de propósito: `alvos` continua
   * sendo a projeção inteira (o que o Director publica e o juiz lê), e
   * quem foi cortado continua sendo JULGADO pela colisão — é assim que
   * ele volta à tela quando o vencedor sai de perto.
   *
   * E DESDE A F4 ELA TEM UM SEGUNDO ESCRITOR: a OCLUSÃO
   * (`causaDoSumico: 'oclusao'`). No Eyes as duas causas são a MESMA
   * porta — uma classe CSS que leva o alfa a zero em 750 ms —, e aqui a
   * porta é este campo: quem o lê (a rampa, e a `geometria` do
   * `LabelCanvas`) só precisa saber que o nome está de saída. O que
   * distingue as duas é a `causaDoSumico`, e ela decide a única coisa em
   * que diferem: o ocluído NÃO volta a disputar espaço (globo na frente
   * não é vizinho que se possa vencer), o cortado sim.
   */
  cortadoPelaRegua?: boolean;
  /**
   * O VEREDITO DA COLISÃO DESTE QUADRO (item 125, F3 · P5-P7) — escrito
   * pelo `LabelCanvas`, no MESMO objeto que o Director guarda em
   * `lastLabels`, como o `desenhado`.
   *
   *  · `true` — a quadtree achou um oponente vivo que o vence pela
   *    `ordemDaDisputa` e cuja caixa cruza a dele;
   *  · `false` — julgado e aprovado;
   *  · `undefined` — **não foi julgado neste quadro**. O rodízio julga 20
   *    nomes por quadro (P7) e quem não foi mantém o veredito anterior,
   *    que vive dentro do `LabelCanvas`. A rampa de 750 ms da F2 é o que
   *    absorve essa latência: no pior caso a derrota chega três quadros
   *    depois, e a tinta leva vinte e cinco vezes mais que isso para
   *    sumir.
   */
  perdeuAVaga?: boolean;
  /**
   * A CAIXA QUE A DISPUTA JULGOU (item 125, F3) — em px CSS do canvas dos
   * rótulos, escrita pelo `LabelCanvas` no mesmo objeto que o Director
   * guarda, como o `desenhado` e o `perdeuAVaga`.
   *
   * POR QUE ELA SAI DO DESENHO em vez de ser recalculada por quem
   * precisa: a caixa depende da largura do texto MEDIDA pelo canvas, da
   * fonte do peso visual, do lado que a borda escolheu e da escala da UI.
   * Recalculá-la fora seria uma segunda régua — e a primeira vez que as
   * duas divergissem, o juiz estaria medindo a cópia, não a tela.
   *
   * `folga` é o quanto a consulta INFLA esta caixa na hora de procurar
   * oponente (8×k no texto, 2×k na marca da âncora). Sem ela, quem lê a
   * caixa de fora teria de repetir o número — e repetir número é a mesma
   * armadilha da caixa.
   *
   * Só CANDIDATOS têm caixa: quem está fora da disputa (cedeu por
   * tamanho, está quase transparente ou caiu na margem da composição) não
   * tem geometria julgada, e a ausência é a informação.
   */
  caixaDaDisputa?: CaixaDaDisputa;
  /**
   * O roteiro declarou este nome como assunto do plano. Só esses nomes
   * podem procurar uma posição alternativa quando colidem; o fundo
   * continua sob a lei geral de um lugar por nome.
   */
  dirigido?: boolean;
  /**
   * ESTE NOME ESTÁ SAINDO — a rampa dele desce (item 115, bloco B).
   *
   * Quem marca é `RampasDeRotulo`, no rótulo que a régua CORTOU e cuja
   * rampa ainda não chegou a zero. O `LabelCanvas` o PINTA (é o que faz
   * o nome esvair em vez de sumir num quadro) e não faz mais nada com
   * ele: não reserva vaga, não escreve `desenhado`, não guarda o lado.
   * É esta linha que garante que a rampa muda o COMO e nunca o QUEM —
   * o conjunto dos rótulos que ocupam a tela é o mesmo com e sem ela.
   */
  saindo?: boolean;
  /**
   * POR QUE ESTE NOME ESTÁ SUMINDO (item 125, F2 · A10) — e são DUAS
   * causas, não uma, exatamente como no Eyes: lá o `<div>` recebe
   * `hidden` (tamanho aparente fora do intervalo, oclusão por corpo ou
   * atrás da câmera, escrito pelo `DivComponent`) ou
   * `hiddenByLabelQuadtree` (perdeu a disputa por espaço, escrito pelo
   * `LabelQuadtree`), e as DURAÇÕES DE FADE SÃO AS MESMAS nos dois
   * casos (`transition: opacity .75s` na mesma regra CSS).
   *
   *  · `'tamanho'` — a régua de aparição disse não: o corpo ENCHEU a
   *    tela e o nome cedeu (`cessaoPorTamanhoAparente`). É o `hidden`
   *    deles.
   *  · `'oclusao'` — um GLOBO está na frente (item 125, F4 · O1-O5): o
   *    centro do alvo caiu no cone de um corpo que está entre ele e a
   *    câmera. É o MESMO `hidden` deles, escrito pelo mesmo
   *    `DivComponent` na mesma linha do tamanho.
   *  · `'disputa'` — a régua de relevância cortou: a tela está cheia de
   *    nomes que importam mais. É o `hiddenByLabelQuadtree` deles, e é
   *    a mesma marca que `cortadoPelaRegua` já carregava.
   *
   * A CAUSA É ESTADO, não decoração: `RampasDeRotulo` a lê para pôr as
   * três sob a MESMA rampa de saída, que é o que a folha deles faz numa
   * regra só.
   *
   * ATRÁS DA CÂMERA NÃO TEM CAUSA, e é decisão medida da F4 (O8): um
   * nome às suas costas não tem posição na tela onde apagar. No Eyes ele
   * recebe `hidden` E vai para `translate(10× largura, 10× altura)` — dez
   * viewports fora (A11): a transição corre, invisível. Aqui ele sai da
   * lista e a memória da rampa desce na MESMA `RAMPA_DE_SAIDA_S` pelo
   * ramo "sumiu da lista" — mesma curva, mesmo tempo, mesma volta ao
   * girar de volta. Inventar uma posição para pintar o que está atrás
   * seria a única diferença, e seria para pior.
   */
  causaDoSumico?: 'tamanho' | 'oclusao' | 'disputa';
  /**
   * O ALFA DO CANAL DE TEXTO — a camada de DENTRO dos dois fades do
   * Eyes (item 125, F2 · A8/A9). Quem escreve é `RampasDeRotulo`; quem
   * o consome é o `LabelCanvas`, que pinta o texto com o PRODUTO
   * `opacity × alfaDoTexto`. Ausente = 1 (o ramo do FILME, que não
   * passa pelas rampas, continua pixel a pixel o de sempre).
   */
  alfaDoTexto?: number;
  /**
   * O ALFA DO CANAL DE ÍCONE — o irmão de `alfaDoTexto`, calculado com
   * os mesmos números e DELIBERADAMENTE não consumido ainda: os ícones
   * são assunto da F5, e o contrato (§5.1) manda que os dois canais
   * sejam independentes. A F2 deixa o fio esticado e não o liga.
   */
  alfaDoIcone?: number;
  /**
   * O PONTEIRO ESTÁ EM CIMA DESTE NOME (item 125, F2 · A12) — a mesma
   * marca, no mesmo quadro, que já acende a linha de órbita (F1 · L11).
   * O Eyes leva os dois canais a `--hoverOpacity: 1` em 250 ms
   * ease-out; aqui o alvo do canal de texto vira 1 e a rampa de entrada
   * o leva lá.
   */
  apontado?: boolean;
  /**
   * ESTE NOME É DO CANAL PRIMÁRIO (item 125, F2 · A9). No CSS deles as
   * variantes `.planet` e `.sun` trocam `--secondaryFadeIn` (0,35) por
   * `--primaryFadeIn` (0,75) — planeta e estrela leem mais forte que o
   * resto. Aqui a marca é escrita por `projectCorpos` a partir da
   * CLASSE em pt-BR ('planeta' e 'estrela'), que é o dado que já
   * existe; anões, asteroides, luas e as estrelas do céu ficam no
   * secundário, como as naves deles.
   */
  canalPrimario?: boolean;
}

/**
 * A HIERARQUIA DOS NOMES, numa tabela só — desde 01/09 (item 125, F3 ·
 * P1/P2/P11) **os números são os do NASA Eyes**, não mais os da casa.
 *
 * O LITERAL DELES (`LabelManager._weightMap`, contrato §3.1):
 *
 *     Universe 100, Galaxy 100, Star 100, Planet 50, Spacecraft 30,
 *     "Dwarf Planet" 28, Moon 25, Asteroid 15, Comet 15,
 *     Constellation 10, "Landing site" 5, Barycenter 0
 *
 * e, fora do mapa, DOIS defaults que diferem (P2): `initLabelWeights`
 * grava **1** para categoria que não está na tabela; `getDefaultWeight`
 * devolve **0** para categoria desconhecida sem entrada. O alvo SEGUIDO
 * recebe **201** (P11, string `"201"` no fonte deles), acima do teto 100.
 *
 * O MAPEAMENTO CLASSE A CLASSE — o que a casa tem, o que vale lá:
 *
 * | casa | Eyes | peso | por quê |
 * |---|---|---|---|
 * | `foco` | alvo seguido | **201** | P11 literal |
 * | `sol` (classe "estrela") | `Star` | **100** | par exato: no catálogo deles a única entidade `Star` é o Sol |
 * | `planeta` | `Planet` | **50** | par exato |
 * | `anao` ("planeta anão") | `Dwarf Planet` | **28** | par exato |
 * | `lua` | `Moon` | **25** | par exato |
 * | `asteroide` | `Asteroid`/`Comet` | **15** | par exato — e é DEGRAU NOVO: até 31/08 asteroide dividia o peso do anão |
 * | `estrelaPropria` | *sem par* | **10** | o degrau `Constellation`: é a marca de referência do CÉU, não um objeto do sistema; fica abaixo da lua, como já ficava |
 * | `estrelaBayer` | *sem par* | **5** | o degrau `Landing site`, o último nomeado acima do baricentro: uma designação é marcador, não objeto |
 * | `outros` | categoria fora do mapa | **1** | o primeiro default deles (P2) |
 * | (sem `prioridade`) | categoria desconhecida | **0** | o segundo default deles (P2) — ver `PESO_SEM_CLASSE` |
 *
 * DUAS CONSEQUÊNCIAS DECLARADAS, porque mudam ordem e não só escala:
 *  1. **asteroide caiu abaixo da lua** (15 contra 25). Era 8 contra 6 —
 *     acima. É a hierarquia deles, e é a única inversão do mapeamento.
 *  2. **`outros` caiu abaixo de `estrelaBayer`** (1 contra 5). Era 4
 *     contra 3. `outros` não tem usuário vivo — nenhuma classe de
 *     `NOMES_DOS_CORPOS` cai nele e Sagittarius A✱ entra por
 *     `prioridadeDeEstrela` —, então a troca não move nenhum nome da
 *     tela; ela põe o degrau onde o fonte deles o põe.
 *
 * O QUE NÃO MUDOU DE ORDEM: foco > sol > planeta > anão > lua >
 * estrela própria > designação. É a mesma pirâmide, com os números
 * deles.
 */
export const PRIORIDADE_DO_ROTULO = {
  foco: 201,
  sol: 100,
  planeta: 50,
  anao: 28,
  lua: 25,
  asteroide: 15,
  estrelaPropria: 10,
  estrelaBayer: 5,
  outros: 1,
} as const;

/**
 * O SEGUNDO DEFAULT DELES (P2): rótulo que chega SEM classe nenhuma vale
 * zero na disputa — é o `getDefaultWeight` do `LabelManager`.
 *
 * Na casa quem chega assim é o RAMO DO FILME, que não escreve
 * `prioridade`. Ele não fica desprotegido: o assunto do beat é
 * `dirigido`, e `pesoDoRotulo` dá ao dirigido o peso do foco — que é o
 * que o Eyes faz com o alvo seguido (P11). O fundo do filme, esse sim,
 * vale zero, e é o que ele já valia na prática (entrava por último na
 * ordem de chegada).
 */
export const PESO_SEM_CLASSE = 0;

/**
 * A prioridade de um corpo do sistema, pela CLASSE em pt-BR que a
 * tabela `NOMES_DOS_CORPOS` já publica ("estrela", "planeta", "planeta
 * anão", "lua", "asteroide"). Deriva do dado que existe — uma segunda
 * tabela de ids seria a segunda fonte de verdade que a primeira
 * desmentiria no dia em que alguém promovesse Ceres.
 *
 * "cometa" tem par no Eyes (`Comet` 15, o mesmo do asteroide) e por isso
 * está escrito, ainda que a casa não desenhe nenhum: quando desenhar,
 * cai no degrau certo sem regra nova.
 */
export function prioridadeDeCorpo(classe: string): number {
  if (classe === 'estrela') return PRIORIDADE_DO_ROTULO.sol;
  if (classe === 'planeta') return PRIORIDADE_DO_ROTULO.planeta;
  if (classe === 'lua') return PRIORIDADE_DO_ROTULO.lua;
  if (classe === 'planeta anão') return PRIORIDADE_DO_ROTULO.anao;
  if (classe === 'asteroide' || classe === 'cometa') {
    return PRIORIDADE_DO_ROTULO.asteroide;
  }
  return PRIORIDADE_DO_ROTULO.outros;
}

/** A prioridade de uma estrela, pelo tier (0 = nome próprio). */
export function prioridadeDeEstrela(tier: number | undefined): number {
  return (tier ?? 0) === 0
    ? PRIORIDADE_DO_ROTULO.estrelaPropria
    : PRIORIDADE_DO_ROTULO.estrelaBayer;
}

/**
 * O PESO da disputa — a prioridade e mais nada (item 125, F3).
 *
 * **O BÔNUS DE HISTERESE MORREU AQUI.** Até 01/09 quem estava desenhado
 * no quadro anterior valia 20% a mais (`BONUS_DE_HISTERESE = 1.2`), e a
 * razão escrita era "sem isso a seleção PISCA". Era invenção da casa: o
 * Eyes não multiplica peso nenhum, e o que impede o pisca-pisca lá é a
 * RAMPA DE 750 ms de saída (contrato A8/A10, construída pela F2) somada
 * a um desempate TOTALMENTE determinístico (P3, abaixo) — dois nomes
 * empatados não alternam porque a ordem entre eles não depende do
 * quadro. Medido antes de aposentar: ver o bastão da F3.
 *
 * O DIRIGIDO VALE O FOCO: o assunto declarado pelo roteiro é o
 * equivalente do alvo seguido do Eyes (P11, peso 201), e é a linha que
 * mantém a regra editorial do filme ("o assunto sempre tem nome") agora
 * que a disputa é por PESO e não por ordem de chegada.
 */
export function pesoDoRotulo(label: StarLabel): number {
  if (label.dirigido) return PRIORIDADE_DO_ROTULO.foco;
  return label.prioridade ?? PESO_SEM_CLASSE;
}

/**
 * A ORDEM DA DISPUTA, com os TRÊS critérios do Eyes (item 125, F3 · P3)
 * — o literal de `LabelQuadtree._isLessWeightsAndZ`:
 *
 * ```js
 * if (t.weight !== e.weight) return t.weight < e.weight;   // menor peso perde
 * if (t.z      !== e.z)      return t.z > e.z;             // mais LONGE perde
 * return t.getName().localeCompare(e.getName()) < 0;       // vem ANTES perde
 * ```
 *
 * O TERCEIRO CRITÉRIO É O QUE FALTAVA, e ele não é enfeite: sem
 * desempate total, dois nomes de mesmo peso e mesma distância ficam na
 * ordem em que o `sort` os encontrou, e essa ordem muda com a lista —
 * um nome entra em quadro do outro lado da tela e dois nomes que nada
 * têm com ele trocam de vaga. Com o terceiro critério a relação é uma
 * ORDEM TOTAL: o par decide sozinho, sempre igual.
 *
 * O SENTIDO É CONTRAINTUITIVO E É O DO FONTE: perde quem vem ANTES
 * alfabeticamente, logo VENCE o nome alfabeticamente MAIOR — por isso
 * `b.key.localeCompare(a.key)`. A chave é a identidade da entidade (o
 * `getEntity().getName()` deles), não o rótulo escrito: é ela que é
 * única e estável entre quadros.
 *
 * Devolve <0 quando `a` vence (vai na frente da lista ordenada).
 */
export function ordemDaDisputa(a: StarLabel, b: StarLabel): number {
  const pa = pesoDoRotulo(a);
  const pb = pesoDoRotulo(b);
  if (pa !== pb) return pb - pa;
  if (a.distPc !== b.distPc) return a.distPc - b.distPc;
  return b.key.localeCompare(a.key, 'pt-BR');
}

/**
 * ABAIXO DISTO O NOME JÁ NÃO SE LÊ, e quem o descarta é o desenho. O
 * número vivia digitado dentro do `LabelCanvas` e é lido agora também
 * pela régua, que não pode gastar vaga com um nome invisível: uma lua
 * colada no pai esmaece até quase zero (`esmaecerLuasColadasNoPai`) e
 * ainda assim empurraria uma estrela para fora do orçamento.
 */
export const OPACIDADE_MINIMA_DO_ROTULO = 0.08;

/**
 * O RÓTULO CEDE QUANDO O CORPO ENCHE A TELA (item 125, F2 · A5) — a
 * regra contraintuitiva do Eyes, copiada com os literais dele.
 *
 * O PRESET É UM SÓ na casa deles: `VisibleInterval.DefaultVisibleFar =
 * new VisibleInterval(0, .02, "normal-radius")`, com `fadeBlur = 0.5`
 * de fábrica — e é ele que o `DivComponent`, o `LabelComponent`, o
 * `TrailComponent` e o `OrbitLineComponent` recebem no construtor
 * (`trechos/m08-VisibleInterval.js:3`). Não existe tabela de
 * intervalos por classe; existe este par de números.
 *
 * A CONTA INTEIRA deles é:
 *
 *     entra = (r>0 || min>0) ? clamp01((r/min − 1)/fadeBlur + 1) : 1
 *     sai   = (r>0 || max>0) ? clamp01((1 − r/max)/fadeBlur + 1) : 0
 *     multiplicador = min(entra, sai)
 *
 * Com `min = 0` a primeira metade é sempre 1 (`r/0` é infinito para
 * `r > 0`, e para `r = 0` a condição é falsa e o ramo devolve 1) — é o
 * que quer dizer **nunca some por ser pequeno**. Sobra a segunda:
 * pleno até `r = 0,02`, zero em `r = 1,5 × 0,02 = 0,03`. Nada é
 * booleano; nada pisca.
 *
 * A RÉGUA É `normal-radius`: o raio APARENTE do corpo em NDC, não a
 * distância. Um corpo pequeno visto de perto e um grande visto de
 * longe cedem no mesmo lugar, e a lente entra na conta — que é o
 * sentido da regra: o nome sai quando o OBJETO já é o assunto do
 * quadro e o texto sobre ele virou estorvo.
 *
 * O SUMIÇO "VIRA PÓ" DA CASA NÃO SE TOCA: o esmaecimento por distância
 * dos corpos (`CORPO_FADE_*`) e o da lua colada no pai continuam onde
 * estavam. Esta régua é a OUTRA ponta, a que não existia.
 */
export const RAIO_NDC_DE_CESSAO = 0.02;
export const BORRAO_DA_CESSAO = 0.5;

/**
 * O RAIO APARENTE EM NDC de uma esfera de raio `raio` a `dist` da
 * câmera, com `tanHalfFov` = tangente do SEMI-ÂNGULO VERTICAL da lente.
 *
 * A forma é EXATA, não a aproximação de ângulo pequeno: o NDC vertical
 * é `tan(θ)/tan(fov/2)` e o semi-ângulo do disco é `asin(raio/dist)`,
 * então `tan(θ) = s/√(1−s²)` com `s = raio/dist`. A aproximação `s`
 * erraria justamente onde esta régua trabalha — no close, com `s`
 * grande —, e a casa já pagou esse preço uma vez na ponta de cima da
 * régua da órbita (`orbitas.ts`, "a aproximação morre onde r/d → 1").
 *
 * Câmera DENTRO do corpo (`s ≥ 1`) devolve infinito: cedeu de vez.
 */
export function raioAparenteNdc(raio: number, dist: number, tanHalfFov: number): number {
  if (!(raio > 0) || !(dist > 0) || !(tanHalfFov > 0)) return 0;
  const s = raio / dist;
  if (s >= 1) return Number.POSITIVE_INFINITY;
  return s / Math.sqrt(1 - s * s) / tanHalfFov;
}

/**
 * O MULTIPLICADOR de `DefaultVisibleFar` para um raio aparente em NDC —
 * a metade `sai` da conta acima, que é a única que morde com `min = 0`.
 */
export function cessaoPorTamanhoAparente(raioNdc: number): number {
  if (!Number.isFinite(raioNdc)) return raioNdc > 0 ? 0 : 1;
  const sai = (1 - raioNdc / RAIO_NDC_DE_CESSAO) / BORRAO_DA_CESSAO + 1;
  return Math.min(1, Math.max(0, sai));
}

/**
 * A CAMADA DE DENTRO dos dois fades (item 125, F2 · A8/A9) — os alfas
 * do `.icon` e do `.text` dentro do `<div>` do rótulo.
 *
 * São os literais da folha deles (`trechos/m08-label-css.txt`):
 * `--secondaryFadeIn: 0.35`, `--secondaryFadeOut: 0.05`,
 * `--primaryFadeIn: 0.75`, `--primaryFadeOut: 0.05`,
 * `--hoverOpacity: 1`. A variante `.planet`/`.sun` troca o par
 * secundário pelo primário; o `.hidden`/`.hiddenByLabelQuadtree` leva
 * os dois ao 0,05.
 *
 * POR QUE DUAS CAMADAS E NÃO UMA: a opacidade final é o PRODUTO da
 * camada de fora (o `<div>`, 0↔1, `RAMPA_DE_ENTRADA_S`/`SAIDA_S`) pela
 * de dentro (estes números, com as MESMAS durações). É essa curva
 * não-linear que soa orquestrada — rápido a aparecer, preguiçoso a
 * sumir — e nenhuma das duas sozinha a produz.
 */
export const ALFA_DO_TEXTO_SECUNDARIO = 0.35;
export const ALFA_DO_TEXTO_PRIMARIO = 0.75;
export const ALFA_DO_TEXTO_ESCONDIDO = 0.05;
export const ALFA_DO_TEXTO_APONTADO = 1;

/**
 * A RÉGUA DE RELEVÂNCIA (item 82, N1) — hoje ela ORDENA, e só (item
 * 125, F3).
 *
 * **O ORÇAMENTO DE NOMES MORREU AQUI**, por decisão declarada do dono no
 * item 125. Até 01/09 esta função também cortava: `ORCAMENTO_DE_NOMES =
 * 10` vagas, e o 11º nome saía da tela por população, não por
 * sobreposição. A razão escrita em 24/08 era boa — *"o Eyes nunca decide
 * que um objeto não interessa; só decide que ele não cabe"*, e quarenta
 * nomes acesos é confusão. A ordem da onda da paridade é a outra: **quem
 * cabe sem colidir, aparece**. Quem decide agora é a colisão
 * (`LabelCanvas`, a quadtree do P5/P6) com os pesos do Eyes e o
 * desempate determinístico do P3 — as três peças que faziam falta e sem
 * as quais o orçamento era o único freio disponível.
 *
 * O QUE SOBROU, e por que continua importando: a ORDEM. `P8` — a lista
 * do Eyes é mantida ordenada por peso, e o rodízio da quadtree percorre
 * essa ordem, então nomes de peso próximo são julgados no mesmo quadro.
 * Aqui é a mesma coisa: a lista sai ordenada por `ordemDaDisputa`, que é
 * a ordem TOTAL do P3.
 *
 * O que NÃO se faz mais aqui: marcar `cortadoPelaRegua`. Essa marca
 * agora vem do veredito da colisão, pela realimentação que o produtor
 * (`director/rotulos.ts`) aplica no quadro seguinte — é o
 * `hiddenByLabelQuadtree` deles, escrito por quem de fato julga o
 * espaço.
 */
export function aplicarReguaDeRelevancia(lista: StarLabel[]): StarLabel[] {
  lista.sort(ordemDaDisputa);
  return lista;
}

/**
 * AS DUAS DURAÇÕES DA RAMPA — 250 ms para ENTRAR, 750 ms para SAIR
 * (item 115, bloco B; mergulho 08 §1.6a, `.pioneer-label-div`:
 * `transition: opacity .25s` na entrada e `.75s` no `.hidden`).
 *
 * A ASSIMETRIA É O PRODUTO, não um detalhe: rápido a aparecer e
 * preguiçoso a sumir é o que faz o desentulho não piscar — um nome que
 * perde a vaga por um punhado de quadros e a recupera nem chega a
 * apagar. Simétrico, os dois defeitos voltam juntos (entrada arrastada e
 * saída seca).
 */
export const RAMPA_DE_ENTRADA_S = 0.25;
export const RAMPA_DE_SAIDA_S = 0.75;

/**
 * A RAMPA TEMPORAL DOS NOMES (item 115, bloco B) — o COMO, nunca o QUEM.
 *
 * Até 31/08 a opacidade de cada rótulo era calculada do zero no quadro
 * em que ele aparecia: quem entrava nascia cheio e quem perdia a vaga ia
 * a zero em UM quadro. A régua de relevância (`aplicarReguaDeRelevancia`,
 * item 82 N1) e a histerese de seleção continuam decidindo QUEM aparece,
 * intocadas — esta peça roda DEPOIS delas e só multiplica a tinta.
 *
 * A LEI DA NEUTRALIDADE, e é ela que separa esta peça de uma mudança de
 * régua: o rótulo CORTADO cuja rampa ainda não zerou volta à lista como
 * `saindo` — pinta, e nada mais (`StarLabel.saindo`). Não reserva vaga,
 * não vira alvo de clique, não realimenta a histerese. O conjunto do que
 * OCUPA a tela é bit a bit o de antes.
 *
 * POR QUE LINEAR E NÃO EXPONENCIAL: o encosto exponencial que o mergulho
 * sugeriu (`op += (alvo−op)·(1−e^(−dt/τ))`) nunca CHEGA ao alvo, e a
 * assinatura do `LabelCanvas` (que compara opacidade para não repintar
 * um quadro parado) passaria a mudar para sempre, a 60 Hz. A rampa
 * linear em ALFA chega ao alvo em tempo exato, é reversível no meio do
 * caminho sem descontinuidade, e devolve os 250/750 ms medidos no CSS
 * deles em vez de uma constante de tempo que só se parece com eles.
 */
export class RampasDeRotulo {
  /** alfa vivo por chave; ausente = ainda não nasceu (entra do zero) */
  private readonly alfa = new Map<string, number>();
  /**
   * A CAMADA DE DENTRO por chave (item 125, F2 · A8/A9) — e ela guarda
   * MAIS do que um alfa, porque a semântica do CSS não é a de uma
   * rampa de taxa fixa: `transition: opacity .25s` gasta os 250 ms
   * INTEIROS seja qual for o tamanho do salto. Ir de 0,35 a 1 (hover)
   * leva os mesmos 250 ms que ir de 0,05 a 0,35. Por isso a transição
   * guarda de onde partiu, para onde vai e quanto já andou.
   *
   * A camada de FORA continua sendo taxa (`alfa`, acima) e não muda: lá
   * o percurso é sempre 0↔1, e taxa e duração coincidem.
   */
  private readonly dentro = new Map<
    string,
    { alfa: number; origem: number; alvo: number; t: number }
  >();

  /**
   * Um passo de `dt` sobre a lista JÁ julgada pela régua: multiplica a
   * opacidade de cada rótulo pela rampa dele e devolve à lista, como
   * `saindo`, quem a régua cortou e ainda tem tinta.
   *
   * `dt = 0` NÃO É SAÍDA (mudou em 01/09, F2): o passo não anda, mas os
   * alfas do canal continuam sendo escritos na lista. Antes disso um
   * quadro sem tempo deixaria `alfaDoTexto` indefinido e o desenho
   * pintaria o nome cheio por um quadro — um pisca que ninguém pediu.
   */
  aplicar(lista: readonly StarLabel[], dt: number): void {
    const passo = dt > 0 ? dt : 0;
    const sobe = passo / RAMPA_DE_ENTRADA_S;
    const desce = passo / RAMPA_DE_SAIDA_S;
    const vistos = new Set<string>();
    for (const l of lista) {
      vistos.add(l.key);
      // AS DUAS CAUSAS ENTRAM PELA MESMA PORTA (F2 · A10): perder a
      // disputa e ceder por tamanho escondem o nome com a MESMA rampa,
      // que é o que a folha deles faz numa regra só
      // (`&.hidden,&.hiddenByLabelQuadtree{…transition:opacity .75s}`).
      const escondido = l.cortadoPelaRegua === true || l.causaDoSumico === 'tamanho';
      const v = this.andar(this.alfa.get(l.key) ?? 0, escondido ? 0 : 1, sobe, desce);
      this.alfa.set(l.key, v);
      l.opacity *= v;
      const alfaDeDentro = this.andarPorDentro(l, escondido, passo);
      l.alfaDoTexto = alfaDeDentro;
      // O CANAL DO ÍCONE É O MESMO NÚMERO e um campo SEPARADO: no CSS
      // deles `.icon` e `.text` dividem a variável, e o que os separa é
      // o hover (que também escala o ícone) e o poder de esconder um
      // sem o outro. A F5 liga este fio; a F2 só o deixa esticado.
      l.alfaDoIcone = alfaDeDentro;
      if (l.cortadoPelaRegua && v > 0) {
        l.cortadoPelaRegua = false;
        l.saindo = true;
      }
    }
    if (passo <= 0) return;
    // QUEM SUMIU DA LISTA TAMBÉM DESCE. Sem isto o nome que sai do
    // quadro por um instante e volta renasceria do zero — a memória é
    // exatamente o que impede o pisca-pisca que a assimetria promete
    // matar. Zerou, sai do mapa: a memória vive no máximo 750 ms.
    for (const [key, v] of this.alfa) {
      if (vistos.has(key)) continue;
      const novo = this.andar(v, 0, sobe, desce);
      if (novo <= 0) {
        this.alfa.delete(key);
        this.dentro.delete(key);
      } else this.alfa.set(key, novo);
    }
  }

  /**
   * UM PASSO DA CAMADA DE DENTRO. O alvo é o do CSS deles, nesta ordem
   * de precedência: apontado (`--hoverOpacity` 1) vence, depois
   * escondido (`--*FadeOut` 0,05), senão o repouso da variante
   * (`--primaryFadeIn` 0,75 no planeta e na estrela, `--secondaryFadeIn`
   * 0,35 no resto).
   *
   * O RÓTULO NASCE NO ALVO, não no zero: no navegador o `<div>` é
   * criado já com a regra aplicada e a transição não corre na primeira
   * pintura. Quem faz a entrada do nome é a camada de FORA.
   */
  private andarPorDentro(l: StarLabel, escondido: boolean, dt: number): number {
    const repouso = l.canalPrimario ? ALFA_DO_TEXTO_PRIMARIO : ALFA_DO_TEXTO_SECUNDARIO;
    // ESCONDIDO NÃO RECEBE PONTEIRO: no CSS deles o `.hidden` leva
    // `pointer-events: none`, então `:hover` não alcança quem já saiu.
    const alvo = escondido
      ? ALFA_DO_TEXTO_ESCONDIDO
      : l.apontado
        ? ALFA_DO_TEXTO_APONTADO
        : repouso;
    let c = this.dentro.get(l.key);
    if (!c) {
      c = { alfa: alvo, origem: alvo, alvo, t: 0 };
      this.dentro.set(l.key, c);
      return alvo;
    }
    if (c.alvo !== alvo) {
      c.origem = c.alfa;
      c.alvo = alvo;
      c.t = 0;
    }
    if (c.alfa === c.alvo) return c.alfa;
    const duracao = c.alvo > c.origem ? RAMPA_DE_ENTRADA_S : RAMPA_DE_SAIDA_S;
    c.t += dt;
    c.alfa =
      c.t >= duracao
        ? c.alvo
        : c.origem + (c.alvo - c.origem) * (c.t / duracao);
    return c.alfa;
  }

  private andar(v: number, alvo: number, sobe: number, desce: number): number {
    const novo = alvo > v ? Math.min(alvo, v + sobe) : Math.max(alvo, v - desce);
    // ENCOSTAR NO ALVO É OBRIGAÇÃO. A soma de quinze doze-avos em ponto
    // flutuante pousa em 0,9999999999999999, e um alfa que só TENDE a 1
    // faria a assinatura do desenho mudar em todo quadro para sempre.
    return Math.abs(alvo - novo) < 1e-6 ? alvo : novo;
  }
}

const _v = new THREE.Vector3();

/** limite do olho nu — as 90 nomeadas do catálogo antigo iam só até 2,56,
 *  então este corte não tira nenhuma etiqueta que já existia */
const NAKED_EYE_MAG = 6.5;

function projectPoint(
  camera: THREE.PerspectiveCamera,
  p: THREE.Vector3 | { x: number; y: number; z: number }
): { x: number; y: number } | null {
  _v.set(p.x, p.y, p.z).project(camera);
  if (_v.z > 1 || _v.z < -1) return null; // atrás da câmera
  const x = (_v.x + 1) / 2;
  const y = (1 - _v.y) / 2;
  // O RETÂNGULO É O DA TELA INTEIRA (item 125, F4) — a decisão do §7 do
  // contrato, tomada com medida.
  //
  // Até 01/09 esta linha cortava `x ∈ [0,04; 0,96]`, `y ∈ [0,08; 0,9]`:
  // uma margem inventada pela casa, sem par no Eyes, onde o `DivComponent`
  // usa o viewport inteiro e joga o que sobra dez viewports para fora
  // (A11). A margem foi conferida antes de morrer, retângulo a retângulo,
  // com o HUD medido vivo em 1200×900 (`f4-margem.mjs`):
  //
  //  · a faixa de CIMA (0-72 px) é a tarja (`.letterbox`, 0-59 px), que
  //    JÁ se reserva — tinta preta opaca por cima deste canvas; a barra
  //    de controles só começa em 77 px, e cada botão dela também se
  //    reserva;
  //  · a faixa de BAIXO (810-900) está dentro da margem de composição do
  //    `LabelCanvas` (que corta em 0,76 da altura) e da tarja de baixo;
  //  · as faixas dos LADOS (48 px) têm a bússola (36-74 px), que se
  //    reserva.
  //
  // Ou seja: tudo que a margem protegia é MEDIDO e recusado pela disputa,
  // que compara a caixa do nome com os retângulos que o App publica. A
  // margem era uma segunda régua para a mesma pergunta — e a mais
  // grosseira das duas.
  //
  // O QUE FICA sendo cortado é o que não tem pixel na tela: nome fora do
  // retângulo do viewport. É o corte do Eyes, e é o mínimo que existe.
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

/** Um corpo com disco: nome ESCONDIDO atrás dele não nasce. */
export interface OclusorDeRotulo {
  x: number;
  y: number;
  z: number;
  /** raio da superfície na cena, em pc */
  raio: number;
  /**
   * A CHAVE DO RÓTULO deste corpo, quando ele TAMBÉM tem nome na tela
   * (item 115, bloco B, peça 2) — é por ela que um corpo não esconde o
   * próprio nome.
   *
   * A aritmética já o faria (`distAlvo <= dCorpo` empata consigo mesmo e
   * o laço pula), mas por um empate de ponto flutuante — e a consequência
   * de um ULP de diferença não é um pixel torto: é o corpo se ocluindo,
   * cosseno 1 contra qualquer cone, e o nome sumindo de vez. Uma
   * comparação de string por oclusor é barata perto disso.
   */
  chave?: string;
}

const _aoAlvo = new THREE.Vector3();
const _aoCorpo = new THREE.Vector3();

/**
 * O CENTRO do alvo cai dentro do cone de um corpo, com o corpo entre a
 * câmera e ele? ("vejo estrelas através do sol" — item 47; desde o item
 * 115 o alvo também pode ser um CORPO, e a lista de oclusores é a dos
 * corpos do quadro, não mais só o Sol.) O teste é o
 * ângulo real (dot) contra o meio-ângulo do disco (cos = √(1−(r/d)²)) —
 * nada de aproximar seno por ângulo, que de perto o disco é ENORME.
 *
 * O IRMÃO DE GPU desta conta é o oclusor da nebulosa
 * (`nebula.setSunOccluder` + o cosseno SEGURO do cone dela): mesma
 * geometria, domínios diferentes — lá o cone encolhe pelas margens do
 * raymarch (tesselação, blur de RT), que não existem num rótulo.
 */
function escondidaPorDisco(
  camPos: THREE.Vector3,
  estrela: { x: number; y: number; z: number },
  distEstrela: number,
  oclusores: readonly OclusorDeRotulo[],
  chaveDoAlvo?: string
): boolean {
  for (const o of oclusores) {
    if (o.chave !== undefined && o.chave === chaveDoAlvo) continue;
    _aoCorpo.set(o.x, o.y, o.z).sub(camPos);
    const dCorpo = _aoCorpo.length();
    // corpo sem disco à frente (atrás da estrela, raio nulo, ou a câmera
    // DENTRO dele) não esconde nada
    if (!(o.raio > 0) || dCorpo <= o.raio || distEstrela <= dCorpo) continue;
    const razao = o.raio / dCorpo;
    const cosMeioAngulo = Math.sqrt(1 - razao * razao);
    _aoAlvo.set(estrela.x, estrela.y, estrela.z).sub(camPos);
    const cos = _aoAlvo.dot(_aoCorpo) / (distEstrela * dCorpo);
    if (cos > cosMeioAngulo) return true;
  }
  return false;
}

export function projectLabels(
  camera: THREE.PerspectiveCamera,
  named: NamedStar[],
  maxLabels = 7,
  prevKeys?: Set<string>,
  oclusores?: readonly OclusorDeRotulo[]
): StarLabel[] {
  const camPos = camera.position;
  const out: StarLabel[] = [];
  /**
   * OS NOMES QUE UM GLOBO ESCONDE (item 125, F4 · O1-O5) — fora do
   * `out`, e é a lei da NEUTRALIDADE que os põe aqui.
   *
   * O `out` é cortado em `maxLabels` candidatas (`TETO_DE_CANDIDATAS_
   * ESTELARES`), e uma estrela ocluída que disputasse esse teto EMPURRARIA
   * uma estrela visível para fora da tela — a rampa deixaria de mudar o
   * COMO e passaria a mudar o QUEM, que é exatamente o que o item 115
   * proibiu. Elas entram DEPOIS do corte, já marcadas de saída: pintam a
   * rampa de 750 ms e nada mais.
   */
  const ocluidas: StarLabel[] = [];
  const dHome = camPos.length();
  const dGC = camPos.distanceTo(GAL.GC_POS);

  // o coração da galáxia tem nome quando estamos perto dele. O teto
  // caiu de 2,6 kpc para 1,2 (revisão: na fuga do centro a etiqueta
  // ficava flutuando sobre névoa, apontando um objeto já invisível).
  if (dGC > 6 && dGC < 1200) {
    const p = projectPoint(camera, GAL.GC_POS);
    if (p) {
      out.push({
        name: 'Sagittarius A✱',
        spect: 'SMBH',
        distPc: dGC,
        x: p.x,
        y: p.y,
        opacity:
          (1 - THREE.MathUtils.smoothstep(dGC, 800, 1200)) *
          THREE.MathUtils.smoothstep(dGC, 6, 16) *
          0.95,
        key: 'sgr-a',
      });
    }
  }

  // longe de casa (>2 kpc) só resta um rótulo estelar possível: o Sol
  if (dHome > 2000) {
    const p = projectPoint(camera, { x: 0, y: 0, z: 0 });
    if (p) {
      out.push({
        name: 'SOL',
        spect: 'G2V',
        distPc: dHome,
        x: p.x,
        y: p.y,
        opacity: THREE.MathUtils.smoothstep(dHome, 2000, 3800) * 0.95,
        key: 'sol-home',
      });
    }
    return out;
  }

  for (const s of named) {
    _v.set(s.x, s.y, s.z);
    const dist = _v.distanceTo(camPos);
    if (dist < 0.35 || dist > 320) continue;
    // Rótulo é para o que se VÊ. O catálogo grande trouxe 575 nomes
    // próprios da IAU, e entre eles anãs vermelhas vizinhas: Ross 614
    // (m 11) ganhava a vaga de Betelgeuse por estar mais perto, e o filme
    // apontava um nome onde não há estrela visível. A magnitude é
    // recalculada da CÂMERA — quem se aproxima acende, como no shader.
    if (s.m + 5 * Math.log10(dist / Math.max(s.d, 1e-6)) > NAKED_EYE_MAG) continue;

    // A CAIXA DA TELA ANTES DO CONE, e a ordem é só PREÇO (item 115,
    // bloco B, peça 2): os dois testes descartam a mesma estrela, e a
    // lista que sai é a mesma linha a linha. Mas a lista de oclusores
    // deixou de ter um item e passou a ter os corpos do quadro — e
    // pagar trinta cones por estrela que nem chega à tela seria o custo
    // que faz uma peça barata parecer cara.
    const p = projectPoint(camera, s);
    if (!p) continue;
    const ocluida = oclusores !== undefined && escondidaPorDisco(camPos, s, dist, oclusores);

    // opacidade: perto demais ou longe demais → esmaece
    const oNear = THREE.MathUtils.smoothstep(dist, 0.4, 2.2);
    const oFar = 1 - THREE.MathUtils.smoothstep(dist, 140, 320);
    (ocluida ? ocluidas : out).push({
      name: s.n,
      spect: s.s,
      distPc: dist,
      x: p.x,
      y: p.y,
      opacity: Math.min(oNear, oFar) * 0.92,
      key: s.n,
      tier: s.t ?? 0,
      ...(ocluida ? { causaDoSumico: 'oclusao' as const, cortadoPelaRegua: true } : {}),
    });
  }

  // o Sol tem nome em QUALQUER recuo (revisão: ele virava um pontinho
  // anônimo já no Ato I, e o fio "nossa estrela vira um ponto" se perdia)
  if (dHome > 0.12) {
    const p = projectPoint(camera, { x: 0, y: 0, z: 0 });
    if (p) {
      out.push({
        name: 'SOL',
        spect: 'G2V',
        distPc: dHome,
        x: p.x,
        y: p.y,
        opacity: THREE.MathUtils.smoothstep(dHome, 0.12, 0.5) * 0.92,
        key: 'sol-home',
      });
    }
  }

  // Nome próprio antes de Bayer: a disputa é por PROXIMIDADE, e com o
  // catálogo grande (1,7 k nomeadas contra as 90 curadas de antes) uma
  // "κ Dra" a 30 pc expulsaria Deneb da tela. Dentro do mesmo tier vale
  // a distância, com histerese — quem já estava na tela ganha bônus,
  // senão a seleção "pisca" quando estrelas disputam as últimas vagas.
  const rank = (l: StarLabel) =>
    l.distPc * (prevKeys?.has(l.key) ? 0.8 : 1);
  out.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || rank(a) - rank(b));
  // as ocluídas entram DEPOIS do corte, e por isso não movem o corte:
  // as `maxLabels` candidatas são as MESMAS de antes da F4, uma a uma
  return ocluidas.length === 0 ? out.slice(0, maxLabels) : [...out.slice(0, maxLabels), ...ocluidas];
}

/** O que o produtor de rótulos precisa saber de um corpo do sistema. */
export interface CorpoRotulavel {
  /** chave do rótulo — é por ela que o hit-test reconhece um corpo */
  chave: string;
  /** o nome pt-BR, que aqui é o PISO: é ele que sai quando não há inglês */
  nome: string;
  /** o nome inglês (item 130/F2); ausente, o rótulo fica em pt-BR */
  nomeEn?: string;
  /** a palavra da classe, no lugar do tipo espectral */
  classe: string;
}

/**
 * OS RÓTULOS DOS CORPOS DO SISTEMA (Onda 5) — os alvos do
 * clicar-para-enquadrar dentro do Atlas, do mesmo jeito que os nomes das
 * estrelas o são desde a F1.
 *
 * `posicoes` é o Float32Array VIVO do atributo da camada, na ordem da
 * tabela: o rótulo cai onde o ponto está DESENHADO, inclusive depois de
 * um salto de data. Ler o retrato congelado aqui seria a segunda fonte
 * de verdade que a máquina do tempo desmentiria.
 *
 * O FADE DE DISTÂNCIA nasceu em 22/08 (item 73, plano §3): a opacidade
 * era 0,95 FIXA, e a docstring de então dizia "sem fade, dentro do
 * sistema estes dez são o assunto". Dentro do sistema continua sendo
 * verdade e nada muda — o fade só começa a morder a 0,01 pc (2.060 UA),
 * que é 9× mais longe que o TETO do zoom (224 UA) e 226× mais longe que
 * a vista de abertura desde o item 61, e fecha em 0,05 pc. O que ele
 * conserta é a outra ponta: visitar uma estrela a parsecs de
 * casa e continuar lendo "NETUNO · planeta" sobre um ponto que já não
 * existe no quadro.
 */
export const CORPO_FADE_COMECA_PC = 0.01;
export const CORPO_FADE_TERMINA_PC = 0.05;

export function projectCorpos(
  camera: THREE.PerspectiveCamera,
  corpos: readonly CorpoRotulavel[],
  posicoes: Float32Array,
  oclusores?: readonly OclusorDeRotulo[],
  /**
   * O RAIO DE CENA do corpo pela CHAVE do rótulo — a entrada da régua de
   * aparição (item 125, F2 · A5). Ausente (ou `null` para um corpo), a
   * cessão por tamanho não roda e o rótulo se comporta como antes de
   * 01/09: é o que mantém os testes de projeção que não falam de
   * tamanho, e o ramo do FILME, exatamente onde estavam.
   *
   * A FONTE É A ESCADA (`raioFisicoDe`), a mesma que já dá o disco
   * oclusor, o piso do zoom e o raio da malha. Uma segunda tabela de
   * raios aqui seria a segunda verdade que a primeira desmentiria.
   */
  raioDeCena?: (chave: string) => number | null,
  /**
   * A ISENÇÃO DO ALVO SEGUIDO (item 125, F4 · O11) — a chave do corpo em
   * FOCO, que globo nenhum esconde.
   *
   * O literal deles: ao seguir uma entidade o app guarda o `canOcclude`
   * anterior e faz `getComponent(DivComponent).setCanBeOccluded(false)`
   * (offset 1 312 951); ao largar, os valores voltam. É a ÚNICA isenção
   * de encobrimento do Eyes, e ela não é peso: o alvo seguido continua
   * cedendo por TAMANHO como todo mundo (A6, provado na F2).
   *
   * Por que ela existe: quem segue um corpo escolheu aquele corpo. O
   * nome dele sumir porque a lua dele passou na frente — ou porque a
   * câmera entrou na sombra de outro globo — apaga justamente a única
   * etiqueta que responde "o que estou vendo?".
   *
   * Ausente (`undefined`) = nada é isento, que é o Atlas sem foco e o
   * ramo do FILME.
   */
  chaveIsentaDeOclusao?: string
): StarLabel[] {
  const out: StarLabel[] = [];
  // o SEMI-ÂNGULO VERTICAL da lente viva — a régua de `normal-radius` é
  // relativa à TELA, e por isso a lente entra na conta (A2/A5)
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
  for (let i = 0; i < corpos.length && (i + 1) * 3 <= posicoes.length; i++) {
    const x = posicoes[i * 3];
    const y = posicoes[i * 3 + 1];
    const z = posicoes[i * 3 + 2];
    // NaN passaria por projectPoint sem barreira (comparações com NaN
    // são false) e viraria rótulo com x/y inválidos.
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    const p = projectPoint(camera, { x, y, z });
    if (!p) continue;
    const dist = _v.set(x, y, z).distanceTo(camera.position);
    // O CORPO ATRÁS DE OUTRO CORPO TAMBÉM PERDE O NOME (item 115, bloco
    // B, peça 2). É a MESMA lei das estrelas, com a mesma conta: a lua
    // que passou para trás do pai deixa de ter etiqueta em vez de
    // escrevê-la sobre o globo que a esconde. O corpo nunca é oclusor de
    // si mesmo — ver `OclusorDeRotulo.chave`.
    //
    // O `continue` MORREU AQUI (item 125, F4): sumir da lista é sumir num
    // quadro, e o Eyes apaga o nome ocluído em 750 ms como apaga
    // qualquer outro (`hidden` no `<div>`, A8/A10). Agora ele fica na
    // lista com a causa e a marca de saída — quem pinta a rampa é o
    // `LabelCanvas`, e quem o tira da lista quando a tinta acaba é o
    // produtor (`director/rotulos.ts`).
    const ocluido =
      oclusores !== undefined &&
      corpos[i].chave !== chaveIsentaDeOclusao &&
      escondidaPorDisco(camera.position, { x, y, z }, dist, oclusores, corpos[i].chave);
    // A CESSÃO POR TAMANHO APARENTE (F2 · A5) — o nome sai quando o
    // corpo enche a tela, e o ALVO SEGUIDO NÃO É EXCEÇÃO (A6): quem
    // está em foco só ganha PESO na disputa (`PRIORIDADE_DO_ROTULO.foco`,
    // escrito depois, no produtor), e peso não é imunidade a esta régua.
    // Ela roda aqui, antes de tudo, exatamente para que nenhuma promoção
    // posterior possa desfazê-la.
    const raio = raioDeCena?.(corpos[i].chave) ?? null;
    const cessao =
      raio === null ? 1 : cessaoPorTamanhoAparente(raioAparenteNdc(raio, dist, tanHalfFov));
    const classe = corpos[i].classe;
    out.push({
      // O NOME VAI NA LÍNGUA DE AGORA (item 130/F2), pela mesma régua da
      // `classe` logo abaixo — e como este produtor roda POR QUADRO, a troca
      // ao vivo do painel de Ajustes chega ao rótulo 3D no quadro seguinte,
      // sem reconstruir lista nenhuma.
      name: nomeNaLingua(corpos[i]),
      spect: '',
      // A CLASSE VAI TRADUZIDA PARA A TELA e crua para a hierarquia
      // (item 130): `prioridadeDeCorpo` abaixo continua lendo o pt-BR,
      // que é a CHAVE do peso; quem o visitante lê é o texto da língua.
      detalhe: classeEmTexto(classe),
      distPc: dist,
      x: p.x,
      y: p.y,
      opacity:
        0.95 *
        (1 -
          THREE.MathUtils.smoothstep(dist, CORPO_FADE_COMECA_PC, CORPO_FADE_TERMINA_PC)) *
        cessao,
      key: corpos[i].chave,
      prioridade: prioridadeDeCorpo(classe),
      canalPrimario: classe === 'planeta' || classe === 'estrela',
      // A CAUSA DE FORA MANDA, e a ordem é a do Eyes: as duas são o
      // mesmo `hidden` do `DivComponent`, testado na mesma função e na
      // mesma ordem — fade zero primeiro, oclusão depois (O9).
      ...(cessao <= 0
        ? { causaDoSumico: 'tamanho' as const }
        : ocluido
          ? { causaDoSumico: 'oclusao' as const, cortadoPelaRegua: true }
          : {}),
    });
  }
  return out;
}

/**
 * Etiqueta FORÇADA do assunto do shot: projeta sem os fades de
 * distância — o alvo do beat nunca fica anônimo (regra editorial da
 * revisão: "o assunto sempre tem nome; o fundo fica mudo").
 */
export function projectForced(
  camera: THREE.PerspectiveCamera,
  name: string,
  spect: string,
  pos: { x: number; y: number; z: number },
  key: string
): StarLabel | null {
  const p = projectPoint(camera, pos);
  if (!p) return null;
  const dist = _v.set(pos.x, pos.y, pos.z).distanceTo(camera.position);
  return { name, spect, distPc: dist, x: p.x, y: p.y, opacity: 0.95, key };
}
