# Gás volumétrico assado em textura 3D (aberto 05/09/2026, aprovado pelo dono)

Meta: o raymarch da nebulosa em movimento custa ~33 ms/quadro em DPR 2 (metade do quadro) porque inventa a densidade a cada passo com ~45 oitavas de fbm. Trocar por leitura de uma grade 3D assada, sem sprite, mantendo a aparência (A) e depois deixando o mapa REAL de poeira entrar (B). Régua: Chrome visível DPR 2 contando rAF (receita no BACKLOG); fotos antes/depois nas vistas fixas; juiz `luz-do-quadro`. Um commit por etapa; push só em `main:backup`.

Decisões já tomadas (revistas 05/09 depois de medir)
- O gás local é calculado em QUALQUER ponto do disco (`nebulaFade = inDisk`), não só perto do Sol. A grade ACOMPANHA a câmera: cubo de ±1000 pc (alcance do raio 650 + margem 350), 128³ RGBA16F (15,6 pc/voxel), centro encaixado em múltiplos do voxel (reassar no mesmo lugar dá as mesmas amostras: sem tremor). Reassa quando a câmera sai da margem de 350 pc ou um insumo muda.
- Ablação em tela real (t=100 em movimento, caminho antigo): tirar n1+n2+lanes+ruído da paleta+sementes → 83 → 33 ms; núcleos do corredor são baratos (gate espacial). Logo: canais R = envelope·clumps·0,75 + sementes, G = fator das lanes × gasDensity, B = envelope, A = ruído da paleta. Por passo ficam: núcleos (texto GLSL idêntico), Bolha Local (sub-voxel), cavidade do observador, luz.
- Sementes: o pool tem 6603 nuvens (8107 pequenas + 84 grandes), não 84. O bake recebe as 256 mais próximas do centro da caixa por textura de dados (texelFetch), sem fade; o caminho antigo segue com suas 32.
- Assar na GPU (WebGL3DRenderTarget, 128 fatias) com o mesmo GLSL — sem porte para JS, sem arquivo novo na etapa A.
- Chave `?nebvol=0` volta ao caminho antigo SÓ durante a rodada de aprovação; some no fecho.
- Régua que vale: Chrome visível, DPR 2, contar rAF (rascunho `fps-real.mjs` no scratchpad; receita no BACKLOG). Fotos A/B no mesmo binário com `?nebvol=0`.

Etapas
- A1 [~] 2ª versão construída e medida em tela real 05/09: t=100 em movimento 12,2 → 29,1 fps (83 → 33 ms), sem erro de shader (o primeiro build tinha `uVolMin` sem declarar no fragment do bake: os testes não compilam GLSL). Variante `?nebfino=1` (n2+lanes por passo, resto assado) construída: t=100 em movimento antigo 12 / fino 18 / macio 31 fps; fotos em `capturas/nebvol3-t{60,100,140}-tres.png` enviadas ao dono para escolher. Reassar não gera quadro >100 ms (medido). skyError: antigo 0,761 / fino 0,831 / macio 0,852. (1ª versão, a 1ª, caixa fixa no Sol + 96 sementes, ficou sem gás em t=100: `capturas/nebvol-t100-lado-a-lado.png`) Grade assada + raymarch lendo a grade. Aparência preservada (fotos), custo medido. Arquivos: `src/three/shaders/common.ts` (nebulaDensity), `src/three/shaders/nebulaShaders.ts`, `src/three/world/nebula.ts`, `src/three/world/nuvensSemente.ts` (amplitude sem fade), `src/three/world/nebula.test.ts`.
- A2 [ ] Pular o vazio: grade grosseira de máximo (ex. 32×32×8) lida do bake; passo salta onde max = 0. Medir de novo.
- B  [ ] O mapa real: `scripts/data/build-galactic-assets.mjs` gera `public/data/galaxy/dust-volume.bin` (grade 3D medida + confiança a partir de `dust-density.bin`); o bake usa medido onde há cobertura e o modelo inferido onde não há (regra do manifesto). Precisa de `data:verify`, manifesto, docs (`GALACTIC_DATA_FOUNDATION.md`, `RENDERER_CARTOGRAPHY.md`) e fotos do dono.
- Fecho [ ] Apagar `?nebvol=0` e o caminho antigo, `npm run done`, backup.

Fora de escopo: LUT da faixa distante, pós-processamento, estrelas heróis (segundo peso do quadro; item próprio).

Achado 05/09 (fora deste plano, item próprio; detalhes no BACKLOG): em t=140 (dentro do disco) a camada da GALÁXIA (`?nogal=1`) custa ~75 ms dos ~87 ms do quadro em DPR 2; o gás não é o peso ali. Régua contínua: Chrome visível com `--disable-gpu-vsync --disable-frame-rate-limit` (SEMVSYNC=1 no `fps-real.mjs`), consistente com a de vsync e sem os degraus de 16,7 ms.
