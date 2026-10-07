// ============================================================
// OS SHADERS DA TERRA — superfície, nuvens e atmosfera — com as
// constantes-espec que os templates INTERPOLAM (separá-las criaria
// ciclo avaliado no load). Moravam em terra.ts (GLSL inline); o
// padrão da casa é *Shaders.ts em shaders/.
// ============================================================
import { GLSL_SOMBRA_ECLIPSE } from '../../lib/atlas/eclipse';
import { BODY_AXES } from '../../lib/atlas/iauOrientation';
import { GLSL_LUZ_DA_VISITA } from '../../lib/atlas/luzDaVisita';

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
 *
 * ITEM 93 — A RECEITA DO EYES CHEGA AQUI EM DUAS PEÇAS, e só duas: o
 * `ndotl` da DIRETA passa pelo terminador logístico, e a LANTERNA DE
 * LEITURA soma-se ao termo de luz depois do Sol. O que o contrato manda
 * NÃO tocar fica intacto: o `linstep` das CIDADES continua no
 * terminador GEOMÉTRICO (senão as luzes noturnas vazariam para o dia),
 * as nuvens e o Nishita da atmosfera ficam como estavam.
 *
 * O ESPECULAR DO OCEANO segue o mesmo `ndotl` da difusa — é o mesmo
 * cosseno de incidência, e deixá-lo com o cru daria dois terminadores
 * na mesma superfície.
 *
 * EM QUATRO TRECHOS (07/10, rodada das nuvens): cabeçalho, o corpo até
 * o especular, a luz direta e a emissão. A variante `profundidade`
 * (`TERRA_PROFUNDIDADE_FRAG`, abaixo) reusa três deles e troca só a luz
 * direta; o `TERRA_FRAG` montado é o mesmo texto de antes, byte a byte.
 */
const SUPERFICIE_CABECALHO = /* glsl */ `
uniform sampler2D uMapaDia;
uniform sampler2D uMapaNoite;
uniform sampler2D uMapaNormal;
uniform sampler2D uMapaRugosidade;
uniform vec3 uDirSolLocal;  // corpo→Sol, frame LOCAL do globo (unitário)
uniform vec3 uCamLocal;     // câmera no frame local, em raios equatoriais
uniform float uLuzGanho;    // ganhoDoGlobo(dUA, política) — O escalar único
uniform float uNoiteGanho;  // EARTH_NIGHT_LIGHT_INTENSITY (emissão)
uniform vec3 uNormalEsc;    // (1, a/c, 1): normal do elipsoide escalado
uniform vec3 uEscalaLocal;  // (1, c/a, 1): ponto real do elipsoide
varying vec3 vLocal;
varying vec2 vUv;
${GLSL_GUARDAS}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
`;

const SUPERFICIE_ATE_O_ESPECULAR = /* glsl */ `void main() {
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
  // o terminador da LUZ passa pela logística do Eyes (item 93); em
  // real o uniform é 0 e isto volta a ser max(N.L, 0)
  float ndotl = terminadorSuave(dot(nRelevo, uDirSolLocal));
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

`;

const SUPERFICIE_LUZ_DIRETA = /* glsl */ `  // A LUZ ANTES DO ALBEDO (item 93): o Sol passa pelo ganho e pelo
  // eclipse, e a LANTERNA soma-se depois, com a soma saturada em 1. A
  // lanterna leva a sombra do eclipse junto — sem isso a umbra sobre
  // Durango deixava de ser preta e a totalidade sumia do mapa (a
  // divergencia declarada em luzDaVisita.ts). O especular e' lobulo,
  // nao albedo: ele acompanha o Sol e fica fora da lanterna (um fill de
  // camera nao faz brilho de espelho).
  vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 luzSol = vec3(uLuzGanho) * sombras;
  vec3 luz = luzDoGlobo(vec3(ndotl) * luzSol, lanternaDeLeitura(nRelevo, v, sombras));
  vec3 direta = albedo * luz + vec3(espec) * luzSol;

`;

const SUPERFICIE_EMISSAO = /* glsl */ `  // luzes noturnas: EMISSÃO — só no lado escuro, pelo linstep do espec
  // (o smoothstep do doador vazava 16% no lado diurno), fora do ganho.
  float mascaraNoite = linstep(-0.1, 0.1, -ndotlGeo);
  vec3 luzes = texture2D(uMapaNoite, vUv).rgb * (mascaraNoite * uNoiteGanho);

  gl_FragColor = vec4(direta + luzes, 1.0);
}
`;

export const TERRA_FRAG =
  SUPERFICIE_CABECALHO + SUPERFICIE_ATE_O_ESPECULAR + SUPERFICIE_LUZ_DIRETA + SUPERFICIE_EMISSAO;

/**
 * AS NUVENS — casca própria a +0,15% do raio, translúcida, com o
 * terminador do espec do doador (linstep −0,25→0,12 e piso noturno 0,03,
 * só das nuvens) multiplicado pelo MESMO uLuzGanho de tudo. O eclipse é
 * o MESMO da superfície (a casca está 0,15% acima — a geometria do cone
 * é idêntica dentro de sub-pixel): uma nuvem dentro da umbra escurece
 * junto com o oceano embaixo dela.
 *
 * O cabeçalho é um trecho à parte (07/10) para a variante
 * `profundidade` reusá-lo; o `NUVENS_FRAG` montado é o mesmo texto.
 */
const NUVENS_CABECALHO = /* glsl */ `
uniform sampler2D uMapaNuvens;
uniform vec3 uDirSolLocal; // no frame DA CASCA (a deriva é da CPU)
uniform float uLuzGanho;
varying vec3 vLocal;
varying vec2 vUv;
${GLSL_GUARDAS}
${GLSL_SOMBRA_ECLIPSE}
`;

export const NUVENS_FRAG = NUVENS_CABECALHO + /* glsl */ `void main() {
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

// ------------------------------------------------------------
// A VARIANTE `profundidade` (rodada das nuvens, 07/10): as nuvens
// ganham sombra no chão, relevo pela luz e caminho inclinado. A
// `classica` são os dois shaders acima, intocados; quem escolhe é
// `TerraResolvida.definirVariante` (a porta `?terra=` e o preset).
// ------------------------------------------------------------

/**
 * A OPACIDADE DE UM TEXEL DE NUVEM — a função ÚNICA que a casca
 * `profundidade` desenha (na vertical, μ = 1) e que a sombra no chão
 * mede: a nuvem que se vê e a que tapa o Sol são o mesmo número. O
 * canal `clouds` é cor, então o texel chega decodificado de sRGB
 * (≈ c^2,2) — é o MESMO valor que a casca clássica usa de alfa. Quem
 * inclui declara `uMapaNuvens` antes; as derivadas vêm de fora porque
 * as amostras deslocadas e as dos laços não podem pedir a derivada
 * implícita.
 */
const GLSL_ALFA_DA_NUVEM = /* glsl */ `
float alfaDaNuvem(vec2 uv, vec2 ddx, vec2 ddy) {
  return clamp(textureGrad(uMapaNuvens, uv, ddx, ddy).r, 0.0, 1.0);
}
`;

/**
 * A SUPERFÍCIE COM AS NUVENS NO CAMINHO DO SOL — o `TERRA_FRAG` inteiro
 * (os mesmos três trechos), menos a luz direta.
 *
 * A GEOMETRIA, no espaço da esfera unitária do mesh (onde o elipsoide é
 * esfera e a casca das nuvens é a esfera de raio r = RAZAO_CASCA_NUVENS):
 * o raio que sai do ponto p rumo ao Sol cruza a casca em
 * q = p + (−b + √(b² + r² − 1))·Ls, com Ls o Sol levado a esse espaço
 * (`uDirSolLocal * uNormalEsc`, normalizado) e b = max(p·Ls, 0). O
 * radicando é ≥ r² − 1 > 0 (nunca NaN), e o grampo em b para o alcance
 * da sombra em ~350 km além do terminador.
 *
 * O TEXEL de q sai por diferença de ângulos a partir do `vUv` do ponto
 * (nunca por `acos`): Δu pelo ângulo assinado entre (−x, z) de p e de q
 * — a convenção da SphereGeometry, u = atan(z, −x)/2π (pinada em
 * terra.test.ts) — e Δv pela diferença de latitude, atan(y, |xz|)/π.
 * A deriva das nuvens entra como `uDeslocU` = fract(−θ/2π), calculado na
 * CPU em float64 (u_nuvem = u_chão − θ/2π); nem θ nem seno ou cosseno
 * dele chegam à GPU.
 *
 * A TRANSMISSÃO é medida, não regulada: T = 1 − α(q), a opacidade
 * VERTICAL que a casca desenha naquele texel (`alfaDaNuvem`). Ela entra
 * LINEAR e só no Sol: a lanterna (fill de câmera) e as cidades (emissão)
 * não atravessam nuvem nenhuma, e o especular apaga junto com a difusa.
 * Céu limpo (T = 1) devolve a luz do `TERRA_FRAG`.
 */
export const TERRA_PROFUNDIDADE_FRAG =
  SUPERFICIE_CABECALHO +
  /* glsl */ `uniform sampler2D uMapaNuvens;
uniform float uDeslocU;     // fract(−θ/2π) da deriva das nuvens (CPU, float64)
${GLSL_ALFA_DA_NUVEM}
float transmissaoDasNuvens(vec3 local, vec2 uv) {
  vec3 p = normSeguro(local);
  vec3 ls = normSeguro(uDirSolLocal * uNormalEsc);
  float b = max(dot(p, ls), 0.0);
  float r = ${RAZAO_CASCA_NUVENS};
  vec3 q = p + (-b + sqrt(b * b + r * r - 1.0)) * ls;
  vec2 a = vec2(-p.x, p.z);
  vec2 c = vec2(-q.x, q.z);
  float rp = length(a);
  float rq = length(c);
  // perto do polo o ângulo em u não existe: Δu = 0, e o atan nunca vê (0, 0)
  float degenerado = step(rp * rq, 1.0e-8);
  float du = (1.0 - degenerado) * atan(a.x * c.y - a.y * c.x, dot(a, c) + degenerado)
    / 6.28318531;
  float dv = (atan(q.y, rq) - atan(p.y, rp)) / 3.14159265;
  return 1.0 - alfaDaNuvem(uv + vec2(du + uDeslocU, dv), dFdx(uv), dFdy(uv));
}
` +
  SUPERFICIE_ATE_O_ESPECULAR +
  /* glsl */ `  // A LUZ ANTES DO ALBEDO, com as NUVENS NO CAMINHO DO SOL: o termo
  // do Sol passa pela transmissão T da casca; a lanterna fica de fora
  // (a mesma do TERRA_FRAG), e o especular é do Sol, então apaga junto.
  vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 luzSol = vec3(uLuzGanho) * sombras;
  float transmissao = transmissaoDasNuvens(vLocal, vUv);
  vec3 lanterna = lanternaDeLeitura(nRelevo, v, sombras);
  vec3 luz = mix(
    luzDoGlobo(vec3(0.0), lanterna),
    luzDoGlobo(vec3(ndotl) * luzSol, lanterna),
    transmissao
  );
  vec3 direta = albedo * luz + vec3(espec * transmissao) * luzSol;

` +
  SUPERFICIE_EMISSAO;

/**
 * AS NUVENS COM PROFUNDIDADE — a casca do `NUVENS_FRAG` (o mesmo
 * cabeçalho, o mesmo terminador, o mesmo eclipse) com três coisas a mais.
 *
 * 1. CAMINHO INCLINADO (Beer–Lambert): a camada vista de lado é mais
 *    espessa, α_vista = 1 − (1 − α)^(1/μ), μ o cosseno entre a normal da
 *    casca e a direção da câmera (`uCamNuvens`, no frame DA CASCA — a
 *    deriva desfeita na CPU como a do Sol), com μ ≥ 0,05 no limbo.
 *
 * 2. RELEVO PELA LUZ. A ALTURA DO TOPO É INFERIDA DA ESPESSURA ÓPTICA DO
 *    MAPA REAL de nuvens — não há medida de altura nele: τ = −ln(1 − α)
 *    (a mesma α que a casca desenha), grampeado em α 0,98, e a altura
 *    vai linear em τ até 10 km. Os 10 km são a espessura de uma nuvem de
 *    convecção funda (base a ~1–2 km, topo na tropopausa a ~11–12 km); as
 *    camadas finas ficam com centenas de metros.
 *    O CAMPO É PRÉ-FILTRADO na escala das células de nuvem: a altura é
 *    lida com a pegada de `ESCALA_DO_RELEVO_KM` (dois texels do mapa de
 *    8192, ≈ 9,8 km — o nível de mip 1 do 8k, o 0 do 4k; nunca menor que
 *    a pegada do pixel), e a normal sai por diferenças centrais a ±essa
 *    mesma distância: o relevo tem ~20 km de lado, o tamanho de uma
 *    célula, e não o de um bloco de compressão (o 8k cru a ±1 texel saía
 *    granulado, 07/10 v1). A escala é em km, então 4k e 8k desenham o
 *    mesmo relevo. Referencial leste/norte do `TERRA_FRAG`; o relevo some
 *    perto do polo (ρ < 0,05).
 *    O relevo entra como RAZÃO de difusas envoltas D(nRelevo·L)/D(n·L),
 *    grampeada em `RAZAO_TETO`, multiplicando a parte SOLAR do termo
 *    `dia` (o piso noturno não é Sol e fica de fora): onde o mapa é plano
 *    a razão é 1 e a nuvem sai com o brilho e a faixa dia/noite da
 *    `classica`. A envolta é a do próprio terminador das nuvens
 *    (−lo = 0,25), nunca um piso de ambiente.
 *
 * 3. SOMBRA PRÓPRIA com o Sol baixo: seis passos de 8 km rumo ao Sol no
 *    MESMO campo filtrado (48 km de alcance), entrando abaixo de 20° de
 *    elevação e inteira abaixo de 10°; o raio sobe tan(E) por km (E
 *    grampeado em 0 — abaixo do horizonte vale o rasante). A pegada de
 *    ~10 km cobre o vão de 8 km entre os passos (com a pegada do pixel um
 *    topo mais estreito que o passo deixava cópias tracejadas da sombra),
 *    e a penumbra cresce com a distância ao topo que tapa (1 km por
 *    passo), então a borda não marca o espaçamento dos passos.
 *
 * 4. DUAS PARCELAS DE LUZ (07/10, v2): numa nuvem espessa a luz que volta
 *    ao olho é sobretudo de espalhamento MÚLTIPLO — o fóton já andou
 *    quilômetros dentro dela e sai difuso, sem lembrar a face por onde
 *    entrou; o relevo de pequena escala não o sombreia. Num véu fino
 *    quase todo fóton espalha uma vez só (a chance de um segundo
 *    espalhamento cresce com τ ≈ α). Então a parte solar se divide: a
 *    fração SIMPLES leva a razão do relevo e a sombra própria; a fração
 *    MÚLTIPLA, `FRACAO_MULTIPLA_OPACA`·α (0,5 na nuvem opaca, → 0 no véu),
 *    leva só o termo `dia` da esfera, como hoje. O lado à sombra fica
 *    cinza, não preto — e sem termo de ambiente.
 *
 * Ordem de desenho e depth são os da casca clássica (o material é que
 * decide: ordem 8, sem escrever depth).
 */
export const NUVENS_PROFUNDIDADE_FRAG =
  NUVENS_CABECALHO +
  /* glsl */ `uniform vec3 uCamNuvens; // câmera no frame DA CASCA, em raios equatoriais
${GLSL_ALFA_DA_NUVEM}
const float RAIO_KM = ${BODY_AXES.earth[0].toFixed(1)};
const float ESPESSURA_KM = 10.0;
const float ALFA_TETO = 0.98;
const float TAU_TETO = ${(-Math.log(1 - 0.98)).toFixed(4)};
const float ENVOLTA = ${(-NUVEM_TERMINADOR.lo).toFixed(2)};
const float ESCALA_DO_RELEVO_KM = ${((2 * 2 * Math.PI * BODY_AXES.earth[0]) / 8192).toFixed(2)}; // 2 texels do 8192
const float RAZAO_TETO = 2.0;
const float FRACAO_MULTIPLA_OPACA = 0.5;
const int PASSOS_DA_SOMBRA = 6;
const float PASSO_KM = 8.0;
const float SUAVIDADE_KM = 1.0;

float alturaDeAlfa(float alfa) {
  return ESPESSURA_KM * (-log(1.0 - min(alfa, ALFA_TETO)) / TAU_TETO);
}
float alturaKm(vec2 uv, vec2 ddx, vec2 ddy) {
  return alturaDeAlfa(alfaDaNuvem(uv, ddx, ddy));
}
float difusaEnvolta(float x) {
  return max(x + ENVOLTA, 0.0) / (1.0 + ENVOLTA);
}

void main() {
  vec2 ddx = dFdx(vUv);
  vec2 ddy = dFdy(vUv);
  float alfa = alfaDaNuvem(vUv, ddx, ddy);
  vec3 n = normSeguro(vLocal);
  float ndotl = dot(n, uDirSolLocal);

  // o referencial leste/norte do TERRA_FRAG; no polo (rho → 0) o relevo
  // some em vez de dividir por ~0
  vec3 leste = vec3(n.z, 0.0, -n.x);
  float rho = length(leste);
  leste /= max(rho, 1.0e-6);
  vec3 norte = cross(n, leste);
  float pesoPolo = linstep(0.0, 0.05, rho);
  float kmPorU = 6.28318531 * RAIO_KM * max(rho, 0.05);
  float kmPorV = 3.14159265 * RAIO_KM;

  // o campo de altura FILTRADO na escala das células: pegada isotrópica
  // em km (nunca menor que a do pixel), e as tomadas a ±essa distância
  vec2 tomadaU = vec2(ESCALA_DO_RELEVO_KM / kmPorU, 0.0);
  vec2 tomadaV = vec2(0.0, ESCALA_DO_RELEVO_KM / kmPorV);
  vec2 pegadaU = vec2(max(tomadaU.x, abs(ddx.x) + abs(ddy.x)), 0.0);
  vec2 pegadaV = vec2(0.0, max(tomadaV.y, abs(ddx.y) + abs(ddy.y)));
  float hL = alturaKm(vUv + tomadaU, pegadaU, pegadaV);
  float hO = alturaKm(vUv - tomadaU, pegadaU, pegadaV);
  float hN = alturaKm(vUv + tomadaV, pegadaU, pegadaV);
  float hS = alturaKm(vUv - tomadaV, pegadaU, pegadaV);
  float gLeste = (hL - hO) / (2.0 * ESCALA_DO_RELEVO_KM);
  float gNorte = (hN - hS) / (2.0 * ESCALA_DO_RELEVO_KM);
  vec3 nRelevo = normSeguro(n - pesoPolo * (gLeste * leste + gNorte * norte));
  float razao = clamp(
    difusaEnvolta(dot(nRelevo, uDirSolLocal)) / max(difusaEnvolta(ndotl), 1.0e-4),
    0.0, RAZAO_TETO
  );

  float pesoSombra = pesoPolo * (1.0 - linstep(
    ${Math.sin((10 * Math.PI) / 180).toFixed(4)}, ${Math.sin((20 * Math.PI) / 180).toFixed(4)}, ndotl
  ));
  float sombraPropria = 1.0;
  if (pesoSombra > 0.0) {
    vec2 horizontal = vec2(dot(uDirSolLocal, leste), dot(uDirSolLocal, norte));
    float cosE = length(horizontal);
    vec2 rumo = horizontal / max(cosE, 1.0e-4);
    vec2 passoUv = PASSO_KM * vec2(rumo.x / kmPorU, rumo.y / kmPorV);
    float subida = PASSO_KM * max(ndotl, 0.0) / max(cosE, 1.0e-3);
    // o MESMO campo filtrado do relevo, no ponto de partida também
    float h0 = alturaKm(vUv, pegadaU, pegadaV);
    float luz = 1.0;
    for (int i = 1; i <= PASSOS_DA_SOMBRA; i++) {
      float f = float(i);
      float acima = alturaKm(vUv + passoUv * f, pegadaU, pegadaV) - h0 - subida * f;
      // penumbra que cresce com a distância ao topo que tapa (1 km por
      // passo): a borda da sombra não marca o espaçamento dos passos
      luz = min(luz, 1.0 - clamp(acima / (SUAVIDADE_KM * f), 0.0, 1.0));
    }
    sombraPropria = mix(1.0, luz, pesoSombra);
  }

  // as duas parcelas: a simples leva relevo e sombra própria, a múltipla
  // (FRACAO_MULTIPLA_OPACA·α) só o termo da esfera
  float multipla = FRACAO_MULTIPLA_OPACA * alfa;
  float dia = max(
    linstep(${NUVEM_TERMINADOR.lo.toFixed(2)}, ${NUVEM_TERMINADOR.hi.toFixed(2)}, ndotl)
      * mix(razao * sombraPropria, 1.0, multipla),
    ${NUVEM_TERMINADOR.pisoNoturno.toFixed(2)}
  );
  vec3 sombra = fatorDeEclipse(vLocal * ${RAZAO_CASCA_NUVENS}, n, ndotl);
  float mu = dot(n, normSeguro(uCamNuvens - vLocal * ${RAZAO_CASCA_NUVENS}));
  float alfaVista = 1.0 - pow(max(1.0 - alfa, 0.0), 1.0 / max(mu, 0.05));
  gl_FragColor = vec4(vec3(dia * uLuzGanho) * sombra, alfaVista);
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
 *
 * ITEM 95 — O ECLIPSE CHEGA AQUI, e chega AMOSTRA A AMOSTRA. Até 25/08
 * este shader nem montava o chunk da sombra: a casca espalhava luz
 * CHEIA por cima de um chão preto. O conserto entra na FONTE do
 * espalhamento, DENTRO do laço — cada amostra do caminho pergunta ao
 * MESMO cone se o Sol a alcança —, e não como um fator único no fim. É
 * a diferença entre modelar o crepúsculo de 360° e apagá-lo: a umbra
 * tem ~200 km e o caminho rasante do raio tem ~2.850 km de ar, então o
 * que sobrevive é a fração ILUMINADA do caminho, ponderada pela
 * densidade. O piso do ar (`PISO_CREPUSCULO_NO_AR`) segura o caso em
 * que o caminho INTEIRO cai na sombra. A derivação mora em `eclipse.ts`.
 *
 * A SOMBRA DO PRÓPRIO GLOBO (06/10, o halo branco da Terra vista da Lua).
 * O O'Neil não a conhece: ele confia que `escalaOtica(angLuz)` cresça
 * até apagar a amostra cujo Sol está atrás do planeta. Mas o polinômio
 * só vale até um pouco além do horizonte, e no limbo NOTURNO o raio da
 * câmera desce tão rasante quanto o do Sol — os dois termos explodem
 * juntos, a diferença cai abaixo de zero, o `clamp` a põe em 0 e a
 * amostra sai SEM extinção nenhuma: pontos brancos e vermelhos na borda
 * escura, que o bloom abre num anel branco em volta do disco pequeno
 * (25° de lente, ~52 px). A conta certa é geométrica e exata: a amostra
 * só espalha luz do Sol se o raio dela até o Sol não cruza a esfera de
 * raio 1 (`solAlcancaAmostra`). Amostra que vê o Sol soma a mesma
 * parcela de antes, bit a bit; o crepúsculo (o ar acima da linha de
 * sombra) fica.
 */
export const ATMOSFERA_FRAG = /* glsl */ `
uniform vec3 uCamLocal;
uniform vec3 uDirSolLocal;
uniform float uLuzGanho;
varying vec3 vPosRaios;
${GLSL_GUARDAS}
${GLSL_SOMBRA_ECLIPSE}
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

// a amostra VÊ o Sol? Só se o raio dela até o Sol não atravessa o globo
// (raio 1): o Sol acima do horizonte, ou abaixo dele mas por cima da
// curvatura — a distância do centro ao raio, h²(1 − cos²), passa de 1
bool solAlcancaAmostra(float angLuz, float altura) {
  return angLuz >= 0.0 || altura * altura * (1.0 - angLuz * angLuz) > 1.0;
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
    // O CHÃO PARA O RAIO (06/10): abaixo de 0,99 raio (o polar é 0,99665)
    // a amostra está DENTRO da Terra sólida — o raio cruzou o globo e o
    // resto do caminho fica atrás dele. Sem isto, no fragmento que vaza
    // pelo depth do disco (vista da Lua, near de 3 km: a frente do globo
    // e a casca de trás ficam a poucos passos de depth), exp(160·(1 − h))
    // passa de 65504, o alvo de meio-float grava infinito e o bloom o
    // espalha em NaN — os quadros PRETOS da Lua a 3,5°. Raio que não
    // toca o chão nunca entra aqui: o resto é bit a bit.
    if (altura < 0.99) break;
    float prof = exp(ESCALA_SOBRE_PROF * (RAIO_INT - altura));
    float angLuz = dot(uDirSolLocal, ponto) / altura;
    float angCam = dot(raio, ponto) / altura;
    float dispersao = clamp(
      offsetInicio + prof * (escalaOtica(angLuz) - escalaOtica(angCam)),
      0.0, 50.0
    );
    vec3 atenua = exp(-dispersao * (INV_LAMBDA4 * (KR * QUATRO_PI) + KM * QUATRO_PI));
    // ITEM 95: a sombra entra na FONTE desta amostra, com o piso do
    // crepúsculo. angLuz já é o cosseno Sol-zênite do ponto — o mesmo
    // ndotlGeo que o chunk usa para esvair a sombra pelo terminador — e
    // ponto/altura é a normal radial dele. Fora de eclipse o chunk
    // devolve vec3(1.0) EXATO e a multiplicação é identidade bit a bit.
    //
    // O CUSTO, declarado: isto põe o cone de eclipse DENTRO do laço —
    // ${ATMOSFERA.amostras} chamadas de fatorDeEclipseNoAr por fragmento do anel de
    // ar, não uma por fragmento. A mitigação é real e está no chunk: a
    // saída antecipada "if (uEclipseAtivo < 0.5) return vec3(1.0);"
    // (src/lib/atlas/eclipse.ts) faz com que, FORA de eclipse, o preço
    // seja ${ATMOSFERA.amostras} comparações de um uniforme mais o max contra o piso —
    // nenhuma das raízes, projeções e length do cone. Com eclipse
    // ativo, o corpo inteiro roda nas ${ATMOSFERA.amostras} amostras, e é aí que o preço
    // mora. NÃO MEDIDO COM gpu-profile: não há número de quadro ou de
    // ms para este trecho — a medição pertence ao regime do item 99, e
    // até ela existir esta é uma forma de custo conhecida, não um custo
    // quantificado.
    vec3 sombraDoAr = fatorDeEclipseNoAr(ponto, ponto / altura, angLuz);
    if (solAlcancaAmostra(angLuz, altura)) {
      acumulada += (atenua * sombraDoAr) * (prof * passoEscalado);
    }
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
