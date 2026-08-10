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
// rendererSoftware === undefined significa "não medimos, não
// afirmamos": extensão ausente nunca vira veredito.
// ============================================================

export interface GlCapacidades {
  suportado: boolean;
  maxTextureSize?: number;
  rendererSoftware?: boolean;
}

const MARCAS_SOFTWARE = [
  'swiftshader',
  'llvmpipe',
  'softpipe',
  'software adapter',
  'basic render driver',
];

let cache: GlCapacidades | null = null;

export function sondarGl(): GlCapacidades {
  if (cache) return cache;
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) {
      cache = { suportado: false };
      return cache;
    }
    let rendererSoftware: boolean | undefined;
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const nome = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).toLowerCase();
        rendererSoftware = MARCAS_SOFTWARE.some((m) => nome.includes(m));
      }
    } catch {
      /* renderer ilegível: fica undefined */
    }
    // todo getParameter tem de rodar ANTES de soltar o contexto
    const maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cache = { suportado: true };
    if (Number.isFinite(maxTex) && maxTex > 0) cache.maxTextureSize = maxTex;
    if (rendererSoftware !== undefined) cache.rendererSoftware = rendererSoftware;
  } catch {
    cache = { suportado: false };
  } finally {
    canvas?.remove();
  }
  return cache;
}
