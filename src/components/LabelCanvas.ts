import type { StarLabel } from '../three/world/labels';

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Desenha todos os rótulos em um único canvas.
 *
 * Evita criar/mover nós DOM a 10 Hz e resolve colisões antes do desenho,
 * inclusive estrelas binárias que compartilham a mesma coordenada.
 */
export class LabelCanvas {
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private width = 1;
  private height = 1;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas 2D indisponível para os rótulos.');
    this.context = context;
  }

  draw(labels: StarLabel[]): void {
    this.resizeIfNeeded();
    const ctx = this.context;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (labels.length === 0) return;

    const occupied: Rect[] = [];
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';

    for (const label of labels) {
      if (label.opacity < 0.08) continue;
      const anchorX = label.x * this.width;
      const anchorY = label.y * this.height;
      // O HUD é parte da composição: labels nunca disputam espaço com
      // legenda/progresso nem com os controles no canto superior direito.
      if (anchorY > this.height * 0.76) continue;
      if (anchorY < this.height * 0.17 && anchorX > this.width * 0.62) continue;
      const toLeft = anchorX > this.width * 0.72;
      const direction = toLeft ? -1 : 1;
      const textX = anchorX + direction * 18;
      const name = label.name.toLocaleUpperCase('pt-BR');
      const detail = `${label.spect.slice(0, 5)}  ·  ${formatDistance(label.distPc)}`;

      ctx.font = '500 10px "Segoe UI", Arial, sans-serif';
      const nameWidth = ctx.measureText(name).width;
      ctx.font = '400 8px "Segoe UI", Arial, sans-serif';
      const detailWidth = ctx.measureText(detail).width;
      const contentWidth = nameWidth + 9 + detailWidth;
      const left = toLeft ? textX - contentWidth : textX;
      const candidate: Rect = {
        left: left - 5,
        right: left + contentWidth + 5,
        top: anchorY - 12,
        bottom: anchorY + 12,
      };
      if (occupied.some((rect) => intersects(candidate, rect, 8))) continue;
      occupied.push(candidate);

      ctx.globalAlpha = label.opacity;
      ctx.strokeStyle = 'rgba(255, 211, 145, 0.72)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(anchorX + direction * 10, anchorY);
      ctx.stroke();

      ctx.textAlign = toLeft ? 'right' : 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
      ctx.shadowBlur = 7;
      ctx.font = '500 10px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = 'rgba(240, 244, 251, 0.96)';
      ctx.fillText(name, textX, anchorY);

      ctx.shadowBlur = 6;
      ctx.font = '400 8px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = 'rgba(159, 176, 201, 0.88)';
      const detailX = toLeft ? textX - nameWidth - 9 : textX + nameWidth + 9;
      ctx.fillText(detail, detailX, anchorY);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  clear(): void {
    this.draw([]);
  }

  private resizeIfNeeded(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
  }
}

function intersects(a: Rect, b: Rect, padding: number): boolean {
  return !(
    a.right + padding < b.left ||
    a.left - padding > b.right ||
    a.bottom + padding < b.top ||
    a.top - padding > b.bottom
  );
}

function formatDistance(pc: number): string {
  const lightYears = pc * 3.262;
  if (lightYears < 0.1) return `${Math.round(lightYears * 63_241)} UA`;
  if (lightYears < 100) return `${lightYears.toFixed(1)} AL`;
  if (lightYears < 10_000) return `${Math.round(lightYears)} AL`;
  return `${(lightYears / 1000).toFixed(1)} MIL AL`;
}
