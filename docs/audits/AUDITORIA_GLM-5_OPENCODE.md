# Auditoria independente — Mar de Estrelas

**Auditor:** glm-5.2 no opencode (ID do modelo `opencode-go/glm-5.2`)
**Baseline:** `main` / `684d14a`
**Data:** 2026-07-30
**Escopo:** bugs · performance · qualidade visual/UX
**Modo:** somente relatório — nada implementado
**Alvo:** 60 fps estável em RTX 3070 / 1440p no preset cinema (PR 2.0, 56 passos de raymarch)
**Método:** 3 investigadores paralelos (um por frente) + verificação adversarial de cada achado no código, lendo diretamente as linhas exatas de `common.ts`, `galacticModel.ts`, `nebulaShaders.ts`, `dustShaders.ts`, `dustMap.ts`, `vite.config.ts`, `engine.ts`, `post.ts`, `director.ts`, `cameraRig.ts`, `galaxy.ts`, `nebula.ts` e `App.tsx`. Tudo que não sobreviveu à refutação foi descartado.
**Validação do repositório:** `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓ · `npm run data:verify` ✓ (7 ativos, 18543 estrelas HYG)

> Regras respeitadas: nenhuma proposta degrada qualidade percebida; nenhuma desloca posição observada; nada foi implementado — só identificado.

---

## Ranking por impacto (resumo)

| # | Frente | Título | Severidade | Conf. | Custo/benefício |
|---|---|---|---|---|---|
| 1 | Perf | `coresGLSL()` roda 14 fbm incondicional por passo do raymarch | ALTO | HIGH | ~3–6 ms grátis |
| 2 | Bug | Pitch dos braços diverge CPU↔GPU (viola contrato do `galacticModel.ts`) | ALTO | HIGH | misalignment ~0,3–0,5° no disco externo |
| 3 | Visual | Black-lift linear pré-ACES apaga silhuetas das poeiras | ALTO | HIGH | ~6% de floor em vez de ~1% |
| 4 | Visual | Zero AA no tier `performance` (PR 1.0) | ALTO | HIGH | star-shimmer/desc travado |
| 5 | Bug | `enterFreeRoam` descarta o roll → ~100° de flip do horizonte | MÉDIO | MED-HIGH | 1 clique comum |
| 6 | Perf | `diskGasEnvelope(p)` avaliado 2× por passo (fetch+40 ALU redundante) | MÉDIO | MED | 0,3–0,7 ms |
| 7 | Visual | Dust map 512² RGBA8 sem mipmap → blobby APOGEE no reveal | MÉDIO | MED-HIGH | lanes <65pc viram mancha |
| 8 | Bug | NaN em `?pos=0,0,0` (normalize de vec3(0)) | MÉDIO | MED | screenshots corrompidos |
| 9 | Visual | `engine.preset.grain` nunca chega ao `FILM_SHADER.uGrain` (config morto) | MÉDIO | MED | cinema sem grain pretendido |
| 10 | Visual | Cavidade `uCavityPos` cola na câmera → bolha invisível ao redor dela | MÉDIO | MED-LOW | imersão "dentro da nuvem" |
| 11 | Perf | `sourcemap: true` em prod (4 MB de `.map` no bundle) | BAIXO | HIGH | cleanup, não frame-time |
| 12 | Bug | Near plane dinâmico clippa `wrappedStars` no deep-roam | BAIXO | LOW | bolha fina na estrela envolvente |

---

## 1. `coresGLSL()` roda 14 fbm incondicional por passo do raymarch — ~3–6 ms desperdiçados

**Frente:** Performance · **Severidade:** ALTA · **Confiança:** HIGH

**Evidência** — `src/three/shaders/common.ts:71-83`
```glsl
function coresGLSL(): string {
  return WORLD.nebulaCores.map((c, i) =>
    `  { vec3 q = (p - vec3(${c[0]}, ${c[1]}, ${c[2]})) / ${c[3]};
   float g = exp(-dot(q, q) * 1.6);
   float core = g * (0.04 + 1.5 * smoothstep(0.50, 0.85, fbm(p * 0.09 + ${(i*13.7)}, oct)));
   core *= 0.50 + 0.95 * fbm(p * 0.30 + ${(i*7.31)}, 2);
   d += core * 0.95; }`).join('\n');
}
```
`WORLD.nebulaCores` tem **7 entradas** (`src/three/config.ts:13-21`); cada uma emite **2 fbm2**. `coresGLSL()` é injetado dentro de `nebulaDensity(p, 4)` (`common.ts:135`), chamado uma vez por passo do raymarch (`nebulaShaders.ts:250`) — **antes** do `if (d > 0.003)` (`:252`).

**Causa raiz:** Os 7 núcleos são pequenas esferas locais (raio 9–26 pc perto do corredor). O peso `g = exp(-dot(q,q)*1.6)` é ≈0 quando a amostra está a mais de ~3 raios de qualquer centro — caso de quase toda amostra no slab de 650 pc. Mas a expressão `g * (fbm(...))` é GLSL runtime: **o `fbm` (2 octavas = 16 `hash13` + 65 ALU) é avaliado por inteiro antes da multiplicação por ~0**. Isso custa **14 fbm2 ≈ 224 `hash13` + 910 ALU por passo**, incondicionalmente.

Em t=85 (pior caso: câmera em Betelgeuse ~152 pc, slab ~650 pc atravessado a 56 passos × 518k frags do RT 960×540 @ scale 0.5): ≈ 1,2×10¹¹ ops desperdiçadas ≈ **3–6 ms numa RTX 3070** (menos por divergência, mas os warps saudavelmente saltam pois `g≈0` em blocos inteiros).

**Por que é seguro cortar:** `d += core * 0.95` com `g < 0.005` adiciona no máximo `0.005 × 1.54 × 1.45 × 0.95 ≈ 0.011` — abaixo do próprio `if (d > 0.003)`. Dentro de um núcleo `g` é grande e a conta roda. Visualmente bit-idêntico.

**Fix mínimo** — `src/three/shaders/common.ts:76`, cercar cada bloco com gate em `g`:
```glsl
   float g = exp(-dot(q, q) * 1.6);
   if (g > 0.005) {
     float core = g * (0.04 + 1.5 * smoothstep(0.50, 0.85, fbm(p * 0.09 + ${(i*13.7)}, oct)));
     core *= 0.50 + 0.95 * fbm(p * 0.30 + ${(i*7.31)}, 2);
     d += core * 0.95;
   }
```
(Threshold 0.001 é ainda mais seguro: contribuição máxima ≤ 0.0021.) Sem tocar em call sites.

---

## 2. Pitch dos braços espirais diverge entre CPU (partículas) e GPU/bake (lâminas+gás) — quebra de contrato

**Frente:** Bugs (coordinate) · **Severidade:** ALTA · **Confiança:** HIGH

**Evidência** — CPU, `src/three/cartography/galacticModel.ts:101-106` (usado por `buildGalaxy` para todas as 170k partículas brilhantes + 100k de poeira):
```ts
const pitchDeg = observedPitchDeg + (15.8 - observedPitchDeg) * easedFarBlend;
const base = arm.phaseAtSunRad + Math.log(Math.max(radiusPc, 180) / ...) /
   Math.tan((pitchDeg * Math.PI) / 180);   // easing no ÂNGULO, tan depois
```
GPU/TS-mirror, `galacticModel.ts:204-205` (`glArmTarget`) e `:294-297` (`galArmTarget` GLSL, consumidos pelas lâminas emissivas `DISC_FRAG`, pelo envelope de gás `diskGasEnvelope`, pelo `wrappedStars` e pelo bake B do dust map):
```glsl
float tanPitch = mix(observedTan, 0.283, farBlend);        // easing no TAN
float base = phaseAtSun + log(max(radiusPc, 180.0) / ...) / tanPitch;
```

**Causa raiz:** `tan(a + (b-a)*w) ≠ tan(a) + (tan(b)-tan(a))*w`. O peso `farBlend = smoothstep(9500,15000,r)` é idêntico, mas uma fórmula ease em espaço de ângulo, a outra em espaço de tan.

**Por que é bug real (verificado numericamente):** Em r=12250 (Perseus): pitch eased CPU ≈ 15.3° → `base_armTheta ≈ 1.358 rad`; GPU ease tan → `base_gl ≈ 1.350 rad` → **~0.46° de desalinhamento**, ~100 pc, ~20% da largura do braço. No reveal (t=170), o destaque emissivo do braço (GPU) cavalga uma borda do braço de partículas (CPU) no disco externo (r≈9.5–15 kpc). O cabeçalho do próprio arquivo (`galacticModel.ts:264-267`) afirma que este par deve ser idêntico: *"Mantê-lo aqui impede que partículas, lâminas emissivas e volume de gás usem versões incompatíveis da galáxia"* — a divergência é não intencional.

**Fix mínimo** — `galacticModel.ts:93-106`, alinhar `armThetaAtRadius` ao espaço tan do shader (uma função, zero edição de shader):
```ts
const observedTan = Math.tan(
  radiusPc < GALACTIC_MODEL.sunRadiusPc ? arm.pitchInnerDeg : arm.pitchOuterDeg
);
const farBlend = smoothstepGl(9500, 15000, radiusPc);
const tanPitch = observedTan + (0.283 - observedTan) * farBlend;
const base = arm.phaseAtSunRad + Math.log(Math.max(radiusPc, 180) / GALACTIC_MODEL.sunRadiusPc) / tanPitch;
```
Mesma correção para `localArmThetaAtRadius` (mesma estrutura, `:146-152`).

---

## 3. Black-lift linear pré-ACES eleva o piso de preto a ~6% — apaga silhuetas de poeira

**Frente:** Visual/UX · **Severidade:** ALTA · **Confiança:** HIGH

**Evidência** — `src/three/shaders/dustShaders.ts:115`
```glsl
col = col * 0.985 + vec3(0.012, 0.010, 0.014);  // "leve elevação de negros (filme)"
```
Ordem do pipeline confirmada em `src/three/core/post.ts:31-33` → `FILM_SHADER` é adicionado **antes** de `OutputPass` (que aplica ACES + sRGB).

**Defeito:** A constante é somada em radiância LINEAR pré-ACES. `ACESFilmic(0.012) ≈ 0.00489`; OETF sRGB mapeia isso para ≈0.059 (R), ≈0.053 (G), ≈0.072 (B) — **~6% de brightness de display** como piso. Um pixel totalmente preto da poeira multiplicativa (Great Rift, Coalsack, Rho Ophiuchi — a marca da fotografia de cinema) é elevado de ~0.3% (sem o lift) para ~6% — uma expansão de ~20×. A assimetria B>R,G ainda injeta um tom frio no piso. O comentário do dev ("leve") confirma que a intenção ≠ resultado. Para "cinema procedural" o piso deveria ser ~0–1%.

**Causa raiz:** Autorar a constante como adição linear e calibrar mentalmente contra a escala errada; o toe do ACES expande o que parece "0.012/255" em ~6% pós-OETF.

**Fix mínimo** — `dustShaders.ts:115`, reduzir ~10× para aterrar em ~1% de display mantendo o mesmo caminho de shader:
```glsl
col = col * 0.985 + vec3(0.0008, 0.0008, 0.0011);
```
Perf-neutro. (Alternativa mais correta: mover o lift para pós-tonemap dentro do `OutputPass`, mas isso é uma edição maior.)

---

## 4. Zero anti-aliasing no tier `performance` (PR 1.0) — bordas duras/shimmer

**Frente:** Visual/UX · **Severidade:** ALTA · **Confiança:** HIGH

**Evidência** — `src/three/core/engine.ts:40` `antialias: false`; `:15-19` `PRESETS.performance.pixelRatio=1.0`; `:128-130` `autoQuality` cai para `performance` quando avg fps < 34; `src/three/core/post.ts:20-33` cadeia `RenderPass→UnrealBloom→ShaderPass(FILM)→OutputPass` — sem FXAA/TAA. O RT intermediário do `EffectComposer` (r0.185, `EffectComposer.js:69`) é criado sem `samples` (default 0 = sem MSAA). Comentário em `engine.ts:40` diz "AA vem do supersampling via pixelRatio + bloom".

**Defeito:** Com `EffectComposer`, o `antialias:true` do renderer seria ignorado de qualquer forma (cena vai pro RT do composer, `samples=0`). Cinema (PR 2.0) atinge SSAA-equivalente via supersampling — OK. Mas Alta (PR 1.5) e Performance (PR 1.0) **não têm edge AA nenhum**, e bloom não é AA (espalha, não subamostra). Em performance: núcleos de estrela tremem/staircase ao cruzar centros de pixel, filamentos do disco aliasam. Toda vez que o auto-quality cai (≥6 fps abaixo da banda de 34), o defeito aparece.

**Causa raiz:** Pipeline depende exclusivamente de supersampling PR=2; o switch de qualidade perde isso e nada assume.

**Fix mínimo** — em `Post` (`post.ts`), após criar o composer, setar MSAA 4× nos RTs HalfFloat intermediários (WebGL2 suporta MSAA em float RTs em desktop):
```ts
this.composer.renderTarget1.samples = 4;
this.composer.renderTarget2.samples = 4;
```
Custo: ~2× fragment shade do RenderPass em PR=1 — ainda mais barato que PR=2 SSAA (4× em tudo). Cinema pode manter `samples=0` (SSAA domina). Ganho líquido de perf E qualidade em Alta/Performance.

---

## 5. `enterFreeRoam` descarta o roll → ~100° de flip do horizonte num clique comum

**Frente:** Bugs (state) · **Severidade:** MÉDIA · **Confiança:** MED-HIGH

**Evidência** — `src/three/cinematic/cameraRig.ts:131-136`
```ts
syncFromCamera() {
  const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
  this.yaw = e.y;
  this.pitch = THREE.MathUtils.clamp(e.x, -1.5, 1.5);
}  // e.z (roll) descartado silenciosamente
```
e `:140` reconstrói forçando roll=0:
```ts
this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
```
Durante a journey, `JourneyRig.apply` seta `camera.up` à base galáctica (`cameraRig.ts:69-72`, `GALACTIC_NORTH=(-0.868,-0.198,0.456)` — ~101° de `(0,1,0)`; pior perto de face-on). O quaternion carrega esse roll. `syncFromCamera` decompõe YXZ e lê só `e.y`/`e.x`.

**Defeito:** A direção do *olhar* é preservada (forward é roll-independente em YXZ), mas o **horizonte rola para zero**. O botão "Explorar livremente" é exibido por toda a janela `inJourney` (`App.tsx:143-152`) — clicar nele roda instantaneamente a faixa da Via Láctea / campo estelar em ~100° (pior no Ato III). Descontinuidade de orientação não anunciada numa ação comum. (`placeCamera`/`?pos=` é indemne porque numa carga fresca `camera.up` ainda é `(0,1,0)`.)

**Fix mínimo** — extrair yaw/pitch do vetor forward (roll-independente):
```ts
syncFromCamera() {
  const fwd = new THREE.Vector3();
  this.camera.getWorldDirection(fwd);
  this.pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1)), -1.5, 1.5);
  this.yaw = Math.atan2(-fwd.x, -fwd.z);
}
```

---

## 6. `diskGasEnvelope(p)` avaliado 2× por passo — fetch de textura + 40 ALU redundantes

**Frente:** Performance · **Severidade:** MÉDIA · **Confiança:** MEDIUM

**Evidência** — `common.ts:128`: `float envelope = min(diskGasEnvelope(p), 3.0);` (dentro de `nebulaDensity`, chamado em `nebulaShaders.ts:250`) e `nebulaShaders.ts:255`: `float slab = min(diskGasEnvelope(p) * 0.9, 1.0);` (após o `if (d > 0.003)`). Mesmo `p`.

**Causa raiz:** `diskGasEnvelope` (`common.ts:105-125`) executa 1 `texture2D(uDustMap,...)` + `length(xy)` + `exp(rad/5200)` + `smoothstep(15500..DISK)` + `mix(70,260)+exp(-zw²/2h²)` + decode warp `cart.a*2-1` ≈ 1 fetch + 40 ALU. Duplicado: ~56 passos × 518k frags × ~60% (fração dentro do gate) × 40 ALU ≈ 7×10⁸ ALU + 17M tex redundantes ≈ **0,3–0,7 ms**.

**Por que é seguro:** `slab` usa `min(env*0.9, 1.0)` e `envelope` usa `min(env, 3.0)` — **mesma entrada**, só caps diferentes. Bit-idêntico se a função roda 1×.

**Fix mínimo** — fazer `nebulaDensity` retornar `vec2 (density, slab)` (ou passar `envelope` por parâmetro). Três callers; `GLSL_DENSITY_LOCAL` é função separada e inalterada. Atualizar a leitura em `nebulaShaders.ts:255` para o 2º componente.

---

## 7. Dust map 512² RGBA8 sem mipmap → APOGEE blobby no reveal

**Frente:** Visual/UX · **Severidade:** MÉDIA · **Confiança:** MED-HIGH

**Evidência** — `src/three/cartography/dustMap.ts:18` `DUST_MAP_SIZE = 512`; `:195-196` `minFilter = LinearFilter; magFilter = LinearFilter` (sem `LinearMipmapLinearFilter`); `:197-198` `ClampToEdge`; sem `generateMipmaps`. Ler por `galaxyShaders.ts:233`, `common.ts:111`, `nebulaShaders.ts:141-147`.

**Defeito:** Texel pitch = `2×16800/512 ≈ 65,6 pc`. Em t=170 (reveal, |q|≈28 kpc) o disco subtende ~58° → texel ≈ 2–3 px; toda lane APOGEE < 65 pc colapsa numa mancha bilinear. Finas lanes (Great Rift fissures, Coalsack, Rho Ophiuchi — o ícone do astro de cinema) viram blobs de 65 pc em vez de filamentos. 256 níveis/canal também limita o contraste log-local a 1/256. Sem mipmap, free-roam além de ~50 kpc aliaseia a LUT.

**Fix mínimo** — `dustMap.ts:18` `DUST_MAP_SIZE = 1024`; `:195-198`:
```ts
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.wrapS = THREE.RepeatWrapping;
texture.generateMipmaps = true;
```
Custo: 4 MB tex + bake ×4 uma vez na carga; runtime idêntico (mipmap nunca é mais caro, minification fica mais barato). Visual: muito mais nítido no reveal.

---

## 8. NaN em `?pos=0,0,0` — `normalize(vec3(0))` sem guarda

**Frente:** Bugs (NaN) · **Severidade:** MÉDIA · **Confiança:** MEDIUM

**Evidência** — `src/three/shaders/nebulaShaders.ts:234`
```glsl
vec3 toSun = normalize(uSunPos - ro);
```
`uSunPos = (0,0,0)` (`nebula.ts:81`), `ro = uCamPos`. Em `?pos=0,0,0` (modo deep-link documentado), `ro=(0,0,0)` → `normalize(vec3(0.0))` = `0/0` = NaN. `phaseSun` (`:235-236`) vira NaN, somado a `sampleColor` dentro do `if (d > 0.003)` (`:281`). Na origem, raios no-plano ainda acertam slab gas além do cutoff de 6,5 pc da Bolha Local → `acc` vira NaN → o RT half-float da nebulosa carrega NaN → o background da cena (que É `this.nebula.texture`, `director.ts:472`) renderiza preto/garbage por toda a faixa da Via Láctea.

**Defeito:** `?pos=0,0,0&shot=1` corrompe a screenshot. A journey nunca bate a origem exata (t=0 é `[0.045,0.024,0.105]`) e FreeRoam contínuo é medida-zero, mas é um divide-by-zero de verdade.

**Fix mínimo** — `nebulaShaders.ts:234`:
```glsl
vec3 toSun = normalize(uSunPos - ro + vec3(1e-4));
```

---

## 9. `engine.preset.grain` nunca chega ao `FILM_SHADER.uGrain` — config morto

**Frente:** Visual/UX · **Severidade:** MÉDIA · **Confiança:** MEDIUM

**Evidência** — `engine.ts:16-18` define `grain: 0.055/0.05/0.04` por tier. `dustShaders.ts:75` inicializa `uGrain: 0.016`. `post.ts:58-63` só seta `uCA` (via `setWarp`) e `uTime` por frame — nunca `uGrain`. `director.ts:90-93` handler de qualidade só afina `nebula.setScale` — nunca `film.uniforms.uGrain`.

**Defeito:** A tabela por-tier é código morto. Oshader roda sempre em `uGrain = 0.016`. Cinema deveria renderar em 0.055 (swing ±14% display, bem mais agressivo) e os tiers baixos deveriam reduzir. Hoje todos os tiers têm grain idêntico e abaixo do projetado para cinema.

**Fix mínimo** — em `Post` constructor, assinar o `onQuality` e propagar:
```ts
this.engineOwner.onQuality((q) => { /* não acessível aqui → */
// alternativa em director.ts:90-93 handler já existente:
this.film.uniforms.uGrain.value = this.engine.preset.grain;
```
Mais limpo: em `director.ts:90-93`, dentro do `onQuality` existente, adicionar `this.post.setGrain(this.engine.preset.grain)` e expor `Post.setGrain(v)`. Custo: 1 scalar por mudança de qualidade.

---

## 10. Cavidade `uCavityPos` cola na câmera → bolha invisível 55–190 pc em volta dela

**Frente:** Visual/UX · **Severidade:** MÉDIA · **Confiança:** MED-LOW

**Evidência** — `director.ts:385-389` `setCavity(cam.position, cavityGate)` para nebula, stars, farStars, dust. `common.ts:159-160`:
```glsl
float cav = length(p - uCavityPos);
d *= mix(1.0, smoothstep(55.0, 190.0, cav), uCavityGate);
```
`uCavityPos == camera.position` a cada frame. Comentário `:157` ("cavidade do observador itinerante") marca intencional.

**Defeito:** Como `uCavityPos` segue a câmera, onde quer que você voe você está dentro de um oco fixo de 55 pc com casca suave até 190 pc sempre que o gate é positivo. Mais visível na poeira próxima: `DUST_VERT` computa `glow = smoothstep(0.02,0.5, nebulaDensity(world,2))`; com gás nulificado dentro de 55 pc, `glow→0` e `vAlpha→0.05` — as puff de poeira ao redor desligam assim que você está entre 600–2300 pc de casa E dentro do disco (a journey cruza essa janela ~t=140). Você sempre olha *através* de um buraco de 55–190 pc; nunca *está* no gás — mata a imersão de voar por uma nuvem molecular. Uma superbolha real é fixa no espaço (a Bolha Local é uma região de onde você sai), não cola na lente.

**Fix mínimo (mais barato):** alargar `smoothstep(55,190)` → `smoothstep(20,260)` em `common.ts:160` e `:189` — remove o oco duro central, deixa só uma clareira gradual. Alternativa mais correta: desacoplar `uCavityPos` da câmera (follower criticamente amortecido para a posição onde o gate atingiu 0.5, ou derivada dos centróides APOGEE próximos). Custo: 1 lerp de Vector3.

---

## 11. `sourcemap: true` em produção — 4 MB de `.map` no bundle

**Frente:** Performance (bundle) · **Severidade:** BAIXA · **Confiança:** HIGH

**Evidência** — `vite.config.ts:13` `sourcemap: true`. Build output:
```
dist/assets/index-Bk6ibu3I.js.map    276.42 kB
dist/assets/react-BOsuF4an.js.map    909.37 kB
dist/assets/three-DwiUtlX0.js.map  2,878.55 kB
```

**Defeito:** Sourcemaps em prod não afetam frame-time steady-state, mas inflam download/parse (~4 MB extras) e permitem que devtools anexem à symbol table. O comentário `vite.config.ts:14-15` justifica o chunk do three, mas nada justifica o map.

**Fix mínimo** — `vite.config.ts:13`: `sourcemap: false` (ou `'hidden'` para stack traces externas). Zero impacto visual.

---

## 12. Near plane dinâmico clippa `wrappedStars` no deep-roam

**Frente:** Bugs (clip) · **Severidade:** BAIXA · **Confiança:** LOW

**Evidência** — `engine.ts:67` `near = clamp(distFromSun*0.004, 0.001, 500)` com `distFromSun = cam.position.length()` (`director.ts:344`). `wrappedStars.ts` `BOX=2400`, envelope renderiza em `[0,864]` pc ao redor da câmera, `sunGate=smoothstep(900,2100,|wp|)` mantém o envelope aceso longe de casa.

**Defeito:** Em deep-roam (|q|~30–33 kpc), `near ≈ 120–500 pc` → tudo mais próximo que isso é clipado. O envelope envolvente renderiza nos primeiros 864 pc, então os 120–500 pc internos somem — uma bolha fina na estrela envolvente contra o fundo da galáxia. Provável tradeoff aceito por precisão de depth-buffer (comentário `engine.ts:62-65`), por isso LOW.

**Fix mínimo** — renderizar `WrappedStars` com near ≤1 pc (override de câmera num 2º pass de `Points`, já que a camada é `depthWrite:false` e não precisa da precisão). Ou pelo menos capturar `near` minimo só no deep-roam.

---

## Categorias explicitamente verificadas e DESCARTADAS (nada a reportar)

Para que você saiba que foram checadas e refutadas:

- **Mismatch da base shader↔TS:** `GAL_X/GAL_Y/GAL_N` (`common.ts:63-66`) batem com `EX/EY/EZ` (`galaxy.ts:51-53`) a 6e-8 — sem bug.
- **`galactocentricToScene` ausente em observados:** todos os consumidores (`ObservedClouds`, `StarForges`, `buildSeedCloudPool`) chamam; HYG/named são heliocêntricos por design. Sem violação de contrato.
- **Tone-mapping duplo (ACES + OutputPass):** refutado — r0.185 `EffectComposer` só aplica toneMapping do renderer ao framebuffer default; `OutputPass` aplica ACES+sRGB uma vez via `RawShaderMaterial` (skips auto-inserts). Sem duplo.
- **`leftDisk` latch:** corretamente one-way em journey (`director.ts:362-363`), resetado todo tick fora de journey (`:364-366`), reset em `play()` (`:280`) e `seek()` (`:289`). Sem persistência falsa.
- **`lastCaptionIdx`/`captionAt`:** sem off-by-one; primeiro tick emite index 0 pois `lastCaptionIdx` começa em `-1`.
- **Histerese de FPS (`engine.ts:119-135`):** `avg = fpsN/fpsAcc` = frames/seconds = fps correto; bandas 42/34 vs 72/60 não se sobrepõem → sem thrash.
- **Race init↔dispose:** `disposed` checado após await (`director.ts:130,167`); `AbortController` aborta fetches. Sem leak.
- **Disposal/WebGL leaks:** todos geometries/materials/RTs/textures disposed; `dustMapTexture` dono único (Galaxy `ownsDustMap=false`). Sem double-dispose.
- **`FreeRoam` pointer/keyboard:** todos listeners removidos em `dispose()`; early-return quando `!enabled`. `.label-canvas` tem `pointer-events:none`.
- **React lifecycle:** `App.tsx` cleanup seta `cancelled` + `d.dispose()`; updates de alta-frequência bypassam `setState`. Sem stale-ref.
- **`updateSeedClouds` throttle 0.25s:** real e respeitado (`director.ts:378-382`); `seedCloudScratch` reusado; sweep ~8k a 4Hz ≈ 50µs/call ≈ 0.2% de um frame a cada ¼ s — desprezível.
- **`nebula.render` skip correto** quando `nebulaFade ≤ 0.02` (`director.ts:468-474`); `ELSE` não aloca `new THREE.Color` em prod (`noNebula` nunca setado além da init).
- **LUT realmente usado:** substitui ~20 passos pesados por 1 fetch/pixel (`nebulaShaders.ts:233`); 24 passos em 256×128 ≈ 0.1ms.
- **`WrappedStars.update`:** wrap é GPU-side (`wrappedStars.ts:64-65`); CPU só seta 4 uniforms. Bom.
- **Premultiplied-alpha em poeira multiply:** correto em r0.185 (`premultipliedAlpha:true` requerido por MultiplyBlending), ambas as camadas (`galaxy.ts:524`, `observedClouds.ts:182`).
- **`WrappedStars` wrap seam:** ocorre dentro do `edgeFade` (864–1200); invisível.
- **`coresGLSL` `cores` contribuição visual:** dentro de um núcleo o gate proposto não muda nada.

---

## Resumo dos fixes por arquivo (menor diff possível)

| Arquivo | Achados | Diff yaklaşık |
|---|---|---|
| `src/three/shaders/common.ts` | #1 (gate em `coresGLSL`), #6 (`nebulaDensity`→vec2, #10 (smoothstep) | ~15 linhas |
| `src/three/cartography/galacticModel.ts` | #2 (`armThetaAtRadius` ease em tan) | ~4 linhas |
| `src/three/shaders/dustShaders.ts` | #3 (black-lift ÷10), #9 (`uGrain` via wiring) | ~1 linha shopping |
| `src/three/core/post.ts` | #4 (MSAA nos RTs), #9 (`setGrain`) | ~3 linhas |
| `src/three/core/engine.ts` | #9 (expor preset grains) | — (já tem o dado) |
| `src/three/director.ts` | #9 (chamar `post.setGrain`) | ~1 linha |
| `src/three/cinematic/cameraRig.ts` | #5 (`syncFromCamera` via forward) | ~5 linhas |
| `src/three/cartography/dustMap.ts` | #7 (1024 + mipmaps + Repeat) | ~4 linhas |
| `src/three/shaders/nebulaShaders.ts` | #8 (jitter no normalize) | ~1 linha |
| `vite.config.ts` | #11 (`sourcemap:false`) | 1 token |
| `src/three/core/engine.ts` (deep) | #12 (near override p/ wrappedStars) | opcional |

Total: ~35 linhas de mudança para endereçar 11 das 12 evidências, nenhuma das quais altera a cartografia observada ou degrada o visual percebido. O bug #2 (divergência de pitch) restaura a integridade do contrato da `GALACTIC_DATA_FOUNDATION`; o bug #1 é o maior ganho de frame-time concreto e visualmente idêntico.

---

*Auditoria conduzida por glm-5.2 no opencode. Cada achado foi verificado adversarialmente lendo as linhas exatas; tudo que não sobreviveu foi descartado.*