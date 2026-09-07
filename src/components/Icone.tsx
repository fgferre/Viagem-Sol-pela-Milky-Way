// ============================================================
// O CONJUNTO DE ÍCONES DA CASA — um SVG inline por nome, sempre com a
// mesma grade (Lote 2a, PLAN-UI.md §4/§11: "um conjunto de ícones SVG
// (Icone.tsx)"). Os caminhos são cópia do "miolo" (os `<path>`/`<circle>`
// de dentro do `<svg>`, sem os atributos do invólucro) dos arquivos em
// `capturas/maquetes/icones/*.svg` — Lucide, licença ISC (ver
// `LICENSE-lucide.txt`, ao lado deste arquivo).
//
// `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` e
// `stroke-width="1.5"` são os mesmos das duas peles (§4, "traço 1,5,
// currentColor"); o TAMANHO do desenho na tela vem de `tamanho` (px),
// nunca do CSS do chamador — um ícone que herdasse `font-size` mudaria
// de escala junto com o texto ao redor sem ninguém pedir.
//
// ACESSIBILIDADE: sem `titulo`, o ícone é decoração de um rótulo que já
// existe ao lado (`aria-hidden`, o padrão de toda a casa até aqui — ver
// `atlas-gaveta-icone`). Com `titulo`, ele é a ÚNICA informação (por
// exemplo, um botão que só tem o ícone) e vira `role="img"` com
// `<title>`, o jeito acessível de nomear um SVG sem duplicar o texto
// como `aria-label` do próprio `<svg>`.
// ============================================================
import type { ReactElement, SVGProps } from 'react';

export type NomeDoIcone =
  | 'busca'
  | 'camadas'
  | 'info'
  | 'play'
  | 'pausa'
  | 'explorar'
  | 'retomar'
  | 'galaxia'
  | 'ajustes'
  | 'fechar'
  | 'chevronCima'
  | 'chevronBaixo'
  | 'chevronDireita'
  | 'setaEsquerda'
  | 'relogio'
  | 'aproximar'
  | 'sistema'
  | 'link'
  | 'ok'
  | 'alerta'
  | 'ajuda'
  | 'bussola'
  | 'qualidade'
  | 'voltarCapitulo'
  | 'avancarCapitulo'
  | 'velocidade';

/** O miolo de cada ícone — só os elementos de desenho, sem o `<svg>` em
 *  volta (isso é o componente, embaixo). Uma entrada por nome, na mesma
 *  ordem do PLAN-UI.md §4 para achar rápido no diff. */
const CAMINHOS: Record<NomeDoIcone, () => ReactElement> = {
  busca: () => (
    <>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </>
  ),
  camadas: () => (
    <>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </>
  ),
  info: () => (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  play: () => <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />,
  pausa: () => (
    <>
      <rect x="14" y="3" width="5" height="18" rx="1" />
      <rect x="5" y="3" width="5" height="18" rx="1" />
    </>
  ),
  explorar: () => (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
    </>
  ),
  retomar: () => (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  galaxia: () => (
    <>
      <path d="M20.341 6.484A10 10 0 0 1 10.266 21.85" />
      <path d="M3.659 17.516A10 10 0 0 1 13.74 2.152" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
    </>
  ),
  ajustes: () => (
    <>
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  fechar: () => (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  chevronCima: () => <path d="m18 15-6-6-6 6" />,
  chevronBaixo: () => <path d="m6 9 6 6 6-6" />,
  chevronDireita: () => <path d="m9 18 6-6-6-6" />,
  setaEsquerda: () => (
    <>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </>
  ),
  relogio: () => (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  aproximar: () => (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
      <line x1="11" x2="11" y1="8" y2="14" />
      <line x1="8" x2="14" y1="11" y2="11" />
    </>
  ),
  sistema: () => (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  link: () => (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  ok: () => <path d="M20 6 9 17l-5-5" />,
  alerta: () => (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </>
  ),
  ajuda: () => (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  bussola: () => <polygon points="3 11 22 2 13 21 11 13 3 11" />,
  qualidade: () => (
    <>
      <path d="M10 5H3" />
      <path d="M12 19H3" />
      <path d="M14 3v4" />
      <path d="M16 17v4" />
      <path d="M21 12h-9" />
      <path d="M21 19h-5" />
      <path d="M21 5h-7" />
      <path d="M8 10v4" />
      <path d="M8 12H3" />
    </>
  ),
  voltarCapitulo: () => (
    <>
      <path d="M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z" />
      <path d="M3 20V4" />
    </>
  ),
  avancarCapitulo: () => (
    <>
      <path d="M21 4v16" />
      <path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" />
    </>
  ),
  velocidade: () => (
    <>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </>
  ),
};

export function Icone({
  nome,
  tamanho = 20,
  titulo,
  ...resto
}: {
  nome: NomeDoIcone;
  /** lado do quadrado, em px CSS — o desenho é sempre `viewBox 0 0 24 24` */
  tamanho?: number;
  /** presente = o ícone É a informação (`role="img"` + `<title>`);
   *  ausente = decoração de um rótulo que já existe ao lado (`aria-hidden`) */
  titulo?: string;
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox' | 'fill' | 'stroke'>) {
  const Miolo = CAMINHOS[nome];
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo == null ? 'true' : undefined}
      role={titulo != null ? 'img' : undefined}
      {...resto}
    >
      {titulo != null && <title>{titulo}</title>}
      <Miolo />
    </svg>
  );
}
