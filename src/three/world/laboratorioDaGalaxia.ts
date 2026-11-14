// ============================================================
// O LABORATÓRIO DA GALÁXIA (13/11/2026) — os botões do protótipo WebGPU
// (`webgpu-galaxia.html`) e os da galáxia de partículas no WebGL, levados
// para Ajustes a pedido do dono: "quero poder setar tudo como no
// protótipo que tinham vários controles... quero que isso vá para dentro
// do menu". Uma tabela só: o que cada controle é, os valores do menu, o
// padrão, que porta de URL o espelha e em qual caminho ele vale.
//
// `null` é o PADRÃO (nada na URL, imagem igual à de antes byte a byte).
// Um valor é escolha à mão: vai à URL, e o selo a declara. Os padrões que
// dependem do tier (sorteios, teto de pontos) saem do orçamento abaixo.
// Módulo puro (sem three): o painel, o Director, a galáxia e os testes
// leem a mesma tabela.
// ============================================================

/** os tiers, sem importar o engine (o módulo é puro) */
type Tier = 'cinema' | 'alta' | 'performance';
/** quem desenha a galáxia de fora agora (`CaminhoDaGalaxia` do engine) */
type Caminho = 'webgpu' | 'particulas' | 'classica';

/**
 * O ORÇAMENTO DA GALÁXIA DE PARTÍCULAS POR TIER (12/11/2026, a nova virou
 * padrão): `sorteios` do motor WebGPU (~4 M partículas cada) e o teto de
 * instâncias do caminho WebGL, em milhões. A régua: a nova não pode custar
 * mais que a clássica no mesmo tier de longe nem no filme (medido neste
 * Mac, 1280×800 e 390×844, PLAN-GALAXIA.md). Com 4 sorteios a meia
 * distância passava da clássica em cinema; com 2, não. O filme em t=148
 * ainda está na cessão (a camada WebGPU só entra fora do disco) e quem
 * desenha ali é o WebGL: com 5 M ele custava o dobro da clássica, com 2 M
 * (cinema) e 1 M (alta, cuja clássica desenha metade) fica abaixo. O
 * telefone vai ao WebGL com 0,5 M. Os controles "Sorteios" e "Teto de
 * pontos" do laboratório (`?sorteios=`, `?lodmax=`) passam por cima.
 */
export const ORCAMENTO_DA_GALAXIA: Record<Tier, { sorteios: number; tetoLodMilhoes: number }> = {
  cinema: { sorteios: 2, tetoLodMilhoes: 2 },
  alta: { sorteios: 2, tetoLodMilhoes: 1 },
  performance: { sorteios: 1, tetoLodMilhoes: 0.5 },
};

export type IdDoLaboratorio =
  | 'filhas'
  | 'borrifo'
  | 'filtro'
  | 'lod'
  | 'fatia'
  | 'sorteios'
  | 'lodrho'
  | 'lodk'
  | 'lodmax'
  | 'lodpiso'
  | 'lodesp';

export interface ControleDoLaboratorio {
  id: IdDoLaboratorio;
  /** o motor que o controle mexe: o WebGPU (vista de fora) ou as partículas no WebGL */
  motor: 'webgpu' | 'webgl';
  /** `vivo` muda no quadro seguinte; `reassar` sorteia a galáxia de novo (o mundo velho fica na tela) */
  aplica: 'vivo' | 'reassar';
  /** os valores do menu, na ordem dos botões (o "Preset" vem antes deles);
   *  o padrão está sempre entre eles, para o pontilhado do "efetivo" */
  valores: readonly number[];
  /** o padrão fixo; `undefined` = do tier (`padraoDoControle`) */
  padrao?: number;
  /** a faixa que a porta de URL aceita (bancada: `?lodmax=3` vale, mesmo fora do menu) */
  min: number;
  max: number;
  /** só inteiros na porta */
  inteiro?: boolean;
}

/**
 * A TABELA. A porta de URL de cada controle é o próprio `id`: as do WebGL
 * (`lodrho`, `lodk`, `lodmax`, `lodpiso`, `lodesp`) e `sorteios` já eram
 * portas de bancada e continuam valendo; as do motor WebGPU têm os nomes
 * do protótipo (`borrifo`, `filtro`, `lod`, `fatia`; `k` virou `filhas`).
 */
export const CONTROLES_DO_LABORATORIO: readonly ControleDoLaboratorio[] = [
  // --- o motor WebGPU (a vista de fora), os botões do protótipo ---
  { id: 'filhas', motor: 'webgpu', aplica: 'vivo', valores: [1, 2, 4], padrao: 1, min: 1, max: 8, inteiro: true },
  { id: 'borrifo', motor: 'webgpu', aplica: 'vivo', valores: [0, 1], padrao: 0, min: 0, max: 1, inteiro: true },
  { id: 'filtro', motor: 'webgpu', aplica: 'vivo', valores: [1, 0], padrao: 1, min: 0, max: 1, inteiro: true },
  { id: 'lod', motor: 'webgpu', aplica: 'vivo', valores: [6, 12, 24, 0], padrao: 12, min: 0, max: 64 },
  { id: 'fatia', motor: 'webgpu', aplica: 'vivo', valores: [1, 2, 4, 8], padrao: 4, min: 1, max: 16, inteiro: true },
  { id: 'sorteios', motor: 'webgpu', aplica: 'reassar', valores: [1, 2, 4], min: 1, max: 8, inteiro: true },
  // --- as partículas no WebGL (de dentro do disco, e a reserva sem WebGPU) ---
  { id: 'lodrho', motor: 'webgl', aplica: 'vivo', valores: [6, 12, 24], padrao: 12, min: 1, max: 64 },
  { id: 'lodk', motor: 'webgl', aplica: 'vivo', valores: [1, 4, 8, 16], padrao: 8, min: 1, max: 32, inteiro: true },
  { id: 'lodmax', motor: 'webgl', aplica: 'vivo', valores: [0.5, 1, 2, 5], min: 0.1, max: 20 },
  { id: 'lodpiso', motor: 'webgl', aplica: 'vivo', valores: [2, 6, 12], padrao: 2, min: 0.5, max: 24 },
  { id: 'lodesp', motor: 'webgl', aplica: 'vivo', valores: [0.3, 0.6, 1.2], padrao: 0.6, min: 0, max: 4 },
];

export type Laboratorio = Record<IdDoLaboratorio, number | null>;

/** tudo no padrão: nenhuma escolha à mão */
export const LABORATORIO_PADRAO: Laboratorio = Object.freeze(
  Object.fromEntries(CONTROLES_DO_LABORATORIO.map((c) => [c.id, null])) as Laboratorio
);

export function controleDoLaboratorio(id: IdDoLaboratorio): ControleDoLaboratorio {
  return CONTROLES_DO_LABORATORIO.find((c) => c.id === id)!;
}

/** o valor que vale quando o controle está no padrão (`null`) — o fixo, ou o do tier */
export function padraoDoControle(id: IdDoLaboratorio, tier: Tier): number {
  if (id === 'sorteios') return ORCAMENTO_DA_GALAXIA[tier].sorteios;
  if (id === 'lodmax') return ORCAMENTO_DA_GALAXIA[tier].tetoLodMilhoes;
  return controleDoLaboratorio(id).padrao!;
}

/** o valor que vale agora: a escolha, senão o padrão */
export function valorDoControle(lab: Laboratorio, id: IdDoLaboratorio, tier: Tier): number {
  return lab[id] ?? padraoDoControle(id, tier);
}

/** a lei da porta de um controle: número na faixa (inteiro quando pede), senão `null` */
export function lerPortaDoControle(id: IdDoLaboratorio, bruto: string | null | undefined): number | null {
  if (bruto === null || bruto === undefined || bruto.trim() === '') return null;
  const c = controleDoLaboratorio(id);
  const v = Number(bruto);
  if (!Number.isFinite(v) || v < c.min || v > c.max) return null;
  if (c.inteiro && !Number.isInteger(v)) return null;
  return v;
}

/** o laboratório que a URL pede (cada porta pela sua lei) */
export function lerLaboratorio(q: URLSearchParams): Laboratorio {
  const lab = { ...LABORATORIO_PADRAO };
  for (const c of CONTROLES_DO_LABORATORIO) lab[c.id] = lerPortaDoControle(c.id, q.get(c.id));
  return lab;
}

/** o espelho: escreve as escolhas e APAGA as portas dos controles no padrão */
export function escreverLaboratorio(q: URLSearchParams, lab: Laboratorio) {
  for (const c of CONTROLES_DO_LABORATORIO) {
    const v = lab[c.id];
    if (v === null) q.delete(c.id);
    else q.set(c.id, String(v));
  }
}

/** algum controle fora do padrão? (o selo e o "Voltar ao padrão" perguntam isto) */
export function laboratorioMexido(lab: Laboratorio): boolean {
  return CONTROLES_DO_LABORATORIO.some((c) => lab[c.id] !== null);
}

/**
 * VALE NO CAMINHO QUE DESENHA? `null` = vale; senão o motivo (chave do
 * dicionário). A clássica não é feita de partículas: nada vale. Os do
 * WebGPU só valem com o motor WebGPU desenhando; os do WebGL valem nas
 * duas galáxias de partículas (com o WebGPU, o WebGL desenha de dentro do
 * disco e na passagem para fora).
 */
export function motivoDoBloqueio(
  id: IdDoLaboratorio,
  viva: Caminho
): 'classica' | 'semWebgpu' | null {
  if (viva === 'classica') return 'classica';
  if (controleDoLaboratorio(id).motor === 'webgpu' && viva !== 'webgpu') return 'semWebgpu';
  return null;
}

/** os que só mexem nas filhas, e o teto do tier não deixa sobrar nenhuma */
const PRESOS_AO_TETO: readonly IdDoLaboratorio[] = ['lodk', 'lodesp'];

/**
 * PRESO AO TETO? (13/11/2026, medido: `capturas/controles-galaxia/apagados-medida.md`).
 * Com o Teto de pontos no do tier (ou abaixo) o teto corta as filhas
 * primeiro e não sobra nenhuma (fK = 0): Filhas no máximo e Alcance das
 * filhas não mudam um pixel, nos três tiers e em sete vistas. A Densidade
 * NÃO entra: em Alta e Performance ela ainda mexe um pouco (a busca do
 * teto parte dela, e no filme em Performance o teto nem é alcançado).
 */
export function presoAoTeto(id: IdDoLaboratorio, lab: Laboratorio, tier: Tier): boolean {
  return PRESOS_AO_TETO.includes(id) && valorDoControle(lab, 'lodmax', tier) <= padraoDoControle('lodmax', tier);
}

/** as opções do quadro do motor WebGPU que o laboratório governa */
export interface OpcoesDoLaboratorioWebgpu {
  k: number;
  borrifo: number;
  filtro: number;
  lod: number;
  fatia: number;
}

export function opcoesWebgpu(lab: Laboratorio): OpcoesDoLaboratorioWebgpu {
  const v = (id: IdDoLaboratorio) => lab[id] ?? controleDoLaboratorio(id).padrao!;
  return { k: v('filhas'), borrifo: v('borrifo'), filtro: v('filtro'), lod: v('lod'), fatia: v('fatia') };
}
