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
   **PESOS HISTÓRICOS — a régua mudou TRÊS vezes em 2026-08-06** (a r37 pôs
   a fenda para comparar a curva por longitude; a auditoria tirou o
   `bojoAnti` da soma por ser função exata do perfil; a r39 pôs a fenda para
   medir na latitude da FOTO). O estado atual é skyError **0,7811** em CINCO
   termos: espessura 0,3097 · perfil 0,2164 · fenda 0,2102 · purpura 0,0364 ·
   cor 0,0084. Os números acima e abaixo nesta seção são de eras anteriores
   e não se comparam com os de hoje. **A `cor` deixou de ser problema na r40
   (0,1208 → 0,0084) e o `purpura` passou a ser o quarto termo.**
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
   terço do erro do céu. ~~Rodada candidata: pôr a nuvem no LUGAR e na
   DISTÂNCIA certos~~ — **FEITA e NÃO ADOTADA na rodada 36** (seção
   própria): a nuvem no lugar certo leva o perfil a 0,2057, o melhor
   movimento que este termo já teve, mas 84% do excesso mora em
   |l| < 30°, onde tirar luz custa 2,14× o que rende no gate atual.
   A próxima alavanca desta linha não é mais poeira: é o termo `rift`
   deixar de ser cego ao LUGAR do vale.
   **A convenção de longitude está CERTA — fechado em 2026-08-06, e sem
   render.** As 1.726 estrelas nomeadas de `stars_meta.json` carregam a
   posição de cena; converter 11 delas para (l,b) com a base de
   `sky-measure.html` (b = asin(v·N), l = atan2(−v·B, −v·A)) reproduz a
   longitude galáctica REAL a duas casas: Sirius 227,23/−8,89 · Deneb
   84,28/+2,00 · Antares 351,95/+15,06 · αCen 315,7 · Polaris 123,28/+26,46
   · Canopus 261,21/−25,29. Logo o excesso medido em **l = +11°…+41°** é o
   lado certo (Aquila/Scutum) e o déficit em l = −34°…−79° é Carina 283° /
   Crux-Centauro 310° / Norma 328° — a anotação velha que punha o Aquila
   Rift em "l = −34°…−19°" é que estava espelhada. **O teste de convenção
   não precisa de GPU: é uma conta sobre o binário do catálogo.**
   A causa da fenda foi ATACADA e MEDIDA na rodada 36 (seção própria): o
   mecanismo está certo e o gate atual a recusa;
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
- **DIVERGÊNCIAS DECLARADAS no `sol/sun.js`, para levar na re-cópia** (cada
  uma tem o comentário no próprio arquivo, no ponto): o `smoothstep` de
  bordas invertidas (regra 2 do README) e, desde 2026-08-12, o **teto do
  `mu`** — `clamp(dot(N, viewDir), 0.0, 1.0)` no lugar do `max(…, 0.0)` do
  doador, porque `dot` de normalizados passa de 1,0 por f32 no ponto
  subestelar e os dois `pow(1.0-mu, …)` da lei de limbo e da cromosfera
  recebiam base negativa (regra 1 → NaN → bloom → tela branca, regra 3).
  Achado de auditoria externa; era o ÚNICO ponto do núcleo sem a guarda que
  `chromo.js:61` e `common.js:155` já tinham. Nunca explodiu nesta GPU (o
  driver devolve 0) — é portabilidade, e por isso passou despercebido.
  **As 18 vistas saem bit-idênticas com ele** (leva de 2026-08-12, 18/18
  `IGUAL` por `via=sinal`): `clamp` só difere de `max` acima de 1,0.
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

## Rodada 36 (2026-08-06) — a Grande Fenda existe, o mecanismo está certo, e o gate a recusa

A rodada que a fila mandava fazer. Ela **não entrou** — nenhuma das nove
configurações medidas bate o 0,7885 da linha de base. O que fica é o
mecanismo provado, a lei que o bloqueia e dois becos caros já pagos.

**Passo 0: onde em LATITUDE.** Despejar o perfil em b por bin de longitude
(sonda sobre as MESMAS capturas do gate, sem GPU nova) mostrou que o excesso
de l = +11…+41 não está espalhado: em l = +19° a razão nosso/foto vale
1,4–2,5 abaixo do plano e **7,0 / 10,8 / 12,1 / 9,7 / 7,5 em b = +2/+4/+6/
+8/+10**. É uma cunha ACIMA do plano, exatamente onde Su et al. 2020 e
Straižys et al. 2003 põem o Aquila Rift. Dito de outro jeito, e é a frase
que resume a deficiência: **o nosso céu é quase simétrico em torno do centro
(l=+19 vale 2,29 e l=−19 vale 2,35) e a foto é 2,6× mais escura do lado
positivo.**

**A componente construída** (`?riftav=`, revertida ao fim da rodada; a
especificação abaixo permite refazê-la numa edição): quatro gaussianas
esféricas em posição FIXA de cena, com a coluna resolvida em fórmula
FECHADA e aplicada FORA do laço de 24 passos — entre 150 e 700 pc o laço só
tem três amostras (t = 195 / 280 / 442) e uma nuvem de 30 pc cai entre elas.
`light *= exp(−A_V/1,0857)` no fim de `integrateGalacticDisk`: absorção pura
(o `dust` do LUT não emite, ao contrário do raymarch local, onde a mesma
`alpha` que atenua também acende) e gates externos idênticos por construção.

| l | b | d (pc) | σ (pc) | σ angular | A_V de pico |
|---|---|---|---|---|---|
| 13,0 | +7,0 | 260 | 30 | 6,6° | 1,2 |
| 23,0 | +5,0 | 250 | 26 | 5,9° | 1,5 |
| 32,0 | +3,0 | 440 | 36 | 4,7° | 2,2 |
| 39,0 | +1,5 | 650 | 42 | 3,7° | 1,4 |

| configuração | skyError | espessura | perfil | cor | fenda | bojoAnti | rift | bulgeAnti |
|---|---|---|---|---|---|---|---|---|
| **base** | **0,7885** | 0,3617 | 0,2691 | 0,1335 | 0,0087 | 0,0029 | 0,2531 | 5,584 |
| riftav 1 | 1,0321 | 0,3948 | **0,2057** | 0,1388 | 0,1350 | 0,1476 | 0,3794 | 4,746 |
| riftav 2 | 1,1760 | 0,4137 | 0,2033 | 0,1444 | 0,1838 | 0,2220 | 0,4282 | 4,332 |
| riftav 3 | 1,2614 | 0,4255 | 0,2217 | 0,1490 | 0,1924 | 0,2651 | 0,4368 | 4,092 |
| riftav 1 · bandav 0,11 | 0,8758 | 0,3712 | 0,2085 | 0,1348 | 0,0357 | 0,1139 | 0,2801 | 4,934 |
| riftav 1 · bandav 0,08 | 0,9057 | 0,3570 | 0,2112 | 0,1307 | 0,1104 | 0,0830 | 0,1340 | 5,106 |
| riftav 1 · bandav 0,05 | 0,8800 | 0,3333 | 0,2149 | 0,1258 | 0,1435 | 0,0465 | 0,1009 | 5,309 |
| bandav 0,05 sozinho | 1,1288 | **0,3097** | 0,2834 | **0,1214** | 0,2781 | 0,1178 | −0,0337 | 6,224 |
| armcon 2 | 0,7856 | 0,3617 | 0,2673 | 0,1347 | 0,0082 | 0,0013 | 0,2526 | 5,561 |
| armcon 4 | 0,7940 | 0,3593 | 0,2668 | 0,1358 | 0,0075 | 0,0124 | 0,2519 | 5,499 |

**O mecanismo está CERTO — a prova está na linha de baixo da tabela.** Com a
MESMA poeira total, posta axissimetricamente (`bandav 0,05` sozinho) o gate
dá 1,1288; posta no LUGAR real (mais `riftav 1`) dá **0,8800** — o perfil vai
de 0,2834 para 0,2149 e o bulgeAnti de 6,224 para 5,309. É a quarta
confirmação seguida de que **mudar o LUGAR conservando a quantidade paga**
(r32 poeira, r33 bojo, r34 corredor, r36 fenda). E o perfil por longitude
nunca se moveu tanto: 0,2691 → 0,2057, −24%.

**A LEI que bloqueia — ⚠ REVOGADA na rodada 39: o custo era inteiramente o
termo `bojoAnti`, que a auditoria tirou da soma no mesmo dia. Ver a seção da
r39 para a lei nova, medida, que inverteu os sinais.** O texto abaixo fica
porque explica o mecanismo e porque a aritmética segue certa para o gate
DAQUELE dia. O perfil é normalizado pela própria média e `bulgeAnti` é a
razão entre duas janelas de 60° em |b| < 10°. Por unidade de nprof removida:

- ganho no perfil = 1,03/48 = **0,0215**, em qualquer longitude;
- custo em bojoAnti tirando de **|l| < 30°** = (1/5,568)·(5,584/21,80) = **0,0460** — **2,14× o que rende**;
- custo tirando de **||l|−180| < 30°** = **0,2569** — **12× o que rende**;
- em **30° < |l| < 150° o custo é ZERO** (a razão bojo/anticentro é invariante lá), e o mesmo vale para ADICIONAR luz.

Os bins +11, +19 e +26 — 84% do excesso do Aquila — estão dentro de |l| < 30.
Não existe dose útil: a série riftav 1/2/3 é monotonicamente pior.

**Por que o gate resiste: ele já tem uma fenda, só que de mentira.** A poeira
axissimétrica das rodadas 32/33 produz um vale em b ≈ 0 em TODAS as
longitudes, e o termo `rift` (0,2531 contra alvo 0,2444) não pergunta ONDE.
O `bulgeAnti` crava pelo mesmo tipo de sorte: as duas janelas estão 15,6%
claras demais ao mesmo tempo (bojo 21,80/18,83 = 1,158, anticentro
3,904/3,382 = 1,154) e a razão sobrevive. **Pôr a estrutura verdadeira no
lugar verdadeiro quebra os dois proxies de uma vez, e o gate cobra mais do
que paga.** Sensibilidade medida: 0,010 de skyError por 1% de deslocamento
relativo entre as duas janelas — `bojoAnti` é o termo mais APERTADO do gate,
não o mais folgado. Destravar isto é decisão de RE-BASELINE da régua (a
mesma classe do antagonismo espessura↔rift já registrado na r33), não
correção de rodada.

**A alavanca nova que a rodada destapou, e é grande.** `bandav` está
sobredosado para os dois maiores termos: a 0,05 a espessura cai para
**0,3097** (o melhor valor já medido do maior termo, 46% do erro) e a cor
para **0,1214** (o segundo). Quem trava é só o termo `rift`, que despenca a
−0,034 sem a poeira axissimétrica. A rodada que junta "fenda local no lugar
certo" com "bandav baixo" já está a 0,8800 com espessura 0,3333 e cor
0,1258 — falta o termo `rift` deixar de ser cego ao lugar.

**Becos medidos (não repetir):** **contraste braço/interbraço do LUT**
(`armcon`, o termo estelar `mix(0,58; 1,28; arms)` → contraste 3,8× e 9,5×)
como via para as tangentes de Carina/Crux/Norma — o perfil move 0,0018 e
0,0023, autoridade NENHUMA sobre as tangentes; o 0,7856 do armcon 2 é
−0,003 sem mecanismo, e calibrar por ele seria ajustar à régua sem causa.
`riftav` em qualquer dose com `bandav` no default. `bandav 0,05` sozinho
(a fenda desaparece: rift −0,034).

**Ferramenta, dois cuidados novos:**
- **`?exp=` não sonda a curva de tom do gate.** `App.tsx:77` → `engine.ts:103`
  → `renderer.toneMappingExposure`, que o three só aplica DENTRO do
  `OutputPass` — depois do knee asinh (`post.ts:104`). Varrer `exp` mede o
  pé do ACES, não a compressão do knee.
- **A cadeia do gate AMPLIFICA contraste no pé, não comprime.** Medido com
  a mesma face a exp 2,2/3,1/4,4/6,2: d ln(medido)/d ln(pós-knee) = **1,446**
  na faixa (bate com a derivada do ACES de Narkowicz ali, 1,56 × 0,917 da
  decodificação ^2,2 contra o encode sRGB). O knee entra por
  `tanh(w)/w` com w = y/0,02 — 0,89 no céu tênue, 0,37 no miolo da faixa.
  Composto, a dose FÍSICA que a régua pedia era **A_V ≈ 1,0–1,5 mag**, o
  valor real do Aquila Rift. A suspeita de que o τ pedido era artefato de
  stretch (e portanto de 3,5 a 12 mag) está **REFUTADA por medição**.

**Achado lateral, sem rodada:** as nuvens-semente do raymarch estão famintas.
`molecular-clouds.bin` tem **210 nuvens em l = 15°…45° a 380–700 pc** (o
complexo Aquila/Serpens), mas `director.updateSeedClouds` escolhe as **32
mais próximas** e com a câmera no Sol as 32 ficam todas entre 101 e 155 pc
(corte em 140 pc de distância à superfície). Nada do Aquila entra. Alimentar
não paga pela conta de cobertura (raio no piso de 14 pc a 400 pc = 12,6 deg²
contra 768 deg² da janela; seriam ~370 nuvens empilhadas para A_V 1), e o
corpo do laço em `common.ts:158-161` roda SEMPRE por slot. Fica nomeado.

**Bug visual achado no caminho (não é de gate):** `nebulaShaders.ts:312`
(`tMax = 650`) corta pela metade, DENTRO DO QUADRO, qualquer volume de
150–600 pc no plano t = 104–116 do filme — um arco de truncamento no ar.

## Rodada 37 (2026-08-06) — o termo da fenda era cego ao LUGAR, e a Grande Fenda entrou

A rodada 36 terminou dizendo que a Grande Fenda estava certa e o gate a
recusava. O dono autorizou consertar a régua. Consertada, a fenda entrou —
e o que ela destapou é maior do que ela.

**O termo estava mentindo, e o número é grosseiro.** `rift` era o ESCALAR
`|média(nossa) − média(ref)|` sobre as 11 longitudes de l ∈ [−35°, +45°]:
0,0087, quase cravado. Comparando bin a bin, a mesma captura dá **0,5241** —
a média cancelava uma **anticorrelação quase perfeita**:

| l | nossa | foto | l | nossa | foto |
|---|---|---|---|---|---|
| −11 | **0,683** | −0,049 | +19 | −0,070 | 0,224 |
| −4 | **0,756** | −0,158 | +26 | −0,029 | **0,758** |
| +4 | **0,810** | −0,110 | +34 | −0,077 | **0,817** |

Tínhamos um vale FUNDO cortando o centro galáctico, onde a foto não tem
nenhum, e vale NENHUM em l = +26°/+34°, onde a foto tem o mais escuro do
céu. A latitude confirma: em l = +26°/+34° o mínimo da foto está em
b = +4,1°/+2,4° (o Aquila) e o nosso está preso em −10,1°, a BORDA da
janela de busca — o código de "não existe vale aqui".

**A correção é a menor possível: comparar a CURVA, como `nprof` e `thick` já
faziam.** `riftProf` (profundidade por longitude) entra no skyError;
`riftB` (a latitude do vale) fica exposta como diagnóstico e é impressa por
`--perfil`. *ponytail: a latitude não entra na nota — um vale certo em
longitude e espelhado em b passaria, mas para isso a poeira teria de deixar
de ser simétrica em b, e aí a curva de profundidade já acusa. Se o caso
aparecer, `riftB` vira termo.*

**RE-BASELINE: os números do céu a partir daqui NÃO são comparáveis com o
histórico.** Mesma imagem, régua nova: **0,7885 → 1,3039**, e a fenda vira o
maior termo (0,5241, 40%).

**E aí a rodada 36 pagou.** Duas mudanças, um mecanismo: a poeira
axissimétrica das rodadas 32/33 (`bandav 0,15`) sai, e as quatro nuvens do
Aquila Rift entram no lugar dela. **skyError 1,3039 → 0,8693, −33%.**

| termo | antes | depois | alvo |
|---|---|---|---|
| **fenda** (curva) | 0,5241 | **0,1854** | 0 |
| espessura | 0,3617 | **0,3239** | 0 |
| perfil por longitude | 0,2691 | **0,2180** | 0 |
| cor | 0,1335 | **0,1192** | 0 |
| bojoAnti | 0,0029 | **0,0022** | 0 |
| púrpura | 0,0126 | 0,0207 | 0 |
| **skyError** | **1,3039** | **0,8693** | 0 |

Cinco dos seis termos melhoram, e os dois maiores da era anterior
(espessura e cor) melhoram JUNTO — eram eles que a poeira axissimétrica
pagava. Só o púrpura piora (+0,008), e ele é 2% do erro.

**Série de dose medida (21 capturas; `riftav` × `bandav`):** 1,2×0 →
**0,8693** · 1,5×0 → 0,8595 · 1,8×0 → 0,8981 · 2,2×0 → 0,9477 · 1,5×0,015 →
0,8929 · 1,2×0,04 → 0,9042 · 1,5×0,03 → 0,9151 · 1,5×0,05 → 0,9511 ·
1×0,05 → 0,9342 · 2×0,05 → 1,0168 · 1,5×0,08 → 1,0196 · 2,5×0,05 → 1,0770 ·
1×0,15 → 1,3015 · 2×0,15 → 1,4039. **A dose 1,5 vence por 0,0098 e NÃO foi
tomada**: 1,2 é o valor conservador da literatura (picos de 1,44 a 2,64 mag
contra o A_V ≤ 3 de Straižys) e deixa o bulgeAnti cravado. A dose vem da
física, a nota se aceita como vem — a mesma disciplina do `corewall` da r34.

**Pendência honesta declarada:** com `bandav = 0` a faixa DISTANTE volta a
ser opticamente fina (só `dustProc`, 0,004 mag/kpc, e as fendas APOGEE), o
que é física pior que 0,15 mag/kpc. O gate prefere assim porque a
componente axissimétrica cavava o centro; a saída certa não é zero, é
re-dosar **`bandav`, `dustrd` e `bulgeq` JUNTOS sob a régua nova** — os três
foram calibrados contra o termo quebrado. É a rodada seguinte, e agora ela
tem juiz.

**Knobs / identidade:** `?riftav=` (multiplicador dos A_V da tabela;
**0 + `bandav=0.15` devolve o estado da rodada 36 EXATO**, mesmo GLSL,
conferido por md5) e `?bandav=` (0,15 = a poeira difusa das r32/33).

## Auditoria dos termos dos dois gates (2026-08-06) — o que sobrou como regra

Aberta pela r37: se o termo da fenda estava cravado por cancelamento, os
outros podiam estar. Auditados os SEIS do céu e os do gate externo.

**O TESTE, e ele é de uma linha.** Todo termo que resume uma FAMÍLIA (bins,
anéis, escalas, bandas) pode ser escrito de duas formas: `|média(Δ)|`
(o módulo depois) ou `média(|Δ|)` (o módulo dentro). Pela desigualdade
triangular a segunda é sempre ≥ a primeira, **com igualdade se e só se o
sinal do erro for constante**. A razão entre as duas é a medida exata do
que a média está escondendo: 1,00 = nada; a fenda antes da r37 dava 60×.

**E há uma identidade útil, mas ela NÃO é de graça.** Uma razão de somas *é*
a média ponderada das razões locais: para `cor = (Σr·V − Σb·V)/(Σr·V + Σb·V)`
vale `cor = Σ_k w_k c_k` com `w_k = Σ_bin (r+b)·V`. Tenta-se então escrever o
termo honesto como `Σ_k w_k^ref · |c_k^nosso − c_k^ref|`. **Cuidado: a
desigualdade triangular NÃO se aplica aqui**, porque o termo de hoje usa
`w^nosso` de um lado e `w^ref` do outro, e a forma proposta usa `w^ref` nos
dois. Contraexemplo de uma linha: se `c^nosso = c^ref` em todo bin mas os
pesos diferirem, a forma nova dá 0 e a antiga não. A troca mexe em
**ponderação e agregação ao mesmo tempo**, e o re-baseline tem sinal
desconhecido. Usar o peso da REFERÊNCIA continua defensável por outro motivo
— tira do termo de cor o peso de luminância, que o `perfil` já mede — mas é
uma decisão, não um teorema. **A desigualdade só vale limpa quando os dois
lados compartilham o peso** (é o caso de `fenda`, `perfil` e `espessura`,
onde os bins têm contagem igual).

| termo | gate | razão média\|Δ\| / \|médiaΔ\| | veredito |
|---|---|---|---|
| **fenda** | céu | **60×** antes da r37 | estava quebrado, consertado |
| **bojoAnti** | céu | função EXATA do `perfil` | **peso duplo — SAIU da soma** |
| purpura | céu | 1,56× | subestimado, mas vale 2% do erro |
| espessura | céu | **1,12×** | honesto hoje |
| cor | céu | **1,06×** | honesto: o sinal é constante |
| perfil | céu | 1,91× se aberto em latitude | honesto na sua função (ver abaixo) |
| **harmonicError** | externo | `Σ_m \|média sobre 56 anéis\|` | **quebrado, mesma doença da fenda** |
| **thickRatio** | externo | média de 4 dos 12 bins de `thickness` | **peso duplo: os 12 já entram como curva** |
| warpAmp | externo | \|·\| depois da média por lado | suspeito, não medido |
| clumpInner/Outer | externo | curva elemento a elemento | honesto |

**`bojoAnti` saiu do skyError e continua impresso.** A prova é aritmética
fechada: `bulgeAnti` = média(`nprof` nos 8 bins de |l|<30) / média(`nprof`
nos 8 bins do anticentro) — as janelas caem em fronteira de bin, a contagem
de pixels por bin é igual e a normalização por `pm` cancela na razão.
Reconstruído do `nprof` da r36 dá 5,590 contra os 5,584 que o gate
reportava (a diferença é arredondamento a 4 casas). Somá-lo era dar peso
DUPLO a 16 dos 48 bins do perfil. Ele fica impresso porque afere a
**RÉGUA**, não o modelo: os 5,58 contra 5,57 são a prova de 2026-08-03 de
que o stretch asinh do protocolo está certo, e essa prova não se perde.
skyError **0,8693 → 0,8672** (o termo valia 0,0022).

**A COR não está escondendo cancelamento, e a prova é DIRETA, não o
teorema.** A primeira decomposição usou média SIMPLES entre os 48 bins e deu
0,2682 — "2,3× o escalar". Está errado: dar o mesmo peso ao miolo brilhante
e às bordas escuras infla o número com razões de bins quase pretos. Com o
peso da referência, `cor' = 0,1264` contra 0,1191 — 1,06×. Mas a evidência
que fecha a questão é olhar a tabela: **os 48 bins erram TODOS para o mesmo
lado** (somos azuis demais em cada um deles). Onde o sinal é constante não
há o que cancelar, e isso se vê sem nenhuma álgebra. **Regra que fica:
decompor um termo ponderado usando média simples não é auditá-lo, é
trocá-lo por outro termo.**

**Mas o achado FÍSICO da decomposição é grande, e é do modelo, não da
régua:** fora do miolo o nosso céu é grosseiramente azul demais —
l = +154° dá −0,406 contra +0,132 da foto, l = −146° dá −0,465 contra
−0,016 — enquanto no centro quase crava (+0,087 contra +0,121). A causa
tem endereço de uma linha: o extremo FRIO de `diskColor`
(`nebulaShaders.ts`, `vec3(0.30, 0.43, 0.78)`) vale exatamente
**−0,4444** na métrica de cor, e é ele que pinta todo o disco longe do
centro. É a dívida que o NORTE já registra em "Becos sem saída" como
*cor do disco decidida por raio* — e que a unificação 1→3 substitui.
Controle: `?nocat=1&nowrap=1` PIORA o desvio (0,2682 → 0,3251), então as
estrelas mascaravam o defeito em vez de criá-lo.

**Não abrir o `perfil` em latitude.** Ele erra 1,91× mais quando aberto em
5 faixas de b, mas essa informação é a FORMA em latitude, que é o objeto
da `espessura` e da `fenda`. Abrir viraria a doença do `bojoAnti` — peso
duplo. A fatoração certa é ortogonal por construção: `perfil` = amplitude
azimutal, `espessura` = forma em b, `fenda` = mínimo local contra flancos.

**Controle de ESTRELA, e ele vale para todos os termos.** Estrelas podem
fabricar profundidade de fenda (uma no flanco sobe o `flank`) ou apagá-la
(uma no mínimo), e a coluna da fenda soma só **30 px** contra os 2.400 px de
um bin do `nprof` — 80× mais frágil, com `min` e `max`, as duas estatísticas
de ordem mais sensíveis a outlier do projeto. Medido com `?nocat=1&nowrap=1`:

| termo | base | sem estrelas | movimento |
|---|---|---|---|
| espessura | 0,3239 | 0,2979 | −8,0% |
| perfil | 0,2180 | 0,2429 | **+11,4%** (8 dos 48 bins) |
| **fenda** | 0,1854 | 0,1871 | **+0,9%** (0 dos 11 bins) |
| cor | 0,1192 | 0,1170 | −1,8% |
| purpura | 0,0207 | 0,0216 | +4,3% |
| bojoAnti | 0,0022 | 0,2347 | **×107** |

**A fenda passa** — o mecanismo frágil é real mas não aparece, porque
`nohero=1` e o stretch `knee=0.02&exp=4.4` comprimem exatamente o pico. Quem
tem sensibilidade real é o `perfil` (11%) e a `espessura` (8%). E o ×107 do
`bojoAnti` é mais um motivo para ele ter saído da soma.

**Cuidado de método que a auditoria destapou — a régua "determinística"
prova menos do que parece.** O NORTE registra 3 repetições × 3
configurações reproduzindo seis termos a 4 casas. Isso não valida a
métrica: o jitter do raymarch é `texture2D(uBlueNoise, gl_FragCoord.xy/64)`
— tile FIXO indexado por coordenada de tela, sem `uTime` — e `?shot=`
congela o relógio, então repetir é bit-idêntico **por construção**. Pior:
o padrão fixo tem período de 64 px em meia-res = ~8° no centro da face,
quase a escala do bin de 7,5°. **Afirmação sobre uma célula individual
exige ablação do próprio ruído (deslocar o tile ou mudar N do raymarch),
não repetição.**

**Refutado pelo próprio adversário (não repetir a suspeita):** subamostragem
de croma no JPEG da referência. O arquivo é **4:4:4** (SOF0, três
componentes h=1 v=1, qualidade ~93); o erro de quantização na cor média de
uma célula de 30°×20° é ~8·10⁻⁶ contra `cor` ≈ 0,12 — quatro ordens de
grandeza abaixo. Os polos também não contaminam |b| < 10 (a face é
escolhida por maior `dot(v, fwd)` e as equatoriais ganham sempre lá), e as
costuras em l = ±45° caem exatamente em fronteira de bin.

**O GATE EXTERNO foi consertado no mesmo dia — e era o pior dos dois.**
Imagens **bit-idênticas** (md5 `873e64b2` face-on e `c0743465` edge-on, os
mesmos desde a r33): só a régua mudou.

| nota | régua velha | régua honesta |
|---|---|---|
| **harmonicError** | 0,0371 | **0,3920 — 10,6×** |
| **toneError** | *não existia* | **0,1753** |
| clumpError | 0,0587 | 0,0603 (entrou o `grain` do miolo) |
| edgeError | 0,4181 | 0,4124 (saiu o `thickRatio`) |

**As SEIS harmônicas escondiam cancelamento, nenhuma escapou:**
m=1 8,2× · m=2 **13,3×** · m=3 **23,7×** · m=4 7,0× · m=5 16,2× · m=6 7,6×.
E o A₂ anel a anel diz o defeito real, que a média tornava invisível:

| raio | nosso A₂ | alvo |
|---|---|---|
| 0,30 R90 | 0,207 | 0,104 |
| 0,41 R90 | **0,104** | **0,412** |
| 0,65 R90 | 0,275 | 0,150 |
| 0,76 R90 | **0,337** | **0,029** |
| 1,04 R90 | 0,195 | 0,258 |

**A nossa espiral tem a força média certa e a DISTRIBUIÇÃO RADIAL errada** —
forte onde a recriação-alvo é lisa, lisa onde ela é forte. É a mesma
assinatura de anticorrelação da fenda, agora no eixo radial, e é a alavanca
nomeada para a próxima rodada do face-on. A r30 tinha visto a ponta disto
(m=2 0,40 contra 0,20 no anel externo) e consertado UM anel; o resto ficou.

**`toneError` (0,1753) por parte:** púrpura **0,0833** · cor 0,0581 · perfil
radial 0,0338. O púrpura é o maior, o que confirma pela primeira vez com
juiz o que o ledger já mostrava sem juiz: 0,1047 contra alvo 0,2010.

**O que ficou de FORA de propósito:** `discMean` (brilho absoluto — depende
da exposição, que é knob soberano); `warpAmp` (a média COM SINAL antes do
módulo é a definição física do warp — deslocamento coerente da ponta, não
espalhamento; trocar mediria outra coisa); `laneDepth`/`laneOffset` (sem
resolução radial dentro de |u| ≤ 0,25 — suspeita nomeada, não medida).

Histórico de como se chegou aqui: o `harmonicError` já tinha sido
diagnosticado na rodada 30
(“a média escondia erro de FORMA radial porque o miolo compensava a borda”)
sem nunca ser trocado. **A magnitude, porém, NÃO se estima dos números da
r30**: aqueles são de ANTES da correção dela, que mexeu exatamente no anel
1,0–1,22 R90 e deixou m=2 em 0,2408 contra 0,2490 — com o sinal invertido.
O cancelamento era estruturalmente possível e documentado como medido, e a
estimativa que eu tinha feito (fator ~4,3) estava errada por baixo: medido,
é **10,6×**. O conserto foi barato e sem GPU — `analyse` já calculava
`amp[m]` por anel e o descartava; passou a guardar (`harmonicProf`) e a
comparar como curva, do mesmo jeito que a `fenda`. O `EVOLUCAO.md` ganhou
uma tabela própria para a era da régua honesta e a antiga ficou marcada
como não-comparável.

**O buraco que era MAIOR que qualquer cancelamento, também fechado:** no
face-on, `profile`, `colour` e `purp` eram calculados e **não entravam em
score nenhum** — nem em `harmonicError` (que só usava `harmonics`) nem em
`clumpError` (clump + `grainOuter`). O `purp` ficou em **0,1047 contra alvo
0,2010, metade, desde a rodada 20 — dezessete rodadas sem juiz**. Agora os
três são a terceira nota, `toneError`. Junto entrou o `grain` do miolo no
`clumpError`: ele tem alvo e o `grainOuter` já era cobrado, então ficar de
fora era assimetria, não decisão.

**A regra que fecha a auditoria, e vale para toda régua futura: um número
comparável e ERRADO vale menos que um número novo e HONESTO.** Segurar o
conserto para preservar a comparabilidade foi o instinto errado — o
histórico não se perde, fica marcado como era anterior.

**Bug de ledger consertado aqui, e é da ferramenta:** `rodada.mjs` apendava
a linha do edge-on no fim do ARQUIVO. Isso valia quando Edge-on era a última
tabela; com a tabela “Céu interno” abaixo dela, a linha do edge-on caía
dentro da tabela do céu (aconteceu na r37 e foi commitado). A linha agora
entra no fim da PRÓPRIA seção, e a checagem de duplicata olha só ela — o
regex antigo era guloso e achava a rodada em qualquer tabela abaixo, o que
mascarava o erro. **Regra: escrita em documento com seções nunca apenda no
fim do arquivo.**

## Rodada 39 (2026-08-06) — a re-dosagem fechou em zero, e o que ela destapou foi a régua de novo

A fila mandava re-dosar `bandav`, `dustrd` e `bulgeq` JUNTOS, porque os três
tinham sido calibrados contra o termo de fenda quebrado. Feito, com 16
capturas. **Dos três, um estava errado por arredondamento, um é inerte e um
já estava no ótimo — e no meio apareceu um buraco na régua que sozinho
invertia o veredito da rodada.**

**`dustrd` é INERTE, e isso é um achado sobre o código, não sobre a dose.**
Ele só multiplica `dustDiffuse`; com `bandav = 0` (o default desde a r37) o
template emite `0.0000 * exp(...)` e o compilador dobra. Medido:
`?dustrd=5200` dá 0,8874, os cinco termos idênticos a 4 casas. **A
consequência incomoda: o conserto da r33 — "a poeira tem escala radial
própria, 2,1 kpc" — foi aplicado exatamente à componente que a r37
desligou, e o `dustProc`, a única poeira viva hoje, carrega
`exp(-radius/5200)` FIXO, a escala do disco fino ESTELAR.** A afirmação do
NORTE de que a poeira usa a escala dela não é verdade no código de hoje.

**`bandav` fecha em ZERO, com sete doses e sem ambiguidade:**

| bandav | 0 | 0,02 | 0,03 | 0,05 | 0,07 | 0,10 | 0,15 |
|---|---|---|---|---|---|---|---|
| skyError | **0,8874** | 0,8977 | 0,8928 | 0,8974 | 0,9072 | 0,9236 | 0,9506 |

A troca é sempre a mesma e é de quatro para um: a coluna difusa compra
`perfil` (0,2180 → 0,2014) e `purpura` (0,0207 → 0,0099), junto ~0,022 até
0,15, e paga `espessura` (0,3239 → 0,3995) e `cor` (0,1192 → 0,1400), junto
~0,097. `dustrd = 5200` não reverte o sinal (0,9028 contra 0,8974 em
bandav 0,05) — ele muda ONDE a coluna cai, não o balanço.

**E a "dívida física" que justificava a rodada era retórica.** O argumento
era que `bandav = 0` deixa a faixa distante opticamente fina, "física pior
que 0,15". A conta desmonta: o modelo integra ~0,01 mag/kpc de `dustProc` no
plano, então **0,15 já era 10× menor que o ~1,5 mag/kpc do meio real** — os
dois lados da discussão estavam uma ou duas ordens de grandeza abaixo da
física. A LUT da faixa é limitada por EMISSÃO, não por extinção: a
calibração de `light` (`* 0.000052`) não é absoluta, então **não existe
âncora de literatura que decida este knob** e o gate decide sozinho. Pagar a
dívida de verdade é a unificação 3 (κ e Σ absolutos), não uma dose. Uma
faixa com A_V 1,5 mag/kpc de verdade satura em τ ≈ 1 a 750 pc e seria outro
céu — o que, aliás, é o céu real.

**`bulgeq` 0,30 → 0,26, e é o único ganho de imagem da rodada.** Os 0,30 da
r33 eram arredondamento; 0,26 é o valor que Wegg & Gerhard 2013 medem no
aglomerado vermelho do VVV. Curva fechada em quatro doses — 0,23 → 0,8790 ·
**0,26 → 0,8783** · 0,30 → 0,8874 · 0,40 → 0,9124 — com o mínimo em cima da
literatura e o ganho no maior termo (espessura 0,3239 → **0,3097**). O
default novo reproduz a varredura com as **seis faces bit-idênticas por
md5**, e os gates externos ficaram intactos (`873e64b2` face-on,
`c0743465` edge-on) — `nebulaFade = env` e `env = 0` nos dois holds, então o
passe da faixa nem roda lá.

### O buraco da régua, e ele estava pré-registrado

Antes do conserto, `bandav = 0,05` marcava **0,8530** contra 0,8672 da
baseline — a rodada parecia paga. Não estava. Abrindo a fenda bin a bin:

| l | foto | nós (bandav 0) | nós (0,05) | b do vale: foto / nós |
|---|---|---|---|---|
| +41 | 0,300 | 0,023 | **0,311** | **+9,9° / +0,4°** |

**Um bin.** Todos os outros dez se moviam ≤0,006. A profundidade batia e a
estrutura era outra: o vale da foto sobe a b ≈ +10°, o nosso é a poeira
axissimétrica cavando o plano. Esse único bin valia −0,027 no termo,
enquanto os quatro termos honestos pioravam monotonicamente
(0,6818 → 0,6889 → 0,6948 → 0,7227).

O comentário `ponytail:` da r37 tinha escrito a hipótese e a condição de
disparo: *"um vale certo em longitude e espelhado em b passaria… Se algum
dia esse caso aparecer, `riftB` vira termo."* O caso apareceu.

**O conserto não fez `riftB` virar termo, e a razão é ponytail: isso
custaria um peso arbitrário entre grau e adimensional.** Em vez disso, a
**foto define ONDE medir** — `bandMetrics(ours, R.riftYmin)` avalia a nossa
profundidade na latitude do vale da referência. Sem termo novo, sem
constante, e o buraco fecha por construção: um vale nosso no lugar errado
deixa de render, e onde a foto não tem vale a conta segue valendo (mede-se a
nossa profundidade ali, e um vale nosso é cobrado). Comparar cada imagem no
seu próprio mínimo comparava duas coisas diferentes.

**RE-BASELINE (o terceiro do dia): a mesma imagem vai de 0,8672 a 0,8874**,
só a fenda muda (0,1854 → 0,2056). Nada foi capturado — o harness ganhou
`--so-medir`, que re-mede PNGs já em disco sem GPU e sem dev server. Ele
existe porque a régua muda mais que o render, e re-capturar dez
configurações para produzir bytes idênticos é meia hora de GPU por nada.

**Conferência do que a r37 adotou, sob a régua consertada:** `riftav = 0`
mede **1,0496** contra 0,8874 — a Grande Fenda segue pagando −0,16, a
decisão se sustenta. `riftav = 1,5` mede 0,8723 e a preferência do gate
CRESCEU (0,0151 contra os 0,0098 de antes); segue não tomada, porque ×1,5
põe a nuvem mais funda em A_V 3,3 e Straižys mede ≤ 3. Se alguém quiser
reabrir, o que decide é o A_V do componente de 440 pc em Su 2020, não o gate.

### A LEI de custo por longitude MORREU — e ninguém tinha percebido

O NORTE manda toda proposta do céu passar pela peneira da r36: tirar luz de
|l| < 30° custa 2,14× o que rende, do anticentro 12×, e só 30° < |l| < 150°
é de graça. **Esse custo era INTEIRAMENTE o termo `bojoAnti`, que a
auditoria de 2026-08-06 tirou da soma.** Com ele fora, `skyError` é a soma
dos cinco e `bojoAnti` contribui exatamente zero (conferido: soma5 = 0,8874
= skyError). A peneira que bloqueou a r36 não existe mais.

Re-derivada da própria captura, sem GPU (multiplicar a luz bruta de um setor
por 0,9 e renormalizar):

| setor | Δ no termo `perfil` |
|---|---|
| \|l\| < 30° | **−0,0140** (ajuda — antes custava 2,14×) |
| anticentro (\|\|l\|−180\| < 30°) | −0,0024 e −0,0001 (neutro — antes 12×) |
| l = 30…150° | −0,0058 |
| **l = 210…330°** | **+0,0328 (proibido)** |

A inversão é completa: o lugar caro agora é **Carina/Centauro/Norma**, onde
falta luz (l = −34…−79 mede −0,30 a −0,57 contra a foto), e o lugar barato é
o miolo, onde sobra. **A r36 foi barrada por um custo que hoje é zero** —
mas isso não a ressuscita: a série `riftav` 1,2/1,5/1,8/2,2 já foi remedida
sob a régua nova e 1,8/2,2 seguem piores, porque o excesso do miolo é
SIMÉTRICO (l = −26/−19/−11 erram +0,47/+0,74/+0,60, tanto quanto +11/+19) e
o Aquila só cobre um lado.

### A alavanca seguinte, com endereço e tamanho

`espessura` é 35% do erro, e a decomposição por longitude diz onde ela mora.
**Somos GROSSOS demais em 21 dos 24 bins**, e a conta se concentra:

| l | foto | nós | % do skyError |
|---|---|---|---|
| 203° | 4,50° | **9,75°** | 5,7% |
| 173° | 3,50° | **8,00°** | 4,9% |
| 218° | 3,75° | 6,75° | 3,3% |
| 188° | 4,50° | 6,50° | 2,2% |
| 233° | 3,50° | 5,50° | 2,2% |

**Cinco bins do anticentro somam 18% do skyError inteiro** (os dez de
|l| ≥ 112° somam 22,4%) — mais que o termo `cor` completo. E eles são
**CEGOS a tudo que esta rodada mexeu**: entre `bandav` 0 e 0,05 não se
moveram um único quantum (a régua tem passo de 0,25°), e são bit-idênticos
entre base, `bq026`, `rift15` e `av05`.

Dois fatos apontam a mesma direção: `nprof` (|b| < 10°) diz que ali somos
fracos demais e `thick` (|b| < 25°) diz que somos largos demais — ou seja,
**miolo fraco e asas claras**. **Não são as estrelas: a auditoria já mediu
`?nocat=1&nowrap=1` movendo a espessura de 0,3239 para 0,2979, −8,0% —
quem carrega 61% do termo não cabe em 8%.** A |b| = 10–25° a 2 kpc a única
coisa nossa que sobra é o **disco espesso da LUT**, cuja escala radial é
**6500 pc contra 5200 do fino**. Mais longa que a do fino, quando a
literatura põe o espesso em ~2000 pc, MAIS CURTO — é a inconsistência (3)
que a auditoria externa de 2026-08-03 registrou em `wrappedStars.ts` e que
vale igual aqui. A conta estimada: a 4 kpc no anticentro o disco espesso
carrega 31% do fluxo da coluna; com escala curta cairia para ~10%. O
concorrente é o `flare` (`mix(210, 460, flare)`, quadrático a partir de
7500 pc), que também só morde no anticentro. **`?nonebula=1` separa os dois
do resto numa captura**, e nenhum dos dois toca os gates externos por
construção.

### O que as cinco lentes acrescentaram (workflow só-leitura, ~1,1 M tokens)

Três coisas que a medição sozinha não teria dado, e uma refutada acima:

1. **O termo `fenda` mede, na maioria dos bins, CONCENTRAÇÃO VERTICAL, não
   vale.** A janela de busca é ±10° e o mínimo da FOTO cai na borda (b =
   −10,1 ou +9,9) em l = −34, −11, −4 e +41, com mais três a menos de 1° da
   borda (−26, −19, +19). **Só três dos onze bins medem vale de verdade:**
   l = +11 (b +3,6), +26 (+4,1) e +34 (+2,4) — e são exatamente a Grande
   Fenda. Nos outros, `1 − col[ymin]/flank` compara b ≈ ±10 contra o máximo
   do núcleo. Não é erro (o número é bem definido e a comparação é justa
   depois do conserto da r39), mas **é outra grandeza**, e somada à
   `espessura` diz que ~metade da nota do céu é um defeito só: *a faixa não
   se concentra em b, e o pior pedaço é o anticentro*.
2. **A cor tem dose fechada, não busca.** `colour` é razão de somas, logo é
   AFIM na cor da população fria: com ρ_quente = +0,4085 e o medido −0,0551
   sai a fração f = 0,543, e bater a foto (+0,0641) exige **ρ_frio = −0,225**
   — contra os −0,4444 de hoje. O `vec3(0.39, 0.42, 0.62)` casa as três
   condições ao mesmo tempo: luminância 0,4278 (idêntica à de hoje), púrpura
   0,140 (idêntica) e ρ = −0,225. **Conserva luminância pixel a pixel, então
   move ZERO luz em qualquer longitude** e espessura/perfil/fenda deveriam
   ficar parados por construção — o que é o próprio teste da hipótese.
   Predição: cor 0,1208 → 0,00–0,05, skyError → 0,78 ± 0,03. Cuidado: isto é
   remendo sobre a dívida "cor do disco decidida por raio" que a unificação
   1→3 substitui, e não a quita.
3. **A dívida da faixa fina tem diagnóstico melhor do que "o gate não
   deixa": a componente que falta é LOCAL e GRUMOSA.** Os vales que a foto
   mostra vivem em b = 2,4–9,9°, latitude que só poeira a menos de 1 kpc
   ocupa; uma laje axissimétrica de 70 pc a kiloparsecs de distância não
   chega lá em ângulo nenhum. **A laje é o instrumento errado para o defeito
   medido** — é por isso que sete doses de `bandav` só pagam.

O adversário acertou o veredito ("a rodada não paga") e errou de novo a
razão — previa que quem cobraria seria a `fenda` (+0,571/unidade); medido,
a fenda até melhora de leve e quem cobra é a **espessura (+0,504/unidade)**
e a **cor (+0,139/unidade)**. Segunda rodada seguida em que o adversário
fecha o veredito por aritmética antes da GPU e erra o mecanismo: **usar o
veredito dele, nunca a atribuição.**

## Rodada 40 (2026-08-06) — a cor fria do disco era um corpo negro de 25.000 K

A dívida que o NORTE registrava havia rodadas como "cor do disco decidida por
raio" tinha um número e um endereço de uma linha: o extremo frio de
`diskColor`, `vec3(0.30, 0.43, 0.78)`, valia **−0,4444** na métrica de cor e
pintava TODO o disco longe do centro. Fora do miolo o céu media −0,406 em
l = +154° contra +0,132 da foto.

**O achado que decidiu a rodada: aquela constante É corpo negro.** Rodando a
`blackbodyLinear` do próprio projeto (a mesma lei das estrelas, `common.ts`)
e normalizando à luminância dela, 25.000 K devolve **(0,2977; 0,4302;
0,7838)** contra os (0,30; 0,43; 0,78) pintados à mão — três casas. Ou seja:
alguém escolheu, sem saber, a cor de um corpo negro **mais quente que uma
estrela O**. Nenhuma população estelar INTEGRADA chega perto: as regiões mais
azuis de uma Sc ficam em B−V ≈ 0,25 (~8.000 K), e um disco Sbc inteiro
integra B−V ≈ 0,6, que Ballesteros converte em **5.968 K**.

**A construção, e ela é o teste da hipótese.** `?coldt=` em kelvin, com duas
quantidades da constante antiga CONSERVADAS:
- **luminância Y = 0,4276** — a rodada não move um fóton de lugar, então
  `espessura`, `perfil` e `fenda` TÊM de ficar parados. Ficaram, nas quatro
  casas, nas oito capturas. Nenhuma outra rodada do céu teve controle assim.
- **púrpura 0,141** — o G abaixo da média de R e B não é erro de corpo negro,
  é o espalhamento λ^−1,3 e a emissão nebular que o projeto modela de
  propósito. Sem conservar, o termo `purpura` (já baixo) pagaria mais.

| T do extremo frio | 25.000 | 12.000 | 9.800 | 8.000 | 7.000 | 6.400 | **6.000** | 5.400 |
|---|---|---|---|---|---|---|---|---|
| skyError | 0,8796 | 0,8464 | 0,8319 | 0,8148 | 0,8014 | 0,7910 | **0,7811** | 0,7822 |
| `cor` | 0,1220 | 0,0867 | 0,0700 | 0,0486 | 0,0315 | 0,0185 | **0,0084** | 0,0097 |

**skyError 0,8783 → 0,7811, −11%**, e o termo `cor` praticamente zerou
(`colour` +0,0557 contra +0,0641 da foto). O mínimo do gate cai **dentro da
janela física** (B−V 0,5–0,75 ⇒ 5.400–6.400 K) e em cima do valor central —
mesma situação do `bulgeq` na r39: a literatura dá o intervalo, o gate
escolhe dentro dele.

**Cuidado de método que a rodada ensina, e vale para qualquer constante
pintada: rode a lei física do projeto sobre ela antes de discutir a dose.**
Se a constante estiver na curva, você descobre de graça o parâmetro que
alguém escolheu sem declarar — e aqui o parâmetro era absurdo. O knob passou
a ser a TEMPERATURA, não três floats: `?coldt=25000` devolve o estado antigo
(em 3 casas, não bit-exato — a normalização mexe no quarto decimal).

**O preço, declarado:** `purpura` 0,0206 → 0,0364 (`purp` 0,0577 → 0,0420
contra alvo 0,0784). A cor ganha ~7× o que o púrpura perde, mas a rodada
AFASTA o púrpura do alvo, e ele é a mesma deficiência que a vista externa
carrega desde a r20. Não é dívida nova, é a mesma — e a resposta dela
continua sendo população (H II, espalhamento), não paleta.

**O que NÃO se resolveu, e continua em "Becos sem saída":** a cor do disco
ainda é decidida por RAIO (`mix(cold, warm)` com `towardCenter`), então o
disco segue geometricamente incapaz de púrpura onde a física o pede. A r40
troca um extremo errado por um extremo defensável; **a unificação 1→3
continua sendo o conserto de verdade.**

**Olhar, não só medir (critério do dono):** comparadas as faces do
anticentro antes e depois, o véu azul da faixa distante virou um brilho
pálido e neutro, e as nuvens LOCAIS mantiveram azul-petróleo e púrpura
intactos — aquele azul vem do raymarch, não desta constante. O contraste
entre faixa e nuvem aumentou. Gates externos bit-idênticos pela terceira
rodada seguida (`873e64b2` face-on, `c0743465` edge-on).

## Diagnóstico da espessura do anticentro (2026-08-06) — o dono é o volume LOCAL

O maior termo do gate do céu (espessura 0,3097, 40% da nota) concentra 22,4%
do skyError inteiro em dez bins de |l| ≥ 112°, e eles são cegos a tudo que as
rodadas 39 e 40 mexeram — bit-idênticos entre `bandav`, `bulgeq`, `riftav` e
`coldt`. Nenhuma ablação existente separava os suspeitos: `?nonebula=1`
derruba a LUT distante E o raymarch local de uma vez. Entrou `?nolocal=1`
(diagnóstico, nunca default): apaga o laço de raymarch e o véu do plano e
deixa **só a LUT da faixa**.

| l | foto | base | só a LUT | sem estrelas |
|---|---|---|---|---|
| 188° | 4,50 | 6,50 | 5,00 | 5,50 |
| **203°** | 4,50 | **9,75** | **5,75** | 9,75 |
| 218° | 3,75 | 6,75 | 5,00 | 6,00 |
| 233° | 3,50 | 5,50 | 6,50 | **3,75** |
| 128° | 5,25 | 6,50 | 3,50 | 6,50 |
| **173°** | 3,50 | **8,00** | **4,25** | 8,00 |

**Soma de |erro| nos dez bins: base 20,25 · só a LUT 11,00 · sem estrelas
17,25.** Ou seja: **o raymarch LOCAL carrega 46% do excesso, as estrelas 15%,
e o resto é da LUT.** As duas hipóteses que a leitura de código sugeria estão
REFUTADAS como donas: nem o disco espesso da LUT (escala radial 6500 pc) nem
o `flare` explicam os dois piores bins, que caem de 9,75→5,75 e 8,00→4,25
quando só o local sai. A lente adversária que apostou nas estrelas também
erra o tamanho — mas acerta em UM bin: l = 233° vai a 3,75 contra 3,50 da
foto quando o catálogo sai, e é inteiramente dele.

**O mecanismo, e ele casa com o `perfil`:** no anticentro a faixa DISTANTE é
fraca (nprof 0,44 contra 0,58 em l = 203°, 0,35 contra 0,45 em l = 173°),
então a coluna passa a ser dominada pelo gás LOCAL, que a 200–800 pc subtende
7–27° de latitude com a laje de 95 pc. Miolo fraco, asas claras — os dois
termos dizem a mesma coisa por caminhos diferentes. ~~**A pergunta da rodada
seguinte não é "afinar o gás local" (95 pc é a espessura real do MI local) e
sim por que o disco EXTERNO é pouco luminoso** — candidatos com endereço: o
`edge` que trunca em 15,5 kpc e a escala radial 5200 pc do `thinDisk`.~~
**⚠ ESTA CONCLUSÃO ENVELHECEU E ESTAVA ERRADA EM 2026-08-09** (ver "A faixa e o
catálogo desenhavam a mesma luz duas vezes"): re-medido, o anticentro está
**1,176× BRILHANTE demais**, não fraco, e as duas alavancas nomeadas teriam
piorado o `perfil`. A tabela acima foi montada à mão no scratchpad e ficou
sem juiz enquanto quatro rodadas passavam por cima do modelo. O `perfil` por
setor de HOJE (nosso/foto, 1,000 = cravado) é: **miolo |l|<30 → 1,101 ·
30–60 → 0,831 · 60–150 → 0,944 · anticentro >150 → 1,176**. A leitura certa
é a mesma que o `sky-capture.mjs --perfil` agora imprime sozinho; **não
reconstruir esta seção à mão de novo.**

**Achado lateral que incomoda e fica registrado sem rodada:** `?nocat=1&nowrap=1`
mede skyError **0,7689**, MELHOR que a baseline 0,7811 — o catálogo estelar
piora a nota do céu. Ele paga espessura (0,3097 → 0,2837) e cor
(0,0084 → 0,0017) e só compra perfil (0,2164 → 0,2344). Tirar o catálogo não
é opção (ele é metade do projeto), mas o sinal é de que as estrelas estão
largas ou brilhantes demais em |b| alto — a mesma família da PSF de largura
fixa da unificação 1.

## Auditoria de UX e desperdício (2026-08-06) — o que sobrou como regra

Três auditorias externas (Gemini, Kimi e uma terceira) conferidas contra o
código por um workflow só-leitura de 14 agentes. **Nenhuma mudança de imagem:
SEIS vistas saíram bit-idênticas** — face-on t=293 (`873e64b2…`), edge-on t=261
(`c0743465…`), duas faces do gate do céu com `?kneeamt=1` e duas da vista
interna (t=40 e t=100), cada uma capturada 2–3× dos dois lados contra um
worktree do HEAD. O que ainda decide algo:

- **A conta do desperdício não fecha em gargalo.** Somando os ganhos REAIS de
  todos os itens de performance das três auditorias dá menos de 10% do quadro.
  Os números que o projeto já tinha: laço τ inteiro ≈1,1 ms (da fronteira
  4/16/32 = 17,7/18,8/20,0), cascas +0,3 ms, `projectLabels` 155 µs no Ato I e
  ZERO nos Atos III–V (`labels.ts` retorna cedo em `dHome > 2000`). **Onde as
  auditorias escreveram "ALTO" e "impacto máximo", a medida diz 2–6%** — e a
  linha "Não há gargalo, mediana 17,4 ms" continua valendo. O valor delas era
  de UX, não de milissegundos.
- **O gate do knee tem UMA forma correta e as três erraram.** É
  `this.knee.enabled = this.kneeOn && (this.forcedAmt ?? k) > 0`. Limiar
  `> 1e-3` (o que duas propuseram) NÃO é bit-exato: a rampa atravessa
  (0, 1e-3] em toda travessia do disco. E o amount tem de ser o `forcedAmt`
  quando existe, senão `?kneeamt=` morre — e **`sky-capture.mjs` roda com
  `&kneeamt=1&knee=0.02&exp=4.4`**, ou seja toda a série de `skyError` perderia
  comparabilidade em silêncio. Regra: **gate novo em passe de pós entra junto
  com o material no warm-up** — o knee agora liga só na vista externa, e sem
  isso o primeiro uso do programa cairia no MEIO do filme (o mesmo hitch que o
  BH dava ao cruzar 2,4 kpc).
- **`discard` por TEXEL, não por raio.** As lâminas bakeadas desperdiçavam ~21%
  de área em canto preto. Cortar em `radius > 1.0` (a forma proposta) NÃO é
  bit-exato: o RT usa `LinearFilter` e a borda do disco sangra meio texel para
  fora. `if (dot(b.rgb, b.rgb) <= 0.0) discard;` é exato em toda parte e
  dispensa constante mágica.
- **Laço de GLSL ES 1.00 não aceita condição composta.** O guard do segmento
  fora da banda (`s1 > s0`, que poupa as 16 amostras quando `dTau == 0`) tem de
  envolver o laço num `if`, não entrar na condição dele — a regra é
  "índice op constante", e o driver que aceita hoje é sorte, não contrato.
- **Três bugs de UX que eram o MESMO buraco:** trocar qualidade recarregava e
  voltava ao título, "copiar link" copiava sem o instante, e recarregar perdia
  o lugar. Ninguém escrevia `journeyT` na URL. **Armadilha:** `?t=` sozinho
  CONGELA (`App.tsx`) — é o contrato das capturas, `rodada.mjs` usa
  `?t=…&shot=2` sem `play`. A retomada viva é `t=` **+** `play=1`, e a leitura
  virou `hasTime && !query.has('play')`: o caminho de captura fica intocado
  (provado pelas seis capturas acima).
- **`role="progressbar"` sem `aria-valuenow` era violação de ARIA, e o
  Espaço/setas globais tornavam o painel de Ajustes inoperável por teclado**
  (`range`, `radio` e `checkbox` lá dentro nunca recebiam a tecla). A régua
  acessível certa é o CAPÍTULO, não a fração: o índice da legenda já
  re-renderiza, então sai de graça sem pôr o React no caminho quente.
- **Serialização de carga, não banda.** O prime do Sol (~550 draws offscreen
  síncronos) rodava no construtor ANTES de qualquer fetch, e o `index.html` não
  tinha um único `preload` — os 13,3 MB só nasciam depois do bundle executar, e
  os `.bin` ainda esperavam a viagem do manifesto. Medido depois: os cinco
  arquivos maiores começam em **729 ms em vez de 2392 ms**, um transfer cada
  (Resource Timing). **`crossorigin` é obrigatório no preload** — o código usa
  `fetch()` puro (modo cors) e sem ele o browser baixa TUDO duas vezes.
- **Refutado e não repetir:** `Post.setSize` NÃO tem bug de resize
  (`EffectComposer.setSize` itera os passes); `novoSol` JÁ tem early-out
  (`world > 0.02`); o CA do film com `uCA < 1e-5` é ramo MORTO (o piso é
  1,2e-4); a pirâmide do bloom JÁ é pirâmide e o RT do raymarch JÁ é imune ao
  pixelRatio (dimensionado em px CSS); fundir o knee no composite do bloom é
  impossível como descrito (o blend é aditivo no ROP, nenhum fragmento vê a
  soma); gate `if (v !== old)` em uniform não economiza nada (o upload é no
  draw). **`pixelRatio: 2.0` é TETO, não fator** — em monitor dPR 1 o app
  renderiza 1920×1080 exatos e, com `antialias: false`, sem AA nenhum; toda
  conta de banda feita a "3840×2160" está 4× inflada.
### Fila que sobra desta auditoria (o que já foi FEITO está acima)

Feito e provado bit-idêntico: gate do knee, `discard` das lâminas, guard do
laço τ, gate do `updateSeedClouds`, `GLSL` órfão, preload + fetch antes do
prime do Sol, e o pacote de HUD (Explorar na intro, barra no fim, arrasto,
capítulos nomeados, `?t=`+`play=1`, guarda de teclado, mobile). O que falta:

**UX (o espectador sente, nenhum gate se move):**
1. **Legendas nos vãos.** A travessia perfil→face-on tem **23,4 s sem uma
   palavra** (o shot de `dur: 24` não tem `captions`), e o mergulho são ~90 s
   com a mira cravada em `GAL.GC_POS` com dois silêncios de ~16 s. Bit-exato
   **enquanto nenhum `dur` mudar** — mexer em `dur` desloca t=261/293 e quebra
   a comparabilidade dos gates.
2. ~~**Loading em estágios, com yield.**~~ **FEITO (2026-08-09, rodada do
   visitante).** Rótulo por etapa (`onStage` → véu) + `setTimeout(0)` entre as
   etapas — não rAF, que é estrangulado em aba de fundo e travaria o init.
   O conserto DEFINITIVO segue sendo o Worker, item (2) da fila de 2026-08-05.
   **A tela de carregamento foi refeita em 2026-08-09 — "Cartografia Viva".**
   Antes havia um buraco negro desenhado em CSS e o título piscando. Agora a
   galáxia vai se desenhando enquanto o app carrega: cada etapa acende uma
   camada nova (primeiro o halo de estrelas, depois o miolo, a poeira, os
   braços, as regiões de gás e o núcleo), com um trilho embaixo mostrando
   "etapa 05 / 07". O desenho é feito num canvas comum, de duas dimensões
   (`components/CartografiaCanvas.ts`) — desenho barato, porque o caro é a
   cena 3D que está sendo montada ao mesmo tempo. A lista das sete etapas
   fica num lugar só, `LOAD_STAGES` no `director.ts`; o número 7 não está
   escrito em nenhum outro canto, então acrescentar uma etapa ali muda o
   texto, o trilho e a leitura em voz alta de uma vez.

   O que ainda decide alguma coisa, tudo medido nesta máquina:
   - **A galáxia se revela pelo relógio, não por quadro desenhado.** Enquanto
     monta a cena, o app trava a tela por vários segundos seguidos e quase
     nenhum quadro é desenhado. Na primeira versão a revelação avançava um
     pouco a cada quadro — e o resultado apareceu numa captura: a etapa 7 já
     estava no ar com a tela ainda vazia. Agora ela usa o tempo real que
     passou. O giro da galáxia continua andando por quadro, de propósito: se
     ele também pulasse, o salto apareceria como um corte feio.
   - **Redesenhar a galáxia inteira custa ~19 ms** (são 18 mil pontinhos, e o
     número foi medido no próprio navegador). Por isso ela não é redesenhada a
     cada quadro: só quando o progresso passa de um degrau para o próximo —
     são 100 degraus no carregamento todo, o valor `BAKE_STEPS`. E uma camada
     que já terminou de acender para de ser redesenhada, o que zera o custo na
     parte final. Se um dia o carregamento ficar mais curto que o tempo de
     acender as camadas, baixar esse número é a alavanca.
   - **O fundo preto da tela de carregamento some no mesmo ritmo em que a tela
     de título aparece — 1,6 segundo nos dois.** Quando o preto saía mais
     rápido, o Sol aparecia cru por meio segundo no meio da troca. A tela só
     fica escura o tempo todo se as duas curvas forem iguais.
   - **Com `?shot=2` a tela de carregamento nem chega a ser criada.** Só
     escondê-la não bastava: ela continuaria desenhando e roubando tempo da
     captura que serve para medir a imagem.
   - Para conferir uma etapa parada na tela: `?loader=<nome da etapa>`, e
     `&shot=1` junto se quiser sem nenhum movimento. Está no README.
3. ~~**Qualidade inicial por dispositivo.**~~ **FEITO (2026-08-09).** Sem `?q=`:
   touch com tela curta < 820 px → `performance`, touch grande → `alta`, resto →
   `cinema` (`defaultQualityForDevice`, engine.ts). A assimetria que decide o
   sentido do erro: o tier inicial fixa ALOCAÇÃO (população da galáxia e tier do
   Sol congelam no init) e o auto-quality nunca desfaz o que foi assado — subir
   é barato, descer não desassa. Gates intocados: capturam com `?q=cinema` e
   headless não tem touch.
4. Toast do auto-quality (a imagem muda sozinha e ninguém avisa); painel de
   Ajustes público vs. `?ajustes=1` (três caixas dele RECARREGAM o filme);
   locomoção no free-roam por toque (hoje o fim manda todo mundo para uma sala
   sem porta — o detector de toque curto já mede tempo e deslocamento).
5. **Som: DECIDIDO (2026-08-09) — sim, e procedural.** A decisão que este
   item pedia: o filme GANHA trilha, como camada ambiente gerada por WebAudio
   (drone grave + textura filtrada + brilhos esparsos, parametrizada por ato e
   pela dHome que o director já emite), em rodada própria. O porquê de
   procedural e não faixa gravada: zero payload (os 9,2 MB de catálogo já são o
   orçamento), zero licenciamento, e o mesmo princípio da imagem — a cor emerge
   da física, o som emerge do estado da viagem. Restrições que já ficam
   decididas: só nasce depois de GESTO (política de autoplay; o clique em
   "Iniciar a viagem" é o gesto), botão de mudo no HUD, `?mute=1` para capturas
   e vídeo, e volume que respeita `prefers-reduced-motion` como proxy de
   sensibilidade. Régua AAA do item: som ruim é pior que silêncio — a rodada
   entra com referências (Interstellar, ambient de planetário) e sai se não
   passar de "não envergonha".

**Medir antes de decidir (nesta ordem):**
6. ~~**Precificar a cadeia de pós**~~ **FEITO (2026-08-07): 0,29–0,34 ms, 2%
   do quadro.** Números e método na seção "Medições que sustentam o acima"; o
   instrumento é `scripts/visual/gpu-profile.mjs`. **O que essa medida mudou é
   maior que o item:** ela derrubou o "não há gargalo" (era vsync), reordenou a
   fila inteira de performance e reabriu uma decisão fechada. A ordem real dos
   alvos passou a ser **nebulosa (58% do quadro) → galáxia (31%) → todo o
   resto (11%, do qual o pós é 2)**.
7. **`backdrop-filter: blur(6px)` em `.hud-btn`** — seis botões sobre o canvas
   a viagem inteira, cada um obrigando o compositor a reler e desfocar a região
   TODO frame; e `--warp` é escrito no elemento RAIZ a 60 Hz, invalidando
   estilo na subárvore inteira do HUD. Custo fora do WebGL que ninguém
   contabilizou. Não é bit-exato remover; o teste é de um minuto.
8. ~~**O degrau `alta` é quase no-op em dPR 1**~~ **MEDIDO e o contrário é
   verdade: vale 13,7% do tempo de GPU** (16,00 → 13,81 ms), todo ele de
   `nebulaSteps` 56→44 — `pixelRatio` contribui zero a dPR 1, como o item
   dizia, mas o que sobra não é "~5%", é o degrau inteiro. **Não dar escala de
   render própria ao preset**: resolução não é o eixo (a galáxia é ponto-bound
   e o raymarch é imune a `pixelRatio`). O que sobra do item é o **cooldown de
   15 s**, agora sem desculpa: quem está a 35 fps espera 15 s por um degrau que
   já sabemos que funciona.
9. **`size > 3.0` da extinção estelar nunca dispara** acima de ~867 px de
   buffer (`size_mín` = 3,74·screenH/1080), então o mini-raymarch de 6 amostras
   que o gate existia para evitar roda nas 328.749 estrelas — mas só nos Atos
   I–II (`stars.ts` apaga o campo além de ~2300 pc). Mudar o limiar NÃO é
   bit-exato.
10. `textureLod`/mips no `tauRT` — **teto realista ≤0,7 ms (~4%)**, não
    "impacto máximo"; e mip 2 = 132 pc/texel morde justamente `laneDepth` e o
    centroide vertical. Exige gate edge/face. Continua valendo, mas agora com
    ordem: **é o terceiro alvo, não o primeiro** — os dois primeiros são o
    número de passos do raymarch e a contagem de pontos da galáxia.
11. Compressão do payload: 13,3 MB, e `gzip` puro já daria `stars.bin`
    2,96→2,31 e `dust-density.bin` 5,50→3,13. O `vite.config.ts` não
    pré-comprime. Some com o item (4) da fila de 2026-08-05 (2,77 MB de colunas
    mortas seguras de podar).

## Fila do raymarch da nebulosa (2026-08-07) — tudo abaixo já foi MEDIDO

Três fontes independentes (um swarm de 6 lentes com adversário por proposta, um
relatório externo do Codex e as sondas do coordenador) convergiram no mesmo lugar. As
estimativas das duas primeiras foram **conferidas contra as sondas e várias caíram** —
o que está na tabela é medida, não alegação. Nada disso está implementado ainda.

| # | mudança | ganho MEDIDO | imagem | alegado antes |
|---|---|---:|---|---|
| 1 | ~~guarda da cavidade~~ **FEITA** | **−1,43 ms em t=180** (16%) | bit-exata (provada) | 0,9–1,25 (swarm) |
| 2 | ~~teste das 32 sementes por RAIO~~ **FEITA** | **−1,92 ms em t=100** (21%) | 55 px de 3 M em 1 nível | 4,4 (Codex), 1,0–1,5 (swarm) |
| 3 | ~~`if (d == 0.0) return 0.0;` antes das `lanes`~~ **FEITA** | ver 2026-08-08 | bit-exata (provada) | 0,50–0,70 (swarm) |
| 4 | ~~early-out do vácuo local às sementes~~ **FEITA** | ver 2026-08-08 | bit-exata (provada) | 0,30–0,65 (swarm) |
| 5 | gate dos núcleos `q2<9` → `q2<7` | não medido, ~1,0 alegado | **NÃO** bit-exata | 0,95–1,2 (swarm) |

**(1) é o achado da rodada e vale mais que o milissegundo.** `director.ts:778` passa
`cam.position` como `uCavityPos`, e `nebula.ts` põe a MESMA posição em `uCamPos` — logo
`cav = length(p - uCavityPos)` **é exatamente `t`**, recalculado por amostra. Com o
portão em 1 (`smoothstep(dHome, 600, 1300)`, ou seja Ato III em diante) todo o trecho de
0 a 25 pc do raio tem densidade **provadamente zero**, e a amostragem quadrática põe
~20% dos passos justamente ali. Medido: t=100 e t=140 não movem (portão desligado),
**t=180 vai de 8,797 para 7,369**.
E há a versão que **melhora a imagem pelo mesmo custo**: `tLo = max(tLo, 25.0)` quando o
portão está em 1 redistribui os mesmos 56 passos sobre gás que existe. Não é bit-exata,
mas o trecho que ela abandona contribui zero por prova — é quadratura estritamente
melhor do mesmo integral, pelo mesmo preço. **Antes dela, medir `?nebsteps=80` nas seis
faces**: se o espectador não vê diferença entre 56 e 80 passos, o reinvestimento não
compra imagem e a economia deve virar folga de p99.

**REFUTADO por quatro caminhos independentes — não ressuscitar: LOD de oitavas / ruído
band-limited por `dt`.** Era a aposta favorita do coordenador E do relatório externo, e
morre por dois motivos que só se enxergam neste código: (a) todos os consumidores do
ruído são `smoothstep` operando na CAUDA da distribuição (média 0,4594 contra joelho em
0,50), então reduzir variância não preserva a densidade — corta o gás distante e alisa
as nuvens até virarem bolhas; (b) o repo já mediu, no mesmo padrão de `fbm`, que
contagem de oitava DINÂMICA dispara stall de driver (p99 240–278 ms contra 18,3 com
oitavas fixas — ver o hitch da rodada 10 acima).

**Também descartado: clipmap de majorantes** (4 níveis 96³, ~13,5 MiB, travessia DDA,
cache a invalidar em cada corte). O teto de pular vazio pelo envelope está medido em
**0,45 ms**, porque a amostragem quadrática já concentra as amostras dentro da camada de
gás. Complexidade grande demais para prêmio pequeno demais.

**(1) e (2) foram FEITAS (2026-08-07).** Resultado medido, com as duas juntas:

| instante | raymarch antes | depois | quadro antes | depois |
|---|---:|---:|---:|---:|
| t=40 | 6,88 | **5,20** (−24%) | 13,20 | 11,50 |
| t=100 | 9,12 | **7,20** (−21%) | 15,79 | 13,54 |
| t=180 | 8,80 | **7,51** (−15%) | — | 14,23 |

E o que o espectador sente: **em dPR 2 o filme voltou a 60,0 fps** (720 quadros em 12 s),
contra 56,3 antes — o quadro caiu de 17,04 para 15,04 ms e parou de estourar o vsync.

**Verificação, e ela tem uma ressalva honesta.** Bit-idênticas: face-on, edge-on,
travessia (t=100) e mergulho (t=180). **A vista interna (t=40) NÃO é bit-idêntica: 55
pixels de 3.036.528 (0,002%), todos com delta de exatamente 1 nível em 255, espalhados
por toda a imagem.** Isso é assinatura de **1 ULP do compilador** — envolver o laço num
`if` muda a ordem/fusão da aritmética que o driver gera —, não de conteúdo que sumiu:
uma nuvem culada daria mancha localizada com delta grande. A guarda da cavidade sozinha
é bit-exata (isolada por ablação: t=40 volta ao md5 anterior). **O gate do céu não se
move: `skyError` 0,7811 com os cinco termos idênticos a quatro casas** (espessura
0,3097 · perfil 0,2164 · fenda 0,2102 · púrpura 0,0364 · cor 0,0084).

**Ferramenta nova, e a razão dela:** `scripts/visual/ab-identidade.mjs`. O
`--virtual-time-budget` de `rodada.mjs` acelera TIMERS mas não a REDE, então a
cartografia e o pool de nuvens-semente chegam antes ou depois dele conforme a sorte —
medido, a mesma vista no MESMO commit deu três md5 distintos (com e sem `?q=cinema`,
com 16 s e com 32 s de orçamento). A captura nova espera pelo log da cartografia e mais
700 quadros; com isso as cinco vistas repetem md5. **Qualquer A/B feito com o harness
antigo mediu, em parte, a sorte do carregamento.**

(3) e (4) seguem na fila. (5) fora: é a única com mudança de imagem de verdade e mexe no
corredor de Órion, suspeito ativo do maior termo do `skyError`; e `coresGLSL()` é
injetado DUAS vezes (`common.ts` e a variante local), então mexer nele muda também a
extinção das 328 mil estrelas.

## Onde MAIS há gordura, e onde está limpo (2026-08-07)

A pergunta era "a nebulosa era caso especial, ou o resto tem a mesma gordura?".
Medido primeiro, depois cinco lentes com adversário. **Resposta: não era caso especial,
mas a gordura que sobra é de DUAS classes diferentes e a maior parte do filme está
limpa.** Ordem por (ms × em quantos instantes existe):

| # | o que | ms | onde | classe |
|---|---|---:|---|---|
| 1 | **galáxia sem recorte algum** | **teto 4,8–5,1 MEDIDO** | `galaxy.ts:736-737` | ausência de culling |
| 2 | ~~**nebulosa integrada atrás da fotosfera**~~ **FEITA (2026-08-08)** | 1,2 (só t=0..12) | `nebulaShaders.ts`, topo do `main` | desenhar o que será coberto |
| 3 | **a coroa avalia a MESMA linha duas vezes** | 0,55 (enquanto o Sol aparece) | `coronaRays.js:123` = `coronaVolume.js:387` | valor recalculado |

**O quadro do ato do Sol (t=0) é 15,33 ms, o mais apertado que já medi** — e o Sol
inteiro, com as dez camadas, é só **3,0 ms dele**. Nebulosa 6,04 e galáxia 5,19 fazem
73% de um quadro cujo assunto é o Sol.

**(3) é literalmente o defeito do `seedSpan` outra vez.** `flick = fbmLight(dirO*1.9 +
vec3(3.7, 8.2, uTime*0.55))` aparece idêntica **caractere por caractere** nos dois
arquivos, e `dirO` é constante ao longo de cada linha radial — o comentário de
`coronaVolume.js:398-400` já diz isso e o código não colhe. Uma oitava tripla avaliada
duas vezes por pixel, em dois passes de tela cheia. Cabe numa LUT angular 1×8192 que
serve os dois.

**(1) é de outra classe: não é conta repetida, é trabalho para vértice que o hardware
descarta.** UM draw de 4.019.500 pontos, `frustumCulled = false`, e a integral de
extinção de 16 fetches VTF é paga por ponto que nunca vira fragmento.

**MEDIDO (2026-08-07), e o número é maior do que qualquer estimativa da auditoria.**
Duas sondas, e o produto delas é a resposta:
- **O custo é LINEAR na contagem submetida, com intercepto ZERO.** Varredura por
  `setDrawRange` em `?t=100`: 100% → 4,924 ms · 75% → 3,647 · 50% → 2,394 · 25% → 1,099
  · 10% → 0,337. Ajuste: **1,22 ms por milhão de pontos**, custo fixo dentro do ruído.
  Não há nada estrutural a atacar — só contagem.
- **A fração DENTRO do frustum (`?galstat=1`, esfera de 50 pc de folga para o tamanho
  do ponto):** **t=0 → 2,55% · t=100 → 2,00% · t=180 → 49,3% · face-on t=293 → 99,98%.**

Ou seja: **em t=100, 98% dos 4,02 milhões de pontos são submetidos, passam pela integral
de extinção de 16 fetches, e são descartados pelo clipper. Teto de 4,8 ms** — num quadro
que hoje tem 13,54. Em t=0 o teto é 5,1 de 15,33. **É a maior peça solta do projeto, e
não é troca de qualidade: os pontos estão fora da tela.** No face-on o ganho é zero,
como tem de ser.

**FEITO (2026-08-07) — e o conserto certo não era o bucketizador.** A ideia veio de uma
sessão externa (Codex) rodando em paralelo, e é melhor que a minha: em vez de reduzir a
CONTAGEM submetida (que exige reordenar 4 M pontos e N draws), **sobe a projeção para
ANTES do laço de extinção e retorna cedo quando o sprite inteiro está fora da tela**. Não
tira ponto nenhum da imagem — quem sai já não virava fragmento — e não muda arquitetura:
um draw, mesma ordem, mesmos atributos.

| instante | galáxia antes | depois |
|---|---:|---:|
| t=0 | 5,19 | **2,19** (−58%) |
| t=100 | 4,88 | **2,09** (−57%) |
| t=180 | ~5,0 | **3,26** |
| t=293 face-on | 6,08 | **6,08** |

**Só o número POR PASSE é reprodutível** (uma sessão externa repetiu 2,200 / 2,095 /
6,112 na mesma máquina). O TOTAL do quadro varia ~0,5–0,8 ms entre rodadas e entre
viewports — aqui ele foi de 15,33 para 11,89 ms em t=0 e de 13,54 para 10,82 em t=100,
mas isso vale como comparação DENTRO da sessão, não como constante documental. O piso de
±0,13 ms medido é por passe; no total ele acumula.

O face-on não se mover é a checagem causal: lá 99,98% dos pontos estão na tela.
**Gate do céu cravado: `skyError` 0,7811, cinco termos idênticos a 4 casas.**

**Imagem — e a leitura honesta é mais chata que "1 pixel".** Em t=100, paisagem
1800×1800: o par mais favorável dá 1 pixel de 3.041.720, o menos favorável dá 66. O
motivo está numa medida que só apareceu quando se comparou cada lado CONTRA SI MESMO:
**a baseline repete exata (0 px) e a versão com a guarda tem 65 px de tremor ENTRE
EXECUÇÕES**, sempre 1 nível num canal. Ou seja, a diferença cruzada está dentro do
próprio tremor que a guarda introduziu, e citar "1 pixel" é escolher a repetição que
ajuda. O que se pode afirmar: **nenhum sinal de perda visual, e o gate não se moveu.**
Em retrato 700×1800 (buffer efetivo 684×1705) o cruzado dá 0 px.
**Regra que sai daí: comparar cada lado consigo mesmo ANTES de comparar os lados**, senão
o A/B mede a repetição sorteada.

**A MARGEM EM X É O ÚNICO PONTO DELICADO, e a primeira versão — MINHA, escrita a partir
da descrição em prosa da sessão externa, não do código dela — errava** (está em
`33ec6ee`, o stash: `margem = (clamped + 4.0) * 2.0 / uScreenH` nos dois eixos). O ponto é
rasterizado como QUADRADO em espaço de janela, então o centro pode estar fora e a borda
ainda depositar — corte NDC puro apaga ponto visível. A margem certa em Y é
`(clamped + 4)/uScreenH`; em X ela depende do ASPECTO, e o aspecto já mora na projeção:
**`margemX = margemY * P[0][0] / P[1][1]`** (razão invertida piora justamente o caso que
ela cobre). Usar a margem de Y nos dois eixos parece conservador e **não é**: abaixo de
aspecto 0,4167 (janela de ~500 px num monitor 4K) ela fica curta e apaga ponto de borda.
Confirmado por captura em 700×1800 (aspecto 0,40): com a fórmula corrigida, zero difença.

**⚠ PONTO CEGO ESTRUTURAL DOS GATES, e ele quase deixou isso passar: os TRÊS harnesses
capturam em 1:1** — `rodada.mjs` 1800×1800, `ab-identidade.mjs` 1800×1800,
`sky-capture.mjs` 1440×1440. **Nenhum defeito que dependa do aspecto da tela é
detectável por eles**, nem se a margem estivesse 4× errada. `ab-identidade.mjs` passou a
capturar uma vista **`retrato` 700×1800 POR PADRÃO** (não por variável de ambiente: sonda
que alguém precisa lembrar de rodar não fecha buraco) e a registrar o **buffer EFETIVO**
junto do md5 — 700×1800 vira 684×1705, e é esse número que decide o aspecto que o shader
vê. `JANELA=LxA` continua existindo para varredura ad hoc.

**Não portar para `starForges.ts` sem refazer a conta:** lá o bloco é CÓPIA literal, paga
1 fetch em vez de 16, e o teto é `clamp(px, 0.85, 26.0)` — o limiar de aspecto muda.

**O que sobra do bucketizador:** o teto medido de recorte por contagem era 4,8 ms e esta
guarda entregou 2,8; a diferença é o custo irredutível de submeter o vértice. Um bucket
espacial ainda poderia colher parte dela, a um custo de complexidade muito maior.
Medido antes de descartar: **partir em N faixas contíguas é de graça** (`?galsplit=`,
1/8/32/64 draws deram 4,877/4,884/4,961/4,776 ms, tudo dentro de ±0,13) — mas 64 malhas
transparentes no mesmo `renderOrder` deixam o three reordená-las por distância e a soma
aditiva em float perde associatividade: ~50 px de 1 nível variando ENTRE execuções. Se
alguém voltar a isso, ordem explícita por faixa é pré-requisito, não detalhe.

~~Primeiro experimento antes de escrever bucketizador: `?galsplit=1|8|32|64`~~, partindo
o `THREE.Points` em N faixas contíguas com `setDrawRange`, sem reordenar nada. Ele
responde as duas únicas coisas que podem matar a ideia — se N draws custam o mesmo que 1
num passe ponto-bound, e se o `sortObjects` do three reordena e quebra o md5 das vistas.
Depois disso o que decide o ganho REAL é a granularidade: `?galstat=1` mede a fração
ideal (2%), e um bucket de B células retém mais que isso — a distância entre 2% e o que
o bucket retiver é o que separa 4,8 ms de 2 ms.
**Reabre a decisão "Octree: não"**: os 3,7% de poda de lá são número de vista EXTERNA —
e agora está medido que dentro do disco a poda é **97,5%**. A segunda metade da condição
de reabertura (`WEBGL_multi_draw`) **não está cumprida** — bucket grosso dispensa a
extensão, mas isso tem de ser escrito, não renomeado.

**Onde procuramos e está LIMPO — vale tanto quanto a lista acima:**
- **O raymarch já foi drenado.** O que sobra é trabalho por amostra genuíno (98% por
  amostra, 0,18 ms de custo fixo). Cinco caminhos de "achar mais" morreram.
- **Pós-processamento:** fechado em 0,29–0,34 ms, com ablação.
- **Proeminências:** vasculhadas, rendem ~0,06 ms; a absorção do hemisfério de trás já é
  grátis por early-Z e o readback da PIL roda ~1,7 vez em 321 s.
- **CPU (HUD, `labels`, `emitDest`):** limpo e já medido; e o projeto **não tem
  instrumento que leia CPU** — `gpu-profile.mjs` é timer query por draw.
- **`heroStars`/SunStar:** o quad não cobre a tela (`uZoom` = 0,4165, o canto cai em
  r = 1,44, fora do quad).

**Descartado com número:** varredura de catálogo por quadro (já medido, 155 µs);
corte geométrico dos cartões de proeminência (0,06 ms, abaixo do piso de ±0,13).

## Como retomar os gates numa sessão nova (leia antes de medir)

**O QUE ESTE GATE É: um DETECTOR DE REGRESSÃO.** A partir de 2026-08-10 a casa inverteu
isso e passou a tratar "as vistas saem bit-idênticas" como CONDIÇÃO DE APROVAR trabalho.
O efeito foi mecânico: todo conserto que mexia em pixel era reprovado, e todo defeito
virava uma camada nova por cima do anterior — o Sol desenhado duas vezes, o clarão só do
Atlas, o limiar das luas em 48 px. O dono derrubou a regra por escrito em 2026-08-11:

> "Nunca foi criada essa regra que nada muda na tela. Estamos sempre caminhando no
> sentido das melhorias, se nada muda na tela isso fica impossível"

**REVOGADO em 2026-08-14 pela fala acima: bit-idêntico não é objetivo nem aval, e nunca
justifica desfazer melhoria.** O gate responde a UMA pergunta — *mudou algo que eu não
queria que mudasse?* Quando a mudança é intencional, o veredito não é o md5: é a imagem
aberta, o diff de pixel com SINAL (quantos escureceram, quantos clarearam, delta máximo)
e o rebaseline registrado. Foi assim que a fase 4a e o rebaseline de 2026-08-13 passaram.
E, em 2026-08-13, o dono: "nada é fixo, tudo sempre pode ser questionado se melhora UX".
Registro datado anterior a esta data que trate bit-igualdade como meta lê-se com esta
revogação ao lado — a casa aposenta, não reescreve.

**A armadilha concreta, para não repetir: PROVA VAZIA.** Cinco commits exibiram "18/18
vistas idênticas" como aval de trabalho de HUD — e **as vistas do `ab-identidade` são
todas `shot=2`, que APAGA o HUD**. A leva não podia mudar, mudasse o HUD o que mudasse:
provou nada, cinco vezes. A regra que sobra: **a prova tem de tocar o que a mudança
tocou.** Quem mexe no HUD é julgado pelo `a11y.mjs`, que roda com `shot=1`. Se nenhum
juiz existente cobre a mudança, a obrigação é CRIAR a vista que cobre — nunca exibir a
que não cobre.

**Duas cegueiras desta bancada**, declaradas para que ninguém conclua delas o que elas
não dizem:
- **Cega para MOVIMENTO.** Toda captura passa por `?shot=`, que congela o relógio — é o
  que torna o md5 reprodutível. Nada que só apareça andando (animação, transição, ruído
  temporal, acúmulo entre quadros) tem juiz aqui.
- **Cega entre 1 UA e 40 UA.** A escada que OLHA O SOL tem `solreal1ua` numa ponta e
  `ua40`/`solreal40ua` na outra, e **nenhum degrau entre as duas** — justamente a faixa
  do sistema interno. Cuidado com a formulação: câmera nessa faixa EXISTE — `vesta`
  (2,5 UA), `jupiter` e `europa` (5,0), `titan`/`saturno-anel` (9,7),
  `plutao-caronte` (35,0) —, mas todas a 4 raios do alvo, julgando o disco do corpo,
  nunca como o Sol e o sistema leem dali. É o item 12 de
  [`docs/PENDENCIAS.md`](PENDENCIAS.md).

O que está aberto e incomoda quem usa não se lista aqui: mora em
[`docs/PENDENCIAS.md`](PENDENCIAS.md), primeira leitura do projeto.

**Como rodar, desde a reforma do harness (2026-08-11).** O método não mudou — md5
bit-exato, N=2 capturas por vista, navegador limpo por captura, `?q=cinema` pinado, os
mesmos md5 oficiais do item 3. O que mudou é **o que a captura espera** e **quantos
processos capturam** — e, na fase 0 da Onda 4, o tamanho da lista: **18 vistas**, as 15
do item 3 mais as três do item 4. *(A lista continuou crescendo depois disso: em
2026-08-13, no merge da onda do Sol real, ela tem **46 vistas** — item 5.)*

```
node scripts/visual/ab-identidade.mjs antes     # leva completa (JOBS=3 por padrão)
node scripts/visual/ab-identidade.mjs depois    # compara e dá o veredito
SMOKE=1 node scripts/visual/ab-identidade.mjs antes   # 3 vistas-sentinela
JOBS=1  node scripts/visual/ab-identidade.mjs antes   # serial, um Chrome de cada vez
```

- **O SINAL DE PRONTIDÃO no lugar da espera cega.** Antes a captura esperava o log da
  cartografia e mais **700 quadros desenhados** — ~70 s por captura numa vista de
  1800×1800 (a leva roda a ~10 fps), e 700 era folga escolhida no escuro, nunca medida.
  Agora ela espera `window.__director.captura.pronto`, uma bandeira **somente-leitura**
  que o director levanta quando o `init` terminou (catálogo, poeira, estrutura, galáxia,
  lâminas), nada está andando (viagem correndo ou câmera do voo livre), o Sol tem retrato
  completo publicado (`bakeStep < 0` e coroa volumétrica já na primeira publicação) e a
  cena desenhou **10 quadros sem perturbação** — perturbação sendo troca de fase, `?q=`,
  `?pos=`, `?t=`, resize, exposição ou camada ligada/desligada. ~6 s por captura.
  A sonda que autorizou a troca: `sol`, `travessia` e `soldisco` capturadas nos marcos
  1, 2, 3, 5, 10, 30, 80, 320 e 700 quadros devolvem **o mesmo md5 oficial em todos os
  marcos** — a imagem já estava assentada no primeiro quadro depois do deep-link.
- **O critério antigo continua vivo como TETO DE SEGURANÇA.** `window.__director` só é
  publicado no bundle de DEV; apontar `APP_URL` para um build de produção (ou para uma
  versão do app anterior a esta reforma) cai nos 700 quadros em vez de travar. Medido:
  `APP_URL=http://127.0.0.1:4173` (o `vite preview` do `dist`) devolve `sol
  a4fbf427778a` — o md5 oficial DAQUELA ÉPOCA, aposentado pelo rebaseline de
  2026-08-13, que pôs a vista `sol` em `d3f110e281d3` — por `via=quadros/87s`. Cada linha da leva imprime o
  `via=`, e **uma leva inteira em `via=quadros` é sinal quebrado, não hardware lento**.
- **E o teto de segurança agora GRITA, não engata em silêncio** (2026-08-11). No alvo
  padrão (`APP_URL` ausente ou apontando para o próprio dev server), **qualquer** captura
  por `via=quadros` — a leva toda ou uma só, porque sinal intermitente é pior que sinal
  morto — faz `ab-identidade` e `sky-capture` imprimirem o bloco "SINAL DE PRONTIDÃO
  QUEBRADO" e **saírem com status ≠ 0**, no mesmo protocolo do apaga-antes/exige-status-0
  (`julgarProntidao` em `chrome.mjs`, puro e testado em `chrome.test.mjs`). Sem isso o
  fallback devolve a MESMA imagem e a quebra do sinal apareceria só como os ~45 min de
  antes, com o gate passando "funcionando" — o modo caro de falhar. `APP_URL` apontado de
  propósito para outro alvo (o `vite preview` do `dist`, onde `window.__director`
  legitimamente não existe) recebe **só aviso**; **`FALLBACK_OK=1` aceita o modo lento**
  conscientemente e devolve o status 0.
- **`JOBS=N` reparte a LISTA entre N processos-filhos** (padrão 3), cada um com o seu
  Chrome e o seu perfil; o dev server é um só. Nunca N abas ou contextos num Chrome só:
  a bit-exatidão sob GPU compartilhada dentro de um processo não está documentada em
  lugar nenhum, e o gate inteiro depende dela. Cada filho grava o seu arquivo e o pai
  funde no JSON de sempre. A porta de depuração de cada Chrome é **escolhida pelo SO**
  (`--remote-debugging-port=0`, lida do `DevToolsActivePort` do perfil) — era a única
  corrida de verdade da divisão.
- **`SMOKE=1` captura quatro vistas-sentinela** (`sol`, `soldisco`, `hero8` e, desde a
  Onda 4, `ua150`: o disco solar, o campo com a cessão de dominância, o hero de perto e o
  domínio profundo a 150 UA). **Sentinela é para ITERAR** — o gate de fechamento continua
  sendo a leva completa (18 vistas desde a Onda 4), porque quatro vistas não cobrem o
  aspecto (`retrato`), nem a travessia, nem o mergulho, nem os regimes do `farFade`.
- **Os tempos medidos nesta máquina (2026-08-11), com as 15 vistas × 2 capturas
  reproduzindo os 15 md5 oficiais bit a bit:** leva completa **1,9 min** com `JOBS=3`
  (duas rodadas seguidas, 15/15 `IGUAL` nas duas), **3,8 min** com `JOBS=1` — que isola a
  prova do sinal da prova do paralelismo —, **0,5 min** no `SMOKE=1`. A referência
  histórica é **~45 min**. O gate do céu herdou o mesmo sinal (mesmo driver): as 6 faces
  saem bit-idênticas, `skyError` **0,7782** com os cinco termos iguais, e a leva inteira
  (capturar + medir) passou a levar **42 s**.
- **O protocolo do céu ganhou `&noplan=1` na Onda 4** (`sky-capture.mjs`, precedente
  exato do `nohero=1` que já estava lá). O porquê, numa linha: a câmera do céu fica na
  ORIGEM, dentro do domínio profundo, e o oráculo é a recriação Gaia, que não tem
  planetas — medir com a camada ligada cobraria da régua um corpo que a foto-alvo não
  tem. Ele entra ao lado de `nosun=1&nohero=1` na URL de protocolo (item 2 da fila lá
  em cima, mais o stretch `kneeamt=1&knee=0.02&exp=4.4`). Com ele: `skyError`
  **0,7782**, os cinco termos e os quatro brutos idênticos, e as **6 faces
  BIT-IDÊNTICAS** a uma referência tirada de propósito no estado pré-chave
  (`gc 845781a1…` · `anti afe5d64e…` · `l90 bfaf2cfe…` · `l270 b20034a6…` ·
  `npole 8ededf1f…` · `spole 929e645d…`) — o que prova de quebra que o `near` piecewise
  do domínio profundo não mexeu no fundo.
- **O `rodada.mjs` também roda por CDP e com o tier fixo, desde a rodada 42**, pelo
  mesmo driver dos outros três: `node scripts/visual/rodada.mjs <n> "nota"` grava as
  duas vistas externas em `capturas/` e a linha em `docs/reference/EVOLUCAO.md`. Era o
  único harness ainda morto nesta máquina, e a descontinuidade que o conserto criou no
  ledger está declarada lá — **a comparação válida é 42 ↔ 43 em diante**. Os três
  defeitos que o matavam, e o que cada um contaminava, estão na seção "Os gates não
  rodavam nesta máquina", logo abaixo.

- **Os QUATRO juízes de navegador que a Onda 5 acrescentou**, ao lado do
  `ab-identidade` e pelo mesmo driver CDP (`chrome.mjs`). O contrato de entrada é o
  mesmo nos quatro: **o dev server já tem de estar no ar** (`npm run dev` — nenhum
  deles sobe servidor; cada um sobe o SEU Chrome, com perfil próprio, e o mata no
  fim), leem só `APP_URL` e `JANELA` (padrão `1200x900`), **não escrevem um byte em
  disco** — nem no ledger `docs/reference/EVOLUCAO.md`, nem em `capturas/`: os md5
  deles vivem em memória — e saem com status ≠ 0 na primeira falha. Os tempos são
  desta máquina, 2026-08-12:

  ```
  node scripts/visual/a11y.mjs         # 139 asserções · 2,2 min
  node scripts/visual/atlas-smoke.mjs  #  68 asserções · 4,6 min
  node scripts/visual/voo-smoke.mjs    #  25 asserções · 0,7 min
  node scripts/visual/busca-smoke.mjs  #  24 asserções · 1,3 min
  ```

  - **`a11y.mjs`** prova o contrato de `src/lib/dialogFocus.ts` em CADA
    `[data-abre-dialogo]` que existir nas três fases (`journey`/`atlas`/`free`):
    foco entra, foco preso, `Esc` fecha, foco volta ao gatilho, `aria-expanded`
    volta — mais nenhum diálogo órfão, nenhuma `aria-live` inválida, a linha de
    contexto viva de verdade, o selo dizendo o que a vista é e voltando ao real
    pela linha-controle, e o `?ui=` crescendo os `font-size` do HUD (inclusive os
    nove `clamp(rem, vw, rem)`, dois deles só alcançáveis a 600 px com zoom de
    200%) sem quebrar o HUD e sem sujar o storage. Roda com `shot=1`: o `shot=2`
    apagaria justamente o HUD que ele julga — é por isso que o juiz não é o
    `rodada.mjs`.
  - **`atlas-smoke.mjs`** prova o portal em PIXEL (ida e volta em t=10/100/250:
    `journeyT` exato por `Object.is` e md5 igual antes/depois), a captura dentro do
    Atlas por `via=sinal`, o Sol reproduzível nos três instantes, a precedência das
    portas, o véu e o `reduced-motion`, o rótulo que desenha e o clique que
    enquadra, `?jd=EPOCA` neutro bit a bit, o caminho SEM REDE (bloqueando
    `*efemerides*`: md5 exato do retrato, badge honesto, ZERO grito de console) e o
    relógio do céu que para junto com o "Partir". **Desde a Fase A dos
    "Ajustes 100% vivos" (2026-08-12) ele também é o juiz do PAINEL**: as 12
    camadas trocando sem navegação (marca na `window`, `captura.quadros`
    10→0, URL e selo), a troca viva bit-idêntica ao boot com a mesma flag, o
    slider de exposição devolvendo a auto-exposição com a URL reproduzindo a
    tela, e o clique em Cinema gravando `?q=cinema`.
  - **`voo-smoke.mjs`** prova o convite dos três gestos (só na primeira entrada,
    `conviteVisto` gravado, não volta na recarga), o furo do Spotlight ancorado no
    retângulo MEDIDO do alvo, o opt-in da captura de ponteiro, o backoff depois de
    três `pointerlockerror` e a volta ao reentrar no modo, o unlock soltando TODAS
    as teclas e ninguém disputando o `Esc`.
  - **`busca-smoke.mjs`** prova o `?foco=` (abre com o alvo em quadro, é idempotente
    e não chuta quando não acha), a ida e volta pelo escritor VIVO de URL, o estado
    vazio honesto, o verbo da paleta por fase, a latência POR TECLA medida de dois
    jeitos, que a paleta não vaza no `?shot=2` e que os dez corpos do sistema são
    alvo.
  - **ESTES QUATRO SÃO O ORÁCULO DA PRECEDÊNCIA DE DEEP-LINK** — dito aqui porque
    uma auditoria externa (2026-08-12) levantou "a regra de onde um link aterrissa
    só é conferida por inspeção", que era verdade ANTES da Onda 5 e não é mais. Em
    Chrome real: `?pos=…&atlas=1` cai em `free` (o `?pos=` ganhando do Atlas),
    `?atlas=1` cai em `atlas`, `?foco=` sozinha abre o Atlas com o alvo em quadro,
    e o `?t=` roda em três instantes com `journeyT` exato por `Object.is` e md5
    igual antes/depois. **O que segue SEM asserção nomeada** é só a combinação
    `?atlas=1&t=` — o Atlas ganhando do instante, com o instante virando o momento
    de volta do "Partir". Extrair o parsing do boot para função pura (como
    `lerPortaJd`) continua sendo higiene desejável; deixou de ser buraco de gate.

- **Duas notas de protocolo que a Onda 5 comprou, e valem para toda leva futura.**
  (1) **A/B perto do Sol SÓ com `EXTRA='&nobloom=1'`**: com bloom, `ua150` e `ua40`
  devolvem md5 IGUAIS com céus DIFERENTES — o clarão satura o quadro e o md5 fica
  cego. É a mesma régua com que a Onda 4 mede pixel de planeta, agora valendo para o
  gate de identidade. (2) **Leva com `EXTRA` ou `JANELA` NÃO pisa na baseline
  oficial**: o arquivo de estado passou a levar sufixo derivado das duas
  (`ab-identidade-{lado}{sufixo}.json`, sufixo vazio na leva oficial), e os filhos do
  `JOBS` herdam o sufixo. Antes disso, quem rodasse um A/B de knob apagava a baseline
  dos 18 md5 e só descobria na leva de fechamento, a ~25 min de GPU de distância.

O `ab-identidade` guarda os md5 em `TMPDIR/ab-identidade-{antes,depois}.json`, fora do
repo e fora do git. Duas consequências que já quase custaram um diagnóstico errado:

1. **O "antes" da rodada seguinte é o "depois" da anterior.** Ao terminar uma rodada,
   `cp` o `depois` por cima do `antes` e apague o `depois`. Quem esquecer compara a
   rodada nova contra uma baseline de duas rodadas atrás e vê `DIFERE` em tudo.
2. **TMPDIR não sobrevive a reboot.** Sem o arquivo, `antes` tem de ser recapturado —
   ~25 min de GPU. A baseline **depois da Onda 1 (2026-08-10)** nesta máquina,
   para conferência rápida sem recapturar:
   `sol a4fbf427778a` · `interno d98cbef70849` · `travessia 145263085c23` ·
   `mergulho 6876e851031a` · `edgeon 4fbd07002a9a` · `faceon d05591e27ea4` ·
   `retrato 615452579a2a` (todas @1800x1713, retrato @700x1713). As três vistas
   que mudaram contra a era anterior (sol/travessia/retrato) diferem por ULP
   (±1 nível — diff de pixel na ata da Onda 1), não por conteúdo. A baseline
   anterior (rodada do desconto do catálogo, 2026-08-09) era `sol 950f930d0138`
   · `interno d98cbef70849` · `travessia 3a67b1764558` · `mergulho 6876e851031a`
   · `edgeon 4fbd07002a9a` · `faceon d05591e27ea4` · `retrato 18ba748879dc`.
   **Esses md5 são desta GPU** — noutra máquina servem só como sinal de que a captura
   assentou, nunca como valor esperado.
3. **As QUINZE que a Onda 3 fechou — e que a Onda 4 NÃO moveu.** A baseline VIGENTE tem
   DEZOITO vistas: estas quinze (md5 logo abaixo) mais as três do item 4.
   O item 2 é HISTÓRIA da era da Onda 1 (e já divergiu em
   `travessia` e `retrato`, pelo conserto do `vSat` abaixo); a Onda 3 acrescentou OITO,
   porque o gate não tinha vista nenhuma do motor estelar — 4 do Sol por DISTÂNCIA
   (`?pos=`, não `?t=`: o instante amarra a distância ao trajeto da hélice) e 4 de
   Betelgeuse. Condições da captura: dev server em `127.0.0.1:5173`, `?q=cinema`
   FIXADO, janela padrão (1800×1800 pedidos = 1800×1713 efetivos; `retrato` 700×1800 =
   700×1713), duas capturas por vista repetindo md5.
   `sol d3f110e281d3` · `interno d98cbef70849` · `travessia b85162ede6cf`† ·
   `mergulho 6876e851031a` · `edgeon 4fbd07002a9a` · `faceon d05591e27ea4` ·
   `retrato 23bb22402f40`† · **`soldisco 06d7c8d406cd`** · **`solrampa 1ad5c3e89220`** ·
   **`solestouro 7306f0d4f044`** · **`solestrela 22f5fab0992e`** ·
   `hero200 b4a2d03ed3e9`† · `hero600 4311d0ccbc15` · `hero950 d11a8df86b68` ·
   **`hero8 d7c1d2d12726`**†.
   **REBASELINE DE 2026-08-13 — as QUATRO da abertura entraram nesta lista com md5
   NOVO.** O dono APROVOU o rebaseline da F3 da onda do Sol real depois de ver os oito
   PNGs de `capturas/f3/` (antes e depois de cada uma). Os valores acima foram
   **RE-MEDIDOS na aprovação**, com o gate inteiro rodando a partir da mesa `sol-real`
   — 26 vistas, cada uma capturada 2×, todas estáveis, e as 22 que não podiam mudar
   não mudaram. Os md5 que MORRERAM nesse dia, e que deixam de ser valor esperado em
   qualquer lugar: `sol a4fbf427778a` · `soldisco 7a2e6d1f4620` ·
   `solrampa ff2b7b4d353a` · `solestouro 3dc8706149b4`. **`solestrela 22f5fab0992e`
   NÃO mudou**, nem as outras 21: a abertura mudou de LUGAR — passou a ser filmada a
   3,998 milhões de km do Sol de raio FÍSICO —, não de enquadramento. O detalhe
   medido está em `docs/ESCALA-HONESTA.md`, seção F3.
   **As QUATRO com † mudaram no conserto do `vSat`** (2026-08-11, depois do fecho da
   onda): os espinhos de difração e o núcleo esbranquiçado passam a obedecer à
   atenuação TOTAL — extinção e `uFade` —, e não só à cessão por estrela. Delta
   máximo de **1 nível** em todas as quatro, ≤0,03% dos pixels
   (`travessia` 624 px · `retrato` 374 · `hero200` 151 · `hero8` 672). Os md5 dessas
   quatro na era anterior (a que a fase 4a fechou) eram `travessia 145263085c23` ·
   `retrato 615452579a2a` · `hero200 20fdcb99a240` · `hero8 94b1136950ce`.
   **1 nível NÃO é ULP aqui, e a mensagem enlatada do `diff-pixel` engana neste
   caso**: medido o SINAL, 1.818 px escureceram contra 3 que clarearam — atenuação
   real, unidirecional. As outras onze saem bit-idênticas porque a mudança só toca
   estrela SATURADA atrás de gás: nas quatro do Sol as saturadas são as vizinhas
   dentro da Bolha Local (`nebulaDensity` devolve 0 exato, `vis` = 1), em
   `hero600`/`hero950` Betelgeuse já tem `peak` < 1 (logo `sat` = 0), e `uFade` vale 1
   nas quinze — nenhuma vista do gate cai na faixa 1100–2300 pc da rampa.
   **As CINCO em negrito mudaram de propósito**, na fase 4a da onda, quando
   `DOMINANCE_DEFAULT_ON` (`lodStellar.ts`) virou `true` e o ponto do catálogo passou a
   ceder sob o hero que o DOMINA na tela — o fim da dupla-luz hero↔catálogo, em que as
   16 mais brilhantes desenhavam luz duas vezes no mesmo lugar. Não é regressão: é a
   melhoria auditada da decisão D11 do desenho da onda, com o diff de pixel medido
   ANTES de ligar e o veredito visual dado com as imagens abertas. Os números:
   `soldisco` 158.917 px (5,154%) com delta máximo de **2 níveis** — real, e invisível
   lado a lado (é α Centauri, a 1,4 pc, com o PONTO dentro do quadro; o disco solar sai
   idêntico); `hero8` 1.500.453 px (48,662%) com delta máximo de **19**, dos quais
   1.051.273 em ≤3 — o clarão de Betelgeuse deixa de somar com o próprio ponto e o
   núcleo branco de dupla-luz vira supergigante quente, com o bloom espalhando o resto.
   As outras DEZ saem bit-idênticas à era anterior, inclusive `sol` e `interno`: lá as
   heroes que cedem estão FORA do frustum e quem pinta é só o clarão delas, que a
   política não toca — o pixel só muda quando o PONTO está no quadro.
   **O caminho de volta é `?nodom=1`, e é EXATO**: `hero8` capturada com ele devolve
   `5ea6d9a15e79`, o md5 da baseline antiga, bit a bit. A baseline anterior das oito
   novas (fases 2 e 3, com a chave desligada) era `soldisco 1a1b46040ff4` ·
   `solrampa b1430b098de1` · `solestouro 6f009aa701b4` · `solestrela 2229da9080c8` ·
   `hero8 5ea6d9a15e79` (as três de hero restantes não mudaram).
   **O gate do céu NÃO se mexeu, e por construção:** o protocolo roda com `nohero=1`,
   que desliga o grupo dos heroes e faz a política escrever o valor neutro. Medido, não
   suposto — as SEIS faces saem BIT-IDÊNTICAS e o `skyError` fica em **0,7782** com os
   cinco termos iguais até a quarta casa (espessura 0,3026 · fenda 0,2240 ·
   perfil 0,2047 · purpura 0,0336 · cor 0,0132).
   **O conserto do `vSat` também não moveu a régua do céu**, e aí a prova é mais fina
   que "bit-idêntico": UMA face mudou — `face_anti` (o anticentro, Órion/Touro, que é
   onde há estrela saturada atrás de gás), 4.959 px (0,2545%) com delta máximo de 1 e
   4.956 deles escurecendo. As outras cinco saem bit-idênticas, e o `skyError` fica nos
   MESMOS **0,7782**, com os cinco termos e os quatro brutos
   (bulgeAnti 5,497 · rift 0,0694 · colour 0,0509 · purp 0,0448) iguais até a quarta
   casa. Ou seja: a mudança é real e fica ABAIXO da resolução da régua fotométrica.
4. **As TRÊS que a Onda 4 fez NASCER (2026-08-11), e a lista foi a 18.** Elas caem
   ABAIXO do piso do filme (a vista mais próxima até aqui era `sol`, a 0,063151 pc =
   ~13.000 UA), no domínio profundo onde a onda dissolve a fotosfera artística e acende
   os planetas por fotometria: `ua500` (`?pos=0,0,0.0024241` = 500,01 UA — o Sol já é
   ESTRELA e Júpiter é o único acompanhante que a régua de pixel MEDE) · `ua150`
   (`0.00072722` = 150,00 UA, o desfile a olho nu com o sistema inteiro em quadro —
   Sol, Júpiter e Saturno medidos, também SENTINELA) · `ua40` (`0.00019393` = 40,00 UA,
   cruzando a órbita de Netuno, com os SETE de dentro medidos, do Sol a
   Saturno). Entraram na lista **antes de qualquer código da onda**, de propósito: é o
   que desarma a armadilha do veredito (vista sem "antes" era pulada em silêncio — hoje
   `julgarVistas` emite NOVA/AUSENTE); nessa leva as 15 antigas saíram **bit-idênticas
   ao item 3**, 18/18 por `via=sinal`, 2,3 min com `JOBS=3`.
   **Os md5 OFICIAIS delas** (chave `PLANETAS_DEFAULT_ON` ligada, todas @1800x1713):
   **`ua500 5f8136c12732`** · **`ua150 9b3e75b2af91`** · **`ua40 48adc0f55631`**.
   **`ua500` e `ua150` são do fecho da Onda 4 e não se moveram desde então. `ua40`
   MUDOU na Onda 6** — o ponto fotométrico MH18 repinta a família de faróis —, e o
   valor `a607e3cf57ab`, oficial do fecho da Onda 4 até 2026-08-12, está
   **APOSENTADO** desde a medição do merge de 2026-08-13 (item 5, abaixo): deixa de
   ser valor esperado em qualquer lugar.
   Render DEFAULT, **com bloom** — as três documentam o estado
   verdadeiro do produto, e é de propósito que a régua de pixel (`planeta-pixel.mjs`)
   mede num par PRÓPRIO com `&nobloom=1`: com o bloom ligado 31,85% do quadro satura e
   um quadro saturado não tem centroide. Na leva do FECHO, **as 15 do item 3 saíram
   bit-idênticas e só estas três mudaram** (18/18 por `via=sinal`, 1,9 min com
   `JOBS=3`) — o filme não muda um pixel, que é a promessa da onda cumprida.
   **O A/B da porta tem valor esperado, e o caminho de volta é EXATO:**
   `DOZERO=1 EXTRA='&noplan=1'` com o MESMO binário devolve as 18 de antes da camada bit
   a bit — as 15 do item 3 e as três em **`ua500 b950ae47019e` · `ua150 e6990475232e` ·
   `ua40 5dbf3afd6274`**, que é o estado **pós-F2/pré-chave**: o domínio profundo já
   dentro, a camada de planetas ainda fora.
   **Duas leituras que só a onda revelou, e que mudam como se lê este item.** (a) As
   portas `?plan/?noplan` governam a **camada de planetas, não o palco**: o domínio
   profundo (janelas `deep`, `near` piecewise, voo proporcional) é fundação sem porta,
   como o próprio `near`, e a prova dele é a bit-igualdade das 15. (b) Por isso o
   "antes" HISTÓRICO da fase 0 — **`ua500 5fa91638704b` · `ua150 64efef464d97` ·
   `ua40 ed732b0cffa6`** — **não é alcançável por porta nenhuma**: as três já tinham
   mudado na F2. A premissa com que elas nasceram ("no antes mostram só o fundo, o
   `near` velho clipa tudo a menos de ~206 UA") estava incompleta — o `near` clipa o que
   está a menos de 206 UA **da câmera**, e o disco artístico tem 2.269 UA de raio, então
   a metade de trás dele e as raias ficavam ALÉM do near e desenhavam. Com
   `solWorldFade = 0` elas somem: na `ua150`, 13.938 px de 3.083.400 (0,45%), **100%
   perda de luz de artefato** (13.789 px perderam, 1 ganhou) — medido, não suposto.
5. **A MEDIÇÃO DOS DOIS LADOS (2026-08-13), quando a onda do Sol real entrou.** A
   branch `sol-real` nasceu de `af90809` e a Onda 6 fechou DEPOIS dela; medir só um
   lado teria dado um veredito sem chão. Rodou-se a **MESMA lista de 46 vistas** nos
   dois — a `main` num servidor próprio e a árvore mergeada no nosso —, cada vista
   capturada **2×** e estável nas duas capturas. **A lista do `ab-identidade` já não
   são 18:** os itens 3 e 4 continuam sendo a parte do FILME, e as demais vieram da
   Onda 5, da Onda 6 e desta onda.
   **Placar: 40 das 46 saem BIT-IDÊNTICAS à `main`. As SEIS que mudam são todas do
   Sol** — as quatro da abertura, que o dono aprovou (`sol d3f110e281d3` ·
   `soldisco 06d7c8d406cd` · `solrampa 1ad5c3e89220` · `solestouro 7306f0d4f044`),
   mais `solreal4mkm 8a43f749a632` e `solreal1ua 205421df6f9c`, que são as duas
   distâncias em que o Sol de raio FÍSICO ainda desenha diferente do inflado. **A
   terceira do Sol real, `solreal40ua`, NÃO muda: ela devolve `48adc0f55631` nos dois
   lados, e é o mesmo valor de `ua40`, também nos dois.** A afirmação da F1 — a 40 UA
   o Sol real e o inflado são o mesmo ponto — passou a estar medida contra a casa
   inteira, e não só contra a mesa da onda.
   **E a medição destapou o que nenhum documento sabia: a Onda 6 MOVEU vistas que a
   branch listava com valores de `af90809`.** Vigentes desde o merge, com o valor
   aposentado ao lado: `terra ab40ab3b0d3b` (~~`ff48acbaf3a7`~~) · `terranb
   1ec9120c745f` (~~`1c0509b1d6cc`~~) · `lua 39ce4845c9f4` (~~`e54f7aa79a2a`~~) ·
   `terralua fb35311ee340` (~~`7b5378507749`~~), pelas **texturas reais**; e
   `ua40 48adc0f55631` (~~`a607e3cf57ab`~~) · `solreal40ua 48adc0f55631`
   (~~`a607e3cf57ab`~~) · `solreal1ua 205421df6f9c` (~~`f665b6bfe84c`~~), pelo **ponto
   fotométrico MH18**. `solreal4mkm 8a43f749a632` não se moveu.
   **Não se moveram, e continuam sendo valor esperado:** `interno d98cbef70849` ·
   `travessia b85162ede6cf` · `mergulho 6876e851031a` · `edgeon 4fbd07002a9a` ·
   `faceon d05591e27ea4` · `retrato 23bb22402f40` · `solestrela 22f5fab0992e` ·
   `hero200 b4a2d03ed3e9` · `hero600 4311d0ccbc15` · `hero950 d11a8df86b68` ·
   `hero8 d7c1d2d12726` · `ua500 5f8136c12732` · `ua150 9b3e75b2af91` ·
   `atlas e9544b84cca2`.
   **Os outros juízes, todos verdes na mesma data:** `atlas-smoke`, `busca-smoke`,
   `a11y` e `voo-smoke`; **1.543 testes**, `tsc --noEmit -p tsconfig.app.json` e
   `eslint` limpos.

Os PNGs do gate do céu ficam em `sky/` e as capturas nomeadas em `capturas/` (ambos
gitignored, ambos sobrevivem à sessão): `sky-capture.mjs base --so-medir` re-mede sem
recapturar nada, e é assim que se confere a régua sem gastar GPU.

**A melhoria que fecharia isto de vez e ainda não foi feita:** baseline indexada pela
string do renderer da GPU, gravada fora do TMPDIR, mais um `doctor` que confira o
ambiente antes de qualquer gate rodar. Enquanto não existir, o ritual acima é manual.

## Os gates não rodavam nesta máquina (2026-08-08) — e o que sobrou como regra

Um clone macOS não conseguia rodar **um** gate do projeto: os quatro harnesses
procuravam `chrome.exe` e `/usr/bin/google-chrome` e passavam `--use-angle=d3d11`.
Consertar isso destapou quatro defeitos de ferramental, e a lista vale mais que os dois
itens de fila que entraram junto — porque **três deles contaminavam medida em vez de
quebrar**, que é o modo caro de falhar.

- **`chrome.kill()` não mata o Chrome.** O processo que o Node gera é só o browser; os
  helpers de GPU e renderer são filhos e sobrevivem ao pai. Medido: depois de quatro
  invocações do `gpu-profile` havia **14 Chrome órfãos vivos**, e eles não são inertes —
  disputam a MESMA GPU que o harness está medindo. A baseline foi de **20,0 para 8,0 fps**
  entre a primeira e a quarta execução, e a mesma vista devolveu **196 e 588 ms** de
  total. `rodada.mjs` já tinha a limpeza certa, só que dentro de `if (win32)`; os outros
  três morriam em silêncio. Agora é `matarPerfil()` em `scripts/visual/chrome.mjs`, que
  casa pelo `user-data-dir` (nunca pelo nome — o Chrome do usuário não pode ser tocado).
  **Regra: quem sobe Chrome mata pelo perfil, sempre.**
- **Gate de imagem tem de FIXAR o tier.** Sem `?q=`, o `autoQuality` do `engine.ts`
  rebaixa cinema→alta→performance sozinho quando a média cai de 42 fps, e isso troca
  `nebulaSteps` **56→30** e o `pixelRatio` NO MEIO da espera de 700 quadros. Numa máquina
  que segura 60 fps o degrau nunca dispara e `q=cinema` é **bit-exato** (mesmo tier, mesmo
  preset — só desliga o automático); numa que não segura, sem ele o gate compara duas
  imagens tiradas em qualidades diferentes e chama a diferença de regressão. `ab-identidade`
  e `sky-capture` agora fixam. **A linha antiga "os gates rodam sem `?q=` em desktop
  headless" só valia para hardware rápido.** O `rodada.mjs` era o único que faltava e
  passou a fixar na Onda 4, fase 0 — e o degrau APARECEU nesta máquina: entre a rodada 40
  e a 42, sem uma linha de render tocada, `clumpError` foi de 0,0603 a **0,1160** e
  `grain` de 0,0663 a **0,0844** (as duas colunas que leem textura, que é o que 30 passos
  de raymarch contra 56 mudam), enquanto `harmonicError` e `discMean` ficaram parados.
  Descontinuidade declarada no `EVOLUCAO.md`: a comparação válida é **42 ↔ 43**.
- **`--virtual-time-budget` + `--screenshot` NÃO TERMINA neste Chrome/macOS.** Não é
  lentidão: uma janela de **400×400 com 8 s de orçamento** ficou 6 min sem sair e sem
  gravar PNG. O laço de rAF do app nunca deixa o tempo virtual alcançar o teto, e o
  `--screenshot` só dispara quando ele alcança. As seis faces do gate do céu passaram para
  o caminho CDP (`capturarCDP` em `chrome.mjs`), que espera o log da cartografia e mais
  700 quadros DESENHADOS — o mesmo critério que já fazia o `ab-identidade` repetir md5.
  (O `rodada.mjs` ficou de fora e por isso **estava morto**: ele seguia no tempo virtual e
  nem chegava lá, porque procurava `chrome.exe`. Migrado na Onda 4, fase 0 — as duas
  vistas da rodada 42 assentaram por `via=sinal` em 4,1 s e 3,9 s.)
  (Desde 2026-08-11 os 700 quadros são o **teto de segurança**: quem manda é o sinal de
  prontidão do app, e as duas rotas foram medidas bit-idênticas — ver o topo da seção
  "Como retomar os gates".)
  A medição (`--dump-dom`) continua com tempo virtual, porque a página é estática, mas o
  critério de pronto virou **o arquivo**, não o processo: o Chrome também não sai de lá, e
  esperá-lo custava os 600 s do teto por execução.
- **Captura travada matava a bateria inteira.** A espera do WebSocket do CDP não tinha
  timeout: quando o alvo morre entre o `/json/list` e o handshake, nem `open` nem `error`
  disparam, o Node fica sem handles e o processo SAI com um aviso de "unsettled top-level
  await". Três vistas medidas, nenhuma gravada, nenhum veredito. Agora há timeout, uma
  segunda tentativa por captura, e o estado é gravado **por vista** — re-rodar o mesmo lado
  retoma o que falta em vez de refazer 20 min de GPU.

**Como ler milissegundo em Apple/Metal — e isto muda a leitura de qualquer medida futura
feita aqui.** O `EXT_disjoint_timer_query_webgl2` existe e o headless está mesmo na GPU
(`ANGLE Metal Renderer: Apple M1`), mas **a atribuição por draw infla e não é aditiva**: a
soma dos passes deu 178 ms num quadro cujo relógio marcava 50 ms, e um passe de tela cheia
do pós aparecia empatado com o raymarch. O que o instrumento faz bem é **rastrear trabalho
real de um passe**: calibrado contra a alavanca conhecida, `nebsteps` 56/28/14 devolveu
41,2/22,1/12,0 ms — reta de 0,70 ms por passo com 2,2 de intercepto. Já o **contador de
quadros aqui é honesto**, e pelo motivo oposto ao da máquina de referência: o app roda a
9–14 fps, muito longe do vsync, então o relógio de apresentação mede trabalho em vez de
devolver 16,7 ms. **Nesta máquina a régua é quadros; lá era timer query.** Quem misturar as
duas vai concluir bobagem — foi o que quase aconteceu aqui: os itens (3) e (4) fizeram o
quadro acelerar nos quatro instantes E a atribuição do raymarch SUBIR em t=100.

**Itens (3) e (4) da fila do raymarch: FEITOS, e bit-exatos provados.**

| instante | quadros/10 s antes | depois | ganho |
|---|---|---|---:|
| t=0 | 92 · 86 | 100 · 98 | **+11,2%** |
| t=40 | 132 · 132 | 144 · 144 | **+9,1%** |
| t=100 | 97 · 97 | 101 · 101 | **+4,1%** |
| t=180 | 86 · 85 | 91 · 91 | **+6,4%** |

(1920×1080, `cinema` fixado, duas repetições por instante; as repetições batem exatas em
t=40/100/180.) **Imagem: `>>> BIT-IDÊNTICO` nas seis vistas**, incluindo o retrato
700×1800 — md5 igual antes e depois, e cada lado repetindo consigo mesmo. **Gate do céu
cravado: `skyError` 0,7853 com os cinco termos idênticos a quatro casas** (espessura
0,3144 · fenda 0,2216 · perfil 0,2031 · púrpura 0,0341 · cor 0,0121).

**A baseline do céu DESTA máquina é 0,7853, não os 0,7811 do registro** — 0,5% acima, com
a mesma estrutura de termos. A diferença é de GPU e do ponto de assentamento novo da
captura; comparação de rodada continua valendo, comparação com número documental de outra
máquina não.

O argumento de exatidão de cada um, porque é ele que autoriza não olhar pixel:
**(3)** daqui para baixo `nebulaDensity` só MULTIPLICA (lanes, Bolha Local, cavidade,
`gasDensity`), então a amostra que chega em 0 sai em 0 — e o fbm de 2 oitavas das `lanes`
era o preço de redescobrir isso. Não é caso raro: `clumps` é um `smoothstep(0.50, 0.90)`
sobre ruído de média 0,4594, ou seja **mais da metade das amostras zera antes**. Vale nas
DUAS variantes (a local, de `starShaders`/`dustShaders`, não tinha guarda nenhuma).
**(4)** o `uSeedCloudCount == 0` da guarda de vácuo era conservador demais: bastava UMA
nuvem no pool, em qualquer lugar, para toda amostra de envelope vazio pagar n1, n2,
clumps, núcleos e lanes. O que a guarda precisa saber não é se EXISTE nuvem e sim se
alguma alcança ESTA amostra — e o span da (2) já responde isso uma vez por raio. É o mesmo
teste que gateia o laço, então quem sai por aqui sairia com d ≤ 0,003 e o `d > 0.003` do
raymarch descartaria. `GLSL_DENSITY` só é consumido por `nebulaShaders.ts`, que chama
`seedSpan` uma vez por raio antes do laço: o span está sempre válido.

**A nebulosa atrás da fotosfera: FEITA, e o ato do Sol não era o que a auditoria dizia.**
A auditoria de 2026-08-07 precificou o item em **1,2 ms**, tratando-o como sobra. Medido
aqui com ablação (`?nonebula=1` em t=6): **o raymarch é 61 ms de um quadro de 101 ms —
60%**, e o Sol inteiro com as dez camadas é 21. O ato do Sol é tão dominado pela nebulosa
quanto a travessia, e a fração que a fotosfera TAPA é ~19% do trabalho dela.

| instante | quadros/10 s antes | depois | ganho | raymarch |
|---|---|---|---:|---|
| t=0 | 100 · 98 | 114 · 111 | **+13,6%** | 74,0 → 59,7 ms (−19%) |
| t=6 | 99 | 113 · 111 | **+13,1%** | 73,0 → 59,4 ms (−19%) |
| **t=100 (controle)** | 101 · 101 | 100 | −1% (ruído) | 86,7 → 86,6 |

O controle é a checagem causal: em t=100 o Sol não está na tela e nada se move.

**O teste é em DIREÇÃO, não em espaço de tela, e isso não é preferência.** A silhueta de
uma esfera é um cone EXATO em torno da direção do centro; em espaço de tela ela é uma
elipse DESLOCADA assim que o Sol sai do eixo óptico. Um disco em pixels centrado na
projeção do centro erraria exatamente como a margem em X do recorte da galáxia errou —
`dot(rd, uSunDir) > uSunCos` não tem esse modo de falha, e o `rd` o shader já calcula.
**Três encolhimentos, e o do meio é o que morde:** a malha é uma esfera TESSELADA e sua
silhueta é o polígono INSCRITO (raio efetivo R·cos(π/N); usa-se N = 96, o pior tier); e
entre o raymarch e o consumo há um blur de 4 taps a ±meio-texel MAIS o upsample linear do
RT de meia-res, e **os dois espalham o preto para FORA do disco** — este é em texel do RT,
não em raio, e vale 3 texels.

**A exatidão vem da ordem de desenho, não da margem:** o RT é o `scene.background`, a
fotosfera é opaca por construção (`vec4(color, 1.0)`, `ShaderMaterial` sem `transparent`,
com `depthWrite`), e as camadas aditivas do Sol são `transparent` — three as desenha DEPOIS
da opaca, somando sobre a fotosfera e não sobre este fundo.

**Verificação: 12 pixels de 3.083.400 (0,00039%), todos de exatamente 1 nível**, espalhados
por 9 blocos de 16×16 numa caixa de 1162×1311 — sem concentração nenhuma. Perda de conteúdo
daria mancha COMPACTA com delta grande. **E os dois lados repetem EXATO (0 px de tremor
entre execuções)**, o que é evidência mais forte que a da guarda da cavidade, onde o tremor
do próprio lado era 65 px. As outras seis vistas são bit-idênticas e **o gate do céu não se
move: `skyError` 0,7853 com os cinco termos idênticos a quatro casas** (lá `?nosun=1`
desliga o cone, e o desvio novo não muda nem o codegen que a métrica enxerga).

**Ferramenta nova, e ela faltava havia três rodadas: `scripts/visual/diff-pixel.mjs`.** O
cabeçalho do `ab-identidade` manda rodar o diff de pixel quando dá "DIFERE", e o projeto já
tinha precisado dessa conta pelo menos três vezes (os 55 px da cavidade, o 1 px do recorte
da galáxia, os ~50 px do `galsplit`) sempre refazendo à mão no scratchpad. Ele imprime
histograma por delta, caixa envolvente e mapa de blocos 16×16 — porque é a CONCENTRAÇÃO, e
não a contagem, que separa ULP de conteúdo perdido.

**O que sobra da fila:**
- **(5) `q2<9` → `q2<7`: segue FORA** pelos motivos de 2026-08-07 (única com mudança de
  imagem de verdade, mexe no corredor de Órion, e `coresGLSL()` é injetado duas vezes).
- **LUT angular do `flick` da coroa (0,55 ms) — NÃO FEITA.** A premissa foi CONFERIDA e é verdadeira:
  `ctx.cvolInvRot.copy(ctx.sunInvRot)` (novoSol.ts:551) e o grupo do Sol nunca sai da
  origem, então o `dirO` de `coronaRays` (do ângulo de tela) e o de `coronaVolume` (de
  `normalize(vWorld)`) são o MESMO vetor — a LUT de 1×8192 pode servir os dois, indexada
  pelo ângulo no plano do céu. Não é bit-exata (quantização + filtro), e cai nos 12 s mais
  vistos do filme: exige A/B com diff de pixel, não só md5. **O gate agora enxerga o ato do
  Sol** (a vista `sol`, t=6, entrou no `ab-identidade`), então ela é verificável — o que
  não era verdade antes desta rodada: a lista começava em t=40 e era CEGA para as duas
  alavancas que sobravam.

## Rodada do visitante (2026-08-09) — o link público mudou a régua

O projeto foi publicado (GitHub Pages, workflow em `.github/workflows/deploy.yml` —
push na main publica sozinho; `base: './'` no vite.config é o que faz o subcaminho
funcionar, trocar para `/` quebra produção sem quebrar o dev). Com alguém do outro
lado do link, a régua AAA vale mais que milissegundo: **o caminho do visitante —
baixar, esperar, abrir no aparelho que for — é sagrado.** Três itens da fila de UX
entraram de uma vez; o que cada um ensinou:

- **Payload −26% (12,4 → 9,2 MB): o Pages não comprime `octet-stream`.** Texto e
  JSON saem gzipados da borda; os `.bin` — 12,3 dos 13,3 MB — viajavam crus. Agora
  `npm run data:pack` (último passo do `data:all`) gera `.gz` nível 9 ao lado de
  cada `.bin`, e `fetchBinary` (config.ts) busca o `.gz` e descomprime com
  `DecompressionStream`; os crus ficam como fallback para navegador sem a API.
  **A armadilha que a primeira versão comeu: quem decide se ainda há gzip a
  desfazer são os BYTES, nunca um header.** O Vite serve `.gz` com
  `Content-Encoding: gzip` (o browser entrega já descomprimido); o Pages serve o
  `.gz` opaco. Assumir um dos dois casos fez o dev estourar o
  `DecompressionStream` e o catch baixar TUDO em dobro — o fallback "seguro"
  custando mais que a ausência da feature. O teste é o magic `1f 8b` no início do
  buffer (nenhum `.bin` do projeto começa assim — conferido), e a checagem de
  `byteLength` do manifesto valida a descompressão logo depois.
- **Qualidade inicial por dispositivo e loading em estágios**: riscados na fila de
  2026-08-06 acima, com o racional lá.
- **gaia-ob-proxy quase não comprime** (3,81 → 3,55 MB): Float32 de posição é
  entropia alta. O ganho real de payload que sobra está no item (4) da fila de
  2026-08-05 — as colunas mortas (2,77 MB seguros) — e em quantizar, não em
  comprimir mais forte.

**Verificação:** as sete vistas do `ab-identidade` bit-idênticas e `skyError`
cravado (a descompressão devolve os MESMOS bytes; o tier por dispositivo não roda
em headless sem touch; o rótulo de etapa só existe durante o loading, que as
capturas atravessam). Vivo no browser: rede só com `.gz` (sem download dobrado),
desktop abre em `cinema`, viewport mobile emulada abre em `performance`, e o véu
troca de rótulo etapa a etapa.

## A cor das 100.000 OB vinha de um SORTEIO (2026-08-09)

A pergunta que abriu isto não era de cor, era de payload: quais colunas dos `.bin`
ninguém lê, para podá-las. A resposta separou as colunas mortas em três casos, e o
terceiro mudou a rodada de assunto.

- **Já usada, pré-digerida:** `dustDensity[4] sigmaDensityCm3`. O build faz
  `confidence = density / (density + sigma)`, e o renderer lê `confidence`. A
  incerteza CHEGA, mastigada — a política do manifesto ("renderers must use them")
  está satisfeita, e guardar o número cru ao lado do resultado é redundância, não
  preservação. **Correção de uma leitura minha anterior, que via conflito aqui.**
- **Derivável:** `heliocentricDistancePc` nos dois arquivos. A posição está no
  registro e o Sol tem lugar conhecido — é uma subtração guardada em disco.
- **Medida real, ignorada:** `gaiaObProxyStars[7] effectiveTemperatureK`. E o
  renderer pintava as cem mil com
  `mix(vec3(0.48,0.66,1.0), vec3(0.88,0.94,1.0), fract(vSeed * 7.3))` — um número
  aleatório entre dois azuis pintados à mão, com a Teff de cada estrela parada no
  arquivo que o visitante já baixava. Coluna morta aqui não era "não contribui", era
  **"decidimos não olhar"**.

**O que o Gaia mede** (100.000 registros, todos com Teff válida): mediana **11.739 K**,
p75 14.142, p95 20.000, máx 54.843; **79,7% entre 10 e 15 kK e só 0,6% acima de
30 kK**. Isso REFUTA a objeção que eu mesmo levantei antes de medir — que O reais de
30–40 kK empurrariam azul demais. A amostra é de B tardias, não de O.

**As duas paletas, normalizadas por luminância** (purp = quanto o verde fica abaixo da
média de R e B): o sorteio cobre purp **0 a +0,124**; a física dá **+0,162 (p05) a
+0,300 (p95)**. **A faixa inteira do sorteio fica abaixo do p05 físico** — não era
imprecisão, era um viés unilateral em todas as cem mil. Média da população
**+0,0507 → +0,2115**, quatro vezes, com o mesmo fluxo.

**NÃO se usa `[6] bpMinusRp`**, que também estava morta: é a cor OBSERVADA, já
avermelhada (mediana +0,76, máx +3,65), e o renderer aplica a própria extinção pelo
`tauMap` — usá-la avermelharia duas vezes. `effectiveTemperatureK` é a estimativa
desavermelhada, e é o que `blackbodyLinear` pede.

**Implementação:** o slot `aSeed` passa a carregar a Teff para o tipo 4 (para essa
população ele só alimentava a cor — nenhum atributo novo, `STRIDE` intocado), e a cor
sai do `GLSL_STAR_COLOR` que as 328.749 do HYG já usam (unificação 1, uma lei
fotométrica). **Luminância conservada em Y = 0,7889**, o Y médio da paleta antiga:
sem isso, a rodada 06/07 já ensinou, trocar a cor de uma população por outra de Y
diferente é mudança de FLUXO disfarçada de cor.

| termo | antes | depois | |
|---|---:|---:|---|
| espessura | 0,3144 | 0,3144 | cravado |
| fenda | 0,2216 | 0,2217 | ruído |
| perfil | 0,2031 | 0,2031 | cravado |
| púrpura | 0,0341 | **0,0322** | −0,0019, para o alvo |
| cor | 0,0121 | **0,0142** | +0,0021, para longe |
| **skyError** | **0,7853** | **0,7857** | **+0,0004 (0,05% pior)** |

**Espessura e perfil cravados a quatro casas são a PROVA da conservação de
luminância** — a troca é matiz pura, e se eles tivessem mexido seria defeito, não
consequência. Diagnóstico: `purp` 0,0443 → 0,0462 (alvo 0,0784), `colour` 0,052 →
0,0499 (alvo 0,0641).

**Imagem:** face-on 21.845 px de 3.083.400 (0,71%), delta máx 12/255; edge-on 27.729 px
(0,90%), delta máx 24/255 — e a caixa envolvente do edge-on é **1731×136 px**, um risco
fino colado no plano galáctico. A mudança pousa exatamente onde as O/B moram e em
lugar nenhum além; é a checagem causal desta rodada.

**DECISÃO: manter, contra o gate.** Pela regra que o projeto já aplicou duas vezes —
na rodada 37 o gate preferia dose 1,5 por **0,0098** e o valor da literatura foi
mantido; o `corewall` da rodada 34 idem; a frase registrada é "a dose vem da física, a
nota se aceita como vem". Aqui o custo é **0,0004**, 25× menor, e nem dose existe: é
trocar um número aleatório por uma medida. O que melhorou é o défice conhecido (púrpura
em 60% do alvo há rodadas). **O contra-argumento fica registrado porque é legítimo:** o
gate é o juiz e disse pior; régua que só vale quando agrada não é régua.

**Suspeita com endereço para a próxima rodada, não remendo agora:** o termo `cor`
piorar é provavelmente CONTAGEM DUPLA — as OB agora puxam azul corretamente num lugar
onde o modelo difuso do disco já compensava a ausência delas. É o mesmo terreno da
rodada do disco externo (termo `espessura`, 40% da nota), que terá de desfazer isso de
qualquer forma.

**O que sobra de poda**, agora que `[7]` foi promovida a fonte de cor: `dustDensity[4]`
e `[5]` mais `gaiaObProxy[3]` e `[6]` — 2,37 MB crus. E a separação que dissolve a
tensão com a política do manifesto continua valendo: o `data:all` gera uma versão de
RENDERIZAÇÃO (podada e quantizada) para `public/`, e os arquivos científicos completos
ficam versionados fora dele. Nada de dado se perde, e o visitante baixa menos.

## A faixa e o catálogo desenhavam a mesma luz duas vezes (2026-08-09)

A rodada do disco externo, que o diagnóstico de 2026-08-06 tinha encomendado, virou
outra coisa logo na primeira medida — e o motivo é uma lição de método antes de ser
de física.

**A premissa encomendada estava VELHA.** O diagnóstico mandava perguntar "por que o
disco EXTERNO é pouco luminoso". Medido hoje, o anticentro está **1,176× BRILHANTE
demais** (0,497 contra 0,423 da foto): a alavanca que ele nomeava — `edge` em 15,5 kpc
e a escala radial 5200 — teria piorado o `perfil`. Aquela tabela foi montada à mão no
scratchpad e envelheceu sem juiz. **Conserto de processo, não de número: o
`sky-capture.mjs --perfil` passou a imprimir a curva de `espessura` bin a bin**, com a
soma dos desvios de cada sinal — o maior termo do gate era a única curva da soma que
ninguém imprimia, e por isso a única que podia envelhecer em silêncio.

**A forma do erro.** O termo é meia-largura de meio-fluxo centrada em b=0, então quem
o infla é PEDESTAL — e largo em b é luz PERTO (uma camada de altura h a distância t
subtende h/t). O excesso é de um sinal só: **+31,25 contra −2,00** nos 24 bins,
grossa demais em 21 deles (média|Δ|/|médiaΔ| = 1,14, o termo é honesto). Piores:
l = −157° (9,50 contra 4,50) e l = +173° (7,75 contra 3,50).

**O buraco, e ele estava num handoff que o projeto já tinha construído.**
`unresolved()` (unificação 2, etapa 2) desconta da luz integrada os 3,8% que as
CASCAS desenham. As 328.749 estrelas do catálogo — completo a m=10 dentro de 5 kpc —
**nunca entraram nesse handoff**: a LUT da faixa emitia 96,2% do modelo e o catálogo
desenhava a mesma população por cima. Perto do Sol as duas cópias somam quase o dobro.
Isso explica, com mecanismo, o "achado lateral que incomoda" registrado sem causa em
2026-08-06: `?nocat=1&nowrap=1` MELHORAVA a nota do céu porque tirava uma das cópias.
E como a fração duplicada é função da DISTÂNCIA, nenhuma calibração global da LUT
podia absorvê-la — é defeito de forma, no lugar exato onde o pedestal mora.

**A armadilha que custou uma bateria de GPU, e ela é o achado transferível.** A
primeira versão DERIVOU a fração da função de luminosidade de 7 bins das cascas em
vez de medi-la. Aquele bin de topo (M_V −6 a −2, 51,6% da luz) é uniforme em M ao
longo de QUATRO magnitudes — dentro dele o brilho varia 58×. Para os `amp` das cascas
a grosseria nunca apareceu porque a completude o esmaga (comp 0,0138); para esta
fração a 1–3 kpc é justamente ele que decide o número. Previa 0,635 a 1 kpc onde o
catálogo real tem **0,058**. Ligada assim: **skyError 0,7857 → 0,8259**, porque tirava
o pedestal abaixo de 1 kpc (o que se queria) E o NÚCLEO da faixa entre 1 e 3,6 kpc (a
3 kpc uma camada de 250 pc subtende 4,8°, a espessura inteira da referência).
**Aproximação boa num uso não é boa em outro** — e o sintoma foi o gate discordar da
física, que aqui era sinal de curva errada, não de régua errada.

**A curva certa é MEDIDA no próprio binário**, em runtime, das mesmas posições e
luminosidades que o renderer desenha (`resolvedCatalogCurve`, wrappedStars.ts):
densidade de luminosidade por casca dividida pelo perfil do modelo naquela casca,
saturando em 1. Medida: ~1,0 até 150 pc · 0,95 (175) · 0,68 (250) · 0,46 (400) ·
0,29 (600) · 0,145 (850) · 0,058 (1250) · 0,026 (1750) · 0,015 (2500) · 0,003 (4000)
· 0 no horizonte. **A dupla contagem real morre em ~500 pc.** Custo: 63,5 ms uma vez,
no init, sob o véu. De lambuja, a densidade local medida do catálogo — **0,0447
L_sun/pc³** — cai entre a LF de 7 bins do projeto (0,0337) e a literatura
(0,05–0,07): a LF subestima em ~30%, o que vale saber quando ela for re-dosada.

**Resultado (o melhor da série do céu nesta máquina):**

| termo | antes | depois | |
|---|---:|---:|---|
| espessura | 0,3144 | **0,3026** | −0,0118, o maior termo |
| fenda | 0,2217 | 0,2240 | +0,0023 |
| perfil | 0,2031 | 0,2047 | +0,0016 |
| purpura | 0,0322 | 0,0336 | +0,0014 |
| cor | 0,0142 | **0,0132** | −0,0010 |
| **skyError** | **0,7857** | **0,7782** | **−0,0075** |

E o `bulgeAnti`, que afere a RÉGUA e não o modelo, foi de 5,215 para **5,497** contra
o alvo 5,568 — de 6,3% abaixo para 1,3%. É o contraste que o mecanismo previa: tirar
um pedestal quase uniforme sobe o pico contra a média.

**Verificação, e ela tem uma previsão causal cumprida.** `?catsub=0` reproduz as seis
faces **bit-idênticas** à baseline — duas vezes, antes e depois da refatoração inteira
—, então tudo que se mediu é do desconto. No `ab-identidade`: **`mergulho`, `edgeon` e
`faceon` BIT-IDÊNTICAS**, `sol`/`interno`/`travessia`/`retrato` diferem. Isto é o
teste, não um detalhe: `mergulho` está a 8 kpc do Sol, onde `catFade` já é zero — se
ela tivesse se movido, o desconto estaria vazando para onde não há catálogo para
duplicar. Diff de pixel nas faces do gate: 95–99,8% dos pixels mexem com **delta
máximo de 3 em 255** (1:689k · 2:1056k · 3:105k), assinatura de véu fino removido, e
isso sob o stretch de revelação, que amplifica o fraco. A olho, no look do app, as
duas vistas são quase indistinguíveis.

**Becos medidos nesta rodada (não repetir):**
- **`nothick`** (disco espesso da LUT fora): espessura 0,3144 → **0,3215**, PIORA;
  skyError 0,8547. A inversão de escala radial dele contra a literatura (`hRThick`
  6500 > `hR` 5200, quando BH&G 2016 dá o espesso mais CURTO) é inconsistência real e
  segue aberta, mas **não é a alavanca da espessura**.
- **`nolocal`** (só a LUT distante): compra 0,073 de espessura pagando 0,136 de
  perfil — skyError 0,8857.
- **`lutnear=1000`** (corta toda a emissão da LUT abaixo de 1 kpc): espessura 0,2884,
  o melhor movimento isolado do termo, mas skyError 0,7844, pior que a curva medida.
  É diagnóstico, não modelo — fica como knob.

**O que sobra da espessura, com endereço:** nos três piores bins (l = −157°, −172°,
+173°) o desconto do catálogo não ajuda — ali o pedestal que resta é **gás local**
(raymarch + o véu do plano, que é `exp(−5·sin²b)`, 26° de largura somados a TODA
longitude). Esse véu nunca foi ablacionado sozinho: `?nolocal=1` derruba ele e o
raymarch juntos. É a primeira sonda da próxima rodada deste termo.

**Duas dívidas ficaram VISÍVEIS onde não dá para não ver:** `LUT_DISK`
(galacticModel.ts) reúne os sete números do disco da LUT que estavam literais dentro
do GLSL — e expõe lado a lado o `hR` 5200 contra os 2600 das partículas (auditoria de
2026-08-03, item 2) e o `hRThick` maior que o `hR` (item 3). O template imprime
exatamente os mesmos literais; a prova é o `catsub=0` bit-idêntico.

## O Atlas vive aqui (fusão atlas-orbital → Viagem, Onda 0, 2026-08-10)

O plano completo é [`docs/PLANO-ATLAS.md`](PLANO-ATLAS.md) — matriz de 84 linhas,
roadmap em ondas 0–9, riscos e anti-padrões. Aqui fica só o que decide:

- **A decisão.** O produto é um só — **Mar de Estrelas**: o filme de 5min21 leva o
  visitante do Sol a Sgr A*, e perto de casa (janela `DISC_FADE0/1` de
  `world/novoSol.ts`) vive **o Atlas** — o sistema solar explorável, didático e
  cientificamente honesto do atlas-orbital, renascido como modo do mesmo Director,
  sem loading e sem segundo motor. Ao final da fusão (Onda 9) o repositório
  atlas-orbital vira read-only. Frase de identidade: *"a jornada te leva; o Atlas
  te deixa ficar."*
- **A doutrina de travessia** (decisão do dono, registrada como fato de projeto): o
  atlas foi feito no impulso, com modelos de IA anteriores; a iluminação de lá é
  super bugada; várias escolhas de interface são pobres. Logo, **o código do atlas
  é a especificação do problema, não o fornecedor da solução**. Régua de três
  categorias: (1) dados e oráculos — efemérides, coeficientes IAU, fixtures,
  testes de regressão — **migram verbatim**; (2) ferramentas offline cuja saída um
  gate confere contra fonte externa **podem migrar**; (3) código de runtime e UI
  **renasce por padrão** — só diz "Migra" exibindo duas provas: qualidade medida
  com o arquivo aberto E revisão de olhos frescos na hora do merge. Contrapeso
  igualmente vinculante: **reescrever o que um oráculo externo já protege é
  adicionar risco sem ganho** — mistranscrição de um W₀ renderiza um planeta
  perfeitamente plausível e nenhum olho pega.
- **O pilar novo: o motor estelar.** O NovoSol (14 módulos de `world/sol/`, 4.960
  linhas: convecção GPU, ciclo, flares, CME, coroa volumétrica) deixa de ser um
  singleton esculpido para o Sol e vira `stellarBody.ts` parametrizado por
  `{teffK, radiusPc, rotPeriodDays, activityLevel, convective}`. O Sol vira a
  instância nº 1, com gate pixel-igual. A peça que fecha o desenho vem do atlas:
  `descriptorFromCatalog` (TS puro, zero import de render) roda com exatamente os
  dois campos que o `sc1` já carrega — `ci` e `logLum` — e entrega temperatura
  (Ballesteros), classe MK, classe de luminosidade e raio (Stefan-Boltzmann) para
  as 328.749 estrelas por **zero byte de payload novo**. Oráculo: 7
  verdades-terreno publicadas (Sol G2V, Sirius A1V, Vega A0V, Proxima M5.5V,
  Betelgeuse M2Ia, Antares, Sirius B DA2).

### Onda 1 — FEITA (2026-08-10)

A primeira onda de código da fusão, mergeada com gate integral e ata de olhos
frescos assinada (registro completo: PLANO-ATLAS, "Estado da Onda 1"). O que
ainda decide algo por aqui:

- **O boot agora tem três autoridades, nesta ordem: URL > storage > detecção**
  — e um teto de GL que só rebaixa quando o renderer se NOMEIA software.
  `?q=` segue soberano (inclusive sobre o teto): gate com `?q=` desliga o
  auto-quality e por isso NUNCA contamina o storage. O storage
  (`src/lib/preferencias.ts`) guarda só ALOCAÇÃO medida (tierQueRodou),
  jamais gosto — tom/exposição/camadas seguem sendo URL.
- **Heroes e SunStar entraram na lei de cor única** (bvToColor com espelho
  CPU em `common.ts` — mais um passo da unificação 2). A tabela literal
  `HERO_BV` em `heroStars.ts` é a autoridade de B-V das 16 (a fonte HYG erra
  Betelgeuse: 1,50 lá, 1,85 medido); mudança visível SÓ em close-up de hero
  — as 7 vistas do gate moveram no máximo 1 nível de ULP.
- **Identidade de catálogo**: as 1.726 nomeadas carregam ci + HD/HIP/Gliese
  no sidecar, EXCLUSIVAMENTE do HYG v4.4 (o AT-HYG diverge em 28 HDs e traz
  Gliese sem prefixo — medido; sem fallback, campo ausente é honesto).
  Consumidores futuros: busca e deep-link (Onda 5).

### Onda 2 — FEITA (2026-08-11)

"Dados antes de pixels": efemérides, orientação IAU, física estelar e conteúdo
editorial do atlas entraram SEM tocar um pixel (7 vistas bit-idênticas contra
main, capturadas frescas dos dois lados). Registro completo no PLANO-ATLAS
("Estado da Onda 2"); o que ainda decide algo fica aqui:

- **`src/lib/atlas/` é física pura, zero three, frame eclíptica J2000 em UA.**
  Quem consumir (render das Ondas 4/6, máquina do tempo da 5) remapeia na
  borda com `frameGalactico.ts` — validado contra Sgr A* e o polo eclíptico.
  O conversor ÚNICO de tempo é `time.ts` (regra M6); toda chamada de posição
  recebe jdTDB, nunca Date/UT cru.
- **A janela das tabelas é 1950–2050 TDB e é DECISÃO DE PAYLOAD, não física**
  (efemerides.bin 0,75 MB; o amostrador regenera janela maior quando a
  Decisão 2 fixar orçamento). 9 fixtures sub-solares fora dela estão pulados
  com inventário pinado por asserção — o teste ACUSA quando a janela crescer.
- **Regra nova, comprada com bug achado na revisão: a composição
  heliocêntrica exige FECHAMENTO** — todo centro citado por um corpo coberto
  precisa ser ele mesmo coberto (Vanth compunha até Orcus e morria). O teste
  de fechamento varre o registro inteiro; corpo novo sem pai coberto quebra o
  teste, não o produto.
- **A lição do passo-cede-não-o-limiar:** o passo de Mercúrio caiu 6→4 dias
  porque o erro Hermite medido estourava o orçamento do auto-gate — os
  números de aceitação moram no DADO (manifest), o amostrador THROW se
  estourar, e limiar de oráculo nunca afrouxa para passar.
- **O kernel completo venceu a curadoria manual:** iauOrientation.ts é
  EMITIDO do pck00011 pelo derive vendorizado (86 termos; o doador truncava
  23 à mão) e nunca se edita número ali — regenerar e colar. Os escalares dos
  31 corpos conferem com o doador a divergência zero.
- **Divergência declarada que não se "conserta":** o companion
  derive-elements guarda seu próprio isoToTDB_JD clampado (2,6 s vs time.ts,
  medido) porque foi ele quem gerou os epochJD embarcados — trocar o
  conversor lá quebraria a reprodução exata dos blocos. O checklist item 7
  pedia "casar exatamente"; o doador nunca casou, e o desvio registrado é a
  herança honesta.
- **vitest é o primeiro runner do projeto** (586 testes): oráculos numéricos
  grandes demais para o padrão verify-*.mjs moram em src/**/*.test.ts; o
  verify segue dono da integridade dos artefatos de public/data/.

### Onda 3 — FEITA (2026-08-11)

O motor estelar F1–F2: `stellarBody.ts` (o Sol vira instância nº 1 de uma
classe parametrizada), `lodStellar.ts` (o LOD estelar puro num lugar só) e os
dois canais por estrela no campo de catálogo. Registro completo no
PLANO-ATLAS ("Estado da Onda 3"), inclusive o gate e a melhoria auditada; o
que ainda **decide** algo fica aqui:

- **A dominância é lei viva, com interruptor.** As 16 mais brilhantes já não
  desenham luz duas vezes: o ponto do catálogo cede na medida em que o
  billboard do hero **DOMINA a tela**, `fade = smoothstep(1; 2,5)(r)` com
  `r` = diâmetro do hero / diâmetro do ponto, em px. A régua é TAMANHO e não
  brilho porque as duas camadas não têm normalização radiométrica comum (o
  ponto é fotométrico, o clarão é artefato de olho com ganho artístico) —
  calibrar uma na outra é trabalho da Onda 7. `r ≤ 1` devolve 0 EXATO: onde o
  hero é sub-dominante o ponto fica intocado, e é isso que mantém vista
  bit-idêntica. **Presença ≠ dominância** — a versão por presença apagaria o
  ponto a 200 pc, onde o billboard tem 0,91 px contra 5,93 do ponto; a medição
  derrubou o desenho, e a regra que fica é *medir antes de escrever a política*.
  A chave é `DOMINANCE_DEFAULT_ON` (`lodStellar.ts`), hoje `true`;
  **`?nodom=1` desliga ao vivo e `?dom=1` liga mesmo com a constante em
  `false`** — as duas portas existem para que todo A/B futuro seja feito com o
  MESMO binário, e são o "antes/depois" de qualquer nova discussão sobre esta
  luz. Quem mexer na PSF do campo (`uSigmaPx`/`uExpoM0`) ou no `uSize` dos
  heroes mexe nesta política junto: o espelho em JS existe para prever o pixel
  da GPU, e se a PSF mudar lá o teste daqui quebra — é o alarme, não o
  incômodo.
- **`StellarParams` é o contrato da estrela procedural — e a lista do que NÃO
  entrou nele vale tanto quanto.** Entraram `nome`, `radiusPc`,
  `rotPeriodDays` (via `rotSpeedFromPeriod`, âncora na RELAÇÃO e não no
  número), `tiltRad`, `activityLevel` (multiplica só `spots` e `cycle`),
  `cyclePhaseMin/Max`, `dramaT0/T1`, `seed`, `knobPrefix`, `knobs`; `teffK` e
  `convective` nascem **reservados e sem consumidor** (a lei de cor por classe
  é da Onda 7, e o teste prova que ninguém os lê). **Ficaram de fora, com
  razão declarada:** (1) `SUN_RADIUS = 2.2`, duplicado como literal em
  `sol/sun.js:13` e lido por 7 dos 14 vendorizados — promovê-lo exigiria
  editar os `sol/*.js`, que a regra M3 proíbe; os dois lados têm de continuar
  concordando à mão; (2) a **paleta H-alfa** (~17 `vec3` inline em 8 módulos),
  que é override declarado da instância Sol; (3) `sol/cme.js` captura
  `ctx.camera` **na criação**, não por quadro — uma segunda instância
  construída antes da câmera real pegaria a errada sem erro nenhum; (4)
  `DONOR_FIT`/`HALF_FOV` e a janela do limbo, que são calibração de LENTE do
  doador; (5) `TIERS`, que é custo. **Consequência operacional: não se
  instancia um segundo `StellarBody` antes da Onda 7** — (1) e (3) são as duas
  minas, e estão anotadas no próprio arquivo.
- **Regra nova: escrita em atributo instanciado tem três obrigações.** Vale
  para qualquer `BufferAttribute` que a casa reescreva por quadro (hoje
  `aFade`/`aFocus` em `stars.ts`; amanhã o foco por estrela e o que vier).
  (i) **Idempotência com `Math.fround` ANTES de decidir** — o buffer é float32
  e quem calcula está em float64; comparar os dois direto acha "mudou" em todo
  quadro e a GPU leva upload com a câmera parada. (ii) **Teto nas faixas**: o
  `addUpdateRange` só é consumido dentro do `updateBuffer` do three, e o
  renderer **pula objeto invisível** — com o campo escondido (`?nocat`) as
  faixas cresciam sem limite; passado `UPDATE_RANGE_CAP` cai-se para upload
  cheio, que é correto e barato. A defesa é do ESCRITOR e não de quem esconde
  o objeto. (iii) **Latch de upload cheio**: `updateRanges` vazio + `needsUpdate`
  é como se pede o buffer inteiro; quem faz isso (`reset()`, ou o teto)
  precisa que as escritas seguintes NÃO recoloquem faixa antes do render,
  senão a GPU sobe um slot e o resto fica com o valor velho. O latch baixa no
  `onUpload` — o único sinal honesto de "subiu".
- **Divergência declarada do doador:** `writeFade` **não clampa** [0,1] (o
  doador clampava). O clamp mora no shader; clampar também no JS esconderia um
  chamador errado em vez de o denunciar, e `fadeAt()` deixaria de dizer a
  verdade sobre o que a tela usou.
- **A dívida do `vSat` foi PAGA (2026-08-11, logo depois do fecho).** Era o
  achado 3 da caçada adversarial da revisão de olhos frescos: `vSat` recebia só
  a cessão por estrela, enquanto a extinção e o `uFade` da saída da vizinhança
  solar iam parar apenas no `vPeak`. Consequência: os espinhos de difração e o
  núcleo esbranquiçado ficavam com força cheia sobre um núcleo gaussiano já
  esmaecido, e sumiam DE GOLPE quando `points.visible` desligava. O conserto é
  uma palavra em `starShaders.ts` — `vSat = sat * alpha` no lugar de
  `sat * atten` —, porque `alpha` nasce 1,0 e só acumula atenuação: é a
  atenuação TOTAL, a mesma que o `vPeak` recebe. **A regra que fica é a forma,
  não a linha: atenuação se fatora num lugar só, e quem acrescentar um fator
  novo a `alpha` o dá aos dois varyings sem precisar lembrar.** Auditado com o
  protocolo completo (15 vistas antes/depois + gate do céu) — os números no item
  3 da seção de gates.
- **Nas cascas o MESMO desenho não é defeito, e conserto análogo NÃO é
  recomendado.** `wrappedStars.ts:436` também faz `vSat = sat` contra
  `vPeak = peak * uFade` (:438), mas a assimetria é **inalcançável**: o `uFade`
  das cascas não é rampa, é binário (`director.ts:929-933` passa
  `this.hide.has('nowrap') ? 0 : 1`), e o vertex já tem kill duro em
  `uFade < 0.001` que zera o `vSat` e joga o vértice para fora do clip
  (`wrappedStars.ts:411-419`). A extinção, lá, entra na MAGNITUDE antes da PSF
  (`EXT_MAG_PER_PC * dist`, `:421`), então `sat` e `peak` já a carregam juntos.
  **A frase que importa para o leitor futuro: se algum dia o fade das cascas
  virar rampa contínua, o defeito acorda** — e aí o conserto é o mesmo, com A/B
  próprio (as cascas pintam o céu inteiro; nada nelas muda sem gate).

### Onda 4 — FEITA (2026-08-11)

O registro integral está no **Estado da Onda 4 do PLANO-ATLAS §4**; aqui fica o
que governa o futuro:

- **A decisão de visão do dono nasceu nesta onda e está nas Decisões fechadas**
  (linha "Mais que um SpaceEngine"): escala 1:1 onde possível, visibilidade por
  fotometria, artifício só no canal do instrumento — e a galáxia volumétrica
  científica como diferencial. Toda escolha de escala/render das Ondas 5–9
  passa por essa régua ANTES de qualquer escalar artístico novo.
- **O domínio profundo existe**: abaixo de 0,05 pc o disco artístico se
  dissolve (`LOD_SOL.deep`, `solWorldFade`), o Sol vira ponto fotométrico da
  camada `planetas` (10 corpos, época fixa 2026-01-01, retrato GERADO com
  proveniência), o near cai a `max(d·0,004; 1e-8)` e o voo fica proporcional.
  Acima de 0,05 pc, TUDO bit-igual ao que era — provado em 32.101 instantes.
- **A posição na tela É a efeméride projetada**, em três réguas independentes
  (vitest puro / CDP / pixel; pior erro 0,194 px por eixo no fóton). O
  instrumento permanente é `scripts/visual/planeta-pixel.mjs`, que se
  autovalida nos dois estados (M5) e mede em par próprio com `&nobloom=1`.
- **Portas**: `?plan`/`?noplan` (a camada), `?dbgplan` (leitura por corpo em
  UA/anos-luz). O palco profundo NÃO tem porta — é fundação, como o near
  (emenda D11a do desenho da onda).
- **Encarar o Sol de dentro do sistema ofusca DE PROPÓSITO** (m −15,84 e pico
  4,8e6 a 150 UA; 31,85% do quadro satura com bloom): é física sem
  auto-exposição. NÃO "consertar" com teto de brilho — a auto-exposição da
  Onda 8 é o conserto, e estes números são a semente medida dela.
  - **2026-08-14 — A PUPILA EXISTE, DESLIGADA, E MOVEU O ALVO DA ONDA 8.**
    `src/three/core/pupila.ts` + atuadores; `?pupila=1` liga, `?pupila=alvo,kappa`
    varre, ausente/`0` é a imagem de hoje BIT A BIT (4/4 sentinelas). Ligada,
    a faixa branca acaba (luz média 0,945 → 0,04; acima de meia luz 100% → 0,2%).
    Três coisas que este trabalho fixa e que não estavam escritas:
    1. **A exposição NÃO pode ser um passe de pós.** Além de o `OutputPass`
       vir depois do bloom (já medido: `?exp=0,12` deixa luz média 0,75), os
       RTs do composer são **half-float** e saturam em 65.504 — o ponto do Sol
       a 1 UA deposita ~4e11 e chega ao buffer como **infinito**. A pupila entra
       DENTRO de quem emite: para PSF é um deslocamento de `expoM0`
       (`expoM0' = expoM0 + 2,5·log10 g` multiplica E por g exatamente); para
       billboard é `uExposicao`.
    2. **Expor só a fonte pontual É o teto proibido.** A primeira versão deixou
       os 16 clarões de billboard acesos e a imagem provou a previsão do NORTE:
       a 3,6 UA o Sol (m −23,8) saía MAIS FRACO que α Centauri (m 0,0). A
       diferença entre pupila e teto é de natureza — a pupila é um ganho ÚNICO
       sobre TODAS as fontes, e nenhuma relação entre elas muda.
    3. **O QUE DESTRAVA O ITEM 3 DEIXOU DE SER A PUPILA.** Com ela ligada, o Sol
       ESCURECE ao se aproximar: a 3,6 UA quem o desenha é o ponto (bola branca
       com halo); a 1 UA a malha arma, e sendo opaca com escrita de profundidade
       TAPA o ponto — sobra um disco laranja de 7,6 px sem clarão. Passo para
       trás na luz, o que a prova de continuidade da Onda 3 proíbe. **A causa tem
       número: a fotosfera da malha é autorada em radiância ~1 e a lei do ponto
       deposita ~2,8e10 para a MESMA superfície — cerca de 26 magnitudes de
       distância**, e half-float não tem essa folga. Enquanto a malha não
       estiver na escala fotométrica da casa, o handoff disco↔ponto tem degrau
       POR CONSTRUÇÃO. A próxima peça é a reconciliação radiométrica, não mais
       calibração de exposição.
  - **A régua que julga isso passou a existir**: `scripts/visual/luz-do-quadro.mjs`
    (luz média, fração acima de meia luz, diâmetro da mancha, e o **disco
    verdadeiro** pela geometria como coluna de controle). Os números que o repo
    citava viviam em comentário, medidos à mão. E a escada do `ab-identidade`
    ganhou os cinco degraus do vão (`ua2`, `ua4`, `ua8`, `ua20`, `ua2000`).
- **Pendências herdadas pela frente**: fixtures Horizons de
  venus/jupiter/saturn/uranus (Vênus é a garantia mais fraca: 1,96e-3° por
  orçamento de manifesto); ~~fase polinomial por corpo e corpos resolvidos
  (Onda 6)~~ — **cumpridas na Onda 6** (MH18 no ponto; globos resolvidos);
  starOptics do Sol-ponto (7a); fio de rede da efemerides.bin (o tempo
  vivo da abertura já é da Onda 6); o selo da Onda 5 reporta "ESCALA REAL
  no domínio profundo" de graça; `?nosun` não governa o Sol-ponto (governa
  `noplan`); BV_SOL/SOL_BV e PONTO_ZERO_SOL_PC redigitados com igualdade
  pinada — unificação **tentada na Onda 6 e recusada**: moveria o filme.

### Onda 6 — FEITA e mergeada (2026-08-13)

Corpos resolvidos + a primeira lei de luz. O registro integral está no
**Estado da Onda 6 do PLANO-ATLAS §4**. O que **governa o futuro**:

- **A lei de luz é um escalar único, por corpo, em UA de efeméride.**
  `src/lib/atlas/luz.ts`: E(1 UA)=1, `real` ≡ E bit a bit, `assistida` =
  E^0,35. σ=0,35 é o valor MEDIDO (F3, T-E10), não mais chute: o halo nos
  texels brilhantes de Mercúrio/Vênus é look aceito. O EV de CENA do §7.4
  é da Onda 8. Default no Atlas: assistida. Selo `?luz=` é linha do eixo
  BRILHO; clique volta ao real.
- **Palco local, sem log-depth.** Near segue a superfície resolvida mais
  próxima. Decisão 3 do dono: critério AAA; escalada (log-depth) volta a
  ele. O instrumento de z-fighting existe; o residual vivo (482/37)
  não julgou o palco falho — e não é prova de zero.
- **Textura real, licença por linha, escada por pixel medido.** Manifest
  em `public/data/atlas/texturas.json`. Negativos em
  `docs/reference/ASSETS.md`. Sem licença documentada não entra.
- **Um relógio só:** luz, rotação IAU, nuvens, anel e eclipse leem o `jd`
  do Director.
- **Escada sistema → órbita → corpo → lua** (`?ver=`, Esc sobe).
  `PARENT_FRAMING_BIAS` tem consumidor. Abertura na época viva.
- **Não repetir:** piso de ambiente; Hapke inventado; mosaico sem
  licença; advecção que cisalha a Mancha sem perfil citado; log-depth
  sem o dono; raio do bloco "valores antigos" do pck; anel que herda
  W(t); domínio MH18 = α visto da Terra; conta de VRAM como se a
  textura fosse quadrada.
- **Observabilidade é produto.** Honestidade é não mentir sobre o que
  o visitante vê — o ganho da lua de sangue fica (sem ele o disco é
  preto). Em `?luz=real` ele também fica: nota, não defeito.

### Onda 5 — FEITA (2026-08-12)

O modo **Atlas** existe: mesmo Director, mesma cena, outro escritor de câmera e
outro HUD. O registro integral está no **Estado da Onda 5 do PLANO-ATLAS §4**
(entregas por fase, as sete decisões de abertura transcritas, os conflitos com o
desenho e a ata dos dois painéis); aqui fica o que **governa o futuro**:

- **A fase 'atlas' é fase de verdade, e o portal devolve o filme EXATO.**
  Entra-se pelo pause-look (e por `?atlas=1`); "Partir" restaura os cinco de uma
  vez — `journeyT`, `lookYaw`/`lookPitch`, o latch `leftDisk` e o `paused` (que
  tem dois donos: `freezeJourney` no Director e `paused` no rig). O gate mede
  PIXEL, não só o escalar: md5 do quadro antes de entrar igual ao de depois de
  partir. Quem mexer no portal recontrata esses cinco.
- **Fase nova decide por MAPA, não por cadeia `if`.** `src/three/fases.ts` tem
  os dois mapas `satisfies Record<Phase, …>` (quem escreve a câmera; que peças
  do HUD montam) e o inventário PINADO dos 28 pontos que decidiam por fase, com
  o comportamento de cada um em 'atlas' declarado. **Fase nova = o compilador
  cobra**, em vez de a leitura atenta.
- **O selo de honestidade deriva de REGISTRO ÚNICO com teste de completude**
  (`src/three/selo.ts`, 47 caminhos hoje). A varredura lê os nove arquivos que
  governam a imagem e cobra entrada para cada porta de URL lida por literal e
  para cada camada oferecida: **porta nova na URL é OBRIGADA a se declarar**, e
  quem criar uma porta descobre onde, porque o teste quebra com o endereço na
  mão. Fora da tabela, parâmetro de URL desconhecido já conta como desvio — o
  selo, na dúvida, declara em vez de prometer.
- **Diálogo novo NASCE em `src/lib/dialogFocus.ts` ou não é julgado.** O juiz
  (`scripts/visual/a11y.mjs`) não conhece componente nenhum: ele varre os
  `data-abre-dialogo` que existirem, abre cada um e cobra as quatro promessas
  (foco entra, foco preso, `Esc` fecha, foco volta ao gatilho). Quem escrever
  diálogo fora do módulo não tem como se declarar, e o silêncio passa.
- **Overlay novo é filho DIRETO de `.hud-root`.** A regra do `.bare-mode`
  (`> *:not(.scene-canvas)`) só alcança filhos diretos: qualquer coisa
  portalizada para o `body` apareceria nas 18 vistas oficiais. É a diferença
  entre uma leva verde e um dia de diagnóstico.
- **O relógio do céu é do Director** (`jd` + `rate`, escada log `10^i` de 8
  degraus, AO VIVO, janela 1950–2050 TDB com badge). A **camada de planetas
  continua sem relógio**: ela ganhou um segundo caminho (`escreverInstante`,
  que escreve `position` E `aMagBase`) chamado de fora, e o teste de
  texto-fonte que proíbe `Date` naquele arquivo segue valendo palavra por
  palavra — a regra D8 da Onda 3 sai intacta. Sem chamador, a camada é
  exatamente a da Onda 4.
- **Enquadramento privilegiado: o eixo solar mede da direção ILUMINADA.** O
  doador pagou esse bug com dor e deixou o comentário; a casa quase o repetiu —
  faltava o `negate()`, e com ele invertido os 30° viravam ângulo de fase de
  150° (6,7% do disco aceso) e o grampo dos 70°, que promete 67% de disco,
  garantia no máximo 33%. Achado pelo painel de olhos frescos, consertado em
  `69e1cf5` (`atlasRig.ts:353`). **Junto veio a esfera de abertura do SISTEMA**:
  centrada no Sol e com o raio da órbita mais externa — pendurada no corpo, ela
  não contém o sistema (um corpo do lado oposto da mesma órbita fica a ~71 UA
  do centro dela).
- **Gradação por contexto = ESTADO no Post, neutro EXATO em 1,0 fora do
  Atlas.** O eixo é o **clarão** (o bloom, que o próprio selo classifica como
  "artístico"), com fator `(d / 20.000 UA)²` e piso 0,01; da referência para
  fora devolve `1` em IEEE754, e é isso que mantém as 18 vistas bit a bit.
  Mexer no clarão muda a ÓPTICA e deixa a fotometria onde está; baixar a
  exposição faria o contrário — e é o "teto de brilho" que a Onda 4 proíbe.
- **A/B perto do Sol SÓ com `&nobloom=1`.** Com bloom, `ua150` e `ua40`
  devolvem md5 IGUAIS com céus diferentes: o clarão satura o quadro e o md5
  fica cego. É a lição da F6, e o harness já leva o par próprio.
- **`?ui=` multiplica a preferência de fonte de quem visita** (`font-size:
  calc(100% * var(--ui))` no root, faixa 0,85–1,4) — **nunca px**: cravar px
  apagaria a preferência do navegador, que seria acessibilidade tirando
  acessibilidade. Todo termo `vw` de `font-size` no HUD tem de vir dentro de
  `calc(<termo> * var(--ui))`, e a tranca é uma REGRA sobre o arquivo, não uma
  lista de seletores que envelhece calada.
- **Números medidos novos.** A **abertura do Atlas é 221,55 UA em `ui = 1`**
  (209,39 em 0,85 · 284,05 em 1,4) — moram na docstring de
  `AtlasRig.focarNoSistema`, com trilho no vitest que os DERIVA de
  `enquadrar()`: quando a próxima faixa de HUD entrar, o teste quebra em vez de
  a docstring envelhecer. A **barra de controles quebra abaixo de ~960 px de
  CSS por unidade de `ui`** — é lei de largura × texto, não de `?ui=` sozinho.

### Jurisprudência herdada do atlas (triagem do `tasks/lessons.md`, 2026-08-10)

**Correção de fato na triagem:** o gate da Onda 0 falava em "dez lições"; o
arquivo tem **13** — M1–M6 no topo, L41/L42 soltas e L37–L41 aninhadas DENTRO de
M1, com o id **L41 duplicado no doador** (duas lições distintas com o mesmo
número; aqui L41-a e L41-b). As lições antigas L1–L32 só existem no histórico
git do atlas — cada M-regra declara quais dobrou ("Folds"); ficam registradas
como camada histórica, sem linha própria. Nenhuma lição morreu fora da ata:
**12 viram regra, 1 vira linha histórica.**

| Lição | Veredito | O que fica |
|---|---|---|
| **M1 — a verdade é o runtime ligado, não a prosa** | Regra | Toda afirmação sobre comportamento (docstring, síntese de agente, mensagem de commit, memória) é hipótese até verificada no artefato executado; nada se declara fechado sem percorrer o caminho real do usuário em runtime. Para PORTES: ler fonte E alvo no estado atual, diff literal (nunca paráfrase), `file:line` para toda constante. Cicatriz do doador: f16ca78 declarou "MVP CLOSED" com um early-return vivo; auditoria externa fria achou 3+4 bugs que o verify interno tinha aprovado — **revisor que compartilha o modelo mental do implementador não é revisor**, que é exatamente por que os gates de travessia exigem olhos frescos |
| **M2 — menor mudança; faxina não é opcional** | Regra | Um diff = um sintoma, defendido pela evidência daquele sintoma; colateral é commit separado. Ao trocar estratégia, grep pelos símbolos da antiga e apagar chamadores mortos NO MESMO commit — código morto entregue é dívida não paga |
| **M3 — portam-se pixels, não fórmulas** | Regra | Efeito visual portado se valida contra a SAÍDA da referência (que pixel/alfa ela emite para entradas de amostra), não contra equivalência matemática — as constantes de calibração moram nos wrappers host-side, não no shader. Regra viva de TODA travessia atlas→casa |
| **M4 — higiene de hot path 60 Hz** | Regra (generalizada; os exemplos são do stack do doador) | Código por-frame não aloca, não constrói, não percorre e não escreve estado a menos que uma saída observável tenha mudado (fingerprint antes de escrever; scratch em escopo de módulo, reutilizado) |
| **M5 — um gate só pega desvio dentro do próprio escopo** | Regra | Para cada instrumento, nomear o que ele NÃO vê e cobrir o ponto cego; instrumento novo se valida rodando num estado sabidamente bom E num sabidamente quebrado — leituras iguais = o instrumento é o bug. A casa já pagou a mesma lição sozinha (harness que gritam; md5 igual prova igualdade, diferente não prova nada) — agora é regra dita |
| **M6 — unidades explícitas em toda fronteira** | Regra | Valor numérico não cruza fronteira de módulo sem conversão nomeada e centralizada; para conferir número de terceiro, IMPORTAR o conversor do projeto (re-derivar é onde o bug novo entra); fonte legível por máquina não se transcreve à mão. Cicatriz do doador: viés de ~77 s / ~1,0° em Phobos por `Date.parse` (UT) contra provider em TDB. Vale ouro na Onda 2 (efemérides) |
| **L37 — alegação de render exige smoke de runtime** | Regra | Mudança visual não se declara entregue sem smoke em navegador real exercitando o caminho do usuário; "verificação adiada para o usuário" não é aceitável para alegação visual |
| **L38 — consistência entre documentos é passo próprio** | Regra | Cada fato vive num lugar canônico e os demais linkam; depois de editar um detalhe, grep cross-documento pelas referências antes de declarar pronto (editar a wave não propaga sozinho para o resumo) |
| **L39 — reusar padrão resolvido; helper dormente não conta** | Regra (a metade Gaia-específica fica histórica) | Antes de inventar infra nova para precisão/escala, mapear ao padrão que o motor já tem; e conferir que um helper construído para o problema está LIGADO ao caminho que precisa dele — o atlas entregou o Vector3Q dormente por meses enquanto o Sol falhava em silêncio na escala de parsec |
| **L40 — "conferido com a fonte" exige nome E semântica** | Regra | Portar valor = traçá-lo da declaração até o consumidor real e conferir unidades/dimensões dos dois lados; nunca confiar no nome (o `getSolidAngle()` da fonte devolvia raio angular, não esterradianos — regressão 2× na distância de pouso por 4 commits) |
| **L41-a — a constituição do produto vence a fonte-guia** | **Linha histórica** (precedente da doutrina) | O atlas já tinha aprendido com o Gaia Sky exatamente o que a doutrina de travessia agora aplica ao próprio atlas: fonte externa é referência opcional, não lei de produto; paridade histórica com o doador nunca é gate. Registrada como precedente, não como regra nova — a doutrina (acima) já a contém |
| **L41-b — portar constante ≠ portar experiência** | Regra | Antes de ajustar um número copiado, andar o grafo de chamadas da fonte do evento de entrada à mutação final e espelhar a FORMA do fluxo (loop de controle, estado de momentum, condição de parada); constante vem por último. Cicatriz: 5 commits ajustando um sigmoide (12→60→60+17) sem mudar o "snap" relatado — a reescrita no nível de FLUXO resolveu |
| **L42 — mensagem de commit também é prosa** | Regra | Reabrir item concluído só contra o DIFF (`git log --all -S "<marcador>"` + ~30 s de checagem do código), nunca contra mensagem de commit ou linha de tabela — reabrir errado custa como fechar errado (o doador reabriu por 6 dias um estágio já entregue) |

### Os 6 estudos de `public/Docs/` — sentenciados (gate da Onda 0, 2026-08-10)

Lidos um a um por leitores independentes, com arquivo aberto. Achado comum: **os
seis são relatórios de "deep research" gerados por IA** (notas de rodapé com data
de acesso uniforme; fontes secundárias — Reddit, StackOverflow, YouTube — citadas
para números específicos; uma citação comprovadamente malcasada), não anotações
vividas do doador. Valem como MAPA de técnicas; **nenhum número deles se cita sem
reverificar**. Vereditos: **4 migram, 2 aposentam** — detalhe por documento, fase
consumidora e avisos na matriz do [`PLANO-ATLAS.md`](PLANO-ATLAS.md) (§2.4, §3
item 11). Os 4 aprovados estão copiados um a um (nunca a pasta em bloco), cada
qual com cabeçalho de veredito + avisos, em `docs/reference/atlas-estudo-*.md`;
os anti-padrões de luz/UI em
[`reference/ATLAS-ANTIPADROES.md`](reference/ATLAS-ANTIPADROES.md); o
conhecimento operacional dos scripts em
[`reference/ATLAS-CHECKLIST-PRE-FUSAO.md`](reference/ATLAS-CHECKLIST-PRE-FUSAO.md)
(18 itens, não os 13 esperados) e as licenças em
[`reference/ATLAS-LICENCAS.md`](reference/ATLAS-LICENCAS.md) (o "11" do plano
confere por grep). Aviso que viaja junto com os que migram: seções que recomendam piso de
luz ambiente (anti-padrão §7.1 do plano), SPICE em runtime (contradiz o pipeline
VSOP amostrado da Onda 2) ou catálogo Hipparcos (regressão contra o Gaia DR3 em
produção) NÃO orientam decisão — contrariam decisões já fechadas da casa.

### Sonhos herdados do atlas (garimpo do ROADMAP + sweeps, 2026-08-10)

Garimpados de ~4.300 linhas de sweeps e hunts do doador com um filtro dito:
sonho é o que o VISITANTE sentiria, nunca realizado, que sobrevive à morte do
atlas e que a matriz da fusão ainda não cobre. **Sem onda atribuída — entram
quando o dono quiser.** O material descartado tinha três caras: bugs e infra do
código do doador (morrem com ele), paridade visual com Gaia Sky (excluída por
doutrina) e ~15 ideias que são instâncias da camada de fatos relacionais que a
matriz já cobre (tempo de luz, peso no planeta, zona habitável…) — backlog de um
item decidido, não sonho novo.

- **Pisar num rochoso** *(já na matriz como Reabre, custeado)*: céu e câmera são
  baratos — o céu de Marte é literalmente o céu que o motor já desenha (paralaxe
  nula, PSF, extinção e disco solar certo já pagos); o custo inteiro é o
  TERRENO: elevação MOLA (463 m/px, público) + regolito. Uma onda, não um sprint.
- **Caçador de fenômenos**: perguntar "quando", não só "onde" — a próxima
  conjunção Vênus-Júpiter, a oposição de Marte, a visibilidade de um eclipse — e
  a máquina do tempo leva até lá. A máquina do tempo da matriz é scrub passivo;
  isto é busca ATIVA sobre as efemérides que a Onda 2 já traz.
- **Céu profundo honesto**: nebulosas, aglomerados e galáxias como categoria
  própria de objeto, em tamanho angular REAL — Andrômeda ocupa ~3° do céu, 6× a
  Lua. Expansão de CONTEÚDO (catálogo OpenNGC/Messier), não de render.
- **Vizinhança estelar**: da estrela focada, a lista das vizinhas por distância
  real, saltável uma a uma — ataca de frente a ilusão da cúpula achatada.
- **A Lua conferível hoje à noite**: fase e fração iluminada do instante
  simulado; quando o instante é "agora", o visitante sai de casa e confere no
  céu. É o único objeto com verificação pessoal imediata. *(Confiança moderada:
  pode ser absorvido pela camada de fatos relacionais — o valor único é a ponte
  com o céu real.)*
- **Catálogo explorável por propriedade**: filtrar por excentricidade, ano de
  descoberta, rotação retrógrada — descobrir PADRÕES, não só achar por nome.
  Ensina a investigar: perguntar → filtrar → comparar.

### Dívida declarada: redundância do canal de cor (herança da Onda 0)

O atlas prometia modos colorblind/alto-contraste e nunca os teve (3 campos
órfãos de store — o placeholder morreu na matriz). **A dívida não morre com
ele**: num produto onde a COR é o dado (temperatura, classe espectral, poeira),
acessibilidade não é filtro de UI — é decidir se a informação que a cor carrega
tem um canal redundante (forma, rótulo, brilho). Sem onda atribuída; pesa de
verdade quando a UI do modo Atlas nascer (Onda 5+).

## Ajustes 100% vivos — o menu não recarrega (pesquisa 2026-08-12, roadmap decidido)

**A régua, dita pelo dono: nenhuma opção do painel de Ajustes recarrega a
página — padrão AAA, UX em primeiro lugar.** Desde a Fase A (feita, abaixo) só a
QUALIDADE reinicia de verdade (com retomada via `?t=&play=1`); até ela, três
camadas recarregavam por um motivo que **não existia**: os comentários de
`Ajustes.tsx:9`, `atlasConfig.ts:45–46`
(a tabela CAMADAS, que a Onda 5 mudou de casa) e `director.ts:961` dizem
que `nodisc`/`nogdust`/`noglow` "são lidas no bake", mas `bakeDiscLayers`
roda incondicionalmente (galaxy.ts:941–1011, inclusive o 8º bake do τ na :974) e
as três flags só governam `mesh.visible`/bind de uniform lidos POR QUADRO
(galaxy.ts:1018, :1078, :1086–1088, :1121–1128). Comentário podre já custou
rodada de auditoria uma vez (MARCH_B_RS); aqui custa três reloads.

**Fase A — FEITA em 2026-08-12 (`e7f73da`), fechou 3 dos 4 reloads:**

1. `nodisc`/`noglow`/`nogdust` viram vivas: setter na `Galaxy` (escreve
   `showDisc`/`showGlow`; `nogdust` troca `uTauMap` entre `tauRT.texture` e a
   1×1 zerada — o τRT SEMPRE é assado), roteado pelo `setLayerHidden`, que já
   chama `perturbar()`; `viva: true` na tabela CAMADAS (`atlasConfig.ts:48–61`;
   o ramo de reload é `alternarCamada`, App.tsx:630–641); comentários podres
   corrigidos.
   O espelho de URL é o `replaceState` das vivas de hoje; o boot continua lendo
   as mesmas flags — captura headless enxerga o mesmo nos dois sentidos.
   (`?forgetau=1` segue decisão de boot: é debug de dosagem, não opção.)
2. O latch da exposição fecha o furo URL↔tela — e a Onda 5 já construiu a
   metade que faltava: `limparExposicaoManual()` existe (director.ts:1594,
   nascido para a linha BRILHO do selo), mas só o selo o chama (App.tsx:593).
   O slider segue armando o latch mesmo ao voltar a 1,02 (`trocarExposicao`,
   App.tsx:553–561, remove `?exp=` mas chama `setExposure`) — a tela fica em
   1,02 fixo e a MESMA URL recarregada roda a auto-exposição
   1,02+0,03·galaxyFade (1,05 na vista externa, director.ts:1895). Faltava uma
   linha, e é a que a Fase A escreveu: o valor default chama o caminho de
   volta em vez de `setExposure`.
3. Escolha manual de qualidade grava `?q=` SEMPRE, inclusive cinema:
   `changeQuality` apaga o parâmetro (App.tsx:501) e o boot seguinte cai para o
   storage — um `tierQueRodou` medido `alta` sobrepõe o clique em Cinema.
   Tom/exp podem omitir o default porque o default deles é CONSTANTE; o de
   qualidade não é (storage/detecção decidem) — URL sem `?q=` não diz o que a
   tela mostra.

*Gate A:* as 12 camadas do painel trocam sem reload; ab-identidade bit-idêntico
com a mesma flag nos dois caminhos (boot por URL e troca viva); `captura.pronto`
recomeça a contagem em toda troca (o `perturbar()` já garante).

*Gate A — CUMPRIDO, com os números (2026-08-12, nesta GPU):*

- **As 12 trocam sem reload**, provado por CDP no bloco 11 do `atlas-smoke`
  (que julgava a RECARGA e agora julga o contrário), com quatro provas por
  camada dentro do MESMO documento: marca posta na `window` intacta depois
  dos 24 cliques, `captura.quadros` **10→0** lido na MESMA avaliação do
  clique (sem corrida com o rAF), URL espelhada por `replaceState` e o selo
  declarando a camada. De dentro do Atlas, com `?jd=`/`?foco=` no ar: modo,
  instante e alvo intactos. O juiz foi de **42 para 68 asserções**.
- **Troca viva ≡ boot, bit a bit, nos DOIS aparelhos de medida.** Na sessão
  do juiz (1200×900, `t=293`): `nodisc` 34a23c1ba49a · `nogdust` b11f15c37707
  · `noglow` 83b7a796fc81, iguais pelos dois caminhos e **diferentes** da
  vista limpa (906c28fc49e7) — sem esse terceiro veredito o teste passaria
  comparando duas imagens que ninguém mudou. E contra o harness oficial, na
  janela da leva (`faceon`, 1800×1713, `EXTRA='&nodisc=1'` etc., processos
  DIFERENTES): **2f1f63810873 · 7d15f390f7fb · d9ce84c8dd07** reproduzidos
  pela troca viva, com o `limpo` batendo o md5 oficial `d05591e27ea4`.
- **A leva das 18 saiu BIT-IDÊNTICA** aos md5 oficiais (18/18 `IGUAL`, todas
  por `via=sinal`, 2,9 min com `JOBS=3`) — a prova de que mexer na
  visibilidade da galáxia não moveu o padrão um pixel.
- **Exposição:** a vista externa nasce em **1,0500** (a rampa
  1,02+0,03·galaxyFade); o slider em 1,40 põe a tela em 1,4000 com o latch
  ligado e `?exp=1.4` na URL; **de volta ao 1,02 a AUTO-exposição volta
  (1,0500), o latch desliga e a URL perde o `?exp=`** — e a mesma URL
  recarregada reproduz a tela **pixel a pixel** (3309a4e9ac20).
- **`?q=` sempre:** clicar em Cinema no painel com `?q=alta` no ar recarrega
  em `?q=cinema` e o tier vivo é `cinema`.
- **1.139 verdes** (`npm test`, +1: a tabela CAMADAS agora cobra as doze
  vivas), `npm run typecheck` e `npx eslint .` limpos, e os quatro juízes de
  navegador verdes (`a11y`, `atlas-smoke`, `voo-smoke`, `busca-smoke`).

*O que a Fase A NÃO alcança, medido e dito:* `?forgetau=1` entrega o mesmo τ⊥
às forjas num bind feito UMA vez no `init` (`director.ts`), então trocar
`nogdust` ao vivo com ela ligada deixa as forjas com o mapa do carregamento. A
porta segue sendo decisão de boot (varredura de dosagem), e o limite está
escrito no setter da `Galaxy`.

**Fase B — os instrumentos, que já estão no roadmap (pré-requisitos da C):**

1. **Worker da cadeia de carga** — item (2) da fila de 2026-08-05: 3,27 s de
   `buildGalaxy` + 1,6 s de bakes, CPU pura e determinística; bloqueios já
   mapeados (galaxy.ts:132/:679 leem `location.search` sem guarda; knobs por
   mensagem).
2. **Amostrador de memória** — entrega da Onda 6, cujo gate já cobra
   "`renderer.info.memory` estável em troca de qualidade". É o instrumento do
   risco §6 do PLANO-ATLAS ("alocação irreversível pelo tier" — tese nunca
   medida).
3. **Medir o hitch do upload**: os ~123 MiB do buffer cinema sobem num
   `bufferData` só (a cópia de CPU é solta no upload — galaxy.ts:712–721). Se
   custar mais de ~1 quadro, o buffer vira N fatias de `Points` enviadas uma
   por quadro (o pool já não é frustum-culled; N draws a mais é ruído).

**Fase C — troca de tier viva, double-buffer com swap atômico (depois da B):**

- **Metade viva no clique** (percepção imediata): `applyQuality` já troca
  pixelRatio, passos do raymarch, grão e tier do BH ao vivo — é o caminho que o
  auto-quality usa DURANTE o filme (engine.ts:276–286). A decisão de
  App.tsx:485–497 proibiu parar aí ("performance pela METADE"); a fase C
  entrega a outra metade em segundo plano, sem véu e sem pausar o filme.
- **Galáxia**: rebuild no Worker à densidade alvo → upload (inteiro ou fatiado,
  conforme B3) → swap atômico no mesmo quadro (add/remove/dispose) →
  `perturbar()`. VRAM transitória ~2× durante o swap — o amostrador julga; se a
  alocação falhar, mantém o tier e diz.
- **Sol**: segunda instância de `StellarBody` no tier alvo (FBM/SEG/SIM_W/H/
  PROM são defines de compilação — stellarBody.ts:286–292), compilada com
  `compileAsync` (o padrão do warmup, director.ts:694–700) e assentada
  offscreen pela máquina de fatias que JÁ existe (bakeStep/8 fatias +
  `assentado`); swap quando `assentado` — e IMEDIATO quando `sun.group` está
  invisível, que é a maior parte do filme.
- **Contrato de URL/captura**: `?q=` por `replaceState` no ato; um termo
  "troca em voo" entra no getter `captura` (ao lado de `sun.assentado`) para o
  harness esperar o swap fechar; storage/autoQuality como hoje (manual desliga).
- **Opcional, só se o gate de grão aprovar**: downgrade instantâneo por prefixo
  — o mesmo invariante que o PLANO-ATLAS §2 guarda para tiers do `sc1` ("mesmo
  índice em todos os tiers"). Exige disco embaralhado pós-geração (ordem não
  importa ao render) + ganho global 1/f — o alfa por partícula já é
  `0,094/populationScale` (galaxy.ts:440), fluxo total conservado por
  construção. Ressalva estatística dita: thinning de um build cinema NÃO é um
  build performance nativo (as N_SEED sementes são as primeiras partículas e o
  resto aglutina em volta — galaxy.ts:263–268; ralear satélites ≠ gerar menos
  aglomerados). Só entra se miolo/borda medirem na banda (0,0667/0,1278). Se
  entrar, downgrade custa 0 ms e o Worker só serve upgrade.

*Gate C:* cinema↔performance em plena viagem sem véu, sem reload, sem perda de
instante; `renderer.info.memory` volta ao patamar do tier alvo depois do
dispose (o amostrador é o juiz — é a medição que o risco §6 espera); captura do
link pós-troca bit-idêntica ao boot direto com o mesmo `?q=`.

**Fase D — o automatismo de qualidade vira OPÇÃO (decisão do dono, 2026-08-12):**

**O dono nunca pediu auto-detect de preset.** Hoje há QUATRO automatismos
silenciosos: a detecção por toque/tela decide o tier inicial (engine.ts:57–64);
o storage responde pelo aparelho na visita seguinte (engine.ts:173); o monitor
de fps troca tier sozinho sempre que não há `?q=` (engine.ts:263–295); e a
escolha manual de Cinema, por apagar o parâmetro, RELIGA o monitor sem o
visitante pedir (App.tsx:501 + engine.ts:223–226) — **este quarto a Fase A
fechou** (o `?q=` passou a ser sempre escrito), sobram TRÊS. Do atlas fica só a semente —
automatismo é ESCOLHA do visitante, não comportamento de fábrica; o mecanismo
dele (score aditivo por sniffing + 15 overrides) segue aposentado pela linha da
matriz do PLANO-ATLAS §2: score é palpite, e a casa tem o sinal MEDIDO com
histerese e cooldown que o atlas admitia não ter. O desenho:

1. **Auto é o 4º estado do seletor** (HUD e painel), nomeado: cinema/alta/
   performance = PINADO, nenhum automatismo mexe; **Auto** = o modo adaptativo
   com o sinal medido de sempre. `?q=auto` vira valor válido — o link copiado
   carrega o modo; `?q=<tier>` segue soberano e pinado. Sem `?q=`: vale a
   escolha persistida do visitante; sem escolha nenhuma, **default de produto
   = cinema** — a identidade cinematográfica, nunca decisão por sniffing.
2. **Doutrina de storage preservada com um campo novo**: `qualidadeEscolhida`
   entra no envelope ao lado de `wikipediaLigada` (o precedente do opt-in
   persistido já existe, Onda 8). `tierQueRodou` continua sendo ALOCAÇÃO
   MEDIDA — consumida SÓ pelo Auto, como ponto de partida da visita seguinte.
   Isto REVISA a precedência da Onda 1f (URL > storage > detecção) para
   **URL > escolha do visitante > default de produto**, com medição e detecção
   agindo apenas DENTRO do Auto — quando a D virar código, o registro da
   Onda 1f atualiza junto.
3. **Detecção nunca decide; medição sugere; o visitante escolhe; o Auto age.**
   Fora do Auto o monitor continua MEDINDO (um acumulador — custo nada) mas
   nunca troca: se o veredito diz que o tier pinado não roda, UMA sugestão
   discreta e não-bloqueante por sessão ("está pesando — Performance? ligar o
   Auto?"). No PRIMEIRO boot touch a mesma sugestão pode aparecer já no véu de
   carregamento ("este aparelho sugere Performance — trocar?"), porque a
   alocação acontece no init e sugerir depois é tarde enquanto a Fase C não
   existir; um flag irmão de `conviteVisto` garante que é uma vez só.
4. **O teto de GL fica**: renderer que se NOMEIA software não é gosto nem
   palpite — cinema em SwiftShader é inviável, e o gate da Onda 1 já o cobre.
   Em Auto, o seletor mostra o tier em que está rodando ("Auto · alta") — o
   precedente do painel que mentia o tier é da Onda 1. Nada além disso:
   configuração gráfica não tem relação com o selo de honestidade da Onda 5,
   que é sobre CONTEÚDO (escala, luz), não sobre preferência de display.

*Gate D:* com tier pinado, NENHUMA troca acontece sem clique (teste sob fps
forçado baixo, por sobrevivência de valor); a sugestão aparece no máximo uma
vez por sessão e recusa é respeitada; `?q=auto` e os três pinados reproduzem
bit-idêntico o estado equivalente de hoje; captura headless sem `?q=` nasce
cinema em qualquer aparelho — o harness deixa de depender de sniffing.

**Fora do escopo, dito:** `?cart=off/obs` segue decisão de boot — o modo é
congelado no bake das lâminas (galaxy.ts:915) e não é opção do painel; é
ferramenta de A/B.

Sequência: A pode já; B1/B2 já têm dono (fila de 2026-08-05 / Onda 6); C só
depois da B — troca viva de tier sem o amostrador seria fé, exatamente o que o
risco §6 proíbe. D é independente de B/C (a sugestão aceita usa o
reload-com-retomada de hoje) e fica melhor depois da C, quando aceitar a
sugestão vira troca viva; D também absorve o item 3 da Fase A (`?q=` explícito
é o caso "pinado" da semântica nova).

## Decisões fechadas

Não reabrir sem que a condição listada mude.

| Decisão | Por quê | Reabre se |
|---|---|---|
| **O Atlas vive aqui; o código do atlas é especificação, não fornecedor** | Testemunho do dono sobre a qualidade do doador + crítica de olhos frescos que o confirmou arquivo a arquivo (PLANO-ATLAS §7: nove anti-padrões de luz com `arquivo:linha`) | Uma linha específica da matriz, com arquivo aberto e medição na mão — nunca por atacado |
| **Mais que um SpaceEngine: escala 1:1 onde possível, visibilidade por FOTOMETRIA, artifício só no canal do instrumento (separável e desligável)** | Decisão do dono na abertura da Onda 4 (2026-08-11, palavras dele: "quero ser um SpaceEngine… temos que ser honestos nessas escalas" e "quero ser MAIS que o SpaceEngine" — a honestidade dele + a galáxia procedural científica volumétrica que só a casa tem). A Onda 4 provou a via: domínio profundo 1:1 sem custar um pixel do filme. O Sol-ator de 0,011 pc segue DENTRO do filme como exceção declarada de modo | Decisão do dono, nunca por conveniência técnica; escalar artístico novo só com rótulo explícito de modo esquemático (o selo da Onda 5 é o canal) |
| **Octree: não** | Serve para podar conjunto fixo e grande. Aqui o VBO é estático e a árvore podaria ~3,7% dos vértices ao custo de ~193 draw calls | Conjunto estático > 2 M pontos **e** `WEBGL_multi_draw` plumbado |
| **Floating origin: feito por reconstrução relativa à câmera (rodada 13), não por rebase global** | A 25 kpc o quantum f32 é 1,5·10⁻³ pc ≈ 1,7 px de tremor a 1 pc. As cascas — a única geometria resolvida perto da câmera longe do Sol — reconstroem posição por célula inteira + fração e projetam com só a rotação do MV: nenhum operando de kpc no caminho. Rebase global do grafo não é necessário | Outra camada passar a resolver geometria perto da câmera longe do Sol |
| **Log-depth: não** | A cena tem um único objeto opaco com `depthWrite`; z-fighting precisa de dois | Entrar geometria resolvida (planetas, malhas) |
| **LUT de cor (Mamajek / CIE 401): não** | O ajuste de 3 mads em `common.ts` tem RMS 0,009; o erro real afeta ~51 das 18.543 estrelas | Precisão exigida abaixo de 2500 K ou acima de 40 kK |
| **Saturação/lift no pós para "consertar" cor: não** | É maquiagem. A cor tem de emergir da física; croma se recupera por **exposição**, não por saturação | — |
| **Reduzir vértices para ganhar QUADRO em cinema/alta: ⚠ REABERTA (2026-08-07)** | A prova era "`?nogal=1` move a mediana em 0,1 ms", e essa mediana era o vsync — não media nada. Medido na GPU, a nuvem de pontos custa **4,77 ms, 31% do quadro**, e `?nogal=1` tira 5,33 ms do total (inclui a cartografia junto). A condição de reabertura ("medição própria") está cumprida. **Isto NÃO autoriza podar pontos**: contagem é IMAGEM (a rodada 28 subiu 1,5× por imagem, e o `populationScale` 0,28 do `performance` existe por MEMÓRIA, não por quadro) — o que caiu foi só o argumento de que sair custa zero | — (já reaberta; entra na fila como troca imagem×quadro, com dose medida) |

## Medições que sustentam o acima

Método: **`scripts/visual/gpu-profile.mjs`** — CDP, embrulha `getContext` e mede cada
draw com `EXT_disjoint_timer_query_webgl2`, rotulando pelo programa ligado (em pós, um
programa é exatamente um passe). Repetir com **≥600 quadros** e conferindo
`calls/quadro`: janela curta dá "mediana" que é só pico de arranque, e
`calls/quadro ≈ 0` significa que o app parou de renderizar e a linha não mede nada.
Mede DRAWS — `clear`, blit e upload ficam de fora.

- **⚠ "Não há gargalo" está REFUTADO: a mediana de 17,4 ms era o VSYNC, não o
  trabalho.** Sob vsync o rAF devolve 16,7 ms para qualquer quadro que CAIBA no
  orçamento, então ablação medida por relógio de apresentação não mede nada enquanto o
  app não estiver quebrado — e foi assim que se concluiu "há folga" de um quadro que usa
  96% da GPU. Medido na GPU (2026-08-07, 1904×985, `?t=100`, `cinema`): **15,6–16,0 dos
  16,7 ms**. Em dPR 2 (buffer 3808×1970) o total vai a 16,9 ms e o app **cai para
  56,3 fps**. A escala absoluta se valida sozinha: o total cruza 16,67 ms exatamente
  onde os quadros começam a cair, e o instrumento não é o dono da queda — com e sem ele,
  676 contra 675 quadros em 12 s.
- **Dois donos levam 88% do quadro:** raymarch da nebulosa **9,07 ms (58%)** e a nuvem
  de pontos da galáxia **4,77 ms (31%)**. Todo o resto somado é 1,7 ms.
- **Anatomia do raymarch (2026-08-07, `?t=100`, 9,12 ms) — abrir por sonda, uma de cada
  vez, revertendo entre elas.** Duas réguas de conversão, ambas retas medidas:
  **0,16 ms por passo** (varredura 56/48/40/32/24/16, custo fixo de só **0,18 ms** — não
  há overhead estrutural a atacar, 98% é trabalho por amostra) e **0,72 ms por oitava de
  `fbm`** (cap em 3/2/1 oitava: 8,15/6,80/4,73 ms; ajuste linear dá 2,53 ms de custo
  não-ruído). Daí:
  | peça | ms | fatia | como foi isolada |
  |---|---:|---:|---|
  | ruído (todas as oitavas) | ~6,5 | 71% | ajuste da varredura de oitavas |
  | **teste das 32 sementes, por amostra** | **1,20** | **13%** | corpo trivial com efeito colateral |
  | corpo das sementes que passam | 1,13 | 12% | laço inteiro morto (6,79 ms) |
  | sombreamento (cor, hero, luzes) | 0,40 | 4% | `acc += T*vec3(0.5)*alpha` (morte por DCE) |
  **Armadilha de sonda medida na pele:** matar o corpo do laço com `if (d2c < 0.0)` faz o
  compilador apagar o laço INTEIRO por DCE e a sonda mede a mesma coisa que apagá-lo à
  mão (6,784 contra 6,790). Para manter o teste vivo é preciso um efeito colateral
  (`if (d2c < 5.5) { d += 1e-24; }`).
- **A galáxia é ponto-bound, não fill-bound.** `uScreenH` vem do drawing buffer
  (`domElement.height`), então em dPR 2 cada ponto dobra de lado e a área rasterizada é
  4× — e o custo vai de 6,04 para 6,40 ms, **+6%**. O eixo é CONTAGEM, não pixel; é por
  isso que o `populationScale` 0,28 do `performance` derruba 5,00 → 1,41 ms.
- **Cadeia de pós precificada — 0,29–0,34 ms, 1,9–4,3% do tempo de GPU a dPR 1**
  (0,55 ms em `alta`/dPR 2, 0,80–0,95 em `cinema`/dPR 2). Repartição a dPR 1: bloom
  inteiro (prefiltro + 10 blurs + composite + blend) 0,23 · output ACES+sRGB 0,06 ·
  film 0,04 · knee 0,04, e o knee só existe na vista externa. É a única camada
  always-on que escala com resolução, mas **sub-quadraticamente: 4× pixels dão 3,25×**.
  Conferido por ablação — `?nobloom=1` tira 0,386 ms do total contra 0,510 atribuídos
  aos quatro passes, dentro dos ±0,13 de ruído dos programas de cena. **Não há rodada de
  performance a ganhar aqui**, e os itens da fila que esperavam este número podem ser
  julgados: qualquer conta que trate o pós como camada cara está errada por uma ordem
  de grandeza.
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
- **Raymarch = 6,88 ms dentro do disco e 9,07 ms na travessia** (`?t=100`, `cinema`) —
  o maior item do quadro. **A alavanca é PASSOS, não `pixelRatio`:** o RT é dimensionado
  em px CSS × `setScale`, então 4× pixels de tela movem 6,88 → 6,97 ms. A leitura antiga
  atribuía a `pixelRatio` o que era, junto e sem separar, o `setScale` 0,5→0,35 mais os
  56→30 passos do preset `performance`. `nebulaSteps` 56→44 vale **1,90 ms**; o preset
  `performance` inteiro leva o raymarch a 2,63 ms. Ablação: `?nonebula=1` em `?t=100`
  tira 8,84 ms do total (15,52 → 6,68), contra 9,15 atribuídos.
- **O degrau `alta` NÃO é no-op: vale 13,7% do tempo de GPU** mesmo a dPR 1 (16,00 →
  13,81 ms em `?t=100`) — e é INTEIRO da nebulosa (9,05 → 7,15). `pixelRatio` contribui
  exatamente zero ali, como o item 8 da auditoria previa; o que o item errou foi o
  tamanho (estimou "~5%") e o alvo: **o decorativo é o `pixelRatio` do preset, não o
  degrau**. Em dPR 2 o degrau vale 15,3% e é a diferença entre 56,3 e 60,0 fps.
  `performance` vale −65% (5,66 ms).
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
  geometricamente incapaz de púrpura. É o que a unificação 1→3 substitui. **A rodada 40
  NÃO fecha isto** — ela só trocou o extremo FRIO (um corpo negro de 25.000 K, mais quente
  que uma estrela O) pelos 6.000 K de um disco Sbc real, com luminância e púrpura
  conservados. O `mix` por raio segue lá, e o púrpura segue baixo.
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
