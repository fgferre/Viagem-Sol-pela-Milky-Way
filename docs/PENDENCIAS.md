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

---

## COMO RETOMAR NUMA CONVERSA NOVA

**A primeira mensagem da próxima conversa pode ser uma linha só:**

> *"Leia docs/PENDENCIAS.md e siga."*

O dono NÃO precisa reexplicar nada. Se um agente pedir para ele recontar a visão do
projeto, o agente errou — está tudo aqui e nos documentos apontados daqui.

**O que a conversa de 2026-08-14 descobriu, e que não estava em lugar nenhum:**

1. **O motor estelar JÁ ESTÁ GENERALIZADO.** Não existem três geradores de estrela.
   Existe UM (os 14 módulos de `src/three/world/sol/`, vindos do projeto Novo Sol
   Fable 3d) e UMA peça que os usa (`src/three/world/stellarBody.ts`, 829 linhas).
   **Nenhum outro arquivo do projeto importa `sol/` diretamente** — conferido por grep.
   E o Sol da cena já é uma instância dessa peça (`director.ts:582`,
   `new StellarBody(...)` com `SOL_PARAMS`). Ou seja: o que o `PLANO-ATLAS.md:67`
   promete para a Onda 7 — "o Sol deixa de ser um singleton e vira stellarBody
   parametrizado; o Sol vira a instância nº 1" — **já foi feito**, e o plano ainda o
   lista como futuro.
2. **Faltam DOIS parâmetros, e os dois já estão escritos no código, sem consumidor:**
   `teffK` (temperatura — hoje a cor sai de uma paleta H-alfa fixa dentro dos módulos,
   feita para o Sol) e o envelope convectivo (se a estrela ferve — decide granulação,
   manchas, coroa). Ver `stellarBody.ts:148-178`, onde os dois estão declarados como
   RESERVADOS com a razão.
3. **O bloqueio dos dois é a regra M3**, que proíbe editar os 14 módulos vendorizados
   para preservar pixels — e o próprio comentário do código diz isso: *"o núcleo do
   doador não tem caminho radiativo, a granulação roda incondicionalmente, e abrir um
   exigiria editar os 14 vendorizados"*. **É a mesma doutrina da tela congelada do
   item 0, revogada em 2026-08-14.** Foi o terceiro bloqueio dela achado no mesmo dia.
4. **A ordem do trabalho, em dois passos que NÃO se misturam:**
   **Passo 1 — parametrizar.** Constante vira parâmetro, mesma conta, MESMOS PIXELS.
   Aqui o gate bit-idêntico é a prova legítima. Está ~80% feito (ver ponto 1).
   **Passo 2 — a escada do desenho** (disco + clarão contínuos, espinhos,
   auto-exposição). Este muda pixel DE PROPÓSITO e é julgado com o olho.
   Misturar os dois destrói a prova do passo 1. Foi o erro que eu quase cometi.
5. **A lei vale para TODAS as estrelas**, dirigida pelos parâmetros de catálogo. A casa
   já carrega cor (`ci`) e luminosidade (`logLum`) das 328.749 estrelas — daí saem
   temperatura e raio, sem baixar um byte novo (`PLANO-ATLAS.md:67`).
6. **De onde vem o quê:** o motor do **Novo Sol Fable 3d** é o ponto de partida e a
   peça boa — adapta-se, não se substitui. O gerador do **atlas-orbital** entra SÓ como
   fonte de ideias de como parametrizar por magnitude/classe; o código de lá é
   ultrapassado e **não deve ser copiado**. Palavras do dono, 2026-08-14.
7. **PERGUNTA ABERTA, que só o dono destrava:** o que ficou para trás na importação do
   Novo Sol? Aqui há 14 módulos e 5.015 linhas; o original pode ter mais parâmetros.
   Precisa clonar `github.com/fgferre/Novo-Sol-Fable-3d` para comparar.
8. **Uma lição para não destruir coisa boa:** no censo de duplicidade, o achado "a faixa
   da galáxia é desenhada duas vezes" era **FALSO** — são duas camadas em que uma cede
   lugar à outra, e funciona (`wrappedStars.ts:248` → `director.ts:779` →
   `nebulaShaders.ts:123`). Antes de costurar qualquer "duplicidade", confira se não é
   uma cessão que já funciona.

---

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

**E em 2026-08-14 SAÍRAM sete:** o **1** (rótulo do Sol dizendo "FOBOS"), o **2** (faixas
laranja), o **14** (`?foco=sol&ver=corpo` não descia), o **30** (clique fora do nome
escrito), o **31** (nomes por cima dos painéis) e o **35** (legenda sobre a dica, título
dobrado) fecharam no commit `de16542`; o **32** (duas unidades de distância na mesma
tela) fechou no acabamento que veio logo atrás, quando o quarto conversor morreu. E o
**29** — o "✕" de fechar que não recebia clique — saiu por último, no mesmo acabamento:
a barra tinha parado de comê-lo no `de16542`, mas quem passou a cobri-lo era o selo de
honestidade; a disputa foi decidida com uma razão escrita em vez de um número solto
(`--camada-dialogo`, `src/hud.css:29`), porque **informação permanente pode esperar,
ação em curso não**. Conferido em 15 combinações de tamanho e painel, com o navegador
devolvendo o próprio botão no ponto do clique.
Os oito números estão **aposentados** — os buracos na sequência são exatamente isso, e
ninguém os reaproveita. Para ler o que eram: `git show de16542 -- docs/PENDENCIAS.md`.

---

## ALTA — o dono vê e incomoda

**0. A TELA CONGELADA VIROU O JUIZ — e é daqui que quase tudo nasce.**
A partir de 10/08, aprovar trabalho passou a depender de uma coisa só: *"as vistas
saem bit-idênticas"*. O efeito foi mecânico: todo conserto que mexia em pixel era
reprovado, e todo defeito virava uma **camada nova por cima do defeito anterior** — o
Sol desenhado duas vezes, o clarão só do Atlas (item 4), o limiar das luas. Cinco
commits chegaram a exibir "18/18 vistas idênticas" como aval de trabalho de **HUD** —
e as vistas são capturadas **sem HUD** (`?shot=2` apaga o HUD inteiro,
`src/hud.css:1361`). Prova vazia, cinco vezes.
**A regra foi REVOGADA pelo dono em 2026-08-11** e até hoje não estava escrita em
lugar nenhum. As palavras dele: *"Nunca foi criada essa regra que nada muda na tela.
Estamos sempre caminhando no sentido das melhorias, se nada muda na tela isso fica
impossível"*. E em 2026-08-13: *"nada é fixo, tudo sempre pode ser questionado se
melhora UX"*. Registro datado anterior a 2026-08-14 que trate bit-igualdade como meta
lê-se com esta revogação ao lado — a casa aposenta, não reescreve.
**O que ela ainda cobra hoje, três coisas:**
- a escada que OLHA O SOL pula de 1 UA para 40 UA sem nenhum degrau no meio — a faixa
  onde a tela lava não tem juiz (item 12);
- a bancada é cega para movimento (item 11) — foi por aí que as faixas laranja (item 2,
  fechado em 2026-08-14) atravessaram meses de capturas sem ninguém as ver, e só caíram
  quando alguém olhou a tela com o relógio andando;
- a rodada de fotos reais do Sol nunca aconteceu (item 22) — as seis passam na régua
  da própria casa (`docs/ESCALA-HONESTA.md:884-891`), que é veredito de bancada, não
  decisão do dono; ele nunca foi consultado sobre ela.
→ `scripts/visual/ab-identidade.mjs:135-136` (`solreal1ua` e `solreal40ua`, um ao lado
do outro), `docs/NORTE.md` (seção "Como retomar os gates", onde a revogação também
está registrada desde 2026-08-14). *O ponteiro do `.bare-mode` acima dizia `:1298`:
o `de16542` cresceu o `hud.css` em 107 linhas e a regra passou para a `:1361`.*

**3. A tela fica branca quando o Sol está longe.**
De ~1 UA a ~**2.000 UA** o quadro lava inteiro. **A faixa é 250× mais larga do que
esta linha dizia** (ela dizia "de ~1 UA a ~8 UA"): as nove medições de 2026-08-13
pararam em 8 UA e ninguém mediu adiante. Medido em 2026-08-14 com régua nova, dez
degraus de 0,067 a 4.000 UA, janela 900×900:

| distância | luz média | quadro acima de meia luz | mancha branca | disco VERDADEIRO do Sol |
|---|---|---|---|---|
| 0,067 UA | 0,060 | 1,4 % | 102 px | 112,8 px |
| 1 UA | 0,945 | **100 %** | tela inteira | 7,6 px |
| 40 UA | 0,946 | **100 %** | tela inteira | 0,19 px |
| 500 UA | 0,924 | **100 %** | tela inteira | 0,02 px |
| 2.000 UA | 0,781 | 91,8 % | tela inteira | 0,004 px |
| 4.000 UA | 0,576 | 58,1 % | 719 px | 0,002 px |

É a última coluna que dá o veredito: **o Sol encolhe 4.000 vezes e a mancha na tela
não muda de tamanho.** A régua é `scripts/visual/luz-do-quadro.mjs`, e ela não
existia — os números que o projeto citava tinham sido medidos à mão e viviam num
comentário (`atlasConfig.ts:262-284`), sem ninguém poder rodá-los de novo.

*E agora sabemos que são DOIS defeitos, não um* — separados desligando o borrão da
lente (`&nobloom=1`), com a mesma régua:
1. **O depósito não encolhe.** Sem borrão, a mancha vai de 12 px a 1 UA para 8 px a
   4.000 UA — praticamente constante, porque o ponto do Sol cresce com a RAIZ DO
   LOGARITMO do brilho, não com a distância. A 1 UA esse ponto está por cima de um
   disco de 7,6 px que já estava certo: o Sol é desenhado duas vezes.
2. **O borrão da lente multiplica.** Com o borrão ligado, esses 10 px viram 900 —
   ele recebe um número da ordem de um trilhão e espalha.
*O que já sabemos:* o Sol é desenhado como um ponto de luz sem teto — a 1 UA ele
deposita cem bilhões onde branco já é 1 — e o borrão da lente espalha isso. **A bola
do Sol está certa; o brilho por cima é que está solto.**
**E há um terceiro fato, que decide o desenho do conserto:** a exposição é aplicada
DEPOIS do borrão, então mexer nela hoje não desfaz nada (medido no próprio
repositório: `?exp=0,12` ainda devolve luz média 0,75, `atlasConfig.ts:293-297`).
A pupila tem de entrar ANTES do borrão — que é, aliás, a ordem física: o diafragma
vem antes da lente espalhar. **E mais fundo ainda:** as telas intermediárias
guardam número até 65.504, e o ponto do Sol a 1 UA deposita 400 bilhões — ele já
chega ao buffer como *infinito*. Nada que venha depois consegue desfazer infinito.
Por isso a pupila entra DENTRO do desenho de cada fonte, não num passe no fim.

---

**A PUPILA ESTÁ CONSTRUÍDA, MEDIDA E DESLIGADA (2026-08-14).** Ligando com
`?pupila=1`, a faixa branca ACABA — de 100% do quadro lavado para 0,2%, em toda a
escada. Mesmo assim ela nasce desligada, e a razão é uma medição, não cautela:

> **Ligada, o Sol fica MAIS ESCURO quando a câmera se aproxima.** A 3,6 UA ele é
> uma bola branca com halo (quem o desenha é o ponto). A 1 UA a bola 3D "arma", e
> como ela é opaca, TAPA o ponto — e o que sobra é um disco laranja de 7,6 px,
> sem clarão nenhum. Chegar mais perto escurece.

Isso é um **passo para trás na luz**, que é a regra que esta casa provou e cobrou
por três ondas. Trocar a tela branca por isso seria trocar um defeito por outro.

**A causa tem número, e é o achado desta rodada:** as duas maneiras de desenhar o
Sol estão em escalas de brilho diferentes — a bola 3D foi pintada numa escala em
que "branco" vale ~1, e a lei do ponto deposita ~28 bilhões para a MESMA
superfície. **São cerca de 26 magnitudes de diferença** (uns 35 passos de luz).
Enquanto isso não for reconciliado, a troca bola↔ponto tem degrau por construção,
e nenhuma calibração de exposição fecha esse buraco.

**Então o que destrava o item 3 não é mais a pupila — é pôr a bola 3D na escala
fotométrica da casa.** A pupila fica montada, testada e a um parâmetro de
distância (`?pupila=1`, ou `?pupila=alvo,kappa` para varrer), com régua para
julgá-la. Ver `src/three/core/pupila.ts`, cabeçalho.
**O conserto é a AUTO-EXPOSIÇÃO — a pupila —, e teto de brilho é PROIBIDO por
escrito.** Está no `NORTE.md` em dois lugares, com todas as letras: *"NÃO 'consertar'
com teto de brilho — a auto-exposição da Onda 8 é o conserto"*
(`docs/NORTE.md:3487-3490`) e *"é o 'teto de brilho' que a Onda 4 proíbe"*
(`docs/NORTE.md:3583-3587`). O motivo é simples: com teto, o Sol ficaria quase tão
fraco quanto uma estrela comum — bonito e mentiroso, o oposto da tese da casa.
**Um projeto de conserto já foi reprovado exatamente por isto. Esta linha existe para
impedir a terceira tentativa.**

**E FALTA MAIS DO QUE A PUPILA — existe um VÃO.** Medido: a bola do Sol para de ser
desenhada acima de **7,2 vezes a distância da Terra ao Sol**, e a estrela com espinhos
só começa a acender lá pelas **4.000 vezes** essa distância. Entre os dois não há nem
bola nem estrela — só aquele pontinho sem limite. É por isso que o Atlas, que enquadra
o sistema inteiro a 227 vezes a distância da Terra, cai bem no meio do vão.

**O DESENHO DECIDIDO (2026-08-14), e ele vale para TODAS AS ESTRELAS, não só o Sol.**
Palavras do dono, no dia:

> *"mas isso nao deveria ser so para o sol. toda estrela deveria seguir o mesmo
> mecanismo nao acha? baseado nas magnitudes da estrela obviamente. tinhamos falado
> disso quando geramos o plano de como fariamos o motor estelar para gerar
> proceduralmente todas as estrelas quando nos aproximarmos delas"*

Uma transição **contínua**, não três etapas. Porque na realidade existem só duas
coisas, sempre as mesmas e sempre juntas: **o disco**, que encolhe com a distância, e
**o clarão** que a luz faz na câmera, que acompanha o brilho aparente. Nenhuma estrela
"vira outra coisa" em distância nenhuma. A troca interna da malha 3D por um pontinho
existe só como economia e tem de acontecer **abaixo de um pixel**, onde ninguém vê. É
assim que o SpaceEngine faz, e é a referência declarada dele.

**E ISSO NÃO É IDEIA NOVA — está no plano desde 2026-08-10, com detalhe.** O dono
cobrou, com razão, que já tinha dito isso quando o motor do Sol foi trazido do projeto
Novo Sol. Está em `docs/PLANO-ATLAS.md:67`: *"O pilar novo é o motor estelar. O NovoSol
(14 módulos, 4.960 linhas) deixa de ser um singleton esculpido para o Sol e vira
`stellarBody.ts` parametrizado por {teffK, radiusPc, rotPeriodDays, activityLevel,
convective}. O Sol vira a instância nº 1"*. É a **Onda 7** (`PLANO-ATLAS.md:1064`), com
Teff e raio das 16 heroes, pilotos Sirius e Betelgeuse, e `radiusFromSpect` sobre o
catálogo inteiro. Mais a lei única já prometida em `NORTE.md:15`.

**POR QUE NUNCA COMEÇOU — e é o item 0 de novo.** A mesma linha 67 do plano põe uma
condição na própria peça: *"O Sol vira a instância nº 1, **com gate pixel-igual**"*.
Tornar o Sol uma instância do motor genérico MOVE PIXEL por construção — é outra
implementação desenhando a mesma estrela. O plano, portanto, pedia uma coisa e proibia
o efeito inevitável dela no mesmo período. Com a revogação de 2026-08-14 (item 0) essa
trava cai: o gate mede regressão, não imobilidade, e a Onda 7 deixa de estar
autobloqueada.

Ou seja: **o Sol é o primeiro caso, não o caso especial** — e o trabalho aqui não é
inventar uma lei nova, é executar a que já está escrita, fechando o vão.

**Então o conserto tem duas partes, nesta ordem:** fechar o vão (o clarão com espinhos
vivo em toda a escada, e não só a 4.000 distâncias-da-Terra) e a auto-exposição (para
que, virando estrela, ele não estoure a tela).
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
então defeito que só aparece andando não é pego por juiz nenhum. Foi por aqui que as
faixas laranja (item 2, fechado em 2026-08-14) passaram — e elas só foram vistas com o
relógio andando, no navegador. → `docs/ESCALA-HONESTA.md:877-883`.

**12. A bancada é cega entre 1 UA e 40 UA — justamente onde a tela lava.**
*(2026-08-14 — metade resolvida.)* A régua de LUZ já enxerga a faixa inteira:
`scripts/visual/luz-do-quadro.mjs` mede dez degraus de 0,067 a 4.000 UA e foi ela
que reescreveu o item 3. O que continua cego é o gate de IDENTIDADE (md5): a escada
do `ab-identidade` segue com `solreal1ua` de um lado e `solreal40ua` do outro, sem
degrau no meio. Falta portar os degraus da régua para lá.
*Dito com precisão, porque a versão curta é falsa:* **existe** câmera nessa faixa —
`vesta` a 2,517 UA, `europa` a 5,002, `titan` a 9,705 —, mas todas ficam a 4 raios do
corpo, julgando o **disco daquele corpo**. Nenhuma delas olha o Sol nem o sistema de
lá. A escada que OLHA O SOL tem `solreal1ua` de um lado e `solreal40ua`/`ua40` do
outro, **sem nenhum degrau no meio**. E nenhuma foto de referência mora nessa faixa.
→ `scripts/visual/ab-identidade.mjs:135-136,191-193` (a escada do Sol) e
`:386,389,467` (as três de corpo), `docs/RETOMADA.md:241-248`.

**13. Sagittarius A✱ ainda é 125.884× maior que o real.** O segundo mentiroso de
escala, depois do Sol. → `docs/ESCALA-HONESTA.md:503-509`.

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

**36. (SUSPEITA A MEDIR) Duas leis de poeira convivendo.**
A extinção das estrelas avermelha com um vetor (`src/three/shaders/common.ts:286`) e
as nuvens escuras com outro (`src/three/world/observedClouds.ts:104`) — e o comentário
da segunda afirma ser *"a mesma lei"* da primeira. As doses base também são muito
diferentes (0,045 em `src/three/director.ts:776` contra 2,4 em
`src/three/world/observedClouds.ts:188`); a arqueologia falou em ~150×, e **eu não
consegui confirmar o fator**, porque cada dose multiplica um campo de densidade
diferente. **Medir antes de mexer.**
**AVISO, e ele vale para este item e para o 37:** esta família de suspeita já produziu
um falso positivo grave — a "faixa da galáxia desenhada 2×" era, na verdade, uma
**cessão funcionando** (`src/three/world/wrappedStars.ts:248` →
`src/three/director.ts:781` → `src/three/shaders/nebulaShaders.ts:123`). Costurar uma
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
