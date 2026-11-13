// Serve: dono — as heroes resgatadas do filme de 30/07 mantêm o tamanho, a cor e a lente que ele escolheu
// As heroes RESGATADAS (item 44, 16/08): a arte do filme de 30/07, de
// volta byte a byte. Os oráculos cobram a identidade da peça exumada —
// a escolha por magnitude, o tamanho de autor e a lente de referência —
// para a próxima reforma não a descaracterizar em silêncio de novo.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../config';
import { bvToColor } from '../shaders/common';
import { BV_MEDIDO } from './clarao';
import { OCUPACAO_MAXIMA_DA_TELA } from './clarao';
import {
  CHEGADA_COMECA_EM_TAMANHOS,
  FAIXA_DA_CHEGADA,
  HeroStars,
  TAN_DA_LENTE_PADRAO,
  chegadaDaHero,
} from './heroStars';

function estrela(n: string, m: number, x = 1, y = 0, z = 0): NamedStar {
  return { n, m, d: 10, x, y, z, ci: 0.5 } as NamedStar;
}

describe('as heroes resgatadas — a arte do filme', () => {
  const named = [
    estrela('Sirius', -1.46, 2.6),
    estrela('Fraca', 5.2, 50),
    estrela('Vega', 0.03, 7.7),
    estrela('Media', 2.9, 20),
  ];

  it('escolhe as mais brilhantes por magnitude, Sirius primeiro', () => {
    const h = new HeroStars(named);
    expect(h.chosen[0].n).toBe('Sirius');
    expect(h.chosen.map((s) => s.n)).toContain('Vega');
    h.dispose();
  });

  it('o tamanho é o de AUTOR de 30/07: 0,08·10^(−0,3·m) pc — e Sirius é a maior', () => {
    const h = new HeroStars(named);
    expect(h.sizePc[0]).toBeCloseTo(0.08 * Math.pow(10, -0.3 * -1.46), 12);
    for (let i = 1; i < h.sizePc.length; i++) {
      expect(h.sizePc[0]).toBeGreaterThanOrEqual(h.sizePc[i]);
    }
    h.dispose();
  });

  it('a lente de referência é tan(29°), a mesma conta da era do filme', () => {
    expect(TAN_DA_LENTE_PADRAO).toBeCloseTo(Math.tan((29 * Math.PI) / 180), 15);
  });

  it('update publica a distância câmera↔estrela que foi ao uniform', () => {
    const h = new HeroStars(named);
    h.update(1, new THREE.Vector3(0, 0, 0), TAN_DA_LENTE_PADRAO);
    expect(h.camDistPc[0]).toBeCloseTo(2.6, 6);
    h.dispose();
  });

  it('a cor vem da tabela PARTILHADA, não do `ci` do sidecar', () => {
    // O endereço único do B−V (21/08): a tabela morava redigitada aqui
    // como `HERO_BV`. Betelgeuse é o caso que separa as duas fontes —
    // o sidecar traz 1,50 e o medido é 1,85 —, então se o import
    // virasse decorativo e o `ci` voltasse a mandar, cai aqui.
    const h = new HeroStars([estrela('Betelgeuse', 0.42)]);
    const mat = (h.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    const cor = mat.uniforms.uColor.value as THREE.Color;
    const [r, g, b] = bvToColor(BV_MEDIDO.Betelgeuse);
    expect([cor.r, cor.g, cor.b]).toEqual([r, g, b]);
    // e o `ci` do fixture (0,5) daria OUTRA cor — o teste não é vazio
    expect(cor.r).not.toBeCloseTo(bvToColor(0.5)[0], 6);
    h.dispose();
  });

  it('billboards aditivos, sem escrita de profundidade — como no filme', () => {
    const h = new HeroStars(named);
    h.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.ShaderMaterial;
        expect(m.blending).toBe(THREE.AdditiveBlending);
        expect(m.depthWrite).toBe(false);
      }
    });
    h.dispose();
  });

  it('a chegada: a arte intacta além de 3 S, e de lá desce sem subir até o teto do clarão', () => {
    const S = 0.2;
    const c = { s: 0, escala: 1, fracaoDaAltura: 0 };
    const d0 = CHEGADA_COMECA_EM_TAMANHOS * S;
    expect(chegadaDaHero(d0 * 1.01, S, TAN_DA_LENTE_PADRAO, c).escala).toBe(1);
    let antes = chegadaDaHero(d0, S, TAN_DA_LENTE_PADRAO, c).fracaoDaAltura;
    for (let d = d0 / 1.2; d > d0 / FAIXA_DA_CHEGADA / 4; d /= 1.2) {
      const f = chegadaDaHero(d, S, TAN_DA_LENTE_PADRAO, c).fracaoDaAltura;
      expect(f).toBeLessThanOrEqual(antes + 1e-12);
      expect(f / antes).toBeGreaterThan(1 / 1.08); // um passo de 20 % nunca encolhe mais que 8 %
      antes = f;
    }
    expect(c.s).toBe(1);
    expect(antes).toBeCloseTo(OCUPACAO_MAXIMA_DA_TELA, 12);
  });
});
