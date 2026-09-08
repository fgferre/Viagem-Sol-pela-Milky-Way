# Mar de Estrelas — Plano de redesenho da interface (nível AAA)

Versão 2 · 07/09/2026 · base `87d2cad` · substitui integralmente o `PLAN (1).md` anterior.
Escrito para um executor menos capaz (trabalhador Sonnet orquestrado pela sessão principal, ou Codex). Cada lote diz **o que mudar, o que preservar, o que reproduzir e como provar que terminou**.

## 0. Contexto e decisões já tomadas

**Por quê.** O app funciona e o dono quer a apresentação no nível dos melhores produtos do gênero, sem perder uma função sequer. O plano anterior ficou obsoleto com o redesenho dos painéis de 05–06/09 (item 224, ainda sem revisão do dono) e deixava decisões de composição, tipografia e enquadramento para quem implementasse. A crítica do Codex foi incorporada inteira (§1) e este plano fecha o que faltava: referências visuais como etapa com portão, a máquina de estados da ficha no celular (§7), o contrato de enquadramento (§6) e a lista final de destinos com imagens (§3.4).

**Decisões do dono (07/09, respondidas à sessão principal):**

| Pergunta | Decisão |
|---|---|
| Base visual | **Identidade nova**: a etapa de maquetes apresenta duas peles candidatas (§4) sobre a MESMA arquitetura de telas; ele escolhe pela imagem. Nada é implementado antes desse portão. |
| Abertura | **Explorar o Atlas** é o botão principal; Ver o filme (com a duração) e Voo livre ficam logo abaixo. |
| Fonte | **Sim**, fonte própria embutida (woff2, subconjunto latino, ≤ 160 KB no total). |
| Destinos da busca vazia | **10**: Terra, Lua, Marte, Júpiter, Saturno, Plutão · Sirius, Betelgeuse, Rigil Kentaurus · Centro galáctico (Sgr A*). |
| Pele (portão 1, 07/09, maquetes M1–M6) | **B — Atlas editorial** (§4). Composição das seis telas aprovada sem mudanças. Detalhe a corrigir na implementação: nome do objeto na ficha em caixa normal ("Saturno"), como na abertura. |
| Tarjas de cinema no Atlas | **Saem do Atlas; ficam no filme.** Na mesa, `.letterbox` não é montada no Atlas e `LETTERBOX_FRACAO` deixa o ramo de mesa de `retanguloUtilDoAtlas` (Lote 4, remedido pelo juiz). O filme não muda. |
| Fichário (07/09 à noite, ideia dele) | O botão com o nome do alvo na barra de cima fica redundante com a linha de contexto. As ferramentas viram uma **régua de abas na borda direita** (como o `RightControlRail` do doador atlas-orbital); ver **Lote 4½**. Entra depois do Lote 4, com maquete como portão, numa conversa limpa. |

**Premissas (assumidas, não perguntadas):**
- Mesa e celular são ambos de primeira classe; a referência principal é 1440×900 e 390×844.
- O `PLAN.md` da raiz está ocupado pelo trabalho do gás volumétrico (A2 e B pendentes). Este plano vive fora do repositório até começar a execução; no primeiro lote ele entra como `PLAN.md` se o do gás já tiver sido apagado, senão como `PLAN-UI.md` na raiz com o "ok" do dono (uma linha no chat).
- Nenhuma publicação. Backup só por `git push origin main:backup`. `public/data` não é tocado (hook barra). As prévias de destino vão para `public/previas/`.
- Quem executa não pergunta: bloqueado ou em dúvida escreve `BLOCKED: <motivo>` no retorno e para.

## 1. O que muda em relação ao plano anterior (crítica do Codex incorporada)

| Instrução anterior | Decisão neste plano |
|---|---|
| Explicações abaixo dos controles | **Retirada.** Explicação fica no `?` (§8). Avisos e estados ao vivo (ex.: "Qualidade Cinema, a 14 quadros/s") continuam visíveis. |
| Empilhar rótulo e valor na ficha | **Retirada.** Valor curto à direita do rótulo, procedência abaixo; empilha só quando o valor não cabe (§3.5). |
| Reorganizar Ajustes em seis grupos | **Cancelada.** Ordem atual mantida; única mudança estrutural: "Avançado" vira seção recolhível (§3.6). |
| Criar padrões de ajuda/seleção | **Estender** `src/components/Ajuda.tsx`, `useDicaPresa`, o `Segmentado` existente e `src/lib/dialogFocus.ts`. Não recriar. |
| Corrigir estados acessíveis genericamente | **Substituída** por verificação dos controles reais (segmentados já usam `aria-pressed`); o juiz de a11y é a prova. |
| Georgia como obrigação | **Retirada.** A família vem da pele escolhida no portão (§4). |
| Barra inferior em duas linhas | **Retirada.** A barra continua em uma linha (rola se não couber); a altura dela entra no contrato de enquadramento (§6). |
| "Sete imagens bonitas" | **Substituída** por lista fechada de 10 destinos com ID, textos PT/EN, enquadramento de captura e orçamento (§3.4). |
| Ordem de execução | **Substituída** pela sequência com portões do §12. |

Gaps do Codex e onde cada um se resolve: legibilidade → §2 e §4; orientação na rolagem → §3 (cabeçalho fixo em todo painel); descoberta → §3.4; ficha × cena no celular → §6 e §7; ajuda por mouse/teclado/toque → §8; falhas silenciosas → §9; significado dos números → §10.

## 2. Régua AAA — critérios de aceite mensuráveis

Cada item é verificável por captura, juiz ou teste. Nenhum é "bonito".

1. **Cena manda.** No Atlas de mesa, HUD permanente ≤ 22% da altura (topo + base somados); no celular ≤ 25% com ficha fechada. Nenhum painel cobre a cena inteira, exceto carregamento e abertura.
2. **Legibilidade.** Nenhum texto abaixo de 11 px CSS em `ui = 1` (procedência e "eyebrows"); controles ≥ 12 px; corpo 14 px; valores 16 px. Espaçamento entre letras ≤ 0,12 em em qualquer texto abaixo de 14 px. Contraste ≥ 4,5:1 para texto, ≥ 3:1 para bordas de controle. Tudo cabe em `ui = 1,4` a 320×568 sem sobreposição (juiz `a11y-celular.mjs`).
3. **Um sistema.** Uma família tipográfica embutida (duas na pele B), um conjunto de ícones SVG (`Icone.tsx`), uma anatomia de painel (cabeçalho fixo + corpo rolável + rodapé opcional), cinco controles (Botão, Segmentado, Interruptor, Campo, Deslizante) com os mesmos estados.
4. **Estados completos.** Todo controle: repouso, hover, ativo, `focus-visible`, desabilitado, selecionado. Todo painel: aberto, fechado, rolando (cabeçalho e ✕ sempre visíveis), carregando, erro, vazio.
5. **Toque.** Alvos ≥ 44×44 px; `env(safe-area-inset-*)` respeitado na barra inferior e na folha.
6. **Movimento com sentido.** 120–260 ms, cada animação corresponde a uma mudança de estado; nada em loop; `prefers-reduced-motion` e `?shot=` zeram tudo (inclusive a rampa da reserva de câmera, §6).
7. **Zero falha muda.** Copiar link, complementos da ficha e imagens de destino têm estado de erro visível com ação (§9).
8. **Sem salto.** Selecionar um alvo não muda a altura da folha compacta nem provoca salto de câmera (a reserva entra por rampa, §6).
9. **Idiomas e escalas.** PT e EN completos (teste de paridade de chaves); as quatro escalas (85/100/120/140 %) em 1440×900, 1200×900, 390×844, 320×568 e paisagem 844×390.
10. **Juízes verdes.** `a11y.mjs`, `a11y-celular.mjs`, `busca-smoke.mjs`, `atlas-smoke.mjs` (inclusive a prova "rótulo de Netuno fica debaixo da ficha", que hoje reprova e passa a passar SEM trocar o alvo) e `npm run done`.
11. **Desempenho.** Nenhum render React por quadro (o relógio segue por minuto, como hoje); `backdrop-filter` só na mesa; fontes com `font-display: swap` e `preload`; prévias com `loading="lazy"`.

## 3. Arquitetura da informação e layouts (fixos; a pele muda só o acabamento)

Tudo abaixo vale para as duas peles. Medidas em px CSS com `ui = 1`; implementar em `rem` para escalar com `--ui` (`src/lib/uiScale.ts`).

### 3.1 Abertura (`TitleVeil` em `src/components/Hud.tsx`)

Composição centrada (a cena do Sol continua atrás; véu radial escuro só no miolo, nunca a tela inteira). Coluna de 560 px máx., 24 px de margem no celular.

```
      HYG · VIA LÁCTEA · TEMPO REAL            (eyebrow, 11 px, existente: hud.kicker)
      Mar de Estrelas                          (marca; pele define a fonte)
      ───                                      (filete existente)
      Do Sol às supergigantes de Órion…        (duas linhas existentes, 16 px)
      328.749 estrelas de catálogo · …

      [ ◎  Explorar o Atlas                 ]  (primário, 52 px, largura da coluna)
         o céu de hoje: escolha a data, visite os planetas   (sublabel existente)
      [ ▶ Ver o filme · 3 min 13 s ] [ ⇗ Voo livre ]   (secundários, 44 px, lado a lado)
         um filme com roteiro e legendas          você pilota a câmera
```

- Rótulos: PT "Explorar o Atlas" / "Ver o filme" / "Voo livre"; EN "Explore the Atlas" / "Watch the film" / "Free flight". Os sublabels (`aria-describedby`) são os existentes.
- Duração continua vindo do runtime (`hud.duracaoCom`/`hud.duracao`), agora dentro do botão do filme.
- Callbacks idênticos aos atuais dos três botões. Em telas curtas a abertura rola; não reduzir fonte para caber. Com texto ampliado os dois secundários empilham.
- **Aceite visual:** primeiro se lê a marca com a cena; segundo, a entrada do Atlas; o filme continua evidente.

### 3.2 Atlas de mesa — três zonas (`src/components/BarraOuAlcas.tsx`, `HudDoAtlas.tsx`, `src/hud/03-controles.css`, `04-atlas.css`)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ MAR DE ESTRELAS                 [▶ Ver o filme][⇗ Explorar][↩ Retomar]    │
│ Via Láctea › Sistema Solar › Marte   [⌕ Buscar][⧉ Camadas][ⓘ Marte] [Cinema▾][⚙]│
│                                                                            │
│                            CENA (retângulo útil)                 ◎ bússola │
│                                                                            │
│ 1 de janeiro de 2026, 00:00  [◂][‖][▸] [Tempo real ›] [Ao vivo|Época]      │
│ arraste — girar · roda — zoom · …                 ● Escala real · Brilho…  │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Esquerda do topo:** marca pequena (não interativa) e, abaixo, a **linha de contexto** do alvo, derivada da escada (`escada.degrau`, `escada.corpoId`, pai do corpo): "Via Láctea › Sistema Solar › Terra › Lua"; estrela: "Via Láctea › Sirius". Só são botões os trechos com ação existente: "Sistema Solar" chama o mesmo `focarNoSistema` do botão Sistema da ficha; o corpo-pai chama a mesma seleção que a busca usa para um corpo. "Via Láctea" e o alvo atual são texto. Sem alvo: "Via Láctea › Sistema Solar".
- **Direita do topo, três grupos com 12 px entre eles:** modos (Ver o filme, Explorar, Retomar quando há filme guardado — condições atuais), ferramentas (Buscar, Camadas, Ficha com o nome do alvo — só com seleção elegível), sistema (chip de qualidade = o `<select>` atual reestilizado como chip com o preset vigente; ⚙ Ajustes). Botões 40 px de altura, ícone 16 px + rótulo. A barra pode quebrar linha em janelas estreitas; a altura real é medida (§6).
- **Painéis** (busca, camadas, ficha, ajustes) abrem à direita, abaixo da barra (`--barra-fim`), a 16 px da borda; larguras: ficha 400, busca 440, ajustes 440, camadas 400 (`max-width: 34vw`). `max-height` = `--teto-dialogo` (existente). Cabeçalho fixo (§3 abaixo).
- **Base:** máquina do tempo à esquerda (data 18 px, controles 44 px), legenda de gestos no centro (comportamento atual: apaga no primeiro arrasto), selo à direita como chip (dobra/desdobra como hoje). Bússola: como hoje.
- **Cabeçalho de painel (todos):** `src/components/CabecalhoDoPainel.tsx` (novo, único): título 20 px, `?` (§8), ✕ 44×44; `position: sticky; top: 0` dentro do contêiner rolável (`.hud-dialogo`), com o fundo do painel. No celular ganha a alça (36×4 px) acima.

### 3.3 Atlas no celular (`09-celular.css`, `BarraOuAlcas.tsx`)

- **Topo (uma linha, 44 px):** marca + contexto truncado à esquerda ("Sistema Solar › Marte"); à direita, [▶ Filme] [⇗ Explorar] como chips com ícone e rótulo (Retomar quando houver).
- **Base:** cinco alças em grade de 5 colunas iguais: ícone 20 px sobre rótulo 11 px (Buscar · Camadas · Tempo · Ajustes · Ficha=nome do alvo). Altura 64 px + `safe-area-inset-bottom`. Ativa: ícone e texto na cor de acento + linha de 2 px no topo da alça. **Regra de encaixe (portão 2, 07/09: o dono reprovou a fileira cortada a 320 px com `ui` 1,4):** as cinco alças SEMPRE cabem na largura; o rótulo escala com a largura da janela e é limitado pelo `--ui`: `font-size: clamp(11px, 3.2vw, calc(11px * var(--ui)))`; o nome do alvo na quinta alça trunca com reticências (nome completo no `aria-label`). Nunca esconder rótulo, nunca duas linhas, nunca rolar. O `scrollIntoView` da alça aberta em `useGavetas.ts` fica, inofensivo.
- **Larguras estreitas (≤ 360 px ou `ui` ≥ 1,2):** o contexto do topo mostra só o último trecho ("Netuno"); o chip do selo fica numa linha com `text-overflow: ellipsis` e nunca cobre o rótulo do alvo; na folha compacta o NOME tem prioridade e o botão "Detalhes" vira só o chevron (44×44, `aria-label`).
- **Selo:** chip numa linha acima da barra, à direita (como hoje).
- **Folha:** sobe do pé, teto `48svh` (existente, `--teto-dialogo-tela`), fundo sólido (sem blur), alça + cabeçalho fixos; fecha por ✕, Esc, toque no céu e arrasto para baixo no topo da rolagem (tudo existente).
- **Nenhum painel abre sozinho** ao entrar no Atlas; convites e tutorial mantêm regras atuais (`Spotlight.tsx`).

### 3.4 Busca + Destinos (`src/components/PaletaDeBusca.tsx`)

Ordem interna: cabeçalho fixo "Busca" · campo com lupa (placeholder PT "Buscar um destino…", EN "Search a destination…"; dica de atalho "/" à direita do campo) · **com consulta vazia:** filtros [Sistema Solar | Estrelas | Galáxia] (Segmentado existente; filtram só os cartões, nunca o motor) e cartões · **ao digitar:** a lista atual de resultados (ranking, apelidos, catálogo, tolerância, limites e teclado intocados) · rodapé com a linha de ajuda de teclado existente.

- Cartões de mesa: o primeiro da categoria ocupa a largura toda (imagem 128 px de altura); os demais em duas colunas (imagem 80 px). Nome 16 px, convite 13 px (máx. 2 linhas), texto abaixo da imagem sobre superfície sólida. O cartão inteiro é um `<button>`; hover destaca a borda; foco usa o anel de foco. Sem botões dentro do cartão.
- Celular: linhas com miniatura 88×64 à esquerda, nome e convite à direita, altura ≥ 80 px.
- Cada cartão resolve para uma `EntradaDaBusca` real do índice (`src/lib/buscaEstrelas.ts`): corpo por ID, estrela por nome canônico, lugar por ID. Destino que não resolver **não aparece** (e um teste falha). Clique, toque e Enter chegam ao MESMO `onEscolher` das linhas de resultado. `buscar('')` não muda.
- Limpar o campo volta à última categoria daquela abertura; fechar e reabrir começa em Sistema Solar, consulta vazia.
- Sem resultado: mensagem existente + botão "Limpar busca" (novo, PT/EN).
- Foco ao abrir: no celular por toque, foca o cabeçalho (`tabIndex=-1`) sem abrir teclado; tocar no campo abre; o atalho "/" ou Ctrl+K continua focando o campo. Isto pede uma opção `focoInicial` em `useDialogFocus` que preserve o padrão atual para os demais diálogos.

**Lista fechada de destinos** (chave i18n `busca.destino.<id>`; nomes vêm dos dados existentes):

| Categoria | ID / nome canônico | Convite PT | Convite EN | Captura de fundo |
|---|---|---|---|---|
| Sistema Solar (principal) | `earth` | Nosso ponto de partida | Where we start | `?atlas=1&foco=earth&shot=2&jd=<JD fixo>` |
| Sistema Solar | `moon` | A vizinha mais próxima | Our nearest neighbour | idem com `foco=moon` |
| Sistema Solar | `mars` | O planeta vermelho, de perto | The red planet, up close | `foco=mars` |
| Sistema Solar | `jupiter` | O gigante e suas quatro luas | The giant and its four moons | `foco=jupiter` |
| Sistema Solar | `saturn` | Os anéis, de perto | The rings, up close | `foco=saturn` |
| Sistema Solar | `pluto` | A borda do sistema | The edge of the system | `foco=pluto` |
| Estrelas (principal) | `Sirius` | A estrela mais brilhante do céu | The brightest star in the sky | `foco=sirius` |
| Estrelas | `Betelgeuse` | Uma supergigante em Órion | A supergiant in Orion | `foco=betelgeuse` |
| Estrelas | `Rigil Kentaurus` | O sistema estelar mais próximo | The nearest star system | `foco=rigil%20kentaurus` |
| Galáxia (única) | `sagittarius-a` | Até o centro da galáxia (trecho do filme) | To the galactic centre (film segment) | `?t=<fração do revealTime>&shot=2` |

- O cartão do centro galáctico usa a MESMA ação que a entrada "lugar" da busca usa hoje; o executor verifica o que ela faz (provavelmente entra no filme no trecho) e o convite diz isso. Não reaproveitar `revealGalaxy` como navegação do Atlas.
- **Prévias:** script novo `scripts/visual/previas-de-destino.mjs` (usa `scripts/visual/chrome.mjs`), viewport 800×500, `deviceScaleFactor: 1`, `jd` fixo (o mesmo de `ab-identidade.mjs`), recorte central 640×400, WebP q≈78 → `public/previas/<id>.webp`, ≤ 40 KB cada, ≤ 300 KB no total. Corpo e anéis inteiros no quadro; estrelas no contexto da cena; nada gerado por IA nem textura equiretangular como foto. Carregadas só com a busca aberta e vazia (`loading="lazy"`); se a imagem falhar, some e o cartão continua com nome e convite.

### 3.5 Ficha (`src/components/FichaDoObjeto.tsx`, `src/lib/atlas/ficha.ts` intocada)

**Mesa:** painel de 400 px. Cabeçalho fixo: eyebrow com a classe ("PLANETA") + `?`, nome 24 px (`role="status"` mantido), ✕. Linha de ações [⊕ Aproximar] [⌂ Sistema] (condições atuais). **Introdução:** as três primeiras linhas do texto da seção Contexto (ou da primeira curiosidade), com "Ler mais" que abre a seção — sem inventar texto; sem texto, sem introdução. Depois as seções na ordem atual (`ficha.secoes`), a primeira aberta. Cada linha: rótulo 12 px à esquerda; valor 16 px tabular à direita com `white-space: nowrap` (valor + unidade nunca quebram; se não couber, a linha inteira empilha rótulo/valor); procedência 11 px com o ponto de cor. O interruptor de relevo inventado vai para a seção "A imagem" (registrar na matriz). Enquanto os complementos (`corpos.json`, `texturas.json`) carregam: três linhas "esqueleto"; ao falhar: §9.

**Celular:** um único diálogo `data-dialogo="ficha"` com dois estados (§7). Compacta: alça, eyebrow + nome numa linha (elipse visual; nome completo no `aria-label`), ✕, ações [Aproximar] [Sistema] [Detalhes ˄]. Altura fixa `--ficha-compacta-altura: 8.5rem` (136 px) + safe area. Expandida: o mesmo conteúdo da mesa, botão [Recolher ˅] no cabeçalho, teto `48svh`, rolagem interna.

### 3.6 Ajustes, Camadas e Tempo (`Ajustes.tsx`, `HudDoAtlas.tsx`, `08-ajustes.css`)

- Ajustes: ordem atual (idioma, tom, exposição, qualidade, Avançado: MSAA, nebulosa, escala, gás, partículas; texto, rótulos 3D, rever convite, copiar link). "Avançado" vira seção recolhível (fechada por padrão; abrir/recolher não altera nada; o `.efetivo` do Preset continua). Linha ≥ 44 px, rótulo à esquerda, controle à direita; a linha de estado da qualidade permanece visível. Copiar link: §9.
- Camadas: famílias e contagens atuais; título da família à esquerda, contagem à direita; linha inteira clicável, ≥ 44 px; interruptor no acento.
- Tempo (mesa): instrumento no rodapé esquerdo; data 18 px; transporte, velocidade e referência como segmentados 44 px; "tempo real" indicado por seleção, sem pulsar. Celular: a mesma `BarraDoTempo` na gaveta atual.

### 3.7 Filme (`Hud.tsx`, `BarraOuAlcas.tsx`, `02-filme.css`)

Só acabamento e arrumação: topo-esquerda [↩ Entrar no Atlas] [⇗ Explorar]; topo-direita [Camadas] [Cinema▾] [⚙]; base-centro sobre a barra de capítulos [‖ Pausar/▶ Retomar] [1×] [Ver a galáxia]; título/legenda embaixo à esquerda como hoje. Auto-ocultar (`useChromeDoFilme`, `.hud-sumido`), capítulos, legendas, velocidade, encerramento, Reviver, retomada guardada: intocados. Nada de destinos ou painéis editoriais sobre o filme correndo.

### 3.8 Carregamento, encerramento, erros, tutorial

- Carregamento: só tipografia da marca e das etapas; cartografia, etapas e progresso real intocados. Nenhuma animação nova.
- Encerramento ("De volta a casa"): botões com a anatomia nova; textos e tempos intocados.
- Falha de carga: título legível, mensagem curta, detalhes técnicos em `<details>`, "Tentar de novo" mantido.
- Spotlight/convites: mesma pele dos painéis (hoje destoa); textos, passos e chaves `conviteVisto`/`conviteAtlasVisto` intocados.

## 4. As duas peles candidatas (maquetes do Lote 1; o dono escolhe uma)

Comum às duas: escala tipográfica 11/12/13/14/16/18/20/24 px (marca `clamp(40px, 6vw, 64px)` na mesa, 40 px no celular), eyebrows em caixa alta 11 px com 0,12 em, valores com `font-variant-numeric: tabular-nums`, ritmo 4/8/12/16/24/32, painel 20 px de padding (16 no celular), linhas ≥ 44 px, movimento 120/200/260 ms com `cubic-bezier(0.2, 0, 0, 1)`, anel de foco 2 px `#9CC4F0` com 2 px de afastamento, ícones `Icone.tsx` (SVG inline, grade 20 px, traço 1,5, `currentColor`, caminhos copiados da Lucide — licença ISC, arquivo `LICENSE` ao lado): busca, camadas, info, play, pause, explorar (compass), retomar (rotate-ccw), galáxia (orbit), ajustes (settings), fechar (x), chevron-up/down/right, arrow-left, relógio, aproximar (zoom-in), sistema (home), link, check, alerta (alert-circle), ajuda (help-circle), bússola (navigation), qualidade (sliders-horizontal), skip-back, skip-forward, gauge.

| | **Pele A — Observatório** (evolução do que existe) | **Pele B — Atlas editorial** |
|---|---|---|
| Ideia | Instrumento cinematográfico: superfícies translúcidas, filetes, dourado forte | Página de atlas impresso sobre o céu: superfícies sólidas, serifa expressiva, âmbar em filetes |
| Fonte | Inter variável (300–600), uma família. Marca: Inter 300, caixa alta, 0,30 em (herda o "MAR DE ESTRELAS") | Fraunces (300/400, display) para marca, nome do objeto e títulos de painel; Inter 400/500 para o resto. Marca: "Mar de Estrelas" em caixa normal, −0,01 em |
| Controles | Caixa alta 12 px, 0,08 em | Caixa normal 13 px, 0 em |
| Fundo de painel | `rgba(7,11,20,0.84)` + `backdrop-filter: blur(16px)` na mesa; `#090D16` sólido no celular | `#0C0F15` sólido em ambos, filete interno `rgba(255,255,255,0.05)` |
| Borda | `rgba(214,226,248,0.14)`; forte `0.30` | `rgba(255,246,232,0.12)`; forte `0.28` |
| Texto | `#EEF2FA` / `#AAB8CC` / `#7D8A9E` | `#F3EEE4` / `#B9B2A6` / `#85807A` (branco quente) |
| Acento | Ouro `#F2CD8B`; seleção = segmento preenchido, texto `#1A1508`; fundo suave `rgba(242,205,139,0.14)` | Âmbar `#E2B872`; seleção = texto âmbar + filete de 2 px (sem preenchimento); botão primário preenchido, texto `#1B1407` |
| Hover | `rgba(214,226,248,0.06)` | `rgba(255,246,232,0.05)` |
| Cantos | painel 8 px, controle 6 px | painel 12 px, controle 8 px |
| Feedback | ok `#8FD3A6`, erro `#F09A9A` | ok `#9BD1A8`, erro `#EFA0A0` |
| Selo científico | chip com ponto de cor, como hoje | chip com filete âmbar |

Nas maquetes as fontes podem vir do Google Fonts; no app entram como woff2 subconjunto latino em `src/assets/fonts/` com `@font-face` em `01-base.css`, `font-display: swap`, `<link rel="preload">` no `index.html`, licenças OFL copiadas ao lado. `LabelCanvas` (rótulos na cena) passa a usar a mesma família depois de `document.fonts.ready`, com os tamanhos atuais; a prova de clique nos nomes (`a11y.mjs`, "Terra → Terra") é a régua.

## 5. Contratos invioláveis (copiar literalmente para cada brief)

| Caso | Regra |
|---|---|
| Preset × valor explícito | `Preset` (null) é herança do tier. Escolher manualmente o mesmo valor é OUTRO estado (`foraDoPreset()` em `atlasConfig.ts`). Nunca juntar os dois. Nenhuma redefinição automática de qualidade. |
| Botão "Sistema" | Chama `focarNoSistema` (enquadra o Sol com o raio do sistema). Não é "voltar ao pai". |
| Galáxia | `revealGalaxy` inicia o filme no trecho; nunca usar como navegação do Atlas. |
| Esc com ajuda aberta | Dica presa: Esc solta a dica e para aí. Dica só por hover/foco: Esc fecha o painel (a dica vai junto). Depois: cadeia de Esc do Atlas, intocada. |
| Ficha no celular | Um diálogo, um `useDialogFocus`, um mecanismo de fechar (`useGavetas`). Compacta/expandida é apresentação, não segundo painel. |
| Botão da ficha renomeado | Rótulo visível = nome do alvo; `aria-label` "Ficha de {nome}"; `data-abre-dialogo="ficha"` mantido. |
| Captura sem HUD | `?shot=2` esconde tudo via `.bare-mode` (`07-foto.css`); todo elemento novo nasce dentro de `.hud-root` e obedece. `?shot=1` congela animações, inclusive as novas. |
| Uma gaveta por vez | `Gaveta` continua um enum de cinco; nada de estado paralelo. |
| Dados científicos | Nenhum número, texto ou imagem inventado; nomes e valores vêm de `ficha.ts`, `corpos.json`, dicionários. |
| Nada some | Toda opção, seção, atalho, gesto, modo e texto de hoje continua acessível; mudança de lugar entra na matriz (§13). |

## 6. Contrato de enquadramento (interface × câmera)

**Como é hoje.** O retângulo útil da câmera é uma CONTA DECLARADA em `src/three/cinematic/retanguloDoAtlas.ts` (frações por borda, multiplicadas por `--ui`, com degraus por largura), lida a cada quadro por `AtlasRig.escreverPose` (`atlasRig.ts:1408–1413`) via `Director` (`director.ts:2603`). As medições reais do DOM (`App.tsx:383–420`, `AREAS_RESERVADAS`) alimentam SÓ o `LabelCanvas` (rótulos desviam) e o `--barra-fim`. Gavetas não entram no retângulo por decisão escrita ("área permanente, nunca painel aberto por um instante"). Resultado: no celular a folha da ficha (37–48% da altura) cobre o alvo — a prova "rótulo de Netuno fica debaixo da ficha" do `atlas-smoke.mjs` reprova desde antes do redesenho.

**Regra nova.** O retângulo continua declarado para o chrome permanente e ganha UMA reserva extra, transitória, para a ficha — porque a ficha é o painel DO alvo e nasce junto com a seleção. Nada mais entra.

| Elemento | Estado | Reserva na câmera | Reserva nos rótulos |
|---|---|---|---|
| Tarjas (mesa) | sempre | declarada (`LETTERBOX_FRACAO`) | medida |
| Barra de controles / topo do celular | sempre | declarada (`CONTEXTO_FRACAO`, degrau de quebra, `SAIDA_FRACAO`) — **remedir após o Lote 4** | medida |
| Máquina do tempo + selo (mesa) | sempre | declarada (`max(SELO, TEMPO)` + degraus) — remedir | medida |
| Fileira de alças + selo (celular) | sempre | declarada (`ALCAS_FRACAO`, `SELO_FRACAO_CELULAR`) — remedir (a barra cresce de 3,6 rem para 4 rem + safe area) | medida |
| **Ficha, mesa** | aberta | **extra `direita` = largura medida da ficha ÷ largura da janela** | medida |
| **Ficha, celular compacta** | aberta | **extra `base` = altura medida da folha compacta ÷ altura da janela** | medida |
| Ficha, celular expandida | aberta | a MESMA reserva da compacta (não cresce; abrir detalhes não afasta o alvo) | medida |
| Busca, Camadas, Ajustes, Tempo | abertas | nenhuma | medida |
| Dicas `?`, Spotlight, convites, legenda de gestos | visíveis | nenhuma | dicas e spotlight: medida; legenda: como hoje |
| Bússola | acesa | nenhuma | medida |

**Mecânica (interface interna permitida):**
1. `retanguloUtilDoAtlas(fatorUi, larguraPx, extra?: { base: number; direita: number })` soma `extra` às bordas; sem `extra`, resultado bit a bit igual ao de hoje (as provas de `?foco` e os md5 do `atlas-smoke` dependem disso).
2. `Director` ganha `reservarParaAFicha({ basePx, direitaPx } | null)` (chamado pelo `App`, dentro do `medir()` existente — nunca por quadro) e guarda um alvo em frações. No `tick`, o valor corrente anda até o alvo por rampa de 240 ms com o mesmo smoothstep do rig; salta direto com `reducedMotion` ou `?shot=`. É o valor corrente que vai para `this.atlas.apply(...)`.
3. O `App` decide o alvo: `gaveta === 'ficha'` e `!celular` → `direitaPx` = largura do `[data-dialogo="ficha"]`; `gaveta === 'ficha'` e `celular` → `basePx` = altura da folha **compacta** (guardada ao abrir; ao expandir não se remede); senão `null`. Em `.bare-mode` (`?shot=2`) a ficha não existe no DOM → reserva zero, nada muda nas capturas sem HUD.
4. Zoom pinado (`distanciaPinada`), giro do visitante, bússola e rampas entre degraus: intocados — a reserva só entra pelo `retanguloUtil` de `enquadrar` (`enquadramento.ts:288–320`, que já trata `esquerda/direita`).
5. Filme e voo livre não leem a reserva (só o `AtlasRig` lê).

**Provas:** `retanguloDoAtlas.test.ts` (com e sem `extra`; `extra` nulo ⇒ igual a hoje); `atlasRig.test.ts` (com `direita` > 0 o alvo projeta à esquerda do centro; com `base` > 0, acima); `a11y.mjs` ("retângulo útil cobre o HUD": declarado ≥ medido nas grades atuais, com as constantes novas); `atlas-smoke.mjs`: a prova de Netuno sob a ficha passa a 390×844 e 320×568, `ui` 1 e 1,4, **sem trocar o alvo**; captura de mesa com Saturno + ficha: anéis inteiros à esquerda do painel.

## 7. Ficha no celular — máquina de estados

Estado em `useGavetas.ts`: `fichaExpandida: boolean` (exportado em `Gavetas`), com uma regra pura testável em `useGavetas.test.ts`.

| Evento | Estado anterior | Resultado |
|---|---|---|
| Seleção de alvo (rótulo, busca, `?foco=`, órbita) com ficha fechada | fechada | abre **compacta** (`aoFocar` atual + `fichaExpandida=false`) |
| Troca de alvo com ficha aberta | compacta / expandida | mantém o estado; conteúdo troca (como hoje) |
| Toque em "Detalhes" ou arrasto para cima na alça | compacta | expandida |
| Toque em "Recolher", arrasto para baixo no topo da rolagem | expandida | compacta (seleção e seções abertas mantidas) |
| Arrasto para baixo (48 px) | compacta | fechada (`aoFechar`, gesto atual) |
| ✕, Esc, toque no céu | qualquer | fechada; seleção mantida (fechar é leitura, não navegação — regra atual) |
| Alça "Ficha" na barra | fechada | compacta |
| Avanço do relógio / tempo real | qualquer | nenhuma mudança |
| Expandir | compacta | não muda alvo, distância, zoom nem reserva de câmera (§6) |
| Rotação do aparelho / mesa → celular | qualquer | compacta (estado zera quando `celular` muda) |
| Travessia de modo (`aoTravessar`) | qualquer | como hoje (ficha obedece à seleção) |
| Ajustes aberto ao selecionar | ajustes | como hoje (Ajustes resiste); ao fechar Ajustes, a ficha não renasce sozinha |

Foco: `useDialogFocus('ficha', …)` uma vez; ao expandir, o foco vai ao botão "Recolher"; ao recolher, ao botão "Detalhes". O nome completo do alvo fica no `aria-label` da folha e no `role="status"` (que hoje anuncia trocas de alvo).

## 8. Ajuda, foco e teclado

1. `Ajuda.tsx`: botão `?` de 24 px visual com área de 44×44 (`::before`), ao lado do rótulo. Hover e `focus-visible` mostram a dica (CSS, 120 ms). Clique/toque/Enter/Espaço prendem (`presa`, `aria-expanded`); clique fora no painel ou segundo clique soltam (`useDicaPresa` atual).
2. A dica é um BLOCO abaixo da linha do controle, com a largura do conteúdo do painel — nunca flutua para fora do painel (sem problema de borda); se ficar fora da vista ao prender, `scrollIntoView({ block: 'nearest' })`.
3. Esc: ver §5. Implementação: o `onKeyDownCapture` do painel solta a dica presa e chama `stopPropagation()`; sem dica presa, deixa passar para o `useDialogFocus`.
4. Foco inicial continua pulando `?` e ✕ (`dialogFocus.ts:127–135`).
5. Toque: sem estado de hover; um toque prende, outro solta.
6. Atalhos existentes ("/", Ctrl+K, Esc, setas, Enter, Espaço no filme, F5 no voo) intocados e listados no `?` da busca e do tempo.

## 9. Falhas visíveis

| Falha | Comportamento |
|---|---|
| Copiar link (`Ajustes.tsx`): promessa rejeita ou sem `navigator.clipboard` | Abaixo do botão aparece um campo somente leitura com a URL já selecionada e o texto PT "Não deu para copiar automaticamente. Copie o endereço:" / EN "Couldn't copy automatically. Copy the address:". Sucesso: "Copiado ✓" por 1,5 s + `aria-live="polite"`. O gerador de URL (`urlParaCopiar`) não muda. |
| Complementos da ficha (`emVoo` em `FichaDoObjeto.tsx`) | Enquanto carrega: esqueleto. Ao falhar: dentro das seções afetadas, linha PT "Não foi possível carregar esta parte." / EN "This part couldn't be loaded." com botão "Tentar de novo" que limpa a entrada do `emVoo` e refaz o `fetch`. O que já carregou continua. |
| Prévia de destino não carrega | `onerror` esconde a imagem; o cartão fica com nome e convite. |
| Falha de carga do app | Tela atual, só reestilizada (§3.8). |

## 10. Significado dos números

Toda distância diz de onde é medida, em palavras, nos dois idiomas, sem mudar as contas:
- Rótulo na cena (`LabelCanvas`): "5,4 UA daqui" / "5.4 AU from here" (distância da câmera).
- Ficha: "Distância ao Sol" / "Distance to the Sun"; "Distância à Terra" quando for o caso (rótulos existentes em `ficha.ts`, só o texto).
- Busca: "9,5 UA do Sol" / "9.5 AU from the Sun"; estrelas "576 anos-luz" (do Sol, implícito, com o `?` da busca explicando).
- Selo e procedência: como hoje.

## 11. Componentes — reaproveitar e estender

| Precisa de | Usar | Novo só se |
|---|---|---|
| Diálogo com foco, Esc, devolução | `src/lib/dialogFocus.ts` (+ opção `focoInicial`) | — |
| Exclusividade de painéis, folha, arrasto | `src/hooks/useGavetas.ts` (+ `fichaExpandida`) | — |
| `?` | `src/components/Ajuda.tsx` + `useDicaPresa` | — |
| Botões de escolha | `Segmentado` existente (localizar com `grep -rn "Segmentado" src`) | — |
| Interruptor | `.hud-interruptor` (`04-atlas.css`) | — |
| Cabeçalho de painel | **novo** `src/components/CabecalhoDoPainel.tsx` | usado pelos cinco painéis |
| Ícones | **novo** `src/components/Icone.tsx` | — |
| Tokens | `src/hud/01-base.css` (`--*` existentes + os do §4) | — |
| Escala da UI | `src/lib/uiScale.ts` | — |
| Índice de busca | `src/lib/buscaEstrelas.ts` (`EntradaDaBusca`, `buscar`) | — |
| Textos | `src/lib/idioma/pt.ts` e `en.ts` (toda string nova nos dois) | — |
| Captura de imagens | `scripts/visual/chrome.mjs` | `previas-de-destino.mjs` |
| Medições de HUD | `App.tsx` `medir()` | — |

## 12. Ordem de execução — lotes, briefs e portões

Regras gerais: um lote = um trabalhador Sonnet (a sessão principal planeja, revisa `git diff --stat` e os trechos, roda as provas, e fala com o dono). Sem novas dependências npm. Sem refatoração fora do escopo. Sem commit dentro do trabalhador (a sessão principal comete um commit por lote, mensagem diz o porquê). Retorno ≤ 15 linhas: o que mudou, o que foi verificado e como, problemas abertos. Enquanto trabalha: `npm run test:tocados`; no fim de cada lote: juízes do lote; no fim de tudo: `npm run done`. Portão = o dono olha imagens antes do lote seguinte.

### Lote 0 — Congelar a base e inventariar
- **Objetivo:** ter o commit inicial, o inventário de preservação e as capturas "antes". Pronto = arquivo `capturas/inventario-ui-2026-09-07.md` completo e as capturas "antes" das 11 telas em duas dimensões, em `capturas/antes-ui-<tela>-<dimensão>.png`.
- **Escopo:** leitura de `src/`, `public/data/atlas/corpos.json`, dicionários; escrita só em `capturas/`.
- **Passos:** registrar `git rev-parse HEAD`; gerar o inventário A PARTIR DOS DADOS, não de memória: chaves do dicionário PT (e diferença para EN — hoje há divergência de contagem, listar), lista de controles de Ajustes com valores possíveis (de `atlasConfig.ts`: presets, MSAA, nebulosa, escala, gás, partículas; `DEGRAUS_DA_UI`), camadas por família com contagens, 48 corpos (IDs), estrelas com nome (contagem do índice), lugares, atalhos de teclado, gestos, parâmetros de URL (`shot`, `foco`, `jd`, `t`, `ui`, `ajustes`, `nobloom`, `loader`, `cart`, `d`, `q`, `atlas`), botões por modo (mesa/celular × abertura/atlas/filme/fim) com callback; capturar antes: abertura, atlas, atlas+ficha (Saturno), busca vazia, busca "sat", ajustes, camadas, tempo, filme, fim, carregamento — em 1440×900 e 390×844 (`node scripts/visual/…` ou o chrome.mjs direto), PT.
- **Não:** tocar `src/`, `PLAN.md`, `public/`.
- **Verificação:** o inventário tem uma linha por item e cita o arquivo de origem.

### Lote 1 — Referências visuais (duas peles) · PORTÃO DO DONO
- **Objetivo:** 6 telas × 2 peles como PNG, mais o "antes" ao lado, para o dono escolher a pele e comentar a composição. Pronto = 12 PNG em `capturas/maquetes/` e um `indice.html` que mostra antes/A/B por tela.
- **Método:** HTML estático por tela em `capturas/maquetes/<pele>/<tela>.html`, fundo = captura real da cena sem HUD (`?shot=2` nas URLs do §3.4/§6; Saturno para a ficha de mesa, Netuno para o celular), textos reais em PT, fontes do Google Fonts (só aqui), render via `chrome.mjs` em 1440×900 e 390×844 (`deviceScaleFactor: 2`).
- **Telas:** M1 abertura; M2 Atlas mesa + busca vazia com destinos (10 cartões com as prévias reais já capturadas pelo script do §3.4, ou retângulos com o nome se as prévias ainda não existirem — dizer qual); M3 Atlas mesa + ficha de Saturno (barra em três zonas, contexto, tempo, selo); M4 celular ficha compacta (Netuno visível acima); M5 celular ficha expandida; M6 celular busca com destinos.
- **Segunda rodada (após a escolha, mesma pele):** M7 filme; M8 Ajustes (com "Avançado" fechado e uma dica presa); M9 Camadas; M10 Tempo no celular; M11 carregamento e encerramento; M12 320×568 com `ui` 1,4 (ficha compacta + barra); M13 M3 e M4 em EN. Portão de novo.
- **Não:** propor terceira pele; deixar escolha estética "a definir"; tocar `src/`.
- **Aceite:** cada tela mostra dimensões, textos reais e estados (hover num botão, um segmento selecionado, uma dica presa); a régua do §2 itens 1, 2 e 5 confere nas maquetes (medir).

### Lote 2 — Fundações (tokens, fonte, ícones, cabeçalho, ajuda)
- **Objetivo:** a pele escolhida entra como tokens e componentes sem mudar NENHUM layout; os cinco painéis ficam com cabeçalho fixo, tamanhos novos e dicas com o contrato do §8. Pronto = juiz `a11y.mjs` e `a11y-celular.mjs` verdes; 5 capturas dos painéis.
- **Escopo:** `src/hud/01-base.css`, `03-controles.css`, `04-atlas.css`, `08-ajustes.css`, `09-celular.css`, `src/assets/fonts/`, `index.html` (preload), `src/components/Icone.tsx` (novo), `CabecalhoDoPainel.tsx` (novo), `Ajuda.tsx`, `useDicaPresa`, `dialogFocus.ts` (`focoInicial`), os cinco painéis só para trocar cabeçalho e glifos Unicode por `<Icone>`.
- **Preservar:** ordem da cascata; `Gaveta`; `data-dialogo`/`data-abre-dialogo`; `.hud-sumido`; `.bare-mode`/`.shot-mode`; `prefers-reduced-motion`.
- **Verificação:** `npm run test:tocados`; juízes de a11y; `?shot=2` continua sem HUD; capturas dos cinco painéis em 1440×900 e 390×844 com `ui` 1 e 1,4.

### Lote 3 — Contrato de enquadramento
- **Objetivo:** §6 inteiro. Pronto = testes novos passando, prova de Netuno sob a ficha verde sem trocar alvo, md5 do `atlas-smoke` inalterado em `?shot=2`.
- **Escopo:** `retanguloDoAtlas.ts` (+ teste), `director.ts` (`reservarParaAFicha`, rampa no tick), `atlasRig.ts` (só passar `extra`), `App.tsx` (`medir()` chama o director), `useGavetas.ts` (`fichaExpandida` mínima, sem UI ainda), `scripts/visual/a11y.mjs` (prova "declarado ≥ medido" cobre a reserva extra), `atlas-smoke.mjs` (só se a prova existente precisar ler a folha compacta — não mudar o alvo).
- **Não:** tocar `enquadramento.ts`; mexer em filme/voo; medir por quadro; consultar DOM dentro do rig.
- **Verificação:** `retanguloDoAtlas.test.ts`, `atlasRig.test.ts`, `useGavetas.test.ts`; `a11y.mjs`; `atlas-smoke.mjs`; `busca-smoke.mjs` (idempotência do `?foco`).

### Lote 4 — Chrome do Atlas (mesa e celular) · PORTÃO
- **Objetivo:** §3.2 e §3.3: três zonas, marca + contexto, chip de qualidade, barra inferior com ícone e rótulo, selo em chip, tempo como instrumento; `LabelCanvas` com a fonte nova. Pronto = constantes de `retanguloDoAtlas.ts` remedidas e o juiz de a11y verde; capturas.
- **Escopo:** `BarraOuAlcas.tsx`, `HudDoAtlas.tsx` (Selo, Bussola, BarraDoTempo), `03-controles.css`, `04-atlas.css`, `09-celular.css`, `retanguloDoAtlas.ts` (só números, com a disciplina dos comentários: medido pelo juiz, declarado ≥ medido, folga anotada), `LabelCanvas` (só `font-family` após `document.fonts.ready`), dicionários (contexto, chip).
- **Preservar:** todos os botões e condições do inventário; o `<select>` de qualidade (mesma lista `QUALIDADES`); `?ajustes=1`; a legenda de gestos e o Spotlight; `--barra-fim`.
- **Verificação:** juízes a11y (+ prova "Terra → Terra" com a fonte nova), `atlas-smoke`, `busca-smoke`; capturas 1440×900, 1200×900 (barra quebrando), 390×844, 320×568 `ui` 1,4, PT e EN.

### Lote 4½ — Fichário: régua de abas na borda direita · PORTÃO DO DONO (maquete antes de código)
- **Origem (palavras dele, 07/09 à noite):** "já que colocamos um label com o endereço, acho que deixa de ser importante o botão com o nome do objeto selecionado. Ao invés de usar esse botão, essa janela de informações poderia virar um fichário, uma aba, a exemplo do que a interface do atlas orbital faz." Avaliação da sessão principal: concorda; o botão fazia duas coisas (dizer o alvo e abrir a ficha) e a linha de contexto já faz a primeira.
- **Referência:** o doador em `~/Github/atlas-orbital/src/components/ui/RightControlRail.tsx` + `controlPanelConfig.ts` (régua vertical na borda direita, abas de ícone com rótulo pequeno, uma por painel; o painel aberto pendura na régua). É só referência de composição; a pele é a B.
- **Desenho a confirmar na maquete (mesa ≥ 761 px):** as quatro ferramentas (Buscar, Camadas, Ficha, Ajustes) saem da barra de cima e viram abas verticais numa régua de 56 px encostada na borda direita, abaixo da barra; ícone 20 px sobre rótulo 11 px; aba ativa = `--acento` + filete de 2 px na borda INTERNA (decisão do dono no portão, 07/09: "com a linha âmbar do lado de dentro"; a maquete tinha na externa e ele mandou trocar); a aba "Ficha" NÃO mostra o nome do alvo (o contexto mostra) e fica desabilitada sem seleção elegível; o painel aberto encosta na régua, à esquerda dela, com a largura e o cabeçalho de hoje; a barra de cima fica com marca + contexto à esquerda e [Ver o filme][Explorar][Retomar] + chip de qualidade à direita. Clicar no último trecho da linha de contexto (o nome do alvo) também abre a ficha (a mesma ação da aba). Celular: nada muda além do rótulo da quinta alça, que vira "Ficha" (nome completo no `aria-label` e no contexto) — a barra de baixo JÁ É esse fichário.
- **Contratos:** `Gaveta` continua o enum de cinco e `useGavetas` a exclusividade (a régua é a fita de abas desse estado, não um estado novo); as abas carregam `data-abre-dialogo` + `aria-haspopup="dialog"`/`aria-expanded` (é o que o juiz de a11y varre) — não usar `role="tab"`; a régua é chrome PERMANENTE: entra em `AREAS_RESERVADAS` (`App.tsx`) e o retângulo útil ganha uma `direita` declarada para ela em `retanguloDoAtlas.ts` (medida pelo juiz, declarado ≥ medido), à qual a reserva transitória da ficha (§6) se soma; `?shot=2` esconde tudo; no filme não há régua (o filme segue §3.7); atalhos "/", Ctrl+K e Esc intocados; nada some (matriz).
- **Passos:** (1) maquetes no kit de `capturas/maquetes/` (pele B): M14 mesa 1440×900 com régua + ficha de Saturno, M14b com Busca aberta, M15 celular 390×844 (só o rótulo muda) — portão do dono; **[feitas 07/09 à noite: `m14-atlas-fichario`, `m14b-atlas-fichario-busca`, `m14c-atlas-fichario-repouso` (régua sem painel, extra) e `m15-cel-fichario`, renderizadas por `node capturas/maquetes/render.mjs b m14` / `… b m15`; regras novas no fim de `kit.css` (`.regua`, `.regua__aba`, `.painel--no-fichario`); PORTÃO 07/09 à noite: **APROVADO** pelo dono, palavras dele: "aprovado, pode implementar com a linha âmbar do lado de dentro" — o filete de 2 px da aba ativa fica na borda INTERNA (lado do painel/cena), não na externa]** (2) implementar: `BarraOuAlcas.tsx` (régua + barra de cima enxuta), CSS (`03-controles.css`, `04-atlas.css`), `App.tsx` (`AREAS_RESERVADAS`), `retanguloDoAtlas.ts` (`direita` da régua), linha de contexto clicável, dicionários (rótulo "Ficha"); **[FEITO 07/09 à noite: `BarraOuAlcas.tsx` (`regua = hud.saidasDoAtlas && !alcas`; a régua é filha direta de `.hud-root`, classe `atlas-regua` + `com-painel` com gaveta aberta; grupo de ferramentas e ⚙ só sobram na barra do filme/voo livre), `FichaDoObjeto.tsx` (`BotaoDaFicha` rotula sempre `ficha.aba` = "Ficha"/"Info", `nome: null` = aba desabilitada SEM `data-abre-dialogo`), `04-atlas.css` (bloco `.atlas-regua`, topo = `--barra-fim + 1rem` igual ao dos diálogos; filete de 2 px na borda interna; costura escondida atrás da aba ativa; abas de 3,25rem em janelas ≤ 520 px de altura), `01-base.css` (`.hud-dialogo { right: var(--regua-largura, 1rem) }`, variável só existe via `.hud-root:has(> .atlas-regua)`), `App.tsx` (`.atlas-regua` em `AREAS_RESERVADAS`; a reserva transitória da ficha na mesa passou a ser a LARGURA do painel, não `innerWidth − left`, para não contar a régua duas vezes), `retanguloDoAtlas.ts` (`REGUA_LARGURA_PX = 56`, `direita` da mesa = 56·ui/largura + ficha; teste próprio em `retanguloDoAtlas.test.ts`, `atlasRig.test.ts` ajustado), dicionários (`ficha.aba`, `ficha.abaSemAlvo`, `barra.reguaAria`), `a11y.mjs` (`medirCobertura` passou a cobrar "direita declarada ≥ medida" da régua). Fotos em `capturas/lote45-*-v3.png` (v1/v2 são tentativas com o tutorial na frente e com a armadilha do `shot=1`, ver BACKLOG).]** (3) `npm run gate`, juízes a11y/busca/atlas (uma rodada cada, regras de economia), `npm run done`, capturas mesa/celular/EN/`shot=2`. **[FEITO 07/09 à noite: `npm run done` verde (93 arquivos, 2921 testes); a11y verde nas três telas e nas quatro escalas, inclusive a cobrança nova "direita declarada ≥ medida (régua de abas)" (0,0467 a 1200 px, 0,0653 com ui 1,4); busca-smoke verde; atlas-smoke com as falhas já conhecidas do BACKLOG (contagem de nomes 18×17, "5,26 décadas") e UMA prova adaptada (o toque que escolhe lia o nome do alvo no texto do gatilho da ficha — agora lê o `aria-label`); capturas 1440×900 PT/EN (ficha, busca, repouso), 1200×900, 844×390, 390×844 e `shot=2` em `capturas/lote45-*-v3.png`.]**
- **Regras de economia para os trabalhadores (aprendidas em 07/09, valem para todos os lotes daqui em diante):** nunca ler arquivo inteiro de juiz/teste/log — `grep -n` e `sed -n` de ≤ 60 linhas; cada juiz roda UMA vez por rodada, em primeiro plano, com saída em arquivo, e lê-se só `grep -nE "FALHA|tudo verde|SMOKE|Error"`; nada de laços de espera (`until … sleep`); no máximo 3 imagens por trabalhador; um trabalhador que passe de ~300 k tokens é parado e o resto vai para outro, enxuto.

### Lote 5 — Ficha (mesa, celular compacta/expandida, falhas) · PORTÃO
- **Objetivo:** §3.5, §7 e a parte da ficha do §9. Pronto = comparação de conteúdo antes/depois aprovada para planeta, lua, estrela e centro galáctico (todas as linhas presentes), prova de Netuno verde, capturas.
- **Escopo:** `FichaDoObjeto.tsx`, `useGavetas.ts` (+ teste), `04-atlas.css`, `09-celular.css`, dicionários. `ficha.ts` intocada (montagem científica).
- **Verificação:** `useGavetas.test.ts` (tabela do §7); a11y (foco entra/fica/volta em compacta e expandida); simular falha de `corpos.json` (bloquear a URL no chrome.mjs) e ver a linha de erro com "Tentar de novo".

### Lote 6 — Busca com destinos e prévias · PORTÃO
- **Objetivo:** §3.4. Pronto = 10 cartões resolvem para entradas reais (teste), prévias em `public/previas/` dentro do orçamento, `busca-smoke.mjs` verde.
- **Escopo:** `PaletaDeBusca.tsx`, `04-atlas.css`, `09-celular.css`, `src/lib/destinosDaBusca.ts` (novo: a lista fechada + resolução para `EntradaDaBusca`, com teste), `scripts/visual/previas-de-destino.mjs` (novo), `public/previas/`, dicionários, `dialogFocus.ts` (`focoInicial`).
- **Não:** segundo índice; segundo `onEscolher`; mudar `buscar`; imagens de fora do app.
- **Verificação:** teste dos destinos; `busca-smoke.mjs`; a11y (listbox, foco no celular); capturas mesa e celular, vazio e "sat"; tamanho total das prévias.
- **FEITO (08/09):** `src/lib/destinosDaBusca.ts` (lista fechada de 10, resolvida por `resolverFoco` contra o índice que a paleta já tem; `destinosDaBusca.test.ts` cobra os 10 e a ordem 6/3/1); `PaletaDeBusca.tsx` (consulta vazia = `Segmentado` de três categorias + `.atlas-destinos` com `<button class="atlas-destino">` fora do listbox, mesma `escolher()` das linhas; "Limpar busca" sem resultado; `<kbd>/</kbd>` no campo; `focoInicial: 'caixa'` no celular); CSS em `04-atlas.css`/`09-celular.css` — QUEM ROLA É O DIÁLOGO INTEIRO com o cabeçalho preso (`.atlas-busca > * { flex: none }`), porque a coluna de flex apertava cartões e filtros em vez de rolar; filtros com a regra de encaixe das alças no celular (`clamp(0.6875rem, calc(3.6vw * var(--ui)), 0.8125rem)` + `flex-basis: auto`, cada chip do tamanho do próprio rótulo — `uiScale.test.ts` reprova `px` e `vw` sem `--ui`); placeholders "Buscar um destino…"/"Search a destination…"; convite do centro galáctico "Até o centro da galáxia" (a entrada "lugar" só enquadra, não entra no filme — confirmado em `useDirector.ts`). `scripts/visual/previas-de-destino.mjs` (capturarCDP 800×500 DPR 1 + sharp recorte 640×400 WebP q78; porta de CDP própria, não a 5173) → `public/previas/*.webp`, 10 arquivos, 165 KB no total, todos ≤ 28 KB; enquadramentos: corpos `ver=corpo&d=` (Terra/Lua/Marte 4, Júpiter 10, Saturno 12, Plutão 5), estrelas `foco=<nome>`, centro galáctico = quadro do FILME em `t=148` (de dentro do lugar a vista é névoa bege — BACKLOG). Juízes: a11y verde; busca-smoke com a prova do toque no celular ADAPTADA (abrir por toque foca a folha, não o campo; o toque no campo é quem foca — §3.4) — fotos em `capturas/lote6-*` (v4 = estado final; v1–v3 são as rodadas com os defeitos de rolagem).

### Lote 7 — Ajustes, Camadas, Tempo, Spotlight, copiar link
- **Objetivo:** §3.6, §3.8 (Spotlight) e a parte do link no §9. Pronto = todos os valores sobrevivem a abrir/recolher "Avançado" e trocar de painel; falha do clipboard mostra o campo.
- **Escopo:** `Ajustes.tsx`, `HudDoAtlas.tsx` (Camadas, Tempo), `Spotlight.tsx`, `08-ajustes.css`, `04-atlas.css`, dicionários.
- **Verificação:** `atlasConfig.test.ts` (transversal); a11y; simular `navigator.clipboard` ausente no chrome.mjs; capturas.
- **FEITO (08/09):** Ajustes — "Avançado" recolhível (botão com a anatomia do título de seção da ficha, fechado por padrão; os cinco controles avançados só montam quando aberto e seguem respondendo ao Preset), rótulo à esquerda e controle na largura natural à direita (os segmentos passaram de `flex: 1` a `1 1 auto` — "Performance" cabia cortado), estado da qualidade em linha normal, os dois botões de ação em largura cheia (o "?" do convite fica ao lado), copiar link com `role="status"` sempre presente ("Copiado ✓" por 1,5 s) e falha visível (`.ajustes-aviso-falha` + campo somente leitura focado e selecionado; chave nova `ajustes.copiaFalhou` nos dois dicionários); Camadas — sem a coluna de glifos, filete entre linhas, família com eyebrow e contagem; Tempo — só a gaveta do celular mudou (linhas de 44 px com filete); o rodapé da MESA fica nos 16/40 px do Conserto 1 do Lote 4 (cota dos 22 % do §2 e provas do rig) — voltar aos 18/44 do §3.6 é decisão do dono (BACKLOG); Spotlight — pele dos painéis só por CSS (botões na anatomia da pele B, "Continuar" em âmbar, contador sem quebra). Achado transversal: o cabeçalho preso (`.hud-cabecalho`) media a partir da caixa de conteúdo do rolo e cobria a primeira linha de todo painel por um `--pad-painel`; `top` negativo em `01-base.css` corrige os cinco. Fotos `capturas/lote7-*-v2.png` (mesa, celular, 320 ui 1,4) e `lote7-mesa-ajustes-*-en-*-v1.png`; a11y verde; busca verde; atlas-smoke com as 7 falhas antigas (nomes e décadas); `npm run done` verde.

### Lote 8 — Abertura, filme, carregamento, encerramento, erro
- **Objetivo:** §3.1, §3.7, §3.8. Pronto = abertura conforme M1; filme com controles arrumados e tudo do inventário funcionando; ida e volta Atlas ↔ filme e chegada ao encerramento verificadas.
- **Escopo:** `Hud.tsx`, `BarraOuAlcas.tsx` (só o filme), `02-filme.css`, `05-loading.css`, dicionários.
- **Verificação:** a11y (`julgarAbertura`, `julgarChromeDoFilme`); `atlas-smoke.mjs` (portal ida/volta); capturas abertura/filme/fim/carregamento, mesa e celular.

### Lote 9 — Verificação final e encerramento
- Matriz de preservação (§13) preenchida a partir do inventário do Lote 0; provas visuais do §14; `npm run done`; EN e PT; `ui` 0,85 e 1,4; revisão da sessão principal olhando as imagens antes de dizer "pronto"; `BACKLOG.md` recebe o que ficou de fora (uma linha cada); apagar maquetes temporárias só depois de guardar os PNG; nunca apagar provas anteriores; propor ao dono a lista de juízes/testes novos para aprovação (AGENTS.md).

## 13. Preservação — inventário e matriz

Matriz obrigatória (uma linha por recurso): **recurso → onde estava → onde está → callback preservado → como foi verificado**. Cobre, no mínimo: entradas e transições dos três modos (inclusive Retomar × Reviver); todos os controles do filme (pausa, velocidade, capítulos, Ver a galáxia, legendas, encerramento); busca (apelidos, catálogo, lugares, limites por toque/teclado, atalhos); navegação (aproximar, Sistema, bússola, zoom pinado, pinça, órbita como pega, clique no nome); fichas (todas as seções, relevo inventado, `role="status"`); máquina do tempo (sentidos, pausa, velocidade, época, avisos); 19 camadas em 3 famílias; presets e os cinco controles avançados com `Preset`; idioma, escala do texto, rótulos 3D, rever convite; selo e procedência; copiar link; carregamento e recuperação de falha; `?shot=`, `?foco=`, `?jd=`, `?t=`, `?ui=`, `?ajustes=`; Esc, Tab, foco, `aria-live`.

## 14. Verificação

**Testes (vitest, `src/**/*.test.ts`):** `retanguloDoAtlas.test.ts` (extra), `atlasRig.test.ts` (deslocamento com reserva), `useGavetas.test.ts` (compacta/expandida), `destinosDaBusca.test.ts` (10 destinos resolvem; contagem de corpos vem de `corpos.json`), teste de paridade PT/EN (se não existir, criar em `src/lib/idioma/`), `atlasConfig.test.ts` (transversal existente).

**Juízes (`scripts/visual/`):** `a11y.mjs` e `a11y-celular.mjs` (retângulo declarado ≥ medido com as constantes novas; foco; Esc; clique nos nomes), `busca-smoke.mjs`, `atlas-smoke.mjs` (Netuno sob a ficha passa a passar). Provas novas propostas para aprovação do dono no fim: "Esc com dica presa solta só a dica", "falha do clipboard mostra o campo", "cartões de destino chegam ao mesmo alvo que a busca".

**Provas visuais (guardar em `capturas/`, nome = tela-dimensão-versão, nunca sobrescrever):** 1440×900 (composição), 1200×900 (barra quebrando), 390×844 (celular), 320×568 com `ui` 1,4 (acesso e fechamento), 760/761 px (troca de arranjo), 844×390 paisagem, PT e EN, `prefers-reduced-motion`, `?shot=2` (sem HUD).

**Comandos, na raiz:**
```sh
npm run test:tocados
node scripts/visual/a11y.mjs
node scripts/visual/a11y-celular.mjs
node scripts/visual/busca-smoke.mjs
node scripts/visual/atlas-smoke.mjs
npm run done
```

**Só está pronto quando:** as telas batem com as maquetes aprovadas; a régua do §2 confere item a item; a matriz do §13 prova que nada sumiu; nenhum dado científico foi inventado; a ficha compacta deixa o alvo visível; teclado, toque e texto ampliado funcionam; `npm run done` passa; as limitações reais estão escritas no retorno.

## 15. Fora de escopo, riscos e pendências

- **Fora:** redesenhar corpos ou a cena; novos efeitos de pós-processamento; novos modos; sons; publicação.
- **Risco 1 — pele B no celular:** Fraunces em 22 px pode ficar pesada; a maquete M4/M5 decide antes de qualquer código.
- **Risco 2 — reserva de câmera na mesa:** fechar a ficha recentra o alvo (rampa de 240 ms). Se incomodar o dono no portão do Lote 4, a alternativa já decidida é manter a reserva só no celular (`direitaPx = 0`), sem outra mudança.
- **Risco 3 — fonte nos rótulos da cena:** métricas mudam a caixa de clique; a prova "Terra → Terra" é a régua; se reprovar, o `LabelCanvas` fica com a fonte atual e a diferença vai ao backlog.
- **Risco 4 — baselines A/B:** `ab-identidade.mjs` compara dois builds; capturas com HUD e ficha aberta mudam de pose por causa da reserva. Esperado; explicar no retorno, não "consertar".
- **Pendência do dono:** o item 224 (revisão dos painéis de 06/09) fica superado por este plano; registrar em `docs/PENDENCIAS.md` só nas palavras dele.
- **Pendência técnica:** a divergência de chaves entre `pt.ts` e `en.ts` apontada na exploração é verificada no Lote 0 e corrigida no Lote 2 (teste de paridade).
