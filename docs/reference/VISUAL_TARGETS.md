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
  revelação (`?t=` + `CAPTURE_T.face` + `&shot=2`, meio do hold face-on;
  o QUADRO é o mesmo desde a 16; shot=2 é o modo de MEDIÇÃO, sem HUD;
  shot=1 mantém o HUD e serve só para inspeção) e de toda vista externa
  de cima/baixo.
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
  disco de perfil (`?t=` + `CAPTURE_T.edge` + `&shot=2`, meio do hold
  de perfil) e de vistas rasantes:
  espessura relativa do disco fino, bojo em caixa/amendoim, warp sutil,
  lâmina de poeira MAIS FINA que a lâmina estelar. A câmera do hold é
  IDÊNTICA à das rodadas 16–25 (pos −597, 14597, 6287 · mira −442,
  −7117, −3946 · fov 58): os gates seguem comparáveis entre rodadas.

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
  --window-size=1800,1800 --virtual-time-budget=14000 --dump-dom \
  "file:///<abs>/scripts/visual/measure-similarity.html?a=<quadro>.png"
```

**PROTOCOLO desde a rodada 24: capturas em 1800×1800.** O analisador edge
(`toLinearFull`) reduz tudo a maxDim 1200 — a referência 5k sempre caiu
nessa grade, mas a captura antiga de 900 era analisada em 900: protocolo
ASSIMÉTRICO que sub-resolvia a fenda (~4 px, meio-enchida pelo PSF de
pixel fixo; laneDepth media 0,73 onde o render real tem 0,90) e inflava o
grain face-on por aliasing (0,102 medido → 0,070 real). Capturar ≥1200
põe os dois lados na mesma grade; 1800 ganha o mesmo supersampling que o
5k da referência tem no downscale. Números anteriores à rodada 24 no
`EVOLUCAO.md` NÃO são comparáveis aos novos (quebra marcada lá).

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
| **purp** | **+0,201** | púrpura médio na faixa 0,25–1,05 R90 |

### O alvo de cor

`colour` = (R−B)/(R+B) **não enxerga o verde**: um cinza neutro e um púrpura
saturado marcam idêntico, e ele nem entra no `harmonicError`. Púrpura é
exatamente o verde caindo abaixo da média de R e B, então tem índice próprio:

```
purp = ((R+B)/2 − G) / max(R,G,B)      por anel, em luz linear
```

Perfil radial medido na referência — o púrpura **cresce para fora**, e é essa
forma que a paleta tem de reproduzir, não só a média:

| R/R90 | 0,16 | 0,34 | 0,53 | 0,72 | 0,91 | 1,09 |
|---|---|---|---|---|---|---|
| alvo | +0,018 | +0,124 | +0,173 | +0,222 | +0,259 | +0,317 |

Uma paleta que decide cor por raio consegue acertar a média e errar a forma;
uma soma de populações acerta a forma porque a fração jovem realmente cresce
com o raio. Por isso o alvo é a **curva**, não o número único.


`harmonicError` (soma de |nosso − alvo| em m=1..6) é a nota honesta;
menor é melhor. **Não use o composto `symmetry`**: ele é
A_dominante/(A_dominante + resto), então estourar a dominante o infla
sem aproximar do alvo — um estado com m=2 8% acima marcou `symmetry`
mais alto que outro com m=2 e m=4 casados exatamente.

### O gate edge-on (física vertical)

A face-on não testa espessura, faixa escura, warp nem cor por altura — a
rodada 09 mudou o brilho rasante 2,19× e a métrica face-on moveu 0,002.
`?mode=edge` na mesma página mede o quadro do hold de perfil
(`CAPTURE_T.edge`, a câmera é a mesma desde a rodada 16) contra
`gaia-2025-edge-on-5k.jpg`. Tudo normalizado por R90
horizontal ou pela meia-altura h50, então independe de enquadramento.

| grandeza | alvo | o que significa |
|---|---|---|
| thickRatio | 0,0502 | h50/R90 médio no disco (0,3–0,9 R90) |
| axialRatio | 0,0598 | h50 global / R90 — a "gordura" total da lâmina |
| laneDepth | 0,9386 | profundidade da faixa escura no miolo (1 = corte total) |
| laneOffset | 0,05 | posição do mínimo em h50 a partir do plano médio local |
| warpAmp | 0,0187 | desvio médio do plano nas pontas (0,7–1,1 R90) |
| warpAsym | +0,481 | >0 = forma de S (lados opostos), como deve ser |
| colourZ | 0,19 / 0,30 / 0,66 | (R−B)/(R+B) por banda de altura — o alto-z é dominado pelo halo quente do bojo |
| purpZ | 0,09 / 0,08 / 0,13 | púrpura por banda de altura |

A fórmula EXATA (espelho do código; mudou lá, muda aqui):

```
edgeError = |Δthick| + |Δaxial| + |ΔlaneDepth| + 0,2·|ΔlaneOffset|
          + |ΔwarpAmp| + 0,5·|ΔwarpAsym|
          + média|Δ| das curvas (espessura, colourZ, purpZ)
```

laneOffset pesa 0,2 (sem faixa, o mínimo flutua e o termo viraria ruído);
warpAsym pesa 0,5 (o S é deficiência-manchete, o gate não pode ser cego a
ela; o termo é limitado a ±0,5 e com peso 1 dominaria). Robustez: fundo
por canal subtraído, só colunas com >5% do fluxo médio contam, perfil da
faixa recentrado pelo plano local (aguenta o roll de ~3° do rig no
keyframe), bins de espessura unilaterais não fazem média com zero. Perfil
de espessura do alvo DECRESCE para fora (0,071 no bojo → 0,027 na borda):
o bojo domina o miolo e o disco externo é fino mesmo com flare.

Baseline medida (rodada 12, quad-único): edgeError 2,0258 — dominado por
**laneDepth −0,07 (não existe faixa escura de perfil)**, warpAsym −0,46
(sem o S, ~0,47 na soma), axialRatio 0,026 (disco 2,3× fino demais) e o
gradiente de cor achatado (colourZ 0,19/0,18/0,26 contra 0,19/0,30/0,66).
A extinção por partícula usa τ⊥·C/μ da posição da PARTÍCULA — de perfil,
a coluna real na linha de visada atravessa o disco inteiro e não é essa;
é o que o operador de coluna do quad único (silhueta da fenda) ainda deve.

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
