# Pendências — o que está quebrado e o que falta

**Este é o primeiro arquivo a ler.** Lista viva do que está aberto, no jeito
que o dono vê. O detalhe técnico mora nos commits, no `NORTE.md` e na
`LEI-DA-ESTRELA.md`.

**Como esta lista funciona:**

- O dono reportou um problema? Escreva aqui **naquele momento**, com as
  palavras dele.
- Item resolvido **sai da lista** e vira commit. Isto é o que está aberto,
  não um diário.
- A ordem é por **o quanto incomoda quem usa**, não por dificuldade.
- **O número é IDENTIDADE, não posição.** Item novo entra no fim da sua
  seção, com o próximo número livre. Números aposentados não se reaproveitam.

A primeira mensagem de uma conversa nova pode ser: *"Leia docs/PENDENCIAS.md e siga."*

**⚠ A PUPILA ESTÁ REPROVADA — não a ressuscite.** `src/three/core/pupila.ts`
existe, nasce desligada e fica como lápide. O dono a recusou por escrito
(item 39). O que entra no lugar é compressão fixa na emissão —
`LEI-DA-ESTRELA.md` §7.

**O plano da estrela está em [`docs/LEI-DA-ESTRELA.md`](LEI-DA-ESTRELA.md).**
Os itens 3, 4, 5, 12 e 40 são um só conserto: pôr a bola 3D e o ponto do Sol
na mesma escala de brilho (passos F1/F2). Os itens 8, 9 e 10 são HUD,
independentes. O item 21 é memória paga e inútil (`depth: false` no engine).
O item 38 (`aFocus`) é dormente por desenho — **não apagar**; é o canal do
passo E3.

Palavras do dono no fim da rodada de 14/08: *"precisamos começar a tirar as
coisas da frente"*. **RESPONDIDA em 15/08: pela fundação.** A onda da luz
(F0/F1/F2a) entrou; o estado dela está no bloco abaixo.

---

## ONDA DA LUZ — onde ela parou (15/08)

**O que já está na `main` e é definitivo:**

- A régua do item 3 ganhou JUIZ (`julgarEscada` em `luz-do-quadro.mjs`), com
  limiares que saem de número que já existe na casa. O piso do céu é MEDIDO com
  o Sol desligado (`&noplan=1`): 0,048 e 0,300% com bloom; 0,039 e 0,113% sem.
- Nasceu `src/three/luzDaCasa.ts` — a unidade de brilho, irmã de `escala.ts`.
- `escala.ts` ganhou a SEGUNDA COLUNA (`fatorDeBrilho`), com as três pernas
  (espelho, completude, sabotagem). Ela já declarou cinco coisas que estavam
  caladas, entre elas as ~26 magnitudes da fotosfera e o ponto-zero 4,83/4,85.
- A compressão `β·asinh(x/β)` foi EXTRAÍDA de `post.ts` para `shaders/common.ts`
  e aplicada na emissão de `STAR_FRAG`. **Nasce desligada.**
- Existe o teste de invariante disco↔ponto, REPROVANDO de propósito
  (`it.fails`), com o vão de hoje pinado em número.
- A cessão do Sol-ponto tem porta de bancada: `?bcede=` re-ancora a rampa no
  gate do palco (`cessaoPeloGate`, terra.ts), composta por `max` com a
  dominância — fechada por padrão, 0 ⇒ caminho herdado bit a bit.
- A F2 está CONSTRUÍDA atrás de `?bfoto=1`: a malha do Sol passa a emitir
  `comprimir(cor × vão, β do bemis)` por cirurgia de texto no material vivo
  (`cirurgiaDaFotosfera`, stellarBody.ts — padrão `domarOBloom`; nenhum
  sol/*.js aberto). Inerte sem `?bemis=`. Fator: `vaoRadiometricoNaTroca`
  (~2,74e10), nunca digitado. 51 vistas bit-idênticas com a porta fechada.

**O diagnóstico, que mudou com a medição:** a compressão na emissão **não** mata
sozinha a tela branca — medido, nenhum β limpa o quadro sem esmaecer as
estrelas. Sem bloom o quadro JÁ É honesto em toda a escada (borrão de 8 a 12 px).
**Quem lava é o bloom**, que recebe o ponto do Sol quatro ordens de grandeza
acima do próprio limiar.

**A saída achada, e ela respeita a restrição do dono** — palavras dele,
15/08: *"eu nao quero que as estrelas de fundo diminuam ou morram"*. A
compressão entra DENTRO do passa-alta do bloom, com um OMBRO: abaixo do ombro a
identidade é exata (todo clarão legítimo passa bit a bit), acima dele só o Sol
vive e é comprimido. Como o `UnrealBloomPass` soma o clarão POR CIMA do buffer
de entrada, a imagem direta — Terra, planetas, galáxia — nunca passa pela curva.

Medido em `?bemis=300&bbloom=0.45&bombro=40`, contra hoje:

| | hoje | proposta |
|---|---|---|
| 1 UA — quadro lavado | 100% | 3,8% |
| 2000 UA — quadro lavado | 92% | 1,9% |
| borrão (1 → 2000 UA) | 900 → 900 | 168 → 120 |

E o que NÃO mudou, no pixel: `terra`, `interno`, `faceon`, `hero200`,
`solestrela`, `soldisco` — todos com delta máximo de 1 nível (ULP de
compilador). `hero8` muda, e mudar ali é o mecanismo funcionando: a vista está a
0,6 pc de Betelgeuse, que é um mini-Sol com a mesma doença.

**ESTÁ TUDO ATRÁS DE PORTAS DE URL, DESLIGADO POR PADRÃO.** Nenhum pixel do
produto mudou. As cinco portas estão registradas no selo.

**O QUE FALTA, e é decisão do dono, com as imagens em `capturas/`:**

1. **Aprovar o visual** de `ITEM3-tres-caminhos.png` e, com o "sim", ligar como
   padrão (tirar as portas) — o que fecha o item 3.
2. **O halo do Sol fica generoso** (~170 px contra os ~40 da régua ideal). A
   pergunta do dono que abriu isso: *"onde porque nao aparece o sol procedural a
   1 UA isso nao seria verdadeiro?"* — e ele tem razão. A bola 3D ESTÁ
   desenhada e no tamanho certo (7,5 px a 1 UA, prova em `SOL-A-1UA.png`); o que
   acontece é que **o ponto continua despejando toda a luz dele por cima da
   bola** e a engole. É o item 40 (dois Sóis) visto por dentro.
3. **A CESSÃO DO PONTO foi construída e MEDIDA (15/08, segunda rodada) — e a
   medição corrigiu o registro e devolveu a ordem da Lei.** O registro dizia
   "ninguém escreve no canal `aCede`" e era falso: o Director já escrevia a
   cessão por dominância todo quadro — ela é que dá 0 exato longe de ~0,55 UA,
   por desenho. A porta nova `?bcede=` re-ancora a rampa no gate do palco
   (4 px × o valor da porta; `cessaoPeloGate`, terra.ts), composta por `max`
   com a dominância, neutra fechada (47/47 vistas bit-idênticas). Medido:
   - cessão PARCIAL é impotente: 0,87 de cessão a 0,8 UA ⇒ quadro bit-idêntico
     (o ponto está 11 ordens acima da saturação; multiplicar não aparece);
   - cessão PLENA a 1 UA mata a tela branca SOZINHA, sem compressão nenhuma:
     borrão 900 → 6 px, lavado 100% → 0,97% (0,71% com as b-portas) — e o céu
     inteiro fica de pé, nada esmaece;
   - mas a bola aparece LARANJA E FRACA (`CESSAO-1UA-tres-mundos.png`): o
     ponto escondia o vão F2 — a fotosfera emite ~1 autorado, não a radiância
     real da unidade da casa;
   - e pré-F2 a rampa suave é impossível: a lei candidata cava um VALE no
     borrão — 102 → 6 → 171 px em 0,067 → 1 → 3,6 UA — um pop espacial.
   **A Lei tinha razão: "nada acima de F2 funciona antes de F2." O próximo
   passo da onda é F2 — a fotosfera na unidade da casa, com a compressão na
   emissão alcançando a malha. A cessão fecha DEPOIS, com `?bcede=` já pronta
   como instrumento.**
4. **A F2 foi construída e MEDIDA no mesmo dia (`?bfoto=1`), e ela SANA a
   cessão** — como a Lei previu. Com fotosfera verdadeira + cessão a 1 UA:
   borrão 110 px, lavado 2,0%, e a sequência 0,5 → 1 → 2 UA dá
   200 → 110 → 173 px — sem o vale, sem o pop: a bola brilha de verdade e
   alimenta o próprio clarão (`F2-1UA-quatro-mundos.png` — o Sol vira
   estrela branca honesta e a cena não esmaece). O teste-dívida (`it.fails`)
   segue reprovando de propósito: só verdece quando isto virar padrão.
   **O custo declarado, para o dono decidir com a imagem
   `luz-0p027ua-bemis300bfoto1.png`:** de perto (≤0,07 UA) a luz verdadeira
   em exposição fixa é uma parede branca — fisicamente o que uma câmera
   apontada ao Sol faz, mas mata a granulação querida das vistas próximas.
   A saída que a própria Lei prevê (§E3): a paleta H-alfa vira OVERRIDE
   DECLARADO da instância nº 1 — um "filtro solar" assumido no selo, não
   uma lei de luz. Desenhar esse filtro é o próximo passo natural; decidir
   se ele entra é do dono.

   **O dono JULGOU a rodada em 15/08, e reprovou a forma crua.** Palavras
   dele: *"nao ficou bom, está muito estranha a forma que transiciona do
   sol procedural, de repente vira um clarão que ocupa a tela toda e nao
   se vê mais nada na tela. nao faz sentido nenhum. ficou muito ruim"*.
   O defeito apontado é a TRANSIÇÃO: a radiância verdadeira sem filtro
   cega a tela na aproximação. O filtro solar declarado deixou de ser
   opção e virou REQUISITO do pacote — sem ele, nada disto vira padrão.

   **O FILTRO FOI CONSTRUÍDO E MEDIDO na mesma rodada.** A emissão exibida
   desce EM STOPS (`pow(vão, uFiltroSolar)`) da radiância verdadeira para a
   paleta H-alfa autorada, guiada pela MESMA régua de dominância da cessão
   (`1 − g(disco/clarão)`, rampa 1→2,5 — nenhum número novo). Escrita por
   quadro pelo Director; só os pixels do próprio disco mudam — a cena
   nunca esmaece, nada depende de foco. Medido na aproximação
   2 → 0,027 UA (`FILTRO-aproximacao.png`): lavado máximo 8,6% (0,35 UA),
   pico dessatura de perto (0,948) e a granulação volta inteira — o ponto
   cego morreu. 51 vistas bit-idênticas com a porta fechada; 1672 testes.
   Falta o julgamento do dono sobre o filme da aproximação.

E outra, que travou um conserto ruim no mesmo dia: *"vc nao pode consertar
uma coisa e criar outro problema, pense nos impactos das suas decisoes"*.

**Publicar está em aberto e é decisão dele.** Em 2026-08-08 ele pediu, com
estas palavras: *"Consegue publicar o projeto automaticamente a cada commit
no main no git spaces"* — e é isso que `.github/workflows/deploy.yml` faz.
Segurar o push **não foi pedido dele**: foi um agente que inventou a trava.
Qualquer push na `main` põe o site no ar. Sem pedido explícito, não se
publica; o pedido de publicar continua de pé.

Números aposentados (1, 2, 14, 29, 30, 31, 32, 35): `git show de16542 -- docs/PENDENCIAS.md`.

---

## ALTA — o dono vê e incomoda

**0. A tela congelada virou o juiz — e é daqui que quase tudo nasce.**
Aprovar trabalho passou a depender de *"as vistas saem bit-idênticas"*.
Todo conserto que mexia em pixel era reprovado; todo defeito virava uma
camada nova por cima. Cinco commits exibiram “18/18 vistas idênticas” como
aval de trabalho de HUD — e as vistas são capturadas sem HUD.

Palavras do dono, 2026-08-11: *"Nunca foi criada essa regra que nada muda
na tela. Estamos sempre caminhando no sentido das melhorias, se nada muda
na tela isso fica impossível."* E em 2026-08-13: *"nada é fixo, tudo sempre
pode ser questionado se melhora UX."*

O que ela ainda cobra: bancada cega a movimento (item 11); fotos reais do
Sol nunca julgadas por ele (item 22).
→ `docs/NORTE.md`, seção “Como medir”.

**3. A tela fica branca quando o Sol está longe.** *(CONSERTO MEDIDO E ATRÁS DE
PORTA — ver o bloco "ONDA DA LUZ" acima; falta o sim do dono para virar padrão.)*
De ~1 UA a ~2.000 UA o quadro lava. O Sol encolhe 4.000 vezes e a mancha
na tela não muda de tamanho. São dois defeitos: o ponto do Sol não encolhe,
e o borrão da lente multiplica. A bola 3D está certa; o brilho por cima é
que está solto. Entre a bola (some ~7,2 UA) e a estrela com espinhos
(acende ~4.000 UA) não há nem uma coisa nem outra — o Atlas abre no meio
desse vão.

O conserto não é teto de brilho (proibido) nem a pupila (reprovada). É a
lei da estrela: mesma escala de brilho para bola e ponto, compressão fixa.

Palavras do dono, no dia: *"mas isso nao deveria ser so para o sol. toda
estrela deveria seguir o mesmo mecanismo nao acha? baseado nas magnitudes
da estrela obviamente. tinhamos falado disso quando geramos o plano de como
fariamos o motor estelar para gerar proceduralmente todas as estrelas
quando nos aproximarmos delas"*

→ `docs/LEI-DA-ESTRELA.md`. Régua: `scripts/visual/luz-do-quadro.mjs`.

**4. O Atlas desenha com o brilho apagado 100× em relação ao filme.**
Curativo do item 3. As estrelas ficam secas no Atlas e cheias de vida no
filme. Decisão do dono: não pode existir diferença de desenho entre os
dois modos. Morre com o item 3.
→ `claraoDoAtlas` em `atlasConfig.ts`.

**5. O Sol do Atlas está congelado no máximo solar.**
Cheio de manchas e explosões; o do filme começa limpo. A fase do ciclo
deveria sair da data simulada. Mesma frente do item 4.

**6. A cena não reafia ao trocar de monitor.**
Os rótulos reafiam; a cena 3D não. A nitidez é decidida uma vez, no
arranque.

**7. Trocar a qualidade ainda recarrega a página.**
O dono pediu “nada recarrega, padrão AAA”. A Fase A fechou 3 dos 4
recarregamentos; sobra a qualidade, mais três automatismos.
→ `docs/NORTE.md`, seção “Ajustes”.

**39. Estrela focada apaga as outras, ligando e desligando de repente.**
Palavras do dono: *"uma coisa que percebi é que agora quando uma estrela
está focada, as demais simplesmente desaparecem (ligam/desligam
abruptamente), nao quero esse efeito, quero que as estrelas continuem
aparecendo, nao precisa ter esse efeito bizarro..."* E: *"eu quero que
independentemente do astro/objeto que está em foco na tela nunca se
esmaeça a grandeza da cena galáctica e do starfield, exuberante... nada de
efeitos de pupila ou sei lá como vc chama isso..."*

Medido: era a pupila (`?pupila=1`), 16 stops ao focar Sirius. No app limpo
ela está desligada e nenhuma camada esmaece. Item fica aberto até ele
conferir no app limpo.

**40. Dois Sóis com rótulo ao mesmo tempo.**
Palavras do dono: *"percebi tb que existem 2 sois (com tags) simultaneos
na cena. será que tem mais outras duplciacoes? ou isso já está no pipeline
para ser resovido?"*

O rótulo dobrado não se reproduziu. O que existe: o Sol é **desenhado**
duas vezes (bola 3D + ponto da camada dos dez corpos). Na abertura do
Atlas o sistema inteiro empilha num pixel e o borrão branco impede de ver
o que se clica. O conserto é o item 3. Não criar segundo mecanismo de
rótulos — o `LabelCanvas` já resolve colisão.

---

## MÉDIA — afeta o produto, não salta aos olhos

**8.** `Esc` é a única tecla do Atlas e não está escrita na tela. A busca
também não tem atalho.

**9.** Tela estreita quebra o rodapé. Abaixo de 900 px a base do HUD estoura.

**10.** O selo de honestidade pode atrasar até 3 segundos. Só atualiza
quando a interface redesenha.

**11.** A bancada de medição é cega para movimento. Toda captura congela
o relógio.

**12.** Nenhuma foto de referência mora entre 1 UA e 40 UA — onde a tela
lava. A régua de luz e as vistas `ua2`…`ua2000` já enxergam a faixa.

**13.** Sagittarius A✱ ainda é 125.884× maior que o real. Segundo
mentiroso de escala. Cadastro em `escala.ts`.

**15.** Quando o quadro engasga, não há como aliviar o Sol. As chaves de
desligar coroa e ejeção são lidas e nunca escritas.

**16.** Engasgo ao entrar no Atlas (a medir): o relógio do Sol acumula
fora de quadro e volta em salto.

**17.** O Sol solavanca quando o relógio acelera. O conserto existe, veio
do projeto irmão e está desligado. Ligar depende de editar `sol/activity.js`.

**18.** A luz trata o Sol como ponto sem tamanho. Certo para planetas,
errado a poucos raios solares — e agora a câmera chega lá. Sem penumbra.

**19.** Texturas que não passaram e um mapa inventado. Titã tem emendas,
Europa tem 68 linhas pretas no polo sul, Ceres é inventado pela fonte,
Vênus não tem foto em luz visível.
→ `docs/reference/ASSETS.md`.

**20.** Asteroides são elipsoides, e o HUD não confessa. Diz “cartografia
real” sem admitir o recuo procedural.

**33.** O selo e o painel discordam sobre quantas camadas existem.
Ajustes oferece 13, a gaveta do Atlas 6, o selo conhece 17.

**34.** A tela de carregamento desenha outra Via Láctea, de dois braços.
O modelo da casa tem quatro.

**36.** (Suspeita a medir.) Duas leis de poeira convivendo. Medir antes
de mexer — esta família já produziu um falso positivo (cessão da faixa).

**41.** (Suspeita a medir.) `core/engine.test.ts:44` diz que a vista `sol`
está a 0,063 pc; o valor vivo é 1,2955e-7 pc (`lodStellar.test.ts:1636`) —
487.000× de diferença. O literal envelheceu na F3 e ninguém o moveu. O teste
está VERDE só por isso: a asserção da `:77` exige que toda vista da lista
esteja ACIMA de 0,05 pc, então trocar o número pelo certo deixa o teste
vermelho **sem ter achado defeito nenhum**. O conserto certo é mover `sol`
para a lista `PROFUNDAS` (`:62-66`) e medir o corte de câmera lá. Achado em
15/08, na onda da luz; não tocado de propósito.

**37.** (Suspeita a medir.) As nuvens escuras podem estar apagando o que
está na frente delas. Par de capturas antes de tocar em qualquer linha.

---

## BAIXA — dívida interna, ninguém vê

**21.** 22,9 MB de memória de vídeo paga e inútil (buffer de profundidade
da tela; o composite é um quad). Uma palavra: `depth: false` no engine.

**22.** 35 imagens de referência citadas que não existem, e as 6 fotos
reais do Sol nunca foram baixadas. As seis passam na régua da bancada;
o dono nunca as julgou.

**23.** A granulação do Sol não é física (45 Mm contra 1 Mm reais) e muda
55% conforme a placa de vídeo.

**24.** A dose da ejeção de massa (1,4) nunca foi calibrada.

**25.** Mergulhar no Sol é impossível abaixo de 1,44 raios solares — o
corte come a superfície.

**26.** O brilho das estrelas é relativo, não absoluto.

**27.** Faltam fixtures Horizons de Vênus, Júpiter, Saturno e Urano.

**28.** Dívidas internas de cor a re-dosar.

**38.** Canal `aFocus` dormente por desenho — **não apagar.** É o que
apaga o ponto de uma estrela quando ela ganha corpo (passo E3 da lei).
Se a onda do motor terminar sem fiá-lo, aí sim vira peso morto.

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

*(vazia — esperando)*
