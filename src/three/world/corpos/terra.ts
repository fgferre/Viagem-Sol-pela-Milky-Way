// ============================================================
// A TERRA RESOLVIDA (Onda 6, F2a) — o primeiro corpo 3D da casa: o
// globo que nasce sob o ponto fotométrico quando a câmera chega perto.
//
// PROVENIÊNCIA: implementação NOVA. O doador atlas-orbital entra como
// ESPEC apenas — as constantes Nishita do `atmosphereShader.ts`, o
// `linstep(-0,1, 0,1, -NdotL)` das luzes noturnas (a versão smoothstep
// vazava 16% de luz no lado diurno) e o terminador de nuvens do
// `cloudTerminatorMath.ts` atravessaram como NÚMEROS declarados; nenhuma
// linha de código dele atravessou (doutrina de travessia, PLANO-ATLAS §0).
//
// AS QUATRO LEIS QUE ESTE ARQUIVO OBEDECE:
//  1. A LUZ É UM ESCALAR SÓ (D2): `uLuzGanho = ganhoDoGlobo(dUA, política)`
//     multiplica a componente DIRETA (difusa + especular) e nada mais.
//     Nunca dois multiplicadores empilhados (anti-padrão 1); SEM piso de
//     ambiente (anti-padrões 3 e 9) — o lado escuro em `real` é escuro, e
//     a didática honesta são as luzes de cidade, que são EMISSÃO
//     (independem da irradiância solar e ficam FORA do ganho).
//  2. UM RELÓGIO SÓ (D2/D-E6): o `jd` vem do Director; este arquivo não
//     conhece Date nem relógio de parede — o teste de texto-fonte da
//     camada de planetas vale aqui palavra por palavra.
//  3. ORIENTAÇÃO MEDIDA, NUNCA CALIBRADA: polo + W(t) IAU desenrolado via
//     `baseCorpoEquatorial` (orientacao.ts), raios de BODY_AXES
//     (achatamento real). O oráculo de sub-ponto solar em `terra.test.ts`
//     (emenda D-E4) confere o transform COMPLETO do mesh contra
//     `subSolarPoint` — textura girada passa em md5, não passa lá.
//     A lápide de `EARTH_ROTATION_OFFSET_DEG` (config.ts) segue valendo:
//     nenhum ângulo de alinhamento à mão neste arquivo.
//  4. CARGA PREGUIÇOSA (F2a): textura só desce quando o GATE arma ou na
//     fase atlas — nunca no boot do filme. As 18 vistas oficiais não fazem
//     um fetch (o teste pina o gatilho; as capturas provam de graça).
//
// O GATE + A DOMINÂNCIA SUAVE (F2b, decisão D5): o mesh entra quando o
// diâmetro aparente cruza `LIMIAR_DO_GATE_PX`, sai abaixo de LIMIAR/2
// (cushion 2×, desigualdades assimétricas, NaN preserva estado — os
// contratos de histerese da Onda 3). O PONTO da camada `planetas` NÃO
// apaga num degrau (o binário da F2a morreu aqui): ele cede por
// DOMINÂNCIA, no molde que nasceu no par hero↔catálogo da Onda 3 —
// razão r = diâmetro do MESH em px / halo PREVISTO do ponto em px
// (`psfPointSizePx`, o espelho da PSF), cessão-alvo = g(r), a rampa
// cúbica de 1 a 2,5 (`cessaoPorDominancia`, com a prova de
// continuidade: a luz combinada nunca dá passo para trás na
// aproximação; o par hero↔catálogo morreu no M2 e a curva ficou com
// este consumidor). O mesh NASCE SOB o clarão (aos 4 px do gate, r ≈ 0,3 —
// o ponto segue inteiro) e o ponto só cede quando o globo o domina.
// As 4 cicatrizes do crossfade valem aqui: banda morta PROIBIDA
// (soma > 0 em toda a faixa — teste de propriedade como o C1a),
// reafirmação por quadro (a escrita idempotente de `escreverCessao`),
// reset no salto de foco/data (snap, nunca lerp através de um
// teletransporte) e clamp de dt (dentro de `stepRampToward`, o
// integrador do doador que estava DORMENTE desde a Onda 3 — este é o
// primeiro consumidor de runtime dele).
//
// PRECISÃO: a cena mede em pc e a Terra tem raio 2,07e-10 pc. Nenhuma
// posição de mundo é reconstruída na GPU: os shaders trabalham no FRAME
// LOCAL do corpo, em unidades de raio equatorial, com câmera e Sol
// convertidos na CPU (float64) a cada tick — o quantum de float32 na
// posição da cena (~6e-13 pc) nunca toca a matemática de iluminação.
// Clamps e guardas de NaN em todo pow/divisão do GLSL (pauta (a) da
// revisão; precedente c098470/9aff400).
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
  escreverLuzDaVisita,
  type CalibracaoDaLuz,
  ganhoDoGlobo,
  uniformsDaLuzDaVisita,
} from '../../../lib/atlas/luzDaVisita';
import {
  PARES_DE_ECLIPSE,
  criaSombraNaCena,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import { CALIBRACAO_ATLAS } from '../../config';
import { RAMP_DURATION_MS, cessaoPorDominancia, stepRampToward } from '../lodStellar';
import { psfPointSizePx } from '../../luzDaCasa';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { A_MAG_BASE_PC, DESLOCAMENTO_UA_PARA_PC, faseDoVertice, magDoVertice } from '../planetas/planetas';
import type { FonteDeEfemerides } from '../planetas/planetas';
import type { CalibracaoDaCasa } from '../../estrela';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { CUSHION_DO_GATE, LIMIAR_DO_GATE_PX, diametroAparentePx, gateBinario } from './corpos';
import {
  ATMOSFERA_FRAG,
  ATMOSFERA_VERT,
  NUVENS_FRAG,
  RAZAO_CASCA_ATMOSFERA,
  RAZAO_CASCA_NUVENS,
  TERRA_FRAG,
  TERRA_VERT,
} from '../../shaders/terraShaders';
import { orientacaoDoCorpoNaCena } from './orientacaoNaCena';
import type { OrientacaoNaCena } from './orientacaoNaCena';
import { carregarCanaisDoCorpo, estadoAposFalha } from './texturas';
import type { CanalPedido, EstadoDasTexturas, OpcoesDeTextura } from './texturas';
import {
  escreverSombraDeEclipse,
  uniformsDeEclipseNeutros,
} from './eclipseNoMaterial';

// A FACHADA (mesmo desenho do gate acima): o que mudou de casa nesta
// onda — orientação genérica, pipeline de texturas, eclipse no material
// e os shaders — é REEXPORTADO daqui, e não copiado: os endereços
// antigos continuam achando o MESMO símbolo, e quem só precisa do
// referencial novo importa direto dele.
export * from './orientacaoNaCena';
export * from './texturas';
export * from './eclipseNoMaterial';
export * from '../../shaders/terraShaders';


/**
 * OS UNIFORMES DO MATERIAL DA ATMOSFERA — extraídos do construtor para
 * que exista uma peça que o juiz possa EXECUTAR. O defeito do item 95
 * era exatamente uma discordância entre os dois lados desta fronteira: o
 * shader não declarava o eclipse e o material não o oferecia, e nada no
 * projeto sabia perguntar. Agora `terra.test.ts` compara este conjunto
 * com os `uniform` que o `ATMOSFERA_FRAG` MONTADO declara, e a
 * divergência reprova por valor.
 */
export function uniformsDaAtmosfera(): Record<string, THREE.IUniform> {
  return {
    uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
    uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
    uLuzGanho: { value: 1 },
    // ITEM 95: a casca de ar passou a receber a MESMA sombra do chão.
    ...uniformsDeEclipseNeutros(),
  };
}

/** Raio equatorial da Terra em pc — BODY_AXES (km) → UA → pc pelos
 *  conversores únicos da casa; nenhum literal novo de comprimento. */
export const RAIO_EQ_TERRA_PC = (BODY_AXES.earth[0] / AU_KM) * AU_PARA_PC;
/** Raio polar — o achatamento real (a − c)/a ≈ 1/298,3 entra pela escala
 *  anisotrópica da matriz do mesh, nunca por geometria própria. */
export const RAIO_POLAR_TERRA_PC = (BODY_AXES.earth[2] / AU_KM) * AU_PARA_PC;

/**
 * A LEI DO GATE (limiar de 4 px, cushion 2× e a máquina com histerese)
 * MUDOU DE CASA na F2 da onda do Sol real: mora em `corpos.ts`, ao lado
 * de `diametroAparentePx`, que é a outra metade da mesma conta. A razão
 * longa está lá — em resumo, ela deixou de ser "a régua da Terra" no dia
 * em que o SOL passou a ser julgado por ela.
 *
 * REEXPORTADA daqui, e não copiada: os endereços antigos (`terra.ts`)
 * continuam achando o MESMO símbolo, então `terra.test.ts` e quem mais
 * importava não mudam de linha e não existe segunda fonte de verdade.
 */
export { CUSHION_DO_GATE, LIMIAR_DO_GATE_PX, gateBinario };


/**
 * As nuvens giram a spin × 1,03 (espec do doador). O multiplicador é
 * EXATAMENTE o motivo de o W da casa ser desenrolado (cicatriz 2 de
 * orientacao.ts): num ângulo enrolado, multiplicar injetaria um snap de
 * (1,03−1)·360° ≈ 10,7° a cada volta.
 */
export const DERIVA_DAS_NUVENS = 1.03;


/** Os cinco canais da Terra no manifest — a escada real de F2a-1. */
export const CANAIS_DA_TERRA = ['map', 'night', 'clouds', 'normal', 'roughness'] as const;
export type CanalDaTerra = (typeof CANAIS_DA_TERRA)[number];

/**
 * O PEDIDO dos cinco canais, na forma que a carga única consome: os três
 * de COR decodificam de sRGB, `normal` e `roughness` são DADO e ficam
 * lineares — pôr um normal map em sRGB torceria a normal em silêncio.
 * Todos são equiretangulares, então todos repetem em U (a emenda 0/360
 * fecha sem risca de mipmap).
 */
const PEDIDO_DA_TERRA: readonly CanalPedido[] = CANAIS_DA_TERRA.map((canal) => ({
  canal,
  cor: canal === 'map' || canal === 'night' || canal === 'clouds',
  repetirEmU: true,
}));


// ------------------------------------------------------------
// As contas puras (testáveis sem GPU)
// ------------------------------------------------------------

/**
 * Posição heliocêntrica da Terra em UA (eclíptica J2000) — o MESMO
 * caminho do `escreverInstante` da camada de planetas: efeméride quando
 * há fonte, retrato congelado quando não há (o estado honesto do "sem
 * rede", idêntico ao da camada que este globo substitui de perto).
 */
export function posicaoDaTerraUA(
  jdTdb: number,
  fonte: FonteDeEfemerides | null
): { x: number; y: number; z: number } {
  if (fonte && Number.isFinite(jdTdb)) {
    return fonte.posicaoHeliocentrica('earth', jdTdb);
  }
  const v = RETRATO_2026.earth.vetorUA;
  return { x: v[0], y: v[1], z: v[2] };
}

/** A saída das três colunas — ver `orientacaoDoCorpoNaCena`. */

/** A instância Terra da função acima — o nome que o oráculo pina. */
export function orientacaoDaTerraNaCena(jdTdb: number): OrientacaoNaCena {
  return orientacaoDoCorpoNaCena(IAU_ORIENTATIONS.earth, jdTdb);
}


/**
 * O ALVO DA CESSÃO SUAVE (F2b/D5), pura: quanto o PONTO fotométrico
 * cede a um mesh que mede `diametroMeshPx` contra um halo previsto de
 * `haloPontoPx`. A curva é `cessaoPorDominancia` IMPORTADA — a rampa
 * cúbica g(r) de 1 a 2,5 com a prova de continuidade escrita ao lado
 * dela em `lodStellar.ts` (hi = 2,5 é a MENOR borda em que a luz
 * combinada nunca dá passo para trás na aproximação; a régua é TAMANHO
 * na tela, a única comum às duas representações). Nasceu no par
 * hero↔catálogo da Onda 3; o par morreu no M2 e a curva ficou com o
 * consumidor legítimo — esta troca corpo↔ponto, que conserva fluxo.
 *
 * Mesh fora de quadro ⇒ 0 EXATO (o ponto fica inteiro — é o que mantém
 * as vistas profundas bit-idênticas). Halo inexistente (PSF ≤ 0, ponto
 * invisível) ⇒ razão 0 ⇒ cessão 0 ("ponto inexistente não domina nada"
 * — e um ponto invisível também não soma luz para haver o que ceder).
 */
export function cessaoAlvo(
  emQuadro: boolean,
  diametroMeshPx: number,
  haloPontoPx: number
): number {
  if (!emQuadro) return 0;
  if (!(haloPontoPx > 0) || !Number.isFinite(diametroMeshPx)) return 0;
  return cessaoPorDominancia(diametroMeshPx / haloPontoPx);
}

// (`cessaoPeloGate` e `CESSAO_PELO_GATE_MULT` — a cessão do SOL-ponto
// ancorada no gate do palco, com a porta `?bcede=` — morreram no M1 da
// LEI-DA-ESTRELA: a cessão do Sol é `wResolvido` da repartição única,
// sobre a MESMA régua de 4 px que aqui era multiplicador. A medição de
// 15/08 que os autorizou (borrão 900→6 px a 1 UA com mult 1) está no
// commit que os criou; a rampa da lei cobre o mesmo trecho com a mesma
// forma C¹. A `cessaoAlvo` acima FICA: é a cessão dos corpos resolvidos
// (Terra, Lua, gigantes), que migra no M4.)





// ------------------------------------------------------------
// A classe
// ------------------------------------------------------------

/** O que o Director entrega por tick. */
export interface QuadroDaTerra {
  /** jd TDB grampeado do Director — o relógio único da casa. */
  jdTdb: number;
  /** a efeméride viva, ou null (retrato congelado — o "sem rede"). */
  fonte: FonteDeEfemerides | null;
  /** no filme, sem fonte: Terra das 16:00 (`TERRA_PC`), não o retrato
   *  da meia-noite — senão o pouso mira um globo a 1,7 milhão de km. */
  centroPinadoPc?: THREE.Vector3;
  camPosPc: THREE.Vector3;
  screenHPx: number;
  fovDeg: number;
  /** a porta ?corpos/?nocorpos, escrita pelo Director antes do tick. */
  ligado: boolean;
  /** fase atlas: pré-aquece a carga de textura (gatilho 2 do contrato). */
  atlasQuente: boolean;
  politica: PoliticaDeLuz;
  /** `?calib=` — a calibração candidata do item 93. OPCIONAL porque a
   *  porta é de INSTRUMENTO e morre com a escolha dele: ausente é o
   *  `padrao`, que é o de hoje bit a bit. */
  calibracao?: CalibracaoDaLuz;
  /** dt do quadro em segundos — só a rampa temporal da cessão o consome
   *  (o clamp de picos mora em `stepRampToward`, nunca aqui). */
  dtS: number;
  /** o instrumento da CASA (M4): o halo do ponto sai dele. Era a PSF
   *  do material do campo de catálogo — mesma conta, dono errado. */
  psf: CalibracaoDaCasa;
  /** a câmera SALTOU neste quadro (portal, enquadramento, ?pos=): a
   *  cessão faz snap para o alvo em vez de animar através do salto —
   *  cicatriz "reset no salto de foco" do crossfade da Onda 3. */
  salto: boolean;
}

/** O que o tick devolve — o Director registra no palco e escreve a cessão. */
export interface EstadoDaTerra {
  /** mesh visível NESTE quadro (gate armado + textura pronta + ligado). */
  emQuadro: boolean;
  /** fetch de manifest/textura em voo — segura o sinal de captura. */
  carregando: boolean;
  /**
   * O GATE está ARMADO — o corpo DEVIA estar na tela, com ou sem
   * textura. Armado sem `emQuadro` e sem `carregando` é o FALLBACK FRIO
   * (textura que desistiu): o `captura` do Director segura a prontidão
   * nesse estado em vez de fotografar o ponto fingindo globo (auditoria
   * item 5b; precedente `sun.assentado`).
   */
  gateArmado: boolean;
  /**
   * A CESSÃO SUAVE do ponto da camada planetas (F2b/D5): 0 = ponto
   * inteiro, 1 = ponto apagado, contínua no meio — g(razão de
   * dominância) integrada no tempo por `stepRampToward`. 0 EXATO com o
   * mesh fora de quadro (fator (1 − aCede) = 1 em IEEE754 — é o que
   * mantém as vistas profundas bit-idênticas) e 1 EXATO com o globo
   * dominando (r ≥ 2,5 — o estado das vistas `terra`/`terranb`).
   */
  cede: number;
  /** a cessão ainda está ANDANDO rumo ao alvo — imagem mudando por
   *  construção; o Director zera a contagem de estabilidade enquanto
   *  isto for true. */
  emRampa: boolean;
  raioPc: number;
  /** centro em pc na cena — referência VIVA, só leitura. */
  centroPc: THREE.Vector3;
  diametroPx: number;
}

/** Só o bloco comum de textura (`OpcoesDeTextura`) — a Terra não pede
 *  nada além dele. O tier como FUNÇÃO e o porquê moram lá. */
export type OpcoesDaTerra = OpcoesDeTextura;

export class TerraResolvida {
  /** o nó do palco — o Director pendura em `palco.group`. */
  readonly group = new THREE.Group();

  /** centro em pc (float64 no JS — a matriz nasce em CPU). */
  private readonly centro = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private jdEscrito = Number.NaN;
  /** a FONTE do último cálculo entra na chave do cache: a efeméride
   *  chega TARDE (?jd= no boot) e o mesmo jd com fonte nova tem de
   *  recomputar — senão o globo ficaria no retrato para sempre. */
  private fonteEscrita: FonteDeEfemerides | null = null;
  private rUA = Number.NaN;
  private armado = false;

  /** a sombra do eclipse (F2c), resolvida no cache de jd/fonte —
   *  scratch único, preenchido por `resolveSombraNaCena` (out-parameter) */
  private readonly sombra = criaSombraNaCena();

  private texturas: EstadoDasTexturas = 'fria';
  /** recargas já gastas depois de falha — ver RECARGAS_ATE_DESISTIR */
  private recargas = 0;
  private readonly texturasVivas: THREE.Texture[] = [];
  private disposto = false;

  private geometria: THREE.SphereGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private nuvens: THREE.Mesh | null = null;
  private atmosfera: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;
  private matNuvens: THREE.ShaderMaterial | null = null;
  private matAtmosfera: THREE.ShaderMaterial | null = null;

  // rascunhos reusados — zero alocação por quadro (M4 da casa)
  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vEscala = new THREE.Vector3();
  private readonly mRot = new THREE.Matrix4();
  private readonly estado: EstadoDaTerra;

  /** o estado do último tick, para quem enquadra (a escada, F2b) —
   *  somente leitura; o centro é a referência VIVA. */
  get estadoVivo(): Readonly<EstadoDaTerra> {
    return this.estado;
  }

  private readonly opcoes: OpcoesDaTerra;

  constructor(opcoes: OpcoesDaTerra) {
    this.opcoes = opcoes;
    // O fluxo metalness da casa entra como o caso ESPECIALIZADO
    // metalness = 0 (F0 = 0,04 dielétrico): este material não tem ramo
    // de condutor. Se a calibração central um dia mudar, isto vira erro
    // alto em vez de um shader silenciosamente errado.
    if (CALIBRACAO_ATLAS.DEFAULT_PLANET_METALNESS !== 0) {
      throw new Error(
        'terra.ts assume DEFAULT_PLANET_METALNESS = 0 (dielétrico puro); ' +
          'o ramo de condutor não existe neste shader'
      );
    }
    this.group.visible = false;
    this.estado = {
      emQuadro: false,
      carregando: false,
      gateArmado: false,
      cede: 0,
      emRampa: false,
      raioPc: RAIO_EQ_TERRA_PC,
      centroPc: this.centro,
      diametroPx: Number.NaN,
    };
  }

  /**
   * O TICK. Ordem: posição (cache por jd, como o `escreverInstante`) →
   * diâmetro aparente → gate binário → gatilho de textura → matrizes e
   * uniforms (só com o mesh em quadro). Devolve o estado para o Director
   * registrar a superfície no palco e escrever a cessão na camada de
   * planetas — a Terra não conhece nem o palco nem a camada.
   */
  atualizar(q: QuadroDaTerra): EstadoDaTerra {
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
      if (!q.fonte && q.centroPinadoPc) {
        this.centro.copy(q.centroPinadoPc);
        this.rUA = this.centro.length() / AU_PARA_PC;
        this.sombra.ativo = false;
      } else {
        const p = posicaoDaTerraUA(q.jdTdb, q.fonte);
        this.rUA = Math.hypot(p.x, p.y, p.z);
        // a MESMA ponte de frame da camada de planetas (D1): uma rotação e
        // uma multiplicação — nenhum segundo caminho de comprimento.
        const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
        this.centro.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
        // O ECLIPSE (F2c/D3): o par da TABELA (earth ← moon), resolvido no
        // MESMO relógio do quadro e na MESMA base da efeméride. Sem fonte
        // viva não há Lua — e não há eclipse: o fator fica neutro.
        const eclipsadorId = PARES_DE_ECLIPSE.earth;
        if (q.fonte && eclipsadorId) {
          const pEcl = q.fonte.posicaoHeliocentrica(eclipsadorId, q.jdTdb);
          resolveSombraNaCena(
            'earth',
            [p.x, p.y, p.z],
            [pEcl.x, pEcl.y, pEcl.z],
            this.sombra
          );
        } else {
          this.sombra.ativo = false;
        }
      }
    }

    const dPc = q.camPosPc.distanceTo(this.centro);
    const diametroPx = diametroAparentePx(
      RAIO_EQ_TERRA_PC,
      dPc,
      q.screenHPx,
      q.fovDeg
    );
    e.diametroPx = diametroPx;

    this.armado = gateBinario(this.armado, diametroPx);

    // O GATILHO da carga (lei 4 do cabeçalho): gate armado OU fase atlas.
    // Nunca outro caminho — o teste pina exatamente esta dupla.
    if (this.texturas === 'fria' && (this.armado || q.atlasQuente)) {
      this.iniciarCarga();
    }

    const emQuadro = this.armado && q.ligado && this.texturas === 'pronta';
    e.emQuadro = emQuadro;
    e.carregando = this.texturas === 'buscando';
    e.gateArmado = this.armado;
    this.group.visible = emQuadro;

    // A CESSÃO SUAVE (F2b/D5). O halo do ponto sai do ESPELHO da PSF com
    // a magnitude que a camada de planetas está desenhando AGORA — mesma
    // base (efeméride viva quando há fonte, retrato quando não há),
    // mesma fase Lambertiana, mesma exposição do campo. A razão
    // mesh/halo vira alvo por g(r) e o alvo vira estado por
    // `stepRampToward` (clamp de dt lá dentro); salto de foco (portal,
    // enquadramento, ?pos=) ou de data faz SNAP — animar um crossfade
    // através de um teletransporte é mentir movimento que não houve.
    const base = q.fonte
      ? aMagBaseDe(FOTOMETRIA.earth.H, this.rUA) + DESLOCAMENTO_UA_PARA_PC
      : A_MAG_BASE_PC.earth;
    const fase = faseDoVertice(
      this.centro.x, this.centro.y, this.centro.z,
      q.camPosPc.x, q.camPosPc.y, q.camPosPc.z
    );
    const halo = psfPointSizePx(
      magDoVertice(base, dPc, fase),
      q.psf.expoM0,
      q.psf.sigmaPx,
      q.screenHPx
    );
    const alvo = cessaoAlvo(emQuadro, diametroPx, halo);
    e.cede =
      q.salto || saltoDeData
        ? alvo
        : stepRampToward(e.cede, alvo, q.dtS, RAMP_DURATION_MS);
    e.emRampa = e.cede !== alvo;

    if (emQuadro) this.posicionar(q);
    return e;
  }

  /** matrizes + uniforms do quadro — só roda com o mesh em quadro. */
  private posicionar(q: QuadroDaTerra) {
    const { colunaX, colunaY, colunaZ, wRad } = orientacaoDaTerraNaCena(this.jdEscrito);
    this.vX.set(colunaX[0], colunaX[1], colunaX[2]);
    this.vY.set(colunaY[0], colunaY[1], colunaY[2]);
    this.vZ.set(colunaZ[0], colunaZ[1], colunaZ[2]);

    const sup = this.superficie!;
    sup.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.set(RAIO_EQ_TERRA_PC, RAIO_POLAR_TERRA_PC, RAIO_EQ_TERRA_PC))
      .setPosition(this.centro);

    // nuvens: mesma base, giro EXTRA de (1,03 − 1)·W em torno do polo —
    // a deriva do espec, montada sobre o W desenrolado (nunca sobre um
    // ângulo enrolado; ver DERIVA_DAS_NUVENS).
    const derivaRad = (DERIVA_DAS_NUVENS - 1) * wRad;
    const nuv = this.nuvens!;
    nuv.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .multiply(this.mRot.makeRotationY(derivaRad))
      .scale(
        this.vEscala.set(
          RAIO_EQ_TERRA_PC * RAZAO_CASCA_NUVENS,
          RAIO_POLAR_TERRA_PC * RAZAO_CASCA_NUVENS,
          RAIO_EQ_TERRA_PC * RAZAO_CASCA_NUVENS
        )
      )
      .setPosition(this.centro);

    // atmosfera: casca ESFÉRICA declarada (o achatamento de 0,3% é
    // invisível no glow e pouparia o shader de um elipsoide inteiro)
    const atm = this.atmosfera!;
    atm.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.setScalar(RAIO_EQ_TERRA_PC * RAZAO_CASCA_ATMOSFERA))
      .setPosition(this.centro);

    // ---- frame local (CPU em float64): câmera em raios, Sol unitário
    // A EXPOSIÇÃO DA VISITA (item 91, reescrita no 93): em `assistida` o
    // Sol do globo vale 1 literal, como no Eyes; em `real` é E(d) bit a
    // bit. A Terra deixou de ser bit-idêntica ao pré-91 — a âncora valia
    // ~1 e agora vale 1 exato, e a lanterna e a logística movem o resto.
    // É o preço declarado de copiar a receita. Ver `luzDaVisita.ts`.
    const ganho = ganhoDoGlobo(this.rUA, q.politica);

    // direção Terra→Sol na cena: o Sol é a ORIGEM (−centro normalizado)
    const dirSol = this.vTmp.copy(this.centro).multiplyScalar(-1);
    const norma = Math.max(dirSol.length(), 1e-30);
    dirSol.multiplyScalar(1 / norma);
    const sLx = dirSol.dot(this.vX);
    const sLy = dirSol.dot(this.vY);
    const sLz = dirSol.dot(this.vZ);

    const delta = this.vTmp.copy(q.camPosPc).sub(this.centro);
    const cLx = delta.dot(this.vX) / RAIO_EQ_TERRA_PC;
    const cLy = delta.dot(this.vY) / RAIO_EQ_TERRA_PC;
    const cLz = delta.dot(this.vZ) / RAIO_EQ_TERRA_PC;

    const uS = this.matSuperficie!.uniforms;
    (uS.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (uS.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    uS.uLuzGanho.value = ganho;
    // a lanterna de leitura e o `s` do terminador (item 93) — SÓ na
    // superfície: as cidades, as nuvens e o Nishita ficam como estavam,
    // que é o que o contrato manda.
    escreverLuzDaVisita(uS, q.politica, 0, q.calibracao);
    // a sombra do eclipse (F2c) — resolvida no cache de jd; aqui só vira
    // uniform, no frame local pela mesma base do uDirSolLocal
    escreverSombraDeEclipse(uS, this.sombra, this.vX, this.vY, this.vZ, 0);

    // a casca das nuvens tem o frame RODADO pela deriva: desfaz Ry(θ)
    const cosD = Math.cos(derivaRad);
    const sinD = Math.sin(derivaRad);
    const uN = this.matNuvens!.uniforms;
    (uN.uDirSolLocal.value as THREE.Vector3).set(
      sLx * cosD - sLz * sinD,
      sLy,
      sLx * sinD + sLz * cosD
    );
    uN.uLuzGanho.value = ganho;
    escreverSombraDeEclipse(uN, this.sombra, this.vX, this.vY, this.vZ, derivaRad);

    const uA = this.matAtmosfera!.uniforms;
    (uA.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (uA.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    uA.uLuzGanho.value = ganho;
    // ITEM 95: a MESMA sombra do chão, pela MESMA base e sem deriva — a
    // casca de atmosfera é esférica e não gira com as nuvens.
    escreverSombraDeEclipse(uA, this.sombra, this.vX, this.vY, this.vZ, 0);
  }

  /** geometria + materiais + meshes, UMA vez, na primeira necessidade. */
  private garantirCascas() {
    if (this.geometria || this.disposto) return;
    // uma geometria unitária para as três cascas — o raio mora na matriz
    this.geometria = new THREE.SphereGeometry(1, 128, 64);

    const achat = RAIO_POLAR_TERRA_PC / RAIO_EQ_TERRA_PC;
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: TERRA_VERT,
      fragmentShader: TERRA_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        uMapaNoite: { value: null },
        uMapaNormal: { value: null },
        uMapaRugosidade: { value: null },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        uNoiteGanho: { value: CALIBRACAO_ATLAS.EARTH_NIGHT_LIGHT_INTENSITY },
        uNormalEsc: { value: new THREE.Vector3(1, 1 / achat, 1) },
        uEscalaLocal: { value: new THREE.Vector3(1, achat, 1) },
        ...uniformsDaLuzDaVisita(),
        ...uniformsDeEclipseNeutros(),
      },
      // a composição da F0: o corpo resolvido é OPACO e escreve o único
      // depth da casa — a lista opaca desenha antes da transparente por
      // construção do three.
      depthWrite: true,
      depthTest: true,
      transparent: false,
    });
    this.superficie = new THREE.Mesh(this.geometria, this.matSuperficie);
    // globo opaco = ocultador do rascunho do campo (item 47): estrela
    // atrás dele não deposita clarão. Anel/atmosfera/nuvens ficam fora.
    this.superficie.layers.enable(CAMADA_DOS_OCULTADORES);
    this.superficie.matrixAutoUpdate = false;

    this.matNuvens = new THREE.ShaderMaterial({
      vertexShader: TERRA_VERT,
      fragmentShader: NUVENS_FRAG,
      uniforms: {
        uMapaNuvens: { value: null },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uLuzGanho: { value: 1 },
        ...uniformsDeEclipseNeutros(),
      },
      // translúcida SOBRE a superfície: testa o depth do globo, nunca o
      // escreve (decisão do palco, F0)
      depthWrite: false,
      depthTest: true,
      transparent: true,
    });
    this.nuvens = new THREE.Mesh(this.geometria, this.matNuvens);
    this.nuvens.matrixAutoUpdate = false;
    this.nuvens.renderOrder = 8;

    this.matAtmosfera = new THREE.ShaderMaterial({
      vertexShader: ATMOSFERA_VERT,
      fragmentShader: ATMOSFERA_FRAG,
      uniforms: uniformsDaAtmosfera(),
      // aditiva, face de TRÁS (o desenho clássico do sky-from-space):
      // o fragmento é a SAÍDA do raio da casca, então o caminho
      // integrado é a corda inteira da atmosfera — na face da frente o
      // fragmento É a entrada e o caminho colapsa a zero (medido nesta
      // fase: limbo de 2/255, atmosfera invisível). Sobre o disco os
      // fragmentos de trás morrem no depth da superfície (depthTest
      // true): o que sobra é o anel de limbo, azul-dominante e fino —
      // a dose honesta. Nunca escreve depth.
      // ECLIPSE (F2c, corrigido no item 95): a atmosfera RECEBE o
      // fator, amostra a amostra dentro do laço de Nishita. A omissão
      // antiga dizia que o anel de limbo ficava sempre além da
      // penumbra; ela estava errada — a penumbra tem r ≈ 3.400 km e
      // cobre meio disco, e num eclipse RASANTE o cilindro de sombra
      // se deita justamente sobre o limbo, que é onde a casca é
      // brilhante. O cobre de Danjon do eclipse lunar continua nascendo
      // no shader da LUA (o piso umbral da lib), não aqui: com a Lua
      // eclipsando a Terra o piso é neutro por `pisoUmbralDoEclipsador`.
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      side: THREE.BackSide,
    });
    this.atmosfera = new THREE.Mesh(this.geometria, this.matAtmosfera);
    this.atmosfera.matrixAutoUpdate = false;
    this.atmosfera.renderOrder = 9;

    this.group.add(this.superficie, this.nuvens, this.atmosfera);
  }

  /** a carga preguiçosa — a transação mora em `carregarCanaisDoCorpo`;
   *  o que fica aqui é o estado do corpo e a publicação nos uniforms. */
  private iniciarCarga() {
    this.texturas = 'buscando';
    void carregarCanaisDoCorpo('earth', PEDIDO_DA_TERRA, this.opcoes, () => this.disposto)
      .then((porCanal) => {
        // cancelada no caminho: o lote já foi descartado lá dentro
        if (!porCanal) return;
        // e o microtask entre a chegada e esta linha ainda cabe um
        // `dispose()` do Director — o lote não fica sem dono
        if (this.disposto) {
          for (const t of porCanal.values()) t.dispose();
          return;
        }
        this.garantirCascas();
        const uS = this.matSuperficie!.uniforms;
        uS.uMapaDia.value = porCanal.get('map');
        uS.uMapaNoite.value = porCanal.get('night');
        uS.uMapaNormal.value = porCanal.get('normal');
        uS.uMapaRugosidade.value = porCanal.get('roughness');
        this.matNuvens!.uniforms.uMapaNuvens.value = porCanal.get('clouds');
        this.texturasVivas.push(...porCanal.values());
        this.texturas = 'pronta';
      })
      .catch(() => {
        if (this.disposto) return;
        const r = estadoAposFalha(this.recargas, 'terra', 'o globo não nasce nesta sessão');
        this.recargas = r.recargas;
        this.texturas = r.texturas;
      });
  }

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    this.matNuvens?.dispose();
    this.matAtmosfera?.dispose();
    for (const t of this.texturasVivas) t.dispose();
    this.texturasVivas.length = 0;
  }
}
