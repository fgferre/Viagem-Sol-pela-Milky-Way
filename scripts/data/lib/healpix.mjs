// ============================================================
// HEALPix mínimo (E1, item 2 do PLAN.md) — só esquema NEST, só nside
// potência de 2 (o mapa de Edenhofer et al. 2024 usa NEST). Algoritmo
// padrão do healpix_bare/healpy: cada pixel nasce de uma das 12 faces
// (`faceNum`) mais um par (ix, iy) dentro da face; o índice NEST
// entrelaça os bits de ix (posições pares) e iy (posições ímpares) —
// é essa curva de Morton que dá ao NEST sua localidade espacial.
//
// Ida (ang2pix/vec2pix) e volta (pix2ang/pix2vec) partilham a mesma
// convenção de face/ix/iy; a fixture `fixtures/healpix-nside256.json`,
// gerada pelo healpy oficial, é quem prova que bateu.
// ============================================================

function validarNside(nside) {
  if (!Number.isInteger(nside) || nside < 1 || (nside & (nside - 1)) !== 0) {
    throw new Error(`nside deve ser potência de 2 (recebido ${nside}).`);
  }
}

// Entrelaça os 16 bits de `v` nas posições PARES de um inteiro de 32
// bits (0, 2, 4, ...), deixando as ímpares em zero — o truque clássico
// de bit-spreading da curva de Morton/Z-order.
function espalharBits(v) {
  let x = v & 0x0000ffff;
  x = (x | (x << 8)) & 0x00ff00ff;
  x = (x | (x << 4)) & 0x0f0f0f0f;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;
  return x;
}

// Inverso de `espalharBits`: extrai os bits das posições pares de `v`
// de volta a um inteiro compacto.
function comprimirBits(v) {
  let x = v & 0x55555555;
  x = (x | (x >>> 1)) & 0x33333333;
  x = (x | (x >>> 2)) & 0x0f0f0f0f;
  x = (x | (x >>> 4)) & 0x00ff00ff;
  x = (x | (x >>> 8)) & 0x0000ffff;
  return x;
}

// phi (radianos, qualquer sinal/faixa) -> "tt" em [0,4), a longitude
// medida em quadrantes de 90°, como o algoritmo padrão espera.
function ttDePhi(phi) {
  const duasVoltas = 2 * Math.PI;
  let p = phi % duasVoltas;
  if (p < 0) p += duasVoltas;
  return p / (Math.PI / 2);
}

// Núcleo comum a ang2pix/vec2pix: de (z=cos θ, phi) para a face e o
// par (ix,iy) dentro dela. `za` é o valor absoluto de z; a divisão em
// "equatorial" (|z|<=2/3) e "polar" é a projeção rômbica do HEALPix.
//
// Nos vértices exatos da grade grossa (onde 3+ faces se encontram),
// `temp1-temp2` (ou `tp*tmp`) é matematicamente um inteiro, e o
// arredondamento de ponto flutuante ora cai um fio abaixo dele ora um
// fio acima — testado contra o healpy oficial (fixture nside 256): uma
// folga somada antes do `floor` troca quais vértices batem sem reduzir
// o total de divergências (é bilateral, não sistemática). `floor` puro
// já é o empate técnico observado; ficam ~2 vértices de 358 pontos
// discordando do healpy por 1 pixel vizinho (ver healpix.test.mjs).
function faceIxIyDeZPhi(nside, z, phi) {
  const za = Math.abs(z);
  const tt = ttDePhi(phi);
  let faceNum;
  let ix;
  let iy;
  if (za <= 2 / 3) {
    const temp1 = nside * (0.5 + tt);
    const temp2 = nside * z * 0.75;
    const jp = Math.floor(temp1 - temp2); // linha ascendente
    const jm = Math.floor(temp1 + temp2); // linha descendente
    const ifp = Math.floor(jp / nside);
    const ifm = Math.floor(jm / nside);
    if (ifp === ifm) faceNum = ifp === 4 ? 4 : ifp + 4;
    else if (ifp < ifm) faceNum = ifp;
    else faceNum = ifm + 8;
    ix = jm % nside;
    iy = nside - (jp % nside) - 1;
  } else {
    let ntt = Math.floor(tt);
    if (ntt >= 4) ntt = 3;
    const tp = tt - ntt;
    const tmp = nside * Math.sqrt(3 * (1 - za));
    let jp = Math.floor(tp * tmp);
    let jm = Math.floor((1 - tp) * tmp);
    if (jp >= nside) jp = nside - 1;
    if (jm >= nside) jm = nside - 1;
    if (z >= 0) {
      faceNum = ntt;
      ix = nside - jm - 1;
      iy = nside - jp - 1;
    } else {
      faceNum = ntt + 8;
      ix = jp;
      iy = jm;
    }
  }
  return { faceNum, ix, iy };
}

function pixelDeFaceIxIy(nside, faceNum, ix, iy) {
  const ipf = espalharBits(ix) | (espalharBits(iy) << 1);
  return faceNum * nside * nside + ipf;
}

/** Pixel NEST (theta = colatitude, phi = longitude, radianos) que contém a direção. */
export function ang2pixNest(nside, theta, phi) {
  validarNside(nside);
  const z = Math.cos(theta);
  const { faceNum, ix, iy } = faceIxIyDeZPhi(nside, z, phi);
  return pixelDeFaceIxIy(nside, faceNum, ix, iy);
}

/** Pixel NEST que contém a direção do vetor (x,y,z) — não precisa ser unitário. */
export function vec2pixNest(nside, x, y, z) {
  validarNside(nside);
  const norma = Math.sqrt(x * x + y * y + z * z);
  if (!(norma > 0)) throw new Error('vec2pixNest: vetor nulo (norma zero).');
  const phi = Math.atan2(y, x);
  const { faceNum, ix, iy } = faceIxIyDeZPhi(nside, z / norma, phi);
  return pixelDeFaceIxIy(nside, faceNum, ix, iy);
}

const FACE_JRLL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4];
const FACE_JPLL = [1, 3, 5, 7, 0, 2, 4, 6, 1, 3, 5, 7];

/** Inverso de ang2pixNest: {theta, phi} (radianos) do CENTRO do pixel `ipix`. */
export function pix2angNest(nside, ipix) {
  validarNside(nside);
  const npface = nside * nside;
  const npix = 12 * npface;
  if (!Number.isInteger(ipix) || ipix < 0 || ipix >= npix) {
    throw new Error(`pix2angNest: ipix ${ipix} fora do intervalo [0, ${npix}) para nside ${nside}.`);
  }
  const faceNum = Math.floor(ipix / npface);
  const ipf = ipix % npface;
  const ix = comprimirBits(ipf);
  const iy = comprimirBits(ipf >>> 1);

  const jrt = ix + iy; // "vertical" dentro da face, em [0, 2(nside-1)]
  const jpt = ix - iy; // "horizontal" dentro da face, em [-(nside-1), nside-1]
  const jr = FACE_JRLL[faceNum] * nside - jrt - 1; // anel, em [1, 4nside-1]

  const fact1 = 1 / (3 * nside * nside);
  const fact2 = 2 / (3 * nside);
  let nr;
  let z;
  let kshift;
  if (jr < nside) {
    nr = jr;
    z = 1 - nr * nr * fact1;
    kshift = 0;
  } else if (jr > 3 * nside) {
    nr = 4 * nside - jr;
    z = -1 + nr * nr * fact1;
    kshift = 0;
  } else {
    nr = nside;
    z = (2 * nside - jr) * fact2;
    kshift = (jr - nside) % 2;
  }

  // divisão inteira truncada para zero (não `Math.floor`: o numerador
  // pode ser negativo perto do meridiano da face, e floor erraria por 1).
  let jp = Math.trunc((FACE_JPLL[faceNum] * nr + jpt + 1 + kshift) / 2);
  const nl4 = 4 * nside;
  if (jp > nl4) jp -= nl4;
  if (jp < 1) jp += nl4;

  const theta = Math.acos(z);
  const phi = (jp - (kshift + 1) * 0.5) * ((Math.PI / 2) / nr);
  return { theta, phi };
}

/** Vetor unitário [x, y, z] do centro do pixel `ipix`. */
export function pix2vecNest(nside, ipix) {
  const { theta, phi } = pix2angNest(nside, ipix);
  const sinTheta = Math.sin(theta);
  return [sinTheta * Math.cos(phi), sinTheta * Math.sin(phi), Math.cos(theta)];
}
