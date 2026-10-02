# A cor inventada de Plutão e Caronte — a emenda reta some, com ciência (02/10/2026, noite)

Ramo `cor-inventada` (nasce do `relevo-inventado`, que fica intacto e mergeável). Dono das decisões de produto: ele, por foto. Técnica: desta sessão ("como vc vai fazer é contigo").

## O pedido dele (palavras, 02/10)
- *"foto 4 de caronte ficou um emenda reta estranha, como podemos resolver isso?"*
- *"hyperion nao tem esse problema... quero que resolva de forma que fique lindo, com embasamento cientifico, sem esse defeito e com relevo. como vc vai fazer é contigo..."*
- Já anotado no item 229 (02/10): melhorar com IA tudo que está borrado ou em baixa resolução no lado de trás, "baseado em todos esses dados".

## O diagnóstico (medido nesta sessão)
- A linha reta da foto 4 de Caronte NÃO está no relevo: a aspereza média e a altura média por faixa de latitude não dão salto; a vista renderizada só com o mapa de normais não tem linha.
- Está no mapa de COR: o terço sul nunca fotografado (noite polar no sobrevoo) foi tapado em 03/09 (item 149) com o tom médio liso; a borda desse tapa-buraco é o terminador do dia da passagem, uma polilinha de segmentos retos. Com relevo dos dois lados, a borda ficou evidente.
- A cor fotografada carrega a SOMBRA assada da sonda: no lado medido bem resolvido de Caronte, o passa-alta do brilho correlaciona r = 0,34 com n·L para um Sol a azimute ~330° (NNO) e elevação ~45° (grade de 10°/20°; o pior oposto dá −0,34). Em Plutão (110–170°E e 190–250°E, −25..+55°, luminância): r = 0,40 a azimute 320° (NO), elevação mal definida (0–50° dão o mesmo r; usar 30°). É a direção que a cor inventada tem de respeitar para a cor e o relevo não se desencontrarem. No espaço do próprio mapa de normais (n = rgb/127,5 − 1): Caronte L = (−0,354, 0,612, 0,707); Plutão L = (−0,557, 0,663, 0,500).

## A técnica (decisão desta sessão)
Transferência de textura na esfera, à Efros & Freeman 2001 §3 ("Image Quilting for Texture Synthesis and Transfer"), o mesmo molde da colcha do relevo, agora para a cor e GUIADA pelo relevo:
1. Regiões no mapa de cor (grade da casa, tamanho de destino: Caronte 8192, Plutão 5926): `vazio` = nunca fotografado (preto no mosaico cru, regra do vazio GRANDE de `preencherVazioSemDado`, medido ANTES da redução e dilatado para cobrir o halo do lanczos) MAIS a faixa rasante da borda (dentro do fotografado, junto do terminador, onde a luz era rasante: ~60 km, a afinar); `borrado` = onde o mosaico não tem detalhe fino (energia do passa-alta de σ 2–4 km contra o lado nítido, limiarizada e suavizada — a régua de qualidade, como no relevo); `bom` = o resto, que não muda e é a fonte.
2. Correspondência (o "mapa-guia" da transferência): o sombreado do mapa de NORMAIS assado (normais medidas no lado medido, inventadas no resto; `public/textures/atlas/<corpo>/normal.png`, 4096, reamostrado) sob o Sol assado (az 330°, el 45°; medir também em Plutão); no `borrado`, soma-se o passa-baixa da própria cor fotografada (o padrão real de albedo em grande escala fica; só o detalhe fino é refeito).
3. Retalhos quadrados de `larguraKm` no plano tangente, copiados por rotação da esfera SEM giro e SEM espelho (norte alinhado ao norte: a sombra assada tem direção fixa), candidatos sorteados nas fontes `bom` da unidade dominante no centro (pesos de `pesosDasUnidades` do JSON do relevo, calculados a 4096 e reamostrados), erro = α·(diferença na sobreposição com o já posto, normalizada) + (1−α)·(diferença do guia no retalho inteiro); três passadas com retalho decrescente (≈120 → 80 → 55 km) e α crescendo (E&F); sorteio entre os melhores; sem repetir origem perto. Corte de erro mínimo na sobreposição, rampa de 2–3 texels.
4. Tom de grande escala no `vazio`: a continuação harmônica (membrana) do passa-baixa (σ ≈ 200 km) da cor fotografada a partir da borda — o albedo em grande escala continua suave para o desconhecido, sem salto; o detalhe fino vem dos retalhos. Confessado.
5. Determinístico por semente; o gerador da cor (passo novo em `girarMapa`, `baixa-texturas.mjs`, nas entradas `pluto/map` e `charon/map`) só grava se o sha256 do RGB decodificado for o aprovado para a chave das escolhas (`sul:1,borrado:1`), como no relevo. A prévia e o gerador chamam a MESMA função (`inventaCorDoCorpo`, módulo novo `scripts/data/atlas/cor-inventada.mjs`).

## Verificação (números e fotos)
- Ao longo da antiga borda reta: energia do passa-alta, média e contraste local contínuos nas duas faixas (dentro/fora); um detector de linha reta (energia de Hough) antes/depois; correlação do passa-alta da cor inventada com o sombreado do próprio relevo ≈ a do lado medido (0,34).
- Fotos do app com o mapa candidato servido por CDP (`foto-candidato.mjs`, estendido a `map*`), nas vistas das pranchas (T4 e P5 primeiro), prancha antes/depois para ele.

## Etapas
- [ ] M1 Caronte, o sul (`vazio` + faixa rasante): módulo + prévia + números + fotos → palavra dele.
- [ ] M1b Plutão, o sul (medir o Sol assado em Plutão; cor em 3 canais).
- [ ] M2 o lado de trás borrado dos dois (`borrado`): detalhe fino refeito sobre o albedo real → palavra dele.
- [ ] Gerador com portão por hash; confissão pt/en (`pluto/map`, `charon/map` em `ASSETS.md` e `texturas-em-ingles.mjs`); assar (cadeia no terminal dele, a pedido dele: baixa-texturas para os dois, otimiza, manifesto, data:verify); escada conferida; fotos; `npm run done`; commit; merge dos dois ramos com a palavra dele.

## Fora de escopo
- Tirar a sombra assada do lado FOTOGRAFADO (correção fotométrica): fica como está (BACKLOG).
- Pintura por IA (ChatGPT): só se a transferência de textura não convencer por foto.
- Mexer no relevo: está pronto no ramo `relevo-inventado`.

## Onde estão as peças
- Mosaicos crus: `.cache/cor/Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif` (12693×6347, 1 canal) e `.cache/cor/PIA11707.tif` (5926×2963, RGB) — baixados nesta sessão; a cadeia oficial baixa de novo da fonte.
- Medidas e renders desta sessão (scratchpad, copiar para `capturas/cor-inventada/` ao passar o bastão): `sol-assado.mjs` (a direção do Sol assado), `vista-T4.mjs` / `vista-T4-cor.mjs` (render da vista da foto 4 com relevo e com cor), `degrau-por-latitude.mjs`, `degrau-de-altura.mjs`.
