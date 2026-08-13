// ============================================================
// O CADASTRO DE ESCALA — o registro único de tudo que a cena desenha
// fora do tamanho real, com o valor verdadeiro ao lado e o fator na cara.
//
// POR QUE ELE EXISTE. O Sol da cena tem raio 0,011 pc (`config.ts:9`)
// contra 2,2567e-8 pc reais — 487 mil vezes. A justificativa escrita é
// uma frase: "escala real seria invisível". A frase está ERRADA, e é o
// erro que este arquivo existe para não deixar acontecer de novo: o Sol
// real visto de 12.800 UA tem magnitude −6,2 — o objeto mais brilhante
// daquele céu. O que ele não é, ali, é um DISCO. Estrela longe não é
// invisível; é um PONTO. Quem confunde as duas coisas infla o corpo em
// vez de aproximar a câmera.
//
// O defeito de verdade nunca foi um número errado. Foi a AUSÊNCIA DE UM
// LUGAR onde a mentira tivesse de se declarar: sem cadastro, uma escala
// artística nasce num arquivo, vira âncora de outras cinco decisões
// (`lodStellar.ts` inteiro é calibrado no raio inflado) e some da vista.
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
// módulo é PURO (importa só `WORLD` e duas constantes de `lib/atlas`,
// todos sem dependência) porque o selo o lê e o selo não conhece three.
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
import { WORLD } from './config';
import { AU_PARA_PC } from '../lib/atlas/frameGalactico';
import { AU_KM } from '../lib/atlas/elementosOrbitais';

/**
 * km → pc pela MESMA cadeia que a cena usa para pôr corpo no lugar
 * (`corpos/terra.ts:98`: `BODY_AXES/AU_KM × AU_PARA_PC`). Redigitar
 * 206.264 aqui seria a segunda fonte de verdade de sempre.
 */
export function kmParaPc(km: number): number {
  return (km / AU_KM) * AU_PARA_PC;
}

/**
 * Raio da fotosfera solar, km. É o MESMO valor que a lib de eclipse usa
 * para a geometria de umbra e penumbra (`lib/atlas/eclipse.ts:374`,
 * `RAIO_SOL_KM`), e essa coincidência é o achado que derruba a última
 * defesa do raio inflado: a FÍSICA do produto já trata o Sol pelo
 * tamanho verdadeiro — só o DESENHO o infla.
 *
 * AÇÃO DE MERGE, declarada para não virar segunda fonte de verdade: a
 * lib de eclipse nasceu na Onda 6 (F2c) depois desta branch. No merge,
 * um dos dois símbolos morre e o outro fica — o endereço natural é
 * aqui, num módulo sem dependência nenhuma, com o eclipse importando.
 */
export const RAIO_SOL_KM = 696_340;

/** Raio da fotosfera solar em pc — o número que o `config.ts:8` chamou
 *  de invisível. */
export const RAIO_SOL_PC = kmParaPc(RAIO_SOL_KM);

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
    fator: WORLD.sunRadius / RAIO_SOL_PC,
    endereco: 'src/three/config.ts:9',
    razao:
      'o disco artístico foi inflado para o plano de abertura do filme render a ' +
      '0,062 pc; o certo era aproximar a câmera, não crescer o corpo',
  },
  {
    id: 'sgr-a',
    nome: 'Sagittarius A✱',
    classe: 'corpo',
    fator: ESPELHO_RS_SGR_A_PC / raioDeSchwarzschildPc(MASSA_SGR_A_MSOL),
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
    endereco: 'src/three/world/heroStars.ts:139',
    razao:
      'é o borrão da óptica, não o corpo — sem ele nenhuma estrela apareceria, ' +
      'e ele não tapa nada (não escreve profundidade). Fator medido em Sirius',
  },
  {
    id: 'nuvem-co',
    nome: 'nuvens de gás observadas',
    classe: 'instrumento',
    fator: ESPELHO_ESCALA_NUVEM_CO,
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
    endereco: 'src/three/world/observedClouds.ts:21',
    razao: 'mesmo motivo das nuvens de CO, com dose menor',
  },
  {
    id: 'nucleo-nebulosa',
    nome: 'núcleos de nebulosa do corredor',
    classe: 'instrumento',
    fator: null,
    endereco: 'src/three/config.ts:30',
    razao:
      'a POSIÇÃO é derivada de observação (Bolha Local, complexo de Órion); o ' +
      'raio, de 9 a 26 pc, é escolha de autor e não tem contraparte medida',
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
  sol: 'F3 — a escada em tamanho e a abertura refilmada',
  'sgr-a': 'F5 — o raio sai da massa (4,15e6 M☉)',
};

/**
 * O que o selo mostra quando declara FORA DE ESCALA: quem está inflado e
 * quanto, do pior para o melhor. Só CORPOS — o instrumento não é desvio
 * de escala, é óptica, e entra na lista aberta do cadastro, não na
 * acusação.
 */
export function culpadosDaEscala(
  raioDoSolPc: number = WORLD.sunRadius
): readonly EscalaDeclarada[] {
  return CADASTRO_DE_ESCALA.map((e) =>
    // O RAIO DO SOL É VIVO desde a F1: a porta `?solreal=1` constrói o
    // Sol com o raio FÍSICO, e nessa vista a acusação do cadastro
    // estaria MENTINDO ao contrário — dizendo que o Sol está 487.441×
    // maior quando ele está no tamanho certo. Um selo que acusa quem já
    // pagou é tão desonesto quanto um que cala sobre quem deve.
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
