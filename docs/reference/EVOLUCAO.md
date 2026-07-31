# Evolução por rodada

Uma linha por rodada de implementação, medida contra as fotos reais em
`gaia-2025-face-on-5k.jpg` pela métrica de `measure-similarity.html`.
Gerado por `node scripts/visual/rodada.mjs <n> "nota"`.

As capturas ficam em `capturas/` e **não** são versionadas (AGENTS.md regra 5):
o que responde "aproximou ou afastou" é o número, não o PNG. Para a revisão
final, as imagens locais e esta tabela se leem juntas.

`harmonicError` menor é melhor; as outras três buscam o alvo.

| rodada | harmonicError | discMean | grain | purp | o que mudou |
|---|---|---|---|---|---|
| — | 0 | 0.1175 | 0.0679 | 0.2010 | **alvo (foto real)** |
| 01 | 0.1233 | 0.1078 | 0.1336 | 0.0840 | baseline: espalhamento religado, fotometria logLum+PSF, fades somados |
| 02 | 0.1186 | 0.1522 | 0.1083 | 0.1076 | soma de populacoes: corpo negro por temperatura no lugar dos tripletos pintados |
| 03 | 0.1056 | 0.1167 | 0.1386 | 0.1195 | recalibrar nivel: paleta nao carrega mais brilho (POP_LUMA_FIX) |
