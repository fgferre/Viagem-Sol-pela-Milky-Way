# Onda 4 — Desenho oficial (2026-08-11)

**Documento de trabalho da onda. Consumido no fecho: o resultado vai para o Estado da Onda 4 no PLANO-ATLAS e para o NORTE; este arquivo morre no merge (regra 8 do AGENTS.md).**

## 0. A decisão do dono que muda a premissa

No dia da abertura, o dono decidiu (registrado, palavras dele): *"eu quero ser um SpaceEngine... temos que ser honestos nessas escalas se isso é possível"* e *"quero ser MAIS que o SpaceEngine"* (a honestidade de escala dele + a galáxia procedural científica volumétrica que só a casa tem). Isso **derruba a premissa de escala ampliada** com que a espec original da onda foi escrita ("planetas como sprites" na janela do crossfade, com escalar didático) e a substitui pela leitura honesta:

- **Escala 1:1.** Posições reais da efeméride, conversor único `AU_PARA_PC`. Nenhum escalar didático, nunca.
- **Visibilidade por fotometria**, não por inflação: um planeta aparece quando o brilho aparente dele manda, como no céu de verdade. A casa já faz isso com as 328k estrelas (`catalogApparentMag`, PSF); os planetas entram na mesma lei.
- **O filme não muda um pixel.** Da trajetória do filme (mínimo 0,062 pc = 12.788 UA), planetas reais têm m≈22: invisíveis, honestamente. As 15 vistas oficiais saem **bit-idênticas** — mais forte que o que o plano pedia.
- A letra da espec é honrada no espelho: o **"frame local em UA"** nasce ABAIXO do piso do filme (não na janela do crossfade), e os **"fades acoplados"** são o crossfade reverso disco-artístico→ponto-fotométrico. O gate da espec fica intacto: **posição projetada vs. efeméride; harness de longe inalterado**.

A dramaturgia que a física dá de graça no mergulho (voo livre, abaixo do piso do filme): a fotosfera artística se dissolve entre 10.300 e 4.125 UA; sobra um Sol-estrela brilhante; **Júpiter acende a ~1.500 UA** como pontinho; a ~200 UA é olho nu; a ~150 UA o desfile (Vênus, Terra, Saturno); a ~30 UA cruza-se a órbita de Netuno com a família como faróis; a 1 UA o Sol subtende 0,53°, como da Terra.

## 1. Decisões

**D1 — Escala verdadeira, conversor único.** Posição de cena = `eclipticaParaEquatorial(posicaoHeliocentrica(id, EPOCA_JD_TDB)) × AU_PARA_PC`. A cena já é heliocêntrica equatorial J2000 em pc com o Sol na origem — a ponte é uma rotação e uma multiplicação. PROIBIDO (com teste de texto-fonte): qualquer outro escalar de comprimento no módulo; o caminho galactocêntrico (`posicaoHeliocentricaEclipticaParaCena` + `galactocentricToScene`), que erra a origem em 0,1134 UA medidos.

**D2 — O domínio profundo e os fades acoplados.** Janela nova na tabela de `lodStellar.ts`, ao lado das existentes: `LOD_SOL.deep = { fade1Pc: 0.05, fade0Pc: 0.02 }` (números de projeto; o A/B da fase de envelope pode movê-los ANTES de ligar a chave, precedente D11 da Onda 3). Funções puras novas:
- `deepDiscFade(dPc)`: 1 exato para d ≥ 0,05; 0 exato para d ≤ 0,02; smoothstep entre. Multiplica o `uWorldFade` do disco artístico via composição `solWorldFade(d) = discWorldFade(d) · deepDiscFade(d)` — atenuação fatorada num lugar só (lição 2e16689).
- `deepPointGain(dPc)`: o reverso (0 acima de 0,05, 1 abaixo de 0,02) — alpha do Sol-ponto fotométrico da camada nova.
O piso do filme (0,062 pc) fica FORA da janela com 24% de margem: acima de 0,05 pc **nada muda, bit a bit** (testado por `Object.is(deepDiscFade(d), 1)` nas distâncias das 15 vistas e do roteiro inteiro).
Os call-sites do `stellarBody`/`SunStar` trocam para as composições; os testes de texto-fonte que pinavam as strings antigas são REESCRITOS deliberadamente, com a justificativa neste desenho. `SunStar` (clarão de hero) NÃO é tocado — segue com as janelas atuais, morto abaixo de 0,14 pc.

**D3 — A camada `planetas`: 10 pontos fotométricos.** `THREE.Points` único (Sol + 8 planetas + Plutão), grupo próprio na cena (NUNCA filho de `sun.group` — escala 0,005 do doador e return antecipado), AdditiveBlending, `depthWrite:false`, `depthTest:false`, `transparent:true`, `renderOrder 7`, `frustumCulled:false`. VERT reusa a PSF da casa (`GLSL_STAR_PSF`, `common.ts`) com os MESMOS `expoM0 = 3,5` e `sigmaPx = 0,85` do campo — fotometria RELATIVA planeta↔estrela honesta, sem exposição própria, sem compressão. Magnitude aparente por quadro NO SHADER (idioma do campo):
- Planetas: atributo `aMagBase = H + 5·log10(r_UA)` (H = magnitude absoluta planetária, tabela Mallama com fonte por linha; r = distância heliocêntrica DA EFEMÉRIDE na época); no VERT, `m = aMagBase + 5·log10(d_obs_UA) + fase`, com `d_obs` da câmera e **fase Lambertiana declarada como aproximação** (a polinomial por corpo é pendência nomeada da Onda 6).
- Sol: o PONTO-ZERO do campo, `m = −0,15 + 5·log10(d_pc)` (equivale a M_V = 4,85 — medido pela F1 contra `catalogApparentMag`; o 4,83 da 1ª versão deste desenho estava errado em 0,02 mag). **NÃO reusar `catalogApparentMag` diretamente: ela clampa `distPc` em 1e-3 pc = 206 UA (achado F1, pinado em teste) e satura exatamente dentro do domínio profundo.** A camada usa a mesma fórmula SEM esse clamp (guarda mínima contra d=0 declarada, ex. 1e-9 pc). Alpha do Sol-ponto = `deepPointGain(d)`; alpha dos planetas = 1 (a física decide o brilho).
- Correções de fato da F1 sobre esta seção: o oráculo Horizons cobre **5** corpos (Plutão tem fixture em 2026-01-01), e as magnitudes da prosa do §0 estavam superestimadas — Júpiter no piso do filme tem m = 14,72 (não ~22), ainda ordens abaixo do limiar de tela; quem protege o filme é o gate de visibilidade `dHome < 0,05 pc`, e isso segue verdadeiro.
Cores: tabela literal de 10 RGB lineares com fonte citada por linha; invariante testado é a ORDEM dos canais (Marte r>b, Urano/Netuno b>r...). Lua e satélites FICAM DE FORA (sub-resolução; resíduos Kepler de até 5,2° sem canal de honestidade; Onda 6).
Visibilidade de CUSTO (não de conteúdo): `points.visible = ligado && dHome < LOD_SOL.deep.fade1Pc` — em 0,05 pc o corpo mais brilhante (Júpiter) tem m ≈ 12,3, sub-limiar de tela: o corte não pisca (testado). Zero alocação por quadro; uniforms: `uCamPos`, `uScreenH`, `uGain` (três escritas).

**D4 — Época fixa.** `EPOCA_JD_TDB = 2461041.5008692136` (= 2026-01-01T00:00:00Z pelo conversor da casa; igualdade pinada por teste). Literal, nunca `Date`/`dateToTDB` no runtime (anti-padrão nº 6). Escolhida por ser a mais recente com fixtures Horizons na casa (4 corpos: mercury/earth/mars/neptune — conferido em disco nesta sessão) e cair funda na janela da tabela. Tabela congelada `src/three/world/planetas/retrato2026.ts` GERADA por `scripts/data/atlas/gera-retrato-planetas.mjs` (lê `efemerides.bin`, escreve 9 vetores UA eclíptica J2000 + r_UA + proveniência: jdTDB, ISO, sha256 do .bin, comando de regeneração). **Zero byte de payload novo** — a efemerides.bin não é baixada; o fio de rede é pendência declarada da Onda 6 (tempo vivo).

**D5 — Near plane profundo (piecewise, bit-exato acima).** `engine.updateClip`: para `d ≥ 0,05` a fórmula atual VERBATIM (`near = clamp(d·0,004, 0,001, 40)`); para `d < 0,05`, `near = max(d·0,004, 1e-8)`, far inalterado. Teste: nas distâncias das 15 vistas, do roteiro e do gate do céu, o par (near, far) é IDÊNTICO ao antigo. Sem log-depth: a camada é aditiva sem depth; "Log-depth: não" NÃO reabre (gatilho literal é "geometria resolvida (planetas, malhas)" — não entra malha nenhuma). A reabertura fica para a Onda 6, como o plano já diz.

**D6 — Voo no domínio profundo.** `FreeRoam`: para `d < 0,05 pc` o clamp de velocidade vira proporcional (`speed = clamp(d·0,02, d·0,02, 600)`, sem o piso de 2 pc/s); acima, fórmula atual verbatim. Sem isso o mergulho é inavegável (2 pc/s = o sistema solar inteiro em 1 ms). Guardado por teste.

**D7 — Flags e auditoria.** Duas portas no precedente `?dom/?nodom`: constante `PLANETAS_DEFAULT_ON` (false até o envelope), `?plan=1` liga, `?noplan=1` desliga ao vivo; 'noplan' no array literal do director e em CAMADAS do Ajustes (viva). `?dbgplan` no molde do `?dbgstar`: imprime por corpo id / UA eclíptica / pc de cena / NDC / px / m aparente, mais EPOCA_JD_TDB e ISO. Unidades voltadas ao visitante (decisão do dono): o readout fala UA e anos-luz; pc só como régua interna anotada.

**D8 — Protocolo do céu.** `sky-capture.mjs` ganha `&noplan=1` na URL de protocolo (precedente exato do `nohero=1`): a câmera do céu fica na origem, DENTRO do domínio profundo, e os planetas reais estariam no céu de verdade — mas o oráculo é a recriação Gaia, que não tem planetas. Exigência: skyError **0,7782** com os cinco termos idênticos, e as 6 faces bit-idênticas (prova também que o near profundo não mexeu no fundo).

**D9 — Vistas novas (3, lista 15→18).** `ua500` = `?pos=0,0,0.0024241&look=0,0,0&shot=2` (Sol-estrela + Júpiter fraco); `ua150` = `?pos=0,0,0.00072722&look=0,0,0&shot=2` (o desfile a olho nu, sistema inteiro em quadro — escorço 0,917, quase face-on); `ua40` = `?pos=0,0,0.00019393&look=0,0,0&shot=2` (a família como faróis, cruzando a órbita de Netuno). Entram na lista PRIMEIRO (fase 0, no HEAD sem a onda — desarma a armadilha do laço); `ua150` entra nas SENTINELAS (3→4). No "antes" elas mostram só o fundo (near velho clipa tudo a <206 UA) — baseline legítima do diff.

**D10 — Gate de posição projetada: três réguas independentes.**
- *Régua 1, vitest puro (~2 s):* cadeia inteira elo a elo — proveniência bit-exata da tabela contra `MotorEfemerides` (Object.is nos float64); oráculo Horizons nos 4 corpos com fixture (limiar 1e-3° contra resíduo medido ~4e-4°); orçamento do manifesto nos 4 sem fixture; rotação julgada por norma preservada (≤1e-15 relativo) e pelo plano da eclíptica (normal ajustada aos 8 a ≤0,5° do polo eclíptico em equatorial); projeção `PerspectiveCamera.project` pinada em px nas câmeras das 3 vistas novas; invariantes de near; texto-fonte (D1, D3, D8 estrutural, ausência de onQuality/alocação).
- *Régua 2, CDP:* `?dbgplan` lê o Float32Array REAL do atributo e projeta com a câmera do quadro; comparação com a régua 1 a ≤1e-3 px.
- *Régua 3, pixel:* `scripts/visual/planeta-pixel.mjs` — diff antes/depois de `ua150`/`ua40`, componentes conexas, centroide ponderado E centro da caixa a ≤0,5 px do previsto; instrumento validado nos dois estados (M5): zero componentes com `?noplan=1`, N esperado com `?plan=1`.

**D11a — Emenda pós-F2 (decisão do coordenador, 2026-08-11).** As três vistas profundas (ua500/ua150/ua40) mudaram JÁ na F2, não na F4: o palco (solWorldFade) apagou os riscos da metade de trás do disco artístico que vazavam além do near — só remoção de luz de artefato (13.938 px, 100% perda, medido; delta em scratchpad). ACEITO: é a visão honesta agindo. Consequência: **as duas portas `?plan/?noplan` governam a CAMADA de planetas, não o palco** — o domínio profundo (D2/D5/D6) é fundação sem porta, como o near, e sua prova é a bit-igualdade das 15 antigas + os testes de bit-igualdade acima do limiar. O A/B de portas da F4 compara contra o estado pós-F2 nas três profundas e contra o "antes" histórico nas 15.

**D11 — Prova "inalterada de longe" (mais forte que a espec).** (a) as **15 vistas antigas TODAS bit-idênticas** contra a tabela do NORTE (a onda não muda nenhuma — nem as 5 de perto); (b) sky 0,7782 com termos idênticos; (c) `rodada.mjs` CONSERTADO na fase 0, rodado antes (rodada 42, com descontinuidade declarada no ledger: primeira por CDP com tier fixo) e depois (43, colunas idênticas às da 42); (d) A/B das duas portas com o mesmo binário: `EXTRA='&noplan=1'` devolve as 18 do "antes"; `PLANETAS_DEFAULT_ON=false` + `EXTRA='&plan=1'` devolve as 18 do "depois".

**D12 — Consertos estruturais (diretiva "sem preguiça", fase 0).** (1) `rodada.mjs`: import de CHROME/GPU_FLAGS/matarPerfil do chrome.mjs, caminho de macOS, migração para `capturarCDP`, `&q=cinema`, vias por `julgarProntidao`. (2) Laço de veredito do `ab-identidade` extraído para `julgarVistas` pura que emite NOVA/AUSENTE e reprova em silêncio nunca — com teste no caso sabidamente quebrado. (3) eslint passa a cobrir `scripts/**/*.mjs` (o alarme cuja ausência deixou o rodada quebrado 3 meses); se acender demais, escopo cai para `scripts/visual` com registro. (4) Rename da armadilha: `posicaoHeliocentricaEclipticaParaCena` → `heliocentricaEclipticaUAParaBaseGalactocentricaPc` + teste-oráculo que PINA o resíduo de 0,1134 UA do caminho composto (sem "consertar" GC_POS, que moveria a galáxia e 10 md5). (5) vSat no PLANO: **já corrigido nesta sessão** (registrado).

## 2. Fases (cada uma termina em commit validado)

- **F0 — O chão.** D12 inteiro + as 3 vistas novas na lista + leva "antes" completa (18 vistas, no HEAD sem a onda) + rodada 42. Valida: npm test verde; rodada roda nesta máquina; 15/15 conferem com o NORTE.
- **F1 — O dado.** Gerador + `retrato2026.ts` + `fotometria.ts` (H, cores, fase Lambertiana; fontes por linha). Valida: régua 1 (proveniência, Horizons, orçamentos); zero pixel (SMOKE igual).
- **F2 — O palco.** Janelas `deep` em lodStellar + composições + near piecewise + voo proporcional; testes puros de bit-igualdade acima de 0,05 pc. Valida: npm test; leva SMOKE bit-idêntica (nada muda sem a camada).
  - **[medido na F2, 2026-08-11] A previsão "SMOKE bit-idêntica" valeu para 3 das 4 sentinelas e FALHOU na `ua150` — porque a D2 manda.** `sol`, `soldisco` e `hero8` saíram bit-idênticas; `ua150` DIFERE (64efef464d97 → e6990475232e), e `ua500`/`ua40` também. A premissa da D9 ("no antes elas mostram só o fundo, o near velho clipa tudo a <206 UA") estava incompleta: o near clipa o que está a menos de 206 UA DA CÂMERA, mas o disco artístico tem 2.269 UA de raio, então a metade de trás dele e as raias/loops ficavam ALÉM do near e desenhavam — a 150 UA o "antes" tem riscos finos alaranjados no quadro. Com `solWorldFade = 0` o grupo do Sol apaga e eles somem. Diff de pixel da `ua150`: 13.938 px de 3.083.400 (0,45%), delta máx 197, caixa 926×1484 em (0,229) — e a direção é UNILATERAL: 13.789 px perderam luz, 1 ganhou (soma de ganho 149 contra 558.407 de perda). Ou seja: a F2 só TIROU o que a D2 mandou tirar, e o near novo não acrescentou nada (a camada é a F3). Decisão do dono pendente; se aceita, as três baselines profundas nascem na F2 e a linha da F4 passa a ler "as 3 já diferem desde a F2, e a camada muda só elas de novo".
- **F3 — A camada, desligada.** `planetas.ts` + fiação (init/tick/teardown/flags/?dbgplan/Ajustes) com `PLANETAS_DEFAULT_ON=false`. Valida: 18 vistas bit-idênticas por construção; réguas 1–2 com `?plan=1`; smoke L37 em navegador real.
- **F4 — Envelope e chave.** Medição do envelope com `?plan=1` (glare do Sol-ponto, legibilidade do desfile, janelas deep) ANTES de ligar; ajustes só nos números de projeto declarados (janela deep), com medição registrada. Liga `PLANETAS_DEFAULT_ON=true`. Valida: leva completa — **15 antigas IGUAIS, ua500/ua150/ua40 DIFEREM do antes (e só elas)**; A/B das duas portas.
  - **[medido na F4] A chave está ligada e o envelope está medido — ver a seção 4 abaixo.**
- **F5 — Gate e fecho.** Régua 3 (pixel), sky com `&noplan=1` (0,7782), rodada 43, smoke da viagem inteira. Fecho nos registros: Estado da Onda 4 no PLANO (com a decisão de visão do dono e a emenda da espec), NORTE (decisão de visão nas Decisões fechadas; tabela de md5 com as 3 novas; pendências), este arquivo morre, merge local em main.

## 3. Custos e pendências declaradas

- **Payload: zero byte.** Bundle: ~2 kB de fonte gerada + a camada.
- **md5: nenhuma das 15 muda; nascem 3.** Sky e rodada inalterados.
- **Testes: ~760 → ~850.**
- **Pendências nomeadas:** fixtures Horizons de venus/jupiter/saturn/uranus (rede, aprovação do dono); fase polinomial por corpo e planetas resolvidos (Onda 6); Sol resolvido em escala real abaixo de ~5 UA e starOptics do Sol-ponto (Ondas 6/7a); fio de rede da efemerides.bin + tempo vivo (Onda 5/6); selo da Onda 5 ganha o eixo "ESCALA REAL" de graça no domínio profundo; o dado de `?nosun` NÃO governa o Sol-ponto (governa `noplan`) — declarado aqui, revisitado quando o selo nascer.

## 4. F4 — envelope medido (2026-08-11)

### 4.1 A decisão do coordenador que governa esta fase

**O brilho do Sol NÃO se mente.** Nenhum teto artificial entra no Sol-ponto: encarar
o Sol de 150 UA ofusca porque é FÍSICO, e a honestidade de escala do dono (§0) vale
também quando o resultado incomoda. Duas pendências nascem NOMEADAS daqui, com estes
números como semente: **auto-exposição na Onda 8** e **`starOptics` do Sol-ponto na
Onda 7a**.

**Quem abla é o INSTRUMENTO.** A régua 3 captura os próprios pares com `&nobloom=1`,
porque com o bloom ligado 31,85% do quadro satura e um quadro saturado não tem
centroide — a régua mediria a forma do pós-processamento, não a posição dos corpos.
Precedente exato: o protocolo do céu pina `exp=4.4&knee=0.02&kneeamt=1` pelo mesmo
motivo (medir astrofoto sem o stretch equivalente compara curva de tom, não céu).
**As TRÊS vistas oficiais profundas ficam com o render DEFAULT, bloom ligado** — elas
documentam o estado verdadeiro do produto. Régua e retrato medem coisas diferentes de
propósito.

### 4.2 Os md5 novos — e só três mudaram

| vista | antes (pós-F2) | depois (chave ligada) |
|---|---|---|
| `ua500` | `b950ae47019e` | **`5f8136c12732`** |
| `ua150` | `e6990475232e` | **`9b3e75b2af91`** |
| `ua40` | `5dbf3afd6274` | **`a607e3cf57ab`** |

As **quinze antigas saíram bit-idênticas** à tabela do NORTE, 18/18 por `via=sinal`,
1,9 min com `JOBS=3`. O filme não muda um pixel — a promessa da onda, cumprida.

**A/B das duas portas, com o MESMO binário** (`DOZERO=1 EXTRA='&noplan=1'`, chave em
`true`): as 18 voltam aos md5 de antes da camada, **bit a bit** — as 15 antigas e as
três profundas nos `b950ae47019e` / `e6990475232e` / `5dbf3afd6274`. O caminho de
volta é EXATO, e é o que prova que a camada é a única coisa que a chave move.

**Diff de pixel das três** (`ab-antes-*` × `ab-depois-*`, render default com bloom):

| vista | px diferentes | delta máx | sinal |
|---|---|---|---|
| `ua500` | 2.959.144 (95,970%) | 252 | **100% só ganharam luz** (soma +1.247.431.406 / −0) |
| `ua150` | 3.027.475 (98,186%) | 252 | 3.027.474 ganharam, **1 perdeu** (soma +1.544.987.667 / −1) |
| `ua40` | 3.043.292 (98,699%) | 252 | **100% só ganharam luz** (soma +1.638.469.318 / −0) |

O quadro inteiro muda porque o **bloom** espalha o Sol-ponto (m = −15,84 na `ua150`);
a concentração de ENERGIA fica no bloco central, em (960,1200) nas duas mais próximas.
O **único pixel que perdeu** está em (78, 1623), canto escuro, vermelho 5 → 4: é
arredondamento da própria cadeia de bloom/tonemap, não da camada — a régua 3, que
mede com `&nobloom=1`, dá **zero pixels descendo nas três vistas**.

(`diff-pixel.mjs` ganhou nesta fase a coluna de SINAL e o bloco de maior LUZ. O NORTE
já registrava que a mensagem enlatada engana e que o sinal tinha de ser medido à mão;
agora sai do próprio instrumento, e num quadro em que 98% dos pixels mudaram o
"pior bloco" satura enquanto a soma de delta ainda aponta o centro.)

### 4.3 A régua 3 (pixel) — tabela por corpo

`scripts/visual/planeta-pixel.mjs`, 1800×1713, `q=cinema`, `&nobloom=1`, par
`?plan=1` × `?noplan=1` com o mesmo binário. **O resultado é IDÊNTICO linha a linha
antes e depois de virar a chave** (medido: `?plan=1` com a chave `false` e a chave
`true` sem porta nenhuma dão a mesma tabela) — a porta e a chave dizem a mesma coisa.

Validação M5 nos dois estados, antes de qualquer veredito:
- **auto-teste sintético** (em processo, sem GPU): alvo certo MEDIDO, o MESMO par com
  o alvo deslocado 3 px **REPROVA**, par nulo em zero componentes;
- **par nulo real** `noplan × noplan`, duas capturas independentes: **0 px, 0
  componentes** nas três vistas. O piso de ruído é medido, não suposto.

Nas três vistas: **só adição** (321 / 403 / 563 px acesos, TODOS subindo, zero
descendo) e **zero componente sem dono longe de um corpo previsto**. O pixel central
do Sol é (255, 254, 255) — nem ele clipa os três canais com `nobloom`.

| vista | corpo | previsto px | Δcentroide x/y | Δcaixa x/y | status |
|---|---|---|---|---|---|
| ua500 | sun | (900,000, 856,500) | +0,000 / +0,003 | não julgada | **MEDIDO** |
| ua500 | mercury · venus · earth · mars | — | — | — | SOB-GLARE (dentro da mancha do Sol) |
| ua500 | jupiter | (914,827, 854,494) | −0,177 / −0,194 | −0,327 / +0,006 | **MEDIDO** |
| ua500 | saturn | (894,635, 885,397) | — | — | SOB-LIMIAR (2 px de faísca) |
| ua500 | uranus · neptune · pluto | — | — | — | SOB-LIMIAR |
| ua150 | sun | (900,000, 856,500) | +0,000 / +0,003 | não julgada | **MEDIDO** |
| ua150 | mercury · venus · earth | — | — | — | SOB-GLARE (dentro da mancha do Sol) |
| ua150 | mars | (886,641, 857,035) | — | — | SOB-LIMIAR (5 px de faísca) |
| ua150 | jupiter | (949,886, 849,750) | +0,039 / +0,085 | +0,114 / +0,250 | **MEDIDO** |
| ua150 | saturn | (882,138, 952,712) | −0,164 / +0,157 | −0,138 / +0,288 | **MEDIDO** |
| ua150 | uranus · neptune · pluto | — | — | — | SOB-LIMIAR |
| ua40 | sun | (900,000, 856,500) | +0,000 / +0,002 | +0,000 / +0,000 | **MEDIDO** |
| ua40 | mercury | (887,969, 845,265) | −0,033 / −0,018 | +0,031 / −0,265 | **MEDIDO** |
| ua40 | venus | (874,714, 854,223) | +0,034 / −0,013 | +0,286 / −0,223 | **MEDIDO** |
| ua40 | earth | (935,277, 857,580) | −0,021 / +0,055 | −0,277 / +0,420 | **MEDIDO** |
| ua40 | mars | (850,436, 858,485) | −0,034 / +0,064 | +0,064 / +0,015 | **MEDIDO** |
| ua40 | jupiter | (1094,201, 830,224) | +0,000 / −0,011 | −0,201 / −0,224 | **MEDIDO** |
| ua40 | saturn | (833,321, 1215,650) | −0,044 / −0,003 | −0,321 / −0,150 | **MEDIDO** |
| ua40 | uranus | (1495,020, 1461,488) | — | — | SOB-LIMIAR (2 px de faísca) |
| ua40 | neptune | (674,052, 1975,782) | — | — | FORA-DO-QUADRO (py > 1713) |
| ua40 | pluto | (44,892, 1225,778) | — | — | SOB-LIMIAR |

**Onze corpos MEDIDOS, pior erro de centroide 0,194 px num eixo.** Na `ua40` os SETE
de dentro saem medidos, do Sol a Saturno — é o desfile que a §0 prometia.

**Dois achados que mudaram o JUÍZO, não o alvo** (e que emendam a letra da D10):
1. **A cobrança dos 0,5 px é POR EIXO.** O centro da caixa vive numa grade de meio
   pixel por construção (`(x0+x1+1)/2`); cobrar a HIPOTENUSA ≤0,5 seria cobrar 0,35 px
   por eixo, mais fino que a grade — reprovaria a régua, não a camada. A Terra na
   `ua40` sai com a caixa a 0,277/0,420 px, dentro dos 0,5 em cada eixo e **0,503 na
   hipotenusa**. O centroide passa com folga nas duas leituras.
2. **A caixa NÃO é julgada quando outro corpo tem luz na mesma componente.** Ela é
   propriedade da componente inteira e o vizinho a estica. Na `ua150` a Terra cai a
   9,3 px do Sol, DENTRO do sprite dele, e estica a caixa do Sol em 2 px de um lado
   (Δcaixa 1,000) enquanto o centroide do Sol fica em **0,003 px**. O centroide não
   sofre disso: é ponderado pelo delta, e o vizinho pesa ordens de grandeza menos.

**E uma correção de fato sobre o `SOB-LIMIAR`.** O critério (pico de PSF < 1/255) é
LINEAR, e a tela é sRGB: um pico linear de 1,5e-4 ainda arredonda para cima em pixels
soltos. Marte na `ua150` é o caso — 5 px acesos em três faíscas a ≤2,6 px do previsto,
sem mancha no pixel previsto. A régua DIZ isso na linha em vez de esconder atrás de um
`SOB-LIMIAR` seco: é o corpo em cima do degrau da tela, e o dia em que a auto-exposição
da Onda 8 chegar, é ele que acende primeiro.

### 4.4 O gate do céu (D8) — não se mexeu, e a prova é bit a bit

`sky-capture.mjs` ganhou `&noplan=1` na URL de protocolo, no MESMO commit que virou a
chave. **`skyError` 0,7782**, os cinco termos idênticos até a quarta casa (espessura
0,3026 · fenda 0,2240 · perfil 0,2047 · púrpura 0,0336 · cor 0,0132) e os quatro
brutos também (bulgeAnti 5,497 · rift 0,0694 · colour 0,0509 · purp 0,0448).

**As SEIS faces saem BIT-IDÊNTICAS** a uma referência capturada de propósito no estado
pré-F4 (chave `false`, protocolo sem `noplan`): `gc 845781a1…` · `anti afe5d64e…` ·
`l90 bfaf2cfe…` · `l270 b20034a6…` · `npole 8ededf1f…` · `spole 929e645d…`. Ou seja: o
near piecewise da F2 não mexeu no fundo, e a porta desliga a camada exatamente.

### 4.5 O envelope do mergulho — o que se vê, distância a distância

Capturas em `capturas/envelope-*.png` (`?pos=0,0,D&look=0,0,0&q=cinema&shot=2`, com e
sem `nobloom`), chave ligada. A janela `deep = {0,05; 0,02}` **não foi tocada** — o que
segue é o laudo.

- **0,045 pc = 9.282 UA** (`envelope-0p045pc-9282ua-{bloom,nobloom}.png`) — a fotosfera
  artística está praticamente inteira (granulação, manchas, proeminências no limbo) e
  o Sol-ponto **nasce como um ponto branco minúsculo no centro exato do disco**
  (`deepPointGain` = 0,074). Com bloom ele já é um núcleo brilhante; sem bloom é um
  ponto de ~20 px. É o primeiro quadro em que os dois existem juntos.
- **0,03 pc = 6.188 UA** (`…0p03pc-6188ua-…`) — meio da janela. O disco escureceu para
  um laranja-tijolo (`solWorldFade` 0,259) sem encolher, e o ponto (ganho 0,741)
  **domina o centro**: com bloom, um clarão branco que lava o disco de dentro para
  fora; sem bloom, o mesmo pontinho sobre uma fotosfera apagada. A dramaturgia é a
  fotosfera cedendo, não sumindo de golpe.
- **0,022 pc = 4.538 UA** (`…0p022pc-4538ua-…`, capturada de propósito FORA das quatro
  pedidas) — o teste do "buraco escuro": com o disco a 1,3% de brilho, ele poderia
  aparecer como um CÍRCULO PRETO tapando o campo estelar. **Não aparece.** O grupo é
  aditivo, então apagar é desaparecer: as estrelas e a Via Láctea atravessam o lugar
  onde o disco estava, e só o Sol-ponto fica. **Sem buraco e sem pop.**
- **0,01 pc = 2.063 UA** (`…0p01pc-2063ua-…`) — abaixo da janela. Disco em zero exato,
  o Sol é **uma estrela**: sem bloom, um disco branco limpo de ~20 px no campo
  estelar, com a Via Láctea ao fundo; com bloom, o clarão toma a maior parte do quadro.
  É o "encarar o Sol ofusca" da decisão 4.1, e é físico.
- **0,002 pc = 413 UA** (`…0p002pc-413ua-…`) — o Sol-ponto um pouco maior e mais
  branco; Júpiter é a única companhia com pixel próprio nessa faixa (a régua 3 o mede
  a 500 UA, a 0,19 px). O resto do desfile só acende mais para dentro.

**Veredito do handoff: monótono e sem descontinuidade.** Disco pleno acima de 0,05 →
disco esmaecendo com um ponto crescendo no centro entre 0,05 e 0,02 → ponto sozinho
abaixo de 0,02. A única coisa a decidir mais tarde não é a janela: é a **exposição**,
porque o que ofusca é o Sol e não a rampa. Pendência já nomeada (Onda 8).
