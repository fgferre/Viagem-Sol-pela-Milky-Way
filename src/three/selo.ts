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
import { LIMIAR_SISTEMA_SOLAR_PC, acusacaoDaEscala } from './escala';
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

// (A copy e o rótulo vivo da pupila morreram no M2 com a pupila inteira
// — `core/pupila.ts` era lápide com data de enterro (LEI §7.3) e foi
// enterrada. A compressão fixa não tem linha própria: ela é a lei, e as
// portas de bancada dela — `?bemis=` — continuam declaradas abaixo.)

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
  // (stopsDaPupila morreu no M2 com a pupila: não há mais adaptação por
  // quadro a declarar — a compressão fixa é a lei, igual em todo quadro.)
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
  // corte 6 da onda da arquitetura: o boot e o espelho da URL saíram do
  // App para hooks próprios — as portas foram JUNTO, e a varredura segue
  'hooks/useDirector.ts',
  'hooks/useEspelhoDaUrl.ts',
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
  // (A GRADAÇÃO POR CONTEXTO (F6) morava aqui e morreu no M1 da Lei da
  // Estrela: o clarão do Sol passou a sair da repartição única e o
  // curativo de moderá-lo no Atlas ficou sem doença — item 4 das
  // pendências. A linha, a porta `?grad=` e o campo `gradacao` do
  // estado saíram juntos.)
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
  // (A linha da pupila morreu no M2 com a pupila inteira — não há mais
  // adaptação por quadro para o selo declarar. O caminho dela no
  // registro se acha por `git log -S rotuloDaPupila`.)
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
  // AS PORTAS DA ONDA DA LUZ. O pacote virou PADRÃO em 15/08 — a
  // compressão na emissão, o ombro dentro do bloom e a fotosfera na
  // unidade da casa são o que o visitante vê sem digitar nada. As portas
  // que restam são CAMINHO DE VOLTA e bancada, no idioma de
  // ?plan/?noplan: o mesmo binário dos dois lados. (?bcede e ?bfoto
  // morreram no M1 da Lei da Estrela — regra iv do §4: a cessão do
  // Sol-ponto e o filtro solar saem da repartição única, e o lado A
  // vive nas capturas versionadas, nunca num ramo de runtime.)
  //
  // E ELAS CONTINUAM SENDO DESVIO QUANDO PRESENTES, que é o ponto: quem
  // tem uma delas na URL não está vendo o padrão da casa — esteja ele
  // pedindo o lado A ou um valor de bancada —, e o selo declara isso sem
  // precisar saber qual dos dois.
  porta('bemis', 'compressão na emissão do ponto alterada por URL'),
  // (?bbloom e ?bombro morreram no M2 — regra iv do §4: o bloom passou a
  // ser governado pela lei (ombro fixo + pirâmide derivada da asa), e o
  // lado A vive nas capturas versionadas. ?dom/?nodom morreram com a
  // política de dominância — não há mais cessão para forçar.)
  porta('forgetau', 'extinção por coluna das forjas ligada'),
  porta('cart', 'modo de cartografia trocado'),
  porta('discoff', 'cartografia do disco desligada'),
  porta('plan', 'camada de planetas forçada'),
  // ?corpos força o palco dos corpos resolvidos (Onda 6, F0) — par de
  // ?nocorpos, no precedente exato de ?plan/?noplan
  porta('corpos', 'camada de corpos forçada'),
  // --- camadas: TODAS derivadas da tabela única ---------------------
  // Redigitá-las aqui foi o buraco do item 33: quatro flags só-URL
  // (nosun/nodust/noco/noforge) viviam no registro sem linha em
  // `CAMADAS` — o selo escrevia a flag crua no rótulo e quem chegava
  // com `?nosun=1` não tinha caixa em painel nenhum para religar.
  // Derivando, camada nova nasce nos três hospedeiros (painel, espelho
  // da URL e selo) com uma linha só — e a `volta` acompanha o contrato
  // `viva` da própria tabela.
  ...CAMADAS.map((c) => camada(c.flag, c.viva ? 'vivo' : 'recarregar')),
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
 * quadro. "Real" é o domínio do sistema solar (`LIMIAR_SISTEMA_SOLAR_PC`,
 * a constante CONGELADA de `escala.ts`): ali tudo que se desenha é 1:1 —
 * corpos com raio físico e pontos fotométricos. Além dele o selo declara
 * desvio porque NÃO SABE GARANTIR 1:1: Sagittarius A✱ segue 125.884×
 * inflado (item 13) e pode entrar em qualquer enquadramento fundo. É
 * conservadorismo declarado — o selo, na dúvida, declara o desvio em vez
 * de prometer o que não sabe — e `VereditoDoSelo.culpados` diz QUEM está
 * inflado e QUANTO, lendo o cadastro.
 *
 * ATÉ O M1 a régua era o par `deepPointGain`/`sunStarGain` da entrega
 * ponto→clarão (fronteira em 0,035 pc, o MEIO da janela morta). A
 * entrega morreu com o `SunStar`; a fronteira passou a ser a constante
 * de escala com âncora escrita (0,05 pc), que é o que ela sempre quis
 * dizer. Quando o item 13 pagar a dívida do Sgr A✱, a acusação nasce
 * vazia e este eixo poderá deixar de ser conservador.
 *
 * Distância envenenada (NaN) devolve 'fora', pelo mesmo motivo
 * (NaN < limiar é falso por construção).
 */
export function escalaDaVista(distanciaPc: number): 'real' | 'fora' {
  return distanciaPc < LIMIAR_SISTEMA_SOLAR_PC ? 'real' : 'fora';
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
