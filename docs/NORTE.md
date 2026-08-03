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
   Deficiências honestas que sobram, em ordem: **(1) rift 0,036 vs 0,244**
   — o stretch expõe que o vale do Great Rift tem piso luminoso demais
   (falta profundidade óptica real nas fendas internas — o análogo interno
   do τ0 da fenda edge); **(2) colour −0,065 vs 0,064** — a revelação
   per-RGB dessatura além do alvo (β=0,1 dá +0,071 quase exato; o par
   dose↔cor precisa de uma rodada própria, e chromsat interno é candidato);
   **(3) purp 0,062 vs 0,078** — independe do tom: população (H II /
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
base 0,42 × (1 ± 1,0)) e **gás/H II/jovens uniformes em 4** (Drimmel) — `uniformWeights`
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
  flagrado (w 0,83 e 0,70 em duas vigílias de ~15 s), CME completa
  fotografada (casca de 3 partes + ejecta por transform feedback,
  cinemática 0→3,3 R em ~8 s), cvolReady e bake ciclando.
- **Tier congelado no init** (cinema→high, alta→mid, performance→low), mesmo
  precedente do populationScale; mudar qualidade ao vivo não reconstrói o Sol.
- **Gates provados intocados nas DUAS fases**: edge 0,4396 com todos os
  termos idênticos; face BIT-IDÊNTICO (md5 igual à captura pré-transplante,
  3 medições em 3 estados do código). O céu usa `?nosun=1` por protocolo.
  Perf headless t=1 (fase 2): p50 16,7 segura; cauda p99 66 ms a re-medir
  em janela real (candidatos: fatia de bake, RK4 dos loops, cvol).
- **Réguas do doador que valem manter**: A/B mesma-cena (edição on/off no
  mesmo seed) — "ganhos" cruzando seeds diferentes são variância; ruído
  sempre em espaço de OBJETO (padrão gira com a esfera); macro-evolução
  desacelerada (MACRO_SLOW 0,15) sem tocar a vida fina.

## Decisões fechadas

Não reabrir sem que a condição listada mude.

| Decisão | Por quê | Reabre se |
|---|---|---|
| **Octree: não** | Serve para podar conjunto fixo e grande. Aqui o VBO é estático e a árvore podaria ~3,7% dos vértices ao custo de ~193 draw calls | Conjunto estático > 2 M pontos **e** `WEBGL_multi_draw` plumbado |
| **Floating origin: feito por reconstrução relativa à câmera (rodada 13), não por rebase global** | A 25 kpc o quantum f32 é 1,5·10⁻³ pc ≈ 1,7 px de tremor a 1 pc. As cascas — a única geometria resolvida perto da câmera longe do Sol — reconstroem posição por célula inteira + fração e projetam com só a rotação do MV: nenhum operando de kpc no caminho. Rebase global do grafo não é necessário | Outra camada passar a resolver geometria perto da câmera longe do Sol |
| **Log-depth: não** | A cena tem um único objeto opaco com `depthWrite`; z-fighting precisa de dois | Entrar geometria resolvida (planetas, malhas) |
| **LUT de cor (Mamajek / CIE 401): não** | O ajuste de 3 mads em `common.ts` tem RMS 0,009; o erro real afeta ~51 das 18.543 estrelas | Precisão exigida abaixo de 2500 K ou acima de 40 kK |
| **Saturação/lift no pós para "consertar" cor: não** | É maquiagem. A cor tem de emergir da física; croma se recupera por **exposição**, não por saturação | — |
| **Reduzir contagem de vértices por performance: não** | Medido: `?nogal=1` tira 320 k vértices e move a mediana em 0,1 ms | Alvo passar a ser GPU de baixo tier, com medição própria |

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
