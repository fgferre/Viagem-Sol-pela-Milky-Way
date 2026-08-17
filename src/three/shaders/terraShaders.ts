// ============================================================
// OS SHADERS DA TERRA — superfície, nuvens e atmosfera — com as
// constantes-espec que os templates INTERPOLAM (separá-las criaria
// ciclo avaliado no load). Moravam em terra.ts (GLSL inline); o
// padrão da casa é *Shaders.ts em shaders/.
// ============================================================
import { GLSL_SOMBRA_ECLIPSE } from '../../lib/atlas/eclipse';

/** Casca das nuvens: +0,15% do raio — alto o bastante para o depth
 *  separar (medido: ~800× o passo de depth nesta geometria de câmera),
 *  baixo o bastante para não parecer uma segunda superfície. */
export const RAZAO_CASCA_NUVENS = 1.0015;
/** Casca da atmosfera: 1,025 — o `outerRadiusRatio` do espec Nishita, e
 *  o único valor para o qual o polinômio de O'Neil abaixo é válido. */
export const RAZAO_CASCA_ATMOSFERA = 1.025;

/** Piso noturno do terminador de NUVENS — espec herdada de
 *  cloudTerminatorMath.ts do doador (LO −0,25, HI 0,12, piso 0,03).
 *  Não é piso de ambiente da superfície: vale só para a casca de nuvens,
 *  multiplicado pelo MESMO uLuzGanho de tudo. */
export const NUVEM_TERMINADOR = { lo: -0.25, hi: 0.12, pisoNoturno: 0.03 } as const;

/** Constantes Nishita/O'Neil — espec do atmosphereShader.ts do doador,
 *  declaradas número a número. O polinômio de profundidade óptica só
 *  vale para scaleDepth 0,25 e razão de casca 1,025 (dito no GLSL). */
export const ATMOSFERA = {
  kRayleigh: 0.0025,
  kMie: 0.0015,
  eSun: 10,
  g: 0.76,
  amostras: 23,
  scaleDepth: 0.25,
  comprimentosDeOnda: [0.65, 0.57, 0.475],
} as const;

// ------------------------------------------------------------
// GLSL — shaders PRÓPRIOS, no padrão da casa: template strings,
// helpers com guarda, nenhum chunk do three.
// ------------------------------------------------------------

/** Helpers compartilhados: toda divisão com denominador saneado, todo
 *  pow com base clampada — a pauta (a) da revisão de olhos frescos. */
export const GLSL_GUARDAS = /* glsl */ `
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
float linstep(float a, float b, float x) {
  return clamp((x - a) / (b - a), 0.0, 1.0);
}
`;

export const TERRA_VERT = /* glsl */ `
varying vec3 vLocal; // posição na ESFERA UNITÁRIA (o raio mora na matriz)
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * A SUPERFÍCIE. Dia (albedo × N·L), noite (linstep no terminador
 * GEOMÉTRICO — o espec do doador: smoothstep vazava 16% no lado diurno),
 * relevo (normal map em TBN analítica da esfera lat-long, com guarda de
 * polo) e o especular do oceano: dielétrico F0 = 0,04, o caso
 * metalness = 0 do fluxo PBR (CALIBRACAO_ATLAS — rocha e água não são
 * condutores; não existe ramo de condutor neste shader).
 *
 * `uLuzGanho` multiplica SÓ a componente direta; as luzes de cidade são
 * emissão e ficam fora. Não existe termo ambiente. O ECLIPSE (F2c/D3)
 * entra pelo chunk único da lib e multiplica SÓ a direta, depois do
 * BRDF — as luzes de cidade ficam fora da sombra também.
 *
 * Exportado (como LUA_FRAG) para o needle-teste da F2c ler o shader
 * montado, não o texto-fonte.
 */
export const TERRA_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform sampler2D uMapaNoite;
uniform sampler2D uMapaNormal;
uniform sampler2D uMapaRugosidade;
uniform vec3 uDirSolLocal;  // corpo→Sol, frame LOCAL do globo (unitário)
uniform vec3 uCamLocal;     // câmera no frame local, em raios equatoriais
uniform float uLuzGanho;    // ganhoFundido(dUA, política) — O escalar único
uniform float uNoiteGanho;  // EARTH_NIGHT_LIGHT_INTENSITY (emissão)
uniform vec3 uNormalEsc;    // (1, a/c, 1): normal do elipsoide escalado
uniform vec3 uEscalaLocal;  // (1, c/a, 1): ponto real do elipsoide
varying vec3 vLocal;
varying vec2 vUv;
${GLSL_GUARDAS}
${GLSL_SOMBRA_ECLIPSE}
void main() {
  vec3 n = normSeguro(vLocal * uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;

  // TBN analítica da esfera lat-long; no polo (leste degenerado) o
  // relevo cede ao normal geométrico em vez de dividir por ~0.
  vec3 leste = vec3(n.z, 0.0, -n.x);
  float lLeste = length(leste);
  vec3 nRelevo = n;
  if (lLeste > 1.0e-4) {
    leste /= lLeste;
    vec3 norte = cross(n, leste);
    vec3 tn = texture2D(uMapaNormal, vUv).xyz * 2.0 - 1.0;
    nRelevo = normSeguro(leste * tn.x + norte * tn.y + n * tn.z);
  }

  float ndotlGeo = dot(n, uDirSolLocal);          // terminador geométrico
  float ndotl = max(dot(nRelevo, uDirSolLocal), 0.0);
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;

  // especular do oceano: Blinn-Phong normalizado com Fresnel de Schlick,
  // brilho derivado do mapa de rugosidade (clampado — pow nunca vê base
  // fora de [0,1] nem expoente <= 0)
  vec3 v = normSeguro(uCamLocal - pElip);
  vec3 h = normSeguro(uDirSolLocal + v);
  float rug = clamp(texture2D(uMapaRugosidade, vUv).r, 0.05, 1.0);
  float brilho = max(2.0 / max(rug * rug, 4.0e-4) - 2.0, 1.0e-2);
  float ndoth = clamp(dot(nRelevo, h), 0.0, 1.0);
  float dEspec = pow(ndoth, brilho) * (brilho + 8.0) * 0.03978873; // /(8π)
  float vdoth = clamp(dot(v, h), 0.0, 1.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - vdoth, 5.0);
  float espec = dEspec * fresnel * ndotl;

  vec3 direta =
    (albedo * ndotl + vec3(espec)) * uLuzGanho * fatorDeEclipse(pElip, n, ndotlGeo);

  // luzes noturnas: EMISSÃO — só no lado escuro, pelo linstep do espec
  // (o smoothstep do doador vazava 16% no lado diurno), fora do ganho.
  float mascaraNoite = linstep(-0.1, 0.1, -ndotlGeo);
  vec3 luzes = texture2D(uMapaNoite, vUv).rgb * (mascaraNoite * uNoiteGanho);

  gl_FragColor = vec4(direta + luzes, 1.0);
}
`;

/**
 * AS NUVENS — casca própria a +0,15% do raio, translúcida, com o
 * terminador do espec do doador (linstep −0,25→0,12 e piso noturno 0,03,
 * só das nuvens) multiplicado pelo MESMO uLuzGanho de tudo. O eclipse é
 * o MESMO da superfície (a casca está 0,15% acima — a geometria do cone
 * é idêntica dentro de sub-pixel): uma nuvem dentro da umbra escurece
 * junto com o oceano embaixo dela.
 */
export const NUVENS_FRAG = /* glsl */ `
uniform sampler2D uMapaNuvens;
uniform vec3 uDirSolLocal; // no frame DA CASCA (a deriva é da CPU)
uniform float uLuzGanho;
varying vec3 vLocal;
varying vec2 vUv;
${GLSL_GUARDAS}
${GLSL_SOMBRA_ECLIPSE}
void main() {
  float cobertura = texture2D(uMapaNuvens, vUv).r;
  vec3 n = normSeguro(vLocal);
  float ndotl = dot(n, uDirSolLocal);
  float dia = max(
    linstep(${NUVEM_TERMINADOR.lo.toFixed(2)}, ${NUVEM_TERMINADOR.hi.toFixed(2)}, ndotl),
    ${NUVEM_TERMINADOR.pisoNoturno.toFixed(2)}
  );
  vec3 sombra = fatorDeEclipse(vLocal * ${RAZAO_CASCA_NUVENS}, n, ndotl);
  gl_FragColor = vec4(vec3(dia * uLuzGanho) * sombra, cobertura);
}
`;

export const ATMOSFERA_VERT = /* glsl */ `
varying vec3 vPosRaios; // ponto da casca externa, em raios equatoriais
void main() {
  vPosRaios = position * ${RAZAO_CASCA_ATMOSFERA};
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * A ATMOSFERA — Rayleigh + Mie por scattering simples (Nishita via a
 * formulação de O'Neil, GPU Gems 2), reescrita com as constantes do
 * espec do doador. O polinômio `escalaOtica` só é válido para
 * scaleDepth 0,25 e casca 1,025 — os DOIS números estão pinados nas
 * constantes exportadas. Tudo em unidades de raio equatorial, frame
 * local: nenhum número da cena (1e-10 pc) entra aqui.
 */
export const ATMOSFERA_FRAG = /* glsl */ `
uniform vec3 uCamLocal;
uniform vec3 uDirSolLocal;
uniform float uLuzGanho;
varying vec3 vPosRaios;
${GLSL_GUARDAS}
const float RAIO_INT = 1.0;
const float RAIO_EXT = ${RAZAO_CASCA_ATMOSFERA};
const float ESCALA = ${(1 / (RAZAO_CASCA_ATMOSFERA - 1)).toFixed(1)};
const float PROF = ${ATMOSFERA.scaleDepth};
const float ESCALA_SOBRE_PROF = ${(1 / (RAZAO_CASCA_ATMOSFERA - 1) / ATMOSFERA.scaleDepth).toFixed(1)};
const float KR = ${ATMOSFERA.kRayleigh};
const float KM = ${ATMOSFERA.kMie};
const float E_SUN = ${ATMOSFERA.eSun.toFixed(1)};
const float G = ${ATMOSFERA.g};
const float G2 = ${(ATMOSFERA.g * ATMOSFERA.g).toFixed(4)};
const float QUATRO_PI = 12.566371;
const vec3 INV_LAMBDA4 = vec3(
  ${(1 / ATMOSFERA.comprimentosDeOnda[0] ** 4).toFixed(5)},
  ${(1 / ATMOSFERA.comprimentosDeOnda[1] ** 4).toFixed(5)},
  ${(1 / ATMOSFERA.comprimentosDeOnda[2] ** 4).toFixed(5)}
);

// profundidade óptica de O'Neil — válida SÓ para PROF 0,25 / casca 1,025
float escalaOtica(float fCos) {
  float x = 1.0 - fCos;
  return PROF * exp(-0.00287 + x * (0.459 + x * (3.83 + x * (-6.80 + x * 5.25))));
}

void main() {
  vec3 raio = vPosRaios - uCamLocal;
  float fim = length(raio);
  raio /= max(fim, 1.0e-6);

  // entrada do raio na casca externa; câmera DENTRO dela começa nela
  // (max com 0 — sem ramo separado, sem NaN: o det já vem clampado)
  float b = 2.0 * dot(uCamLocal, raio);
  float c = dot(uCamLocal, uCamLocal) - RAIO_EXT * RAIO_EXT;
  float det = max(0.0, b * b - 4.0 * c);
  float perto = max(0.5 * (-b - sqrt(det)), 0.0);

  vec3 inicio = uCamLocal + raio * perto;
  float comprimento = max(fim - perto, 0.0);
  float alturaInicio = max(length(inicio), 1.0e-6);
  float angInicio = dot(raio, inicio) / alturaInicio;
  float offsetInicio = exp(-1.0 / PROF) * escalaOtica(angInicio);

  float passo = comprimento / float(${ATMOSFERA.amostras});
  float passoEscalado = passo * ESCALA;
  vec3 passoVec = raio * passo;
  vec3 ponto = inicio + passoVec * 0.5;
  vec3 acumulada = vec3(0.0);
  for (int i = 0; i < ${ATMOSFERA.amostras}; i++) {
    float altura = max(length(ponto), 1.0e-6);
    float prof = exp(ESCALA_SOBRE_PROF * (RAIO_INT - altura));
    float angLuz = dot(uDirSolLocal, ponto) / altura;
    float angCam = dot(raio, ponto) / altura;
    float dispersao = clamp(
      offsetInicio + prof * (escalaOtica(angLuz) - escalaOtica(angCam)),
      0.0, 50.0
    );
    vec3 atenua = exp(-dispersao * (INV_LAMBDA4 * (KR * QUATRO_PI) + KM * QUATRO_PI));
    acumulada += atenua * (prof * passoEscalado);
    ponto += passoVec;
  }

  float fCos = dot(uDirSolLocal, raio);
  float faseR = 0.75 * (1.0 + fCos * fCos);
  float faseM = 1.5 * ((1.0 - G2) / (2.0 + G2)) * (1.0 + fCos * fCos)
    / pow(max(1.0 + G2 - 2.0 * G * fCos, 1.0e-4), 1.5);
  vec3 rayleigh = acumulada * (INV_LAMBDA4 * (KR * E_SUN));
  vec3 mie = acumulada * (KM * E_SUN);
  gl_FragColor = vec4((faseR * rayleigh + faseM * mie) * uLuzGanho, 1.0);
}
`;
