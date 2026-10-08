# Câmera mais livre no Atlas e luz de pôr do sol na Terra — pedido de plano (07/10/2026, noite)

Este arquivo é um PEDIDO DE PLANEJAMENTO, deixado pela conversa da rodada "Terra com profundidade". Quem planejar lê tudo, confere no código o que está marcado "a conferir" e escreve a seção **Etapas** no fim. Nada se implementa na rodada do plano. O dono aprova as escolhas de produto por imagem.

## O pedido, nas palavras dele

- Depois da Terra com relevo medido e sombras publicada (main f943a20b): *"eu nao consegui perceber o relevo no atlas... 😞 acho q o angulo da camera e a falta de pan e zoom nao permitem ou o terreno e sombra real nao estao funcionando"*.
- Das opções oferecidas, escolheu **"Câmera mais livre"**: descer até a altura do filme e inclinar para ver o horizonte, como nas fotos da estação espacial, valendo para todos os corpos. E acrescentou: *"havia comentado de criar efeitos de atmosfera e refracao da luz mais realista avermelhados no horizonte contra o sol"*.
- Não escolheu o "atalho para o fim de tarde" nem a "foto de como ver hoje".

## Diagnóstico já feito (07/10)

O relevo e as sombras funcionam. A prova são as fotos do app real em `capturas/terra-nuvens/montanhas/prancha-montanhas.jpg`, com a câmera a 1,45 R, oblíqua e o Sol a 3°. No ar, normal, horizontes e manifesto têm o mesmo sha256 dos locais. O que esconde o relevo é a câmera do Atlas:

- **Piso de zoom de 2 raios** do centro: `K_MIN_RAIOS = 2.0`, em `src/three/cinematic/atlasRig.ts:101`. O comentário acima explica a história do piso do Sol. O piso vale para todos os corpos via `pisoDeZoom` (~886-888), também para o `?d=` (~984-986) e para a roda e o pinça (`zoomDaRoda.ts:213-223`). O pouso padrão é ~2,5 R no computador (`enquadramento.ts:317-318`), só ~0,5 R acima do piso.
- **Sempre mira o centro do corpo:** `camera.lookAt(alvo)` em `atlasRig.ts:1451-1453`. Não há pan nem inclinação. A bússola só endireita o giro (`atlasRig.ts:1230`). Arrastar orbita sem grampo (`atlasRig.ts:996-998`), e o "freio do solo" deixa o arrasto a 1/3 da velocidade perto do piso (~896-906).
- **Abre do lado do Sol**, 30° da direção do Sol rumo ao polo (`enquadramento.ts:52, 386-423`): o terminador fica perto da borda do disco, e o Sol fica alto sobre quase todo o disco.
- **Tempo:** a `BarraDoTempo` (`HudDoAtlas.tsx:649`) só tem andar, parar e degraus de velocidade. Não há como escolher a hora.
- **Plano de corte próximo** dinâmico: `nearPlanePc`, `engine.ts:841-847`, com a fórmula descrita em `atlasRig.ts:67`. O filme já põe a câmera a 1,35 R sem problema (`filmes/solar/atos/casa.ts`, `VOO`).
- **A conferir:** o que acontece com o plano de corte e com a precisão da profundidade quando a câmera olha RENTE à superfície. Também, se as nuvens a 1,0015 R e o chão brigam pela profundidade nesse ângulo; existe um juiz de z-fighting.
- **Lanterna de leitura** (luz da câmera, política `assistida`, que é o padrão): 0,15 em escala de tela, ~2 % do Sol em linear (`luzDaVisita.ts:144, 718-739`). Não é ela que apaga o relevo.
- **Escala real:** o relevo medido é suave, com inclinação média de 0,83° em células de ~5 km. O mapa velho era ~3,6× exagerado. O dono escolheu "altura real" por prancha: não exagerar.

## Frente A — câmera mais livre no Atlas (vale para todos os corpos)

- Descer abaixo de 2 R, pelo menos até a altura do filme (1,35 R). Quanto mais, e com que freio perto do chão, é do plano.
- Inclinar a vista do centro para o horizonte, ao estilo do Google Earth.
- Gestos no celular e no computador:
  - **a conferir** em `src/three/gestos.ts` o que está livre: dois dedos na vertical? botão direito? Shift + arrastar?
  - a bússola e o "Endireitar" precisam seguir coerentes.
- Corpos irregulares (Hipérion, malha deslocada pelo relevo) e Saturno com anéis: a câmera nunca pode entrar no corpo nem atravessar o anel de forma estranha.
- A camada de nomes e o HUD do Atlas devem continuar legíveis com a câmera inclinada.
- **Lição da casa:** técnica nova entra como opção quando substitui um modo; aqui é capacidade nova da câmera, e o que fica a mais é decisão do plano.

## Frente B — a luz do pôr do sol na Terra (honesta)

- **Hoje:** a luz do Sol que chega ao chão e ao topo das nuvens é BRANCA em qualquer ângulo. A casca de atmosfera (O'Neil/Nishita, `terraShaders.ts`, `ATMOSFERA_FRAG`, casca 1,025, desenhada pela face de trás e aditiva) só pinta o limbo. Sobre o disco ela falha o teste de profundidade, então o chão não tem névoa nem cor de pôr do sol.
- **Candidatos, a decidir no plano, por imagem:**
  1. **Transmitância da atmosfera na luz direta:** perto do terminador o Sol atravessa muito ar e chega laranja e vermelho, no chão e no topo das nuvens (nuvens rosadas no fim da tarde). O polinômio `escalaOtica` do O'Neil já dá a profundidade óptica de um ponto rumo ao Sol: provável reaproveitamento, e é o candidato mais forte.
  2. **Brilho contra o Sol no limbo** (Mie para a frente, `g` 0,76): conferir o que o shader já faz olhando rente ao limbo na direção do Sol. A câmera nova da frente A é a que permite esse olhar.
  3. **Perspectiva aérea sobre o disco** (névoa azul de dia, alaranjada no terminador): é a maior das três.
  4. **Refração:** o Sol continua visível ~0,57° abaixo do horizonte, o que alonga o dia uns 60 km no chão. É efeito pequeno; dizer a ele o tamanho honesto antes de prometer.
- O terminador das nuvens tem constantes próprias (`NUVEM_TERMINADOR`, faixa larga de −0,25 a 0,12). A Frente B pode trocá-las pela física, que é a sombra da Terra sobre a altura da nuvem mais a transmitância, mas só com prancha.
- **Onde se vê:** no Atlas, com a câmera nova, e no filme. O filme tem o nascer da Terra visto da Lua (`luaNascerDaTerra`, crescente) e a passagem do dia em `terraVoo`.

## Decisões já tomadas (não reabrir)

- A Terra tem o modo `profundidade` como padrão em cinema e alta (`?terra=`), com nuvens "suave" e relevo na altura real.
- Toda escolha de gosto vai por prancha ou por vídeo lado a lado. O vídeo é gravado com o filme tocando, nunca por saltos.
- 1:1 honesto: nenhum exagero sem confissão e sem a palavra dele.

## Também anotado na rodada da Terra (não é deste pedido)

- Hipérion usa o teste de horizonte cru e pode cortar o terminador macio da política `assistida`. A Terra resolveu com `sombraSoDoRelevo` (`corpos.ts`).
- A primeira troca de variante da Terra compila shader uma vez.

## Fora do escopo

- Trecho novo do filme.
- Mapas novos de nuvens.
- Exagerar o relevo.
- Publicar sem a palavra dele.

## Etapas (07/10, noite — ele pediu para fazer nesta mesma conversa, coordenando trabalhadores)

Ramo `atlas-perto`, na worktree `../Viagem-atlas-perto` (a pasta principal está em uso por outra conversa). O node_modules entra por link. As provas vão para `capturas/atlas-perto/` da pasta principal.

Leituras de 07/10 (fatos com arquivo:linha; os relatórios ficaram com os trabalhadores):
- **Câmera.** Não existe grau de liberdade de inclinação: a pose sai em `escreverPose`, `atlasRig.ts:1420-1459`, com `lookAt(alvo)` e depois `rotateY/X` dos deslocamentos do HUD.
  - **Piso:** `pisoDeZoom = K_MIN_RAIOS × pisoRaio`, com `pisoRaio = BODY_AXES[id][0]` (`escada.ts:836-839`), que não conta o relevo. Hipérion chega a 1,368a; Jápeto a ~1,03a.
  - **Plano próximo e justificativa:** o near é `max(dSup·0,004; R·1e-3)` (`engine.ts:645-658`). O comentário do piso de 2 R (`atlasRig.ts:66-73`, `rotulos3d.ts:93-95`) ainda cita near = 0,5 R, que é velho.
  - **Gestos livres:** botão direito ou do meio, Shift/Alt + arrastar, e dois dedos movendo juntos (hoje a pinça só lê a distância; `gestos.ts:210-217`, `arrastoDePonteiro.ts:200`).
  - **Testes que prendem piso e mira:** `atlasRig.test.ts:1131, 1225, 1298, 2866, 471, 1597, 3002`; `zoomDaRoda.test.ts:277`.
- **Atmosfera.** A transmitância do Sol até um ponto de altura h sai do mesmo O'Neil, sem laço: `T_λ = exp(−4π(kR/λ⁴ + kM)·exp(160(1−h))·escalaOtica(c))`, com c = cosseno do Sol.
  - Dá ~(0,95, 0,92, 0,85) com o Sol a pino, ~(0,70, 0,56, 0,31) a 6° e ~(0,47, 0,30, 0,09) no horizonte.
  - A escala de altura do modelo é 40 km (a do ar real é ~8 km). Confessar como "a mesma atmosfera que desenha o limbo".
  - O termo do Sol já é vec3 nos dois shaders `profundidade`.
  - Testes que prendem a atmosfera: `terra.test.ts:1110, 1125, 1163, 1190, 747`. `ATMOSFERA_FRAG` não muda de texto.
  - Filme: `luaNascerDaTerra` vai de 105 a 108,5 s.

**A — câmera** (worker opus).
1. Piso por corpo = **1,1 × o raio MÁXIMO real**, com o pico do relevo de vértice (`RELEVO_DA_LUA`, escala e viés em `rochoso.ts:~250`) e o maior semieixo. O Sol mantém 2 R, por causa do regime de brilho.
2. Grau de liberdade novo, a inclinação θ:
   - depois do `lookAt(alvo)`, a vista arfa θ rumo ao `up`;
   - θ ∈ [0, asin(min(1, R/d)) + 10°], de modo que o horizonte chega ao centro da tela e sobra um pouco de céu;
   - ao afastar, θ se grampeia sozinho;
   - a órbita continua em volta do corpo com θ guardado.
3. Gestos:
   - celular: dois dedos movendo juntos na vertical, com zoom e inclinação simultâneos, como no Google Maps;
   - computador: Shift + arrastar vertical, ou arrastar com o botão direito, mantendo o menu do botão direito bloqueado;
   - a dica de gestos do Atlas, se existir, ganha uma linha nas duas línguas.
4. A bússola continua endireitando só o giro. A rampa de seleção e a partida (`atlasRig.ts:529-537, 759, 769, 813-824`) zeram θ suavemente ao trocar de alvo.
5. Corrigir os dois comentários velhos do near. Ajustar os testes do piso. Teste novo: o grampo de θ e a câmera nunca abaixo do piso real.

**B — luz de pôr do sol** (worker opus, em paralelo; arquivos disjuntos de A).
1. Um chunk GLSL `transmitanciaDoSol(h, c)` com as constantes do `ATMOSFERA`, sem mudar o texto montado de `ATMOSFERA_FRAG`.
2. `TERRA_PROFUNDIDADE_FRAG`: `luzSol *= T(h = 1)`; o brilho do mar segue `luzSol`. `NUVENS_PROFUNDIDADE_FRAG`: a luz do Sol × T no topo da nuvem. Com o Sol abaixo do horizonte geométrico, que a faixa macia da política `assistida` ainda ilumina, c é grampeado no horizonte. Decidir por imagem.
3. A `classica` fica bit a bit, o que se confere pelos sha256 das vistas do Atlas de `capturas/terra-nuvens/depois-v2/`.

**Provas** (eu olho antes de mostrar a ele):
- Atlas da Terra baixo e inclinado sobre os Andes e o Himalaia no fim da tarde, e de frente para o Sol no limbo;
- a Lua, Marte, Hipérion (a câmera nunca dentro) e Saturno (anéis);
- o nascer da Terra no filme, 105–108,5 s, antes e depois;
- `?nobloom=1` no terminador;
- `npm run done` no fim.
- Ele experimenta os gestos no painel de navegador desta conversa, num servidor da worktree, antes de publicar.

## Resultado (08/10) — FEITO NO RAMO `atlas-perto`, NÃO PUBLICADO

O ramo é `atlas-perto` e está na worktree `../Viagem-atlas-perto`, com backup em `origin/atlas-perto`. São seis commits sobre 7f3d22a9, e `npm run done` deu verde (133 arquivos, 3.598 testes). O main andou três commits de documentação de outras rodadas: antes de publicar, trazer o ramo para cima do main, em linha reta. Publicar é merge no main mais o envio, e só com a palavra dele, no terminal dele, a pedido dele.

- **adc2e468 + 720d2366 — câmera:**
  - piso = 1,1 × o raio máximo REAL (`fatorDoRaioMaximo` em rochoso.ts; Hipérion 1,50a; o Sol fica em 2 R);
  - inclinação θ ∈ [0, asin(R/d) + 10°], que se grampeia sozinha ao afastar e volta a 0 ao trocar de alvo;
  - gestos: dois dedos juntos na vertical; Shift + arrastar ou botão direito no computador; um passo no convite;
  - freio do solo com mínimo 0,03: no piso o chão anda 0,2–0,34 do dedo, e ele ainda vai julgar isso no dedo;
  - Saturno resolvido a 256×128;
  - juiz `atlas-smoke` com 5,52 décadas. O juiz não foi rodado.
- **242b5a66 — luz do pôr do sol** no chão, no mar e nas nuvens, pelo ar limpo medido: Rayleigh de Hansen & Travis/Bucholtz, H = 8 km, Chapman, normalizado pelo zênite. Cada nuvem apaga abaixo do horizonte da própria altura. Prancha `capturas/atlas-perto/por-do-sol/prancha-por-do-sol-v3.jpg`.
- **036c764f — fonte única** dos números do ar: `src/lib/atlas/arMedido.ts`, com o gêmeo em CPU.
- **7011156a — o Sol visto através do ar:** disco, ponto de luz e clarão (`solNoQuadro.ts`). O fator vale 1 exato longe da Terra. Prancha `capturas/atlas-perto/sol-no-ar/prancha-sol-v2.jpg`.
- **23bcc37d — o ar medido no modo profundidade:** limbo e véu sobre o chão e as nuvens, mais o espalhamento múltiplo de Hillaire 2020 numa tabela feita uma vez. Medido contra a imagem dele (`capturas/atlas-perto/referencia/`), em `capturas/atlas-perto/veu/medidas.md` e `comparar-com-a-referencia.jpg`:
  - a espessura da borda bate (~28 px a 410 km);
  - o véu cresce rumo ao horizonte como na referência;
  - a clássica (O'Neil) espalha brilho até 150–250 px.
- A clássica fica bit a bit em tudo.

## A PRÓXIMA RODADA — os defeitos que ele viu ou que ficaram (08/10, a pedido dele)

Em ordem de valor. Cada um com o diagnóstico já feito.

1. **O brilho do Sol no mar é grande e borrado**, nas duas variantes; visível em `veu/comparar-com-a-referencia.jpg`.
   - Suspeita: o mapa de rugosidade do Solar System Scope invertido (`roughness`) com lobo largo, mais o mip.
   - Medir o tamanho do brilho contra a referência e contra a física (oceano com ondas: Cox & Munk dá a largura do brilho pelo vento), antes de mexer.
2. **O Sol na tela de 720 fica branco até sumir.** A transmitância está certa (`arMedido.transmitanciaDoSolVisto`), mas o disco de ~6 px está na rampa de 4–8 px, ~4e7 vezes acima da paleta, e satura. Em 1080, com o filtro solar, a cor aparece.
   - O conserto é na lei de exposição do Sol: `stellarBody.ts`, o filtro solar e a rampa do disco.
   - Ver também [rodada do ponto de luz] em `PLAN-PONTO-DE-LUZ.md`.
3. **Nuvens borradas na altura da estação**, porque o mapa de 8k tem ~5 km por texel.
   - Opções a pesquisar: o mosaico de nuvens da NASA em resolução maior (Blue Marble, 21600 px, domínio público), ou detalhe procedural ancorado no mapa e confessado, pela receita de Hipérion.
   - É decisão dele por prancha, com o custo de memória.
4. **"Visual de cinema" (decisão dele):** o vídeo da Apple que ele usa como referência é mais escuro e de azul saturado. O ar real não chega a azul/vermelho 60–80 no limbo; o Rayleigh dá ~3,6. Se ele quiser esse visual, é uma opção de cor à parte, nunca no ar.
5. **Aerossóis, desligados até agora** (`TAU_AEROSSOL` = 0, "ar limpo"). Eles dariam a base branca do limbo, a névoa branca perto do chão e o brilho em volta do Sol. Mexem no pôr do sol já mostrado, que escureceria perto do horizonte, então vão por prancha.
6. **Desempenho:** o modo profundidade custa ~+9 ms com a Terra enchendo a tela, medido com a máquina carregada. Medir no iPhone. Talvez a qualidade `alta` deva ir para a clássica, mas é decisão dele, porque "opção do menu não é ganho" (memória).
7. **Pequenos:**
   - a refração (o Sol achata perto do horizonte) ficou fora;
   - a altura da estação: o piso da Terra está em 1,1 R (~640 km) e a estação fica a 1,064 R;
   - Hipérion: o teste de horizonte cru pode cortar o terminador macio, e na inclinação máxima só aparece céu, porque o teto usa o raio externo;
   - Saturno a 1,1a: os anéis perto da câmera saem como arcos escuros fracos;
   - a primeira troca de variante compila shader;
   - `clarao.test.ts` ganhou o campo `transmitanciaDoSol` na lista fechada; ele ainda precisa confirmar;
   - de dentro do ar (câmera a ~10 km, só em voo livre) o chão sai preto com um risco. Isso já existia, nas duas variantes.

Ferramentas e provas de cada frente estão em `capturas/atlas-perto/<frente>/ferramentas/`. Há uma entrada `atlas-perto` em `.claude/launch.json`, não commitada (o arquivo tem mudanças de outra conversa), que serve a worktree na porta 5240 para o painel de navegador.
