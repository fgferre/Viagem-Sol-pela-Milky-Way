// Serve: lei — o SPC do polo sul de Encélado (R4): o leitor DAS/DSK lê um arquivo montado à mão nas duas ordens de
// bytes, as placas vão à grade polar com a altura certa, e a fusão no DEM não deixa degrau na borda da cobertura
// ============================================================
import { describe, expect, it } from 'vitest';
import { latitudeDaLinha, longitudeDaColuna } from './relevo-inventado.mjs';
import {
  ELIPSOIDE_DE_THOMAS_KM,
  SPC_DE_ENCELADO,
  amostraNoPolo,
  fundeNoDem,
  leDsk,
  mascarasDoSpc,
  noPlanoPolar,
  raioDoElipsoide,
  rasterizaNoPolo,
} from './relevo-spc.mjs';

const GRAUS = 180 / Math.PI;

/**
 * Um DSK em DAS de 5 registros: o de arquivo, um de comentário, um diretório
 * (o 1º agrupamento d.p., o 2º inteiro) e um registro de cada tipo. Um
 * segmento de tipo 2: 4 vértices, 2 placas.
 */
function montaDsk(pequeno) {
  const vertices = [
    [10, 0, -249],
    [0, 10, -249.1],
    [-10, 0, -249.2],
    [0, -10, -249.3],
  ];
  const placas = [
    [1, 2, 3],
    [1, 3, 4],
  ];
  const descritor = Array(24).fill(0);
  Object.assign(descritor, { 0: 20125, 1: 602, 2: 2, 3: 2, 4: 10040, 5: 1 });
  descritor.splice(16, 6, -Math.PI, Math.PI, -Math.PI / 2, -1.03, 249, 249.3);
  const dp = [...descritor, -10, 10, -10, 10, -249.3, -249, -10, -10, -250, 1, ...vertices.flat()];
  const segmento = [4, 2, 1, 1, 1, 1, 1, 1, 2, 0, ...placas.flat(), 1, 1, 2, 1, 1, 1, 1, 1];
  const inteiros = [1000000, 4, 4, -1, -1, 11, segmento.length, 0, dp.length, 0, 0, ...segmento];
  const bytes = new Uint8Array(5 * 1024);
  const v = new DataView(bytes.buffer);
  const escreve = (o, t) => [...t].forEach((c, k) => (bytes[o + k] = c.charCodeAt(0)));
  const comentario = 'linha 1\0linha 2\0';
  escreve(0, 'DAS/DSK ');
  escreve(8, 'teste'.padEnd(60));
  [0, 0, 1, comentario.length].forEach((x, k) => v.setInt32(68 + 4 * k, x, pequeno));
  escreve(84, pequeno ? 'LTL-IEEE' : 'BIG-IEEE');
  escreve(1024, comentario);
  [0, 0, 0, 0, 1, dp.length, 1, inteiros.length, 2, 1, 1].forEach((x, k) => v.setInt32(2048 + 4 * k, x, pequeno));
  dp.forEach((x, k) => v.setFloat64(3072 + 8 * k, x, pequeno));
  inteiros.forEach((x, k) => v.setInt32(4096 + 4 * k, x, pequeno));
  return { bytes, vertices, placas };
}

describe('o SPC do polo sul de Encélado (R4)', () => {
  it('o leitor DAS/DSK lê o arquivo montado à mão, BIG-IEEE e LTL-IEEE', () => {
    for (const pequeno of [false, true]) {
      const { bytes, vertices, placas } = montaDsk(pequeno);
      const dsk = leDsk(bytes);
      expect(dsk.formato).toBe(pequeno ? 'LTL-IEEE' : 'BIG-IEEE');
      expect(dsk.comentario).toBe('linha 1\nlinha 2\n');
      expect(dsk.segmentos).toHaveLength(1);
      const [s] = dsk.segmentos;
      expect([s.superficie, s.centro, s.classe, s.tipo, s.quadro, s.sistema]).toEqual([20125, 602, 2, 2, 10040, 1]);
      expect(s.limites.slice(4)).toEqual([249, 249.3]);
      expect([s.nv, s.np]).toEqual([4, 2]);
      expect(Array.from(s.vertices)).toEqual(vertices.flat());
      expect(Array.from(s.placas)).toEqual(placas.flat().map((i) => i - 1));
    }
  });

  it('as placas vão à grade polar com a altura que os vértices dão (linear no plano) e vazio fora', () => {
    // uma malha de 1 km em volta do polo sul até 80°S; altura = 50 + 3u − 2v metros (u, v em km no plano polar)
    const raioKm = 252.1;
    const altura = (u, v) => 50 + 3 * u - 2 * v;
    const [anel, setores] = [40, 96];
    const vertices = [];
    const placas = [];
    const poe = (lat, lon) => {
      const [u, v] = noPlanoPolar(lat, lon, raioKm);
      const d = [Math.cos(lat / GRAUS) * Math.cos(lon / GRAUS), Math.cos(lat / GRAUS) * Math.sin(lon / GRAUS), Math.sin(lat / GRAUS)];
      const r = raioDoElipsoide(...d, ELIPSOIDE_DE_THOMAS_KM) + altura(u, v) / 1000;
      vertices.push(...d.map((c) => c * r));
      return vertices.length / 3 - 1;
    };
    const polo = poe(-90, 0);
    const ids = [];
    for (let a = 1; a <= anel; a += 1) ids.push(Array.from({ length: setores }, (_, s) => poe(-90 + (10 * a) / anel, (360 * s) / setores)));
    for (let s = 0; s < setores; s += 1) placas.push(polo, ids[0][s], ids[0][(s + 1) % setores]);
    for (let a = 1; a < anel; a += 1) {
      for (let s = 0; s < setores; s += 1) {
        const [p, q, r, t] = [ids[a - 1][s], ids[a - 1][(s + 1) % setores], ids[a][s], ids[a][(s + 1) % setores]];
        placas.push(p, r, t, p, t, q);
      }
    }
    const grade = rasterizaNoPolo({ vertices: Float64Array.from(vertices), placas: Int32Array.from(placas), raioKm, passoKm: 0.5, ateGraus: 12 });
    const { alturaM, N, passoKm } = grade;
    let pior = 0;
    let cheias = 0;
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const [u, v] = [(x + 0.5 - N / 2) * passoKm, (y + 0.5 - N / 2) * passoKm];
        const rho = Math.hypot(u, v);
        const h = alturaM[y * N + x];
        // a borda da malha é um polígono de 96 lados inscrito no círculo de 10°: dentro de 0,99 dele tudo cheio
        if (rho < 0.99 * raioKm * (10 / GRAUS) * Math.cos(Math.PI / setores)) {
          cheias += 1;
          pior = Math.max(pior, Math.abs(h - altura(u, v)));
        } else if (rho > raioKm * (10 / GRAUS) + passoKm) {
          expect(h).toBeNaN();
        }
      }
    }
    expect(cheias).toBeGreaterThan(9000);
    // a altura de cada vértice é raio − elipsoide, e dentro da placa ela é interpolada no plano: linear sai exata
    expect(pior).toBeLessThan(0.01);
    expect(amostraNoPolo(grade, -85, 30)).toBeCloseTo(altura(...noPlanoPolar(-85, 30, raioKm)), 0);
  });

  it('a fusão não deixa degrau na borda do SPC, fora dela o DEM sai byte a byte, e no núcleo fica o fino do SPC', () => {
    // um corpo pequeno (texel de 0,39 km na grade de trabalho 512 × 256, a fina o dobro); o SPC cobre de 50°S ao
    // polo entre 300°E e 60°E, 300 m acima do DEM e inclinado, com outro fino (o fino do DEM é o "ruído")
    const [W, H, Wf, Hf] = [512, 256, 1024, 512];
    const raioM = (0.39 * H * 1000) / Math.PI;
    const p = { ...SPC_DE_ENCELADO, bandaKm: 3, anelKm: 1, sigmaLargoKm: 2, membranaSigmaKm: 16 };
    const largo = (lat, lon) => 150 * Math.cos((3 * lon) / GRAUS) * Math.cos((2 * lat) / GRAUS);
    const ruido = (lat, lon) => 40 * Math.sin(lat * 7.1) * Math.cos(lon * 5.3);
    const finoSpc = (lat, lon) => 25 * Math.sin(lat * 3.3 + lon * 2.1);
    const cobre = (lat, lon) => lat < -50 && (lon > 300 || lon < 60);
    const dem = new Float32Array(Wf * Hf);
    const spc = new Float32Array(Wf * Hf).fill(NaN);
    for (let j = 0; j < Hf; j += 1) {
      const lat = latitudeDaLinha(j, Hf) * GRAUS;
      for (let i = 0; i < Wf; i += 1) {
        const lon = longitudeDaColuna(i, Wf);
        dem[j * Wf + i] = largo(lat, lon) + ruido(lat, lon);
        if (cobre(lat, lon)) spc[j * Wf + i] = largo(lat, lon) + 300 + 3 * (lat + 70) + finoSpc(lat, lon);
      }
    }
    const mascaras = mascarasDoSpc(spc, Wf, Hf, W, H, raioM, p);
    const { metros } = fundeNoDem({ metros: dem, spcFino: spc, Wf, Hf, mascaras, W, H, raioM, p });
    const saltos = { borda: [], dem: [], ingenuo: [] };
    for (let j = 0; j < Hf - 1; j += 1) {
      const lat = latitudeDaLinha(j, Hf) * GRAUS;
      if (lat > -40 || lat < -85) continue;
      for (let i = 0; i < Wf; i += 1) {
        const k = j * Wf + i;
        for (const q of [j * Wf + ((i + 1) % Wf), k + Wf]) {
          const salto = Math.abs(metros[q] - metros[k]);
          if (Number.isFinite(spc[k]) !== Number.isFinite(spc[q])) {
            saltos.borda.push(salto);
            saltos.dem.push(Math.abs(dem[q] - dem[k]));
            const ingenuo = (x) => (Number.isFinite(spc[x]) ? spc[x] : dem[x]);
            saltos.ingenuo.push(Math.abs(ingenuo(q) - ingenuo(k)));
          }
        }
      }
    }
    const media = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    expect(saltos.borda.length).toBeGreaterThan(100);
    // na borda o salto é o do próprio DEM nos mesmos pares; trocar sem rampa daria o desnível inteiro
    expect(media(saltos.borda) / media(saltos.dem)).toBeLessThan(1.1);
    expect(media(saltos.ingenuo) / media(saltos.dem)).toBeGreaterThan(5);
    // fora da cobertura, nada muda
    for (let k = 0; k < dem.length; k += 1) if (!Number.isFinite(spc[k])) expect(metros[k]).toBe(dem[k]);
    // no núcleo, o fino é o do SPC: tirado o fino do SPC, sobra só o largo (o ruído do DEM sumiu)
    let [sRes, sRuido, n] = [0, 0, 0];
    for (let j = 0; j < Hf; j += 1) {
      const lat = latitudeDaLinha(j, Hf) * GRAUS;
      for (let i = 0; i < Wf; i += 1) {
        const lon = longitudeDaColuna(i, Wf);
        const kw = Math.floor((j * H) / Hf) * W + Math.floor((i * W) / Wf);
        if (!mascaras.nucleo[kw] || lat > -55 || lat < -80) continue;
        const k = j * Wf + i;
        const resto = metros[k] - finoSpc(lat, lon);
        const resto2 = metros[k + 1] - finoSpc(lat, longitudeDaColuna(i + 1, Wf));
        sRes += (resto2 - resto) ** 2;
        sRuido += (ruido(lat, longitudeDaColuna(i + 1, Wf)) - ruido(lat, lon)) ** 2;
        n += 1;
      }
    }
    expect(n).toBeGreaterThan(1000);
    expect(Math.sqrt(sRes / n)).toBeLessThan(0.25 * Math.sqrt(sRuido / n));
  });
});
