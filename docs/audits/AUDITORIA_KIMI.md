# Relatório de Auditoria — Mar de Estrelas

**Auditor:** Kimi (Kimi Code CLI, modelo Moonshot AI)
**Data:** 2026-07-30
**Escopo:** auditoria completa do repositório em três frentes — bugs, performance e qualidade visual/UX — pedida pelo mantenedor, que enviou a mesma tarefa a vários modelos em paralelo. **Este relatório é o produzido pelo Kimi.** Nada foi implementado; só investigação e verificação.

## Método

1. Leitura integral de `src/` (≈5.700 linhas), `README.md`, `docs/*.md`, `public/data/galaxy/manifest.json`.
2. Três investigadores paralelos (um por frente) + um agente de validação prática; cada achado foi testado adversarialmente — tentativa de refutação no código, na aritmética ou em captura — antes de entrar no relatório. Os achados de maior impacto foram **reverificados pessoalmente** pelo auditor no código e nas capturas.
3. Validação executada (todas **PASS**):
   - `npm run typecheck` — pass, sem erros.
   - `npm run lint` — pass, zero warnings.
   - `npm run build` — pass em 2,5 s.
   - `npm run data:verify` — pass: 7 ativos galácticos + 18.543 estrelas HYG íntegros (SHA-256).
4. Capturas determinísticas (Chrome real, 1280×720, `?t=…&shot=1` e `?pos/look`) em `output/playwright/audit-*.png`, inspecionadas visualmente. Console do navegador limpo (nenhum erro de shader/fetch; apenas o log `[cartografia] APOGEE 41.5% do disco com cobertura observacional`).
5. Medição de FPS com **GPU real** (Chrome headed, `ANGLE (NVIDIA GeForce RTX 3070, D3D11)`, 2560×1440, `?t=170`, 300 frames): **avg 16,67 ms (60,0 fps), p95 16,70 ms** — travado no vsync.

### Ressalva honesta sobre a premissa de performance

A medição acima foi feita no Ato III (raymarch da nebulosa desligado lá) e **não registra em qual preset o auto-quality estava** — o sistema degrada sozinho e pode ter caído para `alta`/`performance` antes da janela de medição. Os Atos I–II (raymarch ativo) **não foram medidos**. A análise estática (achado P1) indica que o custo dominante está justamente aí. Ou seja: "60 fps no Ato III" foi observado; "60 fps sustentado no preset `cinema` durante toda a viagem" **não** foi demonstrado — e o achado P2 mostra que, uma vez degradado, o preset nunca volta sozinho.

---

## Ranking consolidado por impacto

### P1 — [PERF · dominante] 7 núcleos de nebulosa avaliam FBM incondicionalmente por amostra do raymarch

- **Evidência:** `src/three/shaders/common.ts:75-80` — `coresGLSL()` injeta 7 blocos; em cada um, `fbm(p*0.09, oct)` e `fbm(p*0.30, 2)` são calculados **sempre**, e só depois multiplicados por `g = exp(-dot(q,q)*1.6)`. Como o argumento do fbm não depende de `q`, o driver não elimina o trabalho. Verificado pessoalmente.
- **Causa raiz:** os núcleos têm raios de 9–26 pc num corredor de ~260 pc; para a maioria esmagadora das amostras (e 100% das amostras fora do corredor) `g < 1e-6` — contribuição nula, custo cheio. Contagem: ~51 avaliações de ruído/amostra, ~42 delas dos núcleos; com 56 passos (preset cinema) × ~0,92 Mpx (RT interno) ≈ centenas de G-ops/frame — sozinho capaz de saturar uma RTX 3070 nos Atos I–II. Coerente com o sintoma reportado e com o auto-quality caindo.
- **Menor fix:** envolver cada bloco em `if (dot(q, q) < 9.0) { … }` (`exp(-9×1,6) ≈ 6e-7`, invisível). ~10 linhas; densidade cai de ~51 para ~9–15 ruídos/amostra. **Speedup esperado de 2,5–4× no raymarch, diferença visual nula.** O gate beneficia de graça a extinção por vértice (P4) e a variante `GLSL_DENSITY_LOCAL`.

### P2 — [PERF/BUG · alto] Auto-qualidade nunca se recupera: limiares de subida inatingíveis sob vsync

- **Evidência:** `src/three/core/engine.ts:128-131` — subir `performance`→`alta` exige `avg > 60` e `alta`→`cinema` exige `avg > 72`, mas com vsync a 60 Hz `avg = fpsN/fpsAcc` nunca passa de ~60. O comentário em `:125-127` afirma que "a qualidade precisa voltar sozinha" — está quebrado para qualquer monitor 60 Hz. Verificado pessoalmente.
- **Consequência:** qualquer soluço trava o usuário no preset inferior para sempre — e invalida medições de "preset máximo" (ver ressalva acima). Também mascara qualquer ganho do fix P1.
- **Menor fix:** limiares relativos ao refresh real (ex.: `avg > 0.97 * refreshHz`) ou comparar frame-time médio em vez de fps. ~4 linhas.

### V1 — [VISUAL · maior impacto perceptual por linha] Gradação de filme roda em linear HDR, ANTES do tone mapping

- **Evidência:** `src/three/core/post.ts:31-33` — ordem dos passes: `RenderPass → UnrealBloom → ShaderPass(FILM_SHADER) → OutputPass`. Verificado pessoalmente.
- **Causa raiz (percepção):** vinheta, elevação de negros e grão são aplicados em linear e depois esmagados pelo joelho do ACES no `OutputPass`. O "black lift" de filme mal sobrevive; o grão — que em filme real vive nas sombras, 99% de uma cena de espaço — é comprimido a quase zero; a vinheta multiplicativa em HDR corta luz demais. Coerente com o que se vê nas capturas: `audit-reveal-t170.png` e `audit-nebula-t85.png` saem lavados, cinza-azulados, de baixo contraste.
- **Menor fix:** mover `this.composer.addPass(this.film)` para **depois** do `addPass(new OutputPass())`. Zero custo de GPU. Validar com A/B em `?t=170&shot=1`.

### P3 — [PERF · dominante no Ato III] 7 lâminas do disco galáctico com FBM completo por pixel por frame — conteúdo 100% estático

- **Evidência:** `src/three/world/galaxy.ts:569-617` (7 lâminas aditivas de 33,6 kpc sobrepostas) × `src/three/shaders/galaxyShaders.ts:151-281` (`DISC_FRAG`: 2× `fbm2` de 5 oitavas, braços calculados 2× por pixel, fetch do dust map). O shader **não tem `uTime`** — a imagem é idêntica frame a frame; só `uFade` muda.
- **Custo:** no pull-back o disco cobre ⅓–½ da tela com 7 camadas aditivas: ~10–13 Mpx/frame × ~700–900 ALU ≈ 8–11 G-ops/frame, mais 292k vértices com warp transcendental — o maior custo do Ato III.
- **Menor fix:** bake único no init de cada lâmina para um RT 1024² (33 pc/texel; o detalhe mais fino é ~1000 pc) e trocar o material por quad texturizado com `intensity *= uFade * uLayerAlpha`. Custo único ≈ 1 frame; custo por frame vira 7 fetches. Determinístico ⇒ diferença visual nula.

### V2 — [VISUAL · Ato III] Poeira procedural da galáxia ignora o mapa APOGEE e lê como "sujeira" na revelação

- **Evidência:** captura `output/playwright/audit-reveal-t170.png` — dezenas de manchas pretas arredondadas espalhadas pelos braços leem como buracos/sujeira, não como dust lanes (confirmado em inspeção visual própria). Código: `src/three/world/galaxy.ts:363-411` gera as faixas escuras só por `armThetaAtRadius` + ruído; `GALAXY_DUST_FRAG` (`galaxyShaders.ts:65`) não recebe `uDustMap` — enquanto o disco contínuo (`DISC_FRAG:233-251`) e as nuvens CO (`observedClouds.ts`) já obedecem ao APOGEE.
- **Por que importa:** as fendas escuras dominam a composição do Ato III (a "foto de capa"); onde há cobertura APOGEE, deveriam seguir a estrutura medida.
- **Menor fix (contract-safe):** fetch do dust map só no material de poeira, modulando **alpha** por `mix(1.0, laneFactor, cobertura)` — zero deslocamento de posição; é exatamente a regra já documentada para o `DISC_FRAG`. Dado segue `derived`, preenchimento segue `inferred`.

### B1 — [BUG · manifestação garantida] Vinheta de warp fica congelada ao entrar em free-roam

- **Evidência:** `onWarp` só é emitido em `src/three/director.ts:320` (branch `journey`) e `:330` (fim); `enterFreeRoam()` (`:293`) e `placeCamera()` (`:262`) não emitem `onWarp(0)`. O HUD usa `opacity: var(--warp)` (`src/hud.css:259-260`). Warp = `clamp(speed/6,5)^1,35` (`journey.ts:121`) e a velocidade de pico do Ato III é ~4.000 pc/s → warp cravado em 1. Verificado pessoalmente.
- **Manifestação:** clicar em "Explorar livremente" no meio da viagem deixa o overlay azul de warp preso para sempre (o bloom volta porque `post.setWarp(0)` é chamado; a variável CSS, não).
- **Menor fix:** `this.events.onWarp(0);` em `enterFreeRoam()` e `placeCamera()`.

### B2 — [BUG · ciclo de vida] Render targets do UnrealBloomPass vazam no dispose

- **Evidência:** `src/three/core/post.ts:67-69` chama apenas `composer.dispose()`. Em three 0.185, `EffectComposer.dispose()` dispõe só `renderTarget1/2` e `copyPass` (`node_modules/three/examples/jsm/postprocessing/EffectComposer.js:354-360`) — **não** os passes. `UnrealBloomPass.dispose()` existe e libera 11 RTs HDR (`UnrealBloomPass.js:210-240`). Verificado pessoalmente no node_modules.
- **Manifestação:** a cada remount do `App` (HMR de dev) vazam ~11 RTs HDR de VRAM. O resto do pipeline está coberto em `Director.dispose()`.
- **Menor fix:** `this.bloom.dispose();` em `Post.dispose()`. Complementar: `renderer.forceContextLoss()` em `Engine.dispose()` (`engine.ts:143-148`) para remounts repetidos não esgotarem contextos WebGL.

### P4 — [PERF · médio] Extinção interestelar: 60.543 vértices × 6 amostras de densidade

- **Evidência:** `src/three/shaders/starShaders.ts:46` chama `extinction()` por vértice = 6× `nebulaDensity` local (`common.ts:194-207`), que repete os mesmos 7 núcleos incondicionais. ~1,3 G-ops/frame, ~80% desperdiçado em estrelas longe do corredor.
- **Menor fix:** o gate de P1 já corta ~80%. Se sobrar custo: pular a extinção quando `px < 1,5` (estrela subpixel, extinção imperceptível) usando o `px` já calculado em `starShaders.ts:36`. Sem mudança perceptível.

### V3 — [VISUAL/UX] Suavização de câmera e FOV depende do frame rate

- **Evidência:** `src/three/cinematic/cameraRig.ts:56` (`lerp(s.look, 0.045)`/frame), `:91` (`fov += …*0.08`), `:155` (free-roam `vel.lerp(acc, 0.06)`). Nenhum usa `dt` — `apply()` nem recebe `dt`.
- **Consequência:** a câmera converge 2–4× mais rápido a 120–144 Hz do que a 30 fps; o "motion feel" cinematográfico muda de máquina para máquina.
- **Menor fix:** amortecimento exponencial `k = 1 - Math.exp(-dt/tau)` passando `dt` ao rig. ~6 linhas.

### B3 — [BUG · risco NaN] `normalize(uSunPos − ro)` com câmera na origem = tela branca determinística

- **Evidência:** `src/three/shaders/nebulaShaders.ts:234` — `uSunPos = (0,0,0)` e `?pos=0,0,0` é aceito por `App.tsx:58-65`. `normalize(vec3(0))` = NaN → textura de fundo NaN → UnrealBloom espalha (regra §7 do README). O journey nunca passa pela origem, mas o deep-link sim.
- **Menor fix:** `normalize(uSunPos - ro + vec3(1e-6))`.

### B4 — [BUG · risco NaN] `atan(y, x)` com ambos zero no centro do disco

- **Evidência:** `galaxyShaders.ts:198` (`DISC_FRAG`, `theta = atan(p.y, p.x)` — `p=(0,0)` ocorre quando o bojo projeta num centro de pixel; os keyframes do Ato III olham direto para o centro) e `DISC_VERT` (`:145`): `PlaneGeometry(2,2,144,144)` tem vértices exatos em `(0,0)` → `galWarpHeight(0, atan(0,0))` = `0·NaN` = **NaN** permanente nesses vértices (ANGLE costuma retornar 0; spec diz indefinido — driver-dependente).
- **Menor fix:** `atan(p.y, p.x + 1e-7)` nos dois shaders — mesmo padrão já usado contra `pow` de base negativa em `GLOW_FRAG:125`.

### V4 — [PERF/UX] Auto-quality não toca o custo dominante do Ato III; `grain` do preset é config morta

- **Evidência:** presets (`engine.ts:15-19`) só ajustam `pixelRatio` e `nebulaSteps` — e a nebulosa está desligada no Ato III (`director.ts:468-474`). No trecho mais pesado da viagem, o único alívio automático é pixelRatio. Adicional: `preset.grain` é definido mas **ninguém consome** (`uGrain` fixo em 0,016).
- **Menor fix:** em `performance`/`alta`, desligar as 3 lâminas mais tênues do disco (α 0,08/0,1/0,2 ≈ 19% do fluxo somado) e compensar `uLayerAlpha` das restantes ×~1,24 — conservação de fluxo aproximada, invisível a 15–25 kpc. Ligar ou remover `preset.grain`.

### V5 — [UX] Controles de filme ausentes: sem pausa, sem scrub

- **Evidência:** controles em `App.tsx:136-164` = só "Ver a galáxia", "Explorar livremente", qualidade. `Director.freezeJourney` (`director.ts:73`) e `seek(t)` (`:287`) já existem e funcionam (usados por `?t=`); `.progress-wrap` tem `pointer-events: none` (`hud.css:94`).
- **Menor fix:** botão Pausar + tecla Espaço (reusando a mecânica de freeze, parando captions/progresso que derivam de `journeyT`); `pointer-events: auto` + `onPointerDown` → `seek()` na barra de progresso. Um filme de 3min14s sem pausa é falha básica; o scrub expõe ao usuário comum o deep-linking que já é ferramenta oficial.

### Itens menores (verificados, fix trivial)

- **B5** — Labels projetados com a câmera do frame anterior: `projectLabels` roda em `director.ts:458` antes de `post.render()` atualizar `matrixWorldInverse`. Fix: `cam.updateMatrixWorld();` antes. (Labels "nadam" 1 frame; 1º frame após `placeCamera`/`seek` pode usar matriz identidade.)
- **B6** — `noNebula` é estado morto: declarado em `director.ts:74`, usado em `:468-470`, nunca atribuído via URL. E o branch aloca `new THREE.Color(0x010208)` por frame.
- **B7** — Vazamentos menores: `PlaneGeometry` do quad e do LUT em `nebula.ts:65,100`; base de `observedClouds.ts:156-159`; lâmina compartilhada disposta 7× em `galaxy.ts:699-701`.
- **B8** — Near plane atrelado a `dHome` (`engine.ts:67`): voando livre junto ao centro galáctico (dHome ≈ 8.150) → near = 32,6 pc; conteúdo a menos de ~33 pc da câmera some. Tradeoff consciente, mas não documentado.
- **B9** — Edge cases de URL: `?t=abc` congela em t=0 sem seek (`App.tsx:69-74`); `?freeze=1` sem `t`/`play` é ignorado; `?shot=1` não é totalmente determinístico (grão, coroa e deriva da poeira usam `uTime` real).
- **B10** — `heroStars.ts:96`: `uSeed: Math.random() * 10` — única fonte de não-determinismo da cena (viola o espírito do `mulberry32` e quebra screenshots reproduzíveis). Fix: seed derivada do índice.
- **V6** — `prefers-reduced-motion` só cobre CSS (`hud.css:324-337`); shake (`cameraRig.ts:76-78`), pulso de CA no warp (`post.ts:58-59`) e grão animado continuam. Vestibular — exatamente o gatilho que a media query existe para mitigar.
- **V7** — `Caption` sem `aria-live` (`Hud.tsx:80-97`): screen readers perdem toda a narração.
- **V8** — Free-roam em touch: arrastar olha, mas não há translação (`cameraRig.ts:147-154`) — no mobile "Explorar livremente" é um mirante fixo. Mínimo: dica honesta no `free-hint`.
- **V9** — `WrappedStars` renderiza 60k vértices com densidade galactocêntrica por vértice mesmo totalmente suprimido pelo `sunGate` no Ato I (`director.ts:401-406` passa fade=1 sempre). Fix: gate por `dHome` no director.
- **V10** — Micro-CPU: alocações por frame no rig (`journey.ts:104-123`, `cameraRig.ts:48-84,140-145` — scratch vectors); LUT da faixa galáctica re-renderizado todo frame (`nebula.ts:176-177` — depende só de `uCamPos`, renderizar só quando a câmera move); `LabelCanvas` com `shadowBlur` por frame (`LabelCanvas.ts:79-89`).
- **V11** — Documentação desatualizada: `README.md:107-112` diz que os ativos de `public/data/galaxy/` estão "deliberadamente desacoplados do renderer" — já estão acoplados (commit `bd8b975`; dustMap APOGEE → `DISC_FRAG`/LUT, CO → `observedClouds.ts`, WISE/BeSSeL/Gaia → `starForges.ts`); a tabela de crossfades ignora que `nebulaFade`/`galaxyFade` respondem a `R,z` galactocêntricos (`director.ts:351-374`).

### Oportunidade de dados (roadmap, melhor razão beleza/byte)

- **V12** — Halo com 165 aglomerados globulares reais (`docs/DATA_ROADMAP.md` item #1, ~7 KB, VizieR `J/MNRAS/505/5978`): hoje o halo são 5.000 pontos genéricos (`galaxy.ts:312-318`); pontos compactos e brilhantes em posições reais dariam profundidade e escala ao enquadramento final, na camada `observed` já prevista pelo contrato. Os 2.200 nós HII procedurais **não** precisam de ação (1.413 WISE reais já estão em `starForges.ts`; o preenchimento no lado distante é o contrato).

---

## Candidatos refutados (verificados, NÃO são problema)

- **Centro galáctico `(-442, -7117, -3946)`:** confere com `GC_POS = DIR_GC×8150 − NGP×5,5` (`galaxy.ts:43-46`); idêntico ao `GAL_CENTER` do GLSL (`common.ts:64`) — o "8150×0,0549≈447 vs 442" se explica pelo termo da altura do Sol.
- **Objetos com fade 0 ainda desenhados:** falso — `Galaxy.update` (`galaxy.ts:645-671`), `StarField.setFade`, `Dust.setFade`, `ObservedClouds.update`, `StarForges.update` desligam `visible` a `f ≤ 0,001`; gate do raymarch em `director.ts:468` correto.
- **Re-renders React por frame:** falso — progresso/warp vão por CSS variables via ref (`App.tsx:35-41`); `setState` só em mudanças discretas.
- **MSAA + composer / bloom em resolução cheia:** `antialias:false` e o composer de three 0.185 cria RT HalfFloat sem `samples`; `UnrealBloomPass` já trabalha em mips a partir de res/2. Só vira problema com DPR ≥ 2 (aí valeria capar o bloom a ½ resolução).
- **Smoothstep invertido / pow de base negativa:** varridos todos os GLSL — regras §7 respeitadas.
- **Conservação de fluxo** (shrink `1/px²`, subPix `px²`) consistente entre galaxy, starForges e wrappedStars (constantes diferentes, cada uma internamente contínua).
- **Ciclo de vida do loop:** sem rAF duplicado; listeners de `FreeRoam` todos removidos; abort de fetch correto; sem StrictMode; double-mount tratado via flags `disposed`.
- **Barra galáctica (29°) e base EX/EY/EZ:** rotação CPU ↔ shader consistentes; base right-handed conferida numericamente.
- **Keyframes × catálogo:** distâncias de Sirius/Bellatrix/Betelgeuse/Rigel batem com `stars_meta.json` a 0,1 pc.
- **Tela branca/NaN, bandas, estrelas quadradas, labels sobrepostos, HUD quebrado:** nenhum observado nas 5 capturas.

## Prioridade sugerida de execução

1. **P1** (gate nos núcleos do raymarch) — ~10 linhas, maior win de GPU do projeto (Atos I–II).
2. **V1** (film pass depois do OutputPass) — 1 linha, maior win perceptual; A/B em `?t=170&shot=1`.
3. **P2** (limiares do auto-quality) — sem isso, os ganhos de P1/P3 ficam invisíveis e a meta "60 fps no preset máximo" é imensurável.
4. **P3** (bake das lâminas do disco) — maior win do Ato III.
5. **B1 + B2** (warp preso; RTs do bloom) — bugs com manifestação garantida, fixes de 1–2 linhas.
6. **V2** (poeira α pelo APOGEE) — tira o aspecto "sujeira" da revelação respeitando o contrato.
7. B3/B4 (guards NaN), V3 (smoothing por dt), V5 (pausa/scrub), demais itens menores.

*Fim do relatório — Kimi.*
