// atmosphere/coronaRays.js — plano de raias da coroa + sprite externo.
// Corpo movido verbatim (único ajuste: o ctx 2D do canvas interno virou
// c2d para não sombrear o ctx compartilhado da factory).

import * as THREE from 'three';
import { uvMeshVertex, quadVertex, CORONA_ANG_N, POR_ANGULO_GLSL } from './common.js';

export function createCoronaRays(ctx){
  var scene = ctx.scene, knob = ctx.knob, NOISE_GLSL = ctx.NOISE_GLSL,
      SUN_RADIUS = ctx.SUN_RADIUS, charges = ctx.charges,
      renderer = ctx.renderer, quadCamera = ctx.quadCamera;
  // ---------------------------------------------------------------
  // (A antiga "casca de brilho" aditiva foi removida: ela criava um anel
  // branco artificial na borda, o oposto do escurecimento de limbo real.
  // O brilho externo agora vem de uma coroa suave, abaixo.)
  // ---------------------------------------------------------------

  // ---------------------------------------------------------------
  // Coroa: gradientes radiais suaves. O truque para não virar "anel" nem
  // lavar o disco é deixar o centro TRANSPARENTE (o disco aparece através)
  // e o brilho surgir logo além da borda, desaparecendo devagar.
  // ---------------------------------------------------------------
  function makeRadialTexture(stops, size){
    size = size || 512;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var c2d = c.getContext('2d');
    var g = c2d.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
    stops.forEach(function(s){ g.addColorStop(s[0], s[1]); });
    c2d.fillStyle = g;
    c2d.fillRect(0,0,size,size);
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  // (o gradiente interno foi substituído pelo shader de raios abaixo)
  var coronaOuterTex = makeRadialTexture([
    [0.00,'rgba(255,150,70,0)'],
    [0.40,'rgba(255,140,60,0)'],
    [0.52,'rgba(255,120,48,0.028)'],
    [0.75,'rgba(255,90,32,0.010)'],
    [1.00,'rgba(255,70,20,0)']
  ]);

  // Coroa interna com RAIOS RADIAIS (a assinatura visual de fotos de
  // eclipse): plano orientado à câmera, com falloff exponencial a partir
  // do limbo e raias moduladas por ruído angular que evoluem devagar.
  var CORONA_SIZE = SUN_RADIUS*7.0;
  // T1.3: halo 0.55 = variante c2 do sweep, a melhor leitura de DP
  // (transição disco->céu suave, decaimento monotônico, sem anel); os
  // halo pleno calibrado (histórico: gates A/D com coroa isolada).
  // cray 0.90 = streamers legíveis; cact 0.50 = coroa respira com o ciclo.
  var coronaRaysUniforms = {
    uTime: { value: 0 },
    uRight: { value: new THREE.Vector3(1,0,0) },
    uUp: { value: new THREE.Vector3(0,1,0) },
    // PR9 (achado 10): inversa da rotação mundial COMPLETA do Sol (tilt 7,25°
    // + spin), compartilhada por frame via ctx.sunInvRot. Substitui o antigo
    // uRotY, que só desfazia o spin e ignorava o tilt fixo.
    uSunInvRot: { value: ctx.sunInvRot },
    uCharges: { value: charges },
    uActivity: { value: 0.5 },
    uHalo: { value: knob('halo') },
    uActGain: { value: knob('cact') },
    uRayBoost: { value: knob('ray') },
    // FASE 4: com a coroa volumétrica ligada o plano de raias cede o
    // protagonismo (fica como base suave de halo). 0.0 default =
    // multiplicação por 1.0 no shader, bit-exata — baseline intocado.
    uCvolMix: { value: 0.0 },
    // R1b da régua única: o ganho por canal da paleta, pela curva viva
    // (`stellarBody.ts`, `porCurva`); 1,1,1 no ACES
    uPaleta: ctx.paletaDaCoroa
  };

  // ---------------------------------------------------------------
  // A COROA POR ÂNGULO (ver `POR_ANGULO_GLSL`, common.js): o padrão de
  // cada ângulo do plano do céu, CORONA_ANG_N texels numa linha, refeito
  // uma vez por quadro por `desenharCoroaPorAngulo` (chamada no fim do
  // `update` do corpo, depois de todo uniform da coroa escrito). O corpo
  // de cada canal é o código que os dois planos rodavam por pixel, na
  // mesma ordem, com o ângulo do centro do texel no lugar do do pixel.
  // Os uniforms são os MESMOS objetos do plano de raias; `uFil` e
  // `uPlume` são do volume e `coronaVolume.js` põe os dele aqui (sem
  // volume, valem 0 e as plumas nem são calculadas).
  // ---------------------------------------------------------------
  var faixaUniforms = {
    uTime: coronaRaysUniforms.uTime,
    uRight: coronaRaysUniforms.uRight,
    uUp: coronaRaysUniforms.uUp,
    uSunInvRot: coronaRaysUniforms.uSunInvRot,
    uCharges: coronaRaysUniforms.uCharges,
    uRayBoost: coronaRaysUniforms.uRayBoost,
    uFil: { value: 0 },
    uPlume: { value: 0 }
  };
  var faixaMat = new THREE.ShaderMaterial({
    uniforms: faixaUniforms,
    vertexShader: quadVertex,
    fragmentShader: NOISE_GLSL + '\n' + [
      'uniform float uTime;',
      'uniform vec3 uRight;',
      'uniform vec3 uUp;',
      'uniform mat3 uSunInvRot;',
      'uniform vec4 uCharges[10];',
      'uniform float uRayBoost;',
      'uniform float uFil;',
      'uniform float uPlume;',
      'void main(){',
      '  float ang = (gl_FragCoord.x*' + (1 / CORONA_ANG_N).toFixed(12) + ' - 0.5)*6.283185307179586;',
      // --- r: as raias (o corpo que o plano de raias rodava por pixel) ---
      // T1.3: a raia vive no REFERENCIAL DO SOL. Direção 3D do ponto do
      // plano do céu (base da câmera) girada para o espaço do objeto: as
      // raias acompanham a rotação e as regiões ativas — não são mais um
      // papel de parede da tela
      '  vec3 dirW = normalize(uRight*cos(ang) + uUp*sin(ang));',
      // PR9 (achado 10): mundo -> objeto pela inversa COMPLETA da rotação do
      // Sol (inclui o tilt de 7,25° antes ignorado), não só o spin -uRotY.
      // uSunInvRot é ortonormal, mas mantemos o normalize por segurança.
      '  vec3 dirO = normalize(uSunInvRot * dirW);',
      // coroa VIVA (backlog M2 nº4): os raios evoluíam a uTime*0.006 —
      // diff 0.00 em qualquer clipe, a camada morta que quebrava a
      // ilusão por contraste com as vivas. Três tempos: deriva angular
      // própria LENTA do padrão (a coroa não é rígida com a fotosfera),
      // evolução do fbm ~5x mais rápida e flicker 1/f por direção —
      // a luz treme como em filme de eclipse. Streamers (act) seguem
      // ancorados às cargas: a física não muda, só o padrão respira.
      '  float ca = cos(uTime*0.010); float sa = sin(uTime*0.010);',
      '  vec3 ap = vec3(dirO.x*ca - dirO.z*sa, dirO.y, dirO.x*sa + dirO.z*ca)*2.6;',
      '  float rays = fbmLight(ap + vec3(0.0, 0.0, uTime*0.030));',
      '  rays = 0.68 + 0.36*rays;',
      '  float rays2 = fbmLight(ap*2.7 + vec3(7.3, 0.0, uTime*0.045));',
      '  rays *= 0.85 + 0.25*rays2;',
      // o MESMO flicker serve às raias e ao fio do volume (os dois o
      // liam com a mesma expressão, a mesma direção e o mesmo uTime)
      '  float flick = fbmLight(dirO*1.9 + vec3(3.7, 8.2, uTime*0.55));',
      '  rays *= 0.90 + 0.20*flick;',
      // streamers nascem SOBRE as regiões ativas: reforço por carga
      '  float act = 0.0;',
      '  for(int i=0;i<10;i++){',
      '    vec3 cd = uCharges[i].xyz;',
      '    float cl = length(cd);',
      '    if (cl < 1e-4) continue;',
      '    float dA = acos(clamp(dot(dirO, cd/cl), -1.0, 1.0));',
      '    act += abs(uCharges[i].w) * exp(-dA*dA*9.0);',
      '  }',
      '  rays *= 1.0 + uRayBoost*min(act, 1.4);',
      // --- g: o fio do volume (coronaVolume.js) ---
      '  float f1 = fbmLight(dirO*3.1 + vec3(0.0, 0.0, uTime*0.030));',
      '  float f2 = fbmLight(dirO*7.3 + vec3(5.1, 2.2, uTime*0.045));',
      '  float fil = (0.62 + 0.55*f1) * (0.80 + 0.34*f2) * (0.90 + 0.20*flick);',
      '  fil = 1.0 + (fil - 1.0)*uFil;',
      // --- b, a: o portão e os fios das plumas (coronaVolume.js) ---
      '  float hg = 0.0; float fios = 0.0;',
      '  if (uPlume > 0.0){',
      // buraco coronal = campo ABERTO: unipolaridade alta em DUAS
      // alturas (1.06 e 1.35) na radial do pixel — o min() mata os
      // picos locais de unip sobre cargas bipolares (loops fechados
      // perdem a radialidade com a altura; o buraco não). Janela
      // 0.74-0.92, mais estrita que a do bake (0.60-0.90): plumas
      // estritamente DENTRO do buraco visível
      '    float ug = 1.0;',
      '    for (int s = 0; s < 2; s++){',
      '      vec3 fp = dirO * (s == 0 ? 1.06 : 1.35);',
      '      vec3 B = vec3(0.0);',
      '      for (int i = 0; i < 10; i++){',
      '        vec3 dv = fp - uCharges[i].xyz;',
      '        float r2 = dot(dv, dv) + 1e-3;',
      '        B += dv * (uCharges[i].w / (r2 * sqrt(r2)));',
      '      }',
      '      ug = min(ug, abs(dot(B, dirO)) / (length(B) + 1e-9));',
      '    }',
      '    hg = smoothstep(0.74, 0.92, ug);',
      // fios: 2 oitavas angulares ESTÁTICAS no referencial do objeto
      // (giram com o Sol; sem uTime — nada de cintilação nova, flags
      // temporais são do Bloco C). O limiar sobe com a altura => os
      // fios AFINAM ao longo do comprimento.
      // BLOCO C (rodada de movimento, flag F6 confirmada): fios com
      // FWHM 1.6-2.6px estroboscopavam sob rotação+pan (delta-p99
      // polar +0.194 vs controle). Piso engrossado por A/B de flicker
      // no qa-motion2: oitava alta 18->14 (fio ~1.3x mais largo) +
      // topo do smoothstep 0.46->0.54 (a PONTA sub-pixel amolece;
      // alargar por baixo só ADICIONAVA fios fracos e piorava o
      // flicker). Medido: FWHM mediana 2.45->3.82px em 960x600,
      // delta-p99 polar 0.194->0.084. Confinamento aos buracos (hg)
      // e P-checks do qa:phase6 intactos (P1 +0.364/866px verdes).
      '    float p1 = fbmLight(dirO*9.0 + vec3(7.7, 1.3, 0.0));',
      '    float p2 = fbmLight(dirO*14.0 + vec3(3.1, 12.9, 0.0));',
      '    fios = p1*0.55 + p2*0.65;',
      '  }',
      '  gl_FragColor = vec4(rays, fil, hg, fios);',
      '}'
    ].join('\n'),
    depthTest: false,
    depthWrite: false
  });
  var faixaRT = new THREE.WebGLRenderTarget(CORONA_ANG_N, 1, {
    type: ctx.rtType, format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthBuffer: false, stencilBuffer: false
  });
  var faixaScene = ctx.makeFullscreenScene(faixaMat);
  function desenharCoroaPorAngulo(){
    var prev = renderer.getRenderTarget();
    renderer.setRenderTarget(faixaRT);
    renderer.render(faixaScene, quadCamera);
    renderer.setRenderTarget(prev);
  }
  coronaRaysUniforms.uPorAngulo = { value: faixaRT.texture };

  var coronaRaysMat = new THREE.ShaderMaterial({
    uniforms: coronaRaysUniforms,
    vertexShader: uvMeshVertex,
    fragmentShader: POR_ANGULO_GLSL + '\n' + [
      'uniform sampler2D uPorAngulo;',
      'uniform float uActivity;',
      'uniform float uHalo;',
      'uniform float uActGain;',
      'uniform float uCvolMix;',
      'uniform vec3 uPaleta;',
      'varying vec2 vUv;',
      'void main(){',
      '  vec2 c = vUv - 0.5;',
      '  float r = length(c)*2.0;',                 // 0 centro -> 1 borda do plano
      '  float diskR = 2.0/7.0;',                   // raio do disco solar neste plano
      // PR1 (auditoria, achado 2) — early-out radial: fora do domínio
      // (interior do disco r<=diskR*0.92, exterior r>=0.85) as máscaras
      // de fall zeram e a saída atual é EXATAMENTE vec4(0,0,0,1) — o
      // retorno antecipado a reproduz bit a bit, poupando atan, os três
      // fbmLight e o loop de 10 cargas em ~metade do quadrado projetado.
      // Sem discard: alpha/blending aditivo preservados como estão.
      '  if (r <= diskR*0.92 || r >= 0.85){',
      '    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
      '    return;',
      '  }',
      '  float ang = atan(c.y, c.x);',
      // as raias DESTE ângulo — ruídos, flicker e reforço sobre as regiões
      // ativas (T1.3: no referencial do Sol; coroa viva, backlog M2 nº4) —
      // vêm da faixa da coroa por ângulo, acima
      '  float rays = coroaPorAngulo(uPorAngulo, ang).r;',
      // falloff: núcleo justo + RESPIRO largo (halo coronal — o bloom não
      // atravessa o limbo escurecido, T2.1)
      '  float fall = exp(-(r-diskR)*22.0) + uHalo*exp(-(r-diskR)*7.0);',
      '  fall *= smoothstep(diskR*0.92, diskR*1.06, r);',
      // PR1 — rampa externa em forma DEFINIDA: smoothstep com bordas
      // invertidas é comportamento indefinido pela spec GLSL (o driver
      // atual calculava a rampa reversa por acaso). 1-smoothstep é a
      // mesma curva pela simetria S(1-t)=1-S(t).
      '  fall *= 1.0 - smoothstep(0.55, 0.85, r);',  // some bem antes da borda do plano
      '  vec3 col = mix(vec3(1.0,0.45,0.16), vec3(1.0,0.72,0.38), clamp((r-diskR)*2.2,0.0,1.0));',
      '  col *= uPaleta;',
      // amplitude respira com a atividade global do ciclo
      '  gl_FragColor = vec4(col * fall * rays * 0.16 * (1.0 + uActGain*uActivity) * (1.0 - 0.62*uCvolMix), 1.0);',
      '}'
    ].join('\n'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false
  });
  var coronaRays = new THREE.Mesh(new THREE.PlaneGeometry(CORONA_SIZE, CORONA_SIZE), coronaRaysMat);
  coronaRays.renderOrder = -1;
  scene.add(coronaRays);

  var coronaOuter = new THREE.Sprite(new THREE.SpriteMaterial({map:coronaOuterTex, blending:THREE.AdditiveBlending, transparent:true, depthWrite:false}));
  coronaOuter.scale.set(SUN_RADIUS*6.0, SUN_RADIUS*6.0, 1);
  scene.add(coronaOuter);
  ctx.coronaRays = coronaRays; ctx.coronaOuter = coronaOuter;
  ctx.coronaRaysUniforms = coronaRaysUniforms; ctx.CORONA_SIZE = CORONA_SIZE;
  ctx.coronaPorAngulo = { uniforms: faixaUniforms, material: faixaMat, rt: faixaRT,
                          desenhar: desenharCoroaPorAngulo };
}
