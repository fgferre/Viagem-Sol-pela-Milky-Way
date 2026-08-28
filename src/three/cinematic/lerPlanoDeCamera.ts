// Item 75: dados do roteiro → peças já usadas pela câmera.
// Lido uma vez, na montagem; não interpreta texto nem aloca por quadro.
import * as THREE from 'three';
import {
  bezier, easeOut, glide, launch, line, linear, lookEvento, lookPan,
  orbit, panLook, panThenHold, settle, settleFreeze, smooth, still,
  type Ease, type PosFn,
} from './movimentos';

export interface CameraDoPlano {
  dur: number;
  pos: PosFn;
  look: PosFn;
  fov0: number;
  fov1: number;
  ease?: Ease;
  /**
   * EASE SÓ DO FOV (F3), quando ele precisa divergir do da trajetória.
   * Ausente, o fov usa o `ease` do plano, como sempre — e a expressão
   * que `at` avalia é EXATAMENTE a de antes, então nenhum plano herdado
   * muda um bit. Nasceu por causa de um plano: a hélice da abertura
   * refilmada, cuja posição precisa do parâmetro CRU (a distância é
   * exponencial em segundos de relógio) enquanto o zoom 26°→56° tem de
   * continuar com o `glide` de sempre. O mergulho de volta da coda usa
   * o mesmo par (ease cru + fovEase) pela mesma razão. Sem este campo, a alternativa
   * seria inverter o smoothstep dentro do `pos` por Newton para
   * recuperar o `k` cru — conta iterativa por quadro para reproduzir um
   * número que já existe.
   */
  fovEase?: Ease;
}

const RITMOS = { linear, smooth, easeOut, glide, launch, settle, settleFreeze };

function erro(campo: string, motivo: string): never {
  throw new Error(`Plano de câmera: ${campo} ${motivo}`);
}

function objeto(valor: unknown, campo: string): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return erro(campo, 'deve ser um objeto');
  }
  return valor as Record<string, unknown>;
}

function numero(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return erro(campo, 'deve ser um número finito');
  }
  return valor;
}

function par(valor: unknown, campo: string): [number, number] {
  if (!Array.isArray(valor) || valor.length !== 2) return erro(campo, 'deve ter dois números');
  return [numero(valor[0], `${campo}[0]`), numero(valor[1], `${campo}[1]`)];
}

function fracao(valor: unknown, campo: string): number {
  const n = numero(valor, campo);
  if (n <= 0 || n > 1) return erro(campo, 'deve estar entre 0 (exclusivo) e 1');
  return n;
}

function ritmo(valor: unknown, campo: string): Ease | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !Object.hasOwn(RITMOS, valor)) {
    return erro(campo, `desconhecido: ${String(valor)}`);
  }
  return RITMOS[valor as keyof typeof RITMOS];
}

/** Pontos em pc no referencial da cena; nomes resolvidos na montagem. */
export function lerPlanoDeCamera(
  dado: unknown,
  pontos: Readonly<Record<string, THREE.Vector3>> = {}
): CameraDoPlano {
  const p = objeto(dado, 'plano');
  const dur = numero(p.duracao, 'duracao');
  if (dur <= 0) return erro('duracao', 'deve ser positiva');
  const [fov0, fov1] = par(p.lente, 'lente');
  if ([fov0, fov1].some((n) => n <= 0 || n >= 180)) {
    return erro('lente', 'deve ficar entre 0 e 180 graus, sem as pontas');
  }

  const ponto = (valor: unknown, campo: string): THREE.Vector3 => {
    if (typeof valor === 'string') {
      if (!Object.hasOwn(pontos, valor)) return erro(campo, `não encontra o ponto “${valor}”`);
      const v = pontos[valor];
      return new THREE.Vector3(numero(v.x, campo), numero(v.y, campo), numero(v.z, campo));
    }
    if (!Array.isArray(valor) || valor.length !== 3) {
      return erro(campo, 'deve ser um nome ou [x, y, z] em pc');
    }
    return new THREE.Vector3(
      numero(valor[0], `${campo}[0]`), numero(valor[1], `${campo}[1]`), numero(valor[2], `${campo}[2]`)
    );
  };

  const m = objeto(p.movimento, 'movimento');
  let pos: PosFn;
  switch (m.tipo) {
    case 'fixo': pos = still(ponto(m.ponto, 'movimento.ponto')); break;
    case 'reta': pos = line(ponto(m.de, 'movimento.de'), ponto(m.para, 'movimento.para')); break;
    case 'curva':
      pos = bezier(
        ponto(m.de, 'movimento.de'), ponto(m.controle1, 'movimento.controle1'),
        ponto(m.controle2, 'movimento.controle2'), ponto(m.para, 'movimento.para')
      );
      break;
    case 'orbita': {
      const [r0, r1] = par(m.raio, 'movimento.raio');
      if (r0 < 0 || r1 < 0) return erro('movimento.raio', 'não pode ser negativo');
      const [a0, a1] = par(m.angulo, 'movimento.angulo');
      const [h0, h1] = par(m.altura, 'movimento.altura');
      pos = orbit(ponto(m.centro, 'movimento.centro'), r0, r1, a0, a1, h0, h1);
      break;
    }
    default: return erro('movimento.tipo', `desconhecido: ${String(m.tipo)}`);
  }

  const o = objeto(p.mira, 'mira');
  let look: PosFn;
  switch (o.tipo) {
    case 'fixo': look = still(ponto(o.ponto, 'mira.ponto')); break;
    case 'pan':
      look = panLook(ponto(o.de, 'mira.de'), ponto(o.para, 'mira.para'), ritmo(o.ritmo, 'mira.ritmo'));
      break;
    case 'pan-cedo':
      look = panThenHold(ponto(o.de, 'mira.de'), ponto(o.para, 'mira.para'), fracao(o.ate, 'mira.ate'));
      break;
    case 'pan-direcao':
      look = lookPan(pos, ponto(o.de, 'mira.de'), ponto(o.para, 'mira.para'), fracao(o.ate, 'mira.ate'));
      break;
    case 'passagem': {
      const entrada = fracao(o.entrada, 'mira.entrada');
      const saida = fracao(o.saida, 'mira.saida');
      if (saida < entrada) return erro('mira.saida', 'não pode vir antes da entrada');
      look = lookEvento(
        pos, ponto(o.de, 'mira.de'), ponto(o.assunto, 'mira.assunto'),
        ponto(o.rumo, 'mira.rumo'), entrada, saida
      );
      break;
    }
    default: return erro('mira.tipo', `desconhecido: ${String(o.tipo)}`);
  }

  return {
    dur, pos, look, fov0, fov1,
    ease: ritmo(p.ritmo, 'ritmo'),
    fovEase: ritmo(p.ritmoDaLente, 'ritmoDaLente'),
  };
}
