# ONDA 6 — PAUSADA em 2026-08-12 (bastão para o próximo coordenador)

**Estado: ABERTA, meio da implementação, working tree LIMPA, branch `onda-6`
(12 commits sobre a main 9aff400). NÃO mergeada — o gate integral, a revisão de
olhos frescos e os registros do fecho ainda NÃO aconteceram.**

Este arquivo e os irmãos desta pasta morrem no fecho da onda (regra 8 da casa);
até lá, são o mapa. Leia nesta ordem: este arquivo → `DESENHO.md` (o desenho
emendado pelo painel de abertura, com as decisões do dono) → PLANO-ATLAS §4
(espec e gate da Onda 6) → NORTE (processo e decisões fechadas).

## O que está FEITO (12 commits, cada um com gate próprio verde)

| Commit | Fase | Entrega |
|---|---|---|
| 8704baa | F1 | Lei de luz pura (`src/lib/atlas/luz.ts`): E=1/d², escalar FUNDIDO real≡E bit a bit, assistida=E^0,35 (σ CHUTE a recalibrar), ΔEV em passos |
| 46cd15d | F0 | Palco local: near segue superfície resolvida (NaN=neutro bit-idêntico), depthTest nos planetas, ?corpos/?nocorpos, gpu-profile consertado |
| b73baee | F2c-lib | Cone de eclipse puro (25 oráculos), 20 pares (15+5 luas de Urano), Danjon, CORPOS_COM_ANEL p/ F6 estender |
| 806be51 | F2a-1 | Pipeline de texturas (4 consertos do checklist), manifest sha+licença+proveniência, Terra+Lua 8k, escada por tier |
| 3f75ef0 | D4 | Bancada de assets (scripts/visual/bancada-assets.html) — já julgou Titã preliminarmente |
| 4f27793 | D9 | Amostrador de memória + juiz memoria.mjs (M5: sabotagem reprova); a casa NÃO vaza |
| a6c63f0 | F2a-2 | A TERRA RESOLVIDA (terra.ts): dia/noite/nuvens/atmosfera O'Neil BackSide, IAU vivo conferido por sub-ponto 1e-8°, ?luz= no selo, custo GPU líquido NEGATIVO |
| 6d59468 | F2b | A LUA (Lommel-Seeliger C=4/3 por quadratura, libração) + dominância suave (rampa da Onda 3 ganha consumidor) + ESCADA sistema→órbita→corpo→lua (?ver=, Esc sobe) + abertura na época viva |
| a968b09 | F8+ | 11 fotos de referência NASA (protocolo da rodada de realismo) |
| ad39ca3 | F8+ | Referências corrigidas pela crítica externa VALIDADA (caem Mercúrio/Vênus falsa-cor; 2 substitutos do crítico também caem) |
| 1754110 | Remediação | Dose de VRAM (8k só no map, apoio 4k — 1,79→0,72 GB), juiz não-cego (corposAssentados), ?loader= com ?shot=, retry de textura |

**Placar atual: 1.321 testes verdes · typecheck/eslint limpos · 22 vistas
oficiais (18 do filme + terra/terranb/lua/terralua) · 6 juízes de navegador
verdes (a11y, atlas-smoke, voo, busca, memoria, + ab-identidade como leva).**

**Baselines novas ACEITAS pelo coordenador com imagens abertas (D11) na
remediação:** terra `ff48acbaf3a7` · terranb `1c0509b1d6cc` · lua
`e54f7aa79a2a` · terralua `7b5378507749`. As 18 do filme seguem as oficiais do
NORTE, bit-idênticas em TODA fase até aqui.

## Decisões do DONO tomadas nesta onda (não reabrir sem ele)

1. **Decisão 3 (profundidade)**: critério "escolha AAA de UX"; tradução
   registrada: palco local (padrão NASA Eyes — o cosmos da casa já é livre de
   depth), gate = ZERO z-fighting em instrumento autovalidado (F8, ainda não
   construído), escalada declarada = log-depth, voltando ao dono.
2. **Texturas**: textura REAL em tudo que tem imagem real, a melhor possível;
   procedural SÓ onde não existe imagem (Haumea/Makemake/Eris, anéis U/N/Q, e o
   que a bancada reprovar — inclusive Urano/Netuno CONCORREM: real × procedural
   na bancada, revertendo a linha "Renasce" da matriz). Licença documenta-se com
   o melhor que se achar, origem incerta entra MARCADA, atribuições preservadas.
   App é grátis/open-source/educativo, não divulgado.
3. **Fontes ampliadas** (pós-feedback externo): caça ao MELHOR asset por corpo
   nas F3+ (CGI Moon Kit 27k, Blue Marble NG/Black Marble, USGS, Björn Jónsson,
   Akatsuki, ESA/ESO), bancada como juíza — fonte gigante NUNCA chega ao runtime
   (a escada reamostra; dose de VRAM por canal).
4. **Rodada de referência (F8+)**: realismo contra as fotos de
   `docs/reference/referencias-corpos/`, com as 3 travas (curadas 1×; foto é
   direção, não gabarito; rodadas CONTADAS 2-3 por corpo-herói, após F3).

## O que FALTA (na ordem do desenho; especificação por fase no DESENHO.md §3)

- **F2c — Eclipse na tela**: integrar `src/lib/atlas/eclipse.ts` (pronto, 25
  oráculos) nos materiais terra/lua + Director; jd PINADOS em
  `ECLIPSES-F2C.md` (solar 2460409.26395835 · lunar 2458327.34980323); vistas
  eclipse-solar/eclipse-lunar com px declarado; needle-teste do GLSL
  (a lição do chunk renomeado). A blood moon usa o cobre de Danjon já exportado.
- **F3 — Rochosos**: Mercúrio (regolito LS — a lista dos 7 opt-in está em
  §1.1 do DESENHO), Vênus (camada de atmosfera), Marte, Fobos/Deimos.
  AQUI acontece a recalibração σ×bloom (T-E10): Vênus real ≈1,33 e Mercúrio
  ≈1,46 cruzam o limiar 0,82 — a Terra a 1 UA não separa nada (medido na F2a).
- **F4 — Gigantes + anel de Saturno**: flattening BODY_AXES, advecção zonal de
  Júpiter POR BANDA (espec anti-cisalhamento em D6; relógio = jd), anel com
  scattering frente/trás + sombras elipsoidais dos dois lados (espec no
  DESENHO/D6; raios contra o raio EQUATORIAL — cicatriz W5-B).
- **F5 — Luas em lote + bancada**: ~20 luas, 5 de Urano no eclipse (pares já na
  lib), bancada julga Titan/Europa (crédito USGS redigido ANTES), Vanth/Weywot
  SÓ com badge de validade.
- **F6 — Anões/TNOs + anéis procedurais**: dados prontos em `DADOS-ANEIS-F6.md`
  (fonte primária por linha; dosagem honesta: ε de Urano assimétrico, arcos de
  Netuno só Fraternité+Égalité hoje, Quaoar didático). Estender CORPOS_COM_ANEL.
- **F7 — Asteroides**: 4 modelos com LS (impossível no doador; aqui é possível).
- **F8 — Fecho**: MH18 com política de domínio + contrato de rebaseline (D10),
  unificações BV_SOL/PONTO_ZERO (só se bit-neutras), instrumento de z-fighting
  (D1 — jitter sub-pixel, zero alternantes, M5), ASSETS.md, captura no ladder
  por tier, renderer.info.memory estável, ordem de corte se estourar (§3 do
  DESENHO). Depois: rodada de referência (F8+).
- **FECHO DA ONDA**: gate integral do PLANO-ATLAS §4 + revisão de olhos frescos
  (pauta NOMEADA no DESENHO §7) + registros (PLANO-ATLAS "Estado da Onda 6" com
  correções de fato §1 do DESENHO, re-registro da pendência 7 da Onda 5
  [abertura na época — CUMPRIDA aqui], PARENT_FRAMING_BIAS cumprido, placar,
  NORTE, e esta pasta docs/onda-6/ MORRE) + merge em main.

## Pendências nomeadas NOVAS desta rodada (para o registro do fecho)

1. Captura da vista terra teve 1 instável em 6 pós-dose (263 px, ≤8 níveis;
   suspeita: decode do clouds 4k, único jpg do conjunto) — olhar na próxima leva.
2. A Lua nasce mesh↔nada aos 4 px (sem ponto fotométrico) — MH18/Onda 7.
3. HUD "cartografia real" não confessa o recuo procedural (auditoria item 3).
4. Mercúrio/Vênus sem foto de referência verificada (caça na F3).
5. `?ver=orbita` numa lua cai no degrau lua (documentado em focarNoCorpo).
6. Achado F2a: vista anti-solar da Terra lavada pelo clarão fora do Atlas
   (gradação é só do Atlas) — volta à mesa com os lados noturnos.

## Consumidos, prontos para apagar no fecho (NÃO commitados de propósito)

- `docs/auditoria.md` (Grok): validado em 2026-08-12 — 6/6 achados reais,
  4 remediados (commit 1754110), 2 registrados (item 2 era a Decisão 3; item 3
  na fila). O veredito da validação está na ata do orquestrador desta sessão.
- `docs/onda-6/FEEDBACK-REFERENCIAS-CORPOS.md` (Grok): aplicado o que a fonte
  confirmou (commit ad39ca3), rejeitados 2 substitutos do próprio crítico.

## Processo (o contrato que o próximo coordenador herda)

Toda fase: vistas [nome,query] pinadas ANTES do código; 18/22 bit-idênticas em
CADA fase; gate com números; commit por checkpoint (sem push sem pedido);
capturas pesadas com JOBS=1 e juízes SEQUENCIAIS (paralelo dá md5 instável nesta
máquina); relatório externo é HIPÓTESE (validar na fonte antes de agir);
comunicação com o dono SIMPLES e curta (ele é leigo; decisões dele por critério,
não por técnica — ver memória persistente); delegar pesado a subagentes e poupar
a janela principal.
