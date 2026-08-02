// ============================================================
// Sagittarius A* — billboard com raytracing de geodésicas
// (shaders/blackHoleShaders.ts). Vive no centro galáctico e só
// existe de perto: o fade zera além de ~2,4 kpc e o mesh sai da
// cena (visible=false) — as capturas de medição (16/33 kpc) são
// bit-idênticas por construção. ?nobh=1 desliga; ?bhgain= varre.
//
// ESCALA ARTÍSTICA (documentada): o RS real de Sgr A* é 4e-7 pc —
// invisível a qualquer distância de voo plausível. Adotamos
// RS = 0,05 pc (~10 dias-luz, ×1,2e5 do real) para que o disco de
// acreção (40 RS = 2 pc) leia como Gargantua na curva rasante do
// roteiro (periastro 4,6 pc ≈ 92 RS). A física do shader (lente,
// beaming, redshift) é adimensional em RS e não muda com a escala.
// A extinção real até o centro (~30 mag no visível) justifica o
// fade: de longe, ninguém vê o coração da galáxia em luz visível.
// ============================================================
import * as THREE from 'three';
import { BH_VERT, BH_FRAG } from '../shaders/blackHoleShaders';
import { GAL, EX, EY, EZ } from './galaxy';
import type { QualityLevel } from '../core/engine';

const RS_PC = 0.05;
const DISK_OUT_RS = 40; // borda externa do disco (RS)
const QUAD_HALF_RS = DISK_OUT_RS * 1.35; // margem para a luz lenteada
const STEPS: Record<QualityLevel, number> = {
  cinema: 340,
  alta: 240,
  performance: 150,
};

const _q = new THREE.Vector3();
const _r = new THREE.Vector3();

export class BlackHole {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;

  constructor() {
    const query = new URLSearchParams(window.location.search);
    const gain = Number.parseFloat(query.get('bhgain') ?? '');
    const stepsOverride = Number.parseInt(query.get('bhsteps') ?? '', 10);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: BH_VERT,
      fragmentShader: BH_FRAG,
      uniforms: {
        uSize: { value: QUAD_HALF_RS * RS_PC },
        uSizeRs: { value: QUAD_HALF_RS },
        uTime: { value: 0 },
        uFade: { value: 0 },
        uGain: { value: Number.isFinite(gain) ? gain : 1.3 },
        uSteps: { value: Number.isFinite(stepsOverride) ? stepsOverride : STEPS.cinema },
        uRoL: { value: new THREE.Vector3() },
        uRightL: { value: new THREE.Vector3() },
        uUpL: { value: new THREE.Vector3() },
        uRotSign: { value: 1 },
        uDin: { value: 2.75 },
        uDout: { value: DISK_OUT_RS },
        uDopMax: { value: 1.85 },
        uOpNear: { value: 0.9 },
        uOpFar: { value: 0.8 },
        uDiskBright: { value: 1.0 },
        uRotSpeed: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      // premultiplicado: rgb já traz o próprio alpha; a sombra oclui a
      // cena (dst × (1−α)) e o disco soma por cima
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.mesh.position.copy(GAL.GC_POS);
    this.mesh.frustumCulled = false;
    // por último entre as camadas da galáxia: a sombra precisa ocluir o
    // que está atrás. Sprites À FRENTE do quad também são cobertos — raro
    // e breve na rasante; aceito (nenhuma camada escreve depth).
    this.mesh.renderOrder = 30;
    this.mesh.visible = false;
  }

  private stepsOverridden = new URLSearchParams(window.location.search).has('bhsteps');

  setQuality(q: QualityLevel) {
    if (!this.stepsOverridden) this.mat.uniforms.uSteps.value = STEPS[q];
  }

  /**
   * fade externo é responsabilidade do director (distância ao GC);
   * camera/time alimentam o raytracer no referencial local (RS).
   */
  update(camPos: THREE.Vector3, camera: THREE.PerspectiveCamera, time: number, fade: number) {
    this.mat.uniforms.uFade.value = fade;
    this.mesh.visible = fade > 0.001;
    if (!this.mesh.visible) return;
    this.mat.uniforms.uTime.value = time;

    // câmera no referencial do disco (y = polo galáctico), em RS
    _q.copy(camPos).sub(GAL.GC_POS);
    (this.mat.uniforms.uRoL.value as THREE.Vector3).set(
      _q.dot(EX) / RS_PC,
      _q.dot(EZ) / RS_PC,
      _q.dot(EY) / RS_PC
    );
    // eixos do billboard (right/up da câmera) no mesmo referencial
    _r.setFromMatrixColumn(camera.matrixWorld, 0);
    (this.mat.uniforms.uRightL.value as THREE.Vector3).set(_r.dot(EX), _r.dot(EZ), _r.dot(EY));
    _r.setFromMatrixColumn(camera.matrixWorld, 1);
    (this.mat.uniforms.uUpL.value as THREE.Vector3).set(_r.dot(EX), _r.dot(EZ), _r.dot(EY));
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
