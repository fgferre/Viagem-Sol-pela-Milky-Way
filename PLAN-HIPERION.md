# Item 226 — Hipérion, etapa C e prova do grão (29/09/2026)

Continuação pedida pelo dono: borda clara da bacia e retoque localizado da mancha em estrela, provas antes/depois e exame da superfície em close. A aprovação visual continua pendente. Não gerar nem sobrescrever `public/data`; deixar a receita e as saídas prontas para ele.

## Estado encontrado e decisões mantidas

- O antigo `PLAN-HIPERION.md` foi removido em `3fc49d2`, ao concluir a entrada de Hipérion no app. Foi consultado em `git show 3fc49d2^:PLAN-HIPERION.md`. O `PLAN.md` atual trata da poeira do Gaia e não pertence a esta obra.
- A etapa C já estava implementada no gerador e nas fontes em `40466b5` (29/09): não se repetiu a implementação. Decisões registradas no item 226 de `docs/PENDENCIAS.md` e em `docs/reference/ASSETS.md`.
- Borda clara: declive da forma medida, sem poços, sobre o elipsoide triaxial ajustado; resíduo `ln(r/r_elipsoide)`, suavizado em escala grande (σ 4°). Dose zero até 12°, cheia a partir de 30°; cor linear multiplicada por `1 + 0,35 × dose`. A máscara segue as encostas da forma inteira; não é um círculo pintado só na bacia. 0,35 depende do julgamento por foto.
- Estrela maior: centro (900,333) no mapa de saída 2048×1024; doador (1180,333), mesma latitude; cobertura completa até raio 30 texels, transição suave até 40. Retoque só da cor, antes do ganho da encosta. Os sete poços validados com centro nessa área continuam no relevo. Flores menores não foram retocadas.
- O bake público da ilustração continua nivelando a média linear para albedo 0,26; por isso a comparação no app também inclui a pequena compensação global de brilho da receita existente.
- Forma, altura, normais, horizonte e força do grão permanecem como estão. Cor e poços são ilustração, não medição. Nenhum custo novo por quadro.

## Etapa C — execução desta rodada

- [x] Conferir o estado do repositório, o plano histórico e as decisões do item 226.
- [x] Conferir a borda e o retoque existentes em `scripts/data/atlas/relevo-e-cor-de-hiperion.mjs`.
- [x] Acrescentar `--cor-antes <png>` ao mesmo gerador: saída opcional da cor graduada, na convenção da casa, antes dos dois retoques. Sem a opção, a receita conserva o comportamento atual.
- [x] Gerar as fontes e os diagnósticos exclusivamente em `capturas/hiperion-etapa-c-20260929-v2/`, pasta nova; preservar todas as provas anteriores e os arquivos públicos.
- [x] Conferir por SHA-256: as sete saídas em `fontes/` são idênticas às fontes atuais do repositório; `cor-antes.png` é idêntica à fonte de cor em `40466b5^`. Altura, normal e os dois horizontes não mudaram.
- [x] Fotografar antes/depois no app em três poses, com a mesma câmera, data, luz, relevo e horizonte da etapa B. Só o mapa de cor é trocado temporariamente na memória do navegador: antes = `map.webp` em `40466b5^`; depois = mapa atual. Comparações finais na pasta v3: a decodificação copia as opções do carregador da casa (`createImageBitmap`, `flipY`, sem pré-multiplicar alfa nem converter cor). Recarregar o mapa atual por esse mesmo caminho devolve PNG byte a byte idêntico nas cinco poses (`conferencias-app.json`).
- [x] Examinar o close em d = 1,2 em duas iluminações, com o grão atual e com ele temporariamente desligado; registrar imagens e diferença.
- [x] Validar: `npm run test:tocados` não encontrou teste irmão do gerador; a prova de reprodução acima passou. `npm run done` passou (typecheck, lint, 112 arquivos de teste; 3.235 testes aprovados e um ignorado). `git diff --check` passou. Os 1.058 arquivos rastreados de `public/data` e `public/textures` conservam o SHA-256 agregado inicial (`public-preservado.json`); nenhuma geração pública foi executada.
- [ ] Avaliação do dono: aceitar o clareamento de 0,35 e o retoque localizado, ou pedir ajuste.
- [ ] Avaliação do dono: decidir se a maciez de perto incomoda e se deseja uma rodada específica sobre o grão.

## Provas e o que mostram

Provas finais no app em `capturas/hiperion-etapa-c-20260929-v3/` (ignorada pelo git; preservada localmente):

- `bacia-antes-depois.jpg`: fase 55°, beta 25°. Encostas e aro da bacia ganham contraste claro; o clareamento também acompanha outras encostas. O gosto por essa intensidade não é aprovação técnica.
- `estrela-antes-depois.jpg`: fase 80°, beta −35°. A estrela maior do alto perde os raios pintados; o restante da superfície segue a pintura existente.
- `frente-antes-depois.jpg`: fase 120°, beta 0°, segunda leitura das encostas sob luz oblíqua.
- `grao-close.jpg`: sem grão | grão atual | diferença absoluta ampliada 16×. PNGs completos `close-{sem,com}-grao.png`, 2000×2000; fase 80°, beta −35°, d = 1,2, viewport 1000×1000, DPR 2, JD 2461041.5008692136.
- `grao-close-luz.jpg`: o mesmo exame, fase 55°, beta 25°, com mais superfície iluminada. PNGs completos `close-luz-{sem,com}-grao.png`; mesma distância, resolução e data. `fotografa.mjs` guarda as poses e a troca temporária; os JSONs de metadados registram câmera local, Sol local, tamanho da textura e buffer.

Fontes e diagnósticos do gerador em `capturas/hiperion-etapa-c-20260929-v2/`:

- `mapas.jpg`: mapa completo antes, depois e dose do clareamento; `estrela-mapa.png`: recorte em torno de (900,333), ampliado 4× sem inventar pixels. A dose alcança 35,41% dos texels; média 0,0975, conforme o log do gerador.
- `fontes/`: as sete saídas da receita, prontas para inspeção; `cor-antes.png`, `dose.png`, `alinhamento.jpg` são diagnósticos. `conferencias.json` registra a identidade das fontes; `public-preservado.json`, a preservação dos arquivos públicos.

**Não usar as comparações antes/depois NO APP da v2:** o antes foi carregado como `<img>` sem a inversão vertical do carregador do app. O erro da ferramenta de prova foi detectado e corrigido na v3, sem sobrescrever a v2. Os mapas planos e as fontes da v2 estão corretos; o exame do grão também usava a textura original restaurada e foi reproduzido na v3 com os mesmos números.

**Grão observado:** a superfície permanece macia nas duas iluminações; o grão acrescenta variação discreta de luminosidade e não recupera textura fina nem cria pedras ou novas crateras. Sob fase 80°, desligá-lo altera 920.163 dos 4.000.000 pixels (23,004% do quadro), com diferença máxima de 2/255 por canal e média absoluta 0,129/255. Sob fase 55°, são 2.228.519 pixels (55,713%), máximo 4/255 e média 0,411/255. A maior área iluminada torna o efeito mais detectável, mas ele continua discreto no olho. Nas duas poses, religá-lo devolve exatamente a captura anterior: zero canais diferentes. A diferença 16× serve para localizar o efeito, não representa sua aparência normal. Esses números são destas poses e resolução, não uma medida universal do grão nem do custo da GPU. Não se avaliou estabilidade em movimento ou no iPhone.

O código confirma a prova: `GLSL_GRAO_DO_CLOSE` em `src/three/world/corpos/corpos.ts` multiplica o albedo por ruído de três escalas, com amplitude nominal ±6%; não muda a normal ou o relevo. O portão usa texels por pixel (`dFdx(uv) × tamanho do mapa`), desliga em ≥1 e chega à dose cheia em ≤0,5. Não é controlado só por distância. Hipérion recebe o mesmo grão de Lambert em `rochoso.ts`. Não foi reforçado nesta rodada.

## Comandos prontos para o dono

Na raiz do repositório. **Não executados sobre as pastas de produção nesta rodada.** O estado atual já possui os retoques e as mesmas fontes; estes comandos servem para repetir a geração, caso queira. Os três últimos comandos de geração escrevem texturas públicas e o manifesto; são dele.

```bash
node scripts/data/atlas/relevo-e-cor-de-hiperion.mjs --saida scripts/data/atlas/fonte --cor scripts/data/atlas/fonte/hyperion-ia-original.png --pocos scripts/data/atlas/fonte/hyperion-pocos.json
node scripts/data/atlas/baixa-texturas.mjs hyperion
node scripts/data/atlas/otimiza-texturas.mjs hyperion
node scripts/data/atlas/gera-manifest-texturas.mjs
npm run data:verify
```

Para reproduzir apenas a prova do gerador em outra pasta nova, sem escrever dados públicos:

```bash
mkdir -p capturas/hiperion-etapa-c-v3/fontes
node scripts/data/atlas/relevo-e-cor-de-hiperion.mjs --saida capturas/hiperion-etapa-c-v3/fontes --cor scripts/data/atlas/fonte/hyperion-ia-original.png --pocos scripts/data/atlas/fonte/hyperion-pocos.json --cor-antes capturas/hiperion-etapa-c-v3/cor-antes.png --dose capturas/hiperion-etapa-c-v3/dose.png --alinhamento capturas/hiperion-etapa-c-v3/alinhamento.jpg
```

Use v4, v5 etc. se a pasta já existir; nunca sobrescreva uma prova.

## Fora desta rodada e pendente

Interruptor dos poços, flores menores, reforço do grão, correção do ocultador de estrelas, outras luas, poeira do Gaia, medição de desempenho nova, iPhone e publicação. Nada disso foi implementado. O item 226 permanece aberto até a avaliação do dono; este plano fica para essa continuação.
