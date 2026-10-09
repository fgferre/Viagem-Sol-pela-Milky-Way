// ============================================================
// OS SHADERS DA TERRA — superfície, nuvens e atmosfera — com as
// constantes-espec que os templates INTERPOLAM (separá-las criaria
// ciclo avaliado no load). Moravam em terra.ts (GLSL inline); o
// padrão da casa é *Shaders.ts em shaders/.
// ============================================================
import {
  ALTURA_DE_ESCALA_KM,
  COMPRIMENTOS_DE_ONDA_UM,
  RAIO_DO_AR_KM,
  massaDeArDeChapman,
  tauRayleighAoNivelDoMar,
} from '../../lib/atlas/arMedido';
import { GLSL_SOMBRA_ECLIPSE } from '../../lib/atlas/eclipse';
import { BODY_AXES } from '../../lib/atlas/iauOrientation';
import { GLSL_LUZ_DA_VISITA } from '../../lib/atlas/luzDaVisita';
import {
  GLSL_QUADRO_TANGENTE,
  GLSL_SOMBRA_DO_HORIZONTE,
  GLSL_SOMBRA_PARCIAL_DO_RELEVO,
} from '../world/corpos/corpos';

/** Casca das nuvens: +0,15% do raio — alto o bastante para o depth
 *  separar (medido: ~800× o passo de depth nesta geometria de câmera),
 *  baixo o bastante para não parecer uma segunda superfície. */
export const RAZAO_CASCA_NUVENS = 1.0015;
/**
 * A NUVEM QUEBRADA da sombra no chão (item 232, 08/10; as contas em
 * `TERRA_PROFUNDIDADE_FRAG`): `refletanciaGrossa` é o Rc da nuvem grossa
 * (τc = 23, o limite do ISCCP, pela refletância de Bohren 1987), `g` a
 * assimetria da gota que a mesma Bohren e a escala delta usam, `alfaTeto`
 * o α mais alto que a sombra lê (o τ de α = 1 é infinito).
 */
const NUVEM_QUEBRADA = { refletanciaGrossa: 0.633, g: 0.85, alfaTeto: 0.98 } as const;
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
  comprimentosDeOnda: COMPRIMENTOS_DE_ONDA_UM,
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
 * direta; o `TERRA_FRAG` montado é o mesmo texto de antes, byte a byte,
 * mais o realce do relevo (item 232) atrás de `#ifdef REALCE_DO_RELEVO`,
 * que só a `profundidade` define — o preprocessador o tira da clássica.
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
#ifdef REALCE_DO_RELEVO
    // o relevo realçado (item 232, declarado): alturas ×k → inclinação
    // ×k; o zero do mapa é 128/255 (o mar), que fica onde está. Em k = 1
    // o ramo não corre e a normal é a medida, bit a bit.
    if (uRealceDoRelevo != 1.0) {
      vec2 inclinacao = 1.0 / 255.0 + uRealceDoRelevo * (tn.xy - 1.0 / 255.0);
      nRelevo = normSeguro(leste * inclinacao.x + norte * inclinacao.y + n * tn.z);
    }
#endif
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

`;

/** A saída da `classica`: o chão como sai da superfície, sem ar no
 *  caminho. A `profundidade` troca só este trecho; o `TERRA_FRAG` montado
 *  é o mesmo texto de antes, byte a byte. */
const SUPERFICIE_SAIDA = /* glsl */ `  gl_FragColor = vec4(direta + luzes, 1.0);
}
`;

export const TERRA_FRAG =
  SUPERFICIE_CABECALHO +
  SUPERFICIE_ATE_O_ESPECULAR +
  SUPERFICIE_LUZ_DIRETA +
  SUPERFICIE_EMISSAO +
  SUPERFICIE_SAIDA;

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
 * A LUZ DO PÔR DO SOL (08/10, v2: o ar medido) — a cor do Sol que CHEGA
 * a um ponto da Terra depois de atravessar o ar LIMPO. A `altura` h em
 * km, o Sol a χ do zênite:
 *
 *     T(λ) = exp(−τ(λ) · e^(−h/H) · Ch(x, χ)),  x = (R + h)/H.
 *
 * - τ é o Rayleigh MEDIDO ao nível do mar, τ_R = 0,008569·λ⁻⁴·(1 +
 *   0,0113·λ⁻² + 0,00013·λ⁻⁴), λ em µm — a forma de Hansen & Travis
 *   (1974), conferida por Bucholtz (1995, Appl. Opt. 34, 2765) —, nos
 *   três λ do limbo: ≈ (0,0493; 0,0841; 0,1772). O aerossol tem nome e
 *   vale zero: ar limpo — sem poeira nem fumaça.
 * - H = 8 km, a altura de escala do Rayleigh; R, o raio equatorial.
 * - Ch é a massa de ar da atmosfera exponencial esférica: a forma
 *   assintótica clássica de Chapman (1931) para χ ≤ 90°,
 *   Ch ≈ √(πx/2)·e^(y²)·erfc(y), y = √(x/2)·cos χ (ver Smith & Smith
 *   1972, JGR 77, 3592). Contra a integral numérica em x ≈ 797 ela erra
 *   menos de 0,15% de 0° a 90° (35,4 no horizonte). O produto e^(y²)·
 *   erfc(y) sai sem exponencial nenhuma (Abramowitz & Stegun 7.1.26 até
 *   y = 3, a série assintótica 7.1.23 dali em diante; 0,07% na emenda),
 *   então nada estoura no zênite (y ≈ 20) nem dá NaN no horizonte.
 *
 * NORMALIZADA PELO ZÊNITE na mesma altura: entra T(χ)/T(0) =
 * exp(−τ·e^(−h/H)·(Ch(χ) − Ch(0))). O mapa do dia já é o planeta
 * fotografado com o Sol alto e não existe termo de perspectiva aérea —
 * então o Sol a pino fica exatamente como hoje (o fator é 1) e só o Sol
 * baixo avermelha: no chão, a 30° de altura ≈ (0,95; 0,92; 0,84), a 10°
 * (0,80; 0,68; 0,45), no horizonte (0,18; 0,055; 0,002) — vermelho fundo.
 *
 * ABAIXO DO HORIZONTE o ponto não vê o Sol, mas a política `assistida`
 * acende o chão numa faixa logística além do terminador: χ é grampeado em
 * 90°, e a faixa aprovada guarda a forma com a cor do Sol posto em vez de
 * sair preta. As nuvens usam o mesmo grampo até o horizonte DELAS, e além
 * dele apagam a parte solar (ver `NUVENS_PROFUNDIDADE_FRAG`).
 *
 * Não é o ar do limbo clássico (o O'Neil da `ATMOSFERA_FRAG`, de altura
 * de escala ~40 km, que pintava este Sol de âmbar até o meio-dia): este é
 * o ar medido — o da luz que chega e, na `profundidade`, o do limbo
 * (`ATMOSFERA_PROFUNDIDADE_FRAG`).
 */
const GLSL_TRANSMITANCIA_DO_SOL = /* glsl */ `
const vec3 TAU_RAYLEIGH = vec3(${COMPRIMENTOS_DE_ONDA_UM.map((l) => tauRayleighAoNivelDoMar(l).toFixed(5)).join(', ')});
const vec3 TAU_AEROSSOL = vec3(0.0); // ar limpo — sem poeira nem fumaça
const float ALTURA_DE_ESCALA_KM = ${ALTURA_DE_ESCALA_KM.toFixed(1)};
const float RAIO_DO_AR_KM = ${RAIO_DO_AR_KM.toFixed(4)};

// e^(y²)·erfc(y) para y >= 0, sem exponencial: A&S 7.1.26 até 3, a
// série assintótica 7.1.23 dali em diante
float erfcEscalada(float y) {
  if (y < 3.0) {
    float t = 1.0 / (1.0 + 0.3275911 * y);
    return t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  }
  float q = 1.0 / (y * y);
  return 0.5641895835 / y * (1.0 - q * (0.5 - q * (0.75 - q * 1.875)));
}
// a massa de ar de Chapman, x = (R + h)/H, mu = cos χ em [0, 1]
float massaDeArDeChapman(float x, float mu) {
  return sqrt(1.5707963 * x) * erfcEscalada(sqrt(0.5 * x) * mu);
}
vec3 transmitanciaDoSol(float alturaKm, float cosZenite) {
  float x = (RAIO_DO_AR_KM + alturaKm) / ALTURA_DE_ESCALA_KM;
  float excesso = massaDeArDeChapman(x, clamp(cosZenite, 0.0, 1.0)) - massaDeArDeChapman(x, 1.0);
  return exp(-(TAU_RAYLEIGH + TAU_AEROSSOL) * exp(-alturaKm / ALTURA_DE_ESCALA_KM) * excesso);
}
`;

/** O topo do ar medido: 100 km = 12,5 alturas de escala, onde a
 *  densidade já é e^(−12,5) ≈ 4e-6 da do chão — abaixo da casca (1,025,
 *  ~160 km), então todo raio que cruza este ar tem fragmento nela. */
const ALTURA_DO_TOPO_DO_AR_KM = 100;
/** Amostras do raio da câmera no ar medido: contra 4.000 passos, 16 erram
 *  menos de 2% do chão a 60 km de altura tangente, de dia, no terminador
 *  e contra o Sol (medido 08/10). */
const AMOSTRAS_DO_AR_MEDIDO = 16;

/**
 * O ESPALHAMENTO MÚLTIPLO (08/10) — a luz que já espalhou uma vez (no ar
 * ou no chão) e espalha de novo. Sem ele o limbo e o véu ficam só com a
 * primeira ordem, e no azul perto do chão a segunda em diante é da mesma
 * ordem de grandeza.
 *
 * O MÉTODO é o de Hillaire (2020), "A Scalable and Production Ready Sky
 * and Atmosphere Rendering Technique", Computer Graphics Forum 39(4)
 * (EGSR), §5.5: num ponto a h km com o Sol a cos χ do zênite,
 *
 *     L₂ = média, sobre a esfera de direções ω, de L'(ω), com
 *     L'(ω) = ∫ β·T_vista·T_sol·P(ω·s)/(4π) ds  +  T_chão·(A/π)·max(n·s, 0)·T_sol,chão
 *     f  = média de ∫ β·T_vista ds      (a fração que o ar devolve de uma
 *                                          luz isótropa de valor 1)
 *     Ψ  = L₂·(1 + f + f² + …) = L₂ / (1 − f)
 *
 * — a fase isótropa nas ordens ≥ 3, e a hipótese de que a luz em volta do
 * ponto é a mesma dos vizinhos (a série geométrica). No ar conservativo
 * (β de espalhamento = β de extinção, sem absorção) f é a média de
 * 1 − T(ω), sempre < 1: a série converge. A fonte de cada amostra do
 * raio da câmera vira β·(T_sol·P(θ)/4π + Ψ).
 *
 * UMA DIFERENÇA DO ARTIGO, medida: na primeira volta (o L') entra a fase
 * de Rayleigh de verdade, P = ¾(1 + (ω·s)²), e não a isótropa que
 * Hillaire usa ali por simplicidade — com o Sol fixo na célula da tabela
 * ela sai de graça. Com a isótropa, a série passava do limite do ar
 * conservativo: no ponto subsolar sobre chão preto, F↑(topo) + F↓(chão)
 * dava 0,5% (vermelho) a 2,4% (azul) a MAIS do que o ar tira do feixe do
 * Sol, igual com a tabela fina (o erro é do método, não da grade); com a
 * de Rayleigh fica 0,7% abaixo, o vazamento de lado da esfera (o juiz
 * mora em terra.test.ts).
 *
 * O AR é o MESMO da luz do pôr do sol (τ_R, H, R; aerossol zero) e o MESMO
 * caminho do Sol (`caminhoDoSolNoAr`, gêmeo de `caminhoDoSol`), numa
 * esfera — o frame esticado dos shaders. Guarda-se π·Ψ, nas unidades do
 * chão (π·L/E), três canais.
 *
 * O CHÃO devolve A = 0,29: o albedo de Bond da Terra medido pelo CERES
 * (Stephens et al. 2015, Rev. Geophys. 53, 141) — o chão e as nuvens
 * juntos, na média do planeta, porque uma tabela única não sabe se embaixo
 * há mar (0,06) ou nuvem (0,6). Ele carrega dentro os ~0,06 do próprio ar,
 * contados de novo no salto do chão: uma estimativa por cima, declarada.
 *
 * A GRADE: 32 colunas em cos χ de −1 a 1 (a noite entra: o crepúsculo
 * vem daqui) e 16 linhas em altura com h = 100 km·(j/15)², mais finas
 * perto do chão. As direções: cos θ em faixas que se apertam no horizonte
 * do ponto, dos dois lados (8 no céu, 4 no chão — é ali, entre o raio
 * rasante que atravessa o ar e o que bate no chão, que a média muda de
 * repente), vezes 2 em φ de 0 a π (a simetria do plano do Sol dobra a
 * conta); 16 passos por raio, na forma que conserva energia. Contra 160 +
 * 80 direções e 100 passos ela erra no máximo 4% onde π·Ψ passa de 0,02
 * (e 0,0013 em valor absoluto), a ~10⁵ passos — dezenas de ms, UMA vez
 * na CPU (o ar não muda); o limbo e o véu a leem.
 */
export const ESPALHAMENTO_MULTIPLO = {
  colunas: 32,
  linhas: 16,
  topoKm: ALTURA_DO_TOPO_DO_AR_KM,
  albedoDoChao: 0.29,
  direcoesCeu: 8,
  direcoesChao: 4,
  direcoesPhi: 2,
  passos: 16,
} as const;

/** O raio do Sol até um ponto a `alturaKm`, cosseno do zênite
 *  `cosZenite`, passa por cima do globo? (gêmeo de `solAlcancaOAr`) */
function solAlcancaOArCpu(alturaKm: number, cosZenite: number): boolean {
  const r = RAIO_DO_AR_KM + alturaKm;
  return cosZenite >= 0 || r * r * (1 - cosZenite * cosZenite) >= RAIO_DO_AR_KM * RAIO_DO_AR_KM;
}

/** O caminho do Sol até o ponto, em massas de ar verticais do nível do
 *  mar — o gêmeo em CPU de `caminhoDoSol` (a derivação mora lá). Só vale
 *  com o Sol alcançando o ponto (`solAlcancaOArCpu`). */
export function caminhoDoSolNoAr(alturaKm: number, cosZenite: number): number {
  const H = ALTURA_DE_ESCALA_KM;
  const r = RAIO_DO_AR_KM + alturaKm;
  const densidade = Math.exp(-alturaKm / H);
  if (cosZenite >= 0) return densidade * massaDeArDeChapman(r / H, Math.min(cosZenite, 1));
  const rRasante = r * Math.sqrt(Math.max(1 - cosZenite * cosZenite, 0));
  const hRasante = Math.max(rRasante - RAIO_DO_AR_KM, 0);
  return Math.max(
    2 * Math.exp(-hRasante / H) * massaDeArDeChapman(rRasante / H, 0) -
      densidade * massaDeArDeChapman(r / H, Math.min(-cosZenite, 1)),
    0
  );
}

/**
 * A TABELA π·Ψ (RGBA, `colunas` × `linhas`, a linha j na altura
 * topo·(j/(linhas − 1))², a coluna i em cos χ = −1 + 2i/(colunas − 1)).
 * O alfa leva a fração f do azul, para quem quiser conferir a série.
 * O chamador guarda o resultado.
 */
export function tabelaDoEspalhamentoMultiplo(
  albedo: number = ESPALHAMENTO_MULTIPLO.albedoDoChao
): Float32Array {
  const { colunas, linhas, topoKm, direcoesCeu, direcoesChao, direcoesPhi, passos } = ESPALHAMENTO_MULTIPLO;
  const R = RAIO_DO_AR_KM;
  const H = ALTURA_DE_ESCALA_KM;
  const rTopo = R + topoKm;
  const [t0, t1, t2] = COMPRIMENTOS_DE_ONDA_UM.map(tauRayleighAoNivelDoMar) as [number, number, number];
  const umSobre4Pi = 1 / (4 * Math.PI);
  const chaoSobrePi = albedo / Math.PI;
  const saida = new Float32Array(colunas * linhas * 4);
  for (let j = 0; j < linhas; j++) {
    const r0 = R + topoKm * (j / (linhas - 1)) ** 2;
    // as direções da linha: cos θ em faixas que se apertam no horizonte
    // do ponto (μ_h), dos dois lados — o céu e o chão
    const muH = -Math.sqrt(Math.max(1 - (R / r0) ** 2, 0));
    const direcoes: [number, number, number, number][] = [];
    for (const [n, largura, sinal] of [
      [direcoesCeu, 1 - muH, 1],
      [direcoesChao, 1 + muH, -1],
    ] as const) {
      for (let a = 0; a < n; a++) {
        const u = (a + 0.5) / n;
        const mu = muH + sinal * largura * u * u;
        const peso = (2 * largura * u) / n / direcoesPhi;
        const seno = Math.sqrt(Math.max(1 - mu * mu, 0));
        for (let b = 0; b < direcoesPhi; b++) {
          const phi = (Math.PI * (b + 0.5)) / direcoesPhi;
          direcoes.push([seno * Math.cos(phi), mu, seno * Math.sin(phi), peso]);
        }
      }
    }
    for (let i = 0; i < colunas; i++) {
      const muS = -1 + (2 * i) / (colunas - 1);
      const sx = Math.sqrt(Math.max(1 - muS * muS, 0));
      let l0 = 0, l1 = 0, l2 = 0, f0 = 0, f1 = 0, f2 = 0, somaDosPesos = 0;
      for (const [dx, dy, dz, peso] of direcoes) {
        // o raio p(t) = (0, r0, 0) + t·d: o chão, se o cruza, senão o topo
        const b = r0 * dy;
        const discChao = b * b - (r0 * r0 - R * R);
        const chao = b < 0 && discChao >= 0;
        const tMax = chao ? -b - Math.sqrt(discChao) : -b + Math.sqrt(Math.max(b * b - (r0 * r0 - rTopo * rTopo), 0));
        const dt = Math.max(tMax, 0) / passos;
        // a primeira volta com a fase de Rayleigh do Sol para este raio
        const cosFase = dx * sx + dy * muS;
        const fase = 0.75 * (1 + cosFase * cosFase);
        let v0 = 1, v1 = 1, v2 = 1;
        let rl0 = 0, rl1 = 0, rl2 = 0, rf0 = 0, rf1 = 0, rf2 = 0;
        for (let k = 0; k < passos; k++) {
          const t = (k + 0.5) * dt;
          const px = t * dx;
          const py = r0 + t * dy;
          const pz = t * dz;
          const r = Math.sqrt(px * px + py * py + pz * pz);
          const hKm = Math.max(r - R, 0);
          const camada = (Math.exp(-hKm / H) * dt) / H;
          const a0 = Math.exp(-t0 * camada);
          const a1 = Math.exp(-t1 * camada);
          const a2 = Math.exp(-t2 * camada);
          const e0 = v0 * (1 - a0);
          const e1 = v1 * (1 - a1);
          const e2 = v2 * (1 - a2);
          rf0 += e0;
          rf1 += e1;
          rf2 += e2;
          const cosZ = (px * sx + py * muS) / Math.max(r, 1e-6);
          if (solAlcancaOArCpu(hKm, cosZ)) {
            const c = caminhoDoSolNoAr(hKm, cosZ);
            rl0 += e0 * Math.exp(-t0 * c) * umSobre4Pi * fase;
            rl1 += e1 * Math.exp(-t1 * c) * umSobre4Pi * fase;
            rl2 += e2 * Math.exp(-t2 * c) * umSobre4Pi * fase;
          }
          v0 *= a0;
          v1 *= a1;
          v2 *= a2;
        }
        if (chao) {
          // o chão no fim do raio, Lambert, iluminado pelo Sol que o ar deixa chegar
          const muChao = (tMax * dx * sx + (r0 + tMax * dy) * muS) / R;
          if (muChao > 0) {
            const c = caminhoDoSolNoAr(0, muChao);
            rl0 += v0 * chaoSobrePi * muChao * Math.exp(-t0 * c);
            rl1 += v1 * chaoSobrePi * muChao * Math.exp(-t1 * c);
            rl2 += v2 * chaoSobrePi * muChao * Math.exp(-t2 * c);
          }
        }
        l0 += peso * rl0;
        l1 += peso * rl1;
        l2 += peso * rl2;
        f0 += peso * rf0;
        f1 += peso * rf1;
        f2 += peso * rf2;
        somaDosPesos += peso;
      }
      const o = 4 * (j * colunas + i);
      const n = somaDosPesos;
      saida[o] = (Math.PI * (l0 / n)) / (1 - f0 / n);
      saida[o + 1] = (Math.PI * (l1 / n)) / (1 - f1 / n);
      saida[o + 2] = (Math.PI * (l2 / n)) / (1 - f2 / n);
      saida[o + 3] = f2 / n;
    }
  }
  return saida;
}

/**
 * O AR NO CAMINHO (08/10) — o trecho ÚNICO que o limbo, o chão e as
 * nuvens da `profundidade` usam para o ar entre a câmera e o que ela vê:
 * o espalhamento simples do ar medido (a física do limbo, abaixo) mais o
 * múltiplo da tabela (`ESPALHAMENTO_MULTIPLO`), e a transmitância do
 * caminho. Quem inclui traz `GLSL_GUARDAS`, `GLSL_SOMBRA_ECLIPSE` e
 * `GLSL_TRANSMITANCIA_DO_SOL` antes.
 *
 * TUDO NO FRAME ESTICADO (y·a/c), onde o chão é a esfera unitária — a 8
 * km de escala, os 21 km do achatamento nos polos seriam um anel 14×
 * claro demais ou um vão. As distâncias voltam a km pelo comprimento do
 * raio no frame de verdade; a altura erra no máximo 0,34% dela mesma.
 *
 * `arNoCaminho` marcha o raio m + t·raio de tInicio a tFim (m é o ponto
 * de máxima aproximação do centro, calculado de quem chama a partir do
 * fragmento, nunca da câmera distante — sem perda de float a 60 raios),
 * em `AMOSTRAS_DO_AR_MEDIDO` passos iguais. Cada passo soma pela forma que
 * conserva energia, fonte·T_vista·(1 − e^(−Δτ)), com T_vista o que o
 * caminho já atravessado deixou passar — um passo opaco (o rasante tem
 * τ azul ≈ 12) não estoura nem some. A fonte é P(θ)/4·T_sol (só se o
 * Sol alcança a amostra) + π·Ψ(h, cos χ), e as duas passam pelo eclipse
 * da amostra (`fatorDeEclipseNoAr`; fora de eclipse, vec3(1.0) exato).
 * Devolve a luz nas unidades do chão (π·L/E, sem o ganho) e deixa a
 * transmitância em `vista`.
 *
 * `arAtePonto` é o ar da câmera até um ponto visto (o chão, o topo de
 * uma nuvem): o caminho começa onde o raio entra no ar (ou na câmera, se
 * ela está dentro dele) e termina onde o raio cruza a esfera de raio
 * `raioDoFim` — a mais perto do ponto, de fora ou de dentro. As raízes só
 * depois de o radicando ser grampeado em 0: nada de NaN, nem com a
 * câmera no ar.
 */
const GLSL_AR_NO_CAMINHO = /* glsl */ `
uniform sampler2D uEspalhamentoMultiplo; // π·Ψ de Hillaire (2020), feita uma vez na CPU
const vec3 ESTICA = vec3(1.0, ${(BODY_AXES.earth[0] / BODY_AXES.earth[2]).toFixed(7)}, 1.0); // o elipsoide vira a esfera unitária
const float TOPO_DO_AR = ${((RAIO_DO_AR_KM + ALTURA_DO_TOPO_DO_AR_KM) / RAIO_DO_AR_KM).toFixed(7)};
const float TOPO_DO_AR_KM = ${ALTURA_DO_TOPO_DO_AR_KM.toFixed(1)};
const vec2 GRADE_DO_MULTIPLO = vec2(${ESPALHAMENTO_MULTIPLO.colunas.toFixed(1)}, ${ESPALHAMENTO_MULTIPLO.linhas.toFixed(1)});

// o raio do Sol até um ponto a alturaKm, cosseno do zênite cosZenite,
// passa por cima do globo?
bool solAlcancaOAr(float alturaKm, float cosZenite) {
  float r = RAIO_DO_AR_KM + alturaKm;
  return cosZenite >= 0.0 || r * r * (1.0 - cosZenite * cosZenite) >= RAIO_DO_AR_KM * RAIO_DO_AR_KM;
}

// o caminho do Sol até o ponto, em massas de ar verticais do nível do
// mar (a profundidade óptica é τ × caminho) — quem chama já perguntou
// solAlcancaOAr
float caminhoDoSol(float alturaKm, float cosZenite) {
  float r = RAIO_DO_AR_KM + alturaKm;
  float densidade = exp(-alturaKm / ALTURA_DE_ESCALA_KM);
  if (cosZenite >= 0.0) return densidade * massaDeArDeChapman(r / ALTURA_DE_ESCALA_KM, min(cosZenite, 1.0));
  float rRasante = r * sqrt(max(1.0 - cosZenite * cosZenite, 0.0));
  float hRasante = max(rRasante - RAIO_DO_AR_KM, 0.0);
  return max(
    2.0 * exp(-hRasante / ALTURA_DE_ESCALA_KM) * massaDeArDeChapman(rRasante / ALTURA_DE_ESCALA_KM, 0.0)
      - densidade * massaDeArDeChapman(r / ALTURA_DE_ESCALA_KM, min(-cosZenite, 1.0)),
    0.0
  );
}

// π·Ψ no ponto: a coluna pelo cos χ, a linha pela raiz da altura relativa
vec3 espalhamentoMultiplo(float alturaKm, float cosZenite) {
  vec2 celula = vec2(
    0.5 * clamp(cosZenite, -1.0, 1.0) + 0.5,
    sqrt(clamp(alturaKm / TOPO_DO_AR_KM, 0.0, 1.0))
  );
  return texture2D(uEspalhamentoMultiplo, (0.5 + celula * (GRADE_DO_MULTIPLO - 1.0)) / GRADE_DO_MULTIPLO).rgb;
}

vec3 arNoCaminho(vec3 m, vec3 raio, float tInicio, float tFim, vec3 solLocal, out vec3 vista) {
  float m2 = dot(m, m);
  float passo = max(tFim - tInicio, 0.0) / float(${AMOSTRAS_DO_AR_MEDIDO});
  float passoKm = passo * RAIO_DO_AR_KM * length(raio / ESTICA);
  vec3 sol = normSeguro(solLocal * ESTICA);
  float mSol = dot(m, sol);
  float raioSol = dot(raio, sol);
  // a fase de Rayleigh, P(θ) = ¾(1 + cos²θ), já dividida por 4
  float cosFase = dot(normSeguro(raio / ESTICA), solLocal);
  float quartoDaFase = 0.1875 * (1.0 + cosFase * cosFase);
  vista = vec3(1.0); // o que chega da amostra à câmera
  vec3 luz = vec3(0.0);
  for (int i = 0; i < ${AMOSTRAS_DO_AR_MEDIDO}; i++) {
    float t = tInicio + (float(i) + 0.5) * passo;
    float r = sqrt(m2 + t * t);
    float hKm = max(r - 1.0, 0.0) * RAIO_DO_AR_KM;
    float cosZenite = (mSol + t * raioSol) / max(r, 1.0e-6);
    vec3 atravessa = exp(-TAU_RAYLEIGH * (exp(-hKm / ALTURA_DE_ESCALA_KM) * passoKm / ALTURA_DE_ESCALA_KM));
    vec3 fonte = espalhamentoMultiplo(hKm, cosZenite);
    if (solAlcancaOAr(hKm, cosZenite)) fonte += quartoDaFase * exp(-TAU_RAYLEIGH * caminhoDoSol(hKm, cosZenite));
    vec3 ponto = (m + t * raio) / ESTICA;
    vec3 sombraDoAr = fatorDeEclipseNoAr(ponto, normSeguro(ponto), cosZenite);
    luz += fonte * sombraDoAr * vista * (1.0 - atravessa);
    vista *= atravessa;
  }
  return luz;
}

vec3 arAtePonto(vec3 camera, vec3 ponto, float raioDoFim, vec3 solLocal, out vec3 vista) {
  vec3 paraOPonto = ponto - camera;
  float distancia = length(paraOPonto);
  vec3 raio = paraOPonto / max(distancia, 1.0e-6);
  float tPonto = dot(ponto, raio);
  vec3 m = ponto - tPonto * raio;
  float m2 = dot(m, m);
  float topo2 = TOPO_DO_AR * TOPO_DO_AR;
  vista = vec3(1.0);
  if (m2 >= topo2) return vec3(0.0);
  float tInicio = max(-sqrt(topo2 - m2), tPonto - distancia);
  float corda = sqrt(max(raioDoFim * raioDoFim - m2, 0.0));
  float tFim = abs(tPonto + corda) < abs(tPonto - corda) ? -corda : corda;
  return arNoCaminho(m, raio, tInicio, max(tFim, tInicio), solLocal, vista);
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
 * A NUVEM NO CAMINHO (item 232, 08/10: o campo QUEBRADO). O α que a casca
 * desenha (`alfaDaNuvem`, a opacidade vertical) é lido como a REFLETÂNCIA
 * da nuvem; sem absorção, o que não volta passa — com o Sol a pino, direto
 * + difuso = 1 − α. O texel é um campo quebrado: a fração f = min(α/Rc, 1)
 * dele coberta de nuvem GROSSA, Rc = 0,633 (τc = 23, o limite de nuvem
 * grossa do ISCCP — Rossow & Schiffer 1999 —, pela refletância de duas
 * correntes sem absorção de Bohren 1987, R = (1−g)τ/(2 + (1−g)τ), g =
 * 0,85). Duas parcelas (`nuvemQuebrada`):
 *  - D, o FEIXE DIRETO, lido no texel q do raio do Sol: o que passa pelos
 *    buracos mais o que atravessa a nuvem grossa pela escala delta
 *    (Joseph, Wiscombe & Weinman 1976: o pico de difração, f = g², cai a
 *    centenas de metros do raio, dentro do texel, e conta como direto),
 *    D = 1 − f·(1 − e^(−(1−g²)τ/μ0)), μ0 o cosseno do zênite do Sol NA
 *    casca (≥ 0,055 no terminador);
 *  - F, a DIFUSA que a nuvem transmite e sai pela base, F = f·(1 −
 *    max(α, Rc)), lida no texel logo ACIMA do ponto e espalhada como chega
 *    ao chão: pelo fator de forma h²/(h² + ρ²)², metade dentro de ρ = h, o
 *    α de F é lido com a pegada de 2h (h a altura da casca; nunca menor
 *    que a do pixel) — sem isso F ficava no texel de baixo e acendia uma
 *    franja creme na borda das nuvens.
 * D passa pelas montanhas e leva o especular; F não (vem da base da
 * nuvem, que está acima delas). As duas são só do Sol: a lanterna (fill
 * de câmera) e as cidades (emissão) não atravessam nuvem nenhuma. Céu
 * limpo (α = 0): D = 1, F = 0 — a luz do `TERRA_FRAG`. As medidas e as
 * contas: `capturas/efeitos-timidos/nuvens/medidas-v2.md`. Vieses
 * declarados: F não segue a encosta; o total não depende de μ0 (Bohren),
 * então com o Sol baixo F sai um pouco alto.
 *
 * AS MONTANHAS (07/10; parcial no item 232, 08/10): a sombra do relevo
 * medido (ETOPO 2022) sai dos dois mapas de horizonte pelo chunk da casa
 * (`GLSL_SOMBRA_DO_HORIZONTE`, o de Hipérion, no frame de
 * `GLSL_QUADRO_TANGENTE` — o leste/norte do `TERRA_FRAG`) e multiplica o
 * feixe D: é uma sombra do Sol, como a da nuvem. É a sombra SÓ do relevo
 * e PARCIAL (`sombraParcialDoRelevo`, a lei gama da célula): o teste cru
 * apagaria o chão plano na faixa que a logística da `assistida` acende
 * além do terminador, e o degrau no seno médio apagava a célula de
 * 9,8 km inteira. Sem os mapas (`uHorizonte` 0: a carga foi `classica` e
 * a troca foi ao vivo) o fator é 1 exato até a próxima carga.
 *
 * O RELEVO REALÇADO (item 232, decisão do dono 08/10): `uRealceDoRelevo`
 * = k multiplica as alturas — a inclinação da normal (o mar, o zero do
 * mapa, fica plano) e a tangente de cada seno do horizonte, antes da
 * interpolação e da lei gama (`senoDoHorizonte`, que lê o mesmo
 * `REALCE_DO_RELEVO`). É modo declarado (`?relevo=realcado`, k = 3):
 * a ficha e o selo dizem. Uniform e não define — a troca é ao vivo, sem
 * recompilar; em k = 1 os dois ramos não correm.
 *
 * O CÉU NA SOMBRA (item 232, 08/10): o Sol normalizado no zênite já traz
 * o céu dentro; a luz que chega se divide em DIRETO + CÉU pela Rayleigh do
 * SPCTRAL2 (Bird & Riordan 1986): direto = Tr, céu = 0,5·(1 − Tr^0,95),
 * Tr = e^(−τ·m), com τ e a massa m de Chapman do próprio ar do app, e
 * s = céu/(direto + céu) por canal (`fracaoDoCeu`: 9/16/32 % em R/G/B com
 * o Sol a 15°, 4/7/14 % a 40°). Nuvens e montanhas barram só o direto; o
 * céu ilumina como o chão PLANO (sem a encosta ao Sol), vezes a fração do
 * céu que a faceta vê, V = (1 + n_relevo·n)/2 (céu isotrópico, Liu &
 * Jordan 1963). Chão plano aceso e limpo: a soma volta ao termo de hoje.
 * Medidas e erros declarados (sem a reflexão chão–céu do SPCTRAL2, +1–3 %;
 * o céu acima da casca de nuvens não é barrado por ela; aerossol 0):
 * `capturas/efeitos-timidos/nuvens/medidas-ceu.md`.
 *
 * A LUZ DO PÔR DO SOL (08/10): o Sol que chega ao chão (h = 0 km, cosseno
 * do zênite = `ndotlGeo`) passa por `transmitanciaDoSol`, no `luzSol`,
 * como o eclipse — então a difusa, o brilho do mar e a faixa macia da
 * `assistida` avermelham com o Sol baixo, e a lanterna não. Em
 * `assistida` o fator passa pela tradução de tela do `luzDoGlobo`, junto
 * com o cosseno e o eclipse: o chão tinge mais que as nuvens, que somam
 * linear como sempre.
 *
 * O AR NO CAMINHO DA CÂMERA (08/10, a perspectiva aérea): o que sai do
 * chão (a luz direta, a lanterna e as cidades) chega à câmera atravessado
 * pelo ar, L_visto = L_chão·T_vista + L_ar, com T_vista e L_ar integrados
 * da câmera ao chão pelo MESMO trecho do limbo (`arAtePonto`, com o
 * espalhamento múltiplo) e o ganho do Sol no L_ar. O caminho de vista NÃO
 * é normalizado: olhando para baixo, uma massa de ar dá um véu leve; perto
 * do horizonte, dezenas delas dão o véu forte.
 * SEM CONTAR O AR DUAS VEZES: o mapa do dia (o 8k do Solar System Scope,
 * do Blue Marble da NASA) é refletância de superfície do MODIS, com o ar
 * já removido — o véu entra uma vez, aqui. A normalização do Sol que
 * CHEGA pelo zênite fica (a do pôr do sol, acima): ela segura o meio-dia
 * no brilho do mapa e não acende véu nenhum, só tinge o Sol baixo. O
 * preço, declarado: com o Sol a pino o céu devolve ao chão, em luz
 * difusa, cerca de metade do que o feixe direto perde (o Rayleigh espalha
 * metade para baixo), então o chão sai ~τ/2 claro demais — 9% no azul,
 * 2,5% no vermelho.
 */
export const TERRA_PROFUNDIDADE_FRAG =
  SUPERFICIE_CABECALHO +
  /* glsl */ `uniform sampler2D uMapaNuvens;
uniform float uDeslocU;     // fract(−θ/2π) da deriva das nuvens (CPU, float64)
#define REALCE_DO_RELEVO
uniform float uRealceDoRelevo; // 1 = as alturas medidas; o realçado declarado (Ajustes) as multiplica
${GLSL_ALFA_DA_NUVEM}
${GLSL_TRANSMITANCIA_DO_SOL}
${GLSL_AR_NO_CAMINHO}
${GLSL_QUADRO_TANGENTE}
${GLSL_SOMBRA_DO_HORIZONTE}
${GLSL_SOMBRA_PARCIAL_DO_RELEVO}
const float REFLETANCIA_DA_NUVEM_GROSSA = ${NUVEM_QUEBRADA.refletanciaGrossa}; // Rc: τc = 23, o limite do ISCCP
const float UM_MENOS_G = ${(1 - NUVEM_QUEBRADA.g).toFixed(2)};   // g = ${NUVEM_QUEBRADA.g}, a assimetria da gota
const float UM_MENOS_G2 = ${(1 - NUVEM_QUEBRADA.g ** 2).toFixed(4)}; // a escala delta: o pico de difração f = g² conta como direto
const float ALFA_TETO_DA_SOMBRA = ${NUVEM_QUEBRADA.alfaTeto};
// o campo quebrado: vec2(D, F) a partir do α no raio do Sol (aq), do α
// sobre o ponto com a pegada da difusa (ap) e do cosseno do Sol na casca
vec2 nuvemQuebrada(float aq, float ap, float mu0) {
  float fq = min(aq / REFLETANCIA_DA_NUVEM_GROSSA, 1.0);
  float fp = min(ap / REFLETANCIA_DA_NUVEM_GROSSA, 1.0);
  float ac = max(aq, REFLETANCIA_DA_NUVEM_GROSSA);
  float tc = UM_MENOS_G2 * 2.0 * ac / (UM_MENOS_G * (1.0 - ac));
  return vec2(1.0 - fq * (1.0 - exp(-tc / mu0)), fp * (1.0 - max(ap, REFLETANCIA_DA_NUVEM_GROSSA)));
}
vec2 sombraDasNuvens(vec3 local, vec2 uv) {
  vec3 p = normSeguro(local);
  vec3 ls = normSeguro(uDirSolLocal * uNormalEsc);
  float b = max(dot(p, ls), 0.0);
  float r = ${RAZAO_CASCA_NUVENS};
  float t = -b + sqrt(b * b + r * r - 1.0);
  vec3 q = p + t * ls;
  vec2 a = vec2(-p.x, p.z);
  vec2 c = vec2(-q.x, q.z);
  float rp = length(a);
  float rq = length(c);
  // perto do polo o ângulo em u não existe: Δu = 0, e o atan nunca vê (0, 0)
  float degenerado = step(rp * rq, 1.0e-8);
  float du = (1.0 - degenerado) * atan(a.x * c.y - a.y * c.x, dot(a, c) + degenerado)
    / 6.28318531;
  float dv = (atan(q.y, rq) - atan(p.y, rp)) / 3.14159265;
  // o cosseno do zênite do Sol NA casca (≥ 0,055 no terminador)
  float mu0 = (b + t) / r;
  float aq = min(alfaDaNuvem(uv + vec2(du + uDeslocU, dv), dFdx(uv), dFdy(uv)), ALFA_TETO_DA_SOMBRA);
  // a difusa sai da base, a h km, logo acima do ponto: o α dela com a
  // pegada de 2h em u e em v, nunca menor que a do pixel
  float hKm = (r - 1.0) * RAIO_DO_AR_KM;
  float rho = max(length(vec2(p.x, p.z)), 0.05);
  vec2 gx = dFdx(uv);
  vec2 gy = dFdy(uv);
  vec2 pegadaU = vec2(max(2.0 * hKm / (6.28318531 * RAIO_DO_AR_KM * rho), abs(gx.x) + abs(gy.x)), 0.0);
  vec2 pegadaV = vec2(0.0, max(2.0 * hKm / (3.14159265 * RAIO_DO_AR_KM), abs(gx.y) + abs(gy.y)));
  float ap = min(alfaDaNuvem(uv + vec2(uDeslocU, 0.0), pegadaU, pegadaV), ALFA_TETO_DA_SOMBRA);
  return nuvemQuebrada(aq, ap, mu0);
}
// a fração s da luz do Sol que chega ao chão como CÉU, por canal
vec3 fracaoDoCeu(float cosZenite) {
  float m = massaDeArDeChapman(RAIO_DO_AR_KM / ALTURA_DE_ESCALA_KM, clamp(cosZenite, 0.0, 1.0));
  vec3 direto = exp(-(TAU_RAYLEIGH + TAU_AEROSSOL) * m);
  vec3 ceu = 0.5 * (1.0 - exp(-0.95 * (TAU_RAYLEIGH + TAU_AEROSSOL) * m));
  return ceu / (direto + ceu);
}
// o direto (aceso pela encosta) passa por tDireto; o céu acende como o
// chão plano, na fração vistaDoCeu que a faceta vê
vec3 luzDoSolEDoCeu(vec3 escuro, vec3 aceso, vec3 plano, float tDireto, float vistaDoCeu, vec3 s) {
  return escuro + (1.0 - s) * tDireto * (aceso - escuro) + s * vistaDoCeu * (plano - escuro);
}
` +
  SUPERFICIE_ATE_O_ESPECULAR +
  /* glsl */ `  // A LUZ ANTES DO ALBEDO, com as NUVENS e as MONTANHAS NO CAMINHO DO
  // SOL: o feixe direto D da nuvem vezes a sombra parcial do relevo (os
  // mapas de horizonte, sobre a normal geométrica) mais a difusa F que a
  // nuvem deixa passar, e o céu por fora dos dois; a lanterna fica de fora
  // (a mesma do TERRA_FRAG), e o especular é do feixe, então apaga junto.
  // O Sol chega pelo ar (a luz do pôr do sol): a cor dele no chão, como o
  // eclipse, é fator do Sol e só dele.
  vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 luzSol = vec3(uLuzGanho) * sombras * transmitanciaDoSol(0.0, ndotlGeo);
  vec2 nuvens = sombraDasNuvens(vLocal, vUv);
  float transmissao = nuvens.x * sombraParcialDoRelevo(n, vUv, uDirSolLocal);
  vec3 lanterna = lanternaDeLeitura(nRelevo, v, sombras);
  vec3 escuro = luzDoGlobo(vec3(0.0), lanterna);
  vec3 luz = luzDoSolEDoCeu(
    escuro,
    luzDoGlobo(vec3(ndotl) * luzSol, lanterna),
    luzDoGlobo(vec3(terminadorSuave(ndotlGeo)) * luzSol, lanterna),
    transmissao + nuvens.y,
    0.5 * (1.0 + dot(nRelevo, n)),
    fracaoDoCeu(ndotlGeo)
  );
  vec3 direta = albedo * luz + vec3(espec * transmissao) * luzSol;

` +
  SUPERFICIE_EMISSAO +
  /* glsl */ `  // O AR ENTRE A CÂMERA E O CHÃO (a perspectiva aérea): o chão chega
  // atravessado (T_vista) e o ar acende por cima, até o chão do frame
  // esticado (a esfera unitária, onde vLocal mora)
  vec3 vista;
  vec3 veu = arAtePonto(uCamLocal * ESTICA, vLocal, 1.0, uDirSolLocal, vista);
  gl_FragColor = vec4((direta + luzes) * vista + veu * uLuzGanho, 1.0);
}
`;

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
 * 5. A LUZ DO PÔR DO SOL (08/10): a parte solar passa por
 *    `transmitanciaDoSol` na altura do topo inferido (em km), e só existe
 *    com o Sol acima do horizonte DA NUVEM: um topo a h km o vê até
 *    cos χ = −√(2h/R) (≈ −0,056, 3,2° além do terminador, a 10 km). A
 *    borda é o próprio disco do Sol, 0,53°, sumindo atrás desse horizonte
 *    (`linstep`, sem smoothstep): as nuvens altas ficam vermelhas depois
 *    das baixas, e além disso a nuvem fica só com o piso noturno. A faixa
 *    até −0,25 do `NUVEM_TERMINADOR` guarda a forma onde ainda há Sol; o
 *    piso noturno não é Sol e fica branco.
 *
 * 6. O AR NO CAMINHO DA CÂMERA (08/10): a nuvem chega atravessada pelo
 *    ar e com o véu por cima, pelo MESMO trecho do chão e do limbo
 *    (`arAtePonto`), até o TOPO inferido (a esfera de raio 1 + topo/R no
 *    frame esticado, onde a casca mora em `RAZAO_CASCA_NUVENS`): a nuvem
 *    alta leva menos véu que a baixa. A mistura pelo alfa faz o resto — a
 *    fração α do pixel vê a nuvem e o ar acima dela, a fração 1 − α vê o
 *    chão com o véu dele, sem o ar contar duas vezes.
 *
 * Ordem de desenho e depth são os da casca clássica (o material é que
 * decide: ordem 8, sem escrever depth); o limbo do ar medido desenha
 * ANTES dela (`TerraResolvida.vestirVariante`), então a nuvem na borda
 * tapa o ar que fica atrás dela.
 */
export const NUVENS_PROFUNDIDADE_FRAG =
  NUVENS_CABECALHO +
  /* glsl */ `uniform vec3 uCamNuvens; // câmera no frame DA CASCA, em raios equatoriais
${GLSL_ALFA_DA_NUVEM}
${GLSL_TRANSMITANCIA_DO_SOL}
${GLSL_AR_NO_CAMINHO}
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
const float DISCO_DO_SOL = ${Math.sin((0.53 * Math.PI) / 180).toFixed(5)}; // 0,53°, em cosseno no horizonte

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
  // (FRACAO_MULTIPLA_OPACA·α) só o termo da esfera; o Sol chega ao topo
  // pelo ar (a luz do pôr do sol), e o piso noturno, que não é Sol, não.
  // O Sol só existe acima do horizonte DESTA nuvem: o topo a h km o vê até
  // cos = −√(2h/R) (≈ −0,056 a 10 km), e some ao longo do próprio disco
  float multipla = FRACAO_MULTIPLA_OPACA * alfa;
  float topoKm = alturaDeAlfa(alfa);
  float cosDoPorDoSol = -sqrt(2.0 * topoKm / RAIO_KM);
  float solAcimaDoHorizonte = linstep(cosDoPorDoSol - DISCO_DO_SOL, cosDoPorDoSol, ndotl);
  vec3 dia = max(
    linstep(${NUVEM_TERMINADOR.lo.toFixed(2)}, ${NUVEM_TERMINADOR.hi.toFixed(2)}, ndotl)
      * mix(razao * sombraPropria, 1.0, multipla)
      * transmitanciaDoSol(topoKm, ndotl) * solAcimaDoHorizonte,
    vec3(${NUVEM_TERMINADOR.pisoNoturno.toFixed(2)})
  );
  vec3 sombra = fatorDeEclipse(vLocal * ${RAZAO_CASCA_NUVENS}, n, ndotl);
  float mu = dot(n, normSeguro(uCamNuvens - vLocal * ${RAZAO_CASCA_NUVENS}));
  float alfaVista = 1.0 - pow(max(1.0 - alfa, 0.0), 1.0 / max(mu, 0.05));
  // o ar entre a câmera e o TOPO inferido desta nuvem (6.)
  vec3 vista;
  vec3 veu = arAtePonto(
    uCamNuvens * ESTICA, vLocal * ${RAZAO_CASCA_NUVENS}, 1.0 + topoKm / RAIO_DO_AR_KM, uDirSolLocal, vista
  );
  gl_FragColor = vec4(dia * uLuzGanho * sombra * vista + veu * uLuzGanho, alfaVista);
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
 * O cabeçalho das duas cascas de ar (08/10, no molde do das nuvens): o
 * MESMO conjunto de uniformes, então o par `profundidade` compartilha os
 * objetos do clássico; o `ATMOSFERA_FRAG` montado é o mesmo texto.
 */
const ATMOSFERA_CABECALHO = /* glsl */ `
uniform vec3 uCamLocal;
uniform vec3 uDirSolLocal;
uniform float uLuzGanho;
varying vec3 vPosRaios;
${GLSL_GUARDAS}
${GLSL_SOMBRA_ECLIPSE}
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
export const ATMOSFERA_FRAG = ATMOSFERA_CABECALHO + /* glsl */ `const float RAIO_INT = 1.0;
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

/**
 * O LIMBO DO AR MEDIDO (08/10, variante `profundidade`) — o espalhamento
 * simples de Rayleigh com os MESMOS números da luz do pôr do sol
 * (`GLSL_TRANSMITANCIA_DO_SOL`: τ_R de Hansen & Travis/Bucholtz nos três
 * λ, H = 8 km, o raio equatorial, aerossol zero). O coeficiente na
 * altura h é β(λ, h) = (τ_R(λ)/H)·e^(−h/H) por km; a fase de Rayleigh,
 * P(θ) = ¾(1 + cos²θ), com média 1 na esfera.
 *
 * A CONTA, nas unidades do chão (o `TERRA_FRAG` escreve albedo·N·L·ganho,
 * que é π·L/E de um Lambert): L_ar = ganho·π·∫ β·P/(4π)·T_sol·T_vista ds
 * = ganho·(P/4)·∫ β·T_sol·T_vista ds. Nenhum ganho inventado, nenhum
 * E_SUN: o brilho do anel é o que o ar medido devolve.
 *
 * O RAIO DA CÂMERA vai de onde entra no ar (ou da câmera, se ela está
 * dentro) até onde sai ou bate no chão, e é marchado pelo trecho único
 * `arNoCaminho` (`GLSL_AR_NO_CAMINHO`) — o mesmo do véu sobre o chão e
 * sobre as nuvens, com o espalhamento múltiplo da tabela de Hillaire
 * (`ESPALHAMENTO_MULTIPLO`, 08/10) somado ao simples na fonte de cada
 * amostra.
 *
 * O SOL ATÉ A AMOSTRA, analítico: com o Sol acima do horizonte da
 * amostra (χ ≤ 90°), Chapman como no chão; abaixo dele, o raio do Sol
 * desce até a altura rasante h_r = r·sen χ − R e sobe — o caminho é o
 * rasante inteiro menos a metade que fica atrás da amostra,
 * 2·e^(−h_r/H)·Ch(x_r, 90°) − e^(−h/H)·Ch(x, 180° − χ), a identidade de
 * Chapman com o e^(x(1 − sen χ)) já dobrado no expoente (h_r ≥ 0, então
 * nada passa de 1). Raio rasante que bate no globo: luz zero.
 *
 * O CHÃO É O ELIPSOIDE (o frame esticado do trecho) e o ECLIPSE entra
 * amostra a amostra, como no O'Neil. Sobre o disco os fragmentos de trás
 * morrem no depth da superfície, como os da `ATMOSFERA_FRAG`: o ar sobre
 * o chão e sobre as nuvens é o véu dos shaders deles (`arAtePonto`).
 *
 * AS GUARDAS: as raízes só depois de o radicando ser positivo, o
 * cosseno de Chapman grampeado em [0, 1], o rasante grampeado em 0, o
 * ponto de máxima aproximação calculado a partir do fragmento (perto do
 * ar) e não da câmera distante — sem perda de float a 60 raios.
 */
export const ATMOSFERA_PROFUNDIDADE_FRAG =
  ATMOSFERA_CABECALHO +
  GLSL_TRANSMITANCIA_DO_SOL +
  GLSL_AR_NO_CAMINHO +
  /* glsl */ `
void main() {
  // o raio no frame esticado, a partir do fragmento (perto do ar)
  vec3 noAr = vPosRaios * ESTICA;
  vec3 paraOFragmento = noAr - uCamLocal * ESTICA;
  float distancia = length(paraOFragmento);
  vec3 raio = paraOFragmento / max(distancia, 1.0e-6);
  float tFragmento = dot(noAr, raio);
  vec3 m = noAr - tFragmento * raio; // o ponto do raio mais perto do centro
  float m2 = dot(m, m);
  float tCamera = tFragmento - distancia;
  float topo2 = TOPO_DO_AR * TOPO_DO_AR;
  if (m2 >= topo2) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float meiaCorda = sqrt(topo2 - m2);
  float tInicio = max(-meiaCorda, tCamera);
  float tFim = meiaCorda;
  if (m2 < 1.0) {
    // o chão para o raio — só se a câmera está antes da saída do globo
    float meiaCordaDoChao = sqrt(1.0 - m2);
    if (tCamera < meiaCordaDoChao) tFim = min(tFim, -meiaCordaDoChao);
  }
  if (tFim <= tInicio) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec3 vista;
  vec3 ar = arNoCaminho(m, raio, tInicio, tFim, uDirSolLocal, vista);
  gl_FragColor = vec4(ar * uLuzGanho, 1.0);
}
`;
