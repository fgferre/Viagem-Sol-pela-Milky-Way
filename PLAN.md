# Poeira real do Gaia no gás da galáxia, em camadas, no computador e no celular — pedido de plano (25/09/2026)

Este arquivo é um PEDIDO DE PLANEJAMENTO. Quem planeja (Fable, em modo de planejamento) lê tudo, confere no código o que está marcado "a conferir", pensa e escreve a seção **Etapas** no fim. Nada se implementa na rodada do plano. Depois o GPT Astra revisa o plano, a sessão principal confere contra o código e o dono aprova as escolhas de produto por imagem.

## O pedido do dono (palavras dele, 24–25/09)
- *"acho que podemos pensar numa rodada mais inteligente com os dados do gaia e pensar em como viabilizar isso para funcionar tanto no desktop como em celulares"*
- *"vamos conseguir popular toda galaxia com isso?"* — resposta dada: não com um mapa só; em camadas, com o pedaço medido ensinando o gás inventado. Ele: *"sim, mas peça para ele pensar nisso em como poderia fazer"*.

## Decisões já tomadas
1. Fonte da vizinhança: Edenhofer et al. 2024 (A&A 685, A82; Zenodo 10658339; CC-BY-4.0). O arquivo bruto nunca vai ao site; é reduzido fora do app a um bloco pequeno.
2. A galáxia em três camadas: (1) perto de casa, o mapa detalhado do Gaia; (2) mais longe, mapas menos detalhados (Rezaei Kh. 2024 já está no app; Vergely/Lallement 2022 é candidato); (3) no resto, o gás procedural de hoje. O pedaço medido ENSINA o procedural — estatísticas da poeira real aplicadas ao gás inventado — para ele se parecer com o real em toda parte e as costuras sumirem. O "como" é do planejador.
3. Computador e celular com blocos de tamanhos diferentes, pelo preset de qualidade. A leitura da sessão que pesquisou (não do dono): o bloco de 10 pc parece caber no celular. A escolha é dele, por fotos do app, não do mapa.
4. O plano anterior do gás (volume assado que acompanha a câmera; versões antigo/fino/macio; padrões por preset aprovados em 13/09) está FECHADO: a parte de desempenho está pronta e publicada. A etapa B dele (o mapa de Rezaei em 3D) vira a camada 2 deste plano. Texto antigo: `git show 259ea55:PLAN.md`.
5. Regras da casa que valem aqui: técnica nova entra como opção de detalhe gráfico e o modo de hoje fica até provar-se inútil; regenerar `public/data` e publicar são cliques do dono (a trava barra o assistente em `scripts/data/` e em `npm run data:*`, menos `data:verify`); o dono julga por foto e vídeo; um commit por etapa; push só em `main:backup`.

## Fatos medidos em 25/09

### O mapa de Edenhofer (baixado e aberto)
- `mean_and_std_healpix.fits` (3,03 GiB, md5 conferido com o Zenodo) em `.cache/galaxy-data/edenhofer2024/` — ignorado pelo git; é a mesma pasta de cache de `scripts/data/build-galactic-assets.mjs`.
- HEALPix nside 256 (NEST) × 516 cascas de distância em escala log, de 68,8 a 1.244,6 pc; unidade "E of Zhang, Green & Rix (2023)" por pc; média e desvio; céu inteiro sem buracos; resolução de ~0,3 pc perto a ~7 pc longe (14′). A média tem riscos radiais ("dedos") longe do Sol: é incerteza de distância, não poeira.
- Leitura: as funções do script oficial `interp2box.py` (numpy + astropy + healpy) estão em `.cache/galaxy-data/edenhofer2024/prova/edenhofer_interp.py`. `poeira_imagens.py` interpola a caixa |X|,|Y| ≤ 1.250 pc, |Z| ≤ 500 pc em voxels de 5 pc (500×500×200) em ~2 min neste Mac (16 GB); máximo 0,185 e média 9,1e-5 na unidade acima. `poeira_folhas.py` desenha as folhas. O ambiente Python da prova ficou numa pasta temporária; recriar com `uv venv --system-site-packages` e `uv pip install astropy healpy`.
- Provas: `capturas/gaia-poeira-real-em-volta-do-sol.png` (de cima, fatia |Z| ≤ 140 pc; de lado, fatia |Y| ≤ 140 pc; 5 pc) e `capturas/gaia-poeira-detalhe-por-bloco.png` (médias 3D de 5, 10 e 20 pc num recorte de 1.060 pc). Mostram o Sol dentro da Bolha Local, com Touro, Perseu, Órion, Ofiúco e Camaleão na parede dela; a 10 pc quase tudo fica; a 20 pc a bolha, as paredes e as nuvens ficam, e os filamentos viram manchas.
- A caixa acima em 1 byte por voxel, antes do gzip (compressão não medida): 5 pc = 50 M voxels (~50 MB); 10 pc = 6,25 M (~6 MB); 20 pc = 0,78 M (< 1 MB).

### Outros mapas (pesquisa na web, 25/09)
- Vergely, Lallement & Cox 2022 (A&A 664, A174; VizieR J/A+A/664/A174): cubos aninhados de 3×3×0,8 kpc a 10 pc, 6×6×0,8 a 25 pc e 10×10×0,8 a 50 pc; FITS de ~40 a ~230 MB. O EXPLORE G-Tomo (Zenodo 10406497) tem cópias reduzidas em HDF5 de 88 KB a 117 MB; licença não explícita nesse registro (a conferir).
- Leike, Glatzle & Enßlin 2020 (Zenodo 3993082, CC-BY): caixa de 740×740×540 pc a 1 pc.
- Dharmawardena et al. 2024 (Zenodo 11448780, CC-BY): até 2,8 kpc; grade xyz de 4 pc com 20 GB, em pickle do numpy.
- Wang et al. 2025 (`dustmaps3d`, 401 MB): perfis analíticos por pedaço de céu, alcance de 3 a 15 kpc, pouca fidelidade local.
- Rezaei Kh. et al. 2024 (já no app, `public/data/galaxy/dust-density.bin`): 196.503 pontos esparsos com densidade em cm⁻³ e confiança; distâncias do Sol de 1.005 a 20.000 pc — NENHUMA amostra a menos de ~1 kpc. Hoje é achatado em 2D por `bakeDustChannels` (`src/three/cartography/dustMap.ts`) para o envelope e a extinção do disco.

### O app hoje (presets e volume assado conferidos; o resto veio de uma leitura rápida — a conferir)
- Presets (`src/three/core/engine.ts`): Cinema pr 2,0 com gás "fino"; Alta 1,5 "macio"; Performance 1,0 "macio". Nenhuma detecção de aparelho escolhe o preset; o Auto mede quadros (`src/lib/glProbe.ts`).
- Gás (`src/three/world/nebula.ts`): cubo assado 128³ RGBA16F, ±1.000 pc, voxel de 15,625 pc, centro em múltiplos do voxel; reassa quando a câmera anda mais de 350 pc; o raymarch vai até 650 pc. Todos os presets assam (só "antigo" não). Termos ao vivo em `nebulaDensity()` (`src/three/shaders/common.ts`): núcleos do corredor; a "Bolha Local" do app, que é só uma limpeza de 1,2 a 6,5 pc em volta do Sol (a bolha real tem centenas de parsecs e aparece no mapa); a cavidade do observador, de 25 a 240 pc, que acompanha a câmera (`uCavityGate`). Sementes: as 256 nuvens catalogadas mais próximas (Miville-Deschênes 2017 e as 84 grandes de Rezaei) a cada bake.
- Consequência: o voxel de 15,6 pc do bake limita o detalhe visível. Um bloco medido de 5 ou 10 pc só aparece se o bake ficar mais fino perto de casa ou se o raymarch ler o bloco medido direto.
- Dados: `fetchBinary()` em `src/three/config.ts` (gzip por DecompressionStream, com recaída no `.bin`); manifesto `public/data/galaxy/manifest.json` com sha256 cobrado por `npm run data:verify`; o pipeline é Node (`scripts/data/build-galactic-assets.mjs`). Reduzir em Python seria um SEGUNDO jeito de gerar dado: pergunta ao dono (AGENTS.md).
- Custo medido (Cinema, DPR 2, 1280×720, em movimento): t=60 62 ms (42 sem nebulosa); t=100 72–80 ms (68 sem nebulosa, 49 sem as partículas da galáxia). Régua de tela real: `scripts/visual/fps-real.mjs`.
- Download: os dados da galáxia somam ~12 MB em `public/data/galaxy`; o site tem ~352 MB de texturas de corpos, baixadas sob demanda.

### Celular (pesquisa na web, 25/09; conferir o que for decisivo)
- WebGL2: MAX_3D_TEXTURE_SIZE ≥ 2048 em todo aparelho (o iOS fica em 2048). R8 e R16F em 3D filtram no WebGL2 sem extensão; R32F precisa de OES_texture_float_linear (~49% dos iPhones) — evitar. EXT_color_buffer_half_float em ~100% do iOS (o bake RGBA16F já roda no celular). Textura 3D comprimida (ASTC 3D) no iOS: não confirmada — não depender.
- Memória: estimativas não oficiais de uma aba do Safari antes de recarregar: ~300–450 MB (iPhone 8 a 14), ~1 GB ou mais (15 em diante). 128³ é o volume "seguro" clássico em celular; 256³ em R8 (16 MB) é o teto arriscado.
- GitHub Pages serve `.bin` com gzip (sem brotli) e aceita pedidos por faixa; o git avisa acima de 50 MB e barra acima de 100 MB por arquivo; o site deve ficar abaixo de 1 GB.
- Não achamos volume denso de poeira do Gaia em WebGL rodando em celular: OpenSpace e Gaia Sky são de computador, e o voo da ESA é vídeo pré-renderizado.

## Perguntas que o plano tem que responder (decidir e justificar)
1. Forma do bloco medido: caixa fixa em volta do Sol, cascas por distância ou tijolos por demanda; resolução por preset; formato (R8 em escala log? a confiança do desvio num segundo canal?); tamanho com gzip; quando carrega (na abertura ou ao chegar perto de casa).
2. Como o bloco entra no desenho: amostrado no bake (barato, preso aos 15,6 pc), um bake mais fino perto de casa ou leitura direta no raymarch; custo por quadro no celular.
3. Unidades e aparência: da extinção (E de ZGR23 por pc) para a densidade, o brilho e a absorção do gás do app; a costura com o procedural depois de ~1,25 kpc e os "dedos" radiais (apagar pela confiança); o que acontece com a "Bolha Local" do app, a cavidade do observador e as sementes onde o mapa real existe (não contar a mesma nuvem duas vezes).
4. A camada 2: Rezaei (já aqui, esparso, além de 1 kpc) e/ou os cubos de Vergely/Lallement (10–50 pc, ±400 pc em Z) de 1 a ~5 kpc; como juntar as fontes pela confiança.
5. O medido ensinando o inventado: que estatísticas tirar fora do app (espectro de potência ou função de estrutura, distribuição de densidades, tamanhos de nuvens e de vazios, orientação dos filamentos, espessura da camada e como ela muda com o raio), como o gerador as usa na galáxia inteira e como provar que o inventado "parece" o real (uma régua mais fotos lado a lado).
6. O pipeline de dados: onde a redução roda (Node ou Python — o segundo jeito precisa do sim do dono), como entra em `scripts/data`, no manifesto, no `data:verify` e nos documentos (`docs/GALACTIC_DATA_FOUNDATION.md`, `docs/RENDERER_CARTOGRAPHY.md`); o crédito da licença CC-BY no app.
7. A prova: vistas fixas (instantes do filme e o Atlas perto de casa), fotos A/B contra o modo de hoje, fps em tela real no computador (Cinema, DPR 2) e no iPhone do dono, memória; o que o dono julga e quando.
8. A ordem: um primeiro marco visível cedo (uma foto da poeira real dentro do app, perto de casa) antes das partes pesadas; etapas pequenas o bastante para um trabalhador Sonnet executar cada uma.

## Fora do escopo
Implementar qualquer coisa na rodada do plano; publicar; regenerar `public/data`; outros catálogos (estrelas, corpos); a alavanca de desempenho dos pontos da galáxia (está no `BACKLOG.md`).

## Etapas
Escritas pelo Fable em 25/09/2026, conferidas contra o código, revistas com a revisão independente do GPT Astra (`.cache/revisoes/plano-poeira-gaia-gpt.md`, 21 itens, todos aceitos; três mantidos com nuance, ver o fim) e aprovadas pelo dono. O plano completo, com os fatos conferidos linha a linha, está em `~/.claude/plans/pasted-content-id-c8b0-leia-o-ticklish-ladybug.md`.

### Organização (decisão do dono, 25/09)
O trabalho roda no ramo `poeira-gaia`, criado a partir deste commit. O `main` só recebe este plano (documento) e, depois, cada marco aprovado por foto, via merge. O backup do ramo é `git push origin poeira-gaia` (a publicação só dispara com push no `main`: `deploy.yml`, `branches: [main]`). Quando o `main` andar, o ramo recebe o `main` por merge. Publicar e regenerar `public/data` continuam sendo cliques do dono.

### Correções aos "fatos" acima (conferidas no código em 25/09)
- `GAL_X` aponta do CENTRO para o SOL (`src/three/shaders/common.ts:65-75`, `world/baseGalactica.ts:21-40`); `GAL_Y` = l = 270°; `GAL_N` = norte. Uma caixa heliocêntrica convencional `(xh → centro, yh → l = 90°, zh → norte)` vai para a cena por `pCena = −xh·GAL_X − yh·GAL_Y + zh·GAL_N`, sem somar a posição do Sol.
- O portão da cavidade é `smoothstep(dHome, 600, 1300)` (`director.ts:2889`): ZERO até 600 pc de casa. Perto do Sol a cavidade não age.
- O app nasce em Cinema em todo aparelho, inclusive no iPhone (`engine.ts:223`, `:641`); o Auto só sugere. Logo "bloco pequeno no celular" não segue do preset: todos começam no nível leve.
- O carregador `src/three/cartography/galacticAssets.ts:139` é atômico (falha em um catálogo derruba o conjunto) e só entende tabelas Float32 (`:40`): um volume precisa de carregador próprio e opcional.
- O mínimo de `MAX_3D_TEXTURE_SIZE` em WebGL2 é 256, não 2048 (o iOS reporta 2048); as caixas ficam ≤ 250 por eixo e `glProbe` consulta o valor. `Data3DTexture.unpackAlignment` já nasce 1.
- Os smokes não afirmam a lista de erros de console; erro de link de shader no Three é só registrado. `fps-real.mjs` espera assentar e conta uma janela: não vê carga nem bake.
- A vista de cima a 800 pc de altura não alcança o plano (o raio vai a 650 pc); orientação se prova com projeções feitas dos dados.
- Licença: Edenhofer CC-BY-4.0 confirmada (Zenodo). Vergely no VizieR: sem linha de licença; a política do CDS remete redistribuição à A&A — pendência factual. G-Tomo: sem licença declarada.

### Decisões (respostas às 8 perguntas)
1. **Forma e formato.** Caixas cartesianas fixas no Sol, eixos heliocêntricos convencionais, índice `ix + nx·(iy + ny·iz)`, centros de texel em `min + (i + 0,5)·voxel`. **R16F linear** (E/pc × 1000): o filtro trilinear da GPU interpola densidade linear; R8 em log foi descartado (interpolaria os códigos: entre 1e−5 e 1e−3 daria 1e−4 em vez de 5e−4). "Sem dado" nunca é valor na textura: suporte analítico (esfera ∩ placa ∩ caixa), zeros fora do suporte, rampa de cobertura terminando ≥ 1 voxel dentro dele. Níveis: `dust-near-20pc` (|X|,|Y| ≤ 1250, |Z| ≤ 500: 125×125×50, 1,56 MB) para todos e primeiro; `dust-near-10pc` (250×250×100, 12,5 MB, ~7 MB gz a medir) e `dust-near-fine-5pc` (±400/±200: 160×160×80, 4,1 MB) só se foto e custo pedirem; redução entre níveis por média em densidade linear. Interior de 68,8 pc: não reconstruído, densidade zero declarada (o HDU integrado interno fica de fora: os autores o excluíram por viés de positividade). Carrega com os outros ativos; níveis finos em segundo plano, com troca atômica e reassar.
2. **Como entra no desenho.** Uma função GLSL `poeiraMedida(p)` e uma cobertura analítica `c(p)` (pesos por nível somando 1; `c` = suporte total disponível). Modos: 0 desligada, 1 assada (o bake amostra o bloco; o raymarch não muda), 2 fina (o raymarch lê o bloco por passo, no nível mais fino que cobre o ponto, somando ANTES das guardas de vácuo). `gas=antigo` não suporta poeira (forçada a 0). Régua: `d_lin = 46,9·E` (τ_V equivalente ao alpha atual, 0,055·d·dt); ganho/γ de aparência são uniforms separados. Equações: macio+assada: `R = (1−c)·(envelope·clumps·0,75 + sementes) + c·d_lin`, `G = mix(lanes, 1, c)·gasDensity` (lanes inventadas não modulam o medido; botão para comparar), B e A como hoje; fino+assada: `R = (1−c)·sementes + c·d_lin`, `G = n1`, raymarch com `c` analítico, guarda de vácuo válida, `d = (1−c)·s.b·clumps·0,75 + s.r`, lanes ao vivo com `mix(lanes, 1, c)`; fina: o bake não inclui `d_lin`. Expectativa honesta: reamostrar em 15,6 pc e filtrar de novo suaviza; 5 pc não sobrevive a passos de 5–9 pc nem ao blur; só a comparação na mesma pose e escala, com movimento, decide.
3. **Aparência e vizinhança.** Primeiro marco com a média original, só reamostrada. "Dedos" radiais: experimento opcional (desligado, original preservado, kernel/escala/critério escritos, colunas e posições comparadas), nunca "resolvidos". Cavidade igual no primeiro marco; teste com câmera a 600–1250 pc de casa (onde o portão abre). Sementes × (1−c) no bake. Costura por rampa em densidade linear, sem promessa de sumir. Limites declarados: LUT da faixa e extinção das estrelas continuam procedurais. O selo distingue reconstrução (medida), síntese espacial (derivada) e aparência (artística).
4. **Camada 2 (condicionada).** Vergely 2022 reamostrado à resolução efetiva (25 pc: ±3 kpc, |Z| ≤ 400, 240×240×32, 3,7 MB; 50 pc: ±5 kpc, 200×200×16, 1,3 MB) em R16F; unidade explícita (`A0(550nm)/pc` no FITS, `STEP=10`, `RESOL=25`, Sol no pixel 300,5/300,5/40,5 — confirmar), resolução comum, resíduos medidos por direção/distância/densidade e colunas, máscara pelos cubos de erro (além de ~3 kpc domina o prior). Só com fonte verificável dos termos (ou esclarecimento dos autores, autorizado pelo dono). Rezaei continua 2D. Dharmawardena exige análise própria.
5. **O medido ensinando o inventado (experimento, não pré-requisito).** O bloco ensina APARÊNCIA local, não estatística galáctica. Primeiro o barato: tabela de quantis do ruído existente → distribuição de densidades medida. Depois o carimbo: bloco de 20 pc normalizado em memória, recortes só do suporte completo (r ≤ 1100, |z| ≤ 450), rotações em Z e espelhos no plano, reticulado ~600 pc com pesos somando 1, transformação `log(1 + d/d0)` com inversa escrita, mistura preservando variância só como variante; avaliação por autocorrelação, vídeo, histograma e régua. Envelope global fica como está até haver suporte medido.
6. **Pipeline.** Node, no pipeline único: leitor FITS restrito aos HDUs usados (dims, endian, padding 2880, tipo de tabela, finitos; offsets em Number), `ang2pix` NEST com fixture de nside 256 gerada uma vez pelo healpy; reamostragem por COLETA com N³ subamostras adaptativo (N = 2·⌈voxel/célula⌉, 2–16), pixel mais próximo + linear em log-raio; invariantes (constante, gradiente, casca) e comparação com o interpolador oficial em pontos e colunas (fixture pequena; sem o FITS de 3 GB na suíte). Sem "pular cascas". Média inteira em RAM (1,6 GB); tempo a medir. Manifesto com o tipo "volume"; `verify` checa dims × bytes, finitos e faixa. Python só se o custo em Node se provar excessivo, e então como etapa única.
7. **Prova.** Projeções dos dados pelo pipeline vs as imagens em Python; volume sintético assimétrico até a GPU (`?poeira=teste`); vistas no app dentro do alcance (Sol → Ofiúco/Águia e → Touro/Órion; 300 pc acima do plano olhando para baixo; Ato II t = 40/60/75); controle fora da cobertura em t = 100/153/167; linha de base capturada ANTES da implementação e `poeira=0` comparado a ela; A/A; checagem focada de compilação/link nas combinações suportadas; custo medido desde a E2 (carga fria, primeiro bake, troca de nível, recentralizações: máximo, percentis, número de bakes) no Mac e no iPhone, com orçamento (proposta: nenhum quadro > 120 ms durante bake em Performance/Alta; se estourar, alvo de bake nos bastidores, +16 MiB); memória por residência (computador ≤ 16,6 MB + 5 da camada 2; celular 1,56 + 1,3 MB); régua (E6) sobre o campo `d_lin` final, reamostrado a 31,25 pc, mesma janela e máscara, tolerância tirada dos 8 octantes do bloco medido.
8. **Ordem.** E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8; nenhuma etapa posterior é pré-requisito da entrega local; um commit por etapa no ramo.

### E1 — O contrato e o bloco de 20 pc (2 trabalhadores, sequenciais)
- Objetivo: `npm run data:poeira` (nome no padrão dos `data:*`) produz `dust-near-20pc.bin` (R16F), manifesto, `.gz`, sha256, `verify` passando e o contrato de coordenadas provado. Pronto = o dono roda, `data:verify` passa, as projeções geradas pelo pipeline batem com as provas em Python.
- Arquivos: `scripts/data/lib/fits.mjs`, `scripts/data/lib/healpix.mjs`, `scripts/data/lib/volume.mjs` (contrato reusando `galactic.mjs`), `scripts/data/build-dust-volumes.mjs` (ou estágio em `build-galactic-assets.mjs`), `scripts/data/verify-assets.mjs`, `package.json`, fixtures em `scripts/data/fixtures/`, testes `.test.mjs` ao lado, `docs/GALACTIC_DATA_FOUNDATION.md`.
- Trabalhador 1: leitor FITS + HEALPix + fixtures + testes. Trabalhador 2: coleta + codificação + manifesto + verify + projeções PNG + docs. Nenhum roda o pipeline (trava).
- Verificação: testes; o dono roda; `data:verify`; projeções vs provas.
- Dono decide: só o interior de 69 pc vazio (declarado) — aceito em 25/09.
- Riscos: tempo (medir, sem atalhos); 1,6 GB em RAM; erro de eixo (o volume sintético da E2 é a segunda prova).

### E2 — Primeiro marco: a poeira real perto de casa, no macio, no Mac e no iPhone (2 trabalhadores)
- Objetivo: `?poeira=1` com gás macio mostra o Gaia até 1,25 kpc; `?poeira=0` é byte a byte a linha de base; o iPhone roda a URL normal e Performance/Alta sem recarregar, com bake no orçamento.
- Arquivos: `src/three/cartography/galacticAssets.ts` (carregador opcional de volumes: fora de `REQUIRED`, falha → poeira desligada; validação de bytes/metadados; último pedido vence; cancelamento; `cart=off` desliga a poeira), `src/three/world/nebula.ts` (`Data3DTexture` R16F, uniforms, `volumeSujo` na chegada, descarte, prontidão da captura inclui bloco + bake), `src/three/shaders/common.ts` (`poeiraMedida`, `c(p)`, equação do macio; fino forçado a 0 nesta etapa), `src/lib/glProbe.ts`, `config.ts`/`useEspelhoDaUrl.ts` (chaves `poeira`, `poeiragain`, `poeiragama`, `poeiralanes`, `fps`), `selo.ts` + `pt.ts`/`en.ts`, testes; harness: checagem de erros de shader + volume sintético; contador `?fps=1` (só dev).
- Trabalhador 1: carga, textura, uniforms, `poeiraMedida`, volume sintético. Trabalhador 2: equação do macio, botões, selo, checagem de shader, fotos e medições.
- Verificação: linha de base ANTES; fotos A/B nas vistas fixas; volume sintético; `ab-identidade` em t=100/153/167 com `?poeira=1` e em tudo com `?poeira=0`; A/A; `fps-real` t=60; carga fria/primeiro bake/recentralização no Mac; no iPhone: URL normal + Performance + Alta, fotos, `?fps=1`, bake máximo, "recarregou?".
- Dono decide: ganho e γ (3 fotos do céu visto do Sol); se as paredes reais agradam; se o orçamento do iPhone está ok ou se o bake precisa do alvo nos bastidores.
- Riscos: bake lento no iPhone (medido cedo); A/B enganoso se a captura sair antes do bloco; a cor da poeira medida sem lanes.

### E3 — O caminho fino do Cinema, o nível de 10 pc e a leitura direta (2 trabalhadores, sequenciais)
- Objetivo: (a) `gas=fino` + `poeira=1` com a equação da decisão 2; (b) nível de 10 pc e modo 2, comparados a 20 pc assado na mesma pose e escala, com movimento; 5 pc só se o ganho persistir.
- Arquivos: `common.ts` (fino: guarda de vácuo, `c` no raymarch, lanes exemptas; modo 2: soma antes das guardas, pesos por nível), `nebula.ts` (segunda textura, troca atômica, pesos), pipeline (nível 10 pc; 5 pc só se aprovado), `galacticAssets.ts` (nível a pedido), testes.
- Verificação: `fps-real` Cinema DPR 2 em 3 instantes (20 assado × 10 assado × 10 direto; `?nebsteps=96` como controle); vídeo curto em movimento; fotos A/B nas paredes de Touro/Ofiúco; checagem de shader nas 6 combinações; `ab-identidade` fora da cobertura.
- Dono decide: modo e nível por preset (proposta: Cinema fino+direto 10 pc; Alta assada 10 pc; Performance assada 20 pc).
- Riscos: custo por passo no Alta; ~7 MB gz no computador (medir); o 5 pc não render a olho (sai).

### E4 — A opção "Poeira real", a política de níveis, docs e selo (1 trabalhador + teste do dono)
- Objetivo: opção em Ajustes › Avançado (desligada / assada / fina), padrão por preset e no custom, pt/en, troca ao vivo, URL; política: TODOS começam no 20 pc; níveis finos só quando o usuário escolhe "fina" ou quando o preset é Cinema/Alta E a medição do Auto já correu sem sugerir descer; `RENDERER_CARTOGRAPHY.md` (camadas, residência, orçamento) e `GALACTIC_DATA_FOUNDATION.md`.
- Arquivos: `atlasConfig.ts`, `Ajustes.tsx`, `pt.ts`/`en.ts`, `engine.ts`, `useEspelhoDaUrl.ts`, `galacticAssets.ts` (gatilho), `atlasConfig.test.ts`, `engine.test.ts`, docs.
- Verificação: testes; `a11y.mjs` uma vez; duas línguas e três larguras; no iPhone: alternância de qualidade, Atlas, segundo plano, minutos de voo.
- Dono decide: padrão do celular e do Alta; textos do selo.
- Riscos: chegada tardia de nível após troca de preset (último pedido vence, dispose cobre).

### E5 — A cavidade dentro da poeira real (1 trabalhador)
- Objetivo: decidir por vídeo a força da cavidade onde o portão está aberto (600–1250 pc) e há poeira medida.
- Arquivos: `common.ts` (força × (1 − k·c), guarda de 25 pc ajustada), gravação com o motor de filme (Chrome headless + bomba de rAF).
- Verificação: dois vídeos do mesmo trajeto por uma estrutura identificada na faixa 700–1200 pc, com o portão mostrado; `ab-identidade` fora da cobertura.
- Dono decide: k (0 = como hoje).

### E6 — O medido ensina o inventado: quantis, carimbo e régua (3 trabalhadores; opção)
- Objetivo: fora da cobertura, o gás inventado se parece com a poeira real por aparência; a régua diz quanto; fotos casadas decidem.
- Arquivos: pipeline (`dust-statistics.json`: percentis, frações, função de estrutura, cordas, por octante), `common.ts` (tabela de quantis; carimbo como opção com transformação/inversa/pesos escritos), `nebula.ts` (normalização em memória, uniforms), `atlasConfig.ts`/`Ajustes.tsx`/idioma, `scripts/visual/poeira-regua.mjs` + gancho dev (bake numa posição + 128 leituras por `setRenderTarget(rt, fatia)` e `readRenderTargetPixels`, padrão conhecido por fatia), testes.
- Trabalhador 1: estatísticas no pipeline (o dono roda) + módulo compartilhado. Trabalhador 2: quantis, depois carimbo. Trabalhador 3: régua e fotos casadas (mesma R galáctica, azimute oposto).
- Verificação: régua dentro da faixa dos octantes; autocorrelação e vídeo; tempo do bake com o carimbo (Mac e iPhone) contra o orçamento; `ab-identidade` com a opção em "ruído".
- Dono decide: quantis bastam? carimbo × ruído por preset; palavra do selo ("posições inventadas").
- Riscos: repetição; contraste nas junções; bake fora do orçamento (carimbo só no computador, ou alvo nos bastidores).

### E7 — Camada 2: Vergely até ~5 kpc (2 trabalhadores; condicionada aos termos)
- Pré-condição: fonte verificável dos termos de redistribuição registrada (ou esclarecimento dos autores, autorizado pelo dono).
- Objetivo: entre 1,2 e ~3 kpc (máscara conservadora além) a poeira grande é a medida; resíduos contra Edenhofer medidos e declarados.
- Arquivos: pipeline (cubos FITS → 25 e 50 pc em R16F, unidade explícita, pixel solar e eixos fixados, resíduos, máscara pelos cubos de erro), `common.ts` (pesos por nível; procedural suprimido pela cobertura total), manifesto/verify/docs, testes.
- Verificação: fotos em t=100 e na costura (300 pc acima do plano perto de 1,2 kpc); `fps-real`; régua fora de 3 kpc; relatório de resíduos.
- Dono decide: termos; o visual de 1–3 kpc; se a calibração do envelope merece proposta com fotos — só depois desta validação.
- Riscos: unidade/zero point (medidos); "dedos" também aqui; entrada de 40–230 MB (cache).

### E8 — Fecho
- Docs finais, créditos no selo e no manifesto, linhas no `BACKLOG.md` (Rezaei 3D; extinção das estrelas pelo bloco; ganho/γ como opção; supressão dos dedos como experimento; alvo de bake nos bastidores), `npm run done`, backup do ramo, merge no `main` do marco aprovado. Publicar e regenerar são cliques do dono; depois, conferir no ar no computador e no iPhone.

### Mantido com nuance após a revisão
O carimbo continua (pedido explícito do dono), mas como opção e experimento depois da entrega local, começando pelos quantis. A reamostragem é coleta com subamostragem adaptativa (mais perto da referência, mais fácil de validar) em vez da deposição. R16F entra direto como formato único.
