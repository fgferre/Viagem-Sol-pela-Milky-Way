// A MONTAGEM DO FILME SOLAR (item 210) — os cinco roteiros (o prólogo
// no Sol, o ato I dos mundos de pedra e os três atos de fora da v3)
// lidos pelo MESMO leitor do filme galáctico, com os pontos e os
// números nomeados calculados aqui a partir dos pinos (nada de
// coordenada copiada no JSON). Não constrói Journey: devolve planos,
// inícios, duração, apoios, o calendário dos dois relógios e o "cima";
// quem registra o filme é o objeto `Filme`.
import * as THREE from 'three';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../../../lib/atlas/frameGalactico';
import { AU_KM } from '../../../../lib/atlas/elementosOrbitais';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../lib/atlas/orientacao';
import { lerSequencia, type Shot } from '../../lerSequencia';
import { glide } from '../../movimentos';
import { montarApoiosDoRoteiro } from '../../apoiosDoRoteiro';
import { EZ } from '../../../world/baseGalactica';
import { RAIO_SOL_PC } from '../../../escala';
import { JD_A_SOLAR_TDB, JD2_SOLAR_TDB, PINOS_SOLAR, pino } from './pinos';
import prologo from '../../roteiros/solar/prologo.json';
import casa from '../../roteiros/solar/casa.json';
import jupiter from '../../roteiros/solar/jupiter.json';
import saturno from '../../roteiros/solar/saturno.json';
import afastamento from '../../roteiros/solar/afastamento.json';

const PC_POR_KM = AU_PARA_PC / AU_KM;
/** raio equatorial em pc, da fonte única BODY_AXES (a mesma do palco) */
export const raioPc = (id: string) => BODY_AXES[id][0] * PC_POR_KM;

const versor = (v: THREE.Vector3) => v.clone().normalize();
const rad = THREE.MathUtils.degToRad;
/** a direção a `graus` de `e`, girando para `f` (os dois ortonormais) */
const girar = (e: THREE.Vector3, f: THREE.Vector3, graus: number) =>
  e.clone().multiplyScalar(Math.cos(rad(graus))).addScaledVector(f, Math.sin(rad(graus))).normalize();
/** a componente de `v` perpendicular a `eixo`, normalizada */
const perpendicular = (v: THREE.Vector3, eixo: THREE.Vector3) =>
  versor(v.clone().addScaledVector(eixo, -v.dot(eixo)));
const ate = (de: THREE.Vector3, para: THREE.Vector3) => versor(para.clone().sub(de));

const SOL = pino('sun');
const MERCURIO = pino('mercury');
const VENUS = pino('venus');
const TERRA = pino('earth');
const LUA = pino('moon');
const JUPITER = pino('jupiter');
const IO = pino('io');
const SATURNO = pino('saturn');
const ENCELADO = pino('enceladus');
const HIPERION = pino('hyperion');

const R_MERCURIO = raioPc('mercury');
const R_VENUS = raioPc('venus');
const R_TERRA = raioPc('earth');
const R_LUA = raioPc('moon');
const R_JUPITER = raioPc('jupiter');
const R_IO = raioPc('io');
const R_SATURNO = raioPc('saturn');
const R_ENCELADO = raioPc('enceladus');
const R_HIPERION = raioPc('hyperion');
/** o polo norte da eclíptica na cena (equatorial J2000): o cima do filme */
const CIMA_DA_ECLIPTICA = new THREE.Vector3(...eclipticaParaEquatorial([0, 0, 1])).normalize();

// ================= PRÓLOGO — O FOGO =================
// O Sol é a origem. O Sol desenhado gira no Y da cena (`stellarBody.ts`,
// não pelo polo IAU), então as faixas de manchas ficam perto do plano
// y = 0; o +X da cena (o equinócio) está nesse plano E no da eclíptica.
// O voo sobe o meridiano da eclíptica que passa pelo +X, para o norte —
// o cima do filme —, e por isso o horizonte entra NIVELADO no alto do
// quadro sem rolar a câmera. A régua das fotos de 05/10 (`sol-de-perto`):
// a 2 raios com lente de 58° a rede fica nítida; com 25°, 2 raios é o
// limite; abaixo de 1,5 raio vira borrão — o voo não desce de 2 raios.
const R_SOL = RAIO_SOL_PC;
const EQUINOCIO = new THREE.Vector3(1, 0, 0);
/** a direção no meridiano do voo, `graus` ao norte da eclíptica */
const noMeridiano = (graus: number) => girar(EQUINOCIO, CIMA_DA_ECLIPTICA, graus);
/** o voo rasante: desce de 2,6 a 2,12 raios subindo o meridiano */
const VOO_DO_SOL = { de: -46, para: -10, raioDe: 2.6 * R_SOL, raioPara: 2.12 * R_SOL };
/** a mira do voo, na superfície: no começo o chão quase sob a câmera (a
 *  granulação enche o quadro); no fim o chão logo aquém do limbo, que
 *  fica no alto do quadro com a franja vermelha e a coroa */
const MIRA_DO_VOO_DO_SOL = { de: -39.5, para: 20.6 };
const FIM_DO_VOO_DO_SOL = noMeridiano(VOO_DO_SOL.para).multiplyScalar(VOO_DO_SOL.raioPara);
/** o recuo pousa aqui: o disco inteiro, visto do equador do Sol desenhado,
 *  a 5 raios (com a lente de 50°, o disco toma ~46% da altura do quadro e
 *  as manchas ainda se leem) */
const DISCO_DO_SOL = noMeridiano(0).multiplyScalar(5 * R_SOL);

// ================= ATO I — OS MUNDOS DE PEDRA =================
// A ordem na tela é Mercúrio → Vênus → Terra → Lua; a ordem AQUI é
// Terra → Mercúrio → Vênus porque o corte de Vênus para a Terra deriva
// do meio do caminho da chegada à Terra.
//
// A Terra e a Lua. O plano Sol–Terra–Lua: 0° é o lado do Sol, 90° é a
// Lua (no quarto minguante de JD_A). O voo baixo anda do dia para o
// terminador do lado OPOSTO à Lua; a subida volta por cima do lado do
// dia (a Terra cheia encolhendo) e gira até o lado da Lua, sempre
// olhando a Terra.
const SOL_NA_TERRA = versor(SOL.clone().sub(TERRA));
const LADO_DA_LUA = perpendicular(ate(TERRA, LUA), SOL_NA_TERRA);
const naTerra = (graus: number) => girar(SOL_NA_TERRA, LADO_DA_LUA, graus);
const noChao = (graus: number) => TERRA.clone().addScaledVector(naTerra(graus), R_TERRA);
const VOO = { de: 10, para: -45, raioDe: 1.45 * R_TERRA, raioPara: 1.35 * R_TERRA };
/** o olhar do voo: o chão 42° adiante, logo aquém do horizonte (42–46°) —
 *  44° abaixo do rumo, a frente; no fim o terminador (−90°) está no horizonte */
const ADIANTE = 42;
const FIM_DO_VOO = TERRA.clone().addScaledVector(naTerra(VOO.para), VOO.raioPara);
/**
 * O MEIO DO CAMINHO: onde a chegada à Terra começa, logo depois do corte
 * de Vênus (ver FIM_EM_VENUS), a esta distância da Terra, 5° para o lado
 * da Lua — fora da linha Sol–Terra para o giro do olhar do Sol à Terra
 * ter um plano (na linha os dois ficam opostos e o giro não tem lado).
 * A distância é a da chegada aprovada no prólogo de 05/10, quando a
 * partida do Sol ainda vinha direto para cá.
 */
const CHEGADA = { graus: 5, distancia: 0.267 * AU_PARA_PC };
const MEIO_DO_CAMINHO = TERRA.clone().addScaledVector(naTerra(CHEGADA.graus), CHEGADA.distancia);
/** a subida: um arco pelo lado do dia, de −45° a +45°, de 1,35 a 8 raios
 *  (com a Lua no quarto, a 90°, os +100° de antes passavam do terminador
 *  e a Terra encolhia como um crescente) */
const SUBIDA_DA_TERRA = { para: 45, raio: 8 * R_TERRA };
/** onde a Lua está no plano, vista da Terra, contando do Sol (90°: o quarto de JD_A) */
const LUA_NO_PLANO = THREE.MathUtils.radToDeg(SOL_NA_TERRA.angleTo(ate(TERRA, LUA)));
/**
 * A VISTA LATERAL EM ESCALA: da subida, a câmera recua em arco de volta
 * para o lado do Sol até 90° da linha Terra–Lua, a 38 raios — a Terra
 * com ~3° e a Lua a ~59° dela, as duas no quadro de 58° (deitadas na
 * largura): a distância real entre elas de uma vez. Com a Lua no quarto,
 * esse ponto é a linha Sol–Terra: a Terra cheia e a Lua a ~59° de fase.
 * Mais longe a Terra encolhe abaixo de ~13 px de raio e o ponto
 * fotométrico dela (magnitude ~−17) engole o disco: vira uma estrela branca.
 */
const LATERAL = { graus: LUA_NO_PLANO - 90, raio: 38 * R_TERRA };
const FIM_DA_LATERAL = TERRA.clone().addScaledVector(naTerra(LATERAL.graus), LATERAL.raio);
/** a mira do fim da lateral: o ponto da linha Terra–Lua que, visto de lá,
 *  cai perto do meio caminho angular entre as duas (a bissetriz divide a
 *  linha na razão dos lados, 38 : √(38² + 62,6²), a 34 % da Terra; os 36 %
 *  da geometria de 1º/01 deixam a mira ~1° fora dela) */
const ENTRE_A_TERRA_E_A_LUA = TERRA.clone().lerp(LUA, 0.36);
// Na Lua: θ conta a partir da direção da Terra, girando para o lado do
// Sol. No quarto de JD_A o Sol está a 90° da Terra vista da Lua (a Terra
// meia-acesa) e a face acesa vai de θ = 0° a 180°: a aproximação desce
// da vista lateral até o começo do raspão, em θ = 104°, e o joelho fica
// em θ = 110°, a 1,4 raio — sobre o lado aceso, mas com o Sol alto (~70°),
// sem as sombras longas da geometria de 1º/01. O próximo trecho refaz
// este ato (o nascer da Terra) para o instante novo.
const TERRA_NA_LUA = ate(LUA, TERRA);
const LADO_DO_SOL_NA_LUA = perpendicular(ate(LUA, SOL), TERRA_NA_LUA);
const naLua = (graus: number) => girar(TERRA_NA_LUA, LADO_DO_SOL_NA_LUA, graus);
const NASCER_DA_TERRA = { nascer: 104, dNascer: 1.55, joelho: 110, dJoelho: 1.4, chao: 104, abaixo: 30 };
/** onde a aproximação pousa e o raspão começa: contornando o limbo até
 *  1,55 raio, logo além dele visto da Terra, com o horizonte lunar por
 *  baixo do quadro */
const NASCER = LUA.clone().addScaledVector(naLua(NASCER_DA_TERRA.nascer), NASCER_DA_TERRA.dNascer * R_LUA);
const JOELHO_DA_LUA = naLua(NASCER_DA_TERRA.joelho);
/** a mira do começo do raspão: a direção da Terra baixada 30° para o
 *  centro da Lua, vista dali — o limbo entra por baixo e a Terra (de lá,
 *  meia-acesa) fica acima do quadro; ponto distante, quase uma direção */
const VISADA_DO_NASCER = girar(
  ate(NASCER, TERRA), perpendicular(ate(NASCER, LUA), ate(NASCER, TERRA)), NASCER_DA_TERRA.abaixo
);
const MIRA_DO_NASCER = NASCER.clone().addScaledVector(VISADA_DO_NASCER, 1e4 * R_LUA);
/** o chão que passa: para onde o olhar desce no joelho (aquém dele, aceso) */
const CHAO_DA_LUA = LUA.clone().addScaledVector(naLua(NASCER_DA_TERRA.chao), R_LUA);
/** o raspão da Lua entrega o voo na direção de Júpiter */
const SAIDA_DA_LUA = LUA.clone().addScaledVector(ate(LUA, JUPITER), 60 * R_LUA);
/**
 * O ROLAMENTO DO NASCER DA TERRA: o cima do filme é o polo da eclíptica,
 * e a Lua passa pelo lado do Sol — no plano da eclíptica, ao LADO da
 * visada. Para o limbo entrar por BAIXO do quadro, a câmera rola até o
 * seu cima apontar para fora da Lua (o zênite local), medido no nascer.
 * Sinal do `camera.rotateZ` do rig: o cima novo é cima·cos r − direita·sin r,
 * com direita = visada × cima.
 */
const ROLAMENTO_DA_LUA = (() => {
  const cima = perpendicular(CIMA_DA_ECLIPTICA, VISADA_DO_NASCER);
  const direita = new THREE.Vector3().crossVectors(VISADA_DO_NASCER, cima);
  const zenite = perpendicular(ate(LUA, NASCER), VISADA_DO_NASCER);
  return Math.atan2(-zenite.dot(direita), zenite.dot(cima));
})();

// Mercúrio e Vênus. Em JD_A os dois estão do OUTRO lado do Sol em
// relação à Terra (Mercúrio a 158°, Vênus a 177°: a quatro dias da
// conjunção superior), então quem vem do Sol os encontra acesos de
// frente. De Vênus à Terra a linha reta passa a 4,7 raios do Sol: ali
// a travessia vira CORTE (ver FIM_EM_VENUS).
//
// Mercúrio: S aponta o Sol, N é o norte da eclíptica (o cima do filme)
// tirado de S, e o lado de Vênus fecha o trio. O raspão desce pelo
// lado do dia até 1,35 raio a 35°N, 4° aquém do terminador, onde o Sol
// está a ~3° do horizonte. Olhando o meridiano para o norte (o polo do
// próprio hemisfério), o horizonte entra NIVELADO sem rolar a câmera: o
// cima é o norte, o zênite local está no mesmo meridiano e o olhar fica
// perpendicular ao polo (no hemisfério sul, olhar para o norte e para
// baixo aponta a ~17° do polo, e o rig troca o cima pelo de visada
// "de face": o horizonte tomba). A luz vem de lado (o Sol a oeste, no
// horizonte), as sombras se alongam, e o terminador corre ao lado, a
// leste, até o limbo.
const SOL_EM_MERCURIO = ate(MERCURIO, SOL);
const RUMO_DE_VENUS = ate(MERCURIO, VENUS);
const NORTE_EM_MERCURIO = perpendicular(CIMA_DA_ECLIPTICA, SOL_EM_MERCURIO);
const LADO_DE_VENUS = (() => {
  const w = new THREE.Vector3().crossVectors(NORTE_EM_MERCURIO, SOL_EM_MERCURIO);
  return w.dot(RUMO_DE_VENUS) > 0 ? w : w.negate();
})();
/** a direção, do centro de Mercúrio, a `graus` do Sol para o lado de
 *  Vênus e a `norte` graus de latitude (eclíptica) */
const emMercurio = (graus: number, norte = 0) => versor(
  girar(SOL_EM_MERCURIO, LADO_DE_VENUS, graus).multiplyScalar(Math.cos(rad(norte)))
    .addScaledVector(NORTE_EM_MERCURIO, Math.sin(rad(norte)))
);
/**
 * O MEIO DO CAMINHO DE MERCÚRIO: onde a partida do Sol entrega à chegada,
 * 5° fora da linha Sol–Mercúrio (o giro do olhar do Sol a Mercúrio tem
 * de ter um plano), do lado de Vênus. A distância é a que iguala a
 * velocidade da partida (`quadratic`, 9 s) à da chegada (`settle`, 6 s)
 * na junta — conferida em montar.test.ts.
 */
const CHEGADA_A_MERCURIO = { graus: 5, distancia: 0.0905 * AU_PARA_PC };
const MEIO_DE_MERCURIO = MERCURIO.clone()
  .addScaledVector(emMercurio(CHEGADA_A_MERCURIO.graus), CHEGADA_A_MERCURIO.distancia);
const RASPAO_DE_MERCURIO = { inicio: 10, raioDoInicio: 6, joelho: 86, norte: 35, raio: 1.35, chao: 19, saida: 20 };
/** onde a chegada pousa e o raspão começa: Mercúrio cheio, a 6 raios */
const INICIO_DO_RASPAO_DE_MERCURIO = MERCURIO.clone().addScaledVector(
  emMercurio(RASPAO_DE_MERCURIO.inicio), RASPAO_DE_MERCURIO.raioDoInicio * R_MERCURIO
);
const JOELHO_DE_MERCURIO = emMercurio(RASPAO_DE_MERCURIO.joelho, RASPAO_DE_MERCURIO.norte);
/** o chão que o olhar segura no joelho: o mesmo meridiano, 19° ao norte
 *  (o olhar ~55° abaixo do horizonte local, o limbo no terço de cima) */
const CHAO_DE_MERCURIO = MERCURIO.clone().addScaledVector(
  emMercurio(RASPAO_DE_MERCURIO.joelho, RASPAO_DE_MERCURIO.norte + RASPAO_DE_MERCURIO.chao), R_MERCURIO
);
/** o raspão entrega o voo na direção de Vênus */
const SAIDA_DE_MERCURIO = MERCURIO.clone().addScaledVector(RUMO_DE_VENUS, RASPAO_DE_MERCURIO.saida * R_MERCURIO);

// Vênus: o plano do Sol e de quem chega de Mercúrio (a 31° do Sol, vista
// de Vênus: ela chega quase cheia). A travessia pousa a 7 raios, a 40°
// do Sol; a passagem varre o lado do dia, desce a 2,4 raios a 18° e
// acaba a 3 raios do lado do Sol, onde o corte a recolhe.
const SOL_EM_VENUS = ate(VENUS, SOL);
const LADO_DE_MERCURIO = perpendicular(ate(VENUS, SAIDA_DE_MERCURIO), SOL_EM_VENUS);
const PASSAGEM_POR_VENUS = { chegada: 40, raioDaChegada: 7, joelho: 18, raio: 2.4, raioDoFim: 3 };
const CHEGADA_A_VENUS = VENUS.clone().addScaledVector(
  girar(SOL_EM_VENUS, LADO_DE_MERCURIO, PASSAGEM_POR_VENUS.chegada),
  PASSAGEM_POR_VENUS.raioDaChegada * R_VENUS
);
const JOELHO_DE_VENUS = girar(SOL_EM_VENUS, LADO_DE_MERCURIO, PASSAGEM_POR_VENUS.joelho);
/**
 * O CORTE DE VÊNUS PARA A TERRA. A travessia contínua passaria a 4,7
 * raios do Sol a quase 1 UA/s — um clarão de dois quadros. Então a
 * passagem acaba olhando Vênus pela MESMA direção com que a chegada à
 * Terra começa olhando o Sol (do meio do caminho): no corte o olhar não
 * gira (a mola da junta do rig não tem o que absorver), a lente é a
 * mesma, e o disco branco de Vênus dá lugar ao Sol no mesmo ponto do
 * quadro. A câmera fica do lado do Sol, com Vênus a ~3° de fase: cheia.
 */
const OLHAR_DO_CORTE = ate(MEIO_DO_CAMINHO, SOL);
const FIM_EM_VENUS = VENUS.clone().addScaledVector(OLHAR_DO_CORTE, -PASSAGEM_POR_VENUS.raioDoFim * R_VENUS);

// ================= ATO II — JÚPITER =================
// O plano da órbita: W é o lado do Sol perpendicular ao rumo de Saturno;
// o Sol está a 42°, Saturno a 90° e Io, no céu de JD2, a 151° (110° do
// ponto subsolar: acesa). A chegada vem pelo lado do dia (100°); o
// raspão passa por FORA de Io com Júpiter inteiro ao lado dela; a saída
// sobe a 142° (fase 100°: Júpiter meia-lua, o Sol no quadro ao lado), e
// o arco desce pelo lado do dia até 57° (fase 15°: giboso, as bandas),
// de onde o rumo de Saturno está a 33°: Saturno fica ~147° atrás de
// Júpiter, e o fim do arco vira o olhar para ele antes da travessia.
const RUMO_DE_SATURNO = ate(JUPITER, SATURNO);
const W_JUPITER = perpendicular(ate(JUPITER, SOL), RUMO_DE_SATURNO);
const emJupiter = (graus: number) => girar(W_JUPITER, RUMO_DE_SATURNO, graus);
const ARCO = { de: 142, para: 57, raioDe: 10 * R_JUPITER, raioPara: 3.5 * R_JUPITER };
const CHEGADA_A_JUPITER = JUPITER.clone().addScaledVector(emJupiter(100), 12 * R_JUPITER);
const INICIO_DO_ARCO = JUPITER.clone().addScaledVector(emJupiter(ARCO.de), ARCO.raioDe);
const FIM_DO_ARCO = JUPITER.clone().addScaledVector(emJupiter(ARCO.para), ARCO.raioPara);
/** Io acesa com Júpiter INTEIRO ao lado: no joelho a câmera vê Io a 60° de
 *  fase, do lado de fora da órbita (no plano Sol–Io–Júpiter), e Júpiter
 *  a ~50° do centro de Io — fora do disco dela */
const SOL_EM_IO = ate(IO, SOL);
const JOELHO_DE_IO = girar(SOL_EM_IO, perpendicular(ate(JUPITER, IO), SOL_EM_IO), 60);
/** a mira do raspão: um ponto colado em Io, do lado de Júpiter, que no
 *  joelho cai a meio caminho angular entre os dois (triângulo isósceles) */
const MIRA_DE_IO = IO.clone().addScaledVector(ate(IO, JUPITER), 2.6 * R_IO);
/** a mira do começo do arco: a meio caminho entre Júpiter e o Sol, vistos
 *  de lá — os dois no quadro; ponto distante, quase uma direção */
const ENTRE_O_SOL_E_JUPITER = INICIO_DO_ARCO.clone().addScaledVector(
  versor(ate(INICIO_DO_ARCO, SOL).add(ate(INICIO_DO_ARCO, JUPITER))), 1000 * R_JUPITER
);

// ================= ATO III — SATURNO =================
// Referencial dos anéis: E aponta o Sol no plano do anel, P é o polo;
// a face acesa dos anéis é a SUL (o Sol está 3,6° abaixo do plano).
const POLO_DE_SATURNO = new THREE.Vector3(
  ...baseCorpoEquatorial(IAU_ORIENTATIONS.saturn, JD2_SOLAR_TDB).polo
);
const E_SATURNO = perpendicular(ate(SATURNO, SOL), POLO_DE_SATURNO);
const F_SATURNO = new THREE.Vector3().crossVectors(POLO_DE_SATURNO, E_SATURNO);
/** ponto em raios de Saturno: raio no plano, azimute (0° = Sol), altura */
const emSaturno = (raio: number, azGraus: number, altura: number) => SATURNO.clone()
  .addScaledVector(girar(E_SATURNO, F_SATURNO, azGraus), raio * R_SATURNO)
  .addScaledVector(POLO_DE_SATURNO, altura * R_SATURNO);
/** o mesmo, por distância, azimute e elevação (negativa = face sul, acesa) */
const vistaDeSaturno = (d: number, azGraus: number, elevGraus: number) =>
  emSaturno(d * Math.cos(rad(elevGraus)), azGraus, d * Math.sin(rad(elevGraus)));
const azimute = (p: THREE.Vector3) => {
  const v = p.clone().sub(SATURNO);
  return THREE.MathUtils.radToDeg(Math.atan2(v.dot(F_SATURNO), v.dot(E_SATURNO)));
};
const AZ_CHEGADA = azimute(JUPITER);
const AZ_ENCELADO = azimute(ENCELADO);
/** o sentido em que o rasante gira: do lado de Júpiter para o de Encélado */
const GIRO = Math.sign(((AZ_ENCELADO - AZ_CHEGADA + 540) % 360) - 180);
const az = (graus: number) => AZ_CHEGADA + GIRO * graus;
/** o raio do anel desenhado (até o F), em raios de Saturno */
export const RAIO_DOS_ANEIS = 2.326;
/** o cruzamento declarado do plano: na divisão de Cassini (1,95–2,03) */
export const RAIO_DO_CRUZAMENTO = 1.99;
const CHEGADA_A_SATURNO = emSaturno(14, az(0), -14 * Math.sin(rad(2)));
const SOBRE_O_ANEL_A = emSaturno(2.25, az(60), -0.04);
const RASANTE = emSaturno(2.1, az(68), -0.025);
const CRUZAMENTO = emSaturno(RAIO_DO_CRUZAMENTO, az(76), 0);
const ALEM_DO_CRUZAMENTO = emSaturno(2.02, az(84), 0.04);
const SUBIDA = emSaturno(2.8, az(100), 0.6);
/** Encélado pelo lado do DIA: a câmera vem da subida (Encélado a ~60° de
 *  fase), cruza a linha do Sol e no joelho o vê a 30° de fase, 12° ao sul
 *  do equador (o polo sul e os jatos no limbo, acesos de lado); depois do
 *  joelho segue girando para o lado da noite (fase 115°) */
const SOL_EM_ENCELADO = ate(ENCELADO, SOL);
const LADO_DA_SUBIDA = perpendicular(ate(ENCELADO, SUBIDA), SOL_EM_ENCELADO);
/** a direção a `fase` graus do Sol, do lado oposto ao da subida, `sul` graus abaixo do equador */
const naNoiteDeEncelado = (fase: number, sul: number) => versor(
  girar(SOL_EM_ENCELADO, LADO_DA_SUBIDA, -fase).addScaledVector(POLO_DE_SATURNO, -Math.tan(rad(sul)))
);
const JOELHO_DE_ENCELADO = naNoiteDeEncelado(30, 12);
const DEPOIS_DE_ENCELADO = ENCELADO.clone().addScaledVector(naNoiteDeEncelado(115, 10), 14 * R_ENCELADO);
/** o acento traseiro: recuando até a fase 165° e só até 25 raios (a 40 a
 *  lua saía com ~16 px de raio), o crescente com as plumas em contraluz,
 *  ~26 px de raio, e o Sol a ~15° dele, no quadro (a foto da Cassini) */
const SAIDA_DE_ENCELADO = ENCELADO.clone().addScaledVector(naNoiteDeEncelado(165, 6), 25 * R_ENCELADO);
/** o cartão-postal: pela face acesa (sul), do lado do Sol em que Hipérion
 *  está, perto do Sol (fase 35–60°): o anel aberto 22–24° à câmera, a
 *  sombra do planeta no anel ao lado do globo, sem engolir o anel */
const LADO_DO_POSTAL = Math.sign(azimute(HIPERION)) || 1;
const POSTAL_1 = vistaDeSaturno(10, LADO_DO_POSTAL * 35, -22);
const POSTAL_2 = vistaDeSaturno(10.5, LADO_DO_POSTAL * 60, -24);
/** Hipérion de passagem pelo lado do Sol (fase ~45°, acesa) */
const SOL_EM_HIPERION = ate(HIPERION, SOL);
const JOELHO_DE_HIPERION = girar(
  SOL_EM_HIPERION, perpendicular(ate(HIPERION, SAIDA_DE_ENCELADO), SOL_EM_HIPERION), 45
);

// ================= ATO IV — O AFASTAMENTO =================
// Tudo se alinha por uma direção G do PLANO GALÁCTICO: o fecho recua do
// Sol por ela olhando o Sol, então a faixa da Via Láctea atravessa o
// quadro passando por ele. G fica a 90° da Terra (vista do Sol), para o
// ponto azul pálido sair o mais longe possível do clarão, do lado de
// Saturno. A saída recua de Saturno em linha reta pelo lado do dia (o
// mesmo rumo do fim do postal) até 0,3 UA; daí o cruzeiro abre até
// 38,5 UA por G, e Saturno e o Sol vão se juntando no quadro.
const UA = AU_PARA_PC;
const G_DO_AFASTAMENTO = (() => {
  const g = versor(new THREE.Vector3().crossVectors(EZ, versor(TERRA)));
  return g.dot(SATURNO) > 0 ? g : g.negate();
})();
const SAIDA_DE_SATURNO = SATURNO.clone().addScaledVector(ate(SATURNO, POSTAL_2), 0.3 * UA);
export const D_INICIO_DA_TRASEIRA_UA = 38.5;
export const D_FIM_DA_TRASEIRA_UA = 41;
const AFASTAMENTO = G_DO_AFASTAMENTO.clone().multiplyScalar(D_INICIO_DA_TRASEIRA_UA * UA);
const PONTO_AZUL = G_DO_AFASTAMENTO.clone().multiplyScalar(D_FIM_DA_TRASEIRA_UA * UA);
/** onde o fecho pousa, em pc do Sol, no mesmo rumo: a 1 pc o Sol tem
 *  magnitude −0,2 — uma estrela entre as mais brilhantes, não um disco */
export const D_DO_FECHO_PC = 1;
const ENTRE_ESTRELAS = G_DO_AFASTAMENTO.clone().multiplyScalar(D_DO_FECHO_PC);

/** os pontos nomeados dos cinco roteiros, em pc */
const PONTOS: Readonly<Record<string, THREE.Vector3>> = {
  Sol: SOL, Mercurio: MERCURIO, Venus: VENUS, Terra: TERRA, Lua: LUA, Jupiter: JUPITER, Io: IO,
  Saturno: SATURNO, Encelado: ENCELADO, Hiperion: HIPERION,
  vooDoSolDe: noMeridiano(VOO_DO_SOL.de), vooDoSolPara: noMeridiano(VOO_DO_SOL.para),
  miraDoVooDoSolDe: noMeridiano(MIRA_DO_VOO_DO_SOL.de).multiplyScalar(R_SOL),
  miraDoVooDoSolPara: noMeridiano(MIRA_DO_VOO_DO_SOL.para).multiplyScalar(R_SOL),
  fimDoVooDoSol: FIM_DO_VOO_DO_SOL, discoDoSol: DISCO_DO_SOL,
  meioDeMercurio: MEIO_DE_MERCURIO, inicioDoRaspaoDeMercurio: INICIO_DO_RASPAO_DE_MERCURIO,
  joelhoDeMercurio: JOELHO_DE_MERCURIO, chaoDeMercurio: CHAO_DE_MERCURIO,
  saidaDeMercurio: SAIDA_DE_MERCURIO,
  chegadaAVenus: CHEGADA_A_VENUS, joelhoDeVenus: JOELHO_DE_VENUS, fimEmVenus: FIM_EM_VENUS,
  meioDoCaminho: MEIO_DO_CAMINHO,
  inicioDoVoo: TERRA.clone().addScaledVector(naTerra(VOO.de), VOO.raioDe),
  vooDe: naTerra(VOO.de), vooPara: naTerra(VOO.para),
  adianteNoInicio: noChao(VOO.de - ADIANTE), adianteNoFim: noChao(VOO.para - ADIANTE),
  fimDoVoo: FIM_DO_VOO,
  subidaDe: naTerra(VOO.para), subidaPara: naTerra(SUBIDA_DA_TERRA.para),
  lateralPara: naTerra(LATERAL.graus), fimDaLateral: FIM_DA_LATERAL,
  entreATerraEALua: ENTRE_A_TERRA_E_A_LUA,
  joelhoDaLua: JOELHO_DA_LUA, chaoDaLua: CHAO_DA_LUA,
  nascer: NASCER, miraDoNascer: MIRA_DO_NASCER,
  saidaDaLua: SAIDA_DA_LUA,
  chegadaAJupiter: CHEGADA_A_JUPITER, joelhoDeIo: JOELHO_DE_IO, miraDeIo: MIRA_DE_IO,
  inicioDoArco: INICIO_DO_ARCO, fimDoArco: FIM_DO_ARCO,
  arcoDe: emJupiter(ARCO.de), arcoPara: emJupiter(ARCO.para),
  entreOSolEJupiter: ENTRE_O_SOL_E_JUPITER,
  chegadaASaturno: CHEGADA_A_SATURNO, sobreOAnelA: SOBRE_O_ANEL_A, rasante: RASANTE,
  cruzamento: CRUZAMENTO, alemDoCruzamento: ALEM_DO_CRUZAMENTO, subida: SUBIDA,
  joelhoDeEncelado: JOELHO_DE_ENCELADO, depoisDeEncelado: DEPOIS_DE_ENCELADO,
  saidaDeEncelado: SAIDA_DE_ENCELADO, joelhoDeHiperion: JOELHO_DE_HIPERION,
  postal1: POSTAL_1, postal2: POSTAL_2,
  postalDe: ate(SATURNO, POSTAL_1), postalPara: ate(SATURNO, POSTAL_2),
  saidaDeSaturno: SAIDA_DE_SATURNO, afastamento: AFASTAMENTO, pontoAzul: PONTO_AZUL,
  entreEstrelas: ENTRE_ESTRELAS,
};

/** os números nomeados: distâncias em pc; o rolamento em radianos */
const NUMEROS: Readonly<Record<string, number>> = {
  raioDoVooDoSolDe: VOO_DO_SOL.raioDe, raioDoVooDoSolPara: VOO_DO_SOL.raioPara,
  raspaoDeMercurio: RASPAO_DE_MERCURIO.raio * R_MERCURIO,
  raspaoDeVenus: PASSAGEM_POR_VENUS.raio * R_VENUS,
  raioDoVooDe: VOO.raioDe, raioDoVooPara: VOO.raioPara,
  raioDaSubidaDe: VOO.raioPara, raioDaSubidaPara: SUBIDA_DA_TERRA.raio,
  raioDaLateral: LATERAL.raio,
  raspaoDaLua: NASCER_DA_TERRA.dJoelho * R_LUA, rolamentoDaLua: ROLAMENTO_DA_LUA,
  raspaoDeIo: 2.6 * R_IO,
  raioDoArcoDe: ARCO.raioDe, raioDoArcoPara: ARCO.raioPara,
  raspaoDeEncelado: 3.5 * R_ENCELADO, raspaoDeHiperion: 3 * R_HIPERION,
  raioDoPostalDe: POSTAL_1.distanceTo(SATURNO), raioDoPostalPara: POSTAL_2.distanceTo(SATURNO),
};

export interface FilmeSolarMontado {
  shots: Shot[];
  starts: number[];
  duracao: number;
  apoios: ReturnType<typeof montarApoiosDoRoteiro>;
  pinos: typeof PINOS_SOLAR;
  /** o instante dos atos de fora (= jd2), de que o filme é retrato */
  jd: number;
  /** o céu do prólogo e do ato I (Sol, Mercúrio, Vênus, Terra, Lua) */
  jdA: number;
  /** o céu dos atos de fora (Júpiter, Saturno, afastamento) */
  jd2: number;
  /** onde o céu começa a passar de jdA a jd2, em segundos do corte */
  tTroca: number;
  /** quanto dura a passagem de jdA a jd2, em segundos do corte */
  duracaoDaTroca: number;
  /** a data do céu (JD TDB) em cada segundo do corte */
  jdDoFilme(t: number): number;
  /** o "cima" da câmera: o polo norte da eclíptica na cena (equatorial J2000) */
  cima: THREE.Vector3;
  /** quantos planos cada roteiro (ato) deu, na ordem prólogo → afastamento */
  planosPorAto: number[];
}

/** a rampa do céu de JD_A para JD2, em segundos (ver `tTroca`) */
const DURACAO_DA_TROCA = 1.5;

export function montarFilmeSolar(): FilmeSolarMontado {
  const atos = [prologo, casa, jupiter, saturno, afastamento].map((dado) =>
    lerSequencia(dado, PONTOS, NUMEROS));
  const shots = atos.flat();
  const starts: number[] = [];
  let acc = 0;
  for (const s of shots) {
    starts.push(acc);
    acc += s.dur;
  }
  /**
   * A TROCA DE RELÓGIO (JD_A → JD2), em segundos do corte. Entre os dois
   * céus há nove dias e Júpiter anda 0,068 UA: visto da Lua (4,23 UA)
   * são 0,95° — num degrau, um pulo de ~11 px do ponto que a câmera
   * mira; e dentro da travessia, que em 1 s já está a 1,6 UA de Júpiter,
   * seriam vários graus. Por isso a troca é uma RAMPA (`glide`, a de todo
   * gesto do filme) nos últimos `DURACAO_DA_TROCA` segundos do raspão da
   * Lua, quando o olhar já virou para Júpiter e a câmera ainda está a
   * 4,23 UA dele: Júpiter escorrega 0,95° a ~0,03° por quadro de 1/30 s,
   * e a travessia começa inteira em JD2, com Júpiter no pino. Terra e
   * Lua, que giram nove vezes na rampa, estão a 60° ou mais da visada,
   * fora do quadro (montar.test.ts confere as três coisas).
   */
  const fimDaTroca = starts[atos[0].length + atos[1].length];
  const tTroca = fimDaTroca - DURACAO_DA_TROCA;
  return {
    shots,
    starts,
    duracao: acc,
    apoios: montarApoiosDoRoteiro(shots, starts),
    pinos: PINOS_SOLAR,
    jd: JD2_SOLAR_TDB,
    jdA: JD_A_SOLAR_TDB,
    jd2: JD2_SOLAR_TDB,
    tTroca,
    duracaoDaTroca: DURACAO_DA_TROCA,
    jdDoFilme: (t) => {
      if (t <= tTroca) return JD_A_SOLAR_TDB;
      if (t >= fimDaTroca) return JD2_SOLAR_TDB;
      return JD_A_SOLAR_TDB + (JD2_SOLAR_TDB - JD_A_SOLAR_TDB) * glide((t - tTroca) / DURACAO_DA_TROCA);
    },
    // a mesma rotação da cadeia dos pinos, aplicada ao polo da eclíptica
    cima: CIMA_DA_ECLIPTICA.clone(),
    planosPorAto: atos.map((a) => a.length),
  };
}
