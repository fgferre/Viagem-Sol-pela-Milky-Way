// Serve: lei — o conserto do DEM (Encélado, R4): os ladrilhos bons saem byte a byte, o remendo de bolhas ganha o fino POR EXEMPLO dos bons (retalhos só de ladrilho bom, sem degrau entre eles) ou PELA FOTO (fotoclinometria: o relevo iluminado de um rumo conhecido volta com o sinal e a escala), a opção só-liso não põe fino, a membrana não deixa degrau na emenda, e a borda reta de ladrilho é achada e recosturada sem degrau, só na faixa dela
// ============================================================
// Um corpo pequeno (texel de 0,39 km como o de Encélado na grade de 4096) com
// terreno de cristas paralelas em toda parte e, no meio, um ladrilho de
// "bolhas": ruído isotrópico forte de 2–3,5 km, 300 m acima do resto (o
// desnível de ladrilho). A foto é o sombreado das cristas verdadeiras.
// ============================================================
import { beforeAll, describe, expect, it } from "vitest";
import {
  BOM,
  CONSERTO_DE_ENCELADO,
  DERIVADO,
  bandaFinaPelaFoto,
  bordasDeLadrilho,
  consertaDem,
  energiaDoPixel,
  gradiente,
  media,
  recosturaBordas,
  sorteador,
} from "./conserto-do-dem.mjs";
import { latitudeDaLinha, longitudeDaColuna } from "./relevo-inventado.mjs";

const W = 512;
const H = 256;
const [Wf, Hf] = [2 * W, 2 * H];
/** o raio que dá 0,39 km de texel norte–sul na grade de trabalho */
const RAIO_M = (0.39 * H * 1000) / Math.PI;
const RKM = RAIO_M / 1000;
/** os números do conserto, encolhidos ao corpo de 32 km */
const P = {
  ...CONSERTO_DE_ENCELADO,
  larguraDeTrabalho: W,
  janelaKm: 3,
  suavizaKm: 4,
  ilhaMinimaKm2: 20,
  vizinhancaKm: [8, 30],
  membranaSigmaKm: 32,
  margemKm: 3,
};
/** a janela da fotoclinometria encolhida ao corpo: 64 px de 0,4 km */
const P_FOTO = { ...P, foto: { ...CONSERTO_DE_ENCELADO.foto, ladoPx: 64 } };
const GRAUS = 180 / Math.PI;
/** o remendo: lat −25…25°, lon 30…100°E */
const noRemendo = (lat, lon) => Math.abs(lat) < 25 && lon > 30 && lon < 100;
const DEGRAU_M = 300;

/** coordenadas (km) no plano tangente a (0°, 65°E), pela projeção 3D: sem emenda em lugar nenhum */
const xy = (lat, lon) => {
  const [f, l, l0] = [lat / GRAUS, lon / GRAUS, 65 / GRAUS];
  const p = [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
  return [RKM * (-p[0] * Math.sin(l0) + p[1] * Math.cos(l0)), RKM * p[2]];
};

/** cristas a 30° (ou `rumo` rad), ondas de 16 a 1 km, encosta 0,1 em cada uma */
function cristas(lat, lon, rumo = 0.52) {
  const [x, y] = xy(lat, lon);
  const s = x * Math.cos(rumo) + y * Math.sin(rumo);
  let h = 0;
  for (const [k, l] of [16, 8, 4, 2, 1].entries())
    h +=
      ((0.1 * l * 1000) / (2 * Math.PI)) * Math.sin((2 * Math.PI * s) / l + k);
  return h;
}

const sorteia = sorteador(7);
const BOLHAS = Array.from({ length: 40 }, () => [
  sorteia() * Math.PI,
  2 + 1.5 * sorteia(),
  sorteia() * 2 * Math.PI,
]);
/** o ruído isotrópico de 2–3,5 km, encosta ~0,6 */
function bolhas(lat, lon) {
  const [x, y] = xy(lat, lon);
  let h = 0;
  for (const [a, l, f] of BOLHAS)
    h +=
      (((0.6 / Math.sqrt(BOLHAS.length / 2)) * l * 1000) / (2 * Math.PI)) *
      Math.sin((2 * Math.PI * (x * Math.cos(a) + y * Math.sin(a))) / l + f);
  return h;
}

function gradeFina(f) {
  const o = new Float32Array(Wf * Hf);
  for (let j = 0; j < Hf; j += 1) {
    const lat = latitudeDaLinha(j, Hf) * GRAUS;
    for (let i = 0; i < Wf; i += 1)
      o[j * Wf + i] = f(lat, longitudeDaColuna(i, Wf));
  }
  return o;
}

/** a encosta RMS da banda DoG [σa, σb] (km) num conjunto de texels da grade de trabalho */
function encostaDaBanda(campo, sa, sb, texels) {
  const a = media(campo, W, H, RAIO_M, sa);
  const b = media(campo, W, H, RAIO_M, sb);
  for (let k = 0; k < a.length; k += 1) a[k] -= b[k];
  const { gx, gy } = gradiente(a, W, H, RAIO_M);
  let s = 0;
  for (const k of texels) s += gx[k] * gx[k] + gy[k] * gy[k];
  return Math.sqrt(s / texels.length);
}

/** os texels de trabalho em |lat| < 20° a mais de `m` graus DENTRO do remendo, ou (m < 0) de |m| a |m| + 12 graus a leste e a oeste dele */
function texels(m) {
  const o = [];
  const naCaixa = (lat, lon, d) =>
    Math.abs(lat) < 25 + d && lon > 30 - d && lon < 100 + d;
  for (let j = 0; j < H; j += 1) {
    const lat = latitudeDaLinha(j, H) * GRAUS;
    for (let i = 0; i < W; i += 1) {
      const lon = longitudeDaColuna(i, W);
      if (Math.abs(lat) >= 20) continue;
      const dentro = naCaixa(lat, lon, -m);
      const anel = naCaixa(lat, lon, -m + 12) && !naCaixa(lat, lon, -m);
      if (m > 0 ? dentro : anel) o.push(j * W + i);
    }
  }
  return o;
}

describe("o conserto do DEM (Encélado, R4)", () => {
  let dem;
  let r;
  let liso;
  let antes;
  let pelaFoto;
  beforeAll(() => {
    dem = gradeFina(
      (lat, lon) =>
        cristas(lat, lon) +
        (noRemendo(lat, lon) ? DEGRAU_M + bolhas(lat, lon) : 0),
    );
    // a foto: o sombreado das cristas verdadeiras, sol do leste
    const verdade = gradeFina(cristas);
    const luminancia = new Float32Array(W * H);
    for (let j = 0; j < H; j += 1) {
      for (let i = 0; i < W; i += 1) {
        const k = 2 * j * Wf + 2 * i;
        const encosta =
          (verdade[k + 1] - verdade[k]) /
          ((2 * Math.PI * RAIO_M * Math.cos(latitudeDaLinha(2 * j, Hf))) / Wf);
        luminancia[j * W + i] = 0.3 + 0.25 * Math.tanh(3 * encosta);
      }
    }
    antes = Float32Array.from(dem);
    r = consertaDem({
      metros: dem,
      largura: Wf,
      altura: Hf,
      luminancia,
      raioM: RAIO_M,
      p: P,
      listras: false,
      fino: "exemplo",
    });
    liso = consertaDem({
      metros: dem,
      largura: Wf,
      altura: Hf,
      luminancia,
      raioM: RAIO_M,
      p: P,
      listras: false,
      fino: "liso",
    });
    pelaFoto = consertaDem({
      metros: dem,
      largura: Wf,
      altura: Hf,
      luminancia,
      raioM: RAIO_M,
      p: P_FOTO,
      listras: false,
      fino: "foto",
    });
  }, 240_000);

  it("a máscara acha o remendo e deixa o terreno bom de fora", () => {
    const dentro = texels(5);
    const fora = texels(-8);
    expect(
      dentro.filter((k) => r.classe[k] !== BOM).length / dentro.length,
    ).toBeGreaterThan(0.95);
    expect(
      fora.filter((k) => r.classe[k] === BOM).length / fora.length,
    ).toBeGreaterThan(0.95);
  });

  it("os ladrilhos bons saem BYTE A BYTE iguais, e o remendo muda", () => {
    expect(dem).toEqual(antes);
    let bons = 0;
    let mudados = 0;
    let ruins = 0;
    for (let j = 0; j < Hf; j += 1) {
      for (let i = 0; i < Wf; i += 1) {
        const k = j * Wf + i;
        if (r.classe[(j >> 1) * W + (i >> 1)] === BOM) {
          bons += 1;
          if (r.metros[k] !== antes[k] && !Number.isNaN(antes[k])) mudados += 1;
        } else if (r.metros[k] !== antes[k]) ruins += 1;
      }
    }
    expect(bons).toBeGreaterThan(0.8 * Wf * Hf);
    expect(mudados).toBe(0);
    expect(Buffer.from(r.metros.buffer).equals(Buffer.from(antes.buffer))).toBe(
      false,
    );
    expect(ruins).toBeGreaterThan(0);
  });

  it("o fino do remendo troca a estatística das bolhas pela do terreno bom, banda a banda", () => {
    const h = r.campo;
    const dentro = texels(6);
    const fora = texels(-6);
    const original = Float32Array.from({ length: W * H }, (_, k) => {
      const j = (k / W) | 0;
      const i = k - j * W;
      return (
        0.25 *
        (antes[2 * j * Wf + 2 * i] +
          antes[2 * j * Wf + 2 * i + 1] +
          antes[(2 * j + 1) * Wf + 2 * i] +
          antes[(2 * j + 1) * Wf + 2 * i + 1])
      );
    });
    for (const [sa, sb] of [
      [0, 0.4],
      [0.4, 0.8],
      [0.8, 1.6],
    ]) {
      const bom = encostaDaBanda(original, sa, sb, fora);
      const bolha = encostaDaBanda(original, sa, sb, dentro);
      const depois = encostaDaBanda(h, sa, sb, dentro);
      if (sa === 0.4)
        expect(bolha / bom, "as bolhas, antes").toBeGreaterThan(2);
      expect(depois / bom, `banda σ ${sa}–${sb} km`).toBeGreaterThan(0.75);
      expect(depois / bom, `banda σ ${sa}–${sb} km`).toBeLessThan(1.3);
    }
  });

  it("a membrana costura: nenhum degrau na borda da máscara, e o desnível de ladrilho some na emenda", () => {
    const h = r.campo;
    const saltos = [];
    const naBorda = [];
    for (let j = 0; j < H; j += 1) {
      if (Math.abs(latitudeDaLinha(j, H) * GRAUS) > 15) continue;
      for (let i = 0; i < W; i += 1) {
        const [a, b] = [j * W + i, j * W + ((i + 1) % W)];
        const salto = Math.abs(h[b] - h[a]);
        if ((r.classe[a] === BOM) !== (r.classe[b] === BOM))
          naBorda.push(salto);
        else if (r.classe[a] === BOM) saltos.push(salto);
      }
    }
    saltos.sort((x, y) => x - y);
    // nenhum salto na borda passa do que o próprio terreno bom faz em 1 par de 1000
    const p999 = saltos[Math.floor(0.999 * saltos.length)];
    expect(naBorda.length).toBeGreaterThan(10);
    expect(Math.max(...naBorda)).toBeLessThan(p999);
    // e o nível: o anel de dentro da borda segue o de fora (antes: 300 m acima)
    const anel = (dentro) => {
      let s = 0;
      let n = 0;
      for (let j = 0; j < H; j += 1) {
        if (Math.abs(latitudeDaLinha(j, H) * GRAUS) > 15) continue;
        for (let i = 1; i < W - 1; i += 1) {
          const k = j * W + i;
          const borda =
            (r.classe[k] === BOM) !== (r.classe[k - 1] === BOM) ||
            (r.classe[k] === BOM) !== (r.classe[k + 1] === BOM);
          if (borda && (r.classe[k] !== BOM) === dentro) {
            s += h[k];
            n += 1;
          }
        }
      }
      return s / n;
    };
    expect(Math.abs(anel(true) - anel(false))).toBeLessThan(40);
  });

  it("os retalhos vêm só de ladrilho bom: o quadrado girado inteiro e a folga", () => {
    const { retalhos } = r.colcha;
    expect(retalhos.length).toBeGreaterThan(10);
    const alcance = (P.exemplo.larguraKm / 2) * Math.SQRT2 + P.exemplo.folgaKm;
    for (const {
      origem: [la, lo],
    } of retalhos) {
      const [f0, l0] = [la / GRAUS, lo / GRAUS];
      let ruins = 0;
      for (let j = 0; j < H; j += 1) {
        const f = latitudeDaLinha(j, H);
        for (let i = 0; i < W; i += 1) {
          const c =
            Math.sin(f) * Math.sin(f0) +
            Math.cos(f) *
              Math.cos(f0) *
              Math.cos(longitudeDaColuna(i, W) / GRAUS - l0);
          if (
            Math.acos(Math.min(1, c)) * RKM < alcance &&
            r.classe[j * W + i] !== BOM
          )
            ruins += 1;
        }
      }
      expect(ruins, `origem ${la.toFixed(1)}, ${lo.toFixed(1)}`).toBe(0);
    }
  });

  it("nenhum degrau na emenda entre retalhos: o salto na rampa é o de dentro deles", () => {
    const h = r.campo;
    const salto = (naRampa) => {
      let s = 0;
      let n = 0;
      for (const k of texels(6)) {
        if (Boolean(r.colcha.rampa[k]) !== naRampa) continue;
        const j = (k / W) | 0;
        s +=
          Math.abs(h[j * W + ((k - j * W + 1) % W)] - h[k]) +
          Math.abs(h[k + W] - h[k]);
        n += 1;
      }
      return s / n;
    };
    expect(salto(true) / salto(false)).toBeLessThan(1.25);
  });

  it("a opção só-liso deixa o ruim sem banda fina: só o largo medido e a costura", () => {
    expect(liso.relatorio.retalhos).toBe(0);
    expect(
      Buffer.from(liso.metros.buffer).equals(Buffer.from(r.metros.buffer)),
    ).toBe(false);
    const fino = (h, ks) => encostaDaBanda(h, 0, 0.8, ks);
    expect(
      fino(liso.campo, texels(6)) / fino(liso.campo, texels(-6)),
    ).toBeLessThan(0.15);
    expect(
      fino(r.campo, texels(6)) / fino(r.campo, texels(-6)),
    ).toBeGreaterThan(0.75);
  });
  it("o fino pela foto recupera o relevo iluminado do leste: o rumo do sol, o sinal e a escala", () => {
    // duas famílias de cristas (a 30° e a −40°: com uma só o rumo do sol não
    // se separa do das cristas), a foto o sombreado delas com sol do leste
    const verdade = new Float32Array(W * H);
    const regiao = new Uint8Array(W * H);
    for (let j = 0; j < H; j += 1) {
      const lat = latitudeDaLinha(j, H) * GRAUS;
      for (let i = 0; i < W; i += 1) {
        const lon = longitudeDaColuna(i, W);
        verdade[j * W + i] = cristas(lat, lon) + cristas(lat, lon, -0.7);
        regiao[j * W + i] = noRemendo(lat, lon) ? 1 : 0;
      }
    }
    const fotoLog = new Float32Array(W * H);
    for (let j = 0; j < H; j += 1) {
      const passoL =
        (2 * Math.PI * RAIO_M * Math.cos(latitudeDaLinha(j, H))) / W;
      for (let i = 0; i < W; i += 1) {
        const encosta =
          (verdade[j * W + ((i + 1) % W)] -
            verdade[j * W + ((i + W - 1) % W)]) /
          (2 * passoL);
        fotoLog[j * W + i] = Math.log(
          0.3 + 0.25 * Math.tanh(3 * encosta) + 0.003,
        );
      }
    }
    const r = bandaFinaPelaFoto({
      h: verdade,
      fotoLog,
      W,
      H,
      raioM: RAIO_M,
      regiao,
      p: P_FOTO,
    });
    const confiaveis = r.janelas.filter((j) => j.confianca > 0.5);
    expect(confiaveis.length).toBeGreaterThan(4);
    for (const j of confiaveis) expect(Math.abs(j.rumoGraus)).toBeLessThan(15);
    const lisa = media(verdade, W, H, RAIO_M, P.corteKm);
    let [tf, tt, ff] = [0, 0, 0];
    for (const k of texels(5)) {
      const t = verdade[k] - lisa[k];
      tf += t * r.fina[k];
      tt += t * t;
      ff += r.fina[k] * r.fina[k];
    }
    expect(tf / Math.sqrt(tt * ff)).toBeGreaterThan(0.8);
    expect(tf / tt).toBeGreaterThan(0.6);
    expect(tf / tt).toBeLessThan(1.3);
  });

  it("com o fino pela foto, os bons saem byte a byte e o remendo vira derivado", () => {
    let mudados = 0;
    for (let j = 0; j < Hf; j += 1) {
      for (let i = 0; i < Wf; i += 1) {
        const k = j * Wf + i;
        if (
          pelaFoto.classe[(j >> 1) * W + (i >> 1)] === BOM &&
          pelaFoto.metros[k] !== antes[k] &&
          !Number.isNaN(antes[k])
        )
          mudados += 1;
      }
    }
    expect(mudados).toBe(0);
    const dentro = texels(5);
    expect(
      dentro.filter((k) => pelaFoto.cobertura[k] === DERIVADO).length /
        dentro.length,
    ).toBeGreaterThan(0.8);
    expect(liso.relatorio.fino).toBe("liso");
  });
});

describe("as bordas retas de ladrilho (Encélado, R4)", () => {
  // o terreno de 200 ondas de 4–10 km em rumos sorteados (sem reta nenhuma: a crista de uma onda forte seria uma) e, no
  // meridiano 60°E de 35°S a 65°S, a costura de dois ladrilhos como as de
  // Schenk: um degrau de 150 m (o leste acima, que se apaga devagar para leste e nas pontas) e uma risca pontilhada
  // de 1 pixel (±40 m a cada 2 linhas). No meridiano 200°E, a mesma coisa, mas a foto a vê: é uma escarpa de verdade
  const ESCARPA = 200;
  const LON = 60;
  const DEGRAU = 150;
  const naCostura = (lat) => lat < -35 && lat > -65;
  const sorteiaOndas = sorteador(11);
  /** ondas planas no espaço (rumo 3D sorteado): a textura é a mesma em toda a esfera, sem o achatamento de um plano */
  const ONDAS = Array.from({ length: 200 }, () => {
    const [z, t] = [2 * sorteiaOndas() - 1, 2 * Math.PI * sorteiaOndas()];
    const r = Math.sqrt(1 - z * z);
    return [[r * Math.cos(t), r * Math.sin(t), z], 4 + 6 * sorteiaOndas(), sorteiaOndas() * 2 * Math.PI];
  });
  const terreno = (lat, lon) => {
    const [f, l] = [lat / GRAUS, lon / GRAUS];
    const q = [RKM * Math.cos(f) * Math.cos(l), RKM * Math.cos(f) * Math.sin(l), RKM * Math.sin(f)];
    let h = 0;
    for (const [d, c, fase] of ONDAS) h += 5.4 * Math.sin((2 * Math.PI * (q[0] * d[0] + q[1] * d[1] + q[2] * d[2])) / c + fase);
    return h;
  };
  const colunaDaCostura = Math.round(((LON + 180) / 360) * Wf) % Wf;
  const colunaDaEscarpa = Math.round(((ESCARPA - 180) / 360) * Wf) % Wf;
  /** a distância (km) pela esfera do texel fino (j, i) ao meridiano da costura no trecho dela, com a janela do
   * detector (`meioKm`) além de cada ponta: lá a reta ainda acende metade dela */
  const alem = (P.bordas.meioKm / RKM) * GRAUS;
  const aCostura = (j, i) => {
    const lat = latitudeDaLinha(j, Hf) * GRAUS;
    const f = Math.max(-65 - alem, Math.min(-35 + alem, lat)) / GRAUS;
    const c =
      Math.sin(latitudeDaLinha(j, Hf)) * Math.sin(f) +
      Math.cos(latitudeDaLinha(j, Hf)) * Math.cos(f) * Math.cos((longitudeDaColuna(i, Wf) - LON) / GRAUS);
    return Math.acos(Math.min(1, c)) * RKM;
  };
  /** o oeste da faixa que não pode mudar (`livre` = 0): de 46°E a 54°E */
  const preso = (lon) => lon > 46 && lon < 54;
  let liso;
  let dem;
  let borda;
  let r;
  let livre;
  beforeAll(() => {
    liso = gradeFina(terreno);
    dem = Float32Array.from(liso);
    for (let j = 0; j < Hf; j += 1) {
      const lat = latitudeDaLinha(j, Hf) * GRAUS;
      if (!naCostura(lat)) continue;
      for (let i = 0; i < Wf; i += 1) {
        const k = j * Wf + i;
        const lon = longitudeDaColuna(i, Wf);
        const ponta = Math.sin((Math.PI / 2) * Math.min(1, Math.min(lat + 65, -35 - lat) / 5)) ** 2;
        for (const [l0, coluna] of [
          [LON, colunaDaCostura],
          [ESCARPA, colunaDaEscarpa],
        ]) {
          if (lon > l0 && lon < l0 + 60) dem[k] += DEGRAU * ponta * Math.cos(((lon - l0) / 60) * (Math.PI / 2)) ** 2;
          if (i === coluna) dem[k] += (j >> 1) % 2 ? 40 : -40;
        }
      }
    }
    // a foto: o sombreado do terreno, e o degrau de brilho da escarpa (nenhum na costura)
    const fotoLog = new Float32Array(W * H);
    for (let j = 0; j < H; j += 1) {
      const lat = latitudeDaLinha(j, H) * GRAUS;
      for (let i = 0; i < W; i += 1) {
        const lon = longitudeDaColuna(i, W);
        const escarpa = naCostura(lat) && lon > ESCARPA && lon < ESCARPA + 30 ? 0.1 : 0;
        fotoLog[j * W + i] = Math.log(0.3 + 0.0005 * terreno(lat, lon) + escarpa);
      }
    }
    borda = bordasDeLadrilho({ e1: energiaDoPixel(dem, Wf, Hf, W, H), W, H, raioM: RAIO_M, p: P, fotoLog }).borda;
    livre = new Uint8Array(W * H).fill(1);
    for (let j = 0; j < H; j += 1) for (let i = 0; i < W; i += 1) if (preso(longitudeDaColuna(i, W))) livre[j * W + i] = 0;
    r = recosturaBordas({ metros: dem, Wf, Hf, bordas: borda, livre, W, H, raioM: RAIO_M, p: P });
  }, 120_000);

  it("a costura é achada ao longo, e nada longe dela — nem a escarpa que a foto confirma", () => {
    let linhas = 0;
    let achadas = 0;
    let longe = 0;
    const coluna = Math.round(((LON + 180) / 360) * W) % W;
    for (let j = 0; j < H; j += 1) {
      const lat = latitudeDaLinha(j, H) * GRAUS;
      for (let i = 0; i < W; i += 1) if (borda[j * W + i] && aCostura(2 * j, 2 * i) > 2) longe += 1;
      if (lat > -62 && lat < -38) {
        linhas += 1;
        if ([-1, 0, 1].some((d) => borda[j * W + coluna + d])) achadas += 1;
      }
    }
    expect(achadas / linhas).toBeGreaterThan(0.8);
    expect(longe).toBe(0);
    // sem a foto, a escarpa passaria por costura: é a foto que a deixa de fora
    const semFoto = bordasDeLadrilho({ e1: energiaDoPixel(dem, Wf, Hf, W, H), W, H, raioM: RAIO_M, p: P }).borda;
    const naEscarpa = Math.round(((ESCARPA - 180) / 360) * W) % W;
    expect(semFoto.filter((b, k) => b && Math.abs((k % W) - naEscarpa) <= 1).length).toBeGreaterThan(20);
  });

  it("recosturada, a costura não deixa degrau nem risca", () => {
    const salto = (f, j) => f[j * Wf + colunaDaCostura + 2] - f[j * Wf + colunaDaCostura - 2];
    const lap = (f, j) => {
      const k = j * Wf + colunaDaCostura;
      return Math.abs(f[k] - 0.25 * (f[k - 1] + f[k + 1] + f[k - Wf] + f[k + Wf]));
    };
    let [antes, depois, risca, fundo, n] = [0, 0, 0, 0, 0];
    for (let j = 0; j < Hf; j += 1) {
      const lat = latitudeDaLinha(j, Hf) * GRAUS;
      if (!(lat > -60 && lat < -40)) continue;
      antes += Math.abs(salto(dem, j) - salto(liso, j));
      depois += Math.abs(salto(r.metros, j) - salto(liso, j));
      risca += lap(r.metros, j);
      fundo += lap(liso, j);
      n += 1;
    }
    expect(antes / n).toBeGreaterThan(0.9 * DEGRAU);
    expect(depois / n).toBeLessThan(0.1 * DEGRAU);
    expect(risca / n).toBeLessThan(2 * (fundo / n) + 1);
  });

  it("fora da faixa da costura e no que não está livre, byte a byte", () => {
    let [fora, mudaFora, presos, mudaPreso, mudados] = [0, 0, 0, 0, 0];
    for (let j = 0; j < Hf; j += 1) {
      for (let i = 0; i < Wf; i += 1) {
        const k = j * Wf + i;
        const igual = Object.is(r.metros[k], dem[k]);
        if (!igual) mudados += 1;
        if (preso(longitudeDaColuna(i, Wf))) {
          presos += 1;
          if (!igual) mudaPreso += 1;
        } else if (aCostura(j, i) > P.bordas.faixaKm + 2) {
          fora += 1;
          if (!igual) mudaFora += 1;
        }
      }
    }
    expect(fora).toBeGreaterThan(0.9 * Wf * Hf);
    expect(presos).toBeGreaterThan(0);
    expect(mudaFora).toBe(0);
    expect(mudaPreso).toBe(0);
    expect(mudados).toBeGreaterThan(1000);
    expect(r.texels).toBe(mudados);
  });
});
