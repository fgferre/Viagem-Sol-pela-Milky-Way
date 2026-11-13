// ============================================================
// Sagittarius A* — raytracer de geodésicas nulas (Schwarzschild)
// adaptado do estudo "Gargantua" (referência do usuário), como
// PASSE DE PÓS: o fundo que a lente dobra é a NOSSA cena real
// (bojo, poeira, estrelas), amostrada na direção de escape do
// raio — o que a demo faz com o céu procedural dela.
//
// Dois estágios (o truque de custo da própria demo, que limita o
// buffer a ~3,8 MP no modo cinematic):
//  - MARCH: a integração pesada, num alvo de resolução LIMITADA
//    (orçamento de pixels por qualidade), só na zona b < uMarchB.
//  - COMPOSITE: em resolução nativa; usa o alvo do march perto do
//    horizonte e a deflexão analítica fraca (α ≈ 2RS/b, 1 fetch)
//    no resto — estrelas continuam nítidas fora da zona forte.
//
// O passe inteiro fica DESLIGADO longe do centro (custo zero,
// shader nem compila) — ver blackHole.ts.
// ============================================================

const COMMON = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec3  uRoL;      // câmera no referencial do disco (RS; y = polo)
uniform vec3  uRightL;   // base da câmera no mesmo referencial
uniform vec3  uUpL;
uniform vec3  uFwdL;
uniform float uTanHalf;  // tan(fov/2) vertical
uniform float uAspect;
uniform float uFade;
uniform float uMarchB;   // fronteira zona integrada ↔ analítica (RS)

// raio da câmera pelo pixel uv (0..1), no referencial local
vec3 rayAt(vec2 uv) {
  vec2 ndc = uv * 2.0 - 1.0;
  return normalize(
    uFwdL + uRightL * (ndc.x * uTanHalf * uAspect) + uUpL * (ndc.y * uTanHalf)
  );
}

// direção local → uv de tela (para amostrar a cena na direção dobrada)
vec3 dirToUv(vec3 d) {
  float z = dot(d, uFwdL);
  vec2 uv = vec2(
    0.5 + 0.5 * dot(d, uRightL) / (max(z, 1e-4) * uTanHalf * uAspect),
    0.5 + 0.5 * dot(d, uUpL) / (max(z, 1e-4) * uTanHalf)
  );
  // z: validade (raio dobrado para trás da câmera não tem cena para ler)
  return vec3(uv, z);
}

// deflexão fraca: α ≈ 2·RS/b, curvando na direção da massa. Válida a
// poucos % para b ≳ 40 RS — é a metade barata da lente.
vec3 weakBend(vec3 rd, out float b) {
  vec3 c = uRoL - rd * dot(uRoL, rd); // BH → ponto de maior aproximação
  b = max(length(c), 1e-3);
  return normalize(rd - (c / b) * (2.0 / b));
}
`;

// Meia-espessura do disco sobre o raio (a fatia em `fatia`). Um disco fino
// de verdade; pequena o bastante para não mexer em nada visto com mais de
// ~1° de inclinação, só na visada rasante — onde um plano de espessura zero
// virava um risco de um pixel, escuro e pontilhado, cortando a sombra.
export const ESPESSURA_DO_DISCO = 0.008;
const ESPESSURA_GLSL = ESPESSURA_DO_DISCO.toFixed(4);

/** espelho de `fatia` (GLSL), para o teste: altura y no raio r → 0..1 */
export function fatiaDoDisco(y: number, r: number, rIn: number, rOut: number): number {
  if (r >= rOut) return 1;
  const u = Math.min(Math.abs(y) / (ESPESSURA_DO_DISCO * Math.max(r, rIn)), 1);
  return 1 - (1 - u) * (1 - u);
}

// O quanto o disco TAPA o fundo segue a densidade, lida no envelope radial
// da emissão (fluxo · ganho radial + brilho interno, × rampa externa),
// relativa à de RAIO_DENSO_RS: por dentro dele o disco tapa como sempre; por
// fora, proporcional ao que brilha. Espelho TS para o teste.
export const RAIO_DENSO_RS = 8;
export function envelopeDoDisco(r: number, rOut: number): number {
  const x = Math.max(r, 3.001);
  const flux = Math.max(Math.pow(x / 3, -3) * (1 - Math.sqrt(3 / x)), 0);
  const s = (a: number, b: number, v: number) => {
    const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  };
  const radialGain = 0.38 + 0.62 * (1 - s(4, 18, r));
  const qg = (r - 3.1) * 3;
  const outerFade = 1 - s(rOut - 10, rOut, r);
  return (flux * 11 * radialGain + Math.exp(-qg * qg) * 2.8) * outerFade;
}
/** fração da opacidade que tapa o fundo no raio r (1 = a de sempre) */
export function densidadeDoDisco(r: number, rOut: number): number {
  return Math.min(envelopeDoDisco(r, rOut) / envelopeDoDisco(RAIO_DENSO_RS, rOut), 1);
}
const ENVELOPE_REF_GLSL = envelopeDoDisco(RAIO_DENSO_RS, 26).toFixed(5);

export const BH_MARCH_FRAG = /* glsl */ `
${COMMON}

uniform sampler2D tScene;
uniform float uTime;
uniform float uGain;
uniform int   uSteps;
uniform float uRotSign;
uniform float uDin;
uniform float uDout;
uniform float uDopMax;
uniform float uOpNear;
uniform float uOpFar;
uniform float uDiskBright;
uniform float uRotSpeed;

#define RS 1.0

// ---------------------------------------------------------------- noise -----
float hash1(vec3 p){
  p = fract(p*0.3183099 + vec3(0.10,0.17,0.13));
  p *= 17.0;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float vnoise(vec3 x){
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f*f*(3.0-2.0*f);
  float n000 = hash1(i);
  float n100 = hash1(i+vec3(1.0,0.0,0.0));
  float n010 = hash1(i+vec3(0.0,1.0,0.0));
  float n110 = hash1(i+vec3(1.0,1.0,0.0));
  float n001 = hash1(i+vec3(0.0,0.0,1.0));
  float n101 = hash1(i+vec3(1.0,0.0,1.0));
  float n011 = hash1(i+vec3(0.0,1.0,1.0));
  float n111 = hash1(i+vec3(1.0,1.0,1.0));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y),
             mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm(vec3 p){
  float v = 0.0;
  float a = 0.5;
  for(int i=0;i<5;i++){
    v += a*vnoise(p);
    p = p*2.03 + 11.3;
    a *= 0.5;
  }
  return v;
}

vec3 blackbody(float t){
  vec3 c = mix(vec3(0.55,0.06,0.01), vec3(1.00,0.42,0.10), smoothstep(0.00,0.55,t));
  c = mix(c, vec3(1.00,0.86,0.55), smoothstep(0.50,1.05,t));
  c = mix(c, vec3(0.85,0.92,1.25), smoothstep(1.05,1.90,t));
  return c;
}

// aceleração da geodésica nula de Schwarzschild (c = G = 1, RS = 1)
vec3 accAt(vec3 p, vec3 v){
  vec3 h = cross(p, v);
  float r2 = dot(p, p);
  return -1.5*RS*dot(h, h)/(r2*r2*sqrt(r2))*p;
}

// fração da fatia do disco entre o plano médio e a altura y, no raio r
// (0 no plano, 1 na face): meia-espessura ESPESSURA·r, perfil macio
float fatia(vec3 p){
  float r = length(p.xz);
  if(r >= uDout) return 1.0; // além da borda não há disco
  float u = min(abs(p.y) / (${ESPESSURA_GLSL} * max(r, uDin)), 1.0);
  return 1.0 - (1.0 - u)*(1.0 - u);
}

// o disco no ponto q, com o peso w da espessura atravessada (1 = o disco
// inteiro); true quando a opacidade satura
bool diskShade(vec3 q, float w, vec3 rayDir, inout vec3 col, inout float trans){
  float qr = length(q.xz);
  if(qr <= uDin || qr >= uDout) return false;
  float ang = atan(q.z, q.x);

  // fluxo estilo Novikov–Thorne, ISCO = 3 RS
  float x = max(qr, 3.001);
  float flux = max(pow(x/3.0, -3.0)*(1.0 - sqrt(3.0/x)), 0.0);
  float temp = pow(flux*10.0, 0.25);

  // padrão rotacionado em cartesiano (nunca amostrar por atan)
  float omega = uRotSign*1.1*uRotSpeed*pow(3.0/qr, 1.5);
  float rot = omega*uTime;
  float ca = cos(rot), sa = sin(rot);
  vec3 qp = vec3(ca*q.x + sa*q.z, 0.0, -sa*q.x + ca*q.z);
  vec2 rp = qp.xz/qr;

  // turbulência: warp 1.5x, detalhe interno, listras 22x, máscara de vias
  vec3 pc = vec3(rp.x*3.0, rp.y*3.0, qr*0.85);
  vec3 warp = vec3(
    fbm(pc*1.5),
    fbm(pc*1.5 + vec3(5.2,1.3,2.8)),
    fbm(pc*1.5 + vec3(9.7,4.1,7.3)));
  float turb = fbm(pc*2.0 + warp*1.5);
  float innerDetail = 1.0 - smoothstep(4.0, 18.0, qr);
  turb = mix(0.50, turb*1.7, innerDetail);
  float streakN = fbm(vec3(rp.x*22.0, rp.y*22.0, qr*1.4));
  float streak = mix(0.95, mix(0.55, 1.15, smoothstep(0.25, 0.85, streakN)), innerDetail);
  float lane = fbm(vec3(rp.x*5.0, rp.y*5.0, qr*0.55) + warp*0.8);
  float laneMask = mix(0.85, mix(0.50, 1.30, smoothstep(0.15, 0.80, lane)), innerDetail);
  float radialGain = mix(0.38, 1.0, innerDetail);

  float I = flux*11.0*turb*streak*laneMask*radialGain;
  float qg = (qr-3.1)*3.0;                            // regra 1 do README: quadrado é multiplicação
  float brilhoInterno = exp(-qg*qg)*2.8;
  I += brilhoInterno;
  // rampa externa mais curta que a da demo (era uDout-14): com o disco
  // compacto de 26 RS ela comia o meio do disco
  float outerFade = 1.0 - smoothstep(uDout-10.0, uDout, qr);
  I *= outerFade;

  // beaming relativístico + redshift gravitacional
  float beta = sqrt(0.5/qr);
  float gamma = 1.0/sqrt(max(1.0 - beta*beta, 1e-4));
  vec3 tdir = normalize(vec3(-sin(ang), 0.0, cos(ang)))*uRotSign;
  float dop = 1.0/(gamma*(1.0 - dot(tdir*beta, rayDir)));
  dop = clamp(dop, 0.50, uDopMax);
  float g = sqrt(max(1.0 - RS/qr, 0.0));

  vec3 dcol = blackbody(temp*dop*g) * I * (dop*dop*dop) * g * uDiskBright;
  float alpha = mix(uOpFar, uOpNear, 1.0 - smoothstep(4.0, 13.0, qr)) * outerFade;
  // gás que quase não brilha quase não tapa: a absorção segue a densidade,
  // lida no envelope radial da emissão (sem a turbulência, que é padrão, e
  // sem Doppler, que é do observador); o brilho fica o de sempre. Por
  // dentro de ~${RAIO_DENSO_RS} RS nada muda; a borda externa rala vira gás opticamente
  // fino e deixa o fundo passar — de lado era ela o risco escuro.
  float tapa = alpha * min((flux*11.0*radialGain + brilhoInterno)*outerFade / ${ENVELOPE_REF_GLSL}, 1.0);
  if(w != 1.0){
    alpha = 1.0 - pow(1.0 - alpha, w);
    tapa = 1.0 - pow(1.0 - tapa, w);
  }
  col += trans * alpha * dcol;
  trans *= 1.0 - tapa;
  if(trans < 0.02){ trans = 0.0; return true; }
  return false;
}

// o disco é uma FATIA fina, não um plano: cada trecho do raio leva a parte
// da espessura que atravessou (somando 1 numa travessia inteira — a de
// sempre, vista inclinada). De lado, o raio rente à face pega só uma parte
// dela, e o disco vira faixa macia em vez de risco de um pixel. As partes
// pequenas esperam em pend (no último ponto, qPend) e são desenhadas
// juntas — no cruzamento, a cada meio disco ou ao sair da fatia —, para
// o raio rasante não pagar o disco inteiro a cada passo.
bool diskCross(vec3 a, vec3 b, vec3 rayDir, inout vec3 col, inout float trans,
               inout float pend, inout vec3 qPend){
  // longe do plano, acima da fatia mais grossa, nada a fazer (o caso comum)
  if(a.y*b.y > 0.0 && min(abs(a.y), abs(b.y)) >= ${ESPESSURA_GLSL} * uDout && pend <= 0.001){
    pend = 0.0;
    return false;
  }
  float fa = fatia(a), fb = fatia(b);
  bool cruza = a.y*b.y <= 0.0;
  float w = cruza ? 0.5*(fa + fb) : 0.5*abs(fa - fb);
  if(w > 0.0) qPend = fa < fb ? a : b;
  if(cruza) qPend = mix(a, b, abs(a.y)/(abs(a.y) + abs(b.y) + 1e-5));
  pend += w;
  if(cruza){
    // o cruzamento leva a travessia INTEIRA (o plano de sempre); o resto
    // dela, do outro lado, já fica pago (pend negativo)
    w = max(pend, 1.0);
    pend -= w;
    return diskShade(qPend, w, rayDir, col, trans);
  }
  if(w <= 0.0 && pend < 0.001){ pend = 0.0; return false; } // fora da fatia
  if(w > 0.0 && pend < 0.5) return false;                   // ainda pouco
  w = pend;
  pend = 0.0;
  return diskShade(qPend, w, rayDir, col, trans);
}

void main(){
  vec3 rd = rayAt(vUv);
  float b;
  vec3 bentWeak = weakBend(rd, b);

  // fora da zona forte, o march devolve o MESMO analítico do composite
  // (a costura entre os dois fica dentro da banda de mistura)
  if(b > uMarchB){
    vec3 pv = dirToUv(bentWeak);
    vec2 cuv = clamp(pv.xy, 0.0, 1.0);
    float ok = smoothstep(0.0, 0.06, pv.z) *
      (1.0 - smoothstep(0.0, 0.2, length(pv.xy - cuv)));
    vec3 lensed = texture2D(tScene, cuv).rgb;
    vec3 fallback = texture2D(tScene, vUv).rgb;
    gl_FragColor = vec4(mix(fallback, lensed, ok), 1.0);
    return;
  }

  vec3 pos = uRoL;
  vec3 vel = rd;
  vec3 col = vec3(0.0);
  vec3 haloCol = vec3(0.0);
  float trans = 1.0;
  float pend = 0.0;        // espessura do disco à espera (ver diskCross)
  vec3 qPend = vec3(0.0);
  float minR = 1e5;
  float lastR = length(uRoL);

  for(int i=0;i<600;i++){
    if(i >= uSteps) break;
    float r = length(pos);
    lastR = r;
    if(r < 1.03*RS){ trans = 0.0; break; }                 // horizonte
    if(r > uDout*1.35 && dot(pos,vel) > 0.0){ break; }     // escapou
    minR = min(minR, r);

    float dt = max(0.012, r*mix(0.02, 0.06, smoothstep(6.0, 20.0, r)));

    // halo volumétrico fino abraçando o plano do disco
    float absY = abs(pos.y);
    if(absY < 0.45 && r > uDin && r < uDout){
      float dens = exp(-absY*30.0)*0.03*(1.0 - smoothstep(10.0, uDout-1.0, r));
      float xh = max(r, 3.001);
      float fluxh = max(pow(xh/3.0, -3.0)*(1.0 - sqrt(3.0/xh)), 0.0);
      vec3 glowc = blackbody(pow(fluxh*10.0, 0.25)*0.9);
      haloCol += trans * glowc * (fluxh*3.5) * dens * dt * uDiskBright;
    }

    if(r < 4.4){
      // refino perto do crítico: dois meio-passos RK2 (ponto médio)
      float hdt = dt*0.5;
      bool absorbed = false;
      for(int s = 0; s < 2; s++){
        vec3 k1 = accAt(pos, vel);
        vec3 vm = normalize(vel + k1*(hdt*0.5));
        vec3 pm = pos + vel*(hdt*0.5);
        vec3 k2 = accAt(pm, vm);
        vec3 pn = pos + vm*hdt;
        vel = normalize(vel + k2*hdt);
        if(diskCross(pos, pn, vel, col, trans, pend, qPend)) absorbed = true;
        pos = pn;
        minR = min(minR, length(pos));
      }
      if(absorbed) break;
    }else{
      vel = normalize(vel + accAt(pos, vel)*dt);
      vec3 npos = pos + vel*dt;
      if(diskCross(pos, npos, vel, col, trans, pend, qPend)){
        pos = npos;
        break;
      }
      pos = npos;
    }
  }

  // fundo REAL dobrado: a cena amostrada na direção de escape. A tela
  // só cobre parte do céu — raio dobrado para fora dela (ou para trás
  // da câmera) NÃO pode virar preto: pintado de preto, o conjunto
  // dessas direções desenhava BOLAS ESCURAS sobrepostas ao redor da
  // sombra (visto pelo usuário). Sem dado direcional, a melhor
  // aproximação dentro do núcleo é a névoa LOCAL (atrás da câmera
  // também é névoa dourada): cai-se para a cena reta do próprio pixel.
  // A sombra de verdade continua preta por física (trans = 0).
  vec3 bg = vec3(0.0);
  if(trans > 0.0){
    float deep = clamp((lastR-1.03)*0.45, 0.45, 1.0);
    col += haloCol * deep;
    vec3 pv = dirToUv(vel);
    vec2 cuv = clamp(pv.xy, 0.0, 1.0);
    float ok = smoothstep(0.0, 0.08, pv.z) *
      (1.0 - smoothstep(0.0, 0.3, length(pv.xy - cuv) * 2.0));
    vec3 lensed = texture2D(tScene, cuv).rgb;
    vec3 fallback = texture2D(tScene, vUv).rgb;
    bg = mix(fallback, lensed, ok) * trans * deep;
  }
  // anel de fótons a partir do perigeu rastreado
  float pg = (minR-1.55)*4.0;
  col += vec3(1.0,0.92,0.80) * exp(-pg*pg) * 0.05;

  gl_FragColor = vec4(col * uGain + bg, 1.0);
}
`;

export const BH_COMPOSITE_FRAG = /* glsl */ `
${COMMON}

uniform sampler2D tScene;
uniform sampler2D tMarch;

void main(){
  vec3 base = texture2D(tScene, vUv).rgb;
  vec3 rd = rayAt(vUv);
  float b;
  vec3 bent = weakBend(rd, b);

  vec3 outCol;
  if(b < uMarchB - 6.0){
    // zona forte: resultado integrado (alvo de resolução limitada — o
    // conteúdo aqui é disco/redemoinho, suave por natureza)
    outCol = texture2D(tMarch, vUv).rgb;
  } else {
    // zona fraca: deflexão analítica em resolução NATIVA — estrelas
    // continuam nítidas; custo de 1 fetch. Amostra fora da tela cai
    // para a cena reta do pixel (mesma regra anti-bola-preta do march)
    vec3 pv = dirToUv(bent);
    vec2 cuv = clamp(pv.xy, 0.0, 1.0);
    float ok = smoothstep(0.0, 0.06, pv.z) *
      (1.0 - smoothstep(0.0, 0.2, length(pv.xy - cuv)));
    vec3 weak = mix(base, texture2D(tScene, cuv).rgb, ok);
    if(b < uMarchB){
      float k = (uMarchB - b) / 6.0; // costura march ↔ analítico
      outCol = mix(weak, texture2D(tMarch, vUv).rgb, k);
    } else {
      outCol = weak;
    }
  }
  gl_FragColor = vec4(mix(base, outCol, uFade), 1.0);
}
`;

export const BH_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
