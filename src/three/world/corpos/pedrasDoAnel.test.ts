// Serve: lei — as pedras 3D do anel (o padrão; `?pedras=0` volta à lajota) só mostram o que o anel tem, em lugar que não depende da câmera, e o disco cede só o que elas carregam
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  ANEL_FRAG,
  GLSL_CAMADA_DO_ANEL,
  GLSL_CONSTANTES_DO_ANEL,
  GLSL_REGIAO_DO_ANEL,
  GLSL_SOMBRA_DO_PLANETA_NO_ANEL,
} from './gigante';
import {
  ALCANCE_DA_NEVOA_KM,
  FRACAO_NAO_RESOLVIDA,
  FRACAO_POR_OITAVA,
  IMAGENS,
  K_JANELA,
  K_LADRILHO,
  OITAVAS,
  PEDRAS_3D,
  PEDRAS_POR_TIER,
  PedrasDoAnel,
  R0_KM,
  TABELA_DE_OITAVAS,
  TAU_TETO,
  TEXEL_DA_ESTEIRA_KM,
  VARIANTES,
  X_ENTRA,
  X_PLENO,
  aceitaPedra,
  assarFormas,
  atenuacaoDoSol,
  alfaCedido,
  alfaComANevoa,
  cessaoDoDisco,
  densidadeDaEsteira,
  distanciaDaProfundidade,
  estiramentoDaEsteira,
  CELULA,
  LAMBDA_DA_ESTEIRA_KM,
  alturaNaCamada,
  celulasDaOitava,
  celulasDoQuadro,
  fasesDoLadrilho,
  lugarDaPedra,
  luzDaFace,
  pedacosPorArea,
  presencaDaOitava,
  solAberto,
  tauDaNevoa,
  ESCALA_DO_MONTE,
  ENVOLVE,
  OITAVAS_DA_SOMBRA,
  colunaDaSombra,
  elipseDaSombra,
  esperadoDaSombra,
  fatoresDaSombra,
  forcaDaSombra,
  volumeDaSombra,
  ladoDaSombraNaTela,
  pesoDaSombra,
  SOMBRA_PX_SOME,
  SOMBRA_PX_INTEIRA,
} from './pedrasDoAnel';
import { U_PERFIL_BASE, U_PERFIL_ESCALA } from './gigante';
import { ANEL_DE_SATURNO, regiaoDoAnelCpu } from './descricaoDoAnel';

const KM_POR_RAIO = ANEL_DE_SATURNO.raioEquatorialKm;
const A_MAX_KM = ANEL_DE_SATURNO.pedacos.raioMaxKm;

function pedrasDeTeste(Classe: typeof PedrasDoAnel = PedrasDoAnel) {
  return new Classe({
    glslSombraDoPlaneta: GLSL_SOMBRA_DO_PLANETA_NO_ANEL,
    glslConstantesDoAnel: GLSL_CONSTANTES_DO_ANEL,
    glslRegiaoDoAnel: GLSL_REGIAO_DO_ANEL,
    glslCamadaDoAnel: GLSL_CAMADA_DO_ANEL,
    rInt: ANEL_DE_SATURNO.desenho.rInt,
    rExt: ANEL_DE_SATURNO.desenho.rExt,
    uEscala: U_PERFIL_ESCALA,
    uBase: U_PERFIL_BASE,
    fatorTau: (km) => regiaoDoAnelCpu(km).fatorTau,
  });
}

function quadro(rKm: number, alturaKm: number, jd = 2446471) {
  return {
    dirSolLocal: new THREE.Vector3(0.9, 0, 0.42).normalize(),
    camLocal: new THREE.Vector3(rKm / KM_POR_RAIO, 0, alturaKm / KM_POR_RAIO),
    luzGanho: 1,
    solAngRad: 0.005,
    kPolar: 0.9,
    nearRaios: 1e-6,
    tier: 'cinema' as const,
    jd,
  };
}

describe('pedras 3D do anel', () => {
  it('as pedras são o padrão: sem parâmetro (e fora do navegador) o disco carrega a cessão', () => {
    expect(PEDRAS_3D).toBe(true);
    expect(ANEL_FRAG).toContain('cederAsPedras(clamp(camada.y, 0.0, 1.0), tau)');
  });

  it('com ?pedras=0 nada muda do de antes: o disco não carrega a cessão', async () => {
    vi.stubGlobal('window', { location: { search: '?pedras=0' } });
    vi.resetModules();
    try {
      const volta = await import('./pedrasDoAnel');
      const giganteDeAntes = await import('./gigante');
      expect(volta.PEDRAS_3D).toBe(false);
      expect(giganteDeAntes.ANEL_FRAG).not.toContain('cederAsPedras');
      expect(giganteDeAntes.ANEL_FRAG).toContain(
        'gl_FragColor = vec4(direta + doGlobo, clamp(camada.y, 0.0, 1.0));'
      );
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it('cada pedaço entra com opacidade zero na borda da janela, opaco uma oitava dentro, e não sai de perto', () => {
    for (let o = 0; o < OITAVAS; o++) {
      const { s: tam, janela } = TABELA_DE_OITAVAS[o]!;
      expect(janela).toBe(K_JANELA * tam);
      expect(presencaDaOitava(o, janela)).toBe(0);
      expect(presencaDaOitava(o, janela * 1.5)).toBe(0);
      expect(presencaDaOitava(o, janela * 0.99)).toBeLessThan(0.05);
      expect(presencaDaOitava(o, 2 ** X_PLENO * tam)).toBe(1);
      expect(presencaDaOitava(o, 0.01 * tam)).toBe(1);
    }
  });

  it('só tamanhos medidos: a maior oitava acaba em 10 m de raio, a menor em ~1 cm', () => {
    expect(TABELA_DE_OITAVAS[0]!.s).toBeCloseTo(2 * A_MAX_KM / 2, 12);
    expect(TABELA_DE_OITAVAS[OITAVAS - 1]!.s / 2).toBeGreaterThan(0.5e-5);
  });

  it('a densidade por oitava é a da lei a⁻³ medida, e as frações de τ fecham em 1', () => {
    // a integral de n(a) = C·a⁻³ em [a, 2a), com τ = π·C·ln(a_max/a_min)
    const lnF = Math.log(A_MAX_KM / 0.5e-5);
    for (const tau of [0.1, 0.5, 2]) {
      for (const a of [1e-5, 1e-4, 1e-3, 5e-3]) {
        const C = tau / (Math.PI * lnF);
        let n = 0;
        const passos = 20000;
        for (let k = 0; k < passos; k++) {
          const x = a * (1 + (k + 0.5) / passos);
          n += (C / (x * x * x)) * (a / passos);
        }
        expect(pedacosPorArea(tau, a) / n).toBeCloseTo(1, 6);
      }
    }
    expect(OITAVAS * FRACAO_POR_OITAVA + FRACAO_NAO_RESOLVIDA).toBeCloseTo(1, 12);
    expect(FRACAO_NAO_RESOLVIDA).toBeGreaterThan(0.08);
    expect(FRACAO_NAO_RESOLVIDA).toBeLessThan(0.1);
    // o campo aceita exatamente essa contagem por área (antes do teto)
    const rho = 128_000;
    for (let o = 0; o < OITAVAS; o++) {
      const t = TABELA_DE_OITAVAS[o]!;
      const tau = 0.5;
      const aceitos = PEDRAS_POR_TIER.cinema * ((tau * rho) / (R0_KM * TAU_TETO));
      const area = t.ladoRadial * t.ladoNoArco * (rho / R0_KM);
      expect(aceitos / area / pedacosPorArea(tau, t.s / 2)).toBeCloseTo(1, 2);
    }
  });

  it('densidade zero onde o perfil é zero (divisão vazia, fora do anel)', () => {
    for (const sorteio of [0, 1e-9, 0.3, 0.999]) {
      expect(aceitaPedra(0, 120_000, sorteio)).toBe(false);
    }
    expect(aceitaPedra(0.5, 120_000, 0)).toBe(true);
  });

  it('a cessão do disco é contínua e é a fração de τ das oitavas resolvidas', () => {
    const cheia = OITAVAS * FRACAO_POR_OITAVA;
    expect(cessaoDoDisco(1e-6)).toBeCloseTo(cheia, 12);
    let antes = cessaoDoDisco(1e-6);
    for (let d = 1e-6; d <= 10; d *= 1.002) {
      const f = cessaoDoDisco(d);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(cheia + 1e-12);
      expect(Math.abs(f - antes)).toBeLessThan(0.002);
      antes = f;
    }
    // do alto nenhum pedaço se resolve: o disco é o de hoje
    expect(cessaoDoDisco(TABELA_DE_OITAVAS[0]!.janela)).toBe(0);
    expect(cessaoDoDisco(8)).toBe(0);
    for (const a of [0, 0.2, 0.7, 1]) expect(alfaCedido(a, 0)).toBe(a);
    expect(alfaCedido(0.6, 1)).toBe(0);
  });

  it('o lugar de um pedaço no anel não depende da câmera (acima ou abaixo do plano)', () => {
    const camA = { rhoKm: 128_000, theta: 0.3, zKm: 0.003 };
    const camB = { rhoKm: 128_000.0004, theta: 0.3 + 2e-9, zKm: -0.003 };
    let comparados = 0;
    for (let o = 0; o < OITAVAS; o++) {
      for (let i = 0; i < 400; i++) {
        for (const [g, e] of [[0, 0], [3.7, -91.2]] as const) {
          const a = lugarDaPedra(o, i, camA, g, e);
          const b = lugarDaPedra(o, i, camB, g, e);
          // só onde as duas câmeras escolhem a mesma imagem do ladrilho (com
          // folga para o deslocamento da esteira, até ~7 m)
          const t = TABELA_DE_OITAVAS[o]!;
          const dS = a.sKm - R0_KM * camA.theta;
          if (Math.abs(a.rhoKm - camA.rhoKm) > 0.4 * t.ladoRadial - 0.008 || Math.abs(dS) > 0.4 * t.ladoNoArco - 0.008) continue;
          expect(b.rhoKm).toBeCloseTo(a.rhoKm, 9);
          expect(b.sKm).toBeCloseTo(a.sKm, 9);
          expect(b.zKm).toBe(a.zKm);
          expect(b.raioKm).toBe(a.raioKm);
          comparados++;
        }
      }
    }
    expect(comparados).toBeGreaterThan(1000);
  });

  it('a janela passa do ladrilho: a imagem vizinha é o mesmo mundo, um ladrilho adiante, e as oito vizinhas bastam', () => {
    // a janela (512 tamanhos) passa do meio ladrilho (256) e fica aquém de 1,5 ladrilho (768)
    expect(K_JANELA).toBeGreaterThan(K_LADRILHO);
    expect(K_JANELA).toBeLessThan(3 * K_LADRILHO);
    expect(IMAGENS[0]).toEqual([0, 0]);
    const camA = { rhoKm: 128_000, theta: 0.3, zKm: 0.003 };
    for (let o = 0; o < OITAVAS; o++) {
      const t = TABELA_DE_OITAVAS[o]!;
      // a câmera um ladrilho para fora vê na imagem dela o que A vê na vizinha de fora
      const camB = { ...camA, rhoKm: camA.rhoKm + t.ladoRadial };
      for (let i = 0; i < 20; i++) {
        const a = lugarDaPedra(o, i, camA, 3.7, -91.2, [1, 0]);
        const b = lugarDaPedra(o, i, camB, 3.7, -91.2);
        expect(a.rhoKm).toBeCloseTo(b.rhoKm, 6);
        expect(Math.abs(a.sKm - b.sKm)).toBeLessThan(1e-6);
        expect(a.zKm).toBe(b.zKm);
        // e a vizinha no arco é a mesma pedra, um ladrilho de arco adiante
        const c = lugarDaPedra(o, i, camA, 3.7, -91.2, [0, 1]);
        const d0 = lugarDaPedra(o, i, camA, 3.7, -91.2);
        expect(c.raioKm).toBe(d0.raioKm);
        expect(Math.abs(c.sKm - d0.sKm - t.ladoNoArco)).toBeLessThan(2 * TEXEL_DA_ESTEIRA_KM + 0.02);
      }
    }
  }, 120_000);

  it('as células vizinhas só entram onde a janela as alcança: nenhuma do alto, a 4,3 km só as de lado', () => {
    const celulas = Array.from({ length: OITAVAS }, (_, o) => celulasDaOitava(o));
    const op = new Float32Array(IMAGENS.length * OITAVAS * (PEDRAS_POR_TIER.cinema / CELULA));
    const es = new Float32Array(op.length);
    const fases = [0, 1, 2, 3].map(() => new Float64Array(OITAVAS));
    fasesDoLadrilho(130_000, 0.4, 0, 0, fases[0]!, fases[1]!, fases[2]!, fases[3]!);
    const vista = (ativas: number, zKm: number) => ({
      ativas, porOitava: PEDRAS_POR_TIER.cinema, rhoKm: 130_000, zKm, espessuraKm: 0.008, lente: null,
      fr: fases[0]!, fs: fases[1]!, gi: fases[2]!, gf: fases[3]!,
    });
    expect(celulasDoQuadro(vista(0, 20), celulas, op, es)).toEqual([0, 0]);
    // a 4,3 km só a maior oitava alcança, e só as vizinhas de lado (os cantos ficam a ≥ 362 tamanhos no plano)
    const ativas = PedrasDoAnel.oitavasAtivas(4.3);
    expect(ativas).toBe(1);
    const [nOp, nEs] = celulasDoQuadro(vista(ativas, 4.3), celulas, op, es);
    expect(nOp).toBe(0);
    const imagens = new Set(Array.from(es.subarray(0, nEs), (k) => Math.floor(k / (OITAVAS * (PEDRAS_POR_TIER.cinema / CELULA)))));
    expect([...imagens].every((m) => m < 5)).toBe(true);
    expect(imagens.has(0)).toBe(true);
  });

  it('o descarte por célula nunca deixa de fora um pedaço que o vértice desenharia, nem perto da borda da tela', () => {
    const celulas = Array.from({ length: OITAVAS }, (_, o) => celulasDaOitava(o));
    const posicao = celulas.map((c) => {
      const p = new Int32Array(PEDRAS_POR_TIER.cinema);
      c.ids.forEach((i, j) => (p[i] = j));
      return p;
    });
    const op = new Float32Array(IMAGENS.length * OITAVAS * (PEDRAS_POR_TIER.cinema / CELULA));
    const es = new Float32Array(op.length);
    const mis = (x: number) => {
      x = (x ^ (x >>> 16)) >>> 0;
      x = Math.imul(x, 0x7feb352d) >>> 0;
      x = (x ^ (x >>> 15)) >>> 0;
      x = Math.imul(x, 0x846ca68b) >>> 0;
      return (x ^ (x >>> 16)) >>> 0;
    };
    const des = (Math.max(...ANEL_DE_SATURNO.regioes.map((r) => r.esteira)) * 2 * Math.asin(0.66) * LAMBDA_DA_ESTEIRA_KM) / (2 * Math.PI) + 0.0005;
    // (altura km, mergulho e azimute da visada em graus, cisalhamento g, tier): de cima, rasante, dentro da camada
    const cameras = [
      [0.1, 30, 200, 0, 'cinema'],
      [0.02, 2, 95, -37.3, 'cinema'],
      [0, 0, 10, 5.6, 'cinema'],
      [0.002, -20, 300, -0.4, 'performance'],
    ] as const;
    let conferidos = 0;
    for (const [zKm, dep, az, g, tier] of cameras) {
      const rho = 128_370;
      const fr = new Float64Array(OITAVAS);
      const fs = new Float64Array(OITAVAS);
      const gi = new Float64Array(OITAVAS);
      const gf = new Float64Array(OITAVAS);
      fasesDoLadrilho(rho, 0.7, g, g * rho, fr, fs, gi, gf);
      // a lente: linhas = direita, cima, trás, no quadro (er, et, ez); 58° na vertical, 1280 × 800
      const fw = new THREE.Vector3(Math.cos((az * Math.PI) / 180), Math.sin((az * Math.PI) / 180), 0)
        .multiplyScalar(Math.cos((dep * Math.PI) / 180)).setZ(-Math.sin((dep * Math.PI) / 180));
      const dir = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 0, 1)).normalize();
      const cima = new THREE.Vector3().crossVectors(dir, fw);
      const p11 = 1 / Math.tan((29 * Math.PI) / 180);
      const lente = { m: new Float64Array([...dir.toArray(), ...cima.toArray(), ...fw.clone().negate().toArray()]), p00: p11 / 1.6, p11, pxPorRad: 400 * p11, ok: true };
      const ativas = PedrasDoAnel.oitavasAtivas(zKm);
      const porOitava = PEDRAS_POR_TIER[tier];
      const [nOp, nEs] = celulasDoQuadro({ ativas, porOitava, rhoKm: rho, zKm, espessuraKm: 0.008, lente, fr, fs, gi, gf }, celulas, op, es);
      const opacos = new Set(op.subarray(0, nOp));
      const esmaece = new Set(es.subarray(0, nEs));
      // menos que a janela inteira, mas tudo o que o vértice desenha
      expect(nOp + nEs).toBeLessThan(0.6 * 2 * IMAGENS.length * ativas * (porOitava / CELULA));
      let perdidos = 0;
      for (let o = 0; o < ativas; o++) {
        const t = TABELA_DE_OITAVAS[o]!;
        const alcance2 = 2 ** (2 * X_ENTRA) * t.s * t.s;
        for (let m = 0; m < IMAGENS.length; m++) {
          const [jr, ja] = IMAGENS[m]!;
          for (let i = 0; i < porOitava; i++) {
            const base = mis((i ^ (o << 24)) >>> 0);
            const h0 = mis((base ^ 0x51ed27) >>> 0);
            const q = h0 & 0xffff;
            const a = q / 65536;
            const dk = Math.floor(fr[o]! - a + 0.5) + jr;
            const dR = (dk + a - fr[o]!) * t.ladoRadial;
            if (dR * dR >= alcance2) continue;
            const cis = ((gi[o]! * q) % 65536) / 65536 + gf[o]! * (dk + a);
            let sg = (mis((base ^ 0x2c1b3c6d) >>> 0) >>> 8) / 16777216 + cis + fs[o]!;
            sg -= Math.floor(sg + 0.5);
            const dS = (sg + ja) * t.ladoNoArco;
            if (dR * dR + dS * dS >= alcance2) continue;
            const raio = (0.5 * t.s) / Math.sqrt(1 - (0.75 * (h0 >>> 16)) / 65536);
            const h2 = mis((base ^ 0x7a3f91c5) >>> 0);
            const dz = alturaNaCamada(((h2 & 0xffff) + (h2 >>> 16) + 1) / 65536 - 1, raio, regiaoDoAnelCpu(rho + dR).espessura) - zKm;
            const x = Math.log2(Math.hypot(dR, dS, dz) / t.s);
            const p = Math.min(Math.max(X_ENTRA - x, 0), 1);
            if (p <= 0) continue;
            // o cone do vértice, com a lente exata (sem a folga da câmera lida)
            const y = (dS * (rho + dR)) / R0_KM;
            const M = lente.m;
            const vx = M[0]! * dR + M[1]! * y + M[2]! * dz;
            const vy = M[3]! * dR + M[4]! * y + M[5]! * dz;
            const cz = M[6]! * dR + M[7]! * y + M[8]! * dz;
            const rF = 2.5 * raio + 1.5 * des + 4e-6 * (dR * dR + dS * dS) + 1e-4;
            if (-cz < -rF || Math.abs(vx) * lente.p00 + cz > rF * Math.hypot(lente.p00, 1) || Math.abs(vy) * lente.p11 + cz > rF * Math.hypot(lente.p11, 1)) continue;
            const k = (m * OITAVAS + o) * (PEDRAS_POR_TIER.cinema / CELULA) + Math.floor(posicao[o]![i]! / CELULA);
            if (!(p >= 1 ? opacos : esmaece).has(k)) perdidos++;
            conferidos++;
          }
        }
      }
      expect(perdidos).toBe(0);
    }
    expect(conferidos).toBeGreaterThan(50_000);
  }, 120_000);

  it('nenhum pedaço passa de 10 m de raio, e nenhum centro sai da camada', () => {
    // conta as violações e cobra uma vez: 200 mil `expect` no laço estouravam 5 s com a máquina carregada
    let fora = 0;
    for (const rho of [80_000, 100_000, 119_000, 128_000]) {
      const esp = regiaoDoAnelCpu(rho).espessura;
      for (let o = 0; o < OITAVAS; o++) {
        for (let i = 0; i < 2000; i++) {
          const p = lugarDaPedra(o, i, { rhoKm: rho, theta: 1, zKm: 0 });
          if (!(p.raioKm <= A_MAX_KM)) fora++;
          if (!(Math.abs(p.zKm) <= esp / 2)) fora++;
          if (2 * p.raioKm >= esp && Math.abs(p.zKm) !== 0) fora++;
        }
      }
    }
    expect(fora).toBe(0);
  });

  it('as esteiras: média 1, contraste forte no A, e 1 no C e na divisão de Cassini', () => {
    let soma = 0;
    let n = 0;
    let max = 0;
    let min = Infinity;
    for (let a = 0; a < 300; a++) {
      for (let b = 0; b < 300; b++) {
        const d = densidadeDaEsteira(50_000 + (b + 0.5) * 0.01, 128_000 + (a + 0.5) * 0.01);
        soma += d;
        n++;
        max = Math.max(max, d);
        min = Math.min(min, d);
      }
    }
    expect(Math.abs(soma / n - 1)).toBeLessThan(0.02);
    expect(max / min).toBeGreaterThan(5);
    // pico:vale (percentis 95 e 5) ≥ 4, e o mapa nunca dobra (inversível)
    const ds: number[] = [];
    let menor = Infinity;
    for (let a = 0; a < 200; a++) {
      for (let b = 0; b < 200; b++) {
        ds.push(densidadeDaEsteira(9_000 + b * 0.0047, 101_000 + a * 0.0053));
        menor = Math.min(menor, estiramentoDaEsteira(9_000 + b * 0.0047, 101_000 + a * 0.0053));
      }
    }
    ds.sort((x, y) => x - y);
    expect(ds[Math.floor(0.95 * ds.length)]! / ds[Math.floor(0.05 * ds.length)]!).toBeGreaterThan(4);
    expect(menor).toBeGreaterThan(0.02);
    // sem fronteira de texel: contínua onde a leitura bilinear troca de 2×2 texels
    for (let m = 0; m < 20; m++) {
      const rho = (Math.floor(128_000 / TEXEL_DA_ESTEIRA_KM) + m + 0.5) * TEXEL_DA_ESTEIRA_KM;
      const s = 4_321 + 0.137 * m;
      expect(Math.abs(densidadeDaEsteira(s, rho - 1e-7) - densidadeDaEsteira(s, rho + 1e-7))).toBeLessThan(1e-3);
    }
    for (const rho of [80_000, 85_000, 118_500, 119_500]) {
      for (const s of [0, 1234.5, 777_000]) expect(densidadeDaEsteira(s, rho)).toBe(1);
    }
  });

  it('longe do plano não desenha; rente a ele acende só as oitavas que a altura alcança', () => {
    const p = pedrasDeTeste();
    p.assarJa();
    p.atualizar(quadro(128_000, 2000));
    expect(p.malha.visible).toBe(false);
    p.atualizar(quadro(128_000, 1));
    expect(p.malha.visible).toBe(true);
    // as células desenhadas (opacas e esmaecendo) são só das oitavas ativas, e todas elas aparecem
    const oitavas = new Set<number>();
    for (const m of p.malha.children.filter((m) => m instanceof THREE.Points)) {
      const g = (m as THREE.Points).geometry as THREE.InstancedBufferGeometry;
      for (const k of (g.getAttribute('aCelula').array as Float32Array).subarray(0, g.instanceCount))
        oitavas.add(Math.floor(k / (PEDRAS_POR_TIER.cinema / CELULA)) % OITAVAS);
    }
    expect([...oitavas].sort()).toEqual(Array.from({ length: PedrasDoAnel.oitavasAtivas(1) }, (_, o) => o));
    expect(PedrasDoAnel.oitavasAtivas(1)).toBeLessThan(OITAVAS);
    expect(PedrasDoAnel.oitavasAtivas(0.003)).toBe(OITAVAS);
    p.dispose();
    // assa tudo (1–2 s sozinho): com a suíte inteira em paralelo passou de 5 s e caiu no limite padrão
  }, 30_000);

  it('as esteiras do disco aparecem abaixo de 25 km, antes de qualquer pedaço', () => {
    const p = pedrasDeTeste();
    p.atualizar(quadro(128_000, 30));
    expect(p.malha.visible).toBe(false);
    p.atualizar(quadro(128_000, 10));
    expect(p.malha.visible).toBe(true);
    expect(p.cessao.w).toBe(0);
    let pedras = 0;
    p.malha.traverse((m) => {
      if (m.visible && m !== p.malha && m.renderOrder !== 10) pedras++;
    });
    expect(pedras).toBe(0);
    p.dispose();
  }, 30_000);

  it('relógio parado, pedra parada; mexer a câmera não acumula cisalhamento', () => {
    const p = pedrasDeTeste();
    p.assarJa();
    const u = ((p.malha.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
    p.atualizar(quadro(128_000, 1));
    const gf = Array.from(u.uGf.value as Float32Array);
    p.atualizar(quadro(128_500, 1.2));
    expect(Array.from(u.uGf.value as Float32Array)).toEqual(gf);
    // relógio andando: o cisalhamento anda, com o passo grampeado
    p.atualizar(quadro(128_500, 1.2, 2446471 + 1));
    expect(Array.from(u.uGf.value as Float32Array)).not.toEqual(gf);
    p.dispose();
  }, 30_000);

  it('com o anel por destino do Atlas o assado nunca sai de uma vez, nem rente à camada (15/11)', async () => {
    vi.resetModules();
    const novo = await import('./pedrasDoAnel');
    const p = pedrasDeTeste(novo.PedrasDoAnel);
    // dentro da camada, onde sem o destino o assado sairia inteiro neste quadro
    p.atualizar({ ...quadro(128_000, 0.001), anelNoDestino: true });
    expect(p.pronto).toBe(false);
    expect(p.malha.visible).toBe(false);
    expect(p.cessao.w).toBe(0);
    p.dispose();
  });

  it('montar não assa; o assado em fatias termina rumo ao anel e sai, byte a byte, o de uma vez só', async () => {
    vi.resetModules();
    const fatiado = await import('./pedrasDoAnel');
    vi.resetModules();
    const deUmaVez = await import('./pedrasDoAnel');
    try {
      const t0 = performance.now();
      const a = pedrasDeTeste(fatiado.PedrasDoAnel);
      expect(performance.now() - t0).toBeLessThan(50);
      expect(a.pronto).toBe(false);
      expect(a.malha.children).toHaveLength(0);
      // longe do anel nada anda; rumo a ele, uma fatia por quadro, sem desenhar
      a.atualizar(quadro(600_000, 0));
      a.atualizar(quadro(128_000, 50_000));
      expect(a.pronto).toBe(false);
      expect(a.malha.visible).toBe(false);
      expect(a.cessao.w).toBe(0);
      let fatias = 1;
      while (!a.pronto && fatias < 5000) {
        a.assarUmPouco(8);
        fatias++;
      }
      expect(a.pronto).toBe(true);
      expect(fatias).toBeGreaterThan(20);
      const b = pedrasDeTeste(deUmaVez.PedrasDoAnel);
      b.assarJa();
      const bytes = (p: PedrasDoAnel) => {
        const u = ((p.malha.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
        const dados: ArrayBufferView[] = ['uEsteira', 'uRelevo', 'uLonge', 'uNormaDeLonge', 'uPermutacao'].map(
          (k) => (u[k]!.value as THREE.DataTexture).image.data as ArrayBufferView
        );
        const shaders: string[] = [];
        p.malha.traverse((m) => {
          if (!(m instanceof THREE.Mesh || m instanceof THREE.Points)) return;
          const mat = m.material as THREE.ShaderMaterial;
          shaders.push(mat.vertexShader, mat.fragmentShader);
          dados.push(m.geometry.getAttribute('position').array);
          if (m.geometry.index) dados.push(m.geometry.index.array);
          for (const k of ['uFormas', 'uNormaDaMalha'])
            if (mat.uniforms[k]) dados.push((mat.uniforms[k].value as THREE.DataTexture).image.data as ArrayBufferView);
        });
        return { shaders, dados: dados.map((d) => Buffer.from(d.buffer, d.byteOffset, d.byteLength)) };
      };
      const [x, y] = [bytes(a), bytes(b)];
      expect(x.shaders).toEqual(y.shaders);
      expect(x.dados.length).toBe(y.dados.length);
      x.dados.forEach((d, k) => expect(d.equals(y.dados[k]!)).toBe(true));
      a.dispose();
      b.dispose();
    } finally {
      vi.resetModules();
    }
  }, 60_000);

  it('o lado da noite nunca é zero, nem na sombra do globo', () => {
    for (const cosSol of [-1, -0.5, 0]) {
      for (const cosGlobo of [-1, 0, 1]) {
        for (const sombra of [0, 1]) {
          expect(luzDaFace(cosSol, cosGlobo, sombra, 0)).toBeGreaterThan(0);
          expect(luzDaFace(cosSol, cosGlobo, sombra, 0, 1, 0.1)).toBeGreaterThan(0);
        }
      }
    }
    // e a luz é dura: sem o globo, a noite fica abaixo de 15 % do dia
    expect(luzDaFace(-1, 0, 1, 0)).toBeLessThan(0.15 * luzDaFace(1, 0, 1, 0));
  });

  it('na fresta do agregado o Sol não entra, a luz do anel sim: a face voltada ao Sol no fundo dela fica como a da noite', () => {
    // aberta (o céu inteiro), o Sol bate pela normal da envoltória
    expect(solAberto(1, 1)).toBe(1);
    // no fundo de uma fresta que vê 30 % do céu, o Sol a 60° da envoltória não chega
    const sol = solAberto(0.5, 0.3);
    expect(sol).toBe(0);
    expect(luzDaFace(0.8, 0, 1, 0, 0, 0.05, sol)).toBeCloseTo(luzDaFace(-1, 0, 1, 0, 0, 0.05), 10);
  });

  it('a fresta só redistribui o Sol: com o Sol em qualquer direção, o agregado inteiro e cada elevação dele recebem o de sem fresta', () => {
    const { geo, tex } = assarFormas(3);
    const n = geo.getAttribute('position').count;
    const d = tex.image.data as Float32Array;
    const norma = tex.userData.normaDoSol as number[];
    const env = (c: number) => Math.max((c + ENVOLVE) / (1 + ENVOLVE), 0);
    const em = (linha: number, i: number) => [0, 1, 2].map((q) => d[(linha * n + i) * 4 + q]!);
    // três direções do Sol no mapa octaédrico de 8² (texel i, j); as faixas de c de −0,1 em 0,05, 23
    for (const [ti, tj] of [[3, 3], [0, 4], [7, 7]] as const) {
      let x = ((ti + 0.5) / 8) * 2 - 1;
      let y = ((tj + 0.5) / 8) * 2 - 1;
      const z = 1 - Math.abs(x) - Math.abs(y);
      if (z < 0) [x, y] = [(1 - Math.abs(y)) * Math.sign(x), (1 - Math.abs(x)) * Math.sign(y)];
      const l = Math.hypot(x, y, z);
      const s = [x / l, y / l, z / l];
      const dot = (a: number[]) => a[0]! * s[0]! + a[1]! * s[1]! + a[2]! * s[2]!;
      for (let v = 0; v < VARIANTES; v++) {
        const l0 = (2 * VARIANTES + v) * 5;
        let com = 0;
        let sem = 0;
        let rasanteCom = 0;
        let rasanteSem = 0;
        for (let i = 0; i < n; i++) {
          const u = em(l0 + 1, i);
          const w = (u[0]! ** 2 + u[1]! ** 2 + u[2]! ** 2) * env(dot(em(l0 + 3, i)));
          const c = dot(em(l0 + 2, i));
          const so = solAberto(c, d[((l0 + 4) * n + i) * 4 + 2]!);
          // N interpolado nas faixas, como a GPU
          const xf = Math.min(Math.max((c + 0.1) / 0.05, 0), 22);
          const k = Math.min(Math.floor(xf), 21);
          const f = xf - k;
          const at = (kk: number) => norma[((VARIANTES + v) * 23 + kk) * 64 + tj * 8 + ti]!;
          com += (w * so) / Math.max((1 - f) * at(k) + f * at(k + 1), 0.05);
          sem += w;
          if (c >= 0 && c < 0.15) {
            rasanteCom += (w * so) / Math.max((1 - f) * at(k) + f * at(k + 1), 0.05);
            rasanteSem += w;
          }
        }
        expect(Math.abs(com / sem - 1)).toBeLessThan(0.01);
        // as faces rasantes também (a média de todas as direções as deixava com menos da metade)
        if (rasanteSem > 0.02 * sem) expect(Math.abs(rasanteCom / rasanteSem - 1)).toBeLessThan(0.15);
      }
    }
  });

  it('o Sol na camada: e^(−τF/μ0) dividido pela média em F — média 1, o de cima claro, o do fundo na penumbra', () => {
    for (const [tau, mu0] of [[0, 0.4], [0.5, 0.42], [1.2, 0.42], [2, 0.1]] as const) {
      const n = 4000;
      let soma = 0;
      let antes = Infinity;
      for (let k = 0; k < n; k++) {
        const m = atenuacaoDoSol((k + 0.5) / n, tau, mu0);
        expect(m).toBeLessThanOrEqual(antes);
        antes = m;
        soma += m;
      }
      expect(soma / n).toBeCloseTo(1, 5);
      const x = Math.min(tau / mu0, 3);
      // a razão entre o topo e o fundo é a do Sol atravessando a camada inteira
      expect(atenuacaoDoSol(1, tau, mu0) / atenuacaoDoSol(0, tau, mu0)).toBeCloseTo(Math.exp(-x), 9);
    }
    // sem pedaços entre ele e o Sol, Sol inteiro; o teto de x segura o de cima
    expect(atenuacaoDoSol(0.3, 0, 0.4)).toBe(1);
    expect(atenuacaoDoSol(0, 5, 0.05)).toBeLessThan(3.2);
  });

  it('as formas assadas: a de longe é o corpo que o ponto acerta, e toda normal aponta para fora', () => {
    const { geo, tex } = assarFormas(3);
    const n = geo.getAttribute('position').count;
    const d = tex.image.data as Float32Array;
    const v = (linha: number, i: number) => Array.from(d.subarray((linha * n + i) * 4, (linha * n + i) * 4 + 3));
    for (let t = 0; t < 3; t++) {
      for (let k = 0; k < VARIANTES; k++) {
        const l0 = (t * VARIANTES + k) * 5;
        for (let i = 0; i < n; i++) {
          for (const [u, nn] of [[v(l0, i), v(l0 + 2, i)], [v(l0 + 1, i), v(l0 + 3, i)]] as const) {
            expect(Math.hypot(...nn)).toBeCloseTo(1, 4);
            expect(u[0]! * nn[0]! + u[1]! * nn[1]! + u[2]! * nn[2]!).toBeGreaterThan(0);
          }
          // o bloco de longe é o poliedro dentro da esfera unitária: nada passa do raio 1
          if (t === 0) expect(Math.hypot(...v(l0, i))).toBeLessThanOrEqual(1 + 1e-6);
        }
      }
    }
  });

  it('na troca do ponto para a malha o agregado não muda de tamanho: a forma de longe é a de perto filtrada', () => {
    const { geo, tex } = assarFormas(7);
    const n = geo.getAttribute('position').count;
    const d = tex.image.data as Float32Array;
    const r2 = (linha: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += d[(linha * n + i) * 4]! ** 2 + d[(linha * n + i) * 4 + 1]! ** 2 + d[(linha * n + i) * 4 + 2]! ** 2;
      return s / n;
    };
    for (let t = 1; t < 3; t++) {
      for (let k = 0; k < VARIANTES; k++) {
        const l0 = (t * VARIANTES + k) * 5;
        const longe = Math.sqrt(r2(l0)) * ESCALA_DO_MONTE[0];
        const perto = Math.sqrt(r2(l0 + 1)) * ESCALA_DO_MONTE[1];
        expect(Math.abs(longe / perto - 1)).toBeLessThan(0.03);
      }
    }
  });
  it('a profundidade só dos pedaços: nada cortado perto da lente, a ordem fica, e de 2n para longe é a da lente', () => {
    const n = 0.012;
    expect(distanciaDaProfundidade(0.03, n)).toBe(0.03);
    expect(distanciaDaProfundidade(2 * n, n)).toBe(2 * n);
    let antes = 0;
    for (let d = 1e-5; d < 0.05; d *= 1.05) {
      const g = distanciaDaProfundidade(d, n);
      expect(g).toBeGreaterThan(n);
      expect(g).toBeGreaterThanOrEqual(antes);
      antes = g;
    }
    // um pedaço a 1 m fica na frente de um a 3 m
    expect(distanciaDaProfundidade(0.001, n)).toBeLessThan(distanciaDaProfundidade(0.003, n));
  });

  it('de dentro da camada o horizonte fecha: névoa e pedaços somam a transmissão da camada', () => {
    // a câmera no meio da camada do A: τ = 0,5, espessura 8 m, campo cheio
    const tau = 0.5;
    const esp = 0.008;
    const esperada = (graus: number) => Math.exp(-tau / (2 * Math.sin((graus * Math.PI) / 180)));
    for (const graus of [0, 5, 20]) {
      const dz = Math.sin((graus * Math.PI) / 180);
      const nevoa = Math.exp(-tauDaNevoa(0, dz, ALCANCE_DA_NEVOA_KM, esp, tau, 1));
      // o que as oitavas desenhadas carregam no mesmo raio: τ/esp por km de cada uma até onde ela se resolve
      const caminho = graus === 0 ? ALCANCE_DA_NEVOA_KM : (0.5 * esp) / dz;
      let resolvido = 0;
      for (const o of TABELA_DE_OITAVAS) resolvido += FRACAO_POR_OITAVA * Math.min(caminho, o.s * 2 ** ((X_PLENO + X_ENTRA) / 2));
      const pedacos = Math.exp(-(tau / esp) * resolvido);
      expect(nevoa * pedacos).toBeCloseTo(graus === 0 ? 0 : esperada(graus), 6);
    }
    // a 0° a névoa sozinha já tapa; a 5° tapa cerca de metade do que sobra (com a janela de r20 os
    // pedaços desenhados carregam mais do raio); a 20° quase nada
    expect(Math.exp(-tauDaNevoa(0, 0, ALCANCE_DA_NEVOA_KM, esp, tau, 1))).toBeLessThan(1e-6);
    expect(Math.exp(-tauDaNevoa(0, Math.sin((5 * Math.PI) / 180), ALCANCE_DA_NEVOA_KM, esp, tau, 1))).toBeCloseTo(0.47, 1);
    expect(Math.exp(-tauDaNevoa(0, Math.sin((20 * Math.PI) / 180), ALCANCE_DA_NEVOA_KM, esp, tau, 1))).toBeCloseTo(0.91, 1);
  });

  it('rente ao plano, na passagem disco → névoa, a camada inteira tapa como e^(−τ/sen e): as duas repartem τ, não o alfa', () => {
    // a câmera a 20 m do plano do A (τ = 0,44, espessura 8 m): o raio atravessa a camada inteira
    const tau = 0.44;
    const esp = 0.008;
    const h = 0.02;
    for (const graus of [3, 5, 10, 20]) {
      const dz = -Math.sin((graus * Math.PI) / 180);
      const esperada = Math.exp(-tau / -dz);
      // o disco e a névoa com a mesma camada inteira (nada cedido aos pedaços: teto 0)
      const alfaDoDisco = 1 - esperada;
      const tauNevoa = tauDaNevoa(h, dz, ALCANCE_DA_NEVOA_KM, esp, tau, 0);
      for (const peso of [0.2, 0.5, 0.8]) {
        const disco = alfaComANevoa(alfaDoDisco, peso);
        const nevoa = 1 - Math.exp(-peso * tauNevoa);
        expect((1 - disco) * (1 - nevoa)).toBeCloseTo(esperada, 6);
      }
      // repartir o alfa vazava: a 5°, no meio da passagem, ~25 % em vez de 0,6 %
      if (graus === 5) expect((1 - 0.5 * alfaDoDisco) * (1 - 0.5 * (1 - Math.exp(-tauNevoa)))).toBeGreaterThan(0.2);
    }
    expect(alfaComANevoa(0.7, 0)).toBe(0.7);
    expect(alfaComANevoa(0.7, 1)).toBe(0);
  });

  it('a sombra do pedaço cai para longe do Sol: no plano médio, a elipse de a por a/sen e deslocada pela altura', () => {
    const e = (20 * Math.PI) / 180;
    const az = (30 * Math.PI) / 180;
    const a = 0.001;
    const h = 0.008;
    for (const lado of [1, -1]) {
      const sol: [number, number, number] = [Math.cos(az) * Math.cos(e), Math.sin(az) * Math.cos(e), lado * Math.sin(e)];
      const p: [number, number, number] = [0.1, 0.2, 0.002];
      const el = elipseDaSombra(p, a, sol);
      // o rumo é o oposto do azimute do Sol; o centro anda z·cot e para lá (z do lado do Sol)
      expect(el.rumo[0]).toBeCloseTo(-Math.cos(az), 12);
      expect(el.rumo[1]).toBeCloseTo(-Math.sin(az), 12);
      const zs = lado * p[2];
      expect(el.centro[0]).toBeCloseTo(p[0] + el.rumo[0] * zs / Math.tan(e), 12);
      expect(el.centro[1]).toBeCloseTo(p[1] + el.rumo[1] * zs / Math.tan(e), 12);
      expect(el.maior).toBeCloseTo(a / Math.sin(e), 12);
      expect(el.menor).toBe(a);
      // a coluna: sombreada atrás do pedaço, nunca do lado do Sol
      const atras = colunaDaSombra(Math.max(zs, 0) / Math.tan(e) + 0.5 * a, a, zs, h, Math.sin(e), Math.cos(e));
      expect(atras).toBeGreaterThan(0);
      expect(colunaDaSombra(-2 * a, a, zs, h, Math.sin(e), Math.cos(e))).toBe(0);
    }
    // a integral da coluna no plano é o volume sombreado (a mesma geometria por dois caminhos), pequeno e grande
    for (const [ra, zs] of [[0.0005, 0.002], [0.006, 0]] as const) {
      const sen = Math.sin(e);
      const cos = Math.cos(e);
      const u0 = -ra * sen;
      const u1 = (ra + (0.5 * h + zs) * cos) / sen;
      const nu = 800;
      const nv = 200;
      let soma = 0;
      for (let i = 0; i < nu; i++)
        for (let j = 0; j < nv; j++) {
          const v = ra * (-1 + (2 * (j + 0.5)) / nv);
          soma += colunaDaSombra(u0 + ((i + 0.5) * (u1 - u0)) / nu, Math.sqrt(ra * ra - v * v), zs, h, sen, cos);
        }
      expect((soma * ((u1 - u0) / nu) * ((2 * ra) / nv)) / (volumeDaSombra(ra, zs, h, sen) / h)).toBeCloseTo(1, 2);
    }
  });

  it('a largura da sombra na tela é o eixo menor da elipse projetada: a de cima, fina de lado, e cai com o rasante', () => {
    const sen = Math.sin((25 * Math.PI) / 180);
    const rumo: [number, number] = [Math.cos(0.7), Math.sin(0.7)];
    // de cima: o eixo menor é o raio, a d km
    expect(ladoDaSombraNaTela([0, 0, -2], rumo, sen, 1000)).toBeCloseTo(500, 6);
    for (const rel of [[0.3, -0.8, -0.05], [-1.2, 0.1, -0.002], [0.05, 0.02, -0.04]] as [number, number, number][]) {
      const d = Math.hypot(...rel);
      const w = rel.map((x) => x / d);
      const t = [-rumo[1], rumo[0], 0];
      const r = [rumo[0], rumo[1], 0];
      // a força bruta: o contorno da elipse projetado no plano da tela, o ponto mais perto do centro
      const proj = (v: number[]) => {
        const k = v[0]! * w[0]! + v[1]! * w[1]! + v[2]! * w[2]!;
        return v.map((x, i) => x - k * w[i]!);
      };
      const e1 = proj(t);
      const e2 = proj(r).map((x) => x / sen);
      let menor = Infinity;
      for (let i = 0; i < 3600; i++) {
        const f = (Math.PI * i) / 3600;
        menor = Math.min(menor, Math.hypot(...e1.map((x, k) => Math.cos(f) * x + Math.sin(f) * e2[k]!)));
      }
      expect((ladoDaSombraNaTela(rel, rumo, sen, 1000) * d) / 1000 / menor).toBeCloseTo(1, 2);
    }
    expect(pesoDaSombra(SOMBRA_PX_SOME)).toBe(0);
    expect(pesoDaSombra(SOMBRA_PX_INTEIRA)).toBe(1);
  });

  it('as sombras explícitas conservam a luz média do disco: num campo de pedaços, a média de T é a e^(−E) que sai da conta estatística, com o nível de detalhe ou sem ele', () => {
    const h = 0.008;
    const tau = 0.6;
    for (const [graus, oitavas, comPeso] of [
      [25, [2], false],
      [4, [0, 1, 2], false],
      [25, [1, 2], true],
      [4, [2], true],
    ] as const) {
      const sen = Math.sin((graus * Math.PI) / 180);
      const cos = Math.sqrt(1 - sen * sen);
      const g = fatoresDaSombra(sen, h);
      const k = forcaDaSombra(tau, g);
      // um quadrado periódico de 1 km, numa grade de 2 m; o Sol vem de −x
      const lado = 1;
      const n = 500;
      const passo = lado / n;
      const od = new Float64Array(n * n);
      let semente = 12345;
      const sorteio = () => ((semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0) / 4294967296);
      // o nível de detalhe: o lado da sombra na tela sobe ao longo de x (a oitava 2 vai de 0 a 1,5 vez a largura inteira), o mesmo peso no pixel para T e para E
      const s2 = TABELA_DE_OITAVAS[2]!.s;
      const pesos = (i: number) =>
        Array.from({ length: OITAVAS_DA_SOMBRA }, (_, o) =>
          comPeso ? pesoDaSombra((TABELA_DE_OITAVAS[o]!.s / s2) * 1.5 * SOMBRA_PX_INTEIRA * ((((i % n) + n) % n) / n)) : 1
        );
      const pesoNaColuna = Array.from({ length: n }, (_, i) => pesos(i));
      for (const o of oitavas) {
        const s = TABELA_DE_OITAVAS[o]!.s;
        const quantos = Math.round(pedacosPorArea(tau, 0.5 * s) * lado * lado);
        for (let q = 0; q < quantos; q++) {
          const a = (0.5 * s) / Math.sqrt(1 - 0.75 * sorteio());
          const zs = alturaNaCamada(sorteio() + sorteio() - 1, a, h);
          const x = sorteio() * lado;
          const y = sorteio() * lado;
          const u0 = -a * sen;
          const u1 = (a + (0.5 * h + zs) * cos) / sen;
          for (let i = Math.floor((x + u0) / passo); i <= Math.ceil((x + u1) / passo); i++)
            for (let j = Math.floor((y - a) / passo); j <= Math.ceil((y + a) / passo); j++) {
              const v = j * passo - y;
              if (Math.abs(v) >= a) continue;
              const S = colunaDaSombra(i * passo - x, Math.sqrt(a * a - v * v), zs, h, sen, cos);
              const ii = ((i % n) + n) % n;
              if (S > 0) od[ii * n + (((j % n) + n) % n)] -= Math.log(1 - k * pesoNaColuna[ii]![o]! * S);
            }
        }
      }
      const presencas = Array.from({ length: OITAVAS_DA_SOMBRA }, (_, o) => ((oitavas as readonly number[]).includes(o) ? 1 : 0));
      let media = 0;
      let mediaE = 0;
      for (let c = 0; c < od.length; c++) {
        const E = esperadoDaSombra(tau, presencas, g, pesoNaColuna[Math.floor(c / n)]);
        media += Math.exp(E - od[c]!) / od.length;
        mediaE += E / od.length;
      }
      // o Sol baixo bate no teto: as sombras clareiam, e e^(−E) não cai abaixo de e^(−1,5)
      if (graus === 4) expect(k).toBeLessThan(1);
      expect(mediaE).toBeGreaterThan(0.03);
      // com o nível de detalhe, uma parte do quadrado é toda estatística e outra toda explícita
      if (comPeso) expect(pesoNaColuna[0]![2]).toBe(0);
      if (comPeso) expect(pesoNaColuna[n - 1]![2]).toBe(1);
      expect(media).toBeCloseTo(1, 2);
    }
  });
});
