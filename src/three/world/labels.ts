// ============================================================
// Rótulos das estrelas nomeadas — projeção 3D → Canvas 2D do HUD.
// No voo livre eles também são os ALVOS do clicar-para-visitar.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import { GAL } from './baseGalactica';

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
   * O valor sai da tabela `PRIORIDADE_DO_ROTULO`, e a razão de ele ser
   * um NÚMERO e não uma classe é o bônus de histerese: quem estava
   * desenhado no quadro anterior vale 20% a mais, e isso é uma
   * multiplicação, não um caso novo.
   */
  prioridade?: number;
  /**
   * A RÉGUA DE RELEVÂNCIA DISSE NÃO (item 82, N1) — este nome projetou,
   * mas a tela já está cheia de nomes que importam mais.
   *
   * É uma MARCA e não uma remoção da lista de propósito: `alvos` continua
   * sendo a projeção inteira (o que o Director publica e o juiz lê), e
   * quem foi cortado nasce `desenhado: false` como qualquer outro
   * descarte do desenho. Sem a marca, o corte teria de acontecer
   * removendo da lista, e aí a diferença entre "a régua não quis" e "não
   * coube" ficaria invisível para quem mede.
   */
  cortadoPelaRegua?: boolean;
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
   *  · `'disputa'` — a régua de relevância cortou: a tela está cheia de
   *    nomes que importam mais. É o `hiddenByLabelQuadtree` deles, e é
   *    a mesma marca que `cortadoPelaRegua` já carregava.
   *
   * A CAUSA É ESTADO, não decoração: `RampasDeRotulo` a lê para pôr as
   * duas sob a MESMA rampa de saída, e a F3 (prioridade e colisão) vai
   * precisar distinguir quem perdeu a vaga de quem saiu de cena.
   *
   * O QUE ELA NÃO COBRE, e está declarado: oclusão e atrás-da-câmera
   * retiram o rótulo da LISTA (`projectCorpos`/`projectLabels` dão
   * `continue`), então não há objeto onde escrever a marca — eles caem
   * no ramo "sumiu da lista" da rampa, que usa a mesma
   * `RAMPA_DE_SAIDA_S`. Trazer esses dois para a lista é obra da F4.
   */
  causaDoSumico?: 'tamanho' | 'disputa';
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
 * A HIERARQUIA DOS NOMES, numa tabela só — a reimplementação do
 * `OverlayPositionTracker` do atlas doador (item 73, plano §3).
 *
 * O que ela resolve, medido no TETO do zoom (224 UA — a vista de
 * abertura até 23/08, e desde o item 61 o lugar aonde a roda leva): os
 * dez corpos e as 21 luas projetam a menos de 1% de tela uns dos
 * outros, e quem chegava primeiro na lista ocupava. O resultado era
 * Saturno nascendo `desenhado: false` por colidir com "SOL", e a queixa
 * do dono — *"conseguíamos ver os rótulos de todos objetos de forma
 * inteligente"*.
 *
 * OS NÚMEROS, e a razão de cada degrau:
 *  · `foco` 120 — o que o visitante escolheu nunca cede a nada. **Era
 *    100, e 100 NÃO CUMPRIA a própria promessa** (achado em 24/08, ao
 *    escrever a trava de hierarquia): o bônus de histerese multiplica o
 *    peso de quem já estava na tela, e `sol` 90 × 1,2 = **108 > 100** —
 *    um Sol já desenhado passava à frente de um alvo recém-escolhido que
 *    ainda não tivesse aparecido, que é exatamente o que esta linha jura
 *    que não acontece. 120 dá **folga** sobre os 108 — não é o menor
 *    valor que serviria (110 já passaria a trava): é o degrau redondo
 *    que deixa margem para a tabela crescer sem raspar no limite;
 *  · `sol` 90 — a estrela da casa é o centro do frame e a referência de
 *    escala de toda vista do Atlas;
 *  · `planeta` 10, `anao` 8, `lua` 6 — a hierarquia do próprio objeto;
 *  · `estrelaPropria` 5 e `estrelaBayer` 3 — o tier que
 *    `projectLabels` já usava para desempatar, virado peso: nome
 *    próprio acima de designação;
 *  · `outros` 4 — Sagittarius A✱ e o que mais chegar sem classe.
 */
export const PRIORIDADE_DO_ROTULO = {
  foco: 120,
  sol: 90,
  planeta: 10,
  anao: 8,
  lua: 6,
  estrelaPropria: 5,
  outros: 4,
  estrelaBayer: 3,
} as const;

/**
 * O bônus de quem JÁ ESTAVA na tela — a histerese, em fator.
 *
 * **ELE NÃO PODE INVERTER A TABELA ACIMA**, e essa é a trava que
 * `labels.test.ts` guarda par a par: para todo degrau vizinho, o de
 * baixo COM bônus não passa o de cima sem bônus. A folga mais apertada é
 * `lua` 6 contra `estrelaPropria` 5 × 1,2 = **6,0** — empate exato, que
 * o desempate por distância resolve. Subir este fator para 1,25
 * inverteria esse par (6,25 > 6) e uma estrela roubaria a vaga de uma
 * lua — mas ESSE caso já tinha pino antes da trava; quem a fez nascer
 * foi o par `sol`/`foco`, que não tinha juiz nenhum (ver a tabela).
 */
export const BONUS_DE_HISTERESE = 1.2;

/**
 * A prioridade de um corpo do sistema, pela CLASSE em pt-BR que a
 * tabela `NOMES_DOS_CORPOS` já publica ("estrela", "planeta", "planeta
 * anão", "lua", "asteroide"). Deriva do dado que existe — uma segunda
 * tabela de ids seria a segunda fonte de verdade que a primeira
 * desmentiria no dia em que alguém promovesse Ceres.
 */
export function prioridadeDeCorpo(classe: string): number {
  if (classe === 'estrela') return PRIORIDADE_DO_ROTULO.sol;
  if (classe === 'planeta') return PRIORIDADE_DO_ROTULO.planeta;
  if (classe === 'lua') return PRIORIDADE_DO_ROTULO.lua;
  if (classe === 'planeta anão' || classe === 'asteroide') {
    return PRIORIDADE_DO_ROTULO.anao;
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
 * O PESO da disputa: prioridade × histerese. Quem estava desenhado no
 * quadro anterior vale 20% a mais — sem isso a seleção PISCA quando dois
 * nomes disputam a mesma vaga e a projeção anda um pixel. É a mesma
 * histerese que `projectLabels` já tinha na disputa entre estrelas
 * (`prevKeys`), generalizada para a lista inteira.
 */
export function pesoDoRotulo(
  label: StarLabel,
  desenhadosAntes?: ReadonlySet<string>
): number {
  const base = label.prioridade ?? PRIORIDADE_DO_ROTULO.outros;
  return desenhadosAntes?.has(label.key) ? base * BONUS_DE_HISTERESE : base;
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
 * QUANTOS NOMES A TELA CARREGA AO MESMO TEMPO — a régua de relevância do
 * item 82, e a metade que o NASA Eyes não tem.
 *
 * O estudo do Eyes (`docs/reference/estudo-orbitas-eyes-observacao.md`,
 * §5) mediu numa vista só: 103 nomes no DOM, 40 acesos, 11 mortos por
 * colisão. A quadtree deles resolve SOBREPOSIÇÃO e resolve bem — e ainda
 * assim quarenta nomes acesos é confusão. O Eyes nunca decide que um
 * objeto **não interessa**; só decide que ele **não cabe**. Esta
 * constante é a decisão que falta: primeiro corta-se por IMPORTÂNCIA,
 * e só o que sobra vai disputar lugar na tela.
 *
 * O NÚMERO É MEDIDO, não escolhido no ar. Antes dele a abertura do Atlas
 * desenhava 22 nomes — os cinco corpos em quadro e DEZESSETE estrelas,
 * quase todas designações de Bayer (ε Ind, ι Pav, τ PsA…) com traço de
 * até 102 px em volta do sistema. Era a queixa viva do dono:
 * *"o default todos os objetos estao com o label ligado, fica uma
 * confusao na tela"*. Com dez vagas a mesma abertura desenha o Sol, os
 * quatro rochosos e as estrelas de NOME PRÓPRIO que couberem — e as
 * designações de Bayer, que são o último degrau da tabela, caem
 * sozinhas, sem uma regra nova que as nomeie.
 *
 * Dez e não cinco: no TETO do zoom os dez corpos do sistema são o
 * assunto inteiro do quadro, e um orçamento menor cortaria planeta para
 * caber estrela de fundo. Quem some lá é a COLISÃO, que é outra lei.
 */
export const ORCAMENTO_DE_NOMES = 10;

/**
 * A RÉGUA DE RELEVÂNCIA, ANTES DA GEOMETRIA (item 82, N1) — ordena a
 * lista pela hierarquia da casa e marca o que passa do orçamento.
 *
 * A ORDEM É A DISPUTA: o `LabelCanvas` desenha na ordem que recebe e
 * quem chega primeiro ocupa, então ordenar aqui É decidir quem vence a
 * colisão. Empate desempata pelo mais PERTO, que é a régua que a lista
 * já usava entre estrelas.
 *
 * Não há tabela nova: o peso é o `pesoDoRotulo` de sempre
 * (`PRIORIDADE_DO_ROTULO` × a histerese de quem já estava na tela). O
 * bônus dos 20% é o que impede o corte de PISCAR — dois nomes de mesmo
 * peso disputando a última vaga trocariam de lugar a cada quadro em que
 * a projeção andasse um pixel.
 */
export function aplicarReguaDeRelevancia(
  lista: StarLabel[],
  desenhadosAntes?: ReadonlySet<string>,
  orcamento: number = ORCAMENTO_DE_NOMES
): StarLabel[] {
  lista.sort(
    (a, b) =>
      pesoDoRotulo(b, desenhadosAntes) - pesoDoRotulo(a, desenhadosAntes) ||
      a.distPc - b.distPc
  );
  let vagas = orcamento;
  for (const l of lista) {
    // o que já está invisível não gasta vaga: quem o descarta é o
    // desenho, pela mesma soleira
    if (l.opacity < OPACIDADE_MINIMA_DO_ROTULO) continue;
    // A MARCA SÓ SE ACENDE, NUNCA SE APAGA — e é por isso que o contrato
    // é lista NOVA a cada quadro. `projectCorpos` e `projectLabels`
    // constroem os objetos do zero em toda projeção, então um rótulo
    // nunca chega aqui trazendo o "não" do quadro anterior. Quem
    // reaproveitar uma lista entre quadros tem de limpar a marca antes,
    // senão o corte de um quadro vira sentença perpétua.
    if (vagas > 0) vagas--;
    else {
      l.cortadoPelaRegua = true;
      // A CAUSA fica legível no estado (item 125, F2 · A10): este é o
      // `hiddenByLabelQuadtree` deles — perdeu a DISPUTA por espaço, não
      // saiu de cena.
      l.causaDoSumico = 'disputa';
    }
  }
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
  if (x < 0.04 || x > 0.96 || y < 0.08 || y > 0.9) return null;
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
    if (oclusores && escondidaPorDisco(camPos, s, dist, oclusores)) continue;

    // opacidade: perto demais ou longe demais → esmaece
    const oNear = THREE.MathUtils.smoothstep(dist, 0.4, 2.2);
    const oFar = 1 - THREE.MathUtils.smoothstep(dist, 140, 320);
    out.push({
      name: s.n,
      spect: s.s,
      distPc: dist,
      x: p.x,
      y: p.y,
      opacity: Math.min(oNear, oFar) * 0.92,
      key: s.n,
      tier: s.t ?? 0,
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
  return out.slice(0, maxLabels);
}

/** O que o produtor de rótulos precisa saber de um corpo do sistema. */
export interface CorpoRotulavel {
  /** chave do rótulo — é por ela que o hit-test reconhece um corpo */
  chave: string;
  nome: string;
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
  raioDeCena?: (chave: string) => number | null
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
    if (oclusores && escondidaPorDisco(camera.position, { x, y, z }, dist, oclusores, corpos[i].chave)) {
      continue;
    }
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
      name: corpos[i].nome,
      spect: '',
      detalhe: classe,
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
      ...(cessao <= 0 ? { causaDoSumico: 'tamanho' as const } : {}),
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
