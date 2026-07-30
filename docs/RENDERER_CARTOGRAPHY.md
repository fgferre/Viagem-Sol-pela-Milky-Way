# Cartografia observacional no renderer

Os ativos de `public/data/galaxy/` (ver `GALACTIC_DATA_FOUNDATION.md`) agora
são consumidos pela cena. O contrato `observed`/`derived`/`inferred` é
implementado assim:

## Fluxo dos dados

| Ativo | Consumidor | Representação |
|---|---|---|
| `dust-density.bin` (APOGEE, 196k) | `cartography/dustMap.ts` → `DISC_FRAG` e `NEBULA_FRAG` | textura 2D galactocêntrica 512² (R = contraste log-local de densidade, 0,5 = neutro; G = cobertura) |
| `molecular-clouds.bin` (8.107, filtro `rendererRecommended`) | `world/observedClouds.ts` | billboards FBM instanciados, blending multiplicativo |
| `large-molecular-clouds.bin` (84) | `world/observedClouds.ts` | idem, raios maiores |
| `hii-regions.bin` (1.413) | `world/starForges.ts` | pontos H-alfa, brilho ∝ 1/erro de distância |
| `spiral-anchors.bin` (199 masers BeSSeL) | `world/starForges.ts` | núcleos azul-brancos compactos |
| `gaia-young-clusters.bin` (988) | `world/starForges.ts` | glitter, tamanho ∝ √membros |
| `gaia-young-cepheids.bin` (2.806) | `world/starForges.ts` | pontos quentes **pulsantes** (fase/ritmo por seed) |

## Regra de combinação observado ↔ inferido

O canal G (cobertura) do mapa de poeira decide, por texel:

```
absorption = mix(procedural, observado, cobertura)
```

- cobertura 1 → fendas escuras, avermelhamento e patchiness dos braços vêm
  do APOGEE; o ruído FBM só texturiza abaixo de ~65 pc/texel (a resolução
  do bake);
- cobertura 0 → o disco segue 100% procedural (`inferred`), idêntico ao
  comportamento anterior;
- incertezas viram brilho/alpha: `relativeParallaxError`, `sigmaDistance`,
  `farDistanceFlag` e `densityConfidence` esmaecem os objetos menos seguros.

Nenhuma posição observada é deslocada por direção de arte; a arte só regula
brilho, cor e agregação de material não resolvido (fatores documentados em
`observedClouds.ts`).

## Coordenadas

Binários chegam na base galactocêntrica do projeto (+X centro→Sol,
+Y → l=270°, +Z polo norte). A conversão para a cena acontece **uma vez**,
na carga, via `galactocentricToScene()` (`world/galaxy.ts`), a mesma base
`EX/EY/EZ` do gerador procedural. O bake da poeira permanece galactocêntrico
porque o disco emissivo e o raymarch já trabalham nesse plano.

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

## Orçamento

- Textura de poeira: 512×512 RG8 = 0,5 MB de VRAM; bake ~1 passada sobre
  196k amostras + blur separável (uma vez, na carga).
- Nuvens: 1 draw call instanciado (~8k quads pequenos, FBM 3 oitavas,
  fade antes de encher a tela).
- Traçadores: 1 draw call de pontos (5.406 vértices), conservação de fluxo
  igual às partículas da galáxia.
- Custo por frame adicional: 2 draw calls + 1 lookup de textura por texel
  do disco e por passo distante do raymarch.
