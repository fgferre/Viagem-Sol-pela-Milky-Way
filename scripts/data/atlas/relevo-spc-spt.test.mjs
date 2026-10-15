// Serve: lei — o SPT de Encélado por exemplo do SPC (R4): num polo sintético, as origens dos retalhos só saem do SPC,
// o SPC e o DEM bom saem byte a byte, a emenda com o conhecido não tem degrau, a listra fora do SPC tem, na média ao
// longo, o perfil medido nas do SPC, e o ladrilho ruim que cruza o limite segue preenchido e se apaga devagar
// ============================================================
import { beforeAll, describe, expect, it } from 'vitest';
import { latitudeDaLinha, longitudeDaColuna } from './relevo-inventado.mjs';
import { SPT_DE_ENCELADO, doPlanoPolar, fatiaDaListra, noPlanoPolar, preencheSpt } from './relevo-spc.mjs';

const R = 252100;
const RKM = R / 1000;
const [Wf, Hf, W, H] = [512, 256, 256, 128];
/** o polo sintético a 1 km por célula (o de verdade é a 200 m): os números de Encélado, mais leves */
const P = { ...SPT_DE_ENCELADO, passoKm: 1, retalho: { ...SPT_DE_ENCELADO.retalho, candidatos: 80, preSelecao: 24 } };
const RAIO_DO_SPC = 50;

/** a listra medida no SPC: sulco gaussiano e duas cristas, a d km do eixo u = 0,3·v + 10 */
const listra = (d) => -150 * Math.exp(-0.5 * (d / 1.5) ** 2) + 60 * Math.exp(-0.5 * ((Math.abs(d) - 4) / 1.2) ** 2);
const distDaListra = (u, v) => (u - 0.3 * v - 10) / Math.hypot(1, 0.3);
const largo = (u, v) => 200 * Math.sin(u / 37) * Math.cos(v / 53);
const textura = (u, v) => 40 * Math.sin((u + v) / 2.5) * Math.cos((u - v) / 4) + 25 * Math.sin(u / 1.7 - v / 3.1);
const ruido = (u, v) => 30 * Math.sin(u * 1.9 + v * 0.7) * Math.cos(v * 2.3 - u);
/** (u, v) km do centro do texel (j, i) de uma grade Wc×Hc da casa */
const uvDoTexel = (j, i, Wc, Hc) => noPlanoPolar((latitudeDaLinha(j, Hc) * 180) / Math.PI, longitudeDaColuna(i, Wc), RKM);
/** o ladrilho BOM dentro do SPT: um anel de setor de 90–110 km a leste */
const bomNoSpt = (u, v) => Math.hypot(u, v) > 90 && Math.hypot(u, v) < 110 && u > 0;

let entrada;
let r;
beforeAll(() => {
  const metros = new Float32Array(Wf * Hf);
  const spcFino = new Float32Array(Wf * Hf).fill(NaN);
  for (let j = 0; j < Hf; j += 1) {
    for (let i = 0; i < Wf; i += 1) {
      const [u, v] = uvDoTexel(j, i, Wf, Hf);
      const k = j * Wf + i;
      metros[k] = largo(u, v) + ruido(u, v);
      if (Math.hypot(u, v) < RAIO_DO_SPC) spcFino[k] = largo(u, v) + textura(u, v) + listra(distDaListra(u, v));
    }
  }
  const dentro = new Uint8Array(W * H);
  const nucleo = new Uint8Array(W * H);
  const peso = new Float32Array(W * H);
  const qualidade = new Uint8Array(W * H);
  const luminancia = new Float32Array(W * H);
  for (let j = 0; j < H; j += 1) {
    for (let i = 0; i < W; i += 1) {
      const [u, v] = uvDoTexel(j, i, W, H);
      const k = j * W + i;
      const rho = Math.hypot(u, v);
      const t = Math.min(1, Math.max(0, (RAIO_DO_SPC - 2 - rho) / 13.2));
      dentro[k] = rho < RAIO_DO_SPC - 2 ? 1 : 0;
      peso[k] = dentro[k] ? t * t * (3 - 2 * t) : 0;
      nucleo[k] = peso[k] === 1 ? 1 : 0;
      qualidade[k] = rho < 160 && !bomNoSpt(u, v) ? 1 : 0;
      luminancia[k] = 0.4 + 0.1 * Math.sin(u / 3 + v / 5) * (rho < RAIO_DO_SPC ? 1 : 0.8);
    }
  }
  const linha = (pontos) => pontos.map(([u, v]) => {
    const [lat, lonE] = doPlanoPolar(u, v, RKM);
    return { lat, lonE };
  });
  const dentroDoSpc = Array.from({ length: 31 }, (_, q) => [0.3 * (2 * q - 30) + 10, 2 * q - 30]);
  const fora = Array.from({ length: 36 }, (_, q) => [-110 + 1.2 * q, -40 + 2 * q]);
  entrada = { metros, spcFino, mascaras: { dentro, nucleo, peso }, qualidade, luminancia, linhas: [linha(dentroDoSpc), linha(fora)] };
  r = preencheSpt({ ...entrada, Wf, Hf, cobertura: new Uint8Array(W * H), W, H, raioM: R, p: P });
});

describe('o SPT de Encélado por exemplo do SPC (R4)', () => {
  it('as origens dos retalhos caem só no SPC, com o retalho girado inteiro dentro dele', () => {
    const { retalhosDetalhe: retalhos } = r.relatorio;
    expect(retalhos.length).toBeGreaterThan(100);
    const raioDoRetalho = (P.retalho.larguraKm / 2) * Math.SQRT2 + P.retalho.folgaKm;
    for (const { origem } of retalhos) expect(Math.hypot(...origem)).toBeLessThan(RAIO_DO_SPC - raioDoRetalho + 1.5);
  });

  it('o SPC (núcleo) e o DEM bom saem byte a byte; o ruim do SPT muda', () => {
    let [iguais, diferentes, mudados] = [0, 0, 0];
    for (let j = 0; j < Hf; j += 1) {
      const jw = Math.floor(((j + 0.5) * H) / Hf);
      for (let i = 0; i < Wf; i += 1) {
        const kw = jw * W + Math.floor(((i + 0.5) * W) / Wf);
        const k = j * Wf + i;
        const igual = Object.is(r.metros[k], entrada.metros[k]);
        if (entrada.qualidade[kw] === 0 || entrada.mascaras.nucleo[kw]) {
          if (igual) iguais += 1;
          else diferentes += 1;
        } else if (!igual) mudados += 1;
      }
    }
    expect(diferentes).toBe(0);
    expect(iguais).toBeGreaterThan(0);
    expect(mudados).toBeGreaterThan(1000);
  });

  it('a emenda com o conhecido não tem degrau: o salto na borda do alvo é o dos vizinhos dos dois lados', () => {
    const { antes, delta, alvo, spt } = r.plano;
    const N = Math.sqrt(alvo.length);
    const depois = Float32Array.from(antes, (v, k) => v + delta[k]);
    const razoes = [];
    for (let y = 0; y < N; y += 1) {
      for (let x = 1; x < N - 2; x += 1) {
        const k = y * N + x;
        if (alvo[k] === alvo[k + 1] || spt[k - 1] < 1 || spt[k + 2] < 1) continue;
        const salto = (a) => Math.abs(depois[a + 1] - depois[a]);
        razoes.push(salto(k) / ((salto(k - 1) + salto(k + 1)) / 2 + 1));
      }
    }
    const q = (f) => [...razoes].sort((a, b) => a - b)[Math.floor(f * (razoes.length - 1))];
    expect(razoes.length).toBeGreaterThan(50);
    expect(q(0.5)).toBeLessThan(1.3);
    expect(q(0.9)).toBeLessThan(2.5);
  });

  it('o ladrilho ruim que cruza o limite segue preenchido e se apaga devagar: nada liso encostado no preenchido', () => {
    // como o conserto deixa o DEM: o ruim só com o largo (liso); a oeste, o ladrilho ruim passa 45 km do limite
    const raioDoLimite = (SPT_DE_ENCELADO.limite.latGraus + 90) * (Math.PI / 180) * RKM;
    const metros = Float32Array.from(entrada.metros);
    for (let j = 0; j < Hf; j += 1) {
      for (let i = 0; i < Wf; i += 1) {
        const [u, v] = uvDoTexel(j, i, Wf, Hf);
        if (Math.hypot(u, v) >= RAIO_DO_SPC) metros[j * Wf + i] = largo(u, v);
      }
    }
    const qualidade = Uint8Array.from(entrada.qualidade);
    for (let j = 0; j < H; j += 1) {
      for (let i = 0; i < W; i += 1) {
        const [u, v] = uvDoTexel(j, i, W, H);
        if (u < -20 && Math.hypot(u, v) < raioDoLimite + 45) qualidade[j * W + i] = 1;
      }
    }
    const s = preencheSpt({ ...entrada, metros, qualidade, Wf, Hf, cobertura: new Uint8Array(W * H), W, H, raioM: R, p: P });
    // a amplitude do que entrou (o fino), em anéis de 4 km além do limite, no ladrilho do oeste
    const aneis = new Float64Array(12);
    const contas = new Float64Array(12);
    let [dentro, nDentro] = [0, 0];
    for (let j = 0; j < Hf; j += 1) {
      for (let i = 0; i < Wf; i += 1) {
        const [u, v] = uvDoTexel(j, i, Wf, Hf);
        if (u > -25 || Math.abs(v) > 60) continue;
        const d = Math.hypot(u, v) - raioDoLimite;
        const f = (s.metros[j * Wf + i] - metros[j * Wf + i]) ** 2;
        if (d > -20 && d < 0) {
          dentro += f;
          nDentro += 1;
        } else if (d >= 0 && d < 48) {
          aneis[Math.floor(d / 4)] += f;
          contas[Math.floor(d / 4)] += 1;
        }
      }
    }
    const A = Array.from(aneis, (a, q) => Math.sqrt(a / contas[q]) / Math.sqrt(dentro / nDentro));
    expect(A[0]).toBeGreaterThan(0.6);
    for (let q = 1; q < A.length; q += 1) {
      expect(A[q], `anel ${4 * q} km`).toBeLessThan(A[q - 1] + 0.1);
      expect(A[q - 1] - A[q], `anel ${4 * q} km`).toBeLessThan(0.4);
    }
    expect(A[Math.ceil(P.limite.foraKm / 4) + 1]).toBeLessThan(0.05);
  });

  it('a listra fora do SPC tem, na média ao longo, o perfil medido nas do SPC', () => {
    const { medido, tracos, largo: L, fino, corte } = r.plano;
    expect(medido.porTraco).toEqual([31, 0]);
    // o medido é a listra sintética (alinhada no sulco, sem a reta das pontas)
    const n = (medido.perfil.length - 1) / 2;
    expect(medido.perfil[n + 4] - medido.perfil[n]).toBeGreaterThan(100);
    const campo = Float32Array.from(L, (v, k) => v + fino[k] + corte[k]);
    const traco = tracos[1];
    const plano = { N: Math.sqrt(L.length), passoKm: P.passoKm, raioKm: RKM };
    const soma = new Float64Array(2 * n + 1);
    let fatias = 0;
    for (let q = 0; q < traco.length; q += 1) {
      const s = traco[q].s;
      if (s < P.listras.pontaKm || s > traco[traco.length - 1].s - P.listras.pontaKm) continue;
      const fatia = fatiaDaListra(campo, plano, traco, q, P, { alinha: false });
      for (let t = 0; t <= 2 * n; t += 1) soma[t] += fatia[t];
      fatias += 1;
    }
    let erro = 0;
    const perto = Math.round(6 / P.passoKm);
    for (let t = n - perto; t <= n + perto; t += 1) erro += (soma[t] / fatias - medido.perfil[t]) ** 2;
    expect(Math.sqrt(erro / (2 * perto + 1))).toBeLessThan(12);
  });
});
