# Estudo de engenharia reversa — NASA Eyes Solar System

Relatório consolidado do estudo feito sobre o pacote público do NASA Eyes,
antes e durante a criação da cópia local de estudo. O objetivo é identificar
técnicas e algoritmos que podem melhorar a experiência do Atlas; não é propor
uma cópia de funcionalidades nem afirmar que o app local está completo.

## Escopo e evidência

A leitura foi feita sobre o JavaScript minificado servido em:

`https://eyes.nasa.gov/apps/solar-system/app.js`

O pacote observado foi o publicado em 05/08/2026, com aproximadamente 1,7 MiB.
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

Os pesos encontrados incluem Universo/Galáxia/Estrela 100, Planeta 50, Sonda
30, Lua 25, Asteroide/Cometa 15 e classes menores. `toggleIcons` e
`toggleLabels` são canais independentes: ícone pode permanecer sem texto.

`DivComponent` ainda faz o nome obedecer ao mundo: `isPositionOccluded`/
`isOccludingPosition` testam o segmento câmera–objeto contra uma esfera e o
objeto atrás da câmera não recebe label. `VisibleInterval` faz o label ceder
quando o corpo ocupa grande parte da tela.

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

## 3. Dados científicos e pipeline de recursos

### 3.1 Dynamo/efemérides

`DynamoController`/`PointSet.load` lê `def.dyn` binário com versão, tipo, número
de dígitos, cabeçalho e pontos. Há tipos `orb`, `pos`, `ori`, `quat` e `lin`.
Quando `hasPoints=1`, as amostras estão no próprio arquivo; quando é zero, o
arquivo aponta para filhos com índices preenchidos. Em v2, o último intervalo
usa sentinela. Netos seguem o padrão `{nome}_{índice}.dyn`.

O inventário local contém 1.127 `def.dyn`. A expansão medida encontrou uma
árvore enorme: 87.340 folhas e 17.147 nós já presentes na cópia, mas cerca de
2.447.668 folhas ainda ausentes conforme `dynamo-tree-summary.json`. Isso prova
que o mecanismo é uma pirâmide temporal sob demanda; baixar tudo não é um
recorte razoável para validar o runtime.

### 3.2 Mapas e modelos

`SpheroidLOD` referencia padrões de mapas por corpo, face e tamanho. O inventário
local baixou os 606 mapas estáticos declarados no recorte escolhido, 165 modelos
`.gltf` explícitos e 1.167 de 1.169 dependências diretas de modelos. O restante
inclui recursos recusados pelo CDN, como duas normais do SPHEREx, além de
texturas de ambiente testadas com 403.

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

## 4. Stories e câmera como dados declarativos

O bundle contém stories com slides, timestamps, velocidades, entidades,
imagens e funções de câmera. `TrajectoryManager`, `KeyframeController`,
`goToSpacecraft`, `goToSystem`, `alignObjects` e `ZoomFitController` compõem
uma narrativa sem duplicar a cena.

O padrão útil para o Atlas é separar roteiro de motor: um roteiro declara tempo,
alvo, pose, velocidade e texto; o motor executa. Isso permite criar novas
viagens sem criar um segundo renderizador.

## 5. O que foi comprovado localmente

A cópia local em `scratchpad/estudos/nasa-eyes-solar-system/` é ignorada pelo
git e preserva headers, bundles, shaders, mapas, modelos, índices Dynamo e
manifests escolhidos. `index.local.html` e `config.local.js` redirecionam os
assets principais para `/assets/static` e `/assets/dynamic`.

O teste com servidor HTTP local, rede externa desligada e WebGL por software
mostrou que a casca carregou sem 404s na medição final, mas permaneceu na tela
de loading. Isso é evidência de boot parcial, não de funcionamento 100% offline.
O motivo provável é a combinação de recursos dinâmicos ainda ausentes e
dependências de inicialização que o teste não cobriu; não foi declarado um
diagnóstico além do que o netlog prova.

## 6. Limites e perguntas ainda abertas

- Não há prova de que todos os níveis CMTS/WMTS foram enumerados.
- A árvore completa de filhos/“netos” Dynamo é grande demais para baixar sem
  um recorte científico explícito.
- Dois arquivos de textura do SPHEREx retornaram 403; o CDN pode exigir uma
  origem ou URL diferente.
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

Esses itens são aprendizados de arquitetura e percepção. A implementação no
Atlas deve continuar obedecendo aos seus oráculos científicos e às decisões
registradas em `docs/NORTE.md` e `docs/PENDENCIAS.md`.

## Referências internas

- [Algoritmos de labels e trajetórias](nasa-eyes-algoritmos.md)
- [Iluminação observada no NASA Eyes](nasa-eyes-iluminacao-planetas.md)
- [Pasta local de estudo](../../scratchpad/estudos/nasa-eyes-solar-system/README.md)
