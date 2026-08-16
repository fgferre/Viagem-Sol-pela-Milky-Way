# A lei da estrela — uma mecânica só, do Sol aos bilhões

**v2.1 — 2026-08-15.** Por que a v1 caiu, em três linhas: (a) ela nasceu em 14/08 e a
onda da luz entrou em 15/08 somando **+1.216 linhas em 12 arquivos**, então o
"contrato único" passou a descrever o dia anterior; (b) a lei do clarão que ela
propunha como conserto (`√ln`) é a **doença** do halo constante — encolhe menos que
o defeito que ia consertar; (c) o custo declarado no §7 estava com o **sinal
invertido**, e um contrato que erra o próprio custo autoriza qualquer camada nova.

**De onde vem a v2:** quatro relatórios de crítica adversarial que auditaram a v1
contra o código vivo e contra as capturas de 15/08 — deles saem os números deste
texto — mais um **plano conceitual externo consolidado pelo dono, 15/08**, que
validou a direção e acrescentou quatro peças: estabilidade temporal como cláusula de
arquitetura, detalhe como campo filtrado por pegada anisotrópica, a esfera analítica
como regime intermediário, e o corpo estelar como três campos do mesmo estado.

**O que a v2.1 corrigiu na v2.0** (segunda rodada de revisão externa, mesma data):
o contrato virou **três** (estado lógico / observação / instrumento) em vez de
misturar a estrela com quem a olha; a mistura virou **dois eixos** contínuos em vez
de um booleano que garantia pop; o **clarão deixou de ser gateado** pelo peso do
ponto, que contradizia o §1; a pegada virou objeto completo (covariância, frequência
máxima, limbo nomeado); o aceite final ganhou lista própria, separada do estágio
intermediário; a identidade da fonte passou a atravessar as representações; e o
movimento da câmera entrou como obra própria (§9).

**O que este documento é:** o contrato único de como uma estrela é desenhada nesta
casa, em qualquer distância, e a ordem de trabalho para chegar lá a partir do que
já existe. Ele substitui as promessas soltas das Ondas 7 e 8 e a v1 de 14/08 — que
continuam válidas no espírito e estavam erradas no alvo.

**A decisão do dono, em uma frase:** *uma estrela nunca "vira outra coisa"; ela só
muda de tamanho.* SpaceEngine é a referência declarada.

---

## 1. A LEI

Existem **duas coisas**, sempre as mesmas, sempre juntas, e **uma repartição** entre
elas — nunca duas leis concorrendo. Mudar de **regime** não é "virar outra coisa": é
a mesma estrela, com o mesmo fluxo e a mesma cor, desenhada pela matemática que cabe
naquele tamanho de tela. A frase do dono continua inteira porque a repartição é
contínua e conserva fluxo por construção; o que ela proíbe é o salto.

**O disco** é a estrela. Tem tamanho angular verdadeiro, que encolhe com `1/d`. O
**brilho de superfície dele NÃO muda com a distância** — só a área muda. Chegar
perto de uma estrela não a deixa mais brilhante; deixa maior.

**O clarão** é a lente (halo + espinhos de difração). Não é a estrela: é artefato
do instrumento. Existe em **toda** distância, **deve** acompanhar o fluxo recebido —
hoje **não acompanha** (item 42: o borrão cresce de 119 px a 5.000 UA para 619 px a
10.800 UA enquanto o fluxo do Sol **cai** 10×, `capturas/voo-ida-e-volta.json`) — e
nunca pode ser ocluído pelo corpo que o causa. Regra escrita no indicativo é lida
como verdade e faz a migração pular a verificação: aqui ela é **dívida nomeada**.

**A repartição, em DOIS EIXOS.** Abaixo de **um pixel** não há disco para desenhar —
é aritmética de tela, não escolha. Mas a pergunta "resolvida ou não" e a pergunta
"impostor ou geometria" são **duas**, e misturá-las num só número foi o que produziu
as quatro rampas de hoje. A lei separa os eixos e mantém a conservação **tautológica
nos dois**:

- **Eixo ÓPTICO — o que a imagem estelar É:** `wPonto + wResolvido = 1`, com régua
  `discoPx` contra a pegada do pixel. Responde apenas: a fonte é resolvida?
- **Eixo de REPRESENTAÇÃO — como o resolvido é DESENHADO:** `wEsfera + wMalha = 1`,
  com régua no **requisito geométrico**, que é **contínuo**: proximidade da
  superfície e amplitude de displacement projetada em px, **com histerese**.
  Responde apenas: impostor ou geometria?

**Pesos finais:** `ponto = wPonto`; `esfera = wResolvido·wEsfera`;
`malha = wResolvido·wMalha`. Somam 1 por construção, sem nenhuma soma verificada por
sorte. **Não existe booleano nesta lei:** uma bandeira `exigeGeometria` é um pop
garantido, e pop é o defeito que este documento existe para matar. Toda rampa que
hoje mede outra coisa (o halo, a dominância, o gate de 4 px) some dentro destes dois
eixos.

**A esfera analítica é um regime oficial** *(plano conceitual externo consolidado
pelo dono, 15/08)*: interseção raio-esfera resolvida dentro de um quad, sem malha.
É barata, cobre uma faixa enorme de distâncias, e é **com ela que as outras estrelas
ganham corpo** quando a câmera se aproxima, sem custo de geometria. A malha deixa de
ser "o jeito de ter um corpo" e passa a ser o que se paga só quando a geometria
cobra: câmera colada, displacement visível, horizonte curvo atravessando o quadro,
interseção com outra coisa da cena.

**Confundir os dois eixos** é trocar de representação por motivo de textura, ou
fingir detalhe por motivo de distância. **A pegada controla o DETALHE; o requisito
geométrico controla a REPRESENTAÇÃO.** Nunca o contrário, nunca o mesmo número.

**O CLARÃO NUNCA É GATEADO POR `wPonto`.** A óptica age sobre a **imagem estelar
inteira** — resolvida ou não. Uma estrela que virou disco não perde o halo: uma
câmera apontada para o Sol de perto produz *mais* clarão, não menos. Então o ganho
do clarão deriva **do FLUXO, sempre presente**, e o que desvanece com `wResolvido`
é apenas **o ponto-como-objeto** (o sprite que substituía o disco), nunca a óptica.
Ligar o clarão a `wPonto` contradiz a linha do §1 que diz "existe em toda distância"
e reintroduz, com nome novo, o gate que este documento veio matar.

**A PARTIÇÃO DE ENERGIA da asa: UM dono.** A asa pode ser desenhada de dois jeitos —
explicitamente, no perfil da fonte, e implicitamente, pelo kernel do bloom. Se os
dois a desenharem, **o halo conta duas vezes** e a lei fica mentindo por um fator que
ninguém declarou. A lei: **o desenho explícito é o dono da asa**; o bloom fica
**confinado abaixo do ombro**, cuidando do brilho, não da extensão. A fração de
energia que cabe a cada um é **declarada como número**, no cadastro e no selo, e é
verificada quando a pirâmide for repesada (§4, M2).

**A aproximação nunca CRIA detalhe; ela REVELA o que já pertencia ao mesmo estado**
*(mesma origem)*. O que se vê a qualquer distância é o **mesmo campo**, filtrado
espacialmente pela **pegada do pixel** sobre a superfície. E a pegada é um objeto
completo, não um número:

- **dois vetores diferenciais no plano tangente** (equivalentemente, uma
  **covariância 2×2**) — o que carrega a **orientação** da elipse, e é a orientação
  que a filtragem isotrópica joga fora;
- **a frequência máxima permitida** que sai dela, que é o que o campo procedural
  consulta antes de somar qualquer oitava;
- **tratamento nomeado da singularidade do limbo**, onde a elipse degenera: ali a
  pegada tende ao infinito na direção radial, e é preciso dizer com que lei ela é
  limitada — senão o limbo ferve enquanto o centro está liso;
- `dFdx`/`dFdy` é o **mecanismo inicial**, não a especificação. A especificação é a
  covariância; o mecanismo pode mudar sem que a lei mude.

**Proibido latitude/longitude como domínio procedural primário.** O domínio é a
esfera (ruído 3D na direção `n`, ou equivalente sem polos). Lat/lon só é lícita para
fenômenos **semanticamente** solares — cinturões de manchas, rotação diferencial —
onde a coordenada *significa* alguma coisa. Usá-la como grade de textura empilha
detalhe nos polos e é a origem clássica do polo que ferve.

**Duas trocas, não uma.** A casa faz **duas** trocas de representação e só uma
conserva fluxo:
1. `ponto ↔ disco`, **fluxo conservado** — o invariante abaixo;
2. `radiância verdadeira ↔ superfície autorada` (o filtro solar), **fluxo NÃO
   conservado**: 26,09 magnitudes, desvio declarado no cadastro e no selo.
   Não é remendo: é uma **escolha de instrumento** e tem seção própria (§5.7).

**O clarão tem ASAS.** `√ln fluxo` é a assinatura exclusiva de um perfil gaussiano —
isto é, de um perfil **sem asas**. Perfil de instrumento real tem asa em lei de
potência: aureola atmosférica (King 1971, Racine 1996) ∝ θ⁻²; envoltória de Airy ∝
θ⁻³; Moffat ∝ θ⁻²ᵝ; a função de ofuscamento CIE/Spencer 1995 soma gaussiana +
θ⁻³ + θ⁻². Para asa `p ∝ θ⁻ⁿ`, o raio visível a limiar `T` é

> **R = θ₀ · (F/T)^{1/n}  ⇒  R ∝ F^{1/n} ∝ d^{−2/n}**

e — a linha que fecha o assunto — **a compressão `β·asinh` NÃO altera esse
expoente**: de `β·ln(2Fθ⁻ⁿ/β) = T` sai `θ ∝ F^{1/n}`, igual. A curva comprime o
**valor**, nunca o **tamanho**. Nenhum β, nenhum ombro e nenhum joelho conserta o
halo constante; só a forma da asa conserta.

Das duas âncoras que o dono deu — quadro honesto a 1 UA com R ≈ 450 px, e ~8 px a
15.800 UA (o alvo do item 42) — sai `n = 2·log(d₂/d₁)/log(R₁/R₂) = 2·4,199/1,750 =
4,8`:

| família | n | R ∝ | encolhe 1 → 2.000 UA |
|---|---|---|---|
| gaussiana `√ln` (o que a v1 propunha) | — | √ln F | **1,36×** ← a doença |
| autor `0,08·10^(−0,3m)` (o que roda) | 4/3 | d^(−1,5) | 8,9e4× |
| aureola King/CIE | 2 | d^(−1) | 2.000× |
| envoltória de Airy | 3 | d^(−0,67) | 159× |
| **Moffat β≈2,4 (n = 4,8)** | **4,8** | **d^(−0,42)** | **21×** ← alvo |

**A lei do clarão é, portanto:** núcleo gaussiano σ (o que já existe) **+** asa
`f/(1+(θ/θ₀)²)^β` com β ≈ 2,4, fração de espalhamento `f` declarada. Estrela fraca
continua um ponto (a asa fica sob o limiar); estrela forte ganha auréola que
**encolhe com a luz**. O valor final do expoente é **parâmetro de projeto**, não
dogma: entra com gate de foto para o dono, entre 2,0 e 3,0, e o número escolhido
fica escrito ao lado da captura que o escolheu.

**E a mesma asa tem de existir na PIRÂMIDE DO BLOOM.** Metade do borrão que o dono
vê não sai da PSF: sai do kernel. `UnrealBloomPass` roda `nMips = 5`, kernels
`[6,10,14,18,22]`, e o mip 5 em 900/32 ≈ 28 px com σ ≈ 6 px do mip dá **σ ≈ 190 px
em resolução plena** — um número puramente geométrico, que não conhece fluxo
nenhum. É exatamente o halo de 120–180 px medido. Estender a pirâmide (8–12 mips) e
pesar os níveis para a asa escolhida é a segunda metade do conserto; sem ela,
qualquer lei correta no fragment continua sendo apagada pelo bloom.

**A compressão.** A faixa entre "estrela enchendo o céu" e "pontinho" é de ~15
ordens de grandeza; a tela tem 2. Caber é obrigação, e há duas formas: adaptar (a
pupila) ou comprimir com uma curva fixa. **A casa usa a segunda, por decisão do
dono — ver §7.** Ela age em **dois pontos** da cadeia, medidos: na emissão
(`BETA_EMISSAO = 300`, protege o half-float) e **dentro do passa-alta do bloom**,
acima de um ombro (`BETA_DO_BLOOM = 0.45`, `OMBRO_DO_BLOOM = 40`, protege o quadro).
A varredura de β provou que a emissão sozinha não basta — §5.2.

### O invariante que amarra tudo

> **Em toda troca de representação, o fluxo integrado é o mesmo dos dois lados —
> medido PÓS-curva, no que chega ao buffer.**

Vale para disco↔ponto, catálogo↔cascas, cascas↔partículas e partículas↔lâminas. É
o único teste que separa "lei" de "quatro camadas que por acaso se parecem" — e é
**necessário e NÃO suficiente**: ele está VERDE hoje e o item 3 continua vermelho.
Quem fecha o item 3 é `julgarEscada` de `scripts/visual/luz-do-quadro.mjs`
(monotonia + teto + orçamento) **mais** o voo de ida e volta passando. O invariante
sozinho jamais declara pronto.

---

## 2. O ESTADO — o que JÁ é padrão (15/08)

> **Camada TRANSITÓRIA.** Esta seção e a §4 descrevem a travessia, não a doutrina.
> Elas **se podam** conforme as migrações completam — linha migrada sai da lista,
> como em `PENDENCIAS.md` — e desaparecem quando a última fechar. O arquivo continua
> **UM** (doutrina da casa: não se cria pasta de história); o que muda é que §1, §3,
> §5 e §7 sobrevivem, e §2/§4 encolhem até sumir.

**F1 e F2 saem da fila de trabalho.** Estão FECHADOS e viram estado, com endereço.
Todo endereço aqui é **símbolo**, nunca linha: as âncoras de linha da v1 envelheceram
em menos de 24 h e o documento sofria a doença que denunciava.

| peça | endereço (símbolo) | o que faz | destino |
|---|---|---|---|
| a unidade da casa | `luzDaCasa.ts` (âncora, `fluxoDeEstrela`, ponte magnitude↔fluxo) | fotosfera = 1 | **sobe para L1** |
| compressão na emissão | `BETA_EMISSAO`, `lerBetaDaEmissao` (`luzDaCasa.ts`) | β = 300 por fonte | sobe para L1 |
| fotosfera na unidade | `FOTOSFERA_VERDADEIRA`, `radianciaDeTela` (`luzDaCasa.ts`), `cirurgiaDaFotosfera` (`stellarBody.ts`) | a malha emite a radiância verdadeira | sobe para L1 |
| ombro no passa-alta | `BETA_DO_BLOOM`, `OMBRO_DO_BLOOM`, `domarOBloom` (`post.ts`) | 0,45 / 40 | sobe para L1 (instrumento) |
| cessão pelo gate | `CESSAO_PELO_GATE_MULT`, `cessaoPeloGate` (`corpos/terra.ts`) | mult 1, sobre `LIMIAR_DO_GATE_PX` | **morre no M1** (vira `wResolvido`) |
| filtro solar | `filtroSolarAlvo` (`lodStellar.ts`), `uFiltroSolar`/`escreverFiltroSolar` (`stellarBody.ts`) | 26,09 mag em stops | **vira `overrideExpoente`** (M1) |
| segunda coluna do cadastro | `fatorDeBrilho` em `EscalaDeclarada` (`escala.ts`) | declara mentira de BRILHO | fica — e passa a declarar o valor VIVO |
| as cinco portas | `?bemis= ?bbloom= ?bombro= ?bfoto= ?bcede=`, registradas em `selo.ts` | caminho de volta | **cada uma morre no commit que migra o que ela protege** |

**Provas vivas e seus limites (re-medidas em 16/08, juízes do §5.10).** O
invariante disco↔ponto está verde (a dívida F2 foi paga: `fatorDeBrilho: 1` no
Sol, exigido por teste). O voo de ida e volta passa em 34 degraus com o juiz novo
(`luzMedia` comparada, margem da banda 0,1268 UA escrita no JSON) — a assimetria
de 2,94× registrada em 15/08 era o forno cru, não óptica. A régua de luz, com o
teto derivado da lei e a escada até 15.800 UA, dá o mapa exato do que o M1/M2 têm
de matar: **REPROVA 4 de 11** (`capturas/luz-do-quadro.json`, versionado) —
monotonia 102→182 px chegando a 1 UA, orçamento estourado a 2.000/4.000 UA
(luz média 0,098 contra teto 0,081), e o penhasco 119→4 px em 4.000→15.800 UA. E
o voo carrega o degrau de item 3 vivo: borrão **24 px @ 0,232 UA → 125 px @
0,341 UA (5,2× hoje; 9,2× em 15/08)** — a costura filtro↔cessão, julgada pelo
aceite declarado do M1 (≤ 1,5×).

### O censo É o CADASTRO_DE_REPRESENTACOES (em código desde o L1, 16/08)

Em prosa o censo apodrecia a cada commit — apodreceu em menos de 24 h. Agora ele
vive em `src/three/cadastroDeRepresentacoes.ts`, no molde de `CADASTRO_DE_ESCALA`,
com `consomeL1`, `leiVelhaApagada`, `fatorDeBrilho`, `destino` e `razao` por
representação — e o teste dele **roda a varredura de emissores de verdade**
(`gl_PointSize` contra o fonte): o censo não pode mais ser feito de memória, que
foi como dois emissores ficaram de fora da v1. A tabela em prosa saiu daqui para
não existir em duas versões; quem quiser o censo lê o código, que é cobrado.

### As divergências que sobram

*(A PSF em quatro cópias e o Ballesteros em três morreram no F0, 16/08: um
endereço só — `picoDaPsf`/`psfPointSizePx` em `luzDaCasa.ts`,
`temperatureFromBV` em `stellarPhysics.ts` — com o GLSL GERADO das mesmas
constantes e 51 vistas bit-idênticas de prova. A varredura invertida vigia em
`simbolosProibidos.test.ts`.)*

- **Dois pontos-zero incompatíveis:** `M_V☉ = 4,85` no campo, `4,83` no `SunStar`,
  ambos declarados em `escala.ts`. L1 tem **UM**. A escolha é gate com foto para o
  dono, agendado **antes do M3** — é ele que move 328.749 pontos.
- **Quatro rampas para uma transição:** `cessaoAlvo` (smoothstep 1→2,5 sobre
  `disco/halo`), `cessaoPeloGate` (a mesma smoothstep sobre `disco/(4·mult)`),
  `filtroSolarAlvo` (smoothstep simétrico em log, ±ln 2,5) e o `Math.max` das duas
  primeiras em `director.ts` — que é a quarta, e **um `max` de duas rampas C¹ tem
  QUINA** na troca de dono.
- **A lei de tela de três regimes tem DUAS cópias:** `galaxyShaders.ts`
  (`clamp(px, 0.7, 20)`, `shrink = min(1, 9/px²)`, `subPix = px²/0.49`) e
  `starForges.ts` (`clamp(px, 0.85, 26)`, o mesmo `shrink`, `subPix = px²/0.7225`).
  Mesma lei, pisos e tetos diferentes.
- **O censo foi feito de memória.** `grep gl_PointSize` devolve 8 emissores: dois
  fora da lista (`dustShaders.ts`, com `clamp(px, 1.0, 5.0)` — teto de 5 px não
  declarado — e `sol/cme.js`), e `wrappedStars.ts` emite `gl_PointSize = 0.0` como
  forma de apagar, que é uma **terceira convenção de cessão**. Refazer por varredura
  reprodutível, com o comando versionado ao lado da tabela.
- **A galáxia já tem a lei certa E o mesmo defeito.** Abaixo de 0,7 px o fluxo cai
  com `px²` (a troca sub-pixel, **certa**); de 0,7 a 3 px, brilho de superfície
  constante (**certa**); de 3 a 20 px, platô; acima de 20 px, `∝1/px²` — **a estrela
  ESCURECE ao ser aproximada**. Os dois regimes de cima são anti-estouro por camada
  e morrem no M6.

---

## 3. A PEÇA ÚNICA

`src/three/estrela.ts` — puro, **sem three**, importa **só** `luzDaCasa.ts`. Não
fica em `world/`: `world/` é a camada que importa three, e a primeira necessidade de
câmera puxaria three para dentro da lei, que deixaria de ser auditável em `node`.

**Três contratos, não um.** A v2.0 tinha uma `Fonte` que misturava o que a estrela É
com o que depende de **quem olha** (`distPc`, `tau`). Misturar os dois é o que faz
uma lei "intrínseca" aceitar a câmera pela porta dos fundos. Separados:

```ts
export interface EstadoDaEstrela {  // o StarState LÓGICO — não conhece câmera nem tela
  id: string; semente: number;      // IDENTIDADE — atravessa todas as representações
  posicaoPc: readonly [number, number, number];
  raioPc: number; teffK: number;
  tempo: number; fase: number;      // relógio e fase do ciclo de atividade
  rotacao: { periodo: number; eixo: readonly [number, number, number] };
  atividade: ParametrosDeAtividade; // manchas, faculae, coroa, ejeções
}
// Os três campos do §5.18 são AS FACES deste estado, não camadas independentes:
//   S(n, t)     — superfície        \
//   C(n, h, t)  — cromosfera         }  derivados de EstadoDaEstrela, sempre
//   E(x, t)     — exterior          /
export interface Observacao {       // o que depende de QUEM OLHA
  distPc: number;
  direcao: readonly [number, number, number];
  tau?: number;                     // extinção acumulada na linha de visada
}
export interface Instrumento {      // o que a CASA é (um só por quadro)
  alturaPx: number; tanHalfFov: number;
  expoM0: number; sigmaPx: number; beta: number;
  trocaPx?: number;                 // 1 px = estrela; 4 px é regra de corpo TEXTURIZADO
  requisitoGeometrico?: number;     // ∈[0,1] CONTÍNUO, com histerese — nunca booleano
}
export interface Reparticao {
  discoPx: number;                  // diâmetro angular verdadeiro (1/d)
  radiancia: number;                // da superfície — SEM distância no argumento
  fluxo: number;                    // recebido, já com extinção
  cor: readonly [number, number, number];

  // EIXO ÓPTICO — a fonte é resolvida?
  wPonto: number;
  wResolvido: number;               // ESCRITO como `1 - wPonto`
  // EIXO DE REPRESENTAÇÃO — o resolvido é impostor ou geometria?
  wEsfera: number;
  wMalha: number;                   // ESCRITO como `1 - wEsfera`
  // pesos finais, por construção: ponto=wPonto, esfera=wResolvido*wEsfera,
  //                               malha=wResolvido*wMalha

  claraoPx: number;                 // derivado do FLUXO — NUNCA gateado por wPonto
  claraoGanho: number;              // idem: função do fluxo, presente em todo regime
  fracaoDaAsaExplicita: number;     // partição de energia com o bloom (§1) — declarada
  pegada: Covariancia2x2;           // dois diferenciais no plano tangente + orientação
  frequenciaMaxima: number;         // o que o campo procedural pode somar
  overrideExpoente: number;         // 1 = a lei; 0 = paleta autorada (instância nº 1)
  overrideFator: number;            // quanto de brilho a exceção retira → cadastro + selo
}
export function repartir(
  e: EstadoDaEstrela, o: Observacao, i: Instrumento
): Reparticao;
export const GLSL_LEI_DA_ESTRELA: string;   // o MESMO texto, para quem desenha na GPU
```

**Duas faces do mesmo texto.** As 18 representações são GLSL; 328.749 estrelas e
4,02 M partículas não podem ser avaliadas por quadro na CPU. Então L1 publica o
avaliador em TS **e** `GLSL_LEI_DA_ESTRELA`, com conformidade **NUMÉRICA** sobre uma
grade de valores. Varredura textual é proibida como prova: foi ela que produziu as
quatro cópias da PSF.

**Fronteira, escrita uma vez:** `luzDaCasa.ts` é a **unidade e o instrumento**
(fluxo, radiância, ponte magnitude↔fluxo, ângulo sólido, compressão). `estrela.ts` é
a **única face PÚBLICA** da lei — o que não quer dizer um único arquivo físico:
módulos internos podem existir atrás dela (o perfil da asa, os campos `S`/`C`/`E`, a
pegada), desde que **nada os importe de fora**. O que a lei proíbe é uma segunda
porta de entrada, não a organização interna. Nenhuma fórmula pode existir nos dois
lados da fronteira, e isso vira teste. Sem essa frase, o próximo agente não sabe onde
escrever a próxima função — e é literalmente esse o mecanismo do frankenstein.

**Por que esta assinatura mata as quatro rampas:**
- as réguas são **duas e separadas** (§1): `wPonto = 1 − smoothstep(trocaPx,
  k·trocaPx, discoPx)` no eixo óptico; `wEsfera = 1 − smoothstep(...)` sobre
  `requisitoGeometrico`, com histerese, no eixo de representação. O degrau da malha
  **não sai da pegada**, e o degrau do ponto **não sai da geometria**;
- `cessaoAlvo` some porque a âncora dela era **circular** — media o disco contra o
  **halo do ponto**, e o clarão passa a ser derivado do fluxo. **O clarão é SAÍDA,
  nunca entrada;**
- `cessaoPeloGate` some porque o gate de 4 px é regra de corpo **texturizado** e
  vira o **parâmetro** `trocaPx`, não uma segunda lei. O `Math.max` some junto, e
  com ele a quina;
- `filtroSolarAlvo` deixa de ser rampa e vira `overrideExpoente`: mesma régua,
  largura própria, dentro da mesma função, com o custo saindo por `overrideFator` —
  o número que falta ao cadastro;
- **fallback único**, decidido uma vez, na direção que não pode cegar o quadro:
  entrada inválida ⇒ `wPonto = 1, wResolvido = 0, wEsfera = 1, overrideExpoente = 0`.

Os sítios de hoje viram leituras da mesma saída: `planetas.aCede ← r.wResolvido`;
`sun.uFiltroSolar ← r.overrideExpoente`; e o clarão ← `r.claraoPx` com ganho
`r.claraoGanho` — **nunca `r.wPonto`**, que é o gate disfarçado (§1).
`sunStarGain`/`deepPointGain` deixam de existir porque o clarão deixa de ser gateado.
`fluxo` sai **com** extinção — hoje `starShaders.ts` a aplica só quando
`size > 3.0`, uma troca de lei em 3 px que faria o orçamento do clarão ordenar por
um número que a tela não mostra.

---

## 4. AS MIGRAÇÕES

> **Camada TRANSITÓRIA**, como a §2: cada migração fechada **sai desta lista**. O que
> ela deixa atrás é a linha no cadastro e o número medido no commit, não um parágrafo
> aqui. Quando a última fechar, esta seção acaba.

**A regra de todo commit de migração**, sem exceção:
(i) apaga os símbolos da lei velha; (ii) **inverte a varredura textual no mesmo
diff** — "tem de conter X" vira "não pode conter X", num arquivo único de símbolos
proibidos com o commit que matou cada um; (iii) atualiza `CADASTRO_DE_REPRESENTACOES`
e o `fatorDeBrilho` correspondente; (iv) **mata a porta `?b*`** que protegia aquela
representação — o lado A vira captura + teste numérico, nunca ramo de runtime;
(v) declara o delta aceito **ANTES** nas réguas que já existem (`luz-do-quadro.mjs`,
`voo-ida-e-volta.mjs`, as 18 vistas A/B) e traz o número **medido** no commit;
(vi) a lei devolve valor já comprimido (ou expõe β) — a compressão não é passo, é
**cláusula de toda migração**.

**Antes da primeira linha de `estrela.ts`:** rodar `luz-do-quadro.mjs` sem EXTRA no
estado padrão e versionar. Hoje `capturas/luz-do-quadro.json` é de 13:57 e contém o
desenho ANTIGO (borrão 900 px, REPROVA 4/4), enquanto o padrão subiu às 22:57 — é
armadilha de procedência, e a casa proíbe md5 sem medir.

*(F0 — PSF e Ballesteros num endereço só — FECHOU em 16/08, delta medido:
zero pixel em 51 vistas. O registro é o commit; a lista é do que falta.)*

*(L1 — a lei única — FECHOU em 16/08: `estrela.ts` puro com os três contratos
do §3, `repartir`, o clarão de asas derivado do fluxo, a radiância na banda de
render (§5.5 decidida: a integral Planck×CIE reproduz os números da cláusula —
30.000 K dá 65,9, não 729), o ponto-zero único 4,83 (gate de foto segue devido
antes do M3), fallback único, e `GLSL_LEI_DA_ESTRELA` gerado das mesmas
constantes. O corpo negro mudou de casa para `luzDaCasa.ts` no mesmo gesto do
F0, byte-idêntico. Cadastro em código com varredura reproduzível. Sem
consumidor: zero pixel por construção.)*

### M1 — A instância nº 1 (Sol-ponto + SunStar + corpo), num commit só
**A maior demolição por commit da casa.** É onde moram os itens 3, 4, 5, 40 e 42.
**Apaga:** `cessaoAlvo` (uso do Sol), `cessaoPeloGate` + `CESSAO_PELO_GATE_MULT`,
`filtroSolarAlvo` + `MEIA_LARGURA_LOG_DO_FILTRO`, `sunStarGain`/`deepPointGain`,
`LOD_SOL.entrega`, a classe `SunStar`, `DISC_ENTER_RAD`/`DISC_EXIT_RAD`/
`shouldDiscBeActive` e os órfãos do mesmo bloco (`computeSolidAngle`,
`distanceForSolidAngle`, `LIMIAR_DA_ENTREGA_PC`, `POINT_SIZE_CEILING_PX`,
`spriteAttenuationWithFocus`, `heroCatalogFade`), `claraoDoAtlas` + `PISO_DO_CLARAO`
+ `REFERENCIA_UA`, as portas `?bcede` e `?bfoto`, e o oráculo `ponto + clarão === 1`.
**Atenção:** `heroDominanceFade`/`HERO_DOMINANCE` **muda de dono**, não sai — a onda
de 15/08 os transformou em viga do filtro solar e da cessão. A rampa `g(r)` sobe
para `estrela.ts` **antes** de qualquer demolição.
**Entra também:** o corpo do Sol passa a declarar os três campos `S`/`C`/`E` (§5.18)
e a consumir a pegada anisotrópica; a esfera analítica cobre a faixa entre o ponto e
a malha, e a malha só entra por requisito geométrico.
**Régua:** `voo-ida-e-volta.mjs` + `luz-do-quadro.mjs`. **Delta a declarar antes —
e é ESTÁGIO INTERMEDIÁRIO, não o aceite final:** o degrau 0,232 → 0,341 UA cai de
9,2× para ≤ 1,5×; a escada passa de REPROVA 10/10 para no mínimo 7/10. O aceite AAA
(perfil radial, croma, limbo, altas frequências, derivada no crossfade) é o §5.19 e
só fecha depois do M2 — declarar M1 como pronto pelo número acima é o mesmo erro que
a v1 cometeu com o invariante.

### M2 — As 16 heroes = o antigo L3
**Entra:** o clarão de asas, uma camada só, sempre acesa, para as **N fontes mais
brilhantes em quadro** (orçamento, não lista de nomes) — **e o parâmetro do bloom
governado pela lei** (número de mips e pesos derivados da asa escolhida). Sem os
dois termos, o item 42 fica consertado na lei e quebrado na tela.
**Apaga:** `size = 0,08·10^(−0,3m)`, `ESPELHO_COEF_CLARAO_PC` + o exemplar Sirius,
`HERO_DOMINANCE`/`heroDominanceFade`/`heroDominanceRatio`/`writeHeroFades`/
`DOMINANCE_DEFAULT_ON`/`aFade`, a identidade "as 16", `uExposicao` e a espinha de
exposição inteira, o clamp `sat`, e — com F0 feito — **`core/pupila.ts` INTEIRO**
(329 l) + `pupila.test.ts` (230 l) + `?pupila`/`?dom`/`?nodom`. O que sobrevive da
pupila é o que ela **MEDIU** (§7) e a técnica de pré-exposição, que é correta pelo
motivo half-float. **A medição fica no documento, não em código.**
**Régua:** `luz-do-quadro.mjs` PASSA 10/10; borrão a 15.800 UA ≤ 20 px.
**Ordem:** o clarão de autor só é apagado **depois** que a lei nova passa na régua —
senão a casa fica sem clarão nenhum no intervalo.

### M3 — Catálogo + cascas
**Gate obrigatório ANTES:** o ponto-zero único (4,83 × 4,85), decidido com foto pelo
dono. **Apaga:** o segundo ponto-zero, a extinção condicional de 3 px, a lei de
magnitude própria das cascas (`+ ext·d`, em CPU por bisseção e em GLSL) — ou, se ela
sobreviver, um teste prova que casca e catálogo depositam o mesmo fluxo para a mesma
estrela. Acende `aFocus` e fecha o E3 (item 38) — **e o E3 é a esfera analítica**:
é assim que uma estrela qualquer ganha corpo ao ser aproximada, com `S`/`C` no
impostor e `E` por fora, sem uma malha por estrela. **Régua:** as 18 vistas A/B.

### M4 — Os nove planetas
Não são estrelas: consomem o **instrumento** da lei e mantêm a fase MH18. Risco
baixo, fecha a camada. **Apaga:** a cópia de `picoDaPsf` já morta no F0 e o `uGain`
ponto a ponto de `planetas.test.ts`.

### M5 — Os quatro glows + as forjas
Um `GLOW_FRAG` só e `starForges.ts`. **Apaga:** a **segunda cópia** da lei de tela
de três regimes (piso 0,85 / teto 26 / `px²/0.7225`). Barato, um shader.

### M6 — A galáxia (partículas + lâminas)
**Entra:** `aAlpha` deixa de ser artístico e vira fluxo na unidade da casa; a cessão
partículas↔lâminas (a única dupla-luz sem mecanismo nenhum — o molde
`unresolved`/`resolvedByCatalog` já existe); e a **promoção**, que fecha a escada em
quatro níveis com fluxo conservado: `luz integrada → partícula → casca/catálogo
(ponto) → corpo`. **Apaga:** o platô 3–20 px e o ramo `1/px²`, e um piso de sub-pixel
único fica na lei. **Maior risco visual (4,02 M):** por último entre as fontes, com o
invariante já provado em quatro famílias. **Advertência medida:** a curva na emissão
foi necessária e **insuficiente** para o Sol; prever que ela baste para a galáxia é
repetir o erro — a garantia de half-float tem de ser medida **sobre o pixel somado**
(contagem de sobreposição no núcleo galáctico), não sobre a fonte isolada.

### M7 — O resto emissivo
Termo `stellar` do raymarch (`nebulaShaders.ts`) e splats do bake
(`structureMap.ts`). **Fora da lei, declarado:** o campo 2D do carregamento.

### MB1 — O juiz de estabilidade temporal
Não é migração de representação: é a régua que falta. Delta entre quadros
consecutivos **após reprojeção**, em cinco famílias de movimento (aproximação, pan,
órbita, reversão, FOV) mais as fronteiras de promoção, com tolerância declarada —
§5.17. **Entra antes do M6** (4,02 M partículas é o que mais pode chiar) e é o único
juiz que enxerga o §5.20: hoje nada na casa detecta uma fonte que se re-semeia ao
trocar de representação.

### O saldo
Se as migrações forem executadas inteiras: ~1.560 linhas de produção apagadas
(`lodStellar.ts` sozinho perde ~770 de 1.310 — 59%) e ~1.900–2.150 de teste, contra
`estrela.ts` nascendo com 400–600. **Saldo líquido: −2.900 a −3.100 linhas**, de
50.856 TS. A onda da luz somou +1.216 linhas em um dia para tapar um buraco; a Lei
Única é o primeiro trabalho do projeto que **devolve** linha, e devolve duas vezes e
meia o que a última onda gastou. **O risco não é o tamanho da demolição — é a
ordem.**

---

## 5. AS CLÁUSULAS DE HONESTIDADE

Cada uma é dívida medida. Nenhuma pode ser fechada por argumento; só por número.

**5.1 O invariante é cobrado PÓS-curva.** Hoje `luzDaCasa.ts` iguala
`depositoDoDisco` e `depositoDoPonto` **antes** da compressão, e `starShaders.ts`
escreve `comprimir3(col, uBeta)` depois. Como `∫comprimir(pico·G) ≠
comprimir(∫pico·G)`, na troca de 1 px com β = 300 o disco escreve 4.496 e o ponto
147.980 — razão **32,9×**, ou 3,8 magnitudes. A "troca invisível por construção" é,
hoje, visível. Ou o invariante é cobrado sobre o que chega ao buffer, ou a curva é
aplicada depois da soma.

**5.2 A compressão age em dois pontos, e o custo tem o sinal CORRIGIDO.** A v1 dizia
que a soma de valores comprimidos fica *abaixo* do físico. É o contrário:
`β·asinh(x/β)` é côncava com `f(0)=0`, logo **subaditiva**, `f(a)+f(b) ≥ f(a+b)`. Com
β = 300: `2·C(1e6) = 5.283` contra `C(2e6) = 2.849` → **1,85× ACIMA**; no pico do Sol
(3,9e11), **1,94×**. E são **dois desvios distintos, de sinais opostos**: por fonte,
na emissão; e sobre a **soma** (o texel já somado do passa-alta), no ombro do bloom.
O selo declara os dois, separados. Custo declarado errado é pior que custo não
declarado.

**5.3 A compressão por canal DESSATURA.** `comprimir3` age em `vec3`. Uma estrela de
cor linear (1; 0,5; 0,3) com pico P vira: P=1e4 → (1; **0,835**; **0,714**); P=1e9 →
(1; 0,956; 0,923). **Toda estrela forte fica branca** — o que destrói a cadeia
Ballesteros → Teff → `blackbodyLinear` sobre a qual a lei inteira se apoia. A forma
que **preserva croma** já existe no `KNEE_SHADER` (o ramo `uMode ≤ 0.5`), mas o
default é `uMode = 1` e o modo correto só entra por `?kneemode=lum`. **Inverter o
default, usar a mesma forma na emissão, e o modo por canal morre.**

**5.4 O clamp `sat` é TETO DE BRILHO vivo.** `sat = clamp(0.5*log2(max(peak,1)), 0, 1)`
**satura em `peak = 4`** — em 900 px, `m = 0,75`. Sirius (m = −1,46) e o Sol a 1 UA
(m = −26,7) — 25 magnitudes, fator 1e10 — recebem **espinhos e núcleo idênticos**. É
literalmente "dois brilhos diferentes viram o mesmo pixel", proibido pelo NORTE, e a
v1 não o listava. Entra na demolição do M2: espinhos derivados do fluxo comprimido,
não de um `clamp`.

**5.5 A radiância passa a ser a integral Planck×CIE NÃO normalizada.**
`radianciaDeCorpoNegro` devolve `(T/T☉)⁴` — bolométrica — num pipeline em que a cor
é **normalizada a Y = 1**, isto é, não carrega luminância. Erro na banda visível:
30.000 K → Planck(550 nm) dá razão 66 contra T⁴ = 729 (**11× brilhante demais**);
3.000 K → 0,0150 contra 0,0729 (**4,9× fraca demais**). A função da integral já
existe. Consequência: o "zero byte novo" do raio por Stefan-Boltzmann **não fecha
sem correção** — pela receita crua, Rigel dá 52,9 R☉; com BC(12.100 K) ≈ −0,8, dá
73,4 R☉ ≈ real (~78). Ou entra uma tabela BC(Teff) e o "zero byte" cai, ou tudo
passa a viver na banda de render — **decisão explícita, nunca implícita**. (O
oráculo pinado de 283 R☉ é valor de RENDER: reescreve-se, não se satisfaz.)

**5.6 A lei é invariante com a resolução.** `peak = E/(2πσ²)` com `σ ∝ alturaPx` dá
**`peak ∝ 1/H²`**. Limiar de espinhos cheios: H=720 → m < 1,23; H=900 → m < 0,75;
H=1080 → m < 0,35; **H=2160 → m < −1,15**. Num 4K quase todo o céu perde a cruz de
difração, e o β = 300 (número absoluto de buffer) morde em magnitudes diferentes. L1
normaliza por **ângulo sólido por pixel**; σ e β em unidades de campo, não de
buffer. (Liga-se ao item 6 das pendências.)

**5.7 O filtro solar é SEÇÃO da lei, não remendo.** Ele é a segunda troca da §1:
`pow(fator, uFiltroSolar)`, 26,09 magnitudes entre a radiância verdadeira (g=1) e a
paleta autorada (g=0). Como `overrideExpoente`/`overrideFator`, ele é: uma escolha
de **instrumento** (transmitância), com **régua compartilhada** com `wResolvido` (a mesma
`discoPx`, largura própria), **custo no cadastro** e no selo, e **default seguro** —
hoje `uFiltroSolar` nasce em 1 (radiância verdadeira, o quadro cego) e só é escrito
dentro de `if (this.planetas)`. Quem desenha o corpo escreve a emissão do corpo.

**5.8 O `fatorDeBrilho` do Sol volta a declarar o valor VIVO.** O cadastro diz
`fatorDeBrilho: 1` com a razão "agora a fotosfera emite a radiância verdadeira". Mas
o filtro desce em stops: o fator vivo é `2,7e10^(1−g)` — ~11× a 1 UA (g = 0,901) e
~2,7e10× abaixo de ~0,22 UA. **A coluna nasceu exatamente para que a próxima mentira
de brilho não nascesse calada, e ela nasceu calada no mesmo commit que criou a
coluna.** Isto fica escrito aqui como LIÇÃO: uma coluna de honestidade só honesta
quem a preenche depois. A entrada do Sol declara faixa + rampa (ou ganha entrada
`filtro-solar` própria), e o selo mostra o valor vivo, não o do infinito. Vale
igual para β=300, o ombro 0,45/40 e a cessão: hoje o desvio é declarado quando é do
visitante e calado quando é da casa.

**5.9 UM ponto-zero.** 4,83 × 4,85, 0,02 mag, pinado como intencional. Gate com foto
para o dono **antes do M3**. Se L1 carregar os dois, a peça que existe para acabar
com a duplicidade nasce duplicada.

**5.10 O que as réguas não viam — PAGA em 16/08, antes do M1, com números.**
`julgarEscada` ganhou **continuidade**: razão máxima de 3× POR OITAVA de distância
entre degraus vizinhos (a lei honesta mais íngreme, o disco 1/d, faz 2×/oitava e
cabe) — e o penhasco do item 42 ganhou a linha vermelha que faltava: **119 px a
4.000 UA → 4 px a 15.800 UA (14,9× em ~2 oitavas, máximo 8,8×)**, no degrau novo
que estendeu a escada até a âncora do dono. O **teto passou a derivar da lei**
(`claraoDaLeiPx` = núcleo + asa Moffat, conformidade numérica contra `repartir` em
`luz-do-quadro.test.mjs`): a escada saiu de REPROVA 9/10 sob o teto-doente para
**REPROVA 4/11 com os vermelhos certos** — monotonia 102→182 px na chegada a 1 UA,
orçamento estourado a 2.000/4.000 UA, o penhasco de 15.800 — e os degraus do meio
passaram, porque o juiz parou de exigir o halo constante que era a doença. O voo
compara `luzMedia` (tolerância 0,02 declarada) e **a assimetria de 2,94× de 15/08
não se reproduziu** no harness assentado (0,0596 × 0,0598 a 0,05 UA; maior delta
vivo 0,0019) — era medição com o forno cru, não óptica. A margem da banda está
ESCRITA no JSON: 0,1268 UA hoje, não mais o fio de 0,0035. O que fica de dívida
aqui: o voo continua sem chamar `julgarEscada` — a costura 0,232→0,341 UA
(24→125 px, 5,2× hoje) é julgada pelo aceite declarado do M1, não por juiz
automático.

**5.11 O sprite descarta 8,9% do fluxo das estrelas fracas.** Com `rSat = 0` o raio
é 2,2σ e a fração contida do gaussiano 2D é `1 − exp(−2,2²/2) = 0,911`. As fracas
depositam 91,1% e as fortes ~100%: viés de 9% dependente do brilho, invisível porque
o invariante só é cobrado no ponto de 1 px. Cobrar em pelo menos **três** pontos da
escada, ou renormalizar por `1/(1−exp(−R²/2σ²))`.

**5.12 O ombro tem resolução efetiva declarada.** Entrada 6,5e3 → 44,6; entrada
6,5e4 (uma década a mais de luz) → 45,6: **2,2% de saída por década**, que depois de
ACES e 8 bits é menos de 1 LSB. "Asinh é estritamente crescente, logo não é teto"
não é argumento: monotonicidade não é distinguibilidade. O ombro declara **stops por
LSB**, ou o "proibido teto de brilho" já está violado de fato.

**5.13 "Fixa" é promessa forte demais.** O ombro age **por pixel acima do limiar**,
então a fração de energia comprimida depende de quantos pixels a fonte cobre — isto
é, da distância. **Não depende de FOCO**, e a regra do dono está respeitada. A
promessa correta é: *não depende do foco nem do conteúdo do quadro*, com a
dependência de tamanho aparente declarada.

**5.14 A troca conserva energia e não conserva aparência — e a causa tem nome.** Na
distância de troca de 1 px (7,56 UA para o Sol, a 900 px e 58°), a PSF do ponto mede
**12,65 px**: um disco duro de 1 px vira um borrão de 12,65 px. A integral é a mesma,
a imagem não. **A causa é o gate:** hoje o disco *não* passa pelo instrumento e o
ponto passa, então trocar de regime troca de óptica. Com a lei do §1 isso desaparece
pela raiz — **o clarão não é gateado por `wPonto`**: a mesma óptica age sobre a
imagem estelar em todo regime, e o que a troca move é só o **objeto** por baixo dela.
O que sobra a cobrar é a **partição de energia da asa** (um dono, fração declarada);
o teste do L1 cobra as duas coisas **separadas** — energia e perfil radial.

**5.15 A profundidade do clarão é parte da lei.** A §1 promete que o clarão nunca é
ocluído pelo corpo que o causa; só o `SunStar` põe `depthTest: false`. Os 16
billboards não. Estado de profundidade entra na lei (M2), não na escolha de material.

**5.16 A paleta H-alfa é override de INSTRUMENTO ou sai.** H-alfa é banda estreita em
656,3 nm; a fotosfera a 5.772 K é branca. Como está, a única estrela que o visitante
pode inspecionar de perto é justamente a que **nunca testa** a lei de cor que M3
constrói. Ou vira modo de instrumento aplicável a TODAS as estrelas (aí é honesto e
testável), ou sai — "override declarado" não pode ser o nome novo da lei de autor.

**5.17 ESTABILIDADE TEMPORAL é cláusula de arquitetura, não polimento.**
*(plano conceitual externo consolidado pelo dono, 15/08.)* **Nenhum campo
procedural, nenhuma PSF, nenhum crossfade e nenhum clarão pode "ferver" ou cintilar
quando a câmera avança frações de por cento.** Coerência quadro-a-quadro é requisito
AAA **tão obrigatório quanto detalhe espacial**: imagem parada bonita que chia em
movimento é trabalho reprovado, não quase pronto. Consequências exigíveis: os pesos
da repartição são C¹ (é o que mata a quina do `max`, §8.3); a filtragem pela pegada
é anisotrópica (§1), porque é a isotrópica no limbo que produz o chiado clássico; e
nenhuma transição depende de limiar duro sobre grandeza que oscila com o movimento.
**Migração nomeada — MB1, e ele não é um juiz de pixel cru.** Comparar quadros
consecutivos pixel a pixel **mistura fluxo legítimo com fervura**: a imagem *deve*
mudar quando a câmera anda. Então MB1 compara **após reprojeção / compensação de
movimento** — o quadro anterior transportado para a pose atual — e mede o resíduo:
delta por pixel reprojetado e delta de energia em banda alta, com tolerância
declarada. E cobre **cinco famílias de movimento**, não só zoom: aproximação, **pan**,
**órbita**, **reversão de sentido** (onde a histerese aparece), **mudança de FOV** e
as **fronteiras de promoção** (partícula→catálogo→corpo), que é onde a identidade
pode escorregar. Hoje nada disso existe: `voo-ida-e-volta.mjs` amostra 34 degraus
**distantes** e é cego a cintilação por construção. Sem MB1, "não ferve" é opinião.

**5.18 O corpo estelar é UM estado em três campos.** *(plano conceitual externo
consolidado pelo dono, 15/08.)* O desenho-alvo do corpo — do Sol e de toda estrela
que ganhe corpo — separa três campos do **mesmo** estado, nunca três camadas
independentes: **`S(n, t)`**, a superfície (granulação, manchas, faculae);
**`C(n, h, t)`**, a cromosfera, casca fina sobre `S` com altura própria; e
**`E(x, t)`**, o exterior (coroa, proeminências, loops, espículas, ejeções) no
espaço 3D em volta.

**Cada estrutura exterior tem critério de visibilidade PRÓPRIO** — escala projetada
em px, significância física, contraste contra o fundo local — **nunca amarrado ao
LOD do renderer**. Uma proeminência não some porque o corpo trocou de regime: some
quando fica pequena, fraca ou sem contraste, e isso se mede nela mesma. É a mesma
doutrina do clarão — decide a grandeza da própria coisa, não o estado da câmera. O
`sol/*.js` vendorizado já **aproxima** este desenho; a migração o **formaliza**: dá
nomes aos três campos, tira os critérios de visibilidade de dentro do LOD, e é o que
permite à esfera analítica (§1) hospedar `S` e `C` sem malha, com `E` por fora.
Requisito de M1 (Sol) e de M3/E3 (as demais). **Os três campos são FACES de
`EstadoDaEstrela`** e isso está escrito no contrato (§3), não só aqui — uma cláusula
que vive fora do tipo é uma cláusula que a próxima migração não lê.

**5.19 O ACEITE FINAL não é o aceite intermediário.** O invariante de fluxo é
condição de entrada; ele não diz nada sobre a imagem. Existem **dois aceites
declarados, e não se confundem**:
- **Intermediário (M1):** o degrau 0,232→0,341 UA cai de 9,2× para ≤ 1,5× e a escada
  passa de REPROVA 10/10 para ≥ 7/10. É **estágio**, não pronto — está escrito assim
  no M1 para ninguém declarar vitória com ele.
- **AAA final**, que fecha a migração da luz e é cobrado **degrau a degrau**, nas
  duas pernas do voo: (i) **perfil radial** dentro de tolerância contra a lei
  (núcleo + asa), não só o raio a meia altura; (ii) **raio aparente** monotônico e
  com razão máxima entre vizinhos; (iii) **croma** preservado — a estrela forte não
  embranquece (§5.3); (iv) **escurecimento de limbo** presente e coerente entre
  esfera analítica e malha; (v) **energia em altas frequências** estável sob
  movimento (§5.17); (vi) **continuidade da DERIVADA** no crossfade — não basta a
  função ser contínua, a quina é visível e é exatamente a piscada do §8.3.

**5.20 IDENTIDADE: proibido re-semear.** *(plano conceitual externo consolidado pelo
dono, 15/08.)* Uma fonte tem `id` e `semente` em `EstadoDaEstrela`, e eles
**atravessam as representações**. Na promoção `partícula → casca/catálogo → corpo`
(G3, M6), a estrela que era um ponto de luz na galáxia e vira um corpo é **a mesma
estrela**: mesma semente, mesma **fase** de rotação e de atividade, mesma posição.
Re-semear na troca é o defeito mais caro da escada inteira — a fonte "pisca" e vira
outra, o que é literalmente o que a frase do dono proíbe. A fase também é
**persistente**: um corpo que sai de quadro e volta não recomeça o relógio. MB1
cobre isso na família "fronteiras de promoção", e o teste é numérico: mesma entrada,
mesma saída, atravessando o degrau.

**5.21 A seleção do clarão tem HISTERESE.** O orçamento das N fontes mais brilhantes
em quadro é um **ranking**, e ranking troca de posição. Duas estrelas de fluxo quase
igual na fronteira do top-N fariam o clarão piscar entre elas a cada quadro — o
defeito do §5.17 nascendo dentro do conserto do §1. A entrada e a saída da lista têm
limiares diferentes, e o ganho do clarão sobe e desce em rampa, nunca em degrau.

---

## 6. O QUE QUEBRA DE PROPÓSITO

A casa cobra muita coisa por **varredura textual do fonte**. Estes testes falham
quando a fundação mudar, e falhar é o comportamento correto — mas quem mudar
**reescreve o oráculo, nunca o contorna**, e no mesmo diff **inverte** a varredura.
Endereços por símbolo; a v1 os deu por linha e todos envelheceram.

**Já aconteceu:** F1 e F2 entraram bit-neutros ou com oráculo apertado
(`luzDaCasa.ts` declara por escrito "no dia 1 este módulo não move um pixel"). Duas
previsões da v1 foram falsificadas: F1 não tocou as três linhas literais de
`GLSL_STAR_PSF` em `pupila.test.ts` nem o `uLuzGanho` de `terra.test.ts`/`lua.test.ts`.

**O F0 (16/08) quebrou o que previu — e um que o censo não via.** As três linhas
literais de `pupila.test.ts` morreram como previsto (o bloco virou grade numérica
em `luzDaCasa.test.ts`; o arquivo da pupila segue vivo até M2). A fiação de
`lodStellar.test.ts` ("o SunStar pede px à lei do campo") mudou de alvo junto com
a lei. E `luz-do-quadro.test.mjs` tinha um SEGUNDO literal GLSL solto — cinco
linhas `toContain` que nenhum censo listava — reescrito como conformidade
numérica contra a lei importada. Lição registrada: censo de espelho feito de
memória perde exatamente o espelho que mais importa, o do juiz.

**Vai acontecer:**
- `escala.test.ts` casa a regex `const size = ([\d.]+) \* lum;` contra o fonte de
  `heroStars.ts` — **M2** apaga a linha.
- `pupila.test.ts` — o literal de `GLSL_STAR_PSF` já saiu (F0); **M2** apaga o
  arquivo inteiro.
- `lodStellar.test.ts` cobra `ponto + clarão === 1` com `Object.is` em ~22.000
  distâncias e exige o literal `return 1 - sunStarGain(dPc);` — **M1** mata os dois.
  São **332 citações** de símbolos condenados no arquivo, de 2.139 linhas.
- `planetas.test.ts` (23 refs: o teorema de complementaridade e o `uGain` ponto a
  ponto), `corpos.test.ts` (o Sol arma em 3,60 UA e desarma em 7,19 UA),
  `cameraRig.test.ts` (3 refs), `luz.test.ts` (`irradianciaRelativa(ANCORA_UA)===1`),
  `selo.test.ts` (as portas) — **M1/M4**.
- `stellarBody.test.ts` e o bloco `filtroSolarAlvo` de `lodStellar.ts` — oráculos
  **novos**, nascidos em 15/08, que M1 quebra.
- `stellarPhysics.test.ts` pina ~60 valores, vários não físicos — **M3**.
- `core/engine.test.ts` diz que a vista `sol` está a 0,063 pc contra 1,2955e-7 pc
  vivo (487.000×): literal envelhecido, **item 41**, verde só porque a asserção
  vizinha exige "acima de 0,05 pc". Trocar pelo certo deixa vermelho sem ter achado
  defeito. Conserto certo: mover `sol` para `PROFUNDAS`.

**§6 vira tabela gerada por grep** dos símbolos proibidos, com contagem por arquivo —
mantida à mão, ela mente em uma semana.

**Sobrevive, contra a v1:** `RAIO_ARTISTICO_DO_SOL_PC` **não sai**. Tem consumidor
vivo e documentado (`epsilonDeSegmentoGlsl` em `stellarBody.ts`): fica como âncora de
**PROCEDÊNCIA**, nunca de geometria — trocá-la pelo raio real mudaria o número
fingindo que a calibração foi refeita. E `aFocus` não sai: nasce zerado de propósito,
é o canal do M3 (item 38 das pendências); só vira lixo se a onda terminar sem fiá-lo.

---

## 7. A PUPILA ADAPTATIVA ESTÁ REPROVADA PELO DONO (2026-08-14)

A pergunta em aberto era: com a lei honesta, **quando uma fonte brilhante enche o
quadro o céu fica preto** — é o que uma câmera faz e o que o SpaceEngine faz.
Purista ou cinematográfico?

**Ele respondeu, e a resposta fecha a porta inteira.** Palavras dele, ao ver a
pupila ligada numa janela de depuração:

> *"eu quero que independentemente do astro/objeto que está em foco na tela nunca
> se esmaeça a grandeza da cena galáctica e do starfield, exuberante... nada de
> efeitos de pupila ou sei lá como vc chama isso..."*

E ele tem razão com sobra. **Medido no dia:** ao focar Sirius, a pupila fechava
**16 stops** — a cena inteira escurecida ~100.000×. As estrelas não sumiam por
bug; a exposição as estava apagando.

### A LEI, e ela vale para todo o resto deste documento

1. **NADA de exposição fotométrica que dependa do que está em quadro.** Nem
   adaptativa, nem por alvo, nem medindo a CENA ou o histograma. A grandeza da cena
   galáctica e do campo estelar **não é variável de estado**.
   **A distinção que faltava, escrita:** é *permitida e declarada* a troca de
   representação pelo **tamanho aparente da PRÓPRIA fonte** — geometria fixa, que não
   toca em nenhum outro pixel da tela. É isso que `wResolvido` e `overrideExpoente` são.
   O que está proibido é medir a cena para decidir a exposição; o que é lícito é
   medir a fonte para decidir como ela se desenha. Sem esta emenda escrita, o padrão
   que roda hoje está formalmente em desacordo com a única regra que existe para
   obedecer — e a defesa mora só no código, não no documento que o dono lê.
2. **O campo estelar e a galáxia nunca esmaecem.** Qualquer mecanismo cujo efeito
   colateral seja escurecê-los está reprovado por construção, por mais honesto que
   seja o argumento físico.
   **A regra absoluta da Via Láctea, na formulação que ele aprovou** *(plano
   conceitual externo consolidado pelo dono, 15/08)*: **o fundo galáctico NUNCA
   esmaece artificialmente.** Quem esconde estrelas perto do Sol é a **óptica
   local** — o clarão e o bloom da fonte dominante **sobrepondo** o fundo, que é o
   que a luz faz de verdade. Perto do Sol as estrelas somem **pelo clarão**; longe
   dele a Via Láctea continua espetacular. É por aqui que a tensão com o SpaceEngine
   se resolve sem trair nenhum dos dois lados: o céu preto que uma câmera produz
   nasce de **luz somada por cima**, não de ganho retirado por baixo. Ninguém
   escurece o fundo; alguém brilha na frente dele. E isso torna o clarão de asas
   (§1) a peça mais importante do documento: é ele que faz o efeito acontecer pelo
   motivo certo, e é ele que o desfaz sozinho quando a fonte encolhe.
3. **`core/pupila.ts` é LÁPIDE COM DATA DE ENTERRO: M2.** Ela nasce desligada, mas
   não está morta — o director a instancia, chama `aplicarPupila` todo quadro e
   importa dela a lei viva `picoDaPsf`. F0 muda `picoDaPsf` de casa; **M2 apaga o
   arquivo inteiro** (329 l) mais `pupila.test.ts` (230 l) e a espinha de
   `uExposicao`. O que sobrevive dela é o que ela **MEDIU** — os 16 stops acima e o
   vão de ~26 magnitudes entre a malha e o ponto, ambos preservados **neste
   documento** — e a técnica de pré-exposição no shader, correta pelo motivo
   half-float e sem parentesco com adaptar por foco.

### O que substitui a pupila, então

O problema físico não some por decreto: a faixa é de ~15 ordens de grandeza e o
buffer é half-float, que satura em 65.504. Sem adaptação, a saída é **comprimir o
alto, nunca levantar o baixo** — `valor = β · asinh(radiância / β)`, igual em todo
quadro, sem depender do foco. Para valores muito abaixo de β é a identidade: **o
céu, o campo estelar e a galáxia passam intocados**, que é exatamente o que ele
pediu.

**A cadeia real, medida, em dois pontos — e por que um só não bastou.** A v1 dizia
que a curva estava "no lugar errado da cadeia (depois do bloom, onde não adianta)" e
que o trabalho era "movê-la para a emissão". **A varredura de β falsificou isso:**
`?bemis=300` sozinho REPROVA 9/10 com 90,84% do quadro lavado a 1 UA e borrão de 900
px; `?bemis=1000` chega a 99,07% lavado; `?bemis=30` já custa 13% de Sirius e ainda
deixa 25% lavado; e `?nobloom=1` **PASSA 10/10** com borrão de 8 a 12 px na escada
inteira. **Quem lava é o BLOOM.** O conserto que virou padrão foi uma **segunda**
curva, com **ombro**, dentro do passa-alta: `min(texel, 40) + comprimir3(max(texel −
40, 0), 0.45)`. O ombro é a peça que separa o conserto do teto de brilho proibido, e
por isso ele declara sua resolução efetiva (§5.12). Quem apagar qualquer uma das
duas por "não constar do plano" reabre o item 3.

**Custo declarado, com o sinal certo, para ninguém descobrir depois:** somar em
aditivo valores já comprimidos não é somar e comprimir. Como `β·asinh` é **côncava e
subaditiva**, a soma fica **ACIMA** do físico onde duas fontes se sobrepõem — 1,85×
com dois picos de 1e6, 1,94× no pico do Sol. O erro é o de **estourar**, não o de
escurecer. E são **dois desvios distintos**: por fonte na emissão, e sobre a soma no
passa-alta. Some-se a eles o joelho pós-bloom (β = 0,45, mais `knee2`, `kneemode`,
`kneeamt`) e o `pow` em stops do filtro: a cadeia final declara **quantas curvas
tem**, em ordem, com o desvio de cada estágio, e nomeia quem **não** é alcançado
(partículas, lâminas, glows e forjas continuam fora até M5/M6 — o platô e o ramo
`1/px²` estão intactos).

**A compressão deixou de ser um passo** ("L4"). Ela é **cláusula de toda migração**:
a lei devolve valor já comprimido, ou expõe β. E o joelho pós-bloom é absorvido ou
demolido no M2, com o número de curvas escrito.

---

## 8. AS ARMADILHAS NOMEADAS

1. **Dois raios, dois nomes.** `RAIO_SOL_PC` em `escala.ts` é a fotosfera
   (2,2567e-8 pc). `R0_PC` em `frameGalactico.ts` é a distância Sol–centro
   (8.150 pc). Onze ordens de grandeza. Um import trocado compilava, rodava e
   mentia — os nomes agora são distintos.
2. **Não confundir cessão com duplicidade.** O censo de duplicidade anterior já
   produziu um falso positivo grave ("a faixa da galáxia é desenhada 2×" era uma
   cessão funcionando). Antes de costurar qualquer par, conferir se não é uma cessão
   que já funciona.
3. **A piscada do assentado — `max` de duas rampas tem QUINA.** `director.ts`
   combina `cessaoAlvo` e `cessaoPeloGate` com `Math.max`. Duas rampas C¹ somadas
   por `max` produzem uma derivada descontínua na troca de dono: é a piscada, e é
   exatamente o defeito que `heroDominanceFade` se orgulhava de não ter. **Uma
   repartição só, ou a quina volta com outro nome.**
4. **A âncora circular.** `cessaoAlvo` mede o disco contra o **halo do ponto**, e o
   clarão passa a ser derivado do fluxo — a rampa que decide quanto o ponto cede
   leria um número que depende do ponto. **O clarão é SAÍDA, nunca entrada.**
5. **O fallback de dois sentidos.** Três mecanismos herdaram "razão ≤ 0 ⇒ direção
   segura" e discordam sobre qual é a direção segura: para a cessão é ponto inteiro
   (devolve 0), e `filtroSolarAlvo` devolve **1**, que é radiância verdadeira
   (~2,7e10) — o quadro cego. **Um fallback só, decidido uma vez, na direção que não
   pode cegar o quadro:** `wPonto = 1`, `wResolvido = 0`, `overrideExpoente = 0`.
6. **A varredura textual como prova.** "Tem de conter X" é o motor do frankenstein:
   torna somar camada mais barato que demolir. Toda prova de conformidade entre CPU e
   GLSL é **numérica**, sobre grade de valores; toda varredura textual é, a partir
   daqui, **negativa** ("não pode conter").
7. **A captura que envelheceu.** `capturas/luz-do-quadro.json` — o caminho canônico
   "sem knob" — é de 13:57 e mede o desenho antigo, enquanto o padrão subiu às 22:57.
   Ler o arquivo versionado como "o estado atual" é a mesma classe de mentira que a
   casa proíbe ao vetar md5 sem medir. **Toda régua re-rodada e re-versionada no
   commit que muda o desenho.**
8. **O booleano que vira pop.** Toda vez que uma decisão de desenho couber num
   `true/false`, ela vai piscar. `exigeGeometria` foi proposto assim e foi recusado
   por isso (§1). A pergunta a fazer antes de escrever qualquer bandeira nova: *o que
   acontece no quadro em que ela troca de valor?* Se a resposta for "muda de uma vez",
   a bandeira está errada — o que falta é a régua contínua e a histerese.
9. **O ranking que pisca.** Ordenar fontes por fluxo e cortar em N é estável só até
   duas ficarem empatadas. Vale para o clarão (§5.21) e para qualquer orçamento
   futuro: **entrada e saída com limiares diferentes**, sempre.

---

## 9. A CÂMERA POR TAXA DE INFORMAÇÃO VISUAL — obra própria

*(plano conceitual externo consolidado pelo dono, 15/08. Fica **fora** das migrações
da luz; entra aqui porque é a outra metade da estabilidade do §5.17, e porque quem
ler a lei precisa saber que ela existe.)*

Hoje a velocidade da câmera é decidida por distância. O desenho-alvo troca a régua:
a velocidade é limitada pela **taxa a que a imagem ganha informação**, medida em
duas grandezas da PRÓPRIA fonte de interesse:

- **`d(log raioProjetado)/dt`** — quão depressa o alvo cresce na tela. Dobrar de
  tamanho em meio segundo é rápido demais para o olho, a qualquer distância;
- **a taxa de surgimento de frequências resolvíveis** — quanto detalhe novo a pegada
  do pixel (§1) está descobrindo por segundo. É a mesma grandeza que MB1 mede, usada
  agora para *governar o movimento* em vez de julgá-lo.

A câmera **desacelera quando a imagem ganha informação depressa** e acelera quando o
quadro está estático — o que dá, de graça, a aproximação que "respira" ao chegar num
corpo, sem nenhuma curva de distância escrita à mão por objeto.

**Compatível com a proibição da pupila (§7), e a distinção é exata:** isto limita
**MOVIMENTO**, nunca exposição; e **não lê a cena** — lê o raio projetado e a pegada
**da própria fonte**, que é geometria, como `wResolvido` e `overrideExpoente`. Nada
aqui escurece um pixel sequer, e nada aqui depende do que mais está em quadro. É a
mesma fronteira do §7 regra 1: medir a fonte é lícito; medir a cena para decidir
brilho, não.

**Não entra nesta fila.** É obra própria, depois da luz — mas a lei já a referencia
para que ninguém a implemente como "mais uma curva de LOD" quando ela chegar.
