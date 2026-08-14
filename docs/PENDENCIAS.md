# Pendências — o que está quebrado e o que falta

**Este é o primeiro arquivo a ler.** Ele é a lista viva do que está aberto neste
projeto, escrita em português simples, do jeito que o dono vê — não do jeito que o
código chama. O detalhe técnico mora nos commits, no `NORTE.md` e no
`ESCALA-HONESTA.md`; aqui só o essencial e o endereço de onde está o resto.

**Como esta lista funciona:**

- O dono reportou um problema? Escreva aqui **naquele momento**, com as palavras
  dele. Não no fim da sessão, não depois de confirmar.
- Item resolvido **sai da lista** e vira commit. Isto é o que está aberto, não um
  diário.
- A ordem é por **o quanto incomoda quem usa**, não por dificuldade.
- **O número é IDENTIDADE, não posição** (regra de 2026-08-14). Outros arquivos
  apontam para "o item 12 das pendências"; renumerar a lista quebraria esses
  apontamentos em silêncio. Item novo entra **no fim da sua seção**, com o próximo
  número livre — quem lê segue a ordem das seções, não a dos números.

**Estado do projeto em 2026-08-13:** a onda do Sol real fechou e está na `main` (Sol
com o tamanho verdadeiro, abertura refilmada e aprovada, Onda 6 integrada, a escada
do Atlas descendo até o corpo do Sol). O repositório tem **uma branch só**. A `main`
está **74+ commits à frente do GitHub e NÃO publicada**.

**Atenção, e isto é correção de um erro cometido aqui mesmo:** a primeira versão desta
linha dizia que não publicar era "decisão do dono". **Não era.** Foi o agente que
propôs segurar, ao ver que o dono estava enxergando coisas quebradas no visual, e o
dono nunca disse isso — ele respondeu outra coisa (*"acho que temos que ir resolvendo
aos poucos"*) a outra pergunta. Pior: em **2026-08-08 ele PEDIU o contrário**, com
estas palavras — *"Consegue publicar o projeto automaticamente a cada commit no main
no git spaces"* —, que é justamente o que `.github/workflows/deploy.yml` faz hoje.
Então **publicar segue em aberto e é decisão dele**, e o mecanismo que ele pediu está
vivo: qualquer push na `main` põe o site no ar. Hoje a única trava é um agente lembrar
de não dar push, o que não é trava nenhuma.

**Em 2026-08-14 entraram o item 0 e mais 10 itens** (29 a 38), vindos de uma leitura
dos 170 commits desde a fusão do atlas. O item 0 é a causa que explica quase todos os
outros; por isso abre a lista, mesmo sem ser o número 1.

---

## ALTA — o dono vê e incomoda

**0. A TELA CONGELADA VIROU O JUIZ — e é daqui que quase tudo nasce.**
A partir de 10/08, aprovar trabalho passou a depender de uma coisa só: *"as vistas
saem bit-idênticas"*. O efeito foi mecânico: todo conserto que mexia em pixel era
reprovado, e todo defeito virava uma **camada nova por cima do defeito anterior** — o
Sol desenhado duas vezes, o clarão só do Atlas (item 4), o limiar das luas. Cinco
commits chegaram a exibir "18/18 vistas idênticas" como aval de trabalho de **HUD** —
e as vistas são capturadas **sem HUD** (`?shot=2` apaga o HUD inteiro,
`src/hud.css:1298`). Prova vazia, cinco vezes.
**A regra foi REVOGADA pelo dono em 2026-08-11** e até hoje não estava escrita em
lugar nenhum. As palavras dele: *"Nunca foi criada essa regra que nada muda na tela.
Estamos sempre caminhando no sentido das melhorias, se nada muda na tela isso fica
impossível"*. E em 2026-08-13: *"nada é fixo, tudo sempre pode ser questionado se
melhora UX"*. Registro datado anterior a 2026-08-14 que trate bit-igualdade como meta
lê-se com esta revogação ao lado — a casa aposenta, não reescreve.
**O que ela ainda cobra hoje, três coisas:**
- a escada que OLHA O SOL pula de 1 UA para 40 UA sem nenhum degrau no meio — a faixa
  onde a tela lava não tem juiz (item 12);
- a bancada é cega para movimento (item 11), e foi por aí que o item 2 passou;
- a rodada de fotos reais do Sol nunca aconteceu (item 22) — as seis passam na régua
  da própria casa (`docs/ESCALA-HONESTA.md:884-891`), que é veredito de bancada, não
  decisão do dono; ele nunca foi consultado sobre ela.
→ `scripts/visual/ab-identidade.mjs:135-136` (`solreal1ua` e `solreal40ua`, um ao lado
do outro), `docs/NORTE.md` (seção "Como retomar os gates", onde a revogação também
está registrada desde 2026-08-14).

**1. O rótulo do Sol diz "FOBOS".**
Clicar no Sol no Atlas leva até ele, mas o nome que aparece na tela é o de outro
corpo. É a primeira coisa que se vê ao chegar lá.
→ commit `51d7777`, defeito 1.

**2. Faixas laranja andando pela tela.**
Um auditor viu faixas atravessando o quadro com o relógio andando. **Não reproduzido
ainda** — e não é fácil, porque a bancada de medição congela o relógio (item 11).
→ commit `51d7777`, defeito 3.

**3. A tela fica branca quando o Sol está longe.**
De ~1 UA a ~8 UA o quadro lava inteiro. Nove distâncias medidas, todas brancas.
*O que já sabemos:* o Sol é desenhado como um ponto de luz sem teto — a 1 UA ele
deposita cem bilhões onde branco já é 1 — e o borrão da lente espalha isso. **A bola
do Sol está certa; o brilho por cima é que está solto.**
**O conserto é a AUTO-EXPOSIÇÃO — a pupila —, e teto de brilho é PROIBIDO por
escrito.** Está no `NORTE.md` em dois lugares, com todas as letras: *"NÃO 'consertar'
com teto de brilho — a auto-exposição da Onda 8 é o conserto"*
(`docs/NORTE.md:3487-3490`) e *"é o 'teto de brilho' que a Onda 4 proíbe"*
(`docs/NORTE.md:3583-3587`). O motivo é simples: com teto, o Sol ficaria quase tão
fraco quanto uma estrela comum — bonito e mentiroso, o oposto da tese da casa.
**Um projeto de conserto já foi reprovado exatamente por isto. Esta linha existe para
impedir a terceira tentativa.**
→ `docs/ESCALA-HONESTA.md:654-739`.

**4. O Atlas desenha com o brilho apagado 100× em relação ao filme.**
É curativo, criado para esconder o item 3 dentro do sistema solar. É por isso que as
estrelas ficam secas no Atlas e cheias de vida no filme. **Decisão do dono: não pode
existir diferença de desenho entre os dois modos — o Atlas herda o look do filme.**
Morre junto com o item 3.
→ `atlasConfig.ts`, `director.ts` (`claraoDoQuadro`).

**5. O Sol do Atlas está congelado no máximo solar.**
Cheio de manchas e explosões, enquanto o do filme começa limpo. São dois Sóis
diferentes na mesma casa. O honesto é a fase do ciclo sair da **data** simulada.
→ mesma frente do item 4.

**6. A cena não reafia ao trocar de monitor.**
Os rótulos reafiam, a cena 3D não — a nitidez é decidida uma vez, no arranque.
→ `docs/ESCALA-HONESTA.md:856`.

**7. Trocar a qualidade ainda recarrega a página.**
O dono pediu "nada recarrega, padrão AAA". A Fase A fechou 3 dos 4 recarregamentos;
sobra a qualidade, mais três automatismos que decidem sozinhos sem o visitante
escolher.
→ `docs/NORTE.md:3734-3800`.

**29. O painel entra por baixo da barra de botões, e o "x" de fechar não recebe
clique.**
Os dois se penduram em réguas diferentes: a barra desce junto com a altura da janela
(`top: 8.5vh`, `src/hud.css:293`) e os painéis param sempre no mesmo ponto
(`top: 6.4rem` — Ajustes em `src/hud.css:1309`, Camadas em `:672`, Busca em `:735`).
Acima de **~881 px de altura de janela** os dois se cruzam, e quem fica por cima é a
barra (camada 45 contra 20): ela engole o clique. Num monitor 1440p a faixa comida é
de umas quatro dezenas de pixels — exatamente onde mora o "x". Vale para os três
painéis.

**30. O clique não bate com o nome escrito na tela.**
Quem **desenha** os nomes joga fora o que não coube — nome colidindo com nome, faixa
do rodapé, canto dos controles (`src/components/LabelCanvas.ts:84,99,101-104,127`).
Mas quem **recebe o clique** lê a lista inteira, inclusive o que nunca foi desenhado
(`src/three/director.ts:1509-1523`, que só descarta o que está quase transparente).
Perto de Júpiter, o rótulo descartado de uma lua fica mais perto do dedo que o do
próprio Júpiter: lê-se "Júpiter" e enquadra-se uma lua invisível. São duas listas
onde tem de haver uma.

**31. Nomes de estrela escritos por cima dos painéis.**
A camada dos nomes está **acima** dos painéis (25 contra 20 — `src/hud.css:49` contra
`:676`, `:739`, `:1315`), e a área que ela evita é um canto fixo no alto à direita:
38% da largura por 17% da altura (`src/components/LabelCanvas.ts:101-104`). Os painéis
descem muito abaixo desse canto — em 1600×900 sobra uma faixa de algumas centenas de
pixels em que o nome da estrela é escrito por cima do texto do painel. A arqueologia
mediu ~531×266 px; o mecanismo está confirmado, o tamanho exato depende de qual painel
está aberto.

---

## MÉDIA — afeta o produto, não salta aos olhos

**8. `Esc` é a única tecla do Atlas, e não está escrita em lugar nenhum da tela.**
A busca também não tem atalho — só o botão.
→ `docs/PLANO-ATLAS.md:951-953`.

**9. Tela estreita quebra o rodapé.** Abaixo de 900 px a base do HUD estoura (medido
em 850, 800 e 700 px). → `docs/PLANO-ATLAS.md:960-967`.

**10. O selo de honestidade pode atrasar até 3 segundos.** Ele só se atualiza quando
a interface redesenha; um gesto que muda a vista sem mudar o foco deixa o selo velho
na tela. → `docs/PLANO-ATLAS.md:943-948`.

**11. A bancada de medição é cega para movimento.** Toda captura congela o relógio,
então defeito que só aparece andando não é pego por juiz nenhum. Foi por aqui que o
item 2 passou. → `docs/ESCALA-HONESTA.md:877-883`.

**12. A bancada é cega entre 1 UA e 40 UA — justamente onde a tela lava.**
*Dito com precisão, porque a versão curta é falsa:* **existe** câmera nessa faixa —
`vesta` a 2,517 UA, `europa` a 5,002, `titan` a 9,705 —, mas todas ficam a 4 raios do
corpo, julgando o **disco daquele corpo**. Nenhuma delas olha o Sol nem o sistema de
lá. A escada que OLHA O SOL tem `solreal1ua` de um lado e `solreal40ua`/`ua40` do
outro, **sem nenhum degrau no meio**. E nenhuma foto de referência mora nessa faixa.
→ `scripts/visual/ab-identidade.mjs:135-136,191-193` (a escada do Sol) e
`:386,389,467` (as três de corpo), `docs/RETOMADA.md:241-248`.

**13. Sagittarius A✱ ainda é 125.884× maior que o real.** O segundo mentiroso de
escala, depois do Sol. → `docs/ESCALA-HONESTA.md:503-509`.

**14. `?foco=sol&ver=corpo` não desce até o Sol** — só o clique desce. O endereço
cai no sistema inteiro. → commit `51d7777`, defeito 2.

**15. Quando o quadro engasga, não há como aliviar o Sol.** As chaves de desligar
coroa e ejeção são lidas e nunca escritas. → `docs/ESCALA-HONESTA.md:853`.

**16. Engasgo ao entrar no Atlas** (a medir): o relógio do Sol acumula fora de quadro
e volta em salto. → `docs/ESCALA-HONESTA.md:859`.

**17. O Sol solavanca quando o relógio acelera.** O conserto existe, veio do projeto
irmão e está desligado; ligar depende de uma decisão do dono ainda aberta.
→ `docs/ESCALA-HONESTA.md:794-844`.

**18. A luz trata o Sol como ponto sem tamanho.** Certo para planetas, errado a
poucos raios solares — e agora a câmera chega lá. Sem penumbra.
→ `docs/ESCALA-HONESTA.md:650-653`.

**19. Texturas que não passaram e um mapa inventado.** Titã tem emendas visíveis,
Europa tem 68 linhas pretas no polo sul, Ceres é assumidamente inventado pela fonte,
e Vênus não tem foto em luz visível. → `docs/reference/ASSETS.md:6-29`.

**20. Asteroides são elipsoides, e o HUD não confessa.** Ele diz "cartografia real"
sem admitir o recuo procedural — e honestidade é a tese do produto.
→ `docs/reference/ASSETS.md:40-44`.

**32. Duas unidades de distância na mesma tela** — *em conserto agora, uma ponta
ainda de pé.*
O rótulo desenhado ao lado da estrela dizia "8.6 AL" enquanto a busca, a um palmo
dele, dizia "8,6 anos-luz": ponto contra vírgula, sigla contra palavra. Eram
**quatro** conversores com quatro regras. Em 2026-08-14 três deles foram unificados
em `src/lib/unidades.ts` (busca, paleta e rótulo). **Falta a quarta**, a linha de rumo
("→ ANTARES · 604 AL"), que segue com a régua própria e o ponto decimal em
`src/three/director.ts:1485-1491`. O item só sai da lista quando ela também chamar a
função única.

**33. O selo e o painel discordam sobre quantas camadas existem.**
São três tabelas para a mesma pergunta: o painel de Ajustes oferece **13**
(`src/three/atlasConfig.ts:58-76`), a gaveta do Atlas oferece **6** (as que têm ícone)
e o selo de honestidade conhece **17** (`src/three/selo.ts:391-407`) — `nosun`,
`nodust`, `noco` e `noforge` só existem pela URL. Quem declara honestidade é o selo, e
é justamente a lista dele que ninguém consegue conferir na tela. (A arqueologia contou
18; a contagem no código deu 17.)

**34. A tela de carregamento desenha outra Via Láctea, de dois braços.**
O modelo científico da casa tem **quatro** — Perseus, Sagittarius-Carina,
Scutum-Centaurus e Norma-Outer (`src/three/cartography/spiralModel.json`) —, e a
espiral do carregamento é feita à mão com dois braços opostos
(`src/components/CartografiaCanvas.ts:171,190,204`). A primeira imagem que o visitante
vê da galáxia é a única que não segue o modelo.

**35. Legenda e dica no mesmo lugar, e o título aparece duas vezes.**
A legenda do filme e a dica do "pausar e olhar" moram no mesmo pixel — as duas em
`left: 6vw; bottom: 11vh` (`src/hud.css:70-71` e `:337-338`) — e a legenda fica no ar
durante a viagem, que é exatamente quando se pausa. Na entrada, o título
"MAR DE ESTRELAS" fica escrito **duas vezes por 0,8 s**: o do carregamento sai num
fade de 0,8 s (`src/hud.css:956,964-966`) enquanto o da abertura já está no ar — um a
62% da altura, o outro no centro.

**36. (SUSPEITA A MEDIR) Duas leis de poeira convivendo.**
A extinção das estrelas avermelha com um vetor (`src/three/shaders/common.ts:286`) e
as nuvens escuras com outro (`src/three/world/observedClouds.ts:104`) — e o comentário
da segunda afirma ser *"a mesma lei"* da primeira. As doses base também são muito
diferentes (0,045 em `src/three/director.ts:774` contra 2,4 em
`src/three/world/observedClouds.ts:188`); a arqueologia falou em ~150×, e **eu não
consegui confirmar o fator**, porque cada dose multiplica um campo de densidade
diferente. **Medir antes de mexer.**
**AVISO, e ele vale para este item e para o 37:** esta família de suspeita já produziu
um falso positivo grave — a "faixa da galáxia desenhada 2×" era, na verdade, uma
**cessão funcionando** (`src/three/world/wrappedStars.ts:248` →
`src/three/director.ts:779` → `src/three/shaders/nebulaShaders.ts:123`). Costurar uma
cessão que funciona quebra mecanismo bom.

**37. (SUSPEITA A MEDIR) As nuvens escuras podem estar apagando o que está na frente
delas.**
As nuvens são pintadas por multiplicação e depois das estrelas
(`src/three/world/observedClouds.ts:182-199`), e as estrelas não gravam profundidade
(`src/three/world/stars.ts:98`). Pelo desenho, uma estrela que esteja **entre** a
câmera e a nuvem ainda apanha o escurecimento dela. **Isto é leitura de código, não
medição** — vale o aviso do item 36: par de capturas antes de tocar em qualquer linha.

---

## BAIXA — dívida interna, ninguém vê

21. 22,9 MB de memória de vídeo paga e inútil.
22. 35 imagens de referência citadas que não existem, e as 6 fotos reais do Sol nunca
    foram baixadas — as seis passam na régua da bancada, e ninguém as buscou.
23. A granulação do Sol não é física (45 Mm contra 1 Mm reais) e muda 55% conforme a
    placa de vídeo.
24. A dose da ejeção de massa (1,4) nunca foi calibrada.
25. Mergulhar no Sol é impossível abaixo de 1,44 raios solares — o corte come a
    superfície. Rasante estilo Parker cabe com folga.
26. O brilho das estrelas é relativo, não absoluto.
27. Faltam fixtures Horizons de Vênus, Júpiter, Saturno e Urano.
28. Dívidas internas de cor a re-dosar.
38. Peso morto: um canal por estrela que não faz nada. O `aFocus` nasce zerado,
    ninguém nunca escreve 1 nele, e mesmo assim ocupa 1,3 MB de memória e outros
    1,3 MB de vídeo — 2,6 MB no total (`src/three/world/stars.ts:66-70`,
    `src/three/shaders/starShaders.ts:28-32`). Custa leitura, não imagem.

→ `ESCALA-HONESTA.md:855,858,884-897,740,647-649`; `NORTE.md:98-99,1624-1631`.

---

## O que o dono ainda vai contar

Esta seção existe porque em 2026-08-13 ele disse: *"muitas coisas estou vendo
quebradas no visual do app nesse momento"* — e essa lista nunca foi escrita. Quando
ele contar, o item entra aqui, com as palavras dele, antes de qualquer análise.

*(vazia — esperando)*
