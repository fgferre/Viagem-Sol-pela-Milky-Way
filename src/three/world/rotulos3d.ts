// ============================================================
// RÓTULOS 3D (item 109 — opção BETA, decisão dele em 29/08: "no atlas
// os labels 3d sao muito mais bonitos e sao dinamicos de um jeito
// interessante").
//
// O DESENHO QUE PRESERVA AS TRÊS LEIS: esta camada NÃO decide quem
// aparece — ela espelha, em texto SDF na cena (troika), exatamente os
// rótulos de CORPO que o `LabelCanvas` mandou desenhar. A colisão, a
// régua de relevância e o clique (a lista única da pendência 30)
// continuam morando no caminho 2D: lá, com a beta ligada, o texto do
// corpo fica INVISÍVEL mas segue ocupando a vaga (as estrelas não
// invadem) e o anel segue sendo a âncora clicável. Aqui só se PINTA.
//
// TAMANHO ESTÁVEL DE TELA por ESCALA do mesh (fov e distância entram na
// conta; zero re-layout por quadro — o `sync()` do troika roda na
// criação e SÓ de novo quando o LADO da vaga troca). A fonte é a Inter
// embarcada
// (`public/fonts/inter-400.woff`, SIL OFL — ver ASSETS.md; woff1 porque
// o parser do troika não digere woff2): sem ela o troika buscaria
// glifos num CDN em tempo de execução, e esta casa é autocontida.
// ============================================================
import * as THREE from 'three';
// @ts-expect-error — troika-three-text não publica tipos
import { Text } from 'troika-three-text';
import type { StarLabel } from './labels';

/** fração da meia-altura da tela que a fonte ocupa (~13 px em 900) */
const FRACAO_DA_TELA = 13 / 450;

const FONTE = `${import.meta.env.BASE_URL}fonts/inter-400.woff`;

/** a tinta dos corpos — a mesma família do peso `secundario` do 2D */
const TINTA = '#f0f4fb';

type TextoTroika = {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  anchorX: string;
  anchorY: string;
  visible: boolean;
  renderOrder: number;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  quaternion: THREE.Quaternion;
  material: { depthTest: boolean; depthWrite: boolean };
  sync: (cb?: () => void) => void;
  dispose: () => void;
};

/**
 * O rótulo COM A VAGA que o 2D reservou — o mesmo contrato que já liga
 * os dois pintores: quem escreve é o `LabelCanvas`, no MESMO objeto em
 * que escreve `desenhado`; `ladoEsquerdo` diz que a caixa ficou à
 * ESQUERDA da âncora (a borda direita da tela mandou). O campo mora
 * aqui, e não em `StarLabel` (`world/labels.ts`), de propósito: é o fio
 * privado 2D→3D da beta do item 109 e só este pintor o lê — declarado
 * ao lado do único leitor, a pegada da beta fica inteira atrás da flag.
 */
export interface RotuloComVaga extends StarLabel {
  ladoEsquerdo?: boolean;
}

export class Rotulos3d {
  private readonly grupo = new THREE.Group();
  private readonly textos = new Map<string, TextoTroika>();
  /** o lado em que cada texto está pintado — o re-`sync()` só acontece
   *  quando a vaga do 2D troca de lado */
  private readonly ladoDoTexto = new Map<string, boolean>();
  private readonly cena: THREE.Scene;
  private naCena = false;

  constructor(cena: THREE.Scene) {
    this.cena = cena;
  }

  /**
   * Por quadro, na fase `atlas` com a beta ligada: espelha os rótulos
   * de corpo DESENHADOS (a decisão é do 2D) como texto na cena, na
   * posição de MUNDO do corpo. `posicaoDe` devolve a posição viva do
   * corpo pela chave, ou null (sem efeméride ⇒ sem texto — a mesma
   * regra das linhas de órbita).
   */
  sincronizar(
    ligado: boolean,
    cam: THREE.PerspectiveCamera,
    alvos: readonly RotuloComVaga[],
    posicaoDe: (key: string) => readonly [number, number, number] | null
  ) {
    if (!ligado) {
      if (this.naCena) {
        this.cena.remove(this.grupo);
        this.naCena = false;
      }
      return;
    }
    if (!this.naCena) {
      this.cena.add(this.grupo);
      this.naCena = true;
    }
    const vivos = new Set<string>();
    const tanMeioFov = Math.tan((cam.fov * Math.PI) / 360);
    for (const alvo of alvos) {
      if (!alvo.key.startsWith('corpo:')) continue;
      if (alvo.desenhado !== true || alvo.icone) continue;
      const pos = posicaoDe(alvo.key);
      if (!pos) continue;
      vivos.add(alvo.key);
      const esquerda = alvo.ladoEsquerdo === true;
      let t = this.textos.get(alvo.key);
      if (!t) {
        t = new Text() as TextoTroika;
        t.font = FONTE;
        t.fontSize = 1; // unidade-base; o tamanho real vem da ESCALA
        t.color = TINTA;
        t.outlineColor = '#000000';
        t.outlineWidth = 0.12;
        t.anchorY = 'middle';
        // PROFUNDIDADE É LEI, como no clarão (§5.15): o texto mora no
        // CENTRO do corpo e as superfícies resolvidas escrevem depth
        // (corpos.ts) — com o teste ligado, a casca frontal engolia o
        // nome inteiro em vista próxima, e a beta já apagou o texto 2D.
        t.material.depthTest = false;
        t.material.depthWrite = false;
        // depois da fita das órbitas (8) e da atmosfera da Terra (9):
        // o nome é legenda — nada da cena pinta por cima dele
        t.renderOrder = 10;
        this.escreverLado(t, alvo.key, alvo.name, esquerda);
        this.grupo.add(t as unknown as THREE.Object3D);
        this.textos.set(alvo.key, t);
      } else if (this.ladoDoTexto.get(alvo.key) !== esquerda) {
        this.escreverLado(t, alvo.key, alvo.name, esquerda);
      }
      t.visible = true;
      t.position.set(pos[0], pos[1], pos[2]);
      // escala = fração da tela × altura visível naquela distância
      const d = t.position.distanceTo(cam.position);
      t.scale.setScalar(FRACAO_DA_TELA * d * tanMeioFov);
      t.quaternion.copy(cam.quaternion);
    }
    for (const [key, t] of this.textos) {
      if (!vivos.has(key)) t.visible = false;
    }
  }

  /**
   * PINTA NO LADO DA VAGA — a vaga é do 2D. Caixa reservada à ESQUERDA
   * da âncora ⇒ âncora do texto à direita, e o espaço separador (o vão
   * entre o glifo e o corpo) troca de lado junto. Sem isto o texto
   * crescia sempre para a direita: nos 28% direitos da tela o nome saía
   * clipado e podia cobrir um nome 2D vizinho.
   */
  private escreverLado(t: TextoTroika, key: string, name: string, esquerda: boolean) {
    const nome = name.toLocaleUpperCase('pt-BR');
    t.text = esquerda ? nome + ' ' : ' ' + nome;
    t.anchorX = esquerda ? 'right' : 'left';
    this.ladoDoTexto.set(key, esquerda);
    t.sync();
  }

  dispose() {
    for (const t of this.textos.values()) t.dispose();
    this.textos.clear();
    this.ladoDoTexto.clear();
    if (this.naCena) this.cena.remove(this.grupo);
  }
}
