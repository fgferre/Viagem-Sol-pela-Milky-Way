// ============================================================
// A PIRÂMIDE DA POEIRA — o lado da CPU do mapa fino por níveis (E3c do
// PLAN.md; o contrato é a "DECISÃO (28/09 …)" de lá).
//
// A região fina é FIXA em volta do Sol, então cada nível é uma grade de
// tijolos (32³ voxels de núcleo + 1 de aba em cada face = 34³ gravados,
// float16) e a GPU segura só os que a câmera pede: um ATLAS 3D de vagas
// de 34³ e uma TABELA DE PÁGINAS por nível, uma entrada por tijolo. Este
// módulo decide quais tijolos, busca, guarda e solta; a etapa da GPU só
// aplica o lote que cada `atualizar` devolve:
//
//   subidas  — "vaga k ← os 34³ half-floats deste tijolo"
//   mudancas — "tabela do nível n, entrada i ← código"
//
// O lote vai INTEIRO para a GPU antes do próximo desenho: é nessa
// fronteira que vale a garantia de que nenhuma entrada aponta para uma
// vaga com outro tijolo dentro (quem perde a vaga vira AUSENTE no mesmo
// lote em que o novo sobe). A tabela inteira (`tabela(n)`) sobe uma vez,
// na criação — os OMITIDOS já vêm marcados nela.
//
// O n0 (o bloco de 20 pc) fica FORA: sempre residente, não passa aqui.
//
// COMO O DESENHO LÊ. Ponto p em pc no referencial do bloco; nível k:
// g = (p − origem)/voxel (centros de voxel em i + ½), b = ⌊g/32⌋,
// entrada = bi + nbx·(bj + nby·bk). Código ≥ PRIMEIRO_CODIGO_DE_VAGA →
// vaga v = código − 2, com origem `origemDaVaga(layout, v)`; a coordenada
// em texels do atlas é origem + (g − 32·b) + 1 — o +1 pula a aba, e é a
// aba que deixa o filtro trilinear ler só dentro da vaga.
// ============================================================
import { fetchBinary } from '../config';
import type { QualityLevel } from '../core/engine';
import { CARENCIA_DA_DESCARGA_S, RECARGAS_ATE_DESISTIR } from '../world/corpos/texturas';

export type Trio = readonly [number, number, number];

// ---- O contrato com o pipeline ------------------------------------------

/** voxels de núcleo por aresta de tijolo */
export const NUCLEO_DO_TIJOLO = 32;
/** voxels de aba em cada face — o que o trilinear lê além do núcleo */
export const ABA_DO_TIJOLO = 1;
/** aresta de uma vaga do atlas, em texels (34) */
export const LADO_DA_VAGA = NUCLEO_DO_TIJOLO + 2 * ABA_DO_TIJOLO;
/** half-floats de um tijolo gravado (34³) */
export const VOXELS_POR_TIJOLO = LADO_DA_VAGA ** 3;
/** bytes de um tijolo decodificado (78.608) */
export const BYTES_POR_TIJOLO = VOXELS_POR_TIJOLO * 2;

/** tabela: nada residente — o desenho desce ao nível de cima */
export const CODIGO_AUSENTE = 0;
/** tabela: o pipeline omitiu o tijolo porque o trilinear do pai já é o
 *  dado ali (resíduo < 1e-3 E/pc) — descer ao pai é exato */
export const CODIGO_OMITIDO = 1;
/** tabela: a vaga k residente é `PRIMEIRO_CODIGO_DE_VAGA + k` */
export const PRIMEIRO_CODIGO_DE_VAGA = 2;

// ---- A política: os números num lugar só --------------------------------

/**
 * Até onde cada nível é DESEJADO: distância da câmera ao CENTRO do
 * tijolo, em pc, por número de nível [n0, n1, n2, n3]. O n0 é sempre
 * residente e fica fora daqui; o n1 vai a 700 porque o raymarch vai a
 * 650. O desenho usa os MESMOS raios para escolher o nível por ponto
 * (`raiosDoNivel` em world/nebula.ts, uniforms — trocar de preset não
 * recompila) — residente não quer dizer desejado (a carência segura
 * tijolos fora do raio por 15 s). Estes são os do Performance e o
 * padrão de `montarOrcamento`; o do computador vem abaixo.
 */
export const RAIO_DESEJADO_PC: readonly number[] = [Infinity, 700, 400, 150];
/**
 * Os raios do Cinema e do Alta (E3c, 28/09: o máximo de detalhe no Mac
 * primeiro). Com os de cima o n3 só era lido até ~81 pc da câmera — de
 * casa, quase tudo dentro do furo de 68,8 pc e da Bolha Local. Estes
 * põem o fim efetivo das rampas (raio − meia diagonal do tijolo) em
 * ~200 / ~400 / ~620 pc. Contados nos índices reais, os desejados cabem
 * nas 256 vagas: 252 em casa, 251 / 230 / 207 no corredor do filme
 * (t = 40 / 60 / 75); o pior ponto da região fina (varredura de 50 em
 * 50 pc até 400 pc do Sol) pede 263 — os 7 mais longes ficam no nível de
 * cima, pela prioridade da residência, nunca um buraco.
 */
export const RAIO_DESEJADO_NO_COMPUTADOR_PC: readonly number[] = [Infinity, 900, 540, 270];
/**
 * Um tijolo inteiro ATRÁS da câmera conta a distância vezes isto. Na
 * mesma distância a frente vem antes; o que está colado atrás ainda vence
 * o que está longe na frente, porque a câmera vira.
 */
export const FATOR_ATRAS = 2;
/** buscas simultâneas — 4 deixa folga na conexão para o resto da casa */
export const CONCORRENCIA_DE_BUSCA = 4;
/** teto de subidas por `atualizar`: a volta de dentro do cache pode pedir
 *  dezenas de uma vez, e cada uma são 77 kB de texSubImage3D no quadro */
export const SUBIDAS_POR_ATUALIZACAO = 8;
/** espera antes de tentar de novo um tijolo que falhou; dobra a cada
 *  falha, até `RECARGAS_ATE_DESISTIR` recargas (a regra das texturas) */
export const ESPERA_APOS_FALHA_S = 4;
/**
 * Vagas do atlas (R16F, 77 kB cada: 256 ≈ 20 MB), teto do cache de
 * tijolos decodificados na CPU e raios desejados, por tier. O cache passa
 * das vagas porque guarda também quem perdeu a vaga e ainda está na
 * carência — é ele que poupa a rede quando a câmera volta.
 */
export const ORCAMENTO_POR_TIER: Record<
  QualityLevel,
  { vagas: number; cacheMiB: number; raiosPc: readonly number[] }
> = {
  cinema: { vagas: 256, cacheMiB: 32, raiosPc: RAIO_DESEJADO_NO_COMPUTADOR_PC },
  alta: { vagas: 256, cacheMiB: 32, raiosPc: RAIO_DESEJADO_NO_COMPUTADOR_PC },
  performance: { vagas: 128, cacheMiB: 16, raiosPc: RAIO_DESEJADO_PC },
};
/** MAX_3D_TEXTURE_SIZE mínimo do WebGL2 — o teto quando a sonda não leu */
const TETO_3D_SEM_SONDA = 256;

// ---- Orçamento e forma do atlas -----------------------------------------

export interface LayoutDoAtlas {
  /** a vaga k mora em (k % sx, ⌊k/sx⌋ % sy, ⌊k/(sx·sy)⌋) */
  vagasPorEixo: Trio;
  /** tamanho da textura 3D do atlas, em texels */
  texels: Trio;
}

export interface OrcamentoDaPiramide {
  vagas: number;
  cacheBytes: number;
  layout: LayoutDoAtlas;
  /** até onde cada nível é desejado, por número de nível [n0, n1, n2, n3]
   *  — a residência e as rampas do shader leem daqui */
  raiosPc: readonly number[];
}

/** o orçamento de um tier, limitado pelo que a sonda leu do aparelho
 *  (`sondarGl().max3DTextureSize`) */
export function orcamentoDaPiramide(
  tier: QualityLevel,
  max3DTextureSize?: number
): OrcamentoDaPiramide {
  const { vagas, cacheMiB, raiosPc } = ORCAMENTO_POR_TIER[tier];
  return montarOrcamento(vagas, cacheMiB * 2 ** 20, max3DTextureSize, raiosPc);
}

/** o mesmo orçamento no ar — vagas, cache e raios iguais: trocar de tier
 *  entre dois assim (cinema ↔ alta) não remonta nada */
export function mesmoOrcamento(a: OrcamentoDaPiramide, b: OrcamentoDaPiramide): boolean {
  return (
    a.vagas === b.vagas &&
    a.cacheBytes === b.cacheBytes &&
    a.raiosPc.length === b.raiosPc.length &&
    a.raiosPc.every((r, i) => r === b.raiosPc[i])
  );
}

/**
 * A menor caixa de vagas (sx ≥ sy ≥ sz, cada eixo ≤ teto/34) que cabe o
 * pedido; no empate, a mais cúbica. Sem sonda legível o teto é o mínimo
 * do WebGL2 — errar para baixo é barato, estourar o driver é tela preta.
 */
export function montarOrcamento(
  vagasPedidas: number,
  cacheBytes: number,
  max3DTextureSize?: number,
  raiosPc: readonly number[] = RAIO_DESEJADO_PC
): OrcamentoDaPiramide {
  const teto =
    typeof max3DTextureSize === 'number' && Number.isFinite(max3DTextureSize) && max3DTextureSize > 0
      ? max3DTextureSize
      : TETO_3D_SEM_SONDA;
  const porEixo = Math.floor(teto / LADO_DA_VAGA);
  const vagas = Math.max(
    0,
    Math.min(Math.floor(vagasPedidas), porEixo ** 3, 0xffff - PRIMEIRO_CODIGO_DE_VAGA)
  );
  let melhor: Trio = [0, 0, 0];
  let menorVolume = vagas > 0 ? Infinity : 0;
  for (let sz = 1; vagas > 0 && sz <= porEixo; sz++) {
    for (let sy = sz; sy <= porEixo; sy++) {
      const sx = Math.max(sy, Math.ceil(vagas / (sy * sz)));
      if (sx > porEixo) continue;
      const volume = sx * sy * sz;
      if (volume < menorVolume || (volume === menorVolume && sx < melhor[0])) {
        melhor = [sx, sy, sz];
        menorVolume = volume;
      }
    }
  }
  return {
    vagas,
    cacheBytes,
    layout: {
      vagasPorEixo: melhor,
      texels: [melhor[0] * LADO_DA_VAGA, melhor[1] * LADO_DA_VAGA, melhor[2] * LADO_DA_VAGA],
    },
    raiosPc,
  };
}

/** a quina da vaga no atlas, em texels */
export function origemDaVaga(layout: LayoutDoAtlas, vaga: number): Trio {
  const [sx, sy] = layout.vagasPorEixo;
  return [
    (vaga % sx) * LADO_DA_VAGA,
    (Math.floor(vaga / sx) % sy) * LADO_DA_VAGA,
    Math.floor(vaga / (sx * sy)) * LADO_DA_VAGA,
  ];
}

// ---- Os índices dos níveis ----------------------------------------------

export interface NivelDaPiramide {
  /** 1 = 10 pc, 2 = 5 pc, 3 = 2,5 pc */
  nivel: number;
  voxelPc: number;
  origemPc: Trio;
  /** voxels por eixo */
  dims: Trio;
  /** ⌈dims/32⌉ — também as dimensões da tabela de páginas */
  dimsEmTijolos: Trio;
  /** raio da região do nível em volta do Sol; Infinity = a caixa inteira */
  raioPc: number;
  /** o valor gravado é E/pc × escala */
  escala: number;
  /** índices (bi + nbx·(bj + nby·bk)) dos tijolos GRAVADOS */
  gravados: ReadonlySet<number>;
  /** pasta dos tijolos relativa à base do site: a do índice, sem `.json` */
  pasta: string;
}

export interface PiramideDePoeira {
  /** n1, n2, … consecutivos, cada um metade do voxel do anterior */
  niveis: readonly NivelDaPiramide[];
}

const ehInteiro = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const ehFinito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ehPositivo = (v: unknown): v is number => ehFinito(v) && v > 0;

function lerTrio(v: unknown, ok: (x: unknown) => x is number, erro: () => Error): Trio {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(ok)) throw erro();
  return [v[0], v[1], v[2]];
}

/**
 * Lê `dust-piramide/n<k>.json` — os campos que o pipeline grava
 * (`scripts/data/build-dust-volumes.mjs`, 28/09) e que o motor usa:
 * `level`, `parent` ({ level: k − 1, … } ou o número; opcional),
 * `voxelPc`, `originPc` [3], `dims` [3] em voxels, `brickDims` [3]
 * (opcional, conferido contra ⌈dims/32⌉), `brickCore` 32 e `brickHalo` 1
 * (opcionais), `radiusPc` (null = a caixa inteira), `scale`, `type`
 * 'float16' (opcional) e `bricks: [{ b: [bi, bj, bk], … }]`. Forma
 * diferente lança — quem chama transforma em "nível indisponível". O
 * sha256 e os bytes ficam com o verificador offline, como nos outros
 * ativos (ver `galacticAssets.ts`).
 */
export function lerIndiceDeNivel(json: unknown, pasta: string): NivelDaPiramide {
  const o = (typeof json === 'object' && json !== null ? json : {}) as Record<string, unknown>;
  const falha = (oQue: string) => new Error(`${pasta}.json: ${oQue}`);
  const nivel = o.level;
  if (!ehInteiro(nivel) || nivel < 1) throw falha('"level" não é um nível ≥ 1.');
  const pai =
    typeof o.parent === 'object' && o.parent !== null ? (o.parent as { level?: unknown }).level : o.parent;
  if (pai !== undefined && pai !== nivel - 1) throw falha(`"parent" ${String(pai)} não é o nível ${nivel - 1}.`);
  const voxelPc = o.voxelPc;
  if (!ehPositivo(voxelPc)) throw falha('"voxelPc" inválido.');
  const origemPc = lerTrio(o.originPc, ehFinito, () => falha('"originPc" inválido.'));
  const dims = lerTrio(o.dims, (v): v is number => ehInteiro(v) && v > 0, () => falha('"dims" inválido.'));
  if (
    (o.brickCore ?? NUCLEO_DO_TIJOLO) !== NUCLEO_DO_TIJOLO ||
    (o.brickHalo ?? ABA_DO_TIJOLO) !== ABA_DO_TIJOLO
  ) {
    throw falha(`tijolo ${String(o.brickCore)} + aba ${String(o.brickHalo)} fora do contrato (32 + 1).`);
  }
  const dimsEmTijolos: Trio = [
    Math.ceil(dims[0] / NUCLEO_DO_TIJOLO),
    Math.ceil(dims[1] / NUCLEO_DO_TIJOLO),
    Math.ceil(dims[2] / NUCLEO_DO_TIJOLO),
  ];
  if (o.brickDims !== undefined) {
    const declarados = lerTrio(o.brickDims, ehInteiro, () => falha('"brickDims" inválido.'));
    if (declarados.some((n, a) => n !== dimsEmTijolos[a])) throw falha('"brickDims" não é ⌈dims/32⌉.');
  }
  let raioPc = Infinity;
  if (o.radiusPc !== undefined && o.radiusPc !== null) {
    if (!ehPositivo(o.radiusPc)) throw falha('"radiusPc" inválido.');
    raioPc = o.radiusPc;
  }
  const escala = o.scale;
  if (!ehPositivo(escala)) throw falha('"scale" inválido.');
  if (o.type !== undefined && o.type !== 'float16') throw falha(`tipo "${String(o.type)}" não é float16.`);
  if (!Array.isArray(o.bricks)) throw falha('sem a lista "bricks".');
  const [nbx, nby, nbz] = dimsEmTijolos;
  const gravados = new Set<number>();
  for (const tijolo of o.bricks as unknown[]) {
    const b = lerTrio((tijolo as { b?: unknown } | null)?.b, ehInteiro, () => falha('"bricks[].b" inválido.'));
    if (b[0] < 0 || b[1] < 0 || b[2] < 0 || b[0] >= nbx || b[1] >= nby || b[2] >= nbz) {
      throw falha(`tijolo ${b.join('_')} fora da grade.`);
    }
    gravados.add(b[0] + nbx * (b[1] + nby * b[2]));
  }
  return { nivel, voxelPc, origemPc, dims, dimsEmTijolos, raioPc, escala, gravados, pasta };
}

/** o filho divide cada voxel do pai em 2×2×2, a partir da mesma quina */
function encaixa(pai: NivelDaPiramide, filho: NivelDaPiramide): boolean {
  return filho.voxelPc * 2 === pai.voxelPc && filho.origemPc.every((v, a) => v === pai.origemPc[a]);
}

/**
 * Baixa os índices listados no `dustPyramid` (topo do manifesto, fora de
 * `assets`) — dele só se lê `levels: [{ level, index }]`, `index`
 * relativo à base como o `file` de todo ativo — e devolve os níveis que
 * encaixam, a partir
 * do n1: um nível que falha corta ele e os de baixo. Carga opcional como
 * a do bloco de 20 pc: nunca lança (nem AbortError); qualquer falha é
 * `null`, e o n0 segue sozinho. Sem DecompressionStream os tijolos (só
 * `.gz` no ar) não abrem, então nem os índices descem.
 */
export async function carregarPiramideDePoeira(
  base: string,
  descritor: unknown,
  signal?: AbortSignal
): Promise<PiramideDePoeira | null> {
  try {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('sem DecompressionStream — os tijolos só existem em .gz.');
    }
    const lista = (descritor as { levels?: unknown } | null)?.levels;
    if (!Array.isArray(lista) || lista.length === 0) throw new Error('manifesto sem os níveis da pirâmide.');
    const entradas = (lista as unknown[])
      .map((e) => {
        const { level, index: file } = (e ?? {}) as { level?: unknown; index?: unknown };
        if (!ehInteiro(level) || typeof file !== 'string' || !file.endsWith('.json')) {
          throw new Error('entrada de nível inválida no manifesto.');
        }
        return { level, file };
      })
      .sort((a, b) => a.level - b.level);
    const lidos = await Promise.allSettled(
      entradas.map(async ({ file }) => {
        const resposta = await fetch(`${base}${file}`, { signal });
        if (!resposta.ok) throw new Error(`${file}: HTTP ${resposta.status}`);
        return lerIndiceDeNivel(await resposta.json(), file.slice(0, -'.json'.length));
      })
    );
    const niveis: NivelDaPiramide[] = [];
    for (const lido of lidos) {
      if (lido.status === 'rejected') {
        if (!signal?.aborted) console.warn('[poeira] nível da pirâmide indisponível — ela para no nível acima.', lido.reason);
        break;
      }
      const nivel = lido.value;
      const pai = niveis.at(-1);
      if (nivel.nivel !== niveis.length + 1 || (pai && !encaixa(pai, nivel))) {
        console.warn(`[poeira] n${nivel.nivel} não encaixa na pirâmide — ela para no nível acima.`);
        break;
      }
      niveis.push(nivel);
    }
    if (niveis.length === 0) throw new Error('nenhum nível utilizável.');
    return { niveis };
  } catch (error) {
    if (!signal?.aborted) console.warn('[poeira] pirâmide indisponível — o bloco de 20 pc segue sozinho.', error);
    return null;
  }
}

/** De onde vêm os bytes de um tijolo — a rede em produção, falsa nos testes. */
export interface FonteDeTijolos {
  buscar(
    nivel: NivelDaPiramide,
    bi: number,
    bj: number,
    bk: number,
    sinal: AbortSignal
  ): Promise<Uint16Array>;
}

/**
 * A fonte dos arquivos reais: `<pasta>/<bi>_<bj>_<bk>.bin` pelo irmão
 * `.gz` (`fetchBinary`). Só o `.gz` é publicado, então um tijolo que
 * falta custa dois pedidos (o `.gz` e o cru) — a falha contada da
 * residência não deixa isso virar tempestade.
 */
export function fonteDaRede(base: string): FonteDeTijolos {
  return {
    async buscar(nivel, bi, bj, bk, sinal) {
      const arquivo = `${nivel.pasta}/${bi}_${bj}_${bk}.bin`;
      const buffer = await fetchBinary(`${base}${arquivo}`, sinal);
      if (buffer.byteLength !== BYTES_POR_TIJOLO) {
        throw new Error(`${arquivo}: ${buffer.byteLength} bytes; o tijolo tem ${BYTES_POR_TIJOLO}.`);
      }
      return new Uint16Array(buffer);
    },
  };
}

// ---- A residência --------------------------------------------------------

export interface CameraDaPoeira {
  /** pc, no referencial do bloco: heliocêntrico galáctico, x → centro
   *  galáctico, y → l = 90°, z → polo norte */
  posicaoPc: Trio;
  /** para onde a câmera olha, no mesmo referencial (qualquer comprimento) */
  frente: Trio;
}

export interface Subida {
  vaga: number;
  /** quina da vaga no atlas, em texels */
  origemTexel: Trio;
  nivel: number;
  tijolo: Trio;
  /** 34³ half-floats crus (bits de float16), x mais rápido */
  dados: Uint16Array;
}

export interface MudancaNaTabela {
  nivel: number;
  /** bi + nbx·(bj + nby·bk) */
  indice: number;
  codigo: number;
}

export interface LoteParaGpu {
  subidas: Subida[];
  mudancas: MudancaNaTabela[];
}

export interface ResumoDaResidencia {
  /** dentro do raio do nível e gravados */
  desejados: number;
  residentes: number;
  emVoo: number;
  /** do alvo, sem vaga ainda (sem contar os que desistiram) */
  pendentes: number;
  bytesEmCache: number;
  /** tijolos que esgotaram as tentativas nesta sessão */
  desistidos: number;
}

interface Registro {
  readonly chave: number;
  readonly nivel: NivelDaPiramide;
  readonly indice: number;
  readonly tijolo: Trio;
  /** a cópia decodificada na CPU (o cache) */
  dados: Uint16Array | null;
  /** −1 = fora do atlas */
  vaga: number;
  /** quando saiu do alvo (relógio do app); null = no alvo */
  foraDoAlvoDesde: number | null;
  /** o pedido que vale — resposta de qualquer outro é descartada */
  emVoo: AbortController | null;
  falhas: number;
  /** Infinity = desistiu pela sessão */
  tentarApos: number;
}

interface Candidato {
  readonly chave: number;
  readonly nivel: NivelDaPiramide;
  readonly indice: number;
  readonly tijolo: Trio;
  /** distância da câmera à caixa, × FATOR_ATRAS se inteira atrás */
  readonly prioridade: number;
}

const SOL: Trio = [0, 0, 0];

const chaveDe = (nivel: number, indice: number) => nivel * 2 ** 24 + indice;

/** o núcleo do tijolo (cortado na borda da grade) visto da câmera */
function medirTijolo(n: NivelDaPiramide, tijolo: Trio, p: Trio, f: Trio) {
  let centro2 = 0;
  let caixa2 = 0;
  let projecao = 0;
  let alcance = 0;
  for (let a = 0; a < 3; a++) {
    const lo = n.origemPc[a] + tijolo[a] * NUCLEO_DO_TIJOLO * n.voxelPc;
    const hi = n.origemPc[a] + Math.min((tijolo[a] + 1) * NUCLEO_DO_TIJOLO, n.dims[a]) * n.voxelPc;
    const c = (lo + hi) / 2 - p[a];
    centro2 += c * c;
    const fora = Math.max(lo - p[a], 0, p[a] - hi);
    caixa2 += fora * fora;
    projecao += c * f[a];
    alcance += ((hi - lo) / 2) * Math.abs(f[a]);
  }
  // algum ponto da caixa tem projeção ≥ 0 no olhar → não está inteiro atrás
  return { dCentro: Math.sqrt(centro2), dCaixa: Math.sqrt(caixa2), naFrente: projecao + alcance >= 0 };
}

function montarTabela(n: NivelDaPiramide): Uint16Array {
  const [nbx, nby, nbz] = n.dimsEmTijolos;
  const tabela = new Uint16Array(nbx * nby * nbz); // zeros = AUSENTE
  for (let bk = 0; bk < nbz; bk++) {
    for (let bj = 0; bj < nby; bj++) {
      for (let bi = 0; bi < nbx; bi++) {
        const indice = bi + nbx * (bj + nby * bk);
        // dentro da região e não gravado = omitido; fora dela não existe
        if (!n.gravados.has(indice) && medirTijolo(n, [bi, bj, bk], SOL, SOL).dCaixa <= n.raioPc) {
          tabela[indice] = CODIGO_OMITIDO;
        }
      }
    }
  }
  return tabela;
}

/**
 * QUEM FICA NO ATLAS. Um `atualizar` por quadro (relógio de parede do
 * app, como a carência das texturas dos corpos) com a câmera:
 *
 *  1. desejados = gravados cujo centro está no raio do nível, em ordem
 *     de prioridade (distância à caixa, ×FATOR_ATRAS se atrás; empate:
 *     o nível mais grosso, depois o índice). Como a caixa do pai contém
 *     a do filho, o pai nunca vem depois do filho. O ALVO são os
 *     primeiros que cabem nas vagas.
 *  2. quem sai do alvo começa a CARÊNCIA; busca de quem nem é mais
 *     desejado é cancelada na hora (não há pixel a preservar); carência
 *     vencida solta a vaga e os bytes.
 *  3. o alvo que já tem bytes ganha vaga, por prioridade: vaga livre, ou
 *     a do residente MENOS ÚTIL fora do alvo (fora do raio pior que
 *     dentro; entre os de fora, o mais longe em raios do seu nível).
 *  4. o cache de bytes acima do teto solta os menos úteis.
 *  5. buscas novas, do alvo, por prioridade, até a concorrência.
 *
 * As chegadas da rede só guardam bytes; vaga e tabela mudam só aqui, na
 * ordem de prioridade — por isso o lote não depende da ordem de chegada.
 */
export class ResidenciaDaPiramide {
  readonly layout: LayoutDoAtlas;
  private readonly piramide: PiramideDePoeira;
  private readonly fonte: FonteDeTijolos;
  private readonly vagas: number;
  private readonly cacheBytes: number;
  /** os raios desejados do orçamento, por número de nível */
  private readonly raiosPc: readonly number[];
  private readonly tabelas = new Map<NivelDaPiramide, Uint16Array>();
  private readonly registros = new Map<number, Registro>();
  private readonly ocupante: (Registro | null)[];
  private bytesEmCache = 0;
  private emVoo = 0;
  private desistidos = 0;
  private avisouDesistencia = false;
  private agoraS = 0;
  private desejadosAgora = 0;
  private pendentesAgora = 0;
  private disposto = false;

  constructor(piramide: PiramideDePoeira, orcamento: OrcamentoDaPiramide, fonte: FonteDeTijolos) {
    this.piramide = piramide;
    this.fonte = fonte;
    this.vagas = orcamento.vagas;
    this.cacheBytes = orcamento.cacheBytes;
    this.raiosPc = orcamento.raiosPc;
    this.layout = orcamento.layout;
    this.ocupante = new Array<Registro | null>(this.vagas).fill(null);
    for (const n of piramide.niveis) this.tabelas.set(n, montarTabela(n));
  }

  /** o conteúdo vivo da tabela de páginas do nível (para a subida inicial) */
  tabela(nivel: number): Uint16Array | undefined {
    const n = this.piramide.niveis.find((x) => x.nivel === nivel);
    return n && this.tabelas.get(n);
  }

  /** há busca no ar ou tijolo do alvo sem vaga — a captura espera */
  get carregando(): boolean {
    return this.emVoo > 0 || this.pendentesAgora > 0;
  }

  resumo(): ResumoDaResidencia {
    return {
      desejados: this.desejadosAgora,
      residentes: this.ocupante.reduce((soma, r) => soma + (r ? 1 : 0), 0),
      emVoo: this.emVoo,
      pendentes: this.pendentesAgora,
      bytesEmCache: this.bytesEmCache,
      desistidos: this.desistidos,
    };
  }

  atualizar(tS: number, camera: CameraDaPoeira): LoteParaGpu {
    const lote: LoteParaGpu = { subidas: [], mudancas: [] };
    const p = camera.posicaoPc;
    if (this.disposto || !Number.isFinite(tS) || !p.every(Number.isFinite)) return lote;
    const f: Trio = camera.frente.every(Number.isFinite) ? camera.frente : SOL;
    this.agoraS = tS;

    // 1. desejados e alvo (quem desistiu não ocupa lugar no alvo)
    const desejados = this.listarDesejados(p, f);
    const chavesDesejadas = new Set<number>();
    const alvo: Candidato[] = [];
    const noAlvo = new Set<number>();
    for (const c of desejados) {
      chavesDesejadas.add(c.chave);
      if (alvo.length < this.vagas && this.registros.get(c.chave)?.tentarApos !== Infinity) {
        alvo.push(c);
        noAlvo.add(c.chave);
      }
    }

    // 2. carência, cancelamento, descarga
    for (const reg of this.registros.values()) {
      if (noAlvo.has(reg.chave)) {
        reg.foraDoAlvoDesde = null;
        continue;
      }
      reg.foraDoAlvoDesde ??= tS;
      if (reg.emVoo && !chavesDesejadas.has(reg.chave)) this.cancelar(reg);
      if (tS - reg.foraDoAlvoDesde >= CARENCIA_DA_DESCARGA_S) {
        if (reg.vaga >= 0) this.desocupar(reg, lote);
        this.soltarDados(reg);
      }
      this.esquecerSeVazio(reg);
    }

    // 3. vagas para o alvo que já tem bytes
    let vitimas: Registro[] | null = null;
    let subidas = 0;
    for (const c of alvo) {
      if (subidas >= SUBIDAS_POR_ATUALIZACAO) break;
      const reg = this.registros.get(c.chave);
      if (!reg || !reg.dados || reg.vaga >= 0) continue;
      let vaga = this.ocupante.indexOf(null);
      if (vaga < 0) {
        vitimas ??= this.ordenarPorUtilidade(
          this.ocupante.filter((r): r is Registro => r !== null && !noAlvo.has(r.chave)),
          p,
          f
        );
        const vitima = vitimas.pop();
        if (!vitima) break; // não acontece: o alvo nunca passa das vagas
        vaga = vitima.vaga;
        this.desocupar(vitima, lote);
        this.esquecerSeVazio(vitima);
      }
      this.ocupar(reg, reg.dados, vaga, lote);
      subidas += 1;
    }

    // 4. teto do cache decodificado
    if (this.bytesEmCache > this.cacheBytes) this.aparar(noAlvo, p, f);

    // 5. buscas novas
    for (const c of alvo) {
      if (this.emVoo >= CONCORRENCIA_DE_BUSCA) break;
      const reg = this.registros.get(c.chave);
      if (reg && (reg.dados || reg.vaga >= 0 || reg.emVoo || tS < reg.tentarApos)) continue;
      this.buscar(reg ?? this.registrar(c));
    }

    this.desejadosAgora = desejados.length;
    this.pendentesAgora = 0;
    for (const c of alvo) {
      const reg = this.registros.get(c.chave);
      if (!reg || reg.vaga < 0) this.pendentesAgora += 1;
    }
    return lote;
  }

  /** para tudo: buscas abortadas, nada mais pousa */
  descartar(): void {
    this.disposto = true;
    for (const reg of this.registros.values()) reg.emVoo?.abort();
    this.registros.clear();
    this.ocupante.fill(null);
    this.bytesEmCache = 0;
    this.emVoo = 0;
  }

  private listarDesejados(p: Trio, f: Trio): Candidato[] {
    const lista: Candidato[] = [];
    for (const n of this.piramide.niveis) {
      const raio = this.raiosPc[n.nivel] ?? 0;
      if (!(raio > 0)) continue;
      const ladoPc = NUCLEO_DO_TIJOLO * n.voxelPc;
      const [nbx, nby, nbz] = n.dimsEmTijolos;
      // só a faixa de tijolos que a esfera do raio alcança
      const de = (a: number) => Math.max(0, Math.floor((p[a] - raio - n.origemPc[a]) / ladoPc));
      const ate = (a: number, nb: number) =>
        Math.min(nb - 1, Math.floor((p[a] + raio - n.origemPc[a]) / ladoPc));
      const [i0, i1, j0, j1, k0, k1] = [de(0), ate(0, nbx), de(1), ate(1, nby), de(2), ate(2, nbz)];
      for (let bk = k0; bk <= k1; bk++) {
        for (let bj = j0; bj <= j1; bj++) {
          for (let bi = i0; bi <= i1; bi++) {
            const indice = bi + nbx * (bj + nby * bk);
            if (!n.gravados.has(indice)) continue;
            const tijolo: Trio = [bi, bj, bk];
            const m = medirTijolo(n, tijolo, p, f);
            if (m.dCentro > raio) continue;
            lista.push({
              chave: chaveDe(n.nivel, indice),
              nivel: n,
              indice,
              tijolo,
              prioridade: m.naFrente ? m.dCaixa : m.dCaixa * FATOR_ATRAS,
            });
          }
        }
      }
    }
    return lista.sort(
      (a, b) => a.prioridade - b.prioridade || a.nivel.nivel - b.nivel.nivel || a.indice - b.indice
    );
  }

  /** do mais útil ao menos útil: desejado (pela prioridade) antes de fora
   *  do raio (pela distância em raios do nível); empate: o mais grosso */
  private ordenarPorUtilidade(regs: Registro[], p: Trio, f: Trio): Registro[] {
    return regs
      .map((reg) => {
        const m = medirTijolo(reg.nivel, reg.tijolo, p, f);
        const raio = this.raiosPc[reg.nivel.nivel] ?? 0;
        return m.dCentro <= raio
          ? { reg, classe: 0, chave: m.naFrente ? m.dCaixa : m.dCaixa * FATOR_ATRAS }
          : { reg, classe: 1, chave: raio > 0 ? m.dCentro / raio : Infinity };
      })
      .sort(
        (a, b) =>
          a.classe - b.classe ||
          a.chave - b.chave ||
          a.reg.nivel.nivel - b.reg.nivel.nivel ||
          a.reg.indice - b.reg.indice
      )
      .map((u) => u.reg);
  }

  private aparar(noAlvo: Set<number>, p: Trio, f: Trio): void {
    // o alvo que espera vaga (teto de subidas) não perde os bytes: seria
    // buscar de novo o que já chegou
    const candidatos = [...this.registros.values()].filter(
      (r) => r.dados !== null && !(noAlvo.has(r.chave) && r.vaga < 0)
    );
    const ordem = this.ordenarPorUtilidade(candidatos, p, f);
    while (this.bytesEmCache > this.cacheBytes) {
      const reg = ordem.pop();
      if (!reg) break;
      this.soltarDados(reg);
      this.esquecerSeVazio(reg);
    }
  }

  private registrar(c: Candidato): Registro {
    const reg: Registro = {
      chave: c.chave,
      nivel: c.nivel,
      indice: c.indice,
      tijolo: c.tijolo,
      dados: null,
      vaga: -1,
      foraDoAlvoDesde: null,
      emVoo: null,
      falhas: 0,
      tentarApos: -Infinity,
    };
    this.registros.set(c.chave, reg);
    return reg;
  }

  private buscar(reg: Registro): void {
    const aborto = new AbortController();
    reg.emVoo = aborto;
    this.emVoo += 1;
    let promessa: Promise<Uint16Array>;
    try {
      promessa = this.fonte.buscar(reg.nivel, reg.tijolo[0], reg.tijolo[1], reg.tijolo[2], aborto.signal);
    } catch (erro) {
      promessa = Promise.reject(erro);
    }
    void promessa.then(
      (dados) => this.chegou(reg, aborto, dados),
      (erro: unknown) => this.falhou(reg, aborto, erro)
    );
  }

  private chegou(reg: Registro, aborto: AbortController, dados: Uint16Array): void {
    // cancelada, vencida ou descartada: nada pousa
    if (this.disposto || reg.emVoo !== aborto) return;
    if (!(dados instanceof Uint16Array) || dados.length !== VOXELS_POR_TIJOLO) {
      this.falhou(reg, aborto, new Error(`tijolo com ${String(dados?.length)} voxels; o contrato tem ${VOXELS_POR_TIJOLO}.`));
      return;
    }
    reg.emVoo = null;
    this.emVoo -= 1;
    reg.dados = dados;
    this.bytesEmCache += dados.byteLength;
    reg.falhas = 0;
    reg.tentarApos = -Infinity;
  }

  private falhou(reg: Registro, aborto: AbortController, erro: unknown): void {
    // o aborto que nós mesmos pedimos não é falha
    if (this.disposto || reg.emVoo !== aborto) return;
    reg.emVoo = null;
    this.emVoo -= 1;
    reg.falhas += 1;
    if (reg.falhas <= RECARGAS_ATE_DESISTIR) {
      reg.tentarApos = this.agoraS + ESPERA_APOS_FALHA_S * 2 ** (reg.falhas - 1);
      return;
    }
    reg.tentarApos = Infinity;
    this.desistidos += 1;
    if (!this.avisouDesistencia) {
      this.avisouDesistencia = true;
      console.warn(
        `[poeira] tijolo n${reg.nivel.nivel} ${reg.tijolo.join('_')} falhou ${1 + RECARGAS_ATE_DESISTIR}×; ` +
          'o nível de cima cobre ali pela sessão (outros que desistirem não avisam de novo).',
        erro
      );
    }
  }

  private cancelar(reg: Registro): void {
    reg.emVoo?.abort();
    reg.emVoo = null;
    this.emVoo -= 1;
  }

  private ocupar(reg: Registro, dados: Uint16Array, vaga: number, lote: LoteParaGpu): void {
    this.ocupante[vaga] = reg;
    reg.vaga = vaga;
    lote.subidas.push({
      vaga,
      origemTexel: origemDaVaga(this.layout, vaga),
      nivel: reg.nivel.nivel,
      tijolo: reg.tijolo,
      dados,
    });
    this.escrever(reg, PRIMEIRO_CODIGO_DE_VAGA + vaga, lote);
  }

  private desocupar(reg: Registro, lote: LoteParaGpu): void {
    this.ocupante[reg.vaga] = null;
    reg.vaga = -1;
    this.escrever(reg, CODIGO_AUSENTE, lote);
  }

  private escrever(reg: Registro, codigo: number, lote: LoteParaGpu): void {
    const tabela = this.tabelas.get(reg.nivel);
    if (!tabela) return;
    tabela[reg.indice] = codigo;
    lote.mudancas.push({ nivel: reg.nivel.nivel, indice: reg.indice, codigo });
  }

  private soltarDados(reg: Registro): void {
    if (!reg.dados) return;
    this.bytesEmCache -= reg.dados.byteLength;
    reg.dados = null;
  }

  /** sem bytes, sem vaga, sem busca e sem falha a lembrar: some */
  private esquecerSeVazio(reg: Registro): void {
    if (!reg.dados && reg.vaga < 0 && !reg.emVoo && reg.falhas === 0) this.registros.delete(reg.chave);
  }
}
