// Vendorizado de Novo-Sol-Fable-3d/src/core/controls.js:152-161 — as três
// funções puras do ciclo solar que activity.js importa. O resto do
// controls.js é UI e não viaja.
export function cycleMultiplierFor(lapse) {
  return lapse > 0 ? 1 + 39 * Math.sqrt(Math.min(1, Math.max(0, lapse))) : 1;
}
export function cycleEasingFor(multiplier) {
  return Math.min(1, Math.max(0, (multiplier - 1) / 8));
}
export function cycleDepthFor(cycle, lapse) {
  if (cycle > 0.001) return Math.min(1, Math.max(0, cycle));
  return lapse > 0 ? 1 : 0;
}
