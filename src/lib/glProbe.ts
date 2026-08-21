// ============================================================
// Sonda de WebGL — roda UMA vez por sessão, antes de qualquer
// alocação. Espec herdada do atlas-orbital (webglSupport.ts,
// reescrita): quatro defesas compradas com bug real no doador.
//  1. Memoizar é CORREÇÃO, não otimização: cada sonda cria um
//     contexto GL e o browser tem teto de ~8–16 simultâneos;
//     sondar de novo a cada uso despejaria o contexto do
//     renderer de verdade.
//  2. webgl2 e depois webgl na MESMA canvas — a 2ª chamada só
//     devolve null se a 1ª já tiver falhado.
//  3. WEBGL_lose_context.loseContext() + canvas.remove() ao
//     sair, por qualquer caminho.
//  4. try/catch por fora: há browsers que LANÇAM (não devolvem
//     null) quando o GL está desabilitado por política.
//
// LÁPIDE DE `rendererSoftware` (Ajustes D, 2026-08-20). A sonda lia o
// nome do renderer, comparava com uma lista de marcas de software
// (SwiftShader, llvmpipe, softpipe…) e o engine REBAIXAVA o tier para
// `performance` quando batia. Era detecção decidindo alocação pelas
// costas do visitante, e a letra D não deixa nenhuma de pé: sem `?q=`
// o tier é constante e quem o move é medição, sob a política `auto`.
// O campo saiu inteiro porque ficou sem leitor no mundo. Se um dia o
// nome do renderer voltar, que volte para SUGERIR — uma linha no
// painel, ao lado da medida —, nunca para decidir.
// ============================================================

export interface GlCapacidades {
  suportado: boolean;
  /**
   * O contexto conseguido foi WebGL2? A sonda aceita WebGL1 como
   * "suportado" de propósito — quem decide se dá para desenhar é o
   * three, no construtor do renderer —, mas o app EXIGE WebGL2, e sem
   * esta bandeira o véu dizia "sem WebGL utilizável" a um navegador que
   * tem WebGL, só que o 1. Mensagem errada manda o visitante procurar o
   * problema no lugar errado. Achado de auditoria externa (2026-08-12).
   */
  webgl2?: boolean;
  maxTextureSize?: number;
}

let cache: GlCapacidades | null = null;

export function sondarGl(): GlCapacidades {
  if (cache) return cache;
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl = gl2 ?? canvas.getContext('webgl');
    if (!gl) {
      cache = { suportado: false };
      return cache;
    }
    // todo getParameter tem de rodar ANTES de soltar o contexto — e cada
    // leitura com a própria blindagem: uma falha aqui não pode rebaixar
    // um aparelho com WebGL utilizável para o véu fatal de "sem WebGL"
    let maxTex = 0;
    try {
      maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    } catch {
      /* ilegível: fica de fora do veredito */
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cache = { suportado: true, webgl2: gl2 !== null };
    if (Number.isFinite(maxTex) && maxTex > 0) cache.maxTextureSize = maxTex;
  } catch {
    cache = { suportado: false };
  } finally {
    canvas?.remove();
  }
  return cache;
}
