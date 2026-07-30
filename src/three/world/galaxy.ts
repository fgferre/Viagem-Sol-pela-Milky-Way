// ============================================================
// A Via Láctea — modelo 3D galactocêntrico real: bojo + barra,
// 4 braços espirais logarítmicos, regiões HII, halo e poeira.
// O Sol fica na borda interna do braço de Perseu (esporão de
// Órion), a 8,15 kpc do centro — coordenadas reais convertidas
// para o referencial heliocêntrico equatorial da cena local.
// ============================================================
import * as THREE from 'three';
import {
  GALAXY_VERT,
  GALAXY_FRAG,
  GALAXY_DUST_FRAG,
  GLOW_VERT,
  GLOW_FRAG,
  DISC_VERT,
  DISC_FRAG,
} from '../shaders/galaxyShaders';
import {
  GALACTIC_MODEL,
  LOCAL_ARM,
  SPIRAL_ARMS,
  armActivityAtRadius,
  armThetaAtRadius,
  armWidthPc,
  flareAtRadius,
  localArmThetaAtRadius,
  warpHeightPc,
} from '../cartography/galacticModel';

// ---- Geometria galáctica real no referencial da cena (pc) ----
export const GAL = {
  /** direção Sol → centro galáctico (Sgr A*, equatorial) */
  DIR_GC: new THREE.Vector3(-0.0548755604, -0.8734370902, -0.4838350155),
  /** polo galáctico norte (equatorial) */
  NGP: new THREE.Vector3(-0.867666149, -0.1980763734, 0.4559837762),
  /** distância Sol → centro (pc) */
  R_SUN: GALACTIC_MODEL.sunRadiusPc,
  /** raio do disco estelar procedural (pc) */
  DISK_RADIUS: GALACTIC_MODEL.diskRadiusPc,
  /** posição do centro galáctico na cena */
  GC_POS: new THREE.Vector3(),
};
GAL.GC_POS
  .copy(GAL.DIR_GC)
  .multiplyScalar(GAL.R_SUN)
  .addScaledVector(GAL.NGP, -GALACTIC_MODEL.sunHeightPc);

// base galactocêntrica: X aponta do centro para o Sol, Z é o polo norte.
// Exportada porque é o ÚNICO caminho válido binário→cena: os ativos de
// public/data/galaxy usam exatamente esta base (+Y → l=270°).
export const EZ = GAL.NGP.clone().normalize();
export const EX = GAL.DIR_GC.clone().negate().addScaledVector(EZ, GAL.DIR_GC.dot(EZ)).normalize();
export const EY = new THREE.Vector3().crossVectors(EZ, EX).normalize();

/** Converte coordenadas galactocêntricas do projeto (pc) para a cena. */
export function galactocentricToScene(
  lx: number,
  ly: number,
  lz: number,
  out: THREE.Vector3
): THREE.Vector3 {
  return out.set(
    GAL.GC_POS.x + EX.x * lx + EY.x * ly + EZ.x * lz,
    GAL.GC_POS.y + EX.y * lx + EY.y * ly + EZ.y * lz,
    GAL.GC_POS.z + EX.z * lx + EY.z * ly + EZ.z * lz
  );
}

const SGR_L = THREE.MathUtils.degToRad(5.6);
const SGR_B = THREE.MathUtils.degToRad(-14.2);
// direção heliocêntrica de (l, b): +EY aponta para l=270°, logo o
// coeficiente de EY é NEGATIVO — mesma convenção do builder dos
// binários (galactic.mjs: y = −d·cos b·sin l).
const SGR_DIR = EX.clone()
  .multiplyScalar(-Math.cos(SGR_B) * Math.cos(SGR_L))
  .addScaledVector(EY, -Math.cos(SGR_B) * Math.sin(SGR_L))
  .addScaledVector(EZ, Math.sin(SGR_B))
  .normalize();
export const SGR_DWARF_POS = SGR_DIR.clone().multiplyScalar(26_000);

function localToWorld(lx: number, ly: number, lz: number, out: Float32Array, o: number) {
  out[o] = GAL.GC_POS.x + EX.x * lx + EY.x * ly + EZ.x * lz;
  out[o + 1] = GAL.GC_POS.y + EX.y * lx + EY.y * ly + EZ.y * lz;
  out[o + 2] = GAL.GC_POS.z + EX.z * lx + EY.z * ly + EZ.z * lz;
}

// RNG determinístico — a galáxia é idêntica em toda visita
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd: () => number) {
  return (rnd() + rnd() + rnd() - 1.5) * 0.8165; // ~N(0, 1/2²) prático
}

export interface GalaxyBuffers {
  bright: Float32Array; // stride 8: x,y,z,r,g,b,size,alpha
  brightCount: number;
  dust: Float32Array; // stride 8
  dustCount: number;
}

export function buildGalaxy(seed = 20260730): GalaxyBuffers {
  const rnd = mulberry32(seed);

  const N_DISK = 170000;
  const N_BULGE = 85000;
  const N_LOCAL = 14000;
  const N_HII = 2200;
  const N_HALO = 5000;
  const N_SAGITTARIUS_DWARF = 6500;
  const N_DUST = 100000;

  const brightCount =
    N_DISK + N_LOCAL + N_BULGE + N_HII + N_HALO + N_SAGITTARIUS_DWARF;
  const bright = new Float32Array(brightCount * 8);
  const dust = new Float32Array(N_DUST * 8);
  let b = 0;

  const put = (
    lx: number, ly: number, lz: number,
    cr: number, cg: number, cb: number,
    size: number, alpha: number
  ) => {
    const o = b * 8;
    localToWorld(lx, ly, lz, bright, o);
    bright[o + 3] = cr;
    bright[o + 4] = cg;
    bright[o + 5] = cb;
    bright[o + 6] = size;
    bright[o + 7] = alpha;
    b++;
  };

  // ---- disco fino com braços ----
  for (let i = 0; i < N_DISK; i++) {
    // Disco exponencial (Rd ≈ 2,6 kpc) truncado sem acumular uma
    // borda artificial. O raio de 16,8 kpc inclui a revisão de 2026
    // que desloca os braços externos cerca de 10% para fora.
    // Em uma superfície exponencial Σ∝e^(-R/Rd), a distribuição
    // radial é R·e^(-R/Rd): uma Gamma(k=2). Isso preenche o disco
    // inteiro em vez de colapsar quase todas as estrelas no núcleo.
    let r = 0;
    do {
      r =
        -GALACTIC_MODEL.stellarScaleLengthPc *
        Math.log(Math.max(rnd() * rnd(), 1e-7));
    } while (r > GALACTIC_MODEL.diskRadiusPc);
    const k = Math.floor(rnd() * SPIRAL_ARMS.length);
    const arm = SPIRAL_ARMS[k];
    const activity = armActivityAtRadius(r, arm);
    const inArm = rnd() < 0.52 * activity;
    const sigmaPerp = armWidthPc(r);
    const theta = inArm
      ? armThetaAtRadius(r, arm) +
        (gauss(rnd) * sigmaPerp * 2.8) / Math.max(r, 180)
      : rnd() * Math.PI * 2;
    const flare = flareAtRadius(r);
    // A população jovem começa em σz≈20 pc; a velha produz o
    // componente fino de ~200 pc e ambos abrem no disco externo.
    const hz = inArm ? 50 + flare * 210 : 510 + flare * 670;
    const lx = r * Math.cos(theta);
    const ly = r * Math.sin(theta);
    const lz = warpHeightPc(r, theta) + gauss(rnd) * hz;

    // cor por população estelar; braços ligeiramente mais azuis
    const p = rnd();
    let cr: number, cg: number, cb: number;
    if (p < 0.25) [cr, cg, cb] = [0.78, 0.87, 1.0];
    else if (p < 0.8) [cr, cg, cb] = [1.0, 0.87, 0.72];
    else [cr, cg, cb] = [1.0, 0.72, 0.55];
    if (inArm) {
      cr = cr * 0.82 + arm.tint[0] * 0.18;
      cg = cg * 0.82 + arm.tint[1] * 0.18;
      cb = cb * 0.76 + arm.tint[2] * 0.24;
    }
    const dim = 0.35 + 0.65 * rnd() * rnd();
    const armWeight = inArm ? arm.weight * 0.48 : 0.78;
    put(
      lx, ly, lz,
      cr * dim, cg * dim, cb * dim,
      4 + rnd() * 16,
      (0.04 + rnd() * 0.1) * armWeight
    );
  }

  // ---- Esporão Local / braço de Órion -----------------------
  // É um segmento próprio, não um dos quatro braços principais.
  // O Sol fica junto à sua borda interna, como nas cartografias
  // WISE e maser-parallax.
  for (let i = 0; i < N_LOCAL; i++) {
    const r = THREE.MathUtils.lerp(
      LOCAL_ARM.minRadiusPc,
      LOCAL_ARM.maxRadiusPc,
      rnd()
    );
    const theta =
      localArmThetaAtRadius(r) +
      (gauss(rnd) * armWidthPc(r) * 1.35) / r;
    const flare = flareAtRadius(r);
    const lx = r * Math.cos(theta);
    const ly = r * Math.sin(theta);
    const lz =
      warpHeightPc(r, theta) + gauss(rnd) * (48 + flare * 100);
    const dim = 0.4 + 0.6 * rnd() * rnd();
    put(
      lx,
      ly,
      lz,
      0.70 * dim,
      0.80 * dim,
      1.0 * dim,
      4 + rnd() * 15,
      (0.045 + rnd() * 0.105) * LOCAL_ARM.weight
    );
  }

  // ---- bojo + barra longa, inclinada ~29° ------------------
  const barAng = GALACTIC_MODEL.barAngleRad;
  const cosB = Math.cos(barAng);
  const sinB = Math.sin(barAng);
  for (let i = 0; i < N_BULGE; i++) {
    let lx: number;
    let ly: number;
    let lz: number;
    if (rnd() < 0.74) {
      const sign = rnd() < 0.5 ? -1 : 1;
      const along =
        GALACTIC_MODEL.barHalfLengthPc *
        Math.pow(rnd(), rnd() < 0.72 ? 1.55 : 0.72);
      lx = sign * along;
      const end = Math.abs(lx) / GALACTIC_MODEL.barHalfLengthPc;
      ly = gauss(rnd) * (730 - end * 310);
      // Espessura box/peanut: dois lobos verticais fora do centro.
      const peanutX = (Math.abs(lx) - 1750) / 980;
      lz =
        gauss(rnd) *
        (250 + 920 * Math.exp(-peanutX * peanutX));
    } else {
      const r = Math.min(
        1200 * Math.sqrt(-2 * Math.log(1 - rnd() * 0.982)),
        2600
      );
      const a = rnd() * Math.PI * 2;
      lx = r * Math.cos(a);
      ly = r * Math.sin(a) * 0.76;
      lz = gauss(rnd) * Math.min(1250, 430 + r * 0.36);
    }
    const rx = lx * cosB - ly * sinB;
    const ry = lx * sinB + ly * cosB;
    lx = rx;
    ly = ry;
    const dim = 0.5 + 0.5 * rnd();
    put(
      lx,
      ly,
      lz,
      1.0 * dim,
      0.78 * dim,
      0.56 * dim,
      3 + rnd() * 9,
      0.025 + rnd() * 0.06
    );
  }

  // ---- regiões HII — nós rosados/azuis colados nos braços ----
  for (let i = 0; i < N_HII; i++) {
    const inLocalArm = i < N_HII * 0.16;
    const k = Math.floor(rnd() * SPIRAL_ARMS.length);
    const arm = SPIRAL_ARMS[k];
    const r = inLocalArm
      ? THREE.MathUtils.lerp(LOCAL_ARM.minRadiusPc, LOCAL_ARM.maxRadiusPc, rnd())
      : THREE.MathUtils.lerp(
          arm.minRadiusPc,
          arm.maxRadiusPc,
          Math.pow(rnd(), 0.88)
        );
    const sigmaPerp = armWidthPc(r);
    const theta = inLocalArm
      ? localArmThetaAtRadius(r) + (gauss(rnd) * sigmaPerp * 0.8) / r
      : armThetaAtRadius(r, arm) + (gauss(rnd) * sigmaPerp * 0.9) / r;
    const lx = r * Math.cos(theta);
    const ly = r * Math.sin(theta);
    const lz =
      warpHeightPc(r, theta) + gauss(rnd) * (46 + flareAtRadius(r) * 105);
    const armWeight = inLocalArm ? LOCAL_ARM.weight : arm.weight;
    if (rnd() < 0.6) {
      put(
        lx, ly, lz,
        1.0, 0.38, 0.55,
        35 + rnd() * 140,
        (0.035 + rnd() * 0.09) * armWeight
      );
    } else {
      put(
        lx, ly, lz,
        0.62, 0.78, 1.0,
        35 + rnd() * 140,
        (0.035 + rnd() * 0.085) * armWeight
      );
    }
  }

  // ---- halo estelar esparso ----
  for (let i = 0; i < N_HALO; i++) {
    const r = 4000 + 18000 * Math.pow(rnd(), 1.7);
    const a = rnd() * Math.PI * 2;
    const u = rnd() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    put(r * s * Math.cos(a), r * s * Math.sin(a), r * u, 0.9, 0.85, 0.8, 3 + rnd() * 9, 0.055);
  }

  // ---- Galáxia Anã Elíptica de Sagitário -------------------
  // Centro aproximado: l=5,6°, b=-14,2°, d=26 kpc. É tênue e
  // alongada verticalmente pelas marés da Via Láctea.
  const sgrDir = SGR_DIR;
  const sgrCenter = SGR_DWARF_POS;
  const sgrAcross = new THREE.Vector3().crossVectors(EZ, sgrDir).normalize();
  for (let i = 0; i < N_SAGITTARIUS_DWARF; i++) {
    const along = gauss(rnd) * 3_800;
    const across = gauss(rnd) * 1_550;
    const depth = gauss(rnd) * 1_100;
    const p = sgrCenter
      .clone()
      .addScaledVector(EZ, along)
      .addScaledVector(sgrAcross, across)
      .addScaledVector(sgrDir, depth);
    const dim = 0.35 + rnd() * 0.55;
    // p já está no referencial heliocêntrico; convertemos de volta à
    // base local para reutilizar o único caminho de gravação.
    const q = p.clone().sub(GAL.GC_POS);
    put(
      q.dot(EX),
      q.dot(EY),
      q.dot(EZ),
      0.95 * dim,
      0.74 * dim,
      0.56 * dim,
      3 + rnd() * 8,
      0.018 + rnd() * 0.045
    );
  }

  // ---- poeira — faixas escuras na borda interna dos braços ----
  let dN = 0;
  const putDust = (lx: number, ly: number, lz: number, size: number, alpha: number) => {
    const o = dN * 8;
    localToWorld(lx, ly, lz, dust, o);
    dust[o + 3] = 1;
    dust[o + 4] = 1;
    dust[o + 5] = 1;
    dust[o + 6] = size;
    dust[o + 7] = alpha;
    dN++;
  };
  for (let i = 0; i < N_DUST; i++) {
    if (rnd() < 0.15) {
      // poeira da barra
      const lx =
        (rnd() * 2 - 1) * GALACTIC_MODEL.barHalfLengthPc * 0.88;
      const ly = gauss(rnd) * 430;
      const rx = lx * cosB - ly * sinB;
      const ry = lx * sinB + ly * cosB;
      putDust(
        rx,
        ry,
        gauss(rnd) * 125,
        65 + rnd() * 145,
        0.008 + rnd() * 0.018
      );
    } else {
      const inLocalArm = rnd() < 0.12;
      const k = Math.floor(rnd() * SPIRAL_ARMS.length);
      const arm = SPIRAL_ARMS[k];
      const r = inLocalArm
        ? THREE.MathUtils.lerp(LOCAL_ARM.minRadiusPc, LOCAL_ARM.maxRadiusPc, rnd())
        : THREE.MathUtils.lerp(
            arm.minRadiusPc,
            arm.maxRadiusPc,
            Math.pow(rnd(), 0.94)
          );
      const sigmaPerp = armWidthPc(r);
      // deslocada para a borda côncava (interna) do braço
      const centerTheta = inLocalArm
        ? localArmThetaAtRadius(r)
        : armThetaAtRadius(r, arm);
      const laneSide = rnd() < 0.82 ? 1 : -0.55;
      const theta =
        centerTheta +
        (laneSide *
          sigmaPerp *
          (0.55 + Math.abs(gauss(rnd)) * 2.65)) /
          r;
      const clumpAlpha = rnd() < 0.52 ? 1 : 0.18;
      putDust(
        r * Math.cos(theta),
        r * Math.sin(theta),
        warpHeightPc(r, theta) +
          gauss(rnd) * (58 + flareAtRadius(r) * 120),
        65 + rnd() * 155,
        (0.008 + rnd() * 0.022) * clumpAlpha
      );
    }
  }

  return { bright, brightCount, dust, dustCount: dN };
}

export type CartographyMode = 'blend' | 'off' | 'observed';

export class Galaxy {
  readonly group = new THREE.Group();
  private brightMat: THREE.ShaderMaterial;
  private dustMat: THREE.ShaderMaterial;
  private glowMat: THREE.ShaderMaterial; // bojo
  private dwarfMat: THREE.ShaderMaterial; // anã de Sagitário
  private markerMat: THREE.ShaderMaterial; // Sol ("você está aqui")
  private discMats: THREE.ShaderMaterial[] = [];
  private discMeshes: THREE.Mesh[] = [];
  private discBaseAlphas: number[] = [];
  private markerMesh!: THREE.Mesh;
  private dustMap: THREE.Texture;
  private dustPts!: THREE.Points;
  private glowMesh!: THREE.Mesh;
  private dwarfMesh!: THREE.Mesh;
  private static dbg = new URLSearchParams(window.location.search);

  /** 1×1 sem cobertura — os shaders caem 100% no procedural. */
  static emptyDustMap(): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      new Uint8Array([0, 0]),
      1,
      1,
      THREE.RGFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    return texture;
  }

  private ownsDustMap: boolean;

  constructor(buffers: GalaxyBuffers, dustMap?: THREE.Texture | null) {
    this.ownsDustMap = !dustMap;
    this.dustMap = dustMap ?? Galaxy.emptyDustMap();
    // --- partículas brilhantes (aditivas) ---
    const geo = new THREE.BufferGeometry();
    const bd = buffers.bright;
    const brightBuffer = new THREE.InterleavedBuffer(bd, 8);
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(brightBuffer, 3, 0));
    geo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(brightBuffer, 3, 3));
    geo.setAttribute('aSize', new THREE.InterleavedBufferAttribute(brightBuffer, 1, 6));
    geo.setAttribute('aAlpha', new THREE.InterleavedBufferAttribute(brightBuffer, 1, 7));
    geo.boundingSphere = new THREE.Sphere(GAL.GC_POS.clone(), 40000);

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_FRAG,
      uniforms: this.sharedUniforms(20),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const brightPts = new THREE.Points(geo, this.brightMat);
    brightPts.frustumCulled = false;
    brightPts.renderOrder = 2;
    this.group.add(brightPts);

    // --- emissão contínua dos braços em três lâminas 3D ---
    this.createDiscLayers();

    // --- brilho contínuo do bojo ---
    this.glowMat = this.makeGlow(new THREE.Vector3(1.0, 0.68, 0.42), 2700, 0.5);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.glowMat);
    glow.position.copy(GAL.GC_POS);
    glow.frustumCulled = false;
    glow.renderOrder = 3;
    this.group.add(glow);
    this.glowMesh = glow;

    // --- brilho integrado da galáxia anã de Sagitário --------
    this.dwarfMat = this.makeGlow(
      new THREE.Vector3(0.78, 0.55, 0.38),
      1_150,
      0
    );
    const dwarf = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dwarfMat);
    dwarf.position.copy(SGR_DWARF_POS);
    dwarf.frustumCulled = false;
    dwarf.renderOrder = 3;
    this.group.add(dwarf);
    this.dwarfMesh = dwarf;

    // --- poeira multiplicativa (depois de toda a luz) ---
    const dGeo = new THREE.BufferGeometry();
    const dd = buffers.dust;
    const dustBuffer = new THREE.InterleavedBuffer(dd, 8);
    dGeo.setAttribute('position', new THREE.InterleavedBufferAttribute(dustBuffer, 3, 0));
    dGeo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(dustBuffer, 3, 3));
    dGeo.setAttribute('aSize', new THREE.InterleavedBufferAttribute(dustBuffer, 1, 6));
    dGeo.setAttribute('aAlpha', new THREE.InterleavedBufferAttribute(dustBuffer, 1, 7));
    dGeo.boundingSphere = new THREE.Sphere(GAL.GC_POS.clone(), 40000);

    this.dustMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_DUST_FRAG,
      uniforms: {
        ...this.sharedUniforms(22),
        uDustColor: { value: new THREE.Vector3(0.4, 0.36, 0.33) },
      },
      blending: THREE.MultiplyBlending,
      depthWrite: false,
      transparent: true,
      premultipliedAlpha: true,
    });
    const dustPts = new THREE.Points(dGeo, this.dustMat);
    dustPts.frustumCulled = false;
    dustPts.renderOrder = 5;
    this.group.add(dustPts);
    this.dustPts = dustPts;

    // --- marcador do Sol ---
    this.markerMat = this.makeGlow(new THREE.Vector3(1.0, 0.9, 0.7), 125, 1);
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.markerMat);
    marker.position.set(0, 0, 0);
    marker.frustumCulled = false;
    marker.renderOrder = 6;
    this.group.add(marker);
    this.markerMesh = marker;
  }

  private sharedUniforms(maxPx: number) {
    return {
      uCamPos: { value: new THREE.Vector3() },
      uScreenH: { value: 1080 },
      uTanHalfFov: { value: 0.55 },
      uFade: { value: 0 },
      uMaxPx: { value: maxPx },
    };
  }

  private makeGlow(color: THREE.Vector3, size: number, pulse: number) {
    return new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: {
        uColor: { value: color },
        uSize: { value: size },
        uTime: { value: 0 },
        uFade: { value: 0 },
        uPulse: { value: pulse },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
  }

  private createDiscLayers() {
    const root = new THREE.Group();
    const basis = new THREE.Matrix4().makeBasis(EX, EY, EZ);
    root.position.copy(GAL.GC_POS);
    root.quaternion.setFromRotationMatrix(basis);

    // Subdivisões são necessárias para que o vertex shader curve a
    // lâmina no warp — duas faces planas não poderiam fazê-lo.
    const geometry = new THREE.PlaneGeometry(2, 2, 144, 144);
    const layers: Array<[number, number, number]> = [
      [-340, 0.1, 2.1],
      [-190, 0.22, 3.7],
      [-75, 0.4, 7.9],
      [0, 0.64, 11.3],
      [85, 0.35, 17.7],
      [205, 0.2, 23.9],
      [380, 0.08, 31.1],
    ];
    for (const [height, alpha, seed] of layers) {
      const material = new THREE.ShaderMaterial({
        vertexShader: DISC_VERT,
        fragmentShader: DISC_FRAG,
        uniforms: {
          uFade: { value: 0 },
          uSeed: { value: seed },
          uLayerAlpha: { value: alpha },
          uDiskRadius: { value: GAL.DISK_RADIUS },
          uDustMap: { value: this.dustMap },
          uCartBlend: { value: 1 },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = height;
      mesh.scale.set(GAL.DISK_RADIUS, GAL.DISK_RADIUS, 1);
      mesh.renderOrder = 1;
      root.add(mesh);
      this.discMats.push(material);
      this.discMeshes.push(mesh);
      this.discBaseAlphas.push(alpha);
    }
    this.group.add(root);
  }

  /**
   * off: só procedural · blend: observado condiciona o procedural ·
   * observed: realça o medido dimando a emissão inferida (debug A/B).
   */
  setCartography(mode: CartographyMode) {
    this.discMats.forEach((material, index) => {
      material.uniforms.uCartBlend.value = mode === 'off' ? 0 : 1;
      material.uniforms.uLayerAlpha.value =
        this.discBaseAlphas[index] * (mode === 'observed' ? 0.35 : 1);
    });
  }

  /**
   * externalFade revela a galáxia vista de fora; localBandFade reutiliza
   * somente suas partículas e poeira quando a câmera ainda está dentro
   * do disco. Assim a faixa celeste é geometria 3D real, nunca um skybox.
   */
  update(
    camPos: THREE.Vector3,
    screenH: number,
    tanHalfFov: number,
    time: number,
    externalFade: number,
    markerFade: number,
    localBandFade: number
  ) {
    this.group.visible =
      externalFade > 0.001 || markerFade > 0.001 || localBandFade > 0.001;
    if (!this.group.visible) return;

    const brightFade = Math.max(externalFade, localBandFade);
    const dustFade = Math.max(externalFade, localBandFade * 0.72);
    for (const [m, layerFade] of [
      [this.brightMat, brightFade],
      [this.dustMat, dustFade],
    ] as const) {
      const u = m.uniforms;
      (u.uCamPos.value as THREE.Vector3).copy(camPos);
      u.uScreenH.value = screenH;
      u.uTanHalfFov.value = tanHalfFov;
      u.uFade.value = layerFade;
    }
    // As lâminas contínuas só entram na vista externa. De dentro
    // seriam planos infinitos; a faixa local vem das partículas 3D.
    // Com fade 0 os meshes ficam invisíveis: cada lâmina de 33,6 kpc
    // custa milhões de fragmentos de FBM que somariam exatamente zero.
    const discVisible = externalFade > 0.001;
    for (const material of this.discMats) {
      material.uniforms.uFade.value = externalFade;
    }
    for (const mesh of this.discMeshes) {
      mesh.visible = discVisible;
    }
    this.markerMesh.visible = markerFade > 0.001;
    // o brilho contínuo do bojo só aparece de longe — perto ele
    // cobriria a tela inteira de branco
    const dGC = camPos.distanceTo(GAL.GC_POS);
    const glowGate = THREE.MathUtils.smoothstep(dGC, 5000, 13000);
    this.glowMat.uniforms.uTime.value = time;
    this.glowMat.uniforms.uFade.value = Math.max(
      externalFade * glowGate * 0.32,
      localBandFade * 0.11
    );
    this.dwarfMat.uniforms.uTime.value = time;
    this.dwarfMat.uniforms.uFade.value = externalFade * 0.11;
    this.markerMat.uniforms.uTime.value = time;
    this.markerMat.uniforms.uFade.value = markerFade;
    this.dustPts.visible = !Galaxy.dbg.has('nogdust');
    this.glowMesh.visible = !Galaxy.dbg.has('noglow');
    this.dwarfMesh.visible = !Galaxy.dbg.has('noglow');
  }

  dispose() {
    this.brightMat.dispose();
    this.dustMat.dispose();
    this.glowMat.dispose();
    this.dwarfMat.dispose();
    this.markerMat.dispose();
    this.discMats.forEach((material) => material.dispose());
    if (this.ownsDustMap) this.dustMap.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
    });
  }
}
