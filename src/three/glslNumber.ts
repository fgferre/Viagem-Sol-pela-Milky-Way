// ============================================================
// O NÚMERO EM GLSL — uma linha, e ela é a peça que impede a constante
// de existir duas vezes.
// ============================================================
//
// Morava em `cartography/galacticModel.ts` porque nasceu para as âncoras da
// galáxia; mudou-se para cá quando a LEI DE TELA precisou dele. `estrela.ts`
// é PURO por contrato (importa só `luzDaCasa.ts`, para a lei ser auditável em
// `node`) e não podia arrastar o modelo galáctico inteiro atrás de um
// formatador de texto — §11, quem só precisa do referencial não importa o
// mundo junto. Um arquivo, um assunto.
//
// POR QUE UM FORMATADOR MERECE UMA PEÇA. Os shaders que NÃO incluem
// `GLSL_CARTOGRAPHY` (o `GLOW_FRAG` da galáxia, as cascas de `wrappedStars`)
// redigitavam o começo do warp, o raio do disco e a amplitude à mão — e com
// `?warpamp=` o lado gerado e o lado cravado divergiam. Interpolando daqui,
// `toFixed(7)` garante o MESMO float: `glslNumber(8150)` imprime sete casas
// de zero, que é o mesmo valor que o literal de uma casa que estava lá. A
// varredura de `simbolosProibidos.test.ts` cobra que nenhum deles volte
// cravado.
//
// AS SETE CASAS NÃO SÃO ENFEITE: `toFixed` escolhido a olho por chamada é a
// própria divergência que a peça existe para matar. `toFixed(2)` sobre um
// piso que amanhã seja 0,705 imprime 0,70 no shader e mantém 0,705 no TS —
// duas faces da mesma lei, discordando numa casa que ninguém lê. Sete casas
// cobrem todo número desta casa; a decisão é uma, e é aqui.
export function glslNumber(value: number) {
  return value.toFixed(7);
}
