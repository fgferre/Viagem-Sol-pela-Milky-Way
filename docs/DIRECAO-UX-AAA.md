# Destinos para visitar ou assistir — direção e prompt de execução

Revisão de direção: 14/09/2026. Base examinada nesta revisão: `a9520d6`. O dono propôs usar os destinos já presentes na busca tanto para visitar objetos enquadrados quanto para abrir sequências cinematográficas de seus sistemas; o filme galáctico existente passa a integrar esse catálogo. Esta revisão substitui o piloto de convites/ficha da proposta de 13/09. É planejamento; nenhum filme novo ou mudança de navegação foi implementado. “AAA” designa a ambição de experiência, não uma certificação.

## 1. A decisão

**Uma busca, um catálogo de destinos e duas ações claras: Visitar ou Ver filme.** O visitante escolhe o assunto e decide se assume a exploração imediatamente ou se começa por uma sequência dirigida no mesmo universo.

A aba Busca existente é a entrada comum. Manter seu nome por enquanto; não criar outra home, uma galeria concorrente, uma categoria separada de filmes ou novo onboarding. Manter Sistema Solar, Estrelas e Galáxia como categorias de assuntos. O filme é uma maneira de conhecer um destino, disponível apenas quando existe um roteiro pronto.

O Mar de Estrelas mantém identidade, Atlas, voo livre e um único motor cinematográfico. O conceito Observatório vivo passa a descrever essa integração. O primeiro trabalho deixa de ser redesenhar a ficha: passa a ser cumprir as duas intenções na busca e tornar o filme galáctico um item desse catálogo.

## 2. O que existe e o que precisa mudar

- `lib/destinosDaBusca.ts` já oferece dez destinos e três categorias, resolvidos pelo índice existente. Seus cartões chamam a mesma seleção usada pelos resultados digitados. Isso permite reutilizar a superfície e o cadastro.
- No Atlas, `focarNoCorpo('saturn', 'orbita')` enquadra a órbita; `aproximarDoCorpo()` já permite chegar ao planeta. A busca deve passar a expressar uma intenção explícita de visita, com enquadramento adequado ao tipo de alvo. Não depender de clicar duas vezes no mesmo resultado, pois a escada interpreta repetição.
- `lerSequencia`, `lerPlanoDeCamera` e `movimentos` já oferecem planos, trajetórias, legendas, lentes e ritmo. `JourneyRig` e `Director` já oferecem reprodução, pausa, progresso, velocidade e passagem ao Atlas/voo. Não construir outro player.
- **Ainda não é só acrescentar um JSON:** `Journey` usa listas globais `SHOTS`, `STARTS`, duração e legendas da viagem galáctica; `JourneyRig` instancia esse filme fixo. `jdDoFilme`, pré-aquecimento, metadados e encerramento também carregam decisões galácticas. É necessário separar a definição do filme de sua reprodução.
- A retomada atual guarda tempo, orientação e pausa, mas ainda não guarda identidade de filme. Isso terá de acompanhar o roteiro ativo.
- O destino `sagittarius-a` é o centro galáctico/buraco negro, não a Via Láctea inteira. Criar a entrada correta para a galáxia; não mudar o significado de Sagittarius A*.

A revisão usou leitura do código e os achados da inspeção visual de 13/09. Não houve nova medição de desempenho ou validação em aparelho físico nesta revisão. Halo móvel, folha flutuante, barras de rolagem e interruptores compactos já foram implementados; preservar o estado atual. O plano antigo de motion continua tendo registros desatualizados.

## 3. A aparência acompanha o produto atual

Preservar âmbar, grafite, Inter e Fraunces, a pele dos painéis, a folha móvel flutuante e o motion já aprovado. Nesta frente, a alteração visual necessária está nos cartões/resultados com duas ações e na identificação do filme ativo. Não iniciar uma rodada de tipografia, novos painéis, efeitos ou instrumentos.

Filmes novos usam o céu real do aplicativo e a direção de fotografia para compor a experiência. Ler/pausar preserva contraste, foco e áreas úteis da câmera; no celular os controles precisam caber e manter seus alvos de toque. Qualidade cinematográfica será julgada pela sequência real, com legendas e gestos funcionando.

## 4. Como a busca se organiza

| Destino | Ação principal: Visitar | Ação secundária: Ver filme |
| --- | --- | --- |
| Saturno | Planeta e anéis inteiros, enquadrados para observar | “O sistema de Saturno”, quando o roteiro estiver pronto |
| Terra | Terra enquadrada de perto | Ausente até existir uma sequência pronta |
| Sirius | Estrela enquadrada no contexto que o catálogo/renderer sustentam | Ausente até existir uma sequência pronta |
| Via Láctea | Panorama exterior baseado no enquadramento galáctico já existente, em exploração livre | Filme atual “Do Sol à Via Láctea”, duração derivada do roteiro |
| Sagittarius A* | O centro galáctico, com enquadramento específico e selo de escala existente | Ausente até existir uma sequência própria |

### Cartões e resultados digitados

Manter foto, nome e descrição; acrescentar ações irmãs `Visitar` e `Ver filme · duração`. O nome/foto pode acionar Visitar, mas não envolver os dois botões em outro botão. Não usar hover para revelar a segunda ação. No celular, conservar miniaturas e botões acessíveis sem subir o teclado ao abrir a busca.

Clicar em Visitar nunca inicia um filme automaticamente. Clicar em Ver filme nunca faz primeiro uma visita completa para depois reiniciar a câmera. A seleção feita com setas no campo só destaca o resultado; Enter ou clique confirma **Visitar**. Uma ação secundária de filme fica acessível por Tab ou toque quando o resultado corresponde a um destino com roteiro.

Duração e disponibilidade vêm da definição real do filme. Nada de botões “em breve”, durações inventadas ou filme atribuído a toda estrela porque a câmera consegue apontar para ela. Filmes prontos podem ser descobertos tanto nos cartões quanto pelo nome digitado, sem duplicar o destino em duas listas.

### O que Visitar significa

- Planeta resolvido: corpo aproximado; Saturno inclui os anéis no retângulo útil.
- Lua: lua enquadrada usando a navegação existente e sua referência ao pai.
- Estrela: enquadramento honesto compatível com seu catálogo e representação atual; não prometer superfície detalhada ou sistema planetário inexistente.
- Lugar: composição própria que mostre o assunto. A Via Láctea pede panorama exterior; seu centro pede outra vista. Não pousar cegamente na coordenada central de um volume de gás.

A visita é idempotente: repetir Visitar chega à mesma intenção de enquadramento, sem descer outro degrau acidentalmente. Pode usar a transição de câmera existente; “direto” significa sem uma etapa intermediária de seleção a cargo do visitante, não teletransporte obrigatório.

### Acesso fora da busca

Preservar inicialmente os botões atuais da abertura e dos HUDs como atalhos para o mesmo filme registrado. Não tirar acesso por uma reforma de menus que não é necessária. Eles não ganham outro player nem outra definição de roteiro. O conteúdo pode estar centralizado mesmo quando tem atalhos em mais de um contexto.

## 5. Primeiro filme novo: O sistema de Saturno

Decisão editorial: aproximadamente **50 segundos, cinco planos**, dirigidos para conhecer o conjunto. Estes tempos são alvos de montagem, a confirmar ao assistir; a UI só publica a duração final calculada.

| Plano | Intenção | Movimento/assunto |
| --- | --- | --- |
| 0–8 s | Reconhecer o sistema | Vista de conjunto de Saturno e contexto orbital de suas luas |
| 8–20 s | Revelar o protagonista | Aproximação oblíqua com o disco e os anéis inteiros |
| 20–30 s | Entender os anéis | Arco curto que revela sua geometria e a sombra já desenhada pelo renderer |
| 30–42 s | Conhecer uma lua | Transição para Titã, mantendo a relação com Saturno compreensível |
| 42–50 s | Devolver o universo ao visitante | Reenquadrar Saturno/anéis e assentar na vista final de exploração |

Usar dados, texturas, posições e capacidades efetivamente existentes. Não inventar atmosfera, sonda Cassini, superfície de Titã, partículas individuais dos anéis ou fenômeno que o app não desenha. Legendas breves PT/EN, derivadas de fontes editoriais do projeto e associadas ao assunto visível.

Para o primeiro roteiro, usar uma época científica fixa baseada no retrato existente (`EPOCA_JD_TDB`), explicitada no filme, com posições de Saturno e Titã obtidas das mesmas efemérides usadas pelo mundo. Definir pontos do roteiro relativamente a essas posições/raios e resolver uma vez após os dados necessários estarem prontos. Não hardcodar coordenadas copiadas de uma screenshot ou animar a física por um relógio de câmera separado. Não introduzir aceleração temporal neste filme piloto.

Se a efeméride necessária não estiver disponível, informar a indisponibilidade e manter Visitar acessível dentro das capacidades atuais. Não tocar o filme com Titã fora do lugar ou sem dados. O catálogo só oferece Ver filme depois que a sequência foi implementada e verificada.

## 6. Assistir, pausar e assumir a exploração

O player existente permanece único: play/pausa, velocidade, progresso, capítulos e legendas. Arrastar o olhar durante a pausa conserva sua semântica atual. A pessoa escolhe explicitamente `Explorar aqui` para entrar no Atlas ou voo, conforme a escala e capacidade de navegação daquele destino.

Para o novo filme de Saturno, a passagem precisa manter enquadramento e época do ponto de saída; não saltar para a vista geral do Sistema Solar. Isso é um critério a implementar e provar, não uma garantia de que o portal atual já serve para qualquer plano planetário.

`Retomar filme` restaura **filme, ponto, orientação e pausa guardados**, sem tentar fazer o roteiro continuar a partir da nova pose manual. Um filme galáctico pausado não pode voltar como filme de Saturno. Ao escolher outro filme, substituir a sessão anterior explicitamente; não criar uma pilha de filmes suspensos.

Ao terminar Saturno, assentar na vista final e oferecer `Explorar Saturno` e `Rever filme`. Remover textos/ações de encerramento da viagem galáctica desse contexto. O filme galáctico mantém seu encerramento atual na migração.

Durante o filme o relógio científico é definido pelo roteiro. `Visitar` usa o instante atual do Atlas; `Explorar aqui` conserva o instante mostrado pelo filme e o exibe no instrumento de tempo. O tempo de reprodução não deve ser confundido com a data científica. A navegação não modifica silenciosamente brilho, qualidade ou escolha de camadas.

## 7. Reutilização do motor, com fronteiras pequenas

Manter WebGL2/Three.js, renderer, camera rigs e o Director existentes. DOM/React permanecem com texto, controles e acessibilidade; `useGavetas`, `movimentoDaGaveta` e as reservas da câmera continuam únicos.

Evoluir o cadastro de destinos existente para associar cada destino à sua intenção de visita e, opcionalmente, ao ID de um filme. O índice de busca continua único. Via Láctea é um lugar/região real na organização do produto, não uma falsa estrela acrescentada ao catálogo astronômico.

Extrair da viagem atual uma definição de filme com apenas o necessário para os dois casos concretos: identidade, planos/legendas, relógio científico, preparação dos corpos, metadados/assuntos e comportamento de finalização. Duração, capítulos e progresso são derivados dos planos. `Journey`/`JourneyRig` recebem a definição ativa e continuam executando as primitivas atuais.

Regras particulares como `REVEAL_T`, a coda Terra/Lua, saída do disco, enquadramentos de prova e data galáctica pertencem à definição galáctica. Não espalhar `if filme === saturno` por todos os subsistemas nem criar um framework de roteiros para demandas futuras. Migrar o filme galáctico preservando seus quadros e comportamento antes de adicionar Saturno.

Estender o espelho da URL, na mesma implementação existente, para identificar o filme ativo junto de `t`/pausa. Links antigos com `?t=` continuam se referindo à viagem galáctica. Retomada, seek e reinício precisam usar a mesma identidade; não manter segundos de um roteiro ao trocar para outro.

Não alterar shaders de corpos, brilho, FOV por modo, presets, leis científicas ou regenerar `public/data`. Para filmar Saturno, reutilizar as lentes/curvas permitidas pelo motor e a direção de fotografia existente. Não refazer a pele ou adicionar efeitos ópticos nesta frente: o trabalho cinematográfico é câmera, enquadramento, montagem e conteúdo.

## 8. Referências e o que foi aproveitado

- [NASA Eyes](https://science.nasa.gov/eyes/): exploração de dados reais, controle temporal e sugestões concretas de coisas para ver. Aplicação aqui: convidar para uma observação específica, vinculada a dados e ações reais; não copiar sua interface inteira.
- [100,000 Stars — Google Data Arts](https://experiments.withgoogle.com/100000-stars): a mudança de escala revela a vizinhança estelar e o Sistema Solar, distinguindo posições reais e representação artística galáctica. Aplicação aqui: fazer a escala organizar a experiência e manter explícita a natureza da representação.
- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion): movimento breve, ligado ao gesto, cancelável e opcional. Aplicação aqui: efeitos perceptíveis que respondem à ação e deixam os instrumentos repousar.
- [W3C — contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) e [contraste de controles](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): base dos limiares de legibilidade do aceite. A ambição visual “AAA” desta direção não equivale a declarar conformidade WCAG AAA.

Fontes consultadas em 13/09/2026. As decisões de composição e a síntese “Observatório vivo” são julgamento de projeto, não conclusões atribuídas às referências.

## 9. Ordem de execução decidida

Os três lotes são futuros. Cada executor recebe um lote, com resultado utilizável e verificável.

| Lote | Entrega | Limite |
| --- | --- | --- |
| 1 — Busca como entrada comum | Visitar enquadra todos os tipos suportados; Via Láctea entra corretamente no catálogo com panorama e acesso ao filme atual; atalhos chamam o mesmo filme | Sem filme de Saturno, redesign da ficha, novo onboarding ou refatoração ampla do player |
| 2 — Dois filmes no mesmo motor | Separar definição e reprodução preservando a galáxia; implementar o filme de Saturno de cinco planos; então expor Ver filme no cartão/resultado Saturno | Sem outros filmes, novo renderer, motor de tours ou geração de conteúdo em massa |
| 3 — Continuidade e fechamento | Explorar aqui, retomada identificada por filme, final de Saturno, URL, PT/EN, foco, toque e provas integradas | Não redesenhar os controles só para aparentar novidade |

No lote 2, não expor ao visitante uma sequência que ainda falha ao pausar, encerrar ou sair. O lote 3 fecha a continuidade completa e as provas; não serve de justificativa para lançar controles quebrados no lote anterior.

Principais arquivos: `lib/destinosDaBusca.ts`, `lib/buscaEstrelas.ts`, `PaletaDeBusca.tsx`, `App.tsx`, `three/director/escada.ts` para visita; `cinematic/journey.ts`, `cameraRig.ts`, `lerSequencia.ts`, `lerPlanoDeCamera.ts`, roteiros, `director.ts` e `director/preAquecimento.ts` para filmes; HUD, encerramento, `useEspelhoDaUrl.ts` e traduções para integração. Antes de criar algo, procurar a implementação existente.

## 10. Critérios de aceite

1. Clicar/Enter em um resultado Visitar entrega o assunto enquadrado sem exigir Aproximar. Repetir a ação não muda a intenção; seleção pelas setas não dispara viagens.
2. Saturno inclui os anéis no espaço útil; Lua e Titã respeitam pai/efemérides; estrelas não ganham geografia inventada. Via Láctea e Sagittarius A* produzem vistas diferentes e adequadas aos nomes.
3. Cartões/resultados com filme oferecem duas ações compreensíveis; os demais só Visitar. Mouse, teclado e toque têm acesso. Não há botão dentro de botão, dependência de hover ou filme iniciado por surpresa.
4. O filme galáctico aberto pela busca é o mesmo que existia antes, com duração, legendas, câmera, relógio, coda e encerramento preservados. Links antigos e atalhos continuam funcionando.
5. O filme de Saturno funciona ao iniciar, pausar, retomar, avançar/retroceder, mudar velocidade e terminar. O mesmo instante de reprodução resolve a mesma cena e legenda; dados atrasados não causam voo para coordenadas vazias.
6. Explorar aqui mantém continuidade espacial e científica; Retomar filme restaura o roteiro correto e seu ponto. O encerramento do filme de Saturno não dispara uma volta à Terra ou instrução galáctica.
7. Comparar desktop 1440×900 e celular 390×844; conferir 320×568 com texto a 140%, 760/761 e paisagem. Inspecionar foco, Esc, troca de intenção, movimento reduzido e PT/EN. Emulação não é prova de aparelho físico.
8. Mostrar sequências reais em velocidade normal e quadros assentados, com data e preset declarados. O critério cinematográfico é o que cada plano revela: não basta a câmera estar se movendo. Preservar regras de olhar/ritmo aplicáveis, sem copiar automaticamente limiares galácticos para uma órbita planetária contemplativa.
9. Medir baseline e mudança com a receita de Chrome visível existente, mesmo viewport/DPR/preset; não prometer 60 fps universais ou confundir teste de código com prova visual. Nenhum passe de GPU novo é necessário para esta organização.
10. Durante a execução, usar testes pertinentes e cobertura necessária dos comportamentos novos; `npm run done` uma vez no fim de cada tarefa. Um commit por tarefa; nada publicado. A ampliação do catálogo cinematográfico vem depois de Saturno aprovado em uso.

## 11. Prompt pronto para o próximo executor

> Execute somente o Lote 1 de `docs/DIRECAO-UX-AAA.md`, revisão de 14/09/2026: usar a busca e os destinos existentes como entrada comum para Visitar ou Ver filme. A direção está definida; não faça outro estudo estético, novo onboarding ou redesign da ficha. Leia `AGENTS.md`, este documento e o bastão atual, respeitando o código e as decisões mais recentes.
>
> Faça Visitar entregar o destino enquadrado, sem a etapa manual de Aproximar: planeta/corpo, lua, estrela e lugar usam as capacidades e a navegação já existentes, com uma intenção idempotente por tipo. Teclas de seleção apenas destacam; Enter confirma Visitar. Reutilize o índice e o cadastro da busca, os caminhos do App/Director e as reservas da câmera.
>
> Acrescente Via Láctea como destino distinto de Sagittarius A*. Sua ação Visitar deve entregar um panorama exterior baseado no enquadramento galáctico existente, em exploração livre. Sua ação Ver filme abre a viagem galáctica atual desde o início; duração vem do roteiro. Mantenha os atalhos existentes apontando para esse mesmo filme. Destinos sem filme pronto não mostram a ação. Cartões e resultados digitados oferecem as ações como controles irmãos, acessíveis por mouse, teclado e toque.
>
> Não implemente o filme de Saturno nem refatore amplamente o player neste lote. Não altere shaders, dados, brilho, presets, filme atual, halo ou plano de gás. Confira as APIs reais e resolva a integração mínima, sem criar um segundo sistema de navegação ou catálogo. Entregue a versão local utilizável, comparação antes/depois, provas dos critérios pertinentes, testes e `npm run done`; um commit, sem publicação. Registre claramente o que ficou para os lotes 2 e 3.

## 12. Estado desta entrega

Direção revisada em 14/09 após a proposta do dono. A versão anterior priorizava convite, ficha e Saturno/Titã manual; esses trabalhos foram retirados do caminho executivo. A prioridade agora é a busca com visita direta e filmes associados aos destinos.

Somente este documento foi alterado na revisão. Os lotes 1–3 e o filme de Saturno continuam não implementados. A demonstração visual da conversa anterior é um estudo de composição; não representa o fluxo de busca/filmes definido nesta revisão.

Verificação desta revisão: `npm run done` passou (typecheck, lint, 103 arquivos de teste, 3.054 testes aprovados e 1 ignorado); `git diff --check` passou. Não foram adicionados testes nem alterado código de produto. Isso verifica a base documental/repositório, não a navegação e os filmes futuros.
