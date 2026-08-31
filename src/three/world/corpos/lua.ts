// ============================================================
// A LUA RESOLVIDA (Onda 6, F2b) — o segundo corpo 3D da casa e o
// primeiro SATÉLITE: o regolito que se confere contra uma fotografia.
//
// PROVENIÊNCIA: implementação NOVA. O doador atlas-orbital entra como
// ESPEC apenas — a lei de Lommel-Seeliger e a derivação do C = 4/3 por
// neutralidade de fluxo atravessam de `regolithPhotometryPatch.ts`
// como FÍSICA declarada (o oráculo por QUADRATURA migra traduzido em
// `lua.test.ts`); nenhuma linha de código dele atravessou (doutrina de
// travessia, PLANO-ATLAS §0). O wrapper per-light de lá morreu com o
// motivo: a casa não usa o pipeline de luzes do three — o shader é
// próprio e a única luz direta é o Sol.
//
// A LEI DA SUPERFÍCIE — LOMMEL-SEELIGER, E POR QUE NÃO LAMBERT NEM
// HAPKE. Uma esfera Lambertiana cheia é brilhante no ponto subsolar e
// escurece rumo ao limbo com cos(incidência); a Lua cheia real é um
// DISCO QUASE CHATO com borda dura — um dos poucos fatos fotométricos
// que qualquer pessoa confere contra uma fotografia. A causa é o
// espalhamento simples num meio particulado que se auto-sombreia:
//
//     I/F ∝ μ₀ / (μ₀ + μ),   μ₀ = cos(incidência), μ = cos(emissão)
//
// — o limite de espalhamento único do modelo de Hapke. O Hapke COMPLETO
// (função de fase de partícula, surto de oposição, rugosidade
// macroscópica) é RECUSADO POR DOUTRINA (correção de fato 1 do desenho
// da onda): exige parâmetros MEDIDOS por corpo, e sem eles seria uma
// invenção vestindo nome de física.
//
// O 4/3 É DERIVADO, NÃO AJUSTADO. O fator converte o termo Lambert
// (albedo·μ₀) em LS multiplicando por C/(μ₀+μ), e C sai da exigência de
// neutralidade de fluxo — redistribuir o brilho no disco sem mudar a
// luz total na fase cheia: em fase zero μ = μ₀ no disco inteiro e o
// produto colapsa para a constante C/2 (o disco chato); a média de μ₀
// de Lambert ponderada por área projetada em fase zero é 2/3; logo
// C/2 = 2/3 ⟹ C = 4/3. O oráculo em `lua.test.ts` NÃO lê o 4/3 daqui:
// integra os dois perfis por quadratura, RESOLVE a razão e cobra que o
// literal do GLSL seja o que a integral produziu — valor ajustado a
// olho reprova.
//
// AS QUATRO LEIS de `terra.ts` valem palavra por palavra:
//  1. A LUZ É UM ESCALAR SÓ (D2): `uLuzGanho = ganhoDoGlobo(dUA, política)`
//     multiplica a componente direta e nada mais; SEM piso de ambiente —
//     o lado escuro em `real` é escuro (e a Lua não tem cidade).
//     O dUA é a distância HELIOCÊNTRICA da CADEIA de efeméride da LUA
//     (`posicaoHeliocentrica('moon')` = Terra + geocêntrica) — NUNCA a
//     distância ao pai (~0,0026 UA daria irradiância ~150.000× alta) e
//     NUNCA a da Terra por atalho: o oráculo Europa/Júpiter prometido em
//     `luz.ts` nasce aqui adaptado (razão Lua/Terra ≈ 1 a ±1e-2).
//  2. UM RELÓGIO SÓ (D-E6): o `jd` vem do Director.
//  3. ORIENTAÇÃO MEDIDA: polo + W IAU via `orientacaoDoCorpoNaCena` —
//     a rotação síncrona E a libração já moram nos termos periódicos do
//     W do kernel (não há um "sincronizador" na casa); o oráculo de
//     sub-ponto solar em `lua.test.ts` confere o transform completo.
//  4. CARGA PREGUIÇOSA: textura só desce com o gate armado ou na fase
//     atlas — as vistas oficiais não fazem um fetch.
//
// SEM ATMOSFERA, SEM NUVENS, SEM ESPECULAR: regolito é opaco e fosco —
// o brilho especular d'água da Terra não tem análogo aqui, e um lóbulo
// especular inventado seria exatamente o tipo de "melhoria" que a
// doutrina de honestidade proíbe.
//
// SEM EFEMÉRIDE NÃO HÁ LUA — salvo o PINO DA CODA. O retrato congelado
// não tem satélites; no Atlas, sem rede, a Lua não nasce (o badge já
// conta). No FILME, `centroPinadoPc` é `LUA_PC`: a mesma efeméride das
// 16:00, pré-computada. Sem o pino a câmera raspa um vazio e a Lua
// desenhada (se chegasse tarde) ficaria 59 mil km ao lado. E desde
// 30/08 (item 108) o pino MANDA sobre a efeméride viva, não só sobre a
// ausência dela: a coda mira um lugar pré-computado, então é ele que
// tem de estar lá — qualquer relógio que discorde está errado.
//
// O PONTO FOTOMÉTRICO NASCEU EM 30/08 (item 108, a terceira perna) — e
// a pendência que este cabeçalho carregava ("o ponto das luas é para a
// F8/Onda 7") fechou como ela previa: a cessão suave da camada
// (`alvoDaCessaoDoCorpo`, terra.ts) serviu de graça, e o que a Lua
// precisou trazer de próprio foi a LEI DE FASE dela ([ALLEN76], em
// `planetas/fotometria.ts`) e o LUGAR do ponto.
//
// O QUE ELE CONSERTA, medido: sem ponto, o disco da Lua no fim do filme
// (389 mil km, ~10 px) saía com pico 148 de 255, e SETE das dez fontes
// de fundo do rastro saíam acima dela, a mais viva com 230 — a Lua,
// magnitude −12,7, mais fraca que estrelas de sexta grandeza. (ERRATA de
// 31/08: o texto dizia "dez, entre 166 e 244" — número de uma varredura
// sem MÁXIMO LOCAL, em que oito das dez eram o mesmo borrão sentado no
// halo da Terra, fora do corte por 54 px. O fato não muda.) A causa é de
// UNIDADE, não de filme: o
// globo é exposto "para si" (Sol = 1, `luzDaVisita.ts`) e nessa régua a
// superfície vale o albedo, ~0,12; o ponto é normalizado por `EXPO_M0`,
// a régua em que a estrela vive. Corpo resolvido PEQUENO só carrega o
// fluxo verdadeiro pelo ponto, e é ele que cede quando o disco cresce.
//
// O LUGAR DO PONTO É O DA LUA, e sai daqui — nunca da efeméride da
// camada. Esta classe é a única que conhece o PINO das 16:00, e a
// segunda perna do item 108 provou o preço de duas fontes de posição
// para o mesmo corpo: com um `?jd=` na barra, a camada poria o ponto a
// dezenas de milhares de km do globo. `palco.ts` publica o centro daqui
// em `Planetas.escreverPontoDeCorpo` e a cessão em `escreverCessao`.
//
// PRECISÃO: mesmo desenho da Terra — frame LOCAL em raios, câmera e Sol
// convertidos na CPU (float64); clamps e guardas em todo pow/divisão.
// ============================================================
import * as THREE from 'three';
import { CAMADA_DOS_OCULTADORES } from '../../core/post';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import {
  AU_PARA_PC,
  eclipticaParaEquatorial,
} from '../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import type { PoliticaDeLuz } from '../../../lib/atlas/luz';
import {
  GLSL_LUZ_DA_VISITA,
  escreverLuzDaVisita,
  ganhoDoGlobo,
  uniformsDaLuzDaVisita,
} from '../../../lib/atlas/luzDaVisita';
import {
  PARES_DE_ECLIPSE,
  GLSL_SOMBRA_ECLIPSE,
  criaSombraNaCena,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import type { CalibracaoDaCasa } from '../../estrela';
import type { FonteDeEfemerides } from '../planetas/planetas';
import { DESLOCAMENTO_UA_PARA_PC } from '../planetas/planetas';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { RAMP_DURATION_MS, stepRampToward } from '../lodStellar';
import { diametroAparentePx } from './corpos';
import { alvoDaCessaoDoCorpo, gateBinario } from './terra';
import { CANAL_MAP, TexturasDoCorpo } from './texturas';
import type { OpcoesDeTextura } from './texturas';
import { orientacaoDoCorpoNaCena } from './orientacaoNaCena';
import {
  escreverSombraDeEclipse,
  uniformsDeEclipseNeutros,
} from './eclipseNoMaterial';

/** Raio da Lua em pc — BODY_AXES (km, kernel pck00011) pelos
 *  conversores únicos; esfera exata (a = b = c), um raio só. */
export const RAIO_LUA_PC = (BODY_AXES.moon[0] / AU_KM) * AU_PARA_PC;

/**
 * A NORMALIZAÇÃO de Lommel-Seeliger, C = 4/3 — DERIVADA por
 * neutralidade de fluxo (cabeçalho) e cobrada por quadratura no teste.
 * `4 / 3` escrito como conta e não como decimal truncado: o GLSL recebe
 * o literal formatado uma vez, e o oráculo casa o literal com a
 * integral.
 */
export const LS_NORMALIZACAO = 4 / 3;

/** O literal que entra no GLSL — o que o oráculo por quadratura lê. */
export const LS_NORMALIZACAO_GLSL = LS_NORMALIZACAO.toFixed(7);

// ------------------------------------------------------------
// GLSL — shader PRÓPRIO, padrão da casa (guardas, zero chunk).
// ------------------------------------------------------------

const LUA_VERT = /* glsl */ `
varying vec3 vLocal; // posição na ESFERA UNITÁRIA (o raio mora na matriz)
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * A SUPERFÍCIE DE REGOLITO. Difusa Lommel-Seeliger e NADA mais:
 *
 *     direta = albedo · C · μ₀ / (μ₀ + μ),  C = 4/3 (derivado)
 *
 * μ₀ e μ saturados em [0,1]; o denominador tem piso 1e-4 (a MESMA
 * guarda do espec do doador — no limbo exato μ₀ + μ → 0 e a divisão
 * sem piso explode). O terminador é geométrico: μ₀ = 0 zera o numerador
 * e o lado escuro é escuro — sem piso de ambiente (anti-padrões 3 e 9).
 * `uLuzGanho` multiplica SÓ esta componente direta; não existe outro
 * termo no shader. O ECLIPSE (F2c/D3) entra pelo chunk único da lib e
 * multiplica SÓ a direta, depois do BRDF — na umbra da Terra a direta
 * cai no piso cobre de Danjon (a blood moon), que é o piso umbral
 * exportado pela lib, nunca uma cor inventada aqui.
 */
export const LUA_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform vec3 uDirSolLocal;  // corpo→Sol, frame LOCAL (unitário)
uniform vec3 uCamLocal;     // câmera no frame local, em raios
uniform float uLuzGanho;    // ganhoDoGlobo(dUA da CADEIA da Lua) — o escalar único
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
void main() {
  vec3 n = normSeguro(vLocal);
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  vec3 dirCam = normSeguro(uCamLocal - vLocal);
  float mu0 = clamp(dot(n, uDirSolLocal), 0.0, 1.0);
  float mu = clamp(dot(n, dirCam), 0.0, 1.0);
  // Lommel-Seeliger com C derivado por neutralidade de fluxo — o disco
  // cheio é CHATO (mu == mu0 ⇒ fator constante C/2), não Lambertiano.
  float ls = ${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4);
  vec3 sombras = fatorDeEclipse(vLocal, n, dot(n, uDirSolLocal));
  vec3 luzSol = vec3(ls * uLuzGanho) * sombras;
  // ITEM 93: a LANTERNA DE LEITURA entra; a LOGISTICA nao (contrato
  // 4.3). O disco chato de LS e' o fato da foto, e o teto de 1 nao
  // morde o realce de limbo — a borda dura continua dura. A lanterna
  // leva as SOMBRAS junto: sem isso o cobre de Danjon do eclipse lunar
  // viraria um cinza de 15 %.
  gl_FragColor = vec4(
    albedo * luzDoGlobo(luzSol, lanternaDeLeitura(n, dirCam, sombras)), 1.0
  );
}
`;

// ------------------------------------------------------------
// A classe — o molde é `TerraResolvida`; o que não se repete de lá
// (escada, gate, webp, manifest) é IMPORTADO, nunca copiado.
// ------------------------------------------------------------

/** O que o Director entrega por tick — o MESMO quadro da Terra desde
 *  30/08: com o ponto fotométrico, a Lua passou a ter cessão, e a
 *  cessão consome `psf`, `dtS` e `salto` como as irmãs. */
export interface QuadroDaLua {
  jdTdb: number;
  /** a efeméride viva, ou null — e null aqui significa SEM Lua, salvo
   *  `centroPinadoPc` (o vetor da coda do filme). */
  fonte: FonteDeEfemerides | null;
  /** posição heliocêntrica pinada (pc): a coda usando `LUA_PC`, não um
   *  chute. MANDA sobre a fonte quando existe (item 108); quem o zera
   *  fora do filme é o `palco.ts`. */
  centroPinadoPc?: THREE.Vector3;
  camPosPc: THREE.Vector3;
  screenHPx: number;
  fovDeg: number;
  ligado: boolean;
  atlasQuente: boolean;
  politica: PoliticaDeLuz;
  /** dt do quadro em segundos — só a rampa temporal da cessão o consome. */
  dtS: number;
  /** o instrumento da CASA: o halo do ponto sai dele. */
  psf: CalibracaoDaCasa;
  /** a câmera SALTOU neste quadro: a cessão faz snap em vez de animar. */
  salto: boolean;
}

export interface EstadoDaLua {
  emQuadro: boolean;
  carregando: boolean;
  /** o gate está ARMADO — armado sem `emQuadro` e sem `carregando` é o
   *  fallback frio que o `captura` do Director segura (contrato de
   *  `EstadoDaTerra.gateArmado`, palavra por palavra). */
  gateArmado: boolean;
  raioPc: number;
  /** centro em pc na cena — NaN enquanto não houver efeméride. */
  centroPc: THREE.Vector3;
  diametroPx: number;
  /** distância heliocêntrica da CADEIA da Lua, em UA — o que o selo e
   *  a busca leem; NaN sem efeméride. */
  rUA: number;
  /**
   * A CESSÃO SUAVE do ponto fotométrico da Lua (item 108), com o mesmo
   * contrato das irmãs: 0 = ponto inteiro, 1 = ponto apagado, o meio é
   * o crossfade. E **1 EXATO sem lugar** (Lua sem efeméride e sem
   * pino): sem posição no mundo o vértice tem de ficar mudo, e a
   * cessão é o interruptor que já existe para isso.
   */
  cede: number;
  /** a cessão ainda está ANDANDO rumo ao alvo — o Director zera a
   *  contagem de estabilidade enquanto isto for true. */
  emRampa: boolean;
}

/** Só o bloco comum de textura (`OpcoesDeTextura`): a Lua tem UM canal e
 *  nada de próprio para pedir. */
export type OpcoesDaLua = OpcoesDeTextura;

export class LuaResolvida {
  readonly group = new THREE.Group();

  private readonly centro = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private jdEscrito = Number.NaN;
  private fonteEscrita: FonteDeEfemerides | null = null;
  private rUA = Number.NaN;
  private armado = false;

  /** a sombra do eclipse (F2c), resolvida no cache de jd/fonte —
   *  scratch único, preenchido por `resolveSombraNaCena` (out-parameter) */
  private readonly sombra = criaSombraNaCena();

  /** o estado das texturas — a casa dele é o pipeline (`texturas.ts`) */
  private readonly texturas: TexturasDoCorpo;
  private disposto = false;

  private geometria: THREE.SphereGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;

  // rascunhos reusados — zero alocação por quadro (M4 da casa)
  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vEscala = new THREE.Vector3();
  private readonly estado: EstadoDaLua;

  /** o estado do último tick, para quem enquadra (a escada, F2b) —
   *  somente leitura; o centro é a referência VIVA. */
  get estadoVivo(): Readonly<EstadoDaLua> {
    return this.estado;
  }

  constructor(opcoes: OpcoesDaLua) {
    this.group.visible = false;
    // UM canal (`map`), pela transação única. A dose de VRAM é POR CANAL
    // (`alvoDePixels`), então o `map` da Lua mantém o 8k de cinema de
    // graça: a regra nunca foi por corpo.
    this.texturas = new TexturasDoCorpo({
      corpo: 'moon',
      canais: [CANAL_MAP],
      rede: opcoes,
      etiqueta: 'lua',
      // sem textura não há globo — mas desde o item 108 sobra o PONTO
      // fotométrico, que não depende de textura nenhuma: a Lua deixa de
      // ser um mundo e volta a ser o que é de longe, uma luz
      oQueNaoNasce: 'a Lua não nasce nesta sessão',
      publicar: (porCanal) => {
        this.garantirCasca();
        this.matSuperficie!.uniforms.uMapaDia.value = porCanal.get('map')!;
      },
    });
    this.estado = {
      emQuadro: false,
      carregando: false,
      gateArmado: false,
      raioPc: RAIO_LUA_PC,
      centroPc: this.centro,
      diametroPx: Number.NaN,
      rUA: Number.NaN,
      // sem lugar não há ponto: o vértice nasce mudo e a camada nasce
      // com o mesmo 1 no `aCede` dele — os dois lados combinam
      cede: 1,
      emRampa: false,
    };
  }

  /**
   * O TICK — a mesma ordem da Terra: posição (cache por jd E por fonte)
   * → diâmetro aparente → gate → gatilho de textura → matriz e uniforms.
   * SEM efeméride o centro fica NaN, o diâmetro fica NaN, o gate
   * preserva estado e nada entra em quadro — a Lua não existe até a
   * fonte chegar (cabeçalho).
   */
  atualizar(q: QuadroDaLua): EstadoDaLua {
    const e = this.estado;
    if (this.disposto) return e;

    let saltoDeData = false;
    if (
      (q.jdTdb !== this.jdEscrito || q.fonte !== this.fonteEscrita) &&
      Number.isFinite(q.jdTdb)
    ) {
      saltoDeData = true;
      this.jdEscrito = q.jdTdb;
      this.fonteEscrita = q.fonte;
      // O PINO MANDA SEMPRE QUE EXISTE, e por isso vem ANTES da fonte
      // (item 108, 30/08). Até aqui ele era o último recurso — só sem
      // efeméride —, e por isso não salvava o quadro quando o relógio do
      // filme era sequestrado por um `?jd=` que o próprio app grava na
      // barra de endereços: a fonte estava viva, na data errada, e o
      // raspão da coda passava por onde a Lua não estava. Quem decide se
      // o pino existe é o `palco.ts`, que o zera fora do filme. Sem
      // eclipse resolvido, pela mesma razão da Terra: a posição é a das
      // 16:00 e a sombra fica neutra, que é a verdade daquela data.
      if (q.centroPinadoPc) {
        this.centro.copy(q.centroPinadoPc);
        this.rUA = this.centro.length() / AU_PARA_PC;
        this.sombra.ativo = false;
      } else if (q.fonte) {
        // a CADEIA heliocêntrica (Terra + geocêntrica) — a lei de luz
        // exige a distância ao SOL, nunca ao pai (contrato de luz.ts)
        const p = q.fonte.posicaoHeliocentrica('moon', q.jdTdb);
        this.rUA = Math.hypot(p.x, p.y, p.z);
        const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
        this.centro.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
        // O ECLIPSE (F2c/D3): o par da TABELA (moon ← earth), no MESMO
        // relógio do quadro. O fetch do eclipsador é pelo id DA TABELA,
        // nunca atalho da cadeia de luz — o único 'earth' deste arquivo
        // é o eclipsador.
        const eclipsadorId = PARES_DE_ECLIPSE.moon;
        if (eclipsadorId) {
          const pEcl = q.fonte.posicaoHeliocentrica(eclipsadorId, q.jdTdb);
          resolveSombraNaCena(
            'moon',
            [p.x, p.y, p.z],
            [pEcl.x, pEcl.y, pEcl.z],
            this.sombra
          );
        }
      } else {
        this.rUA = Number.NaN;
        this.centro.set(Number.NaN, Number.NaN, Number.NaN);
        // sem efeméride não há Lua — e não há eclipse: fator neutro
        this.sombra.ativo = false;
      }
    }
    e.rUA = this.rUA;

    const dPc = q.camPosPc.distanceTo(this.centro);
    const diametroPx = diametroAparentePx(RAIO_LUA_PC, dPc, q.screenHPx, q.fovDeg);
    e.diametroPx = diametroPx;

    this.armado = gateBinario(this.armado, diametroPx);

    // o MESMO gatilho duplo da Terra (lei 4): gate armado OU fase atlas
    this.texturas.aoTick(this.armado || q.atlasQuente);

    const emQuadro =
      this.armado && q.ligado && this.texturas.pronta && q.fonte !== null;
    e.emQuadro = emQuadro;
    e.carregando = this.texturas.carregando;
    e.gateArmado = this.armado;
    this.group.visible = emQuadro;

    // A CESSÃO SUAVE do ponto (item 108) — a conta das irmãs, com a
    // base SEMPRE viva: a Lua não tem retrato congelado onde cair, e
    // sem lugar ela não tem ponto nenhum (cessão 1, snap, sem rampa —
    // animar um crossfade a partir de "não existe" seria mentir
    // movimento). O mesh fora de quadro devolve 0 e o ponto fica
    // inteiro: é ele quem mostra a Lua antes dos 4 px do gate.
    const temLugar = Number.isFinite(this.centro.x);
    const alvo = temLugar
      ? alvoDaCessaoDoCorpo(
          aMagBaseDe(FOTOMETRIA.moon.H, this.rUA) + DESLOCAMENTO_UA_PARA_PC,
          this.centro, q.camPosPc, dPc, diametroPx, emQuadro, q.psf, q.screenHPx
        )
      : 1;
    e.cede =
      q.salto || saltoDeData || !temLugar
        ? alvo
        : stepRampToward(e.cede, alvo, q.dtS, RAMP_DURATION_MS);
    e.emRampa = e.cede !== alvo;

    if (emQuadro) this.posicionar(q);
    return e;
  }

  /** matriz + uniforms do quadro — só roda com o mesh em quadro. */
  private posicionar(q: QuadroDaLua) {
    const { colunaX, colunaY, colunaZ } = orientacaoDoCorpoNaCena(
      IAU_ORIENTATIONS.moon,
      this.jdEscrito
    );
    this.vX.set(colunaX[0], colunaX[1], colunaX[2]);
    this.vY.set(colunaY[0], colunaY[1], colunaY[2]);
    this.vZ.set(colunaZ[0], colunaZ[1], colunaZ[2]);

    const sup = this.superficie!;
    sup.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.setScalar(RAIO_LUA_PC))
      .setPosition(this.centro);

    // frame local (CPU em float64): câmera em raios, Sol unitário
    // a exposição da visita (item 91, reescrita no 93): Sol = 1 em
    // `assistida`, E(d) em `real`. Ver `luzDaVisita.ts`.
    const ganho = ganhoDoGlobo(this.rUA, q.politica);
    const dirSol = this.vTmp.copy(this.centro).multiplyScalar(-1);
    const norma = Math.max(dirSol.length(), 1e-30);
    dirSol.multiplyScalar(1 / norma);
    const sLx = dirSol.dot(this.vX);
    const sLy = dirSol.dot(this.vY);
    const sLz = dirSol.dot(this.vZ);

    const delta = this.vTmp.copy(q.camPosPc).sub(this.centro);
    const cLx = delta.dot(this.vX) / RAIO_LUA_PC;
    const cLy = delta.dot(this.vY) / RAIO_LUA_PC;
    const cLz = delta.dot(this.vZ) / RAIO_LUA_PC;

    const u = this.matSuperficie!.uniforms;
    (u.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (u.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    u.uLuzGanho.value = ganho;
    // a lanterna de leitura (item 93) — a Lua a recebe, a logística não
    escreverLuzDaVisita(u, q.politica, 0);
    // a sombra do eclipse (F2c) — o mesmo fio da Terra
    escreverSombraDeEclipse(u, this.sombra, this.vX, this.vY, this.vZ, 0);
  }

  /** geometria + material + mesh, UMA vez, na primeira necessidade. */
  private garantirCasca() {
    if (this.geometria || this.disposto) return;
    this.geometria = new THREE.SphereGeometry(1, 128, 64);
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: LUA_VERT,
      fragmentShader: LUA_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        ...uniformsDaLuzDaVisita(),
        ...uniformsDeEclipseNeutros(),
      },
      // corpo resolvido OPACO: escreve e testa o depth do palco (F0) —
      // é o que faz um trânsito Lua×Terra compor certo por construção
      depthWrite: true,
      depthTest: true,
      transparent: false,
    });
    this.superficie = new THREE.Mesh(this.geometria, this.matSuperficie);
    // globo opaco = ocultador do rascunho do campo (item 47): estrela
    // atrás dele não deposita clarão. Anel/atmosfera/nuvens ficam fora.
    this.superficie.layers.enable(CAMADA_DOS_OCULTADORES);
    this.superficie.matrixAutoUpdate = false;
    this.group.add(this.superficie);
  }

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    this.texturas.dispose();
  }
}
