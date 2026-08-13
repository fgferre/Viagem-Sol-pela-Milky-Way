// ============================================================
// AtlasRig — o escritor de câmera da fase 'atlas'.
//
// O voo livre é pilotagem em 1ª pessoa; a viagem é roteiro. O Atlas é
// a terceira lei: ENQUADRAMENTO PRIVILEGIADO sobre um alvo — a câmera
// não é dirigida, ela é POSICIONADA, e a posição sai de uma conta
// conferível em vez de um número escolhido a olho.
//
// A matemática vem da `PrivilegedPosition` do atlas doador (406 linhas
// de classe sobre THREE, acopladas a um `ViewportRect`); o que
// atravessa é o que é conferível — `d = r/sen(θ/2)`, o
// `max(distVertical, distHorizontal)` que salva tela ultrawide, e a
// correção pelo retângulo que sobra depois do HUD. A implementação é
// FUNÇÃO PURA, e o rig é o fio que a liga à câmera (PLANO-ATLAS §2.3).
// ============================================================
import * as THREE from 'three';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { RETRATO_2026 } from '../world/planetas/retrato2026';

// ---- as quatro constantes medidas, num lugar só ------------------
// Herdadas do doador como VALORES MEDIDOS a reaproveitar, não como
// código: quem quiser mudar uma delas muda aqui, e o teste da função
// pura cobra o efeito. (PLANO-ATLAS §2.3, linha `PrivilegedPosition`.)

/**
 * Ângulo de fase da câmera medido a partir da DIREÇÃO ILUMINADA — a
 * direção alvo→Sol, que é o lado de onde se vê a face acesa —, em
 * graus. Iluminação de três quartos ("Rembrandt"): de frente para o Sol
 * o alvo lê chapado, e o relevo — quando houver relevo, na Onda 6 —
 * some junto com o terminador.
 *
 * O SINAL importa e custou caro no doador: a câmera vai para o lado do
 * Sol (`PrivilegedPosition.ts:208-212`, `cameraDir = sunToTarget.negate()`),
 * nunca para além do alvo. Com o eixo trocado, os 30° viram fase de
 * 150° — 6,7% do disco iluminado — e todo enquadramento fotografa o
 * lado escuro.
 */
export const PHASE_OFFSET_GRAUS = 30;

/**
 * Desvio MÁXIMO que a órbita do visitante pode acumular contra a
 * DIREÇÃO ILUMINADA (alvo→Sol), em graus. 70° ainda deixa mais de meio
 * disco iluminado — a fração iluminada é `(1+cos φ)/2`, e em φ = 70° ela
 * é 67% — com o terminador em quadro; passar disso é fotografar o lado
 * escuro do alvo.
 */
export const MAX_SOLAR_DEVIATION_GRAUS = 70;

/**
 * Peso da mistura "para longe do PAI" contra o enquadramento alinhado ao
 * Sol — é o que ele é no doador (`PrivilegedPosition.ts:22-23, 248-251`):
 * um peso de `lerp` entre DUAS DIREÇÕES unitárias, para que o planeta não
 * domine o quadro de uma lua.
 *
 * O CONSUMIDOR PROMETIDO CHEGOU na F2b da Onda 6: `direcaoDaLua`, o
 * degrau "lua" da escada — peso de `lerp` entre DUAS DIREÇÕES unitárias
 * (a solar privilegiada e a "para longe do pai"), renormalizado, para
 * que o planeta não domine o quadro da lua E continue nele (a câmera
 * fica do lado oposto ao pai, olhando a lua com o pai ao fundo). O que
 * ele NÃO é (e chegou a ser por engano) é fator de DISTÂNCIA:
 * multiplicar a distância de enquadramento por 0,78 come a margem de
 * 1,2 (1,2 × 0,78 = 0,936 < 1) e faz transbordar exatamente a esfera
 * que a conta promete tangenciar.
 */
export const PARENT_FRAMING_BIAS = 0.78;

/** Folga entre a esfera enquadrada e a borda do retângulo útil. */
export const MARGEM_DE_ENQUADRAMENTO = 1.2;

/**
 * A LENTE DO ATLAS, pinada. Sem este pino o θ da conta acima herdaria
 * o fov do shot em que o visitante pausou o filme (o roteiro varre de
 * 15° a 60°), e o mesmo alvo seria enquadrado a distâncias diferentes
 * conforme o momento da pausa — nenhuma vista do Atlas seria
 * reproduzível. 35° é a lente neutra de documentário: não comprime a
 * profundidade como as longas do roteiro nem distorce como as curtas.
 */
export const ATLAS_FOV_GRAUS = 35;

/**
 * As tarjas de cinema comem 6,5% da altura em CADA borda
 * (`.letterbox.on { height: 6.5vh }`, hud.css) e o Atlas as mantém —
 * é o mesmo quadro do filme. Fonte única do número para o retângulo
 * útil; se a tarja mudar no CSS, muda aqui.
 */
const LETTERBOX_FRACAO = 0.065;

/**
 * O que o HUD DO ATLAS come, além das tarjas, em fração da altura —
 * espelho dos números que o `hud.css` usa, na mesma disciplina do
 * `LETTERBOX_FRACAO`. Não são chutes de folga: o juiz de a11y mede os
 * retângulos REAIS dos dois elementos no navegador e cobra que a
 * declaração aqui os cubra (`scripts/visual/a11y.mjs`, prova "o
 * retângulo útil cobre o HUD do Atlas"). Se a CSS crescer, o gate
 * quebra antes de o alvo começar a ser enquadrado por baixo do selo.
 *
 * TOPO: `.atlas-contexto` e `.controls-bar`, ancoradas em `top: 8,5vh`
 * (a mesma linha) — medido 12,5% da altura a 1280×720, tarja incluída.
 * Desde a F3 a barra carrega o botão da busca e QUEBRA LINHA no texto
 * grande: medido 19,7% a 1200×900 com `?ui=1,4` — é ela, e não a linha
 * de contexto, quem dimensiona a fração do topo.
 * BASE: `.atlas-selo`, ancorado em `bottom: 7,4vh` — quatro blocos de
 * texto, medido 19,6% da altura com a tarja, e é a peça mais alta do
 * HUD do modo (a dica do Atlas fica em 13,4%).
 *
 * As duas frações são de tela de mesa (medidas a 1280×720 e 1200×900),
 * e valem em `ui = 1`.
 *
 * A UI SCALE DA F6 MEXE NESTES NÚMEROS, e a F6 respondeu assim: o
 * retângulo é produzido COM o fator (`retanguloUtilDoAtlas(fatorUi)`),
 * que multiplica as frações do HUD. É de propósito conservador —
 * parte do que cada fração cobre é âncora em `vh` (as peças começam em
 * `top: 8,5vh` / `bottom: 7,4vh`), que NÃO cresce com o texto, então
 * declarar tudo escalado sobra em vez de faltar. Sobrar custa um
 * recuo de câmera; faltar põe o alvo por baixo do selo. O juiz de a11y
 * mede os extremos da faixa (`escalaDaUi`) E os da LARGURA, e cobra
 * declarado ≥ medido em cada canto (ver `LARGURA_UTIL_MINIMA_PX`).
 */
/**
 * F2b: a ContextLine ganhou a linha da ESCADA (nome + botões
 * aproximar/sistema em linha) e a faixa do topo cresceu a altura de um
 * `.hud-btn.small` sobre a do nome — medido pelo juiz de a11y (que
 * cobra declarado ≥ medido em toda a grade largura×ui): 0,075 → 0,09.
 */
const CONTEXTO_FRACAO = 0.09;

/**
 * O DEGRAU DA BARRA QUEBRADA — e ele é fenômeno de LARGURA, não de
 * `?ui=`. Com o botão da busca (F3) a barra de controles passa a QUEBRAR
 * LINHA quando o texto não cabe nos `max-width: 60vw` que o `hud.css`
 * lhe dá (o CSS prefere quebrar a invadir a linha de contexto —
 * garantia geométrica da F6). Ou seja: quem quebra é a razão entre o
 * TAMANHO DO TEXTO e a LARGURA da janela, e declarar o degrau só em
 * função de `?ui=` deixava metade do fenômeno de fora.
 *
 * MEDIDO (2026-08-12, `?atlas=1&shot=1`, viewport de 813 px de altura),
 * a menor largura de CSS em que a barra ainda NÃO quebra:
 *
 *   ui = 1,00 → entre 930 e 940 px      (razão 930–940)
 *   ui = 1,15 → entre 1.050 e 1.100 px  (razão 913–957)
 *   ui = 1,25 → entre 1.150 e 1.200 px  (razão 920–960)
 *   ui = 1,29 → entre 1.150 e 1.200 px  (razão 891–930)
 *   ui = 1,30 → já quebrada a 1.200 px  (`.controls-bar` 35,0 → 84,9 px
 *               entre 1,25 e 1,30 — o degrau é de 50 px, não uma rampa)
 *
 * A razão é constante dentro da medição: ~930–960 px de largura por
 * unidade de `ui`. `LARGURA_DA_QUEBRA_PX` fica no TOPO da faixa (960)
 * porque errar para cima declara o degrau CEDO — custa um recuo de
 * câmera — e errar para baixo põe o alvo atrás da barra.
 *
 * O que isto corrige, medido: o limiar anterior era `ui > 1,3` numa
 * janela só, e a quebra a 1.200 px começa EM 1,30 — a comparação
 * estrita deixava passar exatamente o degrau (declarado 0,163 contra
 * 0,189 medido). Na lei nova, a 1.200 px o degrau entra a partir de
 * `ui > 1,25`, e em janela estreita ele entra onde a quebra realmente
 * acontece.
 */
const LARGURA_DA_QUEBRA_PX = 960;
const BARRA_QUEBRADA_FRACAO = 0.04;
const SELO_FRACAO = 0.14;

/**
 * A LARGURA DE REFERÊNCIA — a tela de mesa em que as frações acima
 * foram medidas e em que o juiz de a11y roda. É o default do produtor:
 * quem o chama sem largura (o vitest da função pura) recebe o
 * enquadramento desta janela, e não um caso-limite silencioso.
 */
export const LARGURA_DE_MESA_PX = 1200;

/**
 * ATÉ ONDE A DECLARAÇÃO VALE, em largura de CSS — medido, não estimado.
 * De 900 px para cima o retângulo declarado cobre o HUD real em toda a
 * faixa de `?ui=` (0,85 a 1,4); abaixo disso a BASE estoura, porque a
 * máquina do tempo também quebra em duas e três linhas: medido em
 * `ui = 1,4`, base 0,297 a 850 px (declarada 0,310, cabe) contra 0,328 a
 * 800 px e 0,416 a 700 px. A 600 px nem o topo cabe (0,245 contra 0,210).
 *
 * PENDÊNCIA NOMEADA, com endereço em vez de adjetivo: "telas estreitas"
 * é o HUD do Atlas reflowar abaixo de 900 px de largura de CSS — não é o
 * enquadramento que está errado ali, é o HUD que precisa de um arranjo
 * próprio (Onda 6). O juiz de a11y mede essas larguras e IMPRIME os
 * números; o que ele cobra como gate é a faixa declarada aqui.
 */
export const LARGURA_UTIL_MINIMA_PX = 900;

/**
 * A MÁQUINA DO TEMPO (F4), na BASE e à ESQUERDA — o canto oposto ao do
 * selo. Ela e o selo dividem a mesma faixa de baixo, e por isso o que
 * entra no retângulo é o MAIOR dos dois e não a soma: descontar as
 * duas alturas empurraria a câmera para trás por uma faixa que ninguém
 * ocupa inteira.
 *
 * MEDIDO pelo juiz de a11y a 1200×900: `.atlas-tempo` (leitura em
 * cima, seis controles embaixo, linha de aviso sempre montada) ocupa
 * 22,0% da altura contando a tarja — 15,5% além dela. Ela PASSOU A SER
 * a peça mais alta do modo: o selo mede 18,8% na mesma janela. 0,175
 * declara isso com folga de ~1,5% da altura para variação de fonte, e
 * é este número que o juiz confere contra o retângulo real.
 */
const TEMPO_FRACAO = 0.175;

/**
 * O que o HUD come do quadro, em FRAÇÃO de cada borda. Um só produtor
 * publicado (`retanguloUtilDoAtlas`) — o Atlas não é letterboxed por
 * conta própria, ele desconta as áreas REAIS do HUD dele.
 */
export interface RetanguloUtil {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

/** Quadro inteiro — nenhuma borda comida. */
export const RETANGULO_CHEIO: RetanguloUtil = {
  esquerda: 0,
  direita: 0,
  topo: 0,
  base: 0,
};

/**
 * O ÚNICO produtor do retângulo útil do Atlas — tarjas de cinema mais
 * as áreas REAIS do HUD do modo (F2). A conta não se repete dentro de
 * componente nenhum: quem enquadra pergunta aqui.
 *
 * As duas áreas do HUD entram no eixo VERTICAL e não no horizontal
 * mesmo estando encostadas nas laterais (ContextLine à esquerda, selo à
 * direita): o retângulo é um recorte retangular do quadro, e descontar
 * meia largura por causa de uma faixa que ocupa 7% da altura empurraria
 * a câmera para trás sem necessidade. Descontar a FAIXA inteira é o
 * corte honesto — é o que garante que nada do alvo caia atrás do texto.
 *
 * `fatorUi` é a escala do texto do HUD (`?ui=`, F6). As tarjas não
 * escalam — são `vh` puro —; as faixas do HUD, sim.
 *
 * `larguraPx` é a largura de CSS da janela (o mesmo `vw` de que o
 * `max-width: 60vw` da barra de controles vive). Ela entra porque a
 * quebra da barra é fenômeno de largura×texto e não de texto sozinho —
 * ver `LARGURA_DA_QUEBRA_PX`.
 */
export function retanguloUtilDoAtlas(
  fatorUi = 1,
  larguraPx = LARGURA_DE_MESA_PX
): RetanguloUtil {
  const k = Number.isFinite(fatorUi) && fatorUi > 0 ? fatorUi : 1;
  const largura =
    Number.isFinite(larguraPx) && larguraPx > 0 ? larguraPx : LARGURA_DE_MESA_PX;
  return {
    esquerda: 0,
    direita: 0,
    topo:
      LETTERBOX_FRACAO +
      CONTEXTO_FRACAO * k +
      (largura < LARGURA_DA_QUEBRA_PX * k ? BARRA_QUEBRADA_FRACAO : 0),
    base: LETTERBOX_FRACAO + Math.max(SELO_FRACAO, TEMPO_FRACAO) * k,
  };
}

export interface PedidoDeEnquadramento {
  /**
   * Raio da esfera a enquadrar, na unidade da CENA. Para um corpo do
   * sistema solar é o raio ORBITAL do alvo (o `rUA` do retrato/da
   * efeméride, convertido): enquadra-se a ÓRBITA, não o corpo — corpos
   * são pontos até a Onda 6, e uma tabela nova de raios físicos seria
   * segunda fonte de verdade que a Onda 7 refaria.
   */
  rAlvo: number;
  /** Abertura VERTICAL da lente, em graus. */
  fovDeg: number;
  /** Largura/altura do quadro. */
  aspect: number;
  retanguloUtil: RetanguloUtil;
}

export interface Enquadramento {
  /** Distância da câmera ao alvo, na unidade de `rAlvo`. */
  distancia: number;
  /**
   * Giros a aplicar DEPOIS do `lookAt(alvo)` para o alvo cair no
   * centro do retângulo útil em vez do centro do quadro — os mesmos
   * `camera.rotateY` / `camera.rotateX` que a JourneyRig usa no
   * pausar-e-olhar, em radianos. Zero quando o HUD é simétrico.
   */
  giroY: number;
  giroX: number;
}

const GRAU = Math.PI / 180;

/**
 * ENQUADRAMENTO PRIVILEGIADO — pura, e é ela que carrega a conta.
 *
 * `d = r / sen(θ/2)` é a distância em que uma esfera de raio `r`
 * tangencia as bordas de um cone de abertura θ. Faz-se a conta nos
 * DOIS eixos e fica a MAIOR: numa tela ultrawide o vertical é o
 * apertado, num retrato é o horizontal — usar só um dos dois corta o
 * assunto em metade dos aparelhos.
 *
 * O retângulo útil encolhe cada semi-ângulo no espaço da TANGENTE (é
 * lá que a projeção é linear; encolher o ângulo direto erra por vários
 * por cento já a 30°), e o descentramento dele vira os dois giros.
 */
export function enquadrar(pedido: PedidoDeEnquadramento): Enquadramento {
  const { rAlvo, fovDeg, aspect, retanguloUtil } = pedido;
  // lente e quadro: valores impossíveis viram os neutros mais próximos
  // em vez de NaN — este resultado vai direto para a matriz da câmera
  const fov = Number.isFinite(fovDeg) ? THREE.MathUtils.clamp(fovDeg, 1, 179) : 1;
  const asp = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const fracao = (v: number) =>
    Number.isFinite(v) ? THREE.MathUtils.clamp(v, 0, 0.49) : 0;
  const esq = fracao(retanguloUtil.esquerda);
  const dir = fracao(retanguloUtil.direita);
  const topo = fracao(retanguloUtil.topo);
  const base = fracao(retanguloUtil.base);

  const tanV = Math.tan((fov * GRAU) / 2);
  const tanH = tanV * asp;
  // semi-ângulos do que SOBRA depois do HUD
  const meiaV = Math.atan(tanV * (1 - topo - base));
  const meiaH = Math.atan(tanH * (1 - esq - dir));

  // DESCENTRAMENTO do retângulo útil, em NDC (o quadro inteiro é −1..1).
  // `rotateY(+)` vira a câmera para a esquerda e leva o alvo para a
  // direita da tela; `rotateX(+)` levanta a câmera e leva o alvo para
  // baixo. O `cos(giroX)` no giro horizontal não é refinamento: as duas
  // rotações são compostas, e sem ele o alvo erra o centro do retângulo
  // por décimos de por cento quando os dois desvios são grandes.
  const giroX = Math.atan(tanV * (topo - base));
  const giroY = Math.atan(tanH * (esq - dir) * Math.cos(giroX));

  // alvo sem raio (o próprio Sol, um alvo ainda não resolvido) não
  // tem escala para enquadrar: distância 0 e quem chamou decide
  const raio = Number.isFinite(rAlvo) && rAlvo > 0 ? rAlvo * MARGEM_DE_ENQUADRAMENTO : 0;
  const distancia = Math.max(raio / Math.sin(meiaV), raio / Math.sin(meiaH));

  return { distancia, giroY, giroX };
}

/**
 * A DIREÇÃO em que a câmera se põe, vista do alvo: a DIREÇÃO ILUMINADA
 * — o eixo Sol→alvo NEGADO, ou seja alvo→Sol — girada de
 * `PHASE_OFFSET_GRAUS` na direção do polo. Pura.
 *
 * A NEGAÇÃO é a coisa toda, e é do doador: a câmera se põe ENTRE o Sol e
 * o alvo, para ver a face acesa (`PrivilegedPosition.ts:210-212`, "Camera
 * should be on the OPPOSITE side to see illuminated face"). Sem ela os
 * 30° e os 70° passam a ser medidos do lado ESCURO, e o grampo que
 * deveria garantir 67% de disco iluminado garante no máximo 33%.
 *
 * `desvioExtra` (radianos) é a órbita do visitante somada ao pino; o
 * total é grampeado em `MAX_SOLAR_DEVIATION_GRAUS` — passar disso é
 * fotografar o lado escuro do alvo, e é essa a única serventia do 70°.
 */
export function direcaoPrivilegiada(
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  desvioExtra: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const eixoSolar = out.copy(doSolAoAlvo).negate();
  if (eixoSolar.lengthSq() < 1e-30) eixoSolar.set(0, 0, 1);
  eixoSolar.normalize();
  const maximo = MAX_SOLAR_DEVIATION_GRAUS * GRAU;
  const angulo = THREE.MathUtils.clamp(
    PHASE_OFFSET_GRAUS * GRAU + (Number.isFinite(desvioExtra) ? desvioExtra : 0),
    -maximo,
    maximo
  );
  const eixo = new THREE.Vector3().crossVectors(eixoSolar, polo);
  // alvo alinhado com o polo: qualquer perpendicular serve
  if (eixo.lengthSq() < 1e-12) {
    eixo.set(1, 0, 0).cross(eixoSolar);
    if (eixo.lengthSq() < 1e-12) eixo.set(0, 1, 0).cross(eixoSolar);
  }
  return eixoSolar.applyAxisAngle(eixo.normalize(), angulo);
}

/**
 * A DIREÇÃO DO DEGRAU "LUA" (F2b/D7) — o consumidor de
 * `PARENT_FRAMING_BIAS`. Pura, e a semântica é a do doador
 * (`PrivilegedPosition.calculateContextAwareDirection`), re-expressa:
 *
 *  1. parte da direção solar privilegiada (30° de Rembrandt + órbita do
 *     visitante, grampeada — `direcaoPrivilegiada`);
 *  2. mistura com "para longe do PAI" (`(alvo − pai)` normalizado) com
 *     peso `PARENT_FRAMING_BIAS` no termo do pai e renormaliza — a
 *     câmera vai para o lado oposto ao pai, então olhar a lua é olhar
 *     TAMBÉM o pai, ao fundo do mesmo quadro;
 *  3. …mas NUNCA além do terminador (a cicatriz que o doador pagou para
 *     aprender: com 0,78 o termo do pai vence, e quando o eixo pai→lua
 *     passa de ~106° do Sol a mistura cai no lado NOTURNO — Japeto,
 *     Titã e a própria Lua liam como "não carregou"): se a mistura
 *     desvia mais que `MAX_SOLAR_DEVIATION_GRAUS` da direção iluminada,
 *     gira-se a direção iluminada RUMO à mistura por exatamente o
 *     máximo — o azimute "longe do pai" sobrevive onde é compatível com
 *     luz, e onde não é fica a direção mais próxima que ainda é.
 */
const _solSnapshot = new THREE.Vector3();
const _iluminada = new THREE.Vector3();
const _longeDoPai = new THREE.Vector3();
const _eixoDeGiro = new THREE.Vector3();

export function direcaoDaLua(
  doSolAoAlvo: THREE.Vector3,
  doPaiAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  desvioExtra: number,
  out: THREE.Vector3
): THREE.Vector3 {
  // snapshots ANTES de escrever em `out`: os chamadores da classe podem
  // passar o mesmo rascunho nos dois papéis (o padrão de `apply`)
  _solSnapshot.copy(doSolAoAlvo);
  _iluminada.copy(doSolAoAlvo).negate();
  const temSol = _iluminada.lengthSq() >= 1e-30;
  if (temSol) _iluminada.normalize();

  const solar = direcaoPrivilegiada(doSolAoAlvo, polo, desvioExtra, out);
  if (doPaiAoAlvo.lengthSq() < 1e-30) return solar;
  _longeDoPai.copy(doPaiAoAlvo).normalize();
  const mistura = solar.lerp(_longeDoPai, PARENT_FRAMING_BIAS);
  if (mistura.lengthSq() < 1e-12) return out.copy(_longeDoPai);
  mistura.normalize();

  if (!temSol) return mistura;
  const maximo = MAX_SOLAR_DEVIATION_GRAUS * GRAU;
  if (mistura.angleTo(_iluminada) <= maximo) return mistura;

  _eixoDeGiro.crossVectors(_iluminada, mistura);
  if (_eixoDeGiro.lengthSq() < 1e-12) {
    // anti-paralelo exato: não há plano em que girar — não sobra
    // componente "longe do pai" que valha preservar; volta à direção
    // solar privilegiada pura, recomposta do snapshot (o rascunho está
    // sujo da mistura).
    return direcaoPrivilegiada(_solSnapshot, polo, desvioExtra, out);
  }
  return out
    .copy(_iluminada)
    .applyAxisAngle(_eixoDeGiro.normalize(), maximo)
    .normalize();
}

/** Polo da eclíptica no frame da cena (equatorial J2000). */
const POLO_ECLIPTICO = (() => {
  const v = eclipticaParaEquatorial([0, 0, 1]);
  return new THREE.Vector3(v[0], v[1], v[2]).normalize();
})();

/** O Sol mora na origem da cena — o centro de tudo que o Atlas enquadra. */
const SOL = new THREE.Vector3(0, 0, 0);

/**
 * A RAMPA ENTRE DEGRAUS da escada (F2b/D7), em segundos. Curta como o
 * véu (0,45 s por metade): descer de órbita para corpo não é travessia
 * física — a rampa existe para o olho seguir a troca de enquadramento,
 * não para fingir voo. Sob `prefers-reduced-motion` e `?shot=` quem
 * chama pede o salto seco (`rampa: false`) e ela nunca anima.
 */
export const RAMPA_DO_DEGRAU_S = 0.5;

const _dir = new THREE.Vector3();
const _dirPai = new THREE.Vector3();
const _posDestino = new THREE.Vector3();
const _quatDestino = new THREE.Quaternion();
const _posPartida = new THREE.Vector3();
const _quatPartida = new THREE.Quaternion();
const _dirA = new THREE.Vector3();
const _dirB = new THREE.Vector3();

/**
 * O rig. Estado mínimo: um alvo, um raio de enquadramento e a órbita
 * que o visitante somou com o ponteiro. Não anima nada — o
 * reposicionamento do Atlas acontece atrás do véu (D3: "não é
 * travessia física"), e é por isso que a prontidão de captura só
 * precisa esperar o véu, não o rig.
 */
export class AtlasRig {
  /** alvo em coordenadas de CENA (pc) */
  readonly alvo = new THREE.Vector3();
  /** raio da esfera enquadrada, em pc */
  private raio = 0;
  private orbita = 0;
  /**
   * De onde sai o EIXO SOLAR quando o próprio alvo não serve para
   * defini-lo. Vale o alvo em todo enquadramento comum; na vista de
   * abertura, cujo alvo é a ORIGEM (o Sol), ele é a posição do corpo
   * mais externo — sem isso `direcaoPrivilegiada` cairia no ramo
   * degenerado (vetor nulo) e a abertura viraria uma direção arbitrária.
   */
  private readonly eixoDe = new THREE.Vector3();
  /**
   * O PAI do alvo, quando o alvo é uma LUA (degrau "lua" da escada,
   * F2b/D7): com ele presente a direção sai de `direcaoDaLua` (a
   * mistura `PARENT_FRAMING_BIAS`) em vez de `direcaoPrivilegiada`.
   * `null` em todo enquadramento comum.
   */
  private pai: THREE.Vector3 | null = null;
  private readonly paiGuardado = new THREE.Vector3();

  // ---- a rampa entre degraus (F2b/D7) ------------------------------
  // O reposicionamento de ENTRADA no Atlas segue atrás do véu (D3);
  // esta rampa é só a troca de degrau DENTRO do modo — órbita→corpo,
  // corpo→lua, as subidas — onde não há véu e um corte seco leria como
  // teletransporte. Ela interpola POSES (posição por direção+distância
  // log em torno do alvo novo, orientação por slerp), termina EXATA na
  // pose pura do enquadramento (t ≥ 1 escreve a conta de sempre, bit a
  // bit — é o que mantém `?foco=` reproduzível), e o snapshot de
  // partida é a pose que a câmera MOSTRAVA no quadro da troca.
  private rampaT = 1;
  private readonly partida = {
    alvo: new THREE.Vector3(),
    raio: 0,
    eixoDe: new THREE.Vector3(),
    pai: new THREE.Vector3(),
    temPai: false,
    orbita: 0,
  };

  /**
   * O ENQUADRAMENTO DE ABERTURA: o SISTEMA inteiro, e a esfera dele é
   * CENTRADA NO SOL com raio igual à órbita mais externa do retrato.
   * Centrada no Sol e não no corpo: uma esfera de 35,4 UA pendurada em
   * Plutão não contém o sistema — um corpo do lado oposto da mesma
   * órbita fica a até ~71 UA do centro dela, e a promessa "quem enquadra
   * a órbita de fora enquadra tudo que está dentro" seria falsa. Com o
   * centro na origem ela é verdade por construção: toda órbita do
   * retrato cabe dentro da mais externa.
   *
   * A DIREÇÃO continua saindo do corpo (`eixoDe`), porque o alvo é a
   * origem e o eixo Sol→alvo seria nulo.
   *
   * Por que não a Terra, que seria "casa": enquadrar a órbita da Terra
   * põe a câmera a ~4 UA do Sol, e a 4 UA o Sol estoura o quadro
   * inteiro de branco — é fotometria correta (o Sol a 4 UA É ofuscante)
   * contra uma exposição de 1,02 que só a gradação por contexto da F6
   * vai saber tratar.
   *
   * O NÚMERO DA ABERTURA, num lugar só (quem mais precisar dele cita
   * esta docstring em vez de repeti-lo): com o retângulo útil vigente em
   * `ui = 1` e tela de mesa (aspecto ≥ 1, onde quem aperta é o vertical)
   * a câmera fica a **226,84 UA do Sol** — `35,4213 UA × 1,2 / sen(meia-abertura útil)`
   * (era 221,55 até a F2b: a linha da ESCADA na ContextLine cresceu a
   * faixa do topo — ver CONTEXTO_FRACAO),
   * e como o alvo é a própria origem essa distância é a distância a casa,
   * sem triângulo nenhum. Ela ANDA com o HUD e com `?ui=`: 213,37 UA em
   * `ui = 0,85`, 296,76 UA em `ui = 1,4`. O trilho de `atlasRig.test.ts`
   * deriva o número de `enquadrar()` e quebra se ele envelhecer aqui.
   */
  focarNoSistema() {
    const fora = orbitaMaisExterna();
    this.focar(SOL, fora.raio, fora.posicao);
  }

  /**
   * Foca um ponto da cena, enquadrando uma esfera de `raio` pc nele.
   * `eixoDe` é o ponto de onde sai o eixo solar — o próprio alvo, salvo
   * na abertura (ver `focarNoSistema`).
   *
   * `opcoes.pai` liga o degrau "lua" (direção por `direcaoDaLua`);
   * `opcoes.rampa` pede a transição suave a partir do enquadramento
   * ATUAL — só faz sentido com a fase já viva (as trocas de degrau);
   * entrada no Atlas e deep-link seguem instantâneos atrás do véu.
   * Focar o MESMO alvo com rampa é no-op (nem reinicia a rampa): é o
   * que mantém `?foco=` idempotente — clicar de novo não move um bit.
   */
  focar(
    alvo: THREE.Vector3,
    raio: number,
    eixoDe: THREE.Vector3 = alvo,
    opcoes: { rampa?: boolean; pai?: THREE.Vector3 | null } = {}
  ) {
    const pai = opcoes.pai ?? null;
    if (opcoes.rampa) {
      const mesmoAlvo =
        this.alvo.distanceToSquared(alvo) === 0 &&
        this.raio === raio &&
        (pai === null) === (this.pai === null);
      if (mesmoAlvo) return;
      // snapshot do enquadramento QUE ESTÁ NA TELA — é dele que a rampa parte
      this.partida.alvo.copy(this.alvo);
      this.partida.raio = this.raio;
      this.partida.eixoDe.copy(this.eixoDe);
      this.partida.temPai = this.pai !== null;
      if (this.pai) this.partida.pai.copy(this.pai);
      this.partida.orbita = this.orbita;
      this.rampaT = 0;
    } else {
      this.rampaT = 1;
    }
    this.alvo.copy(alvo);
    this.raio = raio;
    this.eixoDe.copy(eixoDe);
    if (pai) {
      this.paiGuardado.copy(pai);
      this.pai = this.paiGuardado;
    } else {
      this.pai = null;
    }
    this.orbita = 0;
  }

  /** a rampa entre degraus ainda está andando? (a captura espera por ela) */
  get animando(): boolean {
    return this.rampaT < 1;
  }

  /** arrasto do ponteiro: orbita o alvo dentro do grampo solar */
  addOrbitDelta(dx: number) {
    const maximo = MAX_SOLAR_DEVIATION_GRAUS * GRAU;
    this.orbita = THREE.MathUtils.clamp(
      this.orbita - dx * 0.0022,
      -maximo - PHASE_OFFSET_GRAUS * GRAU,
      maximo - PHASE_OFFSET_GRAUS * GRAU
    );
  }

  /**
   * Escreve a câmera do quadro. Chamada do MESMO ponto do tick em que
   * a JourneyRig escreve a dela — inclusive o `fov`, que aqui é o pino
   * `ATLAS_FOV_GRAUS` e não o resíduo amortecido do shot anterior.
   *
   * `fatorUi` e `larguraPx` chegam de fora (o Director lê os dois
   * números vivos) para o rig continuar sem saber que existe DOM: texto
   * maior ⇒ HUD mais alto ⇒ retângulo útil menor ⇒ câmera um pouco mais
   * atrás; janela mais estreita ⇒ a barra quebra ⇒ o mesmo efeito.
   */
  apply(
    camera: THREE.PerspectiveCamera,
    fatorUi = 1,
    larguraPx = LARGURA_DE_MESA_PX,
    dt = 0
  ) {
    if (this.rampaT >= 1) {
      // o caminho de SEMPRE, intocado bit a bit — é o que as provas de
      // idempotência (?foco) e os md5 do atlas-smoke medem
      this.escreverPose(
        camera, fatorUi, larguraPx,
        this.alvo, this.raio, this.eixoDe, this.pai, this.orbita
      );
      return;
    }

    // a rampa entre degraus: poses dos dois enquadramentos, interpoladas
    this.rampaT = Math.min(
      1,
      this.rampaT + (Number.isFinite(dt) ? Math.max(dt, 0) : 0) / RAMPA_DO_DEGRAU_S
    );
    const t = this.rampaT;
    // o mesmo smoothstep de toda rampa da casa (C¹ nas duas bordas)
    const k = t * t * (3 - 2 * t);

    this.escreverPose(
      camera, fatorUi, larguraPx,
      this.alvo, this.raio, this.eixoDe, this.pai, this.orbita
    );
    _posDestino.copy(camera.position);
    _quatDestino.copy(camera.quaternion);
    this.escreverPose(
      camera, fatorUi, larguraPx,
      this.partida.alvo, this.partida.raio, this.partida.eixoDe,
      this.partida.temPai ? this.partida.pai : null, this.partida.orbita
    );
    _posPartida.copy(camera.position);
    _quatPartida.copy(camera.quaternion);

    // posição: direção em torno do ALVO NOVO interpolada e distância em
    // LOG — órbita→corpo atravessa 3+ ordens de grandeza, e a distância
    // linear gastaria a rampa inteira parada e saltaria no fim
    _dirA.copy(_posPartida).sub(this.alvo);
    _dirB.copy(_posDestino).sub(this.alvo);
    const dA = Math.max(_dirA.length(), 1e-30);
    const dB = Math.max(_dirB.length(), 1e-30);
    _dirA.multiplyScalar(1 / dA);
    _dirB.multiplyScalar(1 / dB);
    _dir.lerpVectors(_dirA, _dirB, k);
    if (_dir.lengthSq() < 1e-12) _dir.copy(_dirB);
    _dir.normalize();
    const d = Math.exp((1 - k) * Math.log(dA) + k * Math.log(dB));
    camera.position.copy(this.alvo).addScaledVector(_dir, d);
    camera.quaternion.slerpQuaternions(_quatPartida, _quatDestino, k);
    camera.fov = ATLAS_FOV_GRAUS;
    camera.updateProjectionMatrix();
  }

  /** a pose PURA de um enquadramento — o corpo do `apply` de sempre. */
  private escreverPose(
    camera: THREE.PerspectiveCamera,
    fatorUi: number,
    larguraPx: number,
    alvo: THREE.Vector3,
    raio: number,
    eixoDe: THREE.Vector3,
    pai: THREE.Vector3 | null,
    orbita: number
  ) {
    const { distancia, giroY, giroX } = enquadrar({
      rAlvo: raio,
      fovDeg: ATLAS_FOV_GRAUS,
      aspect: camera.aspect,
      retanguloUtil: retanguloUtilDoAtlas(fatorUi, larguraPx),
    });
    if (pai) {
      direcaoDaLua(
        _dir.copy(eixoDe).sub(SOL),
        _dirPai.copy(alvo).sub(pai),
        POLO_ECLIPTICO,
        orbita,
        _dir
      );
    } else {
      direcaoPrivilegiada(
        _dir.copy(eixoDe).sub(SOL),
        POLO_ECLIPTICO,
        orbita,
        _dir
      );
    }
    camera.position.copy(alvo).addScaledVector(_dir, distancia);
    camera.up.copy(POLO_ECLIPTICO);
    camera.lookAt(alvo);
    if (giroY !== 0) camera.rotateY(giroY);
    if (giroX !== 0) camera.rotateX(giroX);
    camera.fov = ATLAS_FOV_GRAUS;
    camera.updateProjectionMatrix();
  }
}

/**
 * O RAIO DE ENQUADRAMENTO DE UMA ESTRELA — a esfera de vizinhança que o
 * Atlas põe em quadro em volta dela. Função do ALVO e só dele: a
 * distância da estrela ao SOL, que é o mesmo referencial de onde
 * `direcaoPrivilegiada` tira o eixo.
 *
 * POR QUE NÃO A DISTÂNCIA À CÂMERA, que era o que estava aqui: o Atlas
 * ENQUADRA (a câmera é posta, não voa), e `apply` move a câmera na mesma
 * chamada. Com o raio saindo da câmera, clicar duas vezes no mesmo nome
 * dava duas vistas — a 100 pc o primeiro clique enquadrava 8 pc, o
 * segundo 4, o terceiro 2, até o piso —, e o link `?foco=` reproduzia a
 * vista do primeiro clique, nunca a que estava na tela. É a mesma
 * não-reprodutibilidade que o pino de `ATLAS_FOV_GRAUS` existe para
 * impedir, entrando por outra porta (D5: a função pura recebe o `rAlvo`
 * como propriedade do alvo).
 *
 * A LEI é a que já existia — 8% da distância, entre 0,8 e 9 pc —, só que
 * medida do Sol: o alcance segue o mesmo (uma vizinha a 1,4 pc abre com
 * 0,8 pc de esfera, Betelgeuse a 152 pc com os 9 do teto), e no VOO
 * LIVRE nada muda: lá o número significa outra coisa (a distância de
 * chegada de um voo), e depender de onde se parte é o certo.
 */
export function raioDeEnquadramentoEstelar(distanciaAoSolPc: number): number {
  return THREE.MathUtils.clamp(distanciaAoSolPc * 0.08, 0.8, 9);
}

/**
 * Posição de cena e raio de enquadramento do corpo mais externo do
 * retrato. Fora da classe porque é conta de DADO, não de câmera — e
 * porque o teste a confere sem construir rig nenhum. Quem é "o mais
 * externo" sai do próprio retrato, medido: pinar `pluto` aqui seria
 * uma segunda fonte de verdade que a máquina do tempo da F4 (com as
 * órbitas vivas) desmentiria no primeiro salto de data.
 *
 * O QUE É DERIVADO E O QUE É CONGELADO, declarado para não haver
 * confusão: a ESCOLHA de quem é o mais externo é derivada do dado; a
 * POSIÇÃO e o RAIO vêm da tabela congelada de 1º de janeiro de 2026
 * (`RETRATO_2026`), e nada neste caminho consulta a efeméride viva nem
 * o `jd` do Director. Consequência: depois de um salto de data a esfera
 * de abertura continua a do retrato — o Sol segue no centro dela (a
 * esfera é centrada na origem, e é essa a promessa que importa), mas o
 * corpo que dá nome ao enquadramento não está mais onde estava.
 *
 * A PENDÊNCIA DA ONDA 5 ("abertura ancorada na época") FECHOU na F2b da
 * Onda 6, com OVERRIDE DECLARADO do destino registrado: o conserto era
 * exatamente o previsto — o Director compõe a posição viva
 * (`Director.focarNoSistema`) — mas ele NÃO esperou as órbitas
 * desenhadas, porque a posição viva só depende de efeméride + tempo
 * vivo, que já existem (emendas D-E5/T-E12; "justificativa errada conta
 * como falha", Onda 9). Esta função ficou sendo o caminho SEM efeméride:
 * o retrato congelado, com o badge do tempo contando a verdade.
 */
export function orbitaMaisExterna(): { posicao: THREE.Vector3; raio: number } {
  const corpo = Object.values(RETRATO_2026).reduce((maior, c) =>
    c.rUA > maior.rUA ? c : maior
  );
  // MESMO caminho da camada de planetas (`planetas.ts:349-353`):
  // `eclipticaParaEquatorial(vetorUA) × AU_PARA_PC`. Qualquer outro
  // escalar de comprimento aqui seria uma segunda fonte de verdade.
  const eq = eclipticaParaEquatorial(corpo.vetorUA);
  return {
    posicao: new THREE.Vector3(
      eq[0] * AU_PARA_PC,
      eq[1] * AU_PARA_PC,
      eq[2] * AU_PARA_PC
    ),
    raio: corpo.rUA * AU_PARA_PC,
  };
}
