// Item 75: sequência JSON → planos usados pelo relógio único de Journey.
import type { Vector3 } from 'three';
import { booleano, erro, lista, numero, objeto, opcional, texto } from './dadosDoRoteiro';
import { lerApoiosDoPlano, type ApoiosDoPlano } from './apoiosDoRoteiro';
import { lerPlanoDeCamera, type CameraDoPlano } from './lerPlanoDeCamera';

interface ShotCaption {
  /** fração do shot em que a legenda ENTRA */
  at: number;
  text: string;
  sub?: string;
  /** janela de exibição em segundos de VIAGEM (padrão 8,6) */
  dur?: number;
  /** autoriza esta legenda, e somente ela, a sobreviver ao corte do plano */
  bridge?: boolean;
}

export interface Shot extends CameraDoPlano, ApoiosDoPlano {
  captions?: ShotCaption[];
  /** assuntos declarados para a direção de etiquetas existente.
   *  'SOL' e 'SGR' são pseudo-alvos; o resto é nome de estrela do HYG. */
  target?: string[];
  /** silencia as etiquetas de fundo durante o beat */
  quiet?: boolean;
  /** linha de destino com distância viva: 'SGR' ou nome de estrela */
  dest?: string;
  /**
   * A LÍNGUA DO OLHAR (lei do dono, 19/08): 'frente' é o padrão e não
   * se escreve — a câmera olha para onde vai. 'assunto' declara órbita
   * ou contemplação de um alvo (trava, rasante, revelação da galáxia).
   * 'tras' declara acento traseiro CURTO (a dobradiça de CASA, a fuga
   * do buraco negro). A lei executável (roteiroPerfil.test) cobra a
   * frente de quem não declarou e o limite de duração de quem declarou.
   */
  lingua?: 'frente' | 'assunto' | 'tras';
}

function legenda(valor: unknown, campo: string): ShotCaption {
  const c = objeto(valor, campo);
  const at = numero(c.em, `${campo}.em`);
  if (at < 0 || at >= 1) return erro(`${campo}.em`, 'deve estar entre 0 e 1 (exclusivo)');
  const dur = opcional(c.duracao, `${campo}.duracao`, numero);
  if (dur !== undefined && dur <= 0) return erro(`${campo}.duracao`, 'deve ser positiva');
  return {
    at,
    text: texto(c.texto, `${campo}.texto`),
    sub: opcional(c.subtexto, `${campo}.subtexto`, texto),
    dur,
    bridge: opcional(c.ponte, `${campo}.ponte`, booleano),
  };
}

/** Ordem da lista é ordem de exibição; tempos absolutos continuam derivados em Journey. */
export function lerSequencia(
  dado: unknown,
  pontos: Readonly<Record<string, Vector3>> = {}
): Shot[] {
  const planos = lista(objeto(dado, 'sequencia').planos, 'planos');
  if (!planos.length) return erro('planos', 'deve conter ao menos um plano');
  return Array.from(planos, (valor, i) => {
    const campo = `planos[${i}]`;
    const p = objeto(valor, campo);
    const lingua = p.olhar;
    if (lingua !== undefined && lingua !== 'frente' && lingua !== 'assunto' && lingua !== 'tras') {
      return erro(`${campo}.olhar`, 'deve ser frente, assunto ou tras');
    }
    return {
      ...lerPlanoDeCamera(p.camera, pontos),
      ...lerApoiosDoPlano(p, campo),
      captions: opcional(p.legendas, `${campo}.legendas`, (v, c) =>
        Array.from(lista(v, c), (item, j) => legenda(item, `${c}[${j}]`))),
      target: opcional(p.assuntos, `${campo}.assuntos`, (v, c) =>
        Array.from(lista(v, c), (item, j) => texto(item, `${c}[${j}]`))),
      quiet: opcional(p.fundoSilencioso, `${campo}.fundoSilencioso`, booleano),
      dest: opcional(p.destino, `${campo}.destino`, texto),
      lingua,
    };
  });
}
