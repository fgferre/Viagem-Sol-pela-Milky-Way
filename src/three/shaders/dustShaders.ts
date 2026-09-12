// ============================================================
// Poeira interestelar próxima — partículas que envolvem a câmera
// e se acendem dentro do gás, dando paralaxe e sensação de volume.
// ============================================================
import * as THREE from 'three';
import { GLSL_NOISE, GLSL_GALAXY, GLSL_DENSITY_LOCAL } from './common';

export const DUST_VERT = /* glsl */ `
attribute float aRand;

uniform vec3 uCamPos;
uniform float uTime;
uniform float uScreenH;
uniform float uBox;
uniform float uFade;

varying float vAlpha;
varying vec3 vColor;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_DENSITY_LOCAL}

void main() {
  // partículas fixas no mundo; a caixa "segue" a câmera via wrap
  vec3 p = position;
  vec3 rel = mod(p - uCamPos + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 world = uCamPos + rel;

  // deriva lenta — o meio interestelar está vivo
  world += vec3(
    vnoise(world * 0.5 + uTime * 0.01) - 0.5,
    vnoise(world * 0.5 + 31.7 + uTime * 0.012) - 0.5,
    vnoise(world * 0.5 + 57.3 + uTime * 0.008) - 0.5) * 0.6;

  float gas = nebulaDensity(world, 2);
  float glow = smoothstep(0.02, 0.5, gas);
  vAlpha = 0.05 + glow * 0.5;
  vColor = mix(vec3(0.55, 0.62, 0.75), vec3(0.9, 0.75, 0.55), aRand) * (0.35 + glow * 1.6);

  float dist = length(rel);
  vAlpha *= 1.0 - smoothstep(uBox * 0.28, uBox * 0.5, dist); // some nas bordas da caixa
  vAlpha *= smoothstep(0.02, 0.12, dist);              // não cola na lente
  vAlpha *= uFade;                                     // some ao deixar a vizinhança

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = (1.1 + aRand * 2.2) * uScreenH * 0.0016 / max(dist * 0.35, 0.35);
  gl_PointSize = clamp(px, 1.0, 5.0);
}
`;

export const DUST_FRAG = /* glsl */ `
precision highp float;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float i = exp(-r2 * 4.5);
  gl_FragColor = vec4(vColor * i, i * vAlpha);
}
`;

// ============================================================
// Passe de gradação cinematográfica — vinheta, grão de filme,
// aberração cromática sutil nas bordas e leve elevação de negros.
// ============================================================
export const FILM_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.016 },
    uVignette: { value: 0.42 },
    uCA: { value: 0.00012 },
    // O HALO DE CONTORNO (C6, adotado) — FUNDIDO aqui, zero passe extra
    // (ver `Post.acenderHalo`/`apagarHalo`, `three/core/post.ts`, e a
    // matemática pura em `three/core/contornoDaUi.ts`). uHalo é a
    // intensidade JÁ multiplicada pelo envelope de tempo; 0 desliga, e o
    // branch por uniform em `main()` custa zero em repouso.
    uHalo: { value: 0 },
    // x, y, largura, altura do painel — px de CSS, origem no canto de
    // cima à esquerda, como o DOMRect que alimenta o efeito.
    uHaloRetangulo: { value: new THREE.Vector4() },
    uHaloProgresso: { value: 0 },
    uHaloSigma: { value: 12 },
    uHaloCor: { value: new THREE.Vector3() },
    // px de CSS da janela e o pixelRatio — a mesma conta de conversão
    // que a câmera ortográfica do protótipo fazia, agora feita à mão
    // (ver `haloDaUi`, abaixo).
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPixelRatio: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uCA;
    uniform float uHalo;
    uniform vec4 uHaloRetangulo; // x, y, largura, altura — px de CSS, origem no canto de cima à esquerda
    uniform float uHaloProgresso; // 0..1 ao longo do efeito inteiro (400 ms)
    uniform float uHaloSigma; // px de CSS
    uniform vec3 uHaloCor;
    uniform vec2 uResolution; // px de CSS da janela
    uniform float uPixelRatio;
    varying vec2 vUv;

    // hash de Hoskins por pixel: o fract(sin(dot)) anterior tinha
    // gradiente de fase linear — virava BANDAMENTO diagonal coerente
    // em tela cheia, não grão de filme
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // SDF de um retângulo alinhado aos eixos (Inigo Quilez) — negativo
    // dentro, zero na borda, positivo fora. Portado de contornoDaUi.ts
    // (C6) byte a byte — é a mesma matemática, só o endereço mudou.
    float distanciaAoRetangulo(vec2 p, vec2 meio) {
      vec2 d = abs(p) - meio;
      return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }

    // O HALO DE CONTORNO (C6) — px JÁ em CSS, origem de cima à esquerda
    // (a mesma conversão de gl_FragCoord que a câmera ortográfica do
    // protótipo fazia). Só é chamada quando uHalo > 0 (branch em main),
    // então o custo em repouso é zero.
    vec3 haloDaUi(vec2 pxCss) {
      vec2 meio = uHaloRetangulo.zw * 0.5;
      vec2 centro = uHaloRetangulo.xy + meio;
      float d = distanciaAoRetangulo(pxCss - centro, meio);

      // SÓ FORA: o DOM opaco já cobre o interior, então a luz só existe
      // onde a página não pintou nada — nunca por cima do texto.
      float base = step(0.0, d) * exp(-pow(max(d, 0.0) / uHaloSigma, 2.0));

      // A BORDA DE CIMA inteira, esmaecendo mais depressa que o
      // envelope geral — um lampejo que já não está lá quando o ponto
      // quente ainda desce a borda esquerda.
      float pesoDoTopo = exp(-pow((pxCss.y - uHaloRetangulo.y) / uHaloSigma, 2.0));
      float esmaecimentoDoTopo = exp(-uHaloProgresso * 6.0);

      // O PONTO QUENTE na borda ESQUERDA — a de FRENTE, porque o painel
      // entra da direita e é ela quem chega primeiro. Desce do topo à
      // base ao longo do próprio efeito; largura ~25% da altura do
      // painel.
      float alturaDoQuente = mix(uHaloRetangulo.y, uHaloRetangulo.y + uHaloRetangulo.w, uHaloProgresso);
      float larguraDoQuente = max(uHaloRetangulo.w * 0.25, 1.0);
      float pesoDoQuente =
        exp(-pow((pxCss.x - uHaloRetangulo.x) / uHaloSigma, 2.0)) *
        exp(-pow((pxCss.y - alturaDoQuente) / larguraDoQuente, 2.0));

      // OS REFORÇOS MULTIPLICAM A BASE, nunca somam soltos: presos à
      // MESMA queda com a distância real ao retângulo.
      float reforco = 1.0 + pesoDoTopo * esmaecimentoDoTopo + 1.6 * pesoDoQuente;

      return uHaloCor * uHalo * base * reforco;
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // aberração cromática radial (mais forte nos cantos)
      vec2 off = c * uCA * r2 * 60.0;
      vec3 base = texture2D(tDiffuse, uv).rgb;
      float rDesl = texture2D(tDiffuse, uv + off).r;
      float bDesl = texture2D(tDiffuse, uv - off).b;
      // A BEIRA DURA CEDE (item 117). A separação é um DESLOCAMENTO: num
      // degrau de silhueta ela traz para fora do corpo o azul de dentro
      // dele e pinta um aro que não existe — medido no limbo de
      // Ganimedes em 31/08. Onde o desvio ATRAVESSA um degrau (a luz do
      // ponto deslocado difere muito da do ponto), a separação cede; o
      // céu é gradiente e não degrau, então ali ela fica inteira. Custa
      // ZERO amostra a mais: a do centro já era a do canal verde.
      float degrau = max(abs(rDesl - base.r), abs(bDesl - base.b));
      float cede = 1.0 - smoothstep(0.06, 0.30, degrau);
      vec3 col;
      col.r = mix(base.r, rDesl, cede);
      col.g = base.g;
      col.b = mix(base.b, bDesl, cede);

      // vinheta anamórfica suave
      col *= 1.0 - uVignette * smoothstep(0.12, 0.62, r2);

      // leve elevação de negros (filme)
      col = col * 0.985 + vec3(0.012, 0.010, 0.014);

      // grão animado — resolução REAL do framebuffer, não 1920×1080
      float g = hash(gl_FragCoord.xy + floor(fract(uTime) * 913.0)) - 0.5;
      col += g * uGrain * (0.35 + 0.65 * (1.0 - clamp(dot(col, vec3(0.333)), 0.0, 1.0)));

      // O HALO DE CONTORNO (C6) — DEPOIS do grão, para reproduzir o
      // protótipo (um passe aditivo à parte, por cima do quadro já
      // pronto): o grão não deve comer o brilho da borda. Branch por
      // uniform: em repouso (uHalo == 0) esta linha inteira não roda.
      if (uHalo > 0.0) {
        vec2 pxCss = gl_FragCoord.xy / uPixelRatio;
        pxCss.y = uResolution.y - pxCss.y;
        col += haloDaUi(pxCss);
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
