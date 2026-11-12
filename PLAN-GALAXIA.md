# A galáxia de fora feita só de partículas — 12/11/2026

Conceito do dono (12/11): universo navegável; a galáxia é 100 % partículas (estrelas, gás, poeira), viva; nada de camada pintada, sprite ou skybox. Medido nesse dia: de longe a imagem vinha das sete lâminas pintadas e as partículas quase não apareciam.

Onde: ramo `galaxia-particulas`, cópia `../Viagem-galaxia`. Tudo atrás de `?galaxia=particulas`; sem o interruptor a imagem é idêntica byte a byte (regra dura, conferida por md5 a cada ensaio). Provas em `capturas/galaxia-nova/` da pasta principal. Vistas: de-cima, inclinada, media, saindo, raspao, filme t=148, perto (links nos commits e na memória).

## Feito
- [x] Ensaio 1 (2f689adb): lâminas apagadas, a luz delas vai às partículas (ganho medido em linear).
- [x] Ensaio 2 (f4c48985): lei de fluxo única em qualquer distância; núcleo de densidade (largo demais: o dono viu "foto sem resolução").
- [x] Ensaio 3 (9e77ea1b): o sorteio carrega o modelo — barra+bojo 11 % da luz, braços largos por peso de par, H II na largura de Reid, disco de fora suave, disco espesso, brilho do bojo colado desligado.
- [x] Ensaio 4: desenho por tipo (fundo de 2 px que deposita luz constante, jovens e H II nítidos), luz em qualquer inclinação. Resultado: nítido, mas areia a meia distância — 1–2 partículas por pixel; faltam ~4× (ruído = estrutura) a ~10× partículas.

- [x] Ensaio 5: células de 1 kpc com nível de detalhe (prefixo com brilho compensado longe, filhas perto), um só desenho por quadro. De longe ficou MAIS LEVE que a galáxia de hoje (de-cima 36 contra 65 ms); `saindo` deixou de ser areia; `media` continua granulada e a meia distância custa ~100 ms (≈4,4 ms por milhão de pontos: o limite é o número de pontos no WebGL, não a conta de poeira). Sem saltos nas 6 fotos do voo; cintilação em movimento não testada (precisa de vídeo). Botões: `?lodrho= ?lodk= ?lodesp= ?lodmd=0`.

## A fazer, em ordem
1. Teto de pontos por quadro no modo novo, para nunca pesar mais que a galáxia de hoje (a meia distância fica granulada até o item 6).
2. Poeira como nuvens de partículas (hoje: de cima tira 7 % e some; de lado tira 82 % e apaga a metade de lá).
3. Cor dos braços (ficaram quentes depois do ensaio 3: conferir a fração jovem de fora 0,55 → 0,25) e H II visíveis de cima.
4. Conferir contra a literatura duas escolhas do ensaio 3: o vão do disco dentro da barra (Freudenreich 1998) e a fração nos braços (0,35).
5. Filme t=148: os pontos próximos cintilam com o ganho de lado.
6. WebGPU só para a galáxia, como modo opcional: protótipo que deposita os pontos por compute (o ensaio 5 mediu que a meia distância pede ~20 M de pontos, fora do alcance do WebGL nesta máquina). As células e as regras por tipo já servem. Antes: medir em máquina quieta e gravar vídeo do voo.
7. Quando a nova provar que é melhor em todas as vistas: virar padrão, apagar lâminas e interruptor (decisão do dono por imagem; publicar só com a palavra dele).

## Fora de escopo
Tom, bloom, halo e anã de Sagitário (ainda são cartazes: entram depois do item 2), constantes do modelo galáctico, `public/data`.
