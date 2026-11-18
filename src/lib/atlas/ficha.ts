// ============================================================
// A FICHA DE UM CORPO — a montagem, e só ela.
//
// O ANTI-PADRÃO QUE ESTE ARQUIVO EXISTE PARA NÃO REPETIR está nomeado no
// `docs/NORTE.md` e é literalmente o painel do doador: `Sidebar.tsx`, 778
// linhas em que vis-viva, parser de sobrescrito Unicode e Tailwind moram no
// mesmo corpo. Aqui a conta e o texto ficam deste lado — sem three, sem
// React, testável em milissegundos —, e `FichaDoObjeto.tsx` só desenha o que
// sair daqui.
//
// SETE SEÇÕES NA ORDEM DO INTERESSE, que é a lição que o doador aprendeu
// tarde ("live state first, reference after"): o que está acontecendo AGORA,
// depois o corpo, depois a órbita, depois o céu, e só então a enciclopédia —
// e a imagem, que é a única que fala do INSTRUMENTO e não do mundo. A ficha
// de ESTRELA tem UMA seção e nenhuma dessas: ela vive de catálogo, e o que
// se escrevesse de prosa sobre as 1.726 nomeadas seria inventado.
//
// CAMPO AUSENTE NÃO VIRA LINHA. Nunca "N/A", nunca "—", nunca zero no lugar
// de uma medida que não existe. Makemake não tem massa no kernel: a ficha
// dele simplesmente não tem a linha da massa. Seção que ficou sem nenhuma
// linha não é desenhada.
//
// E O INGLÊS CHEGA AQUI DESDE O ITEM 130/F2. Os campos editoriais dos 48
// corpos com ficha nasceram em inglês, escritos pelo dono no projeto doador,
// e o pt-BR é que foi traduzido deles; o gerador media uma língua contra a
// outra e jogava o inglês fora. Agora `corpos.json` traz as DUAS, e
// `editorialDoIdioma` escolhe. O pt-BR é o PISO: corpo sem `en` cai nele em
// vez de perder a seção, porque uma ficha muda é pior que uma ficha na outra
// língua. Onde faltarem as duas, a linha SOME, como sempre.
//
// UM VOCABULÁRIO DE PROCEDÊNCIA SÓ: os três tiers de `selo.ts`
// (`medido | derivado | artistico`). O doador tinha quatro rótulos próprios
// ("measured asset", "observational model", "interpretive", "procedural") e
// trazê-los criaria a segunda fonte de verdade sobre honestidade nesta casa.
//
// A GRAFIA NÃO NASCE AQUI. `lib/unidades.ts` decide o degrau da distância
// (`notaDeDistancia`) e a vírgula das três grandezas que a ficha escreve —
// `comCasas`, `formatarMassaKg`, `formatarRazaoTerra` —, e `numeroDoIdioma`
// (`three/tempoDoAtlas`) é o formatador injetado. Quem escrever aqui uma
// formatação nova está criando bug, não exceção.
// ============================================================
import {
  comCasas,
  formatarMassaKg,
  formatarRazaoTerra,
  notaDeDistancia,
  UA_POR_PC,
} from '../unidades';
import {
  BORDA_DA_MANCHA_FRIA,
  LEI_DA_ATMOSFERA,
  LEI_DO_CONTRASTE,
  LAMBDA_DO_VISIVEL_UM,
  escuroDaRegiaoFria,
  pesoDaLisa,
  pesoDoPico,
  razaoDePlanckNaBanda,
  regraDaForja,
} from '../../three/world/forjaDaEstrela';
import { fracaoDesenhadaDoVento, raioDaLinhaDe, razaoARigel, ventoDaFicha } from '../../three/world/ventoDaEstrela';
import { NOMES_DOS_CORPOS, classeEmTexto, nomeDoCorpo } from '../../three/atlasConfig';
import { decimalDoIdioma, idiomaAtual, t, type ChaveDeTexto } from '../idioma';
import type { Procedencia } from '../../three/selo';
import { numeroDoIdioma } from '../../three/tempoDoAtlas';
import { AU_KM } from './elementosOrbitais';
import {
  gravidadeSuperficie,
  massaDeGm,
  raioEquatorialKm,
  razaoTerra,
  velocidadeDeEscape,
} from './fisicaDoCorpo';
import { geometriaNoCeu, quemTemGeometriaNoCeu } from './geometriaNoCeu';
import { IAU_ORIENTATIONS } from './iauOrientation';
import type { PosicaoEcliptica } from './kepler';
import { REGISTRO_ORBITAL } from './registroOrbital';
import { designacaoDeBayer } from './constelacoes';
import { temperatureFromBV } from './stellarPhysics';
import {
  TEFF_DO_SOL_K,
  achatamentoDe,
  estrelaVisitavelPorNome,
  logGravidade,
  celulaQuenteDe,
  temDinamoSolar,
  type Achatamento,
  type EscurecimentoMedido,
  type EstrelaVisitavel,
  type Numero,
} from './estrelasVisitaveis';
import { ehCompanheiraDesenhada, estrelaDoCatalogo } from './estrelaDoCatalogo';
import type { NamedStar } from '../../three/config';
import type { LugarDoCeu } from '../lugaresDoFilme';
import type { Sonda } from '../sondas';
import { CONSULTADO_EM, estadoDaSonda, janelaDaSonda } from '../sondas';
import type { Cometa } from '../cometas';
import {
  EXOPLANETAS_CONSULTADOS_EM,
  FONTES_DA_CLASSE,
  FONTE_DA_ZONA_HABITAVEL,
  HZ_TEFF_VALIDA,
  INCLINACAO_CONVENCIONAL_GRAUS,
  climaDoExoplaneta,
  ehAnfitriaAcrescentada,
  giroDoExoplaneta,
  geometriaDoPlaneta,
  sistemaDaEstrela,
  zonaHabitavel,
  type Exoplaneta,
  type SistemaPlanetario,
} from '../exoplanetas';
import {
  COMETAS_CONSULTADOS_EM,
  LIMIAR_DE_ATIVIDADE,
  brilhoRelativo,
  conjuntoVigente,
  estadoDoCometa,
  nomeConhecido,
  perieliosEmVolta,
  periodoEmDias,
} from '../cometas';
import { REGUA_DOS_MAPAS, alvoDoMapa, type Matiz, type MedidaDoCorpo } from './reguaDosMapas';
import RELATORIO_DA_REGUA from './reguaDosMapas.relatorio.json';
import type {
  EntradaDeTextura,
  ManifestDeTexturas,
  PartesDoSelo,
  TextoBilingue,
} from '../../three/world/corpos/texturas';

// ---------------------------------------------------------------- formas

/** Uma linha da ficha: rótulo à esquerda, valor à direita, procedência. */
export interface LinhaDaFicha {
  rotulo: string;
  valor: string;
  /** o "×Terra", quando ele carrega informação (ver `razaoTerra`) */
  badge?: string;
  /**
   * o selo; AUSENTE só na seção da imagem — no crédito (fonte, licença,
   * atribuição), que não confessa nada, e na linha que não se aplica
   */
  procedencia?: Procedencia;
  /**
   * AS PARTES DO SELO, só na linha mista da imagem (16/10/2026): cada tier
   * presente, de medido a artístico, com a porcentagem da área já escrita na
   * língua de agora. Ausente, o selo é o de um tier só, como sempre; com
   * elas, `procedencia` continua sendo o mais fraco.
   */
  partes?: { procedencia: Procedencia; texto: string }[];
  /** de onde veio o número, em quatro ou cinco palavras */
  fonte?: string;
}

export type IdDeSecao =
  | 'agora'
  | 'fisico'
  /** a dos ANÉIS de Saturno (16/11/2026) — números da literatura */
  | 'aneis'
  | 'orbita'
  | 'ceu'
  | 'contexto'
  | 'curiosidades'
  | 'imagem'
  /** a única de ESTRELA — as outras sete são todas de corpo */
  | 'estrela'
  /** a de um LUGAR do céu (céu profundo, 12/11/2026) */
  | 'lugar'
  /** as duas de uma SONDA (pilar 4, 12/11/2026) */
  | 'sonda'
  | 'missao'
  /** a companheira de uma estrela do piloto (Sirius B) */
  | 'companheira'
  /** as três de um COMETA (pilar 4, 12/11/2026) */
  | 'cometa'
  | 'orbitaDoCometa'
  | 'oCometa'
  /** a do sistema planetário de uma anfitriã, e as duas de um EXOPLANETA
   *  (12/11/2026) */
  | 'sistemaPlanetario'
  | 'exoplaneta'
  | 'oQueSeVe';

export interface SecaoDaFicha {
  id: IdDeSecao;
  titulo: string;
  linhas: LinhaDaFicha[];
}

export interface Ficha {
  id: string;
  /** o nome que o visitante lê, na língua de agora (item 130/F2) */
  nome: string;
  /** a palavra que diz o que ele é, no vocabulário da legenda */
  classe: string;
  secoes: SecaoDaFicha[];
}

/** O editorial de um corpo, como ele sai de `public/data/atlas/corpos.json`. */
export interface EditorialDoCorpo {
  description?: string;
  curiosity?: string;
  facts?: string[];
  records?: string[];
  explorationMilestone?: { year: number; description: string };
  info?: string;
}

export interface CorpoNoJson {
  id: string;
  type: string;
  name: { en: string; pt: string };
  orbita?: { periodoDias: number; minUa: number; maxUa: number };
  semAlvo?: boolean;
  /**
   * Só os 48 alvos têm; os seis sem alvo saem do gerador sem a chave. As
   * duas línguas trazem, POR CONSTRUÇÃO DO GERADOR, os mesmos campos e o
   * mesmo tamanho de lista — `en` é opcional aqui só para que um
   * `corpos.json` antigo, de antes do item 130/F2, ainda monte a ficha em
   * pt-BR em vez de quebrar.
   */
  editorial?: { pt: EditorialDoCorpo; en?: EditorialDoCorpo };
}

/**
 * A PROSA NA LÍNGUA DE AGORA, com o pt-BR de piso (item 130/F2). Chamada uma
 * vez por montagem de ficha, e o resultado atravessa as duas seções de prosa
 * — nenhuma delas pergunta a língua, que é o que as manteve puras.
 */
function editorialDoIdioma(corpo: CorpoNoJson | null | undefined): EditorialDoCorpo | undefined {
  const editorial = corpo?.editorial;
  if (!editorial) return undefined;
  return idiomaAtual() === 'en' ? (editorial.en ?? editorial.pt) : editorial.pt;
}

export interface CorposDoAtlas {
  corpos: CorpoNoJson[];
}

/**
 * O QUE A FICHA PRECISA DA EFEMÉRIDE — as quatro perguntas, e nada além
 * delas. `MotorEfemerides` satisfaz esta forma sem saber que ela existe, e é
 * assim que a montagem se testa sem carregar um `.bin` de 785 KB.
 */
export interface FonteDaFicha {
  posicao(bodyId: string, jdTdb: number): PosicaoEcliptica;
  velocidade(bodyId: string, jdTdb: number): PosicaoEcliptica;
  posicaoHeliocentrica(bodyId: string, jdTdb: number): PosicaoEcliptica;
  notaDeValidade(bodyId: string, jdTdb: number): TextoBilingue;
}

export interface EntradaDaFicha {
  id: string;
  /** o instante MOSTRADO pela máquina do tempo; sem ele não há "agora" */
  jd?: number | null;
  /** a efeméride viva; `null` antes de ela chegar pela rede */
  fonte?: FonteDaFicha | null;
  /** o corpo em `corpos.json`; `null` antes de o arquivo chegar */
  editorial?: CorpoNoJson | null;
  /** o manifesto de `texturas.json`; `null` antes de o arquivo chegar */
  texturas?: ManifestDeTexturas | null;
  /** onde a CÂMERA está, em eclíptica heliocêntrica UA; `null` fora do
   *  Atlas — é o "daqui" da linha de iluminação */
  camaraUa?: readonly [number, number, number] | null;
  /** o fator das alturas que a TELA desenha (item 232) — 1 (ou ausente)
   *  é o relevo medido; acima disso a seção da imagem confessa o realce */
  realceDoRelevo?: number;
}

// ------------------------------------------------------------ formatação

const HORAS_POR_DIA = 24;
const DIAS_POR_ANO = 365.25;

/**
 * Uma DURAÇÃO em pt-BR — horas abaixo de um dia, dias abaixo de dois anos,
 * anos acima. Serve ao período orbital e ao dia sideral, que são a mesma
 * grandeza vista de dois eixos.
 *
 * NÃO É O `formatarTaxa` de `tempoDoAtlas`, e a diferença não é de estilo:
 * aquele escreve uma RAZÃO ("2,8 horas por segundo"), começa em segundos e
 * tem nome próprio para o tempo real. Aqui o piso é a HORA — nenhum corpo do
 * catálogo gira ou orbita em minutos, e "27.383 segundos" não é uma resposta
 * para "quanto dura o dia dele".
 *
 * `export` é ARESTA DE TESTE: quem a consome é este arquivo (o período
 * orbital e o dia sideral), e o gate dela cobra os degraus — a meia hora, o
 * plural, a duração sem medida — que nenhum corpo do catálogo exercita.
 */
export function formatarDuracao(dias: number): string | null {
  if (!Number.isFinite(dias) || dias <= 0) return null;
  if (dias < 1) {
    const horas = dias * HORAS_POR_DIA;
    return `${numeroDoIdioma(horas)} ${t(horas >= 2 ? 'ficha.horas' : 'ficha.hora')}`;
  }
  if (dias < 2 * DIAS_POR_ANO) {
    return `${numeroDoIdioma(dias)} ${t(dias >= 2 ? 'ficha.dias' : 'ficha.dia')}`;
  }
  const anos = dias / DIAS_POR_ANO;
  return `${numeroDoIdioma(anos)} ${t('tempo.anos')}`;
}

const modulo = (v: PosicaoEcliptica) => Math.hypot(v.x, v.y, v.z);

/** UA/dia → km/s, o passe único desta casa entre as duas unidades. */
const KM_POR_S_POR_UA_DIA = AU_KM / 86_400;

// ------------------------------------------------------------- montagem

function linha(
  rotulo: string,
  valor: string | null | undefined,
  procedencia: Procedencia | null,
  fonte?: string,
  badge?: string | null
): LinhaDaFicha | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const feita: LinhaDaFicha = { rotulo, valor };
  if (procedencia) feita.procedencia = procedencia;
  if (fonte) feita.fonte = fonte;
  if (badge) feita.badge = badge;
  return feita;
}

/** O "×Terra" de um par de medidas, ou `undefined` quando não há selo. */
function selo(
  valor: number | null,
  daTerra: number | null
): string | undefined {
  const razao = razaoTerra(valor, daTerra);
  return razao === null ? undefined : formatarRazaoTerra(razao);
}

/**
 * QUANTO DO DISCO ESTÁ ILUMINADO VISTO DAQUI — "daqui" sendo a câmera, que
 * é o único ponto de vista que o visitante realmente tem.
 *
 * É A OUTRA PERGUNTA, e o cabeçalho de `geometriaNoCeu` já nomeia as duas: a
 * seção "no céu" responde "dá para ver isso hoje à noite?", medida DA TERRA;
 * esta linha responde "o que estou vendo agora?", medida do ponto em que a
 * câmera está. A conta é a mesma função, com outro observador — e é isso que
 * fazia dela uma armadilha: rodá-la com o vetor errado devolve um número
 * plausível e falso.
 *
 * VALE PARA TODO CORPO, e não só para os heliocêntricos: a fase de Titã
 * vista de perto é exatamente o que está na tela. `quemTemGeometriaNoCeu` é
 * a régua da outra pergunta (lá "Titã a 46,2°" ao lado de "Saturno a 46,1°"
 * seria ruído), e não desta.
 */
function iluminacaoDaqui(entrada: EntradaDaFicha): string | null {
  const { id, jd, fonte, camaraUa } = entrada;
  if (!fonte || !camaraUa || jd === null || jd === undefined || !Number.isFinite(jd)) {
    return null;
  }
  if (id === 'sun') return null;
  let geometria: ReturnType<typeof geometriaNoCeu> = null;
  try {
    geometria = geometriaNoCeu(fonte.posicaoHeliocentrica(id, jd), {
      x: camaraUa[0],
      y: camaraUa[1],
      z: camaraUa[2],
    });
  } catch {
    return null;
  }
  return geometria === null
    ? null
    : `${Math.round(geometria.fracaoIluminada * 100)}%`;
}

function secaoAgora(entrada: EntradaDaFicha): LinhaDaFicha[] {
  const { id, jd, fonte } = entrada;
  if (!fonte || jd === null || jd === undefined || !Number.isFinite(jd)) return [];
  const registro = REGISTRO_ORBITAL[id];
  if (!registro || id === 'sun') return [];
  const pai = nomeDoCorpo(registro.centro) ?? registro.centro;

  let distancia: string | null = null;
  let velocidade: string | null = null;
  try {
    distancia = notaDeDistancia(modulo(fonte.posicao(id, jd)), numeroDoIdioma);
    const v = modulo(fonte.velocidade(id, jd)) * KM_POR_S_POR_UA_DIA;
    velocidade = Number.isFinite(v) ? `${numeroDoIdioma(v)} km/s` : null;
  } catch {
    // FORA DA JANELA DA TABELA o motor LANÇA, de propósito (adaptação b de
    // `efemerides.ts`), e é a máquina do tempo que já avisa o visitante na
    // linha dela. A ficha some com as duas linhas em vez de repetir o aviso
    // ou, pior, imprimir um número extrapolado em silêncio.
    return [];
  }

  return [
    // em torno do Sol a linha diz o mesmo que a do cometa ("distância do Sol");
    // "Distância — Sol" na linha recolhida do celular lia como lista de campos
    linha(
      registro.centro === 'sun' ? t('ficha.cometa.doSol') : t('ficha.campo.distanciaDe', { pai }),
      distancia,
      'medido',
      registro.modelo
    ),
    linha(
      t('ficha.campo.velocidadeOrbital'),
      velocidade,
      'derivado',
      t('ficha.fonte.daEfemeride')
    ),
    linha(
      t('ficha.campo.iluminadoDaqui'),
      iluminacaoDaqui(entrada),
      'derivado',
      t('ficha.fonte.daCamera')
    ),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

function secaoFisico(id: string): LinhaDaFicha[] {
  const raio = raioEquatorialKm(id);
  const raioDaTerra = raioEquatorialKm('earth');
  const g = gravidadeSuperficie(id);
  const escape = velocidadeDeEscape(id);
  const massa = massaDeGm(id);
  const eDaTerra = id === 'earth';

  return [
    linha(
      t('ficha.campo.raio'),
      raio === null ? null : `${numeroDoIdioma(Math.round(raio))} km`,
      'medido',
      'IAU/WGCCRE, kernel pck00011',
      eDaTerra ? undefined : selo(raio, raioDaTerra)
    ),
    linha(
      t('ficha.campo.gravidade'),
      g === null ? null : `${numeroDoIdioma(g)} m/s²`,
      'derivado',
      t('ficha.fonte.deGmEDoRaio'),
      eDaTerra ? undefined : selo(g, gravidadeSuperficie('earth'))
    ),
    linha(
      t('ficha.campo.escape'),
      escape === null ? null : `${numeroDoIdioma(escape)} km/s`,
      'derivado',
      t('ficha.fonte.deGmEDoRaio'),
      eDaTerra ? undefined : selo(escape, velocidadeDeEscape('earth'))
    ),
    linha(
      t('ficha.campo.massa'),
      massa === null ? null : formatarMassaKg(massa),
      'derivado',
      t('ficha.fonte.deGm'),
      eDaTerra ? undefined : selo(massa, massaDeGm('earth'))
    ),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

/**
 * A MASSA DOS ANÉIS DE SATURNO, kg: 1,54 ± 0,49 × 10¹⁹, medida pela gravidade
 * nas órbitas finais da Cassini (Iess et al. 2019, Science 364, eaat2965).
 */
const MASSA_DOS_ANEIS_KG = 1.54e19;

/**
 * OS ANÉIS DE SATURNO (16/11/2026): o anel não é um lugar, é Saturno — os
 * números dele moram na ficha do planeta, da literatura, com a citação ao
 * lado, como os fatos de um lugar do céu (`lugaresDoFilme.ts`). Os mesmos
 * números que a cena desenha: o raio do anel F (`ANEL_SATURNO`), a camada
 * e os pedaços (`pedrasDoAnel.ts`). Vazia para os outros corpos.
 */
function secaoAneis(id: string): LinhaDaFicha[] {
  if (id !== 'saturn') return [];
  const mimas = massaDeGm('mimas');
  return [
    linha(t('ficha.anel.extensao'), t('ficha.anel.extensaoValor'), 'medido', t('ficha.anel.extensaoFonte')),
    linha(t('ficha.anel.espessura'), t('ficha.anel.espessuraValor'), 'derivado', 'Tiscareno et al. 2007; Colwell et al. 2009'),
    linha(t('ficha.anel.pedacos'), t('ficha.anel.pedacosValor'), 'derivado', 'Zebker et al. 1985; Cuzzi et al. 2009'),
    linha(
      t('ficha.campo.massa'),
      mimas === null
        ? null
        : t('ficha.anel.massaValor', {
            massa: formatarMassaKg(MASSA_DOS_ANEIS_KG) ?? '',
            fracao: numeroDoIdioma(Math.round((MASSA_DOS_ANEIS_KG / mimas) * 10) / 10),
          }),
      'medido',
      'Iess et al. 2019 (Science)'
    ),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

function secaoOrbita(entrada: EntradaDaFicha): LinhaDaFicha[] {
  const { id, jd, fonte, editorial } = entrada;
  if (id === 'sun') return [];
  const registro = REGISTRO_ORBITAL[id];
  const orbita = editorial?.orbita;
  const linhas: (LinhaDaFicha | null)[] = [];

  if (orbita) {
    const pai = nomeDoCorpo(registro?.centro ?? '') ?? registro?.centro;
    linhas.push(
      linha(
        t('ficha.campo.periodo'),
        formatarDuracao(orbita.periodoDias),
        'derivado',
        t('ficha.fonte.dosElementos')
      )
    );
    // AS DUAS PONTAS NUMA LINHA SÓ, porque é assim que se lê a órbita: "de
    // 29,7 a 49,1 UA" diz num golpe o que duas linhas de "periélio" e
    // "afélio" diriam em quatro. A escada de unidade é a mesma dos dois
    // lados — em par lua↔pai as duas saem em quilômetros.
    const min = notaDeDistancia(orbita.minUa, numeroDoIdioma);
    const max = notaDeDistancia(orbita.maxUa, numeroDoIdioma);
    if (min && max) {
      linhas.push(
        linha(
          t('ficha.campo.distanciaDe', { pai }),
          min === max ? min : t('ficha.valor.faixa', { min, max }),
          'derivado',
          t('ficha.fonte.minEMax')
        )
      );
    }
    const soma = orbita.maxUa + orbita.minUa;
    if (soma > 0) {
      linhas.push(
        linha(
          t('ficha.campo.excentricidade'),
          comCasas((orbita.maxUa - orbita.minUa) / soma, 3),
          'derivado',
          t('ficha.fonte.dosElementos')
        )
      );
    }
  }

  const iau = IAU_ORIENTATIONS[id];
  if (iau && iau.spinRateDegPerDay !== 0) {
    const dia = formatarDuracao(Math.abs(360 / iau.spinRateDegPerDay));
    linhas.push(
      linha(
        t('ficha.campo.diaSideral'),
        dia === null
          ? null
          : iau.spinRateDegPerDay < 0
            ? t('ficha.valor.retrogrado', { dia })
            : dia,
        'derivado',
        t('ficha.fonte.rotacaoIau')
      )
    );
  }

  // A JANELA DE VALIDADE é o outro braço do contrato de honestidade da
  // efeméride (`notaDeValidade`), e ela entra na ficha como entra em
  // qualquer lugar: inteira, sem resumo. A nota já nasce bilíngue no
  // `registroOrbital`; aqui só se escolhe a língua de agora.
  if (fonte && jd !== null && jd !== undefined && Number.isFinite(jd)) {
    try {
      linhas.push(
        linha(t('ficha.campo.modeloEValidade'), noIdioma(fonte.notaDeValidade(id, jd)), 'medido')
      );
    } catch {
      // corpo fora do registro: sem nota, sem linha
    }
  }

  return linhas.filter((l): l is LinhaDaFicha => l !== null);
}

function secaoCeu(entrada: EntradaDaFicha): LinhaDaFicha[] {
  const { id, jd, fonte } = entrada;
  if (!fonte || jd === null || jd === undefined || !Number.isFinite(jd)) return [];
  if (!quemTemGeometriaNoCeu(id)) return [];
  let geometria: ReturnType<typeof geometriaNoCeu> = null;
  try {
    geometria = geometriaNoCeu(
      fonte.posicaoHeliocentrica(id, jd),
      fonte.posicaoHeliocentrica('earth', jd)
    );
  } catch {
    return [];
  }
  if (!geometria) return [];
  const FONTE = t('ficha.fonte.geometrico');
  return [
    linha(
      t('ficha.campo.elongacao'),
      `${numeroDoIdioma(geometria.elongacaoDeg)}°`,
      'derivado',
      FONTE
    ),
    linha(
      t('ficha.campo.discoIluminado'),
      `${Math.round(geometria.fracaoIluminada * 100)}%`,
      'derivado',
      FONTE
    ),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

/**
 * AS DUAS SEÇÕES DE PROSA. Elas leem O EDITORIAL JÁ ESCOLHIDO e mais nada —
 * e é por isso que a parte B do item 74 foi DADO e não código, e que a F2 do
 * item 130 também foi: o arquivo de tradução nasceu, o gerador o fundiu,
 * depois o inglês voltou a atravessar, e estas funções seguem sem saber que
 * existe língua. Quem escolhe é `editorialDoIdioma`, uma vez por ficha.
 */
function secaoContexto(pt: EditorialDoCorpo | undefined): LinhaDaFicha[] {
  if (!pt) return [];
  return [
    linha(t('ficha.campo.oQueE'), pt.description, 'derivado', t('ficha.fonte.editorial')),
    linha(t('ficha.campo.emUmaLinha'), pt.info, 'derivado', t('ficha.fonte.editorial')),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

function secaoCuriosidades(pt: EditorialDoCorpo | undefined): LinhaDaFicha[] {
  if (!pt) return [];
  const linhas: (LinhaDaFicha | null)[] = [
    linha(t('ficha.campo.curiosidade'), pt.curiosity, 'derivado', t('ficha.fonte.editorial')),
  ];
  for (const fato of pt.facts ?? []) {
    linhas.push(linha(t('ficha.campo.fato'), fato, 'derivado', t('ficha.fonte.editorial')));
  }
  for (const recorde of pt.records ?? []) {
    linhas.push(
      linha(t('ficha.campo.recorde'), recorde, 'derivado', t('ficha.fonte.editorial'))
    );
  }
  if (pt.explorationMilestone) {
    linhas.push(
      linha(
        t('ficha.campo.exploracao'),
        `${pt.explorationMilestone.year}: ${pt.explorationMilestone.description}`,
        'derivado',
        t('ficha.fonte.editorial')
      )
    );
  }
  return linhas.filter((l): l is LinhaDaFicha => l !== null);
}

/**
 * A FONTE DE UM CANAL, entre as variantes que o manifesto lista: a mais
 * LARGA, que é a que o crédito cita. `origem`, `nota` e `seloDaNota` são
 * idênticos em todas as variantes (o mapa de Ceres confessa o tingimento
 * também em 512 px); quem varia é a `proveniencia` do reencode, e ela não
 * sai mais na ficha — desde a R3 o crédito não leva selo.
 */
function fonteDoCanal(
  entradas: readonly EntradaDeTextura[],
  corpo: string,
  canal: string
): EntradaDeTextura | null {
  let melhor: EntradaDeTextura | null = null;
  for (const e of entradas) {
    if (e.corpo !== corpo || e.canal !== canal) continue;
    if (!melhor || e.larguraPx > melhor.larguraPx) melhor = e;
  }
  return melhor;
}

/**
 * O TIER DA CONFISSÃO na língua do selo: `inventado` é o artístico. Nota
 * sem selo é manifesto malformado (ou anterior ao selo, como a forma até a
 * R3) e cai no mesmo tier — quem não fechou o selo não chama a frase de
 * medida.
 */
const TIER_DA_NOTA: Record<NonNullable<EntradaDeTextura['seloDaNota']>, Procedencia> = {
  medido: 'medido',
  derivado: 'derivado',
  inventado: 'artistico',
};

/** Do mais fraco ao mais forte: o selo de uma linha é o do mais fraco que ela confessa. */
const FORCA_DO_TIER: Record<Procedencia, number> = { artistico: 0, derivado: 1, medido: 2 };

/** O mais fraco de uma lista de tiers; a lista vazia não confessa defeito nenhum. */
function oMaisFraco(tiers: readonly Procedencia[]): Procedencia {
  return tiers.reduce<Procedencia>(
    (fraco, tier) => (FORCA_DO_TIER[tier] < FORCA_DO_TIER[fraco] ? tier : fraco),
    'medido'
  );
}

/** A ordem das partes na tela: do mais forte ao mais fraco. */
const ORDEM_DAS_PARTES = ['medido', 'derivado', 'inventado'] as const;

/**
 * O SELO EM PARTES (16/10/2026, decisão do dono: "mostrar o selo junto com
 * a porcentagem, em todos os corpos"): a linha mista leva cada tier
 * presente com a porcentagem da área, de medido a artístico. O `teto` é o
 * tier mais forte que a linha admite — a política da régua, na cor: uma
 * parte medida num mapa tingido é derivada, e as partes que caem no mesmo
 * tier se somam. Sobrando um tier só, a linha fica como sempre, sem partes.
 */
function comPartes(
  feita: LinhaDaFicha | null,
  partes: PartesDoSelo | undefined,
  teto: Procedencia = 'medido'
): LinhaDaFicha | null {
  if (!feita || !partes) return feita;
  const porTier = new Map<Procedencia, number>();
  for (const selo of ORDEM_DAS_PARTES) {
    const porcento = partes[selo];
    if (porcento === undefined) continue;
    const tier = oMaisFraco([TIER_DA_NOTA[selo], teto]);
    porTier.set(tier, (porTier.get(tier) ?? 0) + porcento);
  }
  if (porTier.size < 2) return feita;
  feita.partes = [...porTier].map(([procedencia, porcento]) => ({
    procedencia,
    texto: t('ficha.parteDoSelo', {
      tier: t(`selo.tier.${procedencia}` as 'selo.tier.medido'),
      porcento: decimalDoIdioma(String(Math.round(porcento * 10) / 10)),
    }),
  }));
  return feita;
}

/**
 * A POLÍTICA DA RÉGUA (`matiz`, reguaDosMapas.ts) na língua do selo: a foto
 * em cor verdadeira só tem a média movida para a medida; a tinta é o
 * desenho da foto em cinza tingido pela cor medida, um método declarado;
 * a família esculpida não tem mapa nenhum por baixo.
 */
const TIER_DA_POLITICA: Record<Matiz, Procedencia> = {
  foto: 'medido',
  tinta: 'derivado',
  esculpido: 'artistico',
};

/** O γ que a cadeia mediu em cada mapa; as esculpidas não têm mapa, nem γ. */
const GAMA_DA_REGUA: Readonly<Partial<Record<string, { gama: number }>>> = RELATORIO_DA_REGUA;

/**
 * O FATOR DO PICO POR MODELO: a tabela da régua marca no texto da fonte os
 * S de H,G (Bowell 1989), que são modelo e não medida — "S(H,G)",
 * "S(H,G), G = 0.32".
 */
const PICO_POR_MODELO = /H,G/;

/**
 * ONDE O QUE SE VÊ É ATMOSFERA: os quatro gigantes, o topo de nuvens de
 * Vênus e a névoa de Titã. Para eles a linha do relevo não se aplica — o
 * chão, mesmo onde o radar o mediu, não aparece na imagem —, e dizer
 * "liso" confessaria a falta de um mapa que nada mudaria na tela.
 */
const SO_ATMOSFERA = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'titan']);

/**
 * A FRASE DO MANIFESTO NA LÍNGUA DE AGORA (item 130/F4), com o pt-BR de
 * PISO — o mesmo molde de `editorialDoIdioma`. Fonte, licença, atribuição,
 * defeito e forma são texto de tela que nasce fora do código: a tabela
 * `ORIGENS` do gerador e o `docs/reference/ASSETS.md`. Manifesto sem `en`
 * (ou de antes desta fase) cai no português em vez de sumir da ficha.
 */
function noIdioma(texto: TextoBilingue): string;
function noIdioma(texto: TextoBilingue | null | undefined): string | null;
function noIdioma(texto: TextoBilingue | null | undefined): string | null {
  if (!texto) return null;
  return idiomaAtual() === 'en' ? (texto.en ?? texto.pt) : texto.pt;
}

/**
 * OS DECIMAIS DE UMA CITAÇÃO na língua de agora: a fonte da régua é escrita
 * com ponto ("0.55 µm", "G = 0.32"), e na ficha em português ela sai ao lado
 * de "0,31". Todo dígito-ponto-dígito vira dígito-vírgula-dígito — o
 * `decimalDoIdioma` para um texto inteiro, não para um número só.
 */
function decimaisDoIdioma(texto: string): string {
  return idiomaAtual() === 'en' ? texto : texto.replace(/(\d)\.(\d)/g, '$1,$2');
}

/** O crédito de uma imagem: a fonte e a largura da variante citada. */
function comLargura(fonte: string | null, px: number): string | null {
  return fonte && `${fonte} · ${t('ficha.fonte.larguraPx', { px: numeroDoIdioma(px) })}`;
}

/**
 * O RELEVO: as imagens `height` e `normal` do corpo, com o selo da mais
 * fraca das notas da bancada e as notas juntas (a mesma frase nos dois
 * canais sai uma vez). O canal é `height` onde ele desloca vértice e
 * `normal` onde só gira a luz (item 140: a Lua) — a linha é sobre a IMAGEM
 * de onde o relevo vem, não sobre o que o shader faz com ela.
 */
function linhaDoRelevo(
  id: string,
  mapa: EntradaDeTextura | null,
  imagens: readonly (EntradaDeTextura | null)[]
): LinhaDaFicha | null {
  const rotulo = t('ficha.campo.relevo');
  if (SO_ATMOSFERA.has(id)) return linha(rotulo, t('ficha.relevo.naoSeAplica'), null);
  const presentes = imagens.filter((e): e is EntradaDeTextura => e !== null);
  // SEM IMAGEM DE RELEVO o chão é liso — ou, sem mapa nenhum (as
  // esculpidas), é o da malha feita por código.
  if (presentes.length === 0) {
    return linha(rotulo, t(mapa ? 'ficha.relevo.liso' : 'ficha.relevo.semMapa'), 'artistico');
  }
  const notas = presentes.flatMap((e) =>
    e.nota
      ? [{ frase: noIdioma(e.nota), tier: TIER_DA_NOTA[e.seloDaNota ?? 'inventado'], partes: e.partes }]
      : []
  );
  if (notas.length === 0) return linha(rotulo, t('ficha.relevo.semDefeito'), 'medido');
  const tier = oMaisFraco(notas.map((n) => n.tier));
  // AS PARTES são as da nota que dá o selo — em Fobos, a da normal (o relevo
  // fino); a altura é a forma inteira, medida. Duas notas no mesmo tier só
  // as mostram se forem as mesmas (Encélado, Pã: a mesma frase nos dois).
  const fracas = notas.filter((n) => n.tier === tier);
  const mesmas = fracas.every((n) => JSON.stringify(n.partes) === JSON.stringify(fracas[0]!.partes));
  return comPartes(
    linha(rotulo, [...new Set(notas.map((n) => n.frase))].join('; '), tier, t('ficha.fonte.bancada')),
    mesmas ? fracas[0]!.partes : undefined
  );
}

/**
 * A COR: o mais fraco entre a nota do `map` e a política da régua. A frase
 * é a da nota, quando há; a da régua (gerada, citando a fonte da cor) entra
 * quando não há nota — ou junto dela, quando é a régua que enfraquece o
 * selo (Vênus e Titã: a nota mede, a tinta deriva). Fora da régua (a
 * Terra) e sem nota, a frase diz isso, sem selo.
 */
function linhaDaCor(
  mapa: EntradaDeTextura | null,
  regua: MedidaDoCorpo | undefined
): LinhaDaFicha | null {
  const rotulo = t('ficha.campo.cor');
  const nota = mapa?.nota
    ? { frase: noIdioma(mapa.nota), tier: TIER_DA_NOTA[mapa.seloDaNota ?? 'inventado'] }
    : null;
  if (!regua) {
    return nota
      ? comPartes(linha(rotulo, nota.frase, nota.tier, t('ficha.fonte.bancada')), mapa?.partes)
      : linha(rotulo, t('ficha.cor.foraDaRegua'), null);
  }
  const politica = TIER_DA_POLITICA[regua.matiz];
  const daRegua = t(`ficha.cor.${regua.matiz}` as 'ficha.cor.foto', {
    fonte: decimaisDoIdioma(regua.fonteDaCor),
  });
  if (!nota) return linha(rotulo, daRegua, politica);
  const frase =
    FORCA_DO_TIER[politica] < FORCA_DO_TIER[nota.tier] ? `${nota.frase}; ${daRegua}` : nota.frase;
  return comPartes(
    linha(rotulo, frase, oMaisFraco([nota.tier, politica]), t('ficha.fonte.bancada')),
    mapa?.partes,
    politica
  );
}

/**
 * O BRILHO: o p0 da régua, com a fonte do nível. DERIVADO quando o fator do
 * pico é modelo (H,G), quando o nível repousa numa suposição ou numa média
 * (`nivelDerivado`) ou quando a média desenhada é estimada (as
 * esculpidas escalam a família de regolito até o p0); o γ < 1 que a cadeia
 * aplicou para o mapa caber no alvo sem estourar é confessado junto.
 */
function linhaDoBrilho(id: string, regua: MedidaDoCorpo | undefined): LinhaDaFicha | null {
  const rotulo = t('ficha.campo.brilho');
  if (!regua) return linha(rotulo, t('ficha.brilho.foraDaRegua'), null);
  const picoPorModelo = PICO_POR_MODELO.test(regua.fonteDoNivel);
  const esculpida = regua.matiz === 'esculpido';
  const chave = picoPorModelo
    ? 'ficha.brilho.picoPorModelo'
    : regua.nivelDerivado
      ? 'ficha.brilho.estimado'
      : 'ficha.brilho.medido';
  // as ressalvas vêm antes da fonte, que fecha a frase depois do travessão
  let ressalvas = esculpida ? t('ficha.brilho.mediaEstimada') : '';
  const gama = GAMA_DA_REGUA[id]?.gama;
  if (gama !== undefined && gama < 1) {
    ressalvas += t('ficha.brilho.gama', { gama: comCasas(gama, 2) });
  }
  const frase = t(chave, {
    p0: decimalDoIdioma(alvoDoMapa(id).p0.toPrecision(2)),
    ressalvas,
    fonte: decimaisDoIdioma(regua.fonteDoNivel),
  });
  return linha(
    rotulo,
    frase,
    picoPorModelo || esculpida || regua.nivelDerivado ? 'derivado' : 'medido'
  );
}

/**
 * A IMAGEM CONFESSA (item 74 parte B; itens 19 e 20; o formato da R3,
 * PLAN-REGUA-UNICA.md).
 *
 * QUATRO LINHAS FIXAS, uma por canal do que se vê — forma, relevo, cor,
 * brilho —, cada uma com UM selo, o do mais fraco que ela confessa, e uma
 * frase; no canal misto o selo vem em partes, com a porcentagem da área
 * de cada tier (`comPartes`). Uma fonte por canal: a forma é a tabela "a forma" do ASSETS.md
 * (sem linha, o elipsoide dos eixos medidos); o relevo, as notas dos mapas
 * de altura e de normais; a cor, a nota do `map` e a política da régua; o
 * brilho, a régua (`reguaDosMapas.ts`). As notas nascem na bancada de
 * texturas (`docs/reference/ASSETS.md`) e chegam aqui pelo manifesto;
 * ausência de nota quer dizer "a bancada não achou defeito", nunca
 * "ninguém olhou". As frases geradas moram nas tabelas de idioma.
 *
 * DEPOIS, O CRÉDITO SEM SELO: de onde veio o mapa, sob que licença, a quem
 * creditar, e de onde veio o relevo. Crédito não confessa nada — o selo
 * que ele levava (a `proveniencia` do arquivo) brigava com o da nota.
 *
 * O SOL FICA DE FORA, e é decisão declarada: a imagem dele não é textura
 * nenhuma, é a `LEI-DA-ESTRELA` inteira (forma assada, tinta por cor,
 * granulação). Uma linha aqui seria a segunda fonte de verdade sobre um
 * assunto que tem contrato próprio.
 */
function secaoImagem(
  id: string,
  manifest: ManifestDeTexturas | null | undefined,
  realceDoRelevo = 1
): LinhaDaFicha[] {
  if (!manifest || id === 'sun') return [];
  const mapa = fonteDoCanal(manifest.entradas, id, 'map');
  const altura = fonteDoCanal(manifest.entradas, id, 'height');
  const normal = fonteDoCanal(manifest.entradas, id, 'normal');
  const relevo = altura ?? normal;
  const regua: MedidaDoCorpo | undefined = REGUA_DOS_MAPAS[id];

  const forma = manifest.formas?.[id];
  const linhas: (LinhaDaFicha | null)[] = [
    forma
      ? comPartes(
          linha(
            t('ficha.campo.forma'),
            noIdioma(forma),
            TIER_DA_NOTA[forma.seloDaNota ?? 'inventado'],
            t('ficha.fonte.bancada')
          ),
          forma.partes
        )
      : linha(
          t('ficha.campo.forma'),
          t(altura ? 'ficha.forma.elipsoideComAltura' : 'ficha.forma.elipsoide'),
          'medido'
        ),
  ];
  // O RELEVO REALÇADO (item 232) CONFESSA-SE ANTES DO RELEVO: as alturas na
  // tela não são as do mapa, e a nota da bancada logo abaixo ("sem
  // exagero") descreve o mapa — a linha diz as duas coisas, e o tier é o
  // artístico, o de "não tome isto por observação".
  if (relevo?.origem && realceDoRelevo !== 1) {
    linhas.push(
      linha(
        t('ficha.campo.relevoRealcado'),
        t('ficha.relevoRealcado', { fator: decimalDoIdioma(String(realceDoRelevo)) }),
        'artistico',
        t('ficha.fonte.modoDeclarado')
      )
    );
  }
  linhas.push(
    linhaDoRelevo(id, mapa, [altura, normal]),
    linhaDaCor(mapa, regua),
    linhaDoBrilho(id, regua)
  );

  if (mapa?.origem) {
    linhas.push(
      linha(t('ficha.campo.fonte'), comLargura(noIdioma(mapa.origem.fonte), mapa.larguraPx), null),
      linha(t('ficha.campo.licenca'), noIdioma(mapa.origem.licenca), null),
      linha(t('ficha.campo.atribuicao'), noIdioma(mapa.origem.atribuicao), null)
    );
  }
  if (relevo?.origem) {
    linhas.push(
      linha(
        t('ficha.campo.fonteDoRelevo'),
        comLargura(noIdioma(relevo.origem.fonte), relevo.larguraPx),
        null
      )
    );
  }

  return linhas.filter((l): l is LinhaDaFicha => l !== null);
}

/** O título de cada seção, na língua de agora (item 130). */
const TITULO = (id: IdDeSecao): string => t(`ficha.secao.${id}` as 'ficha.secao.agora');

const RSOL_KM = 695_700;

/** Inteiro com separador de milhar da língua de agora (5.600 · 5,600). */
function inteiroDoIdioma(v: number): string {
  return numeroDoIdioma(Math.round(v));
}

/** Três algarismos significativos na língua de agora (0,154 · 24,7 · 764 ·
 *  87.100) — a precisão das medidas do piloto. */
function tresSignificativos(v: number): string {
  const r = Number(v.toPrecision(3));
  return r >= 1000 ? inteiroDoIdioma(r) : decimalDoIdioma(String(r));
}

/** Uma potência de dez com dois algarismos (8,5 × 10⁻⁷). */
function potenciaDeDez(v: number): string {
  const [mantissa, expoente] = v.toExponential(1).split('e');
  const n = Number(expoente);
  const digitos = String(Math.abs(n))
    .split('')
    .map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])
    .join('');
  return `${decimalDoIdioma(mantissa!)} × 10${n < 0 ? '⁻' : ''}${digitos}`;
}

/**
 * O GÁS que o motor desenha (`gasDaEstrela`, `ventoDaEstrela.ts`): o vento
 * (medido pelo nome, ou a receita de Vink 2001), só de quem o tem acima do
 * limiar de desenho, com o tamanho da região da linha (medido em Rigel e
 * Deneb; o de Rigel nas outras) e o brilho relativo a Rigel (derivado); o
 * disco de gás da ficha (Achernar), com a época medida.
 */
function linhasDoGas(e: EstrelaVisitavel): (LinhaDaFicha | null)[] {
  const v = fracaoDesenhadaDoVento(e) > 0 ? ventoDaFicha(e) : null;
  const d = e.discoDeGas;
  const linhaH = v ? raioDaLinhaDe(e) : null;
  const mdot = v ? potenciaDeDez(v.mdotMsolAno) : '';
  // a velocidade medida ou do modelo como está; a da receita, em dezenas
  const vel = v ? inteiroDoIdioma(v.p === 'medido' ? v.vInfKms : Math.round(v.vInfKms / 10) * 10) : '';
  return [
    v
      ? linha(
          t('ficha.campo.vento'),
          t(v.vInfDoModelo ? 'ficha.estrela.ventoDoModelo' : 'ficha.estrela.vento', { mdot, v: vel }),
          v.p,
          v.fonte
        )
      : null,
    linhaH
      ? linha(
          t('ficha.campo.regiaoDaLinha'),
          t(linhaH.p === 'medido' ? 'ficha.estrela.regiaoDaLinha' : 'ficha.estrela.regiaoDaLinhaDeRigel', {
            raios: tresSignificativos(linhaH.v),
          }),
          linhaH.p,
          linhaH.fonte
        )
      : null,
    // o brilho do vento relativo ao de Rigel (a âncora): a medida de emissão, derivada
    v && e.nomeNoCatalogo !== 'Rigel'
      ? linha(
          t('ficha.campo.brilhoDoGas'),
          t('ficha.estrela.brilhoDoGas', {
            x: tresSignificativos(Number(razaoARigel(v, e.raioRsol.v, e.teffK.v).toPrecision(2))),
          }),
          'derivado'
        )
      : null,
    d
      ? linha(
          t('ficha.campo.discoDeGas'),
          t('ficha.estrela.discoDeGas', {
            raios: numeroDoIdioma(d.raioExternoEmRaios.v),
            // o ano, sem separador de milhar ("2.015")
            ate: String(Math.floor(d.medidoAte)),
          }),
          'medido',
          d.fonteDasEpocas
        )
      : null,
    // a espessura e a queda do disco: da física de um disco Be, não medidas nesta estrela
    d
      ? linha(
          t('ficha.campo.formaDoDisco'),
          t('ficha.estrela.formaDoDisco', {
            graus: numeroDoIdioma(d.meiaAberturaGraus.v),
            n: numeroDoIdioma(d.expoenteDaDensidade.v),
          }),
          d.meiaAberturaGraus.p,
          d.meiaAberturaGraus.fonte
        )
      : null,
  ];
}

/**
 * A NUVEM MEDIDA no céu (`NuvemMedida`, Betelgeuse): onde estão as plumas e
 * a casca (medido), o brilho projetado pelo perfil (o selo mais fraco dos
 * pontos: a forma do infravermelho próximo usada no visível é derivada) e o
 * hidrogênio (medido). Não é desenhada: no brilho medido ela não se vê, e
 * a ficha diz. A fonte de cada linha: as citações dos números dela, uma vez cada.
 */
function linhasDaNuvem(e: EstrelaVisitavel): (LinhaDaFicha | null)[] {
  const m = e.nuvem;
  if (!m) return [];
  const fontes = (ns: readonly Numero[]) => [...new Set(ns.filter((n) => n.fonte).map((n) => n.fonte))].join('; ');
  const maior = m.pluma;
  const k = m.casca;
  const h = m.hidrogenio;
  const doPerfil = m.perfil.flatMap((p) => [p.raioEmRaios, p.brilho]);
  return [
    linha(
      t('ficha.campo.nuvemEmVolta'),
      t('ficha.estrela.nuvemEmVolta', {
        pa: numeroDoIdioma(maior.anguloGraus.v),
        raios: numeroDoIdioma(maior.alcanceEmRaios.v),
        extensoes: m.extensoesGraus.map((x) => `${numeroDoIdioma(x.v)}°`).join(t('ficha.estrela.eNuvem')),
        de: numeroDoIdioma(k.deRaios.v),
        ate: numeroDoIdioma(k.ateRaios.v),
        paCasca: numeroDoIdioma(k.anguloGraus.v),
      }),
      'medido',
      fontes([maior.anguloGraus, maior.alcanceEmRaios, ...m.extensoesGraus, k.deRaios, k.ateRaios, k.anguloGraus])
    ),
    linha(
      t('ficha.campo.brilhoDaNuvem'),
      t('ficha.estrela.brilhoDaNuvem', {
        pontos: m.perfil
          .map((p) =>
            t('ficha.estrela.pontoDaNuvem', {
              pct: numeroDoIdioma(p.brilho.v * 100),
              raios: numeroDoIdioma(p.raioEmRaios.v),
            })
          )
          .join(', '),
      }),
      oMaisFraco(doPerfil.map((n) => n.p)),
      fontes(doPerfil)
    ),
    linha(
      t('ficha.campo.hidrogenioEmVolta'),
      t('ficha.estrela.hidrogenioEmVolta', {
        max: numeroDoIdioma(h.maximoEmRaios.v),
        ate: numeroDoIdioma(h.ateRaios.v),
        pico: numeroDoIdioma(h.picoEmRaios.v),
      }),
      oMaisFraco([h.maximoEmRaios.p, h.ateRaios.p, h.picoEmRaios.p]),
      fontes([h.maximoEmRaios, h.ateRaios, h.picoEmRaios])
    ),
  ];
}

/**
 * O ESCURECIMENTO MEDIDO por época (`EscurecimentoMedido`, Betelgeuse em
 * 2019–20): o que foi medido (as datas, o brilho, o sul mais de 10× mais
 * escuro, o quadrante sudoeste em março) e o ajuste de mancha fria do artigo,
 * com as épocas da ficha; a outra leitura (a poeira) e o artigo que não
 * escolhe. O que o desenho deriva vai na seção da imagem.
 */
function linhasDoEscurecimento(e: EstrelaVisitavel): (LinhaDaFicha | null)[] {
  const x = e.escurecimento;
  if (!x) return [];
  const medidas = x.epocas.filter((p) => p.fracaoDoDisco.p === 'medido');
  return [
    linha(
      t('ficha.campo.grandeEscurecimento'),
      t('ficha.estrela.grandeEscurecimento', {
        claro: decimalDoIdioma(x.costumeMag[0].toFixed(1)),
        fraco: decimalDoIdioma(x.costumeMag[1].toFixed(1)),
        mag: decimalDoIdioma(x.minimo.mag.v.toFixed(3)),
        erro: decimalDoIdioma(x.minimo.erroMag.toFixed(3)),
        de: dataDaEpoca(x.minimo.de),
        ate: dataDaEpoca(x.minimo.ate),
        razao: numeroDoIdioma(x.razaoDoLadoEscuro.v),
      }),
      oMaisFraco([x.minimo.mag.p, x.razaoDoLadoEscuro.p]),
      [...new Set([x.minimo.mag.fonte, x.razaoDoLadoEscuro.fonte])].join('; ')
    ),
    linha(
      t('ficha.campo.manchaFria'),
      t('ficha.estrela.manchaFria', {
        t0: inteiroDoIdioma(x.teffDaFotosferaK.v),
        epocas: medidas
          .map((p) =>
            t('ficha.estrela.epocaDaManchaFria', {
              data: dataDaEpoca(p.data),
              pct: numeroDoIdioma(Math.round(p.fracaoDoDisco.v * 100)),
              k: inteiroDoIdioma(p.teffDaManchaK.v),
            })
          )
          .join('; '),
      }),
      oMaisFraco(medidas.flatMap((p) => [p.fracaoDoDisco.p, p.teffDaManchaK.p])),
      [...new Set(medidas.flatMap((p) => [p.fracaoDoDisco.fonte, p.teffDaManchaK.fonte]))].join('; ')
    ),
  ];
}

/** uma data UT da ficha (ISO 8601) na língua de agora: 27/12/2019 · 2019-12-27 */
function dataDaEpoca(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return t('ficha.estrela.dataDaEpoca', { a, m, d });
}

/** Uma linha de número do piloto: o selo e a fonte vêm do próprio número. */
function linhaDoNumero(rotulo: string, valor: string | null, n: Numero): LinhaDaFicha | null {
  return linha(rotulo, valor, n.p, n.fonte);
}

/** Raio em R☉ e em km (1 R☉ = 695 700 km). */
function raioEmTexto(rsol: number): string {
  return t('ficha.estrela.raioEmKm', {
    rsol: tresSignificativos(rsol),
    km: inteiroDoIdioma(Number((rsol * RSOL_KM).toPrecision(3))),
  });
}

const kelvin = (n: Numero) => `${inteiroDoIdioma(n.v)} K`;

/** As linhas físicas das estrelas do piloto (`estrelasVisitaveis.ts`). */
/** a lei do desenho da superfície na Forja (o tamanho da célula pela gravidade) */
const LEI_DA_FORJA = 'Trampedach et al. 2013, arXiv 1303.1780';
/** por que a quente é lisa (`semConveccaoNaSuperficie`) */
const LEI_DA_LISA = 'Steffen et al. 2005; Cantiello et al. 2009';

/** A regra da Forja quando é ela que desenha a estrela (sem dínamo e com convecção visível); senão null. */
function forjaDaFicha(e: EstrelaVisitavel): ReturnType<typeof regraDaForja> | null {
  if (temDinamoSolar(e)) return null;
  const m = celulaQuenteDe(e);
  const forja = regraDaForja(e.teffK.v, logGravidade(e.massaMsol.v, e.raioRsol.v), e.raioRsol.v, {
    razao: m.razao.v,
    lambdaUm: m.lambdaUm.v,
  });
  return forja.contraste > 0 ? forja : null;
}

/**
 * A MANCHA QUENTE das supergigantes (só onde o motor desenha as células
 * quentes, peso profundo > 0): a medida da estrela na banda dela, ou a de
 * Betelgeuse pela regra; e o que ela dá no visível pela lei de Planck.
 */
function linhasDaMancha(e: EstrelaVisitavel, forja: ReturnType<typeof regraDaForja> | null): (LinhaDaFicha | null)[] {
  if (!forja || !(forja.pesoProfundo > 0) || !(forja.picoQuente > 0)) return [];
  const m = celulaQuenteDe(e);
  const lambda = decimalDoIdioma(String(m.lambdaUm.v));
  const chave = !m.medida
    ? 'ficha.estrela.manchaQuenteDeBetelgeuse'
    : m.teto
      ? 'ficha.estrela.manchaQuenteTeto'
      : 'ficha.estrela.manchaQuente';
  const visivel = razaoDePlanckNaBanda(e.teffK.v, forja.picoQuente, LAMBDA_DO_VISIVEL_UM);
  return [
    linha(
      t('ficha.campo.manchaQuente'),
      t(chave, {
        x: tresSignificativos(m.razao.v),
        pct: numeroDoIdioma(Math.round((m.razao.v - 1) * 1000) / 10),
        lambda,
      }),
      m.razao.p,
      m.razao.fonte
    ),
    linha(
      t('ficha.campo.manchaNoVisivel'),
      t('ficha.estrela.manchaNoVisivel', {
        x: tresSignificativos(visivel),
        kelvin: inteiroDoIdioma(Math.round((forja.picoQuente * e.teffK.v) / 10) * 10),
      }),
      'derivado',
      `Planck; ${m.razao.fonte}`
    ),
    // o lugar da maior, quando o registro o dá (Betelgeuse: compatível com as imagens, não medido)
    m.lugar
      ? linha(
          t('ficha.campo.lugarDaManchaQuente'),
          t(m.lugar.distanciaEmRaios.p === 'artistico' ? 'ficha.estrela.lugarDaManchaQuenteCompativel' : 'ficha.estrela.lugarDaManchaQuente', {
            graus: inteiroDoIdioma(Math.round(m.lugar.anguloGraus.v)),
            r: decimalDoIdioma(String(Math.round(m.lugar.distanciaEmRaios.v * 100) / 100)),
            data: dataDaEpoca(m.lugar.data),
          }),
          m.lugar.distanciaEmRaios.p,
          m.lugar.distanciaEmRaios.fonte
        )
      : null,
  ];
}

/** O achatamento (Re/Rp − 1) em %; só um piso quando a inclinação não foi medida. */
function achatamentoEmTexto(a: Achatamento): string {
  const v = Number((((a.raioEquatorialRsol.v / a.raioPolarRsol.v) - 1) * 100).toPrecision(2));
  const pct = decimalDoIdioma(String(v));
  const base = a.limiteInferior
    ? t('ficha.estrela.achatamentoPeloMenos', { v: pct })
    : t('ficha.estrela.achatamentoEmPct', { v: pct });
  return a.noTeto ? base + t('ficha.estrela.giroPreso') : base;
}

/** A inclinação do eixo dita pelo ângulo: perto do polo, perto do equador ou só o número. */
function inclinacaoEmTexto(graus: number): string {
  const g = numeroDoIdioma(graus);
  if (graus < 20) return t('ficha.estrela.vistaPeloPolo', { graus: g });
  if (graus > 70) return t('ficha.estrela.vistaPeloEquador', { graus: g });
  return t('ficha.estrela.inclinacaoEntreEixoESol', { graus: g });
}

function linhasDoPiloto(e: EstrelaVisitavel): (LinhaDaFicha | null)[] {
  const a = achatamentoDe(e);
  const forja = forjaDaFicha(e);
  const atmosfera = forja?.atmosferaEmRaios ?? 1;
  const lum = e.luminosidadeLsol.v;
  return [
    linhaDoNumero(t('ficha.campo.tipoEspectral'), e.tipo.texto, e.tipo),
    linhaDoNumero(t('ficha.campo.temperatura'), kelvin(e.teffK), e.teffK),
    linhaDoNumero(t('ficha.campo.raioSolar'), raioEmTexto(e.raioRsol.v), e.raioRsol),
    linhaDoNumero(
      t('ficha.campo.massa'),
      t('ficha.estrela.massaEmMsol', { v: tresSignificativos(e.massaMsol.v) }),
      e.massaMsol
    ),
    linhaDoNumero(
      t('ficha.campo.luminosidade'),
      t('ficha.estrela.luminosidadeEmLsol', {
        v: tresSignificativos(lum),
      }),
      e.luminosidadeLsol
    ),
    e.rotacaoDias
      ? linhaDoNumero(t('ficha.campo.rotacao'), formatarDuracao(e.rotacaoDias.v), e.rotacaoDias)
      : null,
    e.idadeGa
      ? linhaDoNumero(
          t('ficha.campo.idade'),
          t('ficha.estrela.idadeEmGa', { v: tresSignificativos(e.idadeGa.v) }),
          e.idadeGa
        )
      : null,
    ...(a
      ? [
          linhaDoNumero(t('ficha.campo.achatamento'), achatamentoEmTexto(a), a.raioPolarRsol),
          linhaDoNumero(t('ficha.campo.raioPolar'), raioEmTexto(a.raioPolarRsol.v), a.raioPolarRsol),
          linhaDoNumero(
            t('ficha.campo.raioEquatorial'),
            raioEmTexto(a.raioEquatorialRsol.v),
            a.raioEquatorialRsol
          ),
          linhaDoNumero(t('ficha.campo.temperaturaPolo'), kelvin(a.teffPoloK), a.teffPoloK),
          linhaDoNumero(t('ficha.campo.temperaturaEquador'), kelvin(a.teffEquadorK), a.teffEquadorK),
          a.inclinacaoGraus && !a.limiteInferior
            ? linhaDoNumero(t('ficha.campo.inclinacaoDoEixo'), inclinacaoEmTexto(a.inclinacaoGraus.v), a.inclinacaoGraus)
            : null,
        ]
      : []),
    // a casca que o motor desenha, pela mesma regra
    atmosfera > 1
      ? linhaDoNumero(
          t('ficha.campo.bordaDifusa'),
          t('ficha.estrela.bordaDifusa', { raios: numeroDoIdioma(Math.round(atmosfera * 100) / 100) }),
          { v: atmosfera, p: 'derivado', fonte: LEI_DA_ATMOSFERA }
        )
      : null,
    ...linhasDaMancha(e, forja),
    ...linhasDoGas(e),
    ...linhasDaNuvem(e),
    ...linhasDoEscurecimento(e),
  ];
}

/** A companheira (Sirius B); a separação em UA é aSegArco × distância em pc. */
function secaoDaCompanheira(e: EstrelaVisitavel, distanciaPc: number): SecaoDaFicha | null {
  // a que tem corpo (tamanho e temperatura medidos) ou a que só tem a
  // órbita medida (Dubhe B): a mesma seção, com as linhas que existem
  const c = e.companheira;
  const semCorpo = e.companheiraSemCorpo;
  const base = c ?? semCorpo;
  if (!base) return null;
  const o = base.orbita;
  // a anã branca tem título e régua próprios (o tamanho da Terra); a
  // companheira que é uma estrela comum (Capella Ab) lê como a principal
  const anaBranca = c?.tipo.startsWith('D') ?? false;
  const linhas = [
    c ? linha(t('ficha.campo.tipoEspectral'), c.tipo, 'medido', o.fonte) : null,
    c ? linhaDoNumero(t('ficha.campo.temperatura'), kelvin(c.teffK), c.teffK) : null,
    c
      ? linhaDoNumero(
          t('ficha.campo.raioSolar'),
          anaBranca
            ? t('ficha.estrela.doTamanhoDaTerra', {
                km: inteiroDoIdioma(Number((c.raioRsol.v * RSOL_KM).toPrecision(2))),
              })
            : raioEmTexto(c.raioRsol.v),
          c.raioRsol
        )
      : null,
    base.massaMsol
      ? linhaDoNumero(
          t('ficha.campo.massa'),
          t('ficha.estrela.massaEmMsol', { v: tresSignificativos(base.massaMsol.v) }),
          base.massaMsol
        )
      : null,
    c?.rotacaoDias
      ? linhaDoNumero(t('ficha.campo.rotacao'), formatarDuracao(c.rotacaoDias.v), c.rotacaoDias)
      : null,
    linha(t('ficha.campo.periodo'), formatarDuracao(o.periodoAnos * DIAS_POR_ANO), 'medido', o.fonte),
    linha(
      t('ficha.campo.separacaoMedia'),
      t('ficha.estrela.separacaoEmUa', { ua: numeroDoIdioma(o.aSegArco * distanciaPc) }),
      'medido',
      o.fonte
    ),
    // a companheira com corpo é desenhada pela mesma lei: confessa o mesmo
    ...(c && pesoDoPico(c.teffK.v) > 0 ? linhasDoBrilho(c.teffK.v) : []),
  ].filter((l): l is LinhaDaFicha => l !== null);
  const titulo = t(anaBranca ? 'ficha.secao.companheira' : 'ficha.secao.companheiraDoPar', { nome: base.nome });
  return { id: 'companheira', titulo, linhas };
}

/**
 * As concessões do BRILHO que a temperatura liga, as mesmas para a principal
 * e para a companheira: mais radiante que o Sol, o véu (o texto das quentes
 * só de quem a regra do pico alcança, `pesoDoPico`); e a ponta branca no
 * ponto mais quente, só de quem a tem (`pesoDaLisa`).
 */
function linhasDoBrilho(teffK: number): (LinhaDaFicha | null)[] {
  return [
    teffK > TEFF_DO_SOL_K
      ? linha(
          t('ficha.campo.veu'),
          t(pesoDoPico(teffK) > 0 ? 'ficha.estrela.veuDaQuente' : 'ficha.estrela.veu'),
          'artistico'
        )
      : null,
    pesoDaLisa(teffK) > 0 ? linha(t('ficha.campo.pontoMaisQuente'), t('ficha.estrela.pontaDoPico'), 'artistico') : null,
  ];
}

/**
 * O ESCURECIMENTO NO DESENHO, pelos números do registro da estrela: o que o
 * desenho deriva (o lado escuro por época, a lei de Planck e o TiO da Forja
 * nas temperaturas do modelo, contra o piso medido) e, à parte, o que é
 * escolha (a borda do véu, larga e de nuvem). O pico do lado escuro NO
 * DESENHO é medido no desenho (`PICO_NO_DESENHO`) e dito ao lado do medido.
 */
/**
 * A RAZÃO DO PICO NO DESENHO, norte sobre sul em luz linear (antes da curva
 * de tom), Betelgeuse vista da Terra: medida no próprio desenho em 18/11/2026
 * (`capturas/.../ferramentas-lote2/pico-linear.mjs`), com o véu de 0,1 e a
 * célula quente no lugar compatível; refazer se o desenho mudar.
 */
const PICO_NO_DESENHO = [
  { data: '2019-12-27T03:27Z', x: 8.4 },
  { data: '2020-01-28T02:00Z', x: 26 },
] as const;

function linhasDoEscurecimentoNoDesenho(e: EstrelaVisitavel, x: EscurecimentoMedido): (LinhaDaFicha | null)[] {
  const t0 = x.teffDaFotosferaK.v;
  const medidas = x.epocas.filter((p) => p.fracaoDoDisco.p === 'medido');
  const frias = [...new Set(medidas.map((p) => p.teffDaManchaK.v))];
  return [
    linha(
      t('ficha.campo.escurecimentoNoDesenho'),
      t('ficha.estrela.escurecimentoNoDesenho', {
        de: dataDaEpoca(x.epocas[0].data),
        ate: dataDaEpoca(x.epocas[x.epocas.length - 1].data),
        lados: medidas
          .map((p) => t('ficha.estrela.ladoEscuroNaEpoca', { graus: inteiroDoIdioma(p.anguloGraus.v), data: dataDaEpoca(p.data) }))
          .join(', '),
        escuros: frias
          .map((k) =>
            t('ficha.estrela.escuroNaTemperatura', {
              x: numeroDoIdioma(Math.round(escuroDaRegiaoFria(e.teffK.v, k / t0) * 10) / 10),
              k: inteiroDoIdioma(k),
              t0: inteiroDoIdioma(t0),
            })
          )
          .join(t('ficha.estrela.eNuvem')),
        razao: numeroDoIdioma(x.razaoDoLadoEscuro.v),
        veu: numeroDoIdioma(Math.min(...medidas.map((p) => p.transmissaoDoVeu.v))),
        desenho: PICO_NO_DESENHO.map((p) =>
          t('ficha.estrela.picoNoDesenho', { x: numeroDoIdioma(p.x), data: dataDaEpoca(p.data) })
        ).join(t('ficha.estrela.eNuvem')),
      }),
      'derivado',
      x.teffDaFotosferaK.fonte
    ),
    linha(
      t('ficha.campo.bordaDaRegiaoFria'),
      t('ficha.estrela.bordaDaRegiaoFria', { largura: numeroDoIdioma(2 * BORDA_DA_MANCHA_FRIA) }),
      'artistico'
    ),
  ];
}

/** A SEÇÃO DA IMAGEM da estrela do piloto: o que é medida e o que é desenho. */
function secaoImagemDaEstrela(e: EstrelaVisitavel): SecaoDaFicha {
  const forja = forjaDaFicha(e);
  const daForja = forja !== null;
  // sem dínamo e sem convecção na superfície (`semConveccaoNaSuperficie`): lisa
  const lisa = !daForja && !temDinamoSolar(e);
  return {
    id: 'imagem',
    titulo: TITULO('imagem'),
    linhas: [
      // na Forja (sem dínamo e com convecção, `forjaDe`) a cor é a de uma foto
      // de banda estreita colorizada, como a do Sol; fora dela, o corpo negro
      daForja
        ? linha(t('ficha.campo.corEBrilho'), t('ficha.estrela.corDeFiltroColorizado'), 'artistico')
        : linha(t('ficha.campo.corEBrilho'), t('ficha.estrela.corPelaTemperatura'), 'derivado'),
      linha(t('ficha.campo.tamanhoNaImagem'), t('ficha.estrela.tamanhoPeloRaio'), e.raioRsol.p, e.raioRsol.fonte),
      lisa
        ? linha(t('ficha.campo.desenhoDaSuperficie'), t('ficha.estrela.superficieLisa'), 'derivado', LEI_DA_LISA)
        : linha(
            t('ficha.campo.desenhoDaSuperficie'),
            t('ficha.estrela.desenhoInventado', { lei: daForja ? LEI_DA_FORJA : e.superficie.granuloEmRaios.fonte }),
            'artistico'
          ),
      // as concessões que a física da estrela liga (nenhuma no Sol, nenhuma
      // por nome): mais radiante que o Sol, véu; granulação abaixo do piso
      // da Forja, extrapolada
      ...linhasDoBrilho(e.teffK.v),
      // o gás em volta (vento, disco): visto como num filtro estreito de hidrogênio
      fracaoDesenhadaDoVento(e) > 0 || e.discoDeGas
        ? linha(t('ficha.campo.gasEmVolta'), t('ficha.estrela.gasEmVolta'), 'artistico')
        : null,
      // o escurecimento pelo relógio: a mancha fria do modelo, com o que o desenho deriva
      ...(e.escurecimento && daForja ? linhasDoEscurecimentoNoDesenho(e, e.escurecimento) : []),
      forja && forja.contraste < forja.contrasteNaTela
        ? linha(
            t('ficha.campo.granulacao'),
            t('ficha.estrela.granulacaoExtrapolada', {
              real: numeroDoIdioma(Math.round(forja.contraste * 1000) / 10),
              piso: numeroDoIdioma(Math.round(forja.contrasteNaTela * 1000) / 10),
            }),
            'artistico',
            LEI_DO_CONTRASTE
          )
        : null,
    ].filter((l): l is LinhaDaFicha => l !== null),
  };
}

/** Os ids de `scripts/data/aglomerados.json` e o nome que a ficha mostra. */
const NOME_DO_AGLOMERADO: Record<string, ChaveDeTexto> = {
  pleiades: 'ficha.aglomerado.pleiades',
  hyades: 'ficha.aglomerado.hyades',
  praesepe: 'ficha.aglomerado.praesepe',
  m7: 'ficha.aglomerado.m7',
  alfaPersei: 'ficha.aglomerado.alfaPersei',
  hPersei: 'ficha.aglomerado.hPersei',
  chiPersei: 'ficha.aglomerado.chiPersei',
  trapezio: 'ficha.aglomerado.trapezio',
};

function nomeDoAglomerado(id: string): string {
  const chave = NOME_DO_AGLOMERADO[id];
  return chave ? t(chave) : id;
}

/**
 * A FICHA DE UMA ESTRELA (item 74; o cabeçalho na parte A, o conteúdo aqui).
 *
 * ELA EXISTE por FUNÇÃO e não por conteúdo: o cabeçalho da ficha é quem
 * anuncia o foco — corpo ou estrela — e quem carrega o gesto de voltar ao
 * sistema. Se a ficha só valesse para corpos, escolher Sirius deixaria o HUD
 * sem dizer o que foi escolhido e sem o "⌂ Sistema".
 *
 * UMA SEÇÃO SÓ, e é decisão medida: são sete linhas, e a ficha desenha
 * FECHADAS todas as seções menos a primeira. Duas seções aqui esconderiam
 * metade do que existe atrás de um clique que ninguém pediu — o corpo tem
 * cinco seções porque tem cinquenta linhas.
 *
 * TUDO MEDIDO OU DERIVADO, NADA DE EDITORIAL. As 1.726 nomeadas não têm
 * prosa nesta casa e não vão ter: o que se escreveria sobre elas seria
 * inventado ou copiado, e nenhuma das duas coisas passa no selo. O que a
 * ficha diz é o que o catálogo mede (distância, magnitude, tipo espectral,
 * B−V, os índices HD/HIP/GJ) mais UMA conta: a temperatura efetiva por
 * Ballesteros. Esta linha é o primeiro consumidor de TELA de
 * `temperatureFromBV` — até aqui a fórmula só alimentava cor de shader.
 *
 * SEM `NamedStar`, SÓ O CABEÇALHO. É o caso do centro galáctico
 * (Sagittarius A✱), que é foco e não é estrela do catálogo: ele continua
 * abrindo a ficha com o nome e o "⌂ Sistema", e sem uma linha inventada.
 */
export function montarFichaDeEstrela(
  nome: string,
  estrela?: NamedStar | null
): Ficha | null {
  if (!nome) return null;
  const linhas: (LinhaDaFicha | null)[] = [];
  // a ficha física: a escrita à mão, ou a da regra única (`estrelaDoCatalogo`)
  const autoral = estrela ? estrelaVisitavelPorNome(nome) : null;
  const piloto = autoral ?? (estrela && !ehCompanheiraDesenhada(nome) ? estrelaDoCatalogo(estrela) : null);
  // o tipo do catálogo some só quando a ficha física o repete (ou é a
  // escrita à mão); o rótulo que a regra descartou continua visível, medido
  const tipoRepetido = autoral !== null || piloto?.tipo.texto === (estrela?.s ?? '').trim();
  if (estrela) {
    // a anfitriã que o catálogo não nomeia veio do arquivo de exoplanetas
    const CATALOGO = ehAnfitriaAcrescentada(nome) ? ARQUIVO_DE_EXOPLANETAS() : t('ficha.fonte.catalogoHyg');
    const designacao = designacaoDeBayer(estrela.b, estrela.c);
    const catalogos = [
      estrela.hd === undefined ? null : `HD ${estrela.hd}`,
      estrela.hip === undefined ? null : `HIP ${estrela.hip}`,
      estrela.gl || null,
    ].filter((x): x is string => x !== null);
    linhas.push(
      // A designação de Bayer é a MESMA estrela dita de outro jeito, e para
      // quem só conhece "Sirius" ela é a ponte com qualquer carta do céu.
      linha(t('ficha.campo.designacao'), designacao, 'medido', t('ficha.fonte.bayerIau')),
      // a estrela de paralaxe imprecisa que é membro de aglomerado recebe a
      // distância DELE (scripts/data/aglomerados.json) — e a ficha diz isso
      estrela.ag
        ? linha(
            t('ficha.campo.distancia'),
            notaDeDistancia(estrela.d * UA_POR_PC, numeroDoIdioma),
            'derivado',
            t('ficha.fonte.distanciaDoAglomerado', { aglomerado: nomeDoAglomerado(estrela.ag) })
          )
        : linha(
            t('ficha.campo.distancia'),
            notaDeDistancia(estrela.d * UA_POR_PC, numeroDoIdioma),
            'medido',
            t('ficha.fonte.paralaxe')
          ),
      linha(t('ficha.campo.magnitude'), comCasas(estrela.m, 2), 'medido', CATALOGO),
      piloto && tipoRepetido ? null : linha(t('ficha.campo.tipoEspectral'), estrela.s || null, 'medido', CATALOGO),
      linha(
        t('ficha.campo.corBV'),
        estrela.ci === undefined ? null : comCasas(estrela.ci, 3),
        'medido',
        CATALOGO
      ),
      piloto
        ? null
        : linha(
            t('ficha.campo.temperatura'),
            estrela.ci === undefined
              ? null
              : `${numeroDoIdioma(Number(temperatureFromBV(estrela.ci).toPrecision(3)))} K`,
            'derivado',
            t('ficha.fonte.ballesteros')
          ),
      ...(piloto ? linhasDoPiloto(piloto) : []),
      // OS TRÊS ÍNDICES NUMA LINHA SÓ: eles não são três fatos, são três
      // endereços do mesmo objeto, e é assim que se procura por ele.
      linha(t('ficha.campo.catalogos'), catalogos.join(' · ') || null, 'medido', CATALOGO)
    );
  }
  const cheias = linhas.filter((l): l is LinhaDaFicha => l !== null);
  const extras: SecaoDaFicha[] =
    estrela && piloto
      ? [secaoDaCompanheira(piloto, estrela.d), secaoDoSistema(nome, piloto), secaoImagemDaEstrela(piloto)].filter(
          (x): x is SecaoDaFicha => x !== null
        )
      : [];
  return {
    id: 'estrela',
    nome,
    // A PALAVRA DA CLASSE DIZ O QUE O OBJETO É (ordem dele, 01/09, ao ver
    // "Sagittarius A✱ · estrela"): a ficha só de cabeçalho é a do centro
    // galáctico, e ele é um buraco negro, não uma estrela do catálogo.
    classe: classeEmTexto(estrela ? 'estrela' : 'buraco negro'),
    secoes:
      cheias.length > 0
        ? [{ id: 'estrela', titulo: TITULO('estrela'), linhas: cheias }, ...extras]
        : [],
  };
}

/**
 * A FICHA DE UM LUGAR DO CÉU (céu profundo, 12/11/2026) — irmã da de
 * estrela, separada dela de propósito: o caminho da ESTRELA tem dono
 * próprio (os corpos de estrela) e o do lugar não deve tocá-lo.
 *
 * DUAS SEÇÕES. "O lugar" vem primeiro, aberta: a distância (da
 * literatura, em anos-luz — parsec não aparece) e os fatos da curadoria,
 * cada um com o selo e a citação dele (`lugaresDoFilme.ts`). "Contexto"
 * leva o "o que é", e é dela que a ficha tira a introdução — o mesmo
 * caminho da prosa de um corpo.
 */
export function montarFichaDeLugar(lugar: LugarDoCeu): Ficha {
  const ingles = idiomaAtual() === 'en';
  const no = (texto: { pt: string; en: string }) => (ingles ? texto.en : texto.pt);
  const linhas: (LinhaDaFicha | null)[] = [];
  if (lugar.distanciaPc) {
    linhas.push(
      linha(
        t(lugar.distanciaPc.doSolAoCentro ? 'ficha.lugar.doSolAoCentro' : 'ficha.campo.distancia'),
        notaDeDistancia(lugar.distanciaPc.valor * UA_POR_PC, numeroDoIdioma),
        'medido',
        lugar.distanciaPc.fonte
      )
    );
  }
  for (const fato of lugar.fatos ?? []) {
    linhas.push(
      linha(
        t(`ficha.lugar.${fato.campo}` as 'ficha.lugar.tamanho'),
        no(fato),
        fato.procedencia,
        typeof fato.fonte === 'string' ? fato.fonte : no(fato.fonte)
      )
    );
  }
  const contexto = lugar.oQueE
    ? [linha(t('ficha.campo.oQueE'), no(lugar.oQueE), 'derivado', t('ficha.fonte.sinteseDaLiteratura'))]
    : [];
  const secoes: SecaoDaFicha[] = [
    { id: 'lugar', titulo: TITULO('lugar'), linhas: linhas.filter((l): l is LinhaDaFicha => l !== null) },
    { id: 'contexto', titulo: TITULO('contexto'), linhas: contexto.filter((l): l is LinhaDaFicha => l !== null) },
  ];
  return {
    id: `lugar:${lugar.id}`,
    nome: ingles ? (lugar.nomeEn ?? lugar.nome) : lugar.nome,
    classe: lugar.classe ? classeEmTexto(lugar.classe) : '',
    secoes: secoes.filter((secao) => secao.linhas.length > 0),
  };
}

/** uma data AAAA-MM-DD do jeito da língua de agora ("25 ago. 1989") */
function dataNaLingua(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(idiomaAtual() === 'en' ? 'en-GB' : 'pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** segundos de luz por UA (IAU: 1 UA / c) */
const SEGUNDOS_DE_LUZ_POR_UA = 499.004_783_8;

/**
 * A FICHA DE UMA SONDA (pilar 4, 12/11/2026). "Agora" é viva — a
 * distância ao Sol em UA, o tempo da luz e a velocidade, no instante
 * mostrado, da trajetória do Horizons (`lib/sondas.ts`); "a missão" são
 * as datas e a situação, cada uma com a página da NASA/JPL que a diz, e
 * a situação traz a data em que foi consultada.
 *
 * O TEMPO DA LUZ é do Sol à sonda: daqui à Terra a diferença é de no
 * máximo 1 UA (8 minutos), menos que o arredondamento a minutos de
 * uma viagem de horas — e a ficha diz "daqui" do jeito que o visitante
 * lê, sem prometer a geometria Terra–sonda que ela não calcula.
 */
export function montarFichaDeSonda(sonda: Sonda, jd: number | null | undefined): Ficha {
  const ingles = idiomaAtual() === 'en';
  const no = (texto: { pt: string; en: string }) => (ingles ? texto.en : texto.pt);
  const horizons = t('ficha.fonte.horizons', { data: dataNaLingua(CONSULTADO_EM) });
  const agora: (LinhaDaFicha | null)[] = [];
  const e = jd !== null && jd !== undefined ? estadoDaSonda(sonda.id, jd) : null;
  if (e) {
    const ua = Math.hypot(e[0], e[1], e[2]);
    agora.push(linha(t('ficha.sonda.doSol'), t('unidade.ua', { n: numeroDoIdioma(ua) }), 'derivado', horizons));
    const minutos = Math.round((ua * SEGUNDOS_DE_LUZ_POR_UA) / 60);
    const luz =
      minutos >= 60
        ? `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`
        : `${minutos} min`;
    agora.push(linha(t('ficha.sonda.luz'), luz, 'derivado', t('ficha.fonte.daTrajetoria')));
    const v = Math.hypot(e[3], e[4], e[5]) * KM_POR_S_POR_UA_DIA;
    agora.push(linha(t('ficha.sonda.velocidade'), `${numeroDoIdioma(v)} km/s`, 'derivado', horizons));
  } else {
    const janela = janelaDaSonda(sonda.id);
    const depois = janela && jd !== null && jd !== undefined && jd > janela[1];
    agora.push(
      linha(t('ficha.sonda.doSol'), t(depois ? 'ficha.sonda.depoisDaJanela' : 'ficha.sonda.foraDaJanela'), null)
    );
  }
  agora.push(linha(t('ficha.sonda.naCena'), t('ficha.sonda.naCena.valor'), 'artistico', t('ficha.fonte.reguaDeEscala')));
  const missao: (LinhaDaFicha | null)[] = [
    linha(t('ficha.sonda.lancamento'), dataNaLingua(sonda.lancamento.data), 'medido', sonda.lancamento.fonte),
    ...sonda.sobrevoos.map((sv) =>
      linha(
        t('ficha.sonda.sobrevoo', { corpo: sv.nome ? no(sv.nome) : (nomeDoCorpo(sv.corpo) ?? sv.corpo) }),
        dataNaLingua(sv.data),
        'medido',
        sv.fonte
      )
    ),
    sonda.heliopausa
      ? linha(t('ficha.sonda.heliopausa'), dataNaLingua(sonda.heliopausa.data), 'medido', sonda.heliopausa.fonte)
      : null,
    linha(
      t('ficha.sonda.estado', { data: dataNaLingua(CONSULTADO_EM) }),
      no(sonda.estado.texto),
      'medido',
      sonda.estado.fonte
    ),
    linha(t('ficha.sonda.trajetoria'), no(sonda.notaDaTrajetoria), 'derivado', horizons),
  ];
  const secoes: SecaoDaFicha[] = [
    { id: 'sonda', titulo: TITULO('sonda'), linhas: agora.filter((l): l is LinhaDaFicha => l !== null) },
    { id: 'missao', titulo: TITULO('missao'), linhas: missao.filter((l): l is LinhaDaFicha => l !== null) },
  ];
  return { id: `sonda:${sonda.id}`, nome: sonda.nome, classe: classeEmTexto('sonda'), secoes };
}

/** UA com as casas que a distância pede (0,587 · 4,34 · 35,0) */
function emUa(x: number): string {
  const casas = x < 1 ? 3 : x < 10 ? 2 : 1;
  return t('unidade.ua', { n: decimalDoIdioma(x.toFixed(casas)) });
}

/** JD TDB → AAAA-MM-DD (UTC; o minuto de TDB−UTC não muda o dia aqui) */
function isoDoJd(jd: number): string {
  return new Date((jd - 2_440_587.5) * 86_400_000).toISOString().slice(0, 10);
}

/**
 * A FICHA DE UM COMETA (pilar 4, 12/11/2026), no molde da das sondas.
 * "Agora" é viva no instante mostrado: as distâncias ao Sol e à Terra, a
 * velocidade e se ele está aceso — a mesma lei que acende as partículas
 * (`brilhoRelativo`). "A órbita" diz o que é medido (os elementos) e até
 * onde a cônica vale. "O cometa" é o que se sabe dele, cada fato com a
 * fonte. A Terra sai da efeméride viva; antes dela chegar, a linha some.
 */
export function montarFichaDeCometa(
  cometa: Cometa,
  jd: number | null | undefined,
  fonte: FonteDaFicha | null | undefined
): Ficha {
  const ingles = idiomaAtual() === 'en';
  const no = (texto: { pt: string; en: string }) => (ingles ? texto.en : texto.pt);
  const horizons = t('ficha.fonte.horizons', { data: dataNaLingua(COMETAS_CONSULTADOS_EM) });
  const conta = t('ficha.fonte.elementos');
  const agora: (LinhaDaFicha | null)[] = [];
  const temData = jd !== null && jd !== undefined && Number.isFinite(jd);
  const e = temData ? estadoDoCometa(cometa.id, jd) : null;
  // sem instante não se sabe se está aceso: vale o texto do cometa aceso,
  // que descreve tudo o que a cena sabe desenhar
  let aceso = true;
  if (e && temData) {
    const r = Math.hypot(e[0], e[1], e[2]);
    agora.push(linha(t('ficha.cometa.doSol'), emUa(r), 'derivado', conta));
    if (fonte) {
      const terra = fonte.posicaoHeliocentrica('earth', jd);
      const d = Math.hypot(e[0] - terra.x, e[1] - terra.y, e[2] - terra.z);
      agora.push(linha(t('ficha.cometa.daTerra'), emUa(d), 'derivado', conta));
    }
    const v = Math.hypot(e[3], e[4], e[5]) * KM_POR_S_POR_UA_DIA;
    agora.push(linha(t('ficha.cometa.velocidade'), `${numeroDoIdioma(v)} km/s`, 'derivado', conta));
    aceso = brilhoRelativo(cometa, r) > LIMIAR_DE_ATIVIDADE;
    agora.push(
      linha(
        t('ficha.cometa.atividade'),
        t(aceso ? 'ficha.cometa.ativo' : 'ficha.cometa.inativo'),
        'derivado',
        t('ficha.fonte.modeloDeAtividade')
      )
    );
  }
  // O QUE SE VÊ SEGUE A ATIVIDADE (crítica de 13/11): o 67P inativo
  // descrevia coma e caudas acesas que a cena, pela mesma lei, não desenha
  agora.push(
    linha(
      t('ficha.cometa.naCena'),
      t(aceso ? 'ficha.cometa.naCena.valor' : 'ficha.cometa.naCena.inativo'),
      'artistico',
      t('ficha.fonte.modeloDasCaudas')
    )
  );

  const orbita: (LinhaDaFicha | null)[] = [];
  const c = temData ? conjuntoVigente(cometa.id, jd) : null;
  if (c && temData) {
    const { ultimo, proximo } = perieliosEmVolta(cometa.id, jd);
    if (ultimo)
      orbita.push(
        linha(t('ficha.cometa.ultimo'), dataNaLingua(isoDoJd(ultimo.jd)), ultimo.derivado ? 'derivado' : 'medido', ultimo.derivado ? conta : horizons)
      );
    if (proximo)
      orbita.push(
        linha(t('ficha.cometa.proximo'), dataNaLingua(isoDoJd(proximo.jd)), proximo.derivado ? 'derivado' : 'medido', proximo.derivado ? conta : horizons)
      );
    orbita.push(linha(t('ficha.cometa.perielio'), emUa(c[1]), 'medido', horizons));
    const P = periodoEmDias(c);
    orbita.push(
      P === null
        ? linha(t('ficha.cometa.periodo'), t('ficha.cometa.semVolta', { e: decimalDoIdioma(c[2].toFixed(2)) }), 'medido', horizons)
        : linha(t('ficha.cometa.periodo'), formatarDuracao(P), 'derivado', conta)
    );
    orbita.push(linha(t('ficha.cometa.excentricidade'), decimalDoIdioma(c[2].toFixed(4)), 'medido', horizons));
    orbita.push(
      linha(t('ficha.cometa.limite'), t('ficha.cometa.limite.valor', { data: dataNaLingua(isoDoJd(c[0])) }), 'derivado', horizons)
    );
  }

  const fatos: (LinhaDaFicha | null)[] = [
    linha(t('ficha.cometa.designacao'), cometa.designacao, 'medido', 'IAU / MPC'),
    linha(
      t('ficha.cometa.nucleo'),
      cometa.nucleo.km ? `${numeroDoIdioma(cometa.nucleo.km)} km` : cometa.nucleo.texto ? no(cometa.nucleo.texto) : null,
      cometa.nucleo.km ? 'medido' : null,
      cometa.nucleo.fonte
    ),
    linha(t('ficha.cometa.descoberta'), `${dataNaLingua(cometa.descoberta.data)} · ${cometa.descoberta.quem}`, 'medido', cometa.descoberta.fonte),
    linha(
      t('ficha.cometa.brilho'),
      `${decimalDoIdioma(cometa.brilho.M1.toFixed(1))} · ${decimalDoIdioma(cometa.brilho.K1.toFixed(1))}`,
      'medido',
      cometa.brilho.fonte
    ),
    linha(t('ficha.cometa.fama'), no(cometa.fama.texto), 'medido', cometa.fama.fonte),
  ];
  const so = (l: (LinhaDaFicha | null)[]) => l.filter((x): x is LinhaDaFicha => x !== null);
  const secoes: SecaoDaFicha[] = [
    { id: 'cometa', titulo: TITULO('cometa'), linhas: so(agora) },
    ...(orbita.length ? [{ id: 'orbitaDoCometa' as const, titulo: TITULO('orbitaDoCometa'), linhas: so(orbita) }] : []),
    { id: 'oCometa', titulo: TITULO('oCometa'), linhas: so(fatos) },
  ];
  return { id: `cometa:${cometa.id}`, nome: nomeConhecido(cometa), classe: classeEmTexto(cometa.classe), secoes };
}

// ─── OS EXOPLANETAS (12/11/2026) ─────────────────────────────────────────

const ARQUIVO_DE_EXOPLANETAS = (): string =>
  t('ficha.fonte.arquivoDeExoplanetas', { data: dataNaLingua(EXOPLANETAS_CONSULTADOS_EM) });
const UA_DE_MERCURIO = 0.387;
const TERRAS_POR_JUPITER_RAIO = 11.21;
const TERRAS_POR_JUPITER_MASSA = 317.8;

/** a zona habitável em texto ("0,025–0,050 UA") */
function zonaEmTexto(e: EstrelaVisitavel): string {
  const hz = zonaHabitavel(e.teffK.v, e.luminosidadeLsol.v);
  const casas = hz.foraUA < 1 ? 3 : 2;
  return t('unidade.ua', {
    n: `${decimalDoIdioma(hz.dentroUA.toFixed(casas))}–${decimalDoIdioma(hz.foraUA.toFixed(casas))}`,
  });
}

function fonteDaZona(e: EstrelaVisitavel): string {
  return zonaHabitavel(e.teffK.v, e.luminosidadeLsol.v).presa
    ? `${FONTE_DA_ZONA_HABITAVEL}; ${t('ficha.exo.zonaPresa', {
        a: inteiroDoIdioma(HZ_TEFF_VALIDA[0]),
        b: inteiroDoIdioma(HZ_TEFF_VALIDA[1]),
      })}`
    : FONTE_DA_ZONA_HABITAVEL;
}

const METODOS = {
  transito: 'ficha.exo.metodo.transito',
  velocidadeRadial: 'ficha.exo.metodo.velocidadeRadial',
  imagem: 'ficha.exo.metodo.imagem',
} as const satisfies Record<Exoplaneta['metodo'], string>;

/**
 * O SISTEMA PLANETÁRIO na ficha da anfitriã: quantos planetas, como
 * foram achados, a zona habitável e a história — e o que a cena mostra.
 */
function secaoDoSistema(nome: string, e: EstrelaVisitavel): SecaoDaFicha | null {
  const sistema = sistemaDaEstrela(nome);
  if (!sistema) return null;
  const ingles = idiomaAtual() === 'en';
  const arquivo = ARQUIVO_DE_EXOPLANETAS();
  const n = sistema.planetas.length;
  const contagem = new Map<Exoplaneta['metodo'], number>();
  for (const pl of sistema.planetas) contagem.set(pl.metodo, (contagem.get(pl.metodo) ?? 0) + 1);
  const comoAchados = [...contagem].map(([m, k]) => `${t(METODOS[m])} (${k})`).join(' · ');
  const letras = sistema.planetas.map((pl) => pl.nome.split(' ').pop()).join(', ');
  const linhas: (LinhaDaFicha | null)[] = [
    linha(
      t('ficha.exo.planetas'),
      n === 0 ? t('ficha.exo.nenhum') : `${n} (${letras})`,
      'medido',
      arquivo
    ),
    n > 0 ? linha(t('ficha.exo.comoAchados'), comoAchados, 'medido', arquivo) : null,
    ...(sistema.cinturoes ?? []).map((c) =>
      linha(ingles ? c.nome.en : c.nome.pt, emUa(c.aUA), 'medido', c.fonte)
    ),
    linha(t('ficha.exo.zonaHabitavel'), zonaEmTexto(e), 'derivado', fonteDaZona(e)),
    linha(t('ficha.exo.historia'), ingles ? sistema.nota.en : sistema.nota.pt, 'medido', sistema.nota.fonte),
    linha(t('ficha.cometa.naCena'), t('ficha.exo.sistemaNaCena'), 'derivado', arquivo),
  ];
  return { id: 'sistemaPlanetario', titulo: TITULO('sistemaPlanetario'), linhas: linhas.filter((l): l is LinhaDaFicha => l !== null) };
}

/** "× de Mercúrio" para órbitas curtas, "× da Terra" para as longas */
function distanciaComparada(aUA: number): string {
  return aUA < 0.6
    ? t('ficha.exo.comoMercurio', { ua: emUa(aUA), k: decimalDoIdioma((aUA / UA_DE_MERCURIO).toPrecision(2)) })
    : t('ficha.exo.comoTerra', { ua: emUa(aUA), k: decimalDoIdioma(aUA.toPrecision(2)) });
}

/** em Terras até 4, em Júpiteres acima (com as Terras ao lado) */
function emTerrasOuJupiteres(terras: number, porJupiter: number): string {
  const jup = terras / porJupiter;
  return terras < 4 || jup < 0.25
    ? t('ficha.exo.terras', { v: decimalDoIdioma(terras.toPrecision(3)) })
    : t('ficha.exo.jupiteres', { v: decimalDoIdioma(jup.toPrecision(3)), terras: inteiroDoIdioma(terras) });
}

/**
 * A TEMPERATURA, numa linha só (14/11/2026): a de equilíbrio do arquivo
 * quando ele a traz; senão a calculada aqui, dizendo como.
 */
function linhaDaTemperatura(planeta: Exoplaneta, estrela: EstrelaVisitavel | null): LinhaDaFicha | null {
  const teq = planeta.teqK ?? (estrela ? Math.round(climaDaFicha(planeta, estrela).teqK) : null);
  if (teq === null) return null;
  return linha(
    t('ficha.exo.temperatura'),
    `${inteiroDoIdioma(teq)} K (${inteiroDoIdioma(teq - 273.15)} °C)`,
    'derivado',
    t(planeta.teqK === null ? 'ficha.exo.fonte.equilibrioCalculada' : 'ficha.exo.fonte.equilibrio')
  );
}

/** o clima de um planeta com os números da ficha física da estrela */
function climaDaFicha(planeta: Exoplaneta, estrela: EstrelaVisitavel) {
  return climaDoExoplaneta(planeta, {
    teffK: estrela.teffK.v,
    raioRsol: estrela.raioRsol.v,
    massaMsol: estrela.massaMsol.v,
    luminosidadeLsol: estrela.luminosidadeLsol.v,
  });
}

/**
 * A CARA NA CENA, por canal (13/11/2026): a CLASSE é derivada dos números
 * (com as fontes das fronteiras), a COR é medida só em HD 189733 b, a
 * SUPERFÍCIE é sempre imaginada — o desenho da casa a partir da classe —,
 * e o GIRO de quem não está travado é o medido ou um suposto (14/11).
 */
function linhasDaFace(planeta: Exoplaneta, estrela: EstrelaVisitavel | null): (LinhaDaFicha | null)[] {
  const linhas: (LinhaDaFicha | null)[] = [];
  if (estrela) {
    const c = climaDaFicha(planeta, estrela);
    const gas = c.classe === 'subnetuno' || c.classe === 'giganteQuente' || c.classe === 'giganteFrio';
    const classe = [
      t(`ficha.exo.classe.${c.classe}`),
      gas ? ` (${t(`ficha.exo.nuvens.${c.sudarsky}`)})` : '',
      c.travado ? `; ${t('ficha.exo.travado')}` : '',
    ].join('');
    linhas.push(
      linha(t('ficha.exo.classe'), classe, 'derivado', t('ficha.exo.fonte.classe', { fontes: FONTES_DA_CLASSE })),
      linha(
        t('ficha.exo.superficie'),
        t(
          gas
            ? planeta.albedo
              ? 'ficha.exo.superficie.gasMedida'
              : 'ficha.exo.superficie.gas'
            : c.classe === 'lava'
              ? 'ficha.exo.superficie.lava'
              : c.classe === 'rochosoQuente'
                ? 'ficha.exo.superficie.quente'
                : c.classe === 'gelado'
                  ? 'ficha.exo.superficie.gelado'
                  : 'ficha.exo.superficie.rochoso'
        ),
        'artistico',
        t('ficha.exo.fonte.imaginada')
      )
    );
    const giro = giroDoExoplaneta(planeta, c);
    const horas = giro ? decimalDoIdioma(giro.horas.toFixed(1)) : '';
    if (giro?.fonte) linhas.push(linha(t('ficha.exo.giro'), t('ficha.exo.giro.medido', { h: horas }), 'derivado', giro.fonte));
    else if (giro) {
      const como = gas ? (c.classe === 'subnetuno' ? 'netuno' : 'jupiter') : 'terra';
      linhas.push(linha(t('ficha.exo.giro'), t(`ficha.exo.giro.${como}`, { h: horas }), 'artistico', t('ficha.exo.fonte.giro')));
    }
  }
  if (planeta.albedo) {
    linhas.push(linha(t('ficha.exo.aparencia'), t('ficha.exo.aparencia.medida'), 'medido', planeta.albedo.fonte));
  }
  return linhas;
}

/**
 * A FICHA DE UM EXOPLANETA. "O planeta" é o que o arquivo sabe, cada
 * número com o selo e a fonte; "o que se vê aqui" separa o medido (a
 * órbita), o derivado (a zona habitável) e o convencional ou desconhecido
 * (a orientação no espaço, a fase sem conjunção publicada, a aparência).
 */
export function montarFichaDeExoplaneta(
  planeta: Exoplaneta,
  sistema: SistemaPlanetario,
  estrela: EstrelaVisitavel | null
): Ficha {
  const arquivo = ARQUIVO_DE_EXOPLANETAS();
  const R = planeta.raioTerra;
  const M = planeta.massaTerra;
  const hz = estrela ? zonaHabitavel(estrela.teffK.v, estrela.luminosidadeLsol.v) : null;
  const zona = hz
    ? planeta.aUA < hz.dentroUA
      ? t('ficha.exo.zona.dentroDaBorda')
      : planeta.aUA > hz.foraUA
        ? t('ficha.exo.zona.alemDaBorda')
        : t('ficha.exo.zona.dentro')
    : null;
  const oPlaneta: (LinhaDaFicha | null)[] = [
    linha(t('ficha.cometa.periodo'), formatarDuracao(planeta.periodoDias), 'medido', arquivo),
    // o semieixo sai do período e da massa da estrela; na imagem direta, da órbita vista
    linha(t('ficha.exo.distancia'), distanciaComparada(planeta.aUA), planeta.metodo === 'imagem' ? 'medido' : 'derivado', arquivo),
    planeta.e > 0 ? linha(t('ficha.cometa.excentricidade'), decimalDoIdioma(planeta.e.toFixed(3)), 'medido', arquivo) : null,
    linhaDoNumero(t('ficha.exo.tamanho'), emTerrasOuJupiteres(R.v, TERRAS_POR_JUPITER_RAIO), R),
    linha(
      t('ficha.exo.massa'),
      M.minima
        ? t('ficha.exo.massaMinima', { v: emTerrasOuJupiteres(M.v, TERRAS_POR_JUPITER_MASSA) })
        : emTerrasOuJupiteres(M.v, TERRAS_POR_JUPITER_MASSA),
      M.p,
      M.fonte
    ),
    linhaDaTemperatura(planeta, estrela),
    estrela && zona ? linha(t('ficha.exo.zonaHabitavel'), `${zona} (${zonaEmTexto(estrela)})`, 'derivado', fonteDaZona(estrela)) : null,
    linha(t('ficha.exo.descoberta'), `${t(METODOS[planeta.metodo])}, ${planeta.ano}`, 'medido', arquivo),
    linha(
      t('ficha.exo.situacao'),
      t(planeta.contestado ? 'ficha.exo.contestado' : 'ficha.exo.confirmado'),
      'medido',
      arquivo
    ),
  ];
  const g = geometriaDoPlaneta(planeta, sistema);
  const orientacao = t('ficha.exo.orientacao.valor', {
    i: g.iMedida
      ? t('ficha.exo.medida', { v: `${decimalDoIdioma(g.iGraus.toFixed(1))}°` })
      : t('ficha.exo.convencional', { v: `${INCLINACAO_CONVENCIONAL_GRAUS}°` }),
    nodo: g.nodoMedido
      ? t('ficha.exo.medida', { v: `${decimalDoIdioma(g.nodoGraus.toFixed(1))}°` })
      : t('ficha.exo.convencional', { v: '0°' }),
  });
  const naCena: (LinhaDaFicha | null)[] = [
    linha(t('ficha.exo.orbita'), t('ficha.exo.orbita.valor'), 'medido', arquivo),
    linha(
      t('ficha.exo.orientacao'),
      orientacao,
      g.iMedida && g.nodoMedido ? 'medido' : 'artistico',
      g.nodoMedido ? (sistema.nodo?.fonte ?? arquivo) : t('ficha.exo.fonte.convencao')
    ),
    planeta.tc !== null
      ? linha(
          t('ficha.exo.fase'),
          t(planeta.origemDoTc === 'transito' ? 'ficha.exo.fase.transito' : 'ficha.exo.fase.conjuncao', {
            data: dataNaLingua(isoDoJd(planeta.tc)),
          }),
          'medido',
          arquivo
        )
      : linha(t('ficha.exo.fase'), t('ficha.exo.fase.arbitraria'), 'artistico', t('ficha.exo.fonte.convencao')),
    estrela ? linha(t('ficha.exo.zonaHabitavel'), t('ficha.exo.zona.naCena'), 'derivado', fonteDaZona(estrela)) : null,
    ...linhasDaFace(planeta, estrela),
  ];
  const so = (l: (LinhaDaFicha | null)[]) => l.filter((x): x is LinhaDaFicha => x !== null);
  return {
    id: `exoplaneta:${planeta.id}`,
    nome: planeta.nome,
    classe: classeEmTexto('exoplaneta'),
    secoes: [
      { id: 'exoplaneta', titulo: TITULO('exoplaneta'), linhas: so(oPlaneta) },
      { id: 'oQueSeVe', titulo: TITULO('oQueSeVe'), linhas: so(naCena) },
    ],
  };
}

/**
 * A FICHA INTEIRA. `null` para id que esta casa não desenha — os seis do
 * doador sem alvo aqui (gonggong, orcus, sedna, salacia, vanth, weywot) e
 * qualquer coisa que não seja um corpo. Não chutar é a lei do arquivo: uma
 * ficha vazia com um nome inventado seria pior que ficha nenhuma.
 */
export function montarFicha(entrada: EntradaDaFicha): Ficha | null {
  const nomes = NOMES_DOS_CORPOS[entrada.id];
  if (!nomes) return null;

  const pt = editorialDoIdioma(entrada.editorial);
  const secoes: SecaoDaFicha[] = [
    { id: 'agora', titulo: TITULO('agora'), linhas: secaoAgora(entrada) },
    { id: 'fisico', titulo: TITULO('fisico'), linhas: secaoFisico(entrada.id) },
    { id: 'aneis', titulo: TITULO('aneis'), linhas: secaoAneis(entrada.id) },
    { id: 'orbita', titulo: TITULO('orbita'), linhas: secaoOrbita(entrada) },
    { id: 'ceu', titulo: TITULO('ceu'), linhas: secaoCeu(entrada) },
    { id: 'contexto', titulo: TITULO('contexto'), linhas: secaoContexto(pt) },
    { id: 'curiosidades', titulo: TITULO('curiosidades'), linhas: secaoCuriosidades(pt) },
    { id: 'imagem', titulo: TITULO('imagem'), linhas: secaoImagem(entrada.id, entrada.texturas, entrada.realceDoRelevo) },
  ];

  return {
    id: entrada.id,
    nome: nomeDoCorpo(entrada.id) ?? nomes.nome,
    classe: classeEmTexto(nomes.classe),
    secoes: secoes.filter((s) => s.linhas.length > 0),
  };
}
