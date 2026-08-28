// Serve: dono — o roteiro deve dirigir a câmera, não só passar no parser (item 75).
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { lerPlanoDeCamera } from './lerPlanoDeCamera';
import {
  bezier, easeOut, glide, launch, line, linear, lookEvento, lookPan,
  orbit, panLook, panThenHold, settle, settleFreeze, smooth, still,
} from './movimentos';
import cinturao from './roteiros/cinturao.json';

const passoAoLado = cinturao.planos[1].camera;

const a = new THREE.Vector3(2, 5, -3);
const b = new THREE.Vector3(-1, 6, 2);
const c = new THREE.Vector3(9, -2, 5);
const d = new THREE.Vector3(-7, 3, 11);
const base = {
  duracao: 12,
  movimento: { tipo: 'reta', de: a.toArray(), para: b.toArray() },
  mira: { tipo: 'fixo', ponto: c.toArray() },
  lente: [24, 72],
};
const fases = [0, 0.2, 0.6, 0.9, 1];

describe('lerPlanoDeCamera — item 75', () => {
  it('liga cada trajetória à primitiva existente e respeita o vetor de saída', () => {
    const trajetorias = [
      [{ tipo: 'fixo', ponto: a.toArray() }, still(a)],
      [base.movimento, line(a, b)],
      [{ tipo: 'curva', de: a.toArray(), controle1: c.toArray(), controle2: d.toArray(), para: b.toArray() }, bezier(a, c, d, b)],
      [{ tipo: 'orbita', centro: a.toArray(), raio: [2, 5], angulo: [-0.3, 1.7], altura: [-1, 4] }, orbit(a, 2, 5, -0.3, 1.7, -1, 4)],
    ] as const;
    for (const [movimento, esperado] of trajetorias) {
      const plano = lerPlanoDeCamera({ ...base, movimento });
      for (const k of fases) {
        const out = new THREE.Vector3();
        expect(plano.pos(k, out)).toBe(out);
        expect(out.toArray()).toEqual(esperado(k, new THREE.Vector3()).toArray());
      }
    }
  });

  it('liga cada mira ao movimento do próprio plano, inclusive na passagem', () => {
    const pos = line(a, b);
    const miras = [
      [base.mira, still(c)],
      [{ tipo: 'pan', de: c.toArray(), para: d.toArray() }, panLook(c, d)],
      [{ tipo: 'pan', de: c.toArray(), para: d.toArray(), ritmo: 'linear' }, panLook(c, d, linear)],
      [{ tipo: 'pan-cedo', de: c.toArray(), para: d.toArray(), ate: 0.4 }, panThenHold(c, d, 0.4)],
      [{ tipo: 'pan-direcao', de: c.toArray(), para: d.toArray(), ate: 0.4 }, lookPan(pos, c, d, 0.4)],
      [{ tipo: 'passagem', de: c.toArray(), assunto: d.toArray(), rumo: a.toArray(), entrada: 0.3, saida: 0.7 }, lookEvento(pos, c, d, a, 0.3, 0.7)],
    ] as const;
    for (const [mira, esperado] of miras) {
      const plano = lerPlanoDeCamera({ ...base, mira });
      for (const k of fases) {
        expect(plano.look(k, new THREE.Vector3()).toArray())
          .toEqual(esperado(k, new THREE.Vector3()).toArray());
      }
    }
  });

  it('lê duração, lente e ritmos independentes sem inventar outro padrão', () => {
    const padrao = lerPlanoDeCamera(base);
    expect([padrao.dur, padrao.fov0, padrao.fov1]).toEqual([12, 24, 72]);
    expect(padrao.ease).toBeUndefined();
    expect(padrao.fovEase).toBeUndefined();
    for (const [nome, funcao] of Object.entries({ linear, smooth, easeOut, glide, launch, settle, settleFreeze })) {
      const plano = lerPlanoDeCamera({ ...base, ritmo: nome, ritmoDaLente: 'linear' });
      for (const k of fases) {
        expect(plano.ease?.(k)).toBe(funcao(k));
        expect(plano.fovEase?.(k)).toBe(k);
      }
      const soLente = lerPlanoDeCamera({ ...base, ritmoDaLente: nome });
      expect(soLente.fovEase?.(0.2)).toBe(funcao(0.2));
    }
  });

  it('lê o JSON de exemplo, resolve nomes e copia os dados sem os modificar', () => {
    const dado = JSON.parse(JSON.stringify(passoAoLado));
    const cru = JSON.stringify(dado);
    const pontos = { mirante: a.clone(), desvio: b.clone(), Alnilam: c.clone() };
    const plano = lerPlanoDeCamera(dado, pontos);
    expect(JSON.stringify(dado)).toBe(cru);
    expect(pontos.mirante.toArray()).toEqual(a.toArray());
    pontos.mirante.set(99, 99, 99);
    pontos.Alnilam.set(99, 99, 99);
    expect(plano.pos(0, new THREE.Vector3()).toArray()).toEqual(a.toArray());
    expect(plano.look(0.8, new THREE.Vector3()).toArray()).toEqual(c.toArray());
    const literal = structuredClone(base);
    const outro = lerPlanoDeCamera(literal);
    literal.movimento.de.fill(99);
    expect(outro.pos(0, new THREE.Vector3()).toArray()).toEqual(a.toArray());
  });

  it('recusa dados inválidos antes de entregá-los à câmera, com o campo no erro', () => {
    const casos: [unknown, RegExp][] = [
      [null, /plano/],
      [{ ...base, duracao: 0 }, /duracao/],
      [{ ...base, duracao: Infinity }, /duracao/],
      [{ ...base, lente: [0, 72] }, /lente/],
      [{ ...base, lente: [24, 180] }, /lente/],
      [{ ...base, lente: [24] }, /lente/],
      [{ ...base, lente: [24, '72'] }, /lente/],
      [{ ...base, ritmo: 'constructor' }, /ritmo/],
      [{ ...base, ritmoDaLente: 'inexistente' }, /ritmoDaLente/],
      [{ ...base, movimento: { tipo: 'voar' } }, /movimento.tipo/],
      [{ ...base, movimento: { tipo: 'fixo', ponto: 'constructor' } }, /movimento.ponto/],
      [{ ...base, movimento: { tipo: 'fixo', ponto: [1, NaN, 3] } }, /movimento.ponto/],
      [{ ...base, movimento: { tipo: 'fixo', ponto: [1, 2] } }, /movimento.ponto/],
      [{ ...base, movimento: { tipo: 'fixo', ponto: new Array(3) } }, /movimento.ponto/],
      [{ ...base, movimento: { tipo: 'orbita', centro: [0, 0, 0], raio: [-1, 2], angulo: [0, 1], altura: [0, 1] } }, /movimento.raio/],
      [{ ...base, mira: { tipo: 'espiar' } }, /mira.tipo/],
      [{ ...base, mira: { tipo: 'pan-cedo', de: [1, 2, 3], para: [4, 5, 6], ate: 0 } }, /mira.ate/],
      [{ ...base, mira: { tipo: 'pan-direcao', de: [1, 2, 3], para: [4, 5, 6], ate: 1.1 } }, /mira.ate/],
      [{ ...base, mira: { tipo: 'passagem', de: a.toArray(), assunto: b.toArray(), rumo: c.toArray(), entrada: 0.8, saida: 0.3 } }, /mira.saida/],
    ];
    for (const [dado, erro] of casos) expect(() => lerPlanoDeCamera(dado)).toThrow(erro);
  });

  it('mudar o JSON muda posição, mira, lente e duração no filme em execução', async () => {
    vi.resetModules();
    vi.doMock('./roteiros/cinturao.json', () => ({
      default: {
        planos: cinturao.planos.map((plano, i) => i !== 1 ? plano : {
          ...plano,
          camera: {
            ...plano.camera,
            duracao: 9,
            movimento: { tipo: 'fixo', ponto: [13, 17, 19] },
            mira: { tipo: 'fixo', ponto: [29, 31, 37] },
            lente: [23, 23],
          },
        }),
      },
    }));
    try {
      const { Journey, auditarRoteiro } = await import('./journey');
      const { JourneyRig } = await import('./cameraRig');
      const audit = auditarRoteiro();
      const legenda = audit.captions.find((c) => c.text === 'UM PASSO AO LADO')!;
      const plano = audit.shots[legenda.shotIndex];
      expect(plano.dur).toBe(9);
      const t = plano.t0 + plano.dur / 2;
      const pose = new Journey().at(t);
      expect(pose.pos.toArray()).toEqual([13, 17, 19]);
      expect(pose.look.toArray()).toEqual([29, 31, 37]);
      const camera = new THREE.PerspectiveCamera();
      new JourneyRig().apply(camera, t, 1 / 60);
      expect(camera.position.toArray()).toEqual([13, 17, 19]);
      expect(camera.fov).toBe(23);
      const direcao = new THREE.Vector3(16, 14, 18).normalize();
      expect(camera.getWorldDirection(new THREE.Vector3()).distanceTo(direcao)).toBeLessThan(1e-14);
    } finally {
      vi.doUnmock('./roteiros/cinturao.json');
      vi.resetModules();
    }
  });
});
