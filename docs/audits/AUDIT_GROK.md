# Audit — Mar de Estrelas (Grok)

**Modelo:** Grok 4.5 (xAI)  
**Data:** 2026-07-30  
**Repositório:** Viagem-Sol-pela-Milky-Way / “Mar de Estrelas”  
**Escopo:** bugs · performance · qualidade visual/UX  
**Modo:** somente relatório — nada implementado  

---

## Contexto

Experiência 3D cinematográfica em tempo real no browser (Vite + React + Three.js/WebGL2 puro, sem R3F): viagem do Sol até a Via Láctea inteira, combinando catálogos em `public/data/galaxy/` com preenchimento procedural.

**Contratos invioláveis respeitados na análise:**

- Nunca propor “otimização” que degrade qualidade visual percebida.
- Nunca falsificar posição de dado observado nem misturar observado com procedural fora de `docs/GALACTIC_DATA_FOUNDATION.md`.

**Método:** leitura do pipeline completo (`director` → world/shaders → post), contratos em `GALACTIC_DATA_FOUNDATION.md` / `RENDERER_CARTOGRAPHY.md`, contagens de orçamento no código, e inspeção visual de capturas em `output/playwright/`. Achados tentados adversarialmente no código; o que não sobreviveu foi descartado (ver seção final).

**Alvo de performance declarado:** 60 fps estável em 1440p no preset máximo (RTX 3070).

---

## Como o frame realmente gasta tempo

```
requestAnimationFrame
└─ Director.tick
   ├─ câmera / fades / cavity / seed clouds (≤4 Hz)
   ├─ stars, farStars, wrapped, heroes, sun, dust, galaxy, cartography
   ├─ labels → Canvas2D
   ├─ [se nebulaFade > 0.02]
   │   ├─ LUT 256×128 × 24 passos pesados/pixel
   │   └─ raymarch @ ~0.5× res CSS × até 56 densidades/pixel
   └─ EffectComposer
      ├─ RenderPass (cena @ pixelRatio)
      ├─ UnrealBloomPass (5 mips, dual-axis blur)
      ├─ Film (CA + grain)
      └─ OutputPass (ACES)
```

### Presets fracos no alvo 1440p Windows

Em `src/three/core/engine.ts`:

```ts
const pr = Math.min(window.devicePixelRatio || 1, PRESETS[q].pixelRatio);
// cinema: pixelRatio 2.0, nebulaSteps 56
// alta:   pixelRatio 1.5, nebulaSteps 44
// performance: pixelRatio 1.0, nebulaSteps 30
```

Com `devicePixelRatio ≈ 1` (1440p desktop típico), **cinema e performance renderizam na mesma resolução**. O preset “cinema” quase só muda `nebulaSteps` (e scale da nebula em `performance`). Partículas, bloom, discos e extinção **não escalam**.

---

## Ranking por impacto

Cada item: evidência concreta · causa raiz · menor fix · por que sobreviveu à refutação.

---

### 1. Raymarch da nebulosa: FBM multi-oitava + 7 núcleos por amostra

| | |
|--|--|
| **Frente** | Performance (dominante no Ato I–II) |
| **Impacto estimado** | ~4–10 ms em corredor denso @ 1440p |

**Evidência**

- RT meia-resolução: `src/three/world/nebula.ts` (scale 0.5 → ~1280×720 em 1440p; 0.35 em performance).
- Loop até 56 passos: `src/three/shaders/nebulaShaders.ts` (~linhas 238–295).
- Por amostra com `d > 0.003`: `GLSL_DENSITY` em `src/three/shaders/common.ts` (~127–161) — envelope + FBM 4+3 oitavas + **7 cores** (`WORLD.nebulaCores`) cada com 2 FBM + até 32 seed clouds + lanes FBM; palette e HII hero ainda mais FBM no mesmo arquivo de shader.

**Causa raiz**

O volume molecular real é esparso (`clumps` já existe), mas o shader paga o pacote completo em quase toda amostra do slab. O recorte `|z| < 1600` barateia vista off-plane; **não** o corredor in-disk (span ≈ tMax).

**Menor fix (sem perder silhueta)**

1. Early-out barato após envelope+clumps: se `clumps` abaixo do limiar, não avaliar cores/palette.
2. LOD dos 7 `nebulaCores`: só se `length(p - core) < ~3× raio`.
3. Opcional: checkerboard/reprojeção temporal (2 frames) — grain + ACES mascaram; pode subir `scale` para 0.65 pagando com −4 steps.

**Refutação**

Meia-res não elimina ~0.9M marches caros. Cortar amostras **vazias** ou cores fora de alcance preserva as mesmas silhuetas onde há densidade.

---

### 2. Extinção interestelar por vértice: 6 densidades × ~60k estrelas

| | |
|--|--|
| **Frente** | Performance |
| **Impacto estimado** | ~1.5–4 ms perto do Sol |

**Evidência**

- `src/three/shaders/starShaders.ts` (~45–49) chama `extinction()`.
- `src/three/shaders/common.ts` (~194–206): **6** amostras de `nebulaDensity(..., 2)`.
- `GLSL_DENSITY_LOCAL` ainda inclui **7 cores + vários FBM** (~174–190).
- Aplicado a HYG **18 543** + far **42 000** (`config.ts` `farStarsCount`), todo frame com `localFade > 0` (`director.ts` ~399–409).

**Causa raiz**

Extinção = mini-raymarch por estrela, não campo compartilhado. Custo ∝ contagem de pontos, não cobertura de tela.

**Menor fix**

- Estrelas fracas (`aMag ≳ 5.5`): 1 amostra ou skip (avermelhamento invisível a 1440p).
- Ou bake 3D/slices de τ de baixa res (uma vez / raro) e 1 fetch no VS.
- Manter 6–8 amostras só para brilhantes com `dist < 80 pc`.

**Refutação**

Não remover extinção das brilhantes — só o trabalho em pontos subpixel/fracos que não se lê.

---

### 3. Vista externa: 7 lâminas de disco × FBM5 + orçamento fraco nos braços externos

| | |
|--|--|
| **Frente** | Performance **e** qualidade (Ato III) |
| **Impacto** | ~2–5 ms face-on + braços “contas de rosário” |

**Evidência**

- `src/three/world/galaxy.ts` `createDiscLayers` (~577–616): `PlaneGeometry(2, 2, 144, 144)` × **7** layers, additive, `DoubleSide`.
- `DISC_FRAG` em `src/three/shaders/galaxyShaders.ts` (~213–257): 2× `fbm2` (5 oitavas) + braços; intensidade base ~`0.042 + armLight * 0.13 * clumps`; `uLayerAlpha` máx 0.64.
- Capturas: `output/playwright/cartography-face-on-final-v2.png`, `reference-final-galaxy.png` — braços externos em beads sobre quase-preto; núcleo OK.

**Causa raiz**

Partículas com conservação de fluxo (`GALAXY_VERT` ~29–34) viram subpixel no disco externo; o disco contínuo não compensa a superfície. Sete overdraws full-disk pagam FBM idêntico.

**Menor fix (beleza ↑, custo ↓ ou =)**

1. **Bake** emissão do disco (+ warp já nos canais B/A do dust map) → 1–2 quads HDR na carga (mesmas funções `galMajorArms`/warp).
2. Enquanto procedural: **2–3 layers** redistribuindo alpha; boost de intensidade só em `radius ≳ 0.45` (`smoothstep`), não no núcleo (evita bloom).

**Refutação**

Não é “mais partículas”. As frames face-on já mostram o gap: luz contínua fraca, beads dominam.

---

### 4. Bojo + UnrealBloom = bola branca que apaga estrutura

| | |
|--|--|
| **Frente** | Qualidade (+ fill-rate do bloom) |
| **Impacto** | Legibilidade do GC em edge-on/face-on |

**Evidência**

- Glow 2700 pc, fade `externalFade * glowGate * 0.32` (`galaxy.ts` ~483–488, 675–681).
- Bloom strength 0.72, threshold 0.82 (`src/three/core/post.ts` ~24–28); `setGalaxy` só atenua parcialmente (~48–57).
- Capturas: `cartography-edge-on-final.png` (orbe central), face-on com flare cruzado.

**Causa raiz**

Billboard aditivo já acima do limiar de bloom vira disco HDR que o Unreal espalha e engole barra/fendas/HII.

**Menor fix**

- `uSize` ~1400–1800 e/ou fade ×0.55; `glowGate` mais cedo (ex. 8–16 kpc).
- Em `setGalaxy`: `strength = 0.72 - 0.4*g`, `threshold = 0.82 + 0.55*g`.
- Sem novos passes.

**Refutação**

A estrutura do disco existe nas partículas/lâminas; o centro é featureless por orçamento HDR, não por falta de geometria.

---

### 5. ~383k partículas galácticas + 60k wrapped, orçamento fixo

| | |
|--|--|
| **Frente** | Performance |
| **Impacto estimado** | ~1–3 ms combinados |

**Evidência**

- `buildGalaxy`: N_DISK 170k + N_BULGE 85k + … ≈ **282.7k** bright + **100k** dust (`galaxy.ts` ~113–119).
- Wrapped **60k** (`wrappedStars.ts` ~18–19); far 42k; HYG 18.5k.
- Todos com `frustumCulled = false`.
- Durante a viagem **ainda no disco**, `localBandFade = env * 0.76` mantém o campo galáctico quase inteiro (`director.ts` ~374, 417–425).
- Wrapped com `fade=1` mesmo perto do Sol; o shader zera com `sunGate` (`wrappedStars.ts` ~72–73) mas o VS ainda roda.

**Causa raiz**

Orçamento fixo; presets de qualidade não tocam contagens. Bounding sphere do disco quase sempre intersecta o frustum → flag de culling sozinho não salva.

**Menor fix (qualidade preservada)**

1. Subamostra determinística por qualidade (mesmo buffer, stride 2/3) com compensação de alpha via `shrink` já existente.
2. Wrapped: `uFade=0` / `visible=false` se `dHome < 900` (intenção já no shader — CPU evita 60k VS).
3. Exterior: reduzir dust multiply primeiro (baixa frequência).

**Refutação**

Densidade estelar é estatística; metade dos pontos subpixel com compensação de alpha é indistinguível a 1440p.

---

### 6. Clip planes ancorados em `dHome` (distância ao Sol)

| | |
|--|--|
| **Frente** | Bug (física/render + free-roam UX) |
| **Impacto** | Alto em explorar livre; médio na viagem roteirizada |

**Evidência**

```ts
// src/three/core/engine.ts ~66–76
updateClip(distFromSun: number) {
  const near = THREE.MathUtils.clamp(distFromSun * 0.004, 0.001, 500);
  const far = THREE.MathUtils.clamp(distFromSun * 12, 9000, 400000);
  // ...
}
```

- Perto do Sol: `far = 9000` pc — metade distante do disco (~25 kpc máx Sol→borda) **clipada** enquanto `localBandFade` ainda pede partículas da faixa.
- Free-roam no GC com `dHome ≈ 8150`: `near ≈ 33` pc — impossível aproximar nuvens/HII sem clip.
- `director.ts` chama `updateClip(dHome)` com `dHome = cam.position.length()` (origem = Sol).

**Causa raiz**

Proxy solar em vez de near/far pelo conteúdo (ou distância ao ponto de interesse).

**Menor fix**

- `near` baseado em escala da cena próxima / distância ao GC ou conteúdo relevante, com histerese.
- `far = max(dHome * 12, dGC + diskRadius * 1.2, 9000)`.
- Validar com `?pos=-442,-7117,-3946` e com `?t=50`.

---

### 7. HII procedural (2200) + HII observado (1413) desenhados juntos

| | |
|--|--|
| **Frente** | Bug de contrato cartográfico + perf + qualidade |
| **Impacto** | “Sopa rosa” + ~2.2k pontos extras |

**Evidência**

- Procedural: `galaxy.ts` `N_HII = 2200` (~116, 273–308) — magenta/azul inventado nos braços.
- Observado: `starForges.ts` (~116–132) — 1.413 WISE, posições de catálogo, size × 3.
- Com `cart ≠ off`, ambos entram (`director.ts` ~151–159 + galaxy sempre construída com HII procedural).

**Causa raiz**

Camada `inferred` de HII não cede quando a camada `observed` está ativa — viola o espírito de `GALACTIC_DATA_FOUNDATION.md` (não misturar como se fosse o mesmo produto).

**Menor fix**

Com cartografia on: `N_HII = 0` (ou ×0.1 só em cobertura APOGEE zero). `StarForges` vira a única fonte rosa. Menos pontos = mais rápido; braços mais legíveis.

**Refutação**

Não é direção de arte: são duas populações rosa no mesmo papel sem handoff documentado.

---

### 8. Jitter IGN da nebulosa muda todo frame → shimmer temporal

| | |
|--|--|
| **Frente** | Qualidade |
| **Impacto** | Ato I–II (a “cara” da experiência) |

**Evidência**

- `nebulaShaders.ts` (~208–209, 243–248): IGN por `gl_FragCoord`, fase efetivamente animada por amostragem por frame.
- RT 0.5× bilinear; captura `reference-final-dive.png` — gás em blotches granulados.
- `uTime` no density principal **não** advecta o campo (`GLSL_DENSITY` é estático em `p`).

**Causa raiz**

Meia-res + fase de amostragem instável sem história = crawling clássico. Grain de filme (`FILM_SHADER`) piora a leitura.

**Menor fix**

- Jitter **estável** por pixel (sem fase temporal), ou blue-noise texture.
- Opcional: advection mínima só nas oitavas de detalhe (`p + ε·vec3(t,…)`) — **não** move centróides observados (contrato OK).
- Custo ≈ 0; estabilidade sobe.

---

### 9. Bloom a resolução cheia; presets de grain mortos

| | |
|--|--|
| **Frente** | Performance + qualidade global |
| **Impacto** | ~1–3 ms bloom; grain “vídeo” nas capturas |

**Evidência**

- `post.ts`: `UnrealBloomPass` no composer (full PR); sem half-res.
- `engine.ts` define `grain: 0.055 / 0.05 / 0.04` — **nunca escrito** em `uGrain`.
- Film fixa `uGrain: 0.016` e hash em `vec2(1920.0, 1080.0)` (`dustShaders.ts` ~75–76, 117–119).
- Capturas edge-on/face-on: grão grosso e rastejante.

**Causa raiz**

Bloom soft é band-limited (half-res é padrão AAA sem perda perceptível). Config de qualidade desconectada do passe de filme.

**Menor fix**

1. Bloom half-res (ou 3–4 mips em vez de 5).
2. `film.uniforms.uGrain = preset.grain` com valores cinema **0.008–0.012** (não 0.055).
3. `hash(uv * actualResolution)`.

---

### 10. Snap de look no Ato III (`> 0.6 pc`)

| | |
|--|--|
| **Frente** | Bug de câmera / UX cinematográfica |
| **Impacto** | Pico emocional da peça |

**Evidência**

```ts
// src/three/cinematic/cameraRig.ts ~50–57
if (this.first || this.lookSm.distanceTo(s.look) > 0.6) {
  this.lookSm.copy(s.look);
```

- Keyframes: look no Sol até t≈146, depois GC `(-442, -7117, -3946)` em t=158 (`journey.ts` ~37–40).
- Delta de milhares de pc → **snap** instantâneo, não lerp.

**Causa raiz**

Limiar pensado para flybys estelares (0.6 pc), não para reframe galáctico.

**Menor fix**

- Snap se `delta > 0.05 * |look − pos|` **ou** lerp com taxa ∝ distância.
- 1 keyframe intermediário (~t=152) look a meio caminho + hold 2–3 s no primeiro edge-on limpo.

---

### 11. LUT da faixa galáctica reintegrada todo frame

| | |
|--|--|
| **Frente** | Performance |
| **Impacto estimado** | ~0.3–1.0 ms enquanto nebula ligada |

**Evidência**

- `nebula.ts` (~175–179): LUT + raymarch sempre no `render()`.
- `integrateGalacticDisk`: 24 passos pesados × 256×128 (`nebulaShaders.ts` ~76–171).
- Depende de `uCamPos` (e dust map), **não** de tempo.

**Menor fix**

Dirty-flag: re-render se `‖Δcam‖ > ~2–5 pc` (ou 15–20 Hz max). Rotação pura reusa LUT (integração por direção a partir de `ro`).

---

### 12. Labels e legendas abaixo do padrão “cinema”

| | |
|--|--|
| **Frente** | UX |
| **Impacto** | Confiança no catálogo real (Ato I) |

**Evidência**

- Labels 10px / 8px, sem exclusão do disco solar (`LabelCanvas.ts` ~55–88; `labels.ts` ~49–71).
- Captura dive: rótulos finos/baixos.
- Captions: só `captionIn`, tracking largo em `hud.css`; remount hard em `showKey`.

**Menor fix**

Nome 12–13px + placa escura leve; pular label se NDC dentro do raio angular do Sol; fade-out 0.4 s nas legendas; tracking menor em títulos longos.

---

### 13. Free-roam: “cima” é Y mundial

| | |
|--|--|
| **Frente** | UX / estado |
| **Impacto** | Médio ao explorar após revelação |

**Evidência**

```ts
// src/three/cinematic/cameraRig.ts ~142–145
const f = new THREE.Vector3();
this.camera.getWorldDirection(f);
const r = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
const u = new THREE.Vector3(0, 1, 0);
```

A viagem usa polo galáctico como up (`cameraRig.ts` ~69–72). Q/E no free-roam sobe no eixo equatorial da cena.

**Menor fix**

`u = camera.up` (ou coluna 1 da matrix) normalizado.

---

### 14. Capturas `?t=&shot=1` não são determinísticas no grão/anim

| | |
|--|--|
| **Frente** | Bug de validação / estado |
| **Impacto** | Baixo em produção; alto no fluxo de QA |

**Evidência**

- `freezeJourney` só trava `journeyT` (`director.ts` ~315).
- `post.render(time)`, Sol, Cefeidas, grain usam wall-clock `time`.
- Duas capturas no mesmo `t` diferem no grain.

**Menor fix**

Com `freeze` / `shot`: `uTime = journeyT` (ou 0) em film / sun / heroes / forges.

---

## Mapa de calor por fase

| Fase | O que mais dói |
|------|----------------|
| Intro / Sol | Raymarch + extinção estelar + wrapped “morto” + bloom + Sol |
| Mergulho / Betelgeuse | Pico do raymarch (cores + seeds) + grain/shimmer |
| Saída do disco | Nebula desliga (bom) → partículas galácticas + observed FBM + bloom |
| Face-on / pull-back | 7× disc overdraw + beads + bola do bojo |

---

## Orçamento aproximado de draws (cartografia on)

| Pass / draw | Notas |
|-------------|--------|
| 1–2 | Nebula LUT + raymarch (quando in-disk) |
| 1 | Composer scene (muitos sub-draws) |
| ~7 | Disc layers |
| 2 | Galaxy bright + dust points |
| 3 | Glow / dwarf / marker |
| 2 | HYG + far stars |
| 1 | Wrapped stars |
| 1 | Near dust |
| 1 | Observed clouds |
| 1 | Star forges |
| 4 | Sun + 3 corona |
| 12 | Hero billboards |
| ~12–15 | Bloom/film/output fullscreen |
| **Total** | **~40–50** draws + **~14** fullscreen post taps |

Não é “draw-call bound” no sentido antigo — **fill-rate + VS/FS pesados**.

---

## Ballpark de custo (RTX 3070, 1440p, cinema, dpr=1)

*Ordens de magnitude por leitura estrutural do código — não profiler NSight.*

| Bucket | In-disk journey | Exterior galaxy |
|--------|-----------------|-----------------|
| Nebula (LUT+RM) | 4–10 ms | ~0 |
| Stars + extinção + wrapped | 2–5 ms | 0.5–2 ms |
| Galaxy discs + points + cart | 0.5–2 ms | 3–8 ms |
| Bloom + film + output | 1.5–3 ms | 1.5–3.5 ms |
| Rest (sun, dust, CPU) | 0.5–1.5 ms | 0.3–1 ms |
| **Risco total** | **frequentemente >16.7 ms** | **frequentemente >16.7 ms** |

---

## O que foi investigado e descartado

| Suspeita | Por que caiu |
|----------|--------------|
| EffectComposer 8-bit | three **r185** já cria RT com `HalfFloatType` no `EffectComposer` |
| Re-parse de binários por frame | load uma vez em `init` / `loadStarData` / `loadGalacticAssets` |
| Re-bake dust map por frame | `bakeDustMap` na carga |
| Seed clouds todo frame | throttle 0.25 s em `director.ts` |
| Nebula após latch `leftDisk` | gate correto e intencional (Ato III) |
| Disc layers dentro do disco | já `visible = false` se `externalFade ≈ 0` |
| Labels como custo GPU principal | ≤7 projeções + canvas 2D pequeno |
| “Cinema = 2× pixels em 1440p Windows” | `min(dpr, 2)` com dpr=1 → PR=1 |

---

## Ordem de ataque recomendada

Máximo impacto / mínimo risco, sem degradar percepção nem violar cartografia:

1. **Extinção LOD + wrapped off perto do Sol** — ms fáceis, zero regressão visual.
2. **Early-out / core LOD no raymarch** — maior alívio in-disk.
3. **Half-res bloom + glow/threshold do GC** — Ato III legível e mais barato.
4. **Gate HII procedural com cart on** — honestidade + limpeza + FPS.
5. **Bake ou colapso das 7 lâminas + boost outer disc** — face-on cinema.
6. **Clip planes corretos + look lerp Ato III** — bugs reais.
7. **Grain wiring + jitter estável** — imagem “filme”, não “ruído de vídeo”.
8. **LUT dirty + quality presets que escalam partículas/bloom/steps** — 60 fps estável.

Nenhum item pede falsificar posição observada nem desligar cartografia. Os que tocam `inferred` (HII procedural, FBM de detalhe) só **reduzem** inventado quando o observado já cobre o papel.

---

## Arquivos mais responsáveis

| Área | Paths |
|------|--------|
| Loop / fades | `src/three/director.ts`, `src/three/core/engine.ts` |
| Volume | `src/three/world/nebula.ts`, `src/three/shaders/nebulaShaders.ts`, `src/three/shaders/common.ts` |
| Estrelas | `src/three/world/stars.ts`, `src/three/shaders/starShaders.ts`, `src/three/world/wrappedStars.ts` |
| Galáxia | `src/three/world/galaxy.ts`, `src/three/shaders/galaxyShaders.ts` |
| Post | `src/three/core/post.ts`, `src/three/shaders/dustShaders.ts` |
| Cartografia | `src/three/cartography/dustMap.ts`, `src/three/world/observedClouds.ts`, `src/three/world/starForges.ts` |
| Câmera / HUD | `src/three/cinematic/journey.ts`, `src/three/cinematic/cameraRig.ts`, `src/components/LabelCanvas.ts`, `src/hud.css` |
| Contratos | `docs/GALACTIC_DATA_FOUNDATION.md`, `docs/RENDERER_CARTOGRAPHY.md` |
| Frames | `output/playwright/reference-final-*.png`, `cartography-*-final*.png` |

---

## Validação sugerida (quando for implementar)

```bash
npm ci
npm run typecheck && npm run lint && npm run build && npm run data:verify
npm run dev   # :5173
```

Capturas determinísticas (após fix #14 de `uTime`):

| URL | Momento |
|-----|---------|
| `?t=0&shot=1` | Sol |
| `?t=85&shot=1` | Betelgeuse / nebulosa |
| `?t=158&shot=1` | Disco de perfil |
| `?t=170&shot=1` | Revelação face-on |
| `?pos=-442,-7117,-3946&look=0,0,0&shot=1` | Centro galáctico (cena) |

Julgar com GPU real (headless SwiftShader mente sobre desempenho).

---

*Fim do audit Grok — 2026-07-30*
