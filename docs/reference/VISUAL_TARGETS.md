# Alvos de fidelidade visual — o REAL como referência

O alvo do projeto não é preservar o próprio look, é **convergir para o
real**: as recriações científicas oficiais (construídas pelos mesmos
dados que nossos catálogos usam) e o céu fotografado de verdade. As
capturas do próprio app NUNCA são referência — auto-referência circular
congela defeitos. Cuidado excessivo também é defeito: uma mudança
ousada que aproxima a cena destes alvos vale mais do que dez tímidas
que preservam o estado atual.

## Os alvos

### 1. Via Láctea face-on — recriação Gaia 2025 (vista externa, Ato III)

- [gaia-2025-face-on-5k.jpg](gaia-2025-face-on-5k.jpg) — o alvo da
  revelação (`?t=170&shot=1`) e de toda vista externa de cima/baixo.
- [gaia-2025-face-on-anatomia.jpg](gaia-2025-face-on-anatomia.jpg) —
  versão rotulada: nomes e posições dos braços (Perseus, Orion,
  Carina-Sagittarius, Centaurus, Norma, Outer, 3-kpc), barra, Sol,
  escala em kpc e a Anã de Sagitário. É o gabarito de ANATOMIA: nosso
  disco deve bater braço a braço com ela.
- O que ela estabelece: braços com interrupções e contraste moderado
  (não grand-design), bojo/barra quentes SEM estourar, fendas de poeira
  finas e orgânicas, disco externo azulado e tênue, halo escuro.

### 2. Via Láctea edge-on — recriação Gaia 2025 (disco de perfil)

- [gaia-2025-edge-on-5k.jpg](gaia-2025-edge-on-5k.jpg) — o alvo do
  disco de perfil (`?t=158&shot=1`) e de vistas rasantes: espessura
  relativa do disco fino, bojo em caixa/amendoim, warp sutil, lâmina de
  poeira MAIS FINA que a lâmina estelar.

Crédito (obrigatório ao citar): **ESA/Gaia/DPAC, Stefan Payne-Wardenaar
— CC BY-SA 3.0 IGO**. Fonte:
<https://www.cosmos.esa.int/web/gaia/milky-way>. Nota científica: é uma
impressão artística baseada em dados (Drimmel et al. 2023); o detalhe
próximo é medido, a aparência global é modelo — exatamente o mesmo
contrato observado/inferido do nosso renderer.

### 3. O céu real visto de dentro — panorama ESO GigaGalaxy

- [eso-gigagalaxy-panorama.jpg](eso-gigagalaxy-panorama.jpg) —
  fotografia real de 360° do céu inteiro (S. Brunier). É o alvo da
  faixa vista de qualquer ponto interno (`?t=0`, corredor, free-roam
  no disco): assimetria bojo/anticentro, Great Rift contínuo e
  irregular, nuvens estelares de Scutum/Sagitário, acentos H II
  pequenos (Carina, Lagoa, Órion), cor global branco-perolada.

Crédito: **ESO/S. Brunier — CC BY 4.0**. Fonte:
<https://www.eso.org/public/images/eso0932a/>.

## Como julgar

1. Reproduza a vista equivalente no app (URLs determinísticas,
   `?shot=2` para a face-on — sem HUD, senão os botões contaminam a
   medida —, GPU real).
2. **Meça** com `scripts/visual/measure-similarity.html` (abaixo) e
   depois **olhe**. A métrica é cega para textura da poeira,
   granulação e artefatos locais; o olho é cego para assimetria.
3. Divergência da anatomia rotulada = bug de cartografia; divergência
   de caráter (cor/contraste/textura) = trabalho de direção de arte a
   fazer. As duas são trabalho, não "gosto".

## O gate numérico

Médias azimutais — perfil radial, contraste braço/interbraço, índice de
cor, granulação — são cegas para estrutura espiral: um disco borrado e
uma espiral coerente podem ter valores idênticos. Elas medem TOM.
A ESTRUTURA sai da decomposição de **Fourier azimutal em coordenadas
log-polares**, que é o padrão em morfologia de galáxias, e está
implementada em [`scripts/visual/measure-similarity.html`](../../scripts/visual/measure-similarity.html).

```bash
chrome --headless=new --enable-gpu --allow-file-access-from-files \
  --window-size=900,900 --virtual-time-budget=14000 --dump-dom \
  "file:///<abs>/scripts/visual/measure-similarity.html?a=<quadro>.png"
```

Valores da recriação Gaia 2025 face-on — este é o gabarito:

| grandeza | alvo | o que significa |
|---|---|---|
| m=1 | 0,101 | assimetria (lopsidedness). Alto = galáxia torta |
| m=2 | 0,249 | componente de dois braços |
| m=3 | 0,071 | quase todo intermodulação, não estrutura |
| m=4 | 0,208 | componente de quatro braços |
| m=5 | 0,062 | idem m=3 |
| m=6 | 0,094 | intermodulação m=2 × m=4 |
| razão m2/m4 | 1,20 | **dois braços dominantes com quatro visíveis** |
| discMean | 0,1175 | brilho absoluto do disco (0,25–1,05 R90, luz linear) |
| grain | 0,075 | mosqueado de alta frequência |

`harmonicError` (soma de |nosso − alvo| em m=1..6) é a nota honesta;
menor é melhor. **Não use o composto `symmetry`**: ele é
A_dominante/(A_dominante + resto), então estourar a dominante o infla
sem aproximar do alvo — um estado com m=2 8% acima marcou `symmetry`
mais alto que outro com m=2 e m=4 casados exatamente.

### Cada harmônica aponta uma causa

Verificado nesta base, com as hipóteses que caíram no caminho:

| sintoma | causa |
|---|---|
| m=1 alto | braços não equiespaçados; correção observada alcançando longe demais; nível médio do campo observado maior que o do inferido |
| m=3, m=5 altos | **intermodulação** — a intensidade é um produto (emissão × absorção), então m=4 na emissão × m=1 na absorção gera 4±1. Também: fenda de poeira de um lado só faz um perfil dente-de-serra, rico em ímpares por construção |
| razão m2/m4 | quantos braços dominam |

Descartados por medição (não repita): subir o contraste geral dos
braços (amplifica todos os harmônicos junto, inclusive os ímpares);
enfraquecer o braço Local (não contribui); desacoplar a fase da poeira
da fase da luz (piora muito — as duas precisam compartilhar a
geometria, senão a fenda deixa de ficar ao lado da crista).

O checklist por região do disco (como o céu muda em R=3 kpc,
inter-braço, disco externo, acima do plano) está na seção "Ambiente
volumétrico relocável" de `../RENDERER_CARTOGRAPHY.md`, com fontes.
