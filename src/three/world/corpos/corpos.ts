// ============================================================
// O PALCO LOCAL (Onda 6, F0 — decisão D1): o grupo dos corpos
// resolvidos e o contrato de superfície que o near do engine consome.
//
// O QUE EXISTE NESTA FASE é o esqueleto, de propósito: um grupo VAZIO
// na cena, o registro de corpos resolvidos (id, raio, posição) e o
// getter da superfície mais próxima que o Director entrega ao
// `updateClip`. Nenhum mesh nasce aqui ainda — com o registro vazio o
// getter devolve NaN e o par (near, far) é BIT-IDÊNTICO ao vigente
// (pino de neutralidade em `engine.test.ts`). São as fases F2+ que
// registram Terra, Lua e os demais; o contrato delas já está escrito.
//
// ------------------------------------------------------------
// A DECISÃO DE DEPTH, por escrito (D1, emendas T-E3/T-E4)
// ------------------------------------------------------------
// Os meshes deste grupo serão OPACOS, `depthWrite:true` +
// `depthTest:true` entre si — e a composição com o resto da cena NÃO
// passa por renderOrder: o three desenha a lista OPACA inteira ANTES
// da lista transparente POR CONSTRUÇÃO (o WebGLRenderer separa as duas
// listas; renderOrder só ordena DENTRO de cada uma). O grupo desenha
// primeiro e escreve o único depth da casa; quem decide o que ele
// oclui é o `depthTest` de cada camada aditiva, camada a camada — o
// inventário da Onda 6: campo, poeira, cascas, nuvens CO, billboards e
// a camada `planetas` testam (ponto atrás de corpo resolvido some);
// SunStar, coronas e nebulosa ficam `false` com o porquê escrito nelas.
//
// SOL-ATOR × CORPO RESOLVIDO — sobreposição impossível POR CONSTRUÇÃO,
// e a conta está pinada em `corpos.test.ts`:
//  - abaixo de 0,02 pc o disco artístico do Sol está DISSOLVIDO
//    (`deepDiscFade` = 0 exato; o grupo some pelo corte duro
//    `isDiscGroupVisible`, lodStellar.ts) — não existe o que sobrepor;
//  - entre 0,02 e 0,05 pc o disco existe, mas TODO corpo resolvido é
//    sub-pixel: o corpo mais largo (Júpiter) só chegaria aos ≈ 0,2 px
//    do desenho da onda com a câmera a 4,125 UA DELE — e nessa faixa a
//    câmera está a ≥ 4.125 UA do SOL (0,02 pc), mil vezes mais longe,
//    onde Júpiter subtende ~2e-4 px. Corpo que não acende pixel não
//    conflita com disco nenhum.
//
// Sem three além de Group/Vector3, sem shader, sem relógio: o palco
// não sabe que horas são (o jd é do Director) e não conhece efeméride.
// ============================================================
import * as THREE from 'three';

/**
 * A CHAVE da camada, no precedente exato de `PLANETAS_DEFAULT_ON`
 * (planetas.ts): nasce `true` porque a camada vazia é neutra por
 * construção, e as portas `?corpos`/`?nocorpos` são o par de A/B com o
 * mesmo binário dos dois lados (`?nocorpos=1` é o caminho de VOLTA à
 * baseline; `?corpos=1` liga mesmo se esta constante voltar a `false`).
 * Padrão `?dom/?nodom` da Onda 3; o Director lê as duas no tick.
 */
export const CORPOS_DEFAULT_ON = true;

/** Um corpo resolvido registrado no palco: o que o near precisa saber. */
export interface CorpoResolvido {
  /** id da casa (`corpos.json`/retrato) — 'earth', 'moon', 'phobos'… */
  readonly id: string;
  /** raio físico em pc (da fonte única BODY_AXES, nunca literal novo) */
  readonly raioPc: number;
  /** posição de CENA em pc (heliocêntrica equatorial, Sol na origem) */
  readonly posicaoPc: THREE.Vector3;
}

/**
 * O que o `updateClip` consome. NaN nos dois campos = "não há corpo
 * resolvido em quadro", e o near fica no vigente bit a bit — NaN
 * reprova toda comparação, então nenhum `if` extra é preciso do lado
 * de lá.
 */
export interface SuperficieProxima {
  /** distância da câmera à superfície mais próxima, em pc (negativa
   *  com a câmera DENTRO do corpo — o piso do raio segura esse caso) */
  dSuperficiePc: number;
  /** raio do corpo dono dessa superfície, em pc — dele deriva o piso */
  raioPc: number;
}

/** a forma INTERNA do registro — mutável para o `registrar` atualizar
 *  sem realocar; para fora só sai o contrato readonly `CorpoResolvido`. */
interface CorpoVivo {
  id: string;
  raioPc: number;
  posicaoPc: THREE.Vector3;
}

export class CorposResolvidos {
  /**
   * O grupo dos meshes opacos. Vazio nesta fase; entra na cena como
   * irmão do `sun.group` e do `planetas.points` — nunca filho de
   * nenhum dos dois (a lição da escala 0,005 herdada vale aqui também).
   */
  readonly group = new THREE.Group();

  private readonly corpos = new Map<string, CorpoVivo>();
  /** saída REUSADA do getter — zero alocação por quadro (M4). */
  private readonly proxima: SuperficieProxima = {
    dSuperficiePc: Number.NaN,
    raioPc: Number.NaN,
  };
  private _ligado = false;

  constructor() {
    // o Group do three nasce `visible: true`; o palco nasce como a
    // porta manda — desligado até o Director escrever `ligado`
    this.group.visible = false;
  }

  /**
   * A porta do quadro, no molde de `Planetas.ligado`: o Director a
   * escreve ANTES de consumir o getter, a cada tick. Desligada
   * (`?nocorpos`), os corpos saem do QUADRO — grupo invisível E
   * superfície fora do `min()` do near, porque superfície que não está
   * em quadro não pode governar plano de corte. É isso que faz o A/B
   * da porta devolver a baseline bit a bit.
   */
  get ligado(): boolean {
    return this._ligado;
  }

  set ligado(v: boolean) {
    this._ligado = v;
    this.group.visible = v;
  }

  /**
   * Registra (ou atualiza — mesmo id sobrescreve) um corpo resolvido.
   * A posição é COPIADA: o dono do mesh reescreve via novo `registrar`
   * quando a efeméride mover o corpo, e ninguém guarda referência viva
   * para divergir em silêncio. Raio envenenado é defeito de chamador,
   * não dado de visitante — recusa alta e clara.
   */
  registrar(id: string, raioPc: number, posicaoPc: THREE.Vector3): void {
    if (!(Number.isFinite(raioPc) && raioPc > 0)) {
      throw new Error(`corpo '${id}' com raio inválido: ${raioPc} pc`);
    }
    if (!(Number.isFinite(posicaoPc.x) && Number.isFinite(posicaoPc.y) && Number.isFinite(posicaoPc.z))) {
      throw new Error(`corpo '${id}' com posição inválida`);
    }
    const vivo = this.corpos.get(id);
    if (vivo) {
      vivo.posicaoPc.copy(posicaoPc);
      vivo.raioPc = raioPc;
      return;
    }
    this.corpos.set(id, { id, raioPc, posicaoPc: posicaoPc.clone() });
  }

  remover(id: string): void {
    this.corpos.delete(id);
  }

  /** quantos corpos o palco conhece (o oráculo dos testes). */
  get tamanho(): number {
    return this.corpos.size;
  }

  /**
   * A SUPERFÍCIE RESOLVIDA MAIS PRÓXIMA da câmera — de TODOS os corpos
   * em quadro, não só o "em foco" (emenda T-E13: Terra E Lua
   * simultâneas). Sem corpo em quadro (registro vazio, ou camada
   * desligada) devolve NaN/NaN, e o near fica no vigente.
   */
  superficieMaisProxima(camPosPc: THREE.Vector3): Readonly<SuperficieProxima> {
    const p = this.proxima;
    p.dSuperficiePc = Number.NaN;
    p.raioPc = Number.NaN;
    if (!this._ligado || this.corpos.size === 0) return p;
    for (const c of this.corpos.values()) {
      const d = camPosPc.distanceTo(c.posicaoPc) - c.raioPc;
      // `!(d >= atual)` e não `d < atual`: o primeiro corpo entra com o
      // acumulador ainda NaN, que reprova qualquer comparação
      if (!(d >= p.dSuperficiePc)) {
        p.dSuperficiePc = d;
        p.raioPc = c.raioPc;
      }
    }
    return p;
  }

  dispose(): void {
    // nesta fase não há geometria nem material para descartar; o
    // registro esvazia para o getter voltar a NaN em qualquer reuso
    this.corpos.clear();
    this.group.clear();
  }
}

/**
 * O DIÂMETRO APARENTE de um corpo na tela, em pixels — a régua da conta
 * de sub-pixel pinada em `corpos.test.ts` (e a mesma que a dominância
 * de F2b vai consultar). Ângulo EXATO (`2·atan(r/d)`), não a aproximação
 * de ângulo pequeno: a régua vale também com a câmera colada no corpo.
 * `screenH / (2·tan(fov/2))` são os pixels por radiano da câmera da
 * casa (fov VERTICAL, como o three define).
 */
export function diametroAparentePx(
  raioPc: number,
  dPc: number,
  screenHPx: number,
  fovDeg: number
): number {
  const meiaFovRad = THREE.MathUtils.degToRad(fovDeg) / 2;
  return (2 * Math.atan(raioPc / dPc) * screenHPx) / (2 * Math.tan(meiaFovRad));
}

/**
 * O LIMIAR DO GATE, em pixels de diâmetro aparente (`diametroAparentePx`,
 * a régua única do palco, logo acima). 4 px: abaixo disso um globo
 * texturizado não comunica nada que o ponto fotométrico já não comunique —
 * e o ponto tem a fotometria certa.
 *
 * MUDOU DE ENDEREÇO NA F2 DA ONDA DO SOL REAL, e a mudança é de doutrina,
 * não de arrumação: enquanto o único consumidor era a Terra, a lei podia
 * morar com ela; a partir do momento em que o SOL entra na mesma lei
 * (`director.ts`, o gate do disco), ela deixou de ser "a régua da Terra" e
 * passou a ser A RÉGUA DO PALCO — quem decide, para QUALQUER corpo de raio
 * físico, se ele é representável como corpo ou só como ponto. Fica ao lado
 * de `diametroAparentePx`, que é a outra metade da mesma conta, num módulo
 * que não sabe o que é uma textura. `terra.ts` e `lua.ts` continuam
 * reexportando os dois nomes: nada que já importava deles precisou mudar,
 * e é a Onda 7 (corpo por estrela) quem colhe a portabilidade.
 */
export const LIMIAR_DO_GATE_PX = 4;
/** Cushion 2× da histerese (contrato da Onda 3): sai abaixo de
 *  LIMIAR/CUSHION = 2 px — entrar e sair nunca disputam o mesmo pixel. */
export const CUSHION_DO_GATE = 2;

/**
 * O GATE BINÁRIO com histerese, na forma do contrato do doador
 * (`shouldDiscBeActive`, `lodStellar.ts`): entra com `>= LIMIAR`, só sai
 * abaixo de `LIMIAR/CUSHION`, e diâmetro envenenado PRESERVA o estado
 * (nunca flipa por NaN). É a mesma máquina de `stellarMeshGate` — as
 * desigualdades assimétricas existem para a câmera tremendo na fronteira
 * não ligar/desligar o corpo quadro a quadro.
 */
export function gateBinario(armado: boolean, diametroPx: number): boolean {
  if (!Number.isFinite(diametroPx)) return armado;
  if (armado) return !(diametroPx < LIMIAR_DO_GATE_PX / CUSHION_DO_GATE);
  return diametroPx >= LIMIAR_DO_GATE_PX;
}
