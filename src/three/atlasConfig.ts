// ============================================================
// O CONFIG ÚNICO DO ATLAS (Onda 5, decisão D6) — um arquivo, uma fonte
// de verdade, dois consumidores.
//
// O que mora aqui:
//  1. A TABELA DE CAMADAS da casa. Ela vivia dentro do `Ajustes.tsx`
//     enquanto o painel do filme era o único a lê-la; com a gaveta do
//     Atlas ela passou a ter DOIS leitores, e tabela com dois leitores
//     dentro de um deles é a segunda fonte de verdade nascendo (AGENTS 4).
//     A seleção do Atlas é um CAMPO da mesma tabela, não uma segunda
//     lista: assim é impossível a gaveta oferecer uma camada que o
//     Director não conhece.
//  2. O nome do enquadramento de abertura — o que a ContextLine lê
//     quando o foco não tem nome (ela NUNCA chuta).
//  3. O lugar declarado da GRADAÇÃO POR CONTEXTO da F6: os eixos e
//     limiares dela entram AQUI (D6), e o registro do selo
//     (`selo.ts`) cobra a declaração pela varredura de completude —
//     porta nova neste arquivo sem entrada no registro quebra o teste.
//
// Este arquivo não toca `window`, não importa three e não importa React:
// é lido pelo HUD e pelo Director, e é isso que o mantém testável.
// ============================================================
import { AU_PARA_PC } from '../lib/atlas/frameGalactico';
import { IDS_FOTOMETRIA } from './world/planetas/fotometria';

/** Uma família de coisas na cena que pode ser desligada. */
export interface Camada {
  /** a flag que o Director já lê (`?nogal=1`, `hide.has('nogal')`) */
  flag: string;
  /** rótulo em pt-BR, o mesmo nos dois hospedeiros */
  nome: string;
  /**
   * A flag é lida POR QUADRO (troca ao vivo); `false` exigiria recarga.
   * Desde 2026-08-12 **todas** são vivas — as três últimas a recarregar
   * (nodisc/nogdust/noglow) nunca foram lidas no bake, e o campo fica
   * como contrato: quem escrever `viva: false` liga de volta o ↻ do
   * painel e o ramo de recarga do App, os dois derivados desta linha.
   */
  viva: boolean;
  /**
   * Presente ⇒ a camada aparece na GAVETA do Atlas, com este ícone.
   * As galácticas (nogal/nodisc/nogdust/noglow/nowrap/nocart) ficam de
   * fora de propósito (D6): dentro do Atlas elas não são o assunto, e a
   * gaveta é para o que está no quadro de um enquadramento privilegiado.
   */
  icone?: string;
}

/**
 * As camadas da casa, na ordem em que o painel do filme sempre as
 * mostrou. TODAS TROCAM AO VIVO desde 2026-08-12: as três da galáxia
 * (lâminas, extinção por partícula, bojo) eram `viva: false` por um
 * comentário podre — `bakeDiscLayers` roda inteiro de qualquer jeito, o
 * τRT inclusive, e elas só governam `mesh.visible` e o bind de
 * `uTauMap`, que a `Galaxy` reescreve por quadro. Nenhuma opção do
 * painel recarrega a página. A 13ª (`nocorpos`) é da Onda 6.
 */
export const CAMADAS: readonly Camada[] = [
  { flag: 'nogal', nome: 'Galáxia (tudo)', viva: true },
  { flag: 'nodisc', nome: 'Lâminas do disco', viva: true },
  { flag: 'nogdust', nome: 'Extinção por partícula', viva: true },
  { flag: 'noglow', nome: 'Brilho do bojo', viva: true },
  { flag: 'nocart', nome: 'Cartografia observada', viva: true },
  { flag: 'nonebula', nome: 'Nebulosa volumétrica', viva: true },
  { flag: 'nowrap', nome: 'Campo envolvente', viva: true },
  { flag: 'nocat', nome: 'Catálogo HYG', viva: true, icone: '⁂' },
  { flag: 'nohero', nome: 'Estrelas nomeadas', viva: true, icone: '✦' },
  { flag: 'nomarker', nome: 'Marcador do Sol', viva: true, icone: '⌖' },
  { flag: 'noplan', nome: 'Planetas', viva: true, icone: '◉' },
  // O PALCO LOCAL da Onda 6 (F0): os corpos resolvidos — os globos de
  // perto, distintos dos PONTOS fotométricos de `noplan`. Entra vazio
  // nesta fase (nenhum mesh ainda; o toggle não muda pixel até F2),
  // mas nasce DECLARADO aqui e no selo, como a lei das portas manda.
  { flag: 'nocorpos', nome: 'Corpos de perto', viva: true, icone: '◐' },
  { flag: 'nobh', nome: 'Buraco negro (Sgr A✱)', viva: true, icone: '✱' },
];

/**
 * O que a gaveta do Atlas oferece: as cinco de D6 (Onda 5) mais a do
 * palco local (Onda 6), derivadas da tabela acima — nunca redigitadas.
 * Todas são `viva: true` por construção (uma gaveta que recarrega a
 * página tiraria o visitante do modo), e o teste cobra isso.
 */
export const CAMADAS_DO_ATLAS = CAMADAS.filter((c) => c.icone !== undefined);

/**
 * O nome do que o Atlas enquadra quando abre — e o que a ContextLine lê
 * quando o foco não tem nome próprio. "Sistema solar" e não "Sol": o
 * enquadramento de abertura é a órbita mais externa do retrato, ou seja,
 * o sistema inteiro visto de fora (ver `AtlasRig.focarNoSistema`).
 */
export const NOME_DO_SISTEMA = 'Sistema solar';

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
  /** nome pt-BR: o que se digita, o que a lista mostra, o que a
   *  ContextLine anuncia */
  nome: string;
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
 * UMA FONTE DE NOME pt-BR (emenda P-E10b): esta tabela é ESPELHO
 * declarado do `i18n.pt` de `public/data/atlas/corpos.json`, com o case
 * tratado por `tituloDeCorpo` — e o teste de completude em
 * `atlasConfig.test.ts` cobra a igualdade entrada a entrada contra o
 * JSON real (uma divergência de grafia quebra o teste, não a tela).
 * Espelho e não fetch porque este módulo é síncrono e puro (é lido pelo
 * HUD e pelo Director antes de qualquer rede); a CLASSE é vocabulário
 * da legenda da casa, que o JSON não carrega.
 */
export const NOMES_DOS_CORPOS: Record<string, { nome: string; classe: string }> = {
  sun: { nome: 'Sol', classe: 'estrela' },
  mercury: { nome: 'Mercúrio', classe: 'planeta' },
  venus: { nome: 'Vênus', classe: 'planeta' },
  earth: { nome: 'Terra', classe: 'planeta' },
  mars: { nome: 'Marte', classe: 'planeta' },
  jupiter: { nome: 'Júpiter', classe: 'planeta' },
  saturn: { nome: 'Saturno', classe: 'planeta' },
  uranus: { nome: 'Urano', classe: 'planeta' },
  neptune: { nome: 'Netuno', classe: 'planeta' },
  pluto: { nome: 'Plutão', classe: 'planeta anão' },
  moon: { nome: 'Lua', classe: 'lua' },
  phobos: { nome: 'Fobos', classe: 'lua' },
  deimos: { nome: 'Deimos', classe: 'lua' },
  io: { nome: 'Io', classe: 'lua' },
  europa: { nome: 'Europa', classe: 'lua' },
  ganymede: { nome: 'Ganimedes', classe: 'lua' },
  callisto: { nome: 'Calisto', classe: 'lua' },
  mimas: { nome: 'Mimas', classe: 'lua' },
  enceladus: { nome: 'Encélado', classe: 'lua' },
  tethys: { nome: 'Tétis', classe: 'lua' },
  dione: { nome: 'Dione', classe: 'lua' },
  rhea: { nome: 'Reia', classe: 'lua' },
  titan: { nome: 'Titã', classe: 'lua' },
  iapetus: { nome: 'Jápeto', classe: 'lua' },
  miranda: { nome: 'Miranda', classe: 'lua' },
  ariel: { nome: 'Ariel', classe: 'lua' },
  umbriel: { nome: 'Umbriel', classe: 'lua' },
  titania: { nome: 'Titânia', classe: 'lua' },
  oberon: { nome: 'Oberon', classe: 'lua' },
  triton: { nome: 'Tritão', classe: 'lua' },
};

/** O prefixo que separa a chave de um corpo da de uma estrela. */
export const CHAVE_DE_CORPO = 'corpo:';

export const CORPOS_DO_SISTEMA: readonly CorpoDoSistema[] = IDS_FOTOMETRIA.map(
  (id) => ({ id, ...NOMES_DOS_CORPOS[id], chave: `${CHAVE_DE_CORPO}${id}` })
);

/**
 * AS LUAS DO ATLAS (F2b; +Fobos/Deimos na F3; +17 na F5) — fora de
 * `CORPOS_DO_SISTEMA` de propósito: aquela lista é indexada ao VÉRTICE
 * da camada de pontos (`IDS_FOTOMETRIA`), e lua não tem ponto
 * fotométrico (dito em `lua.ts`). O `pai` é o corpo cuja efeméride
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
  { id: 'mimas', ...NOMES_DOS_CORPOS.mimas, chave: `${CHAVE_DE_CORPO}mimas`, pai: 'saturn' },
  { id: 'enceladus', ...NOMES_DOS_CORPOS.enceladus, chave: `${CHAVE_DE_CORPO}enceladus`, pai: 'saturn' },
  { id: 'tethys', ...NOMES_DOS_CORPOS.tethys, chave: `${CHAVE_DE_CORPO}tethys`, pai: 'saturn' },
  { id: 'dione', ...NOMES_DOS_CORPOS.dione, chave: `${CHAVE_DE_CORPO}dione`, pai: 'saturn' },
  { id: 'rhea', ...NOMES_DOS_CORPOS.rhea, chave: `${CHAVE_DE_CORPO}rhea`, pai: 'saturn' },
  { id: 'titan', ...NOMES_DOS_CORPOS.titan, chave: `${CHAVE_DE_CORPO}titan`, pai: 'saturn' },
  { id: 'iapetus', ...NOMES_DOS_CORPOS.iapetus, chave: `${CHAVE_DE_CORPO}iapetus`, pai: 'saturn' },
  { id: 'miranda', ...NOMES_DOS_CORPOS.miranda, chave: `${CHAVE_DE_CORPO}miranda`, pai: 'uranus' },
  { id: 'ariel', ...NOMES_DOS_CORPOS.ariel, chave: `${CHAVE_DE_CORPO}ariel`, pai: 'uranus' },
  { id: 'umbriel', ...NOMES_DOS_CORPOS.umbriel, chave: `${CHAVE_DE_CORPO}umbriel`, pai: 'uranus' },
  { id: 'titania', ...NOMES_DOS_CORPOS.titania, chave: `${CHAVE_DE_CORPO}titania`, pai: 'uranus' },
  { id: 'oberon', ...NOMES_DOS_CORPOS.oberon, chave: `${CHAVE_DE_CORPO}oberon`, pai: 'uranus' },
  { id: 'triton', ...NOMES_DOS_CORPOS.triton, chave: `${CHAVE_DE_CORPO}triton`, pai: 'neptune' },
];

// ============================================================
// A GRADAÇÃO POR CONTEXTO (F6) — o que o Atlas faz com o
// instrumento para que o céu de dentro do sistema possa ser lido.
//
// O QUE FOI MEDIDO, e é ele que manda (2026-08-12, nesta GPU,
// 900×900, `?q=cinema&shot=2`, com a câmera do Atlas enquadrando
// órbitas de 0,39 a 39,5 UA e além):
//
//   dist. da câmera ao Sol   fração acima de meia luz   luz média
//        2,2 UA                      99,0 %              0,927
//        5,8 UA                      98,9 %              0,924
//         30 UA                      98,6 %              0,918
//        228 UA (a faixa da           97,7 %              0,904
//                abertura — o número
//                dela mora em
//                `AtlasRig.focarNoSistema`)
//      2.018 UA                      67,4 %              0,637
//     10.034 UA                      28,2 %              0,304
//     20.183 UA                       7,0 %              0,101
//     50.168 UA                       1,1 %              0,032
//
// Em português: DENTRO DO SISTEMA O ATLAS É UMA TELA BRANCA. Não é
// exagero de medida — é o que a captura mostra a olho: nada visível,
// nem planeta nem estrela. E a causa está medida também: a MESMA
// vista com `&nobloom=1` tem luz média 0,018 e 97% do quadro escuro,
// com o Sol, os planetas e o campo no lugar. O que lava o quadro é o
// CLARÃO — o bloom de uma fonte pontual de pico 4,8e6 (Onda 4)
// espalhado por um raio de 0,58 de tela.
//
// E é por isso que o eixo é o clarão e NÃO o brilho. O bloom é
// instrumento, não céu: no vocabulário do próprio selo ele é
// "artístico — o disco do Sol e o clarão". Mexer nele muda a ÓPTICA
// da câmera e deixa a fotometria inteira onde está — cada estrela e
// cada planeta com a magnitude que a lei da casa calculou. Baixar a
// exposição faria o contrário: mentiria sobre a luz de tudo para
// consertar o borrão de uma fonte só, e é exatamente o "teto de
// brilho" que a decisão de dosagem da Onda 4 proíbe ("o brilho do Sol
// NÃO se mente"). Medido: `?exp=0,12` (três pontos abaixo) ainda
// devolve luz média 0,75 — o clarão vence a exposição, porque ele
// entra ANTES dela no compósito.
//
// A LEI, e ela é uma só: o fator do clarão é `(d / d₀)²` grampeado
// num piso. É a lei do inverso do quadrado — a irradiância cresce com
// `1/d²` quando a câmera se aproxima, e o fator a devolve, de modo
// que o clarão do Sol OCUPA SEMPRE O MESMO TANTO DE QUADRO que ocupa
// na distância de referência. Dois números, os dois medidos:
//
//  - `REFERENCIA_UA = 20.000` — a distância em que o clarão do filme
//    já não lava nada (7% do quadro acima de meia luz, luz média
//    0,10). Daqui para fora o fator é 1 EXATO e o Atlas mostra o
//    mesmo que o filme mostraria.
//  - `PISO_DO_CLARAO = 0,01` — o piso, porque a lei sozinha
//    exagera: a curva de tom comprime, e em 228 UA o `1/d²` pediria
//    1,3e-4, que apaga o clarão em vez de moderá-lo. Em 0,01 o clarão
//    volta a ser clarão: a fração do quadro acima de meia luz cai de
//    97,7% para 22% nessa faixa e para 23% a 6 UA, o céu volta a ser
//    preto, as estrelas aparecem e os planetas viram pontos
//    reconhecíveis ao lado do Sol.
//
// O piso e a lei se encontram em 2.000 UA — e esse é o outro limiar,
// DERIVADO e não escolhido: `(2.000/20.000)² = 0,01`.
//
// OS LIMIARES HERDADOS, e por que não sobrevivem (PLANO-ATLAS §2.3,
// linha `visualPresets.ts`). O doador separava contexto em 3,5 e 50
// UA, e os de câmera em 200/2.000 da escala dele. Aqui a medição
// desmente a primeira divisão: de 2,2 a 228 UA o quadro está
// IGUALMENTE lavado (97–99% acima de meia luz), porque em toda essa
// faixa o Sol é o mesmo ponto fotométrico e o clarão dele é o mesmo
// borrão de tela cheia — 3,5 e 50 UA separariam dois regimes que
// nesta casa são um só. O que atravessa dos 200/2.000 é a FORMA (uma
// distância onde a correção satura e outra onde ela acaba); os
// números são re-derivados na escala da Viagem e são 2.000 e 20.000
// UA, medidos acima.
//
// OS EIXOS QUE NÃO NASCERAM, declarados aqui para não renascerem por
// engano (a lição dos 7 campos mortos do doador vale mais que a lista
// de 5 eixos):
//  - BRILHO: sem consumidor e contra o NORTE, pelo que está escrito
//    acima — com o clarão moderado a fotometria já lê bem, e mexer na
//    exposição seria mentir sobre a luz de todo o resto.
//  - SATURAÇÃO e CONTRASTE: sem consumidor MEDIDO. Com o clarão
//    moderado o quadro tem céu preto, estrelas e planetas; não há
//    defeito de croma nem de faixa dinâmica para corrigir, e num
//    produto em que a COR É O DADO um ganho de saturação seria
//    invenção com cara de medida. Nasceriam como passe próprio
//    (`enabled = false` fora do Atlas, precedente do knee) no dia em
//    que houver o que consertar.
//  - GUIA: sem sujeito. Não há órbita desenhada, grade nem retícula
//    na Viagem — o eixo governaria o nada. Quando a Onda 6 desenhar
//    órbitas, é aqui que a densidade delas por contexto entra.
// ============================================================

export const PISO_DO_CLARAO = 0.01;
export const REFERENCIA_UA = 20000;

/**
 * O fator MULTIPLICATIVO do clarão para uma câmera a `distanciaPc` do
 * Sol. Fora do Atlas ninguém chama isto: quem chama é o tick, e só na
 * fase 'atlas'.
 *
 * Devolve 1 EXATO da referência para fora (e para distância envenenada):
 * é o que faz o termo ser neutro em IEEE754 quando não há gradação —
 * `x * 1 === x` — e o que mantém as 18 vistas oficiais bit a bit.
 */
export function claraoDoAtlas(distanciaPc: number): number {
  if (!Number.isFinite(distanciaPc)) return 1;
  // a conversão sai da MESMA constante que a cena usa para pôr planeta
  // no lugar (`AU_PARA_PC`), pelo avesso — redigitar 206.264 aqui seria
  // a segunda fonte de verdade de sempre
  const k = distanciaPc / AU_PARA_PC / REFERENCIA_UA;
  const fator = k * k;
  if (!(fator < 1)) return 1;
  return fator > PISO_DO_CLARAO ? fator : PISO_DO_CLARAO;
}
