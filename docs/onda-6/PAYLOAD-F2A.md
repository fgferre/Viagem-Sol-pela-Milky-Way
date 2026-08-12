# NOTAS F2a — payload MEDIDO do pipeline de texturas (Terra + Lua)

Medição: `public/data/atlas/texturas.json` (sha256 + dimensões pelo sharp),
2026-08-12, rodada offline a partir do doador local. 42 variantes, 6 fontes.

## Tabela por corpo/canal/variante (bytes em disco)

| Corpo | Canal | Variante | Dimensões | jpg (bytes) | webp (bytes) |
|---|---|---|---|---:|---:|
| earth | map | fonte | 8192×4096 | 4.565.076 | 1.961.688 |
| earth | map | 4096 | 4096×2048 | 1.034.756 | 592.564 |
| earth | map | 2048 | 2048×1024 | 313.049 | 172.700 |
| earth | map | 1024 | 1024×512 | 98.408 | 55.200 |
| earth | clouds | fonte | 8192×4096 | 11.619.184 | 9.046.432 |
| earth | clouds | 4096 | 4096×2048 | 2.179.294 | — (guarda: maior) |
| earth | clouds | 2048 | 2048×1024 | 547.835 | — (guarda) |
| earth | clouds | 1024 | 1024×512 | 145.393 | — (guarda) |
| earth | night | fonte | 8192×4096 | 3.144.468 | 1.052.436 |
| earth | night | 4096 | 4096×2048 | 603.286 | 330.196 |
| earth | night | 2048 | 2048×1024 | 147.775 | 86.756 |
| earth | night | 1024 | 1024×512 | 36.643 | 22.458 |
| earth | normal | fonte | 8192×4096 | 2.565.658 | 983.802 |
| earth | normal | 4096 | 4096×2048 | 323.491 | 142.670 |
| earth | normal | 2048 | 2048×1024 | 48.941 | 16.130 |
| earth | normal | 1024 | 1024×512 | 8.739 | 2.326 |
| earth | roughness | fonte | 8192×4096 | 864.372 | 652.226 |
| earth | roughness | 4096 | 4096×2048 | 398.530 | 263.318 |
| earth | roughness | 2048 | 2048×1024 | 153.646 | 103.186 |
| earth | roughness | 1024 | 1024×512 | 56.673 | 40.912 |
| moon | map | fonte | 8192×4096 | 15.030.356 | 12.142.920 |
| moon | map | 4096 | 4096×2048 | 2.585.000 | — (guarda) |
| moon | map | 2048 | 2048×1024 | 608.123 | — (guarda) |
| moon | map | 1024 | 1024×512 | 144.500 | — (guarda) |

A guarda de pessimização (item 17) matou 6 webp: os jpg mozjpeg q88 da escada
de clouds e moon já saem menores que o webp q88 equivalente — comportamento
correto, não defeito.

## Totais desta rodada

- **Em disco (repo/deploy): 74.891.116 bytes = 71,42 MB** (42 variantes).
  Terra 46 MB (5 canais), Lua 30 MB (1 canal).
- **O que o visitante baixa por tier** (a MELHOR variante por canal, webp
  quando menor — 6 canais: 5 da Terra + 1 da Lua):
  - performance (≤1k): **0,39 MB**
  - alta (≤2k): **1,46 MB**
  - cinema (≤4k): **5,81 MB**
  - fonte 8k (bancada/orçamento do dono): **24,64 MB**

## Projeção para o sistema completo (estimativa sobre estas medições)

Base: o doador tem ~9 outras fontes 8k reais (Mercúrio, Vênus superfície,
Marte, Júpiter 7200px, Saturno + anel, Plutão, Tétis, Jápeto, Encélado) e
~25 corpos com fonte 2k; mosaicos Titan/Europa ≈ 3,6 MB (condicionais à
bancada); anel de Saturno é placa pequena (86 KB no doador).

- **Cinema (download, ≤4k):** Terra+Lua medem 5,81 MB. Corpo 8k de canal
  único mede 1,5–2,6 MB no degrau 4096 (Lua: 2,47 MB); corpo 2k fica no
  próprio 2k (0,1–0,6 MB). Projeção: 5,8 + 9×~2 + 25×~0,3 + extras
  ≈ **30–38 MB** — dentro da mira de ~25–35 MB do desenho (D4), no teto.
- **Alta (≤2k):** ≈ **8–12 MB** (consistente com o conjunto 2k de 12 MB
  medido no doador, com ganho do webp onde ele compensa).
- **Performance (≤1k):** ≈ **2–4 MB** o sistema inteiro.
- **Em disco (repo):** esta rodada custou 71 MB porque Terra carrega 5
  canais 8k e a Lua é o jpg menos compressível do lote. Projeção com as
  fontes 8k restantes (~10–30 MB cada em disco com escada+webp) + as 2k:
  ≈ **200–250 MB** na árvore public/textures/atlas/ ao fim da onda. Se o
  dono quiser cortar, o candidato é não versionar as fontes 8k dos corpos
  não-herói (a escada 4k/2k/1k se regenera do doador/rede pelo script).

Números finais do sistema completo são MEDIDOS a cada fase (o manifest soma
sozinho); esta projeção existe só para o planejamento de orçamento.
