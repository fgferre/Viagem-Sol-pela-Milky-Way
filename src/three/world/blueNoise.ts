// ============================================================
// Blue noise 64x64 (void-and-cluster, toroidal, gerada offline) —
// jitter do raymarch. IGN imprimia xadrez estatico ~2 px nas nebulosas
// (sem TAA a estrutura dele nao se dissolve; meia-res a ampliava);
// ruido branco vira manchas de baixa frequencia. Blue noise e o otimo
// estatico: erro so em alta frequencia, sem periodo. 4 KB embutidos =
// zero carga assincrona.
// ============================================================
import * as THREE from 'three';

const B64 =
  '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';

export function makeBlueNoiseTexture(): THREE.DataTexture {
  const bin = atob(B64);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  const tex = new THREE.DataTexture(data, 64, 64, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
