# UI expressiva e futurista — auditoria e plano de movimento

Data: 09/09/2026. Base auditada: commit `e9a5977`. Entrega da rodada da auditoria: só este relatório. A execução começou no mesmo dia, a partir do commit `f02b57b` — o que já foi feito está no registro no fim da seção 8.

Direção escolhida pelo dono nesta conversa: **“Mais expressiva e futurista, com luz e efeitos especiais perceptíveis.”**

Este documento é a referência para uma futura IA implementar o movimento da interface. As fases abaixo são trabalho futuro, não trabalho já executado nem autorização para publicar. Ler o `AGENTS.md` vigente antes de começar. O `PLAN.md` existente trata de gás volumétrico: não o substituir por este plano.

## 1. Parecer sobre o relatório do Antigravity

**As sugestões são um bom começo, mas o relatório não mapeou toda a interface.** Ele cobre menus, painéis e alguns controles; deixa sem tratamento a abertura, a cartografia do carregamento, falhas, encerramento, vários estados assíncronos, indicadores no céu e transições entre modos. Também mistura recomendações de produto com afirmações técnicas não demonstradas.

O documento original foi lido em `~/.gemini/antigravity-cli/brain/26717993-5ebd-405f-b02c-428d99075285/mapeamento_completo_animacoes_ui.md`. As conclusões necessárias estão registradas aqui; a implementação não depende desse arquivo externo.

### Método e limite da evidência

- Leitura do ponto de composição `App.tsx`, componentes de UI, hooks de interação, nove fatias de CSS e integrações com câmera, rótulos, carregamento e testes; três auditorias auxiliares somente de leitura, revisadas na sessão principal.
- O inventário da seção 3 acompanha as superfícies renderizadas e suas variantes. Agrupa controles que compartilham comportamento; não significa que cada combinação possível de estado foi executada.
- **Não houve sessão visual, medição de desempenho nem teste em aparelho físico nesta auditoria.** Durações existentes são fatos do código; durações propostas e limites de desempenho são parâmetros para validação futura.
- Linhas citadas correspondem ao commit acima. Localizar também o símbolo/classe: as linhas mudarão durante a implementação. Comentários antigos podem divergir do comportamento; prevalecem JSX, condições, CSS efetivo e chamadas reais.
- Cobertura da interface não é leitura de “100% do repositório”. Shaders e dados científicos só entram quando afetam a proposta; não foram auditados integralmente.

### Correções que precisam acompanhar as ideias originais

| Afirmação/proposta original | O que a leitura permite afirmar | Consequência para o plano |
| --- | --- | --- |
| “60 FPS estáveis”, custos “zero” ou “quase zero” | Não foram apresentados perfis. O próprio `PLAN.md` registra cenas pesadas acima de 60 ms/quadro em outra rodada; isso não é uma medição desta auditoria. | Medir a diferença com/sem efeito na mesma cena. Não prometer 60 FPS universais. |
| Toda animação deve usar apenas transform/opacity, mas sanfonas usam grid e filetes usam height | `09-celular.css:487` já declara transições de altura; `grid-template-rows` também envolve layout. Cor/borda/sombra podem exigir pintura. | Preferir composição; aceitar layout pontual explicitamente, com medição. Não chamar grid de “sem reflow”. |
| Preservar só a caixa final resolve a câmera | `App.tsx:429` e `:458` leem `getBoundingClientRect`; a medição pode ocorrer durante o movimento. Transformações também afetam o retângulo visual. | Separar caixa de referência e decoração móvel; definir reserva durante entrada, saída e troca. |
| `--blur-painel: 0px` seria uma proibição universal já implementada | É a pele atual dos painéis, em `01-base.css:98`; a bússola ainda usa `backdrop-filter: blur(6px)` em `04-atlas.css`. | Manter os painéis opacos; não alegar que todo o HUD está sem blur nem que o custo específico foi medido. |
| `:active` inexiste em todo o HUD | Não há o feedback de pressão proposto nos botões, mas existe `.scene-canvas.arrastavel:active` em `01-base.css:206`. | Formular a lacuna por família de controles, sem generalizar para o canvas. |
| Switch tem interpolação linear | A esfera já usa `var(--curva)` em `04-atlas.css:1398`. | Refinar o movimento existente; não apresentar como animação nova. |
| `.shot-mode` alcança todas as propostas | `Ajuda.tsx:190` cria portal em `document.body`; `07-foto.css:4` só alcança descendentes da raiz com a classe. CSS também não cancela animações WAAPI ou loops JS. | Política explícita para portais, JS e efeitos de cena. |
| `allow-discrete` sozinho resolve a dica | Há `hidden` e uma transição de opacity, mas falta também um estado de opacidade fechada. É necessário definir entrada, saída, suporte e posicionamento. | Receita completa e fallback imediato; manter a semântica de dica fechada. |
| Preservar foco significa prender todos os painéis | `FichaDoObjeto.tsx:153` passa `modal: false`; `dialogFocus.ts` respeita essa exceção. | Ficha continua não modal, inclusive no telefone. |
| Scrim que fecha a folha seria apenas animação | Seria uma nova superfície com impacto no clique/arrasto da cena e na seleção com a ficha aberta. | Não adicionar bloqueio global. Se houver véu decorativo, ele é não interativo. |
| Bússola pode apontar para o Norte Galáctico com CSS | `Bussola` recebe apenas `acesa`/`onEndireitar`; `atlasRig.ts:1168` expõe desvio do horizonte segundo o polo da vista, não azimute galáctico. | Se evoluir, mostrar inclinação real do horizonte e transmitir esse dado; não inventar um norte. |
| “Ao vivo” corresponde a relógio atômico | `maquinaDoTempo.ts:290` relê `new Date()` na cadência do relógio do app. | Chamar de relógio do dispositivo. Não acrescentar alegação científica. |
| O Spotlight sempre desloca um furo entre passos | `passosDoConvite.ts` usa `alvo: null` nos roteiros do Atlas; o voo livre tem alvos. | Atlas anima cartão/passos. Interpolação do recorte só se aplica onde há alvos reais. |
| `#spotlight-furo rect` basta para animar o recorte | Esse seletor alcança os dois retângulos dentro da máscara, inclusive o fundo branco; a borda destacada está fora dela (`Spotlight.tsx:127`). | Identificar recorte e contorno separadamente e movê-los juntos. Provar interpolação SVG no navegador-alvo. |
| Preview da barra inexiste | Os ticks já têm `title={k.text}` em `Hud.tsx:517`. | Existe dica nativa do capítulo; uma prévia rica seria uma funcionalidade adicional. |
| Seletores e hierarquia podem permanecer todos intactos | Indicador móvel, chevron único, conteúdo persistente e scrim podem exigir mudanças no JSX. | Tratar explicitamente DOM, foco, áreas reservadas e seletores de testes. |

## 2. Direção visual: um observatório que responde

O refinamento deve ser perceptível. Ao abrir uma ferramenta, a aba acende e uma faixa luminosa percorre brevemente a borda interna do painel. Ao escolher outro corpo, o contexto e a ficha respondem juntos. No toque, a folha acompanha o dedo; ao soltar, assenta com precisão. Durante a leitura, o instrumento repousa.

Manter a pele existente: âmbar, fundos escuros, Inter para controles e Fraunces para momentos editoriais. O futurismo vem de luz, continuidade e relação entre ação e resposta; não exige trocar tipografia, acrescentar néon em todas as linhas ou mudar o layout aprovado.

### Cinco movimentos de assinatura

1. **Luz de abertura.** Filete âmbar ativo cresce por `scaleY` na régua ou `scaleX` nas alças; no painel, um reflexo curto atravessa uma faixa decorativa de borda. Entrada em 200–260 ms; reflexo termina até 400 ms. A luz não passa por cima do texto e não reinicia quando um dado muda.
2. **Seleção contínua.** Segmentado desloca seu sublinhado; nome e contexto confirmam a nova seleção com um único realce de 160–220 ms. Sem deslizar toda a linha de dados nem contar valores intermediários fictícios.
3. **Toque físico.** O desenho interno do botão comprime até 0,97, mantendo sua caixa clicável. Ícone da alça pode assentar uma vez em 180 ms; não combinar pressão, rotação, salto e brilho em todo clique.
4. **Folha guiada pela mão.** Preservar o arrasto atual. Expansão para cima acontece somente pela alça explícita; o conteúdo continua rolável. Deslocamento segue o dedo sem easing; a soltura usa assentamento curto.
5. **Um acento óptico especial.** Protótipo posterior de WebGL2 para o instante de ativar um painel: brilho direcional curto no limite exterior da superfície, preso à geometria da UI. Comparar com a versão CSS e só integrar se a diferença visual justificar custo e manutenção. Especificação na seção 7.

### Roteiro de percepção para a primeira demonstração

| Ação | Resposta desejada | Quando termina |
| --- | --- | --- |
| Abrir Camadas na régua | Aba acende; painel revela conteúdo e borda recebe reflexo | Conteúdo assentado em 200 ms; reflexo até 400 ms |
| Trocar Camadas por Ajustes | Moldura permanece; corpo troca com fade curto; aba ativa muda | Até 160 ms, sem fechar e reabrir a folha |
| Escolher Saturno | Seleção acontece imediatamente; contexto e nome confirmam juntos | Realce de até 220 ms; câmera mantém sua animação própria |
| Expandir ficha com o dedo | Alça responde e folha acompanha; conteúdo não fica elástico | Enquanto arrasta; assentamento de até 260 ms |
| Copiar link | Resultado real dispara confirmação luminosa e texto existente | Até 200 ms; mensagem segue o tempo funcional atual |
| Interromper a animação com outra ação | Novo estado vence a animação anterior | Sem fila de cliques, sem aguardar acabamento |

Esses valores são pontos de partida de design. Não somar durações sequencialmente para atrasar o comando.

## 3. Inventário de superfícies e estados

Legenda: **ampliar** = oportunidade descrita insuficientemente no original; **ausente** = não recebeu tratamento próprio; **preservar** = já existe movimento relevante. Cada linha exige a política transversal da seção 4, mesmo quando não repete teclado, touch ou reduced motion.

### Abertura, filme, voo e falhas

| ID | Superfície e fonte | Estado real / cobertura original | Decisão de movimento |
| --- | --- | --- | --- |
| U01 | `LoadingVeil`, `Hud.tsx:37`; `CartografiaCanvas.ts`; `05-loading.css` | Carregando por etapas, pronto, erro, modo estático; **ausente**. Já há cartografia animada e núcleo que se funde à abertura. | Preservar composição. Acentuar só a etapa que realmente mudou; não inventar percentual nem tempo restante. |
| U02 | Telemetria, trilho e anúncio, `Hud.tsx:125` | Compacto/mesa; marcos concluídos/atual; região viva; **ausente**. | Um realce por etapa, sem embaralhar números. Leitor de tela recebe só o anúncio existente. |
| U03 | Falha no boot ou em voo, `Hud.tsx:192`; `App.tsx:1202` | Mensagem, detalhes técnicos, tentar novamente; **ausente**. | Erro aparece imediatamente. Fade breve do acabamento, sem tremor da tela e sem loop alarmista; retry funciona mesmo sem WebGL. |
| U04 | Abertura, `TitleVeil`, `Hud.tsx:224` | Atlas principal, filme com duração, voo livre; **ausente**. Véu persistente já transiciona. | Um reflexo de apresentação no CTA principal ao ficar disponível; secundários compartilham pressão/foco, sem espera para clicar. |
| U05 | Tarjas, `App.tsx:813`; `02-filme.css:21` | Entram/saem por fase; animação de altura já existe; **ausente**. | Preservar ritmo cinematográfico. Não reescrever por dogma de compositor; revisar apenas se medição apontar custo. |
| U06 | Legenda, `Caption`, `Hud.tsx:415`; `02-filme.css:67` | Texto/subtexto remonta por capítulo, entrada de 1,4 s; **ausente**. | Preservar sincronia do roteiro. Se suavizar saída, não atrasar o capítulo novo nem duplicar anúncio acessível. |
| U07 | Chrome, `useChromeDoFilme.ts`; `03-controles.css:124` | Visível, oculto por inatividade, pausado, interação; **ampliar**. | Revelação rápida e saída mais lenta, em família com transporte e progresso. Foco/uso mantém controles alcançáveis. |
| U08 | “Mais”, `BarraOuAlcas.tsx:573` | Três ferramentas montadas condicionalmente; **ampliar**. | Revelação conjunta de 120–160 ms; escalonamento opcional de 20 ms, teto total 200 ms. Resolver fechamento e foco, não só entrada. |
| U09 | Transporte, `BarraOuAlcas.tsx:616` | Pausar/retomar, taxa, salto à galáxia; cartão é irmão da barra; **ampliar**. | Ícone troca com fade/escala curta. Taxa confirma uma vez. Evitar girar Play 90°: sua direção comunica significado. |
| U10 | Progresso, `Hud.tsx:436`; `02-filme.css:137` | Fill já usa scaleX; scrub com captura de ponteiro; setas; ticks com title; **ampliar**. | Espessura visual por scaleY em camada interna, alvo intacto. Thumb em foco/arraste, sem brilho permanente; não suavizar o valor contra o dedo. |
| U11 | Rumo, distância do Sol, lente, `App.tsx:883` | Valores atualizados pelo estado da viagem; **ausente**. | Realçar troca semântica de destino; números vivos sem tween ou fade a cada atualização. |
| U12 | Voo livre e captura do mouse, `App.tsx:833` | Dicas mouse/toque, captura solicitável/ativa/negada, pausa; **ausente**. | Confirmar captura/negação por estado real. Preservar WASD e `preventDefault` do mouse que evita roubar foco. |
| U13 | Vinheta warp, `App.tsx:810`; `04-atlas.css:1699` | Opacidade dirigida por `--warp`; **ausente**. | Manter ligada à velocidade do voo; não reutilizar warp para indicar clique em menu. |
| U14 | Encerramento, `Hud.tsx:319`; `encerramento.ts`; `02-filme.css:357` | Citação escalonada, crédito, fonte, ações; **ausente**. | Preservar cadência e “Ficar neste céu” principal. Realce único no CTA; botões disponíveis sem depender de fim de animação decorativa. |
| U15 | Mudança Atlas/filme/voo, `App.tsx:1181`; `director/veu.ts` | Véu de 0,45 s por metade, reposicionamento no escuro; **ausente**. | Reutilizar a travessia existente. Não adicionar voo físico fictício nem nova transição global concorrente. |

### Atlas, navegação e observação

| ID | Superfície e fonte | Estado real / cobertura original | Decisão de movimento |
| --- | --- | --- | --- |
| U16 | Marca e contexto, `BarraOuAlcas.tsx:145`, `:391` | Breadcrumb, alvo atual, acesso ao sistema/corpo/ficha; **ausente**. | Continuidade da seleção: realce curto no trecho alterado, mantendo largura/âncoras e sem animar toda a marca. |
| U17 | Régua, `BarraOuAlcas.tsx:652`; `04-atlas.css` | Quatro abas, aberta/fechada, ficha indisponível; **ampliar**. | Filete e reflexo interno; foco visível imediato. Ficha indisponível não responde como ação válida. |
| U18 | Alças, `BarraOuAlcas.tsx:674`; `09-celular.css` | Cinco portas conforme modo, fileira rolável, ficha apagada sem alvo; **ampliar**. | Mesmo vocabulário da régua com eixo horizontal. Animar ícone, manter alvo mínimo e rolagem lateral. |
| U19 | Barra e qualidade, `BarraOuAlcas.tsx:296`, `:332`, `:425` | Varia por modo; preset/medição; sair/retomar filme; **ampliar**. | Troca de valor com confirmação curta, sem pulsar a cada amostra de desempenho. Nenhum encolhimento da caixa. |
| U20 | Painéis compartilhados, `useGavetas.ts`; `01-base.css:254` | Cinco identidades exclusivas; mobile retém saída; mesa desmonta; **ampliar**. | Contrato único de presença e de interrupção, com origem espacial apropriada. Seções 5 e 6. |
| U21 | Cabeçalho, `CabecalhoDoPainel.tsx:48` | Sticky, alça, título, eyebrow, ajuda, fechar, ação opcional; **ausente**. | Cabeçalho permanece legível. Luz contorna superfície; não aplica escala ao texto nem desloca o sticky. |
| U22 | Camadas, `HudDoAtlas.tsx:98` | Famílias, contagens, linha/checkbox, ajuda; **ampliar**. | Resposta da linha e switch; contagem muda de imediato. Realce visual não espera a cena terminar de renderizar. |
| U23 | Selo resumo, `HudDoAtlas.tsx:234`, `:439` | Real/assistido, discrição na mesa, posição própria no celular; **ampliar**. | Preservar discrição de repouso; realce curto quando o usuário altera algo que muda o selo. |
| U24 | Selo detalhe, `HudDoAtlas.tsx:344` | Escala, brilho, causas, procedência, ações nem sempre reversíveis; **ampliar**. | Entrada/saída a partir do resumo, 160 ms. Confirmar ação efetivada; não fingir que todo desvio é removível. |
| U25 | Bússola, `HudDoAtlas.tsx:503`; `atlasRig.ts:1168` | Fade já existe; visibilidade por histerese; **ampliar**. | Pressão no ícone e assentamento ao endireitar. Evolução opcional: indicador fiel de inclinação; não uma agulha galáctica inventada. |
| U26 | Tempo compacto/expandido, `HudDoAtlas.tsx:568` | Cabeçalho, expansão por interação, Esc, aviso persistente; **ampliar**. | Abrir corpo em 160–200 ms; preservar posição do cabeçalho e aviso. Sem subir/baixar câmera em cada efeito. |
| U27 | Tempo: controles, `HudDoAtlas.tsx:800` | Passado/parado/futuro, taxa, ao vivo, época, limites/avisos; **ampliar**. | Sinal de direção uma vez ao mudar; estado persistente por ícone/cor/texto. Data sem contagem animada adicional. |
| U28 | Gaveta Tempo, `HudDoAtlas.tsx:907` | Reusa BarraDoTempo no telefone; **ampliar**. | Mesmas regras de estados do rodapé; sem criar uma segunda implementação de tempo. |
| U29 | Nomes e marcadores no céu, `LabelCanvas.ts`; `director/rotulos.ts` | Canvas 2D sobre WebGL, destaque e disputa de espaço; **ausente**. | Preservar animações/hit-test existentes. Um acento de seleção só no marcador escolhido, sem fazer todas as estrelas pulsarem. |
| U30 | Rótulos 3D opcionais, `world/rotulos3d.ts`, Director e `Ajustes.tsx:606` | Caminho específico existente, com seletor ligado/desligado fora do Avançado; **ausente**. | Não migrar textos de menus para 3D. Manter decisão de colisão do 2D, coerência de seleção e desligar decoração extra em captura científica. |

### Busca, ficha, ajustes e ajuda

| ID | Superfície e fonte | Estado real / cobertura original | Decisão de movimento |
| --- | --- | --- | --- |
| U31 | Campo de busca, `PaletaDeBusca.tsx:145`, `:312` | Foco inicial na caixa no celular; campo na mesa; consulta diferida; **ampliar**. | Campo permanece estável e editável. Nada de animação por tecla nem atraso na composição/IME. |
| U32 | Destinos e filtros, `PaletaDeBusca.tsx:364` | Categoria, cartões, miniaturas, imagem ausente; **ampliar**. | Sublinhado do filtro; cartões entram uma vez, com luz/elevação discreta só em hover capaz. Toque confirma sem depender de hover. |
| U33 | Resultados e vazio, `PaletaDeBusca.tsx:412` | Seleção por setas, Enter/clique, aviso, contagem, limpar; **ampliar**. | Crossfade apenas entre categorias de conteúdo (destinos/resultados/vazio), não a cada consulta. Estado ativo e confirmação imediatos. |
| U34 | Ficha: alvo/cabeçalho, `FichaDoObjeto.tsx:360`, `:398` | Corpo/estrela, classe, nome, compacta; **ampliar**. | Um acento coerente com contexto, sem remontar o painel todo ao trocar alvo. Nunca mostrar nome novo com dados antigos. |
| U35 | Ficha: compacta/expandida e janela baixa, `FichaDoObjeto.tsx:294`, `:424`; `06-responsivo.css`; `09-celular.css:487` | Foco é ajustado; altura/max-height já transicionam; **ampliar**. | Aprimorar gesto sem competir com altura/foco; desktop baixo também entra na validação. |
| U36 | Ficha: Aproximar/Sistema, `FichaDoObjeto.tsx:459` | Ações condicionais conforme degrau; **ampliar**. | Feedback da família de botões. Comando de câmera imediato; ícone não deve simular uma chegada antes dela ocorrer. |
| U37 | Ficha: introdução/Ler mais/vazia, `FichaDoObjeto.tsx:488` | Texto, salto para seção, ausência de ficha; **ausente**. | Realce curto da seção de destino. Respeitar leitura/rolagem e reduced motion; sem efeito de digitação. |
| U38 | Ficha: carregando/dados/texturas/erro, `FichaDoObjeto.tsx:534` | Esqueleto estático, falhas independentes, retry; **ausente**. | Esqueleto continua estático por padrão. Dados entram com fade curto; falha fica imediatamente legível. Sem shimmer infinito. |
| U39 | Ficha: seções e conteúdo, `FichaDoObjeto.tsx:565` | Acordeões, valores, badges, procedência, links; **ampliar**. | Chevron único; expansão curta com layout assumido e medido. Conteúdo fechado não recebe Tab. Valores científicos mudam diretamente. |
| U40 | Ficha: relevo da cor, `FichaDoObjeto.tsx:638` | Checkbox e ajuda de representação; **ausente**. | Mesmo switch das Camadas, preservando indicação de representação inferida. |
| U41 | Ajustes básicos, `Ajustes.tsx:328` | Idioma, escala de texto, qualidade, medida, exposição; **ampliar**. | Indicadores consistentes. Slider acompanha a mão, número tabular sem tween; troca de idioma/escala recalcula indicador sem viajar pela tela. |
| U42 | Ajustes Avançado, `Ajustes.tsx:454` | Expansão, tom, amostras, nebulosa, escala, gás, partículas e opções do painel; **ausente** como estado. | Mesma regra de acordeão da ficha; manter distinção entre opção escolhida e valor efetivo do preset. |
| U43 | Copiar link, `Ajustes.tsx:641` | Sucesso, falha, aviso, campo selecionado para cópia manual; **ausente**. | Confirmação só após sucesso real. Falha tem fade breve, sem shake; campo recebe foco/seleção já existentes. |
| U44 | Rever convite, `Ajustes.tsx:626` | Fecha ajustes e inicia tour conforme modo; **ausente**. | Não acumular saída do painel e espera de entrada do tour. Interromper decoração anterior. |
| U45 | Segmentados, `Segmentado.tsx:27`; `08-ajustes.css:282` | `.on`, `.efetivo`, grupos com larguras diferentes; **ampliar**. | Sublinhado móvel dentro da moldura; medir segmento real. Grupos mistos de ações no Tempo não viram seleção exclusiva artificialmente. |
| U46 | Switches, `04-atlas.css:1370` | Trilho/esfera já transicionam; **ampliar**. | Assentamento sutil opcional, limitado ao trilho. Pressão não substitui translateX do estado marcado. |
| U47 | Ajuda, `Ajuda.tsx`; `useDicaPresa.ts` | Hover/foco/presa, Esc/clique fora, portal, inversão de lado, scroll/resize; **ampliar**. | Fade curto após posicionamento; dica segue âncora sem animar coordenadas de correção. Política de portais e estado lógico explícita. |
| U48 | Convites Atlas/voo, `Spotlight.tsx:100`; `passosDoConvite.ts` | Passos, pular/continuar/entendi, alvo válido/ausente; **ampliar**. | Cartão confirma avanço. No voo, recorte e contorno viajam juntos; Atlas mantém versão sem alvo. Tour continua não modal. |

### Arquivos transversais que o executor precisa ler

`src/App.tsx`, `src/index.css`, `src/hud/01-base.css` até `09-celular.css`, todos os componentes citados na matriz, `Icone.tsx`, `hooks/useGavetas.ts`, `useDicaPresa.ts`, `useChromeDoFilme.ts`, `useCelular.ts`, `useAtalhos.ts`, `useDirector.ts`, `useEspelhoDaUrl.ts`, `lib/dialogFocus.ts`, `lib/uiScale.ts`, `lib/idioma/{pt,en}.ts`, `three/fases.ts`, `three/cinematic/retanguloDoAtlas.ts` e os trechos do Director que ligam a UI à cena. Para U29/U30 e WebGL, acrescentar os arquivos da seção 7. Não criar uma abstração antes de procurar o mecanismo existente.

## 4. Gramática comum e políticas de estado

### Tokens propostos

Preservar nomes e valores atuais onde já cumprem o papel; adicionar apenas o necessário. Os números abaixo não são uma ordem para retimar animações cinematográficas existentes.

| Uso | Duração inicial | Curva / movimento |
| --- | --- | --- |
| Pressão | 70 ms | Saída rápida, escala interna 1 → 0,97 |
| Hover, cor, foco decorativo | `--t-rapido`, 120 ms | `--curva` atual; outline de foco aparece imediatamente |
| Troca de conteúdo local | 120–160 ms | Opacidade; sem viajar texto por longas distâncias |
| Entrada de painel desktop | `--t-normal`, 200 ms | `--curva`; até 8 px a partir da borda de origem |
| Saída de painel desktop | 140–160 ms | Aceleração suave; estado lógico fecha imediatamente |
| Folha mobile | `--t-folha`, 260 ms | Curva existente `cubic-bezier(0.22, 1, 0.36, 1)` |
| Assentamento de ícone | 180 ms | Um pequeno retorno; nunca exceder o espaço do controle |
| Reflexo de abertura | 320–400 ms | Passagem única; mesma textura luminosa por família |

Um `cubic-bezier` com overshoot é apenas uma curva, não física de mola. Só usar uma mola dinâmica se um gesto realmente precisar de velocidade/retargeting e se o mecanismo atual não servir. Não adicionar biblioteca para renomear três transições.

### Contrato obrigatório por estado

| Estado | Regra |
| --- | --- |
| Repouso | Nenhum novo loop decorativo permanente. Cartografia/filme/indicadores científicos continuam com seus ciclos existentes. |
| Hover | Somente onde hover é capacidade real; não inferir mouse pela largura. Mouse em tela pequena e touch em tela grande são casos válidos. |
| Foco | Outline aparece no mesmo estado que recebe foco; decoração nunca é o único indicador. |
| Pressionado | Caixa de toque e posição do controle continuam estáveis; cancelar também em gesto abortado. |
| Selecionado | Texto/ARIA/valor mudam no ato. Movimento ilustra a mudança sem segurar a ação. |
| Indisponível | `disabled` e `aria-disabled` mantêm seus contratos. Não animar como confirmação de sucesso. |
| Carregando | Usar estados reais existentes; não criar espera artificial para exibir o efeito. |
| Erro | Mensagem imediatamente acessível. Sem flash de tela, sacudida ou redução de legibilidade. |
| Saindo | Visual pode permanecer brevemente; foco, hit-test e semântica já devem obedecer ao fechamento. |
| Interrompido | A intenção mais recente vence. Cancelar finalizadores antigos e limpar estilos temporários. |
| Redimensionado | Recalcular geometria, cancelar trajetória desatualizada e assentar no estado válido. |

### Movimento reduzido e captura

- Em `prefers-reduced-motion: reduce`, retirar translação, escala elástica, reflexos viajantes e WebGL decorativo; usar troca direta. Um fade curto só se necessário para compreensão. A preferência vale também se mudar com o app aberto.
- Em `?shot=1`, desenhar imediatamente o estado final determinístico. Nada pode esperar `animationend` para se tornar correto.
- Em `?shot=2`, nenhum efeito decorativo de UI entra no canvas da cena. Esse caso é especialmente importante se o efeito usar o renderer existente.
- Dicas em `document.body` precisam receber a política de captura explicitamente: estado estático em `shot=1` e nenhuma dica visível em `shot=2`. O reset atual de descendentes de `.shot-mode` não é uma política universal; ocultar filhos de `.bare-mode` também não alcança portais no body.
- Não aplicar `transform: none` indiscriminadamente: isso pode apagar o deslocamento estrutural de um switch marcado ou o alinhamento de uma bússola.
- Não usar `transition: all`. Não promover todas as superfícies com `will-change`; só após evidência de necessidade e liberando recursos depois.

## 5. Presença, geometria e foco: a parte que evita regressões

### Uma gaveta ativa, uma intenção atual

Estender `useGavetas`, que já distingue `gaveta` e `montada`. Não implantar um segundo gerenciador de presença em cada componente. Modelo conceitual: fechado → entrando → aberto → saindo → fechado; trocar A por B substitui conteúdo sem um percurso completo de saída/entrada. Não é obrigatório criar um enum adicional se os estados atuais puderem expressar o contrato.

O plano de execução deve resolver estes casos antes de espalhar animações:

1. **Fechar:** desativar interação/semântica da saída, devolver foco no fechamento lógico e terminar a decoração. Hoje os componentes recebem a presença `montada`; conferir a integração com `useDialogFocus` para não conservar o focus trap só porque o nó visual ainda existe.
2. **Reabrir durante saída:** cancelar desmontagem antiga e remover `inert`/estilos de saída. Um timeout antigo nunca pode fechar a gaveta recém-aberta.
3. **Trocar gaveta:** uma única região ativa e um único contrato `data-dialogo`. Não sobrepor dois diálogos vivos para conseguir crossfade. Se houver representação visual antiga, ela precisa ser estritamente decorativa, sem IDs, links ou anúncios duplicados; preferir troca simples de conteúdo.
4. **Busca → ficha:** preservar `aoFechar(atual, qual)` e a escolha adiada já documentada em `PaletaDeBusca`. A saída tardia da busca não fecha a ficha nova.
5. **Fase/viewport muda:** finalizar ou cancelar movimento; limpar temporizadores, listeners e estilos inline. Foco retorna a um destino conectado e válido no novo modo.
6. **Duração zero, captura ou preferência reduzida:** concluir sincronamente. Não depender exclusivamente de evento de transição, que pode não acontecer.

Usar CSS para feedback simples. Para presença interrompível, WAAPI pode ser o controlador de acabamento dentro do mecanismo existente; guardar/cancelar a animação e tratar a rejeição de `finished` quando cancelada. O estado React continua sendo a verdade funcional. Não manter dois relógios discordantes (por exemplo, 260 ms no TS e outra duração CSS). Escolher uma fonte compartilhada ou ler o token efetivo uma vez por transição, nunca medir estilos a cada frame.

### Caixa de referência não é decoração

`App.tsx` reserva áreas para rótulos e mede a ficha para a câmera. `ResizeObserver` não acompanha translação pura. Animar o elemento medido e esperar que a caixa final se corrija sozinha pode deixar uma reserva intermediária.

Preferência: conservar o nó-raiz de `[data-dialogo]` como referência estável e animar conteúdo/acabamento interno. Manter o diálogo como filho direto de `.hud-root`, preservando os contratos de `AREAS_RESERVADAS`, `MutationObserver` e `.bare-mode`. Se uma folha inteira precisar se deslocar, a reserva deve ser definida de forma conservadora durante o movimento e refeita ao assentar/cancelar, sem varrer o DOM por quadro. Não introduzir um wrapper externo que quebre os seletores existentes.

Na câmera, preservar o teto atual da reserva da ficha compacta no celular; expandir uma seção não deve afastar o corpo no céu. Na saída, não liberar a área dos rótulos enquanto ainda houver superfície opaca por cima deles. No repouso, as reservas devem corresponder ao layout real, inclusive após fonte, idioma e escala de UI mudarem.

### Acordeões

Aplicar a mesma regra à ficha e ao Avançado dos Ajustes. Manter um chevron só. Se usar grid de `0fr` a `1fr`, tratar isso como layout animado, usar filho com `min-height: 0` e overflow adequado, limitar o trabalho ao painel e medir o resultado. Ao fechar uma seção contendo foco, primeiro movê-lo ao gatilho; depois retirar seu conteúdo da navegação por teclado e da leitura assistiva, inclusive durante a saída. Manter presença visual para a animação não autoriza descendentes focáveis em uma região `aria-hidden`; coordenar `inert` e desmontagem/visibilidade final, sem aplicar `hidden` antes do acabamento se isso o cortar.

Não usar `scaleY` no texto para fingir expansão. Se layout animado for caro no dispositivo-alvo, a caixa muda imediatamente e apenas o conteúdo faz fade. Isso deve ser uma degradação técnica consistente, não uma nova preferência de produto obrigatória.

## 6. Desktop, touch e atualização de dados

### Touch

- Preservar `ArrastoDePonteiro` e o adaptador touch já usados em `useGavetas`. O código documenta por que um gesto rolável pode receber `pointercancel`; não trocar isso por Pointer Events sem provar o comportamento.
- Expansão para cima: iniciar somente pela alça/cabeçalho designado, sem capturar links, botões, sliders ou seleção de texto. Rolagem no conteúdo continua sendo rolagem.
- Resistência além do limite: proposta de deslocamento amortecido apenas na decoração/alça; não esticar texto ou distorcer a ficha. Não oferecer elasticidade que esconda o botão fechar.
- Tratar segundo dedo, `touchcancel`, rolagem, troca de painel e rotação do aparelho. Na soltura, voltar/expandir/recolher/fechar conforme estado, sem executar clique residual.
- Preservar a faixa de toque de 44 px onde o app já a usa; reduzir só o desenho interno. Manter safe areas, teclado virtual e rolagem horizontal das alças.
- A alça atual é um `span` decorativo de 36 × 4 px em `CabecalhoDoPainel`; para o gesto novo, a região de captura precisa ser maior e explícita. Preservar “Detalhes/Recolher” como alternativa operável por teclado; não transformar um traço pequeno na única porta de expansão.
- Não adicionar vibração como requisito: “tátil” neste plano descreve resposta visual e acompanhamento do dedo.

### Busca e informação científica

- Transições de busca não escondem resultados enquanto o usuário digita e não deixam a opção acessível apontando para um resultado antigo. Preservar `aria-activedescendant`, lista permanente e foco do input/caixa.
- Um crossfade de título não deve anunciar duas vezes o mesmo nome. Representações decorativas duplicadas precisam ser ocultas da árvore acessível.
- Taxas, datas, distâncias, exposição e medições não recebem números intermediários inventados. Usar algarismos tabulares e realçar mudança de modo, não cada tique.
- No selo, diferenciar confirmação de clique e confirmação de resultado. O brilho não comunica “real” se ainda há desvio que o preset não remove.
- Sem LED pulsante infinito de “Ao vivo” no primeiro lote. Um acento único ao ativar, seguido de indicador estável, dá expressividade e deixa o estado legível.

## 7. Tecnologias e o papel do WebGL2

**A arquitetura recomendada é híbrida: HTML acessível para controles, CSS/WAAPI para movimento de superfícies e WebGL2 apenas para um acabamento óptico que demonstre vantagem visual.** O app já usa Three.js/WebGL2 para o céu; modernizar aqui é integrar melhor os sistemas existentes.

| Tecnologia | Uso recomendado | Limite |
| --- | --- | --- |
| CSS transitions/keyframes | Pressão interna, cor, filete, chevron, reflexo e fades simples | Não controlam por si só o unmount do React. |
| Web Animations API | Transições finitas que precisam cancelar/recomeçar a partir da posição atual | Integrar ao estado/presença existente; sem loops React por frame. |
| `@starting-style` + `allow-discrete` | Possível melhoria progressiva para dica/visibilidade | Verificar suporte real e receita completa. Fallback imediato; não depender disso para foco ou fechamento. |
| SVG | Ícones, desenho curto de traço, contorno do Spotlight | Recorte SVG pode custar pintura; validar compatibilidade/área repintada. |
| Canvas 2D existente | Cartografia de loading e rótulos que já são desenhados assim | Reutilizar suas rotinas de cache/colisão. Não criar um canvas por controle. |
| Three.js/WebGL2 existente | Protótipo óptico delimitado descrito abaixo | Não rasterizar texto, formulários ou hit testing em shader. |
| View Transitions API | Não é dependência deste plano | A travessia de modos já tem dono; capturar a tela com canvas animado exige avaliação própria. |
| GSAP/Motion e outras bibliotecas | Sem dependência nova na primeira implementação | Só reconsiderar com necessidade concreta que CSS/WAAPI e hooks existentes não cubram. |
| WebGPU | Fora do escopo | Não migrar o renderer para animar menus. |

### Protótipo óptico com WebGL2 — proposta, não código existente

**Efeito:** ao abrir um painel, um brilho âmbar curto percorre seu limite exterior, com leve dispersão luminosa. O interior continua opaco e o texto nítido. A versão CSS usa gradiente estático em faixa pequena, animando transform/opacity; a versão WebGL acrescenta variação óptica localizada. Ambas precisam ser comparadas no mesmo tamanho real de tela.

**Integração candidata a investigar:** `three/core/engine.ts` (renderer e loop), `three/core/post.ts` (composição), `App.tsx` (geometria/estado), `director/prontidao.ts` (captura/prontidão). Um passe decorativo, posterior à composição científica, pode desenhar no canvas existente; o efeito só aparecerá onde o DOM opaco não o cobre. Isso limita sua posição ao contorno exterior. Não prometer brilho sobre uma superfície HTML opaca vindo de um canvas que está atrás dela.

**Regras do experimento:**

1. Reutilizar renderer e loop; não abrir segundo contexto nem acrescentar uma cena 3D por menu. Se a integração exigir outro sistema permanente, voltar à variante CSS.
2. Atualizar geometria por abertura/troca/resize, reaproveitando medições; nenhuma leitura síncrona de DOM em cada quadro.
3. Região pequena, um evento visual por vez, duração máxima inicial de 400 ms. Ao trocar de intenção, retarget ou cancelar; não enfileirar rastros luminosos.
4. Fora do efeito, nenhum passe decorativo executado. Material/geometria e recursos temporários têm descarte explícito.
5. Sem alterar exposição, tone mapping, bloom científico, tamanho das estrelas, cor ou fotometria para produzir o efeito. O passe decorativo precisa de cor previsível e não pode contaminar os buffers científicos.
6. Não desenhar decoração em `shot=2`; em `shot=1`, usar o acabamento estático definido ou desligá-la deterministicamente. Movimento reduzido e falha/perda de contexto têm fallback HTML/CSS completo.
7. Profiling pode exigir timer queries disponíveis no aparelho; contagem de rAF não é medição isolada do custo GPU. Não introduzir `gl.finish()` como parte da execução normal.
8. Não acrescentar partícula perto de um astro que possa parecer objeto catalogado. Um efeito de seleção pertence ao marcador da interface e termina rapidamente.

**Portão de adoção:** mostrar um clipe A/B CSS × WebGL, medir no mesmo dispositivo/cena e confirmar que o ganho é visível e desejado. Se ambos parecem iguais, fica CSS. A preferência expressiva do dono justifica explorar esse efeito; não obriga introduzir complexidade sem diferença perceptível.

Uma segunda ideia, posterior, é tornar a bússola um pequeno indicador vivo de inclinação. Usar `desvioDoHorizonte` do rig, validar sinal/polo e publicar para a UI sem `setState` global a cada frame. Durante endireitamento, mostrar o dado real; não rodar um ícone independente que termine antes da câmera. Isso é evolução funcional e deve ficar em lote próprio.

## 8. Plano de implementação por lotes

M0, M1 e M2 foram executados em 09/09/2026 (registro no fim desta seção). M3 em diante seguem pendentes.

| Lote | Entrega | Arquivos principais | Critério de saída |
| --- | --- | --- | --- |
| M0 — referência | Registrar estado atual e fechar receita visual de três interações | App, CSS, scripts visuais existentes | Clipes/fotos de painel, segmentado e folha; geometria/foco e baseline de desempenho anotados nesta seção |
| M1 — fundamento | Tokens, política de movimento/captura/portais e presença interrompível | `01-base.css`, `07-foto.css`, `09-celular.css`, `useGavetas`, `dialogFocus`, `Ajuda`, App | Abrir/fechar/reabrir/trocar funciona, inclusive duração zero, sem timer antigo nem foco preso |
| M2 — famílias | Botões, fechar, régua/alças, switches, segmentados, chevrons e luz de borda | Componentes compartilhados e CSS 01/03/04/08/09 | Mesma resposta em todas as famílias; disabled, teclado e touch corretos |
| M3 — conteúdo | Busca, ficha, Ajustes, copiar/retry, selo e tempo | `PaletaDeBusca`, `FichaDoObjeto`, `Ajustes`, `HudDoAtlas` | Estados da matriz contemplados, sem atraso de input nem dados misturados |
| M4 — gestos | Expansão pela alça e assentamento da folha | `useGavetas`, `CabecalhoDoPainel`, `09-celular.css` | Dedo/rolagem/slider/pinça/cancelamento convivem; telefone real verificado |
| M5 — narrativa | Chrome, “Mais”, progresso, convite, abertura/fim e contexto | `Hud`, `BarraOuAlcas`, `Spotlight`, CSS 02/03/05/06 | Ritmo preservado, foco e ações imediatos, sem efeitos concorrentes |
| M6 — óptica | Comparação CSS × WebGL2 e decisão documentada | Engine/post/App somente se o protótipo justificar | Ganho visual aprovado e custo dentro do orçamento; fallback já pronto |
| M7 — fechamento | Matriz de preservação, acessibilidade, desempenho e limpeza | Testes/scripts pertinentes; este documento | Evidência de movimento real e estado final; `npm run done` passa |

M1 é dependência dos demais. M4 depende de M1–M3; M6 depende de uma versão CSS completa e de baseline comparável. Fazer um commit por tarefa delimitada, conforme `AGENTS.md`; não juntar toda a interface e shaders em um único commit. Não publicar nem enviar para `main` por consequência deste plano.

### Registro de execução

**M0 — referência (09/09/2026).** Não houve rodada de clipes própria, e o motivo é o que a leitura mostrou: não havia movimento de deslocamento a registrar. Três auditorias só de leitura (tokens e transições existentes; presença e foco dos painéis; famílias de controle) confirmaram que a interface animava **cor, altura e presença**, e nada mais — nenhum `:active` em família de botão, nenhum filete que cresça, nenhum reflexo. O inventário está nas seções 3 e 4. O baseline de desempenho continua o do `BACKLOG.md` (Cinema, DPR 2: t=60 62 ms; t=100 72–80 ms), medido antes desta frente: nenhuma regra nova roda em repouso, então não há par com/sem a comparar ainda.

**M1 — fundamento (commit `f28fa28`).** Presença interrompível e política de captura. Três defeitos reais, dois deles medidos no app:

1. Reabrir a folha do celular antes de ela terminar de descer devolvia um painel **morto**: o `inert` era posto à mão e a limpeza do efeito só apagava o temporizador. Medido em 375×812 com a ficha de Saturno — fechar e reabrir dentro de 260 ms deixava `inert` no nó e a folha em `translateY(110%)`, fora do quadro; depois do conserto, `inert` ausente e a folha de volta ao lugar.
2. Sem movimento a desenhar (`prefers-reduced-motion` ou `?shot=`) o JavaScript continuava segurando o nó os 260 ms inteiros, contra o que os dois modos prometem — e em captura isso fotografa um painel já fechado. A decisão virou função pura (`folhaQueSai`), lida uma vez por troca.
3. Girar o aparelho no meio da saída reapareceria a folha por 260 ms como painel de mesa.

A política de captura passou a alcançar os **portais**: a explicação do "?" mora em `document.body`, fora de `.hud-root`, e nem o congelamento do `?shot=1` nem o apagamento do `?shot=2` chegavam nela (medido: `transition-duration` 0,12 s com `shot-mode` ligado; 0 s depois da regra). É candidato à instabilidade do juiz de a11y registrada no `BACKLOG.md`.

**M2 — famílias.** Um vocabulário de movimento (`--t-pressao`, `--t-assenta`, `--t-entrada`, `--t-folha`, `--t-reflexo`, `--curva-folha`, `--escala-pressao`) e cinco gestos:

- **Pressão.** Todo controle recua 3 % enquanto pressionado, por UMA regra com lista de famílias — barra, régua, alça, ✕ do cabeçalho, "?" e segmentado. `:not(:disabled)`; a caixa de toque em repouso não muda.
- **O painel da mesa entra e sai — o MESMO movimento da folha do telefone, no outro eixo.** Ele percorre a própria largura **mais o afastamento da régua**, de modo que a borda esquerda parte da borda da janela e a raiz do HUD o corta inteiro — só a largura deixava uma tira de texto espiando abaixo da régua, que é mais curta que o painel (visto na primeira gravação). Sai de fora da tela passando por trás da aba em que se clicou, com o tempo e a curva da folha (`--t-folha`, `--curva-folha`, que deixou de ser um número digitado dentro do `@keyframes` do telefone). Sem `opacity`: uma gaveta não desbota, ela chega. Funciona porque a régua pinta acima do painel. *Houve uma primeira tentativa tímida, de 8 px com fade, e o dono a recusou pelo que ela era: "nao me parece que o menu está saindo da lateral e entrando na tela suavemente".* **O desmonte PERGUNTA a duração ao próprio nó** (`animationDuration` do painel já marcado com `inert`) em vez de repetir o número em JavaScript: são dois movimentos com durações diferentes e três situações que os zeram, e uma cópia de cada número seria o segundo relógio que a §5 deste plano proíbe. *Esta parte entrou depois de o dono apontar a falta: "vc nao animou a entrada dos menus quando está no modo desktop ou tablet… ele só slide quando vem de baixo no mobile".* A saída obrigou a estender a fase de saída do `useGavetas`, que até aqui só existia no telefone.
- **A medição do painel passou a esperar ele assentar.** `App.tsx` mede `[data-dialogo]` para reservar céu, e nem `ResizeObserver` nem `MutationObserver` veem uma translação TERMINAR — a reserva ficava presa onde o painel NASCEU. Agora o App refaz a conta no fim de `entraPainel` e de `folhaSobe`, pelo NOME da animação (o filete e o reflexo também terminam, e remedir a cada um seria layout forçado à toa). **O telefone já tinha esse defeito antes desta rodada**: a folha era medida com ela ainda abaixo da tela.
- **Filete que acende.** A aba da régua de mesa (vertical) e a alça do telefone (horizontal) crescem do meio para as pontas em 200 ms, com os mesmos dois `@keyframes`. O da alça deixou de ser `border-top-color`, porque borda não se escala.
- **Filete que ANDA, no segmentado.** O sublinhado da escolha desliza do segmento antigo para o novo em vez de apagar num e acender no outro. Os segmentos têm larguras diferentes de propósito, então a posição só se sabe MEDINDO: `useFileteDoSegmentado` escreve `--seg-x`/`--seg-w` na moldura e o CSS transita esses dois números — nada é animado por JavaScript. Mora em arquivo próprio porque serve os DOIS desenhos de segmentado da casa (o componente `Segmentado` e os três grupos crus da máquina do tempo, onde ação e alternância convivem); um filete que deslizasse só num deles daria duas marcas de escolha lado a lado na mesma tela. Anda só quando a ESCOLHA muda: um relayout (outra língua, outro `?ui=`) o faz nascer no lugar novo, sem escorregar. Sem segmento marcado — "parar o tempo" —, ele apaga onde está.
- **O ícone da porta escolhida assenta uma vez** (8 %, 180 ms): a cor e o filete dizem o estado, o assentamento diz o instante.
- **A máquina do tempo da mesa esmaece** ao abrir no hover e ao sair. *Pedido do dono: "quando passamos o mouse na data, nao seria interessante uma animacao de fade in rápida para aparecer e fade-out para sumir quando o mouse nao estiver mais usando?"*. O corpo já ficava montado durante o respiro de meio segundo que o hover tem desde 09/09; o que faltava era mostrar que ele está de saída. O respiro passou a ser UM número, declarado no CSS (`--t-respiro`) e **lido de lá** pelo TypeScript que desmonta — antes o esmaecer e o desmonte seriam dois relógios. Com a linha trancada pelo clique ou com o teclado dentro dela nada esmaece, porque nada vai fechar. Em movimento reduzido o respiro continua (ele é espera, não movimento) e o esmaecer sai.
- **Reflexo de abertura.** Uma faixa âmbar atravessa a borda de cima do painel, uma vez, em 360 ms. Mora no cabeçalho preso (o `.hud-dialogo` é o rolo) e viaja por `background-position` — deslocá-la por `transform` pediria barra de rolagem horizontal. Curva `linear`, e não a `--curva` da casa: com a curva ela cruzava dois terços da borda nos primeiros 90 ms e virava estalo. **É invisível em repouso** — regra achada na revisão do próprio diff: como o `?shot=1` desliga toda animação do HUD, o que sobra é o estado de repouso, e sem `opacity: 0` ali a faixa ficava parada e visível na borda de todo painel aberto, em toda foto determinística da casa.

**A preferência de movimento reduzido virou política, e não mais exceção**: os quatro tokens zeram numa única regra na raiz, e tudo construído sobre eles obedece. `src/hud/movimento.test.ts` cobra as três leis (os tokens zeram; toda família da lista de pressão cronometra o `transform`; as três famílias acendem com o mesmo filete) por regra sobre o arquivo, não por lista de seletores.

**Chevrons ficaram como estão**: a decisão escrita em `04-atlas.css` é que eles TROCAM de sentido em vez de girar. O plano pede "chevron único", que já é o caso.

**O filete que anda foi conferido por medida:** com "Português" marcado, `--seg-x` = 0 px e `--seg-w` = 89,125 px, contra 0,000 e 89,125 px medidos no botão; depois de escolher "English", 89,125 e 69,094 px, contra 89,125 e 69,094. O primeiro rascunho usava `offsetLeft` e errava 1 px — de onde `offsetLeft` conta varia entre motores; dois retângulos subtraídos, não.

**Evidência:** três quadros da aba acendendo (0 %, 40 %, 100 %) e o reflexo cruzando a borda do painel Ajustes, capturados em Chrome de verdade a 1440×900, DPR 2, congelando por esticar `--t-entrada`/`--t-reflexo` em tempo de execução. A pressão foi **medida**, não fotografada — a foto não a distinguia do número de quadros por segundo mudando ao lado: com o botão apertado por CDP, `getBoundingClientRect().width` cai de 49,555 para 48,068 px no segmento "Alta" e de 44,000 para 42,680 px no ✕ de fechar (0,9700 nos dois), com `transform: matrix(0.97, 0, 0, 0.97, 0, 0)`, e volta ao original ao soltar. *(Achado técnico: congelar por `Animation.currentTime`/`pause()` não é confiável em Chrome headless — o `getComputedStyle` dá o valor certo e a captura sai adiantada, provavelmente corrida entre a thread principal e a de composição. Esticar a duração e esperar em relógio de parede foi reproduzível.)*

**O que NÃO foi verificado nesta rodada:** o `:active` em Safari de iPhone (o WebKit historicamente não aplica `:active` sem ouvinte de toque no próprio elemento — pertence à matriz de aparelhos do M4/M7); e `prefers-reduced-motion` ligado no sistema operacional de um aparelho real, que aqui só foi provado por regra sobre o CSS.

### Instrução operacional para a IA executora

1. Confirmar a base atual e reler cada fonte envolvida no lote; não aplicar este relatório por número de linha cegamente.
2. Escolher um lote pequeno. Identificar quais IDs U01–U48 ele altera e quais contratos precisa preservar.
3. Reutilizar componentes/hooks. Se mudar uma classe ou introduzir um wrapper, conferir também áreas reservadas, foco, CSS responsivo e testes que dependem do DOM.
4. Implementar a variante reduzida e a captura junto com a animação, não como limpeza final.
5. Verificar comportamento com movimento ligado e apresentar a demonstração visual. Screenshot estático sozinho não aprova animação.
6. Registrar neste documento o lote concluído, evidências, arquivos e decisões do dono; não criar vários relatórios paralelos. No fim da implementação, o dono decide se o plano foi consumido e pode sair do repo.

## 9. Verificação e orçamento propostos

### Matriz mínima de aparelhos e modos

Mesa grande; mesa baixa; telefone retrato; telefone paisagem; 320 px com texto grande; fronteira 760/761 px; DPR 1/2; PT/EN; `ui=0.85`, padrão e `ui=1.4`. Combinar mouse, teclado e touch sem presumir que largura determina capacidade. Incluir teclado virtual, rotação durante animação e alteração de escala/idioma com painel aberto. Verificar Chrome/Edge e Firefox desktop, Safari desktop/iOS e Chrome Android nas versões suportadas pelo projeto; registrar versões/dispositivos usados e qualquer combinação indisponível, sem presumir equivalência entre engines.

Rever loading, abertura, filme rodando/pausado/fim, voo livre e Atlas; painel nenhum/aberto/saindo; ficha sem alvo/carregando/pronta/erro; busca vazia/resultados/sem resultado; dica aberta; clipboard com sucesso/falha. Cobrir estado final em `shot=1`, ausência de UI em `shot=2`, e os movimentos fora de `shot`.

### Casos de regressão que pertencem a esta mudança

Estender testes existentes onde couber, sem criar uma bateria genérica de juízes. Casos unitários vão junto de `useGavetas.test.ts`, `useDicaPresa.test.ts`, `FichaDoObjeto.test.ts` e testes já responsáveis pelo comportamento alterado; fluxo real usa os scripts existentes. Novos juízes além do necessário seguem aprovação prevista no `AGENTS.md`.

- Abrir/fechar dez vezes rapidamente; A → B → A; fechar e reabrir antes da saída terminar.
- Busca → ficha por Enter e por toque; nenhum segundo comando ao devolver foco.
- Tab/Esc em painel modal, ficha não modal, dica presa e seção em saída; nenhum foco em conteúdo oculto/inert.
- Encerrar animação por resize, troca de modo, movimento reduzido e desmontagem; nenhuma retenção órfã.
- Arrastar folha, devolver, expandir, recolher, cancelar, usar segundo dedo, rolar conteúdo e operar exposição.
- Comparar retângulo útil e posição do alvo antes/durante/depois; nomes não aparecem sobre superfícies opacas.
- Confirmar que brilho não atravessa texto, não corta outline, não cria alvo clicável falso e não produz hover preso no toque.
- Copiar com sucesso/falha e retry da ficha: texto/foco correspondem ao resultado, sem anúncio duplicado.
- Spotlight sem alvo, com alvo e alvo removido; contorno e recorte coincidem durante toda a transição.
- Portais respeitam captura; efeitos JS terminam mesmo quando CSS está sem animação.

### Comandos existentes

Durante a implementação, `npm run test:tocados`. Com servidor local ativo, executar sequencialmente os scripts pertinentes: `node scripts/visual/a11y.mjs`, `node scripts/visual/busca-smoke.mjs`, `node scripts/visual/atlas-smoke.mjs`, `node scripts/visual/filme-smoke.mjs` e `node scripts/visual/voo-smoke.mjs`. Não os disparar todos em paralelo com capturas: o histórico da seção O BASTÃO registra resultados instáveis sob disputa de recursos.

Parte das provas existentes fixa `shot=1` (`a11y.mjs:48`), portanto elas verificam estado final, não fluidez da transição. Acrescentar a conferência de movimento real ao fluxo pertinente; não interpretar “juízes verdes” como prova suficiente do motion.

Para baseline da cena: `node scripts/visual/fps-real.mjs 't=100' --seg=6 --dpr=2 --janela=1280x720`. Esse script mede taxa média de quadros da cena, **não** p95 de interação nem GPU isolada; comparar também perfis do navegador enquanto menus/gestos acontecem. Chrome deve estar visível, na frente, com vsync. Repetir pares com/sem efeito e mesma configuração, não comparar execuções sob cargas diferentes.

**Orçamento inicial proposto, a calibrar em M0:** resposta visual ao comando já no primeiro quadro disponível; sem atraso artificial no input; nenhum loop decorativo novo em repouso; nenhuma tarefa longa nova acima de 50 ms atribuível ao efeito; investigar regressão repetível superior a 5% no tempo de quadro p95 da interação em pares comparáveis. Esses limites são critérios de aprovação, não resultados medidos. Se o ruído da amostra impedir conclusão, aumentar a observação em vez de declarar aprovação.

Salvar prova visual sem sobrescrever `capturas/` ou `sky/`: nomes inéditos ou sufixo `-v2`. Mostrar clipes curtos para movimento e PNGs para composição. Ao terminar uma tarefa de implementação, executar `npm run done` uma vez, como exige o projeto. Não regenerar `public/data` para esta frente.

## 10. Referências técnicas verificadas

Estas fontes apoiam escolhas de plataforma; não substituem leitura do app nem prova no dispositivo-alvo.

- Preferir transform/opacity, medir pintura/layout e usar promoção de camadas com parcimônia: [guia de animações do web.dev](https://web.dev/articles/animations-guide).
- Controle e cancelamento de animações finitas: [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) e [Animation.cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel).
- Entrada de elementos e transições discretas exigem estados completos e compatibilidade verificada: [@starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style) e [transition-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition-behavior).
- Preferência do sistema para reduzir movimento: [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).
- Geometria do elemento em relação à viewport: [getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect).
- Recursos, limites e custo precisam ser tratados no aparelho real: [boas práticas WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
- A API de transições de vistas usa uma estrutura própria de captura/transição: [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API). Sua existência não justifica substituir o véu funcional do app.

## 11. Estado da entrega documental

Auditoria e plano concluídos em 09/09/2026; **M0, M1 e M2 executados no mesmo dia** (o registro, com evidências e o que ficou por verificar, está no fim da seção 8). M3 a M7 seguem pendentes. Nada foi publicado: nenhuma versão do site saiu desta frente.

Verificação desta rodada: `npm run done` passou (typecheck, lint, 97 arquivos de teste; 2.948 testes aprovados e 1 ignorado). Houve mensagens de stderr nos testes de texturas, inclusive `ERR_INVALID_URL` para o perfil do anel no ambiente Node, sem reprovação da suíte. Isso verifica o estado do repositório, não a aparência ou o desempenho das animações propostas. `git diff --check` sem erros.
