// ============================================================
// A LÍNGUA DO VISITANTE — um dicionário, uma função, um lugar.
//
// O item 130 pede o app inteiro bilíngue (pt-BR e inglês). O mecanismo
// é pequeno DE PROPÓSITO: duas tabelas planas (`idioma/pt.ts` e
// `idioma/en.ts`), uma função `t()` que troca `{param}` por valor, e um
// estado de módulo com assinantes. Sem biblioteca — uma dependência de
// i18n traria plural CLDR, carregamento assíncrono e contexto React que
// este app não precisa: aqui as duas tabelas cabem no bundle e a troca
// é síncrona.
//
// A PRECEDÊNCIA: preferência guardada pelo visitante (localStorage) >
// língua do navegador (`navigator.languages`, `pt*` → pt-BR, o resto →
// en) > pt-BR. A URL NÃO entra nessa escada como painel: `?lang=` é
// INSTRUMENTO DE CAPTURA (ver `iniciarIdioma`), declarado no capturador
// que o usa, e nunca oferecido ao visitante — quem troca a língua é o
// seletor do painel de Ajustes, e ele troca AO VIVO, sem recarregar.
//
// O PADRÃO É pt-BR E ELE NÃO SE RESOLVE SOZINHO. `iniciarIdioma()` é
// chamado UMA vez, no `main.tsx`, e é o único ponto que olha storage,
// navegador ou URL. Fora do navegador — testes em Node, scripts de
// dado — ninguém o chama e a língua fica em pt-BR: a saída de toda
// função de texto da casa continua sendo, byte a byte, a que sempre
// foi. Resolver no primeiro `t()` faria o jsdom (que se declara `en-US`)
// virar o app inteiro em inglês dentro da suíte, calado.
//
// MÓDULO PURO fora de `iniciarIdioma`/`definirIdioma`: sem React, sem
// three, sem DOM. É por isso que `lib/unidades.ts` pode lê-lo sem
// inverter nenhuma seta. Quem precisa da troca dentro do React usa
// `hooks/useIdioma.ts`, que assina daqui.
// ============================================================
import { PT } from './idioma/pt';
import { EN } from './idioma/en';

export type Idioma = 'pt-BR' | 'en';

/** As duas línguas, na ordem em que o seletor as oferece. */
export const IDIOMAS: readonly { id: Idioma; nome: string }[] = [
  { id: 'pt-BR', nome: 'Português' },
  { id: 'en', nome: 'English' },
];

/**
 * A CHAVE É O QUE A TABELA pt TEM. Chave nova nasce em `idioma/pt.ts`;
 * `idioma/en.ts` é tipado contra ela, então uma tradução que falte é
 * erro de compilação, e não um buraco que só a tela mostra.
 */
export type ChaveDeTexto = keyof typeof PT;

const TABELAS: Record<Idioma, Record<ChaveDeTexto, string>> = { 'pt-BR': PT, en: EN };

const CHAVE_NO_STORAGE = 'viagem-idioma';

let idioma: Idioma = 'pt-BR';
const ouvintes = new Set<() => void>();

/** Um rótulo de língua vira `Idioma`, ou `null` quando não é nenhuma. */
export function normalizarIdioma(bruto: string | null | undefined): Idioma | null {
  if (!bruto) return null;
  const limpo = bruto.trim().toLowerCase();
  if (limpo === 'pt' || limpo.startsWith('pt-') || limpo === 'pt-br') return 'pt-BR';
  if (limpo === 'en' || limpo.startsWith('en-')) return 'en';
  return null;
}

/**
 * A LÍNGUA DO NAVEGADOR, pela lista de preferências: a primeira que se
 * reconhece manda. `pt*` é pt-BR; qualquer OUTRA língua conhecida do
 * visitante cai em inglês, porque inglês é a segunda língua que este app
 * tem — devolver pt-BR a quem pediu japonês seria escolher pelo lado
 * errado.
 */
export function idiomaDaLista(linguas: readonly string[]): Idioma {
  for (const lingua of linguas) {
    const achada = normalizarIdioma(lingua);
    if (achada) return achada;
    // língua reconhecida mas sem tabela: o inglês é o fallback do mundo
    if (lingua.trim().length > 0) return 'en';
  }
  return 'pt-BR';
}

/**
 * A ESCOLHA, UMA VEZ, no boot do navegador (`main.tsx`).
 *
 * `?lang=` é INSTRUMENTO DE CAPTURA e só isso: os juízes de imagem
 * precisam pedir uma língua sem tocar no storage do perfil, e o
 * capturador que a usa declara o pedido no próprio comando. Ela não
 * grava nada — recarregar sem a porta devolve a língua do visitante — e
 * não aparece em nenhum lugar da UI: a URL desta casa é espelho da
 * VISTA, não painel de controle (decisão do dono, item 76).
 */
export function iniciarIdioma(busca?: string): Idioma {
  const daPorta = normalizarIdioma(new URLSearchParams(busca ?? '').get('lang'));
  if (daPorta) {
    idioma = daPorta;
    return idioma;
  }
  idioma = lerPreferenciaDeIdioma() ?? idiomaDoNavegador();
  return idioma;
}

/** A preferência guardada, ou `null`. Storage bloqueado nunca trava o boot. */
export function lerPreferenciaDeIdioma(): Idioma | null {
  try {
    return normalizarIdioma(window.localStorage.getItem(CHAVE_NO_STORAGE));
  } catch {
    return null;
  }
}

function idiomaDoNavegador(): Idioma {
  try {
    const lista = navigator.languages?.length ? navigator.languages : [navigator.language];
    return idiomaDaLista(lista.filter(Boolean));
  } catch {
    return 'pt-BR';
  }
}

/** A língua de agora. */
export function idiomaAtual(): Idioma {
  return idioma;
}

/**
 * TROCA AO VIVO — grava a preferência e acorda quem assina. Nada
 * recarrega: o HUD re-renderiza pelo hook e o que o Director publica a
 * cada quadro (o instante do céu, a taxa, o rumo) sai na língua nova no
 * quadro seguinte.
 */
export function definirIdioma(novo: Idioma): void {
  if (novo === idioma) return;
  idioma = novo;
  try {
    window.localStorage.setItem(CHAVE_NO_STORAGE, novo);
  } catch {
    /* storage cheio ou bloqueado: a sessão troca, a próxima esquece */
  }
  for (const ouvinte of ouvintes) ouvinte();
}

/** Assina a troca; devolve o cancelamento (contrato do `useSyncExternalStore`). */
export function assinarIdioma(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/**
 * O TEXTO da chave, na língua de agora, com `{nome}` trocado pelo
 * parâmetro. Chave sem tradução devolve a própria chave — é feio na
 * tela de propósito, para o buraco aparecer em vez de virar string
 * vazia (e o tipo `ChaveDeTexto` já o impede em tempo de compilação).
 */
export function t(chave: ChaveDeTexto, params?: Record<string, string | number>): string {
  const cru = TABELAS[idioma][chave] ?? PT[chave] ?? chave;
  if (!params) return cru;
  return cru.replace(/\{(\w+)\}/g, (inteiro, nome: string) =>
    nome in params ? String(params[nome]) : inteiro
  );
}

/** O separador decimal da língua — a vírgula do pt-BR, o ponto do inglês. */
export function separadorDecimal(): string {
  return idioma === 'en' ? '.' : ',';
}

/** Um número com ponto decimal vira o da língua: `1.5` → `1,5` em pt-BR. */
export function decimalDoIdioma(texto: string): string {
  return idioma === 'en' ? texto : texto.replace('.', ',');
}
