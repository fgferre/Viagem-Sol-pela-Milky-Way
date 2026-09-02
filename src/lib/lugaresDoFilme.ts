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
  id: string;
  pt: readonly string[];
  en: readonly string[];
  alvo: { estrela: string } | { centroGalactico: true };
}> = [
  {
    id: 'sagittarius-a',
    pt: ['Sagittarius A*', 'Buraco negro', 'Centro da galáxia', 'Centro galáctico'],
    en: ['Sagittarius A*', 'Black hole', 'Galactic center', 'Galactic centre'],
    alvo: { centroGalactico: true },
  },
];
