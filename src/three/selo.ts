// ============================================================
// O SELO DE HONESTIDADE — o REGISTRO ÚNICO dos caminhos que mexem no
// que a tela mostra, e a conta pura que decide o que o selo diz
// (Onda 5, decisão D1).
//
// POR QUE UM REGISTRO, e não uma lista dentro do componente: o defeito
// que o doador cometeu foi enumerar à mão, no componente, os casos em
// que a imagem estava alterada — a lista envelhecia calada a cada porta
// nova, e o selo passava a mentir com a melhor das intenções. Aqui a
// lista é DADO, tem teste de COMPLETUDE (`selo.test.ts`) varrendo os
// arquivos que governam a imagem, e uma porta nova nesses arquivos sem
// entrada aqui QUEBRA O TESTE. É assim que a gradação por contexto da
// F6 é obrigada a se declarar antes de nascer.
//
// E o que o registro não conhece também está coberto, do lado de fora:
// qualquer parâmetro presente na URL que não tenha entrada aqui conta
// como desvio ("não sei o que essa porta faz, então não prometo real").
// Isso alcança as varreduras de calibração espalhadas pelos shaders e
// pelo mundo (?chromsat=, ?samples=, ?warpamp=, ?corewall=…), que não
// são portas de produto e não têm por que entrar na tabela.
//
// OS DOIS EIXOS são diferentes por natureza:
//  - BRILHO deriva DESTE registro (é o que D1 pede);
//  - ESCALA deriva da GEOMETRIA, não de porta nenhuma: quem decide é o
//    mesmo par de rampas que a cena usa para trocar o disco artístico do
//    Sol pelo ponto fotométrico (`lodStellar`). Não há porta de URL que
//    altere a escala hoje, e inventar uma entrada vazia para simetria
//    seria config morta.
//
// Módulo PURO: sem window, sem three, sem React.
// ============================================================
import { deepPointGain, sunStarGain } from './world/lodStellar';
import { acusacaoDaEscala } from './escala';
import { CAMADAS } from './atlasConfig';
import type { QualityLevel, ToneMapMode } from './core/engine';
import type { PoliticaDeLuz } from '../lib/atlas/luz';

// ---- a copy herdada (D1). Três pares são verbatim do i18n do doador;
// "BRILHO ASSISTIDO" é MELHORIA declarada: o doador escreve só
// "ASSISTIDO", e a casa iguala o padrão do eixo irmão (Estado da
// Onda 5, conflito 6). ------------------------------------------------
export const ESCALA_REAL = 'ESCALA REAL';
export const FORA_DE_ESCALA = 'FORA DE ESCALA';
export const BRILHO_REAL = 'BRILHO REAL';
export const BRILHO_ASSISTIDO = 'BRILHO ASSISTIDO';

/** A tese do selo, em pt-BR — herdada do doador e traduzida. */
export const TESE_DO_SELO = 'o que nesta vista é ajustado e o que é medido';

/**
 * OS TRÊS TIERS DE RÓTULO (D1) — a procedência de cada coisa que a cena
 * desenha, no vocabulário que a legenda usa. Não é enfeite: é o
 * vocabulário que os consumidores da Onda 7 (raios, espectros, massas)
 * já vão nascer obrigados a usar, em vez de apresentar modelo como
 * medida.
 */
export type Procedencia = 'medido' | 'derivado' | 'artistico';

export const PROCEDENCIA: Record<Procedencia, { rotulo: string; oQue: string }> = {
  medido: { rotulo: 'medido', oQue: 'catálogo e efeméride' },
  derivado: { rotulo: 'derivado', oQue: 'cor e temperatura por modelo' },
  /**
   * O TERCEIRO ARTIFÍCIO, que entrou em 2026-08-13. Esta entrada
   * declarava DOIS — "o disco do Sol e o clarão" — e a cena desenhava
   * TRÊS: faltavam os spikes de difração em cruz das estrelas, vivos em
   * dois shaders independentes (`shaders/starShaders.ts`, no bloco
   * guardado por `vSat > 0.001`, e `world/heroStars.ts`, onde o `spikes`
   * entra em `col` e no alfa).
   *
   * E eles são artifício pelo critério mais duro que existe: a cruz não
   * é propriedade nenhuma da estrela. É o padrão que as HASTES do
   * espelho secundário de um telescópio imprimem na luz que passa por
   * elas — não há telescópio nesta cena, e a estrela real é um ponto. O
   * selo que enumera o que é inventado e esquece o inventado mais
   * VISÍVEL do quadro mente pela lista curta, que é exatamente o defeito
   * que o cabeçalho deste arquivo promete não repetir ("a lista
   * envelhecia calada").
   *
   * A COPY É CURTA DE PROPÓSITO, e o motivo é medido: esta linha é a
   * `.atlas-selo-legenda`, dentro da caixa `.atlas-selo` cuja altura o
   * juiz de a11y MEDE (`scripts/visual/a11y.mjs`, `medirCobertura`)
   * contra o retângulo útil do enquadramento e contra o piso doutrinário
   * de "o HUD deixa mais da metade da altura livre". Cada linha a mais
   * na legenda cresce a caixa e come quadro. "cruz de luz" e não
   * "spikes de difração" pela mesma razão de todo o resto do selo: quem
   * lê isto na tela é o visitante, não o shader.
   */
  artistico: {
    rotulo: 'artístico',
    oQue: 'o disco do Sol, o clarão e a cruz de luz das estrelas',
  },
};

/**
 * A COPY da política de luz `assistida` — herdada do fidelityBadge
 * pt-BR do doador, verbatim (D2 da Onda 6): a explicação leiga primeiro,
 * o número como complemento.
 */
export const COPY_LUZ_ASSISTIDA =
  'faixa comprimida para mundos distantes continuarem visíveis. ' +
  'A ordem de brilho é preservada.';

/**
 * O rótulo VIVO da linha `?luz=`: a copy herdada + o deslocamento do
 * corpo EM FOCO em "passos de luz" (não "stops" cru — copy leiga),
 * rotulado "por corpo" porque o ganho é POR CORPO — a divergência
 * declarada do §7.4 (a exposição de CENA é da Onda 8). Sem corpo em
 * foco (ou número envenenado) o rótulo fica só com a copy: o selo
 * nunca inventa um número que não mediu.
 */
export function rotuloDaLuzAssistida(ev: number | null): string {
  if (ev === null || !Number.isFinite(ev)) return COPY_LUZ_ASSISTIDA;
  const passos = `${ev >= 0 ? '+' : ''}${ev.toFixed(1).replace('.', ',')}`;
  return `${COPY_LUZ_ASSISTIDA} ${passos} passos de luz (por corpo)`;
}

/**
 * A LEI da porta `?luz=` (D8), no contrato de `lerPortaTom`/`lerPortaJd`:
 * devolve a política pedida ou `null` para "nada de válido" — quem chama
 * conhece o padrão (o Director cai em `assistida`, o default do Atlas).
 * Comparação por literal, nunca `in`: a lição do `?tone=constructor`.
 */
export function lerPortaLuz(bruto: string | null | undefined): PoliticaDeLuz | null {
  return bruto === 'real' || bruto === 'assistida' ? bruto : null;
}

/** A copy leiga da pupila — o que o visitante lê quando ela está fechando. */
export const COPY_PUPILA = 'a câmera fechou o diafragma para o Sol caber na tela';

/**
 * O rótulo VIVO da pupila: a copy mais os stops APLICADOS neste quadro.
 * Número envenenado deixa o rótulo sem número — o selo nunca inventa uma
 * medição que não fez (a mesma regra de `rotuloDaLuzAssistida`).
 */
export function rotuloDaPupila(stops: number): string {
  if (!Number.isFinite(stops) || stops === 0) return COPY_PUPILA;
  const passos = `${stops >= 0 ? '+' : '−'}${Math.abs(stops).toFixed(1).replace('.', ',')}`;
  return `${COPY_PUPILA} — ${passos} passos de luz (a cena inteira)`;
}

/**
 * O DEGRAU DE ENQUADRAMENTO da escada (Onda 6 F2b, D7). `orbita` é o
 * default e a semântica ATUAL de `?foco=` (as baselines não mudam de
 * significado — emenda P-E2); `corpo` desce ao corpo com raio físico.
 */
export type VerDaEscada = 'orbita' | 'corpo';

/**
 * A LEI da porta `?ver=` (D7/D8), no mesmo contrato de `lerPortaLuz`:
 * devolve o degrau pedido ou `null` para "nada de válido" — quem chama
 * conhece o padrão (`orbita`). Comparação por literal, nunca `in`
 * (a lição do `?tone=constructor`).
 */
export function lerPortaVer(bruto: string | null | undefined): VerDaEscada | null {
  return bruto === 'corpo' || bruto === 'orbita' ? bruto : null;
}

/** O que o selo precisa saber da vista para se decidir. */
export interface EstadoDaVista {
  /** distância da câmera a casa, em pc — o eixo ESCALA sai daqui */
  distanciaPc: number;
  /** as chaves presentes na URL AGORA (a URL é a fonte de verdade) */
  portas: readonly string[];
  /** exposição escolhida à mão (painel, ?exp= ou link) */
  exposicaoManual: boolean;
  /** curva de tom viva */
  tom: ToneMapMode;
  /** flags das camadas escondidas agora */
  camadasEscondidas: readonly string[];
  /** tier vivo — o autoQuality rebaixa sozinho, e isso conta (D1) */
  tier: QualityLevel;
  /**
   * O FATOR DE CLARÃO que o último quadro usou (F6). 1 é o clarão do
   * filme — nenhuma gradação; abaixo de 1, o Atlas moderou o
   * instrumento e o selo tem de dizer. Número e não booleano porque é
   * o valor VIVO do quadro, e o selo declara o que a tela mostrou.
   */
  gradacao: number;
  /**
   * A POLÍTICA DE LUZ dos corpos resolvidos (Onda 6, D2/D8) — o estado
   * VIVO do Director, não a porta: `?luz=` só o semeia no boot, e o
   * clique na linha BRILHO o troca ao vivo.
   */
  luz: PoliticaDeLuz;
  /**
   * O ΔEV da assistência sobre o corpo EM FOCO, em passos de luz
   * (`deslocamentoEVAssistida` do dUA vivo dele) — `null` quando nenhum
   * corpo está em foco, e aí o rótulo fica sem número.
   */
  evLuzDoFoco: number | null;
  /**
   * OS STOPS QUE A PUPILA APLICOU no último quadro (Onda 8) — `log2` do ganho,
   * negativo quando ela fecha, 0 EXATO quando está aberta.
   *
   * É VALOR VIVO e não a porta, pelo mesmo motivo de `gradacao`: o selo declara
   * o que a tela mostrou, e a pupila fecha por conta própria conforme a fonte
   * em quadro — a URL não sabe disso. E é NÚMERO e não booleano porque o §7.4
   * do plano pede exatamente isto: "o selo passa a reportar o EV APLICADO, não
   * uma etiqueta de política".
   */
  stopsDaPupila: number;
}

/** Dá para desfazer com um clique? */
export type Volta =
  /** o tick lê a cada quadro: desfazer é imediato */
  | 'vivo'
  /** lida no boot (construtor/init): desfazer exige recarregar */
  | 'recarregar'
  /** não é gesto do visitante: clique nenhum desfaz */
  | 'nenhuma';

export interface CaminhoDoSelo {
  /** a chave da porta de URL, ou a flag da camada */
  chave: string;
  eixo: 'brilho' | 'nenhum';
  /** o que o selo mostra quando este caminho está ativo */
  rotulo: string;
  volta: Volta;
  desvia: (e: EstadoDaVista) => boolean;
  /**
   * Rótulo que depende do ESTADO da vista (o "+N passos de luz" da
   * linha `?luz=`). `estadoDoSelo` o resolve na saída — o HUD continua
   * lendo `rotulo` e não sabe que ele é vivo.
   */
  rotuloVivo?: (e: EstadoDaVista) => string;
}

/**
 * OS ARQUIVOS QUE GOVERNAM A IMAGEM — o alcance da varredura de
 * completude. Porta de URL nova em qualquer um deles sem entrada no
 * registro quebra `selo.test.ts`. A F6 entra por `atlasConfig.ts` (a
 * gradação por contexto mora no config único — D6) e por `core/post.ts`
 * (o bloom como estado), que já estão aqui: ela não tem por onde nascer
 * calada.
 */
export const ARQUIVOS_GOVERNADOS = [
  'App.tsx',
  'three/director.ts',
  'three/core/engine.ts',
  'three/core/post.ts',
  'three/atlasConfig.ts',
  'three/selo.ts',
  // a máquina do tempo governa a imagem (ela move os dez corpos e
  // reescreve a magnitude deles): porta nova ali tem de se declarar
  'three/tempoDoAtlas.ts',
  'components/Ajustes.tsx',
  'components/HudDoAtlas.tsx',
] as const;

const nomeDaCamada = (flag: string) =>
  CAMADAS.find((c) => c.flag === flag)?.nome ?? flag;

/** porta de URL que altera a imagem: presente ⇒ desvio */
const porta = (
  chave: string,
  rotulo: string,
  volta: Volta = 'recarregar'
): CaminhoDoSelo => ({
  chave,
  eixo: 'brilho',
  rotulo,
  volta,
  desvia: (e) => e.portas.includes(chave),
});

/** porta que NÃO altera a imagem — declarada como tal, não esquecida */
const neutra = (chave: string, rotulo: string): CaminhoDoSelo => ({
  chave,
  eixo: 'nenhum',
  rotulo,
  volta: 'nenhuma',
  desvia: () => false,
});

/*
 * LÁPIDE DA PORTA DE ESCALA. `PORTA_SOL_REAL` (`?solreal=1`) viveu aqui
 * da F1 à F3 da onda do Sol real, e era o primeiro caminho da casa que
 * MUDAVA A IMAGEM sem ser desvio de brilho: ela construía o Sol com o
 * raio FÍSICO em vez do artístico, sem tocar uma linha de fotometria
 * (`eixo: 'nenhum'`, `desvia: () => false`). O que ela realmente movia
 * era o eixo ESCALA — com a porta ligada, o Sol saía da lista de
 * culpados do cadastro, porque naquela vista ele não devia nada.
 * A F3 tornou o raio físico o PADRÃO. O Sol saiu da lista de culpados de
 * vez, e uma porta que só pode estar ligada não é porta: morreu com o
 * caminho que ela abria. O que ela ensinou fica no cadastro
 * (`escala.ts`, `culpadosDaEscala` continua recebendo o raio da cena
 * como parâmetro em vez de um `1` digitado).
 */

/** camada desligada: o que ela emitia deixou de entrar na conta da luz */
const camada = (flag: string, volta: Volta = 'vivo'): CaminhoDoSelo => ({
  chave: flag,
  eixo: 'brilho',
  rotulo: `camada desligada: ${nomeDaCamada(flag)}`,
  volta,
  desvia: (e) => e.camadasEscondidas.includes(flag),
});

/**
 * O REGISTRO. Cada linha é um caminho pelo qual a imagem pode deixar de
 * ser o que a fotometria da casa produz sozinha.
 *
 * PARA A F6, DECLARADO AQUI PARA NÃO SE PERDER (D1): a gradação por
 * contexto entra como MAIS UMA LINHA deste registro — com rótulo
 * próprio, para o selo poder nomeá-la, e `volta: 'vivo'`, para o clique
 * na linha BRILHO poder desligá-la. E a precedência é esta, na ordem:
 * o GESTO DO VISITANTE vence a gradação do modo. Quem mexeu na exposição
 * ou chegou com `?exp=` fica com o que pediu; a gradação só preenche
 * onde o visitante não pôs a mão — que é exatamente o que a linha `exp`
 * abaixo já modela ao olhar o latch VIVO em vez da porta.
 */
export const REGISTRO: readonly CaminhoDoSelo[] = [
  // (a linha de escala saiu na F3 junto com a porta `?solreal=1` — ver
  // a lápide acima; o eixo ESCALA continua saindo da GEOMETRIA, que é
  // de onde ele sempre deveria ter saído.)
  // --- gosto do visitante, ao vivo ---------------------------------
  /**
   * A GRADAÇÃO POR CONTEXTO (F6) — a linha que o desenho mandou existir
   * antes mesmo de a gradação existir, e aqui está ela.
   *
   * O que a gradação faz está medido e escrito em `atlasConfig.ts`:
   * dentro do sistema solar o clarão do Sol lava o quadro inteiro (97%
   * dele acima de meia luz a 228 UA) e o Atlas fica sendo uma tela
   * branca; a gradação modera o CLARÃO — o instrumento, o "artístico"
   * do próprio vocabulário deste arquivo — e não encosta na fotometria.
   *
   * Mesmo assim é DESVIO, e é o primeiro da lista: o que se vê deixou
   * de ser o que a casa produz sozinha, e quem olha tem direito de
   * saber disso e de desfazer. `volta: 'vivo'` porque o Director
   * desliga no quadro seguinte (`desligarGradacao`), e o `?grad=0`
   * carrega a decisão pela recarga.
   *
   * A PRECEDÊNCIA de D1 está aqui de graça: a gradação não toca o latch
   * da exposição nem a curva de tom, então o gesto do visitante (`?exp=`,
   * o slider, o tom) continua valendo por cima dela — ela preenche o
   * clarão, que é o único lugar onde o visitante não pôs a mão.
   */
  {
    chave: 'grad',
    eixo: 'brilho',
    rotulo: 'clarão moderado pelo enquadramento',
    volta: 'vivo',
    desvia: (e) => e.gradacao !== 1,
  },
  {
    chave: 'exp',
    eixo: 'brilho',
    rotulo: 'exposição escolhida à mão',
    volta: 'vivo',
    // o estado VIVO manda, não a porta: o latch do Director é o que a
    // auto-exposição consulta, e é ele que o selo desfaz
    desvia: (e) => e.exposicaoManual,
  },
  {
    chave: 'tone',
    eixo: 'brilho',
    rotulo: 'curva de tom trocada',
    volta: 'vivo',
    desvia: (e) => e.tom !== 'aces',
  },
  /**
   * A POLÍTICA DE LUZ dos corpos resolvidos (Onda 6, D2/D8) — a linha
   * da primeira lei de luz, no eixo BRILHO existente (registro único,
   * NUNCA eixo novo). `assistida` é o DEFAULT do Atlas: o material dos
   * corpos resolvidos multiplica E^σ em vez do E = 1/d² cru, para os
   * mundos distantes continuarem visíveis — a ORDEM de brilho é
   * preservada (x^σ é estritamente crescente), a RAZÃO é comprimida, e
   * é por isso que é DESVIO declarado e não café grátis.
   *
   * O rótulo é VIVO: a copy leiga herdada + o "+N passos de luz" do
   * corpo em foco (`deslocamentoEVAssistida`), rotulado "por corpo" —
   * a divergência declarada do §7.4 (exposição de CENA é da Onda 8).
   *
   * `volta: 'vivo'`: o clique escreve `real` no Director e o PRÓXIMO
   * estado visível já sai sem compressão — a affordance que o doador
   * não tinha. Fora do Atlas o estado é neutro POR CONSTRUÇÃO: não há
   * superfície resolvida no filme para o escalar multiplicar (as 18
   * vistas oficiais provam bit a bit).
   */
  {
    chave: 'luz',
    eixo: 'brilho',
    rotulo: COPY_LUZ_ASSISTIDA,
    volta: 'vivo',
    desvia: (e) => e.luz === 'assistida',
    rotuloVivo: (e) => rotuloDaLuzAssistida(e.evLuzDoFoco),
  },
  /**
   * A PUPILA (Onda 8) — a auto-exposição, no MESMO eixo BRILHO e no MESMO
   * molde da luz assistida: linha de registro único, rótulo VIVO, volta com um
   * clique. É o que o §7.4 do plano pede por escrito.
   *
   * DECLARA PELO VALOR APLICADO, NÃO PELA PORTA (`desvia` lê os stops, não
   * `e.portas`), e a diferença é de honestidade: a pupila fecha sozinha quando
   * uma fonte estouraria o quadro, sem ninguém pedir na URL. Declarar pela
   * porta faria o selo calar exatamente nos quadros em que ela mais age — que
   * é o defeito que o próprio registro existe para não ter.
   *
   * E POR ISSO `?pupila=0` NÃO É DESVIO: com ela desligada a imagem é a
   * fotometria crua da casa, sem assistência nenhuma. É o caminho purista, e o
   * selo não tem o que declarar — os stops são 0 e a linha não nasce. Quem
   * tinha de estar declarado é o padrão LIGADO, e está.
   *
   * `volta: 'vivo'`: o tick recalcula a pupila todo quadro, então desligá-la
   * aparece no quadro seguinte.
   */
  {
    chave: 'pupila',
    eixo: 'brilho',
    rotulo: COPY_PUPILA,
    volta: 'vivo',
    desvia: (e) => Number.isFinite(e.stopsDaPupila) && e.stopsDaPupila !== 0,
    rotuloVivo: (e) => rotuloDaPupila(e.stopsDaPupila),
  },
  {
    chave: 'q',
    eixo: 'brilho',
    rotulo: 'amostragem abaixo de cinema',
    // NÃO é gesto do visitante que se desfaz com um clique: o tier vem
    // do que o aparelho aguenta (o autoQuality rebaixa sozinho — D1),
    // e forçar cinema numa máquina que não dá conta seria trocar uma
    // honestidade por outra mentira. O selo declara e não promete.
    volta: 'nenhuma',
    desvia: (e) => e.tier !== 'cinema',
  },
  // --- portas de URL que mexem na luz ------------------------------
  porta('fov', 'lente forçada por ?fov='),
  porta('nobloom', 'bloom desligado'),
  porta('knee', 'joelho asinh forçado'),
  porta('kneemode', 'modo do joelho trocado'),
  porta('kneeamt', 'amount do joelho forçado'),
  // as cinco portas de medição da onda da luz (F2). Nascem desligadas e
  // são bancada, não produto — quando a calibração fechar e virarem
  // default, saem da URL e a linha some daqui junto.
  porta('bemis', 'compressão na emissão do ponto forçada'),
  porta('bbloom', 'compressão dentro do bloom forçada'),
  porta('bombro', 'ombro da compressão do bloom forçado'),
  porta('bcede', 'cessão do Sol-ponto pelo gate do palco forçada'),
  // ?bfoto=1 é a F2 no material da malha: a fotosfera emitindo a
  // radiância verdadeira em vez do ~1 da paleta H-alfa. INERTE sem
  // ?bemis= > 0 (sem curva, 2,7e10 satura o half-float) — e mesmo
  // inerte se declara, porque o selo não promete o que não conhece.
  porta('bfoto', 'radiância verdadeira da fotosfera forçada'),
  porta('dom', 'cessão de dominância forçada'),
  porta('nodom', 'cessão de dominância desligada'),
  porta('forgetau', 'extinção por coluna das forjas ligada'),
  porta('cart', 'modo de cartografia trocado'),
  porta('discoff', 'cartografia do disco desligada'),
  porta('plan', 'camada de planetas forçada'),
  // ?corpos força o palco dos corpos resolvidos (Onda 6, F0) — par de
  // ?nocorpos, no precedente exato de ?plan/?noplan
  porta('corpos', 'camada de corpos forçada'),
  // --- camadas (as do painel e as só-URL) ---------------------------
  camada('nogal'),
  // as três da galáxia deixaram de recarregar em 2026-08-12: o setter da
  // `Galaxy` as troca por quadro, então a linha BRILHO do selo as desfaz
  // no lugar, como qualquer outra camada
  camada('nodisc'),
  camada('nogdust'),
  camada('noglow'),
  camada('nocart'),
  camada('nonebula'),
  camada('nowrap'),
  camada('nocat'),
  camada('nohero'),
  camada('nomarker'),
  camada('noplan'),
  camada('nocorpos'),
  camada('nobh'),
  camada('nosun'),
  camada('nodust'),
  camada('noco'),
  camada('noforge'),
  // --- portas que NÃO mexem na luz, declaradas ----------------------
  /**
   * `?jd=` — O INSTANTE DO CÉU (F4/D2), e a decisão fica POR ESCRITO
   * porque ela não é óbvia: mover o tempo MUDA A IMAGEM (os planetas
   * saem do lugar e trocam de brilho) e mesmo assim NÃO é desvio de
   * BRILHO.
   *
   * O eixo BRILHO responde "o que se vê é a fotometria da casa ou uma
   * fotometria ajustada?". Um planeta em 12 de março de 2031 está no
   * lugar em que a efeméride diz que ele está, com a magnitude que a
   * mesma lei de sempre calcula para o `r` daquele dia — é DADO
   * MEDIDO, do mesmo tier do catálogo (o registro dos tiers já diz
   * "medido: catálogo e efeméride"). Chamar isso de desvio seria dizer
   * que o céu só é honesto em 1º de janeiro de 2026, o que é a
   * mentira contrária.
   *
   * Nem por isso o tempo é mudo sobre si: a máquina tem badge PRÓPRIO
   * — a janela 1950–2050 da tabela e o "sem efeméride: congelado no
   * retrato" (`tempoDoAtlas.ts`). Essa é a honestidade que o assunto
   * pede, e ela vive onde o assunto está, não pendurada num eixo que
   * fala de outra coisa.
   *
   * Na mesma família de `?t=` e `?pos=`: dizem QUANDO e DE ONDE se
   * olha, nunca com quanta luz.
   */
  neutra('jd', 'instante do céu (efeméride, não ajuste)'),
  /**
   * `?ui=` — O TAMANHO DO TEXTO DO HUD (F6), e a decisão também fica
   * por escrito porque ela também não é óbvia: mudar o `?ui=` MOVE A
   * CÂMERA dentro do Atlas (o HUD cresce, o retângulo útil encolhe e o
   * enquadramento recua para o alvo não ficar por baixo do selo) — e
   * mesmo assim NÃO é desvio de BRILHO.
   *
   * O eixo BRILHO responde "o que se vê é a fotometria da casa ou uma
   * fotometria ajustada?". Recuar a câmera não mexe em fotometria
   * nenhuma: é da mesma família de `?pos=` e `?look=`, que dizem DE
   * ONDE se olha e nunca com quanta luz. E o eixo ESCALA sai da
   * geometria (as rampas do `lodStellar`), que a distância nova
   * alimenta como alimentaria qualquer outra posição de câmera — se o
   * recuo tirar a vista do domínio profundo, o selo já diz FORA DE
   * ESCALA sozinho, sem precisar de linha aqui.
   *
   * O que ele muda é o HUD, e o HUD não é a cena.
   */
  neutra('ui', 'tamanho do texto do HUD'),
  /**
   * `?foco=` — O ALVO EM QUADRO (F3/D4), e a decisão é a mesma família
   * de `?pos=`: ela diz PARA ONDE se olha, nunca com quanta luz.
   *
   * O que a porta faz é escolher o enquadramento de abertura do Atlas —
   * a câmera vai parar noutro lugar, apontada para outra estrela. Nada
   * nesse caminho toca brilho, escala ou fotometria: o alvo é
   * enquadrado pela MESMA lei de aproximação do clique num rótulo
   * (`visitarEstrela` → `irAte`), sem tabela de raios nova e sem passar
   * perto da exposição.
   *
   * E o eixo ESCALA não precisa dela para dizer a verdade: ele sai da
   * GEOMETRIA (a distância da câmera a casa), então enquadrar uma
   * estrela longe já move o selo para FORA DE ESCALA por conta própria
   * — como move o clique num nome, que não tem porta nenhuma. Declarar
   * `?foco=` como desvio seria contar a mesma coisa duas vezes, uma
   * delas errada.
   */
  neutra('foco', 'alvo em quadro (enquadramento, não ajuste)'),
  /**
   * `?ver=` — O DEGRAU DA ESCADA (F2b/D7): `orbita` (default, a
   * semântica de sempre do `?foco=`) ou `corpo` (o alvo enquadrado com
   * o raio FÍSICO dele). Mesma família de `?foco=`/`?pos=`: diz DE ONDE
   * se olha, nunca com quanta luz — a fotometria dos dois degraus é a
   * mesma lei, e o eixo ESCALA continua saindo da geometria sozinho.
   */
  neutra('ver', 'degrau do enquadramento (corpo ou órbita)'),
  neutra('t', 'instante da viagem'),
  neutra('play', 'retomar a viagem andando'),
  neutra('freeze', 'congelar o relógio da viagem'),
  neutra('atlas', 'abrir no modo Atlas'),
  neutra('pos', 'posição da câmera'),
  neutra('look', 'mira da câmera'),
  neutra('shot', 'modo foto (congela o tempo visual, não a luz)'),
  neutra('loader', 'fixar uma etapa do carregamento'),
  neutra('ajustes', 'abrir o painel de ajustes'),
  neutra('dbgfade', 'depuração: política de dominância'),
  neutra('dbgstar', 'depuração: projeção de Betelgeuse'),
  neutra('dbgplan', 'depuração: régua dos planetas'),
  neutra('galstat', 'depuração: contagem no frustum'),
];

const PORTAS_CONHECIDAS = new Set(REGISTRO.map((c) => c.chave));

/** Porta que ninguém declarou: o selo não tem como prometer nada dela. */
function desconhecida(chave: string): CaminhoDoSelo {
  return {
    chave,
    eixo: 'brilho',
    rotulo: `porta não declarada: ?${chave}`,
    volta: 'recarregar',
    desvia: () => true,
  };
}

export interface VereditoDoSelo {
  escala: 'real' | 'fora';
  brilho: 'real' | 'assistido';
  /** os caminhos ATIVOS agora, na ordem do registro */
  desvios: CaminhoDoSelo[];
  /**
   * QUEM está inflado e QUANTO — uma frase por corpo em dívida, tirada
   * do cadastro (`escala.ts`), do pior fator para o melhor. Até aqui o
   * eixo ESCALA dizia "FORA DE ESCALA" e calava; um selo que acusa sem
   * dizer o quê não é honestidade, é aviso legal.
   *
   * VAZIO quando a escala é real: o selo não acusa quem não deve. E
   * vazio, não uma frase de consolo — quem lê o veredito decide o que
   * mostrar quando não há nada a declarar.
   */
  culpados: readonly string[];
}

/**
 * O EIXO ESCALA — e ele lê a DISTÂNCIA A CASA, não o que domina o
 * quadro. A conta é a comparação entre as duas rampas que a cena já usa
 * para trocar o disco artístico do Sol pelo ponto fotométrico
 * (`lodStellar`): "real" é o DOMÍNIO PROFUNDO, a faixa em que o ponto
 * ganha do disco; fora dela o selo declara desvio.
 *
 * A DIVERGÊNCIA COM A D1, dita como divergência. O desenho da onda
 * escreveu o critério como "FORA DE ESCALA quando o Sol-ator artístico
 * DOMINA"; o que está implementado é "fora do domínio profundo", que é
 * outra coisa. Enquadrar Sirius (2,6 pc) ou Sagittarius A✱ (8 kpc) põe o
 * selo em FORA DE ESCALA, e em nenhuma das duas vistas o Sol-ator está
 * em quadro. Acima do limiar o selo declara desvio porque NÃO SABE
 * GARANTIR 1:1 — a esfera de 2.269 UA de raio existe na cena e pode
 * entrar em qualquer enquadramento —, e não porque o disco esteja
 * visível ali. É conservadorismo declarado, e a defesa dele é a mesma do
 * NaN abaixo: o selo, na dúvida, declara o desvio em vez de prometer o
 * que não sabe.
 *
 * O QUE MUDOU (F0 da onda do Sol real): o veredito continua o mesmo, mas
 * ele parou de ser mudo. `VereditoDoSelo.culpados` diz QUEM está inflado
 * e QUANTO, lendo o cadastro (`escala.ts`) — hoje, "Sol está 487.441×
 * maior" e "Sagittarius A✱ está 125.884× maior". E a frase acima ganhou
 * data de validade: quando a F3 e a F5 pagarem essas duas dívidas, o
 * cadastro fica sem corpo em dívida, a acusação nasce VAZIA, e este eixo
 * poderá deixar de ser conservador porque não haverá mais esfera
 * inventada que possa entrar em quadro. Até lá, o conservadorismo é a
 * resposta certa — só que agora ele diz o nome do que está temendo.
 *
 * Distância envenenada (NaN) devolve 'fora', pelo mesmo motivo.
 */
export function escalaDaVista(distanciaPc: number): 'real' | 'fora' {
  return deepPointGain(distanciaPc) >= sunStarGain(distanciaPc) ? 'real' : 'fora';
}

/**
 * A PROMESSA "CLICAR VOLTA AO REAL", escrita como conta pura: o estado
 * que sobra depois de desfazer TUDO que é desfazível. É o oráculo da
 * linha BRILHO — o HUD faz os gestos (limpar o latch da exposição,
 * devolver o tom, religar as camadas, tirar as portas da URL) e este
 * teste cobra que o resultado deles seja mesmo o real.
 *
 * O que não é desfazível (`volta: 'nenhuma'`) fica: o selo continua
 * dizendo ASSISTIDO e diz por quê, em vez de fingir que o clique
 * resolveu.
 */
export function aoVoltarAoReal(e: EstadoDaVista): EstadoDaVista {
  const chaves = new Set(
    estadoDoSelo(e)
      .desvios.filter((c) => c.volta !== 'nenhuma')
      .map((c) => c.chave)
  );
  return {
    ...e,
    portas: e.portas.filter((p) => !chaves.has(p)),
    exposicaoManual: chaves.has('exp') ? false : e.exposicaoManual,
    tom: chaves.has('tone') ? 'aces' : e.tom,
    camadasEscondidas: e.camadasEscondidas.filter((f) => !chaves.has(f)),
    gradacao: chaves.has('grad') ? 1 : e.gradacao,
    luz: chaves.has('luz') ? 'real' : e.luz,
  };
}

/** O veredito completo, puro. */
export function estadoDoSelo(e: EstadoDaVista): VereditoDoSelo {
  const desvios = REGISTRO.filter((c) => c.eixo === 'brilho' && c.desvia(e)).map(
    // rótulo vivo resolvido AQUI, uma vez — o HUD lê `rotulo` e pronto
    (c) => (c.rotuloVivo ? { ...c, rotulo: c.rotuloVivo(e) } : c)
  );
  for (const chave of e.portas) {
    if (!PORTAS_CONHECIDAS.has(chave)) desvios.push(desconhecida(chave));
  }
  const escala = escalaDaVista(e.distanciaPc);
  // O RAIO DO SOL saía das PRÓPRIAS PORTAS até a F3, porque `?solreal=1`
  // podia trocá-lo por vista. Agora ele é um só e o cadastro fala
  // sozinho pelo padrão — `acusacaoDaEscala()` sem argumento. O que
  // sobra na acusação é Sagittarius A✱; o Sol pagou.
  return {
    escala,
    brilho: desvios.length === 0 ? 'real' : 'assistido',
    desvios,
    // a acusação só sai com o desvio: acusar numa vista honesta seria o
    // erro simétrico ao de calar numa vista mentirosa
    culpados: escala === 'fora' ? acusacaoDaEscala() : [],
  };
}
