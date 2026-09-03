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

## O BASTÃO — onde a rodada parou (03/09, noite — FECHO por ordem dele)

**03/09 (3ª janela — as luas de Urano).** Item **147** ("algo estranho"
com as luas de Urano) diagnosticado na cena viva e consertado no mesmo
dia: câmera, luz e textura estavam certas; os mapas da NASA 3D é que têm
o hemisfério norte em preto (a Voyager 2 só viu o sul em 1986) e o Sol de
2026 ilumina o norte. Preenchimento declarado na linha de produção
(`preencherVazioSemDado`), seis mapas regerados, ficha confessa; o **116**
(Tritão escuro) tinha a mesma causa e fechou junto. Fotos antes/depois em
`capturas/item147-*`. **LISTA DO §19 desta janela, para ele aprovar ou
cortar:** (a) `lib-texturas.test.mjs` +2 testes (tapa o vazio grande e
deixa a sombra pequena; mapa sem vazio fica intocado) — rodados uma vez
no portão; (b) `data:verify` verde (é portão de dados, não teste);
(c) suíte cheia NÃO rodou. **Esperam a palavra dele:** o visual das seis
(cinza liso onde não há foto) e, se quiser, crateras inventadas ali.

**03/09 (2ª janela, noite — fecho por ordem dele).** Desempenho no M1 dele:
**144** (resolve único do MSAA + nebulosa congelada; regressão da textura
compartilhada em Retina pega e consertada no mesmo dia) e **145** (gaveta
Avançado: MSAA, nebulosa, escala de resolução, ao vivo). Atlas 2560×1500
cinema 5,3 → 12,3 fps; 1200×900 19 → 40. Commits `1bcef79..d092299`,
backup em dia, site intocado. **LISTA DO §19 desta janela, para ele
aprovar ou cortar:** (a) `nebula.test.ts` NOVO (4 testes: 2ª chamada
desenha nada; câmera/uniform/LUT acordam) — rodado uma vez no portão;
(b) pinos repinados em `post.test.ts`, `atlasConfig.test.ts`,
`selo.test.ts`, `engine.test.ts` — rodados no portão dos tocados; (c)
suíte cheia NÃO rodou nesta janela; (d) `npm run lint` vermelho em
`Spotlight.tsx` (react-refresh) vem do 130/F1 — conserto de 5 min, sem
dono. **Sobras:** filme t=100 em dpr 2 anda pouco (12,1) sem causa
atribuída; MSAA da própria cena ainda custa ~26 ms em 1200×900 Retina;
esperam a palavra dele: MSAA fora do filme, orçamento de pixels, Auto
aplicando na 1ª visita. **Lição** (memória + `reguas-nao-bastam`): fps em
dpr 2 sem foto em dpr 2 era cena preta — número só com foto da mesma
configuração; "preexistente" de agente se prova contra o commit ANTERIOR
à obra.

**03/09 (noite — janela encerrada com a varredura de fecho).** Nesta
janela fecharam **134** (onda de Saturno, S3c pela palavra dele), **135**
(anel cortado "como se batesse na lente"), **136** (órbitas verificadas
contra a JPL), **138** (Jápeto e as luas com os mosaicos dele; o relevo
estava meia volta errado desde a S2), **139** (partículas dentro dos
anéis + o chão do anel no plano próximo), **140** (a Lua com o relevo
real do LRO), **141** (relevo real em Mercúrio, Marte, Ceres e Vesta;
Ceres com mosaico real; Vesta girada para a IAU; Europa/Io sem relevo
inventado) e **130** (app bilíngue, inglês como padrão). Testes: todas as
listas do §19 aprovadas por ele e rodadas (suíte 2885 verde no fim).
Auditoria de 7 pontos sobre `925df66..7c07ad8` com um conserto por achado
(`8d7cd1d`); varredura das cinco perguntas sobre `7c07ad8..e911b8e` sem
achado (mecanico, só leitura). **FILA, na ordem dele:** **142** (tiles de
textura do NASA Eyes — obra grande, anunciar custo), **143** (o juiz de
identidade lê INSTÁVEL como igual), **137** (assets `ring*` órfãos),
**132** (re-pinar o juiz do atlas), **114**; Fobos/Deimos por forma real
esperam ordem. Backup em dia; site intocado (publicar só com pedido dele).

---

## ALTA — o dono vê e incomoda

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

**117.** Aro azulado fino na borda dos globos em close-up — **FECHADO em 02/09**; ARQUIVO.

**126.** `?foco=mars` caía na estrela Marsic, não em Marte — **FECHADO em 01/09**; ARQUIVO.
---

## BAIXA — dívida interna, ninguém vê

**130.** O app inteiro bilíngue (pt-BR e inglês) — **FECHADO em 03/09**: mecanismo sem biblioteca com troca ao vivo (`4823247`), fichas dos 48 corpos com o inglês original dele (`842d0e9`), legendas do filme (`fb2cf14`), confissões do manifesto e inglês americano (`ff60734`), **inglês como padrão** e o nome do app na capa (`1d041e5`, `7c07ad8`); 14 testes aprovados rodados (`d4117ba`: 52 novos, suíte 2885 verde, filme em inglês nas margens); auditoria de 7 pontos com um conserto por achado (`8d7cd1d`); ARQUIVO.

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
