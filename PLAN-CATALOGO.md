Revisão das distâncias do catálogo estelar (aglomerados) — 13/11/2026, ramo `revisao-catalogo`.

## O que foi achado

- De onde vem a distância: `build-star-catalog.mjs` lê o AT-HYG v4.0 (subset V ≤ 10) e usa a coluna `dist` dele como está (1/paralaxe, sem correção de ponto zero). Contagem por fonte da distância no arquivo em cache: Gaia DR3 326.755, Hipparcos 1.610, Gaia DR2 1.318, Gliese 171, "N" 2.317, outros 7. O HYG v4.4 entra só com fotometria e ids. Saem `public/data/stars.bin` (9 B por estrela, ~329 mil) e `stars_meta.json` (as 1.726 nomeadas com x, y, z, d); o app lê os dois (`src/three/config.ts`, `wrappedStars.ts`).
- O defeito não é "paralaxe antiga": 8 das 9 Plêiades nomeadas JÁ usam Gaia DR3. A paralaxe do Gaia é que erra nas brilhantes (saturação, RUWE 2–4): Taygeta 9,54 ± 0,40 mas → 105 pc, com o aglomerado a 134,8 pc. Trocar para Gaia DR3 (opção i) não muda nada para elas.
- Medido no cache da fonte (o mesmo dado do `stars.bin`) contra Hunt & Reffert 2023 (HR23):

| aglomerado | membros no catálogo | distância hoje (mín/mediana/máx, pc) | publicado (pc) | raio r50 / maré (pc) |
|---|---|---|---|---|
| Plêiades, 9 nomeadas | 9 | 104,8 / 130,4 / 141,5 | 134,8 | 2,7 / 11,1 |
| Plêiades, todos | 93 | 104,8 / 135,8 / 147,3 | 134,8 | 2,7 / 11,1 |
| Híades | 100 | 41,9 / 46,6 / 57,3 | 47,2 | 3,5 / 8,6 |
| Presépio (M44) | 73 | 164,5 / 184,5 / 266,0 | 183,5 | 3,2 / 10,5 |
| M7 | 82 | 262,9 / 279,0 / 881,9 | 276,0 | 3,3 / 11,9 |
| α Persei | 71 | 155,3 / 174,1 / 283,2 | 173,6 | 4,2 / 16,8 |
| h Persei | 8 | 2.300 / 2.468 / 2.551 | 2.280 | 3,0 / 7,9 |
| χ Persei | 9 | 2.362 / 2.421 / 2.581 | 2.293 | 2,3 / 6,0 |
| Trapézio (θ¹ A–D, θ² A) | 5 | 336 / 378 / 438 | 414 (Menten 2007; Kuhn 2019: 403) | ~0,1 |

- Na tela: as nove Plêiades têm 37 pc de fundo para ~2,5 pc de largura (×15); o Trapézio, 62 pc de fundo para 0,05 pc. As Híades já estão certas (fundo ≈ largura). O Duplo de Perseu está ~190 pc longe demais (ponto zero do Gaia) e com 250 pc de fundo.
- Três Marias: estão no catálogo, com nome, mas são outra coisa — o Cinturão, 4° ao norte do Trapézio. Distâncias do Hipparcos: Mintaka 212, Alnitak 226, Alnilam 606 pc; os grupos do Gaia em volta delas (HR23, Collinder 70) ficam a 356–417 pc. Não entram nesta correção (associação, não aglomerado; não há lista de membros que as inclua) — fica como próxima pergunta.
- Estrelas S de Sgr A✱: só se veem no infravermelho, atrás de ~30 magnitudes de poeira no visível; um catálogo visual até V 10 não pode tê-las. Outro trabalho as põe a partir das órbitas.

## A decisão

Opção (ii)+(iii): estrela que é membro de aglomerado publicado recebe a distância do aglomerado na medida em que a própria paralaxe é ruim. Média a posteriori: peso k = σ²/(σ² + (erro·RUWE)²), σ = r50/1,1774 (fundo igual à largura). Sem paralaxe Gaia DR3 → distância do aglomerado. Paralaxe boa fora do raio de maré → não é membro, não muda. Membros: HR23 (Prob ≥ 0,5) + Robichon et al. 1999 (Hipparcos, traz as brilhantes que o Gaia perde) + o Trapézio por posição. Regra em `scripts/data/lib/aglomerados.mjs`, tabela e citações em `scripts/data/aglomerados.json` (30 KB, nada a baixar).

Não muda: o número de estrelas, a direção de nenhuma, estrela de campo, Sirius/Vega/α Cen, os volumes de poeira. Muda a distância de 441 membros (117 em mais de 1 %); a luminosidade é recalculada da distância nova, então o brilho visto da Terra fica igual.

## Passos

1. [feito] regra + testes (`aglomerados.test.mjs`), build, ficha diz "distância do aglomerado (Plêiades), não a da estrela" com selo derivado (pt/en); `data:verify` passa a barrar Taygeta fora de 134,8 ± 2 pc.
2. [dono] rodar O COMANDO abaixo.
3. [assistente, depois do comando] `npm run done`: o teste "o centro de cada aglomerado é a média das membros" vai pedir o novo `alvo` das Plêiades (≈ [67,68, 102,78, 55,37] pc) e talvez das Híades em `src/lib/lugaresDoFilme.ts`; reescrever o `naCena` das Plêiades (hoje diz "medidas antigas… de 342 a 462 anos-luz", errado nas duas partes) e decidir com foto se o lugar pode chegar mais perto (`raioPc` 7). Tirar a linha das Plêiades do BACKLOG.
4. [dono] olhar e decidir publicar.

Fora do escopo: Cinturão de Órion, rótulos (as três θ¹ Ori dividem um nome e só uma ganha etiqueta), a ficha diz "paralaxe Gaia DR3" também para as 1.610 de distância Hipparcos (Sirius, Vega, Alcyone…) — achado para o BACKLOG.

## O que olhar depois

- Plêiades de perto: as nove num grupo redondo, sem Taygeta 30 pc na frente. Ficha de Taygeta: "distância do aglomerado (Plêiades)".
- Trapézio dentro da Nebulosa de Órion: as quatro estrelas juntas, no meio da nebulosa (antes, espalhadas de 336 a 438 pc).
- Híades: igual a hoje.
- Desfazer: `git checkout main -- public/data/stars.bin public/data/stars.bin.gz public/data/stars_meta.json`

## O COMANDO

`npm run data:stars && npm run data:verify && npm run data:pack`
