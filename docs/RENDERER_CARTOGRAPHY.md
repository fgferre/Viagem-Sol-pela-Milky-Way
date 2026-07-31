# Cartografia observacional no renderer

Os ativos de `public/data/galaxy/` (ver `GALACTIC_DATA_FOUNDATION.md`) agora
são consumidos pela cena. O contrato `observed`/`derived`/`inferred` é
implementado assim:

## Fluxo dos dados

| Ativo | Consumidor | Representação |
|---|---|---|
| `dust-density.bin` (APOGEE, 196k) | `cartography/dustMap.ts` → `DISC_FRAG` e `NEBULA_FRAG` | textura 2D galactocêntrica 512² (R = contraste log-local de densidade, 0,5 = neutro; G = cobertura) |
| `molecular-clouds.bin` (8.107, filtro `rendererRecommended`) | `world/observedClouds.ts` + `cartography/structureMap.ts` | billboards FBM e kernels de gás dimensionados pelo raio físico |
| `large-molecular-clouds.bin` (84) | mesmos consumidores | raios, densidade e erros pesam a resposta de gás |
| `hii-regions.bin` (1.413) | `world/starForges.ts` + `cartography/structureMap.ts` | pontos H-alfa e kernels de formação estelar pesados por classe/erro |
| `spiral-anchors.bin` (199 masers BeSSeL) | mesmos consumidores + `spiralModel.json` | posições reais e ajuste offline do prior espiral |
| `gaia-young-clusters.bin` (988) | mesmos consumidores | glitter e kernels pesados por número de membros/erro |
| `gaia-young-cepheids.bin` (2.806) | mesmos consumidores | pontos pulsantes e kernels pesados por erro de distância |

## Regra de combinação observado ↔ inferido

`structureMap.ts` transforma os catálogos em um campo RGBA 512²:

- R = resposta de gás/poeira;
- G = resposta de formação estelar jovem;
- B = suporte observado/derivado do gás;
- A = suporte observado/derivado dos traçadores jovens.

Cada objeto é espalhado por um kernel gaussiano proporcional ao raio físico,
à resolução ou à incerteza de distância; confiança, classe, densidade e número
de membros viram pesos. Onde B/A têm suporte, os canais R/G vêm dos catálogos.
Onde não têm, um prior `inferred` usa exclusivamente a espinha espiral ajustada
aos masers BeSSeL e fragmentação determinística na escala de complexos
moleculares não resolvidos. A combinação por texel é:

```
resposta = inferida × (1 − suporte) + observada × suporte
```

O mesmo R/G governa o brilho contínuo, as partículas dos braços e a extinção.
Portanto estrelas jovens, gás e poeira deixam de formar três desenhos
independentes. A população estelar velha permanece como disco exponencial e
barra suaves; ela não é forçada a copiar as nuvens.

Este é um **modelo de resposta em um instante**, não uma simulação
N-body/hidrodinâmica e não representa matéria escoando para o centro como água
num ralo. A rotação quase circular sustenta o disco; barra e braços representam
a perturbação gravitacional não axisimétrica que organiza o gás. O deslocamento
estreito do gás em relação à espinha e o realce posterior de estrelas jovens são
proxies explícitos enquanto não há integração dinâmica com velocidade padrão.

No marco atual, 56,5% do disco têm suporte de matéria e 33,9% têm suporte de
traçadores jovens. A textura procedural de alta frequência resolve apenas
subestrutura abaixo de aproximadamente 80 pc; nenhuma posição observada é
deslocada por direção de arte.

Não há ondulação senoidal adicionada para “quebrar simetria”. A assimetria
macroscópica vem das fases/janelas BeSSeL e, principalmente, da distribuição
observada de gás, poeira e população jovem.

## Coordenadas

Binários chegam na base galactocêntrica do projeto (+X centro→Sol,
+Y → l=270°, +Z polo norte). A conversão para a cena acontece **uma vez**,
na carga, via `galactocentricToScene()` (`world/galaxy.ts`), a mesma base
`EX/EY/EZ` do gerador procedural. O bake da poeira permanece galactocêntrico
porque o disco emissivo e o raymarch já trabalham nesse plano.

## Braços ancorados pelos masers BeSSeL

As fases do preenchimento inferido são ajustadas offline contra 146 regiões de
formação estelar com erro relativo de paralaxe `< 0,2`. Pitches, larguras e
janelas radiais permanecem os do contrato Reid; nenhuma posição catalogada é
movida. A continuação Outer recebe uma fase própria porque não há suporte
observacional no hiato que a separa da Norma interna.

`src/three/cartography/spiralModel.json` é a fonte única das constantes usadas
por partículas, bake e GLSL. `npm run data:fit` reproduz o ajuste robusto
ponderado pela incerteza; `npm run data:verify` barra regressões acima de
350 pc de residual mediano, 1 kpc no p90 ou menos de 70 âncoras dentro de uma
largura de braço. O marco atual mede 307,7 pc de mediana e 870,8 pc no p90
(antes: 1,039 kpc e 2,326 kpc).

## Falha graciosa e debug

- Sem `manifest.json` ou binário corrompido → aviso no console e cena
  100% procedural (nada quebra).
- `?cart=off` — desliga toda a camada observacional (A/B).
- `?cart=obs` — realça o observado dimando a emissão procedural do disco.
- `?nocart=1` — esconde nuvens/traçadores sem tocar no disco.

## Ambiente volumétrico relocável

A Via Láctea não é um plano: o volume local existe em **qualquer ponto do
disco**, não só na vizinhança solar.

- `nebulaDensity` (chunk `GLSL_DENSITY`) agora é galactocêntrica:
  `diskGasEnvelope(p)` dá o perfil do gás molecular (radial `exp(−R/5,2 kpc)`,
  altura fina `h = 55→260 pc` com flare — o gás é MAIS FINO que as estrelas —
  braços via `galMajorArms`/`galLocalArm`, warp). Normalizada ≈ 1 na
  vizinhança solar; o visual do corredor Sol→Órion não muda.
- **Nuvens-semente**: as ≤32 nuvens do catálogo CO mais próximas da câmera
  entram no raymarch como metaballs com subestrutura FBM (`uSeedClouds`),
  selecionadas a cada 0,25 s num raio de 900 pc. O billboard esmaece na
  aproximação (`nearFade`) e o volume assume — handoff sem popping.
- **Cavidade do observador**: superbolhas de ~300 pc povoam todo o disco
  (Local Bubble é uma delas); longe do Sol, uma clareira suave de
  ~55–190 pc acompanha o observador (`uCavityGate`, estilização `inferred`
  fundamentada). Perto do Sol, a Bolha Local real e os núcleos do corredor
  assumem.
- **Fades por referencial do disco**: `nebulaFade`/`localBandFade`/
  `galaxyFade` respondem a `R,z` galactocêntricos da câmera (`inDisk`), não
  à distância do Sol. Camadas fisicamente solares (HYG, poeira próxima,
  hero stars, marcador) continuam por `dHome`.
- **Campo estelar envolvente** (`wrappedStars.ts`, `inferred`): caixa de
  2,4 kpc com wrap determinístico no espaço-mundo (estrelas fixas no
  universo, sem popping), brilho pela densidade estelar real (disco fino
  300 pc + espesso + bojo + braços), população azul jovem nos braços e
  dourada no bojo. Desliga perto do Sol (HYG real assume). `?nowrap=1`.
- **Câmera determinística**: `?pos=x,y,z&look=x,y,z` (pc, coords da cena)
  coloca a câmera em modo livre — usado na bateria de vistas: R=3 kpc,
  braço, inter-braço, R=13 kpc, GC, +800 pc acima do plano.

Referência de direção de arte (dossiê pesquisado): assimetria da faixa,
Great Rift mais fino que a banda estelar, gás molecular em grumos (≪1% do
volume), contraste braço/inter-braço vem de nebulosas e estrelas azuis
(massa ≲3×), bojo dourado dominando o céu no disco interno, "fim do mundo"
no disco externo.

## Otimizações estruturais (sem perda de qualidade)

- **LUT da faixa**: a integração distante do disco depende só de (posição,
  direção) — usa um RT equirect 256×128 com 24 passos e só é recalculada
  quando a câmera se move mais de 2 pc; o raymarch faz 1 fetch por pixel.
- **Braços/warp bakeados** nos canais B/A do dust map (espelhos TS exatos
  em `galacticModel.ts`): o envelope de gás custa 1 fetch + 2 exp por
  amostra em vez de ~40 transcendentais.
- **Recorte raio-slab**: o raymarch só amostra o trecho do raio dentro da
  camada |z|<1,6 kpc; olhar para fora do plano é quase grátis.
- **Metaballs com corte por distância** antes de exp/fbm (≤2 nuvens ativas
  por amostra na prática).
- **Densidade local barata** (`GLSL_DENSITY_LOCAL`) para extinção das
  estrelas HYG e poeira próxima — camadas presas à vizinhança solar não
  pagam o envelope galactocêntrico.
- Perfil vertical do gás: gaussiano fino (σ 70→260 pc) — fino como o gás
  molecular real, plano perto do plano (preserva o corredor local).
- Rótulos re-projetados a cada frame (a atualização a 10 Hz os fazia
  "nadar" contra as estrelas).

## Deferido

- Fotometria HYG relocável baseada em `logLum`, com extinção diferencial em
  relação ao observador solar.
- Amostra Gaia DR3 de aproximadamente 100 mil estrelas OB com distâncias
  fotogeométricas. Os 5.406 traçadores jovens atuais ainda são esparsos demais
  para a granularidade do alvo Gaia/ESA; adicionar assimetria de shader para
  mascarar essa lacuna foi rejeitado.
- Integração dinâmica do potencial de barra+braços com curva de rotação e
  velocidades padrão. Até isso existir, o renderer declara corretamente um
  campo de resposta estático, não uma simulação gravitacional.

## Orçamento

- Texturas de poeira e resposta: 2 × 512×512 RGBA8 com mipmaps, cerca de
  2,67 MB de VRAM; bakes executados uma vez na carga.
- Nuvens: 1 draw call instanciado (~8k quads pequenos, FBM 3 oitavas,
  fade antes de encher a tela).
- Traçadores: 1 draw call de pontos (5.406 vértices), conservação de fluxo
  igual às partículas da galáxia.
- Custo por frame adicional do acoplamento: nenhum draw call; 1 lookup RGBA por
  fragmento do disco. O mapa APOGEE continua compartilhado com o raymarch.
