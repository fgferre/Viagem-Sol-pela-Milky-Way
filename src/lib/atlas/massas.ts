// ============================================================
// GM DOS CORPOS — o parâmetro gravitacional padrão, em km³/s².
//
// GM É O DADO; massa, gravidade de superfície e velocidade de escape são
// DERIVADOS dele (`fisicaDoCorpo.ts`). A razão é de precisão, não de gosto:
// `GM` é medido diretamente pelo rastreio de sondas e satélites, e é o que os
// kernels publicam; `G` é a constante fundamental pior conhecida da física
// (incerteza na 5ª casa). Uma ficha que exibisse "massa" como dado primário e
// derivasse `g = GM/R²` de volta a partir dela passaria por `G` duas vezes,
// piorando dois números para apresentar um terceiro que ninguém mediu.
//
// PROCEDÊNCIA: `BODY<n>_GM` de `gm_de440.tpc` da NAIF — o MESMO arquivo que
// `MU_PARENT` (`elementosOrbitais.ts`) já citava para os sete pais que ele
// usa. Este bloco é transcrição MÁQUINA→MÁQUINA, emitida por
//
//   node scripts/data/atlas/derive-iau-orientation.js --gm
//
// e colada aqui inteira. NUNCA editar um número à mão — regenerar e colar. A
// disciplina é a que `BODY_AXES` (`iauOrientation.ts`) já segue com o
// `--radii`, e ela existe porque a classe de erro que mata um catálogo é a
// transcrição por olho: um GM no corpo errado renderiza uma gravidade
// perfeitamente plausível.
//
// `MU_PARENT` NÃO SE TOCA. Ela é a mesma grandeza noutra unidade (UA³/dia²,
// via k²) e alimenta o PROPAGADOR: trocar os sete valores de lá moveria
// satélites e mudaria as 54 vistas oficiais. Esta tabela nasce ao lado, para
// consumidor de TEXTO, e `fisicaDoCorpo.test.ts` cobra que as duas concordem
// a 1,5e-6 relativo — a checagem independente sem o risco de pixel.
//
// SÃO 38, E O QUE FALTA É NOMEADO. Os alvos do Atlas são 48 (10 do retrato +
// 30 luas + 5 anões + 3 asteroides; as nove esculpidas do 134/S3 são desenhadas
// sem GM — o emissor não as pede); MAKEMAKE não entra porque o kernel não o
// tem — sem satélite não há massa medida, e o doador imprimia "~3,1 × 10²¹ kg"
// com til. Campo ausente fica ausente: a ficha de Makemake simplesmente não
// escreve as linhas de massa, gravidade e escape.
//
// SISTEMA CONTRA CORPO, a armadilha dos ids da NAIF. Para gravidade de
// SUPERFÍCIE quem responde é o corpo, nunca o baricentro: Plutão é `BODY999`
// (869,6) e não `BODY9` (975,5, que carrega Caronte); Quaoar, Haumea e Éris
// entram pelo id do PRIMÁRIO (`920…`) e não pelo do sistema (`20…`), que soma
// as luas deles. O `GM_BODIES` do emissor guarda essa escolha por escrito.
// ============================================================

/**
 * Parâmetro gravitacional padrão (km³/s²) por id de corpo. Bloco emitido —
 * ver o cabeçalho.
 */
export const GM_CORPOS: Record<string, number> = {
  // `BODY<n>_GM` (km³/s²), gm_de440.tpc:
  sun: 132712440041.27942, // BODY10_GM
  mercury: 22031.868551400003, // BODY199_GM
  venus: 324858.592, // BODY299_GM
  moon: 4902.80011845755, // BODY301_GM
  earth: 398600.43550702266, // BODY399_GM
  phobos: 0.0007087546066894452, // BODY401_GM
  deimos: 0.00009615569648120313, // BODY402_GM
  mars: 42828.37362069909, // BODY499_GM
  io: 5959.915466180539, // BODY501_GM
  europa: 3202.712099607295, // BODY502_GM
  ganymede: 9887.832752719638, // BODY503_GM
  callisto: 7179.283402579837, // BODY504_GM
  jupiter: 126686531.9003704, // BODY599_GM
  mimas: 2.503488768152587, // BODY601_GM
  enceladus: 7.210366688598896, // BODY602_GM
  tethys: 41.21352885489587, // BODY603_GM
  dione: 73.11607172482067, // BODY604_GM
  rhea: 153.9417519146563, // BODY605_GM
  titan: 8978.137095521046, // BODY606_GM
  iapetus: 120.5151060137642, // BODY608_GM
  saturn: 37931206.23436167, // BODY699_GM
  ariel: 83.46344431770477, // BODY701_GM
  umbriel: 85.09338094489388, // BODY702_GM
  titania: 226.9437003741248, // BODY703_GM
  oberon: 205.3234302535623, // BODY704_GM
  miranda: 4.3195168992321, // BODY705_GM
  uranus: 5793951.256527211, // BODY799_GM
  triton: 1428.495462910464, // BODY801_GM
  neptune: 6835103.145462294, // BODY899_GM
  charon: 105.8799888601881, // BODY901_GM
  pluto: 869.6138177608748, // BODY999_GM
  ceres: 62.62888864440993, // BODY2000001_GM
  pallas: 13.665878145967422, // BODY2000002_GM
  vesta: 17.288232879171513, // BODY2000004_GM
  hygiea: 5.625147645385229, // BODY2000010_GM
  quaoar: 95.6021989005497, // BODY920050000_GM
  haumea: 264.413, // BODY920136108_GM
  eris: 1098.9, // BODY920136199_GM
};

/**
 * O corpo do Atlas que o kernel das massas NÃO cobre, dito por escrito para
 * que a ausência seja lida como ausência (e cobrada pelo teste de
 * completude), nunca como esquecimento.
 */
export const SEM_GM_NO_KERNEL: readonly string[] = ['makemake'];
