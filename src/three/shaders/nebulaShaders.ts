// ============================================================
// Shaders da nebulosa volumétrica — raymarching em tela cheia
// com dupla paleta (OIII × H-alfa), espalhamento do Sol e luz
// das supergigantes Betelgeuse/Rigel embutidas nas nuvens.
// ============================================================
import { WORLD } from '../config';
import { GLSL_CARTOGRAPHY } from '../cartography/galacticModel';
import { GLSL_NOISE, GLSL_GALAXY, GLSL_DENSITY, corridorCore } from './common';
import { GLSL_UNRESOLVED } from '../world/wrappedStars';

const cool = WORLD.gasColorCool.map((v) => v.toFixed(3)).join(', ');
const warm = WORLD.gasColorWarm.map((v) => v.toFixed(3)).join(', ');

const qnum = (k: string, d: number) => {
  if (typeof window === 'undefined') return d;
  const v = parseFloat(new URLSearchParams(window.location.search).get(k) ?? '');
  return Number.isFinite(v) ? v : d;
};
// A POEIRA da faixa mora na camada de GÁS, não na das estrelas: mesma
// altura de escala que `diskGasEnvelope` já usa no raymarch (70 pc, com
// flare) em vez dos 210 pc do disco fino estelar. ?dusth= varre; 210
// devolve o estado anterior à rodada 32.
const DUSTH = qnum('dusth', 70);
const DH0 = DUSTH.toFixed(1);
const DH1 = (DUSTH * (460 / 210)).toFixed(1);
// Extinção DIFUSA da faixa, em A_V mag/kpc no plano ao raio solar
// (?bandav=). O fator 2,6316 = 1/(1000 · 1,0857 · 0,00035) converte
// mag/kpc nas unidades de `dust` do integrador.
// **DESLIGADA na rodada 37, e a razão é a régua.** O 0,15 das rodadas
// 32/33 foi dosado contra o termo de fenda ESCALAR, que era cego ao lugar
// do vale: esta componente axissimétrica cavava uma fenda em b ≈ 0 em
// TODA longitude e marcava ponto por isso. Com o termo comparando a curva
// por longitude, ela passou a ser um defeito medido — é ela que cava o
// centro galáctico (l = ±4°: 0,76/0,81 contra −0,16/−0,11 da foto), onde
// a foto não tem vale nenhum. A coluna que a faixa precisa agora vem de
// onde ela vem de verdade: nuvens. **?riftav=0&bandav=0.15 devolve o
// estado da rodada 36 EXATO** (mesmo GLSL, conferido por md5).
// **RE-DOSADA E FECHADA na rodada 39: zero é o ótimo, e não por pouco.**
// Sete doses medidas (0 · 0,02 · 0,03 · 0,05 · 0,07 · 0,10 · 0,15) dão
// skyError 0,8874 · 0,8977 · 0,8928 · 0,8974 · 0,9072 · 0,9236 · 0,9506 —
// monótono. A troca é sempre a mesma: a coluna difusa compra `perfil` e
// `purpura` (juntos ~0,022 até 0,15) e paga `espessura` e `cor` (juntos
// ~0,097), quatro a um. Nenhum `dustrd` reverte o sinal (medido).
// **E a "dívida física" de manter 0 é retórica: o modelo integra ~0,01
// mag/kpc de `dustProc` no plano, então 0,15 já era 10× menor que o
// ~1,5 mag/kpc do meio real.** A LUT é limitada por EMISSÃO, não por
// extinção — a calibração de `light` não é absoluta —, então não há
// âncora de literatura que decida este knob e o gate decide sozinho.
// Fechar a conta de verdade é a unificação 3 (κ e Σ absolutos), não uma dose.
const BANDAV = qnum('bandav', 0);
const DIFFUSE = (BANDAV * 2.6316).toFixed(4);
// A poeira do disco tem escala radial PRÓPRIA, mais curta que a das
// estrelas: o código herdava os 5200 pc do disco fino estelar sem
// justificativa, e o disco de poeira medido vale h_R ≈ 2,26 kpc
// (Drimmel & Spergel 2001, a partir do COBE/DIRBE). Concentrar a poeira no
// interior põe a extinção a 4–6 kpc de distância, onde a camada de 70 pc
// subtende ~1° em vez dos ~10° da poeira local: fenda funda onde o rift
// mede, barata onde a espessura mede. ?dustrd= varre; 5200 devolve o
// estado da rodada 32.
// **CUIDADO, medido na rodada 39: com `bandav = 0` este knob é INERTE** —
// ele só multiplica `dustDiffuse`, e `dustProc` (a única poeira viva hoje)
// carrega `exp(-radius/5200)` FIXO, a escala do disco fino ESTELAR. Ou
// seja: o conserto da rodada 33 ("a poeira tem escala radial própria") foi
// aplicado exatamente à componente que a rodada 37 desligou, e a poeira que
// sobrou segue com a escala das estrelas. `?dustrd=5200` mede 0,8874, os
// cinco termos idênticos à baseline a 4 casas. Dar a DUSTRD ao `dustProc`
// (com a coluna conservada no raio solar) é rodada própria, e a peneira diz
// que ela concentra extinção em |l| < 30, onde já sobra luz — medir antes.
const DUSTRD = qnum('dustrd', 2100).toFixed(1);
// ACHATAMENTO DO BOJO (?bulgeq= = razão de eixos c/a; 1 = esfera = estado
// da rodada 32 EXATO, o mesmo código GLSL). O bojo real é boxy/peanut e
// achatado, não esférico: Wegg & Gerhard 2013 (aglomerado vermelho do VVV)
// mede escalas (700, 440, 180) pc, c/a ≈ 0,26; Dwek 1995 (COBE/DIRBE G2) dá
// 0,23; Kent 1992, mais antigo, 0,6. LUMINOSIDADE CONSERVADA: a massa de
// exp(−m/h) achatado vale ∝ c/a, então a amplitude sobe 1/q — só a FORMA
// muda, como a poeira da rodada 32. Sem a conservação o gate desaba
// (bulgeAnti 3,82 contra 5,07): medido, não suposto.
// **0,30 → 0,26 na rodada 39.** Os 0,3 eram arredondamento; 0,26 é o valor
// que Wegg & Gerhard medem, e o gate concorda: skyError 0,8874 → **0,8783**,
// com o ganho no maior termo (espessura 0,3239 → 0,3097). Curva fechada em
// quatro doses — 0,23 → 0,8790 · 0,26 → 0,8783 · 0,30 → 0,8874 ·
// 0,40 → 0,9124 —, e o mínimo cai em cima da literatura. Achatar além de
// 0,23 (Dwek) só troca espessura por fenda e não é medida de ninguém.
const BULGEQ = qnum('bulgeq', 0.26);
// A GRANDE FENDA (?riftav=; 0 devolve o estado anterior EXATO — o template
// não emite uma linha, provado por md5 face a face). O panorama ESO mostra
// uma cunha escura subindo do plano entre l = +8° e +45°, com o núcleo em
// b ≈ +5°: é o Aquila Rift, poeira LOCAL entre 200 e 700 pc. O nosso céu não
// a tinha — o perfil por longitude era quase SIMÉTRICO (l=+19 vale 2,29 e
// l=−19 vale 2,35) enquanto a foto é 2,6× mais escura do lado positivo.
// Cada nuvem é uma gaussiana esférica em posição FIXA de cena (não segue a
// câmera): (l°, b°, distância pc, raio gaussiano pc, A_V de pico mag).
// Distâncias e A_V da literatura — Straižys 2003 (borda frontal 225±55 pc,
// A_V até 3), Ortiz-León 2017 (W40/Serpens 436±9 pc por VLBA), Su 2020
// (CO 12/13 em l 26–50: 93% da coluna vem de 400–770 pc, não dos 250).
// Dose 1,2 = os A_V da tabela ×1,2 (picos de 1,44 a 2,64 mag), dentro do
// A_V ≤ 3 que Straižys mede. O gate preferia 1,5 por 0,0098 (0,8595 contra
// 0,8693) — não tomado: 1,2 é o valor conservador da literatura E deixa o
// bulgeAnti cravado (0,0022 contra 0,0526 em 1,8). Mesma disciplina do
// `corewall` da rodada 34: a dose vem da física, a nota se aceita como vem.
const RIFTAV = qnum('riftav', 1.2);
const RIFT_CLOUDS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [13.0, 7.0, 260, 30, 1.2],
  [23.0, 5.0, 250, 26, 1.5],
  [32.0, 3.0, 440, 36, 2.2],
  [39.0, 1.5, 650, 42, 1.4],
];
// A coluna é ANALÍTICA e fica FORA do laço de 24 passos: entre 150 e 700 pc
// o laço só tem três amostras (t = 195, 280, 442) e uma nuvem de 30 pc
// cairia entre elas — aliasing garantido, e a fenda piscaria com a câmera.
// A integral de uma gaussiana ao longo do raio fecha em elementar
// (∫ρ dl = ρ₀·σ·√2π·e^(−h²/2σ²)), então guardamos direto o A_V de pico e só
// falta a queda com a distância PERPENDICULAR h ao centro. Aqui a extinção
// é PURA: o `dust` do LUT só atenua, ao contrário do raymarch local, onde a
// mesma `alpha` que apaga também acende. `smoothstep(-σ, σ, t0)` é a fração
// da nuvem que está À FRENTE — ela para de escurecer quando a câmera a
// ultrapassa (o mergulho do ato III passa a ~50 pc da borda).
const riftGLSL = (): string =>
  RIFTAV === 0
    ? ''
    : `  float riftAv = 0.0;\n` +
      RIFT_CLOUDS.map(([l, b, dist, sigma, av]) => {
        const lr = (l * Math.PI) / 180;
        const br = (b * Math.PI) / 180;
        // direção heliocêntrica de (l, b) na base da cena: +GAL_Y aponta
        // para l=270°, logo os coeficientes de GAL_X e GAL_Y são negativos
        // (mesma convenção de galaxy.ts:85 e do builder dos binários)
        const kx = -Math.cos(br) * Math.cos(lr);
        const ky = -Math.cos(br) * Math.sin(lr);
        const kz = Math.sin(br);
        return `  { vec3 c = GAL_X * ${(kx * dist).toFixed(4)} + GAL_Y * ${(ky * dist).toFixed(4)} +
      GAL_N * ${(kz * dist).toFixed(4)} - ro;
    float t0 = dot(c, rd);
    float h2 = max(dot(c, c) - t0 * t0, 0.0);
    riftAv += ${(av * RIFTAV).toFixed(4)} * exp(-h2 * ${(1 / (2 * sigma * sigma)).toExponential(6)}) *
      smoothstep(${(-sigma).toFixed(1)}, ${sigma.toFixed(1)}, t0); }`;
      }).join('\n') +
      // A_V → profundidade óptica: τ = A_V / 1,0857
      `\n  light *= exp(-riftAv * 0.921065);\n`;

// A cavidade H II "hero" é o 5º núcleo do corredor visto por dentro.
const HERO = corridorCore(4);
const SPHEROID =
  BULGEQ === 1
    ? 'exp(-length(q) / 1050.0) * 2.45'
    : `exp(-sqrt(radius * radius + rawZ * rawZ * ${(1 / (BULGEQ * BULGEQ)).toFixed(6)}) / 1050.0) * ${(2.45 / BULGEQ).toFixed(4)}`;

export const NEBULA_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`;

const NEBULA_FRAG_HEAD = /* glsl */ `
precision highp float;

uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uTanHalfFov;
uniform float uAspect;
uniform vec2 uResolution;
uniform float uTime;
uniform int uSteps;
uniform vec3 uSunPos;
uniform float uFade;

// luzes embutidas: Betelgeuse (vermelha) e Rigel (azul)
uniform vec3 uLightPos[2];
uniform vec3 uLightColor[2];

// LUT equiretangular da luz do disco (renderizada 1×/frame em
// 256×128): a integração distante depende só da DIREÇÃO do raio,
// então custa um fetch por pixel em vez de ~20 passos pesados.
uniform sampler2D uBandLUT;
// tile 64×64 de blue noise (blueNoise.ts) — jitter do raymarch
uniform sampler2D uBlueNoise;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_CARTOGRAPHY}
${GLSL_DENSITY}

const vec3 GAS_COOL = vec3(${cool});
const vec3 GAS_WARM = vec3(${warm});

vec3 palette(vec3 p, float d) {
  float m = fbm(p * 0.035 + 7.7, 3);
  float k = smoothstep(0.32, 0.72, m);
  // núcleos densos → H-alfa quente; filamentos tênues → azul de reflexão
  float byDensity = smoothstep(0.15, 1.1, d);
  vec3 col = mix(GAS_COOL, GAS_WARM, clamp(k * 0.55 + byDensity * 0.6, 0.0, 1.0));
  // toques magenta em filamentos densos (H-alfa + SII)
  col = mix(col, vec3(0.62, 0.22, 0.38), smoothstep(0.75, 0.95, m) * byDensity * 0.45);
  return col;
}

// direção → UV equiretangular no referencial galáctico (a costura em
// lon = ±π é resolvida pelo RepeatWrapping horizontal do LUT)
vec2 dirToBand(vec3 rd) {
  float lat = asin(clamp(dot(rd, GAL_N), -1.0, 1.0));
  float lon = atan(dot(rd, GAL_Y), dot(rd, GAL_X));
  return vec2(lon * 0.15915494 + 0.5, lat * 0.31830989 + 0.5);
}
`;

// Integra a luz do disco da Via Láctea ao longo do raio — o equivalente
// procedural de uma exposição astrofotográfica longa. Depende apenas de
// (posição da câmera, direção), então roda UMA vez por frame num LUT
// 256×128 com 24 passos (mais que os 10–20 antigos), não por pixel.
const BAND_INTEGRATION = /* glsl */ `
vec3 integrateGalacticDisk(vec3 ro, vec3 rd) {
  vec3 light = vec3(0.0);
  float transmission = 1.0;
  float previousT = 180.0;

  for (int j = 0; j < 24; j++) {
    float f = (float(j) + 0.62) / 24.0;
    float t = 180.0 + 22000.0 * f * f;
    float dt = max(t - previousT, 1.0);
    previousT = t;

    vec3 p = ro + rd * t;
    vec3 q = p - GAL_CENTER;
    float rawZ = dot(q, GAL_N);
    vec3 inPlane = q - GAL_N * rawZ;
    float radius = length(inPlane);
    float theta = atan(dot(q, GAL_Y), dot(q, GAL_X));
    float z = rawZ - galWarpHeight(radius, theta);
    float flare = clamp((radius - 7500.0) / 9300.0, 0.0, 1.0);
    flare *= flare;
    float edge = 1.0 - smoothstep(15500.0, GAL_DISK_RADIUS, radius);

    float thinHeight = mix(210.0, 460.0, flare);
    float thickHeight = mix(610.0, 1080.0, flare);
    float thinDisk =
      exp(-radius / 5200.0) * exp(-abs(z) / thinHeight) * edge;
    // A POEIRA mora numa camada mais FINA que as estrelas. Enquanto a
    // poeira herdava o perfil vertical estelar, emissão e absorção eram
    // proporcionais em TODA altura: a função-fonte j/κ ficava constante
    // em z e a faixa saturava no MESMO valor em qualquer latitude —
    // nenhuma fenda podia existir, por construção. Coluna perpendicular
    // preservada (thinHeight/dustHeight), então só a FORMA muda.
    float dustHeight = mix(${DH0}, ${DH1}, flare);
    float dustDisk = exp(-radius / 5200.0) * exp(-abs(z) / dustHeight) *
      edge * (thinHeight / dustHeight);
    float thickDisk =
      exp(-radius / 6500.0) * exp(-abs(z) / thickHeight) * edge * 0.105;

    // R(+29°) — crista no azimute −29°, igual à barra do CPU
    float cb = cos(0.506145);
    float sb = sin(0.506145);
    vec2 barP = mat2(cb, sb, -sb, cb) *
      vec2(dot(q, GAL_X), dot(q, GAL_Y));
    float bar =
      exp(-abs(barP.x) / 2050.0) *
      exp(-abs(barP.y) / 430.0) *
      exp(-abs(z) / 390.0) *
      (1.0 - smoothstep(4650.0, 5400.0, abs(barP.x)));
    float bulge = ${SPHEROID} + bar * 0.82;

    // Estrutura fractal em escalas de quiloparsecs e centenas de parsecs.
    float broad = fbm(q * 0.00062 + 13.7, 2);
    float filaments = fbm(q * 0.0021 + 37.1, 2);
    // Variante de GÁS (4 braços parecidos) para TODO o raymarch,
    // inclusive o termo estelar logo abaixo — decisão, não descuido:
    // com o peso estelar 0,42·(1±profundidade) o par fraco zera dentro
    // do círculo solar (rodada 30: a profundidade só cai de 7,6 a
    // 11,5 kpc, e o Sol está em 8,15), e um realce estelar
    // 2-braços-com-zeros apagaria as nuvens estelares de Sagitário da
    // faixa e decorrelacionaria estrelas do gás na vista interna, que
    // ainda não tem gate (panorama ESO, lacuna 2 do NORTE). Quando o
    // gate existir, o termo estelar é o candidato a voltar para
    // galMajorArms pesado, com um piso > 0 no par fraco.
    float arms = clamp(
      galMajorArmsGas(theta, radius, 155.0) +
      galLocalArm(theta, radius, 180.0),
      0.0,
      1.0
    );
    // handoff da unificação 2: a fração da luz estelar que as cascas
    // resolvem como estrelas individuais a esta distância sai da
    // integrada — mesmo fator das partículas (GLSL_UNRESOLVED). Os
    // termos de gás (dust/hii) não entram: casca não desenha gás.
    float stellar =
      (thinDisk *
        mix(0.22, 1.12, broad) *
        mix(0.58, 1.28, arms) +
      thickDisk +
      bulge) * unresolved(t);

    // Poeira fria acumula na camada mais fina e recorta o centro em
    // filamentos negros, como as grandes fendas da astrofotografia.
    float dustProc = dustDisk * mix(0.58, 1.35, arms) *
      smoothstep(0.44, 0.76, broad * 0.68 + filaments * 0.42);
    // Componente DIFUSA, ancorada em A_V: a poeira acima é filamentar
    // (o smoothstep deixa passar ~5% do volume) e integrava 0,004
    // mag/kpc no plano — duas ordens de grandeza abaixo do meio
    // interestelar real. Sem ela a faixa é opticamente FINA e nenhuma
    // fenda pode existir: extinção que não chega a τ~1 não escurece
    // nada, por mais bem desenhada que seja.
    float dustDiffuse = ${DIFFUSE} *
      exp(-(radius - 8150.0) / ${DUSTRD}) * exp(-abs(z) / dustHeight) * edge;
    // Onde o APOGEE mediu estruturas densas (cobertura começa a
    // ~1 kpc do Sol; as fendas locais tipo Great Rift continuam
    // procedurais), a fenda real SOMA-SE ao procedural; o nível
    // difuso do survey não escurece nada. Perfil vertical h ≈ 150 pc.
    vec2 cart = texture2D(
      uDustMap,
      vec2(dot(q, GAL_X), dot(q, GAL_Y)) / (2.0 * GAL_DISK_RADIUS) + 0.5
    ).rg;
    float obsLanes = smoothstep(0.56, 0.88, cart.r);
    float dustObs = obsLanes * exp(-abs(z) / 150.0) * 2.2 * mix(0.8, 1.15, arms);
    float dust = dustProc + dustDiffuse + dustObs * cart.g * uCartBlend;

    float towardCenter = clamp(bulge * 0.6 + exp(-radius / 2600.0), 0.0, 1.0);
    vec3 diskColor = mix(
      vec3(0.30, 0.43, 0.78),
      vec3(1.00, 0.72, 0.42),
      towardCenter * 0.82 + broad * 0.18
    );

    // Bolsões H-alfa/OIII pontuais: presentes no disco, nunca como
    // um véu magenta uniforme.
    float hii = thinDisk * (0.22 + arms * 0.78) *
      smoothstep(0.76, 0.94, filaments) *
      smoothstep(1800.0, 5200.0, radius);
    vec3 emission = diskColor * stellar;
    emission += vec3(0.95, 0.12, 0.32) * hii * 0.72;
    emission += vec3(0.12, 0.48, 0.72) * hii * (1.0 - broad) * 0.42;

    light += transmission * emission * dt * 0.000052;
    transmission *= exp(-dust * dt * 0.00035);
    if (transmission < 0.02) break;
  }

${riftGLSL()}
  return light / (1.0 + light * 0.55);
}
`;

// Passe de suavização do raymarch: 4 taps em ±meio-texel (com filtro
// linear = tent 3×3 efetivo). O blue noise do jitter vive SÓ na alta
// frequência — este blur o apaga onde o conteúdo (nuvem) é liso por
// natureza; borda de nuvem perde ~2 px de tela em meia-res, invisível.
export const NEBULA_BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec3 c = texture2D(uSrc, uv + uTexel * vec2( 0.5,  0.5)).rgb
         + texture2D(uSrc, uv + uTexel * vec2(-0.5,  0.5)).rgb
         + texture2D(uSrc, uv + uTexel * vec2( 0.5, -0.5)).rgb
         + texture2D(uSrc, uv + uTexel * vec2(-0.5, -0.5)).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}
`;

// Fragment do LUT da faixa: uma direção por texel (256×128 equirect
// no referencial galáctico), integração distante completa.
export const NEBULA_LUT_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uCamPos;
uniform sampler2D uDustMap;
uniform float uCartBlend;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_CARTOGRAPHY}
${GLSL_UNRESOLVED}
${BAND_INTEGRATION}

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(256.0, 128.0);
  float lon = (uv.x - 0.5) * 6.2831853;
  float lat = (uv.y - 0.5) * 3.14159265;
  float cl = cos(lat);
  vec3 rd = GAL_X * (cl * cos(lon)) + GAL_Y * (cl * sin(lon)) + GAL_N * sin(lat);
  gl_FragColor = vec4(integrateGalacticDisk(uCamPos, rd), 1.0);
}
`;

// Corpo principal do raymarch — concatenado ao cabeçalho no export.
const NEBULA_MAIN = /* glsl */ `
void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  vec3 rd = normalize(
    uCamFwd +
    uCamRight * (uv.x * uTanHalfFov * uAspect) +
    uCamUp * (uv.y * uTanHalfFov));
  vec3 ro = uCamPos;

  // jitter anti-banding por BLUE NOISE (medido nas capturas t=110): IGN
  // imprimia xadrez estático ~2 px (estrutura periódica; sem TAA não se
  // dissolve, meia-res amplia), hash branco virava manchas de baixa
  // frequência que o upsample não remove. Blue noise = erro só em alta
  // frequência, sem período — o ótimo estático. Deslocamento COERENTE da
  // partição preservado (variância por pixel baixa, só termos de borda).
  float jitter = texture2D(uBlueNoise, gl_FragCoord.xy / 64.0).r;

  float tMax = 650.0;

  // O gás vive numa camada |z_gal| < 1600 pc: recorta o trecho útil
  // do raio e dimensiona os passos por ele — olhar para fora do
  // plano fica quase de graça, sem mudar o visual dentro da camada.
  float z0 = dot(ro - GAL_CENTER, GAL_N);
  float dz = dot(rd, GAL_N);
  float tLo = 0.0;
  float tHi = tMax;
  if (abs(dz) > 1e-4) {
    float ta = (-1600.0 - z0) / dz;
    float tb = (1600.0 - z0) / dz;
    tLo = clamp(min(ta, tb), 0.0, tMax);
    tHi = clamp(max(ta, tb), 0.0, tMax);
  } else if (abs(z0) > 1600.0) {
    tHi = 0.0;
  }
  float span = tHi - tLo;
  int N = int(float(uSteps) * clamp(span / tMax, 0.0, 1.0) + 0.5);

  vec3 acc = vec3(0.0);
  float T = 1.0;
  vec3 galacticLight = texture2D(uBandLUT, dirToBand(rd)).rgb;
  // +1e-4: normalize(vec3(0)) = NaN quando ?pos=0,0,0 (origem exata)
  vec3 toSun = normalize(uSunPos - ro + vec3(1e-4));
  float phaseSun = pow(max(dot(rd, toSun), 0.0), 24.0) * 2.2 +
                   pow(max(dot(rd, toSun), 0.0), 4.0) * 0.35;

  for (int i = 0; i < 96; i++) {
    if (i >= N || T < 0.015) break;
    // Amostragem quadrática: alta resolução perto da câmera, mas o
    // último passo realmente alcança 650 pc. A progressão anterior
    // percorria só ~4 pc e nunca chegava às nuvens da viagem.
    // (amostra por passo com hash próprio foi testada e granula demais:
    // uma amostra independente por célula grande = variância alta; o
    // deslocamento coerente da partição erra pouco e sem estrutura)
    float f0 = clamp((float(i) + jitter) / float(N), 0.0, 1.0);
    float f1 = clamp((float(i + 1) + jitter) / float(N), 0.0, 1.0);
    float t0 = tLo + span * f0 * f0;
    float t1 = tLo + span * f1 * f1;
    float t = (t0 + t1) * 0.5;
    float dt = max(t1 - t0, 0.01);
    vec3 p = ro + rd * t;
    float d = nebulaDensity(p, 4);

    if (d > 0.003) {
      // ambiente frio proporcional ao envelope do gás — reusa o valor
      // que nebulaDensity acabou de calcular para a MESMA amostra
      float slab = min(gGasEnvelope * 0.9, 1.0);

      // auto-absorção: corações densos são escuros, bordas brilham
      // (como nas nebulosas escuras reais — Barnard 68, Pilares da Criação)
      float selfShadow = exp(-d * 1.65);
      float rim = 1.0 - selfShadow; // concentra a emissão nas bordas

      // Emissão bicolor integrada por alpha volumétrico. A cor se
      // acumula sem depender do tamanho do passo e os núcleos densos
      // preservam silhuetas escuras em vez de virar branco uniforme.
      vec3 sampleColor = palette(p, d) * (0.22 + rim * 1.55);
      sampleColor *= 0.55 + min(d, 1.8) * 0.72;
      sampleColor *= exp(-max(d - 0.9, 0.0) * 0.55);
      sampleColor += GAS_COOL * slab * 0.012;

      // Região HII hero no corredor para Betelgeuse: uma cavidade
      // ionizada localizada — o fbm dos filamentos só roda dentro
      // do volume dela (fora, heroVolume < 1e-5 e não compra nada)
      // mora NO 5º núcleo do corredor: posição e raio vêm de lá, então
      // ela anda junto quando o corredor se desloca (rodada 34)
      vec3 hq = (p - vec3(${HERO[0].toFixed(2)}, ${HERO[1].toFixed(2)}, ${HERO[2].toFixed(2)})) / ${HERO[3].toFixed(2)};
      float hq2 = dot(hq, hq);
      if (hq2 < 9.0) {
        float heroVolume = exp(-hq2 * 1.25);
        float heroFilaments = smoothstep(0.58, 0.84, fbm(p * 0.115 + 63.7, 3));
        float heroHii = heroVolume * heroFilaments * heroFilaments;
        sampleColor += vec3(1.0, 0.09, 0.30) * heroHii * (0.08 + rim * 0.92);
        sampleColor += vec3(0.18, 0.48, 0.82) * heroHii * (1.0 - heroFilaments) * 0.16;
      }

      // luz do Sol (local)
      float dSun = length(p - uSunPos);
      sampleColor += vec3(1.0, 0.66, 0.3) * phaseSun * rim * exp(-dSun * 0.1) * 1.1;

      // luz das supergigantes embutidas no gás (falloff suave)
      for (int L = 0; L < 2; L++) {
        vec3 lv = uLightPos[L] - p;
        float ld = length(lv);
        sampleColor += uLightColor[L] * rim * (3.2 / (1.0 + ld * ld * 0.06));
      }

      // Beer–Lambert: cada passo deposita somente sua fração óptica.
      float alpha = 1.0 - exp(-d * dt * 0.055);
      acc += T * sampleColor * alpha;
      T *= 1.0 - alpha;
    }
  }

  // A luz galáctica está atrás das nuvens locais: regiões densas
  // realmente ocultam a faixa quando a câmera mergulha nelas.
  acc += galacticLight * T;

  // Véu tênue de fundo, limitado ao plano galáctico.
  float gpRay = dot(rd, GAL_N);
  acc += GAS_COOL * exp(-gpRay * gpRay * 5.0) * 0.0035 * T;

  // joelho suave — preserva gradientes, evita saturação uniforme
  acc = acc / (1.0 + acc * 0.72);
  acc *= uFade; // crossfade para o modelo galáctico na subida

  gl_FragColor = vec4(acc, 1.0);
}
`;

export const NEBULA_FRAG = NEBULA_FRAG_HEAD + NEBULA_MAIN;
