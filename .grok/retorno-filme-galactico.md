# Revisão do filme galáctico — retorno consolidado (medido, não opinado)

Repo: Viagem-Sol-pela-Milky-Way. Roteiro em `src/three/cinematic/journey.ts` (SHOTS, `takeDaCasa`, `lookDoTake`, `raspaoDaLua`), olhar em `src/three/cinematic/cameraRig.ts` (`JourneyRig.apply`, `galacticUp`). Filme: 25 planos, 193 s (~3 min 13 s), quatro atos + coda.

Leis do dono: (1) a frente é a visão principal; (2) tempo sem ação não existe; (3) melhoria tem de aparecer na tela; (4) play contínuo é a prova — seek esconde defeito.

Método desta revisão: leitura integral dos dois arquivos + medições rodadas no código real (sem editar nada): tabela de velocidade/mira/fov nas 24 juntas, simulação quadro a quadro do amortecedor do rig na coda, posições planetárias pela efeméride do app (`efemerides.bin`) e varredura do catálogo real (`stars.bin`, 328 mil estrelas) no caminho do mergulho. Juízes existentes (`voltaParaCasa.test`, `roteiroPerfil.test`): 13/13 verdes — e mesmo assim o play falha, porque eles julgam o roteiro, não a exibição.

## 1. DIAGNÓSTICO PRINCIPAL — a falha Lua→Terra no play contínuo

Sintoma do dono: pular direto para o ato da Lua funciona; deixar o filme chegar sozinho, não — a Lua passa e o take não termina na Terra nem gira até as Américas.

Medido (simulação do amortecedor do `JourneyRig.apply`, mesma matemática de `kLook`, 60 fps, t=176→fim):

- t=181 (entra `takeDaCasa`): mira real a **175°** do roteiro — a câmera olha quase para trás;
- t=183 (joelho do `raspaoDaLua`): ainda 65°→38° — **a passagem da Lua inteira acontece fora de quadro**;
- converge (erro < 1°) só em t≈186, no meio da volta; o pouso final sai certo (0,00° nos últimos 2 s).

Mecanismo (duas peças, ambas com nome):

1. **O chicote do `panThenHold(FINAL_LOOK, TERRA_PC, 0.22)` no `mergulhoDeVolta`.** `FINAL_LOOK` fica a ~2.800 pc do Sol, do lado do centro galáctico. A câmera despenca 11,5 décadas em 5 s; a interpolação entre os dois PONTOS, vista de perto, vira um giro de ~85° no primeiro segundo — giro que nenhum amortecedor segue.
2. **O atolamento antipodal do rig.** O rig suaviza a mira com `lerp` de direção + `normalize`. Perto de 180° de erro esse lerp quase para de convergir (o caminho entre direções opostas passa pelo zero; normalizar devolve a direção errada). Por isso o erro cresce de 85° a 175° durante o mergulho e só escapa devagar no take.

Por que o seek funciona: `reset()` + primeiro quadro dão `snap` na mira certa. O play chega com a mira atolada. O roteiro é inocente: o olhar é contínuo na junta (os dois lados miram `TERRA_PC`) e os juízes bit-a-bit passam.

Direções de conserto: (a) trocar o pan do mergulho de interpolação de PONTO por pan de DIREÇÃO; e/ou (b) trocar o `lerp`+`normalize` do rig por `slerp`, que não atolha no antipodal. Os gates de imagem usam seek/reset com snap, então mexer no amortecedor não move os `GATE_*`. OBRIGATÓRIO: criar junto um juiz novo que simula o play inteiro com a câmera real (a simulação desta revisão é o protótipo) — sem ele o defeito volta escondido.

## 2. JUNTAS — saltos de velocidade medidos (os "microtravamentos entre atos")

Não há parada morta fora os holds (que são por desenho); há saltos violentos de velocidade, medidos a ±0,12 s de cada junta:

- **135 s (rasante→fuga, Ato III→IV): o pior do filme** — 0,015 → 384 pc/s (26.000×), e a direção da mira varre **112° em 0,08 s** (a `SLING` com `easeOut` arranca sobre uma bézier de 26 mil pc);
- **176 s (deriva→coda)**: do congelamento (`settleFreeze`) para 92.100 pc/s num quadro — corte duro por desenho, mas é um solavanco;
- depois: 121 s (224×), 88 s (68×), 80 s (73×), 73 s (8,7× com chicote de mira de 0,72°), 111 s (9,3×).

## 3. OPORTUNIDADES DE CÂMERA/RITMO — verificadas contra os dados

1. **Berçário azul com estrelas REAIS — viável, e a janela é a Onda 1 (t≈94–101), não a 2.** A associação Escorpião-Centauro (berçário real) passa a 15–50 pc do caminho: Paikauhale (28,6 pc), Dschubba (33,9), Pipirima (33), Iklil (45), Lesath (46,8), Shaula (48,1). Bônus: em t≈94–97 a câmera já passa a 1,7–4 pc de estrelas reais do catálogo — chicotes de primeiro plano que hoje acontecem invisíveis. Na Onda 2 (t=104–111) o catálogo real rareia; o beat de lá dependeria do campo procedural.
2. **Cruzar o plano galáctico no mergulho.** Verificado: o roteiro fica sempre ~25 pc ABAIXO do plano (DIVE_1…DIVE_4, z entre −8 e −24) e nunca cruza. Uma travessia faria a lâmina de poeira varrer de cima a baixo do quadro — o "teto de tempestade" vira chão.
3. **Banking nos corredores.** `roll` só existe nas ondas, rasante, fuga e subida. Os corredores de bézier (Sirius→cinturão, Rigel, Antares) voam com horizonte travado; roll suave (0,05–0,1 rad, mesmo padrão `A·sin(πk)`) na entrada/saída das curvas dá o gesto de avião em curva.
4. **Punch-in de lente nas juntas de ato.** O gesto de telescópio da TRAVA das Três Marias (fov 54→15) reusado como pontuação antes do lançamento de Antares e antes da fuga — dá beat e mascara os solavancos medidos do item 2.
5. **Fly-by planetário na coda — NÃO é grátis (medido).** Na rota direta para a Lua (01/01/2026 16:00 UTC), o mais perto que o corredor passa de um gigante é 2,28 UA de Júpiter (t≈180), fora do quadro, com 1,4 arcmin no máximo — um pontinho. Para Júpiter encher o quadro (efeito Lua-cheia), o mergulho precisaria mirar ~0,1 UA dele antes de entrar no corredor da Lua: desvio de rota deliberado, com geometria e juiz novos. Decisão de escopo do dono.

## 4. O QUE NÃO MEXER

- Abertura do Sol inteira: `SUN_WALL`, `heliceDaAbertura`, `distanciaDaAbertura`, `K_DA_ABERTURA`, `DECADAS_DA_ABERTURA` — composição aprovada pelo dono.
- Quadros de medição: `GATE_LOOK`, `GATE_EDGE_POS/FOV/ROLL`, `GATE_FACE_POS/FOV/ROLL`, os holds "ELA NÃO É PLANA"/"NOSSA GALÁXIA", `CAPTURE_T` — mantêm as rodadas 16–25 comparáveis. Se um enquadramento melhor nascer, recongelar por decisão do dono, nunca obedecer o número velho por medo do teste.
- Geometria pinada da coda: `TERRA_PC`, `LUA_PC`, `JD_DO_FILME_TDB`, `ROLL_DOS_POLOS` — `voltaParaCasa.test` recomputa pela efeméride e cobra bit a bit.
- `galacticUp` (norte comum de viagem, voo livre e juiz da coda).
- Regra colateral: shot novo declara `lingua` e respeita a lei da frente (`roteiroPerfil.test` cobra).

## 5. RECADO SOBRE OS JUÍZES (o dono é leigo e perguntou)

Os juízes atuais protegem as palavras DELE (a encenação pedida, as duas leis de 19/08) e a geometria real (Terra/Lua bit a bit contra a efeméride) — não são gosto de IA. Onde a desconfiança dele acerta: limites tipo "4 s" foram escolhidos por IA, e gates bit-idênticos petrificam números do passado — são detectores de regressão, nunca objetivo. E o furo real: nenhum juiz assiste o filme em play contínuo; a falha de 175° viveu aí. Toda correção desta lista deve nascer com a prova que mede o que mudou — e renderização só está pronta depois de verificada no navegador, em play contínuo.

---

# ADENDO (19/08 noite) — verificação dos consertos do Grok + pedido novo do dono

## A. Verificado na máquina (play completo t=0→193 com o rig real, 60 fps, suíte 1648 verde)

- **72e4325 (coda) confirmado**: entrada do take 2,0° (era 175°); Lua dentro do quadro em todo o raspão (pior 14,1° contra 31° de meia-lente); pouso assenta em 0,2°.
- **2479026 (fuga) confirmado**: pior erro em t=128–140 caiu de ~102° para **9,85°** (meia-lente ~26°). O adeus do buraco negro fica no quadro.

## B. PRÓXIMO PONTO A MEDIR/CONSERTAR — o giro de Sirius (t≈30,7–31,2)

O roteiro pede **445°/s** na virada para Sirius (`lookEvento(SOL, SIRIUS×2.4, ALNILAM, 0.2, 0.75)` — o lerp de PONTO perto do caminho, mesma doença da fuga). O rig chega a **90° de atraso** em t=31 e só recupera em t≈32,5: ~1 s de borrão no começo do plano, a "virada cedo" chega tarde no play. É hoje o maior atraso do filme. Receita: a mesma do 2479026 — pan por DIREÇÃO, não por ponto.

## C. PEDIDO NOVO DO DONO — a passagem da Lua está rápida demais

Palavras dele: "quando estivesse passando poderia dar uma leve desacelerada e virar rapidamente a camera para ela e desvirar para continuar em direção a terra."

Medido no take atual (12 s; segmento da Lua = t=181→184,6, 3,6 s; joelho `JOELHO_DO_RASPAO` em t≈183,2):

- A Lua fica GRANDE (diâmetro >10°) só por **~0,8 s** (182,8–183,6); no joelho tem 18° de diâmetro. Por isso parece um piscar.
- A velocidade no joelho já cai a ~4–6 raios lunares/s (fundo do vale), mas o drama angular máximo acontece justo ali.
- O olhar JÁ cede à Lua (`lookDoTake`, w = 0,52·sin) — mas o pico do cede é em t≈182,8, **antes** do joelho (183,2), e 0,52 só a traz para ~16–20° do centro, nunca protagonista.

Receita (respeitando os juízes):

1. **Mais tempo perto dela**: alargar o fundo do vale do `raspaoDaLua` — ~1,5–2 s entre 5 e 10 raios lunares em vez de 0,8 s. SEM derivada zero em ponto nenhum (o comentário do `raspaoDaLua` documenta dois play travados por isso: joelho e juntas têm de chegar e sair andando). Alternativa ou complemento: `K_LUA_NO_TAKE` 0,30→~0,38, tirando ~1 s da volta (que fica com ~7,4 s — a rotação das Américas ainda se lê; menos que isso, não).
2. **O olhar rápido**: mover o pico do cede para o joelho e subir para w≈0,8–0,85 numa janela de ±0,7 s — no ponto mais próximo a Lua toma o centro; depois o olhar volta à Terra. O rig (slerp de 0,4 s) segue um gesto de 1,4 s (hoje segue o cede de 0,52 com ≤14° de atraso). OBRIGATÓRIO: w=0 EXATO em k=`K_LUA_NO_TAKE` — o `voltaParaCasa.test` cobra o take começando e terminando na Terra.
3. **Juízes que precisam continuar verdes**: `voltaParaCasa.test` (distância mínima 3,1–3,9e-10 pc; diâmetro >14° no joelho; flanco aceso; pouso congelado; polos para cima), o juiz de play da coda (aceita olhar a Lua: min(ângulo→Terra, ângulo→Lua) < 25°) e o de juntas (<6°). E **estender o juiz de play da coda** para cobrar o gesto novo (no joelho, a Lua a X° do centro) — senão o gesto morre em silêncio numa futura mudança.
4. Duração: dá para fazer tudo dentro dos 12 s atuais (reshape puro); se o dono quiser mais fôlego, +2 s no take é decisão dele.

---

# ADENDO 2 (20/08) — verificação de `cd9e21a` + `7ecb934`: tudo confirmado, nenhum furo adjacente de grande impacto

## Verificado na máquina (código lido + play completo t=0→193 com o rig real, 60 fps; suíte 1652 verde)

Os quatro consertos existem no código e funcionam na medição independente:

- **Berçário no lugar certo**: a legenda cai na Onda 1 (juiz novo crava t≥94 e ≤104) e a Onda 2 virou "O ÚLTIMO BRAÇO".
- **Juiz re-rigoroso**: folga global de volta a 0,6°; 6° só no corte da coda (4,8°). Confirmado no diff de `cameraRig.test`.
- **Lua/Terra sem rede**: `centroPinadoPc` passado pelo `director` SÓ na fase `journey` — o Atlas sem rede continua honesto (sem Lua, badge conta). Escopo certo.
- **Juiz do filme inteiro (0→193)**: existe e passa; Rigel virou `lookPan` (direção, não ponto), mesma cura da Sirius.

## Medição independente do play (a minha, não a dos juízes dele)

- **Lua**: grande (>10° de diâmetro) por **1,77 s** (182,8→184,6; era 0,8 s); distância mínima **6,2 raios lunares**; no joelho o olhar fica a **9,4°** dela (protagonista, como o dono pediu); pouso assenta a **0,33°** da Terra. O cede tem pico 0,83 no joelho e zero EXATO nas pontas (`lookDoTake`) — exatamente a receita do adendo anterior.
- **Pior atraso de olhar do filme inteiro**: 38,5° em t=68,7 (a virada para Rigel, dentro do chicote roteirizado; juiz tolera 50°). Depois: 32,7° (t=71,3, mesma virada) e 32,1° (t=32,8, resíduo da Sirius). São pans rápidos intencionais — leem-se como chicote de câmera, não como defeito. É o último ponto macio mensurável; apertar além disso é gosto, não furo.
- **Saltos de velocidade nas juntas** (73 s, 80 s, 88 s, 111 s, 121 s, 135 s, 169 s, 176 s) continuam existindo em razão bruta, mas posição/mira/lente/roll são contínuos (juiz de juntas) e o juiz do play inteiro passa — não há dano visível medido.

## Resposta à pergunta do dono: "mais algum problema adjacente de grande impacto?"

**Não encontrei nenhum.** O que resta em aberto não é defeito, é decisão de escopo (já sinalizada antes):

1. **Cruza-plano da galáxia** no mergulho (poeira de teto a chão) — gesto forte, mexe no Ato III inteiro. Minha recomendação continua: este antes de Júpiter.
2. **Desvio por Júpiter** na coda — na rota atual ele passa a 2,28 UA (pontinho); fly-by exige mudar a rota de casa.
3. **Item 7 do PENDENCIAS** (trocar qualidade sem recarregar) — obra de engine, não do filme.

Detalhe menor, registrado só para constar: 1 teste da suíte consta como "skipped" — não é desta rodada e não esconde nada do filme.
