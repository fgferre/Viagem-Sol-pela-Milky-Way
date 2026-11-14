// AS JUNTAS ENTRE OS ATOS DO FILME ESTELAR — onde um ato entrega a câmera ao
// seguinte. Cada ato tem um autor; a junta é o único ponto que dois atos
// dividem, e por isso mora aqui e não no arquivo de nenhum dos dois.
//
// A LEI DA JUNTA: o ato que sai TERMINA o último plano parado neste ponto,
// mirando o primeiro destino do ato seguinte (mira fixa nele), com a lente em
// 40°; o ato que entra COMEÇA o primeiro plano no mesmo ponto, com a mesma
// mira e a mesma lente. A câmera já olha para onde vai: a travessia começa
// de frente. (Prólogo → Ato 1 usa o `mirante` do prólogo, mirando Alnilam, 32°.)
import * as THREE from 'three';
import { LUGARES_DA_BUSCA } from '../../../../world/lugaresDoCeu';
import { UA, ate } from '../../solar/atos/geometria';
import { ESTRELAS_DO_FILME } from '../estrelas';

const lugar = (id: string) => {
  const l = LUGARES_DA_BUSCA.find((x) => x.id === id);
  if (!l) throw new Error(`filme estelar: sem o lugar “${id}”`);
  return new THREE.Vector3(l.x, l.y, l.z);
};
/** o ponto a `distancia` pc de `de`, no rumo de `para` */
const adiante = (de: THREE.Vector3, para: THREE.Vector3, distancia: number) =>
  de.clone().addScaledVector(ate(de, para), distancia);

/** os pontos das juntas, em pc */
export const PONTOS_DAS_JUNTAS: Readonly<Record<string, THREE.Vector3>> = {
  // Ato 2 → Ato 3: fora da nebulosa (ela mede ~8 pc), do lado das Plêiades
  saidaDeOrion: adiante(lugar('nebulosa-de-orion'), lugar('pleiades'), 12),
  // Ato 4 → Ato 5: Sírius A e B já pequenas atrás, no rumo de Próxima
  saidaDeSirius: adiante(ESTRELAS_DO_FILME.Sirius, ESTRELAS_DO_FILME['Proxima Centauri'], 200 * UA),
};
