# Mar de Estrelas — Simulação 3D do Catálogo HYG + Via Láctea

Viagem cinematográfica em WebGL2/Three.js: do Sol (ao lado da câmera) através de
gás e poeira volumétricos, passando pelas estrelas reais do catálogo HYG e pelas
supergigantes de Órion, até revelar a **Via Láctea inteira como modelo 3D**
(4 braços espirais, bojo, barra central, nós de HII, faixas de poeira) — não é skybox.

100% frontend: **sem backend, sem variáveis de ambiente, sem serviços externos.**

---

## 1. Requisitos

| Ferramenta | Versão |
|---|---|
| Node.js | **≥ 20.19** (ou ≥ 22.12) — exigido pelo Vite 7 |
| npm | ≥ 10 (vem com o Node 20) |
| Navegador | moderno com **WebGL2**; desktop com GPU dedicada é a experiência recomendada |

Nada mais é necessário. Não há Python, CUDA, Docker nem chaves de API.

## 2. Instalação (passo a passo para outra AI)

```bash
cd <pasta-do-projeto>     # a pasta que contém package.json
npm ci                    # instala EXATAMENTE as versões do package-lock.json (recomendado)
```

Se `npm ci` falhar por ausência do lockfile, use `npm install` (resolve pelas
faixas `^` do package.json). Não instale pacotes extras: tudo que o projeto usa
já está declarado. Em produção, o app usa apenas Three.js, React e React DOM.

## 3. Rodar

```bash
npm run dev       # servidor de desenvolvimento Vite → http://localhost:5173
npm run build     # checagem de tipos (tsc -b) + build de produção em dist/
npm run preview   # serve o build de produção → http://localhost:4173
```

Para servir o `dist/` com qualquer servidor estático (ex.: `python3 -m http.server`),
funciona sem configuração extra — os caminhos são relativos.

## 4. Dados obrigatórios (já inclusos no repositório)

| Arquivo | Conteúdo |
|---|---|
| `public/data/stars.bin` | 18.543 estrelas do catálogo HYG com distância utilizável, em Float32 little-endian, stride 6: `x, y, z` (parsecs, coordenadas equatoriais heliocêntricas), `magnitude aparente`, `índice de cor B−V`, `log10(luminosidade)` |
| `public/data/stars_meta.json` | metadados das ~90 estrelas nomeadas (hero stars) |
| `public/data/galaxy/manifest.json` | contrato, proveniência, incertezas, schemas e hashes dos ativos cartográficos galácticos |
| `public/data/galaxy/*.bin` | poeira APOGEE, nuvens moleculares CO, H II WISE, masers BeSSeL e traçadores jovens Gaia DR3 |

São carregados por `fetch` na inicialização. `stars.bin` é obrigatório e sua
ausência abre a tela de erro. Falhas nos ativos galácticos emitem um aviso e
mantêm a cena com o preenchimento procedural.

## 5. Arquitetura (mapa para navegar o código)

```
src/
├─ App.tsx                  React root: fases (loading → intro → journey → end), HUD, deep-links
├─ components/Hud.tsx       HUD: títulos, legendas, botões e progresso
├─ components/LabelCanvas.ts labels em um único Canvas 2D, com colisão e culling
├─ three/
│  ├─ director.ts           ORQUESTRADOR: instancia mundos, crossfades por distância, loop principal
│  ├─ cartography/
│  │  ├─ galacticModel.ts   contrato único: braços, Local, barra, warp, flare e constantes GLSL
│  │  ├─ galacticAssets.ts  carrega e valida o manifesto e os binários observacionais
│  │  └─ dustMap.ts         bake da poeira APOGEE e da cobertura observacional
│  ├─ core/
│  │  ├─ engine.ts          renderer WebGL2, câmera, clip planes dinâmicos (updateClip)
│  │  └─ post.ts            compositor: bloom, output e acabamento em display space
│  ├─ world/
│  │  ├─ sun.ts             o Sol (perto da câmera no início)
│  │  ├─ stars.ts           catálogo HYG (point sprites com conservação de fluxo)
│  │  ├─ heroStars.ts       estrelas nomeadas com billboards difractados
│  │  ├─ nebula.ts          gás local + integração volumétrica do disco galáctico
│  │  ├─ dust.ts            poeira local
│  │  ├─ galaxy.ts          A VIA LÁCTEA: ~380k partículas (disco, barra/bojo, HII, halo, poeira, Sgr dSph)
│  │  ├─ observedClouds.ts   nuvens moleculares observadas
│  │  ├─ starForges.ts       H II, masers, aglomerados e Cefeidas observados
│  │  ├─ wrappedStars.ts     campo estelar inferido e relocável dentro do disco
│  │  └─ labels.ts          rótulos projetados (vira “SOL” quando dHome > 2000 pc)
│  ├─ cinematic/
│  │  ├─ journey.ts         keyframes da viagem (atos I–III, JOURNEY_DURATION = 194s)
│  │  └─ cameraRig.ts       interpolação de câmera + free-roam
│  └─ shaders/              GLSL puro, um arquivo por família (starShaders, galaxyShaders, …)
└─ hud.css                  estilos do HUD (tipografia cinematográfica)
```

Geometria galáctica (`cartography/galacticModel.ts`): direção ICRS
Sol→Sgr A* = `(-0.0548755604, -0.8734370902, -0.4838350155)`, Sol a 8.150 pc
do centro e 5,5 pc acima do plano médio. O Sol está no braço Local/Órion,
entre Sagittarius-Carina e Perseus — o braço Local é um segmento próprio,
não uma das quatro famílias principais.

### Contrato cartográfico e limites de honestidade

| Camada | Parâmetros usados |
|---|---|
| braços | quatro famílias, pitches locais 7–20°, fases ajustadas em 146 masers BeSSeL, kinks, largura `w(R)=336+36(R[kpc]−8,15)` pc e alcance radial por segmento |
| lado distante | continuação procedural mais aberta e menos contrastada; não é apresentada como medição direta da Gaia |
| disco | raio de 16,8 kpc, escala exponencial 2,6 kpc, flare externo e warp senoidal de até ~820 pc |
| barra/bojo | barra de 5 kpc inclinada 29°, componente box/peanut e bojo central |
| vizinhança solar | braço Local explícito; Sol a `R0=8,15 kpc`, `z=+5,5 pc` |
| satélite | galáxia anã de Sagitário em `l=5,6°`, `b=−14,2°`, `d≈26 kpc` |

As imagens Gaia/ESA de 2025 são **impressões artísticas baseadas nos dados**,
não fotografias externas nem uma nuvem de pontos completa da galáxia. Por isso
o modelo combina restrições observacionais no nosso lado com síntese procedural
no lado oculto, mantendo os braços distantes deliberadamente mais suaves.

Os ativos de `public/data/galaxy/` já alimentam a textura de poeira, as nuvens
moleculares e os traçadores jovens. Posições observadas não são deslocadas; o
preenchimento inferido cede conforme a cobertura dos catálogos. O contrato dos
dados está em [`docs/GALACTIC_DATA_FOUNDATION.md`](docs/GALACTIC_DATA_FOUNDATION.md)
e sua implementação em
[`docs/RENDERER_CARTOGRAPHY.md`](docs/RENDERER_CARTOGRAPHY.md).

Fontes primárias usadas no contrato:

- [Gaia/ESA — Milky Way map, 2025](https://www.cosmos.esa.int/web/gaia/milky-way)
- [Reid et al. — paralaxes de masers e estrutura de quatro braços](https://arxiv.org/abs/1910.03357)
- [Gaia DR3 — mapa assimétrico e braço Local](https://www.cosmos.esa.int/web/gaia/dr3-where-are-the-stars)
- [Wegg et al. — comprimento e inclinação da barra](https://arxiv.org/abs/1504.01401)
- [Lallement et al. — mapa 3D contínuo da poeira local](https://arxiv.org/abs/1808.00015)
- [ESA/XMM-Newton + Chandra — braços externos até 10% mais distantes, 2026](https://www.esa.int/Science_Exploration/Space_Science/XMM-Newton/XMM-Newton_helps_revise_distance_to_outer_spiral_arms)

### Regerar e verificar a fundação cartográfica

```bash
npm run data:galaxy          # usa cache local; -- --refresh força nova consulta
npm run data:fit             # reajusta as fases dos braços às âncoras BeSSeL
npm run data:sanitize-stars  # idempotente; exclui sentinelas HYG a 100 kpc
npm run data:verify          # confere binários, hashes e o residual dos braços
npm run data:all             # executa saneamento, ativos, fit e verificação
```

As respostas TSV ficam em `.cache/galaxy-data/` e não são versionadas. Os
binários compactos e o manifesto são versionados; o aplicativo continua 100%
offline em runtime.

### Crossfades por distância ao Sol (`dHome`, em parsecs)

| Sistema | aparece/some |
|---|---|
| estrelas do catálogo (`localFade`) | some 1.100 → 2.300 |
| nebulosa volumétrica (`nebulaFade`) | some 1.300 → 2.700 |
| faixa interna da Via Láctea (`localBandFade`) | partículas 3D; some 650 → 1.900 |
| Via Láctea (`galaxyFade`) | aparece 1.000 → 2.600 |
| marcador do Sol (`markerFade`) | aparece 1.700 → 3.300 |

## 6. Parâmetros de URL (debug e deep-link — ferramenta essencial)

| Param | Efeito |
|---|---|
| `?t=150` | pula a intro, congela e mostra o segundo `t` da viagem |
| `?play=1` | pula a intro e inicia a viagem automaticamente |
| `&freeze=1` | congela o relógio (screenshots reproduzíveis) |
| `&q=performance` | qualidade reduzida (mobile); `alta`, `cinema` também valem |
| `&nobloom=1` | desliga o bloom (primeiro teste quando a tela fica branca) |
| `&nogal=1` `&nosun=1` `&nohero=1` `&nocat=1` `&nodust=1` `&nonebula=1` `&nomarker=1` | esconde cada sistema isoladamente |
| `&nogdust=1` `&noglow=1` | esconde poeira / brilho-do-bojo **da galáxia** |
| `&dbgfade=1` | loga fades e distâncias no console |

Exemplo de QA headless (Chromium):

```bash
chromium --headless=new --no-sandbox --use-angle=swiftshader-webgl \
  --window-size=1280,720 --screenshot=frame.png --virtual-time-budget=8000 \
  "http://localhost:5173/?t=176"
```

## 7. REGRAS CRÍTICAS DE GLSL — leia antes de tocar em qualquer shader

Estas três regras custaram dias de depuração; violá-las quebra a cena inteira:

1. **`pow(x, y)` com `x` negativo é NaN** (comportamento indefinido na GLSL).
   Para “elevar ao quadrado”, **sempre** multiplique: `float d = v; d*d`.
   (Bug real: anel do marcador do Sol usava `pow((r-0.55)*9.0, 2.0)` → tela branca.)
2. **`smoothstep(e0, e1, x)` com `e0 > e1` é indefinido** — pode virar NaN.
   Para inverter, use `1.0 - smoothstep(min, max, x)`.
3. **Um único pixel NaN + `UnrealBloomPass` = tela 100% branca**, porque o blur
   das mips espalha o NaN. Diagnóstico: `?nobloom=1` — se a cena aparece normal
   sem bloom, há NaN/Inf em algum shader. Isole com os parâmetros `&no*=1` acima.

Outras invariantes do projeto:

- **Conservação de fluxo** nos point sprites: acima de 3 px, o pico cai com
  `1/px²` (`shrink = min(1, 9/px²)`); abaixo de 0,7 px, `subPix = px²/0.49`.
  Não remova — sem isso a galáxia vira sopa branca de longe.
- **Clip planes dinâmicos**: `near = clamp(dist×0.004, 0.001, 500)`,
  `far = clamp(dist×12, 9000, 400000)` (`engine.updateClip`). A viagem cobre
  0,01 pc → 25.000 pc; clip fixo causa z-fighting ou corte.
- RNG da galáxia é **determinístico** (`mulberry32(20260730)`) — não troque por
  `Math.random()`, ou cada reload gera uma galáxia diferente.

## 8. Solução de problemas

| Sintoma | Causa provável | Ação |
|---|---|---|
| tela “A viagem não pôde começar” | `stars.bin` não carregou ou exceção no `init()` | console do navegador; conferir `public/data/` |
| tela toda branca no Ato III | NaN em shader (ver §7) | `?nobloom=1`, depois isolar com `&nogal`, `&nogdust`, `&noglow` |
| tela preta total | clip planes / câmera | `&dbgfade=1` e checar `updateClip` |
| lento no celular | bloom + resolução | `?q=performance` (o app já sugere isso sozinho) |
| `tsc: not found` | `node_modules` ausente | refazer o passo 2 (`npm ci`) |

---

*Stack: Vite 7 · React 19 · TypeScript ~5.9 · Three.js 0.185 · GLSL customizado ·
pós-processamento UnrealBloomPass.*
