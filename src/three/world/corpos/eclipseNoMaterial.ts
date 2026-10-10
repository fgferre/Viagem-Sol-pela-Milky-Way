// ============================================================
// O ECLIPSE NO MATERIAL de um corpo resolvido (F2c/D3).
//
// A escrita dos uniforms (cena→local pela transposta da base IAU) e
// os defaults neutros. Morava em terra.ts; é o molde compartilhado
// dos corpos (a Lua foi o segundo consumidor).
// ============================================================
import * as THREE from 'three';
import { GANHO_OBSERVADOR_ECLIPSE_LUNAR, type SombraNaCena } from '../../../lib/atlas/eclipse';
import { porCurva } from '../../core/engine';

/**
 * OS UNIFORMS DO ECLIPSE num material de corpo resolvido (F2c/D3) — a
 * ponte cena→local é a transposta da base IAU (as MESMAS colunas que
 * levam o `uDirSolLocal`), e `derivaRad` desfaz o giro extra da casca
 * das nuvens (0 na superfície). Inativo: só o flag 0 é escrito — os
 * vetores antigos nunca são lidos, o chunk retorna 1 antes de tocá-los.
 * Exportada para a Lua (o molde compartilhado dos corpos, F2b).
 */
export function escreverSombraDeEclipse(
  u: Record<string, THREE.IUniform>,
  s: SombraNaCena,
  vX: THREE.Vector3,
  vY: THREE.Vector3,
  vZ: THREE.Vector3,
  derivaRad: number
) {
  u.uEclipseAtivo.value = s.ativo ? 1 : 0;
  if (!s.ativo) return;
  const [ex, ey, ez] = s.eixoCena;
  const [ox, oy, oz] = s.eclipsadorRaios;
  // cena → local: cada componente é o dot com a coluna da base
  let eixoLx = ex * vX.x + ey * vX.y + ez * vX.z;
  const eixoLy = ex * vY.x + ey * vY.y + ez * vY.z;
  let eixoLz = ex * vZ.x + ey * vZ.y + ez * vZ.z;
  let occLx = ox * vX.x + oy * vX.y + oz * vX.z;
  const occLy = ox * vY.x + oy * vY.y + oz * vY.z;
  let occLz = ox * vZ.x + oy * vZ.y + oz * vZ.z;
  if (derivaRad !== 0) {
    // a casca das nuvens tem o frame RODADO pela deriva: desfaz Ry(θ),
    // a mesma conta do uDirSolLocal das nuvens
    const cosD = Math.cos(derivaRad);
    const sinD = Math.sin(derivaRad);
    [eixoLx, eixoLz] = [eixoLx * cosD - eixoLz * sinD, eixoLx * sinD + eixoLz * cosD];
    [occLx, occLz] = [occLx * cosD - occLz * sinD, occLx * sinD + occLz * cosD];
  }
  (u.uEclipseEixo.value as THREE.Vector3).set(eixoLx, eixoLy, eixoLz);
  (u.uEclipseEclipsador.value as THREE.Vector3).set(occLx, occLy, occLz);
  (u.uEclipseCone.value as THREE.Vector3).set(
    s.raioEclipsadorRaios,
    s.inclinacaoUmbra,
    s.inclinacaoPenumbra
  );
  (u.uEclipsePisoCor.value as THREE.Vector3).set(
    s.pisoUmbral[0],
    s.pisoUmbral[1],
    s.pisoUmbral[2]
  );
  u.uEclipsePisoEscalar.value = s.minSombra;
}

/** Os uniforms do eclipse com defaults NEUTROS — nascem em todo material
 *  de superfície resolvida (Terra, nuvens, Lua). */
export function uniformsDeEclipseNeutros(): Record<string, THREE.IUniform> {
  return {
    uEclipseAtivo: { value: 0 },
    uEclipseEixo: { value: new THREE.Vector3(1, 0, 0) },
    uEclipseEclipsador: { value: new THREE.Vector3(0, 0, 1) },
    uEclipseCone: { value: new THREE.Vector3(0, 0, 0) },
    uEclipsePisoCor: { value: new THREE.Vector3(0, 0, 0) },
    uEclipsePisoEscalar: { value: 1 },
    uEclipseGanhoObservador: { value: GANHO_OBSERVADOR_ECLIPSE_LUNAR[0] },
  };
}

/**
 * A EXPOSIÇÃO DO OBSERVADOR pela curva viva (R1b): o three chama o
 * `onBeforeRender` do material antes de subir os uniforms do desenho, com o
 * renderer — a curva é lida dele, nunca guardada. Só o material da Lua a
 * liga: o ganho multiplica só o piso cobre, e só a Terra o projeta
 * (`PARES_DE_ECLIPSE`: a Lua é o único receptor da sombra dela); nos
 * outros corpos o piso é 0 e o valor do ACES que nasce acima multiplica 0.
 */
export function ligarGanhoDoObservador(m: THREE.ShaderMaterial) {
  m.onBeforeRender = (renderer) => {
    m.uniforms.uEclipseGanhoObservador.value = porCurva(
      renderer.toneMapping,
      GANHO_OBSERVADOR_ECLIPSE_LUNAR[0],
      GANHO_OBSERVADOR_ECLIPSE_LUNAR[1]
    );
  };
}
