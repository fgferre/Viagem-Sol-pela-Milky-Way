// ============================================================
// O CADASTRO DE ESCALA — o registro único de tudo que a cena desenha
// fora do tamanho real, com o valor verdadeiro ao lado e o fator na cara.
//
// POR QUE ELE EXISTE. O Sol da cena tinha raio 0,011 pc (`config.ts:9`)
// contra 2,2567e-8 pc reais — 487 mil vezes. A justificativa escrita era
// uma frase: "escala real seria invisível". A frase estava ERRADA, e é o
// erro que este arquivo existe para não deixar acontecer de novo: o Sol
// real visto de 12.800 UA tem magnitude −6,2 — o objeto mais brilhante
// daquele céu. O que ele não é, ali, é um DISCO. Estrela longe não é
// invisível; é um PONTO. Quem confunde as duas coisas infla o corpo em
// vez de aproximar a câmera.
//
// O defeito de verdade nunca foi um número errado. Foi a AUSÊNCIA DE UM
// LUGAR onde a mentira tivesse de se declarar: sem cadastro, uma escala
// artística nasce num arquivo, vira âncora de outras cinco decisões
// (`lodStellar.ts` inteiro era calibrado no raio inflado) e some da
// vista.
//
// A DÍVIDA DO SOL FOI PAGA NA F3 (2026-08-13): a câmera desceu a 4,00
// milhões de km e o corpo voltou ao tamanho, com a MESMA composição de
// abertura. O que o cadastro guarda dele agora é o fator 1, a lápide do
// raio antigo e a prova reproduzível da acusação que ele sofria — e a
// obrigação continua de pé para o próximo (Sgr A✱, na F5).
//
// A REGRA, e ela é testável por máquina:
//
//   Quem TAPA o que está atrás (escreve profundidade) tem raio físico
//   real. Quem só BRILHA por cima pode ter tamanho de instrumento — e
//   se declara aqui.
//
// A fronteira separa de verdade, e foi conferida: a fotosfera é material
// opaco (`world/sol/sun.js:856-861`, sem `transparent`); o clarão
// (`world/heroStars.ts:229-231`), a coroa e as raias já não escrevem
// profundidade. Não é régua inventada: é a diferença entre CORPO e
// BORRÃO DO INSTRUMENTO, que é como SpaceEngine, Celestia e Stellarium
// resolvem o mesmo problema — raio físico sempre, e a troca ponto↔disco
// decidida por ÂNGULO, nunca por raio inflado.
//
// ESPELHOS DECLARADOS, no molde de `atlasConfig.NOMES_DOS_CORPOS`. Este
// módulo é PURO (importa só duas constantes de `lib/atlas`, ambas sem
// dependência) porque o selo o lê e o selo não conhece three. Desde a F3
// ele também não importa mais o `config.ts`: o raio do Sol saiu de lá e
// veio para cá, que é onde a régua de escala mora.
// Os números que moram em arquivos que importam three (`blackHole.ts`,
// `heroStars.ts`, `observedClouds.ts`) entram aqui como ESPELHO, e
// `escala.test.ts` cobra a igualdade contra a fonte real — divergência
// quebra o teste, não a tela.
// ============================================================
// O IMPORT DE `AU_KM` NÃO PESA, e a checagem fica escrita porque o
// próprio `config.ts:243` avisa que `elementosOrbitais` (22 kB) é
// mantido FORA do bundle de quem só quer o filme, por `import()`
// dinâmico. Conferido: o módulo já é estaticamente alcançável a partir
// do Director — `director.ts:23` importa `corpos/terra.ts`, que na
// `:62` faz exatamente este mesmo `import { AU_KM }`. Esta aresta liga
// a um nó que já está no grafo; não abre caminho novo. Se um dia a
// Terra sair do caminho estático, esta linha vira dívida e o aviso do
// `config.ts` volta a valer.
import { AU_PARA_PC } from '../lib/atlas/frameGalactico';
import { AU_KM } from '../lib/atlas/elementosOrbitais';
// A UNIDADE DE LUZ (F1). A seta aponta só nesta direção: `luzDaCasa.ts` não
// importa daqui — toda função dela que precisa de um raio o RECEBE — e é assim
// que os dois cadastros da casa, o de tamanho e o de brilho, ficam sem ciclo.
import { M_V_SOL, M_V_SOL_DO_CAMPO, SOBRETAXA_DO_HALO } from './luzDaCasa';

/**
 * km → pc pela MESMA cadeia que a cena usa para pôr corpo no lugar
 * (`corpos/terra.ts:98`: `BODY_AXES/AU_KM × AU_PARA_PC`). Redigitar
 * 206.264 aqui seria a segunda fonte de verdade de sempre.
 */
export function kmParaPc(km: number): number {
  return (km / AU_KM) * AU_PARA_PC;
}

/**
 * Raio da fotosfera solar, km — e a FONTE ÚNICA dele em toda a casa. É
 * o mesmo valor que a lib de eclipse usa para a geometria de umbra e
 * penumbra, e essa coincidência é o achado que derruba a última defesa
 * do raio inflado: a FÍSICA do produto já tratava o Sol pelo tamanho
 * verdadeiro — só o DESENHO o inflava.
 *
 * A AÇÃO DE MERGE ACONTECEU (merge da Onda 6). A lib de eclipse nasceu
 * na F2c depois desta branch e digitou o próprio 696.340; as duas
 * cópias existiram no mesmo grafo pelo tempo do merge e não sobreviveu
 * nenhuma além desta. `lib/atlas/eclipse.ts` importa daqui e re-exporta
 * para os seus consumidores — o endereço natural era este, um módulo
 * que só depende de `AU_KM` e `AU_PARA_PC`, os mesmos dois que o
 * eclipse já importava, então a aresta não abriu ciclo.
 */
export const RAIO_SOL_KM = 696_340;

/** Raio da fotosfera solar em pc — o número que o `config.ts:8` chamou
 *  de invisível. */
export const RAIO_SOL_PC = kmParaPc(RAIO_SOL_KM);

/**
 * A LÁPIDE DO RAIO ARTÍSTICO (F3). Foi `WORLD.sunRadius` em
 * `config.ts:9` de 2026-08-03 a 2026-08-13: 0,011 pc = 2.269 UA,
 * 487.441× a fotosfera real, e a âncora escondida de meia dúzia de
 * decisões. A F3 tirou-o da cena — o Sol da casa passou a ter raio
 * FÍSICO —, e ele sobrevive aqui, NOMEADO e sem consumidor de imagem,
 * por três razões que não são sentimentais:
 *
 *  1. A ABERTURA REFILMADA nasce dele. O plano de abertura conservou a
 *     COMPOSIÇÃO exata do antigo: o Sol subtende os mesmos 19,762° (76%
 *     da altura na lente de 26°). Isso é `r/d` constante, e a única
 *     forma de escrever "mesma composição" sem digitar um ângulo à mão é
 *     dividir o raio real por este — `cinematic/journey.ts` faz
 *     exatamente essa conta, e por isso o ângulo sai IDÊNTICO ao antigo
 *     (diferença medida: 0,0e0).
 *  2. Dois números da casa continuam CALIBRADOS nele e ninguém os
 *     re-derivou ainda: o epsilon de segmento do GLSL da coroa
 *     (`world/stellarBody.ts`, 1e-4 de mundo sobre 0,011 pc = 0,909% do
 *     raio) e o `DISC_ENTER_RAD` do gate por ângulo sólido que dorme em
 *     `world/lodStellar.ts` (0,011/0,16 pc). Fingir que eles saem do
 *     raio real seria trocar a mentira de escala por uma mentira de
 *     procedência — que é o defeito que este arquivo existe para
 *     impedir.
 *  3. É o valor contra o qual o fator 487.441× do cadastro foi medido, e
 *     apagá-lo apagaria a prova do que se consertou.
 *
 * NADA NOVO PODE SE ANCORAR AQUI. Quem precisar do tamanho do Sol usa
 * `RAIO_SOL_PC`; quem precisar do que a CENA desenha usa
 * `RAIO_DO_SOL_NA_CENA`, logo abaixo — e desde a F3 os dois são o mesmo
 * número.
 */
export const RAIO_ARTISTICO_DO_SOL_PC = 0.011;

/**
 * O RAIO COM QUE A CENA DESENHA O SOL — a fonte única depois da F3.
 * `world/stellarBody.ts` constrói a instância com ele, o Director o
 * entrega ao palco e ao oclusor da nebulosa, e o cadastro abaixo mede o
 * fator contra `RAIO_SOL_PC` a partir dele. Serem o MESMO símbolo é o
 * que faz o teste do cadastro exigir fator 1 sem ninguém lembrar de
 * apertá-lo: mudar o desenho para um raio inventado quebra a suíte na
 * hora.
 */
export const RAIO_DO_SOL_NA_CENA = RAIO_SOL_PC;

/**
 * ONDE COMEÇA A ESCALA DO SISTEMA SOLAR — 0,05 pc, e a F3 lhe deu nome
 * próprio porque até ela este número era `DEEP_LIMIAR_PC`
 * (`world/lodStellar.ts`) e respondia DUAS perguntas diferentes com uma
 * constante só:
 *   (i)  "onde o disco artístico do Sol morre?" — pergunta de LOD, que
 *        morreu junto com o disco na F3;
 *   (ii) "onde a câmera deixa de medir o mundo em parsecs e passa a
 *        medi-lo em UA?" — esta, que não morre nunca.
 * Enquanto as duas dividiam a mesma constante, mexer no LOD do Sol
 * mexia no plano de corte, na velocidade do voo livre e na camada dos
 * dez corpos — três coisas que não têm nada com o tamanho do disco.
 *
 * A ÂNCORA, escrita porque antes não havia nenhuma: 0,05 pc = 10.313 UA.
 * O corpo mais distante do retrato é Plutão, que orbita a 35,4 UA — ou
 * seja, quem cruza esta fronteira está 291× mais longe do Sol do que o
 * último corpo da família. É folga de duas ordens de grandeza, e é ela
 * que autoriza o degrau declarado do near (`core/engine.ts`) e o do piso
 * de velocidade (`cinematic/cameraRig.ts`) a acontecerem aqui sem
 * ninguém ver.
 *
 * CONGELADA na F3, com a razão medida: são `ua500`, `ua150`, `ua40` e o
 * modo Atlas inteiro que dependem deste número, e eles TÊM de sair
 * bit-idênticos da fase que refilmou a abertura.
 */
export const LIMIAR_SISTEMA_SOLAR_PC = 0.05;

/**
 * Raio de Schwarzschild por massa solar, km: `2GM/c²`. Constante de
 * física, não calibração — é o que torna o raio de Sgr A✱ DERIVADO da
 * massa em vez de escolhido.
 */
export const RS_POR_MASSA_SOLAR_KM = 2.953_250_077;

/** Massa de Sgr A✱ em massas solares — espelho de `world/blackHole.ts:13`. */
export const MASSA_SGR_A_MSOL = 4.15e6;

/** Raio de Schwarzschild de uma massa em massas solares, em pc. */
export function raioDeSchwarzschildPc(massaMsol: number): number {
  return kmParaPc(RS_POR_MASSA_SOLAR_KM * massaMsol);
}

// ---- os espelhos dos arquivos que importam three -------------------
// Cada um destes tem um teste que confere contra a fonte real.

/** Espelho de `world/blackHole.ts:27` (`RS_PC`). */
export const ESPELHO_RS_SGR_A_PC = 0.05;
/** Espelho de `world/heroStars.ts:139` (`size = 0.08 * lum`). */
export const ESPELHO_COEF_CLARAO_PC = 0.08;
/** Espelho de `world/observedClouds.ts:20` (`CO_RADIUS_SCALE`). */
export const ESPELHO_ESCALA_NUVEM_CO = 2.1;
/** Espelho de `world/observedClouds.ts:21` (`LARGE_RADIUS_SCALE`). */
export const ESPELHO_ESCALA_COMPLEXO = 1.2;

/**
 * Sirius como EXEMPLAR do clarão estelar: magnitude aparente −1,46 e
 * raio 1,711 R☉ — o mesmo 1,711 que `lodStellar.test.ts:536` já usa
 * como múltiplo de raio solar. A lei do clarão não tem um número só
 * (ela é `0,08 × 10^(−0,3m)`), então o cadastro declara o fator NUMA
 * estrela nomeada, que é o que se pode conferir.
 */
export const SIRIUS_M = -1.46;
export const SIRIUS_RAIO_RSOL = 1.711;

/**
 * As duas classes, e a fronteira entre elas é a REGRA deste arquivo.
 *
 * `corpo` — escreve profundidade, tapa o que está atrás. Tem de ter
 *   raio físico real; fator diferente de 1 é DÍVIDA, com fase que a paga.
 * `instrumento` — só soma luz por cima, não tapa nada. Pode ter tamanho
 *   de instrumento (é borrão de óptica, não corpo), mas se declara aqui.
 */
export type ClasseDeEscala = 'corpo' | 'instrumento';

export interface EscalaDeclarada {
  /** id estável — é por ele que a exceção aberta se casa com a fase */
  id: string;
  /** o nome que o visitante lê no selo */
  nome: string;
  classe: ClasseDeEscala;
  /**
   * Quantas vezes o que a cena desenha é maior que o real. `1` é
   * honesto; `null` é "não há contraparte medida para comparar" — e
   * `null` NÃO é desculpa: é uma declaração de que o número é de autor.
   */
  fator: number | null;
  /**
   * A SEGUNDA COLUNA (F1 da luz): quantas vezes o que a cena EMITE é mais
   * brilhante que a lei da casa manda, na unidade de `luzDaCasa.ts`.
   * `1` é honesto; `null` é "não há contraparte medida", com a mesma
   * ressalva do `fator`.
   *
   * POR QUE ELA NASCEU. Este cadastro tinha coluna para TAMANHO e nenhuma
   * para BRILHO — e foi por esse buraco que a maior mentira de escala da
   * casa entrou calada: a fotosfera do Sol é autorada em radiância ~1
   * enquanto a lei do ponto deposita ~2,7e10 para a MESMA superfície. São
   * ~26 magnitudes entre dois desenhos do mesmo objeto, e elas não
   * quebravam teste nenhum, porque não havia onde declará-las.
   *
   * É OBRIGATÓRIA, não opcional, e a diferença não é estilo: campo
   * opcional é campo que se pode deixar em branco, e uma coluna que se
   * pode deixar em branco não impede nada. Quem acrescentar entrada é
   * obrigado a olhar para o brilho dela.
   */
  fatorDeBrilho: number | null;
  /** arquivo:linha — a fonte única do número da cena */
  endereco: string;
  /** por que está assim, numa frase que o visitante entenderia */
  razao: string;
}

/**
 * O CADASTRO. Ordem: os corpos primeiro (são os que devem dívida), do
 * maior fator para o menor; depois os instrumentos.
 */
export const CADASTRO_DE_ESCALA: readonly EscalaDeclarada[] = [
  {
    id: 'sol',
    nome: 'Sol',
    classe: 'corpo',
    fator: RAIO_DO_SOL_NA_CENA / RAIO_SOL_PC,
    // QUITADA em 15/08 (F2). A segunda coluna nasceu declarando 3,7e-11 —
    // a malha emitia a paleta H-alfa autorada (~1) enquanto a lei do ponto
    // depositava ~2,7e10 para a MESMA superfície, ~26 magnitudes entre dois
    // desenhos do mesmo objeto. Agora a fotosfera emite a radiância
    // verdadeira pela ponte de unidades (`radianciaDeTela`, aplicada em
    // `world/stellarBody.ts`), e o fator é 1: o Sol está na unidade da casa.
    // O número velho não se perde — ele continua saindo de
    // `vaoRadiometricoNaTroca` e o invariante da troca o cobra por teste.
    fatorDeBrilho: 1,
    endereco: 'src/three/escala.ts:134',
    razao:
      'PAGO na F3: o disco era 487.441× maior para o plano de abertura render a ' +
      '0,062 pc; a câmera desceu a 4,00 milhões de km e o corpo voltou ao tamanho',
  },
  {
    id: 'sgr-a',
    nome: 'Sagittarius A✱',
    classe: 'corpo',
    fator: ESPELHO_RS_SGR_A_PC / raioDeSchwarzschildPc(MASSA_SGR_A_MSOL),
    fatorDeBrilho: null,
    endereco: 'src/three/world/blackHole.ts:27',
    razao:
      'o disco de acreção foi inflado para ler como Gargantua no periastro do ' +
      'filme; a física do shader é adimensional em RS e não muda com a escala',
  },
  {
    id: 'clarao-estelar',
    nome: 'clarão das estrelas',
    classe: 'instrumento',
    fator:
      (ESPELHO_COEF_CLARAO_PC * Math.pow(10, -0.3 * SIRIUS_M)) /
      (SIRIUS_RAIO_RSOL * RAIO_SOL_PC),
    fatorDeBrilho: null,
    endereco: 'src/three/world/heroStars.ts:152',
    razao:
      'é o borrão da óptica, não o corpo — sem ele nenhuma estrela apareceria, ' +
      'e ele não tapa nada (não escreve profundidade). Fator medido em Sirius',
  },
  {
    id: 'halo-da-psf',
    nome: 'halo do ponto das estrelas',
    classe: 'instrumento',
    fator: null,
    // MEDIDO por integração numérica do fragment em `luzDaCasa.test.ts`, não
    // estimado: o `STAR_FRAG` deposita o núcleo gaussiano (que É o fluxo, por
    // construção) MAIS um halo de `exp(-r²/18s²)·0,06`, cuja integral vale
    // 0,534 do núcleo dentro do disco do sprite. Os outros dois termos
    // (espinhos de difração e núcleo esbranquiçado) não escalam com o pico e
    // somem no ruído — 3e-11 do depósito na troca.
    fatorDeBrilho: SOBRETAXA_DO_HALO,
    endereco: 'src/three/shaders/starShaders.ts:137',
    razao:
      'o halo é a lente, não a estrela: uma estrela real também borra assim no ' +
      'instrumento. O fluxo fotométrico é o núcleo; o halo soma 53% por cima',
  },
  {
    id: 'ponto-zero-do-campo',
    nome: 'ponto-zero das estrelas',
    classe: 'instrumento',
    fator: null,
    // 4,85 (o campo, via `PONTO_ZERO_SOL_PC`) contra 4,83 (o `SunStar`, via
    // `stellarPhysics.ts`). 0,02 mag em 328.749 estrelas. Declarado e NÃO
    // consertado: unificar move pixel em todo o céu e é decisão do dono.
    fatorDeBrilho: Math.pow(10, 0.4 * (M_V_SOL_DO_CAMPO - M_V_SOL)),
    endereco: 'src/three/world/planetas/planetas.ts:164',
    razao:
      'a casa tem dois pontos-zero para a magnitude absoluta do Sol, 4,85 no ' +
      'campo e 4,83 no clarão — 1,9% de brilho, em todas as estrelas do céu',
  },
  {
    id: 'nuvem-co',
    nome: 'nuvens de gás observadas',
    classe: 'instrumento',
    fator: ESPELHO_ESCALA_NUVEM_CO,
    fatorDeBrilho: null,
    endereco: 'src/three/world/observedClouds.ts:20',
    razao:
      'o raio de catálogo é do centroide observado; o fator agrega o material ' +
      'não resolvido em volta, sem deslocar nada',
  },
  {
    id: 'complexo-grande',
    nome: 'complexos de nuvem grandes',
    classe: 'instrumento',
    fator: ESPELHO_ESCALA_COMPLEXO,
    fatorDeBrilho: null,
    endereco: 'src/three/world/observedClouds.ts:21',
    razao: 'mesmo motivo das nuvens de CO, com dose menor',
  },
  {
    id: 'nucleo-nebulosa',
    nome: 'núcleos de nebulosa do corredor',
    classe: 'instrumento',
    fator: null,
    fatorDeBrilho: null,
    endereco: 'src/three/config.ts:30',
    razao:
      'a POSIÇÃO é derivada de observação (Bolha Local, complexo de Órion); o ' +
      'raio, de 9 a 26 pc, é escolha de autor e não tem contraparte medida',
  },
  {
    id: 'galaxia-particulas',
    nome: 'estrelas não resolvidas da galáxia',
    classe: 'instrumento',
    fator: null,
    fatorDeBrilho: null,
    endereco: 'src/three/shaders/galaxyShaders.ts:64',
    razao:
      'o alfa das 4,02 milhões de partículas é artístico, e acima de 20 px na ' +
      'tela a lei ESCURECE a estrela quando a câmera se aproxima dela',
  },
] as const;

/**
 * A REGRA, como predicado. Corpo com fator diferente de 1 está em dívida.
 * Fator `null` num corpo também viola: um corpo que não sabe o próprio
 * tamanho real é pior que um que sabe e mente.
 */
export function deveDivida(e: EscalaDeclarada): boolean {
  return e.classe === 'corpo' && e.fator !== 1;
}

/**
 * AS DÍVIDAS ABERTAS, com a fase que paga cada uma. Esta tabela é o
 * placar da onda: quando a F3 e a F5 entrarem, a entrada some daqui e
 * `escala.test.ts` passa a EXIGIR fator 1 do corpo — o teste aperta
 * sozinho, sem ninguém lembrar de apertá-lo.
 *
 * Um corpo em dívida sem entrada aqui quebra o teste. É o que impede a
 * próxima escala artística de nascer calada, que foi como esta nasceu.
 */
export const DIVIDAS_ABERTAS: Readonly<Record<string, string>> = {
  // (a linha do `sol` saiu em 2026-08-13, quando a F3 entrou: o teste
  // apertou sozinho e passou a EXIGIR fator 1 do Sol, que é o que este
  // bloco prometia por escrito desde a F0.)
  'sgr-a': 'F5 — o raio sai da massa (4,15e6 M☉)',
};

// ------------------------------------------------------------
// A MESMA MÁQUINA, PARA A COLUNA DE BRILHO (F1 da luz)
//
// Funções IRMÃS, nunca ramos dentro das de cima. A razão é prática: o selo
// consome `acusacaoDaEscala` e um `if` a mais lá dentro faria a acusação de
// TAMANHO mudar de comportamento numa onda que só queria acrescentar uma
// coluna. Duas colunas, duas máquinas, o mesmo formato — e a de tamanho
// continua verde sem uma linha de mudança.
// ------------------------------------------------------------

/**
 * A REGRA DO BRILHO, palavra por palavra a de `deveDivida`: um CORPO que
 * emite diferente do que a lei manda está em dívida, e um corpo que não sabe
 * o próprio brilho (`null`) também — pelo mesmo argumento que vale para o
 * tamanho.
 *
 * Instrumento não entra: o clarão, o halo da PSF e o alfa das partículas são
 * óptica declarada, não desvio de corpo.
 */
export function deveDividaDeBrilho(e: EscalaDeclarada): boolean {
  return e.classe === 'corpo' && e.fatorDeBrilho !== 1;
}

/**
 * AS DÍVIDAS DE BRILHO ABERTAS. O mesmo placar de `DIVIDAS_ABERTAS`, e a
 * promessa foi CUMPRIDA: a linha do `sol` saiu em 15/08, quando a F2 virou
 * padrão, e o oráculo apertou sozinho — o cadastro agora EXIGE fatorDeBrilho
 * 1 do Sol, sem ninguém lembrar de apertá-lo. A coluna continua existindo
 * para a PRÓXIMA mentira de brilho, que é a razão de ela ter nascido.
 */
export const DIVIDAS_DE_BRILHO: Readonly<Record<string, string>> = {
  // (a linha do `sol` saiu em 2026-08-15, com a F2: a fotosfera passou a
  // emitir a radiância verdadeira com a compressão fixa na emissão, e o
  // que era ~26 magnitudes de dívida virou fator 1. O histórico está no
  // git; o invariante da troca, em `luzDaCasa.test.ts`.)
  'sgr-a':
    'SEM FASE MARCADA — a emissão do disco de acreção é autorada e não tem ' +
    'contraparte medida; entra quando a unidade da luz alcançar o buraco negro',
};

/** Quem deve brilho, do pior para o melhor. O `null` vai para o fim. */
export function culpadosDoBrilho(): readonly EscalaDeclarada[] {
  return CADASTRO_DE_ESCALA.filter(deveDividaDeBrilho).sort(
    (a, b) => Math.abs(Math.log10(b.fatorDeBrilho ?? 1)) - Math.abs(Math.log10(a.fatorDeBrilho ?? 1))
  );
}

/**
 * O fator de brilho em texto. Diferente do de tamanho porque a mentira de
 * brilho anda em ORDENS DE GRANDEZA para os dois lados: "3,7e-11×" não diz
 * nada a ninguém, e "27 bilhões de vezes menos luz" diz.
 */
export function brilhoEmTexto(fator: number | null): string {
  if (fator === null || !Number.isFinite(fator) || fator <= 0) return 'brilho de autor';
  if (fator === 1) return 'na unidade da casa';
  const vezes = fator > 1 ? fator : 1 / fator;
  const lado = fator > 1 ? 'mais' : 'menos';
  if (vezes < 100) return `${vezes.toFixed(1).replace('.', ',')}× ${lado} luz`;
  const mag = 2.5 * Math.log10(vezes);
  return `${mag.toFixed(1).replace('.', ',')} magnitudes de ${lado} luz`;
}

/** A linha da acusação de brilho, no formato da de escala. */
export function acusacaoDoBrilho(): readonly string[] {
  return culpadosDoBrilho().map((e) => `${e.nome} emite ${brilhoEmTexto(e.fatorDeBrilho)}`);
}

/**
 * O que o selo mostra quando declara FORA DE ESCALA: quem está inflado e
 * quanto, do pior para o melhor. Só CORPOS — o instrumento não é desvio
 * de escala, é óptica, e entra na lista aberta do cadastro, não na
 * acusação.
 */
export function culpadosDaEscala(
  raioDoSolPc: number = RAIO_DO_SOL_NA_CENA
): readonly EscalaDeclarada[] {
  return CADASTRO_DE_ESCALA.map((e) =>
    // O RAIO DO SOL É VIVO desde a F1, quando a porta `?solreal=1`
    // podia construí-lo com o raio físico e a acusação do cadastro
    // estaria MENTINDO ao contrário — dizendo que o Sol está 487.441×
    // maior quando ele está no tamanho certo. Um selo que acusa quem já
    // pagou é tão desonesto quanto um que cala sobre quem deve.
    // A F3 tornou o padrão o raio físico e a porta morreu; o parâmetro
    // FICA, porque é ele que mantém a lei "o fator sai do que a cena
    // desenha" em vez de virar um `1` digitado — e é ele que o teste de
    // sabotagem usa para provar que inflar o Sol de novo reacende a
    // acusação na hora.
    e.id === 'sol' ? { ...e, fator: raioDoSolPc / RAIO_SOL_PC } : e
  )
    .filter(deveDivida)
    .sort((a, b) => (b.fator ?? Infinity) - (a.fator ?? Infinity));
}

/**
 * O fator em pt-BR, para o selo: "487.437×". Arredonda para inteiro
 * acima de 10 (a casa decimal não diz nada quando o número tem seis
 * dígitos) e guarda uma casa abaixo disso, onde ela é o assunto.
 * Fator ausente vira a palavra honesta, não um número inventado.
 */
export function fatorEmTexto(fator: number | null): string {
  if (fator === null || !Number.isFinite(fator)) return 'raio de autor';
  if (fator < 10) return `${fator.toFixed(1).replace('.', ',')}×`;
  return `${Math.round(fator).toLocaleString('pt-BR')}×`;
}

/**
 * A LINHA DA ACUSAÇÃO, pronta para o HUD: "o Sol está 487.437× maior".
 * Uma frase por culpado, na ordem de `culpadosDaEscala`.
 */
export function acusacaoDaEscala(raioDoSolPc?: number): readonly string[] {
  return culpadosDaEscala(raioDoSolPc).map(
    (e) => `${e.nome} está ${fatorEmTexto(e.fator)} maior`
  );
}
