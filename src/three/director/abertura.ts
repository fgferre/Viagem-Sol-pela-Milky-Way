// ============================================================
// A CENA EM QUE A VISITA ABRE, LIDA NA CARGA (19/11/2026). A camada WebGPU
// da galáxia nasce na carga, em paralelo com ela, quando a regra
// (`camadaWebgpuQuerida`) a quer já na abertura: o nascimento congela a
// tela por instantes, e na carga isso fica escondido no carregamento. Na
// carga a câmera ainda está no lugar provisório do engine: quem a põe no
// lugar é o `useDirector`, DEPOIS do `init`, pela URL. Aqui a mesma URL, na
// MESMA precedência de lá (`?pos=` > `?atlas=1`/`?foco=` > `?t=`/`?play=` >
// a intro do filme escolhido), vira a cena que a regra lê.
// ============================================================
import { filmeDe } from '../cinematic/filme';
import type { EntradaDaBusca } from '../../lib/buscaEstrelas';
import type { CenaDaCamada } from '../world/galaxy';

/**
 * A cena de abertura. `alvoDoFoco` resolve o `?foco=` como o `useDirector`
 * (o índice da busca e o atalho dos anéis). `?pos=` é voo livre;
 * `?atlas`/`?foco=` é o Atlas — na estrela ou no lugar do céu enquadrado
 * (todos a mais de 1 pc: a distância deles), no corpo ou sem foco, em casa.
 * Sem eles é o filme escolhido em cena: tocando (`?t=`/`?play=`) ou na intro.
 */
export function cenaDaAbertura(
  search: string,
  alvoDoFoco: (foco: string) => EntradaDaBusca | null
): CenaDaCamada {
  const query = new URLSearchParams(search);
  const revealT = filmeDe(query.get('filme')).revealT;
  const pos = (query.get('pos') ?? '').split(',').map(Number);
  if (pos.length === 3 && pos.every(Number.isFinite)) {
    return { fase: 'free', revealT, dHomePc: Math.hypot(pos[0], pos[1], pos[2]) };
  }
  const foco = query.get('foco');
  if (query.has('atlas') || foco) {
    const alvo = foco ? alvoDoFoco(foco) : null;
    const p = alvo?.tipo === 'estrela' ? alvo.estrela : alvo?.tipo === 'lugar' ? alvo.lugar : null;
    return { fase: 'atlas', revealT, dHomePc: p ? Math.hypot(p.x, p.y, p.z) : 0 };
  }
  const tocando = query.has('t') || !!query.get('play');
  // com filme em cena a regra não lê a distância
  return { fase: tocando ? 'journey' : 'intro', revealT, dHomePc: 0 };
}
