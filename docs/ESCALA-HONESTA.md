# Escala honesta — o bastão da onda do Sol real

**Aberto em 2026-08-12, na branch `sol-real`, a partir de `af90809` (Onda 6 pausada).**
Este arquivo é o bastão desta onda: o que foi medido, o que já está pronto, o que
falta e o que continua inventado depois de tudo. Ele morre no fecho da onda —
o que virar código sai daqui, o que ainda decidir alguma coisa vai para o `NORTE.md`.

Fonte do trabalho: duas rodadas de pesquisa com subagentes (25 agentes, achados de
código conferidos por adversários), disparadas por feedback do dono em 2026-08-12.
Os relatórios foram consumidos; o que sobreviveu está aqui, com arquivo e linha.

---

## 0. A regra que faltava

O dono declarou, com todas as letras, o que o produto é:

> "Minha intenção nunca foi a de ter um app pro filme e um app pro Atlas. Eu queria
> que tudo fosse o único universo e que fosse realista, e que fosse possível fazer o
> filme dentro dessa galáxia, visualizando o sol, e seguindo aquele caminho que o
> filme fez."

E apontou o defeito: o Sol da cena tem **487.441×** o tamanho real. A justificativa
escrita é uma frase — `// Sol artístico (escala real seria invisível: 2.3e-8 pc)`
(`src/three/config.ts:8`).

**A frase está errada, e é dela que nasce a regra desta onda.** O Sol real visto de
12.800 UA tem magnitude aparente **−6,2**: ~20× Vênus no melhor dia dela, ~5
magnitudes acima de Sirius. É o objeto mais brilhante daquele céu. O que ele não é,
ali, é um **disco**. Estrela longe não é invisível — é um **ponto**.

**A regra, e ela é testável por máquina:**

> **Quem tapa o que está atrás (escreve profundidade) tem raio físico real.
> Quem só brilha por cima pode ter tamanho de instrumento — e se declara.**

A fronteira separa de verdade, conferido: a fotosfera é material opaco
(`src/three/world/sol/sun.js:856-861`, sem `transparent`); o clarão
(`src/three/world/heroStars.ts:229-231`), a coroa e as raias já não escrevem
profundidade. A régua não é nova nem arbitrária — é a diferença entre **corpo** e
**borrão do instrumento**, que é o que todo motor sério do gênero faz (SpaceEngine,
Celestia, Stellarium: raio físico sempre, e a troca ponto↔disco decidida por
**ângulo**, nunca por raio inflado).

---

## 1. O cadastro de escalas — tudo que é inventado, medido

| Objeto | Na cena | Real | Fator | Endereço | Veredito |
|---|---|---|---|---|---|
| Sol (fotosfera, opaca) | 0,011 pc | 2,2567e-8 pc | **487.441×** | `src/three/config.ts:9` | **CORRIGIR** — escreve profundidade |
| Sgr A✱ (raio de Schwarzschild) | 0,05 pc | 3,97e-7 pc | **125.884×** | `src/three/world/blackHole.ts:27` | **CORRIGIR** — declarado no próprio cabeçalho (`:13-19`) |
| Clarão das estrelas | `0,08 × luminosidade` pc; Sirius → 0,2194 pc | 8,2e-9 pc | ~5,7e6× | `src/three/world/heroStars.ts:139` | **DECLARAR** — é borrão de instrumento, não escreve profundidade |
| Nuvens observadas (CO) | ×2,1 sobre o raio de catálogo | — | 2,1× | `src/three/world/observedClouds.ts:20` | **DECLARAR** — "escala artística fixa", já escrito |
| Complexos grandes | ×1,2 | — | 1,2× | `src/three/world/observedClouds.ts:21` | **DECLARAR** |
| Núcleos de nebulosa (7) | raio de autor, 9 a 26 pc | — | — | `src/three/config.ts:31-38` | **DECLARAR** — posição é observada, raio é escolha |
| 8 dos 10 planetas | sprite fotométrico | malha | — | `src/three/world/planetas/planetas.ts` | **PENDENTE** — F3–F7 da Onda 6 |

**A lição que o cadastro compra:** o defeito nunca foi "alguém errou um número". Foi
**a ausência de um lugar onde a mentira tivesse de se declarar**. Sem cadastro, uma
escala artística nasce num arquivo, vira âncora de outras cinco decisões e some da
vista. Foi exatamente o que aconteceu com o Sol.

---

## 2. O que JÁ está certo (não recomeçar do zero)

Tudo abaixo foi aberto e conferido.

1. **As duas pontas honestas do Sol já existem.**
   De longe é estrela com magnitude viva — `m = 4,83 + 5·log10(d/10)`
   (`src/three/world/heroStars.ts:239-240`), nascida de feedback anterior do dono
   ("vista afastada irreal", `docs/NORTE.md`). De perto, Terra e Lua usam **raio
   físico real** do kernel da NASA (`src/three/world/corpos/terra.ts:98`,
   `lua.ts:111`, via `BODY_AXES`).

2. **A régua certa já roda em produção.** Vira malha quando mede 4 px na tela, volta
   a ponto abaixo de 2 — `LIMIAR_DO_GATE_PX = 4` / `CUSHION_DO_GATE = 2`
   (`src/three/world/corpos/terra.ts:110,113`), medindo por
   `diametroAparentePx` (`corpos.ts:196-204`). **Serve a qualquer raio, sem número novo.**

3. **A régua portátil do Sol foi escrita e deixada dormindo.**
   `src/three/world/lodStellar.ts:425-445` já diz por extenso: *"uma janela em pc só
   vale para UM raio… o critério portátil é o ângulo"*, deriva `DISC_ENTER_RAD`
   (`:512`) e prova a equivalência `d = r/θ`. **Nenhum arquivo de runtime a consome**
   — `shouldDiscBeActive` só aparece na própria definição e nos testes. A peça está
   pronta na gaveta desde a Onda 3.

4. **A física do produto já usa o Sol de verdade.** `RAIO_SOL_KM = 696_340`
   (`src/lib/atlas/eclipse.ts:374`) — toda a geometria de umbra e penumbra do F2c é
   calculada com o raio real. **O raio artístico já está órfão da luz e da sombra:
   ele alimenta só o desenho.**

5. **O interior do Sol não muda de aparência ao trocar o raio.** A régua interna é
   `distância ÷ raio`, não distância absoluta (`src/three/world/stellarBody.ts:258,
   467-470`). Conta refeita: hoje, a 0,0631506 pc do Sol inflado, ela marca **7,60**;
   com o Sol real a 5,74 raios solares, marca **7,60**. Coroa, manchas, proeminências
   e escurecimento de borda saem idênticos. **A engenharia do Sol procedural não se
   perde — só reancora.**

6. **O plano de corte já desce fundo e já segue superfície.** `nearPlanePc`
   (`src/three/core/engine.ts:160-176`) desce a 1e-8 pc = 308.568 km e acompanha a
   superfície mais próxima com corpo resolvido em quadro. Na distância da abertura
   refilmada sobra folga de **10,7×**.

7. **O palco de corpos já é genérico.** `registrar(id, raio, posição)`
   (`src/three/world/corpos/corpos.ts:132-146`) aceita qualquer corpo. O Sol entra
   sem peça nova.

8. **Filme e Atlas JÁ são o mesmo universo.** `this.palco.ligado`
   (`src/three/director.ts:2351-2352`) e `this.planetas.ligado` (`:2572-2573`) **não
   têm termo de fase**. Terra e Lua resolvidas rodam durante o filme também; o gate
   delas é o tamanho na tela (`terra.ts:779`). **O filme simplesmente nunca chegou
   perto o bastante para acordá-las. Não há dois apps — nunca houve.**

---

## 3. As fases

Ordem obrigatória: **F0 antes de F3**. Entrar com o Sol honesto sem o cadastro
troca uma mentira grande por três pequenas não declaradas — o selo de hoje só sabe
olhar a distância até casa (`src/three/selo.ts:491`), não o que está em quadro.

### F0 — Cadastro de escala + o selo que nomeia
Selo passa de "FORA DE ESCALA" mudo para nomear o culpado e o fator. **Nenhum pixel
muda.** Novo `src/three/escala.ts` + teste; `selo.ts:470-493`.
~500 linhas. Prova: 24/24 bit-idênticas (as vistas carregam `&shot=2` = sem HUD,
`src/App.tsx:779`) + teste de completude por varredura, **com prova de sabotagem**
(inflar um corpo opaco de propósito TEM de deixar a suíte vermelha).
**Não toca nenhum dos 7 arquivos abertos no F2c. Pode começar já.**

### F1 — Sol real atrás de porta `?solreal=1` — **FEITA** (commits 23dc493, 75cceab)

**Medido em 2026-08-12, harness a 1800×1713, lente 58°:**

| vista | md5 | o que a foto mostra |
|---|---|---|
| `solreal4mkm` | `8a43f749a632` | o Sol REAL a 4,00 milhões de km (5,74 R☉): disco de ~543 px com granulação, manchas, espículas, raias de coroa e uma proeminência. **A parede de fogo existe sem inflar nada.** |
| `solreal1ua` | `f665b6bfe84c` | tela branca — **e não é o disco**: com `&nobloom=1` (md5 `967632e20568`) o Sol aparece como disco de 14,4 px, do tamanho que se vê da Terra, com a faixa da Via Láctea intacta atrás. Quem lava o quadro é o CLARÃO do ponto fotométrico (a "tela branca" já medida em `atlasConfig.ts:194-207`), não o corpo. |
| `solreal40ua` | `a607e3cf57ab` | **EXATAMENTE o md5 de `ua40`.** A 40 UA o Sol real desenha bit por bit igual ao inflado: os dois são o mesmo ponto. É a prova mais forte de que a correção não custa nada onde não deve custar. |

**GATE PASSADO: 22/22 bit-idênticas.** Recaptura do zero (`DOZERO=1`, 25 vistas × 2,
2,7 min) com o código da F1 — todos os md5 batem com a referência guardada,
inclusive as quatro aceitas pelo dono no commit `1754110` (`terra ff48acbaf3a7` ·
`terranb 1c0509b1d6cc` · `lua e54f7aa79a2a` · `terralua 7b5378507749`).

**O que a F1 provou, e é o fecho do argumento desta onda:** a frase
`// Sol artístico (escala real seria invisível)` de `config.ts:8` está
**refutada com imagem, pelo próprio motor, sem uma linha de baseline paga**.

**A pendência que a F1 EXPÔS (não criou):** dentro do sistema solar o clarão do
ponto do Sol lava o quadro. Já estava declarada como mentira que sobra (§5, item
6); agora tem foto. Ela é da onda da exposição, não desta.

### F1 — especificação original (mantida para o registro)
Três fotos do mesmo motor: 533 px a 4,00 milhões de km · 14,4 px a 1 UA · 0,36 px a
40 UA. É a resposta à frase do `config.ts:8`.
~90 linhas de runtime + ~250 de teste. 24/24 bit-idênticas com a porta desligada.

> **Duas quebras SILENCIOSAS, com teste-agulha obrigatório:**
> (a) o raio entra no shader como texto com 6 casas — `(2,2567e-8).toFixed(6)` devolve
> `"0.000000"`, `1.0/SUN_R` (`sol/cme.js:190`) vira infinito e **coroa e CME somem sem
> erro nenhum**; (b) limiar fixo `1e-4` em unidade de mundo
> (`sol/coronaVolume.js:363`, `cme.js:187`) contra uma travessia real de 1,30e-7 pc —
> **769× menor**: todo raio desiste antes de começar.

### F2 — Sol real vira padrão dentro do sistema (o filme não muda)
Vira disco a partir de 3,60 UA (lente do Atlas). `lodStellar.ts`, `director.ts`,
`planetas.ts`. ~120 linhas + ~250 de teste.
Prova: **22 vistas bit-idênticas por aritmética** — o corpo real só arma abaixo de
3,60 UA, o disco artístico só desenha acima de 4.125 UA; nunca coexistem.

> **~~RISCO PRINCIPAL DE TODA A ONDA~~ — MEDIDO EM 2026-08-12 E DISSOLVIDO.**
>
> **A aritmética do risco CONFIRMA-SE, ponto por ponto.** Com a câmera a 30.000 km
> da Terra e 1 UA do Sol, `nearPlanePc` devolve **3.189 km** — e vem do
> `raioPc * 0.5` da Terra, não do `dSup * 0.004` (que daria 120 km). Com
> profundidade LINEAR de 24 bits (conferido: `logarithmicDepthBuffer` não aparece
> em lugar nenhum do `src/`), o menor degrau distinguível a 1 UA vale **418.000
> km**, contra os **29.246 km** que separam a casca de espículas da fotosfera
> (`SPICULE_R = SUN_RADIUS*1.042`, `sol/spicules.js:15`). As duas caem no mesmo
> degrau — **14× dentro dele**. Até aqui, o desenho estava certo.
>
> **O QUE O DESENHO NÃO SABIA: não há dois escritores de profundidade.** Varredura
> dos 14 arquivos de `sol/`: **`sun.js` é o ÚNICO com malha que não declara
> `depthWrite: false`**. Espículas, coroa volumétrica, raias, laços, proeminências
> e CME — todos `transparent: true` + `depthWrite: false`. A fotosfera é a única
> superfície opaca do Sol inteiro.
>
> **Z-fighting exige DUAS superfícies escrevendo profundidade quase à mesma
> distância. Aqui há UMA.** Não é mitigação, é impossibilidade estrutural.
>
> **E o teste de profundidade das cascas transparentes também não vira speckle,**
> por dois fatos que se somam: (a) a quantização de profundidade é MONOTÔNICA —
> um ponto mais perto nunca vira um valor mais longe —, então a casca, que é
> geometricamente sempre a mais próxima na hemisfério renderizada
> (`side: FrontSide`), nunca perde; (b) o `depthFunc` padrão do three.js é
> `LessEqualDepth`, então quando os dois colapsam no MESMO degrau o teste passa.
> Perder precisão aqui faz a casca deixar de ser OCLUÍDA onde ela não deveria ser
> ocluída de qualquer jeito.
>
> **Consequência para o plano:** a F2 perde o gate bloqueante que a travava, e as
> duas saídas caras que estavam reservadas (limiar próprio do Sol, ou o Sol parar
> de escrever profundidade) **não precisam ser construídas**. A F2 mantém uma
> conferência visual quando o Sol virar padrão — argumento estrutural não dispensa
> olhar —, mas ela deixa de ser pré-condição.

### F3 — A escada em tamanho + a abertura refilmada (a fase cara)
Mesma parede de fogo — 19,76°, **76,0% da altura do quadro** — filmada a **4,00
milhões de km** (5,74 raios solares) em vez de em volta de uma bola de 2.269 UA.
~460 linhas de runtime + ~450 de teste. **4 baselines mudam, e só 4**: `sol`,
`soldisco`, `solrampa`, `solestouro`.

> **O buraco a fechar:** hoje, entre 0,05 e 0,14 pc, **nada além do disco inventado
> desenha o Sol** — o ponto tem ganho 0 acima de 0,05 (`lodStellar.ts:152, :233`) e o
> clarão tem ganho 0 abaixo de 0,14 (`:118, :262`). Tirar o disco sem fechar essa
> faixa apaga o Sol por ~6 s do trecho mais visto do produto.
>
> **A armadilha silenciosa:** a hélice interpola distância em **linha reta**
> (`journey.ts:107`). De 1,3e-7 pc a 0,55 pc assim, a câmera estaria **4.245× mais
> longe no primeiro centésimo de segundo**. A curva nova é exponencial: **6,63
> décadas em 24 s = 0,276 década/s**. Juiz próprio que reprova salto de tamanho
> aparente entre quadros.
>
> **A cirurgia obrigatória:** `DEEP_LIMIAR_PC` (0,05 pc) hoje é a MESMA constante
> para duas coisas diferentes — "onde o disco morre" e "onde começa a escala do
> sistema solar" (lida por `engine.ts:166`, `cameraRig.ts:200,213`,
> `planetas.ts:475`). **Fica congelada em 0,05 pc com âncora nova e escrita**
> (10.313 UA; Plutão orbita a 35,4 UA). É isso que mantém `ua500`, `ua150`, `ua40` e
> o Atlas inteiro sem um pixel de diferença.

### F4 — Descer até o Sol com o dedo
A escada do Atlas para de recusar tudo que não é Terra: `podeAproximar: … &&
this.focoCorpoId === 'earth'` (`director.ts:1471`) e `if (id !== 'earth') return;`
(`:1567`). ~35 linhas + ~60 de teste + 1 vista. Assenta em 2 raios solares (folga 2×
sobre o piso de corte de 348.170 km, `engine.ts:172`).

### F5 — O segundo mentiroso: Sgr A✱
RS passa a sair da massa (4,15e6 M☉). O cabeçalho já garante que *"a física do shader
é adimensional em RS e não muda com a escala"* (`blackHole.ts:17-18`), então a rasante
do filme (hoje 1,5 pc, `journey.ts:228`) acontece nos **mesmos ~30 RS**, agora reais.
**Custo em capturas EM ABERTO** — o passe só acende a ~2,4 kpc e ninguém mediu quais
vistas caem na janela. Gate: medir com `?nobh=1` como par nulo **antes de tocar uma
linha**. Pode ser cortada sem prejuízo às F0–F4.

**Tempo relativo** (F0 = 1): F0 1 · F1 1,5 · F2 2 · **F3 4** · F4 0,7 · F5 1,5.

---

## 4. Pendências de CONTROLE (a outra rodada, mesma data)

Cinco queixas do dono sobre o modo Atlas, conferidas. Nenhuma depende desta onda;
todas são baratas e **não tocam o filme nem as baselines**.

| # | Defeito | Endereço | Tamanho |
|---|---|---|---|
| 1 | **Um eixo de arrasto só** — o vertical é calculado e descartado; o eixo que existe move em latitude, não dá a volta | `director.ts:1213`, `atlasRig.ts:607-615` | ~40–70 linhas |
| 2 | **Roda e pinça não fazem nada e não avisam** — nenhuma linha de `wheel`/`ctrlKey`/`deltaMode` no Atlas | varredura em todo o `src/` | ~40–60 linhas |
| 3 | **Polo do corpo nunca fica para cima** — `camera.up` é constante (polo da eclíptica); a Terra sai 4,2° a 27,8° torta | `atlasRig.ts:719` | ~40–70 linhas |
| 4 | **O enquadramento não segue o alvo no tempo** — posição morta copiada uma vez; com a máquina do tempo o corpo sai do quadro em ~1 s | `atlasRig.ts:590`, `director.ts:1571`, religador em `:1667-1679` | ~10–20 linhas |
| 5 | **Quatro defeitos de ponteiro** — botão direito gira a cena e abre o menu do sistema; sem `pointercancel`; cursor nunca muda; `Esc` é a única tecla e não está escrita em lugar nenhum | `director.ts:1198-1237`, `hud.css:24-27`, `App.tsx:433-441,911-913` | ~15–25 linhas |

**A saída para o #1 sem afrouxar o grampo de 70°** (que existe para o visitante nunca
fotografar o lado escuro, `atlasRig.ts:40-47`): o eixo novo gira **em torno da linha
alvo→Sol**. Um giro nesse eixo não altera o ângulo câmera↔Sol, então a fração
iluminada continua idêntica — 360° de liberdade, mesma luz. **Refazer a conta em teste
antes de implementar.**

**Guarda para o #3:** combinado com o #1, a direção da câmera pode chegar a 0,44° do
polo da Terra (por volta de 21/dez, no extremo do arrasto) e a mira degenera. O
precedente da mistura suave já existe em `cameraRig.ts:33-40`.

**Referências apuradas:** roda de zoom existe em **todas** as fontes sem exceção;
nenhuma limita giro por causa de iluminação (o grampo de 70° é nosso, sem
precedente); "aproximar em degraus" tem precedente documentado (Stellarium `/` e `\`,
SpaceEngine `G`); rolagem travada — que é o que fazemos — é o padrão de Blender,
Maya, SketchUp, Stellarium e three.js.

---

## 5. O que continua sendo mentira depois de tudo

Para o cadastro da F0 declarar, não para consertar nesta onda:

1. **O clarão das estrelas** — sem ele, estrela nenhuma apareceria. É o borrão do
   instrumento; não escreve profundidade.
2. **Nuvens observadas e núcleos de nebulosa** — raio de autor sobre posição observada.
3. **Oito dos dez planetas ainda são sprites.** Passar por Júpiter é passar por um ponto.
4. **O brilho é relativo, não absoluto** — a lei de luz normaliza a Terra a 1 UA como 1
   (`terra.ts:864-872`). A 5,74 raios solares a irradiância real é ~1.450× a da Terra;
   nada no motor sabe disso.
5. **A luz trata o Sol como ponto sem tamanho** (`terra.ts:864-872`, `lua.ts:328-334`).
   Correto para qualquer planeta; errado a poucos raios solares, onde o Sol cobre 20°
   do céu e não há penumbra no modelo. **Hoje ninguém chega lá; depois da F3, a câmera
   do filme chega.**
6. **A tela branca do Atlas não é resolvida aqui.** Além de ~3,8 UA o disco do Sol real
   fica menor que o próprio borrão do instrumento e volta a ser ponto. O Atlas abre a
   227 UA, onde o Sol real mede 0,063 px. A lei de compensação de clarão
   (`atlasConfig.ts:274-295`) continua obrigatória.
7. **Mergulhar no Sol continua impossível** — abaixo de ~1,44 raios solares o corte come
   a fotosfera. Rasante estilo Parker cabe com folga.

---

## 6. Decisões abertas (do dono)

1. **Abrir os 2 arquivos herdados do Sol (4 linhas).** O projeto prometeu por escrito
   não tocá-los (`stellarBody.ts:14-20`). Sem isso o Sol real fica **sem coroa e sem
   CME, silenciosamente**. Recomendação: abrir, com razão no commit e teste-agulha.
2. **O que o selo promete.** Dizer "real" onde a conta fecha (com o cadastro aberto) ou
   manter o conservadorismo de hoje. Recomendação: o primeiro, **com F0 antes de F3**.
3. **A abertura do filme.** Mesma composição em lugar real (recomendado) · manter
   inflado só no filme · refilmar tudo como voo único. A terceira apagaria 19 dos 24
   planos (`journey.ts:243-624`) — entrega outro filme.

---

## 7. Convivência com a Onda 6

Esta branch nasceu de `af90809`, o mesmo ponto da Onda 6. O outro agente está no F2c
com 7 arquivos abertos (`ab-identidade.mjs`, `eclipse.ts` e teste, `lua.ts` e teste,
`terra.ts` e teste).

- **F0 não toca nenhum deles** — pode andar em paralelo.
- **F1–F5 encostam em `ab-identidade.mjs`** (vistas apendadas no fim, onde ele também
  apendou as duas de eclipse: conflito de ~3 linhas) **e em `director.ts`** (regiões
  diferentes). Abrem depois do fecho da Onda 6.
- **As baselines de eclipse dele são imunes:** as vistas de eclipse ficam a ~4,85e-6 pc
  do Sol, e o disco artístico só existe entre 0,02 e 0,34 pc — quatro mil vezes mais
  para fora. Nós dois trabalhamos em faixas de distância que não se cruzam.
- **Ação de merge, a não esquecer:** a entrada no `NORTE.md` fica para a hora do
  merge, para não disputar o arquivo que ele reescreve no fecho da onda.
