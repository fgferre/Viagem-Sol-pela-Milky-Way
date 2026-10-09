# Estrelas, instrumento e o que sobrou da rodada das lentes — 08/10/2026

Plano para uma conversa nova. Nasceu da rodada das lentes de cinema (ramo
`claude/hollywood-lens-effects-af79d8`), que entregou as quatro escolhas de Ajustes ›
Lente (nenhuma, redonda, anamórfica, Hollywood). Aqui ficam os assuntos que a conversa
abriu e NÃO resolveu. Nada disto está decidido: cada item diz o que o dono disse, o que
o assistente recomendou e o que falta ele escolher.

Regra desta frente, palavra dele (08/10): *"O chefe é o usuário do projeto."* O
assistente deve ser crítico: apontar quando o dono erra e quando outro caminho dá mais
ao usuário. Fala dele não vira regra sem ele confirmar.

## O mapa do que existe hoje (lido em 08/10, só leitura)

A regra escrita (`docs/LEI-DA-ESTRELA.md`) é uma só: a estrela só muda de tamanho, nunca
"vira outra coisa"; o clarão (halo + espinhos) é do instrumento, existe a qualquer
distância e segue o fluxo recebido; teto de ocupação de 0,07 da tela para o Sol, igual no
Atlas, no voo e no filme; perto, o clarão sai de cima do disco (soltura 10→2 px); proibida a
exposição que lê o quadro. Pendências dela: M3 (catálogo ↔ heroes, ponto-zero único),
M6/M7, E3 (toda estrela com corpo) — ver o §M da LEI e o item 227 de `docs/PENDENCIAS.md`.

O código tem quatro desenhistas, não um:
1. Catálogo (328.749 estrelas, Sirius incluída) e cascas procedurais: `STAR_FRAG`
   (`src/three/shaders/starShaders.ts`), cruz de dois braços, piso de 0,85 no espinho.
2. As 16 heroes (`src/three/world/heroStars.ts`), Sirius entre elas, por CIMA do ponto do
   catálogo — a "luz dupla" que a LEI já declara como dívida do M3.
3. O Sol de longe: o ponto dos "dez/onze" (`world/planetas/planetas.ts`) + o clarão
   (`world/clarao.ts`), que usa a MESMA receita das heroes (`glslNucleoEHalo` +
   `glslBracosDeDifracao`, `shaders/common.ts`). Por isso o Sol e Sirius se parecem.
4. O Sol de perto: o corpo 3D (`world/stellarBody.ts`, `world/sol/`).
Mais os dois blooms (`core/post.ts`) e a lente nova (`src/three/lente/`).

## Assuntos abertos

0. **FEITO em 09/10 — como o Sol brilha em cada distância.** O filtro e a soltura do clarão
   e dos raios da lente entram juntos com o disco enchendo 1/20 → 1/10 da altura do quadro
   (fração, não px; `JANELA_DO_QUADRO` em `estrela.ts`). Ele escolheu entre hoje, A (1/20→1/10)
   e B (1/40→1/20) olhando as pranchas (*"Proposta A"*), viu os filmes antes×depois e o app, e
   aprovou (*"Aprovo, pode juntar na versão principal"*). Entre Mercúrio e a Terra o Sol deixou
   de ser o pontinho laranja e virou a luz branca da cena; o vão (a) sumiu, porque o clarão e os
   raios da lente ficam até o filtro entrar. `?solquadro=hoje` traz a régua de antes. Provas,
   pesquisa e leitura crítica da LEI: `capturas/sol-estudo/` e o commit da rodada. Sobra para o
   item 2: (b) de longe, com lente, três cruzes no mesmo ponto (clarão, raios da lente, a cruz
   do sprite); o brilho da lente não segue a soltura nem o filtro; os raios da coroa 3D ignoram
   o filtro.

1. **Unificar os desenhistas das estrelas (M3 da LEI).** O dono pediu "uma regra clara e
   única para cada estrela conforme o estado na tela". Crítica do assistente: unificar
   por dentro não muda nada que o usuário veja e arrisca um visual aprovado em muitas
   rodadas; fazer quando uma incoerência aparecer na tela ou junto do item 227 (toda
   estrela com corpo ao se aproximar). Falta ele decidir quando.
2. **As estrelas seguem a lente escolhida?** Hoje a lente muda só o Sol (reflexos e brilho;
   os raios dela saíram em 08/10); Sirius e as outras continuam com a cruz. O coerente seria o instrumento valer
   para todas (raios finos das lâminas no lugar da cruz). Falta ele decidir.
3. **Quanto deixar ajustável no menu.** Ele quer "tudo customizável" (reflexos, raios,
   brilho, risco, sujeira). Crítica do assistente: controle demais piora para quem visita;
   recomendou os estilos prontos e no máximo um controle de intensidade, com uma gaveta
   avançada só se ele insistir (o molde já existe: Qualidade + Avançado + "Personalizado").
   Falta ele decidir.
4. **A lente como ferramenta do diretor nos filmes.** Em 23/08 ele proibiu diferença
   entre Atlas e filme para o clarão. Crítica do assistente: o filme é a experiência de
   cinema e quem dirige escolhe a lente de cada cena, como já faz com os nomes ("os
   elementos de label... ferramentas que o diretor da cena usa"). Proposta: uma chave por
   cena nos roteiros (`src/three/cinematic/roteiros/*.json`; hoje `lente` é o campo de
   ângulo de visão, então o nome precisa ser outro), com o Atlas limpo por padrão. Falta
   ele decidir.
5. **Incoerências achadas no mapa (limpeza, sem mudança de imagem):** `clarao.ts:1-3` diz
   que "substitui as 16 heroes" (elas voltaram em 16/08); `uCore` das heroes nunca é
   escrito; "dez" × "onze" vértices nos comentários; a descrição do `filtroSolarAlvo`
   (morto) ainda em `stellarBody.ts` e `solNoQuadro.ts`; o piso 0,85 do espinho em
   `STAR_FRAG` contra o texto de `estrela.ts:249-258`; brancos do miolo diferentes
   (0,9/0,95/1,0 × 1/0,98/0,95); `BETA_EMISSAO` × `BETA_DA_EMISSAO`; comentários de `post.ts`
   que ainda chamam `?bbloom`/`?bombro` de vivos; `?noplan` ("planetas") também apaga o
   clarão do Sol. O `BACKLOG.md` está acima de 30 linhas: triar antes de mover para lá.
6. **Restos da rodada das lentes (baixos):** com a câmera a menos de ~2 raios solares do
   centro do Sol a sonda da lente lê "tapado" (mesmo limite do clarão); com `?tone=linear`
   o corte dos elementos fracos pode piscar no limiar.

## Fontes da pesquisa (08/10), para não refazer
- Filmes: Video Copilot Optical Flares; Maxon Knoll Light Factory e Real Lens Flares
  (help.maxon.net/rg); Boris FX Sapphire LensFlare; Silhouette Lens Flare; Nuke Flare
  (learn.foundry.com); ILM, podcast de John Knoll sobre lens flares.
- Jogos: Unity Lens Flare (SRP) e Screen Space Lens Flare (docs + LensFlareCommon.hlsl);
  Unreal (Lens Flare e Convolution Bloom); John Chapman, "Pseudo Lens Flare" (2013/2017);
  GTA V por Adrian Courrèges; Froyok sobre Cyberpunk/Batman; CryEngine Optical Flare;
  Capcom RE Engine, lens flare por traçado de raios (CEDEC 2023).
- Física: Hullin et al. 2011; Lee & Eisemann 2013; patentes US 2.784.643 e US 9.341.827 B2.
- Outros apps: SpaceEngine (blog 17/03/2017 e 0.990), Celestia (fórum: halo sobre disco
  resolvido "nobody wants that"), OpenSpace (Sun glare), Gaia Sky (Configuration).

## Fora de escopo
Rastro de movimento e foco (desfoque do fundo) — ideias da conversa, nunca pedidas.
