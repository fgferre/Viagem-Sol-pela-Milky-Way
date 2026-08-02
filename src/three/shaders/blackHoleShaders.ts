// ============================================================
// Sagittarius A* — raytracer de geodésicas nulas (Schwarzschild)
// adaptado do estudo "Gargantua" (referência do usuário). O disco
// de acreção, o beaming relativístico, o redshift gravitacional e
// o anel de fótons são integrados por fragmento num billboard.
//
// Diferenças deliberadas contra a referência:
// - SEM céu próprio (starfield/milkyway da demo): raios que escapam
//   devolvem alpha — a cena real (bojo, partículas, poeira) é o fundo,
//   composta por blend premultiplicado (ONE, ONE_MINUS_SRC_ALPHA).
//   O que se perde é a LENTE sobre o fundo real (amostrado reto);
//   o que se mantém é o icônico: o disco raytraçado por cima/baixo
//   do horizonte e a sombra pura.
// - Saída em HDR linear; tonemap/knee/bloom são do pós do app.
// - Sem modos de debug nem composite próprio.
//
// Escala: o RS real de Sgr A* (4,15e6 M☉) é 4e-7 pc — invisível por
// natureza a qualquer distância de voo. uSize/uSizeRs definem a
// ESCALA ARTÍSTICA (documentada em blackHole.ts); a física em RS=1
// independe dela.
// ============================================================

export const BH_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uSize;

void main() {
  vUv = position.xy;
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}
`;

export const BH_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uFade;      // 0..1 — distância ao GC (o app decide)
uniform float uGain;      // acopla o HDR do disco à exposição da cena
uniform int   uSteps;
uniform float uSizeRs;    // meia-largura do billboard em RS
uniform vec3  uRoL;       // câmera no referencial local (RS; y = normal do disco)
uniform vec3  uRightL;    // eixo x do billboard no referencial local
uniform vec3  uUpL;       // eixo y do billboard no referencial local
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

// ------------------------------------------------------ pseudo-blackbody ----
vec3 blackbody(float t){
  vec3 c = mix(vec3(0.55,0.06,0.01), vec3(1.00,0.42,0.10), smoothstep(0.00,0.55,t));
  c = mix(c, vec3(1.00,0.86,0.55), smoothstep(0.50,1.05,t));
  c = mix(c, vec3(0.85,0.92,1.25), smoothstep(1.05,1.90,t));
  return c;
}

// Aceleração da geodésica nula de Schwarzschild (c = G = 1, RS = 1)
vec3 accAt(vec3 p, vec3 v){
  vec3 h = cross(p, v);
  float r2 = dot(p, p);
  return -1.5*RS*dot(h, h)/(r2*r2*sqrt(r2))*p;
}

// Cruzamento com o plano do disco (múltiplos cruzamentos permitidos).
// true quando a opacidade front-to-back satura (raio absorvido).
bool diskCross(vec3 a, vec3 b, vec3 rayDir, inout vec3 col, inout float trans){
  if(a.y*b.y > 0.0) return false;
  float t = abs(a.y)/(abs(a.y) + abs(b.y) + 1e-5);
  vec3 q = mix(a, b, t);
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
  I += exp(-pow((qr-3.1)*3.0, 2.0))*2.8;              // brilho interno
  float outerFade = 1.0 - smoothstep(uDout-14.0, uDout, qr);
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
  col += trans * alpha * dcol;
  trans *= 1.0 - alpha;
  if(trans < 0.02){ trans = 0.0; return true; }
  return false;
}

// ------------------------------------------------------------------ main ----
void main(){
  vec3 ro = uRoL;
  vec3 target = (uRightL*vUv.x + uUpL*vUv.y) * uSizeRs;
  vec3 rd = normalize(target - ro);

  // parâmetro de impacto: raio reto que passaria longe do disco e do
  // horizonte não precisa integrar nada (a deflexão a b>1.3·uDout é <2%)
  float b = length(cross(ro, rd));
  if(b > uDout*1.3){
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 pos = ro;
  vec3 vel = rd;
  vec3 col = vec3(0.0);              // acumulador do disco (front-to-back)
  vec3 haloCol = vec3(0.0);          // halo volumétrico (some se capturado)
  float trans = 1.0;
  float minR = 1e5;
  float lastR = length(ro);

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
        if(diskCross(pos, pn, vel, col, trans)) absorbed = true;
        pos = pn;
        minR = min(minR, length(pos));
      }
      if(absorbed) break;
    }else{
      vel = normalize(vel + accAt(pos, vel)*dt);
      vec3 npos = pos + vel*dt;
      if(diskCross(pos, npos, vel, col, trans)){
        pos = npos;
        break;
      }
      pos = npos;
    }
  }

  // raios que escapam devolvem a CENA (alpha), continuamente escurecida
  // no poço profundo — o horizonte fica preto puro
  float deep = 1.0;
  if(trans > 0.0){
    deep = clamp((lastR-1.03)*0.45, 0.45, 1.0);
    col += haloCol * deep;
  }
  // anel de fótons a partir do perigeu rastreado (curva crítica fina)
  col += vec3(1.0,0.92,0.80) * exp(-pow((minR-1.55)*4.0, 2.0)) * 0.05;

  float alpha = 1.0 - trans*deep;
  col = clamp(max(col, vec3(0.0)), vec3(0.0), vec3(64.0)) * uGain;
  // premultiplicado; uFade esmaece luz E oclusão juntas
  gl_FragColor = vec4(col * uFade, alpha * uFade);
}
`;
