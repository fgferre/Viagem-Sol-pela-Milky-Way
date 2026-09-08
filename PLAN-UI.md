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
- **FEITO (08/09):** Ajustes — "Avançado" recolhível (botão com a anatomia do título de seção da ficha, fechado por padrão; os cinco controles avançados só montam quando aberto e seguem respondendo ao Preset), rótulo à esquerda e controle na largura natural à direita (os segmentos passaram de `flex: 1` a `1 1 auto` — "Performance" cabia cortado), estado da qualidade em linha normal, os dois botões de ação em largura cheia (o "?" do convite fica ao lado), copiar link com `role="status"` sempre presente ("Copiado ✓" por 1,5 s) e falha visível (`.ajustes-aviso-falha` + campo somente leitura focado e selecionado; chave nova `ajustes.copiaFalhou` nos dois dicionários); Camadas — sem a coluna de glifos, filete entre linhas, família com eyebrow e contagem; Tempo — só a gaveta do celular mudou (linhas de 44 px com filete); o rodapé da MESA fica nos 16/40 px do Conserto 1 do Lote 4 (cota dos 22 % do §2 e provas do rig) — o dono decidiu MANTER assim (08/09: "vamos deixar o rodapé do tempo do jeito que está"); Spotlight — pele dos painéis só por CSS (botões na anatomia da pele B, "Continuar" em âmbar, contador sem quebra). Achado transversal: o cabeçalho preso (`.hud-cabecalho`) media a partir da caixa de conteúdo do rolo e cobria a primeira linha de todo painel por um `--pad-painel`; `top` negativo em `01-base.css` corrige os cinco. Fotos `capturas/lote7-*-v2.png` (mesa, celular, 320 ui 1,4) e `lote7-mesa-ajustes-*-en-*-v1.png`; a11y verde; busca verde; atlas-smoke com as 7 falhas antigas (nomes e décadas); `npm run done` verde. **Conserto do mesmo dia (08/09, pedido do dono: "quero verificar se nos modos de tela maior os cliques no time-machine estão funcionando"):** a máquina do tempo da MESA estava surda a cliques de verdade desde o Lote 4 — a coluna `.atlas-rodape` é `pointer-events: none` e só devolvia o ponteiro aos `.hud-btn`; os controles viraram `.ajustes-seg` e ficaram sem a devolução (os juízes clicam por `.click()` e não viram). Regra nova em `04-atlas.css`; medido com cliques CDP em 1440×900, 1920×1080, 2560×1440, DPR 2 e `ui=1,4`, e varredura de todo controle visível (mesa e celular) sem outro surdo.

### Lote 8 — Abertura, filme, carregamento, encerramento, erro
- **Objetivo:** §3.1, §3.7, §3.8. Pronto = abertura conforme M1; filme com controles arrumados e tudo do inventário funcionando; ida e volta Atlas ↔ filme e chegada ao encerramento verificadas.
- **Escopo:** `Hud.tsx`, `BarraOuAlcas.tsx` (só o filme), `02-filme.css`, `05-loading.css`, dicionários.
- **Verificação:** a11y (`julgarAbertura`, `julgarChromeDoFilme`); `atlas-smoke.mjs` (portal ida/volta); capturas abertura/filme/fim/carregamento, mesa e celular.
- **FEITO (08/09):** Abertura como a M1 — kicker/marca compartilhados (`.title-kicker` eyebrow, `.title-big` Fraunces em caixa normal; `hud.nome` e os títulos de falha passaram a caixa normal no dicionário), coluna de 35rem, "Explorar o Atlas" primário (52 px, âmbar, `hud.porta.atlas`), "Ver o filme · 3 min 13 s" e "Voo livre" (chave nova `hud.porta.voo`; `hud.duracaoCom` virou só `{min} min {seg} s` e `hud.duracao`/`.journey-runtime` saíram — a frase "experiência cinematográfica" não aparece mais, como na maquete) lado a lado com `flex: 1 1 12rem` (empilham sem media query — uiScale.test.ts só aceita 760 como quebra); encerramento com citação em Fraunces, crédito sem rastro largo e três botões na anatomia secundária; carregamento só tipografia (marca, etapa, conta, telemetria); falha com eyebrow, título serifado, mensagem em caixa normal, `<details>` "Detalhes técnicos" (`hud.falhaDetalhes`) e botão na anatomia secundária. Filme — barra em dois grupos (esquerda Entrar no Atlas/Explorar; direita Camadas/chip/Ajustes), transporte num cartão centrado 12 px acima da barra de capítulos (`.filme-transporte`, filho de `.controls-bar` para os juízes e o `.hud-sumido`), legenda com filete, título Fraunces e largura `44vw − 12rem` na mesa (no celular 100% e acima do cartão), lente em eyebrow (no celular sobe para baixo da barra), capítulos em `--acento`; os glifos ⏵/⏸ saíram de `barra.retomar`/`barra.pausar` (o ícone é o `Icone`). Juízes adaptados à decisão do dono: `a11y.mjs` (porta principal única em cor e mais larga, secundárias iguais a ±0,5 px, `.journey-runtime` → última nota; clique em "Explorar o Atlas"), `atlas-smoke.mjs` (idem clique), `filme-smoke.mjs` (as duas frases da abertura em dois `.title-sub`). Fotos `capturas/lote8-*` (antes em `lote8-antes-*`). a11y, filme, busca e voo verdes; atlas-smoke com as 7 falhas antigas; `npm run done` verde.

### Lote 9 — Verificação final e encerramento
- **Pedido do dono (08/09, ao fechar o Lote 8):** *"no celular, a alça Ficha fica esmaecida sem alvo, como na mesa"* — hoje a quinta alça só nasce com alvo (`BarraOuAlcas.tsx`, `portaDaFicha`: sem `regua` o resultado é nada); passa a nascer sempre, apagada sem alvo, como `BotaoDaFicha nome={null}` já faz na régua. A fileira deixa de mudar de tamanho ao escolher um alvo; o juiz `a11y.mjs` que conta as alças ("5 na fileira" com alvo) aprende a regra nova (5 sempre; a quinta desabilitada sem alvo). Filme e voo livre não mudam (não há seleção lá).
- Matriz de preservação (§13) preenchida a partir do inventário do Lote 0; provas visuais do §14; `npm run done`; EN e PT; `ui` 0,85 e 1,4; revisão da sessão principal olhando as imagens antes de dizer "pronto"; `BACKLOG.md` recebe o que ficou de fora (uma linha cada); apagar maquetes temporárias só depois de guardar os PNG; nunca apagar provas anteriores; propor ao dono a lista de juízes/testes novos para aprovação (AGENTS.md).
- **FEITO (08/09):** a quinta alça do celular nasce sempre e fica apagada sem alvo (`BarraOuAlcas.tsx`: `(regua || alcas) && <BotaoDaFicha nome={null} />`; tinta em `09-celular.css`, a mesma da aba apagada da régua); o juiz `a11y-celular.mjs` (a perna do celular do `a11y.mjs`) espera 5 alças nos dois estados e cobra "a quinta (Ficha) APAGADA sem alvo / ATIVA com alvo" (12 provas novas, verdes). Matriz do §13 preenchida abaixo (117 linhas, a partir do commit `450d1ad` — o inventário do Lote 0, `capturas/inventario-ui-2026-09-07.md`, nunca foi gravado; a matriz saiu direto da comparação das duas árvores): nenhum "NÃO ACHEI", 9 "MUDOU" (todos decisões dos lotes, mesmo handler por baixo), 1 chave de dicionário removida sem substituta (`hud.duracao`, decisão do Lote 8), 478 chaves em PT e em EN (paridade imposta pelo tipo `Record<keyof typeof PT, string>`), 34 recursos sem prova automática (linha no BACKLOG). Juízes: a11y (com a perna do celular), busca, filme e voo verdes; atlas-smoke só com as 7 falhas antigas do BACKLOG (nomes e décadas). `npm run done` verde (94 arquivos, 2924 testes). 26 fotos em `capturas/lote9-*-v2.png` (as v1 são a mesma rodada com o convite de primeira visita na frente): 1440×900 PT/EN/`ui` 0,85/`ui` 1,4/`prefers-reduced-motion`/`shot=2`, 1200×900, 760 e 761 (troca de arranjo), 844×390, 390×844 PT/EN, 320×568 com `ui` 1,4 — revistas pela sessão principal (alça apagada, ficha de mesa e de celular, busca com destinos, filme, escala 1,4, fronteira 760/761, paisagem). Ficou para o dono: apagar os arquivos de maquete de `capturas/maquetes/` (os PNG ficam); a lista de juízes novos (as três do §14, "clique de verdade em cada controle visível" e as provas dos 34 recursos sem prova automática); o destino deste arquivo; e as decisões de gosto que já estão no BACKLOG (Ajustes rola ~25 px a 1440×900, títulos das legendas em caixa alta, barra do filme do celular em duas fileiras, parar antes do centro da galáxia).

## 13. Preservação — inventário e matriz

Matriz obrigatória (uma linha por recurso): **recurso → onde estava → onde está → callback preservado → como foi verificado**. Cobre, no mínimo: entradas e transições dos três modos (inclusive Retomar × Reviver); todos os controles do filme (pausa, velocidade, capítulos, Ver a galáxia, legendas, encerramento); busca (apelidos, catálogo, lugares, limites por toque/teclado, atalhos); navegação (aproximar, Sistema, bússola, zoom pinado, pinça, órbita como pega, clique no nome); fichas (todas as seções, relevo inventado, `role="status"`); máquina do tempo (sentidos, pausa, velocidade, época, avisos); 20 camadas em 3 famílias (o plano dizia 19; `atlasConfig.ts` tem 11 + 3 + 6 desde antes do redesenho); presets e os cinco controles avançados com `Preset`; idioma, escala do texto, rótulos 3D, rever convite; selo e procedência; copiar link; carregamento e recuperação de falha; `?shot=`, `?foco=`, `?jd=`, `?t=`, `?ui=`, `?ajustes=`; Esc, Tab, foco, `aria-live`.

### Matriz preenchida (Lote 9, 08/09/2026)

Rodada de 08/09/2026: ANTES = commit `450d1ad` (antes de qualquer código do redesenho), DEPOIS = o HEAD do Lote 9. Onde a coluna "como foi verificado" cita um juiz ou teste, ele rodou verde nesta rodada (a11y com a perna do celular, busca, filme e voo verdes; atlas-smoke com as 7 falhas antigas de nomes e décadas; `npm run done` verde); onde diz "sem prova automática", o recurso foi conferido por leitura (mesmo handler nas duas árvores) e, quando visual, pela foto do Lote 9 em `capturas/lote9-*-v2.png`.

Comparação entre a árvore ANTES (commit `450d1ad`, antes de qualquer código do redesenho) e a árvore DEPOIS (HEAD atual). Caminhos são relativos à raiz do repo; a coluna "onde estava"/"onde está" cita `arquivo:linha` de cada árvore. "Callback preservado": **SIM** (mesmo nome de função/handler, citado), **MUDOU** (o que mudou), **NÃO ACHEI**, ou **NOVO** (recurso que não existia no ANTES — não é perda, é o que o redesenho acrescentou; listado porque o grupo pedia explicitamente).

Método: `diff`/`grep -n`/`sed -n` nas duas árvores; leitura de componente inteiro só quando < 700 linhas. Vários arquivos centrais do motor 3D e dos hooks são **byte-idênticos** entre as duas árvores (confirmado por `diff`, saída vazia) — quando isso vale para o arquivo inteiro, está dito uma vez no início do grupo e todas as linhas daquele grupo herdam "SIM, arquivo idêntico".

Arquivos confirmados **byte-idênticos** (inteiros) entre ANTES e DEPOIS: `src/hooks/useAtalhos.ts`, `src/hooks/useDirector.ts`, `src/hooks/useEspelhoDaUrl.ts`, `src/hooks/useChromeDoFilme.ts`, `src/hooks/useIdioma.ts`, `src/hooks/useCelular.ts`, `src/three/director/gestos.ts`, `src/three/director/maquinaDoTempo.ts`, `src/three/atlasConfig.ts`, `src/three/arrastoDePonteiro.ts`, `src/three/zoomDaRoda.ts`, `src/lib/atlas/ficha.ts`, `src/lib/buscaEstrelas.ts`, `src/lib/idioma.ts`, `src/lib/uiScale.ts`, `src/three/world/rotulos3d.ts`, `src/components/Spotlight.tsx`, `src/lib/idioma.test.ts`. Nenhum arquivo de `src/three/world/`, `src/three/shaders/`, `src/three/cartography/`, `src/three/world/corpos/`, `src/three/world/sol/` ou `src/three/world/planetas/` mudou — o redesenho não tocou cena, física nem dados. Nenhum arquivo de código-fonte foi apagado (`diff` das listagens de `src/` mostra só adições).

---

#### 1. Entradas e transições dos três modos

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Porta "Ver o filme" (abertura → filme) | `src/components/Hud.tsx:275` `onClick={onPlay}` | `src/components/Hud.tsx:284` `onClick={onPlay}` | SIM (`onPlay`) | `scripts/visual/a11y.mjs:290-323` (as 3 portas da abertura, `.abertura-porta`) |
| Porta "Explorar o Atlas" (abertura → Atlas) | `src/components/Hud.tsx:295` `onClick={onAtlas}`, rotulada "Entrar no Atlas", sem destaque de cor | `src/components/Hud.tsx:269` `onClick={onAtlas}`, promovida a `veil-btn--primario` (âmbar), rotulada "Explorar o Atlas" | SIM (`onAtlas` → `App.tsx` `entrarNoAtlas`) | `a11y.mjs:317-323` (porta principal única em cor, decisão do dono citada no comentário) |
| Porta "Voo livre" (abertura → voo livre) | `src/components/Hud.tsx:284` `onClick={onExplore}`, rótulo "Explorar" (chave `hud.porta.explorar`) | `src/components/Hud.tsx:301` `onClick={onExplore}`, rótulo "Voo livre" (chave nova `hud.porta.voo`) | MUDOU (mesmo handler `onExplore`; só o rótulo visível trocou de "Explorar" para "Voo livre" — decisão de copy do Lote 8) | `filme-smoke.mjs:245-246` (as duas frases da abertura, `.title-sub`) + `a11y.mjs` (3 portas) |
| Retomar (Atlas → filme já em curso, quando há filme guardado) | `src/components/BarraOuAlcas.tsx:211` `onClick={partirDoAtlas}`, chave `barra.voltarAoFilme`="Retomar" | `src/components/BarraOuAlcas.tsx:422` `onClick={partirDoAtlas}` | SIM (`partirDoAtlas`) | `scripts/visual/atlas-smoke.mjs:222,308,620` (`window.__director.partirDoAtlas()`) |
| Reviver (fim do filme → reinicia do zero) | `src/components/Hud.tsx:376` `onClick={onPlay}`, chave `hud.fim.reviver` | `src/components/Hud.tsx:381` `onClick={onPlay}` | SIM (`onPlay`) | `a11y.mjs:902-910` lê o rótulo dos 3 botões do véu final (não clica este) — prova parcial |
| Entrar no Atlas a partir do filme (pausar-e-olhar) | `src/components/BarraOuAlcas.tsx:161` `onClick={entrarNoAtlas}` | `src/components/BarraOuAlcas.tsx:459` `onClick={entrarNoAtlas}` | SIM (`entrarNoAtlas`) | `atlas-smoke.mjs:188,615,1845` (`window.__director.entrarNoAtlas()`) |
| Voltar ao filme / "Ver o filme" a partir do Atlas | `src/components/BarraOuAlcas.tsx:195` `onClick={play}` | `src/components/BarraOuAlcas.tsx:402` `onClick={play}` | SIM (`play`) | sem prova automática direta encontrada (grep não achou clique neste botão específico em juiz) |
| Explorar a partir do Atlas (Atlas → voo livre) | `src/components/BarraOuAlcas.tsx:202` `onClick={freeRoam}` | `src/components/BarraOuAlcas.tsx:410` `onClick={freeRoam}` | SIM (`freeRoam`) | sem prova automática direta |
| Ficar aqui (fim do filme → Atlas, na pose da coda) | `src/components/Hud.tsx:380` `onClick={onAtlas}`, chave `hud.fim.ficarAqui` | `src/components/Hud.tsx:385` `onClick={onAtlas}` | SIM (`onAtlas`) | `a11y.mjs:902-931` — clica de verdade em "Ficar aqui" e mede que a câmera pousa na MESMA pose (desvio < 1e-9 do raio) |
| Explorar (fim do filme → voo livre) | `src/components/Hud.tsx:396` `onClick={onExplore}` | `src/components/Hud.tsx:401` `onClick={onExplore}` | SIM (`onExplore`) | `a11y.mjs:902-910` lê o rótulo (não clica este) — prova parcial |

#### 2. Todos os controles do filme

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Pausa/Retomar | `src/components/BarraOuAlcas.tsx:219` `onClick={togglePause}` | `src/components/BarraOuAlcas.tsx:480` `onClick={togglePause}` (cartão `.filme-transporte`) | SIM (`togglePause`) | `scripts/visual/a11y.mjs:655-668` (Espaço → `togglePause`, mede opacidade da barra e `pausado`) |
| Velocidade (cicla a taxa) | `src/components/BarraOuAlcas.tsx:226` `onClick={ciclarVelocidade}` | `src/components/BarraOuAlcas.tsx:488` `onClick={ciclarVelocidade}` | SIM (`ciclarVelocidade`) | sem prova automática (grep não achou clique neste botão em juiz/teste) |
| Capítulos — avançar/retroceder | `src/components/Hud.tsx:496,499` `onSkipChapter(1)/onSkipChapter(-1)` | `src/components/Hud.tsx:501,504` idem | SIM (`onSkipChapter`) | sem prova automática do CLIQUE na barra (o atalho de teclado ArrowLeft/Right é o mesmo `d.skipChapter`, ver Grupo 13, mas não achei juiz clicando a barra) |
| Indicador/barra de progresso dos capítulos | `src/components/Hud.tsx:471-479` `aria-valuenow={capituloAtual+1}`, texto `hud.capituloDeTotal` | `src/components/Hud.tsx:476-484` idem | SIM (byte a byte nesta região; só glifos ⏴/⏸/⏵ viraram `<Icone>`) | `scripts/visual/filme-smoke.mjs:48-74` (`lerLegenda`, checa `.caption-title`/`.caption-sub` dentro da margem) |
| Ver a galáxia (revelar) | `src/components/BarraOuAlcas.tsx:232` `onClick={revealGalaxy}` | `src/components/BarraOuAlcas.tsx:495` `onClick={revealGalaxy}` (dentro do cartão `.filme-transporte`) | SIM (`revealGalaxy`) | sem prova automática direta encontrada |
| Legendas (`Caption`) | `src/components/Hud.tsx:407-424` `role="status" aria-live="polite"`, entra/sai por CSS | `src/components/Hud.tsx:412-429` idem | SIM (mesmo componente `Caption`, mesmas classes `caption-wrap`/`caption-title`/`caption-sub`) | `filme-smoke.mjs:48-74,244-282` (top-8 legendas mais compridas + margens) |
| Encerramento — as 3 saídas (Reviver/Ficar aqui/Explorar) | ver Grupo 1 | ver Grupo 1 | SIM (ver Grupo 1) | `a11y.mjs:895-931` |
| Chrome do filme some sozinho durante a viagem corrida | `src/hooks/useChromeDoFilme.ts` (arquivo inteiro) | idêntico | SIM (arquivo byte-idêntico) | `a11y.mjs:626-668` (mede opacidade pausado/correndo) |

#### 3. Busca

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Apelidos de estrela | `src/lib/buscaEstrelas.ts` (byte-idêntico) importa `APELIDOS_DE_ESTRELAS` | idêntico | SIM (arquivo idêntico) | `src/lib/buscaEstrelas.test.ts:154` (`'apelido popular, nas duas línguas, acha a estrela do catálogo'`) |
| Catálogo (texto livre, designação de Bayer, constelação) | `src/lib/buscaEstrelas.ts` `buscar()` | idêntico | SIM | `buscaEstrelas.test.ts` (suíte inteira) |
| Lugares (centro galáctico etc.) | `src/lib/buscaEstrelas.ts` tipo `LugarBuscavel`; `PaletaDeBusca.tsx:72-74` `entrada.tipo === 'lugar'` | idêntico (`PaletaDeBusca.tsx:78-79`) | SIM | `buscaEstrelas.test.ts:164` (`'a constelação é um LUGAR...'`) |
| Limite de resultados por teclado (8) | `src/components/PaletaDeBusca.tsx:48` `LIMITE_TECLADO = 8` | `src/components/PaletaDeBusca.tsx:54` idem | SIM (byte-idêntico) | sem prova automática dedicada encontrada (não é o mesmo que o limite de toque, abaixo) |
| Limite de resultados por toque (5) | `PaletaDeBusca.tsx:49` `LIMITE_TOQUE = 5` | `PaletaDeBusca.tsx:55` idem | SIM | `busca-smoke.mjs:778-812` (seção de toque, `mobile: true`) |
| Atalho "/" e Ctrl+K | `src/hooks/useAtalhos.ts` (byte-idêntico) | idêntico | SIM (arquivo idêntico) | `busca-smoke.mjs:205-240` (seção "1c: o atalho do teclado abre a paleta") |
| "Limpar busca" (sem resultado) | não existia | `PaletaDeBusca.tsx:222-226,451-454` `limparBusca()` | NOVO (Lote 6) | sem prova automática encontrada por grep |
| Destinos novos (cartões da consulta vazia) | não existia | `PaletaDeBusca.tsx:176-179,384-410` usa `destinosDaBusca()` | NOVO (Lote 6) | `src/lib/destinosDaBusca.test.ts:48-77` (10 destinos resolvem; categorias 6/3/1; primeiro de cada categoria é o principal) |
| Filtro segmentado (Sistema/Estrelas/Galáxia) na busca vazia | não existia | `PaletaDeBusca.tsx:374-383` `<Segmentado>` | NOVO (Lote 6) | `destinosDaBusca.test.ts:71-76` (contagem por categoria) |

#### 4. Navegação

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Aproximar (na ficha, desce um degrau da escada) | `src/components/FichaDoObjeto.tsx:281` `onClick={onAproximar}` | `src/components/FichaDoObjeto.tsx:391` `onClick={onAproximar}` | SIM (`onAproximar`) | `a11y.mjs:1414-1443` — clica "Aproximar" de verdade e mede a câmera indo a ~0,0006 UA da Terra |
| Sistema (sobe até "Sistema Solar") | `FichaDoObjeto.tsx:289` `onClick={onSistema}` | `FichaDoObjeto.tsx:401` `onClick={onSistema}` | SIM (`onSistema`) | `a11y.mjs:1466-1487` testa a MESMA transição via Esc (`subirDegrau`, o botão chama a mesma função) — o clique no botão em si não é exercitado, só o efeito equivalente |
| Bússola (endireitar) | `src/components/HudDoAtlas.tsx:486` `onClick={onEndireitar}` | `src/components/HudDoAtlas.tsx:473` `onClick={onEndireitar}` | SIM (`onEndireitar`) | sem prova automática encontrada |
| Zoom pinado (trava a distância da câmera) | `src/three/cinematic/atlasRig.ts` campo `distanciaPinada` | idem, mais o parâmetro novo e opcional `extra: ReservaDaFicha` | SIM (`distanciaPinada` intocado; o parâmetro novo é aditivo) | `src/three/cinematic/retanguloDoAtlas.test.ts:18` ("sem extra é BIT A BIT o de antes, na mesa e no telefone") |
| Pinça de dois dedos (zoom por toque) | `src/three/director/gestos.ts` (byte-idêntico) `dedos`/`distanciaDosDedos()` | idêntico | SIM (arquivo idêntico) | `atlas-smoke.mjs:2751-2757` (aproximar/afastar dedos move a câmera) |
| Órbita como "pega" (arrastar gira a câmera) | `gestos.ts` `onPointerMove` (byte-idêntico) | idêntico | SIM | `src/three/arrastoDePonteiro.test.ts` (suíte de dono do gesto/multitoque) |
| Clique no nome escolhe o alvo | `gestos.ts:290-291` `fios.selecionar(x, y)` dentro de `onPointerUp` | idêntico | SIM (`fios.selecionar`) | `atlas-smoke.mjs` ("clicar num corpo ESCOLHE e a câmera não sai do lugar", linha ~660) |
| Toque duplo mergulha no alvo | `gestos.ts` `onDuploClique`, `canvas.addEventListener('dblclick', onDuploClique)` | idêntico | SIM (`onDuploClique`) | sem prova automática dedicada encontrada por grep de `dblclick`/`onDuploClique` nos juízes |
| Roda do mouse / pinça de trackpad (zoom) | `gestos.ts` `onRoda`, `canvas.addEventListener('wheel', onRoda)` | idêntico | SIM (`onRoda`) | sem prova automática dedicada encontrada (distinto da prova de toque acima) |

#### 5. Fichas

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Nome do alvo com `role="status"` | `src/components/FichaDoObjeto.tsx:244` `<span className="atlas-ficha-nome" role="status" aria-live="polite">` | `FichaDoObjeto.tsx:344` idêntico, agora dentro de `titulo` do `CabecalhoDoPainel` | SIM (mesma classe, mesmo `role`/`aria-live`) | `busca-smoke.mjs`/`a11y.mjs` leem `.atlas-ficha-nome` por texto (citado no comentário do componente) |
| As 8 seções (estrela/agora/fisico/orbita/ceu/contexto/curiosidades/imagem) | `src/lib/atlas/ficha.ts` (byte-idêntico) `secoes: [...]` | idêntico | SIM (arquivo idêntico) | `src/lib/atlas/ficha.test.ts:105` ("são 48 alvos e os 48 montam"); `:112` (nenhuma ficha vaza `undefined`/`NaN`/"N/A") |
| Relevo inventado (toggle de sombreamento) | `FichaDoObjeto.tsx:301-335` `<label>` solta acima das seções, `onChange={() => onRelevoDaCor(!relevoDaCor)}` | `FichaDoObjeto.tsx:561-585` mesma linha, agora DENTRO da seção "imagem" | SIM (`onRelevoDaCor`, mesmo `checked`/`aria-label`) — só mudou de lugar no layout (Lote 5, §3.5) | `ficha.test.ts` (indireto, não testa o toggle de UI) — sem prova automática do clique |
| Botão "Detalhes"/"Recolher" (celular, compacta ⇄ expandida) | não existia (mesa e celular mostravam o mesmo corpo cheio) | `FichaDoObjeto.tsx:365-381` `onClick={() => onAlternarFichaExpandida?.()}` | NOVO (Lote 5) | `src/hooks/useGavetas.test.ts:207-247` (seção "7. a ficha no celular: compacta/expandida") |
| Aproximar/Sistema (nav.) | ver Grupo 4 | ver Grupo 4 | SIM | ver Grupo 4 |
| Botão que abre a ficha (barra/régua/alças) | `src/components/FichaDoObjeto.tsx:410-432` `BotaoDaFicha`, só existe COM alvo selecionado | `FichaDoObjeto.tsx:603-651` `BotaoDaFicha`, agora SEMPRE presente na régua/alças, desabilitado (`nome=null`) sem alvo | MUDOU (Lote 9, pedido do dono: "a alça Ficha fica esmaecida sem alvo, como na mesa") — mesmo `onAlternar`/`gatilhoDoDialogo` quando há alvo | `a11y.mjs` conta "5 na fileira" (comentário do Lote 9 no `BarraOuAlcas.tsx:577`) |
| Esqueleto de carregamento (3 linhas, `aria-busy`) | não existia | `FichaDoObjeto.tsx:475-482` | NOVO (Lote 5, §9) | sem prova automática encontrada |
| Falha ao carregar + "Tentar de novo" | não existia | `FichaDoObjeto.tsx:485-501` `setErroCorpos(false)`/`setErroTexturas(false)` | NOVO (Lote 5, §9) | sem prova automática encontrada |
| Introdução + "Ler mais" (3 linhas antes das seções) | não existia | `FichaDoObjeto.tsx:240-259,425-448` | NOVO (Lote 5, §3.5) | sem prova automática encontrada |

#### 6. Máquina do tempo (mesa e celular)

Arquivo `src/three/director/maquinaDoTempo.ts` é **byte-idêntico**; a função `BarraDoTempo` em `HudDoAtlas.tsx` só trocou glifos (⏴/⏸/⏵/`{taxa}`) por `<Icone>`/`<span>`, sem tocar em nenhum handler.

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Sentido (andar/pausar/inverter o tempo) | `src/App.tsx:856` `onSentido={(s) => directorRef.current?.andarNoTempo(s)}` | `src/App.tsx:933` idêntico | SIM (`andarNoTempo`) | `src/three/director/maquinaDoTempo.test.ts:102` ("o ⏸ segue o caminho de sempre") |
| Degrau/velocidade (cicla o passo) | `App.tsx:857` `onDegrau={() => directorRef.current?.ciclarDegrau()}` | `App.tsx:934` idêntico | SIM (`ciclarDegrau`) | `maquinaDoTempo.test.ts:89` ("longe das bordas o ⏵ é o de sempre — anda, perturba e publica") |
| Ao vivo (pula para o agora) | `App.tsx:858` `onAoVivo={() => directorRef.current?.alternarAoVivo()}` | `App.tsx:935` idêntico | SIM (`alternarAoVivo`) | sem prova automática dedicada encontrada além do `describe` geral de `maquinaDoTempo.test.ts` |
| Época (volta à época de referência) | `App.tsx:859` `onEpoca={() => directorRef.current?.voltarAEpoca()}` | `App.tsx:936` idêntico | SIM (`voltarAEpoca`) | sem prova automática dedicada além da suíte geral |
| Avisos (parede do tempo) | `src/components/HudDoAtlas.tsx:675` `<p className="atlas-tempo-aviso" role="status" aria-live="polite">{aviso}</p>` | `HudDoAtlas.tsx:668` idêntico | SIM (mesma classe/role) | `maquinaDoTempo.test.ts:44-102` (suíte "a parede do tempo — o relógio assenta em vez de piscar") |
| Rodapé da MESA (permanente) | `App.tsx:854` `<BarraDoTempo ...>` | `App.tsx:931` idêntico | SIM | `a11y.mjs` (o conserto do mesmo dia 08/09 — cliques reais em 5 resoluções, citado no commit `e67a96e`) |
| Gaveta do celular (`GavetaDoTempo`) | `HudDoAtlas.tsx:706-773` cabeçalho próprio (`.atlas-gaveta-topo`) | `HudDoAtlas.tsx:699-761` cabeçalho unificado (`<CabecalhoDoPainel celular={celular}>`), maquete M10 | MUDOU (mesmos props `onFechar`/`onSentido`/`onDegrau`/`onAoVivo`/`onEpoca`, só o cabeçalho trocou de peça) | sem prova automática visual dedicada encontrada por grep (fotos `capturas/lote7-*` citadas no plano, fora do escopo de grep) |
| Alça "⏱ Tempo" (só celular) | `HudDoAtlas.tsx:776` `BotaoDoTempo`, `onClick={onAlternar}` | `HudDoAtlas.tsx:762` idêntico | SIM (`onAlternar`) | sem prova automática dedicada |

#### 7. As camadas em 3 famílias

**Contagem lida do código** (`src/three/atlasConfig.ts`, arquivo byte-idêntico entre as duas árvores — `grep -c "flag: '"` = 20 nas duas): **Galáxia = 11**, **Estrelas = 3**, **Sistema solar = 6** → total **20 camadas**, não 19. Essa contagem já valia no ANTES (mesmo arquivo, mesmas 20 entradas) — não é uma mudança do redesenho; é uma imprecisão do texto do §13/§14 do plano, sinalizada aqui como pedido ("lidas dos dados/código, não de memória").

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Alternar uma camada (checkbox) | `src/components/HudDoAtlas.tsx:132` `onChange={() => onCamada(c.flag, !ligada)}` | `HudDoAtlas.tsx:129` idêntico | SIM (`onCamada`) | `src/three/atlasConfig.test.ts` (suíte transversal, citada no §14 do plano) |
| Família "Galáxia" (11 camadas: nogal, nodisc, nogdust, noglow, nocart, noco, noforge, nonebula, nowrap, nodust, nobh) | `atlasConfig.ts:120-135` | idêntico | SIM (arquivo idêntico) | `atlasConfig.test.ts` |
| Família "Estrelas" (3 camadas: nocat, nonomes, noclarao) | `atlasConfig.ts:136-155` | idêntico | SIM | `atlasConfig.test.ts` |
| Família "Sistema solar" (6 camadas: nosun, nomarker, noplan, noicones, nocorpos, noorbitas) | `atlasConfig.ts:158-176` | idêntico | SIM | `atlasConfig.test.ts` |
| Cabeçalho de família com eyebrow + contagem (`3/3` etc.) | `HudDoAtlas.tsx:104-112` `atlas.familiaConta`, `.atlas-gaveta-conta` | `HudDoAtlas.tsx:100-108` idêntico | SIM (já existia antes do redesenho — o Lote 7 mudou só o CSS, não esta lógica) | sem prova automática dedicada além de `a11y.mjs` genérico |
| Coluna de glifo por camada (✱/⁂/⌶/✦/⌖/◉/◎/◐/◜) | `HudDoAtlas.tsx:131-138` `<span className="atlas-gaveta-icone">{c.icone ?? ''}</span>` | REMOVIDA — não existe mais coluna de glifo | MUDOU (removida por decisão de design, Lote 7: "sem a coluna de glifos, filete entre linhas") — dado `c.icone` continua existindo em `atlasConfig.ts`, só não é mais desenhado na gaveta | n/a (mudança visual deliberada, documentada no PLAN-UI.md) |

#### 8. Presets e os cinco controles avançados

`src/three/atlasConfig.ts` é byte-idêntico: `foraDoPreset` (linha 280) e os cinco campos (`amostras`, `nebulosa`, `escala`, `gas`, `particulas`) não mudaram uma vírgula.

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Regra "Personalizado" (`foraDoPreset`) | `src/three/atlasConfig.ts:280-286` | idêntico | SIM (arquivo idêntico) | `src/three/atlasConfig.test.ts:402-427` (rótulo "(Personalizado)" quando qualquer um dos 5 diverge do preset) |
| Amostras (antialiasing) | `src/components/Ajustes.tsx` região "avançado" (byte-idêntica na região dos 5 controles) | idêntico | SIM | `atlasConfig.test.ts:429-437` ("a gaveta Avançado NÃO redigita os números do preset") |
| Nebulosa | idem | idem | SIM | idem |
| Escala de resolução | idem | idem | SIM | idem |
| Gás volumétrico | idem | idem | SIM | idem |
| Partículas da galáxia | idem | idem | SIM | idem |
| Seção "Avançado" (agora recolhível) | `Ajustes.tsx:477-478` `<h3>` fixo, sempre visível | `Ajustes.tsx:459-481` `<h3><button aria-expanded={avancadoAberto}>` fechada por padrão | MUDOU (novo estado de UI `avancadoAberto`; os 5 controles internos são os mesmos nós, só ficam desmontados quando fechada) | sem prova automática dedicada encontrada |
| `<select>` de qualidade (chip da barra) | `src/components/BarraOuAlcas.tsx:266-278` `onChange={(e) => changeQuality(...)}` | `BarraOuAlcas.tsx:531-543` idêntico | SIM (`changeQuality`) | sem prova automática dedicada de clique; `QUALIDADES`/`rotuloDaQualidade` cobertos por `atlasConfig.test.ts` |
| `?ajustes=1` (abre o painel direto) | `src/hooks/useGavetas.ts:166` `.has('ajustes') ? 'ajustes' : null` | `src/hooks/useGavetas.ts:200` idêntico | SIM | `src/hooks/useGavetas.test.ts:81-108` ("o `?ajustes=1` abre o painel sobre a tela de TÍTULO"; "o ⚙ Ajustes resiste à seleção") |

#### 9. Idioma, escala do texto, rótulos 3D, rever convite, ajuda "?"

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Seletor de idioma | `src/hooks/useIdioma.ts` (byte-idêntico) | idêntico | SIM (arquivo idêntico) | `src/lib/idioma.test.ts` (arquivo também byte-idêntico) — 4 perguntas: escada de escolha, paridade de tabelas/`{param}`, troca ao vivo, varredura de texto solto |
| Escala do texto (`?ui=`, `DEGRAUS_DA_UI`) | `src/lib/uiScale.ts` (byte-idêntico) | idêntico | SIM (arquivo idêntico) | `src/lib/uiScale.test.ts:38-98` (porta `?ui=`, grampo de faixa, nenhuma declaração de fonte foge de `var(--ui)`) |
| Rótulos 3D (nome + distância sobre a cena) | `src/components/LabelCanvas.ts:234-290` fonte do HUD + `notaDaEntrada` | `LabelCanvas.ts:234-308` mesma fonte (tentativa de trocar foi revertida, comentário cita a régua de relevância) + texto novo "X UA daqui" | MUDOU (aditivo: `notaDeDistancia` continua igual; só a frase ganhou `rotulo.distanciaDaqui` ao redor) | `src/components/LabelCanvas.test.ts` (não lido linha a linha, citado por nome; existia igual nas duas árvores) |
| Clique no nome / raycast dos rótulos | ver Grupo 4 | ver Grupo 4 | SIM | ver Grupo 4 |
| Convite guiado (Spotlight, Atlas e voo livre) | `src/components/Spotlight.tsx` (byte-idêntico, 200/200 linhas) | idêntico | SIM (arquivo idêntico) | `a11y.mjs` seção "O CONVITE DO ATLAS" (~linha 1489+, clica e mede o furo/máscara); `voo-smoke.mjs` julga o convite do voo livre por inteiro (citado no comentário do juiz) |
| "Rever convite" (reabre o Spotlight pelos Ajustes) | `src/App.tsx:1097` `onReverConvite={...}` chama `setConvite({ onde, passo: 0 })` | `src/App.tsx:1187` idêntico | SIM (mesmo corpo de função, byte a byte) | sem prova automática dedicada além da suíte geral do convite acima |
| Ajuda "?" (dica inline de cada controle) | `src/components/Ajuda.tsx` (57 linhas) `onAlternar`/`presa` | `src/components/Ajuda.tsx` (73 linhas) mesmos props + `scrollIntoView` ao fixar | SIM (mesma API; a adição é aditiva) | `a11y.mjs` referencia dicas presas em várias seções (Esc com dica presa, Grupo 12) |

#### 10. Selo/procedência, copiar link, carregamento e falha

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Selo — "Escala real" | `src/components/HudDoAtlas.tsx:325` `onClick={onEscalaReal}` | `HudDoAtlas.tsx:313` `onClick={onEscalaReal}` | SIM | sem prova automática dedicada encontrada por grep |
| Selo — "Brilho real" | `HudDoAtlas.tsx:366` `onClick={onBrilhoReal}` | `HudDoAtlas.tsx:354` `onClick={onBrilhoReal}` | SIM | sem prova automática dedicada encontrada |
| Selo — abrir/fechar (procedência) | `HudDoAtlas.tsx:428` glifo `▾`/`▸` | `HudDoAtlas.tsx:415` `<Icone nome={aberto ? 'chevronBaixo' : 'chevronDireita'}>` | SIM (mesmo estado `aberto`, só o glifo virou ícone) | sem prova automática dedicada |
| Copiar link | `src/components/Ajustes.tsx:626-634` `navigator.clipboard.writeText(urlParaCopiar())` inline | `Ajustes.tsx:294-311` `aoClicarCopiarLink()`, mesma chamada de `urlParaCopiar()` | MUDOU (extraído para função nomeada; comportamento de sucesso idêntico — "Copiado ✓" 1,5 s) | `src/App.tsx:1186` `urlParaCopiar={() => urlComMomento().toString()}` idêntico nas duas árvores (via `useEspelhoDaUrl.ts`, byte-idêntico) |
| Falha ao copiar (clipboard indisponível/rejeitado) | não existia (falha ficava muda) | `Ajustes.tsx:296-311,645-666` `urlSemCopia`, campo somente-leitura focado e selecionado | NOVO (Lote 7) | citado no commit `ee53b8f` ("simular `navigator.clipboard` ausente no chrome.mjs") — não confirmado por grep de teste específico nesta sessão |
| Carregamento (etapas, telemetria, contagem) | `src/components/Hud.tsx` região `mode === 'loading'` (não alterada no diff) | idêntica | SIM (região fora do diff do Lote 8 — só a tipografia ao redor mudou) | sem prova automática dedicada encontrada além dos juízes gerais de carregamento citados no plano |
| Tela de falha — mensagem | `Hud.tsx:198-207` `<div className="title-sub">`/`cv-falha-detalhe` sempre visível | `Hud.tsx:199-213` mesma estrutura, texto técnico dentro de `<details>` | MUDOU (o texto de erro em si — `error` — é o mesmo; só passou a morar dentro de `<details><summary>{t('hud.falhaDetalhes')}</summary>`) | sem prova automática dedicada encontrada |
| Botão "Tentar de novo" (falha) | `Hud.tsx:215` `onClick={onRetry}` | `Hud.tsx:215` idêntico (linha fora do diff) | SIM (`onRetry`, byte-idêntico) | sem prova automática dedicada encontrada |

#### 11. Parâmetros de URL

Todos os `.get('...')`/`.has('...')` relevantes vêm de arquivos confirmados **byte-idênticos** (`useDirector.ts`, `useEspelhoDaUrl.ts`, `idioma.ts`) ou de linhas que não mudaram dentro de `App.tsx`/`director.ts` (confirmado por grep comparando as duas árvores lado a lado — mesmo texto, só a numeração de linha desloca por causa de comentários novos em volta).

| parâmetro | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| `?shot=` | `src/App.tsx:702` | `src/App.tsx:778` | SIM (mesma linha de código) | `filme-smoke.mjs`/`a11y.mjs` usam `?shot=` extensivamente para captura determinística |
| `?foco=` | `src/hooks/useDirector.ts:261` (arquivo idêntico) | idêntico | SIM | `useGavetas.test.ts:104-108` ("o ⚙ Ajustes resiste à seleção — o link `?ajustes=1&foco=` é a razão") |
| `?jd=` | `src/three/director.ts:1714` (BASE) / `:1741` (HEAD) | — | SIM (mesmo corpo, `lerPortaJd`) | `src/three/director.test.ts:595-608` |
| `?t=` | `useDirector.ts:259` (idêntico) | idêntico | SIM | `atlas-smoke.mjs` (`t=192.5&play=1` etc., uso extensivo) |
| `?ui=` | `src/hooks/useEspelhoDaUrl.ts:89` (idêntico) | idêntico | SIM | `uiScale.test.ts:38-51` (porta `?ui=`) |
| `?ajustes=` | `src/hooks/useGavetas.ts:166` (BASE) / `:200` (HEAD) | — | SIM (mesma linha) | `useGavetas.test.ts:81-108` |
| `?nobloom=` | `src/three/director.ts:773` (BASE) / `:800` (HEAD) `this.debug.has('nobloom')` | — | SIM | citado em `src/three/core/post.ts` (item 72) e `selo.ts:688`; sem juiz específico achado nesta sessão |
| `?loader=` | `App.tsx:334` (BASE) / `:361` (HEAD) | — | SIM (mesma linha) | sem prova automática dedicada encontrada |
| `?cart=` | `App.tsx:221` (BASE) / `:248` (HEAD) | — | SIM (mesma linha) | sem prova automática dedicada encontrada |
| `?d=` | `useDirector.ts:290` (idêntico) | idêntico | SIM | citado nas prévias de destino (`previas-de-destino.mjs`, `ver=corpo&d=`) |
| `?q=` (qualidade) | `useDirector.ts:214` + `three/core/engine.ts:641` (idênticos) | idênticos | SIM | `atlasConfig.test.ts` (indireto, `EscolhaDeQualidade`) |
| `?atlas=` | `useDirector.ts:262` `query.has('atlas')` + `useEspelhoDaUrl.ts:149-150` (idênticos) | idênticos | SIM | `retanguloDoAtlas.test.ts`, `atlas-smoke.mjs` (`?atlas=1` em toda a suíte) |
| `?lang=` | `src/lib/idioma.ts:77` (byte-idêntico) | idêntico | SIM (arquivo idêntico) | `idioma.test.ts` (escada de escolha do idioma) |

#### 12. Esc (cadeia; dica presa), Tab/foco, `aria-live`

| recurso | onde estava (antes) | onde está (depois) | callback preservado | como foi verificado |
|---|---|---|---|---|
| Esc fecha o diálogo (foco volta ao gatilho) | `src/lib/dialogFocus.ts` `useDialogFocus` (lógica de Esc/Tab não tocada pelo diff) | idêntica | SIM | `a11y.mjs:1423-1432` ("descer: aproximar enquadra..."); trap de Tab em `a11y.mjs:223,226,336` |
| Esc com dica presa solta só a dica (não fecha o painel) | Cada painel escrevia o mesmo `onKeyDownCapture` à mão 5 vezes (ex. `src/components/Ajustes.tsx` BASE:343-354, `PaletaDeBusca.tsx` BASE:251-260, `HudDoAtlas.tsx` BASE:87-92 e 734-739, `FichaDoObjeto.tsx` BASE:228-236) | Centralizado em `src/hooks/useDicaPresa.ts:22-25` (`decidirEscDaDica`) + `:33-44` (`aoTeclarEsc`), consumido igual nos 5 painéis via `onKeyDownCapture={aoTeclarEsc}` | MUDOU (refatorado para um hook único; `stopPropagation()`+`limpar()` idênticos ao código antigo) | `src/hooks/useDicaPresa.test.ts:10-19` (3 casos: consome com dica presa, não consome sem dica, nunca consome outra tecla) |
| Esc sobe um degrau na escada do Atlas (só sem diálogo aberto) | `src/hooks/useAtalhos.ts:61-70` (byte-idêntico) | idêntico | SIM (arquivo idêntico) | `a11y.mjs:1449-1487` (Esc com diálogo aberto fecha o diálogo e NÃO sobe degrau; Esc livre sobe um degrau por vez) |
| Tab preso dentro do diálogo aberto (focus trap) | `dialogFocus.ts` (só ganhou a opção `focoInicial`, o resto do contrato de Tab não mudou) | idêntico | SIM | `a11y.mjs:223,226,336` (`s.teclar('Tab')`/`Tab, {shift:true}`) |
| `aria-live` — legenda do filme | `src/components/Hud.tsx:420` `role="status" aria-live="polite"` | `Hud.tsx:425` idêntico | SIM | `filme-smoke.mjs` (`.caption-title`/`.caption-sub`) |
| `aria-live` — nome do alvo na ficha | ver Grupo 5 | ver Grupo 5 | SIM | ver Grupo 5 |
| `aria-live` — aviso da busca | `PaletaDeBusca.tsx:349` `role="status" aria-live="polite"` | `PaletaDeBusca.tsx:447` idêntico | SIM | `busca-smoke.mjs` |
| `aria-live` — aviso da máquina do tempo | ver Grupo 6 | ver Grupo 6 | SIM | ver Grupo 6 |
| `aria-live` — convite (Spotlight) | `Spotlight.tsx:177` (arquivo idêntico) | idêntico | SIM | ver Grupo 9 |
| `aria-live` — medida de qualidade (Ajustes) | `Ajustes.tsx:466` (BASE) | `Ajustes.tsx:446` idêntico | SIM | sem prova automática dedicada além da suíte geral de a11y |
| `aria-live` — "Copiado ✓" | não existia | `Ajustes.tsx:647` `role="status" aria-live="polite"` | NOVO (Lote 7) | sem prova automática dedicada encontrada |

#### 13. Atalhos de teclado e gestos

`src/hooks/useAtalhos.ts` e `src/three/director/gestos.ts` são **byte-idênticos** entre as duas árvores — todo este grupo herda "SIM, arquivo idêntico" salvo indicação em contrário.

| atalho/gesto | onde mora | callback | como foi verificado |
|---|---|---|---|
| `/` e Ctrl+K → abre a busca | `useAtalhos.ts:33-50` | `abrirBusca()` | `busca-smoke.mjs:205-240` |
| Espaço → pausa/retoma o filme | `useAtalhos.ts:82-84` | `setPaused(d.togglePause())` | `a11y.mjs:655-668` |
| ArrowRight/ArrowLeft → avança/retrocede capítulo | `useAtalhos.ts:85-91` | `d.skipChapter(1)/(-1)` | sem prova automática dedicada encontrada (o botão equivalente também não tem, ver Grupo 2) |
| Esc → sobe degrau da escada do Atlas (guardado por diálogo) | `useAtalhos.ts:61-70` | `d.subirDegrau()` | `a11y.mjs:1449-1487` |
| Clique curto e parado → escolhe o alvo | `gestos.ts:290-291` | `fios.selecionar(x,y)` | `atlas-smoke.mjs` ("clicar num corpo ESCOLHE...") |
| Duplo clique/toque → mergulha no alvo escolhido | `gestos.ts` `onDuploClique` | `onDuploClique` | sem prova automática dedicada encontrada |
| Arrastar → orbita a câmera (ou olha ao redor, pausado) | `gestos.ts` `onPointerMove` | `arrasto.mover()` | `src/three/arrastoDePonteiro.test.ts` |
| Roda do mouse / Ctrl+roda (trackpad) → zoom | `gestos.ts:398` `onRoda` | `onRoda`/`roda.empurrar()` | `src/three/zoomDaRoda.test.ts` (arquivo idêntico, citado por nome) |
| Pinça de dois dedos (toque) → zoom | `gestos.ts:204-211` `distanciaDosDedos()` | `roda.empurrar(pixelsDaPinca(...))` | `atlas-smoke.mjs:2751-2757` |
| Botão direito → menu de contexto desativado | `gestos.ts:378-380` `onContextMenu` → `preventDefault()` | `onContextMenu` | sem prova automática dedicada encontrada |

---

#### Chaves de dicionário removidas (pt.ts, ANTES → DEPOIS)

Comparação completa das chaves de `src/lib/idioma/pt.ts` entre as duas árvores (regex `^\s*'([^']+)':` nas duas, via Node — 442 chaves no ANTES, 478 no DEPOIS, 37 chaves novas).

**Uma única chave sumiu sem substituta equivalente:**

- **`hud.duracao`** (valor: `'experiência cinematográfica'`) — usada só como rótulo de fallback da porta "Ver o filme" quando não havia duração calculada, e no `.journey-runtime` do rodapé da abertura antiga. Removida no Lote 8 junto com `.journey-runtime` (que também saiu do DOM). **Não é um achado de bug**: está documentada no commit `9a67100`/`PLAN-UI.md` Lote 8 como decisão de copy do dono, aprovada na maquete M1 — "hud.duracaoCom virou só {min} min {seg} s e hud.duracao/.journey-runtime saíram — a frase 'experiência cinematográfica' não aparece mais, como na maquete". A chave irmã `hud.duracaoCom` continua existindo nas duas árvores, só com o valor mais curto.

Nenhuma outra chave do pt.ts do ANTES ficou sem correspondente no DEPOIS.

#### Paridade pt.ts / en.ts (DEPOIS)

- `src/lib/idioma/pt.ts`: **478 chaves**
- `src/lib/idioma/en.ts`: **478 chaves**
- Diferença de conjunto (chaves só num lado): **zero** nos dois sentidos.
- Essa paridade é também **imposta pelo compilador**: `en.ts:31` declara `export const EN: Record<keyof typeof PT, string> = {...}` — uma chave nova em `pt.ts` sem par em `en.ts` não compila (`npm run done` reprovaria antes de qualquer teste rodar).

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
