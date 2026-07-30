# Prompt para o agente que elaborará o plano

Analise o repositório inteiro antes de responder. Sua tarefa é **produzir um
plano técnico de implementação**, não escrever código ainda.

O objetivo imediato é substituir a distribuição procedural uniforme de
poeira/gás no disco da Via Láctea por um sistema galáctico 3D
cartograficamente condicionado, visualmente AAA e executável em browser desktop.
Não planeje ainda o roteiro de câmera, a renderização final das estrelas por
magnitude nem a geração procedural de objetos quando a câmera se aproxima;
essas são etapas posteriores.

Use como fonte de verdade:

- `docs/GALACTIC_DATA_FOUNDATION.md`;
- `public/data/galaxy/manifest.json`;
- `scripts/data/build-galactic-assets.mjs`;
- `src/three/cartography/galacticModel.ts`;
- `src/three/world/galaxy.ts`;
- `src/three/world/nebula.ts`;
- `src/three/shaders/nebulaShaders.ts`;
- `src/three/director.ts`.

Premissas que não podem ser violadas:

1. a imagem Gaia/ESA global é uma impressão artística baseada em dados, não um
   volume 3D completo;
2. a camada observada/derivada deve permanecer separada da camada inferida;
3. incertezas, método de distância e flags do manifesto devem influenciar o uso
   dos registros;
4. pontos APOGEE não devem virar billboards individuais: proponha estrutura
   volumétrica/espacial com LOD, streaming e orçamento explícito de CPU, GPU,
   VRAM, banda e frame time;
5. o sistema deve funcionar em WebGL2 hoje e pode propor WebGPU como backend
   progressivo somente com fallback e benefício mensurável;
6. a transição do volume local para o disco inteiro deve ser contínua, sem
   popping, repetição evidente ou nuvens que acompanhem a câmera;
7. a solução precisa permitir direção de arte AAA sem falsificar a posição das
   estruturas observadas;
8. respeite a arquitetura modular existente e proponha revamp apenas quando
   demonstrar que o módulo atual é uma limitação real.

Entregue:

1. diagnóstico do estado atual com referências `arquivo:linha`;
2. arquitetura-alvo e fluxo dos dados, do binário até o shader;
3. estratégia de representação volumétrica e aceleração espacial;
4. política de LOD/streaming e budgets por preset;
5. regra matemática para combinar `observed`, `derived` e `inferred`;
6. fases implementáveis, cada uma com arquivos afetados, critérios de aceite,
   testes e rollback;
7. riscos científicos e gráficos, separados;
8. uma matriz indicando o que deve ser preservado, substituído ou criado.

Não aceite “build passou” como validação visual. Inclua capturas determinísticas
em vistas internas, no plano, acima do disco e na transição entre escalas, além
de métricas de frame time e memória.
