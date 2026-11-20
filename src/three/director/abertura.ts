// ============================================================
// ONDE A VISITA ABRE, LIDO NA CARGA (19/11/2026). A camada WebGPU da
// galáxia nasce na carga, em paralelo com ela, só se a câmera vai abrir
// longe de casa (`destinoDaCamadaWebgpu`). Na carga a câmera ainda está no
// lugar provisório do engine: quem a põe no lugar é o `useDirector`, DEPOIS
// do `init`, pela URL. Aqui a mesma URL, na MESMA precedência de lá
// (`?pos=` > `?atlas=1`/`?foco=` > `?t=`/`?play=` > a abertura do filme),
// vira só a distância ao Sol da pose de abertura.
// ============================================================
import { filmeDe } from '../cinematic/filme';
import type { EntradaDaBusca } from '../../lib/buscaEstrelas';

/**
 * A distância (pc) ao Sol de onde a câmera abre. `alvoDoFoco` resolve o
 * `?foco=` como o `useDirector` (o índice da busca e o atalho dos anéis).
 * Estrela e lugar do céu: a câmera os enquadra, e todos ficam a mais de
 * 1 pc — a distância deles. Corpo, ou Atlas sem foco: o Sistema Solar.
 */
export function distanciaDaAberturaPc(
  search: string,
  alvoDoFoco: (foco: string) => EntradaDaBusca | null
): number {
  const query = new URLSearchParams(search);
  const pos = (query.get('pos') ?? '').split(',').map(Number);
  if (pos.length === 3 && pos.every(Number.isFinite)) return Math.hypot(pos[0], pos[1], pos[2]);
  const foco = query.get('foco');
  if (query.has('atlas') || foco) {
    const alvo = foco ? alvoDoFoco(foco) : null;
    if (alvo?.tipo === 'estrela') return Math.hypot(alvo.estrela.x, alvo.estrela.y, alvo.estrela.z);
    if (alvo?.tipo === 'lugar') return Math.hypot(alvo.lugar.x, alvo.lugar.y, alvo.lugar.z);
    return 0;
  }
  // `?t=` (com ou sem `?play=`) no filme escolhido; sem ele, a abertura do
  // filme (o instante 0, que é onde a fase intro também pousa)
  const t = Number.parseFloat(query.get('t') ?? '0');
  return filmeDe(query.get('filme')).journey.at(Number.isFinite(t) && t > 0 ? t : 0).pos.length();
}
