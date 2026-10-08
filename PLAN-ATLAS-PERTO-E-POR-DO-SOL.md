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

## Etapas

(a escrever por quem planejar)
