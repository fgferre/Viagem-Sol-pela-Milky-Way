// ============================================================
// A COR DA TEXTURA — a matiz das linhas de órbita (item 83 · B3).
//
// DECISÃO DELE, 29/08, diante da prancha `capturas/item83-b3-cores-v3.png`
// (quatro receitas × duas vistas): a linha de órbita sai com a cor
// DOMINANTE DE MAIOR SATURAÇÃO da textura do próprio globo — a receita
// que ele mesmo ditou em 27/08: *"não é a cor MÉDIA — a média lava tudo
// (oceano azul + nuvem branca + continente marrom dá cinza). Pixel quase
// neutro (nuvem, gelo, bruma) não vota; quem vota é o pixel colorido."*
//
// A RECEITA, exata e recomputável (rodada em 29/08 sobre
// `public/textures/atlas/<id>/map_1024.jpg`; Plutão pelo `map.jpg`, o
// único tamanho que existe):
//  1. RGB→HSV por pixel; VOTO com peso = saturação; s<0,08 ou v<0,05
//     não vota (neutro/escuro: nuvem, gelo, sombra);
//  2. histograma de matiz em 36 caixas de 10°; janela = pico ± 1 caixa;
//  3. a cor = média dos RGB votantes da janela, ponderada pelo peso;
//  4. hex no espaço do arquivo (sRGB); aqui os triplos JÁ CONVERTIDOS
//     para linear e NORMALIZADOS pelo canal máximo — a mesma convenção
//     de `matizDe`/fotometria, pronta para o material da fita.
//
// MERCÚRIO NÃO ESTÁ NA TABELA e isso é a própria receita decidindo: a
// textura dele é toda neutra (zero pixels votantes), então ele fica na
// fotometria — o fallback de `matizDe` em `world/orbitas.ts`. As LUAS
// herdam a cor do PAI, como sempre herdaram.
//
// O oráculo da entrega bateu nos cinco corpos de prova (Terra azul
// 215°, Marte ferrugem 15°, Saturno dourado 35°, Urano 185°, Netuno
// 235°). Quem recomputar com outra textura atualiza ESTA tabela e a
// procedência junto — número sem procedência não entra.
// ============================================================

/** triplos LINEARES normalizados pelo pico — prontos para o material */
export const COR_DA_TEXTURA: Record<string, readonly [number, number, number]> = {
  venus: [1.0, 0.651406, 0.270498], // #ffd38e · matiz 35° · 100% do peso no pico
  earth: [0.059511, 0.226966, 1.0], // #4583ff · matiz 215° · 85% do peso no pico
  mars: [1.0, 0.208637, 0.088656], // #ff7e54 · matiz 15° · 100% do peso no pico
  jupiter: [1.0, 0.745404, 0.520996], // #ffe0bf · matiz 35° · 91% do peso no pico
  saturn: [1.0, 0.806952, 0.502886], // #ffe8bc · matiz 35° · 95% do peso no pico
  uranus: [0.502886, 0.921582, 1.0], // #bcf6ff · matiz 185° · 100% do peso no pico
  neptune: [0.088656, 0.162029, 1.0], // #5470ff · matiz 235° · 79% do peso no pico
  pluto: [1.0, 0.57758, 0.332452], // #ffc89c · matiz 25° · 95% do peso no pico
};
