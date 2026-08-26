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

/**
 * O CENTRO DO FRAME HELIOCÊNTRICO — o Sol não sai daqui, e ninguém muta
 * este vetor (quem precisa de um vetor próprio usa `.clone()`).
 *
 * MORA AQUI porque era QUATRO vetores idênticos: `director.ts`,
 * `director/solNoQuadro.ts`, `director/escada.ts` (que o exportava) e o
 * `SOL` privado do `atlasRig.ts` — e a exportação da escada era o único
 * CICLO de import de valor de todo o `src/` (`escada` → `escolha` →
 * `escada`, nascido quando o gesto se mudou para `escolha.ts` em 22/08).
 * Este módulo é o vizinho neutro dos quatro: geometria pura do Atlas,
 * sem director atrás. O `atlasRig.ts` o reexporta junto com o resto
 * (`export * from './enquadramento'`), então quem sempre o pediu de lá
 * segue servido.
 */
export const ORIGEM = new THREE.Vector3(0, 0, 0);

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
 * Desvio MÁXIMO contra a DIREÇÃO ILUMINADA (alvo→Sol), em graus. 70°
 * ainda deixa mais de meio disco iluminado — a fração iluminada é
 * `(1+cos φ)/2`, e em φ = 70° ela é 67% — com o terminador em quadro;
 * passar disso é fotografar o lado escuro do alvo.
 *
 * ELE NÃO GRAMPEIA MAIS O DEDO DO VISITANTE (item 73, 22/08). Até então
 * era um CONE em volta da linha alvo→Sol, e era ele que o arrasto
 * vertical batia: o visitante nunca via o lado escuro de nada, que é
 * metade da queixa "toda navegação atual do modo atlas está uma merda".
 * O que sobrou no caminho do dedo é o GRAMPO POLAR (`MIN_POLAR_RAD`),
 * que não é estético — é a degenerescência de `lookAt`.
 *
 * O QUE ELE AINDA GUARDA, e por isso continua vivo: a MISTURA de
 * `direcaoDaLua`. Lá o desvio é de uma direção CALCULADA — o peso
 * `PARENT_FRAMING_BIAS` puxando a câmera para o lado oposto ao pai —, e
 * sem o grampo a mistura cai no lado noturno quando o eixo pai→lua passa
 * de ~106° do Sol (a cicatriz que o doador pagou: Japeto, Titã e a
 * própria Lua liam como "não carregou"). Consequência declarada: no
 * degrau "lua" o arrasto do visitante atravessa `direcaoPrivilegiada` e
 * volta a ser aparado por este 70°. Soltá-lo lá é obra própria — quem a
 * fizer tem de separar a mistura calculada do gesto, e isso move a pose
 * de repouso de nenhuma lua mas move a de todas as arrastadas.
 */
export const MAX_SOLAR_DEVIATION_GRAUS = 70;

/**
 * O GRAMPO POLAR, em radianos — o ÚNICO limite que sobrou no caminho do
 * dedo, e o mesmo que todo controle de órbita tem (`OrbitControls` do
 * three, `clamp(phi, 0.18, π−0.18)` do projeto irmão).
 *
 * NÃO É GOSTO, é a degenerescência de `lookAt`: a base da câmera sai de
 * `direita = up × z`, e quando a direção de vista encosta no `up` esse
 * produto vetorial encolhe para zero — a normalização passa a amplificar
 * ruído de float e a imagem GIRA SOZINHA em torno da mira, com o alvo
 * parado. É o mesmo fenômeno que `upDoAtlas` documenta e do qual ele é a
 * segunda linha de defesa (a cedência ao polo da eclíptica só salva
 * quando o polo pedido NÃO é o da eclíptica).
 *
 * 0,1 rad são 5,73°, e o que eles compram é medido: `|up × z| = sen(φ)`,
 * e em 5,73° isso é 0,0998 — quatro ordens de grandeza acima do ruído de
 * float32 (~1e-7), enquanto a 0,01° seria 1,7e-4 e já se veria girar.
 */
export const MIN_POLAR_RAD = 0.1;

/**
 * A SENSIBILIDADE do arrasto, em radianos por pixel — o número que já
 * governava o eixo único (0,0022 rad/px = 0,126°/px, medido na
 * auditoria de 2026-08-12). Vale para os DOIS eixos: dizer que o mesmo
 * dedo anda mais depressa na horizontal do que na vertical seria
 * inventar uma assimetria que ninguém pediu.
 */
export const ARRASTO_RAD_POR_PX = 0.0022;

/**
 * A INÉRCIA DO GIRO — quanto do giro ANTERIOR sobrevive a um quadro de
 * 60 fps. É um filtro exponencial de primeira ordem, e ele é as DUAS
 * coisas de uma vez: a suavização enquanto o dedo anda (o degrau bruto
 * de cada evento chega diluído) e a inércia quando ele solta (o resto
 * decai sozinho em vez de parar seco).
 *
 * 0,8 É A RÉGUA DO NASA EYES, medida do bundle deles em 2026-08-25: todo
 * delta de arrasto passa lá por `novo = 0,2·entrada + 0,8·anterior`, e é
 * daí que vem o tato de que o dono gosta (item 102). O que NÃO se copia
 * é a sensibilidade — a deles é ~4,5× a nossa, e velocidade de giro
 * nunca foi a queixa.
 *
 * COM CORREÇÃO DE DELTA-TIME, e isto é nosso: o filtro deles é POR
 * QUADRO e portanto muda de tato com o fps (a 30 fps o giro deles
 * arrasta o dobro do tempo). Aqui o fator do quadro é
 * `0,8^(dt·60)` — a 60 fps dá exatamente 0,8, e a 30 fps dá 0,64, que é
 * 0,8 aplicado duas vezes. O tato passa a ser o mesmo em qualquer fps, e
 * isso importa porque o app é GPU-bound no M1 e vive perto de 40.
 */
export const SUAVIZACAO_DO_GIRO = 0.8;

/**
 * ONDE O GIRO MORRE, em radianos por quadro de 60 fps — abaixo disto o
 * resto é zerado DE VEZ, sem rastro. Sem este corte o exponencial nunca
 * chega a zero e a câmera fica com um tremor de float que só some no
 * denormal, e cada quadro reescreveria a pose por nada.
 *
 * 1e-4 rad são 0,0057° por quadro: um trigésimo do menor movimento que a
 * tela consegue mostrar (0,0022 rad = 1 px de arrasto). É o mesmo corte
 * do Eyes, na mesma unidade — também ele com a correção de delta-time,
 * porque o limiar é de VELOCIDADE, não de posição.
 */
export const GIRO_MORTO_RAD = 1e-4;

/**
 * O EIXO EM QUE O DEDO GIRA — a PORTA DE INSTRUMENTO `?giro=` (item 102,
 * P4), da espécie do `?dbgorbitas`: declarada no selo, NEUTRA no veredito
 * (não toca fotometria; diz de onde se olha), e viva só enquanto ele não
 * decide.
 *
 * `sol` é a lei desta casa desde sempre: a `volta` gira em torno da linha
 * alvo→Sol, e por isso o ângulo de iluminação da vista NÃO muda com o
 * arrasto horizontal (a conta está em `OrbitaDoVisitante`). `polo` é a lei
 * do NASA Eyes: a volta é em torno do POLO DO CORPO — turntable —, o
 * horizonte nunca vira, o polo nunca se cruza e o arrasto horizontal nunca
 * morre.
 *
 * A PORTA EXISTE PORQUE O PREÇO É DECISÃO DELE, não minha: girar a
 * longitude gira a SOMBRA junto, e a iluminação deixa de ser fixa na
 * vista. As duas leis são defensáveis e nenhuma régua de código escolhe
 * entre elas — o juiz é o vídeo A/B do MESMO arrasto nos dois lados, e só
 * um binário com os dois comportamentos filma esse vídeo.
 *
 * ELA MORRE NA ESCOLHA, e isto é promessa, não intenção: se ele ficar com
 * o polo, `polo` vira o único caminho e o ramo `sol` sai junto com a
 * porta; se recusar, o ramo `polo` sai inteiro. Porta de instrumento não
 * envelhece em produção — a jurisprudência é o `?calib=`, morto em 26/08
 * com tudo o que era só dele.
 */
export type EixoDoGiro = 'sol' | 'polo';

/** O default é a lei de sempre — quem não pede nada não muda um bit. */
export const EIXO_DO_GIRO_PADRAO: EixoDoGiro = 'sol';

/**
 * Lê a porta `?giro=`: só a palavra `polo` liga o instrumento. Ausente,
 * vazia, com lixo dentro ou em caixa errada caem TODAS no default — a
 * mesma lei de `lerPortaLuz`, e pelo mesmo motivo medido: a sabotagem de
 * 26/08 trocou um `?? 'padrao'` por `?? 'c1'` e passou por 2.360 testes e
 * pelo `tsc` sem uma queixa.
 */
export function lerPortaGiro(valor: string | null | undefined): EixoDoGiro {
  return valor === 'polo' ? 'polo' : EIXO_DO_GIRO_PADRAO;
}

/**
 * A TRAVA DA SUBIDA no eixo `polo`, em radianos de COLATITUDE — o quão
 * perto do polo do corpo o dedo pode levar a mira. É a régua do NASA Eyes
 * (lá a subida trava a ±(90° − 1e-4)) e ela SUBSTITUI `MIN_POLAR_RAD` no
 * caminho do dedo: o polo não se cruza, e é por não se cruzar que o
 * horizonte nunca faz flip no meio do gesto.
 *
 * POR QUE 1e-4 PODE SER TÃO PEQUENO ONDE 0,1 ERA PRECISO, e o número diz:
 * os 0,1 rad do grampo antigo compram `|up × z| = sen(0,1) = 0,0998`
 * porque lá o `up` é o polo BRUTO e é o produto vetorial do `lookAt` que
 * encolhe — quatro ordens acima do ruído de float32. Aqui o `up` do modo
 * é a componente do polo PERPENDICULAR à mira, então `|up × z|` vale 1
 * exato e não encolhe nunca; o que encolhe é o próprio `up` ANTES de
 * normalizar (norma `sen(1e-4)` = 1e-4), e essa conta roda em float64 —
 * doze ordens acima do ruído (2e-16), não quatro.
 */
export const COLATITUDE_MINIMA_RAD = 1e-4;

/**
 * Ângulo de volta em (−π, π] — periódico, então o número não cresce.
 *
 * MORAVA NO `atlasRig.ts`, privado, e desceu para cá em 26/08 (item 102,
 * P4) porque `orbitaQueProduz` passou a precisar dele: a longitude do eixo
 * `polo` sai de uma DIFERENÇA de dois `atan2`, que cabe em (−2π, 2π), e
 * entregá-la fora da faixa ao acumulador do rig abriria um degrau de uma
 * volta inteira na primeira soma. Duas cópias da mesma conta seriam a
 * segunda fonte de verdade que a regra 4 proíbe.
 */
export function enrolar(rad: number): number {
  if (!Number.isFinite(rad)) return 0;
  const volta = 2 * Math.PI;
  const r = rad - Math.floor(rad / volta + 0.5) * volta;
  // `floor` devolve −π quando o resto cai exatamente na borda; o
  // intervalo fechado à direita mantém a ida e a volta simétricas
  return r === -Math.PI ? Math.PI : r;
}

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
 * O `altura` É GRAMPEADO EM [0°, 180°] DE INCLINAÇÃO — `angulo = pino +
 * altura`, e o intervalo é o da esfera inteira (item 73, 22/08). Era
 * [0°, 70°]: o cone de `MAX_SOLAR_DEVIATION_GRAUS`, que é o que o dono
 * chamou de trava para ver o lado escuro. Com (inclinação, volta) =
 * ([0°, 180°], 360°) o par varre a esfera INTEIRA, e é isso que "órbita
 * livre" quer dizer.
 *
 * O PISO EM 0° fica, e não tira nada: com 360° de `volta` a inclinação
 * negativa é REDUNDANTE — `(−φ, ψ)` e `(φ, ψ+180°)` são a MESMA direção,
 * porque girar meia volta em torno de `u` espelha a inclinação. E
 * atravessar φ = 0 INVERTERIA a horizontal, porque do outro lado do eixo
 * o azimute corre ao contrário.
 *
 * OS DOIS POLOS DESTA PARAMETRIZAÇÃO estão na linha alvo→Sol (φ = 0 e
 * φ = 180°), e neles o arrasto horizontal estaciona: o efeito dele
 * escala com sen(φ). É propriedade herdada — o piso em 0° sempre teve
 * essa parada —, agora com uma segunda ocorrência na fase nova. Sair
 * dela é arrastar 5° na vertical.
 *
 * O ÚNICO limite que sobrou é o polar (`MIN_POLAR_RAD`), aplicado à
 * direção FINAL e só quando ela entra na calota — dentro da faixa a
 * direção volta intocada, bit a bit. A vista de repouso (`altura = 0`,
 * `volta = 0`) segue sendo o pino de 30° de sempre, bit a bit.
 *
 * COM A PORTA `?giro=polo` OS DOIS NÚMEROS MUDAM DE SIGNIFICADO, e é só
 * isso que muda: continuam sendo «o que o dedo somou na vertical e na
 * horizontal», mas passam a ser lidos como desvios de COLATITUDE e de
 * LONGITUDE no frame do polo do corpo, em vez de inclinação e volta em
 * torno da linha do Sol (ver `EixoDoGiro` e `direcaoNoPolo`). O REPOUSO
 * é o mesmo vetor nos dois eixos, bit a bit — é a condição de nascimento
 * do item 102 —, e com ele a `volta` deixa de preservar a fase: essa
 * troca é o PREÇO declarado da porta.
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
 * `OrbitaDoVisitante`): a `altura` soma ao pino e varre a INCLINAÇÃO de
 * 0° a 180° (a esfera inteira, item 73 — era o cone de 70°), e a `volta`
 * gira o resultado em torno da própria linha alvo→Sol.
 *
 * A ORDEM importa e é esta: inclina PRIMEIRO, gira DEPOIS. Girar antes
 * seria girar o eixo em torno de si mesmo (identidade) e o eixo novo
 * seria inerte.
 *
 * O GRAMPO POLAR vem por último, sobre a direção FINAL: é a direção que
 * chega ao `lookAt` que precisa ficar fora da calota, e a `volta` mexe
 * no ângulo ao polo (ela só preserva o ângulo ao SOL). Dentro da faixa
 * ele não toca em nada — é isso que mantém toda vista pinada bit a bit.
 */
const _linhaDoSol = new THREE.Vector3();
const _poloUnitario = new THREE.Vector3();
const _perpendicular = new THREE.Vector3();

/**
 * O grampo de `MIN_POLAR_RAD`: afasta `dir` do eixo `polo` até os dois
 * fazerem pelo menos esse ângulo, preservando o azimute. Pura, e usada
 * DOS DOIS LADOS do mesmo colapso — em `direcaoPrivilegiada` para a
 * mira não entrar na calota do polo, e em `upDoAtlas` para o `up` não
 * encostar na mira. É o mesmo `|a × b| = sen(ângulo)` nos dois casos.
 *
 * IDEMPOTENTE DENTRO DA FAIXA: fora da calota devolve `dir` sem escrever
 * um bit nele — a reconstrução esférica só acontece onde ela é
 * obrigatória, e é por isso que ela não pode mover nenhuma pose que já
 * era legal.
 */
function grampearNoPolo(dir: THREE.Vector3, polo: THREE.Vector3): THREE.Vector3 {
  _poloUnitario.copy(polo);
  if (_poloUnitario.lengthSq() < 1e-30) return dir;
  _poloUnitario.normalize();
  const cosseno = dir.dot(_poloUnitario);
  if (!Number.isFinite(cosseno)) return dir;
  const teto = Math.cos(MIN_POLAR_RAD);
  if (Math.abs(cosseno) <= teto) return dir;
  const alvo = cosseno > 0 ? MIN_POLAR_RAD : Math.PI - MIN_POLAR_RAD;
  // o AZIMUTE se preserva: o que muda é só a latitude
  _perpendicular.copy(dir).addScaledVector(_poloUnitario, -cosseno);
  if (_perpendicular.lengthSq() < 1e-24) {
    // direção EM CIMA do polo: não há azimute a preservar, e qualquer
    // perpendicular serve — a escolha é determinística
    _perpendicular.set(1, 0, 0).addScaledVector(_poloUnitario, -_poloUnitario.x);
    if (_perpendicular.lengthSq() < 1e-24) {
      _perpendicular.set(0, 1, 0).addScaledVector(_poloUnitario, -_poloUnitario.y);
    }
  }
  _perpendicular.normalize();
  return dir
    .copy(_poloUnitario)
    .multiplyScalar(Math.cos(alvo))
    .addScaledVector(_perpendicular, Math.sin(alvo));
}

export function direcaoPrivilegiada(
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  orbita: Readonly<OrbitaDoVisitante>,
  out: THREE.Vector3,
  eixo: EixoDoGiro = EIXO_DO_GIRO_PADRAO
): THREE.Vector3 {
  return eixo === 'polo'
    ? direcaoNoPolo(doSolAoAlvo, polo, orbita, out)
    : direcaoNaLinhaDoSol(doSolAoAlvo, polo, orbita, out);
}

/**
 * A LEI DE SEMPRE, intocada — o corpo que era o de `direcaoPrivilegiada`
 * antes de a porta `?giro=` existir, letra por letra. Ele continua sendo
 * o caminho do DEFAULT, e é por ser o MESMO TEXTO que o default é
 * bit-idêntico por construção em vez de por sorte.
 *
 * O eixo `polo` também passa por aqui, uma vez por chamada: é desta
 * função que sai a POSE DE REPOUSO de onde a parametrização nova nasce.
 */
function direcaoNaLinhaDoSol(
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
  const altura = Number.isFinite(orbita.altura) ? orbita.altura : 0;
  // a inclinação: 0 é a fase cheia (câmera na linha do Sol), 180° é o
  // lado escuro visto de trás. Ver `OrbitaDoVisitante` para por que o
  // piso é 0 e não −180°.
  const angulo = THREE.MathUtils.clamp(
    PHASE_OFFSET_GRAUS * GRAU + altura,
    0,
    Math.PI
  );
  const eixo = new THREE.Vector3().crossVectors(eixoSolar, polo);
  // alvo alinhado com o polo: qualquer perpendicular serve
  if (eixo.lengthSq() < 1e-12) {
    eixo.set(1, 0, 0).cross(eixoSolar);
    if (eixo.lengthSq() < 1e-12) eixo.set(0, 1, 0).cross(eixoSolar);
  }
  eixoSolar.applyAxisAngle(eixo.normalize(), angulo);
  const volta = Number.isFinite(orbita.volta) ? orbita.volta : 0;
  if (volta !== 0) eixoSolar.applyAxisAngle(_linhaDoSol, volta);
  return grampearNoPolo(eixoSolar, polo);
}

// ============================================================
// O GIRO NO POLO DO CORPO (item 102, P4) — tudo daqui até
// `faixaDaAltura` é INSTRUMENTO, atrás da porta `?giro=polo`. O caminho
// do default não passa por nenhuma destas linhas.
// ============================================================

const _zDoPolo = new THREE.Vector3();
const _xDoPolo = new THREE.Vector3();
const _yDoPolo = new THREE.Vector3();
const _solDoPolo = new THREE.Vector3();
const _perpDoPolo = new THREE.Vector3();
const _eixoDaSubida = new THREE.Vector3();
const _repousoDoPolo = new THREE.Vector3();
const _dirDoPolo = new THREE.Vector3();

/**
 * A BASE DO FRAME DO POLO, escrita nos rascunhos `_zDoPolo`/`_xDoPolo`/
 * `_yDoPolo`: `Z` é o polo do corpo, `X` é o MERIDIANO DO SOL (a
 * componente da linha alvo→Sol perpendicular ao polo, normalizada) e
 * `Y = Z × X`. Devolve `ψ`, o ângulo entre a linha alvo→Sol e o polo —
 * a única grandeza que o resto da conta ainda precisa dela.
 *
 * O MERIDIANO DO SOL É A ÂNCORA DE LONGITUDE, e não é decoração: sem uma
 * referência presa ao SOL a longitude de repouso andaria com o relógio
 * (o corpo orbita, e a linha do Sol gira em volta do polo dele), e o
 * ALVO VIVO — que recompõe o enquadramento a cada quadro — daria uma
 * guinada por tique da máquina do tempo. Com ela, a pose de repouso mora
 * no mesmo lugar em qualquer data, por construção.
 */
function baseDoPolo(doSolAoAlvo: THREE.Vector3, polo: THREE.Vector3): number {
  _solDoPolo.copy(doSolAoAlvo).negate();
  if (_solDoPolo.lengthSq() < 1e-30) _solDoPolo.set(0, 0, 1);
  _solDoPolo.normalize();
  _zDoPolo.copy(polo);
  if (_zDoPolo.lengthSq() < 1e-30) _zDoPolo.copy(POLO_ECLIPTICO);
  _zDoPolo.normalize();
  const cos = _solDoPolo.dot(_zDoPolo);
  _xDoPolo.copy(_solDoPolo).addScaledVector(_zDoPolo, -cos);
  const sen = _xDoPolo.length();
  if (sen < 1e-12) {
    // O SOL EM CIMA DO POLO (o eixo do corpo apontado para o Sol — Urano
    // perto do solstício): não há meridiano do Sol a apontar, e qualquer
    // perpendicular serve. A escolha é determinística, na mesma cascata
    // dos outros ramos degenerados desta casa.
    _xDoPolo.set(1, 0, 0).addScaledVector(_zDoPolo, -_zDoPolo.x);
    if (_xDoPolo.lengthSq() < 1e-24) {
      _xDoPolo.set(0, 1, 0).addScaledVector(_zDoPolo, -_zDoPolo.y);
    }
  }
  _xDoPolo.normalize();
  _yDoPolo.crossVectors(_zDoPolo, _xDoPolo);
  return Math.atan2(sen, cos);
}

/**
 * A COLATITUDE de `dir` no frame corrente, em [0, π] — 0 é o polo.
 *
 * Por `atan2` e NUNCA por `acos`, pelo mesmo motivo que `orbitaQueProduz`
 * já declara: perto dos dois polos o `acos` perde metade dos dígitos (o
 * erro vai com `√ε`), e é justamente ali que esta conta trabalha.
 */
function colatitudeNoPolo(dir: THREE.Vector3): number {
  const cos = dir.dot(_zDoPolo);
  _perpDoPolo.copy(dir).addScaledVector(_zDoPolo, -cos);
  return Math.atan2(_perpDoPolo.length(), cos);
}

/**
 * A DIREÇÃO NO EIXO `polo` — a volta em torno do polo do corpo
 * (turntable), a lei do NASA Eyes (item 102, P4).
 *
 * ELA NASCE DA POSE DE REPOUSO, e isso é a CONDIÇÃO DE NASCIMENTO do
 * item, não uma comodidade de implementação: a colatitude e a longitude
 * de partida saem da direção que a LEI ANTIGA escreve com o dedo parado
 * — o pino de `PHASE_OFFSET_GRAUS` de sempre, já grampeado. Com o dedo
 * parado NENHUMA das duas rotações abaixo roda, e o que volta é aquele
 * mesmo vetor, BIT A BIT: ligar a porta não move uma vista pinada.
 *
 * É POR ISSO QUE ELA GIRA `d₀` EM VEZ DE RECONSTRUIR A ESFERA. Escrever
 * `sen θ (cos λ X + sen λ Y) + cos θ Z` daria a mesma direção na
 * matemática e um punhado de ULPs de diferença no repouso — e o gate
 * mede md5, não matemática.
 *
 * A ÂNCORA `θ₀` SAI DO PRÓPRIO `d₀`, por `atan2`, e não da forma fechada
 * `|ψ − pino|`: as duas concordam onde a lei antiga não grampeia, mas
 * quando a pose de repouso cai dentro da calota de `MIN_POLAR_RAD` (o
 * polo do corpo a menos de 5,73° do pino de fase, alcançável num corpo
 * deitado) é o `d₀` grampeado que está na tela, e uma âncora que
 * discordasse dele daria um degrau ao primeiro toque.
 *
 * OS DOIS SINAIS SÃO NEGATIVOS, e é medida, não gosto:
 *
 *  · a `altura` sobe rumo ao polo, e subir é DESCER na colatitude —
 *    `θ = θ₀ − altura`. Derivando as duas leis no repouso, as duas dão
 *    `∂dir/∂altura = sen θ₀·Z − cos θ₀·X`, que é exatamente o `+cima` da
 *    base da câmera: o mesmo sinal que `addOrbitDelta` documenta e que a
 *    bancada cobra contra a matriz REAL.
 *  · a `volta` gira em `λ = λ₀ − volta`, porque a rotação em torno do
 *    polo corre ao contrário da rotação em torno da linha do Sol: a
 *    antiga dá `∂dir/∂volta = s × dir = −Y·sen(pino)`, e a nova, sem o
 *    sinal, daria `+Y·sen θ₀`. Trocar de eixo NÃO pode trocar o lado
 *    para onde o dedo empurra o planeta.
 *
 * A TRAVA (`COLATITUDE_MINIMA_RAD`) substitui `MIN_POLAR_RAD` no caminho
 * do dedo: o polo não se cruza, e é por não se cruzar que o horizonte
 * nunca faz flip no meio do gesto.
 */
function direcaoNoPolo(
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  orbita: Readonly<OrbitaDoVisitante>,
  out: THREE.Vector3
): THREE.Vector3 {
  direcaoNaLinhaDoSol(doSolAoAlvo, polo, ORBITA_PARADA, out);
  baseDoPolo(doSolAoAlvo, polo);
  const theta0 = colatitudeNoPolo(out);
  const altura = Number.isFinite(orbita.altura) ? orbita.altura : 0;
  const volta = Number.isFinite(orbita.volta) ? orbita.volta : 0;
  const theta = THREE.MathUtils.clamp(
    theta0 - altura,
    COLATITUDE_MINIMA_RAD,
    Math.PI - COLATITUDE_MINIMA_RAD
  );
  const passo = theta - theta0;
  if (passo !== 0) {
    // o eixo da SUBIDA é a normal do meridiano corrente: girar em torno
    // dele muda a colatitude e deixa a longitude exatamente onde está
    _eixoDaSubida.crossVectors(_zDoPolo, out);
    // mira EM CIMA do polo — só alcançável quando a pose de repouso já
    // nasce lá; o meridiano de referência é o do Sol, e girar em torno
    // de `Y` é andar dentro dele
    if (_eixoDaSubida.lengthSq() < 1e-24) _eixoDaSubida.copy(_yDoPolo);
    out.applyAxisAngle(_eixoDaSubida.normalize(), passo);
  }
  if (volta !== 0) out.applyAxisAngle(_zDoPolo, -volta);
  return out;
}

/**
 * A FAIXA EM QUE O ACUMULADOR `altura` AINDA MOVE A CÂMERA, no eixo
 * dado. O rig grampeia o acumulador nela para o dedo não somar arrasto
 * MORTO — a "borracha" de todo controle mal grampeado, em que a volta
 * custa desfazer o que nunca moveu nada. A lei é a que `consumirOGiro`
 * já declara; o que a porta muda é só ONDE ela cai.
 *
 * No eixo `sol` a faixa é geométrica e constante: a inclinação varre
 * [0°, 180°] e o pino de fase desloca a origem. No eixo `polo` ela
 * depende DO ALVO E DA DATA — o repouso mora na colatitude `θ₀`, e o que
 * sobra até a trava é `[θ₀ − π + trava, θ₀ − trava]`.
 */
export function faixaDaAltura(
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  eixo: EixoDoGiro = EIXO_DO_GIRO_PADRAO
): { min: number; max: number } {
  const pino = PHASE_OFFSET_GRAUS * GRAU;
  if (eixo !== 'polo') return { min: -pino, max: Math.PI - pino };
  direcaoNaLinhaDoSol(doSolAoAlvo, polo, ORBITA_PARADA, _repousoDoPolo);
  baseDoPolo(doSolAoAlvo, polo);
  const theta0 = colatitudeNoPolo(_repousoDoPolo);
  return {
    min: theta0 - Math.PI + COLATITUDE_MINIMA_RAD,
    max: theta0 - COLATITUDE_MINIMA_RAD,
  };
}

const _eixoDoGrampo = new THREE.Vector3();
const _azimute = new THREE.Vector3();
const _componentePerp = new THREE.Vector3();

/**
 * O CAMINHO DE VOLTA de `direcaoPrivilegiada`: dada uma direção
 * alvo→câmera, quais `(altura, volta)` a produzem contra ESTE eixo
 * solar e ESTE polo. Conta fechada, sem busca e sem iteração.
 *
 * PARA QUE ELA EXISTE (item 73, 22/08): o clique simples passou a
 * SELECIONAR sem mover a câmera. Trocar o alvo mantendo a câmera parada
 * é exatamente isto — a pose é a mesma no mundo, e o que muda é o
 * referencial em que ela se escreve. Sem a volta, "não mover a câmera"
 * teria de virar um segundo caminho de escrita da câmera, e aí haveria
 * duas leis para a mesma pose.
 *
 * A CONTA, e ela é a leitura da ida ao contrário:
 *
 *  · `direcaoPrivilegiada` inclina `s` (a linha alvo→Sol) por `ângulo =
 *    pino + altura` em torno de `e₀ = s × polo`, e depois gira o
 *    resultado em torno da PRÓPRIA `s` por `volta`. O segundo giro não
 *    muda o ângulo a `s`, então `ângulo = acos(dir·s)` — e daí a
 *    `altura`, que é `ângulo − pino`.
 *  · o azimute sai da base `{p₀ = e₀ × s, e₀}`, que é ortonormal e ⊥ a
 *    `s` (`s × p₀ = e₀`): a componente perpendicular de `dir` vale
 *    `sen(ângulo)·(p₀·cos volta + e₀·sen volta)`, logo
 *    `volta = atan2(dir·e₀, dir·p₀)`.
 *
 * O GRAMPO POLAR não atrapalha porque é IDEMPOTENTE: uma direção que
 * saiu de `direcaoPrivilegiada` já está fora da calota, e reaplicá-lo
 * não escreve um bit. Uma direção que entre AQUI dentro da calota volta
 * grampeada na ida — que é o comportamento certo, e a bancada o cobra.
 *
 * A `altura` sai na MESMA faixa que `addOrbitDelta` grampeia
 * (`[−pino, π − pino]`), então o arrasto seguinte continua de onde a
 * seleção parou, sem degrau escondido.
 */
export function orbitaQueProduz(
  dir: THREE.Vector3,
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  out: OrbitaDoVisitante,
  eixo: EixoDoGiro = EIXO_DO_GIRO_PADRAO
): OrbitaDoVisitante {
  return eixo === 'polo'
    ? orbitaNoPolo(dir, doSolAoAlvo, polo, out)
    : orbitaNaLinhaDoSol(dir, doSolAoAlvo, polo, out);
}

/**
 * O CAMINHO DE VOLTA no eixo `polo` — a inversa de `direcaoNoPolo`,
 * conta fechada, sem busca. É ela que faz o clique-preserva-pose
 * (`AtlasRig.selecionar`) e o portal do filme (`AtlasRig.pousar`)
 * continuarem escrevendo a MESMA pose no referencial novo com a porta
 * ligada — sem ela, ligar a porta faria a câmera saltar a cada seleção.
 *
 * `altura = θ₀ − θ` e `volta = λ₀ − λ`: a ida ao contrário, com os
 * mesmos dois sinais negativos e pelos mesmos dois motivos.
 *
 * A LONGITUDE VOLTA ENROLADA em (−π, π] porque ela sai de uma DIFERENÇA
 * de dois `atan2` e cabe em (−2π, 2π); o acumulador do rig enrola por
 * lei própria, e entregar-lhe um número fora da faixa abriria um degrau
 * de uma volta inteira na primeira soma.
 */
function orbitaNoPolo(
  dir: THREE.Vector3,
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  out: OrbitaDoVisitante
): OrbitaDoVisitante {
  out.altura = 0;
  out.volta = 0;
  if (dir.lengthSq() < 1e-30) return out;
  direcaoNaLinhaDoSol(doSolAoAlvo, polo, ORBITA_PARADA, _repousoDoPolo);
  baseDoPolo(doSolAoAlvo, polo);
  const theta0 = colatitudeNoPolo(_repousoDoPolo);
  const lambda0 = Math.atan2(
    _repousoDoPolo.dot(_yDoPolo),
    _repousoDoPolo.dot(_xDoPolo)
  );
  _dirDoPolo.copy(dir).normalize();
  // A TRAVA VALE NA VOLTA TAMBÉM: uma direção que entre aqui dentro da
  // calota volta travada na ida — que é o comportamento certo, e o mesmo
  // que a lei antiga faz com o grampo polar.
  const theta = THREE.MathUtils.clamp(
    colatitudeNoPolo(_dirDoPolo),
    COLATITUDE_MINIMA_RAD,
    Math.PI - COLATITUDE_MINIMA_RAD
  );
  const lambda = Math.atan2(_dirDoPolo.dot(_yDoPolo), _dirDoPolo.dot(_xDoPolo));
  out.altura = theta0 - theta;
  out.volta = enrolar(lambda0 - lambda);
  if (!Number.isFinite(out.altura)) out.altura = 0;
  if (!Number.isFinite(out.volta)) out.volta = 0;
  return out;
}

/** A LEI DE SEMPRE, intocada — ver `direcaoNaLinhaDoSol`. */
function orbitaNaLinhaDoSol(
  dir: THREE.Vector3,
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  out: OrbitaDoVisitante
): OrbitaDoVisitante {
  out.altura = 0;
  out.volta = 0;
  if (dir.lengthSq() < 1e-30) return out;
  _linhaDoSol.copy(doSolAoAlvo).negate();
  if (_linhaDoSol.lengthSq() < 1e-30) _linhaDoSol.set(0, 0, 1);
  _linhaDoSol.normalize();
  // a MESMA escolha de eixo da ida, inclusive os dois desempates do
  // caso degenerado (alvo alinhado com o polo)
  _eixoDoGrampo.crossVectors(_linhaDoSol, polo);
  if (_eixoDoGrampo.lengthSq() < 1e-12) {
    _eixoDoGrampo.set(1, 0, 0).cross(_linhaDoSol);
    if (_eixoDoGrampo.lengthSq() < 1e-12) {
      _eixoDoGrampo.set(0, 1, 0).cross(_linhaDoSol);
    }
  }
  if (_eixoDoGrampo.lengthSq() < 1e-30) return out;
  _eixoDoGrampo.normalize();
  _azimute.copy(_eixoDoGrampo).cross(_linhaDoSol).normalize();
  _perpendicular.copy(dir).normalize();
  // O ÂNGULO POR `atan2`, NUNCA POR `acos`, e o número diz por quê: perto
  // de 0 e de 180° o `acos` perde METADE dos dígitos (o erro vai com
  // `√ε`), e o que sobra vira deslocamento de câmera proporcional à
  // distância — medido, 1e-6 rad na abertura são 33 mil km de câmera
  // num gesto que promete não mover nada. `atan2(|perp|, paralelo)` tem
  // precisão cheia nos dois extremos.
  const cos = _perpendicular.dot(_linhaDoSol);
  _componentePerp.copy(_perpendicular).addScaledVector(_linhaDoSol, -cos);
  const angulo = Math.atan2(_componentePerp.length(), cos);
  const pino = PHASE_OFFSET_GRAUS * GRAU;
  out.altura = THREE.MathUtils.clamp(angulo - pino, -pino, Math.PI - pino);
  out.volta = Math.atan2(
    _componentePerp.dot(_eixoDoGrampo),
    _componentePerp.dot(_azimute)
  );
  if (!Number.isFinite(out.altura)) out.altura = 0;
  if (!Number.isFinite(out.volta)) out.volta = 0;
  return out;
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
  out: THREE.Vector3,
  eixo: EixoDoGiro = EIXO_DO_GIRO_PADRAO
): THREE.Vector3 {
  // snapshots ANTES de escrever em `out`: os chamadores da classe podem
  // passar o mesmo rascunho nos dois papéis (o padrão de `apply`)
  _solSnapshot.copy(doSolAoAlvo);
  _iluminada.copy(doSolAoAlvo).negate();
  const temSol = _iluminada.lengthSq() >= 1e-30;
  if (temSol) _iluminada.normalize();

  const solar = direcaoPrivilegiada(doSolAoAlvo, polo, orbita, out, eixo);
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
    return direcaoPrivilegiada(_solSnapshot, polo, orbita, out, eixo);
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
 * e o arrasto de dois eixos solto, a direção da câmera chega ao polo da
 * Terra — no cone de 70° de então ela já chegava a 0,44° dele, e desde
 * que a inclinação varre a esfera inteira (item 73) ela chega ao polo de
 * QUALQUER corpo, em qualquer data.
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
 *
 * ELA NÃO BASTA SOZINHA, e é por isso que `MIN_POLAR_RAD` existe: a
 * cedência só tem para onde ir quando o polo pedido NÃO é o da
 * eclíptica. No degrau "sistema" e no "órbita" o polo pedido É o da
 * eclíptica, e a mistura devolve ele mesmo; no degrau "lua" o polo da
 * Lua está a 1,5° do da eclíptica, e a mistura quase não move. Quem
 * garante o piso nesses casos é o grampo polar, que impede a mira de
 * entrar na calota — as duas guardas são complementares, não
 * redundantes.
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
 *
 * A CEDÊNCIA SOZINHA PODE PERSEGUIR A MIRA, e a varredura de
 * `atlasRig.test.ts` mediu isso quando o arrasto ficou livre (item 73):
 * o `up` cedido caminha pelo arco polo→eclíptica, e se a mira estiver
 * NESSE arco os dois se cruzam. Medido: com a mira a 20° do eixo da
 * Terra e no azimute da eclíptica, `cede` vale 0,83 e põe o `up` a 19,4°
 * do eixo — 0,6° da mira, que é o colapso que a cedência existe para
 * impedir. No cone de 70° o ponto era inalcançável (o piso medido era
 * 17,6°) e o defeito ficou latente.
 *
 * O FECHO é o MESMO grampo da direção, com os papéis trocados: o
 * `up` final é aparado para ficar a pelo menos `MIN_POLAR_RAD` da mira.
 * Dentro da faixa ele volta intocado, bit a bit — nenhuma vista de
 * repouso se move, e a cedência continua sendo quem decide o roll onde
 * há roll a decidir.
 *
 * NO EIXO `polo` (item 102, P4) E SÓ DENTRO DA FAIXA DA CEDÊNCIA, o `up`
 * passa a ser a componente do polo PERPENDICULAR À MIRA. Ele descreve
 * EXATAMENTE a mesma base de câmera que o polo bruto — o `lookAt` faz
 * `direita = up × z`, e a parte de `up` paralela a `z` não contribui um
 * dígito para esse produto —, escrita de um jeito que NÃO COLAPSA: com a
 * subida travada em `COLATITUDE_MINIMA_RAD` a mira nunca alcança o polo,
 * e `|up × z|` passa a valer 1 exato em vez de `sen(ângulo)`.
 *
 * FORA DA FAIXA O CAMINHO É O DE SEMPRE, letra por letra, e isso é a
 * metade da condição de nascimento que fala do `up`: onde a cedência era
 * ZERO (`smoothstep` abaixo do piso, que é onde toda vista de repouso
 * vive), ligar a porta não reescreve um bit. DENTRO da faixa a cedência
 * já reescrevia o `up` — é o que ela existe para fazer —, e é justamente
 * ela que dava o roll no meio do gesto que o P4 vem matar: a um décimo
 * de milirradiano do polo, `cede` vale 1 e o alto da tela pulava para o
 * polo da eclíptica com o alvo parado.
 */
export function upDoAtlas(
  dir: THREE.Vector3,
  polo: THREE.Vector3,
  out: THREE.Vector3,
  eixo: EixoDoGiro = EIXO_DO_GIRO_PADRAO
): THREE.Vector3 {
  const alinhamento = Math.abs(dir.dot(polo));
  if (eixo === 'polo' && alinhamento > Math.cos(CEDER_COMECA_GRAUS * GRAU)) {
    _upBruto.copy(polo).addScaledVector(dir, -dir.dot(polo));
    // mira EM CIMA do polo: inalcançável pelo dedo com a trava da
    // subida, mas o degrau "lua" chega por outro caminho (a mistura
    // calculada de `direcaoDaLua` não passa pela trava) — e lá o caminho
    // de sempre ainda responde
    if (_upBruto.lengthSq() >= 1e-24) return out.copy(_upBruto).normalize();
  }
  const cede = THREE.MathUtils.smoothstep(
    Number.isFinite(alinhamento) ? alinhamento : 1,
    Math.cos(CEDER_COMECA_GRAUS * GRAU),
    Math.cos(CEDER_TERMINA_GRAUS * GRAU)
  );
  _upBruto.copy(polo).lerp(POLO_ECLIPTICO, cede);
  // polo do corpo anti-paralelo ao da eclíptica no meio da mistura: o
  // lerp passa pelo vetor nulo e não há direção a normalizar
  if (_upBruto.lengthSq() < 1e-12) _upBruto.copy(POLO_ECLIPTICO);
  return grampearNoPolo(out.copy(_upBruto).normalize(), dir);
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
 * do SISTEMA INTEIRO continua a do retrato — o Sol segue no centro dela
 * (a esfera é centrada na origem, e é essa a promessa que importa), mas
 * o corpo que dá nome ao enquadramento não está mais onde estava. (Esta
 * esfera FOI a de abertura até 23/08; desde o item 61 ela é o teto do
 * zoom, e quem abre é a irmã abaixo.)
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

/**
 * A BORDA DO SISTEMA INTERNO — a esfera que o Atlas ENQUADRA AO ABRIR
 * desde o item 61 (a vista que o dono escolheu em 23/08: *"o sistema
 * interno com as linhas de órbita desenhadas"*).
 *
 * A IRMÃ DE CIMA NÃO PERDEU EMPREGO: a esfera do sistema INTEIRO
 * (`orbitaMaisExterna`) segue sendo o TETO do zoom (`AtlasRig.tetoDeZoom`)
 * e a fronteira do pouso (`Escada.alvoDoPouso`). O que ela deixou de ser
 * é a ABERTURA — e é por isso que o visitante continua podendo puxar a
 * roda para fora até ver o sistema todo, de onde o Atlas costumava nascer.
 *
 * POR QUE AQUI MARTE É PINADO e ali o "mais externo" é PERGUNTADO AO
 * DADO — a distinção é o que impede isto de ser a segunda fonte de
 * verdade que a nota de `orbitaMaisExterna` proíbe:
 *
 *  · «quem é o mais externo» é uma PERGUNTA, e a resposta troca com a
 *    data — Netuno e Plutão trocaram de lugar entre 1979 e 1999;
 *  · «onde acaba o sistema interno» é uma DEFINIÇÃO: os rochosos são
 *    Mercúrio, Vênus, Terra e Marte, e Marte é o de fora em QUALQUER
 *    data, porque o periélio dele (1,381 UA) fica fora do afélio da
 *    Terra (1,017 UA). A esfera da órbita de Marte centrada no Sol
 *    contém os outros três por construção e não por sorte — a MESMA
 *    promessa que `orbitaMaisExterna` faz para o sistema todo.
 *
 * SÓ O RAIO SAI DAQUI. A DIREÇÃO de onde a abertura olha continua saindo
 * do corpo mais externo, e o porquê está em `Escada.casaViva`.
 */
export const BORDA_DO_SISTEMA_INTERNO = {
  /** a chave da efeméride VIVA (`posicaoHeliocentrica`) — a abertura na
   *  época viva (F2b) lê o raio no instante pedido, como sempre leu.
   *  O `satisfies` é a amarra: a chave tem de existir no RETRATO, que é
   *  a mesma tabela de onde o `raio` abaixo sai e a mesma que alimenta
   *  `IDS_FOTOMETRIA`. Sem ela, uma string solta aqui só quebraria em
   *  runtime, e a vista de abertura é o pior lugar para descobrir isso. */
  id: 'mars' satisfies keyof typeof RETRATO_2026,
  /** e o raio do RETRATO congelado, o caminho SEM efeméride: ali não há
   *  linha de órbita nenhuma para desenhar (§6 de `orbitas.ts`), e o
   *  enquadramento é o que sobra de honesto */
  raio: RETRATO_2026.mars.rUA * AU_PARA_PC,
} as const;
