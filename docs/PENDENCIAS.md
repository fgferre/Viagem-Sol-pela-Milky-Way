# Pendências — o que está quebrado e o que falta

Lista viva do que está aberto, nas palavras do dono. Leia só a seção O BASTÃO e o item da vez; o resto, por `grep`.
Item resolvido sai da lista e vira commit; a história de cada número fica no git (`git log --all --grep="(NNN)"`).
Número é identidade, não posição: item novo entra no fim da sua seção. **Próximo número livre: 234.**

## O BASTÃO — onde a rodada parou (22/11, noite) — O QUE ESTÁ PRONTO ESTÁ NO AR; FAXINA FEITA

**No ar:** `origin/main` = `49df9c52` (22/11). O `main` local está à frente só por commits de arrumação (planos, trava).
A cópia vai por `git push origin main:backup`; push no `main` publica o site e só sai com a palavra dele.

**Como trabalhar (palavra dele, 22/11):** conferência proporcional à mudança. Mudança pequena = os testes do que foi
tocado e uma foto. Juiz, só o que olha exatamente aquilo. Fila inteira de juízes e revisor só antes de publicar um lote
grande, ou a pedido dele. Ele ficou bravo com uma rodada inteira gasta conferindo ferramenta: *"a gente não pode rodar
o escopo inteiro de testes o tempo todo"*.

**O que está aberto:** `PLAN.md`, um só, na raiz. A rodada 4 da auditoria foi parada por ele; as mudanças de ferramenta
dela ficaram no ramo `r4-revisao`, fora do principal. O próximo corpo da fila é Tritão (ramo `tritao`, *"Sim, na fila"*).

**Nunca visto nas últimas rodadas:** iPhone, Safari, Firefox, Android e os níveis baixos de qualidade.

**Arrumação de 22/11:** uma pasta só (este clone), sem cópias de trabalho. Ramos que valem: `main`, `backup`,
`r4-revisao`, `tritao`. `capturas/` guarda só relatórios, medidas e as páginas de decisão (fotos e vídeos de rodadas
encerradas saíram a pedido dele). Provas, `.cache` e estudos da máquina antiga não vieram: perguntar a ele antes de
concluir que algo se perdeu. A memória do assistente fica no PC, fora deste repositório.

## ALTA — o dono vê e incomoda

**151. Ilustrações por IA para os seis corpos sem foto de superfície**
(pedido dele, 03/09: *"fale os fatos conhecidos se não houver nenhuma
textura para fornecer, explique qual o objeto e suas características para
que o modelo crie o asset"*).
- **Aberto:** o ramo `superficie: 'procedural'` de `rochoso.ts` (dois
  shaders e o interruptor) ficou sem consumidor; remover na próxima passada
  em `rochoso.ts`, com o ajuste de `rochoso.test.ts` na lista do §19.

**150. Hígia entra na esfera com um GRÁFICO como textura** (censo de
03/09).
- **Aberto:** a forma irregular do DAMIT (CC BY, já anotada no ASSETS)
  segue pendente, com o pipeline de malha.

**148. As luas de Urano e Tritão com o hemisfério nunca visto
reconstruído** (decisão dele, 03/09: *"eu quero"*; *"não quero montagem,
use a que gerei"*; *"faça o uso do computador e acesse meu ChatGPT"*).
- **Aberto:** espera a palavra dele sobre o visual dos mapas gerados por IA.

**147. "Precisamos revisar as luas de Urano... algo estranho está
acontecendo."** (Palavras dele, 03/09.)
- **Aberto:** espera a palavra dele. As luas saem cinzas e lisas no lado
  nunca fotografado; se quiser relevo/crateras inventadas ali (o que o
  SpaceEngine faz), é obra nova e decisão dele.

**145. "Porque não deixamos isso como um toggle então... se a pessoa
quiser ela desliga isso, mas como eu não tenho hoje o toggle não consigo
nem entender direito em tempo real qual é o impacto em performance e em
qualidade visual."** (Palavras dele, 03/09, sobre o MSAA do item 144.)
- **Aberto:** próximos controles candidatos (população da galáxia,
  grão) e o orçamento de pixels / Auto aplicando na 1ª visita — decisão
  dele.

**144. "O app está um pouco pesado nessa máquina."** (Palavras dele,
03/09, ao trazer o relatório de desempenho de outra IA.)
- **Aberto, esperando a palavra dele:** (2) MSAA só nas fases com linha de
  órbita (o filme não tem); (4) o orçamento de pixels e o menu de gráficos.
  O MSAA da própria cena ainda custa ~26 ms em 1200×900 Retina.

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

**230. Os assets fracos do Sistema Solar vão para a fila de melhoria.**
Palavras dele, 05/10: *"vamos incluir todos, ainda vamos melhorar esse
asset, se houver mais algum asset que precise ser melhorado também vamos
colocar isso no pipeline"*; em 06/10: *"Priorizar Europa e Jápeto"*.
- **Aberto, na fila:** Urano, Netuno, Ariel, Titã, Vênus e Tritão (próximo
  corpo; ele disse *"Sim, na fila"* a *"Você poderia avaliar se Tritão está
  no padrão bom mesmo?"*; ramo `tritao`, ele decide pela prancha).

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
assim, senao deixamos sem o relevo."*
- **Aberto:** Fobos e Deimos (relevo real por FORMA/malha, PDS); Tritão
  (DEM real em ~40 %, decisão dele: meio globo sem dado ou zerar); zerar o
  bump nos 13 sem dado (Ganimedes, Calisto, as cinco de Urano, Palas, Hígia,
  Haumea, Makemake, Éris, Quaoar). NA FILA, sem obra (ordem dele).

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
`?foco=tritao` devolvia o disco de Tritão inteiramente escuro.
- **Aberto:** causa achada (o mapa de Tritão era 80 % preto) e preenchida
  junto com o 147, que espera a palavra dele.

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
faltam, sem perder desempenho.** Palavras dele, 22/09: *"ficou muito bom, não
achou?"* e *"ok então, mas guarde essas melhorias no pipeline (quero fazê-las
sem perder performance)"*.
- **Aberto — dele:** (a) interruptor dos poços (segundo jogo de mapas, ~5 MB);
  (b) grão mais forte só para o Hipérion se de muito perto a pintura incomodar;
  (c) quanto a encosta clareia (0,35) e se as outras "flores" de raios saem.

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
