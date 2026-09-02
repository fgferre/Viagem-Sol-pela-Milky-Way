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

// ============================================================
// NOMES CORRENTES DAS 88 CONSTELAÇÕES — vocabulário bilíngue (item
// 129/F5). Quem consome esta tabela é a BUSCA: o visitante digita "Cão
// Maior" ou "Southern Cross" e ela precisa achar CMa/Cru sem saber a
// sigla nem o genitivo latino que a tabela acima carrega. `la` é o
// nominativo IAU (o nome oficial, ex. "Crux"); `pt`/`en` são a forma
// corrente em cada língua, e `en` só se afasta do latino quando existe
// um apelido popular de fato buscado (ex. "Southern Cross"); do
// contrário repete `la`.
// ============================================================

export const NOMES_DAS_CONSTELACOES: Record<string, { la: string; pt: string; en: string }> = {
  And: { la: 'Andromeda', pt: 'Andrômeda', en: 'Andromeda' },
  Ant: { la: 'Antlia', pt: 'Máquina Pneumática', en: 'Antlia' },
  Aps: { la: 'Apus', pt: 'Ave-do-Paraíso', en: 'Apus' },
  Aql: { la: 'Aquila', pt: 'Águia', en: 'Aquila' },
  Aqr: { la: 'Aquarius', pt: 'Aquário', en: 'Aquarius' },
  Ara: { la: 'Ara', pt: 'Altar', en: 'Ara' },
  Ari: { la: 'Aries', pt: 'Áries', en: 'Aries' },
  Aur: { la: 'Auriga', pt: 'Cocheiro', en: 'Auriga' },
  Boo: { la: 'Boötes', pt: 'Boieiro', en: 'Boötes' },
  CMa: { la: 'Canis Major', pt: 'Cão Maior', en: 'Canis Major' },
  CMi: { la: 'Canis Minor', pt: 'Cão Menor', en: 'Canis Minor' },
  CVn: { la: 'Canes Venatici', pt: 'Cães de Caça', en: 'Canes Venatici' },
  Cae: { la: 'Caelum', pt: 'Buril', en: 'Caelum' },
  Cam: { la: 'Camelopardalis', pt: 'Girafa', en: 'Camelopardalis' },
  Cap: { la: 'Capricornus', pt: 'Capricórnio', en: 'Capricorn' },
  Car: { la: 'Carina', pt: 'Quilha', en: 'Carina' },
  Cas: { la: 'Cassiopeia', pt: 'Cassiopeia', en: 'Cassiopeia' },
  Cen: { la: 'Centaurus', pt: 'Centauro', en: 'Centaurus' },
  Cep: { la: 'Cepheus', pt: 'Cefeu', en: 'Cepheus' },
  Cet: { la: 'Cetus', pt: 'Baleia', en: 'Cetus' },
  Cha: { la: 'Chamaeleon', pt: 'Camaleão', en: 'Chamaeleon' },
  Cir: { la: 'Circinus', pt: 'Compasso', en: 'Circinus' },
  Cnc: { la: 'Cancer', pt: 'Câncer', en: 'Cancer' },
  Col: { la: 'Columba', pt: 'Pomba', en: 'Columba' },
  Com: { la: 'Coma Berenices', pt: 'Cabeleira de Berenice', en: 'Coma Berenices' },
  CrA: { la: 'Corona Australis', pt: 'Coroa Austral', en: 'Corona Australis' },
  CrB: { la: 'Corona Borealis', pt: 'Coroa Boreal', en: 'Corona Borealis' },
  Crt: { la: 'Crater', pt: 'Taça', en: 'Crater' },
  Cru: { la: 'Crux', pt: 'Cruzeiro do Sul', en: 'Southern Cross' },
  Crv: { la: 'Corvus', pt: 'Corvo', en: 'Corvus' },
  Cyg: { la: 'Cygnus', pt: 'Cisne', en: 'Cygnus' },
  Del: { la: 'Delphinus', pt: 'Golfinho', en: 'Delphinus' },
  Dor: { la: 'Dorado', pt: 'Dourado', en: 'Dorado' },
  Dra: { la: 'Draco', pt: 'Dragão', en: 'Draco' },
  Equ: { la: 'Equuleus', pt: 'Cavalinho', en: 'Equuleus' },
  Eri: { la: 'Eridanus', pt: 'Eridano', en: 'Eridanus' },
  For: { la: 'Fornax', pt: 'Fornalha', en: 'Fornax' },
  Gem: { la: 'Gemini', pt: 'Gêmeos', en: 'Gemini' },
  Gru: { la: 'Grus', pt: 'Grou', en: 'Grus' },
  Her: { la: 'Hercules', pt: 'Hércules', en: 'Hercules' },
  Hor: { la: 'Horologium', pt: 'Relógio', en: 'Horologium' },
  Hya: { la: 'Hydra', pt: 'Hidra', en: 'Hydra' },
  Hyi: { la: 'Hydrus', pt: 'Hidra Macho', en: 'Hydrus' },
  Ind: { la: 'Indus', pt: 'Índio', en: 'Indus' },
  LMi: { la: 'Leo Minor', pt: 'Leão Menor', en: 'Leo Minor' },
  Lac: { la: 'Lacerta', pt: 'Lagarto', en: 'Lacerta' },
  Leo: { la: 'Leo', pt: 'Leão', en: 'Leo' },
  Lep: { la: 'Lepus', pt: 'Lebre', en: 'Lepus' },
  Lib: { la: 'Libra', pt: 'Libra', en: 'Libra' },
  Lup: { la: 'Lupus', pt: 'Lobo', en: 'Lupus' },
  Lyn: { la: 'Lynx', pt: 'Lince', en: 'Lynx' },
  Lyr: { la: 'Lyra', pt: 'Lira', en: 'Lyra' },
  Men: { la: 'Mensa', pt: 'Mesa', en: 'Mensa' },
  Mic: { la: 'Microscopium', pt: 'Microscópio', en: 'Microscopium' },
  Mon: { la: 'Monoceros', pt: 'Unicórnio', en: 'Monoceros' },
  Mus: { la: 'Musca', pt: 'Mosca', en: 'Musca' },
  Nor: { la: 'Norma', pt: 'Régua', en: 'Norma' },
  Oct: { la: 'Octans', pt: 'Octante', en: 'Octans' },
  Oph: { la: 'Ophiuchus', pt: 'Ofiúco', en: 'Ophiuchus' },
  Ori: { la: 'Orion', pt: 'Órion', en: 'Orion' },
  Pav: { la: 'Pavo', pt: 'Pavão', en: 'Pavo' },
  Peg: { la: 'Pegasus', pt: 'Pégaso', en: 'Pegasus' },
  Per: { la: 'Perseus', pt: 'Perseu', en: 'Perseus' },
  Phe: { la: 'Phoenix', pt: 'Fênix', en: 'Phoenix' },
  Pic: { la: 'Pictor', pt: 'Cavalete do Pintor', en: 'Pictor' },
  PsA: { la: 'Piscis Austrinus', pt: 'Peixe Austral', en: 'Piscis Austrinus' },
  Psc: { la: 'Pisces', pt: 'Peixes', en: 'Pisces' },
  Pup: { la: 'Puppis', pt: 'Popa', en: 'Puppis' },
  Pyx: { la: 'Pyxis', pt: 'Bússola', en: 'Pyxis' },
  Ret: { la: 'Reticulum', pt: 'Retículo', en: 'Reticulum' },
  Scl: { la: 'Sculptor', pt: 'Escultor', en: 'Sculptor' },
  Sco: { la: 'Scorpius', pt: 'Escorpião', en: 'Scorpio' },
  Sct: { la: 'Scutum', pt: 'Escudo', en: 'Scutum' },
  Ser: { la: 'Serpens', pt: 'Serpente', en: 'Serpens' },
  Sex: { la: 'Sextans', pt: 'Sextante', en: 'Sextans' },
  Sge: { la: 'Sagitta', pt: 'Flecha', en: 'Sagitta' },
  Sgr: { la: 'Sagittarius', pt: 'Sagitário', en: 'Sagittarius' },
  Tau: { la: 'Taurus', pt: 'Touro', en: 'Taurus' },
  Tel: { la: 'Telescopium', pt: 'Telescópio', en: 'Telescopium' },
  TrA: { la: 'Triangulum Australe', pt: 'Triângulo Austral', en: 'Triangulum Australe' },
  Tri: { la: 'Triangulum', pt: 'Triângulo', en: 'Triangulum' },
  Tuc: { la: 'Tucana', pt: 'Tucano', en: 'Tucana' },
  UMa: { la: 'Ursa Major', pt: 'Ursa Maior', en: 'Great Bear' },
  UMi: { la: 'Ursa Minor', pt: 'Ursa Menor', en: 'Little Bear' },
  Vel: { la: 'Vela', pt: 'Velas', en: 'Vela' },
  Vir: { la: 'Virgo', pt: 'Virgem', en: 'Virgo' },
  Vol: { la: 'Volans', pt: 'Peixe-voador', en: 'Volans' },
  Vul: { la: 'Vulpecula', pt: 'Raposa', en: 'Vulpecula' },
};
