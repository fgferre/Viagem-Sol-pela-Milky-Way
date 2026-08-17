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
// INVARIÂNCIA DE APARÊNCIA (parte 2): o pico por pixel de buffer cai
// com pr², e o tonemap (côncavo no pé) esmaga valores pequenos ANTES de
// o olho integrar — a mesma estrela sai mais fraca em retina ("no modo
// performance as estrelas parece que brilham um pocuo mais" — dono).
// ×pr² aqui devolve a cada pixel do buffer o MESMO valor do pixel de
// referência: aparência idêntica em qualquer resolução, só mais nítida.
uniform float uPr2;

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
  // E vPeak já sai na RÉGUA DE REFERÊNCIA (×uPr2): depósito, gatilhos e
  // doses ficam invariantes de resolução de uma vez.
  vPeak = peak * alpha * uPr2;

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
// a dose da cruz por CAMADA: 1 = campo estelar/cascas (a arte do filme,
// resgatada em 16/08); 0 = os dez corpos (lei do fluxo pura — item 43)
uniform float uArteDaCruz;

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

  // ESPINHOS DE DIFRAÇÃO — DUAS doses, escolhidas por camada (uArteDaCruz):
  //  · a LEI DO FLUXO (M2, §5.4): amplitude = fração × pico — segue sendo
  //    a régua dos DEZ CORPOS (item 43: Vênus e Sirius não dividem a
  //    mesma cruz; o conserto do dono fica de pé);
  //  · a ARTE DO FILME, resgatada (16/08, palavras do dono: "as estrelas
  //    quase nao existem mais, o ceu ficou vazio e escuro"): o gatilho de
  //    30/07 — a cruz acende porque o núcleo ESTOUROU, 0,5·log₂(pico)
  //    saturando em pico 4, com a amplitude 0,85 do filme. Era isso que
  //    fazia centenas de estrelas faiscarem; a M2 a trocou pela lei pura
  //    e o céu apagou. Campo estelar e cascas usam 1; os dez corpos, 0.
  float spike = 0.0;
  // vPeak JÁ chega na régua de referência (×uPr2 no vertex) — gatilhos,
  // doses e depósito invariantes de resolução por construção
  float satDoFilme = clamp(0.5 * log2(max(vPeak, 1.0)), 0.0, 1.0);
  float amp = max(${FRACAO_DOS_ESPINHOS} * vPeak, 0.85 * satDoFilme * uArteDaCruz);
  if (amp > ${LIMIAR_DO_CLARAO.toPrecision(8)}) {
    float ax = exp(-abs(uv.y) * 14.0) * exp(-abs(uv.x) * 2.6);
    float ay = exp(-abs(uv.x) * 14.0) * exp(-abs(uv.y) * 2.6);
    spike = (ax + ay) * amp;
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
