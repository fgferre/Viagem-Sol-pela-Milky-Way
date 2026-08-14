# A lei da estrela — uma mecânica só, do Sol aos bilhões

**O que este documento é:** o contrato único de como uma estrela é desenhada nesta
casa, em qualquer distância, e a ordem de trabalho para chegar lá a partir do que
já existe. Ele nasce em 2026-08-14, de um censo do código inteiro, e substitui as
promessas soltas das Ondas 7 e 8 — que continuam válidas no espírito e estavam
erradas no alvo.

**A decisão do dono, em uma frase:** *uma estrela nunca "vira outra coisa"; ela só
muda de tamanho.* SpaceEngine é a referência declarada.

---

## 1. A LEI

Existem **duas coisas**, sempre as mesmas, sempre juntas:

**O disco** é a estrela. Tem tamanho angular verdadeiro, que encolhe com `1/d`. O
**brilho de superfície dele NÃO muda com a distância** — só a área muda. Chegar
perto de uma estrela não a deixa mais brilhante; deixa maior.

**O clarão** é a lente (halo + espinhos de difração). Não é a estrela: é artefato
do instrumento. Existe em **toda** distância, acompanha o fluxo recebido, e nunca
pode ser ocluído pelo corpo que o causa.

**A troca.** Abaixo de **um pixel** não há disco para desenhar — é aritmética de
tela, não escolha. Aí entra um ponto que carrega **exatamente o mesmo fluxo** que o
disco carregava. Feito assim, a troca é invisível por construção.

**A pupila.** A faixa entre "estrela enchendo o céu" e "pontinho" é de ~15 ordens
de grandeza; a tela tem 2. Uma câmera que se adapta não é enfeite, é a única forma
de a física caber. Ela escurece **tudo junto** — no instante em que escurece só a
fonte que incomoda, virou teto de brilho e virou mentira.

### O invariante que amarra tudo

> **Em toda troca de representação, o fluxo integrado é o mesmo dos dois lados.**

Vale para disco↔ponto, para catálogo↔cascas, para cascas↔partículas da galáxia e
para partículas↔lâminas. É o único teste que separa "lei" de "quatro camadas que
por acaso se parecem".

---

## 2. O CENSO — o que existe hoje (2026-08-14)

**18 representações** de estrela ou de luz estelar, medidas no código.

| # | representação | onde | lei de brilho | lei de tamanho |
|---|---|---|---|---|
| 1 | catálogo HYG (328.749) | `stars.ts` + `starShaders.ts` | `E = 10^(−0,4(m−expoM0))` | PSF: `2(2,2σ + σ√(2 ln peak))` |
| 2 | cascas procedurais | `wrappedStars.ts` | mesma PSF, `M_V` sorteado por bin | mesma PSF |
| 3 | Sol-ponto (vértice 0) | `planetas.ts` | mesma PSF, `aMagBase = −0,15` | mesma PSF |
| 4 | os 9 planetas | `planetas.ts` | mesma PSF + fase MH18 | mesma PSF |
| 5 | 16 clarões hero | `heroStars.ts` | **de autor**: core/glow/spikes | **`0,08·10^(−0,3m)` pc** |
| 6 | SunStar (o Sol de longe) | `heroStars.ts` | mesmo FRAG, `uGain` da janela | ângulo `min(40°, 1,75°·10^(−0,3m))` |
| 7 | corpo do Sol | `stellarBody.ts` + `sol/*.js` | **paleta H-alfa literal**, radiância ~1 | raio físico |
| 8 | partículas da galáxia (4,02 M) | `galaxy.ts` + `galaxyShaders.ts` | `aAlpha` artístico ∈ [0,001; 0,7] | `px = aSize·H/(2·tan·d)` |
| 9 | 7 lâminas emissivas do disco | `galaxyShaders.ts` | bake artístico | plano de 33,6 kpc |
| 10 | glow do bojo | `galaxy.ts:760` | `GLOW_FRAG` | `uSize` em pc |
| 11 | halo térmico | `galaxy.ts:782` | `GLOW_FRAG` | idem |
| 12 | anã de Sagitário | `galaxy.ts:798` | `GLOW_FRAG` | idem |
| 13 | marcador do Sol | `galaxy.ts:811` | `GLOW_FRAG` pulsante | idem |
| 14 | forjas (5 populações) | `starForges.ts` | `aIntensity` por população | por população |
| 15 | luz integrada da faixa | `nebulaShaders.ts:382` | termo `stellar` do raymarch | — |
| 16 | campo 2D do carregamento | `CartografiaCanvas.ts` | sorteado, paleta pintada | sprites |
| 17 | splats do bake da cartografia | `structureMap.ts:287` | `(17−mag)/8` | gaussiana |
| 18 | bloom + gradação do Atlas | `post.ts` + `atlasConfig.ts` | decide o tamanho do clarão de TODAS | — |

### As divergências medidas

- **9 famílias de cor.** Uma é a lei da casa (Ballesteros B−V → Teff →
  `blackbodyLinear`), usada por catálogo, cascas e heroes, e as três concordam bit
  a bit. As outras oito divergem. A pior: **o Sol de perto tem cor de autor
  (paleta H-alfa) e o Sol de longe tem cor de Ballesteros** — a mesma estrela, duas
  cores. E a fórmula de Ballesteros existe em **três cópias** (`common.ts` GLSL,
  `common.ts` CPU, `stellarPhysics.ts`), das quais só duas têm acordo anti-divergência.
- **6 leis de magnitude aparente**, com dois pontos-zero incompatíveis: o campo
  usa `M_V☉ = 4,85` e o `SunStar` usa `4,83` (0,02 mag, pinado como intencional).
- **A lei do clarão não é fotometria.** `0,08·10^(−0,3m)` — expoente −0,3, sem
  parentesco com o −0,4 da lei fotométrica. É o único lugar da casa em que o
  TAMANHO de uma estrela sai de magnitude em vez de raio.
- **O vão radiométrico: ~26 magnitudes** entre a fotosfera da malha (radiância
  autorada ~1) e a lei do ponto (~2,8e10 para a MESMA superfície). É a maior
  mentira de escala da casa e **não quebra nenhum teste**, porque o cadastro de
  escala só tem coluna para TAMANHO.
- **6 pares de dupla-luz**, 4 já desfeitos. Os 2 abertos:
  - Sol-ponto ↔ corpo do Sol: a cessão existe mas é inócua (a 1 UA dá 0 exato) e a
    malha, sendo opaca, **oclui** o ponto — é daí que nasce o passo para trás na luz;
  - partículas da galáxia ↔ lâminas emissivas: **sem cessão nenhuma**, somam em aditivo.

### A galáxia já tem a lei certa E o mesmo defeito

A lei de tela das partículas tem **três regimes**:

| faixa | fluxo | veredito |
|---|---|---|
| `px < 0,7` | `∝ px² ∝ 1/d²` | **certo** — é a troca sub-pixel conservando fluxo |
| `0,7 ≤ px ≤ 3` | `∝ px² ∝ 1/d²` | **certo** — brilho de superfície constante |
| `3 < px ≤ 20` | platô constante | teto artístico anti-estouro |
| `px > 20` | `∝ 1/px² ∝ d²` | **a estrela ESCURECE ao ser aproximada** |

Ou seja: **o precedente exato da lei que queremos já roda em produção**, nos dois
primeiros regimes, sobre 4 milhões de pontos. E o mesmo defeito do Sol — escurecer
ao chegar perto — já está lá, assumido como teto anti-estouro. Os dois regimes de
cima existem porque não havia pupila. Com pupila, eles não têm razão de existir.

---

## 3. O CAMINHO

Sete passos. Os dois primeiros destravam todos os outros; nada acima de F2 funciona
antes de F2.

### F1 — Uma unidade de luz para a casa

Hoje há **três normalizações independentes que não se convertem**: `ANCORA_UA = 1`
(a Terra a 1 UA lê 1), `expoM0 = 3,5` (a magnitude cujo pico de PSF vale 1) e
`M_V☉ = 4,83`/`4,85`.

Âncora escolhida: **a radiância da fotosfera solar**. Tudo passa a ser "quantas
vezes a superfície do Sol". A razão não é gosto:
- é a única grandeza **invariante com a distância**, que é o fato físico central da lei;
- é diretamente comparável entre disco e ponto (`fluxo = radiância × ângulo sólido`),
  que é exatamente o invariante da troca;
- e o número mais duro da casa (o vão de 26 magnitudes) é literalmente "a superfície
  do Sol, medida de dois jeitos".

Entrega:
- `src/three/luzDaCasa.ts` — puro: a âncora, `fluxoDeEstrela(teffK, raioPc, distPc)`
  por Stefan-Boltzmann, e a ponte `magnitude ↔ fluxo` que faz as três normalizações
  virarem uma. No dia 1 ela devolve os números de hoje: nada move.
- **A segunda coluna do cadastro de escala.** `escala.ts` declara mentiras de
  TAMANHO e não tem onde declarar mentira de BRILHO — por isso o vão de 26
  magnitudes nasceu calado. Abrir `fatorDeBrilho` é o que impede a próxima.

### F2 — Pôr a fotosfera na unidade

A malha do Sol emite ~1; tem de emitir a radiância verdadeira. Como half-float
satura em 65.504, a multiplicação acontece **na emissão**, junto com o ganho da
pupila — a malha entra na pupila.

Sem abrir os 14 vendorizados: o adaptador já tem o precedente de injeção
(`ctx.SUN_R_GLSL`, `ctx.SEG_EPS_GLSL`), e `onBeforeCompile` fecha o resto.

Teste que define o sucesso: **no ponto de 1 pixel, o fluxo integrado do disco é
igual ao do ponto.** É o fim do passo para trás na luz, e é o que destrava o item 3.

### L1 — A lei única, em uma peça pura

`src/three/world/estrela.ts`. Entrada `{teffK, raioPc, posição}` + câmera + tela.
Saída `{diâmetro em px, fluxo recebido, cor}`. **Nenhuma camada volta a inventar
brilho ou tamanho.** Todas as 18 passam a consumir daqui.

### L2 — A troca em 1 pixel, conservando fluxo

O gate do palco (4 px, sai em 2) é regra de **corpo texturizado**: abaixo de 4 px um
globo com textura não tem o que mostrar. Estrela é diferente — o disco é uniforme e
serve até 1 px. Os planetas ficam com a regra deles; as estrelas ganham a de 1 px,
com a razão escrita.

A rampa não se inventa: **`subPix = px²/0,49` da galáxia já é essa lei**, rodando
sobre 4 milhões de pontos. Adotar, não reinventar.

### L3 — O clarão contínuo, derivado do fluxo

Morre `size = 0,08·10^(−0,3m)`. O tamanho do clarão passa a sair do fluxo recebido
pela mesma raiz-do-logaritmo que a PSF já usa (`rSat = σ√(2 ln peak)`) — que é,
aliás, como um clarão real cresce.

Uma camada de clarão só, sempre acesa, para as **N fontes mais brilhantes em
quadro** — um orçamento, não uma lista de 16 nomes. Com isso caem, de uma vez:
`LOD_SOL.entrega` (a janela 0,02–0,05 pc), `sunStarGain`/`deepPointGain`, a classe
`SunStar`, a identidade "as 16 heroes" e **a cessão por dominância** — que existe só
para arbitrar uma dupla-luz que deixa de existir.

### L4 — A pupila ligada, alcançando tudo

Já está montada, testada e desligada (`?pupila=1`). Falta ela alcançar malha,
partículas, lâminas, glows e forjas. Aí ela deixa de ser "exposição das fontes
pontuais" e vira o que o §7.4 pede: **um ganho linear único de cena**.

### E — Todas as estrelas

- **E1.** `teffK` e raio saem do catálogo: `ci → Teff` (Ballesteros, que já roda) e
  raio por Stefan-Boltzmann. **Zero byte novo.** `stellarPhysics.ts` (816 linhas,
  hoje sem nenhum consumidor de runtime) tem as leis prontas — **mas os oráculos
  dele pinam valores de RENDER, não físicos** (Rigel 283 R☉ contra ~78 reais).
  Acordá-lo é reescrever os oráculos, nunca satisfazê-los.
- **E2.** O Sol sai da camada dos dez corpos. Ele não é um planeta: é a instância
  nº 1 da lei estelar. A dupla-luz morre na raiz, em vez de ser arbitrada.
- **E3.** `StellarBody` parametrizado por `teffK` (cor) e `convective` (granulação e
  manchas: estrela fria ferve, estrela quente é lisa). A paleta H-alfa continua —
  como **override declarado da instância nº 1**, não como lei.

### G — Os bilhões

- **G1.** `aAlpha` deixa de ser artístico e vira fluxo na unidade da casa (um grumo
  de N estrelas não resolvidas tem fluxo integrado calculável). Aí o platô de 3–20 px
  e o ramo que escurece acima de 20 px **morrem**: eram anti-estouro, e o
  anti-estouro honesto é a pupila.
- **G2.** Cessão partículas ↔ lâminas — a única dupla-luz sem mecanismo nenhum. O
  molde já existe e funciona (`unresolved`/`resolvedByCatalog`).
- **G3.** **A promoção.** Hoje uma partícula da galáxia nunca vira estrela do
  catálogo. Com uma unidade só, a escada fecha em quatro níveis, cada um cedendo ao
  seguinte com fluxo conservado:

  > luz integrada → partícula → casca/catálogo (ponto) → corpo

  É isto que "uma mecânica para bilhões de estrelas" quer dizer.

---

## 4. O QUE SAI

Cada onda apaga o que ela substitui — item resolvido sai da lista, não vira camada
por cima.

| o que | onde | por quê |
|---|---|---|
| `LOD_SOL.entrega` {0,02; 0,03; 0,05} pc | `lodStellar.ts:176` | a janela ponto↔clarão só existe porque o clarão era gateado; com clarão contínuo, não há o que entregar |
| `sunStarGain` / `deepPointGain` | `lodStellar.ts:217-243` | idem — e com eles a "soma 1 exato" que os testes varrem |
| classe `SunStar` | `heroStars.ts:232` | o Sol deixa de ter clarão próprio: usa o da casa |
| a identidade "as 16 heroes" | `heroStars.ts` | vira orçamento das N mais brilhantes em quadro |
| `size = 0,08·10^(−0,3m)` + `ESPELHO_COEF_CLARAO_PC` + o exemplar Sirius | `heroStars.ts:151`, `escala.ts:184,197` | tamanho de estrela deixa de sair de magnitude |
| cessão por dominância (`heroDominanceFade`, `HERO_DOMINANCE`) | `lodStellar.ts:884+` | árbitro de uma dupla-luz que deixa de existir |
| `DISC_ENTER_RAD` / `DISC_EXIT_RAD` / `shouldDiscBeActive` | `lodStellar.ts:499-560` | dormentes, ancorados no raio artístico morto; a regra de 1 px os substitui |
| `RAIO_ARTISTICO_DO_SOL_PC` como âncora viva | `escala.ts:123` | só sobrevive porque três números nunca foram re-derivados dele |
| `claraoDoAtlas` (o apagamento de 100×) | `atlasConfig.ts:362` | curativo do item 3; morre com ele |
| `aFocus` (2,6 MB de canal morto) | `stars.ts:66`, `starShaders.ts:28` | nasce zerado, ninguém escreve 1 — item 38 |
| platô 3–20 px e ramo `1/px²` da galáxia | `galaxyShaders.ts:68-74` | anti-estouro artístico que a pupila substitui |
| `ANCORA_UA = 1` | `luz.ts:59` | o próprio cabeçalho já diz que é provisória e que é ELA que move quando a radiometria fechar |

---

## 5. O QUE VAI QUEBRAR DE PROPÓSITO

A casa cobra muita coisa por **varredura textual do código-fonte**. Estes testes
falham quando a fundação mudar, e falhar é o comportamento correto — mas quem
mudar tem de reescrever o oráculo, não contorná-lo:

- `escala.test.ts:63-69` casa a regex `const size = ([\d.]+) \* lum;` contra o fonte
  de `heroStars.ts`. L3 apaga essa linha.
- `pupila.test.ts:31-33` exige o texto literal das três linhas de `GLSL_STAR_PSF`.
  F1 mexe nelas.
- `lodStellar.test.ts:726` cobra `ponto + clarão === 1` com `Object.is` em ~22.000
  distâncias; `:1688` exige o literal `return 1 - sunStarGain(dPc);`. L3 mata os dois.
- `luz.test.ts` pina a lei de luz por corpo inteira, e `terra.test.ts:499` /
  `lua.test.ts:294` pinam `uLuzGanho` bit a bit. F1 os toca.
- `stellarPhysics.test.ts` pina ~60 valores, **vários deles não físicos** (Rigel
  283 R☉). E1 os reescreve.
- `corpos.test.ts:246` crava que o Sol arma em 3,60 UA e desarma em 7,19 UA. L2 move.

## 6. DUAS ARMADILHAS NOMEADAS

1. **`RAIO_SOL_PC` significa duas coisas.** `escala.ts:90` = 2,2567e-8 pc (a
   fotosfera); `frameGalactico.ts:91` = 8.150 pc (o raio galactocêntrico). Onze
   ordens de grandeza, mesmo identificador, os dois exportados, nenhum teste cobra a
   distinção — **um import errado compila, roda e mente.** Renomear antes de F1.
2. **Não confundir cessão com duplicidade.** O censo de duplicidade anterior já
   produziu um falso positivo grave ("a faixa da galáxia é desenhada 2×" era uma
   cessão funcionando). Antes de costurar qualquer par, conferir se não é uma cessão
   que já funciona — quatro dos seis pares JÁ estão desfeitos.

---

## 7. A PERGUNTA QUE É DO DONO, NÃO DO AGENTE

Com a lei honesta, **quando o Sol enche o quadro o céu fica preto.** É o que uma
câmera faz e é o que o SpaceEngine faz. O filme pode querer as estrelas visíveis ali.

Isso é gosto, não mecânica. A casa já tem o vocabulário — a luz assistida
(`E^0,35`) é exatamente uma compressão declarada no selo. Purista ou
cinematográfico é decisão dele; a lei acomoda os dois, e o selo confessa qual está
valendo.
