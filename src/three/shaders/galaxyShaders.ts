// ============================================================
// Shaders da galáxia — pontos com conservação de fluxo (tamanho
// físico em pc → px com alpha compensado), poeira multiplicativa
// que escurece o fundo e billboards de brilho (bojo / marcador).
// ============================================================
import { GLSL_CARTOGRAPHY } from '../cartography/galacticModel';

// Vértice compartilhado pelas partículas brilhantes e pela poeira.
export const GALAXY_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;   // diâmetro físico em pc
attribute float aAlpha;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uTanHalfFov;
uniform float uFade;
uniform float uMaxPx;

varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main() {
  float dist = length(position - uCamPos);
  // tamanho angular real: pc/dist → fração da tela → pixels
  float px = aSize * uScreenH / (2.0 * uTanHalfFov * max(dist, 1.0));
  float clamped = clamp(px, 0.7, uMaxPx);
  // conservação de fluxo luminoso: sprites grandes (perto) teriam
  // pico constante e área enorme → estouro branco. Acima de ~3px o
  // pico cai com 1/px², mantendo o depósito total limitado; abaixo
  // do piso de pixel, o fluxo cai com px² (suavidade a distância).
  float shrink = min(1.0, 9.0 / max(px * px, 1e-4));
  float subPix = px < 0.7 ? (px * px) / 0.49 : 1.0;

  vColor = aColor;
  vAlpha = aAlpha * uFade * shrink * subPix;
  vSeed = fract(aSize * 0.371 + aAlpha * 7.13);

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamped;
}
`;

export const GALAXY_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float i = exp(-r2 * 4.5);
  vec3 col = vColor * i * vAlpha;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Poeira galáctica — blending multiplicativo: escurece a luz
// acumulada atrás, desenhando as faixas escuras dos braços.
export const GALAXY_DUST_FRAG = /* glsl */ `
precision highp float;

// Profundidade óptica de pico de um grão; a COR da extinção não é
// escolhida, sai da lei de avermelhamento.
uniform float uTau;

varying vec3 vColor; // não usado — a extinção não depende da cor do grão
varying float vAlpha;
varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  // Fragmentos finos e curvos: poeira externa deve ler como filamento,
  // não como discos pretos destacados sobre a galáxia.
  float ang = vSeed * 6.2831;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  uv = rot * uv;
  uv.x *= 0.72 + vSeed * 0.34;
  float r = length(vec2(uv.x * 0.72, uv.y));
  if (r > 1.0) discard;
  float bend = uv.y + sin(uv.x * (3.4 + vSeed * 2.1) + ang) * 0.16;
  float width = 0.10 + vSeed * 0.075;
  float filament = 1.0 - smoothstep(width, width + 0.18, abs(bend));
  float envelope = 1.0 - smoothstep(0.52, 1.0, r);
  float knots = 0.70 + 0.30 * sin(uv.x * 8.0 + ang);
  float i = filament * envelope * knots;
  // LEI DE EXTINÇÃO, não uma cor escolhida. Para poeira interestelar com
  // R_V = 3,1 a extinção relativa é A_B/A_V = 1,32 e A_R/A_V = 0,75:
  // a transmissão por canal é exp(−τ·razão). Um uDustColor fixo era um
  // tingimento — pintava de marrom até onde a coluna é fininha. Com a
  // lei, poeira rala apenas AVERMELHA e só a coluna espessa escurece,
  // que é o que separa o marrom-avermelhado das fendas do véu dourado
  // que cobria o disco inteiro. exp() nunca passa de 1 nem fica negativo,
  // então o clamp do mix deixou de ser necessário.
  float tau = max(i, 0.0) * vAlpha * uTau;
  vec3 factor = exp(-tau * vec3(0.75, 1.0, 1.32));
  gl_FragColor = vec4(factor, 1.0);
}
`;

// Espalhamento da poeira — o par ADITIVO da extinção acima.
//
// Grão de poeira faz duas coisas com a luz: absorve (avermelha o que
// passa — é o GALAXY_DUST_FRAG) e ESPALHA. O espalhamento é seletivo no
// azul: é a física da nebulosa de reflexão. Modelando só a extinção, a
// vista externa só podia ficar dourada, enquanto o raymarch interno —
// que integra espalhamento — mostrava o disco púrpura e azulado. Mesma
// poeira, duas aparências, porque faltava metade do modelo.
//
// A cor vem por vértice (aColor), calculada em galaxy.ts com a MESMA
// mistura do raymarch: azul-violeta longe do bojo, quente perto.
export const GALAXY_DUST_SCATTER_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float ang = vSeed * 6.2831;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  uv = rot * uv;
  uv.x *= 0.72 + vSeed * 0.34;
  float r = length(vec2(uv.x * 0.72, uv.y));
  if (r > 1.0) discard;
  // envelope mais largo que o da extinção: o halo espalhado extravasa
  // a crista opaca, como na borda iluminada de uma nuvem real
  // segue a MESMA crista da extinção, só que mais macia: o halo
  // espalhado extravasa a fenda opaca sem virar bolha isolada
  float bend = uv.y + sin(uv.x * (3.4 + vSeed * 2.1) + ang) * 0.16;
  float width = 0.16 + vSeed * 0.10;
  float lane = 1.0 - smoothstep(width, width + 0.34, abs(bend));
  float envelope = exp(-r * r * 2.2);
  gl_FragColor = vec4(vColor * lane * envelope * vAlpha, 1.0);
}
`;

// Billboard em view-space (mesma técnica das hero stars) para o
// brilho do bojo e o marcador do Sol.
export const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uSize;

void main() {
  vUv = position.xy;
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}
`;

export const GLOW_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform float uTime;
uniform float uFade;
uniform float uPulse; // 0 = bojo estático · 1 = marcador pulsante

varying vec2 vUv;

void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float edgeFade = 1.0 - smoothstep(0.68, 1.0, r);
  float glow = (exp(-r * 3.6) * 0.85 + exp(-r * 14.0) * 0.7) * edgeFade;
  float a = glow * uFade;
  if (uPulse > 0.5) {
    float pulse = 0.75 + 0.25 * sin(uTime * 2.2);
    // anel fino em torno do ponto — "você está aqui"
    float dr = (r - 0.55) * 9.0;
    float ring = exp(-dr * dr) * 0.5 * pulse; // x*x — pow() de base negativa é NaN
    a = (glow * pulse + ring) * uFade;
  }
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

// Vertex de bake: quad direto em clip space, UV 1:1 — usado uma
// única vez no init para congelar cada lâmina numa textura.
export const DISC_BAKE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Fragment das lâminas BAKEADAS: o conteúdo do DISC_FRAG é estático
// (sem uTime, sem câmera) — recalculá-lo por fragmento a cada frame
// eram ~400 M hash/frame no Ato III. Agora é um fetch.
export const DISC_BAKED_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uBaked;
uniform float uFade;
uniform float uLayerAlpha;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(texture2D(uBaked, vUv).rgb * uLayerAlpha * uFade, 1.0);
}
`;

// Disco emissivo contínuo. Sete camadas levemente separadas no
// eixo Z conectam as partículas; a macroestrutura é compartilhada
// verticalmente para que as lacunas dos braços não se preencham.
// As fases e o pitch são os mesmos do gerador físico em galaxy.ts.
export const DISC_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uDiskRadius;

${GLSL_CARTOGRAPHY}

void main() {
  vUv = uv;
  vec3 warped = position;
  float radiusPc = length(position.xy) * uDiskRadius;
  // +1e-7: atan(0,0) é indefinido e 0*NaN = NaN — o vértice central
  // do plano existe exatamente em (0,0)
  float theta = atan(position.y, position.x + 1e-7);
  warped.z += galWarpHeight(radiusPc, theta);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(warped, 1.0);
}
`;

export const DISC_FRAG = /* glsl */ `
precision highp float;

uniform float uFade;
uniform float uSeed;
uniform float uLayerAlpha;
// mapa APOGEE bakeado: R = densidade de poeira, G = cobertura
uniform sampler2D uDustMap;
// resposta acoplada: R=gás/poeira, G=traçadores jovens,
// B/A=suporte espacial observado de cada família
uniform sampler2D uStructureMap;
uniform float uCartBlend;
uniform float uInferenceGain;
uniform float uBackgroundGain;
varying vec2 vUv;

${GLSL_CARTOGRAPHY}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm2(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amplitude * noise2(p);
    p = p * 2.03 + vec2(9.7, 17.3);
    amplitude *= 0.5;
  }
  return sum;
}

// Ruído RIDGED: o fbm comum tem máximos arredondados e só sabe fazer
// mancha. 1 − |2n − 1| tem cristas finas — é o que lê como filamento.
float ridged2(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  float weight = 1.0;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(2.0 * noise2(p) - 1.0);
    float shaped = n * n * weight;
    weight = min(1.0, shaped * 1.6);
    sum += amplitude * shaped;
    p = p * 2.11 + vec2(5.3, 13.7);
    amplitude *= 0.52;
  }
  return min(1.0, sum * 1.35);
}

// Rede filamentar no REFERENCIAL ESPIRAL — espelho exato de
// filamentField() em cartography/structureMap.ts. Com u = ln R e
// v = θ − u/tan(p) os braços viram retas; frequência ALTA ao longo do
// braço e baixa através dele quebra as cristas em filamentos curtos e
// ramificados. O inverso (o que estava aqui antes, via fbm isotrópico)
// só sabe fazer névoa. Bakeado uma vez: custo de runtime zero.
float spiralFilament(float radiusPc, float theta) {
  float u = log(max(radiusPc, 300.0) / GAL_SUN_RADIUS);
  float v = theta - u / 0.2216947; // tan(12,5°) — pitch da espinha
  vec2 s = vec2(u * 30.0, v * 26.0);
  vec2 w = vec2(
    fbm2(vec2(s.x * 1.9 + 31.2, s.y * 1.2 - 12.4)),
    fbm2(vec2(s.x * 1.9 - 7.9, s.y * 1.2 + 22.1))
  ) - 0.5;
  return ridged2(s + w * 1.4);
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float radius = length(p);
  if (radius > 1.0) discard;

  float radiusPc = radius * GAL_DISK_RADIUS;
  float theta = atan(p.y, p.x + 1e-7); // NaN no texel central seria BAKEADO
  // Braços LARGOS, como na recriação Gaia: a razão largura/espaçamento é
  // ~1/3. Fitas finas (sharpness 42–105) davam vales rasos; o contraste
  // vem do vale escuro entre braços largos, não de uma linha brilhante.
  float armSharpness = mix(6.5, 11.0, smoothstep(3500.0, 15000.0, radiusPc));
  float arms = clamp(
    galMajorArms(theta, radiusPc, armSharpness) +
    galLocalArm(theta, radiusPc, armSharpness * 1.4),
    0.0,
    1.0
  );
  // A macroestrutura acoplada já vem da textura CPU. Só a microtextura
  // varia por lâmina. A 220 a primeira oitava era de 76 pc — abaixo do
  // pixel na vista externa, logo invisível: sobrava um creme liso. Os
  // complexos que o alvo mostra como manchas têm 200 pc a 1 kpc.
  float microNoise = fbm2(p * 72.0 - vec2(uSeed * 1.7, uSeed));
  float edge = 1.0 - smoothstep(0.84, 1.0, radius);
  // Medido contra a referência: com exp(-2.4) o meio do disco ficava
  // 2–4× brilhante demais em relação ao pico. 4.4 reproduz a queda do
  // alvo (≈R_d 3,8 kpc no perfil integrado, poeira já inclusa).
  float disk = exp(-radius * 4.4) * edge;
  // Barra de 5 kpc inclinada 29° em relação à linha Sol–centro.
  // mat2 é column-major: esta é R(+29°), que traz a crista da barra
  // para o azimute −29° — coincidente com a barra de partículas do
  // CPU (barAngleRad = −29°) e com o referencial dos catálogos.
  float cb = cos(0.506145);
  float sb = sin(0.506145);
  vec2 bp = mat2(cb, sb, -sb, cb) * p;
  // 1/e em 1,2 kpc no eixo maior. Com 90 o núcleo enchia até 2,5 kpc e o
  // perfil ficava 1,2–1,6× acima do alvo logo fora do bojo. E é ELIPSE
  // alinhada à barra (b/a = 0,58), não um disco: o bojo do alvo é
  // visivelmente alongado no mesmo eixo da barra.
  float core = exp(-260.0 * (bp.x * bp.x + bp.y * bp.y / 0.336));
  float bx = bp.x / 0.298;
  float by = bp.y / 0.061;
  // Gaussiana nos DOIS eixos. Com abs(by) a barra ganhava uma crista de
  // borda dura e, com exp(-bx²·1.05), sobrevivia até 8,4 kpc: um feixe
  // reto cortando meio disco. A barra tem 5 kpc e vive dentro do bojo.
  float bar = exp(-bx * bx * 2.6 - by * by * 0.9);

  // Cartografia observada (APOGEE). O canal R é contraste log-local
  // (0,5 = neutro): só estruturas mais densas que o entorno viram
  // fendas — o nível médio do survey não escurece o disco.
  vec2 cart = texture2D(uDustMap, p * 0.5 + 0.5).rg;
  float obsCoverage = cart.g * uCartBlend;
  float obsLanes = smoothstep(0.56, 0.88, cart.r);
  vec4 structure = texture2D(uStructureMap, p * 0.5 + 0.5);
  float gasSupport = structure.b * uCartBlend;
  float youngSupport = structure.a * uCartBlend;
  float gasResponse =
    structure.r * mix(uInferenceGain, 1.0, gasSupport);
  float youngResponse =
    structure.g * mix(uInferenceGain, 1.0, youngSupport);
  // Gás denso pode sustentar formação estelar mesmo onde o catálogo jovem
  // é incompleto. É resposta derivada, não uma nova “estrela observada”.
  float formationResponse = max(
    youngResponse,
    gasResponse * (0.24 + gasSupport * 0.34)
  );
  // mix(0.54, …) era a MESMA armadilha do armLight: onde o catálogo cala,
  // o disco inteiro perdia 46% do brilho. O catálogo realça, não sustenta.
  // mix(0.76, 1.0, …) dava ±14% de textura; o alvo tem manchas de ±50%.
  // É esta amplitude, e não a contagem de partículas, que separa “mar de
  // nuvens estelares” de “névoa”. E a textura tem de ser FILAMENTAR e
  // alinhada ao braço: fbm isotrópico sozinho faz manchas redondas.
  float filament = spiralFilament(radiusPc, theta);
  float texture = filament * 0.34 + microNoise * 0.66;
  float clumps =
    mix(0.82, 1.0, formationResponse) * mix(0.52, 1.24, texture);

  // ---- densidade, não “luz somada sobre um piso” ------------------
  // O esqueleto ajustado aos masers define ONDE existe matéria; os
  // catálogos modulam a intensidade DENTRO do braço. Antes o observado
  // ERA o braço (armLight = 0.16·arms + 0.78·formationResponse): onde o
  // catálogo é raso — quase todo o disco — o braço somia e sobrava o
  // piso liso de 0,076. O contraste braço/interbraço ficava ≤1,45:1 e em
  // geral <1:1, ou seja, o braço saía MAIS ESCURO que o interbraço.
  // O termo aditivo formationResponse * 0.30 levava a assimetria do
  // survey direto para a densidade do braço. Peso deslocado para o
  // esqueleto simétrico: sobe m=2 e m=4 sem mexer em m=1.
  // SOFT-CLIP em vez de clamp. clamp() achata o topo com um canto na
  // derivada, e canto é não-linearidade dura: onde a crista do braço
  // satura, ela injeta harmônicos ímpares que a medição via em m=3 e
  // m=5. x/(1+x^6)^(1/6) é idêntica abaixo de ~0,8 e assintota a 1 sem
  // canto nenhum. max() obrigatório: pow de base negativa é NaN.
  float rawDensity =
    arms * (0.74 + 0.26 * formationResponse) + formationResponse * 0.16;
  float armDensity =
    rawDensity / pow(1.0 + pow(max(rawDensity, 0.0), 6.0), 0.1666667);
  // Medido no alvo: p90/p20 azimutal fica entre 2 e 4 em TODO o disco.
  // O braço é uma sobredensidade de ~2×, não um filamento sobre o vazio;
  // quem separa os braços é o perfil radial íngreme e a poeira. Zerar o
  // interbraço dava contraste 10–44 e um disco de fitas sobre preto.
  float structureLight = mix(0.50, 1.0, armDensity) * clumps;

  // O mapa já fez o split macro observado/inferido; a mesma microtextura
  // fina apenas resolve subestrutura. APOGEE refina a extinção local.
  float dustMacro = mix(gasResponse, max(gasResponse, obsLanes), obsCoverage);
  // A fenda escura É a crista da rede filamentar. Com smoothstep sobre
  // fbm isotrópico a absorção virava um chuvisco sem direção; agora
  // desenha faixas que acompanham e cruzam o braço, como no alvo.
  float dustFilament = smoothstep(0.46, 0.80, filament);
  float absorption =
    1.0 - dustMacro * dustFilament * 0.62;

  // O núcleo já satura em branco, então subir o bojo não mexe no perfil
  // normalizado — quem desce é o disco. E medido com ?nodisc=1: estas
  // lâminas eram 95% da luz do disco, por isso a granulação travava em
  // 0,048 (alvo 0,075) — luz analítica lisa não granula. O fluxo migra
  // para as partículas, que é onde a estrutura fina existe.
  float intensity = disk * 0.80 * structureLight * uBackgroundGain;
  // O perfil medido ficava 1,5× acima do alvo em TODO o disco, com o
  // pico igual: é bojo fraco demais, não disco brilhante demais. O alvo
  // tem um núcleo pequeno e intenso que normaliza o resto para baixo.
  intensity +=
    (core * 0.53 + bar * 0.23) * uBackgroundGain;
  intensity *= absorption * uLayerAlpha * uFade;

  // Curva de cor do alvo: (R−B)/(R+B) ≈ +0,35 no disco interno, ~0 em
  // 1,05·R90, negativa na borda. A nossa saía chapada em +0,15 porque o
  // “warm” era pálido demais e o tonemap ACES dessatura os altos.
  // O alvo é LAVANDA acinzentado no disco, não azul saturado; misturado
  // com o quente, azul saturado vira marrom.
  vec3 cold = vec3(0.56, 0.58, 0.74);
  vec3 warm = vec3(0.98, 0.70, 0.42);
  // O quente fica no miolo: a 5 kpc o alvo já é lavanda. Com 1.05 o
  // disco inteiro saía sépia (medido: +0,24 em 8 kpc contra +0,17).
  vec3 color = mix(cold, warm, clamp(1.0 - (radius - 0.06) * 1.55, 0.20, 0.95));
  // halo quente do bojo: no alvo o bege se estende a ~3 kpc, bem além do
  // núcleo saturado. Só cor — não entra na intensidade.
  color = mix(color, vec3(1.0, 0.78, 0.52), exp(-radius * radius * 40.0) * 0.55);
  color = mix(color, vec3(0.68, 0.80, 1.0), formationResponse * 0.24);
  color = mix(
    color,
    vec3(1.0, 0.66, 0.34),
    clamp(core + bar, 0.0, 1.0) * 0.92
  );
  color = mix(
    color,
    vec3(0.92, 0.22, 0.44),
    formationResponse * smoothstep(0.80, 0.94, microNoise) * 0.18
  );
  // Avermelhamento por extinção. Antes era uma TINTA pintada só onde o
  // survey mediu fenda; agora é o que sobra de exp(-tau) com a lei CCM89
  // (R_V=3,1, A_R/A_V=0,75 e A_B/A_V=1,32) — a mesma dos filamentos na
  // linha 101. Dividir pela luminância mantém o fator com L=1: quem
  // governa o fluxo continua sendo absorption, intocado, então m=1..6
  // e discMean não enxergam esta linha. Só o matiz muda — e é ele que
  // faz o não-obscurecido ler azul contra a fenda dourada.
  vec3 trans = exp(-(dustMacro * dustFilament * 1.6) * vec3(0.75, 1.0, 1.32));
  color *= trans / dot(trans, vec3(0.2126, 0.7152, 0.0722));

  gl_FragColor = vec4(color * intensity, 1.0);
}
`;
