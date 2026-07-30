# Alvos de fidelidade visual

Estas imagens são o **alvo**, não o teto. A regra do projeto não é
"não degradar" — é **evoluir em direção às referências**. Cuidado
excessivo também é um defeito: uma mudança ousada que aproxima a cena
do alvo vale mais do que dez mudanças tímidas que preservam o estado
atual. Regressão = afastar-se da referência; evolução = fechar o vão.
Quando a cena SUPERAR uma referência, a referência é atualizada (com
aprovação do mantenedor) — o conjunto é vivo.

## Como usar

1. Reproduza o momento com a URL determinística (GPU real, `?shot=1`).
2. Compare lado a lado com o alvo correspondente.
3. Julgue pelos critérios listados — não por diff de pixels: grão,
   jitter e evoluções aprovadas mudam pixels sem mudar a fidelidade.

## O conjunto (capturas aprovadas da direção de arte)

| Alvo | Momento | URL de reprodução | O que a referência estabelece |
|---|---|---|---|
| [alvo-01-sol](alvo-01-sol.png) | Sol, abertura | `?t=0&shot=1` | fotosfera texturizada sem estouro; faixa da Via Láctea atravessando com fenda escura; nebulosas frias ao fundo; labels discretos |
| [alvo-02-partida](alvo-02-partida.png) | deixando o sistema solar | `?t=25&shot=1` | Sol como estrela entre estrelas; profundidade do campo HYG; gás começando a envolver |
| [alvo-03-mergulho](alvo-03-mergulho.png) | nuvens moleculares | `?t=52&shot=1` | volumetria com corações densos ESCUROS e bordas iluminadas; paleta OIII×H-alfa; nada de névoa uniforme |
| [alvo-04-veus](alvo-04-veus.png) | véus da Via Láctea | `?t=74&shot=1` | filamentos estruturados em camadas com paralaxe; contraste alto sem clipping |
| [alvo-05-hero-hii](alvo-05-hero-hii.png) | região H II hero | `?t=80&shot=1` | cavidade ionizada H-alfa localizada, filamentosa — nunca véu magenta uniforme |
| [alvo-06-betelgeuse](alvo-06-betelgeuse.png) | Betelgeuse | `?t=85&shot=1` | supergigante dominando com halo quente; gás ao redor rico e tridimensional; pretos verdadeiros |
| [alvo-07-galaxia](alvo-07-galaxia.png) | revelação face-on | `?t=170&shot=1` | braços legíveis com interrupções (leitura Gaia 2025, não grand-design); bojo quente com barra; fendas de poeira orgânicas; Sol marcado |

Vistas ainda SEM referência aprovada (candidatas a ganhar alvo quando
uma captura for aprovada): disco de perfil (t=158), vista por baixo do
plano, R=3 kpc, disco externo, +800 pc acima do plano (`?pos=` na
memória do projeto e em RENDERER_CARTOGRAPHY.md).

## Referências do mundo real (fidelidade científica)

O céu simulado deve ler como estas fontes — são o alvo acima dos alvos:

- [ESO GigaGalaxy Zoom](https://www.eso.org/public/images/eso0932a/) —
  a faixa vista da Terra: assimetria, Great Rift, nuvens estelares de
  Scutum/Sagitário, acentos H II pequenos.
- [Gaia/ESA — Milky Way 2025](https://www.cosmos.esa.int/web/gaia/milky-way)
  — a face-on de referência: braços com interrupções, barra, contraste.
- Checklist de direção de arte por região do disco: seção "Ambiente
  volumétrico relocável" em `../RENDERER_CARTOGRAPHY.md` (dossiê
  pesquisado com fontes).
