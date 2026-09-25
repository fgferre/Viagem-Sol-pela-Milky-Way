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
(a escrever pelo planejador: para cada etapa, o objetivo, os arquivos, como verificar, o que o dono decide por imagem e os riscos)
