# Estudo de engenharia reversa — NASA Eyes Solar System

Relatório consolidado do estudo feito sobre o pacote público do NASA Eyes,
antes e durante a criação da cópia local de estudo. É a porta de entrada para
quem retomar este assunto: reúne o que já foi lido, o que a cópia local prova,
o que continua sem prova e quais documentos específicos aprofundam cada tema.
O objetivo é identificar técnicas e algoritmos que podem melhorar a experiência
do Atlas; não é propor uma cópia de funcionalidades nem afirmar que o app local
está completo.

## Escopo e evidência

A leitura foi feita sobre o JavaScript minificado servido em:

`https://eyes.nasa.gov/apps/solar-system/app.js`

O pacote observado foi o publicado em 05/08/2026, com 1.740.345 bytes,
ETag `f9ab0dbf25a9edb3d90ad321e322f0ae`. Esses dados estão preservados em
`headers/app.js.headers`; o download foi feito em 30/08/2026.
As conclusões abaixo vêm de nomes de classes/métodos preservados no bundle,
das strings de URLs e formatos, dos arquivos baixados em
`scratchpad/estudos/nasa-eyes-solar-system/` e de um teste local com rede
externa bloqueada. O bundle é a fonte primária; relatórios de IA e inferências
não substituem a leitura do código.

Artefatos que permitem refazer a auditoria:

- `src/app.js` — bundle minificado analisado.
- `runtime-refs.txt` — URLs e referências de runtime extraídas do bundle.
- `dynamo-def-summary.json` — resumo dos 1.127 índices `def.dyn` baixados.
- `dynamo-tree-summary.json` — expansão medida da árvore de efemérides.
- `spheroid-textures.json` — padrões de mapas por corpo, face e tamanho.
- `model-gltf-urls.tsv` e `model-dependency-urls.tsv` — inventário de modelos.
- `local-run-netlog*.json` e `local-index-screenshot*.png` — prova do boot local.
- `README.md` da pasta de estudo — estado operacional e comandos de retomada.

### Como retomar sem queimar contexto

1. Leia este relatório e o `README.md` local, não o bundle inteiro.
2. Para nome, órbita e rastro, abra `nasa-eyes-algoritmos.md` nas seções
   pedidas.
3. Para luz de planetas, abra `nasa-eyes-iluminacao-planetas.md` (apagado em 04/09/2026; recupere com `git show 35340d8:docs/reference/nasa-eyes-iluminacao-planetas.md`) até a seção
   13. As seções 14 em diante são registro histórico de uma implementação já
   superada e **não** descrevem o Atlas atual.
4. Só então pesquise o símbolo exato em `src/app.js` com `rg`.

O arquivo `atlas-estudo-tecnologia-nasa-eyes-camera-navegacao.md` não é fonte
primária desta auditoria: contém pesquisa anterior e hipóteses. Não o use para
atribuir comportamento ao Eyes sem confirmar no bundle.

Comandos de entrada, todos contra evidência local:

```bash
rg -n "class (TextureLOD|WMTSTile|CMTSTile|LabelQuadtree|FreeFlyController|ZoomFitController|DynamoController)|greatestPixelSpaceExtentsRadius|_loadsThisFrame|_pointsPerFrame" \
  scratchpad/estudos/nasa-eyes-solar-system/src/app.js
jq '{trees, missing, leaves_present, nodes_present}' \
  scratchpad/estudos/nasa-eyes-solar-system/dynamo-tree-summary.json
sed -n '1,80p' scratchpad/estudos/nasa-eyes-solar-system/README.md
```

## Conclusão executiva

O achado de maior valor não é um algoritmo astronômico isolado. É a forma como
o Eyes transforma uma cena potencialmente enorme em trabalho incremental,
medido pela demanda visual da tela:

1. a entidade calcula tamanho aparente, profundidade e relevância;
2. componentes pedem recursos apenas quando a demanda supera um limiar;
3. carga e descarga usam histerese para não oscilar;
4. LOD escolhe resolução pelo tamanho em pixels;
5. tiles e labels são processados por orçamento por quadro;
6. enquanto o recurso refinado chega, o pai ou uma versão anterior continua
   visível;
7. efemérides são uma árvore temporal, não um arquivo monolítico.

Essa cadeia é diretamente reaproveitável no Atlas. O download dos arquivos
confirmou que o conteúdo é muito maior do que a casca HTML: mapas, modelos,
texturas e dados temporais são serviços de dados com níveis de detalhe.

O que **não** se deve carregar para o Atlas é a falsa conclusão de que a NASA
tem um único “algoritmo de realismo”. Há decisões deliberadamente instrumentais:
fill de câmera, luz solar normalizada para o globo visitado, labels que somem e
fita de órbita desenhada no plano da tela. A lição é tornar a assistência
legível e controlável, não esconder uma conveniência física no motor.

## 1. Arquitetura observada

### 1.1 Camadas do produto

O bundle monta uma aplicação de cena com os seguintes grupos:

- `SolarSystemApp` e `BaseApp`: inicialização, rotas, managers e loading.
- `Entity` e componentes: corpo, modelo, textura, label, órbita, trail,
  seleção e oclusão.
- `Scene`/`Camera`/controllers: navegação, foco, zoom, voo livre e enquadramento.
- `ResourceManager`, `Downloader`, `BaseComponent`: fila e ciclo de vida dos
  recursos.
- `TextureLOD`, `WMTSComponent`, `WMTSTile`, `CMTSTile`: imagens em níveis e
  tiles geográficos.
- `DynamoController`, `PointSet` e tipos `orb`, `pos`, `ori`, `quat`, `lin`:
  posições, órbitas e orientações ao longo do tempo.
- `LabelManager`, `LabelQuadtree`, `Quadtree`: prioridade, colisão e orçamento
  incremental de nomes.
- `TrailManager`, `TrailComponent`, `OrbitLineComponent` e shaders: linhas
  temporais, órbitas e espessura em pixels.
- `ContentManager`, stories e rotas: narrativa declarativa sobre a mesma cena.

A separação importante é entre estado científico (tempo, posição, orientação,
hierarquia) e estado de apresentação (LOD, visibilidade, alpha, labels,
controles). O Eyes pode trocar a representação sem trocar a fonte temporal.

### 1.2 Inicialização e loading

`SolarSystemApp.init()` aguarda a inicialização da aplicação base e só então
esconde o loading screen. `setUpScene()` aguarda `scene.getLoadedPromise()`.
Isso explica por que a cópia local pode baixar a casca corretamente e ainda
ficar em loading: o boot depende de recursos assíncronos que não são apenas
`app.js`.

### 1.3 O funil por onde um recurso entra na cena

O padrão que se repete no bundle é:

`Entity` mede a cena → `BaseComponent` decide o estado →
`ResourceManager`/`Downloader` recebem a requisição → o componente preserva uma
representação útil até que o recurso entre → `Entity.__updateVisuals` aplica a
visibilidade final. Não é uma fila de download solta. Cada recurso continua
vinculado ao tamanho em pixels, à distância, à camada e ao tempo de cena.

Este funil é a explicação comum para `TextureLOD`, modelos, labels, tiles e
Dynamo. Se uma mudança futura no Atlas fizer cada camada pedir recursos por sua
própria regra, ela perde justamente a coerência que vale estudar aqui.

## 2. Algoritmos de maior valor para UX

### 2.1 Demanda visual por tamanho aparente

`Entity.__setCameraDependentVariables` e
`Entity.__updateVisuals` calculam variáveis dependentes da câmera, incluindo
profundidade e `greatestPixelSpaceExtentsRadius`. O componente não decide
“carregar tudo”; ele decide quanto aquele objeto ocupa na tela e usa isso para
visibilidade, prioridade e nível de detalhe.

Aplicação para o Atlas: uma métrica única de pixels pode governar textura,
modelo, órbita, label e densidade de partículas. Isso evita que cada sistema
tenha um “zoom” próprio.

### 2.2 Histerese de carga e descarga

`BaseComponent.__updateLoadState` mantém estados de carregamento em vez de
trocar imediatamente a cada variação de um frame. Os limiares de entrar e sair
são diferentes; assim, um objeto que está no limite não fica carregando e
descarregando em sequência.

Aplicação para o Atlas: usar dois limiares e, se necessário, um tempo mínimo de
permanência. O ganho é estabilidade perceptível, não apenas economia de rede.

### 2.3 LOD por demanda, não por distância bruta

`TextureLOD` seleciona o nível a partir da demanda visual. Distância sozinha
falha quando o campo de visão muda ou quando corpos têm raios muito diferentes.
O mesmo mecanismo permite textura grossa longe, textura refinada perto e
retorno seguro ao nível anterior se o refinamento falhar.

### 2.4 Orçamento de trabalho por quadro

`WMTSComponent`/`WMTSTile` e `CMTSTile` não expandem todos os tiles de uma vez.
Eles dividem o trabalho e impõem limites por frame. `LabelQuadtree` faz o mesmo
com colisões: só uma quantidade limitada de nomes entra na disputa em cada
quadro, com rodízio.

Esse padrão é uma técnica geral de UX: limitar milissegundos de trabalho por
frame é mais importante do que terminar a lista o mais rápido possível.

### 2.5 Fallback progressivo sem buraco

O tile filho pode ser solicitado enquanto o tile pai continua desenhado.
`CMTSTile` mantém o objeto temporário do pai até que o filho esteja pronto;
`WMTSTile` faz a composição progressiva equivalente para mapas.

Aplicação para o Atlas: todo refinamento deve preservar uma imagem válida —
modelo simplificado, textura anterior ou mapa pai — até a troca atômica.

### 2.6 Labels como problema de alocação espacial

`LabelQuadtree` usa uma quadtree de tela para testar interseções. A prioridade
é determinística: peso da classe, depois profundidade da câmera, depois ordem
alfabética. O nome que perde fica oculto; o algoritmo não tenta empurrá-lo para
14 posições nem cria uma linha para justificar o deslocamento.

O `LabelQuadtree` observado tem profundidade máxima 8 e trabalha em rodízio:
só 20 labels entram na disputa por frame. Os pesos incluem Universo/Galáxia/
Estrela 100, Planeta 50, Sonda 30, Lua 25, Asteroide/Cometa 15 e classes
menores. `toggleIcons` e `toggleLabels` são canais independentes: ícone pode
permanecer sem texto.

`DivComponent` ainda faz o nome obedecer ao mundo: `isPositionOccluded`/
`isOccludingPosition` testam o segmento câmera–objeto contra uma esfera e o
objeto atrás da câmera não recebe label. `VisibleInterval` faz o label ceder
quando o corpo ocupa grande parte da tela. O preset `DefaultVisibleFar` começa
a desaparecer perto de raio NDC 0,02 (cerca de 1,1°): no close, o globo passa
a ser a própria identificação.

### 2.7 Navegação com escala local

`FreeFlyController` procura incrementalmente a entidade mais próxima e ajusta a
velocidade pela distância. Isso evita que o mesmo deslocamento pareça lento
perto de um corpo e rápido demais longe dele.

`ZoomFitController` recebe múltiplas entidades, calcula o enquadramento e pode
usar `edgeSize`, `tightFit` e `zoomOutOnly`. É um algoritmo de composição, não
apenas um `lookAt`.

### 2.8 Órbita como geometria de tela

`LineShader`/`TrailShader` transformam pontos projetados em uma fita de largura
constante em pixels. A junção usa a bissetriz das direções vizinhas (miter),
com proteção contra pontas exageradas em anéis fechados. A largura é corrigida
por resolução e o brilho é aditivo sem exigir um tubo 3D.

Os valores observados são largura-base de 1,2 px, hover de 2 px e
`resolutionFactor = max(1, min(ladoDaJanela) / 800)`. A junção limita o
denominador a 0,25 no anel fechado, evitando a ponta explosiva. Isso é uma
receita de geometria de tela; não é efeito de textura, gradiente ou “tubo 3D”.

`OrbitLineComponent` é usado para planetas/luas; `TrailComponent` é usado para
sondas e representa uma janela temporal. O Eyes não trata todos os caminhos
como a mesma coisa.

### 2.9 Rastro temporal adaptativo

`TrailComponent` calcula início/fim a partir do tempo atual e da duração da
missão. O shader usa `indexU` para afinar e desvanecer o passado. Para trajetórias
que não são uma elipse, `_updatePoints` acrescenta pontos nas duas pontas com
passo adaptativo: curva acima de 3° reduz o passo; curva abaixo de 1° aumenta
o passo, dentro de limites e tentativas por ponto.

Para órbitas planetárias, o caminho observado é diferente: `setUpTrail` troca
para `OrbitLineComponent`, e a amostragem é feita da cônica. No Atlas, a
`conicaOsculadora` e `escreverLaco` já são a fonte correta para esse caso.

Nos trails, o primeiro passo corresponde a 3° da duração, há até 20 tentativas
para achar um novo ponto e no máximo quatro pontos novos por ponta por frame
(18 acima de aproximadamente 30,4 dias). Esses limites mostram que a curva foi
desenhada para manter a interação estável, não para ser uma reconstrução total
em cada tick.

### 2.10 Iluminação de visita: legível e explicitamente assistida

`SpheroidLODComponent` usa `MaterialUtilsPhong` para planetas, luas e anéis;
`ModelComponent` usa o caminho PBR `MaterialUtilsStandard` para sondas. Não é
um único material para toda a cena. A descoberta crítica no bundle é que
`MaterialUtils.setLightSourceUniforms` envia ganho literal **1** para o Sol no
globo: a direção e o tamanho aparente do Sol são geométricos, mas a intensidade
do globo visitado não recebe `1/d²`.

O `1/d²` existe em `absoluteMagnitudeToFlux`, mas pertence ao
`StarfieldComponent`, isto é, a estrelas vistas como pontos. Misturar a lei do
ponto visto da Terra com a câmera que visita Saturno deixa o disco artificialmente
escuro. A assistência do Eyes é explícita: `Settings.lightType` oferece
`shadow` (padrão: fill da câmera 0,15), `flood` (fill 1) e `natural` (fill
desligado); o ambiente de cena padrão é 0,02.

Outros detalhes que importam para a percepção:

- o difuso é uma curva logística com sharpness 3, não Lambert cru; o flanco e
  o terminador ficam mais legíveis;
- `shadowEntities` usa umbra/penumbra de fonte solar finita;
- Saturno, e só ele no cadastro lido, ativa `shadowRings`; a sombra do anel
  reduz a luz direta antes da mistura do globo;
- `RingsComponent` separa face superior/inferior, não escreve depth e ilumina o
  lado do Sol com ganho 2;
- `AtmosphereComponent` é uma casca de leitura em cinco passos, não uma solução
  de espalhamento atmosférico completa.

O aprendizado para o Atlas é separar “ponto no céu”, “disco visitado” e
“instrumento de leitura”. Não portar números ou materiais sem confrontá-los
com a lei fotométrica e os oráculos do próprio Atlas.

## 3. Dados científicos e pipeline de recursos

### 3.1 Dynamo/efemérides

`DynamoController`/`PointSet.load` lê `def.dyn` binário com versão, tipo, número
de dígitos, cabeçalho e pontos. Há tipos `orb`, `pos`, `ori`, `quat` e `lin`.
Quando `hasPoints=1`, as amostras estão no próprio arquivo; quando é zero, o
arquivo aponta para filhos com índices preenchidos. Em v2, o último intervalo
usa sentinela. Netos seguem o padrão `{nome}_{índice}.dyn`.

O inventário local contém 1.127 `def.dyn`. Da primeira camada enumerada, há
103.365 URLs e 103.360 arquivos presentes; cinco falhas estão listadas em
`dynamo-child-urls.tsv.failures`. A tentativa controlada de expandir níveis
seguintes trouxe 229.448 arquivos nomeados `{pai}_{índice}.dyn`; a varredura
mais recente ainda lista 2.447.668 referências ausentes em
`dynamo-nested-missing.tsv`. O resumo estrutural correspondente está em
`dynamo-tree-summary.json` (87.340 folhas e 17.147 nós legíveis naquele corte).
Isso prova que o mecanismo é uma pirâmide temporal sob demanda; baixar tudo não
é um recorte razoável para validar o runtime.

### 3.2 Mapas e modelos

`SpheroidLOD` referencia padrões de mapas por corpo, face e tamanho. O inventário
local contém as 606 URLs de mapas estáticos declaradas no recorte, 165 modelos
`.gltf` explícitos e 1.167 de 1.169 dependências diretas de modelos. Os dois
arquivos SPHEREx (`corrugated_normal.jpg` e `foil_normal.jpg`) retornaram 403;
o nome com espaço `sc_insight/lander/foil_n 1.jpg` exige URL codificada e foi
obtido separadamente. Também houve 403 nas URLs testadas para o mapa ambiente
`env_maps/starmap_2048.jpg`.

Modelos `.gltf` são apenas a entrada: eles referenciam imagens, buffers e
compressões. Portanto, contar `.gltf` não significa que um catálogo visual está
offline.

### 3.3 CMTS, WMTS e dados externos

`runtime-refs.txt` mostra URLs para:

- `/cmts/{corpo}/{canal}` nos canais cloud, color, height, night, normal e
  specular;
- `/maps/...` e `SpheroidLOD` para mapas estáticos;
- `trek.nasa.gov`/WMTS/GIBS e `WMTSCapabilities.xml` para tiles vivos;
- `/dynamo/${n.url}` para efemérides;
- estrelas binárias, Draco/KTX2 e mapas de ambiente.

As pirâmides CMTS e os tiles WMTS não fazem parte da cópia completa. Logo, a
aplicação original depende de um serviço de dados, mesmo que a casca e o bundle
estejam presentes.

Os `configuration.json` de CMTS e o `dataset_manifest.json` da Terra existem
localmente. Eles descrevem a entrada da pirâmide; não equivalem aos milhares de
tiles `.ktx2` que ela pode requisitar ao navegar.

## 4. Stories e câmera como dados declarativos

O bundle contém stories com slides, timestamps, velocidades, entidades,
imagens e funções de câmera. `TrajectoryManager`, `KeyframeController`,
`CameraFollowManager`, `goToSpacecraft`, `goToSystem`, `alignObjects` e
`ZoomFitController` compõem uma narrativa sem duplicar a cena. Stories também
podem alterar temporariamente camada, trail, luz e relógio, e restaurar esse
estado na saída. Isso evita que a narrativa deixe resíduos na exploração livre.

O padrão útil para o Atlas é separar roteiro de motor: um roteiro declara tempo,
alvo, pose, velocidade e texto; o motor executa. Isso permite criar novas
viagens sem criar um segundo renderizador.

## 5. O que foi comprovado localmente

A cópia local em `scratchpad/estudos/nasa-eyes-solar-system/` é ignorada pelo
git, ocupa aproximadamente 3,4 GB e preserva headers, bundles, shaders, mapas,
modelos, índices Dynamo e manifests escolhidos. `index.local.html` e
`config.local.js` redirecionam os assets principais para `/assets/static` e
`/assets/dynamic`.

O teste com servidor HTTP local, rede externa desligada e WebGL por software
mostrou que a casca carregou sem 404s na medição final, mas permaneceu na tela
de loading. A prova está nos `local-run-netlog*.json` e nas capturas
`local-index-screenshot*.png`. Isso é boot parcial, não funcionamento 100%
offline. O netlog não permite atribuir uma causa única: recursos dinâmicos
ausentes, inicialização que espera dados específicos e diferenças do WebGL por
software continuam hipóteses separadas.

## 6. Limites e perguntas ainda abertas

- Não há prova de que todos os níveis CMTS/WMTS foram enumerados.
- A árvore completa de filhos/“netos” Dynamo é grande demais para baixar sem
  um recorte científico explícito; a varredura atual ainda tem cerca de 2,45
  milhões de referências seguintes.
- Duas normais do SPHEREx retornaram 403; o CDN pode exigir uma origem ou URL
  diferente. O arquivo Insight com espaço não é um 403: é um caso de encoding.
- O pacote minificado não revela, sozinho, todos os chamadores de cada opção,
  nem garante que uma API encontrada esteja ativa no caminho padrão.
- O boot local não passou do loading; portanto não se deve chamar a pasta de
  “NASA Eyes executável offline”.
- O tamanho máximo do buffer de trail, alguns buracos de efemérides e o uso
  efetivo de `farSideAlphaFade` ficaram sem prova conclusiva.

## 7. Tradução para decisões do Atlas

Sem copiar features, os princípios que merecem protótipo são:

1. uma métrica de demanda visual em pixels compartilhada por todas as camadas;
2. histerese e troca atômica para todo recurso refinável;
3. orçamento explícito de milissegundos/pontos/labels por frame;
4. fallback do pai enquanto mapas ou modelos filhos carregam;
5. labels com prioridade determinística e colisão que oculta o perdedor;
6. velocidade de câmera proporcional à escala local;
7. separação entre órbita geométrica e rastro temporal;
8. roteiros declarativos sobre o mesmo motor de cena;
9. efemérides particionadas por tempo, carregadas pela janela que a câmera e o
   relógio realmente pedem.

### Ordem recomendada de investigação futura

1. **Não baixe mais assets sem uma pergunta de runtime.** A cópia já tem 3,4 GB
   e o boot local ainda não terminou.
2. Se a pergunta for mapas, reproduza primeiro o contrato de `CMTSTile`:
   seleção por pixels, orçamento por frame e pai visível enquanto o filho chega.
3. Se a pergunta for navegação, experimente `FreeFlyController` e
   `ZoomFitController` com corpos do Atlas antes de tocar em qualquer asset.
4. Se a pergunta for trajetória, mantenha a cônica do Atlas para planetas e
   estude `TrailComponent` somente para material que realmente tenha janela de
   tempo (sonda/filme).
5. Se o objetivo voltar a ser “offline”, instrumente a requisição que bloqueia
   `scene.getLoadedPromise()`; uma busca cega por arquivos é o caminho caro.

Esses itens são aprendizados de arquitetura e percepção. A implementação no
Atlas deve continuar obedecendo aos seus oráculos científicos e às decisões
registradas em `docs/NORTE.md` e `docs/PENDENCIAS.md`.

## Referências internas

- [Algoritmos de labels e trajetórias](nasa-eyes-algoritmos.md)
- Iluminação observada no NASA Eyes — `nasa-eyes-iluminacao-planetas.md` (apagado em 04/09/2026; recupere com `git show 35340d8:docs/reference/nasa-eyes-iluminacao-planetas.md`)
- Mineração de mecanismos 30-31/08 — 9 mergulhos comparados — `nasa-eyes-mineracao-mecanismos.md` (apagado em 04/09/2026; recupere com `git show 35340d8:docs/reference/nasa-eyes-mineracao-mecanismos.md`)
  — a fronteira que este relatório não cobriu (transição multi-escala,
  profundidade, navegação, enquadramento, catálogo de muitos corpos, UX,
  shaders 38/38, fita/rótulos, assets/memória), confrontada com o nosso
  código e com medidas; ganhos ranqueados e lista consolidada do que não
  trazer.

A pasta de estudo é deliberadamente ignorada pelo git. No clone que contém os
assets, ela está em `scratchpad/estudos/nasa-eyes-solar-system/`; não há link
permanente para ela no repositório remoto.
