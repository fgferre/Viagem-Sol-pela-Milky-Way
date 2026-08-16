// ============================================================
// Shaders do campo estelar — pontos com tamanho/brilho por
// magnitude, cor por B-V, extinção pelo gás e spikes de difração.
// ============================================================
import {
  GLSL_NOISE,
  GLSL_GALAXY,
  GLSL_DENSITY_LOCAL,
  GLSL_STAR_COLOR,
  GLSL_STAR_PSF,
  GLSL_COMPRESSAO,
} from './common';
import { lerBetaDaEmissao } from '../luzDaCasa';
import { BRANQUEAMENTO_MEIA_ALTURA, FRACAO_DOS_ESPINHOS, LIMIAR_DO_CLARAO } from '../estrela';

/**
 * O β da compressão na emissão, resolvido UMA vez — e aqui, que é o módulo
 * dono do fragment que o consome. Os três materiais que desenham ponto
 * estelar (`world/stars.ts`, `world/wrappedStars.ts`,
 * `world/planetas/planetas.ts`) o leem daqui em vez de cada um ler a URL.
 *
 * O guarda de `window` não é paranoia: `vitest.config.ts` roda em
 * `environment: 'node'`, e `planetas.test.ts` importa esta cadeia inteira.
 */
export const BETA_DA_EMISSAO = lerBetaDaEmissao(
  typeof window === 'undefined' ? '' : window.location.search
);

// STAR_VERT é do CAMPO DE CATÁLOGO e só dele (`stars.ts:36`). As cascas
// procedurais têm vertex próprio e compartilham só o STAR_FRAG
// (`wrappedStars.ts:495`) — é por isso que os dois atributos por estrela
// da Onda 3 entram aqui sem tocar em `wrappedStars.ts` (risco 6 do mapa
// da casa: as cascas têm fade fixo em 1 e a cadeia catálogo↔cascas não
// pode mudar).
// (Os dois canais por estrela da Onda 3 saíram do TEXTO do vertex no M2
// da LEI-DA-ESTRELA: `aFade` morreu com a política de dominância — quem
// responde pelo clarão das fortes é a camada da asa (world/clarao.ts),
// que soma óptica POR CIMA e não pede cessão ao ponto. `aFocus` segue
// vivo como canal dormente do lado da CPU (item 38 — buffer + escrita em
// stars.ts); a leitura volta ao shader no M3/E3, quando a esfera
// analítica precisar apagar o ponto da estrela que ganha corpo.)
export const STAR_VERT = /* glsl */ `
attribute float aLogLum;
attribute float aCi;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uExpoM0;  // magnitude aparente que satura o pico da PSF
uniform float uSigmaPx; // largura da PSF em px a 1080p (o "instrumento")
uniform float uTau;
uniform float uFade;

varying vec3 vColor;
varying float vSigma;  // sigma da PSF em fração do meio-sprite
varying float vPeak;   // pico da PSF × atenuação total — TODO o resto deriva dele

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_DENSITY_LOCAL}
${GLSL_STAR_COLOR}
${GLSL_STAR_PSF}

void main() {
  vec3 worldPos = position;
  float dist = length(worldPos - uCamPos);

  // Magnitude aparente RECALCULADA da posição da câmera. logLum é
  // 0,4·(4,85 − M_V), então M_V = 4,85 − 2,5·logLum e
  // m = M_V + 5·log10(d) − 5. Custa um log2 e dois mads — o preço de
  // "as estrelas reagem a onde eu estou" é praticamente zero; o que era
  // caro no desenho antigo não era a conta, era a resposta errada.
  float m = -0.15 - 2.5 * aLogLum + 5.0 * (log2(max(dist, 1e-3)) * 0.30103);

  // A lei da PSF é compartilhada (GLSL_STAR_PSF, common.ts) — a mesma
  // para o catálogo e para as cascas procedurais.
  float size; float peak; float sigmaFrac;
  starPSF(m, uExpoM0, uSigmaPx, uScreenH, size, peak, sigmaFrac);
  float alpha = 1.0;

  // extinção interestelar: gás entre a câmera e a estrela a apaga e
  // avermelha — só para estrelas com presença real na tela; num ponto
  // subpixel tênue o avermelhamento é ilegível e o mini-raymarch de
  // 6 amostras custaria ~80% do custo total do campo estelar
  vec3 absorb = size > 3.0 ? extinction(uCamPos, worldPos, uTau) : vec3(1.0);
  vec3 col = bvToColor(aCi) * absorb;
  float vis = (absorb.r + absorb.g + absorb.b) / 3.0;
  alpha *= mix(1.0, vis, 0.5);
  alpha *= uFade; // some ao deixar a vizinhança solar

  vColor = col;
  vSigma = sigmaFrac;
  // A ATENUAÇÃO INTEIRA vive num fator só (alpha) e vPeak a carrega para
  // TODOS os termos do fragment — núcleo, halo, espinhos e branqueamento
  // derivam dele. É a lição da caçada adversarial da Onda 3, preservada
  // depois que o segundo varying (vSat) morreu no M2: quem acrescentar
  // atenuação nova a alpha a dá a todos os termos sem pensar nisso.
  vPeak = peak * alpha;

  vec4 mv = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size;
}
`;

export const STAR_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vSigma;
varying float vPeak;

// β da compressão na emissão (F2 da luz). ZERO por nascimento, e zero é
// IDENTIDADE EXATA — ver comprimir3 em shaders/common.ts.
uniform float uBeta;

${GLSL_COMPRESSAO}

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;

  // A PSF de verdade, com o sigma que o vértice calculou. Como o sprite
  // acompanha o sigma, a integral do gaussiano é o fluxo da estrela:
  // aditivo, o depósito total na tela É a energia recebida. Nada de
  // conservação artificial — ela sai de graça de desenhar a PSF certa.
  float s2 = max(vSigma * vSigma, 1e-6);
  float core = exp(-r2 / (2.0 * s2));
  float halo = exp(-r2 / (18.0 * s2)) * 0.06;

  // ESPINHOS DE DIFRAÇÃO: fração do FLUXO, comprimida com o resto (M2 da
  // LEI-DA-ESTRELA, §5.4). O gatilho antigo (clamp \`sat\`, saturado em
  // pico 4) dava a Vênus e a Sirius a mesma cruz cheia — item 43. Agora a
  // cruz vem na dose do brilho: amplitude = fração × pico, e o guarda é o
  // MESMO piso de visibilidade da asa (1/255) — abaixo dele os 4 exp não
  // pagam por um termo que o buffer de 8 bits não vê.
  float spike = 0.0;
  if (vPeak * ${FRACAO_DOS_ESPINHOS} > ${LIMIAR_DO_CLARAO.toPrecision(8)}) {
    float ax = exp(-abs(uv.y) * 14.0) * exp(-abs(uv.x) * 2.6);
    float ay = exp(-abs(uv.x) * 14.0) * exp(-abs(uv.y) * 2.6);
    spike = (ax + ay) * ${FRACAO_DOS_ESPINHOS} * vPeak;
  }

  vec3 col = vColor * (core + halo) * vPeak + vColor * spike;
  // núcleo esbranquiçado por SATURAÇÃO SUAVE do sensor — pico/(pico+P₅₀),
  // curva de meia altura ${BRANQUEAMENTO_MEIA_ALTURA.toFixed(1)} (o antigo ponto de clamp pleno), sem degrau
  col += vec3(0.9, 0.95, 1.0) * core * core *
         (vPeak / (vPeak + ${BRANQUEAMENTO_MEIA_ALTURA.toFixed(1)})) * 0.6;

  // A COMPRESSÃO NA EMISSÃO (Lei da Estrela §7). Ela vai no col FINAL e NÃO
  // no peak: o pico é multiplicado pelo perfil logo acima, então comprimi-lo
  // achataria o PERFIL em vez do VALOR — a estrela perderia o formato em vez
  // de perder o excesso. Aqui o que fica limitado é o que se escreve no
  // buffer, que é exatamente o problema: a 1 UA este ponto deposita pico da
  // ordem de 4e11 num alvo half-float que satura em 65.504, e o bloom espalha
  // o infinito resultante pela tela inteira. É esse o item 3 das pendências.
  //
  // O suporte do sprite não muda: com beta acima de 2 o raio comprimido é
  // MENOR que o rSat que o vértice já calculou, então gl_PointSize continua
  // sobrando e starPSF fica intocada.
  gl_FragColor = vec4(comprimir3(col, uBeta), 1.0);
}
`;
