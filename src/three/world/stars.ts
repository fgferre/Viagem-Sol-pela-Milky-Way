// ============================================================
// Campo estelar — pontos GPU com magnitude, cor B-V e extinção.
// Serve tanto para o catálogo HYG quanto para o halo procedural.
// ============================================================
import * as THREE from 'three';
import { STAR_VERT, STAR_FRAG, BETA_DA_EMISSAO } from '../shaders/starShaders';
import type { StarArrays } from '../config';
import { FOCUS_OFF, clearFocus, needsAttributeWrite } from './lodStellar';
import { EXPO_M0, SIGMA_PX } from '../luzDaCasa';

/**
 * Teto de faixas pendentes por atributo antes de cair para UPLOAD CHEIO
 * (conserto da revisão de olhos frescos, fase 4b da Onda 3 — ver o
 * comentário do latch em `marcarUpload`). 64 é folgado: hoje ninguém
 * escreve por quadro (o canal de foco é dormente até o M3/E3), e só uma
 * sequência de quadros cujo upload NUNCA acontece chegaria perto disto.
 */
export const UPDATE_RANGE_CAP = 64;

interface StarFieldOptions {
  /** magnitude aparente que satura o pico da PSF — o "tempo de exposição" */
  expoM0?: number;
  /** largura da PSF em px a 1080p — o "instrumento" */
  sigmaPx?: number;
  tau?: number; // coeficiente de extinção
}

/**
 * A ordem das duas passadas do campo — item 37. O quad multiplicativo
 * das nuvens moleculares (`observedClouds.ts`) desenha em 5 e cai sobre
 * o framebuffer INTEIRO, porque nenhuma camada aditiva escreve
 * profundidade. Quem tem nuvem viva entre si e o Sol desenha ANTES dele
 * e continua extinto — essa extinção é a certa. Quem não tem desenha
 * DEPOIS: nenhuma nuvem da visada pode apagá-lo.
 */
const ORDEM_ATRAS_DAS_NUVENS = 2;
const ORDEM_NA_FRENTE_DAS_NUVENS = 6;

export class StarField {
  /** a passada de quem tem nuvem na frente — a ordem de sempre */
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  /** a passada de quem está na frente de todas as nuvens da visada */
  readonly pontosNaFrente: THREE.Points;
  private readonly materialNaFrente: THREE.ShaderMaterial;
  private readonly naFrenteArray: Float32Array;
  private readonly naFrenteAttr: THREE.BufferAttribute;
  /** quantas estrelas a segunda passada desenha (0 = céu não classificado) */
  private naFrente = 0;
  /** `uExpoM0` e `uSigmaPx` publicados: quem precisa prever o pixel do
   *  campo (a repartição do Sol no director, o clarão de asas) lê DAQUI
   *  — redigitar 3,5/0,85 no consumidor seria comprar a divergência que
   *  a fase 2 da Onda 3 desfez nas rampas do Sol.
   *
   *  CONSTANTE de novo desde o M2: a pupila morreu inteira (LEI §7), e
   *  com ela o deslocamento por quadro. O "tempo de exposição" da casa
   *  é fixo — a compressão fixa na emissão é quem doma o alto. */
  readonly expoM0: number;
  readonly sigmaPx: number;

  // O canal `aFocus` (Onda 3; M2 matou o irmão `aFade` junto com a
  // política de dominância). Float32Array(n): 1,3 MB de RAM/GPU em
  // 328.749 estrelas, ZERO byte de payload — buffer de RUNTIME, não
  // dado de catálogo. DORMENTE POR DESENHO (item 38): a escrita vive
  // aqui, a leitura volta ao shader no M3/E3 — é o canal por onde a
  // esfera analítica apaga o ponto da estrela que ganha corpo.
  private readonly focusArray: Float32Array;
  private readonly focusAttr: THREE.BufferAttribute;
  /** latch de upload cheio — ver `marcarUpload` */
  private focusCheio = false;

  constructor(data: StarArrays, opts: StarFieldOptions = {}) {
    const geo = new THREE.BufferGeometry();
    // logLum é a LUMINOSIDADE (0,4·(4,85 − M_V)); a magnitude aparente
    // NÃO viaja no atributo porque o vertex a recalcula da posição da
    // câmera — foi assim que "aproximar-se de uma estrela" passou a
    // significar alguma coisa. (O erro antigo era usar a magnitude vista
    // do Sol como brilho intrínseco: a distância entrava duas vezes e o
    // catálogo saía com 10 mag de erro relativo entre Sirius e Rigel.)
    // O decodificador em config.ts já entrega os três atributos prontos.
    geo.setAttribute('position', new THREE.BufferAttribute(data.position, 3));
    geo.setAttribute('aLogLum', new THREE.BufferAttribute(data.logLum, 1));
    geo.setAttribute('aCi', new THREE.BufferAttribute(data.ci, 1));
    // nasce ZERADO = neutro (D3): o canal dormente não move um pixel.
    const n = data.logLum.length;
    this.focusArray = new Float32Array(n);
    this.focusAttr = new THREE.BufferAttribute(this.focusArray, 1);
    geo.setAttribute('aFocus', this.focusAttr);
    // o latch baixa QUANDO A GPU RECEBE o buffer: o three chama este
    // callback no fim de `createBuffer`/`updateBuffer`
    // (WebGLAttributes.js), e é o único sinal honesto de "subiu".
    this.focusAttr.onUpload(() => {
      this.focusCheio = false;
    });
    // NASCE ZERADO = como era antes do item 37: com todas as estrelas do
    // lado de trás, a segunda passada não desenha nada e a primeira é a
    // de sempre, byte a byte. Quem preenche é o Director, DEPOIS de a
    // camada de nuvens existir — e ela pode não existir (`?nocart`,
    // `cartMode: 'off'`, ou o carregamento sem cartografia).
    this.naFrenteArray = new Float32Array(n);
    this.naFrenteAttr = new THREE.BufferAttribute(this.naFrenteArray, 1);
    geo.setAttribute('aNaFrenteDasNuvens', this.naFrenteAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6000);

    this.expoM0 = opts.expoM0 ?? EXPO_M0;
    this.sigmaPx = opts.sigmaPx ?? SIGMA_PX;
    this.material = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uScreenH: { value: 1080 },
        uExpoM0: { value: this.expoM0 },
        uSigmaPx: { value: this.sigmaPx },
        // a compressão na emissão (F2 da luz) — 0 é identidade exata
        uBeta: { value: BETA_DA_EMISSAO },
        uArteDaCruz: { value: 1 },
        uPr2: { value: 1 },
        uTau: { value: opts.tau ?? 0.9 },
        uFade: { value: 1 },
        uCavityPos: { value: new THREE.Vector3() },
        uCavityGate: { value: 0 },
        // 0 = esta passada desenha quem tem nuvem na frente (item 37)
        uLado: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = ORDEM_ATRAS_DAS_NUVENS;

    // A SEGUNDA PASSADA divide a GEOMETRIA — os atributos são os mesmos
    // objetos, então `writeFocus` e o resto continuam com um endereço só.
    // O que ela tem de próprio é o material, por causa de `uLado`; os
    // outros uniforms viajam pelos dois em `update`/`setFade`/`setCavity`.
    this.materialNaFrente = this.material.clone();
    this.materialNaFrente.uniforms.uLado.value = 1;
    this.pontosNaFrente = new THREE.Points(geo, this.materialNaFrente);
    this.pontosNaFrente.frustumCulled = false;
    this.pontosNaFrente.renderOrder = ORDEM_NA_FRENTE_DAS_NUVENS;
    this.pontosNaFrente.visible = false;
  }

  update(camPos: THREE.Vector3, screenH: number, pr2 = 1) {
    for (const u of [this.material.uniforms, this.materialNaFrente.uniforms]) {
      (u.uCamPos.value as THREE.Vector3).copy(camPos);
      u.uScreenH.value = screenH;
      u.uPr2.value = pr2;
    }
  }

  setFade(f: number) {
    this.material.uniforms.uFade.value = f;
    this.materialNaFrente.uniforms.uFade.value = f;
    const aceso = f > 0.001;
    this.points.visible = aceso;
    // a segunda passada só existe depois de o Director classificar o céu
    this.pontosNaFrente.visible = aceso && this.naFrente > 0;
  }

  /**
   * Classifica cada estrela pelo céu das nuvens (item 37) e devolve
   * quantas ficaram NA FRENTE de todas as nuvens da visada. Chamada uma
   * vez, quando a camada de nuvens nasce; sem ela o campo desenha numa
   * passada só, exatamente como antes.
   */
  marcarNuvensNaFrente(temNuvemNaFrente: (x: number, y: number, z: number) => boolean): number {
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const xyz = pos.array as Float32Array;
    let naFrente = 0;
    for (let i = 0; i < this.naFrenteArray.length; i++) {
      const livre = temNuvemNaFrente(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2]) ? 0 : 1;
      this.naFrenteArray[i] = livre;
      naFrente += livre;
    }
    this.naFrenteAttr.needsUpdate = true;
    this.naFrente = naFrente;
    this.pontosNaFrente.visible = this.points.visible && naFrente > 0;
    return naFrente;
  }

  // (O atuador da pupila — `setPupila`, o deslocamento de `expoM0` por
  // quadro — morreu no M2 junto com `core/pupila.ts` inteiro. A técnica
  // de pré-exposição que ele encarnava está preservada na LEI §7; o que
  // a substitui é a compressão fixa, que não tem estado por quadro.)

  // ------------------------------------------------------------
  // Escrita por estrela — o contrato C2/C3 da Onda 3
  // ------------------------------------------------------------
  //
  // C2 — REAFIRMAÇÃO IDEMPOTENTE: a escrita é NO-OP quando o slot já tem
  // o valor (`needsAttributeWrite`, lodStellar), então `needsUpdate` só
  // sobe quando alguma coisa de fato mudou. E quando muda, sobe com
  // `addUpdateRange(index, 1)`: o three faz `bufferSubData` só do slot
  // mexido — 4 bytes no lugar de 1,3 MB.

  /**
   * Como um slot mexido pede a subida — e as DUAS defesas que a revisão
   * de olhos frescos comprou (fase 4b da Onda 3). Devolve o novo estado
   * do latch de upload cheio do canal.
   *
   * (1) TETO. `addUpdateRange` só é consumido (e as faixas só são
   * limpas) DENTRO do `updateBuffer` do three; e o renderer pula objetos
   * com `visible === false`. Com o campo escondido as faixas cresceriam
   * sem teto e o `sort()` do three pegaria todas de uma vez ao
   * reacender. Passado o teto, a política é cair para upload cheio —
   * correto e barato — em vez de guardar lista.
   *
   * (2) LATCH. `updateRanges` vazio + `needsUpdate` é como se pede o
   * buffer INTEIRO. Quem faz isso — `reset()`, ou o teto acima —
   * precisa que as escritas seguintes NÃO recoloquem uma faixa antes do
   * render, senão o three sobe só aquele slot e os outros 328.748 ficam
   * com o valor velho na GPU. Enquanto o latch estiver alto, escreve-se
   * no array e só se levanta o dirty-flag.
   */
  private marcarUpload(attr: THREE.BufferAttribute, cheio: boolean, index: number): boolean {
    if (cheio) {
      attr.needsUpdate = true;
      return true;
    }
    if (attr.updateRanges.length >= UPDATE_RANGE_CAP) {
      attr.clearUpdateRanges();
      attr.needsUpdate = true;
      return true;
    }
    attr.addUpdateRange(index, 1);
    attr.needsUpdate = true;
    return false;
  }

  /** Grava `aFocus` (0 ou 1 — o corte em 0,5 é do consumidor do M3).
   *  `Math.fround` ANTES de decidir: o buffer é float32 e o consumidor
   *  calcula em float64 — comparar sem arredondar mataria a
   *  idempotência em silêncio. Índice fora da faixa é ignorado. */
  writeFocus(index: number, value: number): boolean {
    if (!(index >= 0) || index >= this.focusArray.length) return false;
    const alvo = Math.fround(value);
    if (!needsAttributeWrite(this.focusArray[index], alvo)) return false;
    this.focusArray[index] = alvo;
    this.focusCheio = this.marcarUpload(this.focusAttr, this.focusCheio, index);
    return true;
  }

  /**
   * C3 — o que a estrela que PERDE o foco recebe: foco zerado, para não
   * ficar com bypass pendurado para sempre. O contrato vem de
   * `clearFocus()` (lodStellar), que é onde ele mora.
   */
  clearFocus(index: number): void {
    const { focus } = clearFocus();
    this.writeFocus(index, focus);
  }

  /**
   * Volta o canal INTEIRO ao estado de nascimento. Levanta o latch de
   * upload cheio: uma escrita qualquer entre este `reset` e o render
   * seguinte devolveria o atributo ao modo parcial e a GPU subiria só
   * aquele slot (achado da caçada adversarial, fase 4b).
   */
  reset(): void {
    this.focusArray.fill(FOCUS_OFF);
    this.focusAttr.clearUpdateRanges();
    this.focusAttr.needsUpdate = true;
    this.focusCheio = true;
  }

  /** leitura do canal (oráculos e depuração) */
  focusAt(index: number): number {
    return this.focusArray[index];
  }

  /** mesma cavidade do raymarch — a extinção vê o mesmo gás carvado */
  setCavity(pos: THREE.Vector3, gate: number) {
    for (const u of [this.material.uniforms, this.materialNaFrente.uniforms]) {
      (u.uCavityPos.value as THREE.Vector3).copy(pos);
      u.uCavityGate.value = gate;
    }
  }

  dispose() {
    // a geometria é UMA — as duas passadas a compartilham
    this.points.geometry.dispose();
    this.material.dispose();
    this.materialNaFrente.dispose();
  }
}
