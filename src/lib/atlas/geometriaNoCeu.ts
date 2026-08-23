// ============================================================
// A GEOMETRIA NO CÉU — onde um corpo está em relação ao Sol, VISTO DA TERRA.
//
// DUAS PERGUNTAS PARECIDAS QUE NÃO SÃO A MESMA, e confundi-las era a
// armadilha desta obra. A casa já mede um ângulo de fase: `escreverFase`
// (`world/planetas/planetas.ts`) calcula o ângulo Sol–corpo–CÂMERA para
// acender o ponto fotométrico na tela, e alimenta `fatorDeFaseMh18`. Isso é
// fotometria do pixel: "quanto do disco a câmera vê iluminado, daqui". O que
// falta — e é o que este arquivo faz — é a pergunta do doador, que é a do
// visitante com um telescópio: "dá para ver isso hoje à noite?". Essa é
// medida da TERRA, não da câmera.
//
// As duas convivem e a ficha rotula cada uma. `fatorDeFaseMh18` NÃO se toca.
//
// PURAMENTE GEOMÉTRICO, DE CENTRO A CENTRO. Não há observador com endereço
// nesta casa: o que sai daqui diz onde o corpo ESTÁ em relação ao Sol, nunca
// que ele estará visível. Sem atmosfera, sem refração, sem crepúsculo, sem
// horizonte — e a ficha diz isso na linha da procedência.
//
// ENTRADA HELIOCÊNTRICA, SEMPRE. Passar o vetor parent-centered de um
// satélite devolveria, em silêncio, a resposta do PAI dele; quem chama usa
// `posicaoHeliocentrica`, e é a razão de `quemTemGeometriaNoCeu` existir ao
// lado.
// ============================================================
import type { PosicaoEcliptica } from './kepler';
import { REGISTRO_ORBITAL } from './registroOrbital';

export interface GeometriaNoCeu {
  /** ângulo Sol–Terra–corpo, em graus: 0° na direção do Sol, 180° oposto */
  elongacaoDeg: number;
  /** fração iluminada do disco, de 0 (nova) a 1 (cheia) */
  fracaoIluminada: number;
}

function produto(a: PosicaoEcliptica, b: PosicaoEcliptica): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normaQuadrada(a: PosicaoEcliptica): number {
  return produto(a, a);
}

/**
 * Ângulo entre dois vetores, em radianos, pelo caminho do `atan2` do produto
 * vetorial contra o escalar. Não é preciosismo: o `acos` do escalar
 * normalizado perde dígitos justamente perto de 0° e 180°, que são os dois
 * casos que esta função existe para reportar (a Lua nova e a oposição de
 * Marte são exatamente as duas pontas).
 */
function anguloRad(a: PosicaoEcliptica, b: PosicaoEcliptica): number {
  const cruz = {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
  return Math.atan2(Math.sqrt(normaQuadrada(cruz)), produto(a, b));
}

/**
 * Elongação e fração iluminada, dos dois vetores HELIOCÊNTRICOS em UA
 * (eclíptica média J2000 — o frame de `posicaoHeliocentrica`). `null` quando
 * um dos dois degenera na origem: o Sol visto do Sol não tem elongação, e a
 * Terra vista da Terra não tem direção.
 */
export function geometriaNoCeu(
  corpoHelioUa: PosicaoEcliptica,
  terraHelioUa: PosicaoEcliptica
): GeometriaNoCeu | null {
  const terraAoCorpo = {
    x: corpoHelioUa.x - terraHelioUa.x,
    y: corpoHelioUa.y - terraHelioUa.y,
    z: corpoHelioUa.z - terraHelioUa.z,
  };
  const terraAoSol = {
    x: -terraHelioUa.x,
    y: -terraHelioUa.y,
    z: -terraHelioUa.z,
  };
  if (normaQuadrada(terraAoCorpo) < 1e-12 || normaQuadrada(terraAoSol) < 1e-12) {
    return null;
  }

  const elongacaoDeg = (anguloRad(terraAoSol, terraAoCorpo) * 180) / Math.PI;

  // O ÂNGULO DE FASE MEDE-SE NO CORPO, entre o Sol e a Terra — não na Terra.
  // Calculá-lo no vértice errado dá um número plausível e errado: é o que
  // separa "Vênus meio iluminado na máxima elongação" de qualquer outra
  // coisa.
  const corpoAoSol = { x: -corpoHelioUa.x, y: -corpoHelioUa.y, z: -corpoHelioUa.z };
  if (normaQuadrada(corpoAoSol) < 1e-12) {
    return { elongacaoDeg, fracaoIluminada: 1 };
  }
  const corpoATerra = {
    x: terraHelioUa.x - corpoHelioUa.x,
    y: terraHelioUa.y - corpoHelioUa.y,
    z: terraHelioUa.z - corpoHelioUa.z,
  };
  const fase = anguloRad(corpoAoSol, corpoATerra);
  return { elongacaoDeg, fracaoIluminada: (1 + Math.cos(fase)) / 2 };
}

/**
 * QUEM GANHA ESTAS DUAS LINHAS — a regra de escopo do doador, migrada como
 * requisito:
 *
 *  - o Sol não (ele É a referência) e a Terra não (é o observador);
 *  - tudo que orbita o Sol, sim;
 *  - dos satélites, só a LUA — para ela o pai É a Terra, então a diferença
 *    heliocêntrica composta JÁ é o vetor geocêntrico, e o resultado é a fase
 *    lunar de verdade. Os outros ficam de fora porque a elongação deles cai
 *    a menos de um grau da do pai e não acrescenta sinal nenhum: "Titã a
 *    46,2°" ao lado de "Saturno a 46,1°" é ruído com aparência de dado.
 */
export function quemTemGeometriaNoCeu(bodyId: string): boolean {
  if (bodyId === 'sun' || bodyId === 'earth') return false;
  if (bodyId === 'moon') return true;
  const registro = REGISTRO_ORBITAL[bodyId];
  return registro !== undefined && registro.centro === 'sun';
}
