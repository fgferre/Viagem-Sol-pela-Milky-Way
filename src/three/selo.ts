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
import { deepDiscFade, deepPointGain } from './world/lodStellar';
import { CAMADAS } from './atlasConfig';
import type { QualityLevel, ToneMapMode } from './core/engine';

// ---- a copy, verbatim (D1) ----------------------------------------
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
  artistico: { rotulo: 'artístico', oQue: 'o disco do Sol e o clarão' },
};

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
  // --- gosto do visitante, ao vivo ---------------------------------
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
  porta('dom', 'cessão de dominância forçada'),
  porta('nodom', 'cessão de dominância desligada'),
  porta('forgetau', 'extinção por coluna das forjas ligada'),
  porta('cart', 'modo de cartografia trocado'),
  porta('discoff', 'cartografia do disco desligada'),
  porta('plan', 'camada de planetas forçada'),
  // --- camadas (as do painel e as só-URL) ---------------------------
  camada('nogal'),
  camada('nodisc', 'recarregar'),
  camada('nogdust', 'recarregar'),
  camada('noglow', 'recarregar'),
  camada('nocart'),
  camada('nonebula'),
  camada('nowrap'),
  camada('nocat'),
  camada('nohero'),
  camada('nomarker'),
  camada('noplan'),
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
}

/**
 * O EIXO ESCALA. "Real" é o DOMÍNIO PROFUNDO (D1): a faixa em que o
 * disco artístico do Sol já cedeu lugar ao ponto fotométrico, e o que
 * domina o quadro está em 1:1. A conta não é um limiar novo — é a
 * comparação entre as DUAS rampas que a cena já usa para fazer essa
 * troca (`lodStellar`): enquanto o ponto ganha do disco, o que manda no
 * quadro é medida; quando o disco ganha, o Sol que se vê tem 2.269 UA
 * de raio e nenhuma vista pode se dizer em escala.
 *
 * Distância envenenada (NaN) devolve 'fora': o selo, na dúvida, declara
 * o desvio em vez de prometer o que não sabe.
 */
export function escalaDaVista(distanciaPc: number): 'real' | 'fora' {
  return deepPointGain(distanciaPc) >= deepDiscFade(distanciaPc) ? 'real' : 'fora';
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
  };
}

/** O veredito completo, puro. */
export function estadoDoSelo(e: EstadoDaVista): VereditoDoSelo {
  const desvios = REGISTRO.filter((c) => c.eixo === 'brilho' && c.desvia(e));
  for (const chave of e.portas) {
    if (!PORTAS_CONHECIDAS.has(chave)) desvios.push(desconhecida(chave));
  }
  return {
    escala: escalaDaVista(e.distanciaPc),
    brilho: desvios.length === 0 ? 'real' : 'assistido',
    desvios,
  };
}
