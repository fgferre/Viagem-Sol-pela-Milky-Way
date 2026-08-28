# Mar de Estrelas

Viagem cinematográfica em WebGL2/Three.js: do Sol, pelo sistema solar, através
de gás e poeira volumétricos e das estrelas reais do catálogo, até revelar a
**Via Láctea inteira como modelo 3D**. Perto de casa o mesmo universo vira o
**Atlas** — sistema solar explorável, sem segundo motor.

100% frontend: sem backend, sem variáveis de ambiente, sem serviços externos
em runtime.

O que está aberto: [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md).
O que ainda decide: [`docs/NORTE.md`](docs/NORTE.md).
Como uma estrela é desenhada: [`docs/LEI-DA-ESTRELA.md`](docs/LEI-DA-ESTRELA.md).

---

## 1. Requisitos

| Ferramenta | Versão |
|---|---|
| Node.js | **≥ 20.19** (ou ≥ 22.12) — exigido pelo Vite 7 |
| npm | ≥ 10 |
| Navegador | moderno com **WebGL2**; desktop com GPU dedicada é a experiência recomendada |

Nada mais. Não há Python, CUDA, Docker nem chaves de API.

## 2. Instalação

```bash
cd <pasta-do-projeto>
npm ci
```

Se `npm ci` falhar por ausência do lockfile, use `npm install`. Não instale
pacotes extras. Em produção o app usa Three.js, React e React DOM.

## 3. Rodar

```bash
npm run dev       # http://localhost:5173
npm run build     # typecheck + build em dist/
npm run preview   # serve o build → http://localhost:4173
npm test          # vitest (a suíte de unidade)
npm run gate      # o rápido de cada commit: typecheck + lint + testes dos tocados
npm run censo     # quem são os juízes, a quem servem, quem está sem dono
```

O `dist/` serve em qualquer estático — caminhos relativos.

## 4. Dados (já no repositório)

| Arquivo | Conteúdo |
|---|---|
| `public/data/stars.bin` | 328.749 estrelas (AT-HYG + HYG). Formato `sc1`, 9 bytes/estrela |
| `public/data/stars_meta.json` | contrato do binário + 1.726 nomeadas |
| `public/data/galaxy/` | poeira APOGEE, CO, H II, masers BeSSeL, traçadores jovens, 100k OB proxy |
| `public/data/atlas/` | corpos, efemérides, texturas do sistema solar |

`stars.bin` é obrigatório. Falha nos ativos galácticos avisa e segue com
preenchimento procedural.

Contrato dos dados: [`docs/GALACTIC_DATA_FOUNDATION.md`](docs/GALACTIC_DATA_FOUNDATION.md).
Como o renderer os come: [`docs/RENDERER_CARTOGRAPHY.md`](docs/RENDERER_CARTOGRAPHY.md).

```bash
npm run data:stars
npm run data:galaxy
npm run data:fit
npm run data:corpos    # corpos.json: editorial pt-BR + órbita, de scripts/data/atlas/fonte/
npm run data:verify
npm run data:all
```

## 5. Mapa do código

```
src/
├─ App.tsx                  fases (loading → intro → journey / atlas / free)
├─ hooks/                   useDirector + useEspelhoDaUrl (governados pelo
│                           selo) + useAtalhos + useCelular (a faixa de
│                           760 px) + useGavetas (as cinco gavetas do
│                           HUD, uma aberta por vez)
├─ components/
│  ├─ Hud.tsx               HUD do filme
│  ├─ HudDoAtlas.tsx        HUD do Atlas
│  ├─ PaletaDeBusca.tsx     busca unificada (corpos + estrelas)
│  ├─ FichaDoObjeto.tsx     a ficha do alvo em foco (só desenha)
│  └─ LabelCanvas.ts        rótulos, colisão, clique
├─ hud/                     o CSS do HUD em 9 fatias contíguas
│                           (01-base … 09-celular; a ordem É a cascata)
├─ lib/atlas/               física pura, sem three e sem React: efemérides,
│                           IAU, tempo, luz, massas + fisicaDoCorpo (gravidade,
│                           escape, "×Terra"), geometriaNoCeu (elongação e
│                           disco iluminado), constelacoes (Bayer) e ficha.ts,
│                           que MONTA a ficha que FichaDoObjeto desenha
├─ three/
│  ├─ director.ts           orquestrador (fachadas + tick)
│  ├─ director/             os módulos do director: escada (a navegação
│  │                        por degraus), solNoQuadro, maquinaDoTempo,
│  │                        rotulos, gestos, carregamento, prontidao,
│  │                        preAquecimento, veu, nuvensSemente
│  ├─ estrela.ts            a repartição da lei (LEI-DA-ESTRELA)
│  ├─ luzDaCasa.ts          as constantes da luz (expoM0, sigmaPx)
│  ├─ atlasConfig.ts        camadas e os corpos/luas buscáveis
│  ├─ escala.ts             cadastro de mentiras de escala
│  ├─ selo.ts               selo de honestidade
│  ├─ fases.ts              o que cada fase escreve
│  ├─ cartography/          modelo galáctico + bakes + medidas
│  ├─ cinematic/            journey.ts (filme) + lerSequencia.ts (JSON editorial)
│  │                        + lerPlanoDeCamera.ts (câmera, inclinação e pulso)
│  │                        + apoiosDoRoteiro.ts (preload e marcos de QA)
│  │                        + movimentos.ts (trajetórias reutilizáveis)
│  │                        + atlasRig.ts + cameraRig.ts
│  ├─ core/                 engine, post
│  └─ world/
│     ├─ stellarBody.ts     Sol = instância nº 1 (núcleo em sol/)
│     ├─ stars.ts           catálogo
│     ├─ clarao.ts          clarão de asas por orçamento de fluxo
│     ├─ heroStars.ts       as 16 heroes do filme (arte de 30/07)
│     ├─ galaxy.ts          Via Láctea (partículas + lâminas)
│     ├─ baseGalactica.ts   o frame galáctico da cena (GAL, EX/EY/EZ)
│     ├─ wrappedStars.ts    cascas procedurais
│     ├─ nebula.ts          faixa volumétrica
│     └─ corpos/            Terra, Lua, rochosos, gigantes
```

Geometria: Sol a 8.150 pc do centro, 5,5 pc acima do plano. Quatro braços
(Perseus, Sagittarius-Carina, Scutum-Centaurus, Norma-Outer); o Local é
segmento próprio.

## 6. URL (debug e deep-link)

A URL é **espelho, não painel**: `useEspelhoDaUrl` (`src/hooks/`) LÊ e
REESCREVE `?atlas=`, `?foco=`, `?d=`, `?jd=`, `?t=`/`?play=`, `?q=`,
`?tone=`, `?exp=`, `?ui=` e as flags de camada. O resto da tabela é porta
de entrada só.

| Param | Efeito |
|---|---|
| `?t=150` | pula a intro, congela no segundo `t` do filme |
| `?atlas=1` | abre no Atlas |
| `?foco=terra` | enquadra o alvo (nome pt-BR; estrela por hd/hip) |
| `?ver=corpo` | **só leitura** — degrau da escada (sistema / órbita / corpo / lua). O link antigo pousa no mesmo enquadramento, mas o espelho NUNCA a escreve: `urlComMomento` a apaga sempre, porque quem descreve a vista desde o zoom contínuo é `?d=` |
| `?jd=` | instante do céu (1950–2050 TDB) |
| `?luz=real` | brilho sem assistência (`assistida` é o default do Atlas) |
| `&shot=1` | foto: zera transições CSS |
| `&shot=2` | idem, **sem HUD** — gate visual |
| `&play=1` | começa o filme |
| `&q=cinema` | qualidade (`cinema`, `alta`, `performance`; `auto` deixa a medição escolher) |
| `?pos=x,y,z` `?look=x,y,z` `?fov=` | põe a câmera onde se manda — a régua das capturas; `?fov=` (15–140) só vale junto de `?pos=`, e `?pos=` tem precedência sobre todo o resto |
| `?d=8` | distância ao alvo em RAIOS dele (pina o enquadramento; ausente = a conta de sempre, bit a bit) |
| `?cart=off` `?cart=obs` | cartografia: `off` nem baixa os ~6 MB, `obs` usa só a observada (padrão: mistura) |
| `?corpos=1` `?nocorpos=1` | os corpos resolvidos de perto — distintos dos PONTOS fotométricos de `?noplan=` |
| `?samples=16` | amostras do caminho de extinção da galáxia (piso 2, **teto 96**) |
| `?nebsteps=` | passos do raymarch da nebulosa (**teto 96**; ausente = o preset manda) |
| `?ui=1.2` | tamanho do texto do HUD (0,85–1,4, grampeado); o Atlas reenquadra, porque o retângulo útil encolhe |
| `?tone=agx` | curva de tonemapping (`aces` padrão, `agx`, `neutral`, `linear`) |
| `?exp=1.4` | exposição em multiplicador (positivo finito, sem teto — captura tem de poder estourar) |
| `&nobloom=1` | desliga o bloom (primeiro teste se a tela lava) |
| `&nosun=1` `&nocat=1` `&nogal=1` `&nonebula=1` `&noplan=1` `&noclarao=1` `&noforge=1` … | isola camadas — a lista COMPLETA e viva é `CAMADAS` em `src/three/atlasConfig.ts`, que é a única (o selo e o laço de flags do Director derivam dela) |

## 7. Regras de GLSL — leia antes de tocar em shader

1. `pow(x, y)` com `x` negativo é NaN. Para elevar ao quadrado, multiplique.
2. `smoothstep(e0, e1, x)` com `e0 > e1` é indefinido. Inverta com `1.0 - smoothstep(...)`.
3. Um pixel NaN + bloom = tela branca. Diagnóstico: `?nobloom=1`.
4. Nunca use crase dentro do GLSL (os shaders vivem em template literals).

Conservação de fluxo nos point sprites: abaixo de ~3 px o fluxo cai com a
área (`∝ 1/d²`). O platô e o ramo que **escurece** a estrela ao aproximar
(`1/px²` acima de 20 px) são o defeito que a `LEI-DA-ESTRELA.md` manda
matar — não os trate como invariante.

Clip planes dinâmicos: a viagem cobre 0,01 pc → 25.000 pc. RNG da galáxia
é determinístico (`mulberry32(20260730)`).

## 8. Problemas comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| “A viagem não pôde começar” | `stars.bin` não carregou | console; conferir `public/data/` |
| Tela branca no filme | NaN em shader, ou o clarão do Sol (`LEI-DA-ESTRELA.md` §7) | `?nobloom=1`, depois `&no*=1` |
| Tela branca no Atlas | ponto do Sol + bloom (`LEI-DA-ESTRELA.md` §7) | `?nobloom=1` mostra o disco |
| Tela preta | clip / câmera | `&dbgfade=1` |
| Lento no celular | bloom + resolução | `?q=performance` |

*Stack: Vite 7 · React 19 · TypeScript ~5.9 · Three.js 0.185 · GLSL
customizado · UnrealBloomPass.*
