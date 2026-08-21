// ============================================================
// A DOSE DA DRAMATURGIA — a assistência DECLARADA do arranque do filme.
//
// O QUE MORREU AQUI, e por quê. Até 21/08 o filme conseguia o "Sol limpo
// no arranque" TORCENDO A FASE DO CICLO: o director empurrava o relógio
// do ciclo de 0,02 (mínimo profundo) até 0,50 (máximo) ao longo da
// hélice, e dentro do Atlas pinava a torção no fim da janela
// (`ATLAS_JOURNEY_T`). Duas mentiras num gesto só: o Sol do Atlas ficava
// congelado no máximo — o mesmo em 2019 e em 2035 — e a fase virava um
// segundo universo, com o filme vivendo num ciclo solar que a data não
// autoriza.
//
// O QUE ENTROU NO LUGAR: a fase é da DATA e só dela (`faseDoCiclo`, a lei
// da estrela). O filme não ganha um relógio próprio; ganha uma DOSE de
// OCUPAÇÃO — quanta atividade daquela fase aparece. É atenuação de
// QUANTO, nunca invenção de QUANDO: a dose não toca fase, banda de
// Spörer, sinal de Hale nem reversão polar. Um Sol de 2026 continua sendo
// um Sol de 2026 (ativo, porque o Sol de 2026 É ativo); o arranque só
// mostra menos dele.
//
// E por ser assistência, ela se DECLARA: linha própria no `selo.ts`
// (eixo BRILHO, `volta: 'nenhuma'` — não é gesto do visitante, é a
// dramaturgia) e menção na entrada `corpo-do-sol` do
// `cadastroDeRepresentacoes.ts`. É isso que a torna dose, e não o
// segundo universo com outro nome.
//
// FORA DA VIAGEM A DOSE É EXATAMENTE 1 — e "exatamente" é literal: o
// núcleo a aplica como multiplicador, e multiplicar por 1,0 é bit-exato.
// Por isso o Atlas não tem dose, e por isso o pino morreu.
// ============================================================

/**
 * Quanto da atividade da data o arranque mostra. 0,13 é a herança
 * DECLARADA do que a torção de fase produzia, medida e não escolhida: a
 * torção punha o ciclo na fase 0,02 (mínimo profundo), onde o envelope
 * do núcleo — `0,10 + 1,06·sen(π·fase)^1,15`, `world/sol/activity.js` —
 * vale 0,143; na fase da data do filme (2026-01, fase ≈ 0,60) o mesmo
 * envelope vale 1,100. A razão é 0,13, e é ela que devolve ao arranque a
 * MESMA ocupação de antes sem mentir sobre o calendário. O que muda de
 * propósito é ONDE as manchas nascem: a banda de Spörer agora é a da
 * fase real (17° em 2026), não a de um mínimo que não existe.
 *
 * Número de dramaturgia: é do dono calibrar com foto quando quiser, como
 * a dose 0,07 do Atlas.
 */
export const DOSE_NO_ARRANQUE = 0.13;

/** Fim da parede de fogo — a dose começa a subir aqui (s de viagem). */
export const DRAMA_T0 = 5;

/** Fim da hélice — daqui em diante o Sol é o da data, inteiro. */
export const DRAMA_T1 = 29;

/**
 * A DOSE NO INSTANTE DA VIAGEM. Monotônica, suave nas duas pontas
 * (smoothstep), e vale 1 em todo o resto do filme — depois de `DRAMA_T1`
 * não há assistência nenhuma a declarar.
 *
 * `undefined` (o Atlas, o voo livre, qualquer coisa que não seja o filme)
 * devolve 1: quem não está na dramaturgia não tem dose.
 */
export function doseDaDramaturgia(tDeViagem: number | undefined): number {
  if (tDeViagem === undefined || !Number.isFinite(tDeViagem)) return 1;
  const k = Math.min(1, Math.max(0, (tDeViagem - DRAMA_T0) / (DRAMA_T1 - DRAMA_T0)));
  // o 1 tem de ser EXATO no fim da janela, e não "1 menos um ULP": o
  // núcleo multiplica a ocupação por ele, e é essa exatidão que faz
  // "sem dose" e "dose plena" desenharem bit a bit o mesmo Sol
  if (k >= 1) return 1;
  const suave = k * k * (3 - 2 * k);
  return DOSE_NO_ARRANQUE + (1 - DOSE_NO_ARRANQUE) * suave;
}
