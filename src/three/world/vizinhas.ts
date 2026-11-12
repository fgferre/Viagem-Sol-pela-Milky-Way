// ============================================================
// AS GALÁXIAS VIZINHAS NA CENA (pilar 3, 12/11/2026): um `THREE.Points`
// por galáxia, posto no centro dela (a translação de 761 kpc vai na
// matriz do objeto, em float64, e não no float32 das partículas). O
// modelo e o sorteio moram em `geradorDasVizinhas.ts`; o desenho, em
// `shaders/vizinhasShaders.ts`. A Via Láctea não é tocada.
// ============================================================
import * as THREE from 'three';
import { GALAXY_FRAG } from '../shaders/galaxyShaders';
import { VIZINHAS_VERT } from '../shaders/vizinhasShaders';
import { dentroDoDisco } from './baseGalactica';
import type { VizinhaSorteada } from './geradorDasVizinhas';

/**
 * A RÉGUA DA LUZ: quanto do alfa·tamanho² das partículas da Via Láctea
 * corresponde a uma luminosidade solar em V. As vizinhas carregam a
 * luminosidade MEDIDA delas (L☉), e este número a leva à mesma escala
 * de brilho das partículas da nossa galáxia — assim o brilho de
 * superfície de cada uma, visto de qualquer lugar, é o físico, na
 * mesma régua da faixa. Calibração: ver o comentário de `calibrar`.
 */
export const SOMA_DA_VIA_LACTEA = 2.2694e7; // Σ alfa·tam²·Y das 4,02 M partículas do cinema (medido no gerador, 12/11)
export const L_V_DA_VIA_LACTEA = 1.95e10; // M_V ≈ −20,9 (de memória; Licquia & Newman 2015 dão a massa)
/**
 * ×3 = a ÂNCORA NA FAIXA. Só as partículas não fazem a faixa vista de
 * dentro: ela leva também o termo estelar da nebulosa (a LUT da faixa) e
 * só 0,76 das partículas. Medido do Sol, quadro com Carina e a GNM (12/11):
 * com ×1 a barra da GNM saía 0,6 da faixa de Carina em excesso de pixel;
 * a literatura dá a barra ~1,5× a faixa ali (μ_V ≈ 20,8 contra ≈ 21,3
 * mag/″², de memória), e ×3 a leva lá. O mesmo número vale para todas.
 */
export const LUZ_DA_VIA_LACTEA_POR_SOL = (3 * SOMA_DA_VIA_LACTEA) / L_V_DA_VIA_LACTEA;

/** o sorteio no trabalhador próprio (`vizinhasEmWorker.ts`), na thread se
 *  ele não subir — a mesma `gerarVizinhas` dos dois lados */
export function sortearVizinhas(escala: number): Promise<VizinhaSorteada[]> {
  return new Promise((resolve) => {
    const inline = () => {
      void import('./geradorDasVizinhas').then(({ gerarVizinhas }) => resolve(gerarVizinhas(escala)));
    };
    let worker: Worker;
    try {
      worker = new Worker(new URL('./vizinhasEmWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      inline();
      return;
    }
    worker.onmessage = (e: MessageEvent<VizinhaSorteada[]>) => {
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = () => {
      worker.terminate();
      inline();
    };
    worker.postMessage(escala);
  });
}

interface Desenho {
  pontos: THREE.Points;
  material: THREE.ShaderMaterial;
  avPrimeiroPlano: number;
  n: number;
}

export class GalaxiasVizinhas {
  readonly group = new THREE.Group();
  private readonly desenhos: Desenho[] = [];
  private readonly texturas: THREE.DataTexture[] = [];
  private fracao = 1;
  private static readonly semPoeira = (() => {
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    t.needsUpdate = true;
    return t;
  })();
  private readonly _cam = new THREE.Vector3();

  constructor(vizinhas: readonly VizinhaSorteada[]) {
    this.group.name = 'galaxias-vizinhas';
    for (const v of vizinhas) {
      const geo = new THREE.BufferGeometry();
      const buf = new THREE.InterleavedBuffer(v.pontos, 8);
      geo.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 3, 0));
      geo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(buf, 3, 3));
      geo.setAttribute('aSize', new THREE.InterleavedBufferAttribute(buf, 1, 6));
      geo.setAttribute('aAlpha', new THREE.InterleavedBufferAttribute(buf, 1, 7));
      let tau: THREE.Texture = GalaxiasVizinhas.semPoeira;
      if (v.poeira) {
        const rgba = new Uint8Array(v.poeira.lado * v.poeira.lado * 4);
        for (let k = 0; k < v.poeira.tau.length; k++) rgba[k * 4] = v.poeira.tau[k];
        const t = new THREE.DataTexture(rgba, v.poeira.lado, v.poeira.lado);
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.needsUpdate = true;
        this.texturas.push(t);
        tau = t;
      }
      const p = v.poeira;
      const material = new THREE.ShaderMaterial({
        vertexShader: VIZINHAS_VERT,
        fragmentShader: GALAXY_FRAG,
        uniforms: {
          uCamLocal: { value: new THREE.Vector3() },
          uScreenH: { value: 1080 },
          uTanHalfFov: { value: 0.55 },
          uGanho: { value: LUZ_DA_VIA_LACTEA_POR_SOL },
          uTauFg: { value: 0 },
          uTau: { value: tau },
          uTauMax: { value: p ? p.tauMax : 0 },
          uMeia: { value: p ? p.meia : 1 },
          uSigma: { value: p ? p.sigmaPc : 1 },
          uEu: { value: new THREE.Vector3(...(p?.eu ?? [1, 0, 0])) },
          uEv: { value: new THREE.Vector3(...(p?.ev ?? [0, 1, 0])) },
          uEn: { value: new THREE.Vector3(...(p?.en ?? [0, 0, 1])) },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      });
      const pontos = new THREE.Points(geo, material);
      pontos.position.set(...v.centro);
      pontos.frustumCulled = false;
      // depois das partículas da Via Láctea (2): é soma, a ordem só
      // decide quem lê o mesmo depth — e ninguém escreve depth aqui
      pontos.renderOrder = 2;
      pontos.name = v.id;
      this.group.add(pontos);
      this.desenhos.push({ pontos, material, avPrimeiroPlano: v.avPrimeiroPlano, n: v.n });
    }
  }

  /** a fração desenhada (o prefixo embaralhado), com a luz compensada —
   *  o mesmo contrato do ajuste de partículas da Via Láctea */
  setFracao(f: number) {
    const nova = THREE.MathUtils.clamp(f, 0.05, 1);
    if (nova === this.fracao) return;
    this.fracao = nova;
    for (const d of this.desenhos) d.pontos.geometry.setDrawRange(0, Math.round(d.n * this.fracao));
  }

  update(camPos: THREE.Vector3, screenH: number, tanHalfFov: number, visivel: boolean) {
    this.group.visible = visivel;
    if (!visivel) return;
    // O PRIMEIRO PLANO: de dentro do disco a luz delas atravessa a nossa
    // poeira (A_V medido do Sol); de fora dele, não
    const dentro = dentroDoDisco(camPos);
    for (const d of this.desenhos) {
      const u = d.material.uniforms;
      this._cam.copy(camPos).sub(d.pontos.position);
      (u.uCamLocal.value as THREE.Vector3).copy(this._cam);
      u.uScreenH.value = screenH;
      u.uTanHalfFov.value = tanHalfFov;
      u.uGanho.value = LUZ_DA_VIA_LACTEA_POR_SOL / this.fracao;
      u.uTauFg.value = (d.avPrimeiroPlano / 1.086) * dentro;
    }
  }

  dispose() {
    for (const d of this.desenhos) {
      d.pontos.geometry.dispose();
      d.material.dispose();
    }
    for (const t of this.texturas) t.dispose();
  }
}
