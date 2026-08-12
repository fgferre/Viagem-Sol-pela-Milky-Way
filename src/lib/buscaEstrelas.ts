// ============================================================
// Busca das estrelas nomeadas — biblioteca PURA (Onda 5, fase F3).
// Alcance pela Decisão D4 do desenho: só as 1.726 de `meta.named`.
// Nada de fetch, de three e de React aqui — o array `named` entra
// injetado e a UI da F3 monta a paleta em cima do que sai.
//
// PROVENIÊNCIA (PLANO-ATLAS §2, linha `hygNameIndex` — "Renasce"): do
// doador atlas-orbital vem a INTENÇÃO — normalização NFD (teclado
// pt-BR digita sem acento), rubrica de score de 4 degraus, chave dupla
// abreviação/glifo grego. O código é novo e o dado é OUTRO: a casa
// guarda UM nome por estrela em `NamedStar.n` (nome próprio IAU quando
// existe, senão a designação de Bayer já em glifo), não as colunas
// `proper`/`bayer`/`con` do HYG.
//
// FICA DE FORA, declarado: a varredura linear das chaves HD/HIP em
// massa (medido no doador: 206k chaves = 27-32 ms POR TECLA no
// desktop). Aqui `hd`/`hip` são `Map` direto — a consulta numérica sai
// por acesso único, sem tocar as chaves de texto. O preço declarado: a
// numérica só acende COMPLETA ("hd 4891" não é prefixo de nada), que é
// o contrato da D4. A varredura de texto sobrevive porque o alcance é
// 1.726 estrelas (~5k chaves), não 328k.
//
// ADAPTAÇÃO DECLARADA: o doador guardava a abreviação ("Alp") e
// acrescentava o glifo; aqui é o inverso — o dado já traz "α Cen", e a
// chave irmã é a que se DIGITA. São duas: a abreviação de catálogo
// ("alp cen") e o nome pt-BR da letra ("alfa cen", o caso de teste que
// o desenho da onda nomeia). O sobrescrito de Bayer (γ² Vel) cai nas
// chaves irmãs e vira dígito ASCII na normalização.
// ============================================================
import type { NamedStar } from '../three/config';

export interface ResultadoBusca {
  /** posição na array `named` recebida — é por ela que a UI visita */
  indice: number;
  estrela: NamedStar;
  score: number;
}

export interface IndiceEstrelas {
  nomeadas: readonly NamedStar[];
  /** chave normalizada → estrelas (uma chave irmã pode servir a duas) */
  porChave: Map<string, number[]>;
  /** 'hd 48915' / 'hip 32349' → estrela, para o acesso direto */
  porCatalogo: Map<string, number>;
}

/** A rubrica de 4 degraus: exato > prefixo > palavra interna > parcial. */
export const SCORE = { exato: 140, prefixo: 110, palavra: 90, parcial: 75 } as const;

/** Glifo → chaves irmãs: abreviação de catálogo e nome pt-BR da letra. */
const GREGAS: Record<string, readonly string[]> = {
  α: ['alp', 'alfa'], β: ['bet', 'beta'], γ: ['gam', 'gama'], δ: ['del', 'delta'],
  ε: ['eps', 'epsilon'], ζ: ['zet', 'zeta'], η: ['eta'], θ: ['the', 'teta'],
  ι: ['iot', 'iota'], κ: ['kap', 'capa'], λ: ['lam', 'lambda'], μ: ['mu', 'mi'],
  ν: ['nu', 'ni'], ξ: ['xi', 'csi'], ο: ['omi', 'omicron'], π: ['pi'],
  ρ: ['rho', 'ro'], σ: ['sig', 'sigma'], τ: ['tau'], υ: ['ups', 'ipsilon'],
  φ: ['phi', 'fi'], χ: ['chi', 'qui'], ψ: ['psi'], ω: ['ome', 'omega'],
};

/**
 * Normaliza consulta e chave pela MESMA lei: NFKD (o NFD do doador mais
 * a dobra dos sobrescritos, γ² → γ2 — ninguém digita "²"; medido: nos
 * 1.726 nomes é a ÚNICA diferença entre NFD e NFKD), tira os
 * diacríticos que sobraram (Tupã → tupa), minúsculas, apara e colapsa
 * espaços.
 */
export function normalizarConsulta(valor: string): string {
  return valor
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** "γ² Vel" → ["gam vel", "gama vel"]; nome próprio não tem irmã. */
function chavesIrmas(nome: string): string[] {
  const partes = nome.split(' ');
  if (partes.length !== 2) return [];
  const formas = GREGAS[partes[0].replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, '')];
  return formas ? formas.map((forma) => `${forma} ${partes[1]}`) : [];
}

export function construirIndice(nomeadas: readonly NamedStar[]): IndiceEstrelas {
  const porChave = new Map<string, number[]>();
  const porCatalogo = new Map<string, number>();
  const anotar = (bruta: string, indice: number) => {
    const chave = normalizarConsulta(bruta);
    if (!chave) return;
    const lista = porChave.get(chave);
    if (lista) lista.push(indice);
    else porChave.set(chave, [indice]);
  };
  nomeadas.forEach((estrela, indice) => {
    anotar(estrela.n, indice);
    for (const irma of chavesIrmas(estrela.n)) anotar(irma, indice);
    if (estrela.gl) anotar(estrela.gl, indice);
    if (estrela.hd !== undefined) porCatalogo.set(`hd ${estrela.hd}`, indice);
    if (estrela.hip !== undefined) porCatalogo.set(`hip ${estrela.hip}`, indice);
  });
  return { nomeadas, porChave, porCatalogo };
}

function pontuar(chave: string, consulta: string): number {
  if (chave === consulta) return SCORE.exato;
  if (chave.startsWith(consulta)) return SCORE.prefixo;
  for (const palavra of chave.split(' ')) {
    if (palavra.startsWith(consulta)) return SCORE.palavra;
  }
  return chave.includes(consulta) ? SCORE.parcial : 0;
}

/**
 * Resultados por score decrescente; empate desempata pela mais BRILHANTE
 * (magnitude aparente menor), que é a que o visitante procurava.
 */
export function buscar(
  consulta: string,
  indice: IndiceEstrelas,
  limite = 8
): ResultadoBusca[] {
  const alvo = normalizarConsulta(consulta);
  if (!alvo) return [];

  const catalogo = /^(hd|hip) ?0*(\d+)$/.exec(alvo);
  if (catalogo) {
    const achado = indice.porCatalogo.get(`${catalogo[1]} ${catalogo[2]}`);
    if (achado === undefined) return [];
    return [{ indice: achado, estrela: indice.nomeadas[achado], score: SCORE.exato }];
  }

  const melhorPorEstrela = new Map<number, number>();
  for (const [chave, estrelas] of indice.porChave) {
    const score = pontuar(chave, alvo);
    if (score === 0) continue;
    for (const i of estrelas) {
      if ((melhorPorEstrela.get(i) ?? 0) < score) melhorPorEstrela.set(i, score);
    }
  }

  return [...melhorPorEstrela]
    .map(([i, score]) => ({ indice: i, estrela: indice.nomeadas[i], score }))
    .sort((a, b) => b.score - a.score || a.estrela.m - b.estrela.m || a.indice - b.indice)
    .slice(0, limite);
}
