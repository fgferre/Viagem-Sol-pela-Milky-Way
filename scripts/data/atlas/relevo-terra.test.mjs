// Serve: lei — o relevo medido da Terra (ETOPO 2022): o leitor lê o TIFF em ladrilhos Deflate com preditor 3, a água fica espelho, a normal e o horizonte saem da grade fina com o sinal que o TERRA_FRAG lê, e a cadeia só grava o conjunto aprovado
// ============================================================
// Tudo sintético e pequeno: um TIFF montado aqui no formato do ETOPO, grades
// de 384 a 1024 colunas na convenção da casa. O ETOPO real é medido pelas
// ferramentas da rodada (capturas/efeitos-timidos/relevo/), e a reprodução
// dos candidatos pela cadeia é o portão dela (os sha256 aprovados).
// ============================================================
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { FONTES, numerosDoCandidatoDaTerra, numerosDoRelevoDaTerra, portaoDoRelevo } from './baixa-texturas.mjs';
import { horizonteFinoNasLinhas } from './gera-horizonte.mjs';
import { leTiffFloat32 } from './relevo-reia.mjs';
import { ETOPO, HORIZONTE, RAIO_KM, angulosDoHorizonte, horizonteDaTerra, normalDaTerra, superficieDaTerra } from './relevo-terra.mjs';

const RAD = Math.PI / 180;

/** Um TIFF clássico LE de float32 em ladrilhos `lado`×`lado`, Deflate, preditor 3 (bytes do mais significativo, somados na linha). */
function tiffEmLadrilhos(valores, W, H, lado) {
  const nx = Math.ceil(W / lado);
  const ny = Math.ceil(H / lado);
  const blocos = [];
  for (let ty = 0; ty < ny; ty += 1) {
    for (let tx = 0; tx < nx; tx += 1) {
      const cru = new Uint8Array(4 * lado * lado);
      const f = new DataView(new ArrayBuffer(4));
      for (let y = 0; y < lado; y += 1) {
        const linha = cru.subarray(4 * lado * y, 4 * lado * (y + 1));
        for (let x = 0; x < lado; x += 1) {
          const [gx, gy] = [tx * lado + x, ty * lado + y];
          f.setFloat32(0, gx < W && gy < H ? valores[gy * W + gx] : 0, false);
          for (let c = 0; c < 4; c += 1) linha[c * lado + x] = f.getUint8(c);
        }
        for (let i = linha.length - 1; i > 0; i -= 1) linha[i] = (linha[i] - linha[i - 1]) & 255;
      }
      blocos.push(deflateSync(cru));
    }
  }
  const tags = [[256, 3, [W]], [257, 3, [H]], [258, 3, [32]], [259, 3, [8]], [270, 2, [0x41, 0x42, 0x43, 0]], [277, 3, [1]], [317, 3, [3]], [322, 3, [lado]], [323, 3, [lado]], [324, 4, null], [325, 4, blocos.map((b) => b.length)], [339, 3, [3]]];
  const ifd = 8;
  const extra = ifd + 2 + 12 * tags.length + 4;
  let fim = extra + 8 * blocos.length;
  const offsets = blocos.map((b) => ((fim += b.length), fim - b.length));
  tags[9][2] = offsets;
  const out = new Uint8Array(fim);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0x4949, true);
  v.setUint16(2, 42, true);
  v.setUint32(4, ifd, true);
  v.setUint16(ifd, tags.length, true);
  let livre = extra;
  tags.forEach(([tag, tipo, vals], n) => {
    const e = ifd + 2 + 12 * n;
    const tam = tipo === 3 ? 2 : tipo === 2 ? 1 : 4;
    v.setUint16(e, tag, true);
    v.setUint16(e + 2, tipo, true);
    v.setUint32(e + 4, vals.length, true);
    let ini = e + 8;
    if (vals.length * tam > 4) {
      ini = livre;
      v.setUint32(e + 8, ini, true);
      livre += vals.length * tam;
    }
    vals.forEach((x, k) => (tam === 2 ? v.setUint16(ini + 2 * k, x, true) : tam === 1 ? v.setUint8(ini + k, x) : v.setUint32(ini + 4 * k, x, true)));
  });
  blocos.forEach((b, k) => out.set(b, offsets[k]));
  return out;
}

/** O quadro do TERRA_FRAG no texel (i, j): a posição da SphereGeometry em u, n, leste = normalize(n.z, 0, −n.x), norte = n × leste. */
function quadroDoShader(i, j, W, H) {
  const phi = ((i + 0.5) / W) * 2 * Math.PI;
  const theta = ((j + 0.5) / H) * Math.PI;
  const n = [-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)];
  const l = Math.hypot(n[2], n[0]);
  const leste = [n[2] / l, 0, -n[0] / l];
  const norte = [n[1] * leste[2] - n[2] * leste[1], n[2] * leste[0] - n[0] * leste[2], n[0] * leste[1] - n[1] * leste[0]];
  return { n, leste, norte };
}

/** N·L do TERRA_FRAG no texel com o Sol a `elev` graus acima do horizonte no rumo `rumo` (leste = 0, norte = 90). */
function nDotL(rgb, i, j, W, H, rumo, elev) {
  const { n, leste, norte } = quadroDoShader(i, j, W, H);
  const k = (j * W + i) * 3;
  const tn = [0, 1, 2].map((c) => (rgb[k + c] / 255) * 2 - 1);
  const nr = [0, 1, 2].map((c) => leste[c] * tn[0] + norte[c] * tn[1] + n[c] * tn[2]);
  const len = Math.hypot(...nr);
  const [ce, se, cr, sr] = [Math.cos(elev * RAD), Math.sin(elev * RAD), Math.cos(rumo * RAD), Math.sin(rumo * RAD)];
  return [0, 1, 2].reduce((s, c) => s + (nr[c] / len) * (ce * (cr * leste[c] + sr * norte[c]) + se * n[c]), 0);
}

describe('relevo da Terra', () => {
  it('o leitor estendido lê ladrilhos Deflate com preditor 3, com ladrilho de borda parcial, igual ao float de origem', () => {
    const [W, H] = [300, 270];
    const valores = Float32Array.from({ length: W * H }, (_, k) => Math.sin(k * 0.37) * 9000 - (k % 7) * 0.125);
    const lido = leTiffFloat32(tiffEmLadrilhos(valores, W, H, 256));
    expect([lido.largura, lido.altura]).toEqual([W, H]);
    expect(lido.valores).toEqual(valores);
  });

  it('a água fica espelho: o lago com fundo sobe ao nível, o oceano vai a 0, a terra fica, e o enchimento que vaza recusa', () => {
    const [W, H] = [720, 360];
    const alto = () => new Float32Array(W * H).fill(5000);
    const celula = (lat, lon) => Math.floor(((90 - lat) / 180) * H) * W + Math.floor(((lon + 180) / 360) * W);
    const v = alto();
    const baikal = celula(53.3, 108.0);
    for (const d of [-1, 0, 1]) for (const k of [baikal + d * W - 1, baikal + d * W, baikal + d * W + 1]) v[k] = -800;
    v[celula(0, -30)] = -4000;
    v[celula(10, 10)] = 1234;
    const r = superficieDaTerra(v, W, H);
    expect(v[baikal]).toBe(456);
    expect(v[baikal + W + 1]).toBe(456);
    expect(v[celula(0, -30)]).toBe(0);
    expect(v[celula(10, 10)]).toBe(1234);
    expect(r.lagos.find((l) => l.nome === 'Baikal').fundoM).toBe(-800);
    expect(r.abaixoDoMar).toBe(1);
    const vaza = alto();
    for (let i = -40; i <= 40; i += 1) vaza[baikal + i] = 0;
    expect(() => superficieDaTerra(vaza, W, H)).toThrow(/vazou/);
  });

  it('a normal, lida como o TERRA_FRAG lê, acende a encosta voltada para o Sol baixo e escurece a de trás, nos dois eixos', () => {
    const [W, H] = [1024, 512];
    const j0 = Math.floor(H * (110 / 180)); // ~20°S, como os Andes
    const i0 = W / 2 + 64;
    // uma serra norte–sul (gaussiana em longitude) e uma leste–oeste (em latitude), 4 km de altura, σ 3 texels
    const serraNS = Float64Array.from({ length: W * H }, (_, k) => 4000 * Math.exp(-(((k % W) - i0) ** 2) / 18));
    const serraLO = Float64Array.from({ length: W * H }, (_, k) => 4000 * Math.exp(-((Math.floor(k / W) - j0) ** 2) / 18));
    const ns = normalDaTerra(serraNS, W, H, W, H).rgb;
    const lo = normalDaTerra(serraLO, W, H, W, H).rgb;
    const plano = Math.sin(10 * RAD);
    // Sol do LESTE a 10°: a encosta leste (descendo para leste, i0 + 3) acesa, a oeste (i0 − 3) apagada
    expect(nDotL(ns, i0 + 3, j0, W, H, 0, 10)).toBeGreaterThan(plano * 1.05);
    expect(nDotL(ns, i0 - 3, j0, W, H, 0, 10)).toBeLessThan(plano * 0.95);
    // Sol do NORTE a 10°: a encosta norte (linha de cima, j0 − 3) acesa, a sul apagada
    expect(nDotL(lo, i0, j0 - 3, W, H, 90, 10)).toBeGreaterThan(plano * 1.05);
    expect(nDotL(lo, i0, j0 + 3, W, H, 90, 10)).toBeLessThan(plano * 0.95);
    // e o "leste" do shader é +u, o sentido da longitude que cresce (a posição da coluna seguinte)
    const { n, leste } = quadroDoShader(i0, j0, W, H);
    const prox = quadroDoShader(i0 + 1, j0, W, H).n;
    expect([0, 1, 2].reduce((s, c) => s + (prox[c] - n[c]) * leste[c], 0)).toBeGreaterThan(0);
  });

  it('o horizonte fino: o mar liso não tapa nada, a montanha a leste tapa o rumo leste e não o oeste, em fios ou não, e a marcha passa dos 336 km', async () => {
    // a grade fina 1024×512 levada à de 384×192 (2,67 colunas finas por célula)
    const [Wf, Hf, W, H] = [1024, 512, 384, 192];
    const j0 = Hf / 2;
    const i0 = Wf / 2;
    const lonM = Math.round(1.2 / (360 / Wf)); // a ~134 km a leste
    const metros = Float64Array.from({ length: Wf * Hf }, (_, k) => 8000 * Math.exp(-(((k % Wf) - i0 - lonM) ** 2 + (Math.floor(k / Wf) - j0) ** 2) / 2));
    const { senos, horizon } = await horizonteDaTerra(metros, Wf, Hf, W, H, { fios: 2 });
    const N = W * H;
    const celula = Math.floor((j0 * H) / Hf) * W + Math.floor((i0 * W) / Wf);
    expect(senos[0 * N + celula]).toBeGreaterThan(Math.sin(1 * RAD));
    expect(senos[3 * N + celula]).toBe(0);
    expect(horizon.length).toBe(N * 3);
    // as faixas em dois fios dão o mesmo mapa que a marcha inteira de uma vez
    const raioM = RAIO_KM * 1000;
    const deUmaVez = horizonteFinoNasLinhas({ alturaM: Float32Array.from(metros), Wf, Hf, W, H, raioM, angulos: angulosDoHorizonte(Wf), J0: 0, J1: H });
    expect(senos).toEqual(deUmaVez);
    const liso = await horizonteDaTerra(new Float64Array(Wf * Hf), Wf, Hf, W, H, { fios: 2 });
    expect(liso.senos.every((s) => s === 0)).toBe(true);
    // a marcha anda na grade da FONTE e passa do alcance da montanha mais alta
    const ultimo = angulosDoHorizonte(ETOPO.largura).at(-1);
    expect(ultimo * RAIO_KM).toBeGreaterThan(Math.sqrt(2 * RAIO_KM * 8.85));
  });

  it('a cadeia lê do parametros.json dos candidatos os mesmos números que o gerador dá, e as três entradas dividem um só relevo', () => {
    const superficie = { lagos: [{ nome: 'Baikal', nivelM: 456, areaKm2: 32005, fundoM: -1184 }], abaixoDoMar: 7 };
    // o registro do candidato (capturas/efeitos-timidos/relevo/parametros.json)
    const p = {
      fonte: { ...ETOPO },
      raioKm: RAIO_KM,
      superficie: { regra: 'lagos com fundo sobem ao espelho; depois tudo < 0 m vai a 0 m', ...superficie },
      normal: { ganho: 1 },
      horizonte: {
        grade: [HORIZONTE.largura, HORIZONTE.altura],
        marcha: { faixas: [[0.5, 1], [1, 3.1]], passos: angulosDoHorizonte(ETOPO.largura).length, gradeDaMarcha: [ETOPO.largura, ETOPO.altura] },
      },
    };
    expect(numerosDoCandidatoDaTerra(p)).toEqual(numerosDoRelevoDaTerra({ etopoSha256: ETOPO.sha256, superficie }));
    const daTerra = FONTES.filter((f) => f.corpo === 'earth');
    expect(daTerra.map((f) => f.canal)).toEqual(['map', 'clouds', 'night', 'normal', 'horizon', 'horizon2', 'roughness']);
    const relevo = daTerra.filter((f) => f.relevoTerra);
    expect(relevo.map((f) => f.canal)).toEqual(['normal', 'horizon', 'horizon2']);
    expect(relevo.every((f) => f.relevoTerra === relevo[0].relevoTerra && !f.bake && !f.nomeNoDoador)).toBe(true);
    expect(relevo[0].relevoTerra.etopo.sha256).toBe(ETOPO.sha256);
  });

  it('o portão grava a Terra só com os três canais e os números aprovados, sem escala do app', () => {
    const numeros = numerosDoRelevoDaTerra({ etopoSha256: ETOPO.sha256, superficie: { lagos: [], abaixoDoMar: 7 } });
    const aprovados = { normal: 'a'.repeat(64), horizon: 'b'.repeat(64), horizon2: 'c'.repeat(64), parametros: 'd'.repeat(64) };
    const base = { rotulo: 'earth/normal', candidato: 'c', obtidos: aprovados, aprovados, numeros, doCandidato: numeros, canais: ['normal', 'horizon', 'horizon2'] };
    expect(portaoDoRelevo(base).grava).toBe(true);
    for (const k of Object.keys(aprovados)) {
      const r = portaoDoRelevo({ ...base, obtidos: { ...aprovados, [k]: 'f'.repeat(64) } });
      expect(r.grava).toBe(false);
      expect(r.mensagem).toContain(`${k}: sha256`);
    }
    const semHorizon2 = portaoDoRelevo({ ...base, aprovados: { ...aprovados, horizon2: undefined } });
    expect([semHorizon2.grava, /horizon2 sem hash/.test(semHorizon2.mensagem)]).toEqual([false, true]);
    const outraAgua = portaoDoRelevo({ ...base, numeros: { ...numeros, superficie: { lagos: [], abaixoDoMar: 8 } } });
    expect([outraAgua.grava, /superficie\.abaixoDoMar: 8 ≠ 7/.test(outraAgua.mensagem)]).toEqual([false, true]);
  });
});
