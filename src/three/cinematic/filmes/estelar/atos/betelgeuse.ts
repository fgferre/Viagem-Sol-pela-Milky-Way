// O ATO 1 DO FILME ESTELAR — BETELGEUSE, quem vive depressa. Pontos e
// números nomeados de `roteiros/estelar/betelgeuse.json`, no molde do
// prólogo: a conta mora aqui, o JSON só fala os nomes.
//
// O CHÃO DO ATO: em Betelgeuse a câmera gira em volta do "cima" do filme (o
// polo da eclíptica, `CIMA`), com o horizonte nivelado. Os rumos são medidos
// nesse chão a partir da direção Betelgeuse → Nebulosa de Órion (0°, o
// destino do ato seguinte); o Sol fica a ~160°, atrás de quem chega.
import * as THREE from 'three';
import { LUGARES_DA_BUSCA } from '../../../../world/lugaresDoCeu';
import { CIMA_DA_ECLIPTICA as CIMA, R_SOL, girar, perpendicular, versor } from '../../solar/atos/geometria';
import { estrelaVisitavelPorNome } from '../../../../../lib/atlas/estrelasVisitaveis';
import { ESTRELAS_DO_FILME } from '../estrelas';

const BETELGEUSE = ESTRELAS_DO_FILME.Betelgeuse;
/** o raio que o app desenha: o da ficha (764 R☉, Joyce et al. 2020) */
export const R_BETELGEUSE = estrelaVisitavelPorNome('Betelgeuse')!.raioRsol.v * R_SOL;
const ORION = (() => {
  const l = LUGARES_DA_BUSCA.find((x) => x.id === 'nebulosa-de-orion')!;
  return new THREE.Vector3(l.x, l.y, l.z);
})();

/** o chão: 0° no rumo da nebulosa, 90° para o lado de `LADO` */
const FRENTE = perpendicular(ORION.clone().sub(BETELGEUSE), CIMA);
const LADO = new THREE.Vector3().crossVectors(CIMA, FRENTE);
/** a direção no chão, `graus` a partir do rumo da nebulosa */
const rumo = (graus: number) => girar(FRENTE, LADO, graus);

// ================= A1 — A FIGURA SE DESFAZ =================
// Sai do mirante em linha reta para Betelgeuse, mirando-a: ela fica no
// centro, e as estrelas da figura que estão mais perto escorrem para fora —
// Bellatrix, a 77 pc e a ~10 pc da reta, passa pelo lado no meio do plano;
// Rigel e as Três Marias, atrás de Betelgeuse, abrem devagar. A distância
// cai por razão constante (`aproximacao`), que gasta o mesmo tempo de 150 a
// 75 pc e de 30 a 15: com o `launch` no relógio e o fim a 15 pc, Bellatrix
// sai do quadro aos ~6 s (medido nas fotos), e o resto da figura abre até o
// fim. Betelgeuse ainda é ponto; a A2 leva os outros degraus de escala até
// o disco.
const DISTANCIA_DO_FIM_DA_TRAVESSIA = 15;
const DE_CASA = versor(new THREE.Vector3().sub(BETELGEUSE));

// ================= A2–A4 — PONTO, DISCO, TAMANHO =================
// A chegada curva do rumo de casa para o lado (110°), onde começa a órbita
// curta: 30° em 12 s, rente — a 3,2 e 2,9 raios, fora da borda difusa
// (1,3 raio, `bordaDifusaRaios` da ficha) com folga. Daí a câmera recua no
// mesmo rumo (80°) até 9 raios: a estrela inteira, redonda, no quadro.
// Em 80° o rumo da nebulosa já é um pouco à frente da câmera: a travessia do
// Ato 2 parte dali sem passar por Betelgeuse.
const ORBITA = { de: 110, para: 80, raioDe: 3.2, raioPara: 2.9 };
const AFASTADO_EM_RAIOS = 9;
/** o empurrão da A5 no rumo da nebulosa, que vira o começo da travessia */
const PARTIDA_EM_RAIOS = 6;

const naOrbita = (graus: number, raios: number) =>
  rumo(graus).multiplyScalar(raios * R_BETELGEUSE).add(BETELGEUSE);
const AFASTADO = naOrbita(ORBITA.para, AFASTADO_EM_RAIOS);

/** os pontos nomeados do Ato 1, em pc */
export const PONTOS_BETELGEUSE: Readonly<Record<string, THREE.Vector3>> = {
  fimDaTravessia: DE_CASA.clone().multiplyScalar(DISTANCIA_DO_FIM_DA_TRAVESSIA).add(BETELGEUSE),
  inicioDaOrbitaDeBetelgeuse: naOrbita(ORBITA.de, ORBITA.raioDe),
  direcaoDaOrbitaDeBetelgeuseDe: rumo(ORBITA.de),
  direcaoDaOrbitaDeBetelgeusePara: rumo(ORBITA.para),
  fimDaOrbitaDeBetelgeuse: naOrbita(ORBITA.para, ORBITA.raioPara),
  betelgeuseAfastada: AFASTADO,
  partidaDeBetelgeuse: AFASTADO.clone().addScaledVector(versor(ORION.clone().sub(AFASTADO)), PARTIDA_EM_RAIOS * R_BETELGEUSE),
};

/** os números nomeados do Ato 1: distâncias em pc */
export const NUMEROS_BETELGEUSE: Readonly<Record<string, number>> = {
  raioDaOrbitaDeBetelgeuseDe: ORBITA.raioDe * R_BETELGEUSE,
  raioDaOrbitaDeBetelgeusePara: ORBITA.raioPara * R_BETELGEUSE,
};
