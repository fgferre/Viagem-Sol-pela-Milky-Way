// Serve: lei — tirar a sombra assada das fotos (PLAN-SOMBRA.md): sai o que o relevo explica, nada sai fora do domínio nem sem relevo, e as caixas `dadoRuim` tiram as bandas finas
// ============================================================
// Em miniatura (globo de 100 km de raio em 256×128), com resposta conhecida de
// fora do código: um albedo liso e aleatório, um relevo de calombos que não
// tem nada com ele, e a "foto" = albedo × Lambert sob um Sol a 315° (de onde
// vem a luz) e 40° de altura no espaço tangente.
//  1. A sombra sai: a direção achada é a do Sol (±10°; medido 313°); o brilho
//     corrigido fica perto do albedo (erro relativo RMS a menos de 0,4 do de
//     antes; medido 0,30) e segue bem menos o sombreado (r < 0,55; antes, 1).
//  2. Fora do domínio (o lado sem DEM), a sombra prevista é zero e a cor sai
//     byte a byte igual.
//  3. Sem relevo (normais planas), nada sai.
//  4. Uma caixa `dadoRuim` que alcança todas as bandas zera a sombra dentro
//     dela; uma que só alcança a banda fina deixa as grossas.
//  5. `mediaNaGrade` é a média dos texels finos cujo centro cai no grosso, em
//     tamanhos que não dividem.
// ============================================================
import { describe, expect, it } from 'vitest';
import { SOMBRA_ASSADA, estimaSombraAssada, mediaNaGrade, tiraSombraAssada } from './sombra-assada.mjs';

const L = 256;
const A = 128;
const RAIO_M = 100000;
const RAIO_KM = RAIO_M / 1000;
const R = Math.PI / 180;
const lonDe = (i) => (180 + ((i + 0.5) * 360) / L) % 360;
const latDe = (j) => 90 - ((j + 0.5) * 180) / A;

function gerador(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soma de calombos gaussianos (distância de corda, km) com raios e amplitudes sorteados. */
function calombos(semente, quantos, raioKm, amplitude) {
  const sorteia = gerador(semente);
  const lista = Array.from({ length: quantos }, () => {
    const lo = sorteia() * 360;
    const la = (Math.asin(2 * sorteia() - 1) * 180) / Math.PI;
    const r = raioKm[0] + sorteia() * (raioKm[1] - raioKm[0]);
    return { p: [Math.cos(la * R) * Math.cos(lo * R), Math.cos(la * R) * Math.sin(lo * R), Math.sin(la * R)], r, a: amplitude * r * (2 * sorteia() - 1) };
  });
  const campo = new Float32Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const la = latDe(j) * R;
    for (let i = 0; i < L; i += 1) {
      const lo = lonDe(i) * R;
      const q = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
      let h = 0;
      for (const c of lista) {
        const d = RAIO_KM * Math.hypot(q[0] - c.p[0], q[1] - c.p[1], q[2] - c.p[2]);
        if (d < 4 * c.r) h += c.a * Math.exp(-(d * d) / (2 * c.r * c.r));
      }
      campo[j * L + i] = h;
    }
  }
  return campo;
}

/** As normais (x = leste, y = norte) da altura `h` (km) por diferença central, e o RGB do normal.png. */
function normaisDe(h) {
  const dy = (Math.PI * RAIO_KM) / A;
  const n = new Float32Array(3 * L * A);
  const rgb = new Uint8Array(3 * L * A);
  for (let j = 0; j < A; j += 1) {
    const dx = ((2 * Math.PI * RAIO_KM) / L) * Math.max(0.05, Math.cos(latDe(j) * R));
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      const hx = (h[j * L + ((i + 1) % L)] - h[j * L + ((i - 1 + L) % L)]) / (2 * dx);
      const hy = j > 0 && j < A - 1 ? (h[(j - 1) * L + i] - h[(j + 1) * L + i]) / (2 * dy) : 0;
      const m = Math.hypot(hx, hy, 1);
      const v = [-hx / m, -hy / m, 1 / m];
      for (let c = 0; c < 3; c += 1) {
        n[3 * k + c] = v[c];
        rgb[3 * k + c] = Math.round((v[c] + 1) * 127.5);
      }
    }
  }
  return { n, rgb };
}

const SOL = (() => {
  const az = 315 * R;
  const el = 40 * R;
  return [Math.cos(el) * Math.sin(az), Math.cos(el) * Math.cos(az), Math.sin(el)];
})();

const albedo = calombos(7, 120, [15, 45], 0.012).map((v) => 120 * (1 + Math.max(-0.4, Math.min(0.4, v))));
const relevo = normaisDe(calombos(11, 900, [4, 22], 0.35));
const sombreado = Float32Array.from(albedo, (_, k) => Math.max(0, relevo.n[3 * k] * SOL[0] + relevo.n[3 * k + 1] * SOL[1] + relevo.n[3 * k + 2] * SOL[2]) / SOL[2]);
const foto = Float32Array.from(albedo, (a, k) => Math.min(255, a * sombreado[k]));
// o domínio: |lat| < 55° e fora do lado sem DEM (200–260°E)
const semDem = (i) => lonDe(i) >= 200 && lonDe(i) <= 260;
const dominio = new Uint8Array(L * A);
for (let j = 0; j < A; j += 1) for (let i = 0; i < L; i += 1) dominio[j * L + i] = Math.abs(latDe(j)) < 55 && !semDem(i) ? 1 : 0;
// o miolo: longe da borda do domínio (a rampa de 60 km e a janela da direção)
const noMiolo = (j, i) => Math.abs(latDe(j)) < 30 && (lonDe(i) < 150 || lonDe(i) > 310);
const PARAMETROS = { ...SOMBRA_ASSADA };

function correlacao(p, q, mascara) {
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let k = 0; k < p.length; k += 1) {
    if (!mascara[k]) continue;
    n += 1; sx += p[k]; sy += q[k]; sxx += p[k] * p[k]; syy += q[k] * q[k]; sxy += p[k] * q[k];
  }
  return (sxy / n - (sx / n) * (sy / n)) / Math.sqrt((sxx / n - (sx / n) ** 2) * (syy / n - (sy / n) ** 2));
}

describe('tirar a sombra assada', () => {
  const normais = { pixels: relevo.rgb, largura: L, altura: A };
  const { sombra, azimute } = estimaSombraAssada({ brilho: foto, dominio, normais, raioM: RAIO_M, parametros: PARAMETROS });

  it('acha a direção do Sol e tira o que o relevo explica', () => {
    const miolo = new Uint8Array(L * A);
    for (let j = 0; j < A; j += 1) for (let i = 0; i < L; i += 1) miolo[j * L + i] = noMiolo(j, i) ? 1 : 0;
    const azimutes = [];
    for (let k = 0; k < L * A; k += 1) if (miolo[k]) azimutes.push(azimute[k]);
    azimutes.sort((p, q) => p - q);
    expect(Math.abs(azimutes[azimutes.length >> 1] - 315)).toBeLessThan(10);
    let antes = 0;
    let depois = 0;
    const corrigido = Float32Array.from(foto, (v, k) => v / (1 + sombra[k]));
    for (let k = 0; k < L * A; k += 1) {
      if (!miolo[k]) continue;
      antes += (foto[k] / albedo[k] - 1) ** 2;
      depois += (corrigido[k] / albedo[k] - 1) ** 2;
    }
    expect(Math.sqrt(depois / antes)).toBeLessThan(0.4);
    // o que sobra no brilho corrigido quase não segue o sombreado (antes segue de perto)
    const relativoAntes = Float32Array.from(foto, (v, k) => v / albedo[k]);
    const relativoDepois = Float32Array.from(corrigido, (v, k) => v / albedo[k]);
    expect(correlacao(relativoAntes, sombreado, miolo)).toBeGreaterThan(0.95);
    expect(Math.abs(correlacao(relativoDepois, sombreado, miolo))).toBeLessThan(0.55);
  });

  it('fora do domínio a sombra prevista é zero e a cor sai byte a byte igual', () => {
    const cor = Uint8Array.from(foto, (v) => Math.round(v));
    const { cor: saida, mudados } = tiraSombraAssada({ cor, largura: L, altura: A, canais: 1, sombra, L, A });
    expect(mudados).toBeGreaterThan(0);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        const k = j * L + i;
        if (dominio[k]) continue;
        expect(sombra[k]).toBe(0);
        expect(saida[k]).toBe(cor[k]);
      }
    }
  });

  it('sem relevo, nada sai', () => {
    const plano = { pixels: new Uint8Array(3 * L * A).fill(128).map((v, q) => (q % 3 === 2 ? 255 : v)), largura: L, altura: A };
    const { sombra: nada } = estimaSombraAssada({ brilho: Float32Array.from(albedo), dominio, normais: plano, raioM: RAIO_M, parametros: PARAMETROS });
    let maior = 0;
    for (const v of nada) maior = Math.max(maior, Math.abs(v));
    expect(maior).toBeLessThan(1e-6);
  });

  it('a caixa dadoRuim que alcança todas as bandas zera a sombra nela; a que só alcança a fina deixa as grossas', () => {
    const caixa = { lon: [20, 60], lat: [-20, 20] };
    const dentro = [];
    for (let j = 0; j < A; j += 1) for (let i = 0; i < L; i += 1) if (lonDe(i) > 25 && lonDe(i) < 55 && Math.abs(latDe(j)) < 15) dentro.push(j * L + i);
    const toda = estimaSombraAssada({ brilho: foto, dominio, normais, raioM: RAIO_M, dadoRuim: [{ ...caixa, sigmaMaximoKm: 1000 }], parametros: PARAMETROS }).sombra;
    for (const k of dentro) expect(toda[k]).toBe(0);
    const fina = estimaSombraAssada({ brilho: foto, dominio, normais, raioM: RAIO_M, dadoRuim: [{ ...caixa, sigmaMaximoKm: 5 }], parametros: PARAMETROS }).sombra;
    expect(dentro.some((k) => fina[k] !== 0)).toBe(true);
    expect(dentro.some((k) => fina[k] !== sombra[k])).toBe(true);
  });
});

describe('a média na grade', () => {
  it('é a média dos texels finos cujo centro cai no grosso, em tamanhos que não dividem', () => {
    const [Lf, Af, Lg, Ag] = [7, 5, 3, 2];
    const fino = Float32Array.from({ length: Lf * Af }, (_, k) => k);
    const grosso = mediaNaGrade(fino, Lf, Af, Lg, Ag);
    for (let J = 0; J < Ag; J += 1) {
      for (let I = 0; I < Lg; I += 1) {
        let soma = 0;
        let conta = 0;
        for (let j = 0; j < Af; j += 1) for (let i = 0; i < Lf; i += 1) {
          if (Math.floor(((j + 0.5) * Ag) / Af) === J && Math.floor(((i + 0.5) * Lg) / Lf) === I) { soma += fino[j * Lf + i]; conta += 1; }
        }
        expect(conta).toBeGreaterThan(0);
        expect(grosso[J * Lg + I]).toBeCloseTo(soma / conta, 5);
      }
    }
  });
});
