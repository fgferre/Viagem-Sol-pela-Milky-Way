import * as THREE from 'three';

// ─── A MECÂNICA DA SONDA — consulta de oclusão sem nunca bloquear ─────────
//
// Uma só mecânica para quem pergunta à GPU "este pontinho apareceu?": o
// clarão do Sol (centro do disco) e a lente de cinema (toques sobre o
// disco). Quem usa dá o mesh invisível que desenha a pergunta e a regra
// de "está na tela"; daqui sai a resposta, sempre por `responder`:
//   true  — alguma amostra passou no teste de profundidade (à vista);
//   false — nenhuma passou (outro corpo tapou);
//   null  — o ponto está fora da tela: a pergunta não tem resposta.
//
// `onBeforeRender`/`onAfterRender` só disparam quando o mesh desenha de
// verdade; a consulta mede exatamente esse draw. Nunca bloqueia: abre no
// máximo `tamanhoDaPiscina` consultas em voo, só lê as que a GPU já
// respondeu, e com a piscina cheia pula o quadro.

interface ConsultaEmVoo {
  query: WebGLQuery;
  pendente: boolean;
  id: number;
}

/** A regra de "na tela" das sondas: o ponto em NDC dentro do quadro e
 *  antes do plano de fundo. */
export function ndcNaTela(ndc: THREE.Vector3): boolean {
  return Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z <= 1;
}

export class SondaDeOclusao {
  private readonly consultas: ConsultaEmVoo[] = [];
  private proximoId = 1;
  private idDoUltimoResultado = 0;
  /** a consulta aberta NESTE draw, ou null */
  private ativa: ConsultaEmVoo | null = null;
  private ultimoContextoGL: WebGL2RenderingContext | null = null;
  private readonly tamanhoDaPiscina: number;
  private readonly responder: (visivel: boolean | null) => void;

  constructor(tamanhoDaPiscina: number, responder: (visivel: boolean | null) => void) {
    this.tamanhoDaPiscina = tamanhoDaPiscina;
    this.responder = responder;
  }

  /** Pendura a consulta no draw do mesh. `naTela` é perguntado a cada
   *  draw, com a câmera do passe. */
  ligar(mesh: THREE.Object3D, naTela: (camera: THREE.Camera) => boolean): void {
    mesh.onBeforeRender = (renderer, _cena, camera) => this.iniciar(renderer, naTela, camera);
    mesh.onAfterRender = (renderer) => this.encerrar(renderer);
  }

  /** As consultas já em voo não valem mais: quando voltarem, são lidas
   *  (liberam a vaga) e descartadas. */
  invalidar(): void {
    this.idDoUltimoResultado = this.proximoId - 1;
  }

  private iniciar(
    renderer: THREE.WebGLRenderer,
    naTela: (camera: THREE.Camera) => boolean,
    camera: THREE.Camera
  ): void {
    this.ativa = null;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.createQuery !== 'function') return; // sem WebGL2: a última resposta fica como está
    this.ultimoContextoGL = gl;
    this.consumirResultados(gl);
    // FORA DA TELA o ponto cairia fora da imagem e seria descartado —
    // "tapado" sem corpo nenhum. A pergunta não tem resposta, e as
    // consultas em voo, feitas com o ponto ainda dentro, não valem mais.
    if (!naTela(camera)) {
      this.invalidar();
      this.responder(null);
      return;
    }
    let vaga = this.consultas.find((s) => !s.pendente);
    if (!vaga && this.consultas.length < this.tamanhoDaPiscina) {
      const query = gl.createQuery();
      if (!query) return;
      vaga = { query, pendente: false, id: 0 };
      this.consultas.push(vaga);
    }
    if (!vaga) return; // piscina cheia de consultas em voo: pula este quadro, nunca bloqueia
    vaga.pendente = true;
    vaga.id = this.proximoId++;
    this.ativa = vaga;
    gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE, vaga.query);
  }

  private encerrar(renderer: THREE.WebGLRenderer): void {
    if (!this.ativa) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE);
    this.ativa = null;
  }

  /** nunca bloqueia: só lê consultas cujo `QUERY_RESULT_AVAILABLE` já é
   *  verdadeiro. O resultado mais NOVO é quem decide — consultas podem
   *  voltar fora de ordem, e uma resposta velha não pode sobrescrever
   *  uma mais nova que já tenha chegado. */
  private consumirResultados(gl: WebGL2RenderingContext): void {
    for (const s of this.consultas) {
      if (!s.pendente || !gl.getQueryParameter(s.query, gl.QUERY_RESULT_AVAILABLE)) continue;
      const passou = gl.getQueryParameter(s.query, gl.QUERY_RESULT);
      s.pendente = false;
      if (s.id > this.idDoUltimoResultado) {
        this.idDoUltimoResultado = s.id;
        this.responder(passou !== 0);
      }
    }
  }

  dispose(): void {
    if (this.ultimoContextoGL) {
      for (const s of this.consultas) this.ultimoContextoGL.deleteQuery(s.query);
    }
  }
}
