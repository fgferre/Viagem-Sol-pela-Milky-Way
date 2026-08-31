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

/**
 * A FOLGA ENTRE A ÂNCORA E O NOME, em corpos da fonte — o `RECUO_DO_TEXTO`
 * do `LabelCanvas` (18 px) sobre o corpo do nome (13 px), que é a unidade
 * desta camada (`FRACAO_DA_TELA` é "13 px em 900"). A vaga é do 2D; a
 * folga dentro dela também tem de ser.
 *
 * ERA UM ESPAÇO (` NOME`), e o espaço mede ~0,26 em: o nome nascia a 4 px
 * da âncora onde o 2D o punha a 18 px. Medido na foto
 * `item109-beta-abertura` (1920×1080 dpr 2, px de tela): com 4 px o "S" de
 * SOL caía a 11–26 px do núcleo, onde o quadro está saturado e o contorno
 * não consegue escurecer (piso de 216 de 255) — contraste de 1,8:1 na
 * primeira letra. A 41–56 px o MESMO contorno já cava até 79, e é para lá
 * que a folga do 2D leva a palavra; com o halo abaixo a primeira letra
 * mede 12,5:1 na `-v2`. Isto NÃO é um caso especial do Sol — é a folga do
 * desenho, igual para os dez corpos.
 */
const RECUO_EM_EMS = 18 / 13;

/**
 * O HALO ESCURO do nome — o `shadowColor rgba(0,0,0,0.96)` + `shadowBlur 7`
 * que o `LabelCanvas` já põe atrás de cada nome, traduzido para o SDF
 * (`outlineWidth` + `outlineBlur`, em corpos da fonte). Sem ele o nome
 * dentro do clarão é branco sobre branco: o texto mora NA CENA, então o
 * bloom soma por cima dele depois de desenhado e a única defesa é o buraco
 * escuro que ele mesmo cava. O contorno de 0,12 em sem borrão que estava
 * aqui alcançava 3,4 px — não chegava a cavar.
 */
const CONTORNO = { largura: 0.1, borrao: 7 / 13, opacidade: 0.96 };

/**
 * O NOME NASCE NA FRENTE DA CASCA DO PRÓPRIO CORPO, em raios dele.
 *
 * O DEFEITO QUE ISTO MATA (reprovado por ele em 31/08: *"quando aproximo
 * o corpo o objeto engole o texto"*): o texto era posto na posição de
 * MUNDO do corpo — o CENTRO dele, dentro do globo. Longe não se nota (o
 * corpo tem poucos pixels e a folga de 18 px joga o nome para fora do
 * disco); de perto o disco toma a tela, e o teste de profundidade some
 * com o nome inteiro. Medido na página viva antes do conserto
 * (`?atlas=1&foco=terra&ver=corpo&d=3&r3d=1`): o texto "TERRA" existia,
 * `visible: true`, a 6,2e-10 pc da câmera — 3,0 raios terrestres —
 * enquanto a superfície estava a 2,0 raios; `depthTest: [true, true]`
 * nos dois materiais do troika. Nenhuma foto mostrava o nome.
 *
 * POR QUE NÃO É `depthTest = false`: a oclusão pelos OUTROS corpos é
 * justamente o que o 3D compra sobre o canvas (o nome de uma lua que
 * passou para trás do pai tem de sumir). Adiantar o nome ao longo do
 * raio da câmera cura só a casca própria — e nem mexe na tela, porque
 * andar sobre a linha câmera→corpo não muda o ponto projetado; muda o Z.
 *
 * 1,05 e não 1,00 porque o texto é um plano tangente à esfera quando o
 * avanço é exato: 5% do raio tira o z-fighting do polo. As cascas que
 * NÃO escrevem profundidade (atmosfera e halo da Terra, anel dos
 * gigantes, o ponto da camada) nunca engoliram nada e seguem iguais.
 */
const AVANCO_EM_RAIOS = 1.05;

/**
 * A FOLGA ATÉ O PLANO NEAR, em nears — o único teto do avanço. Adiantar
 * o nome até a câmera o clipa: o piso da roda é 2 raios (`K_MIN_RAIOS`)
 * e ali o near vale meio raio (`nearPlanePc`), então o avanço cheio de
 * 1,05 raio ainda pousa a 0,95 raio da câmera, quase o dobro do near. O
 * teto só morde num corpo mais perto que o piso da roda — uma lua
 * raspada de passagem —, e ali ele prefere o nome ocluído ao nome
 * cortado pelo plano.
 */
const FOLGA_DO_NEAR = 1.2;

type TextoTroika = {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  outlineBlur: number;
  outlineOpacity: number;
  anchorX: string;
  anchorY: string;
  visible: boolean;
  renderOrder: number;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  quaternion: THREE.Quaternion;
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
  /** a direita da CÂMERA, reaproveitada — a folga do nome é medida na
   *  tela, e na tela "para o lado" é este eixo */
  private readonly direita = new THREE.Vector3();
  /** o rumo corpo→câmera, reaproveitado — sobre ele corre o avanço que
   *  tira o nome de dentro da casca (`AVANCO_EM_RAIOS`) */
  private readonly paraACamera = new THREE.Vector3();
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
   * regra das linhas de órbita). `raioDe` devolve o raio FÍSICO do corpo
   * na mesma unidade da posição (a fonte única da escada), ou null para
   * quem não tem — é ele que tira o nome de dentro da casca; sem raio o
   * nome fica no centro, como antes de 31/08 (ver `AVANCO_EM_RAIOS`).
   */
  sincronizar(
    ligado: boolean,
    cam: THREE.PerspectiveCamera,
    alvos: readonly RotuloComVaga[],
    posicaoDe: (key: string) => readonly [number, number, number] | null,
    raioDe: (key: string) => number | null
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
        t.outlineWidth = CONTORNO.largura;
        t.outlineBlur = CONTORNO.borrao;
        t.outlineOpacity = CONTORNO.opacidade;
        t.anchorY = 'middle';
        // depois da fita das órbitas (8) e da atmosfera da Terra (9):
        // o nome é legenda, e pinta por último entre os transparentes.
        //
        // A PROFUNDIDADE FICA COMO A DO TROIKA — o nome é objeto de cena e
        // as superfícies resolvidas escrevem depth (corpos.ts), então um
        // nome atrás de um globo continua escondido. É de propósito: a
        // oclusão pelos outros corpos é o que o 3D compra sobre o canvas.
        // A casca do PRÓPRIO corpo, que engolia o nome de perto, sai pela
        // geometria e não pelo material — ver `AVANCO_EM_RAIOS`.
        // (Havia aqui duas linhas `t.material.depthTest = false` que
        // NUNCA chegaram a material nenhum: com contorno ligado o
        // `material` do troika é um ARRAY [contorno, preenchimento], e a
        // escrita morria na própria lista — medido na página viva em
        // 30/08, `depthTest: [true, true]`. Saíram em 30/08, e o defeito
        // que elas tentavam matar só caiu em 31/08, com o avanço.)
        t.renderOrder = 10;
        this.escreverLado(t, alvo.key, alvo.name, esquerda);
        this.grupo.add(t as unknown as THREE.Object3D);
        this.textos.set(alvo.key, t);
      } else if (this.ladoDoTexto.get(alvo.key) !== esquerda) {
        this.escreverLado(t, alvo.key, alvo.name, esquerda);
      }
      t.visible = true;
      t.position.set(pos[0], pos[1], pos[2]);
      // O AVANÇO SOBRE A CASCA (item 109, 31/08) — sobre a linha
      // câmera→corpo, que é a única direção que não mexe no ponto
      // projetado: o nome fica onde estava na tela e passa à frente do
      // globo em profundidade. Ver `AVANCO_EM_RAIOS`.
      let d = t.position.distanceTo(cam.position);
      const raio = raioDe(alvo.key);
      if (raio !== null && raio > 0 && d > 0) {
        const avanco = Math.min(raio * AVANCO_EM_RAIOS, d - cam.near * FOLGA_DO_NEAR);
        if (avanco > 0) {
          this.paraACamera.subVectors(cam.position, t.position).divideScalar(d);
          t.position.addScaledVector(this.paraACamera, avanco);
          d -= avanco;
        }
      }
      // escala = fração da tela × altura visível naquela distância — e a
      // distância é a do texto ADIANTADO, senão o nome cresceria na tela
      // exatamente o quanto se aproximou
      const em = FRACAO_DA_TELA * d * tanMeioFov;
      t.scale.setScalar(em);
      t.quaternion.copy(cam.quaternion);
      // e a FOLGA da vaga (o `RECUO_DO_TEXTO` do 2D): para a direita da
      // tela quando o nome cresce para a direita, para a esquerda quando a
      // borda mandou virar. Em unidades de mundo é a folga em ems vezes o
      // tamanho do em àquela distância — folga constante na tela.
      this.direita.set(1, 0, 0).applyQuaternion(cam.quaternion);
      t.position.addScaledVector(this.direita, (esquerda ? -1 : 1) * RECUO_EM_EMS * em);
    }
    for (const [key, t] of this.textos) {
      if (!vivos.has(key)) t.visible = false;
    }
  }

  /**
   * PINTA NO LADO DA VAGA — a vaga é do 2D. Caixa reservada à ESQUERDA
   * da âncora ⇒ âncora do texto à direita. Sem isto o texto crescia
   * sempre para a direita: nos 28% direitos da tela o nome saía clipado
   * e podia cobrir um nome 2D vizinho.
   *
   * O VÃO NÃO MORA MAIS AQUI: era um espaço no próprio texto (~0,26 em),
   * e virou deslocamento na tela em `sincronizar` — a folga do 2D é 18 px
   * e um espaço não a alcança. Ver `RECUO_EM_EMS`.
   */
  private escreverLado(t: TextoTroika, key: string, name: string, esquerda: boolean) {
    t.text = name.toLocaleUpperCase('pt-BR');
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
