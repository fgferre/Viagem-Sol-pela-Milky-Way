// Serve: lei — o relevo medido do anel (`?relevo=1`): o campo dos picos é o mesmo na CPU e no GLSL, gira com o relógio na taxa medida, e sem o parâmetro o disco é byte a byte o de antes
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  ALTURA_MAX_DOS_PICOS_KM,
  BORDA_DO_B_NO_PERFIL_KM,
  GLSL_ALTURA_DOS_PICOS,
  JD_DA_EPOCA_DOS_PICOS,
  LON_DOS_PICOS_GRAUS,
  MEIA_FITA_ARCO_KM,
  MEIA_FITA_RADIAL_KM,
  N_PICOS,
  RELEVO_DO_ANEL,
  R_DA_FAIXA_KM,
  TABELA_DOS_PICOS,
  TAXA_DOS_PICOS_GRAUS_POR_DIA,
  alturaDosPicosCpu,
  longitudeDosPicos,
} from './relevoDoAnel';

/**
 * O ESPELHO: o texto GLSL de `alturaDosPicos` executado como JS. Só a
 * sintaxe muda (tipos viram `let`, a assinatura vira `function`); a conta
 * é a do shader, letra por letra.
 */
function alturaDoGlsl(): (rho: number, s: number) => number {
  const js = GLSL_ALTURA_DOS_PICOS.replace(
    /float alturaDosPicos\(float rho, float s\)/,
    'function alturaDosPicos(rho, s)'
  ).replace(/\b(?:float|int|vec4)\s+(\w+)\s*=/g, 'let $1 =');
  const uPicos = Array.from({ length: N_PICOS }, (_, i) => ({
    x: TABELA_DOS_PICOS[i * 4]!,
    y: TABELA_DOS_PICOS[i * 4 + 1]!,
    z: TABELA_DOS_PICOS[i * 4 + 2]!,
    w: TABELA_DOS_PICOS[i * 4 + 3]!,
  }));
  return new Function(
    'uPicos',
    'const {abs, max, sqrt, floor} = Math; const float = (x) => x; const int = (x) => Math.trunc(x);' +
      js +
      'return alturaDosPicos;'
  )(uPicos) as (rho: number, s: number) => number;
}

const sha = (x: string) => createHash('sha256').update(x).digest('hex');

describe('relevo medido do anel', () => {
  it('o campo do GLSL é o da CPU, com o teto medido e sem relevo fora da fita', () => {
    const glsl = alturaDoGlsl();
    let maior = 0;
    for (let i = 0; i <= 400; i++) {
      const s = -MEIA_FITA_ARCO_KM - 50 + ((2 * MEIA_FITA_ARCO_KM + 100) * i) / 400;
      for (let j = 0; j <= 20; j++) {
        const rho = -MEIA_FITA_RADIAL_KM - 2 + ((2 * MEIA_FITA_RADIAL_KM + 4) * j) / 20;
        const h = alturaDosPicosCpu(rho, s);
        expect(glsl(rho, s)).toBe(h);
        if (Math.abs(rho) >= MEIA_FITA_RADIAL_KM || Math.abs(s) >= MEIA_FITA_ARCO_KM) expect(h).toBe(0);
        maior = Math.max(maior, h);
      }
    }
    // o topo de cada pico: o mais alto é o teto medido, e nenhum passa dele
    let topo = 0;
    for (let i = 0; i < N_PICOS; i++) {
      const h = alturaDosPicosCpu(TABELA_DOS_PICOS[i * 4 + 1]!, TABELA_DOS_PICOS[i * 4]!);
      expect(glsl(TABELA_DOS_PICOS[i * 4 + 1]!, TABELA_DOS_PICOS[i * 4]!)).toBe(h);
      topo = Math.max(topo, h);
    }
    expect(topo).toBeCloseTo(ALTURA_MAX_DOS_PICOS_KM, 5);
    expect(maior).toBeLessThanOrEqual(topo);
    // a fita mora dentro do B: a borda dela não passa da borda que o perfil desenha
    expect(R_DA_FAIXA_KM + MEIA_FITA_RADIAL_KM).toBeLessThan(BORDA_DO_B_NO_PERFIL_KM);
  });

  it('a faixa gira com o relógio na taxa orbital medida, a partir da época declarada', () => {
    const graus = (jd: number) => (longitudeDosPicos(jd) * 180) / Math.PI;
    expect(graus(JD_DA_EPOCA_DOS_PICOS)).toBeCloseTo(LON_DOS_PICOS_GRAUS, 9);
    const umaHora = (graus(JD_DA_EPOCA_DOS_PICOS + 1 / 24) - graus(JD_DA_EPOCA_DOS_PICOS) + 360) % 360;
    expect(umaHora).toBeCloseTo(TAXA_DOS_PICOS_GRAUS_POR_DIA / 24, 6);
    // dezessete anos depois, em dupla: a mesma conta, reduzida a uma volta
    const jd = JD_DA_EPOCA_DOS_PICOS + 6300.25;
    const esperado = ((((LON_DOS_PICOS_GRAUS + TAXA_DOS_PICOS_GRAUS_POR_DIA * 6300.25 + 180) % 360) + 360) % 360) - 180;
    expect(graus(jd)).toBeCloseTo(esperado, 6);
  });

  it('a fita escreve a longitude do relógio e só entra no desenho perto da faixa', async () => {
    const { FitaDosPicos, uniformesDoRelevo } = await import('./relevoDoAnel');
    const fita = new FitaDosPicos(new THREE.ShaderMaterial({ uniforms: uniformesDoRelevo() }));
    const jd = 2461040.5;
    const lon = longitudeDosPicos(jd);
    const sol = new THREE.Vector3(0.9, 0.1, -0.05).normalize();
    const rC = R_DA_FAIXA_KM / 60268;
    const perto = new THREE.Vector3(rC * Math.cos(lon), rC * Math.sin(lon), 1000 / 60268);
    fita.atualizar(jd, sol, perto);
    const u = (fita.malha.material as THREE.ShaderMaterial).uniforms.uRelevo!.value as THREE.Vector4;
    expect(u.x).toBeCloseTo(Math.cos(lon), 12);
    expect(u.y).toBeCloseTo(Math.sin(lon), 12);
    expect(u.z).toBe(1);
    expect(fita.malha.visible).toBe(true);
    // do outro lado do planeta, longe: fora do desenho, e o disco não cede
    fita.atualizar(jd, sol, new THREE.Vector3(-rC * Math.cos(lon) * 3, -rC * Math.sin(lon) * 3, 0.5));
    expect(u.z).toBe(0);
    expect(fita.malha.visible).toBe(false);
    fita.dispose();
  });

  it('sem ?relevo=1 os shaders do disco são byte a byte os de antes', async () => {
    expect(RELEVO_DO_ANEL).toBe(false);
    vi.stubGlobal('window', { location: { search: '' } });
    vi.resetModules();
    try {
      const g = await import('./gigante');
      const p = await import('./pedrasDoAnel');
      // os hashes do g1 (pedras 3D e brilho medido ligados, o padrão; o disco ganhou a profundidade pelo raio)
      expect(sha(g.ANEL_FRAG)).toBe('01a698ce8e044479abf43bf679956b02282362c4e272d4482acbbbbf89c86e46');
      expect(sha(g.ANEL_VERT)).toBe('cde5b1ab1c7cf36cef0d9ecc297ff34f04303b73fca562a65d991dc6214c7632');
      expect(sha(p.ANEL_VERT_DAS_PEDRAS)).toBe('f41a879febb63f5623811d97dbf33803706475ba94141aec709634c3ec21a7f8');
      expect(g.ANEL_FRAG_DA_FITA).toBe('');
      vi.stubGlobal('window', { location: { search: '?relevo=1' } });
      vi.resetModules();
      const comRelevo = await import('./gigante');
      expect(comRelevo.ANEL_FRAG).toContain('if (naFitaPeloRelativo(vRelDasPedras)) discard;');
      expect(comRelevo.ANEL_FRAG).toContain('* sombraDosPicos(vPos.xy, 0.0)');
      expect(comRelevo.ANEL_FRAG_DA_FITA).toContain('normSeguro(vNormalDaFita)');
      expect(comRelevo.ANEL_FRAG_DA_FITA).toContain('if (!naFitaPeloRelativo(vRelDasPedras)) discard;');
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
