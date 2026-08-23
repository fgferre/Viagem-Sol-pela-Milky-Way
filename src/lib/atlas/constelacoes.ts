// ============================================================
// AS 88 CONSTELAÇÕES, da sigla de três letras ao GENITIVO latino.
//
// POR QUE O GENITIVO E NÃO O NOME. A designação de Bayer é "α Canis
// Majoris" — literalmente "o alfa DO Cão Maior" —, e é assim que ela é
// escrita em toda parte desde 1603. Guardar "Canis Major" (nominativo) e
// montar a designação com ele daria "α Canis Major", que não é o nome de
// estrela nenhuma. O genitivo é a forma que a designação PEDE, e por isso é
// a única que esta tabela carrega.
//
// POR QUE A TABELA MORA AQUI e não no `build-star-catalog.mjs`. Ela não é
// medida: é nomenclatura fixada pela IAU em 1922, e não muda quando o
// catálogo é regenerado. O que o catálogo emite por estrela é a SIGLA
// (`c: "CMa"`, a coluna `con` do HYG, três bytes) mais a letra de Bayer
// (`b: "α"`); expandir 1.726 vezes a mesma palavra dentro do
// `stars_meta.json` seria pagar rede por um dicionário que cabe aqui.
//
// SIGLA QUE NÃO ESTIVER NESTE MAPA NÃO VIRA LINHA — a ficha cala em vez de
// imprimir a sigla crua. `constelacoes.test.ts` cobra o contrário do
// silêncio: que TODA sigla viva no `stars_meta.json` tenha entrada aqui, e
// que sejam exatamente 88.
// ============================================================

/**
 * Sigla IAU de três letras → genitivo latino. `export` é ARESTA DE TESTE:
 * o consumidor é `designacaoDeBayer`, logo abaixo, e o gate precisa do
 * MAPA para contar as 88 e cobrar que nenhum genitivo se repita — coisa
 * que a designação de uma estrela, sozinha, não revela.
 */
export const CONSTELACOES: Record<string, string> = {
  And: 'Andromedae',
  Ant: 'Antliae',
  Aps: 'Apodis',
  Aql: 'Aquilae',
  Aqr: 'Aquarii',
  Ara: 'Arae',
  Ari: 'Arietis',
  Aur: 'Aurigae',
  Boo: 'Boötis',
  CMa: 'Canis Majoris',
  CMi: 'Canis Minoris',
  CVn: 'Canum Venaticorum',
  Cae: 'Caeli',
  Cam: 'Camelopardalis',
  Cap: 'Capricorni',
  Car: 'Carinae',
  Cas: 'Cassiopeiae',
  Cen: 'Centauri',
  Cep: 'Cephei',
  Cet: 'Ceti',
  Cha: 'Chamaeleontis',
  Cir: 'Circini',
  Cnc: 'Cancri',
  Col: 'Columbae',
  Com: 'Comae Berenices',
  CrA: 'Coronae Australis',
  CrB: 'Coronae Borealis',
  Crt: 'Crateris',
  Cru: 'Crucis',
  Crv: 'Corvi',
  Cyg: 'Cygni',
  Del: 'Delphini',
  Dor: 'Doradus',
  Dra: 'Draconis',
  Equ: 'Equulei',
  Eri: 'Eridani',
  For: 'Fornacis',
  Gem: 'Geminorum',
  Gru: 'Gruis',
  Her: 'Herculis',
  Hor: 'Horologii',
  Hya: 'Hydrae',
  Hyi: 'Hydri',
  Ind: 'Indi',
  LMi: 'Leonis Minoris',
  Lac: 'Lacertae',
  Leo: 'Leonis',
  Lep: 'Leporis',
  Lib: 'Librae',
  Lup: 'Lupi',
  Lyn: 'Lyncis',
  Lyr: 'Lyrae',
  Men: 'Mensae',
  Mic: 'Microscopii',
  Mon: 'Monocerotis',
  Mus: 'Muscae',
  Nor: 'Normae',
  Oct: 'Octantis',
  Oph: 'Ophiuchi',
  Ori: 'Orionis',
  Pav: 'Pavonis',
  Peg: 'Pegasi',
  Per: 'Persei',
  Phe: 'Phoenicis',
  Pic: 'Pictoris',
  PsA: 'Piscis Austrini',
  Psc: 'Piscium',
  Pup: 'Puppis',
  Pyx: 'Pyxidis',
  Ret: 'Reticuli',
  Scl: 'Sculptoris',
  Sco: 'Scorpii',
  Sct: 'Scuti',
  Ser: 'Serpentis',
  Sex: 'Sextantis',
  Sge: 'Sagittae',
  Sgr: 'Sagittarii',
  Tau: 'Tauri',
  Tel: 'Telescopii',
  TrA: 'Trianguli Australis',
  Tri: 'Trianguli',
  Tuc: 'Tucanae',
  UMa: 'Ursae Majoris',
  UMi: 'Ursae Minoris',
  Vel: 'Velorum',
  Vir: 'Virginis',
  Vol: 'Volantis',
  Vul: 'Vulpeculae',
};

/**
 * A DESIGNAÇÃO DE BAYER inteira — "α Canis Majoris" —, ou `null` quando
 * falta a letra, falta a sigla ou a sigla é desconhecida. Não chutar é a lei
 * do arquivo: "α CMa" na tela seria a casa mostrando o código de coluna do
 * catálogo em vez do nome que a estrela tem.
 */
export function designacaoDeBayer(
  letra: string | undefined,
  sigla: string | undefined
): string | null {
  if (!letra || !sigla) return null;
  const genitivo = CONSTELACOES[sigla];
  return genitivo ? `${letra} ${genitivo}` : null;
}
