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
  // sem atmosfera" — um universo só, filme, voo e Atlas. Zero SÓ onde a
  // mancha do mapa não é chão: Vênus é topo de
  // nuvem e Titã é o topo da bruma (dito em rochoso.ts) — relevo tirado
  // dali seria montanha de nuvem.
  venus: 0,
  titan: 0,
  // ITEM 141: Mercúrio, Marte, Ceres e Vesta têm agora a NORMAL MEDIDA
  // do DEM público (`NORMAL_MEDIDA`, rochoso.ts), e o fragmento nem
  // chega a este bump quando `uRelevoNormal > 0`. O zero é a declaração
  // de que a aproximação foi APOSENTADA neles, e não que ela ficou de
  // reserva: em Marte ela dizia 2 % do raio, 68 km de relevo falso onde
  // o Olympus, o mais alto do Sistema Solar, tem 22 km.
  mercury: 0,
  mars: 0,
  // Ceres já era zero por outro motivo — a própria fonte admite mapa
  // INVENTADO (ASSETS.md), e derivar relevo de invenção seria inventar
  // duas vezes. Agora ele também tem a normal medida da Dawn, e o mapa
  // de cor segue inventado por baixo dela.
  ceres: 0,
  // Vesta entra no zero AGORA (item 141, segunda fase): o mosaico dela é
  // real (Dawn), mas o que o bump lia como cratera era em boa parte a
  // mancha de composição da crosta — o howardito claro contra o
  // diogenito escuro de Rheasilvia — e não buraco. Com o DTM HAMO de 93
  // m medido, a forma vem do dado.
  vesta: 0,
  // Plutão e Caronte (01/10/2026): têm a NORMAL MEDIDA da New Horizons
  // (`NORMAL_MEDIDA`, rochoso.ts), e o zero declara a aproximação
  // aposentada neles também. Onde o DEM não alcança o chão é liso de
  // propósito: o albedo não empresta relevo ao lado sem medida.
  pluto: 0,
  charon: 0,
  // ITEM 141 (decisão dele, 03/09, "pode zerar Europa e Io"): nas duas a
  // mancha do mapa é COR, não forma — as linhas de Europa são gelo tingido
  // sobre uma casca lisa, e Io é enxofre de todas as cores sobre planícies
  // de lava. Derivar relevo daí levantava cristas onde há só tinta.
  europa: 0,
  io: 0,
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
 * O FRAME TANGENTE (leste, norte) da esfera equiretangular — o de
 * `GLSL_NORMAL_DO_MAPA` logo abaixo (a razão do frame está lá), em chunk
 * à parte desde a sombra das montanhas da Terra (07/10): a Terra declara
 * o próprio `uMapaNormal` e não pode incluir o chunk da normal inteiro,
 * mas o horizonte dela tem de ler ESTE frame. O texto montado da normal
 * do mapa é o mesmo de antes, byte a byte.
 */
export const GLSL_QUADRO_TANGENTE = /* glsl */ `// o frame tangente UM SÓ: a normal do mapa e o horizonte leem o mesmo
// (false no polo, onde ŷ × n̂ degenera — quem chama devolve o neutro)
bool quadroTangente(vec3 n, out vec3 t, out vec3 b) {
  t = cross(vec3(0.0, 1.0, 0.0), n);
  float lt = length(t);
  if (lt < 1.0e-4) {
    b = vec3(0.0);
    return false;
  }
  t /= lt;
  b = cross(n, t);
  return true;
}`;

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
${GLSL_QUADRO_TANGENTE}
vec3 normalDoMapa(vec3 n, vec2 uv) {
  if (uRelevoNormal <= 0.0) return n;
  vec3 t;
  vec3 b;
  if (!quadroTangente(n, t, b)) return n;
  vec3 m = texture2D(uMapaNormal, uv).rgb * 2.0 - 1.0;
  return normalize(m.x * uRelevoNormal * t + m.y * uRelevoNormal * b + m.z * n);
}
`;

/**
 * A SOMBRA DO HORIZONTE (PLAN-HIPERION, contrato do mapa de horizonte):
 * o relevo que TAPA o Sol dentro dos poços, lido de dois mapas assados
 * no pipeline. Cada texel guarda sen(elevação do horizonte) em seis
 * azimutes — `uMapaHorizonte` 0°/120°/240° (rgb), `uMapaHorizonte2`
 * 60°/180°/300° (rgb) —, medidos no MESMO frame de `normalDoMapa`
 * (`quadroTangente`, que este chunk exige incluído antes), de `t` para
 * `b`, sobre a normal RADIAL.
 *
 * A INTERPOLAÇÃO É UM CHAPÉU: o peso de cada azimute k é
 * max(1 − distância circular entre s e k, 0), com s = az/(π/3). Entre
 * dois vizinhos isso é a reta entre eles, a volta dos 360° sai do `mod`
 * e nenhum array é indexado por variável (GLSL ES 1.00). A leitura mora
 * em `senoDoHorizonte` (o seno no rumo do Sol), que a sombra parcial da
 * Terra (`GLSL_SOMBRA_PARCIAL_DO_RELEVO`) também usa.
 *
 * SEM ALFA: o Safari do iPhone pré-multiplica o alfa na decodificação e
 * destrói o RGB onde o alfa é 0 — por isso três azimutes por mapa, e o
 * `.a` nunca é lido.
 *
 * O PORTÃO: `uHorizonte` 0 devolve 1.0 exato nas duas funções — os
 * corpos sem mapa multiplicam por 1 e a imagem é a de hoje, bit a bit.
 * Sol no zênite (projeção tangente nula) usa az = 0 em vez de `atan(0,0)`,
 * que o GLSL deixa indefinido (NaN + bloom = tela branca).
 *
 * A SOMBRA SÓ DO RELEVO (`sombraSoDoRelevo`, a das montanhas da Terra,
 * 07/10): o mapa guarda o horizonte ≥ 0 — o chão plano tem horizonte 0 —,
 * então `sombraDoHorizonte` também apaga o chão PLANO com o Sol abaixo do
 * horizonte geométrico. Em `assistida` esse chão é aceso pela logística
 * do terminador (`terminadorSuave`), que passa ~1,8° além dele: o teste
 * cru cortaria essa faixa e riscaria uma linha no terminador. A sombra
 * só do relevo é o que o relevo tapa ALÉM do que o plano já tapa:
 * 1 − max(vis(0) − vis(H), 0). Com o Sol acima de H as duas valem 1;
 * entre o plano e H é a sombra inteira (as compridas do fim de tarde
 * ficam); com o Sol abaixo do horizonte geométrico o plano já tapa tudo
 * e o relevo não acrescenta nada — a faixa do terminador fica com a luz
 * de hoje. Chão plano, polo ou portão fechado devolvem 1 exato.
 *
 * O RELEVO REALÇADO (só a Terra, item 232): quem define
 * `REALCE_DO_RELEVO` (e declara `uniform float uRealceDoRelevo`) tem os
 * senos lidos em `senoDoHorizonte` com a tangente multiplicada pelo
 * fator — as alturas ×k. Hipérion e Pã não definem, e o preprocessador
 * tira o trecho: o shader deles é o de antes.
 */
export const GLSL_SOMBRA_DO_HORIZONTE = /* glsl */ `
uniform sampler2D uMapaHorizonte;
uniform sampler2D uMapaHorizonte2;
uniform float uHorizonte;  // 0 desliga; 1 nos corpos com horizonte: true
float solAcimaDe(float senH, float senElev) {
  return smoothstep(senH - 0.03, senH + 0.03, senElev);
}
float senoDoHorizonte(vec3 t, vec3 b, vec2 uv, vec3 L) {
  float lx = dot(L, t);
  float ly = dot(L, b);
  float az = abs(lx) + abs(ly) > 1.0e-6 ? atan(ly, lx) : 0.0;
  float s = az / 1.0471975511965976;
  vec3 h1 = texture2D(uMapaHorizonte, uv).rgb;
  vec3 h2 = texture2D(uMapaHorizonte2, uv).rgb;
#ifdef REALCE_DO_RELEVO
  // o relevo realçado da Terra (item 232, declarado): alturas ×k →
  // tan(h) ×k em cada azimute, antes da interpolação
  if (uRealceDoRelevo != 1.0) {
    vec3 t1 = h1 * inversesqrt(max(1.0 - h1 * h1, 1.0e-6));
    vec3 t2 = h2 * inversesqrt(max(1.0 - h2 * h2, 1.0e-6));
    h1 = uRealceDoRelevo * t1 * inversesqrt(1.0 + uRealceDoRelevo * uRealceDoRelevo * t1 * t1);
    h2 = uRealceDoRelevo * t2 * inversesqrt(1.0 + uRealceDoRelevo * uRealceDoRelevo * t2 * t2);
  }
#endif
  vec3 w1 = max(1.0 - abs(mod(s - vec3(0.0, 2.0, 4.0) + 3.0, 6.0) - 3.0), 0.0);
  vec3 w2 = max(1.0 - abs(mod(s - vec3(1.0, 3.0, 5.0) + 3.0, 6.0) - 3.0), 0.0);
  return dot(w1, h1) + dot(w2, h2);
}
float sombraDoHorizonte(vec3 nGeo, vec2 uv, vec3 L) {
  if (uHorizonte <= 0.0) return 1.0;
  vec3 t;
  vec3 b;
  if (!quadroTangente(nGeo, t, b)) return 1.0;
  float senElev = dot(L, nGeo);
  return solAcimaDe(senoDoHorizonte(t, b, uv, L), senElev);
}
float sombraSoDoRelevo(vec3 nGeo, vec2 uv, vec3 L) {
  return 1.0 - max(solAcimaDe(0.0, dot(L, nGeo)) - sombraDoHorizonte(nGeo, uv, L), 0.0);
}
float visibilidadeDoCeu(vec2 uv) {
  if (uHorizonte <= 0.0) return 1.0;
  vec3 h1 = texture2D(uMapaHorizonte, uv).rgb;
  vec3 h2 = texture2D(uMapaHorizonte2, uv).rgb;
  return 1.0 - (dot(h1, h1) + dot(h2, h2)) / 6.0;
}
`;

/**
 * A SOMBRA PARCIAL DO RELEVO (só a Terra, item 232, 08/10) — no lugar do
 * degrau de `sombraSoDoRelevo`, a FRAÇÃO da célula que o relevo põe na
 * sombra. O texel de horizonte da Terra (4096, ~9,8 km) guarda a MÉDIA do
 * seno do horizonte das amostras de ~1,85 km do ETOPO dentro dele
 * (`relevo-terra.mjs`); dentro da célula esse seno se espalha, e o degrau
 * no seno médio apagava a célula inteira de uma vez.
 *
 * A LEI: o seno do horizonte de uma amostra da célula é uma gama de forma
 * 2 com a média μ do texel — σ/μ = 1/√2, e o medido no horizonte fino do
 * ETOPO é 0,64–0,70 de μ = 0,5° a 8°; contra a fração acesa medida na
 * montanha, erra 0,055 em média, contra 0,082 do degrau e 0,060 da normal
 * (`capturas/efeitos-timidos/relevo/lei-do-espalhamento-v2.md`, 704.812
 * células de terra × 6 azimutes). A fração com o horizonte acima de t é
 * P(t) = e^(−2t/μ)·(1 + 2t/μ), e a sombra é essa fração vista pela MESMA
 * rampa de meia-largura 0,03 de `solAcimaDe`:
 *
 *     [D(s + 0,03) − D(s − 0,03)] / 0,06,
 *     D(T) = ∫₀^T P(t) dt = (μ/2)·(2 − e^(−x)·(2 + x)),  x = 2T/μ, T ≥ 0.
 *
 * É sombra SÓ do relevo, como a de `sombraSoDoRelevo`: com o Sol abaixo da
 * rampa o plano já tapa tudo e ela é 0 (a faixa do terminador fica com a
 * luz de hoje). Chão plano (μ no piso de 1e−5): no máximo 1,7e−4 dentro da
 * rampa e 0 fora dela; o exp de argumento grande dá 0, nunca NaN. Portão
 * fechado ou polo: 1 exato. Quem inclui traz `GLSL_SOMBRA_DO_HORIZONTE`
 * antes (o quadro, o portão e `senoDoHorizonte`); Hipérion e Pã seguem
 * com o degrau.
 */
export const GLSL_SOMBRA_PARCIAL_DO_RELEVO = /* glsl */ `
float sombraParcialDoRelevo(vec3 nGeo, vec2 uv, vec3 L) {
  if (uHorizonte <= 0.0) return 1.0;
  vec3 t;
  vec3 b;
  if (!quadroTangente(nGeo, t, b)) return 1.0;
  float senElev = dot(L, nGeo);
  float mu = max(senoDoHorizonte(t, b, uv, L), 1.0e-5);
  float xa = 2.0 * max(senElev + 0.03, 0.0) / mu;
  float xb = 2.0 * max(senElev - 0.03, 0.0) / mu;
  float tapada = 0.5 * mu * (exp(-xb) * (2.0 + xb) - exp(-xa) * (2.0 + xa)) / 0.06;
  return 1.0 - clamp(tapada, 0.0, 1.0);
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
