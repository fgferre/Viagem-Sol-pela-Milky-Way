// ============================================================
// A geometria de eclipse da casa — o cone analítico umbra/penumbra
// que a F2c vai ligar na Terra, na Lua e nas luas dos gigantes
// (Onda 6, D3 do desenho), mais as constantes que o shader de
// eclipse vai interpolar e a tabela de pares receptor→eclipsador.
//
// PROVENIÊNCIA: implementação NOVA da casa. O doador atlas-orbital
// entra só como ESPEC (`src/lib/eclipseGeometry.ts` para o cone,
// `src/components/canvas/shaders/eclipseMath.ts` para as constantes,
// `src/lib/astrophysics.ts` para a tabela de pares) — os seus 21
// testes-oráculo migraram traduzidos em `eclipse.test.ts` ao lado,
// com os valores numéricos copiados exatos; nenhuma linha de código
// dele atravessou (doutrina de travessia, PLANO-ATLAS §0).
//
// UMA CÓPIA SÓ DO CONE, por doutrina herdada do doador: este é o
// único predicado "há eclipse agora, e de que tamanho" da casa. O
// driver da F2c e qualquer selo/aviso futuro leem DAQUI — se o selo
// e o render discordarem sobre um eclipse estar acontecendo, esse é
// o pior resultado que um produto honesto pode produzir. Nada pode
// crescer uma segunda cópia deste cone.
//
// O CONTRATO DE ENTRADA É KM HELIOCÊNTRICO DA EFEMÉRIDE, NUNCA
// SCENE-GRAPH. As posições vêm da cadeia de efeméride da casa
// (satélite compõe com o pai até o Sol — integração é trabalho da
// F2c), em km físicos com o Sol na origem. A cena da casa mede em
// PARSEC: um chamador que amostrar posição de cena entra com
// distâncias ~13 ordens de grandeza menores e o modo de falha é
// BARULHENTO de propósito — as razões de distância do cone são
// invariantes de escala, então os raios saem "certos", mas a
// distância ao eixo colapsa para ~0 e TODO par vira eclipse
// permanente e centrado. Nunca plausível: denuncia o bug na primeira
// vista (o mesmo desenho de falha de `luz.ts`, o lado da casa). Não
// há piso de rejeição de propósito — o modo silencioso ("nunca
// eclipsa") seria pior, porque eclipse raro é indistinguível de
// eclipse nunca.
//
// OMISSÕES DIVULGADAS (herdadas do doador, magnitudes medidas):
// - Umbra oblata (~0,3%): o eclipsador é tratado como esfera do seu
//   raio de catálogo. Um eclipsador achatado (Júpiter f 0,065,
//   Saturno f 0,098) projeta sombra levemente elíptica; na distância
//   das luas o erro no raio da umbra fica abaixo de 0,3%.
// - Alargamento atmosférico (~2%): a umbra da Terra é observada ~2%
//   maior que o cone geométrico (regra de Danjon). Não modelado.
// - Perfil de penumbra linear: a rampa da penumbra é linear na
//   distância ao eixo; o perfil verdadeiro segue o escurecimento de
//   limbo do Sol. Sub-pixel em todo zoom alcançável.
// - Sem tempo-luz: os instantes de eclipse são geométricos. Em
//   Júpiter a discrepância chega a ~17 minutos ao longo da órbita da
//   Terra — foi literalmente assim que Rømer mediu a velocidade da
//   luz em 1676.
// ============================================================

/** Posição heliocêntrica em km — ver o contrato de entrada no cabeçalho. */
export type Vetor3Km = readonly [number, number, number];

/** Raios de catálogo (radiusKm) dos três corpos do cone, em km. */
export interface CorposDoCone {
  raioSolKm: number;
  /** Esfera do raio de catálogo — ver a omissão da umbra oblata. */
  raioEclipsadorKm: number;
  raioReceptorKm: number;
}

/**
 * A geometria do cone no receptor, em km. Tudo aqui é física no
 * domínio da efeméride — nenhum campo depende de mapeamento de cena.
 */
export interface GeometriaDoCone {
  /**
   * true quando o disco do receptor toca a penumbra: o eixo da sombra
   * passa a menos de `raioReceptorKm + penumbraKm` do centro do
   * receptor E a penumbra é positiva E o receptor está do lado
   * anti-solar do eclipsador. Geometria pura — a sombra da Terra na
   * Lua existe com ou sem mesh montado.
   */
  ativo: boolean;
  /**
   * Raio ASSINADO da umbra na posição axial do receptor (km).
   * > 0 = a umbra ainda alcança (total possível); < 0 = antumbra
   * (anular). O consumidor clampa em ≥ 0 para o shader; o nível de
   * luz anular NÃO se perde no clamp — ele vive em `minSombra`.
   */
  umbraKm: number;
  /** Raio da penumbra na posição axial do receptor (km). */
  penumbraKm: number;
  /** Distância perpendicular do centro do receptor ao eixo da sombra (km). */
  distanciaAoEixoKm: number;
  /**
   * Piso de luz on-axis em [0, 1]: 0 enquanto a umbra alcança o
   * receptor (total); `1 − (θ_e/θ_s)²` na antumbra — é o que faz um
   * eclipse anular renderizar anular em vez de preto. Divisores
   * guardados: entrada de lixo nunca vira NaN (pauta (a) da revisão
   * da onda; precedente c098470/9aff400).
   */
  minSombra: number;
  /** Distância centro-a-centro eclipsador→receptor (km). */
  distanciaEclipsadorKm: number;
}

/** Estado neutro para o contrato de out-parameter (zero alocação por quadro). */
export const criaGeometriaDoCone = (): GeometriaDoCone => ({
  ativo: false,
  umbraKm: 0,
  penumbraKm: 0,
  distanciaAoEixoKm: 0,
  minSombra: 0,
  distanciaEclipsadorKm: 0,
});

/**
 * O predicado único do cone de sombra. Com o Sol na origem, eclipsador
 * a `d_se` com raio `R_e`, e o centro do receptor projetado a `x`
 * atrás do eclipsador ao longo do eixo anti-solar:
 *
 *     umbra    r_u(x) = R_e − x · (R_s − R_e) / d_se   (assinada)
 *     penumbra r_p(x) = R_e + x · (R_s + R_e) / d_se
 *
 * Escreve em `out` e devolve `out` — não aloca nada (o driver da F2c
 * chama isto por receptor por tick de resolve). Entrada não-finita ou
 * corpos coincidentes desativam em vez de dividir por zero ou
 * propagar NaN — um NaN aqui vira uniform que pinta o corpo de preto
 * sem erro em lugar nenhum.
 */
export const resolveConeDeEclipse = (
  eclipsadorKm: Vetor3Km,
  receptorKm: Vetor3Km,
  corpos: CorposDoCone,
  out: GeometriaDoCone
): GeometriaDoCone => {
  const { raioSolKm, raioEclipsadorKm, raioReceptorKm } = corpos;
  const [ex, ey, ez] = eclipsadorKm;
  const [rx, ry, rz] = receptorKm;

  const dSolEclipsadorKm = Math.hypot(ex, ey, ez);
  const relX = rx - ex;
  const relY = ry - ey;
  const relZ = rz - ez;
  const dEclipsadorReceptorKm = Math.hypot(relX, relY, relZ);

  out.distanciaEclipsadorKm = Number.isFinite(dEclipsadorReceptorKm)
    ? dEclipsadorReceptorKm
    : 0;

  if (
    !Number.isFinite(dSolEclipsadorKm) ||
    dSolEclipsadorKm <= 0 ||
    !Number.isFinite(dEclipsadorReceptorKm) ||
    dEclipsadorReceptorKm <= 0
  ) {
    out.ativo = false;
    out.umbraKm = 0;
    out.penumbraKm = 0;
    out.distanciaAoEixoKm = 0;
    out.minSombra = 1;
    return out;
  }

  // Eixo anti-solar da sombra, passando pelo eclipsador.
  const eixoX = ex / dSolEclipsadorKm;
  const eixoY = ey / dSolEclipsadorKm;
  const eixoZ = ez / dSolEclipsadorKm;
  const aoLongoDoEixoKm = relX * eixoX + relY * eixoY + relZ * eixoZ;
  const perpX = aoLongoDoEixoKm * eixoX - relX;
  const perpY = aoLongoDoEixoKm * eixoY - relY;
  const perpZ = aoLongoDoEixoKm * eixoZ - relZ;
  const distanciaAoEixoKm = Math.hypot(perpX, perpY, perpZ);

  out.distanciaAoEixoKm = distanciaAoEixoKm;

  if (aoLongoDoEixoKm <= 0) {
    // Receptor do lado solar do eclipsador — nenhuma sombra o alcança.
    out.ativo = false;
    out.umbraKm = 0;
    out.penumbraKm = 0;
    out.minSombra = 1;
    return out;
  }

  out.umbraKm =
    raioEclipsadorKm -
    (aoLongoDoEixoKm * (raioSolKm - raioEclipsadorKm)) / dSolEclipsadorKm;
  out.penumbraKm =
    raioEclipsadorKm +
    (aoLongoDoEixoKm * (raioSolKm + raioEclipsadorKm)) / dSolEclipsadorKm;

  // Raios angulares vistos do centro do receptor: eclipsador × Sol. A
  // razão ao quadrado é a obscuração on-axis quando o disco do
  // eclipsador cabe dentro do do Sol (anular); o piso é o que NÃO
  // fica coberto.
  if (out.umbraKm >= 0) {
    out.minSombra = 0;
  } else {
    const dSolReceptorKm = Math.hypot(rx, ry, rz);
    const angularEclipsador = raioEclipsadorKm / dEclipsadorReceptorKm;
    const angularSol = raioSolKm / Math.max(dSolReceptorKm, 1e-9);
    const razao = angularEclipsador / Math.max(angularSol, 1e-12);
    const obscuracao = Math.min(1, razao * razao);
    out.minSombra = Math.min(1, Math.max(0, 1 - obscuracao));
  }

  out.ativo =
    distanciaAoEixoKm < raioReceptorKm + out.penumbraKm && out.penumbraKm > 0;

  return out;
};

// ============================================================
// As constantes que o shader de eclipse da F2c interpola. Ficam na
// lib pura para o registro nascer com fonte única: quando o GLSL
// existir, o needle-teste dele (gate da F2c, lição do chunk
// renomeado do doador) cobra que o shader interpola ESTES exports,
// nunca literais redigitados.
// ============================================================

/**
 * Janela do fade de terminador: `smoothstep(-0.1, 0.2, dot(N, L))`.
 * Esvai a sombra do eclipse através do terminador do próprio
 * receptor, para a borda da sombra nunca cortar uma linha dura no
 * lado noturno. Herdada do patch da era Gaia do doador; fica porque
 * é rampa anti-artefato de tela, não física do cone.
 */
export const FADE_TERMINADOR_INICIO = -0.1;

/** Borda superior da janela do fade. Ver {@link FADE_TERMINADOR_INICIO}. */
export const FADE_TERMINADOR_FIM = 0.2;

/**
 * Gate do lado próximo: fragmentos cuja normal aponta para longe do
 * eclipsador (`dot(N, paraEclipsador) <= -0.15`) pulam a sombra
 * inteira. Esses fragmentos estão no lado oposto do receptor, que
 * para qualquer geometria real de eclipse é também o lado noturno —
 * o gate poupa o trabalho de distância-de-segmento onde o resultado
 * não poderia ser visto.
 */
export const GATE_LADO_PROXIMO = -0.15;

/**
 * Cor da luz solar refratada pela atmosfera do limbo da Terra para
 * dentro da umbra — o termo que faz um eclipse lunar total ser cobre
 * em vez de preto. RGB linear, não normalizado; herda a ponta quente
 * do espectro de difração da era Gaia do doador, reaproveitada como o
 * único lugar em que um termo laranja-avermelhado tem física medida
 * por trás (o espalhamento Rayleigh remove o azul na dupla passagem
 * pelo limbo).
 *
 * O tinte que o patch antigo do doador aplicava a receptores SOLARES
 * morreu lá e não atravessa: visto do espaço, o sombreado penumbral é
 * neutro, e aquela banda laranja era herança artística sem fonte.
 * Ver {@link pisoUmbralDoEclipsador}.
 */
export const COR_REFRACAO_LUNAR: readonly [number, number, number] = [
  0.88, 0.42, 0.063,
];

/**
 * Intensidade do piso umbral relativa à luz direta, aplicada com a
 * cor acima no ramo de eclipse do shader quando o eclipsador é a
 * Terra. Uma totalidade Danjon típica L2–L3 fica perto de 10⁻³–10⁻⁴
 * do disco não eclipsado; isto embarca o meio geométrico.
 *
 * NOTA DE HONESTIDADE (a divulgação, herdada do doador): a existência
 * e a família de cor do termo refratado são física medida; o brilho
 * numa noite específica não é previsível — depende de carga de
 * aerossol vulcânico e nebulosidade de limbo (Danjon L0–L4 varre duas
 * ordens de grandeza). Check independente que não passa por esta
 * constante: a umbra da Terra na distância da Lua é ~2,6 R_lua
 * (oráculo em `eclipse.test.ts`), então sem este piso a totalidade
 * renderiza sombra 0 no disco inteiro — preto — o que contradiz todo
 * eclipse lunar total já fotografado.
 */
export const PISO_REFRACAO_LUNAR = 4e-4;

// Derivados uma vez, na carga do módulo — o oráculo pina que cada
// canal é COR × PISO exato (derivado, nunca redigitado).
const PISO_UMBRAL_TERRA: readonly [number, number, number] = [
  COR_REFRACAO_LUNAR[0] * PISO_REFRACAO_LUNAR,
  COR_REFRACAO_LUNAR[1] * PISO_REFRACAO_LUNAR,
  COR_REFRACAO_LUNAR[2] * PISO_REFRACAO_LUNAR,
];
const PISO_UMBRAL_NEUTRO: readonly [number, number, number] = [0, 0, 0];

/**
 * O piso de luz RGB que o uniform da umbra recebe por eclipsador:
 * só a Terra carrega o piso cobre de refração (eclipse lunar); todo
 * outro eclipsador sombreia neutro até o preto geométrico — Júpiter,
 * Saturno, Urano, Netuno e Plutão não têm o limbo refrator modelado,
 * e a Lua eclipsando a Terra escurece neutro visto do espaço. É a
 * tradução em dado do contrato "receptor solar neutro × variante
 * Terra" do doador; o needle-teste do GLSL real é gate da F2c.
 */
export const pisoUmbralDoEclipsador = (
  eclipsadorId: string
): readonly [number, number, number] =>
  eclipsadorId === "earth" ? PISO_UMBRAL_TERRA : PISO_UMBRAL_NEUTRO;

// ============================================================
// A tabela de pares e o contrato dos anéis.
// ============================================================

/**
 * Receptor → eclipsador: em quais corpos o driver da F2c resolve o
 * cone por quadro. A SELEÇÃO é critério de performance, não de
 * física (JSDoc herdado do doador): a sombra é o cone real, então
 * atribuir demais é seguro — uma lua cuja geometria nunca alinha
 * simplesmente nunca escurece; cada receptor custa um resolve por
 * quadro enquanto está em cena.
 *
 * Os 15 pares do doador + as 5 luas de Urano. O doador deixava as
 * uranianas de fora de propósito (Urano deitado ⇒ temporadas de
 * eclipse a cada ~42 anos — um belo fato de ensino) e documentava
 * "adicionar uma é mudança data-only"; a matriz da fusão REVERTEU a
 * exceção (espec da Onda 6: "5 luas de Urano no eclipse") e esta é
 * exatamente a mudança data-only prometida.
 *
 * Um id por receptor: Júpiter precisaria de quatro para renderizar
 * os trânsitos de sombra das luas NO planeta — segue adiado. Planeta
 * com anel NÃO entra como receptor: o ramo de eclipse substituiria
 * em silêncio o shader de sombra do anel (F4/F6) — o contrato lê
 * {@link CORPOS_COM_ANEL} e é cobrado por teste.
 */
export const PARES_DE_ECLIPSE: Readonly<Record<string, string>> = {
  // Terra ↔ Lua: os dois lados do mesmo alinhamento.
  earth: "moon",
  moon: "earth",
  // As quatro galileanas na sombra de Júpiter (o relógio de Rømer).
  io: "jupiter",
  europa: "jupiter",
  ganymede: "jupiter",
  callisto: "jupiter",
  // As sete saturnianas maiores.
  mimas: "saturn",
  enceladus: "saturn",
  tethys: "saturn",
  dione: "saturn",
  rhea: "saturn",
  titan: "saturn",
  iapetus: "saturn",
  // As cinco uranianas — a exceção do doador, revertida (data-only).
  miranda: "uranus",
  ariel: "uranus",
  umbriel: "uranus",
  titania: "uranus",
  oberon: "uranus",
  // Tritão e Caronte (os eventos mútuos Plutão–Caronte de 1985–1990
  // foram como os raios e albedos dos dois corpos foram medidos).
  triton: "neptune",
  charon: "pluto",
};

/**
 * Os corpos que ganham shader de anel — e por isso NUNCA podem entrar
 * como receptor em {@link PARES_DE_ECLIPSE} (o ramo de eclipse
 * substituiria em silêncio a sombra do anel). Hoje: Saturno (anel na
 * F4). A F6 ACRESCENTA uranus, neptune e quaoar quando os anéis deles
 * nascerem — o teste do contrato lê esta lista, então a extensão é
 * uma linha aqui e a cobrança continua sozinha.
 */
export const CORPOS_COM_ANEL: readonly string[] = ["saturn"];
