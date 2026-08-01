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
   t=170 fica no vsync com as mesmas 16; candidata a devolver o p90: `textureLod`
   mip 2–3 nas amostras do caminho, conferindo antes se o uTauMap tem mips).
   **(b) a vantagem de t=158 era cega ao que o gate mede** — azimute da visada 90° ≈
   linha de nós do warp (fase 5°): o S projetado cancelava na integral da visada
   (fator 0,087); e elevação 901 pc diluía faixa e espessura. Keyframe novo: visada
   pelos nós (az 185°, recuo radial reto desde t=146) e z=500 pc, varrido — abaixo de
   ~400 pc entra o regime DENTRO-da-lâmina (o plano inteiro se extingue, a faixa morre
   no branco; em z=100 o warp aparece pleno, warpAsym +0,48 = alvo, provando que faixa
   e S são acoplados: o S só emerge quando a faixa corta a luz reta do plano).
   Estado: laneDepth 0,29 → **0,66** (alvo 0,94), warpAmp 0,004 → 0,010, laneOffset
   0,56, axialRatio 0,036. O face-on MELHOROU junto: 0,0800 → **0,0601, recorde** — a
   extinção limpa ajudou de cima também.
   **O que falta da faixa, com mecanismo:** o plano ficou vermelho demais (colourZ
   baixo 0,34 vs alvo 0,19) — o ingrediente ausente é a luz AZUL na frente da poeira
   (rim do lado de cá), que na referência mantém a faixa escura porém neutra. E a
   janela do warp (0,7–1,1·R90) cai abaixo do início do warp (8,4 kpc): nosso R90
   edge-on é ~7,3 kpc = 0,43·R_disco vs ~0,55 na referência — perfil radial de brilho
   concentrado demais, que é trabalho da **unificação 1** (exposição/tonemap, faixa
   dinâmica 2,3 mag vs 8,6).
2. **Vista interna sem gate** — o panorama ESO (a única foto real) não está no loop.
3. **Tonemap da referência** — comparamos nossa imagem pós-ACES com a recriação
   pós-escolhas-do-artista; irrelevante para harmônicas (razões normalizadas), camada de
   incerteza para cor absoluta.

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
t=162, 1,75× em t=150, 1,00× de topo. Falta de (c): a substituição dos 430 k sprites pelo
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
concluído. A fila agora é: a faixa edge-on (rim light azul do lado de cá da poeira;
fenda do glow seguindo o warp) e as etapas restantes da unificação 2 (star forges e
partículas sob a lei única).

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
