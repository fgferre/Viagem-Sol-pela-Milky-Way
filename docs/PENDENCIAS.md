# Pendências — o que está quebrado e o que falta

**Este é o primeiro arquivo a ler.** Lista viva do que está aberto, no jeito
que o dono vê. O detalhe técnico mora nos commits, no `NORTE.md` e na
`LEI-DA-ESTRELA.md`.

**A REGRA DE LEITURA — são DOIS arquivos, e não se leem do mesmo jeito
(25/08, item 98).**

- **Este arquivo é o VIVO.** Só mora aqui o que ainda exige obra ou uma
  decisão dele. **Na janela de quem coordena, lê-se o BASTÃO, a fila que
  vale, e o item da vez** — o resto se mira com `grep`/trecho (item
  **106**, 28/08). O "inteiro" de 25/08 era o contraste com o MUSEU, não
  a ordem de despejar ~1.800 linhas em toda retomada.
- **[`PENDENCIAS-ARQUIVO.md`](PENDENCIAS-ARQUIVO.md) é o MUSEU:** a história
  completa e verbatim dos itens fechados, com o número intacto.
  **Consulta pontual por número (`grep -n '^\*\*61\.' docs/PENDENCIAS-ARQUIVO.md`),
  NUNCA leitura completa por agente.** Ninguém precisa do museu para
  trabalhar — ele existe para quando alguém perguntar *por que* uma coisa
  é como é.

**DECISÃO SEM NÚMERO MORRE — regra do dono, 25/08.** Toda decisão que exige
obra vira **item numerado AQUI, no mesmo commit em que é decidida**. Memória
de coordenador, relatório e conversa são PONTEIRO, nunca casa de trabalho.
A história de uma linha que instituiu a regra: a reforma da documentação foi
decidida em **14/08**, nunca ganhou número, e ficou **11 dias perdida**
debaixo de 318 commits — ver o item **98**.

**Como esta lista funciona:**

- O dono reportou um problema? Escreva aqui **naquele momento**, com as
  palavras dele.
- Item resolvido **sai da lista**: vira commit, deixa UMA linha aqui e a
  história vai para o ARQUIVO com o número intacto. Isto é o que está
  aberto, não um diário.
- A ordem é por **o quanto incomoda quem usa**, não por dificuldade.
- **O número é IDENTIDADE, não posição.** Item novo entra no fim da sua
  seção, com o próximo número livre. Números aposentados não se reaproveitam.
- **Próximo número livre: 144.** Quem abrir um item usa este e soma um aqui,
  no mesmo commit — é esta linha que os agentes leem, não a contagem à mão.
  *(O **107** saiu em 28/08: a varredura de fecho, no `AGENTS.md`. Em
  31/08 esta linha foi pega TRÊS vezes atrás da verdade — o 114, o 115 e
  o 122 nasceram sem somá-la; quem abrir item confere o maior número vivo
  antes de confiar nela. Os 123 e 124 nasceram na faxina da estação do
  115, conferindo primeiro. Em 01/09 ela ficou de novo atrás — o 129 nasceu
  com ela ainda em 126; re-somada.)*

A primeira mensagem de uma conversa nova pode ser: *"Leia docs/PENDENCIAS.md e siga."*

---

## O BASTÃO — onde a rodada parou (02/09, noite)

**02/09 (noite — a ONDA DE SATURNO FECHOU).** O item **134** está
completo: S1–S5 feitas, S3c fechada pela palavra dele (a luz assistida
fica como está), **135** (anel cortado "como se batesse na lente") e
**136** (órbitas "muito próximas", verificadas contra a JPL) fechados no
caminho. A lista do §19 foi aprovada e rodou: unidades 287/287, suíte
inteira 1× (30 falhas → 28 guardas atualizadas + 2 defeitos consertados),
z-fighting OK, ab-identidade 48 IGUAL + 6 INSTÁVEL conhecidas + 0 DIFERE.
Sobra numerada: **137** (assets `ring*` órfãos). **Próxima frente: 130
(app bilíngue pt-BR/EN)** — começar pelo censo por olho do que é texto de
tela. Backup em dia; site intocado (publicar só com pedido dele).

**Sobra SEM obra (03/09):** a dose do miolo dos jatos de Encélado
(`DOSE_BASE = 0.055` em `world/corpos/plumas.ts`) é o número do projeto
Saturn DELE, trazido como está. Ele viu a foto de contraluz
(`item134-s4-encelado-contraluz.png`) e não pediu mudança: **fica como
está, sem teste, declarado** — número de gosto, não de física medida
nesta casa; não vira item nem entra na lista do §19.

---

## ALTA — o dono vê e incomoda

**115.** A colheita da mineração do Eyes — **FECHADO em 02/09**; ARQUIVO.
*(Blocos A e B cumpridos em 31/08: memória de texturas 1.083 → 70 MiB
residentes com descarga de 15 s, decodificação fora da thread e
cancelamento de pedidos; rampas, oclusores e fita; MSAA reprovado por
medida. O que espera o olho dele mora nos itens 52, 82, 108, 22 e 12;
o 114 leva os blocos D/E.)*

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

**91.** Saturno estava quase escuro mesmo com brilho assistido, e o modo
real ficou escuro demais — **FECHADO em 26/08**, conferido por ele na Sala
de Conferência (**C15**: a chapa do modo real, com a **R1** que ele escolheu
na **Q14** embarcada e os +3 passos declarados no selo); história no
ARQUIVO.

**93.** O brilho assistido = mesmo algoritmo do NASA Eyes — **FECHADO em 26/08**; ARQUIVO.

**5.** O Sol do Atlas estava congelado no máximo solar — **FECHADO em 25/08**; ARQUIVO.

**7.** Trocar de qualidade recarregava a página e o reload morria — **FECHADO em 25/08**; ARQUIVO.

**39.** Focar uma estrela apagava as outras — **FECHADO em 29/08**; ARQUIVO.

**40.** Dois Sóis com rótulo ao mesmo tempo — **FECHADO em 29/08**; ARQUIVO.

**43.** Planetas de longe pareciam estrelas — **FECHADO em 29/08**; ARQUIVO.

**52. A conferência do dono no app com o padrão novo da luz.**
A queixa que abriu a rodada da luz era do app com o desenho velho; o
pacote inteiro (compressão na emissão, ombro no bloom, filtro solar
declarado, repartição + clarão de asas) espera a conferência DELE no
app. O pouso de 17/08 aceitou a SOLTURA da estrela — este item é o
pacote da luz por inteiro. *(Veio do bloco da onda da luz, enxuto pelo
item 51.)*

**53.** O expoente da asa (β) esperava o gate de foto do dono — **FECHADO em 31/08**; ARQUIVO.

**54.** O filme esperava a exibição do dono — **FECHADO em 31/08**; ARQUIVO.

**69.** A dose das forjas (berçários) vista de longe — **FECHADA em 25/08**; ARQUIVO.

**82.** Os nomes na tela estavam intrusivos — **FECHADO em 02/09**;
ARQUIVO. *(N1/N2 conferidos por ele em 25/08; N3 (oclusão atrás do
globo) e a vaga gasta com nome que o HUD come vieram pela onda 125 (F4
encobrimento com rampa, viewport inteiro; F5 detalhe só no focado —
`09f16e8`, `1a2708f`). Palavra dele: "trouxemos todas as técnicas de
dinamismo dos nomes do NASA Eyes".)*

**99.** A dieta dos juízes — **FECHADO em 30/08**; ARQUIVO.

**113.** Os minutos dos juízes — **FECHADO em 30/08**; ARQUIVO.

## MÉDIA — afeta o produto, não salta aos olhos

**134.** A ONDA DE SATURNO — a colheita do projeto Saturn dele (anéis com perfil medido e iluminação mútua; relevo das luas; nove luas esculpidas com o grão dele; jatos de Encélado; anéis E e F, raios do B, ondas de Dáfnis) — **FECHADA em 02/09**: cinco fases feitas, S3c pela palavra dele ("melhorou bastante... deixe do jeito que ficou"), lista do §19 aprovada e rodada (suíte 1×, z-fighting, ab-identidade); ARQUIVO.

**140.** A Lua "não ficou boa depois que levamos o relevo para ela" — **FECHADO em 03/09** (`d5991a9`: relevo real do LRO só na luz; o "lento" não era o relevo, medido); palavra dele "tudo ok, já avaliei"; ARQUIVO.

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

**141.** Relevo real (só na luz) nos candidatos — **FECHADO em 03/09**: Mercúrio e Marte (`f4f6db0`), Ceres e Vesta (`a6a6cc4`), Ceres com o mosaico real da Dawn e Vesta girada para a IAU (`5135978`), Europa e Io fora do relevo inventado (`804825e`); gerador único `gera-normal-de-dem.mjs`; testes aprovados rodados (`a5d35b5`); sobra sem ordem dele: Fobos/Deimos por forma real; ARQUIVO.

**143. O juiz de identidade marcou "INSTÁVEL com diff 0" em vistas que DIFEREM de fato.** Achado do coordenador, 03/09, ao fechar o 141: a rodada 625c86a→5135978 do `ab-identidade` deu 48 IGUAL + 6 INSTÁVEL (mercurio, mercurionb, vesta, anao-vesta-corpo, atlas-corpo-marte, foco-io) "com 0 pixel de diferença" — mas essas vistas contêm corpos que o 141 mudou de propósito, e a mesma vista `atlas-corpo-marte` fotografada por mim nas duas árvores (5222/5223, `capturas/item141-chk-marte-{antes-,}q700.png`) dá md5 diferente e **351 de 3.249 blocos tocados** (`diff-pixel`). Suspeita: o lado "antes" recapturado por vista isolada (ou a retomada de disco) pegou o servidor errado — em INSTÁVEL o "antes" traz dois hashes e um deles é o do "depois". A verificar no instrumento antes da próxima rodada; até lá, INSTÁVEL não vale como IGUAL: confere-se com foto nas duas árvores.

**No mesmo item, sem obra (auditoria 03/09):** as mensagens de commit do 139b (`e24237f`, `c3b89a1`) dizem que o `nearPlanePc` sem o registro do anel dava **192,9 km** (192,858, medido no app), e o teste `corpos.test.ts` cobra **198,9 km** no mesmo caso ("APAGADO o registro do anel"). Os dois números são de palcos diferentes — o do app e o sintético do teste — e nenhum dos dois está errado; fica registrado para que a próxima leitura não trate a diferença como regressão. Nada a consertar.

**138.** Jápeto "totalmente feio" e a paridade das luas contra o projeto dele — **FECHADO em 03/09** (`c70a204`: mosaicos Schenk graduados como lá; o relevo estava meia volta errado nas seis desde a S2); nível e Titã laranja ficam como estão, palavra dele "tudo ok, já avaliei"; ARQUIVO.

**139.** Dentro dos anéis não se viam as partículas e pedras de gelo — **FECHADO em 03/09** (`4081729` lajota do projeto dele + `e24237f` o chão do anel chega à lente); palavra dele "tudo ok"; ARQUIVO.

**137.** Sobra da S1 do 134: os arquivos `public/textures/atlas/saturn/ring*` (8 arquivos, 216 KB) e o canal `ring` em `texturas.ts`, no manifesto e nos scripts de texturas ficaram órfãos — o anel lê o perfil medido. Remover com prova de não-uso (§6); os testes de `texturas.test.ts` que citam o canal entram na lista do §19 dessa faxina.


**135.** Perto de Saturno ou dos anéis a imagem cortava "como se batesse na lente" — **FECHADO em 02/09** (o piso do plano próximo era metade do raio do corpo, 30 mil km em Saturno; virou um milésimo, `PISO_DO_NEAR_EM_RAIOS`); ARQUIVO.

**136.** As órbitas das luas novas de Saturno pareciam erradas, "todas muito próximas" — **FECHADO em 02/09 por verificação**: os nove raios batem com a NASA/JPL (`capturas/item136-orbitas-vs-nasa.txt`); sete delas orbitam de fato entre 133 e 152 mil km, na borda do anel; ARQUIVO.

**133.** Os anéis de Saturno ficavam estranhos do lado de sombra —
**FECHADO em 02/09** na S1 do item 134 (a física estava certa; faltava o
planetshine — o globo iluminando os próprios anéis); ARQUIVO.

**97.** A órbita acendia mais cedo no Retina — **FECHADO em 29/08**; ARQUIVO.

**12.** Nenhuma foto de referência mora entre 1 UA e 40 UA — onde a tela
lava. A régua de luz e as vistas `ua2`…`ua2000` já enxergam a faixa.

**13.** Sagittarius A✱ ainda é 125.884× maior que o real. Segundo
mentiroso de escala. Cadastro em `escala.ts`.

**15.** Sem como aliviar o Sol quando o quadro engasgava — **FECHADO em 02/09**; ARQUIVO.

**17.** O Sol solavancava quando o relógio acelerava — **FECHADO em 02/09**; ARQUIVO.

**18.** A luz tratava o Sol como ponto sem tamanho — **FECHADO em 02/09
por verificação**: desde `4b1e9fc` (2026-08-25) os globos recebem o raio angular
real do Sol (`uSolAngRad`) e o terminador é suave (obra do 93); ARQUIVO.

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

**34.** A tela de carregamento desenhava outra Via Láctea, espelhada — **FECHADO em 31/08**; ARQUIVO.

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

**37.** As nuvens escuras apagavam o que está na frente delas — **FECHADO em 31/08**; ARQUIVO.

**46.** A galáxia profunda não passava pela invariância de resolução — **FECHADO em 31/08**; ARQUIVO.

**59.** Trocar de qualidade não trocava a textura já carregada — **FECHADO em 31/08**; ARQUIVO.

**61.** Rever a UI/UX inteira — **FECHADO em 29/08**; ARQUIVO.

**70.** O ponto que morria seco na borda — **FECHADO em 29/08**; ARQUIVO.

**75.** Motor de filmes por roteiro — **FECHADO em 29/08**; ARQUIVO.

**77.** As linhas de órbita, ligadas por padrão — **FECHADO em 29/08**; ARQUIVO.

**83.** Órbitas AAA — a fita e o foco — **FECHADO em 29/08**; ARQUIVO.

**87.** O véu da abertura não cabia no telefone — **FECHADO em 27/08**; ARQUIVO.

**89.** Desligar os nomes deixava o céu inclicável — **FECHADO em 29/08**; ARQUIVO.

**92.** Descer ao corpo de um anão não o mostrava — **FECHADO em 25/08**; ARQUIVO.

**100.** O HUD de fotografia — **FECHADO em 29/08**; ARQUIVO.

**108.** O fim do filme com a Lua e a Terra — **FECHADO em 31/08** (obra) e
**encerrado por ele em 02/09**; ARQUIVO.

**109.** Os rótulos 3D do outro projeto — **FECHADO em 02/09**; ARQUIVO.
*(A beta ficou honesta e sem engolimento (`b375751`, `4f13f00`,
`b394141`), a doutrina é "2D e 3D coexistem como preferência", e a régua
dinâmica que faltava veio pela onda 125: o `Rotulos3d` lê a mesma lista
`alvos` que o 2D, dono das leis.)*

**116.** (Suspeita a medir, achada em 31/08 fechando o item 84.)
`?foco=tritao` devolve o disco de Tritão **inteiramente escuro**, com e
sem `?d=`, no jd pinado do gate (2460409.26) — silhueta preta sobre a
Via Láctea. Pode ser geometria honesta (a noite virada para a câmera
naquele instante) ou defeito do degrau `lua` de Netuno (enquadramento
ou luz). Antes de tocar qualquer linha: par de capturas em dois jd
diferentes e a conta do terminador (onde o Sol está em relação à
câmera). A vista foi DESCARTADA do gate do 84 por isso; se for
geometria honesta, vira candidata de novo com outro jd.

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

**117.** Aro azulado fino na borda dos globos em close-up — **FECHADO em 02/09**; ARQUIVO.

**126.** `?foco=mars` caía na estrela Marsic, não em Marte — **FECHADO em 01/09**; ARQUIVO.
---

## BAIXA — dívida interna, ninguém vê

**130. O app inteiro bilíngue — português e inglês (futuro, direção
dele em 01/09).** Palavras dele, ao pedir as tabelas bilíngues da busca:
*"depois temos que transformar nosso app todo em bilingue"*. Medido em
01/09 (contagem grosseira por script, não por olho): ~460 trechos de
texto em português no código fora de testes (o grosso em
`cadastroDeRepresentacoes.ts`, `selo.ts`, `escala.ts`, `ficha.ts`, HUD e
paleta — parte é texto interno de auditoria, não de tela), ~280 textos
nas fichas dos corpos (`public/data/atlas/corpos.json`) e as legendas
do filme. O mecanismo é pequeno (dicionário + língua na URL/navegador,
sem biblioteca); o volume é a tradução. Ordem sugerida quando vier:
(1) a chave de língua e o HUD/botões/dicas; (2) as fichas dos corpos;
(3) as legendas do filme; (4) o resto. **Censo por olho FEITO (03/09,
mecanico): ~780 trechos de TELA** — HUD/botões/dicas ~106, selo+escala
~65, unidades ~10, rótulos/famílias (atlasConfig) ~75, rótulos das fichas
no código ~35, prosa das fichas em `corpos.json` ~439 (54 corpos; o "~280"
de 01/09 estava subcontado), legendas do filme 48 (7 roteiros), outros 2.
O "~460" de 01/09 misturava texto interno (cadastroDeRepresentacoes ~135,
escala ~40, que nunca chegam à tela). Já bilíngue: `name` {pt,en} dos 54
corpos; apelidos/constelações/lugares da busca (só para casar o termo).
Templates que mudam de regra em inglês: unidades (plural, decimal, kg),
selo/escala ("${nome} está ${fator}× maior"), data por extenso do tempo,
contadores "X de Y". F1 (chave de idioma + HUD/painéis/selo/unidades/
rótulos) delegada em 03/09. **NA FILA
por ordem dele (01/09, "app inteiro bilingue na fila"): é a próxima
frente depois de fechar o 129.** A busca (129/F5) já nasce bilíngue.

**F1 FEITA (03/09) — o mecanismo e a tela do CÓDIGO.** Mecanismo sem
biblioteca: `lib/idioma.ts` (estado, assinantes, `t(chave, params)`) com
as tabelas em `lib/idioma/pt.ts` e `lib/idioma/en.ts` — a `en` é tipada
contra a `pt`, então chave sem tradução não compila. A língua se resolve
UMA vez, no `main.tsx`, e a escada tem DOIS degraus: preferência do
visitante (localStorage `viagem-idioma`) > INGLÊS (padrão, ordem dele em
03/09; o `navigator` saiu da escada). Fora do navegador ninguém chama e a
casa fica em pt-BR, com a saída de toda função de texto igual à de
sempre. Seletor NO PAINEL DE AJUSTES (primeira seção), troca ao vivo sem
recarregar; `?lang=` existe SÓ como instrumento de captura, e é por ela
que os juízes de imagem pedem português (`comLinguaDoJuizNaUrl`, em
`scripts/visual/chrome.mjs`). **355 trechos** traduzidos (contagem =
chaves das tabelas). **Fora da F1, por decisão:** os NOMES PRÓPRIOS dos
corpos (F2); a prosa das fichas (F2); as legendas do filme (F3); os
rótulos das ~50 portas de DEPURAÇÃO da URL no selo (só aparecem para quem
digitou a porta); a `meta description` do `index.html` (o `<title>` já
troca).

**F2 FEITA (03/09) — as FICHAS DOS CORPOS e os NOMES.** O inglês da prosa
NÃO precisou ser traduzido: ele é o ORIGINAL do dono, escrito por ele no
projeto doador, e vive em `fonte/corpos-fonte.json` (`editorial.en`) desde
sempre — o pt-BR é que nasceu dele. O gerador media uma língua contra a
outra e JOGAVA O INGLÊS FORA ("no artefato seriam 268 campos que tela
nenhuma lê"); agora ele atravessa. Formato: `editorial: { pt, en }`, dois
blocos irmãos (o molde da própria fonte), e não `{pt,en}` campo a campo —
o gerador já cobrava campo a campo a simetria das duas, então o par de
blocos não perde garantia nenhuma e o diff fica só de adição.
**439 trechos** em inglês em 48 corpos (description 48, curiosity 48, facts
156, records 92, exploração 47, info 48), medidos iguais aos 439 do pt;
`corpos.json` 78 → 136 KB. `ficha.ts` escolhe em UM lugar
(`editorialDoIdioma`, com o pt de PISO quando faltar `en`) e as duas seções
de prosa seguem sem saber que existe língua. Os NOMES: `NOMES_DOS_CORPOS`
ganhou `nomeEn` (espelho do `name.en` do JSON, grafia da IAU — Iapetus,
Enceladus, Tethys, Charon), `nomeDoCorpo`/`nomeNaLingua` resolvem na língua
viva, e quem lê é o rótulo 3D (por quadro, então troca ao vivo), o foco do
HUD, a lista da busca e a ficha; o `nome` pt-BR continua sendo a CHAVE
(índice da busca, `?foco=`), a mesma divisão que a `classe` já tinha.
**Mudança de juiz declarada:** `verify-assets.mjs` PROIBIA `editorial.en`
no artefato — a guarda virou o cadeado inverso (cada campo inglês conferido
byte a byte contra a fonte); 572 campos conferidos, 0 divergentes.
**Defeito da F1 consertado de passagem:** `npm run data:corpos` estava
QUEBRADO desde ela — `src/lib/idioma.ts` tem um irmão `src/lib/idioma/`, e o
gancho de resolução do gerador só tratava `ERR_MODULE_NOT_FOUND`, não
`ERR_UNSUPPORTED_DIR_IMPORT`. **Fora da F2, por decisão:** as CONFISSÕES da
imagem e do relevo ("o defeito", "o relevo admite", fonte/licença/atribuição,
a forma) NÃO são texto de código — vêm do manifesto `texturas.json`, que as
lê de `docs/reference/ASSETS.md`; ficam em pt e são a F4, junto com os nomes
de `lugaresDoFilme`, as legendas do filme (F3) e o `<title>` das portas de
depuração. O `chaveDeLink` segue gravando o nome pt-BR normalizado na URL de
propósito, para que um link escrito em inglês e um em português abram a
mesma vista — `chaveDoFoco` aceita as duas grafias. **Pinos de teste:**
nenhum reprova — a suíte roda em pt-BR (ninguém chama `iniciarIdioma`), e em
pt-BR toda saída é byte a byte a de antes; o que envelheceu foi COMENTÁRIO:
`ficha.test.ts` diz "O INGLÊS, QUE NÃO ESTÁ NO ARTEFATO" e lê o `en` da
fonte (podia ler do artefato agora), e `atlasConfig.test.ts` confere o
espelho só do `name.pt` — o `nomeEn` das 48 entradas ainda NÃO tem guarda
contra o `name.en` do JSON. Os dois entram na lista do §19.

**F3 FEITA (03/09) — as LEGENDAS DO FILME e o encerramento.** Os roteiros
NASCEM À MÃO (`src/three/cinematic/roteiros/*.json`, sem gerador e sem
fonte externa — o filme é obra da casa, item 75), e o inglês NÃO existia
em lugar nenhum: as 24 legendas (48 trechos: `texto` + `subtexto`) foram
TRADUZIDAS. Molde: o português fica onde está e ganha um irmão `en:
{texto, subtexto}` DENTRO da mesma legenda. O pt continua sendo a CHAVE
— é por ele que `REVEAL_T` acha o beat do estilingue, que
`auditarRoteiro` nomeia a legenda e que os juízes a procuram —, então o
diff é só de adição e a saída em pt-BR é byte a byte a de antes (o par
`{pt, en}` com o pt aninhado quebraria `lerSequencia.test` e
`lerPlanoDeCamera.test` no TYPECHECK, que é o único gate que a F3 podia
rodar). Por roteiro: abertura 3, cinturão 3, mergulho 6, Órion 3,
revelação 6, volta 3. O RITMO NÃO PASSA PELO TEXTO: entrada, janela e
passe pelo corte (`em`/`duracao`/`ponte`) são segundos do roteiro,
iguais nas duas línguas — trocar de idioma no meio do filme troca a
frase e não move um quadro. Quem escolhe é `legendaNaLingua` no
`journey.ts`, consultada A CADA quadro pelo `captionAt` e pelas marcas
da barra; o Director passou a comparar o TEXTO no ar (e não só o índice
da legenda), então a troca aparece no quadro seguinte, e `useDirector`
reassina as marcas quando a língua muda (o título delas só vive no
`aria-valuetext`). Legenda sem `en` cai para o português: piso
declarado. **Encerramento:** o inglês do Sagan é o ORIGINAL (o pt é que
é tradução) — `encerramento.json` ganhou `en.linhas` com as quatro
linhas, `linhasDoEncerramento()` escolhe ao vivo e os atrasos continuam
saindo da lista em português (as duas têm 4 linhas; se divergirem, o
ritmo do fim muda). **Fora dos roteiros nada sobrou:** título, portas,
"pular", capítulos, tela final e rodapé já eram da F1;
`lugaresDoFilme.ts` já é bilíngue. **Riscos declarados:** (1) a legenda
mais comprida em inglês tem 90 caracteres contra 82 em pt (+10% na
maior, +7% na soma) e o `filme-smoke` — que mede se a legenda cabe nas
margens — só fotografa em pt-BR; medir com `?lang=en` é da F4. (2) O
inglês da casa está dividido: a `en.ts` da F1 é britânica (`colour`,
`centre`) e a fonte do DONO é americana (`color`, `center`); as legendas
seguiram a `en.ts`, e unificar é decisão dele. **Pinos de teste:**
nenhum reprova (a suíte roda em pt-BR e o pt não mudou); entram na lista
do §19 — legenda em inglês pelo idioma vivo com o mesmo `t0`/`t1`, a
troca de língua no meio do filme reemitindo a legenda, o `en` malformado
recusado por `lerSequencia`, as duas listas do encerramento com o mesmo
tamanho e o `filme-smoke` com `?lang=en`. Fica para a F4 o que a F2 já
listou (confissões do manifesto/ASSETS, portas de depuração).

- **F4 — FEITA em 03/09** (o operário caiu duas vezes por sobrecarga do
  servidor; o coordenador fechou o resto à mão): as confissões da ficha
  que vêm do manifesto de texturas (fonte, atribuição, licença, "o
  defeito", "o relevo admite", "a forma") viraram `{pt, en}` no
  `texturas.json` (792 campos `en`, gerados de `texturas-em-ingles.mjs`
  ao lado do gera-manifest; leitor com pt de piso; `verify-assets` confere
  os dois); `<title>`, `<meta description>` e o `lang` do `<html>` seguem
  a língua viva a partir do `main.tsx`; inglês unificado para AMERICANO
  (decisão dele: "americano tá bom") nas tabelas e nos roteiros; os dois
  erros de carga que o visitante pode ver entraram na tabela. Varredura:
  fora das tabelas só sobraram comentários, mensagens de console e a
  mensagem interna do canvas de cartografia. Portas de depuração do selo
  não vazam para a tela normal. **Palavras dele depois da F4 (03/09):**
  *"o título não foi traduzido na página inicial. queria que o inglês
  fosse a língua padrão."* → o PADRÃO virou inglês (storage > en; a
  língua do navegador saiu da escada); os juízes de imagem pedem
  `lang=pt-BR` pela porta de instrumento (chrome.mjs) para as referências
  pinadas seguirem em português; o inglês se julga de propósito (item 14
  da lista). O título da página inicial: conferido pelo coordenador em
  inglês depois da mudança (ver commit).
- **LISTA DO §19 do 130 (consolidada, para o sim dele):** (1)
  `idioma.escolha` — storage > navegador > pt-BR, e pt-BR fora do
  navegador; (2) `idioma.tabelas` — pt e en com as mesmas chaves e os
  mesmos `{param}`; (3) `idioma.aoVivo` — trocar a língua muda data,
  distância, qualidade e camadas sem recarregar; (4) `unidades.plural` —
  "1,5 ano-luz" × "1.5 light-years"; (5) `idioma.semSobra` — nenhum
  literal acentuado de tela fora das tabelas; (6) `selo.portaLang` —
  `?lang=` não é porta não declarada; (7) `atlasConfig.nomeEn` espelha
  `name.en`; (8) `ficha.prosa` — mesmas linhas em pt e en nos 48 corpos,
  e corpo sem `en` cai no pt; (9) `rotulo/busca` seguem o idioma vivo;
  (10) `chaveDoFoco` aceita as duas grafias; (11) `verify-assets`
  reprova `en` adulterado (fichas e manifesto); (12) `lerSequencia` recusa
  bloco `en` malformado e `journey` devolve o inglês com o mesmo t0/t1,
  caindo para pt sem `en`; (13) `director` reemite a legenda ao trocar de
  língua; (14) `filme-smoke` com `?lang=en` (legendas cabem nas margens);
  e a suíte inteira 1×.

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

**129.** Modos não são universos; a busca é uma só — **FECHADO em 01/09**; ARQUIVO.

**119.** O atlas-smoke prova 3 reprovava em t=250 (Terra velha) — **FECHADO em 02/09**; ARQUIVO.

**125.** A onda da paridade — linhas, rótulos e ícones do Eyes — **FECHADA em 01/09**; ARQUIVO.

**120.** A histerese da régua de relevância nunca valia — **FECHADO em 31/08**; ARQUIVO.

**121.** O juiz da beira da fita não media a perna dpr 1 — **FECHADO em 31/08**; ARQUIVO.

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

**95.** Num eclipse o chão escurecia e o AR não — **FECHADO em 25/08**; ARQUIVO.

**96.** "O Sol está na origem" era combinado, não verificado — **FECHADO em 29/08**; ARQUIVO.

**94.** O segundo cobertor compunha um quadro que ninguém lia — **FECHADO em 29/08**; ARQUIVO.

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

**27.** Faltavam fixtures Horizons de posição de 4 planetas — **FECHADO em 02/09**; ARQUIVO.

**28.** Dívidas internas de cor a re-dosar.

**38.** Canal `aFocus` dormente por desenho — **não apagar.** É o que
apaga o ponto de uma estrela quando ela ganha corpo (passo E3 da lei).
Se a onda do motor terminar sem fiá-lo, aí sim vira peso morto.

**45.** (Herdada do item 44.) A perna retina das réguas não cobre o
`sky-capture` — a medição do céu interno contra o panorama ESO precisa de
decisão própria de resolução quando esse assunto voltar à mesa.

**49.** Vistas da Terra cintilavam entre capturas (ruído de instrumento) — **FECHADO em 02/09 por prescrição**: não reproduz (`terralua` 2× em duas sessões, 0 px de 3,08 M); registro `capturas/varredura-ruidos-02-09.txt`; ARQUIVO.

**64.** Um filho do `ab-identidade` não saía (ruído de instrumento) — **FECHADO em 02/09 por prescrição**: não reproduz (`SMOKE=1 JOBS=3` antes e depois, pai sai em <1 s, 0 filho vivo); registro `capturas/varredura-ruidos-02-09.txt`; ARQUIVO.

**78.** O `ab-identidade` travava depois de terminar (ruído de instrumento) — **FECHADO em 02/09 por prescrição**: não reproduz (mesma leva, veredito e prompt no mesmo segundo, 0 Chrome órfão); registro `capturas/varredura-ruidos-02-09.txt`; ARQUIVO.

**79.** As duas telas de erro esperavam o olho dele — **FECHADO em 25/08**; ARQUIVO.

**80.** A vista oficial não repetia a si mesma (ruído de instrumento) — **FECHADO em 02/09 por prescrição**: não reproduz (`lua` 2× em duas sessões, 0 px); registro `capturas/varredura-ruidos-02-09.txt`; ARQUIVO.

**81.** O MB1 reprovava em cinco famílias — culpa do juiz — **FECHADO em 25/08**; ARQUIVO.

**84.** O gate de identidade cobria o Atlas com 1 vista só — **FECHADO em 31/08**; ARQUIVO.

**85.** O atlas-smoke reprovava o toque duplo sem defeito — **FECHADO em 31/08**; ARQUIVO.

**86.** O céu do Atlas parecia apagado pela lente — **FECHADO em 29/08**; ARQUIVO.

**88.** Ao enquadrar qualquer lua aparecia o eixo da nossa Lua — **FECHADO em 25/08**; ARQUIVO.

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
1200×900. (O mesmo instrumento, na vista das galileanas, deu 22,8 fps:
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

**98.** A reforma do caderno — o vivo e o museu — **FECHADO em 02/09**;
ARQUIVO. *(Executada em 25/08; o resto do plano — baseline versionada e
dossiê — era processo, não produto, e morreu pela palavra dele: "é até
uma ironia isso estar dentro do caderno ainda".)*

**101.** O anel de Saturno tremia entre capturas (ruído de instrumento) — **FECHADO em 02/09 por prescrição**: não reproduz (`saturno-anel` 4 capturas e `foco-titan` 2, 0 px); registro `capturas/varredura-ruidos-02-09.txt`; ARQUIVO.

**123.** As forjas estelares perdiam brilho ao dobrar a resolução — **FECHADO em 02/09**; ARQUIVO.

**124.** O porteiro do censo reprovava por uma palavra — **FECHADO em 31/08**; ARQUIVO.

---

## O que o dono ainda vai contar

Em 2026-08-13 ele disse: *"muitas coisas estou vendo quebradas no visual
do app nesse momento"* — e essa lista nunca foi escrita. Quando ele
contar, o item entra aqui, com as palavras dele.

Primeira entrega, 2026-08-16: a sequência do afastamento com 10 fotos —
virou o **item 44**. A caixa segue aberta para o resto da lista.
