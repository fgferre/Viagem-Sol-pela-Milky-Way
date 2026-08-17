// ============================================================
// AS MEDIDAS DE ANCORAGEM DA GALÁXIA — onde o Sol está e onde o disco
// termina, em pc. Folha SEM dependências: é a parte do contrato
// cartográfico que a cena precisa para se ancorar (baseGalactica monta
// GAL/EX/EY/EZ com estes três números), separada para quem precisa do
// referencial não importar o modelo inteiro de 932 linhas (onda da
// arquitetura, corte 10 — o mesmo desperdício que o corte 5 matou no
// journey tinha voltado pela porta dos fundos). O DONO dos números
// continua sendo o modelo: `GALACTIC_MODEL` (galacticModel.ts) os
// incorpora por spread e segue sendo o endereço de quem consome o
// contrato completo.
//
// Fontes: as do cabeçalho de galacticModel.ts (R☉ = 8,15 kpc é o ajuste
// de masers de Reid et al. 2019; a altura do Sol e o raio do disco
// procedural acompanham o mesmo contrato).
// ============================================================
export const MEDIDAS_DA_GALAXIA = {
  /** distância Sol → centro galáctico (pc) */
  sunRadiusPc: 8_150,
  /** altura do Sol sobre o plano do disco (pc) */
  sunHeightPc: 5.5,
  /** raio do disco estelar procedural (pc) */
  diskRadiusPc: 16_800,
} as const;
