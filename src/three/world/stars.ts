// ============================================================
// Campo estelar — pontos GPU com magnitude, cor B-V e extinção.
// Serve tanto para o catálogo HYG quanto para o halo procedural.
// ============================================================
import * as THREE from 'three';
import { STAR_VERT, STAR_FRAG } from '../shaders/starShaders';
import type { StarArrays } from '../config';
import { FADE_NEUTRAL, FOCUS_OFF, clearFocus, needsAttributeWrite } from './lodStellar';

interface StarFieldOptions {
  /** magnitude aparente que satura o pico da PSF — o "tempo de exposição" */
  expoM0?: number;
  /** largura da PSF em px a 1080p — o "instrumento" */
  sigmaPx?: number;
  tau?: number; // coeficiente de extinção
}

export class StarField {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  /** `uExpoM0` e `uSigmaPx` publicados: a política de dominância
   *  (lodStellar seção 5) precisa da MESMA PSF que a GPU vai desenhar, e
   *  redigitar 3,5/0,85 no consumidor seria comprar o defeito que a
   *  fase 2 desfez nas rampas do Sol. */
  readonly expoM0: number;
  readonly sigmaPx: number;

  // Os dois canais por estrela (Onda 3, fase 3 — ver STAR_VERT).
  // Float32Array(n) cada: 1,3 MB de RAM/GPU por canal em 328.749
  // estrelas, e ZERO byte de payload novo — não são campos do formato
  // sc1, são buffers de RUNTIME (fade e foco são estado de tela, não
  // dado de catálogo; `StarArrays` não os conhece e não deve conhecer).
  private readonly fadeArray: Float32Array;
  private readonly focusArray: Float32Array;
  private readonly fadeAttr: THREE.BufferAttribute;
  private readonly focusAttr: THREE.BufferAttribute;

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
    // nascem ZERADOS = neutros (D3): (1 − aFade) = 1 e o branch de foco
    // inerte. O campo desenha exatamente o que desenhava antes deles.
    const n = data.logLum.length;
    this.fadeArray = new Float32Array(n);
    this.focusArray = new Float32Array(n);
    this.fadeAttr = new THREE.BufferAttribute(this.fadeArray, 1);
    this.focusAttr = new THREE.BufferAttribute(this.focusArray, 1);
    geo.setAttribute('aFade', this.fadeAttr);
    geo.setAttribute('aFocus', this.focusAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6000);

    this.expoM0 = opts.expoM0 ?? 3.5;
    this.sigmaPx = opts.sigmaPx ?? 0.85;
    this.material = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uScreenH: { value: 1080 },
        uExpoM0: { value: this.expoM0 },
        uSigmaPx: { value: this.sigmaPx },
        uTau: { value: opts.tau ?? 0.9 },
        uFade: { value: 1 },
        uCavityPos: { value: new THREE.Vector3() },
        uCavityGate: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  update(camPos: THREE.Vector3, screenH: number) {
    const u = this.material.uniforms;
    (u.uCamPos.value as THREE.Vector3).copy(camPos);
    u.uScreenH.value = screenH;
  }

  setFade(f: number) {
    this.material.uniforms.uFade.value = f;
    this.points.visible = f > 0.001;
  }

  // ------------------------------------------------------------
  // Escrita por estrela — o contrato C2/C3 da Onda 3
  // ------------------------------------------------------------
  //
  // C2 — REAFIRMAÇÃO IDEMPOTENTE. O consumidor reescreve os mesmos 16
  // slots todo quadro; a escrita é NO-OP quando o slot já tem o valor
  // (`needsAttributeWrite`, lodStellar), então `needsUpdate` só sobe
  // quando alguma coisa de fato mudou. Sem isso a GPU receberia um
  // upload de 1,3 MB por quadro para reescrever os mesmos bytes.
  // E quando muda, sobe com `addUpdateRange(index, 1)`: o three faz
  // `bufferSubData` só do slot mexido (e funde faixas adjacentes) em vez
  // do buffer inteiro — 4 bytes no lugar de 1,3 MB.
  //
  // O rebuild de geometria que o doador temia NÃO EXISTE nesta casa
  // (D8): nenhuma camada estelar assina `onQuality`, e o `StarField` nem
  // recebe o `Engine` para poder assinar. A reafirmação entra mesmo
  // assim — custo ~zero e protege o invariante de um refactor futuro.

  /**
   * Grava `aFade` da estrela `index`. Devolve se a escrita ACONTECEU
   * (o teste do dirty-flag vive disso). Índice fora da faixa é ignorado.
   */
  writeFade(index: number, value: number): boolean {
    if (!(index >= 0) || index >= this.fadeArray.length) return false;
    // `Math.fround` ANTES de decidir, e não é detalhe: o buffer é
    // float32 e o consumidor calcula em float64. Comparar o que ele
    // pediu com o que ficou gravado daria "mudou" em TODO quadro, para
    // todo valor não representável — a idempotência morreria em
    // silêncio e a GPU levaria um upload por quadro com a câmera parada.
    const alvo = Math.fround(value);
    if (!needsAttributeWrite(this.fadeArray[index], alvo)) return false;
    this.fadeArray[index] = alvo;
    this.fadeAttr.addUpdateRange(index, 1);
    this.fadeAttr.needsUpdate = true;
    return true;
  }

  /** Grava `aFocus` (0 ou 1 — o shader corta em 0,5). Mesmas regras. */
  writeFocus(index: number, value: number): boolean {
    if (!(index >= 0) || index >= this.focusArray.length) return false;
    const alvo = Math.fround(value);
    if (!needsAttributeWrite(this.focusArray[index], alvo)) return false;
    this.focusArray[index] = alvo;
    this.focusAttr.addUpdateRange(index, 1);
    this.focusAttr.needsUpdate = true;
    return true;
  }

  /**
   * C3 — o que a estrela que PERDE o foco recebe: fade e foco zerados,
   * para não ficar meio-apagada para sempre. O par vem de `clearFocus()`
   * (lodStellar), que é onde o contrato mora.
   */
  clearFocus(index: number): void {
    const { fade, focus } = clearFocus();
    this.writeFade(index, fade);
    this.writeFocus(index, focus);
  }

  /** Volta o campo INTEIRO ao estado de nascimento (os dois canais). */
  reset(): void {
    this.fadeArray.fill(FADE_NEUTRAL);
    this.focusArray.fill(FOCUS_OFF);
    this.fadeAttr.clearUpdateRanges();
    this.focusAttr.clearUpdateRanges();
    this.fadeAttr.needsUpdate = true;
    this.focusAttr.needsUpdate = true;
  }

  /** leitura dos canais (oráculos e depuração) */
  fadeAt(index: number): number {
    return this.fadeArray[index];
  }

  focusAt(index: number): number {
    return this.focusArray[index];
  }

  /** mesma cavidade do raymarch — a extinção vê o mesmo gás carvado */
  setCavity(pos: THREE.Vector3, gate: number) {
    (this.material.uniforms.uCavityPos.value as THREE.Vector3).copy(pos);
    this.material.uniforms.uCavityGate.value = gate;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
