# Desenho da Onda 6 — Corpos resolvidos + a primeira lei de luz
**v2 (2026-08-12) — pós-painel de crítica da abertura (3 lentes, 38 emendas: 3 bloqueantes,
20 importantes, 15 menores — TODAS incorporadas ou respondidas abaixo).**
Este documento morre no fecho da onda (regra 8); as decisões viram registro no PLANO-ATLAS.

Fontes: PLANO-ATLAS §4 (espec da Onda 6), §7; §5 (Decisão 3); §6 (riscos); NORTE;
reconhecimento 2026-08-12 (casa/doador/dossiês); painel de abertura 2026-08-12
(lentes doutrina/técnica/produto — atas no orquestrador).

---

## 0. O que a onda promete e o estado de partida

**Espec (PLANO-ATLAS §4, Onda 6):** (1) Terra+Lua com eclipse; (2) demais rochosos;
(3) gigantes + anel de Saturno; (4) luas em lote + 5 luas de Urano no eclipse +
mosaicos Titan/Europa na bancada; (5) anões/TNOs + anéis de Urano/Netuno/Quaoar;
(6) asteroides com Lommel-Seeliger + fotometria de regolito nova. **Novo:** a primeira
lei de luz (escalar único, UA de efeméride, clamps, selo `?luz=` como BLOQUEIO de
merge, §7.4 como referência). Também: bancada de assets; `ASSETS.md`; amostrador de
memória; scripts de textura corrigidos; Decisão 3.

**Estado de partida (medido):** zero material com luz, zero depth escrito; camada
`planetas` = Points de 10 vértices (PSF do campo, aditivo, depthTest:false);
`orientacao.ts`+`iauOrientation.ts` prontos sem consumidor (31 corpos IAU, BODY_AXES);
efeméride cobre a Lua; `corpos.json` 45 corpos; `CALIBRACAO_ATLAS` espera consumidor;
near piecewise com premissa "sem geometria entre 41 e 206 UA" (engine.ts:132-138);
18 vistas oficiais bit-idênticas = contrato do filme; 1.145 testes verdes; GPU em
cinema usa 15,6–16,0 dos 16,7 ms (NORTE, Medições) — não há folga sem teto declarado.

## 1. Correções de fato sobre a matriz (conferidas pelo painel com arquivo aberto)

1. **Regolito sem parâmetros por corpo** — o doador tem Lommel-Seeliger puro e
   universal, C = 4/3 DERIVADO (neutralidade de fluxo), opt-in em 7 corpos
   (Mercúrio, Lua, Ganimedes, Calisto, Io, Europa, Encélado); Hapke recusado de
   propósito. Herda-se: lei, derivação, critério de opt-in, oráculo por QUADRATURA
   (o teste integra os perfis e resolve a razão — valor chutado falha), a lista dos 7.
2. **Gigantes sem advecção/jets no doador** — esferas Lambert com textura estática
   (flattening real por corpo). Advecção e bandas+metano são trabalho NOVO da casa.
3. **Anéis de Urano/Netuno/Quaoar inexistentes no doador** — raios saem da
   literatura, com fonte citada por linha.
4. **`shapeScale` triaxial é SÓ Quaoar** [1.18, 0.99, 0.86]; semântica (a,c,b)
   (c curto = eixo de rotação) é cicatriz herdada.
5. **Texturas ativas sem licença documentada no doador** (Júpiter canônica, Urano,
   Titã incumbente, Europa ativa). **Política decidida pelo DONO (2026-08-12, nesta
   abertura):** o app é grátis, open-source e educativo, nunca divulgado — textura
   em TUDO, a melhor possível; a licença/origem se documenta com o MELHOR que se
   achar por entrada (afirmação só vale como linha do manifest com fonte, nunca de
   memória — emenda P-E13); origem não resolvida entra MARCADA como tal no
   manifest, em vez de ficar de fora. Atribuições obrigatórias (CC BY, USGS com
   crédito redigido, NASA) preservadas sempre.
6. **Sem 1361 W/m² no doador** — âncora RELATIVA E(1 UA) = 1. A casa mantém a âncora
   relativa; radiometria absoluta segue questão aberta declarada.

## 2. As decisões de desenho (D1–D10, emendadas pelo painel)

### D1 — Profundidade: palco local com near proporcional; SEM lei global de depth

O mundo tem o Sol na ORIGEM: em UA (1e-6 a 1,5e-4 pc) o float32 tem precisão de
sobra e as matrizes MV nascem em float64 na CPU — o jitter clássico não existe aqui.
O que falta é resolução de DEPTH entre as peças do corpo resolvido.

- **Grupo dos corpos resolvidos**: meshes opacos, `depthWrite:true` + `depthTest:true`
  entre si. **Mecânica real de composição (emenda T-E4):** o three desenha a lista
  OPACA inteira ANTES da transparente — o grupo desenha primeiro POR CONSTRUÇÃO,
  qualquer que seja o renderOrder (a v1 falava em "renderOrder 6,5"; morto). A
  relação com o aditivo é via depthTest das outras camadas, não via ordem.
- **Inventário de depthTest por camada (emenda T-E3)** — hoje nada escreve depth e
  depthTest é no-op; quando o grupo escrever, cada camada é decisão EXPLÍCITA:
  - **Testam hoje (default true) e passam a ser ocluídas — DESEJADO, julgado nas
    vistas novas:** campo de catálogo (stars.ts), poeira (dust.ts), cascas
    (wrappedStars.ts), nuvens CO (observedClouds.ts), billboards de heroes
    (heroStars.ts:143-160), loops/cme do Sol, lâminas da galáxia.
  - **Ganham depthTest:true:** camada `planetas` (o motivo do false era a esfera do
    Sol, que NÃO escreve depth — o motivo não se aplica ao buffer novo; ponto atrás
    de corpo resolvido some correto).
  - **Ficam false com o porquê escrito:** SunStar e coronas (artefato de lente — e o
    grupo do disco é invisível abaixo de 0,02 pc), nebulosa (avaliar por MEDIÇÃO o
    wash aditivo sobre o limbo escuro; se lavar, decidir com número).
  - O teste de sobrevivência das 18 + as vistas novas julgam o inventário inteiro.
- **Near proporcional à superfície mais próxima (emenda T-E13):** o `min()` do
  `updateClip` passa a incluir `d_superfície` de TODOS os corpos resolvidos em
  quadro (Terra E Lua simultâneos), não só o "em foco"; o piso derivado do raio
  (ordem 1e-13 pc; Fobos 11 km = 3,6e-13 pc) é REDE DE SEGURANÇA, nunca regime de
  operação — o regime é o termo proporcional. A premissa "41–206 UA" morre
  (comentário + teste reescritos). **Pino de neutralidade:** SEM corpo resolvido no
  quadro, o par (near, far) é BIT-IDÊNTICO ao vigente — é isso que sustenta o 18/18
  de F0 e o skyError (a câmera do céu está em casa, onde o piso 1e-8 governa).
- **Sol-ator × corpo resolvido:** a sobreposição é impossível POR CONSTRUÇÃO
  (disco invisível abaixo de 0,02 pc via isDiscGroupVisible; entre 0,02–0,05 pc
  todo corpo é sub-pixel — Júpiter a 4.125 UA ≈ 0,2 px). Pinar com a conta em teste
  e com o teste de sobrevivência do clamp da tela branca (9aff400).
- **z-fighting: instrumento nomeado (emenda P-E15):** pares de captura na vista
  crítica (superfície×nuvem a +0,15% do raio; planeta×anel; trânsito de lua) com
  jitter sub-pixel de câmera entre quadros, contando pixels que ALTERNAM entre as
  cores das duas superfícies; limiar: ZERO alternantes; autovalidação M5 (um offset
  sabidamente ruim tem de REPROVAR). Se a medição reprovar o palco, o fallback é
  log-depth do three — e a decisão VOLTA ao dono antes de virar código.

Por que não log-depth global: `gl_FragDepth` mata early-z em todo material para
um problema que só existe num grupo pequeno e próximo. Por que não reversed-z:
sem `EXT_clip_control` o NDC [-1,1] do WebGL2 anula o ganho; suporte desigual.

### D2 — A lei de luz: escalar FUNDIDO, EV explícito, divergência declarada

**(Reescrita pela emenda bloqueante E1 das lentes doutrina e técnica.)**

- **`src/lib/atlas/luz.ts`** (pura, zero three): `irradianciaRelativa(dUA)` = 1/d²
  com âncora E(1 UA) = 1 EXATO, clamps 0,05–1000 UA, neutro (1) em não-finito.
- **A álgebra do escalar único (fundido, como no doador):**
  - `real` → **uLuzGanho = E(d) EXATO** — a identidade que o oráculo pina é
    `fundido === E`, bit a bit (NUNCA "ganho = 1": isso apagaria o 1/r² — o
    anti-padrão 1 reencarnado, que a v1 continha e o painel derrubou).
  - `assistida` → **uLuzGanho = E^σ** (= 2^(σ·log2 E)). O deslocamento exibido é
    **ΔEV = (σ−1)·log2(E)** sobre o real — POSITIVO para d > 1 UA (o "+EV" que o
    gate do plano exige), negativo para Mercúrio/Vênus. σ inicial 0,35 é CHUTE
    DECLARADO a recalibrar contra a cadeia de display COMPLETA da casa
    (**knee asinh default-LIGADO + ACES + bloom 0,82 + gradação do clarão** —
    emenda D-E3; "contra ACES" só não basta).
  - Monotonicidade, preservação de ordem, ponto fixo na âncora, quarteia a cada
    dobro: oráculos migrados verbatim.
- **Divergência de §7.4 DECLARADA (emenda D-E2):** a espec esboça "UM EV de CENA
  por frame antes do ACES"; a casa aplica POR CORPO dentro do material. Razão: a
  exposição global é da Onda 8 e as 18 vistas não podem mover. Consequência dita:
  em `assistida` as RAZÕES entre corpos são comprimidas (a ordem é preservada, a
  razão não). O selo reporta o EV do corpo EM FOCO, rotulado "por corpo". A
  auto-exposição da Onda 8 é quem realiza o §7.4 pleno.
- **"Recusa distância de render" com o sinal da CASA (emenda T-E2):** aqui a cena
  mede em PC (corpos em 1e-6–1,5e-4 pc) — um chamador errado entra ABAIXO do clamp
  e recebe o PISO (E = 400, o máximo, uniforme para todos: nunca plausível). O
  teste cobre o lado de baixo E o de cima; o cabeçalho de luz.ts documenta que o
  modo de falha da casa é o OPOSTO do doador.
- **SEM piso de ambiente** (anti-padrões 3 e 9). Lado escuro em `real` é escuro.
- **Um relógio só — estendido a TODO movimento (emenda D-E6):** luz, advecção,
  rotação W(t) e nuvens leem o `jd` do Director; nunca Date.now/performance.now.
  Teste de texto-fonte (o da camada planetas) aplicado aos módulos novos.
- **Destino dos 4 contratos de patch (emenda T-E11)**, para o gate não ser
  infalsificável: needle-em-chunk-do-three → SEM equivalente (shader próprio;
  registrado morto); chave de programa por variante → só se houver #define por
  variante (senão registrado morto); ordem dos wrappers → teste de TEXTO-FONTE do
  GLSL da casa (a irradiância multiplica SÓ a componente direta, aplicada DEPOIS
  do BRDF de regolito); ambiente intocado → "não existe termo ambiente" pinado por
  texto-fonte. Gate = 8 oráculos de irradiância + os contratos renomeados.
- **Selo (emendas P-E4, D-E8, P-E16):** `?luz=` entra como **LINHA do eixo BRILHO
  existente** (registro único — NÃO eixo novo), `volta: 'vivo'`, clique volta ao
  real com o próximo estado visível (a affordance que o doador não tinha). Rótulo
  primário = copy simples herdada do fidelityBadge pt-BR ("faixa comprimida para
  mundos distantes continuarem visíveis. A ordem de brilho é preservada."); o
  número entra como complemento leigo: **"+3 passos de luz"** (não "stops" cru).
  O teste "nenhum controle desmente" DERIVA a lista de portas do REGISTRO do selo
  (eixo brilho) — nunca enumeração manual (o knee entra de graça). A linha nasce
  `<button>` no padrão das irmãs e o `a11y.mjs` ganha a cobrança dela; dialogFocus
  NÃO se aplica (não é diálogo — dito para ninguém inventar).

### D3 — Eclipse: cone analítico, espec e oráculos herdados (21, não 14)

- Lib pura `src/lib/atlas/eclipse.ts`: umbra ASSINADA, penumbra, antumbra com piso
  on-axis, posições SEMPRE da efeméride. Oráculos: **14 do eclipseGeometry.test.ts
  + 7 do eclipseMath.test.ts (emendas D-E7/P-E5)** — inclusive a banda Danjon
  L2–L3 do piso de refração (blood moon), cobre monotônico r>g>b, literais GLSL
  válidos, receptor solar neutro × variante Terra, piso anular com divisor
  guardado. Checks independentes (gamma 0,3431 → ~2.188 km; obscuração 0,905) e
  omissões DIVULGADAS migram junto.
- Pares: os 15 do doador + as 5 luas de Urano (data-only). Contratos herdados:
  receptor aponta o pai; planeta com anel não é receptor (pinar); needle de GLSL
  com teste (a lição do chunk renomeado).

### D4 — Texturas: pipeline próprio, tier por PIXEL MEDIDO, licença por linha

- Scripts em `scripts/data/atlas/`: `baixa-texturas.mjs` (status ANTES do stream,
  close com callback, unlink em falha, handlers de error — item 15),
  `otimiza-texturas.mjs` (varredura por tamanho real, guarda de pessimização —
  itens 16/17, **+ passo de REAMOSTRAGEM declarado (emenda T-E7): 8k→4k para
  heróis, 2k→1k para performance** — o doador NÃO tem 4k nem 1k dos heróis, e sem
  reamostrar o orçamento não fecha), Terra PBR via Wayback com roughness invertido
  (item 14).
- Manifest da casa (`public/data/atlas/texturas.json` + verify): tier por PIXEL
  CONTADO; licença + atribuição POR ENTRADA (sem licença documentada NÃO entra);
  sha256; completude no verify-assets.
- Escada por tier consumindo `maxTextureSize` da sonda da Onda 1:
  performance ≤1k, alta ≤2k, cinema ≤4k (8k só com bancada + orçamento do dono).
- **Números reais medidos no doador (base da proposta ao dono):** conjunto 2k
  inteiro ≈ 12,0 MB; Terra 8k (5 mapas) ≈ 22,2 MB; Lua 2k+8k.webp ≈ 12,9 MB;
  anel de Saturno (trio) 86 KB; mosaicos Titan+Europa ≈ 3,6 MB; GLBs 16 MB.
  Com reamostragem 8k→4k + webp o conjunto cinema mira ~25–35 MB (o precedente
  4k_oberon: png 39,6 MB → webp 1,3 MB). Número final MEDIDO pelo build no gate.
- Bancada `scripts/visual/bancada-assets.html` (estática, fora do produto,
  declarada FORA dos juízes com a exceção escrita no arquivo — emenda P-E16);
  julga Titan (Cassini × incumbente) e Europa (USGS só com as 68 linhas tratadas);
  crédito USGS REDIGIDO antes de qualquer promoção. Negativos → `ASSETS.md`.
- **FONTES AMPLIADAS (diretriz do dono, 2026-08-12, pós-feedback externo):**
  não se restringir a NASA/SSS por conveniência — as fases F3+ fazem a caça do
  MELHOR asset disponível por corpo, com a bancada como juíza. Candidatos-ouro
  conhecidos: CGI Moon Kit NASA/LRO (Lua 27k — acima do nosso 8k atual),
  Blue Marble Next Generation + Black Marble (Terra), mosaicos USGS, mapas de
  Björn Jónsson (gigantes), Akatsuki/JAXA (Vênus — a Mariner 10 é de 1974),
  ESA/ESO onde couber. Critérios fixos: dado real de instrumento, licença
  utilizável por app educativo open-source (CC BY/BY-SA/crédito), origem
  ANOTADA por entrada (documenta, não bloqueia; incerta entra marcada).

### D5 — LOD do corpo: dominância contra o clarão, não limiar seco

**(Reescrita pela emenda T-E5.)** No limiar de ~4 px o PONTO não é um pontinho: é
um clarão saturado de dezenas de px (Júpiter a 0,25 UA: m ≈ −8,8, PSF saturada).
Limiar seco de diâmetro daria pop clarão→disquinho.

- **O precedente é o SunStar:** a malha nasce SOB o clarão e o ponto cede por
  DOMINÂNCIA — razão tamanho-da-malha / halo-do-ponto, com o halo PREVISTO pelo
  espelho `picoDaPsf` que já existe. Histerese com cushion 2×, desigualdades
  assimétricas, NaN preserva estado (contratos da Onda 3).
- **Atributo novo de cessão por vértice (`aCede`)** na camada planetas — o texto
  pinado da camada ("o único alpha é do Sol") é RENEGOCIADO com o teste; as 4
  cicatrizes do crossfade valem (banda morta proibida — soma > 0 em toda a faixa,
  teste de propriedade; reafirmar rampa todo quadro; reset no salto de foco/data;
  clamp de dt).
- Gate: as 3 vistas profundas bit-idênticas com cessão = 1 (fora do corpo
  resolvido nada muda); pop medido no mergulho (envelope, precedente F4/Onda 4).

### D6 — Gigantes: dado onde há dado, procedural declarado onde não há

- Flattening real por corpo (autoridade: BODY_AXES da casa; conferir contra o
  doador). Rotação: W(t) IAU pelo jd (D2/relógio).
- **Júpiter — advecção zonal com espec de comportamento (emenda T-E6):**
  (i) relógio = jd da efeméride, nunca elapsed; (ii) **deslocamento uniforme POR
  BANDA com perfil suavizado** — a Mancha viaja INTEIRA com a banda dela; cisalhar
  o oval em listra é o modo de falha conhecido e testado (a máquina do tempo anda
  a anos/segundo); (iii) wrap REPEAT na amostragem (sem fract, sem risca de
  mipmap); (iv) custo esperado ~0 (matemática de coordenada), confirmado no
  gpu-profile de F4; proveniência "derivado" no selo. Perfil de ventos = dado
  publicado com fonte citada. Fallback declarado: estática com pendência nomeada.
  Textura: entra CONDICIONADA à linha de manifest com licença documentada
  (emenda P-E13 — nada de "CC BY" de memória).
- **Urano/Netuno (regra do dono, 2026-08-12):** textura REAL onde existe imagem
  real — os mapas 2k entram como incumbentes e a BANCADA julga se o procedural
  bandas+metano ganha (a matriz dizia "Renasce procedural"; o dono decidiu:
  corpo do sistema solar fica melhor com textura real — procedural SÓ onde não
  existe imagem: Haumea/Makemake/Eris, anéis U/N/Quaoar, e o que a bancada
  reprovar). Proveniência declarada por corpo em qualquer caso.
- **Anel de Saturno**: raios contra o raio EQUATORIAL (1,110–2,326; cicatriz
  W5-B), placa alpha do doador (86 KB), scattering frente/trás (Melhora sobre
  0,34 fixo), sombra planeta→anel (ocultador ELIPSOIDE, quadrática com direção
  não-unitária documentada) e anel→planeta (interseção analítica), fade de
  terminador.

### D7 — Enquadramento e navegação: a ESCADA completa, com gestos nomeados

**(Reescrita pela emenda bloqueante P-E1.)** A v1 deixava o corpo resolvido
inalcançável: a vista de órbita põe a Terra a ~0,15 px e nenhum gesto desce.

- **A escada: sistema → órbita → corpo (→ lua), com gesto nomeado por degrau:**
  - *sistema* (abertura, ~221 UA): estado atual.
  - *órbita* (clique num corpo): estado atual — MANTÉM a semântica de `?foco=X`
    (as baselines não mudam de significado — emenda P-E2).
  - *corpo* (clique no MESMO corpo já focado, ou botão "aproximar" na linha de
    contexto): enquadra o CORPO com raio físico (BODY_AXES); porta nova
    **`?ver=corpo`** (default `orbita`), declarada no selo pela lei das portas.
  - *lua* (clique na lua): lua com o pai em quadro — `PARENT_FRAMING_BIAS = 0,78`
    ganha o consumidor prometido.
  - *subida*: botão "sistema" na linha de contexto + `Esc` sobe um degrau.
  - Transição entre degraus: rampa curta do rig; instantânea sob reduced-motion
    (contrato da Onda 5).
- **Abertura na época viva — OVERRIDE DECLARADO (emendas D-E5/T-E12):** o registro
  da Onda 5 dizia "da onda das órbitas"; esta onda REVERTE o destino, com razão: a
  posição viva depende da efeméride + tempo vivo (que já existem), não de órbitas
  desenhadas. O fecho re-registra a pendência 7 da Onda 5 no PLANO-ATLAS
  ("justificativa errada conta como falha" — Onda 9).
- **Luas na busca (emenda P-E10):** (a) a NOTA da lua é a distância AO PAI, com
  degrau de unidade sub-UA: **"Lua · 384 mil km"**, nunca "0,0026 UA" (a regra
  UA/anos-luz não cobria o par lua↔pai; agora cobre); (b) **UMA fonte de nome
  pt-BR**: `corpos.json` i18n.pt com case tratado (title-case), teste de
  completude — todo corpo buscável tem nome pt-BR e nota com unidade;
  `NOMES_DOS_CORPOS` converge para a mesma fonte ou morre (uma fonte só);
  (c) a fonte do rUA das luas NÃO é o retrato (que só tem 9 planetas):
  é a efeméride/Kepler do registro orbital — dito no código.
- Rotação + orientação IAU **ligadas na Terra e na Lua já em F2, julgadas pelo
  oráculo de sub-ponto solar** (fixtures Horizons subpoint da casa); toda fase
  seguinte herda o oráculo por corpo texturizado — sem isso, textura girada 90°
  passa em todos os gates (emenda D-E4).

### D8 — Portas e selo

- **`?corpos` / `?nocorpos`** — par de presença no padrão da casa (emenda D-E9;
  a forma valorada 0|1 morreu). A/B com o mesmo binário, obrigatório no gate.
- `?luz=real|assistida` (linha do eixo BRILHO — D2). Default: **assistida** no
  Atlas; fora do Atlas o estado é neutro por construção (não há superfície no
  filme; teste pina). `?ver=corpo|orbita` (D7). Arquivos novos com porta entram
  em ARQUIVOS_GOVERNADOS; camadas novas na gaveta pelo config único.

### D9 — Amostrador de memória: números, autovalidação, DEV

**(Emendada por P-E8.)** `window.__director.stats` a 1 Hz (renderer.info.memory +
render + heap quando houver; publicado só em DEV — dito no script).
`scripts/visual/memoria.mjs` (CDP): N ciclos entra/sai do Atlas, N trocas de
qualidade, foco em 5 corpos. **Veredito em números:** `textures`/`geometries`
voltam ao valor do ciclo 1 com delta ZERO; heap com inclinação < limiar declarado.
**Autovalidação M5:** o script REPROVA num estado sabidamente vazado (flag de
teste desliga um dispose) antes de o verde valer.

### D10 — Fotometria do ponto: MH18 com política de domínio e rebaseline dita

**(Emendada por T-E9 e P-E3.)** Polinomiais de Mallama & Hilton por corpo no PONTO
fotométrico + termo de anel de Saturno. **Política de extrapolação:** polinomial
DENTRO do domínio publicado (Marte α<50°, Júpiter α<12°, Vênus dois ramos…),
clamp na borda + emenda CONTÍNUA com a Lambertiana fora (razão pinada na costura),
teste de domínio por corpo. **Contrato com o md5:** se o A/B do planeta-pixel medir
envelope não-nulo nas vistas ua*, MH18 entra como divergência declarada com
REBASELINE AUDITADA (números no registro, precedente da dominância/Onda 3); senão
sai da onda como pendência nomeada. Unificações BV_SOL/PONTO_ZERO: só se neutras
bit a bit.

## 3. Fases (emendadas: F2 fatiada, orçamento de quadro, vistas pinadas)

**Regra nova de gate (emendas T-E8/P-E7):** F0 captura um gpu-profile BASELINE da
vista de casa/Atlas; cada fase declara um TETO para o stack novo
(proposta: ≤2 ms em cinema, por programa) e o gate compara contra o teto.
**Toda fase declara ANTES do código:** suas vistas [nome, query] com `?jd=` PINADO
(entram na lista ANTES do código da fase — regra da Onda 4; a época viva não
captura), e o TAMANHO esperado em px de cada efeito julgado — efeito sub-pixel
não é julgado por md5, precisa de oráculo numérico próprio.

- **F0 — Palco e profundidade** (D1): near/updateClip novo com pino de
  neutralidade, inventário de depthTest, portas `?corpos/?nocorpos` + selo,
  gpu-profile baseline. *Gate:* 18/18; teste do pino (sem corpo → near/far
  bit-idênticos); zero pixel.
- **F1 — A lei de luz** (D2): lib pura + oráculos (8 de irradiância + contratos
  renomeados) + selo `?luz=` (linha do eixo BRILHO, copy pt-BR, "+N passos de
  luz") + teste derivado-do-registro + calibração σ×cadeia completa COM o par
  bloom×superfície (emenda T-E10: ou o fundido fica abaixo de 0,82 no subsolar
  dos heróis, ou o halo é aceito e DECLARADO como look — o A/B &nobloom vira
  gate, não diagnóstico). *Gate:* oráculos + selo; zero pixel.
  **F0 ∥ F1 podem paralelizar** (arquivos disjuntos; a entrada do selo de F1
  coordenada no fecho — emenda P-E9).
- **F2a — Terra sólida**: pipeline de texturas nasce aqui (D4); superfície +
  atmosfera Rayleigh+Mie (config da Terra herdada) + luzes noturnas (linstep) +
  nuvens; **rotação/orientação IAU julgada por sub-ponto solar** (D-E4).
  *Vistas pinadas (exemplos a fixar antes do código):* `terra`
  (`?atlas=1&foco=terra&ver=corpo&jd=<pinado>&corpos=1`) + par `&nobloom=1`.
- **F2b — Lua + crossfade + escada**: Lua com regolito LS, dominância
  ponto↔malha (D5, `aCede`), escada de navegação completa (D7), abertura viva.
  *Vistas:* `lua`, `terra-lua`.
- **F2c — Eclipse dos dois lados**: cone + Danjon + needle-teste; jd de eclipse
  NOMEADO (instante real dentro de 1950–2050). *Vistas:* `eclipse-solar`,
  `eclipse-lunar` (a lua vermelha TEM tamanho em px declarado).
  **jd PINADOS pela caça de 2026-08-12 (NOTAS-F2C-ECLIPSES.md), máximos segundo a
  NOSSA efeméride:** solar = 2024-04-08, `?jd=2460409.26395835` (umbra na
  superfície r≈94 km, o mais central); lunar = 2018-07-27,
  `?jd=2458327.34980323` (Lua funda na umbra, folga 2.049 km — insensível à
  incerteza). Divergência de +36 a +97 s contra o catálogo NASA: registro, não
  erro (efeméride contra efeméride; sanidade externa: umbra bate com as larguras
  de faixa publicadas de 2017/2024).
- **F3 — Rochosos**: Mercúrio (regolito), Vênus (camada de atmosfera), Marte,
  Fobos/Deimos. *Vistas:* `mercurio`, `venus`.
- **F4 — Gigantes + anel** (D6). *Vistas:* `jupiter`, `saturno-anel`
  (+`&nobloom`), sombra do anel com px declarado; gpu-profile do anel e da
  advecção contra o teto.
- **F5 — Luas em lote + bancada**: ~20 luas, 5 de Urano no eclipse, bancada
  Titan/Europa (entram SÓ ganhando do incumbente E com licença/crédito
  resolvidos), PARENT_FRAMING_BIAS consumido. Vanth/Weywot SÓ com badge de
  validade que confessa a época (emenda P-E14). *Vistas:* `titan`, `europa`.
- **F6 — Anões/TNOs + anéis procedurais**: Plutão+Caronte (eclipse), Ceres,
  procedurais Haumea/Makemake/Eris (−3 inventados), Quaoar com shapeScale
  (a,c,b), anéis U/N/Quaoar com raios CITADOS. *Vistas:* `plutao-caronte`,
  `quaoar-anel`.
- **F7 — Asteroides**: os 4 modelos com Lommel-Seeliger. *Vista:* `vesta`.
- **F8 — Instrumentos e fecho**: amostrador (D9) + MH18 (D10, com o contrato de
  rebaseline) + unificações + ASSETS.md + z-fighting (instrumento de D1) +
  captura no ladder por tier + `renderer.info.memory` estável + gate integral.
- **F8+ — RODADA DE REFERÊNCIA (decisão do dono, 2026-08-12):** ajuste de
  realismo contra fotos REAIS (NASA, domínio público: DSCOVR/EPIC para a Terra,
  Apollo/LRO para a Lua; Cassini/Juno quando os gigantes existirem), no método
  das 43 rodadas da galáxia. TRÊS TRAVAS contra escalada de custo, aceitas pelo
  dono: (1) referências grátis e curadas UMA vez, com licença anotada;
  (2) a foto é DIREÇÃO, não gabarito de pixel (câmera/exposição são outras — a
  lição do ledger): cada rodada julga 2–3 fatos direcionais, mexe UM botão,
  mede e registra; (3) rodadas CONTADAS (2–3 por corpo-herói), depois da F3,
  porque a recalibração σ×bloom (T-E10) já exige Vênus/Mercúrio na mão — uma
  rodada calibra todos de uma vez. Juiz: a bancada de assets + capturas em
  geometria casada (mesma fase/distância).

**Paralelização com mapa de arquivos (emenda P-E9):** F3 ∥ F4 só com propriedade
declarada: manifest e VISTAS são seções append-only por fase; o material comum
dos corpos congela em F2 (F3/F4 só acrescentam ramos/uniforms declarados).

**Ordem de corte se a onda estourar (emenda P-E12), do primeiro ao último:**
D10+unificações → anéis procedurais U/N/Quaoar → advecção de Júpiter (vira
estática com pendência) → mosaicos da bancada (incumbentes ficam — mas SÓ os com
licença resolvida) → F7 asteroides. **F0–F2 e a lei de luz nunca caem** — sem
elas a onda não aconteceu.

## 4. Riscos (emendados)

1. O filme não move um pixel: 18/18 em CADA fase.
2. Sol-ator × corpo: impossível por construção; pinado por conta + sobrevivência
   do clamp 9aff400.
3. Bloom×superfície é CALIBRAÇÃO com números-alvo (F1), não contingência: Vênus
   real ≈1,33 e Mercúrio ≈1,46 CRUZAM o limiar 0,82 (conta do painel).
4. Payload por fase, medido, nunca em bloco; escada por tier desde F2a.
5. Orçamento de QUADRO: teto declarado por fase (≤2 ms cinema) contra o baseline
   de F0 — a casa usa 15,6–16,0/16,7 ms.
6. Escopo: régua do §6 + ordem de corte do §3.

## 5. As decisões do dono — TOMADAS na abertura (2026-08-12)

1. **Decisão 3 (profundidade), decidida por critério:** *"privilegiar a escolha
   AAA — o que faz a UX ser a melhor possível (SpaceEngine, NASA Eyes)"*.
   Tradução técnica registrada: o cosmos da casa já é 100% livre de depth, então
   o padrão AAA aplicável é o do NASA Eyes (câmera/frustum por escala) — aqui
   realizado como o palco local de D1, sem segunda câmera porque só uma partição
   tem conteúdo com depth. **O critério AAA vira o gate: ZERO pixel de z-fighting
   no instrumento autovalidado.** Escalada declarada se a medição reprovar:
   log-depth (o caminho do SpaceEngine/Cesium), voltando ao dono.
2. **Texturas, decidido:** textura REAL em tudo que tem imagem real, a melhor
   possível (8k onde ficar melhor), procedural só onde não existe imagem;
   escada por tier continua (aparelho fraco recebe menos); licença/origem
   documentada com o melhor que se achar por entrada, origem não resolvida entra
   MARCADA (app grátis, open-source, educativo, não divulgado); atribuições
   obrigatórias preservadas. Payload final MEDIDO e registrado no gate.

## 6. O que NÃO entra (dito para não renascer por engano)

Órbitas desenhadas (linhas/guia — candidata à onda seguinte; GUIA reservado);
auto-exposição (Onda 8); starOptics (7a); encontros (7b/Decisão 1); superfície
1ª pessoa (aposentada); Hapke com parâmetros inventados; piso de luz ambiente;
mosaico/textura sem licença resolvida; céu profundo/fenômenos (sonhos).

## 7. Pauta NOMEADA da revisão de olhos frescos do merge (emenda P-E11)

(a) clamps/NaN/pow nos shaders novos de superfície (precedente c098470/9aff400);
(b) convenções de SINAL do eixo iluminado e da umbra assinada (precedente do
negate da Onda 5); (c) selo não-desmentível re-testado à mão, controle a
controle; (d) licença por entrada do manifest conferida contra a fonte;
(e) a11y dos controles novos (linha ?luz=, botões da escada); (f) doutrina de
travessia por artefato (dado/oráculo × runtime — o que atravessou foi o quê).

**Registro do fecho enumera:** as 6 correções de fato; linhas da matriz movidas
(PARENT_FRAMING_BIAS cumprido; abertura na época re-registrada; regolito
re-registrado sem "parâmetros por corpo"); pendências nomeadas; números medidos
(payload final, z-fighting, memória, gpu por fase); as 2 decisões do dono.
