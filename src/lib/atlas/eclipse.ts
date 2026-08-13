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

// ============================================================
import { AU_KM } from './elementosOrbitais';
import { eclipticaParaEquatorial } from './frameGalactico';
import { BODY_AXES } from './iauOrientation';

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

/**
 * A EXPOSIÇÃO DO OBSERVADOR na totalidade lunar (decisão do DONO,
 * 2026-08-12, opção A): o equivalente ao fotógrafo que abre ~10 pontos
 * para fotografar a blood moon. O PISO FÍSICO é `PISO_REFRACAO_LUNAR` e
 * NÃO muda — 4e-4 atravessado pela cadeia de display da casa (knee +
 * ACES + sRGB) quantiza para ~0: a Lua eclipsada renderizava PRETA.
 * Este ganho é a exposição do observador adaptada à totalidade — NÃO é
 * um dado físico; é a escolha declarada de mostrar a totalidade como um
 * observador (ou uma foto de longa exposição) a vê.
 *
 * Aplicação MÍNIMA: multiplica SÓ o piso umbral RGB no chunk GLSL —
 * que é não-zero EXCLUSIVAMENTE com eclipsador Terra (o cobre de
 * Danjon). Todo outro caminho é intocado por construção: fora de
 * eclipse o chunk devolve vec3(1.0) antes; receptor solar tem piso
 * [0,0,0] e 0 × ganho = 0 exato (as vistas do eclipse SOLAR não movem).
 * Calibrado por captura na vista `eclipse-lunar` pinada: a Lua lê cobre
 * com o albedo visível, sem estourar.
 */
export const EV_OBSERVADOR_ECLIPSE_LUNAR = 10;

/** O ganho linear do EV acima — derivado, nunca redigitado. */
export const GANHO_OBSERVADOR_ECLIPSE_LUNAR = 2 ** EV_OBSERVADOR_ECLIPSE_LUNAR;

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
  // Fobos e Deimos na sombra de Marte (F3, data-only — a mudança
  // prometida no JSDoc acima): Fobos orbita a 1,4 raios marcianos de
  // altitude no plano equatorial, então o eclipse é frequente de
  // verdade — o caso didático irmão das uranianas.
  phobos: "mars",
  deimos: "mars",
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

// ============================================================
// F2c — O DRIVER POR QUADRO: da efeméride ao uniforme, e o trecho
// GLSL único que os shaders da Terra e da Lua importam.
// ============================================================

/**
 * Raio de catálogo do Sol, em km — o `radiusKm` do doador citado no
 * cabeçalho, exportado como FONTE ÚNICA: o driver o usa e os oráculos
 * o importam daqui em vez de redigitar.
 */
export const RAIO_SOL_KM = 696_340;

/**
 * O payload de UNIFORME do eclipse, por receptor por época — a ponte
 * entre o cone (km heliocêntricos) e o shader (frame local do receptor,
 * em raios do receptor). Os vetores saem no frame da CENA (equatorial
 * J2000): quem os leva ao frame local é o corpo, pela MESMA base que já
 * leva o `uDirSolLocal` — nenhum segundo caminho de rotação.
 */
export interface SombraNaCena {
  /**
   * false ⇒ o material recebe `uEclipseAtivo = 0` e o chunk devolve
   * vec3(1.0) EXATO: multiplicar por 1.0 é identidade bit a bit — é o
   * que mantém as vistas oficiais intactas fora de eclipse.
   */
  ativo: boolean;
  /** Eixo anti-solar da sombra (unitário), frame da cena. */
  eixoCena: [number, number, number];
  /**
   * Centro do eclipsador relativo ao receptor, frame da cena, em RAIOS
   * do receptor. Escalar pelo raio é o que permite ao shader trabalhar
   * na esfera unitária — a invariância de similaridade do cone (oráculo
   * da lib) garante que a geometria é a mesma nas duas unidades.
   */
  eclipsadorRaios: [number, number, number];
  /** Raio do eclipsador em raios do receptor. */
  raioEclipsadorRaios: number;
  /** (R_sol − R_eclipsador)/d_sol_eclipsador — a inclinação da umbra. */
  inclinacaoUmbra: number;
  /** (R_sol + R_eclipsador)/d_sol_eclipsador — a da penumbra. */
  inclinacaoPenumbra: number;
  /** O piso on-axis da lib: 0 no total; o nível ANULAR vive aqui. */
  minSombra: number;
  /** O piso umbral RGB do eclipsador — o cobre de Danjon, só da Terra. */
  pisoUmbral: readonly [number, number, number];
  // O cone no centro do receptor, espelhado para teste e para o selo
  // futuro — a leitura "há eclipse, e de que tamanho" sai DAQUI.
  umbraKm: number;
  penumbraKm: number;
  distanciaAoEixoKm: number;
}

/** Estado neutro para o contrato de out-parameter (um scratch por corpo). */
export const criaSombraNaCena = (): SombraNaCena => ({
  ativo: false,
  eixoCena: [1, 0, 0],
  eclipsadorRaios: [0, 0, 0],
  raioEclipsadorRaios: 0,
  inclinacaoUmbra: 0,
  inclinacaoPenumbra: 0,
  minSombra: 1,
  pisoUmbral: [0, 0, 0],
  umbraKm: 0,
  penumbraKm: 0,
  distanciaAoEixoKm: 0,
});

// Rascunho de módulo, reusado a cada chamada e nunca retido — o mesmo
// padrão dos `_tmpV` do rig de câmera (JS é single-threaded e o conteúdo
// é copiado para `out` antes de qualquer chamada seguinte).
const coneRascunho = criaGeometriaDoCone();

/**
 * O DRIVER (F2c/D3): resolve a sombra do par da TABELA
 * ({@link PARES_DE_ECLIPSE}) para um receptor, num instante.
 *
 * A ENTRADA É UA ECLÍPTICA J2000 DA CADEIA DA EFEMÉRIDE
 * (`posicaoHeliocentrica`), nunca coordenada de cena — o cone é
 * alimentado em km (× AU_KM), o contrato do cabeçalho deste arquivo.
 * Os raios saem de BODY_AXES (a fonte única de raio físico da casa) e o
 * Sol de {@link RAIO_SOL_KM}.
 *
 * NaN, receptor sem par na tabela ou corpo fora de BODY_AXES DESATIVAM
 * (neutro) em vez de propagar lixo para um uniform — um NaN aqui pinta
 * o corpo de preto sem erro em lugar nenhum (pauta (a) da revisão).
 * Escreve em `out` e devolve `out`; os vetores internos são cópias —
 * a referência devolvida nunca é compartilhada com o rascunho.
 */
export const resolveSombraNaCena = (
  receptorId: string,
  receptorEclipticaUA: Vetor3Km,
  eclipsadorEclipticaUA: Vetor3Km,
  out: SombraNaCena
): SombraNaCena => {
  const eclipsadorId = PARES_DE_ECLIPSE[receptorId];
  const raioReceptorKm = BODY_AXES[receptorId]?.[0] ?? Number.NaN;
  const raioEclipsadorKm = eclipsadorId
    ? (BODY_AXES[eclipsadorId]?.[0] ?? Number.NaN)
    : Number.NaN;
  const [rx, ry, rz] = receptorEclipticaUA;
  const [ex, ey, ez] = eclipsadorEclipticaUA;

  const neutro = (): SombraNaCena => {
    out.ativo = false;
    out.minSombra = 1;
    out.pisoUmbral = [0, 0, 0];
    out.umbraKm = 0;
    out.penumbraKm = 0;
    out.distanciaAoEixoKm = 0;
    return out;
  };

  if (
    !eclipsadorId ||
    ![rx, ry, rz, ex, ey, ez, raioReceptorKm, raioEclipsadorKm].every(
      Number.isFinite
    )
  ) {
    return neutro();
  }

  // km heliocêntricos — o contrato de entrada do cone (cabeçalho)
  const cone = resolveConeDeEclipse(
    [ex * AU_KM, ey * AU_KM, ez * AU_KM],
    [rx * AU_KM, ry * AU_KM, rz * AU_KM],
    { raioSolKm: RAIO_SOL_KM, raioEclipsadorKm, raioReceptorKm },
    coneRascunho
  );
  out.umbraKm = cone.umbraKm;
  out.penumbraKm = cone.penumbraKm;
  out.distanciaAoEixoKm = cone.distanciaAoEixoKm;
  out.minSombra = cone.minSombra;
  out.ativo = cone.ativo;
  if (!cone.ativo) {
    out.minSombra = 1;
    out.pisoUmbral = [0, 0, 0];
    return out;
  }

  const dSolEclipsadorUA = Math.hypot(ex, ey, ez);
  // eixo anti-solar unitário: a direção heliocêntrica do eclipsador —
  // rotação é linear, normalizar em UA ou em km dá no mesmo
  const eixo = eclipticaParaEquatorial([
    ex / dSolEclipsadorUA,
    ey / dSolEclipsadorUA,
    ez / dSolEclipsadorUA,
  ]);
  out.eixoCena[0] = eixo[0];
  out.eixoCena[1] = eixo[1];
  out.eixoCena[2] = eixo[2];

  // eclipsador relativo ao receptor, em raios do receptor, na cena:
  // (km / raio) e rotação comutam — escalar antes ou depois dá no mesmo
  const uaPorRaio = raioReceptorKm / AU_KM;
  const rel = eclipticaParaEquatorial([ex - rx, ey - ry, ez - rz]);
  out.eclipsadorRaios[0] = rel[0] / uaPorRaio;
  out.eclipsadorRaios[1] = rel[1] / uaPorRaio;
  out.eclipsadorRaios[2] = rel[2] / uaPorRaio;

  const dSolEclipsadorKm = dSolEclipsadorUA * AU_KM;
  out.raioEclipsadorRaios = raioEclipsadorKm / raioReceptorKm;
  out.inclinacaoUmbra = (RAIO_SOL_KM - raioEclipsadorKm) / dSolEclipsadorKm;
  out.inclinacaoPenumbra = (RAIO_SOL_KM + raioEclipsadorKm) / dSolEclipsadorKm;
  out.pisoUmbral = pisoUmbralDoEclipsador(eclipsadorId);
  return out;
};

/**
 * O TRECHO GLSL DO ECLIPSE — fonte única, importada pelos shaders da
 * Terra e da Lua. O needle-teste da F2c (a lição do chunk renomeado do
 * doador, D3) cobra exatamente isto: o chunk EXISTE nos dois shaders e
 * interpola ESTAS constantes, nunca literais redigitados.
 *
 * CONTRATO DO FATOR: multiplica SÓ a componente direta da luz, DEPOIS
 * do BRDF. Emissão (as luzes de cidade da Terra) fica fora; não existe
 * termo ambiente para sombrear. O neutro é vec3(1.0) EXATO — a
 * identidade bit a bit que sustenta o contrato das vistas oficiais.
 *
 * A MATEMÁTICA é a do cone deste arquivo, por fragmento e em raios do
 * receptor: `s` é a cota axial do fragmento ALÉM do eclipsador e
 * umbra/penumbra são as mesmas retas de `resolveConeDeEclipse` (a
 * invariância de similaridade é oráculo da lib). Valem as omissões
 * divulgadas no cabeçalho: penumbra linear, sem umbra oblata, sem
 * alargamento atmosférico, sem tempo-luz.
 */
export const GLSL_SOMBRA_ECLIPSE = /* glsl */ `
uniform float uEclipseAtivo;       // 0 = fora de eclipse: fator 1 exato (bit-neutro)
uniform vec3 uEclipseEixo;         // eixo anti-solar da sombra, frame local do receptor
uniform vec3 uEclipseEclipsador;   // centro do eclipsador, frame local, em raios do receptor
uniform vec3 uEclipseCone;         // (raio do eclipsador em raios, inclinação da umbra, da penumbra)
uniform vec3 uEclipsePisoCor;      // piso umbral RGB — o cobre de Danjon, só com eclipsador Terra
uniform float uEclipsePisoEscalar; // minSombra: o piso anular neutro (o clamp do raio não o toca)

vec3 fatorDeEclipse(vec3 p, vec3 n, float ndotlGeo) {
  if (uEclipseAtivo < 0.5) return vec3(1.0);
  vec3 rel = p - uEclipseEclipsador;
  float s = dot(rel, uEclipseEixo);
  if (s <= 0.0) return vec3(1.0); // fragmento a montante do eclipsador
  vec3 paraEcl = -rel / max(length(rel), 1.0e-6);
  if (dot(n, paraEcl) <= ${GATE_LADO_PROXIMO}) return vec3(1.0); // lado oposto: o noturno
  float perp = length(s * uEclipseEixo - rel);
  float umbra = max(uEclipseCone.x - s * uEclipseCone.y, 0.0); // assinada → o clamp do consumidor
  float penumbra = uEclipseCone.x + s * uEclipseCone.z;
  float t = clamp((perp - umbra) / max(penumbra - umbra, 1.0e-6), 0.0, 1.0);
  // o piso RGB (o cobre de Danjon) leva a EXPOSIÇÃO DO OBSERVADOR da lib
  // (EV_OBSERVADOR_ECLIPSE_LUNAR — não é dado físico, ver o doc da
  // constante); só o eclipsador Terra tem piso não-zero, então o ganho
  // existe só no ramo do eclipse lunar. O piso ANULAR escalar fica fora.
  vec3 piso = uEclipsePisoCor * ${GANHO_OBSERVADOR_ECLIPSE_LUNAR.toFixed(1)}
    + vec3(uEclipsePisoEscalar);
  vec3 sombra = mix(piso, vec3(1.0), t);
  // a sombra esvai através do terminador do receptor — a borda nunca
  // corta uma linha dura no lado noturno
  float fade = smoothstep(${FADE_TERMINADOR_INICIO}, ${FADE_TERMINADOR_FIM}, ndotlGeo);
  return mix(vec3(1.0), sombra, fade);
}
`;
