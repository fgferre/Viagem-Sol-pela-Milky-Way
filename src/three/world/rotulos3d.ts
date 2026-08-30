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
// conta; zero re-layout por quadro — o `sync()` do troika roda uma vez
// por texto, na criação). A fonte é a Inter embarcada
// (`public/fonts/inter-400.woff2`, SIL OFL — ver ASSETS.md): sem ela o
// troika buscaria glifos num CDN em tempo de execução, e esta casa é
// autocontida.
// ============================================================
import * as THREE from 'three';
// @ts-expect-error — troika-three-text não publica tipos
import { Text } from 'troika-three-text';
import type { StarLabel } from './labels';

/** fração da meia-altura da tela que a fonte ocupa (~13 px em 900) */
const FRACAO_DA_TELA = 13 / 450;

const FONTE = `${import.meta.env.BASE_URL}fonts/inter-400.woff2`;

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
  position: THREE.Vector3;
  scale: THREE.Vector3;
  quaternion: THREE.Quaternion;
  material: { depthTest: boolean };
  sync: (cb?: () => void) => void;
  dispose: () => void;
};

export class Rotulos3d {
  private readonly grupo = new THREE.Group();
  private readonly textos = new Map<string, TextoTroika>();
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
    alvos: readonly StarLabel[],
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
      let t = this.textos.get(alvo.key);
      if (!t) {
        t = new Text() as TextoTroika;
        t.text = ' ' + alvo.name.toLocaleUpperCase('pt-BR');
        t.font = FONTE;
        t.fontSize = 1; // unidade-base; o tamanho real vem da ESCALA
        t.color = TINTA;
        t.outlineColor = '#000000';
        t.outlineWidth = 0.12;
        t.anchorX = 'left';
        t.anchorY = 'middle';
        t.sync();
        this.grupo.add(t as unknown as THREE.Object3D);
        this.textos.set(alvo.key, t);
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

  dispose() {
    for (const t of this.textos.values()) t.dispose();
    this.textos.clear();
    if (this.naCena) this.cena.remove(this.grupo);
  }
}
