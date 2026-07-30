// ============================================================
// A Viagem — keyframes ancorados em estrelas reais do HYG.
// Ato I/II: Sol → Sirius → Bellatrix → Betelgeuse → Órion → Rigel
// → mirante a ~370 pc olhando de volta para o Sol.
// Ato III: subida de ~20.000 pc acima do plano galáctico, até a
// Via Láctea inteira caber na tela — com o Sol marcado nela.
// ============================================================
import * as THREE from 'three';

export interface Keyframe {
  t: number; // segundos
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
  caption: string;
  sub?: string;
}

// Posições (pc) usam as coordenadas reais do catálogo:
// Sirius (-0.49, 2.48, -0.76) · Bellatrix (11.66, 76.04, 8.56)
// Betelgeuse (3.19, 151.36, 19.68) · Rigel (51.60, 256.71, -37.74)
export const KEYFRAMES: Keyframe[] = [
  { t: 0, pos: [0.045, 0.024, 0.105], look: [0, 0, 0], fov: 58, caption: 'SOL', sub: 'anã amarela G2V · a nossa estrela' },
  { t: 11, pos: [0.12, 0.07, 0.18], look: [0, 0, 0], fov: 57, caption: 'SOL', sub: 'fotosfera · 5.500 °C' },
  { t: 20, pos: [0.55, 0.85, -0.25], look: [-0.494, 2.477, -0.758], fov: 58, caption: 'PARTIDA', sub: 'deixando o sistema solar' },
  { t: 30, pos: [0.05, 2.9, -0.3], look: [-0.494, 2.477, -0.758], fov: 60, caption: 'SIRIUS', sub: '2,6 pc · a mais brilhante do céu noturno' },
  { t: 42, pos: [3.5, 12, -1.2], look: [11.659, 76.036, 8.56], fov: 64, caption: 'MAR DE GÁS', sub: 'o meio interestelar' },
  { t: 52, pos: [9, 38, 2.5], look: [11.659, 76.036, 8.56], fov: 70, caption: 'MERGULHO', sub: 'nuvens moleculares · 40 pc' },
  { t: 63, pos: [11.4, 72, 7.6], look: [11.659, 76.036, 8.56], fov: 62, caption: 'BELLATRIX', sub: '77 pc · gigante azul' },
  { t: 74, pos: [8, 115, 13], look: [3.189, 151.364, 19.682], fov: 68, caption: 'VÉUS DA VIA LÁCTEA', sub: 'poeira e gás entre as estrelas' },
  { t: 85, pos: [3.3, 150.0, 19.5], look: [3.189, 151.364, 19.682], fov: 60, caption: 'BETELGEUSE', sub: '152 pc · supergigante vermelha' },
  { t: 95, pos: [24, 205, -1], look: [51.601, 256.71, -37.74], fov: 70, caption: 'CINTURÃO DE ÓRION', sub: '210 pc' },
  { t: 106, pos: [47, 250, -28], look: [51.601, 256.71, -37.74], fov: 62, caption: 'RIGEL', sub: '264 pc · supergigante azul' },
  { t: 120, pos: [85, 330, -52], look: [0, 0, 0], fov: 55, caption: 'CASA', sub: 'o Sol agora é só mais um ponto de luz' },
  // ---- Ato III — a subida e a galáxia inteira ----
  // Centro galáctico real na cena: (-442, -7117, -3946) pc
  { t: 134, pos: [-350, 260, 220], look: [0, 0, 0], fov: 58, caption: 'DE SUBIDA', sub: 'deixando o plano galáctico' },
  { t: 146, pos: [-2600, 1100, 1500], look: [0, 0, 0], fov: 58, caption: 'O SOL JÁ É UM PONTO ENTRE MILHARES', sub: '3.200 parsecs de casa' },
  { t: 158, pos: [10635, -17972, 14392], look: [-442, -7117, -3946], fov: 58, caption: 'A VIA LÁCTEA', sub: 'um disco fino, curvo e vivo' },
  { t: 170, pos: [-25573, -13060, 15832], look: [-442, -7117, -3946], fov: 57, caption: 'NOSSA GALÁXIA', sub: 'quatro grandes braços · um esporão chamado casa' },
  { t: 182, pos: [-11429, -7864, 29651], look: [-442, -7117, -3946], fov: 55, caption: 'CASA', sub: 'o Sol, na borda interna do braço Local' },
];

export const JOURNEY_DURATION = 194;

export interface JourneySample {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  speed: number; // pc/s
  warp: number; // 0..1 para pós-processamento
}

function smootherstep(x: number): number {
  x = THREE.MathUtils.clamp(x, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export class Journey {
  readonly duration = JOURNEY_DURATION;
  private posCurve: THREE.CatmullRomCurve3;
  private lookCurve: THREE.CatmullRomCurve3;
  private keys = KEYFRAMES;

  constructor() {
    this.posCurve = new THREE.CatmullRomCurve3(
      this.keys.map((k) => new THREE.Vector3(...k.pos)),
      false,
      'centripetal',
      0.5
    );
    this.lookCurve = new THREE.CatmullRomCurve3(
      this.keys.map((k) => new THREE.Vector3(...k.look)),
      false,
      'centripetal',
      0.5
    );
  }

  /** tempo → parâmetro da curva, com eases cinematográficos por trecho */
  private timeToU(t: number): { u: number; fov: number; segSpeed: number } {
    const n = this.keys.length;
    const last = this.keys[n - 1];
    if (t >= last.t) {
      return { u: 1, fov: last.fov, segSpeed: 0 };
    }
    let i = 0;
    while (i < n - 2 && t >= this.keys[i + 1].t) i++;
    const k0 = this.keys[i];
    const k1 = this.keys[i + 1];
    const raw = THREE.MathUtils.clamp((t - k0.t) / (k1.t - k0.t), 0, 1);
    const s = smootherstep(raw);
    const u0 = i / (n - 1);
    const u1 = (i + 1) / (n - 1);
    // derivada do ease → velocidade instantânea relativa do trecho
    const dEase = 30 * raw * raw * (raw - 1) * (raw - 1);
    return {
      u: THREE.MathUtils.lerp(u0, u1, s),
      fov: THREE.MathUtils.lerp(k0.fov, k1.fov, s),
      segSpeed: Math.max(dEase / (k1.t - k0.t), 0),
    };
  }

  at(t: number): JourneySample {
    const { u, fov, segSpeed } = this.timeToU(t);
    const pos = this.posCurve.getPoint(u);
    const look = this.lookCurve.getPoint(u);

    // velocidade real aproximada: |dpos/du| × du/dt
    const eps = 0.0008;
    const p2 = this.posCurve.getPoint(Math.min(u + eps, 1));
    const dPosDu = p2.distanceTo(pos) / eps;
    const n = this.keys.length;
    const speed = dPosDu * (segSpeed / (n - 1));

    return {
      pos,
      look,
      fov,
      speed,
      warp: Math.pow(THREE.MathUtils.clamp(speed / 6.5, 0, 1), 1.35),
    };
  }

  captionAt(t: number): { index: number; key: Keyframe } {
    let i = 0;
    for (let k = 0; k < this.keys.length; k++) {
      if (t >= this.keys[k].t) i = k;
    }
    return { index: i, key: this.keys[i] };
  }

  get tickTimes(): number[] {
    return this.keys.map((k) => k.t / this.duration);
  }
}
