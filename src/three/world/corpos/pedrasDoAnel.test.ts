// Serve: lei — as pedras 3D do anel (`?pedras=3d`) só mostram o que o anel tem, em lugar que não depende da câmera, e o disco cede só o que elas carregam
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import {
  ANEL_FRAG,
  ANEL_SATURNO,
  GLSL_CAMADA_DO_ANEL,
  GLSL_CONSTANTES_DO_ANEL,
  GLSL_REGIAO_DO_ANEL,
  GLSL_SOMBRA_DO_PLANETA_NO_ANEL,
} from './gigante';
import {
  ALCANCE_DA_NEVOA_KM,
  A_MAX_KM,
  CELULA_DA_ESTEIRA_KM,
  FRACAO_NAO_RESOLVIDA,
  FRACAO_POR_OITAVA,
  K_JANELA,
  OITAVAS,
  PEDRAS_3D,
  PEDRAS_POR_TIER,
  PedrasDoAnel,
  R0_KM,
  REGIOES_DAS_PEDRAS,
  TABELA_DE_OITAVAS,
  TAU_TETO,
  VARIANTES,
  X_PLENO,
  aceitaPedra,
  assarFormas,
  alfaCedido,
  cessaoDoDisco,
  densidadeDaEsteira,
  distanciaDaProfundidade,
  estiramentoDaEsteira,
  lugarDaPedra,
  luzDaFace,
  pedacosPorArea,
  presencaDaOitava,
  regiaoDasPedras,
  sombraMutua,
  tauDaNevoa,
} from './pedrasDoAnel';
import { REGIOES_DO_ANEL } from './gigante';

const KM_POR_RAIO = BODY_AXES.saturn[0]!;

function pedrasDeTeste() {
  return new PedrasDoAnel({
    glslSombraDoPlaneta: GLSL_SOMBRA_DO_PLANETA_NO_ANEL,
    glslConstantesDoAnel: GLSL_CONSTANTES_DO_ANEL,
    glslRegiaoDoAnel: GLSL_REGIAO_DO_ANEL,
    glslCamadaDoAnel: GLSL_CAMADA_DO_ANEL,
    rInt: ANEL_SATURNO.rInt,
    rExt: ANEL_SATURNO.rExt,
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
  it('sem ?pedras=3d nada muda: o disco não carrega a cessão', () => {
    expect(PEDRAS_3D).toBe(false);
    expect(ANEL_FRAG).not.toContain('cederAsPedras');
    expect(ANEL_FRAG).toContain('gl_FragColor = vec4(direta + doGlobo, clamp(camada.y, 0.0, 1.0));');
  });

  it('cada pedaço entra com opacidade zero na borda da janela, opaco meia oitava dentro, e não sai de perto', () => {
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
    expect(cessaoDoDisco(6)).toBe(0);
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

  it('nenhum pedaço passa de 10 m de raio, e nenhum centro sai da camada', () => {
    for (const rho of [80_000, 100_000, 119_000, 128_000]) {
      const esp = regiaoDasPedras(rho).espessura;
      for (let o = 0; o < OITAVAS; o++) {
        for (let i = 0; i < 2000; i++) {
          const p = lugarDaPedra(o, i, { rhoKm: rho, theta: 1, zKm: 0 });
          expect(p.raioKm).toBeLessThanOrEqual(A_MAX_KM);
          expect(Math.abs(p.zKm)).toBeLessThanOrEqual(esp / 2);
          if (2 * p.raioKm >= esp) expect(Math.abs(p.zKm)).toBe(0);
        }
      }
    }
  });

  it('as esteiras: média 1, contraste forte no A, e 1 no C e na divisão de Cassini', () => {
    // as fronteiras das regiões são as do disco
    for (let k = 1; k < REGIOES_DAS_PEDRAS.length; k++) {
      expect(REGIOES_DO_ANEL[k]!.km).toBe(REGIOES_DAS_PEDRAS[k]!.km);
      expect(REGIOES_DO_ANEL[k]!.meia).toBe(REGIOES_DAS_PEDRAS[k]!.meia);
    }
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
    // sem fronteira de célula: contínua onde o ponto troca de 2×2 células
    for (let m = 0; m < 20; m++) {
      const rho = (Math.floor(128_000 / CELULA_DA_ESTEIRA_KM) + m + 0.5) * CELULA_DA_ESTEIRA_KM;
      const s = 4_321 + 0.137 * m;
      expect(Math.abs(densidadeDaEsteira(s, rho - 1e-7) - densidadeDaEsteira(s, rho + 1e-7))).toBeLessThan(1e-3);
    }
    for (const rho of [80_000, 85_000, 118_500, 119_500]) {
      for (const s of [0, 1234.5, 777_000]) expect(densidadeDaEsteira(s, rho)).toBe(1);
    }
  });

  it('longe do plano não desenha; rente a ele acende só as oitavas que a altura alcança', () => {
    const p = pedrasDeTeste();
    p.atualizar(quadro(128_000, 2000));
    expect(p.malha.visible).toBe(false);
    p.atualizar(quadro(128_000, 1));
    expect(p.malha.visible).toBe(true);
    // um ponto por pedaço de cada oitava ativa (as malhas de perto são escolhidas a mais)
    const n = (p.malha.children.find((m) => m instanceof THREE.Points) as THREE.Points).geometry.drawRange.count;
    expect(n % PEDRAS_POR_TIER.cinema).toBe(0);
    expect(n / PEDRAS_POR_TIER.cinema).toBe(PedrasDoAnel.oitavasAtivas(1));
    expect(PedrasDoAnel.oitavasAtivas(1)).toBeLessThan(OITAVAS);
    expect(PedrasDoAnel.oitavasAtivas(0.003)).toBe(OITAVAS);
    p.dispose();
  });

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
  });

  it('relógio parado, pedra parada; mexer a câmera não acumula cisalhamento', () => {
    const p = pedrasDeTeste();
    const u = ((p.malha.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
    p.atualizar(quadro(128_000, 1));
    const gf = Array.from(u.uGf.value as Float32Array);
    p.atualizar(quadro(128_500, 1.2));
    expect(Array.from(u.uGf.value as Float32Array)).toEqual(gf);
    // relógio andando: o cisalhamento anda, com o passo grampeado
    p.atualizar(quadro(128_500, 1.2, 2446471 + 1));
    expect(Array.from(u.uGf.value as Float32Array)).not.toEqual(gf);
    p.dispose();
  });

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

  it('a sombra mútua tira da pedra funda o que dá à de cima: média 1, entre 0,5 e 1,5', () => {
    for (const peso of [0, 0.4, 1, 3]) {
      let soma = 0;
      const n = 1000;
      for (let k = 0; k < n; k++) {
        const m = sombraMutua((k + 0.5) / n, peso);
        expect(m).toBeGreaterThanOrEqual(0.5);
        expect(m).toBeLessThanOrEqual(1.5);
        soma += m;
      }
      expect(soma / n).toBeCloseTo(1, 9);
    }
    expect(sombraMutua(0, 1)).toBeGreaterThan(sombraMutua(1, 1));
  });

  it('as formas assadas: a de longe é o corpo que o ponto acerta, e toda normal aponta para fora', () => {
    const { geo, tex } = assarFormas(3);
    const n = geo.getAttribute('position').count;
    const d = tex.image.data as Float32Array;
    const v = (linha: number, i: number) => Array.from(d.subarray((linha * n + i) * 4, (linha * n + i) * 4 + 3));
    for (let t = 0; t < 2; t++) {
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
      for (const o of TABELA_DE_OITAVAS) resolvido += FRACAO_POR_OITAVA * Math.min(caminho, o.s * 2 ** (X_PLENO + 0.25));
      const pedacos = Math.exp(-(tau / esp) * resolvido);
      expect(nevoa * pedacos).toBeCloseTo(graus === 0 ? 0 : esperada(graus), 6);
    }
    // a 0° a névoa sozinha já tapa; a 5° tapa mais da metade do que sobra; a 20° quase nada
    expect(Math.exp(-tauDaNevoa(0, 0, ALCANCE_DA_NEVOA_KM, esp, tau, 1))).toBeLessThan(1e-6);
    expect(Math.exp(-tauDaNevoa(0, Math.sin((5 * Math.PI) / 180), ALCANCE_DA_NEVOA_KM, esp, tau, 1))).toBeCloseTo(0.39, 1);
    expect(Math.exp(-tauDaNevoa(0, Math.sin((20 * Math.PI) / 180), ALCANCE_DA_NEVOA_KM, esp, tau, 1))).toBeCloseTo(0.85, 1);
  });
});
