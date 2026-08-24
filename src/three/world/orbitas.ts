// ============================================================
// AS LINHAS DE ÓRBITA (item 77) — a camada `noorbitas`.
//
// A ÓRBITA É O DADO, NÃO ENFEITE. Sem elas o Atlas mostra dez pontos
// soltos e o visitante não tem como ler que Marte está entre a Terra e
// Júpiter; NASA Eyes, Celestia e SpaceEngine desenham as três. É a
// mesma família do MARCADOR do Sol e dos RÓTULOS: instrumento de
// leitura, não matéria — e por isso a linha não passa pela lei da luz
// (não é fóton de lugar nenhum), tem chave própria na tabela única e se
// declara no selo pela derivação de sempre.
//
// ------------------------------------------------------------
// 1. DE ONDE SAI A CURVA — e por que NÃO é "amostrar um período"
// ------------------------------------------------------------
// O contrato do item 77 pedia `posicaoHeliocentrica(id, jd + k·T/N)` ao
// longo de UM período. ESSE CAMINHO NÃO EXISTE, e a razão é a janela da
// tabela embarcada: `MotorEfemerides` cobre 1950–2050 e LANÇA fora dela
// (adaptação b de `efemerides.ts`, de propósito). Da época do retrato
// (2026) um período inteiro cai fora da janela em QUATRO dos nove
// planetas — Saturno (29,5 anos → 2055), Urano (84), Netuno (165) e
// Plutão (248). Amostrar para trás não salva: Urano em 1942 já está
// fora. Metade do sistema solar ficaria sem linha, para sempre.
//
// O QUE ESTA CAMADA FAZ EM VEZ DISSO: lê o ESTADO VIVO do corpo no
// instante vivo — posição E velocidade, as duas do mesmo motor, no
// mesmo `jd` — e desenha a CÔNICA OSCULADORA que esse estado define. É
// o que "linha de órbita" significa nos três programas de referência: a
// elipse que o corpo percorreria a partir de agora sob dois corpos.
//
// E ELA CUMPRE O QUE O CONTRATO QUERIA GARANTIR, mais forte do que a
// amostragem cumpriria: o vértice 0 do laço é, por construção
// algébrica, a posição VIVA do corpo (a anomalia excêntrica do vértice
// 0 é a do próprio estado lido). Linha e ponto não divergem no primeiro
// salto de data porque não podem divergir em data nenhuma — não é
// tolerância, é identidade. O retrato congelado não entra aqui em
// nenhum caminho: sem efeméride viva esta camada não desenha NADA (§6).
//
// ------------------------------------------------------------
// 2. A CÔNICA, em vetores — sem resolver Kepler
// ------------------------------------------------------------
// Com `r` (UA) e `v` (UA/dia) parent-centered e `μ` do centro:
//     a  = 1 / (2/|r| − |v|²/μ)                        (vis-viva)
//     e⃗ = (v⃗ × h⃗)/μ − r̂,  h⃗ = r⃗ × v⃗                  (Laplace-Runge-Lenz)
//     P̂ = ê (para o periastro),  Q̂ = ĥ × P̂
//     r⃗(E) = a(cos E − e)·P̂ + a√(1−e²)·sin E·Q̂
// Amostrar E uniformemente (e não a anomalia verdadeira) é o que
// concentra vértice onde a curva dobra — no periastro —, que é onde
// 256 segmentos precisam estar. E a fase de partida é a do corpo:
//     cos E₀ = (r⃗·P̂)/a + e ,  sin E₀ = (r⃗·Q̂)/(a√(1−e²))
// com E = E₀ + k·2π/N. O vértice 0 volta a ser `r⃗`, exatamente.
//
// NÃO SE RESOLVE A EQUAÇÃO DE KEPLER aqui, e é por isso que não há
// segunda cópia de `elementosParaCartesiano` (`lib/atlas/kepler.ts`):
// aquela função vai de ELEMENTOS + anomalia MÉDIA a cartesiano, e o
// caminho médio→excêntrico é justamente o iterativo que esta camada não
// precisa percorrer. Aqui a curva é varrida em E, que é o parâmetro
// natural da elipse. As duas escrevem a mesma cônica; o teste
// (`orbitas.test.ts`) cobra que o laço passe pelo ponto do motor.
//
// ------------------------------------------------------------
// 3. O μ, e a checagem independente
// ------------------------------------------------------------
// `μ = G(M_centro + M_corpo)` sai de `GM_CORPOS` (`lib/atlas/massas.ts`,
// os `BODY<n>_GM` do kernel gm_de440), convertido de km³/s² para
// UA³/dia². É a MESMA tabela que a ficha do objeto usa para massa e
// gravidade — não nasce um segundo cadastro de massa aqui.
//
// A conferência independente está pinada em teste: o μ do Sol assim
// derivado bate com `MU_SUN_AU3_PER_DAY2` (= k², a constante gaussiana
// de 1976, de procedência inteiramente outra) e os μ dos seis pais
// batem com `MU_PARENT` dentro de 1e-3 — a diferença que resta é a
// massa das luas que o `MU_PARENT` inclui no valor de SISTEMA e o
// `BODY<n>_GM` do planeta não. 1e-3 em μ é 3e-4 no semieixo: nada que
// chegue a um pixel.
//
// ------------------------------------------------------------
// 4. LUA GIRA NO PAI, não no Sol
// ------------------------------------------------------------
// O laço é sempre PARENT-CENTERED (`posicao`, não
// `posicaoHeliocentrica`) e o objeto do three é POSICIONADO no centro
// vivo. Para os heliocêntricos o centro é a origem da cena e os dois
// caminhos são o mesmo; para as 21 luas a diferença é tudo: a posição
// heliocêntrica da Lua ao longo de um mês desenha um festão em volta do
// SOL — a Terra anda 27° no mesmo tempo —, e não a elipse em volta da
// Terra que o visitante veio ler.
//
// ------------------------------------------------------------
// 5. O DESENHO — e quem manda a linha sumir
// ------------------------------------------------------------
// `LineLoop` aditivo, 1 px, sem escrever profundidade e TESTANDO
// profundidade (linha atrás de globo resolvido some, como deve).
//
// A COR É O DADO, O BRILHO É O INSTRUMENTO. O matiz sai da fotometria
// da casa (`FOTOMETRIA[id].corLinear`, o RGB linear de albedo por
// banda) NORMALIZADO no canal mais forte: assim a órbita de Marte é
// ferrugem e a de Netuno é azul, mas nenhuma delas fica mais fraca que
// a outra por ter albedo menor — brilho de linha é escolha de
// instrumento, e uma só. Lua herda o matiz do pai; anão e asteroide,
// que não têm linha na fotometria, ficam no cinza frio da casa.
//
// O FADE É POR TAMANHO ANGULAR, nas duas pontas, e cada ponta responde
// a uma pergunta diferente:
//   - EMBAIXO: abaixo de uns poucos pixels a elipse é um rabisco em
//     cima do próprio ponto do corpo — pior que nada, porque suja a
//     fotometria que a camada dos planetas mede.
//   - EM CIMA: quando a órbita não CABE no quadro ela deixa de ser uma
//     órbita e vira um risco atravessando o céu. É o caso de toda vista
//     de dentro do sistema (a câmera na Terra tem a órbita da Terra
//     passando por trás dela) e é o que mantém as vistas de corpo
//     limpas.
// As luas ainda pedem o PAI ENQUADRADO: fora do quadro o pai não dá
// referência nenhuma, e a elipse solta seria um anel sem dono.
//
// ------------------------------------------------------------
// 6. SEM EFEMÉRIDE, SEM LINHA — a decisão escrita
// ------------------------------------------------------------
// A efeméride é preguiçosa (`maquinaDoTempo.garantirEfemerides`) e o
// filme só a paga na coda. Esta camada NÃO abre uma segunda porta de
// download: enquanto o motor não chegar, ela não tem estado vivo para
// ler e fica vazia. Desenhar a partir do retrato congelado seria
// exatamente o defeito que o contrato do item 77 proíbe pelo nome —
// linha de 2026 sob ponto de 2035 — e desenhar a partir de uma tabela
// de elementos própria seria a segunda fonte de verdade da órbita.
// O Atlas já acende a efeméride ao entrar (`palcoQuente`), que é onde
// as linhas têm de estar.
// ============================================================
import * as THREE from 'three';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';
import { GM_CORPOS } from '../../lib/atlas/massas';
import { CORPOS_DO_SISTEMA, HELIO_SEM_PONTO, LUAS_DO_SISTEMA } from '../atlasConfig';
import { FOTOMETRIA } from './planetas/fotometria';

/** segundos num dia — o fator da conversão de μ, escrito uma vez */
const SEGUNDOS_POR_DIA = 86_400;

/**
 * μ de km³/s² para UA³/dia², a unidade em que a efeméride fala. O
 * conversor de distância é o `AU_KM` único da casa (o mesmo de
 * `escala.kmParaPc`), nunca um segundo 149.597.870,7.
 */
export function muEmUaDia(gmKm3PorS2: number): number {
  return (gmKm3PorS2 * SEGUNDOS_POR_DIA * SEGUNDOS_POR_DIA) / (AU_KM * AU_KM * AU_KM);
}

/**
 * O μ de dois corpos do problema relativo: o centro MAIS o corpo que
 * gira nele. Para um planeta em torno do Sol a segunda parcela é ruído
 * (1e-6 em Júpiter); para a Lua em torno da Terra ela vale 1,2% de μ, e
 * ignorá-la deixaria a elipse 0,4% grande. Corpo sem GM no kernel
 * (Éris, Makemake, os asteroides) entra com zero — todos são
 * heliocêntricos, onde a própria massa é irrelevante.
 */
export function muDoPar(centro: string, corpo: string): number | null {
  const gmCentro = GM_CORPOS[centro];
  if (gmCentro === undefined) return null;
  return muEmUaDia(gmCentro + (GM_CORPOS[corpo] ?? 0));
}

/** Quantos vértices tem um laço. 256 é o número do contrato do item 77. */
export const PONTOS_POR_ORBITA = 256;

/**
 * O piso e o topo do fade DE BAIXO, em pixels de raio na tela. Abaixo
 * do piso a elipse não é curva, é sujeira sobre o ponto do corpo.
 */
export const RAIO_MIN_PX = 3;
export const RAIO_CHEIO_PX = 16;

/**
 * O fade DE CIMA, em frações da MEIA-ALTURA do quadro: em 1,0 a órbita
 * encosta nas duas bordas, e a partir daí ela deixa de caber. Some de
 * vez em 2,6, que é onde nem o eixo maior estaria no campo.
 */
export const CABE_NO_QUADRO = 1.0;
export const FORA_DO_QUADRO = 2.6;

/**
 * A margem do teste "pai enquadrado", em NDC. 1,0 é a borda exata do
 * quadro; a folga de 25% evita que a linha da lua pisque quando o pai
 * encosta na moldura.
 */
export const MARGEM_DO_PAI_NDC = 1.25;

/**
 * O BRILHO DA LINHA — o único número de intensidade desta camada, e ele
 * é de instrumento (§5). Aditivo sobre um céu que já foi medido: alto
 * demais e a linha vira a fonte de luz mais forte do quadro dentro do
 * sistema; baixo demais e ela não sobrevive ao bloom.
 */
export const BRILHO_DA_LINHA = 0.32;

/** O cinza frio de quem não tem cor medida na fotometria (§5). */
export const COR_NEUTRA: readonly [number, number, number] = [0.62, 0.70, 0.85];

/** Abaixo disto o alfa não vale um passo de 8 bits — a linha sai da cena. */
const ALFA_INVISIVEL = 1 / 512;

/**
 * O que esta camada precisa da efeméride, e NADA além disto — mesmo
 * padrão de `FonteDeEfemerides` (`planetas.ts`): o `MotorEfemerides`
 * satisfaz esta forma sem saber que ela existe, e assim o módulo do
 * motor (tabela, cache, registro, elementos) não entra no grafo por
 * aqui.
 */
export interface FonteDeOrbitas {
  /** parent-centered, UA, eclíptica J2000 — o laço sai daqui */
  posicao(bodyId: string, jdTdb: number): { x: number; y: number; z: number };
  /** UA/dia, mesmo frame e mesmo instante */
  velocidade(bodyId: string, jdTdb: number): { x: number; y: number; z: number };
  /** heliocêntrica — só para POSICIONAR o laço de uma lua no pai */
  posicaoHeliocentrica(bodyId: string, jdTdb: number): { x: number; y: number; z: number };
}

/** Um corpo que ganha linha: quem é, em volta de quem, com que matiz. */
export interface CorpoComOrbita {
  id: string;
  /** 'sun' para os heliocêntricos; o planeta, para as 21 luas */
  centro: string;
  /** RGB linear já normalizado no canal mais forte (§5) */
  cor: readonly [number, number, number];
}

/** O matiz da fotometria, normalizado no canal mais forte (§5). */
function matizDe(id: string): readonly [number, number, number] | null {
  const linha = FOTOMETRIA[id];
  if (!linha) return null;
  const c = linha.corLinear;
  const pico = Math.max(c[0], c[1], c[2]);
  if (!(pico > 0)) return null;
  return [c[0] / pico, c[1] / pico, c[2] / pico];
}

/**
 * QUEM GANHA LINHA — derivado das três listas do config único, nunca
 * uma quarta lista digitada: os nove do retrato (o Sol é a origem e não
 * orbita nada), os oito heliocêntricos sem ponto (anões + asteroides) e
 * as 21 luas, que trazem o pai dentro.
 */
export const CORPOS_COM_ORBITA: readonly CorpoComOrbita[] = [
  ...CORPOS_DO_SISTEMA.filter((c) => c.id !== 'sun').map((c) => ({
    id: c.id,
    centro: 'sun',
    cor: matizDe(c.id) ?? COR_NEUTRA,
  })),
  ...HELIO_SEM_PONTO.map((c) => ({
    id: c.id,
    centro: 'sun',
    cor: matizDe(c.id) ?? COR_NEUTRA,
  })),
  ...LUAS_DO_SISTEMA.map((l) => ({
    id: l.id,
    centro: l.pai,
    // a lua herda o matiz do pai: é assim que o olho lê "estas quatro
    // são de Júpiter" sem um rótulo em cima de cada uma
    cor: matizDe(l.pai) ?? COR_NEUTRA,
  })),
];

/**
 * A CÔNICA OSCULADORA de um estado, amostrada em anomalia excêntrica
 * (§2). Escreve `saida` com `n` pontos (x,y,z) em UA, no MESMO frame
 * eclíptico da entrada, e devolve o semieixo maior e a excentricidade —
 * ou `null` quando o estado não define elipse (órbita aberta, μ
 * desconhecido, vetor degenerado).
 *
 * O vértice 0 é `r`, exatamente: é a identidade que faz linha e ponto
 * não divergirem. "Exatamente" tem número — 1e-15 relativo, medido em
 * `orbitas.test.ts` sobre um destino de float64; num destino de
 * float32 (o que a camada usa, porque é o que a GPU lê) o que sobra é a
 * quantização do buffer, ~1e-7. O destino é dos DOIS tipos por isso: o
 * teste julga a ÁLGEBRA sem a quantização no meio.
 */
export function conicaOsculadora(
  r: { x: number; y: number; z: number },
  v: { x: number; y: number; z: number },
  mu: number,
  saida: Float32Array | Float64Array,
  n: number
): { semieixoUa: number; excentricidade: number } | null {
  const rMod = Math.hypot(r.x, r.y, r.z);
  const v2 = v.x * v.x + v.y * v.y + v.z * v.z;
  if (!(rMod > 0) || !(mu > 0) || !Number.isFinite(v2)) return null;

  const inversoDoSemieixo = 2 / rMod - v2 / mu;
  if (!(inversoDoSemieixo > 0)) return null; // parabólica ou hiperbólica
  const a = 1 / inversoDoSemieixo;

  // h⃗ = r⃗ × v⃗ — o momento angular específico dá o PLANO da órbita
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  const hz = r.x * v.y - r.y * v.x;
  const hMod = Math.hypot(hx, hy, hz);
  if (!(hMod > 0)) return null; // movimento radial: não há elipse

  // e⃗ = (v⃗ × h⃗)/μ − r̂
  const ex = (v.y * hz - v.z * hy) / mu - r.x / rMod;
  const ey = (v.z * hx - v.x * hz) / mu - r.y / rMod;
  const ez = (v.x * hy - v.y * hx) / mu - r.z / rMod;
  let e = Math.hypot(ex, ey, ez);
  if (e >= 1) return null;

  // P̂ aponta ao periastro. Numa órbita quase circular a direção de e⃗ é
  // ruído puro — e a elipse é a mesma qualquer que seja o P̂ escolhido,
  // então o próprio r̂ serve, e serve melhor: com ele E₀ sai 0 exato.
  let px: number, py: number, pz: number;
  if (e > 1e-9) {
    px = ex / e;
    py = ey / e;
    pz = ez / e;
  } else {
    e = 0;
    px = r.x / rMod;
    py = r.y / rMod;
    pz = r.z / rMod;
  }
  // Q̂ = ĥ × P̂ — o eixo menor, no sentido do movimento
  const qx = (hy * pz - hz * py) / hMod;
  const qy = (hz * px - hx * pz) / hMod;
  const qz = (hx * py - hy * px) / hMod;

  const b = a * Math.sqrt(1 - e * e);

  // E₀ do PRÓPRIO estado, para o vértice 0 cair sobre o corpo
  const cos0 = Math.min(1, Math.max(-1, (r.x * px + r.y * py + r.z * pz) / a + e));
  const sen0 = b > 0 ? (r.x * qx + r.y * qy + r.z * qz) / b : 0;
  const e0 = Math.atan2(sen0, cos0);

  const passo = (2 * Math.PI) / n;
  for (let k = 0; k < n; k++) {
    const anomalia = e0 + k * passo;
    const cosE = Math.cos(anomalia) - e;
    const senE = Math.sin(anomalia);
    saida[k * 3] = a * cosE * px + b * senE * qx;
    saida[k * 3 + 1] = a * cosE * py + b * senE * qy;
    saida[k * 3 + 2] = a * cosE * pz + b * senE * qz;
  }
  return { semieixoUa: a, excentricidade: e };
}

/** Uma linha viva: o objeto do three mais o que o quadro precisa dela. */
interface LinhaDeOrbita {
  readonly corpo: CorpoComOrbita;
  readonly loop: THREE.LineLoop;
  readonly material: THREE.LineBasicMaterial;
  /** μ do par centro+corpo, ou `null` se o kernel não tem o centro */
  readonly mu: number | null;
  /** o instante da cônica desenhada; NaN enquanto ela não existe */
  jd: number;
  /** semieixo maior em pc — a régua do fade */
  semieixoPc: number;
  /** o alfa do quadro anterior, que é quem decide o reamostrar */
  alfa: number;
}

export class Orbitas {
  readonly group = new THREE.Group();

  /**
   * A porta do quadro, escrita pelo director antes do `update` — a
   * mesma disciplina de `Planetas.ligado`. A camada governa a si mesma
   * e a mais nada.
   */
  ligado = false;

  private readonly linhas: LinhaDeOrbita[] = [];
  /** o instante em que os CENTROS foram postos no lugar */
  private jdDosCentros = Number.NaN;
  /** rascunhos reusados — nada aloca no caminho do quadro */
  private readonly amostraUa: Float32Array;
  private readonly pontoEq: [number, number, number] = [0, 0, 0];
  private readonly rascunhoNdc = new THREE.Vector3();
  private readonly centroDoPai = new THREE.Vector3();

  constructor(corpos: readonly CorpoComOrbita[] = CORPOS_COM_ORBITA) {
    this.group.name = 'orbitas';
    this.amostraUa = new Float32Array(PONTOS_POR_ORBITA * 3);
    for (const corpo of corpos) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(PONTOS_POR_ORBITA * 3), 3)
      );
      // nasce com raio zero: sem cônica escrita não há nada para cortar
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(corpo.cor[0], corpo.cor[1], corpo.cor[2]),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        // linha atrás de globo resolvido SOME — é o palco quem escreve
        // profundidade, e é o comportamento certo (§5)
        depthTest: true,
      });
      const loop = new THREE.LineLoop(geo, material);
      // slots ocupados: … 6 (marcador), 7 (pontos dos planetas)
      loop.renderOrder = 8;
      loop.visible = false;
      this.group.add(loop);
      this.linhas.push({
        corpo,
        loop,
        material,
        mu: muDoPar(corpo.centro, corpo.id),
        jd: Number.NaN,
        semieixoPc: 0,
        alfa: 0,
      });
    }
  }

  /** quantas linhas estão acesas neste quadro — leitura de régua/teste */
  get acesas(): number {
    return this.linhas.reduce((n, l) => n + (l.loop.visible ? 1 : 0), 0);
  }

  /**
   * O CAMINHO VIVO — irmão de `Planetas.escreverInstante`, e pela mesma
   * razão: isto não é o quadro, é o que acontece quando o INSTANTE
   * muda. Reamostra a cônica de quem está aceso e está velho, e repõe
   * os centros das luas na posição do pai naquele instante.
   *
   * QUEM NUNCA FOI AMOSTRADO é amostrado sempre, aceso ou não: sem
   * cônica não há semieixo, e sem semieixo o fade do quadro seguinte não
   * teria régua para decidir se a linha aparece.
   *
   * O CUSTO por corpo reamostrado são DUAS perguntas ao motor (posição
   * e velocidade) e 256 senos — não 256 perguntas. É o que torna
   * barato reamostrar a cada salto de data em vez de guardar uma curva
   * que envelhece.
   *
   * Devolve se alguma linha foi reescrita.
   */
  escreverInstante(jdTdb: number, fonte: FonteDeOrbitas): boolean {
    if (!Number.isFinite(jdTdb)) return false;
    const centrosVelhos = jdTdb !== this.jdDosCentros;
    let mexeu = false;
    for (const linha of this.linhas) {
      if (centrosVelhos) this.reporCentro(linha, jdTdb, fonte);
      const nunca = !Number.isFinite(linha.jd);
      if (!nunca && (linha.jd === jdTdb || linha.alfa <= ALFA_INVISIVEL)) continue;
      if (this.reamostrar(linha, jdTdb, fonte)) mexeu = true;
    }
    this.jdDosCentros = jdTdb;
    return mexeu;
  }

  /**
   * O centro do laço, no frame da cena. Heliocêntrico: a origem, e nem
   * o motor é consultado. Lua: o pai, pela ponte de frame de sempre.
   */
  private reporCentro(linha: LinhaDeOrbita, jdTdb: number, fonte: FonteDeOrbitas) {
    if (linha.corpo.centro === 'sun') {
      linha.loop.position.set(0, 0, 0);
      return;
    }
    try {
      const p = fonte.posicaoHeliocentrica(linha.corpo.centro, jdTdb);
      this.pontoEq[0] = p.x;
      this.pontoEq[1] = p.y;
      this.pontoEq[2] = p.z;
      const eq = eclipticaParaEquatorial(this.pontoEq);
      linha.loop.position.set(
        eq[0] * AU_PARA_PC,
        eq[1] * AU_PARA_PC,
        eq[2] * AU_PARA_PC
      );
    } catch {
      // fora da janela da tabela o motor LANÇA (adaptação b): a linha
      // some em vez de ficar num lugar velho — a máquina do tempo já
      // avisa o visitante que a fita acabou, e uma órbita ancorada na
      // data errada seria a casa mentindo em silêncio.
      linha.loop.position.set(0, 0, 0);
      linha.jd = Number.NaN;
      linha.semieixoPc = 0;
    }
  }

  /** Reescreve a cônica de uma linha no instante dado. */
  private reamostrar(linha: LinhaDeOrbita, jdTdb: number, fonte: FonteDeOrbitas): boolean {
    if (linha.mu === null) return false;
    let conica: ReturnType<typeof conicaOsculadora> = null;
    try {
      conica = conicaOsculadora(
        fonte.posicao(linha.corpo.id, jdTdb),
        fonte.velocidade(linha.corpo.id, jdTdb),
        linha.mu,
        this.amostraUa,
        PONTOS_POR_ORBITA
      );
    } catch {
      conica = null;
    }
    if (conica === null) {
      // A TENTATIVA FICA CARIMBADA, e não é detalhe: sem carimbar, uma
      // linha que falha (fora da janela, estado degenerado) voltaria a
      // ser "nunca amostrada" e o quadro seguinte tentaria de novo — um
      // `throw` por corpo por quadro, para sempre. Com o carimbo, cada
      // instante é tentado UMA vez; o semieixo zerado apaga a linha.
      linha.jd = jdTdb;
      linha.semieixoPc = 0;
      return false;
    }

    const attr = linha.loop.geometry.getAttribute('position') as THREE.BufferAttribute;
    const destino = attr.array as Float32Array;
    for (let k = 0; k < PONTOS_POR_ORBITA; k++) {
      // A MESMA PONTE DE FRAME dos dez pontos (`planetas.ts`, D1): uma
      // rotação e uma multiplicação. Um segundo caminho aqui seria a
      // divergência silenciosa entre a linha e o corpo que ela cerca.
      this.pontoEq[0] = this.amostraUa[k * 3];
      this.pontoEq[1] = this.amostraUa[k * 3 + 1];
      this.pontoEq[2] = this.amostraUa[k * 3 + 2];
      const eq = eclipticaParaEquatorial(this.pontoEq);
      destino[k * 3] = eq[0] * AU_PARA_PC;
      destino[k * 3 + 1] = eq[1] * AU_PARA_PC;
      destino[k * 3 + 2] = eq[2] * AU_PARA_PC;
    }
    attr.needsUpdate = true;
    linha.semieixoPc = conica.semieixoUa * AU_PARA_PC;
    // o apoastro é o raio que o recorte de frustum precisa conhecer
    const raio = linha.semieixoPc * (1 + conica.excentricidade);
    (linha.loop.geometry.boundingSphere as THREE.Sphere).radius = raio;
    linha.jd = jdTdb;
    return true;
  }

  /**
   * O QUADRO: a porta, o fade por tamanho angular e o pai enquadrado.
   * Sem alocação e sem tocar em geometria — o que muda aqui é opacidade
   * e visibilidade, uma por linha.
   *
   * `tanHalfFov` é o mesmo que o tick já calcula para as outras camadas.
   */
  update(
    camera: THREE.PerspectiveCamera,
    hPx: number,
    tanHalfFov: number
  ) {
    this.group.visible = this.ligado;
    if (!this.ligado) {
      for (const linha of this.linhas) linha.alfa = 0;
      return;
    }
    const meiaAltura = hPx / 2;
    const camPos = camera.position;
    for (const linha of this.linhas) {
      linha.alfa = this.alfaDa(linha, camera, camPos, meiaAltura, tanHalfFov);
      const aceso = linha.alfa > ALFA_INVISIVEL;
      linha.loop.visible = aceso;
      if (aceso) linha.material.opacity = linha.alfa;
    }
  }

  /** O fade de uma linha: as duas pontas do §5, mais o pai enquadrado. */
  private alfaDa(
    linha: LinhaDeOrbita,
    camera: THREE.PerspectiveCamera,
    camPos: THREE.Vector3,
    meiaAltura: number,
    tanHalfFov: number
  ): number {
    if (!Number.isFinite(linha.jd) || !(linha.semieixoPc > 0)) return 0;
    const centro = linha.loop.position;
    const d = camPos.distanceTo(centro);
    if (!(d > 0) || !(tanHalfFov > 0)) return 0;

    // raio da órbita em pixels de tela — a mesma conta de tamanho
    // angular que a casa usa para decidir ponto↔disco
    const raioPx = ((linha.semieixoPc / d) / tanHalfFov) * meiaAltura;
    const entra = THREE.MathUtils.smoothstep(raioPx, RAIO_MIN_PX, RAIO_CHEIO_PX);
    if (entra <= 0) return 0;
    const sai =
      1 -
      THREE.MathUtils.smoothstep(
        raioPx,
        CABE_NO_QUADRO * meiaAltura,
        FORA_DO_QUADRO * meiaAltura
      );
    if (sai <= 0) return 0;

    if (linha.corpo.centro !== 'sun' && !this.paiEnquadrado(centro, camera)) return 0;
    return BRILHO_DA_LINHA * entra * sai;
  }

  /** O pai está no quadro? (§5 — só as luas perguntam.) */
  private paiEnquadrado(centro: THREE.Vector3, camera: THREE.PerspectiveCamera): boolean {
    this.centroDoPai.copy(centro);
    const ndc = this.rascunhoNdc.copy(this.centroDoPai).project(camera);
    // atrás da câmera o `project` devolve NDC dentro da caixa com z > 1
    if (ndc.z > 1) return false;
    return (
      Math.abs(ndc.x) <= MARGEM_DO_PAI_NDC && Math.abs(ndc.y) <= MARGEM_DO_PAI_NDC
    );
  }

  /** `?dbgorbitas` — que linha está acesa, com que raio e por quê. */
  dbg(): string {
    const linhas = [
      `[dbgorbitas] ${this.linhas.length} órbitas · ${this.acesas} acesas · ` +
        `camada ${this.ligado ? 'ligada' : 'desligada'}`,
    ];
    for (const l of this.linhas) {
      if (!l.loop.visible) continue;
      linhas.push(
        `[dbgorbitas] ${l.corpo.id.padEnd(9)} centro=${l.corpo.centro.padEnd(8)} ` +
          `a=${(l.semieixoPc / AU_PARA_PC).toFixed(6)} UA · ` +
          `alfa=${l.alfa.toFixed(4)} · jd=${l.jd}`
      );
    }
    return linhas.join('\n');
  }

  dispose() {
    for (const linha of this.linhas) {
      linha.loop.geometry.dispose();
      linha.material.dispose();
    }
    this.linhas.length = 0;
    this.group.clear();
  }
}
