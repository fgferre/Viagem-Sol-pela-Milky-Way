// ============================================================
// O ESQUELETO DO PALCO LOCAL (Onda 6, F0 — D1): o contrato do registro
// de corpos resolvidos, o getter que o near consome e a CONTA que torna
// a sobreposição Sol-ator × corpo impossível por construção.
//
// Não instancia Engine nem Director: tudo aqui é o contrato puro do
// módulo — o mesmo precedente de `stellarBody.test.ts`.
// ============================================================
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import { AU_PARA_PC } from '../../../lib/atlas/frameGalactico';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import {
  DEEP_LIMIAR_PC,
  DISC_VISIBLE_MIN,
  deepDiscFade,
  isDiscGroupVisible,
  solWorldFade,
} from '../lodStellar';
import {
  CORPOS_DEFAULT_ON,
  CorposResolvidos,
  diametroAparentePx,
} from './corpos';

/** raio equatorial de Júpiter em pc, DERIVADO da fonte única (BODY_AXES
 *  em km → UA pelo `AU_KM` → pc pelo `AU_PARA_PC`) — nenhum literal
 *  novo de raio ou de conversão entra neste arquivo. */
const RAIO_JUPITER_PC = (BODY_AXES.jupiter[0] / AU_KM) * AU_PARA_PC;

/** a câmera da casa: fov 58° vertical (engine.ts), tela de 1080 px. */
const FOV_DEG = 58;
const SCREEN_H = 1080;

describe('o contrato do registro (F0)', () => {
  it('nasce vazio, desligado e com o grupo invisível — o Director liga', () => {
    const c = new CorposResolvidos();
    expect(c.tamanho).toBe(0);
    expect(c.group.children).toHaveLength(0);
    expect(c.ligado).toBe(false);
    expect(c.group.visible).toBe(false);
    c.ligado = true;
    expect(c.group.visible).toBe(true);
  });

  it('sem corpo registrado o getter devolve NaN/NaN — o near fica no vigente', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0.0007));
    expect(Number.isNaN(s.dSuperficiePc)).toBe(true);
    expect(Number.isNaN(s.raioPc)).toBe(true);
  });

  it('com um corpo, d é a distância à SUPERFÍCIE (centro menos raio)', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 1e-8, new THREE.Vector3(0, 0, 1e-6));
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0));
    expect(s.dSuperficiePc).toBeCloseTo(1e-6 - 1e-8, 20);
    expect(s.raioPc).toBe(1e-8);
  });

  it('com dois corpos ganha a superfície mais próxima, com o raio DO dono', () => {
    // Terra E Lua simultâneas em quadro (emenda T-E13): o near segue a
    // mais próxima das duas, nunca só o corpo "em foco"
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 2e-10, new THREE.Vector3(0, 0, 4e-6));
    c.registrar('moon', 5e-11, new THREE.Vector3(0, 0, 1e-6));
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0));
    expect(s.dSuperficiePc).toBeCloseTo(1e-6 - 5e-11, 20);
    expect(s.raioPc).toBe(5e-11);
  });

  it('câmera DENTRO do corpo devolve d negativo — é o caso que o piso segura', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 1e-8, new THREE.Vector3(0, 0, 0));
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 1e-9));
    expect(s.dSuperficiePc).toBeLessThan(0);
    expect(s.raioPc).toBe(1e-8);
  });

  it('camada desligada tira os corpos do QUADRO: getter volta a NaN', () => {
    // é isto que faz o A/B de `?nocorpos` devolver a baseline bit a
    // bit — superfície fora do quadro não governa plano de corte
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 1e-8, new THREE.Vector3(0, 0, 1e-6));
    c.ligado = false;
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0));
    expect(Number.isNaN(s.dSuperficiePc)).toBe(true);
    expect(Number.isNaN(s.raioPc)).toBe(true);
  });

  it('mesmo id atualiza em vez de duplicar; a posição registrada é CÓPIA', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    const pos = new THREE.Vector3(0, 0, 1e-6);
    c.registrar('earth', 1e-8, pos);
    pos.z = 999; // o chamador mexe no rascunho dele — o palco não vê
    c.registrar('earth', 2e-8, new THREE.Vector3(0, 0, 2e-6));
    expect(c.tamanho).toBe(1);
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0));
    expect(s.dSuperficiePc).toBeCloseTo(2e-6 - 2e-8, 20);
    expect(s.raioPc).toBe(2e-8);
  });

  it('remover devolve o getter a NaN; dispose esvazia o registro', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 1e-8, new THREE.Vector3(0, 0, 1e-6));
    c.remover('earth');
    expect(Number.isNaN(c.superficieMaisProxima(new THREE.Vector3()).dSuperficiePc)).toBe(true);
    c.registrar('moon', 1e-8, new THREE.Vector3(0, 0, 1e-6));
    c.dispose();
    expect(c.tamanho).toBe(0);
    expect(Number.isNaN(c.superficieMaisProxima(new THREE.Vector3()).dSuperficiePc)).toBe(true);
  });

  it('raio ou posição envenenados são RECUSADOS alto — defeito de chamador', () => {
    const c = new CorposResolvidos();
    for (const ruim of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => c.registrar('x', ruim, new THREE.Vector3()), String(ruim)).toThrow();
    }
    expect(() => c.registrar('x', 1e-8, new THREE.Vector3(Number.NaN, 0, 0))).toThrow();
    expect(c.tamanho).toBe(0);
  });

  it('o getter reusa a MESMA saída — zero alocação por quadro (M4)', () => {
    const c = new CorposResolvidos();
    const a = c.superficieMaisProxima(new THREE.Vector3());
    const b = c.superficieMaisProxima(new THREE.Vector3(1, 2, 3));
    expect(a).toBe(b);
  });

  it('a chave nasce ligada, como PLANETAS_DEFAULT_ON — ?nocorpos é a volta', () => {
    expect(CORPOS_DEFAULT_ON).toBe(true);
  });
});

describe('Sol-ator × corpo resolvido: impossível POR CONSTRUÇÃO (D1)', () => {
  it('abaixo de 0,02 pc o disco artístico está dissolvido e o grupo dele some', () => {
    // primeira metade da proteção: onde um corpo resolvido PODE ter
    // pixels (a câmera perto), o disco de 2.269 UA nem é submetido
    expect(DISC_VISIBLE_MIN).toBe(0.02);
    for (const d of [0.02, 0.015, 0.005, 1e-4]) {
      expect(deepDiscFade(d), `deepDiscFade(${d})`).toBe(0);
      expect(isDiscGroupVisible(solWorldFade(d)), `grupo em ${d} pc`).toBe(false);
    }
  });

  it('a conta do desenho: Júpiter só teria ≈0,2 px com a câmera a 4,125 UA DELE', () => {
    // o número da onda ("Júpiter ≈ 0,2 px") é o corpo mais largo visto
    // de 4,125 UA — já sub-pixel a 4 UA de distância
    const px = diametroAparentePx(RAIO_JUPITER_PC, 4.125 * AU_PARA_PC, SCREEN_H, FOV_DEG);
    expect(px).toBeGreaterThan(0.2);
    expect(px).toBeLessThan(0.25);
  });

  it('na faixa 0,02–0,05 pc a câmera está MIL vezes mais longe: ≤ ~2e-4 px', () => {
    // segunda metade: com o disco visível (d ≥ 0,02 pc do Sol) a câmera
    // está a ≥ 0,02 pc = 4.125 UA da origem, e todo corpo do retrato
    // orbita a ≤ 40 UA (Plutão, o mais distante, a 35,4 — planetas.ts).
    // O corpo mais largo fica então a ≥ 4.085 UA da câmera:
    const bordaUA = DISC_VISIBLE_MIN / AU_PARA_PC; // 0,02 pc = 4.125,3 UA
    expect(bordaUA).toBeCloseTo(4125.3, 1);
    const dMinUA = bordaUA - 40;
    const px = diametroAparentePx(RAIO_JUPITER_PC, dMinUA * AU_PARA_PC, SCREEN_H, FOV_DEG);
    expect(px).toBeLessThan(1e-3); // três ordens abaixo de um pixel
    // e na borda de fora do crossfade (0,05 pc) é menor ainda
    const px005 = diametroAparentePx(
      RAIO_JUPITER_PC,
      DEEP_LIMIAR_PC - 40 * AU_PARA_PC,
      SCREEN_H,
      FOV_DEG
    );
    expect(px005).toBeLessThan(px);
  });
});

describe('texto-fonte do palco (o relógio é do Director — D2)', () => {
  const FONTE = readFileSync(new URL('./corpos.ts', import.meta.url), 'utf8');

  it('não há relógio nenhum aqui: sem Date, sem performance.now', () => {
    expect(FONTE.includes('Date')).toBe(false);
    expect(FONTE.includes('performance.now')).toBe(false);
  });

  it('nenhum caminho galactocêntrico: o palco mede do Sol na origem', () => {
    // a mesma proibição da camada de planetas (D1 da Onda 4): a volta
    // por 8.150 pc erra a origem em 0,1134 UA medidos
    expect(FONTE.includes('frameGalactico')).toBe(false);
    expect(FONTE.includes('galaxy')).toBe(false);
  });
});
