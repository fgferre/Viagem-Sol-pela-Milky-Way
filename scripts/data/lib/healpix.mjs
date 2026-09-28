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

// ============================================================
// Interpolação bilinear NEST (E3c do PLAN.md) — o operador angular do
// interpolador oficial de Edenhofer (`get_interp_val` →
// `healpy._get_interpol_nest`, o `T_Healpix_Base::get_interpol` do
// healpix_cxx), transcrito com a mesma ordem de contas. Os 4 pixels são
// dois pares de vizinhos em dois anéis de isolatitude: o anel logo ao
// norte da direção (`ir1`) e o logo ao sul (`ir2`); em cada anel, os dois
// centros que cercam phi, com peso linear em phi; entre os anéis, linear
// em theta. Acima do 1º anel (abaixo do último), o polo entra como a média
// dos 4 pixels do anel. As contas são no esquema RING (anel, posição no
// anel); a tabela `anelParaNest` leva ao índice NEST no fim, como o
// healpix faz. A fixture `fixtures/healpix-interp-nside256.json`, gerada
// por `healpy.get_interp_weights(nside, theta, phi, nest=True)`, é quem
// prova que bateu (pixels e pesos, na mesma ordem).
// ============================================================

const DOIS_PI = 2 * Math.PI;

/** phi em [0, 2π), como o `fmodulo` do healpix_cxx (o healpy normaliza phi antes de interpolar). */
function phiNormalizado(phi) {
  if (phi >= 0) return phi < DOIS_PI ? phi : phi % DOIS_PI;
  const p = (phi % DOIS_PI) + DOIS_PI;
  return p === DOIS_PI ? 0 : p;
}

/**
 * Por anel (1 … 4·nside − 1, esquema RING): primeiro pixel, pixels no anel,
 * meia-casa de deslocamento em phi (0 ou 1) e theta do centro — o
 * `get_ring_info2` do healpix_cxx —, mais `anelParaNest`, o índice NEST de
 * cada pixel RING, achado pelo `faceIxIyDeZPhi` no CENTRO do pixel (meio
 * pixel longe de toda borda: nenhum arredondamento troca a face ou o par).
 */
function tabelasDosAneis(nside) {
  const quatroN = 4 * nside;
  const npix = 12 * nside * nside;
  const ncap = 2 * nside * (nside - 1);
  const fact2 = 4 / npix;
  const fact1 = 2 * nside * fact2;
  const inicio = new Int32Array(quatroN);
  const tamanho = new Int32Array(quatroN);
  const deslocado = new Uint8Array(quatroN);
  const theta = new Float64Array(quatroN);
  const anelParaNest = new Int32Array(npix);
  for (let anel = 1; anel < quatroN; anel += 1) {
    const norte = anel > 2 * nside ? quatroN - anel : anel;
    let z;
    if (norte < nside) {
      const tmp = norte * norte * fact2;
      z = 1 - tmp;
      theta[anel] = Math.atan2(Math.sqrt(tmp * (2 - tmp)), z);
      tamanho[anel] = 4 * norte;
      deslocado[anel] = 1;
      inicio[anel] = 2 * norte * (norte - 1);
    } else {
      z = (2 * nside - norte) * fact1;
      theta[anel] = Math.acos(z);
      tamanho[anel] = quatroN;
      deslocado[anel] = ((norte - nside) & 1) === 0 ? 1 : 0;
      inicio[anel] = ncap + (norte - nside) * quatroN;
    }
    if (norte !== anel) {
      theta[anel] = Math.PI - theta[anel];
      inicio[anel] = npix - inicio[anel] - tamanho[anel];
      z = -z;
    }
    const dphi = DOIS_PI / tamanho[anel];
    for (let i = 0; i < tamanho[anel]; i += 1) {
      const { faceNum, ix, iy } = faceIxIyDeZPhi(nside, z, (i + 0.5 * deslocado[anel]) * dphi);
      anelParaNest[inicio[anel] + i] = pixelDeFaceIxIy(nside, faceNum, ix, iy);
    }
  }
  return { inicio, tamanho, deslocado, theta, anelParaNest };
}

/**
 * O interpolador bilinear NEST de um `nside`: devolve
 * `interpolar(theta, phi, pixels, pesos)`, que preenche `pixels` (4
 * índices NEST) e `pesos` (4 pesos ≥ 0, soma 1) na ordem de
 * `healpy.get_interp_weights(nside, theta, phi, nest=True)` — o valor
 * interpolado de um mapa `m` é `Σ pesos[i]·m[pixels[i]]`. `theta` em
 * [0, π] (colatitude), `phi` em radianos, qualquer faixa. As tabelas
 * (≈ 4 bytes por pixel) nascem uma vez por interpolador; a chamada não
 * aloca nada.
 */
export function criarInterpolacaoNest(nside) {
  validarNside(nside);
  const { inicio, tamanho, deslocado, theta: thetaDoAnel, anelParaNest } = tabelasDosAneis(nside);
  const quatroN = 4 * nside;
  const ultimoPixel = 12 * nside * nside - 4;

  // o anel logo ao norte de z = cos θ (0: a direção está acima do 1º anel) — `ring_above`
  const anelAcima = (z) => {
    const az = Math.abs(z);
    if (az <= 2 / 3) return Math.trunc(nside * (2 - 1.5 * z));
    const anel = Math.trunc(nside * Math.sqrt(3 * (1 - az)));
    return z > 0 ? anel : quatroN - anel - 1;
  };

  return function interpolar(theta, phi, pixels, pesos) {
    if (!(theta >= 0 && theta <= Math.PI)) {
      throw new Error(`interpolacaoNest: theta ${theta} fora de [0, π].`);
    }
    const ph = phiNormalizado(phi);
    const ir1 = anelAcima(Math.cos(theta));
    const ir2 = ir1 + 1;
    let p0 = 0;
    let p1 = 0;
    let p2 = 0;
    let p3 = 0;
    let w0 = 0;
    let w1 = 0;
    let w2 = 0;
    let w3 = 0;
    let theta1 = 0;
    let theta2 = 0;
    if (ir1 > 0) {
      const nr = tamanho[ir1];
      const dphi = DOIS_PI / nr;
      const meia = 0.5 * deslocado[ir1];
      const tmp = ph / dphi - meia;
      let i1 = tmp < 0 ? Math.trunc(tmp) - 1 : Math.trunc(tmp);
      const w = (ph - (i1 + meia) * dphi) / dphi;
      let i2 = i1 + 1;
      if (i1 < 0) i1 += nr;
      if (i2 >= nr) i2 -= nr;
      p0 = inicio[ir1] + i1;
      p1 = inicio[ir1] + i2;
      w0 = 1 - w;
      w1 = w;
      theta1 = thetaDoAnel[ir1];
    }
    if (ir2 < quatroN) {
      const nr = tamanho[ir2];
      const dphi = DOIS_PI / nr;
      const meia = 0.5 * deslocado[ir2];
      const tmp = ph / dphi - meia;
      let i1 = tmp < 0 ? Math.trunc(tmp) - 1 : Math.trunc(tmp);
      const w = (ph - (i1 + meia) * dphi) / dphi;
      let i2 = i1 + 1;
      if (i1 < 0) i1 += nr;
      if (i2 >= nr) i2 -= nr;
      p2 = inicio[ir2] + i1;
      p3 = inicio[ir2] + i2;
      w2 = 1 - w;
      w3 = w;
      theta2 = thetaDoAnel[ir2];
    }
    if (ir1 === 0) {
      // acima do 1º anel: o polo norte é a média dos 4 pixels do anel 1
      const wtheta = theta / theta2;
      w2 *= wtheta;
      w3 *= wtheta;
      const fac = (1 - wtheta) * 0.25;
      w0 = fac;
      w1 = fac;
      w2 += fac;
      w3 += fac;
      p0 = (p2 + 2) & 3;
      p1 = (p3 + 2) & 3;
    } else if (ir2 === quatroN) {
      // abaixo do último anel: o polo sul, idem com os 4 do último anel
      const wtheta = (theta - theta1) / (Math.PI - theta1);
      w0 *= 1 - wtheta;
      w1 *= 1 - wtheta;
      const fac = wtheta * 0.25;
      w0 += fac;
      w1 += fac;
      w2 = fac;
      w3 = fac;
      p2 = ((p0 + 2) & 3) + ultimoPixel;
      p3 = ((p1 + 2) & 3) + ultimoPixel;
    } else {
      const wtheta = (theta - theta1) / (theta2 - theta1);
      w0 *= 1 - wtheta;
      w1 *= 1 - wtheta;
      w2 *= wtheta;
      w3 *= wtheta;
    }
    pixels[0] = anelParaNest[p0];
    pixels[1] = anelParaNest[p1];
    pixels[2] = anelParaNest[p2];
    pixels[3] = anelParaNest[p3];
    pesos[0] = w0;
    pesos[1] = w1;
    pesos[2] = w2;
    pesos[3] = w3;
  };
}
