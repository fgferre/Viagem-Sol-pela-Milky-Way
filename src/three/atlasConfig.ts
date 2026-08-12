// ============================================================
// O CONFIG ÚNICO DO ATLAS (Onda 5, decisão D6) — um arquivo, uma fonte
// de verdade, dois consumidores.
//
// O que mora aqui:
//  1. A TABELA DE CAMADAS da casa. Ela vivia dentro do `Ajustes.tsx`
//     enquanto o painel do filme era o único a lê-la; com a gaveta do
//     Atlas ela passou a ter DOIS leitores, e tabela com dois leitores
//     dentro de um deles é a segunda fonte de verdade nascendo (AGENTS 4).
//     A seleção do Atlas é um CAMPO da mesma tabela, não uma segunda
//     lista: assim é impossível a gaveta oferecer uma camada que o
//     Director não conhece.
//  2. O nome do enquadramento de abertura — o que a ContextLine lê
//     quando o foco não tem nome (ela NUNCA chuta).
//  3. O lugar declarado da GRADAÇÃO POR CONTEXTO da F6: os eixos e
//     limiares dela entram AQUI (D6), e o registro do selo
//     (`selo.ts`) cobra a declaração pela varredura de completude —
//     porta nova neste arquivo sem entrada no registro quebra o teste.
//
// Este arquivo não toca `window`, não importa three e não importa React:
// é lido pelo HUD e pelo Director, e é isso que o mantém testável.
// ============================================================

/** Uma família de coisas na cena que pode ser desligada. */
export interface Camada {
  /** a flag que o Director já lê (`?nogal=1`, `hide.has('nogal')`) */
  flag: string;
  /** rótulo em pt-BR, o mesmo nos dois hospedeiros */
  nome: string;
  /** o tick lê a flag por quadro (troca AO VIVO); senão, exige reload */
  viva: boolean;
  /**
   * Presente ⇒ a camada aparece na GAVETA do Atlas, com este ícone.
   * As galácticas (nogal/nodisc/nogdust/noglow/nowrap/nocart) ficam de
   * fora de propósito (D6): dentro do Atlas elas não são o assunto, e a
   * gaveta é para o que está no quadro de um enquadramento privilegiado.
   */
  icone?: string;
}

/**
 * As camadas da casa, na ordem em que o painel do filme sempre as
 * mostrou. `viva: false` são as lidas no BAKE do mundo (construção):
 * religá-las exige reconstruir, e o painel marca isso com ↻.
 */
export const CAMADAS: readonly Camada[] = [
  { flag: 'nogal', nome: 'Galáxia (tudo)', viva: true },
  { flag: 'nodisc', nome: 'Lâminas do disco', viva: false },
  { flag: 'nogdust', nome: 'Extinção por partícula', viva: false },
  { flag: 'noglow', nome: 'Brilho do bojo', viva: false },
  { flag: 'nocart', nome: 'Cartografia observada', viva: true },
  { flag: 'nonebula', nome: 'Nebulosa volumétrica', viva: true },
  { flag: 'nowrap', nome: 'Campo envolvente', viva: true },
  { flag: 'nocat', nome: 'Catálogo HYG', viva: true, icone: '⁂' },
  { flag: 'nohero', nome: 'Estrelas nomeadas', viva: true, icone: '✦' },
  { flag: 'nomarker', nome: 'Marcador do Sol', viva: true, icone: '⌖' },
  { flag: 'noplan', nome: 'Planetas', viva: true, icone: '◉' },
  { flag: 'nobh', nome: 'Buraco negro (Sgr A✱)', viva: true, icone: '✱' },
];

/**
 * O que a gaveta do Atlas oferece: as cinco de D6, derivadas da tabela
 * acima — nunca redigitadas. Todas são `viva: true` por construção (uma
 * gaveta que recarrega a página tiraria o visitante do modo), e o teste
 * cobra isso.
 */
export const CAMADAS_DO_ATLAS = CAMADAS.filter((c) => c.icone !== undefined);

/**
 * O nome do que o Atlas enquadra quando abre — e o que a ContextLine lê
 * quando o foco não tem nome próprio. "Sistema solar" e não "Sol": o
 * enquadramento de abertura é a órbita mais externa do retrato, ou seja,
 * o sistema inteiro visto de fora (ver `AtlasRig.focarNoSistema`).
 */
export const NOME_DO_SISTEMA = 'Sistema solar';
