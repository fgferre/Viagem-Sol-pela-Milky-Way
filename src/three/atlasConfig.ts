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
//  2. A TABELA DOS QUATRO ESTADOS do seletor de qualidade (Ajustes D),
//     pela MESMA razão e com a mesma história: dois leitores (o painel
//     e o `<select>` da barra) e a lista digitada duas vezes.
//  3. O nome do enquadramento de abertura — o que a ContextLine lê
//     quando o foco não tem nome (ela NUNCA chuta).
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
// só o TIPO: a união dos quatro estados do seletor mora no engine (é
// ele quem lê a porta `?q=`), e o `import type` é apagado na compilação
// — este arquivo continua sem importar three nem React.
import type { EscolhaDeQualidade, EstadoDaQualidade } from './core/engine';

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
 * painel recarrega a página.
 *
 * Esta tabela é a ÚNICA lista de camadas (item 33): o registro do selo
 * e o laço de flags do Director DERIVAM dela. Quatro delas nasceram
 * só-URL dentro do director (nosun/nodust/noco/noforge) e viveram sem
 * nome pt-BR nem caixa — o selo escrevia a flag crua e quem chegava
 * com `?nosun=1` não tinha onde religar.
 */
export const CAMADAS: readonly Camada[] = [
  { flag: 'nogal', nome: 'Galáxia (tudo)', viva: true },
  { flag: 'nodisc', nome: 'Lâminas do disco', viva: true },
  { flag: 'nogdust', nome: 'Extinção por partícula', viva: true },
  { flag: 'noglow', nome: 'Brilho do bojo', viva: true },
  { flag: 'nocart', nome: 'Cartografia observada', viva: true },
  // a bissecção de `nocart`: nuvens CO medidas e forjas estelares têm
  // chave própria — o tick as lê por quadro junto com a cartografia
  { flag: 'noco', nome: 'Nuvens de CO', viva: true },
  { flag: 'noforge', nome: 'Forjas estelares', viva: true },
  { flag: 'nonebula', nome: 'Nebulosa volumétrica', viva: true },
  { flag: 'nowrap', nome: 'Campo envolvente', viva: true },
  // a poeira de paralaxe perto da câmera (`world/dust.ts`) — o tick lê
  // `hide.has('nodust')` por quadro no fade dela
  { flag: 'nodust', nome: 'Poeira próxima', viva: true },
  { flag: 'nocat', nome: 'Catálogo HYG', viva: true, icone: '⁂' },
  // M2 da Lei: `nohero` virou `noclarao` — o que a chave desliga deixou
  // de ser as 16 heroes de autor e passou a ser a camada do clarão de
  // asas (a óptica das fontes fortes, por orçamento de fluxo).
  { flag: 'noclarao', nome: 'Clarão das estrelas', viva: true, icone: '✦' },
  // o Sol inteiro em cena — o gate por quadro vive em
  // `director/solNoQuadro.ts` (`fios.escondido('nosun')`)
  { flag: 'nosun', nome: 'Sol', viva: true },
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

/** Um estado do seletor de qualidade, como o visitante o lê. */
export interface EscolhaNaUi {
  id: EscolhaDeQualidade;
  /** o nome em pt-BR, o mesmo nos dois hospedeiros */
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
  { id: 'cinema', nome: 'Cinema', simbolo: '◆' },
  { id: 'alta', nome: 'Alta', simbolo: '◇' },
  { id: 'performance', nome: 'Performance', simbolo: '◦' },
  { id: 'auto', nome: 'Auto', simbolo: '⟳' },
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
export function rotuloDaQualidade(e: EstadoDaQualidade): string {
  const aqui = nomeDaQualidade(e.tier);
  if (!e.medicao) {
    return e.escolha === 'auto'
      ? `Auto: a qualidade está em ${aqui}, medindo o quadro.`
      : `Qualidade ${aqui}, medindo o quadro.`;
  }
  const quadros = `${Math.round(e.medicao.fps)} quadros/s`;
  if (e.escolha === 'auto') {
    return `Auto: a medição pôs a qualidade em ${aqui}, a ${quadros}.`;
  }
  if (e.medicao.sugestao === e.tier) {
    return `Qualidade ${aqui}, e o quadro anda a ${quadros}.`;
  }
  return `Qualidade ${aqui}, a ${quadros}`
    + ` — ${nomeDaQualidade(e.medicao.sugestao)} deve andar melhor.`;
}

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
  charon: { nome: 'Caronte', classe: 'lua' },
  ceres: { nome: 'Ceres', classe: 'planeta anão' },
  haumea: { nome: 'Haumea', classe: 'planeta anão' },
  makemake: { nome: 'Makemake', classe: 'planeta anão' },
  eris: { nome: 'Éris', classe: 'planeta anão' },
  quaoar: { nome: 'Quaoar', classe: 'planeta anão' },
  vesta: { nome: 'Vesta', classe: 'asteroide' },
  pallas: { nome: 'Palas', classe: 'asteroide' },
  hygiea: { nome: 'Hígia', classe: 'asteroide' },
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
  { id: 'charon', ...NOMES_DOS_CORPOS.charon, chave: `${CHAVE_DE_CORPO}charon`, pai: 'pluto' },
];

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
