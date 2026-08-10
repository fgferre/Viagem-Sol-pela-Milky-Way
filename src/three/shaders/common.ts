// ============================================================
// Chunks GLSL compartilhados — ruído, plano galáctico real,
// função de densidade da nebulosa e cor de corpo negro.
// ============================================================
import { WORLD } from '../config';

export const GLSL_NOISE = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

float fbm(vec3 p, int oct) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= oct) break;
    s += a * vnoise(p);
    p = p * 2.03 + vec3(11.7, 5.1, 7.9);
    a *= 0.5;
  }
  return s;
}

`;

// Base galactocêntrica completa no referencial da cena (mesma base
// EX/EY/EZ de world/galaxy.ts, conferida numericamente a 6e-8):
// GAL_N = polo norte galáctico, GAL_X = centro→Sol, GAL_Y = l=270°,
// GAL_CENTER = posição do centro galáctico na cena (pc).
export const GLSL_GALAXY = /* glsl */ `
const vec3 GAL_N = vec3(-0.867666149, -0.198076373, 0.455983776);
const vec3 GAL_CENTER = vec3(-442.464, -7117.423, -3945.763);
const vec3 GAL_X = vec3(0.0548756, 0.8734371, 0.4838350);
const vec3 GAL_Y = vec3(-0.4941094, 0.4448296, -0.7469822);
`;

// ?corewall= desloca cada núcleo do corredor ao longo da PRÓPRIA direção,
// somando N pc à distância do Sol — l, b e raio físico ficam intactos.
// 0 = as posições de `WORLD.nebulaCores`; **−130 devolve o corredor da
// rodada 33** (o que começava dentro da Bolha Local).
const COREWALL = (() => {
  if (typeof window === 'undefined') return 0;
  const v = parseFloat(new URLSearchParams(window.location.search).get('corewall') ?? '');
  return Number.isFinite(v) ? v : 0;
})();
const pushCore = (c: readonly number[]): number[] => {
  const d = Math.hypot(c[0], c[1], c[2]);
  const k = (d + COREWALL) / d;
  return [c[0] * k, c[1] * k, c[2] * k, c[3]];
};

/** Núcleo `i` do corredor já deslocado — a posição que o shader usa. */
export const corridorCore = (i: number): number[] => pushCore(WORLD.nebulaCores[i]);

// Constrói a função de densidade com os núcleos de nuvem injetados
// como constantes (evita uniforms extras e permite otimização do driver).
function coresGLSL(): string {
  // O gate espacial vem ANTES dos 2 fbm de cada núcleo: fora de ~3
  // raios (g < 6e-7, invisível) a amostra custa uma subtração e um
  // dot — sem ele, os 7 núcleos eram ~80% do custo do raymarch
  // (medido por timer de GPU: 75–80 ms/frame em t=0/85).
  return WORLD.nebulaCores
    .map(pushCore)
    .map(
      (c, i) =>
        `  { vec3 q = (p - vec3(${c[0].toFixed(2)}, ${c[1].toFixed(2)}, ${c[2].toFixed(2)})) / ${c[3].toFixed(2)};
     float q2 = dot(q, q);
     if (q2 < 9.0) {
       float g = exp(-q2 * 1.6);
       // bolsões densos separados por vãos + detalhe fino (~3 pc)
       float core = g * (0.04 + 1.5 * smoothstep(0.50, 0.85, fbm(p * 0.09 + ${(i * 13.7).toFixed(1)}, oct)));
       core *= 0.50 + 0.95 * fbm(p * 0.30 + ${(i * 7.31).toFixed(1)}, 2);
       d += core * 0.95;
     } }`
    )
    .join('\n');
}

// Variante COMPLETA (só o raymarch da nebulosa): envelope
// galactocêntrico via canais B/A do dust map (braços/warp bakeados
// — 1 fetch no lugar de ~40 transcendentais POR AMOSTRA) + nuvens-
// semente do catálogo. Requer GLSL_GALAXY e GLSL_CARTOGRAPHY antes.
export const GLSL_DENSITY = /* glsl */ `
uniform sampler2D uDustMap; // RGBA: poeira APOGEE + braços/warp bakeados
// Nuvens-semente do catálogo CO perto da câmera (0 = desligado).
uniform int uSeedCloudCount;
uniform vec4 uSeedClouds[32];   // xyz = posição na cena (pc), w = raio
uniform float uSeedCloudAmp[32];
// Cavidade do observador (superbolhas são onipresentes: qualquer
// ponto do disco está dentro de uma). 0 perto do Sol — lá a Bolha
// Local e os núcleos artísticos do corredor assumem.
uniform vec3 uCavityPos;
uniform float uCavityGate;

// Envelope do gás molecular galáctico: perfil radial exponencial,
// camada vertical FINA (h≈55 pc, flare no disco externo — o gás é
// mais fino que as estrelas), concentrado nos braços. Normalizado
// para ≈1 na vizinhança solar.
float diskGasEnvelope(vec3 p) {
  vec3 q = p - GAL_CENTER;
  float z = dot(q, GAL_N);
  vec2 xy = vec2(dot(q, GAL_X), dot(q, GAL_Y));
  float radiusPc = length(xy);
  // braços (B) e warp (A) pré-computados a 65 pc/texel
  vec4 cart = texture2D(uDustMap, xy / (2.0 * GAL_DISK_RADIUS) + 0.5);
  float zw = z - (cart.a * 2.0 - 1.0) * 820.0;
  float flare = clamp((radiusPc - 7500.0) / 9300.0, 0.0, 1.0);
  flare *= flare;
  // gaussiano FINO (σ 70→260 pc com flare): fino como o gás
  // molecular real, mas plano perto do plano — a exponencial tinha
  // cúspide que apagava o corredor local (z ≈ ±20 pc)
  float h = mix(70.0, 260.0, flare);
  float radial = exp(-radiusPc / 5200.0) *
    (1.0 - smoothstep(15500.0, GAL_DISK_RADIUS, radiusPc));
  // braços carregam as nuvens; inter-braço é limpo
  float arms = 0.15 + 0.85 * cart.b;
  // normaliza para ≈1 na vizinhança solar (R=8150, braço Local)
  return radial * exp(-zw * zw / (2.0 * h * h)) * arms * 6.9;
}

// último envelope avaliado — o loop do raymarch reusa em vez de
// pagar o fetch + ALU de diskGasEnvelope duas vezes pela mesma p
float gGasEnvelope = 0.0;

// Intervalo em t onde ALGUMA nuvem-semente pode contribuir, calculado UMA
// vez por raio em vez de uma vez por amostra. O laço lá embaixo roda
// uSeedCloudCount iterações em CADA amostra e isso custa **1,20 ms dos
// 9,12 do raymarch (13%)**, medido por sonda — enquanto em t=100 nenhuma
// das 32 nuvens escolhidas encosta no raio.
// Conservador por construção: a nuvem só entra em d2c < 5.5, ou seja
// |p−c| < √5,5·r, e o intervalo é a UNIÃO das interseções raio-esfera desse
// raio. Dilatado em 1 pc porque p = ro + rd·t acumula erro de ponto
// flutuante que a forma analítica não vê: falso positivo custa só GPU,
// falso negativo apagaria nuvem e mudaria a imagem.
float gSeedLo = 1e9;
float gSeedHi = -1e9;

void seedSpan(vec3 ro, vec3 rd) {
  gSeedLo = 1e9;
  gSeedHi = -1e9;
  for (int i = 0; i < 32; i++) {
    if (i >= uSeedCloudCount) break;
    vec3 c = uSeedClouds[i].xyz - ro;
    float r = max(uSeedClouds[i].w, 8.0);
    float r2 = 5.5 * r * r;
    float tc = dot(c, rd);
    float h2 = dot(c, c) - tc * tc;
    if (h2 < r2) {
      float semi = sqrt(r2 - h2);
      gSeedLo = min(gSeedLo, tc - semi - 1.0);
      gSeedHi = max(gSeedHi, tc + semi + 1.0);
    }
  }
}

float nebulaDensity(vec3 p, int oct, float t) {
  // uCavityPos É a posição da câmera — director.ts passa a mesma
  // cam.position que vira uCamPos —, logo esta distância é o próprio t
  // do laço, que a função recalculava por amostra lá no fim. Com o portão em
  // 1 (dHome > 1300 pc, Ato III em diante) o trecho de 0 a 25 pc tem
  // densidade ZERO provada: smoothstep(25, 240, cav) satura em 0 e
  // mix(1, 0, 1) zera tudo, inclusive nuvens-semente e núcleos, porque o
  // fator multiplica o d final. E a amostragem quadrática põe ~20% dos
  // passos justamente aí. Bit-exato: quem sai por aqui sairia 0 no fim, e
  // gGasEnvelope só é lido dentro de d > 0.003. Medido: −1,43 ms em
  // t=180 (8,797 → 7,369), zero em t=100 e t=140, onde o portão está fechado.
  vec3 cav0 = p - uCavityPos;
  if (uCavityGate >= 1.0 && dot(cav0, cav0) <= 625.0) return 0.0;
  float envelope = min(diskGasEnvelope(p), 3.0);
  gGasEnvelope = envelope;
  // Vácuo. O teste uSeedCloudCount == 0 era conservador demais: bastava UMA
  // nuvem no pool, em qualquer lugar do céu, para toda amostra de envelope
  // vazio seguir pagando n1, n2, clumps, núcleos e lanes até o fim. O que a
  // guarda precisa saber não é se EXISTE nuvem, e sim se alguma alcança ESTA
  // amostra — e o span do seedSpan já responde isso uma vez por raio. É o
  // mesmo teste que gateia o laço lá embaixo, então quem sai por aqui sairia
  // com d <= 0,003 de qualquer forma e o teste d > 0.003 do raymarch
  // descartaria: mesma exatidão da guarda que já estava aqui.
  if (envelope < 0.004 && (uSeedCloudCount == 0 || t < gSeedLo || t > gSeedHi)) return 0.0;
  float n1 = fbm(p * 0.0135, oct >= 4 ? 4 : 2);
  float n2 = fbm(p * 0.048 + 17.3, oct >= 4 ? 3 : 2);
  // grumos raros e compactos — gás molecular ocupa ≪1% do volume
  float clumps = smoothstep(0.50, 0.90, n1 * 0.70 + n2 * 0.30);
  float d = envelope * clumps * 0.75;
${coresGLSL()}
  // nuvens-semente reais: metaballs com subestrutura FBM. O corte
  // por distância vem ANTES do exp/fbm: por amostra, quase sempre
  // só 0–2 nuvens passam — o resto custava uma subtração e um dot, e
  // essas subtrações somavam 13% do raymarch. seedSpan já provou, uma
  // vez por raio, que fora deste intervalo nenhuma nuvem alcança.
  if (t >= gSeedLo && t <= gSeedHi) {
    for (int i = 0; i < 32; i++) {
      if (i >= uSeedCloudCount) break;
      vec3 cq = (p - uSeedClouds[i].xyz) / max(uSeedClouds[i].w, 8.0);
      float d2c = dot(cq, cq);
      if (d2c < 5.5) {
        float g = exp(-d2c * 1.4);
        // fase pela IDENTIDADE da nuvem (posição estável), nunca pelo
        // slot do array — o rank muda a cada refresh de proximidade
        float phase = hash13(uSeedClouds[i].xyz) * 118.3;
        float subst =
          0.35 + 1.35 * smoothstep(0.45, 0.85, fbm(p * 0.11 + phase, 2));
        d += g * uSeedCloudAmp[i] * subst;
      }
    }
  }
  // Zero é zero: daqui para baixo só há MULTIPLICAÇÃO (lanes, Bolha Local,
  // cavidade, gasDensity), então a amostra que chega aqui em 0 sai em 0 — e o
  // fbm de 2 oitavas das lanes é o preço de redescobrir isso. Não é caso
  // raro: clumps é um smoothstep(0.50, 0.90) sobre um ruído de média
  // 0,4594, ou seja mais da metade das amostras zera antes de chegar aqui.
  if (d == 0.0) return 0.0;
  float lanes = fbm(p * 0.085 + 41.0, 2);
  d *= mix(0.12, 1.0, smoothstep(0.28, 0.64, lanes));
  // Bolha Local: os primeiros parsecs ao redor do Sol são limpos (real)
  d *= smoothstep(1.2, 6.5, length(p));
  // cavidade do observador itinerante (estilização "inferred"
  // fundamentada: superbolhas de ~300 pc povoam todo o disco)
  float cav = length(p - uCavityPos);
  d *= mix(1.0, smoothstep(25.0, 240.0, cav), uCavityGate);
  return d * ${WORLD.gasDensity.toFixed(2)};
}

`;

// Variante LOCAL barata (estrelas HYG e poeira próxima — camadas
// gated por dHome < 2,3 kpc, onde o envelope galáctico ≈ o slab
// solar): sem fetch de textura, sem nuvens-semente, sem cartografia.
// Restaura o custo de vértice original do campo estelar.
export const GLSL_DENSITY_LOCAL = /* glsl */ `
uniform vec3 uCavityPos;
uniform float uCavityGate;

float nebulaDensity(vec3 p, int oct) {
  // O Sol está 5,5 pc ao norte do plano médio.
  float gp = dot(p, GAL_N) + 5.5;
  float slab = exp(-gp * gp / (2.0 * 95.0 * 95.0));
  float n1 = fbm(p * 0.0135, oct >= 4 ? 4 : 2);
  float n2 = fbm(p * 0.048 + 17.3, oct >= 4 ? 3 : 2);
  float clumps = smoothstep(0.50, 0.90, n1 * 0.70 + n2 * 0.30);
  float d = slab * clumps * 0.75;
${coresGLSL()}
  // mesma guarda da variante completa: só multiplicação daqui para baixo
  if (d == 0.0) return 0.0;
  float lanes = fbm(p * 0.085 + 41.0, 2);
  d *= mix(0.12, 1.0, smoothstep(0.28, 0.64, lanes));
  // Bolha Local: os primeiros parsecs ao redor do Sol são limpos (real)
  d *= smoothstep(1.2, 6.5, length(p));
  // mesma cavidade do raymarch (coerência na faixa dHome 600–2300)
  float cav = length(p - uCavityPos);
  d *= mix(1.0, smoothstep(25.0, 240.0, cav), uCavityGate);
  return d * ${WORLD.gasDensity.toFixed(2)};
}

// Transmissão + avermelhamento aproximados ao longo do raio (extinção interestelar)
vec3 extinction(vec3 from, vec3 to, float baseTau) {
  vec3 dir = to - from;
  float len = length(dir);
  dir /= max(len, 1e-4);
  float tau = 0.0;
  for (int i = 0; i < 6; i++) {
    float t = (float(i) + 0.5) / 6.0;
    tau += nebulaDensity(from + dir * (t * len), 2) * (len / 6.0);
  }
  tau *= baseTau;
  vec3 absorb = exp(-tau * vec3(1.0, 1.65, 2.35)); // azul é extinto primeiro
  return absorb;
}
`;

// A LEI fotométrica do ponto estelar — UMA para todas as camadas que
// desenham estrela resolvida (HYG em starShaders, cascas em
// wrappedStars). Estrela é fonte PONTUAL: a imagem é a PSF do
// instrumento, com sigma fixo em PIXELS; a distância entra só na
// energia, e o disco visível cresce com sqrt(ln E) quando o pico
// satura. Extraída de STAR_VERT na unificação 2 — duplicá-la era
// divergência silenciosa garantida (as cascas antigas tinham uma
// fotometria própria de fluxo→tamanho que apagava estrela ao chegar
// perto).
export const GLSL_STAR_PSF = /* glsl */ `
void starPSF(
  float m, float expoM0, float sigmaPx, float screenH,
  out float size, out float peak, out float sat, out float sigmaFrac
) {
  float sigma = sigmaPx * screenH / 1080.0;
  float E = pow(10.0, -0.4 * (m - expoM0));
  peak = E / (6.2831853 * sigma * sigma);
  float rSat = peak > 1.0 ? sigma * sqrt(2.0 * log(peak)) : 0.0;
  size = 2.0 * (2.2 * sigma + rSat);
  // a saturação é o gatilho FÍSICO dos spikes de difração
  sat = clamp(0.5 * log2(max(peak, 1.0)), 0.0, 1.0);
  sigmaFrac = sigma / max(0.5 * size, 1e-4);
}
`;

// Cor estelar: Planck × CIE 1931 → sRGB linear, normalizado a Y = 1.
//
// As cinco âncoras pintadas à mão que existiam aqui tinham dois defeitos
// que se somavam: nenhuma delas punha o verde abaixo da média de R e B
// (logo NENHUMA estrela do projeto podia puxar para o púrpura), e as
// cinco tinham luminância quase igual (Y entre 0,69 e 0,98) — então a
// cor não modulava o brilho, que é metade do que faz um campo estelar
// real ter faixa dinâmica. O ajuste quadrático abaixo tem RMS 0,010 de
// 2500 K a 40000 K e custa 3 mads contra 4 mix + 4 smoothstep: é mais
// barato que o que substitui.
export const GLSL_STAR_COLOR = /* glsl */ `
vec3 blackbodyLinear(float T) {
  float u = clamp(5000.0 / T, 0.125, 2.0);
  return vec3(0.640 + 0.420 * u + 0.150 * u * u,
              0.980 + 0.080 * u - 0.100 * u * u,
              2.300 - 1.980 * u + 0.450 * u * u);
}

// Ballesteros 2012: B−V → T_eff. Erra acima de ~10.000 K (B−V = −0,30
// devolve 16.600 K em vez dos ~30.000 K de uma O), o que afeta ~100 das
// 18.543 do HYG — todas já no extremo azul, onde a cor satura.
vec3 bvToColor(float bv) {
  float t = 4600.0 * (1.0 / (0.92 * bv + 1.70) + 1.0 / (0.92 * bv + 0.62));
  return blackbodyLinear(t);
}
`;

/**
 * Espelho CPU de `blackbodyLinear`, mesmo polinômio. Fica coladinho no GLSL
 * de propósito: as cores das partículas da galáxia são decididas na CPU no
 * build e as das lâminas no shader — se as duas fórmulas se separarem em
 * arquivos distintos, divergem em silêncio e ninguém vê.
 */
export function blackbodyLinear(T: number): [number, number, number] {
  const u = Math.min(2, Math.max(0.125, 5000 / T));
  return [
    0.64 + 0.42 * u + 0.15 * u * u,
    0.98 + 0.08 * u - 0.1 * u * u,
    2.3 - 1.98 * u + 0.45 * u * u,
  ];
}

/**
 * Espelho CPU de `bvToColor`, mesma fórmula (Ballesteros 2012), mesmo
 * contrato anti-divergência do espelho acima. Consumidor: a cor das
 * heroes e do SunStar é decidida na CPU uma vez, na construção — com
 * este espelho elas obedecem à MESMA lei do catálogo (Onda 1b).
 */
export function bvToColor(bv: number): [number, number, number] {
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  return blackbodyLinear(t);
}

/**
 * Emissão de região H II em sRGB linear, Y = 1: Hα 656 nm e [N II] dominam o
 * vermelho, [O III] 501 nm e Hβ levantam o azul-verde. O verde fica ABAIXO da
 * média de R e B — é essa a assinatura do púrpura, e é o único componente da
 * cena que a tem forte (purp = +0,303 contra +0,164 de uma O/B).
 */
export const POP_HII: [number, number, number] = [1.664, 0.807, 0.957];
