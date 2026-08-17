// ============================================================
// A MATEMÁTICA PURA do enquadramento privilegiado do Atlas.
//
// A matemática vem da `PrivilegedPosition` do atlas doador (406
// linhas de classe sobre THREE, acopladas a um `ViewportRect`); o
// que atravessa é o que é conferível — `d = r/sen(θ/2)`, o
// `max(distVertical, distHorizontal)` que salva tela ultrawide, e a
// correção pelo retângulo que sobra depois do HUD. Tudo aqui é
// FUNÇÃO PURA e constante medida; o fio que liga à câmera é o
// AtlasRig (./atlasRig), e o retângulo vem de ./retanguloDoAtlas.
// ============================================================
import * as THREE from 'three';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { RETRATO_2026 } from '../world/planetas/retrato2026';
import type { RetanguloUtil } from './retanguloDoAtlas';

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
 *
 * DESDE O ARRASTO DE DOIS EIXOS ELE É UM CONE, não mais um arco, e a
 * frase acima passou a valer LITERALMENTE em vez de valer num plano só:
 * φ é o ângulo entre a câmera e a direção iluminada, e o grampo diz
 * `φ ≤ 70°` para QUALQUER azimute em torno da linha alvo→Sol. Ver
 * `OrbitaDoVisitante`.
 */
export const MAX_SOLAR_DEVIATION_GRAUS = 70;

/**
 * A SENSIBILIDADE do arrasto, em radianos por pixel — o número que já
 * governava o eixo único (0,0022 rad/px = 0,126°/px, medido na
 * auditoria de 2026-08-12). Vale para os DOIS eixos: dizer que o mesmo
 * dedo anda mais depressa na horizontal do que na vertical seria
 * inventar uma assimetria que ninguém pediu.
 */
export const ARRASTO_RAD_POR_PX = 0.0022;

/**
 * O QUE O DEDO DO VISITANTE ACUMULA, em dois eixos — e por que os dois
 * cabem dentro do MESMO grampo de 70°.
 *
 * `altura` é o eixo VELHO: some ao pino de fase (`PHASE_OFFSET_GRAUS`) e
 * inclina a câmera na direção do polo. É ele, e só ele, que mexe no
 * ângulo câmera↔Sol — logo é ele, e só ele, que o grampo precisa
 * apertar.
 *
 * `volta` é o eixo NOVO: um giro em torno da PRÓPRIA linha alvo→Sol.
 *
 * A CONTA QUE O LIBERA (é ela que compra os 360° sem afrouxar nada):
 * seja `u` a direção iluminada (unitária) e `d` a direção da câmera
 * depois da inclinação, com `d·u = cos φ`. Uma rotação `R(u, ψ)` em
 * torno de `u` deixa `u` fixo (`R(u,ψ)u = u`) e é ortogonal, então
 *
 *     (R(u,ψ)d)·u = (R(u,ψ)d)·(R(u,ψ)u) = d·u = cos φ
 *
 * — o ângulo ao Sol é EXATAMENTE o mesmo, para qualquer ψ. A fração
 * iluminada `(1+cos φ)/2` não muda um dígito, e o grampo de 70°
 * continua valendo palavra por palavra: o visitante ganha a volta
 * inteira sem nunca ver um grau a mais de sombra. `atlasRig.test.ts`
 * varre ψ e cobra a invariância a 1e-12.
 *
 * O `altura` GRAMPEADO EM [0°, 70°] e não mais em [−70°, +70°], e isto
 * NÃO tira nada do visitante: com 360° de `volta` a metade negativa é
 * REDUNDANTE — `(−φ, ψ)` e `(φ, ψ+180°)` são a MESMA direção, porque
 * girar meia volta em torno de `u` espelha a inclinação. O alcance sai
 * de um arco de 140° (uma dimensão) para o cone de 70° inteiro (duas), e
 * o que se ganha em troca é o que todo controle de órbita ganha ao
 * grampear o ângulo polar em vez de deixá-lo cruzar o eixo (three.js
 * `OrbitControls`, e o `clamp(phi, 0.18, π−0.18)` do projeto irmão):
 * atravessar φ = 0 INVERTERIA a horizontal, porque do outro lado do
 * eixo o azimute corre ao contrário. A vista de repouso (`altura = 0`,
 * `volta = 0`) segue sendo o pino de 30° de sempre, bit a bit.
 */
export interface OrbitaDoVisitante {
  /** arrasto VERTICAL acumulado (radianos), somado ao pino de fase. */
  altura: number;
  /** arrasto HORIZONTAL acumulado (radianos), em torno de alvo→Sol. */
  volta: number;
}

/** A órbita de quem ainda não arrastou nada — o repouso de todo foco. */
export const ORBITA_PARADA: Readonly<OrbitaDoVisitante> = Object.freeze({
  altura: 0,
  volta: 0,
});

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

export const GRAU = Math.PI / 180;

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
 * `orbita` é o que o dedo do visitante acumulou, nos DOIS eixos (ver
 * `OrbitaDoVisitante`): a `altura` soma ao pino e é grampeada em
 * `MAX_SOLAR_DEVIATION_GRAUS` — passar disso é fotografar o lado escuro
 * do alvo, e é essa a única serventia do 70° —, e a `volta` gira o
 * resultado em torno da própria linha alvo→Sol, que é a rotação que não
 * mexe no ângulo ao Sol e por isso não precisa de grampo nenhum.
 *
 * A ORDEM importa e é esta: inclina PRIMEIRO, gira DEPOIS. Girar antes
 * seria girar o eixo em torno de si mesmo (identidade) e o eixo novo
 * seria inerte.
 */
const _linhaDoSol = new THREE.Vector3();

export function direcaoPrivilegiada(
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  orbita: Readonly<OrbitaDoVisitante>,
  out: THREE.Vector3
): THREE.Vector3 {
  const eixoSolar = out.copy(doSolAoAlvo).negate();
  if (eixoSolar.lengthSq() < 1e-30) eixoSolar.set(0, 0, 1);
  eixoSolar.normalize();
  // a LINHA alvo→Sol guardada ANTES da inclinação: é ela o eixo do giro
  // de volta, e `out` deixa de ser ela na linha seguinte
  _linhaDoSol.copy(eixoSolar);
  const maximo = MAX_SOLAR_DEVIATION_GRAUS * GRAU;
  const altura = Number.isFinite(orbita.altura) ? orbita.altura : 0;
  // o cone: 0 é a fase cheia (câmera na linha do Sol), 70° é o limite
  // iluminado. Ver `OrbitaDoVisitante` para por que o piso é 0 e não −70°.
  const angulo = THREE.MathUtils.clamp(PHASE_OFFSET_GRAUS * GRAU + altura, 0, maximo);
  const eixo = new THREE.Vector3().crossVectors(eixoSolar, polo);
  // alvo alinhado com o polo: qualquer perpendicular serve
  if (eixo.lengthSq() < 1e-12) {
    eixo.set(1, 0, 0).cross(eixoSolar);
    if (eixo.lengthSq() < 1e-12) eixo.set(0, 1, 0).cross(eixoSolar);
  }
  eixoSolar.applyAxisAngle(eixo.normalize(), angulo);
  const volta = Number.isFinite(orbita.volta) ? orbita.volta : 0;
  if (volta !== 0) eixoSolar.applyAxisAngle(_linhaDoSol, volta);
  return eixoSolar;
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
  orbita: Readonly<OrbitaDoVisitante>,
  out: THREE.Vector3
): THREE.Vector3 {
  // snapshots ANTES de escrever em `out`: os chamadores da classe podem
  // passar o mesmo rascunho nos dois papéis (o padrão de `apply`)
  _solSnapshot.copy(doSolAoAlvo);
  _iluminada.copy(doSolAoAlvo).negate();
  const temSol = _iluminada.lengthSq() >= 1e-30;
  if (temSol) _iluminada.normalize();

  const solar = direcaoPrivilegiada(doSolAoAlvo, polo, orbita, out);
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
    return direcaoPrivilegiada(_solSnapshot, polo, orbita, out);
  }
  return out
    .copy(_iluminada)
    .applyAxisAngle(_eixoDeGiro.normalize(), maximo)
    .normalize();
}

/** Polo da eclíptica no frame da cena (equatorial J2000). */
export const POLO_ECLIPTICO = (() => {
  const v = eclipticaParaEquatorial([0, 0, 1]);
  return new THREE.Vector3(v[0], v[1], v[2]).normalize();
})();

/** O Sol mora na origem da cena — o centro de tudo que o Atlas enquadra. */

/**
 * A FAIXA EM QUE O POLO DO CORPO CEDE — a guarda da mira, e ela é
 * OBRIGATÓRIA, não caprichosa.
 *
 * O `lookAt` constrói a base da câmera com `direita = up × z`. Quando o
 * `up` chega perto da direção de vista esse produto vetorial encolhe
 * para zero, e a normalização dele passa a amplificar ruído de float: a
 * imagem GIRA SOZINHA em torno da mira, com o alvo parado. Trocar um
 * globo torto por um globo que roda sozinho não é conserto.
 *
 * E a degenerescência é ALCANÇÁVEL, medida: com o polo do CORPO no alto
 * e o arrasto de dois eixos solto, a direção da câmera chega a 0,44° do
 * polo da Terra (por volta do solstício, no extremo do arrasto) — porque
 * o eixo da Terra faz 66,6° com a direção do Sol no solstício e o
 * grampo do arrasto vale 70°, então a inclinação passa DO OUTRO LADO do
 * polo por 3,4°.
 *
 * A saída é o precedente que já existe na casa (`cameraRig.ts`,
 * `galacticUp`): misturar suavemente com um segundo `up`. Aqui o
 * segundo é o POLO DA ECLÍPTICA — que é o `up` que o Atlas usou a vida
 * inteira, e que para a Terra fica a 23,4° do polo do corpo: quando a
 * mira encosta no eixo da Terra, a eclíptica está a 23,4° dela, longe
 * da degenerescência. A troca não vaza para o caso comum: acima de 30°
 * de separação a mistura é ZERO e o `up` é o polo do corpo puro, bit a
 * bit (o repouso do degrau "corpo" fica a 36,6° do polo no solstício e
 * a 83° no equinócio — nunca dentro da faixa).
 */
export const CEDER_COMECA_GRAUS = 30;
export const CEDER_TERMINA_GRAUS = 15;

const _upBruto = new THREE.Vector3();

/**
 * O `up` que a câmera do Atlas escreve: o polo pedido, cedendo ao polo
 * da eclíptica quando ele encosta na direção de vista. Pura.
 *
 * `dir` é a direção alvo→câmera (unitária); o sinal não importa, o que
 * decide é |dir·polo|.
 */
export function upDoAtlas(
  dir: THREE.Vector3,
  polo: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  const alinhamento = Math.abs(dir.dot(polo));
  const cede = THREE.MathUtils.smoothstep(
    Number.isFinite(alinhamento) ? alinhamento : 1,
    Math.cos(CEDER_COMECA_GRAUS * GRAU),
    Math.cos(CEDER_TERMINA_GRAUS * GRAU)
  );
  _upBruto.copy(polo).lerp(POLO_ECLIPTICO, cede);
  // polo do corpo anti-paralelo ao da eclíptica no meio da mistura: o
  // lerp passa pelo vetor nulo e não há direção a normalizar
  if (_upBruto.lengthSq() < 1e-12) _upBruto.copy(POLO_ECLIPTICO);
  return out.copy(_upBruto).normalize();
}

/**
 * A RAMPA ENTRE DEGRAUS da escada (F2b/D7), em segundos. Curta como o
 * véu (0,45 s por metade): descer de órbita para corpo não é travessia
 * física — a rampa existe para o olho seguir a troca de enquadramento,
 * não para fingir voo. Sob `prefers-reduced-motion` e `?shot=` quem
 * chama pede o salto seco (`rampa: false`) e ela nunca anima.
 */


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
