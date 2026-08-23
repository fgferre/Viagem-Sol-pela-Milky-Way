# PLANO — o que falta da fusão do Atlas

Ondas 0–6 estão feitas e na `main`. A estrela — como se desenha, em qualquer
distância — passou a ser contrato de [`docs/LEI-DA-ESTRELA.md`](LEI-DA-ESTRELA.md).
Este arquivo só cobre o que **ainda falta** da fusão atlas-orbital → Viagem.

Ata das ondas feitas: `git show docs-antes-da-reforma:docs/PLANO-ATLAS.md`.

---

## 0. Doutrina de travessia

O código do atlas é a especificação do problema, não o fornecedor da solução.

1. **Dados e oráculos migram verbatim** — efemérides, fixtures Horizons,
   coeficientes IAU, testes de regressão.
2. **Ferramentas offline julgadas por oráculo podem migrar** — se errarem, o
   gate pega. Reescrever pipeline offline provado adiciona risco de
   mistranscrição.
3. **Runtime e UI renascem.** Atravessam o problema, os requisitos, as
   constantes medidas, as cicatrizes e os testes. A implementação é nova.

Uma linha de runtime só diz “Migra” com duas provas: qualidade medida com o
arquivo aberto, e revisão de olhos frescos na hora da travessia.

---

## 1. O que ainda está aberto

### Decisões do dono (nenhuma bloqueia; default declarado)

1. **A obra assinada muda?** Encontros estelares como beats do filme
   (sub-passo 7b). *Default: sem decisão, 7b não entra.*
2. **Orçamento de payload por tier.** Teto de efemérides/texturas e o recorte
   da identidade no `sc1` (hoje só as 1.726 nomeadas; as 328k esperam). A
   decisão libera o dado, não a busca — cobrir 328k exige trocar o algoritmo.
3. **Log-depth / reversed-z.** Reaberta quando a Onda 6 pôs malhas; o dono
   redecidiu **não** (near na superfície). Continua prerrogativa dele.

Candidato sem onda: **pisar num rochoso**. Céu e câmera são baratos; o custo
inteiro é o terreno (MOLA). Sem gate esperando.

### Conteúdo e didática (ex-Onda 8, sem pupila)

- Camada de fatos relacionais (idade da luz, o Sol visto de lá, a Lua
  conferível hoje à noite). A ficha do objeto é a casa dela, e a casa está
  pronta: `FichaDoObjeto` + `lib/atlas/ficha.ts` desde 22/08 (item 74,
  fechado nas duas partes), com o editorial em pt-BR, a procedência da
  imagem e a ficha de estrela dentro.
- Wikipedia no painel, opt-out persistido (desligado ⇒ zero requisições).
  2ª prova ainda pendente: IndexedDB, CORS no GitHub Pages, opt-out
  verificável. Se falhar, a linha cai para Renasce.
- Seletor de idioma + `?lang=`. Default pt-BR.
- Sondas, créditos, tours, cinturões, cometas.
- Beat “escala real” animado, nunca toggle.
- `starOptics` rotulável com interruptor — a cruz de 4 spikes está cravada,
  sem desligar. É honestidade de instrumento, não fotometria.

Auto-exposição por foco **não entra**. O dono a reprovou. Compressão fixa:
`LEI-DA-ESTRELA.md` §7.

### Motor estelar (o que a LEI não comeu)

A peça `stellarBody.ts` existe; o Sol já é a instância nº 1. O que falta
dessa frente é o contrato da LEI (F1→G), não “tornar o Sol um singleton
parametrizado”. Deste plano sobram só:

- `arriveDist` com termo angular (câmera, não luz) — hoje a câmera pousaria
  igual em Betelgeuse e em Proxima.
- Consumir `stellarPhysics.ts` no runtime. **`temperatureFromBV` saiu do
  oráculo em 22/08**: a ficha de estrela imprime a temperatura efetiva de
  cada nomeada, derivada do B−V do catálogo — é a primeira conta deste
  módulo a chegar à TELA (antes ela só alimentava cor de shader, por
  `bvToColor`). O resto do arquivo — raio, luminosidade, os valores pinados
  que não são físicos — segue sem consumidor.
- `teffK` e `convective` nos 14 vendorizados — exige editar o núcleo; a
  regra M3 que proibia isso era a mesma doutrina da tela congelada,
  revogada. Ainda assim: sem 2ª instância enquanto `SUN_RADIUS = 2.2` e
  `cme.js` capturarem a câmera na criação (`NORTE.md`).

### Onda 9 — arquivar o doador

atlas-orbital vira read-only quando cada linha da matriz antiga tiver
destino cumprido ou re-registrado como pendência nomeada. Quatro perguntas
por linha, com evidência:

1. estava viva no doador?
2. o destino tem o equivalente?
3. o número foi medido ou estimado?
4. o que atravessou foi dado/oráculo ou runtime?

---

## 2. Os 11 aposentados — não ressuscitar

Nenhuma morte é sentida pelo visitante desta casa.

1. HYG 4 tiers binários (38 B/estrela, Hipparcos, 109k).
2. `StellarFlightTransition` (código morto no doador).
3. Presets + score aditivo + 15 overrides.
4. Exposição manual / Camera FX / LoD do doador (comentários).
5. `qualityMode` legado.
6. Debug Logging do doador.
7. Colorblind / High Contrast (3 campos órfãos). **A dívida fica:** num
   produto onde a cor é o dado, acessibilidade é canal redundante, não filtro.
8. Modo Superfície 1ª pessoa (o atlas nunca entregou superfície).
9. Os 2 `.txt` de sessão de `public/Docs/`.
10. README/HANDOFF do doador (viram o checklist da Onda 0, já consumido).
11. Os 2 estudos reprovados na Onda 0 (câmera; starfield NASA Eyes).

---

## 3. Anti-padrões — o que não copiar do doador

Leitura obrigatória de quem escrever lei de luz ou painel.

1. Lei física em duas camadas que não se conhecem (`decay=0` + 1/r² por
   material).
2. Controle de qualidade cabeado até um subsistema inerte (luz numa layer
   que a câmera nunca coleta; zero sombra).
3. Subsistema com custo por frame cuja saída é constante no caso comum
   (adaptação que só escurece e trava em 1,0).
4. Guarda armada por condição que não corresponde à ordem do pipeline.
5. Selo de honestidade que não considera todos os caminhos que alteram o
   resultado.
6. Cache por relógio de parede para grandeza do tempo de simulação.
7. Uma constante servindo a dois papéis (ponto preto = alvo de adaptação).
8. Exposição fragmentada em seis lugares, com registry que ninguém assina.
9. Expoente de display calibrado para compensar outro parâmetro de display
   não co-desenhado.

O que é bom e sobrevive como intenção: escalar único fundido; proibição de
world-space como entrada de lei física; monotonicidade; lib pura / bridge
imperativa.

**Não sobrevive** o esboço que media o corpo em foco para adaptar a
exposição — é exatamente o que o dono reprovou.

Anti-padrões de UI: painel de debug promovido a produto; escada de valores
escrita à mão; i18n prometida e não cumprida; ferramenta de dev no produto;
estado de chrome misturado com domínio; estética sci-fi que não é a da casa.
Para a Viagem sobrevive a semântica (um selo, uma linha de contexto, uma
gaveta), não a decoração.

---

## 4. Riscos que ainda valem

- Primeira superfície iluminada: 9.400:1 num display de ~25:1. Recalibrar
  contra ACES; não mergear sem selo `?luz=`.
- Alocação irreversível pelo tier — o amostrador da Fase B é o instrumento.
- Persistência contra a honestidade dos gates: tom/exposição/camadas fora
  do envelope. A cascata `URL > storage > detecção` valia para o TIER e
  não vale mais (Ajustes D, 20/08): sem `?q=` ele é constante, e o
  storage só guarda marcas de primeira visita.
- Rede de terceiros (Wikipedia): opt-out verificável.
- Publicação inadvertida: o site publica a cada push na `main`.
- Sobrecorreção da doutrina: ferramenta offline julgada por oráculo migra.
- Generalização estelar pode mentir: o selo cobre estrelas também.

Riscos mortos (não reler como atuais): “Sol inflado `WORLD.sunRadius`”
(fator 1 desde a F3); “casa sem lei de luz para superfície” (Onda 6 pôs
`luz.ts`); “gate pixel-igual na Onda 7” (revogado; a peça já existe).
