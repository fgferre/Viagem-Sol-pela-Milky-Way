// ============================================================
// Distância de estrela que é membro de aglomerado (revisão do
// catálogo, 13/11/2026).
//
// O DEFEITO. A distância do catálogo é 1/paralaxe da própria estrela.
// Nas brilhantes o Gaia satura e a paralaxe erra: as nove das Plêiades
// iam de 105 a 142 pc num aglomerado de ~3 pc de raio, e as quatro do
// Trapézio de 377 a 438 pc num grupo de ~0,1 pc. De perto o aglomerado
// virava uma fila ao longo da linha de visada.
//
// A REGRA (a média a posteriori de uma estrela que sabemos ser membro):
//   o aglomerado é uma nuvem de largura σ (o raio que contém metade dos
//   membros, r50, dividido por √(2 ln 2) — a profundidade igual à largura);
//   a paralaxe da estrela mede onde ela está nessa nuvem com erro e·RUWE
//   (RUWE > 1 é o próprio Gaia dizendo que o erro formal é otimista).
//   Peso k = σ²/(σ² + (e·RUWE)²): paralaxe boa (k≈1) fica onde mediu;
//   paralaxe ruim (k≈0) vai para a distância do aglomerado.
//   Sem paralaxe (só Hipparcos, ou descartada de propósito): o aglomerado.
//   Paralaxe boa que cai FORA do raio de maré: a estrela não está no
//   aglomerado, por mais que a lista diga — nada muda.
// O deslocamento é medido contra a paralaxe MÉDIA dos membros (mesma
// escala, sem correção de ponto zero) e somado à distância publicada
// (que já tem a correção): o ponto zero não vira profundidade.
// ============================================================

/** √(2 ln 2): r50 projetado de uma gaussiana 2D é 1,1774·σ */
export const R50_POR_SIGMA = Math.sqrt(2 * Math.LN2);

/** abaixo deste peso a distância é mais do aglomerado que da estrela */
export const PESO_DA_ESTRELA_MINIMO = 0.5;

/** chave de membro: o source_id do Gaia é texto (64 bits não cabem num double) */
const chaveGaia = (gaia) => `g:${gaia}`;
const chaveHip = (hip) => `h:${hip}`;

/**
 * Índice de membros a partir da tabela `aglomerados.json`. Um membro é
 * achado pelo Gaia DR3 OU pelo HIP; a mesma estrela em dois aglomerados
 * é erro da tabela, não escolha.
 */
export function indexarMembros(aglomerados) {
  const indice = new Map();
  for (const aglomerado of aglomerados) {
    for (const [gaia, hip, paralaxe, erro, ruwe] of aglomerado.membros) {
      const membro = { aglomerado, paralaxe, erro, ruwe };
      for (const chave of [gaia ? chaveGaia(gaia) : null, hip ? chaveHip(hip) : null]) {
        if (!chave) continue;
        const outro = indice.get(chave);
        if (outro && outro.aglomerado !== aglomerado) {
          throw new Error(`${chave} membro de ${outro.aglomerado.id} e de ${aglomerado.id}.`);
        }
        indice.set(chave, membro);
      }
    }
  }
  return indice;
}

/** O membro de uma linha do catálogo, pelo Gaia DR3 primeiro e pelo HIP depois. */
export function acharMembro(indice, { gaia, hip }) {
  return (gaia && indice.get(chaveGaia(gaia))) || (hip && indice.get(chaveHip(hip))) || null;
}

/**
 * A distância (pc) de um membro e de onde ela veio:
 *   'aglomerado' — sem paralaxe usável, a distância publicada do aglomerado;
 *   'mistura'    — a própria paralaxe puxada para o aglomerado com peso k;
 *   'fora'       — paralaxe boa fora do raio de maré: fica a do catálogo.
 */
export function distanciaDoMembro(membro, distanciaDoCatalogoPc) {
  const { aglomerado, paralaxe, erro, ruwe } = membro;
  const D = aglomerado.distanciaPc;
  if (paralaxe === null || erro === null || !(erro > 0)) {
    return { distanciaPc: D, regra: 'aglomerado', peso: 0 };
  }
  // larguras em paralaxe: Δϖ (mas) = 1000·Δd / D²
  const sigma = (1000 * (aglomerado.r50Pc / R50_POR_SIGMA)) / (D * D);
  const mare = (1000 * aglomerado.rtPc) / (D * D);
  const erroEfetivo = erro * Math.max(1, ruwe ?? 1);
  const desvio = paralaxe - aglomerado.paralaxeMediaMas;
  if (Math.abs(desvio) > mare + 3 * erroEfetivo) {
    return { distanciaPc: distanciaDoCatalogoPc, regra: 'fora', peso: 1 };
  }
  const peso = (sigma * sigma) / (sigma * sigma + erroEfetivo * erroEfetivo);
  return { distanciaPc: 1000 / (1000 / D + peso * desvio), regra: 'mistura', peso };
}

/** A estrela passa a dizer "distância do aglomerado" na ficha? */
export function distanciaEDoAglomerado(resultado) {
  return resultado.regra !== 'fora' && resultado.peso < PESO_DA_ESTRELA_MINIMO;
}
