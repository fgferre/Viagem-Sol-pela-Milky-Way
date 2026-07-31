# Roadmap de dados complementares

Resultado da pesquisa (2026-07-30) de datasets que **complementam** os 7
ativos originais sem sobreposição. Todos abertos (CDS: citação; Zenodo
Edenhofer: CC BY 4.0). Ordem recomendada por esforço → impacto:

**Implementado em 2026-07-30:** item 6 como seleção proxy reproduzível de
100.000 estrelas. O manifesto e `GALACTIC_DATA_FOUNDATION.md` registram por que
ela não é a amostra Drimmel completa.

| # | Dataset | Fonte | Runtime | Esforço | Valor |
|---|---|---|---|---|---|
| 1 | **165 aglomerados globulares** (Baumgardt & Vasiliev) | [site UQ](https://people.smp.uq.edu.au/HolgerBaumgardt/globular/) / VizieR `J/MNRAS/505/5978` | ~7 KB | ~1 h | halo inteiro ganha vida |
| 2 | **LMC/SMC/M31/M33 + ~60 anãs** (Pietrzyński 2019, Graczyk 2020, McConnachie `J/AJ/144/4`) | constantes + VizieR | ~5 KB | ~2 h | profundidade cosmológica no zoom-out |
| 3 | **7.167 aglomerados abertos** (Hunt & Reffert `J/A+A/686/A42`, tabela `clusters`) | VizieR TAP | ~300 KB | ~3 h | disco denso e datado (cor por idade); dedupe com os 988 jovens |
| 4 | **215 SNRs com distância** (Green `VII/297` × Ranasinghe & Leahy `J/ApJ/940/63`, join por nome; reescalar R₀ 8,34→8,15) | VizieR | ~10 KB | ~4 h | marcos narrativos (Cas A, Crab, Vela) |
| 5 | **~1.000 nebulosas planetárias** (Chornay & Walton `J/A+A/656/A110`, `reliability > 0.8`) | VizieR | ~40 KB | ~2 h | tempero do disco |
| 6 | **100k estrelas quentes Gaia DR3 — implementado** — query TAP no ESA Archive: JOIN `external.gaiaedr3_distance` (Bailer-Jones), proxies `ruwe<1.4 AND parallax_over_error>5 AND visibility_periods_used>=10`, subamostra uniforme por `random_index`. Documentado como seleção proxy, NÃO como amostra do paper | ESA TAP | 4,0 MB | concluído | estrutura 3D real na vizinhança até ~4–5 kpc; não determina o lado oculto |
| 7 | **Poeira local Edenhofer 2024** — `mean_and_std_healpix.fits` (3,3 GB, o menor all-sky; nside=256, 516 bins 69–1250 pc; scripts `interp2box.py` inclusos no record) → reamostrar offline para volume esparso de ~15–50 MB | [Zenodo 10658339](https://zenodo.org/records/10658339) | 15–50 MB | 2–3 dias | vizinhança solar fotorrealista — o grande salto |

Extras avaliados: Zucker 2020 (`J/A+A/633/A51`, ~326 nuvens locais nomeadas
com distância ~5% — rótulos/validação da Edenhofer); pulsares ATNF
(descartados como camada observada: distâncias por DM modelo-dependentes).

Itens 1–5 somam < 400 KB de runtime. Cada novo ativo deve entrar no
`manifest.json` com schema, contagem, SHA-256, método de distância e
proveniência, seguindo `GALACTIC_DATA_FOUNDATION.md`.
