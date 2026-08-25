// ============================================================
// A FASE DA GRADE — o LASTRO da aritmética de fase do MB1.
//
//   node scripts/visual/fase-da-grade.mjs            # a tabela das duas alturas
//   node scripts/visual/fase-da-grade.mjs 720 900    # e de outras, se quiser
//
// POR QUE ELE EXISTE. O cabeçalho de `estabilidade-temporal.mjs` justifica a
// soleira de identidade com números medidos ("uma fonte de amplitude X some do
// censo em Y das fases"). Na primeira escrita (item 81, 25/08) esses números
// saíram de um ensaio de bancada que NÃO ficou no projeto — e uma auditoria
// que o reimplementou achou outros. Não achou por acaso: o ensaio original
// varria as fases em passos de 1/21 a partir de ZERO, o que INCLUI a fase
// centrada (que lê o pico inteiro) e NÃO INCLUI o canto exato (0,5; 0,5), que
// é justamente o pior caso que a soleira existe para cobrir. Duas afirmações
// caíram com isso: "lê pico entre 0,40 e 0,72" (0,72 era a MÉDIA das fases, e
// o máximo é a própria amplitude) e "nenhuma fonte de amplitude ≥ 0,55 some"
// (a 0,55 some SIM, no canto que a grade velha pulava).
//
// Número de comentário sem script é número que ninguém confere. Este arquivo é
// o script.
//
// O DOMÍNIO É A METADE SIMÉTRICA, E ISSO É COMPLETO. O que a fase faz com uma
// PSF depende só de |dx| e |dy| até meio pixel: fora de [0; 0,5]² tudo se
// repete por espelho. Varre-se então [0; 0,5]² numa grade de (N+1)², com o
// CANTO (0,5; 0,5) sempre presente — é ele o pior caso, e uma varredura que o
// perde reprova a própria pergunta. A "fração das fases" publicada é a fração
// da ÁREA desse domínio, e por isso não depende de N.
//
// QUEM MEDE É O JUIZ. As fontes saem de `fontesDoQuadro` — a mesma função que
// escreve o veredito —, nunca de uma releitura. É isso que faz a tabela ser
// prova do que o juiz faz, e não do que este arquivo acha.
// ============================================================
import { pathToFileURL } from 'node:url';
import {
  fontesDoQuadro, fatorDeFase, soleiraJulgada, LIMIAR_FONTE,
  ALTURA_DE_CALIBRACAO_PX, SIGMA_DA_PSF_PX, TOLERANCIA_SALTO_PX,
} from './estabilidade-temporal.mjs';

/** σ da PSF do app NUMA altura de quadro — a lei de `GLSL_STAR_PSF`. */
export const sigmaNaAltura = (alturaPx) =>
  (SIGMA_DA_PSF_PX * alturaPx) / ALTURA_DE_CALIBRACAO_PX;

const LADO = 41;

/** uma gaussiana de amplitude `amp` centrada em (cx, cy), num quadro limpo */
export function quadroDeUmaFonte(cx, cy, amp, sigma, lado = LADO) {
  const y = new Float32Array(lado * lado);
  for (let j = 0; j < lado; j++) {
    for (let i = 0; i < lado; i++) {
      const dx = i + 0.5 - cx;
      const dy = j + 0.5 - cy;
      y[j * lado + i] = amp * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
  }
  return y;
}

/**
 * O CENSO DE UMA AMPLITUDE: varre [0; 0,5]² de fase e devolve o que o juiz vê.
 *
 *  · `fracaoQueSome` — fração da ÁREA do domínio em que a fonte não existe
 *    para `fontesDoQuadro` (caiu toda abaixo de `LIMIAR_FONTE`);
 *  · `picoMin`/`picoMax` — a faixa do pico LIDO, entre as fases em que ela
 *    aparece. O máximo é a fase centrada, que lê a amplitude inteira;
 *  · `erroMax` — o pior erro de centroide contra o centro verdadeiro, que é o
 *    que a `TOLERANCIA_SALTO_PX` tem de cobrir.
 */
export function censoDaAmplitude(amp, sigma, n = 20) {
  const meio = LADO / 2;
  let some = 0;
  let fases = 0;
  let picoMin = Infinity;
  let picoMax = 0;
  let erroMax = 0;
  for (let a = 0; a <= n; a++) {
    for (let b = 0; b <= n; b++) {
      const cx = meio + (0.5 * a) / n;
      const cy = meio + (0.5 * b) / n;
      fases++;
      const fs = fontesDoQuadro(quadroDeUmaFonte(cx, cy, amp, sigma), LADO, LADO);
      if (!fs.length) { some++; continue; }
      picoMin = Math.min(picoMin, fs[0].pico);
      picoMax = Math.max(picoMax, fs[0].pico);
      erroMax = Math.max(erroMax, Math.hypot(fs[0].cx - cx, fs[0].cy - cy));
    }
  }
  return {
    amp,
    fracaoQueSome: some / fases,
    picoMin: some === fases ? NaN : picoMin,
    picoMax: some === fases ? NaN : picoMax,
    erroMax,
    fases,
  };
}

/**
 * A MENOR AMPLITUDE QUE NUNCA SOME, por bisseção. É o número que a soleira
 * derivada tem de reproduzir: `LIMIAR_FONTE / fatorDeFase(altura)`. Se os dois
 * divergirem, ou a soleira está errada ou a lei da PSF mudou.
 */
export function pisoDeSobrevivencia(sigma, n = 20) {
  let baixo = LIMIAR_FONTE;
  // o teto da busca é a própria previsão, com folga: se a bisseção precisar de
  // mais que isso, é a PREVISÃO que está errada — e é isso que se quer saber
  let alto = (2 * LIMIAR_FONTE) / Math.exp(-0.25 / (sigma * sigma));
  for (let i = 0; i < 40; i++) {
    const meio = (baixo + alto) / 2;
    if (censoDaAmplitude(meio, sigma, n).fracaoQueSome > 0) baixo = meio;
    else alto = meio;
  }
  return alto;
}

/* c8 ignore start */
function tabela(alturaPx) {
  const sigma = sigmaNaAltura(alturaPx);
  const soleira = soleiraJulgada(alturaPx);
  console.log(
    `\nquadro de ${alturaPx} px · σ = ${sigma.toFixed(3)} px · `
    + `fator no canto ${fatorDeFase(alturaPx).toFixed(4)} · `
    + `soleira derivada ${soleira.toFixed(4)}`
    + (soleira > 1 ? '  (ACIMA de 1,00: sem população num quadro de 8 bits)' : '')
  );
  console.log('  amp    some(fração das fases)   pico lido min..max    erro de centroide máx');
  const amps = [0.45, 0.5, 0.55, soleira, 0.7, 0.9, 1.0, 1.2, 1.5].sort((a, b) => a - b);
  for (const amp of amps) {
    const c = censoDaAmplitude(amp, sigma);
    const marca = Math.abs(amp - soleira) < 1e-9 ? '  ← a soleira' : '';
    console.log(
      '  ' + amp.toFixed(4).padEnd(8)
      + (c.fracaoQueSome * 100).toFixed(1).padStart(10) + '%'
      + (Number.isFinite(c.picoMin) ? `${c.picoMin.toFixed(3)}..${c.picoMax.toFixed(3)}` : 'nunca aparece').padStart(22)
      + c.erroMax.toFixed(3).padStart(18)
      + marca
    );
  }
  const piso = pisoDeSobrevivencia(sigma);
  console.log(
    `  piso de sobrevivência medido por bisseção: ${piso.toFixed(4)}`
    + `  ·  soleira derivada: ${soleira.toFixed(4)}`
    + `  ·  erro relativo ${(Math.abs(piso - soleira) / soleira * 100).toFixed(2)}%`
  );
  console.log(`  (a régua de salto é ${TOLERANCIA_SALTO_PX.toFixed(2)} px)`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const alturas = process.argv.slice(2).map(Number).filter(Number.isFinite);
  for (const h of alturas.length ? alturas : [ALTURA_DE_CALIBRACAO_PX, 613]) tabela(h);
  console.log('');
}
/* c8 ignore stop */
