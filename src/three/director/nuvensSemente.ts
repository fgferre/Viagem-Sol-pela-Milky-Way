// ============================================================
// As NUVENS-SEMENTE do raymarch — o catálogo CO/complexos em coords de
// cena e a seleção das ≤32 mais próximas da câmera, na cadência de
// 0,25 s. Morava no director.ts (onda da arquitetura, Parte 1, corte
// 1); a semântica é a mesma, linha a linha. A nebulosa entra por
// parâmetro — módulo de director/ nunca importa o director.
// ============================================================
import * as THREE from 'three';
import { galactocentricToScene } from '../world/baseGalactica';
import type { Nebula } from '../world/nebula';

export class NuvensSemente {
  private pool: Float32Array | null = null;
  private readonly scratch = new Float32Array(32 * 5);
  /** scratch das ≤256 sementes do bake — ver `sementesParaBake` */
  private readonly scratchBake = new Float32Array(256 * 5);
  private timer = 0;
  /**
   * meia-aresta do volume assado (Nebula.MEIA_ARESTA) + margem por nuvem
   * (3× o raio — cobre a metaball inteira, d2c < 5.5 ⇒ |p−c| < √5.5·r
   * ≈ 2.35·r, com folga): o alcance de `sementesParaBake` por nuvem.
   */
  private static readonly ALCANCE_BASE = 1000;

  /**
   * Nuvens CO/complexos em coords de cena para semear o raymarch. Guarda
   * o pool CRU (amplitudes SEM o fade de proximidade que `atualizar()`
   * aplica depois) e liga o pedido de sementes do bake (REDESIGN,
   * PLAN.md 05/09): a Nebula passa o CENTRO do volume, nunca a câmera
   * direto, e `sementesParaBake` devolve as ≤256 mais perto dele.
   */
  construir(
    galactic: {
      molecularClouds: { data: Float32Array; count: number; stride: number };
      largeMolecularClouds: { data: Float32Array; count: number; stride: number };
    },
    nebula: Nebula
  ) {
    const out: number[] = [];
    const scratch = new THREE.Vector3();
    {
      const { data, count, stride } = galactic.molecularClouds;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        if (data[o + 10] < 0.5) continue;
        const surface = data[o + 5];
        const amp = (surface / (surface + 130)) * 2.0;
        if (amp < 0.08) continue;
        galactocentricToScene(data[o], data[o + 1], data[o + 2], scratch);
        out.push(scratch.x, scratch.y, scratch.z, Math.max(data[o + 3] * 1.6, 14), amp);
      }
    }
    {
      const { data, count, stride } = galactic.largeMolecularClouds;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        const density = data[o + 4];
        galactocentricToScene(data[o], data[o + 1], data[o + 2], scratch);
        out.push(
          scratch.x, scratch.y, scratch.z,
          Math.max(data[o + 3] * 1.2, 60),
          (density / (density + 116)) * 1.6
        );
      }
    }
    this.pool = new Float32Array(out);
    nebula.setPedirSementes((centro) => this.sementesParaBake(centro, nebula));
    // o pool acabou de nascer: o centro do volume (se já houver um) não
    // mudou, então `foraDaMargem` não pegaria isso sozinho — força o
    // primeiro bake com sementes de verdade.
    nebula.marcarVolumeSujo();
  }

  /**
   * REDESIGN (PLAN.md, 05/09) — as ≤256 nuvens do pool mais perto do
   * CENTRO do volume assado (não da câmera: o cubo pode estar até 350 pc
   * à frente dela). Sem fade de fronteira — a textura de sementes não
   * tem limite de 32 nem precisa esconder popping, porque reassar já é
   * o evento discreto. Chamada de dentro de `Nebula.bake()`, pelo
   * callback ligado em `construir()`.
   */
  private sementesParaBake(centro: THREE.Vector3, nebula: Nebula) {
    const pool = this.pool;
    if (!pool) return;
    const candidatos: Array<{ d: number; o: number }> = [];
    for (let o = 0; o < pool.length; o += 5) {
      const dx = pool[o] - centro.x;
      const dy = pool[o + 1] - centro.y;
      const dz = pool[o + 2] - centro.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const alcance = NuvensSemente.ALCANCE_BASE + 3 * pool[o + 3];
      if (d > alcance) continue;
      candidatos.push({ d, o });
    }
    candidatos.sort((a, b) => a.d - b.d);
    const n = Math.min(candidatos.length, 256);
    const saida = this.scratchBake;
    for (let i = 0; i < n; i++) {
      const o = candidatos[i].o;
      const t = i * 5;
      saida[t] = pool[o];
      saida[t + 1] = pool[o + 1];
      saida[t + 2] = pool[o + 2];
      saida[t + 3] = pool[o + 3];
      saida[t + 4] = pool[o + 4]; // amplitude crua, sem fade
    }
    nebula.setBakeSeedClouds(saida, n);
  }

  /** seleciona as ≤32 nuvens do catálogo mais próximas da câmera */
  atualizar(camPos: THREE.Vector3, nebula: Nebula) {
    const pool = this.pool;
    if (!pool) return;
    const reach = 900; // pc — alcance do raymarch + margem
    // rank pela distância à SUPERFÍCIE: um complexo que envolve a
    // câmera nunca é expulso por nuvens pequenas próximas
    const nearest: Array<{ sd: number; o: number }> = [];
    for (let o = 0; o < pool.length; o += 5) {
      const dx = pool[o] - camPos.x;
      const dy = pool[o + 1] - camPos.y;
      const dz = pool[o + 2] - camPos.z;
      const sd = Math.max(
        0,
        Math.sqrt(dx * dx + dy * dy + dz * dz) - pool[o + 3]
      );
      if (sd > reach) continue;
      nearest.push({ sd, o });
    }
    nearest.sort((a, b) => a.sd - b.sd);
    const n = Math.min(nearest.length, 32);
    // amplitude → 0 na fronteira de seleção: nuvens entram e saem do
    // conjunto invisíveis — sem popping a cada refresh de 0,25 s
    const cut = Math.max(nearest.length > 32 ? nearest[32].sd : reach, 1);
    for (let i = 0; i < n; i++) {
      const o = nearest[i].o;
      const t = i * 5;
      const edge = 1 - THREE.MathUtils.smoothstep(nearest[i].sd, cut * 0.8, cut);
      this.scratch[t] = pool[o];
      this.scratch[t + 1] = pool[o + 1];
      this.scratch[t + 2] = pool[o + 2];
      this.scratch[t + 3] = pool[o + 3];
      this.scratch[t + 4] = pool[o + 4] * edge;
    }
    nebula.setSeedClouds(this.scratch, n);
  }

  /** o gesto do placeCamera: o primeiro frame já renderiza com as
   *  nuvens-semente do lugar — capturas ?pos= são determinísticas
   *  desde o frame 1 */
  zerar(camPos: THREE.Vector3, nebula: Nebula) {
    this.atualizar(camPos, nebula);
    this.timer = 0;
  }

  /** a cadência do tick: 0,25 s entre varreduras do pool */
  tique(dt: number, nebulaFade: number, camPos: THREE.Vector3, nebula: Nebula) {
    this.timer += dt;
    if (this.timer > 0.25) {
      this.timer = 0;
      // o MESMO 0,02 do gate do raymarch lá embaixo: abaixo dele o
      // `nebula.render` não roda, e varrer o pool de nuvens-semente
      // alimentava um shader que ninguém ia executar
      if (nebulaFade > 0.02) this.atualizar(camPos, nebula);
    }
  }
}
