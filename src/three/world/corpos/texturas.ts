// ============================================================
// O PIPELINE DE TEXTURAS de todos os corpos resolvidos.
//
// O manifest, o alvo de pixels por tier e canal (a dose de VRAM), a
// escolha de variante, a detecção de webp e a política de recarga.
// Morava em terra.ts; serve a Terra, Lua, rochosos e gigantes.
// ============================================================
import type { QualityLevel } from '../../core/engine';

/**
 * RECARGAS além da primeira tentativa antes de `'falhou'` virar terminal
 * (auditoria item 6: um 404 transitório matava o globo a sessão inteira).
 * O precedente é o backoff CONTADO dos 3 `pointerlockerror` da Onda 5
 * (`ERROS_ATE_DESISTIR`, cameraRig.ts): 1 carga + 2 recargas = 3
 * tentativas, e só então o estado desiste — com um aviso único, porque
 * três falhas seguidas não são degradação projetada, são um defeito que
 * alguém precisa ler.
 */
export const RECARGAS_ATE_DESISTIR = 2;

/** Uma entrada do manifest de texturas (public/data/atlas/texturas.json)
 *  — só os campos que a escada consome. */
export interface EntradaDeTextura {
  corpo: string;
  canal: string;
  arquivo: string;
  larguraPx: number;
}
export interface ManifestDeTexturas {
  entradas: EntradaDeTextura[];
}

/** Teto de cinema para os canais de APOIO (tudo que não é `map`) —
 *  a dose de VRAM; a conta mora no doc de `alvoDePixels`. */
export const ALVO_DE_APOIO_CINEMA = 4096;

/**
 * O ALVO de pixels por tier E POR CANAL — a política do dono (D4/decisão
 * 2) com a DOSE DE VRAM da auditoria: cinema usa a MELHOR variante que o
 * aparelho aguenta (`maxTextureSize` da sonda da Onda 1) SÓ no canal
 * `map`, que é o que o olho lê; os canais de apoio (clouds/night/normal/
 * roughness) tetam em 4k. Alta 2k, performance 1k, em todos os canais.
 *
 * A CONTA (RGBA8 + mipmaps 4/3). As nossas texturas são EQUIRET 2:1,
 * não quadradas — a conta antiga (w×w) era 2× alta. Map cinema
 * 8192×4096 = 179 MB; 4 apoios 4096×2048 = 179 MB; um corpo Terra =
 * 0,36 GB com mip. A lição N-9 do doador (tela branca por 3,9 GB)
 * continua válida: a dose existe para não empilhar 8k em todo canal.
 * A 795 px de disco os apoios em 4k já estão acima de 2 texels/pixel.
 * A regra mora AQUI, por canal, e vale para qualquer corpo futuro:
 * um corpo de 1 canal (a Lua) mantém o 8k no `map` de graça.
 *
 * Sem sonda legível o teto é 2k — errar para baixo é barato, estourar o
 * limite do driver é tela preta.
 */
export function alvoDePixels(
  tier: QualityLevel,
  canal: string,
  maxTextureSize?: number
): number {
  const teto =
    typeof maxTextureSize === 'number' && Number.isFinite(maxTextureSize) && maxTextureSize > 0
      ? maxTextureSize
      : 2048;
  const alvo =
    tier === 'cinema'
      ? canal === 'map'
        ? 8192
        : ALVO_DE_APOIO_CINEMA
      : tier === 'alta'
        ? 2048
        : 1024;
  return Math.min(alvo, teto);
}

/**
 * A variante de um canal de um CORPO para um alvo: a MAIOR largura ≤
 * alvo, webp quando o navegador decodifica (a guarda de pessimização já
 * morou no pipeline — só existe webp vencedor no manifest). Sem
 * candidata (canal ausente, alvo abaixo do menor degrau) devolve null e
 * o chamador decide. `corpo` entrou na F2b (a Lua é o segundo
 * consumidor); a escada é a mesma para todos.
 */
export function escolherVariante(
  entradas: readonly EntradaDeTextura[],
  corpo: string,
  canal: string,
  alvoPx: number,
  webpOk: boolean
): EntradaDeTextura | null {
  let melhor: EntradaDeTextura | null = null;
  for (const e of entradas) {
    if (e.corpo !== corpo || e.canal !== canal) continue;
    const ehWebp = e.arquivo.endsWith('.webp');
    if (ehWebp && !webpOk) continue;
    if (!(e.larguraPx <= alvoPx)) continue;
    if (
      !melhor ||
      e.larguraPx > melhor.larguraPx ||
      (e.larguraPx === melhor.larguraPx && webpOk && ehWebp)
    ) {
      melhor = e;
    }
  }
  return melhor;
}

/**
 * O navegador decodifica webp? Detecção por reencode de canvas — quem
 * não encoda webp devolve um data-URL de png. Safari antigo cai no jpg
 * com honestidade; falso negativo custa bytes, nunca imagem quebrada.
 */
export function detectarWebp(): boolean {
  try {
    return document
      .createElement('canvas')
      .toDataURL('image/webp')
      .startsWith('data:image/webp');
  } catch {
    return false;
  }
}
