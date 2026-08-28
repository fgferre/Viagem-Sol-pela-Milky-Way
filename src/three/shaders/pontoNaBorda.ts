// ============================================================
// O ponto de estrela na borda do quadro — item 70, causa 2.
//
// THREE.Points descarta o sprite INTEIRO quando o vértice cruza o
// volume de clip. A metade da PSF que ainda estava na tela some num
// passo, e o céu perde a luz da estrela de uma vez. A hero (QUAD)
// sai suave pela mesma borda; o ponto do catálogo, das cascas e
// dos dez corpos não.
//
// O desenho: prender o vértice 1 px DENTRO do clip, crescer o
// sprite pelo deslocamento, e avaliar a PSF pela distância
// VERDADEIRA (`gl_FragCoord` − centro real). O fragmento só usa
// `uv` em módulo (r², |x|, |y|), então a troca de origem do uv
// não vira arte nova. A largura do quadro sai da projeção
// (`P[1][1]/P[0][0]`) contra `uScreenH` — o mesmo truque do
// recorte da galáxia, sem uniforme novo.
// ============================================================

export type PontoNaBorda = {
  ndcX: number;
  ndcY: number;
  sizePx: number;
  screenW: number;
  screenH: number;
};

export type PontoPreso = {
  /** NDC do vértice que o GPU vai ver (preso ou o original, se
   *  o sprite não toca o quadro). */
  ndcX: number;
  ndcY: number;
  sizePx: number;
  /** centro VERDADEIRO em px de buffer — o fragmento avalia daqui */
  centroPxX: number;
  centroPxY: number;
  /** meia-largura ORIGINAL do sprite (não a crescida) */
  meiaPx: number;
  /** o vértice andou para ficar dentro do clip */
  preso: boolean;
};

export const GLSL_PONTO_NA_BORDA_VARYINGS = /* glsl */ `
varying vec2 vCentroPx;
varying float vMeiaPx;
`;

export const GLSL_PONTO_NA_BORDA = /* glsl */ `
void prenderPontoNoClip(float screenH) {
  float size = gl_PointSize;
  vMeiaPx = size * 0.5;
  if (gl_Position.w <= 0.0 || size < 1.0) {
    vCentroPx = vec2(0.0);
    return;
  }
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float screenW = screenH * projectionMatrix[1][1] / max(projectionMatrix[0][0], 1e-8);
  vCentroPx = (ndc * 0.5 + 0.5) * vec2(screenW, screenH);
  vec2 meiaNdc = vec2(size / max(screenW, 1.0), size / max(screenH, 1.0));
  if (abs(ndc.x) > 1.0 + meiaNdc.x || abs(ndc.y) > 1.0 + meiaNdc.y) {
    return;
  }
  vec2 pixelNdc = vec2(2.0 / max(screenW, 1.0), 2.0 / max(screenH, 1.0));
  vec2 ndcPreso = clamp(ndc, vec2(-1.0) + pixelNdc, vec2(1.0) - pixelNdc);
  vec2 shiftPx = (ndcPreso - ndc) * 0.5 * vec2(screenW, screenH);
  gl_PointSize = size + 2.0 * max(abs(shiftPx.x), abs(shiftPx.y));
  gl_Position.xy = ndcPreso * gl_Position.w;
}
`;

/** Espelho TS de `prenderPontoNoClip`. O GLSL deriva a largura da
 *  projeção; aqui ela entra pronta — a conta da beira é a mesma. */
export function prenderPontoNoClip(p: PontoNaBorda): PontoPreso {
  const { ndcX, ndcY, sizePx, screenW, screenH } = p;
  const meiaPx = 0.5 * sizePx;
  const centroPxX = (ndcX * 0.5 + 0.5) * screenW;
  const centroPxY = (ndcY * 0.5 + 0.5) * screenH;
  if (sizePx < 1) {
    return { ndcX, ndcY, sizePx, centroPxX, centroPxY, meiaPx, preso: false };
  }
  const meiaNdcX = sizePx / screenW;
  const meiaNdcY = sizePx / screenH;
  if (Math.abs(ndcX) > 1 + meiaNdcX || Math.abs(ndcY) > 1 + meiaNdcY) {
    return { ndcX, ndcY, sizePx, centroPxX, centroPxY, meiaPx, preso: false };
  }
  const pixelNdcX = 2 / screenW;
  const pixelNdcY = 2 / screenH;
  const ndcPresoX = Math.min(1 - pixelNdcX, Math.max(-1 + pixelNdcX, ndcX));
  const ndcPresoY = Math.min(1 - pixelNdcY, Math.max(-1 + pixelNdcY, ndcY));
  const shiftX = (ndcPresoX - ndcX) * 0.5 * screenW;
  const shiftY = (ndcPresoY - ndcY) * 0.5 * screenH;
  const andou = shiftX !== 0 || shiftY !== 0;
  return {
    ndcX: ndcPresoX,
    ndcY: ndcPresoY,
    sizePx: sizePx + 2 * Math.max(Math.abs(shiftX), Math.abs(shiftY)),
    centroPxX,
    centroPxY,
    meiaPx,
    preso: andou,
  };
}

/** `uv` do fragmento: (gl_FragCoord − centro verdadeiro) / meia original. */
export function uvDoPonto(
  fragX: number,
  fragY: number,
  centroPxX: number,
  centroPxY: number,
  meiaPx: number
): [number, number] {
  const d = Math.max(meiaPx, 1e-6);
  return [(fragX - centroPxX) / d, (fragY - centroPxY) / d];
}
