# Desenho da Onda 5 — Modo Atlas navegável (v2, pós-painel)

*Documento de trabalho da onda (consumido ao fechar, morre no F7 — regra 8 do AGENTS.md).
Fontes de verdade: PLANO-ATLAS.md §4 (espec da Onda 5, linhas 671–675, matriz 141–205),
NORTE.md (Ondas 1–4, Decisões fechadas, "Como retomar os gates" ~2521), AGENTS.md.
v2 incorpora as 32 emendas do painel de crítica de 2026-08-11 (3 lentes: bit-identidade,
arquitetura, UI/a11y — todos "aprovado-com-emendas"). Achados citados como bit#N/arq#N/ui#N.*

## O que a onda entrega

O Atlas como modo navegável do mesmo Director: `Phase 'atlas'`, entrada pelo
pause-look, saída "Partir" com `journeyT` retomando exato; enquadramento
privilegiado; busca sobre as 1.726 nomeadas; máquina do tempo; selo de
honestidade; Spotlight + convite; captura de ponteiro opt-in; UI Scale;
gradação por contexto; a11y de verdade no HUD.

**Regra de UI da onda (PLANO §4):** a UI é desenhada na linguagem da casa; as
ideias vêm do atlas, a implementação é nova. NÃO atravessam: estética sci-fi
(tech-corners, ghost-border, font-orbitron, uppercase tracking, animate-pulse),
painel de 18 controles, 44 degraus de tempo à mão, copy em inglês em componente.

**Invariantes de gate (valem para TODAS as fases):**
- O filme não perde um pixel: toda mudança visual vive atrás da Phase 'atlas',
  de porta de URL, ou entra como termo multiplicativo NEUTRO em 1,0 (exato em
  IEEE754 — precedente post.ts:104-106) / passe com `enabled=false` fora do
  Atlas (precedente knee, post.ts:171). Fonte de shader recompilada NÃO é
  neutra por si (bit#3) — prova por leva.
- **Oráculo da leva: os 18 md5 OFICIAIS do NORTE (seção de gates, desta GPU)**;
  o `antes` do TMPDIR só se recaptura quando faltar (bit#11). Protocolo:
  NORTE "Como retomar os gates" (dev server + ab-identidade.mjs, JOBS=3,
  SMOKE=1 para sentinelas).
- **Componente novo do Atlas NÃO portaliza para fora de `.hud-root`** — o
  bare-mode (`hud.css:693`) só esconde filhos diretos; overlay portalizado
  para o body entraria nas 18 vistas (arq#14). Cobrar na primeira leva da F2.
- URL > storage > detecção; gosto (tom/exposição/camadas) nunca vai ao storage.
- Nenhuma string de UI em inglês no caminho pt-BR (grep por fase).
- **Silêncio cinematográfico com gate executável** (ui#5): grep no CSS/JSX
  novo do Atlas por `@keyframes`/`animation`/`pulse`/`blink` em F2/F5/F7 —
  transições de véu/fade são permitidas; pulso e pisca, não.
- `npm test` (981+), `tsc`, `eslint` verdes a cada checkpoint; commit local por
  checkpoint validado, sem push.
- Escala 1:1 e fotometria governam (Decisão "Mais que um SpaceEngine").

## Mapa de pouso (medido no código, 2026-08-11)

- Fases: `Phase = 'loading'|'intro'|'journey'|'end'|'free'` — `director.ts:43`;
  `setPhase()` `:539`; pause-look derivado: `journey && freezeJourney` `:764`.
  **28 pontos decidem por fase em cadeias `if`** (App.tsx e director.ts,
  inventário no escopo da F1 — arq#9).
- Câmera: `JourneyRig` (`cameraRig.ts:42`, puro, dirigido pelo Director) e
  `FreeRoam` (`:194`, dono dos próprios listeners e do `enabled`) — NÃO há um
  padrão único de rig (arq#12); quem liga/desliga escritor hoje: `play()`
  `:711`, `enterFreeRoam()` `:898`, `placeCamera()` `:690`.
- Prontidão de captura: getter `captura` (`director.ts:595-611`) com `andando`
  cego a fase nova; `perturbar()` zera `quadrosEstaveis` (bit#4/arq#1).
- HUD: `App.tsx` → `Hud.tsx` + `Ajustes.tsx` (role=dialog SEM aria-modal, sem
  focus trap, gatilho sem ref — ui#2). ProgressBar é slider de capítulos do
  filme, só monta em journey|end (`App.tsx:312`); barra com o botão ⚙ só em
  journey|free (`App.tsx:345`) (arq#8/ui#1).
- Catálogo: `meta.named` = 1.726 com `hd/hip/gl`; sem busca.
- Preferências: `conviteVisto` declarado sem leitor (`preferencias.ts:13-17`).
- Tempo: sem relógio de runtime; planetas por `retrato2026.ts`; a efeméride
  congela em DOIS atributos — `position` E `aMagBase` (que carrega o rUA do
  retrato, `fotometria.ts:221-231`) (bit#5/arq#5); testes de texto pinam a
  doutrina da camada (`planetas.test.ts:912-928`).
- Exposição: `expOverride` é latch SEM VOLTA (`director.ts:161,246,917,1095`)
  (bit#7). Bloom tem escritor incondicional por quadro: `setWarp` no tick
  (`director.ts:1229`, `post.ts:176-185`) (bit#8).
- Caminhos que alteram brilho/imagem HOJE (lista do selo — bit#2):
  `?exp=` (director.ts:246), `?tone=` (App.tsx:123), `?nobloom=1`
  (director.ts:241-243), `?knee=/?kneemode=/?kneeamt=` (post.ts:87-106,
  159-173), `?dom=/?nodom=` (director.ts:1282), `?forgetau=1`
  (director.ts:434-436), `?fov=` (App.tsx:140-144), `?cart=`/`?discoff`
  (director.ts:412-414), camadas do painel E as só-URL `nosun/nodust/noco/
  noforge` (director.ts:250-269), TIER/autoQuality — que rebaixa SOZINHO
  (engine.ts:31-33, 250-278), e a gradação por contexto da F6 (declarada).
- Rede: dono do caminho é `config.ts` (`fetchBinary` :197-227 com .gz e
  BASE_URL; `loadStarData` :229-247); abort do Director (`:163`, dispose
  `:1310`). Efeméride são DOIS artefatos: `efemerides.bin` + meta json
  (arq#13).
- reduced-motion: `director.ts:247`; App.tsx:65.
- UI Scale: 23 font-size no hud.css — 14 rem puros e **9 clamp(rem,vw,rem)**
  nos títulos mais proeminentes, onde o termo vw ignora o root (ui#3).
- Harness: rodada.mjs NÃO pode julgar a11y (shot=2 = .bare-mode esconde o HUD
  inteiro; e escreve no ledger EVOLUCAO.md) (bit#10).

## Decisões de abertura (coordenador, 2026-08-11 — v2)

**D1 — Selo de honestidade e os 3 tiers de rótulo.** Um selo só (sem dois
pills permanentes), vivo no HUD do Atlas, copy-tese herdada em pt-BR ("o que
nesta vista é ajustado e o que é medido"). Eixos:
- **ESCALA**: "ESCALA REAL" quando o que domina o quadro é 1:1 (domínio
  profundo); "FORA DE ESCALA" quando o Sol-ator artístico domina.
- **BRILHO** (copy: **"BRILHO REAL" vs "BRILHO ASSISTIDO"** — verbatim do
  i18n herdado, ui#4): o estado deriva de UM REGISTRO ÚNICO de caminhos que
  alteram o resultado (lista completa acima), NUNCA de enumeração à mão no
  componente (bit#2). A gradação por contexto da F6 é caminho DECLARADO do
  eixo, com linha-controle própria para desligá-la (bit#1). O autoQuality
  conta: rebaixamento de tier vira desvio declarado no selo.
- **O registro nasce na F2 como fonte de verdade** e o teste cobra
  COMPLETUDE: porta/controle novo sem entrada no registro quebra o teste —
  assim a F6 é obrigada a se declarar (bit#1). Teste-tranca adicional:
  nenhum estado do selo pode ser desmentido por controle a jusante.
- **Linhas do selo são os próprios controles** e indicam o PRÓXIMO estado.
  Para a linha BRILHO cumprir "clicar volta ao real": F2 cria
  `limparExposicaoManual()` no Director (o latch `expOverride` hoje não tem
  volta — bit#7). Precedência declarada: gesto do visitante (`?exp=`, clique)
  VENCE a gradação do modo; a gradação só preenche onde o visitante não pôs a mão.
- **3 tiers de rótulo** (procedência, vocabulário da legenda): **medido**
  (dado de catálogo/efeméride), **derivado** (modelo sobre dado medido —
  Ballesteros/Stefan-Boltzmann, consumidores da Onda 7 nascem honestos),
  **artístico** (canal do instrumento: disco do Sol-ator, clarão, guia).
- `?luz=real|assistida` NÃO nasce aqui (Onda 6). O selo nasce extensível.

**D2 — Recorte do tempo (5 vs 6).** A Onda 5 entrega a máquina: `jd` + `rate`
no Director (Director é o DONO do jd — arq#5), ~8 degraus em escala log
contínua com rótulo pt-BR, modo AO VIVO, `validityRange` 1950–2050 TDB com
badge quando fora. **Fio de rede**: fetch lazy dos DOIS artefatos
(efemerides.bin + meta) ao lado de `loadStarData` em config.ts, via
`fetchBinary` + BASE_URL + signal do Director (arq#13) — nunca no boot do
filme; sem rede ⇒ camada congela no retrato com badge honesto, zero erro.
**O caminho vivo escreve os DOIS atributos** — `position` E `aMagBase`
recomputado com o r vivo (opção (i) do painel: JS por corpo, 10 floats,
barato; NÃO mexer na aritmética do shader — preserva os md5 de ua500/150/40)
(bit#5/arq#5). A escrita mora em MÉTODO PRÓPRIO da camada, fora do `update`
pinado pelos testes de texto; **cache por jd: recalcula só quando jd muda**
(AO VIVO a 1 Hz), com as três obrigações da escrita instanciada (fround
antes de decidir, teto de faixas, latch de upload — NORTE Onda 3) e sem
alocação por quadro (scratch reutilizado; `posicaoHeliocentrica` aloca — não
chamar no quadro, só na mudança de jd) (bit#9). O destino dos testes de
texto D8 se decide POR ESCRITO na F4 (quem chama `perturbar` é o Director,
não a camada). **Porta `?jd=` no precedente ?plan/?noplan** para A/B com o
mesmo binário: as três vistas profundas com `?jd=EPOCA` vs tabela congelada
— bit-idêntico; e oráculo de magnitude viva: jd≠época ⇒ m muda na direção
certa (bit#6). Regra M6: jdTDB via time.ts, nunca Date/UT cru.

**D3 — Portal, transições e estado.** Portal "entrar no Atlas" no pause-look
(e só nele). Entrada: véu (precedente TitleVeil) + reposicionamento — não é
travessia física. Reduced-motion: instantânea. Saída "Partir": o portal
salva/restaura o TRIO `journeyT` + `lookYaw/lookPitch` + `leftDisk` (o
`seek()` sozinho zera o olhar e o tick zera o latch fora de journey —
arq#2), e restaura `paused` (o pause-look tem dois donos hoje — arq#6); o
gate mede PIXEL (md5 do quadro antes de entrar vs depois de Partir), não só
o escalar. A fase 'atlas' entra na guarda de atalhos do App (Espaço não
vaza). **Sol-ator no Atlas: `journeyT` PINADO em constante nomeada**
(dramaturgia do ciclo é monótona em journeyT — sem pino, cada entrada dá um
Sol diferente e nenhuma vista é reproduzível; arq#11); gate: entrar em t=10
e t=250 dá md5 igual. **Deep-link `?atlas=1`**: precedência declarada
`?pos=` > `?atlas=1` > `?t=/?play=`; "Partir" sem viagem anterior volta ao
TitleVeil (o candidato honesto); `urlComMomento` passa a carregar `atlas=1`
(o link copiado de dentro do Atlas volta para o Atlas) (arq#10).

**D4 — Alcance da busca.** Só as 1.726 nomeadas (default da Decisão 2).
Consulta numérica `hd`/`hip` por Map direto. Sem varredura das 328k.

**D5 — Enquadramento: fontes únicas (nova, arq#3/arq#4).** A função pura
recebe `{rAlvo, fovDeg, aspect, retanguloUtil}` e devolve distância/pose.
`fov` do Atlas é **constante nomeada** escrita pelo AtlasRig no mesmo ponto
do tick em que a JourneyRig escreve a dela (sem pino, θ herda o fov do shot
onde se pausou). `retanguloUtil` tem UM produtor publicado (o Atlas não é
letterboxed; o retângulo desconta as áreas reais do HUD do Atlas). **`r` é o
raio ORBITAL do alvo, vindo da efeméride/retrato (rUA)** — enquadra-se a
órbita, não o corpo (corpos são pontos até a Onda 6; NENHUMA tabela nova de
raios — seria segunda fonte de verdade que a 7a refaria). Valores medidos
reaproveitados: PHASE_OFFSET 30°, MAX_SOLAR_DEVIATION 70°,
PARENT_FRAMING_BIAS 0,78, margin 1,2 — constantes nomeadas num lugar só.

**D6 — Hospedeiros de UI no Atlas (nova, arq#8/ui#1/ui#6).** ContextLine é
componente NOVO e pequeno (`role="status"` + `aria-live="polite"`, padrão
Caption) — NÃO o ProgressBar do filme (que é slider de capítulos e daria
scrub do filme dentro do Atlas). A F1 já monta o acesso aos Ajustes na fase
nova (senão F5/F6 chegam sem porta). **Config único do Atlas** (um arquivo):
seletores de camada da gaveta + eixos/limiares da gradação da F6 — uma fonte
de verdade (AGENTS 4). Flags do filme que fazem sentido no Atlas: nomarker,
nobh, nohero, noplan, nocat; as galácticas (nogal/nodisc/nogdust/noglow/
nowrap/nocart) não entram na gaveta do Atlas.

**D7 — A11y como módulo único + juiz próprio (nova, bit#10/ui#2).**
`src/lib/dialogFocus.ts` (a casa não tem pasta hooks/): foco preso,
devolução ao gatilho, Esc — **Ajustes.tsx PASSA A USÁ-LO** (ganha
aria-modal e devolução que hoje não tem), e todo diálogo novo nasce nele.
Contrato de DOM genérico (data-attrs) que o juiz consulta. O juiz é
**`scripts/visual/a11y.mjs`** (novo, por CDP, SEM shot=2, sem tocar o
ledger EVOLUCAO.md): asserta foco preso/devolução/Esc/aria-live em
qualquer diálogo presente. A F7 RE-REGISTRA a linha `useDialogFocus` do
PLANO §2.3 (o destino "rodada.mjs" muda para a11y.mjs, com o porquê) —
senão a auditoria da Onda 9 acusa destino não cumprido.

## Fases (cada uma: implementar → gates → commit local)

**F1 — Espinha do modo** *(bloqueia tudo)*
1. Inventário PINADO dos 28 pontos que decidem por fase (grep em App.tsx +
   director.ts) com o comportamento de cada um em 'atlas' declarado; onde
   couber, mapa `satisfies Record<Phase, …>` (arq#9).
2. `Phase 'atlas'` + posse do escritor de câmera CENTRALIZADA no `setPhase`
   (mapa fase → rig; hoje três lugares ligam/desligam — arq#12).
3. `AtlasRig` em cinematic/ + função pura de enquadramento (D5) com vitest
   (esfera pequena/grande, ultrawide, retângulo com HUD, casos-limite).
4. Portal no pause-look + "Partir" + véu + reduced-motion + trio salvo/
   restaurado + `paused` + guarda de atalhos (D3).
5. `?atlas=1` com precedência declarada + `urlComMomento` (D3).
6. Prontidão: `andando` ganha os termos do Atlas (voo/véu em curso) e
   `perturbar()` roda em entrada/saída, troca de enquadramento e (futuro)
   de jd/rate (bit#4/arq#1).
7. Fundações para F2/F3: pipeline de rótulos e `tryVisit` estendidos à fase
   'atlas'; entrada de ponteiro do AtlasRig (bit#12/arq#7); acesso aos
   Ajustes montado na fase (arq#8); FreeRoam ganha guarda de alvo de
   formulário nos listeners de teclado (arq#12).
8. Sol-ator: journeyT pinado (D3/arq#11).
*Gate F1:* vitest da função pura; smoke navegador ida-e-volta com journeyT
exato E md5 de pixel antes/depois; captura em 'atlas' sai por `via=sinal`
(prova de prontidão); 18 md5 oficiais do NORTE intactos; Sol reproduzível
(t=10 vs t=250 md5 igual); tsc/eslint/testes.

**F2 — HUD do Atlas: a11y + ContextLine + selo (D1, D6, D7)**
`dialogFocus.ts` + adoção no Ajustes; ContextLine nova (nunca chuta: foco
desconhecido lê o nome do sistema); gaveta com ícone+rótulo lendo o config
único; selo conforme D1 (registro único de caminhos, teste de completude,
`limparExposicaoManual()`, linhas-controle com próximo estado indicado,
tiers medido/derivado/artístico); `scripts/visual/a11y.mjs` nasce aqui.
*Gate F2:* a11y.mjs verde (foco preso, devolução, Esc, aria-live); teste
"nenhum controle desmente o selo" + completude do registro; leva das 18
(inclui a prova de que overlay novo não vaza no bare-mode — arq#14); grep
inglês + grep silêncio (ui#5).

**F3 — Busca + deep-link (D4)** *(lib pode andar em paralelo a F2)*
Lib pura ~60 linhas sobre meta.named: normalizeHygQuery (NFD), score de 4
degraus, chave dupla abreviação/glifo grego, Map hd/hip; vitest com casos
reais (acentos, "alfa cen", "hd 48915"). UI: paleta com listbox acessível
(dialogFocus), useDeferredValue, limite por dispositivo. Visitar voa pelo
AtlasRig (fundação da F1). Deep-link de corpo/estrela na URL.
*Gate F3:* vitest da lib; navegação por teclado na listbox (a11y.mjs);
latência de digitação medida; leva se algo tocar render.

**F4 — Máquina do tempo (D2)**
jd+rate no Director (dono único); degraus log com rótulo pt-BR; AO VIVO;
badge de validityRange; fetch lazy (config.ts, dois artefatos, abort do
Director); caminho vivo = método próprio da camada escrevendo position +
aMagBase com cache por jd e as três obrigações; porta `?jd=`; destino do
teste de texto D8 decidido por escrito.
*Gate F4:* A/B `?jd=EPOCA` bit-idêntico nas três vistas profundas; oráculo
de magnitude viva (direção certa); fixture sem rede (congela no retrato com
badge, zero erro de console); vitest de degraus/clamp; leva das 18.

**F5 — FreeRoam: captura opt-in + Spotlight + convite**
Pointer lock opt-in ~40 linhas com as 4 defesas (backoff após 3 erros,
dispose no HMR, soltar teclas no unlock, listeners só com lock). Spotlight
~50 linhas: data-spot + getBoundingClientRect + máscara SVG + ResizeObserver,
ancorado no alvo, reabrível pelos Ajustes, DENTRO de .hud-root. Convite de 3
passos no vocabulário da legenda, só na primeira entrada, lendo/gravando
`conviteVisto` (campo já existe — ligar, não recriar).
*Gate F5:* convite não reaparece em recarga; unlock solta todas as teclas;
Esc devolve o ponteiro; reduced-motion no Spotlight; grep silêncio; leva.

**F6 — UI Scale + gradação por contexto**
UI Scale: contrato `?ui=` + font-size no root; **tratamento declarado dos 9
clamp(rem,vw,rem)** (tirar o termo vw dos textos do HUD ou torná-lo reativo
ao root — ui#3); componente no Ajustes; gate automatizado: `?ui=` produz
variação mensurável nos 9 seletores, não só nos 14 rem. Gradação por
contexto no config único (D6): bloom entra como ESTADO no Post (como
galaxyMode), termo multiplicativo neutro em 1,0 sobre a expressão atual
(bit#8); saturação/contraste como passe próprio com enabled=false fora do
Atlas OU termo neutro — forma declarada e provada (bit#3); brilho usa
caminho PRÓPRIO que não toca o latch expOverride (bit#7); limiares 3,5/50 UA
herdados como medidos; 200/2000 re-derivados com derivação anotada; sem os
7 campos mortos do doador.
*Gate F6:* **leva das 18 DENTRO da fase** (bit#3); ?ui= mensurável nos 23;
zoom do navegador não quebra; ?ui= na URL e não no storage; A/B da
neutralidade (Atlas off ⇒ bit-idêntico).

**F7 — Gate integral + olhos frescos + registros + merge**
Leva completa (18 md5 do NORTE); smoke ida-e-volta; journeyT exato + pixel;
convite não reaparece; a11y.mjs no protocolo de gates; grep inglês + grep
silêncio em tudo; 981+ testes, tsc, eslint. RE-REGISTRO da linha
useDialogFocus no PLANO §2.3 (D7). **Revisão de olhos frescos ANTES do
merge** (onda com travessia de doador — obrigatória). Registros: Estado da
Onda 5 no PLANO §4; NORTE ganha "o que governa o futuro"; este desenho
MORRE no mesmo commit (regra 8). Merge na main.

## Riscos vivos da onda

- **Pixel do filme**: neutralidade provada por leva em TODA fase que toca
  render (F1, F2, F4, F5, F6) contra os 18 md5 oficiais — não no fim.
- **Silêncio cinematográfico**: grep executável + contenção editorial.
- **journeyT/estado**: o trio + paused salvos pelo portal; gate de pixel.
- **Rede**: lazy, abort do Director, fallback honesto com badge.
- **2ª instância de StellarBody PROIBIDA** (minas (1) e (3), NORTE Onda 3).
- **Selo**: registro único + teste de completude — a F6 não pode nascer sem
  se declarar; autoQuality conta como caminho.
