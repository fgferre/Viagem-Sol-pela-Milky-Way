// ============================================================
// O CONFIG ÚNICO DO ATLAS (Onda 5, decisão D6) — um arquivo, uma fonte
// de verdade, dois consumidores.
//
// O que mora aqui:
//  1. A TABELA DE CAMADAS da casa, com a FAMÍLIA de cada uma. Ela vivia
//     dentro do `Ajustes.tsx` enquanto o painel do filme era o único a
//     lê-la; depois teve dois leitores (o painel e a gaveta do Atlas), e
//     desde 22/08 (item 61) tem UM SÓ: a gaveta. Palavras do dono:
//     *"atlas - camadas e ajustes concorrem. vc nao acha que varios
//     elementos que hj estao em ajustes na verdade deveriam ser
//     camadas?"* — as 17 camadas de então eram 17 dos 32 controles do painel de
//     Ajustes E seis linhas da gaveta, duas portas para a mesma lista.
//     Agora a porta é uma, e a `familia` é o que a torna legível: uma
//     fileira de caixas é um inventário, três famílias com contagem são
//     um mapa. (A conta cresce — o item 77 trouxe a décima oitava e o
//     item 82 a DÉCIMA NONA, os nomes na tela —, e é justamente por isso
//     que nenhum número dela se digita: os três hospedeiros derivam
//     desta tabela.)
//  2. A TABELA DOS QUATRO ESTADOS do seletor de qualidade (Ajustes D),
//     pela MESMA razão e com a mesma história: dois leitores (o painel
//     e o `<select>` da barra) e a lista digitada duas vezes.
//
// E o que este arquivo é PERANTE O SELO: governado. Ele está em
// `ARQUIVOS_GOVERNADOS` (`selo.ts`), então porta de URL nova aqui sem
// entrada no registro quebra a varredura de completude. (O item que
// citava a GRADAÇÃO POR CONTEXTO da F6 saiu: ela morreu no M1 da Lei
// da Estrela junto com o `claraoDoAtlas` — a regra de declaração é que
// continua de pé, e vale para qualquer porta, não só para aquela.)
//
// Este arquivo não toca `window`, não importa three e não importa React:
// é lido pelo HUD e pelo Director, e é isso que o mantém testável.
// ============================================================
import { IDS_FOTOMETRIA } from './world/planetas/fotometria';
import { idiomaAtual, t } from '../lib/idioma';
import type { ChaveDeTexto } from '../lib/idioma';
// só o TIPO: a união dos quatro estados do seletor mora no engine (é
// ele quem lê a porta `?q=`), e o `import type` é apagado na compilação
// — este arquivo continua sem importar three nem React.
import type {
  EscolhaDeQualidade,
  EstadoDaQualidade,
  GasVolumetrico,
  NivelDaNebulosa,
  ParticulasDaGalaxia,
} from './core/engine';

/**
 * O AGRUPAMENTO DA GAVETA — três, e são as três escalas da casa: o que
 * é da galáxia, o que é das estrelas e o que é do sistema solar. A
 * família não é decoração de UI: é a resposta à pergunta "o que essa
 * caixa desliga?", e ela sai do que a flag realmente apaga na cena, não
 * do lugar em que a linha caiu na tabela.
 */
export type FamiliaDeCamada = 'Galáxia' | 'Estrelas' | 'Sistema solar';

/** A ordem em que a gaveta as mostra — de fora para dentro. */
export const FAMILIAS_DE_CAMADAS: readonly FamiliaDeCamada[] = [
  'Galáxia',
  'Estrelas',
  'Sistema solar',
];

/** Uma CAMADA da cena: um conjunto de coisas que se desliga de uma vez. */
export interface Camada {
  /** a flag que o Director já lê (`?nogal=1`, `hide.has('nogal')`) */
  flag: string;
  /** rótulo na língua de agora (item 130) — o que a gaveta mostra e o
   *  que o selo nomeia; a chave do dicionário é a própria `flag` */
  nome: string;
  /**
   * A NOTA da linha (06/09, padrão de Ajustes aplicado à gaveta) — UMA
   * frase factual, sob o "?": o que a camada desenha e onde se vê,
   * derivada do próprio código que a flag desliga (`director.ts` e os
   * mundos). Mesma doutrina do `nome`: getter na língua de agora, chave
   * `camada.<flag>.nota` no dicionário.
   */
  nota: string;
  /** em que grupo da gaveta ela aparece */
  familia: FamiliaDeCamada;
  /**
   * A flag é lida POR QUADRO (troca ao vivo); `false` exigiria recarga.
   * Desde 2026-08-12 **todas** são vivas — as três últimas a recarregar
   * (nodisc/nogdust/noglow) nunca foram lidas no bake. Quem lê este
   * campo hoje é o REGISTRO DO SELO (`selo.ts`, que declara cada porta
   * como `vivo` ou `recarregar`); o ↻ que a UI mostrava morreu com a
   * seção "Camadas" do painel de Ajustes (item 61, 22/08), e quem
   * escrever `viva: false` vai ter de dar a ela uma marca nova na
   * gaveta — além de provar que o mundo precisa MESMO ser reconstruído,
   * que é o que `atlasConfig.test.ts` cobra.
   */
  viva: boolean;
  /**
   * O GLIFO da linha na gaveta, quando existe. Era ele que decidia
   * QUEM entrava na gaveta (D6, seis das dezessete de então); desde 22/08 a
   * gaveta é a única porta e mostra TODAS — o ícone voltou a ser o que
   * o nome dele diz: ornamento do rótulo, nas que o têm. A
   * COLUNA dele existe em todas as linhas mesmo quando o glifo falta,
   * senão os nomes de uma mesma família não se alinhariam entre si.
   */
  icone?: string;
}

/**
 * As camadas da casa, agrupadas por FAMÍLIA e, dentro de cada uma, na
 * ordem de sempre. TODAS TROCAM AO VIVO desde 2026-08-12: as três da
 * galáxia (lâminas, extinção por partícula, bojo) eram `viva: false` por
 * um comentário podre — `bakeDiscLayers` roda inteiro de qualquer jeito,
 * o τRT inclusive, e elas só governam `mesh.visible` e o bind de
 * `uTauMap`, que a `Galaxy` reescreve por quadro. Nenhuma delas recarrega
 * a página.
 *
 * Esta tabela é a ÚNICA lista de camadas (item 33): o registro do selo
 * e o laço de flags do Director DERIVAM dela. Quatro delas nasceram
 * só-URL dentro do director (nosun/nodust/noco/noforge) e viveram sem
 * nome pt-BR nem caixa — o selo escrevia a flag crua e quem chegava
 * com `?nosun=1` não tinha onde religar.
 */
export const CAMADAS: readonly Camada[] = [
  { flag: 'nogal', get nome() { return t('camada.nogal'); }, get nota() { return t('camada.nogal.nota'); }, familia: 'Galáxia', viva: true },
  { flag: 'nodisc', get nome() { return t('camada.nodisc'); }, get nota() { return t('camada.nodisc.nota'); }, familia: 'Galáxia', viva: true },
  { flag: 'nogdust', get nome() { return t('camada.nogdust'); }, get nota() { return t('camada.nogdust.nota'); }, familia: 'Galáxia', viva: true },
  { flag: 'noglow', get nome() { return t('camada.noglow'); }, get nota() { return t('camada.noglow.nota'); }, familia: 'Galáxia', viva: true },
  { flag: 'nocart', get nome() { return t('camada.nocart'); }, get nota() { return t('camada.nocart.nota'); }, familia: 'Galáxia', viva: true },
  // a bissecção de `nocart`: nuvens CO medidas e forjas estelares têm
  // chave própria — o tick as lê por quadro junto com a cartografia
  { flag: 'noco', get nome() { return t('camada.noco'); }, get nota() { return t('camada.noco.nota'); }, familia: 'Galáxia', viva: true },
  { flag: 'noforge', get nome() { return t('camada.noforge'); }, get nota() { return t('camada.noforge.nota'); }, familia: 'Galáxia', viva: true },
  { flag: 'nonebula', get nome() { return t('camada.nonebula'); }, get nota() { return t('camada.nonebula.nota'); }, familia: 'Galáxia', viva: true },
  { flag: 'nowrap', get nome() { return t('camada.nowrap'); }, get nota() { return t('camada.nowrap.nota'); }, familia: 'Galáxia', viva: true },
  // a poeira de paralaxe perto da câmera (`world/dust.ts`) — o tick lê
  // `hide.has('nodust')` por quadro no fade dela. É poeira INTERESTELAR
  // vista de perto, não poeira do sistema solar: a família é a galáxia.
  { flag: 'nodust', get nome() { return t('camada.nodust'); }, get nota() { return t('camada.nodust.nota'); }, familia: 'Galáxia', viva: true },
  { flag: 'nobh', get nome() { return t('camada.nobh'); }, get nota() { return t('camada.nobh.nota'); }, familia: 'Galáxia', viva: true, icone: '✱' },
  { flag: 'nocat', get nome() { return t('camada.nocat'); }, get nota() { return t('camada.nocat.nota'); }, familia: 'Estrelas', viva: true, icone: '⁂' },
  // OS NOMES NA TELA (item 82, N2) — a chave `Labels` que o NASA Eyes
  // tem e nós não tínhamos. As órbitas ganharam `noorbitas` no item 77 e
  // os nomes não tinham nada: quem achasse a tela poluída só podia sair
  // do Atlas. A flag desliga TODOS os nomes, dos corpos e das estrelas;
  // quem decide QUAIS aparecem com ela ligada é a régua de relevância
  // (`aplicarReguaDeRelevancia`), que é outra lei.
  //
  // A FAMÍLIA é "Estrelas" porque é o que a flag realmente apaga em
  // quantidade e é de onde veio a queixa: a abertura desenhava cinco
  // nomes de corpo e DEZESSETE de estrela. Ela mora ao lado das outras
  // duas coisas que uma estrela põe na tela — o ponto do catálogo e o
  // clarão —, e a terceira é o nome dela.
  { flag: 'nonomes', get nome() { return t('camada.nonomes'); }, get nota() { return t('camada.nonomes.nota'); }, familia: 'Estrelas', viva: true, icone: '⌶' },
  // M2 da Lei: `nohero` virou `noclarao`. O que a chave desliga são as
  // DUAS camadas de fonte forte, e voltou a incluir as 16 heroes de
  // autor com o resgate de 16/08 (`world/heroStars.ts`): o tick esconde
  // `heroes.group` e o clarão de asas (`world/clarao.ts`, o Sol) pela
  // mesma `hide.has('noclarao')`.
  { flag: 'noclarao', get nome() { return t('camada.noclarao'); }, get nota() { return t('camada.noclarao.nota'); }, familia: 'Estrelas', viva: true, icone: '✦' },
  // o Sol inteiro em cena — o gate por quadro vive em
  // `director/solNoQuadro.ts` (`fios.escondido('nosun')`)
  { flag: 'nosun', get nome() { return t('camada.nosun'); }, get nota() { return t('camada.nosun.nota'); }, familia: 'Sistema solar', viva: true },
  { flag: 'nomarker', get nome() { return t('camada.nomarker'); }, get nota() { return t('camada.nomarker.nota'); }, familia: 'Sistema solar', viva: true, icone: '⌖' },
  { flag: 'noplan', get nome() { return t('camada.noplan'); }, get nota() { return t('camada.noplan.nota'); }, familia: 'Sistema solar', viva: true, icone: '◉' },
  // item 89: o ícone é camada SEPARADA do texto (Eyes: Labels ≠ Icons)
  // — desligar os nomes deixa o céu limpo E navegável; quem quiser o
  // silêncio de antes desliga as duas
  { flag: 'noicones', get nome() { return t('camada.noicones'); }, get nota() { return t('camada.noicones.nota'); }, familia: 'Sistema solar', viva: true, icone: '◎' },
  // O PALCO LOCAL da Onda 6 (F0): os corpos resolvidos — os globos de
  // perto, distintos dos PONTOS fotométricos de `noplan`. Entra vazio
  // nesta fase (nenhum mesh ainda; o toggle não muda pixel até F2),
  // mas nasce DECLARADO aqui e no selo, como a lei das portas manda.
  { flag: 'nocorpos', get nome() { return t('camada.nocorpos'); }, get nota() { return t('camada.nocorpos.nota'); }, familia: 'Sistema solar', viva: true, icone: '◐' },
  // AS LINHAS DE ÓRBITA (item 77, 23/08) — `world/orbitas.ts`. A órbita
  // é o DADO, não enfeite: sem ela o Atlas mostra dez pontos soltos e
  // ninguém lê que Marte está entre a Terra e Júpiter. É instrumento de
  // leitura, da família do marcador e dos rótulos, e não matéria — o
  // que a chave desliga é a curva, nunca um fóton. Com ícone ela entra
  // na gaveta de graça e o selo a declara pela derivação de sempre.
  { flag: 'noorbitas', get nome() { return t('camada.noorbitas'); }, get nota() { return t('camada.noorbitas.nota'); }, familia: 'Sistema solar', viva: true, icone: '◜' },
];

/**
 * A TABELA JÁ AGRUPADA — o que a gaveta desenha, derivado e nunca
 * redigitado. A família vazia não nasce: um grupo com zero linhas seria
 * um título prometendo o que não há.
 */
export const CAMADAS_POR_FAMILIA: readonly {
  familia: FamiliaDeCamada;
  camadas: readonly Camada[];
}[] = FAMILIAS_DE_CAMADAS.map((familia) => ({
  familia,
  camadas: CAMADAS.filter((c) => c.familia === familia),
})).filter((g) => g.camadas.length > 0);

/** Um estado do seletor de qualidade, como o visitante o lê. */
export interface EscolhaNaUi {
  id: EscolhaDeQualidade;
  /** o nome na língua de agora (item 130), o mesmo nos dois hospedeiros */
  nome: string;
  /** o glifo da barra de controles — peso visual crescente */
  simbolo: string;
}

/**
 * OS QUATRO ESTADOS DO SELETOR (Ajustes D). Mesma história das camadas,
 * e é por isso que a tabela mora AQUI: a lista tinha DOIS leitores — os
 * botões do painel e o `<select>` da barra — e vivia digitada duas
 * vezes, com o painel oferecendo três estados sem símbolo e a barra
 * três `<option>` à mão. Duas listas é a segunda fonte de verdade
 * nascendo (AGENTS 4), e a letra D acrescentaria o quarto estado a uma
 * delas.
 *
 * A ORDEM é a do peso: do mais caro ao mais barato, e o `auto` por
 * último — ele não é um degrau da escada, é quem escolhe o degrau.
 * O `id` casa com a união do engine, então tier novo (ou estado novo)
 * não tem como nascer sem passar por esta tabela.
 */
export const QUALIDADES: readonly EscolhaNaUi[] = [
  { id: 'cinema', get nome() { return t('qualidade.cinema'); }, simbolo: '◆' },
  { id: 'alta', get nome() { return t('qualidade.alta'); }, simbolo: '◇' },
  { id: 'performance', get nome() { return t('qualidade.performance'); }, simbolo: '◦' },
  { id: 'auto', get nome() { return t('qualidade.auto'); }, simbolo: '⟳' },
];

const nomeDaQualidade = (id: EscolhaDeQualidade) =>
  QUALIDADES.find((q) => q.id === id)?.nome ?? id;

/**
 * O ESTADO DA QUALIDADE EM UMA FRASE — o título do seletor da barra e a
 * nota do painel saem daqui, para não haver duas maneiras de contar a
 * mesma coisa.
 *
 * A frase muda com a POLÍTICA, porque a pergunta que ela responde muda:
 * no manual o visitante quer saber se a máquina está dando conta (e é
 * aqui que a medição SUGERE, sem tocar em nada); no Auto ele quer saber
 * onde a medição pousou. E "medindo" é dito quando é verdade: depois de
 * cada troca de tier a média recomeça, e fingir um número velho seria o
 * HUD mentindo sobre o instrumento.
 */
/**
 * O NÍVEL DA NEBULOSA COMO O VISITANTE O LÊ (item 145). Mesma doutrina
 * da `classe`: o nível é chave (`baixa`/`media`/`alta`, a mesma que vai
 * ao `?nebula=`), e a tradução mora no caminho da tela — a gaveta e o
 * selo leem daqui, e não têm duas maneiras de nomear a mesma escolha.
 */
export function nivelDaNebulosaEmTexto(nivel: NivelDaNebulosa): string {
  return t(`ajustes.nebulosa.${nivel}` as ChaveDeTexto);
}

/**
 * O GÁS VOLUMÉTRICO COMO O VISITANTE O LÊ (item 145b). Mesma doutrina
 * do nível da nebulosa: a variante é chave (`antigo`/`fino`/`macio`, a
 * mesma que vai ao `?gas=`), e a tradução mora no caminho da tela.
 */
export function gasVolumetricoEmTexto(variante: GasVolumetrico): string {
  return t(`ajustes.gas.${variante}` as ChaveDeTexto);
}

/**
 * AS PARTÍCULAS DA GALÁXIA COMO O VISITANTE AS LÊ (item 149). Mesma
 * doutrina do gás: o nível é chave (`todas`/`metade`/`quarto`, a mesma
 * que vai ao `?particulas=`), e a tradução mora no caminho da tela.
 */
export function particulasDaGalaxiaEmTexto(nivel: ParticulasDaGalaxia): string {
  return t(`ajustes.particulas.${nivel}` as ChaveDeTexto);
}

/**
 * A ESCALA DE RESOLUÇÃO COMO O VISITANTE A LÊ: fração vira porcentagem
 * (0,5 → "50%"). Sem casa decimal porque os três degraus são inteiros
 * em porcento; o dia em que não forem, a régua é esta função.
 */
export function rotuloDaEscalaDeResolucao(fator: number): string {
  return `${Math.round(fator * 100)}%`;
}

/**
 * MEXEU NA GAVETA AVANÇADO? (item 145, +145b, +149) — qualquer um dos
 * cinco controles fora do preset basta. É a régua do "Personalizado", e
 * mora numa função só para o rótulo e quem mais precisar dela não
 * divergirem.
 */
export const foraDoPreset = (e: EstadoDaQualidade): boolean =>
  e.amostras !== null ||
  e.nebulosa !== null ||
  e.escala !== null ||
  e.gas !== null ||
  e.particulas !== null;

export function rotuloDaQualidade(e: EstadoDaQualidade): string {
  // PERSONALIZADO (item 145, +145b, +149): mexeu num controle da gaveta
  // Avançado — suavização de bordas, nebulosa, escala de resolução, gás
  // volumétrico ou partículas da galáxia —, e o nome do preset deixa de
  // descrever o que a máquina desenha. O rótulo NÃO
  // troca de frase por isso: só o nome do tier ganha a marca, e as
  // quatro frases (medindo, auto medindo, auto pousou, confere/sugere)
  // continuam inteiras.
  const aqui = foraDoPreset(e)
    ? t('qualidade.personalizado', { tier: nomeDaQualidade(e.tier) })
    : nomeDaQualidade(e.tier);
  if (!e.medicao) {
    return e.escolha === 'auto'
      ? t('qualidade.autoMedindo', { tier: aqui })
      : t('qualidade.medindo', { tier: aqui });
  }
  const quadros = t('qualidade.quadros', { fps: Math.round(e.medicao.fps) });
  if (e.escolha === 'auto') {
    return t('qualidade.autoPousou', { tier: aqui, quadros });
  }
  if (e.medicao.sugestao === e.tier) {
    return t('qualidade.confere', { tier: aqui, quadros });
  }
  return t('qualidade.sugere', {
    tier: aqui,
    quadros,
    sugestao: nomeDaQualidade(e.medicao.sugestao),
  });
}

/**
 * A CLASSE DE UM CORPO COMO O VISITANTE A LÊ (item 130). O campo
 * `classe` das tabelas continua em pt-BR e continua sendo CHAVE — é por
 * ele que `world/labels.prioridadeDeCorpo` decide o peso do rótulo, e
 * traduzir o dado quebraria a hierarquia dos nomes. A tradução mora
 * AQUI, no caminho da tela, e em nenhum outro lugar.
 */
export function classeEmTexto(classe: string): string {
  return t(`classe.${classe}` as ChaveDeTexto);
}

/**
 * A FAMÍLIA DE CAMADAS COMO A GAVETA A ESCREVE. Mesma doutrina da
 * classe: `familia` é chave de agrupamento (e união de tipo), a
 * tradução mora no caminho da tela.
 */
export function familiaEmTexto(familia: FamiliaDeCamada): string {
  return t(`familia.${familia}` as ChaveDeTexto);
}

/**
 * OS DEZ CORPOS DO RETRATO, com o nome que o visitante lê e a palavra
 * que diz o que eles são. Até a Onda 5 a camada os DESENHAVA no Atlas e
 * nenhum deles era alvo de nada — sem rótulo, sem clique, sem busca, sem
 * deep-link —, num modo que se chama "Atlas navegável do sistema solar".
 * Três linhas da matriz do PLANO tinham destino nesta onda; esta tabela é
 * o dado que faltava às três.
 *
 * A ORDEM É A DA CAMADA (`IDS_FOTOMETRIA`), e é derivada dela em vez de
 * redigitada: o índice desta lista é o índice do VÉRTICE, e é por ele que
 * o rótulo lê a posição VIVA do atributo (a que a máquina do tempo
 * reescreve). Um segundo array na mão aqui seria a divergência silenciosa
 * de sempre — o rótulo de Marte sobre o ponto de Júpiter.
 *
 * A CLASSE é a palavra da legenda, não taxonomia: ela ocupa no rótulo o
 * lugar que o tipo espectral ocupa numa estrela. Plutão entra como
 * "planeta anão" porque é o que ele é desde 2006, e porque a alternativa
 * — chamá-lo de planeta para a lista ficar uniforme — seria a casa
 * mentindo sobre dado para caber num layout.
 */
export interface CorpoDoSistema {
  /** id da camada — o mesmo de `IDS_FOTOMETRIA` e do retrato */
  id: string;
  /** nome pt-BR: a CHAVE (o que se digita na busca, o que o `?foco=` grava,
   *  o que desempata dois alvos com o mesmo score). Quem o visitante LÊ sai
   *  de `nomeNaLingua`/`nomeDoCorpo` — a mesma divisão que a `classe` já
   *  tinha desde a F1 do item 130: crua para a máquina, traduzida na tela. */
  nome: string;
  /** o mesmo nome em inglês, na grafia da IAU (`Iapetus`, `Enceladus`) */
  nomeEn: string;
  /** a palavra que diz o que ele é, no vocabulário da legenda */
  classe: string;
  /** chave do rótulo — o hit-test reconhece um corpo por este prefixo */
  chave: string;
}

/**
 * O TÍTULO-CASO da casa: 'LUA' → 'Lua', 'TITÃ' → 'Titã' (o Unicode do
 * pt-BR entra de graça — `toLowerCase`/`toUpperCase` do JS tratam
 * acento). Exportado porque é a LEI de conversão entre o `i18n.pt` de
 * `corpos.json` (que grita em caixa alta) e o nome que o visitante lê.
 */
export function tituloDeCorpo(nomePt: string): string {
  return nomePt
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toUpperCase());
}

/**
 * UMA FONTE DE NOME (emenda P-E10b; as DUAS línguas desde o item 130/F2):
 * esta tabela é ESPELHO declarado do `name` de
 * `public/data/atlas/corpos.json` — `nome` do `name.pt`, `nomeEn` do
 * `name.en` —, com o case tratado por `tituloDeCorpo`, e o teste de
 * completude em `atlasConfig.test.ts` cobra a igualdade entrada a entrada
 * contra o JSON real (uma divergência de grafia quebra o teste, não a
 * tela). Espelho e não fetch porque este módulo é síncrono e puro (é lido
 * pelo HUD e pelo Director antes de qualquer rede); a CLASSE é vocabulário
 * da legenda da casa, que o JSON não carrega.
 */
export const NOMES_DOS_CORPOS: Record<
  string,
  { nome: string; nomeEn: string; classe: string }
> = {
  sun: { nome: 'Sol', nomeEn: 'Sun', classe: 'estrela' },
  mercury: { nome: 'Mercúrio', nomeEn: 'Mercury', classe: 'planeta' },
  venus: { nome: 'Vênus', nomeEn: 'Venus', classe: 'planeta' },
  earth: { nome: 'Terra', nomeEn: 'Earth', classe: 'planeta' },
  mars: { nome: 'Marte', nomeEn: 'Mars', classe: 'planeta' },
  jupiter: { nome: 'Júpiter', nomeEn: 'Jupiter', classe: 'planeta' },
  saturn: { nome: 'Saturno', nomeEn: 'Saturn', classe: 'planeta' },
  uranus: { nome: 'Urano', nomeEn: 'Uranus', classe: 'planeta' },
  neptune: { nome: 'Netuno', nomeEn: 'Neptune', classe: 'planeta' },
  pluto: { nome: 'Plutão', nomeEn: 'Pluto', classe: 'planeta anão' },
  moon: { nome: 'Lua', nomeEn: 'Moon', classe: 'lua' },
  phobos: { nome: 'Fobos', nomeEn: 'Phobos', classe: 'lua' },
  deimos: { nome: 'Deimos', nomeEn: 'Deimos', classe: 'lua' },
  io: { nome: 'Io', nomeEn: 'Io', classe: 'lua' },
  europa: { nome: 'Europa', nomeEn: 'Europa', classe: 'lua' },
  ganymede: { nome: 'Ganimedes', nomeEn: 'Ganymede', classe: 'lua' },
  callisto: { nome: 'Calisto', nomeEn: 'Callisto', classe: 'lua' },
  mimas: { nome: 'Mimas', nomeEn: 'Mimas', classe: 'lua' },
  enceladus: { nome: 'Encélado', nomeEn: 'Enceladus', classe: 'lua' },
  tethys: { nome: 'Tétis', nomeEn: 'Tethys', classe: 'lua' },
  dione: { nome: 'Dione', nomeEn: 'Dione', classe: 'lua' },
  rhea: { nome: 'Reia', nomeEn: 'Rhea', classe: 'lua' },
  titan: { nome: 'Titã', nomeEn: 'Titan', classe: 'lua' },
  iapetus: { nome: 'Jápeto', nomeEn: 'Iapetus', classe: 'lua' },
  // item 134/S3 — as nove luas esculpidas do projeto Saturn do autor.
  pan: { nome: 'Pã', nomeEn: 'Pan', classe: 'lua' },
  daphnis: { nome: 'Dafnis', nomeEn: 'Daphnis', classe: 'lua' },
  atlas: { nome: 'Atlas', nomeEn: 'Atlas', classe: 'lua' },
  prometheus: { nome: 'Prometeu', nomeEn: 'Prometheus', classe: 'lua' },
  pandora: { nome: 'Pandora', nomeEn: 'Pandora', classe: 'lua' },
  janus: { nome: 'Jano', nomeEn: 'Janus', classe: 'lua' },
  epimetheus: { nome: 'Epimeteu', nomeEn: 'Epimetheus', classe: 'lua' },
  hyperion: { nome: 'Hipérion', nomeEn: 'Hyperion', classe: 'lua' },
  phoebe: { nome: 'Febe', nomeEn: 'Phoebe', classe: 'lua' },
  miranda: { nome: 'Miranda', nomeEn: 'Miranda', classe: 'lua' },
  ariel: { nome: 'Ariel', nomeEn: 'Ariel', classe: 'lua' },
  umbriel: { nome: 'Umbriel', nomeEn: 'Umbriel', classe: 'lua' },
  titania: { nome: 'Titânia', nomeEn: 'Titania', classe: 'lua' },
  oberon: { nome: 'Oberon', nomeEn: 'Oberon', classe: 'lua' },
  triton: { nome: 'Tritão', nomeEn: 'Triton', classe: 'lua' },
  charon: { nome: 'Caronte', nomeEn: 'Charon', classe: 'lua' },
  ceres: { nome: 'Ceres', nomeEn: 'Ceres', classe: 'planeta anão' },
  haumea: { nome: 'Haumea', nomeEn: 'Haumea', classe: 'planeta anão' },
  makemake: { nome: 'Makemake', nomeEn: 'Makemake', classe: 'planeta anão' },
  eris: { nome: 'Éris', nomeEn: 'Eris', classe: 'planeta anão' },
  quaoar: { nome: 'Quaoar', nomeEn: 'Quaoar', classe: 'planeta anão' },
  vesta: { nome: 'Vesta', nomeEn: 'Vesta', classe: 'asteroide' },
  pallas: { nome: 'Palas', nomeEn: 'Pallas', classe: 'asteroide' },
  hygiea: { nome: 'Hígia', nomeEn: 'Hygiea', classe: 'asteroide' },
};

/** O prefixo que separa a chave de um corpo da de uma estrela. */
export const CHAVE_DE_CORPO = 'corpo:';

export const CORPOS_DO_SISTEMA: readonly CorpoDoSistema[] = IDS_FOTOMETRIA.map(
  (id) => ({ id, ...NOMES_DOS_CORPOS[id], chave: `${CHAVE_DE_CORPO}${id}` })
);

/**
 * AS LUAS DO ATLAS (F2b; +Fobos/Deimos na F3; +17 na F5) — fora de
 * `CORPOS_DO_SISTEMA` de propósito: aquela lista é a dos corpos com
 * RETRATO congelado (`IDS_FOTOMETRIA`, os dez), e é por esse índice que
 * órbitas, rótulos, escada e selo leem posição. A Lua ganhou ponto
 * fotométrico no item 108, e a decisão não muda por isso — ela não tem
 * retrato: o lugar dela vem do corpo resolvido, que é quem conhece o
 * pino do filme (`lua.ts`), e é por isso que ela vive aqui, com `pai`.
 * O `pai` é o corpo cuja efeméride
 * centra a dela — é dele que a busca mede a distância da nota ("Lua ·
 * 384 mil km"; "Titã · 1 222 mil km") e é ele que o enquadramento do
 * degrau "lua" mantém em quadro (`PARENT_FRAMING_BIAS`).
 * Vanth/Weywot ficam de fora: sem textura não há mesh, e sem BODY_AXES
 * o degrau não tem raio — o badge de validade já mora em notaDeValidade.
 */
export const LUAS_DO_SISTEMA: readonly (CorpoDoSistema & { pai: string })[] = [
  { id: 'moon', ...NOMES_DOS_CORPOS.moon, chave: `${CHAVE_DE_CORPO}moon`, pai: 'earth' },
  { id: 'phobos', ...NOMES_DOS_CORPOS.phobos, chave: `${CHAVE_DE_CORPO}phobos`, pai: 'mars' },
  { id: 'deimos', ...NOMES_DOS_CORPOS.deimos, chave: `${CHAVE_DE_CORPO}deimos`, pai: 'mars' },
  { id: 'io', ...NOMES_DOS_CORPOS.io, chave: `${CHAVE_DE_CORPO}io`, pai: 'jupiter' },
  { id: 'europa', ...NOMES_DOS_CORPOS.europa, chave: `${CHAVE_DE_CORPO}europa`, pai: 'jupiter' },
  { id: 'ganymede', ...NOMES_DOS_CORPOS.ganymede, chave: `${CHAVE_DE_CORPO}ganymede`, pai: 'jupiter' },
  { id: 'callisto', ...NOMES_DOS_CORPOS.callisto, chave: `${CHAVE_DE_CORPO}callisto`, pai: 'jupiter' },
  // As sete internas do item 134/S3 vêm ANTES de Mimas porque a lista é
  // ordenada por distância ao pai, e todas orbitam dentro ou junto dos anéis
  // (Pã no vão de Encke, Dáfnis no de Keeler, os dois pastores do F).
  { id: 'pan', ...NOMES_DOS_CORPOS.pan, chave: `${CHAVE_DE_CORPO}pan`, pai: 'saturn' },
  { id: 'daphnis', ...NOMES_DOS_CORPOS.daphnis, chave: `${CHAVE_DE_CORPO}daphnis`, pai: 'saturn' },
  { id: 'atlas', ...NOMES_DOS_CORPOS.atlas, chave: `${CHAVE_DE_CORPO}atlas`, pai: 'saturn' },
  { id: 'prometheus', ...NOMES_DOS_CORPOS.prometheus, chave: `${CHAVE_DE_CORPO}prometheus`, pai: 'saturn' },
  { id: 'pandora', ...NOMES_DOS_CORPOS.pandora, chave: `${CHAVE_DE_CORPO}pandora`, pai: 'saturn' },
  { id: 'janus', ...NOMES_DOS_CORPOS.janus, chave: `${CHAVE_DE_CORPO}janus`, pai: 'saturn' },
  { id: 'epimetheus', ...NOMES_DOS_CORPOS.epimetheus, chave: `${CHAVE_DE_CORPO}epimetheus`, pai: 'saturn' },
  { id: 'mimas', ...NOMES_DOS_CORPOS.mimas, chave: `${CHAVE_DE_CORPO}mimas`, pai: 'saturn' },
  { id: 'enceladus', ...NOMES_DOS_CORPOS.enceladus, chave: `${CHAVE_DE_CORPO}enceladus`, pai: 'saturn' },
  { id: 'tethys', ...NOMES_DOS_CORPOS.tethys, chave: `${CHAVE_DE_CORPO}tethys`, pai: 'saturn' },
  { id: 'dione', ...NOMES_DOS_CORPOS.dione, chave: `${CHAVE_DE_CORPO}dione`, pai: 'saturn' },
  { id: 'rhea', ...NOMES_DOS_CORPOS.rhea, chave: `${CHAVE_DE_CORPO}rhea`, pai: 'saturn' },
  { id: 'titan', ...NOMES_DOS_CORPOS.titan, chave: `${CHAVE_DE_CORPO}titan`, pai: 'saturn' },
  { id: 'hyperion', ...NOMES_DOS_CORPOS.hyperion, chave: `${CHAVE_DE_CORPO}hyperion`, pai: 'saturn' },
  { id: 'iapetus', ...NOMES_DOS_CORPOS.iapetus, chave: `${CHAVE_DE_CORPO}iapetus`, pai: 'saturn' },
  { id: 'phoebe', ...NOMES_DOS_CORPOS.phoebe, chave: `${CHAVE_DE_CORPO}phoebe`, pai: 'saturn' },
  { id: 'miranda', ...NOMES_DOS_CORPOS.miranda, chave: `${CHAVE_DE_CORPO}miranda`, pai: 'uranus' },
  { id: 'ariel', ...NOMES_DOS_CORPOS.ariel, chave: `${CHAVE_DE_CORPO}ariel`, pai: 'uranus' },
  { id: 'umbriel', ...NOMES_DOS_CORPOS.umbriel, chave: `${CHAVE_DE_CORPO}umbriel`, pai: 'uranus' },
  { id: 'titania', ...NOMES_DOS_CORPOS.titania, chave: `${CHAVE_DE_CORPO}titania`, pai: 'uranus' },
  { id: 'oberon', ...NOMES_DOS_CORPOS.oberon, chave: `${CHAVE_DE_CORPO}oberon`, pai: 'uranus' },
  { id: 'triton', ...NOMES_DOS_CORPOS.triton, chave: `${CHAVE_DE_CORPO}triton`, pai: 'neptune' },
  { id: 'charon', ...NOMES_DOS_CORPOS.charon, chave: `${CHAVE_DE_CORPO}charon`, pai: 'pluto' },
];

/**
 * O NOME NA LÍNGUA DE AGORA, de qualquer entrada que traga as duas grafias
 * (item 130/F2). Sem `nomeEn` — os corpos falsos dos testes de projeção, que
 * só declaram `chave`/`nome`/`classe` — a saída é o pt, que é o mesmo
 * comportamento de antes: o inglês que falta some, não vira buraco.
 *
 * É AQUI QUE A LÍNGUA ENTRA E EM MAIS LUGAR NENHUM. Chamada por quadro no
 * produtor de rótulos, e por isso é uma comparação e um `??`: nada de tabela
 * nova, nada de `t()` com chave montada.
 */
export const nomeNaLingua = (entrada: { nome: string; nomeEn?: string }): string =>
  idiomaAtual() === 'en' ? (entrada.nomeEn ?? entrada.nome) : entrada.nome;

/**
 * O NOME DE UM CORPO PELO `id`, NA LÍNGUA DE AGORA, ou `null` para quem não
 * é corpo desta casa — a leitura única da tabela acima.
 *
 * ELA NASCEU DO ITEM 92 (25/08): o Director resolvia nome varrendo as
 * LISTAS (`CORPOS_DO_SISTEMA` → `LUAS_DO_SISTEMA` → `HELIO_SEM_PONTO`),
 * e uma varredura por lista é uma armadilha que se arma sozinha —
 * quem escrevesse um ramo novo tinha de lembrar das três. Um esqueceu,
 * e descer ao globo de Éris publicava `null`. A tabela já é a fonte
 * única de todas as listas (cada uma se monta com `...NOMES_DOS_CORPOS[id]`),
 * então perguntar a ELA é a mesma resposta por um caminho que não
 * depende de o corpo estar na lista certa.
 */
export const nomeDoCorpo = (id: string): string | null => {
  const entrada = NOMES_DOS_CORPOS[id];
  return entrada ? nomeNaLingua(entrada) : null;
};

/**
 * ANÕES SEM PONTO FOTOMÉTRICO (F6) — fora de CORPOS_DO_SISTEMA (aquela
 * lista é o vértice da camada) e fora de LUAS (não orbitam um planeta
 * com mesh de pai). A busca os acha; o degrau é o de planeta
 * (órbita em torno do Sol → aproximar o globo).
 */
export const ANOES_DO_SISTEMA: readonly CorpoDoSistema[] = [
  { id: 'ceres', ...NOMES_DOS_CORPOS.ceres, chave: `${CHAVE_DE_CORPO}ceres` },
  { id: 'haumea', ...NOMES_DOS_CORPOS.haumea, chave: `${CHAVE_DE_CORPO}haumea` },
  { id: 'makemake', ...NOMES_DOS_CORPOS.makemake, chave: `${CHAVE_DE_CORPO}makemake` },
  { id: 'eris', ...NOMES_DOS_CORPOS.eris, chave: `${CHAVE_DE_CORPO}eris` },
  { id: 'quaoar', ...NOMES_DOS_CORPOS.quaoar, chave: `${CHAVE_DE_CORPO}quaoar` },
];

/**
 * ASTEROIDES SEM PONTO FOTOMÉTRICO (F7) — o mesmo contrato dos
 * anões: fora de CORPOS_DO_SISTEMA (vértice da camada) e fora de
 * LUAS. A busca os acha pelo nome pt-BR; o degrau é o de planeta
 * (órbita heliocêntrica → aproximar o globo).
 */
export const ASTEROIDES_DO_SISTEMA: readonly CorpoDoSistema[] = [
  { id: 'vesta', ...NOMES_DOS_CORPOS.vesta, chave: `${CHAVE_DE_CORPO}vesta` },
  { id: 'pallas', ...NOMES_DOS_CORPOS.pallas, chave: `${CHAVE_DE_CORPO}pallas` },
  { id: 'hygiea', ...NOMES_DOS_CORPOS.hygiea, chave: `${CHAVE_DE_CORPO}hygiea` },
];

/**
 * OS HELIOCÊNTRICOS SEM PONTO na camada — anões + asteroides, a união
 * que a escada e o selo percorrem. Deriva das duas listas acima (nunca
 * uma terceira lista digitada); morava solta no meio dos imports do
 * director e mudou para cá na onda da arquitetura (Parte 1, corte 9).
 */
export const HELIO_SEM_PONTO: readonly CorpoDoSistema[] = [
  ...ANOES_DO_SISTEMA,
  ...ASTEROIDES_DO_SISTEMA,
];

// ============================================================
// (A GRADAÇÃO POR CONTEXTO (F6) morava aqui — `claraoDoAtlas`, o piso
// de 0,01 e a referência de 20.000 UA — e morreu no M1
// da LEI-DA-ESTRELA. Ela era o CURATIVO do item 3: dentro do sistema o
// Atlas era uma tela branca (99% do quadro acima de meia luz a 2,2 UA,
// medido em 2026-08-12), e o Atlas apagava o clarão até 100× para dar
// para ler o céu — o item 4 das pendências, "o Atlas desenha com o
// brilho apagado 100× em relação ao filme", que o dono sentenciou:
// não pode existir diferença de desenho entre os dois modos. Com a
// repartição única o ponto do Sol cede ao corpo quando resolvido e o
// clarão deriva do fluxo — a doença saiu, o curativo saiu junto. A
// medição inteira que calibrou o curativo está no git deste bloco.
//
// OS EIXOS QUE NÃO NASCERAM, declarados para não renascerem por engano:
//  - BRILHO: contra o NORTE — mexer na exposição mentiria sobre a luz
//    de todo o resto para consertar uma fonte só.
//  - SATURAÇÃO e CONTRASTE: sem consumidor MEDIDO; num produto em que a
//    COR É O DADO, ganho de saturação seria invenção com cara de medida.
//  - GUIA: sem sujeito ainda — quando houver órbitas desenhadas, a
//    densidade delas por contexto entra aqui.
// ============================================================
