# Forja da estrela: sobras da GRAVIDADE e botão GIRO-FORMA — 16/11/2026

Ramo `claude/star-forge-0f76d3` (worktree `.claude/worktrees/star-forge-0f76d3`), juntado ao principal local em adea5447. Nada publicado. Quem pede e decide é a coordenadora (conversa "Onde estamos no projeto"); parar ao fim de cada etapa e relatar curto.

## Onde está
- A regra está em `docs/LEI-DA-ESTRELA.md` §10, as contas puras em `src/three/world/forjaDaEstrela.ts`, o desenho em `src/three/world/stellarBody.ts` (`forjaDe`, cirurgias do assado e da fotosfera) e a ficha em `src/lib/atlas/ficha.ts` (`forjaDaFicha`).
- A Forja desenha toda estrela sem dínamo com contraste maior que 0 (até ~9.300 K). Vega e Sirius seguem no caminho de antes; Capella e Dubhe têm dínamo.
- Provas e ferramentas (fora do git) em `capturas/estrelas-lugar/star-forge/`: `ferramentas/` (medir.mjs com NOCUSTO e QUADRO=2, brilho.py, rms.py para o contraste na tela, prancha*.py), `volta6/`, `volta7/`, `volta8/` e as pranchas.
- Como fotografar: veja medir.mjs. O Vite dentro de `.claude/worktrees` precisa de uma config temporária com `resolve.dedupe: ['react','react-dom','scheduler']` e cacheDir próprio. Use `?atlas=1&foco=<Nome>&ver=corpo&d=3&shot=2&lente=hollywood&jd=2461041.5008692136`; `?q=performance` escolhe o nível.

## Etapa A — sobras da gravidade — FEITA em 16/11 (segunda conversa, ramo `claude/nostalgic-tesla-d8c50c`); espera a resposta da coordenadora
Provas em `capturas/estrelas-lugar/star-forge/etapa-a/` e `prancha-etapa-a.png`.
1. **Linha no limbo das quentes: CONSERTADA.** A hipótese se confirmou: a queda a zero no piso de 1,5 px. Agora a queda é mais rasa na proporção largura real / largura desenhada (μw²/piso), a mesma ideia das faixas. Fomalhaut e Altair só mudam no anel da borda; Sol, Vega e Betelgeuse idênticos byte a byte; Arcturus clareia de leve o último pixel e meio; brilho médio igual em todos; custo do quadro igual (ruído de ~1 ms).
2. **Vidro craquelado: NÃO MEXIDO.** Steffen 2005 não dá largura de faixa (só fração escura 0,34, "grânulos relativamente maiores, menos subestrutura", topologia solar). As figuras que já temos (Beeck 2013 F3V, Magic 2013) mostram faixas finas e nítidas, com largura variável e nós mais grossos, e o miolo do grânulo com sombreado, não chapado. O que lê como vidro é o miolo liso com rede de largura uniforme, não a largura da faixa. Caminho honesto, se a coordenadora quiser: largura da faixa variável e miolo com relevo de brilho, por regra, não faixa mais larga.
3. **Companheira de Capella: CAUSA ACHADA, NÃO MEXIDO.** Não é defeito dela. É a lei do filtro do Sol (`filtroPeloQuadro`, janela de 1/20 a 1/10 da altura do quadro): abaixo de ~90 px de disco o filtro sai e fica a radiância verdadeira, branca. Medido: companheira a 60 px g = 0,64 (branca); a principal a 54 px g = 0,83 (branca também). Com a principal enchendo o quadro a companheira sempre cai nessa janela. Mudar é decisão sobre a lei do filtro (ex.: o filtro é do instrumento, um só por quadro), não sobra da gravidade. Visto de passagem: um pequeno crescente escuro na borda da companheira branca (`etapa-a/capella/recorte-b.png`; o BACKLOG está cheio, não entrou lá).

## Etapa B — botão GIRO-FORMA — FEITA em 16/11 (segunda conversa); espera a conferência da coordenadora
Provas em `capturas/estrelas-lugar/star-forge/etapa-b/` e `prancha-etapa-b.png`. O que entrou:
- A regra aprovada: as contas puras em `src/three/world/giroDaEstrela.ts`; quem escolhe a fonte do giro é `achatamentoDe` (`estrelasVisitaveis.ts`): modelo medido vence; senão período da ficha; senão v·sen i com inclinação de 90° (limite inferior); sem dado, redonda. Limiar 2e-4 (abaixo dele, o caminho redondo de sempre, bit a bit), teto 0,96 do crítico só para os derivados. A âncora das temperaturas derivadas é a Teff média da ficha.
- Forma de Roche exata por vértice (o termo de grau 2 de antes saiu: gordo 1 % em Vega, 5 % em Régulo). O halo segue o contorno achatado, exato sob perspectiva.
- Altair, Régulo e Achernar escritas à mão (fontes no arquivo); β Pic com v·sen i é o exemplo do limite inferior; `VAGAS_DE_VISITADAS` 32 → 40. A ficha mostra o achatamento em % e diz "pelo menos" quando é limite inferior.
- Sem inclinação medida o eixo segue o +Y do motor (Capella, Aldebaran, Betelgeuse não mudam de cara).
O que NÃO convence e fica aberto:
- **Os polos mais claros não aparecem nas muito quentes** (Régulo, Achernar, Vega): a conta põe 1,9× entre polo e equador, mas o disco delas já está no topo da compressão de brilho e um fator 2 vira ~1 % na tela. Em Altair aparece (+20 %). Expor pelo polo foi ensaiado e não resolve (`etapa-b/ensaio-polo/ab.png`). É assunto do botão BRILHO.
- Régulo e Achernar são placas azuis lisas (sem granulação pela regra): a forma está certa, o espetáculo depende do brilho.
- Altair tem a rede de convecção igual do polo ao equador; a regra por temperatura local (polo a 8.450 K, quase sem convecção) seria o próximo passo honesto.
- O ângulo de posição do eixo no céu segue artístico, embora medido para Altair, Régulo e Achernar (não abri os números).
- O enquadramento da câmera usa o raio médio (1,3 % menor que o equatorial em β Pic).
- A ferramenta de fotografar por latitude ficou só no scratchpad da conversa (`latitude.mjs`): a escrita do trabalhador na pasta de provas foi barrada por um hook e não a copiei por ele.

## Etapa B — o pedido original
- Achatamento e polos claros para QUALQUER estrela, pela conta que hoje só Vega usa: Roche + Espinosa Lara & Rieutord 2011 (`rocheDe`, `achatamento` em `estrelasVisitaveis.ts`, `operarAFotosfera` em stellarBody). Vega vira um ponto da regra, não caso à mão.
- Medidas: `capturas/estrelas-lugar/pesquisa-16-11/giro-e-atividade.md` (Altair, Régulo, Caph, Vega, Alderamin, Rasalhague). Alvos da prancha de referência: Altair e Régulo do CHARA, Achernar, VFTS 102.
- **Antes de codar**: mandar à coordenadora, em até 8 linhas, a regra para a estrela sem inclinação medida (v·sen i do catálogo é só um limite inferior do giro) e esperar a resposta.

## Fora (ficam para o botão BRILHO)
- A nuvem irregular em volta de Betelgeuse que sumiu do filme (volta por dado: pluma e poeira medidas).
- As duas manchas enormes quase brancas do Antares do ESO.
- A companheira de Capella branca (decisão da coordenadora, 16/11: fica como está; ela trata junto do brilho). Causa: a lei do filtro pelo tamanho do disco vale igual para todas; abaixo de ~90 px de disco o filtro sai e fica a radiância verdadeira, e a companheira é sempre menor no quadro que a principal. Junto: o crescente escuro pequeno na borda dela (`etapa-a/capella/recorte-b.png`).

## Fora (para depois do giro)
- O vidro craquelado das quentes: faixa mais larga não tem fonte. O que as figuras (Beeck 2013 F3V, Magic 2013) têm e nós não: faixa de largura variável, com nós mais grossos, e miolo da célula sombreado em vez de chapado.
