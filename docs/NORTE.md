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

O árbitro visual não é captura do próprio app: são as fotos reais em
[`reference/`](reference/), com alvos numéricos em
[`reference/VISUAL_TARGETS.md`](reference/VISUAL_TARGETS.md). Toda mudança de imagem
passa por `scripts/visual/measure-similarity.html` contra elas.

## As três unificações

A visão não se decompõe em features, e sim em três coisas que hoje existem em
duplicata. O trabalho é fundir cada uma:

**1. Uma cadeia fotométrica.** Magnitude → fluxo → pixel, uma vez só, compartilhada
por todas as camadas. *Parcial:* o campo HYG já recalcula `m` da câmera e desenha PSF
de largura fixa em px. *Falta:* exposição compartilhada entre camadas, e o tonemap —
medido travando a faixa dinâmica em 2,3 mag contra os 8,6 do catálogo, hoje o teto real
do campo estelar.

**2. Uma lei de população estelar.** Hoje "estrela" tem quatro representações com
regras diferentes: HYG, star forges, wrapped stars e as 2,7 M partículas da galáxia.
*Alvo:* cascas de wrap por bin de magnitude absoluta (lado = 2× o alcance de
visibilidade do bin ⇒ sem popping por construção), identidade por hash das coordenadas
inteiras da célula, densidade decidindo **existência** e não alpha, anti-dupla-contagem
por magnitude aparente vista do Sol. Exige floating origin junto (ver Decisões).

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
Falta de (c): o `1/|μ|`, que é o que permitiria não apagar o disco de raspão, e a
substituição dos 430 k sprites pelo quad único. Falta (a) inteiro: a calibração offline
que dá significado absoluto a κ — hoje o 2,39 é escala honesta sobre resposta normalizada,
não profundidade óptica medida.

## Decisões fechadas

Não reabrir sem que a condição listada mude.

| Decisão | Por quê | Reabre se |
|---|---|---|
| **Octree: não** | Serve para podar conjunto fixo e grande. Aqui o VBO é estático e a árvore podaria ~3,7% dos vértices ao custo de ~193 draw calls | Conjunto estático > 2 M pontos **e** `WEBGL_multi_draw` plumbado |
| **Floating origin: sim, junto da unificação 2** | A 25 kpc da origem o quantum f32 é 1,5·10⁻³ pc; com estrelas a 1 pc da câmera isso é ~1,7 px de tremor por frame. Hoje não aparece porque nada resolvido fica perto da câmera longe do Sol — a unificação 2 destrói essa premissa | — |
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
- **O defeito real é um hitch de ~250 ms no p99**, que `?nocart=1` mata (p99 18,3) e
  `?nodisc=1` não (p99 268) ⇒ caminho cartografia/`observedClouds`. Próximo passo:
  separar `?nocart` em `?noco` e `?noforge` e bissecar **antes** de escrever correção.
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
- **Espirais:** `harmonicError` 0,125 (era 0,165). m=3 e m=5 seguem ~50% acima do alvo.

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
