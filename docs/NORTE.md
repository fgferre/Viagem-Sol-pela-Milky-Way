# Norte

O que o projeto está tentando ser, o que já foi decidido, e o que não se repete.
Este arquivo existe para que uma sessão nova — de qualquer agente, com qualquer
contexto — retome sem redescobrir. Não é diário: só entra aqui o que ainda decide
alguma coisa. O que virou código sai daqui.

## A visão

Uma Via Láctea volumétrica, cinematográfica e cientificamente fundamentada, na qual
se pode viajar até qualquer ponto e ainda sentir um universo vivo e denso:

- **Nuvens moleculares e poeira volumétricas em toda a galáxia**, com a tonalidade
  certa: dourado de longe, púrpura e azul quando se voa por dentro.
- **Estrelas de catálogo e procedurais sob a mesma lei** — magnitude, cor, tamanho e
  brilho corretos, respondendo à posição do observador.
- **Determinístico, eficiente no browser, LOD de verdade.** Sem truques de sprite.

O árbitro visual não é captura do próprio app: são as referências em
[`reference/`](reference/), com alvos numéricos em
[`reference/VISUAL_TARGETS.md`](reference/VISUAL_TARGETS.md). Toda mudança de imagem
passa por `scripts/visual/measure-similarity.html` contra elas. Honestidade sobre o que
são: as vistas externas (face-on/edge-on) são **recriações científicas** ancoradas em
Gaia — ninguém fotografou a Via Láctea de fora — com escolhas artísticas embutidas; a
única foto real é o panorama ESO, visto de DENTRO.

**Lacunas conhecidas do gate (a fechar):**
1. ~~Edge-on sem número~~ — **fechada na rodada 12** (`?mode=edge`, alvos e fórmula em
   `VISUAL_TARGETS.md`, tabela no `EVOLUCAO.md`), **atacada na rodada 15** (extinção por
   caminho amostrado no segmento partícula→câmera, sem piso de μ; piso difuso
   axissimétrico = metade da âncora A_V 1,5 mag/kpc; fenda no glow do bojo —
   edgeError 2,0258 → 1,4780) e **na rodada 16: 1,4780 → 0,8731**, por duas causas:
   **(a) o ruído de poucas amostras era VIÉS** — subamostrar uma Σ com estrutura de
   ~1 kpc não faz média entre 2,6 M partículas: E[e^−τ̂] > e^−E[τ̂] (convexidade), o viés
   enche a faixa e suja o centroide vertical por coluna. 16 amostras são o joelho
   (fronteira 4/16/32 no gate: 0,928/0,873/0,881; custo t=0 2560×1440: 17,7/18,8/20,0 ms
   de média — o custo é latência de fetch com cache frio nos caminhos de meia-galáxia,
   t=170 fica no vsync com as mesmas 16 (t da linha do tempo até a r25; o
   quadro equivalente hoje é o hold face-on t=293); candidata a devolver o
   p90: `textureLod` mip 2–3 nas amostras do caminho, conferindo antes se o
   uTauMap tem mips).
   **(b) a vantagem de t=158 era cega ao que o gate mede** (t=158/146: linha
   do tempo até a r25 — o quadro de perfil hoje é o hold t=261) — azimute da visada 90° ≈
   linha de nós do warp (fase 5°): o S projetado cancelava na integral da visada
   (fator 0,087); e elevação 901 pc diluía faixa e espessura. Keyframe novo: visada
   pelos nós (az 185°, recuo radial reto desde t=146) e z=500 pc, varrido — abaixo de
   ~400 pc entra o regime DENTRO-da-lâmina (o plano inteiro se extingue, a faixa morre
   no branco; em z=100 o warp aparece pleno, warpAsym +0,48 = alvo, provando que faixa
   e S são acoplados: o S só emerge quando a faixa corta a luz reta do plano).
   Estado: laneDepth 0,29 → **0,66** (alvo 0,94), warpAmp 0,004 → 0,010, laneOffset
   0,56, axialRatio 0,036. O face-on MELHOROU junto: 0,0800 → **0,0601, recorde** — a
   extinção limpa ajudou de cima também.
   **O que falta da faixa, com mecanismo (revisto na rodada 17):** o vermelho do
   plano (colourZ 0,34 vs 0,19) NÃO se conserta somando luz azul — refutado duas
   vezes por medição (abaixo): a aritmética do gate é estrutural, laneDepth paga
   ~1:1 em luminância o que a cor ganha a ~1:3 (média de curva). A faixa neutra e
   profunda da referência vem de PROFUNDIDADE: com corte quase total o resíduo
   vermelho some sozinho. E o diagnóstico `?noglow=1` da rodada 17 fechou o mapa:
   sem o glow o warpAsym das partículas é **+0,337** (sinal certo, quase no alvo) —
   o S existe e o glow o esconde por CONCENTRAÇÃO DE FLUXO (R90 encolhe, a janela
   0,7–1,1·R90 do gate cai abaixo dos 8,4 kpc onde o warp começa); mas o glow é
   insubstituível como halo quente (colourZ alto 0,48→0,01 sem ele), flancos e
   espessura (axialRatio 0,036→0,019). ~~A alavanca com ganho duplo previsto:
   escurecer o brilho interno~~ — **medida e substituída na rodada 18**. A campanha
   de varredura (14 configs; knobs por query `?exp= ?glowgain= ?idim= ?ir0= ?cnt=
   ?hzs= ?warpamp=`, harness `sweep.mjs` no scratchpad) estabeleceu, com memorando
   de fotometria por trás: **nosso R90 edge 0,43·R_disco é o valor CORRETO de
   fotometria linear** (disco exp h_R 2,6 kpc + bojo B/T 0,15 edge-on dá 0,40–0,46;
   van der Kruit & Searle 1981) — o 0,55 da referência vem do TONE MAP de divulgação
   (asinh/filmic, knee ~3% do pico, 1,5–2 dex de compressão). O gap era curva de
   tom, não perfil de massa: escurecer o interior de verdade (idim) só removia os
   flancos da faixa (edge 0,884) e o glow é intocável (0,85× → 0,926).
   **O que fechou a rodada 18: auto-exposição 1,02 → 1,40 pela rampa `galaxyFade`**
   no director (a vista externa é outro assunto fotográfico; `?exp=` segue
   soberano): edge 0,8741 → **0,8380**, face 0,0615 → **0,0595**, grain
   0,103 → 0,099, laneOffset 0,56 → 0,40. Custo: discMean face-on deriva para
   0,178 (alvo 0,1175).
   **Rodada 19 — knee asinh pré-ACES construído e varrido (12 configs): os dois
   gates DISCORDAM da curva de tom.** O passe existe em `post.ts` (compósito HDR
   entre bloom e OutputPass — por camada não funciona: sprite aditivo é minúsculo e
   asinh(x)≈x, a compressão tem de ver a SOMA; rampa `galaxyFade`, knobs `?knee=`
   β e `?kneemode=lum|rgb`, rgb vence, default DESLIGADO). Fronteira de Pareto
   medida: A sem-knee/exp1,4 = edge 0,8380 · face 0,0595 · disc 0,178; B knee
   0,45/exp 1,05 = 0,8442 · 0,0516 · 0,131; C knee 0,6/exp 1,1 = 0,8467 ·
   **0,0487** · 0,141. Não há ganha-ganha, e o mecanismo é conhecido: o edge só
   prefere A porque exp 1,4 DESSATURA via ACES o plano vermelho — a MESMA
   deficiência (colourZ baixo 0,33 vs 0,19) que a rodada 17 tentou tratar com rim
   light. **Consertado o vermelho do plano na fonte, o knee (C) deve virar vitória
   dupla** — era a ordem de ataque, e a **rodada 20 confirmou em uma tacada**:
   `chromsat` (o matiz da extinção satura para NEUTRO em τ alto — nuvem densa real
   é cinza-escura, não infinitamente vermelha; `1−e^(−τ·0,5)` misturando o expoente
   cromático para 1,0) tirou o colourZ do plano de 0,30 para 0,24 sem adicionar
   luz, e com ele o conjunto **chromsat 0,5 + knee 0,45 + exp 1,05 venceu os dois
   gates: edge 0,8380 → 0,8282 e face 0,0595 → 0,0526 (oficiais), discMean
   0,178 → 0,131, laneDepth 0,670, warpAsym −0,033**. Defaults adotados (rampa de
   exposição agora 1,02 → 1,05; knee ligado por padrão; `?chromsat= ?knee= ?exp=`
   seguem soberanos para varredura); custo t=0 inalterado (mean 18,5 ms).
   Pendência de coerência: starForges ainda usa o expoente cromático SEM
   saturação — unificar quando as forges entrarem na lei única (unificação 2).
   **Rodada 21 — o warp da literatura entrou: amplitude 820 → 1310 pc** (o preço
   em laneDepth que barrou o multiplicador na rodada 18 CAIU pela metade sob o
   regime chromsat — medir o preço de novo quando o regime muda é a lição). 1310
   casa com Skowron 2019 extrapolado à borda (1264 pc em 16,8 kpc, Δ4%) e é o teto
   defensável; o gate ainda melhorava ali (gradiente negativo), acima é ficção.
   Oficiais: **edge 0,8282 → 0,7895 (primeiro <0,80; era 2,0258 na rodada 12) e
   face 0,0526 → 0,0467**; warpAsym +0,14, warpAmp 0,0154 (alvo 0,0187), axial
   0,0374. laneDepth 0,62 segue o maior termo do edge (~0,32), com laneOffset
   0,63 acoplado (~0,12).
   **Rodada 22 — o halo térmico oblato: edge 0,7895 → 0,6535.** Re-precificação
   sob o regime novo confirmou os becos da fenda (τ0 4/6 pioram) e das 32 amostras
   (idem) como transversais a regimes; `?pos=` NÃO reproduz a câmera do rig (roll
   e composição — vantagem só por keyframe); bloom inocentado da faixa
   (?nobloom idêntico). O que faltava às bandas altas era um COMPONENTE: um
   segundo billboard quente (bojo estendido/disco espesso não resolvidos, ganho
   0,3 × 6 kpc, joelho varrido 0,05–0,4) com **lei de caminho 1/μ do oblato** —
   de cima a coluna é curta e ele some (face fica na banda de ruído POR FÍSICA;
   sem o gate, virava bolha central e o face pagava +0,011), de raspão ele é a
   luz quente. Oficiais: **edge 0,6535 / face 0,0480**; axialRatio 0,0581 (alvo
   0,0598 ≈ cravado), warpAmp 0,0191 (alvo 0,0187, CRAVADO), laneDepth 0,73,
   colourZ 0,27/0,35/0,62 (médio passou do alvo 0,298 — pagamento aceito; alto
   quase lá). Restam do edge: laneDepth 0,73→0,94 (~0,21), warpAsym (o halo
   mascara parte do S de novo — ~0,29 com o termo), colourZ médio, laneOffset.
   **Rodada 23 (becos, zero default):** τ0 próprio do halo 5/8 piora (os ombros
   da fenda dele são enchimento E flancos ao mesmo tempo); fenda seguindo o warp
   é no-op DEFINITIVO (±1 bit-idênticos — nem o halo de 6 kpc alcança os 8,4 kpc
   com fluxo; morta em dois componentes e dois regimes); afastar a câmera COM
   ângulo preservado (R=30 kpc, 1,19°) mata a faixa por SUB-RESOLUÇÃO — o que
   levou à descoberta da rodada 24.
   **Rodada 24 — QUEBRA DE PROTOCOLO (aprovada pelo usuário): capturas 1800×1800.**
   O analisador edge reduz tudo a 1200; a referência 5k sempre caiu nessa grade e
   a captura de 900 era analisada em 900 — protocolo assimétrico que sub-resolvia
   a fenda (laneDepth 0,73 medido onde o render tem 0,90) e inflava o grain por
   aliasing (0,102 → 0,070 real, alvo 0,068 CRAVADO). Re-baseline oficial, zero
   mudança de render: **edge 0,6992 · face 0,0339** — números NÃO comparáveis aos
   anteriores. A verdade nova do edge: laneDepth 0,9044 (quase alvo), laneOffset
   0,05 (cravado), MAS axialRatio 0,0958 vs 0,060 e warpAmp 0,0323 vs 0,0187 —
   **as doses do halo (0,3) e do warp (1310) foram calibradas contra a métrica
   aliasada que subestimava espessura e warp; re-dosar sob o protocolo novo é a
   próxima rodada** (halo ~0,15–0,2?; warpamp ~0,8 = 1048 pc, ainda dentro da
   faixa 1,0–1,6× da literatura).
   **Rodada 25 — re-dosagem sob a régua honesta: o warp VOLTOU ao 820 original.**
   Varrido: 1,0×(1310)→0,699 · 0,8×→0,677 · 0,63×(≈820)→**0,645** — o gate quer o
   piso da literatura, e o impulso da rodada 21 era artefato do protocolo
   aliasado (ironia simétrica: a régua torta pedia o teto). Reduzir o halo NÃO
   paga (0,15→0,748, 0,2→0,717 — os flancos dele valem mais na faixa do que a
   espessura cobra); halo fica em 0,3. Oficiais: **edge 0,6441 · face 0,0333**;
   thickRatio 0,0494 CRAVA (alvo 0,0502), laneDepth 0,9100 (alvo 0,9386),
   grain 0,0701 segue cravado. Termos abertos da era nova: axialRatio 0,0924 vs
   0,0598 (o h50 global — bojo/halo verticais demais na régua honesta, mas o
   knob simples do halo não resolve sem pagar a faixa) e warpAmp/warpAsym
   medidos (0,033/−0,46) que agora capturam estrutura vertical que a régua velha
   borrava — entender ANTES de mexer (pode ser flare, anã de Sgr, ou assinatura
   real do perfil de espessura da referência).
   **Rodada 27 (2026-08-03) — a questão vertical da r25 RESOLVIDA em mecanismo,
   e o maior salto da série: edge 0,6456 → 0,4396.** Ablação por componente
   (halo=0 / noglow / warpamp=0) + probe de linearidade (0,5×/−1×) provaram:
   (a) o warpAsym −0,353 era NOSSO warp com a QUIRALIDADE INVERTIDA contra a
   recriação-alvo — warpAsym escala linear com o multiplicador e inverte com o
   sinal; a câmera do gate está na linha de nós, onde a fase certa projeta o S
   certo (+0,219, na direção do "+0,48 alvo" da r16). Como o face-on ancora o
   ponto de vista (quiralidade dos braços casada na r12), o sinal errado era do
   warp: **fase 5° → 185°** nos dois espelhos (galacticModel.ts TS+GLSL).
   Conferir a convenção contra Skowron/Chen 2019 numa rodada futura.
   (b) o termo warpAmp medido (0,032→0,0425) NÃO responde ao knob warpamp —
   mede estrutura vertical de outra origem (a leitura de "sobredose" da r24/25
   era mal-atribuída). (c) halo é dono de ~2/3 do excesso de axialRatio
   (0,093→0,052 sem ele) mas paga thickRatio/laneDepth — não é alavanca
   isolada. Custos honestos da r27: face 0,0333 → 0,0370 (3 sorteios idênticos;
   dentro do ±0,01), laneDepth 0,9052 → 0,8506, thickRatio 0,0503 → 0,0393 —
   os termos de faixa pagaram um pouco pelo S certo; re-dosagem sob a fase
   corrigida é a candidata natural da próxima rodada de edge (inclusive
   re-precificar o forgetau, cujo bloqueio era justamente o termo warp). O gate
   do céu não se moveu (1,1099) e a prova tripla está no ledger.
   **Pós-r27 (2026-08-03, sweep de re-precificação — becos e decomposição,
   zero default mudado):** (a) **forgetau segue bloqueado sob a fase 185°**:
   edge 0,4396 → 0,5371 (thick 0,0393→0,0281, wAmp 0,0425→0,0488, lane e
   lOff pioram juntos) — o bloqueio não era só o termo warp; não religar sem
   re-dosagem conjunta. (b) Ablação por componente no edge: `nowrap` é
   BIT-IDÊNTICO (cascas = zero na fotometria do edge, como no céu);
   halo=0 confirma o dono do axial (0,0810→0,0433) pagando lane/thick;
   **noglow revela que o excesso de warpAmp mora no GLOW: 0,0425→0,0195 ≈
   alvo 0,0187, com wAsym 0,219→0,425 ≈ o "+0,48 alvo" da r16** — o glow
   imprime estrutura vertical reta que o termo lê como falso warp E mascara
   o S verdadeiro. (c) **A dose do glow não é a alavanca**: glowgain
   0,92×/0,85× deixa wAmp CRAVADO (0,0427/0,0428) e paga lane/thick
   (edge 0,4406/0,4529) — o excesso é FORMA (perfil vertical/fenda reta do
   billboard), não fluxo. A rodada candidata é geométrica: o perfil
   vertical do glow sob o gate (lembrando os becos r17/r23: fenda seguindo
   o warp é no-op por falta de fluxo além de 8,4 kpc — o que sobra é a
   forma INTERNA do perfil, não a curva da fenda).
2. **Vista interna sem gate** — ~~o panorama ESO (a única foto real) não está no loop~~ —
   **gate protótipo RODOU (2026-08-02): skyError 3,719, a baseline da série
   (protocolo com `nohero=1`).** A primeira medição (3,7027, COM heróis) estava
   contaminada: os clarões cinematográficos de Sirius (l≈229°) e αCen (l≈319°)
   eram picos de 3,8×/3,5× no perfil — provado por ablação (somem com nohero;
   o calombo de l≈161° PERSISTE, é conteúdo real a identificar). Régua limpa
   revelou: rift e purp estavam sendo LAVADOS pelos flares (0,18→0,21 e
   0,049→0,068, mais perto do alvo), e a cor global é francamente vermelha
   demais (**colour 0,148 vs 0,064 da foto**) — suspeita: a cadeia de
   extinção da vista interna não tem chromsat (a pendência de coerência das
   forjas vale também aqui). Harness oficializado em
   `scripts/visual/sky-capture.mjs` (6 faces do cubo em
   `?pos=0,0,0&look=&fov=90&nosun=1&nohero=1&shot=2`, 1440²) + `scripts/visual/sky-measure.html`
   (costura equiretangular 1440×720 replicando a canonização EXATA do FreeRoam,
   orientação l do panorama resolvida SOZINHA pelas Nuvens de Magalhães — refFlip=true).
   **Um comando só desde 2026-08-06** — capturar e medir eram dois, e o
   segundo (Chrome com `file://` + `--dump-dom`) foi reescrito do zero em
   duas rodadas por viver no scratchpad. Agora:
   `node scripts/visual/sky-capture.mjs [tag] ["&query"] [--perfil]`,
   que imprime o skyError, os seis termos com o peso de cada um e,
   opcionalmente, o perfil bin a bin. Ablação é `sky-capture.mjs nowrap
   "&nowrap=1"`. Lembrete de leitura: o perfil é NORMALIZADO pela própria
   média, então ablação redistribui — comparar bin a bin, nunca só o agregado.
   Pré-requisito que caiu: o slerp de entrada do FreeRoam não convergia sob
   virtual time e as faces saíam com orientação intermediária (faixa diagonal
   ~38°); `placeCamera` agora encaixa a orientação canônica no frame 1
   (`snapCanonical`, cameraRig.ts) — `?pos=` é determinístico em orientação de
   verdade. Diagnóstico da primeira medição (alvos = coluna ref):
   **bulgeAnti 18,9 vs 5,6** (bojo domina 3,4×; a faixa do anticentro é fraca
   demais), espessura por longitude irregular (1,75–13,5° vs 3–6,5°; onde a
   faixa apaga, o fundo domina a meia-altura), rift 0,18 vs 0,24, colour 0,088
   vs 0,064, purp 0,068 vs 0,078. **E o termo mestre CAIU no mesmo dia
   (2026-08-03): o bulgeAnti 19,1 vs 5,6 era CURVA DE TOM, não modelo de
   massa — a mesma descoberta da rodada 18 no edge, agora de dentro.**
   Atribuição por ablação primeiro: nowrap NÃO move nada (cascas ≈ zero
   na fotometria da faixa), nonebula derruba bulgeAnti para 1,7 (a faixa
   difusa INTEIRA é o raymarch/LUT), nocat sobe para 29,7 (parte do pouco
   anticentro é estrela de primeiro plano). Aí a régua: o panorama ESO é
   astrofoto com stretch asinh a ~3% do pico (o memo da r18); nosso céu
   interno vive em x≲0,3 pré-ACES, onde o knee default (β=0,45, e amt=0
   dentro pela rampa) nem morde. Com REVELAÇÃO no protocolo de captura
   (`kneeamt=1&knee=0.02&exp=4.4`, knob novo `?kneeamt=` em post.ts;
   zero clipping, p99 147/255): **bulgeAnti 5,524 vs alvo 5,568 CRAVA, e
   skyError 3,719 → 1,1093 — baseline OFICIAL do protocolo v3.** O look
   do app segue soberano (olho nu ≠ astrofoto); a revelação é do GATE.
   Deficiências honestas que sobram, em ordem: ~~**(1) rift 0,036 vs
   0,244**~~ — **FECHADO EM MECANISMO NA RODADA 32** (seção própria):
   não era piso luminoso no vale e sim faixa opticamente FINA (a poeira
   da faixa integrava 0,004 mag/kpc contra ~1,5 do meio real), com a
   poeira herdando o perfil vertical das ESTRELAS — j/κ constante em z,
   fenda impossível por construção. rift 0,0369 → **0,1807** e skyError
   1,1230 → **1,0767**; e a re-dosagem conjunta bojo↔poeira que ela
   encomendou virou a **rodada 33** (seção própria): o bojo da LUT era
   uma exponencial ESFÉRICA e respondia por 88,5% da luz espúria em
   10° a 20° de |b| no miolo — achatado para c/a = 0,30 (Wegg &
   Gerhard 2013) com luminosidade conservada, e com a poeira difusa
   ganhando a escala radial que é DELA (2,1 kpc, Drimmel & Spergel 2001,
   contra os 5,2 kpc estelares que herdava), **skyError 1,0767 →
   0,9459 e rift 0,2555 contra o alvo 0,2444**. A espessura (0,416)
   segue o maior termo, e agora com endereço: 50,6% do desvio mora nos
   quatro bins do ANTICENTRO, onde a ablação apontou o **complexo de
   Órion do raymarch local** — **FECHADO NA RODADA 34** (seção própria):
   os sete núcleos artísticos do corredor da viagem moravam dentro da
   **Bolha Local**, e deslocá-los +130 pc ao longo da própria direção
   levou **skyError 0,9459 → 0,8134** e a espessura a 0,3499, com os
   gates externos bit-idênticos. Segue aberta a poeira local do Aquila
   Rift (150–600 pc) nos bins l = −34°…−19°, e o resíduo do anticentro
   passou a ter dois donos medidos (envelope de gás local e disco
   espesso da LUT — ver rodada 34);
   **(2) o PERFIL por longitude — 34% do erro, e nunca esteve nesta
   lista.** Medido em 2026-08-06 sobre o skyError 0,7885: espessura
   0,3617 (46%) · **perfil 0,2691 (34%)** · cor 0,1335 (17%) · purp
   0,0126 · rift 0,0087 · bulgeAnti 0,0029. A ordem desta lista estava
   errada por omissão: o perfil é o segundo maior e ninguém o atacou.
   Três testes fecham o diagnóstico, nesta ordem: (a) **não é rotação** —
   deslocar o nosso perfil varre um mínimo raso em −7,5° (0,2604 contra
   0,2691), sem vale; e espelhar l → −l dá 0,4216, então a quiralidade
   está certa. (b) **Não é componente sobrando** — `nonebula` 0,5123,
   `nogal` 0,3011, `nocat` 0,2869, `nowrap` 0,2692 (≈ nulo, como sempre):
   TODA ablação piora, logo o defeito é a FORMA da faixa dominante (o
   raymarch/LUT), não um intruso aditivo. (c) **É poeira faltando, e a
   assinatura é a inclinação**: a referência cai 60% em 7,5° perto de
   l = +19° (2,02 → 0,81), um degrau que ponta de braço não faz e faixa
   de poeira na frente faz; a nossa desce lisa (3,18 → 2,29). Saldo por
   setor: **+2,98 sobrando em l = +15…+45** e **−2,60 faltando em
   l = −90…−45** (Carina 282° e Centauro 310°, os tangentes brilhantes
   do céu real). Ou seja: a Grande Fenda / Aquila Rift (150–600 pc) que
   já estava anotada acima como pendência pequena vale, medida, um
   terço do erro do céu. Rodada candidata: pôr a nuvem no LUGAR e na
   DISTÂNCIA certos — a assinatura das três correções que pagaram
   (r32 poeira, r33 bojo, r34 corredor) é mudar onde a matéria está,
   não quanto ela brilha;
   **(3) colour −0,069 vs 0,064** — a revelação
   per-RGB dessatura além do alvo (β=0,1 dá +0,071 quase exato; o par
   dose↔cor precisa de uma rodada própria, e chromsat interno é candidato).
   **Refutado na rodada 35:** o catálogo 17,7× maior, cheio de anãs K/M,
   NÃO moveu o termo (0,1326 → 0,1335) — não é população, é curva;
   **(4) purp 0,066 vs 0,078** — independe do tom: população (H II /
   espalhamento), como a vista externa já sabia. O reequilíbrio 2-braços
   (marcado em `nebulaShaders.ts`/`wrappedStars.ts`) agora TEM juiz.
3. **Tonemap da referência** — comparamos nossa imagem pós-ACES com a recriação
   pós-escolhas-do-artista; irrelevante para harmônicas (razões normalizadas), camada de
   incerteza para cor absoluta.

**Auditoria científica externa (2026-08-03, 3 auditores independentes refazendo
contas):** posições/fotometria/cor aprovadas (frame galáctico bate a 4e-8; curva
T→cor a 1-2% do corpo negro+CIE; inflações de tamanho todas documentadas).
Quatro inconsistências INTERNAS registradas como candidatas de rodada:
(1) **quatro leis de extinção coexistem** — CCM89 literal nas partículas
(galaxyShaders 137/286), λ^−2,6 exagerada no campo HYG (common.ts:204, ~50%
mais íngreme que a natureza), 0,8 mag/kpc isotrópica nas cascas
(wrappedStars.ts:51), âncora 1,5 mag/kpc no bake — unificar É a pauta da
unificação 1; (2) luz estelar com duas escalas radiais — partículas 2600 pc
vs LUT da faixa 5200 pc (nebulaShaders.ts:102; direção defensável, 2× não
documentado); (3) disco espesso das cascas com R_d 3600 pc — literatura ~2000,
MAIS CURTO que o fino, não mais longo (wrappedStars.ts:203); (4) pitch externo
de Sgr-Carina 10,1° vs ~1,0° de Reid 2019 (suavização sem registro). A fase
185° do warp (r27) CONFERE com o warp real: máximo norte no quadrante l≈90°,
nó a ~−5° do eixo Sol-GC vs +17,5° de Chen 2019 — desvio aceitável.

## As três unificações

A visão não se decompõe em features, e sim em três coisas que hoje existem em
duplicata. O trabalho é fundir cada uma:

**1. Uma cadeia fotométrica.** Magnitude → fluxo → pixel, uma vez só, compartilhada
por todas as camadas. *Parcial:* o campo HYG já recalcula `m` da câmera e desenha PSF
de largura fixa em px. *Falta:* exposição compartilhada entre camadas, e o tonemap —
medido travando a faixa dinâmica em 2,3 mag contra os 8,6 do catálogo, hoje o teto real
do campo estelar.

**2. Uma lei de população estelar.** "Estrela" tinha quatro representações com regras
diferentes: HYG, star forges, wrapped stars e as 2,7 M partículas da galáxia.
*Etapa 1 FEITA (rodada 13):* `wrappedStars.ts` reescrito como **cascas por bin de M_V**
(7 bins, lado = 2× o alcance do membro mais brilhante com M_FAINT 11,75 e extinção
0,0008 mag/pc ⇒ sem popping por construção), identidade por hash das coordenadas
inteiras da célula, densidade decidindo **existência** (rejeição; onde ρ·prob satura,
o excedente é luz não resolvida — limite de confusão), anti-dupla-contagem por
m_sun < 7,2 (o corte vs HYG), e **uma só lei fotométrica** (`GLSL_STAR_PSF` em
common.ts, compartilhada com o catálogo — também um passo da unificação 1).
`buildFarStars` deletado: era um halo estático no Sol; as cascas cobrem o papel dele em
qualquer ponto do disco. O floating origin entrou como reconstrução relativa à câmera
(célula inteira f64 na CPU + fração no shader, projeção só com a rotação do MV) — nenhum
operando de kpc no caminho da posição. Gates externos inalterados por construção
(edge-on 2,0258 bit-idêntico; face-on no ruído de captura).
*Etapa 2 FEITA (rodada 14):* handoff `unresolved(d)` — as cascas resolvem 3,8% da luz
total em d→0 (quota de luminosidade × completude do clamp, por bin), e exatamente essa
fração sai das partículas (`GALAXY_VERT`) e do termo estelar da LUT da faixa; além de
5,2 kpc a função é 1,0 EXATO, e o edge-on saiu bit-idêntico (2,0258 em todos os campos).
O custo foi MEDIDO por CDP a 2560×1440: as cascas analíticas custavam +5,3 ms de média
(metade dos frames a 30 Hz); com a densidade pelos canais B/A do dust map (1 fetch no
lugar de ~40 transcendentais × 296 k vértices — o mesmo padrão do envelope do raymarch)
o custo caiu para +0,3 ms, p90 de volta a 16,7 ms. Limitações aceitas e comentadas: a
completude do clamp usa ρ=1 (efeito total ≤4%), nós H II e anã de Sagitário dimam junto
(casca não os desenha — sobre-desconto ≤4% local), extinção cromática por raymarch só no
HYG. *Falta:* star forges e partículas ainda são leis próprias — etapas seguintes.
Descoberto no caminho: a captura headless tem NÃO-DETERMINISMO intermitente (duas
capturas do mesmo estado diferem em md5 às vezes; é a fonte do ruído ~0,013 do ledger) —
md5 igual prova igualdade, md5 diferente não prova nada.

**3. Um meio volumétrico.** Hoje a poeira tem duas representações que não se conhecem:
~430 k sprites na vista externa e um raymarch local, ligados por crossfade. O dado já é
único (mesmo campo de densidade); o que está duplicado é o **integrador**. Decidido:
**coluna fechada sobre um Σ único**, `L = Σ_j·F(τ)/|μ|` com `F = (1−e^−τ)/τ` — a integral
fecha em elementar e a altura de escala não aparece, o que dissolve as três alturas
incompatíveis do projeto. O `1/|μ|` é a lei de caminho que as 7 lâminas não têm e por cuja
falta elas são desligadas de raspão.

Ordem entre elas: 1 antes de 3, porque calibrar cor com fotometria torta é calibrar duas
variáveis ao mesmo tempo. 2 é independente de 3.

**Só um terço da unificação 3 é arquitetura**, e a parte que entrega a cor não é o
integrador:

| peça | o que é | o que entrega |
|---|---|---|
| (a) um κ e um Σ | uma constante + calibração offline | nada visual; sem ela (c) não significa nada |
| (b) Σ_j como soma de populações | ~25 linhas em `galaxyShaders.ts` + `galaxy.ts` | **todo o gap de cor** |
| (c) o operador de coluna | shader de ~40 linhas num quad | ordenação ⟨j·T⟩, silhueta da fenda, 1/μ, e apaga os sprites |

Estado: (b) **feito** (rodadas 02–07). De (c), a **ordenação** já entrou nas lâminas —
`F(τ) = (1−e^−τ)/τ` no lugar de atenuação linear, com uma única profundidade óptica
servindo fluxo e matiz (rodada 08, `harmonicError` abaixo de 0,10 pela primeira vez).
Também de (c), o **comprimento de caminho** entrou (rodada 09): a lâmina baka a
profundidade óptica PERPENDICULAR no canal A e o fragmento reconstrói a coluna no ângulo da
visada. Escrito já cancelado — `(1 − e^{−τ⊥/μ})/τ⊥` — porque os dois μ se anulam: fino
brilha como 1/cos, espesso satura na função-fonte, sem clamp artificial. Medido: 2,19× em
t=162, 1,75× em t=150, 1,00× de topo (instantes da linha do tempo pré-r26 — medições da
rodada 09). Falta de (c): a substituição dos 430 k sprites pelo
quad único — que é também o que resolveria as sete listras de raspão, um artefato de
DISCRETIZAÇÃO que o 1/μ não toca (por isso o fade rasante continua lá). Falta (a) inteiro: a calibração offline
que dá significado absoluto a κ — hoje o 2,39 é escala honesta sobre resposta normalizada,
não profundidade óptica medida.

**Remoção dos sprites: branch `quad-unico`, gate REVERTIDO NA RODADA 12 para o melhor
valor da série.** A rodada 11 tinha reprovado com m=4 cravado em 0,259 (dez medições
provaram que era da EMISSÃO — os sprites mascaravam multiplicando a cena em screen-space).
A **rodada de emissão 2 braços** (aprovada e feita em 2026-08-01) resolveu por modelo:
emissão estelar com par dominante **Sct-Cen + Perseu** (symIndex ímpar; modulação pura,
base 0,42 × (1 ± profundidade) — a profundidade era 1,0 em todo raio até a rodada 30,
que a fez cair a 0,5 entre 7,6 e 11,5 kpc) e **gás/H II/jovens uniformes em 4** (Drimmel) — `uniformWeights`
agora de fato ligado nos mapas, `galMajorArmsGas` no raymarch, nós H II a 0,82 fixo.
Mais dois ajustes medidos: braço das lâminas ~12% mais largo (sharpness −20%; largura ∝
1/√sharpness — a razão m2/m4 com modulação pura é ĝ(2)/ĝ(4) da crista) e par de 3 kpc
0,51 → 0,43. Resultado (rodada 12): `harmonicError` **0,0696 — recorde da série** (melhor
anterior 0,0989 na era dos sprites; a rodada 11 estava em 0,1718), m=4 0,225, m2/m4 1,09,
grain mantido em 0,109. A variância captura-a-captura do MESMO estado mediu 0,0696–0,0823
em 4 medições — mesmo o pior sorteio segue recorde; deltas menores que ~0,013 entre
rodadas são ruído de captura, não sinal. m=4 não cravou os 0,208 do alvo (+8%), mas TODOS
os harmônicos melhoraram contra a rodada 11 e a nota honesta é a melhor já medida — sem
truque de sprite. **Mergeada em `main` (2026-08-01)** — "sem truques de sprite" está
concluído. A fila agora é: escurecer o brilho interno das partículas (a alavanca de
ganho duplo da lacuna 1 — R90 edge para fora + discMean face-on para baixo) e as
etapas restantes da unificação 2 (star forges e partículas sob a lei única).

Na vista INTERNA (sem gate — lacuna 2) a emissão estelar segue com 4 braços de gás de
propósito: raymarch da faixa e wrapped stars usam a variante uniforme, porque o par fraco
com peso 0 exato apagaria as nuvens estelares de Sagitário e decorrelacionaria estrelas do
gás. Reequilibrar a vista interna para 2 braços (com piso > 0) é trabalho de quando o gate
do panorama ESO existir — os comentários em `nebulaShaders.ts` e `wrappedStars.ts` marcam
o ponto.

Becos medidos na rodada 12 (não repetir): piso da espinha 0,78 → 0,86 SOBE m=1
(0,120 → 0,129); aditivo `formationResponse` 0,16 → 0,10 não move m=4 (0,0015); par de
3 kpc abaixo de 0,43 piora (harmonicError intermediário 0,0751 → 0,0779 com 0,37, medição
`med.mjs` no MESMO quadro — comparável entre si, não com o 0,0696 oficial de outra
captura).

Becos medidos na rodada 15 (não repetir): interbraço de partícula 0,70 → 0,76 não move
m=4 e piora m=1/grain; termo largo do bake τ 0,31 → 0,10 move o face-on só −0,002 e
custa +0,054 no edge-on (a faixa perde profundidade — o termo largo É parte da coluna
que a faixa precisa).

Becos medidos na rodada 16 (não repetir): fenda RETA do glow τ0 2,5 → 5,0 aprofunda a
faixa (+0,067) mas imprime um anti-S no centroide vertical por coluna (warpAsym
−0,01 → −0,21, saldo pior — a fenda é uma reta em z de view-space sobre um plano
curvo; uma fenda que SIGA o warp destravaria esse ganho); early-exit por saturação no
loop de amostras não paga (divergência de warp de GPU — 0,2 ms de ganho com 32
amostras); tirar atan/sin do galWarpHeight pela identidade sin(atan(y,x)−φ) =
(y·cosφ−x·sinφ)/r é exato e não move o frame (o custo do loop é fetch, não ALU);
afastar a câmera para R=36 kpc mantendo z=500 não achata a perspectiva do rim —
elevação 0,8° reentra no regime dentro-da-lâmina (edgeError 1,77, faixa morta).

Becos e achados medidos na rodada 18 (campanha de varredura, não repetir os becos):
qualquer escurecimento do glow paga caro no edge (0,85× → 0,926; 0,7× → 1,017 — ele é
flanco, halo quente e espessura ao mesmo tempo); idim (gaussiana interna nas
partículas) ganha só no face e paga a faixa; exposição ≥ 1,8 degrada as harmônicas
face-on (0,096 em 1,8); **warpamp 1,2–1,4× faz o S emergir de verdade (warpAsym
−0,07 → +0,11) mas laneDepth paga 0,64 → 0,54 e o saldo é pior** — questão ABERTA:
nosso warp está no piso da literatura (220 pc em R=12 kpc vs 360–480 de Chen/Skowron
2019) e o multiplicador volta ao jogo quando o acoplamento faixa↔warp for entendido
(suspeita: lâmina de partículas warpada × fenda reta do glow se desalinham).
Densidade 1,6× (cnt, alpha compensado): grain 0,099 → 0,084 (alvo 0,068) com gates
neutros — candidata real quando grain for o alvo ativo, custo de vértice a medir.

Becos medidos na rodada 17 (não repetir — nenhum mudou o código, tudo revertido):
rim light azul ADITIVO no caminho de extinção (campo × λ^−1,3 × atenuação, a lei do
bake) estoura com qualquer ganho útil — ∝ caminho: edgeError 1,32, colourZ do plano
passa do alvo (0,10) e laneDepth 0,66→0,37; a forma SATURANTE (véu ∝ 1−e^−τ, ganho
0,4) acerta o plano (0,207) mas azula mid/high que pedem QUENTE — cor líquida zero,
laneDepth paga 0,06: edgeError 0,97. A aritmética é estrutural (cor ganha ~1:3,
faixa paga ~1:1) — véu aditivo não fecha esta conta em nenhuma dosagem. Fenda do
glow SEGUINDO o warp: inútil — não há fluxo de glow em r > 8,4 kpc para a curva
cortar (quiralidade ± medidas idênticas, 0,913/0,916), e o τ0 = 5,0 que pagava na
vantagem z=901 NÃO transfere para z=500 (laneDepth não sobe e axialRatio paga).

## O roteiro cinematográfico (rodada 26)

Reescrito do zero como SHOTS paramétricos (`journey.ts`): 4 atos, ~5min21
(Sol em hélice → Órion → mergulho de 8 kpc ao centro → Sagittarius A* →
revelação externa → "você está aqui"). O que ainda decide algo:

- **Os quadros de medição são HOLDS exatos** (t=261 perfil, t=293
  face-on; câmera idêntica às rodadas 16–25). O rig antigo inclinava a
  câmera nas curvas e as capturas oficiais saíram com esse roll —
  medido reproduzindo o rig antigo congelado até convergência
  (0,041510 rad no perfil, 0,060000 no face) e ASSADO nos holds. Mudar
  qualquer um desses números descompara os gates com todo o histórico.
- **Sagittarius A* existe como PASSE DE PÓS** (`blackHole.ts`,
  retrabalhado após feedback do usuário sobre custo e fidelidade):
  raytracer de geodésicas Schwarzschild em dois estágios — MARCH num
  alvo com ORÇAMENTO de pixels (2,6/1,7/1,0 MP por qualidade; o truque
  da própria demo de referência, que limita o buffer a 3,8 MP) +
  COMPOSITE em resolução nativa com deflexão analítica fraca (α≈2RS/b)
  fora da zona forte. A lente dobra a CENA REAL (tDiffuse do composer)
  — o que a demo fazia com céu procedural. Passe `enabled` só a
  <2,4 kpc do GC: custo ZERO de longe (o composer o pula; shader nem
  compila) e os gates externos ficam intactos por construção; a
  extinção real (~30 mag no visível) justifica o fade. Escala artística
  documentada: RS 0,05 pc (≈1,2e5× o real, que é invisível por
  natureza); a física é adimensional em RS. Doses ANTI-demo medidas em
  captura: disco 26 RS (não 40) e opacidade externa 0,55 (não 0,8) —
  sobre o fundo DOURADO do nosso núcleo o anel externo não brilha,
  vira silhueta; e a rasante passa a 30 RS (1,5 pc — os presets da
  demo orbitam a 24–28 RS: é a PROXIMIDADE que enche o quadro, não o
  tamanho). Knobs: `?nobh=1`, `?bhgain=`, `?bhsteps=`.
- **O near-clip agora segue min(dHome, dGC)** — sem isso o near de
  ~32 pc comia o buraco negro na rasante (e qualquer geometria local
  perto do GC).
- Voo livre no MESMO referencial galáctico da viagem (era a diferença
  de "norte" que invertia o horizonte ao entrar no modo livre) +
  clicar-num-rótulo viaja até a estrela.

**Bug latente achado pela auditoria da rodada 26 (workflow adversarial): a
extinção por coluna das forjas NUNCA ligou** — o director chamava setTauMap
antes de criar as forjas e o `?.` engolia. A dosagem edge inteira (r15–25)
foi calibrada com as forjas sem extinção. Ligar sob a dosagem atual foi
medido: **edge 0,6441 → 0,7862 (thickRatio 0,050 → 0,040) e face
0,0333 → 0,0301 (melhor da era 1800px)**. Decisão: fica desligada por
padrão (`?forgetau=1` liga), e a ~~rodada futura de re-dosagem sob o regime
corrigido~~ — **rodada FEITA (2026-08-02, sweep de 6 configs): halo/glow NÃO
fecham a conta.** Série (edge · thickRatio · axialRatio · warpAmp):
ft só 0,7862·0,040·0,093·0,039 → ft-h35 0,7667·0,047·0,101·0,041 →
ft-h40 0,7482·0,055·0,109·0,044; glowgain 1,1 é neutro-negativo (edge ~igual,
face paga 0,031→0,034). Mecanismo: o halo recompra a espessura MAS infla
axialRatio (já o pior termo aberto), e o forgetau SOBE o warpAmp medido
(0,033→0,039-0,045 vs alvo 0,019) — a luz não-extinta das forjas mascarava
estrutura vertical que a régua honesta já mede acima do alvo. O resíduo
(~0,10 mesmo com thickRatio recomprado) mora nos termos warp/axial.
**Alavanca seguinte nomeada: ENTENDER a estrutura vertical da era 1800px
(axialRatio 0,092 vs 0,060 e warpAmp/wAsym) — a questão aberta da rodada
25 — ANTES de nova tentativa de ligar o forgetau.** Não repetir: halo >0,4
sob forgetau (axial explode), glowgain 1,1, ligar sem re-dosar.

## O Sol procedural (transplante 2026-08-03)

O Sol simples (esfera fbm + 3 coroas) foi substituído pelo Sol procedural do
projeto irmão `Novo-Sol-Fable-3d` (mesmo autor, three 0.185, zero deps). O que
ainda decide algo:

- **Núcleo VENDORIZADO VERBATIM em `world/sol/`** (fábricas `createX(ctx)`),
  adaptador + orquestração por frame em `world/novoSol.ts` (porta do animate()
  original: sim de convecção fatiada, bake da cromosfera 8 Hz/8 fatias, ciclo
  de 11 anos, manchas com vida, flares two-ribbon, proeminências instanced,
  espículas, loops RK4, coroa de raias). Corrigir bug do núcleo = corrigir LÁ
  e re-copiar; o wrapper é nosso.
- **Escala/tempo**: núcleo em unidades de doador (R=2,2) dentro de um group
  com `scale = sunRadius/2,2`; `uCamDist` alimentado em unidades de doador
  ×correção de fov (o LOD do disco foi calibrado a fov 42°). O relógio é o
  VISUAL do director (0 sob `?shot=`): o construtor faz um PRIME síncrono
  (semente+48 passos do sim + 1 bake completo) para t=0 nascer apresentável —
  sem ele a captura fotografa disco sem cromosfera.
- **Pipeline**: o pós do doador (bloom/AgX próprios) NÃO viajou; o Sol
  atravessa o nosso composer (ACES 1,02 + UnrealBloom 0,82). O look aguenta —
  dose fina fica para quando o dono julgar ao vivo.
- **Knobs nos defaults de fábrica de lá** (tabela `KNOBS` no wrapper),
  overridáveis por URL (`?solcvol=0`, `?solcme=1.5`…). Exceção dosada:
  cme 1,4 (doador 0,9 — calibrado contra a exposição 0,418 de lá; no
  nosso ACES a casca competia com a coroa e mal aparecia).
- **Fase 2 FEITA (2026-08-03): coroa volumétrica + CME.** Três pontes de
  escala medidas: (a) os raymarch correm em ESPAÇO DE MUNDO
  (cameraPosition/vWorld) — `#define SUN_R` dos fragments usa
  `ctx.SUN_RADIUS_WORLD` (parsec), o vertex das partículas segue no raio
  do doador (atravessa o modelViewMatrix escalado); (b) `uZScale` no
  gl_PointSize (o piso `max(0.1, -mv.z)` estourava em parsec); (c)
  inversas de rotação SEM matrixWorld (herdaria a escala do group) —
  sempre da quaternion. **Armadilha que custou uma rodada de diagnóstico:
  os gates de knob do núcleo leem `ctx.subToggle.<camada>` — campo
  faltante = camada morta SILENCIOSA** (a CME rodava o relógio com casca
  invisível; grep `subToggle\.` no vendorizado lista o contrato).
- **Camadas de limbo com fade por distância (wrapper):** o zoom do
  doador parava em ~14 R e proeminências+bloom viravam BOLAS no recuo
  da hélice (regime que lá não existia). `limboFade` 35→60 unidades de
  doador zera proeminências/loops — fisicamente honesto (invisíveis a
  distâncias estelares) e os close-ups ficam intactos.
- **Dramaturgia do arranque (pedido do dono): mínimo→máximo na hélice.**
  Fase 0,02 em t=0 (disco quase limpo) → 0,50 em t≈29 (solarMaxK pleno),
  dirigida por journeyT com easing — determinística sob seek e captura.
  Salto de fase >20 unidades (seek/?t=) dispara catch-up síncrono:
  sim + re-bake completos, senão a foto mostra fase nova com cromosfera
  velha. Prime alongado para 320 passos (o Br semeado precisa RELAXAR
  até as cargas fracas do mínimo — com 48 passos o disco nascia com
  filamentos de campo inexistente). Depois de t≈29 o ciclo segue em 1×.
- **Eventos provados ao vivo (CDP, ?t=20 sem shot):** flare natural
  flagrado (w 0,83 e 0,70 em duas vigilias de ~15 s), CME completa
  fotografada (casca de 3 partes + ejecta por transform feedback,
  cinemática 0→3,3 R em ~8 s), cvolReady e bake ciclando.
- **CROSSFADE disco→estrela (2ª volta, feedback do dono: "círculos que
  indicam").** O que o dono leu como retículo de UI era artefato: o
  NÚCLEO da PSF (`exp(-r²·90)` + espinhos) é muito mais apertado que o
  disco nessas distâncias, então imprimia um PONTO BRANCO no meio dele.
  Provado por ablação — e a ablação só funcionou depois de neutralizar
  os escritores por frame (`sunStar.update`, `group.visible` e os
  uniforms são reescritos todo frame; `visible=false` via console é
  desfeito no frame seguinte e a primeira leitura mentiu). Três peças:
  (a) `uWorldFade` no disco e nas espículas + `uRayBoost`/`uHalo`
  escalados — o disco (escala ARTÍSTICA, 0,011 pc ≈ 5e5× o real) sai de
  cena entre 0,16 e 0,34 pc, onde a física manda um ponto; (b) o clarão
  entra por GANHO (`uGain`), não por tamanho — clarão pequeno sobre
  disco grande é ponto de mira, clarão do tamanho certo subindo em
  brilho é o disco estourando de luz; (c) `uCore` só acende depois que
  o disco saiu (0,30→0,42 pc). Fades em pc REAIS, não na régua do
  doador: o fov varia 26°→56° na hélice e a régua corrigida por lente
  balançaria o fade junto com o zoom. Sequência conferida: 0,14 pc
  disco pleno → 0,22 disco com halo → 0,32 estouro branco → 0,39
  estrela com espinhos.
- **De longe o Sol é ESTRELA, não bola (feedback do dono: "vista
  afastada irreal").** `SunStar` em heroStars.ts: a MESMA PSF dos
  heróis com magnitude VIVA (M=4,83 + 5·log10(d/10) — a 0,5 pc vale
  −1,7, o brilho de Sirius vista da Terra), na lei ANGULAR
  1,75°·10^(−0,3m) com teto 40° (a lei de mundo dos heróis explode
  ~d^−2,5 de ângulo vista de dentro do sub-parsec) e portão de
  proximidade 0,28→0,50 pc (com o disco resolvido, o assunto é a
  superfície). `depthTest:false` obrigatório: o glare é artefato de
  olho — com depth o disco opaco furava um buraco no clarão. O disco
  âmbar H-alfa é estética de telescópio: correta de perto, e de longe
  o clarão branco a engole — unificação 2 avançou (o Sol entrou na
  lei fotométrica única).
- **Tier congelado no init** (cinema→high, alta→mid, performance→low), mesmo
  precedente do populationScale; mudar qualidade ao vivo não reconstrói o Sol.
  O tier `low` só passou a ser ALCANÇÁVEL em 2026-08-04 (ver auditoria abaixo)
  — antes disso `?q=` chegava depois do init e nunca tinha sido exercitado.
- **Gates provados intocados nas DUAS fases**: edge 0,4396 com todos os
  termos idênticos; face BIT-IDÊNTICO (md5 igual à captura pré-transplante,
  3 medições em 3 estados do código). O céu usa `?nosun=1` por protocolo.
  Perf headless t=1 (fase 2): p50 16,7 segura; cauda p99 66 ms a re-medir
  em janela real (candidatos: fatia de bake, RK4 dos loops, cvol).
- **Réguas do doador que valem manter**: A/B mesma-cena (edição on/off no
  mesmo seed) — "ganhos" cruzando seeds diferentes são variância; ruído
  sempre em espaço de OBJETO (padrão gira com a esfera); macro-evolução
  desacelerada (MACRO_SLOW 0,15) sem tocar a vida fina.

## Auditoria de engenharia (2026-08-04) — o que sobrou como regra

Rodada de corretude, **sem mudança de imagem: os dois quadros de medição
saíram BIT-IDÊNTICOS** (md5 igual antes/depois em face-on t=293 e edge-on
t=261, 1800², o padrão de prova do projeto). O que ainda decide algo:

- **Ordem de aplicação de `?q=` é contrato, não detalhe.** O parâmetro é lido
  agora no construtor do `Engine`; lido depois do `init()` (como estava) ele
  não alcançava NEM a população da galáxia NEM o tier do Sol — os dois maiores
  custos, decididos antes. Medido depois do conserto, vértices do grupo da
  galáxia: cinema 2.756.819 · performance 884.819, e tier do Sol `high` →
  `low` (antes o performance ficava nos dois números do cinema).
  **Regra: knob que decide ALOCAÇÃO tem de ser lido
  antes de quem aloca.** O mesmo vale para qualquer knob futuro de custo.
- **Bug destapado pelo conserto acima:** `ctx.cmePts.meshes` nasce `[null,
  null]` e o tier `low` (cmen=0) nunca as preenche — a ponte `uZScale` do
  wrapper estourava o construtor inteiro. Consertado com `m?.`. A lição é a
  mesma armadilha do `subToggle` da fase 2: **o núcleo vendorizado degrada por
  campos ausentes/nulos, em silêncio**; toda ponte nossa para dentro dele
  precisa assumir peça ausente.
- **Exposição manual agora LATCHA** (`director.setExposure`): o tick reescrevia
  a auto-exposição por rampa todo quadro e o controle ao vivo não fazia nada —
  o link com `?exp=` só valia recarregando. `?exp=` segue soberano nos gates.
- **`setToneMapping` não precisa de traverse.** A cena só renderiza dentro do
  composer; com render target amarrado o three compila tudo com `NoToneMapping`
  e o operador é do `OutputPass`. O traverse recompilava a cena inteira sem
  efeito visual — era o hitch que o warm-up existe para evitar. Removido.
- **Os harness de gate agora GRITAM.** `rodada.mjs` e `sky-capture.mjs` apagam
  o PNG antes e exigem status 0 + arquivo depois: um Chrome que morre deixava
  a captura da rodada anterior no lugar, ela passava pela rede "face ≠ edge" e
  o ledger recebia número plausível da imagem errada.
- **Seis violações das regras de GLSL do README corrigidas** (3 `pow(x,2.0)`
  com base possivelmente negativa, 3 `smoothstep` com bordas invertidas). Não
  havia falha reproduzida neste driver — é portabilidade. Duas moram no núcleo
  vendorizado (`sol/sun.js`): **divergência do doador, levar na re-cópia**.
- **Não tratado, de propósito:** `npm audit` acusa 10 vulnerabilidades, todas
  em ferramenta de desenvolvimento (`--omit=dev` dá zero). Não é o bundle nem
  o runtime; atualizar arrasta Vite/Rollup e o custo é maior que o risco de um
  dev server local.

## Auditoria de otimização (2026-08-05) — o que sobrou como regra

Duas auditorias externas (uma original, uma re-auditando a primeira) foram
conferidas contra o código por sete verificadores independentes. **Nenhuma
mudança de imagem: face-on t=293 e edge-on t=261 saíram bit-idênticos**
(md5 igual antes/depois, 1800²). O que ainda decide algo:

- **Teardown não pode ser uma cadeia frágil.** As proeminências são
  `Object3D`-PROXY com `material = { uniforms }` (objeto simples, sem
  `dispose`); o traverse de `novoSol.dispose` chamava `m.dispose()` em
  qualquer material truthy e estourava — e como `director.dispose` já tinha
  travado `disposed = true` sem `try/catch`, **o Engine nunca era descartado:
  RAF vivo desenhando uma cena zumbi e contexto WebGL preso para sempre**
  (reproduzido ao vivo: `TypeError: m.dispose is not a function`). Agora o
  traverse só chama `dispose` se for função e cada passo do director roda
  isolado. **Regra: passo de teardown que falha não pode levar os outros
  junto — quem trava a flag antes assume a responsabilidade de terminar.**
  Provado depois: `dispose()` completa sem erro nem aviso, RAF cancelado,
  texturas 18 → 2.
- **Knob que decide alocação, lido cedo (2026-08-04) — e agora: campo caro,
  calculado uma vez.** `bakeDustMap` e `bakeGalacticStructureMap` recalculavam
  o MESMO campo de braços de gás (mesma grade, mesmos 24/28, mesmo
  `uniformWeights`): ~90 transcendentais × 262 k texels, duas vezes. O campo
  agora sai do bake da poeira em **Float64** (Float32 arredondaria o valor que
  o structure map usa como double e a mudança deixaria de ser bit-idêntica) —
  **386 ms medidos** fora do congelamento de carga. Junto, `robustNormalize`
  deixou de boxear 262 k doubles num Array só para ordenar por comparador:
  `Float32Array.filter().sort()` dá o **mesmo percentil bit a bit** e custa
  ~28 ms no lugar de ~69, duas vezes por bake.
- **Gate de visibilidade em toda camada cujo `uFade` multiplica a saída.**
  Faltava em halo e anã de Sagitário da galáxia: um billboard quase de tela
  cheia somando exatamente zero durante ~200 s dos 321 do filme (verificado
  por varredura t=30…300: apagam de 30 a 200, reacendem a 240/260, e o hold
  face-on não muda). O glow NÃO entra: ele tem termo próprio de
  `localBandFade` e vale 0,0836 por dentro do disco.
- **A cópia de CPU da galáxia morria de velhice.** 122,7 MiB (cinema) ficavam
  no heap JS depois do upload, espelhando a VRAM pelo resto do filme.
  `onUpload` solta o array; o preço é não reconstruir a galáxia numa perda de
  contexto WebGL — que o app já não trata em lugar nenhum.
- **`MARCH_B_RS` (60 RS) NÃO deve ser recalibrado** — as duas auditorias
  recomendaram, as duas erraram. Com o olhar preso no GC, `b = |ro|·sin(φ)` e
  o canto da tela dá b_max ≈ 22 RS no periastro: qualquer limiar baixo o
  bastante para "acender" no clímax entra dentro de `DISK_OUT_RS` (26) e
  recorta a borda do disco. Ele trabalha na aproximação e na saída, e é
  inerte dentro de ~3 pc DE PROPÓSITO. O cabeçalho de `blackHole.ts` estava
  desatualizado em dois pontos (periastro 4,6 pc/92 RS e disco 40 RS) e foi
  disso que as duas tiraram a conclusão errada — **comentário podre custa
  rodada de auditoria**.
- **Fila medida que sobra, com o que falta para cada uma:** (1) `wrappedStars`
  é a única camada com fade fixo em 1 — 296 k vértices com fetch dependente
  submetidos no Ato IV, onde a própria ablação `?nowrap` já saiu bit-idêntica
  nos dois gates; falta escolher a rampa (`leftDisk` corta seco e pode dar
  pop; `env` é suave mas muda brilho na travessia) e medir. (2) A cadeia
  inteira de carga (assets → bakes → `buildGalaxy`) cabe num Worker: 3,27 s
  de `buildGalaxy` + 1,6 s de bakes, tudo CPU pura e determinística — mas
  `galaxy.ts:132` e `:679` leem `window.location.search` sem guarda (os
  irmãos `galacticModel.ts` e `shaders/common.ts` já têm) e os knobs
  precisam ir por mensagem, não por `location` do worker. (3) Os 6 RTs da
  cromosfera em RGBA8 valem 48 MiB no tier cinema (12 no alta, 3 no
  performance) mas o canal G (`fil`) é escrito SEM clamp — exige
  `min(fil,1.0)` antes, o que é mudança de pixel no Sol de perto, e sobra
  risco de banding. (4) 30% dos bytes cartográficos são colunas mortas
  (número exato conferido: 3.021.712/10.071.608) — mas é migração de schema
  em ~8 arquivos com falha SILENCIOSA (offset errado devolve Float32
  plausível); o 80% seguro é podar só `gaiaObProxyStars[3,6,7]` e
  `dustDensity[4,5]` (2,77 MB), e `spiralAnchors[7]` NÃO pode sair (alimenta
  o fit espiral offline). (5) Acima de 1440p o clímax inteiro é upscale do
  buffer de 2,6 MP do march (b_max 22 < `uMarchB−6`), o que pela régua UX AAA
  pesa mais que qualquer ALU — mas o conserto é dar teste próprio ao caminho
  analítico, não mexer no limiar.

## O catálogo cresceu 17,7× (rodada 35, 2026-08-05)

**skyError 0,8134 → 0,7885, recorde** (A/B na mesma máquina, mesma sessão; a
baseline reproduziu 0,8134 exato). Vistas externas **bit-idênticas** — o
`localFade` zera o campo de catálogo muito antes dos 24/33 kpc dos holds.
18.543 → **328.749 estrelas** e 90 → **1.726 nomeadas**, por +2,5 MB.

- **O 18.543 nunca foi limitação: era CONTRATO.** A magnitude máxima do binário
  antigo era 7,200 cravada e `wrappedStars` tinha `step(7.2, mSun)` literal —
  catálogo até 7,2, procedural a partir de 7,2. A bolha de 1 kpc era
  consequência (a distribuição de distâncias não tinha degrau, só acabava).
- **Havia um BURACO no céu, e ele tinha três anos de idade.** O corte antigo só
  olhava magnitude: a casca proibia qualquer estrela com m☉ < 7,2 em QUALQUER
  distância, mas o catálogo parava numa parede de paralaxe em 1.000 pc. Toda
  supergigante entre 1 e 2 kpc não era desenhada por ninguém — as 572
  "sentinelas" que o `sanitize` descartava (103 delas mais brilhantes que
  magnitude 6, visíveis a olho nu) eram a amostra concreta. **Regra que fica:
  cobertura é magnitude E horizonte E presença** — `covered = uCatFade ·
  (m☉ < uCatMag) · (d☉ < uCatHorizon)`, os três lidos de `stars_meta.json`.
  O terceiro termo é o que impede o viajante de carregar um vazio esférico
  junto consigo: o corte é heliocêntrico e a câmera anda.
- **AT-HYG sozinho NÃO serve: ele normaliza tudo para Tycho.** `mag_src` é "T"
  em 330.868 das 332.178 linhas — VT, não V, e o `ci` é BT−VT. No extremo
  brilhante o Tycho satura: Sirius sai −1,088 contra o V real −1,44, e o BT−VT
  das ~100 mais brilhantes vem VAZIO. A junção pelo id HYG (108.410 estrelas
  com fotometria do Hipparcos, 220.947 com Tycho→Johnson) é o que mantém os
  16 heróis **idênticos, na mesma ordem e com as mesmas magnitudes**.
- **Formato `sc1`, 9 bytes/estrela em cinco seções.** Float32 stride 6 custaria
  7,6 MiB e comprime mal (gzip tira só 17%). A direção vai em ÂNGULO porque o
  erro que importa é angular. A magnitude aparente saiu: o shader a recalcula
  da câmera, então guardá-la era peso morto — a mesma razão que faz `logLum`
  ser o único campo fotométrico que viaja. Armadilha paga em uma rodada:
  faixa de quantização apertada CLAMPA em silêncio (a de `logLum` nasceu
  −2,5..5,5 e o erro real foi 3,02 dex até `verify-assets` ganhar o gate).
- **Custo medido, não estimado:** +0,3 ms na mediana a 2560×1440 (21,3 → 21,6;
  ~1.150 quadros por lado, `callsPerFrame` 54,7 nos dois). Confirma a lição de
  2026-07-31: contagem de vértice não é o eixo travado deste app.
- **Rótulo é para o que se VÊ.** Com 575 nomes próprios da IAU no lugar de 90
  curados, a regra de proximidade passou a apontar anãs vermelhas: Ross 614
  (m 11) tomava a vaga de Betelgeuse. Duas correções: tier (nome próprio antes
  de Bayer) e corte de olho nu na magnitude **recalculada da câmera** — quem
  se aproxima acende, como no shader.
- **Termos do gate:** bulgeAnti 5,735 → **5,584** contra o alvo 5,568 (o termo
  mestre praticamente CRAVA: 3,0% → 0,29%), nprof 0,2766 → 0,2691, rift
  0,0111 → 0,0087, purp 0,0132 → 0,0126. Paga a espessura: 0,3499 → 0,3617 —
  as estrelas reais somam fluxo nas asas da faixa, e ela segue o maior termo
  aberto. `colour` não se moveu (0,1326 → 0,1335): a hipótese de que anãs
  K/M do preenchimento empurrariam a cor está **refutada** — segue sendo
  rodada própria.

## A textura da população (rodada 28, 2026-08-04)

Aberta por observação do dono na vista externa: o disco EXTERNO lê como
"toques leves de pincel espaçados" sobre o vazio, coisa que a referência não
tem. Diagnóstico e refutações valem mais que o ganho desta rodada.

**A régua nova, porque não havia nenhuma ali.** `grain` para em 0,9 R90 e
`discMean` em 1,05 — o defeito morava inteiro fora das duas, e podia crescer
com o gate marcando "cravado". Entraram em `measure-similarity.html`:
`grainOuter` (anel 1,00–1,22 R90) e `clumpInner`/`clumpOuter`
(contagem-em-células em 4 escalas, σ/μ entre células após normalizar pelo
perfil radial), somados em `clumpError`. **Duas armadilhas de construção,
as duas medidas:** (a) normalizar por perfil em DEGRAUS de bin faz a queda
radial do disco vazar como se fosse agrupamento — a régua respondia ao
CONTRÁRIO aos knobs até o perfil virar interpolado; (b) célula maior que
~1/3 da espessura do anel vira gradiente, então o anel externo usa escalas
próprias (0,01–0,07 R90).

**O mecanismo do defeito, quantificado:** 72% das 2,6 M partículas do disco
são coladas em volta de apenas 9.000 sementes, em bolhas de σ 120 pc–1 kpc
(208 partículas por bolha). As sementes seguem o mesmo disco exponencial, e
a distância entre elas cruza o σ da bolha por volta de 11 kpc: a 3 kpc elas
distam 122 pc e se encavalam numa pasta lisa; a 14 kpc distam 1.008 pc e
viram ilhas. **Um mecanismo, dois sintomas opostos** — o miolo tem estrutura
DE MENOS (clumpInner 0,199 contra 0,231) e a borda DE MAIS.

**O achado que reorganiza a fila: as lâminas assadas carregam 97,7% da luz
do disco** (`?nodisc=1` derruba discMean de 0,129 para 0,003). As partículas
são 2,3% do fluxo — e 100% do que o olho lê como pincelada. Por isso a régua
se decompõe: `grainOuter` e `grain` são partícula (respondem a `cnt`),
`clumpOuter` em escala grande é LÂMINA (não responde a nada que se faça com
partícula). Atacar o termo grande é trabalho de lâmina, não de população.

**Becos medidos (não repetir):** densidade sozinha não move o agrupamento
grande (cnt 1,6×/2,5× deixam o termo em 0,445/0,449 contra 0,447 da base) e
acima de ~1,3 estoura o grão do miolo para baixo (0,061/0,053, alvo 0,068)
pagando harmonicError; reduzir a fração aglomerada PIORA a borda
(clump 0,45 → grainOuter 0,185; 0,25 → 0,186) e custa harmônicas
(0,037 → 0,0415 → 0,0521), embora melhore o miolo — sinal de que a fração
certa não é global; cisalhamento σ_θ/σ_R = 3 é neutro no gate (0,4468 →
0,4011 no termo grande sob a régua velha, ≈ nulo sob a corrigida);
importance sampling radial (`rbias`, sorteio com escala mais longa e peso
devolvendo massa/sorteio) NÃO paga — 1,4× e 2,0× baixam discMean
(0,129 → 0,122/0,119) e o grão do miolo junto, com harmonicError em 0,050.

**O QUE FECHOU A RODADA: amostragem ≠ massa (`rbias` 3 + `cnt` 1,5).** A massa
segue Rd = 2,6 kpc, mas SORTEAR partículas com esse perfil deixa a borda com
poucas por pixel, cada uma forte demais. O sorteio passa a usar uma escala
3× mais longa e o peso de cada partícula devolve p_massa/p_sorteio —
importance sampling clássico, fluxo total intacto (discMean 0,129 → 0,129).
Densidade e viés andam JUNTOS: sozinha, `cnt` estoura o grão do miolo para
baixo porque adensa onde já estava certo; com o viés tirando partícula do
miolo, 1,5× repõe exatamente o que ele levou.

| termo | antes | depois | alvo |
|---|---|---|---|
| harmonicError | 0,0370 | **0,0310** | 0 |
| edgeError | 0,4396 | **0,4156** | 0 |
| clumpError | 0,4162 | **0,2780** | 0 |
| grain (miolo) | 0,0699 | **0,0667** | 0,0679 |
| grainOuter (borda) | 0,1793 | **0,1278** | 0,1236 |

93% da distância da borda fechada, o grão do miolo cravado, e os DOIS gates
antigos melhoraram junto — o edge por 0,024, além do ruído. Custo +1,3 M
vértices ≈ +0,4 ms pela medida de `?nogal`. `?cnt=1&rbias=1` recupera o
estado anterior à rodada (conferido: devolve 0,0370 / 0,4162 exatos).

**Duas contas erradas no caminho, as duas achadas por resultado absurdo — a
lição é que "a ideia não paga" quase sempre é "a conta está no lugar
errado":** (a) a constante de normalização do peso não é RBIAS, é a razão
das integrais da Gamma truncada (para RBIAS 2 vale 3,37, não 2) — com o valor
errado o disco perdia 41% do fluxo de partícula; (b) o peso era calculado no
raio SORTEADO, mas 72% das partículas terminam no raio da SEMENTE, e peso
descorrelacionado da posição fazia a granulação da borda SUBIR para 0,256.
Com as duas certas, o mesmo knob virou a maior alavanca da rodada.

Knobs com default de identidade quando postos em 1 (controle conferido campo
a campo nos dois gates): `?clump=` fração colada em complexos, `?shear=`
alongamento σ_θ/σ_R pelo cisalhamento, `?rbias=` viés radial do sorteio.

**Rede nova no `rodada.mjs`: quadro PRETO.** Aconteceu nesta rodada — o app
não desenha dentro do virtual-time, o PNG existe, o Chrome sai 0, as duas
vistas diferem, e a métrica devolve zeros bem formatados que entrariam no
ledger como recorde. Agora `discMean` ≤ 0,001 aborta.

**Ficou aberto e foi FECHADO na rodada 30:** `clumpOuter` grande em 0,429
contra 0,371 do alvo — a atribuição "é das LÂMINAS, não da população"
(`?nodisc=1`) estava certa no componente e errada no NOME: não era textura,
era o contraste braço/interbraço do disco externo. A suspeita de contraste
de poeira no `clumpInner` continua não testada, e a rodada 30 mostrou por
medição que ela é o suspeito errado (ver lá).

## Rodada 29 (2026-08-04) — o retículo escuro era paralaxe das 7 lâminas

Aberta pelo dono ("artefatos escuros que não vejo na referência"): trem
diagonal de 5–6 manchas escuras duras, equiespaçadas, no meio do disco
face-on. Cadeia de atribuição que vale guardar:

- **Não nasceu na rodada 28** (recorte 5,4× bit-comparável antes/depois) — o
  fundo mais limpo só o revelou. `?cart=off` o some, MAS isso não culpa a
  cartografia: remove o CONTEÚDO nítido que torna o mecanismo visível.
- **Becos descartados por medição:** nuvens CO (`?noco` idêntico); grade de
  texel (o mapa 512² tem filtro linear + mips); reticulado no DADO (Rezaei
  2024 vem em grade, mas os texels-fenda do bake são CONTÍGUOS — vizinho
  mais próximo 1 texel, manchas conectadas); picote do microNoise (hipótese
  da primeira análise, morta pela contagem: o trem tem 5–6 cópias
  PARALELAS EQUIESPAÇADAS, ruído não faz isso).
- **O mecanismo: as 7 lâminas (−340…380 pc) leem o MESMO dust map.** Fora
  do eixo, cada lâmina projeta a mesma fenda nítida num ponto deslocado —
  5–6 cópias visíveis (as 2 externas têm alpha 0,08/0,1). É o primo
  face-on das "listras de raspão" (mesma discretização que o quad único
  da unificação 3 dissolve de vez).
- **A correção é física, não cosmética: a poeira é FINA.** `obsLanes` agora
  pesa `exp(−|z_lâmina|/220)` — a mesma escala do colapso do mapa. A fenda
  mora nas lâminas centrais (−75/0/+85), que quase coincidem em projeção:
  o trem colapsa numa mancha única e suave (conferido no recorte). O mapa
  de τ das partículas usa a lâmina central (peso 1) — intocado por
  construção.
- **Custo medido:** edge 0,4156 BIT-ESTÁVEL em 3 estados — o gate de perfil
  é CEGO a este termo por geometria (lâminas horizontais têm área projetada
  ~zero de lado). Face: harmonic 0,0310→0,0331 (dentro do ruído ±0,013),
  clumpError 0,2780→0,2886 (custo real pequeno; critério AAA: artefato
  visível > dívida numérica). Escala 130 pc é pior nos dois (apaga as
  centrais junto). `?lanethin=0` desliga, `=pc` varre.

## Rodada 30 (2026-08-04) — o disco externo tinha dois braços demais

Aberta pelos dois termos que a rodada 28 deixou (`clumpOuter` grande 0,4317
contra 0,3705; `clumpInner` grande 0,1987 contra 0,2314). A atribuição
mudou o NOME do problema antes de mudar qualquer dose.

- **`clumpInner`/`clumpOuter` não medem "textura": medem a razão
  braço/interbraço.** Ablação componente a componente na lâmina, todas com
  default de identidade e controle conferido campo a campo: achatar o
  ESQUELETO dos braços derruba tudo (clumpOuter 0,4317 → 0,2188, clumpInner
  0,1987 → 0,0582); achatar a textura multiplicativa (fbm + filamento
  espiral, o `mix(0,52; 1,24)`) move clumpOuter em 0,007 e clumpInner em
  NADA; achatar a fenda filamentar do τ é neutro (0,4377, dentro do ruído).
  O motivo é da régua: σ/μ entre células capta TODA estrutura de escala
  ≥ L, então a variância mora na maior escala presente — e a textura,
  medida, é só ~6,6% RMS em ~230 pc. **Não gastar rodada dosando textura
  fina para mover agrupamento.**
- **A régua nova enxerga um erro que a antiga integrava fora.**
  `harmonicError` é a MÉDIA de A_m sobre 0,30–1,25 R90. Dumpando o perfil
  RADIAL de A_2 (harness `prof.mjs`, cópia da métrica com `amp[2]` exposto):
  nosso disco externo tinha m=2 = 0,40 contra 0,20 da recriação-alvo em
  1,0–1,22 R90, e m=4 = 0,30 contra 0,35. Erro de FORMA RADIAL que a média
  escondia porque o miolo compensava na direção contrária. R90 do quadro
  face-on ≈ 9,0 kpc (câmera 32,5 kpc, fov 57°): o anel externo da régua é
  9,0–11,0 kpc e o interno 3,2–7,7 kpc.
- **O mecanismo, e é físico.** A dominância de dois braços é da população
  estelar EVOLUÍDA (`renderWeight = 0,42·(1 ± 1)`, Drimmel/GLIMPSE), que é
  concentrada; fora do círculo solar quem desenha o padrão é gás e
  população jovem — quatro braços, o mesmo motivo do `uniformWeights` que
  a poeira já usava. O modelo mantinha a modulação SATURADA (2 contra 0)
  até 16,8 kpc. Agora a profundidade cai por rampa 7,6 → 11,5 kpc até 0,5:
  na borda o par forte vale 3× o fraco em vez de infinito. **A soma dos
  quatro pesos não depende da profundidade — o fluxo azimutal é conservado
  por construção**, e o discMean confirma (0,1292 → 0,1301).
- **Partícula e lâmina sob a MESMA lei.** As ~10⁵ partículas sorteadas para
  o par fraco nasciam com alpha 0 em TODO raio (o "orçamento morto" da
  rodada 12); agora existem além de ~9 kpc. Sem isso ficaria pincelada de
  dois braços sobre luz de quatro — e a coerência PAGOU: clumpError
  0,0929 → 0,0877 e grainOuter 0,1280 → 0,1257 (alvo 0,1236). Zero vértice
  a mais: só peso.

| termo | antes | depois | alvo |
|---|---|---|---|
| clumpError | 0,2886 | **0,0877** | 0 |
| harmonicError | 0,0331 | **0,0289** | 0 |
| edgeError | 0,4156 | 0,4170 | 0 |
| skyError | 1,1231 | 1,1231 | 0 |
| clumpOuter (4 escalas) | 0,496 / 0,479 / 0,462 / 0,432 | **0,439 / 0,421 / 0,402 / 0,384** | 0,449 / 0,423 / 0,401 / 0,371 |
| grainOuter | 0,1275 | **0,1257** | 0,1236 |
| discMean | 0,1292 | 0,1301 | 0,1175 |

Os SEIS harmônicos andaram para o alvo (m=2 0,2602 → 0,2408 contra 0,2490;
m=5 0,0651 → 0,0624 contra 0,0620, cravado). O edge é cego ao termo
(+0,0014, um décimo do ruído): de perfil, redistribuição AZIMUTAL some na
integral da visada. O céu foi medido A/B na MESMA sessão (o harness de
captura clonado com `&armpair=1`) e deu 1,1231 nos dois estados — a faixa
interna é o raymarch, não estas partículas; o 1,1093 do ledger anterior é
deriva de sessão, não desta rodada. `?armpair=1` devolve o estado anterior
EXATO nos dois gates (0,0331 / 0,2886 / 0,4156, campo a campo), lâminas e
partículas juntas; `?armpr0= ?armpr1=` varrem a rampa.

**Becos medidos (não repetir):** profundidade 0 (quatro braços iguais) passa
do ponto — clumpError 0,2112 e harmonicError 0,0473, o disco externo fica
MENOS agrupado que o alvo; a série é 1,0 → 0,2886 · 0,6 → 0,1204 · 0,5 →
0,0929 · 0,45 → 0,0901 · 0,3 → 0,1190 · 0,0 → 0,2112, e entre 0,45 e 0,5 a
diferença já é o ruído da régua. Rampa começando em 6 kpc morde o miolo
(0,1603); rampa 9–13 kpc quase não age (0,2284). Amplitude da textura
multiplicativa e da fenda filamentar do τ não são alavanca de agrupamento
em escala nenhuma (medido acima) — e o espalhamento por texel tampouco.

**O que sobra, com mecanismo novo: o miolo é problema de ESPECTRO, não de
contraste.** `clumpInner` não se moveu (0,1987 contra 0,2314) e agora é 68%
do clumpError restante. Não é falta de contraste de braço: as três escalas
pequenas já batem (0,283 / 0,272 / 0,252 contra 0,295 / 0,279 / 0,260) e só
a maior erra. Subir contraste sobe as quatro juntas e estoura as três que
estão certas — a conta foi feita antes de tentar. O sinal está na queda de
σ/μ de 135 pc para 1,1 kpc: o alvo perde 22%, nós perdemos 30%. A variância
do alvo está concentrada em escalas GRANDES (complexos de 1–3 kpc, braços
com quebras e esporões, arm strength variando com o raio — o A_2 da
referência oscila de 0,41 a 0,02 dentro do próprio anel interno) e a nossa
em escalas pequenas. Alavanca nomeada para a próxima: quebrar a
CONTINUIDADE radial das cristas (segmentos e esporões), não somar textura.
**Executada na rodada 31 — a alavanca era essa mesmo, mas nem a
coordenada nem o ponto de aplicação eram os óbvios (ver abaixo).**

## Rodada 31 (2026-08-04) — os braços eram fitas contínuas

A alavanca que a rodada 30 nomeou, executada. Braço real é SEGMENTADO
(HI/CO mostram quebras, ramificações e esporões a cada poucos kpc; a de
Perseu é a famosa), e a crista passou a levar um ganho multiplicativo de
média zero ao longo de si mesma. **Duas ablações refutadas antes de a
terceira pagar — e as duas ensinam mais que a dose.**

- **A COORDENADA. Ganho escrito em RAIO não serve.** Parece natural —
  seguir a crista de um espiral logarítmico é andar em R — mas o campo
  `n(R)` varia na direção ATRAVÉS do braço, e a célula de 1,1 kpc da
  régua o integra fora: `clumpInner` grande CAIU (0,1987 → 0,1935) e
  `clumpOuter` subiu junto. O eixo certo é o conjugado de
  `v = θ − ln R/tan p` no plano, `a = ln R + θ/tan p` (∇a ⟂ ∇v):
  constante ao atravessar o braço, crescente ao percorrê-lo. Com o eixo
  trocado e nada mais, o mesmo knob subiu as quatro escalas do miolo.
  **Um campo só serve para o disco inteiro**: as curvas `a = const`
  cortam braços vizinhos em raios que diferem por e^(π·sin p·cos p) ≈
  1,39×, então as quebras já saem escalonadas — sem anel, sem fase por
  braço, e a fase por braço foi medida e não paga.
- **O LUGAR. Sobre `galMajorArms` a modulação bate no clamp.** A crista
  do par forte já vale 0,84 de 1: com ganho 1,8 o topo é cortado, sobra
  só a metade escura e o resultado líquido é PERDA de contraste — m=2,
  m=4 e m=6 caindo juntos (0,2360/0,1958/0,0833 contra 0,2398/0,2004/
  0,0872), todos para longe do alvo, com harmonicError em 0,047. É o
  mesmo mecanismo que o NORTE já registra como “canto na derivada
  injeta harmônico”, aqui em forma de teto. A quebra mora onde a luz do
  braço é LINEAR: o EXCESSO sobre o piso de interbraço na lâmina
  (`mix(0,50; 1,0; armDensity·quebra)`) e o alpha da partícula de braço.
  No domínio linear a mesma amplitude 0,8 deixa m=2 e m=4 intactos.
- **Consequência boa de estar no lugar certo: o esqueleto não muda.**
  Dust map, structure map, `galMajorArmsGas` e o raymarch da vista
  interna ficam bit-idênticos — zero custo de frag no raymarch e o céu
  medido A/B na MESMA sessão deu 1,1231 → 1,1230.

| termo | antes | depois | alvo |
|---|---|---|---|
| clumpError | 0,0877 | **0,0587** | 0 |
| clumpInner (4 escalas) | 0,283 / 0,272 / 0,252 / 0,199 | **0,291 / 0,281 / 0,262 / 0,205** | 0,295 / 0,279 / 0,260 / 0,231 |
| clumpOuter (4 escalas) | 0,439 / 0,421 / 0,402 / 0,384 | 0,441 / 0,423 / 0,404 / 0,383 | 0,449 / 0,423 / 0,401 / 0,371 |
| harmonicError | 0,0289 | 0,0371 | 0 |
| edgeError | 0,4170 | 0,4181 | 0 |
| skyError (A/B na sessão) | 1,1231 | 1,1230 | 0 |
| discMean | 0,1301 | 0,1299 | 0,1175 |

33% do clumpError fechado, e o miolo passou a ser o termo MENOR: as
três escalas pequenas cravam (desvios 0,0039 / 0,0016 / 0,0016) e o que
sobra é a maior, ainda 0,027 abaixo. **O teto dessa alavanca foi
calculado, não adivinhado**: para qualquer campo estacionário
σ(célula grande) ≤ σ(célula pequena), então a variância adicionada nunca
sobe mais na escala de 1,1 kpc do que na de 135 pc — o mínimo teórico do
somatório do miolo com adição perfeitamente plana é 0,028 contra os
0,034 que a dose escolhida entrega. Fechar o resto exige TIRAR variância
das escalas pequenas, não somar nas grandes.

O custo é +0,0082 em harmonicError (m=1 +0,0029 e m=5 +0,0023; m=2/m=4
inalterados), dentro do ruído ±0,013 — mas a série de dose mostra o
número oscilando sem tendência entre 0,0278 e 0,0386, então é ruído da
régua e não uma dívida direcional. Edge cego ao termo (+0,0011, um
décimo do ruído), discMean conservado (−0,0002), grainOuter intocado.

**Becos medidos (não repetir):** ganho em função do raio (a ablação
acima, dupla penalidade); modulação dentro do esqueleto (clamp);
fase por braço com pares antipodais em oposição para “blindar” m=1 —
custou mais harmônica e rendeu menos agrupamento que o campo único
(0,0664 contra 0,0583 sob a régua da época); λ 5600 pc põe a modulação
na banda medida e estoura m=6 (0,1068 contra 0,0937 do alvo); estender
a janela radial até 10,5 kpc não melhora o anel externo (0,0618 contra
0,0612 com 9,2 kpc). Knobs: `?armbrk=` amplitude (0 = estado da rodada
30 EXATO, conferido campo a campo), `?armbrkl=` comprimento de onda ao
longo do braço a 5,5 kpc, `?armbrkr0= ?armbrkr1=` janela radial.

## Rodada 32 (2026-08-05) — o Great Rift não existia porque a faixa era opticamente FINA

O pior termo de qualquer gate do projeto (rift 0,036 contra 0,244) e a
primeira rodada com **conselho externo multi-modelo**: três consultores
independentes (Grok, Kimi K3, Qwen 3.8 Max) leram o mesmo dossiê e o
mesmo código. Todos os três convergiram na mesma família de hipóteses —
“sobra luz no vale” — e **os três erraram**. A régua da casa (nenhuma
hipótese entra sem ablação) devolveu o dono em seis capturas.

**O passo 0 que ninguém pediu e decidiu tudo.** Antes de qualquer
ablação, despejar o rift POR BIN e o perfil em b (33 amostras de −16° a
+16°) mostrou que em **10 dos 11 bins o mínimo caía na BORDA da janela
de busca (|b| = 10°)**, não numa fenda: a faixa é tão larga que ainda
está subindo em ±10°, o mínimo sai no limite e o termo lê ≈ 0. Não era
“vale raso” — era **vale nenhum**. E onde havia uma fenda de verdade
(l = 26,3°, b = +4°: 1,21 contra flanco 1,64), o mínimo global da janela
a ignorava. O painel inteiro estava respondendo à pergunta errada.

**Placar do conselho** (hipótese × quem propôs × o que a medição disse):

| hipótese | Grok | Kimi | Qwen | veredito medido |
|---|---|---|---|---|
| estrelas aditivas não extintas enchem o vale | H3 | **H1** | H3 | **REFUTADA** — `?nocat=1&nowrap=1` rift 0,0369 → **0,0107**: sem estrelas o termo PIORA |
| a poeira local do raymarch emite em vez de só extinguir | **H1** | H3 | H2 | **REFUTADA como dona** — `?emisk=0` rende +0,013 e destrói bulgeAnti (5,47 → 11,6) |
| bloom / lift / compressão levantam o piso | H5 | H4 | H4 | **REFUTADA** — `?nobloom=1`: 0,0369 → 0,0368 |
| véu de fundo `GAS_COOL` | citado | citado | H4 | **REFUTADA** — `?veilk=0`: +0,0015 |
| falta τ na faixa (a suspeita da equipe) | contestada | H2 | **H1** | **CONFIRMADA** — `?dustk=3` sozinho: 0,0369 → 0,0909, e é o único knob que MELHORA o skyError junto |
| handoff `ObservedClouds`/nearFade | H2 | — | — | não medido: o dono apareceu antes |
| métrica com lane estreita/deslocada | — | — | H5 | **PARCIAL** — não é desalinhamento, é a borda da janela (passo 0) |

**O mecanismo, em uma conta.** A poeira procedural da faixa integra
**0,004 mag/kpc** no plano (porte exato de `fbm`/`vnoise` para Node,
24 passos quadráticos, média em l ∈ [−35°, 45°]) contra ~1,5 mag/kpc do
meio interestelar real — **duas ordens de grandeza**. Extinção que nunca
chega a τ ~ 1 não escurece nada, por melhor que seja o desenho: o
`smoothstep(0,44; 0,76)` deixa passar ~5% do volume e o que sobra é
filamento sem coluna. A faixa era opticamente fina, e nenhuma fenda pode
se formar numa faixa opticamente fina.

**A correção, duas peças que só funcionam juntas.**

1. **Componente DIFUSA ancorada em A_V** (`?bandav=`, mag/kpc no plano
   ao raio solar; o fator 2,6316 = 1/(1000 · 1,0857 · 0,00035) converte
   para as unidades de `dust`). É matéria que faltava, não escurecimento
   pintado.
2. **A poeira mora na camada de GÁS, não na das estrelas** — h = 70 pc
   (a mesma altura que `diskGasEnvelope` já usa no raymarch), não os
   210 pc do disco fino estelar, com a coluna perpendicular preservada.
   **Enquanto poeira e estrelas dividiam o mesmo perfil vertical, a
   função-fonte j/κ era constante em z e a faixa saturava no MESMO valor
   em qualquer latitude: fenda impossível por construção.**

A peça 2 sozinha é ruído (`?dusth=105/75` movem 0,0004) — porque molda
uma componente que não carrega τ. A peça 1 sozinha, a h = 210 pc, custa
o dobro em bulgeAnti pelo mesmo rift. Juntas, a altura vira alavanca de
primeira ordem: a **bandav = 0,8** o mesmo rift sai com bulgeAnti 2,441
(h = 210), 3,354 (h = 125) e 3,895 (h = 90) — concentrar a poeira dá
MAIS fenda e MENOS dano, que é a assinatura do mecanismo certo.

| termo | antes | depois | alvo |
|---|---|---|---|
| **rift** | 0,0369 | **0,1807** | 0,2444 |
| skyError (A/B na MESMA sessão) | 1,1230 | **1,0767** | 0 |
| bulgeAnti | 5,468 | 5,116 | 5,568 |
| espessura (média das 24 longitudes) | 6,198° | 6,583° | 4,406° |
| colour | −0,0649 | −0,0668 | 0,0641 |
| purp | 0,0620 | 0,0652 | 0,0784 |
| perfil por longitude (erro médio) | 0,2746 | 0,2700 | 0 |
| harmonicError · edgeError · clumpError · discMean | 0,0371 · 0,4181 · 0,0587 · 0,1299 | **idênticos** | — |

**Rift 4,9× e o skyError cai junto** — os gates externos ficam
bit-idênticos por construção (a mudança vive só em `BAND_INTEGRATION`,
o fragment do LUT da faixa; fora do disco `uFade = 0` zera o raymarch
inteiro), e o `NEBULA_MAIN` — os 6,9 ms — não tem uma linha alterada,
então não há custo novo no caminho quente. O LUT (256×128, re-renderizado
só quando a câmera anda > 2 pc) ganha ~5 ALU por passo.

**O custo honesto é o bulgeAnti**: 1,8% → 8,1% de desvio. É físico e
esperado — extinção real escurece o centro mais que o anticentro — e
significa que o **bojo intrínseco da LUT (amplitude 2,45) foi calibrado
sob extinção quase nula**. Re-dosar bojo e poeira JUNTOS é a rodada
seguinte, e é o mesmo par que trava a dose completa: a 1,5 mag/kpc
(o valor real) o gate explode (bulgeAnti 2,61, skyError 2,28), porque o
perfil de EMISSÃO da faixa ainda não é físico (espessura 6,2° contra
4,4°). Ancoramos a poeira em 0,15 mag/kpc — **um décimo do real, ainda
conservador** — e a distância até o valor físico é agora um número
conhecido, não uma suspeita.

**O que a fenda virou, bin a bin:** nos bins centrais o mínimo agora é
encontrado em b ≈ 0 com flancos de verdade — l = −3,8° passou de −0,010
para **0,494**, l = +3,8° de 0,281 para **0,564**, l = −11,3° de −0,019
para **0,391**. Os bins externos (l = −34° a −19°) seguem com o mínimo
na borda: é lá que o panorama ESO tem o Aquila Rift em b ≈ +3°…+9°, e é
poeira LOCAL (150–600 pc) que o modelo ainda não tem — o próximo alvo do
termo.

**Becos medidos (não repetir):** altura de escala da poeira sozinha
(ruído enquanto a componente difusa não existe); comprimento de escala
radial estelar da faixa `?bandrd=2600` (bulgeAnti sobe para 6,955 mas
skyError vai a 1,4934 — o perfil por longitude paga); dose alta da
poeira já existente `?dustk=12` (rift 0,235 mas bulgeAnti 4,542 e
skyError 1,185: multiplica também as fendas APOGEE, que já estavam em
nível físico); `?dustk=24` passa do alvo (0,3173) e custa 1,4638.
Knobs: `?bandav=` (0 = estado da rodada 31 EXATO, conferido termo a
termo) e `?dusth=` (210 = idem).

## Rodada 33 (2026-08-05) — o bojo era uma ESFERA, e a poeira usava a régua das estrelas

A re-dosagem acoplada bojo↔poeira que a rodada 32 encomendou. A
hipótese registrada era “o perfil de EMISSÃO da faixa não é físico e é
ele que trava a dose”. **Estava certa, e o culpado tinha nome: o bojo
da LUT era `exp(−|q|/1050)`, uma exponencial ESFÉRICA.**

**O passo 0 achou o dono antes de qualquer dose.** Decompor a espessura
POR LONGITUDE mostrou que o erro não é uniforme: nos 6 bins de |l| < 40°
o desvio somava 17,75° dos 54,75° totais, e o perfil em latitude
explicava por quê — em l = −7,5° nosso céu vale **0,60 da luz do plano
em 10° < |b| < 20°, contra 0,124 da foto** (fator 4,9). No anticentro
(l = 170°…210°) o desvio soma outros 22,5°, mas ali a razão passa de
1,0: há mais luz FORA do plano que nele.

**Ablação, um componente por vez, na luz em 10° < |b| < 20° a l = −7,5°:**

| desligado | luz | fração do pedestal |
|---|---|---|
| nada (base) | 0,1323 | — |
| **bojo** | **0,0152** | **88,5%** |
| disco espesso | 0,1258 | 4,9% |
| disco fino | 0,1285 | 2,9% |
| raymarch local | 0,1294 | 2,2% |
| véu `GAS_COOL` | 0,1299 | 1,8% |
| estrelas (`nocat`+`nowrap`) | 0,1309 | 1,1% |
| compressor do LUT `L/(1+0,55L)` | 0,1346 | **−1,7%** |

Sem o bojo a razão cai para 0,137 — **o valor da foto (0,124)**. Os
outros oito candidatos, juntos, não chegam a 13%. O compressor, que os
três consultores externos apontaram como suspeito de alargar qualquer
perfil, PIORA o número quando desligado: refutado por medição. No
anticentro a mesma ablação dá o dono oposto — `localk=0` tira 93% da luz
em 10° < |b| < 20° a l = 202,5°: é o complexo de Órion do raymarch
local (Betelgeuse l = 199,8°, Rigel l = 209,2°), não o bojo.

**O mecanismo, em uma conta.** Uma exponencial esférica de 1050 pc vista
de 8,15 kpc tem e-folding angular de 7,4°: o miolo do céu brilha até
|b| ≈ 25°. O bojo real é boxy/peanut e ACHATADO — Wegg & Gerhard 2013
(aglomerado vermelho do VVV) mede escalas (700, 440, 180) pc, c/a ≈ 0,26;
Dwek 1995 (COBE/DIRBE G2) dá 0,23. Achatar para c/a = 0,30 **com a
luminosidade conservada** (a massa de exp(−m/h) achatado vale ∝ c/a,
então a amplitude sobe 1/q — só a FORMA muda, a mesma disciplina da
poeira da rodada 32) tira a luz das asas e a põe no plano.

**E aí o par se fecha.** Só o achatamento derruba a espessura
(0,5178 → 0,3830) e crava o bulgeAnti (5,116 → 5,612, alvo 5,568) — mas
**mata o rift** (0,1807 → −0,030): a crista brilhante no plano é
justamente o que a poeira a 1/10 da dose física não consegue cortar.
Subir `bandav` NÃO é a saída, e a série mede por quê: 0,15 → 0,4 → 0,8 →
1,5 leva o rift a −0,030 → 0,044 → 0,542 → 0,723 enquanto a faixa engorda
5,97° → 6,42° → 6,93° → 7,48°. **Poeira LOCAL faz uma fenda LARGA**
(coluna ∝ h/sin b), e a régua da espessura acumula a partir de b = 0:
cava o vale e a nota piora.

**A saída é ONDE a poeira mora, não quanta.** A componente difusa herdava
`exp(−(R−8150)/5200)` — a escala radial das ESTRELAS, copiada sem
justificativa. O disco de poeira medido é muito mais concentrado:
**h_R ≈ 2,26 kpc (Drimmel & Spergel 2001, do COBE/DIRBE)**. Poeira em
R ≲ 4 kpc está a 4–6 kpc de distância, onde a camada de 70 pc subtende
~1° em vez dos ~10° da poeira local: **fenda funda onde o rift mede,
barata onde a espessura mede.** A 2100 pc o rift sai a 0,2555 (alvo
0,2444) por 0,04° de espessura, contra os 0,45° que a mesma fenda custa
pela via da dose local.

| termo | antes (r32) | depois (r33) | alvo |
|---|---|---|---|
| **skyError** (A/B na MESMA sessão) | 1,0767 | **0,9459** | 0 |
| espessura (termo) | 0,5178 | **0,4160** | 0 |
| espessura (média das 24 longitudes) | 6,583° | 6,135° | 4,406° |
| rift | 0,1807 | **0,2555** | 0,2444 |
| perfil por longitude | 0,2700 | 0,2813 | 0 |
| bulgeAnti | 5,116 | 5,069 | 5,568 |
| colour | −0,0668 | −0,0708 | +0,0641 |
| purp | 0,0652 | 0,0655 | 0,0784 |
| harmonicError · edgeError · clumpError · discMean | 0,0371 · 0,4181 · 0,0587 · 0,1299 | **bit-idênticos** | — |

**−12,1% no skyError, e o rift praticamente crava.** Os gates externos
saem bit-idênticos por construção (a mudança vive só em
`BAND_INTEGRATION`, o fragment do LUT) e desta vez está PROVADO:
md5 das duas capturas de 1800² igual antes e depois
(`873e64b2…` face-on, `c0743465…` edge-on). O `NEBULA_MAIN` — os 6,9 ms —
não tem uma linha alterada; o LUT (256×128, 1×/frame) troca um
`length()` por um `sqrt` de três termos.

**O que a foto ainda cobra, em ordem.** A espessura segue o maior termo
(0,416) e agora se sabe onde: os quatro bins do ANTICENTRO
(l = ±172,5°, −157,5°, −142,5°) valem 22,25° dos 44,00° somados — e a
ablação já provou que ali o dono é o **complexo de Órion do raymarch
local**, brilhante demais e espalhado demais (em l = 202,5° o céu é 1,5×
mais claro em |b| = 10–20° que no plano; na foto é 0,17×). Os bins do
miolo, que a rodada consertou, agora casam com a foto quase termo a
termo (fluxo cumulativo em |b| < 3°/5°/10° a l = −7,5°: 0,337/0,549/0,866
contra 0,338/0,554/0,872 da foto). **A próxima alavanca tem nome:
Órion** — e ela virou a **rodada 34** (seção própria): os sete núcleos
moravam dentro da Bolha Local, deslocá-los +130 pc levou o skyError a
**0,8134**. Depois dela, colour (0,135, o segundo maior) — a revelação
per-RGB do gate dessatura além do alvo, e `chromsat` interno segue
candidato.

**Becos medidos (não repetir):** dose local de poeira como via para o
rift (`bandav` 0,4/0,8/1,5 com o bojo achatado: 1,1883/1,4954/1,9540,
todos piores que 1,0767 — a fenda larga engorda a faixa mais rápido do
que aprofunda o vale); achatar o bojo SEM conservar a luminosidade
(`bulgek=0,5` a c/a 0,26: bulgeAnti desaba a 3,817 e o skyError vai a
1,2381 — a conservação é a peça, não um detalhe); **depressão interna da
poeira** dentro de 3 kpc (o anel molecular de 4 kpc; Dame 2001) para
proteger o bojo — `dusthole=3000` devolveu só +0,075 de bulgeAnti e
matou o rift (0,1886 → 0,0396), skyError 1,1384: **a extinção que come o
centro mora ALÉM de 3 kpc, o buraco é o lugar errado** (era o critério de
refutação declarado pelos consultores, e ele disparou); escala radial da
poeira longa demais (3500 pc: 1,1215; 5200 original com bojo achatado:
1,0998) ou curta demais (1400 pc: 1,2898); achatamento fora da janela
(c/a 0,60/0,45/0,35/0,23/0,33 sozinhos: 1,0860/1,1419/1,1640/1,0960/
1,0353). O ótimo em c/a se DESLOCA quando a poeira muda — 0,26 vencia com
a poeira antiga, 0,30 vence com a nova: re-precificar quando o regime
muda segue valendo (lição da rodada 21).

**Sobre a régua, medido e registrado:** o termo da espessura acumula
meio-fluxo a partir de **b = 0 fixo**, então uma fenda mais funda —
física melhor — ALARGA a medida e piora a nota. Os dois termos são
antagonistas por construção. O harness de diagnóstico passou a reportar
também a meia-altura em torno do PICO da coluna (nosso 5,67° contra
3,91° da foto no estado da r32); o gate oficial NÃO foi mexido, para não
quebrar a comparabilidade com o histórico. Trocá-lo é uma decisão de
re-baseline, não uma correção de rodada.

**Knobs:** `?bulgeq=` (razão de eixos c/a do esferoide; **1 = esfera =
estado da rodada 32 EXATO**, o mesmo GLSL, conferido campo a campo na
sonda de face única) e `?dustrd=` (escala radial da poeira difusa;
**5200 = estado da rodada 32**).

## Rodada 34 (2026-08-05) — o corredor de Órion começava dentro da Bolha Local

A alavanca que a rodada 33 deixou nomeada. O passo 0 desta vez não mudou o
alvo — confirmou-o e o AUMENTOU: os quatro bins do anticentro valem **22,25°
dos 44,00° somados (50,6%)**, não os 41% que o NORTE registrava (aqueles
usavam o denominador da r32, 54,75°; a r33 baixou o total sem tocar no
anticentro).

**O defeito, em uma linha: o PICO da faixa no anticentro saía 10–12° ABAIXO
do plano.** Em l = 202,5° o céu era 3,03× mais claro em b = −12° que em b = 0;
na foto é 0,13×. E o excesso era só no hemisfério SUL — o lado norte já casava.

**O dono, por ablação (face `anti`, luz em 10° < |b| < 20°):**

| desligado | l = 202,5° | fração |
|---|---|---|
| nada (base) | 0,04908 | — |
| **os 7 núcleos do corredor** | **0,01567** | **68%** |
| envelope de gás local | 0,03573 | 27% |
| supergigantes embutidas | 0,04845 | 1,3% |
| nuvens-semente CO | 0,04897 | 0,2% |
| região H II hero | 0,04908 | 0,0% |

`WORLD.nebulaCores` são sete nuvens ARTÍSTICAS postas no corredor da viagem —
e todas caem em l 196–210°, b −10° a −29°, a 8–218 pc do Sol. É a direção de
Órion, e é **a Bolha Local**: uma cavidade com n ≈ 0,02 cm⁻³ contra 10²–10⁴ de
nuvem molecular, raio médio ~170 pc (O'Neill et al. 2024). A linha de visada
para Órion "não vê muita poeira até 250 pc", e a primeira estrutura está em
~350 pc (Rezaei Kh. & Kainulainen 2020); Orion A/B ficam em 390–460 pc. O
corredor inteiro morava no vazio.

**A correção é de LUGAR, e a conta diz por que não pode ser de brilho.** Brilho
de superfície de fonte extensa NÃO depende da distância (`sampleColor` não tem
termo de distância; o porte numérico reproduz a integral em 0,97–1,02 de 8 a
218 pc). O que decide o orçamento é **ângulo sólido**: o núcleo de 8,4 pc tem o
Sol dentro do próprio gate e cobre o céu inteiro; o de 218 pc cobre 3,3%. Uma
nuvem de raio 24 pc a 133 pc não PODE produzir uma estrutura de 4,4° de
meia-altura — a geometria proíbe, em qualquer dosagem. Cada núcleo foi
deslocado **+130 pc ao longo da própria direção**, l, b e raio físico intactos:
o corredor vai de 138 a 348 pc, começando na parede da bolha.

| termo | antes (r33) | depois (r34) | alvo |
|---|---|---|---|
| **skyError** (A/B na MESMA sessão) | 0,9459 | **0,8134** | 0 |
| espessura (termo) | 0,4160 | **0,3499** | 0 |
| espessura (soma dos 4 bins do anticentro) | 22,25° | **15,50°** | 0 |
| bulgeAnti | 5,069 | **5,735** | 5,568 |
| perfil por longitude | 0,2813 | 0,2766 | 0 |
| colour | −0,0708 | −0,0685 | +0,0641 |
| purp · rift | 0,0655 · 0,2555 | 0,0652 · 0,2555 | 0,0784 · 0,2444 |
| harmonicError · edgeError · clumpError · discMean | 0,0371 · 0,4181 · 0,0587 · 0,1299 | **bit-idênticos** | — |

**−14,0% no skyError**, e os gates externos saem PROVADOS bit-idênticos: md5
`873e64b2…` (face-on t=293) e `c0743465…` (edge-on t=261), os MESMOS da rodada
33. Zero custo de frame — mesmo número de núcleos, mesmo gate `q2 < 9`, só as
constantes mudaram.

**A régua do céu é DETERMINÍSTICA** — três repetições de três configurações
diferentes reproduziram os seis termos a 4 casas. Consequência de método: a
série de dose de `corewall` (60 → 0,8467 · 90 → 0,8081 · 110 → 0,8238 · 130 →
0,8134 · 180 → 0,8310) **não é ruído, é sorteio de fbm** — deslocar um núcleo o
reamostra no campo de ruído, que é avaliado em `p` de mundo. Não calibrar
`corewall` pelo ótimo do gate: o valor foi escolhido pela literatura e a nota
foi aceita como veio.

**O que a foto ainda cobra, com o dono já medido.** A espessura segue o maior
termo (0,3499) e o resíduo do anticentro tem dois endereços: (a) em l = 202,5°
o pico ainda sai em b = −8,9°, e ali o dono é o **envelope de gás local**
(`diskGasEnvelope`) — a Bolha Local NÃO o alcança: `?lbr=` de 80/120/160 pc
sobre o estado sem núcleos moveu a luz fora do plano em 0,5%, porque a emissão
do envelope mora entre 200 e 650 pc, onde a camada de h = 70 pc ainda está
cheia; (b) o disco espesso da LUT (h 610–1080 pc, ×0,105) entrega razão
asas/plano 0,294 contra 0,17 da foto e passa o disco fino acima de |b| ≈ 12° —
mas ele sustenta as bandas altas do edge-on, então mexer nele é rodada com os
DOIS gates na mesma bateria. Depois disso, colour (0,135, o segundo maior).

**Becos medidos (não repetir):** **a Bolha Local realista como alavanca**
(`?lbr=` 40/80/120/160 pc) — parece a correção mais honesta de todas (o código
limpa 6,5 pc, a real tem ~170) e não é: com os núcleos ligados ela só age
DIMINUINDO os núcleos, e com os núcleos desligados move 0,5%; **apagar os sete
núcleos** (`coremask=0`: skyError 0,8305) — pior que deslocá-los porque
bulgeAnti passa do alvo (5,933) e o quadro t=66 da viagem fica vazio;
**transformá-los em nuvem ESCURA** conservando a absorção (emissão própria
zerada, iluminação externa mantida: 0,8864) — melhor que apagar na luz fora do
plano, mas a absorção que sobra come o anticentro em |b| < 10 e estoura o
bulgeAnti (6,238); **cirurgia num núcleo só** (`coremask=119`, o de 106 pc, que
sozinho responde por 65% do excesso fora do plano em l = 202,5°): rende apenas
22% do ganho do bloco — a atribuição por banda de latitude e a atribuição pelo
GATE são perguntas diferentes, porque quem move o gate é o bulgeAnti, e esse
responde aos quatro juntos; **empurrar demais** (`corewall=180`, corredor
188–398 pc, que põe o núcleo externo na distância REAL de Órion): 0,8310, e
tira a nebulosidade de perto de Betelgeuse (152,7 pc) — o ato II fica seco.

**Trava que vale para as próximas rodadas do céu:** `bulgeAnti` é medido só em
|b| < 10° e hoje está do lado CERTO do alvo. Ele crava cortando ~9% da luz do
anticentro nessa janela e EMPATA em ~16%; qualquer dose global no raymarch
local passa disso muito antes de a espessura pagar (o `?emisk=0` da r32 levou
bulgeAnti a 11,6). Toda rodada que mexer na camada local tem de reportar o
bulgeAnti junto.

**Knob:** `?corewall=` (deslocamento em pc a partir das posições de
`WORLD.nebulaCores`; **0 = estado atual, −130 = corredor da rodada 33 EXATO**,
conferido termo a termo: devolve 0,9459 com os seis termos idênticos).

**Cuidado de ferramenta descoberto aqui:** `npx tsc --noEmit` na raiz é um
NO-OP — o `tsconfig.json` tem `"files": []` com project references. Passou num
arquivo com erro de sintaxe. A checagem real é `npm run typecheck` (`tsc -b`).

## Decisões fechadas

Não reabrir sem que a condição listada mude.

| Decisão | Por quê | Reabre se |
|---|---|---|
| **Octree: não** | Serve para podar conjunto fixo e grande. Aqui o VBO é estático e a árvore podaria ~3,7% dos vértices ao custo de ~193 draw calls | Conjunto estático > 2 M pontos **e** `WEBGL_multi_draw` plumbado |
| **Floating origin: feito por reconstrução relativa à câmera (rodada 13), não por rebase global** | A 25 kpc o quantum f32 é 1,5·10⁻³ pc ≈ 1,7 px de tremor a 1 pc. As cascas — a única geometria resolvida perto da câmera longe do Sol — reconstroem posição por célula inteira + fração e projetam com só a rotação do MV: nenhum operando de kpc no caminho. Rebase global do grafo não é necessário | Outra camada passar a resolver geometria perto da câmera longe do Sol |
| **Log-depth: não** | A cena tem um único objeto opaco com `depthWrite`; z-fighting precisa de dois | Entrar geometria resolvida (planetas, malhas) |
| **LUT de cor (Mamajek / CIE 401): não** | O ajuste de 3 mads em `common.ts` tem RMS 0,009; o erro real afeta ~51 das 18.543 estrelas | Precisão exigida abaixo de 2500 K ou acima de 40 kK |
| **Saturação/lift no pós para "consertar" cor: não** | É maquiagem. A cor tem de emergir da física; croma se recupera por **exposição**, não por saturação | — |
| **Reduzir vértices para ganhar QUADRO em cinema/alta: não** | Medido: `?nogal=1` tira 320 k vértices e move a mediana em 0,1 ms — vértice não é o gargalo. Não confundir com o `populationScale` 0,28 do preset **performance**, que é APROVADO e existe por MEMÓRIA (o buffer de 2,6 M custa 83 MB e não cabe em mobile), nem com a rodada 28, que SUBIU a contagem 1,5× por IMAGEM e não por custo | Alvo passar a ser GPU de baixo tier, com medição própria |

## Medições que sustentam o acima

Método em `scratchpad` do agente (CDP: embrulha `getContext`, conta draws, rAF mede
frame). Repetir com **≥1000 frames** e conferindo `callsPerFrame`: janela curta dá
"mediana" que é só pico de arranque, e `callsPerFrame ≈ 0` significa que o app parou de
renderizar e a linha não mede nada.

- **Não há gargalo.** 2560×1440, vista externa: mediana 17,4 ms com 4,0 M de pontos.
- **O hitch de ~250 ms no p99 foi bissecado e corrigido** (rodada 10): a 3ª oitava do fbm
  das nuvens CO, naquele shader (multiply + instanced), dispara um stall periódico de
  driver a partir de 1440p de altura — frag trivial 18,3 ms · 2 oitavas fixas 18,3 ·
  ternário 240–278 · 3 oitavas fixas 209. Zero longtasks: lado GPU/ANGLE, mecanismo não
  identificado, correção por medição (2 oitavas fixas → p99 28,5 em janela real 2560×1440).
  Não subir de 2 oitavas ali sem medir p99 em janela real 1440p. Flags `?noco`/`?noforge`
  ficaram para bissecções futuras.
- **A cauda de hitches em t=1/t=216 (mean 37 vs p50 16,7) era UM frame:
  compilação síncrona de shader no primeiro uso de cada programa** (ANGLE/FXC,
  esperas de até 4 s por programa, 14–15 s somadas a frio) — mais o BH, que
  compilava sozinho ao cruzar 2,4 kpc (t≈187, hitch no meio do mergulho).
  Resolvido (2026-08-03): pré-compilação sob o véu em `director.init` com
  `KHR_parallel_shader_compile` (compileAsync da cena + quads da nebulosa e do
  BH). Duas pegadinhas de chave de programa, medidas por diff de `cacheKey`:
  compilar com um render target amarrado (senão a variante sai com colorSpace
  de TELA e o frame real, dentro do composer, recompila tudo — 8,7 s) e
  geometria SEM atributo `normal` para os quads do BH (bit `vertexNormals`;
  o FullScreenQuad é triângulo position+uv). Captura `?shot=` PULA o warm-up:
  o polling do compileAsync queimaria o `--virtual-time-budget`. Pós-correção
  a frio: pior frame 383 ms no arranque, nada acima de 67 ms depois; sobra
  1,5 s de compile do shader de bake sob o véu (aceito). Os platôs de 33 ms
  do headless são contaminação (downclock de GPU em background), não defeito.
- **Vértices por frame são quase constantes na viagem:** 3,84 M no Sol, 4,00 M de fora.
- **Raymarch = 6,9 ms**, 29% do frame (1600×900, no Sol: 23,6 ms contra 16,7 com
  `?nonebula=1`). A alavanca dominante é `pixelRatio`, não o número de passos: em
  `?q=performance` (30 passos, ratio 1,0) o raymarch some dentro do vsync. Custo por
  amostra-pixel ≈ 22 ps ⇒ **campo distante a 1440p com 32 passos ≈ 2,6 ms**. Há orçamento.
- **Cor:** púrpura na faixa 0,25–1,05 R90 é **+0,121 contra alvo +0,201** (era +0,084 com a
  paleta pintada). 60% do alvo. Emissão e espalhamento já saem de temperatura de população;
  o componente que falta pesar é **H II**, que tem o purp mais alto da cena (+0,303) e hoje
  só existe onde `microNoise` passa de 0,80 — área pequena. Histórico em
  `reference/EVOLUCAO.md`.
- **O campo de radiação é não-local.** Keyar a cor do espalhamento só no traçador jovem
  local zerou o azul no interbraço e derrubou purp (rodada 04). A luz de O/B atravessa o
  interbraço: o modelo precisa de piso difuso + gradiente + realce de braço.
- **O teto de cor é a GAMUT da paleta, não o `clamp`.** `mix(cold, warm, t)` com
  `cold=(0,56,0,58,0,74)` e `warm=(0,98,0,70,0,42)`: purp vale +0,0828 no piso atual
  (t=0,20) e só +0,0946 com `cold` puro (t=0) — o alvo do anel externo é **+0,317**, fora
  do segmento que os dois pontos definem. Alcançam-no os componentes de população:
  `POP_HII=(1,664,0,807,0,957)` tem purp **+0,303**; espalhamento por campo jovem 18 kK
  ×λ^−1,3 dá **+0,213**. Mexer no `clamp` é desperdício de rodada.
- **Espirais:** `harmonicError` 0,0696 na rodada 12 (recorde; era 0,1007 na rodada 05 e
  0,1718 na 11). m=3 e m=5 seguem acima do alvo (+16% e +30%) — intermodulação, ver
  `VISUAL_TARGETS.md`.

## Becos sem saída

Já medidos e refutados — a lista completa das hipóteses de espiral está em
`reference/VISUAL_TARGETS.md`, seção "Cada harmônica aponta uma causa".

- Subir contraste geral dos braços: amplifica todos os harmônicos junto.
- Desacoplar a fase da poeira da fase da luz: piora muito.
- Cor do disco decidida por raio (`mix(cold, warm)` com piso de dourado): torna o disco
  geometricamente incapaz de púrpura. É o que a unificação 1→3 substitui.
- **Pesar H II para subir o púrpura: não funciona.** O raciocínio é tentador — H II tem o
  purp mais alto da cena (+0,303) — e foi medido nas rodadas 06/07: com fluxo conservado,
  purp fica em 0,1205 contra 0,1206 sem a mudança. Os 9.000 nós são área pequena demais, e
  o termo H II das lâminas é normalizado em luminância, então só desloca matiz onde o
  portão de ruído abre. O ganho aparente da rodada 06 era fluxo extra sobre os braços
  disfarçado de cor — e custou m=1, m=3, m=5 e m=6 piorando juntos, a assinatura de
  intermodulação que `reference/VISUAL_TARGETS.md` já registra.
- **Lição de método que vale além deste caso:** trocar a cor de uma população por outra de
  luminância diferente é uma mudança de FLUXO disfarçada. Normalize por Y e compense no
  alpha, ou a medição atribui à cor um efeito que é de brilho.
