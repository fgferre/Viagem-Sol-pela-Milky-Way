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
 * A CHAVE da camada. (A irmã dela, `PLANETAS_DEFAULT_ON`, morreu no M4
 * da Lei com a porta `?plan` — regra iv do §4: a camada dos dez corpos
 * já é o padrão e não havia mais lado A para proteger. Esta fica
 * enquanto o palco ainda puder nascer vazio.) Nasce `true` porque a
 * camada vazia é neutra por
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

// ------------------------------------------------------------
// B1 — O BUMP POR DERIVADA DO ALBEDO (item 134/S2, colhido do projeto
// Saturn do dono: `moonMaterials.ts`, `bumpMap = map` com `bumpScale
// 0.02`, e a conta de gradiente de tela do `proceduralNormal` dele).
// ------------------------------------------------------------

/**
 * A ESCALA PADRÃO — 0,02 do RAIO do corpo, o número dele. É pequena de
 * propósito: a aproximação vale enquanto o relevo falso ficar abaixo do
 * que o olho cobra do limbo (que é assunto do B2, o mapa de altura).
 */
export const BUMP_DO_ALBEDO_PADRAO = 0.02;

/**
 * O INTERRUPTOR, um por corpo. Ausente = padrão; 0 = desligado.
 *
 * É APROXIMAÇÃO DECLARADA, e a lista de zeros é onde ela seria MENTIRA:
 * albedo só é altura em superfície de regolito craterizado. Onde a
 * mancha do mapa é de COR e não de forma, derivar relevo dela inventa
 * montanha onde há só tinta.
 *
 * A LUA NÃO ESTÁ NESTA TABELA E NÃO CONSOME MAIS ESTE CHUNK (item 140):
 * desde que ela ganhou mapa de normais MEDIDO (LDEM do LRO), `lua.ts`
 * usa `GLSL_NORMAL_DO_MAPA` e nunca chama `escalaDoBumpDoAlbedo` — a
 * aproximação daqui afundava os mares e levantava os raios claros de
 * Tycho, que foi o que o dono viu ("não corresponde mais ao que
 * observamos"). Quem tem a normal real não precisa da inventada.
 */
export const BUMP_DO_ALBEDO: Readonly<Record<string, number>> = {
  // A LEI DO DONO (02/09): "o relevo deve aparecer em tudo que tem relevo,
  // sem atmosfera" — um universo só, filme, voo e Atlas. Mercúrio, Marte,
  // Io e a Lua entram pelo padrão. Zero SÓ onde a mancha do mapa não é
  // chão: Vênus é topo de nuvem e Titã é o topo da bruma (dito em
  // rochoso.ts) — relevo tirado dali seria montanha de nuvem.
  venus: 0,
  titan: 0,
  // Ceres: a própria fonte admite mapa INVENTADO (ASSETS.md) — derivar
  // relevo de invenção seria inventar duas vezes.
  ceres: 0,
};

/** A escala do bump de um corpo: o interruptor, ou o padrão. */
export function escalaDoBumpDoAlbedo(id: string): number {
  return BUMP_DO_ALBEDO[id] ?? BUMP_DO_ALBEDO_PADRAO;
}

/**
 * A NORMAL PERTURBADA PELO GRADIENTE DO PRÓPRIO ALBEDO — ZERO BYTE novo.
 *
 * A conta é a de Mikkelsen para superfície NÃO parametrizada (a mesma do
 * `proceduralNormal` dele), e ela mede o gradiente por DERIVADA DE TELA:
 * o valor amostrado já vem do mip certo, então a intensidade acompanha a
 * distância sozinha — não há régua de "quantos texels por pixel" a
 * manter. `p` chega em RAIOS do corpo, então `escala` sai direto como
 * FRAÇÃO DO RAIO (0,02 = 2 % do raio de pico a pico).
 *
 * O LIMITADOR DE DERIVADA é dele e existe por um defeito medido lá: sem
 * ele, de longe (o mapa inteiro num punhado de pixels) o gradiente
 * dispara e a lua vira faísca. Corta em 0,35 e não em 0 porque zerar
 * apagaria o relevo de perto junto.
 *
 * `dFdx`/`dFdy` em ESSL1: o contexto é WebGL2 (`engine.ts`), e a
 * especificação do WebGL2 mantém `GL_OES_standard_derivatives` SEMPRE
 * habilitada nos shaders GLSL ES 1.00 — nenhum `#extension` é preciso.
 */
export const GLSL_BUMP_DO_ALBEDO = /* glsl */ `
uniform float uBumpAlbedo;  // fração do raio; 0 desliga o bloco inteiro
vec3 normalComBumpDoAlbedo(vec3 n, vec3 p, float h) {
  if (uBumpAlbedo <= 0.0) return n;
  vec3 sx = dFdx(p);
  vec3 sy = dFdy(p);
  float dhx = dFdx(h);
  float dhy = dFdy(h);
  float lim = clamp(1.0 / (10.0 * max(abs(dhx), abs(dhy)) + 1.0), 0.35, 1.0);
  vec3 r1 = cross(sy, n);
  vec3 r2 = cross(n, sx);
  float det = dot(sx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2) * (uBumpAlbedo * lim);
  return normalize(abs(det) * n - grad);
}
`;

/** A luminância que serve de altura — a mesma Rec.709 do grading dele. */
export const GLSL_ALTURA_DO_ALBEDO = /* glsl */ `
float alturaDoAlbedo(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

/**
 * A NORMAL DO MAPA, em espaço tangente sobre a esfera equiretangular.
 *
 * MORAVA EM `rochoso.ts` (S2 do item 134) e veio para cá no item 140,
 * quando a LUA passou a ter mapa de normais MEDIDO (LDEM do LRO) e
 * virou o segundo leitor do mesmo chunk — duas cópias do frame
 * tangente seriam a segunda fonte de verdade nascendo (AGENTS 4).
 *
 * O FRAME É ANALÍTICO e não vem de atributo: a parametrização da
 * `SphereGeometry` do three é conhecida, e dela sai `T = ŷ × n̂` (leste,
 * o sentido de +u) e `B = n̂ × T` (norte, o sentido de +v) — as duas
 * derivadas exatas da malha. Calcular tangentes por atributo custaria um
 * pré-passo de geometria para o mesmo resultado.
 *
 * NOS POLOS O FRAME DEGENERA (ŷ × n̂ → 0) e a função devolve a normal
 * geométrica: um pixel de polo sem relevo é menos errado que uma normal
 * dividida por zero.
 *
 * A APROXIMAÇÃO DECLARADA: nas luas triaxiais o `T` exato não é
 * exatamente `ŷ × n̂`; em Mimas (a/b = 1,05) o erro de direção fica
 * abaixo de 3°, e o que ele desloca é a SOMBRA dentro da cratera, não a
 * silhueta (essa vem do vértice).
 */
export const GLSL_NORMAL_DO_MAPA = /* glsl */ `
uniform sampler2D uMapaNormal;
uniform float uRelevoNormal;  // 0 desliga; a escala tangencial dele é 1,2
vec3 normalDoMapa(vec3 n, vec2 uv) {
  if (uRelevoNormal <= 0.0) return n;
  vec3 t = cross(vec3(0.0, 1.0, 0.0), n);
  float lt = length(t);
  if (lt < 1.0e-4) return n;
  t /= lt;
  vec3 b = cross(n, t);
  vec3 m = texture2D(uMapaNormal, uv).rgb * 2.0 - 1.0;
  return normalize(m.x * uRelevoNormal * t + m.y * uRelevoNormal * b + m.z * n);
}
`;

/**
 * O RUÍDO DE VALOR de 3 oitavas — a MESMA função que os dois shaders
 * procedurais de `rochoso.ts` já traziam digitada duas vezes. Virou chunk
 * na S2 do item 134 porque o grão do close (abaixo) seria a TERCEIRA
 * cópia. O texto expandido é o de lá, letra por letra.
 */
export const GLSL_RUIDO_DE_VALOR = /* glsl */ `
float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float ruido(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}
`;

/**
 * E — O GRÃO DO CLOSE (item 134/S2, a "manchinha de detalhe" dele).
 *
 * ONDE O MOSAICO ACABA a superfície vira borrão: colada na lua, um texel
 * do mapa cobre vários pixels e o que se vê é a interpolação bilinear,
 * não a lua. ±6 % de ruído fractal devolve GRÃO — não desenha cratera
 * nenhuma, só impede que a tela fique chapada onde a foto não tem mais o
 * que mostrar. É invenção declarada, e por isso mora sob um gate.
 *
 * O GATE É MEDIDO, não é distância: `dFdx(uv)·tamanho` é quantos TEXELS
 * o pixel atravessa. Acima de 1 texel/pixel (mosaico ainda resolvendo) o
 * termo é 1 EXATO e nada muda — de longe, e em toda vista oficial que
 * não seja close, este bloco não existe.
 */
export const GLSL_GRAO_DO_CLOSE = /* glsl */ `
uniform vec2 uTamanhoDoMapa;  // o mapa em texels; (0,0) desliga o grão
float graoDoClose(vec2 uv, vec3 p) {
  float texelsPorPixel = length(dFdx(uv) * uTamanhoDoMapa);
  // tamanho zero é "ainda não publicaram o mapa": sem ele a derivada
  // seria 0 e o gate abriria escancarado, que é o oposto do que ele é
  if (uTamanhoDoMapa.x <= 0.0 || texelsPorPixel >= 1.0) return 1.0;
  float dose = 1.0 - smoothstep(0.5, 1.0, texelsPorPixel);
  float f = 0.5 * ruido(p * 24.0) + 0.3 * ruido(p * 53.0) + 0.2 * ruido(p * 117.0);
  return 1.0 + dose * 0.06 * (2.0 * f - 1.0);
}
`;
