// AS ESTRELAS DO FILME ESTELAR — ONDE O APP AS DESENHA, pelo nome do
// catálogo. É o ponto de `stars.bin` (float32), não o do nome em
// `stars_meta.json`: o nome vem arredondado e, a 20 pc, o ponto fica até
// ~0,002 pc dele — Aldebaran desenhada a 330 UA de onde o nome diz. Uma
// órbita de poucos raios em volta do nome rodaria o espaço vazio; em volta
// do ponto, roda a estrela (`EstrelasNoQuadro`, a mesma lei).
//
// Literais pela mesma razão dos pinos do solar: o roteiro é montado antes de
// o catálogo chegar pela rede. `estrelas.test.ts` decodifica `stars.bin`,
// casa cada nome pela lei do app (`indiceNoCatalogo`) e cobra o número bit a
// bit. Estrela que o catálogo não desenha (TRAPPIST-1, fraca demais) fica
// onde o app a põe: na posição da tabela das anfitriãs (`comAnfitrias`).
//
// PARA O AUTOR DE UM ATO: cada nome aqui é, ao mesmo tempo, um PONTO dos
// roteiros (`"centro": "Aldebaran"`) e um ASSUNTO aceito (`"assuntos":
// ["Aldebaran"]`). Precisa de outra estrela? Uma linha aqui, com o valor que
// o teste mostrar ao falhar.
import * as THREE from 'three';
import { comAnfitrias } from '../../../../lib/exoplanetas';

const pc = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** o ponto do catálogo é float32: o literal mais curto que volta ao mesmo float */
const f32 = (x: number, y: number, z: number) => pc(Math.fround(x), Math.fround(y), Math.fround(z));

/** a anfitriã fora do catálogo, onde a tabela de exoplanetas a põe */
const anfitria = (nome: string) => {
  const s = comAnfitrias([]).find((e) => e.n === nome);
  if (!s) throw new Error(`filme estelar: sem anfitriã “${nome}”`);
  return pc(s.x, s.y, s.z);
};

/** pc, equatorial J2000, o Sol na origem */
export const ESTRELAS_DO_FILME: Readonly<Record<string, THREE.Vector3>> = {
  // Órion (prólogo e atos 1–2)
  Betelgeuse: f32(3.1892684, 151.35312, 19.67855),
  Rigel: f32(51.59099, 256.69147, -37.74253),
  Bellatrix: f32(11.657509, 76.03649, 8.558945),
  Saiph: f32(10.435664, 195.31723, -33.326614),
  Alnitak: f32(18.920448, 224.81355, -7.654639),
  Alnilam: f32(62.784035, 602.62964, -12.709049),
  Mintaka: f32(25.862326, 210.7222, -1.1042491),
  // as Plêiades que a câmera atravessa (ato 3)
  Alcyone: f32(67.26668, 103.07514, 55.072258),
  Atlas: f32(66.50937, 103.55558, 54.934067),
  Merope: f32(67.96885, 103.00369, 54.81368),
  Taygeta: f32(67.742, 101.57597, 55.559345),
  // a velhice e o que sobra (ato 4)
  Aldebaran: f32(7.02806, 18.28841, 5.8067064),
  Sirius: f32(-0.49449053, 2.4769337, -0.7584803),
  // as anãs vermelhas que ficam (ato 5)
  'Proxima Centauri': f32(-0.47458112, -0.36335984, -1.1567463),
  'Rigil Kentaurus': f32(-0.5035455, -0.4213607, -1.1767038),
  'TRAPPIST-1': anfitria('TRAPPIST-1'),
};
