// Serve: lei — as pedras 3D do anel (`?pedras=3d`) entram sem estalo e o disco cede só o que elas carregam
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
import { GLSL_RUIDO_DE_VALOR } from './corpos';
import {
  K_JANELA,
  OITAVAS,
  PEDRAS_3D,
  PRIMEIRA_OITAVA_REAL,
  PEDRAS_POR_TIER,
  PedrasDoAnel,
  TABELA_DE_OITAVAS,
  aceitaPedra,
  alfaCedido,
  cessaoDoDisco,
  forcaDoGrao,
  H_GRAO_KM,
  luzDaFace,
  parcelaDasPedras,
  presencaDaOitava,
  sombraMutua,
} from './pedrasDoAnel';

const KM_POR_RAIO = BODY_AXES.saturn[0]!;

function pedrasDeTeste() {
  return new PedrasDoAnel({
    glslSombraDoPlaneta: GLSL_SOMBRA_DO_PLANETA_NO_ANEL,
    glslConstantesDoAnel: GLSL_CONSTANTES_DO_ANEL,
    glslRegiaoDoAnel: GLSL_REGIAO_DO_ANEL,
    glslCamadaDoAnel: GLSL_CAMADA_DO_ANEL,
    glslRuido: GLSL_RUIDO_DE_VALOR,
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

  it('cada oitava entra com peso zero na borda da janela; o aglomerado se desfaz perto, a pedra real não', () => {
    for (let o = 0; o < OITAVAS; o++) {
      const { s: tam, janela } = TABELA_DE_OITAVAS[o]!;
      expect(janela).toBe(K_JANELA * tam);
      expect(presencaDaOitava(o, janela)).toBe(0);
      expect(presencaDaOitava(o, janela * 1.5)).toBe(0);
      expect(presencaDaOitava(o, janela * 0.99)).toBeLessThan(0.02);
      expect(presencaDaOitava(o, 32 * tam)).toBe(1);
      expect(presencaDaOitava(o, 4 * tam)).toBe(o >= PRIMEIRA_OITAVA_REAL ? 1 : 0);
    }
  });

  it('densidade zero onde o perfil é zero (divisão vazia, fora do anel)', () => {
    for (const sorteio of [0, 1e-9, 0.3, 0.999]) {
      expect(aceitaPedra(0, 120_000, sorteio)).toBe(false);
    }
    expect(aceitaPedra(0.5, 120_000, 0)).toBe(true);
  });

  it('a cessão do disco é contínua, entre 0 e 1, inteira onde as três oitavas estão, e zero longe', () => {
    let antes = cessaoDoDisco(1e-4);
    expect(antes).toBe(1);
    // passos de 0,2 %: a mesma resolução em toda oitava
    for (let d = 1e-4; d <= 1000; d *= 1.002) {
      const f = cessaoDoDisco(d);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
      expect(Math.abs(f - antes)).toBeLessThan(0.002);
      // sem ondular: do primeiro metro até onde a oitava de cima se completa
      if (d < 16 * TABELA_DE_OITAVAS[0]!.s) expect(f).toBeCloseTo(1, 9);
      antes = f;
    }
    expect(cessaoDoDisco(TABELA_DE_OITAVAS[0]!.janela)).toBe(0);
    for (const a of [0, 0.2, 0.7, 1]) expect(alfaCedido(a, 0)).toBe(a);
    expect(alfaCedido(0.6, 1)).toBe(0);
  });

  it('longe do plano não desenha; rente a ele acende só as oitavas que a altura alcança', () => {
    const p = pedrasDeTeste();
    p.atualizar(quadro(128_000, 2000));
    expect(p.malha.visible).toBe(false);
    p.atualizar(quadro(128_000, 20));
    expect(p.malha.visible).toBe(true);
    // um ponto por pedra de cada oitava ativa (as malhas de perto são escolhidas a mais)
    let n = 0;
    p.malha.traverse((m) => {
      if (m instanceof THREE.Points) n += m.geometry.drawRange.count;
    });
    expect(n % PEDRAS_POR_TIER.cinema).toBe(0);
    expect(n / PEDRAS_POR_TIER.cinema).toBe(PedrasDoAnel.oitavasAtivas(20));
    expect(PedrasDoAnel.oitavasAtivas(20)).toBeLessThan(OITAVAS);
    expect(PedrasDoAnel.oitavasAtivas(0.003)).toBe(OITAVAS);
    p.dispose();
  });

  it('o grão do disco entra contínuo abaixo de 1.600 km, antes das pedras', () => {
    expect(forcaDoGrao(H_GRAO_KM)).toBe(0);
    expect(forcaDoGrao(H_GRAO_KM / 2)).toBe(1);
    for (let h = 3000; h > 1; h /= 1.002) {
      expect(Math.abs(forcaDoGrao(h) - forcaDoGrao(h * 1.002))).toBeLessThan(0.005);
    }
    const p = pedrasDeTeste();
    p.atualizar(quadro(128_000, 1000));
    expect(p.malha.visible).toBe(true);
    expect(p.cessao.w).toBe(0);
    let pedras = 0;
    p.malha.traverse((m) => {
      if (m.visible && m !== p.malha && m.renderOrder < 0) pedras++;
    });
    expect(pedras).toBe(0);
    p.dispose();
  });

  it('relógio parado, pedra parada; mexer a câmera não acumula cisalhamento', () => {
    const p = pedrasDeTeste();
    const u = ((p.malha.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
    p.atualizar(quadro(128_000, 20));
    const gf = Array.from(u.uGf.value as Float32Array);
    p.atualizar(quadro(128_500, 25));
    expect(Array.from(u.uGf.value as Float32Array)).toEqual(gf);
    // relógio andando: o cisalhamento anda, com o passo grampeado
    p.atualizar(quadro(128_500, 25, 2446471 + 1));
    expect(Array.from(u.uGf.value as Float32Array)).not.toEqual(gf);
    p.dispose();
  });

  it('a parcela que as pedras assumem é contínua e monotônica com a altura', () => {
    let antes = parcelaDasPedras(5000);
    expect(antes).toBeGreaterThan(0);
    for (let h = 5000; h >= 1e-4; h /= 1.002) {
      const p = parcelaDasPedras(h);
      expect(p).toBeGreaterThanOrEqual(antes);
      expect(p - antes).toBeLessThan(0.002);
      expect(p).toBeLessThanOrEqual(1);
      antes = p;
    }
    expect(parcelaDasPedras(1e-4)).toBe(1);
    expect(parcelaDasPedras(-20)).toBe(parcelaDasPedras(20));
  });

  it('o lado da noite nunca é zero, nem na sombra do globo', () => {
    for (const cosSol of [-1, -0.5, 0]) {
      for (const cosGlobo of [-1, 0, 1]) {
        for (const sombra of [0, 1]) {
          expect(luzDaFace(cosSol, cosGlobo, sombra, 0)).toBeGreaterThan(0);
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
});
