// ============================================================
// Rig de câmera — documentário espacial: zero tremor, banking
// vindo do roteiro, mira amortecida, pausar-e-olhar. E o voo
// livre no REFERENCIAL GALÁCTICO (o mesmo "norte" da viagem —
// era a diferença de norte que invertia o horizonte ao entrar).
// ============================================================
import * as THREE from 'three';
import { DEEP_LIMIAR_PC } from '../world/lodStellar';
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

  /**
   * O OLHAR ACUMULADO no pausar-e-olhar. O portal do Atlas guarda estes
   * dois números na entrada e os devolve na saída: `reset()` sozinho os
   * zera, e quem volta do Atlas voltaria olhando para o roteiro em vez
   * de para onde estava olhando.
   */
  get olhar(): { yaw: number; pitch: number } {
    return { yaw: this.lookYaw, pitch: this.lookPitch };
  }

  /**
   * Devolve o olhar guardado. Vai SEMPRE depois de `reset()`: o salto do
   * primeiro quadro recompõe mira e fov EXATAMENTE a partir do instante
   * (é a mesma porta do `seek`), e o caminho amortecido não serviria —
   * `kLook`/`kFov` dependem do `dt` do quadro, então repetir o estado
   * por amortecimento não é reprodutível entre execuções.
   */
  restaurarOlhar(yaw: number, pitch: number) {
    this.lookYaw = yaw;
    this.lookPitch = pitch;
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

/**
 * Guarda mínima da velocidade no domínio profundo: 1e-9 pc/s = 2,06e-4
 * UA/s = 31 km/s. Não é calibração — é o anteparo contra `speed = 0` na
 * origem exata (câmera no centro do Sol), onde o voo travaria sem
 * explicação. Na faixa navegável quem manda é a proporcionalidade.
 */
export const VOO_MIN_PC_POR_S = 1e-9;

/** Piso da roda do mouse FORA do domínio profundo, verbatim de antes. */
export const RODA_MIN_PC_POR_S = 0.01;

/**
 * VELOCIDADE DE ENTRADA DO VOO LIVRE, PIECEWISE PELO LIMIAR DO DOMÍNIO
 * PROFUNDO (decisão D6 da Onda 4). Puro e exportado para o oráculo.
 *
 * ACIMA de `DEEP_LIMIAR_PC`, a fórmula de sempre, verbatim: 2% da
 * distância de casa, entre 2 e 600 pc/s. ABAIXO, o PISO DE 2 pc/s SAI —
 * ele é o que tornava o mergulho inavegável: 2 pc/s são 412.500 UA/s,
 * ou seja o sistema solar inteiro atravessado em menos de 1 ms, e
 * nenhum toque de tecla conseguiria parar dentro dele. Sobra a mesma
 * proporcionalidade de sempre (2% da distância: a 150 UA são 3 UA/s),
 * que é o que dá ao mergulho a escala do lugar.
 *
 * O DEGRAU NA FRONTEIRA, declarado: em 0,05 pc a velocidade de entrada
 * cai de 2 pc/s (o piso) para 0,001 pc/s (a proporção) — 2.000× de uma
 * vez. Ninguém sente isso como solavanco porque esta função NÃO roda por
 * quadro: ela é lida ao ENTRAR no voo livre (`syncFromCamera`, e o
 * deep-link `?pos=` que passa por ela), e daí em diante quem manda é a
 * roda do mouse. E o degrau é do PISO, não da lei: abaixo do limiar a
 * regra "2% da distância por segundo" passa a valer sem interrupção, que
 * é justamente o que o piso de 2 pc/s quebrava lá dentro.
 */
export function velocidadeDeVoo(dPc: number): number {
  if (dPc >= DEEP_LIMIAR_PC) return THREE.MathUtils.clamp(dPc * 0.02, 2, 600);
  return Math.max(dPc * 0.02, VOO_MIN_PC_POR_S);
}

/**
 * O OUTRO grampo de velocidade: a roda do mouse MULTIPLICA a velocidade
 * corrente e reclampa. Sem tratar este piso junto, a D6 seria letra
 * morta na prática — a roda devolveria a 0,01 pc/s (2.063 UA/s) tudo o
 * que o piecewise de `velocidadeDeVoo` tivesse acabado de dar. O teto de
 * 4.000 pc/s não muda: o piloto continua podendo acelerar até ver a
 * galáxia de fora, de onde quer que esteja.
 */
export function pisoDaRoda(dPc: number): number {
  return dPc >= DEEP_LIMIAR_PC ? RODA_MIN_PC_POR_S : VOO_MIN_PC_POR_S;
}

// ---- CAPTURA DE PONTEIRO (Onda 5, F5) ------------------------------
// O voo em 1ª pessoa com o cursor SOLTO tem um teto: o olhar acaba na
// borda da janela e o arrasto precisa recomeçar. A captura tira esse
// teto — e é OPT-IN, sempre: quem decide é o visitante, num botão que
// a dica de voo hospeda, e o Esc devolve o ponteiro a qualquer momento
// (isso é do navegador, não nosso — nenhum código daqui pede a captura
// de volta sozinho).
//
// As QUATRO DEFESAS, que são o motivo de isto ser mais que uma linha:
//  1. BACKOFF: `pointerlockerror` três vezes seguidas e a captura para
//     de se oferecer. Sem isso, um navegador que nega (política de
//     permissão, sandbox, aba sem gesto do usuário) receberia um pedido
//     por clique para sempre, e o visitante veria um botão que não faz
//     nada.
//  2. DISPOSE: os listeners saem no `dispose` do rig — que é o que o
//     HMR do vite chama a cada salvamento. Sem isso, um dia de trabalho
//     deixa dezenas de listeners de `pointerlockchange` vivos, todos
//     mexendo na câmera de sessões mortas.
//  3. SOLTAR AS TECLAS NO UNLOCK: quando o lock cai (Esc, alt-tab, aba
//     perdendo o foco) o `keyup` das teclas seguradas NÃO chega. Sem
//     limpar o conjunto, a nave sai voando sozinha e nada a para.
//  4. LISTENER DE MOVIMENTO SÓ COM O LOCK: o `mousemove` de olhar entra
//     ao trancar e sai ao soltar. Deixá-lo pendurado somaria `movementX`
//     de cursor solto ao yaw — o olhar giraria sem ninguém arrastar.

/** Negativas seguidas do navegador até a captura parar de se oferecer. */
export const ERROS_ATE_DESISTIR = 3;

/**
 * O ESTADO da captura, e SÓ o estado — sem DOM nenhum. Existe separado
 * do fio que fala com o navegador porque é aqui que mora a regra que o
 * gate cobra (o backoff), e o vitest da casa roda em `node`: um estado
 * que só se conferisse com um `document` na mesa não seria conferido.
 */
export class EstadoDaCaptura {
  /** negativas seguidas; um lock bem-sucedido zera a conta */
  erros = 0;
  ativa = false;

  /** o navegador negou vezes demais — não se pede mais nesta sessão */
  get desistiu(): boolean {
    return this.erros >= ERROS_ATE_DESISTIR;
  }

  /** vale a pena pedir? (já capturado, ou já desistido, não vale) */
  get podePedir(): boolean {
    return !this.ativa && !this.desistiu;
  }

  errou() {
    this.erros++;
  }

  trancou() {
    this.ativa = true;
    this.erros = 0;
  }

  soltou() {
    this.ativa = false;
  }
}

/**
 * O FIO entre o estado acima e o navegador. Quem oferece a captura é o
 * HUD (`Director.capturaDePonteiro`); quem sofre as consequências dela
 * é o rig, e por isso ela nasce dentro dele: as teclas que a defesa 3
 * solta são as do `FreeRoam`.
 */
export class CapturaDePonteiro {
  readonly estado = new EstadoDaCaptura();
  private alvo: HTMLCanvasElement;
  private aoMover: (dx: number, dy: number) => void;
  private aoSoltar: () => void;

  constructor(
    alvo: HTMLCanvasElement,
    aoMover: (dx: number, dy: number) => void,
    aoSoltar: () => void
  ) {
    this.alvo = alvo;
    this.aoMover = aoMover;
    this.aoSoltar = aoSoltar;
    document.addEventListener('pointerlockchange', this.aoTrocar);
    document.addEventListener('pointerlockerror', this.aoErrar);
  }

  get ativa(): boolean {
    return this.estado.ativa;
  }

  get desistiu(): boolean {
    return this.estado.desistiu;
  }

  /** o opt-in: só daqui sai um pedido de captura */
  pedir() {
    if (!this.estado.podePedir) return;
    // a versão nova de `requestPointerLock` devolve Promise e a antiga
    // devolve void; a rejeição vem acompanhada do evento `pointerlockerror`,
    // que é quem conta — aqui só se evita o "unhandled rejection"
    const pedido: unknown = this.alvo.requestPointerLock();
    if (pedido instanceof Promise) pedido.catch(() => undefined);
  }

  /** devolve o ponteiro (o Esc do navegador faz o mesmo caminho) */
  soltar() {
    if (document.pointerLockElement === this.alvo) document.exitPointerLock();
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this.aoTrocar);
    document.removeEventListener('pointerlockerror', this.aoErrar);
    window.removeEventListener('mousemove', this.aoMoverTravado);
    this.soltar();
    this.estado.soltou();
  }

  private aoTrocar = () => {
    if (document.pointerLockElement === this.alvo) {
      this.estado.trancou();
      window.addEventListener('mousemove', this.aoMoverTravado);
      return;
    }
    this.estado.soltou();
    window.removeEventListener('mousemove', this.aoMoverTravado);
    this.aoSoltar();
  };

  private aoErrar = () => {
    this.estado.errou();
  };

  private aoMoverTravado = (event: MouseEvent) => {
    this.aoMover(event.movementX, event.movementY);
  };
}

export class FreeRoam {
  /** o fio da captura de ponteiro; o HUD pede por `Director` */
  readonly captura: CapturaDePonteiro;
  private ligado = false;
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

  /**
   * O ESCRITOR DE CÂMERA está com este rig? Quem escreve é o `setPhase`
   * do Director (mapa `ESCRITOR_DE_CAMERA`). Virou acessor na F5 por
   * uma razão só: sair do voo livre com o ponteiro CAPTURADO deixaria o
   * visitante sem cursor numa fase que não tem para onde apontá-lo. A
   * captura é do voo — e morre com ele.
   */
  get enabled(): boolean {
    return this.ligado;
  }

  set enabled(valor: boolean) {
    this.ligado = valor;
    if (!valor) this.captura.soltar();
  }

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
    this.canvas = canvas;
    this.camera = camera;
    this.captura = new CapturaDePonteiro(
      canvas,
      // com o ponteiro capturado TODO movimento é intenção: não há
      // arrasto a distinguir de repouso, e por isso a visita em curso
      // cede no primeiro pixel em vez de esperar os 8 do arrasto
      (dx, dy) => {
        if (!this.enabled) return;
        if (this.visit) this.cancelVisit();
        this.girar(dx, dy);
      },
      // defesa 3: o `keyup` das teclas seguradas não chega quando o
      // lock cai — sem isto a nave sai voando sozinha
      () => this.keys.clear()
    );
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
    // velocidade inicial proporcional à escala do lugar (piecewise pelo
    // limiar do domínio profundo desde a Onda 4 — ver `velocidadeDeVoo`)
    this.speed = velocidadeDeVoo(this.camera.position.length());
    this.resetMotion();
  }

  /** deep-links ?pos=: orientação canônica JÁ no frame 1 — o slerp de
   *  entrada sob captura com virtual time congelava no meio do caminho
   *  (faixa diagonal ~38° nas faces do céu) */
  snapCanonical() {
    this.blend = 0;
  }

  /**
   * Há movimento EM CURSO: visita a caminho, slerp de entrada dissolvendo
   * ou inércia residual/tecla pressionada. Somente leitura — quem pergunta
   * é o sinal de prontidão para captura (`Director.captura`), que não pode
   * declarar cena estável enquanto a câmera ainda anda. Deep-links `?pos=`
   * caem em `false` desde o primeiro quadro: `snapCanonical` zera o blend e
   * `resetMotion` zera velocidade e teclas.
   */
  get animando(): boolean {
    return (
      this.enabled &&
      (this.visit !== null ||
        this.blend > 0.001 ||
        this.vel.lengthSq() > 1e-12 ||
        this.keys.size > 0)
    );
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
    // defesa 2: o HMR do vite chama isto a cada salvamento — listener de
    // captura que sobrevive mexe na câmera de uma sessão morta
    this.captura.dispose();
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
      // clique curto e parado = tentativa de visita. Com o ponteiro
      // CAPTURADO o `clientX/Y` congela onde o lock começou e não quer
      // dizer mais nada: a mira passa a ser o centro da tela, que é
      // onde o visitante está olhando.
      if (this.dragMoved < 6 && performance.now() - this.downAt < 400) {
        if (this.captura.ativa) this.onTap?.(0.5, 0.5);
        else {
          this.onTap?.(
            event.clientX / window.innerWidth,
            event.clientY / window.innerHeight
          );
        }
      }
    }
    this.dragging = false;
  };

  /** o giro do olhar em pixels de ponteiro — arrasto e captura entram aqui */
  private girar(dx: number, dy: number) {
    this.yaw -= dx * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0022, -1.5, 1.5);
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.enabled || !this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    if (this.visit && this.dragMoved > 8) this.cancelVisit();
    this.girar(dx, dy);
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  /**
   * Tecla digitada DENTRO de um controle não é comando de voo. O App já
   * tinha esta guarda nos atalhos da janela (Espaço e ←/→ roubavam o
   * slider de exposição); aqui ela faltava, e W/A/S/D digitados na
   * busca da F3 sairiam voando com a nave. Mesma lista de seletores —
   * um contrato, não dois.
   */
  private static ehAlvoDeFormulario(target: EventTarget | null) {
    return Boolean(
      (target as HTMLElement | null)?.closest?.(
        'input, select, textarea, button, [contenteditable]'
      )
    );
  }

  private onKeyDown = (event: KeyboardEvent) => {
    // com o ponteiro capturado NÃO HÁ onde digitar: o foco pode ter
    // ficado no botão que ofereceu a captura, e a guarda de formulário
    // engoliria justamente o WASD que o visitante acabou de destravar
    if (!this.captura.ativa && FreeRoam.ehAlvoDeFormulario(event.target)) return;
    if (this.visit) this.cancelVisit();
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.enabled) return;
    // até 4.000 pc/s — dá para voar da vizinhança até ver a galáxia; o
    // piso é que depende do lugar (`pisoDaRoda`, D6): 0,01 pc/s fora do
    // domínio profundo, como sempre, e proporcional dentro dele
    this.speed = THREE.MathUtils.clamp(
      this.speed * (event.deltaY > 0 ? 0.85 : 1.18),
      pisoDaRoda(this.camera.position.length()),
      4000
    );
  };
}
