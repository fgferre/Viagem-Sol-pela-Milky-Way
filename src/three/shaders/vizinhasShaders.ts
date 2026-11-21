// ============================================================
// O DESENHO DAS GALÁXIAS VIZINHAS (pilar 3, 12/11/2026) — irmão do
// GALAXY_VERT da Via Láctea, sem tocar nele: a MESMA lei de tela (o
// ponto sub-pixel deposita luz ∝ tamanho²/distância², ou seja, brilho de
// superfície que não depende da distância), o MESMO perfil do ponto
// (GALAXY_FRAG) e a mesma extinção cromática; muda a poeira, que é a
// da PRÓPRIA galáxia (o τ⊥ no plano dela, integrado pela camada de
// gaussiana exata, por erf), e o primeiro plano da Via Láctea, que é
// medido (A_V do NED) e entra como número.
//
// O PLANO DE LONGE: Andrômeda mora a 761 kpc, além do far da cena; o
// ponto que passa do far é puxado para dentro dele no clip (z = w·(1−ε)),
// sem mexer no far de ninguém — profundidade não é escrita (aditivo), e
// o teste contra um corpo opaco na frente continua valendo.
// ============================================================
import { GLSL_LEI_DE_TELA_NA_REGUA } from '../estrela';

export const VIZINHAS_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;

uniform vec3 uCamLocal;   // a câmera relativa ao centro (float64 na CPU)
uniform float uScreenH;
uniform float uTanHalfFov;
uniform float uGanho;
uniform float uTauFg;     // τ_V do primeiro plano da Via Láctea
uniform sampler2D uTau;
uniform float uTauMax;    // 0 = sem poeira própria
uniform float uMeia;
uniform float uSigma;
uniform vec3 uEu;
uniform vec3 uEv;
uniform vec3 uEn;

varying vec3 vColor;
varying float vAlpha;

${GLSL_LEI_DE_TELA_NA_REGUA}

float erfAprox(float x) {
  float a = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * a);
  float y = 1.0 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * exp(-a * a);
  return sign(x) * y;
}

void main() {
  vec3 toCam = uCamLocal - position;
  float dist = length(toCam);
  // o FUNDO (estrelas velhas não resolvidas) viaja no milhar do tamanho
  float fundo = step(1000.0, aSize);
  float px = (aSize - 1000.0 * fundo) * uScreenH / (2.0 * uTanHalfFov * max(dist, 1.0));
  float escritoPx, fluxoDaTela;
  leiDeTelaNaRegua(px, uScreenH, escritoPx, fluxoDaTela);
  // o fundo deposita a MESMA luz numa pegada mínima de 3 px (na régua de
  // 1080): é luz integrada de milhões de estrelas, não estrela — sem isto,
  // com 1–2 partículas por pixel, o disco vira areia (o mesmo achado do
  // modo só-partículas da Via Láctea, PLAN-GALAXIA.md, ensaio 4)
  float piso = 3.0 * max(uScreenH, 1.0) / 1080.0;
  if (fundo > 0.5 && escritoPx < piso) {
    fluxoDaTela *= (escritoPx * escritoPx) / (piso * piso);
    escritoPx = piso;
  }

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // além do far: puxa para dentro (ver o cabeçalho; na profundidade
  // invertida o far é z = 0: \`core/profundidade.ts\`)
  #ifdef USE_REVERSED_DEPTH_BUFFER
  if (gl_Position.z < 0.0) gl_Position.z = 0.0;
  #else
  if (gl_Position.z > gl_Position.w) gl_Position.z = gl_Position.w * 0.999999;
  #endif
  gl_PointSize = escritoPx;
  vColor = vec3(0.0);
  vAlpha = 0.0;
  if (gl_Position.w <= 0.0) return;
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float margemY = (escritoPx + 4.0) / uScreenH;
  float margemX = margemY * projectionMatrix[0][0] / projectionMatrix[1][1];
  if (abs(ndc.x) > 1.0 + margemX || abs(ndc.y) > 1.0 + margemY) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  // a poeira própria: da partícula à câmera, só o trecho dentro de ±4σ
  float tau = uTauFg;
  if (uTauMax > 0.0) {
    float zP = dot(position, uEn);
    float zC = dot(uCamLocal, uEn);
    float dz = zC - zP;
    float lim = 4.0 * uSigma;
    float s0 = 0.0;
    float s1 = 1.0;
    if (abs(dz) > 1e-3) {
      float ta = (-lim - zP) / dz;
      float tb = (lim - zP) / dz;
      s0 = clamp(min(ta, tb), 0.0, 1.0);
      s1 = clamp(max(ta, tb), 0.0, 1.0);
    } else if (abs(zP) > lim) {
      s1 = 0.0;
    }
    if (s1 > s0) {
      const int N = 16;
      float ds = (s1 - s0) / float(N);
      float k = 1.0 / (1.41421356 * uSigma);
      for (int i = 0; i < N; i++) {
        float sa = s0 + ds * float(i);
        float sm = sa + 0.5 * ds;
        vec3 p = position + toCam * sm;
        vec2 uv = vec2(dot(p, uEu), dot(p, uEv)) / (2.0 * uMeia) + 0.5;
        float tp = texture2D(uTau, uv).r * uTauMax;
        float za = zP + dz * sa;
        float zb = za + dz * ds;
        // ∫ρ ds sobre o trecho: pela erf quando ele atravessa a camada;
        // de raspão (Δz → 0) é ρ(z)·comprimento
        float trecho = ds * dist;
        float camada = abs(zb - za) > 1e-3 * uSigma
          ? 0.5 * abs(erfAprox(zb * k) - erfAprox(za * k)) * trecho / abs(zb - za)
          : exp(-0.5 * za * za / (uSigma * uSigma)) / (2.5066283 * uSigma) * trecho;
        tau += tp * camada;
      }
    }
  }
  float chromSat = 1.0 - exp(-tau * 0.5);
  vec3 extinto = exp(-tau * mix(vec3(0.75, 1.0, 1.32), vec3(1.0), chromSat));
  vColor = aColor * extinto;
  vAlpha = aAlpha * uGanho * fluxoDaTela;
  if (max(vColor.r, max(vColor.g, vColor.b)) * vAlpha < 1e-4) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;
