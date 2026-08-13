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
| ~~Sol (fotosfera, opaca)~~ | 2,2567e-8 pc | 2,2567e-8 pc | **1×** | `src/three/escala.ts` (`RAIO_DO_SOL_NA_CENA`) | **PAGO na F3** (2026-08-13) |
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
   a ponto abaixo de 2 — `LIMIAR_DO_GATE_PX = 4` / `CUSHION_DO_GATE = 2`, medindo por
   `diametroAparentePx`. **Serve a qualquer raio, sem número novo.**
   *(Desde a F2 os três moram em `src/three/world/corpos/corpos.ts`, não mais em
   `terra.ts`: a régua da Terra virou a régua do palco no dia em que o Sol entrou
   nela. `terra.ts` reexporta.)*

3. **A régua portátil do Sol foi escrita e deixada dormindo.**
   `src/three/world/lodStellar.ts:425-445` já diz por extenso: *"uma janela em pc só
   vale para UM raio… o critério portátil é o ângulo"*, deriva `DISC_ENTER_RAD`
   (`:512`) e prova a equivalência `d = r/θ`. **Nenhum arquivo de runtime a consome**
   — `shouldDiscBeActive` só aparece na própria definição e nos testes. A peça está
   pronta na gaveta desde a Onda 3.
   *(A F2 tentou fiá-la e NÃO fiou, com a conta na mesa: o ENTER dela vale 212 px de
   diâmetro contra os 4 px do palco — 53× —, e fiá-la apagaria `solrampa` e
   `solestouro`. Continua na gaveta, agora com razão medida. Ver a F2.)*

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
**E desde 2026-08-13 tem CAUSA medida, com arquivo e linha** — não é mais sintoma
fotografado. A conta inteira, com as três provas por eliminação, está no §5, item 6.

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

### F2 — o Sol entra na lei do palco — **FEITA** (2026-08-13)

**GATE PASSADO: 22/22 bit-idênticas**, recaptura do zero (`DOZERO=1`, 26 vistas × 2,
2,7 min). E mais: as **três vistas da F1 também não se mexeram** — `solreal4mkm`
`8a43f749a632` · `solreal1ua` `f665b6bfe84c` · `solreal40ua` `a607e3cf57ab`.
25/25 antigas idênticas; 1 vista nova (`atlas`, abaixo).

**O que entrou.** O disco do Sol deixou de ser decidido por janela em parsec e passou
pela **mesma lei que já governa Terra e Lua**: diâmetro aparente contra
`LIMIAR_DO_GATE_PX` = 4 px, com o cushion 2× da histerese. A lei mudou de endereço
junto — saiu de `terra.ts` e foi para `corpos.ts`, ao lado de `diametroAparentePx`,
porque deixou de ser régua da Terra para ser **régua do palco** (`terra.ts` reexporta:
nenhum importador mudou de linha, e não há segunda cópia).

**A aritmética que pagou a fase** (lente 58°, buffer efetivo do harness 1713 px ⇒
1.545,1 px/rad):

| | arma | desarma |
|---|---|---|
| Sol de raio FÍSICO (2,2567e-8 pc) | **3,60 UA** (4 px) | 7,19 UA (2 px) |
| disco ARTÍSTICO (0,011 pc) | 8,50 pc | 17,0 pc |

O disco artístico só desenha acima de **0,02 pc = 4.125 UA** (`deepDiscFade`), e o
corpo real só arma abaixo de 3,60 UA: **1.147× de separação — eles nunca coexistem em
quadro.** E com o raio artístico o gate novo é **inerte por aritmética**: ele só
desarmaria em 8,50 pc, 26× depois do corte duro de custo que já apagava o grupo
(0,3249 pc). Varredura em `corpos.test.ts`: em toda distância em que o grupo do Sol
artístico pode estar visível, o gate está armado. É daí que sai o pixel-igual — sem
medição nova, por conta.

**A régua-em-pc virou lei única.** `discWorldFadeDaInstancia` (o `if` da F1, que
escolhia entre duas leis conforme o raio) morreu e virou
`solWorldFadeDaInstancia(dPc, raioPc)`: o termo do domínio profundo recebe a distância
**normalizada pelo raio** (`dPc × sunRadius/raioPc`), porque "engolfar o quadro" é
tamanho na tela, não distância absoluta. Para o raio artístico a razão é `x/x` = 1
EXATO e `d×1 === d`: a função **é** `solWorldFade` bit a bit (teorema, não tolerância —
com teste de sabotagem de 1 ULP). O termo de LONGE fica em pc crus com razão escrita:
normalizá-lo mataria o disco do Sol real a 14,5 raios solares, e a F1 já fotografou um
disco legítimo de 14,4 px a 1 UA.

**O Sol no palco, e o registro subiu de lugar.** Ele agora acontece junto com o da
Terra e o da Lua — **antes** de o near ler o palco. Da F1 até aqui ele ficava depois do
`sun.update`, e o plano de corte recebia a superfície do quadro **anterior**. A guarda
`raio físico` continua e não é gate de fase: é doutrina do palco (ali só entra
superfície real). Medido: registrar o Sol inflado mudaria o near em toda vista com a
câmera além de **1,375 pc** — `interno`, `travessia`, `mergulho`, `edgeon`, `faceon` e
as quatro de hero.

**A dupla-luz ponto↔corpo desfeita, por DOMINÂNCIA.** O Sol-ponto da camada de
planetas cede pelo `cessaoAlvo` da F2b da Onda 6 (a curva g(r) de 1 a 2,5), não por
corte no gate: cortar no armar apagaria ~25 px de halo para pôr 4 px de disco no lugar
— um passo para trás na luz, que é o que a prova de continuidade da Onda 3 proíbe. A
1 UA o disco tem 14,4 px contra 25,2 px de halo ⇒ r = 0,57 ⇒ **cessão 0 exata**, e é
por isso que `solreal1ua` continua no md5 da F1. **A tela branca não foi apagada por
acidente: ela continua sendo o que o §5.6 diz que é.**

#### O que CONTRARIA o desenho da fase (medido, não opinião)

1. **`?solreal=1` NÃO pôde virar desnecessária.** O raio é parâmetro de **construção**
   (vira escala do grupo e literal compilado no GLSL da coroa e da CME —
   `SUN_R_GLSL`/`SEG_EPS_GLSL`), então "ser o padrão" só pode significar construir o
   Sol pequeno SEMPRE — e o Sol pequeno sempre apaga o disco da abertura: a 0,063 pc a
   fotosfera real mede **5,5e-4 px**. As vistas que morreriam são `sol`, `soldisco`,
   `solrampa` e `solestouro` — **exatamente as 4 baselines que a F3 reserva**.
   Antecipar isso aqui seria pagar a conta da F3 sem entregar o plano dela. A porta
   fica, viva e não morta (3 vistas oficiais + os testes da lei nova), e o que ela
   perdeu foi o papel de LIGAR o Sol como corpo: quem decide isso agora é a lei do
   palco. Ela só escolhe QUE RAIO o Sol tem.
2. **O gate por ângulo sólido continua dormindo, e agora com razão medida.**
   `DISC_ENTER_RAD` e `LIMIAR_DO_GATE_PX` são o mesmo contrato com limiares **53×
   distantes**: ENTER = 0,06875 rad de raio angular ⇒ **212 px** de diâmetro, contra os
   **4 px** do palco. São perguntas diferentes — "o disco INFLADO ainda é o assunto?"
   contra "este corpo já é representável como corpo?". Fiar `shouldDiscBeActive` como
   gate do grupo do Sol **apagaria o disco em `solrampa` (0,25 pc) e `solestouro`
   (0,32 pc)**: nos dois o θ está abaixo do ENTER e o gate, partindo de inativo, nunca
   ligaria. Duas baselines perdidas para trocar de régua sem trocar de resposta. O que
   a F2 fiou foi a régua do palco, que responde a pergunta certa para um corpo de raio
   físico. O gate por ângulo fica de pé como pendência **nomeada** da Onda 7 — e o
   número dele (212 px) vai ter de ser re-derivado do corpo real, não do disco inflado.

#### A vista nova: `atlas` (`e9544b84cca2`)

Fecha o defeito #5 do §8.3: **nenhuma das 22 ligava `?atlas=1`**, e a lei do clarão
(`claraoDoAtlas`) nunca tinha sido exercida por juiz nenhum. `?atlas=1&jd=…&shot=2` —
sem `?pos=`, que tem precedência sobre `?atlas=1` e desligaria justamente o modo.

**E o que ela mostrou, na primeira vez que alguém olhou:** mesmo com o fator no PISO
(k² = 1,29e-4 contra `PISO_DO_CLARAO` = 0,01), o clarão do Sol-ponto **ainda é uma bola
branca que ocupa a maior parte do quadro**. A lei modera; ela não resolve. É a mesma
pendência do §5.6, agora com imagem, juiz e md5 — e é contra esta linha de base que a
onda da exposição vai poder provar que consertou alguma coisa. Hoje não havia como.

### F2 — especificação original (mantida para o registro)
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

### F3 — A escada em tamanho + a abertura refilmada — **FEITA E APROVADA PELO DONO** (2026-08-13)

**A ABERTURA MUDOU DE LUGAR, NÃO DE ENQUADRAMENTO.** O plano de abertura era
filmado a 0,0631506 pc (13.027 UA) em volta de uma bola de 0,011 pc — 2.269 UA de
raio. Agora é filmado a **3,998 milhões de km (5,741 raios solares)** do Sol de
raio FÍSICO. O fator é um só e sai da razão dos dois raios:

> K = R☉ / R_artístico = 2,2567e-8 / 0,011 = **2,051531e-6**

e a abertura inteira é o ponto antigo MULTIPLICADO por ele. Escalar o VETOR (em vez
de recalcular a hélice com números novos) é o que torna a promessa exata: o Sol
subtende **19,762056°** — 76,0% da altura na lente de 26° —, com diferença de
**0,72 ULP de double** (1,6e-16 relativo, 3e-15 grau) para o ângulo do plano antigo.
O lugar EXISTE: a Parker Solar Probe chega a 9,86 raios solares.

**A HÉLICE VIROU EXPONENCIAL, e era isso ou o filme.** A primitiva `orbit()`
interpola raio, ângulo e altura em linha reta. Medido: com o ponto de partida
4,4 milhões de vezes mais perto, a interpolação linear poria a câmera **1.000× mais
longe no primeiro CENTÉSIMO de segundo** — o Sol viraria ponto antes do segundo
quadro e sobrariam 23,99 s de estrela parada. A curva nova é
`distanciaDaAbertura(k)`: **6,6477 décadas em 24 s = 0,27699 década/s** (×1,891 de
distância por segundo). A curva boa cresce **0,64%** no mesmo centésimo — quatro
ordens de grandeza de diferença.

Marcos medidos na curva (t contado do início da hélice, t=6 s do filme):

| t | distância | o que acontece |
|---|---|---|
| 0,00 s | 5,741 R☉ | a parede de fogo — 74,7% da altura do quadro |
| 5,68 s | 1 UA | o Sol cruza a órbita da Terra |
| **8,58 s** | 6,1 UA | o disco cai abaixo de 4 px: **deixa de ser corpo** |
| 18,73 s | 0,02 pc | começa a entrega ponto→clarão |
| 20,17 s | 0,05 pc | o Sol é estrela, e a hélice sai do domínio profundo |
| 24,00 s | 0,5757 pc | pousa em `ORBIT_EXIT` — a constante não se moveu |

**O `fovEase`, campo novo do `Shot` e a única mudança na máquina do roteiro:** a
posição precisa do parâmetro CRU (a taxa é em segundos de relógio), o zoom 26°→56°
tem de continuar com o `glide` de sempre. Sem `fovEase`, a alternativa era inverter
o smoothstep por Newton dentro do `pos`. Ausente, a expressão que `at` avalia é a de
antes — os outros 23 planos não mudam um bit.

#### As três cirurgias

**1. O BURACO DE VISIBILIDADE, fechado por FUSÃO.** Estava medido: entre 0,05 e
0,14 pc nada além do disco inventado desenhava o Sol. A F3 juntou as duas janelas
numa só — `LOD_SOL.entrega` {0,02; 0,03; 0,05} —, e as quatro janelas do Sol
viraram uma:

| janela | era | virou |
|---|---|---|
| `disc` {0,16→0,34} | dissolvia o disco inflado ao AFASTAR | morreu com o disco |
| `deep` {0,05→0,02} | dissolvia o disco inflado ao APROXIMAR | virou a entrega |
| `starGain` {0,14; 0,16; 0,30} | acendia o clarão | mudou de janela |
| `starCore` {0,30; 0,12; 0,42} | atrasava o núcleo por causa do disco | **fundiu com o ganho** |

`deepPointGain(d) = 1 − sunStarGain(d)`, escrito assim e não como segunda rampa: a
soma é **1 EXATO** em toda distância (teorema, varrido no teste), então o Sol nunca
fica sem dono e a troca não tem degrau de luz. O núcleo fundiu porque a razão dele
era o disco ("o núcleo apertado imprime um ponto branco no meio do disco e lê como
retículo de mira") — sem disco, manter as duas rampas deixaria o Sol como um borrão
SEM ponto de 0,05 a 0,30 pc, justamente onde ele já é uma estrela.

**2. A ARMADILHA DA HÉLICE, com juiz próprio.** `cameraRig.test.ts` amostra os 1.441
quadros da hélice a 60 fps e mede o **diâmetro aparente do Sol em pixels** (a régua
do palco, `diametroAparentePx`, com a lente viva do plano) — não a distância. Nenhum
quadro perde mais de 3% do anterior; a razão entre quadros consecutivos é constante
a 1e-9. E o juiz REPROVA a linha reta: o oráculo com a lei antiga falha o mesmo
critério.

**3. A CONSTANTE SEPARADA.** `DEEP_LIMIAR_PC` respondia duas perguntas com um
símbolo só. Agora:
- **`LIMIAR_SISTEMA_SOLAR_PC`** (`escala.ts`) = 0,05 pc, **CONGELADA**, com âncora
  escrita pela primeira vez: 0,05 pc = 10.313 UA, e Plutão orbita a 35,4 UA —
  291× de folga. Lida por `engine.ts` (plano de corte), `cameraRig.ts` (velocidade
  do voo livre) e `planetas.ts` (camada dos dez corpos).
- **`LIMIAR_DA_ENTREGA_PC`** (`lodStellar.ts`) = a borda de cima da janela de LOD,
  livre para andar. Hoje vale o mesmo número, e a IGUALDADE É OBRIGAÇÃO cobrada em
  teste: o ganho do Sol-ponto tem de chegar a 0 exatamente onde a camada some,
  senão o Sol apagaria aceso.

#### O que mais mudou de endereço

- **`WORLD.sunRadius` MORREU** (`config.ts`). O raio do Sol mora em `escala.ts`, ao
  lado do cadastro que o declara: `RAIO_DO_SOL_NA_CENA` (o que a cena desenha) e
  `RAIO_ARTISTICO_DO_SOL_PC` (a lápide, 0,011). Serem o mesmo símbolo que o cadastro
  divide por `RAIO_SOL_PC` é o que faz o teste EXIGIR fator 1 sem ninguém apertá-lo.
- **A dívida do Sol foi PAGA:** saiu de `DIVIDAS_ABERTAS`, o fator é 1 e a acusação
  do selo ficou com um culpado só — "Sagittarius A✱ está 125.884× maior".
- **`?solreal=1` morreu.** Uma porta que só pode estar ligada não é porta. As três
  vistas dela perderam o `&solreal=1` e **não mudaram um bit** (`solreal4mkm`
  8a43f749a632 · `solreal1ua` f665b6bfe84c · `solreal40ua` a607e3cf57ab = `ua40`) —
  a conferência mais barata da fase.
- **O corpo perdeu o LOD.** `stellarBody` não importa mais `lodStellar`:
  `uWorldFade` vale 1 sempre e quem apaga o grupo é a régua do palco (4 px, cushion
  2×). Não é economia: normalizada pelo raio FÍSICO, a rampa antiga dissolveria a
  fotosfera **entre 4,5 e 1,8 raios solares** — exatamente onde a F4 quer descer.
- **O ramo literal do epsilon do GLSL morreu**, como o comentário dele prometia
  desde a F1. Sobra a lei proporcional: 0,909% do raio.

#### O GATE (2026-08-13, harness 1800×1713, `DOZERO=1`, 26 vistas × 2)

**22/22 bit-idênticas entre as que TÊM de ser** — as 19 do contrato mais as 3 do Sol
real. **4 mudaram, e são só as 4 reservadas.**

**REBASELINE APROVADO PELO DONO EM 2026-08-13.** Ele viu os oito PNGs de
`capturas/f3/` e disse sim. Isto deixou de ser proposta: os md5 da coluna VIGENTE são
a **referência oficial da casa** e já estão na tabela do `docs/NORTE.md`. E não são
valores copiados de documento — os quatro foram **RE-MEDIDOS na hora da aprovação**,
com o gate inteiro rodando outra vez a partir desta mesa: 26 vistas, cada uma
capturada 2×, todas estáveis; as 22 que não podiam mudar não mudaram, e estas quatro
devolveram exatamente o que está abaixo.

| vista | md5 VIGENTE (desde 2026-08-13) | md5 que MORREU | o que a foto passou a mostrar |
|---|---|---|---|
| `sol` (t=6) | `d3f110e281d3` | ~~`a4fbf427778a`~~ | a MESMA parede de fogo, a 4,00 milhões de km |
| `soldisco` (0,10 pc) | `06d7c8d406cd` | ~~`7a2e6d1f4620`~~ | estrela pleníssima com espinhos (o clarão no teto de 40°) |
| `solrampa` (0,25 pc) | `1ad5c3e89220` | ~~`ff2b7b4d353a`~~ | a mesma estrela, menor — 15,7° |
| `solestouro` (0,32 pc) | `7306f0d4f044` | ~~`3dc8706149b4`~~ | menor ainda — 10,9°, sem o resto de disco |

**`solestrela 22f5fab0992e` NÃO mudou, e as outras 21 também não.**

`atlas-smoke` verde. 1.435 testes (eram 1.448 — a queda é de código apagado: as
suítes das quatro janelas mortas saíram junto com elas), `tsc` e `eslint` limpos.
Oito MUTAÇÕES conferidas, todas vermelhas: hélice linear, abertura sem o fator K,
`fovEase` removido, janela esticada, núcleo atrasado de novo, Sol inflado de volta,
`uWorldFade` atenuando, camada dos dez subida para 0,3 pc.

#### O que CONTRARIA o desenho da fase (medido, não opinião)

1. **O buraco era MAIOR do que o desenho dizia.** O desenho falava de [0,05; 0,14] pc
   — a faixa em que ninguém desenha o Sol. Mas o clarão só chega a ganho PLENO em
   0,30 pc, então tirar o disco deixaria [0,05; 0,30] com o Sol subexposto, não só
   [0,05; 0,14] com o Sol apagado. Foi por isso que a janela do clarão desceu inteira
   para a entrega, em vez de só esticar a de baixo.
2. **6,63 décadas era o número do RAIO; a distância dá 6,6477.** O desenho media
   `log10(r1/r0)` (0,55 / 1,272e-7). A curva embarcada interpola a DISTÂNCIA
   (`|ORBIT_EXIT|` / `|SUN_WALL|`), que é 6,6477 — 0,27699 década/s em vez de 0,276.
3. **O clarão bate no TETO DE 40° e fica plano de 0,02 a 0,134 pc.** A lei do glare é
   `min(40°, 1,75°·10^(−0,3m))`, e o teto solta só em **0,134272 pc**. Consequência:
   entre t≈18,7 s e t≈21,5 s da hélice o clarão do Sol tem tamanho CONSTANTE enquanto
   a lente abre — ele encolhe em relação ao quadro, mas não por si. É lei herdada
   (Onda 1), não coisa que a F3 criou, e mexer nela recalibraria `solestouro` e
   `solestrela` sem pedido. **Fica declarado, para a onda da exposição.**
4. **`soldisco` deixou de medir o que foi escolhida para medir.** Ela nasceu como "o
   disco pleno"; hoje é "o clarão no teto". O nome ficou (renomear custaria a
   continuidade da baseline), e o que ela guarda agora é o degrau mais sensível do
   teto de 40°.
   **Em 2026-08-13 tentou-se RE-APONTÁ-LA de 0,1 pc para 3,0 UA — e a mudança foi
   DESFEITA por inteiro**, porque ninguém a pediu e porque a 3 UA a foto sai branca do
   mesmo jeito, pelo motivo agora medido no §5, item 6. O item acima continua
   valendo, palavra por palavra; o registro do que foi desfeito está em
   `docs/RETOMADA.md`, §5.
5. **O Sol agora é submetido DENTRO do sistema solar.** Com o gate de 4 px, o grupo
   do Sol acende abaixo de 3,60 UA — inclusive nas vistas de Terra e Lua, onde ele
   fica fora de quadro. As quatro saíram bit-idênticas (conferido), mas é custo de
   GPU novo em qualquer cena a menos de 3,6 UA do Sol. **Em compensação o custo CAIU
   no filme inteiro:** antes o grupo ficava aceso de 0,02 a 0,3249 pc (4.125 a
   67.000 UA); agora só nos primeiros 8,6 s da hélice.

**A FASE FECHOU: O DONO APROVOU EM 2026-08-13.** Ela parava em "imagens prontas" —
as 4 imagens ANTES/DEPOIS de `capturas/f3/`, 8 PNGs — e o precedente D11 da Onda 3
dizia que baseline só muda com o sim do dono. O sim veio, com as fotos abertas na
frente dele. O que ele aprovou, com todas as letras: o rebaseline das quatro vistas
da abertura — `sol`, `soldisco`, `solrampa`, `solestouro`. Os md5 novos foram
re-medidos na aprovação e já são a referência oficial da casa no `docs/NORTE.md`; os
antigos morreram. Os oito PNGs viram **histórico da aprovação**, não material de
decisão.

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

**O QUE A F4 HERDA DA F3, e vale escrever antes de esquecer:** o Sol já é corpo do
palco com raio físico, o near já sabe parar antes da fotosfera (folga de 10,7× na
distância da abertura) e o LOD por distância não existe mais para atrapalhar a
descida. O que falta é o gesto — `podeAproximar` e o `if (id !== 'earth') return;`
de `director.ts`.

---

## 4. Pendências de CONTROLE (a outra rodada, mesma data)

Cinco queixas do dono sobre o modo Atlas, conferidas. Nenhuma depende desta onda;
todas são baratas e **não tocam o filme nem as baselines**.

**AS CINCO ESTÃO FECHADAS.** As de ponteiro caíram em 2026-08-13 (linha 5); as
quatro primeiras caíram na mesma data, num commit cada. Sobra a **carência de
teclas**, nomeada na linha 5 e ainda aberta.

| # | Defeito | Endereço | Estado |
|---|---|---|---|
| 1 | ~~**Um eixo de arrasto só**~~ — o vertical era calculado e descartado; o eixo que existia movia em latitude | `atlasRig.ts` (`OrbitaDoVisitante`, `addOrbitDelta`), `director.ts`, `App.tsx` | **FECHADO** — ver abaixo |
| 2 | ~~**Roda e pinça não fazem nada e não avisam**~~ | `rodaDaEscada.ts` (novo), `director.ts` (`onRodaDoAtlas`, `descerDegrau`) | **FECHADO** |
| 3 | ~~**Polo do corpo nunca fica para cima**~~ — a Terra saía 4,2° a 27,8° torta | `atlasRig.ts` (`upDoAtlas`, campo `polo`), `director.ts` (`poloDoCorpo`) | **FECHADO** |
| 4 | ~~**O enquadramento não segue o alvo no tempo**~~ | `atlasRig.ts` (`recompor`), `director.ts` (`enquadreVivo`, `recomporAlvo`) | **FECHADO** |
| 5 | ~~**Quatro defeitos de ponteiro**~~ — botão direito, `pointercancel`/`lostpointercapture`, menu de contexto e cursor. Sobra só a **carência de teclas** (o `Esc` é a única, e não está escrita em lugar nenhum) — essa continua aberta. | `arrastoDePonteiro.ts` (novo), `director.ts`, `cameraRig.ts`, `fases.ts`, `hud.css`, `App.tsx` | **FECHADO**; teclas: em aberto |

### O QUE FECHOU, com os números que pagaram cada conserto (2026-08-13)

**#1 — dois eixos, e a volta inteira de graça.** O horizontal passou a girar em
torno da **linha alvo→Sol**, e a conta que o autoriza é uma linha: `R(u,ψ)` deixa
`u` fixo e é ortogonal, logo `(R(u,ψ)d)·u = d·u` — o ângulo ao Sol não muda um
dígito, a fração iluminada `(1+cos φ)/2` fica idêntica e **o grampo de 70°
continua valendo palavra por palavra**. O grampo virou CONE em vez de arco:
`altura` mora em [0°, 70°] porque com 360° de volta a metade negativa é
redundante (`(−φ,ψ) ≡ (φ,ψ+180°)`, provado em teste pelo espelho). O alcance sai
de um arco de 140° para o cone inteiro. Os sinais são os da superfície seguindo o
dedo, cobrados contra as colunas X e Y da câmera já escrita. Volta inteira =
2.856 px. **A vista de repouso não se mexeu um bit.**

**#2 — roda e pinça em DEGRAUS.** `LIMIAR_DO_DEGRAU_PX = 40` sai dos dois estalos
que existem (100 px em modo pixel no Chrome/Safari; 3 linhas = 48 px no Firefox):
um estalo é um degrau em qualquer navegador. `ctrlKey` é como a pinça de Mac
chega, e é por causa dela que o `preventDefault` é incondicional — o padrão da
pinça é dar zoom na página inteira. Trava de 300 ms com o acumulado ZERADO
dentro dela (senão o embalo ressuscita quando ela abre): um empurrão de 600 ms dá
2 degraus, não 20. A descida de "sistema" pousa na órbita da casa porque sem esse
ramo a roda não faria nada justamente na vista de abertura.

**#3 — polo do corpo, com a guarda que ele obriga.** O dado saiu de
`baseCorpoEquatorial` (o mesmo modelo IAU que orienta a malha — nenhuma tabela
nova). A guarda **não é capricho**: o eixo da Terra faz 66,6° com a direção do
Sol no solstício e o grampo do arrasto vale 70°, então a mira PASSA por cima do
polo (varredura fina: 0,002°) e o `lookAt` degenera. `upDoAtlas` mistura com o
polo da eclíptica pelo mesmo precedente do `galacticUp`; varredura de Terra e Lua
× um ano × o cone inteiro: a mira nunca chega a menos de **17,6°** do `up`. E não
vaza — acima de 30° o `up` é o polo do corpo puro, com igualdade exata.

**#4 — alvo vivo, e a partida da rampa junto.** O limite de frequência é o
INSTANTE e não um teto em ms, por conta: a 116 dias/s um teto de 10 Hz deixaria
29 milhões de km de Terra entre correções contra um enquadramento de 25 mil km. A
pose de PARTIDA da rampa anda com o mesmo delta — sem isso, na troca corpo→lua a
razão é 13:1 num quadro e a câmera gira **95,2°**; com isso, **1,87°**. O
religador não passa por `teletransportou()` (que derruba a LUT do raymarch e
reinicia a contagem da captura) porque roda sessenta vezes por segundo.

**A DICA** passou a descrever os gestos reais, com orçamento medido: 68
caracteres é o teto antes da 3ª linha em `ui = 1,4` a 900 px, e a 3ª linha
estouraria a base declarada do retângulo útil (0,328 contra 0,310).

**PROVAS.** 1.448 verdes (eram 1.422), `tsc` e `eslint` limpos, **22/22 vistas do
filme bit-idênticas** — e a `atlas` (`e9544b84cca2`) TAMBÉM não se mexeu, porque
ela abre no degrau "sistema", onde nenhum dos quatro consertos toca em repouso.
`atlas-smoke` verde com três provas novas em navegador real (a roda movendo a
escada com `defaultPrevented=true`, o `up` a 0,14° do polo celeste no degrau
"corpo", e o alvo andando 5.904× o raio do enquadramento com a câmera junto);
juiz de a11y verde. Cada conserto foi conferido por MUTAÇÃO.

### O PRECEDENTE DA CASA: `Novo-Sol-Fable-3d`, `src/camera/controls.js`

O dono apontou o projeto irmão (github.com/fgferre/Novo-Sol-Fable-3d) — o MESMO
autor, o mesmo de onde os 14 arquivos de `sol/` vieram vendorizados. Consultado em
2026-08-12. **Ele já faz, com números, tudo que o Atlas não faz** — e isso troca a
justificativa das cinco pendências acima: deixam de se apoiar em SpaceEngine e
passam a se apoiar em código do próprio dono.

A coluna da direita é o estado **ANTES** dos consertos de 2026-08-13; a terceira
diz onde cada linha parou.

| gesto | o que o doador faz | o Atlas ANTES | depois |
|---|---|---|---|
| arrastar | orbita **nos dois eixos**, "a superfície segue o dedo" (estilo Google Earth) | um eixo só; o vertical é descartado | **dois eixos**, superfície seguindo o dedo |
| roda do mouse | zoom, `dist × 0,0035` por unidade de delta | nada | **degraus da escada** (não zoom contínuo — o degrau vive na URL) |
| pinça de trackpad | zoom, `targetCamDist *= prev/d` (multiplicativo) | nada | **degraus**, pelo `ctrlKey` |
| duplo clique | alterna enquadrar ↔ close-up | nada | segue em aberto (o clique simples já enquadra; a descida é a roda) |
| setas do teclado | giram **com inércia**; `+`/`−` zoom (0,82 / 1,22); `R` volta ao enquadrado | só `Esc` | **em aberto** — a carência de teclas da linha 5 |
| trava de elevação | `clamp(phi, 0,18, π−0,18)` ≈ 10°–170° — trava só no POLO, por matemática | ±70°, por iluminação | cone de 70° por iluminação, com o piso em 0° pela MESMA razão do irmão (não cruzar o eixo) |
| amortecimento | velocidade suavizada `0,65×anterior + 0,35×instantânea`; arremesso medido em ~180 ms de histórico | nenhum | **em aberto** |
| distância mínima | `SUN_RADIUS × 1,5` | não há zoom | não se aplica: a escada tem piso (o degrau "lua") |

**A leitura honesta disto:** a trava de elevação do doador existe para não passar
pelo polo (matemática), não para proteger iluminação. O grampo de 70° do Atlas
continua sendo escolha nossa e sem precedente — inclusive no código do próprio
dono. A saída do eixo alvo→Sol (abaixo) foi a que preservou as duas coisas. E o
conserto acabou herdando **as duas** travas do irmão pelo mesmo preço: o teto de
70° por iluminação e um piso em 0° que existe pela razão dele — não cruzar o
eixo, porque do outro lado o azimute corre ao contrário.

**A saída para o #1 sem afrouxar o grampo de 70°** (que existe para o visitante nunca
fotografar o lado escuro): o eixo novo gira **em torno da linha alvo→Sol**. Um giro
nesse eixo não altera o ângulo câmera↔Sol, então a fração iluminada continua idêntica
— 360° de liberdade, mesma luz. **A conta foi refeita e FECHOU** (a prova está em
`OrbitaDoVisitante` e no teste que varre 72 azimutes a 1e-12); foi ela que se
implementou.

**Guarda para o #3:** combinado com o #1, a direção da câmera chega ao polo da Terra
e a mira degenera. **Confirmado e pior do que o estimado**: a varredura fina mediu
0,002° (a estimativa era 0,44°). O precedente da mistura suave de `cameraRig.ts` foi
o que se usou — `upDoAtlas` —, e o piso medido depois dela é 17,6°.

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
   (`atlasConfig.ts:274-295`) continua obrigatória. **A F1 fotografou este defeito**
   (`solreal1ua` lava de branco; com `&nobloom=1` o disco aparece limpo).

   **O DOADOR JÁ RESOLVEU ISTO, e a diferença NÃO é de algoritmo — é de exposição.**
   Consultado o `src/post/pipeline.js` de `Novo-Sol-Fable-3d` (2026-08-12):

   | | doador (o Sol enche o quadro) | casa (hoje) |
   |---|---|---|
   | exposição | **0,418** (HDR) · 0,435 (SDR) | **1,02–1,05** |
   | limiar do bloom | 0,72, com joelho e espalhamento próprios | 0,82 |
   | força do bloom | 0,62 (HDR) · 0,55 (SDR) | 0,72 |
   | tom | ACES, com mistura opcional para AgX | ACES + joelho asinh β 0,45 |
   | auto-exposição | **não tem** — e não precisa | não tem |

   Os limiares e as forças são quase os mesmos. **O que separa os dois é a exposição:
   a casa roda ~2,4× mais quente.** E há uma frase no doador que é o diagnóstico
   inteiro: o limiar de 0,72 existe para "fazer o bloom LER sem lavar o disco".

   **O QUE NÃO ATRAVESSA:** o doador **nunca precisa expor uma galáxia e um Sol no
   mesmo quadro** — a cena dele é só o Sol, e por isso uma exposição fixa e baixa
   basta e ele dispensa auto-exposição. A casa tem os dois no mesmo quadro.

   > **CORREÇÃO (varredura profunda de 2026-08-12).** A primeira leitura desta
   > tabela concluiu que o alvo da casa seria "~2,4× abaixo da exposição de hoje".
   > **Isso está ERRADO e não deve ser usado.** O comentário do próprio doador diz
   > que a exposição dele ERA 1,02/1,06 — praticamente a da casa — e caiu para
   > 0,418 **depois que ele consertou a conversão final de cor**. Não é escolha
   > estética: é a conta de um conserto que a casa **nunca precisou fazer**, porque
   > ela nunca teve esse defeito (é, aliás, o único defeito grave dele que a casa
   > não tem). Copiar o número escureceria a casa 2,44× sem corrigir nada. O par
   > "limiar 0,72 / força 0,62" carrega o mesmo asterisco, e nem são grandezas
   > comparáveis: o motor da casa multiplica por 3,0 fixo e soma 5 texturas, o dele
   > multiplica 1. **O que atravessa é só a existência da prova** — um Sol enchendo
   > o quadro É exponível com ACES —, não nenhum dos números.

   **E a causa real da tela branca ficou medida, o que a tese anterior não tinha:**
   o clarão da casa tem CINCO escalas de borrão e o Atlas as multiplica todas por um
   fator só. Quem lava o quadro é **uma escala só** — a mais larga deposita 2,22 de
   luz a meia tela de distância do Sol (satura branco); a seguinte deposita 0,005
   (invisível). Existe controle público por escala que a casa nunca tocou. Moderar
   as cinco juntas apaga 99% do borrão largo do Sol (o alvo) e junto 99% do brilho
   apertado das 328.749 estrelas.

   **A CAUSA DA TELA BRANCA FOI LOCALIZADA (2026-08-13, por eliminação, com o
   servidor rodando desta mesa).** Deixou de ser sintoma fotografado: tem culpado,
   com arquivo e linha.

   **A faixa que lava.** Medida em 1 · 1,25 · 1,5 · 2 · 2,5 · 3 · 3,5 · 4 · 8 UA:
   **todas brancas**. De ~1 UA a ~8 UA o quadro não tem imagem, tem papel. Fora da
   faixa, por baixo, não lava: a **0,0668 UA** (10 milhões de km) sai a bola laranja
   com granulação e escurecimento de borda, como deve.

   **As três provas por eliminação, todas a 3 UA:**
   - `&noplan=1` (camada de planetas fora) → **céu preto e o disco laranja honesto de
     4,8 px**. O CORPO está certo. Ele nunca foi o acusado.
   - `&nosun=1` → **o branco CONTINUA**. Também não é o grupo do Sol.
   - `&nobloom=1` → **quadro limpo**, com uma PSF branca de ~20 px e núcleo laranja.

   **Quem pinta o branco é o PONTO FOTOMÉTRICO do Sol — o vértice 0 da camada de
   planetas — espalhado pelo bloom.** Os endereços: a camada fica ligada até
   **0,05 pc = 10.313 UA** (`planetas.ts:488`) e o ganho dela é
   `uGain = deepPointGain(d)` (`planetas.ts:498`), que vale **1 exato em toda a
   faixa**, porque a rampa que o baixaria só COMEÇA em 0,02 pc
   (`lodStellar.ts:176`) — dentro do sistema solar o ponto entra em ganho PLENO,
   sempre. O bloom que o espalha está em `post.ts:199-201`: força **0,72**, limiar
   **0,82**, raio **0,58**. E a fonte é honesta demais para essa lente: o Sol tem
   magnitude aparente **−26,74** a 1 UA e **−24,36** a 3 UA.

   **E a ligação que importa, que nenhum documento tinha feito até aqui:** esta é a
   **PRIMEIRA QUEIXA do dono** na sessão de origem — *"não vi o sol procedural"*, no
   modo Atlas. Não é item cosmético de acabamento: é **o pedido mais antigo ainda
   aberto**, e a tela branca é a resposta que ele recebeu. Continua sendo da onda da
   exposição, não desta — mas agora com causa medida em vez de sintoma.

   **ARMADILHA DE MEDIÇÃO, para quem for medir isto depois.** Os PNGs de `capturas/`
   **sobrevivem entre sessões** e podem estar VELHOS: a pasta é cache, não evidência.
   Em 2026-08-13 um deles — `ab-antes-solreal1ua-0.png`, md5 real `61d786c7b903` —
   foi lido como se fosse a baseline atual e levou a uma conclusão ERRADA: a de que
   1 UA saía limpa. A baseline verdadeira de `solreal1ua` é `f665b6bfe84c`, e ela é
   **branca**. **Regra: nunca julgar por PNG achado na pasta; recapturar antes de
   olhar.**
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

---

## 8. A varredura profunda do projeto irmão (2026-08-12)

O dono apontou `github.com/fgferre/Novo-Sol-Fable-3d` e pediu varredura profunda.
13 agentes, 6 frentes, todas conferidas por adversários. Os 128 arquivos do irmão
foram lidos contra o código da casa. **Nada aqui é hipótese: o que não sobreviveu
à conferência foi cortado.**

### 8.1 A resposta à pergunta que mais podia doer

**"O irmão consertou alguma coisa DEPOIS de a Viagem copiar?" — NADA.** Os 14
arquivos foram baixados na versão mais recente dele e comparados. Diferença total:
**99 linhas em 4.977 (2,0%)**, e as 99 são mudanças que a casa fez de propósito e
escreveu no próprio arquivo. Quatro arquivos são **byte a byte idênticos**.
**Nenhuma constante numérica difere.** Até a ordem de chamada por quadro é igual.

E o fluxo foi ao contrário duas vezes: consertos de valor inválido em shader foram
**daqui para lá**, e um comentário no código dele cita "auditoria do projeto Viagem".

### 8.2 O que dói é o oposto: a casa copiou um conserto e o DESLIGOU

O irmão mediu que, com o relógio de manchas acelerado, o nascimento e a morte das
regiões ativas dão **solavanco**, e alargou as rampas de vida em **1,75×**
(`sol/activity.js`, `lifeEnvelopeLapse`: nascimento 0,14→0,245, morte
0,32→0,56). Esse código está na casa e é **código morto hoje**.

E a casa **acelera exatamente esse relógio**. MEDIDO em 2026-08-13, na
dramaturgia do arranque (`stellarBody.ts`, o empurrão de `cycleTime` dirigido por
`journeyT` entre `dramaT0`=5 s e `dramaT1`=29 s): o relógio das regiões corre a
**36× em média e 55× no pico**, e fica **acima de 30× por 16,3 s** (t = 8,85 a
25,17). É exatamente o regime que comprou o conserto do irmão.

#### POR QUE ELE NÃO FOI LIGADO NA F3 (investigado, medido, e PARADO)

**A premissa de que "a chave é um zero literal, basta virá-la" está ERRADA, e é
esse o achado.** O zero é `LAPSE_K` (`stellarBody.ts`), e ele não é a chave do
conserto — é a chave do **modo lapse inteiro**. Três fatos, conferidos na fonte:

1. **Virar `LAPSE_K` acelera o relógio junto.** `cycleMultiplierFor(lapse)` =
   `1 + 39·√lapse` (`sol/cycle.js`) é lido pelo wrapper como `cycMul` para
   avançar `cycleTime`. Qualquer valor > 0 já multiplica o relógio (1e-6 dá
   1,039×; 1 dá 40×) POR CIMA dos 36× da dramaturgia — e o `if (desired >
   cycleTime)` do empurrão deixaria de disparar no meio, trocando a dramaturgia
   do arranque. Ligar o conserto e mudar o Sol seriam a mesma linha.
2. **E ligá-lo "de leve" não liga o conserto.** A força das rampas largas é
   `cycleEasingFor(m)` = `(m−1)/8` grampeado em [0,1]: para entrarem INTEIRAS é
   preciso m ≥ 9, ou seja `lapse` ≥ 0,042 — que é pôr o relógio a 9× de
   propósito. Não existe dose que compre só o conserto.
3. **A aceleração da casa é INVISÍVEL para o gate do conserto.** O `if` de
   `lifeEnvelopeEased` pergunta por `LAPSE_K` e pelo evento de ciclo; a casa não
   usa nenhum dos dois — ela empurra `cycleTime`/`cycleWarp` DIRETO, e
   `cycleMultiplier()` continua devolvendo 1. `cycleEasingFor(1)` = 0. Os 55×
   que a casa roda não chegam à função que decidiria alargar as rampas.

**O conserto certo é um sinal NOVO** — a taxa de warp do próprio relógio da casa
alimentando `cycleEasingFor` —, e ele **exige editar `sol/activity.js`**, que a
**regra M3 do NORTE proíbe** ("corrigir bug do núcleo = corrigir LÁ e re-copiar").
A exceção é a **decisão 1 do §6 deste bastão, que continua ABERTA com o dono**.

**E há uma bifurcação que precisa da decisão dele ANTES, não depois:** sob
`?shot=` o `delta` é 0, mas `updateActiveRegions` roda com o warp já aplicado.
Um conserto que valha na captura **move os md5 do Sol** — inclusive os quatro
que a F3 acabou de pôr para aprovação; um que só valha com `delta > 0` sai
**zero pixel e invisível para os 12 juízes da casa**, que olham quadro
congelado. É o aviso do §8.4 repetido palavra por palavra: conserto
ANTI-TREMELUZIR pede a régua de MOVIMENTO que a casa ainda não tem.

**Recomendação:** não ligar antes de (a) o dono decidir o §6.1 e (b) existir a
bancada de movimento. Empilhar uma segunda mudança de baseline no `sol` no exato
momento em que a primeira espera aprovação é o pior momento possível.

### 8.3 Defeitos da casa que a varredura encontrou

| # | Defeito | Tamanho | Risco de pixel |
|---|---|---|---|
| 1 | **FECHADO em 2026-08-13.** ~~Dois dedos na tela trocam o enquadramento sozinhos.~~ Cada evento do 2º dedo é medido contra o 1º: gira 25° de uma vez (200 px × 0,0022 rad/px) e rearma o relógio do clique curto — o Atlas foca outro nome, desce um degrau e reescreve `?foco=` sem ninguém pedir. O grampo de 140° não segura, porque 25° cabe nele. Levantar um dedo mata o arrasto do que ficou. | 15–25 linhas | zero |
| 2 | **FECHADO em 2026-08-13.** ~~`pointercancel` e `lostpointercapture` não existem~~, o cursor nunca muda, o menu do botão direito não é bloqueado. Gesto cancelado pelo sistema deixa o arrasto **preso para sempre**. | junto do #1 | zero |
| 3 | **Os 1.321 testes não rodam no CI.** O único arquivo de automação roda `npm run build` e mais nada. | 2 linhas | zero |
| 4 | **A escada de rendição não existe.** `cvolKilled` e `cmeKilled` são **lidos e nunca escritos**: quando o quadro cai, a casa derruba a resolução da galáxia inteira e o Sol segue no custo cheio. Agravante: o tier do Sol congela no arranque, então o desligamento por subsistema é a **única** alavanca que resta. | pequeno | baixo |
| 5 | ~~**Nenhuma das 22 vistas oficiais liga o modo Atlas.**~~ **FECHADO na F2 (2026-08-13)**: a vista `atlas` (`e9544b84cca2`) entrou e a lei do clarão passou a ter juiz. O que ela revelou está na F2 — a lei modera e não resolve. | 1 vista | feito, 0 px |
| 6 | **Memória de vídeo paga e não usada:** a casa desenha em alvo próprio e o buffer de profundidade da tela não oculta nada — 22,9 MB a 1512×945, ~59 MB a 2560×1440. O irmão mediu 138 MiB liberados. | 1 palavra | baixo, com vigília |
| 7 | **Rótulos afiam ao trocar de monitor, a cena 3D não** — a nitidez da cena é decidida uma vez no arranque. É a única incoerência desta lista que o visitante **vê hoje**. | médio | médio |
| 8 | **O selo declara dois artifícios e desenha três:** os espinhos de difração das estrelas não estão declarados. | pequeno | zero |
| 9 | **35 ponteiros pendurados no vazio:** os arquivos vendorizados citam 35 vezes imagens (`ref-06`, `ref-10`…) que não existem na casa. | baixar 6 arquivos | zero |
| 10 | **Travamento na entrada do Atlas (a MEDIR):** com o Sol fora de quadro o subsistema para, mas o relógio desejado continua subindo; na volta a diferença vira salto num quadro — ~357 unidades na entrada do Atlas, 1.206 no 1º quadro da sessão. Salto > 20 dispara 120 passos de simulação num quadro só, em texturas 768×384. | 1 medição | zero para medir |

**Fecho dos itens 1 e 2 (2026-08-13).** Os dois gestos da casa — o trio do `Director` (Atlas + pausar-e-olhar) e o do `FreeRoam` (voo livre) — eram cópias um do outro com os mesmos defeitos; passaram a falar com uma máquina só, `src/three/arrastoDePonteiro.ts`, sem DOM e testada em `node`: dono por `pointerId`, botão principal, e `pointercancel`/`lostpointercapture` encerrando o gesto SEM clique. O menu de contexto é bloqueado no canvas (um dono, no `Director`) e o cursor de agarrar entra só nas fases em que o arrasto move a câmera (`arrastoFazAlgo`, `three/fases.ts`). 39 testes novos (1.371 → 1.410), `tsc` limpo. **Zero pixel**: nada disso roda sem toque, botão direito ou gesto cancelado, e cursor não entra em captura de tela.

### 8.4 Aprendizados sem defeito associado

- **A auto-exposição da Onda 8 já existe montada e rodando no irmão**
  (`src/main.js:1042-1055`, não no arquivo de pós — por isso ninguém a achou):
  alvo `1/(1+0,55·(0,42·cobertura + …))` com cobertura = ângulo do corpo ao
  quadrado, fecha em 0,5 s, abre em 3,0 s, piso 0,684, **sem ler um pixel da GPU —
  é geometria pura**. O que não vem junto é o atuador (lá ele mexe na exposição do
  quadro inteiro, o que o NORTE da casa proíbe). Aviso: no irmão o efeito é **zero
  no modo de captura** — se a Onda 8 nascer assim, nenhum juiz olha para ela.
- **Duas sondas de medição de risco zero:** a régua do borrão (reduz o quadro a
  64×64 e devolve cobertura, energia e **raio** do clarão — a casa só mede "fração
  acima de meia luz", que não separa quadro quente de quadro espalhado) e a sonda
  de cor (pinta cinzas conhecidos sobre o quadro pronto: 0,18 tem de sair 118;
  46 = falta a conversão final, 181 = ela está sendo aplicada **duas vezes**).
- **A régua de MOVIMENTO.** Os 12 juízes da casa olham quadro congelado. O irmão
  foi enganado **duas vezes** por isso e construiu bancada que mede tremeluzir,
  piscar e ruído-vs-estrutura em quadros consecutivos — e ela pagou na hora
  (confirmou as plumas polares, **refutou** os fios de coroa: 0,318% contra 0,318%
  do controle). **Preço maior do que parece:** sob captura o relógio do Sol da casa
  é **zero** — granulação, coroa e partículas estão congeladas em toda foto que
  tiramos. Portar exige 4 peças novas.
- **Seis fotos reais do Sol** passam na régua da própria casa (2 eclipses NASA, 2
  do coronógrafo SOHO/LASCO com crédito obrigatório, 2 de disco inteiro em H-alfa
  com natureza declarada), 1,68 MB. **E os números vêm de graça, sem imagem:**
  manchas medem 0,005–0,086 do raio; o disco é tonalmente muito plano;
  proeminências do dia a dia são baixas (0,03–0,08 R); a base do capacete coronal
  tem 30–40° e afunila em 1,5–2,5 R; o brilho total da coroa é **1 milionésimo**
  do disco.
- **A granulação desenhada não é física em lugar nenhum:** célula de ~45 Mm no
  tier alto e ~70 Mm no baixo, contra **~1 Mm** do grânulo real — e a escala muda
  **55% conforme a placa de vídeo do visitante**.
- **A dose de ejeção roda sem calibração:** a casa subiu de 0,9 para 1,4, e o alvo
  numérico que calibrou a forma (razão frente-cavidade ≥ 2×) foi medido com 0,9 e
  sob outra cadeia de cor. **Nenhuma medição, em nenhum dos dois projetos, tocou o
  1,4 que rodamos.**

### 8.5 O que NÃO transplanta (dizer isto poupa tanto quanto trazer)

O irmão tem **um** corpo, centrado, e nada mais em cena.

- **Desfoque de profundidade hexagonal** — ele deduz profundidade por geometria
  ("dentro do disco é a esfera, fora é fundo"). Na casa, "fora do disco" são
  estrelas a milhares de parsecs, e borrar estrela é apagar dado fotométrico.
- **Imagens de referência versionadas** — funcionam porque ele renderiza por
  software. A casa gasta 245,6 ms de GPU por quadro numa placa real; por software
  não é lento, é inviável.
- **~10 das 30 ferramentas dele** testam quiosque de museu, visita guiada bilíngue
  e um painel de 39 botões. A casa não é isso.
- **A torção do enquadramento (polo do corpo ≠ "cima" da tela): não há resposta
  lá.** O irmão tem o **mesmo** defeito, de 7,25°, porque só um corpo de inclinação
  pequena aparece. Na casa custa 27,8° na Terra, porque os corpos vão de 0,03° a
  177°. **Quem for consertar não vai achar nada pronto no irmão** — e dizer isso
  poupa uma rodada inteira.
- **O ganho de arrasto dele (2,5× o nosso) e o arremesso com inércia** — a faixa
  do Atlas tem 140° no total; com o ganho dele, 400 px varreriam 126°, 90% da
  faixa. Só fazem sentido se existir um eixo **sem** limite.
- **O rastro anamórfico de lente** — cabe e é barato, mas é mais um artifício num
  produto cuja tese é separar o medido do ajustado.

### 8.6 E o poço secou

O roadmap do irmão está **esgotado**: as seis fases e os três blocos extras estão
todos entregues, e o que sobra são dívidas dele — duas das quais caem justamente
sobre a dose que a casa usa. **A partir daqui os aprendizados vêm de medir a
Viagem, não de ler o irmão.**
