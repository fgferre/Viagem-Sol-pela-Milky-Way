// ============================================================
// A FÍSICA DE UM CORPO, em funções puras — massa, gravidade de superfície,
// velocidade de escape e o "×Terra".
//
// TUDO AQUI É CONTA, NUNCA DADO. O dado é `GM_CORPOS` (`massas.ts`, do
// kernel `gm_de440.tpc`) e `BODY_AXES` (`iauOrientation.ts`, do
// `pck00011.tpc`); daqui saem só derivações dos dois, e é por isso que a
// ficha rotula estas linhas como **derivado** e não como medido.
//
// O DOADOR FAZIA DIFERENTE, e a diferença é a obra. Em `atlas-orbital` massa
// e gravidade eram STRINGS de exibição (`"3.301 × 10²³ kg"`), reparseadas em
// runtime por uma varredura de sobrescritos Unicode
// (`AstroPhysics.parseScientificValue`) sempre que alguém precisava do
// número. Ou seja: dado de tela virando dado de física, com um parser de
// caracteres no meio. Aqui o caminho é o inverso — o número vem do kernel, a
// conta é uma linha, e a string nasce no fim.
//
// O RAIO É O EQUATORIAL, e a escolha vale para as três contas. Os corpos são
// triaxiais e `BODY_AXES` guarda `[a, b, c]`; usar `a` em tudo é o que
// mantém coerente o raio que a ficha IMPRIME e o raio que as contas USAM —
// imprimir 6.378 km e calcular com 6.371 seria a casa discordando de si
// mesma numa mesma seção. É também a convenção das tabelas de referência da
// NASA para gravidade de superfície: a Terra sai em 9,798 m/s² (a tabela
// arredonda para 9,80) e Júpiter em 24,79 m/s², os dois batendo na casa
// decimal. O preço declarado é a velocidade de escape: com o raio equatorial
// a Terra dá 11,18 km/s, contra os 11,186 que a mesma tabela publica usando
// o raio médio volumétrico. 0,05% — e a alternativa era duas réguas de raio
// na mesma ficha.
//
// AS REGRAS DO "×Terra" MIGRAM COMO REQUISITO, não como código: o
// `getEarthComparison` do doador (`Sidebar.tsx`) resolveu dois problemas
// reais que valem aqui, e as duas soluções estão reproduzidas em
// `razaoTerra` com as razões dele — a GRAFIA do selo é
// `formatarRazaoTerra`, e mora com as outras vírgulas da casa
// (`lib/unidades.ts`):
//
//   1. ABAIXO DE 1e-3 NÃO HÁ SELO. Mimas é 6,3e-6 da massa da Terra, e duas
//      casas decimais escreveriam "0,00× Terra" para um corpo que
//      evidentemente tem massa. Selo nenhum é honesto; um arredondado a nada
//      não é.
//   2. ALGARISMOS SIGNIFICATIVOS ABAIXO DE 1. Duas casas servem para razões
//      em torno de 1 e acima, mas achatam a massa de Io (0,015) em "0,01".
//
// E o `1,00× Terra` da faixa 0,99–1,01 é o mesmo: a Terra comparada consigo
// mesma tem de dizer exatamente um, sem o ruído do arredondamento.
// ============================================================
import { RAIO_SOL_KM } from '../../three/escala';
import { BODY_AXES } from './iauOrientation';
import { GM_CORPOS } from './massas';

/**
 * Constante gravitacional (m³ kg⁻¹ s⁻²), CODATA 2018. Ela entra em UM lugar
 * só — `massaDeGm` — e é a razão de a massa ser o último dos três derivados
 * e não o primeiro: `G` é a constante fundamental pior conhecida da física
 * (incerteza relativa de 2,2e-5), enquanto `GM` é medido direto. Gravidade e
 * escape não passam por aqui.
 *
 * Sem `export`: quem quiser julgá-la julga a massa que ela produz.
 */
const G_M3_KG_S2 = 6.6743e-11;

/**
 * O raio EQUATORIAL em km — `a` de `BODY_AXES`, com o Sol vindo de
 * `RAIO_SOL_KM` (a fotosfera não tem entrada no kernel de figuras, e o
 * `eclipse.ts` já importa a mesma constante pela mesma aresta declarada).
 * `null` quando o corpo não tem figura embarcada.
 */
export function raioEquatorialKm(id: string): number | null {
  if (id === 'sun') return RAIO_SOL_KM;
  const eixos = BODY_AXES[id];
  return eixos ? eixos[0] : null;
}

/**
 * O GM do corpo em km³/s², ou `null` quando o kernel não o cobre. Interno:
 * é a leitura que as quatro funções públicas abaixo compartilham, e nada
 * fora deste arquivo pergunta um μ cru.
 */
function gmDoCorpo(id: string): number | null {
  const gm = GM_CORPOS[id];
  return gm === undefined ? null : gm;
}

/**
 * Gravidade de superfície no equador, em m/s²: `g = GM/R²`. `null` quando
 * falta GM ou figura — a ficha não escreve a linha, nunca escreve "N/A".
 */
export function gravidadeSuperficie(id: string): number | null {
  const gm = gmDoCorpo(id);
  const raio = raioEquatorialKm(id);
  if (gm === null || raio === null || raio <= 0) return null;
  // GM vem em km³/s² e R em km: a razão sai em km/s², e o fator 1.000 a
  // leva a m/s² sem nenhum outro passe de unidade.
  return (1000 * gm) / (raio * raio);
}

/**
 * Velocidade de escape do equador, em km/s: `v = √(2GM/R)`. Com GM em km³/s²
 * e R em km o resultado já é km/s.
 */
export function velocidadeDeEscape(id: string): number | null {
  const gm = gmDoCorpo(id);
  const raio = raioEquatorialKm(id);
  if (gm === null || raio === null || raio <= 0) return null;
  return Math.sqrt((2 * gm) / raio);
}

/**
 * Massa em kg, de `GM/G`. É o derivado mais fraco dos três — ver `G_M3_KG_S2`
 * — e existe porque o visitante pergunta "quanto pesa", não "qual o μ".
 */
export function massaDeGm(id: string): number | null {
  const gm = gmDoCorpo(id);
  if (gm === null) return null;
  // km³/s² → m³/s² é ×1e9; dividir por G devolve quilogramas.
  return (gm * 1e9) / G_M3_KG_S2;
}

/**
 * A RAZÃO CONTRA A TERRA, ou `null` quando ela não carrega informação — as
 * duas regras herdadas do doador, com os motivos no cabeçalho. Devolve
 * NÚMERO e não texto: quem decide a grafia é `formatarRazaoTerra`
 * (`lib/unidades.ts`), e separar as duas coisas é o que permite a um teste
 * julgar a regra sem julgar a vírgula.
 */
export function razaoTerra(
  valor: number | null,
  valorDaTerra: number | null
): number | null {
  if (
    valor === null ||
    valorDaTerra === null ||
    !Number.isFinite(valor) ||
    !Number.isFinite(valorDaTerra) ||
    valorDaTerra === 0
  ) {
    return null;
  }
  const razao = valor / valorDaTerra;
  if (razao >= 0.99 && razao <= 1.01) return 1;
  if (razao < 1e-3) return null;
  return razao;
}
