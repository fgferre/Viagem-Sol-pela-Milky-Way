// Serve: lei — a lajota do anel (item 139) só existe dentro dele, e o ladrilho fica parado no mundo
// ============================================================
// A LAJOTA VOLUMÉTRICA DO ANEL (item 139) — dois contratos, e os dois
// são de COMPORTAMENTO:
//
//  1. A LIGAÇÃO POR DISTÂNCIA. Fora da faixa (alto demais sobre o plano,
//     ou fora da janela de raio) a malha não desenha, nenhum uniforme se
//     escreve e NENHUM grão é assado — é o que sustenta a promessa
//     medida do item ("de longe a vista sai com o mesmo md5"). Dentro,
//     ela aparece, o tier manda na contagem e o fade é linear na altura.
//  2. A ANCORAGEM NO MUNDO. O que faz o enxame parecer um enxame parado
//     é o LADRILHO saltar de múltiplo em múltiplo do lado — o grão fica
//     onde está enquanto a câmera anda dentro da mesma célula, e o que
//     sai por trás reaparece à frente já no lugar certo. A conta mora no
//     vértice; o juiz a lê do PRÓPRIO shader montado (`material.
//     vertexShader`), com as constantes que a GPU vai compilar, e não de
//     uma cópia digitada aqui.
//
// A JANELA DE RAIO é a mesma que o palco usa para registrar o chão do
// anel (`VOLUME_DA_LAJOTA`, lido por `gigante.ts`): uma fonte de
// verdade, conferida aqui pelo gate que ela liga.
// ============================================================
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import type { QualityLevel } from '../../core/engine';
import { GLSL_CONSTANTES_DO_ANEL, GLSL_SOMBRA_DO_PLANETA_NO_ANEL, ANEL_SATURNO } from './gigante';
import { LAJOTA_POR_TIER, LajotaDoAnel, VOLUME_DA_LAJOTA } from './lajotaDoAnel';

/** a régua da lajota: 1 raio equatorial de Saturno em km */
const KM_POR_RAIO = BODY_AXES.saturn[0]!;

function lajotaDeTeste() {
  return new LajotaDoAnel({
    glslSombraDoPlaneta: GLSL_SOMBRA_DO_PLANETA_NO_ANEL,
    glslConstantesDoAnel: GLSL_CONSTANTES_DO_ANEL,
    rInt: ANEL_SATURNO.rInt,
    rExt: ANEL_SATURNO.rExt,
  });
}

/** um quadro com a câmera a `rKm` do eixo e `alturaKm` do plano. */
function quadro(rKm: number, alturaKm: number, tier: QualityLevel = 'cinema') {
  return {
    dirSolLocal: new THREE.Vector3(1, 0, 0),
    camLocal: new THREE.Vector3(rKm / KM_POR_RAIO, 0, alturaKm / KM_POR_RAIO),
    luzGanho: 1,
    solAngRad: 0.005,
    kPolar: 0.9,
    nearRaios: 1e-6,
    tier,
  };
}

const material = (l: LajotaDoAnel) => l.malha.material as THREE.ShaderMaterial;
const graos = (l: LajotaDoAnel) =>
  (l.malha.geometry as THREE.InstancedBufferGeometry).getAttribute('aGrao').array as Float32Array;

describe('1. a ligação por distância — fora do anel a lajota não existe', () => {
  it('nasce invisível, sem instância e sem um grão assado', () => {
    const l = lajotaDeTeste();
    expect(l.malha.visible).toBe(false);
    expect((l.malha.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(0);
    expect(graos(l).every((v) => v === 0)).toBe(true);
    l.dispose();
  });

  it('DENTRO do anel e rente ao plano ela aparece, com os grãos do tier', () => {
    const l = lajotaDeTeste();
    l.atualizar(quadro(110_000, 40));
    expect(l.malha.visible).toBe(true);
    expect((l.malha.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(
      LAJOTA_POR_TIER.cinema
    );
    // e os uniformes do quadro chegaram ao material
    const u = material(l).uniforms;
    expect((u.uCamLocal.value as THREE.Vector3).x).toBeCloseTo(110_000 / KM_POR_RAIO, 12);
    expect(u.uVisivel.value).toBeGreaterThan(0.9);
    l.dispose();
  });

  it('ALTA demais sobre o plano: some, e o quadro não escreve nem uniforme', () => {
    const l = lajotaDeTeste();
    l.atualizar(quadro(110_000, 40));
    const camAntes = (material(l).uniforms.uCamLocal.value as THREE.Vector3).clone();
    // 5 000 km acima do plano — o triplo da soleira de 1 600
    l.atualizar(quadro(110_000, 5000));
    expect(l.malha.visible).toBe(false);
    expect(material(l).uniforms.uCamLocal.value).toEqual(camAntes);
    l.dispose();
  });

  it('FORA da janela de raio: some dos dois lados, e nada é assado', () => {
    for (const rKm of [VOLUME_DA_LAJOTA.rMin * KM_POR_RAIO - 1, VOLUME_DA_LAJOTA.rMax * KM_POR_RAIO + 1]) {
      const l = lajotaDeTeste();
      l.atualizar(quadro(rKm, 0));
      expect(l.malha.visible, `r = ${rKm} km`).toBe(false);
      expect(graos(l).every((v) => v === 0), `r = ${rKm} km`).toBe(true);
      l.dispose();
    }
  });

  it('a janela do gate É a janela publicada ao palco (uma fonte de verdade)', () => {
    const l = lajotaDeTeste();
    // um metro DENTRO de cada borda já liga
    l.atualizar(quadro(VOLUME_DA_LAJOTA.rMin * KM_POR_RAIO + 0.001, 0));
    expect(l.malha.visible).toBe(true);
    l.atualizar(quadro(VOLUME_DA_LAJOTA.rMax * KM_POR_RAIO - 0.001, 0));
    expect(l.malha.visible).toBe(true);
    l.dispose();
    // e a meia-espessura publicada é a que o vértice usa (ESPESSURA/2)
    const meia = VOLUME_DA_LAJOTA.meiaEspessura * KM_POR_RAIO;
    expect(meia).toBeCloseTo(12, 9);
  });

  it('o fade na altura é LINEAR até 1 600 km — nada estala ao entrar', () => {
    const l = lajotaDeTeste();
    const dose = (alturaKm: number) => {
      l.atualizar(quadro(110_000, alturaKm));
      return l.malha.visible ? (material(l).uniforms.uVisivel.value as number) : 0;
    };
    expect(dose(0)).toBeCloseTo(1, 12);
    expect(dose(800)).toBeCloseTo(0.5, 12);
    expect(dose(1200)).toBeCloseTo(0.25, 12);
    expect(dose(1600)).toBe(0);
    l.dispose();
  });

  it('o tier manda na contagem, e subir de tier só assa o que faltava', () => {
    const l = lajotaDeTeste();
    l.atualizar(quadro(110_000, 40, 'performance'));
    const g = graos(l);
    const prefixo = Array.from(g.slice(0, LAJOTA_POR_TIER.performance * 4));
    expect((l.malha.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(
      LAJOTA_POR_TIER.performance
    );
    // o resto do vetor continua intocado — nada foi assado além do tier
    expect(g.slice(LAJOTA_POR_TIER.performance * 4).every((v) => v === 0)).toBe(true);
    l.atualizar(quadro(110_000, 40, 'cinema'));
    expect((l.malha.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(
      LAJOTA_POR_TIER.cinema
    );
    // O MESMO GRÃO PARA O MESMO ÍNDICE: o prefixo não mudou um bit, então
    // o enxame não muda de forma quando o tier sobe
    expect(Array.from(graos(l).slice(0, LAJOTA_POR_TIER.performance * 4))).toEqual(prefixo);
    l.dispose();
  });
});

describe('2. a ancoragem no mundo — quem segue a câmera é o LADRILHO', () => {
  /**
   * A CONTA DO VÉRTICE, lida do shader MONTADO. O `LADO` sai do próprio
   * texto que a GPU compila (o gerador o escreve em notação exponencial),
   * e a linha do salto é casada por inteiro: trocar o `floor(... + 0.5)`
   * por um "segue a câmera" muda o texto e derruba o casamento aqui.
   */
  function contaDoLadrilho(l: LajotaDoAnel) {
    const fonte = material(l).vertexShader;
    const lado = Number(/const float LADO = ([0-9.e+-]+);/.exec(fonte)?.[1]);
    expect(Number.isFinite(lado)).toBe(true);
    expect(fonte).toContain('ox + floor((uCamLocal.x - ox) / LADO + 0.5) * LADO');
    expect(fonte).toContain('oy + floor((uCamLocal.y - oy) / LADO + 0.5) * LADO');
    return {
      lado,
      // o lugar do grão de offset `o` (em raios) com a câmera em `cam`
      onde: (o: number, cam: number) => o + Math.floor((cam - o) / lado + 0.5) * lado,
    };
  }

  it('o lado do ladrilho no shader é o dele: 7 000 km', () => {
    const l = lajotaDeTeste();
    // o gerador escreve o número em notação exponencial com 8 casas —
    // por isso a comparação é de 9 dígitos, não de 12
    expect(contaDoLadrilho(l).lado).toBeCloseTo(7000 / KM_POR_RAIO, 9);
    l.dispose();
  });

  it('o grão fica PARADO enquanto a câmera anda dentro da mesma célula', () => {
    const l = lajotaDeTeste();
    const { lado, onde } = contaDoLadrilho(l);
    const offset = 0.31 * lado;
    const base = onde(offset, 0);
    for (const passo of [0.01, 0.1, 0.3, 0.49]) {
      expect(onde(offset, passo * lado), `câmera a ${passo} célula`).toBeCloseTo(base, 12);
    }
    l.dispose();
  });

  it('quando a câmera anda UMA célula, o grão reaparece uma célula à frente', () => {
    const l = lajotaDeTeste();
    const { lado, onde } = contaDoLadrilho(l);
    const offset = 0.31 * lado;
    for (const n of [1, 2, 17, -3]) {
      expect(onde(offset, n * lado) - onde(offset, 0), `${n} células`).toBeCloseTo(n * lado, 9);
    }
    l.dispose();
  });

  it('o grão nunca fica a mais de meia célula da câmera — o enxame a envolve', () => {
    const l = lajotaDeTeste();
    const { lado, onde } = contaDoLadrilho(l);
    for (const o of [0, 0.13, 0.5, 0.87, 0.999]) {
      for (const cam of [0, 0.2, 1.7, -4.3, 123.456]) {
        expect(Math.abs(onde(o * lado, cam * lado) - cam * lado)).toBeLessThanOrEqual(
          lado * 0.5 + 1e-12
        );
      }
    }
    l.dispose();
  });

  it('o sorteio é por ÍNDICE: dois nascimentos dão o MESMO enxame', () => {
    const a = lajotaDeTeste();
    const b = lajotaDeTeste();
    a.atualizar(quadro(110_000, 40, 'alta'));
    b.atualizar(quadro(110_000, 40, 'alta'));
    expect(Array.from(graos(b))).toEqual(Array.from(graos(a)));
    // e é sorteio de verdade: os quatro números do grão 0 não se repetem
    // em blocos, e todos caem em [0, 1)
    const g = graos(a).slice(0, LAJOTA_POR_TIER.alta * 4);
    expect(g.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new Set(Array.from(g.slice(0, 64))).size).toBe(64);
    a.dispose();
    b.dispose();
  });
});
