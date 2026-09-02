// ============================================================
// LUGARES DO FILME — vocabulário bilíngue (item 129/F5). Quem consome
// esta tabela é a BUSCA: o visitante digita "Buraco negro" ou "Orion's
// Belt" e ela precisa saltar para o instante da viagem que mostra
// aquele lugar, não para um objeto solto do catálogo. Só entram beats
// de `src/three/cinematic/roteiros/*.json` cujo alvo é uma ÚNICA
// estrela nomeada do catálogo ou o centro galáctico; beats que são só
// um lugar de câmera (sem assunto nomeável) ficam de fora — ver
// relatório da tarefa que criou este arquivo.
// UMA FONTE POR NOME (revisão de 01/09): estrela do catálogo NÃO entra
// aqui — Sirius, Betelgeuse e as Três Marias (apelido das três do
// cinturão) já moram em `apelidosDeEstrelas.ts`/no próprio índice. Só
// mora aqui o destino que não é estrela: o centro galáctico.
// ============================================================

export const LUGARES_DO_FILME: ReadonlyArray<{
  /** a chave do link (`?foco=sagittarius-a`) — ASCII, sem espaço */
  id: string;
  /** o nome que o Director ANUNCIA no rótulo e no cabeçalho da ficha.
   *  Tem de ser igual letra a letra ao de lá (`director/rotulos.ts`):
   *  é por ele que `chaveDoFoco` reconhece o que está em quadro. */
  nome: string;
  pt: readonly string[];
  en: readonly string[];
  alvo: { estrela: string } | { centroGalactico: true };
}> = [
  {
    id: 'sagittarius-a',
    nome: 'Sagittarius A✱',
    pt: ['Sagittarius A*', 'Sgr A*', 'Buraco negro', 'Centro da galáxia', 'Centro galáctico'],
    en: ['Sagittarius A*', 'Sgr A*', 'Black hole', 'Galactic center', 'Galactic centre'],
    alvo: { centroGalactico: true },
  },
];
