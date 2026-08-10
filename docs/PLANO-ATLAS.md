# PLANO-MESTRE CONSOLIDADO — O Atlas vive dentro da Viagem
**Versão 2 · 2026-08-10 · substitui o plano-mestre v1, v2, o "final" pós-crítico, o consolidado pré-auditoria e a Versão final de 2026-08-10**

Este é o documento de referência do projeto. Ele funde o plano-mestre (visão, matriz, roadmap, decisões) com a revisão que reabriu os 20 aposentados **com os arquivos abertos na tela**, incorpora a auditoria que conferiu essa fusão linha a linha, e agora incorpora a **doutrina de travessia** (§0), que muda o que significa a palavra "migra".

O fundamento não muda: **preservação com rastreabilidade**. Nenhum astro, funcionalidade ou conteúdo do atlas fica sem destino declarado, e todo descarte carrega o custo dito na cara. A régua da rodada anterior continua valendo: um item é **o que os arquivos dizem, não o que o nome promete** — e um arquivo que ninguém abriu não recebe veredito, recebe pendência. O que a Versão 2 acrescenta é uma segunda régua, por cima dessa: **o que atravessa é dado julgado por um oráculo, ou é código de runtime?**

Raízes: **viagem** = `/Users/fgferre/Github/Viagem-Sol-pela-Milky-Way`, **atlas** = `/Users/fgferre/Github/atlas-orbital`.

---

## 0. Doutrina de travessia

*Em uma frase: o código do atlas é a especificação do problema, não o fornecedor da solução — o que ele sabe atravessa, o que ele faz em tela renasce.*

### 0.1 O fato de projeto

O dono do produto olhou o atlas-orbital e disse, com todas as letras: aquilo foi **feito no impulso, com modelos de IA anteriores** aos de hoje; a **iluminação de lá é super bugada**; e **várias escolhas de interface são pobres**. Isso não é opinião de corredor — é **fato de projeto**, registrado aqui, e passa a governar a matriz. Quem discorda de uma linha específica discorda com arquivo aberto e medição na mão, não com apego.

A crítica de olhos frescos confirmou o testemunho item por item, com arquivo e linha (§7). O resumo em linguagem simples: **o atlas fala de luz física com vocabulário certo e faz outra coisa na tela**. Ele tem `pointLight` com `decay = 0` — luz que não cai com a distância — e reintroduz o 1/r² depois, por fora, material a material. Ele não projeta uma sombra sequer, porque a luz que deveria projetar está numa camada que a câmera nunca coleta, e ainda assim o controle de qualidade continua mandando resolução de shadow map para ela. A adaptação ocular custa passes todo frame para devolver, no caso comum, a constante 1,0. E o selo que promete honestidade pode ser desmentido em dois cliques por um painel de debug promovido a produto.

Nada disso invalida o **problema** que o atlas enfrentou. O problema é real, é nosso, e é caro: 9.400:1 de faixa dinâmica entre Mercúrio e Netuno num display de ~25:1 úteis. O que muda é de onde vem a solução.

### 0.2 A régua

Três categorias, e a fronteira entre elas é o que decide o veredito de cada linha da matriz.

**1. Dados e oráculos — MIGRAM VERBATIM.** Efemérides, fixtures Horizons, coeficientes IAU transcritos do kernel NAIF, valores medidos, tabelas editoriais, testes de regressão numérica. Estes são **a verdade que valida qualquer reescrita**. Não têm "qualidade de código" a discutir: ou batem com a fonte, ou não batem. Um teste que diz "Sirius A1V, 9.940 K" continua verdadeiro independentemente de quem escreveu o código que ele julga — e é justamente por isso que ele é o instrumento que autoriza reescrever o código.

**2. Ferramentas offline julgadas por um oráculo — PODEM MIGRAR.** Scripts que rodam fora do produto e cuja saída um gate confere contra uma fonte externa: `derive-iau-orientation.js`, amostradores de VSOP/ELP, geradores de fixture. Migram porque **se errarem, o gate pega**. E migram por um motivo positivo, não só por permissão: reescrever um pipeline offline provado, cuja saída é conferível contra NAIF/Horizons, **adiciona o risco de mistranscrição que o script existe para eliminar** — um W₀ errado renderiza um planeta perfeitamente plausível, e nenhum olho humano pega isso.

**3. Código de runtime e de interface — RENASCE, POR PADRÃO.** Tudo que roda dentro do produto e desenha, ilumina, anima, escuta evento ou pinta pixel. Deste, atravessam: **o problema** (por que existe), **os requisitos** (o que tem de ser verdade no fim), **as constantes medidas** (ângulos, limiares, janelas), **as cicatrizes** (o bug que comprou aquela linha estranha) e **os testes** (como ponto de partida do oráculo). **A implementação é escrita de novo** por modelos atuais, com o código do atlas ao lado como referência — e, onde ele é ruim, como **anti-padrão nomeado**.

### 0.3 A exceção das duas provas

Uma linha de runtime só pode dizer **Migra** exibindo **duas** provas, e as duas têm de estar escritas na linha:

- **1ª prova — qualidade verificada com arquivos abertos.** Alguém abriu o arquivo, mediu (`wc -l`, `grep` de dependências, proporção de teste) e escreveu o que encontrou. Elogio genérico não conta; "446 + 173 linhas contra ~950 de teste, quase sem React" conta.
- **2ª prova — revisão de olhos frescos na hora da travessia.** Um modelo atual lê o arquivo **ao lado do destino**, na onda em que a travessia acontece, com pauta nomeada de antemão, e assina a ata. Esta prova é impossível de emitir com antecedência — ela acontece no merge.

Sem as duas, o veredito é **Renasce**, e a linha declara o que herdou. Uma linha pode ficar em "Migra **condicional**" com o gatilho de rebaixamento escrito: hoje há exatamente uma (Wikipedia, §2.3), e a pauta da sua 2ª prova está nomeada na própria linha.

### 0.4 O cuidado com a sobrecorreção

A doutrina tem um custo próprio, e ele é real. Reescrever por doutrina o que já é conferível por oráculo **troca um risco conhecido por um risco novo**. Por isso:

- A doutrina vale **sobretudo para runtime e UI**. Ela não é licença para reescrever pipeline offline provado.
- Onde o oráculo é implacável e a fonte é externa (NAIF, Horizons, HYG), **migrar é a escolha conservadora**, e reescrever é que precisaria de justificativa.
- Transcrever continua sendo o certo quando o artefato é minúsculo e carrega a razão junto: `hygMeshFadeRamp.ts`, 47 linhas puras, cujo clamp de `dt` a 0,1 s existe porque o delta bruto do primeiro frame após a aba voltar do background fazia o crossfade **saltar** em vez de animar. É mais barato copiar com o comentário do que redescobrir o bug.
- Seis linhas passaram pela nova doutrina **sem mudar** (§2.7). Registrar o que não muda é parte de não sobrecorrigir.

### 0.5 O que isso muda na prática

- A palavra **Migra** encolhe: de 24 linhas para 15. Nove linhas descem para Renasce, e o motivo está escrito em cada uma.
- Duas linhas **se dividem**, porque juntavam dado incontestável com runtime no mesmo rótulo — o que a regra "uma linha = um artefato" já proibia.
- Todo gate de onda que atravessa código ganha um passo: **revisão de olhos frescos por modelo atual antes do merge**.
- O gate final (Onda 9) ganha uma quarta pergunta por linha, ao lado das três que já existiam.

---

## 1. Visão

*Em uma frase: um produto só — o filme leva, o Atlas deixa ficar, e o mesmo motor que esculpe o Sol passa a esculpir qualquer estrela.*

O produto é uma coisa só — **Mar de Estrelas**: um mundo contínuo onde o filme de 5min21 leva o visitante do Sol a Sgr A*, e onde, perto de casa (janela `DISC_FADE0/1` de `src/three/world/novoSol.ts`), vive **o Atlas** — o sistema solar explorável, didático e cientificamente honesto, renascido como modo do mesmo Director, sem loading e sem segundo motor.

O pilar novo é **o motor estelar**. O NovoSol (14 módulos de `src/three/world/sol/`, 4.960 linhas: convecção GPU, ciclo de Hale/Spörer, flares, CME, coroa volumétrica) deixa de ser um singleton esculpido para o Sol e vira `stellarBody.ts` parametrizado por `{teffK, radiusPc, rotPeriodDays, activityLevel, convective}`. O Sol vira a instância nº 1, com gate pixel-igual. A revisão fechou a peça que faltava: o atlas tem um módulo puro de física estelar (`descriptorFromCatalog`) que roda com **exatamente os dois campos que o `sc1` da viagem já carrega** — `ci` e `logLum`. Temperatura (Ballesteros), classe MK, classe de luminosidade e raio (Stefan-Boltzmann) para as 328.749 estrelas por **zero byte de payload novo**. Este é o caso-modelo da doutrina: TS puro, sem uma única importação de render, julgado por sete estrelas cujo valor está publicado.

A revisão acrescentou dois fatos que mudam o desenho, e a Versão 2 corrige o primeiro deles:

- **A casa não tem lei de luz para superfície.** `grep` por `MeshStandard|MeshPhysical|PointLight|DirectionalLight` em todo o `src/` da viagem retorna zero — tudo é `ShaderMaterial` aditivo/emissivo. A fotometria da casa é lei de **fonte pontual**. O modo Atlas introduz a primeira superfície iluminada do projeto e herda inteiro **o problema** que o atlas enfrentou: 9.400:1 de faixa dinâmica entre Mercúrio e Netuno num display de ~25:1. **Correção da Versão 2: o problema migra, a solução não.** O que o atlas tem não é uma lei de luz — é um curativo por material colado sobre uma fundação quebrada (§0.1, §7). E o hospedeiro do curativo não existe aqui: sem `MeshStandardMaterial` e sem luz, não há `onBeforeCompile` onde pendurar o patch. A lei da Viagem nasce nova, com os requisitos, as constantes e os testes do atlas como espec e oráculo, e com o selo `?luz=real|assistida` como bloqueio de merge.
- **O visitante do voo livre é largado sem uma palavra**, com seis interações não descobríveis, e o tier de qualidade — que congela alocação para sempre — é decidido sem olhar a GPU e jogado fora a cada recarga. São lacunas de fundação, não de conteúdo.

Frase de identidade: *"a jornada te leva; o Atlas te deixa ficar."*

---

## 2. Matriz de rastreabilidade

*Em uma frase: cada peça do atlas tem uma linha, um veredito e um endereço; nenhuma linha cobre mais de um artefato; e nenhuma linha diz "Migra" sobre código de runtime sem exibir as duas provas.*

**Taxonomia.** **Melhora** = volta superior ao que era. **Migra** = porta quase verbatim (código, dado ou ideia) — para código de runtime, **só com as duas provas de §0.3**. **Renasce** = a função reaparece construída sobre infraestrutura da Viagem; sob a doutrina nova, leia-se **"reescrita com espec herdada"**: migram o problema, os requisitos, as constantes medidas, as cicatrizes e os testes; a implementação é nova. **Aposenta** = morre, com custo na seção 3. **Reabre** = candidato novo, custeado, sem onda atribuída — decisão do dono. **Veredito pendente** = o arquivo ainda não foi lido; hipótese não é sentença.

**Regra de auditoria (lição da 3ª rodada).** Uma linha = um artefato. Se o nome exige "e", vira duas linhas. Onze das dezesseis correções da revisão vieram de um rótulo que cobria duas coisas de qualidade oposta.

**Regra de travessia (lição da 5ª rodada).** Se o destino declarado da linha é um componente que **já existe na Viagem**, o código do atlas não atravessa — atravessa o requisito.

### 2.1 Motor solar e estrelas — 9 linhas

*Em uma frase: decide o que o Sol e as estrelas herdam do atlas — física calculada, uma lei de cor só, e as cicatrizes de quem já errou antes.*

| Item | Veredito | Destino |
|---|---|---|
| `novoSol.ts` + 14 módulos `sol/*` | Melhora | `stellarBody.ts` com `StellarParams`; Sol = instância com defaults literais (`DONOR_RADIUS=2.2`, `ROT_SPEED=0.042`, paleta H-alfa como override declarado) |
| Lei de cor `spectToColor` (7 baldes) | Melhora | Unificada em `bvToColor`/`blackbodyLinear` (`shaders/common.ts`, Planck×CIE, RMS 0,010 de 2.500 a 40.000 K). Sidecar regenerado com `ci`; tabela literal de B-V medido para as 16 heroes |
| Crossfade disco↔glare | Melhora | `lodStellar.ts` único, **parametrizado por janelas em pc por instância**: Sol `{0,16; 0,34}`, heroes `{0,14→0,30}` e `{0,30→0,42}`, verbatim. Unifica o mecanismo, preserva os valores — é o que torna o gate honesto. Conversão a múltiplos de raio: abandonada |
| `stellarMeshGate.ts` (ângulo sólido) | **Renasce (reescrita com espec herdada)** *(era Migra)* | A própria linha já dizia que **os limiares não se herdam**: o handoff da viagem é a ~0,069 rad (≈70× o ENTER do atlas) porque lá o sprite é PSF calibrada. Se nem os números nem o hospedeiro atravessam, o que atravessa é o **critério**: LOD por **ângulo sólido**, não por distância. Recalcular contra a PSF da casa, com o teto de `gl_PointSize` dentro da conta. Os testes do atlas viram ponto de partida do oráculo do `lodStellar.ts` |
| `stellarPhysics.ts` (`descriptorFromCatalog`, `radiusFromSpect`, `inferLuminosityClass`, `mvMSEstimate`) | Migra | ~400 das 1.183 linhas, TS puro, com os 1.194 de teste; vendorizado na Onda 2, consumido em 3 e 7. **Prova de que resiste à doutrina:** os três `import` do topo (`blackbodyRgbFromTemperature`, `planBWeight`, `SUN_DEFAULT_VISUAL_PROFILE`) só são consumidos entre as linhas 1.128 e 1.181, todas dentro de `stellarVisualProfileFrom`, **que fica de fora**; o subconjunto migrado não tem uma única importação. Oráculo: 7 verdades-terreno nomeadas (Sol G2V, Sirius A1V, Vega A0V, Proxima M5.5V, Betelgeuse M2Ia, Antares, Sirius B DA2). A **cor não vem junto** (usa `blackbodyLinear`); `stellarVisualProfile.ts` e `stellarSurfaceTransfer.ts` morrem inteiros |
| Dados HYG (classe, nomes, ids HD/HIP/Gliese) | Migra | Nomes e espectros ao sidecar das 1.726 nomeadas, que ganha `ids`. A cobertura das ~327k restantes deixa de ser "morre" e vira **condicionada** à seção de identidade do `sc1` e à Decisão 2. Dado puro |
| `ProceduralSun3D.tsx` + 5 shaders | Renasce | As 4 camadas de render morrem (perdem para `granulation/chromo/loops/prominences/cme/coronaVolume`), e a curva `b⁴·t³` brigaria com a lei de cor única. O que vive é a **parametrização**: `GRANULATION_BY_LUMINOSITY` e `artDirectionMultipliers` viram tabela classe→knobs dos 13 controles que `novoSol.ts` já expõe — **recalibrada contra `sol/*`: os valores do atlas são amplitudes dos materiais mortos, não dos knobs da casa** |
| `HygStellarMesh.tsx` + crossfade sprite↔malha | Renasce | O `.tsx` é cola de framework e morre. Herdam-se **4 cicatrizes compradas com bug real**: (1) banda morta — sprite morre ~17× antes da rampa começar; corrige-se com um 2º atributo de identidade (`aFocus`) com bypass do kill; (2) reafirmar a rampa todo quadro (trocar qualidade recria a geometria zerada); (3) resetar rampa e alvo na troca de foco; (4) histerese 2× + clamp de dt. Testes traduzidos (123+194 linhas). **Exceção de transcrição declarada:** `hygMeshFadeRamp.ts` (47 linhas puras) copia-se com o comentário junto — o clamp de `dt` a 0,1 s existe porque o primeiro frame após a aba voltar do background fazia o crossfade saltar |
| HYG 4 tiers binários (109.400) | Aposenta | Formato perde **nos eixos que importam ao produto**: 38 B/estrela contra 9 B, 109k contra 328k, Hipparcos contra Gaia DR3. **Herda-se uma ideia: se o `sc1` ganhar tiers por dispositivo, manter o invariante de prefixo estrito (mesmo índice em todos os tiers).** O único campo único (identidade) vira item novo, gerado das fontes que o build já baixa |

### 2.2 Astros do sistema solar — 21 linhas

*Em uma frase: os 45 corpos atravessam inteiros — nenhum planeta, lua, anel ou asteroide fica para trás, e vários voltam melhores do que eram; o que se separou aqui foi o dado do shader que o consome.*

| Item | Veredito | Destino |
|---|---|---|
| **`iauOrientation` — coeficientes de pólo + PM (kernel NAIF, 45 corpos)** | Migra *(split)* | Dado transcrito do `pck00011.tpc` da NAIF pela ferramenta `derive-iau-orientation.js`, que **também migra** (ferramenta offline julgada por oráculo, §0.2). Migram junto os tipos `IauOrientation`/`IauNutPrecTerm` — são o esquema do dado — e os 26 termos periódicos indexados posicionalmente na tabela de ângulos compartilhada. Oráculo: `HORIZONS_MODE=subpoint` + `subSolarPoint.test.ts` (522 linhas) |
| **`bodyOrientation.ts` — avaliador + adaptador Y-up→galáctico** | **Renasce (reescrita com espec herdada)** *(split)* | 331 linhas com `import * as THREE`, quatérnios e `computeSpinAngleRad`: runtime. O adaptador para o frame galáctico **não existe no doador** e é código novo de qualquer jeito. Reescrever é barato e o gate é implacável: mesmo sub-ponto solar contra Horizons. Destino: `world/planets/`; upgrade imediato do Sol |
| VSOP87D + Plutão Meeus + Lua ELP-MPP02 + 20 luas + fixtures Horizons **+ Hygiea osculante** | Migra | **Correção de fato:** no doador esses módulos **não são offline** — vivem em `src/lib/orbital/analytical/` como runtime, todos com `import * as THREE`. O plano já os converte em amostrador offline em `scripts/data/`, e é **essa conversão** que os torna Migra: a saída amostrada é julgada pelas fixtures Horizons e por `regression.test.ts` (584 linhas). O **consumidor de runtime** — interpolador da tabela, `KeplerProvider`, `engine.ts` com seu cache — **renasce**, e a Onda 2 cobra `getCacheStats`/`resetCacheStats` na travessia porque são o instrumento, não o motor. Hygiea sai do Kepler genérico e entra no pipeline osculante com `validityRange` |
| Planetas rochosos (texturas, Rayleigh+Mie, eclipse com umbra) | Melhora | Malha+textura; céu correto DA superfície de graça (PSF + extinção) |
| Gigantes gasosos (Júpiter 8k, Saturno) | Melhora | Textura canônica + advecção procedural dos jets — a Mancha é dado, não estética |
| Gigantes de gelo (Urano/Netuno) | Renasce | Shader de bandas+metano supera mapas quase lisos |
| Anel de Saturno (1,11/2,326 + sombra) | Melhora | Scattering frente/trás (atlas usava opacidade fixa 0,34) |
| Anéis de Urano/Netuno/Quaoar | Renasce | Procedurais, raios publicados, zero payload — passo 5 da Onda 6 |
| **21 texturas de luas + 15 pares de eclipse** | Migra *(split)* | Intactos; ladder única de texturas por tier. Dado puro |
| **`airlessRegolith` (fotometria de regolito)** | **Renasce (reescrita com espec herdada)** *(split)* | `regolithPhotometryPatch.ts` é GLSL injetado por `onBeforeCompile` sobre o material padrão do three — **o mesmo hospedeiro inexistente** que derruba o patch de irradiância (§2.3). E a linha dos asteroides já diz que eles "ganham Lommel-Seeliger, **impossível no caminho `model` do atlas**": o plano já resolveu reescrever a fotometria de superfície sem atmosfera, e esta linha só precisa parar de dizer que ela migra. Migram os **parâmetros ajustados por corpo** e a lição de que o realce de oposição do regolito não é opcional numa lua sem ar |
| 5 luas de Urano fora do eclipse | Melhora | Exceção **revertida**: entram no pipeline de `eclipsingBodyId` (Onda 6, passo 4) |
| Mosaicos Titan Cassini e Europa USGS | Melhora | **Candidatos** a tier cinema, condicionados ao veredito da bancada da Onda 6: o Titã oficial é monocromático e mostra emendas na esfera (o `2k_titan.jpg` é o incumbente a bater); Europa exige mascarar ou preencher as 68 linhas de no-data preto sobre a calota sul antes de entrar. Armadilhas medidas em `ASSETS.md` |
| Vanth/Weywot (Kepler estático) | Migra | Com janela de validade declarada indefinida na UI. Dado |
| Plutão + Ceres | Migra | Verbatim (Ceres mantém rótulo placeholder no manifest). Dado |
| Texturas fictícias Haumea/Makemake/Eris | Melhora | Procedural ancorado em albedo/cor medidos; −3 arquivos inventados |
| TNOs sem textura (Gonggong, Sedna, Salacia, Orcus) | Renasce | Mesmo shader honesto; `shapeScale` triaxial preservado |
| Asteroides (4 modelos 3D) | Melhora | Ganham Lommel-Seeliger, impossível no caminho `model` do atlas |
| Cinturões (principal e Kuiper) | Renasce | Instancing determinístico, densidade honesta, zero payload |
| Cometas (`type:"comet"` órfão) | Renasce | Núcleo + cauda dupla via transform feedback de `cme.js` |
| Sondas (`explorationMilestone`) | Migra | Conteúdo de `labels.ts`/painel na Onda 8; nenhum modelo 3D — declarado. Conteúdo editorial |
| `artistCalibration.ts` | Migra | Funde em `config.ts` com os comentários. Dado e conteúdo editorial; sem código de runtime |

### 2.3 Funcionalidades e infraestrutura — 38 linhas

*Em uma frase: o que o visitante faz com as mãos — navegar, buscar, entender, ajustar — e a fundação medida que segura isso por baixo; é aqui que a doutrina de travessia mais morde.*

| Item | Veredito | Destino / o que se perde se ninguém escrever |
|---|---|---|
| Clique em corpo → foco | Melhora | Hit-test no `LabelCanvas.ts` → `AtlasRig` |
| Home/Back (`focusHistory`) | Renasce | Pilha de ~10 linhas |
| Órbita/pan/zoom | Renasce | `FreeRoam` + órbita-com-foco; um escritor de câmera por frame |
| **`PrivilegedPosition`** | **Renasce (reescrita com espec herdada)** *(era Migra)* | O plano dizia "~40 linhas": o arquivo tem **406**, é uma `class` sobre `THREE` acoplada a `ViewportRect`, e mistura três coisas — geometria de enquadramento, direção de câmera e viés de moldura. Migra a **matemática, que é conferível**: `d = r/sin(θ/2)`, o `max(distVertical, distHorizontal)` que salva telas ultrawide (a FOV horizontal derivada de `aspect` é aritmética, não gosto) e a correção por retângulo utilizável do HUD. Migram como **valores medidos a reaproveitar, não a herdar**: `PHASE_OFFSET = 30°` (Rembrandt), `MAX_SOLAR_DEVIATION = 70°` (mais de meio disco iluminado, terminador em quadro — onde o relevo lê melhor), `PARENT_FRAMING_BIAS = 0,78`, `margin = 1,2`. A implementação é **função pura no `AtlasRig`**, com um escritor de câmera por frame; a classe estática do atlas não tem lugar num rig que já existe |
| `StellarFlightTransition` | Aposenta | Código morto no doador. Duas ideias do vizinho entram como ajuste local: **arriveDist com termo angular** (Onda 7a, quando existir raio estelar) e **visita instantânea sob reduced-motion** (Onda 5) |
| **Modo Superfície 1ª pessoa** | Aposenta | O atlas nunca entregou superfície: `minDistance = raio × 1,1` (339 km sobre Marte), três chamadas de rotação e zero translação; `surfaceLook.ts` é subconjunto estrito do `FreeRoam`. Custo ≈ 0 |
| **Captura de ponteiro (`useSurfaceModePointerLock`)** | Renasce *(split da linha acima)* | 222 linhas de hook React com `import.meta.hot.dispose` no doador; renasce como ~40 linhas opt-in no `FreeRoam` com as 4 defesas herdadas: backoff após 3 `pointerlockerror`, dispose no HMR, soltar teclas no unlock, listeners só com lock — Onda 5 |
| ContextLine | Renasce | `ProgressBar` ganha o nome do corpo focado. **A ideia é a melhor da UI do atlas e migra inteira: trocar branding decorativo por "onde estou" permanente, e nunca chutar** (foco desconhecido lê o nome do sistema, não um palpite). **O código não migra**: `ContextLine.tsx:43-44` cravou "Star"/"Solar System" e o `aria-label` em inglês num app que anuncia busca PT/EN — para um produto em pt-BR isso é reescrita, não port |
| Deep link | Melhora | `?atlas=terra&jd=…` no padrão `?pos=` |
| Busca de corpos (`SearchBar`, `bodySearch`) | Melhora | Paleta no `Hud.tsx`; índice estático de corpos + heróis + nomeadas com `ids`. **Ideias que atravessam da `SearchBar.tsx`**: busca unificada corpos + catálogo HYG num só campo, listbox acessível de verdade, `useDeferredValue` para não travar a digitação, e limites de resultado por dispositivo. **Implementação nova**, no vocabulário da legenda e em pt-BR |
| Quick Jumps | Renasce | Sugestões fixas da paleta vazia, lista curada de novo |
| `hygNameIndex` | Renasce | ~60 linhas sobre `meta.named`: `normalizeHygQuery` (NFD, essencial no teclado pt-BR), rubrica de score de 4 degraus, chave dupla abreviação/glifo grego. **Ficam de fora**: a varredura linear e as chaves HD/HIP em massa — medido: 206k chaves = 27-32 ms **por tecla** no desktop; 328k = 300-450 ms no celular. **A Decisão 2 libera o dado, não a busca**: cobrir as 328k exige trocar o algoritmo — consulta numérica (`hd 48915`, `hip 32349`) por `Map` direto sem varredura, e a textual por índice ordenado com busca binária de prefixo (ou trie). *Reescrita por física, não por doutrina* |
| Máquina do tempo (`Timeline`, LIVE) | Melhora | `jd`+`rate` no Director, ~8 degraus, `validityRange` com badge. **Anti-padrão evitado explicitamente:** o `Timeline.tsx` do atlas tem **44 degraus escritos à mão em inglês**, com escada sem lógica (3, 5, 6, 8, 10, 20, 30, 40, 50…). A casa usa **escala log contínua com rótulo formatado**, em pt-BR |
| Freeze de teste E2E | Renasce | `?shot=` já é determinístico |
| Escala Didático↔Realista | Melhora | Beat "escala real" animado, nunca toggle |
| **Política de irradiância solar** | **Renasce (reescrita com espec herdada)** *(era Migra; antes disso, Aposenta)* | O **problema** migra inteiro e é real: 9.400:1 entre Mercúrio e Netuno num display de ~25:1, e a Viagem estreia sua primeira superfície iluminada sem lei de luz nenhuma. Migram como **espec, constantes e oráculo**: a lei 1/r² com âncora `d₀ = 1 UA`; os clamps 0,05–1000 UA; a regra do **escalar único** ("senão nascem dois multiplicadores que brigam"); a regra **"a entrada é UA de efeméride, nunca coordenada de mundo"** (amostrar `getWorldPosition()` num espaço log-comprimido deixaria Netuno ~9× brilhante demais com número plausível); a sentença **"equalizado morre"** (destrói ordem e direção); a monotonicidade como critério operacional de honestidade; e os **316 + 117 de teste como semente do oráculo**. **Não migra o código:** `solarIrradiancePatch.ts` é `onBeforeCompile` sobre `MeshStandardMaterial` com `customProgramCacheKey`, e a Viagem não tem uma única `MeshStandard/Physical` nem luz — **o hospedeiro do patch não existe**. Achado de alto valor a herdar como lição, não como arquivo: `applyPlanetDirectLightCacheKey` existe porque o `customProgramCacheKey` default do three r181 é o **texto** do closure, e flags capturadas colidem. O expoente 0,35 entra como **chute inicial a recalibrar** contra ACES, nunca como valor herdado — ele foi calibrado para compensar um piso de ambiente 0,02 que a Viagem não tem. Bloqueio mantido: **não mergeia sem selo `?luz=real\|assistida`**. Anti-padrões do doador registrados em §7 |
| FidelityBadge + ×Earth + `visualProvenance` | Melhora | Proveniência como campo do manifest; badge e comparadores no painel. **É a melhor peça de UI do doador e a semântica migra inteira**: um selo agregando eixos de desvio, cada linha sendo o próprio controle que a muda, e a decisão explícita de **não** ter dois pills permanentes (cegueira de banner). **Duas correções obrigatórias na travessia:** (1) o selo tem de considerar **todos** os caminhos que alteram o resultado — no atlas, `FidelityBadge.tsx:71` pinta "fiel" com política "real" mesmo com o tone mapping desligado e o teto grampeando Mercúrio de 10,4 para 1,0; (2) o ciclo de três estados num clique só (`FidelityBadge.tsx:74`) precisa **indicar o próximo estado** — boa ideia, affordance pobre. Herda-se também a **procedência por asset** ("Measured Asset" vs "Procedural Visual"), que casa com a doutrina de honestidade da casa |
| Presets + score aditivo + 15 overrides | Aposenta | Score é palpite; a viagem tem sinal **medido** de fps com histerese e cooldown, que o atlas admite não ter. Bloom é dirigido pelo filme a 60 Hz; tom/exposição já existem em `?tone=`/`?exp=`. (15 = os 16 campos de `GraphicsOverrides` menos `starOptics`, que virou item próprio) |
| **Teto de GL medido** | **Renasce (reescrita com espec herdada)** *(era Migra como "`gpuProbe.ts`")* | **Correção de endereço: não existe `gpuProbe.ts` no doador.** São dois arquivos — `webglSupport.ts` (151 linhas, zero deps) e `resolveGlTierCeiling`, que mora em **`qualityProfile.ts:257`**, sobre uma taxonomia de tiers que não é a da Viagem. O **diagnóstico migra inteiro e é o mais urgente do plano**: hoje `defaultQualityForDevice()` não olha a GPU, SwiftShader vira "cinema", 4,02 M partículas, e a alocação congela para sempre. Migram como **espec as 4 defesas compradas com bug**: (1) memoizar o probe é correção, não micro-otimização — sem memo nasce um contexto WebGL por render e o teto de ~8–16 contextos do browser despeja o renderer de verdade; (2) tentar `webgl2` e depois `webgl` na **mesma** canvas; (3) `WEBGL_lose_context.loseContext()` + `canvas.remove()` no fim; (4) `catch`, porque alguns browsers **lançam** em vez de devolver `null` quando a GL está desabilitada por política. Regra herdada: **só rebaixa quando o renderer se nomeia software**. Aplicado como teto **antes do init** (Onda 1e) |
| Tone mapping / bloom por contexto | Renasce | `core/post.ts` cobre **durante o filme**; fora dele não há `g` — daí a gradação por contexto (abaixo) |
| **`visualPresets.ts`** | **Renasce (reescrita com espec herdada)** *(era Migra)* | 197 linhas, das quais o plano já condenava **7 dos 12 campos** como constantes globais fantasiadas de preset, com `shadowIntensity` inerte desde 2026-07-28. Sobram 18 linhas puras de `getPresetForContext` — abaixo do limiar em que "portar verbatim" significa alguma coisa: transcrever 18 linhas não é migração, e o rótulo protegeria um `interface VisualPreset` 58% morto. Migram os **5 eixos que variam de verdade** (bloom, saturação, contraste, brilho, guia) e os **limiares em UA (3,5/50)** como valores medidos; os de câmera (200/2000) são re-derivados na escala da Viagem. Onda 5 |
| **`assetStudyMatrix.ts`** | Migra (como prosa) | 8 dos 12 campos duplicam o `assetManifest`; o `comparison` morre. Vivem os **4 campos editoriais**, que são resultados negativos medidos: Titã oficial é monocromático e mostra emendas; Europa tem 68 linhas de no-data preto sobre a calota sul; o "candidato de Júpiter" era um mapa **de Io**. Vira `docs/reference/ASSETS.md`. Prosa, não código |
| Exposição manual / Camera FX / LoD | Aposenta | Camera FX e LoD são **duas linhas de comentário**; o slider nunca existiu e a viagem já tem um melhor. A malha de auto-adaptação **não estava neste pacote** — virou item novo |
| `qualityMode` legado | Aposenta | Único mantido com veredito **e** justificativa intactos |
| Debug Logging | Aposenta | Retificação: **não existe `?debug` na viagem**. As flags existentes configuram a cena, não medem. `gpu-profile.mjs` mede uma ordem de grandeza acima. Dependência: **preservar `getCacheStats`/`resetCacheStats`** ao migrar o motor orbital (cobrado no gate da Onda 2) |
| Atalhos de teclado | Renasce | `/`, `H`, `Esc` no Director; lista no `Ajustes.tsx` |
| **Persistência de preferências** | Renasce | A sentença antiga errou o alvo: não é gosto, é **alocação**. O motor mede fps por 2,5 s, emite veredito sobre o aparelho e joga fora a cada recarga. **O artefato do atlas não é um `preferencias.ts` de 60 linhas** — é `store.persistMigration.ts` (399 de teste) com migração de esquema Zustand v0→v1, `createDedupedStorage` e três chaves legadas, nada disso com sujeito na Viagem. Renasce como `src/lib/preferencias.ts` (~60 linhas): envelope `{v, tierQueRodou, conviteVisto, wikipediaLigada}`, leitura tolerante a lixo, nunca trava o boot. **Precedência explícita: URL > storage > detecção.** Tom/exposição/camadas **não** se persistem — quebrariam a honestidade dos gates |
| Tutorial 8 passos → mecanismo de spotlight | Renasce | `TutorialOverlay.tsx` (307) + `TutorialHighlight.tsx` (177) = **484 linhas de UI que morrem**: copy em inglês cravada, UI inexistente na casa, modal com scrim. Vive o **contrato do mecanismo** (~50 linhas): `data-spot` + `getBoundingClientRect` + máscara SVG, com **`ResizeObserver` no lugar do `setInterval` de 2 Hz** — que é justamente a correção que a doutrina prescreveria de qualquer jeito. Duas ideias herdadas do doador: **tour ancorado no alvo real** (não em coordenada fixa) e **reabrível a qualquer momento** pelo painel de ajustes. **Estética não atravessa**: tech-corners, ghost-border, `font-orbitron`, `uppercase tracking-[0.16em]` e `animate-pulse` no dot de status são HUD de ferramenta sci-fi; o Spotlight da Viagem nasce na linguagem da legenda |
| Modo apresentação | Renasce | O filme É o modo apresentação |
| **Wikipedia por estrela** | **Migra sob a exceção das duas provas — 2ª prova PENDENTE** *(era Migra incondicional)* | **1ª prova, cumprida (arquivos abertos e medidos):** `wikipediaClient.ts` 446 + `wikipediaCache.ts` 173 = 619 linhas contra ~950 de teste — proporção que nenhuma outra peça de runtime do doador tem; quase sem React; cache IndexedDB isolado em módulo próprio; abort, rate-limit, desambiguação, fallback de idioma, e o registro de que o `User-Agent` em `fetch()` é silenciosamente ignorado pelo browser. **2ª prova, PENDENTE até a Onda 8**, com pauta nomeada: (a) o esquema do IndexedDB e a expiração de 30 dias contra o que a Viagem tem hoje (nada); (b) a política de CORS/origem contra o GitHub Pages, que é outro host; (c) a promessa verificável do opt-out (desligado ⇒ **zero** requisições, cobrado na captura headless). **Se a 2ª prova falhar, a linha cai para Renasce**, com os ~950 de teste como oráculo. Em qualquer cenário o **painel renasce** no vocabulário da legenda; opt-out persistido |
| LayersPanel | Renasce | Flags `noco/noforge/noplanets` + toggles no `Ajustes.tsx`. Herda-se do doador a ideia do **rail de gavetas com ícone + rótulo** e dos **seletores centralizados** num só arquivo de config — não o `DisplayPanel.tsx` (665 linhas, ~18 controles), que é **painel de debug promovido a produto** e é justamente quem quebra a invariante do selo de honestidade |
| Seletor de idioma pt/en | Renasce | Toggle no `Ajustes.tsx` + `?lang=`, default por `navigator.language`. **Medido no doador: só 4 de 32 componentes de `src/components/ui/` usam `useTranslation`** — a internacionalização do atlas é uma promessa não cumprida, e a casa nasce em pt-BR com copy direta |
| **AssetStudyApp** | Renasce | A equivalência com `ab-identidade.mjs` era **falsa**: um produz md5 de identidade temporal, o outro compara N alternativas do mesmo corpo lado a lado com a proveniência ao lado. Foi essa bancada que pegou o Titã cinza e o "Júpiter" que era Io. As 594 linhas r3f não portam — e, além do acoplamento, elas são **ferramenta de dev morando dentro de `src/components/ui/` do produto**. Renasce como **página `.html` estática** em `scripts/visual/` |
| WebGL fallback card | **Renasce (reescrita com espec herdada)** *(era Migra)* | A própria linha já dizia que o destino é o `LoadingVeil`/`onRetry` **da Viagem** — ou seja, nada do componente React do atlas atravessa. Migra o **contrato**: detectar antes do init, mensagem acionável, botão de retry. Onda 1 |
| CreditsModal → **Créditos (dados de atribuição)** | Migra | Ler a linha pelo dado, não pelo modal: **o dado de licença migra, o componente React não**. Créditos no HUD + README — atribuição é dado |
| **`useDialogFocus` + reduced-motion + aria-live** | **Renasce (reescrita com espec herdada)** *(era Migra)* | `src/hooks/useDialogFocus.ts` é hook React amarrado à árvore de componentes do atlas; o HUD da Viagem é outra árvore. Migra o **contrato de a11y**, que é o que importa e é verificável: foco preso no diálogo, devolução do foco ao gatilho no fechamento, `Esc`, região `aria-live` para mudança de estado, e respeito a `prefers-reduced-motion`. A ideia estrutural — **um lugar só para foco preso e Escape** — atravessa. Smoke de foco/aria no `rodada.mjs` é o juiz |
| **UI Scale** | **Renasce (reescrita com espec herdada)** *(era Migra)* | O trabalho real nunca foram as ~12 linhas de slider — é a **auditoria dos 37 `px` que carregam texto** no `hud.css` (contra 73 `rem` e 51 `clamp/vw`). Migra a evidência da medição e o contrato `?ui=` + `font-size` no root. O componente é escrito no `Ajustes.tsx` da casa |
| Colorblind / High Contrast | Aposenta | Nunca houve implementação: 3 campos de store órfãos e um tipo. **Mas a dívida fica**: num produto onde a cor É o dado, isso não é filtro de UI — é decidir se o canal de cor carrega informação redundante. Nota de dívida no NORTE *(registrada na Onda 0)* |

### 2.4 Conteúdo — 10 linhas

*Em uma frase: o texto do produto — fichas dos corpos, a copy que já existe em português, os estudos e as lições — e o que não se copia porque o site publica sozinho.*

| Item | Veredito | Destino |
|---|---|---|
| `celestialBodies.ts` — 45 corpos × 6 campos editoriais | Melhora | `public/data/atlas/corpos.json` `{pt,en}`; tradução curada **e redação de Miranda** = trabalho editorial do dono, declarado |
| **`i18n/common.json`** | Migra | O `fidelityBadge` é a **tese do produto em copy, já em pt-BR**: "O que nesta vista é ajustado e o que é medido"; FORA DE ESCALA vs ESCALA REAL; BRILHO REAL vs ASSISTIDO. Mais o `estimatedNote`, que separa modelado de medido, **e as 6 chaves do sub-bloco `wikipedia`, que seguem a integração revertida (Onda 8)**. Copy direta no HUD; **i18next não entra**; `en/common.json` guardado em `docs/` como referência de tradução. Prosa, não código |
| **4 estudos de `public/Docs/` lidos e aprovados na Onda 0** — *Implementação Visual Espacial Didática*; *Otimização de Visualização em Simulador Solar*; *Tecnologia NASA Eyes: Câmera e Navegação*; *Visualização de Órbitas e UX Espacial* | Migra | `docs/reference/`, com fase consumidora e aviso POR documento: o 1º → Onda 4 + Decisão 3 (PSC, log-z, reversed-z, clamp de 2–5 px para billboard; AVISO: a seção "cheats visuais" recomenda o piso de luz ambiente que §7.1 condena). O 2º → Ondas 4–5 (declutter de rótulos/órbitas: corte por magnitude aparente, tesselagem adaptativa 16 seg/ε 2 px, LOD 50/5/2 px, clustering em grade 50×50 px com histerese +20% — problema que a casa ainda não resolveu em lugar nenhum; o pseudocódigo Unity/C# NÃO atravessa). O 3º → Ondas 5/4 (SLERP + dynamic parenting + damping ≈ espec da câmera com foco da Onda 5; atribuições "o Eyes faz X" são inferência de fórum, não fato). O 4º → Decisão 3 da Onda 6 (log-z E reversed-z com fórmula; a seção SPICE reabriria a decisão de dados já fechada — não seguir). **Achado comum: os seis são relatórios de deep-research por IA** (datas de acesso uniformes, fontes secundárias para números específicos, uma citação malcasada) — valem como mapa, nenhum número se cita sem reverificar. **FEITO na Onda 0**: copiados um a um com cabeçalho de veredito + avisos em `docs/reference/atlas-estudo-*.md` |
| **2 `.txt` de sessão em `public/Docs/`** | Aposenta | Documentam abordagens **rejeitadas**; o `rotationOffsetDegrees` sobrevive só como lápide num comentário |
| **2 estudos de `public/Docs/` lidos e reprovados na Onda 0** — *Otimização da Posição da Câmera em Visualização*; *Replicando Starfield NASA Eyes* | Aposenta | Custo declarado em §3, item 11: o da câmera está inteiramente superado pela linha `PrivilegedPosition` (§2.3), que julgou o CÓDIGO real com testes e valores medidos — o `.md` era a pesquisa de fundo, e o código é o oráculo mais forte; o do starfield recomenda o que a casa já superou (Hipparcos ~118k contra o Gaia DR3 328k em produção; SPICE/WASM contra o VSOP amostrado da Onda 2) e seu único gancho real (log-depth/floating origin) se repete nos 4 irmãos que migram |
| `APRESENTACAO.md` | Migra | `docs/reference/` |
| `README.md`/`HANDOFF.md` | Aposenta | O procedimento **não mora neles** — mora nos cabeçalhos dos scripts e no manifest. **Virou checklist na Onda 0 — com 18 itens, não os 13 previstos** (`docs/reference/ATLAS-CHECKLIST-PRE-FUSAO.md`) |
| `lessons.md` — triagem completa M1–M6, L37–L42 | Melhora | Cada lição vira regra com SHA ou linha histórica na jurisprudência. Nenhuma morre fora da ata. **FEITA na Onda 0 (2026-08-10):** 13 lições registradas na jurisprudência do NORTE — correção de fato: eram **13, não 10** (L37–L41 vivem aninhadas DENTRO de M1, e o id L41 está duplicado no doador: duas lições distintas com o mesmo número, registradas como L41-a/L41-b; L1–L32 só existem no git do atlas, dobradas nas M-regras). 12 viraram regra, 1 linha histórica (L41-a, precedente da própria doutrina) |
| ROADMAP + sweeps de oportunidade | Melhora | Seção "sonhos herdados" no NORTE. **FEITA na Onda 0**: 5 sonhos garimpados de ~4.300 linhas (caçador de fenômenos; céu profundo honesto; vizinhança estelar; Lua conferível; catálogo explorável por propriedade) + "pisar num rochoso" custeado; descartes registrados com motivo |
| Roteiros de tour | Renasce | Shots roteirizados do Director |

### 2.5 Itens novos descobertos pela revisão — 6 linhas

*Em uma frase: seis peças que ninguém tinha visto antes de abrir os arquivos; cinco entram no roadmap, uma fica esperando o dono decidir.*

| Item | Veredito | Destino |
|---|---|---|
| **Identidade por estrela no `sc1`** | Renasce | O `sc1` não tem id nenhum: a estrela é um índice num arquivo. Sem isso não há busca por catálogo, deep-link para estrela nem "volte àquela estrela". 6ª seção opcional em `build-star-catalog.mjs` (HD u32 + HIP u32 + índice Gliese u16 ≈ 10 B), gerada das fontes que ele **já baixa** — nunca do binário do atlas (regrediria a Hipparcos e cobriria 109k de 328k). Recorte decidido com a Decisão 2 (+3,3 MB crus se for tudo) |
| **Auto-exposição** | Renasce | A malha de adaptação do atlas está **viva**, não adiada: leitura do 1×1 de luminância a 4 Hz (`readRenderTargetPixels` é síncrono — "a diferença entre 60 e ~30 fps") e suavização independente de framerate. O código é acoplado ao `@react-three/postprocessing` e não porta; `eyeAdaptation.ts` (153 linhas puras) entra como **referência de cadência**, e seus testes (aproximação sem overshoot, inércia em frame parado) como oráculo. **Correção obrigatória herdada da crítica:** no atlas a adaptação **só escurece** (`CEILING = 1.0`, saída sempre em [0,165; 1]) e numa cena 99% preta fica travada na constante 1,0 — é por construção **incapaz** de resolver o único problema que importa, que é Netuno escuro e exige **+EV**. A da casa nasce **bidirecional, com histerese, medindo o corpo em foco** e não a média de um frame preto. A viagem hoje voa de 4 kpc a 3 UA com exposição fixa em 1,02 |
| **Amostrador de memória/alocação** | Renasce | A lacuna real dos gates 6–7, que o Debug Logging do atlas também não cobria: nada lê `renderer.info.memory` nem heap. A tese central do tier ("começar alto e cair deixa memória de cinema num celular para sempre") está num comentário e **nunca foi medida**. `window.__director.stats` a 1 Hz + harness em `scripts/visual/` |
| **`starOptics`** | **Melhora** *(era Migra — reclassificação de natureza, não de doutrina)* | **Correção de fato: não há artefato do atlas nesta linha.** O que existe é a cruz de 4 spikes cravada no `STAR_FRAG` **da Viagem**, sem nome e sem desligar — não se "migra" código que o doador não tem. Spike é **artefato de instrumento, não céu**. É trabalho novo na casa: 4 perfis rotuláveis com `spikeCount/sharpness/gain`, queda r⁻² dos spikes contra r⁻³ do halo, e interruptor. Onda 7a, julgada pelo painel e não pelo pixel-igual. Não é preset gráfico: é honestidade |
| **Camada calculada de fatos relacionais** | Renasce | Fatos derivados do catálogo, não buscados na rede: idade da luz que chega agora, como o Sol seria visto de lá (magnitude e constelação), distância em vidas humanas. Zero payload — sai de `ci` + `logLum` + posição. É o complemento offline da Wikipedia: ela conta a cultura, isto conta a relação |
| **"Pisar num rochoso"** | **Reabre** | Recusteado com honestidade: **céu e câmera são baratos** (a paralaxe Terra-Marte é nula, então o céu de Marte é literalmente o céu que o motor já desenha, com PSF, extinção e o Sol com disco angular certo já pagos); a câmera ancorada no raio com `up` = normal local são horas. **O custo inteiro é o terreno**: retalho de plano tangente com elevação MOLA (463 m/px, público) e sombreamento de regolito — uma onda, não um sprint. O atlas não contribui uma linha para ela |

### 2.6 Placar e conferência

*Em uma frase: a conta que o gate final vai cobrar — quantas linhas existem, quantas de cada veredito, e de onde veio cada linha nova.*

**84 linhas: 20 melhoram, 15 migram, 37 renascem, 11 aposentam, 1 reabre, 0 pendentes** *(placar pós-Onda 0; o da Versão 2 era 20/15/37/10/1/1 — movimento abaixo)*.

**Conferência da soma (recontada após a Onda 0):**

- **Linhas:** 82 do consolidado anterior + **2 splits** (`iauOrientation` coeficientes | avaliador `bodyOrientation`; 21 texturas de luas + eclipse | `airlessRegolith`) = **84**.
- **Por seção:** 9 (2.1) + 21 (2.2) + 38 (2.3) + 10 (2.4) + 6 (2.5) = **84**. ✓
- **Por veredito:** 20 + 15 + 37 + 11 + 1 + 0 = **84**. ✓
- **Por seção e veredito, conferido linha a linha:**

| Seção | Melhora | Migra | Renasce | Aposenta | Reabre | Pendente | Total |
|---|---|---|---|---|---|---|---|
| 2.1 | 3 | 2 | 3 | 1 | — | — | 9 |
| 2.2 | 7 | 7 | 7 | — | — | — | 21 |
| 2.3 | 6 | 3 | 22 | 7 | — | — | 38 |
| 2.4 | 3 | 3 | 1 | 3 | — | — | 10 |
| 2.5 | 1 | — | 4 | — | 1 | — | 6 |
| **Total** | **20** | **15** | **37** | **11** | **1** | **0** | **84** |

> **Movimento da Onda 0 (2026-08-10), com correção de fato.** Os 6 `.md` de
> `public/Docs/` foram abertos e sentenciados: **4 Migra, 2 Aposenta**. A leitura
> destapou um erro de inventário: as linhas antigas "6 estudos densos (Migra)" e
> "6 `.md` nunca lidos (pendente)" cobriam **os mesmos seis arquivos** —
> `public/Docs/` só contém 6 `.md` além dos 2 `.txt`, então a matriz contava o
> mesmo artefato duas vezes, uma por hipótese ("estudos densos" era sentença por
> rótulo, sem arquivo aberto) e outra por pendência. As duas linhas fundiram-se
> nas duas novas de §2.4 (4 Migra + 2 Aposenta); o total segue 84 por coincidência
> aritmética (−2 linhas +2 linhas), o Pendente zerou e Aposenta foi a 11. A
> "hipótese da mesma safra dos `.txt`" morreu no detalhe: os 6 `.md` não são logs
> de sessão — são relatórios de deep-research por IA, e 4 deles carregam insumo
> real para as Ondas 4–6.

**Trilha do movimento.** Migra 24 − **9 demissões** (irradiância, `PrivilegedPosition`, `stellarMeshGate`, teto de GL, `visualPresets`, UI Scale, WebGL fallback card, `useDialogFocus`, `starOptics`) = **15**. Das 9 demissões, **8 vão para Renasce** e **1 (`starOptics`) vai para Melhora**, porque não é demissão de doutrina e sim correção de natureza — não existe artefato do atlas naquela linha. Logo: Renasce 27 + 8 + **2 metades de split** = **37**; Melhora 19 + 1 = **20**. Aposenta, Reabre e Pendente não se movem.

> **Correção aritmética registrada.** O documento de reclassificação que originou esta versão publicou "19 melhoram, 38 renascem", justificando que "`starOptics` ocupa o lugar contábil que perdeu em Migra". A conferência linha a linha derruba isso: `starOptics` já estava contado dentro dos 24 de Migra, então movê-lo para Melhora **soma 1 em Melhora e nada em Renasce**. As duas versões somam 84, mas só uma bate na contagem por seção. Vale o número medido, não o número citado — que é a mesma regra que o resto do documento aplica aos assets.

**Movimento desta rodada:** 9 linhas saem de Migra (8 para Renasce, 1 para Melhora), 2 linhas se dividem em dado + runtime, 1 linha (Wikipedia) fica em **Migra condicional** com gatilho de rebaixamento escrito, e **3 correções de fato** entram no documento: não existe `gpuProbe.ts` (é `webglSupport.ts` + `qualityProfile.ts:257`), os módulos VSOP/ELP do doador são **runtime** e não offline, e `starOptics` não tem artefato no atlas.

*Nota de leitura:* o "11" que aparece na regra de auditoria (§2) e no risco de processo (§6) é outro número — são as correções por rótulo da 3ª revisão (11 de 16), não o movimento do placar.

### 2.7 Linhas que a doutrina nova poderia derrubar e não derruba

*Em uma frase: seis linhas foram reexaminadas sob a régua nova e passaram sem retoque — registrar isso é parte de não sobrecorrigir.*

| § | Item | Veredito | Por que sobrevive |
|---|---|---|---|
| 2.1 | Cicatrizes do crossfade (`HygStellarMesh`) | Renasce | Já correto. O único fragmento com valor de transcrição é `hygMeshFadeRamp.ts`, 47 linhas puras, com a razão do clamp escrita no comentário |
| 2.3 | Persistência de preferências | Renasce | Já correto: o artefato do doador é `store.persistMigration.ts` com migração Zustand v0→v1 e três chaves legadas, nada com sujeito aqui. A precedência **URL > storage > detecção** é a espec que migra |
| 2.3 | Tutorial → mecanismo de spotlight | Renasce | Já correto: 484 linhas de UI condenadas; sobrevive o contrato `data-spot` + `getBoundingClientRect` + máscara SVG, com `ResizeObserver` no lugar do `setInterval` — a correção que a doutrina prescreveria de qualquer jeito |
| 2.3 | Captura de ponteiro | Renasce | Já correto: 222 linhas de hook React com `import.meta.hot.dispose`; as 4 defesas são a espec |
| 2.3 | `hygNameIndex` | Renasce | Já correto, e por física, não por doutrina: 206k chaves = 27–32 ms **por tecla**; cobrir 328k **exige** trocar o algoritmo |
| 2.3 | Créditos (dados de atribuição) | Migra | Já correto depois de ler a linha pelo dado: licença é dado, o modal React não atravessa |

---

## 3. Os aposentados de verdade — 11

*Em uma frase: sobraram onze mortes, e nenhuma delas o visitante da Viagem sente.*

1. **HYG 4 tiers binários** — custo zero: 38 B/estrela contra 9 B, 109k contra 328k, Hipparcos contra Gaia DR3. `spectIdx` é dispensável porque `ci`+`logLum` derivam classe, temperatura e raio. Movimento próprio é irrelevante num filme de 230 Myr e **só serviria a um relógio de séculos na máquina do tempo do Atlas — custo aceito e dito**.
2. **`StellarFlightTransition`** — custo zero, com prova dupla: é código morto no próprio doador (zero call site fora do barrel) e cada mecânica dele o `cameraRig` já tem melhor. As duas críticas registradas no atlas **não transferem** — nascem da régua deles (1 UA = 1000 wu), e "consertar" o rig da viagem com elas seria o erro.
3. **Presets + score aditivo + 15 overrides** — custo zero para o visitante da Viagem, que nunca teve esses knobs; o que morre é a expectativa de quem usava o atlas, e o sinal **medido** de fps substitui o palpite do score. O bloom é dirigido pelo filme a 60 Hz — um slider brigaria com o diretor. *(A crítica de olhos frescos reforça: o `DisplayPanel` que expunha esses knobs é painel de debug promovido a produto, e é ele que quebra a invariante do selo de honestidade.)*
4. **Exposição manual / Camera Effects / LoD** — custo zero: aposentam-se duas linhas de comentário e um slider que a viagem já tem ligado ao vivo.
5. **`qualityMode` legado** — custo zero: leitura no-op documentada, setter sem chamador, e a migração v0→v1 nasce sem sujeito no produto fundido.
6. **Debug Logging** — custo: ~47 linhas sem teste que ligam dois `console.info` a 1 Hz. A justificativa antiga era falsa; a conclusão sobrevive por evidência melhor.
7. **Colorblind / High Contrast** — custo: 3 campos órfãos. Morre o placeholder, **não a dívida**.
8. **Modo Superfície 1ª pessoa** — custo ≈ 0, porque o modo nunca entregou o que o nome promete: o chão era inalcançável por construção (`minDistance = raio × 1,1`, 339 km sobre Marte), e o modo faz três chamadas de rotação e nenhuma translação. O que valia — a captura de ponteiro — renasce como linha própria.
9. **Os 2 `.txt` de sessão de `public/Docs/`** — custo zero no produto: documentam abordagens **rejeitadas** (o `rotationOffsetDegrees` sobrevive só como lápide num comentário). Ação positiva associada: não copiar o diretório em bloco, porque o site publica a cada commit. *(Os 6 `.md` do mesmo diretório foram lidos na Onda 0: 4 migram; os 2 reprovados são o item 11.)*
10. **`README`/`HANDOFF`** — custo zero **depois** do checklist de 13 itens: `HORIZONS_MODE=subpoint` como único oráculo de orientação, o risco de mistranscrição do kernel NAIF (um W₀ errado renderiza um planeta perfeitamente plausível), `bake:earth-pbr` pela Wayback Machine, a allowlist de WebP que desperdiçou 53 MB, e `download-textures.js` órfão que abre o write stream antes de checar o HTTP. **Checklist FEITO na Onda 0 — com 18 itens, não 13** (`docs/reference/ATLAS-CHECKLIST-PRE-FUSAO.md`); os cinco acima estão todos lá, com `arquivo:linha`.
11. **Os 2 estudos de `public/Docs/` reprovados na leitura da Onda 0** — *Otimização da Posição da Câmera em Visualização* e *Replicando Starfield NASA Eyes*. Custo ≈ zero, dito na cara: do primeiro, cada número reaproveitável (d = r/sin(θ/2), margem 1,2, fase 30°, teto solar 70°, viés 0,78, blend de up-vector, oclusão por raycast) já está — com mais fidelidade — na linha `PrivilegedPosition` (§2.3), que julgou o CÓDIGO real, testado e comentado; o `.md` era a pesquisa de fundo, e o código é o oráculo mais forte. Do segundo, as recomendações centrais REGREDIRIAM a casa (catálogo Hipparcos ~118k contra o Gaia DR3 328k já em produção com gates; SPICE via WASM contra o VSOP amostrado da Onda 2), e o único gancho real (log-depth/floating origin) se repete nos quatro irmãos que migram. Perdem-se fórmulas de manual (Ballesteros, Pogson) que estão a uma busca de distância.

**Nenhuma das onze tem custo sentível pelo visitante.** As três perdas que o plano anterior chorava se dissolveram: Superfície morre sem dor porque nunca existiu; Wikipedia migra (sob condição declarada); a busca por catálogo renasce para as nomeadas e o resto vira decisão de payload e de algoritmo, não perda.

Ficam **duas pendências abertas e nomeadas**: o alcance da busca além das 1.726 (Decisão 2 + troca de algoritmo) e a redundância do canal de cor (NORTE). *A terceira — o veredito dos 6 `.md` — fechou na Onda 0: 4 migram, 2 aposentam.*

**Nota da Versão 2:** a doutrina de travessia **não criou nenhuma aposentadoria nova**. Ela move linhas de Migra para Renasce, o que preserva a função e troca a origem do código — nenhum item perdeu destino, e o placar de mortes seguia em dez. **Nota da Onda 0:** a leitura dos 6 `.md` criou a 11ª morte (item 11) e zerou o Pendente do placar.

---

## 4. Roadmap em ondas

*Em uma frase: cada onda é útil sozinha, termina em gate, e toda onda que atravessa código do atlas ganhou o mesmo passo final — olhos frescos antes do merge.*

**Passo de gate comum a todas as ondas que atravessam código (1, 2, 3, 5, 6, 7, 8 e 9).** Antes do merge, **revisão de olhos frescos por modelo atual**: o revisor abre o artefato do doador ao lado do destino, confere se o que atravessou foi dado/oráculo ou implementação de runtime, e assina ata dizendo qual. Para linhas em "Migra sob a exceção das duas provas", esta revisão **é** a 2ª prova, e o gate registra o resultado — inclusive o rebaixamento para Renasce, se for o caso. Ata sem arquivo aberto não conta.

**Onda 0 — Registro.** Decisão "O Atlas vive aqui" + pilar motor estelar no NORTE; **doutrina de travessia (§0) registrada como decisão de projeto, com o testemunho do dono citado**; triagem completa do `lessons.md`; sonhos herdados — **incluindo "pisar num rochoso" com o custeio da revisão: céu e câmera baratos (paralaxe Terra–Marte nula, PSF, extinção e disco solar já pagos), terreno com elevação MOLA (463 m/px) é uma onda inteira**; estudos em `docs/reference/`. **Novo:** checklist de pré-fusão de 13 itens; **os anti-padrões registrados (§7) copiados para `docs/reference/` como leitura obrigatória de quem for escrever a lei de luz**; nota de dívida "redundância do canal de cor"; regra de auditoria (uma linha = um artefato; certo-pelo-motivo-errado é falha; arquivo não lido não recebe veredito; **se o destino já existe na casa, atravessa o requisito e não o código**); **não copiar `public/Docs/` nem `public/textures/` em bloco**; arrumação das 11 entradas de licença no manifest — o dono já confirmou que **todas as imagens são livres**, então isto é anotação, não bloqueio; preservar as atribuições dos regimes que as pedem (CC BY, CC BY-SA do HYG). *Gate:* dez lições contabilizadas; **os 6 `.md` de `public/Docs/` abertos e sentenciados** — sem isso o inventário não está completo.

> **Estado da Onda 0 (2026-08-10): FEITA, com gate cumprido e três correções de
> fato.** O registro: (1) decisão "O Atlas vive aqui" + doutrina de travessia
> (com o testemunho do dono) + pilar do motor estelar no NORTE, inclusive como
> linha na tabela de Decisões fechadas; (2) triagem completa do `lessons.md` na
> jurisprudência do NORTE — **correção de fato nº 1: são 13 lições, não as dez
> do gate** (L37–L41 aninhadas dentro de M1; id L41 duplicado no doador), todas
> contabilizadas, 12 regras + 1 linha histórica; (3) os 6 `.md` abertos e
> sentenciados — **4 Migra, 2 Aposenta**, derrubando a contagem dupla registrada
> em §2.6; os 4 aprovados copiados um a um (nunca a pasta em bloco) para
> `docs/reference/atlas-estudo-*.md`, cada qual com cabeçalho de veredito +
> avisos; (4) anti-padrões de §7 extraídos verbatim em
> `docs/reference/ATLAS-ANTIPADROES.md`; (5) sonhos herdados no NORTE — 5
> garimpados de ~4.300 linhas de sweeps/hunts, mais "pisar num rochoso"
> custeado; o descarte está registrado (bugs/infra do doador morrem com ele;
> ~15 ideias eram instâncias da camada de fatos relacionais já coberta); (6)
> nota de dívida "redundância do canal de cor" no NORTE; (7) checklist de
> pré-fusão em `docs/reference/ATLAS-CHECKLIST-PRE-FUSAO.md` — **correção de
> fato nº 2: são 18 itens, não ~13** (as armadilhas vinham acopladas em trios
> nos mesmos scripts; os 5 itens nomeados pelo plano estão todos lá), 13 para a
> Onda 2, 4 para a Onda 6, 1 de doutrina; (8) licenças anotadas em
> `docs/reference/ATLAS-LICENCAS.md` — **o "11" do plano CONFERE por grep**
> (`license: "not documented in repo"` aparece exatamente 11×; no sentido amplo
> são 14), com as atribuições a preservar listadas (DAMIT/ESO/SSS CC BY, USGS
> cite-os-autores, e o HYG CC BY-SA que NÃO mora no manifest e vale para a casa
> já hoje). Ressalva honesta do checklist: o `textureVariantManifest.ts` do
> doador não foi pente-fineado — a bancada da Onda 6 deve abri-lo.

**Onda 1 — Fundação de perf, consistência interna e HUD invisível.** (a) sidecar regenerado com `ci` e `ids`; (b) F0: `bvToColor(ci)` com tabela literal de B-V das heroes; (c) ~~badge de honestidade + 3 tiers de label~~ — **ADIADO para a Onda 5 por decisão do dono (2026-08-10)**: o item estava subespecificado (nenhuma seção do plano diz o que o selo afirmaria ANTES de existir o modo Atlas, nem o que seria o 3º tier de rótulo — e nem o gate desta onda o cobrava), e selo sem eixo para reportar é exatamente a "diluição do wow" que §6 teme; (d) **fallback de WebGL reescrito** sobre o `LoadingVeil`/`onRetry` da casa, herdando só o contrato (detectar antes do init, mensagem acionável, retry); **(e) teto de GL aplicado ANTES do init** — reescrito com as 4 defesas herdadas por extenso (memoizar o probe; `webgl2` e depois `webgl` na mesma canvas; `loseContext()` + `canvas.remove()`; `catch` para browsers que lançam), e a regra "só rebaixa quando o renderer se nomeia software"; é onde a alocação congela; **(f) `preferencias.ts`, lido no construtor do engine** junto do `?q=` (aqui e não na Onda 5 porque o tier tem de valer antes do bake); **(g) seção de identidade no `sc1`** — *default declarado: sem a Decisão 2, a Onda 1 emite identidade só para as 1.726 nomeadas (~17 KB), e o recorte das 328k (+3,3 MB crus) espera a decisão sem segurar a onda*. *Gate:* `sky-capture.mjs` — só heroes e Sol-distante mudam; diff do sidecar auditado; **num contexto SwiftShader forçado o tier nasce performance**; **num contexto sem GL o card aparece e o retry funciona**; **a seção de identidade valida contra a fonte — HD/HIP/Gliese conferidos por amostra contra o HYG v4.4, e o tamanho do `sc1` medido pelo build antes e depois**; a URL continua sendo a fonte de verdade e a captura headless enxerga o mesmo que a tela; **revisão de olhos frescos antes do merge**.

> **Estado da Onda 1 (2026-08-10): FEITA** — (c) adiado para a Onda 5 por
> decisão do dono (acima); os outros seis itens entregues na branch `onda-1`
> e mergeados com o gate integral cumprido:
> **Gate de ambiente:** SwiftShader forçado → o app nasce `performance`
> (headless CDP, sonda detectou o renderer software antes da alocação);
> sem GL → o véu mostra "A VIAGEM NÃO PÔDE COMEÇAR" com mensagem acionável,
> `role="alert"` e retry.
> **Gate de dados:** `stars.bin` BIT-IDÊNTICO em três regenerações
> (md5 b6d21b82…, 2.958.741 bytes); 1.726 nomeadas com nomes/ordem/campos
> velhos intactos; sidecar 287.782 → 394.139 bytes (o "~17 KB" do plano era
> estimativa de seção binária; em JSON custa mais — pago e dito); ci em
> 1.726/1.726; ids validados por amostra contra o HYG v4.4 (Sirius
> HD 48915/HIP 32349 virou âncora de regressão no `verify-assets`).
> **Correção de fato na travessia dos ids:** AT-HYG e HYG v4.4 DIVERGEM —
> 28 HDs errados no AT-HYG (dava a Antares o HD da componente B) e Gliese
> sem prefixo canônico; o HYG v4.4 virou a autoridade ÚNICA (após a revisão,
> sem nem fallback: hd 1.671 · hip 1.679 · gl 310 — estrela sem par fica com
> o campo ausente, honesto).
> **Gate de imagem:** ab-identidade com o "antes" REPRODUZINDO a baseline
> oficial duas vezes (sol 950f… e travessia 3a67… exatos); 4 das 7 vistas
> bit-idênticas (interno/mergulho/edgeon/faceon); as 3 que diferem
> (sol/travessia/retrato) passaram pelo diff de pixel: **delta máximo de
> 1 nível** (99 e 2.264 px) — assinatura de ULP, não de conteúdo; a mudança
> de cor só é VISÍVEL nos close-ups de hero, que as vistas do gate não
> exercitam. `skyError` 0,7782 com os cinco termos idênticos a quatro casas
> ao registro oficial (protocolo exclui Sol e heroes por construção). A lei
> nova está VIVA, provada por uniform ao vivo: Sirius [0,884, 0,995, 1,432]
> = bvToColor(0,00) exato; SunStar [1,117, 0,974, 0,922] = bvToColor(0,653)
> — T_eff 5.771 K, o Sol real.
> **Revisão de olhos frescos (dois revisores independentes): ata ASSINADA**
> — nos cinco itens o que atravessou foi espec, constante medida, cicatriz
> ou dado de fonte primária; zero cópia de implementação de runtime do
> doador. A caça adversarial achou 1 bug bloqueante (o React não era
> semeado com o tier inicial — painel mentia quando o tier vinha do
> storage/teto; verificado ao vivo) e 4 achados menores — TODOS corrigidos
> no mesmo dia e re-verificados (painel agora acompanha o engine, Director
> devolve o Engine se a construção falhar no meio, ids sem fallback,
> maxTex blindado na sonda).
> **Notas para ondas futuras:** `maxTextureSize` é medido e guardado pela
> sonda mas ainda sem consumidor (a metade do teto do doador que promove
> texturas espera a Onda 6); `conviteVisto`/`wikipediaLigada` são campos
> reservados no envelope de preferências (Ondas 5 e 8). Bônus fora do
> escopo do doador: consertado um bug pré-existente da casa — a nebulosa
> nascia com `setScale` 0,5 em tier `performance` (0,35 só chegava na
> primeira troca de tier).

**Onda 2 — Dados antes de pixels.** Vendorizar `derive-iau-orientation.js` (**ferramenta offline, migra**), coeficientes IAU dos 45 corpos + tipos + 26 termos periódicos (**dado, migra**), fixtures Horizons, VSOP amostrado (**a conversão runtime→offline é o que autoriza o Migra**), **`stellarPhysics.ts` com seus 1.194 de teste**, elementos osculantes da Hygiea; **escrever novo** o avaliador `bodyOrientation` + adaptador Y-up→galáctico e o consumidor de runtime das efemérides (interpolador, provider, cache); gerar `corpos.json`; fundir `artistCalibration.ts`. *Gate:* erro vs. Horizons sob limiar; **sub-ponto solar do avaliador novo idêntico ao do doador contra Horizons**; matriz eclíptica→galáctica validada contra Sgr A* **e** polo eclíptico; **`getCacheStats`/`resetCacheStats` preservadas na travessia do motor orbital**; Miranda aparece como pendência nomeada; zero mudança visual; **revisão de olhos frescos antes do merge**.

**Onda 3 — Motor estelar F1–F2.** `stellarBody.ts` (Sol = instância 1); `lodStellar.ts` com janelas em pc por instância; **as 4 cicatrizes do crossfade** e os dois atributos por estrela (`aFade` + `aFocus`, 1,3 MB cada); **critério de LOD por ângulo sólido reescrito**, com limiares **recalculados** contra a PSF da casa e o teto de `gl_PointSize` no cálculo; `hygMeshFadeRamp.ts` transcrito com o comentário do clamp de `dt`. *Gate:* Sol pixel-igual em 4 condições e heroes em 3 distâncias; **nenhuma faixa de distância em que nada renderiza**; trocar de qualidade não faz o sprite reaparecer sob o disco; **revisão de olhos frescos antes do merge**.

**Onda 4 — Domínio de escala aninhado + céu com planetas.** Frame local em UA no crossfade `DISC_FADE`; planetas como sprites, época fixa, fades acoplados. *Gate:* posição projetada vs. efeméride; `rodada.mjs` inalterada de longe. *(Onda de trabalho novo na casa; não atravessa código do doador.)*

**Onda 5 — Modo Atlas navegável.** **Herdado da Onda 1 por decisão do dono (2026-08-10): badge de honestidade + 3 tiers de label** — especificar AQUI, quando a UI do Atlas existir e o selo tiver eixos de verdade para reportar (escala, luz), no vocabulário da legenda; `Phase 'atlas'`, `AtlasRig`, portal do pause-look, saída "Partir", **busca renascida** (~60 linhas sobre `meta.named`), tempo, deep-link, contrato de a11y (foco preso, devolução ao gatilho, `Esc`, `aria-live`, reduced-motion) escrito na árvore do HUD da casa; **`Spotlight.tsx` + convite de 3 passos** no vocabulário da legenda (arrastar para olhar · WASD/QE para voar · clicar numa estrela para visitar), disparado só na primeira entrada, lendo `conviteVisto`; **captura de ponteiro opt-in** no FreeRoam; **UI Scale (`?ui=`)** depois da auditoria dos 37 `px` que carregam texto; **enquadramento privilegiado como função pura no `AtlasRig`** (`d = r/sin(θ/2)`, `max(distVertical, distHorizontal)`, retângulo utilizável do HUD) reaproveitando os quatro ângulos medidos (30°, 70°, 0,78, 1,2); **gradação por contexto**: os 5 eixos que variam (bloom, saturação, contraste, brilho, guia), limiares em UA (3,5/50) herdados e os de câmera (200/2000) re-derivados na escala da viagem; **visita instantânea sob `prefers-reduced-motion` no `cameraRig`**.

> **Regra de UI desta onda (nova):** *a UI é desenhada na linguagem da casa; as ideias vêm do atlas, a implementação é nova.* Atravessam as **semânticas** que a crítica aprovou — um selo que agrega desvios e cujas linhas são os próprios controles; uma linha de contexto permanente que nunca chuta; uma gaveta com ícone + rótulo e seletores centralizados; procedência por asset; tour ancorado no alvo e reabrível; um lugar só para foco preso e Escape. **Não atravessam** a estética de HUD sci-fi (tech-corners, ghost-border, `font-orbitron`, `uppercase tracking-[0.16em]`, `animate-pulse`), o painel de 18 controles de debug, os 44 degraus de tempo escritos à mão nem a copy em inglês cravada em componente.

*Gate:* smoke de ida-e-volta do Atlas em navegador real; `journeyT` retoma exato; convite não reaparece em recarga; foco/aria no `rodada.mjs`; **nenhuma string de UI em inglês no caminho pt-BR**; **revisão de olhos frescos antes do merge**.

**Onda 6 — Corpos resolvidos.** (1) Terra+Lua com eclipse; (2) demais rochosos; (3) gigantes + anel de Saturno; (4) luas em lote + **as 5 luas de Urano no pipeline de eclipse** + **mosaicos Titan/Europa julgados na bancada, que entram só se ganharem do incumbente** (`2k_titan.jpg` para Titã; Europa só com as 68 linhas de no-data tratadas); (5) anões/TNOs + **anéis de Urano, Netuno e Quaoar**; (6) asteroides com Lommel-Seeliger + **fotometria de regolito escrita nova**, com os parâmetros por corpo herdados.

**Novo — a primeira lei de luz da casa.** Escrita do zero sobre a espec herdada (§2.3), com **um escalar único**, entrada em **UA de efeméride** e clamps 0,05–1000 UA; **selo `?luz=real|assistida`** com a copy do `fidelityBadge` em pt-BR — **bloqueio explícito: não mergeia sem o selo**, porque é claim de conteúdo, não de display. O expoente entra como chute a **recalibrar contra ACES**, e o desenho de referência é o de §7.4: ancorar fisicamente (E = 1361/d²), derivar **um EV de cena por frame**, aplicar como ganho linear único antes do ACES que a casa já tem, e expressar a assistência como **deslocamento de EV explícito e limitado**, exibível em stops. Também nesta onda: **bancada de assets** como `.html` estático; **`ASSETS.md`** com os resultados negativos medidos; **amostrador de memória**; scripts de textura com o bug do write-stream corrigido. Reabertura do log-depth (Decisão 3).

*Gate por passo:* captura no ladder por tier; `gpu-profile.mjs`; **`renderer.info.memory` estável em entra/sai do Atlas e em troca de qualidade**; z-fighting calibrado; **os 12 oráculos de irradiância verdes** (quarteia a cada dobro de distância, clampa em d=0, neutro e não NaN em não-finito, recusa distância de render, preserva a ordenação verdadeira de brilho, ponto fixo na âncora, identidade bit a bit em "real", distância vem da efeméride e não do semi-eixo maior); **o selo não pode ser desmentido por nenhum controle a jusante** — teste explícito, porque é exatamente o defeito do doador; **revisão de olhos frescos antes do merge**.

**Onda 7 — Motor estelar F3–F5 + encontros.** **7a (incondicional):** Teff/raio das 16 heroes; pilotos Sirius e Betelgeuse; leis de escala por classe; `radiusFromSpect` sobre o catálogo inteiro; **termo angular no `arriveDist` (raio/tan θ), agora que existe raio estelar** — hoje a câmera pousaria igual em Betelgeuse e em Proxima; **`starOptics` rotulável com interruptor** — entra aqui, e não antes, porque muda todo o campo estelar e o juiz é o painel, não o pixel-igual. **7b (condicional à Decisão 1):** encontros como beats do filme; **default declarado: sem a decisão, 7b não entra** e os encontros ficam no voo livre e no Atlas. *Gate (só 7a):* tríptico anã M/Sol/supergigante aprovado; foco-próximo em 20 estrelas sorteadas sem regressão de FPS nem payload; **revisão de olhos frescos antes do merge**.

**Onda 8 — Didática, conteúdo e populações.** Painel por corpo lendo `corpos.json`; **camada calculada de fatos relacionais** — *cuja lista de candidatos inclui, vindo dos sonhos herdados do NORTE, "a Lua conferível hoje à noite" (fase + fração iluminada no instante simulado): não é sonho, é instância barata desta camada*; **Wikipedia no painel** (com as 6 chaves de copy do `i18n/common.json`), com opt-out persistido cuja promessa é verificável (desligado ⇒ zero requisições); seletor de idioma + `?lang=`; sondas; créditos; tours; cinturões e cometas; beat "escala real"; **auto-exposição julgada por conta própria**, nascendo **bidirecional com histerese e medindo o corpo em foco** (a viagem voa de 4 kpc a 3 UA com exposição fixa).

> **2ª prova da Wikipedia acontece aqui.** Pauta nomeada, decidida antes de abrir o editor: (a) esquema do IndexedDB e expiração de 30 dias contra o que a Viagem tem hoje (nada); (b) política de CORS/origem contra o GitHub Pages, que é outro host; (c) promessa verificável do opt-out. **Se a revisão não assinar as três, a linha cai para Renasce** e os ~950 de teste viram o oráculo da versão nova. O painel renasce em qualquer cenário.

*Gate:* `verify-assets` sem corpo incompleto; troca de idioma sem recarga; **com Wikipedia desligada, zero requisições de rede na captura**; **ata da 2ª prova anexada, com veredito final da linha**; **revisão de olhos frescos antes do merge**. *Ao fechar esta onda, gatilho marcado: revisitar de uma vez só os sonhos herdados do NORTE — é o momento em que Ondas 2, 5 e 8 já baratearam a maioria deles — e o dono decide se algum vira onda própria.*

**Onda 9 — Arquivamento.** atlas-orbital vira read-only. *Gate:* auditoria das **84 linhas** — nenhuma sem destino cumprido ou re-registrado como pendência nomeada; nenhuma cobrindo mais de um artefato; **justificativa errada conta como falha**, ainda que o veredito esteja certo; e cada linha responde, com evidência colável:

1. *estava viva no doador?* (`grep` por call site);
2. *o destino realmente tem o equivalente?* (`grep` no destino, não memória);
3. *o número foi medido ou estimado?*;
4. ***o que atravessou foi dado julgado por um oráculo, ou código de runtime?*** — se foi runtime, a linha só pode dizer "Migra" exibindo **as duas provas**: qualidade medida com o arquivo aberto **e** ata da revisão de olhos frescos da travessia. Sem as duas, o veredito é **Renasce**, e a linha declara o que herdou: requisitos, constantes medidas, testes e cicatrizes.

---

## 5. As 3 decisões do dono

*Em uma frase: continuam três, nenhuma bloqueia — porque as duas que têm consumidor cedo (1 e 2) têm default declarado.*

1. **A obra assinada muda?** O Ato I nascer entre as órbitas e os encontros estelares virarem beats. O sub-passo 7b depende dela; nenhum gate a espera. Pode chegar até o fim da Onda 6 sem retrabalho. *Default: sem decisão, 7b não entra.*
2. **Orçamento de payload por tier.** Decide três coisas de uma vez: o teto para efemérides e texturas planetárias (inclusive os mosaicos 4k), **o recorte da seção de identidade no `sc1`** e, por consequência, **o alcance possível da busca por catálogo**. *Default: sem decisão, a Onda 1 emite identidade só para as 1.726 nomeadas (~17 KB); as 328k (+3,3 MB crus, sobre um catálogo de 2,96 MB) esperam.* O número-base será **medido na hora** pelo script de build, nunca citado de memória. Ressalva técnica: **a decisão libera o dado, não a busca** — cobrir as 328k exige também trocar o algoritmo (`Map` direto para consulta numérica, índice ordenado com busca binária de prefixo ou trie para a textual). **Licenças não entram nesta conta: o dono já resolveu — todas as imagens são livres, e o que resta é atualizar a anotação de 11 entradas do manifest.**
3. **Log-depth ou reversed-z na Onda 6.** Near ~1e-6 pc contra far 9000 pc. Reabrir decisão fechada e escolher a técnica é prerrogativa do dono.

*Além das três, há um candidato reaberto e custeado aguardando decisão — **"pisar num rochoso"** — que não tem onda nem gate esperando por ele. Fica registrado nos sonhos herdados da Onda 0, com o custeio: céu e câmera baratos, terreno é uma onda inteira.*

*A doutrina de travessia (§0) **não é** uma quarta decisão: ela já foi tomada pelo dono e está registrada como fato de projeto.*

---

## 6. Riscos

*Em uma frase: caíram dois riscos que eram falsos, entraram cinco que a leitura dos arquivos revelou, e agora entra mais um — o de repetir os erros do doador ao herdar o problema dele.*

- **Profundidade em regime UA:** o depth buffer padrão não sobrevive à razão near/far. Mitigação na Onda 6; residual: z-fighting fora do gate.
- **Luz dupla e Sol inflado:** `WORLD.sunRadius = 0,011 pc` ≈ 2.270 UA. O compromisso final só se resolve no eye pass.
- **Alocação irreversível pelo tier** *(novo na 3ª rodada)*: o tier inicial congela a população da galáxia e o auto-quality nunca desfaz o que já foi assado. Teto de GL + `preferencias` mitigam; mas a tese nunca foi medida — o amostrador de memória da Onda 6 é o instrumento que falta.
- **Persistência contra a honestidade dos gates** *(novo na 3ª rodada)*: a URL é a fonte de verdade da casa. Precedência `URL > storage > detecção`, tom/exposição/camadas fora do envelope, e captura com perfil novo por PID.
- **A primeira superfície iluminada** *(novo na 3ª rodada, reescrito agora)*: 9.400:1 de faixa dinâmica num display de ~25:1. **A Versão 2 endurece este risco:** o expoente 0,35 do doador foi calibrado para compensar um piso de ambiente 0,02 que a Viagem não tem — duas alavancas de display que não foram co-desenhadas, de modo que mexer numa quebra a outra em silêncio. Recalibrar contra ACES, não mergear sem selo, e **ler §7 antes de escrever a primeira linha**.
- **Herdar o problema junto com os vícios de quem já o enfrentou** *(novo nesta rodada, risco de doutrina)*: quando se copia a espec de um sistema quebrado, copia-se também a forma da solução dele. O curativo do atlas tem o desenho que tem porque a fundação estava errada — migrar o desenho sem o ferimento importaria a deformidade sem a razão. Mitigação: **os nove anti-padrões de §7 são leitura obrigatória** de quem escrever a lei de luz, e o gate da Onda 6 testa explicitamente o que o doador errou (selo não desmentível a jusante; adaptação capaz de **+EV**; um só relógio por grandeza).
- **Sobrecorreção da doutrina** *(novo nesta rodada, risco de doutrina)*: reescrever o que já é conferível contra fonte externa adiciona risco de mistranscrição sem ganho. Um W₀ errado renderiza um planeta perfeitamente plausível e nenhum olho pega. Mitigação: **ferramenta offline julgada por oráculo migra** (§0.2), e a Onda 9 cobra a justificativa, não só o veredito.
- **Rede de terceiros de volta ao mapa** *(novo na 3ª rodada, com a Wikipedia)*: mitigação em três camadas — opt-out persistido com promessa verificável, cache de 30 dias com abort e rate-limit, e a camada calculada como conteúdo garantido sem rede. **Acrescentado agora:** a linha é Migra **condicional**, e a 2ª prova da Onda 8 tem CORS/origem contra o GitHub Pages como item de pauta.
- **Publicação inadvertida** *(novo na 3ª rodada)*: o site publica a cada commit na main; copiar `public/Docs/` ou `public/textures/` em bloco arrasta documentos internos e assets deliberadamente fora do git.
- **Regeneração do sidecar é cirurgia em dado vivo:** diff auditado no gate; nenhum nome muda sem justificativa.
- **Generalização estelar pode mentir:** os discos da Onda 7 são interpretação física. O badge de proveniência cobre estrelas também.
- **Custo do disco estelar:** o pool de 1 disco ativo é premissa não medida; `gpu-profile.mjs` obrigatório.
- **Frame eclíptica→galáctica:** o gate exige Sgr A* **e** polo eclíptico.
- **Validade temporal:** Vanth/Weywot só entram com badge que confesse.
- **Diluição do wow:** portal, convite e selos podem quebrar o silêncio cinematográfico. Contenção editorial contínua; o risco nunca zera.
- **O gargalo é humano:** tradução curada e redação de Miranda. Se atrasarem, a Onda 8 entrega em inglês com badge, sem segurar as ondas anteriores.
- **Sentença por rótulo** *(risco de processo)*: foi a causa de 11 dos 16 erros da 3ª revisão. Mitigação virou regra de gate — e a variante "sentença sem abrir o arquivo" virou o veredito pendente dos 6 `.md` *(resolvido na Onda 0: a leitura provou que a sentença por rótulo estava DUPLAMENTE errada — os 6 não eram "da safra dos `.txt`", e a linha "6 estudos densos" contava os mesmos arquivos duas vezes)*. **Variante nova: "sentença por reputação do doador"** — nem tudo do atlas é ruim, e a doutrina não autoriza reescrever o que o oráculo já protege (§2.7).

**Riscos removidos:** "a fotometria da casa é a única lei de luz" (falso — não há lei de luz para superfície) e "perde-se pisar em Marte" (falso — o atlas nunca entregou superfície).

---

## 7. Apêndice — anti-padrões registrados

*Em uma frase: o que o doador fez de errado na luz e na interface, com arquivo e linha, para que a casa não repita — e o que ele fez de certo, que sobrevive como intenção.*

Este apêndice existe porque a doutrina de travessia (§0) transforma o código do atlas em **especificação**, e especificação inclui a lista do que não fazer. Todas as citações são `arquivo:linha` do doador, conferidas com o arquivo aberto.

### 7.1 Os nove anti-padrões de iluminação

1. **Lei física implementada em duas camadas que não se conhecem.** `SceneLighting.tsx:27` instancia `<pointLight decay={0}>` — luz que **não cai** com a distância — e o 1/r² volta depois como uniform de CPU por material, multiplicando `directLight.color` dentro de um wrapper de `RE_Direct` (`solarIrradiancePatch.ts:84`). Tudo que não passa por `RE_Direct` continua na física errada: atmosfera, camada de nuvem, anéis, luzes noturnas, disco solar — dívida assumida em `exposureRegistry.ts:67-120`. O arquivo que proíbe "dois multiplicadores empilhados que depois brigam" criou exatamente isso, separado por camada em vez de por uniform.
2. **Controle de qualidade cabeado até um subsistema inerte.** `SmartSunLight` está na layer 1 e a câmera nunca sai da layer 0, então o three nunca a coleta: nem luz, nem shadow map (`SceneLighting.tsx:31-39`; `SmartSunLight.tsx:74`). Mesmo assim `shadowMapSize` atravessa o resolver de qualidade e os tiers até essa luz morta (`Scene.tsx:810`), e `Planet.tsx:624` mantém uma malha `castShadow` sem nenhum caster ativo. **Não existe sombreamento** — eclipse é analítico. Um "caminho de luz" sem sombra é a origem provável da sensação de "super bugado": vocabulário de PBR, comportamento de billboard.
3. **Subsistema com custo por frame cujo valor de saída é constante no caso comum.** `eyeAdaptation.ts:57` fixa `CEILING = 1.0` e a exposição sai sempre em [0,165; 1]. Numa cena 99% preta a luminância média encosta no piso e a exposição trava em 1,0 — enquanto `EyeAdaptationBridge.tsx:188` força passes de luminância todo frame e faz readback a 4 Hz (linha 199). Pior que o custo: **por construção é incapaz** de resolver o único problema que importa (Netuno escuro), que exige **+EV**, não −EV.
4. **Guarda armado por uma condição que não corresponde à ordem real do pipeline.** `SUNLIGHT_UNMAPPED_CEILING` (`solarIrradiance.ts:238`) é armado por "não há operador de tone mapping montado", justificado por clipping **e** pelo contrato `luminanceThreshold = 1.0` do Bloom. Mas o Bloom roda **antes** do tone mapping (`PostProcessingPipeline.tsx:236-262`), então a metade "Bloom" do argumento vale igualmente com o operador montado. Só a metade "clipping" se sustenta.
5. **Selo de honestidade que não considera todos os caminhos que alteram o resultado.** `FidelityBadge.tsx:71` define `isBrightnessFaithful = assistPolicy === "real"`. Com Tone Mapping = "None" no `DisplayPanel` e política "real" — dois cliques —, o selo pinta esmeralda "fiel" enquanto o teto grampeia Mercúrio de 10,4 para 1,0.
6. **Cache indexado por relógio de parede para grandeza que é função do tempo de simulação.** `useBodySunlightScalar.ts:52` faz o bucket em `Date.now()` mas resolve o valor em `simulationClock.getNow()`. A Timeline chega a 3 anos/segundo (`Timeline.tsx:59`): um segundo de parede pode ser um ciclo orbital inteiro, e a irradiância congela e depois salta em degraus de 1 Hz. Bug latente e silencioso, do tipo que só aparece em captura de vídeo.
7. **Uma constante servindo a dois papéis semânticos distintos.** `STAR_DISPLAY_BLACK_POINT = 0.165` (`starfieldShaderMath.ts:346`) é ao mesmo tempo ponto preto do starfield, `minLuminance` do tone mapper e **alvo** de luminância da adaptação (`eyeAdaptation.ts:54`). Alvo de adaptação e ponto preto são grandezas diferentes; amarradas, mexer no visual das estrelas move a exposição do sistema inteiro.
8. **Exposição fragmentada em seis lugares, com um registry que ninguém assina.** `exposureGround 0.5` / `exposureSky 0.25` hardcoded no GLSL (`atmscatteringSnippet.ts:76-77`), `u_exposure` fixado na construção do material (`Starfield.tsx:466`), `SUN_EMISSIVE_POWER 2.7` e `RING_EMISSIVE_POWER 0.2` (`artistCalibration.ts:37,40`), o `exposureRegistry` e o `toneMappingExposure`. O registry foi criado para coordenar e ficou sem adesão.
9. **Expoente de display calibrado para compensar outro parâmetro de display não co-desenhado, e autoridade citada fora do repositório.** O 0,35 é assumidamente "o menor expoente testado que mantém Netuno acima do ponto onde o piso 0,02 domina" (`solarIrradiance.ts:153-160`, com `AMBIENT_VIEWING_FLOOR` em `visualPresetOverrides.ts`). Duas alavancas acopladas em silêncio — e no modo "real" o app fica **sabidamente errado** (Netuno lavado por ambiente, sem terminador) sem nenhum guarda. Menor, da mesma família: `resolveAssistGain` "compensated" devolve 1/E e o fundido faz E×(1/E), que **não é 1,0 exato** em ponto flutuante embora a doc afirme "fused 1" (`solarIrradiance.ts:283-301`); e `handoffiluminacao.md`, citado como autoridade em 5 arquivos, **não existe no repositório**.

### 7.2 O que é bom na luz do doador e sobrevive como intenção

- A doutrina do **escalar único fundido** — um número, não dois multiplicadores.
- A **proibição explícita de world-space como entrada de lei física**, com o argumento nomeado e testado.
- `applyPlanetDirectLightCacheKey` (`solarIrradiancePatch.ts:179`): resolve um bug real e sutil do three r181 — o `customProgramCacheKey` default é o **texto** do closure, e flags capturadas colidem. Achado de alto valor, herdado como lição.
- **Monotonicidade** (`x^0.35` estritamente crescente) como critério operacional de honestidade.
- **Separação lib pura / bridge imperativa**, que torna tudo testável sem framework.
- Rigor de **citar dependência com versão verificada** (`postprocessing@6.38.0`).

### 7.3 Os oráculos de luz que migram verbatim

De `solarIrradiance.test.ts`: quarteia a cada dobro de distância; clampa em d=0; retorna neutro (não NaN) em não-finito; "não pode receber distância de render e responder plausivelmente"; preserva a ordenação verdadeira de brilho; ponto fixo na âncora; identidade bit a bit em "real"; a distância vem da efeméride e não do semi-eixo maior. De `solarIrradiancePatch.test.ts`: ordem dos wrappers no GLSL, ambiente/indireto intocado, chaves de programa distintas. De `eyeAdaptation.test.ts`: aproximação sem overshoot, inércia em frame parado. **Estes são oráculos e migram como estão** — são a régua que vai julgar a implementação nova.

### 7.4 Esboço de desenho para a lei de luz da casa

Ancorar a exposição fisicamente: calcular `E = 1361/d²` W/m² no alvo da câmera, converter à luminância aproximada via albedo e derivar **um EV de cena por frame**; aplicá-lo como **ganho linear único** antes do ACES que a Viagem já usa, deixando a compressão para o ombro do operador em vez de um expoente ad hoc. A "assistência" vira então um **deslocamento de EV explícito e limitado** ("+2 EV") em lugar de uma potência sobre a irradiância: mensurável, exibível em stops, reversível e neutro quanto à conservação de fluxo, porque nada além do ganho global muda. O ambiente deixa de ser piso constante e vira **luz de céu real** (zodiacal + estelar) escalada pela mesma exposição, de modo que o terminador nunca some. A adaptação ocular nasce **bidirecional com histerese, medindo o corpo em foco** e não a média de um frame preto. E o selo passa a reportar **o EV aplicado**, não uma etiqueta de política que pode ser contradita a jusante.

### 7.5 Anti-padrões de interface registrados

- **Painel de debug promovido a produto:** `DisplayPanel.tsx`, 665 linhas, ~18 controles (Resolution Scale, Bloom Intensity, Bloom Threshold, operador de tone mapping, Star Optics, Saturation ×, Contrast Δ, Brightness Δ) — e é ele que quebra a invariante do selo de honestidade.
- **Escada de valores escrita à mão:** `Timeline.tsx:14-60`, 44 degraus em inglês, sem lógica (3, 5, 6, 8, 10, 20, 30, 40, 50…). Deveria ser escala log contínua com rótulo formatado.
- **Internacionalização prometida e não cumprida:** só **4 de 32** componentes de `src/components/ui/` usam `useTranslation`; `ContextLine.tsx:43-44` crava "Star"/"Solar System" e o `aria-label` em inglês num app que anuncia busca PT/EN.
- **Componente que mistura cálculo, formatação e layout:** `Sidebar.tsx`, 778 linhas com geometria de céu, velocidade de escape, comparadores e layout no mesmo lugar; `VISUAL_FIDELITY_LABELS` hardcoded em inglês na linha 17.
- **Ferramenta de dev morando no produto:** `AssetStudyApp`, 594 linhas dentro de `src/components/ui/`.
- **Estado de chrome misturado com estado de domínio:** `store.ts`, 750 linhas, com `gearOpen`, `shortcutsModalOpen`, `debugMode` e `wikipediaIntegrationEnabled` ao lado do domínio.
- **Affordance pobre para boa ideia:** `FidelityBadge.tsx:74` cicla três estados num clique só, sem indicar qual é o próximo.
- **Estética que não é a da casa:** tech-corners, ghost-border, `font-orbitron`, `uppercase tracking-[0.16em]`, `animate-pulse` no dot de status — HUD de ferramenta sci-fi, não linguagem cinematográfica. **Para a Viagem sobrevive a semântica** (um selo, uma linha de contexto, uma gaveta, uma procedência), **não a decoração**.

**Veredito de travessia da crítica, registrado:** nenhuma peça de runtime ou UI do atlas passa hoje nas duas provas. O que migra verbatim são os **testes-oráculo** de `solarIrradiance` / `solarIrradiancePatch` / `eyeAdaptation`; o que migra como lição documentada são os **defeitos e anti-padrões acima**, mais os seis acertos de doutrina de §7.2.

---

## 8. Apêndice — as cinco rodadas

*Por que este documento é confiável:*

1. **Plano v1** foi rejeitado por atacado: absorvia o atlas por narrativa, sem inventário — itens inteiros ficaram fora da ata.
2. **Inventário + crítico**: 71 itens com destino declarado, e um crítico adversarial derrubou 14 pontas, entre elas três afirmações técnicas centrais que estavam factualmente erradas sobre o código.
3. **Revisão dos aposentados com os arquivos abertos**: os 20 descartes foram reabertos com `grep`, medição e leitura linha a linha — 4 mantiveram-se (só um com a justificativa intacta), 3 reverteram inteiros, 13 eram parciais e 6 itens novos apareceram. É desta rodada que vem a regra que governa o gate final: **um item é o que os arquivos dizem, não o que o nome promete.**
4. **Auditoria da consolidação**: conferiu a fusão contra as duas fontes e corrigiu 15 pontos — o movimento do placar, dois splits que faltavam, três destinos revertidos que tinham ficado sem onda, o default da Decisão 2, o protocolo de três perguntas do gate final e a condicionalidade dos mosaicos. Corolário incorporado à taxonomia: **arquivo não lido não recebe veredito.**
5. **Doutrina de travessia** *(esta rodada)*: o dono declarou que o atlas foi feito no impulso com modelos anteriores, que a iluminação de lá é super bugada e que várias escolhas de interface são pobres. Uma crítica de olhos frescos confirmou o testemunho com arquivo e linha — dez defeitos de luz, nove anti-padrões, oito problemas de UI, e seis acertos de doutrina que merecem sobreviver. A matriz foi reclassificada sob a régua **dado/ferramenta-julgada/runtime**: 9 linhas saíram de Migra (8 para Renasce, 1 para Melhora por correção de natureza), 2 linhas se dividiram em dado + runtime, 1 ficou em Migra condicional com a 2ª prova agendada, e 3 correções de fato entraram (não existe `gpuProbe.ts`; os módulos VSOP/ELP do doador são runtime; `starOptics` não tem artefato no atlas). Todo gate que atravessa código ganhou **revisão de olhos frescos antes do merge**, e o gate final ganhou a quarta pergunta. O placar foi recontado por seção e por veredito, e a recontagem **corrigiu a aritmética publicada na própria reclassificação** (§2.6). Regra que esta rodada acrescenta: **o código do doador é especificação de intenção, não fornecedor de implementação** — com o contrapeso, igualmente vinculante, de que **reescrever o que um oráculo externo já protege é adicionar risco sem ganho.**

---

## NOTAS DE ENTREGA AO ORQUESTRADOR (não fazem parte do documento)

O documento acima está gravado em `/private/tmp/claude-501/-Users-fgferre-Github-Viagem-Sol-pela-Milky-Way/b13c5013-7b10-4dec-b587-0af8b10207fd/tasks/PLANO-MESTRE-CONSOLIDADO-V2.md` — escrito em arquivo novo, sem sobrescrever o v1 em `PLANO-MESTRE-CONSOLIDADO.md`, para que a substituição seja decisão sua.

**Divergência aritmética que precisa da sua atenção.** A reclassificação que me foi passada publicou o placar "84 linhas — 19 melhoram, 15 migram, 38 renascem, 10 aposentam, 1 reabre, 1 pendente", com a justificativa de que "`starOptics` ocupa o lugar contábil que perdeu em Migra, então Melhora permanece 19". Isso não fecha: `starOptics` **já estava dentro dos 24 de Migra** no placar antigo, logo movê-lo para Melhora soma 1 em Melhora e nada em Renasce. O placar correto é **20 melhoram, 15 migram, 37 renascem, 10 aposentam, 1 reabre, 1 pendente**.

Conferi mecanicamente, não de cabeça: contei as linhas de cada tabela da matriz do arquivo escrito e classifiquei cada veredito pelo token inicial da célula. Resultado — 2.1 = 9 (3 Melhora, 2 Migra, 3 Renasce, 1 Aposenta); 2.2 = 21 (7/7/7); 2.3 = 38 (6 Melhora, 3 Migra, 22 Renasce, 7 Aposenta); 2.4 = 10 (3/3/1/2 + 1 pendente); 2.5 = 6 (1 Melhora, 4 Renasce, 1 Reabre). Soma 84 em ambos os eixos. O mesmo método aplicado ao documento v1 reproduz exatamente o placar antigo (19/24/27/10/1/1), o que confirma que o método é fiel e que a divergência está na trilha publicada, não na minha contagem. O §2.6 do documento novo registra essa correção em bloco de citação, em vez de escondê-la — pareceu-me o único desfecho compatível com um plano que criminaliza número citado de memória.

**Onde cada peça pedida entrou:** §0 (doutrina completa, com testemunho do dono, régua de três categorias, exceção das duas provas e o aviso contra sobrecorreção); reclassificação aplicada linha a linha nas cinco tabelas, com os textos novos integrais; §2.6 recontado com tabela por seção × veredito; §2.7 novo, registrando as seis linhas que a doutrina não derruba; §7 novo, com os nove anti-padrões de luz e os oito de UI citando `arquivo:linha`, mais os acertos, os oráculos e o esboço de desenho 2026; observações de UI dentro das linhas de Spotlight/tutorial, ContextLine, busca, FidelityBadge, LayersPanel, Timeline, idioma e AssetStudyApp; regra de UI em bloco de citação na Onda 5 ("as ideias vêm do atlas, a implementação é nova"); passo de "revisão de olhos frescos por modelo atual antes do merge" declarado uma vez no topo do §4 e repetido no gate das Ondas 1, 2, 3, 5, 6, 7 e 8, com a Onda 9 recebendo a quarta pergunta do protocolo; §8 com a 5ª rodada. A Onda 4 é a única onda de código sem o passo, e está dito por quê: não atravessa artefato do doador.

**Dois pontos que decidi por conta e você pode querer reverter:** (1) a linha da irradiância cita o `applyPlanetDirectLightCacheKey` como lição herdada — a crítica o classificou como achado de alto valor, e me pareceu desperdício deixá-lo só no apêndice; (2) o `hygMeshFadeRamp.ts` ganhou "exceção de transcrição declarada" dentro da linha do `HygStellarMesh`, para que a permissão de copiar 47 linhas esteja na matriz e não apenas na doutrina.