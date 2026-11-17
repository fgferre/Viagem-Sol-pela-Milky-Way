# Forja da estrela: sobras da GRAVIDADE e botão GIRO-FORMA — 16/11/2026

Ramo `claude/star-forge-0f76d3` (worktree `.claude/worktrees/star-forge-0f76d3`), juntado ao principal local em adea5447. Nada publicado. Quem pede e decide é a coordenadora (conversa "Onde estamos no projeto"); parar ao fim de cada etapa e relatar curto.

## Onde está
- A regra está em `docs/LEI-DA-ESTRELA.md` §10, as contas puras em `src/three/world/forjaDaEstrela.ts`, o desenho em `src/three/world/stellarBody.ts` (`forjaDe`, cirurgias do assado e da fotosfera) e a ficha em `src/lib/atlas/ficha.ts` (`forjaDaFicha`).
- A Forja desenha toda estrela sem dínamo com contraste maior que 0 (até ~9.300 K). Vega e Sirius seguem no caminho de antes; Capella e Dubhe têm dínamo.
- Provas e ferramentas (fora do git) em `capturas/estrelas-lugar/star-forge/`: `ferramentas/` (medir.mjs com NOCUSTO e QUADRO=2, brilho.py, rms.py para o contraste na tela, prancha*.py), `volta6/`, `volta7/`, `volta8/` e as pranchas.
- Como fotografar: veja medir.mjs. O Vite dentro de `.claude/worktrees` precisa de uma config temporária com `resolve.dedupe: ['react','react-dom','scheduler']` e cacheDir próprio. Use `?atlas=1&foco=<Nome>&ver=corpo&d=3&shot=2&lente=hollywood&jd=2461041.5008692136`; `?q=performance` escolhe o nível.

## Etapa A — sobras da gravidade (um commit pequeno)
1. **Linha escura fina no limbo das quentes** (Fomalhaut v7 e com o piso; hoje não tem): tirar. Hipótese, não conferida: a borda macia `smoothstep(0, max(bordaEmMu, √(3·fwidth)), mu)` cai a zero numa anã, onde μw ≈ 0 e sobra o piso de ~1,5 px, encostada no halo claro; a casca não ajuda porque `frenteDaAtmosfera` = 0 nas quentes. Altair e Vega não podem mudar em relação à v6, salvo a própria linha (ela deve aparecer em Altair também; confira).
2. **Vidro craquelado de perto nas quentes**: verificar na fonte se Steffen et al. 2005 (astro-ph/0509464, fração escura 0,34 a 8.000 K) e as simulações de anãs A/F sustentam faixas mais largas e macias. Se sim, acertar por regra contínua (`MEIA_FAIXA_DA_FORJA`, `perfilDaForja`). Se não, deixar e dizer.
3. **Companheira de Capella (Ab, 5.730 K) estourada** quando pequena no quadro: prancha `capturas/estrelas-lugar/capella-par-16-11.png`. Ela usa a mesma lei da principal desde 60a2112c; achar a causa antes de mexer.
- Pronto: Sol idêntico byte a byte; Altair e Vega como v6 (salvo o item 1); custo medido; `npm run done` verde; prancha com o alvo ao lado.

## Etapa B — botão GIRO-FORMA (só depois da A)
- Achatamento e polos claros para QUALQUER estrela, pela conta que hoje só Vega usa: Roche + Espinosa Lara & Rieutord 2011 (`rocheDe`, `achatamento` em `estrelasVisitaveis.ts`, `operarAFotosfera` em stellarBody). Vega vira um ponto da regra, não caso à mão.
- Medidas: `capturas/estrelas-lugar/pesquisa-16-11/giro-e-atividade.md` (Altair, Régulo, Caph, Vega, Alderamin, Rasalhague). Alvos da prancha de referência: Altair e Régulo do CHARA, Achernar, VFTS 102.
- **Antes de codar**: mandar à coordenadora, em até 8 linhas, a regra para a estrela sem inclinação medida (v·sen i do catálogo é só um limite inferior do giro) e esperar a resposta.

## Fora (ficam para o botão BRILHO)
- A nuvem irregular em volta de Betelgeuse que sumiu do filme (volta por dado: pluma e poeira medidas).
- As duas manchas enormes quase brancas do Antares do ESO.
