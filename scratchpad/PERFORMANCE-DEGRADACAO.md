# Degradação de performance — achados comprovados

**Para:** a outra AI consertar. **Não é plano de produto.** Só o que foi
medido nesta máquina (Mac M1) em 23/08/2026, contra os commits locais
ainda sem push.

**O que este texto NÃO é:** diário, hipótese frouxa, nem pedido para
desfazer a onda de UI. Bit-idêntico não é objetivo.

**O que NÃO foi tocado:** código do app, Vite em `:5173`, Claude (o de
~10 min e os mais velhos), npm, CodeAgentSwarm. Dois Chromes headless
órfãos de **mais de um dia**, pai morto (`PPID=1`), foram encerrados —
detalhe no achado 1.

---

## O intervalo

| | |
|---|---|
| Frente de `origin/main` | **119** commits (não 116) |
| `origin/main` | `2fcb3e5` · 21/08 00:37 |
| `HEAD` | `fe29483` · 23/08 18:52 |
| Diff | 183 arquivos, +32 031 / −6 111 |
| `src/` | +15 787 / −3 005 |

Não houve upgrade visual de cena (galáxia, bloom, partículas, `nebsteps`,
`samples` default). A onda foi UI/Atlas/juízes. A degradação que o dono
vê **não precisa ser um shader novo** — nesta máquina, o maior vilão
nem estava no quadro do app.

---

## Achado 1 — Chromes headless órfãos com GPU Metal

**Impacto: o maior desta máquina. Já medido no próprio projeto como
20 → 8 fps.** Causa da classe que o dono suspeitou ("processos órfãos
de rodadas anteriores").

### O que estava vivo (23/08 ~19:07)

Dois browsers headless, **pai = launchd (`PPID=1`)**, GPU ligada:

| Família | Desde | Janela | CPU da família | RSS | Flags |
|---|---|---|---|---|---|
| `…/T/probe2-44030` | sáb 22/08 02:25 · **1 d 16 h** | 1200×900 | **29 %** | ~490–635 MB | `--headless=new --enable-gpu --use-gl=angle --use-angle=metal` |
| `…/T/voo-90002` | sáb 22/08 00:27 · **1 d 18 h** | 900×900 | **15–21 %** | ~572–767 MB | idem |

Soma no instante do SIGTERM: **~45 % de CPU + ~1,2 GB de RAM + dois
contextos GPU Metal** disputando o mesmo M1 que o app do dono.

- `voo-90002` é o juiz `scripts/visual/voo-ida-e-volta.mjs`
  (`abrirSessao({ prefixo: 'voo' })` → perfil `${prefixo}-${pid}`).
- `probe2-44030` **não existe no fonte atual** — prefixo de harness
  one-off de agente. Mesmo contrato de lançamento (`abrirSessao` /
  `GPU_FLAGS`).

Os dois mains receberam SIGTERM. Filhos saíram. Vite (`4175`, 1 d 21 h)
e Claude ficaram. Depois do kill: **zero** Chrome headless na máquina.

### Já estava escrito — e com número

Cabeçalho de `scripts/visual/chrome.mjs`:

> `chrome.kill()` NÃO basta: o processo que o Node gera é só o browser:
> os helpers de GPU e renderer são filhos que sobrevivem ao pai. Medido
> nesta máquina — depois de quatro invocações do gpu-profile havia 14
> Chrome órfãos vivos, e eles não são inertes: disputam a MESMA GPU que
> o harness está medindo. **A baseline caiu de 20,0 para 8,0 fps** entre
> a primeira e a quarta execução.

Pendências **64** e **78**: filho que não morre; `ab-identidade` com
`JOBS=3` deixou **20 Chrome órfãos**. A classe é conhecida. Continua
acontecendo.

### Por que o `finally { s.fechar() }` não basta

`voo-ida-e-volta.mjs` **tem** `finally { s.fechar() }`. `fechar` faz
`chrome.kill()` + `matarPerfil` (`pkill -f` no perfil). Mesmo assim o
Chrome ficou 1 d 18 h com `PPID=1`.

Causa, comprovada por ausência:

1. **Nenhum** `process.on('exit' | 'SIGINT' | 'SIGTERM')` em
   `chrome.mjs` nem nos 11 harnesses que chamam `abrirSessao`.
2. `spawn(CHROME, GPU_FLAGS, { stdio: 'ignore' })` — Chrome no macOS
   reparenta para o launchd quando o Node morre no meio (Ctrl+C, SIGKILL
   de agente, `process.exit` fora da pilha do `finally`, sessão abortada).
3. Com o pai morto, `fechar()` nunca roda. O headless **continua o rAF
   do app** (`--enable-gpu`, Metal), comendo GPU de verdade.

Os 11: `atlas-smoke`, `a11y`, `busca-smoke`, `filme-ritmo`,
`filme-smoke`, `estabilidade-temporal`, `voo-ida-e-volta`, `voo-smoke`,
`memoria`, `z-fighting`, e o próprio `abrirSessao`. Todos `fechar=sim`,
todos `sigint=não`.

### O que a outra AI deve fazer

1. **Higiene (agora, sem matar o app):**
   ```bash
   # só headless com perfil em /var/folders/.../T/  — NÃO o Chrome do dono
   pgrep -lf 'headless=new' 
   # se o user-data-dir for tmp (voo-|probe|a11y-|atlas-smoke-|filme-|mb1-|cdp-|memoria-|z-fight)
   # e ELAPSED > 15 min: SIGTERM no PID do main (--headless=new sem Helper)
   ```
   Não matar: Vite `:5173`, `npm run dev`, qualquer `claude`,
   CodeAgentSwarm, Chrome **sem** `--headless=new`.
2. **Conserto em `chrome.mjs` (a peça):**
   - `abrirSessao` / `capturarCDP` registram `exit` + `SIGINT` + `SIGTERM`
     → `matarPerfil(perfil)` + `chrome.kill()`.
   - Depois de `chrome.kill()`, o `pkill -f perfil` já existe
     (`matarPerfil`) — tem de rodar **também** no sinal, não só no
     `finally` feliz.
   - Opcional e melhor: grupo de processo (`detached: false` +
     `process.kill(-pid)`) para os Helpers Metal não reparentarem.
3. Não chamar `process.exit` antes de `fechar`. Os juízes que hoje
   fazem `process.exit(1)` **depois** do `finally` do `voar()` estão
   ok **se** o `finally` rodou; o buraco é o processo morrer **antes**.

Isto sozinho, nesta máquina, é da ordem de **devolver dezenas de fps**
quando há órfãos — o próprio `chrome.mjs` já mediu 20 → 8.

---

## Achado 2 — O relógio do céu abre andando (commit `0f18242`)

**Impacto alto no Atlas, zero no filme parado.** É dos 119. Não estava
em `origin/main`.

Em `Director` (entrada no Atlas), se não há `?jd=` / `?shot=` / `?t=`:

```
this.maquinaDoTempo.alternarAoVivo();
```

Antes: Atlas nascia **parado**. Depois (item 61, 23/08): nascia **ao
vivo**, como o NASA Eyes.

O comentário no mesmo bloco diz "custo em quadro é zero na prática" a
224 UA (a Terra anda 1,3×10⁻⁶ px/s). Isso é sobre **pixel da cena**, não
sobre a thread.

O que **passa a acontecer o tempo todo** no Atlas, sem o dono apertar
nada:

| Peça | Cadência | Custo |
|---|---|---|
| `andarORelogio` → relê `dateToTDB` | 1 Hz (`PASSO_DO_AO_VIVO_S`) | efeméride dos dez corpos |
| `publicarTempo` → `onTempo` → `setTempo` no `App` | **4 Hz** (`PASSO_DO_MOSTRADOR_S`) | **re-render do HUD inteiro** |
| `recomporAlvo` | 1× por instante de céu | câmera segue o corpo |
| Sol (`escreverCiclo`) | a data viva | no 1× o ciclo de 11 anos quase não re-assa; no degrau rápido do calendário, sim (`LIMIAR_DE_REASSAR`, item 5, `71775f0`) |

A 4 Hz no `App.tsx` é o mesmo tipo de custo que `9a2e9a9` acabou de
matar na ficha **fechada** ("a câmera subia para o React quatro vezes
por segundo por um painel que ninguém tinha aberto"). O relógio ao
vivo **reabre esse cano** no mostrador: `setTempo` 4×/s com o HUD do
Atlas inteiro (selo, alças, ficha se aberta, máquina do tempo).

No M1 a thread do JS é a mesma do WebGL. Stutter de HUD vira quadro
perdido.

### O que a outra AI deve fazer

- **Não** desligar o relógio ao vivo por default sem o dono — é decisão
  dele (item 61, foto `capturas/item61-relogio-ao-vivo.png`).
- **Sim** parar de re-renderizar o `App` inteiro a 4 Hz: o mostrador da
  data pode ser um componente que ouve o tempo **sem** `setState` no
  raiz (o progresso do filme já faz isso com CSS `--journey-progress`).
- Prova que cobre: Atlas aberto sem `?jd=`, ficha fechada, medição de
  fps 20 s com relógio ao vivo vs `aoVivo=false`. Vista com relógio
  parado **não** prova este item.

O Sol por calendário (`71775f0`) **não** é o vilão no 1×: o limiar de
re-assar é ~16 dias de céu. Só pesa com a máquina do tempo no degrau
rápido, e aí o catch-up já foi coalescido (`ac63354`, `ff0c34f`,
`93bac11`).

---

## Achado 3 — Rótulos: 3 nomes → 10, com 7 lugares × 2 lados por quadro

**Impacto alto no Atlas (abertura e sistema). Dos 119 (`fbbf105` +
`LabelCanvas.DESLOCAMENTOS`).**

`projectLabels` ainda fatia `maxLabels = 7` no voo; no Atlas a abertura
prometeu **"os 8 planetas e o Sol com nome, contra 3 hoje"**. Os dez
corpos + 21 luas projetam no mesmo nó. `LabelCanvas.draw`:

- limpa o canvas 2D **em cima do WebGL** (comentário da peça: 3,7 M px
  quando vazio→vazio; o early-out **não** dispara com nomes na tela);
- para **cada** rótulo: dois `measureText` + laço de **7 deslocamentos
  × 2 lados** contra a lista de ocupados (HUD + nomes já desenhados).

Isso roda **todo quadro** (`onLabels` → `labels.draw`). Não muda o
look da galáxia. Come CPU da thread principal no modo que o dono mais
usa depois da onda do Atlas.

O filme (prioridade `undefined`) cai no peso antigo, pixel a pixel — o
custo novo é do Atlas.

### O que a outra AI deve fazer

- Não desfazer os dez nomes (pedido do dono).
- Baratear: (a) não `draw` se a lista projetada e as caixas do HUD não
  mudaram; (b) cache de `measureText` por string+fonte; (c) no degrau
  `sistema` da abertura, não projetar as 21 luas (já nascem
  `desenhado: false` no nó de 40 px — trabalho pago para ninguém).
- Prova: Atlas `?atlas=1` com rótulos vs `?norotulos` (se a porta
  existir) ou gaveta de camadas, fps 20 s. Captura `?shot=2` **não**
  cobre — apaga o HUD.

---

## Achado 4 — Dois blooms por quadro, e `?nobloom=1` mente

**Impacto alto de GPU. NÃO nasceu nestes 119** (`post.ts` não muda no
diff). Continua sendo o trabalho extra mais caro **dentro** do app, e
o item **72** já o nomeia.

`ClaraoDoCampo` (`core/post.ts`), a cada quadro:

1. render das superfícies opacas só em depth (`CAMADA_DOS_OCULTADORES`);
2. render do catálogo + cascas + heroes (`CAMADA_DO_CAMPO`);
3. **`bloom.render` na mão** com a pirâmide do filme
   `[1; 0,8; 0,6; 0,4; 0,2]`, força 0,72, raio 0,58, **limiar 0**;
4. soma aditiva no quadro.

O bloom **principal** (fotosfera, galáxia, nebulosa) já rodou. São **duas
pirâmides UnrealBloom por frame**. No M1, isso sozinho explica "cinema
sem upgrade visual e mesmo assim mais pesado" **se** a comparação do
dono inclui o cobertor do campo (R2 do item 44, 17/08 — um pouco antes
desta frente, mas o custo está no binário que ele roda agora).

Item 72, medido: `?nobloom=1` muda **0,35 %** da luz a 40 UA. A porta só
apaga `post.bloom.enabled`. O segundo cobertor **não lê** `enabled`.

### O que a outra AI deve fazer

- Fazer `ClaraoDoCampo.render` respeitar a mesma chave que o bloom
  principal (uma guarda). **Move pixel** nas vistas que hoje usam
  `?nobloom=1` — `ab-identidade` cheio com delta declarado, item 72.
- Não desligar o cobertor do campo no produto sem o dono: ele pediu o
  respiro das estrelas. O conserto honesto é a porta deixar de mentir,
  e um preset `performance` poder desligar o **segundo** passe.
- Prova: mesma vista `?q=performance` vs cinema, e a mesma com
  `ClaraoDoCampo` no-op, fps 20 s **em movimento**. Quadro parado com
  `?shot=2` não mede o custo do passe (ele roda, mas o olho não vê
  engasgo de 1 frame).

---

## O que NÃO é destes 119 (mas o M1 sente)

### Qualidade default = cinema

`TIER_DE_PRODUTO = 'cinema'` → `pixelRatio: 2.0`, `nebulaSteps: 56`,
alocação de ~4 M partículas. Entrou em `38ff0ee` (20/08 20:52), **já
estava em `origin/main`**. A detecção por aparelho e o storage saíram
do boot: o M1 **não** cai mais sozinho para `alta`/`performance`.

O Auto **mede e sugere** ("Cinema, a 28 quadros/s — Alta deve andar
melhor") e **só troca** se o visitante escolheu Auto. Em manual, 18 s
com a medição pedindo outro tier e nada se move (item 7, letra D).

Se o dono compara com **antes de 20/08**, isto é tão grande quanto o
achado 1. Se compara só com `origin/main`, **não mudou**.

Não reabrir a detecção no boot — o NORTE é "medição sugere, o visitante
escolhe". O que se pode: no M1, o painel de qualidade mais visível, ou
o produto nascer em `alta` **se** o dono autorizar. É gosto/escopo, não
mecânica.

### `backdrop-filter: blur(14px)` nos cartões

Já existia em quatro cópias (`03-controles`, `04-atlas`, `08-ajustes`).
Os 119 **unificaram** em `.hud-cartao` e passaram a usá-lo também na
**ficha**, no **selo aberto** e na gaveta de **17 camadas nos dois
modos**. Blur sobre canvas WebGL é composto na GPU. Só pesa com o
painel **aberto**. Não é o vilão com a gaveta fechada.

---

## O que os 119 já consertaram (não "consertar" de novo)

| Commit | O que era | Estado |
|---|---|---|
| `9a2e9a9` | câmera → React 4 Hz com ficha fechada | morto |
| `93bac11` | forno do Sol nunca parava (3 leituras de um sinal 1/9) | morto |
| `7a5dc27` | Auto balançava a cada 17,5 s e re-assava o mundo | morto (`TravaDoVaivem`) |
| `108e31e` | Atlas parava com 1,1 GiB de texel (pré-aquecimento dos 12) | morto; dose por foco |
| `afc40ae` | voltar ao tier vivo não cancelava o assado do meio | morto |
| `cedf650` | 16 geometrias das heroes sobreviviam ao `dispose` | morto |
| `4c645b6` | `?samples=` sem teto (laço GLSL) | teto 96 |
| `6dacdc4` | CDP `send` sem saída se o Chrome morria | socket fecha reprova pendentes — **não** mata órfão de perfil |

Worker da carga (`assarCargaEmWorker`) dá `terminate()` no sucesso e no
erro. Não achei worker órfão do app. O Vite em `:5173` está idle (~0 %
CPU, 29 MB) — **não matar**.

Não achei segundo `requestAnimationFrame` no app além do loop do
`Engine` (e o `CartografiaCanvas` só com o mini-mapa montado). Não achei
aumento de `nebulaSteps` / `samples` default / partículas da galáxia
neste intervalo. M4/M5 (`7d488d0`, `33cb0bb`) **unificam** lei de tela;
nas forjas o teto **cai** (26 → 20 px). Não é mais GPU.

---

## O que NÃO atribuir a estes commits

- "O app ficou mais pesado porque a UI mudou de cor" — a cena 3D é a
  mesma lei.
- Desfazer a ficha, as dez etiquetas, o relógio ao vivo ou o cobertor
  do campo **sem** o dono. São decisões dele. O conserto é o custo
  escondido (órfãos, 4 Hz no `App`, segundo bloom surdo à porta, draw
  de rótulo todo quadro).
- Matar o Claude de agora, o Vite, ou o Chrome de janela. Os órfãos
  desta classe têm `--headless=new` + `user-data-dir` em
  `/var/folders/.../T/<prefixo>-<pid>`.

Nesta sessão ainda havia (e **ficaram**): Claude.app 1 d 21 h, um
`claude` ~22 h, o Claude ~10 min, CodeAgentSwarm, Codex/ChatGPT. Isso
também compete pelo M1, mas não é regressão do git.

---

## Ordem sugerida para a outra AI

1. **Higiene de Chrome headless** (achado 1) — imediato, zero risco de
   pixel. Confirmar fps do app com a máquina limpa **antes** de mexer
   em cena.
2. **`chrome.mjs` + sinais** — para a próxima rodada de juízes não
   recriar o achado 1. Os itens 64 e 78 continuam abertos até uma leva
   presa sair com erro em vez de sono; este conserto é o da **família
   GPU**, não só do socket CDP (`6dacdc4`).
3. **Mostrador a 4 Hz sem `setState` no `App`** (achado 2) — o relógio
   ao vivo fica; o HUD para de ser o preço.
4. **`LabelCanvas.draw` idempotente / luas fora da abertura** (achado 3).
5. **`ClaraoDoCampo` respeita `?nobloom`** (achado 4 / item 72) — com
   A/B declarado, porque muda pixel.

Prova de cada passo: **fps em movimento, no navegador do dono, no M1**,
com a lista de processos headless vazia. Captura `?shot=2` parada não
mede nenhum dos cinco.
