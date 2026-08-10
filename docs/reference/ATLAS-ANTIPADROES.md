> **Leitura obrigatória** de quem for escrever a **lei de luz da casa (Onda 6)** — e
> recomendada para qualquer travessia de UI (Onda 5). Cópia de leitura extraída
> **verbatim** do §7 do [`PLANO-ATLAS.md`](../PLANO-ATLAS.md) (Versão 2,
> 2026-08-10) na Onda 0, porque o plano encomendou os anti-padrões em
> `docs/reference/`. **A fonte canônica é o plano** — se divergirem, o plano vence.

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

