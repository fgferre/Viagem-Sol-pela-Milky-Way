# Retomada — onda do Sol real

**Atualizado em 2026-08-13, com a F3 FECHADA, APROVADA e MERGEADA com a Onda 6.**
Este arquivo é o bastão de sessão: quem
chegar numa janela limpa lê ISTO primeiro, depois `docs/ESCALA-HONESTA.md` (que é o
bastão da ONDA, com todo o detalhe medido). Ele morre quando a onda fechar.

---

## 1. Onde o trabalho vive, e o merge que ACONTECEU

| | |
|---|---|
| **Mesa desta onda** | `/Users/fgferre/Github/.worktrees-sol-real`, branch `sol-real`, criada de `af90809` |
| **Repo principal** | `/Users/fgferre/Github/Viagem-Sol-pela-Milky-Way`, branch `main` (Onda 6 dentro, merge `6b7712f`) |
| **Servidor de captura** | porta **5199**, subido a partir da mesa desta onda |

### O MERGE ACONTECEU — commit `c25d701`, 2026-08-13

A `main` inteira (Onda 6) foi trazida para DENTRO de `sol-real`, nunca o contrário.
**As duas travas que este arquivo listava CAÍRAM, as duas:**

1. ~~**O dono aprovar as 4 imagens da F3.**~~ **CUMPRIDA** — ele viu os oito PNGs de
   `capturas/f3/` e disse sim. O rebaseline está consentido e os md5 novos são a
   referência oficial no `NORTE.md`.
2. ~~**Re-medir a base.**~~ **CUMPRIDA, e era a trava de verdade** — ela pagou. Os
   md5 desta branch eram de `af90809`, e a Onda 6 moveu **sete** deles. A tabela
   vigente é a da seção 2; a que estava aqui morreu.

**O gate foi medido dos DOIS lados, com a MESMA lista de 46 vistas** — a `main` num
servidor próprio e a árvore mergeada no nosso, cada vista capturada 2× e estável.
**40 das 46 saem bit-idênticas à `main`. As 6 que mudam são todas do Sol**, e são
exatamente as que esta onda comprou: as quatro da abertura (`sol`, `soldisco`,
`solrampa`, `solestouro`) mais `solreal4mkm` e `solreal1ua`. Junto: **1.543 testes
verdes**, `tsc` e `eslint` limpos, e os quatro juízes de navegador verdes —
`atlas-smoke`, `busca-smoke`, `a11y`, `voo-smoke`.

**Os dois pontos de encontro previstos** — `src/three/director.ts` e
`scripts/visual/ab-identidade.mjs` — resolveram-se como o desenho dizia: os dois
lados escreveram em regiões diferentes.

**E a AÇÃO DE MERGE declarada no código foi EXECUTADA: a constante duplicada morreu.**
`RAIO_SOL_KM = 696_340` existia nos dois lados. Sobrou **um**, em
`src/three/escala.ts`; `src/lib/atlas/eclipse.ts` importa de lá e RE-EXPORTA para os
consumidores dele (o driver do eclipse e os oráculos de `eclipse.test.ts`, que não
precisam saber de onde o número vem). A aresta não abre ciclo: `escala.ts` só depende
de `AU_KM` e `AU_PARA_PC`, os mesmos dois que o eclipse já importava. **A física da
umbra e o desenho do Sol não podem mais divergir nem por um km.**

**A mesa continua sendo esta.** As duas árvores ainda existem; trabalhe AQUI e não no
repo principal, para não misturar as histórias. `node_modules` da nossa mesa segue
sendo symlink para a do principal: **só leitura**, nunca instalar por lá.

---

## 2. Estado, em números — e a tabela de md5 VIGENTE

- **A onda está mergeada** com a Onda 6 (`c25d701`).
- **1.543 testes verdes**, `tsc --noEmit -p tsconfig.app.json` e `eslint` limpos.
- **46 vistas medidas dos DOIS lados; 40 bit-idênticas à `main`**, as 6 restantes
  todas do Sol.
- **Quatro juízes de navegador verdes:** `atlas-smoke`, `busca-smoke`, `a11y`,
  `voo-smoke`.

**O gate visual, que é a prova da casa:**
```
cd /Users/fgferre/Github/.worktrees-sol-real
npx vite --port 5199 --strictPort &
DOZERO=1 APP_URL=http://127.0.0.1:5199 JOBS=3 node scripts/visual/ab-identidade.mjs antes
pkill -f "vite --port 5199"
```

**A LISTA QUE ESTAVA AQUI ERA DE `af90809` E MORREU.** A Onda 6 entrou depois de esta
branch nascer e moveu sete vistas — **não fomos nós**. Medido em 2026-08-13, na árvore
mergeada:

| vista | md5 VIGENTE | md5 que MORREU | quem moveu |
|---|---|---|---|
| `terra` | `ab40ab3b0d3b` | ~~`ff48acbaf3a7`~~ | Onda 6 (texturas reais) |
| `terranb` | `1ec9120c745f` | ~~`1c0509b1d6cc`~~ | Onda 6 |
| `lua` | `39ce4845c9f4` | ~~`e54f7aa79a2a`~~ | Onda 6 |
| `terralua` | `fb35311ee340` | ~~`7b5378507749`~~ | Onda 6 |
| `ua40` | `48adc0f55631` | ~~`a607e3cf57ab`~~ | Onda 6 (ponto fotométrico MH18) |
| `solreal40ua` | `48adc0f55631` | ~~`a607e3cf57ab`~~ | Onda 6, idem |
| `solreal1ua` | `205421df6f9c` | ~~`f665b6bfe84c`~~ | Onda 6, idem |
| `solreal4mkm` | `8a43f749a632` | — | não se moveu |

**NÃO se moveram, e continuam sendo valor esperado:** `interno d98cbef70849 ·
travessia b85162ede6cf · mergulho 6876e851031a · edgeon 4fbd07002a9a · faceon
d05591e27ea4 · retrato 23bb22402f40 · solestrela 22f5fab0992e · hero200 b4a2d03ed3e9
· hero600 4311d0ccbc15 · hero950 d11a8df86b68 · hero8 d7c1d2d12726 · ua500
5f8136c12732 · ua150 9b3e75b2af91 · atlas e9544b84cca2`

**As QUATRO do rebaseline que o dono aprovou:** `sol d3f110e281d3 · soldisco
06d7c8d406cd · solrampa 1ad5c3e89220 · solestouro 7306f0d4f044`

**A igualdade da F1 sobreviveu ao merge, e agora vale contra a casa inteira:**
`solreal40ua` e `ua40` devolvem `48adc0f55631` nos DOIS lados, `main` e mergeada. A
40 UA o Sol real e o inflado continuam sendo o mesmo ponto — **mudou o valor do par,
não a relação.**

**O QUE AINDA FALTA NESTA ONDA, sem inflar:** a **F4** (descer até o Sol pela escada
do Atlas, ~35 linhas em `director.ts`), a **F5** (Sgr A✱, com o custo em capturas
ainda EM ABERTO) e **a onda da exposição** (a tela branca, já com causa medida, e que
é a primeira queixa do dono ainda aberta). O detalhe de cada uma está na seção
**"O que falta depois"** (atenção: há DUAS seções numeradas 5 neste arquivo — a
outra é histórico).

---

## 3. O que já fechou

- **F0** — cadastro de escala (`src/three/escala.ts`) e o selo que NOMEIA o culpado
  e o fator. As dívidas de corpo carregam a fase que as paga; quando a F3 e a F5
  entrarem, o teste passa a exigir fator 1 sozinho.
- **F1** — porta `?solreal=1`, as duas pontes de escala para o GLSL (sem elas o raio
  físico vira `"0.000000"` e apaga coroa e CME **em silêncio**), e as três fotos que
  refutam a frase "escala real seria invisível".
- **F2** — o Sol saiu da janela-em-parsec e entrou na lei do palco (4 px na tela,
  cushion 2×), a mesma da Terra e da Lua. Uma lei só, com o raio como termo.
- **O gate da F2 foi MEDIDO e DISSOLVIDO:** o z-fighting temido não existe —
  `sol/sun.js` é a única malha do Sol sem `depthWrite: false`, então há UM escritor
  de profundidade, não dois.
- **As cinco queixas de navegação do dono**, todas fechadas: multitoque que trocava
  o enquadramento sozinho, ponteiro preso em gesto cancelado, arrasto nos dois eixos
  (girando em torno do eixo alvo→Sol, que não muda a luz — provado a 1e-12), roda e
  pinça movendo a escada, polo do corpo para cima com guarda de degenerescência
  (a câmera chega a **0,002°** do polo no solstício de junho), e o alvo seguindo o
  relógio.
- **Quatro consertos da varredura do projeto irmão:** os testes agora rodam no CI,
  e o selo passou a declarar o terceiro artifício (a cruz de luz das estrelas).

---

## 4. A F3 FECHOU — e VOCÊ JÁ DISSE SIM (2026-08-13)

**Commits `c21ca60` (F3) e `d7cca17` (registro).** Testes 1.448 → **1.435** — a
queda é código APAGADO: as 4 janelas de LOD do Sol viraram 1 e as suítes delas
saíram junto. `tsc`, `eslint` e `atlas-smoke` verdes; 8 mutações conferidas.

A abertura passou a ser filmada a **3,998 milhões de km (5,741 raios solares)** do
Sol de raio físico, com a MESMA composição: o Sol subtende **19,762056°** (76,0% da
altura na lente de 26°), com **0,72 ULP** de diferença para o plano antigo — porque
a posição nova é a antiga multiplicada por `K = R☉/R_artístico`, e não um número
escolhido a olho. A hélice virou exponencial (6,6477 décadas em 24 s).

**Morreram:** `WORLD.sunRadius`, a porta `?solreal=1`, as 4 janelas de LOD e a
dívida do Sol no cadastro de escala (o fator dele agora é **1**).

**AS 19 BATERAM, todas.** Mais as 3 do Sol real, que perderam a porta e não moveram
um bit. **Mudaram só as 4 reservadas — e são estas as que o dono aprovou:**

| vista | md5 VIGENTE (desde 2026-08-13) | md5 que MORREU |
|---|---|---|
| `sol` | `d3f110e281d3` | ~~`a4fbf427778a`~~ |
| `soldisco` | `06d7c8d406cd` | ~~`7a2e6d1f4620`~~ |
| `solrampa` | `1ad5c3e89220` | ~~`ff2b7b4d353a`~~ |
| `solestouro` | `7306f0d4f044` | ~~`3dc8706149b4`~~ |

**O SIM VEIO EM 2026-08-13**, depois de o dono ver os oito PNGs de
`capturas/f3/F3-{ANTES,DEPOIS}-{sol,soldisco,solrampa,solestouro}.png` — que agora
são **histórico da aprovação**, não material de decisão pendente. Os quatro valores
acima foram **RE-MEDIDOS na aprovação**: o gate inteiro rodou de novo a partir desta
mesa, 26 vistas capturadas 2× cada, todas estáveis, as 22 intocáveis bit-idênticas.
**A tabela de referência da casa — `docs/NORTE.md` — já aponta para os md5 novos**, e
os antigos morreram. `solestrela 22f5fab0992e` não mudou, nem as outras 21.

**A tarefa extra NÃO foi feita, e a premissa dela CAIU.** `LAPSE_K` não é a chave do
conserto das rampas de vida — é a chave do modo *lapse* inteiro: qualquer valor > 0
multiplica o relógio por cima da dramaturgia e muda o Sol. E a aceleração da casa é
**invisível** para o gate do conserto, porque ela empurra `cycleTime` direto e
`cycleMultiplier()` segue devolvendo 1. O conserto certo exige um sinal novo e
**editar `sol/activity.js`**, que a regra M3 proíbe — a exceção é a decisão §6.1,
ainda aberta com o dono. (Números corrigidos: a aceleração é **55× no pico por
16,3 s**, não 54× por 13 s.)

**ARMADILHA OPERACIONAL, para quem for rodar o gate:** o arquivo de estado do
`ab-identidade` vive no **tmpdir do sistema** e é COMPARTILHADO com o outro agente —
ele foi sobrescrito no meio de uma medição. Rode sempre com `TMPDIR` isolado
enquanto as duas mesas existirem.

## 5. (histórico) O que estava em voo quando este arquivo nasceu

**A F3 — a abertura refilmada.** Um agente está implementando. Ela mantém a mesma
composição (o Sol tomando ~76% da altura do quadro na lente de 26° do filme) e a
filma de **4,00 milhões de km (5,74 raios solares)**, um lugar que existe, em vez de
em volta de uma bola de 2.269 UA. Depois o Sol encolhe continuamente até virar
estrela, em vez do salto de hoje.

**Ela NÃO fechava sozinha.** Ela parava em "imagens prontas": 4 pares antes/depois
em `capturas/f3/`, para o **dono aprovar**, porque o rebaseline oficial só acontecia
com o sim dele (precedente D11). As 4 que mudaram são `sol`, `soldisco`, `solrampa`,
`solestouro`. **E fechou: o sim veio em 2026-08-13** — a seção 4 tem os md5 vigentes,
e o `NORTE.md` já aponta para eles.

**SE A SESSÃO MORREU NO MEIO — como reconstruir sem o relatório do agente:**

1. `git log --oneline onda-6..sol-real` — se não houver commit de F3, ela não entrou.
2. `git status --porcelain` — se houver arquivo solto, o agente parou no meio de uma
   edição. Rode `npx vitest run` e `npx tsc --noEmit -p tsconfig.app.json` antes de
   qualquer coisa: se estiverem vermelhos, o caminho mais barato é
   `git checkout -- <arquivos>` e refazer a fase, não tentar salvar meia edição.
3. `ls -la capturas/` — os PNGs de antes/depois das 4 vistas estão lá, gravados
   conforme o agente avançou. São eles que o dono precisa ver.
4. A seção F3 de `ESCALA-HONESTA.md` — o agente a atualiza ao fim.

**Tarefa extra, em commit separado:** ligar o conserto que a casa copiou do projeto
irmão e **deixou desligado** — as rampas de vida das regiões ativas alargadas em
1,75×, cuja chave está escrita como zero literal. A casa acelera esse relógio 30 a
54× durante 13 s da abertura, que é exatamente o regime que comprou o conserto.

---

## 5. O que falta depois

- **F4** — descer até o Sol pela escada do Atlas (hoje ela recusa tudo que não seja
  a Terra: `director.ts`, procure `focoCorpoId === 'earth'`). ~35 linhas.
- **F5** — Sgr A✱, o segundo mentiroso (125.884× o raio real). **Custo em capturas
  ainda EM ABERTO** — o gate é medir quais vistas caem na janela em que o passe
  acende, usando `?nobh=1` como par nulo, ANTES de tocar uma linha.
- **Da varredura do projeto irmão, ainda abertos:** a escada de rendição quando o
  quadro engasga (`cvolKilled`/`cmeKilled` são lidos e **nunca escritos**); 22,9 MB
  de buffer de profundidade pago e inútil; a nitidez da cena congelada no arranque
  enquanto os rótulos reafiam; as 6 fotos reais do Sol (a casa tem 8 de corpos e
  **nenhuma** do Sol, e os arquivos vendorizados citam 35 imagens que não existem
  aqui); e a bancada de medição em MOVIMENTO — os 12 juízes da casa olham quadro
  congelado, e sob captura o relógio do Sol é **zero**.
- **A onda da exposição** (a "tela branca"): a causa está medida — o clarão tem
  CINCO escalas e o Atlas multiplica todas por um fator só; quem lava o quadro é
  UMA (deposita 2,22 a meia tela; a seguinte, 0,005). **Não copiar a exposição
  0,418 do irmão:** ela é a conta de um conserto de cor que a casa nunca precisou
  fazer, e copiá-la escureceria tudo 2,44× sem corrigir nada.
  **E em 2026-08-13 o culpado ficou localizado, com arquivo e linha:** de ~1 UA a
  ~8 UA (nove distâncias medidas, todas brancas) quem lava é o **ponto fotométrico**
  do Sol — o vértice 0 da camada de planetas, em ganho PLENO porque a rampa que o
  baixaria só começa em 0,02 pc — espalhado pelo bloom. Provas a 3 UA: com
  `&noplan=1` sai céu preto e o disco laranja honesto de 4,8 px, com `&nosun=1` o
  branco continua, com `&nobloom=1` sai limpo. **E isto é a PRIMEIRA QUEIXA do dono**
  ("não vi o sol procedural" no Atlas): o pedido mais antigo ainda aberto, não item
  cosmético. Conta inteira em `docs/ESCALA-HONESTA.md`, §5 item 6.
- **A tentativa de re-apontar `soldisco`, DESFEITA no mesmo dia (2026-08-13).** A
  vista foi movida de 0,1 pc para **3,0 UA** — a fronteira do portão de 4 px — e a
  mudança foi **desfeita por inteiro** (`git checkout`), por dois motivos: (i)
  ninguém a pediu, e (ii) a 3 UA a foto sai branca do mesmo jeito, pelo motivo do
  item acima. O que sobrou útil é o número: **o portão do palco arma em 3,5962 UA e
  desarma em 7,1924 UA**, e **nenhuma vista da casa mora entre 1 e 40 UA** — a
  fronteira mais interessante do palco não tem juiz nenhum olhando para ela. Isto é
  material para a onda seguinte, **não pendência desta**.
- **`Esc` continua sendo a única tecla do Atlas** e não está escrita em lugar nenhum
  da tela.

---

## 6. Como o dono quer ser tratado

- **Comunicação sempre simples, curta e sem jargão.** Ele é leigo em programação.
  Densidade técnica vai para commits e documentos, nunca para o chat.
- **Modo orquestrador:** delegar a subagentes com contexto mínimo suficiente, e eles
  devolvem só o essencial. A janela principal se preserva.
- **Commits proativos** a cada checkpoint validado; **push só com pedido explícito.**
- Ele decidiu, por escrito, três coisas desta onda: abrir as 4 linhas do núcleo
  herdado do Sol; o selo passar a nomear o culpado e o fator; e a abertura do filme
  manter a mesma composição num lugar real.
