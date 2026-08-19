# Norte

O que o projeto está tentando ser, o que já foi decidido, e o que não se
repete. Este arquivo existe para que uma sessão nova retome sem redescobrir.
Não é diário: só entra aqui o que ainda decide alguma coisa. O que virou
código sai daqui. A ata das rodadas vive no git (tag `docs-antes-da-reforma`)
e no ledger `docs/reference/EVOLUCAO.md`.

O que está aberto e incomoda quem usa mora em [`docs/PENDENCIAS.md`](PENDENCIAS.md).
Como uma estrela é desenhada mora em [`docs/LEI-DA-ESTRELA.md`](LEI-DA-ESTRELA.md).
O que falta da fusão do Atlas mora em [`docs/PLANO-ATLAS.md`](PLANO-ATLAS.md).
O que ainda falta dos filmes mora em [`docs/PLANO-CINEMA.md`](PLANO-CINEMA.md).

---

## A visão

Uma Via Láctea volumétrica, cinematográfica e cientificamente fundamentada,
na qual se pode viajar até qualquer ponto e ainda sentir um universo vivo:

- Nuvens moleculares e poeira volumétricas em toda a galáxia — dourado de
  longe, púrpura e azul por dentro.
- Estrelas de catálogo e procedurais sob a **mesma lei** — magnitude, cor,
  tamanho e brilho corretos, respondendo à posição do observador.
- Determinístico, eficiente no browser, LOD de verdade. Sem truque de sprite.

O produto é um só — **Mar de Estrelas**: o filme de ~3 min 51 s leva do Sol
a Sagittarius A*; perto de casa vive o **Atlas**, o sistema solar explorável,
no mesmo Director, sem segundo motor. Frase de identidade: *a jornada te
leva; o Atlas te deixa ficar.*

O filme galáctico atual vem primeiro. Seu eixo é a **perspectiva**: o universo
não mudou; nós mudamos de lugar. Depois dele haverá uma segunda viagem, solar,
de quatro minutos — Terra/Lua, Júpiter/Io, Saturno/luas e o recuo até o Sol
virar ponto. Os dois filmes pertencem ao mesmo motor e novos filmes serão
declarativos: roteiro leve e editável, sem reescrever o núcleo do aplicativo.

Unidades também contam a história: **UA** no Sistema Solar, **anos-luz** na
narrativa galáctica e **parsecs** no canal técnico.

O árbitro visual não é captura do próprio app: são as referências em
[`docs/reference/`](reference/), com alvos em
[`docs/reference/VISUAL_TARGETS.md`](reference/VISUAL_TARGETS.md). As vistas
externas (face-on / edge-on) são recriações científicas ancoradas em Gaia —
ninguém fotografou a Via Láctea de fora. A única foto real é o panorama ESO,
visto de dentro.

**Mais que um SpaceEngine** (decisão do dono, 2026-08-11): escala 1:1 onde
for possível; visibilidade por fotometria; artifício só no canal do
instrumento, separável e desligável. A galáxia volumétrica científica é o
diferencial. Toda escala artística nova se declara no selo.

---

## As três unificações

A visão não se decompõe em features. São três coisas que ainda existem em
duplicata. Ordem: **1 antes de 3**. A 2 é independente da 3.

**1. Uma cadeia fotométrica.** Magnitude → fluxo → pixel, uma vez só, para
todas as camadas. *Parcial:* o campo HYG já recalcula `m` da câmera e desenha
PSF de largura fixa. *Falta:* exposição compartilhada e o tonemap (hoje o
teto real do campo é ~2,3 mag contra 8,6 do catálogo). SEIS leis de
extinção convivem — censo de 17/08 no item 36 do PENDENCIAS: a tripla
literal `[1.0, 1.65, 2.35]` no HYG (não é lei de potência; entra 2×, na
cor e em meio alpha), CCM89 com saturação nas partículas, CCM89 sem
saturação nas forjas (desligada por padrão), CCM89 sem coluna nas nuvens
observadas, 0,8 mag/kpc acromático nas cascas, e o A_V→τ cinza da LUT da
faixa; o bake executa um fator 2,39 normalizado com a âncora física de
1,5 mag/kpc declarada como pendente no próprio código. Unificar é a
pauta desta unificação.

O contrato da estrela — disco + clarão, troca abaixo de 1 px conservando
fluxo, compressão fixa — está em `LEI-DA-ESTRELA.md`. É quem manda sobre as
antigas Ondas 7 e 8 de luz.

**2. Uma lei de população estelar.** Cascas por bin de M_V e o handoff
`unresolved(d)` já estão no código. O Sol já é `StellarBody` (instância nº 1).
*Falta:* star forges e as partículas da galáxia ainda são leis próprias;
cessão partículas ↔ lâminas (a única dupla-luz sem mecanismo); promoção
partícula → catálogo → corpo. Detalhe e ordem: `LEI-DA-ESTRELA.md` passos
E e G.

**3. Um meio volumétrico.** O dado já é único (mesmo campo de densidade). O
que está duplicado é o integrador: ~430 k sprites na vista externa e um
raymarch local, ligados por crossfade. Decidido: coluna fechada sobre um Σ
único, `L = Σ_j·F(τ)/|μ|`. A emissão 2-braços (Sct-Cen + Perseu; gás em 4)
já substituiu o truque de sprite na harmônica. *Falta:* o quad único no
lugar dos sprites (dissolve as listras de raspão) e a calibração absoluta
de κ.

---

## Um produto, dois modos

O código do atlas-orbital é **especificação do problema, não fornecedor da
solução**. Dados e oráculos (efemérides, IAU, fixtures, testes) migram
verbatim. Runtime e UI renascem. Reescrever o que um oráculo externo já
protege adiciona risco sem ganho.

- A fase `atlas` é fase de verdade; o portal devolve o filme exato
  (`journeyT`, look, `leftDisk`, `paused`). Quem mexer no portal recontrata
  esses cinco.
- Fase nova decide por mapa em `fases.ts`, não por cadeia de `if`.
- O Atlas herda o look do filme. Diferença de desenho entre os dois modos
  é defeito (item 4 das pendências).
- Um relógio só: luz, rotação IAU, nuvens, anel e eclipse leem o `jd` do
  Director.

O que ainda falta da fusão (Wikipedia, idioma, cinturões, Decisões 1 e 2)
está no `PLANO-ATLAS.md`. Não se relista aqui.

---

## Como medir

O gate de identidade (`ab-identidade.mjs`) é um **detector de regressão**.
Bit-idêntico não é objetivo nem aval, e nunca justifica desfazer melhoria.
Quando a mudança é intencional, o veredito é a imagem aberta, o diff de
pixel com sinal, e o rebaseline registrado.

As quatro vistas da abertura do filme (`sol`, `soldisco`, `solrampa`,
`solestouro`) só mudam de referência com o **sim do dono**, fotos abertas.
Isso não é bit-igualdade: é composição. A revogação de 11/08 não tocou
nesta regra.

A prova tem de tocar o que a mudança tocou. As vistas oficiais rodam com
`?shot=2` e **apagaram o HUD**. Trabalho de HUD é julgado por `a11y.mjs`
(`?shot=1`). Se nenhum juiz cobre a mudança, cria-se a vista que cobre.

Duas cegueiras declaradas:

- **Movimento.** `?shot=` congela o relógio. Nada que só apareça andando
  tem juiz aqui (item 11).
- **Referência visual entre 1 e 40 UA.** As vistas `ua2`…`ua2000` existem;
  foto-oráculo nessa faixa, não (item 12).

Como rodar:

```
npm run dev
node scripts/visual/ab-identidade.mjs antes
node scripts/visual/ab-identidade.mjs depois
SMOKE=1 node scripts/visual/ab-identidade.mjs antes
node scripts/visual/sky-capture.mjs [tag]
node scripts/visual/a11y.mjs
node scripts/visual/atlas-smoke.mjs
node scripts/visual/voo-smoke.mjs
node scripts/visual/busca-smoke.mjs
```

O harness espera `window.__director.captura.pronto`. Sem isso cai no teto
de 700 quadros e, no alvo padrão, **sai com status ≠ 0**. Chrome morre
pelo perfil (`matarPerfil`), nunca pelo nome. Gate de imagem **pina**
`?q=cinema`. Perto do Sol, A/B só com `&nobloom=1` — com bloom, `ua150` e
`ua40` devolvem md5 iguais com céus diferentes.

Holds do gate externo: **t=189** (perfil) e **t=213** (face-on) no corte de
19/08 (eram 261/293 no corte anterior), com o roll assado do rig antigo. O
que descompara o histórico é mexer no QUADRO (posição/mira/fov/roll,
`GATE_*` do journey.ts); os instantes derivam do corte e mudam com ele —
réguas e juízes leem os vigentes em `CAPTURE_T`.

A régua do céu tem cinco termos (espessura, perfil, fenda-curva, púrpura,
cor). Números de antes da mudança de régua de 2026-08-06 **não se comparam**
com os de hoje. `bojoAnti` só afere o stretch, não entra na soma.

Os valores esperados vigentes desta GPU (merge de 2026-08-13, 1800×1713)
estão no ledger [`docs/reference/EVOLUCAO.md`](reference/EVOLUCAO.md),
seção “baseline vigente”. Noutra máquina servem só como sinal de que a
captura assentou, nunca como oráculo.

`forgetau` fica **desligado**. A dosagem edge foi calibrada sem extinção
nas forjas; ligar sem re-dosar explode o gate.

Sagittarius A* é passe de pós, só a <2,4 kpc do centro. Custo zero de
longe. A escala artística (RS 0,05 pc ≈ 125.884× o real) é dívida de
corpo — item 13.

---

## Sol e escala

O núcleo em `world/sol/` é vendorizado do Novo-Sol-Fable-3d. Corrigir bug
do núcleo = corrigir lá e re-copiar. O wrapper é nosso. Ponte assume peça
ausente (`subToggle`, `meshes` nulos). Divergências declaradas no próprio
`sol/sun.js` (levar na re-cópia): `smoothstep` de bordas invertidas e o
teto do `mu`.

Não se instancia um segundo `StellarBody` enquanto `SUN_RADIUS = 2.2`
viver como literal nos vendorizados e `cme.js` capturar a câmera na
criação.

**Regra de escala, testável:** quem tapa o que está atrás (escreve
profundidade) tem raio físico real. Quem só brilha por cima pode ter
tamanho de instrumento — e se declara. O cadastro vive em `escala.ts`,
não neste arquivo. O Sol já está em fator 1. Sobra Sagittarius A*.

`RAIO_SOL_PC` é a fotosfera (`escala.ts`). `R0_PC` é a distância
Sol–centro (`frameGalactico.ts`). Não são o mesmo símbolo.

Proibido: teto de brilho. Proibido: exposição que depende do que está em
foco. A pupila adaptativa está reprovada pelo dono (enterrada no M2; era
lápide). O que entra no lugar é compressão **fixa** na emissão — contrato
em `LEI-DA-ESTRELA.md` §7. O céu e a galáxia nunca esmaecem.

---

## Ajustes: nada recarrega

Régua do dono: nenhuma opção do painel recarrega a página. A Fase A
fechou as camadas e o latch da exposição. Sobra a qualidade.

- **B** — Worker da cadeia de carga. O `buildGalaxy` JÁ RODA no worker
  (18/08: `galaxiaEmWorker` + `construirBuffersDaGalaxia`, bit a bit
  igual ao inline, com fallback declarado; a tarefa de ~3,3 s saiu da
  thread e o rótulo da etapa anima). Sobram: os dois bakes de CPU
  (~1,6 s) no mesmo worker, o amostrador de memória, e o hitch restante
  medido por Long Tasks — `bakeDiscLayers` (bake por GPU) e o `prime`
  do Sol, que são assunto do C.
- **C** — troca de tier viva, double-buffer com swap atômico, sem véu.
- **D** — Auto vira o 4º estado do seletor. Sem `?q=`, default de produto
  = cinema. Detecção nunca decide; medição sugere; o visitante escolhe.

Knob que decide alocação lê-se **antes** de quem aloca. Teardown que
falha não leva os outros junto.

---

## Decisões fechadas

Não reabrir sem que a condição listada mude.

| Decisão | Por quê | Reabre se |
|---|---|---|
| O Atlas vive aqui; o código do atlas é espec, não fornecedor | Testemunho do dono + crítica arquivo a arquivo | Uma linha específica da matriz, com arquivo aberto e medição |
| Mais que um SpaceEngine: 1:1 onde dá; visibilidade por fotometria; artifício só no instrumento | Decisão do dono na Onda 4 | Decisão do dono, nunca por conveniência técnica |
| Octree: não | O VBO é estático; a árvore podaria ~3,7% ao custo de ~193 draws | Conjunto estático > 2 M pontos **e** `WEBGL_multi_draw` |
| Floating origin: reconstrução relativa à câmera, não rebase global | Cascas reconstroem por célula; nenhum operando de kpc no caminho da posição | Outra camada resolver geometria perto da câmera longe do Sol |
| Log-depth: não | Onda 6 entrou geometria resolvida e o dono redecidiu não (near na superfície mais próxima) | O dono pedir; critério AAA |
| LUT de cor (Mamajek / CIE 401): não | O ajuste de 3 mads em `common.ts` tem RMS 0,009 | Precisão exigida abaixo de 2500 K ou acima de 40 kK |
| Saturação/lift no pós para “consertar” cor: não | Maquiagem. Cor emerge da física | — |
| Reduzir vértices para ganhar quadro: ⚠ reaberta | A nuvem custa ~31% do quadro; isso **não** autoriza podar pontos — contagem é imagem | — (já reaberta; entra como troca imagem×quadro, dose medida) |
| `forgetau` desligado | Dosagem edge calibrada sem extinção nas forjas | Re-dosagem conjunta medida |
| Pupila adaptativa: não | Dono: o campo estelar nunca esmaece. Medido: 16 stops ao focar Sirius | — |

---

## Regras que ainda mandam

- **Cobertura = magnitude e horizonte e presença.** Os três saem de
  `stars_meta.json`. O corte é heliocêntrico e a câmera anda.
- **AT-HYG sozinho não serve.** A fotometria brilhante vem do HYG v4.4.
- **Dose vem da física; a nota do gate se aceita.** Gate que prefere
  0,0098 a menos não vence literatura.
- **Atenuação se fatora num lugar só.** Quem acrescenta um fator a
  `alpha` o dá aos two varyings sem precisar lembrar.
- **Escrita em atributo instanciado:** idempotência com `Math.fround`
  antes de decidir; teto nas faixas; latch de upload cheio.
- **Dominância é por tamanho, não por presença.** `?nodom=1` / `?dom=1`
  existem para A/B com o mesmo binário.
- **Diálogo novo nasce em `dialogFocus.ts`** ou não é julgado.
- **Overlay novo é filho direto de `.hud-root`.**
- **Selo deriva de registro único** com teste de completude: porta nova
  na URL é obrigada a se declarar.
- **`?ui=` multiplica a preferência de fonte**, nunca px.
- **M1–M6** (verdade = runtime ligado; menor mudança; portam-se pixels,
  não fórmulas; hot path sem alocação; gate só vê o próprio escopo;
  unidades explícitas na fronteira) e L37–L42. Jurisprudência herdada
  do atlas, ainda válida.

---

## Becos sem saída

Já medidos e refutados — não repetir.

- Verificador automático de prosa (`scripts/docs-check.mjs`, 2026-08-14):
  construído, medido e **removido pelo dono no mesmo dia**. Quatro testes na
  árvore: documento novo passa limpo mesmo com três violações (a lista de
  documentos era digitada à mão), documento inexistente citado no código só
  gera aviso, documento vivo citando código inexistente não é olhado. E a
  praga que importa — documento que afirma faltar algo já pronto (43 casos
  medidos) — é invisível para qualquer máquina. Palavras do dono: *"só mais
  um problema para o futuro, um teste que pouco faz"*. Quem confere se o
  escrito é verdade é gente, com auditoria por onda.
- Subir contraste geral dos braços: amplifica todos os harmônicos junto.
- Desacoplar a fase da poeira da fase da luz: piora muito.
- Cor do disco decidida por raio (`mix(cold, warm)`): o disco fica
  geometricamente incapaz de púrpura. A r40 trocou o extremo frio
  (25.000 K → 6.000 K); o `mix` por raio segue lá.
- Pesar H II para subir o púrpura: área pequena demais; o ganho aparente
  era fluxo extra disfarçado de cor.
- Véu aditivo no caminho de extinção (rim light): cor ganha ~1:3, faixa
  paga ~1:1. Não fecha.
- Fenda do glow seguindo o warp: não há fluxo de glow em r > 8,4 kpc.
- Escurecer o glow ou o interior das partículas (`idim`) para o edge:
  o glow é flanco, halo quente e espessura ao mesmo tempo.
- Halo > 0,4 sob `forgetau`: axial explode.
- Ligar `forgetau` sem re-dosar.
- Teto de brilho para a tela branca.
- Copiar a exposição 0,418 do projeto irmão: é a conta de um conserto
  de cor que esta casa nunca precisou; escurece tudo 2,44×.
- Confundir cessão que funciona com duplicidade (a faixa da galáxia
  “desenhada 2×” era cessão).
- Apagar `aFocus` como peso morto: é o canal do passo E3 da lei.

A lista completa das hipóteses de espiral está em
`docs/reference/VISUAL_TARGETS.md`.

---

## Fila que ainda manda (além das pendências do dono)

- Unificações 1, 2 (forjas/partículas + G2/G3) e 3 (κ/Σ + quad).
- Lei da estrela, a partir de F1 — `LEI-DA-ESTRELA.md`.
- Ajustes B, C e D.
- Worker da carga; colunas mortas do manifesto (poda segura só de
  `gaiaObProxyStars[3,6,7]` e `dustDensity[4,5]`; `spiralAnchors[7]`
  não sai).
- Fade das cascas no Ato IV (`?nowrap` já saiu bit-idêntico nos gates;
  falta escolher a rampa e medir).
- Espessura do céu no anticentro: o dono medido é o volume **local**
  (raymarch + véu), não a LUT distante.
- `q2<7` no raymarch segue fora.
- Baseline do gate indexada pela GPU, fora do TMPDIR — ainda não
  existe; o ritual acima é manual.

---

## Dados

Contrato observado vs inferido:
[`docs/GALACTIC_DATA_FOUNDATION.md`](GALACTIC_DATA_FOUNDATION.md).
Como o renderer come esses ativos:
[`docs/RENDERER_CARTOGRAPHY.md`](RENDERER_CARTOGRAPHY.md).
Negativos de textura: [`docs/reference/ASSETS.md`](reference/ASSETS.md).
Fotos-oráculo dos corpos: `docs/reference/referencias-corpos/LEIA-ME.md`.

Os quatro estudos `atlas-estudo-*.md` são mapa de técnicas gerado por
IA. Nenhum número deles se cita sem a fonte primária. Não orientam
decisão que já esteja fechada (piso de ambiente, SPICE em runtime,
catálogo Hipparcos).
