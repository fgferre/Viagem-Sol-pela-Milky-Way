// ============================================================
// O PERFIL ANALÍTICO DO ROTEIRO — tempos e movimentos tirados do
// CÓDIGO, não de assistir tateando.
//
// Nasceu da reprovação de 19/08. A revisão de ritmo de 18/08 mediu
// pixel mudando por segundo e cravou "manter o corte"; o dono assistiu
// e reprovou: "muito enfadonho... minutos sem nada acontecer... feio
// viajar com a câmera de lado". As palavras dele que fundaram este
// arquivo: "vc tem os marcadores de tempo, vc pode entender o codigo
// para marcar tempos e movimentos."
//
// A lição: pixel mudando não é coisa acontecendo. O que o espectador
// percebe são QUATRO taxas — o assunto crescendo (aproximação), o mundo
// escorrendo pela janela (fluxo lateral), a cabeça virando (giro do
// olhar) e a lente fechando (zoom) — mais o TEXTO em cena. E percebe a
// LÍNGUA da câmera: olhar para onde se vai é o normal ("os aviões não
// voam de lado"); lado e traseira são acentos.
//
// Este módulo é puro de propósito: amostra o `Journey` por diferenças
// finitas e devolve números. Quem julga com eles é o teste vizinho
// (a lei executável) e quem desenha corte novo.
// ============================================================
import * as THREE from 'three';
import { Journey } from './journey';

export interface AmostraDoPerfil {
  t: number;
  /** velocidade da câmera, pc/s (diferença central) */
  velocidade: number;
  /** ângulo entre o olhar e a direção do voo, graus; 0 = reto para frente */
  anguloOlharVoo: number;
  /** o assunto crescendo: −d/dt da distância à mira, como fração dela por s */
  aproximacao: number;
  /** o mundo escorrendo de lado: componente lateral da velocidade sobre a
   *  distância à mira, em graus/s — o fluxo angular que o quadro mostra */
  fluxoLateral: number;
  /** a cabeça virando: giro da direção do olhar, graus/s */
  giroDoOlhar: number;
  /** a lente: |d fov/dt|, graus/s */
  zoom: number;
  /** distância câmera→ponto de mira, pc */
  distanciaDaMira: number;
  fov: number;
  /** título da legenda visível neste instante ('' = nenhuma) */
  legenda: string;
}

/**
 * O CRITÉRIO DO "NADA ACONTECE", uma vez só, para perfil e lei lerem o
 * MESMO piso. Os números foram CALIBRADOS no tédio real do dono
 * (19/08): os trechos que ele chamou de "minutos sem nada acontecer" —
 * o miolo das ondas, o zoom morrendo nas Três Marias, a cauda dos 71 s
 * finais — rodavam com o assunto crescendo a menos de 3%/s e o mundo
 * escorrendo a menos de ~1,5°/s. Pisos mais baixos que isto passavam o
 * corte reprovado; estes o pegam.
 */
export const PISO = {
  aproximacao: 0.03,
  fluxoLateral: 1.5,
  giroDoOlhar: 1.5,
  zoom: 1.0,
} as const;

export function instanteMorto(a: AmostraDoPerfil): boolean {
  return (
    Math.abs(a.aproximacao) < PISO.aproximacao
    && a.fluxoLateral < PISO.fluxoLateral
    && a.giroDoOlhar < PISO.giroDoOlhar
    && a.zoom < PISO.zoom
    && a.legenda === ''
  );
}

/** voo de lado: andando de verdade, com o olhar entre 55° e 125° do rumo
 *  e o mundo visivelmente escorrendo (>1°/s de fluxo lateral) */
export function instanteDeLado(a: AmostraDoPerfil): boolean {
  return a.anguloOlharVoo >= 55 && a.anguloOlharVoo <= 125 && a.fluxoLateral > 1;
}

export function perfilDoRoteiro(passo = 0.25): AmostraDoPerfil[] {
  const j = new Journey();
  const dt = passo / 2;
  const amostras: AmostraDoPerfil[] = [];
  const v = new THREE.Vector3();
  const olhar = new THREE.Vector3();
  const olharDepois = new THREE.Vector3();
  for (let t = passo; t <= j.duration - passo; t += passo) {
    const antes = j.at(t - dt);
    const aqui = j.at(t);
    const depois = j.at(t + dt);
    v.copy(depois.pos).sub(antes.pos).divideScalar(2 * dt);
    const velocidade = v.length();
    olhar.copy(aqui.look).sub(aqui.pos);
    const distanciaDaMira = olhar.length();
    olhar.normalize();
    const anguloOlharVoo = velocidade > 0
      ? THREE.MathUtils.radToDeg(olhar.angleTo(v))
      : 0;
    const dAntes = antes.look.distanceTo(antes.pos);
    const dDepois = depois.look.distanceTo(depois.pos);
    const aproximacao = distanciaDaMira > 0
      ? -(dDepois - dAntes) / (2 * dt) / distanciaDaMira
      : 0;
    const lateral = velocidade * Math.sin(olhar.angleTo(v));
    const fluxoLateral = distanciaDaMira > 0
      ? THREE.MathUtils.radToDeg(lateral / distanciaDaMira)
      : 0;
    olharDepois.copy(depois.look).sub(depois.pos).normalize();
    const olharAntes = antes.look.clone().sub(antes.pos).normalize();
    const giroDoOlhar = THREE.MathUtils.radToDeg(olharAntes.angleTo(olharDepois)) / (2 * dt);
    const zoom = Math.abs(depois.fov - antes.fov) / (2 * dt);
    amostras.push({
      t,
      velocidade,
      anguloOlharVoo,
      aproximacao,
      fluxoLateral,
      giroDoOlhar,
      zoom,
      distanciaDaMira,
      fov: aqui.fov,
      legenda: j.captionAt(t).key.caption,
    });
  }
  return amostras;
}

export interface Trecho {
  t0: number;
  t1: number;
  dur: number;
}

/** agrupa instantes consecutivos que passam no critério em trechos ≥ minDur */
export function trechos(
  amostras: AmostraDoPerfil[],
  criterio: (a: AmostraDoPerfil) => boolean,
  minDur: number
): Trecho[] {
  const achados: Trecho[] = [];
  let inicio: number | null = null;
  let fim = 0;
  const fecha = () => {
    if (inicio !== null && fim - inicio >= minDur) {
      achados.push({ t0: inicio, t1: fim, dur: fim - inicio });
    }
    inicio = null;
  };
  for (const a of amostras) {
    if (criterio(a)) {
      if (inicio === null) inicio = a.t;
      fim = a.t;
    } else fecha();
  }
  fecha();
  return achados;
}

export const trechosMortos = (amostras: AmostraDoPerfil[], minDur = 4) =>
  trechos(amostras, instanteMorto, minDur);

export const trechosDeLado = (amostras: AmostraDoPerfil[], minDur = 4) =>
  trechos(amostras, instanteDeLado, minDur);

export interface JanelaDeShot {
  t0: number;
  dur: number;
  lingua: 'frente' | 'assunto' | 'tras';
}

/**
 * Voo de lado SÓ onde a língua é 'frente': quem declarou 'assunto'
 * (órbita contemplando um alvo) ou 'tras' (acento) tem passe — a lei
 * do dono permite os dois, desde que declarados e curtos.
 */
export function trechosDeLadoEmFrente(
  amostras: AmostraDoPerfil[],
  shots: JanelaDeShot[],
  minDur = 4
): Trecho[] {
  const emFrente = (t: number) => {
    const s = shots.find((j) => t >= j.t0 && t < j.t0 + j.dur);
    return (s?.lingua ?? 'frente') === 'frente';
  };
  return trechos(amostras, (a) => emFrente(a.t) && instanteDeLado(a), minDur);
}
