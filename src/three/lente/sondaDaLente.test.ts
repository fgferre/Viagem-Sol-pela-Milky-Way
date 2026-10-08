// Serve: dono — o reflexo da lente apaga na medida do disco do Sol escondido atrás de um planeta, e volta quando ele reaparece
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RAMP_DURATION_MS, stepRampToward } from '../world/lodStellar';
import { SondaDaLente, TOQUES_DA_LENTE } from './sondaDaLente';

// Não há GPU nesta suíte: a consulta de oclusão de verdade só corre no
// navegador. `registrarToque` é o MESMO método que a consulta de cada toque
// chama com o resultado da GPU (null = toque fora da tela); o cast
// alcança-o sem abrir a API pública — o padrão do teste do clarão.
type ComRegistro = { registrarToque(i: number, visivel: boolean | null): void };
const registrar = (s: SondaDaLente, i: number, visivel: boolean | null) =>
  (s as unknown as ComRegistro).registrarToque(i, visivel);

function camera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 1e-9, 1e6);
  cam.position.set(0, 0, 1e-5); // perto de casa, olhando o Sol na origem
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

const quadro = (cam: THREE.Camera, dtS: number) => ({
  ligada: true,
  camera: cam,
  larguraPx: 1920,
  alturaPx: 1080,
  tanHalfFov: Math.tan(THREE.MathUtils.degToRad(25)),
  dtS,
});

/** quadros o bastante para a rampa chegar ao alvo */
function assentar(s: SondaDaLente, cam: THREE.Camera): number {
  let v = 1;
  for (let i = 0; i < 20; i++) v = s.atualizar(quadro(cam, 0.05));
  return v;
}

describe('a sonda da lente — quanto do disco do Sol está à vista', () => {
  it('k de N toques na tela passando dão k/N', () => {
    const s = new SondaDaLente();
    const cam = camera();
    for (let i = 0; i < TOQUES_DA_LENTE; i++) registrar(s, i, i < 5);
    expect(assentar(s, cam)).toBeCloseTo(5 / TOQUES_DA_LENTE, 12);
    s.dispose();
  });

  it('toque fora da tela não conta, e sem nenhum na tela fica a última medida', () => {
    const s = new SondaDaLente();
    const cam = camera();
    // metade fora da tela; dos de dentro, 2 de 6 passam
    for (let i = 0; i < TOQUES_DA_LENTE; i++) registrar(s, i, i < 6 ? null : i < 8);
    expect(assentar(s, cam)).toBeCloseTo(2 / 6, 12);
    for (let i = 0; i < TOQUES_DA_LENTE; i++) registrar(s, i, null);
    expect(assentar(s, cam)).toBeCloseTo(2 / 6, 12);
    s.dispose();
  });

  it('sem resposta o Sol na tela espera apagado, a primeira medida vale por inteiro e depois anda pela rampa da casa', () => {
    const s = new SondaDaLente();
    const cam = camera();
    expect(s.atualizar(quadro(cam, 0.05))).toBe(0);
    for (let i = 0; i < TOQUES_DA_LENTE; i++) registrar(s, i, false);
    expect(s.atualizar(quadro(cam, 0.05))).toBe(0);
    for (let i = 0; i < TOQUES_DA_LENTE; i++) registrar(s, i, true);
    const passo = s.atualizar(quadro(cam, 0.05));
    expect(passo).toBe(stepRampToward(0, 1, 0.05, RAMP_DURATION_MS));
    expect(passo).toBeGreaterThan(0);
    expect(passo).toBeLessThan(1);
    s.dispose();
  });
});
