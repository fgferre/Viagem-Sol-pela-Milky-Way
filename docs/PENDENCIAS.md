# Pendências — o que está quebrado e o que falta

Lista viva do que está aberto, nas palavras do dono. Leia só a seção O BASTÃO e o item da vez; o resto, por `grep`.
Item resolvido sai da lista e vira commit; a história de cada número fica no git (`git log --all --grep="(NNN)"`).
Número é identidade, não posição: item novo entra no fim da sua seção. **Próximo número livre: 229.**

## O BASTÃO — onde a rodada parou (01/10, madrugada)

**30/09–01/10 (rodada dos DEFEITOS VISÍVEIS). Palavras dele: *"quero
resolver e focar nos problemas e defeitos, coordene pra tirar isso da
frente. e veja se estamos consumindo os documentos e não gerando novo lixo
que armazena"*. Tudo no `main`, um commit; backup em `origin/backup`; NÃO
publicado.**

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
- **Aberto — técnico:** E5, E6, E7 da poeira; **227**; os 18 corpos com
  relevo inventado (**144**).

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
Plutão, Caronte, Palas, Hígia, Haumea, Makemake, Éris, Quaoar (18).
- **Relevo real pronto (aplicar como no 141):** Plutão e Caronte — DEM da
  New Horizons (Schenk et al. 2018, USGS Astropedia, 300 m/px, quase global,
  sem o polo sul — a mesma lacuna da cor do 149).
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
