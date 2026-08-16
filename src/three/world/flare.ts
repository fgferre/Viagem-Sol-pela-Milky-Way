// ============================================================
// A TEXTURA DO FLARE — a receita de 30/07 assada uma vez (item 44/R1).
//
// A forma bonita da estrela (halo + cruz de difração) deixa de ser
// fórmula recalculada por pixel por quadro e vira UMA imagem neutra,
// gerada aqui no boot a partir da RECEITA ORIGINAL do filme (30/07,
// heroStars.ts do initial commit) — braço fino e comprido por
// construção, halo largo, tudo numa peça só. É o padrão da indústria:
// Stellarium desenha toda estrela com um sprite pintado; o Celestia
// assa a fórmula em textura no boot com mipmaps; o SpaceEngine usa
// atlas de sprites. Procedural fica só a LEI DE ESCALA (quanto cresce
// com o fluxo), nunca a forma.
//
// POR QUE TEXTURA E NÃO gl.POINTS: em Apple Silicon o gl_PointSize
// trava em 64 px — flare grande TEM de ser quad texturizado.
//
// A COR NÃO MORA AQUI: os canais são neutros (perfis 0..1) e quem pinta
// é o RGB linear da estrela no shader do clarão — Sol dourado, Sirius
// azul-branco, Betelgeuse avermelhada, sempre.
// ============================================================
import * as THREE from 'three';

// ─── A RECEITA DE 30/07 — os números livres que faziam a beleza ──────────
// Braço: exp(-16|transversal|)·exp(-2,4|longitudinal|) em uv do quad.
// A razão 16/2,4 ≈ 6,7 é a estética inteira: nasce fino, vai longe e a
// ponta AFINA até sumir (exponencial não corta). Halo: exp(-4,5·r).
export const LARGURA_DO_BRACO = 16;
export const QUEDA_DO_BRACO = 2.4;
export const QUEDA_DO_HALO = 4.5;
/** amplitudes relativas da receita (halo 0,9 / cruz 0,8 do desenho velho) */
export const AMPLITUDE_DO_HALO = 0.9;
export const AMPLITUDE_DA_CRUZ = 0.8;

/** A janela RADIAL da borda: perfil vai a ZERO exato em r ≥ 0,98 — com
 *  FOLGA antes da aresta do quad (r = 1 no meio da aresta, 1,41 no
 *  canto), porque o último texel amostrado pelo filtro bilinear fica
 *  DENTRO de r = 1 e um resto de 1e-5 ali vira ~9/255 depois do sRGB —
 *  exatamente a moldura que o teste da borda cobra que seja impossível.
 *  Isolinha de círculo: moldura QUADRADA não tem como nascer. */
const JANELA_DE = 0.98;
const JANELA_ATE = 0.8;

/** Lado da textura (potência de 2 para mipmaps analíticos do three). */
export const LADO_DA_TEXTURA = 512;

/**
 * Gera a textura neutra do flare — canal R = halo, canal G = cruz, ambos
 * 0..1 com codificação √v (o shader eleva ao quadrado): mata o banding
 * de 8 bits em gradiente aditivo sem precisar de float texture.
 */
export function gerarTexturaDoFlare(lado: number = LADO_DA_TEXTURA): THREE.DataTexture {
  const dados = new Uint8Array(lado * lado * 4);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      // uv em -1..1, centro do texel
      const u = ((x + 0.5) / lado) * 2 - 1;
      const v = ((y + 0.5) / lado) * 2 - 1;
      const r = Math.hypot(u, v);
      const janela = smoothstep(JANELA_DE, JANELA_ATE, r);
      const halo = Math.exp(-QUEDA_DO_HALO * r) * janela;
      const bracoH = Math.exp(-Math.abs(v) * LARGURA_DO_BRACO) * Math.exp(-Math.abs(u) * QUEDA_DO_BRACO);
      const bracoV = Math.exp(-Math.abs(u) * LARGURA_DO_BRACO) * Math.exp(-Math.abs(v) * QUEDA_DO_BRACO);
      const cruz = ((bracoH + bracoV) / 2) * janela;
      const i = (y * lado + x) * 4;
      dados[i] = Math.round(Math.sqrt(Math.min(1, halo)) * 255);
      dados[i + 1] = Math.round(Math.sqrt(Math.min(1, cruz)) * 255);
      dados[i + 2] = 0;
      dados[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(dados, lado, lado, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// A LEI DE ESCALA não mora aqui: `picoComTeto`, `ganhoDeEntradaDoFlare`
// e `raioDoFlarePx` são LEI e vivem em `estrela.ts` (pura, sem three) —
// repartição, camada e régua consomem a MESMA escrita. Este arquivo é
// só a ARTE: a forma assada.

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
