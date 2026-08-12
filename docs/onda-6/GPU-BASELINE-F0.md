# NOTAS F0 — gpu-profile BASELINE (Onda 6)

Baseline do teto de ≤2 ms/fase (regra de gate T-E8/P-E7 do desenho da onda).
Vista: casa do Atlas (`?atlas=1&q=cinema` — a vista de abertura, enquadramento
`focarNoSistema`). Estado: fim da F0 (palco vazio, zero pixel movido — 18/18
bit-idênticas). Medido em 2026-08-12 nesta máquina (macOS, ANGLE metal,
headless=new), buffer 1920×993, dPR 1.

Invocações:

    node scripts/visual/gpu-profile.mjs "?atlas=1&q=cinema" 15 1920 1080 1
    node scripts/visual/gpu-profile.mjs "?atlas=1&q=cinema" 15 1920 1080 1 cru

## Controle (cru, sem instrumento)

    334 quadros em 15 s = 22,3 fps · rAF p50 50,0 · p90 50,5 · p99 51,0 ms

O headless=new nesta máquina tica a 20 Hz (50 ms cravados) — é a MESMA
baseline sadia que o cabeçalho de `chrome.mjs` registra ("20,0 fps na
primeira execução"). Comparações de fase têm de ser contra ESTE número, no
mesmo protocolo, com órfãos mortos antes (ver "Protocolo" abaixo).

## Instrumentado (por programa)

    313 quadros em 15 s = 20,9 fps · rAF p50 50,0 p90 50,6 p99 67,2
    calls/quadro 40,7 · descartes 0
    GPU 245,639 ms/quadro · POS 33,882 ms (13,8%)

| programa                                        | ms/quadro | draws/quadro |
| ----------------------------------------------- | --------- | ------------ |
| cena:heroStars                                  | 55,109    | ×16,2        |
| cena:galaxia(pontos)                            | 34,124    | ×1,0         |
| cena#8[uvTransform]                             | 33,987    | ×1,0         |
| cena#7[uSrc,uTexel]                             | 33,143    | ×1,0         |
| cena:nebulosa(raymarch)                         | 32,573    | ×1,0         |
| pos:bloom-blur                                  | 21,583    | ×9,5         |
| cena#9[uCamPos,uScreenH,uExpoM0,uSigmaPx,uTa…]  | 7,889     | ×1,0         |
| cena#11[uCamPos,uScreenH,uTanHalfFov,uFade,…]   | 3,817     | ×1,0         |
| cena:wrappedStars                               | 3,729     | ×1,0         |
| pos:film                                        | 3,501     | ×1,0         |
| cena#10[uSize,uEZ,uColor,uTime,uFade,uPulse]    | 3,306     | ×1,0         |
| pos:output(ACES+sRGB)                           | 3,053     | ×1,0         |
| pos:bloom-blend                                 | 2,281     | ×1,0         |
| pos:bloom-prefiltro                             | 1,778     | ×1,0         |
| pos:bloom-composite                             | 1,686     | ×1,0         |
| cena#12[uCamPos,uTime,uScreenH,uBox,uFade,uC…]  | 1,444     | ×1,0         |
| cena#13[uFade,uTanHalfFov,uTau]                 | 1,344     | ×1,0         |
| cena#14[uCamPos,uScreenH,uGain,uExpoM0,uSigm…]  | 1,292     | ×1,0         |

`cena#14` é a camada `planetas` (uGain + uExpoM0/uSigmaPx sem uTa…); `cena#9`
tem a mesma família de uniforms com uTa… (billboard de heroes/SunStar). O
palco de corpos (F0) não aparece — grupo vazio não emite draw, como esperado.

## Ressalvas de leitura (importam para o teto de ≤2 ms)

1. **Os ms/quadro instrumentados são régua RELATIVA nesta máquina, não
   verdade absoluta**: a soma (245,6 ms) excede o próprio tempo de quadro
   (50 ms) porque o beginQuery/endQuery por draw serializa o pipeline no
   ANGLE/metal. O próprio cabeçalho do script declara o limite ("mede
   DRAWS…"). O teto de ≤2 ms de cada fase deve ser julgado por DELTA contra
   esta tabela, mesmo protocolo, mesma máquina — um programa NOVO que entre
   custando ≤ a ordem de pos:bloom-composite (~1,7 ms nesta régua) está
   dentro do espírito do teto; um que entre na ordem do raymarch (~33 ms)
   estourou.
2. **Protocolo antes de medir**: matar Chrome órfão de harness
   (`ps aux | grep user-data-dir=/var/folders`, matar por perfil) — 14
   órfãos derrubaram a primeira medida desta sessão para 10,3 fps
   (rAF 100 ms = throttle), exatamente o modo de falha documentado no
   cabeçalho de `chrome.mjs` (20,0 → 8,0 fps).
3. **Conserto no instrumento (desta sessão)**: `gpu-profile.mjs` travava no
   primeiro contexto webgl da página, que desde a Onda 1e é a SONDA de GL
   (`sondarGl`, App.tsx:83, canvas solto) — media zero draws e abortava com
   "app parou de desenhar". Agora só instrumenta canvas no DOM (o do
   renderer é o único). Sem isso, nenhuma medição de fase da Onda 6 rodaria.
