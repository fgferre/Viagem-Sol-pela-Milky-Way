// ============================================================
// A SONDA DA LENTE — quanto do DISCO do Sol a lente de cinema vê (0–1).
//
// O fantasma da lente nasce da luz que entra pela objetiva: com o Sol
// meio escondido atrás do limbo de um planeta, entra meia luz. A sonda do
// clarão (`world/clarao.ts`) pergunta só pelo CENTRO; aqui são
// `TOQUES_DA_LENTE` toques espalhados pelo disco aparente (girassol de
// Vogel, determinístico), cada um a sonda do clarão deslocada na tela, com
// a sua consulta pela mecânica comum (`world/sondaDeOclusao.ts`).
//
// Fração = toques que passaram / toques na tela. Toque fora da tela não
// conta; nenhum na tela ⇒ 1 (fora da tela a pergunta não tem resposta, a
// mesma regra do clarão). O valor anda até o alvo pela rampa da casa.
//
// Mora na camada 0, como a sonda do clarão: desenha UMA vez por quadro, no
// passe principal (`CenaResolvidaUmaVez`); o passe do campo usa só as
// camadas 1/2 e não a alcança.
// ============================================================

import * as THREE from 'three';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import { RAMP_DURATION_MS, stepRampToward } from '../world/lodStellar';
import { ndcNaTela, SondaDeOclusao } from '../world/sondaDeOclusao';

export const TOQUES_DA_LENTE = 12;

/** o disco nunca menor que isto na tela (px do buffer): Sol-ponto ainda
 *  é medido pelo pixel onde ele está */
const RAIO_MINIMO_DO_DISCO_PX = 0.75;

/** meia largura de cada toque, px: o quadradinho de 1 px cobre um só
 *  centro de pixel, e o toque é uma amostra PONTUAL do disco. Com a da
 *  sonda do clarão (1, ~2 px de lado) cada toque via ±1 px em volta: o
 *  Sol a 50° tem ~9 px de diâmetro, e a metade dele atrás do limbo da
 *  Terra lia 0,67 (GPU, 08/10/2026); com 0,5 lê 0,58 */
const MEIA_PX_DO_TOQUE = 0.5;

/** consultas em voo por toque — a mesma conta do clarão: cada toque
 *  desenha uma vez por quadro, e três bastam para nunca esperar a GPU */
const PISCINA_POR_TOQUE = 3;

const ANGULO_DOURADO = Math.PI * (3 - Math.sqrt(5));

// A sonda do clarão (`SONDA_VERT`) mais o deslocamento do toque na tela:
// metade do caminho até o Sol (mesmo pixel), 1 px de lado, nunca no
// fundo do depth — ver lá o porquê de cada número. Uma diferença: o piso
// da profundidade é 1e-12 pc (~31 km), não 1e-6 pc (~0,2 UA). Lá o piso só
// engorda o quadradinho perto do Sol; aqui ele multiplicaria o
// deslocamento e jogaria os toques para fora do disco a menos de ~0,4 UA.
// A metade do caminho nunca é menor que meio raio do Sol (~350 mil km).
const TOQUE_VERT = /* glsl */ `
uniform float uMeiaPx;
uniform float uScreenH;
uniform vec2 uDeslocPx;

void main() {
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xyz *= 0.5;
  float pxNaVista = 2.0 * max(-c.z, 1e-12) / (projectionMatrix[1][1] * uScreenH);
  c.xy += (position.xy * uMeiaPx + uDeslocPx) * pxNaVista;
  gl_Position = projectionMatrix * c;
  gl_Position.z = min(gl_Position.z, gl_Position.w * (1.0 - 4.8e-7));
}
`;

const TOQUE_FRAG = /* glsl */ `
precision lowp float;
void main() {
  gl_FragColor = vec4(1.0);
}
`;

/** O raio aparente do disco do Sol na tela, px do buffer, com o piso. */
function raioDoDiscoPx(distancia: number, alturaPx: number, tanHalfFov: number): number {
  const angulo = Math.asin(Math.min(1, RAIO_DO_SOL_NA_CENA / distancia));
  return Math.max((Math.tan(angulo) * alturaPx) / (2 * tanHalfFov), RAIO_MINIMO_DO_DISCO_PX);
}

export interface QuadroDaSondaDaLente {
  /** a lente escolhida não é `nenhuma` */
  ligada: boolean;
  camera: THREE.Camera;
  /** o tamanho do buffer de desenho, px */
  larguraPx: number;
  alturaPx: number;
  tanHalfFov: number;
  dtS: number;
}

export class SondaDaLente {
  readonly group = new THREE.Group();
  private readonly mats: THREE.ShaderMaterial[] = [];
  private readonly meshes: THREE.Mesh[] = [];
  private readonly consultas: SondaDeOclusao[] = [];
  /** a última resposta de cada toque: true à vista, false tapado, null sem resposta */
  private readonly respostas: (boolean | null)[] = new Array<boolean | null>(TOQUES_DA_LENTE).fill(null);
  /** o deslocamento de cada toque na tela, px do buffer (x, y) */
  private readonly desloc = new Float32Array(TOQUES_DA_LENTE * 2);
  private larguraPx = 1;
  private alturaPx = 1;
  private valor = 1;
  /** já houve medida desde o último reinício? A primeira vale por inteiro, sem rampa */
  private medido = false;
  private readonly v = new THREE.Vector3();
  private readonly vNdc = new THREE.Vector3();

  constructor() {
    for (let i = 0; i < TOQUES_DA_LENTE; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: TOQUE_VERT,
        fragmentShader: TOQUE_FRAG,
        uniforms: {
          uMeiaPx: { value: MEIA_PX_DO_TOQUE },
          uScreenH: { value: 1080 },
          uDeslocPx: { value: new THREE.Vector2() },
        },
        colorWrite: false,
        depthWrite: false,
        depthTest: true,
        transparent: true,
      });
      this.mats.push(mat);
      // o Sol está na origem da cena
      const toque = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      toque.visible = false;
      toque.frustumCulled = false;
      toque.renderOrder = -1; // a PRIMEIRA da fila transparente: só o depth dos sólidos
      const consulta = new SondaDeOclusao(PISCINA_POR_TOQUE, (visivel) => this.registrarToque(i, visivel));
      consulta.ligar(toque, (camera) => this.toqueNaTela(i, toque, camera));
      this.consultas.push(consulta);
      this.group.add(toque);
      this.meshes.push(toque);
    }
  }

  /** O passo do quadro, ANTES do desenho da cena. Devolve a fração
   *  visível do disco, já na rampa — o que a lente lê. */
  atualizar(q: QuadroDaSondaDaLente): number {
    const cam = q.camera;
    const solNaFrente = this.v.set(0, 0, 0).applyMatrix4(cam.matrixWorldInverse).z < 0;
    const raioPx = raioDoDiscoPx(
      this.v.setFromMatrixPosition(cam.matrixWorld).length(),
      q.alturaPx,
      q.tanHalfFov
    );
    const corre =
      q.ligada && solNaFrente && q.larguraPx > 0 && q.alturaPx > 0 && Number.isFinite(raioPx);
    if (!corre) {
      // sem desenho, sem consulta; as que estão em voo não valem mais
      for (const m of this.meshes) m.visible = false;
      for (const c of this.consultas) c.invalidar();
      this.respostas.fill(null);
      this.medido = false;
      this.valor = 1;
      return this.valor;
    }
    this.larguraPx = q.larguraPx;
    this.alturaPx = q.alturaPx;
    for (let i = 0; i < TOQUES_DA_LENTE; i++) {
      const r = raioPx * Math.sqrt((i + 0.5) / TOQUES_DA_LENTE);
      const a = i * ANGULO_DOURADO;
      this.desloc[i * 2] = r * Math.cos(a);
      this.desloc[i * 2 + 1] = r * Math.sin(a);
      const u = this.mats[i].uniforms;
      u.uScreenH.value = q.alturaPx;
      (u.uDeslocPx.value as THREE.Vector2).set(this.desloc[i * 2], this.desloc[i * 2 + 1]);
      this.meshes[i].visible = true;
    }
    const alvo = this.fracaoVisivel();
    if (alvo === null) {
      // nenhum toque na tela: a pergunta não tem resposta e fica a última
      // medida — um Sol escondido que sai pela borda não volta a refletir.
      // Sem medida ainda (corte de filme, lente recém-ligada), o Sol na tela
      // espera apagado as 1–3 respostas, sem clarão de 300 ms; fora da tela,
      // 1, a regra do clarão
      if (!this.medido) this.valor = ndcNaTela(this.vNdc.set(0, 0, 0).project(cam)) ? 0 : 1;
    } else if (!this.medido) {
      this.valor = alvo;
      this.medido = true;
    } else {
      this.valor = stepRampToward(this.valor, alvo, q.dtS, RAMP_DURATION_MS);
    }
    return this.valor;
  }

  /** passaram / toques com resposta na tela; `null` quando nenhum está na tela */
  private fracaoVisivel(): number | null {
    let naTela = 0;
    let passaram = 0;
    for (const r of this.respostas) {
      if (r === null) continue;
      naTela++;
      if (r) passaram++;
    }
    return naTela > 0 ? passaram / naTela : null;
  }

  private toqueNaTela(i: number, toque: THREE.Mesh, camera: THREE.Camera): boolean {
    const ndc = this.vNdc.setFromMatrixPosition(toque.matrixWorld).project(camera);
    ndc.x += (2 * this.desloc[i * 2]) / this.larguraPx;
    ndc.y += (2 * this.desloc[i * 2 + 1]) / this.alturaPx;
    return ndcNaTela(ndc);
  }

  /** O ÚNICO lugar que escreve `respostas` — a consulta de cada toque
   *  chama daqui (com GPU de verdade); o teste chama esta mesma função
   *  por um cast controlado, sem GPU nenhuma. */
  private registrarToque(i: number, visivel: boolean | null): void {
    this.respostas[i] = visivel;
  }

  dispose(): void {
    this.mats.forEach((m) => m.dispose());
    for (const c of this.consultas) c.dispose();
    for (const m of this.meshes) m.geometry.dispose();
  }
}
