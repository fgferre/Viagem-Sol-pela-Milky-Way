# A galáxia de fora feita só de partículas — 12/11/2026

Conceito do dono (12/11): universo navegável; a galáxia é 100 % partículas (estrelas, gás, poeira), viva; nada de camada pintada, sprite ou skybox. Medido nesse dia: de longe a imagem vinha das sete lâminas pintadas e as partículas quase não apareciam.

Onde: ramo `galaxia-particulas`, cópia `../Viagem-galaxia`. Tudo atrás de `?galaxia=particulas`; sem o interruptor a imagem é idêntica byte a byte (regra dura, conferida por md5 a cada ensaio). Provas em `capturas/galaxia-nova/` da pasta principal. Vistas: de-cima, inclinada, media, saindo, raspao, filme t=148, perto (links nos commits e na memória).

## Feito
- [x] Ensaio 1 (2f689adb): lâminas apagadas, a luz delas vai às partículas (ganho medido em linear).
- [x] Ensaio 2 (f4c48985): lei de fluxo única em qualquer distância; núcleo de densidade (largo demais: o dono viu "foto sem resolução").
- [x] Ensaio 3 (9e77ea1b): o sorteio carrega o modelo — barra+bojo 11 % da luz, braços largos por peso de par, H II na largura de Reid, disco de fora suave, disco espesso, brilho do bojo colado desligado.
- [x] Ensaio 4: desenho por tipo (fundo de 2 px que deposita luz constante, jovens e H II nítidos), luz em qualquer inclinação. Resultado: nítido, mas areia a meia distância — 1–2 partículas por pixel; faltam ~4× (ruído = estrutura) a ~10× partículas.

## A fazer, em ordem
1. Células com nível de detalhe: o disco em células no plano; longe desenha um prefixo da célula com o brilho compensado (mais leve), perto desdobra cada partícula em filhas (mais densa). Resolve areia e peso juntos e serve depois ao WebGPU.
2. Poeira como nuvens de partículas (hoje: de cima tira 7 % e some; de lado tira 82 % e apaga a metade de lá).
3. Cor dos braços (ficaram quentes depois do ensaio 3: conferir a fração jovem de fora 0,55 → 0,25) e H II visíveis de cima.
4. Conferir contra a literatura duas escolhas do ensaio 3: o vão do disco dentro da barra (Freudenreich 1998) e a fração nos braços (0,35).
5. Filme t=148: os pontos próximos cintilam com o ganho de lado.
6. Peso: medir em máquina quieta; avaliar WebGPU só para a galáxia, como modo opcional.
7. Quando a nova provar que é melhor em todas as vistas: virar padrão, apagar lâminas e interruptor (decisão do dono por imagem; publicar só com a palavra dele).

## Fora de escopo
Tom, bloom, halo e anã de Sagitário (ainda são cartazes: entram depois do item 2), constantes do modelo galáctico, `public/data`.
