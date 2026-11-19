// ============================================================
// A COMA E AS CAUDAS DOS COMETAS — partículas, nenhuma imagem (pilar 4,
// 12/11/2026). Cada grão, íon e molécula é posto no lugar NO SHADER, a
// partir de três números sorteados (idade, β, direção) e do estado do
// núcleo: não há simulação guardada, e a cauda segue a máquina do tempo
// para a frente e para trás sem memória.
//
// A POEIRA (Finson & Probstein 1968, ApJ 154, 327): um grão solto do
// núcleo há τ dias, com a razão β entre a pressão de radiação e a
// gravidade do Sol, segue Kepler com μ(1 − β) a partir do estado do
// núcleo NAQUELE instante (mais a velocidade de ejeção). β e τ fixam
// onde ele está agora: β constante desenha uma sindina, τ constante uma
// síncrona, e a cauda sai larga, curva e atrasada em relação à órbita.
// O estado de soltura chega por 40 amostras de τ (CPU, dupla precisão)
// interpoladas por Hermite; Kepler em variáveis universais, no shader,
// resolvido pelo método de Laguerre (Conway 1986), que não diverge.
//   β: de 0,003 a 0,6, sorteado em log; a luz por amostra é β^0,5
//   (distribuição de tamanhos n(s) ∝ s^−3,5 e seção ∝ s², com β ∝ 1/s —
//   Burns, Lamy & Soter 1979, Icarus 40, 1; o expoente de memória).
//   Ejeção: 1 km/s · β^0,5 · r^−0,5, puxada para o lado do Sol (o lado
//   que sublima) — de memória, ordem de grandeza dos modelos de Halley.
//   Espalhamento: Henyey–Greenstein com g = 0,4 (a poeira acende em
//   contraluz), normalizado em 90°.
//
// OS ÍONS (CO⁺, azul): nascem no núcleo e o vento solar os arrasta para
// a direção oposta ao Sol CORRIGIDA pela aberração — o vento (400 km/s,
// radial) visto do cometa em movimento: u = v_vento·r̂ − v_cometa. A
// aceleração é ~60× a gravidade solar até a velocidade do vento (as
// medidas de nós em caudas de íons dão 10–100×; de memória), e a
// direção balança alguns graus com a data de soltura — as dobras que
// descem a cauda quando o tempo corre. Raios finos saem do sorteio.
//
// A COMA (C₂, verde): moléculas a 0,85 km/s · r^−0,5 (Delsemme), com
// a densidade de Haser — pai 2,2·10⁴ km, filho 6,6·10⁴ km a 1 UA,
// escalando com r² (A'Hearn et al. 1995; de memória).
//
// A LUZ: a produção em `producaoRelativa` (lib/cometas) no instante de
// soltura de cada partícula, vezes o 1/r² da luz do Sol no lugar dela
// AGORA, vezes a escala do M1 do cometa. O GANHO absoluto (`GANHO`) é
// artístico, um número só para os oito — declarado no cadastro de escala
// e no censo da luz.
//
// O TAMANHO: cada partícula é um borrão de instrumento que representa
// uma multidão — o raio cresce com a distância ao núcleo (o espaço entre
// vizinhas) e a luz se divide pela área, então o brilho de superfície
// não depende da câmera; abaixo de 3 px o fluxo se conserva. Teto de
// 48 px, a lei da casa (POINTS acima de 64 trava o Mac).
//
// DE PERTO (abaixo de 3·10⁵ km do núcleo, só pela distância): a câmera
// entra nos borrões e eles viravam bolas. Ali a luz junto ao núcleo passa
// à integral da mesma lei (a coma de perto, `COMA_FRAG`), os borrões que
// cobririam mais de ~6° saem (os íons junto ao núcleo também viram
// integral), e a exposição se adapta pela distância e pela atividade de
// cada cometa (`exposicaoDePerto`, `correcaoPelaAtividade`). Perto da
// cabeça, só a luz que se acumula nela é comprimida (`OMBRO`).
// ============================================================
import * as THREE from 'three';
import type { QualityLevel } from '../core/engine';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';
import {
  COMETAS,
  LIMIAR_DE_ATIVIDADE,
  brilhoRelativo,
  cometaPorId,
  escalaDoBrilho,
  estadoDoCometa,
  producaoRelativa,
  type Cometa,
} from '../../lib/cometas';
import { naCena } from './sondas';

/** quantas partículas por tier (5/8 poeira, 2/8 íons, 1/8 gás) */
export const PARTICULAS_POR_TIER: Readonly<Record<QualityLevel, number>> = {
  cinema: 65536,
  alta: 32768,
  performance: 12288,
};
const MAXIMO = PARTICULAS_POR_TIER.cinema;

/** amostras do estado de soltura — o shader interpola entre elas */
const AMOSTRAS = 40;
/** a idade máxima dos grãos de poeira desenhados (dias) */
const TAU_DA_POEIRA = 60;
/** a idade máxima dos íons (dias) e o tempo em que a luz deles cai a 1/e */
const TAU_DOS_IONS = 8;
const DESBOTA_DOS_IONS = 3;
/** a idade do íon mais novo (dias): ~400 km do núcleo em Halley */
const TAU0_DOS_IONS = 0.01;
const BETA_MIN = 0.003;
const BETA_MAX = 0.6;
/** μ do Sol, UA³/dia² */
const MU = 0.01720209895 ** 2;
const KM_S_EM_UA_DIA = 86_400 / AU_KM;
const VENTO_SOLAR = 400 * KM_S_EM_UA_DIA;
/** a aceleração dos íons a 1 UA, em múltiplos da gravidade do Sol */
const ACELERACAO_DOS_IONS = 60;
/** o ganho absoluto — ARTÍSTICO, ver o cabeçalho */
const GANHO = 0.004;
/** o núcleo: albedo medido de Halley e Hale–Bopp (0,04, JPL SBDB) e a
 *  exposição de visita — artística, para o corpo escuro se ler */
const ALBEDO_DO_NUCLEO = 0.04;
const EXPOSICAO_DO_NUCLEO = 6;
/** os passos por pixel da coma de perto, por tier (eram 16 em todos) */
export const PASSOS_DA_COMA: Readonly<Record<QualityLevel, number>> = {
  cinema: 24,
  alta: 16,
  performance: 8,
};
const PASSOS_MAX = PASSOS_DA_COMA.cinema;

/**
 * O OMBRO DA CABEÇA (13/11/2026) — ARTÍSTICO. De perto da cabeça (o
 * "Aproximar", a 3–4 raios dela) a luz somada dos borrões junto ao núcleo
 * passa centenas de vezes do branco numa área grande: a cabeça vira uma
 * chapa branca, e na borda dela cada borrão ralo vira uma bolha. Baixar a
 * exposição do cometa inteiro apaga as caudas (a 1ª tentativa); aqui só a
 * luz que se acumula é comprimida.
 *   A poeira e o gás de cada partícula são multiplicados por 1/(1 + B/`OMBRO`),
 * com B o brilho de coluna ESPERADO no ρ dela (a distância do núcleo à
 * linha de visada): B = uColuna·hg/ρ, a lei da coma de perto (∫ds/r² = π/ρ,
 * direções na média). Todas as partículas da mesma linha de visada têm o
 * mesmo ρ, e o fator vale para a soma. A luz de verdade cai mais depressa
 * que 1/ρ (medido em Halley: ~ρ^−1,9), então a cabeça comprimida ainda
 * desce de um miolo quase branco para o creme da poeira; onde B < `OMBRO`
 * (as caudas longe da cabeça) quase nada muda. Os íons não passam pelo
 * ombro: o feixe é fino e a cauda azul fica inteira.
 *   O ombro é do olhar de perto da cabeça: a `OMBRO_KC` raios da cabeça
 * (`raioDaCabecaKm`) ele começa a sair, ∝ (D/D₀)^−3, e as vistas de longe
 * (a chegada, Hale–Bopp em 1997) não mudam.
 *   O PISO: perto da cabeça, poeira e íons não ficam menores que
 * `PISO_DA_CABECA` da distância da câmera (com a mesma saída de longe) —
 * a frente da cabeça, rala, era um granulado de borrões de 3 px; maiores,
 * eles se fundem, e a luz se conserva (dividida pela área).
 */
const OMBRO = 5;
const OMBRO_KC = 10;
const PISO_DA_CABECA = 0.02;
const OMBRO_GLSL = /* glsl */ `
float ombro(float b) {
  return 1.0 / (1.0 + max(b, 0.0) / ${OMBRO.toFixed(4)});
}
`;

const VERT = /* glsl */ `
#define K ${AMOSTRAS}
attribute vec2 aMais;
attribute float aTipo;

uniform vec3 uPos;
uniform vec3 uLibP[K];
uniform vec3 uLibV[K];
uniform float uTauMax;
uniform float uMu;
uniform float uK1;
uniform vec3 uDirIon;
uniform float uTauIon;
uniform float uAcIon;
uniform float uVsw;
uniform vec3 uCam;
uniform float uFoco;
uniform float uAuPc;
uniform float uDose;
uniform float uFase;
uniform float uPerto;
uniform float uRin;
uniform float uExpo;
uniform float uExpoIon;
uniform float uColuna;
uniform float uPiso;

varying vec3 vCor;
varying float vI;
${OMBRO_GLSL}
const float CORTE1 = ${Math.pow(1 + Math.pow(1 / 2.808, 5.093), -4.6142).toFixed(9)};

float producao(float r) {
  r = max(r, 1e-3);
  float corte = pow(1.0 + pow(r / 2.808, 5.093), -4.6142) / CORTE1;
  return pow(r, 2.0 - uK1 / 2.5) * corte;
}

vec3 unitario(float a, float b) {
  float z = 2.0 * a - 1.0;
  float s = sqrt(max(1.0 - z * z, 0.0));
  float f = 6.2831853 * b;
  return vec3(s * cos(f), s * sin(f), z);
}

vec2 stumpff(float z) {
  if (abs(z) < 1.0) {
    return vec2(
      1.0 / 6.0 - z / 120.0 + z * z / 5040.0 - z * z * z / 362880.0,
      0.5 - z / 24.0 + z * z / 720.0 - z * z * z / 40320.0
    );
  }
  if (z > 0.0) {
    float s = sqrt(z);
    return vec2((s - sin(s)) / (s * z), (1.0 - cos(s)) / z);
  }
  float s = sqrt(-z);
  return vec2((sinh(s) - s) / (s * -z), (cosh(s) - 1.0) / -z);
}

// Kepler em variáveis universais (Curtis 3.3/3.4) por Laguerre (n = 5)
vec3 kepler(vec3 r0v, vec3 v0v, float mu, float dt) {
  float smu = sqrt(mu);
  float r0 = length(r0v);
  float A = dot(r0v, v0v) / smu;
  float alfa = 2.0 / r0 - dot(v0v, v0v) / mu;
  float B = 1.0 - alfa * r0;
  float x = smu * dt / r0;
  for (int i = 0; i < 8; i++) {
    float z = alfa * x * x;
    vec2 sc = stumpff(z);
    float F = A * x * x * sc.y + B * x * x * x * sc.x + r0 * x - smu * dt;
    float dF = A * x * (1.0 - z * sc.x) + B * x * x * sc.y + r0;
    float d2F = A * (1.0 - z * sc.y) + B * x * (1.0 - z * sc.x);
    float disc = sqrt(abs(16.0 * dF * dF - 20.0 * F * d2F));
    float den = dF + (dF >= 0.0 ? disc : -disc);
    x -= 5.0 * F / den;
  }
  float z = alfa * x * x;
  vec2 sc = stumpff(z);
  float f = 1.0 - x * x * sc.y / r0;
  float g = dt - x * x * x * sc.x / smu;
  return f * r0v + g * v0v;
}

// o estado do núcleo há tau dias: Hermite nas amostras (tau = tauMax·(k/(K−1))²)
void soltura(float tau, out vec3 P, out vec3 V) {
  float f = sqrt(clamp(tau / uTauMax, 0.0, 1.0)) * float(K - 1);
  int k = min(int(floor(f)), K - 2);
  float a0 = float(k) / float(K - 1);
  float a1 = float(k + 1) / float(K - 1);
  float t0 = uTauMax * a0 * a0;
  float t1 = uTauMax * a1 * a1;
  float h = t1 - t0;
  float s = clamp((tau - t0) / h, 0.0, 1.0);
  float s2 = s * s;
  float s3 = s2 * s;
  // a derivada em tau é −v: o tempo corre ao contrário da idade
  P = (2.0 * s3 - 3.0 * s2 + 1.0) * uLibP[k] - (s3 - 2.0 * s2 + s) * h * uLibV[k]
    + (-2.0 * s3 + 3.0 * s2) * uLibP[k + 1] - (s3 - s2) * h * uLibV[k + 1];
  V = mix(uLibV[k], uLibV[k + 1], s);
}

void main() {
  vec3 d;
  float w;
  float h;
  if (aTipo < 0.5) {
    // POEIRA
    float u = position.x;
    float tau = uTauMax * u + 0.02;
    vec3 R;
    vec3 V;
    soltura(tau, R, V);
    float rr = length(R);
    float beta = exp(mix(log(${BETA_MIN}), log(${BETA_MAX}), position.y));
    vec3 dirEj = normalize(unitario(position.z, aMais.x) - 0.6 * R / rr);
    float vej = ${(1.0 * KM_S_EM_UA_DIA).toFixed(9)} * sqrt(beta) / sqrt(rr);
    vec3 P = kepler(R, V + dirEj * vej, uMu * (1.0 - beta), tau);
    d = P - uPos;
    float rAgora = length(P);
    vec3 paraCam = normalize(uCam - d);
    float cosT = dot(P / rAgora, paraCam);
    float hg = 0.84 / pow(1.16 - 0.8 * cosT, 1.5) / 0.6672;
    w = producao(rr) * sqrt(beta) * uTauMax * 3.0 * hg / (rAgora * rAgora);
    h = max(0.2 * length(d) + 7e-6, uPiso);
    vCor = vec3(1.0, 0.86, 0.68);
  } else if (aTipo < 1.5) {
    // ÍONS (CO+)
    float tau = uTauIon * position.x * position.x + ${TAU0_DOS_IONS};
    float rr = length(uPos);
    float acc = uAcIon / (rr * rr);
    float tAcc = uVsw / acc;
    float s = tau < tAcc ? 0.5 * acc * tau * tau : 0.5 * acc * tAcc * tAcc + uVsw * (tau - tAcc);
    float tr = uFase - tau;
    vec3 e1 = normalize(cross(uDirIon, abs(uDirIon.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
    vec3 e2 = cross(uDirIon, e1);
    float b1 = 0.006 * sin(tr * 2.1 + 1.3) + 0.004 * sin(tr * 5.3 + 0.4) + 0.002 * sin(tr * 11.7);
    float b2 = 0.005 * sin(tr * 1.7 + 2.0) + 0.003 * sin(tr * 4.1) + 0.002 * sin(tr * 9.3 + 1.1);
    float ang = 6.2831853 * position.y;
    float abre = 0.07 * position.z * position.z + 0.006 * aMais.x;
    vec3 dir = normalize(uDirIon + e1 * (b1 + abre * cos(ang)) + e2 * (b2 + abre * sin(ang)));
    d = dir * s;
    w = producao(rr) * exp(-tau / ${DESBOTA_DOS_IONS.toFixed(1)}) * 2.0 * position.x * uTauIon * 2.0 / (rr * rr);
    // de perto o piso de 2250 km vira 5 % da distância da câmera ao
    // núcleo: de dentro da coma o feixe é visto de lado a poucos milhares
    // de km, e o piso fixo o fazia em bolas azuis
    h = max(0.03 * s + mix(1.5e-5, 0.05 * length(uCam), uPerto), uPiso);
    vCor = vec3(0.32, 0.55, 1.0);
  } else {
    // A COMA DE GÁS (C2, Haser)
    float rr = length(uPos);
    float vg = ${(0.85 * KM_S_EM_UA_DIA).toFixed(9)} / sqrt(rr);
    float vgKm = 0.85 / sqrt(rr);
    float tauP = 2.2e4 * rr * rr / vgKm / 86400.0;
    float tauD = 6.6e4 * rr * rr / vgKm / 86400.0;
    float tau = 4.0 * tauD * position.x;
    vec3 dir = normalize(unitario(position.y, position.z) - 0.3 * uPos / rr);
    d = dir * vg * tau;
    w = (exp(-tau / tauD) - exp(-tau / tauP)) * producao(rr) * 4.0 * tauD * 0.3 / (rr * rr);
    h = 0.35 * length(d) + 1e-6;
    vCor = vec3(0.3, 1.0, 0.42);
  }

  // A COMA DE PERTO: dentro de uRin do núcleo a luz passa à integral da
  // mesma lei (o material da coma de perto, abaixo) — a soma dos dois
  // pesos é 1 em todo raio; longe (uPerto = 0) o peso é 1 exato
  // (os íons também: de perto o feixe deles é a integral do mesmo sorteio)
  w *= 1.0 - uPerto * (1.0 - smoothstep(0.5 * uRin, uRin, length(d)));

  vec4 mv = modelViewMatrix * vec4(d, 1.0);
  gl_Position = projectionMatrix * mv;
  float prof = max(-mv.z, 1e-30);
  float px = h * uAuPc * uFoco / prof;
  // abaixo de 3 px o borrão não encolhe mais: o fluxo se espalha pelos
  // 3 px (o grão de amostragem some sem borrar a forma de longe)
  float lado = clamp(px, 3.0, 48.0);
  gl_PointSize = lado;
  float hm = h * 1000.0;
  float i = uDose * w / (hm * hm) * min(px * px / (lado * lado), 1.0);
  // acima de 24 px o borrão desbota em vez de virar disco duro: de perto
  // da coma, onde a câmera entra na nuvem, a amostragem é rala demais
  // para um contínuo — melhor uma névoa fraca que bolas (DECLARADO: aqui
  // o brilho de superfície deixa de ser o físico)
  // e junto ao núcleo (câmera a menos de ~10⁵ km dele) o teto desce a 4 px
  float teto = mix(4.0, 24.0, smoothstep(6.7e-5, 6.7e-4, length(uCam)));
  teto = mix(teto, 48.0, uPerto);
  float corte = min(1.0, teto / px);
  i *= corte * corte;
  // de perto, o borrão muito maior que o teto sai de vez (é a câmera
  // dentro dele: a luz que ele carregava é da coma de perto ou é a
  // névoa junto da câmera, que de dentro não se vê como bola); sai já no
  // primeiro quarto da entrada: pesado por uPerto, no meio da troca (67P
  // ativo no telefone, a 2·10⁵ km) ele ficava pela metade, em bolhas de 48 px
  i *= 1.0 - min(1.0, 4.0 * uPerto) * smoothstep(0.1 * uFoco, 0.25 * uFoco, px);
  i *= aTipo > 0.5 && aTipo < 1.5 ? uExpoIon : uExpo;
  // o ombro da cabeça (poeira e gás; ver OMBRO): ρ = a distância do núcleo à
  // linha de visada desta partícula, hg pela fase do núcleo visto da câmera
  if (aTipo < 0.5 || aTipo > 1.5) {
    vec3 rv = d - uCam;
    float rho = length(cross(uCam, rv)) / max(length(rv), 1e-30);
    float cosN = dot(normalize(uPos), normalize(uCam));
    float hgN = 0.84 / pow(1.16 - 0.8 * cosN, 1.5) / 0.6672;
    i *= ombro(uColuna * hgN / max(rho, 1e-12));
  }
  // a guarda do NaN (a armadilha da casa: um pixel NaN + bloom = tela
  // branca) e da meia-precisão do alvo HDR: nunca acima de 8 por borrão
  bool ruim = isnan(i) || isinf(i) || any(isnan(d)) || any(isinf(d));
  vI = ruim ? 0.0 : clamp(i, 0.0, 8.0);
  if (ruim || vI <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec3 vCor;
varying float vI;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float k = 1.0 - smoothstep(0.0, 0.5, r);
  gl_FragColor = vec4(vCor * vI * k * k, 0.0);
}
`;

/**
 * A COMA DE PERTO (12/11/2026, o conserto do zoom): com a câmera dentro
 * da coma, cada partícula — um borrão do tamanho do espaço entre
 * vizinhas — cobre meia tela, e a amostragem é rala demais para um
 * contínuo (o primeiro grão sai a 0,02 dia do núcleo: dentro de ~1000 km
 * não havia nada). Aqui a MESMA lei das partículas vira a sua integral
 * ao longo da linha de visada, por pixel: perto do núcleo os grãos e as
 * moléculas saem em linha reta (a pressão da luz desloca menos de ~10 %
 * em 3·10⁴ km), então a densidade é a do sorteio do shader acima —
 *   poeira: N·3·P·hg·√r☉/(v₀·r☉²) · f(m; 0,6)/r²  (β cancela: luz ∝ √β,
 *           velocidade ∝ √β);
 *   gás C₂: N·0,3·P/(v·r☉²) · f(m; 0,3) · (e^(−r/L_D) − e^(−r/L_P))/r²;
 * f(m; a) é a densidade das direções normalize(n − a·r̂☉) com n uniforme
 * (o lado do Sol mais cheio — os jatos). A troca de variável s = p·tg φ
 * (p = a menor distância do raio ao núcleo) deixa o 1/r² constante em φ:
 * poucos passos bastam (o número segue o nível de qualidade). O raio para
 * no núcleo.
 * OS ÍONS DE PERTO: o feixe do sorteio vira uma fonte em linha ao longo de
 * uDirIon (com o balanço da soltura mais nova). Um íon de idade τ está a
 * s = ½·a·τ², e a luz por dτ é 2·P·e^(−τ/3)/r☉², então a densidade em
 * linha é λ(s) = N·2·P·e^(−τ/3)/(r☉²·a·τ) — da soltura mais nova (τ₀ =
 * 0,01 dia, ~400 km) para dentro ela cai a zero junto ao núcleo, sem
 * buraco. A seção é σ²/(π(ρ² + σ²)²), com σ = 0,035·s (a meia-luz da
 * abertura do sorteio) mais 20 km: normalizada, a soma é a mesma. Mesma
 * troca de variável, agora em torno do ponto do raio mais perto do eixo.
 * A unidade é a mesma dos borrões: um borrão de fluxo F cobre κ·px² com
 * κ = 3π/70, e um pixel vê 1/foco² de ângulo sólido — então o pixel vale
 * uDose·10⁻⁶·κ·∫ j ds (s em UA), e de longe, onde ela some, nada muda.
 */
const COMA_VERT = /* glsl */ `
uniform float uRinKm;
varying vec3 vL;
void main() {
  vL = position * uRinKm;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const COMA_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uCamKm;
uniform float uRinKm;
uniform float uNucKm;
uniform vec3 uRhat;
uniform float uKd;
uniform float uKg;
uniform float uLP;
uniform float uLD;
uniform int uPassos;
uniform vec3 uEixoIon;
uniform float uKi;
uniform float uAIonKm;
uniform float uS0Km;
uniform float uColuna;
varying vec3 vL;

#define PASSOS_MAX ${PASSOS_MAX}
${OMBRO_GLSL}
// o feixe de íons ao longo do raio entre ta e tb (km a partir da câmera)
float feixe(vec3 u, float ta, float tb, float R) {
  float b = dot(u, uEixoIon);
  float f = dot(uCamKm, uEixoIon);
  float sT = sqrt(max(1.0 - b * b, 1e-6));
  // o ponto do raio mais perto do eixo
  float tc = clamp((b * f - dot(u, uCamKm)) / (sT * sT), ta, tb);
  vec3 xc = uCamKm + tc * u;
  float sc = dot(xc, uEixoIon);
  float rho2 = max(dot(xc, xc) - sc * sc, 0.0);
  float sig = 0.035 * max(sc, 0.0) + 20.0;
  float q = sqrt(rho2 + sig * sig) / sT;
  float f0 = atan((ta - tc) / q);
  float f1 = atan((tb - tc) / q);
  float df = (f1 - f0) / float(uPassos);
  float soma = 0.0;
  for (int k = 0; k < PASSOS_MAX; k++) {
    if (k >= uPassos) break;
    float fi = f0 + (float(k) + 0.5) * df;
    float c = cos(fi);
    vec3 x = uCamKm + (tc + q * tan(fi)) * u;
    float s = dot(x, uEixoIon);
    if (s <= 0.0) continue;
    float r2 = dot(x, x);
    float p2 = max(r2 - s * s, 0.0);
    float sg = 0.035 * s + 20.0;
    float h = p2 + sg * sg;
    float tau = sqrt(2.0 * max(s, uS0Km) / uAIonKm);
    float lam = exp(-tau / ${DESBOTA_DOS_IONS.toFixed(1)}) / tau * smoothstep(0.0, uS0Km, s);
    float rampa = 1.0 - smoothstep(0.5 * R, R, sqrt(r2));
    soma += lam * sg * sg / (h * h) * rampa / (c * c);
  }
  return soma * df * q / 3.14159265;
}

// a densidade das direções normalize(n − a·r̂) com n uniforme na esfera
float direcoes(float am, float a) {
  float q = sqrt(am * am + 1.0 - a * a);
  float rho = q - am;
  return rho * rho / (12.5663706 * q);
}

void main() {
  vec3 u = normalize(vL - uCamKm);
  float sc = -dot(uCamKm, u);
  vec3 pc = uCamKm + sc * u;
  float p = max(length(pc), 1e-3);
  float R = uRinKm;
  if (p >= R) discard;
  float meia = sqrt(R * R - p * p);
  float s0 = max(sc - meia, 0.0);
  float s1 = sc + meia;
  if (p < uNucKm) {
    float sn = sc - sqrt(uNucKm * uNucKm - p * p);
    s1 = min(s1, sn);
  }
  if (s1 <= s0) discard;
  float f0 = atan((s0 - sc) / p);
  float f1 = atan((s1 - sc) / p);
  float df = (f1 - f0) / float(uPassos);
  float cosT = -dot(uRhat, u);
  float hg = 0.84 / pow(1.16 - 0.8 * cosT, 1.5) / 0.6672;
  float sd = 0.0;
  float sg = 0.0;
  for (int k = 0; k < PASSOS_MAX; k++) {
    if (k >= uPassos) break;
    float f = f0 + (float(k) + 0.5) * df;
    float t = tan(f);
    float r = p / cos(f);
    vec3 m = (pc + p * t * u) / r;
    float am = dot(m, uRhat);
    float rampa = 1.0 - smoothstep(0.5 * R, R, r);
    sd += direcoes(0.6 * am, 0.6) * rampa;
    sg += direcoes(0.3 * am, 0.3) * rampa * (exp(-r / uLD) - exp(-r / uLP));
  }
  // 1/p em UA (p em km)
  float base = df * ${AU_KM.toFixed(1)} / p;
  // o mesmo ombro dos borrões, no mesmo ρ (aqui, p)
  float om = ombro(uColuna * hg * ${AU_KM.toFixed(1)} / p);
  float id = uKd * hg * sd * base * om;
  float ig = uKg * sg * base * om;
  float ii = uKi > 0.0 ? uKi * feixe(u, s0, s1, R) : 0.0;
  vec3 c = id * vec3(1.0, 0.86, 0.68) + ig * vec3(0.3, 1.0, 0.42) + ii * vec3(0.32, 0.55, 1.0);
  // a mesma guarda dos borrões: NaN nunca, e o alvo HDR em meia precisão
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  gl_FragColor = vec4(min(c, vec3(64.0)), 0.0);
}
`;

/** κ: o fluxo de um borrão de lado L é i·κ·L² (o perfil (1 − smoothstep)²) */
const KAPPA = (3 * Math.PI) / 70;
/** a coma de perto acende abaixo de 3·10⁵ km do núcleo e está inteira a 1,5·10⁵ */
const PERTO_KM: readonly [number, number] = [150_000, 300_000];
/** o raio da coma de perto: 3× a distância da câmera, até 3·10⁴ km — onde
 *  a saída em linha reta ainda vale (a pressão da luz vira a poeira mais
 *  longe) */
const RAIO_DE_PERTO = 3;
const RAIO_DE_PERTO_MAX_KM = 100_000;
/**
 * A EXPOSIÇÃO DE PERTO — ARTÍSTICA. O ganho de longe (`GANHO`) deixa a
 * cabeça do cometa centenas de vezes acima do branco: de longe ela é um
 * ponto branco e está certo, mas o brilho de superfície se conserva, e
 * de dentro a coma 1/r² brilha ∝ 1/D a D km do núcleo — a tela inteira
 * estoura, e o estouro é que desenhava cada borrão como bola. Como um olho
 * que se adapta, a luz do cometa é exposta pela distância: 1 a partir de
 * 2,5 milhões de km (as vistas de longe não mudam), caindo como uma
 * potência até 10⁵ km e, daí para dentro, ∝ D — a coma de perto fica com
 * o mesmo desenho em toda a descida (o halo lateral a ~3 % do branco em
 * Halley no periélio), corrigida pela atividade de cada cometa
 * (`correcaoPelaAtividade`). Os íons escurecem menos (a exposição deles
 * para em 3·10⁵ km e só cai de novo dentro de 3·10⁴ km, ∝ D^1,5): de dentro
 * da coma a cauda azul ainda sai, presa ao núcleo.
 */
const D_EXPO_KM = 1e9;
/** os nós da curva (km, exposição), em log–log; abaixo do primeiro, ∝ D */
const NOS_DA_EXPOSICAO: readonly (readonly [number, number])[] = [
  [1e5, 1e5 / D_EXPO_KM],
  [1e6, 1e-2],
  [2.5e6, 1],
];
const ESCURO_DOS_IONS_KM = 3e5;
const PERTO_DOS_IONS_KM = 3e4;

/**
 * A RÉGUA DE CADA COMETA (12/11/2026): a curva acima foi acertada em
 * Halley no periélio de 1986; Hale–Bopp, cem vezes mais ativo, estourava a
 * tela inteira em creme. De perto a exposição se divide pela atividade do
 * cometa NAQUELA data relativa à de Halley no periélio — a mesma grandeza
 * que acende os borrões (`brilhoRelativo`: M1, produção e 1/r²) —, pesada
 * pela mesma curva da distância (em log): a correção é 1 exata a partir
 * de 2,5 milhões de km e inteira dentro de 10⁵ km. Lei fixa do objeto e
 * da distância da câmera: não olha a tela, o foco nem o modo.
 */
export const ATIVIDADE_DE_HALLEY = brilhoRelativo(cometaPorId('halley') as Cometa, 0.5871);

/** a correção da exposição de perto pela atividade (1 de longe) */
export function correcaoPelaAtividade(dKm: number, atividade: number): number {
  const peso = Math.min(Math.log(exposicaoDePerto(dKm)) / Math.log(exposicaoDePerto(NOS_DA_EXPOSICAO[0][0])), 1);
  if (peso <= 0) return 1;
  return (ATIVIDADE_DE_HALLEY / Math.max(atividade, 1e-12)) ** peso;
}

/** O RAIO DA CABEÇA: a de Halley no periélio de 1986 cabe em 10⁶ km; a dos
 *  outros cresce com a raiz cúbica da atividade naquela data (o volume da
 *  coma segue a produção) */
export function raioDaCabecaKm(atividade: number): number {
  return 1e6 * Math.cbrt(Math.max(atividade, 1e-12) / ATIVIDADE_DE_HALLEY);
}

/** a exposição dos íons: a dos borrões parada em 3·10⁵ km e, dentro de
 *  3·10⁴ km, ∝ D^1,5 — o brilho do feixe visto de dentro cresce ∝ D^−0,5
 *  (λ ∝ s^−½ sobre a largura ∝ s), e assim o desenho fica o mesmo */
export function exposicaoDosIons(dKm: number): number {
  return exposicaoDePerto(Math.max(dKm, ESCURO_DOS_IONS_KM)) * Math.min(1, Math.max(dKm, 0) / PERTO_DOS_IONS_KM) ** 1.5;
}

/** a exposição da luz do cometa a `dKm` do núcleo (1 de longe) */
export function exposicaoDePerto(dKm: number): number {
  const d0 = NOS_DA_EXPOSICAO[0][0];
  if (dKm <= d0) return Math.max(dKm, 0) / D_EXPO_KM;
  for (let k = 1; k < NOS_DA_EXPOSICAO.length; k++) {
    const [da, ea] = NOS_DA_EXPOSICAO[k - 1];
    const [db, eb] = NOS_DA_EXPOSICAO[k];
    if (dKm < db) return ea * Math.exp((Math.log(eb / ea) * Math.log(dKm / da)) / Math.log(db / da));
  }
  return 1;
}

/**
 * O REGIME DE PERTO a `dKm` do núcleo: quanto da luz junto ao núcleo é
 * integral (0 longe, 1 perto) e o raio dela. Só a distância decide.
 */
export function regimeDePerto(dKm: number): { perto: number; raioKm: number } {
  const [a, b] = PERTO_KM;
  const x = Math.min(Math.max((dKm - a) / (b - a), 0), 1);
  const perto = 1 - x * x * (3 - 2 * x);
  return { perto, raioKm: Math.min(RAIO_DE_PERTO * dKm, RAIO_DE_PERTO_MAX_KM) };
}

/** O NÚCLEO: um torrão, não uma bola — o raio cai até 40 % abaixo do
 *  da esfera por ondas largas (nunca acima dela: a superfície do near
 *  plane é a esfera do tamanho medido), e a normal sai das faces, por
 *  pixel. A forma é ilustrativa (nenhum dos oito tem modelo de forma
 *  aqui); o tamanho e o albedo são os medidos. */
const NUCLEO_VERT = /* glsl */ `
varying vec3 vN;
float torrao(vec3 p) {
  p *= vec3(1.0, 1.6, 1.3);
  return 0.5 * sin(3.1 * p.x + 1.3) * sin(2.3 * p.y + 0.7) * sin(2.7 * p.z + 2.1)
    + 0.3 * sin(6.3 * p.x + 4.0) * sin(5.9 * p.y + 1.0) * sin(6.1 * p.z + 0.3)
    // a oitava fina é baixa: a 0,2 a grade de senos (uma treliça) virava
    // listras paralelas no terminador de um núcleo grande (Hale–Bopp a 300 km)
    + 0.06 * sin(13.0 * p.x + 2.2) * sin(11.0 * p.y + 3.1) * sin(12.0 * p.z + 1.7);
}
vec3 forma(vec3 p) {
  p = normalize(p);
  return p * (0.8 + 0.2 * torrao(p));
}
void main() {
  vec3 q = forma(position);
  vec3 t1 = normalize(cross(position, abs(position.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
  vec3 t2 = cross(position, t1);
  vec3 n = cross(forma(position + 0.01 * t1) - q, forma(position + 0.01 * t2) - q);
  vN = dot(n, position) < 0.0 ? -n : n;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
}
`;
const NUCLEO_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uSol;
uniform float uLuz;
varying vec3 vN;
void main() {
  float k = length(vN);
  float l = k > 0.0 ? max(dot(vN / k, uSol), 0.0) : 0.0;
  gl_FragColor = vec4(vec3(uLuz * l), 1.0);
}
`;

/** o eixo do feixe de íons junto ao núcleo: a direção do vento com o
 *  balanço dos íons mais novos (o mesmo do sorteio, em tr = fase − τ₀) */
function eixoDosIonsNovos(dir: THREE.Vector3, fase: number, saida: THREE.Vector3) {
  const tr = fase - TAU0_DOS_IONS;
  const b1 = 0.006 * Math.sin(tr * 2.1 + 1.3) + 0.004 * Math.sin(tr * 5.3 + 0.4) + 0.002 * Math.sin(tr * 11.7);
  const b2 = 0.005 * Math.sin(tr * 1.7 + 2.0) + 0.003 * Math.sin(tr * 4.1) + 0.002 * Math.sin(tr * 9.3 + 1.1);
  const e1 = new THREE.Vector3().crossVectors(dir, Math.abs(dir.z) < 0.9 ? EZ_LOCAL : EX_LOCAL).normalize();
  const e2 = new THREE.Vector3().crossVectors(dir, e1);
  saida.copy(dir).addScaledVector(e1, b1).addScaledVector(e2, b2).normalize();
}
const EX_LOCAL = new THREE.Vector3(1, 0, 0);
const EZ_LOCAL = new THREE.Vector3(0, 0, 1);

/** o ruído por índice (o mesmo das plumas): a partícula i tem os mesmos
 *  números em todo tier — subir a qualidade não muda a forma */
function ruido(i: number, k: number): number {
  let t = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  t = Math.imul(t ^ (t >>> 15), 0x2545f491);
  t ^= t >>> 13;
  return (t >>> 0) / 4294967296;
}

function geometriaCompartilhada(): THREE.BufferGeometry {
  const pos = new Float32Array(MAXIMO * 3);
  const mais = new Float32Array(MAXIMO * 2);
  const tipo = new Float32Array(MAXIMO);
  for (let i = 0; i < MAXIMO; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = ruido(i, k);
    mais[i * 2] = ruido(i, 3);
    mais[i * 2 + 1] = ruido(i, 4);
    const m = i % 8;
    tipo[i] = m < 5 ? 0 : m < 7 ? 1 : 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aMais', new THREE.BufferAttribute(mais, 2));
  g.setAttribute('aTipo', new THREE.BufferAttribute(tipo, 1));
  // em UA, no frame local do núcleo: a cauda mais longa cabe em 4 UA
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
  return g;
}

interface CometaNaCena {
  cometa: Cometa;
  grupo: THREE.Group;
  pontos: THREE.Points;
  material: THREE.ShaderMaterial;
  nucleo: THREE.Mesh | null;
  /** a coma de perto (a integral), só com a câmera a menos de ~3·10⁵ km */
  coma: THREE.Mesh;
  jdEscrito: number;
}

export interface QuadroDasCaudas {
  jd: number;
  camera: THREE.PerspectiveCamera;
  alturaPx: number;
  tier: QualityLevel;
  /** a gaveta (`nocaudas`) */
  ligado: boolean;
  /** só no Atlas */
  noAtlas: boolean;
  /** o cometa em foco: o único com núcleo desenhado */
  foco: string | null;
}

const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _v = new THREE.Vector3();
const EX = naCena(1, 0, 0, new THREE.Vector3());
const EY = naCena(0, 1, 0, new THREE.Vector3());
const EZ = naCena(0, 0, 1, new THREE.Vector3());
const AU_PC = EX.length();

/**
 * A CAMADA DAS CAUDAS. Um `Points` por cometa ACESO (a geometria é uma
 * só, compartilhada); cometa apagado não desenha nada.
 */
export class CaudasDosCometas {
  readonly group = new THREE.Group();
  private readonly geometria = geometriaCompartilhada();
  private readonly esfera = new THREE.SphereGeometry(1, 48, 24);
  private readonly esferaFina = new THREE.SphereGeometry(1, 128, 64);
  private readonly vivos = new Map<string, CometaNaCena>();
  /** quantas partículas o último quadro desenhou (a régua do custo) */
  particulasDesenhadas = 0;

  constructor() {
    this.group.name = 'caudas-dos-cometas';
  }

  private criar(c: Cometa): CometaNaCena {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uPos: { value: new THREE.Vector3() },
        uLibP: { value: Array.from({ length: AMOSTRAS }, () => new THREE.Vector3()) },
        uLibV: { value: Array.from({ length: AMOSTRAS }, () => new THREE.Vector3()) },
        uTauMax: { value: TAU_DA_POEIRA },
        uMu: { value: MU },
        uK1: { value: c.brilho.K1 },
        uDirIon: { value: new THREE.Vector3(1, 0, 0) },
        uTauIon: { value: TAU_DOS_IONS },
        uAcIon: { value: ACELERACAO_DOS_IONS * MU },
        uVsw: { value: VENTO_SOLAR },
        uCam: { value: new THREE.Vector3() },
        uFoco: { value: 1 },
        uAuPc: { value: AU_PC },
        uDose: { value: 0 },
        uFase: { value: 0 },
        uPerto: { value: 0 },
        uRin: { value: 1 },
        uExpo: { value: 1 },
        uExpoIon: { value: 1 },
        uColuna: { value: 0 },
        uPiso: { value: 0 },
      },
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
      depthWrite: false,
      depthTest: true,
      transparent: true,
    });
    const pontos = new THREE.Points(this.geometria, material);
    pontos.renderOrder = 7;
    const grupo = new THREE.Group();
    grupo.matrixAutoUpdate = false;
    grupo.add(pontos);
    let nucleo: THREE.Mesh | null = null;
    if (c.nucleo.km) {
      const raio = c.nucleo.km / 2 / AU_KM;
      nucleo = new THREE.Mesh(
        this.esferaFina,
        new THREE.ShaderMaterial({
          vertexShader: NUCLEO_VERT,
          fragmentShader: NUCLEO_FRAG,
          uniforms: {
            uSol: { value: new THREE.Vector3(1, 0, 0) },
            uLuz: { value: ALBEDO_DO_NUCLEO * EXPOSICAO_DO_NUCLEO },
          },
        })
      );
      nucleo.scale.setScalar(raio);
      nucleo.visible = false;
      grupo.add(nucleo);
    }
    const coma = new THREE.Mesh(
      this.esfera,
      new THREE.ShaderMaterial({
        vertexShader: COMA_VERT,
        fragmentShader: COMA_FRAG,
        uniforms: {
          uCamKm: { value: new THREE.Vector3() },
          uRinKm: { value: 1 },
          // o raio mínimo do torrão (ver NUCLEO_VERT); o resto do corpo
          // esconde a coma pelo teste de profundidade
          uNucKm: { value: c.nucleo.km ? (0.6 * c.nucleo.km) / 2 : 0 },
          uRhat: { value: new THREE.Vector3(1, 0, 0) },
          uKd: { value: 0 },
          uKg: { value: 0 },
          uLP: { value: 1 },
          uLD: { value: 2 },
          uPassos: { value: PASSOS_DA_COMA.cinema },
          uEixoIon: { value: new THREE.Vector3(1, 0, 0) },
          uKi: { value: 0 },
          uAIonKm: { value: 1 },
          uS0Km: { value: 1 },
          uColuna: { value: 0 },
        },
        side: THREE.BackSide,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
        blendEquation: THREE.AddEquation,
        depthWrite: false,
        depthTest: true,
        transparent: true,
      })
    );
    coma.renderOrder = 7;
    coma.visible = false;
    grupo.add(coma);
    this.group.add(grupo);
    const novo = { cometa: c, grupo, pontos, material, nucleo, coma, jdEscrito: Number.NaN };
    this.vivos.set(c.id, novo);
    return novo;
  }

  update(q: QuadroDasCaudas) {
    const n = PARTICULAS_POR_TIER[q.tier];
    this.particulasDesenhadas = 0;
    // a geometria é uma só: o alcance vale para todos os acesos; o apagado
    // se esconde pela própria visibilidade (`pontos.visible`)
    this.geometria.setDrawRange(0, n);
    for (const c of COMETAS) {
      const s = q.ligado && q.noAtlas && Number.isFinite(q.jd) ? estadoDoCometa(c.id, q.jd) : null;
      let vivo = this.vivos.get(c.id);
      // ACESO? a coma agora ou a poeira solta nos últimos 60 dias
      const r = s ? Math.hypot(s[0], s[1], s[2]) : Infinity;
      let aceso = s !== null && brilhoRelativo(c, r) > LIMIAR_DE_ATIVIDADE;
      if (s && !aceso && r < 12) {
        const antes = estadoDoCometa(c.id, q.jd - TAU_DA_POEIRA);
        if (antes) aceso = brilhoRelativo(c, Math.hypot(antes[0], antes[1], antes[2])) > LIMIAR_DE_ATIVIDADE;
      }
      const temNucleo = s !== null && q.foco === c.id && vivo?.nucleo !== null;
      if (!s || (!aceso && !temNucleo && q.foco !== c.id)) {
        if (vivo) vivo.grupo.visible = false;
        continue;
      }
      vivo ??= this.criar(c);
      vivo.grupo.visible = true;
      this.escrever(vivo, s, q, aceso ? n : 0);
      if (aceso) this.particulasDesenhadas += n;
    }
  }

  private escrever(v: CometaNaCena, s: number[], q: QuadroDasCaudas, n: number) {
    const u = v.material.uniforms;
    // a matriz: UA eclíptica do núcleo → cena (equatorial, pc)
    naCena(s[0], s[1], s[2], _v);
    _m.makeBasis(EX, EY, EZ).setPosition(_v);
    v.grupo.matrix.copy(_m);
    v.grupo.matrixWorldNeedsUpdate = true;
    if (v.jdEscrito !== q.jd) {
      v.jdEscrito = q.jd;
      (u.uPos.value as THREE.Vector3).set(s[0], s[1], s[2]);
      const P = u.uLibP.value as THREE.Vector3[];
      const V = u.uLibV.value as THREE.Vector3[];
      for (let k = 0; k < AMOSTRAS; k++) {
        const a = k / (AMOSTRAS - 1);
        const e = k === 0 ? s : estadoDoCometa(v.cometa.id, q.jd - TAU_DA_POEIRA * a * a);
        if (!e) continue;
        P[k].set(e[0], e[1], e[2]);
        V[k].set(e[3], e[4], e[5]);
      }
      // a direção da cauda de íons: o vento radial visto do cometa
      const r = Math.hypot(s[0], s[1], s[2]);
      (u.uDirIon.value as THREE.Vector3)
        .set((VENTO_SOLAR * s[0]) / r - s[3], (VENTO_SOLAR * s[1]) / r - s[4], (VENTO_SOLAR * s[2]) / r - s[5])
        .normalize();
      u.uFase.value = (q.jd - 2_451_545) % 3650;
      eixoDosIonsNovos(u.uDirIon.value as THREE.Vector3, u.uFase.value as number, (v.coma.material as THREE.ShaderMaterial).uniforms.uEixoIon.value as THREE.Vector3);
      if (v.nucleo) {
        (v.nucleo.material as THREE.ShaderMaterial).uniforms.uSol.value.set(-s[0] / r, -s[1] / r, -s[2] / r);
      }
    }
    _inv.copy(_m).invert();
    (u.uCam.value as THREE.Vector3).copy(q.camera.position).applyMatrix4(_inv);
    u.uFoco.value = q.alturaPx * q.camera.projectionMatrix.elements[5] * 0.5;
    // GRÃO MAIOR, MENOS GRÃOS não vale aqui (o borrão já é geométrico):
    // a luz total se conserva pelo peso — tier menor, cada um pesa mais
    u.uDose.value = GANHO * escalaDoBrilho(v.cometa.brilho.M1) * (MAXIMO / Math.max(n, 1));
    v.pontos.visible = n > 0;
    this.escreverComaDePerto(v, s, n, q.tier);
    if (v.nucleo) v.nucleo.visible = q.foco === v.cometa.id;
  }

  /** a coma de perto: o regime pela distância da câmera, e as constantes
   *  da integral pela mesma lei dos borrões (ver `COMA_FRAG`) */
  private escreverComaDePerto(v: CometaNaCena, s: number[], n: number, tier: QualityLevel) {
    const u = v.material.uniforms;
    const cam = u.uCam.value as THREE.Vector3;
    const dKm = cam.length() * AU_KM;
    const { perto, raioKm } = regimeDePerto(dKm);
    // longe: peso 1 exato nos borrões (e o raio nunca 0 — smoothstep de
    // bordas iguais é indefinido, a armadilha do NaN)
    u.uPerto.value = n > 0 ? perto : 0;
    u.uRin.value = Math.max(raioKm, 1) / AU_KM;
    const rr = Math.hypot(s[0], s[1], s[2]);
    const atividade = brilhoRelativo(v.cometa, rr);
    const correcao = correcaoPelaAtividade(dKm, atividade);
    u.uExpo.value = exposicaoDePerto(dKm) * correcao;
    u.uExpoIon.value = exposicaoDosIons(dKm) * correcao;
    const prod = producaoRelativa(rr, v.cometa.brilho.K1);
    // o brilho de coluna esperado da poeira (o ombro): a integral da coma
    // de perto sem o peso da troca, ∫ f ds ≈ ¼ (f médio 1/4π, π/ρ)
    const v0 = KM_S_EM_UA_DIA;
    const coluna =
      ((u.uDose.value as number) * 1e-6 * KAPPA * (u.uExpo.value as number) * n * 5) / 8 *
      ((3 * prod * Math.sqrt(rr)) / (v0 * rr * rr)) / 4;
    // o ombro e o piso saem de longe da cabeça, ∝ (D/D₀)^−3
    const longe = Math.max(1, dKm / (OMBRO_KC * raioDaCabecaKm(atividade))) ** 3;
    u.uColuna.value = coluna / longe;
    u.uPiso.value = (PISO_DA_CABECA * cam.length()) / longe;
    v.coma.visible = n > 0 && perto > 0;
    if (!v.coma.visible) return;
    const cu = (v.coma.material as THREE.ShaderMaterial).uniforms;
    cu.uColuna.value = u.uColuna.value;
    v.coma.scale.setScalar(Math.max(raioKm, 1) / AU_KM);
    (cu.uCamKm.value as THREE.Vector3).copy(cam).multiplyScalar(AU_KM);
    cu.uRinKm.value = Math.max(raioKm, 1);
    cu.uPassos.value = PASSOS_DA_COMA[tier];
    (cu.uRhat.value as THREE.Vector3).set(s[0] / rr, s[1] / rr, s[2] / rr);
    // o feixe de íons: a mesma lei do sorteio (ver `COMA_FRAG`), 2/8 das
    // partículas, a = 60·μ/r² (UA/dia²)
    const aUa = (ACELERACAO_DOS_IONS * MU) / (rr * rr);
    cu.uAIonKm.value = aUa * AU_KM;
    cu.uS0Km.value = 0.5 * aUa * AU_KM * TAU0_DOS_IONS ** 2;
    const doseIon = (u.uDose.value as number) * 1e-6 * KAPPA * perto * (u.uExpoIon.value as number);
    cu.uKi.value = ((doseIon * n * 2) / 8) * ((2 * prod) / (rr * rr * aUa)) * AU_KM;
    // uDose já traz MAXIMO/n: a dose vezes as partículas do tipo não depende do tier
    const dose = (u.uDose.value as number) * 1e-6 * KAPPA * perto * (u.uExpo.value as number);
    cu.uKd.value = ((dose * n * 5) / 8) * ((3 * prod * Math.sqrt(rr)) / (v0 * rr * rr));
    const vg = (0.85 * KM_S_EM_UA_DIA) / Math.sqrt(rr);
    cu.uKg.value = (dose * n) / 8 * ((0.3 * prod) / (vg * rr * rr));
    cu.uLP.value = 2.2e4 * rr * rr;
    cu.uLD.value = 6.6e4 * rr * rr;
  }

  /**
   * A SUPERFÍCIE DO NÚCLEO EM FOCO, para o near plane (o molde de
   * `palco.superficieMaisProxima`): sem ela o near seguiria a distância
   * ao Sol (0,4 %, ~360 mil km perto do periélio de Halley) e cortaria o
   * núcleo e a coma de perto. Núcleo sem tamanho medido entra com 1 km —
   * só para o anteparo, nada é desenhado com ele. `null` sem foco.
   */
  superficieDoFoco(camPos: THREE.Vector3, foco: string | null): { dSuperficiePc: number; raioPc: number } | null {
    const v = foco ? this.vivos.get(foco) : undefined;
    if (!v || !v.grupo.visible) return null;
    const raioPc = ((v.cometa.nucleo.km ?? 2) / 2 / AU_KM) * AU_PC;
    _v.setFromMatrixPosition(v.grupo.matrix);
    return { dSuperficiePc: Math.max(_v.distanceTo(camPos) - raioPc, 0), raioPc };
  }

  dispose() {
    this.geometria.dispose();
    this.esfera.dispose();
    this.esferaFina.dispose();
    for (const v of this.vivos.values()) {
      v.material.dispose();
      (v.nucleo?.material as THREE.Material | undefined)?.dispose();
      (v.coma.material as THREE.Material).dispose();
    }
    this.vivos.clear();
  }
}
