# Observatório vivo — direção e prompt de execução

Decisão de direção: 13/09/2026. Base examinada: `e2ec52a`. Pedido do dono: decidir o caminho e entregar instruções executivas para reduzir interpretação e retrabalho dos próximos modelos. Esta entrega é direção de produto; o redesenho ainda não foi implementado ou aprovado em uso. “AAA” é a ambição de acabamento e experiência, não uma certificação nem promessa de resultado.

## 1. A decisão

**Mar de Estrelas será um observatório cinematográfico que transforma curiosidade em observação.** A assinatura é a continuidade: convite específico → enquadramento que cumpre a promessa → informação ligada ao que aparece → manipulação de escala ou tempo → descoberta relacionada. Tudo acontece no universo existente, com liberdade para interromper e explorar.

Nome interno da direção: **Observatório vivo**. Não renomear o produto. A marca continua Mar de Estrelas.

Escolho esta direção porque aproveita o diferencial difícil de copiar — cena científica navegável, da vizinhança solar ao volume galáctico — e dá uma finalidade comum à interface e aos efeitos. O salto será feito por experiências completas. Uma troca geral de pele sem mudar o percurso do visitante não satisfaz esta direção.

Não vamos construir cockpit de nave, HUD cheio de telemetria decorativa, menu orbital, painel radial, chatbot, sistema de missões/pontos ou nova biblioteca de efeitos. Também não vamos reduzir o produto a uma galeria de cartões. A descoberta desemboca no céu manipulável.

## 2. Evidências e limites

Lidos: `README.md`, `PLAN.md`, `docs/NORTE.md`, primeira seção O BASTÃO de `docs/PENDENCIAS.md`, registros do plano de motion e código de composição, destinos, navegação e ficha. Inspeção direta no navegador embutido: abertura e busca na largura móvel de 454 px; Saturno selecionado e aproximado; desktop 1440×900 com ficha e Tempo; Camadas; passagem ao filme, pausa e voo livre. Inspeção de layout, não medição de fluidez, teste de aparelho físico ou pesquisa com visitantes.

| Evidência | Leitura de produto | Decisão |
| --- | --- | --- |
| Cartão “Saturno — Os anéis, de perto” seleciona a órbita; aproximar é outra ação. | A promessa editorial e o destino visual estão separados. | Convites editoriais passam a incluir o enquadramento. A busca textual mantém sua semântica atual. |
| Ficha de Saturno já traz texto, seções, dados vivos e procedência. | Há profundidade real para aproveitar. A falta não é de conteúdo. | Antepor uma leitura curta da cena; preservar o acervo completo abaixo. |
| De perto, várias linhas de órbita e nomes atravessam o quadro de Saturno. | A composição precisa dirigir a atenção entre contexto e objeto. | Estudar prioridade contextual das marcações no piloto, sem mudar a luz ou apagar estrelas. |
| Buscar/Camadas/Ajustes ocupam a régua no Atlas, outros lugares no filme/voo. | A câmera compartilha universo; os instrumentos ainda mudam de endereço. | Unificar os pontos de acesso no lote de continuidade, mantendo controles específicos de cada atividade. |
| No trecho claro do gás, textos do filme/voo tiveram pouco contraste perceptível. | Legibilidade tem de sobreviver ao fundo brilhante. | Proteção local do texto e superfícies de instrumento opacas; nunca escurecer o universo inteiro. |
| Motion, foco, folha móvel e halo já receberam correções extensas. | Refazer mecanismos maduros acrescentaria risco. | Reutilizar presença, gestos, foco e passe óptico existentes. |

A hipótese criativa ainda a validar é que convites com enquadramento e continuidade aumentarão o prazer de exploração. Não foi medida retenção, preferência estética ou redução de abandono. Não afirmar esses resultados.

**Precedência histórica:** o §12.10 de `PLANO-MOTION-UI.md` ficou desatualizado. O halo foi adotado e chegou ao celular (`67ea6cb`); os menus móveis ganharam margem de 12 px (`0d5b3db`). O bastão mais recente registra isso. Não reabrir a escolha CSS × WebGL como se estivesse pendente. Não tratar C7 como integralmente validado em aparelhos reais.

## 3. Linguagem visual decidida

- **Céu preto, instrumento de grafite, luz de âmbar e texto marfim.** Manter as fontes locais Inter e Fraunces: a segunda dá voz à marca e à descoberta, a primeira conduz ações e dados. Essa combinação já distingue o produto de um simulador militar genérico. A mudança está na hierarquia, escala tipográfica, composição e relação com o espaço.
- Partir dos tokens existentes. Referência de composição: superfície `#0b1016`, texto `#f2efe7`, secundário `#aeb7bf`, acento `#dfbd79`. Valores são alvos de arte a verificar por contraste, não autorização para substituir tokens indiscriminadamente.
- Em desktop, título do objeto 36–48 px, texto de leitura 16–18 px, controles 14–16 px. No celular: título 28–32 px, corpo 16 px e entradas pelo menos 16 px. Reutilizar a escala de texto de 85–140%; não criar um segundo sistema. Metadados secundários não devem sustentar informação essencial em letras minúsculas.
- Painéis de leitura sólidos, borda fina e raio discreto de 12–16 px. O halo percorre a borda na ativação e termina. Não há brilho permanente em cada linha nem vidro translúcido sobre dados.
- A profundidade vem da câmera real, da separação entre céu e instrumentos e das transições de presença. Não inclinar texto em perspectiva, inventar paralaxe de estrelas ou mover o céu em resposta ao mouse sobre um botão.

## 4. Composição e navegação

### Desktop

Uma moldura estável: marca/endereço no alto à esquerda, filme/voo à direita, instrumentos na borda direita, Tempo embaixo. No piloto preservar os acessos existentes. No lote de continuidade, a mesma régua recebe Destinos, Camadas, Ficha e Ajustes também no filme pausado/voo; remover os acessos substituídos, sem duplicá-los.

“Destinos” será o nome visível do acesso à busca unificada, com campo “Buscar um destino…”. Não criar uma nova tela de catálogo ou mecanismo de busca. Na abertura manter “Explorar o Atlas” principal; filme e voo continuam acessíveis como secundários. Ao entrar no Atlas, um convite curto oferece “Saturno · Os anéis, de perto” e “Explorar por conta própria”. Reusar o convite existente, em vez de acrescentar outra sobreposição de onboarding.

Quando uma descoberta estiver aberta, o painel ocupa inicialmente cerca de 340–400 px à direita. O corpo e seus anéis cabem no retângulo útil restante; a câmera usa a reserva existente. Não aplicar crop ou zoom 2D no canvas em produção. A referência inicial é Saturno completo, com folga nas extremidades dos anéis, sem um percentual universal de tamanho para todos os corpos.

A Ficha continua sendo a única superfície de informação do alvo. No topo: nome, uma frase de observação, no máximo três dados pertinentes e uma ação de continuidade. Abaixo, as seções completas e sua procedência. O texto científico não desaparece nem vira um conjunto de números decorativos.

### Celular e toque

Manter as cinco alças e a folha flutuante já aprovadas. O acesso Destinos substitui o rótulo Buscar; Tempo conserva sua gaveta. Nenhuma funcionalidade depende de hover, teclado ou precisão de mouse.

Na chegada a Saturno, mostrar ficha compacta: título, uma frase e próxima ação. Expansão pela alça e pelo botão “Detalhes”; o céu é reenquadrado segundo a reserva real da folha. A ficha expandida prioriza leitura e rola. Evitar metas rígidas de altura que cortem texto ampliado; testar 320 px/140% e teclado virtual.

Não transpor a régua lateral de desktop para o telefone. Manter margens de 12 px, respeitar safe areas e os contratos de 44 px de alvo. Preservar o breakpoint centralizado existente; não acrescentar outro breakpoint de produto.

### Contemplação

Uma ação explícita “Só observar” recolhe a ficha e o chrome secundário; deixa “Mostrar instrumentos” sempre encontrável. Não ocultar controles automaticamente enquanto alguém lê, usa teclado ou manipula um instrumento. Reutilizar a política de chrome existente onde aplicável. No filme em reprodução, manter a política de sumir/voltar já existente.

## 5. O percurso que prova a direção

Primeiro minuto editorial, sem cronômetro obrigatório ou autoplay:

1. **Entrar:** o universo já é visível. O convite oferece Saturno, com imagem do próprio aplicativo e a promessa “Os anéis, de perto”. Pode ser dispensado imediatamente.
2. **Chegar:** um clique leva ao corpo aproximado com anéis inteiros. Uma transição existente, cancelável, mantém a orientação; a ficha compacta chega junto ao assentamento, sem atrasar o comando.
3. **Compreender:** aparece “Um mundo de anéis” e a síntese, derivada da descrição já presente: “Os anéis são feitos sobretudo de partículas de gelo, com uma parcela menor de rocha e poeira.” O texto completo e suas fontes continuam na ficha. Não atribuir composição a uma cor inventada no shader.
4. **Continuar:** “Visitar Titã” leva à lua real já catalogada. O endereço passa a Sistema Solar › Saturno › Titã. O visitante pode voltar a Saturno ou ao sistema pelos acessos existentes. Não prometer uma API pronta de “todas as luas”.
5. **Manipular:** “Explorar o tempo” abre o instrumento existente. A pessoa escolhe sentido e taxa; data, rotação e efemérides continuam vindo do relógio único. Não rodar relógio sozinho como surpresa, não simular datas com animação de texto e não prometer um eclipse sem cálculo.
6. **Ampliar contexto:** “Sistema Solar” afasta usando a escada e o reenquadramento reais. O endereço e as unidades dão orientação. “Ver o filme” continua sendo a viagem galáctica existente; não inventar um filme de Saturno ou dizer que o filme atual parte de qualquer posição.

Esta sequência é um encadeamento editorial de ações existentes, não um novo modo, motor de tours ou grafo genérico de missões. Implementar primeiro apenas Saturno e Titã. Os próximos convites, após o piloto, serão Terra/Lua, Júpiter e a revelação da Via Láctea, cada um com seu enquadramento demonstrado.

## 6. Três assinaturas de interação

**Chegada que cumpre a promessa.** O cartão editorial escolhe destino e intenção de enquadramento. A seleção comum do catálogo continua separada da aproximação. A animação da câmera não recebe uma duração universal: usar a rampa atual e ajustar só após observar a experiência. Seleção, carregamento ou aproximação podem ser interrompidos; o último comando vence.

**Instrumento que responde.** Preservar pressão interna, hitbox fixa, folha acompanhando o dedo e halo de abertura de aproximadamente 400 ms. Um realce curto confirma que nome/ficha pertencem ao alvo novo. Números científicos nunca contam valores fictícios para parecer vivos. Repouso visual termina o gesto; não combinar pulsações e reflexos contínuos.

**Escala legível durante a travessia.** Dar mais hierarquia ao endereço e à distância real da câmera, com unidade e referente explícitos (“ao Sol”, “à câmera”). Reusar `lib/unidades` e os dados do Director. Não confundir afastamento da câmera com distância orbital. Não criar slider de escala com marcos arbitrários nesta rodada.

Para movimento reduzido, suprimir ornamento e substituir deslocamentos decorativos por mudança imediata; navegação espacial deve continuar disponível com a política de acessibilidade existente, revista no piloto. A informação de confirmação também aparece por texto/estado. Nenhum comando espera o halo terminar.

## 7. Ciência, marcações e tecnologia

Manter WebGL2/Three.js, renderer, câmera, luz, dados, física e efemérides existentes. React/DOM continuam responsáveis pelo texto, controles e acessibilidade. WAAPI/CSS existentes continuam com presença/gesto; o halo usa o passe final já integrado. Sem dependência nova, segundo canvas de UI, WebGPU, shader de vidro ou passe adicional nesta direção.

**Prioridade das marcações:** começar usando a seleção e a colisão existentes. Se a vista aproximada ainda estiver poluída, o lote 2 adiciona uma política contextual à camada existente, com escolha explícita “Contextuais / Todas” dentro de Camadas. A opção só afeta rótulos e linhas de orientação; nunca apaga estrelas, planetas, gás ou poeira. Desligar uma camada continua tendo precedência. Não reativar camadas, persistir alterações ou trocar a escolha silenciosamente ao selecionar um cartão. A miniatura limpa da proposta não prova que essa política está implementada.

Não é objetivo redesenhar Saturno, refazer texturas, mudar FOV/brilho por modo, reabrir a escala do buraco negro, regenerar `public/data` ou concluir o plano de gás. Os fatos usados nos convites devem ter chave PT/EN e derivar das fontes editoriais do projeto; dado novo exige fonte primária, unidade e indicação de proveniência.

Sem novos efeitos de GPU no piloto. O investimento vai para o enquadramento, a reação dos instrumentos existentes e as transições entre estados. Só considerar efeito óptico adicional quando uma comparação real mostrar um ganho ainda não obtido com o renderer atual.

## 8. Referências e o que foi aproveitado

- [NASA Eyes](https://science.nasa.gov/eyes/): exploração de dados reais, controle temporal e sugestões concretas de coisas para ver. Aplicação aqui: convidar para uma observação específica, vinculada a dados e ações reais; não copiar sua interface inteira.
- [100,000 Stars — Google Data Arts](https://experiments.withgoogle.com/100000-stars): a mudança de escala revela a vizinhança estelar e o Sistema Solar, distinguindo posições reais e representação artística galáctica. Aplicação aqui: fazer a escala organizar a experiência e manter explícita a natureza da representação.
- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion): movimento breve, ligado ao gesto, cancelável e opcional. Aplicação aqui: efeitos perceptíveis que respondem à ação e deixam os instrumentos repousar.
- [W3C — contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) e [contraste de controles](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): base dos limiares de legibilidade do aceite. A ambição visual “AAA” desta direção não equivale a declarar conformidade WCAG AAA.

Fontes consultadas em 13/09/2026. As decisões de composição e a síntese “Observatório vivo” são julgamento de projeto, não conclusões atribuídas às referências.

## 9. Ordem executiva e fronteiras

Os lotes abaixo são trabalho futuro, ainda não executado. Cada nova tarefa recebe UM lote. Não mandar um modelo implementar o documento inteiro de uma vez.

| Lote | Entrega fechada | Arquivos principais | Fora desse lote |
| --- | --- | --- | --- |
| 1 — Saturno/Titã | Convite com aproximação, topo editorial da ficha, próxima ação Titã e composição desktop/móvel | `App.tsx`, `PaletaDeBusca.tsx`, `FichaDoObjeto.tsx`, `passosDoConvite.ts`, `lib/destinosDaBusca.ts`, `lib/atlas/ficha.ts`, `lib/idioma/pt.ts`, `en.ts`, fatias CSS pertinentes | Outros destinos, novo motion, novo sistema de camadas, chrome global, renderer |
| 2 — ler e observar | Estado Só observar, legibilidade no céu claro e prioridade contextual das marcações se a composição do piloto exigir | `LabelCanvas.ts`, `three/director/rotulos.ts`, `atlasConfig.ts`, `HudDoAtlas.tsx`, `useChromeDoFilme.ts`, CSS | Alteração de emissão, exposição, dados ou catálogo |
| 3 — continuidade | Endereços estáveis dos instrumentos entre Atlas/filme/voo, rótulo Retomar filme quando existe retomada, Tempo e escala com hierarquia comum | `BarraOuAlcas.tsx`, `Hud.tsx`, `HudDoAtlas.tsx`, `App.tsx`, `tempoDoAtlas.ts`, `useDirector.ts` | Novo filme, transição universal entre poses, novo relógio |
| 4 — ampliar repertório | Aplicar a mesma linguagem a Terra/Lua, Júpiter e revelação galáctica; fechamento integrado | cadastro de destinos, ficha/editorial e roteiro existente apenas se necessário para ponto já existente | Motor de tours, conteúdo em massa ou reforma geral |

O piloto precisa provar a assinatura antes de espalhá-la. A revisão do dono ocorre sobre uma versão local utilizável, com comparação visível. Não exigir aprovação intermediária para cada ajuste reversível dentro do lote. Se o piloto não funcionar visualmente, corrigir o piloto; não compensar espalhando decoração.

### Pontos de integração confirmados

- Destino Saturno hoje passa por `escolherAlvo` e `Director.focarNoCorpo('saturn', 'orbita')`. A aproximação existe em `Director.aproximarDoCorpo()`. Compor a intenção editorial nessa fronteira, sem contornar `Escada` ou usar dois cliques artificiais/temporizadores. Preservar abertura de ficha e estado de seleção do fluxo do App. Confirmar o comportamento assíncrono ao integrar.
- `Director.focarNoCorpo('titan')` encaminha a `Escada.focarNaLua`; a relação pai/filha já existe. Não inventar uma função de enquadramento de todas as luas.
- `entrarNoAtlas()` guarda o ponto do filme; `partirDoAtlas()` restaura o tempo e a orientação guardados, inclusive pausa. A pose manipulada no Atlas NÃO vira nova pose do filme. “Retomar filme” usa esse contrato. “Ver filme desde o começo” continua ação distinta e explícita.
- `useGavetas` é dono das cinco gavetas; `movimentoDaGaveta` é dono da presença e gesto. `AREAS_RESERVADAS`, `reservarParaAFicha` e o retângulo útil mantêm a câmera e os rótulos fora dos painéis. Não duplicar nenhum desses mecanismos.
- `BarraDoTempo` atende desktop e gaveta móvel. `maquinaDoTempo` e o `jd` do Director continuam únicos. A lista de destinos estende o cadastro existente; não criar índice paralelo.

## 10. Aceite do piloto

1. Entrar por “Saturno — Os anéis, de perto” entrega Saturno aproximado sem precisar descobrir o botão Aproximar; pesquisa digitada mantém sua navegação atual.
2. Saturno e anéis cabem no espaço reservado em 1440×900 e 390×844; abrir/fechar/expandir a ficha não corta o objeto ou produz salto de câmera. Em tela mínima, priorizar controles legíveis e reenquadramento em vez de encolher tudo.
3. “Visitar Titã”, retorno ao pai e Sistema Solar funcionam por mouse, teclado e toque; não aparecem dados de Saturno sob o título Titã enquanto o carregamento termina.
4. A ficha acrescenta a observação curta, preserva seções e fontes e suporta PT/EN. Dado ausente tem estado honesto; falha de dado não impede voltar ou explorar.
5. A composição tem hierarquia em repouso; não depende de congelar o halo no quadro mais luminoso. Mostrar ao dono a sequência em velocidade real e fotos assentadas, com a mesma data/preset nas comparações.
6. Conferir 320×568 com texto a 140%, 390×844, 760/761, 1440×900 e 844×390; verificar tabulação, foco ao fechar/trocar, Esc e movimento reduzido. Emulação não equivale a telefone físico; declarar precisamente quais superfícies foram verificadas.
7. Verificar a cena clara do gás e a escura de Saturno para texto/controles legíveis. Como alvo de implementação, contraste mínimo 4,5:1 no texto normal, 3:1 no grande e nos limites/estados essenciais de controles; confirmar pelo estilo efetivo contra fundo protegido. Não declarar contraste do céu variável por amostragem única.
8. Medir baseline e piloto no mesmo navegador, viewport, DPR e preset, com a receita de Chrome visível do projeto; comparar movimento de câmera e instrumento. Meta: sem trabalho de GPU novo em repouso e sem regressão sustentada acima de 5% no tempo de quadro em rodadas pareadas; se a variância impedir conclusão, dizer inconclusivo. A meta é de projeto, ainda não medida. Não prometer 60 fps universais.
9. Rodar só testes pertinentes enquanto trabalha; acrescentar apenas cobertura necessária para os comportamentos novos. Executar `npm run done` uma vez ao final. Juízes afetados e comparação visual são complementares; teste de texto de CSS não prova qualidade de interação.
10. Um commit do lote; nada publicado. Não atualizar referência visual reprovada só para fazer o teste passar. Não declarar “AAA alcançado” por passar a suíte.

## 11. Prompt pronto para o próximo executor

> Execute somente o Lote 1 de `docs/DIRECAO-UX-AAA.md`: o piloto Saturno/Titã da direção Observatório vivo. A direção de produto já foi escolhida; não faça nova pesquisa estética, não ofereça estilos alternativos e não implemente os outros lotes. Leia as decisões e o aceite desse documento, `AGENTS.md`, `docs/NORTE.md` e apenas o bastão atual. Confira a base atual antes de editar: o halo já foi adotado no celular e a folha flutuante de 12 px já existe. Preserve os mecanismos atuais de câmera, foco, gavetas, gesto, ciência e renderer.
>
> Entregue um percurso local utilizável: convite “Saturno — Os anéis, de perto” que chega ao corpo aproximado, ficha com a leitura curta “Um mundo de anéis”, acesso às informações completas e ação “Visitar Titã”, com retorno ao pai e ao Sistema Solar. Use as APIs e os dados existentes; a busca digitada mantém seu comportamento. Faça desktop e celular como especificado. Não altere dados científicos, presets, exposição, filme, halo ou o plano de gás. Não crie motor de tours, catálogo paralelo, nova dependência ou componentes genéricos para necessidades futuras.
>
> Primeiro confira a navegação real e faça uma comparação antes/depois reproduzível. Implemente e ajuste o próprio piloto até a composição funcionar em repouso e em movimento; não substitua a demonstração por uma imagem gerada ou um texto de intenção. Verifique os itens de aceite aplicáveis ao lote e relate os limites de aparelho/navegador e desempenho. Não invente aprovação, qualidade AAA ou funcionalidade que não demonstrou. Termine com versão local revisável, imagens e sequência em velocidade real, testes pertinentes e `npm run done`, um commit e nenhuma publicação. Se uma diferença no código impedir a solução especificada, explique a diferença concreta e resolva a integração mínima; não reabra silenciosamente a direção criativa.

## 12. Estado desta entrega

Investigação e decisão concluídas. Documento executivo entregue. O estudo visual apresentado na conversa usa uma captura real de Saturno com rótulos e órbitas desligados para estudar composição; sua leitura/ocultação de instrumentos é demonstrativa, sem simulação de câmera ou tempo. Os lotes 1–4 ainda não foram executados. Nenhum código de produto foi alterado nesta entrega.

Verificação da entrega: `npm run done` passou (typecheck, lint, 103 arquivos de teste, 3.053 testes aprovados e 1 ignorado). `git diff --check` passou. Na demonstração, alternância leitura/contemplação e abertura de informação funcionaram; composição desktop e 390 px inspecionadas no navegador embutido, sem erro de console. Essas verificações não são validação do piloto futuro nem de desempenho do produto redesenhado.
