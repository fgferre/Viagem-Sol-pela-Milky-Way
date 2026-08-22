// ============================================================
// Shaders da galáxia — pontos com conservação de fluxo (tamanho
// físico em pc → px com alpha compensado), poeira multiplicativa
// que escurece o fundo e billboards de brilho (bojo / marcador).
// ============================================================
import { GALACTIC_MODEL, GLSL_CARTOGRAPHY, glslNumber } from '../cartography/galacticModel';
import { GLSL_LEI_DE_TELA } from '../estrela';
import { GLSL_STAR_COLOR } from './common';
import { GLSL_UNRESOLVED } from '../world/wrappedStars';

// Taxa de saturação do matiz da extinção — a τ alto a cor da coluna vira
// NEUTRA (nuvem densa real é cinza-escura, não infinitamente vermelha; o
// vermelho transmitido também morre abaixo da detecção). Default 0,5
// medido na rodada 20: colourZ do plano 0,30→0,24, edge recorde, e foi o
// que DISSOLVEU a fronteira knee×exposição da rodada 19 (o edge dependia
// da dessaturação ACES do exp 1,4 para esconder o plano vermelho).
// ?chromsat= varre; 0 = cromática plena em qualquer τ (estado antigo).
const qnum = (k: string, d: number) => {
  if (typeof window === 'undefined') return d;
  const v = parseFloat(new URLSearchParams(window.location.search).get(k) ?? '');
  return Number.isFinite(v) ? v : d;
};
const CHROMSAT = qnum('chromsat', 0.5);
// ?samples= — nº de amostras do caminho de extinção (joelho 16 medido na
// rodada 16 SOB O REGIME VELHO; re-preçável). O τ0 da fenda do glow é
// uniform por material desde a rodada 24 (uSlitTau; fixo 2,5 no glow
// compacto, ?haloslit= varre o do halo; o 5,0 foi rejeitado sob o
// regime velho, idem).
/**
 * O TETO, que faltava — e faltava só deste lado. `?nebsteps=` já é
 * `Math.min(v, 96)` em `world/nebula.ts`, pela mesma razão: passo de
 * varredura que o visitante escreve na URL precisa de teto, não só de piso.
 *
 * AQUI O PREÇO DE NÃO TER É MAIOR, porque este número não é uniform: ele
 * entra TEXTUAL no fonte (`for (int i = 0; i < ${NSAMP}; i++)`). Com
 * `?samples=1000000` o laço nasce com um milhão de voltas por fragmento; com
 * `?samples=1e21` o `${}` imprime `1e+21`, que não é literal inteiro em GLSL
 * — o shader nem compila, e a galáxia some sem uma linha de erro que
 * explique. `Math.round` de um float enorme não protege de nenhum dos dois.
 *
 * NÃO É UM ENDEREÇO SÓ com o de `nebula.ts`, de propósito: 96 passos de
 * raymarch e 96 amostras de coluna de extinção são grandezas diferentes que
 * hoje calham de aceitar o mesmo teto. Amarrá-las numa constante faria
 * mexer no teto de uma mudar o da outra em silêncio — acoplamento falso é
 * pior que número repetido. O que se compartilha é a RÉGUA, e ela está
 * escrita aqui.
 */
export const TETO_DE_AMOSTRAS = 96;

/** piso 2, teto 96, inteiro — o que pode virar `${NSAMP}` no fonte GLSL. */
export const amostrasDaExtincao = (bruto: number) =>
  Math.min(TETO_DE_AMOSTRAS, Math.max(2, Math.round(bruto)));

const NSAMP = amostrasDaExtincao(qnum('samples', 16));
// ?warpslit= — a fenda do glow/halo segue o warp (±1 = quiralidade, 0 =
// reta). Na rodada 17 era inútil (só o glow compacto existia — sem fluxo
// além de 8,4 kpc); com o halo de 6–9 kpc a fenda reta voltou a imprimir
// anti-S no centroide vertical, e agora HÁ o que cortar curvado.
const WARPSLIT = qnum('warpslit', 0);

// Vértice das partículas brilhantes — com extinção pela MESMA coluna τ
// das lâminas, amostrada do bake (VTF). É o herdeiro dos 430 k sprites
// multiplicativos: em vez de quads escurecendo o que calha de estar
// atrás, cada partícula é extinta pela fração da coluna de poeira que
// está DE FATO entre ela e a câmera.
export const GALAXY_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;   // diâmetro físico em pc
attribute float aAlpha;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uTanHalfFov;
uniform float uFade;
// canal A da lâmina central bakeada: τ⊥ da coluna de poeira
uniform sampler2D uTauMap;
// base galactocêntrica da cena (EX/EY/EZ) e posição do centro galáctico
uniform vec3 uEX;
uniform vec3 uEY;
uniform vec3 uEZ;
uniform vec3 uGC;

varying vec3 vColor;
varying float vAlpha;

${GLSL_CARTOGRAPHY}
${GLSL_UNRESOLVED}
${GLSL_LEI_DE_TELA}

void main() {
  float dist = length(position - uCamPos);
  // tamanho angular real: pc/dist → fração da tela → pixels
  float px = aSize * uScreenH / (2.0 * uTanHalfFov * max(dist, 1.0));
  // A LEI DE TELA (M5) — os três regimes vêm de estrela.ts, não daqui.
  // Os números eram os MESMOS que a lei nasceu carregando (0,7 / 20 /
  // px²÷0,49): esta camada não move um pixel no M5, o que muda é a
  // DIREÇÃO da dependência. O uniform do teto morreu junto — tinha um
  // valor só (20), knob sem lado A. A migração de REPRESENTAÇÃO desta
  // camada (aAlpha → fluxo na unidade, a morte do platô e do ramo 1/px²,
  // a cessão partícula↔lâmina) segue sendo o M6.
  float clamped, shrink, subPix;
  leiDeTela(px, clamped, shrink, subPix);

  // PROJEÇÃO ANTES DA EXTINÇÃO — o recorte que faltava.
  // As 16 amostras VTF abaixo custam 1,22 ms por milhão de pontos (medido
  // por setDrawRange: 100/75/50/25/10% dá 4,924/3,647/2,394/1,099/0,337 ms,
  // reta com intercepto zero), e em ?t=100 apenas 2,00% dos 4.019.500
  // pontos estão dentro do frustum (medido, ?galstat=1; 2,55% em t=0,
  // 99,98% no face-on). Ou seja: 98% pagavam a integral inteira para serem
  // descartados pelo clipper depois.
  // Isto NÃO tira ponto nenhum da imagem: quem sai daqui já não virava
  // fragmento. Só sobe a projeção — px, clamped, shrink e subPix não
  // dependem de tau, então não há circularidade — e pula o que sobra.
  // A MARGEM É OBRIGATÓRIA: ES rasteriza ponto como QUADRADO em espaço de
  // JANELA, então o centro pode estar fora e a borda ainda depositar. Um
  // corte NDC puro apaga ponto visível — foi medido e rejeitado.
  // A margem exata em Y é (clamped/2 + 2 px) convertida para NDC, e uScreenH
  // é a ALTURA do buffer. Em X ela NÃO é a mesma: depende do aspecto, e o
  // aspecto já está dentro da projeção (P[0][0] = f/aspecto, P[1][1] = f),
  // então P[0][0]/P[1][1] = altura/largura converte uma na outra sem gastar
  // um uniform novo. Usar a margem de Y nos dois eixos parece conservador e
  // NÃO é: em retrato estreito (janela de ~500 px num monitor 4K, aspecto
  // abaixo de 1:2,4) ela fica CURTA e apaga ponto de borda — e nenhum gate
  // do repo enxergaria, porque os três capturam em 1:1, onde sobra 2,4x.
  // A razão certa é P[0][0]/P[1][1]; invertida, piora exatamente o caso que
  // ela existe para cobrir.
  // Modo de falha, se ainda assim faltar margem: vColor e vAlpha ficam em
  // zero e o blend aditivo deposita nada — ponto some, nunca cor errada.
  // Nenhum outro passe usa este material sob outra câmera: o bake tem cena
  // própria com um quad (bakeScene em galaxy.ts), roda ANTES de o grupo da
  // galáxia entrar na cena (director.ts), e GALAXY_VERT é consumidor do
  // tauRT, não produtor. Há um único RenderPass e nenhum overrideMaterial.
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamped;
  vColor = vec3(0.0);
  vAlpha = 0.0;
  // w <= 0 é subconjunto estrito do que o clipper já descarta, e o "=" é o
  // que impede 0/0 = NaN passar batido por toda comparação abaixo.
  if (gl_Position.w <= 0.0) return;
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float margemY = (clamped + 4.0) / uScreenH;
  float margemX = margemY * projectionMatrix[0][0] / projectionMatrix[1][1];
  if (abs(ndc.x) > 1.0 + margemX || abs(ndc.y) > 1.0 + margemY) return;

  // EXTINÇÃO POR CAMINHO AMOSTRADO — rodadas 15/16. A coluna entre a
  // partícula e a câmera é ∫κρ ds com ρ(x,y,z) = τ⊥(x,y)·G(z̃)/(√2π σ):
  // 16 amostras VTF ao longo do trecho do segmento dentro da camada.
  // De cima, o trecho é a própria coluna vertical e a fórmula recupera
  // τ⊥·ΔCDF (o antigo C·τ⊥ — a fração near/far virou geometria do
  // segmento). De RASPÃO, o trecho vira quilo-parsecs e a faixa escura
  // emerge: o piso μ ≥ 0,05 antigo capava o caminho em ~20 alturas de
  // escala, e era por isso que o perfil edge-on media laneDepth −0,07
  // contra 0,94 do alvo — a lâmina de perfil não tinha fenda nenhuma.
  // 16 amostras, não 4: subamostrar uma Σ com estrutura de ~1 kpc NÃO
  // faz média entre partículas — E[e^(−τ̂)] > e^(−E[τ̂]) (convexidade), o
  // viés é sistemático, enche a faixa e suja o centroide vertical por
  // coluna. Fronteira medida na rodada 16 (edgeError t=158 · custo t=0
  // 2560×1440): 4 → 0,928 · 17,7 ms; 16 → 0,873 · 18,8; 32 → 0,881 ·
  // 20,0. O joelho é 16. O custo é latência de fetch (caminhos de meia
  // galáxia espalham as amostras pelo mapa — cache frio; em t=170 os
  // mesmos 16 fetches ficam no vsync); early-exit por saturação não
  // paga (divergência de warp, medido). Candidata: textureLod mip 2–3.
  vec3 toCam = uCamPos - position;
  float D = length(toCam);
  vec3 qv = position - uGC;
  float zP = dot(qv, uEZ);
  float zC = dot(uCamPos - uGC, uEZ);
  // trecho do segmento dentro da banda |z| < 1700 pc (folga para warp
  // e flare; fora dela G(z̃) mata a amostra de qualquer jeito)
  float dzSeg = zC - zP;
  float s0 = 0.0;
  float s1 = 1.0;
  if (abs(dzSeg) > 1e-3) {
    float ta = (-1700.0 - zP) / dzSeg;
    float tb = (1700.0 - zP) / dzSeg;
    s0 = clamp(min(ta, tb), 0.0, 1.0);
    s1 = clamp(max(ta, tb), 0.0, 1.0);
  }
  float dTau = (s1 - s0) * D * ${(1 / NSAMP).toFixed(7)}; // peso de UMA amostra
  float tau = 0.0;
  // Segmento inteiro fora da banda (câmera E partícula do mesmo lado de
  // |z| = 1700 — halo, anã de Sagitário, parte do bojo): s1 == s0, logo
  // dTau == 0 e o "tau *= dTau" lá embaixo zeraria a soma de qualquer
  // jeito. Pular as ${NSAMP} amostras é BIT-EXATO: o ramo evitado só
  // produz o zero que já sairia. O if envolve o laço em vez de entrar na
  // condição dele — a regra de laço da GLSL ES 1.00 exige
  // "índice op constante", e condição composta é portabilidade perdida.
  if (s1 > s0) {
  for (int i = 0; i < ${NSAMP}; i++) {
    float s = s0 + (s1 - s0) * (float(i) + 0.5) * ${(1 / NSAMP).toFixed(7)};
    vec3 sp = position + toCam * s - uGC;
    vec2 sxy = vec2(dot(sp, uEX), dot(sp, uEY));
    float rS = length(sxy);
    float fx = clamp((rS - 7500.0) / 9300.0, 0.0, 1.0);
    float sigmaD = 58.0 + fx * fx * 120.0;
    float zTil = dot(sp, uEZ) -
      galWarpHeight(rS, atan(sxy.y, sxy.x + 1e-7));
    float g = exp(-zTil * zTil / (2.0 * sigmaD * sigmaD));
    float tp = texture2D(uTauMap, sxy / (2.0 * GAL_DISK_RADIUS) + 0.5).a;
    // PISO DIFUSO da poeira. A âncora do NORTE (A_V = 1,5 mag/kpc ⇒
    // τ⊥ = 0,2455 no Sol) é a coluna TOTAL; o mapa já carrega a parte
    // estruturada (filamentos/fendas), então o piso é só a fração
    // difusa, ~metade (0,125 no Sol, perfil radial do gás R_d 5,2 kpc).
    // Sem piso nenhum, 4 amostras de uma Σ recortada acham vão com
    // frequência de raspão — a lâmina do plano sobrevivia inteira e a
    // faixa escura ficava rasa (medido: laneDepth 0,12 sem, 0,37 com o
    // piso cheio — que por sua vez tirou o face-on da banda de ruído).
    tp += 0.6 * exp(-rS / 5200.0);
    tau += tp * g / (2.5066283 * sigmaD);
  }
  }
  tau *= dTau;
  // matiz da coluna satura para neutro em τ alto (?chromsat=; 0 = nunca)
  float chromSat = 1.0 - exp(-tau * ${CHROMSAT.toFixed(3)});
  vec3 extinct = exp(-tau * mix(vec3(0.75, 1.0, 1.32), vec3(1.0), chromSat));

  vColor = aColor * extinct;
  // handoff da unificação 2: a fração da luz que as cascas resolvem
  // como estrelas individuais a esta distância sai da integrada.
  // Além de ~5 kpc unresolved ≡ 1,0 — a vista externa não move.
  vAlpha = aAlpha * uFade * shrink * subPix * unresolved(dist);
}
`;

export const GALAXY_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float i = exp(-r2 * 4.5);
  vec3 col = vColor * i * vAlpha;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Billboard em view-space (mesma técnica das hero stars) para o
// brilho do bojo e o marcador do Sol.
export const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
varying float vZgal;
varying float vXgal;
uniform float uSize;
// polo norte galáctico na cena — para a fenda da faixa no bojo
uniform vec3 uEZ;

void main() {
  vUv = position.xy;
  // altura galáctica do fragmento: o offset do billboard é view-space,
  // então projeta-se EZ para view com a rotação do MV (o mesh só tem
  // translação). Linear no quad ⇒ o varying interpola exato.
  vec3 ezView = mat3(modelViewMatrix) * uEZ;
  vZgal = uSize * dot(position.xy, ezView.xy);
  // coordenada no plano do disco (⊥ a EZ na tela) — raio do ponto
  // tangente da coluna, para a fenda poder seguir o warp
  vec2 h = normalize(vec2(-ezView.y, ezView.x) + 1e-6);
  vXgal = uSize * dot(position.xy, h);
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
// fenda da faixa: 1 = vista rasante (a poeira do plano corta o bojo,
// como nas fotos edge-on); 0 = de cima ou billboards sem fenda
uniform float uLaneGate;
// τ0 da fenda — POR MATERIAL: 2,5 no glow compacto (τ0 maior é beco
// medido); o halo extenso tem o seu próprio (?haloslit=)
uniform float uSlitTau;

varying vec2 vUv;
varying float vZgal;
varying float vXgal;

void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float edgeFade = 1.0 - smoothstep(0.68, 1.0, r);
  float glow = (exp(-r * 3.6) * 0.85 + exp(-r * 14.0) * 0.7) * edgeFade;
  // A faixa escura atravessa o bojo de perfil: extinção por uma lâmina
  // fina de poeira em |z| galáctico, com o CENTRO seguindo o warp do
  // ponto tangente quando ?warpslit=±1 (0 = reta); h = 130 pc casa com
  // a σ da camada de poeira. A forma é a de galWarpHeight, e a AMPLITUDE
  // é a mesma âncora gerada que os outros nove shaders leem — era 1310 pc
  // cravado aqui (o teto da rodada 21) contra os 820 pc que a casa usa
  // desde a rodada 25, e com ?warpamp= a fenda ficava parada enquanto o
  // gás e as estrelas seguiam o knob (item 65).
  float wx = clamp(
    (abs(vXgal) - ${glslNumber(GALACTIC_MODEL.warpStartPc)}) /
      ${glslNumber(GALACTIC_MODEL.diskRadiusPc - GALACTIC_MODEL.warpStartPc)},
    0.0,
    1.0
  );
  float dz = vZgal -
    ${WARPSLIT.toFixed(2)} * sign(vXgal) *
      ${glslNumber(GALACTIC_MODEL.warpAmplitudePc)} * pow(wx, 1.55);
  float laneTau = uSlitTau * exp(-dz * dz / (2.0 * 130.0 * 130.0));
  glow *= mix(1.0, exp(-laneTau), uLaneGate);
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
/** |cos| entre a visada e a normal do disco — o openness do director */
uniform float uMu;
varying vec2 vUv;

void main() {
  vec4 b = texture2D(uBaked, vUv);

  // O quad é quadrado e o disco é inscrito nele: ~21% da área bakeada é
  // canto preto (o bake tem discard em radius > 1, DISC_FRAG). Com
  // b.rgb == 0 a saída é exatamente 0 — hue é sempre finito, porque tc
  // tem piso 1e-4 — e somar 0 em blend aditivo é identidade. Sair aqui
  // poupa ~6 transcendentais por fragmento, BIT-EXATO.
  // O teste é pelo TEXEL e não por radius > 1: o RT usa LinearFilter, e
  // a borda do disco sangra meio texel para fora do raio 1.
  if (dot(b.rgb, b.rgb) <= 0.0) discard;

  // LEI DE COMPRIMENTO DE CAMINHO. Uma coluna vista a ângulo ψ da normal é
  // atravessada por 1/|cos ψ| vezes mais matéria: τ = τ⊥/μ, e a emissão
  // colhida cresce na mesma proporção.
  //
  //   L = Σ_j · F(τ⊥/μ) / μ ,  F(x) = (1 − e^−x)/x
  //
  // O 1/μ parece divergir e NÃO diverge: substituindo F, os dois μ se
  // cancelam e sobra (1 − e^{−τ⊥/μ})/τ⊥, limitado por 1/τ⊥. É o
  // comportamento certo dos dois lados — opticamente fino brilha como
  // 1/cos (por isso uma galáxia de perfil é brilhante), opticamente
  // espesso satura na função-fonte e para de crescer. Nenhum clamp
  // artificial: a saturação sai da física.
  //
  // Escrito já cancelado, que além de mais barato evita o 0/0 em μ→0.
  float mu = max(uMu, 1e-3);
  float t0 = max(b.a, 1e-4);
  float col = (1.0 - exp(-t0 / mu)) / t0;

  // O matiz é a mesma coluna por banda (CCM89, R_V = 3,1), normalizado pela
  // luminância para que só a COR venha daqui e o fluxo continue vindo de
  // col. Sem isso a extinção cromática mexeria no perfil radial e a
  // métrica atribuiria à geometria um efeito que é de cor.
  vec3 tc = max((t0 / mu) * vec3(0.75, 1.0, 1.32), 1e-4);
  vec3 fc = (1.0 - exp(-tc)) / tc;
  vec3 hue = fc / dot(fc, vec3(0.2126, 0.7152, 0.0722));

  gl_FragColor = vec4(b.rgb * hue * col * uLayerAlpha * uFade, 1.0);
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
// altura da lâmina (pc) e chave do peso fino da fenda observada
uniform float uLayerHeight;
uniform float uLaneThin;
uniform float uInferenceGain;
uniform float uBackgroundGain;
// 0 = alpha carrega o τ das lâminas · 1 = o τ das partículas (8º bake)
uniform float uTauExport;
varying vec2 vUv;

${GLSL_CARTOGRAPHY}
${GLSL_STAR_COLOR}

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
  // Rodada 12 (−20%): com o par dominante puro (profundidade 1,0), a
  // razão m2/m4 é ĝ(2)/ĝ(4) da própria crista — alargar o braço sobe
  // m=2 em relação a m=4 sem tocar na base.
  // Rodada 15: −10% adicionais (5,2→4,7 · 9,0→8,1) para reabsorver o
  // m=4 que a extinção por caminho devolveu ao face-on (0,225→0,231).
  float armSharpness = mix(4.7, 8.1, smoothstep(3500.0, 15000.0, radiusPc));
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
  // A poeira é FINA (h~100-150 pc; o colapso do mapa usa 220): pintar a
  // MESMA fenda nas 7 lâminas (-340..380 pc) põe poeira onde não há, e
  // fora do eixo cada lâmina projeta a fenda num ponto — a mancha vira um
  // trem de 5-6 cópias (o retículo diagonal visto na rodada 28; primo
  // face-on das "listras de raspão"). Peso exp(-|z|/220) por lâmina:
  // a fenda mora nas lâminas centrais, que quase coincidem em projeção.
  // uLaneThin é a ESCALA em pc (0 = desligado, sem peso)
  obsLanes *= uLaneThin > 0.5 ? exp(-abs(uLayerHeight) / uLaneThin) : 1.0;
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
  // Rodada 12, medido e revertido: cortar o aditivo 0,16→0,10 moveu
  // m=4 em 0,0015 — este termo NÃO é o piso de m=4. Fica no valor
  // calibrado.
  float rawDensity =
    arms * (0.74 + 0.26 * formationResponse) + formationResponse * 0.16;
  float armDensity =
    rawDensity / pow(1.0 + pow(max(rawDensity, 0.0), 6.0), 0.1666667);
  // Medido no alvo: p90/p20 azimutal fica entre 2 e 4 em TODO o disco.
  // O braço é uma sobredensidade de ~2×, não um filamento sobre o vazio;
  // quem separa os braços é o perfil radial íngreme e a poeira. Zerar o
  // interbraço dava contraste 10–44 e um disco de fitas sobre preto.
  // QUEBRAS DA CRISTA (rodada 31): o EXCESSO do braço sobre o piso de
  // interbraço é modulado ao longo da crista, com média 1. Aqui, e não
  // dentro de galMajorArms: lá a modulação bate no clamp do esqueleto,
  // que corta a metade clara e vira perda de contraste (m=2/m=4/m=6
  // caindo juntos, medido). Este ponto é linear — o piso 0,50 não se
  // move e o fluxo do braço é conservado por construção.
  float structureLight =
    mix(0.50, 1.0, armDensity * galArmBreak(radiusPc, theta)) * clumps;

  // O mapa já fez o split macro observado/inferido; a mesma microtextura
  // fina apenas resolve subestrutura. APOGEE refina a extinção local.
  float dustMacro = mix(gasResponse, max(gasResponse, obsLanes), obsCoverage);
  // A fenda escura É a crista da rede filamentar. Com smoothstep sobre
  // fbm isotrópico a absorção virava um chuvisco sem direção; agora
  // desenha faixas que acompanham e cruzam o braço, como no alvo.
  // FEATHERING — o herdeiro da função estrutural dos 430 k sprites.
  // Medido por eliminação (8 medições): remover os sprites subiu m=4 de
  // 0,188 para 0,259 e NENHUM botão de nível o moveu (S0 ×½, extinção
  // off, barra off, crista ×0,42 e ×2). O que os sprites faziam de
  // estrutural era DECOERÊNCIA: 430 k borrões jitterados quebravam o
  // alinhamento perfeito da fenda com o esqueleto de 4 braços. As fendas
  // reais fazem o mesmo — serpenteiam com espículas (feathering), não
  // traçam a espiral com régua. Jitter de campo no ângulo, só no caminho
  // da POEIRA (a emissão continua limpa, como era com sprites).
  float thJit = theta + (fbm2(p * 9.0 + vec2(3.7, 8.1)) - 0.5) * 0.24;
  float filamentD = spiralFilament(radiusPc, thJit);
  float dustFilament = smoothstep(0.46, 0.80, filamentD);
  // COLUNA FECHADA no lugar de atenuação linear.
  //
  // A lâmina não é uma folha fina: ela representa a coluna de disco atrás
  // daquele pixel. Emissão e poeira compartilham o perfil vertical, então a
  // integral ∫ j·e^{−τ(z)} dz fecha em j·(1−e^{−τ})/τ, e a forma do perfil e
  // a altura de escala CANCELAM — é por isso que as três alturas
  // incompatíveis do projeto (70–260 / 95 / 150 pc) deixam de ser
  // contradição aqui.
  //
  // O ganho não é brilho, é ORDENAÇÃO. 1 − k·d é ⟨j⟩·⟨T⟩: emissão média
  // vezes transmissão média. A coluna é ⟨j·T⟩, que não é a mesma coisa —
  // a poeira na FRENTE apaga o que está atrás dela, a poeira ATRÁS não apaga
  // nada. É essa assimetria que faz a fenda ler como silhueta em vez de véu.
  //
  // 2,39 é o τ que reproduz exatamente a atenuação de pico anterior (0,38),
  // para que esta mudança seja de FORMA e não de nível. A âncora física —
  // A_V = 1,5 mag/kpc dá τ_⊥ = 0,2455 no Sol — é o alvo da calibração
  // offline que ainda falta; enquanto ela não existe, este é um fator de
  // escala honesto sobre uma resposta normalizada, não uma profundidade
  // óptica medida.
  // Fenda da BARRA — herdeira do ramo da barra de putDust. A poeira da
  // barra só existia nos sprites; sem este termo, removê-los deixaria o
  // bojo sem a fenda que atravessa o núcleo nas fotos de referência.
  // Meia-extensão 0,88·5000 pc = 0,262 em unidades do disco; σ⊥ 430 pc
  // = 0,0256. O microNoise quebra o risco liso — sem ele a barra vira
  // um traço de régua.
  float barZ = bp.y / 0.0256;
  float tauBar = exp(-0.5 * barZ * barZ)
               * (1.0 - smoothstep(0.22, 0.28, abs(bp.x)))
               * mix(0.6, 1.0, microNoise);
  // DOIS τ, DOIS DESTINOS — calibrado por eliminação (4 medições):
  // · tauCrest é a fórmula EXATA da rodada 8, que fixou m2/m4. É o que as
  //   lâminas usam em F(τ⊥/μ). Mexer nela quebrou as harmônicas duas
  //   vezes (κ=5: m2/m4 inverteu; crista 0,42: idem) — não mexer.
  // · tauPart vai para o mapa das PARTÍCULAS (8º bake, uTauExport=1):
  //   crista suavizada, porque a lâmina já escava a mesma crista e
  //   escavar duas vezes dobra a profundidade líquida; mais o termo
  //   largo que herda a absorção difusa dos 430 k sprites. O termo largo
  //   NÃO pode entrar nas lâminas: absorção arm-locked de área grande
  //   modula o perfil inteiro do braço e bombeia m=4 (medido: +0,06).
  float tauCrest = (dustMacro * dustFilament + tauBar * 0.04) * 2.39;
  // Rodada 15, medido e revertido: cortar o termo largo 0,31 → 0,10
  // (hipótese: arm-locked bombearia m=4 na lei de caminho) moveu o
  // face-on só −0,002 e custou +0,054 no edge-on (a faixa perdeu
  // profundidade). O termo fica.
  float tauPart =
    (dustMacro * (dustFilament + 0.31) + tauBar * 0.04) * 2.39;
  float tau = mix(tauCrest, tauPart, uTauExport);

  // O núcleo já satura em branco, então subir o bojo não mexe no perfil
  // normalizado — quem desce é o disco. E medido com ?nodisc=1: estas
  // lâminas eram 95% da luz do disco, por isso a granulação travava em
  // 0,048 (alvo 0,075) — luz analítica lisa não granula. O fluxo migra
  // para as partículas, que é onde a estrutura fina existe.
  // A paleta antiga carregava luminância na cor (Y de 0,587 a 0,739). Com a
  // soma de populações normalizada a L≡1 esse brilho voltou de uma vez:
  // discMean medido saltou de 0,1078 para 0,1522 contra alvo 0,1175. O fator
  // devolve o NÍVEL sem devolver o gradiente radial, que não estava em modelo
  // nenhum de intensidade e por isso não deve voltar.
  // ESPALHAMENTO POR TEXEL — herdeiro do draw aditivo dos 430 k sprites.
  // Mesma física do putDust (campo de radiação × auto-blindagem ×
  // eficiência λ^−1,3), avaliada por texel do bake em vez de por sprite:
  // cobre o disco inteiro em vez de 430 k amostras esparsas, e passa a
  // sofrer F(τ⊥/μ) no view-time — entra na ordenação ⟨j·T⟩, que é onde
  // um fenômeno de borda como nebulosa de reflexão pertence.
  float outward = clamp((radiusPc - 3000.0) / 7500.0, 0.0, 1.0);
  float fieldS = 0.08 + 0.92 * exp(-radiusPc / 4500.0);
  // auto-blindagem: o interior denso não recebe luz — a borda brilha
  float shieldS = gasResponse * exp(-gasResponse * 2.2) * 2.72;
  float fYoungS = (1.0 - exp(-radiusPc / 2600.0))
                * min(1.0, 0.55 + outward * 0.35 + formationResponse * 0.8);
  // envelope MAIS LARGO que a fenda E DESLOCADO para o lado côncavo do
  // braço (~0,5σ da largura Reid). O deslocamento é a função estrutural:
  // luz centrada na crista reforça a periodicidade de 4 braços (medido:
  // m=4 +0,06 com envelope centrado); luz no lado côncavo preenche o
  // dente-de-serra da fenda unilateral — é o que segura m=3/m=5.
  float filamentS =
    spiralFilament(radiusPc, theta - 170.0 / max(radiusPc, 1000.0));
  float envS = smoothstep(0.30, 0.62, filamentS);
  float wScat = 0.12 * dustMacro * envS * fieldS * shieldS;

  const float POP_LUMA_FIX = 0.772;
  float intensity = disk * 0.80 * structureLight * uBackgroundGain * POP_LUMA_FIX;
  // O perfil medido ficava 1,5× acima do alvo em TODO o disco, com o
  // pico igual: é bojo fraco demais, não disco brilhante demais. O alvo
  // tem um núcleo pequeno e intenso que normaliza o resto para baixo.
  intensity +=
    (core * 0.53 + bar * 0.23) * uBackgroundGain * POP_LUMA_FIX;
  // fluxo do espalhamento — separado do matiz (lição anti-intermodulação
  // do NORTE: cor decide matiz, quem decide fluxo decide fluxo)
  intensity += wScat * uBackgroundGain * POP_LUMA_FIX;
  // A absorção NÃO entra aqui. Ela depende do ângulo da visada, e isto é
  // bakeado — o bake não conhece a câmera. O que vai para a textura é a
  // emissão da coluna (RGB) e a profundidade óptica PERPENDICULAR (A); o
  // fragmento bakeado aplica a coluna com o comprimento de caminho certo.
  intensity *= uLayerAlpha * uFade;

  // Curva de cor do alvo: (R−B)/(R+B) ≈ +0,35 no disco interno, ~0 em
  // 1,05·R90, negativa na borda. A nossa saía chapada em +0,15 porque o
  // “warm” era pálido demais e o tonemap ACES dessatura os altos.
  // O alvo é LAVANDA acinzentado no disco, não azul saturado; misturado
  // com o quente, azul saturado vira marrom.
  // SOMA DE POPULAÇÕES, não paleta. A antiga era mix(cold, warm) por RAIO:
  // um segmento entre dois pontos do espaço de cor, e o alvo do anel externo
  // (purp +0,317) fica FORA desse segmento — cold puro dá só +0,095, então
  // nem remover o piso do clamp resolvia. Quem alcança são componentes com o
  // verde fundo de verdade: H II tem purp +0,303, uma O/B a 20000 K +0,164.
  //
  // Os pesos NÃO são novos: são as mesmas grandezas que a intensidade logo
  // acima já usa. A cor deixa de ser uma decisão e passa a ser consequência
  // de quem está emitindo ali.
  vec3 POP_OLD = blackbodyLinear(4800.0);    // K/G, corpo do disco e bojo
  vec3 POP_YOUNG = blackbodyLinear(20000.0); // O/B nos braços
  vec3 POP_HII = vec3(1.664, 0.807, 0.957);  // Hα+[NII] e [OIII]+Hβ
  // a cor do que o grão espalha: campo iluminante × λ^−1,3, L≡1
  vec3 hueScat = mix(POP_OLD, POP_YOUNG, fYoungS) * vec3(0.72, 1.0, 1.34);
  hueScat /= max(dot(hueScat, vec3(0.2126, 0.7152, 0.0722)), 1e-5);
  float wOld = disk * 0.80 * structureLight + core * 0.53 + bar * 0.23;
  float wYoung = (formationResponse * 0.55 + outward * 0.35) * disk * structureLight;
  // Onde existe região H II a emissão é DOMINADA por linha — o gás ionizado
  // não é um tempero sobre o contínuo estelar, ele é a luz. Com peso 0,34
  // contra um wOld de ordem 1, o nó contribuía ~6% da cor e o purp +0,303 do
  // H II não chegava à média do anel. O limiar também era alto demais: os
  // 20% mais altos de um ruído dão pulverização, e nas fotos de referência
  // os nós H II são contas enfiadas ao longo do braço.
  float wHii = formationResponse * smoothstep(0.66, 0.90, microNoise) * 1.2 * disk;
  vec3 color = (POP_OLD * wOld + POP_YOUNG * wYoung + POP_HII * wHii + hueScat * wScat)
             / max(wOld + wYoung + wHii + wScat, 1e-5);
  // L ≡ 1: a paleta antiga escondia brilho na cor — Y(cold)=0,587 contra
  // Y(warm)=0,739, um gradiente radial de 1,26× que não estava em modelo
  // nenhum de intensidade. Quem decide brilho é a intensity.
  color /= max(dot(color, vec3(0.2126, 0.7152, 0.0722)), 1e-5);
  // RGB = emissão da coluna, com L≡1 na cor. A = profundidade óptica
  // PERPENDICULAR. O avermelhamento saiu daqui junto com a atenuação: os
  // dois dependem do comprimento de caminho, e caminho depende da câmera,
  // que o bake não conhece. Guardar τ é o que permite o fragmento bakeado
  // reconstruir a coluna em qualquer ângulo com um exp() só.
  gl_FragColor = vec4(color * intensity, tau);
}
`;
