// ============================================================
// Rig de câmera — aplica a viagem à câmera com câmera na mão
// sutil, inclinação (roll) nas curvas e modo de voo livre.
// ============================================================
import * as THREE from 'three';
import { Journey } from './journey';

// Manter o polo galáctico no alto faz o plano da Via Láctea ler como
// uma faixa coerente, em vez de girar arbitrariamente entre keyframes.
const GALACTIC_NORTH = new THREE.Vector3(
  -0.867666149,
  -0.1980763734,
  0.4559837762
).normalize();
const GALACTIC_FACE_ON_UP = new THREE.Vector3(
  -0.0548755604,
  -0.8734370902,
  -0.4838350155
).normalize();

// ruído suave barato (soma de senos irracionais)
function softNoise(t: number, seed: number): number {
  return (
    Math.sin(t * 0.31 + seed) * 0.5 +
    Math.sin(t * 0.73 + seed * 2.1) * 0.3 +
    Math.sin(t * 1.37 + seed * 4.7) * 0.2
  );
}

const _tan1 = new THREE.Vector3();
const _right = new THREE.Vector3();

export class JourneyRig {
  private journey = new Journey();
  private lookSm = new THREE.Vector3();
  private first = true;
  /** intensidade da câmera na mão (0 com prefers-reduced-motion) */
  shakeScale = 1;

  get duration() {
    return this.journey.duration;
  }

  get ticks() {
    return this.journey.tickTimes;
  }

  captionAt(t: number) {
    return this.journey.captionAt(t);
  }

  apply(
    camera: THREE.PerspectiveCamera,
    t: number,
    dt: number
  ): { warp: number; speed: number } {
    const s = this.journey.at(t);
    // amortecimento exponencial por TEMPO (não por frame): a 144 Hz
    // a câmera convergia 2,4× mais rápido que a 60 Hz
    const kLook = 1 - Math.exp(-dt / 0.36);
    const kFov = 1 - Math.exp(-dt / 0.2);

    // suavização do ponto de mira (evita saltos de lookAt); o limiar
    // de snap é RELATIVO à distância câmera→alvo — 0,6 pc absoluto
    // desligava a suavização no reframe galáctico do Ato III
    const snapDist = Math.max(0.6, s.look.distanceTo(s.pos) * 0.05);
    if (this.first || this.lookSm.distanceTo(s.look) > snapDist) {
      this.lookSm.copy(s.look);
      this.first = false;
    } else {
      this.lookSm.lerp(s.look, kLook);
    }

    camera.position.copy(s.pos);
    const viewDir = this.lookSm.clone().sub(s.pos).normalize();
    // Em uma tomada quase face-on, o polo galáctico fica paralelo à
    // direção de visão e não pode servir de "up". A transição para o
    // eixo centro→Sol evita o singularity flip do lookAt.
    const faceOn = THREE.MathUtils.smoothstep(
      Math.abs(viewDir.dot(GALACTIC_NORTH)),
      0.86,
      0.975
    );
    camera.up
      .copy(GALACTIC_NORTH)
      .lerp(GALACTIC_FACE_ON_UP, faceOn)
      .normalize();
    camera.lookAt(this.lookSm);

    // câmera na mão: rotação microscópica, cresce com o warp
    const shake = (0.00045 + s.warp * 0.0026) * this.shakeScale;
    camera.rotateX(softNoise(t, 1.7) * shake);
    camera.rotateY(softNoise(t * 0.87, 9.2) * shake);

    // roll nas curvas: tangente agora vs. daqui a pouco
    const ahead = this.journey.at(Math.min(t + 0.6, this.journey.duration));
    _tan1.copy(ahead.pos).sub(s.pos);
    if (_tan1.lengthSq() > 1e-8) {
      _right.setFromMatrixColumn(camera.matrix, 0);
      const roll = THREE.MathUtils.clamp(_tan1.normalize().dot(_right) * -0.35, -0.06, 0.06);
      camera.rotateZ(roll * (1 - s.warp * 0.4));
    }

    // FOV com pontapé de velocidade
    const targetFov = s.fov + s.warp * 7;
    camera.fov += (targetFov - camera.fov) * kFov;
    camera.updateProjectionMatrix();

    return { warp: s.warp, speed: s.speed };
  }

  reset() {
    this.first = true;
  }
}

// ============================================================
// Voo livre — arrastar para olhar, WASD/QE para voar,
// roda do mouse ajusta velocidade (escala logarítmica em pc/s).
// ============================================================
export class FreeRoam {
  enabled = false;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private yaw = 0;
  private pitch = 0;
  private vel = new THREE.Vector3();
  private speed = 4; // pc/s
  private keys = new Set<string>();
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
    this.canvas = canvas;
    this.camera = camera;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: true });
  }

  /**
   * Captura a orientação ao entrar no modo livre a partir do vetor
   * FORWARD (independente de roll): a decomposição Euler anterior
   * descartava o roll galáctico da viagem e o horizonte saltava
   * ~100–160° num clique em "Explorar livremente".
   */
  syncFromCamera() {
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    this.pitch = THREE.MathUtils.clamp(
      Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1)),
      -1.5,
      1.5
    );
    this.yaw = Math.atan2(-fwd.x, -fwd.z);
    this.resetMotion();
  }

  /** zera inércia/entradas — velocidade antiga não sobrevive à troca de modo */
  resetMotion() {
    this.vel.set(0, 0, 0);
    this.keys.clear();
    this.dragging = false;
  }

  update(dt: number) {
    if (!this.enabled) return;
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

    const f = new THREE.Vector3();
    this.camera.getWorldDirection(f);
    const r = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const u = new THREE.Vector3(0, 1, 0);

    const acc = new THREE.Vector3();
    if (this.keys.has('KeyW')) acc.add(f);
    if (this.keys.has('KeyS')) acc.sub(f);
    if (this.keys.has('KeyD')) acc.add(r);
    if (this.keys.has('KeyA')) acc.sub(r);
    if (this.keys.has('KeyE')) acc.add(u);
    if (this.keys.has('KeyQ')) acc.sub(u);
    if (acc.lengthSq() > 0) acc.normalize().multiplyScalar(this.speed * 3);
    // inércia por tempo, não por frame (mesma resposta em 60/144 Hz)
    this.vel.lerp(acc, 1 - Math.exp(-dt / 0.27));
    this.camera.position.addScaledVector(this.vel, dt);
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.keys.clear();
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.enabled) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private onPointerUp = () => {
    this.dragging = false;
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.enabled || !this.dragging) return;
    this.yaw -= (event.clientX - this.lastX) * 0.0022;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - (event.clientY - this.lastY) * 0.0022,
      -1.5,
      1.5
    );
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.enabled) return;
    // até 4.000 pc/s — dá para voar da vizinhança até ver a galáxia
    this.speed = THREE.MathUtils.clamp(
      this.speed * (event.deltaY > 0 ? 0.85 : 1.18),
      0.01,
      4000
    );
  };
}
