// ============================================================
// Campo estelar — pontos GPU com magnitude, cor B-V e extinção.
// Serve tanto para o catálogo HYG quanto para o halo procedural.
// ============================================================
import * as THREE from 'three';
import { STAR_VERT, STAR_FRAG } from '../shaders/starShaders';
import type { StarArrays } from '../config';
import { FADE_NEUTRAL, FOCUS_OFF, clearFocus, needsAttributeWrite } from './lodStellar';

/**
 * Teto de faixas pendentes por atributo antes de cair para UPLOAD CHEIO
 * (conserto da revisão de olhos frescos, fase 4b da Onda 3 — ver o
 * comentário do latch em `marcarUpload`). 64 é folgado: o pior quadro
 * honesto tem 16 faixas (uma por hero), e só uma sequência de quadros
 * cujo upload NUNCA acontece chega perto disto.
 */
export const UPDATE_RANGE_CAP = 64;

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
   *  fase 2 desfez nas rampas do Sol.
   *
   *  DESDE A PUPILA (Onda 8) `expoM0` DEIXOU DE SER CONSTANTE, e é de
   *  propósito que ele continua sendo UM número lido do mesmo lugar: a
   *  auto-exposição é um deslocamento deste valor (`pupila.ts`), e o
   *  publicado tem de ser o EFETIVO — o que a GPU vai usar neste quadro.
   *  Publicar a base deixaria a política de dominância prevendo um pixel
   *  que não é o desenhado, que é exatamente a divergência silenciosa que
   *  a publicação existe para impedir. */
  readonly expoM0Base: number;
  readonly sigmaPx: number;
  private deslocamentoDaPupila = 0;

  /** o "tempo de exposição" DESTE quadro: base + pupila. */
  get expoM0(): number {
    // `+ 0` é o mesmo bit: com a pupila aberta (deslocamento 0 exato) o
    // campo desenha exatamente o que desenhava antes de ela existir.
    return this.expoM0Base + this.deslocamentoDaPupila;
  }

  // Os dois canais por estrela (Onda 3, fase 3 — ver STAR_VERT).
  // Float32Array(n) cada: 1,3 MB de RAM/GPU por canal em 328.749
  // estrelas, e ZERO byte de payload novo — não são campos do formato
  // sc1, são buffers de RUNTIME (fade e foco são estado de tela, não
  // dado de catálogo; `StarArrays` não os conhece e não deve conhecer).
  private readonly fadeArray: Float32Array;
  private readonly focusArray: Float32Array;
  private readonly fadeAttr: THREE.BufferAttribute;
  private readonly focusAttr: THREE.BufferAttribute;
  /** latch de upload cheio por canal — ver `marcarUpload` */
  private fadeCheio = false;
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
    // nascem ZERADOS = neutros (D3): (1 − aFade) = 1 e o branch de foco
    // inerte. O campo desenha exatamente o que desenhava antes deles.
    const n = data.logLum.length;
    this.fadeArray = new Float32Array(n);
    this.focusArray = new Float32Array(n);
    this.fadeAttr = new THREE.BufferAttribute(this.fadeArray, 1);
    this.focusAttr = new THREE.BufferAttribute(this.focusArray, 1);
    geo.setAttribute('aFade', this.fadeAttr);
    geo.setAttribute('aFocus', this.focusAttr);
    // o latch baixa QUANDO A GPU RECEBE o buffer: o three chama este
    // callback no fim de `createBuffer`/`updateBuffer`
    // (WebGLAttributes.js), e é o único sinal honesto de "subiu".
    this.fadeAttr.onUpload(() => {
      this.fadeCheio = false;
    });
    this.focusAttr.onUpload(() => {
      this.focusCheio = false;
    });
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6000);

    this.expoM0Base = opts.expoM0 ?? 3.5;
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

  /**
   * O ATUADOR DA PUPILA (Onda 8): o deslocamento de `expoM0` que realiza o
   * ganho da auto-exposição. Escrito pelo Director a cada quadro.
   *
   * Entra AQUI e não num passe de pós por medição, não por gosto: os render
   * targets do composer são half-float e saturam em 65.504, e o ponto do Sol a
   * 1 UA deposita ~4e11 — ele já chega ao buffer como infinito, e ganho
   * aplicado depois multiplica infinito. A razão inteira está em `pupila.ts`.
   *
   * Escrita idempotente, no mesmo espírito do C2 da Onda 3: com a pupila aberta
   * o deslocamento é 0 EXATO todo quadro, e o uniform não é reescrito.
   */
  setPupila(deslocamento: number) {
    const d = Number.isFinite(deslocamento) ? deslocamento : 0;
    if (d === this.deslocamentoDaPupila) return;
    this.deslocamentoDaPupila = d;
    this.material.uniforms.uExpoM0.value = this.expoM0;
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
   * Como um slot mexido pede a subida — e as DUAS defesas que a revisão
   * de olhos frescos comprou (fase 4b da Onda 3). Devolve o novo estado
   * do latch de upload cheio do canal.
   *
   * (1) TETO. `addUpdateRange` só é consumido (e as faixas só são
   * limpas) DENTRO do `updateBuffer` do three; e o renderer pula objetos
   * com `visible === false`. Com o campo escondido (`?nocat`, ou o
   * toggle "Catálogo HYG" do painel) a reafirmação por quadro continua
   * rodando e ninguém consome nada: as faixas cresciam SEM TETO, ~960
   * objetos por segundo com a câmera em movimento perto de casa, e o
   * `sort()` do three pegaria todas de uma vez ao reacender o campo.
   * Passado o teto, a política é cair para upload cheio — correto e
   * barato — em vez de guardar lista.
   *
   * (2) LATCH. `updateRanges` vazio + `needsUpdate` é como se pede o
   * buffer INTEIRO (`bufferSubData` de tudo). Quem faz isso — `reset()`,
   * ou o teto acima — precisa que as escritas seguintes NÃO recoloquem
   * uma faixa antes do render, senão o three sobe só aquele slot e os
   * outros 328.733 ficam com o valor velho na GPU. Enquanto o latch
   * estiver alto, escreve-se no array e só se levanta o dirty-flag.
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
    // DIVERGÊNCIA DECLARADA do doador (`HygStellarMesh.tsx:168` clampa
    // em [0,1] antes de comparar): aqui NÃO se clampa de propósito — o
    // clamp mora no shader (`clamp(1.0 - aFade, ...)` no STAR_VERT), e
    // clampar também aqui esconderia um chamador errado em vez de o
    // denunciar (`fadeAt` devolveria um valor que a tela nunca usou).
    const alvo = Math.fround(value);
    if (!needsAttributeWrite(this.fadeArray[index], alvo)) return false;
    this.fadeArray[index] = alvo;
    this.fadeCheio = this.marcarUpload(this.fadeAttr, this.fadeCheio, index);
    return true;
  }

  /** Grava `aFocus` (0 ou 1 — o shader corta em 0,5). Mesmas regras. */
  writeFocus(index: number, value: number): boolean {
    if (!(index >= 0) || index >= this.focusArray.length) return false;
    const alvo = Math.fround(value);
    if (!needsAttributeWrite(this.focusArray[index], alvo)) return false;
    this.focusArray[index] = alvo;
    this.focusCheio = this.marcarUpload(this.focusAttr, this.focusCheio, index);
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

  /**
   * Volta o campo INTEIRO ao estado de nascimento (os dois canais).
   * Levanta o latch de upload cheio: uma escrita qualquer entre este
   * `reset` e o render seguinte devolveria o atributo ao modo parcial e
   * a GPU subiria só aquele slot — os outros 328.733 ficariam com o
   * valor pré-reset (achado da caçada adversarial, fase 4b).
   */
  reset(): void {
    this.fadeArray.fill(FADE_NEUTRAL);
    this.focusArray.fill(FOCUS_OFF);
    this.fadeAttr.clearUpdateRanges();
    this.focusAttr.clearUpdateRanges();
    this.fadeAttr.needsUpdate = true;
    this.focusAttr.needsUpdate = true;
    this.fadeCheio = true;
    this.focusCheio = true;
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
