# Retomada — onda do Sol real

**Escrito em 2026-08-13, com a F3 EM VOO.** Este arquivo é o bastão de sessão: quem
chegar numa janela limpa lê ISTO primeiro, depois `docs/ESCALA-HONESTA.md` (que é o
bastão da ONDA, com todo o detalhe medido). Ele morre quando a onda fechar.

---

## 1. Onde o trabalho vive, e a regra que não se quebra

| | |
|---|---|
| **Mesa desta onda** | `/Users/fgferre/Github/.worktrees-sol-real`, branch `sol-real`, criada de `af90809` |
| **Repo principal** | `/Users/fgferre/Github/Viagem-Sol-pela-Milky-Way`, branch `onda-6` |
| **Servidor de captura** | porta **5199**, subido a partir da mesa desta onda |

**A REGRA: nunca escrever no repositório principal.** Há **outro agente trabalhando
nele agora**, na F2c da Onda 6 (eclipse na tela), com 7 arquivos abertos
(`ab-identidade.mjs`, `eclipse.ts`+teste, `lua.ts`+teste, `terra.ts`+teste). As
portas **5173 e 5174 são dele** — não encostar. `node_modules` da nossa mesa é um
symlink para a dele: **só leitura**, nunca instalar por lá.

As duas mesas se encontram em exatamente **dois** arquivos, em regiões diferentes:
`src/three/director.ts` e `scripts/visual/ab-identidade.mjs`. O merge acontece
depois que a Onda 6 fechar: puxa-se `main` para cá, resolvem-se os dois, roda-se a
bateria, e só então junta.

---

## 2. Estado, em números

- **19+ commits** na branch (`git log --oneline onda-6..sol-real`).
- **1.448 testes verdes**, `tsc --noEmit -p tsconfig.app.json` e `eslint` limpos.
- **22/22 vistas oficiais bit-idênticas** na última medição completa.

**O gate visual, que é a prova da casa:**
```
cd /Users/fgferre/Github/.worktrees-sol-real
npx vite --port 5199 --strictPort &
DOZERO=1 APP_URL=http://127.0.0.1:5199 JOBS=3 node scripts/visual/ab-identidade.mjs antes
pkill -f "vite --port 5199"
```
Os md5 que têm de bater (fora as 4 da abertura, que a F3 muda de propósito):
`interno d98cbef70849 · travessia b85162ede6cf · mergulho 6876e851031a · edgeon
4fbd07002a9a · faceon d05591e27ea4 · retrato 23bb22402f40 · solestrela 22f5fab0992e
· hero200 b4a2d03ed3e9 · hero600 4311d0ccbc15 · hero950 d11a8df86b68 · hero8
d7c1d2d12726 · ua500 5f8136c12732 · ua150 9b3e75b2af91 · ua40 a607e3cf57ab · terra
ff48acbaf3a7 · terranb 1c0509b1d6cc · lua e54f7aa79a2a · terralua 7b5378507749 ·
atlas e9544b84cca2`
E as 3 da F1: `solreal4mkm 8a43f749a632 · solreal1ua f665b6bfe84c · solreal40ua
a607e3cf57ab` (esta última é BIT-IDÊNTICA a `ua40` — a 40 UA o Sol real e o inflado
são o mesmo ponto).

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

## 4. A F3 FECHOU — e está esperando O SEU SIM

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
um bit. **Mudaram só as 4 reservadas:**

| vista | antes | depois |
|---|---|---|
| `sol` | `a4fbf427778a` | `d3f110e281d3` |
| `soldisco` | `7a2e6d1f4620` | `06d7c8d406cd` |
| `solrampa` | `ff2b7b4d353a` | `1ad5c3e89220` |
| `solestouro` | `3dc8706149b4` | `7306f0d4f044` |

**As 8 imagens de aprovação:** `capturas/f3/F3-{ANTES,DEPOIS}-{sol,soldisco,solrampa,solestouro}.png`.
**O rebaseline oficial só acontece com o sim do dono.** Enquanto ele não vier, a
tabela de referência da casa segue apontando para os md5 ANTIGOS.

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

**Ela NÃO fecha sozinha.** Ela para em "imagens prontas": 4 pares antes/depois em
`capturas/`, para o **dono aprovar**. O rebaseline oficial só acontece com o sim
dele. As 4 que mudam são `sol`, `soldisco`, `solrampa`, `solestouro`.

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
