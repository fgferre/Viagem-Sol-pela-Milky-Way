// Serve: chão — o motor toca mais de um filme: sem id e com id desconhecido toca o galáctico de sempre, e um corte novo se mede pelos próprios planos
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Shot } from './lerSequencia';

// mesmo stub e mesma razão dos vizinhos (cameraRig.test.ts): journey.ts
// puxa world/galaxy.ts, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { FILME_PADRAO, filmeDe } = await import('./filme');
const { APOIOS_DO_FILME, Journey, LUA_PC, REVEAL_T, TERRA_PC, auditarRoteiro } =
  await import('./journey');
const { line, linear, still } = await import('./movimentos');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('o filme como objeto (E1 da viagem solar)', () => {
  it('sem id é o galáctico, com a duração e as peças de sempre', () => {
    const filme = filmeDe();
    expect(filme.id).toBe(FILME_PADRAO);
    expect(filme.journey.duration).toBe(auditarRoteiro().duration);
    expect(filme.apoios).toBe(APOIOS_DO_FILME);
    expect(filme.revealT).toBe(REVEAL_T);
    expect([...filme.pinos]).toEqual([
      ['earth', TERRA_PC],
      ['moon', LUA_PC],
    ]);
  });

  it('um id desconhecido avisa no console e toca o galáctico', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(filmeDe('nao-existe')).toBe(filmeDe());
    expect(aviso).toHaveBeenCalledOnce();
  });

  it('um Journey de dois planos curtos se mede pelos próprios planos', () => {
    const A = new THREE.Vector3(0, 0, 0);
    const B = new THREE.Vector3(1, 0, 0);
    const C = new THREE.Vector3(1, 2, 0);
    const mira = still(new THREE.Vector3(0, 0, -1));
    const planos: Shot[] = [
      { dur: 2, pos: line(A, B), look: mira, fov0: 40, fov1: 50, ease: linear },
      { dur: 3, pos: line(B, C), look: mira, fov0: 50, fov1: 30, ease: linear },
    ];
    const j = new Journey(planos, [0, 2]);
    expect(j.duration).toBe(5);
    expect(j.inicioDoPlano(1)).toBe(2);
    const comeco = j.at(0);
    expect(comeco.plano).toBe(0);
    expect(comeco.pos.toArray()).toEqual([0, 0, 0]);
    expect(comeco.fov).toBe(40);
    // a junta é o primeiro quadro do plano seguinte
    const junta = j.at(2);
    expect(junta.plano).toBe(1);
    expect(junta.pos.toArray()).toEqual([1, 0, 0]);
    expect(junta.fov).toBe(50);
    const fim = j.at(5);
    expect(fim.plano).toBe(1);
    expect(fim.pos.toArray()).toEqual([1, 2, 0]);
    expect(fim.fov).toBe(30);
  });
});
