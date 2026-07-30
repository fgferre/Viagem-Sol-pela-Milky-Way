export const GALACTIC_FRAME = Object.freeze({
  sunRadiusPc: 8_150,
  sunHeightPc: 5.5,
  diskRadiusPc: 16_800,
});

const DEG_TO_RAD = Math.PI / 180;

/**
 * Converte (l, b, distância heliocêntrica) para a base galactocêntrica do app:
 * +X centro -> Sol, +Y direção l=270°, +Z polo norte galáctico.
 *
 * O sinal de Y acompanha a base dextrógira EX/EY/EZ de world/galaxy.ts:
 * EY = EZ x EX. Assim, uma fonte em l=90° tem Y galactocêntrico negativo.
 */
export function heliocentricGalacticToProject(glonDeg, glatDeg, distancePc) {
  const longitude = glonDeg * DEG_TO_RAD;
  const latitude = glatDeg * DEG_TO_RAD;
  const inPlaneDistance = distancePc * Math.cos(latitude);
  return [
    GALACTIC_FRAME.sunRadiusPc - inPlaneDistance * Math.cos(longitude),
    -inPlaneDistance * Math.sin(longitude),
    GALACTIC_FRAME.sunHeightPc + distancePc * Math.sin(latitude),
  ];
}

export function physicalRadiusPc(angularRadiusArcsec, distancePc) {
  return Math.tan((angularRadiusArcsec / 3600) * DEG_TO_RAD) * distancePc;
}

export function galacticCoordinatesFromSourceName(name) {
  const match = /^G(\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)$/.exec(name.trim());
  if (!match) return null;
  return [Number.parseFloat(match[1]), Number.parseFloat(match[2])];
}
