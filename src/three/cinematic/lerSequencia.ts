// Item 75: sequência JSON → planos usados pelo relógio único de Journey.
import type { Vector3 } from 'three';
import { MODOS_DA_LENTE, type ModoDaLente } from '../core/engine';
import { booleano, erro, lista, numero, objeto, opcional, texto } from './dadosDoRoteiro';
import { lerApoiosDoPlano, type ApoiosDoPlano } from './apoiosDoRoteiro';
import { lerPlanoDeCamera, type CameraDoPlano } from './lerPlanoDeCamera';

interface ShotCaption {
  /** fração do shot em que a legenda ENTRA */
  at: number;
  text: string;
  sub?: string;
  /**
   * O PAR EM INGLÊS (item 130/F3). O português continua sendo a CHAVE —
   * é por ele que `REVEAL_T` acha o beat do estilingue, que a auditoria
   * do roteiro nomeia a legenda e que os juízes a procuram —, e o inglês
   * chega ao lado. Legenda sem `en` fica em português na tela inglesa:
   * piso declarado, e não buraco silencioso.
   */
  en?: { text: string; sub?: string };
  /** janela de exibição em segundos de VIAGEM (padrão 8,6) */
  dur?: number;
  /** autoriza esta legenda, e somente ela, a sobreviver ao corte do plano */
  bridge?: boolean;
}

export interface Shot extends CameraDoPlano, ApoiosDoPlano {
  /** nome do plano, único no filme que o declara (o solar o dá a todos):
   *  é por ele que os testes e as ferramentas o acham, em vez do índice */
  nome?: string;
  captions?: ShotCaption[];
  /** assuntos declarados para a direção de etiquetas existente.
   *  'SOL' e 'SGR' são pseudo-alvos; um id de `CORPOS_DO_SISTEMA` ou de
   *  `LUAS_DO_SISTEMA` ('earth', 'moon', 'io'…) nomeia o corpo da casa; o
   *  resto é nome de estrela do HYG. Este leitor não confere nomes: o que
   *  não resolve some calado no desenho (`director/rotulos.ts`). */
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
  /**
   * A LENTE DE CINEMA DA CENA (decisão do dono, 09/10: "o diretor
   * escolhe, cena por cena; o Atlas segue limpo"). Durante o filme é ela
   * que vale, e não a escolha do visitante em Ajustes; ausente, a cena
   * vai sem lente ('nenhuma'). Não confundir com `lente` da câmera, que
   * é o campo de visão (`lerPlanoDeCamera`). Quem aplica é o Director
   * (`director/lenteDoFilme.ts`).
   */
  lenteDeCinema?: ModoDaLente;
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
    en: opcional(c.en, `${campo}.en`, (valorEn, campoEn) => {
      const bloco = objeto(valorEn, campoEn);
      return {
        text: texto(bloco.texto, `${campoEn}.texto`),
        sub: opcional(bloco.subtexto, `${campoEn}.subtexto`, texto),
      };
    }),
    dur,
    bridge: opcional(c.ponte, `${campo}.ponte`, booleano),
  };
}

/** Ordem da lista é ordem de exibição; tempos absolutos continuam derivados em Journey. */
export function lerSequencia(
  dado: unknown,
  pontos: Readonly<Record<string, Vector3>> = {},
  numeros: Readonly<Record<string, number>> = {}
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
      ...lerPlanoDeCamera(p.camera, pontos, numeros),
      ...lerApoiosDoPlano(p, campo),
      nome: opcional(p.nome, `${campo}.nome`, texto),
      captions: opcional(p.legendas, `${campo}.legendas`, (v, c) =>
        Array.from(lista(v, c), (item, j) => legenda(item, `${c}[${j}]`))),
      target: opcional(p.assuntos, `${campo}.assuntos`, (v, c) =>
        Array.from(lista(v, c), (item, j) => texto(item, `${c}[${j}]`))),
      quiet: opcional(p.fundoSilencioso, `${campo}.fundoSilencioso`, booleano),
      dest: opcional(p.destino, `${campo}.destino`, texto),
      lingua,
      lenteDeCinema: opcional(p.lenteDeCinema, `${campo}.lenteDeCinema`, (v, c) =>
        MODOS_DA_LENTE.find((m) => m === v) ?? erro(c, 'deve ser nenhuma, redonda, anamorfica ou hollywood')),
    };
  });
}
