import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { brilhoRelativo, cometaPorId } from '../../lib/cometas';
import {
  CaudasDosCometas,
  PARTICULAS_POR_TIER,
  PASSOS_DA_COMA,
  correcaoPelaAtividade,
  exposicaoDePerto,
  exposicaoDosIons,
  regimeDePerto,
} from './caudasDosCometas';

describe('as caudas dos cometas — de perto', () => {
  it('de longe nada muda: exposição 1 e sem coma de perto (as vistas aprovadas)', () => {
    for (const d of [2.5e6, 3e6, 1e8, 1e10]) expect(exposicaoDePerto(d)).toBe(1);
    for (const d of [3e5, 3e6, 1e9]) expect(regimeDePerto(d).perto).toBe(0);
  });

  it('a exposição desce sem saltos e, dentro de 10⁵ km, ∝ distância', () => {
    let antes = 0;
    for (let d = 10; d < 2.45e6; d *= 1.01) {
      const e = exposicaoDePerto(d);
      expect(e).toBeGreaterThan(antes);
      expect(e / exposicaoDePerto(d * 1.0001)).toBeGreaterThan(0.999);
      antes = e;
    }
    expect(exposicaoDePerto(2000) / exposicaoDePerto(300)).toBeCloseTo(2000 / 300, 6);
  });

  it('a coma de perto acende abaixo de 3·10⁵ km e o raio dela é 3× a câmera, até 10⁵ km', () => {
    expect(regimeDePerto(1e5)).toEqual({ perto: 1, raioKm: 1e5 });
    expect(regimeDePerto(2000)).toEqual({ perto: 1, raioKm: 6000 });
    const meio = regimeDePerto(2.25e5).perto;
    expect(meio).toBeGreaterThan(0.4);
    expect(meio).toBeLessThan(0.6);
  });

  it('cada cometa é exposto pela própria atividade de perto, e de longe nada muda', () => {
    const hb = brilhoRelativo(cometaPorId('hale-bopp')!, 0.921);
    const halley = brilhoRelativo(cometaPorId('halley')!, 0.5871);
    for (const d of [2.5e6, 3e6, 1e9]) expect(correcaoPelaAtividade(d, hb)).toBe(1);
    expect(correcaoPelaAtividade(2000, halley)).toBeCloseTo(1, 9);
    expect(correcaoPelaAtividade(2000, hb)).toBeCloseTo(halley / hb, 9);
    expect(correcaoPelaAtividade(1e5, hb)).toBeCloseTo(halley / hb, 9);
    const meio = correcaoPelaAtividade(1e6, hb);
    expect(meio).toBeCloseTo(Math.sqrt(halley / hb), 6);
    for (let d = 1e5; d < 2.45e6; d *= 1.01) {
      expect(correcaoPelaAtividade(d * 1.0001, hb) / correcaoPelaAtividade(d, hb)).toBeGreaterThan(0.999);
    }
  });

  it('a exposição dos íons não salta e, dentro de 3·10⁴ km, cai ∝ D^1,5', () => {
    expect(exposicaoDosIons(3e6)).toBe(1);
    expect(exposicaoDosIons(3e4)).toBeCloseTo(exposicaoDePerto(3e5), 12);
    expect(exposicaoDosIons(1e4) / exposicaoDosIons(2500)).toBeCloseTo(8, 6);
  });

  it('o cometa apagado em foco não apaga as partículas dos acesos (a geometria é uma só)', () => {
    const caudas = new CaudasDosCometas();
    const camera = new THREE.PerspectiveCamera();
    const vivos = (caudas as unknown as { vivos: Map<string, { grupo: THREE.Group; pontos: THREE.Points }> }).vivos;
    let apagadosEmFoco = 0;
    // fev/1986: Halley aceso; os outros, depois dele na lista, focados um a um
    for (const foco of ['encke', 'churyumov-gerasimenko', 'swift-tuttle', 'hale-bopp', 'neowise', 'pons-brooks', '3i-atlas']) {
      caudas.update({ jd: 2_446_470.5, camera, alturaPx: 800, tier: 'cinema', ligado: true, noAtlas: true, foco });
      expect(vivos.get('halley')?.pontos.visible).toBe(true);
      const f = vivos.get(foco);
      if (f?.grupo.visible && !f.pontos.visible) apagadosEmFoco++;
      expect(vivos.get('halley')?.pontos.geometry.drawRange.count).toBe(PARTICULAS_POR_TIER.cinema);
    }
    expect(apagadosEmFoco).toBeGreaterThan(0);
    caudas.dispose();
  });

  it('o passo da coma de perto segue o tier e o telefone não pesa mais que os 16 de antes', () => {
    expect(PASSOS_DA_COMA.performance).toBeLessThanOrEqual(8);
    expect(PASSOS_DA_COMA.alta).toBeLessThanOrEqual(PASSOS_DA_COMA.cinema);
  });
});
