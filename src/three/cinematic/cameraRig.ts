// ============================================================
// Rig de câmera — documentário espacial: zero tremor, banking
// vindo do roteiro, mira amortecida, pausar-e-olhar. E o voo
// livre no REFERENCIAL GALÁCTICO (o mesmo "norte" da viagem —
// era a diferença de norte que invertia o horizonte ao entrar).
// ============================================================
import * as THREE from 'three';
import { Journey } from './journey';

// Manter o polo galáctico no alto faz o plano da Via Láctea ler como
// uma faixa coerente, em vez de girar arbitrariamente entre shots.
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

// base ortonormal ⊥ ao polo — os "leste/norte" do horizonte galáctico
const FRAME_A = new THREE.Vector3(0.0548755604, 0.8734370902, 0.4838350155); // anticentro
const FRAME_B = new THREE.Vector3().crossVectors(GALACTIC_NORTH, FRAME_A).normalize();

const _tmpV = new THREE.Vector3();
const _tmpQ = new THREE.Quaternion();

/** up compartilhado viagem/voo: polo galáctico, cedendo ao eixo
 *  centro→Sol em visadas quase face-on (evita o flip do lookAt) */
function galacticUp(viewDir: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const faceOn = THREE.MathUtils.smoothstep(
    Math.abs(viewDir.dot(GALACTIC_NORTH)),
    0.86,
    0.975
  );
  return out.copy(GALACTIC_NORTH).lerp(GALACTIC_FACE_ON_UP, faceOn).normalize();
}

export class JourneyRig {
  private journey = new Journey();
  private lookSm = new THREE.Vector3();
  private first = true;
  /** olhar-ao-redor durante a pausa (radianos, decai sozinho no play) */
  private lookYaw = 0;
  private lookPitch = 0;
  paused = false;

  get duration() {
    return this.journey.duration;
  }

  get ticks() {
    return this.journey.tickTimes;
  }

  captionAt(t: number) {
    return this.journey.captionAt(t);
  }

  metaAt(t: number) {
    return this.journey.metaAt(t);
  }

  /** arrasto do usuário com a viagem pausada */
  addLookDelta(dx: number, dy: number) {
    this.lookYaw = THREE.MathUtils.clamp(this.lookYaw - dx * 0.0022, -2.6, 2.6);
    this.lookPitch = THREE.MathUtils.clamp(this.lookPitch - dy * 0.0022, -1.2, 1.2);
  }

  apply(
    camera: THREE.PerspectiveCamera,
    t: number,
    dt: number
  ): { warp: number } {
    const s = this.journey.at(t);
    // amortecimento exponencial por TEMPO (não por frame): a 144 Hz
    // a câmera convergia 2,4× mais rápido que a 60 Hz
    const kLook = 1 - Math.exp(-dt / 0.4);
    const kFov = 1 - Math.exp(-dt / 0.2);

    // suavização do ponto de mira. Sem limiar de snap: os shots são
    // contínuos por construção; saltos só existem em seek(), que chama
    // reset() e cai no primeiro-quadro.
    const snap = this.first;
    if (snap) {
      this.lookSm.copy(s.look);
      this.first = false;
    } else {
      this.lookSm.lerp(s.look, kLook);
    }

    camera.position.copy(s.pos);
    const viewDir = _tmpV.copy(this.lookSm).sub(s.pos).normalize();
    galacticUp(viewDir, camera.up);
    camera.lookAt(this.lookSm);

    // banking do roteiro (decisão por shot; zero nos holds por contrato)
    if (s.roll !== 0) camera.rotateZ(s.roll);

    // pausar-e-olhar: offsets locais que decaem suavemente no play
    if (!this.paused) {
      const decay = Math.exp(-dt / 0.5);
      this.lookYaw *= decay;
      this.lookPitch *= decay;
    }
    if (Math.abs(this.lookYaw) > 1e-5 || Math.abs(this.lookPitch) > 1e-5) {
      camera.rotateY(this.lookYaw);
      camera.rotateX(this.lookPitch);
    }

    // FOV do roteiro, com pontapé sutil de velocidade (documentário).
    // No primeiro quadro pós-seek o fov SALTA como a mira: sem isso,
    // capturas ?t= rendiam o fov ainda amortecendo (28° onde pedia 15°).
    const targetFov = s.fov + s.warp * 3.5;
    camera.fov = snap ? targetFov : camera.fov + (targetFov - camera.fov) * kFov;
    camera.updateProjectionMatrix();

    return { warp: s.warp };
  }

  reset() {
    this.first = true;
    this.lookYaw = 0;
    this.lookPitch = 0;
  }
}

// ============================================================
// Voo livre — arrastar para olhar, WASD/QE para voar, roda do
// mouse ajusta velocidade. Yaw/pitch no referencial galáctico;
// a entrada faz um slerp curto da orientação atual para a
// orientação canônica: nada de horizonte saltando.
// Clique curto em estrela nomeada → mini-viagem cinematográfica.
// ============================================================

export interface VisitTarget {
  pos: THREE.Vector3;
  /** distância de chegada (pc) */
  arriveDist: number;
}

export class FreeRoam {
  enabled = false;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private yaw = 0;
  private pitch = 0;
  /** rolagem manual no próprio eixo (Z/X); persiste até o piloto nivelar */
  private rollAngle = 0;
  private vel = new THREE.Vector3();
  private speed = 4; // pc/s
  private keys = new Set<string>();
  private dragging = false;
  private dragMoved = 0;
  private downAt = 0;
  private lastX = 0;
  private lastY = 0;
  /** transição de entrada: slerp da orientação herdada para a canônica */
  private blend = 0; // 1 → puro herdado, 0 → puro yaw/pitch
  private fromQ = new THREE.Quaternion();
  /** voo de visita em curso (clicar-para-visitar) */
  private visit: {
    p0: THREE.Vector3; c1: THREE.Vector3; c2: THREE.Vector3; p1: THREE.Vector3;
    look0: THREE.Vector3; look1: THREE.Vector3;
    t: number; dur: number;
  } | null = null;
  /** callback de clique curto (x,y normalizados 0..1) */
  onTap: ((x: number, y: number) => void) | null = null;

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

  /** captura a orientação ao entrar no modo livre */
  syncFromCamera() {
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    // yaw/pitch no referencial do polo galáctico — o MESMO norte da
    // viagem. A decomposição em Y do mundo descartava o up galáctico
    // e o horizonte saltava ao clicar em "Explorar livremente".
    const p = fwd.dot(GALACTIC_NORTH);
    this.pitch = Math.asin(THREE.MathUtils.clamp(p, -0.999, 0.999));
    this.yaw = Math.atan2(fwd.dot(FRAME_B), fwd.dot(FRAME_A));
    // slerp de entrada: qualquer resíduo (roll do banking, up blendado)
    // se dissolve em ~0,7 s em vez de saltar
    this.fromQ.copy(this.camera.quaternion);
    this.blend = 1;
    // velocidade inicial proporcional à escala do lugar
    this.speed = THREE.MathUtils.clamp(this.camera.position.length() * 0.02, 2, 600);
    this.resetMotion();
  }

  /** deep-links ?pos=: orientação canônica JÁ no frame 1 — o slerp de
   *  entrada sob captura com virtual time congelava no meio do caminho
   *  (faixa diagonal ~38° nas faces do céu) */
  snapCanonical() {
    this.blend = 0;
  }

  /** zera inércia/entradas — velocidade antiga não sobrevive à troca de modo */
  resetMotion() {
    this.vel.set(0, 0, 0);
    this.keys.clear();
    this.dragging = false;
    this.visit = null;
    this.rollAngle = 0;
  }

  /** mini-viagem cinematográfica até uma estrela nomeada */
  startVisit(target: VisitTarget) {
    const p0 = this.camera.position.clone();
    const toTarget = target.pos.clone().sub(p0);
    const dist = toTarget.length();
    if (dist < target.arriveDist * 1.6) return; // já estamos lá
    const dir = toTarget.clone().normalize();
    // chegada: para ANTES da estrela, deslocada para o lado — composição
    // em terço, não um frontal de colisão
    const side = new THREE.Vector3().crossVectors(dir, GALACTIC_NORTH);
    if (side.lengthSq() < 1e-6) side.crossVectors(dir, GALACTIC_FACE_ON_UP);
    side.normalize();
    const p1 = target.pos
      .clone()
      .addScaledVector(dir, -target.arriveDist)
      .addScaledVector(side, target.arriveDist * 0.35)
      .addScaledVector(GALACTIC_NORTH, target.arriveDist * 0.2);
    // arco suave com leve ganho de altura no meio
    const c1 = p0.clone().lerp(p1, 0.33).addScaledVector(GALACTIC_NORTH, dist * 0.06);
    const c2 = p0.clone().lerp(p1, 0.72).addScaledVector(GALACTIC_NORTH, dist * 0.03);
    const look0 = new THREE.Vector3();
    this.camera.getWorldDirection(look0);
    look0.multiplyScalar(Math.max(dist * 0.25, 1)).add(p0);
    this.visit = {
      p0, c1, c2, p1,
      look0, look1: target.pos.clone(),
      t: 0,
      dur: THREE.MathUtils.clamp(4 + dist / 90, 5, 14),
    };
  }

  private applyVisit(dt: number) {
    const v = this.visit;
    if (!v) return;
    v.t += dt;
    const k = THREE.MathUtils.clamp(v.t / v.dur, 0, 1);
    const e = THREE.MathUtils.smoothstep(k, 0, 1);
    const i = 1 - e;
    const pos = _tmpV
      .copy(v.p0).multiplyScalar(i * i * i)
      .addScaledVector(v.c1, 3 * i * i * e)
      .addScaledVector(v.c2, 3 * i * e * e)
      .addScaledVector(v.p1, e * e * e);
    this.camera.position.copy(pos);
    const lookK = THREE.MathUtils.smoothstep(Math.min(k * 2.2, 1), 0, 1);
    const look = v.look0.clone().lerp(v.look1, lookK);
    const viewDir = look.clone().sub(pos).normalize();
    galacticUp(viewDir, this.camera.up);
    this.camera.lookAt(look);
    if (k >= 1) {
      this.visit = null;
      this.syncFromCamera();
    }
  }

  private cancelVisit() {
    if (!this.visit) return;
    this.visit = null;
    this.syncFromCamera();
  }

  update(dt: number) {
    if (!this.enabled) return;
    if (this.visit) {
      this.applyVisit(dt);
      return;
    }

    // orientação canônica a partir de yaw/pitch galácticos
    const cp = Math.cos(this.pitch);
    const fwd = _tmpV
      .set(0, 0, 0)
      .addScaledVector(FRAME_A, cp * Math.cos(this.yaw))
      .addScaledVector(FRAME_B, cp * Math.sin(this.yaw))
      .addScaledVector(GALACTIC_NORTH, Math.sin(this.pitch));
    const up = new THREE.Vector3();
    galacticUp(fwd, up);
    const target = new THREE.Vector3().copy(this.camera.position).add(fwd);
    this.camera.up.copy(up);
    this.camera.lookAt(target);

    // rolagem no próprio eixo (Z/X) — aplicada por cima do horizonte
    // galáctico; contínua enquanto a tecla estiver pressionada
    if (this.keys.has('KeyZ')) this.rollAngle += dt * 1.1;
    if (this.keys.has('KeyX')) this.rollAngle -= dt * 1.1;
    if (Math.abs(this.rollAngle) > 1e-4) this.camera.rotateZ(this.rollAngle);

    // entrada suave: dissolve o quaternion herdado sobre o canônico
    if (this.blend > 0.001) {
      this.blend *= Math.exp(-dt / 0.24);
      _tmpQ.copy(this.camera.quaternion);
      this.camera.quaternion.copy(this.fromQ).slerp(_tmpQ, 1 - this.blend);
    }

    const f = new THREE.Vector3();
    this.camera.getWorldDirection(f);
    const r = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);

    const acc = new THREE.Vector3();
    if (this.keys.has('KeyW')) acc.add(f);
    if (this.keys.has('KeyS')) acc.sub(f);
    if (this.keys.has('KeyD')) acc.add(r);
    if (this.keys.has('KeyA')) acc.sub(r);
    if (this.keys.has('KeyE')) acc.add(GALACTIC_NORTH);
    if (this.keys.has('KeyQ')) acc.sub(GALACTIC_NORTH);
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
    this.dragMoved = 0;
    this.downAt = performance.now();
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.dragging && this.enabled) {
      // clique curto e parado = tentativa de visita
      if (this.dragMoved < 6 && performance.now() - this.downAt < 400) {
        this.onTap?.(
          event.clientX / window.innerWidth,
          event.clientY / window.innerHeight
        );
      }
    }
    this.dragging = false;
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.enabled || !this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    if (this.visit && this.dragMoved > 8) this.cancelVisit();
    this.yaw -= dx * 0.0022;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * 0.0022,
      -1.5,
      1.5
    );
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (this.visit) this.cancelVisit();
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
