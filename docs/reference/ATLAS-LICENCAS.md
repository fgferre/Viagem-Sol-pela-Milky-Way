# Licenças e atribuições dos assets do atlas — anotação da Onda 0 (2026-08-10)

> O dono confirmou que **todas as imagens são livres** — isto é ANOTAÇÃO, não
> bloqueio. Fonte: `src/data/assetManifest.ts` do doador, **26 entradas**, lidas
> uma a uma. **O número do plano CONFERE por grep:** `license: "not documented
> in repo"` aparece exatamente **11 vezes**. No sentido amplo (campo `license`
> que não nomeia uma licença real) são **14**. Todas as 26 entradas marcam
> `attributionRequired: true`.

## As 11 sem licença documentada

| Asset | Fonte declarada | Nota |
|---|---|---|
| `titan-map-active` | repo-local, `sourceUrl: null` | **ATIVO em produção** sem licença registrada — prioridade |
| `europa-map-active` | repo-local, `sourceUrl: null` | **ATIVO em produção** — prioridade |
| `uranus-map-active` | repo-local, `sourceUrl: null` | nome de arquivo "floridaemojicat" sugere fan-art — proveniência mais arriscada do lote |
| `titan-map-fallback` | repo-local, `sourceUrl: null` | nome "mapperpro", mesmo padrão fan-art |
| `jupiter-map-active` | repo-local, `sourceUrl: null` | rótulo "Voyager-inspired, exact provenance unresolved" |
| `europa-map-fallback` | repo-local, `sourceUrl: null` | rótulo "Gemini-labelled" ambíguo (observatório × IA) — esclarecer |
| `ceres-map-active` | repo-local, `sourceUrl: null` | placeholder 1264×632; upgrade USGS documentado |
| `dione-map-active` | repo-local, `sourceUrl: null` | — |
| `rhea-map-active` | repo-local, `sourceUrl: null` | — |
| `pallas-model-fallback` | Obs. de la Côte d'Azur (URL existe) | fonte OK, licença nunca nomeada |
| `hygiea-model-fallback` | Obs. de la Côte d'Azur (URL existe) | idem |

## As 3 com anotação imprecisa (que completam as 14 do sentido amplo)

- `vesta-map-fallback` — o campo `license` contém uma nota de verificação
  ("verificar antes de reusar"), não um nome de licença.
- `titan-mosaic-reference` e `europa-mosaic-reference` (mosaicos USGS,
  candidatos da bancada da Onda 6) — `license` é paráfrase de "cite os
  autores"; **o texto de crédito formal precisa ser redigido ANTES de qualquer
  um deles ser promovido a `active`**.

## Atribuições que a casa DEVE preservar

- **CC BY 4.0 — DAMIT** (modelos Pallas 101 e Hygiea 4392): crédito ao projeto
  DAMIT/autores em qualquer reuso.
- **CC BY 4.0 — ESO VLT / Wikimedia Commons** (mapa de Hygiea).
- **CC BY 4.0 — Solar System Scope** (haumea-fallback, makemake, eris,
  uranus-candidate — e as texturas PBR da Terra do `bake:earth-pbr`, ver
  [`ATLAS-CHECKLIST-PRE-FUSAO.md`](ATLAS-CHECKLIST-PRE-FUSAO.md) item 14).
- **USGS Astrogeology** (mosaicos Titan/Europa): exige citação dos autores;
  texto ainda não redigido.
- **NASA images and media guidelines** (Vesta, Haumea, Io, Phobos, Deimos):
  domínio público doméstico, sem exigência legal — mas o manifest marca
  `attributionRequired: true` por postura conservadora; **preservar assim**.
- **CC BY-SA — catálogo HYG**: NÃO está no manifest (é catálogo, não textura).
  A cláusula share-alike é a mais forte do lote e vale para a CASA JÁ HOJE (o
  campo HYG está em produção na Viagem) — rastrear como item próprio quando a
  Onda 1 tocar o sidecar de nomes.
