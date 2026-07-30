# Auditoria independente — Mar de Estrelas

**Auditor:** Codex  
**Baseline:** `main` / `684d14aa2fcd0617f3b574182c271d8a68f07c39`  
**Data:** 2026-07-30  
**Escopo:** repositório inteiro, dados, matemática, astronomia, WebGL/GPU, ciclo de vida, estado, percepção visual e UX.  
**Exclusões deliberadas:** `AUDITORIA_KIMI.md` e `docs/AUDIT_GROK.md` não foram abertos.

## Veredito

O projeto passa todos os gates estáticos, mas não cumpre o alvo de 60 fps em 1440p/Cinema na RTX 3070 e contém quatro erros de representação materialmente visíveis: o raymarch trata fenômenos locais como trabalho global; o contrato observado/inferido não é obedecido na composição da poeira; os braços não são condicionados pelos masers que deveriam ancorá-los; e a fotometria HYG reaplica a distância já contida na magnitude aparente.

Há também duas falhas perceptivas dominantes: o grão cria bandamento diagonal em toda a imagem e o disco externo produz vazios escuros arredondados de escala sub-kpc/kpc. As duas melhores intervenções visuais também reduzem GPU: substituir o hash correlacionado por blue noise e pré-computar os campos UV estáticos do disco.

### Baseline validado

- `npm ci`: passou em worktree destacado limpo no mesmo commit. No checkout principal, três processos Vite concorrentes mantinham `esbuild.exe`/Rollup abertos; eles foram preservados.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou; Three `538,28 kB`, React `192,39 kB`, app `98,96 kB` antes de gzip.
- `npm run data:verify`: passou; 7 ativos galácticos e 18.543 estrelas HYG.
- Runtime: Chrome headed, WebGL2, `ANGLE (NVIDIA GeForce RTX 3070, D3D11)`, viewport/canvas 2560×1440, DPR 1, `q=cinema` manual. SwiftShader não foi usado.
- Timer query de GPU:

| Cena | Tempo de GPU médio | FPS de quadro |
|---|---:|---:|
| `t=0` | 75,35 ms | 13,27 |
| `t=85` | 79,90 ms | 12,52 |
| `t=158` | 6,79 ms; p95 18,67 ms | 53,34 |
| `t=170` | 22,10 ms; p50 19,92 ms | 55,39 |

Os números externos foram afetados por outras abas/processos que auditavam o mesmo checkout; por isso, a atribuição de causa usa os resultados locais `t=0/85`, que foram estáveis, e contagens estáticas. Mesmo assim, nenhuma das quatro cenas manteve 60 fps no ensaio.

Capturas desta auditoria:

- [`t=0`, Sol, Cinema](output/playwright/t0-cinema.png)
- [`t=85`, nebulosa, Cinema](output/playwright/t85-cinema.png)
- [`t=158`, disco de perfil, Cinema](output/playwright/t158-cinema.png)
- [`t=170`, revelação, Cinema](output/playwright/t170-cinema.png)
- [`t=170` com cartografia e dust points desligados](output/playwright/t170-nocart-nogdust.png)

## Achados ranqueados

### 1. P0 — O raymarch executa bilhões de testes para fenômenos espacialmente locais

**Frente:** performance GPU.

**Evidência concreta**

- Cinema usa 56 passos em `src/three/core/engine.ts:15-18`; o RT volumétrico usa metade da resolução em `src/three/world/nebula.ts:108-114`. Em 1440p são `1280 × 720 × 56 = 51.609.600` amostras potenciais por frame.
- Em `t=0` e `t=85`, a câmera está a aproximadamente `+5,5 pc` e `−18,2 pc` do plano. O slab fixo de ±1.600 pc em `src/three/shaders/nebulaShaders.ts:211-229` não elimina nenhum passo de um raio de 650 pc.
- O pool atual contém 6.603 nuvens elegíveis; 647 em `t=0` e 625 em `t=85` entram no raio de seleção, saturando os 32 uniforms. Como o early-out em `src/three/shaders/common.ts:127-130` só funciona se `uSeedCloudCount == 0`, ele fica globalmente desativado.
- O loop em `src/three/shaders/common.ts:139-152` pode fazer `51.609.600 × 32 = 1,651 bilhão` de testes nuvem–amostra por frame.
- Os sete cores de `src/three/shaders/common.ts:69-82` calculam dois FBMs antes de qualquer bound espacial. O teto é 42 `vnoise` por amostra só nesses cores, ou 17,34 bilhões de `hash13` antes dos breaks.
- O envelope é recalculado em `src/three/shaders/nebulaShaders.ts:250-255`, e o FBM da H II hero roda fora de seu volume em `:270-275`.
- Resultado medido: 75–80 ms de GPU em `t=0/85`, contra orçamento de 16,67 ms.

**Causa raiz**

O shader usa loops globais por amostra para features com suporte local; a mera existência de uma seed invalida o descarte de espaço vazio do frame inteiro.

**Menor fix que preserva a imagem**

1. Calcular as 32 interseções raio–esfera uma vez por pixel e manter uma máscara das seeds que aquele raio pode atingir; o early-out passa a depender dessa máscara.
2. Testar `dot(q,q)` antes dos FBMs dos sete cores e da H II hero, com corte abaixo de `d=0,003`/quantização FP16.
3. Retornar `envelope` por `out` de `nebulaDensity` e reutilizá-lo na iluminação.
4. Restringir `tLo/tHi` à união conservadora do envelope molecular e das esferas ativas.

Nenhuma posição ou contribuição dentro do suporte muda. O gate deve ser aceito somente com diff pós-ACES invisível em `t=0/42/85/95` e testes nos centros das nuvens observadas.

### 2. P0 — Poeira observada e procedural são sobrepostas onde o contrato exige substituição

**Frente:** astronomia, contrato de dados e qualidade visual.

**Evidência concreta**

- `docs/GALACTIC_DATA_FOUNDATION.md:9-15` exige que inferido preencha somente regiões sem amostragem.
- `docs/RENDERER_CARTOGRAPHY.md:19-31` especifica literalmente `mix(procedural, observado, cobertura)` e restringe o procedural sob cobertura a microtextura abaixo de ~65 pc.
- O disco mantém `absorptionProc` inteiro e multiplica a extinção observada em `src/three/shaders/galaxyShaders.ts:244-251`.
- O LUT da faixa soma `dustProc + dustObs` em `src/three/shaders/nebulaShaders.ts:133-147`.
- `G > 0,02` ocupa 94.747 de 205.892 texels do disco, 46,02%; quase metade do disco recebe macro-lanes medidas e sintéticas ao mesmo tempo.
- Há ainda 2.200 H II procedurais em `src/three/world/galaxy.ts:273-309` mais 1.413 entradas WISE em `src/three/world/starForges.ts:116-131`. `Galaxy.setCartography()` em `src/three/world/galaxy.ts:619-628` dima só as lâminas, portanto `?cart=obs` não isola todo o observado.

**Causa raiz**

Macroestrutura procedural e microdetalhe procedural foram fundidos no mesmo termo; o modo cartográfico controla apenas parte das camadas inferidas.

**Menor fix**

Separar `procMacro` de `microDetail`, aplicar `macro = mix(procMacro, obsMacro, G)` e manter o microdetalhe em ambos. Suprimir/deduplicar H II procedural dentro do suporte observado e fazer `?cart=obs` dimar todas as camadas inferidas. Nenhum ponto observado deve ser movido.

### 3. P0 — Os braços “Reid-based” não são condicionados pelos masers BeSSeL

**Frente:** astronomia e matemática.

**Evidência concreta**

- O contrato chama `spiral-anchors.bin` de âncoras de alta confiança em `docs/GALACTIC_DATA_FOUNDATION.md:61-67`.
- Fases, pitches e kinks são constantes manuais em `src/three/cartography/galacticModel.ts:42-83`; a curva é calculada em `:93-113`.
- Os 199 masers são apenas desenhados em `src/three/world/starForges.ts:135-148`; não entram em fit ou gate.
- Em 146 âncoras com braço conhecido e erro relativo de paralaxe `<0,2`, a menor distância à curva ativa foi:

| Medida | Resultado |
|---|---:|
| residual mediano | 1,039 kpc = 3,75 larguras |
| p90 | 2,326 kpc = 7,28 larguras |
| dentro de 1 largura | 13/146 |

- A repetição contra a fórmula GLSL efetiva deu mediana 1,046 kpc e 14/146 dentro de uma largura; divergência CPU/GLSL foi refutada.
- Alterar somente as fases por médias circulares, sem deslocar um único dado, reduziu a mediana a 0,318 kpc e colocou 70/146 dentro de uma largura.

**Causa raiz**

A geometria inspirada na tabela Reid foi transcrita como modelo procedural fixo, enquanto as âncoras observadas viraram decoração.

**Menor fix**

Fazer offline um fit robusto de fase/kink por código de braço, ponderado pela incerteza de paralaxe; exportar as constantes e adicionar ao `data:verify` um gate residual por braço. A continuação do lado distante deve continuar explicitamente inferida.

### 4. P0 — A fotometria HYG aplica distância e extinção duas vezes

**Frente:** astronomia, visual e performance.

**Evidência concreta**

- O stride é `x,y,z,magnitude aparente,B−V,log10(luminosity)`. `src/three/world/stars.ts:21-37` descarta `logLum`.
- `src/three/shaders/starShaders.ts:34-43` trata magnitude aparente como luminosidade e divide novamente tamanho por `dist` e fluxo por `dist²`.
- `src/three/shaders/starShaders.ts:45-49` reaplica extinção/avermelhamento procedural sobre magnitude e B−V já observados a partir do Sol.
- `src/three/world/heroStars.ts:85-99` deriva tamanho físico de magnitude aparente, que depois sofre projeção por distância.
- Na posição solar, a divisão extra por `d²` subestima Sirius 6,95×, Canopus 8.984,55×, Arcturus 126,73×, Betelgeuse 23.308,73× e Rigel 69.986,96×. Na resposta atual, Canopus termina com alpha aproximado 0,558, abaixo de Arcturus 0,885 apesar de ser 0,57 mag mais brilhante; seu billboard hero fica ~5,7× menor.

**Causa raiz**

Magnitude aparente foi tratada como propriedade intrínseca, embora o asset já carregue luminosidade intrínseca.

**Menor fix**

Enviar `aLogLum` e calcular fluxo/tamanho com luminosidade intrínseca e distância da câmera. Para manter a aparência solar exatamente, aplicar extinção diferencial `T(câmera→estrela) / T(Sol→estrela)`. O baseline solar pode ser pré-computado; isso também evita parte das 98,8 milhões de chamadas `hash13`/frame hoje gastas nas seis amostras de extinção dos 60.543 vértices HYG+far.

### 5. P0 — O “grão de filme” é bandamento diagonal coerente em tela cheia

**Frente:** qualidade visual e performance.

**Evidência concreta**

- O artefato atravessa todas as cenas: [`t=0`](output/playwright/t0-cinema.png), [`t=85`](output/playwright/t85-cinema.png), [`t=158`](output/playwright/t158-cinema.png) e [`t=170`](output/playwright/t170-cinema.png).
- `src/three/shaders/dustShaders.ts:95-119` usa um único `fract(sin(dot(...)))` sobre coordenadas contínuas fixadas em 1920×1080. O gradiente linear de fase gera correlação diagonal, em vez de distribuição espectral de grão.
- `src/three/core/engine.ts:15-18` define grain por preset, mas `src/three/core/post.ts:48-64` nunca envia esse valor; o shader fica no default 0,016. Simplesmente ligar o preset Cinema 0,055 tornaria o defeito mais forte.

**Causa raiz**

Um hash senoidal correlacionado e dependente de resolução foi usado como ruído de filme.

**Menor fix**

Trocar por uma pequena textura blue-noise tileable, rotacionada/deslocada por frame, ou por um hash inteiro de pixel sem bandas. Calibrar a amplitude perceptual e só então ligar o preset. Além de remover o artefato, elimina um `sin` full-screen por pixel.

### 6. P1 — As sete lâminas recalculam campos estáticos e produzem “buracos” de escala errada

**Frente:** performance e qualidade visual.

**Evidência concreta**

- Há sete planos aditivos em `src/three/world/galaxy.ts:575-615`.
- Cada fragmento executa dois FBMs de cinco oitavas e dois conjuntos de braços em `src/three/shaders/galaxyShaders.ts:181-214`; nenhum desses campos depende de tempo ou câmera.
- Em `t=170`, o círculo projetado de cada lâmina cobre ~39,8% do viewport. São ~10,28 milhões de fragmentos/frame, ~411 milhões de `hash21` e ~103 milhões de avaliações `galArm`.
- `fineNoise = fbm2(p * 31)` em `src/three/shaders/galaxyShaders.ts:213-215` tem primeira oitava de aproximadamente `16.800 / 31 = 542 pc`, oito vezes maior que o detalhe ≤65 pc prometido. Ela domina `absorptionProc` em `:244-251`.
- Os vazios escuros arredondados continuam em [`t=170` com `nocart` e `nodust`](output/playwright/t170-nocart-nogdust.png), refutando poeira observada e dust points como causa.

**Causa raiz**

Campos UV invariantes são reavaliados por layer/frame, e um FBM de baixa frequência foi usado como microtextura de extinção.

**Menor fix**

Pré-bakear os campos compartilhados de braços/barra/warp e os dois ruídos por seed em textura 16-bit com mipmaps; 512² já dá ~65 pc/texel, 1024² deixa margem. Remover as primeiras oitavas da extinção “fina” ou torná-la high-pass, deixando macroextinção somente no termo data-conditioned. Mantêm-se os sete planos, alturas, parallax, fades e composição.

### 7. P1 — `?t=...&shot=1` não é determinístico

**Frente:** estado, QA visual e UX de desenvolvimento.

**Evidência concreta**

- `src/App.tsx:68-75` congela somente `journeyT`.
- `src/three/director.ts:399-475` continua enviando o relógio do Engine a mundos e pós; `src/three/core/post.ts:62-64` anima o grão.
- `src/three/world/dust.ts:18-21` e `src/three/world/heroStars.ts:85-96` usam `Math.random()` no reload.
- O autoquality em `src/three/core/engine.ts:118-135` continua ativo quando a URL documentada não inclui `q`.
- Duas capturas de `t=85&shot=1` separadas por 2 s deram PSNR 30,95 dB e SSIM 0,6178: [`A`](output/playwright/t85-freeze-a.png), [`B`](output/playwright/t85-freeze-b.png). Em leitura reduzida, 68,27% dos pixels mudaram, MAE 3,98 níveis/canal.
- Na mesma URL, a qualidade mudou Cinema→Alta em 4,5 s e Alta→Performance em 7,5 s.

**Causa raiz**

Não existe um relógio visual/simulação único; “freeze” congela só a trajetória.

**Menor fix**

Introduzir `visualTime` derivado de `journeyT`, congelá-lo no shot, usar RNG por índice/seed para poeira e heroes, e travar preset/DPR/autoquality no modo de captura. O CSS já pode continuar instantâneo.

### 8. P1 — O canal de cobertura declara observação onde não há suporte local

**Frente:** matemática do bake e contrato de dados.

**Evidência concreta**

- `src/three/cartography/dustMap.ts:103-139` calcula baseline regional com blur largo, mas também deriva `G` de `regionalWeights`.
- O canal R permanece 0 quando o peso local é 0; no shader isso é interpretado como contraste não neutro.
- Reprodução exata do bake 512²:

| Medida | Resultado |
|---|---:|
| texels no disco | 205.892 |
| `G > 0,02` | 94.747 |
| cobertos sem amostra local | 9.402 |
| fração da área “coberta” | 9,92% |
| `G` médio nesses texels | 0,427 |

- Esses falsos cobertos reduzem `armLight` em média ~5,6% em `src/three/shaders/galaxyShaders.ts:235-243` sem observação local.

**Causa raiz**

O peso regional destinado ao baseline foi reutilizado como máscara de suporte observacional.

**Menor fix**

Derivar `G` do peso local após o blur curto; reservar `regionalWeights` para baseline/contraste. Onde não há suporte local, gravar R neutro 0,5 e G 0. Adicionar ao verificador a invariável `G>0 ⇒ suporte local`.

### 9. P1 — O enquadramento cinematográfico depende do FPS

**Frente:** matemática temporal e visual.

**Evidência concreta**

- A mira usa `lerp(..., 0.045)` por frame em `src/three/cinematic/cameraRig.ts:47-57`.
- O FOV usa fator 0,08 por frame em `src/three/cinematic/cameraRig.ts:89-92`.
- A inércia livre repete o padrão em `src/three/cinematic/cameraRig.ts:138-156`.
- Com o próprio `JourneyRig`, em `t=170` o FOV foi 61,74° a 30 fps, 60,37° a 60 fps e 58,39° a 144 fps. Em `t=158`, variou de 63,07° a 59,87°.

**Causa raiz**

Damping foi parametrizado por frame, não por tempo.

**Menor fix**

Passar `dt` ao rig e usar `1 - exp(-λ·dt)`, calibrando λ para reproduzir a resposta atual a 60 Hz. `seek/reset` deve inicializar mira e FOV diretamente.

### 10. P1 — Voo livre perde roll e conserva velocidade antiga

**Frente:** estado e UX.

**Evidência concreta**

- `src/three/cinematic/cameraRig.ts:130-140` extrai Euler YXZ, guarda yaw/pitch e força roll 0 no primeiro update.
- A direção de visão permanece, mas o horizonte saltou 147,64° em `t=85`, 105,16° em `t=158` e 158,86° em `t=170`.
- `src/three/cinematic/cameraRig.ts:138-157` não decai `vel` enquanto desabilitado; `src/three/director.ts:276-299` não a reseta ao trocar de modo.
- Depois de 2 s com W, `vel=11,993 pc/s` sobreviveu 10 s desativada; o primeiro frame da reentrada moveu 0,188 pc sem input.

**Causa raiz**

O sync do modo livre copia apenas dois dos três graus de orientação e não possui contrato de reset de movimento.

**Menor fix**

Preservar quaternion-base/roll e aplicar yaw/pitch como deltas; adicionar `resetMotion()` ao entrar/sair/reviver, zerando velocidade, teclas e drag.

### 11. P1 — Rótulos projetam com a matriz da câmera do frame anterior

**Frente:** estado de render e percepção.

**Evidência concreta**

- O rig/roam altera câmera em `src/three/director.ts:310-340`.
- `projectLabels` é chamado em `src/three/director.ts:455-460` antes de qualquer `camera.updateMatrixWorld(true)`.
- `src/three/world/labels.ts:49-58` usa `Vector3.project(camera)`, que depende de `matrixWorldInverse`.
- Simulação em 2560×1440/60 Hz: erro médio 2,42 px; 27,35% das projeções acima de 2 px; picos de entrada/saída próximos de 910 px.

**Causa raiz**

O renderer atualiza a matriz mais tarde, mas o overlay 2D consome a câmera antes dele.

**Menor fix**

Chamar `cam.updateMatrixWorld(true)` após rig/roam e antes de qualquer projeção ou extração de basis.

### 12. P1 — O HUD afirma cartografia real mesmo no fallback procedural

**Frente:** contrato de dados e UX.

**Evidência concreta**

- `src/three/cartography/galacticAssets.ts:84-113` retorna `null` se qualquer um dos sete ativos falhar.
- `src/three/director.ts:114-159` continua proceduralmente, mas não propaga esse estado ao React.
- `src/components/Hud.tsx:30-45` continua anunciando APOGEE/CO/Gaia como “cartografia real”.
- Com `dust-density.bin` forçado a HTTP 404, a intro abriu sem erro e manteve a afirmação.
- `src/components/Hud.tsx:48-59` afirma que toda estrela vista é HYG, mas `src/three/world/galaxy.ts:110-124` gera 282.700 pontos procedurais, além de `far` e `wrapped`.

**Causa raiz**

O loader trata a falha como detalhe interno; a camada narrativa não conhece proveniência/estado dos dados.

**Menor fix**

Carregar ativos de forma granular e expor `cartographyStatus` ao HUD. No fallback, rotular a cena como procedural. Restringir a frase final às estrelas catalogadas/nomeadas que realmente vêm do HYG.

### 13. P1 — Autoquality degrada, mas não recupera Cinema em painel de 60 Hz

**Frente:** qualidade adaptativa.

**Evidência concreta**

- `src/three/core/engine.ts:128-131` exige `avg > 60` para Performance→Alta e `avg > 72` para Alta→Cinema.
- `requestAnimationFrame` com VSync em painel de 60 Hz não alcança >72.
- Após a degradação em `t=85`, a vista externa permaneceu em Performance pelos 10 s observados.

**Causa raiz**

A histerese usa FPS absoluto sem considerar o teto de refresh.

**Menor fix**

Tomar decisão pelo custo de frame em milissegundos ou normalizar os limiares pelo refresh medido. A recuperação deve ficar abaixo do teto de VSync e exigir janela estável.

### 14. P1 — Os RTs volumétricos são redesenhados mesmo quando o resultado não mudou

**Frente:** performance exata.

**Evidência concreta**

- `src/three/world/nebula.ts:163-180` redesenha sempre o LUT 256×128 e o RT principal.
- `uTime` é atualizado em `:172`, mas não influencia os pixels volumétricos.
- Só o LUT repete `256 × 128 × 24 = 786.432` integrações pesadas/frame.
- Em câmera/shot estável, o RT principal repete até 51,61 milhões de amostras idênticas.

**Causa raiz**

Não há chave de validade por câmera/uniforms/versão dos dados.

**Menor fix**

Cachear por matrizes, FOV, resolução, passos, fade, cavity, seed-set e versão do dust map. O LUT precisa apenas de posição, mapa e blend. Se a seleção 4 Hz produz os mesmos 32 valores, não invalidar. Isso é bit-equivalente em intro, free-roam parado e shot após estabilização.

### 15. P2 — Passes inteiros rodam quando seu alpha é garantidamente zero

**Frente:** performance exata.

**Evidência concreta**

- `WrappedStars` processa 60.000 vértices em `src/three/world/wrappedStars.ts:17-18`, cada um calculando warp, discos, bojo e cinco braços em `:37-91`.
- O Director passa fade 1 em `src/three/director.ts:401-406`.
- Em `t=158`, todo ponto da caixa fica além do hard edge de 19,3 kpc; em `t=170/182`, a distância vertical torna disco/bojo muito menores que o discard `vAlpha<0,002` de `src/three/world/wrappedStars.ts:99-110`.
- Os 12 hero billboards também continuam em 12 draws quando `farFade=0`.

**Causa raiz**

Visibilidade física existe apenas no shader; o objeto não tem bound conservador no CPU.

**Menor fix**

Calcular upper bound de densidade para a caixa de 2,4 kpc e ocultar `WrappedStars` somente quando ele garante alpha abaixo de 0,002. Para heroes, `dHome > 1.164,55 pc` já garante distância >900 pc até todos os 12. O resultado é bit-equivalente.

### 16. P2 — Metadados científicos preservados nos assets são ignorados ou reinterpretados

**Frente:** astronomia e honestidade da representação.

**Evidência concreta**

1. **CO near/far:** o builder já seleciona `Dnear` ou `Dfar` conforme `INF` em `scripts/data/build-galactic-assets.mjs:170-200`. `src/three/world/observedClouds.ts:111-126` reinterpreta `farDistanceFlag` como baixa confiança e multiplica alpha por 0,55. Isso afeta 1.783 de 8.014 clouds recomendadas, 22,25%. O catálogo define INF como a solução near/far escolhida, não como probabilidade.
2. **WISE H II:** o manifest preserva `classCode`, mas `src/three/world/starForges.ts:116-131` ignora `data[o+7]` e transforma tudo em H-alpha confirmado. Das 1.413 fontes, 828 são K/known; 585, ou 41,4%, são candidate/group/radio-quiet/desconhecida.
3. **Cefeidas:** `src/three/world/starForges.ts:48-52` comenta períodos reais de 1–70 dias, mas gera `ω=0,55..2,20 rad/s`, isto é, períodos de 2,86–11,42 segundos, por seed.

**Causa raiz**

O pipeline preserva semântica e incerteza no binário, mas o renderer reduz os registros a um único tipo visual ou inventa confiança/periodicidade.

**Menor fix**

- Remover o fator 0,55 de `farDistanceFlag`; usar somente uma incerteza/probabilidade real caso seja importada.
- Enviar `aClass` para H II e diferenciar K de C/G/Q sem mover posições.
- Fazer join com período observado de Cefeidas e aplicar uma compressão temporal global documentada; até lá, rotular a modulação como inferred/twinkle.

### 17. P2 — `dispose()` deixa recursos WebGL vivos e usa ordem invertida

**Frente:** ciclo de vida.

**Evidência concreta**

- `src/three/core/post.ts:67-69` descarta só o composer, não seus passes.
- `src/three/world/nebula.ts:183-189` omite as duas `PlaneGeometry`.
- `src/three/director.ts:478-495` chama `engine.dispose()`/`renderer.dispose()` antes de materiais, texturas e geometrias do mundo.
- Instrumentação WebGL: `Post.dispose()` apagou apenas 2 targets; descartar os passes apagou mais 11 textures/FBOs/renderbuffers e 9 programs. As geometrias da nebulosa liberaram mais 8 buffers. Material descartado depois do renderer não chamou `deleteProgram`.

**Causa raiz**

O ciclo de vida assume que `EffectComposer.dispose()` possui os passes e que recursos podem ser descartados depois do renderer.

**Menor fix**

Descartar `composer.passes`, quads/geometrias, materiais, texturas e RTs antes do renderer; só então chamar `renderer.dispose()`.

## Achados confirmados de impacto menor

1. `?nonebula=1` é documentado no README, mas `src/three/director.ts:74,101-109,468-474` nunca inicializa `noNebula` pelo query param. Em `t=85`, ficou em 11,22 fps contra 10,87 do baseline e o raymarch continuou ativo. Fix: `noNebula = debug.has('nonebula')`.
2. “Explorar livremente” aparece em mobile, mas `src/three/cinematic/cameraRig.ts:102-157` exige WASD/QE/wheel. Touch só olha; não viaja. Fix completo: gesto/joystick mínimo; até existir, desabilitar o botão em `pointer: coarse`.
3. Legendas narrativas não usam `aria-live` e a barra não expõe progressbar em `src/components/Hud.tsx:80-113`. Fix: região `role=status` com atualização controlada e progressbar semântico.
4. `LabelCanvas.draw()` limpa o canvas inteiro mesmo com lista vazia em `src/components/LabelCanvas.ts:30-35`: até 221 milhões de pixels transparentes/s em 1440p. Fix: `hasContent` e invalidar somente bounds anteriores/atuais.
5. Film e Output são dois passes full-screen consecutivos em `src/three/core/post.ts:21-33`. Fundir gradação e Output remove uma leitura/escrita de 3,69 milhões de pixels/frame sem remover efeito.
6. Cinco dos 84 grandes clouds têm raio ausente serializado como zero em `scripts/data/build-galactic-assets.mjs:150-167`; `src/three/world/observedClouds.ts:146-150` inventa 90 pc e o volume usa outro mínimo. Fix: preservar `radiusValid` e separar o fallback como inferido.

## Hipóteses refutadas ou descartadas

- **Base galáctica/centro/flip:** coerentes. A transformação produz o centro `(-442,464, -7117,423, -3945,763)` e os eixos, UV do dust map, warp e hemisfério sul fecham entre CPU e GLSL.
- **CPU versus GLSL explica o mau fit dos braços:** refutado; diferença angular máxima ~0,44° e os residuais BeSSeL permanecem.
- **Unidade do raio H II:** correta; o catálogo usa arcsec e a conversão física fecha.
- **Erro Float32 dos assets:** máximo ~0,0023 pc heliocêntrico e ~0,0031 pc galactocêntrico; imaterial.
- **Sort das seeds é gargalo:** 0,181 ms por refresh em 6.603 registros; descartado.
- **React rerender por frame:** progresso, warp e labels usam refs/canvas; não há rerender React de alta frequência.
- **Race de loader no unmount:** `AbortController`, `cancelled` e `disposed` cobrem o caminho; descartada.
- **Reduzir DPR, passos, layers ou bloom:** rejeitado por violar a regra de qualidade. Os fixes acima eliminam trabalho redundante ou corrigem modelos sem reduzir o sinal visível.

## Ordem recomendada de correção

1. Corrigir primeiro os contratos que definem a imagem: fit BeSSeL, fotometria, composição observado/inferido e máscara G.
2. Em seguida, remover o gargalo volumétrico com bounds/máscara por raio e trocar o grão correlacionado.
3. Só então pré-bakear os campos estáticos do disco; isso evita cristalizar em textura a versão cientificamente errada.
4. Tornar `shot` realmente determinístico e criar gates de residual, diff perceptual e GPU timer.
5. Fechar câmera/labels/free-roam, proveniência no HUD, autoquality, semântica categórica e descarte.

Nenhum código do produto foi alterado nesta auditoria.
