# Pendências — o que está quebrado e o que falta

Lista viva do que está aberto, nas palavras do dono. Leia só a seção O BASTÃO e o item da vez; o resto, por `grep`.
Item resolvido sai da lista e vira commit; a história de cada número fica no git (`git log --all --grep="(NNN)"`).
Número é identidade, não posição: item novo entra no fim da sua seção. **Próximo número livre: 233.**

## O BASTÃO — onde a rodada parou (08/10, noite) — PÃ COM A FORMA MEDIDA NO `main` (`15e2f27b`, NÃO PUBLICADA); A RÉGUA ÚNICA PLANEJADA (`PLAN-REGUA-UNICA.md`); TRÊS FRENTES PARALELAS QUE MEXEM NA LUZ E NA TELA — COMBINAR A ORDEM COM ELE

**Feito em 07–08/10 (conversa das luas pequenas):** a ordem de 06/10 inteira, já no ar. Pã, a primeira das
luas pequenas pela receita do Hipérion, no `main` e não publicada: forma medida (Thomas, Joseph & Ansty 2018)
virada para Saturno (o W do app estava meia volta fora nas sete luas síncronas — só Pã consertada); relevo
fino de 28 fotos calibradas da Cassini em 40,5 % da superfície e inventado no resto (confessado); 4 crateras
reais das fotos + 10 pela densidade medida; cor pintada pelo ChatGPT dele e calibrada pelo espectro medido em
4 filtros; sombra "só do relevo". Palavras dele: *"eu aprovo o modelo que a gente criou agora"*. A cadeia
rodou no terminal dele a pedido dele (*"Está autorizado"*); publicado = aprovado pixel a pixel; `npm run done`
verde (133 arquivos, 3.600 testes). Provas: `capturas/luas-pequenas/pa/` (`prancha-f.jpg`,
`oficial/prancha-oficial.jpg`). A régua única: *"precisamos ter uma regra única que trate todos os objetos do
sistema..."* — levantamento e cinco partes em `PLAN-REGUA-UNICA.md` (nove caminhos de cor; um ACES que come
~60 % da cor das superfícies claras; oito jeitos de relevo; quatro formatos de confissão).

**Publicar Pã é dele:** `git push origin main`; depois conferir no ar.

**A próxima rodada — a ordem entre as frentes é decisão dele** (as três tocam a luz e a tela; ele quer
evitar trabalho paralelo repetido): (1) as lentes de cinema (ramo `claude/hollywood-lens-effects-af79d8`)
entram primeiro — estão mais perto do fim e foram calibradas contra o ACES; (2) a régua única, com UMA sessão
cuidando de luz e tela, estrelas e Sol incluídos (`PLAN-ESTRELAS-E-INSTRUMENTO.md`, no ramo das lentes,
unificação aberta); a R1 testa o tom único (o Neutral da Khronos deu B/G 0,766 contra o alvo 0,773 em Pã);
(3) o item 232 (Terra tímida, bastão paralelo logo abaixo) cruza com a R1 — medir o que o ACES apaga antes de
criar o modo realçado; (4) a fila de assets já sob a régua: as outras seis luas pequenas pela receita de Pã
(lições em `PLAN-LUAS-PEQUENAS.md`), Febe, Calipso/Telesto/Helena, Fobos/Deimos, Vesta. Cautela dele noutra
conversa: *"O modelo de linguagem tem a mania de transformar coisas que eu falo em regras."* — a régua só vira
regra com ganho visível em prancha.

**Achados e não consertados:** o Hipérion (no ar) provavelmente apaga encostas íngremes viradas ao Sol pelo
mapa de horizonte (o de Pã foi consertado com a sombra "só do relevo"); as outras seis luas síncronas viram
para Saturno o lado errado; a ficha mostra o selo "medido" sob texto "inventado" (Jápeto, Plutão, Caronte, os
poços do Hipérion) e Mimas/Tétis/Dione não confessam o relevo; Pã sai mais clara que Encélado (resolve na R2
da régua); no filme solar, Ganimedes (~2 px) some no salto de 207,95 s, a mira gira 166° aos 261,95 s, e no
celular a dica fala em "tecla de espaço". O protótipo de cor por corpo (`?tom=matiz`) foi guardado à parte em
`capturas/luas-pequenas/cor-na-tela/` — a régua o substitui por um tom único.

**Decisões dele em aberto:** o giro de Urano (101°/s × 86°/s do de Tritão; adiantar a legenda ~0,8 s o
acalma); apagar ou guardar os planos fechados (`PLAN-REIA.md`, `PLAN-EUROPA-JAPETO.md`,
`PLAN-VIAGEM-SOLAR.md`, `PLAN-PONTO-DE-LUZ.md`). O worktree `../Viagem-luas-pequenas` foi apagado a pedido dele
(08/10; o ramo `luas-pequenas` fica no histórico, inteiro no `main`).

## O BASTÃO paralelo (08/10) — CÂMERA MAIS LIVRE NO ATLAS E AR MEDIDO DA TERRA ENVIADOS AO AR A PEDIDO DELE (*"ok"*, 08/10, no terminal dele; a conversa das luas pequenas confirmou que os commits dela no `main` podiam ir junto — só planos e o miolo `relevo-medido.mjs`, nada do site; o ramo `luas-pequenas` fica fora); A PRÓXIMA RODADA É O ITEM 232, OS EFEITOS TÍMIDOS

**Feito em 07–08/10, nesta ordem, a pedido dele:**
1. A Terra com nuvens com sombra e relevo, relevo medido ETOPO e sombra das montanhas. Isso foi PUBLICADO em 07/10 (`f943a20b`) e levou junto os consertos do filme da ordem de 06/10, com o sim dele.
2. Depois ele não conseguiu ver o relevo no Atlas (*"o angulo da camera e a falta de pan e zoom nao permitem"*). Isso trouxe a câmera que desce a 1,1 raio e inclina para o horizonte.
3. Ele pediu a atmosfera avermelhada contra o Sol. Isso trouxe a luz do pôr do sol pelo ar medido e o Sol avermelhando ao atravessar o ar.
4. Ele comparou com a vista da estação espacial (*"a atmosfera parece muito mais grossa"*). Isso trouxe o limbo e o véu sobre o planeta pelo ar medido, conferidos contra a imagem dele.

**A PRÓXIMA CONVERSA COMEÇA POR `PLAN-ATLAS-PERTO-E-POR-DO-SOL.md`**, seções "Resultado (08/10)" e "A PRÓXIMA RODADA". Ali estão os defeitos, em ordem:
- o brilho do Sol no mar grande e borrado;
- o Sol branco até sumir na tela de 720;
- as nuvens borradas na altura da estação;
- o "visual de cinema", que é decisão dele;
- os aerossóis;
- o custo de ~9 ms;
- os pequenos.

Depois de testar no painel e no iPhone, ele achou os efeitos tímidos (**item 232**). Decidiu: *"Os dois, nessa ordem"* — primeiro tirar as perdas, depois o modo realçado. Mandou publicar o que existe (*"Publicar já"*), mas, ao saber que o envio levaria junto o trabalho da outra conversa (os planos das luas pequenas e o miolo `relevo-medido.mjs`), preferiu *"Esperar"*; a conversa das luas pequenas confirmou e ele disse *"ok"*. A próxima rodada começa pelo item 232 e depois segue a lista do plano.

## O BASTÃO anterior (07/10, noite) — A ORDEM DE 06/10 FEITA NO `main`, À ESPERA DA PUBLICAÇÃO (commits `3b322fb6`, `b894ff2c`, `822c30f8`, `d319840c`; nada enviado; a publicação é dele)

**Feito em 07/10 (a palavra dele: *"vamos continuar de onde paramos?"*):** os
cinco consertos da ordem de 06/10. (1) "More" cortado a 375 px em inglês: a
barra do filme cabe inteira — bordas do conteúdo na margem de 5vw da legenda
e da lente, vão de 0,4rem (medido a 360–414 px nas duas línguas). (2) A linha
da lente sobre o Sol e a dica de gestos sobre o limbo da Terra: contorno
colado nas três linhas pequenas e a lente no tom da dica (escolha dele, opção
B, `capturas/ordem-06-10/lente-e-dica-prancha.jpg`). (3) Netuno/Tritão sumindo
em 333,25 s e, a pedido dele, Urano em 318,25 s: a câmera vira para o próximo
destino depois da legenda e tira os corpos do quadro antes do salto, pela
receita da troca de relógio (giro de Tritão aprovado em vídeo;
`capturas/viagem-solar/netuno-salto/`). (4) E4c, os nomes do filme em três
degraus pela tabela do Atlas; nenhum nome sai da tela (o detalhe cede antes do
nome — vale no Atlas também); Sagittarius A✱ apontado em "O último braço" e na
cena seguinte, pela palavra dele: *"Os elementos de label, eles fazem parte das
ferramentas que o diretor da cena usa com o motor de filmes para trazer
informações importantes para aquele quadro. Se for o caso, isso deverá
aparecer."* Aprovado pela folha e pelo vídeo (`capturas/ordem-06-10/nomes/`).
`npm run done` verde (131 arquivos, 3.576 testes).

**O que ele ainda decide:** publicar (enviar o `main`); o giro de Urano é mais
rápido que o de Tritão (101°/s × 86°/s — adiantar a legenda de Urano ~0,8 s o
deixaria pela metade); apagar ou guardar os planos das rodadas fechadas
(`PLAN-REIA.md`, `PLAN-EUROPA-JAPETO.md`, `PLAN-VIAGEM-SOLAR.md`,
`PLAN-PONTO-DE-LUZ.md`); o subsolar de Reia (BACKLOG).

**Visto e não feito (leitura só, 07/10):** no salto Júpiter→Saturno (207,95 s)
Ganimedes (~2 px) some no quadro; aos 261,95 s a mira pula 166° entre a pluma
de Encélado e Titã e o play vira um giro rápido; no celular a dica do filme
diz "espaço — retomar a viagem", e celular não tem tecla de espaço.

**Próxima obra:** a "Fila de assets combinada" do bastão anterior, logo abaixo
(as luas pequenas de Saturno pela receita do Hipérion). Outra conversa dele
trabalha nesta mesma pasta (item 231 e as telas de carregamento): gravar um
de cada vez — conferir `pgrep -fl "headless=new"` antes de abrir um Chrome.

## O BASTÃO anterior (07/10, tarde) — REIA COM RELEVO MEDIDO E CRATERAS PELA FOTO PUBLICADA (`main` = `b9f3c90c`, merge em linha reta e envio no terminal dele a pedido dele — *"ok, vamos merge commit etc"*; publicação verde; no ar, altura, normal, webp e manifesto com o mesmo sha256 dos locais). A PRÓXIMA CONVERSA COMEÇA LIMPA: ler só esta seção e, para a próxima obra, a "Fila de assets combinada" abaixo; os planos das duas rodadas (`PLAN-REIA.md`, `PLAN-EUROPA-JAPETO.md`) guardam a receita e os números

**Feito em 07/10 (plano em `PLAN-REIA.md`, revisto pelo GPT pelo Codex e
conferido contra o código; a palavra dele: *"Pode começar por Reia, com a
mesma receita. coordene inteligentemente."*):** a pesquisa achou o que o
bastão de setembro dizia não existir — Reia TEM modelo de forma público da
Cassini (Weirich, Gaskell, Palmer & Domingue 2025, PDS) — e a receita virou
a de Plutão: o relevo medido como base (bacias Tirawa e Mamaldi, Inktomi, os
vales largos do terreno "wispy", tudo no lugar; registro com o mapa de cor a
um centésimo de grau), completado abaixo de 30 km com as crateras que a foto
mostra e perfis estimados por lei citada, nunca somando sobre o que já está
medido. O relevo sintético de hoje era um campo aleatório (não acertava
nem Mamaldi nem Tirawa) e deformava a esfera em "batata". Decisão dele por
prancha: *"vamos de A"* (resolução de hoje; o dobro custava 4× em memória
por ganho pequeno). O miolo do relevo pela foto saiu de Jápeto para um
módulo comum sem mudar um byte do que está no ar. A cadeia rodou no painel
de terminal dele a pedido explícito (*"faça por favor"*) e o texto do
terminal foi lido na íntegra a pedido dele: publicado = candidato A,
conferido pixel a pixel; `data:verify` OK; `npm run done` verde (129
arquivos, 3.544 testes). Provas: `capturas/reia/final-prancha.jpg` (antes ×
depois no app de verdade), `dtm-prancha.jpg`, `r2-prancha.jpg`.

**O que ele ainda decide:** apagar ou guardar os planos das rodadas (`PLAN-REIA.md`,
`PLAN-EUROPA-JAPETO.md`); o subsolar com 4,4° de atraso pelo tempo de luz
(BACKLOG).

**Fila de assets combinada (07/10):** depois de Reia, as luas pequenas de
Saturno com forma medida pela Cassini (receita do Hipérion: Jano, Epimeteu,
Pandora, Prometeu, Atlas, Pã, Dafnis, Calipso, Telesto, Helena; Febe; Fobos e
Deimos; a silhueta de Vesta pela Dawn), depois os corpos com relevo falso da
cor (item 144) pelo detector de crateras, depois as luas de Urano (receita de
Plutão), e por fim Urano/Netuno/Titã/Vênus como decisões de produto. Tritão
segue pausado. Antes de tudo isso, a ordem de 06/10 que ele deixou: os nomes
(E4c), a linha da lente, a dica de gestos, "More" cortado, Netuno/Tritão
sumindo num salto.

## O BASTÃO anterior (07/10, manhã) — EUROPA COM COR REAL E JÁPETO COM A CRISTA NO LUGAR (item 230) PUBLICADOS (`main` = `5c35a048`, merge em linha reta e push feitos no terminal dele a pedido dele — *"Faça o merge e o push, estou autorizando"*; publicação verde; no ar, altura e normal de Jápeto e o mapa de Europa com o mesmo sha256 dos locais)

**Feito em 06–07/10 (plano em `PLAN-EUROPA-JAPETO.md`, revisto pelo GPT pelo
Codex com a autorização dele — *"Você mesmo que usa o GPT. Você está
aprovado"* — e conferido contra o código antes de mudar; receita de Plutão,
Caronte e Hipérion):** Europa deixa o cinza de 1440 px e ganha 4096 px com a
luminância do mosaico USGS de 500 m e a cor inferida dos dois componentes
medidos na foto da Galileo (gelo claro quase neutro, material escuro
avermelhado), no tom que ele escolheu (*"Europa no meio-termo"*); Jápeto
ganha relevo gerado nesta casa — crista nas longitudes do catálogo da IAU e
no caminho que a foto mostra, 20 km no ponto mais alto (*"Jápeto com vinte
quilômetros"*), 55 crateras com nome no lugar, as demais onde a foto da
Cassini as mostra. Diagnóstico corrigido pela revisão: a crista velha estava
em 350→134°E (a textura começa em 180°E), girar meia volta era o certo,
"espelhar" não; Jápeto já era elipsoide. A cadeia oficial rodou no painel
de terminal dele a pedido dele (*"Rode vc mesmo… Estou autorizando e
solicitando"*); publicado = candidato aprovado, conferido pixel a pixel;
`data:verify` OK; `npm run done` verde (127 arquivos, 3.540 testes). Provas:
`capturas/europa-japeto/final-prancha.jpg` (antes × depois no app de
verdade) e as pranchas de cada etapa. De brinde: os números do Photojournal
dos seis mosaicos de Schenk estavam trocados em quatro luas e foram acertados.

**O que ele ainda decide:** publicar (merge em linha reta de `europa-japeto`
no `main` e push); se a muralha de Jápeto deve aparecer no raspão do Ato III
do filme (hoje ela só se insinua — é o enquadramento e a luz do filme, não o
motor: rodada de filme); a Cassini Regio quase preta de frente no app (luz
honesta sobre albedo 0,04; no BACKLOG); apagar ou guardar o plano da rodada.

**Ordem combinada que segue (de 06/10):** os nomes (E4c; o rótulo de Saturno
cortado no celular), a linha da lente sobre o Sol e a dica de gestos sobre o
limbo no celular, "More" cortado a 375 px em inglês, Netuno/Tritão sumindo
num salto do roteiro; e os outros assets do item 230 quando ele quiser.

## O BASTÃO anterior (07/10, 00:10 UTC) — RODADA DO PONTO DE LUZ PUBLICADA (`main` = `daf54e0`, publicação verde; conferido no ar: o salto para 158 s mostra Júpiter sem ponto; a lei nova e a sombra da legenda estão no bundle publicado)

**Feito em 06/10 (plano em modo de planejamento, revisto por duas análises
externas, executado na mesma sessão; `PLAN-PONTO-DE-LUZ.md` › Resultado):**
o ponto de luz cede ao globo pelo TAMANHO do disco (some entre 4 e 12 px
visíveis, igual em qualquer densidade de tela e no celular), com o halo
encolhendo junto; os saltos do filme (`?t=`, Retomar, corte) e a textura
que chega atrasada estalam a cessão em vez de animar; o véu da legenda
virou sombra no texto. Provas em `capturas/ponto-de-luz/` (folhas antes ×
depois e dois vídeos lado a lado: `e3-jupiter-143-156-lado-a-lado.mp4`,
`e3-galactico-fim-lado-a-lado.mp4`). `npm run done` verde.

**O que o diagnóstico mostrou (corrige o bastão anterior):** o ponto
branco sobre Júpiter aos 158 s era o ponto do PRÓPRIO Júpiter e só
aparecia depois de um salto — tocando do começo não aparecia; luas não
têm ponto de luz. A "Terra estourada" não está no filme aos 108 s (entra
com ~50 px já cedida); estava na vista do Atlas da Terra vista da Lua
(53 px), onde a lei velha chegava a 0,999 e nunca a 1. O defeito da lei
aparecia em toda aproximação (Júpiter de 4 a 22 px) e no Atlas.

**Decisões dele (06/10, noite — *"concordo com seus feedbacks vamos fazer e
dar o merge e commit e publicar"*):** 12 px fica como fim da cessão; o fim
do galáctico fica como está agora (a Lua de 9 px como ponto pequeno sobre
o globo); a sombra da legenda fica, e a dica de pausa do filme foi
clareada para o tom do subtítulo (folha `capturas/ponto-de-luz/e4b-dica-cor.jpg`);
publicar pelo merge em linha reta do ramo no `main` — o push do `main` é o
clique dele, e depois conferir no ar a chegada a Júpiter TOCANDO do começo
do ato, não por salto.

**Ordem combinada que segue:** depois destas decisões, a rodada de assets
de Europa (cor) e Jápeto (crista no lugar) — item 230. Ficam depois: os
nomes (E4c; o rótulo de Saturno cortado no celular), a linha da lente
sobre o Sol e a dica de gestos sobre o limbo no celular, "More" cortado a
375 px em inglês, Netuno/Tritão sumindo num salto do roteiro.

## O BASTÃO anterior (06/10, noite) — FILME SOLAR PUBLICADO NO AR; A PRÓXIMA SESSÃO COMEÇA EM MODO DE PLANEJAMENTO PELA RODADA DO PONTO DE LUZ

**Publicado em 06/10 por ele** (`git push origin main`, avanço simples do ramo
`viagem-solar`; publicação verde; conferido no ar na chegada a Júpiter). Ao
olhar o site no ar apareceu um ponto branco sobre Júpiter (Europa em
trânsito) — a mesma causa da Terra pequena estourada: o ponto de luz que não
cede ao globo. Palavras dele: *"me parece um problema que deve estar
atingindo alguns outros objetos que são iluminados pelo Sol [...] um sprite
luminoso vira o objeto 3D dependendo da distância"* — certo; e, ao fechar:
*"vamos fazer o handoff para montarmos um plano para isso na próxima sessão
[...] entrar em modo de planejamento"*. Os fatos levantados e a regra
combinada estão em `PLAN-VIAGEM-SOLAR.md` › "Como continuar" › PRÓXIMA
SESSÃO. Nada foi mexido no código depois da publicação.

**Decisões dele em 06/10, respondidas nesta conversa (oito perguntas):**
(1) a legenda de Júpiter fica com "28 vezes" (o número honesto da data);
(2) o quase-sol fica como está, com a lanterna da luz assistida; (3)
Europa e Jápeto: *"Priorizar Europa e Jápeto"* — rodada de assets dos dois
antes de outras rodadas (item 230: Europa em cor, a crista de Jápeto no
lugar certo); (4) Hipérion: aceita a face nova; (5) o véu atrás da
legenda: *"Tentar só sombra no texto"* — trocar o véu desfocado por sombra
mais forte nas letras e provar sobre o Sol e sobre o chão da Lua; se não
ler, voltar ao véu; (6) o fio azul no limbo da Terra: aceito; (7) duração:
manter 6 min 35 s; (8) Caronte: deixar como está, no limite.

**Ordem combinada para as próximas sessões:** a rodada do ponto de luz
(plano em modo de planejamento), a sombra da legenda (pequena, junto), e
em seguida a rodada de assets de Europa e Jápeto. Ficam depois: os nomes
(E4c; o rótulo de Saturno cortado no celular), a linha da lente sobre o Sol
e a dica de gestos sobre o limbo no celular, "More" cortado a 375 px em
inglês, Netuno/Tritão sumindo num salto do roteiro.

## O BASTÃO anterior (06/10) — VIAGEM SOLAR NO RAMO `viagem-solar`: FILME INTEIRO (395 s) + RODADA DE ACABAMENTO FEITA; FALTAM AS DECISÕES DELE PELO VÍDEO E O MERGE

**Estado:** o segundo filme existe e toca de ponta a ponta no ramo
`viagem-solar` (backup `origin/viagem-solar`; nada no `main`, nada
publicado). Tudo o que manda está em `PLAN-VIAGEM-SOLAR.md` (raiz do
ramo) e no roteiro aprovado `docs/ROTEIRO-VIAGEM-SOLAR.md` — a próxima
conversa começa por eles. Feito e conferido pela sessão principal, com
`npm run done` verde (120 arquivos, 3.404 testes): o motor toca o filme
escolhido (`?filme=solar`; o galáctico bit a bit igual em quatro A/B); os
botões dos dois filmes na capa, no "Mais" e no Atlas (escolha dele pela
maquete B; celular só ícone, sem corte); tela final por filme; o beat de
luz honesta (`camera.luz`); o gravador do filme tocando (`--hud=1`);
nomes de corpos no filme; e o filme solar v4 até o fim do Ato I — o Sol
na superfície, Mercúrio, Vênus, a Terra com as Américas, a Lua com a
Terra meia-iluminada sobre o horizonte (o pedido dele, no quarto
minguante de 10/01), Marte sobre o Valles Marineris, Ceres — e, desde a conversa nova de 05/10,
o Ato II inteiro pelo modo combinado (coordenador de produção em Opus,
três autores em fila, foto por lugar, uma folha de contato): Júpiter
crescendo com a Grande Mancha de frente (relógio próprio do ato, 01/01
02:08 UTC, achado por busca de minuto), Io acesa com Júpiter inteiro ao
lado, Europa com o gelo rachado, o quase-sol com o Sol espinhoso no quadro
ao lado de Júpiter meia-lua, e a saída entregando Saturno. Antes da onda,
a geometria do filme foi separada por ato e os planos ganharam nome
(filme bit a bit igual). Ato II 64 s. E, em 05–06/10, o Ato III pelo roteiro: a chegada pelos
anéis com a legenda honesta, o rasante, Encélado com a pluma em contraluz,
Titã (bola laranja, pelo lado de Saturno), Jápeto (as duas caras; a crista
foi para a fila de assets), Hipérion religado e o postal com a despedida
da Cassini. Ato III 90 s. E, em 06/10, o Ato IV e o Epílogo: Urano deitado, Netuno
com Tritão, Plutão com o coração de frente e Caronte, o beat de luz
honesta (que deixa Plutão preto: decisão dele), o retrato de família a
40 UA com os nomes, e a volta para casa com o Sol nascendo sobre a Terra
e a ponte para o outro filme. Filme 395 s (35 s acima dos 6 min; a F4
apara). Folhas: `capturas/viagem-solar/v4-ato2/`, `v4-ato3/`, `v4-ato4/`. A máquina caiu uma vez no meio (gravações pesadas); regra
nova: uma gravação de cada vez, curta, servidor fechado entre elas.

**Palavras dele nesta rodada:** *"onde está o sol nesse filme?"*;
*"temos tantos objetos interessantes... que a gente poderia estar
mostrando"*; *"me traz um roteiro estudado em cima de outros roteiros de
documentários"*; *"eu não pedi para você desaparecer com outro filme"*;
e, ao fechar: *"o agente fable dessa janela de coordenação tem que
tentar gastar mais inteligentemente o contexto para coordenar mais e
fazer menos braçal"*. As sete decisões dele (6 min, 24 lugares, todos os
opcionais, Lua no quarto, luz honesta em Plutão, som depois, ponte,
botões) estão no roteiro §4; os assets fracos viraram o item 230.

**Rodada de acabamento (06/10, com a palavra dele: *"pode seguir para a
rodada de acabamento"*):** consertos de motor e HUD provados com antes/depois
(corte seco, luas sem pipoco, legenda legível, selo da luz honesta no beat,
o Sol sem salto ao virar ponto, a atmosfera da Terra sem os dois erros que
davam manchas e quadros pretos, a coroa do Sol cortada pela Terra); a luz
honesta de Plutão pelo olho adaptado (*"faz o conserto do olho adaptado"*);
juízes verdes (capa e botões com referência nova); celular conferido; vídeo
inteiro com legendas em duas partes. Tudo em `capturas/viagem-solar/v4-f4/`.

**Falta:** as decisões dele pelo vídeo (lista no plano, "Próximo bloco":
o 28 vezes, a lanterna de Júpiter no quase-sol, Europa em preto e branco,
Jápeto cinza e sem crista, a face nova de Hipérion, o véu da legenda, o fio
azul no limbo da Terra, os 35 s acima dos 6 min, a linha da lente sobre o
Sol no celular); depois o merge no `main` com a palavra dele; a publicação
é dele. Rodadas próprias que ficaram: E4c (nomes: o rótulo de Saturno
cortado no celular é dela), a Terra pequena estourada, a Netuno/Tritão que
somem num salto do roteiro, o Ato IV acima do roteiro em duração. A F4 era
(legenda sobre fundo claro, o Sol virando ponto de repente, o Sol pelo
relógio da tela, quadros pretos de NaN perto do joelho da Lua com
`abaixo` baixo, halo/manchas da Terra pequena, juízes com `--filme=solar`
e referências novas, celular), o vídeo inteiro com HUD para ele, e o
merge com a palavra dele. Modo de trabalho combinado: coordenador de
produção em Opus por onda, dois lugares por autor, foto por lugar; a
janela principal olha cada folha, decide gosto com ele e fecha a rodada.
Tritão segue pausado; a publicação da sombra dobrada segue sendo dele.

## O BASTÃO anterior (04/10) — SOMBRA DOBRADA NO MAIN, À ESPERA DA PUBLICAÇÃO; TRITÃO PAUSADO

**Estado:** a sombra dobrada de Plutão e Caronte está FEITA e no `main`
(03/10, com a palavra dele: *"pode juntar ao principal e seguir com
tritão"*; backup em `origin/backup`): saiu a sombra das fotos que o relevo
medido explica (`scripts/data/atlas/sombra-assada.mjs`) e a que a rodada da
cor tinha posto no inventado; assada no terminal dele a pedido dele, byte a
byte o candidato aprovado, `data:verify` e `npm run done` verdes, fotos do
app idênticas às da prancha. Ferramentas em `capturas/sombra-dobrada/`.

**Tritão: PAUSADO por decisão dele (04/10).** *"acho q tritao esta bom hj,
vamos tomar cuidado para nao piorar"*; comparada lado a lado no app
(`capturas/tritao/olhar/prancha-comparacao-v1.jpg`), a primeira versão da
receita ganhou na face fotografada e PERDEU no lado oposto a Netuno (o que
o Sol ilumina hoje: foto de aproximação borrada, com manchas de cor) — ele
escolheu *deixar como está*. Fica o mapa de hoje (redesenho por IA). Nada
foi ao `main` além deste bastão. O trabalho fica no ramo `tritao` (backup
`origin/tritao`): o plano com fatos, medidas e a ideia da segunda tentativa
(`PLAN-TRITAO.md` do ramo), o leitor de cubo ISIS com teste, Tritão na cor
inventada e, como experimento só do ramo, a normal ligada; dados em
`.cache/tritao/` (mosaico 2021 e os dois DEMs de Schenk, baixados com o sim
dele), ferramentas em `capturas/tritao/ferramentas/`. Só retomar se ele
pedir.

**Falta:** a publicação da sombra dobrada, que é dele, e a conferência no
celular, também dele (*"Depois eu verifico tudo no celular e etc."*). A
fila dele está vazia.

## O BASTÃO anterior (03/10, manhã) — relevo e cor inventados no main, publicados

**Estado:** as duas rodadas — o relevo inventado (ramo `relevo-inventado`)
e a cor inventada (ramo `cor-inventada`) de Plutão e Caronte — estão
FECHADAS e no `main` (merge em avanço simples em 03/10, com a palavra dele:
*"pode seguir com as fotos finais e o merge"*); backup em `origin/backup`.
Tudo assado, verificado (`npm run data:verify` e `npm run done` verdes) e
fotografado no app de verdade nas 11 vistas das pranchas
(`capturas/relevo-e-cor-final-app-prancha.jpg`). PUBLICADO por ele em
03/10 (push da `main`, deploy verde) e CONFERIDO NO AR: os dois mapas de
cor, os dois de relevo e o manifesto têm no site o mesmo sha256 dos locais.

**Falta:** abrir o site em Plutão e Caronte, nas vistas das pranchas, no
computador e no celular — os mapas de cor ficaram mais pesados (Caronte
map.jpg 3,0 → 7 MB; Plutão 4,05 → 4,9 MB; os webp também).

**Fechado:** item 144 (a parte de Plutão e Caronte: relevo real na metade
medida, inventado no resto) e item 229 (sul e lado de trás; o que sobrou
está no `BACKLOG.md`); `PLAN-RELEVO.md` e `PLAN-COR.md` apagados. As
ferramentas, candidatos, pranchas e medidas das duas rodadas seguem em
`capturas/relevo-inventado/` e `capturas/cor-inventada/` (fora do git);
mosaicos crus em `.cache/cor/`, alturas em `.cache/relevo/`.

## O BASTÃO anterior (01/10, noite)

**Estado:** tudo no `main`, PUBLICADO por ele em 01/10 à noite (`d323619`,
corrida verde) e conferido no ar por sha256 (os mapas de normais de Plutão
e Caronte e `texturas.json` idênticos ao repositório). Nada pendente de
commit além deste registro. As provas da rodada estão em `capturas/`
(`plutao-caronte-relevo-prancha.jpg`, `galaxia-poeira-compacta-prancha.jpg`,
`poeira-niveis-custo-prancha-v2.png`, `anel-*`, `hiperion-fantasma-*`).

**A PRÓXIMA OBRA, escolhida por ele (01/10: *"vamos de B e deixamos
especificado"*): o relevo INVENTADO com base científica na metade sem
dado de Plutão e Caronte** — e, pela mesma regra, Tritão e os demais do
item **144** depois. Primeiro um PLANO (sessão em modo de planejamento,
como foi o da poeira), depois a obra. O que já está decidido e onde
estão as peças:
- Decidido: relevo real onde há dado (feito); onde não há, campo de
  crateras e terrenos GERADOS POR CÓDIGO, calibrados pelo lado medido
  (inclinação RMS, distribuição de tamanhos e densidade de crateras,
  espectro de rugosidade do lado medido), costurados na borda do dado
  sem anel, e CONFESSADOS na ficha como invenção — a receita de Reia e
  Jápeto (*"relevo SINTÉTICO gerado por código no projeto Saturn"*).
- Peças: o gerador `gera-normal-de-dem.mjs` tem a máscara de vazio e, só
  durante o bake, as alturas medidas em memória (o DEM não é guardado) —
  a síntese tem de acontecer ali, no bake que ele roda, ou gravar um
  `height` como fazem os corpos de `RELEVO_DA_LUA`; `esculpido.ts` tem
  crateras procedurais para as luas pequenas de Saturno; o código de Reia
  e Jápeto mora no projeto Saturn DELE, fora deste repo — perguntar onde.
- A confissão muda: "só a metade medida tem dado; o resto é relevo
  inventado por código, calibrado pelo lado medido" (pt + en, tabela "a
  imagem" do ASSETS, `texturas-em-ingles.mjs`).
- Defeitos conhecidos do dado real para o mesmo plano (ver `BACKLOG.md`):
  grão de ruído estéreo na planície Sputnik; faixas junto do vazio.
- Como retomar: ler esta seção e o item 144; medir e fotografar antes de
  especificar; ele decide por foto; ele roda os scripts de dados.

**Pistas de desempenho que sobram (BACKLOG.md):** o τRT RGBA de 8 MiB
que só serve ao `?forgetau=1`; a gaveta a 320 px (só iPhone SE antigo).

## O BASTÃO anterior (01/10, madrugada)

**30/09–01/10 (rodada dos DEFEITOS VISÍVEIS). Palavras dele: *"quero
resolver e focar nos problemas e defeitos, coordene pra tirar isso da
frente. e veja se estamos consumindo os documentos e não gerando novo lixo
que armazena"*. Tudo no `main`, oito commits; PUBLICADO por ele em 01/10
(`a0cec6e`, corrida do GitHub verde) e conferido no ar: o pacote contém os
anéis finos, o corte das partículas, o relevo no passe do clarão e o polo
de Haumea; a folha de estilo traz a gaveta de 23,5 rem; `texturas.json`
idêntico ao repositório por sha256.**

- **Feito (cada um com prancha em `capturas/`):** (1) o passe que tapa o
  clarão das estrelas atrás dos corpos agora desloca o relevo — a ponta
  de Hipérion e a borda alta de Mimas tapam Arcturus; corpos sem relevo
  idênticos pixel a pixel (`hiperion-fantasma-relevo-prancha.jpg`). (2)
  Haumea ganhou o anel (Ortiz 2017) e Quaoar passou da faixa larga
  "didática" aos DOIS anéis finos citados (Q2R e Q1R), com piso de 1,5 px
  (`anel-*-antes/depois-d8.png`). (3) A gaveta de Ajustes não transborda
  mais em 761–1280 px nas duas línguas: ele recusou a quebra em duas
  linhas (*"não gostei dessa quebra de linha e botões com pesos e tamanhos
  diferentes"*), então a gaveta ganhou largura mínima de 23,5 rem (376 px),
  medida pela fileira mais larga em inglês; celular intocado
  (`gaveta-largura-820-*-depois.png`).
  (4) A faixa preta de Saturno NÃO é defeito: é a sombra do planeta nos
  anéis atrás dele, vista de cima; a câmera do Atlas fica sempre 30° acima
  do Sol, por isso parece fixa (`saturno-faixa-prancha.jpg`); saiu do
  BACKLOG. (5) Limpeza: `PLAN-HIPERION.md` (concluído) apagado; a linha do
  arquivo de pendências de 567 KB saiu do BACKLOG (o arquivo já não
  existe). A pasta de 3,4 GB do estudo do NASA Eyes FICA (decisão dele:
  "está aí para estudo e já precisamos usar várias vezes").
- **Aberto — dele:** (a) a 320 px (iPhone SE antigo) a fileira da Poeira
  ainda passa 23 px em pt e 41 em en — só nesse aparelho; (b) gerar o
  manifesto das texturas (o comando `data:texturas`, depois `data:verify`)
  para a ficha de Fobos e Deimos confessar o elipsoide — as frases já
  estão em `ASSETS.md` e traduzidas; depois disso o teste da ficha ganha
  os dois ids; (c) o Hipérion e a poeira no ar, no olho (29–30/09).
  A poda da lista foi FEITA com o sim dele (01/10): doze bastões antigos
  e 67 itens fechados saíram (2.050 → ~650 linhas); a história está no
  git.
- **Feito na segunda leva (01/10):** (6) o anel de Haumea foi para o eixo
  medido na ocultação (Ortiz 2017: AR 285,1°, Dec −10,6°); a parte comprida
  do corpo está deitada no plano do anel (conferido na malha e na silhueta
  da foto, `anel-haumea-polo-*-d8.png`; abertura do anel 13°, a da
  ocultação ~14°). (7) "Copiar link": o foco volta ao campo a CADA falha,
  não só na primeira (reproduzido no Chrome sem `navigator.clipboard`).
  (8) Fim do filme mais leve: em t=150–160 quase os 4 M pontos da galáxia
  estão em vista e o custo é a contagem; um corte no vértice dos pontos
  que não pintam (brilho × alfa < 1e-4) leva t=150 de ~89 para ~62 ms por
  quadro sem mudar nenhum pixel mais que 1/255 (`galaxia-disco-prancha-v2.jpg`).
  (9) A régua de fps consertada de novo: o `--tocar` chamava `play()`, que
  ZERA o filme — a leitura "os níveis custam zero" de 30/09 mediu o começo
  do filme. Com a régua certa os níveis do Gaia custam 4–6 ms por quadro
  (8 % em t=60, 13 % em t=40); está no `BACKLOG.md` como pista, decisão
  dele.
- **Feito na terceira leva (01/10, com o seu sim aos itens 5, 6 e 8):**
  (10) o laço de extinção das partículas da galáxia lê um mapa compacto
  (t=150 61 → 44 ms, t=160 90 → 77 ms, zero pixel diferente); (11) a vaga
  do tijolo nos níveis do Gaia em ponto flutuante exato (custo dos níveis
  de 5,7 para 2,9 ms em t=40; imagem idêntica por sha256); (12) Plutão e
  Caronte com o relevo real da New Horizons na luz, na metade medida
  (ver **144**); as pistas de desempenho que sobram estão no `BACKLOG.md`.
- **Aberto — técnico:** E5, E6, E7 da poeira; **227**; os 18 corpos com
  relevo inventado (**144**); as pistas de desempenho do `BACKLOG.md`
  (mapa de poeira compacto para a galáxia, cache de tijolo nos níveis).

## ALTA — o dono vê e incomoda

**151. Ilustrações por IA para os seis corpos sem foto de superfície**
(pedido dele, 03/09: *"fale os fatos conhecidos se não houver nenhuma
textura para fornecer, explique qual o objeto e suas características para
que o modelo crie o asset"*). Hígia, Palas, Haumea, Makemake, Éris e
Quaoar: nenhuma sonda os visitou; hoje são procedurais (e Hígia usa um
gráfico, item 150). Obra: um operário barato gera no ChatGPT do dono, pelo
Chrome dele, um mapa por corpo a partir dos fatos conhecidos (tamanho,
albedo, cor, crateras vistas de longe), nível casado com o albedo
declarado, entra como fonte local, ficha confessa "ilustração por IA, não
há foto". Pacote pronto no scratchpad da sessão; despacha depois do 149
(um operário por vez, §12). Fecha o 150.
- **FEITO em 03/09, à noite.** Um chat por corpo no ChatGPT do dono
  (Chrome dele, receita do item 148), pedido só com os fatos publicados —
  sem imagem de referência, para não ensinar a IA a copiar o gráfico
  errado ou o cinza procedural. Seis mapas 1774×887, fonte LOCAL
  (`scripts/data/atlas/fonte/<corpo>-ia.png`). NÍVEL casado ao albedo: um
  passo novo do pipeline (`bake: 'ilustracao-ia'`, `baixa-texturas.mjs`)
  mede a média do mapa em linear e escala por um ganho até bater no
  albedo geométrico — Hígia 0,0296→×2,367→0,07; Palas 0,1991→×0,804→0,16;
  Haumea 0,5744→×1,219→0,70; Makemake 0,2172→×3,683→0,80; Éris
  0,8178→×1,101→0,90 (grampeado do medido 0,96); Quaoar 0,0570→×1,931→
  0,11. `rochoso.ts`: as cinco saíram de `superficie: 'procedural'`
  (agora usam mapa, como as irmãs); a tabela `ALBEDO_PROCEDURAL` ficou
  sem leitor e saiu (§6) — os shaders procedurais continuam (testados em
  `rochoso.test.ts`), só não são mais alcançados por nenhum corpo hoje.
  Origem no manifesto credita a imagem ao autor (Felipe Ferreira, gerada
  com IA); ficha confessa nas duas línguas que nada é medida. `data:verify`
  verde, eslint limpo, `tsc -b` verde. Fotos
  `capturas/item151-<corpo>-{antes,depois}.png` (higia, palas, haumea,
  makemake, eris, quaoar) — o antes de Hígia mostra o gráfico do 150
  (grade e "90°"/"180°" por cima), o antes dos outros cinco mostra o cinza
  procedural liso; todas conferidas por olho (luz de um lado, sombra do
  outro, tom coerente com o albedo). Fecha o 150.
- **Sobra (auditoria do coordenador, §13):** o ramo `superficie: 'procedural'`
  de `rochoso.ts` (dois shaders e o interruptor) ficou sem consumidor — nenhum
  corpo o usa desde o 151; `rochoso.test.ts` ainda o exercita. Remover na
  próxima passada em `rochoso.ts`, com o ajuste do teste na lista do §19.

**149. Plutão e Caronte com mapa de 720 px sem detalhe** (censo de
03/09, pergunta dele: *"tem mais algum corpo que precisa melhorar a
textura?"*). Os mapas da NASA 3D têm 720×360 e detalhe zero acima disso; a
New Horizons fotografou os dois a 300 m/px e a NASA/USGS publica os
mosaicos globais (domínio público). Obra: trocar os dois pela fonte
primária, reamostrada ao teto da casa, orientação conferida contra o mapa
atual, origem/licença/confissão, `data:verify`, fotos. Delegado ao
operário (Opus) em 03/09, à noite.
- **FEITO em 03/09, à noite, nos dois.** Plutão pelo `PIA11707`, o mapa
  global EM COR da Ralph/MVIC (5926×2963, domínio público NASA/APL/SwRI);
  Caronte pelo `Charon_NewHorizons_Global_Mosaic_300m_Jul2017` do USGS
  (12693×6347, um canal, reamostrado a 8192) — **não existe mapa global em
  cor de Caronte**, e ele entra em cinza em vez de matiz inventado. Os dois
  entram por URL, sem arquivo vendorizado. Os mapas que saíram eram
  ANTERIORES ao sobrevoo de 2015: correlacionam 0,31 e 0,09 com os mosaicos
  reais, ou seja não tinham geografia nenhuma (era o `2k_ceres_fictional`
  outra vez, sem a confissão da fonte). Orientação decidida pela
  georreferência do GeoTIFF, não por eles (Plutão gira 180°, Caronte 0° —
  régua em `capturas/item149-orientacao.txt`). Confessado: o polo sul dos
  dois estava em noite polar no sobrevoo, e 30 % (Plutão) e 34 % (Caronte)
  do mapa entraram lisos com o tom médio do que a sonda viu; Caronte
  confessa também que é pancromático. `data:verify` verde, eslint limpo.
  Fotos `capturas/item149-{pluto,charon}-{antes,depois-v2}.png` e
  `item149-pluto-sputnik.png` (meia rotação depois, para a Sputnik
  Planitia aparecer).

**150. Hígia entra na esfera com um GRÁFICO como textura** (censo de
03/09): o "mapa" do ESO/Wikimedia é uma figura científica — metade preta,
grade de latitude, números e barra de cores desenhados por cima. Não
existe foto de superfície de Hígia. Obra mínima: sair o gráfico, entrar a
superfície procedural declarada (como Palas), ficha confessando; a forma
irregular do DAMIT (CC BY, já anotada no ASSETS) fica para depois, com o
pipeline de malha. Depois do 149.
- **FEITO em 03/09, à noite, pelo item 151**: o gráfico saiu; Hígia entra
  com a ilustração por IA (`hygiea/map`), não com o procedural que este
  item cogitava — texto e fotos no 151. A forma irregular do DAMIT segue
  pendente, com o pipeline de malha.

**148. As luas de Urano e Tritão com o hemisfério nunca visto
reconstruído** (decisão dele, 03/09: *"eu quero"*; *"não quero montagem,
use a que gerei"*; *"faça o uso do computador e acesse meu ChatGPT"*).
- **FEITO em 03/09, à noite, nas seis.** O mapa inteiro de cada uma é a
  imagem gerada por IA na conta dele: Miranda pela mão dele; Ariel,
  Umbriel, Titânia, Oberon e Tritão geradas pelo Chrome dele com amostras
  melhores (mosaicos de Schenk/LPI 2020 e o mapa NASA/LPI de Tritão a
  600 m, vazio tapado em tom liso por `amostra-para-ia.mjs`). Celestia
  medido e descartado (tom liso em 45–56 % e menos detalhe que a NASA 3D);
  os mapas pintados do `atlas-orbital` sem origem não entram. Fontes locais
  em `scripts/data/atlas/fonte/<lua>-ia.png`; ficha confessa "redesenho por
  IA, nada é medida" nas duas línguas; `data:verify` verde. Fotos
  `capturas/item148-<lua>-ia.png`. Fecha o **116** e o resto do **147**.
  Espera a palavra dele sobre o visual; **lista do §19:** nada novo
  (nenhum teste novo; a suíte cheia não rodou nesta janela).

**147. "Precisamos revisar as luas de Urano... algo estranho está
acontecendo."** (Palavras dele, 03/09.) Miranda, Ariel, Umbriel, Titânia
e Oberon saem como um **disco preto** no degrau `lua` do Atlas (Tritão
também — é o item 116, mesma causa); as duas mais distantes nem se
distinguem do céu. Medido em 03/09 com a cena viva: a câmera está no lado
do dia (70° do Sol), a luz chega certa, a textura está carregada — e o
mapa é que é preto: **57–62 % de cada mapa da NASA 3D é preto puro**
(hemisfério norte, que a Voyager 2 não viu em 1986; Tritão 80 %), e em
2026 o Sol ilumina justamente o norte de Urano. Em `?jd=2446454.5`
(a passagem da Voyager) o sul de Miranda aparece com a textura real e o
norte é um buraco de borda dentada. Obra: preencher o vazio na linha de
produção das texturas com o tom médio do hemisfério fotografado (o
precedente do polo sul de Ceres), declarado na ficha; fotos antes/depois.
- **FEITO em 03/09, espera a palavra dele.** `preencherVazioSemDado`
  (lib-texturas.mjs, passo `preencher-vazio` da aquisição) tapa o vazio
  GRANDE (vizinhança 15×15, >35 % sem dado, núcleo crescido meio raio)
  com o tom médio do que foi fotografado; sombra de cratera fica. Os seis
  mapas foram regerados (escada + webp + manifesto), `data:verify` verde,
  a ficha confessa ("só o hemisfério sul foi fotografado…"). Fotos
  `capturas/item147-<lua>-antes/depois.png` e a régua
  `capturas/item147-vazio-dos-mapas.txt`. O que ele vê agora: as seis
  luas cinzas e lisas no lado que nunca foi fotografado, com a textura
  real onde há foto — se quiser relevo/crateras inventadas ali (o que o
  SpaceEngine faz), é obra nova e decisão dele.

**145. "Porque não deixamos isso como um toggle então... se a pessoa
quiser ela desliga isso, mas como eu não tenho hoje o toggle não consigo
nem entender direito em tempo real qual é o impacto em performance e em
qualidade visual."** (Palavras dele, 03/09, sobre o MSAA do item 144.)
A gaveta **Avançado** do menu de gráficos — presets na frente,
controles individuais atrás — tem TRÊS controles, cada um com o mesmo
desenho: quatro estados começando em "Do preset", troca na hora sem
recarregar, os quadros/s do próprio painel logo acima servindo de
régua, e o rótulo do seletor de qualidade passando a dizer
"Personalizado" quando qualquer um deles sai do preset.
- **FEITO em 03/09** (MSAA) e ampliado no mesmo dia com a nebulosa e a
  escala de resolução (*"pode adicionar também a nebulosa e a escala de
  resolução no Avançado"*):
  - **Suavização de bordas (MSAA)** — Do preset / Desligada / 2× / 4×.
    Override no `Post` (`forcarAmostras`, que reaplica pelo mesmo
    `aplicarAmostras` — é ele que dispõe os dois alvos e faz a troca
    valer). Espelho `?msaa=`.
  - **Nebulosa (raymarch)** — Do preset / Baixa / Média / Alta. Os três
    níveis são os pares que os presets já usavam, agora numa tabela só
    (`NEBULOSA_POR_NIVEL`, no engine: 30/0,35 · 44/0,5 · 56/0,5) que o
    preset APONTA em vez de redigitar — os passos moravam no preset e a
    escala era um ternário solto no Director. Override no Director
    (`forcarNebulosa` → `aplicarNebulosa`, o mesmo caminho do
    `onQuality`). Espelho `?nebula=`. `?nebsteps=` continua vencendo
    tudo, dentro da própria `Nebula`: é bancada, não controle.
  - **Escala de resolução** — Do preset / 50% / 75% / 100%, em fração
    da densidade NATIVA da tela (100% = `devicePixelRatio`). Override no
    Engine (`forcarEscala` → o mesmo `aplicarNitidez` do preset e do
    vigia de DPR). Espelho `?escala=`.
  Os três se publicam no `EstadoDaQualidade` e o selo declara os três
  pelo estado VIVO, nunca pela presença da porta; a URL é ESPELHO —
  escrita só fora do preset, apagada na volta. "Personalizado" sai de
  `foraDoPreset`, que olha os três.
- **Medido depois do conserto do 144** (Retina, cena conferida, modo
  cru, Atlas 2560×1500 cinema 12,3 fps de partida): `?msaa=0` bate no
  teto de 60 em 1200×900, a escala 50% é a alavanca maior; os fps que o
  agente contou ao construir a gaveta eram de cena preta e não valem
  (`capturas/desempenho-m1-03-09.txt`). Fotos em
  `capturas/item145-ajustes-{gaveta,escala-50}.png`.
- **Aberto:** próximos controles candidatos (população da galáxia,
  grão) e o orçamento de pixels / Auto aplicando na 1ª visita — decisão
  dele.

**144. "O app está um pouco pesado nessa máquina."** (Palavras dele,
03/09, ao trazer o relatório de desempenho de outra IA.) Medido no M1
dele, Atlas de abertura, janela 2560×1500, modo cru do `gpu-profile`:
**cinema 5,3–5,6 fps, alta 8,3, performance 24**; em janela 1200×900,
cinema dá 19. Números e ablações em `capturas/desempenho-m1-03-09.txt`.
- A causa maior é o **MSAA do item 120/F1** (31/08): o código de 24/08,
  no mesmo Chrome e na mesma vista, faz 10,5 fps onde hoje faz 5,3, e o
  filme (`?t=100`, 1200×900) 15,8 onde hoje faz 9,1 — com `?msaa=0`
  o filme volta a 15,3. O preço não é a beira suavizada: é o composer
  escrevendo QUATRO vezes no `renderTarget1` multiamostrado (cena, blend
  do bloom, soma do `ClaraoDoCampo`, `OutputPass`), e o three resolve o
  alvo de 15 MP ao fim de cada `render()`. Com os cobertores desligados o
  MSAA custa 24 ms; com eles, 67 (37% do quadro).
- Depois dele: a nebulosa (25–30%, `Nebula.render` sem uniform de tempo —
  parada, o quadro é bit-idêntico e é recalculado a 60 Hz mesmo assim) e
  os 4,02 M pontos da galáxia (16%; disco, brilho e poeira custam ~0).
  Estrelas do catálogo, as 16 estrelas-herói, órbitas e nomes: abaixo da
  resolução da medida.
- Fora do MSAA, sobra +6 ms desde 24/08 no Atlas 1200×900 (33,4 → 27,6
  fps com `?msaa=0`); Saturno S5 declarou +1,9; o resto não atribuído.
- O instrumento por passe (timer query por draw) **mente no chip da
  Apple**: apontava as 16 estrelas-herói como 41% do quadro e a ablação
  deu zero. Ranking só por ablação em modo cru.
**FEITO em 03/09 (duas obras, commit desta linha):** (1) o composer
resolve o MSAA UMA vez — a cena cai num alvo multiamostrado próprio que
COMPARTILHA a textura do `renderTarget1` (`CenaResolvidaUmaVez`), zero
cópia; (3) a nebulosa congela com a câmera parada (`Nebula.render`,
chave da câmera + `sujo` nos setters), bit-idêntica. Medido depois:
Atlas 2560×1500 cinema **5,3 → 12,3 fps** (alta 8,3 → 18,3;
performance 24 → 46,9); Atlas 1200×900 cinema 19 → 40,3; filme t=100
dpr 1 9,1 → 15,0, dpr 2 9,8 → 12,1. Pixel: ≤ 1 nível em ≤ 0,02% dos pixels nas 4 sentinelas
(ULP). **Regressão pega e consertada no mesmo dia:** em Retina o alvo
da cena ficava com tamanho diferente do buffer do composer (textura
compartilhada, redimensionamento transitório do `EffectComposer` com
alvo próprio) — cena preta e um lençol cinza crescendo; agora o alvo
sincroniza o tamanho com o destino a cada quadro e o composer nasce em
px de CSS. Os fps em dpr 2 medidos antes do conserto eram de cena preta
e foram substituídos. **Sobra:** o MSAA da própria cena ainda custa ~26 ms em 1200×900
Retina (`?msaa=0` bate no teto de 60) — (2) MSAA só nas fases com linha
de órbita (o filme não tem) segue **esperando a palavra dele**; (4) o
orçamento de pixels e o menu de gráficos, **idem**. Fora desta obra:
`npm run lint` está vermelho em `Spotlight.tsx` (react-refresh, vem do
130/F1), não deste item.

**114. O censo do sistema solar: todas as luas e os objetos interessantes.**
Pedido do dono em 30/08, palavras dele: *"quero expandir nosso projeto
para ter todos obejtos possiveis de luas e obejtos maiores tb. meteoros
etc. queria ter ao menos os 40 maiores obetos do sistma solar..."* e, na
sequência: *"nao quero as naves mas quero todas as luas e outros objetos
interessantes..."*. Hoje o app tem Sol, planetas e poucas luas. A meta:
**sem naves**; TODAS as luas (o Eyes cataloga 451) e os demais objetos
interessantes — planetas-anões (Plutão, Éris, Ceres...), asteroides e
cometas notáveis; o top-40 por tamanho é o piso, não o teto.
**REQUALIFICADO por ele em 31/08, na reavaliação de prioridades:**
*"estava mais preocupado em aumentar a oferta de objetos do sistema
solar, mas sempre focando em relevância e em objetos que tenhamos
assets para utilizar. Então talvez possamos deixar isso para uma etapa
mais para frente ainda... e focar em outros pontos que já estão na
fila há mais tempo."* — ou seja: o critério é RELEVÂNCIA + ASSETS
DISPONÍVEIS (não completude das 451), e a onda fica para DEPOIS das
estações decididas no item 115. O mapa técnico do mergulho 05 continua
válido quando a onda chegar. A mineração do NASA Eyes de 30/08
(`scratchpad/estudos/nasa-eyes-solar-system/mineracao/`) foi reapontada
para colher exatamente a engenharia disso: como o Eyes registra 724
objetos (catálogo de receitas `EntityUtils`, parentesco dependente do
tempo, política de existência por quadro do `SceneManager`, camadas
contextuais por proximidade) — o mergulho 05 traz o confronto. Obra a
desenhar depois do estudo: catálogo, órbitas e texturas dos 40, sem
quebrar a lei de um universo só.

**52. A conferência do dono no app com o padrão novo da luz.**
A queixa que abriu a rodada da luz era do app com o desenho velho; o
pacote inteiro (compressão na emissão, ombro no bloom, filtro solar
declarado, repartição + clarão de asas) espera a conferência DELE no
app. O pouso de 17/08 aceitou a SOLTURA da estrela — este item é o
pacote da luz por inteiro. *(Veio do bloco da onda da luz, enxuto pelo
item 51.)*

**210. Viagem solar.** Filme próprio de quatro minutos no mesmo motor
declarativo do filme galáctico. Conclui com Terra/Lua, Júpiter/Io,
Saturno/luas e o afastamento final, ciência e unidades revisadas, gate
visual e exibição completa aprovada pelo dono. *(Era a fila ativa do
plano do cinema, arquivado — `git show 923dc20:docs/PLANO-CINEMA.md`.)*

**229. Melhorar com IA a cor borrada e de baixa resolução do lado de trás.**
Palavras dele, 02/10: *"acho que podemos enhance com AI tudo que estiver
borrado ou com baixa resolucao para criar uma uniformidade e falar que foi
baseado em todos esses dados como subsidio para a Ai gerar os assets que
vamos usar.... o que acha? será que esse agente conseguiria fazer isso com a
ajuda do chatgpt que gera imagens muito boas?"* Combinado na conversa:
primeiro o relevo (item 144, ramo `relevo-inventado`), depois a cor, numa
rodada própria — o ChatGPT dele pelo Chrome (com o sim dele antes de mandar
qualquer imagem), guiado pela foto borrada, pelo mapa geológico e pelo
relevo inventado, para a cor e a sombra não se desencontrarem; cuidados já
conhecidos: emenda com a metade fotografada, polos (a IA estica), tamanho
(montar por pedaços), tom igual ao da metade real (regra do 151).
- **02/10, noite, ao ver as fotos do app com o relevo assado:** *"foto 4 de
  caronte ficou um emenda reta estranha, como podemos resolver isso?"*;
  medido: a linha é a borda do tapa-buraco do sul nunca fotografado no mapa
  de COR (item 149), não o relevo. Palavra dele: *"hyperion nao tem esse
  problema... quero que resolva de forma que fique lindo, com embasamento
  cientifico, sem esse defeito e com relevo. como vc vai fazer é contigo..."*
  EM OBRA no ramo `cor-inventada` (plano em `PLAN-COR.md`): transferência de
  textura na esfera guiada pelo relevo inventado e pelo Sol assado das fotos
  (medido: NNO, ~45° de elevação), pedaços da cor real do mesmo terreno,
  tom de grande escala continuado da borda fotografada; a pintura por IA
  fica de reserva, se a textura não convencer por foto.
- **02/10, noite, por prancha:** o sul de Caronte — *"Sim, aprovado"*; o sul
  de Plutão, entre três opções de gosto (leopardo, calma, serena) — *"C —
  serena"* (fundo uniforme, crateras pela sombra do relevo, mosqueado de
  albedo pela metade), que vale também como o grau de mosqueado do lado de
  trás borrado na etapa seguinte.
- **FEITO em 02–03/10 (ramo `cor-inventada`; no `main` em 03/10 com a
  palavra dele, *"pode seguir com as fotos finais e o merge"*):** o sul
  nunca fotografado dos dois corpos e o lado de trás borrado ganharam cor
  inventada por transferência de textura na esfera, guiada pelo relevo
  inventado e pelo Sol assado das fotos (medido), com pedaços da cor real
  do mesmo terreno e de tom parecido, o tom de grande escala continuado da
  borda fotografada e, no lado de trás, a foto mantida na escala em que a
  sonda a resolveu (só o detalhe mais fino é inventado); lado de trás
  aprovado por prancha (*"Sim, os dois aprovados"*); gerador travado por
  hash com a palavra dele; confissão nas duas línguas na ficha; a pintura
  por IA não foi precisa. Sobras no `BACKLOG.md`. Prancha final do app:
  `capturas/relevo-e-cor-final-app-prancha.jpg`.

**230. Os assets fracos do Sistema Solar vão para a fila de melhoria.**
Palavras dele, 05/10, ao decidir o roteiro da viagem solar (seis minutos,
todos os lugares, Urano inclusive): *"vamos incluir todos, ainda vamos
melhorar esse asset, se houver mais algum asset que precise ser melhorado
também vamos colocar isso no pipeline"*. O inventário de 05/10 (feito para
o roteiro) aponta, do mais fraco ao menos: Urano (mapa derivado, sem feições; os anéis
SÃO desenhados, tênues — visto no Ato IV em 06/10), Netuno (mapa derivado),
Vesta e Deimos (elipsoides sem forma), Tritão (metade reconstruída por IA
sobre a Voyager 2), Ariel (norte inventado), Titã (só a névoa, 720×360),
Vênus (só o topo das nuvens — correto visto de fora; a superfície é radar),
Jápeto (altura sintética na crista; a crista real é o que o filme mostra).
Acrescentada em 05/10, vista na prova do Ato II do filme solar: Europa (o
mapa é monocromático — as rachaduras saem pretas, não avermelhadas).
Jápeto, visto no Ato III (05/10): o relevo sintético desenha a crista do
equador de 332°L a 136°L, meia volta fora do lugar da crista real da foto
(227–303°L); em 1º/01 a real estaria no lado do dia (ponto subsolar a
9,2°S 244,7°L) e a desenhada cai na noite — o filme mostra as duas caras e
deixa a crista como fato na legenda. Conserto provável: girar o mapa de
altura 180° ou refazê-lo pela foto. **Decisão dele em 06/10: *"Priorizar
Europa e Jápeto"* — os dois sobem para o topo desta fila.**
Obra a desenhar quando chegar a vez, pela receita das rodadas de Plutão,
Caronte e Hipérion (fonte com licença, extrapolação confessada, prova por
foto); o filme solar (roteiro em `docs/ROTEIRO-VIAGEM-SOLAR.md`) é quem
cobra a ordem. **FEITOS em 07/10 (ramo `europa-japeto`, `PLAN-EUROPA-JAPETO.md`):
Europa (cor real inferida da Galileo sobre o mosaico USGS de 500 m, 4096 px,
tom meio-termo dele) e Jápeto (relevo gerado: crista no lugar com 20 km,
55 crateras com nome, as demais pela foto). Ficam na fila: Urano, Netuno,
Vesta, Deimos, Tritão (pausado), Ariel, Titã, Vênus.**

**232. Os efeitos da Terra ainda estão tímidos: o ar, o relevo e a sombra das nuvens.**
Palavras dele, 08/10, testando o ramo `atlas-perto` com a câmera nova: *"Continuo achando os efeitos tímidos atmosfera tímida o relevo também me parece tímido não consigo perceber bem a sombra das nuvens nem o relevo da terra"*. **Decisão dele: *"Os dois, nessa ordem"*:**
1. primeiro achar e tirar o que está apagando os efeitos, sem exagerar, com antes e depois;
2. se ainda ficar tímido, um modo "realçado" nos Ajustes, com o exagero declarado.

Suspeitas já levantadas, todas a medir:
- o relevo da Terra carregado a 4096 em cinema, embora o de 8192 exista;
- a média por célula de ~10 km apaga as encostas íngremes que dão o contraste com o Sol baixo;
- a faixa macia do terminador da política `assistida` achata o contraste justamente onde o relevo e as sombras aparecem;
- a exposição e a curva de tom comprimem o claro e o escuro;
- a sombra das nuvens é forte só com o Sol baixo.

Plano e estado em `PLAN-ATLAS-PERTO-E-POR-DO-SOL.md`.

## MÉDIA — afeta o produto, não salta aos olhos

**142. Texturas grandes e memória: trazer a técnica de tiles do NASA
Eyes?** Palavras dele, 03/09, ao aprovar a cor real de Ceres e o giro de
Vesta: *"estou preocupado com a questão do manejo de memória e essas
texturas muito grandes. Estamos usando a solução do NASA Eyes para o
manejo de memória de texturas grandes? não deveríamos talvez trazer essas
texturas do NASA Eyes of the Solar System."* Estado medido (item 115,
bloco A): a casa já traz do Eyes o que governa a memória — nível de textura
pela demanda de pixels (escada 1024/2048/4096/8192 por tier + gate de 48
px), só o corpo em foco residente, decodificação fora da thread e DESCARGA
com carência de 15 s (1.083 → 70 MiB residentes no passeio de oito corpos).
O que NÃO foi trazido é a **pirâmide de tiles** (`WMTSTile`/`CMTSTile` +
`TextureLOD` do Eyes): lá o globo nunca carrega um 8k inteiro, só os
ladrilhos em vista no nível pedido — é isso que permite close acima de 4k
sem custo de memória nem de download. Os ARQUIVOS do Eyes não se trazem:
vêm de servidores da NASA (não é dependência nossa) e são os mesmos mosaicos
USGS/NASA que já usamos. O custo hoje não é memória (limitada e medida), é
download por corpo em cinema (mapa 12 MB + normal 9 MB) e o disco do site
(316 MB; a mineração mediu pirâmide estática viável a ~31 MB/corpo no nível
2). Obra GRANDE (carregador de tiles + assamento + testes). **DECISÃO DELE
(03/09): "deixa o 142 na fila depois do 130."**

**144. Dezoito corpos ainda têm o relevo INVENTADO da cor — desfazer, com
relevo real onde houver mapa de altura.** Palavras dele, 03/09, ao encerrar:
*"acabo de perceber outros objetos que estao com o mesmo problema, triton
lua de netuno, parece ser um deles, quais outros? acho que temos que desfazer
isso, mas nao nessa sessao... se tiver mapa de alturas aplicamos o relevo
assim, senao deixamos sem o relevo."* Censo (mecanico, 03/09; tabela em
scratchpad da sessão, resumo aqui): com o bump da cor LIGADO hoje — Fobos,
Deimos, Ganimedes, Calisto, Miranda, Ariel, Umbriel, Titânia, Oberon, Tritão,
Plutão, Caronte, Palas, Hígia, Haumea, Makemake, Éris, Quaoar (18 — desde
01/10, 16: Plutão e Caronte ganharam o relevo real, abaixo).
- **Relevo real pronto (aplicar como no 141):** Plutão e Caronte — DEM da
  New Horizons (Schenk et al. 2018, USGS Astropedia, 300 m/px). CORRIGIDO
  em 01/10 lendo os arquivos de verdade: o dado cobre ~45 % de Plutão
  (o hemisfério do sobrevoo e a calota norte) e ~44 % de Caronte (o lado
  voltado para Plutão) — "quase global" estava errado; é o mesmo caso de
  Tritão, abaixo. Ele aprovou a obra em 01/10 (*"8 vamos fazer"*) e, para
  a metade sem dado, escolheu o relevo INVENTADO com base científica
  (*"vamos de B e deixamos especificado"*): primeiro o relevo real na
  metade medida (bola lisa no resto, confessada); depois, rodada à parte,
  campo de crateras e terrenos gerados por código na metade sem dado,
  calibrados pelo lado medido e confessados na ficha como invenção — a
  receita de Reia e Jápeto. Vale como regra para Tritão e os demais.
  FEITA a primeira metade em 01/10: ele assou os dois mapas (guarda 0,31
  contra −0,006 e 0,31 contra 0,09 na meia-volta, pico em 0°; 53,6 % e
  54,4 % de texels sem dado saem lisos; inclinação RMS 7,3° e 8,5°, máxima
  57° e 61°, sem muro na borda), `data:verify` verde, relevo ligado nos
  dois (`NORMAL_MEDIDA`, bump da cor zerado), Marte idêntico por md5;
  prancha `capturas/plutao-caronte-relevo-prancha.jpg`. Visto na prova e
  não consertado: a planície Sputnik tem grão fino de ruído estéreo do
  DEM (RMS ~5° numa planície que é lisa) e faixas de baixa amplitude
  junto do vazio, só visíveis no mapa de diferença ×8. A segunda metade
  (o inventado científico na metade sem dado) é rodada à parte. FEITA a
  segunda metade em 02/10 (ramo `relevo-inventado`, à espera do merge e da
  publicação): a metade sem dado ganhou relevo inventado por código — colcha
  de retalhos do terreno medido do mesmo tipo, posta onde o mapa geológico
  das fotos da aproximação põe cada terreno (Plutão: Stern et al. 2021;
  Caronte: palpite guiado por Beyer et al. 2021), as crateras reais do
  catálogo de Robbins no lugar (Simonelli com o perfil medido da Burney), as
  menores sorteadas, as feições dos artigos traçadas, o sul por palpite; no
  medido, emendas e dado ruim refeitos só no detalhe fino. Ele escolheu por
  prancha completar o borrado e alisar a Sputnik (o grão de ruído saiu). O
  gerador só grava o mapa com o hash aprovado, e a ficha confessa tudo nas
  duas línguas. Prancha do app: `capturas/relevo-final-app-prancha.jpg`. A
  cor borrada do lado de trás é o item 229.
- **Real por FORMA (malha, não normais):** Fobos (Gaskell/SPC, PDS) e Deimos
  (PDS) — caminho do esculpido com dado real, fase própria.
- **Parcial, decisão dele:** Tritão tem DEM real (Schenk/LPI) em ~40 % da
  superfície — aceitar meio globo sem dado, ou zerar.
- **Sem dado (zerar o bump, como Europa/Io):** Ganimedes, Calisto, as cinco
  luas de Urano, Palas, Hígia, Haumea, Makemake, Éris, Quaoar (13).
Ordem sugerida: Plutão+Caronte → zerar os 13 → Fobos+Deimos → Tritão
(com a palavra dele). NA FILA, sem obra nesta janela (ordem dele).

**No mesmo item, sem obra (auditoria 03/09):** as mensagens de commit do 139b (`e24237f`, `c3b89a1`) dizem que o `nearPlanePc` sem o registro do anel dava **192,9 km** (192,858, medido no app), e o teste `corpos.test.ts` cobra **198,9 km** no mesmo caso ("APAGADO o registro do anel"). Os dois números são de palcos diferentes — o do app e o sintético do teste — e nenhum dos dois está errado; fica registrado para que a próxima leitura não trate a diferença como regressão. Nada a consertar.

**12.** Nenhuma foto de referência mora entre 1 UA e 40 UA — onde a tela
lava. A régua de luz e as vistas `ua2`…`ua2000` já enxergam a faixa.

**13.** Sagittarius A✱ ainda é 125.884× maior que o real. Segundo
mentiroso de escala. Cadastro em `escala.ts`.

**19. (A METADE DA CONFISSÃO FECHOU em 22/08; a das texturas segue
aberta.)** Titã tem emendas, Europa tem 68 linhas pretas no polo sul,
Ceres é inventado pela fonte, Vênus não tem foto em luz visível.
→ `docs/reference/ASSETS.md`. **O que fechou:** a ficha do objeto agora
DIZ isso na tela, corpo a corpo, junto com a fonte, a licença e o
crédito da imagem — a frase sai do próprio ASSETS.md, lida por máquina.
**O que fica:** as texturas continuam sendo as piores das duas, e
trocá-las é trabalho de bancada (o mosaico Cassini de Titã com as
emendas tratadas, as 68 linhas de Europa preenchidas, o mosaico Dawn de
Ceres com licença fechada).

**36. (MEDIDO em 17/08 — o censo completo mora no commit da data.)
SEIS leis de poeira convivem, não quatro.** Às quatro contadas (a
tripla literal do catálogo, as cascas em 0,8 mag/kpc acromático, a
CCM89 das partículas com saturação `?chromsat=`, o forno das forjas —
CCM89 SEM saturação e desligado por padrão) somam-se as nuvens
observadas (CCM89 sem coluna, τ fixo 2,4) e a LUT da faixa (A_V→τ
cinza). Três espaços de conta e três curvas espectrais diferentes; o
catálogo e as partículas — as duas camadas que se tocam na tela —
avermelham DIFERENTE (~33% mais azul comido no catálogo para a mesma
coluna). O NORTE errava dois de quatro e foi corrigido no mesmo
commit: a λ^−2,6 do catálogo NÃO existe (executa-se `exp(−τ·[1.0,
1.65, 2.35])`, que nem se reduz a lei de potência) e o "1,5 mag/kpc no
bake" é âncora declarada pendente no próprio código (executa-se um
fator 2,39 normalizado). De carona: a extinção do catálogo entra DUAS
vezes (na cor e em metade do alpha) com degrau duro em 3 px, e o
`tau: 0.045` do director deixa o default 0,9 da classe como letra
morta. A UNIFICAÇÃO segue sendo a pauta 1 do NORTE — obra própria, que
muda pixel e volta com foto para o dono a cada mudança.

**116.** (Suspeita a medir, achada em 31/08 fechando o item 84.)
`?foco=tritao` devolve o disco de Tritão **inteiramente escuro**, com e
sem `?d=`, no jd pinado do gate (2460409.26) — silhueta preta sobre a
Via Láctea. Pode ser geometria honesta (a noite virada para a câmera
naquele instante) ou defeito do degrau `lua` de Netuno (enquadramento
ou luz). Antes de tocar qualquer linha: par de capturas em dois jd
diferentes e a conta do terminador (onde o Sol está em relação à
câmera). A vista foi DESCARTADA do gate do 84 por isso; se for
geometria honesta, vira candidata de novo com outro jd.
- **Causa achada em 03/09 (item 147):** não é geometria nem o degrau —
  o mapa de Tritão da NASA 3D é 80 % preto (só a faixa que a Voyager 2
  fotografou tem dado). Preenchido junto com o 147 (FEITO em 03/09, espera a palavra dele).

**VEREDITO (medido em 31/08 — luz e enquadramento INOCENTES; culpado é o
MAPA).** A câmera está no lado do DIA: ângulo de fase 70,00° no jd
pinado (67% do disco iluminado) — e é 70,00° exato porque
`MAX_SOLAR_DEVIATION_GRAUS` de `direcaoDaLua`
(`src/three/cinematic/enquadramento.ts`) grampeia ali. O censo das 13
luas no mesmo jd dá fase ≤ 70° em TODAS (Lua 6,7° … Calisto/Ariel/
Oberon/Caronte 70,0°): o degrau `lua` sempre escolhe o lado do dia, e
Tritão não é azarado. Sem eclipse (Sol↔Netuno visto de Tritão: 34,7°,
contra 4,0° de raio angular de Netuno), `uLuzGanho`=1 e `uEclipseAtivo`=0
como em Ganimedes. O preto é a TEXTURA: `public/textures/atlas/triton/
map.webp` é mosaico parcial da Voyager 2 com **76,0% da área esférica em
preto puro** (Ganimedes: 0,16%), e o shader usa o mapa como albedo cru
(`albedo = texture2D(uMapaDia, vUv)` em `ROCHOSO_LS_FRAG`/`LAMBERT`,
`src/three/world/corpos/rochoso.ts`) — albedo 0 × luz = 0. Em 24
instantes (uma órbita de 5,88 d e um ano) o sub-ponto da câmera cai
SEMPRE no vazio do mosaico (amostra da textura: média 0, máx 0), porque
Tritão é síncrono e o enquadramento vai para o lado oposto a Netuno.
Prova por gesto do produto: 4 arrastos de 400 px no MESMO jd levam o
sub-ponto a uv (0,634 / 0,829), dentro do trecho fotografado, e o miolo
do quadro sobe de 2,7/4,3 para 11,8/101,6 — o globo acende
(`capturas/item116-tritao-girado-4x400px.png`). **A família é maior que
Tritão**: Titânia 68%, Ariel 66%, Oberon 66%, Umbriel 63%, Miranda 61%,
Hígia 59%, Jápeto 30% de área preta no mapa. **Conserto proposto (não
implementado):** preencher o vazio dos mosaicos parciais na origem —
albedo médio do corpo, com a costura suavizada — em vez de servir preto
puro como albedo. Fotos `capturas/item116-*.png`, rastro com ângulos,
distâncias e a receita de recomputo em `capturas/item116-tritao.json`.

**211. Camada de fatos relacionais na ficha do objeto** (idade da luz, o
Sol visto de lá, a Lua conferível hoje à noite). A ficha do objeto já é a
casa dela (`FichaDoObjeto` + `lib/atlas/ficha.ts`); falta o conteúdo em si.

**212. Wikipedia no painel, opt-out persistido.** Falta a 2ª prova:
IndexedDB, CORS no GitHub Pages e opt-out verificável (desligado ⇒ zero
requisições). Se falhar, a linha cai para Renasce.

**213. Orçamento de payload por tier.** Teto de efemérides/texturas e o
recorte da identidade no `sc1` (hoje só as 1.726 nomeadas; as 328k
esperam) — decisão do dono pendente; libera o dado, não a busca.

**214. `arriveDist` com termo angular** (câmera, não luz) — hoje a câmera
pousaria igual em Betelgeuse e em Proxima.

**226. Hipérion com a forma medida e os poços da pintura: as melhorias que
faltam, sem perder desempenho.** Palavras dele, 22/09, ao ver a quarta
versão do piloto: *"ficou muito bom, não achou?"* e *"ok então, mas guarde
essas melhorias no pipeline (quero fazê-las sem perder performance)"*. O
piloto mora no ramo local `piloto-hiperion`; no app desde 23/09 (`3fc49d2`):
forma medida no mapa de altura, poços nos mapas de altura e de normais,
cor da pintura. Fotos: `capturas/hiperion-app-prancha-*.jpg`.
- **FEITO em 29/09 (custo igual, medido no mesmo minuto: 4,06 ms contra
  4,09 ms por quadro no desenho do Hipérion):** (1) a sombra de parede
  dentro dos poços e da bacia — um MAPA DE HORIZONTE assado fora do app
  (`gera-horizonte.mjs`: seis azimutes em dois mapas RGB de 2048×1024,
  sem alfa porque o Safari do iPhone estraga a cor onde o alfa é zero);
  na GPU são duas leituras de textura: a luz direta apaga onde o relevo
  tapa o Sol, e a lanterna de leitura enfraquece onde o céu é fechado. As
  meias-luas acesas no lado escuro (bordas de poço iluminadas depois do
  terminador) somem; Mimas e Tétis ficam byte a byte iguais. (2) A borda
  clara da bacia: a cor clareia com o declive da forma medida sobre o
  elipsoide ajustado a ela (até +35 %; a constante `BRILHO_DA_ENCOSTA` na
  receita, ele ajusta por foto). (3) A mancha em estrela do alto (texel
  900,333) coberta por um pedaço limpo da própria pintura, da mesma
  latitude. Pranchas: `capturas/hiperion-horizonte-*.jpg` (antes | depois
  do horizonte) e `capturas/hiperion-final-*.jpg` (antes | horizonte |
  final). Sem relação: o passe que tapa o clarão das estrelas segue sem o
  relevo (`BACKLOG.md`).
- **Aberto — dele:** (a) o interruptor dos poços — custaria um segundo jogo
  de mapas (altura, normais, horizonte, ~5 MB) e um lugar na gaveta; hoje
  os poços ficam sempre ligados, confessados na ficha; (b) o detalhe
  colado na superfície: o grão de perto da casa (±6 %) já está ligado no
  Hipérion, mas de muito perto (d = 1,2) a pintura fica macia — se
  incomodar, um grão mais forte só para ele, sob o mesmo portão; (c) o
  quanto a encosta clareia (0,35) e se as outras "flores" de raios da
  pintura, menores, também saem.

**227. Todas as estrelas com a tecnologia do Sol.** Vontade dele, 23/09,
para uma rodada futura: *"o Sol quando aproxima vira uma estrela procedural
(coisa que quero ainda fazer para todas as estrelas, transformar a mesma
tecnologia do Sol para gerar todos os tipos de estrela possíveis... numa
rodada no futuro)"*. Hoje só o Sol ganha corpo quando a câmera chega perto
— granulação, manchas, coroa, flares e proeminências, tudo gerado por
código (`world/stellarBody.ts` e `world/sol/`); as outras estrelas seguem
ponto e brilho, por mais perto que se chegue.
- **O que ele quer:** a mesma tecnologia gerando qualquer estrela a partir
  dos dados dela — temperatura e cor (tipo espectral), raio, luminosidade —
  e cobrindo todos os tipos: anãs vermelhas, estrelas como o Sol, azuis e
  quentes (Rigel), gigantes e supergigantes vermelhas (Betelgeuse,
  Antares), anãs brancas (Sírius B).
- **O que o projeto já prevê, e esta rodada completa:** a lei das estrelas
  (`docs/LEI-DA-ESTRELA.md`, M3) já diz que uma estrela qualquer ganha
  corpo ao ser aproximada (o passo E3, sem uma malha por estrela; o canal
  `aFocus` do item 38 apaga o ponto quando o corpo nasce) e que o brilho de
  todas as estrelas fortes passa para a camada que hoje só desenha o do Sol
  — a mesma que ganhou em 23/09 a pergunta "tem um corpo na frente?". O
  que falta é esse corpo ser a estrela do Sol, ajustada ao tipo de cada uma.
- **Para a rodada:** só a estrela visitada precisa do corpo completo; ponto
  e corpo cedem um ao outro sem somar luz (a dupla-luz que o M3 fecha); a
  cor sai da lei de cor do M3, não de paleta de autor (§5.16 da lei).

**231. O motor dos filmes mostra o tempo correndo e acende as linhas de
órbita, com propósito.** Palavras dele, 07/10, vendo o filme solar novo
(um planeta que some no fim de um ato): *"seria melhor que houvesse uma
transição entre essa época e a outra, de forma que o movimento do astro
fosse mais suave para ele não desaparecer simplesmente... o tempo vá
acelerar ou vá retroceder, de forma gradual, começando do ponto A chegando
no ponto B"*; e sobre as órbitas: *"as linhas de órbita seriam um recurso
que o motor de filmes poderia usar de acordo com sua necessidade... fazer
aparecer suavemente para demonstrar uma órbita, entender que a Lua está
capturada pela Terra... Sem exagero. Indo e voltando, suavemente. De acordo
com a necessidade."* Hoje o filme solar troca de relógio quatro vezes em
rampas fora do quadro (e um degrau no corte do epílogo), e as linhas estão
fora do filme desde a decisão 3 do item 77 (25/08) — que esta palavra
substitui: a linha volta ao filme quando o roteiro pede. O sumiço que ele
viu é provavelmente o salto de Netuno a Plutão (velocidade, não relógio),
em conserto noutra conversa. Combinado: um teste em Júpiter (tempo correndo
com relógio na tela e as órbitas das luas acendendo e apagando), em vídeo
ao lado do filme de hoje.
---

## BAIXA — dívida interna, ninguém vê

**131. Aglomerados, nebulosas e nuvens na busca — roadmap futuro, depois
da curadoria do desenho deles.** Palavras dele em 01/09, ao fechar o
129: *"não vamos fazer isso agora. precisamos ver esses objetos com
calma, acho que hoje talvez eles não sejam desenhados corretamente,
teríamos que curar isso. vamos deixar como roadmap futuro."* Fatos
medidos no dia: os arquivos que o app carrega para essas famílias
(`public/data/galaxy/*.bin`, manifesto) guardam só posição e física —
o nome foi descartado na linha de montagem; os catálogos de origem têm
nome nos aglomerados do Gaia (coluna `Cluster`: NGC, Melotte…) e só
código de coordenada nas regiões H II e masers; as nuvens grandes não
têm nome nem na origem; o cache local dos catálogos não existe (baixar
de novo). Dois caminhos quando vier: (1) tabela curta de lugares
famosos (Nebulosa de Órion, Plêiades, Carina, Lagoa, Águia, Aglomerado
Duplo, nuvens de Touro/Ofiúco/Cisne) pelo mesmo mecanismo de `lugar`
do centro galáctico, com foto de chegada em cada um; (2) reexportar os
nomes dos aglomerados num arquivo lateral (base útil para o 114).
**Pré-requisito, ordem dele: olhar com calma como essas famílias são
desenhadas hoje e curar antes de apontar a busca para elas.**

**132. O juiz `atlas-smoke` está desatualizado pela onda 125 — 7 provas
de rótulos reprovam, e uma pode ser defeito de verdade.** Achado em
02/09 ao rodar o juiz no fecho da faxina (com o sim dele). PROVADO que
não é da faxina: o mesmo juiz rodado no código do fecho da onda 125
(`11cdbf0`, worktree) dá as MESMAS 7 falhas mais a do 119
(`capturas/item132-atlas-smoke-antes-11cdbf0.log` vs
`-depois-37d6010.log`). A onda 125 mudou as regras dos rótulos pelo olho
dele (F4 encobrimento, F5 tipografia e ícones, F7 portas) e só rodou a
suíte, não este juiz. O que reprova: (a) o CENSO da abertura e do teto do
zoom — o juiz pina 15 nomes e uma lista exata de estrelas; hoje são 17
(entram Alnair, Sargas, Shaula; sai Fuyue) — provavelmente só re-pinar;
(b) "1 cortado sem vencedor (corpo:uranus)" — a régua do juiz não conhece
as causas novas de corte (encobrimento/portas); verificar se Urano some
por regra nova ou por defeito antes de re-pinar; (c) no CELULAR
(390×844) Plutão não está desenhado sobre o canvas — pode ser a
tipografia de 16 px da F5 tirando vaga; conferir com foto do telefone.
Obra: olhar as três com foto, re-pinar o juiz com número medido e
declaração no commit (§13). Não bloqueia nada: o site publicado é
anterior à onda 125.

**118. A tela de abertura merece ser repensada por inteiro (futuro).**
Palavras dele em 31/08, ao encerrar o item 34: *"acho que ainda temos
grande oportunidade nessa tela de abertura no entanto.. nao acho muito
bonita ainda... talvez tenhamos que repensar no futuro completamente
essa tela de loading, mas por enquanto vamos dar como encerrada."* Fica
registrado como obra futura de produto, sem urgência; quando vier,
começa por propostas visuais para o olho dele (a mineração do Eyes tem
o mecanismo do loading deles mapeado no mergulho 06 — bundle separado,
dados essenciais antes do app, saída em fade).

**122. O quad das nuvens ainda apaga as OUTRAS camadas aditivas que
estão na frente dele (herdado do item 37, 31/08).** O conserto do 37 deu
dois lados ao campo de catálogo, e só a ele. As demais camadas aditivas
seguem inteiras do lado de trás do quad multiplicativo (`renderOrder` 5),
e como nenhuma escreve profundidade, todas continuam sendo multiplicadas
por nuvem que está ATRÁS delas: o **clarão de asas** (`clarao.ts`, ordem
3 — a lente das fontes fortes, que é artefato do instrumento e nasce na
câmera), as **16 heroes** (`heroStars.ts`, ordem 3) e a **poeira local**
(`dust.ts`, ordem 4). As cascas (`wrappedStars.ts`) e as partículas da
galáxia estão do lado CERTO — são o fundo que as nuvens têm de escurecer,
e é delas que vêm as fendas escuras da faixa. Os dez corpos NÃO sofrem: o
grupo é opaco, escreve o único depth da casa e o `depthTest` do quad o
rejeita. **Nada disto está medido** — o que está medido é a ordem no
código. Casa do conserto: as heroes e o clarão são poucos objetos, com
posição conhecida, e o oráculo do 37 (`temNuvemNaFrente`) já responde por
eles um a um — dá para escolher o `renderOrder` de cada quad. A poeira
local é campo de pontos e pede o mesmo canal do campo. **E há o caminho
grande, que segue de pé:** a extinção das nuvens dentro do shader de cada
camada, por um bake direção × distância — o conserto que o 37 recusou
pelo tamanho, e que resolveria todas de uma vez.

**22.** As 6 fotos reais do Sol nunca foram curadas — a bancada nunca as
baixou nem as pôs diante do olho dele. *(A outra metade do item — "35
imagens de referência citadas que não existem" — morreu em 01/09 na
verificação: o `referencias-corpos/LEIA-ME.md` foi limpo em 12/08, dois
dias antes de o item nascer; hoje cita 8 e as 8 existem.)* Trabalho de
bancada com o olho dele, não conserto; conversa com o 12 e o 23.

**23.** A granulação do Sol não é física (45 Mm contra 1 Mm reais) e muda
55% conforme a placa de vídeo.

**24.** A dose da ejeção de massa (1,4) nunca foi calibrada.

**25.** Mergulhar no Sol é impossível abaixo de 1,44 raios solares — o
corte come a superfície.

**26.** O brilho das estrelas é relativo, não absoluto.

**28.** Dívidas internas de cor a re-dosar.

**38.** Canal `aFocus` dormente por desenho — **não apagar.** É o que
apaga o ponto de uma estrela quando ela ganha corpo (passo E3 da lei).
Se a onda do motor terminar sem fiá-lo, aí sim vira peso morto.

**45.** (Herdada do item 44.) A perna retina das réguas não cobre o
`sky-capture` — a medição do céu interno contra o panorama ESO precisa de
decisão própria de resolução quando esse assunto voltar à mesa.

**90. Upscaling espacial como feature experimental (beta).** (Decisão do
dono em 24/08, em resposta ao levantamento de desempenho. **Fila futura,
prioridade BAIXA — atrás de tudo que está aberto.**) Palavras dele:
*"vamos colocar isso numa fila futura, baixa prioridade nesse momento, mas
definitivamente um ganho interessante para testar como feature
experimental (podemos colocar um flag de beta independente do modo para
ser acionado como um DLSS faz)"*.

**DLSS NÃO EXISTE NO NAVEGADOR, e isso é fato verificado, não pessimismo:**
ele está preso a hardware NVIDIA mais driver nativo, sem qualquer porta
para a web — e a máquina do dono é um **M1**, que nem NVIDIA tem. O
equivalente da Apple (**MetalFX**) é igualmente só nativo. Quem promete
"DLSS no browser" está vendendo outra coisa.

**O CAMINHO VIÁVEL É O FSR 1 da AMD:** shader **aberto (MIT)**, já
portado para three.js por terceiros. Ele é espacial (não usa vetores de
movimento nem histórico), então cabe num passe de pós: **renderizar a
~70–80% da resolução, ampliar com EASU e afiar com RCAS**. Ganho típico
esperado: **30–50% do tempo de GPU devolvido** — e isso importa porque o
app **é GPU-bound**: **36–42 fps** no M1 em `cinema`/`pixelRatio` 2,0 —
medido em **24/08 com `scripts/visual/gpu-profile.mjs`**, janela
1200×900 *(cifra que NÃO reproduz em 03/09 nem no código de 24/08: 33,4
no Atlas e 12,6 no filme, modo cru — item 144)*. (O mesmo instrumento, na vista das galileanas, deu 22,8 fps:
a faixa depende da vista, e quem citar o número tem de citar qual.)

**A RESSALVA, escrita antes de alguém se animar:** a nossa cena é o
**pior caso** para upscaling espacial — céu de estrelas sub-pixel e
linhas finas, que é exatamente o que EASU borra e RCAS depois exagera. A
fita de 1,25 px do item **83** ajuda (linha com corpo reamostra melhor
que fio de teia), mas não isenta. **Por isso o veredito não é a régua: é
FOTO A/B lado a lado mais fps medido, e o olho do dono.** Se o céu
"chapinhar", não entra — nem como beta.

**A FORMA, decidida por ele:** flag de **beta INDEPENDENTE do modo e do
tier**, acionável como se aciona um DLSS. Não é um quarto degrau de
qualidade. A casa do assunto é a dos tiers (`core/engine.ts`, e o `Auto`
que mede e sugere), porque é lá que já mora quem decide resolução — mas a
chave é própria, e nasce desligada.

**215. Roadmap de conteúdo: sondas, créditos, tours, cinturões,
cometas.** Grade solta de features futuras do Atlas (cometas e cinturões
se sobrepõem em parte ao censo do item 114).

**216. Beat "escala real" animado no filme, nunca toggle.** Falta do
repensar do roteiro do filme.

**217. `starOptics` rotulável com interruptor.** A cruz de 4 spikes está
cravada, sem desligar — é honestidade de instrumento, não fotometria;
falta o rótulo e o interruptor.

**218. Consumir `stellarPhysics.ts` no runtime.** `temperatureFromBV` já
chegou à ficha de estrela; raio, luminosidade e os valores pinados do
resto do arquivo seguem sem consumidor.

**219. `teffK` e `convective` nos 14 vendorizados.** Exige editar o
núcleo do Sol; sem 2ª instância de `StellarBody` enquanto `SUN_RADIUS =
2.2` e `cme.js` capturarem a câmera na criação.

**220. Onda 9 — arquivar o doador.** `atlas-orbital` vira read-only
quando cada linha da matriz de migração tiver destino cumprido ou virar
pendência nomeada (evidência por linha: estava viva no doador? o destino
tem o equivalente? o número foi medido ou estimado? o que atravessou foi
dado/oráculo ou runtime?).

**221. Candidato sem onda: pisar num rochoso.** Céu e câmera são
baratos; o custo inteiro é o terreno (MOLA). Sem gate esperando.

**222. Encontros estelares como beats do filme** (sub-passo 7b) —
decisão do dono pendente; default: sem decisão, 7b não entra.

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
