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
import { UA_POR_PC } from '../../lib/unidades';
import type { CenaDaCamada } from '../world/galaxy';

/** O endereço como a visita chegou, e se ela nasceu de um recomeço com lugar. */
export interface ChegadaDaVisita {
  search: string;
  /** o `search` sem as portas do recomeço (`pos`, `look`, `recomeco`) */
  limpo: string;
  comLugarDoRecomeco: boolean;
}

/**
 * A CHEGADA, sobre a string (auditoria rodada 3, 1b.3). Só a marca
 * `recomeco` (escrita pelo "Tentar novamente" junto com o lugar) tira o
 * lugar do endereço; um `?pos=` digitado à mão fica como está.
 */
export function lerChegada(search: string): ChegadaDaVisita {
  const query = new URLSearchParams(search);
  const comLugarDoRecomeco = query.has('recomeco');
  if (!comLugarDoRecomeco) return { search, limpo: search, comLugarDoRecomeco };
  for (const porta of ['pos', 'look', 'recomeco']) query.delete(porta);
  const resto = query.toString();
  return { search, limpo: resto ? `?${resto}` : '', comLugarDoRecomeco };
}

let chegada: ChegadaDaVisita | null = null;

/**
 * A chegada desta página, lida UMA vez (o recarregar a zera). Na
 * primeira leitura, se veio de um recomeço com lugar, o lugar sai do
 * endereço: um F5 ou o endereço copiado da barra não reabrem o voo livre
 * velho, e a página que cair de novo volta ao começo em vez de ao mesmo
 * lugar, em laço. O boot e a camada da carga leem o lugar daqui, do
 * endereço como chegou.
 */
export function chegadaDaVisita(): ChegadaDaVisita {
  if (chegada) return chegada;
  chegada = lerChegada(window.location.search);
  if (chegada.comLugarDoRecomeco) {
    const { pathname, hash } = window.location;
    window.history.replaceState(null, '', `${pathname}${chegada.limpo}${hash}`);
  }
  return chegada;
}

/**
 * A cena de abertura. `alvoDoFoco` resolve o `?foco=` como o `useDirector`
 * (o índice da busca e o atalho dos anéis). `?pos=` é voo livre;
 * `?atlas`/`?foco=` é o Atlas — na estrela ou no lugar do céu enquadrado
 * (todos a mais de 1 pc: a distância deles), no corpo pela distância dele
 * (o exoplaneta, longe; os do Sistema Solar, em casa) ou sem foco, em casa.
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
    // o corpo pela distância dele: o exoplaneta está na anfitriã (20/11/2026)
    const dCorpo = alvo?.tipo === 'corpo' && Number.isFinite(alvo.corpo.rUA) ? alvo.corpo.rUA / UA_POR_PC : 0;
    return { fase: 'atlas', revealT, dHomePc: p ? Math.hypot(p.x, p.y, p.z) : dCorpo };
  }
  const tocando = query.has('t') || !!query.get('play');
  // com filme em cena a regra não lê a distância
  return { fase: tocando ? 'journey' : 'intro', revealT, dHomePc: 0 };
}
