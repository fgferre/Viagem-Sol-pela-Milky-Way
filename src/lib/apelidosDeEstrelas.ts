// ============================================================
// APELIDOS DE ESTRELAS FAMOSAS — vocabulário bilíngue (item 129/F5).
// Quem consome esta tabela é a BUSCA: o visitante digita "Sírio" ou
// "North Star" e ela precisa achar a estrela sem saber o nome próprio
// (`n`) que `stars_meta.json` carrega. Cada `nome` abaixo é EXATAMENTE
// esse campo `n` de uma entrada de `named`; lista vazia em `pt`/`en`
// significa que a estrela não tem apelido popular conhecido além do
// próprio nome.
// ============================================================

export const APELIDOS_DE_ESTRELAS: ReadonlyArray<{
  nome: string;
  pt: readonly string[];
  en: readonly string[];
}> = [
  { nome: 'Sirius', pt: ['Sírio'], en: [] },
  { nome: 'Polaris', pt: ['Estrela Polar', 'Estrela do Norte'], en: ['North Star', 'Pole Star'] },
  { nome: 'Rigil Kentaurus', pt: ['Alfa Centauri', 'Alfa do Centauro'], en: ['Alpha Centauri'] },
  { nome: 'Proxima Centauri', pt: ['Próxima Centauri', 'Próxima do Centauro'], en: ['Proxima'] },
  { nome: 'Aldebaran', pt: ['Aldebarã'], en: [] },
  { nome: 'Arcturus', pt: ['Arcturo'], en: [] },
  { nome: 'Canopus', pt: ['Canopo'], en: [] },
  { nome: 'Capella', pt: ['Capela'], en: [] },
  { nome: 'Spica', pt: ['Espiga'], en: [] },
  { nome: 'Regulus', pt: ['Régulo'], en: [] },
  { nome: 'Procyon', pt: ['Prócion'], en: [] },
  { nome: 'Pollux', pt: ['Pólux'], en: [] },
  { nome: 'Betelgeuse', pt: ['Betelgeuze'], en: [] },
  { nome: 'Alnilam', pt: ['Três Marias'], en: ["Orion's Belt"] },
  { nome: 'Alnitak', pt: ['Três Marias'], en: ["Orion's Belt"] },
  { nome: 'Mintaka', pt: ['Três Marias'], en: ["Orion's Belt"] },
  { nome: 'Acrux', pt: ['Cruzeiro do Sul'], en: ['Southern Cross'] },
  { nome: 'Mimosa', pt: ['Cruzeiro do Sul'], en: ['Southern Cross'] },
  { nome: 'Gacrux', pt: ['Cruzeiro do Sul'], en: ['Southern Cross'] },
  { nome: 'Alcyone', pt: ['Plêiades', 'Sete-estrelo'], en: ['Pleiades', 'Seven Sisters'] },
  { nome: 'Achernar', pt: [], en: [] },
  { nome: 'Antares', pt: ['Coração do Escorpião'], en: ['Heart of the Scorpion'] },
  { nome: 'Vega', pt: [], en: [] },
  { nome: 'Altair', pt: [], en: [] },
  { nome: 'Deneb', pt: [], en: [] },
  { nome: 'Fomalhaut', pt: [], en: [] },
  { nome: 'Castor', pt: [], en: [] },
  { nome: 'Mizar', pt: [], en: [] },
  { nome: 'Alcor', pt: [], en: [] },
  { nome: 'Algol', pt: ['Estrela Demônio'], en: ['Demon Star'] },
  { nome: 'Mira', pt: ['Estrela Maravilhosa'], en: ['Wonderful Star'] },
  { nome: 'Dubhe', pt: [], en: [] },
  { nome: 'Alioth', pt: [], en: [] },
  { nome: 'Hadar', pt: ['Agena'], en: ['Agena'] },
  { nome: 'Rigel', pt: [], en: [] },
  { nome: 'Bellatrix', pt: [], en: ['Amazon Star'] },
  { nome: 'Saiph', pt: [], en: [] },
  { nome: 'Denebola', pt: [], en: [] },
  { nome: 'Alphard', pt: [], en: ['Solitary One'] },
];
